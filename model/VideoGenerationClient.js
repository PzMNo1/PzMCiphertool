/**
 * Isolated video-generation adapter for Agent video mode.
 * Mirrors ImageGenerationClient: DeepSeekClient is patched in one place, and the
 * browser only talks to the local backend proxy. The upstream Muse API key never
 * reaches the frontend.
 */
(function () {
    const DEFAULT_MODEL = 'muse-video';
    const DEFAULT_ASPECT_RATIO = '16:9';
    const DEFAULT_TIMEOUT_MS = 600000;
    const DEFAULT_POLL_INTERVAL_MS = 4000;

    function resolveApiBase() {
        try {
            const override = window.CIPHERTOOL_API_BASE || localStorage.getItem('CIPHERTOOL_API_BASE') || '';
            if (/^https?:\/\//i.test(override)) {
                return override.replace(/\/+$/, '');
            }
        } catch (error) {
            // Fall through to local backend.
        }
        return 'http://127.0.0.1:8080';
    }

    function resolveVideoConfig(options = {}) {
        const videoConfig = window.VIDEO_GENERATION_CONFIG || {};
        const readLocal = key => {
            try {
                return localStorage.getItem(key) || '';
            } catch (error) {
                return '';
            }
        };
        return {
            url: options.url || videoConfig.url || `${resolveApiBase()}/api/videos/generations`,
            model: options.model || videoConfig.model || readLocal('CIPHERTOOL_VIDEO_MODEL') || DEFAULT_MODEL,
            aspectRatio: options.aspectRatio || videoConfig.aspectRatio || readLocal('CIPHERTOOL_VIDEO_ASPECT') || DEFAULT_ASPECT_RATIO,
            pollIntervalMs: normalizeInterval(options.pollIntervalMs || videoConfig.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS),
            timeoutMs: normalizeTimeout(options.timeoutMs || videoConfig.timeoutMs || DEFAULT_TIMEOUT_MS)
        };
    }

    function normalizeInterval(value) {
        const interval = Number(value);
        if (!Number.isFinite(interval) || interval < 1000) return DEFAULT_POLL_INTERVAL_MS;
        return Math.min(30000, Math.round(interval));
    }

    function normalizeTimeout(value) {
        const timeout = Number(value);
        if (!Number.isFinite(timeout) || timeout < 30000) return DEFAULT_TIMEOUT_MS;
        return Math.min(1200000, Math.round(timeout));
    }

    function normalizeVideoItem(item) {
        if (!item || typeof item !== 'object') return null;
        let url = String(item.url || item.video_url || item.videoUrl || '').trim();
        if (!url) return null;
        if (url.startsWith('/')) {
            url = resolveApiBase() + url;
        }
        return {
            url,
            mimeType: item.mimeType || item.mime_type || 'video/mp4',
            durationSeconds: item.durationSeconds ?? item.duration_seconds ?? null,
            aspectRatio: item.aspectRatio || item.aspect_ratio || ''
        };
    }

    function readTaskData(payload) {
        const data = payload && payload.success !== undefined ? payload.data : payload;
        if (!data || typeof data !== 'object') {
            return { taskId: '', model: '', status: '', progress: null, videos: [], errorMessage: '' };
        }
        const videos = (Array.isArray(data.videos) ? data.videos : [])
            .map(normalizeVideoItem)
            .filter(Boolean);
        const progressValue = data.progress;
        const progress = progressValue === null || progressValue === undefined
            ? null
            : Math.max(0, Math.min(100, Number(progressValue) || 0));
        return {
            taskId: data.taskId || data.task_id || data.id || '',
            model: data.model || '',
            status: String(data.status || data.task_status || '').toLowerCase(),
            progress,
            videos,
            errorMessage: data.errorMessage || data.error_message || data.message || ''
        };
    }

    function emitProgress(options, phase, extra = {}) {
        try {
            options.onProgress?.({
                phase,
                elapsedMs: Math.max(0, Date.now() - (Number(options.startedAt) || Date.now())),
                ...extra
            });
        } catch (error) {
            console.warn('Video generation progress handler failed.', error);
        }
    }

    function delay(ms, signal) {
        return new Promise((resolve, reject) => {
            if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }
            let timer = null;
            const onAbort = () => {
                window.clearTimeout(timer);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            timer = window.setTimeout(() => {
                signal?.removeEventListener('abort', onAbort);
                resolve();
            }, ms);
            signal?.addEventListener('abort', onAbort, { once: true });
        });
    }

    async function readJsonResponse(response) {
        const rawText = await response.text();
        let payload = null;
        try {
            payload = rawText ? JSON.parse(rawText) : null;
        } catch (error) {
            payload = null;
        }
        return { payload, rawText };
    }

    function backendErrorMessage(payload, rawText, status, statusText) {
        const data = payload && payload.success !== undefined ? payload.data : payload;
        return data?.errorMessage
            || data?.message
            || payload?.message
            || rawText
            || `${status} ${statusText}`;
    }

    async function generateVideoThroughBackend(options = {}) {
        const prompt = String(options.prompt || '').trim();
        if (!prompt) {
            throw new Error('视频创作提示不能为空');
        }

        const config = resolveVideoConfig(options);
        const externalSignal = options.signal || null;
        const controller = new AbortController();
        this.abortController = controller;
        let timedOut = false;
        const abortFromExternal = () => controller.abort();
        if (externalSignal) {
            if (externalSignal.aborted) controller.abort();
            else externalSignal.addEventListener('abort', abortFromExternal, { once: true });
        }
        const timeoutId = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, config.timeoutMs);

        try {
            emitProgress(options, 'submitting');
            const submitResponse = await fetch(config.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    aspectRatio: options.aspectRatio || config.aspectRatio
                }),
                signal: controller.signal
            });

            const submitResult = await readJsonResponse(submitResponse);
            if (!submitResponse.ok || submitResult.payload?.success === false) {
                throw new Error(`视频创作失败: ${String(backendErrorMessage(
                    submitResult.payload, submitResult.rawText, submitResponse.status, submitResponse.statusText
                )).slice(0, 500)}`);
            }

            const submitted = readTaskData(submitResult.payload);
            if (!submitted.taskId) {
                throw new Error('视频任务创建接口没有返回 task_id');
            }

            const taskId = submitted.taskId;
            let lastProgress = submitted.progress;
            emitProgress(options, 'queued', { taskId, progress: lastProgress, model: submitted.model || config.model });

            while (true) {
                await delay(config.pollIntervalMs, controller.signal);

                const statusResponse = await fetch(`${config.url}/${encodeURIComponent(taskId)}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });
                const statusResult = await readJsonResponse(statusResponse);
                if (!statusResponse.ok || statusResult.payload?.success === false) {
                    throw new Error(`视频状态查询失败: ${String(backendErrorMessage(
                        statusResult.payload, statusResult.rawText, statusResponse.status, statusResponse.statusText
                    )).slice(0, 500)}`);
                }

                const task = readTaskData(statusResult.payload);
                if (task.progress !== null) lastProgress = task.progress;

                if (task.status === 'completed') {
                    if (!task.videos.length) {
                        throw new Error('视频生成完成，但没有返回可播放的视频地址');
                    }
                    emitProgress(options, 'completed', { taskId, progress: 100 });
                    return { content: '已生成视频。', videos: task.videos, taskId };
                }
                if (task.status === 'failed') {
                    throw new Error(task.errorMessage || '视频生成失败，请调整描述后重试');
                }
                emitProgress(options, 'processing', {
                    taskId,
                    progress: lastProgress,
                    status: task.status
                });
            }
        } catch (error) {
            if (timedOut) {
                throw new Error(`视频生成超时（${Math.round(config.timeoutMs / 60000)} 分钟），请重试或简化描述。`);
            }
            if (error?.name === 'AbortError') {
                throw error;
            }
            console.warn('Video generation failed.', error);
            throw new Error(error?.message || '视频生成失败，请检查后端视频模型配置后重试');
        } finally {
            window.clearTimeout(timeoutId);
            if (externalSignal) externalSignal.removeEventListener('abort', abortFromExternal);
            if (this.abortController === controller) this.abortController = null;
        }
    }

    function installVideoGenerationPatch() {
        if (!window.DeepSeekClient || window.DeepSeekClient.__videoGenerationPatched) return Boolean(window.DeepSeekClient);

        window.DeepSeekClient.prototype.resolveVideosUrl = function () {
            return resolveVideoConfig().url;
        };
        window.DeepSeekClient.prototype.generateVideo = generateVideoThroughBackend;
        window.DeepSeekClient.__videoGenerationPatched = true;
        return true;
    }

    if (!installVideoGenerationPatch()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', installVideoGenerationPatch, { once: true });
        } else {
            let attempts = 0;
            const retryId = window.setInterval(() => {
                attempts += 1;
                if (installVideoGenerationPatch() || attempts >= 30) window.clearInterval(retryId);
            }, 100);
        }
    }

    window.VideoGenerationClient = {
        install: installVideoGenerationPatch,
        resolveConfig: resolveVideoConfig
    };
})();
