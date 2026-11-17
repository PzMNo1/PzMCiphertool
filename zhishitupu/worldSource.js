/* Node-only source layer for the world knowledge graph build.
 * Fetches Wikipedia wikitext through the api.wikimedia.org gateway (the
 * *.wikipedia.org hosts are unreachable from this network) and Wikidata
 * through the public API/SPARQL endpoints. No content is generated here:
 * every character that reaches the graph comes from these responses.
 */
'use strict';

const https = require('https');

const USER_AGENT = 'PzMAgentool-WorldGraph/2.0 (local knowledge graph build; node.js)';
const GATEWAY = 'api.wikimedia.org';
const WIKIDATA = 'www.wikidata.org';
const SPARQL = 'query.wikidata.org';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const stats = {
    requests: 0,
    retries: 0,
    rateLimited: 0,
    waitMs: 0,
    byHost: {}
};

let nextSlot = 0;
let intervalMs = Math.max(120, Number(process.env.WG_INTERVAL_MS) || 900);

async function throttle() {
    const now = Date.now();
    const start = Math.max(now, nextSlot);
    nextSlot = start + intervalMs;
    if (start > now) {
        stats.waitMs += start - now;
        await sleep(start - now);
    }
}

function rawRequest(host, requestPath, { timeoutMs = 45000, accept = 'application/json' } = {}) {
    return new Promise((resolve, reject) => {
        const request = https.request({
            host,
            path: requestPath,
            method: 'GET',
            headers: {
                'User-Agent': USER_AGENT,
                Accept: accept,
                'Accept-Encoding': 'identity'
            },
            autoSelectFamily: true,
            autoSelectFamilyAttemptTimeout: 4000
        }, response => {
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
                resolve({
                    status: response.statusCode,
                    headers: response.headers,
                    body: Buffer.concat(chunks).toString('utf8')
                });
            });
            response.on('error', reject);
        });
        request.setTimeout(timeoutMs, () => request.destroy(new Error(`timeout after ${timeoutMs}ms`)));
        request.on('error', reject);
        request.end();
    });
}

async function fetchJson(host, requestPath, { attempts = 6, timeoutMs = 45000, label = host } = {}) {
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        await throttle();
        stats.requests += 1;
        stats.byHost[label] = (stats.byHost[label] || 0) + 1;
        try {
            const response = await rawRequest(host, requestPath, { timeoutMs });
            if (response.status === 200) {
                try {
                    return JSON.parse(response.body);
                } catch (error) {
                    throw new Error(`invalid JSON (${response.body.slice(0, 120)})`);
                }
            }
            if (response.status === 301 || response.status === 302) {
                const target = response.headers.location || '';
                if (target) {
                    const url = new URL(target, `https://${host}`);
                    return fetchJson(url.host, `${url.pathname}${url.search}`, { attempts: attempts - attempt + 1, timeoutMs, label: url.host });
                }
            }
            const error = new Error(`HTTP ${response.status} ${requestPath.slice(0, 160)}`);
            error.statusCode = response.status;
            error.retryAfter = Number(response.headers['retry-after'] || 0);
            if (response.status === 404) throw error;
            lastError = error;
            stats.retries += 1;
            if (response.status === 429) {
                stats.rateLimited += 1;
                intervalMs = Math.min(8000, Math.round(intervalMs * 1.6));
                const wait = Math.max(error.retryAfter * 1000, 1500 * attempt);
                await sleep(wait);
            } else {
                await sleep(800 * attempt + Math.floor(Math.random() * 300));
            }
        } catch (error) {
            if (error.statusCode === 404) throw error;
            lastError = error;
            stats.retries += 1;
            await sleep(700 * attempt + Math.floor(Math.random() * 300));
        }
    }
    throw lastError || new Error(`request failed: ${host}${requestPath}`);
}

function pagePath(language, title) {
    const encoded = encodeURIComponent(String(title).replace(/ /g, '_'));
    return `/core/v1/wikipedia/${language}/page/${encoded}`;
}

async function fetchWikipediaPage(language, title, options = {}) {
    let data = await fetchJson(GATEWAY, pagePath(language, title), {
        attempts: options.attempts || 6,
        label: `wikipedia:${language}`
    });
    if (data && data.redirect_target) {
        const match = String(data.redirect_target).match(/\/page\/([^?#]+)/);
        if (!match) throw new Error(`unresolvable redirect: ${data.redirect_target}`);
        data = await fetchJson(GATEWAY, `/core/v1/wikipedia/${language}/page/${match[1]}`, {
            attempts: options.attempts || 6,
            label: `wikipedia:${language}`
        });
    }
    if (!data || !data.source) throw new Error(`no wikitext for ${language}:${title}`);
    return data;
}

async function fetchWikidataEntities(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    const out = {};
    for (let index = 0; index < unique.length; index += 50) {
        const batch = unique.slice(index, index + 50);
        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: batch.join('|'),
            props: 'labels|descriptions|aliases|sitelinks',
            languages: 'zh|zh-hans|en',
            sitefilter: 'zhwiki|enwiki',
            format: 'json'
        });
        const data = await fetchJson(WIKIDATA, `/w/api.php?${params.toString()}`, {
            attempts: 5,
            label: 'wikidata:entities'
        });
        Object.assign(out, data.entities || {});
    }
    return out;
}

async function sparql(query, options = {}) {
    const path = `/sparql?format=json&query=${encodeURIComponent(query)}`;
    return fetchJson(SPARQL, path, {
        attempts: options.attempts || 4,
        timeoutMs: options.timeoutMs || 60000,
        label: 'wikidata:sparql'
    });
}

function sparqlRows(data) {
    return data && data.results ? data.results.bindings || [] : [];
}

function shortId(uri) {
    return String(uri || '').split('/').pop();
}

const SKIP_NAMESPACES = /^(?:wikipedia|wp|file|image|category|portal|template|help|talk|user|draft|module|special|mediawiki|book|timedtext):/i;
const SKIP_TITLE = /^(?:list of|outline of|index of|bibliography of|timeline of|glossary of|category:|file:|image:|template:|wikipedia:|portal:|help:|talk:)/i;

function normalizeWikiTitle(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^:+/, '')
        .trim();
}

function isEncyclopedicTitle(value) {
    const title = normalizeWikiTitle(value);
    if (!title || title.length < 2) return false;
    if (SKIP_NAMESPACES.test(title) || SKIP_TITLE.test(title)) return false;
    if (/^\d{1,4}(?:年|s?)$/.test(title)) return false;
    if (/^(?:参见|參考文獻|参考文献|外部連結|外部链接|注释|註釋|延伸阅读|延伸閱讀|来源|來源|參考資料|参考资料)$/.test(title)) return false;
    return true;
}

function decodeEntities(text) {
    return String(text || '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function removeNestedTemplates(text) {
    let out = '';
    let depth = 0;
    for (let index = 0; index < text.length; index += 1) {
        if (text.startsWith('{{', index)) { depth += 1; index += 1; continue; }
        if (text.startsWith('}}', index)) { if (depth > 0) depth -= 1; index += 1; continue; }
        if (depth === 0) out += text[index];
    }
    return out;
}

function expandInlineTemplates(value) {
    let text = String(value || '');
    const expand = (namePattern, pick) => {
        const pattern = new RegExp(`\\{\\{\\s*(?:${namePattern})\\s*\\|([^{}]*)\\}\\}`, 'gi');
        for (let pass = 0; pass < 3; pass += 1) {
            text = text.replace(pattern, (_, body) => {
                const args = String(body).split('|').map(item => item.trim()).filter(Boolean);
                return pick(args) || '';
            });
        }
    };
    expand('lang|langx|lang-en|lang-zh|lang-fr|lang-de|lang-la|lang-el|lang-ja|lang-ko|lang-ru|lang-es', args => {
        const text = args.filter(item => !/^[a-z]{2,3}(?:-[a-z]+)?$/i.test(item));
        return text[text.length - 1] || '';
    });
    expand('transl|transliteration', args => args[args.length - 1] || '');
    expand('nowrap|nobr', args => args.join(' '));
    expand('ill|interlanguage link|link-interwiki', args => args[0] || '');
    expand('nihongo|nihongo2|nihongo3', args => args[0] || '');
    expand('ruby', args => args[0] || '');
    expand('abbr', args => args[0] || '');
    expand('IPA|ipa|IPAc-en|audio', () => '');
    text = text.replace(/-\{([^{}]*)\}-/g, (_, body) => {
        const parts = String(body).split(';').map(item => item.trim()).filter(Boolean);
        const preferred = parts.find(item => /^(?:zh-hans|zh-cn|zh-sg|zh-my)\s*:/.test(item)) || parts[0] || '';
        return preferred.replace(/^[^:]{1,16}:/, '');
    });
    text = text.replace(/__[A-Z]+__/g, ' ');
    return text;
}

function stripBracketLinks(value) {
    const text = String(value || '');
    let out = '';
    let index = 0;
    while (index < text.length) {
        if (text.startsWith('[[', index)) {
            let depth = 0;
            let cursor = index;
            let closed = false;
            while (cursor < text.length - 1) {
                if (text.startsWith('[[', cursor)) { depth += 1; cursor += 2; continue; }
                if (text.startsWith(']]', cursor)) {
                    depth -= 1;
                    cursor += 2;
                    if (depth === 0) { closed = true; break; }
                    continue;
                }
                cursor += 1;
            }
            if (!closed) { out += text[index]; index += 1; continue; }
            const inner = text.slice(index + 2, cursor - 2);
            const target = inner.split('|')[0].trim();
            if (/^(?:File|Image|文件|檔案|图像|圖像|Category|分类|分類|Media|Special|Help|Portal|Template|Module|User|Talk|Wikipedia|WP|en|zh|ja|de|fr|ru|es|ko|la|el):/i.test(target)) {
                out += ' ';
            } else {
                const pipe = inner.lastIndexOf('|');
                const label = pipe >= 0 ? inner.slice(pipe + 1) : inner;
                out += stripBracketLinks(label);
            }
            index = cursor;
            continue;
        }
        out += text[index];
        index += 1;
    }
    return out;
}

function stripWikiMarkup(value) {
    let text = String(value || '');
    text = text.replace(/<!--[\s\S]*?-->/g, ' ');
    text = text.replace(/<ref[^>]*\/>/gi, ' ');
    text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ');
    text = text.replace(/<references[^>]*\/>/gi, ' ');
    text = text.replace(/<gallery[\s\S]*?<\/gallery>/gi, ' ');
    text = text.replace(/<imagemap[\s\S]*?<\/imagemap>/gi, ' ');
    text = text.replace(/^\s*(?:File|Image|文件|檔案|图像|圖像):.*$/gmi, ' ');
    text = text.replace(/\{\|[\s\S]*?\|\}/g, ' ');
    text = expandInlineTemplates(text);
    text = removeNestedTemplates(text);
    // Malformed file links (unbalanced nested links/templates) are common in
    // older revisions. Drop the rest of that line before the balanced scan.
    text = text.replace(/\[\[(?:File|Image|文件|檔案|图像|圖像):[^\n]*/gi, ' ');
    text = stripBracketLinks(text);
    text = text.replace(/\[(?:https?:)?\/\/\S+\s+([^\]]*)\]/g, '$1');
    text = text.replace(/\[(?:https?:)?\/\/\S+\]/g, ' ');
    text = text.replace(/'''?/g, '');
    text = text.replace(/<br\s*\/?>/gi, ' ');
    text = text.replace(/<[^>]+>/g, ' ');
    text = text.replace(/^[*#:;].*$/gm, ' ');
    text = decodeEntities(text);
    text = text
        .replace(/（\s*）/g, '')
        .replace(/\(\s*\)/g, '')
        .replace(/\[\s*\]/g, '')
        .replace(/[ \t]+([，。；：、])/g, '$1')
        .replace(/([，。；：、]){2,}/g, '$1');
    return text;
}

const DROP_SECTIONS = /^(?:参见|參見|参考文献|參考文獻|参考资料|參考資料|外部链接|外部連結|注释|註釋|脚注|腳註|延伸阅读|延伸閱讀|来源|來源|引用|参考|參考|进一步阅读|進一步閱讀|see also|references|external links|notes|further reading|bibliography|citations|sources|footnotes)$/i;

function cleanSectionText(raw) {
    const plain = stripWikiMarkup(raw).replace(/\r/g, '');
    const paragraphs = plain
        .split(/\n\s*\n+/)
        .map(part => part.replace(/[ \t\u00a0]+/g, ' ').replace(/\n+/g, ' ').trim())
        .filter(part => part.length >= 24)
        .filter(part => !/^(?:坐标|坐标:|Infobox|\[\[)/i.test(part))
        .filter(part => !/^[\d\s.,;:()\-–—]+$/.test(part));
    return paragraphs;
}

function parseSections(source, { maxSections = 80, maxParagraphsPerSection = 24 } = {}) {
    const lines = String(source || '').replace(/\r/g, '').split('\n');
    const sections = [];
    let current = { heading: '', level: 0, lines: [] };
    const flush = () => {
        if (!current.lines.length && !current.heading) return;
        const headingText = stripWikiMarkup(current.heading).replace(/\s+/g, ' ').trim();
        if (headingText && DROP_SECTIONS.test(headingText)) { current = { heading: '', level: 0, lines: [] }; return; }
        const paragraphs = cleanSectionText(current.lines.join('\n')).slice(0, maxParagraphsPerSection);
        if (paragraphs.length) {
            sections.push({
                heading: headingText || '',
                level: current.level,
                paragraphs
            });
        }
        current = { heading: '', level: 0, lines: [] };
    };
    for (const line of lines) {
        const match = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
        if (match) {
            flush();
            current.heading = match[2];
            current.level = match[1].length;
            if (sections.length >= maxSections) break;
            continue;
        }
        current.lines.push(line);
    }
    flush();
    return sections.slice(0, maxSections);
}

function parseWikiLinks(source) {
    const text = String(source || '').replace(/<!--[\s\S]*?-->/g, ' ');
    const links = [];
    const seen = new Set();
    const pattern = /\[\[([^\[\]|#]+)(?:#[^\[\]|]*)?(?:\|([^\[\]]*))?\]\]/g;
    let match;
    while ((match = pattern.exec(text))) {
        const target = normalizeWikiTitle(match[1]);
        if (!isEncyclopedicTitle(target)) continue;
        const key = target.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        links.push(target);
    }
    return links;
}

function chunkParagraphs(sections, { maxChars = 720, overlapChars = 90, minChars = 120 } = {}) {
    const chunks = [];
    const pushChunk = (heading, text) => {
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        if (clean.length >= minChars) chunks.push({ heading, text: clean });
    };
    const splitLong = (heading, paragraph) => {
        const sentences = paragraph.split(/(?<=[。！？!?；;])\s*|(?<=[.])\s+(?=[A-Z0-9])/u);
        let buffer = '';
        for (const sentence of sentences) {
            const next = buffer ? `${buffer} ${sentence}` : sentence;
            if (next.length > maxChars && buffer.length >= minChars) {
                pushChunk(heading, buffer);
                const tail = buffer.slice(Math.max(0, buffer.length - overlapChars));
                buffer = `${tail} ${sentence}`.trim();
            } else {
                buffer = next;
            }
        }
        pushChunk(heading, buffer);
    };
    for (const section of sections) {
        let buffer = '';
        for (const paragraph of section.paragraphs) {
            if (!paragraph) continue;
            if (paragraph.length > maxChars) {
                pushChunk(section.heading, buffer);
                buffer = '';
                splitLong(section.heading, paragraph);
                continue;
            }
            const next = buffer ? `${buffer} ${paragraph}` : paragraph;
            if (next.length > maxChars) {
                pushChunk(section.heading, buffer);
                buffer = paragraph;
            } else {
                buffer = next;
            }
        }
        pushChunk(section.heading, buffer);
    }
    return chunks;
}

module.exports = {
    stats,
    fetchWikipediaPage,
    fetchWikidataEntities,
    sparql,
    sparqlRows,
    shortId,
    normalizeWikiTitle,
    isEncyclopedicTitle,
    parseSections,
    parseWikiLinks,
    chunkParagraphs,
    stripWikiMarkup,
    decodeEntities,
    sleep,
    setIntervalMs: value => { intervalMs = Math.max(120, Number(value) || intervalMs); },
    getIntervalMs: () => intervalMs
};
