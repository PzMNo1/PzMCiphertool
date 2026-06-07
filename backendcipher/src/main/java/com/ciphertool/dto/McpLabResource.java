package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class McpLabResource {

    private String id;

    private String name;

    private String type;

    private String category;

    private List<String> categories = new ArrayList<>();

    private String source;

    private String risk;

    private String recommend;

    private List<String> tags = new ArrayList<>();

    private String scenario;

    private String url;

    private String docs;

    private String template;

    private List<String> platforms = new ArrayList<>();

    private List<String> permissions = new ArrayList<>();

    private List<String> installModes = new ArrayList<>();

    private String authRequired;

    private String maintenance;

    private int trustScore;

    private String lastChecked;

    private String origin;

    private String submittedBy;

    private String createdAt;

    private String updatedAt;
}
