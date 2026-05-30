package com.ciphertool.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ChatCompletionRequest {
    private String model;
    private List<Message> messages;
    private Boolean stream;
    private List<Tool> tools;  // 工具定义

    @Data
    public static class Message {
        private String role;
        private Object content;
        private String reasoning_content;  // 思维链内容(用于工具调用循环)
        private List<ToolCall> tool_calls; // 助手的工具调用
        private String tool_call_id;       // 工具结果消息的ID
    }

    @Data
    public static class Tool {
        private String type;  // "function"
        private Function function;
    }

    @Data
    public static class Function {
        private String name;
        private String description;
        private Map<String, Object> parameters;  // JSON Schema
    }

    @Data
    public static class ToolCall {
        private String id;
        private String type;
        private FunctionCall function;
    }

    @Data
    public static class FunctionCall {
        private String name;
        private String arguments;
    }
}
