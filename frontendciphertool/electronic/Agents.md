# electronic/ Agents.md

## 功能定位
电子实验室：电路模拟（Falstad CircuitJS）+ 电路板布局（tscircuit PCB 设计 / 仿真）。

## 文件结构
- electronic_lab.js → 子模块切换、iframe 生命周期、Agentmaster 电路 / PCB 桥接
- circuit_builder.js → 结构化电路描述转换为 CircuitJS 网表（纯函数，无 DOM 依赖）
- electionic_lab.css → 电子实验室样式
- war/ → CircuitJS 引擎、示例电路与本地化资源
- PCBLayout/ → tscircuit 工作台：TSX 编辑器、引擎宿主、模板与 vendor 资源

## 核心对象
- `initElectronicLab()` / `electronicLabActivate()`
- `electronicLabSetSubmodule('simulation'|'pcb', ensureLoaded)`
- `window.electronicLabBuildCircuit(spec, options)` / `electronicLabReadCircuit()` / `electronicLabRunCircuit()` / `electronicLabStopCircuit()`
- `window.electronicLabWritePcbCode(code, options)` / `electronicLabReadPcbCode()`
- `window.PzmaCircuitBuilder.build(spec)` → `{ netlist, components, bounds, warnings }`
- `window.PzmaPcbEditor`（PCBLayout/editor.js）→ `getCode` / `setCode` / `run` / `getStatus`

## Agentmaster 桥接
- 电路模拟：`build_circuit` / `read_circuit` / `run_circuit` / `stop_circuit`
- 电路板布局：`edit_pcb_code` / `read_pcb_code`
- 电路网表：`$ 1 ...` 头 + 每行一个元件；坐标 16px 网格；导线只在共享端点处连接
- 布局：并联支路（电源 + 多条 VCC→GND 串联支路）自动排成支路列；串联/混合电路排成横向总线；按画布宽高自动缩放
- 电路检查：自动接地，检测未形成电源到地通路的元件并写入 `warnings`
- PCB 写入后会等待引擎渲染并回传 `errors`；`read_pcb_code` 同时返回引擎状态

## 手机端
- `<=768px` 隐藏大标题，子模块切换改为底部圆形拨盘（沿加密实验室 `submodule-btn` 交互）
- CircuitJS iframe 内部宽度保持至少 620px 后按屏幕宽度缩放，保证“文件 / 编辑 / 绘制 / 示波器 / 选项 / 电路”菜单可见
- `.loading-mask` 在手机端缩小字号并允许换行

## 修改规则
- 新增电路元件：扩展 `circuit_builder.js` 的 `TYPES` / `TYPE_ALIASES`，并验证 `getInfo()` 读数
- 新增子模块：沿用 `electronic-submodule` 面板 + 右上角单按钮切换结构
- 保持纯前端本地资源，不新增后端依赖，不把 vendor 资源改为 CDN

## 绝对禁止
- 不修改 `war/` 下的 CircuitJS 引擎构建产物
- 不修改 agentmaster 的样式
