/**
 * ChatUI - 聊天界面渲染模块
 * 负责消息显示、格式化、工具调用状态展示
 */

class ChatUI {
    constructor() {
        this.messagesContainer = null;
        this.mathJaxRendering = false;
        this.lastMathJaxRenderTime = 0;
        this.toolCallNames = new Map();
    }

    /**
     * 初始化 UI 元素引用
     */
    init() {
        this.messagesContainer = document.getElementById('chat-messages');
    }

    /**
     * 格式化消息文本为 HTML
     * @param {string} text
     * @returns {string}
     */
    formatMessage(text) {
        if (!text) return '';

        const lines = text.split('\n');
        let html = '';
        let inMathBlock = false;
        let mathBuffer = [];

        const processInline = (str) => {
            return str.replace(/\*\*(.*?)\*\*/g, '<span class="bold-text">$1</span>');
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let trimmed = line.trim();
            if (!trimmed && !inMathBlock) continue;

            if (!inMathBlock && (trimmed.startsWith('\\[') || trimmed.startsWith('$$'))) {
                inMathBlock = true;
                mathBuffer.push(line);
                if ((trimmed.endsWith('\\]') || trimmed.endsWith('$$')) && trimmed.length > 2) {
                    inMathBlock = false;
                    html += `<div class="math-block">${mathBuffer.join('\n')}</div>`;
                    mathBuffer = [];
                }
                continue;
            }

            if (inMathBlock) {
                mathBuffer.push(line);
                if (trimmed.endsWith('\\]') || trimmed.endsWith('$$')) {
                    inMathBlock = false;
                    html += `<div class="math-block">${mathBuffer.join('\n')}</div>`;
                    mathBuffer = [];
                }
                continue;
            }

            if (trimmed.startsWith('###')) {
                html += `<h3 class="section-header">${processInline(trimmed.replace(/^###+/, '').trim())}</h3>`;
            } else if (/^\d+\./.test(trimmed)) {
                html += `<p class="section-title">${processInline(line)}</p>`;
            } else if (trimmed.startsWith('- ')) {
                html += `<p class="subsection"><span class="bold-text">${processInline(trimmed.replace(/^-/, '').trim())}</span></p>`;
            } else if (trimmed.includes(':') && trimmed.length < 100 && !trimmed.includes('http') && !trimmed.includes('//')) {
                let firstColon = trimmed.indexOf(':');
                let subtitle = trimmed.substring(0, firstColon).trim();
                let content = trimmed.substring(firstColon + 1).trim();
                html += `<p><span class="subtitle">${processInline(subtitle)}</span>: ${processInline(content)}</p>`;
            } else {
                html += `<p>${processInline(line)}</p>`;
            }
        }

        if (mathBuffer.length > 0) {
            html += `<div class="math-block">${mathBuffer.join('\n')}</div>`;
        }

        return html;
    }

    /**
     * 显示用户消息
     * @param {string} content
     */
    displayUserMessage(content, attachments = []) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;

        messageElement.appendChild(messageContent);
        this.appendAttachmentSummary(messageElement, attachments);
        this.messagesContainer.appendChild(messageElement);
        messageElement.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 创建助手消息容器（用于流式响应）
     * @returns {Object} { element, reasoningDetails, reasoningContent, contentDiv, cursorSpan }
     */
    createAssistantMessageContainer() {
        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant-message';

        // 思维链区域
        const reasoningDetails = document.createElement('details');
        reasoningDetails.className = 'reasoning-details thinking-state';
        reasoningDetails.open = true;

        const reasoningSummary = document.createElement('summary');
        reasoningSummary.innerHTML = `<span>正在分析问题</span> <span class="status-dot"></span>`;

        const reasoningContent = document.createElement('div');
        reasoningContent.className = 'reasoning-content';

        const cursorSpan = document.createElement('span');
        cursorSpan.className = 'cursor-blink';
        reasoningContent.appendChild(cursorSpan);

        reasoningDetails.appendChild(reasoningSummary);
        reasoningDetails.appendChild(reasoningContent);

        // 内容区域
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content message-text';

        messageElement.appendChild(reasoningDetails);
        messageElement.appendChild(contentDiv);
        this.messagesContainer.appendChild(messageElement);
        messageElement.scrollIntoView({ behavior: 'smooth' });

        return {
            element: messageElement,
            reasoningDetails,
            reasoningSummary,
            reasoningContent,
            contentDiv,
            cursorSpan
        };
    }

    /**
     * 更新思维链内容（流式）
     * @param {Object} container - createAssistantMessageContainer 返回的对象
     * @param {string} text - 新增的文本
     */
    appendReasoningContent(container, text) {
        const textNode = document.createTextNode(text);
        const cursorIsAttached = container.cursorSpan
            && container.cursorSpan.parentNode === container.reasoningContent;
        if (cursorIsAttached) {
            container.reasoningContent.insertBefore(textNode, container.cursorSpan);
        } else {
            container.reasoningContent.appendChild(textNode);
        }
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    setReasoningStatus(container, status) {
        if (!container?.reasoningSummary) return;
        container.reasoningSummary.innerHTML = `<span>${this.escapeHtml(status)}</span> <span class="status-dot"></span>`;
    }

    appendReasoningEvent(container, message) {
        if (!container?.reasoningContent) return;
        const prefix = container.reasoningContent.textContent.trim() ? '\n' : '';
        this.appendReasoningContent(container, `${prefix}${message}`);
    }

    /**
     * 完成思维链阶段
     * @param {Object} container
     */
    finishReasoning(container) {
        container.reasoningDetails.classList.remove('thinking-state');
        this.setReasoningStatus(container, '正在整理回答');
        if (container.cursorSpan.parentNode) {
            container.cursorSpan.parentNode.removeChild(container.cursorSpan);
        }
    }

    /**
     * 更新内容区域（流式）
     * @param {Object} container
     * @param {string} fullContent - 完整的内容文本
     */
    updateContent(container, fullContent) {
        container.contentDiv.innerHTML = this.formatMessage(fullContent);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        this.debouncedMathJax(container.contentDiv);
    }

    displayGeneratedImages(container, images = [], caption = '') {
        const safeCaption = caption ? `<p>${this.escapeHtml(caption)}</p>` : '';
        container.contentDiv.innerHTML = `
            ${safeCaption}
            <div class="generated-image-grid"></div>
        `;
        const grid = container.contentDiv.querySelector('.generated-image-grid');
        this.appendGeneratedImages(grid, images);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * 防抖的 MathJax 渲染
     * @param {HTMLElement} element
     */
    debouncedMathJax(element) {
        if (window.MathJax && window.MathJax.typesetPromise && !this.mathJaxRendering &&
            (Date.now() - this.lastMathJaxRenderTime > 250)) {
            this.mathJaxRendering = true;
            this.lastMathJaxRenderTime = Date.now();
            window.MathJax.typesetPromise([element])
                .then(() => { this.mathJaxRendering = false; })
                .catch(() => { this.mathJaxRendering = false; });
        }
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    appendAttachmentSummary(messageElement, attachments = []) {
        if (!Array.isArray(attachments) || attachments.length === 0) return;

        const wrap = document.createElement('div');
        wrap.className = 'message-attachments';
        attachments.forEach(file => {
            const chip = document.createElement('span');
            chip.className = 'message-attachment-chip';
            const size = this.formatBytes(file.size || 0);
            const kind = file.kind ? `${file.kind} · ` : '';
            chip.title = file.path || file.name || '';
            chip.textContent = `${kind}${file.name || file.path || 'attachment'} · ${size}`;
            wrap.appendChild(chip);
        });
        messageElement.appendChild(wrap);
    }

    appendGeneratedImages(parent, images = []) {
        if (!parent || !Array.isArray(images) || images.length === 0) return;

        images.forEach((image, index) => {
            const frame = document.createElement('figure');
            frame.className = 'generated-image-frame';

            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.revisedPrompt || `生成图片 ${index + 1}`;
            img.loading = 'lazy';

            const actions = document.createElement('figcaption');
            actions.className = 'generated-image-actions';

            const open = document.createElement('a');
            open.href = image.url;
            open.target = '_blank';
            open.rel = 'noopener';
            open.textContent = '打开图片';

            actions.appendChild(open);
            frame.append(img, actions);
            parent.appendChild(frame);
        });
    }

    formatBytes(bytes) {
        const value = Number(bytes) || 0;
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / 1024 / 1024).toFixed(1)} MB`;
    }

    createAgentRunPanel(container, plan) {
        this.setReasoningStatus(container, this.getPlanStatus(plan));
        this.appendReasoningEvent(container, `已规划 ${plan.mode} 模式，准备使用 ${plan.selectedTools.length} 个候选工具。`);

        const panel = document.createElement('details');
        panel.className = 'agent-run-panel';
        panel.open = true;

        const summary = document.createElement('summary');
        summary.className = 'agent-run-summary';
        summary.innerHTML = `
            <span class="agent-run-title">AGENT RUN</span>
            <span class="agent-run-mode">${this.escapeHtml(plan.mode)}</span>
            <span class="agent-run-count">${plan.selectedTools.length} tools</span>
        `;

        const body = document.createElement('div');
        body.className = 'agent-run-body';

        const stages = document.createElement('div');
        stages.className = 'agent-stage-strip';
        plan.stages.forEach(stage => {
            const item = document.createElement('div');
            item.className = 'agent-stage pending';
            item.dataset.stage = stage.id;
            item.innerHTML = `
                <span class="agent-stage-dot"></span>
                <span class="agent-stage-label">${this.escapeHtml(stage.label)}</span>
                <span class="agent-stage-note"></span>
            `;
            stages.appendChild(item);
        });

        const toolDeck = document.createElement('div');
        toolDeck.className = 'agent-tool-deck';

        const approvalDeck = this.createAgentApprovalDeck([]);

        const trace = document.createElement('div');
        trace.className = 'agent-trace-log';

        body.appendChild(stages);
        body.appendChild(approvalDeck);
        body.appendChild(toolDeck);
        body.appendChild(trace);
        const eventTimeline = this.createAgentEventTimeline([]);
        body.appendChild(eventTimeline.panel);
        panel.appendChild(summary);
        panel.appendChild(body);

        container.agentRunPanel = panel;
        container.agentStages = stages;
        container.agentApprovalDeck = approvalDeck;
        container.toolDeck = toolDeck;
        container.agentTrace = trace;
        container.agentEventTimeline = eventTimeline.panel;
        container.agentEventLog = eventTimeline.log;
        container.agentEventCount = eventTimeline.count;
        container.element.insertBefore(panel, container.contentDiv);
        if (Array.isArray(container.pendingAgentEvents) && container.pendingAgentEvents.length) {
            const pending = container.pendingAgentEvents.splice(0);
            pending.forEach(event => this.appendAgentEvent(container, event));
        }
        return panel;
    }

    restoreAgentRunPanel(messageElement, contentDiv, snapshot) {
        if (!snapshot) return null;

        const panel = document.createElement('details');
        panel.className = 'agent-run-panel';
        panel.open = false;

        const selectedTools = Array.isArray(snapshot.selectedTools) ? snapshot.selectedTools : [];
        const summary = document.createElement('summary');
        summary.className = 'agent-run-summary';
        summary.innerHTML = `
            <span class="agent-run-title">AGENT RUN</span>
            <span class="agent-run-mode">${this.escapeHtml(snapshot.mode || 'agent')}</span>
            <span class="agent-run-count">${selectedTools.length} tools</span>
        `;

        const body = document.createElement('div');
        body.className = 'agent-run-body';

        const stages = document.createElement('div');
        stages.className = 'agent-stage-strip';
        const stageList = Array.isArray(snapshot.stages) && snapshot.stages.length
            ? snapshot.stages
            : ['plan', 'route', 'act', 'observe', 'synthesize'].map(id => ({ id, label: id, state: 'done', note: '' }));

        stageList.forEach(stage => {
            const item = document.createElement('div');
            item.className = `agent-stage ${stage.state || 'done'}`;
            item.dataset.stage = stage.id || '';
            item.innerHTML = `
                <span class="agent-stage-dot"></span>
                <span class="agent-stage-label">${this.escapeHtml(stage.label || stage.id || '')}</span>
                <span class="agent-stage-note">${this.escapeHtml(stage.note || '')}</span>
            `;
            stages.appendChild(item);
        });

        const events = Array.isArray(snapshot.events) ? snapshot.events : [];
        const approvalDeck = this.createAgentApprovalDeck(events);

        const trace = document.createElement('div');
        trace.className = 'agent-trace-log';
        (Array.isArray(snapshot.traces) ? snapshot.traces : []).forEach(row => {
            const traceRow = document.createElement('div');
            traceRow.className = 'agent-trace-row';
            traceRow.innerHTML = `
                <span class="agent-trace-stage">${this.escapeHtml(row.stage || '')}</span>
                <span class="agent-trace-message">${this.escapeHtml(row.message || '')}</span>
            `;
            trace.appendChild(traceRow);
        });

        body.appendChild(stages);
        body.appendChild(approvalDeck);
        body.appendChild(trace);
        const eventTimeline = this.createAgentEventTimeline(events);
        if (eventTimeline.panel) {
            body.appendChild(eventTimeline.panel);
        }
        panel.appendChild(summary);
        panel.appendChild(body);
        // Safety: only use insertBefore if contentDiv is already a child of messageElement
        if (contentDiv.parentNode === messageElement) {
            messageElement.insertBefore(panel, contentDiv);
        } else {
            messageElement.appendChild(panel);
        }
        return panel;
    }

    setAgentStage(container, stageId, state, note = '') {
        if (state === 'active') {
            this.setReasoningStatus(container, this.getStageStatus(stageId, note));
        }
        const stage = container.agentStages?.querySelector(`[data-stage="${stageId}"]`);
        if (!stage) return;
        stage.classList.remove('pending', 'active', 'done', 'error');
        stage.classList.add(state);
        const noteEl = stage.querySelector('.agent-stage-note');
        if (noteEl) noteEl.textContent = note;
    }

    addAgentTrace(container, stage, message) {
        if (stage === 'route' || stage === 'act' || stage === 'observe') {
            this.appendReasoningEvent(container, this.formatTraceForReasoning(stage, message));
        }
        if (!container.agentTrace) return;
        const row = document.createElement('div');
        row.className = 'agent-trace-row';
        row.innerHTML = `
            <span class="agent-trace-stage">${this.escapeHtml(stage)}</span>
            <span class="agent-trace-message">${this.escapeHtml(message)}</span>
        `;
        container.agentTrace.appendChild(row);
    }

    createAgentEventTimeline(events = []) {
        const visibleEvents = events.filter(event => this.shouldDisplayAgentEvent(event));
        const panel = document.createElement('details');
        panel.className = 'agent-event-panel';
        panel.open = false;

        const summary = document.createElement('summary');
        summary.className = 'agent-event-summary';
        summary.innerHTML = `
            <span class="agent-event-title">EVENTS</span>
            <span class="agent-event-count">${visibleEvents.length}</span>
        `;

        const log = document.createElement('div');
        log.className = 'agent-event-log';
        visibleEvents.forEach(event => log.appendChild(this.createAgentEventRow(event)));

        panel.appendChild(summary);
        panel.appendChild(log);
        return {
            panel,
            log,
            count: summary.querySelector('.agent-event-count')
        };
    }

    appendAgentEvent(container, event) {
        if (!container || !this.shouldDisplayAgentEvent(event)) return;
        if (!container.agentRunPanel) {
            if (!Array.isArray(container.pendingAgentEvents)) {
                container.pendingAgentEvents = [];
            }
            container.pendingAgentEvents.push(event);
            return;
        }
        if (!container.agentEventLog) {
            const timeline = this.createAgentEventTimeline([]);
            container.agentEventTimeline = timeline.panel;
            container.agentEventLog = timeline.log;
            container.agentEventCount = timeline.count;
            if (container.agentRunPanel?.querySelector('.agent-run-body')) {
                container.agentRunPanel.querySelector('.agent-run-body').appendChild(timeline.panel);
            }
        }
        container.agentEventLog.appendChild(this.createAgentEventRow(event));
        const count = container.agentEventLog.children.length;
        if (container.agentEventCount) {
            container.agentEventCount.textContent = String(count);
        }
        if (event.type === 'approval.required') {
            this.displayApprovalCard(container, event);
        }
        if (event.type === 'approval.resolved') {
            this.applyApprovalResolution(container, event);
        }
    }

    createAgentApprovalDeck(events = []) {
        const deck = document.createElement('div');
        deck.className = 'agent-approval-deck';
        events
            .filter(event => event?.type === 'approval.required')
            .forEach(event => deck.appendChild(this.createApprovalCard(event)));
        events
            .filter(event => event?.type === 'approval.resolved')
            .forEach(event => this.applyApprovalResolutionToDeck(deck, event));
        return deck;
    }

    displayApprovalCard(container, event, options = {}) {
        if (!container.agentApprovalDeck) {
            const deck = this.createAgentApprovalDeck([]);
            container.agentApprovalDeck = deck;
            const body = container.agentRunPanel?.querySelector('.agent-run-body');
            if (body) {
                const toolDeck = body.querySelector('.agent-tool-deck');
                if (toolDeck) body.insertBefore(deck, toolDeck);
                else body.appendChild(deck);
            }
        }
        const key = this.getApprovalKey(event);
        const existing = Array.from(container.agentApprovalDeck.children)
            .find(card => card.dataset.approvalKey === key);
        if (existing && !options.interactive) return existing;
        const card = this.createApprovalCard(event, options);
        if (existing) {
            existing.replaceWith(card);
        } else {
            container.agentApprovalDeck.appendChild(card);
        }
        return card;
    }

    createApprovalCard(event, options = {}) {
        const payload = event.payload || {};
        const card = document.createElement('div');
        const interactive = Boolean(options.interactive && payload.enforced);
        card.className = `agent-approval-card ${payload.enforced ? 'pending' : 'event-only'}`;
        card.dataset.approvalKey = this.getApprovalKey(event);
        const args = this.formatApprovalArguments(options.args ?? payload.arguments_preview);
        const impact = payload.impact || 'No impact description provided.';
        const argsBlock = interactive
            ? `
                <textarea class="agent-approval-editor" spellcheck="false" aria-label="Approval arguments">${this.escapeHtml(args)}</textarea>
                <div class="agent-approval-error" aria-live="polite"></div>
                <div class="agent-approval-actions">
                    <button type="button" class="agent-approval-btn approve" data-approval-action="approve">Approve</button>
                    <button type="button" class="agent-approval-btn reject" data-approval-action="reject">Reject</button>
                </div>
            `
            : `<pre class="agent-approval-args">${this.escapeHtml(args)}</pre>`;
        card.innerHTML = `
            <div class="agent-approval-header">
                <span class="agent-approval-title">APPROVAL</span>
                <span class="agent-approval-risk">${this.escapeHtml(payload.risk || 'unknown')}</span>
                <span class="agent-approval-mode" data-approval-status>${this.escapeHtml(payload.enforced ? 'WAITING' : 'EVENT ONLY')}</span>
            </div>
            <div class="agent-approval-grid">
                <span class="agent-approval-label">Tool</span>
                <span class="agent-approval-value">${this.escapeHtml(payload.name || 'tool')}</span>
                <span class="agent-approval-label">Impact</span>
                <span class="agent-approval-value">${this.escapeHtml(impact)}</span>
            </div>
            ${argsBlock}
        `;
        return card;
    }

    waitForAgentApproval(container, event, context = {}) {
        const card = this.displayApprovalCard(container, event, {
            interactive: true,
            args: context.args
        });
        const payload = event?.payload || {};
        if (!card) {
            return Promise.resolve({
                status: 'rejected',
                args: context.args || {},
                reason: 'Approval UI is unavailable.'
            });
        }

        return new Promise(resolve => {
            let settled = false;
            const editor = card.querySelector('.agent-approval-editor');
            const error = card.querySelector('.agent-approval-error');
            const buttons = Array.from(card.querySelectorAll('[data-approval-action]'));
            const settle = status => {
                if (settled) return;
                if (status === 'approved') {
                    try {
                        const args = this.parseApprovalArguments(editor?.value, context.args || {});
                        settled = true;
                        this.setApprovalCardBusy(card);
                        resolve({ status: 'approved', args });
                    } catch (e) {
                        if (error) error.textContent = e.message;
                        editor?.classList.add('invalid');
                    }
                    return;
                }
                settled = true;
                this.setApprovalCardBusy(card);
                resolve({
                    status: 'rejected',
                    args: context.args || {},
                    reason: `用户拒绝执行 ${payload.name || 'tool'}`
                });
            };

            buttons.forEach(button => {
                button.addEventListener('click', () => settle(button.dataset.approvalAction === 'approve' ? 'approved' : 'rejected'));
            });
            editor?.addEventListener('input', () => {
                editor.classList.remove('invalid');
                if (error) error.textContent = '';
            });
        });
    }

    parseApprovalArguments(value, fallback) {
        const text = String(value ?? '').trim();
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('Arguments must be valid JSON before approval.');
        }
    }

    setApprovalCardBusy(card) {
        card.classList.add('resolving');
        card.querySelectorAll('button, textarea').forEach(element => {
            element.disabled = true;
        });
    }

    applyApprovalResolution(container, event) {
        if (!container?.agentApprovalDeck) return;
        this.applyApprovalResolutionToDeck(container.agentApprovalDeck, event);
    }

    applyApprovalResolutionToDeck(deck, event) {
        const key = this.getApprovalKey(event);
        const card = Array.from(deck?.children || []).find(item => item.dataset.approvalKey === key);
        if (!card) return;
        const payload = event.payload || {};
        const approved = payload.status === 'approved' || payload.approved === true;
        card.classList.remove('pending', 'event-only', 'resolving');
        card.classList.add(approved ? 'approved' : 'rejected');
        const status = card.querySelector('[data-approval-status]');
        if (status) status.textContent = approved ? 'APPROVED' : 'REJECTED';
        card.querySelectorAll('button, textarea').forEach(element => {
            element.disabled = true;
        });
        let resolution = card.querySelector('.agent-approval-resolution');
        if (!resolution) {
            resolution = document.createElement('div');
            resolution.className = 'agent-approval-resolution';
            card.appendChild(resolution);
        }
        resolution.textContent = `${approved ? 'Approved' : 'Rejected'}${payload.edited ? ' · edited arguments' : ''}`;
    }

    getApprovalKey(event) {
        const payload = event?.payload || {};
        return String(payload.approval_id || payload.tool_call_id || `${payload.name || 'tool'}-${event?.seq || ''}`);
    }

    formatApprovalArguments(value) {
        const text = typeof value === 'string' ? value : JSON.stringify(value || {});
        if (!text) return '{}';
        try {
            return JSON.stringify(JSON.parse(text), null, 2);
        } catch (e) {
            return text;
        }
    }

    shouldDisplayAgentEvent(event) {
        if (!event || !event.type) return false;
        return event.type !== 'model.delta';
    }

    createAgentEventRow(event) {
        const row = document.createElement('div');
        const state = this.getAgentEventState(event);
        row.className = `agent-event-row ${state}`;
        const time = this.formatAgentEventTime(event.ts);
        const label = this.getAgentEventLabel(event);
        const message = this.getAgentEventMessage(event);
        const stage = event.stage || '';
        row.innerHTML = `
            <span class="agent-event-dot"></span>
            <span class="agent-event-time">${this.escapeHtml(time)}</span>
            <span class="agent-event-type">${this.escapeHtml(label)}</span>
            <span class="agent-event-stage">${this.escapeHtml(stage)}</span>
            <span class="agent-event-message">${this.escapeHtml(message)}</span>
        `;
        return row;
    }

    getAgentEventState(event) {
        if (/failed|error/i.test(event.type || '')) return 'error';
        if (/approval\.required/.test(event.type || '')) return 'warning';
        if (/approval\.resolved/.test(event.type || '') && event.payload?.status !== 'approved') return 'error';
        if (/completed|added|resolved|verified/.test(event.type || '')) return 'done';
        if (/started|requested|created|built|route/.test(event.type || '')) return 'active';
        return 'neutral';
    }

    getAgentEventLabel(event) {
        const map = {
            'run.started': 'run',
            'context.built': 'context',
            'plan.created': 'plan',
            'route.completed': 'route',
            'model.started': 'model',
            'model.completed': 'model',
            'tool.requested': 'tool',
            'approval.required': 'approval',
            'approval.resolved': 'approval',
            'tool.started': 'tool',
            'tool.completed': 'tool',
            'tool.failed': 'tool',
            'evidence.added': 'evidence',
            'citation.verified': 'citation',
            'artifact.created': 'artifact',
            'synthesis.started': 'synthesis',
            'run.completed': 'run',
            'run.failed': 'run',
            'run.cancelled': 'run'
        };
        return map[event.type] || event.type;
    }

    getAgentEventMessage(event) {
        const payload = event.payload || {};
        switch (event.type) {
            case 'run.started':
                return `${payload.mode || 'run'}${payload.researchProfile ? ` / ${payload.researchProfile}` : ''}`;
            case 'context.built':
                return this.formatContextSummary(payload.summary);
            case 'plan.created':
                return `${payload.mode || 'plan'} · ${payload.maxIterations || 0} iterations`;
            case 'route.completed':
                return `${Array.isArray(payload.selectedTools) ? payload.selectedTools.length : 0} tools selected`;
            case 'model.started':
                return payload.iteration ? `iteration ${payload.iteration}` : 'model turn started';
            case 'model.completed':
                return payload.tool_call_count !== undefined
                    ? `${payload.tool_call_count} tool call(s), ${payload.content_chars || 0} chars`
                    : `${payload.content_chars || 0} chars`;
            case 'tool.requested':
            case 'tool.started':
                return `${payload.name || 'tool'}${payload.metadata?.risk ? ` · ${payload.metadata.risk}` : ''}`;
            case 'tool.completed':
                return `${payload.name || 'tool'} completed · ${payload.result_chars || 0} chars`;
            case 'tool.failed':
                return `${payload.name || 'tool'} failed · ${payload.result_chars || 0} chars`;
            case 'approval.required':
                return `${payload.name || 'tool'} · ${payload.risk || 'approval'} · ${payload.enforced ? 'enforced' : 'event only'}`;
            case 'approval.resolved':
                return `${payload.name || 'tool'} · ${payload.status || 'resolved'}${payload.edited ? ' · edited' : ''}`;
            case 'evidence.added':
                return `${payload.title || payload.url || payload.kind || 'evidence'}${payload.trustLevel ? ` · ${payload.trustLevel}` : ''}`;
            case 'citation.verified':
                return `${Array.isArray(payload.matched) ? payload.matched.length : 0} matched, ${Array.isArray(payload.unmatched) ? payload.unmatched.length : 0} unmatched, ${Array.isArray(payload.weak) ? payload.weak.length : 0} weak`;
            case 'synthesis.started':
                return `${payload.tool_calls || 0} tool call(s), ${payload.evidence_items || 0} evidence item(s)`;
            case 'run.completed':
                return `${payload.content_chars || 0} chars${Array.isArray(payload.warnings) && payload.warnings.length ? ` · ${payload.warnings.length} warning(s)` : ''}`;
            default:
                return this.truncateForLog(JSON.stringify(payload || {}), 180);
        }
    }

    formatContextSummary(summary) {
        if (!summary) return 'context ready';
        const parts = [
            `${summary.priorMessageCount || 0} messages`,
            `${summary.attachmentCount || 0} attachments`
        ];
        if (summary.textAttachmentCount) parts.push(`${summary.textAttachmentCount} text`);
        if (summary.imageAttachmentCount) parts.push(`${summary.imageAttachmentCount} image`);
        return parts.join(' · ');
    }

    formatAgentEventTime(ts) {
        if (!ts) return '';
        const date = new Date(ts);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    /**
     * 显示工具调用卡片
     * @param {Object} container
     * @param {Object} toolCall - { id, function: { name, arguments } }
     * @returns {HTMLElement} 工具卡片元素
     */
    displayToolCall(container, toolCall) {
        this.toolCallNames.set(toolCall.id, toolCall.function.name);
        this.setReasoningStatus(container, `正在调用 ${toolCall.function.name}`);
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-call-card tool-executing';
        toolCard.id = `tool-${toolCall.id}`;

        let args = '{}';
        try {
            args = JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2);
        } catch (e) {
            args = toolCall.function.arguments;
        }
        this.appendReasoningEvent(container, `调用工具：${toolCall.function.name} ${this.truncateForLog(String(args).replace(/\s+/g, ' '), 220)}`);

        toolCard.innerHTML = `
            <div class="tool-call-header">
                <span class="tool-icon">🔧</span>
                <span class="tool-name">${this.escapeHtml(toolCall.function.name)}</span>
                <span class="tool-status">执行中...</span>
            </div>
            <div class="tool-call-args">
                <pre>${this.escapeHtml(args)}</pre>
            </div>
            <div class="tool-call-result"></div>
        `;
        toolCard.hidden = true;

        if (container.toolDeck) {
            container.toolDeck.appendChild(toolCard);
        } else {
            container.element.appendChild(toolCard);
        }
        return toolCard;
    }

    /**
     * 更新工具调用结果
     * @param {string} toolCallId
     * @param {string} result
     * @param {boolean} success
     */
    updateToolResult(toolCallId, result, success = true) {
        const toolCard = document.getElementById(`tool-${toolCallId}`);
        if (!toolCard) return;
        this.appendToolResultEvent(toolCard, toolCallId, result, success);

        toolCard.classList.remove('tool-executing');
        toolCard.classList.add(success ? 'tool-success' : 'tool-error');

        const statusEl = toolCard.querySelector('.tool-status');
        statusEl.textContent = success ? '已完成' : '失败';

        const resultEl = toolCard.querySelector('.tool-call-result');
        resultEl.innerHTML = `<pre>${this.escapeHtml(result)}</pre>`;
    }

    appendToolResultEvent(toolCard, toolCallId, result, success) {
        const messageElement = toolCard.closest('.assistant-message');
        const summary = messageElement?.querySelector('.reasoning-details summary');
        const reasoningContent = messageElement?.querySelector('.reasoning-content');
        const cursorSpan = reasoningContent?.querySelector('.cursor-blink');
        if (summary) {
            summary.innerHTML = `<span>${success ? '正在读取工具结果' : '工具调用失败，正在调整'}</span> <span class="status-dot"></span>`;
        }
        if (!reasoningContent) return;
        const toolName = this.toolCallNames.get(toolCallId) || '工具';
        const preview = this.truncateForLog(String(result ?? '').replace(/\s+/g, ' ').trim(), 260);
        const prefix = reasoningContent.textContent.trim() ? '\n' : '';
        const line = `${prefix}${success ? '工具完成' : '工具失败'}：${toolName}${preview ? `，结果摘要：${preview}` : ''}`;
        const textNode = document.createTextNode(line);
        if (cursorSpan && cursorSpan.parentNode === reasoningContent) {
            reasoningContent.insertBefore(textNode, cursorSpan);
        } else {
            reasoningContent.appendChild(textNode);
        }
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    getPlanStatus(plan) {
        if (plan.mode === 'research') return '正在检索资料';
        if (plan.mode === 'agent') return '正在分析并选择工具';
        return '正在分析问题';
    }

    getStageStatus(stageId, note = '') {
        const usefulNote = note && !/^Iteration\s+\d+$/i.test(note) ? `：${note}` : '';
        const map = {
            plan: '正在分析问题',
            route: '正在选择可用工具',
            act: `正在调用工具${usefulNote}`,
            observe: '正在读取工具结果',
            synthesize: '正在整理回答'
        };
        return map[stageId] || '正在思考';
    }

    formatTraceForReasoning(stage, message) {
        if (stage === 'route' && message.startsWith('Routed tools:')) {
            const tools = message.replace('Routed tools:', '').split(',').map(v => v.trim()).filter(Boolean);
            return `已选择工具：${tools.slice(0, 8).join(', ')}${tools.length > 8 ? ` 等 ${tools.length} 个` : ''}`;
        }
        if (stage === 'act' || stage === 'observe') {
            return message.replace(/^Iteration \d+:\s*/i, '');
        }
        return message;
    }

    truncateForLog(value, max) {
        const text = String(value ?? '');
        return text.length <= max ? text : `${text.slice(0, max)}...`;
    }

    /**
     * 完成消息（保存状态）
     * @param {Object} container
     */
    finalizeMessage(container) {
        container.reasoningDetails.classList.remove('thinking-state');
        this.setReasoningStatus(container, '已完成思考');
        if (container.cursorSpan.parentNode) {
            container.cursorSpan.parentNode.removeChild(container.cursorSpan);
        }

        // 最终 MathJax 渲染
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([container.contentDiv]).catch(err => console.log('MathJax error:', err));
        }
    }

    /**
     * 显示中断状态
     * @param {Object} container
     */
    showInterrupted(container) {
        container.reasoningDetails.classList.remove('thinking-state');
        container.reasoningSummary.innerHTML = `<span>ANALYSIS INTERRUPTED</span> <span class="status-dot"></span>`;
        if (container.cursorSpan.parentNode) {
            container.cursorSpan.parentNode.removeChild(container.cursorSpan);
        }
    }

    /**
     * 显示错误消息
     * @param {Object} container
     * @param {string} errorMessage
     */
    showError(container, errorMessage) {
        container.contentDiv.innerHTML = `<span style="color:#ff0055">[SYSTEM FAILURE]: ${errorMessage}</span>`;
    }

    /**
     * 从历史记录显示消息
     * @param {Object} msg - { role, content, reasoning, tool_calls }
     */
    displayMessageFromHistory(msg) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`;

        // 显示思维链
        if (msg.reasoning_content || msg.reasoning) {
            const reasoningDetails = document.createElement('details');
            reasoningDetails.className = 'reasoning-details';
            reasoningDetails.open = false;

            const reasoningSummary = document.createElement('summary');
            reasoningSummary.innerHTML = `<span>已完成思考</span> <span class="status-dot"></span>`;

            const reasoningContentDiv = document.createElement('div');
            reasoningContentDiv.className = 'reasoning-content';
            reasoningContentDiv.textContent = msg.reasoning_content || msg.reasoning;

            reasoningDetails.appendChild(reasoningSummary);
            reasoningDetails.appendChild(reasoningContentDiv);
            messageElement.appendChild(reasoningDetails);
        }

        // 显示工具调用
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            msg.tool_calls.forEach(tc => {
                const toolCard = document.createElement('div');
                toolCard.className = 'tool-call-card tool-success';

                let args = '{}';
                try {
                    args = JSON.stringify(JSON.parse(tc.function.arguments), null, 2);
                } catch (e) {
                    args = tc.function.arguments;
                }

                toolCard.innerHTML = `
                    <div class="tool-call-header">
                        <span class="tool-icon">🔧</span>
                        <span class="tool-name">${tc.function.name}</span>
                        <span class="tool-status">已完成</span>
                    </div>
                    <div class="tool-call-args">
                        <pre>${args}</pre>
                    </div>
                `;
                messageElement.appendChild(toolCard);
            });
        }

        // 显示内容
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content message-text';
        if (msg.role === 'user') {
            messageContent.textContent = msg.content || '';
        } else {
            messageContent.innerHTML = this.formatMessage(msg.content);
        }
        // 必须先将 messageContent 添加到 messageElement，
        // 然后再调用 restoreAgentRunPanel（它内部使用 insertBefore 需要 contentDiv 已经是子节点）
        messageElement.appendChild(messageContent);
        if (msg.role === 'user') {
            this.appendAttachmentSummary(messageElement, msg.attachments || []);
        }
        const agentRunId = msg.agent_run_id || msg.agentRunId || '';
        const restoredAgentRun = msg.role !== 'user'
            ? (msg.agent_run || window.agentRunStore?.getRun?.(agentRunId))
            : null;
        if (restoredAgentRun) {
            this.restoreAgentRunPanel(messageElement, messageContent, restoredAgentRun);
        } else if (msg.role !== 'user' && agentRunId && window.agentRunStore?.fetchRun) {
            window.agentRunStore.fetchRun(agentRunId).then(run => {
                if (!run || !messageElement.isConnected || messageElement.querySelector('.agent-run-panel')) return;
                msg.agent_run = run;
                this.restoreAgentRunPanel(messageElement, messageContent, run);
            });
        }
        if (msg.role !== 'user' && Array.isArray(msg.images) && msg.images.length) {
            const grid = document.createElement('div');
            grid.className = 'generated-image-grid';
            this.appendGeneratedImages(grid, msg.images);
            messageElement.appendChild(grid);
        }

        this.messagesContainer.appendChild(messageElement);

        // MathJax 渲染
        if (window.MathJax && window.MathJax.typesetPromise && msg.role !== 'user') {
            window.MathJax.typesetPromise([messageContent]).catch(err => console.log('MathJax error:', err));
        }
    }

    /**
     * 清空消息区域并显示初始提示
     */
    clearMessages() {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = `
                <div class="message system-message">
                    <div class="message-content">请输入您的问题...</div>
                </div>
            `;
        }
    }

    /**
     * 更新聊天历史列表 UI
     * @param {Array} sortedHistory - 排序后的历史记录
     * @param {string} currentChatId - 当前聊天ID
     * @param {Function} onSelect - 选择回调
     */
    updateHistoryList(sortedHistory, currentChatId, onSelect, selectedChatIds = new Set(), onSelectionChange = null) {
        const historyList = document.getElementById('chat-history-list');
        if (!historyList) return;

        historyList.innerHTML = '';

        sortedHistory.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'history-item';
            if (chat.id === currentChatId) {
                chatItem.classList.add('active');
            }

            chatItem.innerHTML = `
                <div class="history-title">${chat.title}</div>
                <div class="history-time">${window.historyManager.formatDate(chat.timestamp)}</div>
                <div class="history-select"><input type="checkbox" class="history-checkbox" data-id="${chat.id}"></div>
            `;

            const checkbox = chatItem.querySelector('.history-checkbox');
            if (checkbox) {
                checkbox.checked = selectedChatIds.has(chat.id);
                checkbox.addEventListener('click', e => e.stopPropagation());
                checkbox.addEventListener('change', () => {
                    if (typeof onSelectionChange === 'function') {
                        onSelectionChange(chat.id, checkbox.checked);
                    }
                });
            }

            chatItem.addEventListener('click', (e) => {
                if (e.target.classList.contains('history-checkbox')) return;
                onSelect(chat.id);
            });

            historyList.appendChild(chatItem);
        });
    }

    /**
     * 初始化 MathJax
     */
    initMathJax() {
        if (window.MathJax) return;

        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']]
            },
            svg: {
                fontCache: 'global'
            }
        };

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        script.async = true;
        script.id = 'MathJax-script';

        script.onload = () => {
            if (window.MathJax && window.MathJax.typesetPromise) {
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    window.MathJax.typesetPromise([chatMessages]).catch(err => console.log('MathJax error:', err));
                }
            }
        };

        document.head.appendChild(script);
    }
}

// 导出单例
window.chatUI = new ChatUI();
