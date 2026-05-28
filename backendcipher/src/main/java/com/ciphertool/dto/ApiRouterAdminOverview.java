package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiRouterAdminOverview {

    private String generatedAt;

    private List<UserSummary> users = new ArrayList<>();

    private List<AuditEntry> audits = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private String email;
        private String status;
        private boolean frozen;
        private String frozenReason;
        private String controlUpdatedAt;
        private double balance;
        private int apiKeys;
        private int enabledApiKeys;
        private long requests;
        private double spend;
        private String lastActivity;
        private int pendingOrders;
        private int paidOrders;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditEntry {
        private String id;
        private String operatorEmail;
        private String action;
        private String targetType;
        private String targetId;
        private String targetEmail;
        private String detail;
        private String createdAt;
    }
}
