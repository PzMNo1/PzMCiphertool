package com.ciphertool.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class RiskControlService {

    private static final String KEY_PREFIX = "api-router:risk";

    private final StringRedisTemplate redisTemplate;

    public void requireUserAction(String email, String action, int limit, Duration window, String message) {
        requireIdentifierAction("user", email, action, limit, window, message);
    }

    public void requireIpAction(String ip, String action, int limit, Duration window, String message) {
        requireIdentifierAction("ip", ip, action, limit, window, message);
    }

    public void requireTokenAction(String token, String action, int limit, Duration window, String message) {
        requireIdentifierAction("token", token, action, limit, window, message);
    }

    public String clientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String forwardedFor = firstHeaderValue(request.getHeader("X-Forwarded-For"));
        if (!forwardedFor.isBlank()) {
            return forwardedFor;
        }
        String realIp = firstHeaderValue(request.getHeader("X-Real-IP"));
        if (!realIp.isBlank()) {
            return realIp;
        }
        String remoteAddr = request.getRemoteAddr();
        return remoteAddr == null || remoteAddr.isBlank() ? "unknown" : remoteAddr.trim();
    }

    private void requireIdentifierAction(
            String scope,
            String identifier,
            String action,
            int limit,
            Duration window,
            String message) {
        if (limit <= 0 || identifier == null || identifier.isBlank()) {
            return;
        }
        Duration safeWindow = window == null || window.isZero() || window.isNegative()
                ? Duration.ofMinutes(1)
                : window;
        String key = KEY_PREFIX
                + ":" + normalizeToken(scope)
                + ":" + normalizeToken(action)
                + ":" + hashIdentifier(identifier);

        Long count;
        try {
            count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, safeWindow);
            }
        } catch (Exception e) {
            log.warn("Risk control skipped because Redis is unavailable: {}", e.getMessage());
            return;
        }

        if (count != null && count > limit) {
            throw ApiRouterService.ApiRouterAccessException.rateLimited(message);
        }
    }

    private String firstHeaderValue(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String first = value.split(",")[0].trim();
        return first.length() > 64 ? first.substring(0, 64) : first;
    }

    private String normalizeToken(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_-]", "-");
    }

    private String hashIdentifier(String identifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(identifier.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return Integer.toHexString(identifier.trim().toLowerCase(Locale.ROOT).hashCode());
        }
    }
}
