package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterRedeemRequest extends ApiRouterDashboardRequest {

    @NotBlank(message = "兑换码不能为空")
    private String code;
}
