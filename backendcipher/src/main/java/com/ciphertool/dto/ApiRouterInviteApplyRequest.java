package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterInviteApplyRequest extends ApiRouterDashboardRequest {

    @NotBlank(message = "邀请码不能为空")
    private String code;
}
