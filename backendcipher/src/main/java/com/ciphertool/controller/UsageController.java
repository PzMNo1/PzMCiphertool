package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.UsageSummary;
import com.ciphertool.service.UsageQuotaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usage")
@RequiredArgsConstructor
public class UsageController {

    private final UsageQuotaService usageQuotaService;

    @GetMapping("/summary")
    public ApiResponse<UsageSummary> summary(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        return ApiResponse.success("Usage loaded", usageQuotaService.summary(authorization));
    }
}
