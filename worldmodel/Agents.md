# worldmodel/ Agents.md

## 功能定位
世界模型生成 - 3D 场景和虚拟环境生成工具，支持大型 3D 场景加载和交互

## 文件结构
- worldmodel.js → 世界模型主程序
- worldmodel.html → 场景显示页面
- worldmodel-client.js → 客户端交互逻辑
- worldmodel.css → 样式
- splat-view.html → 高斯 splatting 3D 查看器
- assets/ → 3D 场景资源（如 demo-kitchen-500k.spz）

## 场景格式
- .spz → 压缩的 3D 场景格式
- 支持高斯 splatting 实时渲染
- 包含完整的光照和材质信息

## 绝对禁止
- 修改 splat-view.html 的核心渲染逻辑（已优化）
- 在 worldmodel/ 根目录创建新文件夹
- 添加非 .spz 格式的大型 3D 场景（超过 500MB）

## 修改规则
- 新增场景 → 上传 .spz 文件到 assets/，在 worldmodel.js 中注册
- 交互改进 → 修改 worldmodel-client.js
- 样式调整 → 修改 worldmodel.css（复用 0_zhuyeyangshi.css 变量）

## 常见任务

### 加载新的 3D 场景
STEP 1: 将 .spz 文件放在 assets/
STEP 2: 在 worldmodel.js 中注册场景路径和名称
STEP 3: 在 worldmodel.html 中添加场景选择器

### 优化大型场景加载
TARGET: 场景加载速度
ACTION: 
  1. 压缩 .spz 文件（使用 lz-string）
  2. 分块加载（流式传输）
  3. 使用 WebWorker 预处理
REFERENCE: 查看 demo-kitchen-500k.spz 的优化策略

### 添加场景交互功能
LOCATE: worldmodel-client.js
ACTION: 添加鼠标/触摸事件处理或对象拾取
TEST: 交互功能正常响应

## 架构约束
- 场景资源外部化：所有 .spz 文件放在 assets/
- 渲染器单一：使用 splat-view.html 的渲染器，无需替换
- 内存优化：加载完成后释放临时数据

## 依赖关系
↑ modules.js（路由）
→ WorldModelController（后端 API）
→ splat-view.html（渲染器）
→ assets/（场景资源）
