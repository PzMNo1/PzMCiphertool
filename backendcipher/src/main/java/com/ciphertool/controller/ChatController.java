package com.ciphertool.controller;

import com.alibaba.fastjson2.JSON;
import com.ciphertool.dto.ChatCompletionRequest;
import com.ciphertool.dto.UsageStatus;
import com.ciphertool.service.ChatProxyService;
import com.ciphertool.service.UsageQuotaService;
import com.ciphertool.service.impl.ChatProxyServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatProxyService chatProxyService;
    private final UsageQuotaService usageQuotaService;

    public ChatController(ChatProxyService chatProxyService, UsageQuotaService usageQuotaService) {
        this.chatProxyService = chatProxyService;
        this.usageQuotaService = usageQuotaService;
    }

    @PostMapping(value = "/completions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseBodyEmitter chat(
            @RequestBody ChatCompletionRequest request,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestHeader(value = "X-Agent-Surface", required = false) String surface,
            @RequestHeader(value = "X-Agent-Turn", required = false) String turnId,
            HttpServletRequest servletRequest) {
        // Set timeout to 5 minutes (300000 ms)
        ResponseBodyEmitter emitter = new ResponseBodyEmitter(300000L);
        UsageStatus usage = usageQuotaService.consume(authorization, servletRequest, surface, turnId);
        if (!usage.isAllowed()) {
            sendUsageError(emitter, usage.getMessage());
            return emitter;
        }
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

    private void sendUsageError(ResponseBodyEmitter emitter, String message) {
        try {
            emitter.send("data: " + JSON.toJSONString(Map.of(
                    "error", message == null || message.isBlank() ? "使用次数已用完" : message
            )) + "\n\n");
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    }
}
