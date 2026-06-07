package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiRouterSubscriptionPlanInfo {

    private String id;

    private String name;

    private double price;

    private double credit;

    private String quota;

    private String badge;

    private boolean enabled;

    private String note;
}
