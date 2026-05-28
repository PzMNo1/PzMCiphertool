package com.ciphertool.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AgentRunSaveRequest {

    @Size(max = 96, message = "Run ID 过长")
    private String runId;

    @Size(max = 96, message = "会话ID过长")
    private String chatId;

    private Integer messageIndex;

    @Size(max = 64, message = "来源标记过长")
    private String source;

    @Size(max = 40, message = "保存时间过长")
    private String savedAt;

    @Size(max = 40, message = "更新时间过长")
    private String updatedAt;

    @NotNull(message = "AgentRun 快照不能为空")
    private Object snapshot;
}
