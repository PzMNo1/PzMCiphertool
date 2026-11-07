# goneyeyinqing/ Agents.md

## 功能定位
建模实验室 · 工业建模子模块。自研工业建模界面已整体移除，当前子模块是开源浏览器 CAD 应用 **Cascade Studio** 的全屏嵌入入口。

Cascade Studio 是 MIT 许可的浏览器端 CAD 环境，基于 OpenCascade.js，支持草图、拉伸、布尔、圆角、参数化脚本、STEP / STL / OBJ 导入导出。

## 文件结构
- industrial.html → Cascade Studio 全屏 iframe 容器；保持无自有工具栏、无回退面板的纯嵌入
- cascadestudio/ → 已本地化的 Cascade Studio 静态运行产物
  - index.html / main.js / cascade-worker.js / cascadestudio.wasm
  - monaco-editor/ / css/ / fonts/ / textures/ / typedefs/ / icon/
  - service-worker.js / manifest.webmanifest / LICENSE
- Agents.md → 本说明

## 上游项目
- 线上演示：https://zalo.github.io/CascadeStudio/
- 源码：https://github.com/zalo/CascadeStudio
- 许可：MIT（本地 `cascadestudio/LICENSE`）

## 修改规则
- 本子模块不再维护自研建模 UI、OCCT 包装层或零件模板
- 升级 Cascade Studio 时整体替换 `cascadestudio/` 静态产物，并同步 `industrial.html` 的版本号
- 不要恢复 `industrial.js` / `industrial.css` / `industrial-parts.js` / `industrial-viewer.js`
- 不在嵌入页叠加自定义 UI；运行时不依赖远端页面

## 依赖关系
↑ `../modelinglab.js`（建模实验室子页签）
→ `./cascadestudio/index.html`（本地 iframe）
→ 浏览器本地 WebAssembly / Monaco / OpenCascade.js

## Agentmaster 桥接
- `../modelinglab.js` 暴露 `window.industrialCadBridge`
- `write_industrial_code` 写入完整 Cascade Studio 脚本并执行
- `read_industrial_code` 读取当前脚本
- `run_industrial_code` 重新执行当前脚本
- `industrial_status` 查询内核和错误状态
- `industrial_reference` 获取 Cascade Studio API 摘要
