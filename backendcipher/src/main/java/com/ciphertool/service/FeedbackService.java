package com.ciphertool.service;

import com.ciphertool.dto.FeedbackItem;
import com.ciphertool.dto.FeedbackOverview;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private static final DateTimeFormatter STORAGE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final int MAX_FEEDBACK_LENGTH = 2000;
    private static final int MAX_REPLY_LENGTH = 2000;

    private final JdbcTemplate jdbcTemplate;

    @Value("${feedback.author-account:}")
    private String authorAccount;

    private final RowMapper<FeedbackItem> feedbackMapper = (rs, rowNum) -> {
        String replyContent = blank(rs.getString("reply_content"));
        String repliedAt = blank(rs.getString("replied_at"));
        return new FeedbackItem(
                rs.getString("id"),
                maskAccount(rs.getString("email")),
                rs.getString("content"),
                rs.getString("created_at"),
                rs.getString("updated_at"),
                !replyContent.isBlank(),
                replyContent,
                replyContent.isBlank() ? "" : "作者",
                repliedAt
        );
    };

    public FeedbackOverview list(String currentUserAccount) {
        List<FeedbackItem> items = jdbcTemplate.query(
                "select id, email, content, reply_content, reply_email, created_at, updated_at, replied_at " +
                        "from feedback_items order by created_at desc",
                feedbackMapper
        );
        return new FeedbackOverview(items, isAuthor(currentUserAccount));
    }

    public FeedbackOverview create(String account, String content) {
        String normalizedAccount = normalizeAccount(account);
        if (normalizedAccount.isBlank()) {
            normalizedAccount = "anonymous";
        }
        String normalizedContent = normalizeText(content, MAX_FEEDBACK_LENGTH, "反馈内容不能为空", "反馈内容不能超过2000个字符");
        String now = now();
        jdbcTemplate.update(
                "insert into feedback_items (id, email, content, reply_content, reply_email, created_at, updated_at, replied_at) " +
                        "values (?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                normalizedAccount,
                normalizedContent,
                "",
                "",
                now,
                now,
                ""
        );
        return list(normalizedAccount);
    }

    public FeedbackOverview reply(String currentUserAccount, String feedbackId, String content) {
        String normalizedAccount = normalizeAccount(currentUserAccount);
        if (!isAuthor(normalizedAccount)) {
            throw AuthService.AuthAccessException.unauthorized("只有作者账号可以回复反馈");
        }
        String normalizedId = blank(feedbackId);
        if (normalizedId.isBlank()) {
            throw new IllegalArgumentException("反馈不存在");
        }
        String normalizedContent = normalizeText(content, MAX_REPLY_LENGTH, "回复内容不能为空", "回复内容不能超过2000个字符");
        String now = now();
        int updated = jdbcTemplate.update(
                "update feedback_items set reply_content = ?, reply_email = ?, replied_at = ?, updated_at = ? where id = ?",
                normalizedContent,
                normalizedAccount,
                now,
                now,
                normalizedId
        );
        if (updated == 0) {
            throw new IllegalArgumentException("反馈不存在");
        }
        return list(normalizedAccount);
    }

    public FeedbackOverview delete(String currentUserAccount, String feedbackId) {
        String normalizedAccount = normalizeAccount(currentUserAccount);
        if (!isAuthor(normalizedAccount)) {
            throw AuthService.AuthAccessException.unauthorized("只有作者账号可以删除反馈");
        }
        String normalizedId = blank(feedbackId);
        if (normalizedId.isBlank()) {
            throw new IllegalArgumentException("反馈不存在");
        }
        int deleted = jdbcTemplate.update("delete from feedback_items where id = ?", normalizedId);
        if (deleted == 0) {
            throw new IllegalArgumentException("反馈不存在");
        }
        return list(normalizedAccount);
    }

    private boolean isAuthor(String account) {
        String author = normalizeAccount(authorAccount);
        return !author.isBlank() && author.equals(normalizeAccount(account));
    }

    private String normalizeText(String value, int maxLength, String blankMessage, String tooLongMessage) {
        String normalized = blank(value);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException(blankMessage);
        }
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(tooLongMessage);
        }
        return normalized;
    }

    private String now() {
        return LocalDateTime.now().format(STORAGE_TIME);
    }

    private String normalizeAccount(String account) {
        return blank(account).toLowerCase(Locale.ROOT);
    }

    private String blank(String value) {
        return value == null ? "" : value.trim();
    }

    private String maskAccount(String account) {
        String value = blank(account);
        if (value.contains("@")) {
            int atIndex = value.indexOf("@");
            if (atIndex <= 0 || atIndex >= value.length() - 1) {
                return "匿名用户";
            }
            String name = value.substring(0, atIndex);
            String domain = value.substring(atIndex + 1);
            if (name.length() <= 2) {
                return "*".repeat(name.length()) + "@" + domain;
            }
            return name.substring(0, Math.min(3, name.length())) + "****@" + domain;
        }
        if (value.matches("\\d{11}")) {
            return value.substring(0, 3) + "****" + value.substring(7);
        }
        return value.isBlank() || "anonymous".equalsIgnoreCase(value) ? "匿名用户" : value;
    }
}
