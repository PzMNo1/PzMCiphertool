# workflow/ Agents.md

## 功能定位
工作流编辑器 - 可视化流程设计和自动化编排

## 文件结构
- workflow.js → 工作流编辑器主程序
- 1_workflow.css → 样式
- assets/ → 工作流资源

## 核心对象
- WorkflowEditor → 编辑器实例
- FlowNode → 流程节点
- FlowEdge → 连接线

## 绝对禁止
- 在 workflow/ 根目录创建新文件夹（除了 assets/）
- 修改已有工作流的序列化格式（会导致兼容性问题）

## 修改规则
- 新增节点类型 → 在 workflow.js 中注册节点工厂函数
- 改进编辑器 UI → 修改 workflow.js 的事件处理
- 样式调整 → 修改 1_workflow.css（复用 0_zhuyeyangshi.css 变量）

## 常见任务

### 添加新的节点类型
LOCATE: workflow.js 中的 nodeFactory 或 registerNodeType()
ACTION: 定义新节点类和对应的 UI 渲染函数
TEST: 编辑器中能创建和编辑该节点类型

### 实现流程执行引擎
TARGET: 工作流序列化后的执行
ACTION: 
  1. 定义节点执行接口
  2. 实现拓扑排序遍历
  3. 处理分支和循环
REFERENCE: 查看现有的执行逻辑

### 优化大型流程的渲染
TARGET: Canvas 绘制
ACTION: 使用虚拟视口或分块渲染
FORBIDDEN: 修改流程数据结构导致兼容性破裂

## 架构约束
- 节点独立：各节点之间无直接引用
- 连接通过 ID：EdgeID = from.nodeId -> to.nodeId
- 序列化格式稳定：JSON 格式不能无故改变

## 依赖关系
↑ modules.js（路由）
← assets/（流程模板）
