package com.ciphertool.service;

import com.ciphertool.dto.ChatCompletionRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

public interface ChatProxyService {
    void streamChat(ChatCompletionRequest request, ResponseBodyEmitter emitter);
}








