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
  - (其他 Agent 工具)

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
