package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AgentRechargeOrderRequest {

    @NotBlank(message = "套餐不能为空")
    private String planId;

    private String payMethod;

    private String idempotencyKey;

    private String note;
}
