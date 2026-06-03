package com.ciphertool;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * CipherTool Backend Application
 */
@SpringBootApplication
public class CipherToolApplication {

    public static void main(String[] args) {
        loadDotEnvIfPresent();
        SpringApplication.run(CipherToolApplication.class, args);
    }

    private static void loadDotEnvIfPresent() {
        List<Path> candidates = List.of(
                Path.of(".env"),
                Path.of("..", ".env")
        );
        for (Path candidate : candidates) {
            if (Files.isRegularFile(candidate)) {
                loadDotEnv(candidate);
                return;
            }
        }
    }

    private static void loadDotEnv(Path path) {
        try {
            for (String rawLine : Files.readAllLines(path)) {
                String line = rawLine.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int separator = line.indexOf('=');
                if (separator <= 0) continue;
                String key = line.substring(0, separator).trim();
                String value = line.substring(separator + 1).trim();
                if (key.isEmpty() || System.getenv(key) != null || System.getProperty(key) != null) continue;
                System.setProperty(key, stripOptionalQuotes(value));
            }
        } catch (IOException ignored) {
            // Environment variables remain the source of truth if local .env loading fails.
        }
    }

    private static String stripOptionalQuotes(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }
}



















