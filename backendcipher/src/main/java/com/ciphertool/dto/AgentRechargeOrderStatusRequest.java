package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AgentRechargeOrderStatusRequest {

    @NotBlank(message = "订单 ID 不能为空")
    private String orderId;

    @NotBlank(message = "订单状态不能为空")
    private String status;

    private String externalTradeNo;

    private String note;
}
