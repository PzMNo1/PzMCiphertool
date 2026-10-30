# goneyeyinqing/ Agents.md

## 功能定位
建模实验室 · 工业建模子模块。浏览器内的参数化 B-rep CAD 工作台：4 个工业零件模板（法兰盘、L 形支座、阶梯轴、等径三通），支持 STEP 导入、STEP / STL 导出、质量与包围盒核算。

## 引擎
- replicad 1.2.0（MIT）→ 浏览器侧 CAD API，本地文件：`../../vendor/replicad/replicad.umd.js`
- OpenCascade OCCT（LGPL-2.1）→ `replicad-opencascadejs@1.1.0` 的 WASM，按版本从 jsDelivr 加载，unpkg 兜底
- Three.js 0.185.1 → 视口渲染（unpkg importmap，与 format-convert.html 保持一致）

## 文件结构
- industrial.html → 页面骨架；iframe 内独立文档，含 importmap 与装载层
- industrial.css → 页面样式；复用建模实验室的暗色霓虹语言
- industrial.js → 控制器：模板/参数 UI、内核装载、导出导入、统计与错误提示
- industrial-parts.js → 零件模板注册表 `TEMPLATES` 与 `buildPart()`；参数 schema 自动生成表单
- industrial-viewer.js → Three.js 视口：网格、CAD 边线、包围盒、相机适配、自转

## 核心对象
- `window.replicad` → replicad UMD；`setOC` / `makeBox` / `makeCylinder` / `exportSTEP` / `importSTEP` / `measureVolume`
- `TEMPLATES` → `{ id, name, en, icon, groups, build(params) }`
- `buildPart(id, params)` → `{ shape, steps, notes, used }`
  - `steps` → 特征树节点（ok / skip / warn）
  - `notes` → 参数自动收敛说明
  - `used` → 实际生效参数，UI 会回写到输入框
- `createIndustrialViewer(host)` → `setPart` / `fitView` / `setOption` / `setAutoRotate`

## 绝对禁止
- 修改 `vendor/replicad/` 内部实现；升级需整体替换并更新版本注释
- 绕过 OCCT 直接拼三角网充当工业几何；模板必须走 B-rep 造型
- 把 OCCT WASM 复制进仓库（约 23 MB，保持 CDN 按版本加载）
- 引入后端依赖或新增跨切面的日志 / 权限逻辑

## 修改规则
- 新增零件 → 在 `industrial-parts.js` 写 `buildXxx(params)`，再把模板登记到 `TEMPLATES`；参数表单自动生成
- 参数约束 → 在 build 内 `clampWithNote` 收敛，并写入 `used`；不要静默改几何
- 新增视口能力 → `industrial-viewer.js` 暴露方法，`industrial.js` 绑定 `[data-tool]`
- 样式 → 只改 `industrial.css`，复用 `--cyan` / `--green` / 等宽数字字体
- 版本 → 同步更新 `industrial.html`、`industrial.js` 里的 `?v=` 时间戳

## 常见任务

### 新增工业零件模板
STEP 1: 在 `industrial-parts.js` 写 `buildXxx(raw)`，返回 `{ shape, steps, notes, used }`
STEP 2: 在 `TEMPLATES` 中登记 `{ id, name, en, tagline, icon, groups, build }`
STEP 3: 刷新页面 → 模板卡片自动出现；调参数检查特征树、体积、STEP / STL 导出

### 调整内核 CDN
TARGET: `industrial.js` 的 `OC_BASES` 与 `OC_WASM_BYTES`
ACTION: 更新版本号与 WASM 体积；保留 jsDelivr → unpkg 回退
TEST: 把首个 CDN 改错，确认仍能装到内核并生成模型

### 排查 STEP 导入 / 导出
LOCATE: `importStepFile()` / `exportStep()`
ACTION: 用导出的 `.step` 再导入，对比体积与包围盒
TEST: 体积与包围盒在毫米单位下一致

## 架构约束
- 渲染仍由 Three.js 负责，OCCT 只负责几何内核；不替换渲染器
- 所有几何单位统一 mm；质量按材料密度换算
- 模板造型在浏览器主线程生成，参数变更做 220 ms 防抖，避免拖拽输入时卡顿
- `used` 回写输入框：参数被自动收敛时 UI 必须反映真实值

## 依赖关系
↑ `../modelinglab.js`（建模实验室子页签，工业建模位于世界模型左侧）
↑ `../../modules.js`（建模实验室懒加载）
→ `../../vendor/replicad/replicad.umd.js`
→ jsDelivr / unpkg（OCCT WASM · Three.js）
→ 浏览器 WebGL2
