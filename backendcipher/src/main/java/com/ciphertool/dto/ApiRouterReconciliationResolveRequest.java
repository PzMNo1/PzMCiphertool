package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApiRouterReconciliationResolveRequest {

    @NotBlank(message = "对账问题 ID 不能为空")
    private String issueId;

    private String note;

    private Integer limit;
}
