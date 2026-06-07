package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class McpLabResourceSearchRequest {

    @NotBlank(message = "搜索关键词不能为空")
    @Size(max = 160, message = "搜索关键词过长")
    private String query;

    @Size(max = 32, message = "资源分类过长")
    private String category;

    private Integer limit;
}
