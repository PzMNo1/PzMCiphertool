/**
 * AgentRuntime - front-end agent orchestration layer.
 *
 * 执行链路：classify → plan →（并行专家面板）→ act/observe（补缺）→ 长文合成 → 交付校验
 *
 * 关键设计：
 * - 交付档位由 AgentResearchContract 按意图信号判定（不用字符数门槛），决定篇幅/表格/图表/引用下限，
 *   以及并行专家面板的规模。
 * - 检索主体由 AgentExpertPanel 并行承担：每个专家跑自己的完整工具循环，墙钟时间从
 *   「所有轮次之和」变成「最慢那个专家的耗时」。
 * - 主模型循环退化为"补缺与交叉验证"，轮次大幅压缩；最终长篇交付物由独立合成 pass 产出，
 *   并做交付校验（不达标则补充一次），因此不会再出现"模型自己决定写多短"。
 */
class AgentRuntime {
    constructor({ client, registry, ui, clientFactory = null }) {
        this.client = client;
        this.registry = registry;
        this.ui = ui;
        this.clientFactory = clientFactory;
        this.agentProfiles = window.AgentProfiles
            ? new window.AgentProfiles(this)
            : null;
        this.intentContractBuilder = window.AgentIntentContractBuilder
            ? new window.AgentIntentContractBuilder(this)
            : null;
        this.policyResolver = window.AgentPolicyResolver
            ? new window.AgentPolicyResolver(this)
            : null;
        
        // 性能监控（每次运行独立统计）
        this.performanceMonitor = window.AgentPerformanceMonitor
            ? new window.AgentPerformanceMonitor()
            : null;
        
        // 上下文窗口管理（跨运行共享，因为同一会话的上下文是累积的）
        this.contextManager = window.agentContextManager
            || (window.AgentContextManager ? new window.AgentContextManager({ maxTokens: 180000 }) : null);
        if (this.contextManager && !window.agentContextManager) {
            window.agentContextManager = this.contextManager;
        }
        
        // 研究交付契约：决定档位与硬性交付指标
        this.researchContract = window.agentResearchContract
            || (window.AgentResearchContract ? new window.AgentResearchContract() : null);
        
        // 并行专家研究面板
        this.expertPanel = window.AgentExpertPanel
            ? new window.AgentExpertPanel(this, {
                maxConcurrency: this.resolvePanelConfig().maxConcurrency,
                maxIterationsPerExpert: this.resolvePanelConfig().maxIterationsPerExpert
            })
            : null;
    }

    resolvePanelConfig() {
        const override = (typeof window !== 'undefined' && window.PZM_AGENT_RUN_CONFIG) || {};
        const style = (typeof window !== 'undefined' && window.PZM_AGENT_STYLE) || {};
        return {
            maxConcurrency: Number(override.expertConcurrency) > 0 ? Number(override.expertConcurrency) : 4,
            maxIterationsPerExpert: Number(override.expertIterations) > 0 ? Number(override.expertIterations) : 3,
            mainLoopIterations: Number(override.mainLoopIterations) > 0 ? Number(override.mainLoopIterations) : 4,
            // 18000 中文字约需 27000+ token；实测上游接受 max_tokens=65536
            synthesisMaxTokens: Number(override.synthesisMaxTokens) > 0 ? Number(override.synthesisMaxTokens) : 56000,
            // 实测单次调用自然收敛在 ~15000 中文字，18000 档需要补充阶段兜底，故默认允许 2 次
            repairPasses: Number.isFinite(Number(override.repairPasses)) ? Number(override.repairPasses) : 2,
            // 语言清洗：只做确定性的标签剥离（实测破坏性 -1.5%，不动来源与图表）。
            // 范式审计与整篇重写已按用户要求移除；如需彻底关闭清洗，设 window.PZM_AGENT_STYLE = { normalize: false }。
            styleNormalize: style.normalize !== false
        };
    }

    /**
     * 为每个并行专家创建独立客户端，避免共享实例上的 abortController 互相覆盖。
     */
    createExpertClient() {
        try {
            if (typeof this.clientFactory === 'function') return this.clientFactory();
            if (window.DeepSeekClient) return new window.DeepSeekClient();
        } catch (error) {
            console.warn('Failed to create dedicated expert client, reusing runtime client.', error);
        }
        return this.client;
    }

    /**
     * 绑定 Agent 模块输入框下方/右下角的性能与上下文 UI。
     * 只在 Agent 模块（#damoxing-container）内查找，避免影响其他模块。
     */
    attachPerformanceUI() {
        try {
            if (this.performanceMonitor) {
                this.performanceMonitor.attach('#agent-performance-monitor');
            }
            if (this.contextManager) {
                this.contextManager.attach('#context-progress-ring');
            }
        } catch (error) {
            console.warn('Failed to attach agent performance UI.', error);
        }
    }

    createPlan(userMessage, options = {}) {
        const intent = this.intentContractBuilder
            ? this.intentContractBuilder.build(userMessage, options)
            : this.buildFallbackIntentContract(userMessage, options);
        const policy = this.policyResolver
            ? this.policyResolver.resolve(intent)
            : {
                selectedTools: [],
                researchProfile: 'agentic',
                agentEarthTargetCalls: 0,
                maxIterations: intent.mode === 'chat' ? 1 : 12,
                sourceTarget: 0,
                citationTarget: 0,
                writingContract: null,
                qualityGates: {},
                policyFlags: {
                    needsTools: intent.mode !== 'chat',
                    lightweight: intent.mode === 'chat',
                    deliverable: 'answer',
                    citationStyle: 'numeric',
                    sourceTarget: 0,
                    citationTarget: 0
                }
            };
        return {
            runId: 'run-' + Date.now().toString(36) + '-' + Math.random().toString(16).slice(2, 7),
            mode: intent.mode,
            researchProfile: policy.researchProfile || 'agentic',
            newsBriefScope: null,
            writingContract: null,
            qualityGates: {},
            policyFlags: policy.policyFlags || {},
            selectedTools: policy.selectedTools,
            agentEarthTargetCalls: 0,
            maxIterations: policy.maxIterations,
            sourceTarget: 0,
            citationTarget: 0,
            stages: [
                { id: 'plan', label: 'Plan' },
                { id: 'route', label: 'Route' },
                { id: 'act', label: 'Act' },
                { id: 'observe', label: 'Observe' },
                { id: 'synthesize', label: 'Synthesize' }
            ],
            collaboration: { enabled: false, strategy: 'single_agent', collaborators: [], handoffs: [], quality_gates: [] }
        };
    }

    buildFallbackIntentContract(userMessage, options = {}) {
        const hasAttachments = Boolean(options.hasAttachments);
        const mode = options.toolEnabled || hasAttachments ? 'agent' : 'chat';
        return {
            rawMessage: String(userMessage || ''),
            text: String(userMessage || '').toLowerCase(),
            mode,
            hasAttachments,
            toolEnabled: Boolean(options.toolEnabled),
            wantsTools: mode === 'agent',
            writingContract: null
        };
    }

    routeTools(intent) {
        return this.agentProfiles
            ? this.agentProfiles.routeTools(intent)
            : [];
    }

    isRoutableTool(name) {
        if (!this.registry?.has?.(name)) return false;
        if (typeof this.registry.isToolAvailable === 'function') {
            return this.registry.isToolAvailable(name);
        }
        return true;
    }

    async refreshDynamicToolAvailability() {
        if (typeof this.registry?.refreshAgentEarthAvailability === 'function') {
            await this.registry.refreshAgentEarthAvailability({ timeoutMs: 900, force: true });
        }
    }

    buildAgentSystemPrompt(plan, contextPack = null) {
        if (this.agentProfiles) {
            return this.agentProfiles.buildSystemPrompt(plan, contextPack);
        }
        return [
            'Agent runtime policy:',
            '- Treat the conversation as a bounded run with these phases: plan, route, act, observe, synthesize.',
            '- Choose and use tools autonomously, observe results, and synthesize a direct final answer.',
            '- Current run mode: ' + (plan?.mode || 'chat') + '.'
        ].join('\n');
    }

    buildContextMemoryPolicy(contextPack) {
        const runs = Array.isArray(contextPack?.agentRunSummaries) ? contextPack.agentRunSummaries : [];
        if (!runs.length) return [];
        return [
            '- Prior AgentRun context memory is available below. Use it for continuity, follow-up questions, and avoiding duplicate reads of unchanged sources.',
            '- Do not treat prior AgentRun memory as fresh evidence when the user asks for latest/today/current facts; refresh sources in that case.',
            'Prior AgentRun context compact JSON:',
            this.previewValue(JSON.stringify(runs, null, 2), 3600)
        ];
    }

    /**
     * 在基础策略提示词之后追加「交付契约」。
     * 研究档位下还要明确告诉工具循环：这一轮只做检索与补缺，长篇交付物由后续独立写作阶段产出。
     */
    buildContractAwareSystemPrompt(plan, contextPack, contract) {
        const base = this.buildAgentSystemPrompt(plan, contextPack);
        if (!contract || contract.tier === 'chat' || !this.researchContract) return base;

        const parts = [base, '', this.researchContract.buildContractPrompt(contract)];

        if (contract.isResearch) {
            parts.push(
                '',
                '【本轮阶段说明 - 重要】',
                '- 检索由并行的维度专家承担，你这一轮只负责：补齐专家遗漏的关键信息、交叉验证互相矛盾的论断、抓取可进表格的硬数据。',
                '- 因此本轮不要撰写最终交付物，也不要把篇幅用在铺陈上；请把发现写成紧凑要点，并按维度标注来源。',
                '- 长篇交付物会在检索结束后由专门的写作阶段一次性产出，届时会用到你与专家沉淀的全部证据。'
            );
        }

        return parts.join('\n');
    }

    async run({ messages, userMessage, enableThinking, toolEnabled, hasAttachments = false, container, contextPack = null, toolContext = null, onRunSnapshot = null, signal = null }) {
        const plan = this.createPlan(userMessage, { toolEnabled, hasAttachments, messages });
        const runState = this.createRunState(plan, contextPack, toolContext, userMessage);
        runState.uiContainer = container;
        runState.onSnapshot = typeof onRunSnapshot === 'function' ? onRunSnapshot : null;

        // 交付档位：按意图信号判定（不再使用字符数门槛，避免 9 个字符的研究请求被判为普通问答）
        const contract = this.researchContract
            ? this.researchContract.classify({
                query: userMessage,
                mode: plan.mode,
                toolEnabled: Boolean(toolEnabled),
                deepThink: Boolean(enableThinking)
            })
            : null;
        plan.contract = contract;
        runState.contract = contract;
        const runtimeConfig = this.resolvePanelConfig();

        // 让运行面板提前准备好专家状态容器（面板在 createAgentRunPanel 时据此创建）
        if (contract && contract.needsExpertPanel && this.expertPanel && this.expertPanel.isEnabled()) {
            plan.collaboration = {
                enabled: true,
                strategy: 'expert_panel',
                collaborators: [],
                handoffs: [],
                quality_gates: []
            };
            // 同一份结构必须从第一刻起就挂在 runState 上：
            // snapshotRun() 取的是 runState.collaboration，如果等专家跑完才赋值，
            // 运行途中落盘的快照里 collaboration 就是 null，
            // 于是切走再切回来（或回看聊天记录）时整个 COLLABORATION 面板都不存在。
            runState.collaboration = {
                enabled: true,
                strategy: 'expert_panel',
                status: 'running',
                started_at: new Date().toISOString(),
                collaborators: [],
                handoffs: [],
                quality_gates: []
            };
        }
        
        // 启动性能监控并绑定 Agent 模块输入框下方的监控条与右下角上下文圆环
        this.attachPerformanceUI();
        if (this.performanceMonitor) {
            this.performanceMonitor.startRun(plan.runId);
        }
        
        this.emitEvent(runState, 'run.started', {
            mode: plan.mode,
            researchProfile: plan.researchProfile,
            newsBriefScope: plan.newsBriefScope || null,
            deliverable: plan.policyFlags?.deliverable || 'answer',
            user_message_preview: this.previewValue(userMessage, 500)
        }, { stage: 'plan', visibility: 'history' });
        if (contextPack) {
            this.emitEvent(runState, 'context.built', {
                context_pack_id: contextPack.id,
                summary: contextPack.summary || null
            }, { stage: 'plan', visibility: 'history' });
        }
        this.emitEvent(runState, 'plan.created', {
            mode: plan.mode,
            researchProfile: plan.researchProfile,
            newsBriefScope: plan.newsBriefScope || null,
            maxIterations: plan.maxIterations,
            policyFlags: plan.policyFlags || {},
            deliverable_tier: contract ? contract.tier : null,
            deliverable_label: contract ? contract.tierLabel : null,
            deliverable_targets: contract ? {
                min_chars: contract.minChars,
                min_tables: contract.minTables,
                min_diagrams: contract.minDiagrams,
                min_citations: contract.minCitations,
                panel_size: contract.panelSize
            } : null
        }, { stage: 'plan', visibility: 'history' });
        this.ui.createAgentRunPanel(container, plan);
        this.ui.setAgentStage(container, 'plan', 'active', '解析任务目标');
        this.ui.addAgentTrace(container, 'plan', 'Run ' + plan.runId + ' initialized in ' + plan.mode + ' mode.');
        if (contract) {
            this.ui.addAgentTrace(
                container,
                'plan',
                '交付档位：' + contract.tierLabel
                + '（正文≥' + contract.minChars + '字，表格≥' + contract.minTables
                + '，图表≥' + contract.minDiagrams + '，引用≥' + contract.minCitations
                + '，并行专家 ' + contract.panelSize + ' 路）'
            );
        }
        this.notifyRunSnapshot(runState, 'panel.created');

        // 系统提示词 = 基础策略 + 交付契约 + （研究档位）"循环只做补缺、长文单独撰写"的说明
        const agentSystemMessage = { role: 'system', content: this.buildContractAwareSystemPrompt(plan, contextPack, contract) };
        let agentMessages = [
            ...messages.filter(message => message?.role === 'system'),
            agentSystemMessage,
            ...messages.filter(message => message?.role !== 'system')
        ];
        
        // 上下文窗口管理：先按本地估算刷新圆环，超限则压缩历史
        if (this.contextManager) {
            if (this.contextManager.shouldCompress(agentMessages)) {
                const compressed = this.contextManager.compressMessages(agentMessages);
                if (compressed.compressed) {
                    agentMessages = compressed.messages;
                    this.ui.addAgentTrace(
                        container,
                        'plan',
                        '上下文接近上限，已折叠 ' + compressed.removedCount + ' 条历史消息（'
                        + compressed.tokensBefore + ' → ' + compressed.tokensAfter + ' tok）'
                    );
                }
            }
            this.contextManager.updateFromMessages(agentMessages);
        }
        
        runState.metrics.context_chars = this.estimateContextChars(agentMessages);

        // 【Plan】由模型先出执行计划（真正的模型决策，而非硬策略状态机）
        let routeResolved = false;
        if (plan.selectedTools.length) {
            try {
                // 记录 LLM 调用开始
                const planCallId = this.performanceMonitor
                    ? this.performanceMonitor.beginLLMCall('plan')
                    : null;
                let planFirstTokenSeen = false;
                
                const planResponse = await this.client.chat({
                    messages: [...agentMessages, {
                        role: 'user',
                        content: '请先制定一个深入的执行计划（10-15 行）：\n1) 任务定位：这个问题要回答到什么程度才算答透。\n2) 信息维度：拆出 6-10 个必须覆盖的维度/视角（按问题实际需要，例如政策/技术路线/产业链上下游/市场格局/竞争/地缘/人才/资本等）。\n3) 检索策略：每个维度用什么工具、并行怎么铺、检索关键词方向、优先哪些一手/权威来源。\n4) 输出形态：最终答案的结构与篇幅规划。\n只写计划本身，不要调用工具，不要开始写正文。'
                    }],
                    enableThinking,
                    signal,
                    maxTokens: 1600,
                    onReasoning: () => { },
                    onContent: (delta, full) => {
                        if (this.performanceMonitor && planCallId && !planFirstTokenSeen && delta) {
                            planFirstTokenSeen = true;
                            this.performanceMonitor.markFirstToken(planCallId);
                        }
                        if (container.reasoningDetails.classList.contains('thinking-state')) {
                            this.ui.finishReasoning(container);
                        }
                        this.ui.updateContent(container, full);
                        this.notifyRunSnapshot(runState, 'plan.updated', { content: full || '' });
                    }
                });
                
                // 记录 LLM 调用结束与 token 用量
                if (this.performanceMonitor && planCallId) {
                    this.performanceMonitor.completeLLMCall(planCallId, planResponse?.usage);
                }
                if (this.contextManager && planResponse?.usage) {
                    this.contextManager.updateFromUsage(planResponse.usage);
                }
                
                const planText = String(planResponse?.content || '').trim();
                if (planText) {
                    agentMessages.splice(agentMessages.indexOf(agentSystemMessage) + 1, 0, {
                        role: 'system',
                        content: '[你的初始执行计划，作为后续执行的参考]\n' + planText
                    });
                    this.ui.addAgentTrace(container, 'plan', '模型计划：' + this.previewValue(planText, 240));
                }
            } catch (error) {
                console.warn('Plan call failed, continuing without a pre-plan.', error);
            }
        }

        // 【Collaborate】并行专家研究面板
        // 关键区别：每位专家跑自己的完整工具循环，Promise 并行走；
        // 墙钟时间 = 最慢专家的耗时，而不是所有轮次之和。
        let expertDigest = '';
        let panelUsage = null;
        if (this.expertPanel && contract && contract.needsExpertPanel) {
            try {
                this.ui.setAgentStage(container, 'route', 'active', '并行专家研究');
                const panel = await this.expertPanel.run({
                    query: userMessage,
                    contract,
                    plan,
                    signal,
                    perfMonitor: this.performanceMonitor,
                    clientFactory: () => this.createExpertClient(),
                    executeTool: async (name, args, toolCall) => {
                        this.assertToolInput(name, args);
                        const execution = await this.prepareToolExecution(runState, name, args, toolCall, container);
                        this.assertToolInput(name, execution.args);
                        const result = await this.registry.execute(name, execution.args);
                        return this.capToolResultForModel(result, name);
                    },
                    onTrace: (type, message) => {
                        this.ui.addAgentTrace(container, 'route', message);
                        this.emitEvent(runState, type, { message }, { stage: 'route', visibility: 'history' });
                    },
                    onStatus: experts => this.renderExpertStatus(container, experts, runState)
                });

                if (panel && panel.digest) {
                    expertDigest = panel.digest;
                    panelUsage = panel.usage;
                    // 保留 renderExpertStatus 逐轮写入的逐专家明细（工具次数/检索词/产出字数），
                    // 只在缺失时才退化为基础字段，否则回看历史时专家行会变成只剩名字的空壳。
                    const syncedCollaborators = runState.collaboration?.collaborators || [];
                    runState.collaboration = {
                        ...(runState.collaboration || {}),
                        enabled: true,
                        strategy: panel.mode,
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        collaborators: syncedCollaborators.length
                            ? syncedCollaborators
                            : panel.experts.map(expert => ({
                                id: expert.key,
                                label: expert.label,
                                ok: Boolean(expert.ok),
                                status: expert.status,
                                duration_ms: expert.durationMs
                            })),
                        handoffs: [],
                        quality_gates: []
                    };
                    runState.metrics.collaboration_experts = panel.experts.length;
                    runState.metrics.collaboration_success = panel.successCount;
                    runState.metrics.expert_wall_ms = Math.round(panel.wallMs);
                    runState.metrics.expert_serial_equivalent_ms = Math.round(panel.serialEquivalentMs);

                    const anchor = agentMessages.indexOf(agentSystemMessage);
                    agentMessages.splice(anchor >= 0 ? anchor + 1 : agentMessages.length, 0, {
                        role: 'system',
                        content: expertDigest
                    });

                    const speedup = panel.serialEquivalentMs > 0
                        ? (panel.serialEquivalentMs / Math.max(1, panel.wallMs)).toFixed(1)
                        : '1.0';
                    this.ui.addAgentTrace(
                        container,
                        'route',
                        '专家面板完成：成功 ' + panel.successCount + '/' + panel.experts.length
                        + '，并行墙钟 ' + (panel.wallMs / 1000).toFixed(1) + 's'
                        + '（串行等价 ' + (panel.serialEquivalentMs / 1000).toFixed(1) + 's，提速约 ' + speedup + '×）'
                    );
                }
            } catch (error) {
                console.warn('Expert panel failed, continuing with single agent.', error);
                this.ui.addAgentTrace(container, 'route', '专家面板失败，回退为单 Agent 检索。');
            }
        }

        this.ui.setAgentStage(container, 'plan', 'done', '计划完成');

        // 【Route】由模型在工具循环里自主路由：第一个工具调用到达时才标记路由完成
        this.ui.setAgentStage(container, 'route', 'active', '等待模型路由');
        this.ui.addAgentTrace(container, 'route', plan.selectedTools.length
            ? 'Available tools for model-driven routing: ' + plan.selectedTools.join(', ')
            : 'No external tools routed for this run.');
        if (!plan.selectedTools.length) {
            this.ui.setAgentStage(container, 'route', 'done', '无工具');
            this.emitEvent(runState, 'route.completed', {
                selectedTools: [],
                toolContracts: []
            }, { stage: 'route', visibility: 'history' });
        }

        if (!plan.selectedTools.length) {
            this.ui.setAgentStage(container, 'synthesize', 'active', '生成回复');
            this.emitEvent(runState, 'model.started', {
                toolsEnabled: false,
                enableThinking: Boolean(enableThinking)
            }, { stage: 'synthesize', visibility: 'history' });
            
            // 记录 LLM 调用开始
            const llmCallId = this.performanceMonitor ? this.performanceMonitor.beginLLMCall('synthesize') : null;
            let firstTokenRecorded = false;
            
            const response = await this.client.chat({
                messages: agentMessages,
                enableThinking,
                signal,
                onReasoning: () => { },
                onUsage: usage => {
                    this.recordModelUsage(runState, usage);
                    if (this.contextManager) {
                        this.contextManager.updateFromUsage(usage);
                    }
                },
                onContent: (delta, full) => {
                    // 记录首 token
                    if (this.performanceMonitor && llmCallId && !firstTokenRecorded && delta) {
                        this.performanceMonitor.markFirstToken(llmCallId);
                        firstTokenRecorded = true;
                    }
                    
                    if (container.reasoningDetails.classList.contains('thinking-state')) {
                        this.ui.finishReasoning(container);
                    }
                    this.ui.updateContent(container, full);
                    this.recordModelDelta(runState, delta, full, 'synthesize');
                    this.notifyRunSnapshot(runState, 'content.updated', { content: full || '' });
                }
            });
            
            if (this.performanceMonitor && llmCallId) {
                this.performanceMonitor.completeLLMCall(llmCallId, response?.usage);
            }

            // 无工具分支同样要遵守交付契约：用户关掉工具但要求深度报告时，
            // 一次普通对话回复达不到篇幅/表格/图表要求，需要再走一遍长文交付阶段。
            let noToolContent = String(response?.content || '');
            if (contract && contract.minChars > 0 && this.researchContract) {
                const deliverable = await this.runDeliverablePass({
                    plan,
                    contract,
                    runState,
                    container,
                    enableThinking,
                    signal,
                    expertDigest: '',
                    runtimeConfig,
                    latestStreamedContent: noToolContent
                });
                if (deliverable && deliverable.content) {
                    noToolContent = deliverable.content;
                    if (response) response.content = noToolContent;
                    runState.metrics.deliverable_ok = Boolean(deliverable.verification?.ok);
                    runState.metrics.deliverable_chars = deliverable.verification?.stats?.chars || 0;
                }
            }

            this.ui.setAgentStage(container, 'synthesize', 'done', '完成');
            this.emitEvent(runState, 'model.completed', {
                finish_reason: response?.finish_reason || null,
                content_chars: String(noToolContent || '').length
            }, { stage: 'synthesize', visibility: 'history' });
            this.finalizeRunState(runState, noToolContent || '');
            
            // 完成性能监控
            if (this.performanceMonitor) {
                this.performanceMonitor.finishRun();
            }
            
            this.emitEvent(runState, 'run.completed', {
                content_chars: String(response?.content || '').length,
                warnings: runState.warnings
            }, { stage: 'synthesize', visibility: 'history' });
            if (response) {
                response.reasoning_content = null;
            }
            response.agent_run = this.snapshotRun(container, plan, runState);
            this.notifyRunSnapshot(runState, 'run.completed', { content: response?.content || '' });
            return response;
        }

        const tools = this.registry.getToolDefinitions(plan.selectedTools);
        let finalResponse = null;
        let latestStreamedContent = '';
        let hasDisplayedContent = false;
        let observedOnce = false;
        let iterationToolCallSeen = false;
        let synthesisStageActive = false;
        const collectedToolCalls = [];
        const beginSynthesisStage = () => {
            if (synthesisStageActive) return;
            synthesisStageActive = true;
            if (!routeResolved) {
                routeResolved = true;
                this.ui.setAgentStage(container, 'route', 'done', '模型已选定工具');
            }
            this.ui.setAgentStage(container, 'act', 'done', '执行完成');
            if (observedOnce) {
                this.ui.setAgentStage(container, 'observe', 'done', '观察完成');
            }
            this.ui.setAgentStage(container, 'synthesize', 'active', '正在合成最终答案');
        };
        // 主循环退化为"补缺与交叉验证"：检索主体已由并行专家承担，因此轮次大幅压缩
        const mainLoopIterations = contract && contract.isResearch
            ? runtimeConfig.mainLoopIterations
            : plan.maxIterations;
        this.ui.setAgentStage(container, 'act', 'active', '等待模型选择工具');
        if (contract && contract.isResearch) {
            this.ui.addAgentTrace(
                container,
                'act',
                '主循环轮次压缩为 ' + mainLoopIterations + ' 轮（检索已由 ' + contract.panelSize + ' 路并行专家承担）'
            );
        }

        let iterationLLMCallId = null;
        let iterationFirstTokenSeen = false;

        finalResponse = await this.client.chatWithTools({
            messages: agentMessages,
            tools,
            enableThinking,
            maxIterations: mainLoopIterations,
            signal,
            onReasoning: () => { },
            onContent: (delta, full, meta = {}) => {
                // 全部内容实时流式渲染：每轮进度句与最终答案都直接刷新到正文。
                latestStreamedContent = full || latestStreamedContent;
                if (!latestStreamedContent) return;
                // 每轮首个 token 用于计算首 token 延迟
                if (this.performanceMonitor && iterationLLMCallId && !iterationFirstTokenSeen && delta) {
                    iterationFirstTokenSeen = true;
                    this.performanceMonitor.markFirstToken(iterationLLMCallId);
                }
                if (container.reasoningDetails.classList.contains('thinking-state')) {
                    this.ui.finishReasoning(container);
                }
                this.recordModelDelta(runState, delta, latestStreamedContent, 'act');
                hasDisplayedContent = true;
                const isToolIteration = meta?.phase === 'tool_iteration' || meta?.phase === 'tool_iteration_stream';
                if (!isToolIteration) {
                    beginSynthesisStage();
                } else if (!iterationToolCallSeen && latestStreamedContent.length > 400) {
                    // 本轮还没出现工具调用且正文已经较长：模型在直接产出最终答案 → 切到 Synthesize
                    beginSynthesisStage();
                }
                this.ui.updateContent(container, latestStreamedContent);
                this.notifyRunSnapshot(runState, 'content.updated', { content: latestStreamedContent });
            },
            onIterationStart: iteration => {
                this.recordIteration(runState, iteration);
                iterationToolCallSeen = false;
                iterationFirstTokenSeen = false;
                // 逐轮登记模型请求：这是上一版最大的埋点缺口（26 次请求只记了 1 次）
                iterationLLMCallId = this.performanceMonitor
                    ? this.performanceMonitor.beginLLMCall('loop#' + iteration)
                    : null;
                if (observedOnce) {
                    this.ui.setAgentStage(container, 'observe', 'done', '观察完成');
                }
                this.emitEvent(runState, 'model.started', {
                    iteration,
                    toolsEnabled: true,
                    enableThinking: Boolean(enableThinking)
                }, { stage: 'act', visibility: 'history' });
                this.ui.setAgentStage(container, 'act', 'active', 'Iteration ' + iteration);
                this.ui.addAgentTrace(container, 'act', 'Iteration ' + iteration + ': model turn started.');
            },
            onToolCall: toolCall => {
                iterationToolCallSeen = true;
                if (synthesisStageActive) {
                    synthesisStageActive = false;
                    this.ui.setAgentStage(container, 'synthesize', 'pending', '');
                }
                if (!routeResolved) {
                    routeResolved = true;
                    this.ui.setAgentStage(container, 'route', 'done', '模型已选定工具');
                    this.emitEvent(runState, 'route.completed', {
                        selectedTools: Array.from(new Set([...plan.selectedTools, toolCall.function.name])),
                        toolContracts: this.getSelectedToolContracts(plan.selectedTools)
                    }, { stage: 'route', visibility: 'history' });
                }
                this.recordToolCall(runState, toolCall);
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
                
                // 记录工具调用开始（用于性能监控计时）
                if (this.performanceMonitor) {
                    this.performanceMonitor.beginToolCall(toolCall.id, toolCall.function.name);
                }
            },
            onToolResult: (toolCallId, result, success) => {
                observedOnce = true;
                this.recordToolResult(runState, toolCallId, result, success);
                this.ui.setAgentStage(container, 'observe', success ? 'active' : 'error', success ? '观察完成' : '工具失败');
                this.ui.updateToolResult(toolCallId, this.summarizeToolResult(result), success);
                
                // 记录工具调用耗时
                if (this.performanceMonitor) {
                    this.performanceMonitor.completeToolCall(toolCallId);
                }
            },
            onIterationComplete: (iteration, response) => {
                const count = response.tool_calls ? response.tool_calls.length : 0;
                // 收口本轮的 LLM 计时与 token（覆盖全部 26 次请求的关键）
                if (this.performanceMonitor && iterationLLMCallId) {
                    this.performanceMonitor.completeLLMCall(iterationLLMCallId, response?.usage);
                    iterationLLMCallId = null;
                }
                if (count === 0) {
                    beginSynthesisStage();
                }
                this.emitEvent(runState, 'model.completed', {
                    iteration,
                    finish_reason: response?.finish_reason || null,
                    tool_call_count: count,
                    content_chars: String(response?.content || '').length
                }, { stage: count ? 'observe' : 'synthesize', visibility: 'history' });
                this.ui.addAgentTrace(container, 'observe', 'Iteration ' + iteration + ': ' + count + ' tool call(s) observed.');
            },
            onUsage: usage => {
                this.recordModelUsage(runState, usage);
                
                // 用真实 prompt_tokens 校正上下文圆环
                if (this.contextManager) {
                    this.contextManager.updateFromUsage(usage);
                }
            },
            executeToolFn: async (name, args, toolCall = null) => {
                this.assertToolInput(name, args);
                const execution = await this.prepareToolExecution(runState, name, args, toolCall, container);
                this.assertToolInput(name, execution.args);
                const result = await this.registry.execute(name, execution.args);
                return this.capToolResultForModel(result, name);
            }
        });

        beginSynthesisStage();
        this.emitEvent(runState, 'synthesis.started', {
            tool_calls: runState.metrics.tool_calls,
            evidence_items: runState.metrics.evidence_items
        }, { stage: 'synthesize', visibility: 'history' });

        // 【Deliverable】独立长文合成阶段
        // 与工具循环解耦，因此不会被"轮次耗尽"打断；这是拿到万字级交付物的关键。
        let deliverableContent = '';
        let deliverableVerification = null;
        if (contract && contract.minChars > 0 && this.researchContract) {
            const deliverable = await this.runDeliverablePass({
                plan,
                contract,
                runState,
                container,
                enableThinking,
                signal,
                expertDigest,
                runtimeConfig,
                latestStreamedContent
            });
            if (deliverable && deliverable.content) {
                // 交付物优先于工具循环的进度句：循环阶段只写要点，最终正文必须用交付物
                deliverableContent = deliverable.content;
                deliverableVerification = deliverable.verification;
                latestStreamedContent = deliverable.content;
            }
        }

        if (finalResponse) {
            // 有交付物时，以交付物为准覆盖循环输出
            if (deliverableContent) {
                finalResponse.content = deliverableContent;
            }
            const originalFinalContent = finalResponse.content || latestStreamedContent || '';
            const normalizedContent = this.normalizeFinalResearchAnswer(originalFinalContent, plan, runState);
            if (normalizedContent && normalizedContent !== originalFinalContent) {
                finalResponse.content = normalizedContent;
                latestStreamedContent = normalizedContent;
                if (container.reasoningDetails.classList.contains('thinking-state')) {
                    this.ui.finishReasoning(container);
                }
                this.ui.updateContent(container, normalizedContent);
                this.notifyRunSnapshot(runState, 'content.updated', { content: normalizedContent });
            } else if (!latestStreamedContent && finalResponse.content) {
                if (container.reasoningDetails.classList.contains('thinking-state')) {
                    this.ui.finishReasoning(container);
                }
                this.ui.updateContent(container, finalResponse.content);
                this.notifyRunSnapshot(runState, 'content.updated', { content: finalResponse.content || '' });
            }
        } else if (latestStreamedContent) {
            // 长文合成阶段可能已经产出正文（主循环没有 finalResponse 的情况）
            finalResponse = { content: latestStreamedContent, tool_calls: [], finish_reason: 'stop' };
        }

        if (deliverableVerification) {
            runState.metrics.deliverable_ok = Boolean(deliverableVerification.ok);
            runState.metrics.deliverable_chars = deliverableVerification.stats.chars;
        }

        this.ui.setAgentStage(container, 'synthesize', 'done', '完成');
        this.ui.addAgentTrace(container, 'synthesize', 'Final answer synthesized from the run state.');
        
        // 完成性能监控
        if (this.performanceMonitor) {
            this.performanceMonitor.finishRun();
        }
        
        if (finalResponse) {
            finalResponse.reasoning_content = null;
            this.finalizeRunState(runState, finalResponse.content || latestStreamedContent || '');
            this.emitEvent(runState, 'run.completed', {
                content_chars: String(finalResponse.content || latestStreamedContent || '').length,
                warnings: runState.warnings
            }, { stage: 'synthesize', visibility: 'history' });
            finalResponse.agent_tool_calls = collectedToolCalls;
            finalResponse.agent_run = this.snapshotRun(container, plan, runState);
            this.notifyRunSnapshot(runState, 'run.completed', { content: finalResponse.content || latestStreamedContent || '' });
        }
        return finalResponse;
    }


    normalizeFinalResearchAnswer(content, plan, runState = null) {
        const text = String(content || '');
        const evidence = Array.isArray(runState?.evidenceLedger) ? runState.evidenceLedger : [];
        if (!text || !evidence.length) return text;
        return this.completeSourceLinks(text, evidence);
    }

    /**
     * 在 Agent 运行面板中渲染专家面板的实时状态。
     * 每个专家显示：维度 · 状态 · 已用工具次数 · 最近检索词 · 产出字数。
     */
    renderExpertStatus(container, experts = [], runState = null) {
        if (!container) return;
        try {
            // 状态先同步进 runState：快照/落库都取 runState.collaboration，
            // 这样即使这一刻没有 DOM（切到别的会话去了），专家进度也不会丢。
            this.syncCollaborationState(runState, experts);

            const panel = this.resolveCollaborationPanel(container);
            if (!panel) return;

            const members = panel.querySelector('.agent-collaboration-members');
            if (members) {
                members.innerHTML = this.ui.buildCollaboratorRows
                    ? this.ui.buildCollaboratorRows(experts)
                    : this.buildExpertRowsFallback(experts);
            }

            const count = panel.querySelector('.agent-collaboration-count');
            if (count) {
                count.textContent = this.ui.buildCollaboratorSummary
                    ? this.ui.buildCollaboratorSummary(experts)
                    : `${experts.filter(item => item.status === 'done').length}/${experts.length} ok`;
            }
        } catch (error) {
            console.warn('Failed to render expert status.', error);
        }
    }

    /**
     * 找到当前**可见**的协作面板。
     * 会话切走再切回来时，消息是重新渲染出来的新 DOM，container.agentCollaboration
     * 还指着已经脱离文档的旧面板；这里按 container.element 重新定位，
     * 否则专家行会被写进不可见的旧节点，用户看到的就是"专家面板消失了"。
     */
    resolveCollaborationPanel(container) {
        const current = container.agentCollaboration;
        if (current?.isConnected) return current;
        const found = container.element?.querySelector?.('.agent-collaboration-panel') || null;
        if (found) {
            container.agentCollaboration = found;
            return found;
        }
        return current || null;
    }

    /**
     * 把专家实时状态写回 runState.collaboration，字段名与 HistoryManager 落库后的口径一致。
     */
    syncCollaborationState(runState, experts = []) {
        const collaboration = runState?.collaboration;
        if (!collaboration || !Array.isArray(experts) || !experts.length) return;
        collaboration.collaborators = experts.map(expert => {
            const activity = expert.activity || {};
            return {
                id: expert.key || '',
                label: expert.label || expert.key || '',
                ok: Boolean(expert.ok),
                status: expert.status || '',
                duration_ms: Number(expert.durationMs) || 0,
                tool_calls: Number(activity.toolCalls) || 0,
                iterations: Number(activity.iterations) || 0,
                findings_chars: Number(activity.findingsChars) || 0,
                tools_used: Array.isArray(activity.toolsUsed) ? activity.toolsUsed.slice(0, 6) : [],
                queries: Array.isArray(activity.queries) ? activity.queries.slice(-3) : [],
                last_action: activity.lastAction || ''
            };
        });
    }

    buildExpertRowsFallback(experts = []) {
        return experts.map(expert => {
            const statusLabel = {
                queued: '排队', running: '检索中', done: '完成', empty: '无产出', failed: '失败'
            }[expert.status] || expert.status;
            return `<div class="agent-collaborator-row ${expert.ok ? 'ok' : ''}">`
                + `<div class="agent-collaborator-head">`
                + `<span class="agent-collaborator-name">${this.escapeForHtml(expert.label)}</span>`
                + `<span class="agent-collaborator-state">${this.escapeForHtml(statusLabel)}</span>`
                + `</div></div>`;
        }).join('') || '<span class="agent-collaborator">准备启动…</span>';
    }

    escapeForHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * 数据与方法说明：告诉写作模型哪些方向证据薄弱，用于**校准主张强度**。
     * 刻意只输出"写作指引"而不是检索过程日志——把过程日志喂给写作模型，
     * 会诱导它在正文里汇报检索过程（「本轮未取得…」），这是语言污染的主要来源之一。
     */
    buildCalibrationNote(runState) {
        const notes = [];
        const calls = Array.isArray(runState?.toolCalls) ? runState.toolCalls : [];
        const failed = calls.filter(call => call.status === 'error');

        const weakExperts = (runState?.collaboration?.collaborators || []).filter(item => !item.ok);
        if (weakExperts.length) {
            notes.push(`以下方向可用材料较少：${weakExperts.map(item => item.label).join('、')}。涉及这些方向的结论请使用较弱表述。`);
        }
        if (failed.length) {
            const names = Array.from(new Set(failed.map(call => call.name))).slice(0, 6);
            notes.push(`${names.join('、')} 类来源未成功返回，依赖这些来源的判断请勿写成定论。`);
        }

        const ledger = runState?.evidenceLedger || [];
        const withSnippet = ledger.filter(item => String(item.snippet || '').length > 20).length;
        if (ledger.length && withSnippet / ledger.length < 0.3) {
            notes.push('多数来源只有页面链接而无正文摘录，涉及具体数值的结论应写明数字来源类型（如厂商自报、媒体转述），不要写成第三方实测。');
        }
        if (!notes.length) return '';

        return [
            '【证据强度提示】以下内容用于校准主张强度，不要把这些句子或类似表述写进正文，也不要提及检索过程：',
            ...notes.map(note => '- ' + note)
        ].join('\n');
    }

    /**
     * 独立的长文交付阶段：
     * 1. 证据消化（编号摘要，让写作模型真的能引用到采集结果）
     * 2. 交付契约 + 语言范式 + 大纲 → 一次高 maxTokens 的写作请求
     * 3. 结构校验（篇幅/表格/图表/引用）→ 不达标则补充
     * 4. 语言范式审计 → 不达标则重写（去污染）
     * 5. 确定性清洗（去掉残留标签前缀）
     */
    async runDeliverablePass({ plan, contract, runState, container, enableThinking, signal, expertDigest, runtimeConfig, latestStreamedContent }) {
        if (!this.researchContract || !contract) return null;
        const styleContract = window.agentStyleContract || (window.AgentStyleContract ? new window.AgentStyleContract() : null);

        // 1) 证据消化：挑选可引用来源并**稠密重编号**（1..N），
        //    同时把 runState.evidenceLedger 换成这批编号，保证正文引用 / 参考资料 / 文末来源三者编号一致、不跳号。
        let evidenceDigest = '';
        let citationSources = [];
        try {
            const prepared = this.researchContract.buildCitationSources(runState.evidenceLedger || [], {});
            citationSources = prepared.entries;
            evidenceDigest = prepared.digest;
            if (citationSources.length) {
                runState.metrics.evidence_items = (runState.evidenceLedger || []).length;
                runState.evidenceLedger = citationSources;
            }
        } catch (error) {
            console.warn('Failed to build citation sources.', error);
        }

        const outline = contract.sections && contract.sections.length
            ? contract.sections.map((section, index) => `${index + 1}. ${section}`).join('\n')
            : '';

        this.ui.addAgentTrace(
            container,
            'synthesize',
            '进入长文交付阶段：目标 ' + contract.minChars + ' 中文字 / 表格 '
            + contract.minTables + ' / 图表 ' + contract.minDiagrams
            + '（可用引用来源 ' + citationSources.length + ' 条）'
        );

        const instruction = this.researchContract.buildSynthesisInstruction(contract, {
            outline,
            evidenceDigest,
            // 专家面板的实质发现必须进写作阶段：这是并行检索的全部价值所在
            expertDigest,
            stylePrompt: styleContract ? styleContract.buildStylePrompt() : ''
        });

        const calibration = this.buildCalibrationNote(runState);
        const systemParts = [this.buildAgentSystemPrompt(plan, runState.contextPack)];
        if (styleContract) systemParts.push(styleContract.buildStyleSystemLine());
        const writingMessages = [
            { role: 'system', content: systemParts.join('\n\n') },
            { role: 'user', content: calibration ? `${instruction}\n\n${calibration}` : instruction }
        ];
        runState.metrics.synthesis_prompt_chars = instruction.length + calibration.length;
        runState.metrics.expert_material_chars = String(expertDigest || '').length;

        let content = await this.streamDeliverable({
            messages: writingMessages,
            enableThinking,
            signal,
            container,
            runState,
            maxTokens: runtimeConfig.synthesisMaxTokens,
            stageNote: '正在撰写交付物'
        });

        // 3) 交付校验 + 一次补充
        let verification = this.researchContract.verify(content, contract);
        runState.metrics.deliverable = {
            tier: contract.tier,
            chars: verification.stats.chars,
            tables: verification.stats.tables,
            diagrams: verification.stats.diagrams,
            citations: verification.stats.citations,
            repairs: 0,
            ok: verification.ok
        };
        this.ui.addAgentTrace(
            container,
            'synthesize',
            '交付校验：' + verification.stats.chars + ' 中文字 / 表格 ' + verification.stats.tables
            + ' / 图表 ' + verification.stats.diagrams + ' / 引用 ' + verification.stats.citations
            + (verification.ok ? ' → 达标' : ' → 未达标，补充一次')
        );

        const maxRepairs = Math.max(0, Number(runtimeConfig.repairPasses) || 0);
        for (let attempt = 0; attempt < maxRepairs && !verification.ok; attempt += 1) {
            const repairInstruction = this.researchContract.buildRepairInstruction(contract, verification.issues);
            const repaired = await this.streamDeliverable({
                messages: [
                    { role: 'system', content: this.buildAgentSystemPrompt(plan, runState.contextPack) },
                    { role: 'user', content: instruction },
                    { role: 'assistant', content: this.clipForContext(content, 24000) },
                    { role: 'user', content: repairInstruction }
                ],
                enableThinking,
                signal,
                container,
                runState,
                maxTokens: runtimeConfig.synthesisMaxTokens,
                stageNote: '正在补充交付物（第 ' + (attempt + 1) + ' 次）'
            });
            if (repaired && repaired.length > content.length * 0.6) {
                content = repaired;
            }
            verification = this.researchContract.verify(content, contract);
            runState.metrics.deliverable.repairs = attempt + 1;
            runState.metrics.deliverable.chars = verification.stats.chars;
            runState.metrics.deliverable.tables = verification.stats.tables;
            runState.metrics.deliverable.diagrams = verification.stats.diagrams;
            runState.metrics.deliverable.citations = verification.stats.citations;
            runState.metrics.deliverable.ok = verification.ok;
            this.ui.addAgentTrace(
                container,
                'synthesize',
                '补充后校验：' + verification.stats.chars + ' 中文字 / 表格 ' + verification.stats.tables
                + ' / 图表 ' + verification.stats.diagrams + ' / 引用 ' + verification.stats.citations
                + (verification.ok ? ' → 达标' : ' → 仍未达标')
            );
        }

        if (!verification.ok) {
            runState.warnings.push('交付物未完全达标：' + verification.issues.join(' '));
        }

        // 4) 语言清洗（确定性，不重写、不删内容）
        // 范式审计与"整篇重写"已按用户要求移除：实测那次重写会把正文与来源砍掉一大半。
        // 这里只做标签前缀剥离与「而不是→而非」的书面化，实测字符变化 -1.5%~-2.4%，
        // 来源条数、表格数、图表数完全不变。如需彻底关闭：window.PZM_AGENT_STYLE = { normalize: false }。
        if (styleContract && runtimeConfig.styleNormalize) {
            const before = content.length;
            const cleaned = styleContract.normalize(content);
            const structuralAfter = this.researchContract.verify(cleaned, contract);
            // 安全阀：清洗后若结构性指标下降，则放弃清洗（宁可留标签，不可丢内容）
            const safe = structuralAfter.stats.tables >= verification.stats.tables
                && structuralAfter.stats.diagrams >= verification.stats.diagrams
                && structuralAfter.stats.chars >= verification.stats.chars * 0.95;
            if (safe) {
                content = cleaned;
                verification = structuralAfter;
                runState.metrics.deliverable.chars = structuralAfter.stats.chars;
                runState.metrics.deliverable.tables = structuralAfter.stats.tables;
                runState.metrics.deliverable.diagrams = structuralAfter.stats.diagrams;
                runState.metrics.deliverable.citations = structuralAfter.stats.citations;
                runState.metrics.style_clean = { enabled: true, charsBefore: before, charsAfter: content.length };
                this.ui.addAgentTrace(
                    container,
                    'synthesize',
                    '语言清洗：剥离标签前缀 ' + (before - content.length) + ' 字符，'
                    + '正文 ' + structuralAfter.stats.chars + ' 中文字 / 表格 ' + structuralAfter.stats.tables
                    + ' / 图表 ' + structuralAfter.stats.diagrams + ' 保持不变'
                );
            } else {
                runState.metrics.style_clean = { enabled: false, reason: 'structural-regression-guard' };
                this.ui.addAgentTrace(container, 'synthesize', '语言清洗已跳过：检测到结构性指标会下降，保留原文。');
            }
        }

        return { content, verification };
    }

    /**
     * 流式执行一次写作请求，把内容实时刷到正文。
     */
    async streamDeliverable({ messages, enableThinking, signal, container, runState, maxTokens, stageNote }) {
        const callId = this.performanceMonitor ? this.performanceMonitor.beginLLMCall('deliverable') : null;
        let firstTokenSeen = false;
        let full = '';

        this.ui.setAgentStage(container, 'synthesize', 'active', stageNote || '撰写中');

        try {
            const response = await this.client.chat({
                messages,
                enableThinking,
                signal,
                maxTokens,
                onReasoning: () => { },
                onUsage: usage => {
                    this.recordModelUsage(runState, usage);
                    if (this.contextManager) this.contextManager.updateFromUsage(usage);
                },
                onContent: (delta, content) => {
                    if (this.performanceMonitor && callId && !firstTokenSeen && delta) {
                        firstTokenSeen = true;
                        this.performanceMonitor.markFirstToken(callId);
                    }
                    full = content || full;
                    if (container.reasoningDetails.classList.contains('thinking-state')) {
                        this.ui.finishReasoning(container);
                    }
                    this.ui.updateContent(container, full);
                    this.notifyRunSnapshot(runState, 'content.updated', { content: full });
                }
            });

            if (this.performanceMonitor && callId) {
                this.performanceMonitor.completeLLMCall(callId, response?.usage);
            }
            return String(response?.content || full || '');
        } catch (error) {
            if (this.performanceMonitor && callId) {
                this.performanceMonitor.completeLLMCall(callId, null);
            }
            console.warn('Deliverable pass failed.', error);
            this.ui.addAgentTrace(container, 'synthesize', '长文写作失败：' + (error?.message || error));
            return full;
        }
    }

    clipForContext(text, max) {
        const str = String(text || '');
        if (str.length <= max) return str;
        // 保留开头（结论）与结尾（来源），中间省略，避免丢引用
        const head = str.slice(0, Math.floor(max * 0.6));
        const tail = str.slice(-Math.floor(max * 0.35));
        return `${head}\n\n…[中间内容已省略以控制上下文]…\n\n${tail}`;
    }

    completeSourceLinks(text, evidence) {
        const sourceHeading = /^\s*(#{1,6}\s*)?(来源|参考|引用|Sources|References)\s*[:：]?\s*$/i;
        const lines = String(text || '').split('\n');
        let inSources = false;
        return lines.map(line => {
            if (!inSources && sourceHeading.test(line.trim())) {
                inSources = true;
                return line;
            }
            if (!inSources) return line;
            const match = line.match(/^(\s*)\[(\d+)\]\s*(.*)$/);
            if (!match) return line;
            const body = (match[3] || '').trim();
            if (/https?:\/\//i.test(body)) return line;
            const num = Number(match[2]);
            const entry = evidence.find(item => String(item.source_id) === String(num)) || evidence[num - 1];
            const url = entry && /^https?:\/\//i.test(String(entry.url || '')) ? String(entry.url) : '';
            if (!url) return line;
            return match[1] + '[' + num + '] ' + (body ? body + ' — ' : '') + url;
        }).join('\n');
    }

    snapshotRun(container, plan, runState = null) {
        const stages = Array.from(container.agentStages?.querySelectorAll('.agent-stage') || []).map(stage => ({
            id: stage.dataset.stage,
            label: stage.querySelector('.agent-stage-label')?.textContent || stage.dataset.stage,
            state: ['active', 'done', 'error', 'pending'].find(name => stage.classList.contains(name)) || 'pending',
            note: stage.querySelector('.agent-stage-note')?.textContent || ''
        }));
        const traces = Array.from(container.agentTrace?.querySelectorAll('.agent-trace-row') || []).map(row => ({
            stage: row.querySelector('.agent-trace-stage')?.textContent || '',
            message: row.querySelector('.agent-trace-message')?.textContent || ''
        }));
        return {
            contract_version: window.AgentContract?.CONTRACT_VERSION || 'agent-contract-v1',
            runId: plan.runId,
            mode: plan.mode,
            researchProfile: plan.researchProfile,
            newsBriefScope: null,
            writing_contract: null,
            quality_gates: {},
            policy_flags: plan.policyFlags || {},
            selectedTools: plan.selectedTools,
            agentEarthTargetCalls: 0,
            maxIterations: plan.maxIterations,
            stages,
            traces,
            context_pack_summary: runState?.contextPack?.summary || null,
            tool_contracts: this.getSelectedToolContracts(plan.selectedTools),
            events: runState?.events || [],
            metrics: runState?.metrics || null,
            warnings: runState?.warnings || [],
            tool_results: runState?.toolCalls || [],
            evidence_ledger: runState?.evidenceLedger || [],
            research_plan: null,
            source_library: null,
            citation_verification: null,
            collaboration: runState?.collaboration || null,
            performance: this.performanceMonitor ? this.performanceMonitor.getSummary() : null,
            context_usage: this.contextManager ? this.contextManager.getStats() : null,
            artifacts: []
        };
    }

    createRunState(plan, contextPack = null, toolContext = null, userMessage = '') {
        return {
            contract_version: window.AgentContract?.CONTRACT_VERSION || 'agent-contract-v1',
            runId: plan.runId,
            plan,
            startedAt: new Date().toISOString(),
            finishedAt: null,
            contextPack,
            toolContext,
            policyFlags: plan.policyFlags || {},
            metrics: {
                iterations: 0,
                tool_calls: 0,
                successful_tool_calls: 0,
                failed_tool_calls: 0,
                evidence_items: 0,
                unique_source_urls: 0,
                citation_markers: 0,
                has_sources_section: false,
                tokens_in: 0,
                tokens_out: 0,
                model_requests: 0,
                context_chars: 0,
                duration_ms: 0,
                collaboration_experts: 0,
                collaboration_success: 0
            },
            toolCalls: [],
            evidenceLedger: [],
            collaboration: null,
            events: [],
            eventSeq: 0,
            warnings: [],
            onSnapshot: null
        };
    }

    notifyRunSnapshot(runState, reason = 'update', meta = {}) {
        if (!runState?.onSnapshot || !runState?.plan || !runState?.uiContainer) return;
        try {
            const now = Date.now();
            const lastAt = Number(runState._lastSnapshotAt || 0);
            const important = reason === 'panel.created' || reason === 'run.completed';
            let snapshot;
            if (important || now - lastAt >= 250 || !runState._lastSnapshot) {
                snapshot = this.snapshotRun(runState.uiContainer, runState.plan, runState);
                runState._lastSnapshotAt = now;
                runState._lastSnapshot = snapshot;
            } else {
                snapshot = runState._lastSnapshot;
            }
            runState.onSnapshot(snapshot, {
                reason,
                runId: runState.runId,
                ...(meta || {})
            });
        } catch (error) {
            console.warn('Failed to publish AgentRun snapshot.', error);
        }
    }

    emitEvent(runState, type, payload = {}, options = {}) {
        if (!runState) return null;
        if (type !== 'model.delta' && runState.events.length >= 2000) return null;
        runState.eventSeq += 1;
        const factory = window.AgentContract?.createAgentEvent;
        const event = factory
            ? factory({
                runId: runState.runId,
                seq: runState.eventSeq,
                type,
                stage: options.stage,
                payload,
                visibility: options.visibility || 'history'
            })
            : {
                id: 'evt-' + Date.now().toString(36) + '-' + runState.eventSeq,
                contract_version: 'agent-contract-v1',
                runId: runState.runId,
                seq: runState.eventSeq,
                type,
                ts: new Date().toISOString(),
                stage: options.stage,
                payload,
                visibility: options.visibility || 'history'
            };
        if (type !== 'model.delta') {
            runState.events.push(event);
        }
        this.ui?.appendAgentEvent?.(runState.uiContainer, event);
        if (type !== 'model.delta') {
            this.notifyRunSnapshot(runState, type, { event });
        }
        return event;
    }

    recordModelDelta(runState, delta, full, stage) {
        // 流式 delta 事件已移除：不再逐段产生事件/快照，仅在关键节点落盘。
        return;
    }

    getSelectedToolContracts(selectedTools) {
        if (!this.registry?.getToolContracts) return [];
        return this.registry.getToolContracts(selectedTools).map(contract => ({
            name: contract.name,
            package: contract.package,
            risk: contract.risk,
            sideEffect: contract.sideEffect,
            requiresApproval: contract.requiresApproval,
            owner: contract.owner,
            projectAccess: contract.projectAccess,
            networkAccess: contract.networkAccess
        }));
    }

    recordIteration(runState, iteration) {
        if (!runState) return;
        runState.metrics.iterations = Math.max(runState.metrics.iterations, Number(iteration) || 0);
    }

    recordToolCall(runState, toolCall) {
        if (!runState || !toolCall) return;
        runState.metrics.tool_calls += 1;
        runState.toolCalls.push({
            id: toolCall.id || '',
            name: toolCall.function?.name || '',
            status: 'pending',
            started_at: new Date().toISOString(),
            arguments_preview: this.previewValue(toolCall.function?.arguments || '', 1200)
        });
        this.emitEvent(runState, 'tool.requested', {
            tool_call_id: toolCall.id || '',
            name: toolCall.function?.name || '',
            arguments_preview: this.previewValue(toolCall.function?.arguments || '', 1200),
            metadata: this.registry?.getToolMetadata?.(toolCall.function?.name || '') || null
        }, { stage: 'act', visibility: 'history' });
    }

    async prepareToolExecution(runState, name, args, toolCall, container) {
        const metadata = this.registry?.getToolMetadata?.(name) || null;
        const call = this.findToolCallRecord(runState, name, toolCall);
        let executableArgs = args || {};
        if (name === 'agent_earth_run') {
            executableArgs = this.enrichAgentEarthArgs(runState, executableArgs);
        }
        this.recordToolStarted(runState, name, executableArgs, metadata, call);
        return { args: executableArgs, metadata, call };
    }

    enrichAgentEarthArgs(runState, args = {}) {
        const enriched = { ...(args || {}) };
        const taskText = String(runState?.contextPack?.task?.text || '').trim();
        if (!String(enriched.query || '').trim() && taskText) {
            enriched.query = taskText;
        }
        const taskContext = this.buildAgentEarthTaskContext(runState, enriched.task_context);
        if (taskContext) {
            enriched.task_context = taskContext;
        }
        if (!Number.isFinite(Number(enriched.max_attempts))) {
            enriched.max_attempts = 0;
        }
        return enriched;
    }

    buildAgentEarthTaskContext(runState, existingContext = '') {
        const parts = [];
        const existing = String(existingContext || '').trim();
        if (existing) parts.push(existing);
        const attachmentContext = String(runState?.toolContext?.attachmentContext || '').trim();
        if (attachmentContext) {
            parts.push([
                'Relevant attachment context prepared by the host:',
                this.previewValue(attachmentContext, 7000)
            ].join('\n'));
        }
        const manifest = Array.isArray(runState?.toolContext?.attachmentManifest)
            ? runState.toolContext.attachmentManifest
            : [];
        if (manifest.length && !attachmentContext) {
            parts.push([
                'Attachment manifest:',
                this.previewValue(JSON.stringify(manifest, null, 2), 1800)
            ].join('\n'));
        }
        const priorRuns = Array.isArray(runState?.toolContext?.priorAgentRuns)
            ? runState.toolContext.priorAgentRuns.slice(-2)
            : [];
        if (priorRuns.length) {
            parts.push([
                'Recent AgentRun summaries:',
                this.previewValue(JSON.stringify(priorRuns, null, 2), 2200)
            ].join('\n'));
        }
        return this.previewValue(parts.filter(Boolean).join('\n\n'), 9000);
    }

    findToolCallRecord(runState, name, toolCall = null) {
        if (!runState) return null;
        if (toolCall?.id) {
            const byId = runState.toolCalls.find(item => item.id === toolCall.id);
            if (byId) return byId;
        }
        return runState.toolCalls.find(item => item.name === name && ['pending', 'waiting_approval'].includes(item.status))
            || runState.toolCalls.find(item => item.name === name)
            || null;
    }

    recordToolStarted(runState, name, args, metadata = null, call = null) {
        if (!runState) return;
        const targetCall = call || this.findToolCallRecord(runState, name);
        const toolMetadata = metadata || this.registry?.getToolMetadata?.(name) || null;
        if (targetCall) {
            targetCall.status = 'running';
            targetCall.executed_at = new Date().toISOString();
            targetCall.arguments_preview = this.previewValue(args || {}, 1200);
            targetCall.approval_required = Boolean(toolMetadata?.requiresApproval);
            targetCall.risk = toolMetadata?.risk || '';
        }
        this.emitEvent(runState, 'tool.started', {
            tool_call_id: targetCall?.id || '',
            name,
            arguments_preview: this.previewValue(args || {}, 1200),
            metadata: toolMetadata
        }, { stage: 'act', visibility: 'history' });
    }

    recordToolResult(runState, toolCallId, result, success) {
        if (!runState) return;
        const call = runState.toolCalls.find(item => item.id === toolCallId);
        if (call) {
            call.status = success ? 'success' : 'error';
            call.finished_at = new Date().toISOString();
            call.result_chars = String(result ?? '').length;
            call.result_preview = this.previewValue(result, 900);
        }
        if (success) runState.metrics.successful_tool_calls += 1;
        else runState.metrics.failed_tool_calls += 1;
        const toolName = call?.name || '';
        this.emitEvent(runState, success ? 'tool.completed' : 'tool.failed', {
            tool_call_id: toolCallId,
            name: toolName,
            result_chars: String(result ?? '').length,
            result_preview: this.previewValue(result, 700)
        }, { stage: 'observe', visibility: 'history' });
        // 极简证据提取：从工具结果收集 URL，支撑离线回看与快照，不再做评分/信任推断。
        this.extractEvidenceEntries(toolName, result).forEach(entry => this.addEvidenceEntry(runState, entry));
    }

    recordModelUsage(runState, usage) {
        if (!runState || !usage) return;
        runState.metrics.model_requests += 1;
        const prompt = Number(usage.prompt_tokens || usage.input_tokens || 0);
        const completion = Number(usage.completion_tokens || usage.output_tokens || 0);
        if (Number.isFinite(prompt)) runState.metrics.tokens_in += prompt;
        if (Number.isFinite(completion)) runState.metrics.tokens_out += completion;
    }

    estimateContextChars(messages = []) {
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
            if (Array.isArray(message?.tool_calls)) {
                total += JSON.stringify(message.tool_calls).length;
            }
            if (typeof message?.role === 'string') total += message.role.length;
        }
        return total;
    }

    finalizeRunState(runState, finalContent) {
        if (!runState) return;
        if (runState.startedAt) {
            const elapsed = Date.now() - new Date(runState.startedAt).getTime();
            if (Number.isFinite(elapsed) && elapsed >= 0) runState.metrics.duration_ms = elapsed;
        }
        const text = String(finalContent || '');
        const citations = this.extractCitationMarkers(text);
        runState.metrics.citation_markers = citations.length;
        runState.metrics.has_sources_section = /(^|\n)\s*(sources|source|references|来源|参考)\s*[:：]?/i.test(text);
        runState.finishedAt = new Date().toISOString();
        runState.metrics.evidence_items = runState.evidenceLedger.length;
        runState.metrics.unique_source_urls = new Set(runState.evidenceLedger.map(item => item.url).filter(Boolean)).size;
        if (runState.evidenceLedger.length > 0 && citations.length === 0) {
            runState.warnings.push('Evidence was collected, but the final answer has no numeric citation markers.');
        }
        if (runState.evidenceLedger.length > 0 && !runState.metrics.has_sources_section) {
            runState.warnings.push('Evidence was collected, but the final answer has no explicit Sources/References section.');
        }
        
        // 结束性能监控并刷新输入框下方的指标条
        if (this.performanceMonitor) {
            this.performanceMonitor.finishRun();
        }
    }

    buildSourceUrlMap(runState) {
        const map = {};
        (Array.isArray(runState?.evidenceLedger) ? runState.evidenceLedger : []).forEach(entry => {
            const id = String(entry?.source_id ?? '');
            const url = String(entry?.url || '');
            if (id && /^https?:\/\//i.test(url)) {
                map[id] = url;
            }
        });
        return map;
    }

    extractCitationMarkers(text) {
        const markers = [];
        Array.from(String(text || '').matchAll(/\[((?:\d+\s*(?:[,，]\s*\d+\s*)*))\]/g)).forEach(match => {
            String(match[1] || '').split(/[,，]/).map(item => item.trim()).filter(item => /^\d+$/.test(item)).forEach(id => markers.push(id));
        });
        return Array.from(new Set(markers));
    }

    /**
     * 从工具结果中提取证据。
     *
     * 上一版只抽 URL，导致证据库是一堆链接而不是事实——写作阶段拿不到可引用的内容，
     * 只能写出"某机构页面显示…"这类空话。此版同时抽取标题与内容片段。
     */
    extractEvidenceEntries(toolName, result) {
        const text = String(result ?? '');
        if (!text) return [];
        const entries = [];
        const seen = new Set();

        const push = entry => {
            const url = this.cleanUrl(entry.url);
            if (!url || !/^https?:\/\//i.test(url)) return;
            if (seen.has(url)) return;
            seen.add(url);
            entries.push({
                kind: entry.kind || 'tool_result_url',
                tool: toolName || '',
                url,
                title: this.cleanOneLine(entry.title || '').slice(0, 200),
                snippet: this.cleanOneLine(entry.snippet || '').slice(0, 400)
            });
        };

        // 1) 结构化结果优先：直接读取 url / title / snippet 字段
        const structured = this.safeParseJson(text);
        if (structured) {
            this.collectStructuredEvidence(structured, push, 60);
        }

        // 2) 文本兜底：抽取每个 URL 周边的文字作为片段，并尝试识别标题
        if (entries.length < 60) {
            const matches = text.matchAll(/https?:\/\/[^\s"'<>）)，,]+/g);
            for (const match of matches) {
                if (entries.length >= 60) break;
                const url = match[0];
                const start = Math.max(0, match.index - 160);
                const end = Math.min(text.length, match.index + url.length + 120);
                const window = text.slice(start, end);
                push({
                    url,
                    title: this.guessTitleNearUrl(window, url),
                    snippet: window.replace(url, '').replace(/\s+/g, ' ').trim()
                });
            }
        }

        return entries.slice(0, 60);
    }

    /**
     * 递归收集 JSON 结果里的 {url,title,snippet} 组合。
     */
    collectStructuredEvidence(node, push, budget, depth = 0) {
        if (!node || depth > 6 || budget <= 0) return 0;
        let used = 0;
        if (Array.isArray(node)) {
            for (const item of node) {
                if (used >= budget) break;
                used += this.collectStructuredEvidence(item, push, budget - used, depth + 1);
            }
            return used;
        }
        if (typeof node !== 'object') return 0;

        const urlCandidate = node.url || node.link || node.href || node.source_url;
        if (typeof urlCandidate === 'string' && /^https?:\/\//i.test(urlCandidate)) {
            push({
                url: urlCandidate,
                title: node.title || node.name || node.headline || '',
                snippet: node.snippet || node.summary || node.description || node.content_preview || node.text || ''
            });
            used += 1;
        }

        for (const key of Object.keys(node)) {
            if (used >= budget) break;
            const value = node[key];
            if (value && typeof value === 'object') {
                used += this.collectStructuredEvidence(value, push, budget - used, depth + 1);
            }
        }
        return used;
    }

    /**
     * 从 URL 附近的文本里猜标题：优先 Markdown 链接文本，其次是同行的前置文本。
     */
    guessTitleNearUrl(window, url) {
        const md = window.match(new RegExp('\\[([^\\]]{4,160})\\]\\s*\\(?\\s*' + this.escapeRegExp(url)));
        if (md) return md[1];
        const escaped = this.escapeRegExp(url);
        const inline = window.match(new RegExp('([^\\n|」】]{4,120})\\s*[—\\-|]\\s*' + escaped));
        if (inline) return inline[1];
        return '';
    }

    escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    addEvidenceEntry(runState, entry) {
        if (!runState || !entry || !entry.url) return null;
        const evidenceEntry = {
            id: 'evd-' + (runState.evidenceLedger.length + 1),
            source_id: String(runState.evidenceLedger.length + 1),
            kind: entry.kind || 'tool_result_url',
            tool: entry.tool || '',
            title: entry.title || '',
            snippet: entry.snippet || '',
            url: entry.url,
            observed_at: new Date().toISOString(),
            trustLevel: 'medium'
        };
        runState.evidenceLedger.push(evidenceEntry);
        runState.metrics.evidence_items = runState.evidenceLedger.length;
        if (runState.uiContainer) {
            runState.uiContainer._sourceUrlMap = this.buildSourceUrlMap(runState);
        }
        return evidenceEntry;
    }

    extractUrls(text) {
        const matches = String(text || '').match(/https?:\/\/[^\s"'<>）)]+/g) || [];
        return Array.from(new Set(matches)).slice(0, 20);
    }

    cleanUrl(url) {
        return String(url || '').trim().replace(/[.,;，。！？；：、）】》」』]+$/, '');
    }

    cleanOneLine(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    previewValue(value, max = 600) {
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        if (!text) return '';
        return text.length <= max ? text : text.slice(0, max) + '\n[preview truncated]';
    }

    safeParseJson(value) {
        if (value && typeof value === 'object') return value;
        const text = String(value || '').trim();
        if (!text || !/^[\[{]/.test(text)) return null;
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    }

    assertToolInput(name, args) {
        const raw = JSON.stringify(args || {});
        if (raw.length > 12000) {
            throw new Error(name + ' input is too large for a front-end agent run.');
        }
    }

    capToolResultForModel(result, toolName = '') {
        const text = String(result ?? '');
        const configured = Number(this.registry?.getToolMetadata?.(toolName)?.maxOutputChars);
        const cap = Number.isFinite(configured) && configured > 0
            ? Math.min(Math.max(configured, 8000), 96000)
            : 24000;
        if (text.length <= cap) return text;
        return text.slice(0, cap) + '\n\n[Tool result truncated to ' + cap + ' characters by AgentRuntime]';
    }

    summarizeToolResult(result) {
        const text = String(result ?? '').trim();
        if (!text) return '[empty result]';
        if (text.length <= 900) return text;
        return text.slice(0, 900) + '\n\n[Result preview truncated. Full result was still provided to the model within runtime limits.]';
    }

    /**
     * 返回本次运行性能与上下文的摘要，便于宿主（main.js）展示或落盘。
     */
    getRunReport() {
        const summary = this.performanceMonitor ? this.performanceMonitor.getSummary() : null;
        return {
            performance: summary,
            performance_line: this.performanceMonitor ? this.performanceMonitor.formatLine() : '',
            context: this.contextManager ? this.contextManager.getStats() : null,
            // 累计值与墙钟值都给出来，便于核对并行收益
            performance_detail: summary ? {
                llm_wall_ms: Math.round(summary.llmWallMs),
                llm_sum_ms: Math.round(summary.llmSumMs),
                tool_wall_ms: Math.round(summary.toolWallMs),
                tool_sum_ms: Math.round(summary.toolSumMs),
                llm_calls: summary.llmCalls,
                tool_calls: summary.toolCalls,
                tool_concurrency_peak: summary.toolConcurrencyPeak
            } : null,
            expert_panel: this.expertPanel && this.expertPanel.getLastRun()
                ? {
                    mode: this.expertPanel.getLastRun().mode,
                    experts: this.expertPanel.getLastRun().experts.length,
                    success: this.expertPanel.getLastRun().successCount,
                    wall_ms: Math.round(this.expertPanel.getLastRun().wallMs),
                    serial_equivalent_ms: Math.round(this.expertPanel.getLastRun().serialEquivalentMs)
                }
                : null,
            diagrams: window.agentDiagramRenderer ? window.agentDiagramRenderer.getStats() : null
        };
    }

}

window.AgentRuntime = AgentRuntime;