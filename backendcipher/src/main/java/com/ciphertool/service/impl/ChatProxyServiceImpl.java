package com.ciphertool.service.impl;

import com.alibaba.fastjson2.JSON;
import com.ciphertool.dto.ChatCompletionRequest;
import com.ciphertool.service.ChatProxyService;
import lombok.extern.slf4j.Slf4j;
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
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
public class ChatProxyServiceImpl implements ChatProxyService {

    private static final List<String> API_KEYS = Arrays.asList(
        "sk-de8157ff2ed841df810cc887530d7291",
        "sk-6d134484a57b4ac9858c08369acee53c",
        "sk-00c6c63ce7a4458a974b18616835753c",
        "sk-4c9f1129538c4e908ec9f7e2957ea882",
        "sk-f5602b74f02746f694fba34fe23f46c0",
        "sk-eb837030927c4d66b4c810998320706a",
        "sk-dd1115562a6241eeb3697d9a223b53a7",
        "sk-6e0946e9bf814da7925d14642ba1cd68",
        "sk-6186dd65b1a34cc29c7f87e3d4fcb914",
        "sk-a43772fabad44c82be6a11ecbecd85c1",
        "sk-c95fc3eb79894bcc8264cf459287ad00",
        "sk-1f7e4ff26ca64425b55c3a86704953de"
    );

    private final AtomicInteger keyIndex = new AtomicInteger(0);
    private static final String API_URL = "https://api.deepseek.com/chat/completions";

    private final HttpClient httpClient;

    public ChatProxyServiceImpl() {
        this.httpClient = HttpClient.newHttpClient();
    }

    private String getNextApiKey() {
        int index = keyIndex.getAndIncrement() % API_KEYS.size();
        if (index < 0) {
            index = 0;
            keyIndex.set(0);
        }
        return API_KEYS.get(index);
    }

    @Override
    public void streamChat(ChatCompletionRequest request, ResponseBodyEmitter emitter) {
        String requestBody = JSON.toJSONString(request);
        String currentApiKey = getNextApiKey();

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + currentApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        CompletableFuture<HttpResponse<InputStream>> responseFuture = httpClient.sendAsync(httpRequest, HttpResponse.BodyHandlers.ofInputStream());

        responseFuture.thenAccept(response -> {
            if (response.statusCode() != 200) {
                try {
                    String errorBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
                    log.error("DeepSeek API Error: {} - {}", response.statusCode(), errorBody);
                    // 返回一个错误格式的JSON，让前端能看到
                    emitter.send("data: {\"error\": \"Backend Error: " + response.statusCode() + "\"}\n\n");
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
}
