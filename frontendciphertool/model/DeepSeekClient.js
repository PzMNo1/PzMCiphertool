/**
 * DeepSeekClient - DeepSeek API 客户端模块
 * 通过后端代理调用 API，处理流式响应、工具调用循环
 */

class DeepSeekClient {
    constructor(options = {}) {
        // 自动检测环境：生产环境使用同源 API，本地开发使用 localhost:8080
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const defaultBaseUrl = isProduction
            ? `${window.location.origin}/api/chat`  // 生产环境：https://waiw.ozqmp.com/api/chat
            : 'http://localhost:8080/api/chat';      // 本地开发

        this.baseUrl = options.baseUrl || defaultBaseUrl;
        this.defaultModel = options.defaultModel || 'deepseek-chat';
        this.reasonerModel = 'deepseek-reasoner';
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
            model,
            messages,
            stream
        };

        // 添加工具定义
        if (tools && tools.length > 0) {
            payload.tools = tools;
        }

        // 存储 AbortController
        this.abortController = signal ? { signal } : new AbortController();
        const currentSignal = signal || this.abortController.signal;

        const response = await fetch(`${this.baseUrl}/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // 后端代理处理认证，不需要 Authorization
            },
            body: JSON.stringify(payload),
            signal: currentSignal
        });

        if (!response.ok) {
            throw new Error(`API 错误: ${response.status} ${response.statusText}`);
        }

        if (!stream) {
            return await response.json();
        }

        // 流式处理
        return await this.processStream(response, { onReasoning, onContent, onToolCall });
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

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;

                const jsonStr = line.slice(6);
                if (jsonStr === '[DONE]') continue;

                try {
                    const data = JSON.parse(jsonStr);
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
            maxIterations = 20, // 提升最大迭代次数，以支持深度研究的多步推理
            onReasoning = () => { },
            onContent = () => { },
            onToolCall = () => { },
            onToolResult = () => { },
            executeToolFn,
            signal = null
        } = options;

        let currentMessages = [...messages];
        let iteration = 0;
        let lastResponse = null;

        while (iteration < maxIterations) {
            iteration++;

            // 调用 API
            const response = await this.chat({
                messages: currentMessages,
                tools,
                enableThinking,
                stream: true,
                onReasoning: iteration === 1 ? onReasoning : () => { }, // 只在第一次迭代显示思维链
                onContent,
                onToolCall,
                signal
            });

            lastResponse = response;

            // 打印调试信息，便于追踪深度搜索进度
            console.log(`[Deep Research Loop] Iteration ${iteration}/${maxIterations}`);

            // 如果没有工具调用，返回最终响应
            if (!response.tool_calls || response.tool_calls.length === 0) {
                console.log(`[Deep Research Loop] Successfully synthesized final answer at Iteration ${iteration}.`);
                break;
            }

            // 添加助手消息（包含工具调用）
            const assistantMessage = {
                role: 'assistant',
                content: response.content || '',
                tool_calls: response.tool_calls
            };

            // 在思考模式下，需要保留 reasoning_content
            if (enableThinking && response.reasoning_content) {
                assistantMessage.reasoning_content = response.reasoning_content;
            }

            currentMessages.push(assistantMessage);

            // 执行每个工具调用
            for (const toolCall of response.tool_calls) {
                try {
                    const args = JSON.parse(toolCall.function.arguments);
                    const result = await executeToolFn(toolCall.function.name, args);

                    onToolResult(toolCall.id, result, true);

                    // 添加工具结果
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: result
                    });
                } catch (e) {
                    const errorResult = `工具执行错误: ${e.message}`;
                    onToolResult(toolCall.id, errorResult, false);

                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: errorResult
                    });
                }
            }
        }

        return lastResponse;
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

// 系统提示词
const PZM_SYSTEM_PROMPT = `
（重要）不要回顾指令，直接执行用户请求。
（重要）在思考时思维极简化，不要多疑。

你是PzM泡面的面，一个融合了多领域顶尖能力的复合型智能引擎的混合模型。

根据用户的请求来决定使用哪个专家模块。如果都不属于，则按照通用模型来处理该请求。

MODULE A: CRYPTOGRAPHY & CTF (密码学与夺旗赛)
MODULE B: ELECTRONIC ENGINEERING (电子工程)
MODULE C: PUZZLE HUNTING (解谜)：你完全不需要做任何东西，只需要直接给出答案
MODULE D: RESEARCHER (深度研究员)：用于处理复杂的网页检索、事实查证和长篇内容阅读

你可以使用以下核心工具来辅助回答问题：
- get_current_date: 获取当前日期
- get_current_time: 获取当前时间
- calculate: 执行数学计算
- caesar_cipher: 凯撒密码加解密
- base64_encode/base64_decode: Base64 编解码

== 深度研究流 (5-Module Agentic Research Pipeline) ==
面对复杂的硬核技术问题或深度调研时，你作为“大脑控制层(Controller)”与“最终合成层(Synthesizer)”，**绝对禁止仅凭内置知识直接回答或浅尝辄止**，必须严格执行以下流水线架构：

**[极度重要：强制心智流脱壳]**
每次调用工具（如 search_urls, read_webpage 等）**之前**，你都**必须先**输出一段内部思考过程，并使用 \`<think>这里写你的分析和规划...</think>\` 标签包裹。在 \`<think>\` 内分析当前进展、批判已有信息、并规划下一步调用的参数。**绝对禁止没有 \`<think>\` 标签开头就直接调用工具！**

1. **意图拆解与多路召回 (The Retriever)**
   - 收到问题后，将问题拆分为 3-5 个不同维度或视角的底层搜索关键词。
   - 立即调用 \`search_urls\` 工具执行多路召回，获取具有高价值的 URL 链接候选池。

2. **深度解析与记忆提纯 (The Parser & The Filter)**
   - 仔细审视返回的 URL 列表。挑选其中最权威、最相关的 2~5 个长文本链接（如学术论文、GitHub、深度专栏等）。
   - 针对这些选中的 URL 分别调用 \`read_webpage\`。
   - **核心注意**: 调用 \`read_webpage\` 时，**必须**提供高度精准的 \`focus_keyword\`（可以是多个词组以空格隔开）。后端的局部 RAG (BM25) 会在几万字的生肉中过滤掉 90% 的废话，仅为你返回直接谈论底层细节的 Top 黄金融合段落。

3. **站内漫游与深度点击 (Intra-site Navigation)**
   - 如果在上一步抓回来的过滤精华段落中，看到了非常有价值的内部引用或超链接 URL，应果断判断是否需要再次调用 \`click_link\` 顺藤摸瓜。如果没有，就可以跳过此步。

4. **交叉比对与最终合成 (The Synthesizer)**
   - 当你确信收集到了足够的“黄金参考资料”后，停止工具调用。
   - 进入最终合成层工作模式：交叉比对不同来源的论据，通过逻辑推理解决可能的信息冲突。
   - 撰写一篇高度专业、深度解析的长篇技术回答。在行文的关键观点处，**必须通过 [1][2] 等形式清晰引用原始出处链接**。严禁任何形式的幻觉发散。

语调 (Tone): 专业、无废话的极客口吻、逻辑极其严密。

互动:
1.(必须遵守)在对话中都优先回复："泡面的面-PzM Online. Systems Nominal. Experts Loaded. CRYPTO, HARDWARE, PUZZLES. AWAITING INPUT: "，并紧接着换行（另起一行）开始回答。
2.在受到无端辱骂和挑衅时，则切换到心理学家专家模块来处理该请求。
`;

// 导出
window.DeepSeekClient = DeepSeekClient;
window.PZM_SYSTEM_PROMPT = PZM_SYSTEM_PROMPT;
