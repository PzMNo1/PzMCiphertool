package com.ciphertool.service;

import com.ciphertool.dto.AgentRechargeCredits;
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
 * Daily usage quota for the Agent, Agentmaster, image and video surfaces.
 *
 * <p>每天免费次数放在 Redis，按本地午夜重置；充值购买的次数放在数据库，
 * 当天免费次数用完后才会消费。开发者账号与作者手机号免限。</p>
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
    private final AgentRechargeCreditStore creditStore;

    @Value("${usage.agent.daily-limit:3}")
    private int agentDailyLimit;

    @Value("${usage.agentmaster.daily-limit:10}")
    private int agentmasterDailyLimit;

    @Value("${usage.image.daily-limit:3}")
    private int imageDailyLimit;

    @Value("${usage.video.daily-limit:1}")
    private int videoDailyLimit;

    @Value("${feedback.author-account:}")
    private String authorAccount;

    @Value("${auth.developer.identity:}")
    private String developerIdentity;

    public synchronized UsageStatus consume(String authorization, HttpServletRequest request, String surfaceName, String turnId) {
        Surface surface = Surface.from(surfaceName);
        if (surface == Surface.IMAGE || surface == Surface.VIDEO) {
            surface = Surface.AGENT;
        }
        int limit = limitOf(surface);
        String account = resolveAccount(authorization);
        if (limit <= 0 || isExempt(account)) {
            return status(surface, limit, 0, 0, true, true, null);
        }

        String subject = account != null ? "u:" + account : "ip:" + riskControlService.clientIp(request);
        String day = LocalDate.now().toString();
        String counterKey = COUNTER_PREFIX + surface.key + ":" + day + ":" + subject;
        Duration ttl = ttlUntilReset();
        String turnKey = "";
        int used;

        try {
            String turn = normalizeTurn(turnId);
            if (!turn.isBlank()) {
                turnKey = TURN_PREFIX + surface.key + ":" + day + ":" + subject + ":" + turn;
                Boolean first = redisTemplate.opsForValue().setIfAbsent(turnKey, "1", ttl);
                if (!Boolean.TRUE.equals(first)) {
                    used = readUsed(counterKey);
                    return status(surface, limit, used, creditsFor(account, surface), true, false, null);
                }
            }

            used = readUsed(counterKey);
            if (used >= limit) {
                if (consumeCredit(account, surface)) {
                    return status(surface, limit, limit, creditsFor(account, surface), true, false, null);
                }
                deleteTurnKey(turnKey);
                return status(surface, limit, limit, creditsFor(account, surface), false, false, exhaustedMessage(surface, limit));
            }

            Long count = redisTemplate.opsForValue().increment(counterKey);
            used = count == null ? used + 1 : count.intValue();
            if (used == 1) {
                redisTemplate.expire(counterKey, ttl);
            }
            if (used > limit) {
                // 并发下最后一个免费名额被别人抢走：回退这次免费计数，改扣已购额度。
                redisTemplate.opsForValue().decrement(counterKey);
                if (consumeCredit(account, surface)) {
                    return status(surface, limit, limit, creditsFor(account, surface), true, false, null);
                }
                deleteTurnKey(turnKey);
                return status(surface, limit, limit, creditsFor(account, surface), false, false, exhaustedMessage(surface, limit));
            }
        } catch (Exception e) {
            log.warn("Usage quota check skipped because Redis is unavailable: {}", e.getMessage());
            return status(surface, limit, 0, creditsFor(account, surface), true, true, null);
        }

        return status(surface, limit, used, creditsFor(account, surface), true, false, null);
    }

    /**
     * 图片 / 视频生成按次扣减：先扣当日免费次数，再扣已购额度。
     *
     * @throws UsageLimitException 当日免费次数与已购额度合计不足
     */
    public synchronized QuotaCharge consumeMedia(String authorization, HttpServletRequest request, Surface surface, int count) {
        if (surface != Surface.IMAGE && surface != Surface.VIDEO) {
            throw new IllegalArgumentException("不支持的额度类型");
        }
        int requested = Math.max(1, count);
        int limit = limitOf(surface);
        String account = resolveAccount(authorization);
        if (limit <= 0 || isExempt(account)) {
            return new QuotaCharge(account, null, surface, null, 0, 0);
        }

        String subject = account != null ? "u:" + account : "ip:" + riskControlService.clientIp(request);
        String day = LocalDate.now().toString();
        String counterKey = counterKey(surface, day, subject);
        int used;
        try {
            used = readUsed(counterKey);
        } catch (Exception e) {
            log.warn("Usage quota check skipped because Redis is unavailable: {}", e.getMessage());
            return new QuotaCharge(account, null, surface, null, 0, 0);
        }

        int freeRemaining = Math.max(0, limit - used);
        int credits = creditsFor(account, surface);
        if (freeRemaining + credits < requested) {
            throw new UsageLimitException(exhaustedMediaMessage(surface, limit, freeRemaining, credits));
        }
        int freeUsed = Math.min(requested, freeRemaining);
        int creditUsed = requested - freeUsed;

        try {
            if (freeUsed > 0) {
                Long newUsed = redisTemplate.opsForValue().increment(counterKey, freeUsed);
                if (newUsed != null && newUsed == freeUsed) {
                    redisTemplate.expire(counterKey, ttlUntilReset());
                }
            }
            if (creditUsed > 0 && !creditStore.consume(account, surface.key, creditUsed)) {
                if (freeUsed > 0) {
                    redisTemplate.opsForValue().decrement(counterKey, freeUsed);
                }
                throw new UsageLimitException(exhaustedMediaMessage(surface, limit, freeRemaining, 0));
            }
        } catch (UsageLimitException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Usage quota check skipped because Redis is unavailable: {}", e.getMessage());
            return new QuotaCharge(account, null, surface, null, 0, 0);
        }
        return new QuotaCharge(account, subject, surface, day, freeUsed, creditUsed);
    }

    /**
     * 生成失败时退回本次实际扣掉的免费次数与已购额度。
     */
    public synchronized void refundMedia(QuotaCharge charge) {
        if (charge == null || charge.day() == null) {
            return;
        }
        try {
            if (charge.freeUsed() > 0 && charge.subject() != null) {
                String key = counterKey(charge.surface(), charge.day(), charge.subject());
                redisTemplate.opsForValue().decrement(key, charge.freeUsed());
            }
            if (charge.creditUsed() > 0 && charge.account() != null) {
                creditStore.refund(charge.account(), charge.surface().key, charge.creditUsed());
            }
        } catch (Exception e) {
            log.warn("Failed to refund usage quota: {}", e.getMessage());
        }
    }

    public UsageSummary summary(String authorization) {
        String account = authService.requireSessionAccount(authorization);
        return new UsageSummary(
                describe(account, Surface.AGENT),
                describe(account, Surface.AGENTMASTER),
                describe(account, Surface.IMAGE),
                describe(account, Surface.VIDEO)
        );
    }

    private UsageStatus describe(String account, Surface surface) {
        int limit = limitOf(surface);
        int credits = creditsFor(account, surface);
        if (limit <= 0 || isExempt(account)) {
            return status(surface, limit, 0, credits, true, true, null);
        }
        String counterKey = COUNTER_PREFIX + surface.key + ":" + LocalDate.now() + ":u:" + account;
        return status(surface, limit, readUsed(counterKey), credits, true, false, null);
    }

    private UsageStatus status(Surface surface, int limit, int used, int credits, boolean allowed, boolean unlimited, String message) {
        UsageStatus status = new UsageStatus();
        status.setSurface(surface.key);
        status.setLimit(limit);
        status.setUsed(used);
        status.setRemaining(unlimited ? limit : Math.max(0, limit - used));
        status.setCredits(Math.max(0, credits));
        status.setAllowed(allowed);
        status.setUnlimited(unlimited);
        status.setMessage(message);
        return status;
    }

    private boolean consumeCredit(String account, Surface surface) {
        return account != null && creditStore.consume(account, surface.key, 1);
    }

    private int creditsFor(String account, Surface surface) {
        if (account == null || surface == Surface.AGENTMASTER) {
            return 0;
        }
        try {
            AgentRechargeCredits credits = creditStore.creditsFor(account);
            return switch (surface) {
                case AGENT -> credits.getAgent();
                case IMAGE -> credits.getImage();
                case VIDEO -> credits.getVideo();
                default -> 0;
            };
        } catch (RuntimeException e) {
            log.warn("Failed to read Agent recharge credits for {}: {}", account, e.getMessage());
            return 0;
        }
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
        return Math.max(0, switch (surface) {
            case AGENTMASTER -> agentmasterDailyLimit;
            case IMAGE -> imageDailyLimit;
            case VIDEO -> videoDailyLimit;
            default -> agentDailyLimit;
        });
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

    private String counterKey(Surface surface, String day, String subject) {
        return COUNTER_PREFIX + surface.key + ":" + day + ":" + subject;
    }

    private void deleteTurnKey(String turnKey) {
        if (turnKey == null || turnKey.isBlank()) {
            return;
        }
        try {
            redisTemplate.delete(turnKey);
        } catch (Exception e) {
            log.warn("Failed to clear usage turn key: {}", e.getMessage());
        }
    }

    private Duration ttlUntilReset() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime reset = LocalDate.now().plusDays(1).atStartOfDay();
        return Duration.between(now, reset).plusMinutes(1);
    }

    private String exhaustedMessage(Surface surface, int limit) {
        String name = switch (surface) {
            case AGENTMASTER -> "Agentmaster";
            case IMAGE -> "图片生成";
            case VIDEO -> "视频生成";
            default -> "Agent";
        };
        return "今日" + name + "使用次数已用完（每天 " + limit + " 次），可前往充值或明天再来";
    }

    private String exhaustedMediaMessage(Surface surface, int limit, int freeRemaining, int credits) {
        String name = surface == Surface.VIDEO ? "视频生成" : "图片生成";
        return "今日" + name + "次数不足：每日免费剩余 " + freeRemaining + " 次，已购剩余 " + credits + " 次，请前往充值";
    }

    /**
     * 一次媒体生成实际占用的免费次数与已购额度，失败时用于原路退回。
     */
    public record QuotaCharge(String account, String subject, Surface surface, String day, int freeUsed, int creditUsed) {
    }

    public static class UsageLimitException extends RuntimeException {
        public UsageLimitException(String message) {
            super(message);
        }
    }

    public enum Surface {
        AGENT("agent"),
        AGENTMASTER("agentmaster"),
        IMAGE("image"),
        VIDEO("video");

        private final String key;

        Surface(String key) {
            this.key = key;
        }

        public static Surface from(String value) {
            if (value == null) {
                return AGENT;
            }
            String normalized = value.trim().toLowerCase(Locale.ROOT);
            return switch (normalized) {
                case "agentmaster" -> AGENTMASTER;
                case "image" -> IMAGE;
                case "video" -> VIDEO;
                default -> AGENT;
            };
        }
    }
}
