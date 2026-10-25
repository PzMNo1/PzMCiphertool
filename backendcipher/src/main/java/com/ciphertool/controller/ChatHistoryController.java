package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ChatHistoryRequest;
import com.ciphertool.service.AuthService;
import com.ciphertool.service.ChatHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatHistoryController {

    private final ChatHistoryService chatHistoryService;
    private final AuthService authService;

    @GetMapping("/history")
    public ApiResponse<Object> getHistory(@RequestParam String email) {
        return ApiResponse.success("Success", chatHistoryService.getHistory(email));
    }

    @PostMapping("/history")
    public ApiResponse<String> saveHistory(@RequestBody ChatHistoryRequest request) {
        chatHistoryService.saveHistory(request.getEmail(), request.getHistory());
        return ApiResponse.success("History saved");
    }

    @GetMapping("/history/me")
    public ApiResponse<Object> getMyHistory(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String account = authService.requireSessionAccount(authorization);
        return ApiResponse.success("Success", chatHistoryService.getHistory(account));
    }

    @PostMapping("/history/me")
    public ApiResponse<String> saveMyHistory(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody Map<String, Object> request) {
        String account = authService.requireSessionAccount(authorization);
        chatHistoryService.saveHistory(account, request.get("history"));
        return ApiResponse.success("History saved");
    }
}
