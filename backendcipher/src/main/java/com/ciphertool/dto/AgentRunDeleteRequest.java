package com.ciphertool.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class AgentRunDeleteRequest {

    @Size(max = 96, message = "Run ID 过长")
    private String runId;

    @Size(max = 96, message = "会话ID过长")
    private String chatId;

    private List<@Size(max = 96, message = "会话ID过长") String> chatIds;
}
