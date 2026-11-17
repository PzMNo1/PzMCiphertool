/**
 * Isolated image-generation adapter for Agent image mode.
 * It patches DeepSeekClient without adding more weight to model/main.js.
 */
(function () {
    const DEFAULT_MODEL = 'gpt-image-2.5-sunburst';
    const DEFAULT_SIZE = '1024x1024';
    const DEFAULT_TIMEOUT_MS = 270000;

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

    function resolveImageConfig(options = {}) {
        const imageConfig = window.IMAGE_GENERATION_CONFIG || {};
        const legacyConfig = window.DEEPSEEK_CONFIG || {};
        const readLocal = key => {
            try {
                return localStorage.getItem(key) || '';
            } catch (error) {
                return '';
            }
        };
        return {
            url: options.url || imageConfig.url || `${resolveApiBase()}/api/images/generations`,
            model: options.model || imageConfig.model || legacyConfig.imageModel || readLocal('CIPHERTOOL_IMAGE_MODEL') || DEFAULT_MODEL,
            size: options.size || imageConfig.size || legacyConfig.imageSize || readLocal('CIPHERTOOL_IMAGE_SIZE') || DEFAULT_SIZE,
            n: normalizeCount(options.n || imageConfig.imageCount || imageConfig.n || readLocal('CIPHERTOOL_IMAGE_COUNT') || 1),
            timeoutMs: normalizeTimeout(options.timeoutMs || imageConfig.timeoutMs || DEFAULT_TIMEOUT_MS)
        };
    }

    function normalizeCount(value) {
        const count = Number(value);
        if (!Number.isFinite(count)) return 1;
        return Math.max(1, Math.min(4, Math.round(count)));
    }

    function normalizeTimeout(value) {
        const timeout = Number(value);
        if (!Number.isFinite(timeout) || timeout < 10000) return DEFAULT_TIMEOUT_MS;
        return Math.min(600000, Math.round(timeout));
    }

    function normalizeImageItem(item) {
        if (!item || typeof item !== 'object') return null;
        const url = item.url || item.image_url || '';
        if (!url) return null;
        return {
            url,
            mimeType: item.mimeType || item.mime_type || 'image/png',
            revisedPrompt: item.revisedPrompt || item.revised_prompt || ''
        };
    }

    function normalizeBackendPayload(payload) {
        const data = payload && payload.success !== undefined ? payload.data : payload;
        const rawImages = Array.isArray(data?.images)
            ? data.images
            : Array.isArray(data?.data)
                ? data.data
                : [];
        const images = rawImages.map(normalizeImageItem).filter(Boolean);
        return {
            content: data?.content || (images.length ? '已生成图片。' : ''),
            images
        };
    }

    function emitProgress(options, phase) {
        try {
            options.onProgress?.({
                phase,
                elapsedMs: Math.max(0, Date.now() - (Number(options.startedAt) || Date.now()))
            });
        } catch (error) {
            console.warn('Image generation progress handler failed.', error);
        }
    }

    async function generateImageThroughBackend(options = {}) {
        const prompt = String(options.prompt || '').trim() || 'Create an image for this empty image-mode message.';
        if (!String(options.prompt || '').trim()) {
            throw new Error('图片生成提示不能为空');
        }

        const config = resolveImageConfig(options);
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
            emitProgress(options, 'connecting');
            const body = {
                prompt,
                model: config.model,
                size: config.size,
                n: config.n
            };
            if (options.referenceImage) {
                body.referenceImage = options.referenceImage;
            }
            const response = await fetch(config.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            emitProgress(options, 'receiving');
            const rawText = await response.text();
            let payload = null;
            try {
                payload = rawText ? JSON.parse(rawText) : null;
            } catch (error) {
                payload = null;
            }

            if (!response.ok || payload?.success === false) {
                const message = payload?.message || rawText || `${response.status} ${response.statusText}`;
                throw new Error(`图片生成失败: ${String(message).slice(0, 500)}`);
            }

            emitProgress(options, 'processing');
            const result = normalizeBackendPayload(payload);
            if (!result.images.length) {
                throw new Error('图片生成接口没有返回图片');
            }
            emitProgress(options, 'completed');
            return result;
        } catch (error) {
            if (timedOut) {
                throw new Error(`图片生成超时（${Math.round(config.timeoutMs / 1000)} 秒），请重试或简化画面描述。`);
            }
            if (error?.name === 'AbortError') {
                throw error;
            }
            console.warn('Image generation failed.', error);
            throw new Error(error?.message || '图片生成失败，请检查后端图片模型配置后重试');
        } finally {
            window.clearTimeout(timeoutId);
            if (externalSignal) externalSignal.removeEventListener('abort', abortFromExternal);
            if (this.abortController === controller) this.abortController = null;
        }
    }

    function installImageGenerationPatch() {
        if (!window.DeepSeekClient || window.DeepSeekClient.__imageGenerationPatched) return Boolean(window.DeepSeekClient);

        window.DeepSeekClient.prototype.resolveImagesUrl = function () {
            return resolveImageConfig().url;
        };
        window.DeepSeekClient.prototype.generateImage = generateImageThroughBackend;
        window.DeepSeekClient.__imageGenerationPatched = true;
        return true;
    }

    if (!installImageGenerationPatch()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', installImageGenerationPatch, { once: true });
        } else {
            let attempts = 0;
            const retryId = window.setInterval(() => {
                attempts += 1;
                if (installImageGenerationPatch() || attempts >= 30) window.clearInterval(retryId);
            }, 100);
        }
    }

    window.ImageGenerationClient = {
        install: installImageGenerationPatch,
        resolveConfig: resolveImageConfig
    };
})();
