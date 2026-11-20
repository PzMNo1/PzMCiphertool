package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 当前账号已购买、尚未使用的 Agent 模块额度。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentRechargeCredits {

    private int agent;

    private int image;

    private int video;

    public boolean isEmpty() {
        return agent <= 0 && image <= 0 && video <= 0;
    }
}
