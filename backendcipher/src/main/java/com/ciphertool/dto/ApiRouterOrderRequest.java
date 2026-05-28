package com.ciphertool.dto;

import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

@Data
public class ApiRouterOrderRequest extends ApiRouterDashboardRequest {

    @DecimalMin(value = "0.0001", message = "订单金额必须大于 0")
    private double amount;

    /**
     * manual now; alipay/wechat later.
     */
    private String payMethod;

    /**
     * Client-generated idempotency key. Reusing it returns the same order.
     */
    private String idempotencyKey;

    private String note;
}
