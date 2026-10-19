/**
 * PzMAgentool  已自动布线示例
 *
 * J1 为 2pin 排针（电源输入），R1 为 1k 限流电阻，D1 为 LED 指示灯。
 * tscircuit 的 PCB 引擎会自动为这些网络布线（autorouting）。
 *
 * 注意：如果自动布线时间较长，请等待右侧 PCB 视图完成更新；
 *       若要关闭自动布线、只做布局，可在 <board> 上添加 routingDisabled。
 */
export default () => (
  <board width="30mm" height="20mm" bomDisabled>
    <pinheader
      name="J1"
      pinCount={2}
      gender="male"
      pitch="2.54mm"
      footprint="pinrow2"
      pinLabels={["VCC", "GND"]}
      pcbX={-10}
      pcbY={0}
    />

    <resistor
      name="R1"
      resistance="1k"
      footprint="0603"
      pcbX={0}
      pcbY={-3}
    />
    <led
      name="D1"
      footprint="0603"
      color="green"
      pcbX={8}
      pcbY={0}
    />

    <trace from=".J1 > .pin1" to=".R1 > .pin1" />
    <trace from=".R1 > .pin2" to=".D1 > .pin1" />
    <trace from=".D1 > .pin2" to=".J1 > .pin2" />
  </board>
)