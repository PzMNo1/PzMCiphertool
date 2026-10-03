const fs = require('fs');
const path = require('path');
const vm = require('vm');

const graphDataPath = path.join(__dirname, 'graphData.js');
const source = fs.readFileSync(graphDataPath, 'utf8');
const retrieverSource = fs.readFileSync(path.join(__dirname, 'zhishitupu.js'), 'utf8');
const agentMasterSource = fs.readFileSync(path.join(__dirname, '..', 'agentmaster', 'agentmaster.js'), 'utf8');
const corpusSource = fs.readFileSync(path.join(__dirname, 'nodeKnowledgeCorpus.js'), 'utf8');
const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(`${corpusSource}\n${source}\nthis.__getGraphTree = getGraphTree; this.__buildGraphData = buildGraphData;`, context);

const theme = new Proxy({}, { get: () => 0xffffff });
const graph = context.__buildGraphData(context.__getGraphTree(theme), theme);
const requiredFacets = ['definition', 'mechanism', 'evidence', 'frontier', 'retrieval'];
const failures = [];
const corpusEntries = Object.values(context.GRAPH_NODE_EVIDENCE_CORPUS || {});

if (corpusEntries.length !== graph.nodes.length) failures.push(`compiled corpus coverage mismatch: ${corpusEntries.length}/${graph.nodes.length}`);
const claimableCorpusNodes = corpusEntries.filter(item => item.entity || item.works?.some(work => work.abstract));
const bibliographicCorpusNodes = corpusEntries.filter(item => item.works?.length && !item.entity && !item.works.some(work => work.abstract));
const unmatchedCorpusNodes = corpusEntries.filter(item => item.status === 'no-authoritative-match');
const lowConfidenceCrossref = corpusEntries.flatMap(item => item.works || []).filter(work => work.source === 'Crossref' && Number(work.confidence || 0) < 0.55);
if (lowConfidenceCrossref.length) failures.push(`low-confidence Crossref records remain: ${lowConfidenceCrossref.length}`);
if (corpusEntries.some(item => item.status === 'source-error')) failures.push('compiled corpus contains unresolved source errors');

for (const node of graph.nodes) {
    const records = node.knowledgeBase || [];
    const facets = new Set(records.map(record => record.quality?.facet).filter(Boolean));
    const missing = requiredFacets.filter(facet => !facets.has(facet));
    if (missing.length) failures.push(`${node.name}: missing facets ${missing.join(', ')}`);
    for (const record of records) {
        if (!record.id || !record.title || !record.content) failures.push(`${node.name}: incomplete record`);
        if (record.quality?.facet && (record.content || '').length < 120) failures.push(`${node.name}/${record.id}: expert facet is too shallow`);
        if (record.evidenceLevel === 'abstract-supported' && !record.citation) failures.push(`${node.name}/${record.id}: abstract evidence lacks citation`);
        if (record.evidenceLevel === 'bibliographic-only' && (!record.citation?.identifier || !record.url)) failures.push(`${node.name}/${record.id}: bibliographic evidence lacks provenance`);
        if (record.id === 'expert-review-required' && !record.content.includes('禁止')) failures.push(`${node.name}: unverified record lacks generation guard`);
    }
}

if (graph.nodes.some(node => node.kind === 'knowledge-detail')) {
    failures.push('legacy generated knowledge-detail nodes still exist');
}

const routingCases = new Map([
    ['量子信息 Quantum Information', '量子科学、材料与微纳器件'],
    ['CRISPR基因编辑 CRISPR Gene Editing', '生命科学、生物工程与精准医学'],
    ['长时储能 Long-Duration Energy Storage', '能源、气候与地球系统'],
    ['企业知识图谱 Enterprise Knowledge Graph', '知识图谱、数据基础设施与RAG'],
]);
for (const [name, expected] of routingCases) {
    const node = graph.nodes.find(item => item.name === name);
    const definition = node?.knowledgeBase?.find(record => record.quality?.facet === 'definition');
    if (!definition?.content.includes(`学科框架: ${expected}`)) failures.push(`${name}: expected domain ${expected}`);
}

const expertNodeCases = [
    { match: /量子信息 Quantum Information/, terms: ['哈密顿量', '量子相干', '退相干'] },
    { match: /CRISPR基因编辑 CRISPR Gene Editing/, terms: ['基因型-表型映射', '脱靶效应', '临床终点'] },
    { match: /长时储能 Long-Duration Energy Storage/, terms: ['平准化成本', '往返效率', '全生命周期评价'] },
    { match: /知识图谱推理 Knowledge Graph Reasoning/, terms: ['本体工程', '实体消歧', '混合检索'] },
    { match: /半导体/, terms: ['良率', '失效模式与影响分析', '可制造性设计'] },
    { match: /暗物质/, terms: ['引力透镜', '贝叶斯模型比较', '系统误差'] },
    { match: /治理/, terms: ['因果识别', '分配效应', '社会技术系统'] },
];
for (const testCase of expertNodeCases) {
    const node = graph.nodes.find(item => testCase.match.test(item.name));
    if (!node) {
        failures.push(`expert audit node missing: ${testCase.match}`);
        continue;
    }
    const corpus = node.knowledgeBase.map(record => record.content).join('\n');
    const missingTerms = testCase.terms.filter(term => !corpus.includes(term));
    if (missingTerms.length) failures.push(`${node.name}: missing professional terms ${missingTerms.join(', ')}`);
}

const prohibitedShallowPhrases = ['这个节点是什么', '为什么重要？', '默认知识图谱节点，可用于模型解释与检索增强'];
for (const phrase of prohibitedShallowPhrases) {
    if (graph.nodes.some(node => node.knowledgeBase.some(record => record.content.includes(phrase)))) {
        failures.push(`shallow placeholder remains: ${phrase}`);
    }
}

const ragCapabilities = new Map([
    ['multi-intent query planning', 'buildExpertQueryPlan'],
    ['graph-aware local context', 'getNodeGraphContext'],
    ['lexical hybrid scoring', 'lexicalKnowledgeScore'],
    ['authority/recency/citation scoring', 'evidenceQualityScore'],
    ['MMR diversity reranking', 'jaccardKnowledgeSimilarity'],
    ['reciprocal rank fusion', 'reciprocalRankFuse'],
    ['evidence usability boundary', 'classifyEvidenceUsability'],
    ['structured citations', 'buildCitation'],
    ['claim-level evidence graph', 'buildNodeEvidenceGraph'],
    ['claim extraction boundary', 'extractClaimCandidate'],
    ['graph-neighbor knowledge expansion', 'graph-neighbor-knowledge'],
    ['OpenAlex abstract reconstruction', 'decodeOpenAlexAbstract'],
    ['Crossref DOI metadata routing', 'queryCrossref'],
    ['biomedical source routing', 'queryEuropePmc'],
    ['entity source routing', 'queryWikidata'],
    ['retrieval cache', 'KNOWLEDGE_CACHE_TTL_MS'],
    ['browser runtime audit', 'auditRuntime'],
]);
for (const [capability, symbol] of ragCapabilities) {
    if (!retrieverSource.includes(symbol)) failures.push(`RAG capability missing: ${capability}`);
}

const speedGuards = [
    [retrieverSource.includes('liveExternal = false'), 'default retrieval is not local-only'],
    [retrieverSource.includes("mode: liveExternal === true ? 'local-plus-fast-live' : 'local-only'"), 'retrieval mode is not observable'],
    [retrieverSource.includes('new Promise(resolve => setTimeout(() => resolve([]), 2000))'), 'fast-live total timeout is missing'],
    [/runKnowledgeGraphRag[\s\S]{0,600}executeKnowledgeGraphRetrieve\(\{ query: userText, topK: 8, liveExternal: false \}\)/.test(agentMasterSource), 'Agentmaster does not directly use local retrieval'],
    [!/runKnowledgeGraphRag[\s\S]{0,600}requestKnowledgeGraphToolCalls/.test(agentMasterSource), 'Agentmaster still performs a model tool-selection round trip'],
    [agentMasterSource.includes('compactKnowledgeGraphResult'), 'Agentmaster retrieval context is not compacted'],
];
speedGuards.forEach(([passed, message]) => { if (!passed) failures.push(`speed guard failed: ${message}`); });

if (failures.length) {
    console.error(`Knowledge graph audit failed (${failures.length}):\n${failures.slice(0, 50).join('\n')}`);
    process.exit(1);
}

console.log(JSON.stringify({
    status: 'pass',
    realNodes: graph.nodes.length,
    links: graph.links.length,
    expertRecords: graph.nodes.reduce((sum, node) => sum + node.knowledgeBase.length, 0),
    corpus: {
        compiledNodes: corpusEntries.length,
        claimableNodes: claimableCorpusNodes.length,
        bibliographicOnlyNodes: bibliographicCorpusNodes.length,
        noAuthoritativeMatchNodes: unmatchedCorpusNodes.length,
        lowConfidenceCrossrefRecords: lowConfidenceCrossref.length
    },
    requiredFacets,
    ragCapabilities: [...ragCapabilities.keys()],
    legacyDetailNodes: 0,
    speedPath: 'local retrieval + one answer-model request; no live API by default',
}, null, 2));
