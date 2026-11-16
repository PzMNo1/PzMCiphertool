package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 视频创作任务提交参数。
 *
 * <p>模型由服务端配置决定（默认最高级的 muse-video），请求里不接受模型选择，
 * 避免前端绕开默认模型。</p>
 */
@Data
public class VideoGenerationRequest {
    @NotBlank(message = "视频创作提示不能为空")
    private String prompt;

    /**
     * 可选画幅比例，例如 16:9 / 9:16 / 1:1；不传时由服务端默认值决定。
     */
    private String aspectRatio;
}
