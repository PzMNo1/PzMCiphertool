package com.ciphertool.service;

/**
 * 世界模型调用失败。带上游原文，方便前端把真实原因（额度不足、限流、提示词违规）直接展示给用户。
 */
public class WorldModelException extends RuntimeException {

    /** 上游 HTTP 状态码，本地校验失败时为 0。 */
    private final int statusCode;

    /** 是否因为没配置 API Key。前端据此显示配置引导而不是错误提示。 */
    private final boolean notConfigured;

    public WorldModelException(String message) {
        this(message, 0, false, null);
    }

    public WorldModelException(String message, Throwable cause) {
        this(message, 0, false, cause);
    }

    public WorldModelException(String message, int statusCode, boolean notConfigured, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.notConfigured = notConfigured;
    }

    public static WorldModelException notConfigured() {
        return new WorldModelException(
                "未配置 WORLD_LABS_API_KEY：请到 https://platform.worldlabs.ai/api-keys 申请后写入项目根目录 .env，并重启后端。",
                0, true, null);
    }

    public int getStatusCode() {
        return statusCode;
    }

    public boolean isNotConfigured() {
        return notConfigured;
    }
}
