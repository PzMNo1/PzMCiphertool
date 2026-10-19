/**
 * PzMAgentool  电路板设计 / 仿真示例
 *
 * 这是一个LED 限流 + SPICE 瞬态仿真组合示例：
 *   - PCB 视图：显示 R1（0603 电阻）、D1（0603 LED）的封装与焊盘；
 *   - 原理图视图：显示电压源、电阻、LED 的连线关系；
 *   - Analog Simulation：运行 spicey 引擎的瞬态仿真，观察 LED 阳极电压波形。
 *
 * 提示：
 *   1) 左侧代码编辑完成后按 Ctrl+Enter（或点击运行仿真）重新载入引擎；
 *   2) 在右侧引擎顶部点击 PCB / Schematic / 3D 切换视图；
 *   3) 右侧 More views -> Analog Simulation 查看 SPICE 波形。
 */
export default () => (
  <board routingDisabled bomDisabled>
    <voltagesource name="V1" voltage="5V" />

    <resistor
      name="R1"
      resistance="1k"
      footprint="0603"
      pcbX={-4}
      pcbY={0}
    />
    <led
      name="D1"
      footprint="0603"
      color="red"
      pcbX={4}
      pcbY={0}
    />

    <trace from=".V1 > .pin1" to=".R1 > .pin1" />
    <trace from=".R1 > .pin2" to=".D1 > .pin1" />
    <trace from=".D1 > .pin2" to=".V1 > .pin2" />

    <voltageprobe name="VP_LED_A" connectsTo=".D1 > .pin1" />
    <voltageprobe name="VP_LED_K" connectsTo=".D1 > .pin2" />

    <analogsimulation
      name="LED 启动波形"
      duration="10ms"
      timePerStep="0.1ms"
      spiceEngine="spicey"
    />
  </board>
)