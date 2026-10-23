package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Developer Login Request DTO
 */
@Data
public class DeveloperLoginRequest {

    @NotBlank(message = "账号不能为空")
    private String account;

    @NotBlank(message = "密码不能为空")
    private String password;
}
