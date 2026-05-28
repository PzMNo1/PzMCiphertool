package com.ciphertool.dto;

import lombok.Data;

/**
 * Request scoped to one API router dashboard owner.
 */
@Data
public class ApiRouterDashboardRequest {

    private String email;

    private String range = "7";

    private String granularity = "day";
}
