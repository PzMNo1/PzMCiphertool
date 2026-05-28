package com.ciphertool.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.ciphertool.dto.McpLabCheckRequest;
import com.ciphertool.dto.McpLabCheckResponse;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Read-only checks for Skill/MCP Lab resources.
 * This service never executes MCP servers or installation commands.
 */
@Service
public class McpLabCheckService {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(4);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(6);
    private static final String USER_AGENT = "PzMCipherTool-McpLabChecker/1.0";
    private static final int MAX_REDIRECTS = 3;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(CONNECT_TIMEOUT)
            .build();

    public Map<String, Object> health() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("status", "ready");
        status.put("checkedAt", Instant.now().toString());
        status.put("checker", "mcp-lab-read-only");
        status.put("version", "1.1");
        status.put("connectTimeoutMs", CONNECT_TIMEOUT.toMillis());
        status.put("requestTimeoutMs", REQUEST_TIMEOUT.toMillis());
        status.put("maxRedirects", MAX_REDIRECTS);
        status.put("safety", "http_https_only_no_private_hosts_no_command_execution");
        return status;
    }

    public McpLabCheckResponse checkResource(McpLabCheckRequest request) {
        McpLabCheckResponse response = new McpLabCheckResponse();
        response.setId(trim(request.getId(), 120));
        response.setName(trim(request.getName(), 120));
        response.setCheckedAt(Instant.now().toString());

        List<McpLabCheckResponse.UrlCheck> urlChecks = new ArrayList<>();
        Set<String> urls = new LinkedHashSet<>();
        String primaryUrl = trim(request.getUrl(), 2048);
        String docsUrl = trim(request.getDocs(), 2048);
        if (!primaryUrl.isBlank()) urls.add(primaryUrl);
        if (!docsUrl.isBlank()) urls.add(docsUrl);

        int index = 0;
        for (String url : urls) {
            urlChecks.add(checkUrl(index == 0 ? "url" : "docs", url));
            index++;
        }
        response.setUrls(urlChecks);

        if (Boolean.TRUE.equals(request.getCheckGithub())) {
            response.setGithub(checkGithub(primaryUrl, docsUrl));
        }

        List<String> warnings = buildWarnings(response);
        response.setWarnings(warnings);
        response.setScore(score(response));
        response.setStatus(status(response));
        return response;
    }

    private McpLabCheckResponse.UrlCheck checkUrl(String role, String rawUrl) {
        long started = System.currentTimeMillis();
        McpLabCheckResponse.UrlCheck result = new McpLabCheckResponse.UrlCheck();
        result.setRole(role);
        result.setUrl(rawUrl);

        URI uri;
        try {
            uri = safeHttpUri(rawUrl);
        } catch (Exception e) {
            result.setChecked(false);
            applyError(result, false, classifyException(e), started);
            result.setLatencyMs(System.currentTimeMillis() - started);
            return result;
        }

        try {
            HttpResponse<Void> head = send(uri, "HEAD");
            int status = head.statusCode();
            if (status == 405 || status == 403 || status == 501) {
                HttpResponse<Void> get = send(uri, "GET");
                applyHttpResult(result, get, started);
            } else {
                applyHttpResult(result, head, started);
            }
        } catch (Exception e) {
            applyError(result, true, classifyException(e), started);
        }
        return result;
    }

    private HttpResponse<Void> send(URI uri, String method) throws Exception {
        URI current = uri;
        for (int redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
            HttpResponse<Void> response = httpClient.send(buildRequest(current, method), HttpResponse.BodyHandlers.discarding());
            if (!isRedirect(response.statusCode())) {
                return response;
            }
            String location = response.headers().firstValue("location").orElse("");
            if (location.isBlank()) {
                return response;
            }
            current = safeHttpUri(current.resolve(location).toString());
        }
        throw new IOException("重定向次数过多");
    }

    private HttpRequest buildRequest(URI uri, String method) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(REQUEST_TIMEOUT)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html,application/json;q=0.9,*/*;q=0.8");
        if ("GET".equals(method)) {
            builder.header("Range", "bytes=0-4095").GET();
        } else {
            builder.method("HEAD", HttpRequest.BodyPublishers.noBody());
        }
        return builder.build();
    }

    private void applyHttpResult(McpLabCheckResponse.UrlCheck target, HttpResponse<Void> response, long started) {
        int status = response.statusCode();
        target.setChecked(true);
        target.setReachable(status >= 200 && status < 400);
        target.setStatusCode(status);
        target.setMethod(response.request().method());
        target.setContentType(response.headers().firstValue("content-type").orElse(""));
        target.setFinalUrl(response.uri().toString());
        target.setLatencyMs(System.currentTimeMillis() - started);
        if (!target.isReachable()) {
            CheckError error = classifyHttpStatus(status);
            target.setErrorCode(error.code());
            target.setError(error.message());
            target.setRecommendation(error.recommendation());
        }
    }

    private void applyError(McpLabCheckResponse.UrlCheck target, boolean checked, CheckError error, long started) {
        target.setChecked(checked);
        target.setReachable(false);
        target.setStatusCode(0);
        target.setErrorCode(error.code());
        target.setError(trim(error.message(), 240));
        target.setRecommendation(trim(error.recommendation(), 240));
        target.setLatencyMs(System.currentTimeMillis() - started);
    }

    private McpLabCheckResponse.GithubInfo checkGithub(String primaryUrl, String docsUrl) {
        McpLabCheckResponse.GithubInfo info = new McpLabCheckResponse.GithubInfo();
        info.setChecked(false);

        String repo = findGithubRepository(primaryUrl, docsUrl);
        if (repo.isBlank()) {
            info.setError("未发现 GitHub 仓库链接");
            return info;
        }

        info.setChecked(true);
        info.setRepository(repo);
        String apiUrl = "https://api.github.com/repos/" + repo;
        info.setApiUrl(apiUrl);
        try {
            URI apiUri = safeHttpUri(apiUrl);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(apiUri)
                    .timeout(REQUEST_TIMEOUT)
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "application/vnd.github+json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            info.setFound(response.statusCode() == 200);
            if (response.statusCode() != 200) {
                CheckError error = classifyHttpStatus(response.statusCode());
                info.setErrorCode(error.code());
                info.setError("GitHub API " + error.message());
                info.setRecommendation(error.recommendation());
                return info;
            }
            JSONObject root = JSON.parseObject(response.body());
            info.setHtmlUrl(root.getString("html_url"));
            info.setDescription(trim(root.getString("description"), 280));
            info.setStars(root.getIntValue("stargazers_count"));
            info.setForks(root.getIntValue("forks_count"));
            info.setOpenIssues(root.getIntValue("open_issues_count"));
            info.setDefaultBranch(root.getString("default_branch"));
            info.setPushedAt(root.getString("pushed_at"));
            info.setUpdatedAt(root.getString("updated_at"));
            info.setArchived(root.getBooleanValue("archived"));
            info.setDisabled(root.getBooleanValue("disabled"));
            info.setVisibility(root.getString("visibility"));
            JSONObject license = root.getJSONObject("license");
            info.setLicense(license == null ? "" : trim(license.getString("name"), 120));
        } catch (Exception e) {
            info.setFound(false);
            CheckError error = classifyException(e);
            info.setErrorCode(error.code());
            info.setError(trim(error.message(), 240));
            info.setRecommendation(trim(error.recommendation(), 240));
        }
        return info;
    }

    String findGithubRepository(String... rawUrls) {
        for (String rawUrl : rawUrls) {
            try {
                URI uri = URI.create(rawUrl == null ? "" : rawUrl.trim());
                String host = normalizeHost(uri.getHost());
                if (!"github.com".equals(host)) continue;
                String[] parts = uri.getPath() == null ? new String[0] : uri.getPath().split("/");
                if (parts.length < 3) continue;
                String owner = sanitizeRepoPart(parts[1]);
                String repo = sanitizeRepoPart(parts[2]).replaceAll("\\.git$", "");
                if (!owner.isBlank() && !repo.isBlank()) {
                    return owner + "/" + repo;
                }
            } catch (Exception ignored) {
                // Try the next URL.
            }
        }
        return "";
    }

    URI safeHttpUri(String rawUrl) throws Exception {
        String value = rawUrl == null ? "" : rawUrl.trim();
        if (value.isBlank()) {
            throw new IllegalArgumentException("URL不能为空");
        }
        URI uri = URI.create(value);
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            throw new IllegalArgumentException("仅支持 http/https URL");
        }
        if (uri.getUserInfo() != null) {
            throw new IllegalArgumentException("URL不能包含用户信息");
        }
        String host = normalizeHost(uri.getHost());
        if (host.isBlank()) {
            throw new IllegalArgumentException("URL缺少主机名");
        }
        rejectPrivateHost(host);
        return uri;
    }

    private void rejectPrivateHost(String host) throws Exception {
        String lower = normalizeHost(host);
        if ("localhost".equals(lower) || lower.endsWith(".localhost")) {
            throw new IllegalArgumentException("不允许检测本地地址");
        }
        InetAddress[] addresses = InetAddress.getAllByName(lower);
        for (InetAddress address : addresses) {
            if (address.isAnyLocalAddress()
                    || address.isLoopbackAddress()
                    || address.isLinkLocalAddress()
                    || address.isSiteLocalAddress()
                    || address.isMulticastAddress()) {
                throw new IllegalArgumentException("不允许检测内网或本地地址");
            }
        }
    }

    private List<String> buildWarnings(McpLabCheckResponse response) {
        List<String> warnings = new ArrayList<>();
        for (McpLabCheckResponse.UrlCheck url : response.getUrls()) {
            if (!url.isChecked()) {
                warnings.add(url.getRole() + " 未检测：" + formatCheckFailure(url.getError(), url.getRecommendation()));
            } else if (!url.isReachable()) {
                warnings.add(url.getRole() + " 不可达：" + formatCheckFailure(url.getError(), url.getRecommendation()));
            }
        }
        McpLabCheckResponse.GithubInfo github = response.getGithub();
        if (github != null && github.isChecked()) {
            if (!github.isFound()) warnings.add("GitHub 仓库未确认：" + formatCheckFailure(github.getError(), github.getRecommendation()));
            if (github.isArchived()) warnings.add("GitHub 仓库已归档");
            if (github.isDisabled()) warnings.add("GitHub 仓库已禁用");
            if (github.getLicense() == null || github.getLicense().isBlank()) warnings.add("GitHub 仓库未识别到许可证");
        }
        return warnings;
    }

    private String formatCheckFailure(String error, String recommendation) {
        String message = trim(error, 180);
        String advice = trim(recommendation, 120);
        if (advice.isBlank()) return message;
        return message + "；建议：" + advice;
    }

    private int score(McpLabCheckResponse response) {
        int score = 100;
        for (McpLabCheckResponse.UrlCheck url : response.getUrls()) {
            if (!url.isChecked()) score -= 18;
            else if (!url.isReachable()) score -= 25;
            else if (url.getStatusCode() >= 300) score -= 4;
        }
        McpLabCheckResponse.GithubInfo github = response.getGithub();
        if (github != null && github.isChecked()) {
            if (!github.isFound()) score -= 15;
            if (github.isArchived()) score -= 20;
            if (github.isDisabled()) score -= 30;
            if (github.getLicense() == null || github.getLicense().isBlank()) score -= 8;
            if (github.getStars() >= 1000) score += 5;
            else if (github.getStars() >= 100) score += 2;
        }
        return Math.max(0, Math.min(100, score));
    }

    private String status(McpLabCheckResponse response) {
        if (response.getScore() >= 85 && response.getWarnings().isEmpty()) return "healthy";
        if (response.getScore() >= 60) return "review";
        return "risk";
    }

    private String normalizeHost(String host) {
        return host == null ? "" : host.trim().toLowerCase(Locale.ROOT).replaceAll("^\\[|\\]$", "");
    }

    private boolean isRedirect(int statusCode) {
        return statusCode == 301 || statusCode == 302 || statusCode == 303 || statusCode == 307 || statusCode == 308;
    }

    CheckError classifyHttpStatus(int statusCode) {
        if (statusCode == 401 || statusCode == 403) {
            return new CheckError("auth_or_forbidden", "HTTP " + statusCode + "，目标需要授权或拒绝只读探测", "打开文档确认是否需要登录、Token 或浏览器访问。");
        }
        if (statusCode == 404) {
            return new CheckError("not_found", "HTTP 404，目标链接不存在", "确认资源官网或文档链接是否已迁移。");
        }
        if (statusCode == 429) {
            return new CheckError("rate_limited", "HTTP 429，目标服务限流", "稍后重试，或人工打开链接确认。");
        }
        if (statusCode >= 500) {
            return new CheckError("server_error", "HTTP " + statusCode + "，目标服务异常", "稍后重试，并确认资源是否仍在维护。");
        }
        if (isRedirect(statusCode)) {
            return new CheckError("redirect_unresolved", "HTTP " + statusCode + "，重定向未完成", "人工打开链接确认最终地址。");
        }
        return new CheckError("http_status", "HTTP " + statusCode + "，目标返回非健康状态", "查看文档或人工打开链接确认是否可用。");
    }

    CheckError classifyException(Throwable throwable) {
        Throwable root = rootCause(throwable);
        String message = root.getMessage() == null || root.getMessage().isBlank()
                ? root.getClass().getSimpleName()
                : root.getMessage();
        String lower = message.toLowerCase(Locale.ROOT);
        String className = root.getClass().getSimpleName().toLowerCase(Locale.ROOT);
        if (throwable instanceof HttpTimeoutException || root instanceof HttpTimeoutException || lower.contains("timed out")) {
            return new CheckError("timeout", "请求超时", "稍后重试；如果持续超时，人工确认服务可用性。");
        }
        if (root instanceof IllegalArgumentException) {
            if (message.contains("内网") || message.contains("本地地址")) {
                return new CheckError("blocked_private_host", message, "只检测公网 http/https 地址，不要填 localhost、内网 IP 或私有域名。");
            }
            return new CheckError("invalid_url", message, "检查链接格式，仅支持公网 http/https URL。");
        }
        if (className.contains("unknownhost") || lower.contains("name or service not known") || lower.contains("no such host")) {
            return new CheckError("dns_error", "域名解析失败", "确认域名是否正确，或稍后重试。");
        }
        if (className.contains("connectexception") || lower.contains("connection refused")) {
            return new CheckError("connection_refused", "连接被拒绝", "确认目标服务是否在线，端口是否对公网开放。");
        }
        if (className.contains("ssl") || lower.contains("ssl") || lower.contains("certificate") || lower.contains("handshake")) {
            return new CheckError("tls_error", "TLS/证书握手失败", "确认 HTTPS 证书是否有效，或人工打开链接复核。");
        }
        if (lower.contains("too many redirects") || message.contains("重定向次数过多")) {
            return new CheckError("too_many_redirects", "重定向次数过多", "人工打开链接确认最终地址，并直接使用最终公网地址。");
        }
        return new CheckError("network_error", trim(message, 180), "稍后重试；如持续失败，人工打开链接确认。");
    }

    private Throwable rootCause(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }

    private String sanitizeRepoPart(String value) {
        return value == null ? "" : value.replaceAll("[^A-Za-z0-9._-]", "");
    }

    private String trim(String value, int max) {
        if (value == null) return "";
        String text = value.trim();
        return text.length() <= max ? text : text.substring(0, max);
    }

    record CheckError(String code, String message, String recommendation) {
    }
}
