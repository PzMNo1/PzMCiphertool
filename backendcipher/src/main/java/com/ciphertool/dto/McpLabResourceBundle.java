package com.ciphertool.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class McpLabResourceBundle {

    private String schemaVersion = "1.0";

    private String kind = "pzm-mcp-skill-resource-bundle";

    private String exportedAt;

    private String source = "PzMCipherTool Skill/MCP Lab";

    private String submittedBy;

    private List<String> compatibility = new ArrayList<>();

    private List<McpLabResourceRequest> resources = new ArrayList<>();
}
