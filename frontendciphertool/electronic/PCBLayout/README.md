# PCB 设计 / 仿真子模块

本目录是电子实验室「电路板布局」子模块的实现，嵌入了开源 **tscircuit** 的浏览器端 PCB 设计 / 仿真引擎（通过 `@tscircuit/runframe` 提供完整 UI）。

## 1. 开源 PCB 设计 / 仿真引擎调研

| 引擎 | 形态 | 许可证 | 能否直接嵌入本项目的静态前端 | 结论 |
| --- | --- | --- | --- | --- |
| **tscircuit / @tscircuit/runframe** | TypeScript / React，浏览器运行 | MIT | ✅ 可以，纯前端、WebWorker 运行、无需后端 | **已选用** |
| KiCanvas | 浏览器 KiCad 文件查看器 | 非标准 OSI（仓库标注 NOASSERTION，需进一步确认） | ⚠️ 可嵌入但仅查看，无设计 / 仿真 / 布线能力 | 未选用 |
| tracespace / pcb-stackup / gerber-to-svg | Gerber → SVG 渲染工具链 | MIT | ✅ 适合做 Gerber 预览，但不是设计引擎 | 可作为后续 Gerber 预览补充 |
| KiCad | 桌面 EDA（含 pcbnew / ngspice） | GPL-3.0 | ❌ 桌面程序，无法直接嵌入浏览器；可通过 `kicad-cli` 做服务端转换 | 未选用 |
| LibrePCB | 桌面 EDA | GPL-3.0 | ❌ 桌面 Qt 程序 | 未选用 |
| Horizon EDA | 桌面 EDA | GPL-3.0 | ❌ 桌面程序 | 未选用 |
| Fritzing | 桌面 Fritzing | GPL-3.0 | ❌ 桌面程序 | 未选用 |
| pcb-rnd / gEDA | 桌面 EDA | GPL | ❌ 桌面程序 | 未选用 |
| ngspice | SPICE 仿真器 | BSD-like | ⚠️ C 程序，理论上可 WASM 化，但集成成本高 | 未选用；tscircuit 内置 `spicey` JS SPICE 引擎已够用 |
| Falstad CircuitJS | 浏览器电路仿真 | GPL-2.0 | ✅ 已在「电路模拟」子模块中使用 | 与 PCB 布局互补，保留 |

### 为什么选择 tscircuit

1. **浏览器原生**：设计 / 布线 / 原理图 / 3D / SPICE 仿真全部在客户端 WebWorker 中执行，不需要新增后端服务，符合本项目静态前端 + iframe 子模块的架构。
2. **MIT 开源**：`tscircuit`、`@tscircuit/runframe`、`@tscircuit/eval` 均为 MIT 许可，允许本项目本地 vendoring 和二次分发。
3. **设计能力完整**：TSX / React 代码描述电路，自动生成原理图、PCB 布局与自动布线，可导出 Gerber / BOM / Pick-and-Place（具体导出入口在引擎的 `File → Export` 菜单中）。
4. **仿真能力**：内置 `spicey` JS SPICE 引擎，`<analogsimulation />` 可输出瞬态波形，和「电路模拟」中的 CircuitJS 形成互补。
5. **可嵌入性好**：官方提供 `standalone.min.js` 单文件构建和独立 WebWorker 入口，适合放在本项目 `PCBLayout/vendor` 中离线运行。

## 2. 目录结构

```
PCBLayout/
 index.html                  # 工作台外壳：左侧代码编辑 + 右侧引擎 iframe
 viewer.html                 # 引擎宿主：读取代码、解压本地资源、启动 RunFrame
 viewer-i18n.js              # PCB 工具栏英文文案汉化（layer / errors / Rats Nest / Bounds / View）
 editor.js                   # 代码编辑 / 运行 / 模板 / 导入导出逻辑
 pcb_layout.css              # 暗色霓虹主题样式
 circuits/
   main.tsx                 # 默认示例：工业级 STM32 控制板（QFP48 + 电源树 + Flash + 隔离收发器）
   routed-board.tsx         # 入门示例：排针 + 电阻 + LED
   rc-filter.tsx            # RC 低通滤波仿真示例
 vendor/
    tscircuit-runframe-standalone.min.js.gz  # @tscircuit/runframe 0.0.3001（MIT）gzip 压缩
    tscircuit-eval-worker.js.gz              # @tscircuit/eval 0.0.1626 WebWorker（MIT）gzip 压缩
    manifold-3d/                             # manifold-3d 3.2.1（Apache-2.0），3D 视图本地化
    fflate.min.js                            # MIT，旧浏览器 gzip 解压兜底
    LICENSE-*.txt                            # 第三方许可证
    VENDOR_VERSIONS.txt                      # vendoring 版本记录
```

## 3. 本地资源加载方式

- `viewer.html` 使用 `fetch` 读取 `.gz` 资源：
  - 优先使用浏览器原生 `DecompressionStream('gzip')`；
  - 旧浏览器回退到本地 `fflate` 的 `gunzipSync`。
- 解压后的 RunFrame 以 `Blob` URL 注入 `<script>`，WebWorker 也以 Blob URL 启动，不依赖 CDN。
- `3D` 视图所需的 `manifold-3d` 已本地化到 `vendor/manifold-3d/`，RunFrame 内的 CDN 地址已替换为本地路径，完全离线也能进入 3D 视图。
- 进入电子实验室后才会在后台预热 PCB 引擎；首屏和「电路模拟」不受影响，通常看完电路模拟再切换时引擎已就绪。
- 默认将 PCB 渲染引擎设为 `canvas`（兼容 WebGL 浏览器）；引擎右上角菜单中可切换 `WebGPU (experimental)`。
- `TSCIRCUIT_TELEMETRY_DISABLED = true`、`TSCIRCUIT_ALLOW_SELECTING_EVAL_VERSION = false`、`TSCIRCUIT_LATEST_EVAL_VERSION = '0.0.1626'`，避免遥测和版本 CDN 拉取。
- 示例 `<board>` 默认带有 `bomDisabled`，用于关闭 JLCPCB 元件搜索 / BOM，使引擎在完全离线环境下也能快速渲染；如果需要元件价格和 BOM，可移除该属性。

> 注意：由于使用 `fetch` 读取本地 `.gz` 资源，请通过本地 HTTP 服务访问本项目（不要用 `file://` 直接打开 `index.html`）。
> 如果通过 `file://` 打开，页面会提示 “PCB 引擎启动失败”，这是浏览器的本地文件安全限制。

## 4. 使用说明

1. 进入电子实验室，点击右上角的单按钮切换器，从「电路模拟」切换到「电路板布局」。进入实验室后会在后台自动预热 PCB 引擎，先看一会儿电路模拟再切换通常无需等待。
2. 左侧代码侧边栏可以通过右边缘的竖向把手收起 / 展开；收起后引擎视图完整可见。侧边栏采用透明玻璃拟态背景。
3. 左侧编辑 `main.tsx`（tscircuit TSX 代码），按 `Ctrl + Enter` 或点击「▶ 运行仿真」重新渲染。默认模板是一块 120mm × 76mm 的工业级控制板：QFP48 主控、LDO 电源树、SPI Flash、8MHz 晶振、隔离收发器、SWD/UART 调试口、指示灯、测试点、基准点与安装孔。
4. 右侧引擎视图：
   - `PCB`：PCB 布局 / 焊盘 / 走线 / 鼠线；
   - `Schematic`：原理图连线；
   - `3D`：3D 预览；
   - `⋯ More views → Analog Simulation`：SPICE 瞬态波形；
   - `Errors`：PCB/原理图规则检查结果；
   - `File → Export`：导出 Gerber / BOM 等制造文件。
5. 右上角「导入 TSX / 导出 TSX」可导入或导出当前 `main.tsx`。
6. 代码会自动保存在浏览器 `localStorage`（键名 `pzma-pcb-code`）。

## 5. 更新 vendor 引擎

当需要升级 tscircuit 引擎时：

1. 从 npm 下载新版 `@tscircuit/runframe` 的 `dist/standalone.min.js`；
2. 将其中的 `"<--INJECT_TSCIRCUIT_EVAL_WEB_WORKER_BLOB_URL-->"` 替换为：
   ```
   (globalThis.__PZMA_TSCIRCUIT_EVAL_WORKER_URL__||"./vendor/tscircuit-eval-worker.js")
   ```
3. 下载匹配版本的 `@tscircuit/eval` 的 `dist/webworker/entrypoint.js`；
4. 将 manifest 中的 `https://cdn.jsdelivr.net/npm/manifold-3d@<版本>` 替换为 `./vendor/manifold-3d`，并把匹配版本的 `manifold.js`、`manifold.wasm`、`LICENSE` 放入 `vendor/manifold-3d/`；
5. 将两个文件分别 gzip 成 `tscircuit-runframe-standalone.min.js.gz` 和 `tscircuit-eval-worker.js.gz`；
6. 更新 `editor.js` / `viewer.html` / `electronic_lab.js` 中的 `ASSET_VERSION`，避免浏览器继续使用旧 gz 缓存；
7. 更新 `VENDOR_VERSIONS.txt`。`fflate.min.js` 仅在需要升级解压兜底库时更新。

## 6. 许可与致谢

- [tscircuit](https://github.com/tscircuit/tscircuit) - MIT License
- [@tscircuit/runframe](https://github.com/tscircuit/runframe) - MIT License
- [@tscircuit/eval](https://github.com/tscircuit/tscircuit) - MIT License
- [fflate](https://github.com/101arrowz/fflate) - MIT License
- [manifold-3d](https://github.com/elalish/manifold) - Apache-2.0 License

以上项目的许可证文本见 `vendor/LICENSE-*.txt` 与 `vendor/manifold-3d/LICENSE`。