package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterModelPriceStatusRequest {

    @NotBlank(message = "价格规则 ID 不能为空")
    private String id;

    private Boolean enabled;
}
