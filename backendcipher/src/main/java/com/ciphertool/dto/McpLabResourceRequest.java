package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class McpLabResourceRequest {

    @Size(max = 120, message = "资源ID过长")
    private String id;

    @NotBlank(message = "资源名称不能为空")
    @Size(max = 120, message = "资源名称过长")
    private String name;

    @Size(max = 64, message = "资源类型过长")
    private String type;

    @Size(max = 32, message = "资源分类过长")
    private String category;

    private List<String> categories = new ArrayList<>();

    @Size(max = 32, message = "资源来源过长")
    private String source;

    @Size(max = 32, message = "风险级别过长")
    private String risk;

    @Size(max = 120, message = "推荐说明过长")
    private String recommend;

    private List<String> tags = new ArrayList<>();

    @Size(max = 600, message = "用途说明过长")
    private String scenario;

    @NotBlank(message = "URL不能为空")
    @Size(max = 2048, message = "URL过长")
    private String url;

    @Size(max = 2048, message = "文档URL过长")
    private String docs;

    @Size(max = 5000, message = "配置片段过长")
    private String template;

    private List<String> platforms = new ArrayList<>();

    private List<String> permissions = new ArrayList<>();

    private List<String> installModes = new ArrayList<>();

    @Size(max = 16, message = "密钥需求过长")
    private String authRequired;

    @Size(max = 32, message = "维护状态过长")
    private String maintenance;

    private Integer trustScore;

    @Size(max = 32, message = "检查日期过长")
    private String lastChecked;

    @Size(max = 320, message = "提交人标识过长")
    private String submittedBy;
}
