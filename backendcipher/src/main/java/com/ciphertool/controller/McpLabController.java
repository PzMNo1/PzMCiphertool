package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.McpLabCheckRequest;
import com.ciphertool.dto.McpLabCheckResponse;
import com.ciphertool.dto.McpLabResource;
import com.ciphertool.dto.McpLabResourceBundle;
import com.ciphertool.dto.McpLabResourceImportResult;
import com.ciphertool.dto.McpLabResourceRequest;
import com.ciphertool.dto.McpLabResourceSearchRequest;
import com.ciphertool.service.McpLabCheckService;
import com.ciphertool.service.McpLabResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mcp-lab")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class McpLabController {

    private final McpLabCheckService mcpLabCheckService;
    private final McpLabResourceService mcpLabResourceService;

    @GetMapping("/resources")
    public ApiResponse<List<McpLabResource>> listResources(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.success("Resources loaded", mcpLabResourceService.list(category, query, limit));
    }

    @PostMapping("/resources")
    public ApiResponse<McpLabResource> addResource(@Valid @RequestBody McpLabResourceRequest request) {
        return ApiResponse.success("Resource added", mcpLabResourceService.addCommunityResource(request));
    }

    @GetMapping("/resources/export")
    public ApiResponse<McpLabResourceBundle> exportResources(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.success("Resource bundle exported", mcpLabResourceService.exportBundle(category, query, limit));
    }

    @PostMapping("/resources/import")
    public ApiResponse<McpLabResourceImportResult> importResources(@RequestBody McpLabResourceBundle bundle) {
        return ApiResponse.success("Resource bundle imported", mcpLabResourceService.importBundle(bundle));
    }

    @PostMapping("/resources/search")
    public ApiResponse<List<McpLabResource>> searchResources(@Valid @RequestBody McpLabResourceSearchRequest request) {
        return ApiResponse.success("Search candidates loaded", mcpLabResourceService.searchOnline(request));
    }

    @PostMapping("/check-resource")
    public ApiResponse<McpLabCheckResponse> checkResource(@Valid @RequestBody McpLabCheckRequest request) {
        return ApiResponse.success("Resource checked", mcpLabCheckService.checkResource(request));
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.success("MCP Lab checker is ready", mcpLabCheckService.health());
    }
}
