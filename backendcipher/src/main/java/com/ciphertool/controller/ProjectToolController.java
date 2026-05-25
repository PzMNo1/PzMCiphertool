package com.ciphertool.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/project")
@CrossOrigin(origins = "*")
public class ProjectToolController {
    private static final int MAX_FILE_CHARS = 24_000;
    private static final int MAX_SEARCH_RESULTS = 80;
    private static final Set<String> SKIPPED_DIRS = Set.of(".git", "target", "node_modules", "dist", "build", ".idea", ".vscode");

    private final Path projectRoot = resolveProjectRoot();

    @PostMapping("/list_files")
    public Map<String, Object> listFiles(@RequestBody Map<String, Object> request) {
        try {
            Path dir = resolveProjectPath(stringArg(request, "path", "."));
            int depth = intArg(request, "depth", 2);
            if (!Files.isDirectory(dir)) {
                return error("Path is not a directory");
            }

            List<Map<String, Object>> files = new ArrayList<>();
            try (Stream<Path> stream = Files.walk(dir, Math.max(0, Math.min(depth, 6)))) {
                stream
                        .filter(path -> !path.equals(dir))
                        .filter(this::isVisibleProjectPath)
                        .limit(300)
                        .forEach(path -> files.add(Map.of(
                                "path", projectRoot.relativize(path).toString().replace('\\', '/'),
                                "type", Files.isDirectory(path) ? "directory" : "file",
                                "size", safeSize(path)
                        )));
            }
            return ok(files);
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/read_file")
    public Map<String, Object> readFile(@RequestBody Map<String, Object> request) {
        try {
            Path file = resolveProjectPath(stringArg(request, "path", ""));
            if (!Files.isRegularFile(file)) {
                return error("Path is not a file");
            }
            String content = Files.readString(file, StandardCharsets.UTF_8);
            boolean truncated = content.length() > MAX_FILE_CHARS;
            if (truncated) {
                content = content.substring(0, MAX_FILE_CHARS);
            }
            return ok(Map.of(
                    "path", projectRoot.relativize(file).toString().replace('\\', '/'),
                    "content", content,
                    "truncated", truncated
            ));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/file_info")
    public Map<String, Object> fileInfo(@RequestBody Map<String, Object> request) {
        try {
            Path path = resolveProjectPath(stringArg(request, "path", ""));
            if (!Files.exists(path)) {
                return error("Path does not exist");
            }
            return ok(Map.of(
                    "path", projectRoot.relativize(path).toString().replace('\\', '/'),
                    "type", Files.isDirectory(path) ? "directory" : "file",
                    "size", safeSize(path),
                    "modified", DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(
                            Instant.ofEpochMilli(Files.getLastModifiedTime(path).toMillis()).atZone(ZoneId.systemDefault()))
            ));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/search_files")
    public Map<String, Object> searchFiles(@RequestBody Map<String, Object> request) {
        try {
            String query = stringArg(request, "query", "");
            if (query.isBlank()) {
                return error("query is required");
            }
            Path start = resolveProjectPath(stringArg(request, "path", "."));
            if (!Files.isDirectory(start)) {
                return error("path must be a directory");
            }

            String needle = query.toLowerCase(Locale.ROOT);
            List<Map<String, Object>> results = new ArrayList<>();
            try (Stream<Path> stream = Files.walk(start, 8)) {
                List<Path> candidates = stream
                        .filter(Files::isRegularFile)
                        .filter(this::isVisibleProjectPath)
                        .filter(this::isTextLike)
                        .sorted(Comparator.comparing(Path::toString))
                        .toList();

                for (Path file : candidates) {
                    List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
                    for (int i = 0; i < lines.size(); i++) {
                        String line = lines.get(i);
                        if (line.toLowerCase(Locale.ROOT).contains(needle)) {
                            results.add(Map.of(
                                    "path", projectRoot.relativize(file).toString().replace('\\', '/'),
                                    "line", i + 1,
                                    "text", trim(line, 260)
                            ));
                            if (results.size() >= MAX_SEARCH_RESULTS) {
                                return ok(Map.of("matches", results, "truncated", true));
                            }
                        }
                    }
                }
            }
            return ok(Map.of("matches", results, "truncated", false));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/propose_patch")
    public Map<String, Object> proposePatch(@RequestBody Map<String, Object> request) {
        String path = stringArg(request, "path", "");
        String summary = stringArg(request, "summary", "");
        String patch = stringArg(request, "patch", "");
        String result = "Proposed patch only. Review before applying.\n"
                + "Path: " + path + "\n"
                + "Summary: " + summary + "\n\n"
                + patch;
        return ok(result);
    }

    @PostMapping("/run_command")
    public Map<String, Object> runCommand(@RequestBody Map<String, Object> request) {
        try {
            String command = stringArg(request, "command", "");
            List<String> args = switch (command) {
                case "backend_test" -> List.of("mvn.cmd", "test");
                case "backend_build" -> List.of("mvn.cmd", "package", "-DskipTests");
                default -> null;
            };
            if (args == null) {
                return error("Unsupported command. Allowed: backend_test, backend_build");
            }
            Path backendDir = projectRoot.resolve("backendcipher").normalize();
            Path outputFile = Files.createTempFile("pzm-agent-command-", ".log");
            try {
                ProcessBuilder pb = new ProcessBuilder(args);
                pb.directory(backendDir.toFile());
                pb.redirectErrorStream(true);
                pb.redirectOutput(outputFile.toFile());
                Process process = pb.start();
                boolean finished = process.waitFor(90, TimeUnit.SECONDS);
                if (!finished) {
                    process.destroyForcibly();
                    return error("Command timed out after 90 seconds");
                }
                String output = Files.readString(outputFile, StandardCharsets.UTF_8);
                if (output.length() > 16_000) {
                    output = output.substring(0, 16_000) + "\n[Output truncated to 16000 characters]";
                }
                return ok(Map.of("exit_code", process.exitValue(), "output", output));
            } finally {
                Files.deleteIfExists(outputFile);
            }
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    private Path resolveProjectPath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            throw new IllegalArgumentException("path is required");
        }
        Path resolved = projectRoot.resolve(rawPath).normalize();
        if (!resolved.startsWith(projectRoot)) {
            throw new IllegalArgumentException("Path escapes project root");
        }
        return resolved;
    }

    private Path resolveProjectRoot() {
        Path cwd = Paths.get("").toAbsolutePath().normalize();
        if ("backendcipher".equalsIgnoreCase(cwd.getFileName().toString()) && cwd.getParent() != null) {
            return cwd.getParent();
        }
        return cwd;
    }

    private boolean isVisibleProjectPath(Path path) {
        Path relative = projectRoot.relativize(path.normalize());
        for (Path part : relative) {
            if (SKIPPED_DIRS.contains(part.toString())) {
                return false;
            }
        }
        return true;
    }

    private boolean isTextLike(Path path) {
        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        return name.endsWith(".java") || name.endsWith(".js") || name.endsWith(".css")
                || name.endsWith(".html") || name.endsWith(".md") || name.endsWith(".json")
                || name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".xml")
                || name.endsWith(".txt") || name.endsWith(".properties");
    }

    private long safeSize(Path path) {
        try {
            return Files.isRegularFile(path) ? Files.size(path) : 0L;
        } catch (Exception e) {
            return -1L;
        }
    }

    private String stringArg(Map<String, Object> request, String key, String fallback) {
        Object value = request.get(key);
        return value == null ? fallback : String.valueOf(value);
    }

    private int intArg(Map<String, Object> request, String key, int fallback) {
        Object value = request.get(key);
        if (value instanceof Number number) return number.intValue();
        try {
            return value == null ? fallback : Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
            return fallback;
        }
    }

    private String trim(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max) + "...";
    }

    private Map<String, Object> ok(Object data) {
        return Map.of("success", true, "data", data);
    }

    private Map<String, Object> error(String message) {
        return Map.of("success", false, "message", message == null ? "Unknown error" : message);
    }
}
