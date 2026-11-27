package com.ciphertool.controller;

import com.ciphertool.dto.AgentJobRequest;
import com.ciphertool.dto.ApiResponse;
import com.ciphertool.service.AgentJobService;
import com.ciphertool.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 后台任务入口。所有请求必须带登录态，并且只能访问自己账号的任务。
 */
@RestController
@RequestMapping("/api/agent-jobs")
@CrossOrigin(origins = "*")
public class AgentJobController {

    private final AgentJobService agentJobService;
    private final AuthService authService;

    public AgentJobController(AgentJobService agentJobService, AuthService authService) {
        this.agentJobService = agentJobService;
        this.authService = authService;
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> submit(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody AgentJobRequest request) {
        String account = authService.requireSessionAccount(authorization);
        return ApiResponse.success("任务已提交", agentJobService.submit(account, authorization, request));
    }

    @GetMapping("/active")
    public ApiResponse<List<Map<String, Object>>> active(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String account = authService.requireSessionAccount(authorization);
        return ApiResponse.success("后台任务", agentJobService.active(account));
    }

    @GetMapping("/{jobId}")
    public ApiResponse<Map<String, Object>> get(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String jobId,
            @RequestParam(value = "after", defaultValue = "0") long after,
            @RequestParam(value = "contentVersion", defaultValue = "-1") long contentVersion,
            @RequestParam(value = "includeResult", defaultValue = "false") boolean includeResult) {
        String account = authService.requireSessionAccount(authorization);
        return ApiResponse.success("任务状态", agentJobService.get(account, jobId, after, contentVersion, includeResult));
    }

    @PostMapping("/{jobId}/cancel")
    public ApiResponse<Map<String, Object>> cancel(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String jobId) {
        String account = authService.requireSessionAccount(authorization);
        return ApiResponse.success("任务已取消", agentJobService.cancel(account, jobId));
    }

    @PostMapping("/{jobId}/ack")
    public ApiResponse<Void> acknowledge(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String jobId) {
        String account = authService.requireSessionAccount(authorization);
        agentJobService.acknowledge(account, jobId);
        return ApiResponse.success("任务已认领");
    }
}
