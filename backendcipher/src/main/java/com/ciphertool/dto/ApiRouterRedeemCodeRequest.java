package com.ciphertool.dto;

import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

@Data
public class ApiRouterRedeemCodeRequest extends ApiRouterDashboardRequest {

    /**
     * Optional. Empty means the backend generates a code.
     */
    private String code;

    @DecimalMin(value = "0.0001", message = "兑换金额必须大于 0")
    private double amount;

    private Integer maxUses;

    /**
     * ISO_LOCAL_DATE_TIME string. Empty means never expires.
     */
    private String expiresAt;

    private String note;

    private Boolean enabled;
}
