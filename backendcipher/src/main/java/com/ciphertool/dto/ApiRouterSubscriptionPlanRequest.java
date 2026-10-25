package com.ciphertool.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterSubscriptionPlanRequest extends ApiRouterDashboardRequest {

    private String id;

    @NotBlank(message = "套餐名称不能为空")
    private String name;

    @DecimalMin(value = "0.0", message = "套餐售价不能小于 0")
    private double price;

    @DecimalMin(value = "0.0", message = "到账余额不能小于 0")
    private double credit;

    private String quota;

    private String badge;

    private Integer priority;

    private Boolean enabled;

    private String note;
}
