package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterChannelHealthCheckRequest;
import com.ciphertool.dto.ApiRouterStatus;
import com.ciphertool.service.ApiRouterService;
import com.ciphertool.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/api-router")
@RequiredArgsConstructor
public class ApiRouterOpsController {

    private final ApiRouterService apiRouterService;
    private final AuthService authService;
    private final ApiRouterControllerSupport support;

    @GetMapping("/status")
    public ApiResponse<ApiRouterStatus> getStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "false") boolean admin) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        if (admin) {
            support.requireAdmin(operatorEmail);
        }
        return ApiResponse.success("Status loaded", apiRouterService.getGatewayStatus(admin));
    }

    @PostMapping("/status/check")
    public ApiResponse<ApiRouterStatus> checkStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterChannelHealthCheckRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        support.requireAdmin(operatorEmail);
        return ApiResponse.success("Channel health checked", apiRouterService.checkChannelHealth(request.getChannelId(), true));
    }
}
