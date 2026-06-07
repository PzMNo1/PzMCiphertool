package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterSubscriptionOrderRequest extends ApiRouterDashboardRequest {

    @NotBlank(message = "套餐 ID 不能为空")
    private String planId;

    private String payMethod;

    private String idempotencyKey;
}
