package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Agent 模块充值套餐。价格与额度由服务端定义，前端只负责展示，避免客户端篡改。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentRechargePlanInfo {

    private String id;

    private String name;

    private String badge;

    private String description;

    private double price;

    private int agentCredits;

    private int agentmasterCredits;

    private int imageCredits;

    private int videoCredits;
}
