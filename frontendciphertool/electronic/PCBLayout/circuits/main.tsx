/**
 * DFX 参考板：5V 双路 LED 状态指示
 *
 * DFX（Design for X）落地要点：
 * - 连接器贴板边，测试点 TP1/TP2 可测 5V / GND；
 * - 四角 3.2mm 安装孔 + 两个光学基准点，便于贴片与结构定位；
 * - 电源走线 0.5mm、信号走线 0.25mm，所有元件都在板框内；
 * - 显式 pcbX/pcbY 定位，配合 schX/schY 让原理图按信号流向排布；
 * - 丝印标注板名、输入与状态区，方便装配和返修。
 *
 * 写法参考 tscircuit 官方文档与 MIT 示例（board / trace / fiducial / testpoint）。
 */
export default () => (
  <board width="40mm" height="25mm" bomDisabled>
    <pinheader name="J1" pinCount={2} footprint="pinrow2" pitch="2.54mm" pinLabels={["5V", "GND"]} pcbX={-16} pcbY={0} pcbRotation={90} schX={-8} schY={0} />
    <resistor name="R1" resistance="1k" footprint="0603" pcbX={-8} pcbY={5} schX={-4} schY={2} />
    <led name="D1" footprint="0603" color="green" pcbX={0} pcbY={5} schX={0} schY={2} />
    <resistor name="R2" resistance="1k" footprint="0603" pcbX={-8} pcbY={-5} schX={-4} schY={-2} />
    <led name="D2" footprint="0603" color="red" pcbX={0} pcbY={-5} schX={0} schY={-2} />
    <testpoint name="TP1" footprintVariant="pad" padShape="circle" padDiameter="1.4mm" pcbX={-13} pcbY={3} schX={-6} schY={4} />
    <testpoint name="TP2" footprintVariant="pad" padShape="circle" padDiameter="1.4mm" pcbX={-13} pcbY={-3} schX={-6} schY={-4} />
    <hole name="H1" diameter="3.2mm" pcbX={-17} pcbY={-9.5} />
    <hole name="H2" diameter="3.2mm" pcbX={17} pcbY={-9.5} />
    <hole name="H3" diameter="3.2mm" pcbX={-17} pcbY={9.5} />
    <hole name="H4" diameter="3.2mm" pcbX={17} pcbY={9.5} />
    <fiducial name="FID1" padDiameter="1mm" soldermaskPullback="1mm" pcbX={-11} pcbY={9} />
    <fiducial name="FID2" padDiameter="1mm" soldermaskPullback="1mm" pcbX={11} pcbY={9} />
    <silkscreentext text="DFX LED REFERENCE" pcbX={0} pcbY={11.2} fontSize="1.2mm" />
    <silkscreentext text="5V IN" pcbX={-18} pcbY={-4} fontSize="0.9mm" />
    <silkscreentext text="STATUS LEDS" pcbX={1} pcbY={8} fontSize="0.9mm" />
    <trace from=".J1 > .pin1" to=".R1 > .pin1" width="0.5mm" />
    <trace from=".J1 > .pin1" to=".R2 > .pin1" width="0.5mm" />
    <trace from=".J1 > .pin1" to=".TP1 > .pin1" width="0.5mm" />
    <trace from=".R1 > .pin2" to=".D1 > .pin1" width="0.25mm" />
    <trace from=".R2 > .pin2" to=".D2 > .pin1" width="0.25mm" />
    <trace from=".D1 > .pin2" to=".J1 > .pin2" width="0.25mm" />
    <trace from=".D2 > .pin2" to=".J1 > .pin2" width="0.25mm" />
    <trace from=".J1 > .pin2" to=".TP2 > .pin1" width="0.25mm" />
  </board>
)
