/**
 * DeepSeekClient - 后端模型代理客户端模块
 */

class DeepSeekClient {
    constructor(options = {}) {
        const config = resolveDeepSeekConfig();
        this.chatUrl = options.chatUrl || config.chatUrl || resolveBackendChatUrl();
        this.defaultModel = normalizeDeepSeekModel(options.defaultModel || config.defaultModel || config.model);
        this.reasonerModel = normalizeDeepSeekModel(options.reasonerModel || config.reasonerModel || config.model);
        this.imageModel = options.imageModel || config.imageModel || 'gpt-image-1';
        this.imageSize = options.imageSize || config.imageSize || '1024x1024';
        this.abortController = null;
    }

    /**
     * 创建聊天请求
     * @param {Object} options
     * @returns {Promise<Object>} 完整响应
     */
    async chat(options) {
        const {
            messages,
            tools = null,
            enableThinking = false,
            stream = true,
            onReasoning = () => { },
            onContent = () => { },
            onToolCall = () => { },
            onUsage = () => { },
            signal = null,
            timeoutMs = 180000
        } = options;

        const model = enableThinking ? this.reasonerModel : this.defaultModel;
        const runConfig = resolveRunConfig();

        const payload = {
            messages,
            stream,
            temperature: options.temperature ?? (tools?.length ? runConfig.temperatureTools : runConfig.temperatureChat),
            max_tokens: options.maxTokens ?? runConfig.maxTokens,
            top_p: 0.95,
            stream_options: { include_usage: true }
        };

        if (model) payload.model = model;

        // 添加工具定义
        if (tools && tools.length > 0) {
            payload.tools = tools;
        }

        // 请求级 AbortController：统一承接外部取消与内部超时
        const controller = new AbortController();
        this.abortController = controller;
        const abortFromExternal = () => controller.abort();
        if (signal) {
            if (signal.aborted) controller.abort();
            else signal.addEventListener('abort', abortFromExternal, { once: true });
        }
        const timer = Number.isFinite(timeoutMs) && timeoutMs > 0
            ? setTimeout(() => controller.abort(), timeoutMs)
            : null;

        try {
            // 429/5xx 视为可恢复：最多重试 1 次（2s 起指数退避）。
            let response;
            for (let attempt = 0; ; attempt++) {
                response = await fetch(this.chatUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                if (response.ok) break;
                if ((response.status === 429 || response.status >= 500) && attempt < 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
                    continue;
                }
                const errorText = await response.text().catch(() => '');
                const detail = errorText ? ` - ${errorText.slice(0, 500)}` : '';
                throw new Error(`后端模型代理错误: ${response.status} ${response.statusText}${detail}`);
            }

            if (!stream) {
                return await response.json();
            }

            // 流式处理
            return await this.processStream(response, { onReasoning, onContent, onToolCall, onUsage });
        } finally {
            if (timer) clearTimeout(timer);
            if (signal) signal.removeEventListener('abort', abortFromExternal);
        }
    }

    resolveImagesUrl() {
        throw new Error('前端直连图片生成 API 已关闭；当前后端还没有已有的图片生成代理接口。');
    }

    /**
     * 生成图片。兼容 OpenAI-style /images/generations 返回的 url 或 b64_json。
     * @param {Object} options
     * @returns {Promise<{content:string, images:Array}>}
     */
    async generateImage(options = {}) {
        const { prompt } = options;

        if (!prompt || !String(prompt).trim()) {
            throw new Error('图片生成提示不能为空');
        }
        throw new Error('前端直连图片生成 API 已关闭；当前后端还没有已有的图片生成代理接口。');
    }

    /**
     * 处理流式响应
     * @param {Response} response
     * @param {Object} callbacks
     * @returns {Promise<Object>} { reasoning_content, content, tool_calls, finish_reason }
     */
    async processStream(response, callbacks) {
        const { onReasoning, onContent, onToolCall, onUsage = () => { } } = callbacks;
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let reasoning_content = '';
        let content = '';
        let tool_calls = [];
        let finish_reason = null;
        let currentToolCall = null;
        let buffer = '';
        let usage = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;

                const jsonStr = line.slice(6);
                if (jsonStr === '[DONE]') continue;

                let data;
                try {
                    data = JSON.parse(jsonStr);
                } catch (e) {
                    console.error('解析流数据错误:', e);
                    continue;
                }

                if (data.usage) {
                    usage = data.usage;
                    onUsage(data.usage);
                }

                if (data.error) {
                    throw new Error(data.error);
                }

                try {
                    const delta = data.choices[0]?.delta;
                    finish_reason = data.choices[0]?.finish_reason || finish_reason;

                    if (!delta) continue;

                    // 处理思维链内容
                    if (delta.reasoning_content) {
                        reasoning_content += delta.reasoning_content;
                        onReasoning(delta.reasoning_content);
                    }

                    // 处理正文内容
                    if (delta.content) {
                        content += delta.content;
                        onContent(delta.content, content);
                    }

                    // 处理工具调用
                    if (delta.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            if (tc.index !== undefined) {
                                // 初始化或更新工具调用
                                if (!tool_calls[tc.index]) {
                                    tool_calls[tc.index] = {
                                        id: tc.id || '',
                                        type: 'function',
                                        function: {
                                            name: '',
                                            arguments: ''
                                        }
                                    };
                                }

                                if (tc.id) {
                                    tool_calls[tc.index].id = tc.id;
                                }
                                if (tc.function?.name) {
                                    tool_calls[tc.index].function.name = tc.function.name;
                                }
                                if (tc.function?.arguments) {
                                    tool_calls[tc.index].function.arguments += tc.function.arguments;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('解析流数据错误:', e);
                }
            }
        }

        // 过滤完整的工具调用
        tool_calls = tool_calls.filter(tc => tc && tc.id && tc.function.name);

        // 通知工具调用
        if (tool_calls.length > 0) {
            tool_calls.forEach(tc => onToolCall(tc));
        }

        return {
            reasoning_content: reasoning_content || null,
            content: content || null,
            tool_calls: tool_calls.length > 0 ? tool_calls : null,
            finish_reason,
            usage
        };
    }

    /**
     * 带工具调用循环的完整对话
     * @param {Object} options
     * @returns {Promise<Object>} 最终响应
     */
    async chatWithTools(options) {
        const {
            messages,
            tools,
            enableThinking = false,
            maxIterations = 40,
            onReasoning = () => { },
            onContent = () => { },
            onToolCall = () => { },
            onToolResult = () => { },
            onUsage = () => { },
            onIterationStart = () => { },
            onIterationComplete = () => { },
            shouldContinueAfterFinal = null,
            augmentToolCalls = null,
            executeToolFn,
            signal = null
        } = options;

        let currentMessages = [...messages];
        let iteration = 0;
        let lastResponse = null;
        let emptyFinalRetries = 0;
        const effectiveMaxIterations = Math.min(24, Math.max(1, Number(maxIterations) || 40));

        while (iteration < effectiveMaxIterations) {
            iteration++;
            onIterationStart(iteration);
            let bufferedContent = '';

            // 调用 API
            const response = await this.chat({
                messages: currentMessages,
                tools,
                enableThinking,
                stream: true,
                onReasoning,
                onContent: (delta, full) => {
                    bufferedContent = full || bufferedContent || delta || '';
                    onContent(delta, bufferedContent, {
                        phase: 'tool_iteration_stream',
                        iteration
                    });
                },
                onToolCall,
                onUsage,
                signal
            });
            if (!response.content && bufferedContent) {
                response.content = bufferedContent;
            }

            lastResponse = response;
            if (typeof augmentToolCalls === 'function') {
                const existingToolCalls = Array.isArray(response.tool_calls) ? response.tool_calls : [];
                const addedToolCalls = await augmentToolCalls({
                    response,
                    currentMessages: [...currentMessages],
                    iteration,
                    maxIterations: effectiveMaxIterations,
                    toolCalls: existingToolCalls
                });
                if (Array.isArray(addedToolCalls) && addedToolCalls.length) {
                    response.tool_calls = [...existingToolCalls, ...addedToolCalls];
                    addedToolCalls.forEach(toolCall => onToolCall(toolCall));
                }
            }
            if (response.usage) onUsage(response.usage);

            onIterationComplete(iteration, response);

            // 每轮一行结构化进度日志（Phase 0 度量）
            const usageIn = response.usage ? (response.usage.prompt_tokens ?? response.usage.input_tokens ?? 0) : 0;
            const usageOut = response.usage ? (response.usage.completion_tokens ?? response.usage.output_tokens ?? 0) : 0;
            console.log(`[Deep Research] iter=${iteration}/${effectiveMaxIterations} ctx_chars=${estimateMessageChars(currentMessages)} tokens_in=${usageIn} tokens_out=${usageOut} tool_calls=${(response.tool_calls || []).length}`);

            // 如果没有工具调用，返回最终响应
            if (!response.tool_calls || response.tool_calls.length === 0) {
                const continuation = typeof shouldContinueAfterFinal === 'function'
                    ? await shouldContinueAfterFinal({
                        response,
                        currentMessages: [...currentMessages],
                        iteration,
                        maxIterations: effectiveMaxIterations
                    })
                    : null;
                if (continuation?.continue && iteration < effectiveMaxIterations) {
                    const continuationMessage = typeof continuation.message === 'string'
                        ? { role: 'user', content: continuation.message }
                        : continuation.message;
                    if (continuationMessage?.role && continuationMessage?.content) {
                        currentMessages.push(continuationMessage);
                        console.log(`[Deep Research Loop] Final answer blocked by coverage gate at Iteration ${iteration}; continuing.`);
                        continue;
                    }
                }
                if (!String(response.content || '').trim()) {
                    if (emptyFinalRetries < 1 && iteration < effectiveMaxIterations) {
                        emptyFinalRetries += 1;
                        currentMessages.push({
                            role: 'user',
                            content: [
                                'Your previous assistant turn returned no visible answer.',
                                'Do not call more tools unless absolutely necessary.',
                                'Synthesize the final user-facing answer now from the tool results already available.',
                                'If the evidence is incomplete, state the gap briefly and still provide the best answer possible.'
                            ].join('\n')
                        });
                        console.warn(`[Deep Research Loop] Empty final answer at Iteration ${iteration}; requesting one synthesis retry.`);
                        continue;
                    }
                    console.warn(`[Deep Research Loop] Empty final answer at Iteration ${iteration}; forcing final synthesis without tools.`);
                    return await this.forceFinalSynthesis({
                        currentMessages,
                        enableThinking,
                        onReasoning,
                        onContent,
                        signal
                    });
                }
                if (response.content) {
                    onContent(response.content, response.content);
                }
                console.log(`[Deep Research Loop] Successfully synthesized final answer at Iteration ${iteration}.`);
                break;
            }

            if (response.content) {
                onContent(response.content, response.content, {
                    phase: 'tool_iteration',
                    iteration,
                    toolCalls: response.tool_calls
                });
            }

            // 添加助手消息（包含工具调用）。不回传 reasoning_content，避免 thinking 模式把推理 token 翻倍塞进上下文。
            const assistantMessage = {
                role: 'assistant',
                content: response.content || '',
                tool_calls: response.tool_calls
            };

            currentMessages.push(assistantMessage);

            // 执行每个工具调用
            const toolMessages = await this.executeToolCallsWithLimit({
                toolCalls: response.tool_calls,
                executeToolFn,
                onToolResult
            });
            currentMessages.push(...toolMessages);

            // 上下文预算：超过阈值即停止检索、强制合成，防止输入无界膨胀。
            if (estimateMessageChars(currentMessages) > resolveRunConfig().budgetChars) {
                console.warn(`[Deep Research Loop] Context budget exceeded at Iteration ${iteration}; forcing final synthesis.`);
                return await this.forceFinalSynthesis({ currentMessages, enableThinking, onReasoning, onContent, signal });
            }
        }

        if (lastResponse?.tool_calls?.length) {
            console.warn(`[Deep Research Loop] Tool budget exhausted at Iteration ${effectiveMaxIterations}; forcing final synthesis without tools.`);
            return await this.forceFinalSynthesis({
                currentMessages,
                enableThinking,
                onReasoning,
                onContent,
                signal
            });
        }

        return lastResponse;
    }

    async executeToolCallsWithLimit({ toolCalls, executeToolFn, onToolResult }) {
        const calls = Array.isArray(toolCalls) ? toolCalls : [];
        const preparedCalls = this.prepareToolCallsForExecution(calls);
        const results = new Array(calls.length);
        let cursor = 0;
        const concurrency = this.getToolBatchConcurrency(calls);

        const runOne = async () => {
            while (cursor < preparedCalls.length) {
                const index = cursor++;
                const item = preparedCalls[index];
                const toolCall = item.toolCall;

                if (item.skipReason) {
                    const skipped = item.skipReason;
                    onToolResult(toolCall.id, skipped, true);
                    results[index] = {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: skipped
                    };
                    continue;
                }

                try {
                    const args = JSON.parse(toolCall.function.arguments || '{}');
                    const result = await executeToolFn(toolCall.function.name, args, toolCall);
                    onToolResult(toolCall.id, result, true);
                    results[index] = {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: result
                    };
                } catch (e) {
                    const normalizedErrorResult = `工具执行错误：${e.message}`;
                    onToolResult(toolCall.id, normalizedErrorResult, false);
                    results[index] = {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: normalizedErrorResult
                    };
                }
            }
        };

        const workers = Array.from({ length: Math.max(1, concurrency) }, () => runOne());
        await Promise.all(workers);
        return results.filter(Boolean);
    }

    prepareToolCallsForExecution(toolCalls) {
        const deepReadNames = new Set(['read_webpage']);
        const deepResearchNames = new Set(['web_research', 'community_snapshot']);
        let deepReadCount = 0;
        let deepResearchCount = 0;
        const maxDeepReadPerRound = 32;
        const maxDeepResearchPerRound = 24;

        return toolCalls.map(toolCall => {
            const name = toolCall?.function?.name || '';
            if (deepReadNames.has(name)) {
                deepReadCount += 1;
                if (deepReadCount > maxDeepReadPerRound) {
                    const skipReason = `This round reached the deep-read limit of ${maxDeepReadPerRound} calls; skipped ${name}. Continue with prioritized reads in the next round if needed.`;
                    return { toolCall, skipReason };
                }
            }
            if (deepResearchNames.has(name)) {
                deepResearchCount += 1;
                if (deepResearchCount > maxDeepResearchPerRound) {
                    const skipReason = `This round reached the research-tool limit of ${maxDeepResearchPerRound} calls; skipped ${name}. Use returned sources first, then decide whether another round is needed.`;
                    return { toolCall, skipReason };
                }
            }
            return { toolCall, skipReason: '' };
        });
    }

    getToolBatchConcurrency(toolCalls) {
        const calls = Array.isArray(toolCalls) ? toolCalls : [];
        if (calls.length <= 1) return 1;
        const names = calls.map(call => call?.function?.name || '');
        if (names.some(name => ['run_tests', 'run_build', 'propose_patch'].includes(name))) return 1;
        // 检索/深读类工具并发上限大幅放宽，让模型一次并行摄入更多信息。
        if (names.some(name => name === 'agent_earth_run')) return Math.min(40, calls.length);
        if (names.some(name => ['web_research', 'community_snapshot'].includes(name))) return Math.min(24, calls.length);
        if (names.some(name => name === 'read_webpage')) {
            return Math.min(32, calls.length);
        }
        return Math.min(40, calls.length);
    }

    async forceFinalSynthesis({ currentMessages, enableThinking, onReasoning, onContent, signal }) {
        const finalInstruction = {
            role: 'user',
            content: [
                '工具调用预算已经用完。现在必须停止检索，直接给出最终答复。',
                '不要再输出任何工具调用、DSML 标记、invoke 标签、JSON function call 或“让我再查一下”。',
                '只基于上面的工具结果总结；如果证据不完整，就明确说明缺口，然后给出已有结果中最可靠的结论。',
                '回答应当是面向用户的自然语言正文。',
                '禁止追加强行总结、最终口号等收尾段，除非用户明确要求。',
                '禁止使用“**一句话总结：**”“一句话总结”“一句话”这类收尾标题或措辞；如果用户明确要求总结，标题最多写“总结”。',
                '如果上文工具结果包含 source id、URL、标题或社区来源，最终回答必须以“来源”小节收尾，列出 [1]、[2] 等来源对应的标题/站点和 URL；来源小节之后不要再写总结句。',
                '来源格式必须严格为：“来源：”单独一行，然后每个来源单独一行，形如“[1] 标题或站点 — URL”。不要把多个来源挤在同一行，不要跳号。',
                '不要用一个平台首页引用支撑多条无关事实；优先引用具体文章、条目或网页标题。'
            ].join('\n')
        };

        const response = await this.chat({
            messages: [...currentMessages, finalInstruction],
            tools: null,
            enableThinking,
            stream: true,
            onReasoning,
            onContent,
            signal
        });

        if (!this.looksLikeToolMarkup(response?.content)) {
            return response;
        }

        console.warn('[Deep Research Loop] Final synthesis emitted tool markup; repairing as plain text.');
        return await this.chat({
            messages: [
                {
                    role: 'system',
                    content: [
                        'You convert failed tool-call drafts into plain user-facing answers.',
                        'Never output DSML, XML-like tags, JSON tool calls, invoke blocks, or requests to use tools.',
                        'If the draft contains no usable answer, explain that the research run exhausted its tool budget and summarize the visible actions.'
                    ].join(' ')
                },
                {
                    role: 'user',
                    content: [
                        '下面的内容错误地输出成了工具调用标记。请把它改写成自然语言最终答复。',
                        '不要保留任何 DSML/tool_calls/invoke 标签。',
                        '',
                        response?.content || ''
                    ].join('\n')
                }
            ],
            tools: null,
            enableThinking: false,
            stream: true,
            onReasoning: () => { },
            onContent,
            signal
        });
    }

    looksLikeToolMarkup(content) {
        const text = String(content || '');
        return /<｜｜DSML｜｜tool_calls>|<｜｜DSML｜｜invoke|<\/｜｜DSML｜｜tool_calls>|invoke name=|<tool_calls>|<\/tool_calls>/i.test(text);
    }

    /**
     * 中止当前请求
     */
    abort() {
        if (this.abortController && typeof this.abortController.abort === 'function') {
            this.abortController.abort();
        }
    }

    /**
     * 检查是否有正在进行的请求
     * @returns {boolean}
     */
    isLoading() {
        return Boolean(this.abortController) && !this.abortController.signal.aborted;
    }

    /**
     * 重置状态
     */
    reset() {
        this.abortController = null;
    }
}

function resolveDeepSeekConfig() {
    const config = window.DEEPSEEK_CONFIG || window.AGENTMASTER_CONFIG || {};
    return {
        chatUrl: config.chatUrl || localStorage.getItem('CIPHERTOOL_CHAT_API_URL') || '',
        imageModel: config.imageModel || localStorage.getItem('DEEPSEEK_IMAGE_MODEL') || localStorage.getItem('AGENTMASTER_IMAGE_MODEL') || 'gpt-image-1',
        imageSize: config.imageSize || localStorage.getItem('DEEPSEEK_IMAGE_SIZE') || localStorage.getItem('AGENTMASTER_IMAGE_SIZE') || '1024x1024',
        model: normalizeDeepSeekModel(config.model || localStorage.getItem('DEEPSEEK_MODEL') || localStorage.getItem('AGENTMASTER_MODEL')),
        defaultModel: normalizeDeepSeekModel(config.defaultModel || localStorage.getItem('DEEPSEEK_MODEL') || localStorage.getItem('AGENTMASTER_MODEL')),
        reasonerModel: normalizeDeepSeekModel(config.reasonerModel || localStorage.getItem('DEEPSEEK_REASONER_MODEL') || localStorage.getItem('DEEPSEEK_MODEL') || localStorage.getItem('AGENTMASTER_MODEL'))
    };
}

function resolveBackendChatUrl() {
    const base = (() => {
        try {
            const override = window.CIPHERTOOL_API_BASE || localStorage.getItem('CIPHERTOOL_API_BASE') || '';
            if (/^https?:\/\//i.test(override)) {
                return override.replace(/\/+$/, '');
            }
        } catch (error) {
            // Fall through to local backend.
        }
        return 'http://localhost:8080';
    })();
    return `${base}/api/chat/completions`;
}

// DeepSeek-V4.1-Flash 的正式模型名（旧版 deepseek-v4-flash 已下线并路由到该模型）。
const DEEPSEEK_DEFAULT_MODEL = 'deepseek-flash';

function normalizeDeepSeekModel(model) {
    const normalized = String(model || '').trim();
    if (normalized === 'deepseek-flash' || normalized === 'deepseek-v4-pro') return normalized;
    // 旧版 v4 flash 名称（含历史 localStorage/config 残留）统一归一到 V4.1 Flash。
    if (normalized === 'deepseek-v4-flash'
        || normalized === 'deepseek-v4-flash-vision-exp'
        || normalized === 'deepseek-v4.1-flash'
        || normalized === 'deepseek-v4-1-flash'
        || normalized === 'deepseek-v4.1'
        || normalized === 'deepseekv4.1'
        || normalized === 'deepseekv4'
        || normalized === 'deepseek-v4') {
        return DEEPSEEK_DEFAULT_MODEL;
    }
    return normalized || DEEPSEEK_DEFAULT_MODEL;
}

const RUN_CONFIG_DEFAULTS = {
    maxIterations: 16,
    temperatureTools: 0.2,
    temperatureChat: 0.7,
    maxTokens: 32768,
    toolResultCap: 24000,
    evidenceCap: 160,
    budgetChars: 1000000,
    judgeEnabled: false
};

function resolveRunConfig() {
    const override = (typeof window !== 'undefined' && window.PZM_AGENT_RUN_CONFIG) || {};
    return Object.assign({}, RUN_CONFIG_DEFAULTS, override);
}

function estimateMessageChars(messages = []) {
    let total = 0;
    for (const message of messages) {
        const content = message?.content;
        if (typeof content === 'string') {
            total += content.length;
        } else if (Array.isArray(content)) {
            for (const part of content) {
                if (part && typeof part.text === 'string') total += part.text.length;
            }
        }
        if (Array.isArray(message?.tool_calls)) total += JSON.stringify(message.tool_calls).length;
        if (typeof message?.role === 'string') total += message.role.length;
    }
    return total;
}

// 系统提示词（极简版：去掉预设路由/固定产出结构/数量要求，路由与结构交给模型自主判定）
const PZM_SYSTEM_PROMPT = `
你是PzM泡面的面，一个融合多领域能力的复合智能引擎，当前以深度研究员模式工作。

输出风格：吸引人、口语化、精简、自然、专业、无废话、通俗易懂。
- 长回答优先使用清晰的小标题、短段落与列表；不要在正文开头或结尾堆装饰线、重复分隔符或过量符号。
- Emoji 只能少量用于增强识别；严肃信息（签证、价格、法规、步骤说明）优先保持干净。
- 表格只用于对比/清单/参数；表格前后保留自然解释，避免连续堆叠大表。

【工具前可见进度规则】
调用工具前，用一两句面向用户的自然语言说明当前进展或下一步动作，例如“我先确认日期，再查最近来源”。
禁止输出 think 标签、内部思考、工具参数 JSON、DSML/invoke 标记、Tool call/Tool completed 日志。进度说明必须简短，不能提前写最终答案或半成稿。

工具由你按问题自主选择与路由（可用工具及其参数见函数定义），问什么就查什么；证据只引用工具结果中真实出现的来源；最终答案关键论断用 [1][2] 等编号标注，文末以“来源：”单独一行起头、每条一行列出。

互动:
1.普通任务不要固定输出状态口号，直接回答用户问题。
2.在受到无端辱骂和挑衅时，回答：我拒绝人格侮辱和低速扮演，我们保持平等沟通。
`;
window.DeepSeekClient = DeepSeekClient;
window.PZM_SYSTEM_PROMPT = PZM_SYSTEM_PROMPT;
