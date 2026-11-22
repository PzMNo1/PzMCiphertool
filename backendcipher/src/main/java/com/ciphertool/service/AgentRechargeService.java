package com.ciphertool.service;

import com.ciphertool.dto.AgentRechargeOrderInfo;
import com.ciphertool.dto.AgentRechargePlanInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Agent 模块充值：套餐定义、订单、支付回调与入账。
 *
 * <p>订单与 API 中转站完全隔离；支付收银台复用
 * {@link ApiRouterPaymentService} 的模板能力，未配置在线收银台时退化为
 * “用户提交已付款、管理员审核”的人工流程。</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentRechargeService {

    private static final DateTimeFormatter STORAGE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final String CALLBACK_PATH = "/api/agent-recharge/orders/payment-callback";
    private static final Set<String> ORDER_STATUSES = Set.of("PENDING", "PAYMENT_REVIEW", "PAID", "CANCELLED", "REFUNDED");

    private static final List<AgentRechargePlanInfo> PLANS = List.of(
            new AgentRechargePlanInfo(
                    "agent-pack-9",
                    "体验包",
                    "入门",
                    "3 次研报 Agent + 5 次 Agentmaster + 100 次图片生成 + 20 次视频生成",
                    9.9,
                    3,
                    5,
                    100,
                    20
            ),
            new AgentRechargePlanInfo(
                    "agent-pack-19",
                    "进阶包",
                    "超值",
                    "6 次研报 Agent + 12 次 Agentmaster + 250 次图片生成 + 50 次视频生成",
                    19.9,
                    6,
                    12,
                    250,
                    50
            )
    );

    private static final Map<String, AgentRechargePlanInfo> PLANS_BY_ID = PLANS.stream()
            .collect(Collectors.toUnmodifiableMap(AgentRechargePlanInfo::getId, Function.identity()));

    private final JdbcTemplate jdbcTemplate;
    private final ApiRouterPaymentService paymentService;
    private final AgentRechargeCreditStore creditStore;

    @Value("${api-router.payment.callback-secret:}")
    private String paymentCallbackSecret;

    @Value("${api-router.payment.callback-window-minutes:15}")
    private long paymentCallbackWindowMinutes;

    @Value("${api-router.payment.manual-instructions:请联系管理员完成线下转账，并备注订单号。}")
    private String manualInstructions;

    public List<AgentRechargePlanInfo> listPlans() {
        return PLANS;
    }

    public synchronized AgentRechargeOrderInfo createOrder(
            String email,
            String planId,
            String payMethod,
            String idempotencyKey,
            String note) {
        String owner = normalizeEmail(email);
        AgentRechargePlanInfo plan = findPlan(planId);
        if (plan == null) {
            throw new IllegalArgumentException("充值套餐不存在");
        }
        String normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
        if (!normalizedIdempotencyKey.isBlank()) {
            AgentRechargeOrderInfo existing = findOrderByIdempotencyKey(owner, normalizedIdempotencyKey);
            if (existing != null) {
                return existing;
            }
        }

        String id = "ar_" + UUID.randomUUID().toString().replace("-", "");
        String now = LocalDateTime.now().format(STORAGE_TIME);
        String normalizedPayMethod = normalizePayMethod(payMethod);
        ApiRouterPaymentService.PaymentSession session = paymentService.createPaymentSession(
                id,
                owner,
                plan.getPrice(),
                normalizedPayMethod,
                CALLBACK_PATH
        );
        String instructions = session.instructions();
        if (isBlank(session.checkoutUrl()) && isBlank(session.qrCodeUrl())) {
            String manual = isBlank(manualInstructions)
                    ? "请联系管理员完成线下转账，并备注订单号。"
                    : manualInstructions.trim();
            instructions = manual + " 订单号: " + id + "；付款后点击“我已完成支付”，等待管理员确认到账。";
        }
        jdbcTemplate.update(
                "insert into agent_recharge_orders(id, email, plan_id, plan_name, amount, pay_method, status, external_trade_no, idempotency_key, checkout_url, qr_code_url, payment_instructions, payment_expires_at, payment_payload, note, created_at, paid_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id,
                owner,
                plan.getId(),
                plan.getName(),
                BigDecimal.valueOf(round4(plan.getPrice())),
                normalizedPayMethod,
                "PENDING",
                "",
                normalizedIdempotencyKey,
                truncate(session.checkoutUrl(), 2048),
                truncate(session.qrCodeUrl(), 2048),
                truncate(instructions, 2048),
                truncate(session.expiresAt(), 40),
                truncate(session.payload(), 2048),
                truncate(blankToDefault(note, ""), 512),
                now,
                "",
                now
        );
        return findOrder(id);
    }

    public synchronized List<AgentRechargeOrderInfo> listOrders(String email) {
        return jdbcTemplate.query(
                "select * from agent_recharge_orders where email = ? order by created_at desc limit 100",
                orderRowMapper(),
                normalizeEmail(email)
        );
    }

    public synchronized List<AgentRechargeOrderInfo> listAllOrders() {
        return jdbcTemplate.query(
                "select * from agent_recharge_orders order by created_at desc limit 200",
                orderRowMapper()
        );
    }

    public synchronized AgentRechargeOrderInfo submitPaymentReview(
            String email,
            String orderId,
            String externalTradeNo,
            String note) {
        String owner = normalizeEmail(email);
        AgentRechargeOrderInfo order = findOrder(orderId);
        if (order == null) {
            throw new IllegalArgumentException("订单不存在");
        }
        if (!owner.equals(normalizeEmail(order.getEmail()))) {
            throw new IllegalArgumentException("只能提交自己的订单");
        }
        if (!"PENDING".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("只有待支付订单可以提交审核");
        }
        String now = LocalDateTime.now().format(STORAGE_TIME);
        jdbcTemplate.update(
                "update agent_recharge_orders set status = ?, external_trade_no = ?, note = ?, updated_at = ? where id = ? and email = ? and status = 'PENDING'",
                "PAYMENT_REVIEW",
                truncate(blankToDefault(externalTradeNo, ""), 255),
                truncate(blankToDefault(note, "用户已完成付款，等待人工审核"), 512),
                now,
                order.getId(),
                owner
        );
        return findOrder(order.getId());
    }

    public synchronized AgentRechargeOrderInfo cancelOwnOrder(String email, String orderId, String note) {
        String owner = normalizeEmail(email);
        AgentRechargeOrderInfo order = findOrder(orderId);
        if (order == null) {
            throw new IllegalArgumentException("订单不存在");
        }
        if (!owner.equals(normalizeEmail(order.getEmail()))) {
            throw new IllegalArgumentException("只能取消自己的订单");
        }
        if (!"PENDING".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("只有待支付订单可以取消");
        }
        String now = LocalDateTime.now().format(STORAGE_TIME);
        jdbcTemplate.update(
                "update agent_recharge_orders set status = ?, note = ?, updated_at = ? where id = ? and email = ? and status = 'PENDING'",
                "CANCELLED",
                truncate(blankToDefault(note, "用户取消订单"), 512),
                now,
                order.getId(),
                owner
        );
        return findOrder(order.getId());
    }

    /**
     * 管理员审核订单（通常用于人工收款后确认到账）。
     */
    @Transactional
    public synchronized List<AgentRechargeOrderInfo> updateOrderStatus(
            String operatorEmail,
            String orderId,
            String status,
            String externalTradeNo,
            String note) {
        AgentRechargeOrderInfo order = findOrder(orderId);
        if (order == null) {
            throw new IllegalArgumentException("订单不存在");
        }
        String normalizedStatus = normalizeOrderStatus(status);
        if (!"PAID".equals(normalizedStatus) && !"CANCELLED".equals(normalizedStatus)) {
            throw new IllegalArgumentException("只能将订单标记为已支付或已取消");
        }
        updateOrderTerminalStatus(order, operatorEmail, normalizedStatus, externalTradeNo, note);
        return listAllOrders();
    }

    /**
     * 在线支付回调。签名格式与 API 中转站一致：
     * orderId|amount|payMethod|externalTradeNo|status|timestamp|nonce
     */
    @Transactional
    public synchronized AgentRechargeOrderInfo handlePaymentCallback(
            String orderId,
            double amount,
            String payMethod,
            String externalTradeNo,
            String status,
            long timestamp,
            String nonce,
            String signature) {
        String normalizedPayMethod = normalizePayMethod(payMethod);
        String normalizedStatus = normalizeOrderStatus(status);
        String normalizedNonce = normalizeCallbackNonce(nonce);
        String payload = paymentCallbackPayload(orderId, amount, normalizedPayMethod, externalTradeNo, normalizedStatus, timestamp, normalizedNonce);
        requireCallbackNonce(normalizedNonce);
        verifyPaymentCallback(payload, signature, timestamp);
        registerPaymentCallbackNonce(normalizedPayMethod, normalizedNonce, orderId, externalTradeNo, signature);

        AgentRechargeOrderInfo order = findOrder(orderId);
        if (order == null) {
            throw new IllegalArgumentException("订单不存在");
        }
        if (Math.abs(round4(order.getAmount()) - round4(amount)) >= 0.0001) {
            throw new IllegalArgumentException("回调金额与订单金额不一致");
        }
        if (!normalizedPayMethod.equals(normalizePayMethod(order.getPayMethod()))) {
            throw new IllegalArgumentException("回调支付方式与订单不一致");
        }
        updateOrderTerminalStatus(order, "payment-callback", normalizedStatus, externalTradeNo, "Callback " + normalizedPayMethod);
        return findOrder(orderId);
    }

    private void updateOrderTerminalStatus(
            AgentRechargeOrderInfo order,
            String operatorEmail,
            String status,
            String externalTradeNo,
            String note) {
        String normalizedStatus = normalizeOrderStatus(status);
        if ("PAID".equalsIgnoreCase(order.getStatus())) {
            return;
        }
        if (!"PENDING".equalsIgnoreCase(order.getStatus()) && !"PAYMENT_REVIEW".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("只能处理待支付或待审核订单");
        }
        String now = LocalDateTime.now().format(STORAGE_TIME);
        String paidAt = "PAID".equals(normalizedStatus) ? now : "";
        int updated = jdbcTemplate.update(
                "update agent_recharge_orders set status = ?, external_trade_no = ?, note = ?, paid_at = ?, updated_at = ? where id = ? and status in ('PENDING', 'PAYMENT_REVIEW')",
                normalizedStatus,
                truncate(blankToDefault(externalTradeNo, ""), 255),
                truncate(blankToDefault(note, order.getNote()), 512),
                paidAt,
                now,
                order.getId()
        );
        if (updated == 0) {
            return;
        }
        if ("PAID".equals(normalizedStatus)) {
            creditOrder(order, operatorEmail);
        }
    }

    private void creditOrder(AgentRechargeOrderInfo order, String operatorEmail) {
        AgentRechargePlanInfo plan = findPlan(order.getPlanId());
        if (plan == null) {
            log.error("Agent recharge order {} references unknown plan {}", order.getId(), order.getPlanId());
            return;
        }
        boolean credited = creditStore.credit(
                order.getEmail(),
                order.getId(),
                "ORDER_CREDIT",
                plan.getAgentCredits(),
                plan.getAgentmasterCredits(),
                plan.getImageCredits(),
                plan.getVideoCredits(),
                "充值套餐 " + plan.getName() + "，操作人 " + normalizeEmail(operatorEmail)
        );
        if (credited) {
            log.info("Agent recharge order {} credited to {}", order.getId(), maskEmail(order.getEmail()));
        }
    }

    private AgentRechargePlanInfo findPlan(String planId) {
        String normalized = planId == null ? "" : planId.trim();
        return PLANS_BY_ID.get(normalized);
    }

    private AgentRechargeOrderInfo findOrder(String orderId) {
        String normalized = orderId == null ? "" : orderId.trim();
        if (normalized.isBlank()) {
            return null;
        }
        try {
            return jdbcTemplate.queryForObject(
                    "select * from agent_recharge_orders where id = ?",
                    orderRowMapper(),
                    normalized
            );
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    private AgentRechargeOrderInfo findOrderByIdempotencyKey(String email, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return null;
        }
        List<AgentRechargeOrderInfo> matches = jdbcTemplate.query(
                "select * from agent_recharge_orders where email = ? and idempotency_key = ? order by created_at desc limit 1",
                orderRowMapper(),
                email,
                idempotencyKey
        );
        return matches.isEmpty() ? null : matches.get(0);
    }

    private RowMapper<AgentRechargeOrderInfo> orderRowMapper() {
        return (rs, rowNum) -> new AgentRechargeOrderInfo(
                rs.getString("id"),
                rs.getString("email"),
                rs.getString("plan_id"),
                rs.getString("plan_name"),
                rs.getBigDecimal("amount") == null ? 0.0 : rs.getBigDecimal("amount").doubleValue(),
                rs.getString("pay_method"),
                rs.getString("status"),
                rs.getString("external_trade_no"),
                rs.getString("checkout_url"),
                rs.getString("qr_code_url"),
                rs.getString("payment_instructions"),
                rs.getString("payment_expires_at"),
                rs.getString("payment_payload"),
                rs.getString("note"),
                rs.getString("created_at"),
                rs.getString("paid_at"),
                rs.getString("updated_at")
        );
    }

    private void registerPaymentCallbackNonce(
            String payMethod,
            String nonce,
            String orderId,
            String externalTradeNo,
            String signature) {
        String callbackKey = (payMethod + "|" + nonce);
        try {
            jdbcTemplate.update(
                    "insert into agent_recharge_callback_nonces(callback_key, nonce, pay_method, order_id, external_trade_no, signature, created_at) values (?, ?, ?, ?, ?, ?, ?)",
                    callbackKey,
                    nonce,
                    blankToDefault(payMethod, ""),
                    blankToDefault(orderId, ""),
                    blankToDefault(externalTradeNo, ""),
                    blankToDefault(signature, ""),
                    LocalDateTime.now().format(STORAGE_TIME)
            );
        } catch (DuplicateKeyException e) {
            throw new IllegalArgumentException("支付回调 nonce 已处理，疑似重放");
        }
    }

    private void verifyPaymentCallback(String payload, String signature, long timestamp) {
        if (paymentCallbackSecret == null || paymentCallbackSecret.isBlank()) {
            throw new IllegalArgumentException("支付回调密钥未配置");
        }
        long nowMillis = System.currentTimeMillis();
        long windowMillis = Math.max(1, paymentCallbackWindowMinutes) * 60_000L;
        if (timestamp <= 0 || Math.abs(nowMillis - timestamp) > windowMillis) {
            throw new IllegalArgumentException("支付回调时间戳无效或已过期");
        }
        String expected = hmacSha256(payload, paymentCallbackSecret.trim());
        if (signature == null || !MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("支付回调签名不正确");
        }
    }

    private String paymentCallbackPayload(
            String orderId,
            double amount,
            String payMethod,
            String externalTradeNo,
            String status,
            long timestamp,
            String nonce) {
        return blankToDefault(orderId, "")
                + "|" + BigDecimal.valueOf(round4(amount)).setScale(4, RoundingMode.HALF_UP).toPlainString()
                + "|" + blankToDefault(payMethod, "")
                + "|" + blankToDefault(externalTradeNo, "")
                + "|" + blankToDefault(status, "")
                + "|" + timestamp
                + "|" + blankToDefault(nonce, "");
    }

    private String hmacSha256(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 not available", e);
        }
    }

    private void requireCallbackNonce(String nonce) {
        if (nonce == null || nonce.isBlank()) {
            throw new IllegalArgumentException("支付回调 nonce 不能为空");
        }
    }

    private String normalizeCallbackNonce(String nonce) {
        if (nonce == null || nonce.isBlank()) {
            return "";
        }
        String normalized = nonce.trim();
        return normalized.length() > 128 ? normalized.substring(0, 128) : normalized;
    }

    private String normalizeOrderStatus(String status) {
        String normalized = status == null || status.isBlank() ? "PENDING" : status.trim().toUpperCase(Locale.ROOT);
        if (!ORDER_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("不支持的订单状态");
        }
        return normalized;
    }

    private String normalizePayMethod(String payMethod) {
        String value = payMethod == null ? "" : payMethod.trim().toLowerCase(Locale.ROOT);
        if (value.equals("alipay") || value.equals("wechat") || value.equals("stripe") || value.equals("manual-test")) {
            return value;
        }
        return "manual";
    }

    private String normalizeIdempotencyKey(String value) {
        String normalized = value == null ? "" : value.trim();
        return normalized.length() > 128 ? normalized.substring(0, 128) : normalized;
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private double round4(double value) {
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP).doubleValue();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String truncate(String value, int max) {
        String text = value == null ? "" : value;
        return text.length() <= max ? text : text.substring(0, max);
    }

    private String maskEmail(String email) {
        String value = normalizeEmail(email);
        int at = value.indexOf('@');
        if (at <= 1) {
            return value.length() <= 2 ? "**" : value.charAt(0) + "***";
        }
        return value.charAt(0) + "***" + value.substring(at);
    }
}
