package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Daily Usage Status DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsageStatus {

    private String surface;

    private boolean allowed;

    private boolean unlimited;

    private int limit;

    private int used;

    private int remaining;

    private String message;
}
