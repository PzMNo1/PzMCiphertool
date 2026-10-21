package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Send Code Request DTO
 */
@Data
public class SendCodeRequest {

    @NotBlank(message = "手机号不能为空")
    @Pattern(regexp = "^(?:\\+?86|0086)?1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;
}
