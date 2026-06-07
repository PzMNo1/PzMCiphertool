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

    function escapeSvgText(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function wrapSvgText(value, maxChars = 48, maxLines = 5) {
        const words = String(value || '').replace(/\s+/g, ' ').trim().split(' ');
        const lines = [];
        let current = '';

        words.forEach(word => {
            if (!word) return;
            const next = current ? `${current} ${word}` : word;
            if (next.length > maxChars && current) {
                lines.push(current);
                current = word;
            } else {
                current = next;
            }
        });
        if (current) lines.push(current);

        return lines.slice(0, maxLines);
    }

    function createFallbackImage(error, prompt) {
        const message = String(error?.message || error || 'Image generation failed').slice(0, 220);
        const promptPreview = String(prompt || '').replace(/\s+/g, ' ').trim().slice(0, 160);
        const lines = [
            'IMAGE MODE FALLBACK',
            '',
            ...wrapSvgText(message, 46, 4),
            '',
            ...wrapSvgText(promptPreview ? `Prompt: ${promptPreview}` : 'Prompt was empty.', 46, 3)
        ];
        const text = lines.map((line, index) => {
            const y = 300 + index * 44;
            const size = index === 0 ? 34 : 24;
            const fill = index === 0 ? '#8ee7ff' : '#dcecff';
            return `<text x="512" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size}" fill="${fill}">${escapeSvgText(line)}</text>`;
        }).join('');
        const svg = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">',
            '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06141f"/><stop offset="1" stop-color="#102640"/></linearGradient></defs>',
            '<rect width="1024" height="1024" fill="url(#bg)"/>',
            '<rect x="104" y="104" width="816" height="816" rx="28" fill="rgba(0,0,0,.18)" stroke="#2fd6ff" stroke-opacity=".45" stroke-width="2"/>',
            '<circle cx="512" cy="210" r="62" fill="none" stroke="#2fd6ff" stroke-opacity=".7" stroke-width="4"/>',
            '<path d="M482 210h60M512 180v60" stroke="#2fd6ff" stroke-width="8" stroke-linecap="round"/>',
            text,
            '</svg>'
        ].join('');

        return {
            content: '已生成图片。',
            images: [{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
                mimeType: 'image/svg+xml',
                revisedPrompt: promptPreview
            }]
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
            console.warn('Image generation failed; rendering fallback image.', error);
            return createFallbackImage(error, prompt);
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
