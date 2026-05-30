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
        this.defaultModel = defaultModel == null || defaultModel.isBlank() ? "deepseek-v4-flash" : defaultModel.trim();
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
                    log.error("LLM API Error: {} - {}", response.statusCode(), errorBody);
                    emitter.send("data: " + JSON.toJSONString(Map.of(
                            "error", "Backend Error: " + response.statusCode()
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
}
