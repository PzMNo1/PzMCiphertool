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
        const rawMessage = String(userMessage || '');
        const text = rawMessage.toLowerCase();
        const hasAttachments = Boolean(options.hasAttachments);
        const recentText = Array.isArray(options.messages)
            ? options.messages.slice(-8).map(msg => String(msg?.content || '')).join('\n').toLowerCase()
            : '';
        const directFreshInfo = /(最新|今天|现在|昨天|今年|新闻|搜索|查找|联网|网上|网页|网址|资料|来源|引用|链接|官网|文档|价格|政策|法规|版本|更新|发布|趋势|社区|前沿|现状|进展|进度|到了什么|最佳实践|推荐|对比|排名|论文|研究|评测|天气|current|latest|today|news|search|web|url|source|citation|weather|price|release|version|docs|documentation|paper|benchmark|recommend|compare|trend|state of the art|frontier|progress)/i.test(rawMessage);
        const directCommunityScan = /(前沿社区|技术社区|开发者社区|社区|hacker news|github trending|product hunt|v2ex|reddit|lobsters)/i.test(rawMessage);
        const terseResearchFollowUp = /^(继续|继续吧|获取|获取吧|总结|总结吧|告诉我|说吧|再查|再查一下|查吧|拉出来|展开|深挖|继续获取|开始)$/i.test(rawMessage.trim());
        const hasRecentResearchContext = /(web_research|read_webpage|search_urls|agent run 状态|mode:\s*research|论文|研究|学术|来源|引用|检索|前沿|github trending|hacker news|product hunt|nature photonics|arxiv|doi|source ids?)/i.test(recentText);
        const hasRecentCommunityContext = /(社区|community|github trending|hacker news|product hunt|v2ex|reddit|lobsters|local llama|localllama)/i.test(recentText);
        const wantsCommunityScan = directCommunityScan || (terseResearchFollowUp && hasRecentCommunityContext);
        const directAcademicResearch = !wantsCommunityScan && /(学术|论文|研究|研究进展|研究到了|前沿|前沿研究|综述|光学|光子|量子|物理|材料|生物|医学|化学|arxiv|nature|science|optica|ieee|acm|pubmed|doi|paper|academic|literature|review|benchmark|state of the art)/i.test(rawMessage);
        const hasRecentAcademicContext = /(论文|学术|研究进展|前沿研究|arxiv|nature|science|optica|ieee|acm|pubmed|doi|paper|academic|literature|journal|conference|nature photonics)/i.test(recentText);
        const wantsAcademicResearch = directAcademicResearch || (terseResearchFollowUp && hasRecentAcademicContext);
        const wantsFreshInfo = wantsAcademicResearch || directFreshInfo || (terseResearchFollowUp && hasRecentResearchContext);
        const wantsCrypto = /(base64|凯撒|caesar|morse|摩斯|rot13|hex|哈希|hash|维吉尼亚|vigenere|频率|二进制|binary|url编码|解码|加密|解密|cipher)/i.test(userMessage);
        const wantsMath = /(计算|换算|单位|随机|calculate|convert|math|sqrt|sin|cos|\d+\s*[+\-*/%]\s*\d+)/i.test(userMessage);
        const wantsProject = !hasAttachments && /(代码|项目|文件|目录|读取|搜索文件|构建|测试|补丁|修改|java|javascript|css|html|read file|search files|build|test|patch|code|project|workspace)/i.test(userMessage);
        const wantsMarket = /(股票|行情|股价|币价|金融|财经|stock|quote|price|finance|crypto|ticker)/i.test(userMessage);
        const wantsTools = Boolean(options.toolEnabled || wantsFreshInfo || wantsCrypto || wantsMath || wantsProject || wantsMarket);
        const mode = wantsFreshInfo ? 'research' : wantsTools ? 'agent' : 'chat';
        const researchSourceTarget = 28;
        const researchCitationTarget = wantsCommunityScan ? 20 : 18;
        const researchIterations = wantsCommunityScan ? 48 : wantsAcademicResearch ? 36 : 36;

        const selectedTools = this.routeTools({
            text,
            wantsFreshInfo,
            wantsCrypto,
            wantsMath,
            wantsProject,
            wantsMarket,
            wantsTools,
            hasAttachments,
            wantsAcademicResearch
        });

        return {
            runId: `run-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
            mode,
            researchProfile: wantsAcademicResearch ? 'academic' : wantsFreshInfo ? 'general' : 'none',
            selectedTools,
            maxIterations: mode === 'research' ? researchIterations : mode === 'agent' ? 4 : 1,
            sourceTarget: mode === 'research' ? researchSourceTarget : 0,
            citationTarget: mode === 'research' ? researchCitationTarget : 0,
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
        const research = ['community_snapshot', 'web_research', 'search_urls', 'read_webpage', 'news_query', 'get_weather'];
        const academicResearch = ['web_research', 'search_urls', 'read_webpage'];
        const codexWeb = ['search_query', 'open_url', 'find_in_page', 'open', 'find', 'get_time', 'time', 'weather', 'news_query'];
        const project = ['list_files', 'read_file', 'search_files', 'file_info', 'update_plan'];
        const codeOps = ['propose_patch', 'run_tests', 'run_build'];
        const market = ['finance_query'];
        const utility = ['random_number', 'uuid_generate', 'unit_convert'];

        const selected = new Set(core);
        if (intent.wantsCrypto) crypto.forEach(name => selected.add(name));
        if (intent.wantsFreshInfo) (intent.wantsAcademicResearch ? academicResearch : research).forEach(name => selected.add(name));
        if (intent.wantsMath) utility.forEach(name => selected.add(name));
        if (intent.wantsProject) [...project, ...codeOps].forEach(name => selected.add(name));
        if (intent.wantsMarket) [...market, 'news_query'].forEach(name => selected.add(name));
        if (!intent.wantsCrypto && !intent.wantsFreshInfo && !intent.wantsMath && !intent.wantsProject && !intent.wantsMarket && !intent.hasAttachments) {
            [...crypto, ...research, ...codexWeb, ...project, ...utility].forEach(name => selected.add(name));
        }

        return Array.from(selected).filter(name => this.registry.has(name));
    }

    buildAgentSystemPrompt(plan, contextPack = null) {
        const sourceTarget = plan.sourceTarget || 28;
        const citationTarget = plan.citationTarget || 18;
        const researchPolicy = plan.researchProfile === 'academic'
            ? [
                '- Academic research mode: prefer primary sources over broad search. Go directly to arXiv, Nature, Science, Optica/OSA, IEEE, ACM, PubMed, official journal/conference pages, or known project papers when the target source is obvious.',
                '- For academic questions, use web_research depth="fast" at most once only as a map. For the evidence pass, use web_research depth="deep" read_top=true max_results=28-32, then pivot to site-targeted search_urls queries such as site:arxiv.org, site:nature.com, site:science.org, site:opg.optica.org, site:ieeexplore.ieee.org, and read_webpage on the best primary sources.',
                `- Aim for at least ${sourceTarget} distinct primary or high-authority source URLs and cite at least ${citationTarget} useful sources when available. If the first pass is sparse, run one narrower targeted follow-up instead of synthesizing early.`,
                '- Do not spend repeated iterations on generic search once useful primary-source candidates exist.'
            ]
            : [
                '- For broad community scans, call community_snapshot first. It has dedicated routes for Hacker News, GitHub Trending, V2EX, Reddit, Lobsters, and Product Hunt and should be preferred over generic page reads for those sites.',
                '- For news, communities, products, and current events, use web_research depth="deep" read_top=true max_results=28-32 for the main evidence pass. Use depth="fast" only for a preliminary map when the source landscape is unclear.',
                '- For broad community scans, preserve breadth before synthesis: cover several distinct communities when relevant, such as Hacker News, GitHub Trending, Product Hunt, V2EX, Reddit/Lobsters, official blogs, or security/news sources. Do not collapse the answer into a shallow daily digest if the user asked for research.',
                `- Aim for at least ${sourceTarget} distinct source URLs or community items and cite at least ${citationTarget} useful sources when available. If fewer than 28 distinct sources or fewer than 12 readable evidence items are available, run narrower follow-ups with web_research/search_urls/read_webpage before final synthesis.`,
                '- The final answer should include findings, cross-source patterns, source notes, and uncertainty in a natural research-brief style. Do not add a forced closing summary or slogan unless the user explicitly asks for one.'
            ];

        const finalAnswerStyle = plan.mode === 'research'
            ? [
                '- Final answer style contract for research/community scans:',
                '  - Use a natural research-brief structure with short named sections only where they help readability; avoid a rigid template if paragraphs plus grouped bullets read better.',
                '  - Start with the most important findings and supporting context, not a terse verdict.',
                '  - Prefer grouped evidence bullets or a compact table only when it improves clarity.',
                '  - Every important factual claim should carry inline numeric citations such as [1], [2]. Do not invent citation ids that were not returned by tools.',
                `  - When enough evidence exists, cite at least ${citationTarget} distinct sources. If fewer are available, state that source coverage is limited and explain why.`,
                '  - End with a compact source note that maps each cited source id to its title or site and URL when URLs are available, but do not format that final source note as a Markdown heading. Use plain text like "来源：" instead of "## 来源".',
                '  - If a source id has no URL because a tool returned only a snapshot, label it as a tool snapshot and name the originating community.',
                '  - Do not add a forced closing summary, slogan, or extra recap section unless the user explicitly asks for it.'
            ]
            : [
                '- When the answer depends on external facts, cite source ids such as [1], [2] and include a compact Sources/来源 section.'
            ];

        const contextMemoryPolicy = this.buildContextMemoryPolicy(contextPack);

        return [
            'Agent runtime policy:',
            '- Treat the conversation as a bounded run with these phases: plan, route, act, observe, synthesize.',
            '- For current, external, fast-changing, recommended, price/policy/version/news, or citation-sensitive claims, do not answer from memory.',
            ...researchPolicy,
            ...finalAnswerStyle,
            ...contextMemoryPolicy,
            '- Use one canonical tool for each action: community_snapshot for community dashboards, web_research for broad maps, search_urls for narrow targeted queries, read_webpage for opening URLs. Avoid duplicate alias tools and avoid looping over equivalent searches.',
            `- For research runs, source collection target is ${sourceTarget}+ distinct sources and citation target is ${citationTarget}+ cited sources when available; do not finalize after only a handful of sources unless the user asked for a quick answer or the web tools clearly cannot retrieve more.`,
            '- Never use Baidu or Baidu-derived pages as evidence, search fallbacks, citations, or redirects. If other search engines are blocked, use non-Baidu direct sources, official/community pages, Jina search/reader, RSS/API endpoints, and site-targeted reads.',
            '- Prefer authoritative, primary, official, peer-reviewed, reputable media, or first-hand community sources over search result pages, SEO pages, mirrors, and encyclopedic summaries.',
            '- Cite source ids such as [1], [2] when tool results provide them.',
            '- After observing tool results, synthesize a direct final answer instead of narrating internal tool mechanics.',
            '- If a tool fails, adapt once if useful, then explain the useful residual result.',
            `- Research profile: ${plan.researchProfile}.`,
            `- Current run mode: ${plan.mode}. Max tool iterations: ${plan.maxIterations}. Source target: ${plan.sourceTarget || 0}. Citation target: ${plan.citationTarget || 0}.`
        ].join('\n');
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

    async run({ messages, userMessage, enableThinking, toolEnabled, hasAttachments = false, container, contextPack = null }) {
        const plan = this.createPlan(userMessage, { toolEnabled, hasAttachments, messages });
        const runState = this.createRunState(plan, contextPack);
        runState.uiContainer = container;
        this.emitEvent(runState, 'run.started', {
            mode: plan.mode,
            researchProfile: plan.researchProfile,
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
            maxIterations: plan.maxIterations
        }, { stage: 'plan', visibility: 'history' });
        this.ui.createAgentRunPanel(container, plan);
        this.ui.setAgentStage(container, 'plan', 'active', '解析任务目标');
        this.ui.addAgentTrace(container, 'plan', `Run ${plan.runId} initialized in ${plan.mode} mode.`);

        const agentMessages = [
            ...messages,
            { role: 'system', content: this.buildAgentSystemPrompt(plan, contextPack) }
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

        if (!plan.selectedTools.length) {
            this.ui.setAgentStage(container, 'synthesize', 'active', '生成回复');
            this.emitEvent(runState, 'model.started', {
                toolsEnabled: false,
                enableThinking: Boolean(enableThinking)
            }, { stage: 'synthesize', visibility: 'history' });
            const response = await this.client.chat({
                messages: agentMessages,
                enableThinking,
                onReasoning: text => this.ui.appendReasoningContent(container, text),
                onContent: (delta, full) => {
                    if (container.reasoningDetails.classList.contains('thinking-state')) {
                        this.ui.finishReasoning(container);
                    }
                    this.ui.updateContent(container, full);
                    this.recordModelDelta(runState, delta, full, 'synthesize');
                }
            });
            this.ui.setAgentStage(container, 'synthesize', 'done', '完成');
            this.emitEvent(runState, 'model.completed', {
                finish_reason: response?.finish_reason || null,
                content_chars: String(response?.content || '').length
            }, { stage: 'synthesize', visibility: 'history' });
            this.finalizeRunState(runState, response?.content || '');
            this.emitEvent(runState, 'run.completed', {
                content_chars: String(response?.content || '').length,
                warnings: runState.warnings
            }, { stage: 'synthesize', visibility: 'history' });
            response.agent_run = this.snapshotRun(container, plan, runState);
            return response;
        }

        const tools = this.registry.getToolDefinitions(plan.selectedTools);
        let finalResponse = null;
        let latestStreamedContent = '';
        let hasDisplayedContent = false;
        const collectedToolCalls = [];

        this.ui.setAgentStage(container, 'act', 'active', '等待模型选择工具');

        finalResponse = await this.client.chatWithTools({
            messages: agentMessages,
            tools,
            enableThinking,
            maxIterations: plan.maxIterations,
            onReasoning: text => this.ui.appendReasoningContent(container, text),
            onContent: (delta, full) => {
                latestStreamedContent = full || latestStreamedContent;
                if (!latestStreamedContent) return;
                hasDisplayedContent = true;
                if (container.reasoningDetails.classList.contains('thinking-state')) {
                    this.ui.finishReasoning(container);
                }
                this.ui.updateContent(container, latestStreamedContent);
                this.recordModelDelta(runState, delta, latestStreamedContent, 'act');
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
        if (finalResponse?.content) {
            if (container.reasoningDetails.classList.contains('thinking-state')) {
                this.ui.finishReasoning(container);
            }
            if (!hasDisplayedContent || finalResponse.content !== latestStreamedContent) {
                this.ui.updateContent(container, finalResponse.content);
            }
        }

        this.ui.setAgentStage(container, 'synthesize', 'done', '完成');
        this.ui.addAgentTrace(container, 'synthesize', 'Final answer synthesized from the run state.');
        if (finalResponse) {
            this.finalizeRunState(runState, finalResponse.content || latestStreamedContent || '');
            this.emitEvent(runState, 'run.completed', {
                content_chars: String(finalResponse.content || latestStreamedContent || '').length,
                warnings: runState.warnings
            }, { stage: 'synthesize', visibility: 'history' });
            finalResponse.agent_tool_calls = collectedToolCalls;
            finalResponse.agent_run = this.snapshotRun(container, plan, runState);
        }
        return finalResponse;
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
            selectedTools: plan.selectedTools,
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
            citation_verification: runState?.citationVerification || null,
            artifacts: runState?.artifacts || []
        };
    }

    createRunState(plan, contextPack = null) {
        return {
            contract_version: window.AgentContract?.CONTRACT_VERSION || 'agent-contract-v1',
            runId: plan.runId,
            startedAt: new Date().toISOString(),
            finishedAt: null,
            contextPack,
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
            artifacts: [],
            citationVerification: null,
            events: [],
            eventSeq: 0,
            modelDeltaEvents: 0,
            warnings: []
        };
    }

    emitEvent(runState, type, payload = {}, options = {}) {
        if (!runState || runState.events.length >= 220) return null;
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
        runState.events.push(event);
        this.ui?.appendAgentEvent?.(runState.uiContainer, event);
        window.agentRunStore?.appendEvent?.(event);
        return event;
    }

    recordModelDelta(runState, delta, full, stage) {
        if (!runState) return;
        runState.modelDeltaEvents += 1;
        if (runState.modelDeltaEvents > 80) return;
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
        if (metadata?.requiresApproval) {
            const approval = await this.requestToolApproval(runState, name, executableArgs, metadata, call, container);
            executableArgs = approval.args || {};
        }
        this.recordToolStarted(runState, name, executableArgs, metadata, call);
        return { args: executableArgs, metadata, call };
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
        if (!runState || !metadata?.requiresApproval) return { status: 'approved', args };
        runState.metrics.approval_required_count += 1;
        const approvalId = `approval-${runState.runId}-${runState.metrics.approval_required_count}`;
        const payload = {
            approval_id: approvalId,
            tool_call_id: call?.id || '',
            name,
            risk: metadata.risk || 'unknown',
            approvalMode: metadata.approvalMode || 'interactive_gate_v1',
            enforced: true,
            phase: 'phase2_interactive_gate',
            impact: metadata.impact || '',
            arguments_preview: this.previewValue(args || {}, 1200)
        };

        if (call) {
            call.status = 'waiting_approval';
            call.approval_required = true;
            call.approval_id = approvalId;
            call.risk = metadata.risk || '';
            call.approval_mode = payload.approvalMode;
            call.waiting_approval_at = new Date().toISOString();
        }

        this.ui.setAgentStage(container, 'act', 'active', `等待批准 ${name}`);
        this.ui.addAgentTrace(container, 'act', `Approval required before ${name}.`);
        const event = this.emitEvent(runState, 'approval.required', payload, { stage: 'act', visibility: 'audit' });

        let decision = null;
        if (this.ui?.waitForAgentApproval) {
            decision = await this.ui.waitForAgentApproval(container, event, { name, args, metadata });
        } else {
            decision = this.confirmApprovalFallback(name, metadata, args);
        }

        const normalizedDecision = this.normalizeApprovalDecision(decision, args);
        const approved = normalizedDecision.status === 'approved';
        if (approved) {
            runState.metrics.approval_count += 1;
        }
        if (call) {
            call.approval_status = normalizedDecision.status;
            call.approval_resolved_at = new Date().toISOString();
            call.approval_edited_args = Boolean(normalizedDecision.edited);
        }

        this.emitEvent(runState, 'approval.resolved', {
            approval_id: approvalId,
            tool_call_id: call?.id || '',
            name,
            status: normalizedDecision.status,
            approved,
            edited: normalizedDecision.edited,
            reason: normalizedDecision.reason || '',
            arguments_preview: this.previewValue(normalizedDecision.args || {}, 1200)
        }, { stage: 'act', visibility: 'audit' });

        if (!approved) {
            throw new Error(normalizedDecision.reason || `用户拒绝执行 ${name}`);
        }
        return normalizedDecision;
    }

    normalizeApprovalDecision(decision, originalArgs) {
        const normalized = decision && typeof decision === 'object' ? decision : {};
        const status = normalized.status === 'approved' ? 'approved' : 'rejected';
        const args = normalized.args === undefined ? originalArgs : normalized.args;
        return {
            status,
            args,
            reason: normalized.reason || '',
            edited: JSON.stringify(args || {}) !== JSON.stringify(originalArgs || {})
        };
    }

    confirmApprovalFallback(name, metadata, args) {
        const impact = metadata?.impact ? `\nImpact: ${metadata.impact}` : '';
        const preview = this.previewValue(args || {}, 900);
        const message = `Approve execution of ${name}?${impact}\n\nArguments:\n${preview}`;
        const approved = typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm(message)
            : false;
        return { status: approved ? 'approved' : 'rejected', args };
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
        this.extractEvidenceEntries(toolName, result).forEach(entry => this.addEvidenceEntry(runState, entry));
    }

    finalizeRunState(runState, finalContent) {
        if (!runState) return;
        const text = String(finalContent || '');
        const citations = this.extractCitationMarkers(text);
        runState.metrics.citation_markers = citations.length;
        runState.metrics.has_sources_section = /(^|\n)\s*(sources|source|references|来源|参考|鏉ユ簮)\s*[:：]?/i.test(text);
        runState.finishedAt = new Date().toISOString();
        runState.metrics.evidence_items = runState.evidenceLedger.length;
        runState.metrics.unique_source_urls = new Set(runState.evidenceLedger.map(item => item.url).filter(Boolean)).size;
        const verification = this.verifyCitations(runState, text, citations);
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
        return Array.from(new Set(Array.from(String(text || '').matchAll(/\[(\d+)\]/g)).map(match => String(match[1]))));
    }

    verifyCitations(runState, finalContent, citationMarkers) {
        const sourceLines = this.extractCitationSourceLines(finalContent);
        const matched = [];
        const unmatched = [];
        const weak = [];
        const citedEvidenceIds = new Set();
        const evidenceBySourceId = new Map();
        const evidenceByUrl = new Map();
        const evidenceByTitle = new Map();

        runState.evidenceLedger.forEach(entry => {
            const sourceIds = [
                entry.source_id,
                entry.sourceId,
                /^\d+$/.test(String(entry.source_id || '')) ? Number(entry.source_id) : ''
            ].map(value => String(value ?? '').trim()).filter(Boolean);
            sourceIds.forEach(sourceId => this.pushMapValue(evidenceBySourceId, sourceId, entry));
            const normalizedUrl = this.normalizeCitationUrl(entry.url || '');
            if (normalizedUrl) this.pushMapValue(evidenceByUrl, normalizedUrl, entry);
            const normalizedTitle = this.normalizeCitationTitle(entry.title || '');
            if (normalizedTitle) this.pushMapValue(evidenceByTitle, normalizedTitle, entry);
        });

        citationMarkers.forEach(marker => {
            const sourceLine = sourceLines.get(marker) || {};
            const candidates = new Map();
            (evidenceBySourceId.get(marker) || []).forEach(entry => candidates.set(entry.id, entry));
            const lineUrl = this.normalizeCitationUrl(sourceLine.url || '');
            if (lineUrl) {
                (evidenceByUrl.get(lineUrl) || []).forEach(entry => candidates.set(entry.id, entry));
            }
            const lineTitle = this.normalizeCitationTitle(sourceLine.title || '');
            if (lineTitle) {
                (evidenceByTitle.get(lineTitle) || []).forEach(entry => candidates.set(entry.id, entry));
            }

            const entries = Array.from(candidates.values());
            if (!entries.length) {
                unmatched.push({
                    marker,
                    source_line: sourceLine.raw || ''
                });
                return;
            }

            const claimId = `citation:${marker}`;
            entries.forEach(entry => {
                entry.usedInFinalAnswer = true;
                if (!Array.isArray(entry.claimIds)) entry.claimIds = [];
                if (!entry.claimIds.includes(claimId)) entry.claimIds.push(claimId);
                citedEvidenceIds.add(entry.id);
            });

            const strongestTrustLevel = this.getStrongestTrustLevel(entries);
            const matchedItem = {
                marker,
                evidence_ids: entries.map(entry => entry.id),
                source_line: sourceLine.raw || '',
                strongestTrustLevel
            };
            matched.push(matchedItem);
            if (entries.every(entry => this.isWeakEvidence(entry))) {
                weak.push({
                    marker,
                    evidence_ids: matchedItem.evidence_ids,
                    reason: 'citation only maps to search candidates, raw URLs, errors, or low-trust evidence'
                });
            }
        });

        return {
            matched,
            unmatched,
            weak,
            citedEvidenceCount: citedEvidenceIds.size,
            uncitedEvidenceCount: Math.max(0, runState.evidenceLedger.length - citedEvidenceIds.size)
        };
    }

    extractCitationSourceLines(text) {
        const lines = String(text || '').split('\n');
        const sources = new Map();
        lines.forEach(line => {
            const marker = line.match(/\[(\d+)\]/);
            if (!marker) return;
            const url = (line.match(/https?:\/\/[^\s"'<>）)]+/i) || [])[0] || '';
            const title = line
                .replace(/\[(\d+)\]/g, '')
                .replace(/https?:\/\/[^\s"'<>）)]+/ig, '')
                .replace(/^[-*•\s:：]+/, '')
                .trim();
            sources.set(String(marker[1]), {
                raw: this.cleanOneLine(line),
                url: this.cleanUrl(url),
                title: this.cleanOneLine(title)
            });
        });
        return sources;
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

    getStrongestTrustLevel(entries) {
        const rank = { unknown: 0, low: 1, medium: 2, high: 3, primary: 4 };
        return entries.reduce((best, entry) => {
            const level = entry.trustLevel || 'unknown';
            return (rank[level] || 0) > (rank[best] || 0) ? level : best;
        }, 'unknown');
    }

    isWeakEvidence(entry) {
        if (!entry || entry.error) return true;
        if (['source_candidate', 'search_result', 'raw_url_reference', 'page_read_error', 'source_read_error'].includes(entry.kind)) return true;
        return ['low', 'unknown'].includes(entry.trustLevel || 'unknown');
    }

    extractEvidenceEntries(toolName, result) {
        const parsed = this.safeParseJson(result);
        const entries = [];
        const now = new Date().toISOString();

        if (parsed && Array.isArray(parsed.sources)) {
            parsed.sources.forEach(source => {
                entries.push(this.normalizeEvidenceEntry({
                    kind: 'source_candidate',
                    tool: toolName,
                    source_id: source.id,
                    title: source.title,
                    url: source.url,
                    query: source.query,
                    search_source: source.source,
                    snippet: source.snippet,
                    observed_at: now
                }));
            });
        }

        if (parsed && Array.isArray(parsed.evidence)) {
            parsed.evidence.forEach(item => {
                entries.push(this.normalizeEvidenceEntry({
                    kind: item.error ? 'source_read_error' : 'opened_source',
                    tool: toolName,
                    source_id: item.source_id,
                    title: item.title,
                    url: item.url,
                    content_preview: item.content,
                    error: item.error,
                    truncated: item.truncated,
                    observed_at: now
                }));
            });
        }

        if (parsed && Array.isArray(parsed.communities)) {
            parsed.communities.forEach(community => {
                (community.items || []).forEach((item, index) => {
                    entries.push(this.normalizeEvidenceEntry({
                        kind: 'community_snapshot_item',
                        tool: toolName,
                        source_id: `${community.id || community.name}-${index + 1}`,
                        title: item.title,
                        url: item.url,
                        community: community.name || community.id,
                        error: community.error || item.error,
                        observed_at: parsed.retrieved_at || now
                    }));
                });
            });
        }

        if (parsed && parsed.url && (parsed.content || parsed.error)) {
            entries.push(this.normalizeEvidenceEntry({
                kind: parsed.error ? 'page_read_error' : 'opened_page',
                tool: toolName,
                url: parsed.url,
                content_preview: parsed.content,
                error: parsed.error,
                filter: parsed.filter_applied,
                chunk_index: parsed.chunk_index,
                total_chunks: parsed.total_chunks,
                observed_at: parsed.retrieved_at || now
            }));
        }

        if (Array.isArray(parsed)) {
            parsed.forEach((item, index) => {
                entries.push(this.normalizeEvidenceEntry({
                    kind: 'search_result',
                    tool: toolName,
                    source_id: index + 1,
                    title: item.title,
                    url: item.url,
                    snippet: item.snippet,
                    search_source: item.source,
                    observed_at: now
                }));
            });
        }

        if (!entries.length) {
            this.extractUrls(String(result || '')).forEach((url, index) => {
                entries.push(this.normalizeEvidenceEntry({
                    kind: 'raw_url_reference',
                    tool: toolName,
                    source_id: index + 1,
                    url,
                    observed_at: now
                }));
            });
        }

        return entries.filter(Boolean);
    }

    addEvidenceEntry(runState, entry) {
        if (!entry || runState.evidenceLedger.length >= 80) return;
        const normalizedEntry = window.AgentContract?.normalizeEvidenceEntry
            ? window.AgentContract.normalizeEvidenceEntry(entry, { runId: runState.runId })
            : { ...entry, id: `evd-${Date.now().toString(36)}-${runState.evidenceLedger.length + 1}`, runId: runState.runId };
        const key = [normalizedEntry.kind, normalizedEntry.source_id, normalizedEntry.url, normalizedEntry.title].filter(Boolean).join('|').toLowerCase();
        if (runState.evidenceLedger.some(existing => existing.dedupe_key === key)) return;
        const stored = { ...normalizedEntry, dedupe_key: key };
        runState.evidenceLedger.push(stored);
        runState.metrics.evidence_items = runState.evidenceLedger.length;
        runState.metrics.unique_source_urls = new Set(runState.evidenceLedger.map(item => item.url).filter(Boolean)).size;
        this.emitEvent(runState, 'evidence.added', {
            evidence_id: stored.id,
            kind: stored.kind,
            source_id: stored.source_id,
            title: stored.title,
            url: stored.url,
            tool: stored.tool,
            trustLevel: stored.trustLevel,
            trustReason: stored.trustReason,
            contentHash: stored.contentHash
        }, { stage: 'observe', visibility: 'history' });
    }

    normalizeEvidenceEntry(entry) {
        const normalized = {
            kind: entry.kind || 'unknown',
            tool: entry.tool || '',
            source_id: entry.source_id ?? '',
            title: this.cleanOneLine(entry.title || ''),
            url: this.cleanUrl(entry.url || ''),
            observed_at: entry.observed_at || new Date().toISOString()
        };
        ['query', 'search_source', 'community', 'filter', 'chunk_index', 'total_chunks', 'truncated', 'error'].forEach(key => {
            if (entry[key] !== undefined && entry[key] !== null && entry[key] !== '') normalized[key] = entry[key];
        });
        if (entry.snippet) normalized.snippet = this.previewValue(entry.snippet, 320);
        if (entry.content_preview) normalized.content_preview = this.previewValue(entry.content_preview, 500);
        if (!normalized.title && !normalized.url && !normalized.error) return null;
        return normalized;
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
        return String(url || '').trim().replace(/[.,;]+$/, '');
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
            ? Math.min(Math.max(configured, 4000), 64000)
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
