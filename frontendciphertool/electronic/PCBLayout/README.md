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

### DFX / DFM 开源工具调研

DFX = Design for X（可制造性 DFM、可装配性 DFA、可测试性 DFT、成本与可靠性等）。目前没有成熟且能直接嵌入浏览器 iframe 的「DFX 引擎」；可复用的开源积木主要是：

- [@tscircuit/checks](https://github.com/tscircuit/checks)（MIT）：Circuit JSON 的 DRC / 布局 / 原理图规则检查（走线重叠与间距、焊盘/过孔间距、元件重叠、板边越界、连接器与测试点可达性、原理图排版等）。`@tscircuit/runframe` 内置了同一套检查，引擎工具栏的「0 个错误」与 `Errors` 页即其输出。
- [KiCad](https://www.kicad.org) DRC / ERC（GPL-3.0）：规则最完整，但属于桌面程序，无法直接嵌入静态前端。
- [KiKit](https://github.com/yaqwsx/KiKit)（MIT）：拼板、邮票孔、V-cut、基准点等制造准备。
- [pygerber](https://github.com/Argmaster/pygerber)（MIT）、[pcb-tools](https://github.com/curtacircuitos/pcb-tools)（MIT）、[tracespace](https://tracespace.io)（MIT）：Gerber 解析、渲染与 DFM 检查，适合后端 / Node 侧。
- [Awesome PCB Workflow](https://github.com/salitronic/awesome-pcb-workflow)：DFM、测试、SI/EMC 等开源工具清单，可继续按需引入。

因此本项目采用「引擎内置 DRC（@tscircuit/checks）+ DFX 设计清单 + Agentmaster 生成约束」的组合，而不是再嵌入一个重型 DFX 引擎。默认示例 `main.tsx` 已按 DFX 清单落地：板框与安装孔、光学基准点、测试点、贴边连接器、丝印标注、分开的电源/信号线宽、显式布局坐标与可读的原理图坐标。

### 为什么选择 tscircuit

1. **浏览器原生**：设计 / 布线 / 原理图 / 3D / SPICE 仿真全部在客户端 WebWorker 中执行，不需要新增后端服务，符合本项目静态前端 + iframe 子模块的架构。
2. **MIT 开源**：`tscircuit`、`@tscircuit/runframe`、`@tscircuit/eval` 均为 MIT 许可，允许本项目本地 vendoring 和二次分发。
3. **设计能力完整**：TSX / React 代码描述电路，自动生成原理图、PCB 布局与自动布线，可导出 Gerber / BOM / Pick-and-Place（具体导出入口在引擎的 `文件 → 导出` 菜单中）。
4. **仿真能力**：内置 `spicey` JS SPICE 引擎，`<analogsimulation />` 可输出瞬态波形，和「电路模拟」中的 CircuitJS 形成互补。
5. **可嵌入性好**：官方提供 `standalone.min.js` 单文件构建和独立 WebWorker 入口，适合放在本项目 `PCBLayout/vendor` 中离线运行。

## 2. 目录结构

```
PCBLayout/
 index.html                  # 工作台外壳：引擎全区铺满 + 左侧代码浮层
 viewer.html                 # 引擎宿主：读取代码、解压本地资源、启动 RunFrame
 viewer-i18n.js              # 引擎文案汉化（PCB 工具栏 + 文件 / 视图菜单）
 editor.js                   # 代码编辑 / 运行 / 模板 / 导入导出逻辑
 pcb_layout.css              # 暗色霓虹主题样式（面板 / 按钮沿用 0_zhuyeyangshi.css 的 .result、.cyber-button）
 circuits/
   main.tsx                 # 默认示例：DFX 参考板（双路 LED + 测试点 + 安装孔 + 基准点）
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
2. 左侧代码侧边栏可以通过右边缘的竖向把手收起 / 展开；收起后引擎视图完整可见。侧边栏采用与加密实验室 `.result` 一致的深蓝浮层，按钮与把手沿用 `.cyber-button` 的霓虹样式。
3. 左侧编辑 `main.tsx`（tscircuit TSX 代码），按 `Ctrl + Enter` 或点击「▶ 运行仿真」重新渲染。默认模板是一块 40mm × 25mm 的 DFX 参考板：J1 5V 输入、R1/D1 与 R2/D2 两路 LED 状态指示、TP1/TP2 测试点、四角 3.2mm 安装孔、两个光学基准点与丝印；电源走线 0.5mm、信号走线 0.25mm，并用 `pcbX/pcbY`、`schX/schY` 显式控制 PCB 与原理图布局。旧版工业板示例会在首次升级时自动迁移为该参考板，之后保留用户自己的修改。
4. 右侧引擎视图：
   - `PCB`：PCB 布局 / 焊盘 / 走线 / 鼠线；
   - `Schematic`：原理图连线；
   - `3D`：3D 预览；
   - `⋯ More views → Analog Simulation`：SPICE 瞬态波形；
   - `Errors`：PCB/原理图规则检查结果；
   - `文件 → 导出`：导出 Gerber / BOM 等制造文件。
5. 右上角「导入 TSX / 导出 TSX」可导入或导出当前 `main.tsx`。
6. 代码会自动保存在浏览器 `localStorage`（键名 `pzma-pcb-code`）。
7. Agentmaster（悬浮球）可通过 `edit_pcb_code` / `read_pcb_code` 工具直接读写左侧 `main.tsx`：例如「帮我在电路板左侧写一个 5V LED 指示板」会自动切到「电子实验室 → 电路板布局」、展开代码侧栏并写入重跑；「看看现在左侧的代码」会读回当前文件。写入前会自动修正常见 TSX 语法（trace `thickness`→`width`、fiducial `padDiameter`、testpoint `footprint`、丝印 `fontSize` 单位），写入后会等待引擎渲染并把 PCB 引擎的 `errors` 一并回传；位置越界会按引擎提示微调后重跑。`read_pcb_code` 也会附带引擎就绪状态和当前错误。写入完成后仍可继续用其它模块切换与 Agentmaster 操作，互不影响。

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
- [@tscircuit/checks](https://github.com/tscircuit/checks) - MIT License（RunFrame 内置 DRC / 布局 / 原理图检查）
- [fflate](https://github.com/101arrowz/fflate) - MIT License
- [manifold-3d](https://github.com/elalish/manifold) - Apache-2.0 License

以上项目的许可证文本见 `vendor/LICENSE-*.txt` 与 `vendor/manifold-3d/LICENSE`。