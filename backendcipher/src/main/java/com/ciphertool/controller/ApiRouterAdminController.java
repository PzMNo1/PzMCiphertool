package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ApiRouterAdminOverview;
import com.ciphertool.dto.ApiRouterChannelRequest;
import com.ciphertool.dto.ApiRouterChannelStatusRequest;
import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterModelPriceRequest;
import com.ciphertool.dto.ApiRouterModelPriceStatusRequest;
import com.ciphertool.dto.ApiRouterSubscriptionPlanInfo;
import com.ciphertool.dto.ApiRouterSubscriptionPlanRequest;
import com.ciphertool.dto.ApiRouterSubscriptionPlanStatusRequest;
import com.ciphertool.dto.ApiRouterWalletCreditRequest;
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

import java.util.List;

@RestController
@RequestMapping("/api/api-router")
@RequiredArgsConstructor
public class ApiRouterAdminController {

    private final ApiRouterService apiRouterService;
    private final AuthService authService;
    private final ApiRouterControllerSupport support;

    @GetMapping("/channels")
    public ApiResponse<List<ApiRouterDashboard.ChannelInfo>> listChannels(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        return ApiResponse.success("Channels loaded", apiRouterService.listChannels());
    }

    @PostMapping("/channels")
    public ApiResponse<List<ApiRouterDashboard.ChannelInfo>> saveChannel(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterChannelRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
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
        support.audit(operatorEmail, "channel.save", "channel", support.blank(request.getId()), "",
                support.detail("name", request.getName(), "provider", request.getProvider(), "baseUrl", request.getBaseUrl(),
                        "models", request.getModels(), "priority", request.getPriority(), "enabled", request.getEnabled()));
        return ApiResponse.success("Channel saved", channels);
    }

    @PostMapping("/channels/status")
    public ApiResponse<List<ApiRouterDashboard.ChannelInfo>> updateChannelStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterChannelStatusRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ChannelInfo> channels = apiRouterService.updateChannelStatus(
                request.getChannelId(),
                request.getEnabled()
        );
        support.audit(operatorEmail, "channel.status", "channel", request.getChannelId(), "",
                support.detail("enabled", request.getEnabled()));
        return ApiResponse.success("Channel status updated", channels);
    }

    @PostMapping("/channels/delete")
    public ApiResponse<List<ApiRouterDashboard.ChannelInfo>> deleteChannel(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterChannelStatusRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ChannelInfo> channels = apiRouterService.deleteChannel(request.getChannelId());
        support.audit(operatorEmail, "channel.delete", "channel", request.getChannelId(), "", "");
        return ApiResponse.success("Channel deleted", channels);
    }

    @GetMapping("/model-prices")
    public ApiResponse<List<ApiRouterDashboard.ModelPriceInfo>> listModelPrices(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        return ApiResponse.success("Model prices loaded", apiRouterService.listModelPrices());
    }

    @PostMapping("/model-prices")
    public ApiResponse<List<ApiRouterDashboard.ModelPriceInfo>> saveModelPrice(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterModelPriceRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
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
        support.audit(operatorEmail, "price.save", "model_price", support.blank(request.getId()), "",
                support.detail("modelPattern", request.getModelPattern(), "provider", request.getProvider(),
                        "channelId", request.getChannelId(), "input", request.getInputPricePerMillion(),
                        "output", request.getOutputPricePerMillion(), "enabled", request.getEnabled()));
        return ApiResponse.success("Model price saved", prices);
    }

    @PostMapping("/model-prices/status")
    public ApiResponse<List<ApiRouterDashboard.ModelPriceInfo>> updateModelPriceStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterModelPriceStatusRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ModelPriceInfo> prices = apiRouterService.updateModelPriceStatus(
                request.getId(),
                request.getEnabled()
        );
        support.audit(operatorEmail, "price.status", "model_price", request.getId(), "",
                support.detail("enabled", request.getEnabled()));
        return ApiResponse.success("Model price status updated", prices);
    }

    @PostMapping("/model-prices/delete")
    public ApiResponse<List<ApiRouterDashboard.ModelPriceInfo>> deleteModelPrice(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterModelPriceStatusRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        List<ApiRouterDashboard.ModelPriceInfo> prices = apiRouterService.deleteModelPrice(request.getId());
        support.audit(operatorEmail, "price.delete", "model_price", request.getId(), "", "");
        return ApiResponse.success("Model price deleted", prices);
    }

    @GetMapping("/admin/overview")
    public ApiResponse<ApiRouterAdminOverview> adminOverview(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "200") int userLimit,
            @RequestParam(defaultValue = "50") int auditLimit,
            @RequestParam(defaultValue = "") String query) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        return ApiResponse.success("Admin overview loaded", apiRouterService.getAdminOverview(
                support.safeAdminLimit(userLimit),
                support.safeAdminLimit(auditLimit),
                query
        ));
    }

    @PostMapping("/admin/wallet")
    public ApiResponse<ApiRouterAdminOverview> adjustWallet(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterWalletCreditRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        apiRouterService.adjustWalletBalance(
                operatorEmail,
                request.getTargetEmail(),
                request.getAmount(),
                request.getDescription()
        );
        support.audit(operatorEmail, "wallet.adjust", "wallet", request.getTargetEmail(), request.getTargetEmail(),
                support.detail("amount", request.getAmount(), "description", request.getDescription()));
        return ApiResponse.success("Wallet adjusted", apiRouterService.getAdminOverview(200, 50, ""));
    }

    @GetMapping("/subscription-plans/admin")
    public ApiResponse<List<ApiRouterSubscriptionPlanInfo>> listAllSubscriptionPlans(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        return ApiResponse.success("Subscription plans loaded", apiRouterService.listAllSubscriptionPlans());
    }

    @PostMapping("/subscription-plans")
    public ApiResponse<List<ApiRouterSubscriptionPlanInfo>> saveSubscriptionPlan(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterSubscriptionPlanRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        List<ApiRouterSubscriptionPlanInfo> plans = apiRouterService.saveSubscriptionPlan(
                request.getId(),
                request.getName(),
                request.getPrice(),
                request.getCredit(),
                request.getQuota(),
                request.getBadge(),
                request.getPriority(),
                request.getEnabled(),
                request.getNote()
        );
        support.audit(operatorEmail, "plan.save", "subscription_plan", support.blank(request.getId()), "",
                support.detail("name", request.getName(), "price", request.getPrice(), "credit", request.getCredit(),
                        "enabled", request.getEnabled()));
        return ApiResponse.success("Subscription plan saved", plans);
    }

    @PostMapping("/subscription-plans/status")
    public ApiResponse<List<ApiRouterSubscriptionPlanInfo>> updateSubscriptionPlanStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterSubscriptionPlanStatusRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        List<ApiRouterSubscriptionPlanInfo> plans = apiRouterService.updateSubscriptionPlanStatus(
                request.getId(),
                request.getEnabled()
        );
        support.audit(operatorEmail, "plan.status", "subscription_plan", request.getId(), "",
                support.detail("enabled", request.getEnabled()));
        return ApiResponse.success("Subscription plan status updated", plans);
    }

    @PostMapping("/subscription-plans/delete")
    public ApiResponse<List<ApiRouterSubscriptionPlanInfo>> deleteSubscriptionPlan(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ApiRouterSubscriptionPlanStatusRequest request) {
        String operatorEmail = authService.requireSessionAccount(authorization);
        support.requireAdmin(operatorEmail);
        List<ApiRouterSubscriptionPlanInfo> plans = apiRouterService.deleteSubscriptionPlan(request.getId());
        support.audit(operatorEmail, "plan.delete", "subscription_plan", request.getId(), "", "");
        return ApiResponse.success("Subscription plan deleted", plans);
    }
}
