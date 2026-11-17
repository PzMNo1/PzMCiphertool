# logic/ Agents.md

## 功能定位
逻辑谜题实验室 - 集成 60+ 逻辑解谜（数独、填字、方块等）

## 文件结构
- logicbatch.js → 谜题批量加载器（枢纽）
- logic_module.js → 模块整合
- js/ → 谜题核心逻辑
  - {N}_{谜题名}.js → 谜题规则和求解算法
- logicdiv/ → 谜题 UI 渲染
  - 0_logic_ui.js → 通用 UI 框架
  - {N}_{谜题名}_ui.js → 谜题特定 UI

## 谜题对应关系
每个谜题配置两个文件：
- js/{N}_{name}.js → 逻辑层（规则定义、检查、求解）
- logicdiv/{N}_{name}_ui.js → 表现层（canvas/DOM 渲染、交互）

例如：
- js/1_sudoku.js + logicdiv/1_sudoku_ui.js
- js/51_slitherlink.js + logicdiv/51_slitherlink_ui.js

## 绝对禁止
- 在 logicdiv/ 中创建 {N}_{name}.js（必须 *_ui.js 后缀）
- 在 js/ 中创建 *_ui.js（必须放 logicdiv/）
- 修改已有谜题的序号（会破坏索引）
- 在 logicdiv/0_logic_ui.js 中添加特定谜题代码（仅保留通用函数）

## 修改规则
- 新增谜题 → 同时创建 js/{N}_{name}.js 和 logicdiv/{N}_{name}_ui.js
- 修改规则 → 只改 js/{N}_{name}.js（不影响 UI）
- 修改 UI → 只改 logicdiv/{N}_{name}_ui.js（不影响规则）
- 通用函数 → 添加到 logicdiv/0_logic_ui.js

## 常见任务

### 添加新谜题
STEP 1: 确定最大序号 N（目前约 63）
STEP 2: 创建 js/{N+1}_{谜题名}.js
  结构：
  class 谜题名 {
    constructor() { this.grid = []; }
    generate(difficulty) { return []; }
    validate() { return true; }
    solve() { return []; }
  }
STEP 3: 创建 logicdiv/{N+1}_{谜题名}_ui.js
  结构：
  function render谜题名UI(container, game) {
    // 使用 canvas 或 DOM 渲染游戏板面
    // 绑定用户交互（点击/输入）
    // 调用 game.validate() 检查
  }
STEP 4: 在 logicbatch.js 中注册谜题

### 修改现有谜题逻辑
LOCATE: js/{N}_{name}.js
ACTION: 只修改 generate/validate/solve 方法
TEST: 确保新生成的谜题有唯一解且可通过验证

### 优化谜题求解性能
TARGET: solve() 方法
ACTION: 使用启发式搜索或剪枝算法
REFERENCE: 查看 js/1_sudoku.js 或 js/51_slitherlink.js 的优化方案

## 架构约束
- 逻辑与 UI 分离：js/ 中不依赖 DOM/canvas
- 通用工具集中：0_logic_ui.js 提供网格操作、验证等共用函数
- 数据结构一致：所有谜题的 grid 都是二维数组

## 依赖关系
↑ modules.js（路由）
↑ logicbatch.js（谜题加载）
→ js/{N}_{name}.js（逻辑）
→ logicdiv/{N}_{name}_ui.js（UI）
← logicdiv/0_logic_ui.js（通用 UI 函数）
