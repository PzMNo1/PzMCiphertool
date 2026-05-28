package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiRouterPaymentReconciliation {

    private Summary summary;

    private List<Issue> issues = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private String generatedAt;
        private int openIssues;
        private int blockerIssues;
        private int warnIssues;
        private int infoIssues;
        private int expiredPendingOrders;
        private int failedCallbacks;
        private int replayCallbacks;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Issue {
        private String id;
        private String issueKey;
        private String orderId;
        private String email;
        private String payMethod;
        private String orderStatus;
        private double orderAmount;
        private double callbackAmount;
        private String externalTradeNo;
        private String issueType;
        private String severity;
        private boolean resolved;
        private String message;
        private String firstSeenAt;
        private String lastSeenAt;
        private String resolvedAt;
        private String resolvedBy;
        private String resolveNote;
    }
}
