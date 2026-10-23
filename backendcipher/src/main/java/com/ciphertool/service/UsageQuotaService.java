package com.ciphertool.service;

import com.ciphertool.dto.UsageStatus;
import com.ciphertool.dto.UsageSummary;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Daily usage quota for the Agent and Agentmaster surfaces.
 * Counters live in Redis and reset at local midnight; the developer account
 * and the author phone number are exempt.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UsageQuotaService {

    private static final String COUNTER_PREFIX = "usage:daily:";
    private static final String TURN_PREFIX = "usage:turn:";

    private final StringRedisTemplate redisTemplate;
    private final AuthService authService;
    private final RiskControlService riskControlService;

    @Value("${usage.agent.daily-limit:3}")
    private int agentDailyLimit;

    @Value("${usage.agentmaster.daily-limit:10}")
    private int agentmasterDailyLimit;

    @Value("${feedback.author-account:}")
    private String authorAccount;

    @Value("${auth.developer.identity:}")
    private String developerIdentity;

    public UsageStatus consume(String authorization, HttpServletRequest request, String surfaceName, String turnId) {
        Surface surface = Surface.from(surfaceName);
        int limit = limitOf(surface);
        String account = resolveAccount(authorization);
        if (limit <= 0 || isExempt(account)) {
            return status(surface, limit, 0, true, true, null);
        }

        String subject = account != null ? "u:" + account : "ip:" + riskControlService.clientIp(request);
        String day = LocalDate.now().toString();
        String counterKey = COUNTER_PREFIX + surface.key + ":" + day + ":" + subject;
        Duration ttl = ttlUntilReset();
        boolean countRequest = true;
        int used;

        try {
            String turn = normalizeTurn(turnId);
            if (!turn.isBlank()) {
                String turnKey = TURN_PREFIX + surface.key + ":" + day + ":" + subject + ":" + turn;
                Boolean first = redisTemplate.opsForValue().setIfAbsent(turnKey, "1", ttl);
                countRequest = Boolean.TRUE.equals(first);
            }

            used = readUsed(counterKey);
            if (countRequest) {
                Long count = redisTemplate.opsForValue().increment(counterKey);
                if (count != null) {
                    used = count.intValue();
                    if (count == 1L) {
                        redisTemplate.expire(counterKey, ttl);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Usage quota check skipped because Redis is unavailable: {}", e.getMessage());
            return status(surface, limit, 0, true, true, null);
        }

        if (used > limit) {
            return status(surface, limit, used, false, false, exhaustedMessage(surface, limit));
        }
        return status(surface, limit, used, true, false, null);
    }

    public UsageSummary summary(String authorization) {
        String account = authService.requireSessionAccount(authorization);
        return new UsageSummary(describe(account, Surface.AGENT), describe(account, Surface.AGENTMASTER));
    }

    private UsageStatus describe(String account, Surface surface) {
        int limit = limitOf(surface);
        if (limit <= 0 || isExempt(account)) {
            return status(surface, limit, 0, true, true, null);
        }
        String counterKey = COUNTER_PREFIX + surface.key + ":" + LocalDate.now() + ":u:" + account;
        return status(surface, limit, readUsed(counterKey), true, false, null);
    }

    private UsageStatus status(Surface surface, int limit, int used, boolean allowed, boolean unlimited, String message) {
        UsageStatus status = new UsageStatus();
        status.setSurface(surface.key);
        status.setLimit(limit);
        status.setUsed(used);
        status.setRemaining(unlimited ? limit : Math.max(0, limit - used));
        status.setAllowed(allowed);
        status.setUnlimited(unlimited);
        status.setMessage(message);
        return status;
    }

    private int readUsed(String key) {
        String value = redisTemplate.opsForValue().get(key);
        if (value == null || value.isBlank()) {
            return 0;
        }
        try {
            return Math.max(0, Integer.parseInt(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private int limitOf(Surface surface) {
        return Math.max(0, surface == Surface.AGENTMASTER ? agentmasterDailyLimit : agentDailyLimit);
    }

    private boolean isExempt(String account) {
        return matches(account, authorAccount) || matches(account, developerIdentity);
    }

    private boolean matches(String account, String configured) {
        String target = normalize(configured);
        return !target.isBlank() && target.equals(normalize(account));
    }

    private String resolveAccount(String authorization) {
        try {
            return authService.resolveSessionAccount(authorization);
        } catch (Exception e) {
            return null;
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeTurn(String turnId) {
        String value = turnId == null ? "" : turnId.trim().replaceAll("[^A-Za-z0-9_-]", "");
        return value.length() > 64 ? value.substring(0, 64) : value;
    }

    private Duration ttlUntilReset() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime reset = LocalDate.now().plusDays(1).atStartOfDay();
        return Duration.between(now, reset).plusMinutes(1);
    }

    private String exhaustedMessage(Surface surface, int limit) {
        String name = surface == Surface.AGENTMASTER ? "Agentmaster" : "Agent";
        return "今日 " + name + " 使用次数已用完（每天 " + limit + " 次），请明天再来";
    }

    public enum Surface {
        AGENT("agent"),
        AGENTMASTER("agentmaster");

        private final String key;

        Surface(String key) {
            this.key = key;
        }

        public static Surface from(String value) {
            return value != null && "agentmaster".equalsIgnoreCase(value.trim()) ? AGENTMASTER : AGENT;
        }
    }
}
