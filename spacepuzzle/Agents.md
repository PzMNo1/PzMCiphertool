# spacepuzzle/ Agents.md

## 功能定位
空间解谜 - 包含滑块谜题、魔方、几何拼图等物理/组合类解谜游戏

## 文件结构
- spacepuzzlebatch.js → 谜题批量加载器
- spacepuzzle_ui.js → 通用 UI 框架（canvas 渲染、交互处理）
- {谜题名}/ → 每个谜题的独立文件夹
  - {谜题名}.js → 核心逻辑
  - {谜题名}.css → 样式

## 谜题列表
- huarongdao → 华容道（滑块谜题）
- qiqiaoban → 七巧板（几何拼图）
- jinzitamofang → 金字塔魔方
- rubikscube → 魔方（3D 立方体）
- rubiksclock → 魔方钟
- Pentomino → 五连方块
- skewbmofang → Skewb 魔方
- squreonemofang → 正方形魔方

## 绝对禁止
- 在 spacepuzzle/ 根目录创建 .js 或 .css（只能放在谜题子文件夹内）
- 修改 spacepuzzle_ui.js 中的通用渲染函数（已稳定）
- 修改谜题子文件夹名称（会破坏路由）

## 修改规则
- 新增谜题 → 创建 {谜题名}/ 文件夹，添加 {谜题名}.js 和 {谜题名}.css
- 修改谜题逻辑 → 只改 {谜题名}/{谜题名}.js
- 修改样式 → 只改 {谜题名}/{谜题名}.css（复用 0_zhuyeyangshi.css 变量）
- 通用 UI 改进 → 修改 spacepuzzle_ui.js

## 常见任务

### 添加新的空间谜题
STEP 1: 创建文件夹 {新谜题名}/
STEP 2: 创建 {新谜题名}.js
  结构：
  class 新谜题名 {
    constructor() { this.state = {}; }
    rotate/move(action) { return 新状态; }
    validate() { return true/false; }
    render(canvas) { /* canvas 绘制 */ }
  }
STEP 3: 创建 {新谜题名}.css（样式）
STEP 4: 在 spacepuzzlebatch.js 中注册谜题

### 修改 3D 魔方旋转逻辑
LOCATE: rubikscube/nubikscube.js
ACTION: 修改 turnState() 的旋转矩阵
TEST: 旋转后各面颜色正确对齐

### 修改 3D 魔方交互
LOCATE: rubikscube/nubikscube.js
ACTION: 手势入口 bindCubeGestures / handleScenePointerDown；转动方向 resolveTurn；投影命中 cubeMetrics / projectCubePoint / hitTestCube
NOTE: 拖动贴纸转动该面，空白处拖动旋转视角，点击贴纸旋转 90°；空间转动面板默认折叠，按钮仅作精确操作备选

### 优化 Canvas 渲染性能
TARGET: spacepuzzle_ui.js 中的 render() 函数
ACTION: 使用 requestAnimationFrame 或缓存纹理
REFERENCE: 检查 rubikscube.js 的优化方案

## 架构约束
- 每个谜题完全独立：不共享状态
- 坐标系一致：所有谜题使用同一坐标系约定
- 触摸交互统一：由 spacepuzzle_ui.js 统一处理手势

## 依赖关系
↑ modules.js（路由）
↑ spacepuzzlebatch.js（加载）
→ spacepuzzle_ui.js（通用 UI）
→ {谜题名}/{谜题名}.js（逻辑）
→ {谜题名}/{谜题名}.css（样式）
