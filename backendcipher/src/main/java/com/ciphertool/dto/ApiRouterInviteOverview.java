package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiRouterInviteOverview {

    private String code;

    private int invitedUsers;

    private double pendingRewards;

    private double creditedRewards;

    private String referredBy;

    private List<InviteeInfo> invitees = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InviteeInfo {
        private String email;
        private double rewardAmount;
        private String status;
        private String createdAt;
        private String rewardedAt;
    }
}
