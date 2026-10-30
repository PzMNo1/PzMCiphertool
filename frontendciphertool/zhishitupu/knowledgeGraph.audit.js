/* Integration audit for the rebuilt knowledge graph.
 *
 * Checks the generated graph, the graphData adapter, the local retriever and
 * the Agentmaster wiring as one path. It fails on any leftover fabricated
 * domain/facet content or on retrieval that does not return cited source text.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { createWorldRag } = require('./worldRag.js');

const directory = __dirname;
const read = file => fs.readFileSync(path.join(directory, file), 'utf8');
const readAgent = file => fs.readFileSync(path.join(directory, '..', 'agentmaster', file), 'utf8');
const failures = [];
const minNodes = Math.max(1, Number(process.env.WG_AUDIT_MIN_NODES) || 100);

function check(condition, message) {
    if (!condition) failures.push(message);
}

const worldSource = read('worldKnowledge.js');
const graphSource = read('graphData.js');
const retrieverSource = read('zhishitupu.js');
const ragSource = read('worldRag.js');
const modulesSource = fs.readFileSync(path.join(directory, '..', 'modules.js'), 'utf8');
const agentSource = readAgent('agentmaster.js');

const context = { console, window: {} };
context.window = context;
vm.createContext(context);
vm.runInContext(worldSource, context);
const store = context.WORLD_KNOWLEDGE_GRAPH;
check(Boolean(store), 'WORLD_KNOWLEDGE_GRAPH is missing');
const expansionPath = path.join(directory, 'worldExpansion.js');
if (fs.existsSync(expansionPath)) {
    vm.runInContext(read('worldExpansion.js'), context);
}
const expansionStore = context.WORLD_KNOWLEDGE_EXPANSION;
check(Boolean(expansionStore), 'WORLD_KNOWLEDGE_EXPANSION is missing');
const corpusFile = path.join(directory, 'worldCorpus.bin');
if (fs.existsSync(corpusFile) && store) {
    store.documents = JSON.parse(zlib.gunzipSync(fs.readFileSync(corpusFile)).toString('utf8')).documents || {};
}
const expansionCorpusFile = path.join(directory, 'worldExpansionCorpus.bin');
let expansionCorpus = null;
if (fs.existsSync(expansionCorpusFile) && expansionStore) {
    expansionCorpus = JSON.parse(zlib.gunzipSync(fs.readFileSync(expansionCorpusFile)).toString('utf8'));
    expansionStore.documents = expansionCorpus.documents || {};
}

vm.runInContext(`${graphSource}\nthis.__tree=getGraphTree({});this.__graph=buildGraphData(this.__tree,{});this.__lookup=getGraphNodeWorldKnowledge;this.__stats=getWorldGraphStats;`, context);
const tree = context.__tree || [];
const graph = context.__graph || { nodes: [], links: [] };
const topRoots = tree[0]?.center ? (tree[0].children || []) : tree;
const expansionNodes = graph.nodes.filter(node => node.kind === 'expansion');
const entityNodes = graph.nodes.filter(node => node.kind !== 'category' && node.kind !== 'root' && node.kind !== 'expansion');
const categoryNodes = graph.nodes.filter(node => node.kind === 'category');
const expansionCategories = categoryNodes.filter(node => String(node.worldId || '').startsWith('exp:'));

check(topRoots.length >= 5, `expected at least 5 real top-level sections, got ${topRoots.length}`);
check(entityNodes.length >= minNodes, `entity node count ${entityNodes.length} is below ${minNodes}`);
check(expansionNodes.length >= 300, `expansion node count ${expansionNodes.length} is below 300`);
check(expansionCategories.length >= 10, `expansion category count ${expansionCategories.length} is below 10`);
check(categoryNodes.length > 0, 'no category nodes were built');
check(graph.nodes.length >= 1400, `total graph node count ${graph.nodes.length} is below 1400`);
check(graph.links.length >= entityNodes.length, 'hierarchy links are incomplete');
check(graph.links.some(link => link.__hierarchy === false), 'no real cross-relations were rendered');
check(graph.links.filter(link => link.relation === 'cross-disciplinary').length >= 40, 'cross-disciplinary links are missing');

for (const node of entityNodes) {
    check(Boolean(node.qid), `${node.name}: missing QID`);
    check(Boolean(node.description), `${node.name}: missing real Wikidata description`);
    const records = node.knowledgeBase || [];
    check(records.some(record => record.evidenceLevel === 'encyclopedia-verbatim'), `${node.name}: no verbatim Wikipedia record`);
    const sourced = records.filter(record => record.evidenceLevel === 'encyclopedia-verbatim');
    check(sourced.every(record => record.citation?.url && record.citation?.revision), `${node.name}: a Wikipedia record lacks URL/revision`);
}
for (const node of categoryNodes) {
    check(Boolean(node.knowledgeBase?.[0]?.content), `${node.name}: category has no member index`);
}
const entityNames = new Set(entityNodes.map(node => node.name));
const expansionNames = new Set();
for (const node of expansionNodes) {
    const titleOk = Boolean(node.nameZh && node.nameEn && node.name === `${node.nameZh} ${node.nameEn}`
        && /[\u4e00-\u9fff]/.test(node.nameZh) && /[A-Za-z]/.test(node.nameEn));
    check(titleOk, `${node.name}: expansion title is not 简体中文 English`);
    check(!entityNames.has(node.name), `${node.name}: expansion duplicates an existing entity`);
    check(!expansionNames.has(node.name), `${node.name}: duplicate expansion title`);
    expansionNames.add(node.name);
    check(String(node.sourceUrl || '').startsWith('https://dbpedia.org/'), `${node.name}: missing DBpedia source URL`);
    check(Boolean(node.descriptionZh || node.descriptionEn), `${node.name}: expansion has no description`);
    check((node.knowledgeBase || []).some(record =>
        record.evidenceLevel === 'external-description' && record.citation?.url), `${node.name}: missing sourced external record`);
}
check(expansionNodes.some(node => node.crossDomain), 'no cross-disciplinary expansion nodes');

check(modulesSource.includes('./zhishitupu/worldExpansionCorpusLoader.js'), 'modules.js does not load worldExpansionCorpusLoader.js');
check(Boolean(expansionStore?.meta?.corpus?.file), 'worldExpansion.js has no expansion corpus metadata');
if (expansionCorpus) {
    const documents = expansionCorpus.documents || {};
    check(Object.keys(documents).length > 0, 'expansion corpus has no documents');
    for (const node of expansionNodes) {
        if (!node.article) continue;
        const doc = documents[node.worldId];
        check(Boolean(doc), `${node.name}: article metadata without corpus document`);
        if (!doc) continue;
        check(Array.isArray(doc.chunks) && doc.chunks.length > 0 && doc.chunks.every(chunk => chunk.text), `${node.name}: expansion corpus text is empty`);
        check(Boolean(doc.url && doc.revision && doc.license), `${node.name}: expansion corpus lacks URL/revision/license`);
        check(doc.revision === node.article.revision && doc.url === node.article.url, `${node.name}: article metadata does not match corpus`);
    }
}


for (const required of ['Quantum mechanics', 'Artificial intelligence', 'World War II', 'CRISPR', 'Lithium-ion battery']) {
    const found = entityNodes.some(node =>
        [node.name, node.nameEn].filter(Boolean).some(value => value.toLowerCase() === required.toLowerCase())
    );
    check(found, `core topic missing from the graph: ${required}`);
}

const sample = entityNodes.find(node => node.knowledgeBase?.some(record => record.evidenceLevel === 'encyclopedia-verbatim'));
check(Boolean(sample), 'no entity with Wikipedia records to test');
if (sample) {
    const entry = context.__lookup(sample.name);
    check(entry?.status === 'entity-confirmed', `${sample.name}: world lookup did not confirm the entity`);
    check(Boolean(entry?.entityDetail?.id), `${sample.name}: world lookup lacks QID`);
    check(Boolean(entry?.entityDetail?.wikipedia?.revision), `${sample.name}: world lookup lacks revision`);
    check((entry?.claims || []).length > 0, `${sample.name}: world lookup lacks Wikidata claims`);
}

check(modulesSource.includes("./zhishitupu/worldKnowledge.js"), 'modules.js does not load worldKnowledge.js');
check(modulesSource.includes("./zhishitupu/worldExpansion.js"), 'modules.js does not load worldExpansion.js');
check(modulesSource.includes("./zhishitupu/worldRag.js"), 'modules.js does not load worldRag.js');
check(!modulesSource.includes('vaultGraph.js'), 'modules.js still references the missing vaultGraph.js');

for (const symbol of ['GRAPH_EXPERT_DOMAINS', 'expert-definition', 'expert-mechanism', 'expert-frontier', 'analysis-framework', 'ODataMap 世界前沿知识地图']) {
    check(!graphSource.includes(symbol), `graphData.js still contains fabricated content: ${symbol}`);
}
for (const symbol of ['selectNodeKnowledgeDomain', 'buildExpertQueryPlan', 'queryOpenAlex', 'querySemanticScholar', 'queryCrossref', 'retrieveExternalNodeKnowledge']) {
    check(!retrieverSource.includes(symbol), `zhishitupu.js still contains the old live/AI retrieval path: ${symbol}`);
}
check(retrieverSource.includes('searchWorldKnowledge'), 'ZSTP.searchWorldKnowledge is missing');
check(retrieverSource.includes("mode: 'local-corpus'"), 'retrieval mode is not local-corpus');
check(retrieverSource.includes('world-rag'), 'retriever version marker is missing');

for (const symbol of ['zstp-world-qid', '维基百科正文采用', 'Wikipedia revision', 'Wikidata 实体页', '实体已确认']) {
    check(!retrieverSource.includes(symbol), `forbidden UI source text remains: ${symbol}`);
}

for (const symbol of ['BM25_K1', 'MMR_LAMBDA', 'findSeeds', 'neighborTerms', 'prfTerms', 'citation']) {
    check(ragSource.includes(symbol), `local retriever is missing capability: ${symbol}`);
}

check(agentSource.includes('shouldRetrieveWorldKnowledge'), 'Agentmaster does not auto-retrieve world knowledge');
check(agentSource.includes('requireEvidence'), 'Agentmaster retrieval does not enforce evidence');
check(agentSource.includes('citationId'), 'Agentmaster retrieval context does not expose citation ids');
check(agentSource.includes("ensureCipherModule('zhishitupu')"), 'Agentmaster does not load the graph module on demand');
check(!agentSource.includes('liveExternal'), 'Agentmaster still exposes the old live-external flag');

const rag = createWorldRag(store);
const stats = rag.stats();
check(stats.chunks > 0 && stats.terms > 0, 'local index did not build');
let retrievalChecks = 0;
for (const node of entityNodes.slice(0, 5)) {
    const result = rag.search(node.name, { topK: 6 });
    retrievalChecks += 1;
    check(result.matches.length > 0, `${node.name}: no retrieval matches`);
    check(result.matches.every(match => match.citation?.url && match.citation?.revision), `${node.name}: match citation is incomplete`);
    check(result.matches.every(match => match.text && match.snippet), `${node.name}: match lacks verbatim text or snippet`);
}

const englishNode = entityNodes.find(node => node.nameEn && node.nameEn !== node.name);
if (englishNode) {
    const result = rag.search(englishNode.nameEn, { topK: 6 });
    retrievalChecks += 1;
    check(
        result.seeds.some(seed => seed.id === (englishNode.worldId || englishNode.qid) || (seed.qid && seed.qid === englishNode.qid)),
        `${englishNode.nameEn}: cross-lingual entity linking failed`
    );
}

// The same DOM-independent API Agentmaster uses when the graph view has never
// been opened. It must retrieve without any 3D graph or DOM initialization.
(async () => {
    vm.runInContext(ragSource, context);
    vm.runInContext(retrieverSource, context);
    const staticZstp = context.ZSTP;
    check(Boolean(staticZstp && typeof staticZstp.retrieveKnowledge === 'function'), 'DOM-independent ZSTP retrieval API is missing');
    if (sample && staticZstp?.retrieveKnowledge) {
        const staticResult = await staticZstp.retrieveKnowledge({ nodeName: sample.name, query: `${sample.name} 是什么`, topK: 4 });
        retrievalChecks += 1;
        check(staticResult.mode === 'local-corpus', 'static ZSTP retrieval is not local-corpus');
        check(staticResult.localRecords?.length > 0, 'static ZSTP retrieval returned no records');
        check(staticResult.localRecords?.every(record => record.citation?.url && record.citation?.revision), 'static ZSTP records lack citation provenance');
    }

    if (failures.length) {
        console.error(`Knowledge graph audit failed (${failures.length}):\n${failures.slice(0, 80).join('\n')}`);
        process.exit(1);
    }

    console.log(JSON.stringify({
        status: 'pass',
        graphMode: 'builtin-world-knowledge',
        roots: topRoots.map(node => node.name),
        nodes: entityNodes.length,
        categories: categoryNodes.length,
        links: {
            total: graph.links.length,
            hierarchy: graph.links.filter(link => link.__hierarchy !== false).length,
            cross: graph.links.filter(link => link.__hierarchy === false).length
        },
        corpus: stats,
        retrievalChecks,
        agentmaster: {
            autoRetrieval: true,
            citationIds: true,
            localOnly: !agentSource.includes('liveExternal')
        },
        source: store?.meta?.sourcePage || null
    }, null, 2));
})().catch(error => {
    console.error(error.stack || error.message);
    process.exit(1);
});
