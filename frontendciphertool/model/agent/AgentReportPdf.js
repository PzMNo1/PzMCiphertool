/**
 * AgentReportPdf - 把已经渲染好的正文导出成一份可点开的 PDF。
 *
 * 做法：把正文克隆到白纸页面里，按块分页（表格超长时按行拆页），
 * 再用 html2canvas 逐页栅格化、jsPDF 拼成 A4 PDF。
 * 两个第三方库走本地 vendor，首次点击时才加载。
 */
(function () {
    const H2C_SRC = './vendor/html2canvas/html2canvas.min.js';
    const JSPDF_SRC = './vendor/jspdf/jspdf.umd.min.js';

    const A4 = { width: 210, height: 297 };
    const MARGIN = 14;
    const CONTENT_WIDTH_MM = A4.width - MARGIN * 2;
    const CONTENT_HEIGHT_MM = A4.height - MARGIN * 2;
    const FOOTER_MM = 8;
    const MM_PER_PX = 25.4 / 96;
    const PAGE_CONTENT_PX = Math.round(CONTENT_WIDTH_MM / MM_PER_PX);
    const PAGE_BUDGET_PX = Math.floor((CONTENT_HEIGHT_MM - FOOTER_MM) / MM_PER_PX);

    const DROP_SELECTORS = [
        '.agent-pdf-bar',
        '.agent-run-panel',
        '.agent-thought-panel',
        '.agent-event-panel',
        '.agent-tool-deck',
        '.agent-stage-strip',
        '.agent-approval-deck',
        '.message-attachments',
        '.generated-image-grid'
    ].join(',');

    class AgentReportPdf {
        constructor(options = {}) {
            this.options = Object.assign({
                h2cSrc: H2C_SRC,
                jsPdfSrc: JSPDF_SRC,
                scale: 2,
                jpegQuality: 0.92
            }, options || {});
            this.libPromise = null;
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

        async ensureLibs() {
            if (this.libPromise) return this.libPromise;
            this.libPromise = (async () => {
                if (!window.html2canvas) await this.loadScript(this.options.h2cSrc);
                if (!window.jspdf && !window.jsPDF) await this.loadScript(this.options.jsPdfSrc);
                const JsPDF = window.jspdf?.jsPDF || window.jsPDF;
                if (!window.html2canvas || !JsPDF) throw new Error('PDF 组件未就绪');
                return { html2canvas: window.html2canvas, JsPDF };
            })().catch(error => {
                this.libPromise = null;
                throw error;
            });
            return this.libPromise;
        }

        /* ---------------- 分页 ---------------- */

        createPageElement(isFirst, title) {
            const page = document.createElement('div');
            page.className = 'agent-pdf-page';
            if (title && isFirst) {
                const head = document.createElement('div');
                head.className = 'agent-pdf-title';
                head.textContent = title;
                page.appendChild(head);
            }
            const content = document.createElement('div');
            content.className = 'agent-pdf-body';
            page.appendChild(content);
            return { page, content };
        }

        blockHeight(element) {
            const style = window.getComputedStyle(element);
            const marginTop = parseFloat(style.marginTop) || 0;
            const marginBottom = parseFloat(style.marginBottom) || 0;
            return element.getBoundingClientRect().height + marginTop + marginBottom;
        }

        cloneTableShell(table) {
            const shell = table.cloneNode(false);
            Array.from(table.children).forEach(child => {
                if (child.tagName === 'THEAD' || child.tagName === 'COLGROUP') {
                    shell.appendChild(child.cloneNode(true));
                } else if (child.tagName === 'TBODY') {
                    shell.appendChild(document.createElement('tbody'));
                }
            });
            if (!shell.querySelector('tbody')) shell.appendChild(document.createElement('tbody'));
            return shell;
        }

        splitTable(table, budget) {
            const rows = Array.from(table.querySelectorAll('tbody > tr'));
            if (rows.length < 3) return null;
            const headHeight = table.querySelector('thead')?.getBoundingClientRect().height || 0;
            const chunks = [];
            let shell = this.cloneTableShell(table);
            let used = headHeight;
            const flush = () => {
                if (shell.querySelectorAll('tbody > tr').length) chunks.push(shell);
            };
            rows.forEach(row => {
                const height = row.getBoundingClientRect().height;
                if (used + height > budget && shell.querySelectorAll('tbody > tr').length) {
                    flush();
                    shell = this.cloneTableShell(table);
                    used = headHeight;
                }
                shell.querySelector('tbody').appendChild(row.cloneNode(true));
                used += height;
            });
            flush();
            return chunks.length > 1 ? chunks : null;
        }

        paginate(source, title) {
            const root = document.createElement('div');
            root.className = 'agent-pdf-root';
            document.body.appendChild(root);

            const measure = document.createElement('div');
            measure.className = 'agent-pdf-measure';
            measure.style.width = PAGE_CONTENT_PX + 'px';
            const body = document.createElement('div');
            body.className = 'agent-pdf-body';
            body.innerHTML = source.innerHTML;
            body.querySelectorAll(DROP_SELECTORS).forEach(node => node.remove());
            measure.appendChild(body);
            root.appendChild(measure);

            const pages = [];
            let current = this.createPageElement(true, title);
            root.appendChild(current.page);
            pages.push(current.page);
            let used = current.content.getBoundingClientRect().top - current.page.getBoundingClientRect().top
                + (current.page.querySelector('.agent-pdf-title')?.getBoundingClientRect().height || 0);
            used = Math.max(0, used - 8);

            const blocks = Array.from(body.children);
            blocks.forEach(block => {
                const cloned = block.cloneNode(true);
                current.content.appendChild(cloned);
                let height = this.blockHeight(cloned);
                if (used + height > PAGE_BUDGET_PX && current.content.children.length > 1) {
                    // 标题跟着下一块走，避免小标题孤零零留在页底
                    const orphans = [];
                    let prev = cloned.previousElementSibling;
                    while (prev && /^H[1-4]$/.test(prev.tagName)) {
                        orphans.unshift(prev);
                        prev = prev.previousElementSibling;
                    }
                    if (orphans.length && current.content.children.length <= orphans.length + 1) orphans.length = 0;
                    cloned.remove();
                    current = this.createPageElement(false, '');
                    root.appendChild(current.page);
                    pages.push(current.page);
                    used = 0;
                    orphans.forEach(node => {
                        node.remove();
                        current.content.appendChild(node);
                        used += this.blockHeight(node);
                    });
                    current.content.appendChild(cloned);
                    height = this.blockHeight(cloned);
                }
                if (height > PAGE_BUDGET_PX && cloned.tagName === 'TABLE') {
                    const chunks = this.splitTable(cloned, PAGE_BUDGET_PX);
                    if (chunks) {
                        cloned.remove();
                        chunks.forEach(chunk => {
                            if (used + this.blockHeight(chunk) > PAGE_BUDGET_PX && current.content.children.length > 1) {
                                current = this.createPageElement(false, '');
                                root.appendChild(current.page);
                                pages.push(current.page);
                                used = 0;
                            }
                            current.content.appendChild(chunk);
                            used += this.blockHeight(chunk);
                        });
                        height = 0;
                    }
                }
                used += height;
            });

            measure.remove();
            return { root, pages };
        }

        /* ---------------- 导出 ---------------- */

        async exportElement(source, options = {}) {
            if (!source) throw new Error('没有可导出的正文');
            const { html2canvas, JsPDF } = await this.ensureLibs();
            const title = String(options.title || '').trim();
            const { root, pages } = this.paginate(source, title);

            try {
                const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
                for (let index = 0; index < pages.length; index += 1) {
                    const canvas = await html2canvas(pages[index], {
                        scale: this.options.scale,
                        backgroundColor: '#ffffff',
                        useCORS: true,
                        logging: false,
                        removeContainer: true
                    });
                    if (index > 0) pdf.addPage();
                    const heightMm = canvas.height / canvas.width * CONTENT_WIDTH_MM;
                    const fit = heightMm > CONTENT_HEIGHT_MM - FOOTER_MM
                        ? (CONTENT_HEIGHT_MM - FOOTER_MM) / heightMm
                        : 1;
                    const drawWidth = CONTENT_WIDTH_MM * fit;
                    const drawHeight = heightMm * fit;
                    const drawX = MARGIN + (CONTENT_WIDTH_MM - drawWidth) / 2;
                    pdf.addImage(
                        canvas.toDataURL('image/jpeg', this.options.jpegQuality),
                        'JPEG',
                        drawX,
                        MARGIN,
                        drawWidth,
                        drawHeight
                    );
                    pdf.setFontSize(7);
                    pdf.setTextColor(150);
                    pdf.text(`${index + 1} / ${pages.length}`, A4.width - MARGIN, A4.height - 6, { align: 'right' });
                }
                return {
                    blob: pdf.output('blob'),
                    pageCount: pages.length
                };
            } finally {
                root.remove();
            }
        }

        async exportAndOpen(source, options = {}) {
            const target = options.window || null;
            const result = await this.exportElement(source, options);
            const url = URL.createObjectURL(result.blob);
            if (target && !target.closed) {
                target.location.href = url;
            } else {
                const link = document.createElement('a');
                link.href = url;
                link.download = String(options.filename || 'report.pdf');
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
            setTimeout(() => URL.revokeObjectURL(url), 120000);
            return { ...result, url };
        }

        getStats() {
            return { libsLoaded: Boolean(window.html2canvas && (window.jspdf || window.jsPDF)) };
        }
    }

    window.AgentReportPdf = AgentReportPdf;
    window.agentReportPdf = window.agentReportPdf || new AgentReportPdf();
})();
