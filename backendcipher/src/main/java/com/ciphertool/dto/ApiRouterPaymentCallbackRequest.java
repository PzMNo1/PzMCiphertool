package com.ciphertool.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterPaymentCallbackRequest {

    @NotBlank(message = "订单 ID 不能为空")
    private String orderId;

    @DecimalMin(value = "0.0001", message = "回调金额必须大于 0")
    private double amount;

    /**
     * alipay/wechat/manual-test.
     */
    private String payMethod;

    @NotBlank(message = "支付流水号不能为空")
    private String externalTradeNo;

    private String status;

    /**
     * Epoch milliseconds, used for replay protection.
     */
    private long timestamp;

    @NotBlank(message = "回调 nonce 不能为空")
    private String nonce;

    /**
     * HMAC-SHA256 over:
     * orderId|amount|payMethod|externalTradeNo|status|timestamp|nonce
     */
    @NotBlank(message = "签名不能为空")
    private String signature;
}
