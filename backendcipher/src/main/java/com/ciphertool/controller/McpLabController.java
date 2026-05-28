package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.McpLabCheckRequest;
import com.ciphertool.dto.McpLabCheckResponse;
import com.ciphertool.service.McpLabCheckService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/mcp-lab")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class McpLabController {

    private final McpLabCheckService mcpLabCheckService;

    @PostMapping("/check-resource")
    public ApiResponse<McpLabCheckResponse> checkResource(@Valid @RequestBody McpLabCheckRequest request) {
        return ApiResponse.success("Resource checked", mcpLabCheckService.checkResource(request));
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.success("MCP Lab checker is ready", mcpLabCheckService.health());
    }
}
