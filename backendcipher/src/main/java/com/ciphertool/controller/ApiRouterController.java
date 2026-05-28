package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterAdminOverview;
import com.ciphertool.dto.ApiRouterChannelHealthCheckRequest;
import com.ciphertool.dto.ApiRouterChannelRequest;
import com.ciphertool.dto.ApiRouterChannelStatusRequest;
import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterDashboardRequest;
import com.ciphertool.dto.ApiRouterKeyConfigRequest;
import com.ciphertool.dto.ApiRouterKeyCreateResponse;
import com.ciphertool.dto.ApiRouterKeyRequest;
import com.ciphertool.dto.ApiRouterKeyStatusRequest;
import com.ciphertool.dto.ApiRouterModelPriceRequest;
import com.ciphertool.dto.ApiRouterModelPriceStatusRequest;
import com.ciphertool.dto.ApiRouterOrderRequest;
import com.ciphertool.dto.ApiRouterOrderStatusRequest;
import com.ciphertool.dto.ApiRouterPaymentCallbackRequest;
import com.ciphertool.dto.ApiRouterPaymentReconciliation;
import com.ciphertool.dto.ApiRouterRedeemCodeRequest;
import com.ciphertool.dto.ApiRouterRedeemCodeStatusRequest;
import com.ciphertool.dto.ApiRouterRedeemRequest;
import com.ciphertool.dto.ApiRouterReconciliationResolveRequest;
import com.ciphertool.dto.ApiRouterStatus;
import com.ciphertool.dto.ApiRouterUserControlRequest;
import com.ciphertool.dto.ApiRouterWalletCreditRequest;
import com.ciphertool.service.ApiRouterService;
import com.ciphertool.service.AuthService;
import com.ciphertool.service.RiskControlService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

@Slf4j
@RestController
@RequestMapping("/api/api-router")
@RequiredArgsConstructor
public class ApiRouterController {

    private final ApiRouterService apiRouterService;
    private final AuthService authService;
    private final RiskControlService riskControlService;

    @Value("${api-router.admin-emails:}")
    private String adminEmails;

    @Value("${api-router.risk.key-create-per-hour:10}")
    private int keyCreatePerHour;

    @Value("${api-router.risk.redeem-per-hour:20}")
    private int redeemPerHour;

    @Value("${api-router.risk.order-create-per-hour:12}")
    private int orderCreatePerHour;

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

    @PostMapping("/keys")
    public ApiResponse<ApiRouterKeyCreateResponse> createApiKey(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody ApiRouterKeyRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        requireUserAndIpLimit(
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

    @GetMapping("/ledger")
    public ApiResponse<List<ApiRouterDashboard.LedgerEntry>> getLedger(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "50") int limit) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("Ledger loaded", apiRouterService.listLedger(ownerEmail, limit));
    }

    @PostMapping("/wallet/credit")
    public ApiResponse<ApiRouterDashboard> creditWallet(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterWalletCreditRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        ApiRouterDashboard dashboard = apiRouterService.creditWallet(
                operatorEmail,
                request.getTargetEmail(),
                request.getRange(),
                request.getGranularity(),
                request.getAmount(),
                request.getDescription()
        );
        audit(operatorEmail, "wallet.credit", "wallet", "", request.getTargetEmail(),
                detail("amount", request.getAmount(), "description", request.getDescription()));
        return ApiResponse.success("Wallet credited", dashboard);
    }

    @PostMapping("/redeem")
    public ApiResponse<ApiRouterDashboard> redeemCode(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody ApiRouterRedeemRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        requireUserAndIpLimit(
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
        requireAdmin(operatorEmail);
        return ApiResponse.success("Redeem codes loaded", apiRouterService.listRedeemCodes());
    }

    @PostMapping("/redeem-codes")
    public ApiResponse<List<ApiRouterDashboard.RedeemCodeInfo>> createRedeemCode(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterRedeemCodeRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        List<ApiRouterDashboard.RedeemCodeInfo> codes = apiRouterService.createRedeemCode(
                operatorEmail,
                request.getCode(),
                request.getAmount(),
                request.getMaxUses(),
                request.getExpiresAt(),
                request.getNote(),
                request.getEnabled()
        );
        audit(operatorEmail, "redeem.create", "redeem_code", resolveRedeemCode(codes, request.getCode()), "",
                detail("amount", request.getAmount(), "maxUses", request.getMaxUses(), "expiresAt", request.getExpiresAt(),
                        "enabled", request.getEnabled(), "note", request.getNote()));
        return ApiResponse.success("Redeem code created", codes);
    }

    @PostMapping("/redeem-codes/status")
    public ApiResponse<List<ApiRouterDashboard.RedeemCodeInfo>> updateRedeemCodeStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterRedeemCodeStatusRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        List<ApiRouterDashboard.RedeemCodeInfo> codes = apiRouterService.updateRedeemCodeStatus(request.getCode(), request.getEnabled());
        audit(operatorEmail, "redeem.status", "redeem_code", request.getCode(), "",
                detail("enabled", request.getEnabled()));
        return ApiResponse.success("Redeem code status updated", codes);
    }

    @GetMapping("/orders")
    public ApiResponse<List<ApiRouterDashboard.OrderInfo>> listOrders(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "false") boolean admin) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        if (admin) {
            requireAdmin(ownerEmail);
        }
        return ApiResponse.success("Orders loaded", apiRouterService.listOrders(ownerEmail, admin));
    }

    @PostMapping("/orders")
    public ApiResponse<ApiRouterDashboard.OrderInfo> createOrder(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody ApiRouterOrderRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        requireUserAndIpLimit(
                ownerEmail,
                servletRequest,
                "order-create",
                orderCreatePerHour,
                Duration.ofHours(1),
                "充值订单创建过于频繁，请稍后再试"
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

    @GetMapping("/status")
    public ApiResponse<ApiRouterStatus> getStatus() {
        return ApiResponse.success("Gateway status loaded", apiRouterService.getGatewayStatus(false));
    }

    @GetMapping("/admin/status")
    public ApiResponse<ApiRouterStatus> getAdminStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        return ApiResponse.success("Gateway status loaded", apiRouterService.getGatewayStatus(true));
    }

    @GetMapping("/admin/overview")
    public ApiResponse<ApiRouterAdminOverview> getAdminOverview(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "100") int userLimit,
            @RequestParam(defaultValue = "100") int auditLimit,
            @RequestParam(defaultValue = "") String query) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        return ApiResponse.success("Admin overview loaded", apiRouterService.getAdminOverview(userLimit, auditLimit, query));
    }

    @GetMapping("/admin/users")
    public ApiResponse<List<ApiRouterAdminOverview.UserSummary>> listAdminUsers(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "") String query) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        return ApiResponse.success("Admin users loaded", apiRouterService.listAdminUsers(limit, query));
    }

    @GetMapping("/admin/audits")
    public ApiResponse<List<ApiRouterAdminOverview.AuditEntry>> listAdminAudits(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "100") int limit) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        return ApiResponse.success("Admin audits loaded", apiRouterService.listAdminAudits(limit));
    }

    @PostMapping("/admin/users/control")
    public ApiResponse<ApiRouterAdminOverview> updateUserControl(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterUserControlRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        boolean controlChanged = request.getFrozen() != null;
        boolean frozen = Boolean.TRUE.equals(request.getFrozen());
        if (controlChanged) {
            apiRouterService.setUserFrozen(request.getTargetEmail(), frozen, request.getReason(), operatorEmail);
            audit(operatorEmail, frozen ? "user.freeze" : "user.unfreeze", "user", "", request.getTargetEmail(),
                    detail("reason", request.getReason()));
        }
        int disabledKeys = 0;
        if (Boolean.TRUE.equals(request.getDisableKeys())) {
            disabledKeys = apiRouterService.disableUserApiKeys(request.getTargetEmail());
            audit(operatorEmail, "user.keys.pause_all", "user", "", request.getTargetEmail(),
                    detail("disabledKeys", disabledKeys, "reason", request.getReason()));
        }
        return ApiResponse.success(
                "User control updated",
                apiRouterService.getAdminOverview(
                        safeAdminLimit(request.getUserLimit()),
                        safeAdminLimit(request.getAuditLimit()),
                        request.getQuery()
                )
        );
    }

    @PostMapping("/orders/status")
    public ApiResponse<List<ApiRouterDashboard.OrderInfo>> updateOrderStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterOrderStatusRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        List<ApiRouterDashboard.OrderInfo> orders = apiRouterService.updateOrderStatus(
                operatorEmail,
                request.getOrderId(),
                request.getStatus(),
                request.getExternalTradeNo(),
                request.getNote()
        );
        audit(operatorEmail, "order.status", "order", request.getOrderId(), findOrderEmail(orders, request.getOrderId()),
                detail("status", request.getStatus(), "externalTradeNo", request.getExternalTradeNo(), "note", request.getNote()));
        return ApiResponse.success("Order status updated", orders);
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

    @GetMapping("/admin/reconciliation")
    public ApiResponse<ApiRouterPaymentReconciliation> reconcilePayments(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "100") int limit) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        ApiRouterPaymentReconciliation reconciliation = apiRouterService.reconcileOrders(safeAdminLimit(limit));
        ApiRouterPaymentReconciliation.Summary summary = reconciliation.getSummary();
        audit(operatorEmail, "payment.reconcile.scan", "payment", "", "",
                detail("open", summary == null ? 0 : summary.getOpenIssues(),
                        "blocker", summary == null ? 0 : summary.getBlockerIssues(),
                        "warn", summary == null ? 0 : summary.getWarnIssues()));
        return ApiResponse.success("Payment reconciliation loaded", reconciliation);
    }

    @PostMapping("/admin/reconciliation/resolve")
    public ApiResponse<ApiRouterPaymentReconciliation> resolveReconciliationIssue(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterReconciliationResolveRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        ApiRouterPaymentReconciliation reconciliation = apiRouterService.resolveReconciliationIssue(
                request.getIssueId(),
                operatorEmail,
                request.getNote(),
                safeAdminLimit(request.getLimit())
        );
        audit(operatorEmail, "payment.reconcile.resolve", "reconciliation", request.getIssueId(), "",
                detail("note", request.getNote()));
        return ApiResponse.success("Payment reconciliation issue resolved", reconciliation);
    }

    @GetMapping("/channels")
    public ApiResponse<List<ApiRouterDashboard.ChannelInfo>> listChannels(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        return ApiResponse.success("Channels loaded", apiRouterService.listChannels());
    }

    @GetMapping("/model-prices")
    public ApiResponse<List<ApiRouterDashboard.ModelPriceInfo>> listModelPrices(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        return ApiResponse.success("Model prices loaded", apiRouterService.listModelPrices());
    }

    @PostMapping("/model-prices")
    public ApiResponse<List<ApiRouterDashboard.ModelPriceInfo>> saveModelPrice(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterModelPriceRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ModelPriceInfo> prices = apiRouterService.saveModelPrice(
                request.getId(),
                request.getModelPattern(),
                request.getProvider(),
                request.getChannelId(),
                request.getInputPricePerMillion(),
                request.getOutputPricePerMillion(),
                request.getPriority(),
                request.getEnabled(),
                request.getNote()
        );
        audit(operatorEmail, "model_price.save", "model_price", resolveModelPriceId(prices, request), "",
                detail("modelPattern", request.getModelPattern(), "provider", request.getProvider(), "channelId", request.getChannelId(),
                        "input", request.getInputPricePerMillion(), "output", request.getOutputPricePerMillion(),
                        "priority", request.getPriority(), "enabled", request.getEnabled(), "note", request.getNote()));
        return ApiResponse.success("Model price saved", prices);
    }

    @PostMapping("/model-prices/status")
    public ApiResponse<List<ApiRouterDashboard.ModelPriceInfo>> updateModelPriceStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterModelPriceStatusRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ModelPriceInfo> prices = apiRouterService.updateModelPriceStatus(request.getId(), request.getEnabled());
        audit(operatorEmail, "model_price.status", "model_price", request.getId(), "",
                detail("enabled", request.getEnabled()));
        return ApiResponse.success("Model price status updated", prices);
    }

    @PostMapping("/model-prices/delete")
    public ApiResponse<List<ApiRouterDashboard.ModelPriceInfo>> deleteModelPrice(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterModelPriceStatusRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ModelPriceInfo> prices = apiRouterService.deleteModelPrice(request.getId());
        audit(operatorEmail, "model_price.delete", "model_price", request.getId(), "", "");
        return ApiResponse.success("Model price deleted", prices);
    }

    @PostMapping("/channels")
    public ApiResponse<List<ApiRouterDashboard.ChannelInfo>> saveChannel(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterChannelRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ChannelInfo> channels = apiRouterService.saveChannel(
                request.getId(),
                request.getName(),
                request.getProvider(),
                request.getBaseUrl(),
                request.getApiKey(),
                request.getModels(),
                request.getPriority(),
                request.getWeight(),
                request.getEnabled(),
                request.getRetryEnabled()
        );
        audit(operatorEmail, "channel.save", "channel", resolveChannelId(channels, request), "",
                detail("name", request.getName(), "provider", request.getProvider(), "baseUrl", request.getBaseUrl(),
                        "models", request.getModels(), "priority", request.getPriority(), "weight", request.getWeight(),
                        "enabled", request.getEnabled(), "retryEnabled", request.getRetryEnabled()));
        return ApiResponse.success("Channel saved", channels);
    }

    @PostMapping("/channels/status")
    public ApiResponse<List<ApiRouterDashboard.ChannelInfo>> updateChannelStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterChannelStatusRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ChannelInfo> channels = apiRouterService.updateChannelStatus(request.getChannelId(), request.getEnabled());
        audit(operatorEmail, "channel.status", "channel", request.getChannelId(), "",
                detail("enabled", request.getEnabled()));
        return ApiResponse.success("Channel status updated", channels);
    }

    @PostMapping("/channels/health-check")
    public ApiResponse<ApiRouterStatus> checkChannelHealth(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody(required = false) ApiRouterChannelHealthCheckRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        String channelId = request == null ? "" : request.getChannelId();
        ApiRouterStatus status = apiRouterService.checkChannelHealth(channelId, true);
        audit(operatorEmail, "channel.health_check", "channel", channelId, "",
                detail("scope", hasText(channelId) ? "single" : "all"));
        return ApiResponse.success("Channel health checked", status);
    }

    @PostMapping("/channels/delete")
    public ApiResponse<List<ApiRouterDashboard.ChannelInfo>> deleteChannel(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterChannelStatusRequest request) {
        String operatorEmail = authService.requireSessionEmail(authorization);
        requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ChannelInfo> channels = apiRouterService.deleteChannel(request.getChannelId());
        audit(operatorEmail, "channel.delete", "channel", request.getChannelId(), "", "");
        return ApiResponse.success("Channel deleted", channels);
    }

    private void audit(String operatorEmail, String action, String targetType, String targetId, String targetEmail, String detail) {
        try {
            apiRouterService.appendAdminAudit(operatorEmail, action, targetType, targetId, targetEmail, detail);
        } catch (RuntimeException e) {
            log.warn("Failed to append API router admin audit action={} targetType={} targetId={}", action, targetType, targetId, e);
        }
    }

    private String detail(Object... values) {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index + 1 < values.length; index += 2) {
            if (builder.length() > 0) {
                builder.append("; ");
            }
            builder.append(values[index]).append("=").append(values[index + 1] == null ? "" : values[index + 1]);
        }
        return builder.toString();
    }

    private String resolveRedeemCode(List<ApiRouterDashboard.RedeemCodeInfo> codes, String requestedCode) {
        if (hasText(requestedCode)) {
            return requestedCode.trim().toUpperCase(Locale.ROOT);
        }
        return codes == null || codes.isEmpty() ? "" : blank(codes.get(0).getCode());
    }

    private String findOrderEmail(List<ApiRouterDashboard.OrderInfo> orders, String orderId) {
        if (orders == null) {
            return "";
        }
        return orders.stream()
                .filter(order -> same(order.getId(), orderId))
                .map(ApiRouterDashboard.OrderInfo::getEmail)
                .findFirst()
                .orElse("");
    }

    private String resolveModelPriceId(List<ApiRouterDashboard.ModelPriceInfo> prices, ApiRouterModelPriceRequest request) {
        if (hasText(request.getId())) {
            return request.getId().trim();
        }
        if (prices == null) {
            return "";
        }
        return prices.stream()
                .filter(price -> same(price.getModelPattern(), request.getModelPattern()))
                .filter(price -> same(price.getProvider(), request.getProvider()))
                .filter(price -> same(price.getChannelId(), request.getChannelId()))
                .findFirst()
                .map(ApiRouterDashboard.ModelPriceInfo::getId)
                .orElse("");
    }

    private String resolveChannelId(List<ApiRouterDashboard.ChannelInfo> channels, ApiRouterChannelRequest request) {
        if (hasText(request.getId())) {
            return request.getId().trim();
        }
        if (channels == null) {
            return "";
        }
        return channels.stream()
                .filter(channel -> same(channel.getName(), request.getName()))
                .filter(channel -> same(channel.getProvider(), request.getProvider()))
                .filter(channel -> same(channel.getBaseUrl(), request.getBaseUrl()))
                .findFirst()
                .map(ApiRouterDashboard.ChannelInfo::getId)
                .orElse("");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean same(String left, String right) {
        return blank(left).equals(blank(right));
    }

    private String blank(String value) {
        return value == null ? "" : value.trim();
    }

    private void requireAdmin(String email) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        boolean allowed = Arrays.stream(adminEmails == null ? new String[0] : adminEmails.split(","))
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .anyMatch(value -> "*".equals(value) || value.equals(normalizedEmail));
        if (!allowed) {
            throw AuthService.AuthAccessException.unauthorized("需要管理员权限，请配置 API_ROUTER_ADMIN_EMAILS");
        }
    }

    private void requireUserAndIpLimit(
            String email,
            HttpServletRequest servletRequest,
            String action,
            int limit,
            Duration window,
            String message) {
        riskControlService.requireUserAction(email, action, limit, window, message);
        riskControlService.requireIpAction(
                riskControlService.clientIp(servletRequest),
                action,
                scaledIpLimit(limit),
                window,
                message
        );
    }

    private int scaledIpLimit(int userLimit) {
        if (userLimit <= 0) {
            return 0;
        }
        return Math.max(userLimit, userLimit * 5);
    }

    private int safeAdminLimit(Integer limit) {
        return limit == null ? 100 : Math.max(1, Math.min(500, limit));
    }
}
