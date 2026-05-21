package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ChatHistoryRequest;
import com.ciphertool.service.ChatHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatHistoryController {

    private final ChatHistoryService chatHistoryService;

    @GetMapping("/history")
    public ApiResponse<Object> getHistory(@RequestParam String email) {
        return ApiResponse.success("Success", chatHistoryService.getHistory(email));
    }

    @PostMapping("/history")
    public ApiResponse<String> saveHistory(@RequestBody ChatHistoryRequest request) {
        chatHistoryService.saveHistory(request.getEmail(), request.getHistory());
        return ApiResponse.success("History saved");
    }
}








