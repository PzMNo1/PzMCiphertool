package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * API router dashboard data owned by one logged-in email account.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiRouterDashboard {

    private String email;

    private String range;

    private String granularity;

    private Metrics metrics;

    private List<ModelStat> models = new ArrayList<>();

    private List<UsageRecord> usage = new ArrayList<>();

    private List<ApiKeyInfo> keys = new ArrayList<>();

    private List<Integer> trend = new ArrayList<>();

    private String updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Metrics {
        private double balance;
        private int apiKeys;
        private int requests;
        private double spend;
        private double standardSpend;
        private double todayToken;
        private double totalToken;
        private int rpm;
        private double tpm;
        private double avgLatency;
        private double inputToken;
        private double outputToken;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModelStat {
        private String name;
        private int requests;
        private String token;
        private double cost;
        private double standard;
        private int share;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageRecord {
        private String model;
        private String time;
        private double cost;
        private String token;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiKeyInfo {
        private String id;
        private String name;
        private String mask;
        private String status;
        private String quota;
        private String used;
        private String lastUsed;
        private String createdAt;
        private String updatedAt;
        /** Per-key RPM limit. 0 = use global default. */
        private int keyRpm;
        /** Per-key TPM limit. 0 = use global default. */
        private long keyTpm;
    }
}
