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

    /**
     * 已购买、尚未使用的额度（Agent / 图片 / 视频）。当日免费额度用完后才会消耗。
     */
    private int credits;

    private String message;
}
