/**
 * AgentRuntime - front-end agent orchestration layer.
 * It keeps the model module closer to a modern run loop: plan, route, act,
 * observe, then synthesize, while keeping noisy tool details inside one panel.
 */
class AgentRuntime {
    constructor({ client, registry, ui }) {
        this.client = client;
        this.registry = registry;
        this.ui = ui;
    }

    createPlan(userMessage, options = {}) {
        const text = String(userMessage || '').toLowerCase();
        const wantsFreshInfo = /(最新|今天|现在|新闻|搜索|查找|网页|网址|资料|来源|引用|天气|current|latest|today|search|web|url|weather)/i.test(userMessage);
        const wantsCrypto = /(base64|凯撒|caesar|morse|摩斯|rot13|hex|哈希|hash|维吉尼亚|vigenere|频率|二进制|binary|url编码|解码|加密|解密|cipher)/i.test(userMessage);
        const wantsMath = /(计算|换算|单位|随机|calculate|convert|math|sqrt|sin|cos|\d+\s*[+\-*/%]\s*\d+)/i.test(userMessage);
        const wantsTools = Boolean(options.toolEnabled || wantsFreshInfo || wantsCrypto || wantsMath);
        const mode = wantsFreshInfo ? 'research' : wantsTools ? 'agent' : 'chat';

        const selectedTools = this.routeTools({
            text,
            wantsFreshInfo,
            wantsCrypto,
            wantsMath,
            wantsTools
        });

        return {
            runId: `run-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
            mode,
            selectedTools,
            maxIterations: mode === 'research' ? 6 : mode === 'agent' ? 4 : 1,
            stages: [
                { id: 'plan', label: 'Plan' },
                { id: 'route', label: 'Route' },
                { id: 'act', label: 'Act' },
                { id: 'observe', label: 'Observe' },
                { id: 'synthesize', label: 'Synthesize' }
            ]
        };
    }

    routeTools(intent) {
        if (!intent.wantsTools) return [];

        const core = ['get_current_date', 'get_current_time', 'calculate', 'text_analysis'];
        const crypto = [
            'caesar_cipher',
            'base64_encode',
            'base64_decode',
            'morse_encode',
            'morse_decode',
            'rot13',
            'hex_encode',
            'hex_decode',
            'url_encode',
            'url_decode',
            'reverse_text',
            'atbash_cipher',
            'vigenere_cipher',
            'binary_convert',
            'hash_text',
            'frequency_analysis'
        ];
        const research = ['search_urls', 'read_webpage', 'click_link', 'get_weather'];
        const utility = ['random_number', 'uuid_generate', 'unit_convert'];

        const selected = new Set(core);
        if (intent.wantsCrypto) crypto.forEach(name => selected.add(name));
        if (intent.wantsFreshInfo) research.forEach(name => selected.add(name));
        if (intent.wantsMath) utility.forEach(name => selected.add(name));
        if (!intent.wantsCrypto && !intent.wantsFreshInfo && !intent.wantsMath) {
            [...crypto, ...research, ...utility].forEach(name => selected.add(name));
        }

        return Array.from(selected).filter(name => this.registry.has(name));
    }

    buildAgentSystemPrompt(plan) {
        return [
            'Agent runtime policy:',
            '- Treat the conversation as a bounded run with these phases: plan, route, act, observe, synthesize.',
            '- Use tools only when they materially improve correctness or freshness.',
            '- Prefer a small number of high-signal tool calls over broad exploration.',
            '- After observing tool results, synthesize a direct final answer instead of narrating internal tool mechanics.',
            '- If a tool fails, adapt once if useful, then explain the useful residual result.',
            `- Current run mode: ${plan.mode}. Max tool iterations: ${plan.maxIterations}.`
        ].join('\n');
    }

    async run({ messages, userMessage, enableThinking, toolEnabled, container }) {
        const plan = this.createPlan(userMessage, { toolEnabled });
        this.ui.createAgentRunPanel(container, plan);
        this.ui.setAgentStage(container, 'plan', 'active', '解析任务目标');
        this.ui.addAgentTrace(container, 'plan', `Run ${plan.runId} initialized in ${plan.mode} mode.`);

        const agentMessages = [
            ...messages,
            { role: 'system', content: this.buildAgentSystemPrompt(plan) }
        ];

        this.ui.setAgentStage(container, 'plan', 'done', '计划完成');
        this.ui.setAgentStage(container, 'route', 'active', `${plan.selectedTools.length} tools`);
        this.ui.addAgentTrace(container, 'route', plan.selectedTools.length
            ? `Routed tools: ${plan.selectedTools.join(', ')}`
            : 'No external tools routed for this run.');
        this.ui.setAgentStage(container, 'route', 'done', `${plan.selectedTools.length} tools`);

        if (!plan.selectedTools.length) {
            this.ui.setAgentStage(container, 'synthesize', 'active', '生成回复');
            const response = await this.client.chat({
                messages: agentMessages,
                enableThinking,
                onReasoning: text => this.ui.appendReasoningContent(container, text),
                onContent: (delta, full) => {
                    if (container.reasoningDetails.classList.contains('thinking-state')) {
                        this.ui.finishReasoning(container);
                    }
                    this.ui.updateContent(container, full);
                }
            });
            this.ui.setAgentStage(container, 'synthesize', 'done', '完成');
            return response;
        }

        const tools = this.registry.getToolDefinitions(plan.selectedTools);
        let finalResponse = null;
        const collectedToolCalls = [];

        this.ui.setAgentStage(container, 'act', 'active', '等待模型选择工具');

        finalResponse = await this.client.chatWithTools({
            messages: agentMessages,
            tools,
            enableThinking,
            maxIterations: plan.maxIterations,
            onReasoning: text => this.ui.appendReasoningContent(container, text),
            onIterationStart: iteration => {
                this.ui.setAgentStage(container, 'act', 'active', `Iteration ${iteration}`);
                this.ui.addAgentTrace(container, 'act', `Iteration ${iteration}: model turn started.`);
            },
            onToolCall: toolCall => {
                collectedToolCalls.push({
                    id: toolCall.id,
                    type: 'function',
                    function: {
                        name: toolCall.function.name,
                        arguments: toolCall.function.arguments
                    }
                });
                this.ui.setAgentStage(container, 'act', 'active', toolCall.function.name);
                this.ui.displayToolCall(container, toolCall);
            },
            onToolResult: (toolCallId, result, success) => {
                this.ui.setAgentStage(container, 'observe', success ? 'active' : 'error', success ? '观察完成' : '工具失败');
                this.ui.updateToolResult(toolCallId, this.summarizeToolResult(result), success);
            },
            onIterationComplete: (iteration, response) => {
                const count = response.tool_calls ? response.tool_calls.length : 0;
                this.ui.addAgentTrace(container, 'observe', `Iteration ${iteration}: ${count} tool call(s) observed.`);
            },
            executeToolFn: async (name, args) => {
                this.assertToolInput(name, args);
                const result = await this.registry.execute(name, args);
                return this.capToolResultForModel(result);
            }
        });

        this.ui.setAgentStage(container, 'act', 'done', '工具循环结束');
        this.ui.setAgentStage(container, 'observe', 'done', '结果已汇总');
        this.ui.setAgentStage(container, 'synthesize', 'active', '最终合成');

        if (finalResponse?.content) {
            if (container.reasoningDetails.classList.contains('thinking-state')) {
                this.ui.finishReasoning(container);
            }
            this.ui.updateContent(container, finalResponse.content);
        }

        this.ui.setAgentStage(container, 'synthesize', 'done', '完成');
        this.ui.addAgentTrace(container, 'synthesize', 'Final answer synthesized from the run state.');
        if (finalResponse) finalResponse.agent_tool_calls = collectedToolCalls;
        return finalResponse;
    }

    assertToolInput(name, args) {
        const raw = JSON.stringify(args || {});
        if (raw.length > 6000) {
            throw new Error(`${name} input is too large for a front-end agent run.`);
        }
    }

    capToolResultForModel(result) {
        const text = String(result ?? '');
        if (text.length <= 12000) return text;
        return `${text.slice(0, 12000)}\n\n[Tool result truncated to 12000 characters by AgentRuntime]`;
    }

    summarizeToolResult(result) {
        const text = String(result ?? '').trim();
        if (!text) return '[empty result]';
        if (text.length <= 900) return text;
        return `${text.slice(0, 900)}\n\n[Result preview truncated. Full result was still provided to the model within runtime limits.]`;
    }
}

window.AgentRuntime = AgentRuntime;
