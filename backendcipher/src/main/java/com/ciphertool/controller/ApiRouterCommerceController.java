package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterInviteApplyRequest;
import com.ciphertool.dto.ApiRouterInviteOverview;
import com.ciphertool.dto.ApiRouterSubscriptionOrderRequest;
import com.ciphertool.dto.ApiRouterSubscriptionPlanInfo;
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

@RestController
@RequestMapping("/api/api-router")
@RequiredArgsConstructor
public class ApiRouterCommerceController {

    private final ApiRouterService apiRouterService;
    private final AuthService authService;
    private final ApiRouterControllerSupport support;

    @Value("${api-router.risk.order-create-per-hour:12}")
    private int orderCreatePerHour;

    @GetMapping("/subscription-plans")
    public ApiResponse<List<ApiRouterSubscriptionPlanInfo>> listSubscriptionPlans(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        authService.requireSessionEmail(authorization);
        return ApiResponse.success("Subscription plans loaded", apiRouterService.listSubscriptionPlans());
    }

    @PostMapping("/subscriptions/orders")
    public ApiResponse<ApiRouterDashboard.OrderInfo> createSubscriptionOrder(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody ApiRouterSubscriptionOrderRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        support.requireUserAndIpLimit(
                ownerEmail,
                servletRequest,
                "subscription-order-create",
                orderCreatePerHour,
                Duration.ofHours(1),
                "订阅订单创建过于频繁，请稍后再试"
        );
        return ApiResponse.success(
                "Subscription order created",
                apiRouterService.createSubscriptionOrder(
                        ownerEmail,
                        request.getPlanId(),
                        request.getPayMethod(),
                        request.getIdempotencyKey()
                )
        );
    }

    @GetMapping("/invites/overview")
    public ApiResponse<ApiRouterInviteOverview> getInviteOverview(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("Invite overview loaded", apiRouterService.getInviteOverview(ownerEmail));
    }

    @PostMapping("/invites/apply")
    public ApiResponse<ApiRouterInviteOverview> applyInviteCode(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterInviteApplyRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("Invite code applied", apiRouterService.applyInviteCode(ownerEmail, request.getCode()));
    }
}
