/**
 * PzMAgentool  RC 低通滤波仿真示例
 *
 * 5V / 1kHz 方波经过 1kΩ + 100nF 的 RC 网络，
 * 在 Analog Simulation 中可同时观察输入 VP_IN 与输出 VP_OUT 的波形。
 * 组件带有 0603 封装，因此 PCB 视图也能看到布局（本示例关闭自动布线）。
 */
export default () => (
  <board routingDisabled bomDisabled>
    <voltagesource
      name="V1"
      waveShape="square"
      voltage="5V"
      frequency="1kHz"
      dutyCycle={0.5}
    />

    <resistor
      name="R1"
      resistance="1k"
      footprint="0603"
      pcbX={-4}
      pcbY={0}
    />
    <capacitor
      name="C1"
      capacitance="100nF"
      footprint="0603"
      pcbX={4}
      pcbY={0}
    />

    <trace name="VIN" from=".V1 > .pin1" to=".R1 > .pin1" />
    <trace name="VOUT" from=".R1 > .pin2" to=".C1 > .pin1" />
    <trace name="GND" from=".C1 > .pin2" to=".V1 > .pin2" />

    <voltageprobe name="VP_IN" connectsTo=".R1 > .pin1" />
    <voltageprobe name="VP_OUT" connectsTo=".C1 > .pin1" />

    <analogsimulation
      name="RC 低通滤波"
      duration="5ms"
      timePerStep="0.05ms"
      spiceEngine="spicey"
    />
  </board>
)