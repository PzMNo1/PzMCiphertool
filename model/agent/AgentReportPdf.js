/**
 * AgentReportPdf - 将 Agent 正文导出为文字可选、图片可缩放的 PDF。
 */
(function () {
    const H2C_SRC = new URL('../../vendor/html2canvas/html2canvas.min.js', document.currentScript?.src || document.baseURI).href;
    const JSPDF_SRC = new URL('../../vendor/jspdf/jspdf.umd.min.js', document.currentScript?.src || document.baseURI).href;
    const FONT_SRC = new URL('../../vendor/fonts/pzm-report-sans.ttf', document.currentScript?.src || document.baseURI).href;
    const FONT_VFS = 'pzm-report-sans.ttf';
    const FONT_NAME = 'PzMReport';

    const A4 = { width: 210, height: 297 };
    const MARGIN = { left: 16, right: 16, top: 16, bottom: 18 };
    const CONTENT_WIDTH = A4.width - MARGIN.left - MARGIN.right;
    const PAGE_BOTTOM = A4.height - MARGIN.bottom;
    const BODY_SIZE = 10.2;
    const BODY_LINE_HEIGHT = 1.68;
    const INK = [28, 40, 52];
    const MUTED = [104, 120, 134];
    const ACCENT = [25, 99, 148];
    const SUP_START = '\uE000';
    const SUP_END = '\uE001';
    const SUP_SCALE = 0.68;
    const SUP_LIFT = 0.32;
    const SUP_COLOR = [27, 112, 164];
    const WATERMARK_TEXT = '【来自www.paomian233.com的PzM Agent】';

    const DROP_SELECTORS = [
        '.agent-pdf-bar',
        '.agent-run-panel',
        '.agent-thought-panel',
        '.agent-event-panel',
        '.agent-tool-deck',
        '.agent-stage-strip',
        '.agent-approval-deck',
        '.cursor-blink',
        'button',
        'script',
        'style',
        'noscript',
        'template'
    ].join(',');

    const PRINT_DIAGRAM_SVG_CSS = `
        text, tspan, .label, .nodeLabel, .edgeLabel, .actor-label, .messageText,
        .taskText, .taskTextOutsideRight, .taskTextOutsideLeft, .timeline-node text {
            fill: #1F2D3A !important;
            color: #1F2D3A !important;
        }
        .node rect, .node circle, .node ellipse, .node polygon, .node path,
        .label-container, .cluster rect, .cluster polygon,
        .timeline-node .node-bkg, .taskWrapper .timeline-node .node-bkg,
        .eventWrapper .timeline-node .node-bkg, .actor, .note {
            fill: #F2F7FC !important;
            stroke: #8DA6BA !important;
        }
        .cluster rect, .cluster polygon { fill: #F8FBFE !important; }
        .edgePath path, .flowchart-link, .relation,
        .messageLine0, .messageLine1, .actor-line,
        .lineWrapper line, .timeline-node line {
            fill: none !important;
            stroke: #647F95 !important;
        }
        .edgeLabel rect, .labelBkg { fill: #FFFFFF !important; opacity: 0.9 !important; }
        marker path { fill: #647F95 !important; stroke: #647F95 !important; }
        .grid .tick line { stroke: #BCCBD7 !important; }
        .grid .tick text { fill: #647F95 !important; }
    `;

    const BLOCK_TAGS = new Set([
        'address', 'article', 'aside', 'blockquote', 'details', 'div', 'figure',
        'figcaption', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
        'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary',
        'table', 'ul'
    ]);

    class AgentReportPdf {
        constructor(options = {}) {
            this.options = Object.assign({
                jsPdfSrc: JSPDF_SRC,
                h2cSrc: H2C_SRC,
                fontSrc: FONT_SRC,
                imageScale: 2.5,
                jpegQuality: 0.92
            }, options || {});
            this.scriptPromise = null;
            this.h2cPromise = null;
            this.fontPromise = null;
            this.exportChain = Promise.resolve();
            this.pdf = null;
            this.y = MARGIN.top;
        }

        loadScript(src) {
            if (!window.__pzmPdfScripts) window.__pzmPdfScripts = {};
            const cache = window.__pzmPdfScripts;
            if (cache[src]) return cache[src];
            cache[src] = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => {
                    delete cache[src];
                    reject(new Error(`加载失败：${src}`));
                };
                document.head.appendChild(script);
            });
            return cache[src];
        }

        async ensureJsPdf() {
            if (this.scriptPromise) return this.scriptPromise;
            this.scriptPromise = (async () => {
                if (!window.jspdf && !window.jsPDF) await this.loadScript(this.options.jsPdfSrc);
                const JsPDF = window.jspdf?.jsPDF || window.jsPDF;
                if (!JsPDF) throw new Error('PDF 组件未就绪');
                return JsPDF;
            })().catch(error => {
                this.scriptPromise = null;
                throw error;
            });
            return this.scriptPromise;
        }

        async ensureHtml2Canvas() {
            if (this.h2cPromise) return this.h2cPromise;
            this.h2cPromise = (async () => {
                if (!window.html2canvas) await this.loadScript(this.options.h2cSrc);
                if (!window.html2canvas) throw new Error('图表截图组件未就绪');
                return window.html2canvas;
            })().catch(error => {
                this.h2cPromise = null;
                throw error;
            });
            return this.h2cPromise;
        }

        arrayBufferToBase64(buffer) {
            const bytes = new Uint8Array(buffer);
            const chunkSize = 0x8000;
            let binary = '';
            for (let index = 0; index < bytes.length; index += chunkSize) {
                binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
            }
            return btoa(binary);
        }

        async loadFont() {
            if (this.fontPromise) return this.fontPromise;
            this.fontPromise = (async () => {
                const response = await fetch(this.options.fontSrc);
                if (!response.ok) throw new Error('PDF 字体加载失败');
                return this.arrayBufferToBase64(await response.arrayBuffer());
            })().catch(error => {
                this.fontPromise = null;
                throw error;
            });
            return this.fontPromise;
        }

        async createPdf(title) {
            const JsPDF = await this.ensureJsPdf();
            const fontBase64 = await this.loadFont();
            const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
            pdf.addFileToVFS(FONT_VFS, fontBase64);
            pdf.addFont(FONT_VFS, FONT_NAME, 'normal');
            pdf.setFont(FONT_NAME, 'normal');
            pdf.setProperties({
                title: title || 'PzM Agent 报告',
                subject: 'PzM Agent 导出报告',
                creator: 'PzM Agent'
            });
            this.pdf = pdf;
            return pdf;
        }

        fontMm(size) {
            return size * 25.4 / 72;
        }

        setFont(size, color = INK) {
            this.pdf.setFont(FONT_NAME, 'normal');
            this.pdf.setFontSize(size);
            this.pdf.setTextColor(color[0], color[1], color[2]);
        }

        async yieldToMain() {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        emitProgress(options, payload) {
            if (typeof options?.onProgress === 'function') {
                try { options.onProgress(payload); } catch (error) { /* ignore callback errors */ }
            }
        }

        newPage() {
            this.pdf.addPage();
            this.y = MARGIN.top;
        }

        ensureSpace(height) {
            if (this.y + height > PAGE_BOTTOM && this.y > MARGIN.top + 0.1) {
                this.newPage();
            }
        }

        normalizeText(value) {
            return String(value || '')
                .replace(/\u00a0/g, ' ')
                .replace(/[ \t\f\v]+/g, ' ')
                .replace(/\s*\n\s*/g, ' ')
                .trim();
        }

        inlineText(node) {
            if (!node) return '';
            const clone = node.cloneNode(true);
            clone.querySelectorAll('br').forEach(br => br.replaceWith(document.createTextNode('\n')));
            clone.querySelectorAll('.agent-chart-caption').forEach(caption => caption.remove());
            clone.querySelectorAll(DROP_SELECTORS).forEach(item => item.remove());
            Array.from(clone.querySelectorAll('.citation-link, sup'))
                .filter(item => !item.querySelector('.citation-link, sup'))
                .forEach(item => {
                    const text = this.normalizeText(item.textContent || '');
                    if (!text) {
                        item.remove();
                        return;
                    }
                    item.replaceWith(document.createTextNode(`${SUP_START}${text}${SUP_END}`));
                });
            return this.normalizeText(clone.textContent);
        }

        plainText(value) {
            return String(value ?? '').replaceAll(SUP_START, '').replaceAll(SUP_END, '');
        }

        stripNestedLists(item) {
            const clone = item.cloneNode(true);
            const nested = Array.from(clone.querySelectorAll(':scope > ul, :scope > ol'));
            nested.forEach(list => list.remove());
            return { clone, nested };
        }

        collectList(list, blocks, depth = 0) {
            const ordered = list.tagName === 'OL';
            let index = Number(list.getAttribute('start') || 1);
            if (!Number.isFinite(index) || index < 1) index = 1;
            Array.from(list.children).filter(child => child.tagName === 'LI').forEach(item => {
                const { clone, nested } = this.stripNestedLists(item);
                const text = this.inlineText(clone);
                if (text) {
                    blocks.push({
                        kind: 'list-item',
                        text,
                        marker: ordered ? `${index}.` : '•',
                        depth
                    });
                }
                index += 1;
                nested.forEach(childList => this.collectList(childList, blocks, depth + 1));
            });
        }

        isBlockish(node) {
            if (!node || node.nodeType !== 1) return false;
            if (node.matches('.agent-diagram, .agent-chart, img, svg, table, pre, blockquote, ul, ol, hr')) return true;
            return BLOCK_TAGS.has(node.tagName.toLowerCase());
        }

        hasBlockChildren(node) {
            return Array.from(node.children).some(child => this.isBlockish(child));
        }

        collectBlocks(root) {
            const blocks = [];
            const visit = node => {
                if (!node) return;
                if (node.nodeType === 3) {
                    const text = this.normalizeText(node.textContent);
                    if (text) blocks.push({ kind: 'paragraph', text });
                    return;
                }
                if (node.nodeType !== 1) return;
                const tag = node.tagName.toLowerCase();
                if (node.matches(DROP_SELECTORS)) return;
                if (node.hidden || node.getAttribute('aria-hidden') === 'true') return;

                if (node.matches('.agent-diagram, .agent-chart')) {
                    blocks.push({ kind: 'figure', node });
                    return;
                }
                if (tag === 'img') {
                    blocks.push({ kind: 'image', node });
                    return;
                }
                if (tag === 'svg') {
                    blocks.push({ kind: 'figure', node, bareSvg: true });
                    return;
                }
                if (tag === 'hr') {
                    blocks.push({ kind: 'divider' });
                    return;
                }
                if (tag === 'table') {
                    blocks.push({ kind: 'table', node });
                    return;
                }
                if (node.matches('.markdown-table-wrap')) {
                    const table = node.querySelector('table');
                    if (table) blocks.push({ kind: 'table', node: table });
                    else Array.from(node.childNodes).forEach(visit);
                    return;
                }
                if (tag === 'pre') {
                    const codeNode = node.querySelector('code') || node;
                    blocks.push({ kind: 'code', text: String(codeNode.textContent || '').replace(/\r/g, '').replace(/\s+$/, '') });
                    return;
                }
                if (/^h[1-6]$/.test(tag)) {
                    const text = this.inlineText(node);
                    if (text) blocks.push({ kind: 'heading', level: Number(tag.slice(1)), text });
                    return;
                }
                if (tag === 'blockquote') {
                    const text = this.inlineText(node);
                    if (text) blocks.push({ kind: 'quote', text });
                    return;
                }
                if (tag === 'ul' || tag === 'ol') {
                    this.collectList(node, blocks, 0);
                    return;
                }
                if (node.matches('.math-block')) {
                    const text = String(node.textContent || '').trim();
                    if (text) blocks.push({ kind: 'code', text, math: true });
                    return;
                }
                if (node.matches('.news-story-heading')) {
                    const text = this.inlineText(node);
                    if (text) blocks.push({ kind: 'subheading', text });
                    return;
                }
                if (node.matches('.markdown-source-line')) {
                    const text = this.inlineText(node);
                    if (text) blocks.push({ kind: 'source', text });
                    return;
                }
                if (node.matches('.generated-image-grid')) {
                    Array.from(node.querySelectorAll('img')).forEach(img => blocks.push({ kind: 'image', node: img }));
                    return;
                }

                if (this.hasBlockChildren(node)) {
                    Array.from(node.childNodes).forEach(visit);
                    return;
                }

                const text = this.inlineText(node);
                if (text) {
                    blocks.push({ kind: 'paragraph', text });
                } else {
                    Array.from(node.childNodes).forEach(visit);
                }
            };
            Array.from(root.childNodes).forEach(visit);
            return blocks;
        }

        prepareClone(source) {
            const clone = source.cloneNode(true);
            clone.querySelectorAll(DROP_SELECTORS).forEach(node => node.remove());
            clone.querySelectorAll('[hidden]').forEach(node => node.remove());
            return clone;
        }

        wrapTokens(value) {
            const pattern = /(\s+)|(\[[0-9]+\])|([A-Za-z0-9]+(?:['’._%+\-/][A-Za-z0-9]+)*%?)|([\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F])|([\s\S])/gu;
            const tokens = [];
            const pushPlain = (text, sup) => {
                if (!text) return;
                pattern.lastIndex = 0;
                let match;
                while ((match = pattern.exec(text))) {
                    if (match[1]) tokens.push({ type: 'space', text: ' ', sup });
                    else if (match[2] || match[3]) tokens.push({ type: 'word', text: match[0], sup });
                    else tokens.push({ type: 'char', text: match[0], sup });
                }
            };
            let cursor = 0;
            while (cursor < value.length) {
                const start = value.indexOf(SUP_START, cursor);
                if (start < 0) {
                    pushPlain(value.slice(cursor), false);
                    break;
                }
                if (start > cursor) pushPlain(value.slice(cursor, start), false);
                const end = value.indexOf(SUP_END, start + 1);
                if (end < 0) {
                    pushPlain(value.slice(start + 1).replaceAll(SUP_END, ''), true);
                    break;
                }
                pushPlain(value.slice(start + 1, end), true);
                cursor = end + 1;
            }
            return tokens;
        }

        adjustWrappedPunctuation(lines, maxWidth) {
            if (lines.length < 2) return lines;
            const noStart = /^[，。！？；：、）》」』】〕〉…,.!?;:%\]】}]/;
            const measure = text => this.pdf.getTextWidth(text);
            for (let index = 1; index < lines.length; index += 1) {
                if (lines[index].includes(SUP_START) || lines[index - 1].includes(SUP_START)) continue;
                let guard = 0;
                while (lines[index] && noStart.test(lines[index]) && lines[index - 1].length > 1 && guard < 4) {
                    const previousChars = Array.from(lines[index - 1]);
                    const moved = previousChars.pop();
                    const nextLine = moved + lines[index];
                    if (measure(nextLine) > maxWidth) break;
                    lines[index - 1] = previousChars.join('');
                    lines[index] = nextLine;
                    guard += 1;
                }
            }
            return lines;
        }

        wrapLine(value, width) {
            const maxWidth = Math.max(1, width - 0.25);
            const tokens = this.wrapTokens(value);
            const lines = [];
            let current = '';
            let currentWidth = 0;
            let pendingSpace = false;
            const measure = text => this.pdf.getTextWidth(text);
            const spaceWidth = measure(' ');
            const marked = (text, sup) => sup ? `${SUP_START}${text}${SUP_END}` : text;
            const flush = () => {
                const text = current.replace(/[ \t]+$/g, '');
                if (text) lines.push(text);
                current = '';
                currentWidth = 0;
                pendingSpace = false;
            };
            const addChars = (text, sup) => {
                Array.from(text).forEach(char => {
                    const prefixWidth = pendingSpace && current ? spaceWidth : 0;
                    const charWidth = measure(char) * (sup ? SUP_SCALE : 1);
                    if (!current || currentWidth + prefixWidth + charWidth <= maxWidth) {
                        current += (pendingSpace && current ? ' ' : '') + marked(char, sup);
                        currentWidth += prefixWidth + charWidth;
                    } else {
                        flush();
                        current = marked(char, sup);
                        currentWidth = charWidth;
                    }
                    pendingSpace = false;
                });
            };
            tokens.forEach(token => {
                if (token.type === 'space') {
                    if (current) pendingSpace = true;
                    return;
                }
                const tokenWidth = measure(token.text) * (token.sup ? SUP_SCALE : 1);
                const prefixWidth = pendingSpace && current ? spaceWidth : 0;
                if (!current || currentWidth + prefixWidth + tokenWidth <= maxWidth) {
                    current += (pendingSpace && current ? ' ' : '') + marked(token.text, token.sup);
                    currentWidth += prefixWidth + tokenWidth;
                    pendingSpace = false;
                    return;
                }
                if (tokenWidth > maxWidth) {
                    addChars(token.text, token.sup);
                    return;
                }
                flush();
                current = marked(token.text, token.sup);
                currentWidth = tokenWidth;
                pendingSpace = false;
            });
            flush();
            return this.adjustWrappedPunctuation(lines, maxWidth);
        }

        splitText(text, width, size) {
            if (Number.isFinite(size) && size > 0) {
                this.pdf.setFont(FONT_NAME, 'normal');
                this.pdf.setFontSize(size);
            }
            const value = String(text ?? '').replace(/\r/g, '');
            if (!value) return [''];
            const lines = [];
            value.split('\n').forEach(part => {
                if (!part) {
                    lines.push('');
                    return;
                }
                lines.push(...this.wrapLine(part, Math.max(1, width)));
            });
            return lines;
        }

        drawRichLine(value, x, baseline, size, color = INK) {
            const text = String(value ?? '');
            if (!text) return;
            if (!text.includes(SUP_START)) {
                this.setFont(size, color);
                this.pdf.text(text, x, baseline);
                return;
            }
            let cursorX = x;
            let cursor = 0;
            const drawSegment = (segment, sup) => {
                if (!segment) return;
                const segmentSize = sup ? size * SUP_SCALE : size;
                this.setFont(segmentSize, sup ? SUP_COLOR : color);
                const segmentY = sup ? baseline - this.fontMm(size) * SUP_LIFT : baseline;
                this.pdf.text(segment, cursorX, segmentY);
                cursorX += this.pdf.getTextWidth(segment);
            };
            while (cursor < text.length) {
                const start = text.indexOf(SUP_START, cursor);
                if (start < 0) {
                    drawSegment(text.slice(cursor).replaceAll(SUP_END, ''), false);
                    break;
                }
                if (start > cursor) drawSegment(text.slice(cursor, start).replaceAll(SUP_END, ''), false);
                const end = text.indexOf(SUP_END, start + 1);
                if (end < 0) {
                    drawSegment(text.slice(start + 1).replaceAll(SUP_START, '').replaceAll(SUP_END, ''), true);
                    break;
                }
                drawSegment(text.slice(start + 1, end), true);
                cursor = end + 1;
            }
            this.setFont(size, color);
        }

        drawLines(lines, x, width, options = {}) {
            const size = options.size || BODY_SIZE;
            const color = options.color || INK;
            const factor = options.lineHeight || BODY_LINE_HEIGHT;
            const lineHeight = this.fontMm(size) * factor;
            const baseline = this.fontMm(size) * 0.94;
            this.setFont(size, color);
            lines.forEach(line => {
                if (this.y + lineHeight > PAGE_BOTTOM) this.newPage();
                this.drawRichLine(String(line ?? ''), x, this.y + baseline, size, color);
                this.y += lineHeight;
            });
            return lines.length;
        }

        async renderDocumentTitle(title) {
            if (!title) return;
            this.setFont(17, [20, 37, 51]);
            const lines = this.splitText(title, CONTENT_WIDTH, 17);
            const lineHeight = this.fontMm(17) * 1.45;
            this.ensureSpace(lines.length * lineHeight + 8);
            lines.forEach(line => {
                if (this.y + lineHeight > PAGE_BOTTOM) this.newPage();
                this.pdf.text(this.plainText(line), MARGIN.left, this.y + this.fontMm(17) * 0.96);
                this.y += lineHeight;
            });
            this.y += 2.2;
            this.pdf.setDrawColor(38, 73, 98);
            this.pdf.setLineWidth(0.55);
            this.pdf.line(MARGIN.left, this.y, A4.width - MARGIN.right, this.y);
            this.y += 2.4;
            this.setFont(7.6, [146, 157, 168]);
            this.pdf.text(WATERMARK_TEXT, MARGIN.left, this.y + this.fontMm(7.6) * 0.92);
            this.y += 4.2;
        }

        renderHeading(block) {
            const sizes = { 1: 15.6, 2: 13.8, 3: 12.2, 4: 11.2, 5: 10.5, 6: 10.2 };
            const before = block.level <= 2 ? 4.4 : 3.2;
            const size = sizes[block.level] || 11;
            const lineHeight = this.fontMm(size) * 1.45;
            const lines = this.splitText(block.text, block.level <= 2 ? CONTENT_WIDTH - 4 : CONTENT_WIDTH, size);
            const need = lines.length * lineHeight + before + 6;
            this.ensureSpace(Math.min(need, 32));
            this.y += before;
            const indent = block.level === 2 ? 4 : 0;
            if (block.level === 2) {
                this.pdf.setFillColor(38, 111, 160);
                this.pdf.rect(MARGIN.left, this.y + 0.6, 1.1, Math.max(2, lines.length * lineHeight - 1.2), 'F');
            }
            this.setFont(size, [18, 35, 49]);
            lines.forEach(line => {
                if (this.y + lineHeight > PAGE_BOTTOM) this.newPage();
                this.drawRichLine(line, MARGIN.left + indent, this.y + this.fontMm(size) * 0.94, size, [18, 35, 49]);
                this.y += lineHeight;
            });
            if (block.level <= 2) {
                this.pdf.setDrawColor(206, 217, 226);
                this.pdf.setLineWidth(0.25);
                this.pdf.line(MARGIN.left, this.y + 0.2, A4.width - MARGIN.right, this.y + 0.2);
                this.y += 1.8;
            }
            this.y += 2.6;
        }

        renderParagraph(text, options = {}) {
            const indent = options.indent || 0;
            const size = options.size || BODY_SIZE;
            const lines = this.splitText(text, CONTENT_WIDTH - indent, size);
            if (!lines.length || (lines.length === 1 && !lines[0])) return;
            const lineHeight = this.fontMm(size) * (options.lineHeight || BODY_LINE_HEIGHT);
            this.ensureSpace(lineHeight * Math.min(lines.length, 2));
            this.y += options.spaceBefore || 0;
            this.drawLines(lines, MARGIN.left + indent, CONTENT_WIDTH - indent, {
                size,
                color: options.color || INK,
                lineHeight: options.lineHeight || BODY_LINE_HEIGHT
            });
            this.y += options.spaceAfter ?? 2.5;
        }

        renderList(block) {
            const indent = 2 + block.depth * 5.5;
            const textX = indent + 5.4;
            const size = BODY_SIZE;
            const lineHeight = this.fontMm(size) * BODY_LINE_HEIGHT;
            const lines = this.splitText(block.text, CONTENT_WIDTH - textX, size);
            this.ensureSpace(lineHeight * Math.min(lines.length, 2));
            this.setFont(size, INK);
            let first = true;
            lines.forEach(line => {
                if (this.y + lineHeight > PAGE_BOTTOM) this.newPage();
                if (first) {
                    this.setFont(size, block.depth ? MUTED : ACCENT);
                    this.pdf.text(block.marker, MARGIN.left + indent, this.y + this.fontMm(size) * 0.94);
                    first = false;
                }
                this.setFont(size, INK);
                this.drawRichLine(line, MARGIN.left + textX, this.y + this.fontMm(size) * 0.94, size, INK);
                this.y += lineHeight;
            });
            this.y += 1.3;
        }

        renderQuote(block) {
            const size = 9.8;
            const lineHeight = this.fontMm(size) * 1.58;
            const indent = 6;
            const lines = this.splitText(block.text, CONTENT_WIDTH - indent, size);
            this.ensureSpace(lineHeight * Math.min(lines.length, 2));
            this.y += 1;
            this.setFont(size, [61, 76, 90]);
            lines.forEach(line => {
                if (this.y + lineHeight > PAGE_BOTTOM) this.newPage();
                this.pdf.setFillColor(245, 248, 251);
                this.pdf.rect(MARGIN.left, this.y, CONTENT_WIDTH, lineHeight, 'F');
                this.pdf.setFillColor(157, 184, 203);
                this.pdf.rect(MARGIN.left, this.y, 1.25, lineHeight, 'F');
                this.drawRichLine(line, MARGIN.left + indent, this.y + this.fontMm(size) * 0.95, size, [61, 76, 90]);
                this.y += lineHeight;
            });
            this.y += 2.2;
        }

        renderDivider() {
            this.ensureSpace(6);
            this.y += 2;
            this.pdf.setDrawColor(205, 215, 224);
            this.pdf.setLineWidth(0.25);
            this.pdf.line(MARGIN.left, this.y, A4.width - MARGIN.right, this.y);
            this.y += 4;
        }

        renderCode(block) {
            const size = block.math ? 8.8 : 8.3;
            const lineHeight = this.fontMm(size) * 1.55;
            const paddingX = 3;
            const paddingY = 2.2;
            const allLines = this.splitText(block.text || ' ', CONTENT_WIDTH - paddingX * 2, size);
            if (!allLines.length) return;
            let index = 0;
            while (index < allLines.length) {
                this.ensureSpace(8);
                const maxLines = Math.max(1, Math.floor((PAGE_BOTTOM - this.y - paddingY * 2) / lineHeight));
                const slice = allLines.slice(index, index + maxLines);
                const boxHeight = slice.length * lineHeight + paddingY * 2;
                if (boxHeight > PAGE_BOTTOM - MARGIN.top) {
                    slice.splice(Math.max(1, maxLines - 1));
                }
                this.pdf.setFillColor(246, 248, 250);
                this.pdf.setDrawColor(220, 227, 233);
                this.pdf.setLineWidth(0.2);
                this.pdf.roundedRect(MARGIN.left, this.y, CONTENT_WIDTH, boxHeight, 1.2, 1.2, 'FD');
                this.setFont(size, [38, 47, 56]);
                let lineY = this.y + paddingY + this.fontMm(size) * 0.92;
                slice.forEach(line => {
                    this.pdf.text(this.plainText(line), MARGIN.left + paddingX, lineY);
                    lineY += lineHeight;
                });
                this.y += boxHeight + 2.4;
                index += slice.length;
                if (index < allLines.length) this.newPage();
            }
        }

        tableData(table) {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (!rows.length) return null;
            const cellText = cell => this.inlineText(cell);
            const firstRowCells = Array.from(rows[0].children);
            const firstHasHeader = firstRowCells.some(cell => cell.tagName === 'TH');
            let headers = [];
            let bodyRows = rows;
            if (table.tHead && table.tHead.rows.length) {
                headers = Array.from(table.tHead.rows[0].cells).map(cellText);
                bodyRows = rows.filter(row => !table.tHead.contains(row));
            } else if (firstHasHeader) {
                headers = firstRowCells.map(cellText);
                bodyRows = rows.slice(1);
            }
            const dataRows = bodyRows.map(row => Array.from(row.cells).map(cellText));
            const columns = Math.max(headers.length, ...dataRows.map(row => row.length), 0);
            if (!columns) return null;
            headers = headers.concat(Array(Math.max(0, columns - headers.length)).fill(''));
            const normalizedRows = dataRows.map(row => row.concat(Array(Math.max(0, columns - row.length)).fill('')));
            return { headers, rows: normalizedRows };
        }

        tableColumnWidths(headers, rows, columns) {
            const size = this.tableFontSize(columns);
            this.setFont(size, INK);
            const allRows = headers.length ? [headers, ...rows] : rows;
            const desired = Array(columns).fill(0);
            allRows.forEach(row => row.forEach((cell, index) => {
                const measured = this.pdf.getTextWidth(this.plainText(cell || ''));
                desired[index] = Math.max(desired[index], Math.min(58, measured + 4));
            }));
            const minWidth = columns <= 5 ? 14 : 9;
            const floor = desired.map(value => Math.max(minWidth, value));
            const totalFloor = floor.reduce((sum, value) => sum + value, 0) || columns;
            if (totalFloor <= CONTENT_WIDTH) {
                const extra = CONTENT_WIDTH - totalFloor;
                return floor.map(value => value + extra * (value / totalFloor));
            }
            const widths = Array(columns).fill(0);
            const remaining = new Set(Array.from({ length: columns }, (_, index) => index));
            let available = CONTENT_WIDTH;
            while (remaining.size) {
                const totalDesired = Array.from(remaining).reduce((sum, index) => sum + desired[index], 0) || remaining.size;
                let assigned = false;
                for (const index of Array.from(remaining)) {
                    const share = desired[index] / totalDesired * available;
                    if (share < minWidth) {
                        widths[index] = minWidth;
                        available -= minWidth;
                        remaining.delete(index);
                        assigned = true;
                    }
                }
                if (!assigned) {
                    const totalRemaining = totalDesired || remaining.size;
                    for (const index of remaining) widths[index] = desired[index] / totalRemaining * available;
                    break;
                }
            }
            return widths;
        }

        tableFontSize(columns) {
            if (columns <= 4) return 8.8;
            if (columns <= 6) return 8.0;
            if (columns <= 8) return 7.3;
            return 6.6;
        }

        async renderTable(table) {
            const data = this.tableData(table);
            if (!data) return;
            const { headers, rows } = data;
            const columns = headers.length;
            const size = this.tableFontSize(columns);
            const lineHeight = this.fontMm(size) * 1.48;
            const padX = 1.6;
            const padY = 1.15;
            const widths = this.tableColumnWidths(headers, rows, columns);
            this.setFont(size, INK);

            const linesForRow = row => row.map((cell, index) => this.splitText(cell, Math.max(2, widths[index] - padX * 2), size));
            const headerLines = headers.some(Boolean) ? linesForRow(headers) : [];
            const headerHeight = headerLines.length
                ? Math.max(...headerLines.map(lines => lines.length)) * lineHeight + padY * 2
                : 0;

            const drawRow = (rowLines, fill, isHeader = false) => {
                const maxLines = Math.max(1, ...rowLines.map(lines => lines.length));
                const height = maxLines * lineHeight + padY * 2;
                if (this.y + height > PAGE_BOTTOM) this.newPage();
                let x = MARGIN.left;
                rowLines.forEach((lines, index) => {
                    this.pdf.setFillColor(fill[0], fill[1], fill[2]);
                    this.pdf.setDrawColor(196, 208, 218);
                    this.pdf.setLineWidth(0.2);
                    this.pdf.rect(x, this.y, widths[index], height, 'FD');
                    this.setFont(size, isHeader ? [31, 57, 75] : INK);
                    const textY = this.y + padY + this.fontMm(size) * 0.92;
                    lines.forEach((line, lineIndex) => {
                        this.drawRichLine(line, x + padX, textY + lineIndex * lineHeight, size, isHeader ? [31, 57, 75] : INK);
                    });
                    x += widths[index];
                });
                this.y += height;
            };

            const drawHeader = () => {
                if (!headerLines.length) return;
                if (this.y + headerHeight > PAGE_BOTTOM) this.newPage();
                drawRow(headerLines, [235, 242, 248], true);
            };

            this.ensureSpace(headerHeight + lineHeight * 3);
            drawHeader();
            let rowIndex = 0;
            while (rowIndex < rows.length) {
                const rowLines = linesForRow(rows[rowIndex]);
                const maxLines = Math.max(1, ...rowLines.map(lines => lines.length));
                const fullHeight = maxLines * lineHeight + padY * 2;
                if (this.y + fullHeight > PAGE_BOTTOM) {
                    this.newPage();
                    drawHeader();
                }
                const availableLines = Math.max(1, Math.floor((PAGE_BOTTOM - this.y - padY * 2) / lineHeight));
                if (maxLines <= availableLines) {
                    drawRow(rowLines, rowIndex % 2 ? [250, 252, 254] : [255, 255, 255]);
                } else {
                    let offset = 0;
                    while (offset < maxLines) {
                        if (this.y + lineHeight + padY * 2 > PAGE_BOTTOM) {
                            this.newPage();
                            drawHeader();
                        }
                        const take = Math.max(1, Math.min(maxLines - offset, Math.floor((PAGE_BOTTOM - this.y - padY * 2) / lineHeight)));
                        const chunk = rowLines.map(lines => lines.slice(offset, offset + take));
                        drawRow(chunk, [255, 255, 255]);
                        offset += take;
                        if (offset < maxLines) {
                            this.newPage();
                            drawHeader();
                        }
                    }
                }
                rowIndex += 1;
            }
            this.y += 3;
        }

        loadImageElement(src, crossOrigin = false) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                if (crossOrigin) image.crossOrigin = 'anonymous';
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('图片加载失败'));
                image.src = src;
            });
        }

        blobToDataUrl(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(reader.error || new Error('图片读取失败'));
                reader.readAsDataURL(blob);
            });
        }

        async imageSourceFor(img) {
            const rawSrc = String(img.currentSrc || img.src || '').trim();
            if (!rawSrc) throw new Error('图片地址为空');
            if (/^data:/i.test(rawSrc)) return rawSrc;
            const response = await fetch(rawSrc, { mode: 'cors', credentials: 'same-origin' });
            if (!response.ok) throw new Error('图片加载失败');
            return this.blobToDataUrl(await response.blob());
        }

        canvasDataUrl(canvas, type = 'image/jpeg', quality = 0.92) {
            try {
                return canvas.toDataURL(type, quality);
            } catch (error) {
                return '';
            }
        }

        async captureImage(img) {
            let dataUrl = '';
            try {
                dataUrl = await this.imageSourceFor(img);
            } catch (error) {
                dataUrl = String(img.currentSrc || img.src || '').trim();
                if (!/^data:image\/(?:png|jpeg|jpg|webp);/i.test(dataUrl)) throw error;
            }
            const source = await this.loadImageElement(dataUrl, false);
            const naturalWidth = source.naturalWidth || source.width || img.naturalWidth || 1;
            const naturalHeight = source.naturalHeight || source.height || img.naturalHeight || 1;
            const maxSide = 1800;
            const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
            const width = Math.max(1, Math.round(naturalWidth * scale));
            const height = Math.max(1, Math.round(naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            context.drawImage(source, 0, 0, width, height);
            const jpeg = this.canvasDataUrl(canvas, 'image/jpeg', this.options.jpegQuality);
            if (!jpeg) throw new Error('图片无法嵌入 PDF');
            return { dataUrl: jpeg, width, height, format: 'JPEG' };
        }

        prepareDiagramSvg(clone, originalSvg) {
            const namespace = 'http://www.w3.org/2000/svg';
            const originalObjects = Array.from(originalSvg?.querySelectorAll?.('foreignObject') || []);
            Array.from(clone.querySelectorAll('foreignObject')).forEach((foreign, index) => {
                const text = this.normalizeText(foreign.textContent || '');
                const width = parseFloat(foreign.getAttribute('width')) || 180;
                const height = parseFloat(foreign.getAttribute('height')) || 22;
                if (!text) {
                    foreign.remove();
                    return;
                }
                const original = originalObjects[index];
                let fontSize = 14;
                let fontFamily = '"Microsoft YaHei UI", "Microsoft YaHei", sans-serif';
                try {
                    const probe = original?.querySelector?.('span, p, div') || original;
                    if (probe) {
                        const style = window.getComputedStyle(probe);
                        const parsed = parseFloat(style.fontSize);
                        if (Number.isFinite(parsed) && parsed > 0) fontSize = Math.min(16, Math.max(10, parsed));
                        if (style.fontFamily) fontFamily = style.fontFamily;
                    }
                } catch (error) { /* keep defaults */ }

                let lines = [];
                let chosenSize = fontSize;
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const maxWidth = Math.max(10, width - 6);
                for (let size = fontSize; size >= 9; size -= 0.5) {
                    context.font = `${size}px ${fontFamily}`;
                    const candidate = [];
                    let current = '';
                    for (const char of text) {
                        if (current && context.measureText(current + char).width > maxWidth) {
                            candidate.push(current);
                            current = char;
                        } else {
                            current += char;
                        }
                    }
                    if (current) candidate.push(current);
                    const lineHeight = size * 1.28;
                    if (candidate.length * lineHeight <= height - 2 || size <= 9) {
                        lines = candidate.length ? candidate : [text];
                        chosenSize = size;
                        break;
                    }
                }
                const lineHeight = chosenSize * 1.28;
                const maxLines = Math.max(1, Math.floor((height - 2) / lineHeight));
                if (lines.length > maxLines) {
                    lines = lines.slice(0, maxLines);
                    const last = lines[lines.length - 1] || '';
                    lines[lines.length - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : last;
                }
                context.font = `${chosenSize}px ${fontFamily}`;
                const textElement = document.createElementNS(namespace, 'text');
                textElement.setAttribute('text-anchor', 'middle');
                textElement.setAttribute('font-family', fontFamily);
                textElement.setAttribute('font-size', String(chosenSize));
                textElement.setAttribute('fill', '#1F2D3A');
                textElement.style.setProperty('fill', '#1F2D3A', 'important');
                const startY = (height - lines.length * lineHeight) / 2 + chosenSize * 0.92;
                lines.forEach((line, lineIndex) => {
                    const span = document.createElementNS(namespace, 'tspan');
                    span.setAttribute('x', String(width / 2));
                    span.setAttribute('y', String(startY + lineIndex * lineHeight));
                    span.textContent = line;
                    textElement.appendChild(span);
                });
                foreign.replaceWith(textElement);
            });

            const fill = '#F2F7FC';
            const border = '#8DA6BA';
            const ink = '#1F2D3A';
            clone.querySelectorAll('.node rect, .node circle, .node ellipse, .node polygon, .node path, .label-container, .cluster rect, .cluster polygon, .timeline-node .node-bkg, .taskWrapper .timeline-node .node-bkg, .eventWrapper .timeline-node .node-bkg, .actor, .note, .task').forEach(shape => {
                shape.style.setProperty('fill', fill, 'important');
                shape.style.setProperty('stroke', border, 'important');
            });
            clone.querySelectorAll('text, tspan, .nodeLabel, .label, .cluster-label span').forEach(item => {
                item.style.setProperty('fill', ink, 'important');
                item.style.setProperty('color', ink, 'important');
            });
            clone.querySelectorAll('.edgePaths path, .flowchart-link, .relation, .messageLine0, .messageLine1, .actor-line, .lineWrapper line, .timeline-node line').forEach(item => {
                item.style.setProperty('fill', 'none', 'important');
                item.style.setProperty('stroke', '#647F95', 'important');
            });
            clone.querySelectorAll('.edgeLabel rect, .labelBkg').forEach(item => {
                item.style.setProperty('fill', '#FFFFFF', 'important');
                item.style.setProperty('stroke', 'none', 'important');
            });
            clone.querySelectorAll('marker path').forEach(item => {
                item.style.setProperty('fill', '#647F95', 'important');
                item.style.setProperty('stroke', '#647F95', 'important');
            });
        }

        svgViewBox(svg) {
            const raw = svg.getAttribute('viewBox');
            if (raw) {
                const values = raw.trim().split(/[\s,]+/).map(Number);
                if (values.length === 4 && values[2] > 0 && values[3] > 0) {
                    return { x: values[0], y: values[1], width: values[2], height: values[3] };
                }
            }
            try {
                const box = svg.getBBox();
                if (box && box.width > 0 && box.height > 0) {
                    return { x: box.x, y: box.y, width: box.width, height: box.height };
                }
            } catch (error) { /* fall through */ }
            const attrWidth = parseFloat(svg.getAttribute('width'));
            const attrHeight = parseFloat(svg.getAttribute('height'));
            if (Number.isFinite(attrWidth) && attrWidth > 0 && Number.isFinite(attrHeight) && attrHeight > 0) {
                return { x: 0, y: 0, width: attrWidth, height: attrHeight };
            }
            const rect = svg.getBoundingClientRect();
            return {
                x: 0,
                y: 0,
                width: Math.max(1, rect.width || 900),
                height: Math.max(1, rect.height || 600)
            };
        }

        async svgToDataUrl(svg, wrapper) {
            const box = this.svgViewBox(svg);
            const clone = svg.cloneNode(true);
            const isDiagram = wrapper?.classList?.contains('agent-diagram');
            const targetWidth = isDiagram ? 2300 : 1900;
            const ratio = box.width / box.height;
            let pixelWidth = targetWidth;
            let pixelHeight = Math.max(1, Math.round(pixelWidth / ratio));
            const maxPixels = 9000000;
            if (pixelWidth * pixelHeight > maxPixels) {
                const scale = Math.sqrt(maxPixels / (pixelWidth * pixelHeight));
                pixelWidth = Math.max(1, Math.floor(pixelWidth * scale));
                pixelHeight = Math.max(1, Math.floor(pixelHeight * scale));
            }
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            clone.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
            clone.setAttribute('width', String(pixelWidth));
            clone.setAttribute('height', String(pixelHeight));
            clone.removeAttribute('style');
            clone.style.maxWidth = 'none';
            clone.style.width = `${pixelWidth}px`;
            clone.style.height = `${pixelHeight}px`;
            if (isDiagram) {
                this.prepareDiagramSvg(clone, svg);
                const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
                style.textContent = PRINT_DIAGRAM_SVG_CSS;
                clone.appendChild(style);
            }
            const svgText = new XMLSerializer().serializeToString(clone);
            const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            const objectUrl = URL.createObjectURL(blob);
            try {
                const source = await this.loadImageElement(objectUrl, false);
                const padding = 22;
                const canvas = document.createElement('canvas');
                canvas.width = pixelWidth + padding * 2;
                canvas.height = pixelHeight + padding * 2;
                const context = canvas.getContext('2d');
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(source, padding, padding, pixelWidth, pixelHeight);
                const dataUrl = canvas.toDataURL('image/png');
                return {
                    dataUrl,
                    width: canvas.width,
                    height: canvas.height,
                    format: 'PNG'
                };
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        }

        async captureHtmlFigure(node) {
            const html2canvas = await this.ensureHtml2Canvas();
            const host = document.createElement('div');
            host.style.cssText = 'position:fixed;left:-20000px;top:0;width:900px;background:#fff;color:#1f2d3a;padding:18px;box-sizing:border-box;';
            const clone = node.cloneNode(true);
            clone.style.width = '864px';
            clone.style.maxWidth = 'none';
            clone.style.minWidth = '0';
            clone.style.overflow = 'visible';
            clone.style.cursor = 'default';
            clone.style.background = '#fff';
            clone.style.color = '#1f2d3a';
            clone.style.border = '1px solid #DCE4EC';
            clone.style.borderRadius = '4px';
            clone.style.boxShadow = 'none';
            clone.querySelectorAll('svg').forEach(svg => {
                svg.style.maxWidth = '100%';
                svg.style.width = '100%';
                svg.style.minWidth = '0';
                svg.style.height = 'auto';
                svg.style.background = '#fff';
            });
            clone.querySelectorAll('.node rect, .node circle, .node ellipse, .node polygon, .node path, .label-container, .cluster rect, .cluster polygon, .timeline-node .node-bkg, .taskWrapper .timeline-node .node-bkg, .eventWrapper .timeline-node .node-bkg').forEach(shape => {
                shape.style.setProperty('fill', '#F2F7FC', 'important');
                shape.style.setProperty('stroke', '#8DA6BA', 'important');
            });
            clone.querySelectorAll('text, tspan, .nodeLabel, .label, .nodeLabel *, foreignObject span, foreignObject p, foreignObject div').forEach(item => {
                item.style.setProperty('fill', '#1F2D3A', 'important');
                item.style.setProperty('color', '#1F2D3A', 'important');
                item.style.setProperty('background-color', 'transparent', 'important');
            });
            clone.querySelectorAll('.edgePaths path, .flowchart-link, .relation, .messageLine0, .messageLine1, .actor-line, .lineWrapper line, .timeline-node line').forEach(item => {
                item.style.setProperty('fill', 'none', 'important');
                item.style.setProperty('stroke', '#647F95', 'important');
            });
            clone.querySelectorAll('.edgeLabel rect, .labelBkg').forEach(item => {
                item.style.setProperty('fill', '#FFFFFF', 'important');
                item.style.setProperty('stroke', 'none', 'important');
            });
            host.appendChild(clone);
            document.body.appendChild(host);
            try {
                const canvas = await html2canvas(host, {
                    scale: Math.max(2, Number(this.options.imageScale) || 2),
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    logging: false
                });
                const dataUrl = canvas.toDataURL('image/png');
                return {
                    dataUrl,
                    width: canvas.width,
                    height: canvas.height,
                    format: 'PNG'
                };
            } finally {
                host.remove();
            }
        }

        async captureFigure(node) {
            const wrapper = node.matches('.agent-chart, .agent-diagram') ? node : null;
            const svg = node.matches?.('svg') ? node : node.querySelector?.('svg');
            if (svg) {
                try {
                    return await this.svgToDataUrl(svg, wrapper || node);
                } catch (error) {
                    if (!wrapper) throw error;
                }
            }
            return this.captureHtmlFigure(wrapper || node);
        }

        async placeImage(asset, caption = '') {
            if (!asset?.dataUrl) return;
            const maxWidth = CONTENT_WIDTH;
            const maxHeight = PAGE_BOTTOM - MARGIN.top;
            let width = maxWidth;
            let height = width * asset.height / asset.width;
            if (height > maxHeight) {
                height = maxHeight;
                width = height * asset.width / asset.height;
            }
            const gap = 2.5;
            const remaining = PAGE_BOTTOM - this.y;
            if (height + gap > remaining && this.y > MARGIN.top + 0.1) {
                if (remaining - gap >= 90) {
                    height = remaining - gap;
                    width = height * asset.width / asset.height;
                } else {
                    this.newPage();
                }
            }
            const x = MARGIN.left + (CONTENT_WIDTH - width) / 2;
            this.pdf.addImage(asset.dataUrl, asset.format || 'PNG', x, this.y, width, height, undefined, 'FAST');
            this.y += height + 3;
            if (caption) {
                this.renderParagraph(caption, { size: 8.5, color: MUTED, lineHeight: 1.5, spaceAfter: 2.2 });
            } else {
                this.y += 1.5;
            }
        }

        async renderFigure(node) {
            const asset = await this.captureFigure(node);
            let caption = '';
            if (node.matches?.('.agent-chart')) {
                caption = this.normalizeText(node.querySelector('.agent-chart-caption')?.textContent || '');
            } else if (node.matches?.('figure')) {
                caption = this.normalizeText(node.querySelector('figcaption')?.textContent || '');
            }
            await this.placeImage(asset, caption);
        }

        async renderImage(node) {
            try {
                const asset = await this.captureImage(node);
                await this.placeImage(asset);
            } catch (error) {
                this.renderParagraph(`[图片未能嵌入：${error?.message || '加载失败'}]`, {
                    size: 8.5,
                    color: MUTED,
                    lineHeight: 1.5
                });
            }
        }

        async renderBlock(block, options) {
            switch (block.kind) {
                case 'heading':
                    this.renderHeading(block);
                    break;
                case 'subheading':
                    this.renderHeading({ ...block, level: 3 });
                    break;
                case 'paragraph':
                    this.renderParagraph(block.text);
                    break;
                case 'list-item':
                    this.renderList(block);
                    break;
                case 'quote':
                    this.renderQuote(block);
                    break;
                case 'divider':
                    this.renderDivider();
                    break;
                case 'code':
                    this.renderCode(block);
                    break;
                case 'table':
                    await this.renderTable(block.node);
                    break;
                case 'figure':
                    await this.renderFigure(block.node);
                    break;
                case 'image':
                    await this.renderImage(block.node);
                    break;
                case 'source':
                    this.renderParagraph(block.text, { size: 8.6, color: MUTED, lineHeight: 1.55, spaceAfter: 1.4 });
                    break;
                default:
                    if (block.text) this.renderParagraph(block.text);
            }
            if (options?.onProgress) {
                this.emitProgress(options, { phase: 'render', current: options.currentBlock, total: options.totalBlocks });
            }
        }

        drawFooters() {
            const total = this.pdf.getNumberOfPages();
            for (let page = 1; page <= total; page += 1) {
                this.pdf.setPage(page);
                this.setFont(7.5, [135, 148, 160]);
                this.pdf.text(`${page} / ${total}`, A4.width - MARGIN.right, A4.height - 8, { align: 'right' });
            }
        }

        async exportElement(source, options = {}) {
            if (!source) throw new Error('没有可导出的正文');
            this.emitProgress(options, { phase: 'loading' });
            const title = this.normalizeText(options.title || '');
            const pdf = await this.createPdf(title);
            const clone = this.prepareClone(source);
            let blocks = this.collectBlocks(clone);
            if (!blocks.length) throw new Error('没有可导出的内容');

            this.y = MARGIN.top;
            const firstHeadingIndex = blocks.findIndex(block => block.kind === 'heading' || block.kind === 'subheading');
            if (title && firstHeadingIndex >= 0 && this.normalizeText(this.plainText(blocks[firstHeadingIndex].text)) === title) {
                blocks.splice(firstHeadingIndex, 1);
            }
            if (title) await this.renderDocumentTitle(title);

            this.emitProgress(options, { phase: 'render', current: 0, total: blocks.length });
            for (let index = 0; index < blocks.length; index += 1) {
                await this.renderBlock(blocks[index], { ...options, currentBlock: index + 1, totalBlocks: blocks.length });
                if (index % 6 === 5) await this.yieldToMain();
            }

            this.emitProgress(options, { phase: 'finalize' });
            this.drawFooters();
            const blob = pdf.output('blob');
            return {
                blob,
                pageCount: pdf.getNumberOfPages(),
                title: title || 'PzM Agent 报告'
            };
        }

        safeFilename(name) {
            const base = String(name || 'PzM Agent 报告')
                .replace(/[\\/:*?"<>|]+/g, '_')
                .replace(/\s+/g, ' ')
                .trim() || 'PzM Agent 报告';
            return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
        }

        triggerDownload(blob, filename) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.safeFilename(filename);
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            return url;
        }

        async exportAndDownload(source, options = {}) {
            const job = this.exportChain.then(() => this.exportElement(source, options));
            this.exportChain = job.then(() => undefined, () => undefined);
            const result = await job;
            this.triggerDownload(result.blob, options.filename || `${result.title}.pdf`);
            return result;
        }

        async exportAndOpen(source, options = {}) {
            return this.exportAndDownload(source, options);
        }

        getStats() {
            return {
                jsPdfLoaded: Boolean(window.jspdf || window.jsPDF),
                fontLoaded: Boolean(this.fontPromise)
            };
        }
    }

    window.AgentReportPdf = AgentReportPdf;
    window.agentReportPdf = window.agentReportPdf || new AgentReportPdf();
})();
