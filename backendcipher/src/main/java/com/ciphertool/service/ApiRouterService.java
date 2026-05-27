package com.ciphertool.service;

import com.ciphertool.dto.ApiRouterDashboard;
import com.ciphertool.dto.ApiRouterKeyCreateResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiRouterService {

    private static final String DATA_DIR = "apirouterdata";
    private static final String KEY_DIR = "apirouterkeys";
    private static final String USAGE_DIR = "apirouterusage";
    private static final int MAX_USAGE_RECORDS = 30;
    private static final int MAX_STORED_USAGE_RECORDS = 5000;
    private static final int TREND_BUCKETS = 7;
    private static final long DEFAULT_TOKEN_QUOTA_FALLBACK = 1_000_000L;
    private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss");
    private static final DateTimeFormatter STORAGE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final ObjectMapper objectMapper;
    private final SecureRandom random = new SecureRandom();

    @Value("${api-router.limit.rpm:60}")
    private int keyRpmLimit;

    @Value("${api-router.limit.tpm:120000}")
    private long keyTpmLimit;

    @Value("${api-router.quota.default-tokens:1000000}")
    private long defaultTokenQuota;

    @Value("${api-router.price.input-per-million:0}")
    private double inputPricePerMillion;

    @Value("${api-router.price.output-per-million:0}")
    private double outputPricePerMillion;

    public synchronized ApiRouterDashboard getDashboard(String email, String range, String granularity) {
        ApiRouterDashboard dashboard = loadOrCreate(email);
        applyViewOptions(dashboard, range, granularity, false);
        attachKeyViews(email, dashboard);
        applyUsageAggregation(email, dashboard);
        return dashboard;
    }

    public synchronized ApiRouterDashboard refreshDashboard(String email, String range, String granularity) {
        ApiRouterDashboard dashboard = loadOrCreate(email);
        applyViewOptions(dashboard, range, granularity, true);
        attachKeyViews(email, dashboard);
        applyUsageAggregation(email, dashboard);
        save(email, dashboard);
        return dashboard;
    }

    public synchronized ApiRouterKeyCreateResponse createApiKey(String email, String range, String granularity, String name, String quota) {
        StoredApiKeyFile keyFile = loadKeyFile(email);
        String keyName = name == null || name.isBlank() ? "router-key-" + (activeStoredKeys(keyFile).size() + 1) : name.trim();
        String keyQuota = quota == null || quota.isBlank() ? formatTokenQuota(effectiveDefaultTokenQuota()) : quota.trim();
        String plainKey = generatePlainKey();
        String now = LocalDateTime.now().format(STORAGE_TIME);
        StoredApiKey storedKey = new StoredApiKey(
                UUID.randomUUID().toString(),
                keyName,
                maskPlainKey(plainKey),
                hashPlainKey(plainKey),
                "Enabled",
                keyQuota,
                "$0.00",
                "-",
                now,
                now,
                false,
                0,
                0L
        );
        keyFile.getKeys().add(storedKey);
        saveKeyFile(email, keyFile);

        ApiRouterDashboard dashboard = getDashboard(email, range, granularity);
        return new ApiRouterKeyCreateResponse(plainKey, toKeyView(storedKey), dashboard);
    }

    public synchronized ApiRouterDashboard updateApiKeyStatus(String email, String range, String granularity, String keyId, String status) {
        StoredApiKeyFile keyFile = loadKeyFile(email);
        StoredApiKey key = findStoredKey(keyFile, keyId);
        key.setStatus(normalizeKeyStatus(status));
        key.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        saveKeyFile(email, keyFile);
        return getDashboard(email, range, granularity);
    }

    public synchronized ApiRouterDashboard deleteApiKey(String email, String range, String granularity, String keyId) {
        StoredApiKeyFile keyFile = loadKeyFile(email);
        StoredApiKey key = findStoredKey(keyFile, keyId);
        key.setStatus("Deleted");
        key.setDeleted(true);
        key.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        saveKeyFile(email, keyFile);
        return getDashboard(email, range, granularity);
    }

    public synchronized ApiRouterDashboard updateApiKeyConfig(
            String email, String range, String granularity,
            String keyId, String name, String quota,
            Integer keyRpm, Long keyTpm) {
        StoredApiKeyFile keyFile = loadKeyFile(email);
        StoredApiKey key = findStoredKey(keyFile, keyId);
        if (name != null && !name.isBlank()) {
            key.setName(name.trim());
        }
        if (quota != null && !quota.isBlank()) {
            key.setQuota(quota.trim());
        }
        if (keyRpm != null) {
            key.setKeyRpm(Math.max(0, keyRpm));
        }
        if (keyTpm != null) {
            key.setKeyTpm(Math.max(0L, keyTpm));
        }
        key.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        saveKeyFile(email, keyFile);
        return getDashboard(email, range, granularity);
    }

    public synchronized ApiKeyValidation validateApiKey(String plainKey) {
        if (plainKey == null || plainKey.isBlank()) {
            throw ApiRouterAccessException.unauthorized("API key 不能为空");
        }

        String keyHash = hashPlainKey(plainKey.trim());
        File dir = storageDir(KEY_DIR);
        File[] files = dir.listFiles((file, name) -> name.endsWith(".json"));
        if (files == null || files.length == 0) {
            throw ApiRouterAccessException.unauthorized("API key 不存在");
        }

        for (File file : files) {
            try {
                StoredApiKeyFile keyFile = objectMapper.readValue(file, StoredApiKeyFile.class);
                if (keyFile.getKeys() == null) continue;
                for (StoredApiKey key : keyFile.getKeys()) {
                    if (key.isDeleted() || !keyHash.equals(key.getKeyHash())) continue;
                    if (!"Enabled".equalsIgnoreCase(key.getStatus())) {
                        throw ApiRouterAccessException.forbidden("API key 已暂停");
                    }
                    enforceApiKeyUsagePolicy(keyFile.getEmail(), key);
                    return new ApiKeyValidation(
                            keyFile.getEmail(),
                            key.getId(),
                            key.getName(),
                            key.getMask(),
                            key.getQuota()
                    );
                }
            } catch (IOException e) {
                log.warn("Failed to scan API key file: {}", file.getName(), e);
            }
        }

        throw ApiRouterAccessException.unauthorized("API key 不存在");
    }

    public synchronized void recordProxyUsage(
            ApiKeyValidation validation,
            String model,
            int statusCode,
            long latencyMs,
            long inputTokens,
            long outputTokens,
            String errorMessage) {
        if (validation == null || validation.getEmail() == null) return;

        LocalDateTime now = LocalDateTime.now();
        String nowDisplay = now.format(DISPLAY_TIME);
        String nowStorage = now.format(STORAGE_TIME);
        long totalTokens = Math.max(0, inputTokens) + Math.max(0, outputTokens);
        boolean success = statusCode >= 200 && statusCode < 300 && (errorMessage == null || errorMessage.isBlank());
        double cost = estimateCost(model, inputTokens, outputTokens);

        try {
            StoredApiKeyFile keyFile = loadKeyFile(validation.getEmail());
            StoredApiKey key = findStoredKey(keyFile, validation.getKeyId());
            key.setLastUsed(nowDisplay);
            key.setUpdatedAt(nowStorage);
            saveKeyFile(validation.getEmail(), keyFile);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to update API key last-used state for {}", maskEmail(validation.getEmail()), e);
        }

        String modelName = model == null || model.isBlank() ? "unknown" : model;
        ApiRouterUsageRecord record = new ApiRouterUsageRecord(
                UUID.randomUUID().toString(),
                validation.getEmail(),
                validation.getKeyId(),
                validation.getName(),
                validation.getMask(),
                modelName,
                nowStorage,
                nowDisplay,
                statusCode,
                success,
                latencyMs,
                Math.max(0, inputTokens),
                Math.max(0, outputTokens),
                totalTokens,
                cost,
                errorMessage == null ? "" : trimError(errorMessage, statusCode)
        );
        appendUsageRecord(validation.getEmail(), record);
    }

    private ApiRouterDashboard loadOrCreate(String email) {
        File file = dataFile(email);
        if (!file.exists()) {
            return defaultDashboard(email);
        }

        try {
            ApiRouterDashboard dashboard = objectMapper.readValue(file, ApiRouterDashboard.class);
            if (dashboard.getEmail() == null || dashboard.getEmail().isBlank()) {
                dashboard.setEmail(email);
            }
            if (dashboard.getMetrics() == null) {
                dashboard.setMetrics(defaultMetrics());
            }
            if (dashboard.getModels() == null) {
                dashboard.setModels(defaultModels());
            }
            if (dashboard.getUsage() == null) {
                dashboard.setUsage(defaultUsage());
            }
            if (dashboard.getKeys() == null) {
                dashboard.setKeys(defaultKeys());
            }
            return dashboard;
        } catch (IOException e) {
            log.warn("Failed to read API router data for {}, fallback to defaults", maskEmail(email), e);
            return defaultDashboard(email);
        }
    }

    private void save(String email, ApiRouterDashboard dashboard) {
        try {
            File dir = storageDir(DATA_DIR);
            if (!dir.exists() && !dir.mkdirs()) {
                throw new IOException("Cannot create " + DATA_DIR);
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(dataFile(email), dashboard);
        } catch (IOException e) {
            log.error("Failed to save API router data for {}", maskEmail(email), e);
            throw new RuntimeException("Save API router data failed");
        }
    }

    private File dataFile(String email) {
        return new File(storageDir(DATA_DIR), safeFileName(email) + ".json");
    }

    private File keyDataFile(String email) {
        return new File(storageDir(KEY_DIR), safeFileName(email) + ".json");
    }

    private StoredApiKeyFile loadKeyFile(String email) {
        File file = keyDataFile(email);
        if (!file.exists()) {
            return new StoredApiKeyFile(email, new ArrayList<>());
        }

        try {
            StoredApiKeyFile keyFile = objectMapper.readValue(file, StoredApiKeyFile.class);
            if (keyFile.getEmail() == null || keyFile.getEmail().isBlank()) {
                keyFile.setEmail(email);
            }
            if (keyFile.getKeys() == null) {
                keyFile.setKeys(new ArrayList<>());
            }
            return keyFile;
        } catch (IOException e) {
            log.warn("Failed to read API key data for {}, fallback to empty keys", maskEmail(email), e);
            return new StoredApiKeyFile(email, new ArrayList<>());
        }
    }

    private void saveKeyFile(String email, StoredApiKeyFile keyFile) {
        try {
            File dir = storageDir(KEY_DIR);
            if (!dir.exists() && !dir.mkdirs()) {
                throw new IOException("Cannot create " + KEY_DIR);
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(keyDataFile(email), keyFile);
        } catch (IOException e) {
            log.error("Failed to save API key data for {}", maskEmail(email), e);
            throw new RuntimeException("Save API key data failed");
        }
    }

    private File usageDataFile(String email) {
        return new File(storageDir(USAGE_DIR), safeFileName(email) + ".json");
    }

    private ApiRouterUsageFile loadUsageFile(String email) {
        File file = usageDataFile(email);
        if (!file.exists()) {
            return new ApiRouterUsageFile(email, new ArrayList<>());
        }

        try {
            ApiRouterUsageFile usageFile = objectMapper.readValue(file, ApiRouterUsageFile.class);
            if (usageFile.getEmail() == null || usageFile.getEmail().isBlank()) {
                usageFile.setEmail(email);
            }
            if (usageFile.getRecords() == null) {
                usageFile.setRecords(new ArrayList<>());
            }
            return usageFile;
        } catch (IOException e) {
            try {
                ApiRouterUsageRecord[] records = objectMapper.readValue(file, ApiRouterUsageRecord[].class);
                return new ApiRouterUsageFile(email, records == null ? new ArrayList<>() : new ArrayList<>(List.of(records)));
            } catch (IOException ignored) {
            }
            log.warn("Failed to read API router usage for {}, fallback to empty usage", maskEmail(email), e);
            return new ApiRouterUsageFile(email, new ArrayList<>());
        }
    }

    private void saveUsageFile(String email, ApiRouterUsageFile usageFile) {
        try {
            File dir = storageDir(USAGE_DIR);
            if (!dir.exists() && !dir.mkdirs()) {
                throw new IOException("Cannot create " + USAGE_DIR);
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(usageDataFile(email), usageFile);
        } catch (IOException e) {
            log.error("Failed to save API router usage for {}", maskEmail(email), e);
            throw new RuntimeException("Save API router usage failed");
        }
    }

    private void appendUsageRecord(String email, ApiRouterUsageRecord record) {
        try {
            ApiRouterUsageFile usageFile = loadUsageFile(email);
            List<ApiRouterUsageRecord> records = usageFile.getRecords();
            if (records == null) {
                records = new ArrayList<>();
                usageFile.setRecords(records);
            }
            records.add(record);
            if (records.size() > MAX_STORED_USAGE_RECORDS) {
                records.subList(0, records.size() - MAX_STORED_USAGE_RECORDS).clear();
            }
            saveUsageFile(email, usageFile);
        } catch (RuntimeException e) {
            log.warn("Failed to append API router usage for {}", maskEmail(email), e);
        }
    }

    private File storageDir(String childDir) {
        return new File(new File(System.getProperty("user.home"), ".ciphertool"), childDir);
    }

    private void enforceApiKeyUsagePolicy(String email, StoredApiKey key) {
        List<ApiRouterUsageRecord> keyRecords = loadUsageFile(email).getRecords().stream()
                .filter(record -> key.getId().equals(record.getKeyId()))
                .toList();
        enforceQuota(key, keyRecords);
        enforceRateLimit(key, keyRecords);
    }

    private void enforceQuota(StoredApiKey key, List<ApiRouterUsageRecord> keyRecords) {
        QuotaPolicy quota = parseQuota(key.getQuota());
        if (quota.kind == QuotaKind.UNLIMITED) {
            return;
        }
        if (quota.kind == QuotaKind.CURRENCY && sumCost(keyRecords) >= quota.amount) {
            throw ApiRouterAccessException.quotaExceeded("API key 费用配额已用尽");
        }
        if (quota.kind == QuotaKind.TOKENS && sumTotalTokens(keyRecords) >= Math.round(quota.amount)) {
            throw ApiRouterAccessException.quotaExceeded("API key Token 配额已用尽");
        }
    }

    private void enforceRateLimit(StoredApiKey key, List<ApiRouterUsageRecord> keyRecords) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime minuteStart = now.minusMinutes(1);
        List<ApiRouterUsageRecord> recentRecords = keyRecords.stream()
                .filter(record -> isInRange(record, minuteStart, now))
                .toList();

        int rpmLimit = key.getKeyRpm() > 0 ? key.getKeyRpm() : effectiveKeyRpmLimit();
        if (recentRecords.size() >= rpmLimit) {
            throw ApiRouterAccessException.rateLimited(
                    "API key 已达到每分钟请求限制: " + rpmLimit + " RPM"
            );
        }

        long tpmLimit = key.getKeyTpm() > 0 ? key.getKeyTpm() : effectiveKeyTpmLimit();
        long recentTokens = sumTotalTokens(recentRecords);
        if (recentTokens >= tpmLimit) {
            throw ApiRouterAccessException.rateLimited(
                    "API key 已达到每分钟 Token 限制: " + formatTokenQuota(tpmLimit) + " TPM"
            );
        }
    }

    private void applyUsageAggregation(String email, ApiRouterDashboard dashboard) {
        List<ApiRouterUsageRecord> allRecords = new ArrayList<>(loadUsageFile(email).getRecords());
        allRecords.sort(Comparator.comparing(this::recordSortTime).reversed());

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime rangeStart = rangeStart(now, dashboard.getRange());
        List<ApiRouterUsageRecord> rangeRecords = allRecords.stream()
                .filter(record -> isInRange(record, rangeStart, now))
                .toList();

        long rangeInputTokens = sumInputTokens(rangeRecords);
        long rangeOutputTokens = sumOutputTokens(rangeRecords);
        long rangeTotalTokens = rangeInputTokens + rangeOutputTokens;
        long allTotalTokens = sumTotalTokens(allRecords);
        double rangeCost = sumCost(rangeRecords);
        long latencyCount = rangeRecords.stream().filter(record -> record.getLatencyMs() > 0).count();
        long latencyTotal = rangeRecords.stream().mapToLong(record -> Math.max(0, record.getLatencyMs())).sum();

        int enabledKeys = dashboard.getKeys() == null ? 0 : (int) dashboard.getKeys().stream()
                .filter(key -> "Enabled".equalsIgnoreCase(key.getStatus()))
                .count();
        double availableBalance = computeAvailableCurrencyBalance(dashboard.getKeys(), allRecords);
        long rangeMinutes = Math.max(1, Duration.between(rangeStart, now).toMinutes());
        double averageLatencySeconds = latencyCount == 0 ? 0.0 : latencyTotal / (double) latencyCount / 1000.0;

        dashboard.setMetrics(new ApiRouterDashboard.Metrics(
                round4(availableBalance),
                enabledKeys,
                rangeRecords.size(),
                round4(rangeCost),
                round4(rangeCost),
                round1(rangeTotalTokens / 1_000_000.0),
                round1(allTotalTokens / 1_000_000.0),
                (int) Math.round(rangeRecords.size() / (double) rangeMinutes),
                round1(rangeTotalTokens / (double) rangeMinutes / 1000.0),
                round2(averageLatencySeconds),
                round1(rangeInputTokens / 1_000_000.0),
                round4(rangeOutputTokens / 1_000_000.0)
        ));
        dashboard.setModels(buildModelStats(rangeRecords));
        dashboard.setUsage(buildUsageViews(rangeRecords));
        dashboard.setTrend(buildTrend(rangeRecords, rangeStart, now));
        applyKeyUsageAggregation(dashboard, allRecords);
    }

    private List<ApiRouterDashboard.ModelStat> buildModelStats(List<ApiRouterUsageRecord> records) {
        Map<String, UsageAggregate> byModel = new LinkedHashMap<>();
        for (ApiRouterUsageRecord record : records) {
            byModel.computeIfAbsent(normalizeModelName(record.getModel()), ignored -> new UsageAggregate())
                    .add(record, parseRecordTime(record));
        }

        List<ApiRouterDashboard.ModelStat> models = new ArrayList<>();
        for (Map.Entry<String, UsageAggregate> entry : byModel.entrySet()) {
            UsageAggregate aggregate = entry.getValue();
            models.add(new ApiRouterDashboard.ModelStat(
                    entry.getKey(),
                    aggregate.requests,
                    formatTokenCount(aggregate.totalTokens),
                    round4(aggregate.cost),
                    round4(aggregate.cost),
                    0
            ));
        }
        models.sort(Comparator.comparingInt(ApiRouterDashboard.ModelStat::getRequests).reversed());
        recomputeModelShares(models);
        return models;
    }

    private List<ApiRouterDashboard.UsageRecord> buildUsageViews(List<ApiRouterUsageRecord> records) {
        return records.stream()
                .limit(MAX_USAGE_RECORDS)
                .map(record -> new ApiRouterDashboard.UsageRecord(
                        normalizeModelName(record.getModel()),
                        displayRecordTime(record),
                        round4(record.getCost()),
                        formatTokenCount(record.getTotalTokens())
                ))
                .toList();
    }

    private List<Integer> buildTrend(List<ApiRouterUsageRecord> records, LocalDateTime rangeStart, LocalDateTime now) {
        long[] buckets = new long[TREND_BUCKETS];
        long rangeMillis = Math.max(1, Duration.between(rangeStart, now).toMillis());
        double bucketMillis = rangeMillis / (double) TREND_BUCKETS;
        for (ApiRouterUsageRecord record : records) {
            LocalDateTime recordTime = parseRecordTime(record);
            if (recordTime == null) continue;
            long offsetMillis = Math.max(0, Duration.between(rangeStart, recordTime).toMillis());
            int index = Math.min(TREND_BUCKETS - 1, (int) (offsetMillis / bucketMillis));
            buckets[index] += Math.max(0, record.getTotalTokens());
        }

        List<Integer> trend = new ArrayList<>();
        for (long bucket : buckets) {
            trend.add((int) Math.min(Integer.MAX_VALUE, bucket));
        }
        return trend;
    }

    private void applyKeyUsageAggregation(ApiRouterDashboard dashboard, List<ApiRouterUsageRecord> records) {
        if (dashboard.getKeys() == null || dashboard.getKeys().isEmpty()) {
            return;
        }

        Map<String, UsageAggregate> byKey = new LinkedHashMap<>();
        for (ApiRouterUsageRecord record : records) {
            if (record.getKeyId() == null || record.getKeyId().isBlank()) continue;
            byKey.computeIfAbsent(record.getKeyId(), ignored -> new UsageAggregate())
                    .add(record, parseRecordTime(record));
        }

        for (ApiRouterDashboard.ApiKeyInfo key : dashboard.getKeys()) {
            UsageAggregate aggregate = byKey.get(key.getId());
            QuotaPolicy quota = parseQuota(key.getQuota());
            if (aggregate == null) {
                key.setUsed(formatKeyUsage(quota, 0L, 0.0));
                continue;
            }
            key.setUsed(formatKeyUsage(quota, aggregate.totalTokens, aggregate.cost));
            if (aggregate.latestDisplay != null && !aggregate.latestDisplay.isBlank()) {
                key.setLastUsed(aggregate.latestDisplay);
            }
        }
    }

    private boolean isInRange(ApiRouterUsageRecord record, LocalDateTime rangeStart, LocalDateTime now) {
        LocalDateTime recordTime = parseRecordTime(record);
        return recordTime != null && !recordTime.isBefore(rangeStart) && !recordTime.isAfter(now.plusSeconds(1));
    }

    private LocalDateTime rangeStart(LocalDateTime now, String range) {
        return switch (normalizeRange(range, "7")) {
            case "1" -> now.minusHours(24);
            case "30" -> now.minusDays(30);
            default -> now.minusDays(7);
        };
    }

    private LocalDateTime recordSortTime(ApiRouterUsageRecord record) {
        LocalDateTime recordTime = parseRecordTime(record);
        return recordTime == null ? LocalDateTime.MIN : recordTime;
    }

    private LocalDateTime parseRecordTime(ApiRouterUsageRecord record) {
        if (record == null) return null;
        if (record.getCreatedAt() != null && !record.getCreatedAt().isBlank()) {
            try {
                return LocalDateTime.parse(record.getCreatedAt(), STORAGE_TIME);
            } catch (RuntimeException ignored) {
            }
        }
        if (record.getDisplayTime() != null && !record.getDisplayTime().isBlank()) {
            try {
                return LocalDateTime.parse(record.getDisplayTime(), DISPLAY_TIME);
            } catch (RuntimeException ignored) {
            }
        }
        return null;
    }

    private String displayRecordTime(ApiRouterUsageRecord record) {
        if (record.getDisplayTime() != null && !record.getDisplayTime().isBlank()) {
            return record.getDisplayTime();
        }
        LocalDateTime recordTime = parseRecordTime(record);
        return recordTime == null ? "-" : recordTime.format(DISPLAY_TIME);
    }

    private long sumInputTokens(List<ApiRouterUsageRecord> records) {
        return records.stream().mapToLong(record -> Math.max(0, record.getInputTokens())).sum();
    }

    private long sumOutputTokens(List<ApiRouterUsageRecord> records) {
        return records.stream().mapToLong(record -> Math.max(0, record.getOutputTokens())).sum();
    }

    private long sumTotalTokens(List<ApiRouterUsageRecord> records) {
        return records.stream().mapToLong(record -> Math.max(0, record.getTotalTokens())).sum();
    }

    private double sumCost(List<ApiRouterUsageRecord> records) {
        return records.stream().mapToDouble(record -> Math.max(0.0, record.getCost())).sum();
    }

    private String normalizeModelName(String model) {
        return model == null || model.isBlank() ? "unknown" : model;
    }

    private String formatTokenCount(long tokens) {
        long safeTokens = Math.max(0, tokens);
        if (safeTokens >= 1_000_000) {
            return String.format(Locale.ROOT, "%.1fM", safeTokens / 1_000_000.0);
        }
        if (safeTokens >= 1_000) {
            return String.format(Locale.ROOT, "%.1fK", safeTokens / 1_000.0);
        }
        return String.format(Locale.ROOT, "%,d tokens", safeTokens);
    }

    private String formatCurrency(double value) {
        return String.format(Locale.ROOT, "$%.4f", round4(Math.max(0.0, value)));
    }

    private double computeAvailableCurrencyBalance(List<ApiRouterDashboard.ApiKeyInfo> keys, List<ApiRouterUsageRecord> records) {
        if (keys == null || keys.isEmpty()) {
            return 0.0;
        }

        Map<String, Double> costByKey = new LinkedHashMap<>();
        for (ApiRouterUsageRecord record : records) {
            if (record.getKeyId() == null || record.getKeyId().isBlank()) continue;
            costByKey.merge(record.getKeyId(), Math.max(0.0, record.getCost()), Double::sum);
        }

        double balance = 0.0;
        for (ApiRouterDashboard.ApiKeyInfo key : keys) {
            if (!"Enabled".equalsIgnoreCase(key.getStatus())) continue;
            QuotaPolicy quota = parseQuota(key.getQuota());
            if (quota.kind == QuotaKind.CURRENCY) {
                balance += Math.max(0.0, quota.amount - costByKey.getOrDefault(key.getId(), 0.0));
            }
        }
        return balance;
    }

    private String formatKeyUsage(QuotaPolicy quota, long usedTokens, double usedCost) {
        if (quota.kind == QuotaKind.TOKENS) {
            return formatTokenQuota(usedTokens) + " / " + formatTokenQuota(Math.round(quota.amount));
        }
        return formatCurrency(usedCost);
    }

    private QuotaPolicy parseQuota(String quota) {
        if (quota == null || quota.isBlank()) {
            return QuotaPolicy.unlimited();
        }

        String normalized = quota.trim().toLowerCase(Locale.ROOT);
        if (normalized.contains("unlimited") || normalized.contains("无限")) {
            return QuotaPolicy.unlimited();
        }

        double amount = parseQuotaNumber(normalized);
        if (amount <= 0) {
            return QuotaPolicy.unlimited();
        }
        if (normalized.contains("$") || normalized.contains("usd") || normalized.contains("元")) {
            return new QuotaPolicy(QuotaKind.CURRENCY, amount);
        }
        return new QuotaPolicy(QuotaKind.TOKENS, amount);
    }

    private double parseQuotaNumber(String quota) {
        double multiplier = 1.0;
        if (quota.contains("million") || quota.contains("m")) {
            multiplier = 1_000_000.0;
        } else if (quota.contains("thousand") || quota.contains("k")) {
            multiplier = 1_000.0;
        }

        String numeric = quota.replaceAll("[^0-9.]", "");
        if (numeric.isBlank()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(numeric) * multiplier;
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private int effectiveKeyRpmLimit() {
        return Math.max(1, keyRpmLimit);
    }

    private long effectiveKeyTpmLimit() {
        return Math.max(1L, keyTpmLimit);
    }

    private long effectiveDefaultTokenQuota() {
        return Math.max(1L, defaultTokenQuota <= 0 ? DEFAULT_TOKEN_QUOTA_FALLBACK : defaultTokenQuota);
    }

    private String formatTokenQuota(long tokens) {
        return formatTokenCount(tokens);
    }

    private void attachKeyViews(String email, ApiRouterDashboard dashboard) {
        dashboard.setKeys(activeStoredKeys(loadKeyFile(email)).stream()
                .map(this::toKeyView)
                .toList());
    }

    private List<StoredApiKey> activeStoredKeys(StoredApiKeyFile keyFile) {
        if (keyFile == null || keyFile.getKeys() == null) {
            return new ArrayList<>();
        }
        return keyFile.getKeys().stream()
                .filter(key -> !key.isDeleted())
                .toList();
    }

    private ApiRouterDashboard.ApiKeyInfo toKeyView(StoredApiKey key) {
        return new ApiRouterDashboard.ApiKeyInfo(
                key.getId(),
                key.getName(),
                key.getMask(),
                key.getStatus(),
                key.getQuota(),
                key.getUsed(),
                key.getLastUsed(),
                key.getCreatedAt(),
                key.getUpdatedAt(),
                key.getKeyRpm(),
                key.getKeyTpm()
        );
    }

    private StoredApiKey findStoredKey(StoredApiKeyFile keyFile, String keyId) {
        if (keyFile == null || keyFile.getKeys() == null || keyId == null || keyId.isBlank()) {
            throw new IllegalArgumentException("密钥不存在");
        }
        return keyFile.getKeys().stream()
                .filter(key -> keyId.equals(key.getId()))
                .filter(key -> !key.isDeleted())
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("密钥不存在"));
    }

    private String normalizeKeyStatus(String status) {
        if ("Enabled".equalsIgnoreCase(status) || "启用".equals(status)) {
            return "Enabled";
        }
        if ("Paused".equalsIgnoreCase(status) || "暂停".equals(status)) {
            return "Paused";
        }
        throw new IllegalArgumentException("密钥状态不正确");
    }

    private String generatePlainKey() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return "sk-pzm-" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String maskPlainKey(String plainKey) {
        if (plainKey == null || plainKey.length() < 12) {
            return "sk-pzm-****";
        }
        return plainKey.substring(0, 7) + "****-" + plainKey.substring(plainKey.length() - 4);
    }

    private String hashPlainKey(String plainKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(plainKey.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private void recomputeModelShares(List<ApiRouterDashboard.ModelStat> models) {
        int totalRequests = models.stream().mapToInt(ApiRouterDashboard.ModelStat::getRequests).sum();
        if (totalRequests <= 0) return;
        models.forEach(model -> model.setShare((int) Math.round(model.getRequests() * 100.0 / totalRequests)));
    }

    private String trimError(String errorMessage, int statusCode) {
        String value = errorMessage == null || errorMessage.isBlank()
                ? "HTTP " + statusCode
                : errorMessage;
        return value.length() <= 80 ? value : value.substring(0, 80) + "...";
    }

    private double estimateCost(String model, long inputTokens, long outputTokens) {
        double inputRate = Math.max(0.0, inputPricePerMillion);
        double outputRate = Math.max(0.0, outputPricePerMillion);
        double cost = Math.max(0, inputTokens) / 1_000_000.0 * inputRate
                + Math.max(0, outputTokens) / 1_000_000.0 * outputRate;
        return round4(cost);
    }

    private void applyViewOptions(ApiRouterDashboard dashboard, String range, String granularity, boolean touchUpdatedAt) {
        dashboard.setRange(normalizeRange(range, dashboard.getRange()));
        dashboard.setGranularity(normalizeGranularity(granularity, dashboard.getGranularity()));
        dashboard.setTrend(defaultTrend(dashboard.getRange()));
        if (touchUpdatedAt) {
            dashboard.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        }
    }

    private void updateDerivedFields(ApiRouterDashboard dashboard) {
        List<ApiRouterDashboard.ApiKeyInfo> keys = dashboard.getKeys();
        int enabledKeys = keys == null ? 0 : (int) keys.stream()
                .filter(key -> "Enabled".equalsIgnoreCase(key.getStatus()))
                .count();
        dashboard.getMetrics().setApiKeys(enabledKeys);
    }

    private ApiRouterDashboard defaultDashboard(String email) {
        ApiRouterDashboard dashboard = new ApiRouterDashboard();
        dashboard.setEmail(email);
        dashboard.setRange("7");
        dashboard.setGranularity("day");
        dashboard.setMetrics(defaultMetrics());
        dashboard.setModels(defaultModels());
        dashboard.setUsage(defaultUsage());
        dashboard.setKeys(defaultKeys());
        dashboard.setTrend(defaultTrend("7"));
        dashboard.setUpdatedAt(LocalDateTime.now().format(STORAGE_TIME));
        return dashboard;
    }

    private ApiRouterDashboard.Metrics defaultMetrics() {
        return new ApiRouterDashboard.Metrics(
                0.0,
                0,
                0,
                0.0,
                0.0,
                0.0,
                0.0,
                0,
                0.0,
                0.0,
                0.0,
                0.0
        );
    }

    private List<ApiRouterDashboard.ModelStat> defaultModels() {
        return new ArrayList<>();
    }

    private List<ApiRouterDashboard.UsageRecord> defaultUsage() {
        return new ArrayList<>();
    }

    private List<ApiRouterDashboard.ApiKeyInfo> defaultKeys() {
        return new ArrayList<>();
    }

    private List<Integer> defaultTrend(String range) {
        return new ArrayList<>(List.of(0, 0, 0, 0, 0, 0, 0));
    }

    private String normalizeRange(String range, String fallback) {
        if ("1".equals(range) || "7".equals(range) || "30".equals(range)) {
            return range;
        }
        return fallback == null || fallback.isBlank() ? "7" : fallback;
    }

    private String normalizeGranularity(String granularity, String fallback) {
        if ("hour".equals(granularity) || "day".equals(granularity) || "model".equals(granularity)) {
            return granularity;
        }
        return fallback == null || fallback.isBlank() ? "day" : fallback;
    }

    private String safeFileName(String email) {
        return email == null ? "anonymous" : email.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._@-]", "_");
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        int atIndex = email.indexOf("@");
        if (atIndex <= 3) {
            return email;
        }
        return email.substring(0, 3) + "****" + email.substring(atIndex);
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiKeyValidation {
        private String email;
        private String keyId;
        private String name;
        private String mask;
        private String quota;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoredApiKeyFile {
        private String email;
        private List<StoredApiKey> keys = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoredApiKey {
        private String id;
        private String name;
        private String mask;
        private String keyHash;
        private String status;
        private String quota;
        private String used;
        private String lastUsed;
        private String createdAt;
        private String updatedAt;
        private boolean deleted;
        /** Per-key RPM limit. 0 = use global default. */
        private int keyRpm;
        /** Per-key TPM limit. 0 = use global default. */
        private long keyTpm;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiRouterUsageFile {
        private String email;
        private List<ApiRouterUsageRecord> records = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiRouterUsageRecord {
        private String id;
        private String email;
        private String keyId;
        private String keyName;
        private String keyMask;
        private String model;
        private String createdAt;
        private String displayTime;
        private int statusCode;
        private boolean success;
        private long latencyMs;
        private long inputTokens;
        private long outputTokens;
        private long totalTokens;
        private double cost;
        private String errorMessage;
    }

    private enum QuotaKind {
        UNLIMITED,
        CURRENCY,
        TOKENS
    }

    private static class QuotaPolicy {
        private final QuotaKind kind;
        private final double amount;

        private QuotaPolicy(QuotaKind kind, double amount) {
            this.kind = kind;
            this.amount = amount;
        }

        private static QuotaPolicy unlimited() {
            return new QuotaPolicy(QuotaKind.UNLIMITED, 0.0);
        }
    }

    public static class ApiRouterAccessException extends IllegalArgumentException {
        private final int statusCode;
        private final String type;

        private ApiRouterAccessException(int statusCode, String type, String message) {
            super(message);
            this.statusCode = statusCode;
            this.type = type;
        }

        public static ApiRouterAccessException unauthorized(String message) {
            return new ApiRouterAccessException(401, "authentication_error", message);
        }

        public static ApiRouterAccessException forbidden(String message) {
            return new ApiRouterAccessException(403, "invalid_request_error", message);
        }

        public static ApiRouterAccessException quotaExceeded(String message) {
            return new ApiRouterAccessException(429, "insufficient_quota", message);
        }

        public static ApiRouterAccessException rateLimited(String message) {
            return new ApiRouterAccessException(429, "rate_limit_exceeded", message);
        }

        public int getStatusCode() {
            return statusCode;
        }

        public String getType() {
            return type;
        }
    }

    private static class UsageAggregate {
        private int requests;
        private long totalTokens;
        private double cost;
        private LocalDateTime latestAt;
        private String latestDisplay;

        private void add(ApiRouterUsageRecord record, LocalDateTime recordTime) {
            requests++;
            totalTokens += Math.max(0, record.getTotalTokens());
            cost += Math.max(0.0, record.getCost());
            if (recordTime != null && (latestAt == null || recordTime.isAfter(latestAt))) {
                latestAt = recordTime;
                latestDisplay = record.getDisplayTime();
            }
        }
    }
}
