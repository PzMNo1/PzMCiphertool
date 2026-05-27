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
        const wantsCommunityScan = /(前沿社区|技术社区|开发者社区|社区|hacker news|github trending|product hunt|v2ex|reddit|lobsters)/i.test(rawMessage);
        const directAcademicResearch = !wantsCommunityScan && /(学术|论文|研究|研究进展|研究到了|前沿|前沿研究|综述|光学|光子|量子|物理|材料|生物|医学|化学|arxiv|nature|science|optica|ieee|acm|pubmed|doi|paper|academic|literature|review|benchmark|state of the art)/i.test(rawMessage);
        const terseResearchFollowUp = /^(继续|继续吧|获取|获取吧|总结|总结吧|告诉我|说吧|再查|再查一下|查吧|拉出来|展开|深挖|继续获取|开始)$/i.test(rawMessage.trim());
        const hasRecentResearchContext = /(web_research|read_webpage|search_urls|agent run 状态|mode:\s*research|论文|研究|学术|来源|引用|检索|前沿|github trending|hacker news|product hunt|nature photonics|arxiv|doi|source ids?)/i.test(recentText);
        const hasRecentAcademicContext = /(论文|学术|研究进展|前沿研究|arxiv|nature|science|optica|ieee|acm|pubmed|doi|paper|academic|literature|journal|conference|nature photonics)/i.test(recentText);
        const wantsAcademicResearch = directAcademicResearch || (terseResearchFollowUp && hasRecentAcademicContext);
        const wantsFreshInfo = wantsAcademicResearch || directFreshInfo || (terseResearchFollowUp && hasRecentResearchContext);
        const wantsCrypto = /(base64|凯撒|caesar|morse|摩斯|rot13|hex|哈希|hash|维吉尼亚|vigenere|频率|二进制|binary|url编码|解码|加密|解密|cipher)/i.test(userMessage);
        const wantsMath = /(计算|换算|单位|随机|calculate|convert|math|sqrt|sin|cos|\d+\s*[+\-*/%]\s*\d+)/i.test(userMessage);
        const wantsProject = !hasAttachments && /(代码|项目|文件|目录|读取|搜索文件|构建|测试|补丁|修改|java|javascript|css|html|read file|search files|build|test|patch|code|project|workspace)/i.test(userMessage);
        const wantsMarket = /(股票|行情|股价|币价|金融|财经|stock|quote|price|finance|crypto|ticker)/i.test(userMessage);
        const wantsTools = Boolean(options.toolEnabled || wantsFreshInfo || wantsCrypto || wantsMath || wantsProject || wantsMarket);
        const mode = wantsFreshInfo ? 'research' : wantsTools ? 'agent' : 'chat';

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
            maxIterations: mode === 'research' ? (wantsAcademicResearch ? 12 : 14) : mode === 'agent' ? 4 : 1,
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

    buildAgentSystemPrompt(plan) {
        const researchPolicy = plan.researchProfile === 'academic'
            ? [
                '- Academic research mode: prefer primary sources over broad search. Go directly to arXiv, Nature, Science, Optica/OSA, IEEE, ACM, PubMed, official journal/conference pages, or known project papers when the target source is obvious.',
                '- For academic questions, use web_research depth="fast" at most once as a map. If broad results are noisy, immediately pivot to site-targeted search_urls queries such as site:arxiv.org, site:nature.com, site:science.org, site:opg.optica.org, site:ieeexplore.ieee.org, then read_webpage on the best primary sources.',
                '- Do not spend repeated iterations on generic search once useful primary-source candidates exist.'
            ]
            : [
                '- For broad community scans, call community_snapshot first. It has dedicated routes for Hacker News, GitHub Trending, V2EX, Reddit, Lobsters, and Product Hunt and should be preferred over generic page reads for those sites.',
                '- For news, communities, products, and current events, use web_research depth="fast" only when source discovery is unclear; use depth="deep" or read_webpage for evidence that affects the final answer.',
                '- For broad community scans, preserve breadth before synthesis: cover several distinct communities when relevant, such as Hacker News, GitHub Trending, Product Hunt, V2EX, Reddit/Lobsters, official blogs, or security/news sources. Do not collapse the answer into a shallow daily digest if the user asked for research.',
                '- The final answer should include structured findings, cross-source patterns, source notes, and uncertainty. Do not append a forced one-sentence summary unless the user explicitly asks for one.'
            ];

        const finalAnswerStyle = [
            '- Final answer style contract for research/community scans:',
            '  - Do not add a section titled "one-sentence summary", "一句话总结", "TL;DR", "今日脉搏", or any equivalent final slogan unless the user explicitly asks for it.',
            '  - End with a compact "Sources" / "来源" section that maps each cited source id to its title or site and URL when URLs are available.',
            '  - Inline claims may cite [1], [2], but the closing section should be the source list, not a rhetorical summary.',
            '  - If a source id has no URL because a tool returned only a snapshot, label it as a tool snapshot and name the originating community.'
        ];

        return [
            'Agent runtime policy:',
            '- Treat the conversation as a bounded run with these phases: plan, route, act, observe, synthesize.',
            '- For current, external, fast-changing, recommended, price/policy/version/news, or citation-sensitive claims, do not answer from memory.',
            ...researchPolicy,
            ...finalAnswerStyle,
            '- Use one canonical tool for each action: community_snapshot for community dashboards, web_research for broad maps, search_urls for narrow targeted queries, read_webpage for opening URLs. Avoid duplicate alias tools and avoid looping over equivalent searches.',
            '- Prefer 2-5 high-signal source checks before final synthesis when the answer depends on external facts.',
            '- For broad landscape questions, 2-5 sources is a floor, not a cap; gather enough distinct source families to support the scope.',
            '- Cite source ids such as [1], [2] when tool results provide them.',
            '- Evidence discipline: distinguish opened source content, search snippets, community snapshots, and your own inference. Do not present snippets, failed reads, or fallback search results as confirmed facts.',
            '- If a source could not be opened, was blocked, or came from a fallback route, say so explicitly in the final answer.',
            '- After observing tool results, synthesize a direct final answer instead of narrating internal tool mechanics.',
            '- If a tool fails, adapt once if useful, then explain the useful residual result.',
            `- Research profile: ${plan.researchProfile}.`,
            `- Current run mode: ${plan.mode}. Max tool iterations: ${plan.maxIterations}.`
        ].join('\n');
    }

    async run({ messages, userMessage, enableThinking, toolEnabled, hasAttachments = false, container }) {
        const plan = this.createPlan(userMessage, { toolEnabled, hasAttachments, messages });
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
            response.agent_run = this.snapshotRun(container, plan);
            return response;
        }

        const tools = this.registry.getToolDefinitions(plan.selectedTools);
        let finalResponse = null;
        let latestStreamedContent = '';
        let hasDisplayedContent = false;
        const collectedToolCalls = [];
        const runState = this.createRunState(plan);

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
            },
            onIterationStart: iteration => {
                this.recordIteration(runState, iteration);
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
                this.ui.addAgentTrace(container, 'observe', `Iteration ${iteration}: ${count} tool call(s) observed.`);
            },
            executeToolFn: async (name, args) => {
                this.assertToolInput(name, args);
                const result = await this.registry.execute(name, args);
                return this.capToolResultForModel(result);
            }
        });

        this.ui.setAgentStage(container, 'act', 'done', 'Tool loop complete');
        this.ui.setAgentStage(container, 'observe', 'done', 'Results summarized');
        this.ui.setAgentStage(container, 'synthesize', 'active', 'Final synthesis');
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
            runId: plan.runId,
            mode: plan.mode,
            selectedTools: plan.selectedTools,
            maxIterations: plan.maxIterations,
            stages,
            traces,
            metrics: runState?.metrics || null,
            warnings: runState?.warnings || [],
            tool_results: runState?.toolCalls || [],
            evidence_ledger: runState?.evidenceLedger || []
        };
    }

    createRunState(plan) {
        return {
            runId: plan.runId,
            startedAt: new Date().toISOString(),
            finishedAt: null,
            metrics: {
                iterations: 0,
                tool_calls: 0,
                successful_tool_calls: 0,
                failed_tool_calls: 0,
                evidence_items: 0,
                unique_source_urls: 0,
                citation_markers: 0,
                has_sources_section: false
            },
            toolCalls: [],
            evidenceLedger: [],
            warnings: []
        };
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
        this.extractEvidenceEntries(toolName, result).forEach(entry => this.addEvidenceEntry(runState, entry));
    }

    finalizeRunState(runState, finalContent) {
        if (!runState) return;
        const text = String(finalContent || '');
        const citations = new Set(Array.from(text.matchAll(/\[(\d+)\]/g)).map(match => match[1]));
        runState.metrics.citation_markers = citations.size;
        runState.metrics.has_sources_section = /(^|\n)\s*(sources|source|references|来源|参考|鏉ユ簮)\s*[:：]?/i.test(text);
        runState.finishedAt = new Date().toISOString();
        runState.metrics.evidence_items = runState.evidenceLedger.length;
        runState.metrics.unique_source_urls = new Set(runState.evidenceLedger.map(item => item.url).filter(Boolean)).size;

        if (runState.evidenceLedger.length > 0 && citations.size === 0) {
            runState.warnings.push('Evidence was collected, but the final answer has no numeric citation markers.');
        }
        if (runState.evidenceLedger.length > 0 && !runState.metrics.has_sources_section) {
            runState.warnings.push('Evidence was collected, but the final answer has no explicit Sources/References section.');
        }
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
        const key = [entry.kind, entry.source_id, entry.url, entry.title].filter(Boolean).join('|').toLowerCase();
        if (runState.evidenceLedger.some(existing => existing.dedupe_key === key)) return;
        runState.evidenceLedger.push({ ...entry, dedupe_key: key });
        runState.metrics.evidence_items = runState.evidenceLedger.length;
        runState.metrics.unique_source_urls = new Set(runState.evidenceLedger.map(item => item.url).filter(Boolean)).size;
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
