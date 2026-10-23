/**
 * AgentChartRenderer - Nature 风格统计图渲染器
 *
 * 模型在正文里输出 ```chart 围栏（JSON），这里把它渲染成纯 SVG：
 * bar / line / trend / scatter / control / pie / donut / box / histogram / pareto / area。
 *
 * 设计约束：
 * 1. 白底、窄幅（约 520px）、无多余装饰，接近期刊单栏图；
 * 2. 不引入第三方图表库，离线可用；
 * 3. 围栏 JSON 非法时保留源码，不影响正文阅读；
 * 4. 与 AgentDiagramRenderer 一样用 MutationObserver 外部挂载，不改 ChatUI 解析逻辑。
 */
(function () {
    const CONTAINER_SELECTORS = ['#chat-messages'];
    const BLOCK_SELECTOR = 'pre.language-chart, pre.language-nature-chart, pre.markdown-code-block.language-chart, pre.markdown-code-block.language-nature-chart';
    const DEBOUNCE_MS = 520;
    const WIDTH = 520;
    const HEIGHT = 310;

    // Okabe-Ito 色盲友好配色，接近 Nature 图版的克制用色
    const PALETTE = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#4D4D4D', '#F0E442'];
    const INK = '#1a1a1a';
    const MUTED = '#5b6570';
    const GRID = '#e4e7ea';
    const SERIF = 'Arial, "Helvetica Neue", "Microsoft YaHei UI", sans-serif';

    class AgentChartRenderer {
        constructor(options = {}) {
            this.options = Object.assign({
                containers: CONTAINER_SELECTORS.slice(),
                debounceMs: DEBOUNCE_MS,
                maxCacheEntries: 80
            }, options || {});
            this.observers = [];
            this.timers = new WeakMap();
            this.cache = new Map();
            this.stats = { rendered: 0, cached: 0, failed: 0 };
        }

        start() {
            if (typeof document === 'undefined') return;
            for (const selector of this.options.containers) {
                const container = document.querySelector(selector);
                if (!container) continue;
                if (this.observers.some(item => item.container === container)) continue;
                const observer = new MutationObserver(() => this.schedule(container));
                observer.observe(container, { childList: true, subtree: true, characterData: true });
                this.observers.push({ container, observer });
                this.schedule(container);
            }
        }

        stop() {
            this.observers.forEach(item => item.observer.disconnect());
            this.observers = [];
        }

        schedule(container) {
            const existing = this.timers.get(container);
            if (existing) clearTimeout(existing);
            const timer = setTimeout(() => {
                this.timers.delete(container);
                this.renderAll(container);
            }, this.options.debounceMs);
            this.timers.set(container, timer);
        }

        renderAll(container = document) {
            const root = container && container.querySelectorAll ? container : document;
            const blocks = Array.from(root.querySelectorAll(BLOCK_SELECTOR));
            let rendered = 0;
            for (const block of blocks) {
                const host = block.tagName === 'CODE' ? block.closest('pre') : block;
                if (!host || host.dataset.chartState === 'done') continue;
                const code = this.extractCode(block);
                if (!code) continue;
                const hash = this.hash(code);
                if (this.cache.has(hash)) {
                    this.inject(host, this.cache.get(hash), hash);
                    this.stats.cached += 1;
                    rendered += 1;
                    continue;
                }
                try {
                    const spec = this.parseSpec(code);
                    const svg = this.buildSvg(spec);
                    this.remember(hash, svg, spec);
                    this.inject(host, this.cache.get(hash), hash);
                    this.stats.rendered += 1;
                    rendered += 1;
                } catch (error) {
                    this.stats.failed += 1;
                    host.dataset.chartState = 'error';
                    host.dataset.chartHash = hash;
                    host.title = '图表 JSON 无法解析：' + (error && error.message ? error.message : error);
                }
            }
            return rendered;
        }

        extractCode(block) {
            const codeEl = block.tagName === 'CODE' ? block : block.querySelector('code');
            return String((codeEl ? codeEl.textContent : block.textContent) || '').trim();
        }

        parseSpec(text) {
            const raw = String(text || '').trim().replace(/^```[a-zA-Z-]*\s*/, '').replace(/```$/, '').trim();
            let spec;
            try {
                spec = JSON.parse(raw);
            } catch (error) {
                // 容忍 JSON 前后的说明文字
                const start = raw.indexOf('{');
                const end = raw.lastIndexOf('}');
                if (start < 0 || end <= start) throw new Error('未找到 JSON 对象');
                spec = JSON.parse(raw.slice(start, end + 1));
            }
            if (spec && spec.chart && typeof spec.chart === 'object') spec = spec.chart;
            if (!spec || typeof spec !== 'object') throw new Error('图表定义不是对象');
            const type = String(spec.type || inferType(spec)).toLowerCase();
            if (!type) throw new Error('缺少 type');
            spec.type = type;
            return spec;
        }

        remember(hash, svg, spec) {
            if (this.cache.size >= this.options.maxCacheEntries) {
                const first = this.cache.keys().next().value;
                if (first !== undefined) this.cache.delete(first);
            }
            this.cache.set(hash, { svg, caption: this.buildCaption(spec) });
        }

        buildCaption(spec) {
            const parts = [];
            if (spec.caption) parts.push(esc(spec.caption));
            if (spec.note) parts.push('注：' + esc(spec.note));
            if (spec.source) parts.push('来源：' + esc(spec.source));
            return parts.join(' ');
        }

        inject(host, payload, hash) {
            if (!host) return;
            const wrapper = document.createElement('figure');
            wrapper.className = 'agent-chart';
            wrapper.dataset.chartState = 'done';
            wrapper.dataset.chartHash = hash;
            wrapper.title = '点击放大查看';
            wrapper.innerHTML = payload.svg + (payload.caption
                ? `<figcaption class="agent-chart-caption">${payload.caption}</figcaption>`
                : '');
            if (host.parentNode) host.parentNode.replaceChild(wrapper, host);
        }

        hash(text) {
            const str = String(text || '');
            let value = 2166136261;
            for (let i = 0; i < str.length; i += 1) {
                value ^= str.charCodeAt(i);
                value = Math.imul(value, 16777619);
            }
            return `chart-${(value >>> 0).toString(16)}-${str.length}`;
        }

        /* ---------------- SVG 构建 ---------------- */

        buildSvg(spec) {
            const type = spec.type;
            if (['pie', 'donut'].includes(type)) return this.renderPie(spec);
            if (['control', 'spc', 'xmr', 'x-mr'].includes(type)) return this.renderControl(spec);
            if (['histogram', 'hist'].includes(type)) return this.renderHistogram(spec);
            if (['box', 'boxplot', 'box-plot'].includes(type)) return this.renderBox(spec);
            if (type === 'pareto') return this.renderPareto(spec);
            if (type === 'scatter') return this.renderScatter(spec);
            if (['line', 'trend', 'area'].includes(type)) return this.renderLine(spec);
            return this.renderBar(spec);
        }

        /**
         * 把历史消息里已有的 Mermaid pie / xychart 也转成 Nature 风格，
         * 避免只有新生成的 chart 好看、旧会话仍是一版暗色图表。
         */
        renderMermaidChart(host, code) {
            if (!host) return false;
            const spec = parseMermaidChart(code);
            if (!spec) return false;
            try {
                const hash = this.hash('mermaid:' + String(code || ''));
                if (!this.cache.has(hash)) {
                    const svg = this.buildSvg(spec);
                    this.remember(hash, svg, spec);
                }
                this.inject(host, this.cache.get(hash), hash);
                this.stats.rendered += 1;
                return true;
            } catch (error) {
                return false;
            }
        }

        frame(spec, extra = '') {
            const title = esc(clip(spec.title || '', 42));
            const subtitle = esc(clip(spec.subtitle || spec.unit || '', 64));
            const legend = Array.isArray(spec.series) && spec.series.length > 1
                ? this.renderLegend(spec.series.map((item, index) => ({
                    label: item.name || `系列 ${index + 1}`,
                    color: item.color || PALETTE[index % PALETTE.length]
                })))
                : '';
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${title}">`
                + `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>`
                + (title ? `<text x="16" y="21" font-family='${SERIF}' font-size="12.5" font-weight="700" fill="${INK}">${title}</text>` : '')
                + (subtitle ? `<text x="16" y="37" font-family='${SERIF}' font-size="9.5" fill="${MUTED}">${subtitle}</text>` : '')
                + legend
                + extra
                + '</svg>';
        }

        renderLegend(items) {
            let x = WIDTH - 16;
            const rows = items.slice(0, 6).map(item => {
                const label = esc(clip(item.label, 12));
                const width = 14 + measure(label) * 5.3;
                x -= width;
                return { x, label, color: item.color };
            }).reverse();
            return rows.map(item => `<g>`
                + `<rect x="${item.x}" y="14" width="7" height="7" rx="1" fill="${item.color}"/>`
                + `<text x="${item.x + 10}" y="21" font-family='${SERIF}' font-size="8.6" fill="${MUTED}">${item.label}</text>`
                + `</g>`).join('');
        }

        /* ---------------- 柱状图 ---------------- */

        renderBar(spec) {
            const categories = normalizeCategories(spec);
            const series = normalizeSeries(spec, categories.length);
            if (!categories.length || !series.length) throw new Error('柱状图缺少 categories/values');

            const values = series.flatMap(item => item.values.map(toNumber)).filter(Number.isFinite);
            const domain = expandDomain(includeZero(values), 5);
            const plot = { left: 58, right: 18, top: 54, bottom: 52 };
            const axes = this.buildAxes(domain, plot, spec.unit, spec.y_label);
            const innerW = WIDTH - plot.left - plot.right;
            const innerH = HEIGHT - plot.top - plot.bottom;
            const band = innerW / Math.max(1, categories.length);
            const groupPad = band * 0.2;
            const barW = Math.max(3, Math.min(26, (band - groupPad) / Math.max(1, series.length) * 0.86));
            const baseY = axes.scaleY(Math.max(domain.min, Math.min(0, domain.max)));

            const parts = [axes.svg];
            series.forEach((item, sIndex) => {
                const color = item.color || PALETTE[sIndex % PALETTE.length];
                item.values.forEach((value, index) => {
                    const yValue = toNumber(value);
                    if (!Number.isFinite(yValue)) return;
                    const groupCenter = plot.left + band * index + band / 2;
                    const offset = (sIndex - (series.length - 1) / 2) * (barW + 2);
                    const x = groupCenter + offset - barW / 2;
                    const y = axes.scaleY(yValue);
                    const top = Math.min(y, baseY);
                    const height = Math.max(1, Math.abs(baseY - y));
                    parts.push(`<rect x="${fmt(x)}" y="${fmt(top)}" width="${fmt(barW)}" height="${fmt(height)}" fill="${color}" opacity="0.92"/>`);
                    if (series.length * categories.length <= 12) {
                        const labelY = yValue >= 0 ? y - 4 : y + 10;
                        parts.push(`<text x="${fmt(groupCenter + offset)}" y="${fmt(labelY)}" text-anchor="middle" font-family='${SERIF}' font-size="8" fill="${INK}">${esc(compactNumber(yValue))}</text>`);
                    }
                });
            });
            categories.forEach((label, index) => {
                const x = plot.left + band * index + band / 2;
                parts.push(this.xLabel(x, HEIGHT - plot.bottom + 14, label, categories.length));
            });
            return this.frame(spec, parts.join(''));
        }

        /* ---------------- 折线 / 面积图 ---------------- */

        renderLine(spec) {
            const categories = normalizeCategories(spec);
            const series = normalizeSeries(spec, categories.length);
            if (!series.length) throw new Error('折线图缺少 series');

            const values = series.flatMap(item => item.values.map(toNumber)).filter(Number.isFinite);
            const domain = expandDomain(includeZero(values), 5);
            const plot = { left: 58, right: 18, top: 54, bottom: 52 };
            const axes = this.buildAxes(domain, plot, spec.unit, spec.y_label);
            const innerW = WIDTH - plot.left - plot.right;
            const stepX = categories.length > 1 ? innerW / (categories.length - 1) : 0;
            const pointX = index => categories.length > 1
                ? plot.left + stepX * index
                : plot.left + innerW / 2;

            const parts = [axes.svg];
            series.forEach((item, sIndex) => {
                const color = item.color || PALETTE[sIndex % PALETTE.length];
                const pts = item.values.map((value, index) => [pointX(index), axes.scaleY(toNumber(value))])
                    .filter(point => Number.isFinite(point[1]));
                if (!pts.length) return;
                if (spec.type === 'area') {
                    const baseY = axes.scaleY(Math.max(domain.min, Math.min(0, domain.max)));
                    const area = `M ${fmt(pts[0][0])} ${fmt(baseY)} L ${pts.map(p => `${fmt(p[0])} ${fmt(p[1])}`).join(' L ')} L ${fmt(pts[pts.length - 1][0])} ${fmt(baseY)} Z`;
                    parts.push(`<path d="${area}" fill="${color}" opacity="0.12"/>`);
                }
                parts.push(`<path d="M ${pts.map(p => `${fmt(p[0])} ${fmt(p[1])}`).join(' L ')}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`);
                pts.forEach(point => {
                    parts.push(`<circle cx="${fmt(point[0])}" cy="${fmt(point[1])}" r="2.7" fill="#ffffff" stroke="${color}" stroke-width="1.3"/>`);
                });
            });
            categories.forEach((label, index) => {
                parts.push(this.xLabel(pointX(index), HEIGHT - plot.bottom + 14, label, categories.length));
            });
            return this.frame(spec, parts.join(''));
        }

        /* ---------------- 散点 + 趋势线 ---------------- */

        renderScatter(spec) {
            const series = normalizeScatterSeries(spec);
            if (!series.length) throw new Error('散点图缺少 points');

            const all = series.flatMap(item => item.points);
            const xDomain = expandDomain(paddedDomain(all.map(p => p[0])), 4);
            const yDomain = expandDomain(paddedDomain(all.map(p => p[1])), 5);
            const plot = { left: 58, right: 18, top: 54, bottom: 52 };
            const sx = value => plot.left + (value - xDomain.min) / (xDomain.max - xDomain.min) * (WIDTH - plot.left - plot.right);
            const sy = value => HEIGHT - plot.bottom - (value - yDomain.min) / (yDomain.max - yDomain.min) * (HEIGHT - plot.top - plot.bottom);
            const parts = [this.gridAndAxes(xDomain, yDomain, plot, sx, sy, spec.x_label || 'x', spec.y_label || 'y', spec.unit)];

            series.forEach((item, sIndex) => {
                const color = item.color || PALETTE[sIndex % PALETTE.length];
                item.points.forEach(point => {
                    parts.push(`<circle cx="${fmt(sx(point[0]))}" cy="${fmt(sy(point[1]))}" r="3.1" fill="${color}" opacity="0.78"/>`);
                });
                if (spec.trend !== false && item.points.length >= 3) {
                    const fit = linearRegression(item.points);
                    if (fit) {
                        const x0 = xDomain.min;
                        const x1 = xDomain.max;
                        parts.push(`<line x1="${fmt(sx(x0))}" y1="${fmt(sy(fit.slope * x0 + fit.intercept))}" x2="${fmt(sx(x1))}" y2="${fmt(sy(fit.slope * x1 + fit.intercept))}" stroke="${color}" stroke-width="1.1" stroke-dasharray="5 4" opacity="0.85"/>`);
                        parts.push(`<text x="${fmt(sx(x1) - 4)}" y="${fmt(sy(fit.slope * x1 + fit.intercept) - 7)}" text-anchor="end" font-family='${SERIF}' font-size="8" fill="${MUTED}">R² = ${fit.r2.toFixed(2)}</text>`);
                    }
                }
            });
            return this.frame(spec, parts.join(''));
        }

        /* ---------------- 控制图 ---------------- */

        renderControl(spec) {
            const values = (spec.values || (spec.series && spec.series[0] && spec.series[0].values) || [])
                .map(toNumber).filter(Number.isFinite);
            if (values.length < 2) throw new Error('控制图缺少 values');
            const center = Number.isFinite(Number(spec.center)) ? Number(spec.center) : mean(values);
            const sigma = Number.isFinite(Number(spec.sigma))
                ? Number(spec.sigma)
                : Math.sqrt(values.reduce((sum, v) => sum + (v - center) ** 2, 0) / Math.max(1, values.length - 1));
            const ucl = Number.isFinite(Number(spec.ucl)) ? Number(spec.ucl) : center + 3 * sigma;
            const lcl = Number.isFinite(Number(spec.lcl)) ? Number(spec.lcl) : center - 3 * sigma;
            const yValues = values.concat([ucl, lcl, center]);
            const domain = expandDomain(paddedDomain(yValues), 5);
            const plot = { left: 58, right: 18, top: 54, bottom: 52 };
            const sx = index => plot.left + (index + 0.5) / values.length * (WIDTH - plot.left - plot.right);
            const sy = value => HEIGHT - plot.bottom - (value - domain.min) / (domain.max - domain.min) * (HEIGHT - plot.top - plot.bottom);
            const parts = [this.gridAndAxes(null, domain, plot, sx, sy, '样本序号', spec.y_label || spec.unit || '观测值')];

            parts.push(`<rect x="${plot.left}" y="${fmt(sy(ucl))}" width="${WIDTH - plot.left - plot.right}" height="${fmt(sy(lcl) - sy(ucl))}" fill="${PALETTE[0]}" opacity="0.05"/>`);
            [ [ucl, '#D55E00', 'UCL'], [center, '#0072B2', 'CL'], [lcl, '#D55E00', 'LCL'] ].forEach(([value, color, label]) => {
                parts.push(`<line x1="${plot.left}" y1="${fmt(sy(value))}" x2="${WIDTH - plot.right}" y2="${fmt(sy(value))}" stroke="${color}" stroke-width="1" stroke-dasharray="${label === 'CL' ? '6 4' : '3 3'}"/>`);
                parts.push(`<text x="${WIDTH - plot.right - 3}" y="${fmt(sy(value) - 3)}" text-anchor="end" font-family='${SERIF}' font-size="8" fill="${color}">${label} ${esc(compactNumber(value))}</text>`);
            });
            parts.push(`<path d="M ${values.map((value, index) => `${fmt(sx(index))} ${fmt(sy(value))}`).join(' L ')}" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.7"/>`);
            values.forEach((value, index) => {
                const out = value > ucl || value < lcl;
                parts.push(`<circle cx="${fmt(sx(index))}" cy="${fmt(sy(value))}" r="${out ? 3.4 : 2.5}" fill="${out ? '#D55E00' : '#ffffff'}" stroke="${out ? '#D55E00' : INK}" stroke-width="1.1"/>`);
            });
            return this.frame(spec, parts.join(''));
        }

        /* ---------------- 饼图 / 环图 ---------------- */

        renderPie(spec) {
            const labels = normalizeCategories(spec);
            let values = Array.isArray(spec.values)
                ? spec.values.map(toNumber)
                : (spec.series && spec.series[0] && spec.series[0].values || []).map(toNumber);
            if (!labels.length || !values.length) throw new Error('饼图缺少 labels/values');
            const count = Math.min(labels.length, values.length);
            const total = values.slice(0, count).reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
            const cx = 148;
            const cy = 164;
            const radius = 88;
            const inner = spec.type === 'donut' ? radius * 0.56 : 0;
            let angle = -Math.PI / 2;
            const parts = [];
            for (let index = 0; index < count; index += 1) {
                const value = Math.max(0, values[index]);
                const sweep = (value / total) * Math.PI * 2;
                const color = (spec.series && spec.series[0] && spec.series[0].colors && spec.series[0].colors[index]) || PALETTE[index % PALETTE.length];
                parts.push(`<path d="${arcPath(cx, cy, radius, angle, angle + sweep, inner)}" fill="${color}" stroke="#ffffff" stroke-width="1.2"/>`);
                if (sweep / (Math.PI * 2) >= 0.05) {
                    const mid = angle + sweep / 2;
                    const labelRadius = inner ? (radius + inner) / 2 : radius * 0.64;
                    parts.push(`<text x="${fmt(cx + Math.cos(mid) * labelRadius)}" y="${fmt(cy + Math.sin(mid) * labelRadius + 3)}" text-anchor="middle" font-family='${SERIF}' font-size="9" fill="#ffffff" font-weight="700">${Math.round(value / total * 100)}%</text>`);
                }
                angle += sweep;
            }
            if (inner) parts.push(`<circle cx="${cx}" cy="${cy}" r="${fmt(inner)}" fill="#ffffff"/>`);
            const legendX = 262;
            let legendY = 112;
            const visible = Math.min(count, 8);
            for (let index = 0; index < visible; index += 1) {
                const color = (spec.series && spec.series[0] && spec.series[0].colors && spec.series[0].colors[index]) || PALETTE[index % PALETTE.length];
                parts.push(`<rect x="${legendX}" y="${legendY - 7}" width="8" height="8" rx="1" fill="${color}"/>`);
                parts.push(`<text x="${legendX + 13}" y="${legendY}" font-family='${SERIF}' font-size="8.8" fill="${INK}">${esc(clip(labels[index], 11))}</text>`);
                parts.push(`<text x="${legendX + 146}" y="${legendY}" text-anchor="end" font-family='${SERIF}' font-size="8.4" fill="${MUTED}">${esc(compactNumber(values[index]))}</text>`);
                legendY += 19;
            }
            if (count > visible) {
                parts.push(`<text x="${legendX}" y="${legendY}" font-family='${SERIF}' font-size="8" fill="${MUTED}">其余 ${count - visible} 项…</text>`);
            }
            return this.frame(spec, parts.join(''));
        }

        /* ---------------- 直方图 ---------------- */

        renderHistogram(spec) {
            const values = (spec.values || []).map(toNumber).filter(Number.isFinite);
            if (values.length < 3) throw new Error('直方图缺少 values');
            const binCount = Math.max(4, Math.min(14, Number(spec.bins) || Math.ceil(Math.log2(values.length) + 1)));
            const min = Math.min(...values);
            const max = Math.max(...values);
            const step = (max - min) / binCount || 1;
            const bins = Array.from({ length: binCount }, (_, index) => ({
                from: min + step * index,
                to: min + step * (index + 1),
                count: 0
            }));
            values.forEach(value => {
                const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - min) / step)));
                bins[index].count += 1;
            });
            const domain = expandDomain(includeZero(bins.map(bin => bin.count)), 5);
            const plot = { left: 58, right: 18, top: 54, bottom: 52 };
            const axes = this.buildAxes(domain, plot, spec.unit, spec.y_label || '频数');
            const innerW = WIDTH - plot.left - plot.right;
            const band = innerW / binCount;
            const parts = [axes.svg];
            bins.forEach((bin, index) => {
                const x = plot.left + band * index + 1.2;
                const y = axes.scaleY(bin.count);
                const baseY = axes.scaleY(0);
                parts.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(band - 2.4)}" height="${fmt(Math.max(1, baseY - y))}" fill="${PALETTE[0]}" opacity="0.8"/>`);
                if (index % 2 === 0) {
                    parts.push(`<text x="${fmt(plot.left + band * index + band / 2)}" y="${HEIGHT - plot.bottom + 14}" text-anchor="middle" font-family='${SERIF}' font-size="8" fill="${MUTED}">${esc(compactNumber(bin.from))}</text>`);
                }
            });
            return this.frame(spec, parts.join(''));
        }

        /* ---------------- 箱线图 ---------------- */

        renderBox(spec) {
            const series = normalizeSeries(spec, normalizeCategories(spec).length);
            if (!series.length) throw new Error('箱线图缺少 series');
            const stats = series.map((item, index) => ({ ...boxStats(item.values), name: item.name || `组 ${index + 1}`, color: item.color || PALETTE[index % PALETTE.length] }));
            const domain = expandDomain(paddedDomain(stats.flatMap(item => [item.min, item.max])), 5);
            const plot = { left: 58, right: 18, top: 54, bottom: 52 };
            const axes = this.buildAxes(domain, plot, spec.unit, spec.y_label);
            const innerW = WIDTH - plot.left - plot.right;
            const band = innerW / stats.length;
            const boxW = Math.min(34, band * 0.5);
            const parts = [axes.svg];
            stats.forEach((item, index) => {
                const cx = plot.left + band * index + band / 2;
                parts.push(`<line x1="${fmt(cx)}" y1="${fmt(axes.scaleY(item.min))}" x2="${fmt(cx)}" y2="${fmt(axes.scaleY(item.max))}" stroke="${INK}" stroke-width="1"/>`);
                parts.push(`<line x1="${fmt(cx - boxW / 3)}" y1="${fmt(axes.scaleY(item.min))}" x2="${fmt(cx + boxW / 3)}" y2="${fmt(axes.scaleY(item.min))}" stroke="${INK}" stroke-width="1"/>`);
                parts.push(`<line x1="${fmt(cx - boxW / 3)}" y1="${fmt(axes.scaleY(item.max))}" x2="${fmt(cx + boxW / 3)}" y2="${fmt(axes.scaleY(item.max))}" stroke="${INK}" stroke-width="1"/>`);
                parts.push(`<rect x="${fmt(cx - boxW / 2)}" y="${fmt(axes.scaleY(item.q3))}" width="${fmt(boxW)}" height="${fmt(Math.max(1, axes.scaleY(item.q1) - axes.scaleY(item.q3)))}" fill="${item.color}" opacity="0.2" stroke="${item.color}" stroke-width="1.2"/>`);
                parts.push(`<line x1="${fmt(cx - boxW / 2)}" y1="${fmt(axes.scaleY(item.median))}" x2="${fmt(cx + boxW / 2)}" y2="${fmt(axes.scaleY(item.median))}" stroke="${item.color}" stroke-width="2"/>`);
                item.outliers.forEach(value => {
                    parts.push(`<circle cx="${fmt(cx)}" cy="${fmt(axes.scaleY(value))}" r="2" fill="none" stroke="${item.color}" stroke-width="1"/>`);
                });
                parts.push(`<text x="${fmt(cx)}" y="${HEIGHT - plot.bottom + 14}" text-anchor="middle" font-family='${SERIF}' font-size="8.4" fill="${MUTED}">${esc(clip(item.name, 10))}</text>`);
            });
            return this.frame(spec, parts.join(''));
        }

        /* ---------------- 帕累托图 ---------------- */

        renderPareto(spec) {
            const labels = normalizeCategories(spec);
            let values = (spec.values || (spec.series && spec.series[0] && spec.series[0].values) || []).map(toNumber);
            if (!labels.length || !values.length) throw new Error('帕累托图缺少 labels/values');
            let pairs = labels.map((label, index) => ({ label, value: values[index] || 0 })).sort((a, b) => b.value - a.value);
            if (pairs.length > 12) {
                const head = pairs.slice(0, 11);
                const rest = pairs.slice(11).reduce((sum, item) => sum + item.value, 0);
                pairs = head.concat([{ label: '其他', value: rest }]);
            }
            const total = pairs.reduce((sum, item) => sum + item.value, 0) || 1;
            const domain = expandDomain(includeZero(pairs.map(item => item.value)), 5);
            const plot = { left: 58, right: 46, top: 54, bottom: 52 };
            const axes = this.buildAxes(domain, plot, spec.unit, spec.y_label);
            const innerW = WIDTH - plot.left - plot.right;
            const band = innerW / pairs.length;
            const baseY = axes.scaleY(0);
            const parts = [axes.svg];
            let cumulative = 0;
            const linePoints = [];
            pairs.forEach((item, index) => {
                const x = plot.left + band * index + band * 0.16;
                const width = band * 0.68;
                const y = axes.scaleY(item.value);
                parts.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(width)}" height="${fmt(Math.max(1, baseY - y))}" fill="${PALETTE[0]}" opacity="0.9"/>`);
                cumulative += item.value;
                const pct = cumulative / total * 100;
                linePoints.push([plot.left + band * index + band / 2, HEIGHT - plot.bottom - pct / 100 * (HEIGHT - plot.top - plot.bottom)]);
                parts.push(`<text x="${fmt(x + width / 2)}" y="${HEIGHT - plot.bottom + 13}" text-anchor="end" transform="rotate(-32 ${fmt(x + width / 2)} ${HEIGHT - plot.bottom + 13})" font-family='${SERIF}' font-size="7.4" fill="${MUTED}">${esc(clip(item.label, 9))}</text>`);
            });
            parts.push(`<path d="M ${linePoints.map(p => `${fmt(p[0])} ${fmt(p[1])}`).join(' L ')}" fill="none" stroke="${PALETTE[1]}" stroke-width="1.3"/>`);
            linePoints.forEach(point => parts.push(`<circle cx="${fmt(point[0])}" cy="${fmt(point[1])}" r="2.3" fill="${PALETTE[1]}"/>`));
            [0, 25, 50, 75, 100].forEach(pct => {
                const y = HEIGHT - plot.bottom - pct / 100 * (HEIGHT - plot.top - plot.bottom);
                parts.push(`<text x="${WIDTH - plot.right + 5}" y="${fmt(y + 3)}" font-family='${SERIF}' font-size="7.6" fill="${MUTED}">${pct}%</text>`);
            });
            return this.frame(spec, parts.join(''));
        }

        /* ---------------- 坐标轴 ---------------- */

        buildAxes(domain, plot, unit = '', yLabel = '') {
            const innerH = HEIGHT - plot.top - plot.bottom;
            const innerW = WIDTH - plot.left - plot.right;
            const scaleY = value => HEIGHT - plot.bottom - (value - domain.min) / (domain.max - domain.min) * innerH;
            const ticks = niceTicks(domain.min, domain.max, 5);
            const svg = [];
            ticks.forEach(value => {
                const y = scaleY(value);
                svg.push(`<line x1="${plot.left}" y1="${fmt(y)}" x2="${WIDTH - plot.right}" y2="${fmt(y)}" stroke="${GRID}" stroke-width="0.7" stroke-dasharray="2 3"/>`);
                svg.push(`<text x="${plot.left - 7}" y="${fmt(y + 3)}" text-anchor="end" font-family='${SERIF}' font-size="8.2" fill="${MUTED}">${esc(compactNumber(value))}</text>`);
            });
            svg.push(`<line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${HEIGHT - plot.bottom}" stroke="${INK}" stroke-width="0.9"/>`);
            svg.push(`<line x1="${plot.left}" y1="${HEIGHT - plot.bottom}" x2="${WIDTH - plot.right}" y2="${HEIGHT - plot.bottom}" stroke="${INK}" stroke-width="0.9"/>`);
            if (unit) {
                svg.push(`<text x="${plot.left - 42}" y="${plot.top - 8}" font-family='${SERIF}' font-size="8.2" fill="${MUTED}">${esc(unit)}</text>`);
            }
            if (yLabel) {
                svg.push(`<text transform="translate(13 ${fmt(plot.top + innerH / 2)}) rotate(-90)" text-anchor="middle" font-family='${SERIF}' font-size="8.4" fill="${MUTED}">${esc(yLabel)}</text>`);
            }
            return { svg: svg.join(''), scaleY, ticks };
        }

        gridAndAxes(xDomain, yDomain, plot, sx, sy, xLabel, yLabel, unit = '') {
            const svg = [];
            const yTicks = niceTicks(yDomain.min, yDomain.max, 5);
            yTicks.forEach(value => {
                const y = sy(value);
                svg.push(`<line x1="${plot.left}" y1="${fmt(y)}" x2="${WIDTH - plot.right}" y2="${fmt(y)}" stroke="${GRID}" stroke-width="0.7" stroke-dasharray="2 3"/>`);
                svg.push(`<text x="${plot.left - 7}" y="${fmt(y + 3)}" text-anchor="end" font-family='${SERIF}' font-size="8.2" fill="${MUTED}">${esc(compactNumber(value))}</text>`);
            });
            if (xDomain) {
                const xTicks = niceTicks(xDomain.min, xDomain.max, 4);
                xTicks.forEach(value => {
                    const x = sx(value);
                    svg.push(`<text x="${fmt(x)}" y="${HEIGHT - plot.bottom + 14}" text-anchor="middle" font-family='${SERIF}' font-size="8.2" fill="${MUTED}">${esc(compactNumber(value))}</text>`);
                });
            }
            svg.push(`<line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${HEIGHT - plot.bottom}" stroke="${INK}" stroke-width="0.9"/>`);
            svg.push(`<line x1="${plot.left}" y1="${HEIGHT - plot.bottom}" x2="${WIDTH - plot.right}" y2="${HEIGHT - plot.bottom}" stroke="${INK}" stroke-width="0.9"/>`);
            if (xLabel) svg.push(`<text x="${fmt((plot.left + WIDTH - plot.right) / 2)}" y="${HEIGHT - 8}" text-anchor="middle" font-family='${SERIF}' font-size="8.6" fill="${MUTED}">${esc(xLabel)}</text>`);
            if (yLabel) svg.push(`<text transform="translate(13 ${fmt(plot.top + (HEIGHT - plot.top - plot.bottom) / 2)}) rotate(-90)" text-anchor="middle" font-family='${SERIF}' font-size="8.6" fill="${MUTED}">${esc(yLabel)}</text>`);
            if (unit) svg.push(`<text x="${plot.left - 42}" y="${plot.top - 8}" font-family='${SERIF}' font-size="8.2" fill="${MUTED}">${esc(unit)}</text>`);
            return svg.join('');
        }

        xLabel(x, y, label, count) {
            const text = String(label == null ? '' : label);
            if (count > 6 || text.length > 7) {
                return `<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="end" transform="rotate(-32 ${fmt(x)} ${fmt(y)})" font-family='${SERIF}' font-size="7.8" fill="${MUTED}">${esc(clip(text, 12))}</text>`;
            }
            return `<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" font-family='${SERIF}' font-size="8.2" fill="${MUTED}">${esc(text)}</text>`;
        }
    }

    /* ---------------- 数据与数学工具 ---------------- */

    function inferType(spec) {
        if (spec.points || (Array.isArray(spec.x) && Array.isArray(spec.y))) return 'scatter';
        if (spec.values && spec.labels) return 'bar';
        if (spec.series && spec.series.some(item => Array.isArray(item.values))) return 'line';
        return '';
    }

    /**
     * 解析 Mermaid 的 pie / xychart-beta 语法，返回本渲染器的 spec。
     * 只覆盖历史消息里最常见的两种统计图；解析失败则交回 Mermaid 原渲染器。
     */
    function parseMermaidChart(code) {
        const lines = String(code || '').split('\n').map(line => line.trim()).filter(Boolean);
        if (!lines.length) return null;
        const head = lines[0].toLowerCase();

        if (head.startsWith('pie')) {
            const titleLine = lines.find(line => /^pie\s+(?:showData\s+)?title\s+/i.test(line))
                || lines.find(line => /^pie\s+/i.test(line) && !/^pie\s*$/i.test(line));
            const title = titleLine
                ? titleLine.replace(/^pie\s+(?:showData\s+)?(?:title\s+)?/i, '').replace(/^"|"$/g, '').trim()
                : '';
            const categories = [];
            const values = [];
            lines.slice(1).forEach(line => {
                const match = line.match(/^"([^"]+)"\s*:\s*([\d.]+)/);
                if (!match) return;
                categories.push(match[1]);
                values.push(Number(match[2]));
            });
            if (categories.length < 2 || !values.every(Number.isFinite)) return null;
            return { type: 'pie', title, categories, values };
        }

        if (head.startsWith('xychart')) {
            const titleLine = lines.find(line => /^title\s+/i.test(line));
            const title = titleLine ? titleLine.replace(/^title\s+/i, '').replace(/^"|"$/g, '').trim() : '';
            const xLine = lines.find(line => /^x-axis\s+/i.test(line));
            const yLine = lines.find(line => /^y-axis\s+/i.test(line));
            const barLine = lines.find(line => /^bar\s+\[/i.test(line));
            const lineLine = lines.find(line => /^line\s+\[/i.test(line));
            const parseList = line => {
                const match = String(line || '').match(/\[([^\]]+)\]/);
                return match ? match[1].split(',').map(item => item.trim().replace(/^"|"$/g, '')) : [];
            };
            const categories = xLine ? parseList(xLine) : [];
            const values = barLine ? parseList(barLine).map(Number) : parseList(lineLine).map(Number);
            if (!categories.length || !values.length || !values.every(Number.isFinite)) return null;
            const unitMatch = yLine ? yLine.match(/"([^"]*)"/) : null;
            return {
                type: barLine ? 'bar' : 'line',
                title,
                unit: unitMatch ? unitMatch[1] : '',
                categories,
                series: [{ name: title || '数值', values }]
            };
        }

        return null;
    }

    function normalizeCategories(spec) {
        if (Array.isArray(spec.categories)) return spec.categories.map(String);
        if (Array.isArray(spec.labels)) return spec.labels.map(String);
        if (Array.isArray(spec.x)) return spec.x.map(String);
        const series = Array.isArray(spec.series) ? spec.series.find(item => Array.isArray(item.values)) : null;
        if (series) return series.values.map((_, index) => String(index + 1));
        return [];
    }

    function normalizeSeries(spec, length = 0) {
        let series = Array.isArray(spec.series) ? spec.series : [];
        if (!series.length && Array.isArray(spec.values)) {
            series = [{ name: spec.name || spec.unit || '数值', values: spec.values }];
        }
        return series.map((item, index) => {
            const values = Array.isArray(item.values) ? item.values : [];
            return {
                name: item.name || `系列 ${index + 1}`,
                color: item.color,
                values: length ? Array.from({ length }, (_, i) => values[i]) : values
            };
        }).filter(item => item.values.some(value => Number.isFinite(toNumber(value))));
    }

    function normalizeScatterSeries(spec) {
        let series = Array.isArray(spec.series) ? spec.series : [];
        if (!series.length && (Array.isArray(spec.points) || (Array.isArray(spec.x) && Array.isArray(spec.y)))) {
            series = [{ name: spec.name || '样本', points: spec.points }];
        }
        return series.map((item, index) => {
            let points = Array.isArray(item.points) ? item.points : [];
            if (!points.length && Array.isArray(item.x) && Array.isArray(item.y)) {
                points = item.x.map((x, i) => [x, item.y[i]]);
            }
            if (!points.length && Array.isArray(spec.x) && Array.isArray(spec.y)) {
                points = spec.x.map((x, i) => [x, spec.y[i]]);
            }
            return {
                name: item.name || `系列 ${index + 1}`,
                color: item.color,
                points: points.map(point => Array.isArray(point) ? [toNumber(point[0]), toNumber(point[1])] : null)
                    .filter(point => point && Number.isFinite(point[0]) && Number.isFinite(point[1]))
            };
        }).filter(item => item.points.length);
    }

    function includeZero(values) {
        const nums = values.filter(Number.isFinite);
        let min = Math.min(...nums);
        let max = Math.max(...nums);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
        min = Math.min(0, min);
        max = Math.max(0, max);
        if (min === max) max = min + 1;
        return { min, max };
    }

    // 把坐标轴范围扩到最近的刻度，避免顶端刻度画到标题区域。
    function expandDomain(domain, count) {
        const ticks = niceTicks(domain.min, domain.max, count);
        if (!ticks.length) return domain;
        return {
            min: Math.min(domain.min, ticks[0]),
            max: Math.max(domain.max, ticks[ticks.length - 1])
        };
    }

    function paddedDomain(values) {
        const nums = values.filter(Number.isFinite);
        if (!nums.length) return { min: 0, max: 1 };
        let min = Math.min(...nums);
        let max = Math.max(...nums);
        const pad = (max - min || Math.abs(max) || 1) * 0.08;
        min -= pad;
        max += pad;
        if (min === max) max = min + 1;
        return { min, max };
    }

    function niceTicks(min, max, count) {
        if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min || 0];
        const range = niceNum(max - min, false);
        const step = niceNum(range / Math.max(1, count - 1), true);
        const start = Math.floor(min / step) * step;
        const end = Math.ceil(max / step) * step;
        const ticks = [];
        for (let value = start; value <= end + step * 0.001; value += step) {
            ticks.push(Math.abs(value) < step * 1e-9 ? 0 : Number(value.toFixed(10)));
            if (ticks.length > 20) break;
        }
        return ticks;
    }

    function niceNum(range, round) {
        const exponent = Math.floor(Math.log10(range || 1));
        const fraction = (range || 1) / Math.pow(10, exponent);
        let niceFraction;
        if (round) {
            if (fraction < 1.5) niceFraction = 1;
            else if (fraction < 3) niceFraction = 2;
            else if (fraction < 7) niceFraction = 5;
            else niceFraction = 10;
        } else if (fraction <= 1) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
        return niceFraction * Math.pow(10, exponent);
    }

    function linearRegression(points) {
        const n = points.length;
        if (n < 2) return null;
        const sumX = points.reduce((sum, p) => sum + p[0], 0);
        const sumY = points.reduce((sum, p) => sum + p[1], 0);
        const meanX = sumX / n;
        const meanY = sumY / n;
        let num = 0;
        let den = 0;
        points.forEach(p => {
            num += (p[0] - meanX) * (p[1] - meanY);
            den += (p[0] - meanX) ** 2;
        });
        if (!den) return null;
        const slope = num / den;
        const intercept = meanY - slope * meanX;
        let ssTot = 0;
        let ssRes = 0;
        points.forEach(p => {
            const predicted = slope * p[0] + intercept;
            ssTot += (p[1] - meanY) ** 2;
            ssRes += (p[1] - predicted) ** 2;
        });
        return { slope, intercept, r2: ssTot ? Math.max(0, 1 - ssRes / ssTot) : 0 };
    }

    function boxStats(values) {
        const nums = values.map(toNumber).filter(Number.isFinite).sort((a, b) => a - b);
        if (!nums.length) return { min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] };
        const q1 = quantile(nums, 0.25);
        const median = quantile(nums, 0.5);
        const q3 = quantile(nums, 0.75);
        const iqr = q3 - q1;
        const lowFence = q1 - 1.5 * iqr;
        const highFence = q3 + 1.5 * iqr;
        const inside = nums.filter(value => value >= lowFence && value <= highFence);
        return {
            min: inside.length ? inside[0] : nums[0],
            q1,
            median,
            q3,
            max: inside.length ? inside[inside.length - 1] : nums[nums.length - 1],
            outliers: nums.filter(value => value < lowFence || value > highFence)
        };
    }

    function quantile(sorted, p) {
        const index = (sorted.length - 1) * p;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        if (lower === upper) return sorted[lower];
        return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
    }

    function mean(values) {
        return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    }

    function arcPath(cx, cy, r, start, end, inner = 0) {
        const x0 = cx + r * Math.cos(start);
        const y0 = cy + r * Math.sin(start);
        const x1 = cx + r * Math.cos(end);
        const y1 = cy + r * Math.sin(end);
        const large = end - start > Math.PI ? 1 : 0;
        if (!inner) {
            return `M ${fmt(cx)} ${fmt(cy)} L ${fmt(x0)} ${fmt(y0)} A ${r} ${r} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)} Z`;
        }
        const ix1 = cx + inner * Math.cos(end);
        const iy1 = cy + inner * Math.sin(end);
        const ix0 = cx + inner * Math.cos(start);
        const iy0 = cy + inner * Math.sin(start);
        return `M ${fmt(x0)} ${fmt(y0)} A ${r} ${r} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)} L ${fmt(ix1)} ${fmt(iy1)} A ${inner} ${inner} 0 ${large} 0 ${fmt(ix0)} ${fmt(iy0)} Z`;
    }

    function compactNumber(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '';
        const abs = Math.abs(number);
        if (abs >= 1e8) return (number / 1e8).toFixed(abs >= 1e9 ? 0 : 1) + '亿';
        if (abs >= 1e4) return (number / 1e4).toFixed(abs >= 1e5 ? 0 : 1) + '万';
        if (abs >= 1000) return number.toLocaleString('en-US');
        if (Number.isInteger(number)) return String(number);
        return number.toFixed(abs < 1 ? 2 : 1);
    }

    function toNumber(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleaned = value.replace(/[,，%$￥]/g, '').trim();
            const num = Number(cleaned);
            return Number.isFinite(num) ? num : NaN;
        }
        return NaN;
    }

    function clip(text, max) {
        const str = String(text || '');
        return str.length <= max ? str : str.slice(0, max - 1) + '…';
    }

    function measure(text) {
        return Array.from(String(text || '')).length;
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function fmt(value) {
        return Number.isFinite(value) ? value.toFixed(2) : '0';
    }

    window.AgentChartRenderer = AgentChartRenderer;
    window.agentChartRenderer = window.agentChartRenderer || new AgentChartRenderer();

    function bootstrap() {
        const renderer = window.agentChartRenderer;
        if (!renderer) return;
        renderer.start();
        setTimeout(() => renderer.renderAll(document), 1400);
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
        } else {
            bootstrap();
        }
    }
})();
