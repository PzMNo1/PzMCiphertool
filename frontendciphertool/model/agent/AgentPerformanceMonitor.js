/**
 * AgentPerformanceMonitor - Agent 模块性能监控
 *
 * 上一版有两个致命缺陷，本例修复：
 *
 * 缺陷 1：只给 plan 那一次调用埋点，工具循环里每次迭代的模型请求全部漏记。
 *   实测整轮 26 次请求 / 输入 220 万 token，面板却显示「1 次请求 / 1.3K / 0.9K」。
 *   → 现在由 runtime 在 onIterationStart/onIterationComplete 处逐轮登记，覆盖全部请求。
 *
 * 缺陷 2：工具耗时把每次调用的耗时直接相加。而同一轮内工具是并行的（并发上限 40），
 *   于是出现「工具 859.9 秒」大于「整轮 465.8 秒」这种不可能的结果。
 *   → 现在改用**区间并集**统计墙钟时间：并行调用只算一次，串行调用自然累加。
 *   同时保留累计值用于参考，并记录并发峰值。
 */
(function () {
    const DEFAULT_SELECTOR = '#agent-performance-monitor';

    class AgentPerformanceMonitor {
        constructor(options = {}) {
            this.element = null;
            this.selector = options.selector || DEFAULT_SELECTOR;
            this.run = null;

            this.activeLLMCalls = new Map();
            this.activeToolCalls = new Map();
            this.llmSeq = 0;
            this.toolSeq = 0;
            this.renderQueued = false;
        }

        /* ---------------- 绑定与生命周期 ---------------- */

        attach(target) {
            if (target && typeof target === 'object' && target.nodeType === 1) {
                this.element = target;
            } else {
                this.element = document.querySelector(target || this.selector);
            }
            return this.element;
        }

        ensureElement() {
            if (this.element && this.element.isConnected) return this.element;
            return this.attach(this.selector);
        }

        startRun(runId = '') {
            this.run = {
                runId,
                startedAt: now(),
                llmWallMs: 0,
                llmSumMs: 0,
                llmCalls: 0,
                llmActiveCount: 0,
                llmWindowStart: 0,
                toolWallMs: 0,
                toolSumMs: 0,
                toolCalls: 0,
                toolActiveCount: 0,
                toolWindowStart: 0,
                toolConcurrencyPeak: 0,
                toolDurations: [],
                inputTokens: 0,
                outputTokens: 0,
                cacheHitTokens: 0,
                generationMs: 0,
                generatedTokens: 0,
                firstTokenSamples: []
            };
            this.activeLLMCalls.clear();
            this.activeToolCalls.clear();
            this.scheduleRender();
            return this.run;
        }

        finishRun() {
            this.closeDanglingIntervals();
            this.scheduleRender();
            return this.getSummary();
        }

        reset() {
            this.run = null;
            this.activeLLMCalls.clear();
            this.activeToolCalls.clear();
            const element = this.ensureElement();
            if (element) {
                element.innerHTML = '';
                element.classList.remove('visible');
            }
        }

        closeDanglingIntervals() {
            if (!this.run) return;
            if (this.run.llmActiveCount > 0) {
                this.run.llmWallMs += Math.max(0, now() - this.run.llmWindowStart);
                this.run.llmActiveCount = 0;
            }
            if (this.run.toolActiveCount > 0) {
                this.run.toolWallMs += Math.max(0, now() - this.run.toolWindowStart);
                this.run.toolActiveCount = 0;
            }
        }

        /* ---------------- LLM 调用 ---------------- */

        beginLLMCall(label = '') {
            if (!this.run) this.startRun();
            this.llmSeq += 1;
            const callId = `llm-${this.run.runId || 'run'}-${this.llmSeq}`;

            if (this.run.llmActiveCount === 0) {
                this.run.llmWindowStart = now();
            }
            this.run.llmActiveCount += 1;

            this.activeLLMCalls.set(callId, {
                callId,
                label,
                startTime: now(),
                firstTokenAt: null,
                inputTokens: 0,
                outputTokens: 0,
                cacheHitTokens: 0
            });
            return callId;
        }

        markFirstToken(callId) {
            const call = this.activeLLMCalls.get(callId);
            if (call && call.firstTokenAt === null) {
                call.firstTokenAt = now();
            }
        }

        completeLLMCall(callId, usage = {}) {
            const call = this.activeLLMCalls.get(callId);
            if (!call || !this.run) return null;

            const endTime = now();
            const durationMs = Math.max(0, endTime - call.startTime);
            const parsed = this.parseUsage(usage);

            call.inputTokens = parsed.inputTokens;
            call.outputTokens = parsed.outputTokens;
            call.cacheHitTokens = parsed.cacheHitTokens;

            this.run.llmSumMs += durationMs;
            this.run.llmCalls += 1;
            this.run.inputTokens += parsed.inputTokens;
            this.run.outputTokens += parsed.outputTokens;
            this.run.cacheHitTokens += parsed.cacheHitTokens;

            if (call.firstTokenAt !== null) {
                this.run.firstTokenSamples.push(Math.max(0, call.firstTokenAt - call.startTime));
                const generationMs = Math.max(0, endTime - call.firstTokenAt);
                if (generationMs > 0 && parsed.outputTokens > 0) {
                    this.run.generationMs += generationMs;
                    this.run.generatedTokens += parsed.outputTokens;
                }
            }

            this.activeLLMCalls.delete(callId);
            this.run.llmActiveCount = Math.max(0, this.run.llmActiveCount - 1);
            if (this.run.llmActiveCount === 0) {
                this.run.llmWallMs += Math.max(0, endTime - this.run.llmWindowStart);
            }

            this.scheduleRender();
            return parsed;
        }

        parseUsage(usage = {}) {
            const safe = usage && typeof usage === 'object' ? usage : {};
            const details = safe.prompt_tokens_details || safe.input_tokens_details || {};
            return {
                inputTokens: toNumber(safe.prompt_tokens ?? safe.input_tokens ?? safe.promptTokens),
                outputTokens: toNumber(safe.completion_tokens ?? safe.output_tokens ?? safe.completionTokens),
                cacheHitTokens: toNumber(
                    safe.prompt_cache_hit_tokens
                    ?? safe.cached_tokens
                    ?? safe.cache_read_input_tokens
                    ?? details.cached_tokens
                )
            };
        }

        /* ---------------- 工具调用 ---------------- */

        beginToolCall(toolCallId, toolName = '') {
            if (!this.run) this.startRun();
            const key = toolCallId || this.nextToolKey();

            if (this.run.toolActiveCount === 0) {
                this.run.toolWindowStart = now();
            }
            this.run.toolActiveCount += 1;
            this.run.toolConcurrencyPeak = Math.max(this.run.toolConcurrencyPeak, this.run.toolActiveCount);

            this.activeToolCalls.set(key, { key, toolName, startTime: now() });
            return key;
        }

        completeToolCall(toolCallId) {
            const call = toolCallId
                ? this.activeToolCalls.get(toolCallId)
                : this.lastActiveToolCall();
            if (!call || !this.run) return 0;

            const endTime = now();
            const durationMs = Math.max(0, endTime - call.startTime);
            this.activeToolCalls.delete(call.key);

            this.run.toolSumMs += durationMs;
            this.run.toolCalls += 1;
            this.run.toolDurations.push(durationMs);

            this.run.toolActiveCount = Math.max(0, this.run.toolActiveCount - 1);
            if (this.run.toolActiveCount === 0) {
                // 并行批次只累加一次墙钟区间
                this.run.toolWallMs += Math.max(0, endTime - this.run.toolWindowStart);
            }

            this.scheduleRender();
            return durationMs;
        }

        nextToolKey() {
            this.toolSeq += 1;
            return `tool-${this.toolSeq}`;
        }

        lastActiveToolCall() {
            const entries = Array.from(this.activeToolCalls.values());
            return entries.length ? entries[entries.length - 1] : null;
        }

        /* ---------------- 汇总 ---------------- */

        getSummary() {
            const run = this.run;
            if (!run) {
                return {
                    llmWallMs: 0, llmSumMs: 0, toolWallMs: 0, toolSumMs: 0,
                    avgFirstTokenMs: 0, tokensPerSecond: 0, cacheHitRate: 0,
                    inputTokens: 0, outputTokens: 0, llmCalls: 0, toolCalls: 0,
                    toolConcurrencyPeak: 0, avgToolMs: 0
                };
            }

            const avgFirstTokenMs = run.firstTokenSamples.length
                ? run.firstTokenSamples.reduce((a, b) => a + b, 0) / run.firstTokenSamples.length
                : 0;
            const tokensPerSecond = run.generationMs > 0
                ? (run.generatedTokens / run.generationMs) * 1000
                : 0;
            const cacheHitRate = run.inputTokens > 0
                ? Math.min(100, (run.cacheHitTokens / run.inputTokens) * 100)
                : 0;
            const avgToolMs = run.toolDurations.length
                ? run.toolDurations.reduce((a, b) => a + b, 0) / run.toolDurations.length
                : 0;

            return {
                llmWallMs: run.llmWallMs,
                llmSumMs: run.llmSumMs,
                toolWallMs: run.toolWallMs,
                toolSumMs: run.toolSumMs,
                avgFirstTokenMs,
                tokensPerSecond,
                cacheHitRate,
                inputTokens: run.inputTokens,
                outputTokens: run.outputTokens,
                llmCalls: run.llmCalls,
                toolCalls: run.toolCalls,
                toolConcurrencyPeak: run.toolConcurrencyPeak,
                avgToolMs
            };
        }

        /**
         * 用户指定的展示格式，主指标为墙钟时间：
         * 性能监控： LLM 【】分【】秒 · 工具调用 【】秒 | 首 token 平均 【】秒 · 【】 tok/s | 缓存命中 【】% | 输入 【】K tok · 输出 【】K tok
         */
        formatLine(summary = this.getSummary()) {
            const llmTotalSec = summary.llmWallMs / 1000;
            const llmMinutes = Math.floor(llmTotalSec / 60);
            const llmSeconds = (llmTotalSec - llmMinutes * 60).toFixed(1);
            return [
                `性能监控： LLM ${llmMinutes}分${llmSeconds}秒`,
                `· 工具调用 ${(summary.toolWallMs / 1000).toFixed(1)}秒`,
                `| 首 token 平均 ${(summary.avgFirstTokenMs / 1000).toFixed(2)}秒`,
                `· ${summary.tokensPerSecond.toFixed(1)} tok/s`,
                `| 缓存命中 ${summary.cacheHitRate.toFixed(0)}%`,
                `| 输入 ${(summary.inputTokens / 1000).toFixed(1)}K tok`,
                `· 输出 ${(summary.outputTokens / 1000).toFixed(1)}K tok`
            ].join(' ');
        }

        /* ---------------- 渲染 ---------------- */

        scheduleRender() {
            if (this.renderQueued) return;
            this.renderQueued = true;
            const task = () => {
                this.renderQueued = false;
                this.render();
            };
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(task);
            else setTimeout(task, 16);
        }

        render() {
            const element = this.ensureElement();
            if (!element) return;
            if (!this.run) {
                element.classList.remove('visible');
                return;
            }

            const summary = this.getSummary();
            const llmTotalSec = summary.llmWallMs / 1000;
            const llmMinutes = Math.floor(llmTotalSec / 60);
            const llmSeconds = (llmTotalSec - llmMinutes * 60).toFixed(1);

            const items = [
                { label: 'LLM', value: `${llmMinutes}分${llmSeconds}秒` },
                { sep: '·' },
                { label: '工具调用', value: `${(summary.toolWallMs / 1000).toFixed(1)}秒` },
                { sep: '|' },
                { label: '首 token 平均', value: `${(summary.avgFirstTokenMs / 1000).toFixed(2)}秒` },
                { sep: '·' },
                { value: `${summary.tokensPerSecond.toFixed(1)} tok/s` },
                { sep: '|' },
                { label: '缓存命中', value: `${summary.cacheHitRate.toFixed(0)}%` },
                { sep: '|' },
                { label: '输入', value: `${(summary.inputTokens / 1000).toFixed(1)}K tok` },
                { sep: '·' },
                { label: '输出', value: `${(summary.outputTokens / 1000).toFixed(1)}K tok` },
                { sep: '|' },
                { label: '请求', value: `${summary.llmCalls} 次` },
                { sep: '·' },
                { label: '并发峰值', value: `${summary.toolConcurrencyPeak}` }
            ];

            const html = ['<span class="perf-item perf-lead">性能监控：</span>']
                .concat(items.map(item => {
                    if (item.sep) return `<span class="perf-sep">${item.sep}</span>`;
                    const label = item.label ? `${this.escape(item.label)} ` : '';
                    return `<span class="perf-item">${label}<strong>${this.escape(item.value)}</strong></span>`;
                }))
                .join('');

            element.innerHTML = html;
            element.classList.add('visible');
        }

        escape(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    }

    function now() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    function toNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) && num > 0 ? num : 0;
    }

    window.AgentPerformanceMonitor = AgentPerformanceMonitor;
    window.agentPerformanceMonitor = window.agentPerformanceMonitor || new AgentPerformanceMonitor();
})();
