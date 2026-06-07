package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class McpLabResourceImportResult {

    private int accepted;

    private int rejected;

    private List<McpLabResource> resources = new ArrayList<>();

    private List<String> errors = new ArrayList<>();
}
