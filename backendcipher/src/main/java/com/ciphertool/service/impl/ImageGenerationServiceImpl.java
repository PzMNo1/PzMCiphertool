package com.ciphertool.service.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.ciphertool.dto.ImageGenerationRequest;
import com.ciphertool.dto.ImageGenerationResponse;
import com.ciphertool.service.ImageGenerationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Slf4j
@Service
public class ImageGenerationServiceImpl implements ImageGenerationService {

    private static final int MAX_INLINE_IMAGE_BYTES = 20 * 1024 * 1024;

    private final HttpClient httpClient;
    private final String apiKey;
    private final String generationsUrl;
    private final String defaultModel;
    private final String defaultSize;

    public ImageGenerationServiceImpl(
            @Value("${image.api-key:${llm.api-key:}}") String apiKey,
            @Value("${image.base-url:${llm.base-url:https://api.openai.com/v1}}") String baseUrl,
            @Value("${image.model:gpt-image-2}") String defaultModel,
            @Value("${image.size:1024x1024}") String defaultSize,
            @Value("${image.timeout-seconds:180}") long timeoutSeconds) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.max(5, Math.min(timeoutSeconds, 300))))
                .build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.generationsUrl = resolveGenerationsUrl(baseUrl);
        this.defaultModel = normalizeDefault(defaultModel, "gpt-image-2");
        this.defaultSize = normalizeDefault(defaultSize, "1024x1024");
    }

    @Override
    public ImageGenerationResponse generate(ImageGenerationRequest request) {
        if (apiKey.isBlank()) {
            throw new IllegalStateException("IMAGE_API_KEY is not configured");
        }

        String prompt = request.getPrompt() == null ? "" : request.getPrompt().trim();
        if (prompt.isBlank()) {
            throw new IllegalArgumentException("图片生成提示不能为空");
        }

        JSONObject payload = new JSONObject();
        payload.put("model", normalizeDefault(request.getModel(), defaultModel));
        payload.put("prompt", prompt);
        payload.put("size", normalizeDefault(request.getSize(), defaultSize));
        payload.put("n", normalizeImageCount(request.getN()));

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(generationsUrl))
                .timeout(Duration.ofSeconds(300))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload.toJSONString(), StandardCharsets.UTF_8))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Image API error {}: {}", response.statusCode(), preview(response.body(), 800));
                throw new IllegalStateException("图片生成接口返回错误: " + response.statusCode());
            }

            JSONObject body = JSON.parseObject(response.body());
            List<ImageGenerationResponse.ImageItem> images = parseImages(body);
            if (images.isEmpty()) {
                throw new IllegalStateException("图片生成接口没有返回图片");
            }

            ImageGenerationResponse result = new ImageGenerationResponse();
            result.setContent("已生成图片。");
            result.setImages(images);
            return result;
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Image generation request failed", e);
            throw new IllegalStateException("图片生成失败，请稍后重试");
        }
    }

    private String resolveGenerationsUrl(String baseUrl) {
        String normalized = baseUrl == null || baseUrl.isBlank()
                ? "https://api.openai.com/v1"
                : baseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (normalized.endsWith("/images/generations")) {
            return normalized;
        }
        return normalized + "/images/generations";
    }

    private String normalizeDefault(String value, String fallback) {
        String normalized = value == null ? "" : value.trim();
        return normalized.isBlank() ? fallback : normalized;
    }

    private int normalizeImageCount(Integer count) {
        if (count == null) {
            return 1;
        }
        return Math.max(1, Math.min(4, count));
    }

    private List<ImageGenerationResponse.ImageItem> parseImages(JSONObject body) {
        JSONArray data = body.getJSONArray("data");
        if (data == null && body.containsKey("url")) {
            data = new JSONArray();
            data.add(body);
        }
        if (data == null) {
            return List.of();
        }

        List<ImageGenerationResponse.ImageItem> images = new ArrayList<>();
        for (int i = 0; i < data.size(); i++) {
            JSONObject item = data.getJSONObject(i);
            if (item == null) {
                continue;
            }
            String url = firstNonBlank(item.getString("url"), item.getString("image_url"));
            String b64 = firstNonBlank(item.getString("b64_json"), item.getString("base64"));
            String mimeType = normalizeDefault(item.getString("mime_type"), "image/png");
            if ((url == null || url.isBlank()) && b64 != null && !b64.isBlank()) {
                url = "data:" + mimeType + ";base64," + b64;
            }
            if (url == null || url.isBlank()) {
                continue;
            }
            DisplayImage displayImage = toDisplayableImage(url, mimeType);
            images.add(new ImageGenerationResponse.ImageItem(
                    displayImage.url(),
                    displayImage.mimeType(),
                    firstNonBlank(item.getString("revised_prompt"), item.getString("revisedPrompt"))
            ));
        }
        return images;
    }

    private DisplayImage toDisplayableImage(String url, String mimeType) {
        if (!isRemoteHttpUrl(url)) {
            return new DisplayImage(url, mimeType);
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(60))
                    .GET()
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Generated image download returned {} for {}", response.statusCode(), url);
                return new DisplayImage(url, mimeType);
            }

            byte[] bytes = response.body();
            if (bytes == null || bytes.length == 0 || bytes.length > MAX_INLINE_IMAGE_BYTES) {
                log.warn("Generated image download size is not inlineable: {} bytes", bytes == null ? 0 : bytes.length);
                return new DisplayImage(url, mimeType);
            }

            String responseMimeType = response.headers()
                    .firstValue("content-type")
                    .map(this::normalizeMimeType)
                    .filter(value -> value.startsWith("image/"))
                    .orElse(normalizeDefault(mimeType, "image/png"));
            String inlineUrl = "data:" + responseMimeType + ";base64," + Base64.getEncoder().encodeToString(bytes);
            return new DisplayImage(inlineUrl, responseMimeType);
        } catch (Exception e) {
            log.warn("Failed to inline generated image URL: {}", url, e);
            return new DisplayImage(url, mimeType);
        }
    }

    private boolean isRemoteHttpUrl(String value) {
        String text = value == null ? "" : value.trim().toLowerCase();
        return text.startsWith("http://") || text.startsWith("https://");
    }

    private String normalizeMimeType(String value) {
        String text = value == null ? "" : value.trim();
        int separator = text.indexOf(';');
        if (separator >= 0) {
            text = text.substring(0, separator).trim();
        }
        return text.isBlank() ? "image/png" : text;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String preview(String value, int max) {
        String text = value == null ? "" : value;
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }

    private record DisplayImage(String url, String mimeType) {
    }
}
