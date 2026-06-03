package com.ciphertool.service;

import java.util.Map;

public interface AgentEarthService {
    String run(String query, String taskContext, String preferredToolName, Map<String, Object> arguments, Integer maxAttempts);
}
