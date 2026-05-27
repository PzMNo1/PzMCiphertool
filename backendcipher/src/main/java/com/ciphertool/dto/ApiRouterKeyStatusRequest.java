package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Enable, pause, or delete an API router key.
 */
@Data
public class ApiRouterKeyStatusRequest extends ApiRouterDashboardRequest {

    @NotBlank(message = "密钥ID不能为空")
    private String keyId;

    private String status;
}
