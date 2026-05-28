package com.ciphertool.service;

import com.ciphertool.dto.AgentRunEventAppendRequest;
import com.ciphertool.dto.AgentRunEventRecordResponse;
import com.ciphertool.dto.AgentRunRecordResponse;
import com.ciphertool.dto.AgentRunSaveRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentRunService {

    private static final DateTimeFormatter STORAGE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 200;

    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public synchronized AgentRunRecordResponse saveRun(String email, AgentRunSaveRequest request) {
        String owner = normalizeEmail(email);
        if (owner.isBlank()) {
            throw new IllegalArgumentException("用户邮箱不能为空");
        }
        if (request == null || request.getSnapshot() == null) {
            throw new IllegalArgumentException("AgentRun 快照不能为空");
        }

        JsonNode snapshotNode = objectMapper.valueToTree(request.getSnapshot());
        String runId = firstNonBlank(request.getRunId(), text(snapshotNode, "runId"));
        if (runId.isBlank()) {
            throw new IllegalArgumentException("Run ID 不能为空");
        }
        if (runId.length() > 96) {
            throw new IllegalArgumentException("Run ID 过长");
        }

        String now = LocalDateTime.now().format(STORAGE_TIME);
        AgentRunRecordResponse existing = findRunOrNull(owner, runId);
        String savedAt = firstNonBlank(request.getSavedAt(), existing == null ? "" : existing.getSavedAt(), now);
        String updatedAt = firstNonBlank(request.getUpdatedAt(), now);
        String chatId = trimToLimit(firstNonBlank(request.getChatId(), existing == null ? "" : existing.getChatId()), 96);
        String source = trimToLimit(firstNonBlank(request.getSource(), existing == null ? "" : existing.getSource(), "runtime"), 64);
        Integer messageIndex = request.getMessageIndex() != null ? request.getMessageIndex() : existing == null ? null : existing.getMessageIndex();
        String contractVersion = trimToLimit(firstNonBlank(text(snapshotNode, "contract_version"), "agent-contract-v1"), 64);
        String mode = trimToLimit(text(snapshotNode, "mode"), 32);
        String researchProfile = trimToLimit(text(snapshotNode, "researchProfile"), 32);
        String snapshotJson = toJson(request.getSnapshot());

        int updated = jdbcTemplate.update(
                "update agent_runs set chat_id = ?, message_index = ?, source = ?, saved_at = ?, updated_at = ?, contract_version = ?, mode = ?, research_profile = ?, snapshot_json = ? where email = ? and run_id = ?",
                chatId,
                messageIndex,
                source,
                savedAt,
                updatedAt,
                contractVersion,
                mode,
                researchProfile,
                snapshotJson,
                owner,
                runId
        );
        if (updated == 0) {
            jdbcTemplate.update(
                    "insert into agent_runs(email, run_id, chat_id, message_index, source, saved_at, updated_at, contract_version, mode, research_profile, snapshot_json) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    owner,
                    runId,
                    chatId,
                    messageIndex,
                    source,
                    savedAt,
                    updatedAt,
                    contractVersion,
                    mode,
                    researchProfile,
                    snapshotJson
            );
        }

        return getRun(owner, runId);
    }

    public AgentRunRecordResponse getRun(String email, String runId) {
        String owner = normalizeEmail(email);
        String id = normalizeId(runId, "Run ID 不能为空");
        AgentRunRecordResponse record = findRunOrNull(owner, id);
        if (record == null) {
            throw new IllegalArgumentException("AgentRun 不存在");
        }
        return record;
    }

    public List<AgentRunRecordResponse> listRuns(String email, String chatId, Integer limit) {
        String owner = normalizeEmail(email);
        int safeLimit = normalizeLimit(limit);
        String normalizedChatId = trimToLimit(chatId, 96);
        if (normalizedChatId.isBlank()) {
            return jdbcTemplate.query(
                    "select * from agent_runs where email = ? order by updated_at desc limit ?",
                    rowMapper(),
                    owner,
                    safeLimit
            );
        }
        return jdbcTemplate.query(
                "select * from agent_runs where email = ? and chat_id = ? order by message_index asc, updated_at asc limit ?",
                rowMapper(),
                owner,
                normalizedChatId,
                safeLimit
        );
    }

    public synchronized List<AgentRunEventRecordResponse> appendEvents(String email, String runId, AgentRunEventAppendRequest request) {
        String owner = normalizeEmail(email);
        String id = normalizeId(firstNonBlank(runId, request == null ? "" : request.getRunId()), "Run ID 不能为空");
        List<Object> inputEvents = normalizeEventInput(request);
        List<AgentRunEventRecordResponse> appended = new ArrayList<>();
        int nextSeq = nextEventSeq(owner, id);

        for (Object rawEvent : inputEvents) {
            JsonNode eventNode = objectMapper.valueToTree(rawEvent);
            if (eventNode == null || !eventNode.isObject()) {
                throw new IllegalArgumentException("AgentRun 事件必须是对象");
            }

            int seq = eventNode.path("seq").asInt(0);
            if (seq <= 0) {
                seq = nextSeq;
            }
            nextSeq = Math.max(nextSeq, seq + 1);

            String eventId = trimToLimit(firstNonBlank(text(eventNode, "id"), "evt-" + id + "-" + seq), 96);
            String type = trimToLimit(firstNonBlank(text(eventNode, "type"), "unknown"), 96);
            String stage = trimToLimit(text(eventNode, "stage"), 64);
            String visibility = trimToLimit(firstNonBlank(text(eventNode, "visibility"), "history"), 32);
            String ts = trimToLimit(firstNonBlank(text(eventNode, "ts"), LocalDateTime.now().format(STORAGE_TIME)), 40);
            String payloadJson = toJson(eventNode.get("payload") == null ? Map.of() : eventNode.get("payload"));
            String eventJson = toJson(eventNode);

            int updated = jdbcTemplate.update(
                    "update agent_run_events set event_id = ?, event_type = ?, stage = ?, visibility = ?, ts = ?, payload_json = ?, event_json = ? where email = ? and run_id = ? and seq = ?",
                    eventId,
                    type,
                    stage,
                    visibility,
                    ts,
                    payloadJson,
                    eventJson,
                    owner,
                    id,
                    seq
            );
            if (updated == 0) {
                jdbcTemplate.update(
                        "insert into agent_run_events(email, run_id, seq, event_id, event_type, stage, visibility, ts, payload_json, event_json) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        owner,
                        id,
                        seq,
                        eventId,
                        type,
                        stage,
                        visibility,
                        ts,
                        payloadJson,
                        eventJson
                );
            }
            touchRunFromEvent(owner, id, eventNode);
            appended.add(findEvent(owner, id, seq));
        }

        return appended;
    }

    public List<AgentRunEventRecordResponse> listEvents(String email, String runId, Integer limit) {
        String owner = normalizeEmail(email);
        String id = normalizeId(runId, "Run ID 不能为空");
        int safeLimit = Math.max(1, Math.min(1000, limit == null ? 500 : limit));
        return jdbcTemplate.query(
                "select * from agent_run_events where email = ? and run_id = ? order by seq asc limit ?",
                eventRowMapper(),
                owner,
                id,
                safeLimit
        );
    }

    public synchronized int deleteRun(String email, String runId) {
        String owner = normalizeEmail(email);
        String id = normalizeId(runId, "Run ID 不能为空");
        jdbcTemplate.update(
                "delete from agent_run_events where email = ? and run_id = ?",
                owner,
                id
        );
        return jdbcTemplate.update(
                "delete from agent_runs where email = ? and run_id = ?",
                owner,
                id
        );
    }

    public synchronized int deleteByChat(String email, List<String> chatIds) {
        String owner = normalizeEmail(email);
        Set<String> ids = normalizeIds(chatIds);
        int removed = 0;
        for (String chatId : ids) {
            jdbcTemplate.update(
                    "delete from agent_run_events where email = ? and run_id in (select run_id from agent_runs where email = ? and chat_id = ?)",
                    owner,
                    owner,
                    chatId
            );
            removed += jdbcTemplate.update(
                    "delete from agent_runs where email = ? and chat_id = ?",
                    owner,
                    chatId
            );
        }
        return removed;
    }

    private AgentRunRecordResponse findRunOrNull(String email, String runId) {
        try {
            return jdbcTemplate.queryForObject(
                    "select * from agent_runs where email = ? and run_id = ?",
                    rowMapper(),
                    email,
                    runId
            );
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    private AgentRunEventRecordResponse findEvent(String email, String runId, int seq) {
        return jdbcTemplate.queryForObject(
                "select * from agent_run_events where email = ? and run_id = ? and seq = ?",
                eventRowMapper(),
                email,
                runId,
                seq
        );
    }

    private RowMapper<AgentRunRecordResponse> rowMapper() {
        return (rs, rowNum) -> new AgentRunRecordResponse(
                rs.getString("run_id"),
                rs.getString("chat_id"),
                nullableInt(rs, "message_index"),
                rs.getString("source"),
                rs.getString("saved_at"),
                rs.getString("updated_at"),
                rs.getString("contract_version"),
                rs.getString("mode"),
                rs.getString("research_profile"),
                fromJson(rs.getString("snapshot_json"))
        );
    }

    private RowMapper<AgentRunEventRecordResponse> eventRowMapper() {
        return (rs, rowNum) -> new AgentRunEventRecordResponse(
                rs.getString("run_id"),
                rs.getInt("seq"),
                rs.getString("event_id"),
                rs.getString("event_type"),
                rs.getString("stage"),
                rs.getString("visibility"),
                rs.getString("ts"),
                fromJson(rs.getString("payload_json")),
                fromJson(rs.getString("event_json"))
        );
    }

    private Integer nullableInt(ResultSet rs, String column) throws SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private List<Object> normalizeEventInput(AgentRunEventAppendRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("AgentRun 事件不能为空");
        }
        List<Object> events = new ArrayList<>();
        if (request.getEvent() != null) {
            events.add(request.getEvent());
        }
        if (request.getEvents() != null) {
            events.addAll(request.getEvents());
        }
        if (events.isEmpty()) {
            throw new IllegalArgumentException("AgentRun 事件不能为空");
        }
        if (events.size() > 50) {
            throw new IllegalArgumentException("单次事件批量过大");
        }
        return events;
    }

    private int nextEventSeq(String email, String runId) {
        Integer maxSeq = jdbcTemplate.queryForObject(
                "select coalesce(max(seq), 0) from agent_run_events where email = ? and run_id = ?",
                Integer.class,
                email,
                runId
        );
        return (maxSeq == null ? 0 : maxSeq) + 1;
    }

    private void touchRunFromEvent(String email, String runId, JsonNode eventNode) {
        String now = LocalDateTime.now().format(STORAGE_TIME);
        String contractVersion = trimToLimit(firstNonBlank(text(eventNode, "contract_version"), "agent-contract-v1"), 64);
        JsonNode payload = eventNode == null ? null : eventNode.get("payload");
        String chatId = trimToLimit(textAt(payload, "summary", "chatId"), 96);
        String mode = trimToLimit(text(payload, "mode"), 32);
        String researchProfile = trimToLimit(text(payload, "researchProfile"), 32);
        AgentRunRecordResponse existing = findRunOrNull(email, runId);

        if (existing == null) {
            jdbcTemplate.update(
                    "insert into agent_runs(email, run_id, chat_id, message_index, source, saved_at, updated_at, contract_version, mode, research_profile, snapshot_json) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    email,
                    runId,
                    chatId,
                    null,
                    "event-stream",
                    now,
                    now,
                    contractVersion,
                    mode,
                    researchProfile,
                    toJson(stubSnapshot(runId, contractVersion))
            );
            return;
        }

        jdbcTemplate.update(
                "update agent_runs set chat_id = ?, updated_at = ?, contract_version = ?, mode = ?, research_profile = ? where email = ? and run_id = ?",
                firstNonBlank(existing.getChatId(), chatId),
                now,
                firstNonBlank(existing.getContractVersion(), contractVersion),
                firstNonBlank(existing.getMode(), mode),
                firstNonBlank(existing.getResearchProfile(), researchProfile),
                email,
                runId
        );
    }

    private Map<String, Object> stubSnapshot(String runId, String contractVersion) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("contract_version", firstNonBlank(contractVersion, "agent-contract-v1"));
        snapshot.put("runId", runId);
        snapshot.put("events", List.of());
        snapshot.put("metrics", null);
        snapshot.put("warnings", List.of());
        return snapshot;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalArgumentException("AgentRun 快照无法序列化");
        }
    }

    private Object fromJson(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(value, Object.class);
        } catch (Exception e) {
            log.warn("Failed to parse stored AgentRun snapshot", e);
            return null;
        }
    }

    private String text(JsonNode node, String field) {
        if (node == null || field == null) return "";
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText("");
    }

    private String textAt(JsonNode node, String... fields) {
        JsonNode current = node;
        if (current == null || fields == null) return "";
        for (String field : fields) {
            if (current == null || field == null || !current.has(field)) {
                return "";
            }
            current = current.get(field);
        }
        return current == null || current.isNull() ? "" : current.asText("");
    }

    private String normalizeId(String value, String message) {
        String normalized = trimToLimit(value, 96);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    private Set<String> normalizeIds(List<String> values) {
        List<String> source = values == null ? new ArrayList<>() : values;
        Set<String> ids = new LinkedHashSet<>();
        for (String value : source) {
            String normalized = trimToLimit(value, 96);
            if (!normalized.isBlank()) {
                ids.add(normalized);
            }
        }
        if (ids.isEmpty()) {
            throw new IllegalArgumentException("会话ID不能为空");
        }
        return ids;
    }

    private int normalizeLimit(Integer limit) {
        int value = limit == null ? DEFAULT_LIMIT : limit;
        return Math.max(1, Math.min(MAX_LIMIT, value));
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private String trimToLimit(String value, int limit) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() <= limit) {
            return normalized;
        }
        return normalized.substring(0, limit);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
