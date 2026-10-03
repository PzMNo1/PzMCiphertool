/**
 * AgentContextManager - Agent 模块上下文窗口管理
 *
 * 职责：
 * 1. 估算消息历史的 token 占用，判断是否接近模型上下文上限。
 * 2. 超限前自动压缩（保留 system 消息 + 最近若干轮，中间部分折叠为摘要）。
 * 3. 把使用率渲染到输入框右下角的圆环进度条 #context-progress-ring。
 */
(function () {
    const DEFAULT_RING_SELECTOR = '#context-progress-ring';
    const DEFAULT_MAX_TOKENS = 180000;
    const RING_RADIUS = 18;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

    class AgentContextManager {
        constructor(options = {}) {
            this.ringSelector = options.ringSelector || DEFAULT_RING_SELECTOR;
            this.ringElement = null;
            this.ringValue = null;
            this.ringLabel = null;

            // 上下文预算：模型总窗口 - 预留输出空间
            this.maxTokens = Number(options.maxTokens) > 0 ? Number(options.maxTokens) : DEFAULT_MAX_TOKENS;
            this.reservedOutputTokens = Number(options.reservedOutputTokens) > 0
                ? Number(options.reservedOutputTokens)
                : 20000;
            this.warnRatio = Number(options.warnRatio) > 0 ? Number(options.warnRatio) : 0.7;
            this.dangerRatio = Number(options.dangerRatio) > 0 ? Number(options.dangerRatio) : 0.9;
            // 达到该比例即触发压缩
            this.compressRatio = Number(options.compressRatio) > 0 ? Number(options.compressRatio) : 0.85;
            // 压缩时至少保留的最近消息条数
            this.minRecentMessages = Number(options.minRecentMessages) > 0
                ? Number(options.minRecentMessages)
                : 8;

            this.currentTokens = 0;
            this.visible = false;
        }

        /* ---------- 圆环绑定与渲染 ---------- */

        attach(target) {
            if (target && typeof target === 'object' && target.nodeType === 1) {
                this.ringElement = target;
            } else {
                this.ringElement = document.querySelector(target || this.ringSelector);
            }
            if (this.ringElement) {
                this.ringValue = this.ringElement.querySelector('.context-ring-value');
                this.ringLabel = this.ringElement.querySelector('.context-ring-label');
                if (this.ringValue) {
                    this.ringValue.setAttribute('stroke-dasharray', String(RING_CIRCUMFERENCE));
                }
            }
            this.renderRing();
            return this.ringElement;
        }

        ensureRing() {
            if (this.ringElement && this.ringElement.isConnected) return this.ringElement;
            return this.attach(this.ringSelector);
        }

        getUsageRatio() {
            if (this.maxTokens <= 0) return 0;
            return Math.min(1, this.currentTokens / this.maxTokens);
        }

        renderRing() {
            const ring = this.ensureRing();
            if (!ring) return;

            const ratio = this.getUsageRatio();
            const hasData = this.visible || ratio > 0;

            ring.classList.toggle('visible', hasData);
            ring.classList.toggle('warn', ratio >= this.warnRatio && ratio < this.dangerRatio);
            ring.classList.toggle('danger', ratio >= this.dangerRatio);

            if (this.ringValue) {
                this.ringValue.setAttribute('stroke-dasharray', String(RING_CIRCUMFERENCE));
                this.ringValue.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));
            }
            if (this.ringLabel) {
                this.ringLabel.textContent = `${Math.round(ratio * 100)}%`;
            }
            ring.setAttribute(
                'title',
                `上下文窗口使用率 ${Math.round(ratio * 100)}%（约 ${this.currentTokens.toLocaleString()} / ${this.maxTokens.toLocaleString()} tok）`
            );
        }

        /* ---------- token 估算 ---------- */

        estimateTokens(text) {
            if (!text) return 0;
            const str = String(text);
            const cjk = (str.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g) || []).length;
            const rest = str.length - cjk;
            // CJK 约 1 token/字，其余按约 4 字符/token 近似
            return Math.ceil(cjk + rest / 4);
        }

        estimateMessageTokens(message) {
            if (!message) return 0;
            let tokens = 4;
            const content = message.content;
            if (typeof content === 'string') {
                tokens += this.estimateTokens(content);
            } else if (Array.isArray(content)) {
                content.forEach(part => {
                    if (!part) return;
                    if (typeof part.text === 'string') tokens += this.estimateTokens(part.text);
                    else if (part.type === 'image_url' || part.image_url) tokens += 255;
                });
            }
            if (Array.isArray(message.tool_calls)) {
                tokens += this.estimateTokens(JSON.stringify(message.tool_calls));
            }
            return tokens;
        }

        estimateMessagesTokens(messages = []) {
            let total = 0;
            for (const message of messages) {
                total += this.estimateMessageTokens(message);
            }
            return total;
        }

        /* ---------- 状态更新 ---------- */

        /**
         * 依据模型返回的 usage 校正真实占用（prompt_tokens 最准确）。
         */
        updateFromUsage(usage = {}, messages = null) {
            const promptTokens = Number(
                usage?.prompt_tokens ?? usage?.input_tokens ?? usage?.promptTokens
            );
            if (Number.isFinite(promptTokens) && promptTokens > 0) {
                this.currentTokens = promptTokens;
            } else if (Array.isArray(messages)) {
                this.currentTokens = this.estimateMessagesTokens(messages);
            }
            this.visible = true;
            this.renderRing();
            return this.getUsageRatio();
        }

        /**
         * 仅用本地估算更新（用于请求发出前）。
         */
        updateFromMessages(messages = []) {
            this.currentTokens = this.estimateMessagesTokens(messages);
            this.renderRing();
            return this.getUsageRatio();
        }

        setMaxTokens(maxTokens) {
            const value = Number(maxTokens);
            if (Number.isFinite(value) && value > 0) {
                this.maxTokens = value;
                this.renderRing();
            }
        }

        reset() {
            this.currentTokens = 0;
            this.visible = false;
            this.renderRing();
        }

        /* ---------- 压缩 ---------- */

        /**
         * 是否需要在发送前压缩。
         */
        shouldCompress(messages = null) {
            if (!Array.isArray(messages)) return false;
            const tokens = this.estimateMessagesTokens(messages);
            return tokens >= this.maxTokens * this.compressRatio;
        }

        /**
         * 压缩消息历史。
         * 保留：全部 system 消息 + 最近 N 条非 system 消息；中间部分折叠为一条摘要。
         * @returns {{messages: Array, compressed: boolean, removedCount: number, tokensBefore: number, tokensAfter: number}}
         */
        compressMessages(messages = []) {
            const list = Array.isArray(messages) ? messages : [];
            const tokensBefore = this.estimateMessagesTokens(list);
            const budget = Math.max(1, this.maxTokens - this.reservedOutputTokens);

            if (tokensBefore <= budget) {
                this.currentTokens = tokensBefore;
                return {
                    messages: list,
                    compressed: false,
                    removedCount: 0,
                    tokensBefore,
                    tokensAfter: tokensBefore
                };
            }

            const systemMessages = list.filter(m => m?.role === 'system');
            const nonSystemMessages = list.filter(m => m?.role !== 'system');

            const systemTokens = this.estimateMessagesTokens(systemMessages);
            let available = budget - systemTokens;

            // system 本身超额：只能保留 system，丢弃全部历史
            if (available <= 0) {
                this.currentTokens = systemTokens;
                this.renderRing();
                return {
                    messages: systemMessages,
                    compressed: true,
                    removedCount: nonSystemMessages.length,
                    tokensBefore,
                    tokensAfter: systemTokens
                };
            }

            // 从最近往前保留
            const kept = [];
            let keptTokens = 0;
            const minRecent = Math.min(this.minRecentMessages, nonSystemMessages.length);
            for (let i = nonSystemMessages.length - 1; i >= 0; i -= 1) {
                const message = nonSystemMessages[i];
                const tokens = this.estimateMessageTokens(message);
                const mustKeep = kept.length < minRecent;
                if (mustKeep || keptTokens + tokens <= available) {
                    kept.unshift(message);
                    keptTokens += tokens;
                } else {
                    break;
                }
            }

            const removed = nonSystemMessages.slice(0, nonSystemMessages.length - kept.length);
            const result = [...systemMessages];

            if (removed.length) {
                const summary = this.buildFoldSummary(removed);
                result.push(summary);
            }
            result.push(...kept);

            const tokensAfter = this.estimateMessagesTokens(result);
            this.currentTokens = tokensAfter;
            this.renderRing();

            return {
                messages: result,
                compressed: removed.length > 0,
                removedCount: removed.length,
                tokensBefore,
                tokensAfter
            };
        }

        buildFoldSummary(removedMessages) {
            const userTurns = removedMessages.filter(m => m?.role === 'user').length;
            const assistantTurns = removedMessages.filter(m => m?.role === 'assistant').length;
            const toolTurns = removedMessages.filter(m => m?.role === 'tool').length;
            const parts = [];
            if (userTurns) parts.push(`${userTurns} 条用户提问`);
            if (assistantTurns) parts.push(`${assistantTurns} 条助手回复`);
            if (toolTurns) parts.push(`${toolTurns} 条工具结果`);

            const tail = removedMessages
                .filter(m => m?.role === 'user' && typeof m.content === 'string')
                .slice(-3)
                .map(m => m.content.replace(/\s+/g, ' ').trim().slice(0, 160))
                .filter(Boolean);

            const lines = [
                `[上下文压缩] 为控制上下文窗口，已折叠较早的 ${removedMessages.length} 条历史消息（${parts.join('、') || '无明细'}）。`,
                '如需引用更早内容，请基于当前对话继续，或请用户重新提供。'
            ];
            if (tail.length) {
                lines.push('被折叠的用户提问摘要：');
                tail.forEach(item => lines.push(`- ${item}`));
            }
            return { role: 'system', content: lines.join('\n') };
        }

        getStats() {
            return {
                currentTokens: this.currentTokens,
                maxTokens: this.maxTokens,
                budgetTokens: Math.max(0, this.maxTokens - this.reservedOutputTokens),
                usageRatio: this.getUsageRatio(),
                needsCompression: this.getUsageRatio() >= this.compressRatio
            };
        }
    }

    window.AgentContextManager = AgentContextManager;
    window.agentContextManager = window.agentContextManager || new AgentContextManager();
})();
