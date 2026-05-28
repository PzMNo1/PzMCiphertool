package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentRunRecordResponse {

    private String runId;

    private String chatId;

    private Integer messageIndex;

    private String source;

    private String savedAt;

    private String updatedAt;

    private String contractVersion;

    private String mode;

    private String researchProfile;

    private Object snapshot;
}
