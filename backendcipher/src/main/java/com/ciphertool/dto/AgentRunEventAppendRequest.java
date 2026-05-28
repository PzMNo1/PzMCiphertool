package com.ciphertool.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class AgentRunEventAppendRequest {

    @Size(max = 96, message = "Run ID 过长")
    private String runId;

    private Object event;

    @Size(max = 50, message = "单次事件批量过大")
    private List<Object> events;
}
