package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * MCP 同源中继：浏览器无法直连的 MCP 服务由后端代发 JSON-RPC。
 * 只允许访问 ciphertool.mcp.relay.allowed-origins 中登记的源，未配置即全部拒绝。
 */
@RestController
@RequestMapping("/api/mcp")
@CrossOrigin(origins = "*")
public class McpRelayController {

    private static final Set<String> STRIPPED_HEADERS = Set.of("host", "content-length", "connection", "accept-encoding", "content-type");
    private static final int MAX_BODY_CHARS = 2_000_000;

    @Value("${ciphertool.mcp.relay.allowed-origins:}")
    private String allowedOrigins;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    @PostMapping("/relay")
    public ResponseEntity<ApiResponse<Map<String, Object>>> relay(@RequestBody Map<String, Object> request) {
        String url = stringValue(request.get("url"));
        if (url.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("url is required"));
        }

        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(ApiResponse.error("invalid url"));
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("only http(s) is allowed"));
        }
        if (!isAllowedOrigin(uri)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("origin not allowed: " + originOf(uri)));
        }

        String method = stringValue(request.get("method"));
        if (method.isEmpty()) {
            method = "POST";
        }
        String body = stringValue(request.get("body"));
        if (body.length() > MAX_BODY_CHARS) {
            return ResponseEntity.badRequest().body(ApiResponse.error("body too large"));
        }
        long timeoutMs = Math.max(1000L, Math.min(30000L, longValue(request.get("timeoutMs"), 20000L)));

        HttpRequest.Builder builder = HttpRequest.newBuilder(uri).timeout(Duration.ofMillis(timeoutMs));
        Map<String, Object> headers = mapValue(request.get("headers"));
        headers.forEach((name, value) -> {
            String header = String.valueOf(name);
            if (header.isBlank() || STRIPPED_HEADERS.contains(header.toLowerCase(Locale.ROOT))) {
                return;
            }
            builder.header(header, String.valueOf(value));
        });

        String upperMethod = method.toUpperCase(Locale.ROOT);
        try {
            if ("GET".equals(upperMethod) || "HEAD".equals(upperMethod)) {
                builder.method(upperMethod, HttpRequest.BodyPublishers.noBody());
            } else {
                builder.header("Content-Type", contentTypeOf(headers));
                builder.method(upperMethod, HttpRequest.BodyPublishers.ofString(body));
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("status", response.statusCode());
            payload.put("contentType", response.headers().firstValue("content-type").orElse("application/json"));
            payload.put("sessionId", response.headers().firstValue("mcp-session-id").orElse(""));
            payload.put("body", response.body());
            return ResponseEntity.ok(ApiResponse.success("Relayed", payload));
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ApiResponse.error("relay interrupted"));
        } catch (Exception error) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ApiResponse.error("relay failed: " + error.getMessage()));
        }
    }

    private boolean isAllowedOrigin(URI uri) {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return false;
        }
        String target = originOf(uri);
        for (String entry : allowedOrigins.split(",")) {
            if (entry.trim().equalsIgnoreCase(target)) {
                return true;
            }
        }
        return false;
    }

    private String originOf(URI uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        int port = uri.getPort();
        if (port == -1) {
            port = "https".equals(scheme) ? 443 : 80;
        }
        return scheme + "://" + host + ":" + port;
    }

    private String contentTypeOf(Map<String, Object> headers) {
        for (Map.Entry<String, Object> entry : headers.entrySet()) {
            if ("content-type".equalsIgnoreCase(entry.getKey())) {
                return String.valueOf(entry.getValue());
            }
        }
        return "application/json";
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private long longValue(Object value, long fallback) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException error) {
            return fallback;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> mapValue(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }
}
