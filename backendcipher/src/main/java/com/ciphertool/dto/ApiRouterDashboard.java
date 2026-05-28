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

    private List<LedgerEntry> ledger = new ArrayList<>();

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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LedgerEntry {
        private String id;
        private String type;
        private double amount;
        private double balanceAfter;
        private String description;
        private String createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChannelInfo {
        private String id;
        private String name;
        private String provider;
        private String baseUrl;
        private String apiKeyMask;
        private String models;
        private int priority;
        private int weight;
        private boolean enabled;
        private boolean retryEnabled;
        private int failureCount;
        private int lastStatus;
        private String lastError;
        private String circuitState;
        private String circuitDisabledUntil;
        private String lastCheckedAt;
        private String updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModelPriceInfo {
        private String id;
        private String modelPattern;
        private String provider;
        private String channelId;
        private double inputPricePerMillion;
        private double outputPricePerMillion;
        private int priority;
        private boolean enabled;
        private String note;
        private String createdAt;
        private String updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RedeemCodeInfo {
        private String code;
        private double amount;
        private int maxUses;
        private int usedCount;
        private boolean enabled;
        private String expiresAt;
        private String note;
        private String createdBy;
        private String createdAt;
        private String updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderInfo {
        private String id;
        private String email;
        private double amount;
        private String payMethod;
        private String status;
        private String externalTradeNo;
        private String idempotencyKey;
        private String checkoutUrl;
        private String qrCodeUrl;
        private String paymentInstructions;
        private String paymentExpiresAt;
        private String paymentPayload;
        private String note;
        private String createdAt;
        private String paidAt;
        private String updatedAt;
    }
}
