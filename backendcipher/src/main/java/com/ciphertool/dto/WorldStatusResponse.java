package com.ciphertool.dto;

import lombok.Data;

import java.util.List;

/**
 * 世界模型接入状态，供前端在未配置 Key 时给出可操作的引导而不是一句报错。
 */
@Data
public class WorldStatusResponse {

    /** 后端是否已读到 WORLD_LABS_API_KEY。 */
    private boolean configured;

    /** 生效的默认模型。 */
    private String model;

    /** 生效的草稿模型。 */
    private String draftModel;

    /** 上游 API 基址。 */
    private String baseUrl;

    /** 剩余 credits，未配置或查询失败时为 null。 */
    private Double remainingCredits;

    /** 未配置时的引导文案。 */
    private String hint;

    /** 上游返回的错误信息，有值时前端应原样展示。 */
    private String upstreamError;

    /**
     * 可选的资产形态，前端据此决定展示哪些导出按钮。
     * 当前固定为 splat/mesh/pano，保留字段是为了后续按模型能力动态返回。
     */
    private List<String> assetKinds;
}
