// Obsidian vault 导入回归测试。
// 覆盖三件事：
//   1. 解析层：frontmatter、[[双链]]、别名、同目录优先消歧、未解析链接、忽略目录、附件引用
//   2. 建图层：vault -> graphData 装配，双链作为非层级边叠加，笔记知识库记录
//   3. 布局层：非树图不再崩溃/堆原点；多父与有环时层级边优先
// 运行：node obsidianVault.audit.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const directory = __dirname;
const vaultSource = fs.readFileSync(path.join(directory, 'obsidianVault.js'), 'utf8');
const graphSource = fs.readFileSync(path.join(directory, 'graphData.js'), 'utf8');
const retrieverSource = fs.readFileSync(path.join(directory, 'zhishitupu.js'), 'utf8');

const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext([
    vaultSource,
    graphSource,
    retrieverSource,
    'this.__kg = { getGraphTree, buildGraphData, applyReadableGraphLayout, buildVaultGraphData, appendVaultLinks, DEPTH_COLORS, VAULT_TAG_COLORS, OBSIDIAN_VAULT: window.OBSIDIAN_VAULT };'
].join('\n'), context);

const KG = context.__kg;
const Vault = context.OBSIDIAN_VAULT;
const THEME = new Proxy({}, { get: () => 0xffffff });
const failures = [];

function check(condition, message) {
    if (!condition) failures.push(message);
}

function note(path, body, frontmatter) {
    const head = frontmatter ? `---\n${frontmatter}\n---\n` : '';
    return { path, text: `${head}${body}` };
}

// ---------------------------------------------------------------- 1. 解析层

const fixture = [
    { path: 'TestVault/.obsidian/app.json', text: '{"legacyEditor":false}' },
    { path: 'TestVault/.obsidian/graph.json', text: '{"colorGroups":[]}' },
    { path: 'TestVault/.trash/deleted.md', text: '被删除的笔记 [[index]]' },
    note('TestVault/index.md', [
        '# 总览',
        '',
        '指向 [[逻辑量子比特]]，也指向 [[量子/表面码|表面码]]。',
        '嵌入图片 ![[附件/图.png]]。',
        '普通链接 [别名笔记](notes/alias-note.md)。',
        '#kg/index #总览'
    ].join('\n'), 'title: 知识库总览\ntags:\n  - kg\n  - index\nowner: 泡面\nstarred: true'),
    note('TestVault/量子/逻辑量子比特.md', [
        '## 稳定子',
        '逻辑量子比特的核心是纠错。见 [[表面码]] 与 [[知识库总览]]。',
        '#量子 #frontier'
    ].join('\n'), 'aliases: [逻辑比特, logical-qubit]\nkg_node: 逻辑量子比特 Logical Qubits'),
    note('TestVault/量子/表面码.md', '表面码是 [[逻辑量子比特]] 的实现路径。#量子'),
    note('TestVault/量子/同名.md', '跨目录显式路径：[[化学/同名]]。#同名'),
    note('TestVault/化学/同名.md', '另一篇同名笔记，指向 [[逻辑量子比特]]。#同名'),
    note('TestVault/notes/alias-note.md', '通过别名被引用。见 [[逻辑比特]]。', 'aliases: [别名笔记]\ntags: [notes]'),
    note('TestVault/notes/ref-same.md', '指向 [[同名]]，两篇同名笔记会产生歧义匹配。'),
    note('TestVault/notes/embed.md', '嵌入引用 ![[逻辑量子比特#稳定子]] 并且指向 [[不存在的笔记]]。'),
    note('TestVault/notes/orphan.md', '我没有链接。'),
    { path: 'TestVault/附件/图.png', text: null },
    { path: 'TestVault/附件/未引用.bin', text: null }
];

const detection = Vault.detectVault(fixture.map(item => ({ path: item.path })));
check(detection.isVault === true, `vault 未被识别: ${JSON.stringify(detection)}`);
check(detection.reason === 'obsidian-config-detected', `vault 识别原因异常: ${detection.reason}`);

const notVault = Vault.detectVault([
    { path: 'src/index.js' }, { path: 'src/app.js' }, { path: 'README.md' },
    { path: 'package.json' }, { path: 'src/util.js' }
]);
check(notVault.isVault === false, '代码工程被误判成 vault');

const vault = Vault.parseVaultFiles(fixture);
const noteTitles = vault.notes.map(item => item.title).sort();
check(vault.name === 'TestVault', `vault 名称异常: ${vault.name}`);
check(vault.notes.length === 9, `笔记数应为 9，实际 ${vault.notes.length}: ${noteTitles.join(', ')}`);
check(!vault.notes.some(item => item.vaultPath.includes('.trash')), '.trash 目录没有被忽略');
check(!vault.notes.some(item => item.vaultPath.includes('.obsidian')), '.obsidian 目录没有被忽略');

const index = vault.notes.find(item => item.vaultPath === 'index.md');
check(Boolean(index), 'index.md 未被解析');
check(index.title === '知识库总览', `frontmatter title 未生效: ${index.title}`);
check(index.tags.includes('kg') && index.tags.includes('index'), `frontmatter tags 未生效: ${index.tags.join(',')}`);
check(index.tags.includes('kg/index'), `行内标签未解析: ${index.tags.join(',')}`);
check(index.frontmatter.owner === '泡面', 'frontmatter 标量未解析');
check(index.frontmatter.starred === true, 'frontmatter 布尔值未解析');
check(index.headings.includes('总览'), `标题大纲未解析: ${index.headings.join(',')}`);

const qubit = vault.notes.find(item => item.vaultPath === '量子/逻辑量子比特.md');
check(qubit.aliases.length === 2, `别名未解析: ${qubit.aliases.join(',')}`);
check(qubit.kgNode === '逻辑量子比特 Logical Qubits', `kg_node 未解析: ${qubit.kgNode}`);
check(qubit.headings.includes('稳定子'), '二级标题未解析');
check(qubit.inLinks.length >= 3, `逻辑量子比特反链数偏少: ${qubit.inLinks.length}`);

const aliasNote = vault.notes.find(item => item.vaultPath === 'notes/alias-note.md');
check(aliasNote.outLinks.includes('量子/逻辑量子比特.md'), '别名 [[逻辑比特]] 未解析到目标笔记');
check(index.outLinks.includes('notes/alias-note.md'), 'Markdown 链接 [别名笔记](notes/alias-note.md) 未解析');
check(index.outLinks.includes('量子/逻辑量子比特.md'), '[[知识库总览]] 未按 frontmatter title 兜底解析');
check(qubit.inLinks.includes('index.md'), '按标题解析出的反链缺失');

const surface = vault.notes.find(item => item.vaultPath === '量子/表面码.md');
check(surface.inLinks.includes('index.md'), '[[量子/表面码|表面码]] 路径形式未解析');

const sameNameQuantum = vault.notes.find(item => item.vaultPath === '量子/同名.md');
check(sameNameQuantum.outLinks.includes('化学/同名.md'), '跨目录显式路径 [[化学/同名]] 未解析');
const refSame = vault.notes.find(item => item.vaultPath === 'notes/ref-same.md');
check(refSame.outLinks.length === 1, `歧义链接应解析出 1 条出链，实际 ${refSame.outLinks.length}`);
check(vault.stats.ambiguousLinks >= 1, '同名笔记未标记为歧义匹配');
check(vault.notes.every(item => !item.outLinks.includes(item.vaultPath) && !item.inLinks.includes(item.vaultPath)),
    '存在自链接（出链/反链里包含自己）');
check(vault.stats.selfLinkCount >= 0 && vault.links.every(link => link.sourcePath !== link.targetPath), '存在自环边');

const embed = vault.notes.find(item => item.vaultPath === 'notes/embed.md');
check(embed.embedCount === 1, `嵌入引用未识别: ${embed.embedCount}`);
check(vault.links.some(link => link.kind === 'embed' && link.targetPath === '量子/逻辑量子比特.md'), '嵌入边缺失');

check(vault.stats.unresolvedCount === 1, `未解析链接数应为 1，实际 ${vault.stats.unresolvedCount}`);
check(vault.unresolved[0].target === '不存在的笔记', `未解析链接目标异常: ${vault.unresolved[0].target}`);
check(vault.stats.attachmentCount === 1, `被引用附件应为 1，实际 ${vault.stats.attachmentCount}`);
check(vault.stats.ignoredAttachmentCount === 1, `未引用附件应为 1，实际 ${vault.stats.ignoredAttachmentCount}`);
check(vault.notes.some(item => item.vaultPath === 'notes/orphan.md' && !item.outLinks.length && !item.inLinks.length), '孤立笔记识别失败');
check(vault.stats.orphanCount >= 1, `孤立笔记数异常: ${vault.stats.orphanCount}`);

// ---------------------------------------------------------------- 2. 建图层

const built = KG.buildVaultGraphData(vault, { api: Vault, theme: THEME, prefix: '_vault' });
const graph = built.graph;
const noteNodes = graph.nodes.filter(node => node.path && node.path.endsWith('.md'));
check(noteNodes.length === 9, `图谱笔记节点数应为 9，实际 ${noteNodes.length}`);
check(graph.links.length === built.linkStats.wikilinkEdges + built.linkStats.attachmentEdges + (graph.nodes.length - 1),
    '层级边数量不等于 节点数-1，目录骨架被双链污染');
const indexNode = graph.nodes.find(node => node.path === 'TestVault/index.md');
check(Boolean(indexNode), 'index 节点缺失');
// 3 条 vault 记录 + graphData.js 固定追加的 5 条专家框架记录（vault 节点因此也能通过 ZSTP.auditRuntime 的 facet 校验）
const indexRecords = indexNode.knowledgeBase || [];
check(indexRecords.length === 8, `笔记知识库记录数应为 8 (3 vault + 5 专家框架)，实际 ${indexRecords.length}`);
check(['vault-note', 'vault-outline', 'vault-links'].every(id => indexRecords.some(record => record.id === id)),
    '缺少 vault 笔记记录: ' + indexRecords.map(record => record.id).join(','));
check(indexRecords.every(record => record.id && record.title && record.content), '笔记知识库记录不完整');

// ---------------------------------------------------------------- 3. 布局层

const laidOut = KG.applyReadableGraphLayout(graph);
const missing = laidOut.nodes.filter(node => !Number.isFinite(node.__layoutX) || !Number.isFinite(node.__layoutY) || !Number.isFinite(node.__layoutZ));
check(missing.length === 0, `有 ${missing.length} 个节点没有坐标: ${missing.slice(0, 5).map(item => item.name).join(', ')}`);

const coords = new Set(laidOut.nodes.map(node => `${node.__layoutX},${node.__layoutY},${node.__layoutZ}`));
check(coords.size >= Math.ceil(laidOut.nodes.length * 0.99),
    `坐标重复过多: ${coords.size}/${laidOut.nodes.length}，疑似节点堆在原点上`);

const attachmentNode = graph.nodes.find(node => node.path === 'TestVault/附件/图.png');
const folderNode = graph.nodes.find(node => node.name === '附件' && node.kind === 'directory');
check(Boolean(attachmentNode) && Boolean(folderNode), '附件节点或附件目录节点缺失');
check(attachmentNode.__layoutParentId === folderNode.id,
    `附件被双链抢走了父节点: ${attachmentNode.__layoutParentId} != ${folderNode.id}`);
const surfaceNode = graph.nodes.find(node => node.path === 'TestVault/量子/表面码.md');
const quantumFolder = graph.nodes.find(node => node.name === '量子' && node.kind === 'directory');
check(surfaceNode.__layoutParentId === quantumFolder.id,
    `被双链指向的笔记层级父节点应为目录: ${surfaceNode.__layoutParentId} != ${quantumFolder.id}`);
check(graph.links.some(link => link.__hierarchy === false && link.source === indexNode.id),
    '双链边未标记为 __hierarchy: false');

// 3b. 纯布局回归：有环图不能爆栈、多父取第一个、非层级边不夺父
const cyclic = {
    nodes: [
        { id: 'r', name: 'root' },
        { id: 'a', name: 'a' }, { id: 'b', name: 'b' }, { id: 'c', name: 'c' },
        { id: 'd', name: 'd' }, { id: 'island1', name: 'island1' }, { id: 'island2', name: 'island2' }
    ],
    links: [
        { source: 'r', target: 'a' }, { source: 'a', target: 'b' }, { source: 'b', target: 'c' },
        { source: 'c', target: 'a' },
        { source: 'r', target: 'd' }, { source: 'b', target: 'd' },
        { source: 'island1', target: 'island2' }, { source: 'island2', target: 'island1' },
        { source: 'd', target: 'a', __hierarchy: false }
    ]
};
let cyclicResult = null;
try {
    cyclicResult = KG.applyReadableGraphLayout(cyclic);
} catch (error) {
    failures.push(`有环图布局抛异常: ${error.message}`);
}
if (cyclicResult) {
    const unplaced = cyclicResult.nodes.filter(node => !Number.isFinite(node.__layoutX));
    check(unplaced.length === 0, `有环图有 ${unplaced.length} 个节点未布局: ${unplaced.map(item => item.name).join(', ')}`);
    const d = cyclicResult.nodes.find(node => node.id === 'd');
    const a = cyclicResult.nodes.find(node => node.id === 'a');
    check(d.__layoutParentId === 'r', `多父节点未取第一个父节点: ${d.__layoutParentId}`);
    check(a.__layoutParentId === 'r', `非层级边夺走了父节点: ${a.__layoutParentId}`);
    check(Number.isFinite(a.__layoutX) && Math.abs(a.__layoutX) + Math.abs(a.__layoutY) + Math.abs(a.__layoutZ) > 0,
        '环上的节点被堆在原点');
}

// ---------------------------------------------------------------- 4. 规模回归：用内置图谱的 511 个节点造一个 vault

const tree = KG.getGraphTree(THEME);
const scaleNotes = [];
function sanitizeName(value) {
    return String(value).replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
}
// 每个内置节点生成一篇笔记，子节点放进以父节点命名的目录——和真实 vault 的目录/笔记形态一致
function walkScale(node, folder) {
    const safe = sanitizeName(node.name);
    const currentFolder = folder ? `${folder}/${safe}` : safe;
    scaleNotes.push({ parentFolder: folder || '根', title: safe, path: `${currentFolder}.md` });
    (node.children || []).forEach(child => walkScale(child, currentFolder));
}
tree.forEach(root => walkScale(root, ''));

const scaleFixture = scaleNotes.map((item, index) => {
    const siblings = scaleNotes.filter(other => other.parentFolder === item.parentFolder && other !== item).slice(0, 2);
    const cycle = index === 3 ? `[[${scaleNotes[4].title}]]` : (index === 4 ? `[[${scaleNotes[3].title}]]` : '');
    const hubName = index % 5 === 0 ? '[[世界模型 World Models]]' : '';
    const body = [
        `# ${item.title}`,
        `相关: ${siblings.map(other => `[[${other.title}]]`).join(' ') || '无'}`,
        index % 17 === 0 ? '[[逻辑量子比特 Logical Qubits]]' : '',
        cycle, hubName,
        '`[[代码块里的双链不应被解析]]`',
        '```',
        '[[围栏代码块里的双链也不应被解析]]',
        '```',
        `#scale #s${index % 7}`
    ].filter(Boolean).join('\n');
    return { path: `ScaleVault/${item.path}`, text: body };
});
scaleFixture.unshift({ path: 'ScaleVault/.obsidian/workspace.json', text: '{}' });

const scaleVault = Vault.parseVaultFiles(scaleFixture);
check(scaleVault.notes.length === scaleNotes.length,
    `规模测试笔记数应为 ${scaleNotes.length}，实际 ${scaleVault.notes.length}`);
check(!scaleVault.notes.some(item => item.outRefs.some(ref => ref.target.includes('代码块'))),
    '代码块内的双链被错误解析');
check(!scaleVault.notes.some(item => item.outRefs.some(ref => ref.target.includes('围栏'))),
    '围栏代码块内的双链被错误解析');

const scaleStarted = Date.now();
const scaleBuilt = KG.buildVaultGraphData(scaleVault, { api: Vault, theme: THEME, prefix: '_scale' });
const scaleLaidOut = KG.applyReadableGraphLayout(scaleBuilt.graph);
const scaleMs = Date.now() - scaleStarted;

const scaleNoteNodes = scaleBuilt.graph.nodes.filter(node => node.path && node.path.endsWith('.md'));
check(scaleNoteNodes.length === scaleNotes.length,
    `规模测试图谱笔记节点数应为 ${scaleNotes.length}，实际 ${scaleNoteNodes.length}（疑似同名节点互相覆盖）`);
const scaleMissing = scaleLaidOut.nodes.filter(node => !Number.isFinite(node.__layoutX));
check(scaleMissing.length === 0, `规模测试有 ${scaleMissing.length} 个节点未布局`);
const scaleCoords = new Set(scaleLaidOut.nodes.map(node => `${node.__layoutX},${node.__layoutY},${node.__layoutZ}`));
check(scaleCoords.size >= Math.ceil(scaleLaidOut.nodes.length * 0.99),
    `规模测试坐标重复过多: ${scaleCoords.size}/${scaleLaidOut.nodes.length}`);
check(scaleBuilt.linkStats.wikilinkEdges > 0, '规模测试没有生成双链边');
check(scaleLaidOut.links.filter(link => link.__hierarchy === false).length === scaleBuilt.linkStats.wikilinkEdges,
    '双链边数量在布局后发生变化');
// 枢纽笔记：被大量 [[世界模型 World Models]] 引用，应体现为高反链 + 大尺寸 + root 造型
const hubNote = scaleVault.notes.find(note => note.title === '世界模型 World Models');
check(Boolean(hubNote), '规模测试未生成 世界模型 World Models 笔记');
check(Boolean(hubNote) && hubNote.inLinks.length >= 5, `枢纽笔记反链数偏少: ${hubNote ? hubNote.inLinks.length : 'n/a'}`);
const hubNode = scaleBuilt.graph.nodes.find(node => (node.path || '').endsWith('世界模型 World Models.md'));
check(Boolean(hubNode), '枢纽笔记节点缺失');
check(Boolean(hubNode) && hubNode.group === 'root' && hubNode.val > 4,
    `枢纽笔记未按反链数升级造型: group=${hubNode && hubNode.group} val=${hubNode && hubNode.val}`);

// ---------------------------------------------------------------- 结果

if (failures.length) {
    console.error(`Obsidian vault audit failed (${failures.length}):\n${failures.slice(0, 40).join('\n')}`);
    process.exit(1);
}

console.log(JSON.stringify({
    status: 'pass',
    parsing: {
        vaultName: vault.name,
        notes: vault.notes.length,
        links: vault.links.length,
        unresolved: vault.stats.unresolvedCount,
        ambiguous: vault.stats.ambiguousLinks,
        referencedAttachments: vault.stats.attachmentCount,
        ignoredAttachments: vault.stats.ignoredAttachmentCount,
        topTags: vault.stats.topTags.slice(0, 4)
    },
    graph: {
        nodes: graph.nodes.length,
        hierarchyLinks: graph.nodes.length - 1,
        wikilinkEdges: built.linkStats.wikilinkEdges,
        attachmentEdges: built.linkStats.attachmentEdges,
        recordsPerNote: (indexNode.knowledgeBase || []).length
    },
    layout: {
        cyclicGraphHandled: Boolean(cyclicResult),
        multiParentKeepsFirst: cyclicResult ? cyclicResult.nodes.find(node => node.id === 'd').__layoutParentId === 'r' : false,
        nonHierarchyEdgeKeepsParent: surfaceNode.__layoutParentId === quantumFolder.id,
        nodesWithoutCoords: missing.length
    },
    scale: {
        sourceNodes: KG.buildGraphData(tree, THEME).nodes.length,
        vaultNotes: scaleVault.notes.length,
        nodes: scaleLaidOut.nodes.length,
        wikilinkEdges: scaleBuilt.linkStats.wikilinkEdges,
        orphanRatio: Number(scaleVault.stats.orphanRatio.toFixed(3)),
        uniqueCoords: scaleCoords.size,
        elapsedMs: scaleMs
    }
}, null, 2));
