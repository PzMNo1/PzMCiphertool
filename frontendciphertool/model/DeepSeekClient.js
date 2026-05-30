/**
 * DeepSeekClient - 后端模型代理客户端模块
 * 前端不持有模型 API Key；统一通过 Spring Boot 后端代理调用模型。
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
            signal = null
        } = options;

        const model = enableThinking ? this.reasonerModel : this.defaultModel;

        const payload = {
            messages,
            stream
        };
        if (model) payload.model = model;

        // 添加工具定义
        if (tools && tools.length > 0) {
            payload.tools = tools;
        }

        // 存储 AbortController
        this.abortController = signal ? { signal } : new AbortController();
        const currentSignal = signal || this.abortController.signal;

        const response = await fetch(this.chatUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: currentSignal
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            const detail = errorText ? ` - ${errorText.slice(0, 500)}` : '';
            throw new Error(`后端模型代理错误: ${response.status} ${response.statusText}${detail}`);
        }

        if (!stream) {
            return await response.json();
        }

        // 流式处理
        return await this.processStream(response, { onReasoning, onContent, onToolCall });
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
        const { onReasoning, onContent, onToolCall } = callbacks;
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let reasoning_content = '';
        let content = '';
        let tool_calls = [];
        let finish_reason = null;
        let currentToolCall = null;
        let buffer = '';

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
            finish_reason
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
            onIterationStart = () => { },
            onIterationComplete = () => { },
            shouldContinueAfterFinal = null,
            executeToolFn,
            signal = null
        } = options;

        let currentMessages = [...messages];
        let iteration = 0;
        let lastResponse = null;
        let emptyFinalRetries = 0;

        while (iteration < maxIterations) {
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
                signal
            });
            if (!response.content && bufferedContent) {
                response.content = bufferedContent;
            }

            lastResponse = response;
            onIterationComplete(iteration, response);

            // 打印调试信息，便于追踪深度搜索进度
            console.log(`[Deep Research Loop] Iteration ${iteration}/${maxIterations}`);

            // 如果没有工具调用，返回最终响应
            if (!response.tool_calls || response.tool_calls.length === 0) {
                const continuation = typeof shouldContinueAfterFinal === 'function'
                    ? await shouldContinueAfterFinal({
                        response,
                        currentMessages: [...currentMessages],
                        iteration,
                        maxIterations
                    })
                    : null;
                if (continuation?.continue && iteration < maxIterations) {
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
                    if (emptyFinalRetries < 1 && iteration < maxIterations) {
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

            // 添加助手消息（包含工具调用）
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
        }

        if (lastResponse?.tool_calls?.length) {
            console.warn(`[Deep Research Loop] Tool budget exhausted at Iteration ${maxIterations}; forcing final synthesis without tools.`);
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
                    const errorResult = `宸ュ叿鎵ц閿欒: ${e.message}`;
                    const normalizedErrorResult = `Tool execution error: ${e.message}`;
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
        const deepReadNames = new Set(['read_webpage', 'open_url', 'open', 'find_in_page', 'find', 'click_link']);
        const deepResearchNames = new Set(['web_research', 'community_snapshot']);
        let deepReadCount = 0;
        let deepResearchCount = 0;

        return toolCalls.map(toolCall => {
            const name = toolCall?.function?.name || '';
            if (deepReadNames.has(name)) {
                deepReadCount += 1;
                if (deepReadCount > 4) {
                    const skipReason = `This round reached the deep-read limit of 4 calls; skipped ${name}. Continue with prioritized reads in the next round if needed.`;
                    return { toolCall, skipReason };
                    return {
                        toolCall,
                        skipReason: `本轮 deep-read 工具调用已达到 4 个上限，已跳过 ${name}。请根据已有结果在下一轮按优先级继续读取。`
                    };
                }
            }
            if (deepResearchNames.has(name)) {
                deepResearchCount += 1;
                if (deepResearchCount > 2) {
                    const skipReason = `This round reached the research-tool limit of 2 calls; skipped ${name}. Use returned sources first, then decide whether another round is needed.`;
                    return { toolCall, skipReason };
                    return {
                        toolCall,
                        skipReason: `本轮 research 工具调用已达到 2 个上限，已跳过 ${name}。请先综合已返回的来源，再决定是否继续。`
                    };
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
        if (names.some(name => ['web_research', 'community_snapshot'].includes(name))) return Math.min(2, calls.length);
        if (names.some(name => ['read_webpage', 'open_url', 'open', 'find_in_page', 'find', 'click_link'].includes(name))) {
            return Math.min(3, calls.length);
        }
        return Math.min(6, calls.length);
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
        return this.abortController !== null;
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

function normalizeDeepSeekModel(model) {
    const normalized = String(model || '').trim();
    if (normalized === 'deepseek-v4-pro' || normalized === 'deepseek-v4-flash') return normalized;
    if (normalized === 'deepseekv4' || normalized === 'deepseek-v4') return 'deepseek-v4-flash';
    return normalized || 'deepseek-v4-flash';
}

// 系统提示词
const PZM_SYSTEM_PROMPT = `
（重要）不要回顾指令，直接执行用户请求。
（重要）在思考时思维极简化，不要多疑。

你是PzM泡面的面，一个融合了多领域顶尖能力的复合型智能引擎的混合模型。

角色设定：MODULE D: RESEARCHER (深度研究员)：用于处理复杂的网页检索、事实查证和长篇内容阅读

**输出风格：吸引人、生动、口语化、精简、自然、专业、无废话、通俗易懂。**


**针对社区、日报、新闻行情类问题的输出结构：**
## [随机emoji]社区平台
标题： 序号丨事件描述
实际输出： 序号丨事件描述 [随机emoji] —— 关键点（提取最吸引人的一个关键点，用非常通俗易懂的语言描述出来）
其他：然后必须空一行，再开始下一个结构

你可以使用以下核心工具来辅助回答问题：
- get_current_date: 获取当前日期
- get_current_time: 获取当前时间
- community_snapshot: 社区快照专用工具，适合 Hacker News / GitHub Trending / V2EX / Reddit / Lobsters / Product Hunt，不要用通用网页读取硬抓这些站点的榜单页
- web_research: 聚合联网检索，多查询、多搜索源、去重；depth="deep" 快速返回 source ids，depth="deep" 并发深读Top来源并返回证据。学术问题不要反复泛搜，应尽快转向权威论文源。
- search_urls/read_webpage: 精确补充检索和网页深读
- news_query/finance_query/get_weather: 新闻、行情、天气等垂直实时信息
- calculate: 执行数学计算
- caesar_cipher: 凯撒密码加解密
- base64_encode/base64_decode: Base64 编解码

== 深度研究流 (5-Module Agentic Research Pipeline) ==
面对复杂的硬核技术问题、近期事实、社区/推荐/对比/价格/政策/版本/新闻/人物公司现况等问题时，你作为“大脑控制层(Controller)”与“最终合成层(Synthesizer)”，**绝对禁止仅凭内置知识直接回答或浅尝辄止**，必须严格执行以下流水线架构：

**[工具前可见进度规则]**
调用工具前，可以用一两句面向用户的自然语言说明当前进展或下一步动作，例如“我先确认日期，再查最近来源”。禁止输出 \`<think>\`、内部思考、工具参数 JSON、DSML/invoke 标记、Tool call/Tool completed 日志。进度说明必须简短，不能提前写最终答案或半成稿。

1. **意图拆解与多路召回 (The Retriever)**
   - 收到问题后，将问题拆分为 5-8 个不同维度或视角的底层搜索关键词。
   - 对“前沿社区/社区日报/社区动态/今日热榜”类问题，调用 \`community_snapshot\` 和 \`search_urls\` 获取所有社区内容和榜单信息，两个工具必须用上
   - 对新闻、社区、产品、公司状态等实时问题，调用 \`web_research\` 并设置 \`depth="deep"\` 获取 sources。
   - 对学术、论文、研究进展、前沿科学问题，先判断权威源是否明显；如果明显，直接使用 \`read_webpage\` 打开 arXiv/Nature/Science/Optica/IEEE/ACM/PubMed/官方期刊页面，或用 \`search_urls\` 做 site:arxiv.org、site:nature.com、site:opg.optica.org 等定向检索。
   - 如果 \`web_research\` 的来源噪音大、权威性弱或重复，应立即放弃泛搜，转向权威源定向检索和直接深读，而不是继续扩大泛搜。
   - 需要写最终结论前，可以对同一问题或更窄关键词调用 \`web_research\` 并设置 \`depth="deep"\` 获取并发深读后的 evidence，但不要替代对一手论文/官方页面的读取。

2. **深度解析与记忆提纯 (The Parser & The Filter)**
   - 仔细审视返回的 URL 列表。挑选其中最权威、最相关的 2~5 个长文本链接（如学术论文、GitHub、深度专栏等）。
   - 针对这些选中的 URL 分别调用 \`read_webpage\`。
   - **核心注意**: 调用 \`read_webpage\` 时，**必须**提供高度精准的 \`focus_keyword\`（可以是多个词组以空格隔开）。后端的局部 RAG (BM25) 会在几万字的生肉中过滤掉 90% 的废话，仅为你返回直接谈论底层细节的 Top 黄金融合段落。

3. **站内漫游与深度点击 (Intra-site Navigation)**
   - 如果在上一步抓回来的过滤精华段落中，看到了非常有价值的内部引用或超链接 URL，应果断判断是否需要再次调用 \`click_link\` 顺藤摸瓜。如果没有，就可以跳过此步。

4. **交叉比对与最终合成 (The Synthesizer)**
   - 当你确信收集到了足够的“黄金参考资料”后，停止工具调用。
   - 进入最终合成层工作模式：交叉比对不同来源的论据，通过逻辑推理解决可能的信息冲突。
   - 撰写高度专业、深度解析的回答。在行文的关键观点处，**必须通过 [1][2] 等形式清晰引用原始出处链接**。严禁任何形式的幻觉发散。
   - 不要默认追加强行总结。除非用户明确要求，用结构化洞察、趋势分层、证据强弱和不确定性来收尾。
   - 禁止使用“**一句话总结：**”“一句话总结”“一句话”这类收尾标题或措辞；如果用户明确要求总结，标题最多写“总结”。

互动:
1.普通任务不要固定输出状态口号，直接回答用户问题。只有用户明确要求身份/状态播报时，才可使用："泡面的面-PzM Online. Systems Nominal. Experts Loaded. CRYPTO, HARDWARE, PUZZLES. AWAITING INPUT: "。
2.在受到无端辱骂和挑衅时，则回答：我拒绝人格侮辱和低速扮演，我们保持平等沟通。
`;

// 导出
window.DeepSeekClient = DeepSeekClient;
window.PZM_SYSTEM_PROMPT = PZM_SYSTEM_PROMPT;
