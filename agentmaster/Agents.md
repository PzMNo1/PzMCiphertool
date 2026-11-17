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

### 工业建模代码工具
- `window.industrialCadBridge` 由 `modelinglab.js` 暴露
- `write_industrial_code`：写入完整 Cascade Studio JavaScript 并立即执行
- `read_industrial_code`：读取当前建模代码
- `run_industrial_code`：重新执行当前代码；传 `value` 时替换后执行
- `industrial_status`：查看 Cascade Studio 内核、错误和历史步骤状态
- `industrial_reference`：获取 Cascade Studio API、陷阱与示例
- 模型与 Agent 之间只传递完整脚本，不传局部 diff


### 工具调用容错（工业建模）
- 用户明确建模后，30 分钟内短追问（例如：没看到齿轮，重新画；给我文本干嘛，我要齿轮；改大一点）继续允许工业建模工具。
- 兼容模型偶发输出的 <ui_action> JSON、换行未转义的 JSON、未闭合 DSML、<industrial_code> 原始代码块。
- DSML 不是正式协议；系统提示已明确禁止，但解析层仍保留恢复逻辑。
- 复杂工业代码优先走原生 write_industrial_code；无原生工具时输出完整 <industrial_code>...</industrial_code>，不要用长 JSON 塞代码。


### 语音与快捷选项交互
- 语音为长按开始、再次点击结束并发送；结束后不会因 pointerup 自动停止。
- 识别到的 interim transcript 会实时填入输入框；aborted 且已有文本时仍继续发送，不再显示原始 aborted 错误。
- 外部 `.agent-suggestions` 常驻隐藏；会话打开或结束后在聊天记录内渲染 `.agent-inline-suggestions`，发送消息或输入文字时移除。

### harness v2: native tools, domain briefs, structured repair gates, reasoning display, X-Agent-Turn dedupe.

## Harness v2
- Native tool calls are enabled by default; `AGENTMASTER_USE_NATIVE_TOOLS=false` opts out.
- Each user turn gets a domain brief for industrial CAD, circuit, or PCB tasks.
- Tool results are structured objects; `mustRepair`, `errors`, and `issues` trigger repair rounds.
- At most 3 tool rounds plus 1 final no-tool synthesis. All requests in one turn share `X-Agent-Turn`.
- Industrial validation checks IIFE/final-expression structure and requested components.
- Circuit validation inspects warnings and LED current readings for reverse bias or insufficient current.
- `reasoning_content` is rendered as a collapsible thinking panel when the provider returns it.

- reasoning_content streams into a one-line details ticker with a right-edge mask; no static 'think process' summary remains.

### harness v2.1 simplification
- Tool success now finalizes locally; no extra model call or extra thinking round.
- Max 2 tool rounds plus one final fallback.
- Removed dynamic domain briefs, semantic industrial audits, and temperature/max-token overrides.
- Tool metadata is reduced to success/mustRepair for repair routing; UI still receives readable strings.
