package com.ciphertool.controller;

import com.ciphertool.service.ApiRouterService;
import com.ciphertool.service.AuthService;
import com.ciphertool.service.RiskControlService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;

@Slf4j
@Component
@RequiredArgsConstructor
public class ApiRouterControllerSupport {

    private static final String PAYMENT_REVIEWER_EMAIL = "1551601828@qq.com";

    private final ApiRouterService apiRouterService;
    private final RiskControlService riskControlService;

    @Value("${api-router.admin-emails:}")
    private String adminEmails;

    public void audit(String operatorEmail, String action, String targetType, String targetId, String targetEmail, String detail) {
        try {
            apiRouterService.appendAdminAudit(operatorEmail, action, targetType, targetId, targetEmail, detail);
        } catch (RuntimeException e) {
            log.warn("Failed to append API router admin audit action={} targetType={} targetId={}", action, targetType, targetId, e);
        }
    }

    public String detail(Object... values) {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index + 1 < values.length; index += 2) {
            if (builder.length() > 0) {
                builder.append("; ");
            }
            builder.append(values[index]).append("=").append(values[index + 1] == null ? "" : values[index + 1]);
        }
        return builder.toString();
    }

    public void requireAdmin(String email) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        boolean allowed = Arrays.stream(adminEmails == null ? new String[0] : adminEmails.split(","))
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .anyMatch(value -> "*".equals(value) || value.equals(normalizedEmail));
        if (!allowed) {
            throw AuthService.AuthAccessException.unauthorized("需要管理员权限，请配置 API_ROUTER_ADMIN_EMAILS");
        }
    }

    public void requirePaymentReviewer(String email) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (!PAYMENT_REVIEWER_EMAIL.equals(normalizedEmail)) {
            throw AuthService.AuthAccessException.unauthorized("只有 1551601828@qq.com 可以审核微信支付订单");
        }
    }

    public void requireUserAndIpLimit(
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

    public int safeAdminLimit(Integer limit) {
        return limit == null ? 100 : Math.max(1, Math.min(500, limit));
    }

    public boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public boolean same(String left, String right) {
        return blank(left).equals(blank(right));
    }

    public String blank(String value) {
        return value == null ? "" : value.trim();
    }

    private int scaledIpLimit(int userLimit) {
        if (userLimit <= 0) {
            return 0;
        }
        return Math.max(userLimit, userLimit * 5);
    }
}
