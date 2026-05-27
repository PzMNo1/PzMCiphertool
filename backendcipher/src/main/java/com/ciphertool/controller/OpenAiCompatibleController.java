package com.ciphertool.controller;

import com.ciphertool.service.ApiRouterService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class OpenAiCompatibleController {

    private final ApiRouterService apiRouterService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    @Value("${llm.api-key:}")
    private String upstreamApiKey;

    @Value("${llm.base-url:https://api.aisenyu.com/v1}")
    private String upstreamBaseUrl;

    @Value("${llm.model:gpt-5.5}")
    private String defaultModel;

    @PostMapping("/chat/completions")
    public ResponseEntity<StreamingResponseBody> chatCompletions(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody Map<String, Object> requestBody) {

        ApiRouterService.ApiKeyValidation validation;
        try {
            validation = apiRouterService.validateApiKey(extractBearerToken(authorization));
        } catch (ApiRouterService.ApiRouterAccessException e) {
            return jsonError(HttpStatus.valueOf(e.getStatusCode()), e.getMessage(), e.getType());
        } catch (IllegalArgumentException e) {
            return jsonError(HttpStatus.UNAUTHORIZED, e.getMessage());
        }

        if (upstreamApiKey == null || upstreamApiKey.isBlank()) {
            return jsonError(HttpStatus.BAD_GATEWAY, "上游 API key 未配置");
        }

        String model = normalizeModel(requestBody);
        boolean stream = Boolean.TRUE.equals(requestBody.get("stream"));
        long started = System.currentTimeMillis();
        long estimatedInputTokens = estimateInputTokens(requestBody);

        HttpResponse<InputStream> upstreamResponse;
        try {
            String body = objectMapper.writeValueAsString(requestBody);
            HttpRequest upstreamRequest = HttpRequest.newBuilder()
                    .uri(URI.create(resolveChatCompletionsUrl(upstreamBaseUrl)))
                    .timeout(Duration.ofMinutes(5))
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + upstreamApiKey.trim())
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            upstreamResponse = httpClient.send(upstreamRequest, HttpResponse.BodyHandlers.ofInputStream());
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - started;
            apiRouterService.recordProxyUsage(validation, model, 502, latency, estimatedInputTokens, 0, e.getMessage());
            log.error("OpenAI compatible proxy request failed", e);
            return jsonError(HttpStatus.BAD_GATEWAY, "上游请求失败");
        }

        int upstreamStatus = upstreamResponse.statusCode();
        MediaType contentType = stream ? MediaType.TEXT_EVENT_STREAM : MediaType.APPLICATION_JSON;
        StreamingResponseBody responseBody = outputStream -> {
            byte[] responseBytes = new byte[0];
            String streamError = null;
            try (InputStream inputStream = upstreamResponse.body()) {
                if (stream) {
                    inputStream.transferTo(outputStream);
                } else {
                    responseBytes = inputStream.readAllBytes();
                    outputStream.write(responseBytes);
                }
            } catch (Exception e) {
                streamError = e.getMessage();
                if (e instanceof IOException ioException) {
                    throw ioException;
                }
                throw new IOException(e);
            } finally {
                long latency = System.currentTimeMillis() - started;
                TokenUsage usage = stream
                        ? new TokenUsage(estimatedInputTokens, 0)
                        : extractUsage(responseBytes, estimatedInputTokens);
                String error = streamError;
                if (error == null && upstreamStatus >= 400 && responseBytes.length > 0) {
                    error = trimBody(responseBytes);
                }
                apiRouterService.recordProxyUsage(
                        validation,
                        model,
                        upstreamStatus,
                        latency,
                        usage.inputTokens(),
                        usage.outputTokens(),
                        error
                );
            }
        };

        return ResponseEntity.status(upstreamStatus)
                .contentType(contentType)
                .body(responseBody);
    }

    private String extractBearerToken(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            throw new IllegalArgumentException("缺少 Authorization 请求头");
        }
        String prefix = "Bearer ";
        if (!authorization.regionMatches(true, 0, prefix, 0, prefix.length())) {
            throw new IllegalArgumentException("Authorization 必须使用 Bearer token");
        }
        return authorization.substring(prefix.length()).trim();
    }

    private String normalizeModel(Map<String, Object> requestBody) {
        Object modelValue = requestBody.get("model");
        if (modelValue == null || String.valueOf(modelValue).isBlank()) {
            String fallback = defaultModel == null || defaultModel.isBlank() ? "gpt-5.5" : defaultModel.trim();
            requestBody.put("model", fallback);
            return fallback;
        }
        return String.valueOf(modelValue);
    }

    private String resolveChatCompletionsUrl(String baseUrl) {
        String normalized = baseUrl == null || baseUrl.isBlank()
                ? "https://api.aisenyu.com/v1"
                : baseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (normalized.endsWith("/chat/completions")) {
            return normalized;
        }
        return normalized + "/chat/completions";
    }

    private long estimateInputTokens(Map<String, Object> requestBody) {
        Object messages = requestBody.get("messages");
        if (!(messages instanceof List<?> list)) {
            return Math.max(1, String.valueOf(requestBody).length() / 4);
        }
        int chars = 0;
        for (Object item : list) {
            if (item instanceof Map<?, ?> message) {
                Object content = message.get("content");
                chars += content == null ? 0 : String.valueOf(content).length();
            } else if (item != null) {
                chars += String.valueOf(item).length();
            }
        }
        return Math.max(1, chars / 4);
    }

    private TokenUsage extractUsage(byte[] responseBytes, long fallbackInputTokens) {
        if (responseBytes == null || responseBytes.length == 0) {
            return new TokenUsage(fallbackInputTokens, 0);
        }
        try {
            JsonNode root = objectMapper.readTree(responseBytes);
            JsonNode usage = root.path("usage");
            long inputTokens = firstPositive(
                    usage.path("prompt_tokens").asLong(0),
                    usage.path("input_tokens").asLong(0),
                    fallbackInputTokens
            );
            long outputTokens = firstPositive(
                    usage.path("completion_tokens").asLong(0),
                    usage.path("output_tokens").asLong(0),
                    0
            );
            return new TokenUsage(inputTokens, outputTokens);
        } catch (Exception e) {
            return new TokenUsage(fallbackInputTokens, 0);
        }
    }

    private long firstPositive(long first, long second, long fallback) {
        if (first > 0) return first;
        if (second > 0) return second;
        return fallback;
    }

    private String trimBody(byte[] responseBytes) {
        String value = new String(responseBytes, StandardCharsets.UTF_8);
        return value.length() <= 240 ? value : value.substring(0, 240) + "...";
    }

    private ResponseEntity<StreamingResponseBody> jsonError(HttpStatus status, String message) {
        return jsonError(status, message, "api_router_error");
    }

    private ResponseEntity<StreamingResponseBody> jsonError(HttpStatus status, String message, String type) {
        StreamingResponseBody body = outputStream -> {
            String json = objectMapper.writeValueAsString(Map.of(
                    "error", Map.of(
                            "message", message == null ? status.getReasonPhrase() : message,
                            "type", type == null || type.isBlank() ? "api_router_error" : type
                    )
            ));
            outputStream.write(json.getBytes(StandardCharsets.UTF_8));
        };
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    private record TokenUsage(long inputTokens, long outputTokens) {
    }
}
