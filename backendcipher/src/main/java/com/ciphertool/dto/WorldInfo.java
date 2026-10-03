package com.ciphertool.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 一个世界的可消费资产集合。
 *
 * <p>把 World Labs 的 {@code World} 对象摊平成前端直接可用的结构，
 * 让「视口预览 / 下载 / 送编辑器 / 跳 Marble」四件事都有明确字段可依。</p>
 */
@Data
public class WorldInfo {

    private String worldId;

    private String displayName;

    private String model;

    private List<String> tags;

    private String createdAt;

    /** Marble 网页版的官方查看地址，体验最好的一路兜底。 */
    private String marbleUrl;

    /** 360 全景图，用于「图片模式」快速预览。 */
    private String panoUrl;

    /** 缩略图。 */
    private String thumbnailUrl;

    /** 高斯溅射 SPZ，键为 full_res / 500k / 100k 之类。 */
    private Map<String, String> spzUrls;

    /** 高斯溅射 PLY。 */
    private Map<String, String> plyUrls;

    /** 碰撞网格 GLB，可导进建模编辑器的网格。 */
    private String colliderMeshUrl;

    /** 高质量网格 GLB（Pro 版，最长约 1 小时）。 */
    private String hqMeshUrl;

    /** 上游生成的文字描述。 */
    private String caption;

    /** 原始坐标 → 米的缩放系数，转其他引擎时必须乘。 */
    private Double metricScaleFactor;

    /** 地面在 Y 轴上的偏移（米），对齐地面用。 */
    private Double groundPlaneOffset;

    /** 是否公开。 */
    private Boolean isPublic;

    /** 上游原始 JSON。 */
    private String raw;
}
