package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterDashboardRequest;
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
public class ApiRouterDashboardController {

    private final ApiRouterService apiRouterService;
    private final AuthService authService;

    @GetMapping("/dashboard")
    public ApiResponse<ApiRouterDashboard> getDashboard(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(required = false) String email,
            @RequestParam(defaultValue = "7") String range,
            @RequestParam(defaultValue = "day") String granularity) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("Success", apiRouterService.getDashboard(ownerEmail, range, granularity));
    }

    @PostMapping("/refresh")
    public ApiResponse<ApiRouterDashboard> refreshDashboard(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterDashboardRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success(
                "Dashboard refreshed",
                apiRouterService.refreshDashboard(ownerEmail, request.getRange(), request.getGranularity())
        );
    }
}
