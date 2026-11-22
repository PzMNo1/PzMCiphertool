package com.ciphertool.service;

import com.ciphertool.dto.AgentRechargeCredits;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

/**
 * 已购买 Agent 额度的持久化存储。
 *
 * <p>额度和流水放在数据库里，Redis 只负责“每天免费次数”的计数。扣减额度使用带
 * {@code credits >= n} 条件的单条 UPDATE，避免并发请求把额度扣成负数。</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentRechargeCreditStore {

    private static final DateTimeFormatter STORAGE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final JdbcTemplate jdbcTemplate;

    public AgentRechargeCredits creditsFor(String email) {
        String owner = normalizeEmail(email);
        if (owner.isBlank()) {
            return new AgentRechargeCredits(0, 0, 0, 0);
        }
        try {
            return jdbcTemplate.queryForObject(
                    "select agent_credits, agentmaster_credits, image_credits, video_credits from agent_recharge_credits where email = ?",
                    (rs, rowNum) -> new AgentRechargeCredits(
                            Math.max(0, rs.getInt("agent_credits")),
                            Math.max(0, rs.getInt("agentmaster_credits")),
                            Math.max(0, rs.getInt("image_credits")),
                            Math.max(0, rs.getInt("video_credits"))
                    ),
                    owner
            );
        } catch (EmptyResultDataAccessException e) {
            return new AgentRechargeCredits(0, 0, 0, 0);
        }
    }

    /**
     * 原子扣减指定类型的额度；额度不足或账号为空时返回 false。
     */
    public synchronized boolean consume(String email, String type, int count) {
        String owner = normalizeEmail(email);
        String column = columnFor(type);
        if (owner.isBlank() || column == null || count <= 0) {
            return false;
        }
        try {
            int updated = jdbcTemplate.update(
                    "update agent_recharge_credits set " + column + " = " + column + " - ?, updated_at = ? where email = ? and " + column + " >= ?",
                    count,
                    now(),
                    owner,
                    count
            );
            return updated > 0;
        } catch (RuntimeException e) {
            log.warn("Failed to consume Agent recharge credits type={} owner={}: {}", type, owner, e.getMessage());
            return false;
        }
    }

    /**
     * 入账一笔套餐额度。同一订单同一条流水只入账一次。
     *
     * @return true 表示本次真的加上了额度，false 表示已入账过
     */
    @Transactional
    public synchronized boolean credit(String email, String orderId, String entryType, int agent, int agentmaster, int image, int video, String note) {
        String owner = normalizeEmail(email);
        if (owner.isBlank() || (agent <= 0 && agentmaster <= 0 && image <= 0 && video <= 0)) {
            return false;
        }
        String normalizedOrderId = orderId == null ? "" : orderId.trim();
        String normalizedEntryType = entryType == null || entryType.isBlank() ? "RECHARGE" : entryType.trim().toUpperCase(Locale.ROOT);
        if (!normalizedOrderId.isBlank() && ledgerExists(normalizedOrderId, normalizedEntryType)) {
            return false;
        }
        jdbcTemplate.update(
                "insert into agent_recharge_ledger(id, email, order_id, entry_type, agent_delta, agentmaster_delta, image_delta, video_delta, note, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                owner,
                normalizedOrderId,
                normalizedEntryType,
                Math.max(0, agent),
                Math.max(0, agentmaster),
                Math.max(0, image),
                Math.max(0, video),
                truncate(note, 512),
                now()
        );
        upsertCredits(owner, Math.max(0, agent), Math.max(0, agentmaster), Math.max(0, image), Math.max(0, video));
        return true;
    }

    /**
     * 生成失败时退还本次实际扣掉的额度。
     */
    public synchronized void refund(String email, String type, int count) {
        String owner = normalizeEmail(email);
        String column = columnFor(type);
        if (owner.isBlank() || column == null || count <= 0) {
            return;
        }
        try {
            upsertCredits(owner,
                    "agent".equals(type) ? count : 0,
                    "agentmaster".equals(type) ? count : 0,
                    "image".equals(type) ? count : 0,
                    "video".equals(type) ? count : 0);
        } catch (RuntimeException e) {
            log.warn("Failed to refund Agent recharge credits type={} owner={}: {}", type, owner, e.getMessage());
        }
    }

    private void upsertCredits(String owner, int agent, int agentmaster, int image, int video) {
        String now = now();
        int updated = jdbcTemplate.update(
                "update agent_recharge_credits set agent_credits = agent_credits + ?, agentmaster_credits = agentmaster_credits + ?, image_credits = image_credits + ?, video_credits = video_credits + ?, updated_at = ? where email = ?",
                agent,
                agentmaster,
                image,
                video,
                now,
                owner
        );
        if (updated > 0) {
            return;
        }
        try {
            jdbcTemplate.update(
                    "insert into agent_recharge_credits(email, agent_credits, agentmaster_credits, image_credits, video_credits, updated_at) values (?, ?, ?, ?, ?, ?)",
                    owner,
                    agent,
                    agentmaster,
                    image,
                    video,
                    now
            );
        } catch (DuplicateKeyException e) {
            jdbcTemplate.update(
                    "update agent_recharge_credits set agent_credits = agent_credits + ?, agentmaster_credits = agentmaster_credits + ?, image_credits = image_credits + ?, video_credits = video_credits + ?, updated_at = ? where email = ?",
                    agent,
                    agentmaster,
                    image,
                    video,
                    now,
                    owner
            );
        }
    }

    private boolean ledgerExists(String orderId, String entryType) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from agent_recharge_ledger where order_id = ? and entry_type = ?",
                Integer.class,
                orderId,
                entryType
        );
        return count != null && count > 0;
    }

    private String columnFor(String type) {
        if (type == null) {
            return null;
        }
        return switch (type.trim().toLowerCase(Locale.ROOT)) {
            case "agent" -> "agent_credits";
            case "agentmaster" -> "agentmaster_credits";
            case "image" -> "image_credits";
            case "video" -> "video_credits";
            default -> null;
        };
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String now() {
        return LocalDateTime.now().format(STORAGE_TIME);
    }

    private String truncate(String value, int max) {
        String text = value == null ? "" : value.trim();
        return text.length() <= max ? text : text.substring(0, max);
    }
}
