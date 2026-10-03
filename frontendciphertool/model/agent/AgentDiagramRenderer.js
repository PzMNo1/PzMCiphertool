/**
 * AgentDiagramRenderer - Mermaid 图表渲染器
 *
 * 目标：让研报里出现的 ```mermaid 图块（帕累托图 / 鱼骨式归因图 / 饼图 / 时间线）
 * 真正渲染成矢量图，而不是当普通代码块显示。
 *
 * 设计要点（尽量不侵入既有代码）：
 * 1. 用 MutationObserver 监听消息容器，完全外部挂载 —— 不需要改动 ChatUI 的解析逻辑。
 *    （ChatUI 本来就会给围栏加上 language-xxx 类名，这里直接利用。）
 * 2. Mermaid 走本地 vendor 文件，不依赖 CDN，内网/离线可用。
 * 3. 按内容哈希缓存已渲染的 SVG：流式输出期间正文会反复重绘，
 *    命中缓存时直接注入，避免重复渲染大图。
 * 4. securityLevel=strict：图表文本来自模型对网页的转述，属于不可信输入，
 *    必须禁用图表内的 HTML/脚本执行。
 */
(function () {
    const VENDOR_SRC = './vendor/mermaid/mermaid.min.js';
    const CONTAINER_SELECTORS = ['#chat-messages'];
    const BLOCK_SELECTOR = 'pre.language-mermaid, pre.markdown-code-block.language-mermaid, code.language-mermaid';
    const DEBOUNCE_MS = 650;

    class AgentDiagramRenderer {
        constructor(options = {}) {
            this.options = Object.assign({
                vendorSrc: VENDOR_SRC,
                containers: CONTAINER_SELECTORS.slice(),
                debounceMs: DEBOUNCE_MS,
                maxCacheEntries: 60
            }, options || {});

            this.loadPromise = null;
            this.initialized = false;
            this.svgCache = new Map();
            this.failedHashes = new Set();
            this.observers = [];
            this.timers = new WeakMap();
            this.renderQueue = Promise.resolve();
            this.stats = { rendered: 0, cached: 0, failed: 0 };
        }

        /* ---------------- 启动 ---------------- */

        start() {
            if (typeof document === 'undefined') return;
            for (const selector of this.options.containers) {
                const container = document.querySelector(selector);
                if (!container) continue;
                if (this.observers.some(item => item.container === container)) continue;

                const observer = new MutationObserver(() => this.scheduleRender(container));
                observer.observe(container, { childList: true, subtree: true, characterData: true });
                this.observers.push({ container, observer });
                this.scheduleRender(container);
            }
        }

        stop() {
            this.observers.forEach(item => item.observer.disconnect());
            this.observers = [];
        }

        scheduleRender(container) {
            const existing = this.timers.get(container);
            if (existing) clearTimeout(existing);
            const timer = setTimeout(() => {
                this.timers.delete(container);
                this.renderAll(container);
            }, this.options.debounceMs);
            this.timers.set(container, timer);
        }

        /* ---------------- Mermaid 懒加载 ---------------- */

        ensureMermaid() {
            if (this.loadPromise) return this.loadPromise;

            this.loadPromise = new Promise((resolve, reject) => {
                const existing = window.mermaid
                    || (window.__esbuild_esm_mermaid_nm && window.__esbuild_esm_mermaid_nm.mermaid);
                if (existing) {
                    resolve(existing);
                    return;
                }

                const script = document.createElement('script');
                script.src = this.options.vendorSrc;
                script.async = true;
                script.onload = () => {
                    const mermaid = window.mermaid
                        || (window.__esbuild_esm_mermaid_nm && window.__esbuild_esm_mermaid_nm.mermaid);
                    if (mermaid) resolve(mermaid);
                    else reject(new Error('mermaid loaded but global not found'));
                };
                script.onerror = () => reject(new Error(`failed to load ${this.options.vendorSrc}`));
                document.head.appendChild(script);
            }).catch(error => {
                console.warn('[AgentDiagramRenderer]', error.message);
                // 允许后续重试
                this.loadPromise = null;
                throw error;
            });

            return this.loadPromise;
        }

        async initMermaid() {
            const mermaid = await this.ensureMermaid();
            if (this.initialized) return mermaid;

            mermaid.initialize({
                startOnLoad: false,
                // 图表文本源自模型对网页的转述，属不可信输入
                securityLevel: 'strict',
                theme: 'dark',
                fontFamily: '"Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif',
                themeVariables: {
                    darkMode: true,
                    background: 'transparent',
                    primaryColor: 'rgba(18,48,71,0.85)',
                    primaryTextColor: '#e2f4ff',
                    primaryBorderColor: 'rgba(64,224,255,0.55)',
                    lineColor: 'rgba(142,231,255,0.75)',
                    secondaryColor: 'rgba(24,60,72,0.7)',
                    tertiaryColor: 'rgba(12,25,34,0.7)',
                    fontSize: '13px'
                },
                flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: true },
                sequence: { useMaxWidth: true },
                pie: { useMaxWidth: true },
                xychart: { useMaxWidth: true }
            });

            this.initialized = true;
            return mermaid;
        }

        /* ---------------- 渲染 ---------------- */

        async renderAll(container = document) {
            const root = container && container.querySelectorAll ? container : document;
            const blocks = Array.from(root.querySelectorAll(BLOCK_SELECTOR));
            if (!blocks.length) return 0;

            let rendered = 0;
            for (const block of blocks) {
                if (this.isCurrent(block)) continue;
                const ok = await this.renderBlock(block);
                if (ok) rendered += 1;
            }
            return rendered;
        }

        isCurrent(block) {
            const host = this.resolveHost(block);
            if (!host) return true;
            const code = this.extractCode(block);
            const hash = this.hash(code);
            const state = host.dataset ? host.dataset.mermaidState : '';
            const renderedHash = host.dataset ? host.dataset.mermaidHash : '';
            if (state === 'done' && renderedHash === hash) return true;
            if (state === 'error' && renderedHash === hash) return true;
            return false;
        }

        resolveHost(block) {
            if (!block) return null;
            if (block.tagName === 'CODE') return block.closest('pre') || block;
            return block;
        }

        extractCode(block) {
            if (!block) return '';
            const codeEl = block.tagName === 'CODE' ? block : block.querySelector('code');
            const text = codeEl ? codeEl.textContent : block.textContent;
            return String(text || '').trim();
        }

        async renderBlock(block) {
            const host = this.resolveHost(block);
            const code = this.extractCode(block);
            if (!host || !code) return false;

            const hash = this.hash(code);

            // 命中缓存：直接注入，避免流式重绘时重复渲染
            if (this.svgCache.has(hash)) {
                this.injectSvg(host, this.svgCache.get(hash), hash);
                this.stats.cached += 1;
                return true;
            }
            if (this.failedHashes.has(hash)) {
                if (host.dataset) {
                    host.dataset.mermaidState = 'error';
                    host.dataset.mermaidHash = hash;
                }
                return false;
            }

            let mermaid;
            try {
                mermaid = await this.initMermaid();
            } catch (error) {
                return false;
            }

            // mermaid.render 需要唯一 id，且内部会操作 DOM，串行化以保稳
            const renderId = `pzm-mmd-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
            const job = async () => {
                try {
                    const result = await mermaid.render(renderId, code);
                    const svg = result && result.svg ? result.svg : '';
                    if (!svg) throw new Error('empty svg');
                    this.rememberSvg(hash, svg);
                    this.injectSvg(host, svg, hash);
                    this.stats.rendered += 1;
                    return true;
                } catch (error) {
                    this.failedHashes.add(hash);
                    this.stats.failed += 1;
                    if (host.dataset) {
                        host.dataset.mermaidState = 'error';
                        host.dataset.mermaidHash = hash;
                        host.title = `图表渲染失败：${error && error.message ? error.message : error}`;
                    }
                    // 失败时保留原始代码块，内容仍然可读
                    const stray = document.getElementById(renderId) || document.getElementById('d' + renderId);
                    if (stray && stray.parentNode) stray.parentNode.removeChild(stray);
                    return false;
                }
            };

            this.renderQueue = this.renderQueue.then(job, job);
            return this.renderQueue;
        }

        rememberSvg(hash, svg) {
            if (this.svgCache.size >= this.options.maxCacheEntries) {
                const firstKey = this.svgCache.keys().next().value;
                if (firstKey !== undefined) this.svgCache.delete(firstKey);
            }
            this.svgCache.set(hash, svg);
        }

        injectSvg(host, svg, hash) {
            if (!host) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'agent-diagram';
            wrapper.dataset.mermaidState = 'done';
            wrapper.dataset.mermaidHash = hash;
            wrapper.innerHTML = svg;

            if (host.parentNode) {
                host.parentNode.replaceChild(wrapper, host);
            }
        }

        hash(text) {
            const str = String(text || '');
            let value = 2166136261;
            for (let i = 0; i < str.length; i += 1) {
                value ^= str.charCodeAt(i);
                value = Math.imul(value, 16777619);
            }
            return `mmd-${(value >>> 0).toString(16)}-${str.length}`;
        }

        getStats() {
            return { ...this.stats, cachedSvg: this.svgCache.size };
        }
    }

    window.AgentDiagramRenderer = AgentDiagramRenderer;
    window.agentDiagramRenderer = window.agentDiagramRenderer || new AgentDiagramRenderer();

    // 自动挂载：无需其他模块调用，也不改动 ChatUI 的解析逻辑。
    // 只有当正文里真的出现 ```mermaid 图块时才会去加载本地 vendor 文件。
    function bootstrap() {
        const renderer = window.agentDiagramRenderer;
        if (!renderer) return;
        renderer.start();
        // 历史消息恢复等场景下容器内容可能在之后才写入，做一次延迟补扫
        setTimeout(() => renderer.renderAll(document), 1200);
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
        } else {
            bootstrap();
        }
    }
})();
