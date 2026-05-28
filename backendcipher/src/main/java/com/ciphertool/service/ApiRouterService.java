package com.ciphertool.service;

import com.ciphertool.dto.ApiRouterAdminOverview;
import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterKeyCreateResponse;
import com.ciphertool.dto.ApiRouterPaymentReconciliation;
import com.ciphertool.dto.ApiRouterStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiRouterService {

    private static final String DATA_DIR = "apirouterdata";
    private static final String KEY_DIR = "apirouterkeys";
    private static final String USAGE_DIR = "apirouterusage";
    private static final int MAX_USAGE_RECORDS = 30;
    private static final int MAX_STORED_USAGE_RECORDS = 5000;
    private static final int TREND_BUCKETS = 7;
    private static final long DEFAULT_TOKEN_QUOTA_FALLBACK = 1_000_000L;
    private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss");
    private static final DateTimeFormatter STORAGE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;
    private final ApiRouterPaymentService paymentService;
    private final SecureRandom random = new SecureRandom();
    private final HttpClient healthHttpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    @Value("${api-router.limit.rpm:60}")
    private int keyRpmLimit;

    @Value("${api-router.limit.tpm:120000}")
    private long keyTpmLimit;

    @Value("${api-router.quota.default-tokens:1000000}")
    private long defaultTokenQuota;

    @Value("${api-router.price.input-per-million:0}")
    private double inputPricePerMillion;

    @Value("${api-router.price.output-per-million:0}")
    private double outputPricePerMillion;

    @Value("${llm.api-key:}")
    private String defaultUpstreamApiKey;

    @Value("${llm.base-url:https://api.openai.com/v1}")
    private String defaultUpstreamBaseUrl;

    @Value("${llm.model:gpt-4.1-mini}")
    private String defaultUpstreamModel;

    @Value("${api-router.payment.callback-secret:}")
    private String paymentCallbackSecret;

    @Value("${api-router.payment.callback-window-minutes:15}")
    private long paymentCallbackWindowMinutes;

    @Value("${api-router.health.probe-path:/models}")
    private String healthProbePath;

    @Value("${api-router.health.probe-timeout-seconds:8}")
    private long healthProbeTimeoutSeconds;

    @Value("${api-router.health.circuit-failure-threshold:3}")
    private int circuitFailureThreshold;

    @Value("${api-router.health.circuit-open-minutes:5}")
    private long circuitOpenMinutes;

    @PostConstruct
    public void initializeCommercialStorage() {
        seedDefaultChannel();
        migrateLegacyFilesAtStartup();
    }

    public synchronized ApiRouterDashboard getDashboard(String email, String range, String granularity) {
        ApiRouterDashboard dashboard = loadOrCreate(email);
        applyViewOptions(dashboard, range, granularity, false);
        attachKeyViews(email, dashboard);
        applyUsageAggregation(email, dashboard);
        dashboard.setLedger(listLedger(email, 20));
        return dashboard;
    }

    public synchronized ApiRouterDashboard refreshDashboard(String email, String range, String granularity) {
        ApiRouterDashboard dashboard = loadOrCreate(email);
        applyViewOptions(dashboard, range, granularity, true);
        attachKeyViews(email, dashboard);
        applyUsageAggregation(email, dashboard);
        dashboard.setLedger(listLedger(email, 20));
        save(email, dashboard);
        return dashboard;
    }

    public synchronized ApiRouterKeyCreateResponse createApiKey(String email, String range, String granularity, String name, String quota) {
        requireActiveUser(email);
        StoredApiKeyFile keyFile = loadKeyFile(email);
        String keyName = name == null || name.isBlank() ? "router-key-" + (activeStoredKeys(keyFile).size() + 1) : name.trim();
        String keyQuota = quota == null || quota.isBlank() ? formatTokenQuota(effectiveDefaultTokenQuota()) : quota.trim();
        String plainKey = generatePlainKey();
        String now = LocalDateTime.now().format(STORAGE_TIME);
        StoredApiKey storedKey = new StoredApiKey(
                UUID.randomUUID().toString(),
                keyName,
                maskPlainKey(plainKey),
                hashPlainKey(plainKey),
                "Enabled",
                keyQuota,
                "$0.00",
                "-",
                now,
                now,
                false,
                0,
                0L
        );
        keyFile.getKeys().add(storedKey);
        saveKeyFile(email, keyFile);

        ApiRouterDashboard dashboard = getDashboard(email, range, granularity);
        return new ApiRouterKeyCreateResponse(plainKey, toKeyView(storedKey), dashboard);
    }

    public synchronized ApiRouterDashboard updateApiKeyStatus(String email, String range, String granularity, String keyId, String status) {
        requireActiveUser(email);
        StoredApiKeyFile keyFile = loadKeyFile(email);
        StoredApiKey key = findStoredKey(keyFile, keyId);
        key.setStatus(normalizeKeyStatus(status));
        key.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        saveKeyFile(email, keyFile);
        return getDashboard(email, range, granularity);
    }

    public synchronized ApiRouterDashboard deleteApiKey(String email, String range, String granularity, String keyId) {
        StoredApiKeyFile keyFile = loadKeyFile(email);
        StoredApiKey key = findStoredKey(keyFile, keyId);
        key.setStatus("Deleted");
        key.setDeleted(true);
        key.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        saveKeyFile(email, keyFile);
        return getDashboard(email, range, granularity);
    }

    public synchronized ApiRouterDashboard updateApiKeyConfig(
            String email, String range, String granularity,
            String keyId, String name, String quota,
            Integer keyRpm, Long keyTpm) {
        requireActiveUser(email);
        StoredApiKeyFile keyFile = loadKeyFile(email);
        StoredApiKey key = findStoredKey(keyFile, keyId);
        if (name != null && !name.isBlank()) {
            key.setName(name.trim());
        }
        if (quota != null && !quota.isBlank()) {
            key.setQuota(quota.trim());
        }
        if (keyRpm != null) {
            key.setKeyRpm(Math.max(0, keyRpm));
        }
        if (keyTpm != null) {
            key.setKeyTpm(Math.max(0L, keyTpm));
        }
        key.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        saveKeyFile(email, keyFile);
        return getDashboard(email, range, granularity);
    }

    public synchronized ApiRouterDashboard creditWallet(
            String operatorEmail,
            String targetEmail,
            String range,
            String granularity,
            double amount,
            String description) {
        String owner = normalizeEmail(targetEmail);
        if (owner.isBlank()) {
            throw new IllegalArgumentException("目标邮箱不能为空");
        }
        if (amount <= 0) {
            throw new IllegalArgumentException("充值金额必须大于 0");
        }
        ensureWallet(owner);
        double nextBalance = round4(currentWalletBalance(owner) + amount);
        String now = LocalDateTime.now().format(STORAGE_TIME);
        jdbcTemplate.update(
                "update api_router_wallets set balance = ?, updated_at = ? where email = ?",
                BigDecimal.valueOf(nextBalance),
                now,
                owner
        );
        jdbcTemplate.update(
                "insert into api_router_ledger(id, email, key_id, usage_id, entry_type, amount, balance_after, description, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                owner,
                "",
                "",
                "MANUAL_CREDIT",
                BigDecimal.valueOf(round4(amount)),
                BigDecimal.valueOf(nextBalance),
                blankToDefault(description, "Manual credit by " + normalizeEmail(operatorEmail)),
                now
        );
        return getDashboard(owner, range, granularity);
    }

    public synchronized ApiRouterDashboard redeemCode(String email, String code, String range, String granularity) {
        String owner = normalizeEmail(email);
        requireActiveUser(owner);
        String normalizedCode = normalizeRedeemCode(code);
        if (normalizedCode.isBlank()) {
            throw new IllegalArgumentException("兑换码不能为空");
        }
        RedeemCodeRecord redeemCode = findRedeemCode(normalizedCode);
        if (redeemCode == null) {
            throw new IllegalArgumentException("兑换码不存在");
        }
        if (!redeemCode.enabled) {
            throw new IllegalArgumentException("兑换码已停用");
        }
        if (redeemCode.maxUses > 0 && redeemCode.usedCount >= redeemCode.maxUses) {
            throw new IllegalArgumentException("兑换码已被用完");
        }
        if (isRedeemCodeExpired(redeemCode.expiresAt)) {
            throw new IllegalArgumentException("兑换码已过期");
        }
        Integer redeemed = jdbcTemplate.queryForObject(
                "select count(*) from api_router_redeem_redemptions where code = ? and email = ?",
                Integer.class,
                normalizedCode,
                owner
        );
        if (redeemed != null && redeemed > 0) {
            throw new IllegalArgumentException("该账号已兑换过此兑换码");
        }

        ensureWallet(owner);
        double nextBalance = round4(currentWalletBalance(owner) + redeemCode.amount);
        String now = LocalDateTime.now().format(STORAGE_TIME);
        jdbcTemplate.update(
                "insert into api_router_redeem_redemptions(id, code, email, amount, created_at) values (?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                normalizedCode,
                owner,
                BigDecimal.valueOf(round4(redeemCode.amount)),
                now
        );
        jdbcTemplate.update(
                "update api_router_redeem_codes set used_count = used_count + 1, updated_at = ? where code = ?",
                now,
                normalizedCode
        );
        jdbcTemplate.update(
                "update api_router_wallets set balance = ?, updated_at = ? where email = ?",
                BigDecimal.valueOf(nextBalance),
                now,
                owner
        );
        jdbcTemplate.update(
                "insert into api_router_ledger(id, email, key_id, usage_id, entry_type, amount, balance_after, description, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                owner,
                "",
                "",
                "REDEEM_CREDIT",
                BigDecimal.valueOf(round4(redeemCode.amount)),
                BigDecimal.valueOf(nextBalance),
                "Redeem code " + normalizedCode,
                now
        );
        return getDashboard(owner, range, granularity);
    }

    public synchronized List<ApiRouterDashboard.RedeemCodeInfo> listRedeemCodes() {
        return jdbcTemplate.query(
                "select * from api_router_redeem_codes order by created_at desc",
                redeemCodeInfoRowMapper()
        );
    }

    public synchronized List<ApiRouterDashboard.RedeemCodeInfo> createRedeemCode(
            String operatorEmail,
            String code,
            double amount,
            Integer maxUses,
            String expiresAt,
            String note,
            Boolean enabled) {
        if (amount <= 0) {
            throw new IllegalArgumentException("兑换金额必须大于 0");
        }
        String normalizedCode = normalizeRedeemCode(code);
        if (normalizedCode.isBlank()) {
            normalizedCode = generateRedeemCode();
        }
        if (findRedeemCode(normalizedCode) != null) {
            throw new IllegalArgumentException("兑换码已存在");
        }
        String normalizedExpiresAt = normalizeExpiresAt(expiresAt);
        String now = LocalDateTime.now().format(STORAGE_TIME);
        jdbcTemplate.update(
                "insert into api_router_redeem_codes(code, amount, max_uses, used_count, enabled, expires_at, note, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                normalizedCode,
                BigDecimal.valueOf(round4(amount)),
                Math.max(1, maxUses == null ? 1 : maxUses),
                0,
                enabled == null || enabled,
                normalizedExpiresAt,
                blankToDefault(note, ""),
                normalizeEmail(operatorEmail),
                now,
                now
        );
        return listRedeemCodes();
    }

    public synchronized List<ApiRouterDashboard.RedeemCodeInfo> updateRedeemCodeStatus(String code, Boolean enabled) {
        String normalizedCode = normalizeRedeemCode(code);
        if (normalizedCode.isBlank()) {
            throw new IllegalArgumentException("兑换码不能为空");
        }
        jdbcTemplate.update(
                "update api_router_redeem_codes set enabled = ?, updated_at = ? where code = ?",
                enabled == null || enabled,
                LocalDateTime.now().format(STORAGE_TIME),
                normalizedCode
        );
        return listRedeemCodes();
    }

    public synchronized ApiRouterDashboard.OrderInfo createOrder(
            String email,
            double amount,
            String payMethod,
            String idempotencyKey,
            String note) {
        String owner = normalizeEmail(email);
        requireActiveUser(owner);
        if (amount <= 0) {
            throw new IllegalArgumentException("订单金额必须大于 0");
        }
        String normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
        if (!normalizedIdempotencyKey.isBlank()) {
            ApiRouterDashboard.OrderInfo existing = findOrderByIdempotencyKey(owner, normalizedIdempotencyKey);
            if (existing != null) {
                return ensureOrderPaymentSession(existing);
            }
        }
        String id = "ord_" + UUID.randomUUID().toString().replace("-", "");
        String now = LocalDateTime.now().format(STORAGE_TIME);
        String normalizedPayMethod = normalizePayMethod(payMethod);
        ApiRouterPaymentService.PaymentSession session = paymentService.createPaymentSession(id, owner, amount, normalizedPayMethod);
        jdbcTemplate.update(
                "insert into api_router_orders(id, email, amount, pay_method, status, external_trade_no, idempotency_key, checkout_url, qr_code_url, payment_instructions, payment_expires_at, payment_payload, note, created_at, paid_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id,
                owner,
                BigDecimal.valueOf(round4(amount)),
                normalizedPayMethod,
                "PENDING",
                "",
                normalizedIdempotencyKey,
                session.checkoutUrl(),
                session.qrCodeUrl(),
                session.instructions(),
                session.expiresAt(),
                session.payload(),
                blankToDefault(note, ""),
                now,
                "",
                now
        );
        return findOrder(id);
    }

    public synchronized List<ApiRouterDashboard.OrderInfo> listOrders(String email, boolean adminView) {
        if (adminView) {
            return jdbcTemplate.query(
                    "select * from api_router_orders order by created_at desc limit 200",
                    orderInfoRowMapper()
            );
        }
        return jdbcTemplate.query(
                "select * from api_router_orders where email = ? order by created_at desc limit 100",
                orderInfoRowMapper(),
                normalizeEmail(email)
        );
    }

    public synchronized List<ApiRouterDashboard.OrderInfo> updateOrderStatus(
            String operatorEmail,
            String orderId,
            String status,
            String externalTradeNo,
            String note) {
        ApiRouterDashboard.OrderInfo order = findOrder(orderId);
        if (order == null) {
            throw new IllegalArgumentException("订单不存在");
        }
        updateOrderTerminalStatus(order, operatorEmail, status, externalTradeNo, note);
        return listOrders(operatorEmail, true);
    }

    public synchronized ApiRouterDashboard.OrderInfo handlePaymentCallback(
            String orderId,
            double amount,
            String payMethod,
            String externalTradeNo,
            String status,
            long timestamp,
            String nonce,
            String signature) {
        String now = LocalDateTime.now().format(STORAGE_TIME);
        String normalizedPayMethod = normalizePayMethod(payMethod);
        String normalizedStatus = blankToDefault(status, "");
        String normalizedNonce = normalizeCallbackNonce(nonce);
        String normalizedSignature = normalizeCallbackSignature(signature);
        String callbackKey = callbackKey(normalizedPayMethod, normalizedNonce);
        String payload = "";
        boolean verified = false;
        boolean processed = false;
        boolean replay = false;
        String message = "";
        try {
            normalizedStatus = normalizeOrderStatus(status);
            payload = paymentCallbackPayload(orderId, amount, normalizedPayMethod, externalTradeNo, normalizedStatus, timestamp, normalizedNonce);
            requireCallbackNonce(normalizedNonce);
            verifyPaymentCallback(payload, normalizedSignature, timestamp);
            verified = true;
            registerPaymentCallbackNonce(
                    callbackKey,
                    normalizedPayMethod,
                    normalizedNonce,
                    orderId,
                    externalTradeNo,
                    normalizedSignature,
                    now
            );
            ApiRouterDashboard.OrderInfo order = findOrder(orderId);
            if (order == null) {
                throw new IllegalArgumentException("订单不存在");
            }
            if (Math.abs(round4(order.getAmount()) - round4(amount)) >= 0.0001) {
                throw new IllegalArgumentException("回调金额与订单金额不一致");
            }
            if (!normalizedPayMethod.equals(order.getPayMethod())) {
                throw new IllegalArgumentException("回调支付方式与订单不一致");
            }
            updateOrderTerminalStatus(order, "payment-callback", normalizedStatus, externalTradeNo, "Callback " + normalizedPayMethod);
            processed = true;
            return findOrder(orderId);
        } catch (PaymentCallbackReplayException e) {
            replay = true;
            message = e.getMessage();
            throw e;
        } catch (RuntimeException e) {
            message = e.getMessage();
            throw e;
        } finally {
            appendPaymentCallbackLog(
                    orderId,
                    normalizedPayMethod,
                    blankToDefault(externalTradeNo, ""),
                    amount,
                    normalizedStatus,
                    normalizedNonce,
                    normalizedSignature,
                    callbackKey,
                    payload,
                    verified,
                    processed,
                    replay,
                    message,
                    now
            );
        }
    }

    public synchronized ApiRouterPaymentReconciliation reconcileOrders(int limit) {
        int safeLimit = Math.max(1, Math.min(500, limit));
        String now = LocalDateTime.now().format(STORAGE_TIME);
        scanPaymentReconciliationIssues(now);
        List<ApiRouterPaymentReconciliation.Issue> issues = jdbcTemplate.query(
                "select * from api_router_order_reconciliations where resolved = false order by last_seen_at desc limit ?",
                reconciliationIssueRowMapper(),
                safeLimit
        );
        ApiRouterPaymentReconciliation.Summary summary = new ApiRouterPaymentReconciliation.Summary(
                now,
                countForInt("select count(*) from api_router_order_reconciliations where resolved = false"),
                countForInt("select count(*) from api_router_order_reconciliations where resolved = false and severity = 'BLOCKER'"),
                countForInt("select count(*) from api_router_order_reconciliations where resolved = false and severity = 'WARN'"),
                countForInt("select count(*) from api_router_order_reconciliations where resolved = false and severity = 'INFO'"),
                countForInt("select count(*) from api_router_order_reconciliations where resolved = false and issue_type = 'EXPIRED_PENDING_ORDER'"),
                countForInt("select count(*) from api_router_order_reconciliations where resolved = false and issue_type in ('CALLBACK_UNVERIFIED', 'CALLBACK_UNPROCESSED', 'AMOUNT_MISMATCH', 'PAY_METHOD_MISMATCH', 'ORDER_NOT_FOUND')"),
                countForInt("select count(*) from api_router_order_reconciliations where resolved = false and issue_type = 'REPLAY_CALLBACK'")
        );
        return new ApiRouterPaymentReconciliation(summary, issues);
    }

    public synchronized ApiRouterPaymentReconciliation resolveReconciliationIssue(
            String issueId,
            String operatorEmail,
            String note,
            int limit) {
        String id = issueId == null ? "" : issueId.trim();
        if (id.isBlank()) {
            throw new IllegalArgumentException("对账问题 ID 不能为空");
        }
        int updated = jdbcTemplate.update(
                "update api_router_order_reconciliations set resolved = true, resolved_at = ?, resolved_by = ?, resolve_note = ? where id = ?",
                LocalDateTime.now().format(STORAGE_TIME),
                normalizeEmail(operatorEmail),
                trimResolveNote(note),
                id
        );
        if (updated == 0) {
            throw new IllegalArgumentException("对账问题不存在");
        }
        return reconcileOrders(limit);
    }

    public synchronized WalletReservation reserveWalletForRequest(ApiKeyValidation validation, String model, long estimatedInputTokens) {
        if (validation == null || validation.getEmail() == null) {
            return WalletReservation.none();
        }
        double estimatedCost = estimatePreauthCost(model, estimatedInputTokens);
        if (estimatedCost <= 0) {
            return WalletReservation.none();
        }
        ensureWallet(validation.getEmail());
        if (currentWalletBalance(validation.getEmail()) + 0.000001 < estimatedCost) {
            throw ApiRouterAccessException.quotaExceeded("账户余额不足，请先充值");
        }
        String owner = normalizeEmail(validation.getEmail());
        String reservationId = UUID.randomUUID().toString();
        double nextBalance = round4(currentWalletBalance(owner) - estimatedCost);
        String now = LocalDateTime.now().format(STORAGE_TIME);
        jdbcTemplate.update(
                "update api_router_wallets set balance = ?, updated_at = ? where email = ?",
                BigDecimal.valueOf(nextBalance),
                now,
                owner
        );
        jdbcTemplate.update(
                "insert into api_router_ledger(id, email, key_id, usage_id, entry_type, amount, balance_after, description, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                reservationId,
                owner,
                blankToDefault(validation.getKeyId(), ""),
                "",
                "USAGE_PREAUTH",
                BigDecimal.valueOf(-round4(estimatedCost)),
                BigDecimal.valueOf(nextBalance),
                "Pre-authorized " + blankToDefault(model, "unknown") + " input cost",
                now
        );
        return new WalletReservation(reservationId, estimatedCost);
    }

    public synchronized List<ApiRouterDashboard.LedgerEntry> listLedger(String email, int limit) {
        String owner = normalizeEmail(email);
        ensureWallet(owner);
        int safeLimit = Math.max(1, Math.min(200, limit));
        return jdbcTemplate.query(
                "select id, entry_type, amount, balance_after, description, created_at from api_router_ledger where email = ? order by created_at desc limit ?",
                (rs, rowNum) -> new ApiRouterDashboard.LedgerEntry(
                        rs.getString("id"),
                        rs.getString("entry_type"),
                        rs.getDouble("amount"),
                        rs.getDouble("balance_after"),
                        rs.getString("description"),
                        rs.getString("created_at")
                ),
                owner,
                safeLimit
        );
    }

    public synchronized ApiRouterAdminOverview getAdminOverview(int userLimit, int auditLimit) {
        return getAdminOverview(userLimit, auditLimit, "");
    }

    public synchronized ApiRouterAdminOverview getAdminOverview(int userLimit, int auditLimit, String query) {
        return new ApiRouterAdminOverview(
                LocalDateTime.now().format(STORAGE_TIME),
                listAdminUsers(userLimit, query),
                listAdminAudits(auditLimit)
        );
    }

    public synchronized List<ApiRouterAdminOverview.UserSummary> listAdminUsers(int limit) {
        return listAdminUsers(limit, "");
    }

    public synchronized List<ApiRouterAdminOverview.UserSummary> listAdminUsers(int limit, String query) {
        int safeLimit = Math.max(1, Math.min(500, limit));
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String sql = "select email from ("
                + "select email from api_router_wallets "
                + "union select email from api_router_keys "
                + "union select email from api_router_usage_logs "
                + "union select email from api_router_orders "
                + "union select email from api_router_user_controls"
                + ") users";
        List<String> emails = normalizedQuery.isBlank()
                ? jdbcTemplate.queryForList(sql + " order by email limit ?", String.class, safeLimit)
                : jdbcTemplate.queryForList(sql + " where lower(email) like ? order by email limit ?", String.class, "%" + normalizedQuery + "%", safeLimit);
        return emails.stream()
                .map(this::adminUserSummary)
                .toList();
    }

    public synchronized List<ApiRouterAdminOverview.AuditEntry> listAdminAudits(int limit) {
        int safeLimit = Math.max(1, Math.min(500, limit));
        return jdbcTemplate.query(
                "select * from api_router_admin_audits order by created_at desc limit ?",
                adminAuditRowMapper(),
                safeLimit
        );
    }

    public synchronized void appendAdminAudit(
            String operatorEmail,
            String action,
            String targetType,
            String targetId,
            String targetEmail,
            String detail) {
        jdbcTemplate.update(
                "insert into api_router_admin_audits(id, operator_email, action, target_type, target_id, target_email, detail, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                normalizeEmail(operatorEmail),
                blankToDefault(action, ""),
                blankToDefault(targetType, ""),
                blankToDefault(targetId, ""),
                normalizeEmail(targetEmail),
                trimAuditDetail(detail),
                LocalDateTime.now().format(STORAGE_TIME)
        );
    }

    public synchronized void setUserFrozen(String targetEmail, boolean frozen, String reason, String operatorEmail) {
        String owner = normalizeEmail(targetEmail);
        if (owner.isBlank()) {
            throw new IllegalArgumentException("目标邮箱不能为空");
        }
        ensureWallet(owner);
        String now = LocalDateTime.now().format(STORAGE_TIME);
        String status = frozen ? "FROZEN" : "ACTIVE";
        String normalizedReason = frozen ? trimControlReason(blankToDefault(reason, "Admin frozen")) : "";
        String updatedBy = normalizeEmail(operatorEmail);
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from api_router_user_controls where email = ?",
                Integer.class,
                owner
        );
        if (count != null && count > 0) {
            jdbcTemplate.update(
                    "update api_router_user_controls set status = ?, frozen = ?, reason = ?, updated_by = ?, updated_at = ? where email = ?",
                    status,
                    frozen,
                    normalizedReason,
                    updatedBy,
                    now,
                    owner
            );
            return;
        }
        jdbcTemplate.update(
                "insert into api_router_user_controls(email, status, frozen, reason, updated_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
                owner,
                status,
                frozen,
                normalizedReason,
                updatedBy,
                now,
                now
        );
    }

    public synchronized int disableUserApiKeys(String targetEmail) {
        String owner = normalizeEmail(targetEmail);
        if (owner.isBlank()) {
            throw new IllegalArgumentException("目标邮箱不能为空");
        }
        return jdbcTemplate.update(
                "update api_router_keys set status = 'Paused', updated_at = ? where email = ? and deleted = false and status = 'Enabled'",
                LocalDateTime.now().format(STORAGE_TIME),
                owner
        );
    }

    public synchronized List<ApiRouterDashboard.ChannelInfo> listChannels() {
        return jdbcTemplate.query(
                "select * from api_router_channels order by priority asc, name asc",
                channelInfoRowMapper()
        );
    }

    public synchronized List<ApiRouterDashboard.ModelPriceInfo> listModelPrices() {
        return jdbcTemplate.query(
                "select * from api_router_model_prices order by priority asc, model_pattern asc, provider asc, channel_id asc",
                modelPriceInfoRowMapper()
        );
    }

    public synchronized List<ApiRouterDashboard.ModelPriceInfo> saveModelPrice(
            String id,
            String modelPattern,
            String provider,
            String channelId,
            double inputPricePerMillion,
            double outputPricePerMillion,
            Integer priority,
            Boolean enabled,
            String note) {
        String normalizedPattern = normalizeModelPattern(modelPattern);
        if (normalizedPattern.isBlank()) {
            throw new IllegalArgumentException("模型匹配规则不能为空");
        }
        String priceId = id == null || id.isBlank() ? UUID.randomUUID().toString() : id.trim();
        String now = LocalDateTime.now().format(STORAGE_TIME);
        int updated = jdbcTemplate.update(
                "update api_router_model_prices set model_pattern = ?, provider = ?, channel_id = ?, input_price_per_million = ?, output_price_per_million = ?, priority = ?, enabled = ?, note = ?, updated_at = ? where id = ?",
                normalizedPattern,
                normalizePriceScope(provider),
                normalizePriceScope(channelId),
                BigDecimal.valueOf(round6(Math.max(0.0, inputPricePerMillion))),
                BigDecimal.valueOf(round6(Math.max(0.0, outputPricePerMillion))),
                priority == null ? 100 : Math.max(0, priority),
                enabled == null || enabled,
                blankToDefault(note, ""),
                now,
                priceId
        );
        if (updated == 0) {
            jdbcTemplate.update(
                    "insert into api_router_model_prices(id, model_pattern, provider, channel_id, input_price_per_million, output_price_per_million, priority, enabled, note, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    priceId,
                    normalizedPattern,
                    normalizePriceScope(provider),
                    normalizePriceScope(channelId),
                    BigDecimal.valueOf(round6(Math.max(0.0, inputPricePerMillion))),
                    BigDecimal.valueOf(round6(Math.max(0.0, outputPricePerMillion))),
                    priority == null ? 100 : Math.max(0, priority),
                    enabled == null || enabled,
                    blankToDefault(note, ""),
                    now,
                    now
            );
        }
        return listModelPrices();
    }

    public synchronized List<ApiRouterDashboard.ModelPriceInfo> updateModelPriceStatus(String id, Boolean enabled) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("价格规则 ID 不能为空");
        }
        jdbcTemplate.update(
                "update api_router_model_prices set enabled = ?, updated_at = ? where id = ?",
                enabled == null || enabled,
                LocalDateTime.now().format(STORAGE_TIME),
                id.trim()
        );
        return listModelPrices();
    }

    public synchronized List<ApiRouterDashboard.ModelPriceInfo> deleteModelPrice(String id) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("价格规则 ID 不能为空");
        }
        jdbcTemplate.update("delete from api_router_model_prices where id = ?", id.trim());
        return listModelPrices();
    }

    public synchronized ApiRouterStatus getGatewayStatus(boolean adminView) {
        List<ApiRouterDashboard.ChannelInfo> channels = listChannels();
        List<ApiRouterStatus.ChannelHealth> channelHealth = channels.stream()
                .map(channel -> toChannelHealth(channel, adminView))
                .toList();
        int enabledChannelCount = (int) channelHealth.stream().filter(ApiRouterStatus.ChannelHealth::isEnabled).count();
        int healthyChannelCount = (int) channelHealth.stream()
                .filter(ApiRouterStatus.ChannelHealth::isEnabled)
                .filter(channel -> "healthy".equals(channel.getState()))
                .count();
        String status = gatewayStatus(enabledChannelCount, healthyChannelCount, channelHealth);
        String message = gatewayStatusMessage(status, enabledChannelCount, healthyChannelCount);
        String last24hStart = LocalDateTime.now().minusHours(24).format(STORAGE_TIME);

        return new ApiRouterStatus(
                status,
                message,
                LocalDateTime.now().format(STORAGE_TIME),
                channels.size(),
                enabledChannelCount,
                healthyChannelCount,
                countUsageLogs("select count(*) from api_router_usage_logs"),
                countUsageLogs("select count(*) from api_router_usage_logs where success = true"),
                countUsageLogs("select count(*) from api_router_usage_logs where success = false"),
                countUsageLogs("select count(*) from api_router_usage_logs where created_at >= ?", last24hStart),
                round4(avgLatencyMs(last24hStart)),
                channelHealth
        );
    }

    public ApiRouterStatus checkChannelHealth(String channelId, boolean adminView) {
        List<HealthProbeChannel> channels = loadHealthProbeChannels(channelId);
        if (channels.isEmpty() && channelId != null && !channelId.isBlank()) {
            throw new IllegalArgumentException("渠道不存在");
        }
        for (HealthProbeChannel channel : channels) {
            probeChannel(channel);
        }
        return getGatewayStatus(adminView);
    }

    public synchronized List<ApiRouterDashboard.ChannelInfo> saveChannel(
            String id,
            String name,
            String provider,
            String baseUrl,
            String apiKey,
            String models,
            Integer priority,
            Integer weight,
            Boolean enabled,
            Boolean retryEnabled) {
        String channelId = id == null || id.isBlank() ? UUID.randomUUID().toString() : id.trim();
        String now = LocalDateTime.now().format(STORAGE_TIME);
        String nextProvider = provider == null || provider.isBlank() ? inferProvider(baseUrl) : provider.trim();
        int nextPriority = priority == null ? 100 : Math.max(0, priority);
        int nextWeight = weight == null ? 1 : Math.max(1, weight);
        boolean nextEnabled = enabled == null || enabled;
        boolean nextRetryEnabled = retryEnabled == null || retryEnabled;

        ChannelSecret existing = findChannelSecret(channelId);
        String nextApiKey = apiKey == null || apiKey.isBlank()
                ? (existing == null ? "" : existing.apiKey)
                : apiKey.trim();
        if (nextApiKey.isBlank()) {
            throw new IllegalArgumentException("上游 API key 不能为空");
        }

        int updated = jdbcTemplate.update(
                "update api_router_channels set name = ?, provider = ?, base_url = ?, api_key = ?, models = ?, priority = ?, weight = ?, enabled = ?, retry_enabled = ?, failure_count = 0, last_status = 0, last_error = '', circuit_state = 'CLOSED', circuit_disabled_until = '', updated_at = ? where id = ?",
                name.trim(),
                nextProvider,
                baseUrl.trim(),
                nextApiKey,
                blankToDefault(models, "*"),
                nextPriority,
                nextWeight,
                nextEnabled,
                nextRetryEnabled,
                now,
                channelId
        );
        if (updated == 0) {
            jdbcTemplate.update(
                    "insert into api_router_channels(id, name, provider, base_url, api_key, models, priority, weight, enabled, retry_enabled, failure_count, last_status, last_error, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    channelId,
                    name.trim(),
                    nextProvider,
                    baseUrl.trim(),
                    nextApiKey,
                    blankToDefault(models, "*"),
                    nextPriority,
                    nextWeight,
                    nextEnabled,
                    nextRetryEnabled,
                    0,
                    0,
                    "",
                    now,
                    now
            );
        }
        return listChannels();
    }

    public synchronized List<ApiRouterDashboard.ChannelInfo> updateChannelStatus(String channelId, Boolean enabled) {
        if (channelId == null || channelId.isBlank()) {
            throw new IllegalArgumentException("渠道 ID 不能为空");
        }
        boolean nextEnabled = enabled == null || enabled;
        if (nextEnabled) {
            jdbcTemplate.update(
                    "update api_router_channels set enabled = true, circuit_state = 'CLOSED', circuit_disabled_until = '', failure_count = 0, last_error = '', updated_at = ? where id = ?",
                    LocalDateTime.now().format(STORAGE_TIME),
                    channelId.trim()
            );
            return listChannels();
        }
        jdbcTemplate.update(
                "update api_router_channels set enabled = ?, updated_at = ? where id = ?",
                false,
                LocalDateTime.now().format(STORAGE_TIME),
                channelId.trim()
        );
        return listChannels();
    }

    public synchronized List<ApiRouterDashboard.ChannelInfo> deleteChannel(String channelId) {
        if (channelId == null || channelId.isBlank()) {
            throw new IllegalArgumentException("渠道 ID 不能为空");
        }
        jdbcTemplate.update("delete from api_router_channels where id = ?", channelId.trim());
        return listChannels();
    }

    private List<HealthProbeChannel> loadHealthProbeChannels(String channelId) {
        if (channelId != null && !channelId.isBlank()) {
            return jdbcTemplate.query(
                    "select id, name, base_url, api_key, enabled, failure_count from api_router_channels where id = ?",
                    healthProbeChannelRowMapper(),
                    channelId.trim()
            );
        }
        return jdbcTemplate.query(
                "select id, name, base_url, api_key, enabled, failure_count from api_router_channels where enabled = true order by priority asc, name asc",
                healthProbeChannelRowMapper()
        );
    }

    private void probeChannel(HealthProbeChannel channel) {
        String now = LocalDateTime.now().format(STORAGE_TIME);
        if (channel.apiKey().isBlank() || channel.baseUrl().isBlank()) {
            markChannelHealthFailure(channel, 0, "上游地址或 API key 为空", now);
            return;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(resolveHealthProbeUrl(channel.baseUrl())))
                    .timeout(Duration.ofSeconds(Math.max(1L, healthProbeTimeoutSeconds)))
                    .header("Authorization", "Bearer " + channel.apiKey().trim())
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = healthHttpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            int statusCode = response.statusCode();
            if (statusCode >= 200 && statusCode < 400) {
                markChannelHealthSuccess(channel.id(), statusCode, now);
                return;
            }
            markChannelHealthFailure(channel, statusCode, trimBody(response.body()), now);
        } catch (Exception e) {
            markChannelHealthFailure(channel, 0, e.getMessage(), now);
        }
    }

    private void markChannelHealthSuccess(String channelId, int statusCode, String now) {
        jdbcTemplate.update(
                "update api_router_channels set failure_count = 0, last_status = ?, last_error = '', circuit_state = 'CLOSED', circuit_disabled_until = '', last_checked_at = ?, updated_at = ? where id = ?",
                statusCode,
                now,
                now,
                channelId
        );
    }

    private void markChannelHealthFailure(HealthProbeChannel channel, int statusCode, String errorMessage, String now) {
        int nextFailureCount = Math.max(0, channel.failureCount()) + 1;
        boolean openCircuit = nextFailureCount >= effectiveCircuitFailureThreshold();
        String nextCircuitState = openCircuit ? "OPEN" : "CLOSED";
        String disabledUntil = openCircuit
                ? LocalDateTime.now().plusMinutes(Math.max(1L, circuitOpenMinutes)).format(STORAGE_TIME)
                : "";
        jdbcTemplate.update(
                "update api_router_channels set failure_count = ?, last_status = ?, last_error = ?, circuit_state = ?, circuit_disabled_until = ?, last_checked_at = ?, updated_at = ? where id = ?",
                nextFailureCount,
                statusCode,
                trimError(blankToDefault(errorMessage, "健康检查失败"), statusCode),
                nextCircuitState,
                disabledUntil,
                now,
                now,
                channel.id()
        );
    }

    private RowMapper<HealthProbeChannel> healthProbeChannelRowMapper() {
        return (rs, rowNum) -> new HealthProbeChannel(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("base_url"),
                rs.getString("api_key"),
                rs.getBoolean("enabled"),
                rs.getInt("failure_count")
        );
    }

    private String resolveHealthProbeUrl(String baseUrl) {
        String normalized = baseUrl == null || baseUrl.isBlank()
                ? "https://api.openai.com/v1"
                : baseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        String path = healthProbePath == null || healthProbePath.isBlank() ? "/models" : healthProbePath.trim();
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        if (normalized.endsWith(path)) {
            return normalized;
        }
        if (normalized.endsWith("/chat/completions")) {
            normalized = normalized.substring(0, normalized.length() - "/chat/completions".length());
        }
        return normalized + path;
    }

    private int effectiveCircuitFailureThreshold() {
        return Math.max(1, circuitFailureThreshold);
    }

    private String trimBody(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String value = body.trim().replaceAll("\\s+", " ");
        return value.length() <= 240 ? value : value.substring(0, 240) + "...";
    }

    public synchronized ApiKeyValidation validateApiKey(String plainKey) {
        if (plainKey == null || plainKey.isBlank()) {
            throw ApiRouterAccessException.unauthorized("API key 不能为空");
        }

        String keyHash = hashPlainKey(plainKey.trim());
        List<StoredApiKeyRow> matches = jdbcTemplate.query(
                "select * from api_router_keys where key_hash = ? and deleted = false",
                storedApiKeyOwnerRowMapper(),
                keyHash
        );
        if (matches.isEmpty()) {
            throw ApiRouterAccessException.unauthorized("API key 不存在");
        }

        StoredApiKeyRow match = matches.get(0);
        StoredApiKey key = match.getKey();
        if (!"Enabled".equalsIgnoreCase(key.getStatus())) {
            throw ApiRouterAccessException.forbidden("API key 已暂停");
        }
        requireActiveUser(match.getEmail());
        enforceApiKeyUsagePolicy(match.getEmail(), key);
        return new ApiKeyValidation(
                match.getEmail(),
                key.getId(),
                key.getName(),
                key.getMask(),
                key.getQuota()
        );
    }

    public synchronized void recordProxyUsage(
            ApiKeyValidation validation,
            String model,
            int statusCode,
            long latencyMs,
            long inputTokens,
            long outputTokens,
            String errorMessage) {
        recordProxyUsage(validation, model, statusCode, latencyMs, inputTokens, outputTokens, "", "", errorMessage);
    }

    public synchronized void recordProxyUsage(
            ApiKeyValidation validation,
            String model,
            int statusCode,
            long latencyMs,
            long inputTokens,
            long outputTokens,
            String provider,
            String channelId,
            String errorMessage) {
        recordProxyUsage(validation, model, statusCode, latencyMs, inputTokens, outputTokens, provider, channelId, errorMessage, WalletReservation.none());
    }

    public synchronized void recordProxyUsage(
            ApiKeyValidation validation,
            String model,
            int statusCode,
            long latencyMs,
            long inputTokens,
            long outputTokens,
            String provider,
            String channelId,
            String errorMessage,
            WalletReservation reservation) {
        if (validation == null || validation.getEmail() == null) return;

        LocalDateTime now = LocalDateTime.now();
        String nowDisplay = now.format(DISPLAY_TIME);
        String nowStorage = now.format(STORAGE_TIME);
        long totalTokens = Math.max(0, inputTokens) + Math.max(0, outputTokens);
        boolean success = statusCode >= 200 && statusCode < 300 && (errorMessage == null || errorMessage.isBlank());
        double cost = estimateCost(model, inputTokens, outputTokens, provider, channelId);

        try {
            StoredApiKeyFile keyFile = loadKeyFile(validation.getEmail());
            StoredApiKey key = findStoredKey(keyFile, validation.getKeyId());
            key.setLastUsed(nowDisplay);
            key.setUpdatedAt(nowStorage);
            saveKeyFile(validation.getEmail(), keyFile);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to update API key last-used state for {}", maskEmail(validation.getEmail()), e);
        }

        String modelName = model == null || model.isBlank() ? "unknown" : model;
        ApiRouterUsageRecord record = new ApiRouterUsageRecord(
                UUID.randomUUID().toString(),
                validation.getEmail(),
                validation.getKeyId(),
                validation.getName(),
                validation.getMask(),
                modelName,
                provider == null ? "" : provider,
                channelId == null ? "" : channelId,
                nowStorage,
                nowDisplay,
                statusCode,
                success,
                latencyMs,
                Math.max(0, inputTokens),
                Math.max(0, outputTokens),
                totalTokens,
                cost,
                errorMessage == null ? "" : trimError(errorMessage, statusCode)
        );
        appendUsageRecord(validation.getEmail(), record, reservation);
    }

    private ApiRouterDashboard loadOrCreate(String email) {
        String owner = normalizeEmail(email);
        ensureWallet(owner);
        try {
            ApiRouterDashboard dashboard = jdbcTemplate.queryForObject(
                    "select email, range_value, granularity, updated_at from api_router_dashboard_preferences where email = ?",
                    (rs, rowNum) -> {
                        ApiRouterDashboard value = defaultDashboard(rs.getString("email"));
                        value.setRange(rs.getString("range_value"));
                        value.setGranularity(rs.getString("granularity"));
                        value.setUpdatedAt(rs.getString("updated_at"));
                        return value;
                    },
                    owner
            );
            return dashboard;
        } catch (EmptyResultDataAccessException e) {
            ApiRouterDashboard dashboard = defaultDashboard(owner);
            migrateLegacyDashboardIfNeeded(owner, dashboard);
            return dashboard;
        }
    }

    private void save(String email, ApiRouterDashboard dashboard) {
        String owner = normalizeEmail(email);
        if (dashboard == null) {
            dashboard = defaultDashboard(owner);
        }
        int updated = jdbcTemplate.update(
                "update api_router_dashboard_preferences set range_value = ?, granularity = ?, updated_at = ? where email = ?",
                normalizeRange(dashboard.getRange(), "7"),
                normalizeGranularity(dashboard.getGranularity(), "day"),
                dashboard.getUpdatedAt() == null || dashboard.getUpdatedAt().isBlank()
                        ? LocalDateTime.now().format(STORAGE_TIME)
                        : dashboard.getUpdatedAt(),
                owner
        );
        if (updated == 0) {
            jdbcTemplate.update(
                    "insert into api_router_dashboard_preferences(email, range_value, granularity, updated_at) values (?, ?, ?, ?)",
                    owner,
                    normalizeRange(dashboard.getRange(), "7"),
                    normalizeGranularity(dashboard.getGranularity(), "day"),
                    dashboard.getUpdatedAt() == null || dashboard.getUpdatedAt().isBlank()
                            ? LocalDateTime.now().format(STORAGE_TIME)
                            : dashboard.getUpdatedAt()
            );
        }
    }

    private File dataFile(String email) {
        return new File(storageDir(DATA_DIR), safeFileName(email) + ".json");
    }

    private File keyDataFile(String email) {
        return new File(storageDir(KEY_DIR), safeFileName(email) + ".json");
    }

    private StoredApiKeyFile loadKeyFile(String email) {
        String owner = normalizeEmail(email);
        ensureWallet(owner);
        List<StoredApiKey> keys = jdbcTemplate.query(
                "select * from api_router_keys where email = ? order by created_at",
                storedApiKeyRowMapper(),
                owner
        );
        if (keys.isEmpty()) {
            StoredApiKeyFile legacy = readLegacyKeyFile(owner);
            if (legacy != null && legacy.getKeys() != null && !legacy.getKeys().isEmpty()) {
                saveKeyFile(owner, legacy);
                return legacy;
            }
        }
        return new StoredApiKeyFile(owner, keys);
    }

    private void saveKeyFile(String email, StoredApiKeyFile keyFile) {
        String owner = normalizeEmail(email);
        ensureWallet(owner);
        if (keyFile == null || keyFile.getKeys() == null) {
            return;
        }
        for (StoredApiKey key : keyFile.getKeys()) {
            upsertStoredApiKey(owner, key);
        }
    }

    private File usageDataFile(String email) {
        return new File(storageDir(USAGE_DIR), safeFileName(email) + ".json");
    }

    private ApiRouterUsageFile loadUsageFile(String email) {
        String owner = normalizeEmail(email);
        ensureWallet(owner);
        List<ApiRouterUsageRecord> records = jdbcTemplate.query(
                "select * from api_router_usage_logs where email = ? order by created_at",
                apiRouterUsageRecordRowMapper(),
                owner
        );
        if (records.isEmpty()) {
            ApiRouterUsageFile legacy = readLegacyUsageFile(owner);
            if (legacy != null && legacy.getRecords() != null && !legacy.getRecords().isEmpty()) {
                saveUsageFile(owner, legacy);
                return legacy;
            }
        }
        return new ApiRouterUsageFile(owner, records);
    }

    private void saveUsageFile(String email, ApiRouterUsageFile usageFile) {
        String owner = normalizeEmail(email);
        ensureWallet(owner);
        if (usageFile == null || usageFile.getRecords() == null) {
            return;
        }
        for (ApiRouterUsageRecord record : usageFile.getRecords()) {
            insertUsageRecordIfAbsent(owner, record);
        }
    }

    private void appendUsageRecord(String email, ApiRouterUsageRecord record) {
        appendUsageRecord(email, record, WalletReservation.none());
    }

    private void appendUsageRecord(String email, ApiRouterUsageRecord record, WalletReservation reservation) {
        try {
            insertUsageRecordIfAbsent(normalizeEmail(email), record);
            appendUsageLedger(normalizeEmail(email), record, reservation);
            trimUsageRecords(normalizeEmail(email));
        } catch (RuntimeException e) {
            log.warn("Failed to append API router usage for {}", maskEmail(email), e);
        }
    }

    private File storageDir(String childDir) {
        return new File(new File(System.getProperty("user.home"), ".ciphertool"), childDir);
    }

    private RowMapper<StoredApiKey> storedApiKeyRowMapper() {
        return (rs, rowNum) -> new StoredApiKey(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("mask"),
                rs.getString("key_hash"),
                rs.getString("status"),
                rs.getString("quota"),
                rs.getString("used"),
                rs.getString("last_used"),
                rs.getString("created_at"),
                rs.getString("updated_at"),
                rs.getBoolean("deleted"),
                rs.getInt("key_rpm"),
                rs.getLong("key_tpm")
        );
    }

    private RowMapper<StoredApiKeyRow> storedApiKeyOwnerRowMapper() {
        return (rs, rowNum) -> new StoredApiKeyRow(
                normalizeEmail(rs.getString("email")),
                storedApiKeyRowMapper().mapRow(rs, rowNum)
        );
    }

    private RowMapper<ApiRouterUsageRecord> apiRouterUsageRecordRowMapper() {
        return (rs, rowNum) -> new ApiRouterUsageRecord(
                rs.getString("id"),
                normalizeEmail(rs.getString("email")),
                rs.getString("key_id"),
                rs.getString("key_name"),
                rs.getString("key_mask"),
                rs.getString("model"),
                rs.getString("provider"),
                rs.getString("channel_id"),
                rs.getString("created_at"),
                rs.getString("display_time"),
                rs.getInt("status_code"),
                rs.getBoolean("success"),
                rs.getLong("latency_ms"),
                rs.getLong("input_tokens"),
                rs.getLong("output_tokens"),
                rs.getLong("total_tokens"),
                rs.getDouble("cost"),
                rs.getString("error_message")
        );
    }

    private void upsertStoredApiKey(String email, StoredApiKey key) {
        if (key == null || key.getId() == null || key.getId().isBlank()) {
            return;
        }
        String owner = normalizeEmail(email);
        int updated = jdbcTemplate.update(
                "update api_router_keys set email = ?, name = ?, mask = ?, key_hash = ?, status = ?, quota = ?, used = ?, last_used = ?, created_at = ?, updated_at = ?, deleted = ?, key_rpm = ?, key_tpm = ? where id = ?",
                owner,
                blankToDefault(key.getName(), "router-key"),
                blankToDefault(key.getMask(), "sk-pzm-****"),
                blankToDefault(key.getKeyHash(), ""),
                blankToDefault(key.getStatus(), "Enabled"),
                blankToDefault(key.getQuota(), formatTokenQuota(effectiveDefaultTokenQuota())),
                blankToDefault(key.getUsed(), "$0.00"),
                blankToDefault(key.getLastUsed(), "-"),
                blankToDefault(key.getCreatedAt(), LocalDateTime.now().format(STORAGE_TIME)),
                blankToDefault(key.getUpdatedAt(), LocalDateTime.now().format(STORAGE_TIME)),
                key.isDeleted(),
                Math.max(0, key.getKeyRpm()),
                Math.max(0L, key.getKeyTpm()),
                key.getId()
        );
        if (updated == 0) {
            jdbcTemplate.update(
                    "insert into api_router_keys(id, email, name, mask, key_hash, status, quota, used, last_used, created_at, updated_at, deleted, key_rpm, key_tpm) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    key.getId(),
                    owner,
                    blankToDefault(key.getName(), "router-key"),
                    blankToDefault(key.getMask(), "sk-pzm-****"),
                    blankToDefault(key.getKeyHash(), ""),
                    blankToDefault(key.getStatus(), "Enabled"),
                    blankToDefault(key.getQuota(), formatTokenQuota(effectiveDefaultTokenQuota())),
                    blankToDefault(key.getUsed(), "$0.00"),
                    blankToDefault(key.getLastUsed(), "-"),
                    blankToDefault(key.getCreatedAt(), LocalDateTime.now().format(STORAGE_TIME)),
                    blankToDefault(key.getUpdatedAt(), LocalDateTime.now().format(STORAGE_TIME)),
                    key.isDeleted(),
                    Math.max(0, key.getKeyRpm()),
                    Math.max(0L, key.getKeyTpm())
            );
        }
    }

    private void insertUsageRecordIfAbsent(String email, ApiRouterUsageRecord record) {
        if (record == null || record.getId() == null || record.getId().isBlank()) {
            return;
        }
        String owner = normalizeEmail(email);
        Integer exists = jdbcTemplate.queryForObject(
                "select count(*) from api_router_usage_logs where id = ?",
                Integer.class,
                record.getId()
        );
        if (exists != null && exists > 0) {
            return;
        }
        jdbcTemplate.update(
                "insert into api_router_usage_logs(id, email, key_id, key_name, key_mask, model, provider, channel_id, created_at, display_time, status_code, success, latency_ms, input_tokens, output_tokens, total_tokens, cost, error_message) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                record.getId(),
                owner,
                blankToDefault(record.getKeyId(), ""),
                blankToDefault(record.getKeyName(), ""),
                blankToDefault(record.getKeyMask(), ""),
                blankToDefault(record.getModel(), "unknown"),
                blankToDefault(record.getProvider(), ""),
                blankToDefault(record.getChannelId(), ""),
                blankToDefault(record.getCreatedAt(), LocalDateTime.now().format(STORAGE_TIME)),
                blankToDefault(record.getDisplayTime(), LocalDateTime.now().format(DISPLAY_TIME)),
                record.getStatusCode(),
                record.isSuccess(),
                Math.max(0, record.getLatencyMs()),
                Math.max(0, record.getInputTokens()),
                Math.max(0, record.getOutputTokens()),
                Math.max(0, record.getTotalTokens()),
                BigDecimal.valueOf(Math.max(0.0, record.getCost())),
                blankToDefault(record.getErrorMessage(), "")
        );
    }

    private void appendUsageLedger(String email, ApiRouterUsageRecord record, WalletReservation reservation) {
        if (record == null) {
            return;
        }
        String owner = normalizeEmail(email);
        ensureWallet(owner);
        WalletReservation safeReservation = reservation == null ? WalletReservation.none() : reservation;
        double billableCost = record.isSuccess() ? Math.max(0.0, record.getCost()) : 0.0;
        double settlement = round4(billableCost - Math.max(0.0, safeReservation.getAmount()));
        if (Math.abs(settlement) < 0.0001) {
            return;
        }
        double nextBalance = currentWalletBalance(owner) - settlement;
        String now = LocalDateTime.now().format(STORAGE_TIME);
        jdbcTemplate.update(
                "update api_router_wallets set balance = ?, updated_at = ? where email = ?",
                BigDecimal.valueOf(round4(nextBalance)),
                now,
                owner
        );
        jdbcTemplate.update(
                "insert into api_router_ledger(id, email, key_id, usage_id, entry_type, amount, balance_after, description, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                owner,
                blankToDefault(record.getKeyId(), ""),
                blankToDefault(record.getId(), ""),
                settlement > 0 ? "USAGE_DEBIT" : "USAGE_RELEASE",
                BigDecimal.valueOf(-round4(settlement)),
                BigDecimal.valueOf(round4(nextBalance)),
                "Settle " + blankToDefault(record.getModel(), "unknown") + " usage"
                        + (safeReservation.getLedgerId().isBlank() ? "" : " from " + safeReservation.getLedgerId()),
                now
        );
    }

    private void trimUsageRecords(String email) {
        List<String> ids = jdbcTemplate.queryForList(
                "select id from api_router_usage_logs where email = ? order by created_at desc limit 100000 offset ?",
                String.class,
                normalizeEmail(email),
                MAX_STORED_USAGE_RECORDS
        );
        if (ids.isEmpty()) {
            return;
        }
        for (String id : ids) {
            jdbcTemplate.update("delete from api_router_usage_logs where id = ?", id);
        }
    }

    private void ensureWallet(String email) {
        String owner = normalizeEmail(email);
        if (owner.isBlank()) {
            return;
        }
        Integer exists = jdbcTemplate.queryForObject(
                "select count(*) from api_router_wallets where email = ?",
                Integer.class,
                owner
        );
        if (exists != null && exists > 0) {
            return;
        }
        String now = LocalDateTime.now().format(STORAGE_TIME);
        jdbcTemplate.update(
                "insert into api_router_wallets(email, currency, balance, created_at, updated_at) values (?, ?, ?, ?, ?)",
                owner,
                "USD",
                BigDecimal.ZERO,
                now,
                now
        );
    }

    private double currentWalletBalance(String email) {
        try {
            BigDecimal value = jdbcTemplate.queryForObject(
                    "select balance from api_router_wallets where email = ?",
                    BigDecimal.class,
                    normalizeEmail(email)
            );
            return value == null ? 0.0 : value.doubleValue();
        } catch (EmptyResultDataAccessException e) {
            return 0.0;
        }
    }

    private void seedDefaultChannel() {
        if (defaultUpstreamApiKey == null || defaultUpstreamApiKey.isBlank()) {
            return;
        }
        String now = LocalDateTime.now().format(STORAGE_TIME);
        String id = "default-env";
        int updated = jdbcTemplate.update(
                "update api_router_channels set name = ?, provider = ?, base_url = ?, api_key = ?, models = ?, priority = ?, weight = ?, enabled = ?, retry_enabled = ?, updated_at = ? where id = ?",
                "Default ENV upstream",
                inferProvider(defaultUpstreamBaseUrl),
                blankToDefault(defaultUpstreamBaseUrl, "https://api.openai.com/v1"),
                defaultUpstreamApiKey.trim(),
                blankToDefault(defaultUpstreamModel, "*") + ",*",
                100,
                1,
                true,
                true,
                now,
                id
        );
        if (updated == 0) {
            jdbcTemplate.update(
                    "insert into api_router_channels(id, name, provider, base_url, api_key, models, priority, weight, enabled, retry_enabled, failure_count, last_status, last_error, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    id,
                    "Default ENV upstream",
                    inferProvider(defaultUpstreamBaseUrl),
                    blankToDefault(defaultUpstreamBaseUrl, "https://api.openai.com/v1"),
                    defaultUpstreamApiKey.trim(),
                    blankToDefault(defaultUpstreamModel, "*") + ",*",
                    100,
                    1,
                    true,
                    true,
                    0,
                    0,
                    "",
                    now,
                    now
            );
        }
    }

    public synchronized List<UpstreamChannel> resolveUpstreamChannels(String model) {
        String requestedModel = model == null || model.isBlank() ? blankToDefault(defaultUpstreamModel, "*") : model.trim();
        String now = LocalDateTime.now().format(STORAGE_TIME);
        List<UpstreamChannel> channels = jdbcTemplate.query(
                "select * from api_router_channels where enabled = true and (circuit_state <> 'OPEN' or circuit_disabled_until = '' or circuit_disabled_until <= ?) order by priority asc, failure_count asc, name asc",
                upstreamChannelRowMapper(),
                now
        ).stream()
                .filter(channel -> channel.getApiKey() != null && !channel.getApiKey().isBlank())
                .filter(channel -> channelSupportsModel(channel, requestedModel))
                .toList();
        if (!channels.isEmpty()) {
            return channels;
        }
        if (defaultUpstreamApiKey != null && !defaultUpstreamApiKey.isBlank()) {
            return List.of(new UpstreamChannel(
                    "default-env",
                    "Default ENV upstream",
                    inferProvider(defaultUpstreamBaseUrl),
                    blankToDefault(defaultUpstreamBaseUrl, "https://api.openai.com/v1"),
                    defaultUpstreamApiKey.trim(),
                    "*",
                    100,
                    1,
                    true
            ));
        }
        return new ArrayList<>();
    }

    public synchronized void markChannelResult(UpstreamChannel channel, int statusCode, String errorMessage) {
        if (channel == null || channel.getId() == null || channel.getId().isBlank()) {
            return;
        }
        boolean success = statusCode >= 200 && statusCode < 300 && (errorMessage == null || errorMessage.isBlank());
        String now = LocalDateTime.now().format(STORAGE_TIME);
        if (success) {
            jdbcTemplate.update(
                    "update api_router_channels set failure_count = 0, last_status = ?, last_error = '', circuit_state = 'CLOSED', circuit_disabled_until = '', updated_at = ? where id = ?",
                    statusCode,
                    now,
                    channel.getId()
            );
        } else {
            int nextFailureCount = currentChannelFailureCount(channel.getId()) + 1;
            boolean openCircuit = nextFailureCount >= effectiveCircuitFailureThreshold();
            String disabledUntil = openCircuit
                    ? LocalDateTime.now().plusMinutes(Math.max(1L, circuitOpenMinutes)).format(STORAGE_TIME)
                    : "";
            jdbcTemplate.update(
                    "update api_router_channels set failure_count = ?, last_status = ?, last_error = ?, circuit_state = ?, circuit_disabled_until = ?, updated_at = ? where id = ?",
                    nextFailureCount,
                    statusCode,
                    trimError(blankToDefault(errorMessage, "HTTP " + statusCode), statusCode),
                    openCircuit ? "OPEN" : "CLOSED",
                    disabledUntil,
                    now,
                    channel.getId()
            );
        }
    }

    private int currentChannelFailureCount(String channelId) {
        try {
            Integer value = jdbcTemplate.queryForObject(
                    "select failure_count from api_router_channels where id = ?",
                    Integer.class,
                    channelId
            );
            return value == null ? 0 : Math.max(0, value);
        } catch (EmptyResultDataAccessException e) {
            return 0;
        }
    }

    private RowMapper<UpstreamChannel> upstreamChannelRowMapper() {
        return (rs, rowNum) -> new UpstreamChannel(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("provider"),
                rs.getString("base_url"),
                rs.getString("api_key"),
                rs.getString("models"),
                rs.getInt("priority"),
                rs.getInt("weight"),
                rs.getBoolean("retry_enabled")
        );
    }

    private RowMapper<ApiRouterDashboard.ChannelInfo> channelInfoRowMapper() {
        return (rs, rowNum) -> new ApiRouterDashboard.ChannelInfo(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("provider"),
                rs.getString("base_url"),
                maskUpstreamKey(rs.getString("api_key")),
                rs.getString("models"),
                rs.getInt("priority"),
                rs.getInt("weight"),
                rs.getBoolean("enabled"),
                rs.getBoolean("retry_enabled"),
                rs.getInt("failure_count"),
                rs.getInt("last_status"),
                rs.getString("last_error"),
                rs.getString("circuit_state"),
                rs.getString("circuit_disabled_until"),
                rs.getString("last_checked_at"),
                rs.getString("updated_at")
        );
    }

    private RowMapper<ApiRouterDashboard.ModelPriceInfo> modelPriceInfoRowMapper() {
        return (rs, rowNum) -> new ApiRouterDashboard.ModelPriceInfo(
                rs.getString("id"),
                rs.getString("model_pattern"),
                rs.getString("provider"),
                rs.getString("channel_id"),
                rs.getDouble("input_price_per_million"),
                rs.getDouble("output_price_per_million"),
                rs.getInt("priority"),
                rs.getBoolean("enabled"),
                rs.getString("note"),
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }

    private ApiRouterStatus.ChannelHealth toChannelHealth(ApiRouterDashboard.ChannelInfo channel, boolean adminView) {
        return new ApiRouterStatus.ChannelHealth(
                channel.getId(),
                channel.getName(),
                channel.getProvider(),
                channel.getModels(),
                channel.isEnabled(),
                channelState(channel),
                channel.getFailureCount(),
                channel.getLastStatus(),
                adminView ? blankToDefault(channel.getLastError(), "") : "",
                blankToDefault(channel.getCircuitState(), "CLOSED"),
                blankToDefault(channel.getCircuitDisabledUntil(), ""),
                blankToDefault(channel.getLastCheckedAt(), ""),
                channel.getUpdatedAt()
        );
    }

    private String channelState(ApiRouterDashboard.ChannelInfo channel) {
        if (channel == null || !channel.isEnabled()) {
            return "disabled";
        }
        String circuitState = blankToDefault(channel.getCircuitState(), "CLOSED");
        String disabledUntil = blankToDefault(channel.getCircuitDisabledUntil(), "");
        String now = LocalDateTime.now().format(STORAGE_TIME);
        if ("OPEN".equalsIgnoreCase(circuitState) && !disabledUntil.isBlank() && disabledUntil.compareTo(now) > 0) {
            return "circuit_open";
        }
        if ("OPEN".equalsIgnoreCase(circuitState)) {
            return "half_open";
        }
        int lastStatus = channel.getLastStatus();
        int failureCount = channel.getFailureCount();
        if (lastStatus == 0 && failureCount == 0) {
            return "unknown";
        }
        if (lastStatus >= 200 && lastStatus < 400 && failureCount == 0) {
            return "healthy";
        }
        if (lastStatus >= 500 || failureCount >= 3) {
            return "unhealthy";
        }
        return "degraded";
    }

    private String gatewayStatus(
            int enabledChannelCount,
            int healthyChannelCount,
            List<ApiRouterStatus.ChannelHealth> channels) {
        if (enabledChannelCount <= 0) {
            return "unavailable";
        }
        boolean hasUnhealthy = channels.stream()
                .filter(ApiRouterStatus.ChannelHealth::isEnabled)
                .anyMatch(channel -> "unhealthy".equals(channel.getState()) || "circuit_open".equals(channel.getState()));
        boolean hasUnknown = channels.stream()
                .filter(ApiRouterStatus.ChannelHealth::isEnabled)
                .anyMatch(channel -> "unknown".equals(channel.getState()) || "half_open".equals(channel.getState()));
        if (healthyChannelCount == enabledChannelCount) {
            return "healthy";
        }
        if (healthyChannelCount > 0 || hasUnknown) {
            return "degraded";
        }
        return hasUnhealthy ? "unavailable" : "degraded";
    }

    private String gatewayStatusMessage(String status, int enabledChannelCount, int healthyChannelCount) {
        if ("healthy".equals(status)) {
            return "所有启用渠道最近状态正常";
        }
        if ("unavailable".equals(status)) {
            return enabledChannelCount <= 0 ? "当前没有启用的上游渠道" : "启用渠道均处于异常状态";
        }
        return "部分渠道未检测或近期出现失败，请检查渠道健康详情";
    }

    private long countUsageLogs(String sql, Object... args) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, args);
        return value == null ? 0L : value;
    }

    private double avgLatencyMs(String since) {
        Number value = jdbcTemplate.queryForObject(
                "select avg(latency_ms) from api_router_usage_logs where created_at >= ?",
                Number.class,
                since
        );
        return value == null ? 0.0 : value.doubleValue();
    }

    private RowMapper<ApiRouterDashboard.RedeemCodeInfo> redeemCodeInfoRowMapper() {
        return (rs, rowNum) -> new ApiRouterDashboard.RedeemCodeInfo(
                rs.getString("code"),
                rs.getDouble("amount"),
                rs.getInt("max_uses"),
                rs.getInt("used_count"),
                rs.getBoolean("enabled"),
                rs.getString("expires_at"),
                rs.getString("note"),
                rs.getString("created_by"),
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }

    private RowMapper<ApiRouterDashboard.OrderInfo> orderInfoRowMapper() {
        return (rs, rowNum) -> new ApiRouterDashboard.OrderInfo(
                rs.getString("id"),
                normalizeEmail(rs.getString("email")),
                rs.getDouble("amount"),
                rs.getString("pay_method"),
                rs.getString("status"),
                rs.getString("external_trade_no"),
                rs.getString("idempotency_key"),
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

    private RowMapper<ApiRouterPaymentReconciliation.Issue> reconciliationIssueRowMapper() {
        return (rs, rowNum) -> new ApiRouterPaymentReconciliation.Issue(
                rs.getString("id"),
                rs.getString("issue_key"),
                rs.getString("order_id"),
                normalizeEmail(rs.getString("email")),
                rs.getString("pay_method"),
                rs.getString("order_status"),
                rs.getDouble("order_amount"),
                rs.getDouble("callback_amount"),
                rs.getString("external_trade_no"),
                rs.getString("issue_type"),
                rs.getString("severity"),
                rs.getBoolean("resolved"),
                rs.getString("message"),
                rs.getString("first_seen_at"),
                rs.getString("last_seen_at"),
                rs.getString("resolved_at"),
                normalizeEmail(rs.getString("resolved_by")),
                rs.getString("resolve_note")
        );
    }

    private ApiRouterDashboard.OrderInfo ensureOrderPaymentSession(ApiRouterDashboard.OrderInfo order) {
        if (order == null || !"PENDING".equalsIgnoreCase(order.getStatus())) {
            return order;
        }
        if ((order.getCheckoutUrl() != null && !order.getCheckoutUrl().isBlank())
                || (order.getPaymentInstructions() != null && !order.getPaymentInstructions().isBlank())) {
            return order;
        }
        ApiRouterPaymentService.PaymentSession session = paymentService.createPaymentSession(
                order.getId(),
                order.getEmail(),
                order.getAmount(),
                order.getPayMethod()
        );
        jdbcTemplate.update(
                "update api_router_orders set checkout_url = ?, qr_code_url = ?, payment_instructions = ?, payment_expires_at = ?, payment_payload = ?, updated_at = ? where id = ?",
                session.checkoutUrl(),
                session.qrCodeUrl(),
                session.instructions(),
                session.expiresAt(),
                session.payload(),
                LocalDateTime.now().format(STORAGE_TIME),
                order.getId()
        );
        return findOrder(order.getId());
    }

    private ApiRouterAdminOverview.UserSummary adminUserSummary(String email) {
        String owner = normalizeEmail(email);
        UserControl control = userControl(owner);
        return new ApiRouterAdminOverview.UserSummary(
                owner,
                control.status(),
                control.frozen(),
                control.reason(),
                control.updatedAt(),
                adminWalletBalance(owner),
                countForInt("select count(*) from api_router_keys where email = ? and deleted = false", owner),
                countForInt("select count(*) from api_router_keys where email = ? and deleted = false and status = 'Enabled'", owner),
                countForLong("select count(*) from api_router_usage_logs where email = ?", owner),
                round4(sumForDouble("select coalesce(sum(cost), 0) from api_router_usage_logs where email = ?", owner)),
                latestActivity(owner),
                countForInt("select count(*) from api_router_orders where email = ? and status = 'PENDING'", owner),
                countForInt("select count(*) from api_router_orders where email = ? and status = 'PAID'", owner)
        );
    }

    private UserControl userControl(String email) {
        String owner = normalizeEmail(email);
        if (owner.isBlank()) {
            return UserControl.active();
        }
        try {
            return jdbcTemplate.queryForObject(
                    "select status, frozen, reason, updated_at from api_router_user_controls where email = ?",
                    (rs, rowNum) -> new UserControl(
                            blankToDefault(rs.getString("status"), "ACTIVE"),
                            rs.getBoolean("frozen"),
                            blankToDefault(rs.getString("reason"), ""),
                            blankToDefault(rs.getString("updated_at"), "")
                    ),
                    owner
            );
        } catch (EmptyResultDataAccessException e) {
            return UserControl.active();
        }
    }

    private RowMapper<ApiRouterAdminOverview.AuditEntry> adminAuditRowMapper() {
        return (rs, rowNum) -> new ApiRouterAdminOverview.AuditEntry(
                rs.getString("id"),
                rs.getString("operator_email"),
                rs.getString("action"),
                rs.getString("target_type"),
                rs.getString("target_id"),
                rs.getString("target_email"),
                rs.getString("detail"),
                rs.getString("created_at")
        );
    }

    private double adminWalletBalance(String email) {
        try {
            BigDecimal value = jdbcTemplate.queryForObject(
                    "select balance from api_router_wallets where email = ?",
                    BigDecimal.class,
                    normalizeEmail(email)
            );
            return value == null ? 0.0 : round4(value.doubleValue());
        } catch (EmptyResultDataAccessException e) {
            return 0.0;
        }
    }

    private String latestActivity(String email) {
        String owner = normalizeEmail(email);
        List<String> values = new ArrayList<>();
        values.addAll(jdbcTemplate.queryForList(
                "select created_at from api_router_usage_logs where email = ? order by created_at desc limit 1",
                String.class,
                owner
        ));
        values.addAll(jdbcTemplate.queryForList(
                "select updated_at from api_router_orders where email = ? order by updated_at desc limit 1",
                String.class,
                owner
        ));
        values.addAll(jdbcTemplate.queryForList(
                "select updated_at from api_router_wallets where email = ?",
                String.class,
                owner
        ));
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .max(String::compareTo)
                .orElse("");
    }

    private int countForInt(String sql, Object... args) {
        return (int) Math.min(Integer.MAX_VALUE, countForLong(sql, args));
    }

    private long countForLong(String sql, Object... args) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, args);
        return value == null ? 0L : value;
    }

    private double sumForDouble(String sql, Object... args) {
        Number value = jdbcTemplate.queryForObject(sql, Number.class, args);
        return value == null ? 0.0 : value.doubleValue();
    }

    private ApiRouterDashboard.OrderInfo findOrder(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return null;
        }
        try {
            return jdbcTemplate.queryForObject(
                    "select * from api_router_orders where id = ?",
                    orderInfoRowMapper(),
                    orderId.trim()
            );
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    private ApiRouterDashboard.OrderInfo findOrderByIdempotencyKey(String email, String idempotencyKey) {
        if (email == null || email.isBlank() || idempotencyKey == null || idempotencyKey.isBlank()) {
            return null;
        }
        try {
            return jdbcTemplate.queryForObject(
                    "select * from api_router_orders where email = ? and idempotency_key = ? order by created_at desc limit 1",
                    orderInfoRowMapper(),
                    normalizeEmail(email),
                    normalizeIdempotencyKey(idempotencyKey)
            );
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    private void updateOrderTerminalStatus(
            ApiRouterDashboard.OrderInfo order,
            String operatorEmail,
            String status,
            String externalTradeNo,
            String note) {
        String normalizedStatus = normalizeOrderStatus(status);
        if ("PAID".equalsIgnoreCase(order.getStatus())) {
            return;
        }
        if (!"PENDING".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("只能处理待支付订单");
        }

        String now = LocalDateTime.now().format(STORAGE_TIME);
        String paidAt = "PAID".equals(normalizedStatus) ? now : "";
        int updated = jdbcTemplate.update(
                "update api_router_orders set status = ?, external_trade_no = ?, note = ?, paid_at = ?, updated_at = ? where id = ? and status = 'PENDING'",
                normalizedStatus,
                blankToDefault(externalTradeNo, ""),
                blankToDefault(note, order.getNote()),
                paidAt,
                now,
                order.getId()
        );
        if (updated == 0) {
            return;
        }
        if ("PAID".equals(normalizedStatus)) {
            creditOrder(order, operatorEmail, now);
        }
    }

    private void creditOrder(ApiRouterDashboard.OrderInfo order, String operatorEmail, String now) {
        Integer credited = jdbcTemplate.queryForObject(
                "select count(*) from api_router_ledger where usage_id = ? and entry_type = 'ORDER_CREDIT'",
                Integer.class,
                order.getId()
        );
        if (credited != null && credited > 0) {
            return;
        }
        String owner = normalizeEmail(order.getEmail());
        ensureWallet(owner);
        double nextBalance = round4(currentWalletBalance(owner) + Math.max(0.0, order.getAmount()));
        jdbcTemplate.update(
                "update api_router_wallets set balance = ?, updated_at = ? where email = ?",
                BigDecimal.valueOf(nextBalance),
                now,
                owner
        );
        jdbcTemplate.update(
                "insert into api_router_ledger(id, email, key_id, usage_id, entry_type, amount, balance_after, description, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                owner,
                "",
                order.getId(),
                "ORDER_CREDIT",
                BigDecimal.valueOf(round4(order.getAmount())),
                BigDecimal.valueOf(nextBalance),
                "Order paid by " + normalizeEmail(operatorEmail) + ": " + order.getId(),
                now
        );
    }

    private void appendPaymentCallbackLog(
            String orderId,
            String payMethod,
            String externalTradeNo,
            double amount,
            String status,
            String nonce,
            String signature,
            String callbackKey,
            String payload,
            boolean verified,
            boolean processed,
            boolean replay,
            String message,
            String now) {
        jdbcTemplate.update(
                "insert into api_router_payment_callbacks(id, order_id, pay_method, external_trade_no, amount, status, nonce, signature, callback_key, payload, verified, processed, replay, message, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                blankToDefault(orderId, ""),
                blankToDefault(payMethod, ""),
                blankToDefault(externalTradeNo, ""),
                BigDecimal.valueOf(round4(amount)),
                blankToDefault(status, ""),
                blankToDefault(nonce, ""),
                blankToDefault(signature, ""),
                blankToDefault(callbackKey, ""),
                trimPayload(payload),
                verified,
                processed,
                replay,
                blankToDefault(message, ""),
                now
        );
    }

    private void scanPaymentReconciliationIssues(String now) {
        reconcileExpiredPendingOrders(now);
        reconcileFailedPaymentCallbacks(now);
        reconcilePaidOrdersWithoutLedger(now);
        reconcileDuplicateExternalTrades(now);
    }

    private void reconcileExpiredPendingOrders(String now) {
        List<ApiRouterDashboard.OrderInfo> orders = jdbcTemplate.query(
                "select * from api_router_orders where status = 'PENDING' and payment_expires_at <> '' and payment_expires_at < ? order by payment_expires_at desc limit 200",
                orderInfoRowMapper(),
                now
        );
        for (ApiRouterDashboard.OrderInfo order : orders) {
            upsertReconciliationIssue(
                    "expired_pending|" + order.getId(),
                    order.getId(),
                    order.getEmail(),
                    order.getPayMethod(),
                    order.getStatus(),
                    order.getAmount(),
                    0.0,
                    order.getExternalTradeNo(),
                    "EXPIRED_PENDING_ORDER",
                    "WARN",
                    "订单已超过支付有效期但仍为待支付",
                    now
            );
        }
    }

    private void reconcileFailedPaymentCallbacks(String now) {
        jdbcTemplate.query(
                "select c.*, o.email, o.status as order_status, o.amount as order_amount from api_router_payment_callbacks c "
                        + "left join api_router_orders o on c.order_id = o.id "
                        + "where c.processed = false order by c.created_at desc limit 500",
                rs -> {
                    String message = blankToDefault(rs.getString("message"), "");
                    boolean replay = rs.getBoolean("replay");
                    boolean verified = rs.getBoolean("verified");
                    String issueType = callbackIssueType(message, verified, replay);
                    String severity = callbackIssueSeverity(issueType);
                    upsertReconciliationIssue(
                            "callback|" + rs.getString("id"),
                            rs.getString("order_id"),
                            normalizeEmail(rs.getString("email")),
                            rs.getString("pay_method"),
                            blankToDefault(rs.getString("order_status"), ""),
                            rs.getDouble("order_amount"),
                            rs.getDouble("amount"),
                            rs.getString("external_trade_no"),
                            issueType,
                            severity,
                            message.isBlank() ? "支付回调未入账" : message,
                            now
                    );
                }
        );
    }

    private void reconcilePaidOrdersWithoutLedger(String now) {
        List<ApiRouterDashboard.OrderInfo> orders = jdbcTemplate.query(
                "select o.* from api_router_orders o left join api_router_ledger l on l.usage_id = o.id and l.entry_type = 'ORDER_CREDIT' "
                        + "where o.status = 'PAID' and l.id is null order by o.updated_at desc limit 200",
                orderInfoRowMapper()
        );
        for (ApiRouterDashboard.OrderInfo order : orders) {
            upsertReconciliationIssue(
                    "paid_no_ledger|" + order.getId(),
                    order.getId(),
                    order.getEmail(),
                    order.getPayMethod(),
                    order.getStatus(),
                    order.getAmount(),
                    0.0,
                    order.getExternalTradeNo(),
                    "PAID_ORDER_WITHOUT_LEDGER",
                    "BLOCKER",
                    "订单已支付但未发现 ORDER_CREDIT 钱包流水",
                    now
            );
        }
    }

    private void reconcileDuplicateExternalTrades(String now) {
        jdbcTemplate.query(
                "select pay_method, external_trade_no, count(*) as paid_count, sum(amount) as paid_amount "
                        + "from api_router_orders where status = 'PAID' and external_trade_no <> '' "
                        + "group by pay_method, external_trade_no having count(*) > 1 limit 100",
                rs -> {
                    String payMethod = rs.getString("pay_method");
                    String tradeNo = rs.getString("external_trade_no");
                    upsertReconciliationIssue(
                            "duplicate_trade|" + payMethod + "|" + tradeNo,
                            "",
                            "",
                            payMethod,
                            "PAID",
                            rs.getDouble("paid_amount"),
                            0.0,
                            tradeNo,
                            "DUPLICATE_EXTERNAL_TRADE",
                            "BLOCKER",
                            "同一支付流水号关联了多个已支付订单: " + rs.getInt("paid_count"),
                            now
                    );
                }
        );
    }

    private void upsertReconciliationIssue(
            String issueKey,
            String orderId,
            String email,
            String payMethod,
            String orderStatus,
            double orderAmount,
            double callbackAmount,
            String externalTradeNo,
            String issueType,
            String severity,
            String message,
            String now) {
        String key = trimIssueKey(issueKey);
        if (key.isBlank()) {
            return;
        }
        List<String> existing = jdbcTemplate.queryForList(
                "select id from api_router_order_reconciliations where issue_key = ? limit 1",
                String.class,
                key
        );
        if (existing.isEmpty()) {
            jdbcTemplate.update(
                    "insert into api_router_order_reconciliations(id, issue_key, order_id, email, pay_method, order_status, order_amount, callback_amount, external_trade_no, issue_type, severity, resolved, message, first_seen_at, last_seen_at, resolved_at, resolved_by, resolve_note) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID().toString(),
                    key,
                    blankToDefault(orderId, ""),
                    normalizeEmail(email),
                    blankToDefault(payMethod, ""),
                    blankToDefault(orderStatus, ""),
                    BigDecimal.valueOf(round4(orderAmount)),
                    BigDecimal.valueOf(round4(callbackAmount)),
                    blankToDefault(externalTradeNo, ""),
                    blankToDefault(issueType, "UNKNOWN"),
                    normalizeSeverity(severity),
                    false,
                    trimReconciliationMessage(message),
                    now,
                    now,
                    "",
                    "",
                    ""
            );
            return;
        }
        jdbcTemplate.update(
                "update api_router_order_reconciliations set order_id = ?, email = ?, pay_method = ?, order_status = ?, order_amount = ?, callback_amount = ?, external_trade_no = ?, issue_type = ?, severity = ?, message = ?, last_seen_at = ? where issue_key = ? and resolved = false",
                blankToDefault(orderId, ""),
                normalizeEmail(email),
                blankToDefault(payMethod, ""),
                blankToDefault(orderStatus, ""),
                BigDecimal.valueOf(round4(orderAmount)),
                BigDecimal.valueOf(round4(callbackAmount)),
                blankToDefault(externalTradeNo, ""),
                blankToDefault(issueType, "UNKNOWN"),
                normalizeSeverity(severity),
                trimReconciliationMessage(message),
                now,
                key
        );
    }

    private String callbackIssueType(String message, boolean verified, boolean replay) {
        if (replay) {
            return "REPLAY_CALLBACK";
        }
        if (!verified) {
            return "CALLBACK_UNVERIFIED";
        }
        String value = message == null ? "" : message;
        if (value.contains("金额")) {
            return "AMOUNT_MISMATCH";
        }
        if (value.contains("支付方式")) {
            return "PAY_METHOD_MISMATCH";
        }
        if (value.contains("订单不存在")) {
            return "ORDER_NOT_FOUND";
        }
        return "CALLBACK_UNPROCESSED";
    }

    private String callbackIssueSeverity(String issueType) {
        if ("AMOUNT_MISMATCH".equals(issueType)
                || "PAY_METHOD_MISMATCH".equals(issueType)
                || "ORDER_NOT_FOUND".equals(issueType)
                || "DUPLICATE_EXTERNAL_TRADE".equals(issueType)) {
            return "BLOCKER";
        }
        if ("REPLAY_CALLBACK".equals(issueType) || "CALLBACK_UNVERIFIED".equals(issueType)) {
            return "WARN";
        }
        return "INFO";
    }

    private void requireCallbackNonce(String nonce) {
        if (nonce == null || nonce.isBlank()) {
            throw new IllegalArgumentException("支付回调 nonce 不能为空");
        }
    }

    private void registerPaymentCallbackNonce(
            String callbackKey,
            String payMethod,
            String nonce,
            String orderId,
            String externalTradeNo,
            String signature,
            String now) {
        try {
            jdbcTemplate.update(
                    "insert into api_router_payment_callback_nonces(callback_key, pay_method, nonce, order_id, external_trade_no, signature, created_at) values (?, ?, ?, ?, ?, ?, ?)",
                    callbackKey,
                    blankToDefault(payMethod, ""),
                    blankToDefault(nonce, ""),
                    blankToDefault(orderId, ""),
                    blankToDefault(externalTradeNo, ""),
                    blankToDefault(signature, ""),
                    now
            );
        } catch (DuplicateKeyException e) {
            throw new PaymentCallbackReplayException("支付回调 nonce 已处理，疑似重放");
        }
    }

    private String callbackKey(String payMethod, String nonce) {
        if (nonce == null || nonce.isBlank()) {
            return "";
        }
        return trimCallbackKey(blankToDefault(payMethod, "") + "|" + nonce);
    }

    private String normalizeCallbackNonce(String nonce) {
        if (nonce == null || nonce.isBlank()) {
            return "";
        }
        String value = nonce.trim();
        return value.length() <= 128 ? value : value.substring(0, 128);
    }

    private String normalizeCallbackSignature(String signature) {
        if (signature == null || signature.isBlank()) {
            return "";
        }
        String value = signature.trim().toLowerCase(Locale.ROOT);
        return value.length() <= 128 ? value : value.substring(0, 128);
    }

    private String normalizePayMethod(String payMethod) {
        String value = payMethod == null ? "" : payMethod.trim().toLowerCase(Locale.ROOT);
        if (value.equals("alipay") || value.equals("wechat") || value.equals("stripe") || value.equals("redeem") || value.equals("manual-test")) {
            return value;
        }
        return "manual";
    }

    private String normalizeOrderStatus(String status) {
        if ("PAID".equalsIgnoreCase(status) || "已支付".equals(status)) {
            return "PAID";
        }
        if ("CANCELLED".equalsIgnoreCase(status) || "CANCELED".equalsIgnoreCase(status) || "取消".equals(status)) {
            return "CANCELLED";
        }
        throw new IllegalArgumentException("订单状态不正确");
    }

    private String normalizeIdempotencyKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return "";
        }
        String value = idempotencyKey.trim();
        return value.length() <= 128 ? value : value.substring(0, 128);
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

    private String hmacSha256(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 not available", e);
        }
    }

    private String trimPayload(String payload) {
        if (payload == null) {
            return "";
        }
        return payload.length() <= 4000 ? payload : payload.substring(0, 4000);
    }

    private ChannelSecret findChannelSecret(String channelId) {
        try {
            return jdbcTemplate.queryForObject(
                    "select id, api_key from api_router_channels where id = ?",
                    (rs, rowNum) -> new ChannelSecret(rs.getString("id"), rs.getString("api_key")),
                    channelId
            );
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    private RedeemCodeRecord findRedeemCode(String code) {
        try {
            return jdbcTemplate.queryForObject(
                    "select code, amount, max_uses, used_count, enabled, expires_at from api_router_redeem_codes where code = ?",
                    (rs, rowNum) -> new RedeemCodeRecord(
                            rs.getString("code"),
                            rs.getDouble("amount"),
                            rs.getInt("max_uses"),
                            rs.getInt("used_count"),
                            rs.getBoolean("enabled"),
                            rs.getString("expires_at")
                    ),
                    normalizeRedeemCode(code)
            );
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    private boolean isRedeemCodeExpired(String expiresAt) {
        if (expiresAt == null || expiresAt.isBlank()) {
            return false;
        }
        try {
            return LocalDateTime.parse(expiresAt, STORAGE_TIME).isBefore(LocalDateTime.now());
        } catch (RuntimeException e) {
            return false;
        }
    }

    private String normalizeRedeemCode(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private String normalizeExpiresAt(String expiresAt) {
        if (expiresAt == null || expiresAt.isBlank()) {
            return "";
        }
        String value = expiresAt.trim();
        try {
            return LocalDateTime.parse(value, STORAGE_TIME).format(STORAGE_TIME);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("过期时间格式应为 yyyy-MM-ddTHH:mm:ss");
        }
    }

    private String generateRedeemCode() {
        byte[] bytes = new byte[9];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
                .toUpperCase(Locale.ROOT)
                .replace("_", "X")
                .replace("-", "Z");
        return "PZM-" + raw.substring(0, 4) + "-" + raw.substring(4, 8) + "-" + raw.substring(8, 12);
    }

    private String maskUpstreamKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return "";
        }
        String value = apiKey.trim();
        if (value.length() <= 10) {
            return "****";
        }
        return value.substring(0, Math.min(6, value.length())) + "****" + value.substring(value.length() - 4);
    }

    private boolean channelSupportsModel(UpstreamChannel channel, String model) {
        if (channel == null || channel.getModels() == null || channel.getModels().isBlank()) {
            return true;
        }
        String normalizedModel = model == null ? "" : model.trim().toLowerCase(Locale.ROOT);
        for (String item : channel.getModels().split(",")) {
            String candidate = item.trim().toLowerCase(Locale.ROOT);
            if (candidate.equals("*") || candidate.equals(normalizedModel)) {
                return true;
            }
        }
        return false;
    }

    private String inferProvider(String baseUrl) {
        String value = baseUrl == null ? "" : baseUrl.toLowerCase(Locale.ROOT);
        if (value.contains("aisenyu")) return "aisenyu";
        if (value.contains("openrouter")) return "openrouter";
        if (value.contains("openai")) return "openai";
        return "openai-compatible";
    }

    private void migrateLegacyDashboardIfNeeded(String email, ApiRouterDashboard dashboard) {
        File file = dataFile(email);
        if (!file.exists()) {
            return;
        }
        try {
            ApiRouterDashboard legacy = objectMapper.readValue(file, ApiRouterDashboard.class);
            if (legacy.getRange() != null) dashboard.setRange(legacy.getRange());
            if (legacy.getGranularity() != null) dashboard.setGranularity(legacy.getGranularity());
            if (legacy.getUpdatedAt() != null) dashboard.setUpdatedAt(legacy.getUpdatedAt());
            save(email, dashboard);
        } catch (IOException e) {
            log.warn("Failed to migrate legacy dashboard for {}", maskEmail(email), e);
        }
    }

    private StoredApiKeyFile readLegacyKeyFile(String email) {
        File file = keyDataFile(email);
        if (!file.exists()) {
            return null;
        }
        try {
            StoredApiKeyFile keyFile = objectMapper.readValue(file, StoredApiKeyFile.class);
            if (keyFile.getEmail() == null || keyFile.getEmail().isBlank()) {
                keyFile.setEmail(email);
            }
            if (keyFile.getKeys() == null) {
                keyFile.setKeys(new ArrayList<>());
            }
            keyFile.setEmail(normalizeEmail(keyFile.getEmail()));
            return keyFile;
        } catch (IOException e) {
            log.warn("Failed to read legacy API key data for {}", maskEmail(email), e);
            return null;
        }
    }

    private ApiRouterUsageFile readLegacyUsageFile(String email) {
        File file = usageDataFile(email);
        if (!file.exists()) {
            return null;
        }
        try {
            ApiRouterUsageFile usageFile = objectMapper.readValue(file, ApiRouterUsageFile.class);
            if (usageFile.getEmail() == null || usageFile.getEmail().isBlank()) {
                usageFile.setEmail(email);
            }
            if (usageFile.getRecords() == null) {
                usageFile.setRecords(new ArrayList<>());
            }
            usageFile.setEmail(normalizeEmail(usageFile.getEmail()));
            return usageFile;
        } catch (IOException e) {
            try {
                ApiRouterUsageRecord[] records = objectMapper.readValue(file, ApiRouterUsageRecord[].class);
                return new ApiRouterUsageFile(email, records == null ? new ArrayList<>() : new ArrayList<>(List.of(records)));
            } catch (IOException ignored) {
            }
            log.warn("Failed to read legacy API router usage for {}", maskEmail(email), e);
            return null;
        }
    }

    private void migrateLegacyFilesAtStartup() {
        migrateLegacyKeyDirectory();
        migrateLegacyUsageDirectory();
    }

    private void migrateLegacyKeyDirectory() {
        File dir = storageDir(KEY_DIR);
        File[] files = dir.listFiles((file, name) -> name.endsWith(".json"));
        if (files == null) {
            return;
        }
        for (File file : files) {
            try {
                StoredApiKeyFile keyFile = objectMapper.readValue(file, StoredApiKeyFile.class);
                if (keyFile.getEmail() == null || keyFile.getEmail().isBlank()) {
                    keyFile.setEmail(file.getName().replaceFirst("\\.json$", ""));
                }
                String owner = normalizeEmail(keyFile.getEmail());
                Integer count = jdbcTemplate.queryForObject(
                        "select count(*) from api_router_keys where email = ?",
                        Integer.class,
                        owner
                );
                if (count != null && count > 0) {
                    continue;
                }
                saveKeyFile(owner, keyFile);
            } catch (Exception e) {
                log.warn("Failed to migrate legacy API key file {}", file.getName(), e);
            }
        }
    }

    private void migrateLegacyUsageDirectory() {
        File dir = storageDir(USAGE_DIR);
        File[] files = dir.listFiles((file, name) -> name.endsWith(".json"));
        if (files == null) {
            return;
        }
        for (File file : files) {
            String email = normalizeEmail(file.getName().replaceFirst("\\.json$", ""));
            try {
                ApiRouterUsageFile usageFile = readLegacyUsageFile(email);
                if (usageFile == null || usageFile.getRecords() == null || usageFile.getRecords().isEmpty()) {
                    continue;
                }
                Integer count = jdbcTemplate.queryForObject(
                        "select count(*) from api_router_usage_logs where email = ?",
                        Integer.class,
                        email
                );
                if (count != null && count > 0) {
                    continue;
                }
                saveUsageFile(email, usageFile);
            } catch (Exception e) {
                log.warn("Failed to migrate legacy API router usage file {}", file.getName(), e);
            }
        }
    }

    private void enforceApiKeyUsagePolicy(String email, StoredApiKey key) {
        List<ApiRouterUsageRecord> keyRecords = loadUsageFile(email).getRecords().stream()
                .filter(record -> key.getId().equals(record.getKeyId()))
                .toList();
        enforceQuota(key, keyRecords);
        enforceRateLimit(key, keyRecords);
    }

    private void enforceQuota(StoredApiKey key, List<ApiRouterUsageRecord> keyRecords) {
        QuotaPolicy quota = parseQuota(key.getQuota());
        if (quota.kind == QuotaKind.UNLIMITED) {
            return;
        }
        if (quota.kind == QuotaKind.CURRENCY && sumCost(keyRecords) >= quota.amount) {
            throw ApiRouterAccessException.quotaExceeded("API key 费用配额已用尽");
        }
        if (quota.kind == QuotaKind.TOKENS && sumTotalTokens(keyRecords) >= Math.round(quota.amount)) {
            throw ApiRouterAccessException.quotaExceeded("API key Token 配额已用尽");
        }
    }

    private void enforceRateLimit(StoredApiKey key, List<ApiRouterUsageRecord> keyRecords) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime minuteStart = now.minusMinutes(1);
        List<ApiRouterUsageRecord> recentRecords = keyRecords.stream()
                .filter(record -> isInRange(record, minuteStart, now))
                .toList();

        int rpmLimit = key.getKeyRpm() > 0 ? key.getKeyRpm() : effectiveKeyRpmLimit();
        if (recentRecords.size() >= rpmLimit) {
            throw ApiRouterAccessException.rateLimited(
                    "API key 已达到每分钟请求限制: " + rpmLimit + " RPM"
            );
        }

        long tpmLimit = key.getKeyTpm() > 0 ? key.getKeyTpm() : effectiveKeyTpmLimit();
        long recentTokens = sumTotalTokens(recentRecords);
        if (recentTokens >= tpmLimit) {
            throw ApiRouterAccessException.rateLimited(
                    "API key 已达到每分钟 Token 限制: " + formatTokenQuota(tpmLimit) + " TPM"
            );
        }
    }

    private void applyUsageAggregation(String email, ApiRouterDashboard dashboard) {
        List<ApiRouterUsageRecord> allRecords = new ArrayList<>(loadUsageFile(email).getRecords());
        allRecords.sort(Comparator.comparing(this::recordSortTime).reversed());

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime rangeStart = rangeStart(now, dashboard.getRange());
        List<ApiRouterUsageRecord> rangeRecords = allRecords.stream()
                .filter(record -> isInRange(record, rangeStart, now))
                .toList();

        long rangeInputTokens = sumInputTokens(rangeRecords);
        long rangeOutputTokens = sumOutputTokens(rangeRecords);
        long rangeTotalTokens = rangeInputTokens + rangeOutputTokens;
        long allTotalTokens = sumTotalTokens(allRecords);
        double rangeCost = sumCost(rangeRecords);
        long latencyCount = rangeRecords.stream().filter(record -> record.getLatencyMs() > 0).count();
        long latencyTotal = rangeRecords.stream().mapToLong(record -> Math.max(0, record.getLatencyMs())).sum();

        int enabledKeys = dashboard.getKeys() == null ? 0 : (int) dashboard.getKeys().stream()
                .filter(key -> "Enabled".equalsIgnoreCase(key.getStatus()))
                .count();
        double availableBalance = currentWalletBalance(email) + computeAvailableCurrencyBalance(dashboard.getKeys(), allRecords);
        long rangeMinutes = Math.max(1, Duration.between(rangeStart, now).toMinutes());
        double averageLatencySeconds = latencyCount == 0 ? 0.0 : latencyTotal / (double) latencyCount / 1000.0;

        dashboard.setMetrics(new ApiRouterDashboard.Metrics(
                round4(availableBalance),
                enabledKeys,
                rangeRecords.size(),
                round4(rangeCost),
                round4(rangeCost),
                round1(rangeTotalTokens / 1_000_000.0),
                round1(allTotalTokens / 1_000_000.0),
                (int) Math.round(rangeRecords.size() / (double) rangeMinutes),
                round1(rangeTotalTokens / (double) rangeMinutes / 1000.0),
                round2(averageLatencySeconds),
                round1(rangeInputTokens / 1_000_000.0),
                round4(rangeOutputTokens / 1_000_000.0)
        ));
        dashboard.setModels(buildModelStats(rangeRecords));
        dashboard.setUsage(buildUsageViews(rangeRecords));
        dashboard.setTrend(buildTrend(rangeRecords, rangeStart, now));
        applyKeyUsageAggregation(dashboard, allRecords);
    }

    private List<ApiRouterDashboard.ModelStat> buildModelStats(List<ApiRouterUsageRecord> records) {
        Map<String, UsageAggregate> byModel = new LinkedHashMap<>();
        for (ApiRouterUsageRecord record : records) {
            byModel.computeIfAbsent(normalizeModelName(record.getModel()), ignored -> new UsageAggregate())
                    .add(record, parseRecordTime(record));
        }

        List<ApiRouterDashboard.ModelStat> models = new ArrayList<>();
        for (Map.Entry<String, UsageAggregate> entry : byModel.entrySet()) {
            UsageAggregate aggregate = entry.getValue();
            models.add(new ApiRouterDashboard.ModelStat(
                    entry.getKey(),
                    aggregate.requests,
                    formatTokenCount(aggregate.totalTokens),
                    round4(aggregate.cost),
                    round4(aggregate.cost),
                    0
            ));
        }
        models.sort(Comparator.comparingInt(ApiRouterDashboard.ModelStat::getRequests).reversed());
        recomputeModelShares(models);
        return models;
    }

    private List<ApiRouterDashboard.UsageRecord> buildUsageViews(List<ApiRouterUsageRecord> records) {
        return records.stream()
                .limit(MAX_USAGE_RECORDS)
                .map(record -> new ApiRouterDashboard.UsageRecord(
                        normalizeModelName(record.getModel()),
                        displayRecordTime(record),
                        round4(record.getCost()),
                        formatTokenCount(record.getTotalTokens())
                ))
                .toList();
    }

    private List<Integer> buildTrend(List<ApiRouterUsageRecord> records, LocalDateTime rangeStart, LocalDateTime now) {
        long[] buckets = new long[TREND_BUCKETS];
        long rangeMillis = Math.max(1, Duration.between(rangeStart, now).toMillis());
        double bucketMillis = rangeMillis / (double) TREND_BUCKETS;
        for (ApiRouterUsageRecord record : records) {
            LocalDateTime recordTime = parseRecordTime(record);
            if (recordTime == null) continue;
            long offsetMillis = Math.max(0, Duration.between(rangeStart, recordTime).toMillis());
            int index = Math.min(TREND_BUCKETS - 1, (int) (offsetMillis / bucketMillis));
            buckets[index] += Math.max(0, record.getTotalTokens());
        }

        List<Integer> trend = new ArrayList<>();
        for (long bucket : buckets) {
            trend.add((int) Math.min(Integer.MAX_VALUE, bucket));
        }
        return trend;
    }

    private void applyKeyUsageAggregation(ApiRouterDashboard dashboard, List<ApiRouterUsageRecord> records) {
        if (dashboard.getKeys() == null || dashboard.getKeys().isEmpty()) {
            return;
        }

        Map<String, UsageAggregate> byKey = new LinkedHashMap<>();
        for (ApiRouterUsageRecord record : records) {
            if (record.getKeyId() == null || record.getKeyId().isBlank()) continue;
            byKey.computeIfAbsent(record.getKeyId(), ignored -> new UsageAggregate())
                    .add(record, parseRecordTime(record));
        }

        for (ApiRouterDashboard.ApiKeyInfo key : dashboard.getKeys()) {
            UsageAggregate aggregate = byKey.get(key.getId());
            QuotaPolicy quota = parseQuota(key.getQuota());
            if (aggregate == null) {
                key.setUsed(formatKeyUsage(quota, 0L, 0.0));
                continue;
            }
            key.setUsed(formatKeyUsage(quota, aggregate.totalTokens, aggregate.cost));
            if (aggregate.latestDisplay != null && !aggregate.latestDisplay.isBlank()) {
                key.setLastUsed(aggregate.latestDisplay);
            }
        }
    }

    private boolean isInRange(ApiRouterUsageRecord record, LocalDateTime rangeStart, LocalDateTime now) {
        LocalDateTime recordTime = parseRecordTime(record);
        return recordTime != null && !recordTime.isBefore(rangeStart) && !recordTime.isAfter(now.plusSeconds(1));
    }

    private LocalDateTime rangeStart(LocalDateTime now, String range) {
        return switch (normalizeRange(range, "7")) {
            case "1" -> now.minusHours(24);
            case "30" -> now.minusDays(30);
            default -> now.minusDays(7);
        };
    }

    private LocalDateTime recordSortTime(ApiRouterUsageRecord record) {
        LocalDateTime recordTime = parseRecordTime(record);
        return recordTime == null ? LocalDateTime.MIN : recordTime;
    }

    private LocalDateTime parseRecordTime(ApiRouterUsageRecord record) {
        if (record == null) return null;
        if (record.getCreatedAt() != null && !record.getCreatedAt().isBlank()) {
            try {
                return LocalDateTime.parse(record.getCreatedAt(), STORAGE_TIME);
            } catch (RuntimeException ignored) {
            }
        }
        if (record.getDisplayTime() != null && !record.getDisplayTime().isBlank()) {
            try {
                return LocalDateTime.parse(record.getDisplayTime(), DISPLAY_TIME);
            } catch (RuntimeException ignored) {
            }
        }
        return null;
    }

    private String displayRecordTime(ApiRouterUsageRecord record) {
        if (record.getDisplayTime() != null && !record.getDisplayTime().isBlank()) {
            return record.getDisplayTime();
        }
        LocalDateTime recordTime = parseRecordTime(record);
        return recordTime == null ? "-" : recordTime.format(DISPLAY_TIME);
    }

    private long sumInputTokens(List<ApiRouterUsageRecord> records) {
        return records.stream().mapToLong(record -> Math.max(0, record.getInputTokens())).sum();
    }

    private long sumOutputTokens(List<ApiRouterUsageRecord> records) {
        return records.stream().mapToLong(record -> Math.max(0, record.getOutputTokens())).sum();
    }

    private long sumTotalTokens(List<ApiRouterUsageRecord> records) {
        return records.stream().mapToLong(record -> Math.max(0, record.getTotalTokens())).sum();
    }

    private double sumCost(List<ApiRouterUsageRecord> records) {
        return records.stream().mapToDouble(record -> Math.max(0.0, record.getCost())).sum();
    }

    private String normalizeModelName(String model) {
        return model == null || model.isBlank() ? "unknown" : model;
    }

    private String formatTokenCount(long tokens) {
        long safeTokens = Math.max(0, tokens);
        if (safeTokens >= 1_000_000) {
            return String.format(Locale.ROOT, "%.1fM", safeTokens / 1_000_000.0);
        }
        if (safeTokens >= 1_000) {
            return String.format(Locale.ROOT, "%.1fK", safeTokens / 1_000.0);
        }
        return String.format(Locale.ROOT, "%,d tokens", safeTokens);
    }

    private String formatCurrency(double value) {
        return String.format(Locale.ROOT, "$%.4f", round4(Math.max(0.0, value)));
    }

    private double computeAvailableCurrencyBalance(List<ApiRouterDashboard.ApiKeyInfo> keys, List<ApiRouterUsageRecord> records) {
        if (keys == null || keys.isEmpty()) {
            return 0.0;
        }

        Map<String, Double> costByKey = new LinkedHashMap<>();
        for (ApiRouterUsageRecord record : records) {
            if (record.getKeyId() == null || record.getKeyId().isBlank()) continue;
            costByKey.merge(record.getKeyId(), Math.max(0.0, record.getCost()), Double::sum);
        }

        double balance = 0.0;
        for (ApiRouterDashboard.ApiKeyInfo key : keys) {
            if (!"Enabled".equalsIgnoreCase(key.getStatus())) continue;
            QuotaPolicy quota = parseQuota(key.getQuota());
            if (quota.kind == QuotaKind.CURRENCY) {
                balance += Math.max(0.0, quota.amount - costByKey.getOrDefault(key.getId(), 0.0));
            }
        }
        return balance;
    }

    private String formatKeyUsage(QuotaPolicy quota, long usedTokens, double usedCost) {
        if (quota.kind == QuotaKind.TOKENS) {
            return formatTokenQuota(usedTokens) + " / " + formatTokenQuota(Math.round(quota.amount));
        }
        return formatCurrency(usedCost);
    }

    private QuotaPolicy parseQuota(String quota) {
        if (quota == null || quota.isBlank()) {
            return QuotaPolicy.unlimited();
        }

        String normalized = quota.trim().toLowerCase(Locale.ROOT);
        if (normalized.contains("unlimited") || normalized.contains("无限")) {
            return QuotaPolicy.unlimited();
        }

        double amount = parseQuotaNumber(normalized);
        if (amount <= 0) {
            return QuotaPolicy.unlimited();
        }
        if (normalized.contains("$") || normalized.contains("usd") || normalized.contains("元")) {
            return new QuotaPolicy(QuotaKind.CURRENCY, amount);
        }
        return new QuotaPolicy(QuotaKind.TOKENS, amount);
    }

    private double parseQuotaNumber(String quota) {
        double multiplier = 1.0;
        if (quota.contains("million") || quota.contains("m")) {
            multiplier = 1_000_000.0;
        } else if (quota.contains("thousand") || quota.contains("k")) {
            multiplier = 1_000.0;
        }

        String numeric = quota.replaceAll("[^0-9.]", "");
        if (numeric.isBlank()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(numeric) * multiplier;
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private int effectiveKeyRpmLimit() {
        return Math.max(1, keyRpmLimit);
    }

    private long effectiveKeyTpmLimit() {
        return Math.max(1L, keyTpmLimit);
    }

    private long effectiveDefaultTokenQuota() {
        return Math.max(1L, defaultTokenQuota <= 0 ? DEFAULT_TOKEN_QUOTA_FALLBACK : defaultTokenQuota);
    }

    private String formatTokenQuota(long tokens) {
        return formatTokenCount(tokens);
    }

    private void attachKeyViews(String email, ApiRouterDashboard dashboard) {
        dashboard.setKeys(activeStoredKeys(loadKeyFile(email)).stream()
                .map(this::toKeyView)
                .toList());
    }

    private List<StoredApiKey> activeStoredKeys(StoredApiKeyFile keyFile) {
        if (keyFile == null || keyFile.getKeys() == null) {
            return new ArrayList<>();
        }
        return keyFile.getKeys().stream()
                .filter(key -> !key.isDeleted())
                .toList();
    }

    private ApiRouterDashboard.ApiKeyInfo toKeyView(StoredApiKey key) {
        return new ApiRouterDashboard.ApiKeyInfo(
                key.getId(),
                key.getName(),
                key.getMask(),
                key.getStatus(),
                key.getQuota(),
                key.getUsed(),
                key.getLastUsed(),
                key.getCreatedAt(),
                key.getUpdatedAt(),
                key.getKeyRpm(),
                key.getKeyTpm()
        );
    }

    private StoredApiKey findStoredKey(StoredApiKeyFile keyFile, String keyId) {
        if (keyFile == null || keyFile.getKeys() == null || keyId == null || keyId.isBlank()) {
            throw new IllegalArgumentException("密钥不存在");
        }
        return keyFile.getKeys().stream()
                .filter(key -> keyId.equals(key.getId()))
                .filter(key -> !key.isDeleted())
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("密钥不存在"));
    }

    private String normalizeKeyStatus(String status) {
        if ("Enabled".equalsIgnoreCase(status) || "启用".equals(status)) {
            return "Enabled";
        }
        if ("Paused".equalsIgnoreCase(status) || "暂停".equals(status)) {
            return "Paused";
        }
        throw new IllegalArgumentException("密钥状态不正确");
    }

    private String generatePlainKey() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return "sk-pzm-" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String maskPlainKey(String plainKey) {
        if (plainKey == null || plainKey.length() < 12) {
            return "sk-pzm-****";
        }
        return plainKey.substring(0, 7) + "****-" + plainKey.substring(plainKey.length() - 4);
    }

    private String hashPlainKey(String plainKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(plainKey.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private void recomputeModelShares(List<ApiRouterDashboard.ModelStat> models) {
        int totalRequests = models.stream().mapToInt(ApiRouterDashboard.ModelStat::getRequests).sum();
        if (totalRequests <= 0) return;
        models.forEach(model -> model.setShare((int) Math.round(model.getRequests() * 100.0 / totalRequests)));
    }

    private String trimError(String errorMessage, int statusCode) {
        String value = errorMessage == null || errorMessage.isBlank()
                ? "HTTP " + statusCode
                : errorMessage;
        return value.length() <= 80 ? value : value.substring(0, 80) + "...";
    }

    private String trimAuditDetail(String detail) {
        String value = detail == null ? "" : detail.trim();
        return value.length() <= 1024 ? value : value.substring(0, 1024);
    }

    private String trimControlReason(String reason) {
        String value = reason == null ? "" : reason.trim();
        return value.length() <= 512 ? value : value.substring(0, 512);
    }

    private String trimIssueKey(String issueKey) {
        String value = issueKey == null ? "" : issueKey.trim();
        return value.length() <= 256 ? value : value.substring(0, 256);
    }

    private String trimCallbackKey(String callbackKey) {
        String value = callbackKey == null ? "" : callbackKey.trim();
        return value.length() <= 256 ? value : value.substring(0, 256);
    }

    private String trimReconciliationMessage(String message) {
        String value = message == null ? "" : message.trim();
        return value.length() <= 1024 ? value : value.substring(0, 1024);
    }

    private String trimResolveNote(String note) {
        String value = note == null ? "" : note.trim();
        return value.length() <= 512 ? value : value.substring(0, 512);
    }

    private String normalizeSeverity(String severity) {
        String value = severity == null ? "" : severity.trim().toUpperCase(Locale.ROOT);
        if ("BLOCKER".equals(value) || "WARN".equals(value) || "INFO".equals(value)) {
            return value;
        }
        return "WARN";
    }

    private void requireActiveUser(String email) {
        UserControl control = userControl(email);
        if (control.frozen() || "FROZEN".equalsIgnoreCase(control.status())) {
            String suffix = control.reason().isBlank() ? "" : "：" + control.reason();
            throw ApiRouterAccessException.forbidden("账户已冻结" + suffix);
        }
    }

    private double estimatePreauthCost(String model, long inputTokens) {
        BillingRate rate = resolvePreauthBillingRate(model, Math.max(0, inputTokens));
        return calculateCost(rate, inputTokens, 0);
    }

    private double estimateCost(String model, long inputTokens, long outputTokens, String provider, String channelId) {
        BillingRate rate = resolveBillingRate(model, provider, channelId);
        return calculateCost(rate, inputTokens, outputTokens);
    }

    private double calculateCost(BillingRate rate, long inputTokens, long outputTokens) {
        BillingRate safeRate = rate == null ? defaultBillingRate() : rate;
        double cost = Math.max(0, inputTokens) / 1_000_000.0 * Math.max(0.0, safeRate.inputPricePerMillion())
                + Math.max(0, outputTokens) / 1_000_000.0 * Math.max(0.0, safeRate.outputPricePerMillion());
        return round4(cost);
    }

    private BillingRate resolveBillingRate(String model, String provider, String channelId) {
        String normalizedProvider = normalizePriceScope(provider);
        String normalizedChannelId = normalizePriceScope(channelId);
        return loadEnabledModelPriceRules().stream()
                .filter(rule -> modelPatternMatches(rule.modelPattern(), model))
                .filter(rule -> priceScopeMatches(rule.provider(), normalizedProvider))
                .filter(rule -> priceScopeMatches(rule.channelId(), normalizedChannelId))
                .sorted(Comparator
                        .comparingInt(ModelPriceRule::priority)
                        .thenComparing((ModelPriceRule rule) -> priceSpecificity(rule, model, normalizedProvider, normalizedChannelId), Comparator.reverseOrder()))
                .map(rule -> new BillingRate(rule.inputPricePerMillion(), rule.outputPricePerMillion()))
                .findFirst()
                .orElse(defaultBillingRate());
    }

    private BillingRate resolvePreauthBillingRate(String model, long inputTokens) {
        List<ModelPriceRule> matchingRules = loadEnabledModelPriceRules().stream()
                .filter(rule -> modelPatternMatches(rule.modelPattern(), model))
                .toList();
        if (matchingRules.isEmpty()) {
            return defaultBillingRate();
        }
        return matchingRules.stream()
                .map(rule -> new BillingRate(rule.inputPricePerMillion(), rule.outputPricePerMillion()))
                .max(Comparator.comparingDouble(rate -> calculateCost(rate, inputTokens, 0)))
                .orElse(defaultBillingRate());
    }

    private BillingRate defaultBillingRate() {
        return new BillingRate(Math.max(0.0, inputPricePerMillion), Math.max(0.0, outputPricePerMillion));
    }

    private List<ModelPriceRule> loadEnabledModelPriceRules() {
        return jdbcTemplate.query(
                "select * from api_router_model_prices where enabled = true order by priority asc, model_pattern asc",
                (rs, rowNum) -> new ModelPriceRule(
                        rs.getString("id"),
                        rs.getString("model_pattern"),
                        rs.getString("provider"),
                        rs.getString("channel_id"),
                        rs.getDouble("input_price_per_million"),
                        rs.getDouble("output_price_per_million"),
                        rs.getInt("priority")
                )
        );
    }

    private boolean modelPatternMatches(String pattern, String model) {
        String normalizedPattern = normalizeModelPattern(pattern);
        String normalizedModel = model == null || model.isBlank() ? "unknown" : model.trim().toLowerCase(Locale.ROOT);
        if (normalizedPattern.equals("*")) {
            return true;
        }
        if (normalizedPattern.endsWith("*")) {
            return normalizedModel.startsWith(normalizedPattern.substring(0, normalizedPattern.length() - 1));
        }
        return normalizedPattern.equals(normalizedModel);
    }

    private boolean priceScopeMatches(String ruleValue, String actualValue) {
        String normalizedRule = normalizePriceScope(ruleValue);
        String normalizedActual = normalizePriceScope(actualValue);
        return "*".equals(normalizedRule) || normalizedRule.equals(normalizedActual);
    }

    private int priceSpecificity(ModelPriceRule rule, String model, String provider, String channelId) {
        int score = 0;
        String pattern = normalizeModelPattern(rule.modelPattern());
        if (!"*".equals(pattern)) {
            score += pattern.endsWith("*") ? 20 : 40;
        }
        if (!"*".equals(normalizePriceScope(rule.provider()))) {
            score += 10;
        }
        if (!"*".equals(normalizePriceScope(rule.channelId()))) {
            score += 15;
        }
        return score;
    }

    private String normalizeModelPattern(String value) {
        return value == null || value.isBlank() ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePriceScope(String value) {
        return value == null || value.isBlank() ? "*" : value.trim().toLowerCase(Locale.ROOT);
    }

    private void applyViewOptions(ApiRouterDashboard dashboard, String range, String granularity, boolean touchUpdatedAt) {
        dashboard.setRange(normalizeRange(range, dashboard.getRange()));
        dashboard.setGranularity(normalizeGranularity(granularity, dashboard.getGranularity()));
        dashboard.setTrend(defaultTrend(dashboard.getRange()));
        if (touchUpdatedAt) {
            dashboard.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        }
    }

    private void updateDerivedFields(ApiRouterDashboard dashboard) {
        List<ApiRouterDashboard.ApiKeyInfo> keys = dashboard.getKeys();
        int enabledKeys = keys == null ? 0 : (int) keys.stream()
                .filter(key -> "Enabled".equalsIgnoreCase(key.getStatus()))
                .count();
        dashboard.getMetrics().setApiKeys(enabledKeys);
    }

    private ApiRouterDashboard defaultDashboard(String email) {
        ApiRouterDashboard dashboard = new ApiRouterDashboard();
        dashboard.setEmail(email);
        dashboard.setRange("7");
        dashboard.setGranularity("day");
        dashboard.setMetrics(defaultMetrics());
        dashboard.setModels(defaultModels());
        dashboard.setUsage(defaultUsage());
        dashboard.setKeys(defaultKeys());
        dashboard.setLedger(defaultLedger());
        dashboard.setTrend(defaultTrend("7"));
        dashboard.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        return dashboard;
    }

    private ApiRouterDashboard.Metrics defaultMetrics() {
        return new ApiRouterDashboard.Metrics(
                0.0,
                0,
                0,
                0.0,
                0.0,
                0.0,
                0.0,
                0,
                0.0,
                0.0,
                0.0,
                0.0
        );
    }

    private List<ApiRouterDashboard.ModelStat> defaultModels() {
        return new ArrayList<>();
    }

    private List<ApiRouterDashboard.UsageRecord> defaultUsage() {
        return new ArrayList<>();
    }

    private List<ApiRouterDashboard.ApiKeyInfo> defaultKeys() {
        return new ArrayList<>();
    }

    private List<ApiRouterDashboard.LedgerEntry> defaultLedger() {
        return new ArrayList<>();
    }

    private List<Integer> defaultTrend(String range) {
        return new ArrayList<>(List.of(0, 0, 0, 0, 0, 0, 0));
    }

    private String normalizeRange(String range, String fallback) {
        if ("1".equals(range) || "7".equals(range) || "30".equals(range)) {
            return range;
        }
        return fallback == null || fallback.isBlank() ? "7" : fallback;
    }

    private String normalizeGranularity(String granularity, String fallback) {
        if ("hour".equals(granularity) || "day".equals(granularity) || "model".equals(granularity)) {
            return granularity;
        }
        return fallback == null || fallback.isBlank() ? "day" : fallback;
    }

    private String safeFileName(String email) {
        return email == null ? "anonymous" : email.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._@-]", "_");
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        int atIndex = email.indexOf("@");
        if (atIndex <= 3) {
            return email;
        }
        return email.substring(0, 3) + "****" + email.substring(atIndex);
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private double round6(double value) {
        return Math.round(value * 1000000.0) / 1000000.0;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiKeyValidation {
        private String email;
        private String keyId;
        private String name;
        private String mask;
        private String quota;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoredApiKeyFile {
        private String email;
        private List<StoredApiKey> keys = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoredApiKey {
        private String id;
        private String name;
        private String mask;
        private String keyHash;
        private String status;
        private String quota;
        private String used;
        private String lastUsed;
        private String createdAt;
        private String updatedAt;
        private boolean deleted;
        /** Per-key RPM limit. 0 = use global default. */
        private int keyRpm;
        /** Per-key TPM limit. 0 = use global default. */
        private long keyTpm;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoredApiKeyRow {
        private String email;
        private StoredApiKey key;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpstreamChannel {
        private String id;
        private String name;
        private String provider;
        private String baseUrl;
        private String apiKey;
        private String models;
        private int priority;
        private int weight;
        private boolean retryEnabled;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletReservation {
        private String ledgerId;
        private double amount;

        public static WalletReservation none() {
            return new WalletReservation("", 0.0);
        }
    }

    private record ChannelSecret(String id, String apiKey) {
    }

    private record HealthProbeChannel(
            String id,
            String name,
            String baseUrl,
            String apiKey,
            boolean enabled,
            int failureCount) {
    }

    private record ModelPriceRule(
            String id,
            String modelPattern,
            String provider,
            String channelId,
            double inputPricePerMillion,
            double outputPricePerMillion,
            int priority) {
    }

    private record BillingRate(double inputPricePerMillion, double outputPricePerMillion) {
    }

    private record RedeemCodeRecord(
            String code,
            double amount,
            int maxUses,
            int usedCount,
            boolean enabled,
            String expiresAt) {
    }

    private record UserControl(
            String status,
            boolean frozen,
            String reason,
            String updatedAt) {
        private static UserControl active() {
            return new UserControl("ACTIVE", false, "", "");
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiRouterUsageFile {
        private String email;
        private List<ApiRouterUsageRecord> records = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiRouterUsageRecord {
        private String id;
        private String email;
        private String keyId;
        private String keyName;
        private String keyMask;
        private String model;
        private String provider;
        private String channelId;
        private String createdAt;
        private String displayTime;
        private int statusCode;
        private boolean success;
        private long latencyMs;
        private long inputTokens;
        private long outputTokens;
        private long totalTokens;
        private double cost;
        private String errorMessage;
    }

    private enum QuotaKind {
        UNLIMITED,
        CURRENCY,
        TOKENS
    }

    private static class QuotaPolicy {
        private final QuotaKind kind;
        private final double amount;

        private QuotaPolicy(QuotaKind kind, double amount) {
            this.kind = kind;
            this.amount = amount;
        }

        private static QuotaPolicy unlimited() {
            return new QuotaPolicy(QuotaKind.UNLIMITED, 0.0);
        }
    }

    public static class ApiRouterAccessException extends IllegalArgumentException {
        private final int statusCode;
        private final String type;

        private ApiRouterAccessException(int statusCode, String type, String message) {
            super(message);
            this.statusCode = statusCode;
            this.type = type;
        }

        public static ApiRouterAccessException unauthorized(String message) {
            return new ApiRouterAccessException(401, "authentication_error", message);
        }

        public static ApiRouterAccessException forbidden(String message) {
            return new ApiRouterAccessException(403, "invalid_request_error", message);
        }

        public static ApiRouterAccessException quotaExceeded(String message) {
            return new ApiRouterAccessException(429, "insufficient_quota", message);
        }

        public static ApiRouterAccessException rateLimited(String message) {
            return new ApiRouterAccessException(429, "rate_limit_exceeded", message);
        }

        public int getStatusCode() {
            return statusCode;
        }

        public String getType() {
            return type;
        }
    }

    private static class PaymentCallbackReplayException extends IllegalArgumentException {
        private PaymentCallbackReplayException(String message) {
            super(message);
        }
    }

    private static class UsageAggregate {
        private int requests;
        private long totalTokens;
        private double cost;
        private LocalDateTime latestAt;
        private String latestDisplay;

        private void add(ApiRouterUsageRecord record, LocalDateTime recordTime) {
            requests++;
            totalTokens += Math.max(0, record.getTotalTokens());
            cost += Math.max(0.0, record.getCost());
            if (recordTime != null && (latestAt == null || recordTime.isAfter(latestAt))) {
                latestAt = recordTime;
                latestDisplay = record.getDisplayTime();
            }
        }
    }
}
