package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterKeyConfigRequest;
import com.ciphertool.dto.ApiRouterKeyCreateResponse;
import com.ciphertool.dto.ApiRouterKeyRequest;
import com.ciphertool.dto.ApiRouterKeyStatusRequest;
import com.ciphertool.service.ApiRouterService;
import com.ciphertool.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/api-router")
@RequiredArgsConstructor
public class ApiRouterKeyController {

    private final ApiRouterService apiRouterService;
    private final AuthService authService;
    private final ApiRouterControllerSupport support;

    @Value("${api-router.risk.key-create-per-hour:10}")
    private int keyCreatePerHour;

    @PostMapping("/keys")
    public ApiResponse<ApiRouterKeyCreateResponse> createApiKey(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody ApiRouterKeyRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        support.requireUserAndIpLimit(
                ownerEmail,
                servletRequest,
                "key-create",
                keyCreatePerHour,
                Duration.ofHours(1),
                "API 密钥创建过于频繁，请稍后再试"
        );
        return ApiResponse.success(
                "API key created",
                apiRouterService.createApiKey(
                        ownerEmail,
                        request.getRange(),
                        request.getGranularity(),
                        request.getName(),
                        request.getQuota()
                )
        );
    }

    @PostMapping("/keys/status")
    public ApiResponse<ApiRouterDashboard> updateApiKeyStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterKeyStatusRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success(
                "API key status updated",
                apiRouterService.updateApiKeyStatus(
                        ownerEmail,
                        request.getRange(),
                        request.getGranularity(),
                        request.getKeyId(),
                        request.getStatus()
                )
        );
    }

    @PostMapping("/keys/delete")
    public ApiResponse<ApiRouterDashboard> deleteApiKey(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterKeyStatusRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success(
                "API key deleted",
                apiRouterService.deleteApiKey(
                        ownerEmail,
                        request.getRange(),
                        request.getGranularity(),
                        request.getKeyId()
                )
        );
    }

    @PostMapping("/keys/config")
    public ApiResponse<ApiRouterDashboard> updateApiKeyConfig(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterKeyConfigRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success(
                "API key config updated",
                apiRouterService.updateApiKeyConfig(
                        ownerEmail,
                        request.getRange(),
                        request.getGranularity(),
                        request.getKeyId(),
                        request.getName(),
                        request.getQuota(),
                        request.getKeyRpm(),
                        request.getKeyTpm()
                )
        );
    }
}
