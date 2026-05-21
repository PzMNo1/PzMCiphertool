package com.ciphertool.service;

import com.ciphertool.dto.LoginResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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

    @Value("${auth.code.length:6}")
    private int codeLength;

    @Value("${auth.code.expire-minutes:5}")
    private int expireMinutes;

    @Value("${auth.code.send-interval-seconds:60}")
    private int sendIntervalSeconds;

    @Value("${auth.code.max-send-per-hour:5}")
    private int maxSendPerHour;

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

        return new LoginResponse(
                maskEmail(email),
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }

    private String generateCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < codeLength; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
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
}
