package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterRedeemCodeRequest;
import com.ciphertool.dto.ApiRouterRedeemCodeStatusRequest;
import com.ciphertool.dto.ApiRouterRedeemRequest;
import com.ciphertool.service.ApiRouterService;
import com.ciphertool.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/api-router")
@RequiredArgsConstructor
public class ApiRouterBillingController {

    private final ApiRouterService apiRouterService;
    private final AuthService authService;
    private final ApiRouterControllerSupport support;

    @Value("${api-router.risk.redeem-per-hour:20}")
    private int redeemPerHour;

    @PostMapping("/redeem")
    public ApiResponse<ApiRouterDashboard> redeemCode(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody ApiRouterRedeemRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        support.requireUserAndIpLimit(
                ownerEmail,
                servletRequest,
                "redeem",
                redeemPerHour,
                Duration.ofHours(1),
                "兑换请求过于频繁，请稍后再试"
        );
        return ApiResponse.success(
                "Redeem code applied",
                apiRouterService.redeemCode(ownerEmail, request.getCode(), request.getRange(), request.getGranularity())
        );
    }

    @GetMapping("/redeem-codes")
    public ApiResponse<List<ApiRouterDashboard.RedeemCodeInfo>> listRedeemCodes(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        support.requireAdmin(operatorEmail);
        return ApiResponse.success("Redeem codes loaded", apiRouterService.listRedeemCodes());
    }

    @PostMapping("/redeem-codes")
    public ApiResponse<List<ApiRouterDashboard.RedeemCodeInfo>> createRedeemCode(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterRedeemCodeRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        support.requireAdmin(operatorEmail);
        List<ApiRouterDashboard.RedeemCodeInfo> codes = apiRouterService.createRedeemCode(
                operatorEmail,
                request.getCode(),
                request.getAmount(),
                request.getMaxUses(),
                request.getExpiresAt(),
                request.getNote(),
                request.getEnabled()
        );
        support.audit(operatorEmail, "redeem.create", "redeem_code", resolveRedeemCode(codes, request.getCode()), "",
                support.detail("amount", request.getAmount(), "maxUses", request.getMaxUses(), "expiresAt", request.getExpiresAt(),
                        "enabled", request.getEnabled(), "note", request.getNote()));
        return ApiResponse.success("Redeem code created", codes);
    }

    @PostMapping("/redeem-codes/status")
    public ApiResponse<List<ApiRouterDashboard.RedeemCodeInfo>> updateRedeemCodeStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterRedeemCodeStatusRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        support.requireAdmin(operatorEmail);
        List<ApiRouterDashboard.RedeemCodeInfo> codes = apiRouterService.updateRedeemCodeStatus(request.getCode(), request.getEnabled());
        support.audit(operatorEmail, "redeem.status", "redeem_code", request.getCode(), "",
                support.detail("enabled", request.getEnabled()));
        return ApiResponse.success("Redeem code status updated", codes);
    }

    private String resolveRedeemCode(List<ApiRouterDashboard.RedeemCodeInfo> codes, String requestedCode) {
        if (support.hasText(requestedCode)) {
            return requestedCode.trim().toUpperCase(Locale.ROOT);
        }
        return codes == null || codes.isEmpty() ? "" : support.blank(codes.get(0).getCode());
    }
}
