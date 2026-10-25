package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterSubscriptionPlanStatusRequest {

    @NotBlank(message = "套餐 ID 不能为空")
    private String id;

    private Boolean enabled;
}
