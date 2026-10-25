package com.ciphertool.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatHistoryService {

    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public void saveHistory(String account, Object history) {
        String key = normalizeAccount(account);
        try {
            String json = objectMapper.writeValueAsString(history == null ? Collections.emptyMap() : history);
            String now = now();
            int updated = jdbcTemplate.update(
                    "UPDATE chat_history SET history_json = ?, updated_at = ? WHERE account = ?",
                    json, now, key);
            if (updated == 0) {
                try {
                    jdbcTemplate.update(
                            "INSERT INTO chat_history (account, history_json, updated_at) VALUES (?, ?, ?)",
                            key, json, now);
                } catch (DuplicateKeyException e) {
                    jdbcTemplate.update(
                            "UPDATE chat_history SET history_json = ?, updated_at = ? WHERE account = ?",
                            json, now, key);
                }
            }
            log.info("Chat history saved for {}", key);
        } catch (Exception e) {
            log.error("Failed to save chat history for {}", key, e);
            throw new RuntimeException("Save history failed");
        }
    }

    public Object getHistory(String account) {
        String key = normalizeAccount(account);
        try {
            String json = jdbcTemplate.query(
                    "SELECT history_json FROM chat_history WHERE account = ?",
                    rs -> rs.next() ? rs.getString(1) : null,
                    key);
            if (json == null || json.isBlank()) {
                return Collections.emptyMap();
            }
            return objectMapper.readValue(json, Object.class);
        } catch (Exception e) {
            log.error("Failed to read chat history for {}", key, e);
            return Collections.emptyMap();
        }
    }

    private String normalizeAccount(String account) {
        return account == null ? "" : account.trim().toLowerCase();
    }

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
