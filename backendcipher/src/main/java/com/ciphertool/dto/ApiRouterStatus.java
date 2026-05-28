package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Passive gateway health snapshot for the commercial API router.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiRouterStatus {

    private String status;

    private String message;

    private String generatedAt;

    private int channelCount;

    private int enabledChannelCount;

    private int healthyChannelCount;

    private long totalRequests;

    private long successRequests;

    private long failedRequests;

    private long last24hRequests;

    private double avgLatencyMs;

    private List<ChannelHealth> channels = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChannelHealth {
        private String id;
        private String name;
        private String provider;
        private String models;
        private boolean enabled;
        private String state;
        private int failureCount;
        private int lastStatus;
        private String lastError;
        private String circuitState;
        private String circuitDisabledUntil;
        private String lastCheckedAt;
        private String updatedAt;
    }
}
