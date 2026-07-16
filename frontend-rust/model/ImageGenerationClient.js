/**
 * Isolated image-generation adapter for Agent image mode.
 * It patches DeepSeekClient without adding more weight to model/main.js.
 */
(function () {
    const DEFAULT_MODEL = 'gpt-image-2';
    const DEFAULT_SIZE = '1024x1024';

    function resolveApiBase() {
        try {
            const override = window.CIPHERTOOL_API_BASE || localStorage.getItem('CIPHERTOOL_API_BASE') || '';
            if (/^https?:\/\//i.test(override)) {
                return override.replace(/\/+$/, '');
            }
        } catch (error) {
            // Fall through to local backend.
        }
        return 'http://localhost:8080';
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
            n: normalizeCount(options.n || imageConfig.imageCount || imageConfig.n || readLocal('CIPHERTOOL_IMAGE_COUNT') || 1)
        };
    }

    function normalizeCount(value) {
        const count = Number(value);
        if (!Number.isFinite(count)) return 1;
        return Math.max(1, Math.min(4, Math.round(count)));
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

    async function generateImageThroughBackend(options = {}) {
        const prompt = String(options.prompt || '').trim() || 'Create an image for this empty image-mode message.';

        const config = resolveImageConfig(options);
        const controller = options.signal ? null : new AbortController();
        this.abortController = options.signal ? { signal: options.signal } : controller;

        try {
            const response = await fetch(config.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model: config.model,
                    size: config.size,
                    n: config.n
                }),
                signal: options.signal || controller.signal
            });

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

            const result = normalizeBackendPayload(payload);
            if (!result.images.length) {
                throw new Error('图片生成接口没有返回图片');
            }
            return result;
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw error;
            }
            console.warn('Image generation failed.', error);
            throw new Error(error?.message || '图片生成失败，请检查后端图片模型配置后重试');
        }
    }

    function installImageGenerationPatch() {
        if (!window.DeepSeekClient || window.DeepSeekClient.__imageGenerationPatched) return false;

        window.DeepSeekClient.prototype.resolveImagesUrl = function () {
            return resolveImageConfig().url;
        };
        window.DeepSeekClient.prototype.generateImage = generateImageThroughBackend;
        window.DeepSeekClient.__imageGenerationPatched = true;
        return true;
    }

    if (!installImageGenerationPatch()) {
        document.addEventListener('DOMContentLoaded', installImageGenerationPatch);
    }

    window.ImageGenerationClient = {
        install: installImageGenerationPatch,
        resolveConfig: resolveImageConfig
    };
})();
