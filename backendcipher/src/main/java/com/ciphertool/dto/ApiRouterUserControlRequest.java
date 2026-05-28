package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterUserControlRequest {

    @NotBlank(message = "目标邮箱不能为空")
    private String targetEmail;

    private Boolean frozen;

    private Boolean disableKeys;

    private String reason;

    private Integer userLimit;

    private Integer auditLimit;

    private String query;
}
