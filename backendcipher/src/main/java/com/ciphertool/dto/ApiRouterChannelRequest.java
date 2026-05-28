package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterChannelRequest extends ApiRouterDashboardRequest {

    private String id;

    @NotBlank(message = "渠道名称不能为空")
    private String name;

    private String provider;

    @NotBlank(message = "上游地址不能为空")
    private String baseUrl;

    /**
     * Plain upstream key. Empty on update means keep the stored key.
     */
    private String apiKey;

    private String models;

    private Integer priority;

    private Integer weight;

    private Boolean enabled;

    private Boolean retryEnabled;
}
