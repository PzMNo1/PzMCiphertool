package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Read-only MCP Lab resource check request.
 */
@Data
public class McpLabCheckRequest {

    @Size(max = 120, message = "资源ID过长")
    private String id;

    @Size(max = 120, message = "资源名称过长")
    private String name;

    @NotBlank(message = "URL不能为空")
    @Size(max = 2048, message = "URL过长")
    private String url;

    @Size(max = 2048, message = "文档URL过长")
    private String docs;

    private Boolean checkGithub = Boolean.TRUE;
}
