/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const directory = __dirname;
const graphSource = fs.readFileSync(path.join(directory, 'graphData.js'), 'utf8');
const checkpointPath = path.join(directory, 'nodeKnowledgeCorpus.checkpoint.json');
const outputPath = path.join(directory, 'nodeKnowledgeCorpus.js');
const concurrency = Math.max(1, Math.min(12, Number(process.env.KG_CONCURRENCY) || 6));
const refresh = process.argv.includes('--refresh');
const retryFailed = process.argv.includes('--retry-failed');
const userAgent = 'PzMAgentool-KnowledgeCorpus/1.0 (node knowledge provenance compiler)';
const enabledSources = new Set(String(process.env.KG_SOURCES || 'wikidata,openalex,crossref').split(',').map(value => value.trim()).filter(Boolean));
const sourceSchedule = new Map();
const sourceHealth = new Map();

async function throttleSource(source, intervalMs) {
    const now = Date.now();
    const next = Math.max(now, sourceSchedule.get(source) || now);
    sourceSchedule.set(source, next + intervalMs);
    if (next > now) await new Promise(resolve => setTimeout(resolve, next - now));
}

function loadGraphNodes() {
    const context = { console };
    vm.createContext(context);
    vm.runInContext(`${graphSource}\nthis.__getGraphTree=getGraphTree;this.__buildGraphData=buildGraphData;`, context);
    const theme = new Proxy({}, { get: () => 0xffffff });
    return context.__buildGraphData(context.__getGraphTree(theme), theme).nodes
        .filter(node => node.kind !== 'knowledge-detail')
        .map(node => ({ name: node.name, source: node.source || '', scale: node.scale || '', maturity: node.maturity || '' }));
}

function extractTerms(name) {
    const raw = String(name || '').trim();
    const english = (raw.match(/[A-Za-z][A-Za-z0-9+\-./& ]*[A-Za-z0-9)]/g) || [])
        .map(value => value.replace(/\s+/g, ' ').trim()).sort((a, b) => b.length - a.length)[0] || '';
    const chinese = raw.replace(/[A-Za-z0-9+\-./&():]/g, ' ').replace(/\s+/g, '').trim();
    return { raw, english, chinese, query: english || chinese || raw };
}

function tokens(value) {
    return new Set(String(value || '').toLowerCase().normalize('NFKC').match(/[a-z0-9]{2,}|[\u4e00-\u9fff]{2,}/g) || []);
}

function similarity(query, candidate) {
    const left = tokens(query);
    const right = tokens(candidate);
    if (!left.size || !right.size) return 0;
    const intersection = [...left].filter(token => right.has(token)).length;
    const containment = intersection / left.size;
    const exact = String(candidate || '').toLowerCase().includes(String(query || '').toLowerCase()) ? 0.35 : 0;
    return Math.min(1, containment * 0.65 + exact);
}

function decodeAbstract(index) {
    if (!index || typeof index !== 'object') return '';
    const words = [];
    Object.entries(index).forEach(([word, positions]) => (positions || []).forEach(position => { words[position] = word; }));
    return words.filter(Boolean).join(' ').slice(0, 1800);
}

async function getJson(url, { attempts = 3, source = 'generic', intervalMs = 250 } = {}) {
    const health = sourceHealth.get(source) || { failures: 0, openUntil: 0 };
    if (health.openUntil > Date.now()) throw new Error(`circuit open for ${source}`);
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        await throttleSource(source, intervalMs);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': userAgent } });
            if (response.status === 429 || response.status >= 500) {
                const retryAfter = Number(response.headers.get('retry-after') || 0);
                if (retryAfter > 0) await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                throw new Error(`retryable HTTP ${response.status}`);
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            sourceHealth.set(source, { failures: 0, openUntil: 0 });
            return data;
        } catch (error) {
            if (attempt === attempts) {
                const latest = sourceHealth.get(source) || { failures: 0, openUntil: 0 };
                const failures = latest.failures + 1;
                sourceHealth.set(source, { failures, openUntil: failures >= 3 ? Date.now() + 60000 : 0 });
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 500)));
        } finally {
            clearTimeout(timeout);
        }
    }
}

async function queryWikidata(terms) {
    const query = terms.english || terms.chinese || terms.raw;
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&uselang=zh&limit=5&format=json&origin=*`;
    const data = await getJson(url, { source: 'wikidata', intervalMs: 500, attempts: 2 });
    const ranked = (data.search || []).map(item => ({
        id: item.id, label: item.label, description: item.description || '', url: item.concepturi,
        confidence: similarity(query, `${item.label} ${item.match?.text || ''}`)
    })).sort((a, b) => b.confidence - a.confidence);
    const best = ranked[0];
    return best && best.confidence >= 0.55 ? best : null;
}

async function queryOpenAlex(terms) {
    const query = terms.english || terms.chinese || terms.raw;
    const select = 'id,display_name,publication_year,cited_by_count,doi,primary_location,abstract_inverted_index,type';
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(`"${query}"`)}&per-page=4&sort=relevance_score:desc&select=${select}`;
    const data = await getJson(url, { source: 'openalex', intervalMs: 350, attempts: 4 });
    return (data.results || []).map(item => ({
        source: 'OpenAlex',
        title: item.display_name, year: item.publication_year || null, citations: item.cited_by_count || 0,
        type: item.type || 'work', doi: item.doi || '', url: item.doi || item.primary_location?.landing_page_url || item.id,
        openAlexId: item.id, abstract: decodeAbstract(item.abstract_inverted_index),
        confidence: similarity(query, item.display_name)
    })).filter(item => item.confidence >= 0.35).slice(0, 3);
}

function stripJats(value) {
    return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 1800);
}

function crossrefYear(item) {
    return item.published?.['date-parts']?.[0]?.[0] || item.issued?.['date-parts']?.[0]?.[0] || null;
}

async function queryCrossref(terms) {
    const query = terms.english || terms.chinese || terms.raw;
    const select = 'DOI,title,abstract,published,issued,is-referenced-by-count,type,URL,container-title';
    const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(query)}&rows=4&select=${select}`;
    const data = await getJson(url, { source: 'crossref', intervalMs: 350, attempts: 3 });
    return (data.message?.items || []).map(item => {
        const title = Array.isArray(item.title) ? item.title[0] : item.title;
        return {
            source: 'Crossref',
            title, year: crossrefYear(item), citations: item['is-referenced-by-count'] || 0,
            type: item.type || 'work', doi: item.DOI ? `https://doi.org/${item.DOI}` : '',
            url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''), crossrefDoi: item.DOI || '',
            venue: Array.isArray(item['container-title']) ? item['container-title'][0] : '',
            abstract: stripJats(item.abstract), confidence: similarity(query, title)
        };
    }).filter(item => item.confidence >= 0.55).slice(0, 3);
}

async function compileNode(node) {
    const terms = extractTerms(node.name);
    const entityPromise = enabledSources.has('wikidata') ? queryWikidata(terms) : Promise.resolve(null);
    const scholarlyPromises = [];
    if (enabledSources.has('openalex')) scholarlyPromises.push(queryOpenAlex(terms));
    if (enabledSources.has('crossref')) scholarlyPromises.push(queryCrossref(terms));
    const [entityResult, worksResult] = await Promise.allSettled([
        entityPromise,
        Promise.allSettled(scholarlyPromises).then(results => results.flatMap(result => result.status === 'fulfilled' ? result.value : []))
    ]);
    const entity = entityResult.status === 'fulfilled' ? entityResult.value : null;
    const works = worksResult.status === 'fulfilled' ? worksResult.value : [];
    const errors = [entityResult, worksResult].filter(result => result.status === 'rejected').map(result => String(result.reason?.message || result.reason));
    const sourcesSucceeded = [entityResult, worksResult].filter(result => result.status === 'fulfilled').length;
    return {
        nodeName: node.name, compiledAt: new Date().toISOString(), query: terms.query,
        status: entity || works.length ? 'evidence-found' : sourcesSucceeded === 0 ? 'source-error' : 'no-authoritative-match',
        entity,
        works: [...new Map(works.map(work => [work.doi || work.url || work.title, work])).values()].slice(0, 5),
        provenance: {
            compilers: [...enabledSources].map(source => ({ wikidata: 'Wikidata entity search', openalex: 'OpenAlex scholarly graph', crossref: 'Crossref DOI registry' }[source] || source)),
            policy: 'Automatic matches are discovery evidence. Abstract-backed records may support scoped claims; bibliographic-only records may not.',
            sourcesSucceeded, errors
        }
    };
}

function loadCheckpoint() {
    if (refresh || !fs.existsSync(checkpointPath)) return {};
    const corpus = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    Object.values(corpus).forEach(item => {
        item.works = (item.works || []).filter(work => {
            const source = work.source || (work.crossrefDoi ? 'Crossref' : 'OpenAlex');
            return source !== 'Crossref' || Number(work.confidence || 0) >= 0.55;
        });
        if (!item.entity && !item.works.length && item.status === 'evidence-found') item.status = 'no-authoritative-match';
    });
    return corpus;
}

function saveCheckpoint(corpus) {
    fs.writeFileSync(checkpointPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
}

function writeOutput(corpus) {
    const ordered = Object.fromEntries(Object.keys(corpus).sort((a, b) => a.localeCompare(b, 'zh-CN')).map(key => [key, corpus[key]]));
    const header = '// Generated by compileKnowledgeCorpus.js. Do not hand-edit.\n';
    fs.writeFileSync(outputPath, `${header}window.GRAPH_NODE_EVIDENCE_CORPUS = ${JSON.stringify(ordered, null, 2)};\n`, 'utf8');
}

async function main() {
    const nodes = loadGraphNodes();
    const corpus = loadCheckpoint();
    const pending = nodes.filter(node => {
        const existing = corpus[node.name];
        if (!existing) return true;
        if (!retryFailed) return false;
        return existing.status !== 'evidence-found' && (existing.provenance?.errors || []).length > 0;
    });
    let cursor = 0;
    let completed = 0;
    async function worker() {
        while (cursor < pending.length) {
            const node = pending[cursor++];
            try {
                corpus[node.name] = await compileNode(node);
            } catch (error) {
                corpus[node.name] = { nodeName: node.name, compiledAt: new Date().toISOString(), status: 'needs-expert-review', entity: null, works: [], provenance: { errors: [String(error.message || error)] } };
            }
            completed += 1;
            saveCheckpoint(corpus);
            if (completed % 20 === 0) {
                console.log(`${completed}/${pending.length} compiled`);
            }
        }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    saveCheckpoint(corpus);
    writeOutput(corpus);
    const values = Object.values(corpus);
    console.log(JSON.stringify({
        nodes: nodes.length,
        compiled: values.length,
        evidenceFound: values.filter(item => item.status === 'evidence-found').length,
        claimable: values.filter(item => item.entity || item.works?.some(work => work.abstract)).length,
        bibliographicOnly: values.filter(item => item.works?.length && !item.entity && !item.works.some(work => work.abstract)).length,
        noAuthoritativeMatch: values.filter(item => item.status === 'no-authoritative-match').length,
        sourceErrors: values.filter(item => item.status === 'source-error').length,
        outputPath
    }, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
