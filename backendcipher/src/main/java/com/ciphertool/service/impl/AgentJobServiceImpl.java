package com.ciphertool.service.impl;

import com.ciphertool.dto.AgentJobRequest;
import com.ciphertool.dto.ImageGenerationRequest;
import com.ciphertool.dto.ImageGenerationResponse;
import com.ciphertool.dto.VideoGenerationRequest;
import com.ciphertool.dto.VideoGenerationResponse;
import com.ciphertool.service.AgentJobService;
import com.ciphertool.service.ImageGenerationService;
import com.ciphertool.service.VideoGenerationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * 后台任务实现。
 *
 * <p>磁盘目录即事实来源，进程重启后仍能恢复：</p>
 * <pre>
 * backendcipher/agent-jobs/&lt;jobId&gt;/
 *   job.json      任务元数据（账号、会话、消息、是否已认领），只由 Java 写
 *   payload.json  Agent 运行参数，只在启动 Node 进程前短暂存在
 *   auth.txt      当前会话 Authorization，只在启动 Node 进程前短暂存在
 *   state.json    任务快照：Agent 由 Node 进程写，图片/视频由 Java 写
 *   worker.log    Agent 子进程 stdout/stderr
 * </pre>
 *
 * <p>页面关闭只影响浏览器轮询，不影响这里的任务；重新进入页面后调用
 * {@code /api/agent-jobs/active} 就能拿回所有仍在跑/刚跑完但还没认领的任务。</p>
 */
@Slf4j
@Service
public class AgentJobServiceImpl implements AgentJobService {

    private static final String STATE_VERSION = "agent-job-state-v1";
    private static final Set<String> KINDS = Set.of("agent", "image", "video");
    private static final Set<String> TERMINAL = Set.of("completed", "failed", "cancelled");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME.withZone(ZoneId.systemDefault());
    private static final long MAX_JOB_AGE_MS = 24L * 60 * 60 * 1000;

    private final ObjectMapper objectMapper;
    private final ImageGenerationService imageGenerationService;
    private final VideoGenerationService videoGenerationService;

    private final Path rootDir;
    private final Path workerScript;
    private final Path frontendRoot;
    private final String configuredNodePath;
    private final String workerModel;
    private final String apiBase;
    private final long workerTimeoutMs;
    private final int retentionDays;
    private final int maxJobs;
    private final long staleMillis;

    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final ExecutorService imageExecutor = Executors.newFixedThreadPool(3);
    private final ExecutorService videoExecutor = Executors.newFixedThreadPool(2);
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    public AgentJobServiceImpl(
            ObjectMapper objectMapper,
            ImageGenerationService imageGenerationService,
            VideoGenerationService videoGenerationService,
            @Value("${agent.jobs.dir:agent-jobs}") String jobsDir,
            @Value("${agent.worker.script:agentworker/run-job.js}") String workerScript,
            @Value("${agent.worker.frontend-root:../frontendciphertool}") String frontendRoot,
            @Value("${agent.worker.node:}") String nodePath,
            @Value("${agent.worker.model:}") String workerModel,
            @Value("${server.port:8080}") int serverPort,
            @Value("${agent.worker.timeout-ms:1800000}") long workerTimeoutMs,
            @Value("${agent.jobs.retention-days:7}") int retentionDays,
            @Value("${agent.jobs.max:300}") int maxJobs,
            @Value("${agent.jobs.stale-seconds:900}") long staleSeconds) {
        this.objectMapper = objectMapper;
        this.imageGenerationService = imageGenerationService;
        this.videoGenerationService = videoGenerationService;
        this.rootDir = Path.of(jobsDir).toAbsolutePath().normalize();
        this.workerScript = Path.of(workerScript).toAbsolutePath().normalize();
        this.frontendRoot = Path.of(frontendRoot).toAbsolutePath().normalize();
        this.configuredNodePath = nodePath == null ? "" : nodePath.trim();
        this.workerModel = workerModel == null ? "" : workerModel.trim();
        this.apiBase = "http://127.0.0.1:" + Math.max(1, serverPort);
        this.workerTimeoutMs = Math.max(60_000L, workerTimeoutMs);
        this.retentionDays = Math.max(1, retentionDays);
        this.maxJobs = Math.max(20, maxJobs);
        this.staleMillis = Math.max(120_000L, staleSeconds * 1000L);
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootDir);
        } catch (IOException e) {
            log.error("Failed to create agent job directory {}", rootDir, e);
        }
        loadExistingJobs();
        scheduler.scheduleWithFixedDelay(this::refreshVideoJobs, 3, 4, TimeUnit.SECONDS);
        scheduler.scheduleWithFixedDelay(this::reapAndCleanup, 60, 60, TimeUnit.SECONDS);
        log.info("Agent job store ready: dir={}, workerScript={}, frontendRoot={}, apiBase={}",
                rootDir, workerScript, frontendRoot, apiBase);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
        imageExecutor.shutdownNow();
        videoExecutor.shutdownNow();
        jobs.values().forEach(job -> {
            Process process = job.process;
            if (process != null && process.isAlive()) {
                process.destroy();
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* 提交                                                                */
    /* ------------------------------------------------------------------ */

    @Override
    public Map<String, Object> submit(String account, String authorization, AgentJobRequest request) {
        String kind = normalizeKind(request.getKind());
        String chatId = trimTo(request.getChatId(), 160);
        String messageId = trimTo(request.getMessageId(), 160);
        if (chatId.isBlank() || messageId.isBlank()) {
            throw new IllegalArgumentException("会话或消息 ID 不能为空");
        }
        JsonNode payload = request.getPayload() == null ? objectMapper.createObjectNode() : request.getPayload();
        ensurePayload(kind, payload);

        String jobId = "job_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        Job job = new Job(jobId, kind, account, chatId, messageId, promptPreview(kind, payload), rootDir.resolve(jobId));
        try {
            Files.createDirectories(job.dir);
        } catch (IOException e) {
            throw new IllegalStateException("创建后台任务目录失败", e);
        }
        synchronized (job.lock) {
            writeJobJson(job);
            writeFreshState(job, kind);
            jobs.put(jobId, job);
        }

        try {
            switch (kind) {
                case "agent" -> startAgentJob(job, authorization, payload);
                case "image" -> scheduleImageJob(job, payload);
                case "video" -> scheduleVideoJob(job, payload);
                default -> throw new IllegalArgumentException("不支持的任务类型: " + kind);
            }
        } catch (RuntimeException e) {
            log.error("Failed to start agent job {}", jobId, e);
            failJob(job, "任务启动失败: " + rootMessage(e));
        }
        return view(job, false, 0, -1, false);
    }

    private void ensurePayload(String kind, JsonNode payload) {
        switch (kind) {
            case "agent" -> {
                String userMessage = text(payload, "userMessage");
                if (userMessage.isBlank()) {
                    throw new IllegalArgumentException("Agent 任务缺少 userMessage");
                }
                if (!payload.path("messages").isArray() || payload.path("messages").isEmpty()) {
                    throw new IllegalArgumentException("Agent 任务缺少 messages");
                }
            }
            case "image" -> {
                if (text(payload, "prompt").isBlank()) {
                    throw new IllegalArgumentException("图片生成提示不能为空");
                }
            }
            case "video" -> {
                if (text(payload, "prompt").isBlank()) {
                    throw new IllegalArgumentException("视频创作提示不能为空");
                }
            }
            default -> throw new IllegalArgumentException("不支持的任务类型: " + kind);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Agent：独立 Node 进程复用前端 AgentRuntime                           */
    /* ------------------------------------------------------------------ */

    private void startAgentJob(Job job, String authorization, JsonNode payload) {
        Path payloadFile = job.dir.resolve("payload.json");
        Path authFile = job.dir.resolve("auth.txt");
        try {
            Files.writeString(payloadFile, objectMapper.writeValueAsString(payload), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            try {
                restrictPermissions(payloadFile);
            } catch (Exception ignored) {
            }
            String auth = authorization == null ? "" : authorization.trim();
            Files.writeString(authFile, auth, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            try {
                restrictPermissions(authFile);
            } catch (Exception ignored) {
            }

            updateState(job, state -> {
                state.put("status", "running");
                state.put("phase", "plan");
                state.put("startedAt", nowIso());
                state.put("error", "");
            });

            List<String> command = new ArrayList<>();
            command.add(resolveNodeBinary());
            command.add(workerScript.toString());
            command.add(job.dir.toString());

            ProcessBuilder builder = new ProcessBuilder(command);
            builder.directory(rootDir.toFile());
            builder.redirectErrorStream(true);
            builder.redirectOutput(ProcessBuilder.Redirect.appendTo(job.dir.resolve("worker.log").toFile()));
            Map<String, String> env = builder.environment();
            env.put("AGENT_WORKER_FRONTEND_ROOT", frontendRoot.toString());
            env.put("CIPHERTOOL_API_BASE", apiBase);
            env.put("AGENT_WORKER_TIMEOUT_MS", String.valueOf(workerTimeoutMs));
            if (!workerModel.isBlank()) {
                env.put("AGENT_WORKER_MODEL", workerModel);
            }
            env.putIfAbsent("PATH", "/usr/local/bin:/usr/bin:/bin");
            Process process = builder.start();
            job.process = process;

            Thread waiter = new Thread(() -> {
                int exit = -1;
                try {
                    exit = process.waitFor();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    onAgentProcessExit(job, exit);
                }
            }, "agent-job-" + job.id);
            waiter.setDaemon(true);
            waiter.start();
            log.info("Agent job {} started (pid={})", job.id, process.pid());
        } catch (Exception e) {
            cleanupSensitiveFiles(job);
            throw new IllegalStateException("启动后台 Agent 进程失败: " + rootMessage(e), e);
        }
    }

    private void onAgentProcessExit(Job job, int exitCode) {
        cleanupSensitiveFiles(job);
        ObjectNode state = readState(job, true);
        String status = state == null ? "" : state.path("status").asText("");
        if (!TERMINAL.contains(status)) {
            failJob(job, exitCode == 0
                    ? "后台 Agent 进程结束但没有写入结果"
                    : "后台 Agent 进程异常退出（exit=" + exitCode + "）");
        }
        log.info("Agent job {} finished, exit={}, status={}", job.id, exitCode, status);
    }

    /* ------------------------------------------------------------------ */
    /* 图片：后台线程直接调用现有 ImageGenerationService                     */
    /* ------------------------------------------------------------------ */

    private void scheduleImageJob(Job job, JsonNode payload) {
        updateState(job, state -> {
            state.put("status", "running");
            state.put("phase", "connecting");
            state.put("startedAt", nowIso());
        });
        Future<?> future = imageExecutor.submit(() -> {
            try {
                ImageGenerationRequest request = buildImageRequest(payload);
                updateState(job, state -> state.put("phase", "generating"));
                ImageGenerationResponse response = imageGenerationService.generate(request);
                ObjectNode result = objectMapper.createObjectNode();
                result.put("content", response.getContent() == null ? "已生成图片。" : response.getContent());
                ArrayNode images = result.putArray("images");
                if (response.getImages() != null) {
                    for (ImageGenerationResponse.ImageItem item : response.getImages()) {
                        if (item == null || item.getUrl() == null || item.getUrl().isBlank()) continue;
                        ObjectNode image = images.addObject();
                        image.put("url", item.getUrl());
                        image.put("mimeType", item.getMimeType() == null ? "image/png" : item.getMimeType());
                        image.put("revisedPrompt", item.getRevisedPrompt() == null ? "" : item.getRevisedPrompt());
                    }
                }
                completeJob(job, result);
            } catch (Exception e) {
                failJob(job, "图片生成失败: " + rootMessage(e));
            }
        });
        job.future = future;
    }

    private ImageGenerationRequest buildImageRequest(JsonNode payload) {
        ImageGenerationRequest request = new ImageGenerationRequest();
        request.setPrompt(text(payload, "prompt"));
        request.setModel(blankToNull(text(payload, "model")));
        request.setSize(blankToNull(text(payload, "size")));
        JsonNode n = payload.get("n");
        if (n != null && n.isNumber()) {
            request.setN(Math.max(1, Math.min(4, n.asInt())));
        }
        String reference = text(payload, "referenceImage");
        if (!reference.isBlank()) {
            request.setReferenceImage(reference);
        }
        return request;
    }

    /* ------------------------------------------------------------------ */
    /* 视频：提交上游后由调度线程持续轮询，页面关掉也会把成片落到任务里       */
    /* ------------------------------------------------------------------ */

    private void scheduleVideoJob(Job job, JsonNode payload) {
        updateState(job, state -> {
            state.put("status", "running");
            state.put("phase", "submitting");
            state.put("startedAt", nowIso());
        });
        Future<?> future = videoExecutor.submit(() -> {
            try {
                VideoGenerationRequest request = buildVideoRequest(payload);
                VideoGenerationResponse submitted = videoGenerationService.submit(request);
                if (submitted == null || submitted.getTaskId() == null || submitted.getTaskId().isBlank()) {
                    throw new IllegalStateException("视频任务创建接口没有返回 task_id");
                }
                updateState(job, state -> {
                    state.put("taskId", submitted.getTaskId());
                    state.put("phase", "queued");
                    state.put("status", "running");
                    if (submitted.getProgress() != null) state.put("progress", submitted.getProgress());
                });
                refreshVideoJob(job);
            } catch (Exception e) {
                failJob(job, "视频创作失败: " + rootMessage(e));
            }
        });
        job.future = future;
    }

    private VideoGenerationRequest buildVideoRequest(JsonNode payload) {
        VideoGenerationRequest request = new VideoGenerationRequest();
        request.setPrompt(text(payload, "prompt"));
        String aspect = text(payload, "aspectRatio");
        if (!aspect.isBlank()) request.setAspectRatio(aspect);
        return request;
    }

    private void refreshVideoJobs() {
        for (Job job : jobs.values()) {
            if (!"video".equals(job.kind)) continue;
            ObjectNode state = readState(job, false);
            if (state == null) continue;
            String status = state.path("status").asText("");
            if (TERMINAL.contains(status)) continue;
            String taskId = state.path("taskId").asText("");
            if (taskId.isBlank()) continue;
            if (!job.polling.compareAndSet(false, true)) continue;
            try {
                refreshVideoJob(job);
            } finally {
                job.polling.set(false);
            }
        }
    }

    private void refreshVideoJob(Job job) {
        ObjectNode state = readState(job, true);
        if (state == null) return;
        String taskId = state.path("taskId").asText("");
        if (taskId.isBlank()) return;
        try {
            VideoGenerationResponse response = videoGenerationService.status(taskId);
            if (response == null) return;
            String upstreamStatus = response.getStatus() == null ? "" : response.getStatus().toLowerCase(Locale.ROOT);
            int progress = response.getProgress() == null ? 0 : Math.max(0, Math.min(100, response.getProgress()));
            if ("completed".equals(upstreamStatus)) {
                ObjectNode result = objectMapper.createObjectNode();
                result.put("content", "已生成视频。");
                result.put("taskId", taskId);
                ArrayNode videos = result.putArray("videos");
                if (response.getVideos() != null) {
                    for (VideoGenerationResponse.VideoItem item : response.getVideos()) {
                        if (item == null || item.getUrl() == null || item.getUrl().isBlank()) continue;
                        ObjectNode video = videos.addObject();
                        video.put("url", item.getUrl());
                        video.put("mimeType", item.getMimeType() == null ? "video/mp4" : item.getMimeType());
                        if (item.getDurationSeconds() != null) video.put("durationSeconds", item.getDurationSeconds());
                        video.put("aspectRatio", item.getAspectRatio() == null ? "" : item.getAspectRatio());
                    }
                }
                completeJob(job, result);
                return;
            }
            if ("failed".equals(upstreamStatus) || "error".equals(upstreamStatus)) {
                failJob(job, response.getErrorMessage() == null || response.getErrorMessage().isBlank()
                        ? "视频生成失败" : response.getErrorMessage());
                return;
            }
            updateState(job, node -> {
                node.put("phase", normalizeVideoPhase(upstreamStatus));
                node.put("progress", progress);
                node.put("status", "running");
            });
        } catch (Exception e) {
            job.videoErrors.incrementAndGet();
            if (job.videoErrors.get() >= 6) {
                failJob(job, "视频状态查询连续失败: " + rootMessage(e));
            } else {
                log.warn("Video job {} status query failed ({}): {}", job.id, job.videoErrors.get(), rootMessage(e));
            }
        }
    }

    private String normalizeVideoPhase(String status) {
        if (status == null || status.isBlank()) return "processing";
        return switch (status) {
            case "queued", "pending", "submitted" -> "queued";
            case "running", "processing", "generating" -> "processing";
            default -> "processing";
        };
    }

    /* ------------------------------------------------------------------ */
    /* 查询 / 取消 / 认领                                                  */
    /* ------------------------------------------------------------------ */

    @Override
    public Map<String, Object> get(String account, String jobId, long after, long knownContentVersion, boolean includeResult) {
        Job job = requireJob(account, jobId);
        return view(job, true, Math.max(0, after), knownContentVersion, includeResult);
    }

    @Override
    public List<Map<String, Object>> active(String account) {
        long cutoff = System.currentTimeMillis() - MAX_JOB_AGE_MS;
        List<Map<String, Object>> result = new ArrayList<>();
        for (Job job : jobs.values()) {
            if (!Objects.equals(job.account, account)) continue;
            ObjectNode state = readState(job, false);
            String status = state == null ? "queued" : state.path("status").asText("queued");
            boolean terminal = TERMINAL.contains(status);
            if (terminal && job.acknowledged) continue;
            if (terminal && job.createdAt < cutoff) continue;
            result.add(view(job, false, 0, -1, false));
        }
        result.sort(Comparator.comparingLong(item -> -asLong(item.get("createdAt"))));
        if (result.size() > 50) {
            return new ArrayList<>(result.subList(0, 50));
        }
        return result;
    }

    @Override
    public Map<String, Object> cancel(String account, String jobId) {
        Job job = requireJob(account, jobId);
        ObjectNode state = readState(job, false);
        String status = state == null ? "" : state.path("status").asText("");
        if (TERMINAL.contains(status)) {
            return view(job, true, 0, -1, true);
        }
        try {
            Files.writeString(job.dir.resolve("cancel"), "1", StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
        } catch (IOException ignored) {
        }
        if (job.process != null && job.process.isAlive()) {
            scheduler.schedule(() -> {
                if (job.process != null && job.process.isAlive()) {
                    job.process.destroy();
                }
            }, 2, TimeUnit.SECONDS);
        }
        if (job.future != null) {
            job.future.cancel(true);
        }
        updateState(job, node -> {
            node.put("status", "cancelled");
            node.put("error", "任务已取消");
        });
        cleanupSensitiveFiles(job);
        return view(job, true, 0, -1, true);
    }

    @Override
    public void acknowledge(String account, String jobId) {
        Job job = requireJob(account, jobId);
        synchronized (job.lock) {
            job.acknowledged = true;
            writeJobJson(job);
        }
        cleanupSensitiveFiles(job);
    }

    private Job requireJob(String account, String jobId) {
        if (jobId == null || jobId.isBlank()) {
            throw new IllegalArgumentException("任务 ID 不能为空");
        }
        Job job = jobs.get(jobId.trim());
        if (job == null || !Objects.equals(job.account, account)) {
            throw new IllegalArgumentException("任务不存在或无权访问");
        }
        return job;
    }

    /* ------------------------------------------------------------------ */
    /* 状态与视图                                                          */
    /* ------------------------------------------------------------------ */

    private Map<String, Object> view(Job job, boolean includeContent, long after, long knownContentVersion, boolean includeResult) {
        ObjectNode state = readState(job, false);
        String status = state == null ? "queued" : state.path("status").asText("queued");
        long contentVersion = state == null ? 0 : state.path("contentVersion").asLong(0);
        long seq = state == null ? 0 : state.path("seq").asLong(0);
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", job.id);
        view.put("kind", job.kind);
        view.put("status", status);
        view.put("phase", state == null ? "queued" : state.path("phase").asText(""));
        view.put("progress", state == null ? 0 : state.path("progress").asInt(0));
        view.put("chatId", job.chatId);
        view.put("messageId", job.messageId);
        view.put("promptPreview", job.promptPreview);
        view.put("createdAt", job.createdAt);
        view.put("updatedAt", state == null ? job.updatedAt : state.path("updatedAt").asLong(job.updatedAt));
        view.put("acknowledged", job.acknowledged);
        view.put("seq", seq);
        view.put("contentVersion", contentVersion);
        view.put("error", state == null ? "" : state.path("error").asText(""));
        if (state != null) {
            String taskId = state.path("taskId").asText("");
            if (!taskId.isBlank()) view.put("taskId", taskId);
        }
        if (includeContent && (knownContentVersion < 0 || contentVersion != knownContentVersion)) {
            view.put("content", state == null ? "" : state.path("content").asText(""));
        }
        if (includeContent) {
            view.put("events", eventsAfter(state, after));
        }
        boolean terminal = TERMINAL.contains(status);
        if (terminal && (includeResult || includeContent)) {
            JsonNode result = state == null ? null : state.get("result");
            view.put("result", result == null ? objectMapper.createObjectNode() : result);
        }
        return view;
    }

    private List<JsonNode> eventsAfter(ObjectNode state, long after) {
        List<JsonNode> events = new ArrayList<>();
        if (state == null) return events;
        JsonNode array = state.get("events");
        if (array == null || !array.isArray()) return events;
        for (JsonNode event : array) {
            if (event.path("seq").asLong(0) > after) {
                events.add(event);
            }
        }
        return events;
    }

    private ObjectNode readState(Job job, boolean force) {
        Path file = job.dir.resolve("state.json");
        try {
            if (!Files.isRegularFile(file)) {
                job.cachedState = null;
                return null;
            }
            long size = Files.size(file);
            long modified = Files.getLastModifiedTime(file).toMillis();
            if (!force && job.cachedState != null && size == job.cachedSize && modified == job.cachedMtime) {
                return job.cachedState;
            }
            ObjectNode parsed = (ObjectNode) objectMapper.readTree(file.toFile());
            job.cachedState = parsed;
            job.cachedSize = size;
            job.cachedMtime = modified;
            return parsed;
        } catch (Exception e) {
            if (job.cachedState != null) return job.cachedState;
            log.warn("Failed to read state for job {}: {}", job.id, rootMessage(e));
            return null;
        }
    }

    private void writeFreshState(Job job, String kind) {
        ObjectNode state = objectMapper.createObjectNode();
        state.put("version", STATE_VERSION);
        state.put("status", "queued");
        state.put("phase", "queued");
        state.put("seq", 0);
        state.put("contentVersion", 0);
        state.put("content", "");
        state.put("events", objectMapper.createArrayNode());
        state.put("error", "");
        state.put("progress", 0);
        state.put("startedAt", "");
        state.put("updatedAt", nowIso());
        if ("image".equals(kind)) state.put("progress", 0);
        writeStateFile(job, state);
    }

    private void updateState(Job job, Consumer<ObjectNode> mutator) {
        synchronized (job.lock) {
            ObjectNode state = readState(job, true);
            if (state == null) {
                state = objectMapper.createObjectNode();
                state.put("version", STATE_VERSION);
                state.put("events", objectMapper.createArrayNode());
            }
            mutator.accept(state);
            state.put("updatedAt", nowIso());
            writeStateFile(job, state);
        }
    }

    private void writeStateFile(Job job, ObjectNode state) {
        Path file = job.dir.resolve("state.json");
        Path tmp = job.dir.resolve("state.json.tmp");
        try {
            Files.writeString(tmp, objectMapper.writeValueAsString(state), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            try {
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (Exception moveError) {
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING);
            }
            job.cachedState = state;
            job.cachedSize = Files.size(file);
            job.cachedMtime = Files.getLastModifiedTime(file).toMillis();
            job.updatedAt = System.currentTimeMillis();
        } catch (IOException e) {
            log.warn("Failed to write state for job {}: {}", job.id, rootMessage(e));
        }
    }

    private void completeJob(Job job, ObjectNode result) {
        updateState(job, state -> {
            state.put("status", "completed");
            state.put("phase", "completed");
            state.put("progress", 100);
            state.put("result", result);
            state.put("error", "");
            String content = result.path("content").asText("");
            if (!content.isBlank()) {
                state.put("content", content);
                state.put("contentVersion", state.path("contentVersion").asLong(0) + 1);
            }
        });
        cleanupSensitiveFiles(job);
        log.info("Agent job {} completed ({})", job.id, job.kind);
    }

    private void failJob(Job job, String error) {
        updateState(job, state -> {
            state.put("status", "failed");
            state.put("phase", "failed");
            state.put("error", trimTo(error, 2000));
        });
        cleanupSensitiveFiles(job);
        log.warn("Agent job {} failed: {}", job.id, error);
    }

    /* ------------------------------------------------------------------ */
    /* 持久化 / 恢复 / 清理                                                */
    /* ------------------------------------------------------------------ */

    private void loadExistingJobs() {
        if (!Files.isDirectory(rootDir)) return;
        try (var stream = Files.list(rootDir)) {
            stream.filter(Files::isDirectory).forEach(dir -> {
                Path meta = dir.resolve("job.json");
                if (!Files.isRegularFile(meta)) return;
                try {
                    JsonNode node = objectMapper.readTree(meta.toFile());
                    String id = node.path("id").asText("");
                    String kind = node.path("kind").asText("");
                    if (id.isBlank() || !KINDS.contains(kind)) return;
                    Job job = new Job(
                            id,
                            kind,
                            node.path("account").asText(""),
                            node.path("chatId").asText(""),
                            node.path("messageId").asText(""),
                            node.path("promptPreview").asText(""),
                            dir);
                    job.createdAt = node.path("createdAt").asLong(System.currentTimeMillis());
                    job.updatedAt = node.path("updatedAt").asLong(job.createdAt);
                    job.acknowledged = node.path("acknowledged").asBoolean(false);
                    jobs.put(id, job);
                } catch (Exception e) {
                    log.warn("Skip unreadable agent job metadata {}: {}", meta, rootMessage(e));
                }
            });
        } catch (IOException e) {
            log.warn("Failed to scan agent job directory: {}", rootMessage(e));
        }
        log.info("Loaded {} agent jobs from {}", jobs.size(), rootDir);
    }

    private void writeJobJson(Job job) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("id", job.id);
        node.put("kind", job.kind);
        node.put("account", job.account);
        node.put("chatId", job.chatId);
        node.put("messageId", job.messageId);
        node.put("promptPreview", job.promptPreview);
        node.put("createdAt", job.createdAt);
        node.put("updatedAt", System.currentTimeMillis());
        node.put("acknowledged", job.acknowledged);
        Path file = job.dir.resolve("job.json");
        Path tmp = job.dir.resolve("job.json.tmp");
        try {
            Files.writeString(tmp, objectMapper.writeValueAsString(node), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            try {
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (Exception moveError) {
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            log.warn("Failed to write job metadata {}: {}", job.id, rootMessage(e));
        }
    }

    private void reapAndCleanup() {
        long now = System.currentTimeMillis();
        for (Job job : jobs.values()) {
            ObjectNode state = readState(job, false);
            String status = state == null ? "queued" : state.path("status").asText("queued");
            if (!TERMINAL.contains(status)) {
                long last = job.lastStateModified();
                if (last > 0 && now - last > staleMillis) {
                    if (job.process != null && job.process.isAlive()) {
                        job.process.destroy();
                    }
                    failJob(job, "后台任务长时间没有更新，已中断");
                }
                continue;
            }
            if (job.acknowledged && now - job.updatedAt > Duration.ofDays(retentionDays).toMillis()) {
                deleteJob(job);
            }
        }
        if (jobs.size() > maxJobs) {
            jobs.values().stream()
                    .filter(job -> {
                        ObjectNode state = readState(job, false);
                        return state != null && TERMINAL.contains(state.path("status").asText(""));
                    })
                    .sorted(Comparator.comparingLong(job -> job.updatedAt))
                    .limit(Math.max(0, jobs.size() - maxJobs))
                    .toList()
                    .forEach(this::deleteJob);
        }
    }

    private void deleteJob(Job job) {
        synchronized (job.lock) {
            jobs.remove(job.id);
            try (var stream = Files.walk(job.dir)) {
                stream.sorted(Comparator.reverseOrder()).forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException ignored) {
                    }
                });
            } catch (IOException ignored) {
            }
        }
    }

    private void cleanupSensitiveFiles(Job job) {
        for (String name : List.of("auth.txt", "payload.json", "cancel")) {
            try {
                Files.deleteIfExists(job.dir.resolve(name));
            } catch (IOException ignored) {
            }
        }
    }

    private void restrictPermissions(Path file) throws IOException {
        try {
            Files.setPosixFilePermissions(file, java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"));
        } catch (UnsupportedOperationException ignored) {
        }
    }

    /* ------------------------------------------------------------------ */
    /* 辅助                                                                */
    /* ------------------------------------------------------------------ */

    private String resolveNodeBinary() {
        if (!configuredNodePath.isBlank()) return configuredNodePath;
        for (String candidate : List.of(
                "/srv/wxbot/tools/node-v22.20.0-linux-x64/bin/node",
                "/usr/local/bin/node",
                "/usr/bin/node")) {
            Path path = Path.of(candidate);
            if (Files.isRegularFile(path) && Files.isExecutable(path)) return candidate;
        }
        return "node";
    }

    private String normalizeKind(String kind) {
        String value = kind == null ? "" : kind.trim().toLowerCase(Locale.ROOT);
        if (!KINDS.contains(value)) {
            throw new IllegalArgumentException("不支持的任务类型: " + kind);
        }
        return value;
    }

    private String promptPreview(String kind, JsonNode payload) {
        String text = "agent".equals(kind) ? text(payload, "userMessage") : text(payload, "prompt");
        return trimTo(text, 240);
    }

    private String text(JsonNode node, String field) {
        if (node == null) return "";
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText("").trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String trimTo(String value, int max) {
        String text = value == null ? "" : value.trim();
        return text.length() > max ? text.substring(0, max) : text;
    }

    private String rootMessage(Throwable error) {
        Throwable current = error;
        while (current != null && current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        String message = current == null ? "" : current.getMessage();
        return message == null || message.isBlank()
                ? (error == null ? "未知错误" : error.getClass().getSimpleName())
                : message;
    }

    private String nowIso() {
        return ISO.format(Instant.now());
    }

    private long asLong(Object value) {
        if (value instanceof Number number) return number.longValue();
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception e) {
            return 0L;
        }
    }

    private static final class Job {
        final String id;
        final String kind;
        final String account;
        final String chatId;
        final String messageId;
        final String promptPreview;
        final Path dir;
        final Object lock = new Object();
        final AtomicBoolean polling = new AtomicBoolean(false);
        final java.util.concurrent.atomic.AtomicInteger videoErrors = new java.util.concurrent.atomic.AtomicInteger();

        volatile long createdAt = System.currentTimeMillis();
        volatile long updatedAt = System.currentTimeMillis();
        volatile boolean acknowledged;
        volatile Process process;
        volatile Future<?> future;
        volatile ObjectNode cachedState;
        volatile long cachedMtime = -1;
        volatile long cachedSize = -1;

        Job(String id, String kind, String account, String chatId, String messageId, String promptPreview, Path dir) {
            this.id = id;
            this.kind = kind;
            this.account = account;
            this.chatId = chatId;
            this.messageId = messageId;
            this.promptPreview = promptPreview;
            this.dir = dir;
        }

        long lastStateModified() {
            try {
                Path file = dir.resolve("state.json");
                if (!Files.isRegularFile(file)) return 0;
                FileTime time = Files.getLastModifiedTime(file);
                return time.toMillis();
            } catch (IOException e) {
                return 0;
            }
        }
    }
}
