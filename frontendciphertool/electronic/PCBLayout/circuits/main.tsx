/**
 * PzMAgentool  工业级控制板 —— STM32 核心 + 电源 / 调试 / 存储 / 人机接口
 *
 * 双层控制板示例：QFP48 主控、LDO 电源树、SPI Flash、8MHz 晶振、
 * SWD/UART 调试口、LED 指示、测试点、光学基准点与安装孔。
 * PCB 视图由 tscircuit 自动布线，可切换 Schematic / 3D / Analog Simulation。
 */
export default () => (
  <board width="120mm" height="76mm" bomDisabled autorouterEffortLevel="1x">
    {/* ---------------- 主控与去耦 ---------------- */}
    <chip name="U1" footprint="qfp48" pcbX={0} pcbY={0} />

    <capacitor name="C1" capacitance="100nF" footprint="0402" pcbX={-7.5} pcbY={7.5} />
    <capacitor name="C2" capacitance="100nF" footprint="0402" pcbX={12} pcbY={4} />
    <capacitor name="C3" capacitance="1uF" footprint="0603" pcbX={-7.5} pcbY={-7.5} />
    <capacitor name="C4" capacitance="1uF" footprint="0603" pcbX={7.5} pcbY={-7.5} />
    <capacitor name="C5" capacitance="10uF" footprint="0805" pcbX={12} pcbY={0} />

    {/* ---------------- 电源树 ---------------- */}
    <pinheader name="J1" pinCount={2} footprint="pinrow2" pitch="2.54mm"
      pcbX={-50} pcbY={-24} pcbRotation={90} />
    <fuse name="F1" currentRating="1.5A" footprint="0603" pcbX={-43} pcbY={-31} />
    <diode name="D3" footprint="sod123" pcbX={-36} pcbY={-31} />
    <chip name="U2" footprint="sot23" pcbX={-31} pcbY={-24} />
    <capacitor name="C6" capacitance="10uF" footprint="0805" pcbX={-25} pcbY={-31} />
    <capacitor name="C7" capacitance="100nF" footprint="0402" pcbX={-21} pcbY={-31} />
    <inductor name="L1" inductance="10uH" footprint="0805" pcbX={-25} pcbY={-18} />

    {/* ---------------- 晶振 ---------------- */}
    <crystal name="Y1" footprint="hc49" pcbX={10} pcbY={9} frequency="8MHz" loadCapacitance="18pF" />
    <capacitor name="C8" capacitance="22pF" footprint="0402" pcbX={6} pcbY={14} />
    <capacitor name="C9" capacitance="22pF" footprint="0402" pcbX={14} pcbY={14} />

    {/* ---------------- 隔离收发器 ---------------- */}
    <chip name="U4" footprint="soic8" pcbX={36} pcbY={21} />
    <pinheader name="J5" pinCount={4} footprint="pinrow4" pitch="2.54mm"
      pcbX={52} pcbY={20} pcbRotation={90} />
    <resistor name="R6" resistance="120" footprint="0402" pcbX={44} pcbY={27} />
    <resistor name="R7" resistance="10k" footprint="0402" pcbX={44} pcbY={17} />
    <diode name="D6" footprint="sod323" pcbX={48} pcbY={27} />
    <capacitor name="C11" capacitance="100nF" footprint="0402" pcbX={29} pcbY={17} />

    {/* ---------------- SPI Flash ---------------- */}
    <chip name="U3" footprint="soic8" pcbX={32} pcbY={-20} />
    <capacitor name="C10" capacitance="100nF" footprint="0402" pcbX={24} pcbY={-25} />

    {/* ---------------- 调试 / 通信接口 ---------------- */}
    <pinheader name="J2" pinCount={10} footprint="pinrow10" pitch="2.54mm"
      pcbX={-50} pcbY={2} pcbRotation={90} />
    <pinheader name="J3" pinCount={6} footprint="pinrow6" pitch="2.54mm"
      pcbX={-50} pcbY={26} pcbRotation={90} />
    <pinheader name="J4" pinCount={4} footprint="pinrow4" pitch="2.54mm"
      pcbX={52} pcbY={-24} pcbRotation={90} />

    {/* ---------------- 人机接口 ---------------- */}
    <pushbutton name="SW1" footprint="pushbutton" pcbX={-30} pcbY={30} />
    <resistor name="R1" resistance="10k" footprint="0402" pcbX={-22} pcbY={26} />
    <resistor name="R2" resistance="1k" footprint="0402" pcbX={42} pcbY={8} />
    <resistor name="R3" resistance="1k" footprint="0402" pcbX={42} pcbY={2} />
    <led name="D1" footprint="0603" color="green" pcbX={49} pcbY={8} />
    <led name="D2" footprint="0603" color="blue" pcbX={49} pcbY={2} />
    <led name="D5" footprint="0603" color="red" pcbX={49} pcbY={-4} />
    <resistor name="R5" resistance="1k" footprint="0402" pcbX={42} pcbY={-4} />

    {/* ---------------- 电流检测 / 保护 ---------------- */}
    <mosfet name="Q1" mosfetMode="enhancement" channelType="n" footprint="sot23" pcbX={-18} pcbY={-30} />
    <resistor name="R4" resistance="0.05" footprint="0805" pcbX={-12} pcbY={-30} />
    <diode name="D4" footprint="sod323" pcbX={-6} pcbY={-30} />

    {/* ---------------- 测试点 ---------------- */}
    <testpoint name="TP1" footprintVariant="pad" padShape="circle" padDiameter="1.4mm" pcbX={-16} pcbY={-35} />
    <testpoint name="TP2" footprintVariant="pad" padShape="circle" padDiameter="1.4mm" pcbX={-11} pcbY={-35} />
    <testpoint name="TP3" footprintVariant="pad" padShape="circle" padDiameter="1.4mm" pcbX={-6} pcbY={-35} />
    <testpoint name="TP4" footprintVariant="pad" padShape="circle" padDiameter="1.4mm" pcbX={0} pcbY={-35} />
    <testpoint name="TP5" footprintVariant="pad" padShape="circle" padDiameter="1.4mm" pcbX={6} pcbY={-35} />
    <testpoint name="TP6" footprintVariant="pad" padShape="circle" padDiameter="1.4mm" pcbX={12} pcbY={-35} />

    {/* ---------------- 安装孔与基准点 ---------------- */}
    <hole name="H1" diameter="3.2mm" pcbX={-55} pcbY={-34} />
    <hole name="H2" diameter="3.2mm" pcbX={55} pcbY={-34} />
    <hole name="H3" diameter="3.2mm" pcbX={-55} pcbY={34} />
    <hole name="H4" diameter="3.2mm" pcbX={55} pcbY={34} />
    <fiducial name="FID1" padDiameter="1mm" soldermaskPullback="1mm" pcbX={-46} pcbY={34} />
    <fiducial name="FID2" padDiameter="1mm" soldermaskPullback="1mm" pcbX={46} pcbY={34} />
    <fiducial name="FID3" padDiameter="1mm" soldermaskPullback="1mm" pcbX={0} pcbY={-33} />

    {/* ---------------- 丝印图框与标识 ---------------- */}
    <silkscreenpath route={[
      { x: -57, y: -36 }, { x: 57, y: -36 }, { x: 57, y: 36 }, { x: -57, y: 36 }, { x: -57, y: -36 }
    ]} />
    <silkscreenpath route={[
      { x: -55, y: -30 }, { x: -17, y: -30 }, { x: -17, y: 34 }, { x: -55, y: 34 }, { x: -55, y: -30 }
    ]} />
    <silkscreenpath route={[
      { x: 28, y: 13 }, { x: 56, y: 13 }, { x: 56, y: 32 }, { x: 28, y: 32 }, { x: 28, y: 13 }
    ]} />
    <silkscreentext text="PZM-ECU-01" pcbX={12} pcbY={33.5} fontSize="2.2mm" anchorAlignment="bottom_left" />
    <silkscreentext text="REV D  /  2026-10" pcbX={12} pcbY={31} fontSize="1.05mm" anchorAlignment="bottom_left" />
    <silkscreentext text="POWER INPUT" pcbX={-44} pcbY={-19} fontSize="1.1mm" />
    <silkscreentext text="SWD / UART" pcbX={-44} pcbY={14} fontSize="1.1mm" />
    <silkscreentext text="MCU CORE" pcbX={0} pcbY={30} fontSize="1.3mm" />
    <silkscreentext text="SPI FLASH" pcbX={32} pcbY={-29} fontSize="1mm" />
    <silkscreentext text="8.000 MHz" pcbX={10} pcbY={16.5} fontSize="0.9mm" />
    <silkscreentext text="RS-485 / CAN" pcbX={29} pcbY={14.2} fontSize="1mm" anchorAlignment="bottom_left" />
    <silkscreentext text="STATUS" pcbX={48} pcbY={12.5} fontSize="0.9mm" />
    <silkscreentext text="USB / DEBUG" pcbX={49} pcbY={-18} fontSize="1mm" />
    <silkscreentext text="TP-ARRAY" pcbX={-3} pcbY={-33.5} fontSize="0.85mm" />
    <silkscreentext text="CE  /  RoHS" pcbX={24} pcbY={-33.5} fontSize="0.85mm" anchorAlignment="bottom_left" />
    <silkscreentext text="2L  1.6mm  ENIG" pcbX={35} pcbY={-33.5} fontSize="0.8mm" anchorAlignment="bottom_left" />
    <silkscreentext text="SN: PZM-2026-0001" pcbX={35} pcbY={33.5} fontSize="0.9mm" />
    <silkscreentext text="+3V3" pcbX={-38} pcbY={-35} fontSize="0.85mm" />
    <silkscreentext text="GND" pcbX={-31} pcbY={-35} fontSize="0.85mm" />
    <silkscreentext text="BOOT" pcbX={-26} pcbY={34} fontSize="0.85mm" />
    <silkscreentext text="RESET" pcbX={-37} pcbY={27} fontSize="0.85mm" />

    {/* ---------------- 电源与地网络 ---------------- */}
    <trace from=".J1 > .pin1" to=".F1 > .pin1" />
    <trace from=".F1 > .pin2" to=".D3 > .pin1" />
    <trace from=".D3 > .pin2" to=".U2 > .pin1" />
    <trace from=".U2 > .pin3" to=".L1 > .pin1" />
    <trace from=".L1 > .pin2" to=".U1 > .pin1" />
    <trace from=".U2 > .pin3" to=".U1 > .pin12" />
    <trace from=".U2 > .pin3" to=".U1 > .pin24" />
    <trace from=".U2 > .pin3" to=".U1 > .pin36" />
    <trace from=".U2 > .pin2" to=".J1 > .pin2" />
    <trace from=".U1 > .pin8" to=".J1 > .pin2" />
    <trace from=".U1 > .pin20" to=".J1 > .pin2" />
    <trace from=".U1 > .pin32" to=".J1 > .pin2" />
    <trace from=".U1 > .pin44" to=".J1 > .pin2" />

    {/* ---------------- Flash ---------------- */}
    <trace from=".U3 > .pin1" to=".U1 > .pin10" />
    <trace from=".U3 > .pin2" to=".U1 > .pin11" />
    <trace from=".U3 > .pin4" to=".J1 > .pin2" />
    <trace from=".U3 > .pin5" to=".U1 > .pin13" />
    <trace from=".U3 > .pin6" to=".U1 > .pin14" />
    <trace from=".U3 > .pin7" to=".U2 > .pin3" />
    <trace from=".U3 > .pin8" to=".U2 > .pin3" />

    {/* ---------------- 人机接口与调试 ---------------- */}
    <trace from=".R2 > .pin1" to=".U1 > .pin15" />
    <trace from=".R2 > .pin2" to=".D1 > .pin1" />
    <trace from=".D1 > .pin2" to=".J1 > .pin2" />
    <trace from=".R3 > .pin1" to=".U1 > .pin16" />
    <trace from=".R3 > .pin2" to=".D2 > .pin1" />
    <trace from=".D2 > .pin2" to=".J1 > .pin2" />
    <trace from=".SW1 > .pin1" to=".U1 > .pin7" />
    <trace from=".SW1 > .pin2" to=".J1 > .pin2" />
    <trace from=".R1 > .pin1" to=".U2 > .pin3" />
    <trace from=".R1 > .pin2" to=".SW1 > .pin1" />
    <trace from=".J2 > .pin1" to=".U2 > .pin3" />
    <trace from=".J2 > .pin2" to=".U1 > .pin17" />
    <trace from=".J2 > .pin3" to=".U1 > .pin18" />
    <trace from=".J2 > .pin5" to=".J1 > .pin2" />
    <trace from=".J3 > .pin1" to=".U2 > .pin3" />
    <trace from=".J3 > .pin2" to=".U1 > .pin21" />
    <trace from=".J3 > .pin3" to=".U1 > .pin22" />
    <trace from=".J3 > .pin6" to=".J1 > .pin2" />
    <trace from=".J4 > .pin1" to=".U2 > .pin3" />
    <trace from=".J4 > .pin4" to=".J1 > .pin2" />

    {/* ---------------- 隔离收发器 ---------------- */}
    <trace from=".U4 > .pin1" to=".U1 > .pin23" />
    <trace from=".U4 > .pin2" to=".U1 > .pin25" />
    <trace from=".U4 > .pin3" to=".U1 > .pin27" />
    <trace from=".U4 > .pin4" to=".U1 > .pin29" />
    <trace from=".U4 > .pin5" to=".J1 > .pin2" />
    <trace from=".U4 > .pin6" to=".J5 > .pin1" />
    <trace from=".U4 > .pin7" to=".J5 > .pin2" />
    <trace from=".U4 > .pin8" to=".U2 > .pin3" />
    <trace from=".J5 > .pin4" to=".J1 > .pin2" />
  </board>
)






