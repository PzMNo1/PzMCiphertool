package com.ciphertool.controller;

import com.ciphertool.service.AgentEarthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/agent-earth")
@CrossOrigin(origins = "*")
public class AgentEarthController {

    private final AgentEarthService agentEarthService;

    @Value("${agent-earth.enabled:false}")
    private boolean enabled;

    @Value("${agent-earth.api-key:}")
    private String apiKey;

    public AgentEarthController(AgentEarthService agentEarthService) {
        this.agentEarthService = agentEarthService;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        boolean configured = apiKey != null && !apiKey.isBlank();
        return Map.of(
                "success", true,
                "data", Map.of(
                        "enabled", enabled,
                        "configured", configured,
                        "available", enabled && configured
                )
        );
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/run")
    public Map<String, Object> run(@RequestBody Map<String, Object> request) {
        try {
            Map<String, Object> safeRequest = request == null ? Map.of() : request;
            String query = readString(safeRequest.get("query"));
            String taskContext = readString(safeRequest.get("task_context"));
            String preferredToolName = readString(safeRequest.get("preferred_tool_name"));
            Map<String, Object> arguments = Map.of();
            Object rawArguments = safeRequest.get("arguments");
            Object rawParams = safeRequest.get("params");
            if (rawArguments instanceof Map<?, ?> map) {
                arguments = (Map<String, Object>) map;
            } else if (rawParams instanceof Map<?, ?> map) {
                arguments = (Map<String, Object>) map;
            }
            Integer maxAttempts = safeRequest.get("max_attempts") instanceof Number number ? number.intValue() : 0;

            if (query.isBlank()) {
                return Map.of("success", false, "message", "query cannot be empty");
            }

            String data = agentEarthService.run(query, taskContext, preferredToolName, arguments, maxAttempts);
            return Map.of("success", true, "data", data);
        } catch (Exception e) {
            String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return Map.of("success", false, "message", "AgentEarth run failed: " + message);
        }
    }

    private String readString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
