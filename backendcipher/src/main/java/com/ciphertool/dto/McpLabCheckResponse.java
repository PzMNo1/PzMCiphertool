package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Read-only MCP Lab resource check result.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class McpLabCheckResponse {

    private String id;

    private String name;

    private String checkedAt;

    private String status;

    private int score;

    private List<String> warnings = new ArrayList<>();

    private List<UrlCheck> urls = new ArrayList<>();

    private GithubInfo github;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UrlCheck {
        private String role;
        private String url;
        private boolean checked;
        private boolean reachable;
        private int statusCode;
        private String method;
        private String contentType;
        private String finalUrl;
        private long latencyMs;
        private String errorCode;
        private String error;
        private String recommendation;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GithubInfo {
        private boolean checked;
        private boolean found;
        private String repository;
        private String apiUrl;
        private String htmlUrl;
        private String description;
        private int stars;
        private int forks;
        private int openIssues;
        private String defaultBranch;
        private String license;
        private String pushedAt;
        private String updatedAt;
        private boolean archived;
        private boolean disabled;
        private String visibility;
        private String errorCode;
        private String error;
        private String recommendation;
    }
}
