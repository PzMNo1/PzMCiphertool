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
    const BLOCK_SELECTOR = 'pre.markdown-code-block, pre.language-mermaid, code.language-mermaid';
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
                    fontSize: '13px',
                    cScale0: '#E9F0F8', cScale1: '#EDF0F6', cScale2: '#E8EFF4',
                    cScale3: '#EBF1F7', cScale4: '#E6EDF5', cScale5: '#EAF0F6',
                    cScale6: '#E9F0F8', cScale7: '#EDF0F6', cScale8: '#E8EFF4',
                    cScale9: '#EBF1F7', cScale10: '#E6EDF5', cScale11: '#EAF0F6',
                    cScaleLabel0: '#1F2D3A', cScaleLabel1: '#1F2D3A', cScaleLabel2: '#1F2D3A',
                    cScaleLabel3: '#1F2D3A', cScaleLabel4: '#1F2D3A', cScaleLabel5: '#1F2D3A',
                    cScaleLabel6: '#1F2D3A', cScaleLabel7: '#1F2D3A', cScaleLabel8: '#1F2D3A',
                    cScaleLabel9: '#1F2D3A', cScaleLabel10: '#1F2D3A', cScaleLabel11: '#1F2D3A',
                    cScaleInv0: '#7E9DBD', cScaleInv1: '#6E90B2', cScaleInv2: '#5F82A7',
                    cScaleInv3: '#52769C', cScaleInv4: '#456B91', cScaleInv5: '#3A6087',
                    cScaleInv6: '#7E9DBD', cScaleInv7: '#6E90B2', cScaleInv8: '#5F82A7',
                    cScaleInv9: '#52769C', cScaleInv10: '#456B91', cScaleInv11: '#3A6087',
                    pie1: '#3F78D8',
                    pie2: '#D9534F',
                    pie3: '#4C8F5E',
                    pie4: '#DE8A3B',
                    pie5: '#8A63C9',
                    pie6: '#B53F78',
                    pie7: '#2E8FAF',
                    pie8: '#B08A1E'
                },
                flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: true },
                sequence: { useMaxWidth: true },
                pie: { useMaxWidth: true, textPosition: 0.65 },
                xyChart: {
                    width: 470,
                    height: 290,
                    plotColorPalette: '#3F78D8,#D9534F,#4C8F5E,#DE8A3B,#8A63C9,#B53F78'
                },
                gantt: { useMaxWidth: false },
                timeline: { useMaxWidth: true, leftMargin: 20, padding: 26 }
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

        /**
         * 除了 language-mermaid，也识别语言标签写错/缺失的 Mermaid 围栏：
         * 模型有时会把 ```mermaid 写成 ```timeline / ```flowchart，甚至只写 ```。
         */
        looksLikeMermaid(code) {
            const lines = String(code || '').split('\n').map(line => line.trim()).filter(Boolean);
            let first = lines[0] || '';
            if (first.startsWith('%%{')) {
                first = lines.find(line => !line.startsWith('%%')) || '';
            }
            return /^(timeline|flowchart|graph|gantt|pie|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|mindmap|quadrantChart|sankey(?:-beta)?|xychart(?:-beta)?|block(?:-beta)?|packet(?:-beta)?|architecture(?:-beta)?|gitGraph|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/i.test(first);
        }

        hasMermaidLanguage(block, host) {
            return Boolean(
                block?.classList?.contains('language-mermaid')
                || host?.classList?.contains('language-mermaid')
                || block?.querySelector?.('code.language-mermaid')
            );
        }

        async renderBlock(block) {
            const host = this.resolveHost(block);
            const code = this.extractCode(block);
            if (!host || !code) return false;
            if (!this.hasMermaidLanguage(block, host) && !this.looksLikeMermaid(code)) return false;

            const hash = this.hash(code);

            // 历史消息里的 Mermaid pie / xychart 交给 Nature 风格渲染器，保持一致。
            if (/^(pie|xychart)\b/i.test(diagramHead(code))
                && window.agentChartRenderer?.renderMermaidChart?.(host, code)) {
                this.stats.rendered += 1;
                return true;
            }

            // 命中缓存：直接注入，避免流式重绘时重复渲染
            if (this.svgCache.has(hash)) {
                this.injectSvg(host, this.svgCache.get(hash), hash, code);
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
                if (host.dataset) {
                    host.dataset.mermaidState = 'error';
                    host.dataset.mermaidHash = hash;
                    host.title = `图表引擎加载失败：${error && error.message ? error.message : error}`;
                }
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
                    this.injectSvg(host, svg, hash, code);
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

        injectSvg(host, svg, hash, code = '') {
            if (!host) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'agent-diagram';
            const lowerCode = String(code || '').toLowerCase();
            const head = diagramHead(code);
            const isTimeline = /^timeline\b/i.test(head);
            if (/\b(gantt|timeline|journey|gitgraph)\b/.test(lowerCode)) {
                wrapper.classList.add('agent-diagram--wide');
            }
            if (isTimeline) {
                wrapper.classList.add('agent-diagram--timeline');
            }
            wrapper.dataset.mermaidState = 'done';
            wrapper.dataset.mermaidHash = hash;
            wrapper.innerHTML = svg;

            if (host.parentNode) {
                host.parentNode.replaceChild(wrapper, host);
            }

            if (isTimeline) this.decorateTimeline(wrapper, head);
        }

        /**
         * Mermaid 的 timeline 默认色板偏暗，且深色主题的节点文字会取黑色填充。
         * 这里统一改成白纸卡片：浅蓝区块 + 白色事件卡 + 深色文字，并回收底部多余的连接线。
         */
        decorateTimeline(wrapper, head = '') {
            const svg = wrapper.querySelector('svg');
            if (!svg) return;
            svg.classList.add('pzm-timeline');
            svg.dataset.diagram = 'timeline';
            this.wrapTimelineLabels(svg);
            if (!/^timeline\s+TD\b/i.test(head)) this.trimTimelineConnectors(svg);
        }

        wrapTimelineLabels(svg) {
            svg.querySelectorAll('.timeline-node text').forEach(textEl => {
                const full = (textEl.textContent || '').replace(/\s+/g, ' ').trim();
                if (full.length <= 4 || full.includes(' ')) return;
                const visibleLines = Array.from(textEl.querySelectorAll('tspan'))
                    .filter(tspan => tspan.textContent.trim());
                if (visibleLines.length > 1) return;

                const node = textEl.closest('.timeline-node');
                const box = node ? node.querySelector('.node-bkg') : null;
                let available = 162;
                try {
                    available = (box ? box.getBBox().width : 190) - 28;
                } catch (error) {
                    available = 162;
                }
                let width = 0;
                try {
                    width = textEl.getComputedTextLength();
                } catch (error) {
                    width = 0;
                }
                if (!width) {
                    width = Array.from(full).reduce((sum, char) => {
                        const wide = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(char);
                        return sum + (wide ? 13 : 7.2);
                    }, 0);
                }
                if (width <= available) return;

                let split = Math.ceil(full.length / 2);
                if (/\d/.test(full[split - 1] || '') && !/\d/.test(full[split] || '')) {
                    split += 1;
                }
                const softBreak = new Set([
                    '地方', '目标', '进入', '兑现', '保护', '立法', '可能', '扩展',
                    '签约', '实施', '渗透', '首次', '可见', '未成', '成年', '雷霆',
                    '竟界', '重点', '新游', '上线', '窗口', '电竞', '赛事', '云电'
                ]);
                if (softBreak.has(full.slice(split - 1, split + 1))) split -= 1;
                split = Math.max(1, Math.min(full.length - 1, split));

                const lines = [full.slice(0, split), full.slice(split)];
                textEl.textContent = '';
                lines.forEach((line, index) => {
                    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                    tspan.setAttribute('x', '0');
                    tspan.setAttribute('dy', index === 0 ? '1em' : '1.15em');
                    tspan.textContent = line;
                    textEl.appendChild(tspan);
                });
            });
        }

        trimTimelineConnectors(svg) {
            const lines = Array.from(svg.querySelectorAll('.lineWrapper line'));
            const horizontal = lines
                .map(line => ({
                    line,
                    x1: Number(line.getAttribute('x1')),
                    x2: Number(line.getAttribute('x2'))
                }))
                .filter(item => Number.isFinite(item.x1) && Number.isFinite(item.x2) && Math.abs(item.x1 - item.x2) > 1)
                .sort((a, b) => Math.abs(b.x2 - b.x1) - Math.abs(a.x2 - a.x1));
            if (!horizontal.length) return;
            const axis = horizontal[0].line;
            const axisY = Number(axis.getAttribute('y1'));
            if (!Number.isFinite(axisY)) return;

            lines.forEach(line => {
                if (line === axis) return;
                const x1 = Number(line.getAttribute('x1'));
                const x2 = Number(line.getAttribute('x2'));
                const y2 = Number(line.getAttribute('y2'));
                if (Math.abs(x1 - x2) < 0.1 && y2 > axisY) {
                    line.setAttribute('y2', String(axisY));
                    line.removeAttribute('marker-end');
                }
            });

            const box = String(svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
            if (box.length !== 4 || !box.every(Number.isFinite)) return;
            const top = Math.max(box[1], 0);
            const height = axisY + 46 - top;
            if (height <= 0) return;
            svg.setAttribute('viewBox', `${box[0]} ${top} ${box[2]} ${height}`);
            svg.setAttribute('height', String(height));
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

    function diagramHead(code) {
        let text = String(code || '').trim();
        while (text.startsWith('%%')) {
            if (text.startsWith('%%{')) {
                const end = text.indexOf('}%%');
                if (end < 0) break;
                text = text.slice(end + 3).trim();
            } else {
                const lineEnd = text.indexOf('\n');
                if (lineEnd < 0) break;
                text = text.slice(lineEnd + 1).trim();
            }
        }
        return text;
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
