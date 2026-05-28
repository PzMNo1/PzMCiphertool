package com.ciphertool.dto;

import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

@Data
public class ApiRouterWalletCreditRequest extends ApiRouterDashboardRequest {

    private String targetEmail;

    @DecimalMin(value = "0.0001", message = "充值金额必须大于 0")
    private double amount;

    private String description;
}
