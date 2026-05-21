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
        log.debug("Send code request: email={}", maskEmail(request.getEmail()));
        
        String error = authService.sendCode(request.getEmail());
        
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
        log.debug("Login request: email={}", maskEmail(request.getEmail()));
        
        LoginResponse response = authService.verifyLogin(request.getEmail(), request.getCode());
        
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

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        int atIndex = email.indexOf("@");
        if (atIndex <= 3) {
            return email;
        }
        return email.substring(0, 3) + "****" + email.substring(atIndex);
    }
}








