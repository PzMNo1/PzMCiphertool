package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Daily Usage Summary DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsageSummary {

    private UsageStatus agent;

    private UsageStatus agentmaster;
}
