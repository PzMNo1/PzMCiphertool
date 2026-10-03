package com.ciphertool.service.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.ciphertool.dto.WorldGenerateRequest;
import com.ciphertool.dto.WorldGenerateResponse;
import com.ciphertool.dto.WorldInfo;
import com.ciphertool.dto.WorldListResponse;
import com.ciphertool.dto.WorldStatusResponse;
import com.ciphertool.service.WorldModelException;
import com.ciphertool.service.WorldModelService;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * World Labs / Marble World API 代理实现。
 *
 * <p>上游基址 {@code https://api.worldlabs.ai/marble/v1}，鉴权走 {@code WLT-Api-Key} 头。
 * 生成是长任务：{@code worlds:generate} 只返回 operation_id，
 * 需要轮询 {@code operations/{id}}，落定后从 {@code response} 里取 World。</p>
 *
 * <p>本类只负责搬运和摊平字段，不做业务裁剪，上游新增字段通过 raw 原样透传，
 * 避免上游迭代时后端需要跟着改。</p>
 */
@Slf4j
@Service
public class WorldModelServiceImpl implements WorldModelService {

    /** data URL 前缀：data:image/png;base64,xxxx */
    private static final Pattern DATA_URL = Pattern.compile("^data:([^;,]*);base64,(.*)$", Pattern.DOTALL);

    private final HttpClient httpClient;
    private final String apiKey;
    private final String baseUrl;
    private final String defaultModel;
    private final String draftModel;
    private final long timeoutSeconds;

    public WorldModelServiceImpl(
            @Value("${world.api-key:}") String apiKey,
            @Value("${world.base-url:https://api.worldlabs.ai/marble/v1}") String baseUrl,
            @Value("${world.model:marble-1.1}") String defaultModel,
            @Value("${world.draft-model:marble-1.0-draft}") String draftModel,
            @Value("${world.timeout-seconds:180}") long timeoutSeconds) {
        this.timeoutSeconds = Math.max(30, Math.min(timeoutSeconds, 600));
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.min(30, this.timeoutSeconds)))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = trimTrailingSlash(baseUrl == null || baseUrl.isBlank()
                ? "https://api.worldlabs.ai/marble/v1"
                : baseUrl.trim());
        this.defaultModel = blankTo(defaultModel, "marble-1.1");
        this.draftModel = blankTo(draftModel, "marble-1.0-draft");
    }

    @Override
    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    @Override
    public WorldStatusResponse status() {
        WorldStatusResponse status = new WorldStatusResponse();
        status.setConfigured(isConfigured());
        status.setModel(defaultModel);
        status.setDraftModel(draftModel);
        status.setBaseUrl(baseUrl);
        status.setAssetKinds(List.of("splat", "mesh", "pano"));

        if (!isConfigured()) {
            status.setHint("未配置 WORLD_LABS_API_KEY。请到 https://platform.worldlabs.ai/api-keys 申请，"
                    + "写入项目根目录 .env 后重启后端。注意 API 额度要在 platform.worldlabs.ai 单独购买，"
                    + "Marble 网页版的额度不能用于 API。");
            return status;
        }

        // 顺手探一次余额。这一步不消耗 credits，失败也不该让整个页面不可用。
        try {
            JSONObject body = get("credits");
            status.setRemainingCredits(body.getDouble("remaining_credits"));
            status.setHint(buildQuotaHint(status.getRemainingCredits()));
        } catch (WorldModelException e) {
            status.setUpstreamError(e.getMessage());
            status.setHint("已配置 API Key，但查询余额失败：" + e.getMessage());
        }
        return status;
    }

    @Override
    public WorldGenerateResponse generate(WorldGenerateRequest request) {
        requireConfigured();
        if (request == null) {
            throw new IllegalArgumentException("请求体不能为空");
        }

        String mode = request.getMode() == null || request.getMode().isBlank()
                ? "text"
                : request.getMode().trim().toLowerCase();
        String prompt = request.getPrompt() == null ? "" : request.getPrompt().trim();

        JSONObject worldPrompt = new JSONObject();
        if ("image".equals(mode)) {
            String imageUrl = request.getImageUrl() == null ? "" : request.getImageUrl().trim();
            if (imageUrl.isBlank()) {
                throw new IllegalArgumentException("图生世界需要提供 imageUrl");
            }
            worldPrompt.put("type", "image");
            worldPrompt.put("image_prompt", buildImageReference(imageUrl, request.getImageExtension()));
            worldPrompt.put("is_pano", blankTo(request.getIsPano(), "auto"));
            if (!prompt.isBlank()) {
                worldPrompt.put("text_prompt", prompt);
            }
        } else {
            if (prompt.isBlank()) {
                throw new IllegalArgumentException("提示词不能为空");
            }
            worldPrompt.put("type", "text");
            worldPrompt.put("text_prompt", prompt);
        }
        // disable_recaption=true 表示「别改我的词」；默认放行上游重写，与官方网页版一致。
        worldPrompt.put("disable_recaption", Boolean.TRUE.equals(request.getDisableRecaption()));

        JSONObject payload = new JSONObject();
        payload.put("world_prompt", worldPrompt);
        payload.put("model", resolveModel(request));
        if (request.getDisplayName() != null && !request.getDisplayName().isBlank()) {
            payload.put("display_name", truncate(request.getDisplayName().trim(), 64));
        }
        if (request.getTags() != null && !request.getTags().isEmpty()) {
            List<String> tags = new ArrayList<>();
            for (String tag : request.getTags()) {
                if (tag != null && !tag.isBlank() && tags.size() < 10) {
                    tags.add(truncate(tag.trim(), 32));
                }
            }
            if (!tags.isEmpty()) {
                payload.put("tags", tags);
            }
        }
        if (request.getSeed() != null) {
            payload.put("seed", request.getSeed());
        }
        JSONObject permission = new JSONObject();
        permission.put("public", Boolean.TRUE.equals(request.getIsPublic()));
        payload.put("permission", permission);

        JSONObject body = post("worlds:generate", payload);
        return toOperationResponse(body);
    }

    @Override
    public WorldGenerateResponse operation(String operationId) {
        requireConfigured();
        if (operationId == null || operationId.isBlank()) {
            throw new IllegalArgumentException("operationId 不能为空");
        }
        return toOperationResponse(get("operations/" + encodePath(operationId)));
    }

    @Override
    public WorldInfo world(String worldId) {
        requireConfigured();
        if (worldId == null || worldId.isBlank()) {
            throw new IllegalArgumentException("worldId 不能为空");
        }
        return toWorldInfo(get("worlds/" + encodePath(worldId)));
    }

    @Override
    public WorldListResponse list(Integer pageSize, String pageToken, String status, String model) {
        requireConfigured();
        JSONObject payload = new JSONObject();
        int size = pageSize == null ? 20 : Math.max(1, Math.min(100, pageSize));
        payload.put("page_size", size);
        if (pageToken != null && !pageToken.isBlank()) {
            payload.put("page_token", pageToken.trim());
        }
        if (status != null && !status.isBlank()) {
            payload.put("status", status.trim().toUpperCase());
        }
        if (model != null && !model.isBlank()) {
            payload.put("model", model.trim());
        }

        JSONObject body = post("worlds:list", payload);
        WorldListResponse result = new WorldListResponse();
        List<WorldInfo> worlds = new ArrayList<>();
        JSONArray array = body.getJSONArray("worlds");
        if (array != null) {
            for (int i = 0; i < array.size(); i++) {
                JSONObject item = array.getJSONObject(i);
                if (item != null) {
                    worlds.add(toWorldInfo(item));
                }
            }
        }
        result.setWorlds(worlds);
        result.setNextPageToken(body.getString("next_page_token"));
        result.setRaw(body.toJSONString());
        return result;
    }

    @Override
    public boolean delete(String worldId) {
        requireConfigured();
        if (worldId == null || worldId.isBlank()) {
            throw new IllegalArgumentException("worldId 不能为空");
        }
        JSONObject body = send("DELETE", "worlds/" + encodePath(worldId), null);
        return body != null && Boolean.TRUE.equals(body.getBoolean("deleted"));
    }

    // ------------------------------------------------------------------
    // 模型与入参
    // ------------------------------------------------------------------

    private String resolveModel(WorldGenerateRequest request) {
        if (request.getModel() != null && !request.getModel().isBlank()) {
            return request.getModel().trim();
        }
        return Boolean.TRUE.equals(request.getDraft()) ? draftModel : defaultModel;
    }

    /**
     * 把前端给的一张图整理成上游认识的引用形式。
     *
     * <p>上游支持 data_base64（内联，≤10MB）和 uri（公网 URL，≤20MB）两种。
     * 前端从 <input type=file> 拿到的必然是 data URL，所以直接内联最省事，
     * 不必先走 media-assets 上传那套签名流程。</p>
     */
    private JSONObject buildImageReference(String imageUrl, String extension) {
        JSONObject reference = new JSONObject();
        if (imageUrl.startsWith("data:")) {
            Matcher matcher = DATA_URL.matcher(imageUrl);
            if (!matcher.matches()) {
                throw new IllegalArgumentException("图片 data URL 解析失败，请重新选择图片");
            }
            String mimeType = matcher.group(1);
            String base64 = matcher.group(2).replaceAll("\\s", "");
            if (base64.isBlank()) {
                throw new IllegalArgumentException("图片内容为空");
            }
            reference.put("source", "data_base64");
            reference.put("data_base64", base64);
            reference.put("extension", blankTo(extension, extensionFromMime(mimeType)));
            return reference;
        }

        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            reference.put("source", "uri");
            reference.put("uri", imageUrl);
            return reference;
        }

        // 前端也可能只贴了纯 base64，这时靠调用方给的扩展名补齐。
        reference.put("source", "data_base64");
        reference.put("data_base64", imageUrl.replaceAll("\\s", ""));
        reference.put("extension", blankTo(extension, "png"));
        return reference;
    }

    private String extensionFromMime(String mimeType) {
        String value = mimeType == null ? "" : mimeType.trim().toLowerCase();
        int slash = value.indexOf('/');
        if (slash >= 0 && slash < value.length() - 1) {
            String subtype = value.substring(slash + 1);
            return "jpeg".equals(subtype) ? "jpg" : subtype;
        }
        return "png";
    }

    // ------------------------------------------------------------------
    // 响应摊平
    // ------------------------------------------------------------------

    private WorldGenerateResponse toOperationResponse(JSONObject body) {
        WorldGenerateResponse response = new WorldGenerateResponse();
        response.setRaw(body == null ? null : body.toJSONString());
        if (body == null) {
            return response;
        }
        response.setOperationId(body.getString("operation_id"));
        response.setDone(Boolean.TRUE.equals(body.getBoolean("done")));

        JSONObject error = body.getJSONObject("error");
        if (error != null) {
            response.setError(blankTo(error.getString("message"), "世界生成失败"));
        }

        JSONObject cost = body.getJSONObject("cost");
        if (cost != null) {
            response.setCostCredits(cost.getInteger("total_credits"));
        }

        // metadata 里带 world_id 和进度百分比，用于在长任务期间给用户反馈。
        JSONObject metadata = body.getJSONObject("metadata");
        if (metadata != null && response.getWorldId() == null) {
            response.setWorldId(metadata.getString("world_id"));
        }

        JSONObject world = body.getJSONObject("response");
        if (world != null) {
            response.setWorldId(blankTo(world.getString("world_id"), response.getWorldId()));
        }
        return response;
    }

    private WorldInfo toWorldInfo(JSONObject world) {
        WorldInfo info = new WorldInfo();
        if (world == null) {
            return info;
        }
        info.setRaw(world.toJSONString());
        info.setWorldId(world.getString("world_id"));
        info.setDisplayName(world.getString("display_name"));
        info.setModel(world.getString("model"));
        info.setCreatedAt(world.getString("created_at"));
        info.setMarbleUrl(world.getString("world_marble_url"));

        JSONArray tags = world.getJSONArray("tags");
        if (tags != null) {
            List<String> list = new ArrayList<>();
            for (int i = 0; i < tags.size(); i++) {
                String tag = tags.getString(i);
                if (tag != null) {
                    list.add(tag);
                }
            }
            info.setTags(list);
        }

        JSONObject permission = world.getJSONObject("permission");
        if (permission != null) {
            info.setIsPublic(permission.getBoolean("public"));
        }

        JSONObject assets = world.getJSONObject("assets");
        if (assets == null) {
            return info;
        }
        info.setCaption(assets.getString("caption"));
        info.setThumbnailUrl(assets.getString("thumbnail_url"));

        JSONObject imagery = assets.getJSONObject("imagery");
        if (imagery != null) {
            info.setPanoUrl(imagery.getString("pano_url"));
        }

        JSONObject splats = assets.getJSONObject("splats");
        if (splats != null) {
            info.setSpzUrls(toStringMap(splats.getJSONObject("spz_urls")));
            info.setPlyUrls(toStringMap(splats.getJSONObject("ply_urls")));
            JSONObject semantics = splats.getJSONObject("semantics_metadata");
            if (semantics != null) {
                info.setMetricScaleFactor(semantics.getDouble("metric_scale_factor"));
                info.setGroundPlaneOffset(semantics.getDouble("ground_plane_offset"));
            }
        }

        JSONObject mesh = assets.getJSONObject("mesh");
        if (mesh != null) {
            info.setColliderMeshUrl(mesh.getString("collider_mesh_url"));
            info.setHqMeshUrl(firstNonBlank(
                    mesh.getString("hq_mesh_url"),
                    mesh.getString("high_quality_mesh_url"),
                    mesh.getString("full_mesh_url")));
        }
        return info;
    }

    private Map<String, String> toStringMap(JSONObject source) {
        if (source == null || source.isEmpty()) {
            return null;
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (String key : source.keySet()) {
            String value = source.getString(key);
            if (value != null && !value.isBlank()) {
                result.put(key, value);
            }
        }
        return result.isEmpty() ? null : result;
    }

    // ------------------------------------------------------------------
    // HTTP 收发
    // ------------------------------------------------------------------

    private JSONObject get(String path) {
        return send("GET", path, null);
    }

    private JSONObject post(String path, JSONObject payload) {
        return send("POST", path, payload);
    }

    private JSONObject send(String method, String path, JSONObject payload) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/" + path))
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .header("WLT-Api-Key", apiKey)
                .header("Accept", "application/json");

        if (payload != null) {
            builder.header("Content-Type", "application/json")
                    .method(method, HttpRequest.BodyPublishers.ofString(payload.toJSONString(), StandardCharsets.UTF_8));
        } else if ("GET".equals(method)) {
            builder.GET();
        } else {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        }

        try {
            HttpResponse<String> response = httpClient.send(builder.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            int code = response.statusCode();
            String text = response.body() == null ? "" : response.body();

            if (code < 200 || code >= 300) {
                throw new WorldModelException(
                        describeUpstreamError(code, text), code, false, null);
            }
            return text.isBlank() ? new JSONObject() : JSON.parseObject(text);
        } catch (WorldModelException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new WorldModelException("世界模型请求被中断", e);
        } catch (Exception e) {
            log.error("World Labs request failed: {} {}", method, path, e);
            throw new WorldModelException("调用世界模型失败：" + e.getMessage(), e);
        }
    }

    /**
     * 把上游错误翻译成用户能看懂的一句话，同时保留原始 detail 供排查。
     */
    private String describeUpstreamError(int code, String body) {
        String detail = extractDetail(body);
        String prefix;
        switch (code) {
            case 400:
                prefix = "请求被上游拒绝（提示词可能违反内容政策或参数非法）";
                break;
            case 401:
            case 403:
                prefix = "API Key 无效或无权限";
                break;
            case 402:
                prefix = "API 额度不足，请到 platform.worldlabs.ai/billing 充值";
                break;
            case 404:
                prefix = "上游找不到该资源（operation/world 可能已过期）";
                break;
            case 429:
                prefix = "触发上游限流（默认约每分钟 3 次生成），请稍后再试";
                break;
            default:
                prefix = "世界模型接口返回错误";
                break;
        }
        return detail.isBlank() ? prefix + "（HTTP " + code + "）" : prefix + "：" + detail;
    }

    /**
     * 上游错误体有 detail（FastAPI，可能是字符串或数组）和 message 两种形态，都要兜住。
     */
    private String extractDetail(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        try {
            JSONObject json = JSON.parseObject(body);
            Object detail = json.get("detail");
            if (detail instanceof String text) {
                return truncate(text, 400);
            }
            if (detail instanceof JSONArray array && !array.isEmpty()) {
                Object first = array.get(0);
                if (first instanceof JSONObject item) {
                    return truncate(firstNonBlank(item.getString("msg"), first.toString()), 400);
                }
                return truncate(first.toString(), 400);
            }
            if (detail != null) {
                return truncate(detail.toString(), 400);
            }
            String message = firstNonBlank(json.getString("message"), json.getString("error"));
            if (!message.isBlank()) {
                return truncate(message, 400);
            }
        } catch (Exception ignored) {
            // 上游偶尔返回非 JSON，直接截断原文更有用。
        }
        return truncate(body, 400);
    }

    private String buildQuotaHint(Double credits) {
        if (credits == null) {
            return "已接入世界模型。";
        }
        // 官方计价：$1.00 = 1250 credits，生成一次世界约需一千多 credits 量级。
        double usd = credits / 1250.0;
        return String.format("已接入世界模型，剩余 %.0f credits（约 $%.2f）。", credits, usd);
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw WorldModelException.notConfigured();
        }
    }

    private String encodePath(String segment) {
        return segment.trim().replace(" ", "%20").replace("/", "%2F");
    }

    private String trimTrailingSlash(String value) {
        String result = value;
        while (result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }

    private String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max) + "…";
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
