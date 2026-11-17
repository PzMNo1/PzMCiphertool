# wordsearch/ Agents.md

## 功能定位
文字搜索游戏 - 支持英文单词搜索和中文文字搜索（汉字、词语、成语）

## 文件结构
- wordsearch.js → 英文单词搜索主程序
- wordsearch_chinese.js → 中文文字搜索主程序
- wordsearch.css → 共用样式
- ciyu.js → 中文词语数据库
- hanzi.js → 汉字数据库
- idiom-*.js → 成语数据库（按首字母分割：idiom-a.js 到 idiom-z.js）

## 数据文件特点
- 大型词汇库分割存储：避免单文件过大
- 格式：导出数组，如 `const words = ['word1', 'word2', ...]`
- 中文数据按首字母分割（成语库分成 26 个文件）

## 绝对禁止
- 在 wordsearch/ 创建新文件夹
- 修改数据文件的导出格式（会破坏 wordsearch_chinese.js 的解析）
- 在 wordsearch.js 或 wordsearch_chinese.js 中硬编码词汇数据

## 修改规则
- 新增单词/词语 → 修改对应的数据文件（ciyu.js/hanzi.js/idiom-*.js）
- 游戏逻辑改进 → 修改 wordsearch.js 或 wordsearch_chinese.js
- 样式调整 → 修改 wordsearch.css（复用 0_zhuyeyangshi.css 变量）

## 常见任务

### 新增英文单词库
LOCATE: wordsearch.js 中的加载逻辑
ACTION: 在数据来源中添加新的词表引用
TEST: 单词搜索功能正常

### 新增中文成语
LOCATE: idiom-{首字}.js
ACTION: 在对应首字母文件中添加成语（按拼音排序）
TEST: 搜索功能能找到新增成语

### 优化搜索性能
TARGET: wordsearch.js 中的搜索算法
ACTION: 使用 Trie 树或哈希表加速查找
REFERENCE: 检查现有优化策略

## 架构约束
- 数据与逻辑分离：数据文件只包含数组定义
- 文件大小控制：单个数据文件控制在 100KB 以内
- 命名规范：数据文件必须以 `const {名称} = [...]` 格式

## 依赖关系
↑ modules.js（路由）
→ ciyu.js / hanzi.js / idiom-*.js（数据）
