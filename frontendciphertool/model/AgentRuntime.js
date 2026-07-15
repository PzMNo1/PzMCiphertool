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
        this.agentProfiles = window.AgentProfiles
            ? new window.AgentProfiles(this)
            : null;
        this.intentContractBuilder = window.AgentIntentContractBuilder
            ? new window.AgentIntentContractBuilder(this)
            : null;
        this.policyResolver = window.AgentPolicyResolver
            ? new window.AgentPolicyResolver(this)
            : null;
        this.researchPlanService = window.AgentResearchPlan
            ? new window.AgentResearchPlan(this)
            : null;
        this.sourceLibraryService = window.AgentSourceLibrary
            ? new window.AgentSourceLibrary(this)
            : null;
        this.toolRiskPolicy = window.AgentToolRiskPolicy
            ? new window.AgentToolRiskPolicy(this)
            : null;
        this.evidenceLedgerService = window.AgentEvidenceLedger
            ? new window.AgentEvidenceLedger(this)
            : null;
        this.citationNormalizer = window.AgentCitationNormalizer
            ? new window.AgentCitationNormalizer(this)
            : null;
        this.citationVerifier = window.AgentCitationVerifier
            ? new window.AgentCitationVerifier(this)
            : null;
        this.collaborationService = window.AgentCollaboration
            ? new window.AgentCollaboration(this)
            : null;
    }

    createPlan(userMessage, options = {}) {
        const intent = this.intentContractBuilder
            ? this.intentContractBuilder.build(userMessage, options)
            : this.buildFallbackIntentContract(userMessage, options);
        const policy = this.policyResolver
            ? this.policyResolver.resolve(intent)
            : {
                selectedTools: [],
                researchProfile: 'none',
                agentEarthTargetCalls: 0,
                maxIterations: intent.mode === 'chat' ? 1 : 6,
                sourceTarget: 0,
                citationTarget: 0,
                writingContract: intent.writingContract || null,
                qualityGates: intent.writingContract?.qualityGates || {},
                policyFlags: {
                    needsTools: intent.mode !== 'chat',
                    needsResearchPlan: false,
                    needsSourceLibrary: false,
                    needsOutline: false,
                    needsCitations: false,
                    needsClaimCheck: false,
                    needsCounterEvidence: false,
                    needsStylePass: false,
                    lightweight: intent.mode === 'chat',
                    deliverable: 'answer',
                    citationStyle: 'numeric',
                    sourceTarget: 0,
                    citationTarget: 0
                }
            };

        const plan = {
            runId: `run-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
            mode: intent.mode,
            researchProfile: policy.researchProfile,
            newsBriefScope: intent.newsBriefScope,
            writingContract: policy.writingContract || null,
            qualityGates: policy.qualityGates || {},
            policyFlags: policy.policyFlags || {},
            selectedTools: policy.selectedTools,
            agentEarthTargetCalls: policy.agentEarthTargetCalls,
            maxIterations: policy.maxIterations,
            sourceTarget: policy.sourceTarget,
            citationTarget: policy.citationTarget,
            stages: [
                { id: 'plan', label: 'Plan' },
                { id: 'route', label: 'Route' },
                { id: 'act', label: 'Act' },
                { id: 'observe', label: 'Observe' },
                { id: 'synthesize', label: 'Synthesize' }
            ]
        };
        plan.collaboration = this.collaborationService
            ? this.collaborationService.createPlan(intent, { ...policy, selectedTools: policy.selectedTools })
            : { enabled: false, strategy: 'single_agent', collaborators: [], handoffs: [], quality_gates: [] };
        return plan;
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
            newsBriefScope: null
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

    hasNetworkTools(toolNames = []) {
        const networkTools = new Set([
            'community_snapshot',
            'web_research',
            'search_urls',
            'read_webpage',
            'news_query',
            'open_url',
            'find_in_page',
            'open',
            'find',
            'weather',
            'get_weather',
            'finance_query',
            'agent_earth_run'
        ]);
        return (Array.isArray(toolNames) ? toolNames : []).some(name => networkTools.has(name));
    }

    buildAgentSystemPrompt(plan, contextPack = null) {
        const basePrompt = this.agentProfiles
            ? this.agentProfiles.buildSystemPrompt(plan, contextPack)
            : [
            'Agent runtime policy:',
            '- Treat the conversation as a bounded run with these phases: plan, route, act, observe, synthesize.',
            '- Use routed tools when needed, record evidence, and synthesize a direct final answer.',
            `- Research profile: ${plan?.researchProfile || 'none'}.`,
            `- Current run mode: ${plan?.mode || 'chat'}.`
        ].join('\n');
        const collaborationLines = this.collaborationService?.buildPromptLines(plan) || [];
        return collaborationLines.length
            ? [basePrompt, ...collaborationLines].join('\n')
            : basePrompt;
    }

    buildNewsBriefPolicy(sourceTarget, citationTarget, scope = null) {
        return this.agentProfiles
            ? this.agentProfiles.buildNewsBriefPolicy(sourceTarget, citationTarget, scope)
            : [];
    }

    buildContextMemoryPolicy(contextPack) {
        const runs = Array.isArray(contextPack?.agentRunSummaries) ? contextPack.agentRunSummaries : [];
        if (!runs.length) return [];
        return [
            '- Prior AgentRun context memory is available below. Use it for continuity, follow-up questions, and avoiding duplicate reads of unchanged sources.',
            '- Do not treat prior AgentRun memory as fresh evidence when the user asks for latest/today/current facts; refresh sources in that case.',
            '- If prior citation verification has unmatched or weak citations, treat those claims as uncertain unless refreshed or supported by stronger evidence.',
            'Prior AgentRun context compact JSON:',
            this.previewValue(JSON.stringify(runs, null, 2), 3600)
        ];
    }

    async run({ messages, userMessage, enableThinking, toolEnabled, hasAttachments = false, container, contextPack = null, toolContext = null, onRunSnapshot = null, signal = null }) {
        await this.refreshDynamicToolAvailability();
        const plan = this.createPlan(userMessage, { toolEnabled, hasAttachments, messages });
        const runState = this.createRunState(plan, contextPack, toolContext, userMessage);
        this.collaborationService?.annotateRunState(runState);
        runState.uiContainer = container;
        runState.onSnapshot = typeof onRunSnapshot === 'function' ? onRunSnapshot : null;
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
            writingContract: plan.writingContract || null,
            qualityGates: plan.qualityGates || {},
            policyFlags: plan.policyFlags || {},
            researchPlan: runState.researchPlan ? {
                id: runState.researchPlan.id,
                status: runState.researchPlan.status,
                question_count: runState.researchPlan.questions?.length || 0
            } : null,
            sourceLibrary: runState.sourceLibrary ? {
                id: runState.sourceLibrary.id,
                status: runState.sourceLibrary.status
            } : null,
            collaboration: plan.collaboration?.enabled ? {
                strategy: plan.collaboration.strategy,
                collaborator_count: plan.collaboration.collaborators?.length || 0,
                collaborators: plan.collaboration.collaborators?.map(item => item.label) || []
            } : null
        }, { stage: 'plan', visibility: 'history' });
        this.collaborationService?.emitStart(this, runState);
        if (runState.researchPlan) {
            this.emitEvent(runState, 'research.plan.created', {
                research_plan_id: runState.researchPlan.id,
                deliverable: runState.researchPlan.deliverable,
                question_count: runState.researchPlan.questions.length,
                softTargets: runState.researchPlan.coverage_goals?.softTargets === true
            }, { stage: 'plan', visibility: 'history' });
        }
        if (runState.sourceLibrary) {
            this.emitEvent(runState, 'source_library.created', {
                source_library_id: runState.sourceLibrary.id,
                status: runState.sourceLibrary.status
            }, { stage: 'plan', visibility: 'history' });
        }
        this.ui.createAgentRunPanel(container, plan);
        this.ui.setAgentStage(container, 'plan', 'active', '解析任务目标');
        this.ui.addAgentTrace(container, 'plan', `Run ${plan.runId} initialized in ${plan.mode} mode.`);
        if (plan.collaboration?.enabled) {
            this.ui.addAgentTrace(
                container,
                'plan',
                `Collaboration enabled: ${plan.collaboration.collaborators.map(item => item.label).join(' -> ')}.`
            );
        }
        this.notifyRunSnapshot(runState, 'panel.created');

        const agentSystemMessage = { role: 'system', content: this.buildAgentSystemPrompt(plan, contextPack) };
        const agentMessages = [
            ...messages.filter(message => message?.role === 'system'),
            agentSystemMessage,
            ...messages.filter(message => message?.role !== 'system')
        ];

        this.ui.setAgentStage(container, 'plan', 'done', '计划完成');
        this.ui.setAgentStage(container, 'route', 'active', `${plan.selectedTools.length} tools`);
        this.ui.addAgentTrace(container, 'route', plan.selectedTools.length
            ? `Routed tools: ${plan.selectedTools.join(', ')}`
            : 'No external tools routed for this run.');
        this.ui.setAgentStage(container, 'route', 'done', `${plan.selectedTools.length} tools`);
        this.emitEvent(runState, 'route.completed', {
            selectedTools: plan.selectedTools,
            toolContracts: this.getSelectedToolContracts(plan.selectedTools)
        }, { stage: 'route', visibility: 'history' });
        this.emitCollaborationReady(runState);

        if (!plan.selectedTools.length) {
            this.ui.setAgentStage(container, 'synthesize', 'active', '生成回复');
            this.emitEvent(runState, 'model.started', {
                toolsEnabled: false,
                enableThinking: Boolean(enableThinking)
            }, { stage: 'synthesize', visibility: 'history' });
            const response = await this.client.chat({
                messages: agentMessages,
                enableThinking,
                signal,
                onReasoning: () => { },
                onContent: (delta, full) => {
                    if (container.reasoningDetails.classList.contains('thinking-state')) {
                        this.ui.finishReasoning(container);
                    }
                    this.ui.updateContent(container, full);
                    this.recordModelDelta(runState, delta, full, 'synthesize');
                    this.notifyRunSnapshot(runState, 'content.updated', { content: full || '' });
                }
            });
            this.ui.setAgentStage(container, 'synthesize', 'done', '完成');
            this.emitEvent(runState, 'model.completed', {
                finish_reason: response?.finish_reason || null,
                content_chars: String(response?.content || '').length
            }, { stage: 'synthesize', visibility: 'history' });
            this.finalizeRunState(runState, response?.content || '');
            this.collaborationService?.finalize(runState);
            this.emitCollaborationCompleted(runState);
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
        let hasSuppressedToolIterationContent = false;
        let shouldReplayFinalContent = false;
        let forcedAgentEarthFollowups = 0;
        let forcedNewsBriefDensityFollowups = 0;
        let forcedSourceAlignmentFollowups = 0;
        let forcedCoverageFollowups = 0;
        let forcedCitationQualityFollowups = 0;
        const collectedToolCalls = [];
        const progressLines = [];
        let latestProgressContent = '';
        let progressDisplayed = false;
        let draftPlaceholderDisplayed = false;
        const renderProgress = () => {
            const progressContent = this.buildAgentProgressContent(progressLines, latestProgressContent);
            if (!progressContent) return;
            if (container.reasoningDetails.classList.contains('thinking-state')) {
                this.ui.finishReasoning(container);
            }
            progressDisplayed = true;
            this.ui.updateContent(container, progressContent);
            this.notifyRunSnapshot(runState, 'progress.updated', { content: progressContent });
        };
        this.ui.setAgentStage(container, 'act', 'active', '等待模型选择工具');

        finalResponse = await this.client.chatWithTools({
            messages: agentMessages,
            tools,
            enableThinking,
            maxIterations: plan.maxIterations,
            signal,
            onReasoning: () => { },
            onContent: (delta, full, meta = {}) => {
                const previousStreamedContent = latestStreamedContent;
                latestStreamedContent = full || latestStreamedContent;
                if (!latestStreamedContent) return;
                if (container.reasoningDetails.classList.contains('thinking-state')) {
                    this.ui.finishReasoning(container);
                }
                this.recordModelDelta(runState, delta, latestStreamedContent, 'act');
                const isToolIterationContent = meta?.phase === 'tool_iteration' || meta?.phase === 'tool_iteration_stream';
                if (isToolIterationContent) {
                    hasSuppressedToolIterationContent = true;
                    const progressContent = this.extractToolIterationProgress(latestStreamedContent, meta);
                    if (progressContent) {
                        latestProgressContent = progressContent;
                        draftPlaceholderDisplayed = false;
                        renderProgress();
                    } else if (this.isSuppressedIntermediateDraft(latestStreamedContent)) {
                        const placeholder = this.getSuppressedDraftPlaceholder(plan);
                        if (!draftPlaceholderDisplayed || latestProgressContent !== placeholder) {
                            latestProgressContent = placeholder;
                            draftPlaceholderDisplayed = true;
                            renderProgress();
                        }
                    }
                    return;
                }
                if (hasSuppressedToolIterationContent && delta === full && full === previousStreamedContent) {
                    shouldReplayFinalContent = true;
                    return;
                }
                hasDisplayedContent = true;
                progressDisplayed = false;
                latestProgressContent = '';
                draftPlaceholderDisplayed = false;
                this.ui.updateContent(container, latestStreamedContent);
                this.notifyRunSnapshot(runState, 'content.updated', { content: latestStreamedContent });
            },
            onIterationStart: iteration => {
                this.recordIteration(runState, iteration);
                this.emitEvent(runState, 'model.started', {
                    iteration,
                    toolsEnabled: true,
                    enableThinking: Boolean(enableThinking)
                }, { stage: 'act', visibility: 'history' });
                this.ui.setAgentStage(container, 'act', 'active', `Iteration ${iteration}`);
                this.ui.addAgentTrace(container, 'act', `Iteration ${iteration}: model turn started.`);
            },
            onToolCall: toolCall => {
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
            },
            onToolResult: (toolCallId, result, success) => {
                this.recordToolResult(runState, toolCallId, result, success);
                this.ui.setAgentStage(container, 'observe', success ? 'active' : 'error', success ? '观察完成' : '工具失败');
                this.ui.updateToolResult(toolCallId, this.summarizeToolResult(result), success);
            },
            onIterationComplete: (iteration, response) => {
                const count = response.tool_calls ? response.tool_calls.length : 0;
                this.emitEvent(runState, 'model.completed', {
                    iteration,
                    finish_reason: response?.finish_reason || null,
                    tool_call_count: count,
                    content_chars: String(response?.content || '').length
                }, { stage: count ? 'observe' : 'synthesize', visibility: 'history' });
                this.ui.addAgentTrace(container, 'observe', `Iteration ${iteration}: ${count} tool call(s) observed.`);
            },
            augmentToolCalls: ({ iteration, toolCalls }) => {
                const injected = this.buildEarlyAgentEarthToolCalls(plan, runState, userMessage, iteration, toolCalls);
                injected.forEach(toolCall => {
                    this.emitEvent(runState, 'agent_earth.early_injected', {
                        iteration,
                        tool_call_id: toolCall.id,
                        name: toolCall.function?.name || '',
                        arguments_preview: this.previewValue(toolCall.function?.arguments || '', 1200)
                    }, { stage: 'act', visibility: 'history' });
                });
                if (injected.length) {
                    this.ui.addAgentTrace(container, 'act', `Iteration ${iteration}: injected ${injected.length} early AgentEarth call(s).`);
                }
                return injected;
            },
            shouldContinueAfterFinal: ({ iteration, response }) => {
                const agentEarthFollowUp = this.buildForcedAgentEarthFollowUp(plan, runState, userMessage, forcedAgentEarthFollowups);
                if (agentEarthFollowUp) {
                    forcedAgentEarthFollowups += 1;
                    this.ui.setAgentStage(container, 'act', 'active', 'AgentEarth collaboration');
                    this.ui.addAgentTrace(container, 'act', `AgentEarth collaboration request added a bounded tool pass at iteration ${iteration}.`);
                    this.emitEvent(runState, 'agent_earth.collaboration_required', {
                        iteration,
                        forcedFollowups: forcedAgentEarthFollowups
                    }, { stage: 'act', visibility: 'history' });
                    return { continue: true, message: agentEarthFollowUp };
                }
                const sourceAlignmentFollowUp = this.buildForcedSourceAlignmentFollowUp(plan, response, forcedSourceAlignmentFollowups);
                if (sourceAlignmentFollowUp) {
                    forcedSourceAlignmentFollowups += 1;
                    this.ui.setAgentStage(container, 'act', 'active', `Source alignment ${forcedSourceAlignmentFollowups}`);
                    this.ui.addAgentTrace(container, 'act', `Source alignment verification requested a targeted evidence pass at iteration ${iteration}.`);
                    this.emitEvent(runState, 'research.source_alignment_gap', {
                        iteration,
                        forcedFollowups: forcedSourceAlignmentFollowups
                    }, { stage: 'act', visibility: 'history' });
                    return { continue: true, message: sourceAlignmentFollowUp };
                }
                const densityFollowUp = this.buildForcedNewsBriefDensityFollowUp(plan, runState, response, userMessage, forcedNewsBriefDensityFollowups);
                if (densityFollowUp) {
                    forcedNewsBriefDensityFollowups += 1;
                    this.ui.setAgentStage(container, 'act', 'active', `News brief expansion ${forcedNewsBriefDensityFollowups}`);
                    this.ui.addAgentTrace(container, 'act', `News brief expansion request asked for a fuller answer at iteration ${iteration}.`);
                    this.emitEvent(runState, 'research.answer_density_gap', {
                        iteration,
                        forcedFollowups: forcedNewsBriefDensityFollowups
                    }, { stage: 'act', visibility: 'history' });
                    return { continue: true, message: densityFollowUp };
                }
                const citationQualityFollowUp = this.buildForcedCitationQualityFollowUp(plan, runState, response, forcedCitationQualityFollowups);
                if (citationQualityFollowUp) {
                    forcedCitationQualityFollowups += 1;
                    this.ui.setAgentStage(container, 'act', 'active', `Citation repair ${forcedCitationQualityFollowups}`);
                    this.ui.addAgentTrace(container, 'act', `Citation quality request asked for a better sourced final answer at iteration ${iteration}.`);
                    this.emitEvent(runState, 'research.citation_density_gap', {
                        iteration,
                        forcedFollowups: forcedCitationQualityFollowups,
                        unique_source_urls: runState.metrics.unique_source_urls,
                        evidence_items: runState.metrics.evidence_items
                    }, { stage: 'act', visibility: 'history' });
                    return { continue: true, message: citationQualityFollowUp };
                }
                const followUp = this.buildForcedResearchFollowUp(plan, runState, userMessage, forcedCoverageFollowups);
                if (!followUp) return null;
                forcedCoverageFollowups += 1;
                this.ui.setAgentStage(container, 'act', 'active', `Coverage follow-up ${forcedCoverageFollowups}`);
                this.ui.addAgentTrace(container, 'act', `Coverage improvement request added one bounded evidence pass at iteration ${iteration}.`);
                this.emitEvent(runState, 'research.coverage_gap', {
                    iteration,
                    forcedFollowups: forcedCoverageFollowups,
                    newsBriefScope: plan.newsBriefScope || null,
                    unique_source_urls: runState.metrics.unique_source_urls,
                    evidence_items: runState.metrics.evidence_items
                }, { stage: 'act', visibility: 'history' });
                return { continue: true, message: followUp };
            },
            executeToolFn: async (name, args, toolCall = null) => {
                this.assertToolInput(name, args);
                const execution = await this.prepareToolExecution(runState, name, args, toolCall, container);
                this.assertToolInput(name, execution.args);
                const result = await this.registry.execute(name, execution.args);
                return this.capToolResultForModel(result, name);
            }
        });

        this.ui.setAgentStage(container, 'act', 'done', 'Tool loop complete');
        this.ui.setAgentStage(container, 'observe', 'done', 'Results summarized');
        this.ui.setAgentStage(container, 'synthesize', 'active', 'Final synthesis');
        this.emitEvent(runState, 'synthesis.started', {
            tool_calls: runState.metrics.tool_calls,
            evidence_items: runState.metrics.evidence_items
        }, { stage: 'synthesize', visibility: 'history' });
        /*
        this.ui.setAgentStage(container, 'act', 'done', '工具循环结束');
        this.ui.setAgentStage(container, 'observe', 'done', '结果已汇总');
        this.ui.setAgentStage(container, 'synthesize', 'active', '最终合成');

        */
        let normalizedFinalContentChanged = false;
        if (finalResponse) {
            const originalFinalContent = finalResponse.content || latestStreamedContent || '';
            const normalizedContent = this.normalizeFinalResearchAnswer(
                originalFinalContent,
                plan,
                runState
            );
            if (normalizedContent) {
                normalizedFinalContentChanged = normalizedContent !== originalFinalContent;
                finalResponse.content = normalizedContent;
                latestStreamedContent = normalizedContent;
            }
        }
        if (finalResponse?.content) {
            if (container.reasoningDetails.classList.contains('thinking-state')) {
                this.ui.finishReasoning(container);
            }
            if (!hasDisplayedContent || shouldReplayFinalContent || progressDisplayed) {
                await this.streamFinalContent(container, finalResponse.content);
                hasDisplayedContent = true;
                progressDisplayed = false;
                latestProgressContent = '';
                draftPlaceholderDisplayed = false;
                latestStreamedContent = finalResponse.content;
                this.notifyRunSnapshot(runState, 'content.updated', { content: latestStreamedContent });
            } else if (normalizedFinalContentChanged || finalResponse.content !== latestStreamedContent) {
                this.ui.updateContent(container, finalResponse.content);
                this.notifyRunSnapshot(runState, 'content.updated', { content: finalResponse.content || '' });
            }
        }

        this.ui.setAgentStage(container, 'synthesize', 'done', '完成');
        this.ui.addAgentTrace(container, 'synthesize', 'Final answer synthesized from the run state.');
        if (finalResponse) {
            finalResponse.reasoning_content = null;
            this.finalizeRunState(runState, finalResponse.content || latestStreamedContent || '');
            this.collaborationService?.finalize(runState);
            this.emitCollaborationCompleted(runState);
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

    getAgentEarthTargetCalls(plan = null) {
        if (this.agentProfiles) {
            return this.agentProfiles.getAgentEarthTargetCalls(plan);
        }
        const configured = Number(plan?.agentEarthTargetCalls || 0);
        if (configured > 0) return Math.min(10, Math.max(8, configured));
        if (Array.isArray(plan?.selectedTools) && plan.selectedTools.includes('agent_earth_run')) return 8;
        return 0;
    }

    buildEarlyAgentEarthToolCalls(plan, runState, userMessage, iteration, existingToolCalls = []) {
        if (!Array.isArray(plan?.selectedTools) || !plan.selectedTools.includes('agent_earth_run')) return [];
        const currentIteration = Number(iteration) || 0;
        if (currentIteration < 1 || currentIteration > 2) return [];
        const targetCalls = this.getAgentEarthTargetCalls(plan);
        if (targetCalls <= 0) return [];

        const existingCount = Array.isArray(runState?.toolCalls)
            ? runState.toolCalls.filter(call => call.name === 'agent_earth_run').length
            : 0;
        const pendingCount = Array.isArray(existingToolCalls)
            ? existingToolCalls.filter(call => call?.function?.name === 'agent_earth_run').length
            : 0;
        const remaining = Math.max(0, targetCalls - existingCount - pendingCount);
        if (remaining <= 0) return [];

        const perTurnLimit = currentIteration === 1 ? 6 : 4;
        const count = Math.min(remaining, perTurnLimit);
        const queries = this.buildEarlyAgentEarthQueries(userMessage, plan, count);
        return queries.map((query, index) => this.createInjectedToolCall('agent_earth_run', {
            query,
            task_context: '',
            max_attempts: 0
        }, `early-${currentIteration}-${index + 1}`));
    }

    buildEarlyAgentEarthQueries(userMessage, plan, count) {
        const task = String(userMessage || '').trim() || 'Research this user request with current external sources.';
        const profile = plan?.researchProfile || '';
        const broadNews = profile === 'news_brief';
        const baseQueries = broadNews
            ? [
                `${task}\nFocus: international and domestic top news, broad daily briefing evidence. Prefer AgentEarth tools for Reuters, Bloomberg, Google News, BrightData/news extraction, X/Twitter, YouTube, Facebook, Reddit, and other available news/social platforms when useful.`,
                `${task}\nFocus: finance, markets, business, economy, and policy signals. Prefer Reuters, Bloomberg, WSJ/CNBC, 财联社, Google News, Tushare/market-data, and other AgentEarth finance/news tools when useful.`,
                `${task}\nFocus: technology, science, health, climate, and education developments. Include Google News, Reuters/AP, official sources, Reddit/X/Twitter, YouTube, and specialist AgentEarth tools when useful.`,
                `${task}\nFocus: society, livelihood, sports, culture, and public-interest stories. Include Google News, YouTube, Facebook, Reddit, X/Twitter, and reputable media tools when useful.`,
                `${task}\nFocus: cross-check missing angles and source diversity for the final brief. Use all relevant AgentEarth news, social, data, and extraction tools without limiting to one candidate.`,
                `${task}\nFocus: reputable primary or high-authority sources with URLs. If normal foreign-source search is blocked or thin, fall back to AgentEarth platform tools repeatedly until useful candidates are exhausted.`
            ]
            : [
                `${task}\nFocus: current facts and authoritative sources. Use AgentEarth platform tools such as Google News, Reuters, Bloomberg, BrightData extraction, X/Twitter, Reddit, YouTube, Facebook, finance/data, and other relevant tools when available.`,
                `${task}\nFocus: specialist tools, data, reports, and comparisons. Let AgentEarth choose from all matching professional tools.`,
                `${task}\nFocus: primary sources, official pages, and verification. If ordinary web search fails, keep using AgentEarth alternatives.`,
                `${task}\nFocus: missing angles, risks, community or market signals across X/Twitter, Reddit, Facebook, YouTube, news wires, market-data, and other available sources.`,
                `${task}\nFocus: source diversity and citation-ready URLs from multiple platforms.`,
                `${task}\nFocus: concise evidence useful for final synthesis, not raw JSON.`
            ];
        return baseQueries.slice(0, Math.max(0, count));
    }

    createInjectedToolCall(name, args, suffix = '') {
        const idSuffix = suffix || Math.random().toString(16).slice(2, 8);
        return {
            id: `call_${Date.now().toString(36)}_${idSuffix}`,
            type: 'function',
            function: {
                name,
                arguments: JSON.stringify(args || {})
            }
        };
    }

    emitCollaborationReady(runState) {
        const collaboration = runState?.plan?.collaboration;
        if (!collaboration?.enabled) return;
        (collaboration.collaborators || []).forEach(collaborator => {
            this.collaborationService?.emitStage(this, runState, collaborator.id, 'active', {
                stage: 'route',
                status: 'ready',
                toolFocus: collaborator.toolFocus || []
            });
        });
        (collaboration.handoffs || []).slice(0, 8).forEach(handoff => {
            this.emitEvent(runState, 'collaboration.handoff', {
                from: handoff.from || '',
                to: handoff.to || '',
                reason: handoff.reason || ''
            }, { stage: 'route', visibility: 'history' });
        });
    }

    emitCollaborationCompleted(runState) {
        const collaboration = runState?.collaboration || runState?.plan?.collaboration;
        if (!collaboration?.enabled) return;
        this.emitEvent(runState, 'collaboration.completed', {
            strategy: collaboration.strategy || '',
            collaborator_count: collaboration.collaborators?.length || 0,
            status: collaboration.status || 'completed'
        }, { stage: 'synthesize', visibility: 'history' });
    }

    buildAgentProgressContent(progressLines = [], latestProgressContent = '') {
        const parts = [];
        const current = String(latestProgressContent || '').trim();
        if (current) parts.push(current);
        const lines = Array.isArray(progressLines) ? progressLines : [];
        lines.slice(-18).forEach(line => {
            const text = String(line || '').trim();
            if (text) parts.push(text);
        });
        return parts.join('\n');
    }

    extractToolIterationProgress(content, meta = {}) {
        const text = this.cleanToolProgressText(content);
        if (!text || this.isLikelyIntermediateDraft(text)) return '';
        if (meta?.phase === 'tool_iteration_stream' && text.length < 8) return '';
        return this.previewValue(text, 900);
    }

    isSuppressedIntermediateDraft(content) {
        const text = this.cleanToolProgressText(content);
        return Boolean(text && this.isLikelyIntermediateDraft(text));
    }

    getSuppressedDraftPlaceholder(plan = null) {
        if (plan?.mode === 'news_brief') {
            return '正在整理新闻材料，稍后输出完整简报。';
        }
        if (this.isResearchLikeMode(plan?.mode)) {
            return '正在整理资料，稍后输出完整正文。';
        }
        return '正在整理内容，稍后输出完整正文。';
    }

    cleanToolProgressText(content) {
        const text = String(content || '')
            .replace(/<\/?think>/gi, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return text
            .split('\n')
            .filter(line => !this.isToolLogProgressLine(line))
            .join('\n')
            .trim();
    }

    isToolLogProgressLine(line) {
        const value = String(line || '').trim();
        if (/^(Tool call|Tool completed|Tool failed|\u8c03\u7528\u5de5\u5177|\u5de5\u5177\u5b8c\u6210|\u5de5\u5177\u5931\u8d25)\s*[:\uff1a]/i.test(value)
            || /^\u8c03\u7528\u5de5\u5177\s*[:\uff1a]?\s*[a-z_]+\s*\{/i.test(value)
            || /^\u5de5\u5177\u5b8c\u6210\s*[:\uff1a]?\s*[a-z_]+/i.test(value)) {
            return true;
        }
        return /^(Tool call|Tool completed|Tool failed|调用工具|工具完成|工具失败)\s*[:：]/i.test(value)
            || /^调用工具\s*[:：]?\s*[a-z_]+\s*\{/i.test(value)
            || /^工具完成\s*[:：]?\s*[a-z_]+/i.test(value);
    }

    isLikelyIntermediateDraft(text) {
        const value = String(text || '').trim();
        if (!value) return false;
        const citationCount = (value.match(/\[\d+\]/g) || []).length;
        const headingCount = (value.match(/^#{1,4}\s+/gm) || []).length;
        const sourceLike = /(^|\n)\s*(来源|参考|引用|Sources|References)\s*[:：]?/i.test(value);
        const finalLike = /(最终答案|最终回答|总结如下|结论|综合来看|下面是|以下是)/i.test(value);
        const sourceLikeSafe = /(^|\n)\s*(\u6765\u6e90|\u53c2\u8003|\u5f15\u7528|Sources|References)\s*[:\uff1a]?/i.test(value);
        const finalLikeSafe = /(\u6700\u7ec8\u7b54\u6848|\u6700\u7ec8\u56de\u7b54|\u603b\u7ed3\u5982\u4e0b|\u7ed3\u8bba|\u7efc\u5408\u6765\u770b|\u4e0b\u9762\u662f|\u4ee5\u4e0b\u662f|final answer|summary|conclusion)/i.test(value);
        const synthesisLike = /(synthesize|synthesis|compile\s+(the\s+)?final|final\s+answer|proper\s+citations|well-structured|daily\s+news\s+briefing|news\s+briefing|\u5f00\u59cb\u5408\u6210|\u5f00\u59cb\u6574\u7406|\u5f00\u59cb\u5199|\u6570\u636e\u91cf\u591f|\u8d44\u6599\u591f|\u8bc1\u636e\u591f|\u7efc\u5408\u6210|\u6574\u7406\u6210|\u6700\u7ec8\u7b54\u6848|\u6b63\u5f0f\u56de\u7b54|\u65b0\u95fb\u7b80\u62a5|\u4eca\u65e5\u65b0\u95fb|\u65b0\u95fb\u665a\u62a5|\u65b0\u95fb\u901f\u62a5|\u8be6\u7ec6\u76d8\u70b9|\u4ee5\u4e0b\u662f\u5404)/i.test(value);
        const numberedLines = (value.match(/(^|\n)\s*\d+[.)]\s+/g) || []).length;
        if (synthesisLike) return true;
        if (headingCount >= 1 && value.length > 160) return true;
        if (numberedLines >= 2 && value.length > 220) return true;
        if (value.length > 1200) return true;
        if (value.length > 520 && (citationCount >= 3 || headingCount >= 2 || sourceLikeSafe || finalLikeSafe)) return true;
        return false;
    }

    formatToolCallProgress(toolCall) {
        return '';
    }

    formatToolResultProgress(runState, toolCallId, result, success = true) {
        return '';
    }

    safeParseToolArguments(value) {
        const text = String(value || '').trim();
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch (e) {
            return text;
        }
    }

    formatToolIterationContent(content, meta = {}) {
        const iteration = Number(meta.iteration) || 0;
        const hasToolCount = Array.isArray(meta.toolCalls);
        const toolCount = hasToolCount ? meta.toolCalls.length : 0;
        const note = hasToolCount ? `准备调用 ${toolCount} 个工具` : '正在分析并规划工具调用';
        const header = `研究进度（第 ${iteration || '?'} 轮，${note}）`;
        const body = String(content || '').trim();
        return body ? `${header}\n\n${body}` : header;
    }

    async streamFinalContent(container, content) {
        const text = String(content || '');
        if (!text) {
            this.ui.updateContent(container, '');
            return;
        }

        const frameCount = Math.min(72, Math.max(12, Math.ceil(text.length / 120)));
        const chunkSize = Math.max(48, Math.ceil(text.length / frameCount));
        for (let index = chunkSize; index < text.length; index += chunkSize) {
            this.ui.updateContent(container, text.slice(0, index));
            await new Promise(resolve => setTimeout(resolve, 8));
        }
        this.ui.updateContent(container, text);
    }

    normalizeFinalResearchAnswer(content, plan, runState = null) {
        // Citation/source-section mechanics live in AgentCitationNormalizer.
        // Keep AgentRuntime focused on run orchestration and shared evidence helpers.
        const input = this.normalizeFinalAnswerText(content);
        if (this.citationNormalizer) {
            return this.normalizeFinalAnswerText(this.citationNormalizer.normalizeFinalResearchAnswer(input, plan, runState));
        }
        const text = input;
        const hasEvidence = Array.isArray(runState?.evidenceLedger) && runState.evidenceLedger.length > 0;
        const hasSourceSection = this.hasSourceHeading(text);
        if (!text || (!this.isResearchLikeMode(plan?.mode) && !hasEvidence && !hasSourceSection)) return text;
        return this.normalizeFinalAnswerText(this.normalizeSourceSection(text, runState, plan));
    }

    normalizeFinalAnswerText(content) {
        const text = String(content || '');
        if (!text) return text;
        return text
            .split('\n')
            .map(line => this.normalizeSummaryHeadingLine(line))
            .join('\n');
    }

    normalizeSummaryHeadingLine(line) {
        const raw = String(line || '');
        if (!/一句话/.test(raw)) return raw;

        const heading = raw.match(/^(\s{0,3}#{1,6}\s+).*一句话.*$/u);
        if (heading) return `${heading[1]}总结`;

        const trimmed = raw.trim();
        if (/^\d+[.)、]\s+/.test(trimmed)) return raw;
        const labelish = /^(\*\*)?[^:：\n]{0,28}一句话[^:：\n]{0,28}(\*\*)?\s*[:：]/u.test(trimmed)
            || /^(\*\*)?[^:：\n]{0,28}一句话[^:：\n]{0,28}(\*\*)?$/u.test(trimmed)
            || /^[\-*+> ]{0,4}[^:：\n]{0,16}一句话[^:：\n]{0,16}\s*[:：]/u.test(trimmed);
        if (!labelish) return raw;

        const boldLabel = raw.match(/^(\s*(?:[-*+]\s+|>\s*)?)(\*\*)?[^:：\n]{0,40}一句话[^:：\n]{0,40}([:：])(\*\*)?\s*(.*)$/u);
        if (boldLabel) {
            const prefix = boldLabel[1] || '';
            const marker = boldLabel[2] || boldLabel[4] ? '**' : '';
            const suffix = boldLabel[5] ? ` ${boldLabel[5].replace(/^\*\*\s*/, '').trim()}` : '';
            return `${prefix}${marker}总结${boldLabel[3]}${marker}${suffix}`.trimEnd();
        }

        const plainLabel = raw.match(/^(\s*(?:[-*+]\s+|>\s*)?)(\*\*)?[^:：\n]{0,40}一句话[^:：\n]{0,40}(\*\*)?\s*$/u);
        if (plainLabel) {
            const prefix = plainLabel[1] || '';
            const marker = plainLabel[2] || plainLabel[3] ? '**' : '';
            return `${prefix}${marker}总结${marker}`.trimEnd();
        }

        const indent = raw.match(/^\s*/)?.[0] || '';
        const labelCandidate = raw.trim().replace(/^[^\p{L}\p{N}\u4e00-\u9fff]+/u, '');
        if (labelCandidate.length <= 40 && /一句话/.test(labelCandidate)) {
            return `${indent}总结`;
        }

        return raw;
    }

    normalizeSourceSection(text, runState = null, plan = null) {
        const value = String(text || '').trimEnd();
        const matches = Array.from(value.matchAll(this.sourceHeadingPattern()));
        if (!matches.length) return value;
        const sourcePolicyPlan = this.resolveSourcePolicyPlan(plan, runState, value);
        const academicMode = this.isAcademicResearchPlan(sourcePolicyPlan);

        const match = matches[matches.length - 1];
        const headingStart = match.index + (match[1] ? match[1].length : 0);
        const before = this.stripTrailingSourceSections(value.slice(0, headingStart));
        const sourceBlock = value.slice(headingStart);
        const heading = this.matchSourceHeadingAtStart(sourceBlock);
        if (!heading) return value;

        const rawSources = sourceBlock.slice(heading[0].length).trim();
        const sourceMatches = Array.from(rawSources.matchAll(/\[(\d+)\]\s*([\s\S]*?)(?=\s*\[\d+\]\s*|$)/g));
        if (!sourceMatches.length) return value;

        const rawSourceMap = new Map();
        sourceMatches.forEach(item => {
            const id = String(item[1]);
            const body = this.cleanSourceEntryText(item[2]);
            if (body && !rawSourceMap.has(id)) rawSourceMap.set(id, body);
        });
        const evidenceIndex = this.buildEvidenceSourceIndex(runState?.evidenceLedger || [], sourcePolicyPlan);
        const evidenceCatalog = this.buildEvidenceCitationCatalog(runState?.evidenceLedger || [], sourcePolicyPlan);
        const enriched = this.enrichCitationSpecificity(before, rawSourceMap, evidenceIndex, evidenceCatalog, sourcePolicyPlan);
        enriched.extraSources.forEach((body, id) => {
            if (body && !rawSourceMap.has(id)) rawSourceMap.set(id, body);
        });
        const bodyForCitations = enriched.text || before;
        const citedIds = this.extractCitationMarkers(bodyForCitations);
        const rawSourceIds = sourceMatches.map(item => String(item[1]));
        const preservableRawSourceIds = citedIds.length
            ? rawSourceIds.filter(id => this.citationNormalizer?.shouldPreserveRawSourceEntry
                ? this.citationNormalizer.shouldPreserveRawSourceEntry(rawSourceMap.get(id), sourcePolicyPlan)
                : true)
            : rawSourceIds;
        const sourceOrder = citedIds.length
            ? Array.from(new Set([...citedIds, ...preservableRawSourceIds]))
            : preservableRawSourceIds;

        const idMap = new Map();
        const droppedIds = new Set();
        const seenEntries = new Map();
        const entries = [];
        sourceOrder.forEach(oldId => {
            const body = this.buildDetailedSourceBody(oldId, rawSourceMap, evidenceIndex, sourcePolicyPlan);
            if (!body) {
                droppedIds.add(String(oldId));
                return;
            }
            if (academicMode && !this.isAllowedAcademicSourceBody(body)) {
                droppedIds.add(String(oldId));
                return;
            }
            const dedupeKey = body.toLowerCase();
            if (seenEntries.has(dedupeKey)) {
                if (!idMap.has(oldId)) idMap.set(oldId, seenEntries.get(dedupeKey));
                return;
            }
            const newId = String(entries.length + 1);
            if (!idMap.has(oldId)) idMap.set(oldId, newId);
            seenEntries.set(dedupeKey, newId);
            entries.push({ oldId, newId, body });
        });
        if (!entries.length) {
            const cleanedBodyWithoutMarkers = this.cleanRepeatedCitationMarkers(this.stripCitationMarkers(bodyForCitations)).trimEnd();
            if (academicMode) {
                return `${cleanedBodyWithoutMarkers}\n\n来源：\n未找到可用于学术引用的论文级来源。`;
            }
            return `${cleanedBodyWithoutMarkers}\n\n来源：\n未找到可用的来源详情。`;
        }

        const normalizedBody = this.replaceCitationGroups(bodyForCitations, id => {
            if (droppedIds.has(id)) return '';
            return idMap.has(id) ? idMap.get(id) : id;
        });
        const cleanedBody = this.cleanRepeatedCitationMarkers(normalizedBody);
        const sourceLines = entries.map(entry => `[${entry.newId}] ${entry.body}`);
        return `${cleanedBody}\n\n来源：\n${sourceLines.join('\n')}`;
    }

    sourceHeadingPattern() {
        return /(^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(来源|参考|Sources|References)\s*(?:\*\*)?\s*[:：]?\s*(?:\*\*)?\s*(?=\n|$)/gi;
    }

    matchSourceHeadingAtStart(value) {
        return String(value || '').match(/^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(来源|参考|Sources|References)\s*(?:\*\*)?\s*[:：]?\s*(?:\*\*)?\s*/i);
    }

    hasSourceHeading(value) {
        return this.sourceHeadingPattern().test(String(value || ''));
    }

    stripTrailingSourceSections(value) {
        let body = String(value || '').trimEnd();
        while (body) {
            const matches = Array.from(body.matchAll(this.sourceHeadingPattern()));
            if (!matches.length) return body;
            const match = matches[matches.length - 1];
            const headingStart = match.index + (match[1] ? match[1].length : 0);
            const trailing = body.slice(headingStart);
            if (!this.looksLikeSourceSection(trailing)) return body;
            body = body.slice(0, headingStart).trimEnd();
        }
        return body;
    }

    looksLikeSourceSection(value) {
        const heading = this.matchSourceHeadingAtStart(value);
        const body = heading ? String(value || '').slice(heading[0].length).trim() : String(value || '').trim();
        if (!body) return true;
        const sourceLikeLines = body
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .filter(line => /\[\d+\]|https?:\/\/|agentearth\.ai|[\u2014-]{2,}/i.test(line));
        return sourceLikeLines.length >= 2 || /https?:\/\/|\[\d+\]/.test(body);
    }

    enrichCitationSpecificity(body, rawSourceMap, evidenceIndex, evidenceCatalog, plan = null) {
        const text = String(body || '');
        const catalog = Array.isArray(evidenceCatalog) ? evidenceCatalog : [];
        if (!text || catalog.length === 0) {
            return { text, extraSources: new Map() };
        }

        const citationCounts = this.countCitationMarkers(text);
        const extraSources = new Map();
        const usedEvidenceKeys = new Set();
        let nextSourceId = this.getNextCitationSourceId(rawSourceMap, evidenceIndex);

        const lines = text.split('\n').map(line => {
            const ids = this.extractCitationMarkers(line);
            if (!ids.length) return line;
            const improvementIds = ids.filter(id => this.shouldImproveCitationSource(id, citationCounts, rawSourceMap, evidenceIndex, plan));
            if (!improvementIds.length) return line;

            const claimText = this.stripCitationMarkers(line);
            const missingSource = improvementIds.some(id => this.isMissingCitationSource(id, rawSourceMap, evidenceIndex));
            const targetMatches = Math.min(3, Math.max(1, improvementIds.length));
            const matches = this.findBestEvidenceMatchesForClaim(claimText, catalog, usedEvidenceKeys, targetMatches);
            const minScore = missingSource ? 5 : 8;
            const replacementIds = [];
            matches.forEach(match => {
                if (!match || match.score < minScore) return;
                const sourceBody = this.formatEvidenceSource(match.entry);
                if (!sourceBody) return;
                const sourceId = String(nextSourceId++);
                extraSources.set(sourceId, sourceBody);
                usedEvidenceKeys.add(this.getEvidenceCandidateKey(match.entry));
                replacementIds.push(sourceId);
            });
            if (!replacementIds.length) return line;
            const retainedIds = ids.filter(id => !improvementIds.includes(id)
                && this.buildDetailedSourceBody(id, rawSourceMap, evidenceIndex, plan));
            const replacement = [...retainedIds, ...replacementIds].map(id => `[${id}]`).join(' ');

            const trailingCitationPattern = /(?:\s*\[(?:\d+\s*(?:[,，]\s*\d+\s*)*)\])+\s*$/;
            if (trailingCitationPattern.test(line)) {
                return line.replace(trailingCitationPattern, ` ${replacement}`);
            }
            return `${line} ${replacement}`;
        });

        return { text: lines.join('\n'), extraSources };
    }

    countCitationMarkers(text) {
        const counts = new Map();
        this.extractCitationMarkersWithDuplicates(text).forEach(id => {
            counts.set(id, (counts.get(id) || 0) + 1);
        });
        return counts;
    }

    extractCitationMarkersWithDuplicates(text) {
        const markers = [];
        Array.from(String(text || '').matchAll(/\[((?:\d+\s*(?:[,，]\s*\d+\s*)*))\]/g)).forEach(match => {
            this.parseCitationGroup(match[1]).forEach(id => markers.push(id));
        });
        return markers;
    }

    parseCitationGroup(value) {
        return String(value || '')
            .split(/[,，]/)
            .map(item => item.trim())
            .filter(item => /^\d+$/.test(item));
    }

    stripCitationMarkers(value) {
        return String(value || '').replace(/\[((?:\d+\s*(?:[,，]\s*\d+\s*)*))\]/g, ' ');
    }

    replaceCitationGroups(value, mapper) {
        return String(value || '').replace(/\[((?:\d+\s*(?:[,，]\s*\d+\s*)*))\]/g, (marker, group) => {
            const mapped = this.parseCitationGroup(group)
                .map(id => mapper(id))
                .filter(Boolean);
            return mapped.length ? `[${mapped.join(',')}]` : '';
        });
    }

    getNextCitationSourceId(rawSourceMap, evidenceIndex) {
        const ids = [
            ...Array.from(rawSourceMap?.keys?.() || []),
            ...Array.from(evidenceIndex?.keys?.() || [])
        ]
            .map(id => Number(id))
            .filter(id => Number.isFinite(id));
        return Math.max(1000, ...ids) + 1;
    }

    shouldImproveCitationSource(sourceId, citationCounts, rawSourceMap, evidenceIndex, plan = null) {
        const id = String(sourceId);
        const repeated = (citationCounts.get(id) || 0) >= 3;
        if (this.isMissingCitationSource(id, rawSourceMap, evidenceIndex)) return true;
        const body = this.buildDetailedSourceBody(id, rawSourceMap, evidenceIndex, plan);
        if (!body) return true;
        return repeated
            || this.isFallbackSourceReference(body)
            || this.isGenericSourceReference(body)
            || (this.isAcademicResearchPlan(plan) && !this.isAllowedAcademicSourceBody(body));
    }

    isMissingCitationSource(sourceId, rawSourceMap, evidenceIndex) {
        const id = String(sourceId);
        return !rawSourceMap?.has?.(id) && !evidenceIndex?.has?.(id);
    }

    isFallbackSourceReference(body) {
        const text = this.cleanOneLine(body || '').toLowerCase();
        return /工具来源\s*id|详情未返回|details?\s+not\s+returned|missing\s+source|source\s+id\s+\d+/i.test(text);
    }

    isGenericSourceReference(body) {
        const text = this.cleanOneLine(body || '').toLowerCase();
        if (!text) return true;
        return /general index page|no specific article url returned|\/news\/?$|\/news\/world\/?$|news\.sina\.com\.cn\/?$|news\.163\.com\/latest\/?$|people\.com\.cn\/?$|nbd\.com\.cn\/?$/i.test(text)
            || /^(bbc news|bbc world|reuters|ap news|associated press|guardian|cnbc|sina news|netease news|source|sources|references|来源|参考)/i.test(text);
    }

    resolveSourcePolicyPlan(plan = null, runState = null, finalText = '') {
        const basePlan = plan || runState?.plan || null;
        if (this.isNewsBriefPlan(basePlan)) {
            if (basePlan?.researchProfile === 'academic' || basePlan?.inferredResearchProfile === 'academic') {
                const { inferredResearchProfile, ...rest } = basePlan || {};
                return { ...rest, researchProfile: 'news_brief' };
            }
            return basePlan;
        }
        if (basePlan?.researchProfile === 'industry') return basePlan;
        if (this.isAcademicResearchPlan(basePlan)) return basePlan;
        const evidence = Array.isArray(runState?.evidenceLedger) ? runState.evidenceLedger : [];
        const usableEvidence = evidence.filter(entry => entry && !entry.error && (entry.title || entry.url));
        const academicEvidenceCount = evidence.filter(entry => this.isAllowedAcademicEvidence(entry)).length;
        const academicEvidenceDominant = academicEvidenceCount >= 4
            && academicEvidenceCount >= Math.ceil(Math.max(usableEvidence.length, 1) * 0.65);
        if ((this.hasAcademicCitationSignal(finalText) && academicEvidenceCount >= 2) || academicEvidenceDominant) {
            return { ...(basePlan || {}), researchProfile: 'academic', inferredResearchProfile: 'academic' };
        }
        return basePlan;
    }

    isAcademicResearchPlan(plan = null) {
        return plan?.researchProfile === 'academic' || plan?.inferredResearchProfile === 'academic';
    }

    hasAcademicCitationSignal(value) {
        const text = String(value || '');
        return /(学术|论文|期刊|会议|同行评审|正式发表|文献综述|只要论文|不要新闻|非新闻|academic|literature\s+review|peer[-\s]?reviewed|journal\s+article|conference\s+paper|conference\s+proceedings|formal\s+publication|published\s+paper|research\s+paper)/i.test(text);
    }

    isAllowedAcademicEvidence(entry) {
        if (!entry || entry.error) return false;
        const title = this.cleanOneLine(entry.title || '');
        const url = this.cleanUrl(entry.url || '');
        const snippet = this.cleanOneLine(entry.snippet || entry.content_preview || '');
        const combined = `${title} ${url} ${snippet}`;
        if (!title && !url) return false;
        if (this.isFailedAcademicReadText(combined)) return false;
        if (this.isDisallowedAcademicMediaSource(combined)) return false;
        if (url) return this.isAcademicSourceUrl(url, title);
        if (/\b(arxiv|doi|pubmed|pmid|journal|proceedings|conference|preprint|paper|publication|nature|science|ieee|acm|optica|osa|springer|elsevier|sciencedirect|wiley|frontiers|plos|cell|lancet|nejm|bmj)\b/i.test(combined)) {
            return true;
        }
        return /\.(edu|gov)(\/|$)/i.test(url) || /\.ac\.[a-z]{2,}(\/|$)/i.test(url);
    }

    isAllowedAcademicSourceBody(body) {
        const text = this.cleanOneLine(body || '');
        if (!text) return false;
        if (this.isFailedAcademicReadText(text)) return false;
        if (this.isDisallowedAcademicMediaSource(text)) return false;
        const url = this.extractFirstUrlFromText(text);
        if (url) return this.isAcademicSourceUrl(url, text);
        return /\b(arxiv|doi|pubmed|pmid|journal|proceedings|conference|preprint|paper|publication|nature|science|ieee|acm|optica|osa|springer|elsevier|sciencedirect|wiley|frontiers|plos|cell|lancet|nejm|bmj)\b/i.test(text);
    }

    isAcademicSourceUrl(url, title = '') {
        const cleanUrl = this.cleanUrl(url || '');
        const cleanTitle = this.cleanOneLine(title || '').toLowerCase();
        if (!cleanUrl) return false;
        let parsed = null;
        try {
            parsed = new URL(/^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`);
        } catch (e) {
            return false;
        }
        const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
        const path = parsed.pathname.toLowerCase();
        if (this.isDisallowedAcademicMediaSource(`${host}${path} ${cleanTitle}`)) return false;
        if (host === 'arxiv.org') return /^\/(abs|pdf)\//.test(path);
        if (host === 'doi.org' || host.endsWith('.doi.org')) return path.length > 1;
        if (host === 'pubmed.ncbi.nlm.nih.gov') return /^\/\d+/.test(path);
        if (host === 'dl.acm.org') return /^\/doi\//.test(path);
        if (host === 'ieeexplore.ieee.org') return /^\/(document|abstract)\//.test(path);
        if (host === 'science.org') return /^\/doi\//.test(path);
        if (host.endsWith('nature.com')) return /^\/articles\//.test(path);
        if (host === 'link.springer.com') return /^\/(article|chapter|book)\//.test(path);
        if (host.endsWith('sciencedirect.com')) return /^\/science\/article\//.test(path);
        if (host.endsWith('wiley.com')) return /\/doi\//.test(path);
        if (host.endsWith('tandfonline.com')) return /\/doi\//.test(path);
        if (host.endsWith('optica.org') || host.endsWith('osa.org')) return /\/(abstract|articles|doi|fulltext)\//.test(path) || /doi|abstract|article/.test(cleanTitle);
        if (/(frontiersin\.org|plos\.org|cell\.com|thelancet\.com|nejm\.org|bmj\.com|mdpi\.com)$/.test(host)) return path.length > 1;
        if (/\.(edu|gov)$/.test(host) || /\.ac\.[a-z]{2,}$/.test(host)) return path.length > 1;
        return false;
    }

    isDisallowedAcademicMediaSource(value) {
        const text = String(value || '').toLowerCase();
        return /(bbc\.com|reuters\.com|apnews\.com|cnbc\.com|theguardian\.com|cnn\.com|nytimes\.com|washingtonpost\.com|bloomberg\.com|forbes\.com|news\.sina\.com\.cn|news\.163\.com|people\.com\.cn|nbd\.com\.cn|paperswithcode\.com|huggingface\.co|medium\.com|substack\.com)/i.test(text);
    }

    isFailedAcademicReadText(value) {
        const text = String(value || '').toLowerCase();
        return /(\u672a\u627e\u5230|\u8bf7\u5c1d\u8bd5\u66f4\u6362\u5173\u952e\u8bcd|no relevant|not relevant|not found|no matching|focus_keyword|focus_k)/i.test(text);
    }

    extractFirstUrlFromText(value) {
        const text = String(value || '');
        const fullUrl = (text.match(/https?:\/\/[^\s"'<>]+/i) || [])[0];
        if (fullUrl) return fullUrl;
        const domain = (text.match(/\b(?:[a-z0-9-]+\.)+(?:com|org|net|edu|gov|io|ai|cn|uk|de|jp|fr|au|ca)(?:\/[^\s"'<>]*)?/i) || [])[0];
        return domain || '';
    }

    buildEvidenceCitationCatalog(evidence = [], plan = null) {
        const academicMode = this.isAcademicResearchPlan(plan);
        const industryMode = plan?.researchProfile === 'industry';
        const byKey = new Map();
        (Array.isArray(evidence) ? evidence : [])
            .filter(entry => entry && !entry.error && (entry.title || entry.url))
            .filter(entry => !academicMode || this.isAllowedAcademicEvidence(entry))
            .filter(entry => this.isUsableFinalCitationEvidence(entry, { academicMode, industryMode, plan }))
            .filter(entry => !this.isGenericSourceHomepage(entry.title || '', entry.url || ''))
            .forEach(entry => {
                const candidate = { ...entry, _candidateKey: this.getEvidenceCandidateKey(entry) };
                if (!candidate._candidateKey) return;
                const existing = byKey.get(candidate._candidateKey);
                if (!existing || this.scoreEvidenceSource(candidate) > this.scoreEvidenceSource(existing)) {
                    byKey.set(candidate._candidateKey, this.mergeEvidenceCitationEntries(candidate, existing));
                } else {
                    byKey.set(candidate._candidateKey, this.mergeEvidenceCitationEntries(existing, candidate));
                }
            });
        return Array.from(byKey.values())
            .sort((a, b) => this.scoreEvidenceSource(b) - this.scoreEvidenceSource(a))
            .slice(0, 80);
    }

    isUsableFinalCitationEvidence(entry = {}, options = {}) {
        if (!entry || entry.error) return false;
        const kind = String(entry.kind || '');
        const trust = String(entry.trustLevel || 'unknown');
        const sourceType = String(entry.sourceType || 'unknown');
        if (['page_read_error', 'source_read_error'].includes(kind)) return false;
        if (this.isNewsBriefPlan(options.plan) && entry.url && this.isLowValueNewsCitationUrl(entry.url || '', entry.title || '')) {
            return false;
        }
        if (kind === 'raw_url_reference') {
            return this.isNewsBriefPlan(options.plan)
                && entry.tool === 'news_query'
                && Boolean(entry.url)
                && ['medium', 'high', 'primary'].includes(trust)
                && !this.isGenericSourceHomepage(entry.title || '', entry.url || '');
        }
        if (kind === 'news_result') {
            return this.isNewsBriefPlan(options.plan)
                && Boolean(entry.url)
                && !['low', 'unknown'].includes(trust)
                && !this.isGenericSourceHomepage(entry.title || '', entry.url || '');
        }
        if (['source_candidate', 'search_result'].includes(kind)) {
            const strongCandidate = this.isStrongStableCitationCandidate(entry);
            return strongCandidate && (Boolean(options.industryMode) || Boolean(options.academicMode));
        }
        if (['low', 'unknown'].includes(trust) && Number(entry.authorityScore || 0) < 0.55) return false;
        if (!options.academicMode && sourceType === 'encyclopedia') return false;
        return true;
    }

    isLowValueNewsCitationUrl(url = '', title = '') {
        const cleanUrl = this.cleanUrl(url || '').toLowerCase();
        const cleanTitle = this.cleanOneLine(title || '').toLowerCase();
        if (!cleanUrl) return true;
        if (/(dictionary|translate|word|lingoland|iciba|runoob|csdn|zhihu\.com\/topic|baike|wikipedia|extendoffice|excel[-_\s]?today|today\s+function|how\s+to\s+use\s+today)/i.test(`${cleanUrl} ${cleanTitle}`)) {
            return true;
        }
        try {
            const parsed = new URL(cleanUrl);
            const host = parsed.hostname.replace(/^www\./i, '');
            const path = parsed.pathname.replace(/\/+$/, '');
            const sectionOnly = path === ''
                || /^\/(news|world|business|markets|technology|tech|china|international|latest|politics|finance|economy|sports|culture)$/i.test(path);
            const trustedNewsSection = /(reuters\.com|apnews\.com|bbc\.com|bloomberg\.com|wsj\.com|ft\.com|nytimes\.com|theguardian\.com|cnbc\.com|npr\.org|economist\.com|caixin\.com|chinanews\.com|news\.cn|xinhuanet\.com|people\.com\.cn|news\.163\.com|cctv\.com|tv\.cctv\.com)$/i.test(host);
            const officialSection = /(home\.treasury\.gov|gov\.cn|ndrc\.gov\.cn|mof\.gov\.cn|pbc\.gov\.cn|csrc\.gov\.cn)$/i.test(host);
            if (sectionOnly && !trustedNewsSection && !officialSection) {
                return true;
            }
        } catch (error) {
            return false;
        }
        return false;
    }

    isStrongStableCitationCandidate(entry = {}) {
        if (!entry || entry.error || !entry.url) return false;
        if (this.isGenericSourceHomepage(entry.title || '', entry.url || '')) return false;
        const url = this.cleanUrl(entry.url || '').toLowerCase();
        const authority = Number(entry.authorityScore || 0);
        if (authority >= 0.72) return true;
        return /(?:pubmed\.ncbi\.nlm\.nih\.gov\/\d+|arxiv\.org\/abs\/[0-9]{4}\.[0-9]{4,5}|doi\.org\/10\.|nature\.com\/articles\/|science\.org\/doi\/|dl\.acm\.org\/doi\/|ieeexplore\.ieee\.org\/(?:document|abstract)\/|github\.com\/[^/]+\/[^/]+|docs\.|developer\.|\.gov\/|\.edu\/)/i.test(url);
    }

    mergeEvidenceCitationEntries(primary, secondary) {
        if (!secondary) return primary;
        const merged = { ...primary };
        const snippets = [primary?.snippet, primary?.content_preview, secondary?.snippet, secondary?.content_preview]
            .map(value => this.cleanOneLine(value || ''))
            .filter(Boolean);
        const uniqueSnippets = [];
        snippets.forEach(snippet => {
            const duplicate = uniqueSnippets.some(item => item.includes(snippet) || snippet.includes(item));
            if (!duplicate) uniqueSnippets.push(snippet);
        });
        if (!merged.snippet && secondary?.snippet) merged.snippet = secondary.snippet;
        if (uniqueSnippets.length) {
            merged.content_preview = this.previewValue(uniqueSnippets.join(' ... '), 1800);
        }
        return merged;
    }

    getEvidenceCandidateKey(entry) {
        return this.normalizeCitationUrl(entry?.url || '')
            || this.normalizeCitationTitle(entry?.title || '')
            || String(entry?.id || entry?.source_id || '');
    }

    findBestEvidenceForClaim(claimText, catalog, usedEvidenceKeys = new Set()) {
        const claim = this.cleanClaimForCitationMatch(claimText);
        if (!claim) return null;
        let best = null;
        catalog.forEach(entry => {
            const key = this.getEvidenceCandidateKey(entry);
            const score = this.scoreEvidenceClaimMatch(claim, entry) - (usedEvidenceKeys.has(key) ? 3 : 0);
            if (!best || score > best.score) {
                best = { entry, score };
            }
        });
        return best;
    }

    findBestEvidenceMatchesForClaim(claimText, catalog, usedEvidenceKeys = new Set(), limit = 1) {
        const claim = this.cleanClaimForCitationMatch(claimText);
        if (!claim) return [];
        return (Array.isArray(catalog) ? catalog : [])
            .map(entry => {
                const key = this.getEvidenceCandidateKey(entry);
                return {
                    entry,
                    key,
                    score: this.scoreEvidenceClaimMatch(claim, entry) - (usedEvidenceKeys.has(key) ? 3 : 0)
                };
            })
            .filter(item => item.key)
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.max(1, limit));
    }

    cleanClaimForCitationMatch(value) {
        return this.cleanOneLine(value || '')
            .replace(/^#+\s*/, '')
            .replace(/^\s*[\d一二三四五六七八九十]+[.)、\s-]+/, '')
            .replace(/\[((?:\d+\s*(?:[,，]\s*\d+\s*)*))\]/g, ' ')
            .trim();
    }

    scoreEvidenceClaimMatch(claimText, entry) {
        const claimNorm = this.normalizeCitationMatchText(claimText);
        const title = this.cleanOneLine(entry?.title || '');
        const snippet = this.cleanOneLine(entry?.snippet || entry?.content_preview || '');
        const titleNorm = this.normalizeCitationMatchText(title);
        const snippetNorm = this.normalizeCitationMatchText(snippet);
        if (!claimNorm || (!titleNorm && !snippetNorm)) return 0;

        let score = 0;
        if (titleNorm && (claimNorm.includes(titleNorm) || titleNorm.includes(claimNorm))) score += 14;
        const claimTokens = this.tokenizeCitationMatchText(claimText);
        const titleTokens = this.tokenizeCitationMatchText(title);
        const snippetTokens = this.tokenizeCitationMatchText(snippet);
        titleTokens.forEach(token => {
            if (claimTokens.has(token)) score += token.length >= 4 ? 4 : 2;
        });
        snippetTokens.forEach(token => {
            if (claimTokens.has(token)) score += 1;
        });
        if (entry?.url) score += 1;
        if (['opened_source', 'opened_page', 'community_snapshot_item'].includes(entry?.kind)) score += 2;
        if (this.isGenericSourceHomepage(title, entry?.url || '')) score -= 8;
        return score;
    }

    normalizeCitationMatchText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/https?:\/\/\S+/g, ' ')
            .replace(/[^\p{L}\p{N}\u4e00-\u9fff]+/gu, '')
            .trim();
    }

    tokenizeCitationMatchText(value) {
        const text = String(value || '').toLowerCase();
        const tokens = new Set();
        (text.match(/[a-z0-9][a-z0-9_-]{2,}/g) || []).forEach(token => tokens.add(token));
        (text.match(/[\u4e00-\u9fff]{2,}/g) || []).forEach(chunk => {
            if (chunk.length <= 8) {
                tokens.add(chunk);
            }
            for (let size = 2; size <= Math.min(4, chunk.length); size += 1) {
                for (let index = 0; index <= chunk.length - size; index += 1) {
                    tokens.add(chunk.slice(index, index + size));
                }
            }
        });
        return tokens;
    }

    buildDetailedSourceBody(sourceId, rawSourceMap, evidenceIndex, plan = null) {
        const body = rawSourceMap.get(String(sourceId));
        if (this.isAcademicResearchPlan(plan) && body && !this.isAllowedAcademicSourceBody(body)) return '';
        if (body) return body;
        const evidence = evidenceIndex.get(String(sourceId));
        if (evidence) return this.formatEvidenceSource(evidence);
        return '';
    }

    buildEvidenceSourceIndex(evidence = [], plan = null) {
        const academicMode = this.isAcademicResearchPlan(plan);
        const buckets = new Map();
        (Array.isArray(evidence) ? evidence : []).forEach(entry => {
            if (academicMode && !this.isAllowedAcademicEvidence(entry)) return;
            const sourceId = String(entry?.source_id ?? '').trim();
            if (!sourceId) return;
            if (!entry?.title && !entry?.url) return;
            this.pushMapValue(buckets, sourceId, entry);
        });
        const index = new Map();
        buckets.forEach((entries, sourceId) => {
            const byCandidate = new Map();
            entries.forEach(entry => {
                const key = this.getEvidenceCandidateKey(entry);
                if (!key) return;
                const existing = byCandidate.get(key);
                if (!existing || this.scoreEvidenceSource(entry) > this.scoreEvidenceSource(existing)) {
                    byCandidate.set(key, entry);
                }
            });
            const candidates = Array.from(byCandidate.values());
            if (candidates.length !== 1) return;
            index.set(sourceId, candidates[0]);
        });
        return index;
    }

    scoreEvidenceSource(entry) {
        if (this.evidenceLedgerService) {
            return this.evidenceLedgerService.scoreSource(entry);
        }
        let score = 0;
        if (entry?.url) score += 4;
        if (entry?.title) score += 3;
        if (entry?.snippet || entry?.content_preview) score += 1;
        if (['opened_source', 'opened_page'].includes(entry?.kind)) score += 4;
        if (entry?.error) score -= 8;
        return score;
    }

    formatEvidenceSource(entry) {
        const rawTitle = this.cleanOneLine(entry?.title || '');
        const rawSnippet = this.cleanOneLine(entry?.snippet || entry?.content_preview || '');
        const title = this.cleanEvidenceSourceTitle(rawTitle, rawSnippet);
        const snippet = this.cleanEvidenceSourceSnippet(rawSnippet, title);
        const stableRef = this.extractStableSourceReference(entry, `${rawTitle} ${rawSnippet}`);
        const rawUrl = this.cleanUrl(entry?.url || '');
        const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : (stableRef.url || rawUrl);
        const host = this.extractHostname(url);
        const siteLabel = this.getSourceSiteLabel(entry, host, stableRef);
        const parts = [];
        const sourceLabel = siteLabel || host;

        if (sourceLabel) {
            parts.push(sourceLabel);
        }
        if (title && !this.sourceLabelContainsHost(title, sourceLabel) && !this.sourceLabelContainsHost(title, host)) {
            parts.push(title);
        } else if (title && !parts.length) {
            parts.push(title);
        }

        if (url) parts.push(url);
        else if (stableRef.label) parts.push(stableRef.label);
        else if (entry?.community) parts.push(`${entry.community} tool snapshot`);
        else if (entry?.kind === 'external_tool_result') parts.push('AgentEarth 工具快照');

        if (!url && entry?.kind === 'external_tool_result' && snippet) {
            parts.push(this.parentheticalSourceNote(snippet, 90));
        }

        return this.dedupeSourceParts(parts).join(' — ');
    }

    cleanEvidenceSourceTitle(title = '', snippet = '') {
        let clean = this.cleanOneLine(title || '')
            .replace(/\s*\[preview truncated\]\s*$/i, '')
            .replace(/^\s*(title|标题)\s*[:：]\s*/i, '')
            .replace(/\s+(?:内容|Content)\s*[:：][\s\S]*$/i, '')
            .replace(/^#+\s*/, '')
            .replace(/\s+\|\s*(Nature|Science|BBC News|Reuters|AP News|GitHub|PubMed|arXiv)\s*$/i, '')
            .replace(/\s+[-—]\s*(Nature|Science|BBC News|Reuters|AP News|GitHub|PubMed|arXiv)\s*$/i, '')
            .trim();
        const extracted = this.extractTitleFromEvidenceText(snippet);
        if (!clean
            || /^(source|sources|reference|references|来源|参考)$/i.test(clean)
            || /^(pmid|arxiv|doi)\s*[:：]?\s*[\w./-]+$/i.test(clean)
            || /\.\.\.|preview truncated/i.test(clean)) {
            clean = extracted || clean;
        }
        return this.compactSourceTitle(this.cleanOneLine(clean)
            .replace(/\s*\|\s*(?:Nature(?:\s+Photonics)?|Science|BBC News|Reuters|AP News|GitHub|PubMed|arXiv)\s*$/i, '')
            .replace(/\s*\[preview truncated\]\s*$/i, '')
            .trim());
    }

    extractTitleFromEvidenceText(value = '') {
        const text = String(value || '');
        const explicit = text.match(/(?:^|\n|\.\.\.)\s*(?:Title|标题)\s*[:：]\s*([^\n.。]+)/i);
        if (explicit?.[1]) return this.cleanExtractedSourceTitle(explicit[1]);
        const heading = text.match(/(?:^|\n|\.\.\.)\s*#{1,6}\s*([^\n.]+)/);
        if (heading?.[1]) return this.cleanExtractedSourceTitle(heading[1]);
        const markdownLink = text.match(/\[([^\]]{8,180})\]\((https?:\/\/[^)]+)\)/);
        if (markdownLink?.[1]) return this.cleanExtractedSourceTitle(markdownLink[1]);
        const fallback = text
            .replace(/\s*\[preview truncated\]\s*/ig, ' ')
            .replace(/\b(?:pmid|arxiv|doi)\s*[:：]?\s*(?:10\.\d{4,9}\/[^\s"'<>）)]+|[0-9]{4}\.[0-9]{4,5}(?:v\d+)?|\d{5,10})\b/ig, ' ')
            .replace(/https?:\/\/\S+/ig, ' ')
            .replace(/\.\.\./g, '\n')
            .split(/\n|[。.!?]\s+/)
            .map(line => this.cleanExtractedSourceTitle(line))
            .find(line => line.length >= 12);
        return fallback || '';
    }

    cleanExtractedSourceTitle(value = '') {
        return this.compactSourceTitle(this.cleanOneLine(value || '')
            .replace(/^[-*•#\s]+/, '')
            .replace(/\s*\[preview truncated\]\s*/ig, ' ')
            .replace(/\s+(?:内容|Content)\s*[:：][\s\S]*$/i, '')
            .replace(/\s+\|\s*(?:Nature(?:\s+Photonics)?|Science|BBC News|Reuters|AP News|GitHub|PubMed|arXiv)\s*$/i, '')
            .replace(/\s+[-—]\s*(?:Nature(?:\s+Photonics)?|Science|BBC News|Reuters|AP News|GitHub|PubMed|arXiv)\s*$/i, '')
            .replace(/\s{2,}/g, ' ')
            .trim());
    }

    compactSourceTitle(value = '', maxLength = 110) {
        let clean = this.cleanOneLine(value || '')
            .replace(/\s+(?:内容|Content)\s*[:：][\s\S]*$/i, '')
            .replace(/\s*[|｜]\s*.*$/u, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (this.isMojibakeText(clean)) return '';
        if (clean.length <= maxLength) return clean;
        const clipped = clean.slice(0, maxLength);
        const boundary = clipped.replace(/[，,。；;：:、\s_-][^，,。；;：:、\s_-]*$/u, '').trim();
        return (boundary.length >= 24 ? boundary : clipped.trim()).replace(/[，,。；;：:、_-]+$/u, '').trim();
    }

    isMojibakeText(value = '') {
        const text = String(value || '');
        if (!text) return false;
        const replacementCount = (text.match(/\uFFFD/g) || []).length;
        if (replacementCount >= 2) return true;
        return replacementCount > 0 && replacementCount / Math.max(text.length, 1) > 0.04;
    }

    cleanEvidenceSourceSnippet(snippet = '', title = '') {
        const titleNorm = this.normalizeCitationMatchText(title || '');
        const seen = new Set();
        const segments = String(snippet || '')
            .replace(/\s*\[preview truncated\]\s*/ig, ' ')
            .replace(/\.\.\./g, '\n')
            .split(/\n+/)
            .map(line => this.cleanOneLine(line)
                .replace(/^[-*•]\s*/, '')
                .replace(/^#+\s*/, '')
                .replace(/^!\[[^\]]*]\([^)]+\)\s*/, '')
                .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, '$1')
                .replace(/^(Title|标题)\s*[:：]\s*/i, '')
                .trim())
            .filter(line => line.length >= 12)
            .filter(line => !/^image\s+\d+$/i.test(line))
            .filter(line => {
                const norm = this.normalizeCitationMatchText(line);
                if (!norm || norm === titleNorm) return false;
                if (seen.has(norm)) return false;
                seen.add(norm);
                return true;
            });
        return segments[0] || '';
    }

    extractStableSourceReference(entry = {}, fallbackText = '') {
        const url = this.cleanUrl(entry?.url || '');
        const text = `${entry?.source_id || ''} ${entry?.sourceId || ''} ${entry?.url || ''} ${entry?.title || ''} ${entry?.snippet || ''} ${entry?.content_preview || ''} ${fallbackText || ''}`;
        const arxivFromUrl = url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)/i);
        const arxiv = arxivFromUrl?.[1]
            || (text.match(/\barxiv\s*[:：]?\s*([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)/i) || [])[1];
        if (arxiv) {
            const cleanId = arxiv.replace(/\.pdf$/i, '');
            return { type: 'arxiv', id: cleanId, label: `arXiv: ${cleanId}`, url: `https://arxiv.org/abs/${cleanId.replace(/v\d+$/i, '')}` };
        }
        const pmidFromUrl = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
        const pmid = pmidFromUrl?.[1]
            || (text.match(/\bpmid\s*[:：]?\s*(\d{5,10})\b/i) || [])[1];
        if (pmid) {
            return { type: 'pmid', id: pmid, label: `PMID: ${pmid}`, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` };
        }
        const doiFromUrl = url.match(/doi\.org\/(10\.\d{4,9}\/[^\s"'<>）)]+)/i);
        const doi = doiFromUrl?.[1]
            || (text.match(/\bdoi\s*[:：]?\s*(10\.\d{4,9}\/[^\s"'<>）)]+)/i) || [])[1];
        if (doi) {
            const cleanDoi = doi.replace(/[.,;]+$/g, '');
            return { type: 'doi', id: cleanDoi, label: `DOI: ${cleanDoi}`, url: `https://doi.org/${cleanDoi}` };
        }
        return { type: '', id: '', label: '', url: '' };
    }

    getSourceSiteLabel(entry = {}, host = '', stableRef = {}) {
        if (entry?.domain) return this.cleanOneLine(entry.domain);
        if (stableRef?.type === 'pmid') return 'PubMed';
        if (stableRef?.type === 'arxiv') return 'arXiv';
        if (stableRef?.type === 'doi') return 'DOI';
        if (!host) return '';
        const labels = {
            'pubmed.ncbi.nlm.nih.gov': 'PubMed',
            'arxiv.org': 'arXiv',
            'github.com': 'GitHub',
            'nature.com': 'nature.com',
            'reuters.com': 'Reuters',
            'apnews.com': 'AP News',
            'bbc.com': 'BBC News',
            'bbc.co.uk': 'BBC News',
            'theguardian.com': 'The Guardian',
            'people.com.cn': '人民网',
            'world.people.com.cn': '人民网',
            'news.163.com': '网易新闻'
        };
        return labels[host] || host;
    }

    sourceLabelContainsHost(label = '', host = '') {
        const cleanLabel = this.cleanOneLine(label || '').toLowerCase();
        const cleanHost = String(host || '').toLowerCase().replace(/^www\./, '');
        if (!cleanLabel || !cleanHost) return false;
        return cleanLabel.includes(cleanHost) || cleanHost.split('.').some(part => part.length >= 4 && cleanLabel.includes(part));
    }

    shouldIncludeSourceSnippet(title = '', snippet = '', entry = {}) {
        if (!snippet) return false;
        if (!title || title.length < 24) return true;
        if (entry?.kind === 'external_tool_result') return true;
        return /^(bbc news|bbc world|reuters|ap news|associated press|guardian|cnbc|网易新闻中心|新浪新闻|来源|source)$/i.test(title);
    }

    parentheticalSourceNote(value = '', max = 100) {
        const clean = this.previewValue(this.cleanOneLine(value || ''), max)
            .replace(/\s*\[preview truncated\]\s*$/i, '')
            .trim();
        return clean ? `(${clean})` : '';
    }

    dedupeSourceParts(parts = []) {
        const result = [];
        const seen = new Set();
        parts
            .map(part => this.cleanOneLine(part || ''))
            .filter(Boolean)
            .forEach(part => {
                const key = part.toLowerCase();
                if (seen.has(key)) return;
                const isUrl = /^https?:\/\//i.test(part);
                if (!isUrl && result.some(existing => {
                    const existingKey = existing.toLowerCase();
                    const existingIsUrl = /^https?:\/\//i.test(existing);
                    if (existingIsUrl) return existingKey.includes(key);
                    return existingKey.includes(key) || key.includes(existingKey);
                })) return;
                seen.add(key);
                result.push(part);
            });
        return result;
    }

    isGenericSourceHomepage(title, url) {
        const cleanTitle = this.cleanOneLine(title || '').toLowerCase();
        const cleanUrl = this.cleanUrl(url || '').replace(/\/+$/, '').toLowerCase();
        const genericTitle = /^(bbc news|bbc world|reuters|ap news|associated press|guardian|cnbc|网易新闻中心|新浪新闻|每日经济新闻|source|来源)$/i.test(cleanTitle);
        const genericUrl = /:\/\/[^/]+\/?(news|world|business|markets)?$/i.test(cleanUrl)
            || /:\/\/news\.163\.com\/latest$/i.test(cleanUrl)
            || /:\/\/news\.sina\.com\.cn$/i.test(cleanUrl)
            || /:\/\/www\.nbd\.com\.cn$/i.test(cleanUrl);
        return Boolean(genericTitle && genericUrl);
    }

    cleanRepeatedCitationMarkers(text) {
        return String(text || '')
            .replace(/\[(\d+)\](?:\s*\[\1\])+/g, '[$1]')
            .replace(/(\[[0-9]+\](?:\[[0-9]+\]){0,3})(?:\s+\1)+/g, '$1');
    }

    cleanSourceEntryText(value) {
        const original = String(value || '');
        const url = this.extractFirstUrlFromText(original);
        const host = this.extractHostname(url);
        let text = original
            .replace(/\s+—\s+\.\.\.\s*\{[\s\S]*$/g, '')
            .replace(/\s+\.\.\.\s*\{[\s\S]*$/g, '')
            .replace(/\s+(?:内容|Content)\s*[:：][\s\S]*?(?=\s+—\s+(?:https?:\/\/|[a-z0-9.-]+\.[a-z]{2,})|$)/i, '')
            .replace(/\s*\[preview truncated]\s*$/i, '')
            .replace(/\s+/g, ' ')
            .replace(/^[\-—–:：]\s*/, '')
            .trim();
        const parts = text
            .split(/\s+—\s+/)
            .map(part => this.cleanOneLine(part))
            .filter(Boolean)
            .filter(part => /^https?:\/\//i.test(part) || !this.isMojibakeText(part))
            .map(part => /^https?:\/\//i.test(part) ? this.cleanUrl(part) : this.compactSourceTitle(part, 110))
            .filter(Boolean);
        if (!parts.some(part => /^https?:\/\//i.test(part)) && url) parts.push(url);
        if (host && parts.length === 1 && /^https?:\/\//i.test(parts[0])) {
            parts.unshift(host);
        }
        return this.dedupeSourceParts(parts).join(' — ');
    }

    buildForcedAgentEarthFollowUp(plan, runState, userMessage, forcedCount = 0) {
        return this.agentProfiles
            ? this.agentProfiles.buildForcedAgentEarthFollowUp(plan, runState, userMessage, forcedCount)
            : null;
    }

    buildForcedNewsBriefDensityFollowUp(plan, runState, response, userMessage, forcedCount = 0) {
        return this.agentProfiles
            ? this.agentProfiles.buildForcedNewsBriefDensityFollowUp(plan, runState, response, userMessage, forcedCount)
            : null;
    }

    buildForcedSourceAlignmentFollowUp(plan, response, forcedCount = 0) {
        return this.agentProfiles
            ? this.agentProfiles.buildForcedSourceAlignmentFollowUp(plan, response, forcedCount)
            : null;
    }

    analyzeNewsBriefAnswer(content, scope = null) {
        return this.agentProfiles
            ? this.agentProfiles.analyzeNewsBriefAnswer(content, scope)
            : { citationCount: 0, storyCount: 0, sectionCount: 0, contentChars: String(content || '').trim().length };
    }

    escapeRegex(value) {
        return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    buildForcedResearchFollowUp(plan, runState, userMessage, forcedCount = 0) {
        return this.agentProfiles
            ? this.agentProfiles.buildForcedResearchFollowUp(plan, runState, userMessage, forcedCount)
            : null;
    }

    buildForcedCitationQualityFollowUp(plan, runState, response, forcedCount = 0) {
        if (forcedCount >= 1 || !this.isEvidenceSeekingPlan(plan)) return null;
        const content = String(response?.content || '').trim();
        if (!content) return null;
        const evidence = Array.isArray(runState?.evidenceLedger) ? runState.evidenceLedger : [];
        const stats = this.getResearchEvidenceStats(evidence);
        const citationCount = this.extractCitationMarkers(content).length;
        const hasSources = this.hasSourceHeading(content);
        const candidateLines = this.citationNormalizer?.countCitationCandidateLines
            ? this.citationNormalizer.countCitationCandidateLines(
                this.citationNormalizer.splitFinalSourceSection(content).body || content
            )
            : String(content).split('\n').filter(line => line.trim().length > 30).length;
        const target = this.getMinimumFinalCitationTarget(plan, stats, candidateLines);
        if (stats.uniqueUrls < Math.min(8, target) || citationCount >= target) return null;

        return [
            'Citation quality request: the draft uses too few source markers for the evidence already collected.',
            `Current draft has ${citationCount} distinct citation marker(s), source section present: ${hasSources ? 'yes' : 'no'}, while the evidence ledger has ${stats.uniqueUrls} unique URLs and ${stats.readableCount} readable items.`,
            `Rewrite the final answer now using the existing tool evidence first. Cite at least ${target} distinct sources when available, keep source markers consecutive, and include a 来源 section with one source per line.`,
            'Do not invent source ids. Do not collapse many unrelated claims onto one generic homepage or one old source. If a claim cannot be supported by the available evidence, remove it or label it as an inference.',
            'Keep the answer more information-dense and practitioner-grade: use precise domain terminology, concrete figures only when sourced, and sharper section names. Do not call more tools unless a specific missing citation requires it.'
        ].join('\n');
    }

    getMinimumFinalCitationTarget(plan, stats = {}, candidateLines = 0) {
        const configured = Number(plan?.citationTarget || 0);
        const evidenceBound = Math.max(0, Number(stats.uniqueUrls || 0));
        const byProfile = this.isNewsBriefPlan(plan)
            ? 18
            : plan?.researchProfile === 'industry'
                ? 16
                : this.isAcademicResearchPlan(plan)
                    ? 12
                    : 10;
        const byBody = Math.max(6, Math.ceil((Number(candidateLines) || 0) * (this.isNewsBriefPlan(plan) ? 0.35 : 0.45)));
        const desired = configured > 0 ? Math.min(configured, Math.max(byProfile, byBody)) : Math.max(byProfile, byBody);
        return Math.max(4, Math.min(desired, evidenceBound || desired));
    }

    buildGenericResearchFollowUp(plan, runState, userMessage) {
        return this.agentProfiles
            ? this.agentProfiles.buildGenericResearchFollowUp(plan, runState, userMessage)
            : null;
    }

    hasFreshInfoSignal(userMessage) {
        return this.intentContractBuilder
            ? this.intentContractBuilder.hasFreshInfoSignal(userMessage)
            : false;
    }

    isBroadDailyNewsRequest(userMessage) {
        return this.intentContractBuilder
            ? this.intentContractBuilder.isBroadDailyNewsRequest(userMessage)
            : false;
    }

    getNewsBriefScope(userMessage) {
        return this.intentContractBuilder
            ? this.intentContractBuilder.getNewsBriefScope(userMessage)
            : { focus: 'broad', categories: [], broad: true };
    }

    getNewsBriefCategoryMatches(userMessage) {
        return this.intentContractBuilder
            ? this.intentContractBuilder.getNewsBriefCategoryMatches(userMessage)
            : [];
    }

    getRequiredNewsCoverageKeys(scope = null) {
        return this.agentProfiles
            ? this.agentProfiles.getRequiredNewsCoverageKeys(scope)
            : ['domestic', 'international', 'finance', 'technology', 'society'];
    }

    getNewsBriefScopeLabel(scope = null) {
        return this.agentProfiles
            ? this.agentProfiles.getNewsBriefScopeLabel(scope)
            : this.getNewsBriefCoverageLabel(scope?.focus || 'broad');
    }

    getNewsBriefCoverageLabel(key) {
        return this.agentProfiles
            ? this.agentProfiles.getNewsBriefCoverageLabel(key)
            : 'news';
    }

    isResearchLikeMode(mode) {
        return mode === 'research' || mode === 'news_brief';
    }

    isNewsBriefPlan(plan = null) {
        return plan?.mode === 'news_brief' || plan?.researchProfile === 'news_brief';
    }

    isEvidenceSeekingPlan(plan = null) {
        return this.isResearchLikeMode(plan?.mode)
            || (plan?.mode === 'agent' && Number(plan?.sourceTarget || 0) > 0);
    }

    getEvidenceDomains(evidence = []) {
        if (this.evidenceLedgerService) {
            return this.evidenceLedgerService.getDomains(evidence);
        }
        return new Set((Array.isArray(evidence) ? evidence : [])
            .map(entry => this.extractHostname(entry?.url || ''))
            .filter(Boolean));
    }

    getResearchEvidenceStats(evidence = []) {
        if (this.evidenceLedgerService) {
            return this.evidenceLedgerService.getResearchStats(evidence);
        }
        const items = Array.isArray(evidence) ? evidence : [];
        const uniqueUrls = new Set(items.map(entry => this.cleanUrl(entry?.url || '')).filter(Boolean));
        const hosts = this.getEvidenceDomains(items);
        const readableKinds = new Set(['opened_source', 'opened_page', 'community_snapshot_item']);
        const candidateKinds = new Set(['source_candidate', 'search_result', 'community_snapshot_item']);
        return {
            uniqueUrls: uniqueUrls.size,
            hosts,
            readableCount: items.filter(entry => readableKinds.has(entry?.kind) && !entry?.error).length,
            candidateCount: items.filter(entry => candidateKinds.has(entry?.kind) && !entry?.error).length,
            errorCount: items.filter(entry => entry?.error || /error/i.test(entry?.kind || '')).length
        };
    }

    getDailyNewsCoverage(evidence = []) {
        return this.agentProfiles
            ? this.agentProfiles.getDailyNewsCoverage(evidence)
            : {};
    }

    matchesAny(text, terms = []) {
        return this.agentProfiles
            ? this.agentProfiles.matchesAny(text, terms)
            : terms.some(term => String(text || '').toLowerCase().includes(String(term || '').toLowerCase()));
    }

    extractHostname(url) {
        try {
            return new URL(this.cleanUrl(url)).hostname.replace(/^www\./i, '').toLowerCase();
        } catch (e) {
            return '';
        }
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
            newsBriefScope: plan.newsBriefScope || null,
            writing_contract: plan.writingContract || null,
            quality_gates: plan.qualityGates || {},
            policy_flags: plan.policyFlags || {},
            selectedTools: plan.selectedTools,
            agentEarthTargetCalls: plan.agentEarthTargetCalls || 0,
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
            research_plan: runState?.researchPlan || null,
            source_library: runState?.sourceLibrary || null,
            citation_verification: runState?.citationVerification || null,
            collaboration: runState?.collaboration || plan.collaboration || null,
            artifacts: runState?.artifacts || []
        };
    }

    createRunState(plan, contextPack = null, toolContext = null, userMessage = '') {
        const researchPlan = this.researchPlanService
            ? this.researchPlanService.create(plan, userMessage)
            : null;
        const sourceLibrary = this.sourceLibraryService
            ? this.sourceLibraryService.create(plan)
            : null;
        const artifacts = [researchPlan, sourceLibrary].filter(Boolean);
        return {
            contract_version: window.AgentContract?.CONTRACT_VERSION || 'agent-contract-v1',
            runId: plan.runId,
            plan,
            startedAt: new Date().toISOString(),
            finishedAt: null,
            contextPack,
            toolContext,
            writingContract: plan.writingContract || null,
            qualityGates: plan.qualityGates || {},
            policyFlags: plan.policyFlags || {},
            metrics: {
                iterations: 0,
                tool_calls: 0,
                successful_tool_calls: 0,
                failed_tool_calls: 0,
                approval_count: 0,
                approval_required_count: 0,
                evidence_items: 0,
                unique_source_urls: 0,
                citation_markers: 0,
                matched_citation_markers: 0,
                unmatched_citation_markers: 0,
                weak_citation_markers: 0,
                cited_evidence_items: 0,
                has_sources_section: false
            },
            toolCalls: [],
            evidenceLedger: [],
            researchPlan,
            sourceLibrary,
            artifacts,
            collaboration: plan.collaboration?.enabled ? {
                ...plan.collaboration,
                status: 'pending',
                started_at: null,
                completed_at: null
            } : null,
            citationVerification: null,
            events: [],
            eventSeq: 0,
            modelDeltaEvents: 0,
            warnings: [],
            onSnapshot: null
        };
    }

    notifyRunSnapshot(runState, reason = 'update', meta = {}) {
        if (!runState?.onSnapshot || !runState?.plan || !runState?.uiContainer) return;
        try {
            const snapshot = this.snapshotRun(runState.uiContainer, runState.plan, runState);
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
        if (type !== 'model.delta' && runState.events.length >= 3000) return null;
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
                id: `evt-${Date.now().toString(36)}-${runState.eventSeq}`,
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
        if (!runState) return;
        runState.modelDeltaEvents += 1;
        if (runState.modelDeltaEvents > 12) return;
        this.emitEvent(runState, 'model.delta', {
            delta_chars: String(delta || '').length,
            content_chars: String(full || '').length
        }, { stage, visibility: 'history' });
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
        if (metadata?.requiresApproval) {
            const approval = await this.requestToolApproval(runState, name, executableArgs, metadata, call, container);
            executableArgs = approval.args || {};
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

    async requestToolApproval(runState, name, args, metadata, call, container) {
        return this.toolRiskPolicy
            ? this.toolRiskPolicy.requestApproval(runState, name, args, metadata, call, container)
            : { status: 'approved', args };
    }

    normalizeApprovalDecision(decision, originalArgs) {
        return this.toolRiskPolicy
            ? this.toolRiskPolicy.normalizeApprovalDecision(decision, originalArgs)
            : { status: 'rejected', args: originalArgs, reason: '', edited: false };
    }

    confirmApprovalFallback(name, metadata, args) {
        return this.toolRiskPolicy
            ? this.toolRiskPolicy.confirmApprovalFallback(name, metadata, args)
            : { status: 'rejected', args };
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
        const addedEntries = this.extractEvidenceEntries(toolName, result)
            .map(entry => this.addEvidenceEntry(runState, entry))
            .filter(Boolean);
        if (addedEntries.length) {
            this.refreshResearchArtifacts(runState, {
                reason: 'evidence_added',
                addedEvidenceCount: addedEntries.length,
                toolName
            });
        }
    }

    finalizeRunState(runState, finalContent) {
        if (!runState) return;
        const text = String(finalContent || '');
        const citationBody = this.citationNormalizer?.splitFinalSourceSection
            ? this.citationNormalizer.splitFinalSourceSection(text).body || text
            : text;
        const citations = this.extractCitationMarkers(citationBody);
        runState.metrics.citation_markers = citations.length;
        runState.metrics.has_sources_section = /(^|\n)\s*(sources|source|references|来源|参考|鏉ユ簮)\s*[:：]?/i.test(text);
        runState.finishedAt = new Date().toISOString();
        runState.metrics.evidence_items = runState.evidenceLedger.length;
        runState.metrics.unique_source_urls = new Set(runState.evidenceLedger.map(item => item.url).filter(Boolean)).size;
        const verification = this.citationVerifier
            ? this.citationVerifier.verify(runState, text, citations)
            : { matched: [], unmatched: [], weak: [], citedEvidenceCount: 0, uncitedEvidenceCount: runState.evidenceLedger.length };
        runState.citationVerification = verification;
        runState.metrics.matched_citation_markers = verification.matched.length;
        runState.metrics.unmatched_citation_markers = verification.unmatched.length;
        runState.metrics.weak_citation_markers = verification.weak.length;
        runState.metrics.cited_evidence_items = verification.citedEvidenceCount;

        if (runState.evidenceLedger.length > 0 && citations.length === 0) {
            runState.warnings.push('Evidence was collected, but the final answer has no numeric citation markers.');
        }
        if (runState.evidenceLedger.length > 0 && !runState.metrics.has_sources_section) {
            runState.warnings.push('Evidence was collected, but the final answer has no explicit Sources/References section.');
        }
        if (verification.unmatched.length > 0) {
            runState.warnings.push(`Final answer has unmatched citation marker(s): ${verification.unmatched.map(item => `[${item.marker}]`).join(', ')}.`);
        }
        if (verification.weak.length > 0) {
            runState.warnings.push(`Final answer cites weak or unverified evidence marker(s): ${verification.weak.map(item => `[${item.marker}]`).join(', ')}.`);
        }
        const citationTarget = Math.min(
            Number(runState.plan?.citationTarget || 0) || (this.isNewsBriefPlan(runState.plan) ? 24 : 12),
            Math.max(1, runState.metrics.unique_source_urls || 0)
        );
        if (runState.metrics.unique_source_urls >= 8 && citations.length < Math.min(citationTarget, 8)) {
            runState.warnings.push(`Evidence was collected (${runState.metrics.unique_source_urls} unique URLs), but the final answer only cites ${citations.length} source marker(s).`);
        }
        if (runState.evidenceLedger.length > 0 || citations.length > 0) {
            this.emitEvent(runState, 'citation.verified', {
                citation_markers: citations,
                matched: verification.matched.map(item => ({
                    marker: item.marker,
                    evidence_ids: item.evidence_ids,
                    strongestTrustLevel: item.strongestTrustLevel
                })),
                unmatched: verification.unmatched,
                weak: verification.weak.map(item => ({
                    marker: item.marker,
                    evidence_ids: item.evidence_ids,
                    reason: item.reason
                })),
                citedEvidenceCount: verification.citedEvidenceCount
            }, { stage: 'synthesize', visibility: 'history' });
        }
    }

    extractCitationMarkers(text) {
        return Array.from(new Set(this.extractCitationMarkersWithDuplicates(text)));
    }

    pushMapValue(map, key, value) {
        const normalizedKey = String(key || '').trim();
        if (!normalizedKey) return;
        if (!map.has(normalizedKey)) map.set(normalizedKey, []);
        map.get(normalizedKey).push(value);
    }

    normalizeCitationUrl(url) {
        const clean = this.cleanUrl(url).toLowerCase();
        if (!clean) return '';
        try {
            const parsed = new URL(clean);
            parsed.hash = '';
            parsed.searchParams.sort();
            let normalized = parsed.toString();
            if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
            return normalized;
        } catch (e) {
            return clean.replace(/\/$/, '');
        }
    }

    normalizeCitationTitle(title) {
        return this.cleanOneLine(title).toLowerCase().replace(/[.,;:：]+$/g, '');
    }

    extractEvidenceEntries(toolName, result) {
        return this.evidenceLedgerService
            ? this.evidenceLedgerService.extractEntries(toolName, result)
            : [];
    }

    extractAgentEarthText(executeResponse) {
        return this.evidenceLedgerService
            ? this.evidenceLedgerService.extractAgentEarthText(executeResponse)
            : '';
    }

    addEvidenceEntry(runState, entry) {
        return this.evidenceLedgerService
            ? this.evidenceLedgerService.addEntry(runState, entry)
            : null;
    }

    refreshResearchArtifacts(runState, meta = {}) {
        if (!runState) return;
        let changed = false;
        if (this.sourceLibraryService && runState.sourceLibrary) {
            this.sourceLibraryService.update(runState.sourceLibrary, runState.evidenceLedger || []);
            changed = true;
        }
        if (this.researchPlanService && runState.researchPlan) {
            this.researchPlanService.updateFromSourceLibrary(runState.researchPlan, runState.sourceLibrary);
            changed = true;
        }
        if (!changed) return;
        runState.artifacts = [runState.researchPlan, runState.sourceLibrary].filter(Boolean);
        this.emitEvent(runState, 'research.artifacts.updated', {
            reason: meta.reason || 'updated',
            addedEvidenceCount: Number(meta.addedEvidenceCount || 0),
            toolName: meta.toolName || '',
            research_plan_id: runState.researchPlan?.id || null,
            source_library_id: runState.sourceLibrary?.id || null,
            source_count: runState.sourceLibrary?.sources?.length || 0,
            gaps: runState.researchPlan?.gaps || []
        }, { stage: 'observe', visibility: 'history' });
    }

    findWeakestEvidenceIndex(evidence = []) {
        return this.evidenceLedgerService
            ? this.evidenceLedgerService.findWeakestIndex(evidence)
            : -1;
    }

    normalizeEvidenceEntry(entry) {
        return this.evidenceLedgerService
            ? this.evidenceLedgerService.normalizeEntry(entry)
            : null;
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
        return text.length <= max ? text : `${text.slice(0, max)}\n[preview truncated]`;
    }

    assertToolInput(name, args) {
        const raw = JSON.stringify(args || {});
        if (raw.length > 6000) {
            throw new Error(`${name} input is too large for a front-end agent run.`);
        }
    }

    capToolResultForModel(result, toolName = '') {
        const text = String(result ?? '');
        const configured = Number(this.registry?.getToolMetadata?.(toolName)?.maxOutputChars);
        const cap = Number.isFinite(configured) && configured > 0
            ? Math.min(Math.max(configured, 4000), 96000)
            : 12000;
        if (text.length <= cap) return text;
        return `${text.slice(0, cap)}\n\n[Tool result truncated to ${cap} characters by AgentRuntime]`;
    }

    summarizeToolResult(result) {
        const text = String(result ?? '').trim();
        if (!text) return '[empty result]';
        if (text.length <= 900) return text;
        return `${text.slice(0, 900)}\n\n[Result preview truncated. Full result was still provided to the model within runtime limits.]`;
    }
}

window.AgentRuntime = AgentRuntime;
