package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterOrderRequest;
import com.ciphertool.dto.ApiRouterOrderStatusRequest;
import com.ciphertool.dto.ApiRouterPaymentCallbackRequest;
import com.ciphertool.dto.ApiRouterPaymentReconciliation;
import com.ciphertool.dto.ApiRouterReconciliationResolveRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/api-router")
@RequiredArgsConstructor
public class ApiRouterOrderController {

    private final ApiRouterService apiRouterService;
    private final AuthService authService;
    private final ApiRouterControllerSupport support;

    @Value("${api-router.risk.order-create-per-hour:12}")
    private int orderCreatePerHour;

    @PostMapping("/orders")
    public ApiResponse<ApiRouterDashboard.OrderInfo> createOrder(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody ApiRouterOrderRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        support.requireUserAndIpLimit(
                ownerEmail,
                servletRequest,
                "order-create",
                orderCreatePerHour,
                Duration.ofHours(1),
                "订单创建过于频繁，请稍后再试"
        );
        return ApiResponse.success(
                "Order created",
                apiRouterService.createOrder(
                        ownerEmail,
                        request.getAmount(),
                        request.getPayMethod(),
                        request.getIdempotencyKey(),
                        request.getNote()
                )
        );
    }

    @GetMapping("/orders")
    public ApiResponse<List<ApiRouterDashboard.OrderInfo>> listOrders(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "false") boolean admin) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        if (admin) {
            support.requirePaymentReviewer(ownerEmail);
        }
        return ApiResponse.success("Orders loaded", apiRouterService.listOrders(ownerEmail, admin));
    }

    @PostMapping("/orders/status")
    public ApiResponse<List<ApiRouterDashboard.OrderInfo>> updateOrderStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterOrderStatusRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        support.requirePaymentReviewer(operatorEmail);
        List<ApiRouterDashboard.OrderInfo> orders = apiRouterService.updateOrderStatus(
                operatorEmail,
                request.getOrderId(),
                request.getStatus(),
                request.getExternalTradeNo(),
                request.getNote()
        );
        support.audit(operatorEmail, "order.status", "order", request.getOrderId(), "",
                support.detail("status", request.getStatus(), "externalTradeNo", request.getExternalTradeNo(), "note", request.getNote()));
        return ApiResponse.success("Order status updated", orders);
    }

    @PostMapping("/orders/payment-review")
    public ApiResponse<ApiRouterDashboard.OrderInfo> submitPaymentReview(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterOrderStatusRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        ApiRouterDashboard.OrderInfo order = apiRouterService.submitOrderPaymentReview(
                ownerEmail,
                request.getOrderId(),
                request.getExternalTradeNo(),
                request.getNote()
        );
        return ApiResponse.success("Payment review submitted", order);
    }

    @PostMapping("/orders/cancel")
    public ApiResponse<ApiRouterDashboard.OrderInfo> cancelOwnOrder(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterOrderStatusRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        ApiRouterDashboard.OrderInfo order = apiRouterService.cancelOwnOrder(
                ownerEmail,
                request.getOrderId(),
                request.getNote()
        );
        return ApiResponse.success("Order cancelled", order);
    }

    @PostMapping("/orders/payment-callback")
    public ApiResponse<ApiRouterDashboard.OrderInfo> paymentCallback(
            @Valid @RequestBody ApiRouterPaymentCallbackRequest request) {
        return ApiResponse.success(
                "Payment callback processed",
                apiRouterService.handlePaymentCallback(
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

    @GetMapping("/orders/reconciliation")
    public ApiResponse<ApiRouterPaymentReconciliation> reconcileOrders(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "100") int limit) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        support.requireAdmin(operatorEmail);
        return ApiResponse.success("Reconciliation loaded", apiRouterService.reconcileOrders(support.safeAdminLimit(limit)));
    }

    @PostMapping("/orders/reconciliation/resolve")
    public ApiResponse<ApiRouterPaymentReconciliation> resolveReconciliationIssue(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterReconciliationResolveRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        support.requireAdmin(operatorEmail);
        ApiRouterPaymentReconciliation result = apiRouterService.resolveReconciliationIssue(
                request.getIssueId(),
                operatorEmail,
                request.getNote(),
                support.safeAdminLimit(request.getLimit())
        );
        support.audit(operatorEmail, "reconciliation.resolve", "reconciliation", request.getIssueId(), "",
                support.detail("note", request.getNote()));
        return ApiResponse.success("Reconciliation issue resolved", result);
    }
}
