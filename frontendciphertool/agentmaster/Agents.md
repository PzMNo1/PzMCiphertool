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

## 依赖关系
↑ modules.js（路由加载）
↑ backendconfig.js（API 配置）
↑ model/ （如果需要 ChatUI 组件）
