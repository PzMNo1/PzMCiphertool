package com.ciphertool.controller;

import com.ciphertool.dto.ChatCompletionRequest;
import com.ciphertool.service.ChatProxyService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatProxyService chatProxyService;

    public ChatController(ChatProxyService chatProxyService) {
        this.chatProxyService = chatProxyService;
    }

    @PostMapping(value = "/completions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseBodyEmitter chat(@RequestBody ChatCompletionRequest request) {
        // Set timeout to 5 minutes (300000 ms)
        ResponseBodyEmitter emitter = new ResponseBodyEmitter(300000L);
        chatProxyService.streamChat(request, emitter);
        return emitter;
    }
}








