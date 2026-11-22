package com.ciphertool.controller;

import com.ciphertool.dto.AgentRechargeOrderInfo;
import com.ciphertool.dto.AgentRechargeOrderRequest;
import com.ciphertool.dto.AgentRechargeOrderStatusRequest;
import com.ciphertool.dto.AgentRechargePaymentReviewRequest;
import com.ciphertool.dto.AgentRechargePlanInfo;
import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterPaymentCallbackRequest;
import com.ciphertool.service.AgentRechargeService;
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

/**
 * Agent 模块充值接口。
 *
 * <p>价格与额度由服务端固定，客户端只提交套餐 id；支付回调复用 API 中转站
 * 的 HMAC-SHA256 协议，人工审核则复用支付审核人配置。</p>
 */
@RestController
@RequestMapping("/api/agent-recharge")
@RequiredArgsConstructor
public class AgentRechargeController {

    private final AgentRechargeService agentRechargeService;
    private final AuthService authService;
    private final ApiRouterControllerSupport support;

    @Value("${api-router.risk.order-create-per-hour:12}")
    private int orderCreatePerHour;

    @GetMapping("/plans")
    public ApiResponse<List<AgentRechargePlanInfo>> listPlans() {
        return ApiResponse.success("Agent recharge plans loaded", agentRechargeService.listPlans());
    }

    @PostMapping("/orders")
    public ApiResponse<AgentRechargeOrderInfo> createOrder(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody AgentRechargeOrderRequest request) {
        String owner = authService.requireSessionAccount(authorization);
        support.requireUserAndIpLimit(
                owner,
                servletRequest,
                "agent-recharge-order-create",
                orderCreatePerHour,
                Duration.ofHours(1),
                "充值订单创建过于频繁，请稍后再试"
        );
        return ApiResponse.success(
                "Recharge order created",
                agentRechargeService.createOrder(
                        owner,
                        request.getPlanId(),
                        request.getPayMethod(),
                        request.getIdempotencyKey(),
                        request.getNote()
                )
        );
    }

    @GetMapping("/orders")
    public ApiResponse<List<AgentRechargeOrderInfo>> listOrders(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String owner = authService.requireSessionAccount(authorization);
        return ApiResponse.success("Recharge orders loaded", agentRechargeService.listOrders(owner));
    }

    @PostMapping("/orders/payment-review")
    public ApiResponse<AgentRechargeOrderInfo> submitPaymentReview(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody AgentRechargePaymentReviewRequest request) {
        String owner = authService.requireSessionAccount(authorization);
        return ApiResponse.success(
                "Payment review submitted",
                agentRechargeService.submitPaymentReview(
                        owner,
                        request.getOrderId(),
                        request.getExternalTradeNo(),
                        request.getNote()
                )
        );
    }

    @PostMapping("/orders/cancel")
    public ApiResponse<AgentRechargeOrderInfo> cancelOrder(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody AgentRechargePaymentReviewRequest request) {
        String owner = authService.requireSessionAccount(authorization);
        return ApiResponse.success(
                "Recharge order cancelled",
                agentRechargeService.cancelOwnOrder(owner, request.getOrderId(), request.getNote())
        );
    }

    /**
     * 在线支付回调与 API 中转站共用签名协议，但写入独立的充值订单表。
     */
    @PostMapping("/orders/payment-callback")
    public ApiResponse<AgentRechargeOrderInfo> paymentCallback(@Valid @RequestBody ApiRouterPaymentCallbackRequest request) {
        return ApiResponse.success(
                "Recharge payment callback processed",
                agentRechargeService.handlePaymentCallback(
                        request.getOrderId(),
                        request.getAmount(),
                        request.getPayMethod(),
                        request.getExternalTradeNo(),
                        request.getStatus(),
                        request.getTimestamp(),
                        request.getNonce(),
                        request.getSignature()
                )
        );
    }

    @GetMapping("/admin/orders")
    public ApiResponse<List<AgentRechargeOrderInfo>> listAllOrders(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String reviewer = authService.requireSessionAccount(authorization);
        support.requirePaymentReviewer(reviewer);
        return ApiResponse.success("All recharge orders loaded", agentRechargeService.listAllOrders());
    }

    @PostMapping("/admin/orders/status")
    public ApiResponse<List<AgentRechargeOrderInfo>> updateOrderStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody AgentRechargeOrderStatusRequest request) {
        String reviewer = authService.requireSessionAccount(authorization);
        support.requirePaymentReviewer(reviewer);
        List<AgentRechargeOrderInfo> orders = agentRechargeService.updateOrderStatus(
                reviewer,
                request.getOrderId(),
                request.getStatus(),
                request.getExternalTradeNo(),
                request.getNote()
        );
        support.audit(reviewer, "agent-recharge.order.status", "agent-recharge-order", request.getOrderId(), "",
                support.detail("status", request.getStatus(), "externalTradeNo", request.getExternalTradeNo(), "note", request.getNote()));
        return ApiResponse.success("Recharge order status updated", orders);
    }
}
