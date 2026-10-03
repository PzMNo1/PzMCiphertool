package com.ciphertool.dto;

import lombok.Data;

import java.util.List;

/**
 * 前端发起的「生成世界」请求。
 *
 * <p>对应 World Labs {@code POST /marble/v1/worlds:generate} 的入参，
 * 这里做了一层收敛，只暴露建模实验室真正用得上的字段。</p>
 */
@Data
public class WorldGenerateRequest {

    /** 文本提示词。mode=text 时必填。 */
    private String prompt;

    /**
     * 输入方式：text（文生世界）或 image（图生世界）。
     * 为空时按 text 处理。
     */
    private String mode;

    /**
     * 图生世界的图片来源，二选一：
     * <ul>
     *   <li>data URL / 纯 base64：直接内联，服务端转成 data_base64 提交</li>
     *   <li>http(s) URL：按 uri 方式提交，要求公网可访问</li>
     * </ul>
     */
    private String imageUrl;

    /** 图片扩展名（jpg/png/webp），仅在 imageUrl 为 base64 时需要。 */
    private String imageExtension;

    /** 该图是否已经是等距柱状全景图：auto / true / false，默认 auto。 */
    private String isPano;

    /**
     * 是否关闭上游的提示词重写（recaption）。
     * 默认 false，即开启自动增强，与官方网页版行为一致。
     */
    private Boolean disableRecaption;

    /** 展示名，最长 64 字符。 */
    private String displayName;

    /** 标签，最多 10 个，每个不超过 32 字符。 */
    private List<String> tags;

    /** 随机种子。 */
    private Long seed;

    /** true 时使用草稿模型（更快），默认 false。 */
    private Boolean draft;

    /** 覆盖默认模型，例如 marble-1.1-plus。 */
    private String model;

    /** 是否公开该世界，默认私有。 */
    private Boolean isPublic;
}
