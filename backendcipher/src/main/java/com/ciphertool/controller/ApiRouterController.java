package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterDashboardRequest;
import com.ciphertool.dto.ApiRouterKeyConfigRequest;
import com.ciphertool.dto.ApiRouterKeyCreateResponse;
import com.ciphertool.dto.ApiRouterKeyRequest;
import com.ciphertool.dto.ApiRouterKeyStatusRequest;
import com.ciphertool.service.ApiRouterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/api-router")
@RequiredArgsConstructor
public class ApiRouterController {

    private final ApiRouterService apiRouterService;

    @GetMapping("/dashboard")
    public ApiResponse<ApiRouterDashboard> getDashboard(
            @RequestParam String email,
            @RequestParam(defaultValue = "7") String range,
            @RequestParam(defaultValue = "day") String granularity) {
        return ApiResponse.success("Success", apiRouterService.getDashboard(email, range, granularity));
    }

    @PostMapping("/refresh")
    public ApiResponse<ApiRouterDashboard> refreshDashboard(@Valid @RequestBody ApiRouterDashboardRequest request) {
        return ApiResponse.success(
                "Dashboard refreshed",
                apiRouterService.refreshDashboard(request.getEmail(), request.getRange(), request.getGranularity())
        );
    }

    @PostMapping("/keys")
    public ApiResponse<ApiRouterKeyCreateResponse> createApiKey(@Valid @RequestBody ApiRouterKeyRequest request) {
        return ApiResponse.success(
                "API key created",
                apiRouterService.createApiKey(
                        request.getEmail(),
                        request.getRange(),
                        request.getGranularity(),
                        request.getName(),
                        request.getQuota()
                )
        );
    }

    @PostMapping("/keys/status")
    public ApiResponse<ApiRouterDashboard> updateApiKeyStatus(@Valid @RequestBody ApiRouterKeyStatusRequest request) {
        return ApiResponse.success(
                "API key status updated",
                apiRouterService.updateApiKeyStatus(
                        request.getEmail(),
                        request.getRange(),
                        request.getGranularity(),
                        request.getKeyId(),
                        request.getStatus()
                )
        );
    }

    @PostMapping("/keys/delete")
    public ApiResponse<ApiRouterDashboard> deleteApiKey(@Valid @RequestBody ApiRouterKeyStatusRequest request) {
        return ApiResponse.success(
                "API key deleted",
                apiRouterService.deleteApiKey(
                        request.getEmail(),
                        request.getRange(),
                        request.getGranularity(),
                        request.getKeyId()
                )
        );
    }

    @PostMapping("/keys/config")
    public ApiResponse<ApiRouterDashboard> updateApiKeyConfig(@Valid @RequestBody ApiRouterKeyConfigRequest request) {
        return ApiResponse.success(
                "API key config updated",
                apiRouterService.updateApiKeyConfig(
                        request.getEmail(),
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
