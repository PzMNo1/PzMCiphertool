# zhishitupu/ Agents.md

## 功能定位
知识图谱 - 以 Wikipedia 三级重要条目与 Wikidata 为主图谱，并用 DBpedia 扩展跨领域概念；对 Agentmaster 提供带引用的本地 RAG。

## 文件结构
- zhishitupu.js → 图谱渲染、六方向 3D 父子布局、点击聚焦、节点面板、ZSTP 对外检索接口
- 3_zhishitupu.css → 样式
- graphData.js → 把真实世界知识数据装配成图谱树与关系边
- worldKnowledge.js → **生成产物**：节点/分类/关系元数据
- worldExpansion.js → **生成产物**：DBpedia 扩展概念、分类与跨学科关系
- compileWorldExpansion.js → DBpedia 扩展知识编译器（Node 构建期，需要访问 dbpedia.org / wikidata.org / api.wikimedia.org）
- worldExpansionCorpus.bin → **生成产物**：gzip 压缩的扩展概念维基百科正文
- worldExpansionCorpusLoader.js → 浏览器本地解压扩展正文，供扩展节点面板展示
- worldCorpus.bin → **生成产物**：gzip 压缩的完整 Wikipedia 正文与索引源
- worldCorpusLoader.js → 浏览器本地解压并挂载正文
- traditionalChinese.js → OpenCC TSCharacters 构建期繁简映射
- worldRag.js → 本地检索：中文二元词 + BM25F + 实体链接 + 图邻居扩展 + PRF + MMR
- worldSource.js → Wikipedia/Wikidata 抓取与 wikitext 清洗（Node 构建期）
- compileWorldGraph.js → 世界知识图谱编译器
- worldKnowledge.audit.js → 数据来源、完整正文、检索回归审计
- knowledgeGraph.audit.js → 图谱装配、扩展节点与 Agentmaster 集成审计
- obsidianVault.js → Obsidian 黑曜石库解析（用户导入的独立图谱）
- obsidianVault.audit.js → Obsidian 解析回归

## 数据流
1. `Wikipedia:Vital articles/Level 3` 的真实章节（2/3/4 级）与条目清单
2. Wikidata 简体中文标签、英文标签、别名、sitelink、结构化声明
3. Wikipedia 条目 wikitext → 去标记后的**完整**正文段落（含 revision / URL / CC BY-SA 4.0）
4. `compileWorldGraph.js` 生成节点元数据 `worldKnowledge.js` 和 gzip 正文 `worldCorpus.bin`
5. `compileWorldExpansion.js` 从 DBpedia 拉取领域概念、双语标题、简介、分类与跨学科关系；再按 Wikidata sitelink 抓取每个概念的中文（缺失回退英文）维基百科正文，生成 `worldExpansion.js` 与 gzip 正文 `worldExpansionCorpus.bin`
6. `worldCorpusLoader.js` / `worldExpansionCorpusLoader.js` 在浏览器本地解压正文；`graphData.js` 装配知识大陆/章节/实体，并把扩展分类挂到对应章节下
7. `worldRag.js` 在本地建立倒排索引，`zhishitupu.js` 暴露 `ZSTP.searchWorldKnowledge` / `ZSTP.retrieveKnowledge`
8. Agentmaster 对知识问题自动调用本地检索，并按 citationId 引用原文

## 绝对禁止
- 手改 `worldKnowledge.js` 或 `worldExpansion.js`（均由编译器覆盖）
- 在知识图谱中加入 AI 生成的定义、机制、指标、专家框架或同义改写文本
- 在检索阶段调用 OpenAlex / Semantic Scholar / Crossref / Wikipedia 在线 API；检索必须只读本地语料
- 把 `worldKnowledge.js` 拆成虚构节点或未标注来源的内容
- 在 zhishitupu/ 根目录创建新文件夹

## 修改规则
- 调整知识覆盖范围 → 修改 `compileWorldGraph.js` 的 `--limit` / 章节选择，再重跑编译
- 调整扩展知识 → 修改 `compileWorldExpansion.js` 的 `DOMAINS` / `CURATED` / `CROSS_NODES`，再重跑生成
- 调整清洗规则 → 修改 `worldSource.js` 的 `stripWikiMarkup` / `parseSections`，然后 `--refresh` 或复用缓存重跑
- 调整检索 → 修改 `worldRag.js`，保持 BM25F、实体链接、图扩展、PRF、MMR 的可审计链路
- 调整图谱装配 → 修改 `graphData.js`，保留 `buildGraphData` 对 Obsidian 导入的兼容
- 样式调整 → 修改 `3_zhishitupu.css`（复用 0_zhuyeyangshi.css 变量）

## 常见任务

### 重新生成世界知识图谱
```
node compileWorldGraph.js --plan
node compileWorldGraph.js --limit=300
node compileWorldGraph.js
```
构建缓存位于系统临时目录；`--refresh` 强制重新抓取。

### 重新生成 DBpedia 扩展知识
```
node compileWorldExpansion.js
node compileWorldExpansion.js --no-articles   # 只更新 DBpedia 概念层，跳过维基正文抓取
```
需要访问 `https://dbpedia.org/sparql`、`https://www.wikidata.org`、`https://api.wikimedia.org`；运行前确认 `CURATED` / `CROSS_NODES` 中没有与现有实体重复的标题。正文抓取按 `WG_INTERVAL_MS`（默认 450ms）节流，单个节点失败会回退英文条目并继续。

### 验证
```
node worldKnowledge.audit.js
node knowledgeGraph.audit.js
node obsidianVault.audit.js
```
`WG_AUDIT_MIN_NODES` 可下调用于抽样构建。

### Agentmaster 检索
LOCATE: `agentmaster.js` 的 `shouldRetrieveWorldKnowledge` / `runKnowledgeGraphRag` / `answerWithKnowledgeGraphRetrieval`
RULE: 只把 `evidenceLevel=encyclopedia-verbatim` 的 Wikipedia 段落当作事实证据；Wikidata 声明只能标为结构化声明。

## 架构约束
- 数据与渲染分离：编译器输出 `worldKnowledge.js` / `worldExpansion.js`，前端不生成知识内容
- 中心节点「PzM知识图谱」仅作展示，连接六个方向的知识大陆；点击非中心节点时压暗其它方向与无关链路
- 节点身份使用 Wikidata QID；扩展节点使用 DBpedia `dbp:` 资源 ID
- 扩展节点标题必须是 `简体中文 English`，并与现有实体/分类去重；节点必须能直接显示名称
- 扩展分类挂在对应 section 下，`cross-disciplinary` 关系连接跨领域节点；扩展节点不进入本地 Wikipedia RAG 证据链
- 关系来源标记 `wikipedia-section` / `wikidata-claim` / `wikipedia-hyperlink` / `cross-disciplinary`
- 每条原文段落带 `url`、`revision`、`license`，检索结果必须可回指
- 本地检索默认零网络请求；在线 API 不进入 RAG 主路径
