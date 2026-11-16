package com.ciphertool.service.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.ciphertool.dto.VideoGenerationRequest;
import com.ciphertool.dto.VideoGenerationResponse;
import com.ciphertool.service.VideoContent;
import com.ciphertool.service.VideoGenerationException;
import com.ciphertool.service.VideoGenerationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Muse 视频模型代理。
 *
 * <p>上游为 OpenAI Sora 风格的异步视频接口：先 POST /videos/generations 拿 task_id，
 * 再轮询 GET /videos/{task_id}。密钥只保存在服务端配置里，前端永远拿不到。</p>
 */
@Slf4j
@Service
public class VideoGenerationServiceImpl implements VideoGenerationService {

    private static final Pattern TASK_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{1,160}$");
    private static final Set<String> ALLOWED_ASPECT_RATIOS = Set.of(
            "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3");
    private static final String DEFAULT_MODEL = "muse-video";
    private static final String DEFAULT_ASPECT_RATIO = "16:9";
    private static final long MAX_VIDEO_BYTES = 200L * 1024 * 1024;

    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;
    private final String defaultAspectRatio;
    private final String generationsUrl;
    private final String tasksUrlPrefix;
    private final Path storageDir;
    private final long timeoutSeconds;

    public VideoGenerationServiceImpl(
            @Value("${video.api-key:${image.api-key:${llm.api-key:}}}") String apiKey,
            @Value("${video.base-url:https://api.aisenyu.com/v1}") String baseUrl,
            @Value("${video.model:muse-video}") String model,
            @Value("${video.aspect-ratio:16:9}") String defaultAspectRatio,
            @Value("${video.storage-dir:generated-videos}") String storageDir,
            @Value("${video.timeout-seconds:180}") long timeoutSeconds) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = normalizeDefault(model, DEFAULT_MODEL);
        this.defaultAspectRatio = normalizeAspectRatio(defaultAspectRatio, DEFAULT_ASPECT_RATIO);
        String normalizedBaseUrl = normalizeBaseUrl(baseUrl);
        this.generationsUrl = normalizedBaseUrl + "/videos/generations";
        this.tasksUrlPrefix = normalizedBaseUrl + "/videos/";
        this.storageDir = Path.of(normalizeDefault(storageDir, "generated-videos")).toAbsolutePath().normalize();
        this.timeoutSeconds = Math.max(30, Math.min(timeoutSeconds, 300));
    }

    @Override
    public VideoGenerationResponse submit(VideoGenerationRequest request) {
        requireConfigured();

        String prompt = request.getPrompt() == null ? "" : request.getPrompt().trim();
        if (prompt.isBlank()) {
            throw new IllegalArgumentException("视频创作提示不能为空");
        }

        JSONObject payload = new JSONObject();
        payload.put("model", model);
        payload.put("prompt", prompt);
        payload.put("aspect_ratio", normalizeAspectRatio(request.getAspectRatio(), defaultAspectRatio));

        JSONObject body = post(generationsUrl, payload, "视频任务创建接口");
        String taskId = firstNonBlank(
                body.getString("task_id"),
                body.getString("taskId"),
                body.getString("id"),
                dataValue(body, "task_id"),
                dataValue(body, "taskId"),
                dataValue(body, "id"));
        if (taskId.isBlank()) {
            throw new VideoGenerationException("视频任务创建接口没有返回 task_id");
        }
        validateTaskId(taskId);

        VideoGenerationResponse result = new VideoGenerationResponse();
        result.setTaskId(taskId);
        result.setModel(firstNonBlank(body.getString("model"), dataValue(body, "model"), model));
        result.setStatus(normalizeStatus(firstNonBlank(
                body.getString("status"),
                body.getString("task_status"),
                dataValue(body, "status"),
                dataValue(body, "task_status"))));
        result.setProgress(readProgress(body));
        result.setVideos(parseVideos(body, taskId));
        return result;
    }

    @Override
    public VideoGenerationResponse status(String taskId) {
        requireConfigured();
        validateTaskId(taskId);

        JSONObject body = get(tasksUrlPrefix + taskId, "视频任务状态接口");
        String normalizedStatus = normalizeStatus(firstNonBlank(
                body.getString("status"),
                body.getString("task_status"),
                dataValue(body, "status"),
                dataValue(body, "task_status")));

        VideoGenerationResponse result = new VideoGenerationResponse();
        result.setTaskId(firstNonBlank(
                body.getString("task_id"),
                body.getString("taskId"),
                body.getString("id"),
                dataValue(body, "task_id"),
                dataValue(body, "taskId"),
                dataValue(body, "id"),
                taskId));
        result.setModel(firstNonBlank(body.getString("model"), dataValue(body, "model"), model));
        result.setStatus(normalizedStatus);
        result.setProgress(readProgress(body));
        List<VideoGenerationResponse.VideoItem> videos = parseVideos(body, taskId);
        applyUsageDuration(body, videos);
        result.setVideos(videos);
        if ("failed".equals(normalizedStatus)) {
            result.setErrorMessage(firstNonBlank(
                    body.getString("error"),
                    body.getString("error_message"),
                    body.getString("errorMessage"),
                    dataValue(body, "error"),
                    dataValue(body, "error_message"),
                    dataValue(body, "errorMessage"),
                    dataValue(body, "message"),
                    "视频生成失败"));
        }
        if ("completed".equals(normalizedStatus) && result.getVideos().isEmpty()) {
            throw new VideoGenerationException("视频生成已完成，但上游没有返回视频地址");
        }
        return result;
    }

    @Override
    public VideoContent content(String taskId) {
        requireConfigured();
        validateTaskId(taskId);

        Path stored = storageDir.resolve(taskId + ".mp4").normalize();
        if (!stored.startsWith(storageDir)) {
            throw new IllegalArgumentException("视频任务 ID 格式不正确");
        }
        try {
            if (Files.isRegularFile(stored) && Files.size(stored) > 0) {
                return new VideoContent(new FileSystemResource(stored), "video/mp4");
            }
            Files.createDirectories(storageDir);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(tasksUrlPrefix + taskId + "/content"))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Accept", "video/mp4")
                    .GET()
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Video content API error {} for {}", response.statusCode(), taskId);
                throw new VideoGenerationException("视频文件下载失败: " + response.statusCode()
                        + apiErrorMessage(new String(response.body(), StandardCharsets.UTF_8)));
            }
            byte[] bytes = response.body();
            if (bytes == null || bytes.length == 0) {
                throw new VideoGenerationException("视频文件为空");
            }
            if (bytes.length > MAX_VIDEO_BYTES) {
                throw new VideoGenerationException("视频文件超过 200MB 限制");
            }
            Path temp = storageDir.resolve(taskId + ".mp4.part");
            Files.write(temp, bytes);
            Files.move(temp, stored, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            String contentType = response.headers()
                    .firstValue("content-type")
                    .filter(value -> value.toLowerCase().startsWith("video/"))
                    .orElse("video/mp4");
            return new VideoContent(new FileSystemResource(stored), contentType);
        } catch (VideoGenerationException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Video content download failed for {}", taskId, e);
            throw new VideoGenerationException("视频文件下载失败，请稍后重试", e);
        }
    }

    private void requireConfigured() {
        if (apiKey.isBlank()) {
            throw new VideoGenerationException("VIDEO_API_KEY 未配置，视频创作暂不可用");
        }
    }

    private void validateTaskId(String taskId) {
        String value = taskId == null ? "" : taskId.trim();
        if (!TASK_ID_PATTERN.matcher(value).matches()) {
            throw new IllegalArgumentException("视频任务 ID 格式不正确");
        }
    }

    private JSONObject post(String url, JSONObject payload, String action) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload.toJSONString(), StandardCharsets.UTF_8))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Video API {} error {}: {}", action, response.statusCode(), preview(response.body(), 800));
                throw new VideoGenerationException(action + "返回错误: " + response.statusCode()
                        + apiErrorMessage(response.body()));
            }
            return JSON.parseObject(response.body());
        } catch (VideoGenerationException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Video API {} request failed", action, e);
            throw new VideoGenerationException("视频生成请求失败，请稍后重试", e);
        }
    }

    private JSONObject get(String url, String action) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .header("Authorization", "Bearer " + apiKey)
                .header("Accept", "application/json")
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Video API {} error {}: {}", action, response.statusCode(), preview(response.body(), 800));
                throw new VideoGenerationException(action + "返回错误: " + response.statusCode()
                        + apiErrorMessage(response.body()));
            }
            return JSON.parseObject(response.body());
        } catch (VideoGenerationException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Video API {} request failed", action, e);
            throw new VideoGenerationException("视频生成状态查询失败，请稍后重试", e);
        }
    }

    private Integer readProgress(JSONObject body) {
        Integer progress = body == null ? null : body.getInteger("progress");
        if (progress == null && body != null) {
            JSONObject data = body.getJSONObject("data");
            if (data != null) {
                progress = data.getInteger("progress");
            }
        }
        if (progress == null) {
            return null;
        }
        return Math.max(0, Math.min(100, progress));
    }

    private List<VideoGenerationResponse.VideoItem> parseVideos(JSONObject body, String taskId) {
        List<VideoGenerationResponse.VideoItem> videos = new ArrayList<>();
        if (body == null) {
            return videos;
        }

        collectVideoItem(videos, body, taskId);
        collectVideoArray(videos, body.getJSONArray("data"), taskId);
        collectVideoArray(videos, body.getJSONArray("result"), taskId);
        collectVideoArray(videos, body.getJSONArray("videos"), taskId);
        collectVideoArray(videos, body.getJSONArray("output"), taskId);

        JSONObject output = body.getJSONObject("output");
        if (output != null) {
            collectVideoItem(videos, output, taskId);
            collectVideoArray(videos, output.getJSONArray("data"), taskId);
            collectVideoArray(videos, output.getJSONArray("videos"), taskId);
            collectVideoArray(videos, output.getJSONArray("result"), taskId);
        }
        JSONObject data = body.getJSONObject("data");
        if (data != null) {
            collectVideoItem(videos, data, taskId);
            collectVideoArray(videos, data.getJSONArray("videos"), taskId);
            collectVideoArray(videos, data.getJSONArray("result"), taskId);
        }
        return videos;
    }

    private void collectVideoArray(List<VideoGenerationResponse.VideoItem> videos, JSONArray array, String taskId) {
        if (array == null) {
            return;
        }
        for (int i = 0; i < array.size(); i++) {
            Object item = array.get(i);
            if (item instanceof String stringItem) {
                addVideo(videos, stringItem, null, null, null, taskId);
            } else if (item instanceof JSONObject objectItem) {
                collectVideoItem(videos, objectItem, taskId);
            }
        }
    }

    private void collectVideoItem(List<VideoGenerationResponse.VideoItem> videos, JSONObject item, String taskId) {
        if (item == null) {
            return;
        }
        String url = firstNonBlank(
                item.getString("url"),
                item.getString("video_url"),
                item.getString("videoUrl"),
                item.getString("output_url"),
                item.getString("outputUrl"),
                item.getString("file_url"),
                item.getString("fileUrl"),
                item.getString("content_url"),
                item.getString("contentUrl"),
                item.getString("uri"));
        String mimeType = firstNonBlank(item.getString("mime_type"), item.getString("mimeType"), "video/mp4");
        Integer duration = item.getInteger("duration_seconds");
        if (duration == null) {
            duration = item.getInteger("durationSeconds");
        }
        if (duration == null) {
            duration = item.getInteger("duration");
        }
        String aspectRatio = firstNonBlank(
                item.getString("aspect_ratio"),
                item.getString("aspectRatio"),
                item.getString("ratio"));
        addVideo(videos, url, mimeType, duration, aspectRatio, taskId);
    }

    private void addVideo(List<VideoGenerationResponse.VideoItem> videos, String url, String mimeType,
                          Integer durationSeconds, String aspectRatio, String taskId) {
        String normalizedUrl = resolveMediaUrl(url, taskId);
        if (normalizedUrl.isBlank()) {
            return;
        }
        boolean duplicate = videos.stream().anyMatch(video -> normalizedUrl.equals(video.getUrl()));
        if (duplicate) {
            return;
        }
        videos.add(new VideoGenerationResponse.VideoItem(
                normalizedUrl,
                normalizeDefault(mimeType, "video/mp4"),
                durationSeconds,
                aspectRatio));
    }

    /**
     * 上游成片地址是需要 Bearer 鉴权的相对路径，浏览器 <video> 无法直接携带 Key，
     * 因此改写为后端代理地址；代理层首次访问时落盘，之后支持 Range/seek。
     */
    private String resolveMediaUrl(String value, String taskId) {
        String url = value == null ? "" : value.trim();
        if (url.isBlank()) {
            return "";
        }
        if (!taskId.isBlank()) {
            String suffix = "/videos/" + taskId + "/content";
            if (url.contains(suffix)) {
                return "/api/videos/generations/" + taskId + "/content";
            }
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        if (url.startsWith("/")) {
            try {
                URI base = URI.create(generationsUrl);
                return base.getScheme() + "://" + base.getAuthority() + url;
            } catch (Exception ignored) {
                return url;
            }
        }
        return "";
    }

    private void applyUsageDuration(JSONObject body, List<VideoGenerationResponse.VideoItem> videos) {
        if (body == null || videos.isEmpty()) {
            return;
        }
        JSONObject usage = body.getJSONObject("usage");
        if (usage == null) {
            return;
        }
        Integer seconds = usage.getInteger("billing_seconds");
        if (seconds == null) {
            seconds = usage.getInteger("duration_seconds");
        }
        if (seconds == null || seconds <= 0) {
            return;
        }
        for (VideoGenerationResponse.VideoItem video : videos) {
            if (video.getDurationSeconds() == null) {
                video.setDurationSeconds(seconds);
            }
        }
    }

    private String normalizeStatus(String value) {
        String status = value == null ? "" : value.trim().toLowerCase();
        return switch (status) {
            case "completed", "complete", "success", "succeeded", "done", "finished" -> "completed";
            case "failed", "failure", "error", "cancelled", "canceled", "expired" -> "failed";
            case "in_progress", "in-progress", "processing", "running", "generating" -> "processing";
            case "queued", "pending", "submitted", "created", "waiting" -> "queued";
            default -> status.isBlank() ? "queued" : status;
        };
    }

    private String normalizeAspectRatio(String value, String fallback) {
        String ratio = value == null ? "" : value.trim();
        if (ratio.isBlank()) {
            return fallback;
        }
        if (!ALLOWED_ASPECT_RATIOS.contains(ratio)) {
            throw new IllegalArgumentException("视频画幅比例不支持: " + ratio);
        }
        return ratio;
    }

    private String normalizeBaseUrl(String baseUrl) {
        String normalized = baseUrl == null || baseUrl.isBlank()
                ? "https://api.aisenyu.com/v1"
                : baseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String normalizeDefault(String value, String fallback) {
        String normalized = value == null ? "" : value.trim();
        return normalized.isBlank() ? fallback : normalized;
    }

    private String dataValue(JSONObject body, String key) {
        JSONObject data = body == null ? null : body.getJSONObject("data");
        return data == null ? null : data.getString(key);
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

    private String apiErrorMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "";
        }
        try {
            JSONObject body = JSON.parseObject(responseBody);
            JSONObject error = body.getJSONObject("error");
            String message = error != null ? error.getString("message") : body.getString("message");
            if (message == null || message.isBlank()) {
                message = body.getString("msg");
            }
            return message == null || message.isBlank() ? "" : " - " + preview(message, 300);
        } catch (Exception ignored) {
            return " - " + preview(responseBody, 300);
        }
    }
}
