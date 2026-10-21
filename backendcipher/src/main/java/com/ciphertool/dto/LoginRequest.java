package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Login Request DTO
 */
@Data
public class LoginRequest {

    @NotBlank(message = "手机号不能为空")
    @Pattern(regexp = "^(?:\\+?86|0086)?1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @NotBlank(message = "验证码不能为空")
    @Pattern(regexp = "^\\d{4,6}$", message = "验证码格式不正确")
    private String code;
}
