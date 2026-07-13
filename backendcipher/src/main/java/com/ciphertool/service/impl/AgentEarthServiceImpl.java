package com.ciphertool.service.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.ciphertool.service.AgentEarthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AgentEarthServiceImpl implements AgentEarthService {

    private static final Logger log = LoggerFactory.getLogger(AgentEarthServiceImpl.class);
    private static final String USER_AGENT = "PzMCipherTool-AgentEarth/1.0";

    private final HttpClient httpClient;

    @Value("${agent-earth.enabled:false}")
    private boolean enabled;

    @Value("${agent-earth.api-key:}")
    private String apiKey;

    @Value("${agent-earth.base-url:https://agentearth.ai/agent-api/v1}")
    private String baseUrl;

    @Value("${agent-earth.recommend-path:/tool/recommend}")
    private String recommendPath;

    @Value("${agent-earth.timeout-seconds:60}")
    private int timeoutSeconds;

    @Value("${agent-earth.max-context-chars:8000}")
    private int maxContextChars;

    @Value("${agent-earth.max-response-chars:24000}")
    private int maxResponseChars;

    @Value("${agent-earth.recommend-limit:20}")
    private int recommendLimit;

    @Value("${agent-earth.allow-any-execute-url:false}")
    private boolean allowAnyExecuteUrl;

    public AgentEarthServiceImpl() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    @Override
    public String run(String query, String taskContext, String preferredToolName, Map<String, Object> arguments, Integer maxAttempts) {
        if (!enabled) {
            throw new IllegalStateException("AgentEarth is disabled. Set AGENT_EARTH_ENABLED=true and configure AGENT_EARTH_API_KEY.");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("AGENT_EARTH_API_KEY is not configured.");
        }
        String cleanQuery = safeTrim(query);
        if (cleanQuery.isBlank()) {
            throw new IllegalArgumentException("query cannot be empty");
        }

        JSONObject recommend = recommend(cleanQuery, taskContext);
        JSONArray tools = extractTools(recommend);
        if (tools == null || tools.isEmpty()) {
            throw new IllegalStateException("AgentEarth recommend returned no tools.");
        }

        int attempts = resolveAttemptCount(maxAttempts, tools.size());
        JSONObject selected = selectTool(tools, preferredToolName);
        int selectedIndex = tools.indexOf(selected);
        if (selectedIndex < 0) selectedIndex = 0;

        JSONArray executionAttempts = new JSONArray();
        JSONObject finalExecute = null;
        JSONObject finalTool = null;
        JSONObject finalParams = null;
        RuntimeException lastError = null;

        for (int offset = 0; offset < attempts; offset++) {
            JSONObject tool = tools.getJSONObject((selectedIndex + offset) % tools.size());
            try {
                String toolUrl = safeTrim(tool.getString("tool_url"));
                if (toolUrl.isBlank()) {
                    throw new IllegalStateException("selected AgentEarth tool has no tool_url");
                }
                validateExecuteUrl(toolUrl);
                JSONObject params = buildParams(tool, cleanQuery, arguments);
                JSONObject execute = execute(toolUrl, params);
                JSONObject attempt = new JSONObject();
                attempt.put("tool_name", toolName(tool));
                attempt.put("tool_url", redactUrl(toolUrl));
                attempt.put("params", params);
                attempt.put("response", execute);
                attempt.put("success", isSuccess(execute));
                executionAttempts.add(attempt);

                finalTool = tool;
                finalParams = params;
                finalExecute = execute;
                if (isSuccess(execute)) {
                    break;
                }
                lastError = new IllegalStateException("AgentEarth execute failed: " + errorMessage(execute));
            } catch (RuntimeException e) {
                lastError = e;
                JSONObject attempt = new JSONObject();
                attempt.put("tool_name", toolName(tool));
                attempt.put("tool_url", redactUrl(tool.getString("tool_url")));
                attempt.put("success", false);
                attempt.put("error", e.getMessage());
                executionAttempts.add(attempt);
            }
        }

        if (finalExecute == null || !isSuccess(finalExecute)) {
            throw lastError == null ? new IllegalStateException("AgentEarth execute failed.") : lastError;
        }

        JSONObject result = new JSONObject();
        result.put("provider", "AgentEarth");
        result.put("query", cleanQuery);
        result.put("recommend", summarizeRecommend(recommend, tools, finalTool));
        result.put("execute", finalExecute);
        result.put("params", finalParams);
        result.put("attempts", executionAttempts);
        return serializeResult(result);
    }

    private String serializeResult(JSONObject result) {
        String serialized = result.toJSONString();
        if (serialized.length() <= maxResponseChars) return serialized;

        JSONObject compact = new JSONObject();
        compact.put("provider", result.getString("provider"));
        compact.put("query", result.getString("query"));
        compact.put("recommend", result.get("recommend"));
        compact.put("params", result.get("params"));
        compact.put("execute_truncated", true);
        compact.put("execute", compactExecute(result.getJSONObject("execute")));
        compact.put("attempts_preview", trimTo(JSON.toJSONString(result.get("attempts")), Math.max(1200, maxResponseChars / 5)));
        return compact.toJSONString();
    }

    private JSONObject compactExecute(JSONObject execute) {
        JSONObject compact = new JSONObject();
        if (execute == null) return compact;
        compact.put("error_no", execute.get("error_no"));
        compact.put("error_msg", execute.getString("error_msg"));
        compact.put("result_preview", trimTo(JSON.toJSONString(execute.get("result")), Math.max(4000, maxResponseChars / 2)));
        return compact;
    }

    private JSONObject recommend(String query, String taskContext) {
        JSONObject payload = new JSONObject();
        payload.put("query", buildRecommendQuery(query, taskContext));
        payload.put("limit", Math.max(1, Math.min(recommendLimit, 50)));
        JSONObject response = postJson(resolveUrl(recommendPath), payload, Duration.ofSeconds(Math.max(10, timeoutSeconds / 2)));
        if (!isSuccess(response)) {
            throw new IllegalStateException("AgentEarth recommend failed: " + errorMessage(response));
        }
        return response;
    }

    private int resolveAttemptCount(Integer maxAttempts, int toolCount) {
        int total = Math.max(1, toolCount);
        if (maxAttempts == null || maxAttempts <= 0) {
            return total;
        }
        return Math.max(1, Math.min(maxAttempts, total));
    }

    private JSONObject execute(String toolUrl, JSONObject params) {
        JSONObject payload = new JSONObject();
        payload.put("params", params);
        JSONObject response = postJson(toolUrl, payload, Duration.ofSeconds(Math.max(15, timeoutSeconds)));
        if (!isSuccess(response)) {
            log.warn("AgentEarth execute returned error_no != 0: {}", errorMessage(response));
        }
        return response;
    }

    private JSONObject postJson(String url, JSONObject payload, Duration timeout) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("User-Agent", USER_AGENT)
                    .header("X-Api-Key", apiKey.trim())
                    .timeout(timeout)
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toJSONString(), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            String body = response.body() == null ? "" : response.body();
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("HTTP " + response.statusCode() + " from AgentEarth");
            }
            JSONObject parsed = JSON.parseObject(body);
            if (parsed == null) {
                throw new IllegalStateException("empty JSON response from AgentEarth");
            }
            return parsed;
        } catch (Exception e) {
            throw new IllegalStateException("AgentEarth request failed: " + e.getMessage(), e);
        }
    }

    private String buildRecommendQuery(String query, String taskContext) {
        String context = trimTo(safeTrim(taskContext), Math.max(0, maxContextChars));
        if (context.isBlank()) return query;
        return query + "\n\nContext available to the host:\n" + context;
    }

    private JSONArray extractTools(JSONObject recommend) {
        JSONArray tools = recommend.getJSONArray("tools");
        if (tools != null) return tools;
        JSONObject data = recommend.getJSONObject("data");
        if (data != null) {
            JSONArray nested = data.getJSONArray("tools");
            if (nested != null) return nested;
        }
        return null;
    }

    private JSONObject selectTool(JSONArray tools, String preferredToolName) {
        String preferred = safeTrim(preferredToolName).toLowerCase(Locale.ROOT);
        if (!preferred.isBlank()) {
            for (int i = 0; i < tools.size(); i++) {
                JSONObject tool = tools.getJSONObject(i);
                if (toolName(tool).toLowerCase(Locale.ROOT).contains(preferred)) {
                    return tool;
                }
            }
        }
        return tools.getJSONObject(0);
    }

    private JSONObject summarizeRecommend(JSONObject recommend, JSONArray tools, JSONObject selectedTool) {
        JSONObject summary = new JSONObject();
        summary.put("error_no", recommend.get("error_no"));
        summary.put("error_msg", recommend.getString("error_msg"));
        summary.put("total", recommend.getOrDefault("total", tools.size()));
        summary.put("selected_tool", summarizeTool(selectedTool));
        JSONArray candidates = new JSONArray();
        for (int i = 0; i < Math.min(5, tools.size()); i++) {
            candidates.add(summarizeTool(tools.getJSONObject(i)));
        }
        summary.put("candidates", candidates);
        return summary;
    }

    private JSONObject summarizeTool(JSONObject tool) {
        JSONObject item = new JSONObject();
        if (tool == null) return item;
        copyIfPresent(tool, item, "tool_name");
        copyIfPresent(tool, item, "name");
        copyIfPresent(tool, item, "service_id");
        copyIfPresent(tool, item, "description");
        copyIfPresent(tool, item, "input_schema");
        item.put("tool_url", redactUrl(tool.getString("tool_url")));
        return item;
    }

    private void copyIfPresent(JSONObject source, JSONObject target, String key) {
        if (source.containsKey(key)) target.put(key, source.get(key));
    }

    @SuppressWarnings("unchecked")
    private JSONObject buildParams(JSONObject tool, String query, Map<String, Object> userArguments) {
        JSONObject supplied = new JSONObject();
        if (userArguments != null) {
            supplied.putAll(userArguments);
        }
        if (supplied.get("params") instanceof Map<?, ?> nested) {
            supplied.clear();
            supplied.putAll((Map<String, Object>) nested);
        }

        JSONObject schema = tool.getJSONObject("input_schema");
        if (schema == null) schema = tool.getJSONObject("inputSchema");
        if (schema == null) schema = tool.getJSONObject("parameters");
        if (schema == null) {
            if (!supplied.isEmpty()) return supplied;
            JSONObject fallback = new JSONObject();
            fallback.put("query", query);
            return fallback;
        }

        JSONObject properties = schema.getJSONObject("properties");
        JSONArray required = schema.getJSONArray("required");
        boolean additionalAllowed = !schema.containsKey("additionalProperties")
                || Boolean.TRUE.equals(schema.getBoolean("additionalProperties"));
        JSONObject params = new JSONObject();

        if (properties != null) {
            for (String key : properties.keySet()) {
                if (supplied.containsKey(key)) {
                    params.put(key, coerceValue(supplied.get(key), properties.getJSONObject(key)));
                }
            }
        } else {
            params.putAll(supplied);
        }

        if (required != null && properties != null) {
            for (int i = 0; i < required.size(); i++) {
                String key = required.getString(i);
                if (params.containsKey(key)) continue;
                Object inferred = inferRequiredValue(key, properties.getJSONObject(key), query);
                if (inferred == null) {
                    throw new IllegalArgumentException("Missing required AgentEarth param: " + key);
                }
                params.put(key, inferred);
            }
        }

        if (additionalAllowed && properties != null) {
            for (String key : supplied.keySet()) {
                if (!params.containsKey(key)) {
                    params.put(key, supplied.get(key));
                }
            }
        }

        return params;
    }

    private Object inferRequiredValue(String key, JSONObject property, String query) {
        String lowerKey = key == null ? "" : key.toLowerCase(Locale.ROOT);
        String type = property == null ? "string" : safeTrim(property.getString("type")).toLowerCase(Locale.ROOT);
        JSONArray enumValues = property == null ? null : property.getJSONArray("enum");
        if (enumValues != null && !enumValues.isEmpty()) {
            String lowerQuery = query.toLowerCase(Locale.ROOT);
            for (int i = 0; i < enumValues.size(); i++) {
                String candidate = enumValues.getString(i);
                if (lowerQuery.contains(candidate.toLowerCase(Locale.ROOT))) return candidate;
            }
            return enumValues.get(0);
        }
        if ("integer".equals(type) || "number".equals(type)) {
            if (lowerKey.contains("rating")) return extractNumber(query, 4.5);
            if (lowerKey.contains("limit") || lowerKey.contains("count") || lowerKey.contains("num")) return 10;
            Double number = extractNumber(query, null);
            if (number == null) return null;
            return "integer".equals(type) ? number.intValue() : number;
        }
        if ("boolean".equals(type)) return false;
        if ("array".equals(type)) return new JSONArray();
        if (lowerKey.contains("city") || lowerKey.contains("location") || lowerKey.contains("place") || lowerKey.contains("destination")) {
            return extractLocation(query);
        }
        if (lowerKey.contains("category") || lowerKey.contains("type")) {
            return extractCategory(query);
        }
        if (lowerKey.contains("query") || lowerKey.contains("keyword") || lowerKey.contains("prompt")
                || lowerKey.contains("text") || lowerKey.contains("input") || lowerKey.contains("description")
                || lowerKey.contains("topic") || lowerKey.contains("company") || lowerKey.contains("symbol")) {
            return query;
        }
        return query;
    }

    private Object coerceValue(Object value, JSONObject property) {
        if (value == null || property == null) return value;
        String type = safeTrim(property.getString("type")).toLowerCase(Locale.ROOT);
        try {
            if ("integer".equals(type) && value instanceof Number number) return number.intValue();
            if ("integer".equals(type)) return Integer.parseInt(String.valueOf(value));
            if ("number".equals(type) && value instanceof Number number) return number.doubleValue();
            if ("number".equals(type)) return Double.parseDouble(String.valueOf(value));
            if ("boolean".equals(type) && value instanceof Boolean bool) return bool;
            if ("boolean".equals(type)) return Boolean.parseBoolean(String.valueOf(value));
        } catch (Exception ignored) {
            return value;
        }
        return value;
    }

    private Double extractNumber(String query, Double fallback) {
        Matcher matcher = Pattern.compile("(\\d+(?:\\.\\d+)?)").matcher(query);
        Double last = null;
        while (matcher.find()) {
            last = Double.parseDouble(matcher.group(1));
        }
        return last == null ? fallback : last;
    }

    private String extractLocation(String query) {
        Map<String, String> known = new LinkedHashMap<>();
        known.put("北京", "Beijing");
        known.put("beijing", "Beijing");
        known.put("上海", "Shanghai");
        known.put("shanghai", "Shanghai");
        known.put("深圳", "Shenzhen");
        known.put("shenzhen", "Shenzhen");
        known.put("广州", "Guangzhou");
        known.put("guangzhou", "Guangzhou");
        known.put("杭州", "Hangzhou");
        known.put("hangzhou", "Hangzhou");
        String lower = query.toLowerCase(Locale.ROOT);
        for (Map.Entry<String, String> entry : known.entrySet()) {
            if (lower.contains(entry.getKey().toLowerCase(Locale.ROOT))) return entry.getValue();
        }
        Matcher english = Pattern.compile("\\bin\\s+([A-Z][A-Za-z\\s]{1,40})(?:\\s+with|\\s+above|\\s+rating|\\.|$)").matcher(query);
        if (english.find()) return english.group(1).trim();
        return query;
    }

    private String extractCategory(String query) {
        String lower = query.toLowerCase(Locale.ROOT);
        if (lower.contains("咖啡") || lower.contains("coffee")) return "coffee shop";
        if (lower.contains("餐厅") || lower.contains("restaurant")) return "restaurant";
        if (lower.contains("酒店") || lower.contains("hotel")) return "hotel";
        if (lower.contains("景点") || lower.contains("attraction")) return "attraction";
        if (lower.contains("海报") || lower.contains("poster")) return "poster";
        if (lower.contains("图片") || lower.contains("image") || lower.contains("picture")) return "image";
        return query;
    }

    private boolean isSuccess(JSONObject response) {
        Integer errorNo = response == null ? null : response.getInteger("error_no");
        return errorNo != null && errorNo == 0;
    }

    private String errorMessage(JSONObject response) {
        if (response == null) return "empty response";
        String msg = response.getString("error_msg");
        return msg == null || msg.isBlank() ? response.toJSONString() : msg;
    }

    private String toolName(JSONObject tool) {
        if (tool == null) return "";
        for (String key : new String[]{"tool_name", "name", "id"}) {
            String value = tool.getString(key);
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }

    private String resolveUrl(String path) {
        String normalizedBase = baseUrl == null || baseUrl.isBlank()
                ? "https://agentearth.ai/agent-api/v1"
                : baseUrl.trim();
        while (normalizedBase.endsWith("/")) {
            normalizedBase = normalizedBase.substring(0, normalizedBase.length() - 1);
        }
        String normalizedPath = path == null || path.isBlank() ? "/tool/recommend" : path.trim();
        if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
            return normalizedPath;
        }
        if (!normalizedPath.startsWith("/")) normalizedPath = "/" + normalizedPath;
        return normalizedBase + normalizedPath;
    }

    private void validateExecuteUrl(String url) {
        URI uri = URI.create(url);
        String scheme = safeTrim(uri.getScheme()).toLowerCase(Locale.ROOT);
        if (!"https".equals(scheme)) {
            throw new IllegalArgumentException("AgentEarth tool_url must be https.");
        }
        if (allowAnyExecuteUrl) return;
        String host = safeTrim(uri.getHost()).toLowerCase(Locale.ROOT);
        if (host.equals("agentearth.ai") || host.endsWith(".agentearth.ai")) return;
        throw new IllegalArgumentException("AgentEarth tool_url host is not allowed: " + host);
    }

    private String redactUrl(String url) {
        if (url == null) return "";
        return url.replaceAll("(?i)([?&](?:api_?key|apikey|key|token)=)[^&]+", "$1[REDACTED]");
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String trimTo(String value, int max) {
        if (value == null) return "";
        if (max <= 0 || value.length() <= max) return value;
        return value.substring(0, max) + "\n[truncated]";
    }
}
