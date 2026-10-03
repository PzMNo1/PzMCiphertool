/**
 * 世界模型（World Labs / Marble）前端调用封装。
 *
 * API Key 不存在浏览器里，所有请求都打到 Spring Boot 的 /api/world/**，
 * 由后端换成 WLT-Api-Key 再去访问 https://api.worldlabs.ai/marble/v1。
 */
(function () {
    function resolveApiBase() {
        try {
            const override = window.CIPHERTOOL_API_BASE || localStorage.getItem('CIPHERTOOL_API_BASE') || '';
            if (/^https?:\/\//i.test(override)) {
                return override.replace(/\/+$/, '');
            }
        } catch (error) {
            // 忽略：localStorage 不可用时回退到本地后端
        }
        return 'http://localhost:8080';
    }

    function url(path) {
        return resolveApiBase() + '/api/world' + path;
    }

    async function readPayload(response) {
        const rawText = await response.text();
        if (!rawText) return {};
        try {
            return JSON.parse(rawText);
        } catch (error) {
            return { message: rawText };
        }
    }

    /**
     * 统一请求：把后端的 {success,message,data} 解开，失败时抛出带状态码的错误。
     * status 会挂在 error.status 上，方便调用方区分 501（没配 Key）/ 402（没额度）/ 429（限流）。
     */
    async function request(path, options = {}) {
        const response = await fetch(url(path), {
            method: options.method || 'GET',
            headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: options.signal
        });
        const payload = await readPayload(response);
        if (!response.ok || payload.success === false) {
            const error = new Error(payload.message || `${response.status} ${response.statusText}`);
            error.status = response.status;
            throw error;
        }
        return payload.data;
    }

    function query(params) {
        const search = new URLSearchParams();
        Object.keys(params || {}).forEach(key => {
            const value = params[key];
            if (value !== undefined && value !== null && value !== '') {
                search.set(key, value);
            }
        });
        const text = search.toString();
        return text ? '?' + text : '';
    }

    window.WorldModelClient = {
        apiBase: resolveApiBase,

        /** 接入状态 + 剩余额度 */
        status(options = {}) {
            return request('/status', options);
        },

        /** 提交生成任务，返回 { operationId, done, worldId } */
        generate(payload, options = {}) {
            return request('/generations', { ...options, method: 'POST', body: payload });
        },

        /** 轮询生成进度 */
        operation(operationId, options = {}) {
            return request('/operations/' + encodeURIComponent(operationId), options);
        },

        /** 取世界的全部可下载资产 */
        world(worldId, options = {}) {
            return request('/worlds/' + encodeURIComponent(worldId), options);
        },

        /** 作品库列表 */
        list(params = {}, options = {}) {
            return request('/worlds' + query(params), { ...options, method: 'POST' });
        },

        /** 删除世界 */
        remove(worldId, options = {}) {
            return request('/worlds/' + encodeURIComponent(worldId), { ...options, method: 'DELETE' });
        },

        /**
         * 把上传的图片文件读成 data URL，交给后端内联成 data_base64。
         * 上游要求 base64 内联不超过 10MB，这里按 8MB 卡一道，给出可读提示。
         */
        readImageAsDataUrl(file, maxBytes = 8 * 1024 * 1024) {
            return new Promise((resolve, reject) => {
                if (!file) {
                    reject(new Error('没有选择图片'));
                    return;
                }
                if (!/^image\//.test(file.type || '')) {
                    reject(new Error('请选择图片文件（png / jpg / webp）'));
                    return;
                }
                if (file.size > maxBytes) {
                    reject(new Error(`图片过大（${(file.size / 1048576).toFixed(1)}MB），世界模型要求内联图片不超过 10MB`));
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('读取图片失败'));
                reader.readAsDataURL(file);
            });
        },

        /** 从 data URL 里取扩展名，供上游识别格式 */
        extensionOf(dataUrl) {
            const match = /^data:image\/([a-z0-9.+-]+);/i.exec(String(dataUrl || ''));
            if (!match) return 'png';
            const subtype = match[1].toLowerCase();
            if (subtype === 'jpeg') return 'jpg';
            if (subtype.includes('svg')) return 'png';
            return subtype;
        }
    };
})();
