/* Provenance audit for the generated world knowledge layer.
 *
 * Verifies that every node is a real Wikipedia/Wikidata entity, every document
 * carries a revision and canonical URL, every character is verbatim article
 * prose, and the local retriever can find the node from its own name and its
 * English label without any network access.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { createWorldRag } = require('./worldRag.js');

const directory = __dirname;
const dataPath = path.join(directory, 'worldKnowledge.js');
const minNodes = Math.max(1, Number(process.env.WG_AUDIT_MIN_NODES) || 100);
const failures = [];

function check(condition, message) {
    if (!condition) failures.push(message);
}

if (!fs.existsSync(dataPath)) {
    console.error('worldKnowledge.js is missing; run node compileWorldGraph.js');
    process.exit(1);
}

const source = fs.readFileSync(dataPath, 'utf8');
const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const graph = context.window.WORLD_KNOWLEDGE_GRAPH;

check(Boolean(graph), 'worldKnowledge.js does not define window.WORLD_KNOWLEDGE_GRAPH');
if (!graph) {
    console.error(failures.join('\n'));
    process.exit(1);
}

const corpusPath = path.join(directory, 'worldCorpus.bin');
check(fs.existsSync(corpusPath), 'worldCorpus.bin is missing; run node compileWorldGraph.js');
if (fs.existsSync(corpusPath)) {
    const corpus = JSON.parse(zlib.gunzipSync(fs.readFileSync(corpusPath)).toString('utf8'));
    graph.documents = corpus.documents || {};
    check(Boolean(graph.meta?.corpus?.bytes), 'meta.corpus.bytes is missing');
}

const nodes = graph.nodes || [];
const edges = graph.edges || [];
const documents = graph.documents || {};
const entityNodes = nodes.filter(node => node.kind !== 'category');
const categoryNodes = nodes.filter(node => node.kind === 'category');
const nodeIds = new Set(nodes.map(node => node.id));

check(graph.meta?.schemaVersion === 'world-graph-v2', 'unexpected schema version');
check(entityNodes.length >= minNodes, `entity node count ${entityNodes.length} is below ${minNodes}`);
check(categoryNodes.length >= 80, `category count ${categoryNodes.length} is below 80`);
const combinedNames = entityNodes.filter(node => /[\u4e00-\u9fff]/.test(node.name) && /[A-Za-z]/.test(node.name) && node.name.includes(' ')).length;
check(combinedNames >= entityNodes.length * 0.9, `only ${combinedNames}/${entityNodes.length} entity names use 中文 English format`);
for (const category of categoryNodes) {
    check(/[\u4e00-\u9fff]/.test(category.name) && /[A-Za-z]/.test(category.name), `${category.name}: category name is not 中文 English`);
}
check(graph.meta?.license === 'CC BY-SA 4.0', 'Wikipedia license attribution is missing');
check(Boolean(graph.meta?.sourcePage?.revision), 'source page revision is missing');
check(Boolean(graph.meta?.sourcePage?.url), 'source page URL is missing');

let documentCount = 0;
let charCount = 0;
const markupResidue = /\[\[|\{\{|\}\}|<ref|<\/ref>|File:|Image:|Category:|^==[^=]+==$/m;
const seenQids = new Set();
for (const node of entityNodes) {
    check(Boolean(node.qid && /^Q\d+$/.test(node.qid)), `${node.name}: invalid Wikidata QID`);
    if (node.qid) {
        check(!seenQids.has(node.qid), `duplicate QID ${node.qid}`);
        seenQids.add(node.qid);
    }
    check(Boolean(node.name), `${node.id}: missing entity label`);
    check(Boolean(node.description), `${node.id}: missing Wikidata description`);
    const wiki = node.wiki || {};
    check(Boolean(wiki.zh?.url || wiki.en?.url), `${node.name}: no Wikipedia article`);
    for (const [language, meta] of Object.entries(wiki)) {
        check(Boolean(meta.url && meta.revision), `${node.name}/${language}: missing URL or revision`);
        check(String(meta.url).includes('wikipedia.org/wiki/'), `${node.name}/${language}: URL is not a Wikipedia article URL`);
    }
    const languageDocs = documents[node.id] || {};
    let nodeDocs = 0;
    for (const [language, docs] of Object.entries(languageDocs)) {
        check(Boolean(wiki[language]?.url), `${node.name}/${language}: documents without article metadata`);
        for (const doc of docs) {
            nodeDocs += 1;
            documentCount += 1;
            charCount += String(doc.text || '').length;
            check(String(doc.text || '').length >= 80, `${node.name}/${language}: document too short`);
            check(!markupResidue.test(doc.text || ''), `${node.name}/${language}: wiki markup residue`);
        }
    }
    check(nodeDocs > 0, `${node.name}: no verbatim documents`);
    for (const claim of node.claims || []) {
        check(Boolean(claim.property && /^P\d+$/.test(claim.property)), `${node.name}: invalid claim property`);
        for (const value of claim.values || []) {
            check(Boolean(value.id && value.label), `${node.name}/${claim.property}: incomplete claim value`);
        }
    }
}

check(documentCount === graph.meta?.chunkCount, `document count ${documentCount} != meta.chunkCount ${graph.meta?.chunkCount}`);
check(charCount === graph.meta?.charCount, `character count ${charCount} != meta.charCount ${graph.meta?.charCount}`);
check(graph.meta?.charCount > entityNodes.length * 500, 'corpus is too shallow per entity');

for (const required of ['Quantum mechanics', 'Artificial intelligence', 'World War II', 'CRISPR', 'Lithium-ion battery']) {
    const found = entityNodes.some(node =>
        [node.name, node.nameEn].filter(Boolean).some(value => value.toLowerCase() === required.toLowerCase())
    );
    check(found, `core topic missing from the built graph: ${required}`);
}

let danglingEdges = 0;
let hierarchyEdges = 0;
let crossEdges = 0;
for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) danglingEdges += 1;
    if (edge.type === 'section_contains') hierarchyEdges += 1;
    else crossEdges += 1;
}
check(danglingEdges === 0, `${danglingEdges} edges point outside the graph`);
check(hierarchyEdges >= entityNodes.length, 'not every entity has a real section path');
check(crossEdges > 0, 'no Wikidata/hyperlink cross-relations were generated');

const rag = createWorldRag(graph);
const stats = rag.stats();
check(stats.chunks === documentCount, 'local index does not cover every document');
check(stats.terms > 1000, 'local index term count is implausibly low');

let retrievalChecks = 0;
const queryNodes = [...entityNodes]
    .sort((left, right) => {
        const leftDocs = Object.values(documents[left.id] || {}).reduce((sum, docs) => sum + docs.length, 0);
        const rightDocs = Object.values(documents[right.id] || {}).reduce((sum, docs) => sum + docs.length, 0);
        return rightDocs - leftDocs;
    })
    .slice(0, 5);
for (const node of queryNodes) {
    const result = rag.search(node.name, { topK: 5 });
    retrievalChecks += 1;
    check(result.matches.length > 0, `${node.name}: local retrieval returned nothing`);
    check(result.matches.some(match => match.nodeId === node.id), `${node.name}: own name did not retrieve its documents`);
    for (const match of result.matches) {
        const docs = documents[match.nodeId]?.[match.lang] || [];
        check(docs.some(doc => doc.text === match.text), `${match.chunkId}: retrieved text is not verbatim source text`);
        check(Boolean(match.citation?.url && match.citation?.revision), `${match.chunkId}: citation lacks URL or revision`);
    }
}

const bilingual = entityNodes.filter(node => node.nameEn && node.nameEn !== node.name).slice(0, 3);
for (const node of bilingual) {
    const result = rag.search(node.nameEn, { topK: 5 });
    retrievalChecks += 1;
    check(result.seeds.some(seed => seed.id === node.id), `${node.nameEn}: English label did not link to ${node.qid}`);
}

const legacySymbols = [
    ['GRAPH_NODE_EVIDENCE_CORPUS', 'legacy generated paper corpus global'],
    ['GRAPH_NODE_WORLD_KNOWLEDGE', 'legacy generated world knowledge global'],
    ['GRAPH_EXPERT_DOMAINS', 'fabricated expert domain taxonomy'],
    ['expert-definition', 'fabricated expert definition record'],
    ['analysis-framework', 'analysis framework records'],
    ['ODataMap', 'hand-authored ODataMap taxonomy']
];
for (const [symbol, label] of legacySymbols) {
    const hit = ['worldKnowledge.js', 'graphData.js', 'zhishitupu.js', 'worldRag.js']
        .find(file => fs.readFileSync(path.join(directory, file), 'utf8').includes(symbol));
    check(!hit, `${label} still present in ${hit || 'module'}`);
}

if (failures.length) {
    console.error(`World knowledge audit failed (${failures.length}):\n${failures.slice(0, 80).join('\n')}`);
    process.exit(1);
}

console.log(JSON.stringify({
    status: 'pass',
    source: graph.meta.sourcePage,
    license: graph.meta.license,
    entities: entityNodes.length,
    categories: categoryNodes.length,
    edges: { total: edges.length, hierarchy: hierarchyEdges, cross: crossEdges },
    corpus: {
        documents: documentCount,
        chars: charCount,
        languages: graph.meta.languages,
        avgCharsPerDocument: Math.round(charCount / Math.max(1, documentCount))
    },
    index: stats,
    retrievalChecks,
    builtAt: graph.meta.builtAt
}, null, 2));
