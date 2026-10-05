/* eslint-disable no-console */
// 世界知识层编译器：为 graphData.js 的每个节点解析权威世界知识。
//
// 与 compileKnowledgeCorpus.js 的分工：
//   compileKnowledgeCorpus.js -> 论文证据（OpenAlex / Crossref），偏“研究前沿”
//   compileWorldKnowledge.js  -> 权威实体与百科知识（Wikidata / Wikipedia），偏“世界知识”
// 两者互不覆盖，输出到不同文件，由 graphData.js 合并成节点知识库记录。
//
// 用法：
//   node compileWorldKnowledge.js                # 断点续跑，已完成节点直接复用
//   node compileWorldKnowledge.js --refresh      # 全部重新解析
//   node compileWorldKnowledge.js --report       # 只跑并打印质量报告，不落盘
//   WK_SAMPLE=30 node compileWorldKnowledge.js   # 只跑前 30 个节点（抽样校验精度）
//   WK_INTERVAL_MS=1500 node compileWorldKnowledge.js   # 单主机请求间隔（默认 1500ms）
//
// 本机网络与限流的实测结论（换机器/换网络请重新验证，不要盲目照搬）：
//   1. 到 Wikimedia 的 IPv4 会被 ECONNRESET，只有 IPv6 通。Node 的 fetch(undici) 会挑 IPv4 直接失败，
//      所以统一用 https.request + autoSelectFamily（Happy Eyeballs）。
//   2. zh.wikipedia.org / en.wikipedia.org 的 DNS 被污染成 31.13.x.x（Meta 地址段），必然超时。
//      百科内容改走 api.wikimedia.org 官方网关（同一 anycast 网络，未被污染）。
//   3. Wikimedia 的匿名速率限制实测：1500ms/请求稳定通过；1100ms 偶发 429；600ms 全部 429。
//      因此默认 1500ms 间隔，并且收到 429 时全局退避（不是只退避那一个请求）。
//
// 两阶段设计是为了减少请求数：先并行做实体搜索，再把所有 QID 合并成批去取详情
// （每批 45 个），否则 511 个节点各自取一次详情会多出 500 次请求、多花十几分钟。

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');

const directory = __dirname;
const graphSource = fs.readFileSync(path.join(directory, 'graphData.js'), 'utf8');
const checkpointPath = path.join(directory, 'worldKnowledge.checkpoint.json');
const outputPath = path.join(directory, 'worldKnowledge.js');

const concurrency = Math.max(1, Math.min(8, Number(process.env.WK_CONCURRENCY) || 4));
const sampleSize = Math.max(0, Number(process.env.WK_SAMPLE) || 0);
const acceptScore = Number(process.env.WK_MIN_SCORE) || 0.72;
const confirmScore = Number(process.env.WK_CONFIRM_SCORE) || 0.88;
const hostIntervalMs = Math.max(300, Number(process.env.WK_INTERVAL_MS) || 1500);
const refresh = process.argv.includes('--refresh');
const reportOnly = process.argv.includes('--report');
const bulkOnly = process.argv.includes('--bulk-only');
const proseOnly = process.argv.includes('--prose-only');
const rescore = process.argv.includes('--rescore');
const userAgent = 'PzMAgentool-WorldKnowledge/1.0 (local knowledge-graph research tool; node.js; contact: repo owner)';

const WIKIDATA = 'www.wikidata.org';
const SPARQL = 'query.wikidata.org';
const WIKI_GATEWAY = 'api.wikimedia.org';
const WIKI_SITES = { zh: 'zh.wikipedia.org', en: 'en.wikipedia.org' };
const CLAIM_PROPERTIES = {
    P31: { zh: '隶属于', en: 'instance of' },
    P279: { zh: '上位类', en: 'subclass of' },
    P361: { zh: '属于', en: 'part of' },
    P527: { zh: '包含', en: 'has part' },
    P101: { zh: '研究领域', en: 'field of work' },
    P452: { zh: '行业', en: 'industry' },
    P17: { zh: '国家', en: 'country' },
    P159: { zh: '总部位置', en: 'headquarters location' },
    P112: { zh: '创立者', en: 'founded by' },
    P571: { zh: '成立时间', en: 'inception' },
    P577: { zh: '发布时间', en: 'publication date' },
    P856: { zh: '官方网站', en: 'official website' },
    P737: { zh: '受其影响', en: 'influenced by' },
    P366: { zh: '用途', en: 'has use' }
};

// ------------------------------------------------------------------ 网络层

// 限流是按出口 IP 全局算的，不是按主机算：实测两个主机各 0.67 req/s（合计 1.34）就会持续 429，
// 因此这里只保留一个全局预算，所有主机共用同一个排队时钟。
const globalSchedule = { next: 0 };
const hostHealth = new Map();
let globalBackoffUntil = 0;
// 请求级统计：限流环境下必须能看清时间和请求都花在哪
const stats = { requests: 0, rateLimited: 0, failures: 0, backoffMs: 0, waitMs: 0, byLabel: {} };

// AIMD 自适应限速：这个网络的可持续速率会变（取决于出口 IP 的当前限流状态），
// 固定间隔要么被 429 反复打断、要么白白慢跑。遇 429 乘 1.7 降速，连续 12 次成功乘 0.85 提速。
const MIN_INTERVAL_MS = 700;
const MAX_INTERVAL_MS = 20000;
let adaptiveIntervalMs = Math.max(360, Number(process.env.WK_INTERVAL_MS) || 1500);
let successStreak = 0;

function noteRateLimit() {
    successStreak = 0;
    adaptiveIntervalMs = Math.min(MAX_INTERVAL_MS, Math.round(adaptiveIntervalMs * 1.7));
}

function noteSuccess() {
    successStreak += 1;
    if (successStreak >= 12) {
        successStreak = 0;
        adaptiveIntervalMs = Math.max(MIN_INTERVAL_MS, Math.round(adaptiveIntervalMs * 0.85));
    }
}

async function throttleGlobal(intervalMs) {
    const now = Date.now();
    const start = Math.max(now, globalSchedule.next, globalBackoffUntil);
    globalSchedule.next = start + intervalMs;
    if (start > now) {
        stats.waitMs += start - now;
        await new Promise(resolve => setTimeout(resolve, start - now));
    }
}

function httpsJson(hostname, requestPath, { timeoutMs = 20000, redirects = 3 } = {}) {
    return new Promise((resolve, reject) => {
        const request = https.request({
            host: hostname,
            path: requestPath,
            method: 'GET',
            headers: { Accept: 'application/json', 'User-Agent': userAgent, 'Accept-Encoding': 'identity' },
            // 本机 IPv4 到 Wikimedia 不通，必须给 Happy Eyeballs 机会
            autoSelectFamily: true,
            autoSelectFamilyAttemptTimeout: 3000
        }, response => {
            const status = response.statusCode;
            // 部分条目标题需要归一化，api.wikimedia.org 会先返回 301。只跟随能拿到 JSON 的目标：
            //   - 同网关路径：直接跟随
            //   - *.wikipedia.org/wiki/X：改写成等价的网关路径（该域名被 DNS 污染，直连必然超时）
            //   - 其他（例如 www.mediawiki.org 的说明页）：放弃，让调用方走回退
            if (status >= 300 && status < 400 && response.headers.location && redirects > 0) {
                response.resume();
                let nextHost = hostname;
                let nextPath = response.headers.location;
                if (/^https?:\/\//i.test(nextPath)) {
                    const url = new URL(nextPath);
                    nextHost = url.host;
                    nextPath = `${url.pathname}${url.search}`;
                }
                if (/(^|\.)wikipedia\.org$/i.test(nextHost)) {
                    const match = nextPath.match(/^\/wiki\/(.+)$/);
                    if (match) {
                        const language = nextHost.split('.')[0];
                        nextHost = WIKI_GATEWAY;
                        nextPath = `/core/v1/wikipedia/${language}/page/${match[1]}`;
                    }
                }
                if (nextHost !== WIKI_GATEWAY && nextHost !== WIKIDATA && nextHost !== SPARQL) {
                    const error = new Error(`unusable redirect to ${nextHost}`);
                    error.statusCode = 404;
                    reject(error);
                    return;
                }
                resolve(httpsJson(nextHost, nextPath, { timeoutMs, redirects: redirects - 1 }));
                return;
            }
            if (status !== 200) {
                response.resume();
                const error = new Error(`HTTP ${status}`);
                error.statusCode = status;
                error.retryAfter = Number(response.headers['retry-after'] || 0);
                reject(error);
                return;
            }
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(new Error(`invalid JSON from ${hostname}: ${body.slice(0, 120)}`));
                }
            });
        });
        request.setTimeout(timeoutMs, () => request.destroy(new Error(`timeout after ${timeoutMs}ms`)));
        request.on('error', reject);
        request.end();
    });
}

async function httpGet(host, requestPath, { attempts = 5, label = host, timeoutMs = 20000 } = {}) {
    let lastError = null;
    stats.byLabel[label] = stats.byLabel[label] || { requests: 0, ms: 0, rateLimited: 0 };
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        await throttleGlobal(adaptiveIntervalMs);
        const startedAt = Date.now();
        stats.requests += 1;
        stats.byLabel[label].requests += 1;
        try {
            const data = await httpsJson(host, requestPath, { timeoutMs });
            stats.byLabel[label].ms += Date.now() - startedAt;
            hostHealth.set(host, { failures: 0 });
            noteSuccess();
            return data;
        } catch (error) {
            stats.failures += 1;
            lastError = error;
            const failures = (hostHealth.get(host)?.failures || 0) + 1;
            hostHealth.set(host, { failures });
            // 404 是“这个标题没有条目”，重试没有意义，直接放弃
            if (error.statusCode === 404) break;
            if (attempt === attempts) break;
            if (error.statusCode === 429) {
                // 429 是速率限制：全局退避 + 永久降速，否则会越撞越狠
                stats.rateLimited += 1;
                stats.byLabel[label].rateLimited += 1;
                noteRateLimit();
                const wait = Math.max(error.retryAfter * 1000 || 0, 2000 * attempt);
                stats.backoffMs += wait;
                globalBackoffUntil = Date.now() + wait;
                await new Promise(resolve => setTimeout(resolve, wait));
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 400)));
            }
        }
    }
    throw new Error(`${label}: ${lastError ? lastError.message : 'unknown error'}`);
}

function apiGet(host, params, options) {
    return httpGet(host, `/w/api.php?${new URLSearchParams(params).toString()}`, options);
}

function gatewayGet(requestPath, options) {
    return httpGet(WIKI_GATEWAY, requestPath, { label: 'wikimedia gateway', ...options });
}

// ------------------------------------------------------------------ SPARQL 批量解析

// 逐个节点调 wbsearchentities 在限流下太贵（每个节点 1~2 次请求）。
// SPARQL 可以用 VALUES 一次带上上百个名称做精确标签/别名匹配，一次请求顶几十次搜索。
async function sparqlQuery(query, label) {
    const path = `/sparql?format=json&query=${encodeURIComponent(query)}`;
    return httpGet(SPARQL, path, { label: label || 'sparql', timeoutMs: 45000, attempts: 2 });
}

function sparqlTermLiteral(text, language) {
    return `"${String(text).replace(/[\\"]/g, '\\$&')}"@${language}`;
}

function sparqlChunks(items, size) {
    const out = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

function shortId(uri) {
    return String(uri || '').split('/').pop();
}

// 名称 -> { qid, label, description, articleZh, articleEn }
async function sparqlResolveNames(termsList) {
    const resolved = new Map();
    const terms = [];
    termsList.forEach(terms0 => {
        if (terms0.chinese) terms.push({ node: terms0.raw, text: terms0.chinese, language: 'zh' });
        if (terms0.english && (!terms0.chinese || terms0.english !== terms0.chinese)) {
            terms.push({ node: terms0.raw, text: terms0.english, language: 'en' });
        }
    });

    let batch = 0;
    for (const chunk of sparqlChunks(terms, 110)) {
        batch += 1;
        const values = chunk.map(item => sparqlTermLiteral(item.text, item.language)).join(' ');
        const query = `SELECT ?term ?item ?itemLabel ?itemDescription ?articleZh ?articleEn WHERE {
  VALUES ?term { ${values} }
  { ?item rdfs:label ?term } UNION { ?item skos:altLabel ?term }
  OPTIONAL { ?articleZh schema:about ?item ; schema:isPartOf <https://zh.wikipedia.org/> . }
  OPTIONAL { ?articleEn schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,en". }
}`;
        try {
            const data = await sparqlQuery(query, `sparql resolve ${batch}`);
            const rows = data?.results?.bindings || [];
            rows.forEach(row => {
                const term = row.term?.value || '';
                const language = row.term?.['xml:lang'] || '';
                // 一个名称可能命中多个实体（例如重名），先到先得，但不覆盖已有结果
                const key = `${term}|${language}`;
                if (resolved.has(key)) return;
                resolved.set(key, {
                    qid: shortId(row.item?.value),
                    label: row.itemLabel?.value || '',
                    description: row.itemDescription?.value || '',
                    articleZh: row.articleZh?.value ? decodeURIComponent(shortId(row.articleZh.value)) : '',
                    articleEn: row.articleEn?.value ? decodeURIComponent(shortId(row.articleEn.value)) : ''
                });
            });
            console.log(`  SPARQL 批次 ${batch}: ${chunk.length} 个名称，命中 ${rows.length} 行`);
        } catch (error) {
            console.error(`  SPARQL 批次 ${batch} 失败: ${error.message}`);
        }
    }

    const byNode = new Map();
    termsList.forEach(terms0 => {
        for (const [text, language] of [[terms0.chinese, 'zh'], [terms0.english, 'en']]) {
            if (!text) continue;
            const hit = resolved.get(`${text}|${language}`);
            if (hit) {
                byNode.set(terms0.raw, { ...hit, matchedTerm: text, matchedLanguage: language });
                return;
            }
        }
    });
    return byNode;
}

// 第二次批量：用 SPARQL 里的 mwapi EntitySearch 服务，一次请求跑几十个实体搜索，
// 覆盖精确标签匹配不到的名称（例：“量子LDPC码”这种没有同名条目的合成名）。
async function sparqlBulkSearch(termsList) {
    const queries = [];
    termsList.forEach(terms0 => {
        // 两种语言都搜：中文名可能在 Wikidata 没有对应标签，但英文名有
        for (const [text, language] of [[terms0.chinese, 'zh'], [terms0.english, 'en']]) {
            if (!text) continue;
            queries.push({ node: terms0.raw, text, language });
        }
    });

    const gathered = new Map(); // node -> 候选数组
    let batch = 0;
    for (const chunk of sparqlChunks(queries, 12)) {
        batch += 1;
        // mwapi 服务的取值必须是字面量，所以按语言分组
        const byLanguage = new Map();
        chunk.forEach(item => {
            if (!byLanguage.has(item.language)) byLanguage.set(item.language, []);
            byLanguage.get(item.language).push(item);
        });
        for (const [language, items] of byLanguage) {
            const values = items.map(item => `"${String(item.text).replace(/[\\"]/g, '\\$&')}"@${language}`).join(' ');
            const query = `SELECT ?search ?item ?itemLabel ?itemDescription WHERE {
  VALUES ?search { ${values} }
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch" ;
                    wikibase:endpoint "www.wikidata.org" ;
                    mwapi:search ?search ;
                    mwapi:language "${language}" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,en". }
}`;
            try {
                const data = await sparqlQuery(query, `sparql search ${batch}(${language})`);
                (data?.results?.bindings || []).forEach(row => {
                    const term = row.search?.value || '';
                    const owner = items.find(item => item.text === term);
                    if (!owner) return;
                    if (!gathered.has(owner.node)) gathered.set(owner.node, []);
                    gathered.get(owner.node).push({
                        id: shortId(row.item?.value),
                        label: row.itemLabel?.value || '',
                        description: row.itemDescription?.value || '',
                        matchType: '',
                        matchText: '',
                        aliases: [],
                        uri: `http://www.wikidata.org/entity/${shortId(row.item?.value)}`,
                        query: { text: term, language }
                    });
                });
                console.log(`  SPARQL 搜索批次 ${batch}(${language}): ${items.length} 个名称`);
            } catch (error) {
                console.error(`  SPARQL 搜索批次 ${batch}(${language}) 失败: ${error.message}`);
            }
        }
    }
    return gathered;
}

// ------------------------------------------------------------------ 匹配打分

function normalizeTerm(value) {
    return String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\s\u3000]+/g, '')
        .replace(/[()（）\[\]{}【】《》"'“”‘’`,，.。;；:：!！?？/\\|+\-—_~`@#$%^&*=<>.…·、]/g, '');
}

function latinTokens(value) {
    return new Set(String(value || '').toLowerCase().normalize('NFKC').match(/[a-z0-9]{2,}/g) || []);
}

function bigrams(text) {
    const out = [];
    for (let i = 0; i < text.length - 1; i += 1) out.push(text.slice(i, i + 2));
    return out;
}

function containmentOf(needle, haystack) {
    if (!needle.length) return 0;
    const pool = new Set(haystack);
    let hit = 0;
    needle.forEach(item => { if (pool.has(item)) hit += 1; });
    return hit / needle.length;
}

const PREFIX_MIN_RATIO = 0.6;
const PREFIX_MIN_LENGTH = 4;

function matchScore(query, candidate) {
    const q = normalizeTerm(query);
    const c = normalizeTerm(candidate);
    if (!q || !c) return 0;
    if (q === c) return 1;

    const minLength = Math.min(q.length, c.length);
    const lengthRatio = minLength / Math.max(q.length, c.length);
    if ((c.startsWith(q) || q.startsWith(c)) && lengthRatio >= PREFIX_MIN_RATIO && minLength >= PREFIX_MIN_LENGTH) {
        return 0.82 + 0.14 * lengthRatio;
    }

    const tokenContainment = containmentOf([...latinTokens(query)], [...latinTokens(candidate)]);
    const bigramContainment = containmentOf(bigrams(q), bigrams(c));
    const charContainment = containmentOf([...new Set(q)], [...new Set(c)]);
    const base = tokenContainment * 0.3 + bigramContainment * 0.35 + charContainment * 0.35;
    return Math.min(0.8, base * (0.5 + 0.5 * lengthRatio));
}

const PUBLICATION_TAIL = /(学术文章|學術文章|学术论文|學術論文|科研论文|研究论文|论文|論文|期刊文章|期刊論文|scholarly article|scientific article|research paper|academic paper|journal article|preprint)$/i;
const DISAMBIGUATION_PATTERN = /消歧义|disambiguation|topics referred to by the same term/i;

function isPublicationText(text) {
    const value = String(text || '').trim();
    if (!value || value.length > 32) return false;
    return PUBLICATION_TAIL.test(value);
}

function isDisambiguationText(text) {
    return DISAMBIGUATION_PATTERN.test(String(text || ''));
}

function isCjk(text) {
    return /[\u4e00-\u9fff]/.test(String(text || ''));
}

function primaryQuery(terms) {
    if (terms.chinese && terms.english) return { text: terms.chinese, language: 'zh', alternate: { text: terms.english, language: 'en' } };
    if (terms.chinese) return { text: terms.chinese, language: 'zh', alternate: null };
    if (terms.english) return { text: terms.english, language: 'en', alternate: null };
    return { text: terms.raw, language: isCjk(terms.raw) ? 'zh' : 'en', alternate: null };
}

// ------------------------------------------------------------------ 百科正文清洗

function removeNestedTemplates(text) {
    let out = '';
    let depth = 0;
    for (let i = 0; i < text.length; i += 1) {
        if (text.startsWith('{{', i)) { depth += 1; i += 1; continue; }
        if (text.startsWith('}}', i)) { if (depth > 0) depth -= 1; i += 1; continue; }
        if (depth === 0) out += text[i];
    }
    return out;
}

function decodeEntities(text) {
    return String(text || '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function wikitextToPlain(source) {
    let text = String(source || '');
    text = text.replace(/<!--[\s\S]*?-->/g, ' ');
    text = text.replace(/<ref[^>]*\/>/g, ' ');
    text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ' ');
    text = text.replace(/\{\|[\s\S]*?\|\}/g, ' ');            // 表格
    text = removeNestedTemplates(text);                        // {{Infobox}} 等模板
    text = text.replace(/\[\[(?:File|Image|文件|图像|檔案|档案|Category|分类|分類|维基百科|Wikipedia)[^\[\]]*(?:\[\[[\s\S]*?\]\][^\[\]]*)*\]\]/g, ' ');
    text = text.replace(/\[\[([^\[\]|]*)\|([^\[\]]*)\]\]/g, '$2');
    text = text.replace(/\[\[([^\[\]]*)\]\]/g, '$1');
    text = text.replace(/\[(https?:\/\/\S+)\s+([^\]]*)\]/g, '$2');
    text = text.replace(/\[(https?:\/\/\S+)\]/g, ' ');
    text = text.replace(/'''?/g, '');
    text = text.replace(/<[^>]+>/g, ' ');
    text = text.replace(/^[*#:;].*$/gm, ' ');                  // 列表行
    return decodeEntities(text);
}

function leadExtract(source, maxChars = 1600) {
    const plain = wikitextToPlain(source).replace(/\r/g, '');
    const headingIndex = plain.search(/\n==[^=]/);
    const lead = headingIndex > 200 ? plain.slice(0, headingIndex) : plain;
    const clean = lead.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').replace(/\n/g, ' ').trim();
    return clean.length > maxChars ? `${clean.slice(0, maxChars)}...` : clean;
}

// ------------------------------------------------------------------ 阶段 A：实体搜索

async function searchEntities(query, language) {
    const data = await apiGet(WIKIDATA, {
        action: 'wbsearchentities',
        search: query,
        language,
        uselang: 'zh',
        limit: '8',
        format: 'json',
        origin: '*'
    }, { label: `wikidata search(${language})` });
    return (data.search || []).map(item => ({
        id: item.id,
        label: item.label || '',
        description: item.description || '',
        matchType: item.match?.type || '',
        matchText: item.match?.text || '',
        aliases: item.aliases || [],
        uri: item.concepturi || `http://www.wikidata.org/entity/${item.id}`
    }));
}

function scoreEntity(terms, query, candidate) {
    const names = [candidate.label, ...(candidate.aliases || [])].filter(Boolean);
    const labelScore = Math.max(0, ...names.map(value => matchScore(query.text, value)));
    const textScore = candidate.matchText ? matchScore(query.text, candidate.matchText) : 0;
    let score = Math.max(labelScore, textScore);
    if (candidate.matchType === 'label') score = Math.min(1, score + 0.02);
    // 跨语言佐证：用节点名的另一种语言再比一次，两边都对得上才算真正的规范实体
    const other = isCjk(query.text) ? terms.english : terms.chinese;
    const crossScore = other ? Math.max(0, ...names.map(value => matchScore(other, value))) : 0;
    return { score, crossScore };
}

async function searchWikiPages(language, query) {
    const data = await gatewayGet(`/core/v1/wikipedia/${language}/search/page?q=${encodeURIComponent(query)}&limit=5`);
    return (data.pages || []).map(page => ({
        title: page.title,
        key: page.key || page.title,
        description: page.description || '',
        excerpt: decodeEntities(String(page.excerpt || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(),
        url: `https://${WIKI_SITES[language]}/wiki/${encodeURIComponent(String(page.key || page.title).replace(/\s/g, '_'))}`
    }));
}

function entityRecordFrom(node, terms, candidate, matchType) {
    return {
        nodeName: node.name,
        stage: 'searched',
        resolvedAt: new Date().toISOString(),
        query: { zh: terms.chinese || '', en: terms.english || '' },
        entity: {
            id: candidate.id,
            uri: candidate.uri || `http://www.wikidata.org/entity/${candidate.id}`,
            label: candidate.label,
            description: candidate.description,
            aliases: candidate.aliases || [],
            score: Number((candidate.score ?? 1).toFixed(3)),
            crossScore: Number((candidate.crossScore ?? 1).toFixed(3)),
            matchedBy: { query: candidate.query?.text || terms.primary, language: candidate.query?.language || '', matchType }
        },
        presetArticle: candidate.articleZh || candidate.articleEn
            ? { zh: candidate.articleZh || '', en: candidate.articleEn || '' }
            : null,
        rejectedEntity: candidate.rejectedEntity || null,
        runnersUp: candidate.runnersUp || [],
        article: null,
        articleRunnersUp: [],
        errors: candidate.errors || []
    };
}

async function stageSearch(node, split, preResolved, bulkCandidates) {
    const terms = split(node.name);
    const primary = primaryQuery(terms);
    const errors = [];

    // SPARQL 精确标签/别名命中：不再发任何搜索请求
    const preset = preResolved ? preResolved.get(node.name) : null;
    if (preset) {
        return entityRecordFrom(node, terms, {
            id: preset.qid,
            label: preset.label,
            description: preset.description,
            aliases: [],
            score: 1,
            crossScore: 1,
            articleZh: preset.articleZh,
            articleEn: preset.articleEn,
            query: { text: preset.matchedTerm, language: preset.matchedLanguage }
        }, 'exact-label-or-alias');
    }

    // 批量实体搜索已经给出高置信候选时直接采用，省掉逐节点搜索
    const bulk = bulkCandidates ? bulkCandidates.get(node.name) : null;
    if (bulk && bulk.length) {
        const scored = bulk
            .map(candidate => ({ ...candidate, ...scoreEntity(terms, candidate.query, candidate) }))
            .sort((a, b) => b.score - a.score);
        const top = scored[0];
        if (top && top.score >= confirmScore) {
            const runnerUp = scored.slice(1, 4).map(item => ({ id: item.id, label: item.label, score: Number(item.score.toFixed(3)) }));
            return entityRecordFrom(node, terms, { ...top, runnersUp: runnerUp }, 'bulk-entity-search');
        }
    }

    const gathered = [];
    let bestPrimary = null;

    try {
        const results = await searchEntities(primary.text, primary.language);
        results.forEach(candidate => {
            const scored = scoreEntity(terms, primary, candidate);
            gathered.push({ ...candidate, query: primary, ...scored });
            if (!bestPrimary || scored.score > bestPrimary.score) bestPrimary = { ...candidate, ...scored };
        });
    } catch (error) {
        errors.push(error.message);
    }

    // 主语言已经精确命中标签时跳过另一种语言，省掉一半请求；有疑问才做交叉验证
    const needsCrossCheck = !bestPrimary || bestPrimary.score < 0.9 || bestPrimary.matchType !== 'label';
    if (needsCrossCheck && primary.alternate) {
        try {
            const results = await searchEntities(primary.alternate.text, primary.alternate.language);
            results.forEach(candidate => {
                const scored = scoreEntity(terms, primary.alternate, candidate);
                gathered.push({ ...candidate, query: primary.alternate, ...scored });
            });
        } catch (error) {
            errors.push(error.message);
        }
    }

    const byId = new Map();
    gathered.forEach(item => {
        const weight = item.score + item.crossScore * 0.25;
        const existing = byId.get(item.id);
        if (!existing || weight > existing.weight) byId.set(item.id, { ...item, weight });
    });
    const ranked = [...byId.values()].sort((a, b) => b.weight - a.weight);
    const best = ranked[0] || null;
    const entity = best && best.score >= acceptScore ? best : null;

    const record = {
        nodeName: node.name,
        stage: 'searched',
        resolvedAt: new Date().toISOString(),
        query: { zh: terms.chinese || '', en: terms.english || '' },
        entity: entity ? {
            id: entity.id,
            uri: entity.uri,
            label: entity.label,
            description: entity.description,
            aliases: entity.aliases,
            score: Number(entity.score.toFixed(3)),
            crossScore: Number(entity.crossScore.toFixed(3)),
            matchedBy: { query: entity.query.text, language: entity.query.language, matchType: entity.matchType }
        } : null,
        presetArticle: null,
        // 只有未被接受时才记录“被拒绝的候选”；否则会出现“被拒绝的候选 = 已接受实体自己”
        rejectedEntity: entity ? null : (best ? { id: best.id, label: best.label, score: Number(best.score.toFixed(3)) } : null),
        runnersUp: ranked.slice(entity ? 1 : 0, (entity ? 1 : 0) + 4).map(item => ({ id: item.id, label: item.label, score: Number(item.score.toFixed(3)) })),
        article: null,
        articleRunnersUp: [],
        errors
    };

    // 没有实体时才去百科找条目，并且只用主语言打一次，控制请求数
    if (!entity) {
        let pages = [];
        try {
            pages = await searchWikiPages(primary.language, primary.text);
        } catch (error) {
            errors.push(error.message);
        }
        const scored = pages.map(page => ({ ...page, score: matchScore(primary.text, page.title) }))
            .sort((a, b) => b.score - a.score);
        const top = scored[0];
        if (top) {
            record.articleSearch = { ...top, matchedQuery: primary.text, language: primary.language, score: Number(top.score.toFixed(3)) };
            record.articleRunnersUp = scored.slice(1, 4).map(page => ({ title: page.title, score: Number(page.score.toFixed(3)) }));
        }
    }

    return record;
}

// ------------------------------------------------------------------ 阶段 B：批量取实体详情

async function fetchEntitiesBatch(ids) {
    const data = await apiGet(WIKIDATA, {
        action: 'wbgetentities',
        ids: ids.join('|'),
        props: 'labels|descriptions|aliases|sitelinks|claims',
        languages: 'zh|en',
        sitefilter: 'zhwiki|enwiki',
        format: 'json',
        origin: '*'
    }, { label: 'wikidata getentities' });
    return data.entities || {};
}

function claimValues(entity, property) {
    const statements = entity?.claims?.[property] || [];
    const out = [];
    statements.forEach(statement => {
        if (statement.rank === 'deprecated') return;
        const value = statement.mainsnak?.datavalue?.value;
        if (value == null) return;
        if (typeof value === 'object' && value['entity-type']) out.push({ kind: 'entity', id: value.id });
        else if (typeof value === 'object' && value.time) out.push({ kind: 'time', value: value.time });
        else if (typeof value === 'object' && value.text) out.push({ kind: 'text', value: value.text });
        else if (typeof value === 'object' && value.amount) out.push({ kind: 'quantity', value: value.amount });
        else if (typeof value === 'string') out.push(property === 'P856' ? { kind: 'url', value } : { kind: 'text', value });
    });
    return out.slice(0, 12);
}

function formatTime(value) {
    const match = String(value || '').match(/^([+-])(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return String(value || '');
    const year = match[2].replace(/^0+/, '') || '0';
    const month = match[3];
    const day = match[4];
    const era = match[1] === '-' ? ' BCE' : '';
    if (month === '00') return `${year}${era}`;
    if (day === '00') return `${year}-${month}${era}`;
    return `${year}-${month}-${day}${era}`;
}

async function fetchLabelMap(ids) {
    const map = new Map();
    const unique = [...new Set(ids.filter(Boolean))];
    for (let i = 0; i < unique.length; i += 45) {
        const chunk = unique.slice(i, i + 45);
        try {
            const entities = await fetchEntitiesBatch(chunk);
            Object.values(entities).forEach(entity => {
                const label = entity?.labels?.zh?.value || entity?.labels?.en?.value || '';
                if (label) map.set(entity.id, label);
            });
        } catch (error) {
            console.error(`  声明标签批次失败(${chunk.length}): ${error.message}`);
        }
    }
    return map;
}

// ------------------------------------------------------------------ 阶段 C：落成记录

async function fetchPageLead(language, title) {
    let data = null;
    try {
        data = await gatewayGet(`/core/v1/wikipedia/${language}/page/${encodeURIComponent(title)}`);
    } catch (error) {
        // 404/301 都表示这个标题取不到正文，交给调用方回退，不要当成致命错误
        if (error.statusCode === 404 || error.statusCode === 301) return null;
        throw error;
    }
    if (!data?.source) return null;
    const extract = leadExtract(data.source, 1600);
    if (extract.length < 80) return null;
    return {
        site: WIKI_SITES[language],
        language,
        title: data.title || title,
        url: `https://${WIKI_SITES[language]}/wiki/${encodeURIComponent(String(data.key || data.title || title).replace(/\s/g, '_'))}`,
        extract,
        revision: data.latest?.timestamp || ''
    };
}

async function finalizeNode(record, detail, labelById, fetchProse) {
    const entry = { ...record, stage: 'complete' };

    if (record.entity) {
        const entity = record.entity;
        const labelZh = detail?.labels?.zh?.value || (isCjk(entity.label) ? entity.label : '');
        const labelEn = detail?.labels?.en?.value || (!isCjk(entity.label) ? entity.label : '');
        const descriptionZh = detail?.descriptions?.zh?.value || (isCjk(entity.description) ? entity.description : '');
        const descriptionEn = detail?.descriptions?.en?.value || (!isCjk(entity.description) ? entity.description : '');
        const aliases = [...new Set([
            ...(detail?.aliases?.zh || []).map(item => item.value),
            ...(detail?.aliases?.en || []).map(item => item.value),
            ...(entity.aliases || [])
        ])].filter(Boolean).slice(0, 14);

        const claims = [];
        if (detail) {
            Object.entries(CLAIM_PROPERTIES).forEach(([property, label]) => {
                const values = claimValues(detail, property).map(value => {
                    if (value.kind === 'entity') {
                        const name = labelById.get(value.id);
                        return { ...value, label: name || '', display: name ? `${name} (${value.id})` : value.id };
                    }
                    if (value.kind === 'time') return { ...value, display: formatTime(value.value) };
                    return { ...value, display: String(value.value) };
                });
                if (values.length) claims.push({ property, label, values });
            });
        }

        const zhTitle = detail?.sitelinks?.zhwiki?.title || record.presetArticle?.zh || '';
        const enTitle = detail?.sitelinks?.enwiki?.title || record.presetArticle?.en || '';
        const preferZh = isCjk(entity.label) || isCjk(entity.description) || !enTitle;
        const order = preferZh ? [['zh', zhTitle], ['en', enTitle]] : [['en', enTitle], ['zh', zhTitle]];
        let wikipedia = null;
        if (fetchProse) {
            for (const [language, title] of order) {
                if (!title || wikipedia) continue;
                try {
                    wikipedia = await fetchPageLead(language, title);
                } catch (error) {
                    entry.errors = [...(entry.errors || []), error.message];
                }
            }
        }
        if (!wikipedia && (zhTitle || enTitle)) {
            const title = zhTitle || enTitle;
            const language = zhTitle ? 'zh' : 'en';
            wikipedia = {
                site: WIKI_SITES[language],
                language,
                title,
                url: `https://${WIKI_SITES[language]}/wiki/${encodeURIComponent(String(title).replace(/\s/g, '_'))}`,
                extract: '',
                revision: ''
            };
        }

        const descriptionText = `${descriptionZh} ${descriptionEn} ${entity.description}`;
        const isPublication = isPublicationText(descriptionText);
        const rawScore = entity.score;
        const score = isPublication ? Math.min(rawScore, 0.8) : rawScore;
        const crossOk = entity.crossScore >= acceptScore;
        const confirmed = !isPublication && ((score >= confirmScore && (crossOk || rawScore >= 0.98)) || crossOk);

        entry.matchMode = 'wikidata';
        entry.status = confirmed ? 'entity-confirmed' : 'entity-candidate';
        entry.score = Number(score.toFixed(3));
        entry.downgradeReason = isPublication ? 'matched-entity-is-a-publication' : '';
        entry.matchedBy = entity.matchedBy;
        entry.entityDetail = {
            id: entity.id,
            uri: entity.uri,
            label: { zh: labelZh, en: labelEn },
            description: { zh: descriptionZh, en: descriptionEn },
            aliases,
            sitelinks: { zh: zhTitle, en: enTitle },
            wikipedia
        };
        entry.claims = claims;
        entry.rejectedEntity = record.rejectedEntity;
        delete entry.articleSearch;
        delete entry.presetArticle;
        return entry;
    }

    const search = record.articleSearch;
    if (search && search.score >= acceptScore) {
        let lead = null;
        if (fetchProse) {
            try {
                lead = await fetchPageLead(search.language, search.key || search.title);
            } catch (error) {
                entry.errors = [...(entry.errors || []), error.message];
            }
        }
        const article = {
            site: WIKI_SITES[search.language],
            language: search.language,
            title: search.title,
            url: search.url,
            description: search.description,
            extract: lead?.extract || search.excerpt,
            excerptFromSearch: !lead,
            revision: lead?.revision || '',
            score: search.score,
            matchedQuery: search.matchedQuery
        };
        const disambiguation = isDisambiguationText(article.description) || isDisambiguationText(article.extract.slice(0, 200));
        entry.matchMode = 'wikipedia';
        entry.status = !disambiguation && article.score >= confirmScore ? 'article-confirmed' : 'article-candidate';
        entry.score = article.score;
        entry.downgradeReason = disambiguation ? 'matched-article-is-disambiguation' : '';
        entry.matchedBy = { query: search.matchedQuery, language: search.language, matchType: 'title' };
        entry.entityDetail = null;
        entry.claims = [];
        entry.article = article;
        delete entry.articleSearch;
        return entry;
    }

    entry.matchMode = 'none';
    entry.status = (record.errors || []).length && !record.rejectedEntity && !search ? 'source-error' : 'no-authoritative-match';
    entry.score = Number((record.rejectedEntity?.score || search?.score || 0).toFixed(3));
    entry.matchedBy = null;
    entry.entityDetail = null;
    entry.claims = [];
    entry.article = null;
    entry.runnersUp = search
        ? [...(record.articleRunnersUp || []), ...(record.runnersUp || [])].slice(0, 4)
        : (record.runnersUp || []);
    delete entry.articleSearch;
    return entry;
}

// ------------------------------------------------------------------ 主流程

function loadNodes() {
    const context = { console };
    vm.createContext(context);
    vm.runInContext(`${graphSource}\nthis.__getGraphTree=getGraphTree;this.__buildGraphData=buildGraphData;this.__split=splitGraphNodeTerms;`, context);
    const theme = new Proxy({}, { get: () => 0xffffff });
    return {
        split: context.__split,
        nodes: context.__buildGraphData(context.__getGraphTree(theme), theme).nodes
            .filter(node => node.kind !== 'knowledge-detail')
            .map(node => ({ name: node.name }))
    };
}

function loadCheckpoint() {
    if (refresh || !fs.existsSync(checkpointPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    } catch (error) {
        console.warn('checkpoint 损坏，已忽略:', error.message);
        return {};
    }
}

function saveCheckpoint(corpus) {
    fs.writeFileSync(checkpointPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
}

function writeOutput(corpus) {
    const complete = Object.fromEntries(Object.entries(corpus).filter(([, value]) => value.stage === 'complete'));
    const ordered = Object.fromEntries(Object.keys(complete).sort((a, b) => a.localeCompare(b, 'zh-CN')).map(key => [key, complete[key]]));
    const header = '// Generated by compileWorldKnowledge.js. Do not hand-edit.\n';
    fs.writeFileSync(outputPath, `${header}window.GRAPH_NODE_WORLD_KNOWLEDGE = ${JSON.stringify(ordered, null, 2)};\n`, 'utf8');
    return Object.keys(ordered).length;
}

async function runPool(items, worker) {
    let cursor = 0;
    let done = 0;
    async function run() {
        while (cursor < items.length) {
            const item = items[cursor];
            cursor += 1;
            await worker(item);
            done += 1;
            if (done % 25 === 0 || done === items.length) console.log(`  ${done}/${items.length}`);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => run()));
}

async function main() {
    const started = Date.now();
    const { nodes, split } = loadNodes();
    const corpus = loadCheckpoint();
    const targets = sampleSize ? nodes.slice(0, sampleSize) : nodes;

    // --rescore：只重算打分与状态，不发请求
    if (rescore) {
        let dropped = 0;
        let demoted = 0;
        let kept = 0;
        Object.values(corpus).forEach(entry => {
            if (entry.stage !== 'complete' || entry.matchMode === 'none') return;
            const terms = split(entry.nodeName);
            const query = entry.matchedBy?.query || primaryQuery(terms).text;
            const other = isCjk(query) ? terms.english : terms.chinese;
            const evaluate = names => ({
                score: Math.max(0, ...names.map(name => matchScore(query, name))),
                crossScore: other ? Math.max(0, ...names.filter(Boolean).map(name => matchScore(other, name))) : 0
            });

            if (entry.entityDetail) {
                // SPARQL 精确标签/别名命中是构造性正确的，不因改分规则被推翻
                if (entry.matchedBy?.matchType === 'exact-label-or-alias') {
                    kept += 1;
                    return;
                }
                const names = [
                    entry.entityDetail.label.zh, entry.entityDetail.label.en,
                    ...(entry.entityDetail.aliases || [])
                ].filter(Boolean);
                const { score, crossScore } = evaluate(names);
                const description = `${entry.entityDetail.description?.zh || ''} ${entry.entityDetail.description?.en || ''}`;
                const isPublication = isPublicationText(description.trim());
                const finalScore = isPublication ? Math.min(score, 0.8) : score;
                if (finalScore < acceptScore) {
                    dropped += 1;
                    entry.rejectedEntity = { id: entry.entityDetail.id, label: names[0] || entry.entityDetail.id, score: Number(finalScore.toFixed(3)) };
                    entry.matchMode = 'none';
                    entry.status = 'no-authoritative-match';
                    entry.score = Number(finalScore.toFixed(3));
                    entry.downgradeReason = 'rescored-below-threshold';
                    entry.entityDetail = null;
                    entry.claims = [];
                    return;
                }
                const crossOk = crossScore >= acceptScore;
                const confirmed = !isPublication && ((finalScore >= confirmScore && (crossOk || finalScore >= 0.98)) || crossOk);
                if (entry.status === 'entity-confirmed' && !confirmed) demoted += 1;
                entry.score = Number(finalScore.toFixed(3));
                entry.crossScore = Number(crossScore.toFixed(3));
                entry.status = confirmed ? 'entity-confirmed' : 'entity-candidate';
                entry.downgradeReason = isPublication ? 'matched-entity-is-a-publication' : '';
                kept += 1;
                return;
            }

            if (entry.article) {
                const { score } = evaluate([entry.article.title]);
                const disambiguation = isDisambiguationText(entry.article.description) || isDisambiguationText((entry.article.extract || '').slice(0, 200));
                if (score < acceptScore) {
                    dropped += 1;
                    entry.matchMode = 'none';
                    entry.status = 'no-authoritative-match';
                    entry.score = Number(score.toFixed(3));
                    entry.downgradeReason = 'rescored-below-threshold';
                    entry.article = null;
                    return;
                }
                const confirmed = !disambiguation && score >= confirmScore;
                if (entry.status === 'article-confirmed' && !confirmed) demoted += 1;
                entry.score = Number(score.toFixed(3));
                entry.status = confirmed ? 'article-confirmed' : 'article-candidate';
                entry.downgradeReason = disambiguation ? 'matched-article-is-disambiguation' : '';
                kept += 1;
            }
        });
        if (!reportOnly) {
            saveCheckpoint(corpus);
            writeOutput(corpus);
        }
        console.log(JSON.stringify({ mode: 'rescore', kept, demoted, dropped, requests: 0 }, null, 2));
        return;
    }

    // --prose-only：只给已有实体/条目的条目补百科正文，逐条可续跑
    if (proseOnly) {
        const needing = Object.values(corpus).filter(item => {
            if (item.stage !== 'complete') return false;
            if (item.entityDetail?.wikipedia?.url && !item.entityDetail.wikipedia.extract) return true;
            if (item.article?.url && !item.article.extract) return true;
            return false;
        });
        console.log(`--prose-only：${needing.length} 个条目缺百科正文`);
        let proseDone = 0;
        await runPool(needing, async item => {
            try {
                if (item.entityDetail?.wikipedia?.url) {
                    const language = item.entityDetail.wikipedia.language || 'en';
                    const lead = await fetchPageLead(language, item.entityDetail.wikipedia.title);
                    if (lead) item.entityDetail.wikipedia = { ...item.entityDetail.wikipedia, extract: lead.extract, revision: lead.revision };
                } else if (item.article?.url) {
                    const lead = await fetchPageLead(item.article.language || 'en', item.article.title);
                    if (lead) item.article = { ...item.article, extract: lead.extract, revision: lead.revision, excerptFromSearch: false };
                }
            } catch (error) {
                console.error(`  ${item.nodeName}: ${error.message}`);
            }
            proseDone += 1;
            if (!reportOnly) {
                saveCheckpoint(corpus);
                // 每 25 条落一次产物：正文任务很慢，中断时也要让拿到的部分立刻可用
                if (proseDone % 25 === 0) writeOutput(corpus);
            }
        });
        if (!reportOnly) {
            saveCheckpoint(corpus);
            writeOutput(corpus);
        }
        const filled = Object.values(corpus).filter(item => (item.entityDetail?.wikipedia?.extract || item.article?.extract || '').length > 150).length;
        console.log(JSON.stringify({ mode: 'prose-only', withProseExtract: filled, requests: stats.requests, rateLimited: stats.rateLimited, finalIntervalMs: adaptiveIntervalMs, elapsedSec: Math.round((Date.now() - started) / 1000) }, null, 2));
        return;
    }

    const completeNames = new Set(Object.entries(corpus).filter(([, value]) => value.stage === 'complete').map(([key]) => key));
    const searched = targets.filter(node => corpus[node.name] && corpus[node.name].stage === 'searched');
    const pending = targets.filter(node => !completeNames.has(node.name) && !searched.some(item => item.name === node.name));

    console.log(`节点 ${nodes.length} 个｜已完成 ${targets.filter(n => completeNames.has(n.name)).length}｜待搜索 ${pending.length}｜待成稿 ${searched.length}`);
    console.log(`起始间隔 ${adaptiveIntervalMs}ms（AIMD 自适应），并发 ${concurrency}${bulkOnly ? '，仅批量层' : ''}`);

    // 阶段 A0/A0b：SPARQL 批量层。请求极少（十几次），但只覆盖名称能和标签/搜索对上的节点。
    let preResolved = new Map();
    let bulkCandidates = new Map();
    if (pending.length) {
        console.log('阶段 A0：SPARQL 批量名称解析');
        preResolved = await sparqlResolveNames(pending.map(node => split(node.name)));
        console.log(`  SPARQL 精确命中 ${preResolved.size}/${pending.length} 个节点`);

        const unresolved = pending.filter(node => !preResolved.has(node.name));
        if (unresolved.length) {
            console.log(`阶段 A0b：SPARQL 批量实体搜索（${unresolved.length} 个节点）`);
            bulkCandidates = await sparqlBulkSearch(unresolved.map(node => split(node.name)));
            const withCandidates = [...bulkCandidates.entries()].filter(([, list]) => list.length).length;
            console.log(`  批量搜索返回 ${withCandidates} 个节点的候选`);
        }
    }

    const stillNeedSearch = pending.filter(node => !preResolved.has(node.name) && !bulkCandidates.has(node.name));

    // --bulk-only：不跑逐节点搜索，没被批量层覆盖的节点留空，等后续完整跑补上
    if (bulkOnly && stillNeedSearch.length) {
        console.log(`--bulk-only：跳过 ${stillNeedSearch.length} 个未被批量层覆盖的节点（后续完整跑会补上）`);
    }

    // 阶段 A：实体搜索（+ 无实体时的百科条目搜索）
    const searchTargets = bulkOnly ? pending.filter(node => !stillNeedSearch.some(item => item.name === node.name)) : pending;
    if (searchTargets.length) {
        console.log(`阶段 A：逐节点搜索（${searchTargets.length} 个节点）`);
        await runPool(searchTargets, async node => {
            try {
                corpus[node.name] = await stageSearch(node, split, preResolved, bulkCandidates);
            } catch (error) {
                corpus[node.name] = {
                    nodeName: node.name,
                    stage: 'searched',
                    resolvedAt: new Date().toISOString(),
                    query: { zh: '', en: '' },
                    entity: null,
                    rejectedEntity: null,
                    runnersUp: [],
                    articleSearch: null,
                    articleRunnersUp: [],
                    errors: [String(error.message || error)]
                };
            }
            if (!reportOnly) saveCheckpoint(corpus);
        });
        if (!reportOnly) saveCheckpoint(corpus);
    }

    // 阶段 B：把所有 QID 合并成批取详情，再批量取声明里引用的实体标签
    const stageBNames = targets
        .filter(node => corpus[node.name] && corpus[node.name].stage === 'searched')
        .map(node => node.name);
    const ids = stageBNames.map(name => corpus[name].entity?.id).filter(Boolean);
    const details = new Map();
    if (ids.length) {
        console.log(`阶段 B：批量取 ${ids.length} 个实体详情（${Math.ceil(ids.length / 45)} 批）`);
        for (let i = 0; i < ids.length; i += 45) {
            const chunk = ids.slice(i, i + 45);
            try {
                const entities = await fetchEntitiesBatch(chunk);
                Object.entries(entities).forEach(([id, entity]) => details.set(id, entity));
            } catch (error) {
                console.error(`  批次失败(${chunk.length}): ${error.message}`);
            }
            console.log(`  ${Math.min(i + 45, ids.length)}/${ids.length}`);
        }
    }

    const claimIds = [];
    details.forEach(entity => {
        Object.keys(CLAIM_PROPERTIES).forEach(property => {
            claimValues(entity, property).forEach(value => { if (value.kind === 'entity') claimIds.push(value.id); });
        });
    });
    let labelById = new Map();
    if (claimIds.length) {
        console.log(`阶段 B2：解析 ${new Set(claimIds).size} 个关系声明目标实体的标签`);
        labelById = await fetchLabelMap(claimIds);
    }

    // 阶段 C：取百科正文并落成最终记录
    console.log('阶段 C：取百科正文并成稿');
    let writtenCounter = 0;
    await runPool(stageBNames, async name => {
        try {
            corpus[name] = await finalizeNode(corpus[name], corpus[name].entity ? details.get(corpus[name].entity.id) : null, labelById, !bulkOnly);
        } catch (error) {
            corpus[name] = { ...corpus[name], stage: 'complete', matchMode: 'none', status: 'source-error', entityDetail: null, claims: [], article: null, errors: [...(corpus[name].errors || []), String(error.message || error)] };
        }
        writtenCounter += 1;
        if (!reportOnly) {
            saveCheckpoint(corpus);
            // 每 50 个就落一次产物：万一中途中断，前端也能先看到已完成的部分
            if (writtenCounter % 50 === 0) writeOutput(corpus);
        }
    });

    if (!reportOnly) saveCheckpoint(corpus);
    const written = reportOnly ? 0 : writeOutput(corpus);

    const values = Object.values(corpus).filter(item => item.stage === 'complete');
    const byStatus = {};
    values.forEach(item => { byStatus[item.status] = (byStatus[item.status] || 0) + 1; });
    const withPage = values.filter(item => (item.entityDetail?.wikipedia?.url) || item.article?.url).length;
    const withProse = values.filter(item => ((item.entityDetail?.wikipedia?.extract || item.article?.extract || '').length > 150)).length;

    console.log(JSON.stringify({
        nodes: nodes.length,
        completed: values.length,
        entityMatches: values.filter(item => item.matchMode === 'wikidata').length,
        entityConfirmed: values.filter(item => item.status === 'entity-confirmed').length,
        entityCandidate: values.filter(item => item.status === 'entity-candidate').length,
        articleMatches: values.filter(item => item.matchMode === 'wikipedia').length,
        articleConfirmed: values.filter(item => item.status === 'article-confirmed').length,
        noMatch: values.filter(item => item.status === 'no-authoritative-match').length,
        sourceErrors: values.filter(item => item.status === 'source-error').length,
        withEncyclopediaPage: withPage,
        withProseExtract: withProse,
        claimStatements: values.reduce((sum, item) => sum + (item.claims || []).length, 0),
        byStatus,
        outputNodes: written,
        elapsedSec: Math.round((Date.now() - started) / 1000),
        requests: stats.requests,
        rateLimited: stats.rateLimited,
        failedRequests: stats.failures,
        throttleWaitSec: Math.round(stats.waitMs / 1000),
        backoffWaitSec: Math.round(stats.backoffMs / 1000),
        finalIntervalMs: adaptiveIntervalMs,
        requestBreakdown: Object.fromEntries(Object.entries(stats.byLabel).map(([label, value]) => [label, { requests: value.requests, avgMs: value.requests ? Math.round(value.ms / value.requests) : 0, rateLimited: value.rateLimited }])),
        outputPath: reportOnly ? '(report only)' : outputPath
    }, null, 2));

    const accepted = values.filter(item => item.matchMode !== 'none').sort((a, b) => a.score - b.score);
    console.log('\n--- 最低分的已接受匹配（人工核对重点） ---');
    accepted.slice(0, 30).forEach(item => {
        const label = item.entityDetail
            ? `${item.entityDetail.id} ${item.entityDetail.label.zh || item.entityDetail.label.en}`
            : `条目《${item.article.title}》`;
        const description = item.entityDetail?.description?.zh || item.article?.description || '';
        console.log(`${String(item.score).padEnd(6)} ${item.nodeName}  ==>  ${label}${description ? ` | ${description}` : ''}`);
    });
    if (reportOnly) {
        console.log('\n--- 未匹配节点（前 30） ---');
        values.filter(item => item.matchMode === 'none').slice(0, 30).forEach(item => console.log(`${item.nodeName}  (best=${item.score})`));
    }
}

main().catch(error => { console.error(error); process.exit(1); });
