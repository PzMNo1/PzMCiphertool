package com.ciphertool.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterModelPriceRequest {

    private String id;

    @NotBlank(message = "模型匹配规则不能为空")
    private String modelPattern;

    private String provider;

    private String channelId;

    @DecimalMin(value = "0.0", message = "输入价格不能小于 0")
    private double inputPricePerMillion;

    @DecimalMin(value = "0.0", message = "输出价格不能小于 0")
    private double outputPricePerMillion;

    private Integer priority;

    private Boolean enabled;

    private String note;
}
