package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API key creation response. plainKey is returned once and is never persisted.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiRouterKeyCreateResponse {

    private String plainKey;

    private ApiRouterDashboard.ApiKeyInfo key;

    private ApiRouterDashboard dashboard;
}
