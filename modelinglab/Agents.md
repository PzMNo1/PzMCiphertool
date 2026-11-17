# modelinglab/ Agents.md

## 功能定位
建模实验室 - 3D 建模和格式转换工具；工业建模子模块已替换为开源浏览器 CAD **Cascade Studio** 的本地全屏嵌入

## 文件结构
- modelinglab.js → 建模实验室主程序与子页签装配（工业建模 / 世界模型 / 格式转换台）
- modelinglab.css → 样式
- format-convert.html → 3D 模型格式转换工具
- goneyeyinqing/ → 工业建模子模块（Cascade Studio 开源 CAD 本地嵌入）
  - industrial.html → 本地 Cascade Studio 全屏 iframe 容器
  - cascadestudio/ → Cascade Studio 本地静态产物与 MIT 许可
  - Agents.md → 子模块说明与外部项目许可
- three-webgpu-editor/ → Three.js WebGPU 编辑器
  - 包含完整的 3D 编辑功能
- assets/ → 3D 模型资源存储

## 核心对象
- THREE（全局）→ Three.js 库
- WebGPURenderer → WebGPU 渲染器
- 模型加载器 → 支持 gltf/obj/fbx 等格式
- Cascade Studio → 浏览器端开源 CAD 应用（https://github.com/zalo/CascadeStudio，MIT）

## 绝对禁止
- 修改 three-webgpu-editor/ 内部文件（集成库）
- 在 modelinglab/ 根目录创建新文件夹（除非是新工具）
- 修改 format-convert.html 的核心逻辑

## 修改规则
- 新增建模工具 → 在 modelinglab.js 中添加工具调用
- 工业建模功能 → Cascade Studio 上游维护；本仓库维护本地静态产物与 iframe 入口，参考 goneyeyinqing/Agents.md
- 格式支持扩展 → 修改 format-convert.html 的加载器
- 样式调整 → 修改 modelinglab.css（复用 0_zhuyeyangshi.css 变量）

## 常见任务

### 新增 3D 模型格式支持
LOCATE: format-convert.html 中的加载逻辑
ACTION: 添加新格式的加载器（如 STL、STEP）
TEST: 上传该格式文件能正确显示和转换

### 集成新的 3D 效果
TARGET: three-webgpu-editor/
ACTION: 添加后处理效果或着色器
REFERENCE: Three.js 官方文档

### 优化渲染性能
TARGET: Three.js 场景
ACTION: 使用 LOD、实例化渲染或纹理优化
FORBIDDEN: 禁止降低精度导致模型失真

## 架构约束
- Three.js 作为渲染引擎：不替换
- 工业建模：在本地嵌入开源 Cascade Studio 静态构建，不在本仓库重复实现建模 UI 或几何内核
- WebGPU 支持：仅在支持浏览器中启用
- 模型资源集中：放在 assets/ 目录

## 依赖关系
↑ modules.js（路由）
→ three-webgpu-editor/（编辑器）
→ goneyeyinqing/（Cascade Studio 嵌入入口）
→ assets/（模型资源）
← vendor/three/（Three.js 库）



## Agentmaster 桥接
- `window.industrialCadBridge` 连接本地 Cascade Studio：`runCode` / `readCode` / `evaluate` / `status` / `getQuickStart`
- Agentmaster 的工业建模工具依赖该桥接对象；不要在 agentmaster 中直接操作级联 iframe DOM
