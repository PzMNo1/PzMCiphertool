package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterChannelStatusRequest extends ApiRouterDashboardRequest {

    @NotBlank(message = "渠道 ID 不能为空")
    private String channelId;

    private Boolean enabled;
}
