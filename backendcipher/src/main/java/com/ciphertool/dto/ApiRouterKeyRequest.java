package com.ciphertool.dto;

import lombok.Data;

/**
 * Create API router key request.
 */
@Data
public class ApiRouterKeyRequest extends ApiRouterDashboardRequest {

    private String name;

    private String quota;
}
