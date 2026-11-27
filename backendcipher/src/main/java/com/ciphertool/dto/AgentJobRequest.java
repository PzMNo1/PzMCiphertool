package com.ciphertool.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 后台任务提交参数。
 *
 * <p>kind 决定 payload 的结构：
 * <ul>
 *   <li>agent：messages / userMessage / contextPack / toolContext / runConfig / agentStyle</li>
 *   <li>image：prompt / model / size / n / referenceImage</li>
 *   <li>video：prompt / aspectRatio</li>
 * </ul>
 * 任务与当前账号、会话、助手消息绑定，重新进入网页时按这些字段恢复现场。</p>
 */
@Data
public class AgentJobRequest {

    @NotBlank(message = "任务类型不能为空")
    private String kind;

    @NotBlank(message = "会话 ID 不能为空")
    private String chatId;

    @NotBlank(message = "消息 ID 不能为空")
    private String messageId;

    /**
     * 任务参数。图片/视频沿用现有接口的字段名，Agent 直接沿用 AgentRuntime.run 的入参。
     */
    private JsonNode payload;
}
