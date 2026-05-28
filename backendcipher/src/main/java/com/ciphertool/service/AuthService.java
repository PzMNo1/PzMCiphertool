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
 * Auth Service (Email Version)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;

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
     * @param email email address
     * @return error message, null if success
     */
    public String sendCode(String email) {
        // Check send lock (60s interval)
        String lockKey = LOCK_KEY_PREFIX + email;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(lockKey))) {
            Long ttl = redisTemplate.getExpire(lockKey, TimeUnit.SECONDS);
            return String.format("发送过于频繁，请%d秒后重试", ttl != null ? ttl : sendIntervalSeconds);
        }

        // Check hourly limit
        String limitKey = LIMIT_KEY_PREFIX + email;
        String countStr = redisTemplate.opsForValue().get(limitKey);
        int count = countStr != null ? Integer.parseInt(countStr) : 0;
        if (count >= maxSendPerHour) {
            return "发送次数过多，请1小时后再试";
        }

        // Generate code
        String code = generateCode();

        // Send Email
        boolean success = emailService.sendCode(email, code);
        if (!success) {
            return "邮件发送失败，请稍后重试";
        }

        // Store code in Redis
        String codeKey = CODE_KEY_PREFIX + email;
        redisTemplate.opsForValue().set(codeKey, code, expireMinutes, TimeUnit.MINUTES);

        // Set send lock
        redisTemplate.opsForValue().set(lockKey, "1", sendIntervalSeconds, TimeUnit.SECONDS);

        // Increment send count
        if (count == 0) {
            redisTemplate.opsForValue().set(limitKey, "1", 1, TimeUnit.HOURS);
        } else {
            redisTemplate.opsForValue().increment(limitKey);
        }

        log.info("Code sent successfully: email={}", maskEmail(email));
        return null;
    }

    /**
     * Verify login
     *
     * @param email email address
     * @param code  verification code
     * @return LoginResponse or null if failed
     */
    public LoginResponse verifyLogin(String email, String code) {
        String codeKey = CODE_KEY_PREFIX + email;
        String storedCode = redisTemplate.opsForValue().get(codeKey);

        if (storedCode == null) {
            log.warn("Code not found or expired: email={}", maskEmail(email));
            return null;
        }

        if (!storedCode.equals(code)) {
            log.warn("Code mismatch: email={}", maskEmail(email));
            return null;
        }

        // Delete code after successful verification
        redisTemplate.delete(codeKey);

        log.info("Login successful: email={}", maskEmail(email));

        String normalizedEmail = normalizeEmail(email);
        String token = generateSessionToken();
        LocalDateTime loginTime = LocalDateTime.now();
        LocalDateTime expiresAt = loginTime.plusHours(Math.max(1, sessionExpireHours));
        redisTemplate.opsForValue().set(
                SESSION_KEY_PREFIX + hashToken(token),
                normalizedEmail,
                Math.max(1, sessionExpireHours),
                TimeUnit.HOURS
        );

        return new LoginResponse(
                normalizedEmail,
                maskEmail(normalizedEmail),
                token,
                loginTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                expiresAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }

    public String requireSessionEmail(String authorization) {
        String email = resolveSessionEmail(authorization);
        if (email == null || email.isBlank()) {
            throw AuthAccessException.unauthorized("请先登录");
        }
        return email;
    }

    public String resolveSessionEmail(String authorization) {
        String token = extractBearerToken(authorization);
        if (token == null || token.isBlank()) {
            return null;
        }
        String email = redisTemplate.opsForValue().get(SESSION_KEY_PREFIX + hashToken(token));
        return email == null || email.isBlank() ? null : normalizeEmail(email);
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

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
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

    public static class AuthAccessException extends RuntimeException {
        private AuthAccessException(String message) {
            super(message);
        }

        public static AuthAccessException unauthorized(String message) {
            return new AuthAccessException(message);
        }
    }
}
