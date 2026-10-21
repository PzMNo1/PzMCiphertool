package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Login Response DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String phone;

    private String maskedPhone;

    private String token;

    private String loginTime;

    private String expiresAt;
}
