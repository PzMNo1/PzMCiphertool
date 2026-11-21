package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AgentRechargePaymentReviewRequest {

    @NotBlank(message = "订单 ID 不能为空")
    private String orderId;

    private String externalTradeNo;

    private String note;
}
