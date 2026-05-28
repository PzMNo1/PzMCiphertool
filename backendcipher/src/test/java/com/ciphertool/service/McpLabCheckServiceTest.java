package com.ciphertool.service;

import com.ciphertool.dto.McpLabCheckRequest;
import com.ciphertool.dto.McpLabCheckResponse;
import org.junit.jupiter.api.Test;

import java.net.http.HttpTimeoutException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class McpLabCheckServiceTest {

    private final McpLabCheckService service = new McpLabCheckService();

    @Test
    void healthReturnsReadOnlyCheckerMetadata() {
        Map<String, Object> health = service.health();

        assertThat(health)
                .containsEntry("status", "ready")
                .containsEntry("checker", "mcp-lab-read-only")
                .containsEntry("version", "1.1")
                .containsEntry("safety", "http_https_only_no_private_hosts_no_command_execution");
        assertThat(health.get("connectTimeoutMs")).isEqualTo(4000L);
        assertThat(health.get("requestTimeoutMs")).isEqualTo(6000L);
        assertThat(health.get("maxRedirects")).isEqualTo(3);
    }

    @Test
    void checkResourceRejectsLocalhostWithoutNetworkProbe() {
        McpLabCheckRequest request = new McpLabCheckRequest();
        request.setId("local-test");
        request.setName("Local Test");
        request.setUrl("http://localhost:8080/private");
        request.setCheckGithub(false);

        McpLabCheckResponse response = service.checkResource(request);

        assertThat(response.getStatus()).isEqualTo("review");
        assertThat(response.getScore()).isLessThan(100);
        assertThat(response.getWarnings()).anySatisfy(warning -> assertThat(warning).contains("不允许检测本地地址"));

        McpLabCheckResponse.UrlCheck url = response.getUrls().get(0);
        assertThat(url.isChecked()).isFalse();
        assertThat(url.isReachable()).isFalse();
        assertThat(url.getErrorCode()).isEqualTo("blocked_private_host");
        assertThat(url.getRecommendation()).contains("公网");
    }

    @Test
    void safeHttpUriRejectsPrivateRedirectTargets() {
        assertThatThrownBy(() -> service.safeHttpUri("http://127.0.0.1/redirect-target"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("内网");
    }

    @Test
    void safeHttpUriRejectsNonHttpSchemesAndUserInfo() {
        assertThatThrownBy(() -> service.safeHttpUri("file:///etc/passwd"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("仅支持 http/https");

        assertThatThrownBy(() -> service.safeHttpUri("https://user:pass@example.com/repo"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("用户信息");
    }

    @Test
    void findGithubRepositoryExtractsOwnerAndRepository() {
        assertThat(service.findGithubRepository("https://github.com/modelcontextprotocol/registry/tree/main"))
                .isEqualTo("modelcontextprotocol/registry");
        assertThat(service.findGithubRepository("https://github.com/openai/skills.git"))
                .isEqualTo("openai/skills");
        assertThat(service.findGithubRepository("https://example.com/not-github"))
                .isBlank();
    }

    @Test
    void classifyHttpStatusReturnsStableErrorCodesAndRecommendations() {
        McpLabCheckService.CheckError notFound = service.classifyHttpStatus(404);
        McpLabCheckService.CheckError rateLimited = service.classifyHttpStatus(429);
        McpLabCheckService.CheckError serverError = service.classifyHttpStatus(503);

        assertThat(notFound.code()).isEqualTo("not_found");
        assertThat(notFound.recommendation()).contains("迁移");
        assertThat(rateLimited.code()).isEqualTo("rate_limited");
        assertThat(serverError.code()).isEqualTo("server_error");
    }

    @Test
    void classifyExceptionReturnsStableNetworkErrorCodes() {
        McpLabCheckService.CheckError timeout = service.classifyException(new HttpTimeoutException("request timed out"));
        McpLabCheckService.CheckError invalid = service.classifyException(new IllegalArgumentException("URL缺少主机名"));

        assertThat(timeout.code()).isEqualTo("timeout");
        assertThat(timeout.recommendation()).contains("重试");
        assertThat(invalid.code()).isEqualTo("invalid_url");
    }
}
