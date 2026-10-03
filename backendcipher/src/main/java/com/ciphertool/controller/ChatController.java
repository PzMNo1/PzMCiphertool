package com.ciphertool.controller;

import com.ciphertool.dto.ChatCompletionRequest;
import com.ciphertool.service.ChatProxyService;
import com.ciphertool.service.impl.ChatProxyServiceImpl;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.util.Map;

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

    /**
     * 诊断接口：返回当前生效的 LLM 代理配置（key 已打码）。
     * 用于快速判断 key 与 base-url 是否配套，避免只看到一个裸的 401。
     */
    @GetMapping("/config")
    public Map<String, Object> config() {
        if (chatProxyService instanceof ChatProxyServiceImpl impl) {
            return Map.of("success", true, "data", impl.describeConfiguration());
        }
        return Map.of("success", false, "message", "Configuration introspection is not available.");
    }
}








