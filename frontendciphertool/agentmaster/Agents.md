# agentmaster/ Agents.md

## 功能定位
悬浮球 Agent - 多模态交互对话助手，集成 AI 聊天、工具调用、语音输入等功能

## 文件结构
- agentmaster.js → 主逻辑（事件监听、UI 交互、API 调用）
- agentmaster.css → 悬浮球样式（继承 0_zhuyeyangshi.css 变量）

## 核心对象
- `createAgentOrb()` → 生成悬浮球 DOM
- `createBrowserWorkspaceAgent()` → Agent 运行时
- `chatWindow` → 聊天窗口容器
- `textarea` → 输入框
- `history` → 消息历史显示区

## 每日用量
- 请求统一走 `buildUsageHeaders()`：携带登录 token、`X-Agent-Surface: agentmaster`
- 每天 10 次，由后端 `UsageQuotaService` 计数，超出后聊天窗口提示“今日 Agentmaster 使用次数已用完”

## 运行状态
- 请求、流式生成、工具执行期间常驻 `.agent-loading` 三点动画与“正在思考… / 正在推理… / 正在生成… / 正在执行操作…”
- 工具消息或流式内容追加时，加载条保持在聊天记录底部；结束或报错后移除
- `isSending` 防止并发发送，忙碌时提示上一条请求仍在运行

## 上下文衔接
- `messages` 是唯一会话状态：每轮先入队 user，回答（含错误、空回答）再用 `rememberAssistant()` 入队，保证下一轮能看到完整对话
- 请求一律经 `buildConversationMessages()`：保留 system + 最近对话，超出 `HISTORY_CHAR_BUDGET` 时折叠更早消息并插入折叠说明
- `answerWithKnowledgeGraphRetrieval` 复用同一份历史，只把检索结果作为一条 system 追加在当前提问之前，不再丢掉前文
- 选项/续写类短回复（`2`、`第2个`、`option 2`、`继续`、`好的` 等）由 `isConversationFollowup()` 拦截，不触发知识图谱检索
- 模型只输出 `reasoning_content` 而没有正文时，`readStream` 用 `emptyReplyNote()` 说明原因并把该轮写入历史

## 绝对禁止
- 新增和修改agentmaster的任何样式

## 修改规则
- 新增功能 → 在 agentmaster.js 的对应事件处理函数中直接添加
- 样式调整 → 仅修改 agentmaster.css，所有颜色值引用 CSS 变量
- API 切换 → 修改 backendconfig.js 的 chatUrl，无需改 agentmaster.js

## 常见任务

### 添加新工具到 Agent
LOCATE: `ToolRegistry` 或 `createBrowserWorkspaceAgent()`
ACTION: 在工具列表中添加 `{ name: '工具名', fn: 函数引用 }`
TEST: 悬浮球菜单中出现新工具

### 集成新 AI 模型
LOCATE: backendconfig.js → agentmaster.js 的 API 调用
ACTION: 修改 `AGENT_API_URL` 或添加模型选择逻辑
TEST: 聊天正常响应

### 电路模拟工具
LOCATE: agentmaster.js → `buildCircuit` / `readCircuit`；electronic_lab.js → `electronicLabBuildCircuit`
ACTION: 通过 `ui_action` 的 `build_circuit` 传入 `{title, components}`，由 `circuit_builder.js` 生成 CircuitJS 网表
TEST: 电子实验室 → 电路模拟 出现电路并开始仿真，工具消息返回元件读数

### 电路板布局工具
LOCATE: agentmaster.js → `editPcbCode` / `readPcbCode`；PCBLayout/editor.js → `PzmaPcbEditor.getStatus`
ACTION: 通过 `ui_action` 的 `edit_pcb_code` 写入 TSX；`normalizePcbTsx` 自动修正常见语法，`autoRepairPcbPlacement` 按引擎越界提示微调并重跑；返回的 `errors` 来自 PCB 引擎渲染检查
TEST: 电路板布局出现 PCB，错误 TSX 会在工具消息中报告引擎错误

## 依赖关系
↑ modules.js（路由加载）
↑ backendconfig.js（API 配置）
↑ model/ （如果需要 ChatUI 组件）
