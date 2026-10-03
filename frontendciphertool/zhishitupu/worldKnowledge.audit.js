// 世界知识层审计。
// 两段：
//   1. 用合成数据自检 graphData.js 的记录构建逻辑（不依赖网络，也不想依赖已编译产物）
//   2. 如果 worldKnowledge.js 存在，就校验真实产物的覆盖率与一致性
// 运行：node worldKnowledge.audit.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const directory = __dirname;
const graphSource = fs.readFileSync(path.join(directory, 'graphData.js'), 'utf8');
const worldPath = path.join(directory, 'worldKnowledge.js');
const worldSource = fs.existsSync(worldPath) ? fs.readFileSync(worldPath, 'utf8') : '';

const failures = [];

function check(condition, message) {
    if (!condition) failures.push(message);
}

function loadGraph(worldStore) {
    const context = { console };
    context.window = context;
    context.window.GRAPH_NODE_WORLD_KNOWLEDGE = worldStore;
    vm.createContext(context);
    vm.runInContext(`${graphSource}\nthis.__getGraphTree=getGraphTree;this.__buildGraphData=buildGraphData;`, context);
    const theme = new Proxy({}, { get: () => 0xffffff });
    return context.__buildGraphData(context.__getGraphTree(theme), theme);
}

// ---------------------------------------------------------------- 1. 合成数据自检

const synthetic = {
    '逻辑量子比特 Logical Qubits': {
        nodeName: '逻辑量子比特 Logical Qubits',
        resolvedAt: '2026-01-01T00:00:00.000Z',
        query: { zh: '逻辑量子比特', en: 'Logical Qubits' },
        matchMode: 'wikidata',
        status: 'entity-confirmed',
        score: 1,
        crossScore: 1,
        matchedBy: { query: '逻辑量子比特', language: 'zh', matchType: 'label' },
        rejectedEntity: { id: 'Q999', label: '无关条目', score: 0.4 },
        entityDetail: {
            id: 'Q1234567',
            uri: 'http://www.wikidata.org/entity/Q1234567',
            label: { zh: '逻辑量子比特', en: 'logical qubit' },
            description: { zh: '量子计算中经过纠错编码的量子比特', en: 'error-corrected qubit' },
            aliases: ['逻辑比特', 'logical qubit'],
            sitelinks: { zh: '逻辑量子比特', en: 'Logical qubit' },
            wikipedia: {
                site: 'zh.wikipedia.org',
                language: 'zh',
                title: '逻辑量子比特',
                url: 'https://zh.wikipedia.org/wiki/%E9%80%BB%E8%BE%91%E9%87%8F%E5%AD%90%E6%AF%94%E7%89%B9',
                extract: '逻辑量子比特是由多个物理量子比特通过量子纠错编码构成的、对外表现为单个量子比特自由度的复合系统。',
                revision: '2026-01-01T00:00:00Z'
            }
        },
        claims: [
            { property: 'P31', label: { zh: '隶属于', en: 'instance of' }, values: [{ kind: 'entity', id: 'Q2122243', label: '量子信息', display: '量子信息 (Q2122243)' }] },
            { property: 'P571', label: { zh: '成立时间', en: 'inception' }, values: [{ kind: 'time', value: '+1995-00-00T00:00:00Z', display: '1995' }] }
        ],
        article: null
    },
    '量子LDPC码 Quantum LDPC Codes': {
        nodeName: '量子LDPC码 Quantum LDPC Codes',
        resolvedAt: '2026-01-01T00:00:00.000Z',
        query: { zh: '量子LDPC码', en: 'Quantum LDPC Codes' },
        matchMode: 'wikipedia',
        status: 'article-confirmed',
        score: 0.95,
        crossScore: 0,
        matchedBy: { query: 'Quantum LDPC code', language: 'en', matchType: 'title' },
        entityDetail: null,
        claims: [],
        rejectedEntity: null,
        article: {
            site: 'en.wikipedia.org',
            language: 'en',
            title: 'Quantum LDPC code',
            url: 'https://en.wikipedia.org/wiki/Quantum_LDPC_code',
            description: 'class of quantum error correcting codes',
            extract: 'Quantum low-density parity-check codes are a family of quantum error correcting codes defined on sparse graphs.',
            excerptFromSearch: false,
            revision: '2026-01-01T00:00:00Z',
            score: 0.95,
            matchedQuery: 'Quantum LDPC code'
        }
    },
    'ODataMap 世界前沿知识地图': {
        nodeName: 'ODataMap 世界前沿知识地图',
        resolvedAt: '2026-01-01T00:00:00.000Z',
        query: { zh: '世界前沿知识地图', en: 'ODataMap' },
        matchMode: 'none',
        status: 'no-authoritative-match',
        score: 0.37,
        crossScore: 0,
        matchedBy: null,
        entityDetail: null,
        claims: [],
        article: null,
        runnersUp: [{ id: 'Q1', label: '无关条目', score: 0.37 }]
    }
};

const syntheticGraph = loadGraph(synthetic);
const byName = new Map(syntheticGraph.nodes.map(node => [node.name, node]));

const entityNode = byName.get('逻辑量子比特 Logical Qubits');
check(Boolean(entityNode), '合成用例：实体节点未生成');
const entityRecords = (entityNode?.knowledgeBase || []).filter(record => String(record.id).startsWith('world-'));
check(entityRecords.length === 2, `合成用例：实体节点应有 2 条世界知识记录，实际 ${entityRecords.length}`);
const entityRecord = entityRecords.find(record => record.id.startsWith('world-entity-'));
check(Boolean(entityRecord), '合成用例：缺少规范实体记录');
check((entityRecord?.content || '').includes('Q1234567'), '合成用例：实体记录缺少 QID');
check((entityRecord?.content || '').includes('量子信息 (Q2122243)'), '合成用例：关系声明未使用可读标签');
check((entityRecord?.content || '').includes('1995'), '合成用例：时间型声明未格式化');
check((entityRecord?.content || '').includes('被拒绝的候选'), '合成用例：未记录被拒绝的候选');
check(entityRecord?.url === 'http://www.wikidata.org/entity/Q1234567', '合成用例：实体记录缺少来源链接');
check(entityRecord?.evidenceLevel === 'curated-entity', '合成用例：实体记录证据等级异常');
const proseRecord = entityRecords.find(record => record.id === 'world-encyclopedia');
check((proseRecord?.content || '').includes('CC BY-SA'), '合成用例：百科记录缺少许可说明');
check(proseRecord?.url?.includes('wikipedia.org'), '合成用例：百科记录缺少条目链接');

const articleNode = byName.get('量子LDPC码 Quantum LDPC Codes');
const articleRecords = (articleNode?.knowledgeBase || []).filter(record => String(record.id).startsWith('world-'));
check(articleRecords.length === 1, `合成用例：条目节点应有 1 条世界知识记录，实际 ${articleRecords.length}`);
check((articleRecords[0]?.content || '').includes('Quantum LDPC code'), '合成用例：条目记录缺少条目名');

const noneNode = byName.get('ODataMap 世界前沿知识地图');
const noneRecords = (noneNode?.knowledgeBase || []).filter(record => String(record.id).startsWith('world-'));
check(noneRecords.length === 1 && noneRecords[0].id === 'world-no-match', '合成用例：未匹配节点应生成 world-no-match 记录');
check((noneRecords[0]?.content || '').includes('0.37'), '合成用例：未匹配记录应写明最高候选分数');

// 世界知识记录不能带 quality.facet，否则会被 knowledgeGraph.audit.js 的“专家 facet 不得少于 120 字”
// 规则误判（那条规则是给专家模板用的）
syntheticGraph.nodes.forEach(node => {
    (node.knowledgeBase || []).filter(record => String(record.id).startsWith('world-')).forEach(record => {
        check(!record.quality || !record.quality.facet, `合成用例：${node.name} 的世界知识记录不应带 quality.facet`);
        check(Boolean(record.id && record.title && record.content), `合成用例：${node.name} 的世界知识记录不完整`);
    });
});

// 没有世界知识数据时（例如用户还没跑编译器），不能报错，也不能凭空造记录
const emptyGraph = loadGraph(null);
emptyGraph.nodes.forEach(node => {
    const records = (node.knowledgeBase || []).filter(record => String(record.id).startsWith('world-'));
    check(records.length === 0, `空数据用例：${node.name} 不应生成世界知识记录`);
});

// ---------------------------------------------------------------- 2. 真实产物校验

let compiled = null;
if (worldSource) {
    const context = { console };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(worldSource, context);
    compiled = context.window.GRAPH_NODE_WORLD_KNOWLEDGE || null;
    check(Boolean(compiled), 'worldKnowledge.js 未定义 window.GRAPH_NODE_WORLD_KNOWLEDGE');
}

if (!compiled) {
    if (failures.length) {
        console.error(`World knowledge audit failed (${failures.length}):\n${failures.slice(0, 30).join('\n')}`);
        process.exit(1);
    }
    console.log(JSON.stringify({
        status: 'skipped',
        reason: 'worldKnowledge.js 不存在，只完成了合成数据自检',
        syntheticCases: Object.keys(synthetic).length,
        hint: '运行 node compileWorldKnowledge.js 生成世界知识层后重新审计'
    }, null, 2));
    process.exit(0);
}

const entries = Object.values(compiled);
const graph = loadGraph(compiled);
const nodeNames = new Set(graph.nodes.map(node => node.name));
const entryNames = Object.keys(compiled);

const missingNodes = [...nodeNames].filter(name => !compiled[name]);
const orphanEntries = entryNames.filter(name => !nodeNames.has(name));
check(orphanEntries.length === 0, `worldKnowledge.js 有 ${orphanEntries.length} 个节点名不在图谱里: ${orphanEntries.slice(0, 5).join(', ')}`);

const sourceErrors = entries.filter(item => item.status === 'source-error');
check(sourceErrors.length === 0, `世界知识层有 ${sourceErrors.length} 个来源失败节点: ${sourceErrors.slice(0, 5).map(item => item.nodeName).join(', ')}`);

const withEntity = entries.filter(item => item.matchMode === 'wikidata');
const withArticle = entries.filter(item => item.matchMode === 'wikipedia');
const withProse = entries.filter(item => ((item.entityDetail?.wikipedia?.extract || item.article?.extract || '').length > 150));
// 覆盖率按“图谱节点”算，而不是按条目算：分层跑（--bulk-only）时允许部分节点还没有条目
const matchedNodes = graph.nodes.filter(node => compiled[node.name] && compiled[node.name].matchMode !== 'none').length;
const coverage = matchedNodes / Math.max(1, graph.nodes.length);
// 地板值：批量层（SPARQL）大约能覆盖一半节点，低于这个数说明批量层没生效
const coverageFloor = Number(process.env.WK_COVERAGE_FLOOR) || 0.3;

check(orphanEntries.length === 0, `worldKnowledge.js 有 ${orphanEntries.length} 个节点名不在图谱里: ${orphanEntries.slice(0, 5).join(', ')}`);
check(coverage >= coverageFloor, `世界知识覆盖率过低: ${(coverage * 100).toFixed(1)}%（地板 ${(coverageFloor * 100).toFixed(0)}%）`);

const graphNodeWithWorld = graph.nodes.filter(node => (node.knowledgeBase || []).some(record => String(record.id).startsWith('world-')));
// 有世界知识条目的节点必须都能在面板上看到记录；没有条目的节点允许展示“尚未编译”
const matchedButNoRecord = graph.nodes.filter(node => compiled[node.name] && !(node.knowledgeBase || []).some(record => String(record.id).startsWith('world-')));
check(matchedButNoRecord.length === 0, `有 ${matchedButNoRecord.length} 个节点已有世界知识条目但没挂上记录: ${matchedButNoRecord.slice(0, 5).map(node => node.name).join(', ')}`);

const badRecords = [];
graph.nodes.forEach(node => {
    (node.knowledgeBase || []).filter(record => String(record.id).startsWith('world-')).forEach(record => {
        if (!record.id || !record.title || !record.content) badRecords.push(`${node.name}: 记录不完整`);
        if (record.evidenceLevel === 'curated-entity' && !record.citation?.identifier) badRecords.push(`${node.name}: 实体记录缺少标识符`);
        if (record.evidenceLevel === 'encyclopedia' && !record.url) badRecords.push(`${node.name}: 百科记录缺少链接`);
    });
});
check(badRecords.length === 0, `世界知识记录存在缺陷: ${badRecords.slice(0, 5).join('; ')}`);

if (failures.length) {
    console.error(`World knowledge audit failed (${failures.length}):\n${failures.slice(0, 30).join('\n')}`);
    process.exit(1);
}

console.log(JSON.stringify({
    status: 'pass',
    syntheticCases: Object.keys(synthetic).length,
    coverage: {
        total: entries.length,
        graphNodes: graph.nodes.length,
        nodesWithEntry: entries.length,
        nodesMissingEntry: graph.nodes.length - entries.length,
        entity: withEntity.length,
        entityConfirmed: entries.filter(item => item.status === 'entity-confirmed').length,
        entityCandidate: entries.filter(item => item.status === 'entity-candidate').length,
        article: withArticle.length,
        articleConfirmed: entries.filter(item => item.status === 'article-confirmed').length,
        noMatch: entries.filter(item => item.status === 'no-authoritative-match').length,
        coveragePercent: Number((coverage * 100).toFixed(1)),
        coverageFloorPercent: Number((coverageFloor * 100).toFixed(0)),
        withProseExtract: withProse.length,
        claimStatements: entries.reduce((sum, item) => sum + (item.claims || []).length, 0)
    },
    nodesMissingEntry: missingNodes.length,
    graphNodesWithWorldRecords: graphNodeWithWorld.length
}, null, 2));
