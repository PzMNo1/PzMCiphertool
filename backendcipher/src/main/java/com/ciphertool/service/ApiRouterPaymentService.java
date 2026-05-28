package com.ciphertool.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ApiRouterPaymentService {

    private static final DateTimeFormatter STORAGE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @Value("${api-router.payment.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    @Value("${api-router.payment.order-expire-minutes:30}")
    private long orderExpireMinutes;

    @Value("${api-router.payment.checkout-url-template:}")
    private String checkoutUrlTemplate;

    @Value("${api-router.payment.alipay-checkout-url-template:}")
    private String alipayCheckoutUrlTemplate;

    @Value("${api-router.payment.wechat-checkout-url-template:}")
    private String wechatCheckoutUrlTemplate;

    @Value("${api-router.payment.stripe-checkout-url-template:}")
    private String stripeCheckoutUrlTemplate;

    @Value("${api-router.payment.manual-instructions:请联系管理员完成线下转账，并备注订单号。}")
    private String manualInstructions;

    public PaymentSession createPaymentSession(String orderId, String email, double amount, String payMethod) {
        String normalizedPayMethod = normalizePayMethod(payMethod);
        String expiresAt = LocalDateTime.now()
                .plusMinutes(Math.max(1L, orderExpireMinutes))
                .format(STORAGE_TIME);
        String callbackUrl = normalizedPublicBaseUrl() + "/api/api-router/orders/payment-callback";
        String template = templateFor(normalizedPayMethod);
        String checkoutUrl = fillTemplate(template, orderId, email, amount, normalizedPayMethod, callbackUrl);
        String qrCodeUrl = checkoutUrl;
        String instructions = instructionsFor(normalizedPayMethod, orderId, checkoutUrl);
        String payload = "{"
                + "\"provider\":\"" + escapeJson(normalizedPayMethod) + "\","
                + "\"orderId\":\"" + escapeJson(orderId) + "\","
                + "\"amount\":\"" + amountText(amount) + "\","
                + "\"callbackUrl\":\"" + escapeJson(callbackUrl) + "\","
                + "\"expiresAt\":\"" + escapeJson(expiresAt) + "\""
                + "}";
        return new PaymentSession(checkoutUrl, qrCodeUrl, instructions, expiresAt, payload);
    }

    private String templateFor(String payMethod) {
        if ("alipay".equals(payMethod) && alipayCheckoutUrlTemplate != null && !alipayCheckoutUrlTemplate.isBlank()) {
            return alipayCheckoutUrlTemplate;
        }
        if ("wechat".equals(payMethod) && wechatCheckoutUrlTemplate != null && !wechatCheckoutUrlTemplate.isBlank()) {
            return wechatCheckoutUrlTemplate;
        }
        if ("stripe".equals(payMethod) && stripeCheckoutUrlTemplate != null && !stripeCheckoutUrlTemplate.isBlank()) {
            return stripeCheckoutUrlTemplate;
        }
        return checkoutUrlTemplate == null ? "" : checkoutUrlTemplate;
    }

    private String instructionsFor(String payMethod, String orderId, String checkoutUrl) {
        if (checkoutUrl != null && !checkoutUrl.isBlank()) {
            return switch (payMethod) {
                case "alipay" -> "请打开支付宝收银台完成付款，支付完成后等待回调入账。";
                case "wechat" -> "请打开微信支付收银台完成付款，支付完成后等待回调入账。";
                case "stripe" -> "请打开 Stripe Checkout 完成付款，支付完成后等待回调入账。";
                default -> "请打开收银台完成付款，支付完成后等待回调入账。";
            };
        }
        String base = manualInstructions == null || manualInstructions.isBlank()
                ? "请联系管理员完成线下转账，并备注订单号。"
                : manualInstructions.trim();
        return base + " 订单号: " + orderId;
    }

    private String fillTemplate(String template, String orderId, String email, double amount, String payMethod, String callbackUrl) {
        if (template == null || template.isBlank()) {
            return "";
        }
        return template
                .replace("{orderId}", encode(orderId))
                .replace("{email}", encode(email))
                .replace("{amount}", encode(amountText(amount)))
                .replace("{payMethod}", encode(payMethod))
                .replace("{callbackUrl}", encode(callbackUrl));
    }

    private String normalizedPublicBaseUrl() {
        String value = publicBaseUrl == null || publicBaseUrl.isBlank() ? "http://localhost:8080" : publicBaseUrl.trim();
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private String normalizePayMethod(String payMethod) {
        String value = payMethod == null ? "" : payMethod.trim().toLowerCase(Locale.ROOT);
        if (value.equals("alipay") || value.equals("wechat") || value.equals("stripe") || value.equals("manual-test")) {
            return value;
        }
        return "manual";
    }

    private String amountText(double amount) {
        return BigDecimal.valueOf(Math.max(0.0, amount)).setScale(4, RoundingMode.HALF_UP).toPlainString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private String escapeJson(String value) {
        return (value == null ? "" : value)
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    public record PaymentSession(
            String checkoutUrl,
            String qrCodeUrl,
            String instructions,
            String expiresAt,
            String payload) {
    }
}
