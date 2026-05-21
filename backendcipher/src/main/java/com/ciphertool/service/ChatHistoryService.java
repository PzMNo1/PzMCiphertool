package com.ciphertool.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.Collections;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatHistoryService {

    private final ObjectMapper objectMapper;
    private static final String HISTORY_DIR = "modelchathistory";

    public void saveHistory(String email, Object history) {
        try {
            File dir = new File(HISTORY_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }
            File file = new File(dir, email + ".json");
            objectMapper.writeValue(file, history);
            log.info("Chat history saved for {}", email);
        } catch (IOException e) {
            log.error("Failed to save chat history for {}", email, e);
            throw new RuntimeException("Save history failed");
        }
    }

    public Object getHistory(String email) {
        try {
            File file = new File(HISTORY_DIR, email + ".json");
            if (!file.exists()) {
                return Collections.emptyMap();
            }
            return objectMapper.readValue(file, Object.class);
        } catch (IOException e) {
            log.error("Failed to read chat history for {}", email, e);
            return Collections.emptyMap();
        }
    }
}








