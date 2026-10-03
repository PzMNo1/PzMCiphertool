package com.ciphertool.service.impl;

import com.alibaba.fastjson2.JSON;
import com.ciphertool.dto.ChatCompletionRequest;
import com.ciphertool.service.ChatProxyService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
public class ChatProxyServiceImpl implements ChatProxyService {

    private final HttpClient httpClient;
    private final String apiKey;
    private final String apiUrl;
    private final String defaultModel;

    public ChatProxyServiceImpl(
            @Value("${llm.api-key}") String apiKey,
            @Value("${llm.base-url}") String baseUrl,
            @Value("${llm.model}") String defaultModel) {
        this.httpClient = HttpClient.newHttpClient();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiUrl = resolveChatCompletionsUrl(baseUrl);
        this.defaultModel = defaultModel == null || defaultModel.isBlank() ? "deepseek-flash" : defaultModel.trim();

        // 启动即打印生效配置（key 打码）：key 与 base-url 分属不同厂商时能立刻看出来
        log.info("LLM proxy configured: url={} key={} model={}", this.apiUrl, maskKey(this.apiKey), this.defaultModel);
    }

    /**
     * 供诊断接口使用：返回已打码的生效配置，便于快速定位 key/base 错配。
     */
    public Map<String, Object> describeConfiguration() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("url", apiUrl);
        info.put("host", extractHost(apiUrl));
        info.put("keyConfigured", !apiKey.isBlank());
        info.put("keyLength", apiKey.length());
        info.put("keyMasked", maskKey(apiKey));
        info.put("model", defaultModel);
        return info;
    }

    private static String extractHost(String url) {
        try {
            return URI.create(url).getHost();
        } catch (Exception e) {
            return url;
        }
    }

    /**
     * 只保留前 3 位与后 4 位，中间打码。与上游 401 报文里 "****xxxx" 的尾号可直接对照。
     */
    private static String maskKey(String key) {
        if (key == null || key.isBlank()) {
            return "(empty)";
        }
        if (key.length() <= 8) {
            return "****";
        }
        return key.substring(0, 3) + "****" + key.substring(key.length() - 4);
    }

    /**
     * 上游错误信息可能回显 key 片段，落盘/回传前再次清洗 sk- 形式的密钥。
     */
    private static String sanitize(String text) {
        if (text == null) {
            return "";
        }
        return text.replaceAll("(?i)\\bsk-[A-Za-z0-9_\\-]{6,}", "sk-****");
    }

    private String resolveChatCompletionsUrl(String baseUrl) {
        String normalized = baseUrl == null || baseUrl.isBlank()
                ? "https://api.openai.com/v1"
                : baseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (normalized.endsWith("/chat/completions")) {
            return normalized;
        }
        return normalized + "/chat/completions";
    }

    @Override
    public void streamChat(ChatCompletionRequest request, ResponseBodyEmitter emitter) {
        if (apiKey.isBlank()) {
            sendSseError(emitter, "OPENAI_API_KEY is not configured");
            return;
        }

        if (request.getModel() == null || request.getModel().isBlank()) {
            request.setModel(defaultModel);
        }
        if (request.getStream() == null) {
            request.setStream(true);
        }

        String requestBody = JSON.toJSONString(request);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        CompletableFuture<HttpResponse<InputStream>> responseFuture = httpClient.sendAsync(httpRequest, HttpResponse.BodyHandlers.ofInputStream());

        responseFuture.thenAccept(response -> {
            if (response.statusCode() != 200) {
                try {
                    String errorBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
                    log.error("LLM API Error: {} - {} (url={}, key={})",
                            response.statusCode(), errorBody, apiUrl, maskKey(apiKey));
                    // 把上游的真实原因一并回传，否则前端只能看到一个裸的 401，无法判断是 key 失效还是 key/base 错配
                    emitter.send("data: " + JSON.toJSONString(Map.of(
                            "error", buildUpstreamErrorMessage(response.statusCode(), errorBody)
                    )) + "\n\n");
                    emitter.complete();
                } catch (Exception e) {
                    log.error("Error sending error message", e);
                    emitter.completeWithError(e);
                }
                return;
            }

            try (InputStream is = response.body();
                 BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                
                String line;
                while ((line = reader.readLine()) != null) {
                    emitter.send(line + "\n");
                }
                emitter.complete();
            } catch (Exception e) {
                log.error("Error streaming response", e);
                emitter.completeWithError(e);
            }
        }).exceptionally(e -> {
            log.error("Request failed", e);
            emitter.completeWithError(e);
            return null;
        });
    }

    private void sendSseError(ResponseBodyEmitter emitter, String message) {
        try {
            emitter.send("data: " + JSON.toJSONString(Map.of("error", message)) + "\n\n");
            emitter.complete();
        } catch (Exception e) {
            log.error("Error sending configuration error", e);
            emitter.completeWithError(e);
        }
    }

    /**
     * 组装上游错误信息：保留 "Backend Error: <status>" 前缀（前端与日志既有识别方式不变），
     * 追加上游返回的真实原因，并对 401/403 给出可操作提示。
     */
    private String buildUpstreamErrorMessage(int statusCode, String errorBody) {
        StringBuilder message = new StringBuilder("Backend Error: ").append(statusCode);

        String detail = sanitize(errorBody).replaceAll("\\s+", " ").trim();
        if (!detail.isBlank()) {
            if (detail.length() > 400) {
                detail = detail.substring(0, 400) + "...";
            }
            message.append(" - ").append(detail);
        }

        if (statusCode == 401 || statusCode == 403) {
            message.append(" [上游拒绝了当前 API Key（").append(maskKey(apiKey))
                    .append("，host=").append(extractHost(apiUrl))
                    .append("）。请确认 key 与 base-url 属于同一家服务商：项目根目录 .env 的 OPENAI_API_KEY 与 OPENAI_BASE_URL 必须配套；")
                    .append("若改动过 .env，需要重启后端才会生效。]");
        }
        return message.toString();
    }
}
