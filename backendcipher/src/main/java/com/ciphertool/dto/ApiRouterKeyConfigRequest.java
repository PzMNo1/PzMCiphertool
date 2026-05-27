package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Update an API router key's name, quota, and per-key rate limits.
 */
@Data
public class ApiRouterKeyConfigRequest extends ApiRouterDashboardRequest {

    @NotBlank(message = "密钥ID不能为空")
    private String keyId;

    private String name;

    private String quota;

    /** Per-key RPM limit. null = don't change, 0 = use global default. */
    private Integer keyRpm;

    /** Per-key TPM limit. null = don't change, 0 = use global default. */
    private Long keyTpm;
}
