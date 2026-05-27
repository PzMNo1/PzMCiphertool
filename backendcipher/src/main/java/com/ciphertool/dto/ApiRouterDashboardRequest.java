package com.ciphertool.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request scoped to one API router dashboard owner.
 */
@Data
public class ApiRouterDashboardRequest {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    private String range = "7";

    private String granularity = "day";
}
