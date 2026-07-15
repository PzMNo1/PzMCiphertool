const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const ROOT = path.resolve(__dirname, '../..');
const sandbox = {
    window: {},
    console,
    Date,
    JSON,
    Math,
    URL,
    setTimeout,
    clearTimeout
};
sandbox.window = sandbox;

[
    'frontendciphertool/model/agent/CitationNormalizer.js',
    'frontendciphertool/model/AgentRuntime.js'
].forEach(file => {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, {
        filename: file
    });
});

const runtime = new sandbox.AgentRuntime({ client: {}, registry: {}, ui: {} });

const summary = runtime.normalizeFinalAnswerText([
    '# 每日新闻',
    '## 📌 一句话速读（更多故事）',
    '43. 普通一句话出现在正文里不应该被改写。',
    '**一句话总结：** 市场继续分化。'
].join('\n'));

assert(summary.includes('## 总结'), 'heading containing 一句话 should become 总结');
assert(summary.includes('43. 普通一句话出现在正文里不应该被改写。'), 'normal body sentence should not be rewritten');
assert(summary.includes('**总结：** 市场继续分化。'), 'summary label containing 一句话 should become 总结');
assert(!/一句话速读|一句话总结/.test(summary), 'final answer should not keep 一句话 summary labels');

const source = runtime.formatEvidenceSource({
    kind: 'opened_source',
    title: '四大证券报头版头条内容精华摘要_2026年7月10日_财经新闻|上证报_新浪财经_新浪网 内容: 四大证券报头版头条内容精华摘要_2026年7月10日_财经新闻 炒股就看金麒麟分析师研报，权威，专业，及时，全面。',
    url: 'https://finance.sina.com.cn/stock/y/2026-07-10/doc-inihhkuk3977698.shtml',
    content_preview: '内容: 这是一段很长的正文，不应该进入来源列表。'
});

assert(source.startsWith('finance.sina.com.cn — 四大证券报头版头条内容精华摘要_2026年7月10日_财经新闻'), 'source should start with site label and compact title');
assert(source.includes('https://finance.sina.com.cn/stock/y/2026-07-10/doc-inihhkuk3977698.shtml'), 'source should keep URL');
assert(!source.includes('内容:'), 'source should remove long content fragments');
assert(source.length < 220, 'source should remain compact');

const mojibake = runtime.cleanSourceEntryText('��������[2026��7��12��] - CCTIME������ 内容: ������ — http://www.cctime.com/scroll/default.asp');
assert(mojibake === 'cctime.com — http://www.cctime.com/scroll/default.asp', 'mojibake title should fall back to host and URL');

const preservedSnapshot = runtime.citationNormalizer.shouldPreserveRawSourceEntry(
    'CNBC DAILY OPEN: Hormuz Blockade — CNBC Markets section (snapshot)',
    { mode: 'news_brief', researchProfile: 'news_brief' }
);
assert(preservedSnapshot, 'specific tool snapshot source entries should be preserved');

const manySources = Array.from({ length: 25 }, (_, index) => {
    const id = index + 1;
    return `[${id}] news${id}.example.com — Story ${id} — https://news${id}.example.com/story-${id}`;
}).join('\n');
const citedBody = Array.from({ length: 10 }, (_, index) => {
    const id = index + 1;
    return `${id}. Story ${id} happened with a concrete detail. [${id}]`;
}).join('\n');
const manySourceAnswer = `${citedBody}\n\n来源：\n${manySources}`;

const normalizedManySources = runtime.normalizeFinalResearchAnswer(
    manySourceAnswer,
    { mode: 'news_brief', researchProfile: 'news_brief', citationTarget: 24 },
    {
        evidenceLedger: [
            {
                kind: 'opened_source',
                source_id: '1',
                title: 'Story 1',
                url: 'https://news1.example.com/story-1',
                trustLevel: 'high',
                authorityScore: 0.9
            }
        ],
        metrics: {}
    }
);
assert(/\[25\]\s+news25\.example\.com/.test(normalizedManySources), 'evidence-backed rebuild should preserve reliable existing source-section entries beyond cited ids');

const sourceEntryCount = (normalizedManySources.split(/\n/).filter(line => /^\[\d+\]\s+news\d+\.example\.com/.test(line))).length;
assert(sourceEntryCount === 25, `evidence-backed rebuild should keep 25 reliable sources, got ${sourceEntryCount}`);

const normalizedPlainSources = runtime.normalizeSourceSection(
    manySourceAnswer,
    { evidenceLedger: [] },
    { mode: 'news_brief', researchProfile: 'news_brief', citationTarget: 24 }
);
const plainSourceEntryCount = normalizedPlainSources.split(/\n/).filter(line => /^\[\d+\]\s+news\d+\.example\.com/.test(line)).length;
assert(plainSourceEntryCount === 25, `plain source normalization should keep uncited reliable source-section entries, got ${plainSourceEntryCount}`);

console.log('agent_citation_normalizer: ok');
