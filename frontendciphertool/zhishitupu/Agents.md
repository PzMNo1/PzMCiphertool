# zhishitupu/ Agents.md

## 功能定位
知识图谱 - 以 Wikipedia 三级重要条目与 Wikidata 为唯一知识源的本地世界知识图谱，并对 Agentmaster 提供带引用的本地 RAG。

## 文件结构
- zhishitupu.js → 图谱渲染、六方向 3D 父子布局、点击聚焦、节点面板、ZSTP 对外检索接口
- 3_zhishitupu.css → 样式
- graphData.js → 把真实世界知识数据装配成图谱树与关系边
- worldKnowledge.js → **生成产物**：节点/分类/关系元数据
- worldCorpus.bin → **生成产物**：gzip 压缩的完整 Wikipedia 正文与索引源
- worldCorpusLoader.js → 浏览器本地解压并挂载正文
- traditionalChinese.js → OpenCC TSCharacters 构建期繁简映射
- worldRag.js → 本地检索：中文二元词 + BM25F + 实体链接 + 图邻居扩展 + PRF + MMR
- worldSource.js → Wikipedia/Wikidata 抓取与 wikitext 清洗（Node 构建期）
- compileWorldGraph.js → 世界知识图谱编译器
- worldKnowledge.audit.js → 数据来源、完整正文、检索回归审计
- knowledgeGraph.audit.js → 图谱装配与 Agentmaster 集成审计
- obsidianVault.js → Obsidian 黑曜石库解析（用户导入的独立图谱）
- obsidianVault.audit.js → Obsidian 解析回归

## 数据流
1. `Wikipedia:Vital articles/Level 3` 的真实章节（2/3/4 级）与条目清单
2. Wikidata 简体中文标签、英文标签、别名、sitelink、结构化声明
3. Wikipedia 条目 wikitext → 去标记后的**完整**正文段落（含 revision / URL / CC BY-SA 4.0）
4. `compileWorldGraph.js` 生成节点元数据 `worldKnowledge.js` 和 gzip 正文 `worldCorpus.bin`
5. `worldCorpusLoader.js` 在浏览器本地解压正文；`graphData.js` 装配知识大陆/章节/实体
6. `worldRag.js` 在本地建立倒排索引，`zhishitupu.js` 暴露 `ZSTP.searchWorldKnowledge` / `ZSTP.retrieveKnowledge`
7. Agentmaster 对知识问题自动调用本地检索，并按 citationId 引用原文

## 绝对禁止
- 手改 `worldKnowledge.js`（由编译器覆盖）
- 在知识图谱中加入 AI 生成的定义、机制、指标、专家框架或同义改写文本
- 在检索阶段调用 OpenAlex / Semantic Scholar / Crossref / Wikipedia 在线 API；检索必须只读本地语料
- 把 `worldKnowledge.js` 拆成虚构节点或未标注来源的内容
- 在 zhishitupu/ 根目录创建新文件夹

## 修改规则
- 调整知识覆盖范围 → 修改 `compileWorldGraph.js` 的 `--limit` / 章节选择，再重跑编译
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
- 数据与渲染分离：编译器输出 `worldKnowledge.js`，前端不生成知识内容
- 中心节点「PzM知识图谱」仅作展示，连接六个方向的知识大陆；点击非中心节点时压暗其它方向与无关链路
- 节点身份使用 Wikidata QID；关系来源标记 `wikipedia-section` / `wikidata-claim` / `wikipedia-hyperlink`
- 每条原文段落带 `url`、`revision`、`license`，检索结果必须可回指
- 本地检索默认零网络请求；在线 API 不进入 RAG 主路径
