package com.ciphertool.controller;

import com.ciphertool.dto.AgentRunDeleteRequest;
import com.ciphertool.dto.AgentRunEventAppendRequest;
import com.ciphertool.dto.AgentRunEventRecordResponse;
import com.ciphertool.dto.AgentRunRecordResponse;
import com.ciphertool.dto.AgentRunSaveRequest;
import com.ciphertool.dto.ApiResponse;
import com.ciphertool.service.AgentRunService;
import com.ciphertool.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/agent-runs")
@RequiredArgsConstructor
public class AgentRunController {

    private final AgentRunService agentRunService;
    private final AuthService authService;

    @PostMapping
    public ApiResponse<AgentRunRecordResponse> saveRun(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody AgentRunSaveRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("AgentRun saved", agentRunService.saveRun(ownerEmail, request));
    }

    @GetMapping("/{runId}")
    public ApiResponse<AgentRunRecordResponse> getRun(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String runId) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("AgentRun loaded", agentRunService.getRun(ownerEmail, runId));
    }

    @GetMapping
    public ApiResponse<List<AgentRunRecordResponse>> listRuns(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(required = false) String chatId,
            @RequestParam(defaultValue = "50") Integer limit) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("AgentRuns loaded", agentRunService.listRuns(ownerEmail, chatId, limit));
    }

    @PostMapping("/{runId}/events")
    public ApiResponse<List<AgentRunEventRecordResponse>> appendEvents(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String runId,
            @Valid @RequestBody AgentRunEventAppendRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("AgentRun events appended", agentRunService.appendEvents(ownerEmail, runId, request));
    }

    @GetMapping("/{runId}/events")
    public ApiResponse<List<AgentRunEventRecordResponse>> listEvents(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String runId,
            @RequestParam(defaultValue = "500") Integer limit) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("AgentRun events loaded", agentRunService.listEvents(ownerEmail, runId, limit));
    }

    @PostMapping("/delete")
    public ApiResponse<Integer> deleteRun(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody AgentRunDeleteRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        return ApiResponse.success("AgentRun deleted", agentRunService.deleteRun(ownerEmail, request.getRunId()));
    }

    @PostMapping("/delete-by-chat")
    public ApiResponse<Integer> deleteByChat(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody AgentRunDeleteRequest request) {
        String ownerEmail = authService.requireSessionEmail(authorization);
        List<String> chatIds = request.getChatIds() == null || request.getChatIds().isEmpty()
                ? Collections.singletonList(request.getChatId())
                : request.getChatIds();
        return ApiResponse.success("AgentRuns deleted", agentRunService.deleteByChat(ownerEmail, chatIds));
    }
}
