package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Agent 模块充值订单。字段与前端支付页一一对应。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentRechargeOrderInfo {

    private String id;

    private String email;

    private String planId;

    private String planName;

    private double amount;

    private String payMethod;

    private String status;

    private String externalTradeNo;

    private String checkoutUrl;

    private String qrCodeUrl;

    private String paymentInstructions;

    private String paymentExpiresAt;

    private String paymentPayload;

    private String note;

    private String createdAt;

    private String paidAt;

    private String updatedAt;
}
