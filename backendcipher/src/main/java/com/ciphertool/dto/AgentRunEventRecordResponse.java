package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentRunEventRecordResponse {

    private String runId;

    private Integer seq;

    private String eventId;

    private String type;

    private String stage;

    private String visibility;

    private String ts;

    private Object payload;

    private Object event;
}
