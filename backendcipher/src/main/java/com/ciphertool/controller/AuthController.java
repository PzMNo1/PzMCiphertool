package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.LoginRequest;
import com.ciphertool.dto.LoginResponse;
import com.ciphertool.dto.SendCodeRequest;
import com.ciphertool.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * Auth Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Send verification code
     */
    @PostMapping("/send-code")
    public ApiResponse<Void> sendCode(@Valid @RequestBody SendCodeRequest request) {
        log.debug("Send code request: phone={}", maskPhone(request.getPhone()));

        String error = authService.sendCode(request.getPhone());

        if (error != null) {
            return ApiResponse.error(error);
        }

        return ApiResponse.success("验证码已发送");
    }

    /**
     * Login with verification code
     */
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        log.debug("Login request: phone={}", maskPhone(request.getPhone()));

        LoginResponse response = authService.verifyLogin(request.getPhone(), request.getCode());

        if (response == null) {
            return ApiResponse.error("验证码错误或已过期");
        }

        return ApiResponse.success("登录成功", response);
    }

    /**
     * Health check
     */
    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.success("OK", "Service is running");
    }

    private String maskPhone(String phone) {
        String value = phone == null ? "" : phone.replaceAll("\\D", "");
        if (value.startsWith("0086")) {
            value = value.substring(4);
        } else if (value.length() == 13 && value.startsWith("86")) {
            value = value.substring(2);
        }
        if (value.length() != 11) {
            return phone;
        }
        return value.substring(0, 3) + "****" + value.substring(7);
    }
}
