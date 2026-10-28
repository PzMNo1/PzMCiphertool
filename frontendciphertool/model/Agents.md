# model/ Agents.md

## 功能定位
Agent 模块 - AI 模型集成、多角色管理、工具系统、上下文管理（不是悬浮球 agentmaster）

## 文件结构
- main.js → 模块主程序
- 2_damoxing.css → 样式
- ChatUI.js → 聊天界面组件
- AgentRuntime.js → Agent 运行时
- DeepSeekClient.js → DeepSeek 模型客户端
- HistoryManager.js → 对话历史管理
- ImageGenerationClient.js → 图像生成客户端
- ToolRegistry.js → 工具注册表
- contracts/ → 协议接口定义
  - AgentContract.java → Agent 协议
  - AgentIntentContract.java → 意图识别协议
  - AgentResearchContract.java → 研究协议
  - AgentStyleContract.java → 风格协议
- agent/ → Agent 具体实现
  - AgentContextManager.js → 上下文管理
  - AgentProfiles.js → 角色库
  - AgentPolicyResolver.js → 策略解析
  - AgentExpertPanel.js → 专家面板
  - AgentChartRenderer.js → Nature 风格统计图渲染（bar/line/scatter/control/pie/box 等）
  - AgentSkillRegistry.js → Skill 服务（装载 / 激活 / 提示词片段）
  - AgentHarnessRegistry.js → Harness 服务（阶段 / 预算 / 专家面板与交付开关）
  - AgentMcpClient.js → MCP 客户端（HTTP JSON-RPC、会话、工具映射、本地持久化）
  - AgentToolExecutor.js → 工具执行边界（transport + 能力授权）
  - AgentPluginKernel.js → 插件内核（manifest 校验、挂载/卸载、能力授予）
  - AgentPluginCatalog.js → 内置插件清单（4 个 Skill、3 个 Harness、内置工具、MCP 运行时）
  - AgentPluginPanel.js → 插件面板（Harness 切换、Skill 装卸、MCP 接入）
  - (其他 Agent 工具)

## 插件层
- 唯一入口是 manifest：`AgentPluginKernel.mount(manifest)`，校验不过直接抛 `AgentPluginError`（硬拒载，没有警告档）
- 校验项：id 形态、kind、mount 必须返回 disposer、placement 只允许 `model/agent/` 或 `runtime`、contracts 必须是 `read-only`、
  capabilities 只能取 memory/network/fs/model/exec 且不得出现 security/audit/logging/permission、provides.events 与 provides.packages
  必须已在 `agent-contract-v1` 内、工具数 ≤ 24、提示词 ≤ 1200 字、id 不可重复
- 能力授权：manifest 声明 network 后由内核授予 executor，出网只能走 `AgentToolExecutor`；卸载按引用计数回收
- `kind: 'tool'` 的插件挂载后还会核对实际注册的工具：出现 `provides.tools` 之外的名字即回滚并拒载
- 内置插件在 agent/AgentPluginCatalog.js 声明，启动即挂载：`skill.*` 四个、`harness.*` 三个、`tools.builtin`、`mcp.runtime`
- 内置工具同样经 executor 出网：`ToolRegistry.request()` 转发到 transport，卸载 `tools.builtin` 后所有内置工具立即拒绝出网
- Skill 与 Harness 注册表不再内置内容，只做装载与解析；Harness 全部卸载时退回 FALLBACK，链路与旧版一致
- MCP 工具映射为 `mcp__<server>__<tool>`；服务清单与目录存 localStorage（`pzm_mcp_servers_v1` / `pzm_mcp_catalogs_v1`），凭据只留在用户浏览器
- 运行期装卸：`PZMAgentPlugins.kernel.mount/unmount/validate`，或 `PZMAgentPlugins.skills|harnesses|mcp` 的便捷方法
- 面板：输入区「插件」按钮 → `#agent-plugin-panel`，切换 Harness、装卸 Skill、接入/移除 MCP
- MCP 传输：`PZM_MCP_TRANSPORT = 'relay'` 走同源中继 `/api/mcp/relay`，否则浏览器直连（需服务端允许跨域）
- 中继只放行 `ciphertool.mcp.relay.allowed-origins` 登记的源（`scheme://host:port`），留空即全部拒绝

## 核心对象
- `ChatUI` → 聊天界面
- `AgentRuntime` → Agent 执行引擎
- `ToolRegistry` → 工具注册表
- `AgentContextManager` → 上下文管理

## 每日用量
- Agent 每天 3 次、Agentmaster 每天 10 次，后端 `UsageQuotaService` 按账号计数（未登录按 IP），开发者账号与作者手机号免限
- 同一条用户消息内的多次模型调用共用一个 `X-Agent-Turn`，只扣 1 次
- 侧边栏“本账号剩余使用次数”来自 `GET /api/usage/summary`

## 绝对禁止
- 修改 contracts/ 中的协议定义（已稳定）
- 在 model/ 根目录创建新文件夹（agent/ 和 contracts/ 已固定）
- 混淆 agentmaster（悬浮球）和 model（Agent 模块）

## 修改规则
- 新增 Agent 角色 → 在 agent/AgentProfiles.js 中添加
- 新增工具 → 在 ToolRegistry.js 中注册
- 新增内置 Skill / Harness → 加进 agent/AgentPluginCatalog.js 的 SKILLS / HARNESSES，作为 manifest 挂载
- 运行期新增 Skill → PZMAgentPlugins.skills.register()，同样走内核校验
- 运行期切换 Harness → PZMAgentPlugins.harnesses.use('quick' | 'deep' | 'delivery')
- 新增 MCP 服务 → 运行时 PZMAgentPlugins.mcp.add({ id, name, url })，不写进代码
- 改进模型客户端 → 修改 DeepSeekClient.js
- 样式调整 → 修改 2_damoxing.css（复用 0_zhuyeyangshi.css 变量）

## 常见任务

### 添加新的 Agent 角色
LOCATE: agent/AgentProfiles.js
ACTION: 定义新角色配置
STRUCTURE:
  {
    id: '唯一ID',
    name: '角色名',
    systemPrompt: '系统提示词',
    tools: ['工具1', '工具2'],
    style: '风格定义'
  }
TEST: 切换角色后表现符合预期

### 集成新的 AI 模型
LOCATE: 创建 Model名Client.js（如 ClaudeClient.js）
ACTION: 继承或实现 ChatClient 接口
INTERFACE:
  - async send(messages, options)
  - async stream(messages, onChunk)
  - cancel()
TEST: 模型能正确收发消息

### 新增工具
LOCATE: ToolRegistry.js
ACTION: 调用 register() 方法注册工具
STRUCTURE:
  {
    id: '工具ID',
    name: '显示名称',
    description: '工具描述',
    parameters: { /* JSON Schema */ },
    execute: async (params) => { /* 执行逻辑 */ }
  }
TEST: Agent 能调用该工具

### 优化上下文管理
TARGET: AgentContextManager.js
ACTION: 实现上下文压缩、优先级排序等策略
REFERENCE: 查看现有的上下文窗口管理

## 架构约束
- 客户端可插拔：不同模型通过独立的 Client 实现
- 工具系统通用：所有工具通过 ToolRegistry 统一管理
- 协议不变：contracts/ 定义的接口不能修改

## 依赖关系
↑ modules.js（路由）
↑ backendconfig.js（模型 API 配置）
→ contracts/（协议）
→ agent/（Agent 实现）
→ ChatUI.js（UI 组件）
← ToolRegistry.js（工具系统）
