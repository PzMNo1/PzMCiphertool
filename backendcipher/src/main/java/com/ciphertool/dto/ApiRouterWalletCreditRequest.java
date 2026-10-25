package com.ciphertool.dto;

import lombok.Data;

@Data
public class ApiRouterWalletCreditRequest extends ApiRouterDashboardRequest {

    private String targetEmail;

    private double amount;

    private String description;
}
