package com.ciphertool.service;

import com.ciphertool.dto.LoginResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Random;
import java.util.concurrent.TimeUnit;

/**
 * Auth Service (Phone Version)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final StringRedisTemplate redisTemplate;
    private final SmsService smsService;

    private static final String CODE_KEY_PREFIX = "auth:code:";
    private static final String LOCK_KEY_PREFIX = "auth:lock:";
    private static final String LIMIT_KEY_PREFIX = "auth:limit:";
    private static final String SESSION_KEY_PREFIX = "auth:session:";
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${auth.code.length:6}")
    private int codeLength;

    @Value("${auth.code.expire-minutes:5}")
    private int expireMinutes;

    @Value("${auth.code.send-interval-seconds:60}")
    private int sendIntervalSeconds;

    @Value("${auth.code.max-send-per-hour:5}")
    private int maxSendPerHour;

    @Value("${auth.session.expire-hours:168}")
    private long sessionExpireHours;

    /**
     * Send verification code
     *
     * @param phone phone number
     * @return error message, null if success
     */
    public String sendCode(String phone) {
        String normalizedPhone = normalizePhone(phone);
        if (!isValidPhone(normalizedPhone)) {
            return "手机号格式不正确";
        }

        // Check send lock (60s interval)
        String lockKey = LOCK_KEY_PREFIX + normalizedPhone;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(lockKey))) {
            Long ttl = redisTemplate.getExpire(lockKey, TimeUnit.SECONDS);
            return String.format("发送过于频繁，请%d秒后重试", ttl != null ? ttl : sendIntervalSeconds);
        }

        // Check hourly limit
        String limitKey = LIMIT_KEY_PREFIX + normalizedPhone;
        String countStr = redisTemplate.opsForValue().get(limitKey);
        int count = countStr != null ? Integer.parseInt(countStr) : 0;
        if (count >= maxSendPerHour) {
            return "发送次数过多，请1小时后再试";
        }

        // Generate code
        String code = generateCode();

        // Send SMS
        boolean success = smsService.sendSmsCode(normalizedPhone, code);
        if (!success) {
            return "短信发送失败，请稍后重试";
        }

        // Store code in Redis
        String codeKey = CODE_KEY_PREFIX + normalizedPhone;
        redisTemplate.opsForValue().set(codeKey, code, expireMinutes, TimeUnit.MINUTES);

        // Set send lock
        redisTemplate.opsForValue().set(lockKey, "1", sendIntervalSeconds, TimeUnit.SECONDS);

        // Increment send count
        if (count == 0) {
            redisTemplate.opsForValue().set(limitKey, "1", 1, TimeUnit.HOURS);
        } else {
            redisTemplate.opsForValue().increment(limitKey);
        }

        log.info("Code sent successfully: phone={}", maskPhone(normalizedPhone));
        return null;
    }

    /**
     * Verify login
     *
     * @param phone phone number
     * @param code  verification code
     * @return LoginResponse or null if failed
     */
    public LoginResponse verifyLogin(String phone, String code) {
        String normalizedPhone = normalizePhone(phone);
        if (!isValidPhone(normalizedPhone)) {
            return null;
        }

        String codeKey = CODE_KEY_PREFIX + normalizedPhone;
        String storedCode = redisTemplate.opsForValue().get(codeKey);

        if (storedCode == null) {
            log.warn("Code not found or expired: phone={}", maskPhone(normalizedPhone));
            return null;
        }

        if (!storedCode.equals(code)) {
            log.warn("Code mismatch: phone={}", maskPhone(normalizedPhone));
            return null;
        }

        // Delete code after successful verification
        redisTemplate.delete(codeKey);

        log.info("Login successful: phone={}", maskPhone(normalizedPhone));

        String token = generateSessionToken();
        LocalDateTime loginTime = LocalDateTime.now();
        LocalDateTime expiresAt = loginTime.plusHours(Math.max(1, sessionExpireHours));
        redisTemplate.opsForValue().set(
                SESSION_KEY_PREFIX + hashToken(token),
                normalizedPhone,
                Math.max(1, sessionExpireHours),
                TimeUnit.HOURS
        );

        return new LoginResponse(
                normalizedPhone,
                maskPhone(normalizedPhone),
                token,
                loginTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                expiresAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }

    public String requireSessionAccount(String authorization) {
        String account = resolveSessionAccount(authorization);
        if (account == null || account.isBlank()) {
            throw AuthAccessException.unauthorized("请先登录");
        }
        return account;
    }

    public String resolveSessionAccount(String authorization) {
        String token = extractBearerToken(authorization);
        if (token == null || token.isBlank()) {
            return null;
        }
        String account = redisTemplate.opsForValue().get(SESSION_KEY_PREFIX + hashToken(token));
        return account == null || account.isBlank() ? null : normalizeAccount(account);
    }

    private String generateCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < codeLength; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }

    private String generateSessionToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return "ct_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String extractBearerToken(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }
        String prefix = "Bearer ";
        if (!authorization.regionMatches(true, 0, prefix, 0, prefix.length())) {
            return null;
        }
        return authorization.substring(prefix.length()).trim();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String normalizePhone(String phone) {
        String value = phone == null ? "" : phone.trim().replaceAll("[\\s-]", "");
        if (value.startsWith("+86")) {
            value = value.substring(3);
        } else if (value.startsWith("0086")) {
            value = value.substring(4);
        } else if (value.length() == 13 && value.startsWith("86")) {
            value = value.substring(2);
        }
        return value;
    }

    private boolean isValidPhone(String phone) {
        return phone != null && phone.matches("1[3-9]\\d{9}");
    }

    private String normalizeAccount(String account) {
        return account == null ? "" : account.trim().toLowerCase();
    }

    private String maskPhone(String phone) {
        String value = phone == null ? "" : phone.replaceAll("\\D", "");
        if (value.length() == 13 && value.startsWith("86")) {
            value = value.substring(2);
        }
        if (value.length() != 11) {
            return phone;
        }
        return value.substring(0, 3) + "****" + value.substring(7);
    }

    public static class AuthAccessException extends RuntimeException {
        private AuthAccessException(String message) {
            super(message);
        }

        public static AuthAccessException unauthorized(String message) {
            return new AuthAccessException(message);
        }
    }
}
