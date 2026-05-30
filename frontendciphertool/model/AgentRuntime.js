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
        const directFreshInfo = /(最新|今天|现在|昨天|今年|新闻|搜索|查找|联网|网上|网页|网址|资料|来源|引用|链接|官网|文档|价格|政策|法规|版本|更新|发布|趋势|社区|前沿|现状|进展|进度|到了什么|最佳实践|推荐|对比|排名|论文|研究|评测|天气|current|latest|today|news|search|web|url|source|citation|weather|price|release|version|docs|documentation|paper|benchmark|recommend|compare|trend|state of the art|frontier|progress)/i.test(rawMessage)
            || this.hasFreshInfoSignal(rawMessage);
        const directCommunityScan = /(前沿社区|技术社区|开发者社区|社区|hacker news|github trending|product hunt|v2ex|reddit|lobsters)/i.test(rawMessage);
        const terseResearchFollowUp = /^(继续|继续吧|获取|获取吧|总结|总结吧|告诉我|说吧|再查|再查一下|查吧|拉出来|展开|深挖|继续获取|开始)$/i.test(rawMessage.trim());
        const directNewsBrief = this.isBroadDailyNewsRequest(rawMessage);
        const hasRecentResearchContext = /(web_research|read_webpage|search_urls|agent run 状态|["']?mode["']?\s*:\s*["']?(research|news_brief)|["']?researchprofile["']?\s*:\s*["']?news_brief|论文|研究|学术|来源|引用|检索|前沿|github trending|hacker news|product hunt|nature photonics|arxiv|doi|source ids?)/i.test(recentText);
        const hasRecentCommunityContext = /(社区|community|github trending|hacker news|product hunt|v2ex|reddit|lobsters|local llama|localllama)/i.test(recentText);
        const wantsCommunityScan = directCommunityScan || (terseResearchFollowUp && hasRecentCommunityContext);
        const directAcademicResearch = !wantsCommunityScan && /(学术|论文|研究|研究进展|研究到了|前沿|前沿研究|综述|光学|光子|量子|物理|材料|生物|医学|化学|arxiv|nature|science|optica|ieee|acm|pubmed|doi|paper|academic|literature|review|benchmark|state of the art)/i.test(rawMessage);
        const hasRecentAcademicContext = /(论文|学术|研究进展|前沿研究|arxiv|nature|science|optica|ieee|acm|pubmed|doi|paper|academic|literature|journal|conference|nature photonics)/i.test(recentText);
        const wantsAcademicResearch = directAcademicResearch || (terseResearchFollowUp && hasRecentAcademicContext);
        const wantsNewsBrief = directNewsBrief || (terseResearchFollowUp && /["']?mode["']?\s*:\s*["']?news_brief|["']?researchprofile["']?\s*:\s*["']?news_brief/i.test(recentText));
        const wantsFreshInfo = wantsNewsBrief || wantsAcademicResearch || directFreshInfo || (terseResearchFollowUp && hasRecentResearchContext);
        const newsBriefScope = wantsNewsBrief ? this.getNewsBriefScope(rawMessage) : null;
        const focusedNewsBrief = newsBriefScope && newsBriefScope.focus !== 'broad';
        const wantsCrypto = /(base64|凯撒|caesar|morse|摩斯|rot13|hex|哈希|hash|维吉尼亚|vigenere|频率|二进制|binary|url编码|解码|加密|解密|cipher)/i.test(userMessage);
        const wantsMath = /(计算|换算|单位|随机|calculate|convert|math|sqrt|sin|cos|\d+\s*[+\-*/%]\s*\d+)/i.test(userMessage);
        const wantsProject = !hasAttachments && /(代码|项目|文件|目录|读取|搜索文件|构建|测试|补丁|修改|java|javascript|css|html|read file|search files|build|test|patch|code|project|workspace)/i.test(userMessage);
        const wantsMarket = /(股票|行情|股价|币价|金融|财经|stock|quote|price|finance|crypto|ticker)/i.test(userMessage);
        const wantsTools = Boolean(options.toolEnabled || wantsFreshInfo || wantsCrypto || wantsMath || wantsProject || wantsMarket);
        const mode = wantsNewsBrief ? 'news_brief' : wantsFreshInfo ? 'research' : wantsTools ? 'agent' : 'chat';
        const researchLike = this.isResearchLikeMode(mode);
        const baseResearchSourceTarget = wantsNewsBrief ? (focusedNewsBrief ? 24 : 32) : 28;
        const baseResearchCitationTarget = wantsNewsBrief ? (focusedNewsBrief ? 12 : 18) : wantsCommunityScan ? 20 : 18;
        const researchSourceTarget = baseResearchSourceTarget * 2;
        const researchCitationTarget = baseResearchCitationTarget * 2;
        const researchIterations = wantsNewsBrief ? (focusedNewsBrief ? 34 : 42) : wantsCommunityScan ? 48 : wantsAcademicResearch ? 36 : 36;

        const selectedTools = this.routeTools({
            text,
            wantsFreshInfo,
            wantsCrypto,
            wantsMath,
            wantsProject,
            wantsMarket,
            wantsTools,
            hasAttachments,
            wantsAcademicResearch,
            wantsNewsBrief
        });

        return {
            runId: `run-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
            mode,
            researchProfile: wantsNewsBrief ? 'news_brief' : wantsAcademicResearch ? 'academic' : wantsFreshInfo ? 'general' : 'none',
            newsBriefScope,
            selectedTools,
            maxIterations: researchLike ? researchIterations : mode === 'agent' ? 4 : 1,
            sourceTarget: researchLike ? researchSourceTarget : 0,
            citationTarget: researchLike ? researchCitationTarget : 0,
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
        const newsBrief = ['get_current_date', 'get_current_time', 'news_query', 'web_research', 'search_urls', 'read_webpage'];
        const academicResearch = ['web_research', 'search_urls', 'read_webpage'];
        const codexWeb = ['search_query', 'open_url', 'find_in_page', 'open', 'find', 'get_time', 'time', 'weather', 'news_query'];
        const project = ['list_files', 'read_file', 'search_files', 'file_info', 'update_plan'];
        const codeOps = ['propose_patch', 'run_tests', 'run_build'];
        const market = ['finance_query'];
        const utility = ['random_number', 'uuid_generate', 'unit_convert'];

        const selected = new Set(core);
        if (intent.wantsCrypto) crypto.forEach(name => selected.add(name));
        if (intent.wantsNewsBrief) newsBrief.forEach(name => selected.add(name));
        else if (intent.wantsFreshInfo) (intent.wantsAcademicResearch ? academicResearch : research).forEach(name => selected.add(name));
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
        const researchPolicy = plan.researchProfile === 'news_brief'
            ? this.buildNewsBriefPolicy(sourceTarget, citationTarget, plan.newsBriefScope)
            : plan.researchProfile === 'academic'
            ? [
                '- Academic research mode: prefer primary sources over broad search. Go directly to arXiv, Nature, Science, Optica/OSA, IEEE, ACM, PubMed, official journal/conference pages, or known project papers when the target source is obvious.',
                '- For academic questions, use web_research depth="fast" at most once only as a map. For the evidence pass, use web_research depth="deep" read_top=true max_results=28-32, then pivot to site-targeted search_urls queries such as site:arxiv.org, site:nature.com, site:science.org, site:opg.optica.org, site:ieeexplore.ieee.org, and read_webpage on the best primary sources.',
                `- Aim for at least ${sourceTarget} distinct primary or high-authority source URLs and cite at least ${citationTarget} useful sources when available. If the first pass is sparse, run one narrower targeted follow-up instead of synthesizing early.`,
                '- Do not spend repeated iterations on generic search once useful primary-source candidates exist.'
            ]
            : [
                '- For broad community scans, call community_snapshot first. It has dedicated routes for Hacker News, GitHub Trending, V2EX, Reddit, Lobsters, and Product Hunt and should be preferred over generic page reads for those sites.',
                '- For news, communities, products, and current events, use web_research depth="deep" read_top=true max_results=28-32 for the main evidence pass. Use depth="fast" only for a preliminary map when the source landscape is unclear.',
                '- For broad daily news briefs, cover domestic, international, finance/markets, technology, and society/sports/culture before final synthesis. Use general news home/rolling pages first; do not substitute AI company blogs unless the user asked for AI/technology news.',
                '- For broad community scans, preserve breadth before synthesis: cover several distinct communities when relevant, such as Hacker News, GitHub Trending, Product Hunt, V2EX, Reddit/Lobsters, official blogs, or security/news sources. Do not collapse the answer into a shallow daily digest if the user asked for research.',
                `- Aim for at least ${sourceTarget} distinct source URLs or community items and cite at least ${citationTarget} useful sources when available. If fewer than 28 distinct sources or fewer than 12 readable evidence items are available, run narrower follow-ups with web_research/search_urls/read_webpage before final synthesis.`,
                '- The final answer should include findings, cross-source patterns, source notes, and uncertainty in a natural research-brief style. Do not add a forced closing summary or slogan unless the user explicitly asks for one.'
            ];

        const finalAnswerStyle = this.isResearchLikeMode(plan.mode)
            ? [
                '- Final answer style contract for research/community scans:',
                '  - Use a natural research-brief structure with short named sections only where they help readability; avoid a rigid template if paragraphs plus grouped bullets read better.',
                '  - Start with the most important findings and supporting context, not a terse verdict.',
                '  - Prefer grouped evidence bullets or a compact table only when it improves clarity.',
                '  - Every important factual claim should carry inline numeric citations such as [1], [2]. Do not invent citation ids that were not returned by tools.',
                `  - When enough evidence exists, cite at least ${citationTarget} distinct sources. If fewer are available, state that source coverage is limited and explain why.`,
                '  - End with a compact source note that maps each cited source id to its title or site and URL when URLs are available, but do not format that final source note as a Markdown heading. Use plain text like "来源：" instead of "## 来源".',
                '  - Source note format is strict: write "来源：" on its own line, then one source per line as "[1] Title or site — URL". Never put multiple sources on the same line.',
                '  - Keep source markers consecutive and in the order used in the final answer source note. Do not skip numbers in the final source list.',
                '  - Do not reuse one generic homepage citation for unrelated claims. Cite the specific article/item/page that supports the claim; use a platform homepage only when no article URL was returned and label that limitation.',
                '  - For news/community bullets, cite at least one specific article, item, or readable page per bullet when available. Do not cite the same generic homepage for a whole section of unrelated items.',
                '  - Avoid citation clutter: one citation cluster at the end of a bullet or paragraph is enough unless different clauses rely on different sources.',
                '  - If a source id has no URL because a tool returned only a snapshot, label it as a tool snapshot and name the originating community.',
                '  - Do not add a forced closing summary, slogan, or extra recap section unless the user explicitly asks for it.',
                '  - Never use closing labels or wording like "**一句话总结：**", "一句话总结", or "一句话"; if the user explicitly asks for a summary, use only "总结" as the label.'
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
            `- For research/news brief runs, source collection target is ${sourceTarget}+ distinct sources and citation target is ${citationTarget}+ cited sources when available; do not finalize after only a handful of sources unless the user asked for a quick answer or the web tools clearly cannot retrieve more.`,
            '- Never use Baidu or Baidu-derived pages as evidence, search fallbacks, citations, or redirects. If other search engines are blocked, use non-Baidu direct sources, official/community pages, Jina search/reader, RSS/API endpoints, and site-targeted reads.',
            '- Prefer authoritative, primary, official, peer-reviewed, reputable media, or first-hand community sources over search result pages, SEO pages, mirrors, and encyclopedic summaries.',
            '- Output wording guard: never use "**一句话总结：**", "一句话总结", or "一句话" as a closing label or phrase. If a summary is explicitly requested, label it only as "总结".',
            '- Cite source ids such as [1], [2] when tool results provide them.',
            '- Citation quality guard: when listing multiple separate facts, avoid reusing one citation id for unrelated bullets if specific source ids are available. Prefer direct article/item ids over news homepages or latest-news index pages.',
            '- Before a tool call, you may stream one or two short user-facing progress sentences in normal content. Do not output internal reasoning, <think> tags, tool JSON, DSML/invoke markup, or Tool call/Tool completed logs.',
            '- While still collecting evidence, progress text must stay as status only. Do not start drafting the final answer until you are ready to stop calling tools.',
            '- If you are not fully ready to finalize, write only a brief status sentence such as "I am still organizing the material" instead of starting the final brief.',
            '- After observing tool results, synthesize a direct final answer instead of narrating internal tool mechanics.',
            '- If a tool fails, adapt once if useful, then explain the useful residual result.',
            `- Research profile: ${plan.researchProfile}.`,
            `- Current run mode: ${plan.mode}. Max tool iterations: ${plan.maxIterations}. Source target: ${plan.sourceTarget || 0}. Citation target: ${plan.citationTarget || 0}.`
        ].join('\n');
    }

    buildNewsBriefPolicy(sourceTarget, citationTarget, scope = null) {
        const focus = scope?.focus || 'broad';
        const label = this.getNewsBriefScopeLabel(scope);
        if (focus !== 'broad') {
            return [
                `- News brief route: this is a focused daily news briefing for ${label}, not a generic research run.`,
                '- First tool pass should establish date and focused coverage: call get_current_date, then use news_query and web_research for the requested news category.',
                `- Main evidence pass: use web_research mode="news_brief" or mode="news" with max_results=24-28, read_top=true, and query variants that all target ${label} from multiple reputable outlets and regions.`,
                '- Direct source reads are mandatory when coverage is thin. Prefer readable general news pages and category pages over search result pages.',
                '- Do not broaden into unrelated categories unless the user asked for a broad cross-category brief. Keep the answer scoped to the requested category.',
                '- If Reuters/AP or other sources return 451/429, skip them and continue with accessible reputable sources such as BBC, Guardian, Sina, Chinanews, NetEase, CNBC, NBD, CCTV, People, or other readable outlets.',
                '- Do not use OpenAI, Anthropic, DeepMind, Google AI, Microsoft AI, Hugging Face, GitHub AI, The Batch, or AI-only sections as dominant sources unless the user explicitly asked for AI/technology news.',
                `- Aim for ${sourceTarget}+ distinct source URLs and cite ${citationTarget}+ useful sources when available, but prioritize on-topic source diversity over unrelated breadth.`,
                `- Final format should read like a ${label} news brief: start with a short lead, then group important stories by theme or region. Keep the vivid, plain-language one-line interpretation style when evidence supports it, and answer in the user language.`
            ];
        }
        return [
            '- News brief route: this is a broad daily news briefing, not a generic research run.',
            '- First tool pass should establish date and broad coverage: call get_current_date, then use news_query for at least world/international, finance/markets, technology, and general China/domestic keywords when useful.',
            '- Main evidence pass: use web_research mode="news_brief" or mode="news" with max_results=28-32, read_top=true, and queries that separately target domestic China, international/world, finance/markets, technology/science, and society/sports/culture.',
            '- Direct source reads are mandatory when broad coverage is thin. Prefer readable general news pages such as Sina News, China News Service, NetEase Latest News, BBC News, Reuters World/Business/Markets, CNBC Markets, CCTV News 30, and National Business Daily.',
            '- If Reuters/AP/The Verge/Wired return 451/429 or section-only pages, do not let those failures narrow the answer to AI. Continue with accessible general sources such as Sina, Chinanews, NetEase, BBC, CNBC, NBD, CCTV, People, or Guardian.',
            '- Do not use OpenAI, Anthropic, DeepMind, Google AI, Microsoft AI, Hugging Face, GitHub AI, The Batch, or AI-only sections as dominant sources unless the user explicitly asked for AI/technology news.',
            '- Coverage gate before synthesis: include at least domestic, international, finance/markets, technology/science, and society/sports/culture. If one section is weak, explicitly say so and explain the retrieval gap.',
            `- Aim for ${sourceTarget}+ distinct source URLs and cite ${citationTarget}+ useful sources when available, but prioritize category breadth over repeating similar AI/company sources.`,
            '- Final format should read like a daily news brief: start with a short lead, then grouped sections such as \u56fd\u9645, \u56fd\u5185, \u79d1\u6280, \u8d22\u7ecf, \u4f53\u80b2/\u6587\u5a31/\u793e\u4f1a. Keep the vivid, plain-language one-line interpretation style when evidence supports it, and answer in the user language.'
        ];
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
            newsBriefScope: plan.newsBriefScope || null,
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
            maxIterations: plan.maxIterations
        }, { stage: 'plan', visibility: 'history' });
        this.ui.createAgentRunPanel(container, plan);
        this.ui.setAgentStage(container, 'plan', 'active', '解析任务目标');
        this.ui.addAgentTrace(container, 'plan', `Run ${plan.runId} initialized in ${plan.mode} mode.`);

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

        if (!plan.selectedTools.length) {
            this.ui.setAgentStage(container, 'synthesize', 'active', '生成回复');
            this.emitEvent(runState, 'model.started', {
                toolsEnabled: false,
                enableThinking: Boolean(enableThinking)
            }, { stage: 'synthesize', visibility: 'history' });
            const response = await this.client.chat({
                messages: agentMessages,
                enableThinking,
                onReasoning: () => { },
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
            if (response) {
                response.reasoning_content = null;
            }
            response.agent_run = this.snapshotRun(container, plan, runState);
            return response;
        }

        const tools = this.registry.getToolDefinitions(plan.selectedTools);
        let finalResponse = null;
        let latestStreamedContent = '';
        let hasDisplayedContent = false;
        let hasSuppressedToolIterationContent = false;
        let shouldReplayFinalContent = false;
        let forcedCoverageFollowups = 0;
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
        };
        this.ui.setAgentStage(container, 'act', 'active', '等待模型选择工具');

        finalResponse = await this.client.chatWithTools({
            messages: agentMessages,
            tools,
            enableThinking,
            maxIterations: plan.maxIterations,
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
            shouldContinueAfterFinal: ({ iteration }) => {
                const followUp = this.buildForcedResearchFollowUp(plan, runState, userMessage, forcedCoverageFollowups);
                if (!followUp) return null;
                forcedCoverageFollowups += 1;
                this.ui.setAgentStage(container, 'act', 'active', `Coverage follow-up ${forcedCoverageFollowups}`);
                this.ui.addAgentTrace(container, 'act', `Coverage gate requested more sources at iteration ${iteration}.`);
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
            } else if (normalizedFinalContentChanged || finalResponse.content !== latestStreamedContent) {
                this.ui.updateContent(container, finalResponse.content);
            }
        }

        this.ui.setAgentStage(container, 'synthesize', 'done', '完成');
        this.ui.addAgentTrace(container, 'synthesize', 'Final answer synthesized from the run state.');
        if (finalResponse) {
            finalResponse.reasoning_content = null;
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

        const frameCount = Math.min(140, Math.max(24, Math.ceil(text.length / 48)));
        const chunkSize = Math.max(16, Math.ceil(text.length / frameCount));
        for (let index = chunkSize; index < text.length; index += chunkSize) {
            this.ui.updateContent(container, text.slice(0, index));
            await new Promise(resolve => setTimeout(resolve, 16));
        }
        this.ui.updateContent(container, text);
    }

    normalizeFinalResearchAnswer(content, plan, runState = null) {
        const text = String(content || '');
        const hasEvidence = Array.isArray(runState?.evidenceLedger) && runState.evidenceLedger.length > 0;
        const hasSourceSection = /(^|\n)\s*(\u6765\u6e90|\u53c2\u8003|Sources|References)\s*[:\uff1a]?/i.test(text);
        if (!text || (!this.isResearchLikeMode(plan?.mode) && !hasEvidence && !hasSourceSection)) return text;
        return this.normalizeSourceSection(text, runState);
    }

    normalizeSourceSection(text, runState = null) {
        const value = String(text || '').trimEnd();
        const matches = Array.from(value.matchAll(/(^|\n)\s*(来源|Sources|References|参考)\s*[:：]?\s*/gi));
        if (!matches.length) return value;

        const match = matches[matches.length - 1];
        const headingStart = match.index + (match[1] ? match[1].length : 0);
        const before = value.slice(0, headingStart).trimEnd();
        const sourceBlock = value.slice(headingStart);
        const heading = sourceBlock.match(/^\s*(来源|Sources|References|参考)\s*[:：]?\s*/i);
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
        const evidenceIndex = this.buildEvidenceSourceIndex(runState?.evidenceLedger || []);
        const evidenceCatalog = this.buildEvidenceCitationCatalog(runState?.evidenceLedger || []);
        const enriched = this.enrichCitationSpecificity(before, rawSourceMap, evidenceIndex, evidenceCatalog);
        enriched.extraSources.forEach((body, id) => {
            if (body && !rawSourceMap.has(id)) rawSourceMap.set(id, body);
        });
        const bodyForCitations = enriched.text || before;
        const citedIds = this.extractCitationMarkers(bodyForCitations);
        const sourceOrder = citedIds.length
            ? citedIds
            : sourceMatches.map(item => String(item[1]));

        const idMap = new Map();
        const seenEntries = new Map();
        const entries = [];
        sourceOrder.forEach(oldId => {
            const body = this.buildDetailedSourceBody(oldId, rawSourceMap, evidenceIndex);
            if (!body) return;
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
        if (!entries.length) return value;

        const normalizedBody = bodyForCitations.replace(/\[(\d+)\]/g, (marker, id) => {
            return idMap.has(id) ? `[${idMap.get(id)}]` : marker;
        });
        const cleanedBody = this.cleanRepeatedCitationMarkers(normalizedBody);
        const sourceLines = entries.map(entry => `[${entry.newId}] ${entry.body}`);
        return `${cleanedBody}\n\n来源：\n${sourceLines.join('\n')}`;
    }

    enrichCitationSpecificity(body, rawSourceMap, evidenceIndex, evidenceCatalog) {
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
            const shouldImprove = ids.some(id => this.shouldImproveCitationSource(id, citationCounts, rawSourceMap, evidenceIndex));
            if (!shouldImprove) return line;

            const claimText = line.replace(/\[(\d+)\]/g, ' ');
            const match = this.findBestEvidenceForClaim(claimText, catalog, usedEvidenceKeys);
            if (!match || match.score < 8) return line;

            const sourceBody = this.formatEvidenceSource(match.entry);
            if (!sourceBody) return line;
            const sourceId = String(nextSourceId++);
            extraSources.set(sourceId, sourceBody);
            usedEvidenceKeys.add(this.getEvidenceCandidateKey(match.entry));

            if (/(?:\s*\[\d+\])+\s*$/.test(line)) {
                return line.replace(/(?:\s*\[\d+\])+\s*$/, ` [${sourceId}]`);
            }
            return `${line} [${sourceId}]`;
        });

        return { text: lines.join('\n'), extraSources };
    }

    countCitationMarkers(text) {
        const counts = new Map();
        Array.from(String(text || '').matchAll(/\[(\d+)\]/g)).forEach(match => {
            const id = String(match[1]);
            counts.set(id, (counts.get(id) || 0) + 1);
        });
        return counts;
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

    shouldImproveCitationSource(sourceId, citationCounts, rawSourceMap, evidenceIndex) {
        const id = String(sourceId);
        const repeated = (citationCounts.get(id) || 0) >= 3;
        const body = this.buildDetailedSourceBody(id, rawSourceMap, evidenceIndex);
        if (!body) return repeated;
        return repeated || this.isGenericSourceReference(body);
    }

    isGenericSourceReference(body) {
        const text = this.cleanOneLine(body || '').toLowerCase();
        if (!text) return true;
        return /general index page|no specific article url returned|\/news\/?$|\/news\/world\/?$|news\.sina\.com\.cn\/?$|news\.163\.com\/latest\/?$|people\.com\.cn\/?$|nbd\.com\.cn\/?$/i.test(text)
            || /^(bbc news|bbc world|reuters|ap news|associated press|guardian|cnbc|sina news|netease news|source|sources|references|来源|参考)/i.test(text);
    }

    buildEvidenceCitationCatalog(evidence = []) {
        const seen = new Set();
        return (Array.isArray(evidence) ? evidence : [])
            .filter(entry => entry && !entry.error && (entry.title || entry.url))
            .filter(entry => !this.isGenericSourceHomepage(entry.title || '', entry.url || ''))
            .map(entry => ({ ...entry, _candidateKey: this.getEvidenceCandidateKey(entry) }))
            .filter(entry => {
                if (!entry._candidateKey || seen.has(entry._candidateKey)) return false;
                seen.add(entry._candidateKey);
                return true;
            })
            .sort((a, b) => this.scoreEvidenceSource(b) - this.scoreEvidenceSource(a))
            .slice(0, 80);
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

    cleanClaimForCitationMatch(value) {
        return this.cleanOneLine(value || '')
            .replace(/^#+\s*/, '')
            .replace(/^\s*[\d一二三四五六七八九十]+[.)、\s-]+/, '')
            .replace(/\[(\d+)\]/g, ' ')
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

    buildDetailedSourceBody(sourceId, rawSourceMap, evidenceIndex) {
        const evidence = evidenceIndex.get(String(sourceId));
        if (evidence) return this.formatEvidenceSource(evidence);
        return rawSourceMap.get(String(sourceId)) || `工具来源 ID ${sourceId} — 详情未返回`;
    }

    buildEvidenceSourceIndex(evidence = []) {
        const index = new Map();
        (Array.isArray(evidence) ? evidence : []).forEach(entry => {
            const sourceId = String(entry?.source_id ?? '').trim();
            if (!sourceId) return;
            if (!entry?.title && !entry?.url) return;
            const existing = index.get(sourceId);
            if (!existing || this.scoreEvidenceSource(entry) > this.scoreEvidenceSource(existing)) {
                index.set(sourceId, entry);
            }
        });
        return index;
    }

    scoreEvidenceSource(entry) {
        let score = 0;
        if (entry?.url) score += 4;
        if (entry?.title) score += 3;
        if (entry?.snippet || entry?.content_preview) score += 1;
        if (['opened_source', 'opened_page'].includes(entry?.kind)) score += 4;
        if (entry?.error) score -= 8;
        return score;
    }

    formatEvidenceSource(entry) {
        const title = this.cleanOneLine(entry?.title || '');
        const url = this.cleanUrl(entry?.url || '');
        const host = this.extractHostname(url);
        const snippet = this.cleanOneLine(entry?.snippet || entry?.content_preview || '');
        const genericHomepage = this.isGenericSourceHomepage(title, url);
        const parts = [];
        if (title) parts.push(title);
        if (genericHomepage) parts.push('general index page; no specific article URL returned');
        if (host && (!title || !title.toLowerCase().includes(host))) parts.push(host);
        if (url) parts.push(url);
        if (!url && entry?.community) parts.push(`${entry.community} tool snapshot`);
        if (snippet && (title.length < 24 || /^(bbc news|reuters|ap news|网易新闻中心|新浪新闻|来源|source)$/i.test(title))) {
            parts.push(this.previewValue(snippet, 120).replace(/\s+/g, ' '));
        }
        return parts.filter(Boolean).join(' — ');
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
        return String(value || '')
            .replace(/\s+/g, ' ')
            .replace(/^[\-—–:：]\s*/, '')
            .trim();
    }

    buildForcedResearchFollowUp(plan, runState, userMessage, forcedCount = 0) {
        const isNewsBriefRun = plan?.researchProfile === 'news_brief' || plan?.mode === 'news_brief';
        if (!isNewsBriefRun && !this.isBroadDailyNewsRequest(userMessage)) {
            if (!this.isResearchLikeMode(plan?.mode) || forcedCount >= 3) return null;
            return this.buildGenericResearchFollowUp(plan, runState, userMessage);
        }
        if (forcedCount >= 2) return null;

        const evidence = Array.isArray(runState?.evidenceLedger) ? runState.evidenceLedger : [];
        const stats = this.getResearchEvidenceStats(evidence);
        const domains = stats.hosts;
        const readableCount = stats.readableCount;
        const coverage = this.getDailyNewsCoverage(evidence);
        const scope = plan?.newsBriefScope || this.getNewsBriefScope(userMessage);
        const requiredCoverage = this.getRequiredNewsCoverageKeys(scope);
        const focusedNewsBrief = scope?.focus && scope.focus !== 'broad';
        const hasCoreSections = requiredCoverage.every(key => coverage[key]);
        const hasEnoughBreadth = focusedNewsBrief
            ? domains.size >= 6 && readableCount >= 3
            : domains.size >= 18 && readableCount >= 8;

        if (hasCoreSections && hasEnoughBreadth) return null;

        const missing = [];
        requiredCoverage.forEach(key => {
            if (!coverage[key]) missing.push(this.getNewsBriefCoverageLabel(key));
        });

        if (focusedNewsBrief) {
            const label = this.getNewsBriefScopeLabel(scope);
            return [
                'Coverage gate: do not finalize yet. Continue using tools.',
                `This is a focused ${label} news brief. Add more on-topic evidence before synthesis; do not broaden into unrelated categories.`,
                `Current readable source count: ${readableCount}; unique source domains/URLs: ${domains.size}; missing coverage: ${missing.join(', ') || label}.`,
                `Next pass: use web_research mode="news_brief" with query variants for ${label}, then use read_webpage on readable sources from multiple reputable outlets.`,
                'If Reuters/AP return 451, skip them and continue with accessible reputable sources. The final answer must stay scoped to the requested news category and remain in the user language.'
            ].join('\n');
        }

        return [
            'Coverage gate: do not finalize yet. Continue using tools.',
            'This is a broad daily news brief, not an AI/technology-only topic. Add general news coverage before synthesis.',
            `Current readable source count: ${readableCount}; unique source domains/URLs: ${domains.size}; missing coverage: ${missing.join(', ') || 'overall news breadth'}.`,
            'Next pass: use web_research mode="news_brief" with separate queries for domestic China, international/world, finance/markets, technology/science, and society/sports/culture, then use read_webpage on readable general sources.',
            'Prefer direct reads from these accessible general sources when search results are thin:',
            '- https://news.sina.com.cn/',
            '- https://www.chinanews.com.cn/',
            '- https://news.163.com/latest/',
            '- https://www.bbc.com/news',
            '- https://www.reuters.com/world/ or https://www.reuters.com/business/',
            '- https://www.cnbc.com/markets/ or https://www.nbd.com.cn/',
            'If Reuters/AP return 451, skip them and continue with Sina, Chinanews, NetEase, BBC, CNBC, NBD, CCTV, People, or Guardian.',
            'The final answer must cover international, domestic, finance/markets, technology/science, and society/sports/culture. If one remains weak after tool attempts, say so explicitly. Keep the final answer in the user language.'
        ].join('\n');
    }

    buildGenericResearchFollowUp(plan, runState, userMessage) {
        const evidence = Array.isArray(runState?.evidenceLedger) ? runState.evidenceLedger : [];
        const stats = this.getResearchEvidenceStats(evidence);
        const profile = plan?.researchProfile || 'general';
        const sourceTarget = Number(plan?.sourceTarget) || 28;
        const minUrls = profile === 'academic'
            ? Math.min(14, Math.max(10, Math.floor(sourceTarget * 0.45)))
            : Math.min(20, Math.max(14, Math.floor(sourceTarget * 0.6)));
        const minReadable = profile === 'academic' ? 4 : 6;

        if (stats.uniqueUrls >= minUrls && stats.readableCount >= minReadable) return null;

        const profileHint = profile === 'academic'
            ? 'Use targeted primary-source searches and direct reads: arXiv, Nature, Science, Optica/OSA, IEEE, ACM, PubMed, official journal/conference pages, and known project pages.'
            : 'Use web_research depth="deep" read_top=true max_results=28-32, then follow with search_urls/read_webpage for weak or missing angles.';
        const queryHint = this.previewValue(userMessage, 260).replace(/\s+/g, ' ');

        return [
            'Evidence gate: do not finalize yet. Continue using tools.',
            `The current research evidence is still shallow for this request. Query: ${queryHint}`,
            `Current evidence: ${stats.uniqueUrls} unique URLs, ${stats.hosts.size} unique hosts, ${stats.readableCount} readable evidence items, ${stats.candidateCount} search/community candidates, ${stats.errorCount} read errors.`,
            `Minimum before final synthesis for this run: about ${minUrls}+ unique URLs and ${minReadable}+ readable evidence items, unless the web is clearly blocked.`,
            profileHint,
            'After the next tool pass, synthesize only if the important claims can be backed by inline numeric citations and a clean final source list.'
        ].join('\n');
    }

    hasFreshInfoSignal(userMessage) {
        return /(\u4eca\u5929|\u4eca\u65e5|\u8fd9\u51e0\u5929|\u6700\u8fd1\u51e0\u5929|\u8fd1\u51e0\u5929|\u8fc7\u53bb\u51e0\u5929|\u6700\u8fd1|\u73b0\u5728|\u6700\u65b0|\u65b0\u95fb|\u5934\u6761|\u8981\u95fb|\u7b80\u62a5|\u641c\u7d22|\u67e5\u627e|\u8054\u7f51|\u6765\u6e90|\u5f15\u7528|\u94fe\u63a5|current|latest|today|recently|last few days|these days|news|headlines|brief|search|web|source|citation)/i.test(String(userMessage || ''));
    }

    isBroadDailyNewsRequest(userMessage) {
        const raw = String(userMessage || '');
        const text = raw.toLowerCase();
        const asksNews = /(\u4eca\u5929|\u4eca\u65e5|\u8fd9\u51e0\u5929|\u6700\u8fd1\u51e0\u5929|\u8fd1\u51e0\u5929|\u8fc7\u53bb\u51e0\u5929|\u6700\u8fd1|\u73b0\u5728|\u6700\u65b0|\u65b0\u95fb|\u5934\u6761|\u8981\u95fb|\u7b80\u62a5|news|today|recently|last few days|these days|headlines|daily brief|top stories)/i.test(raw);
        const categoryMatches = this.getNewsBriefCategoryMatches(raw).length;
        const broadScopeSignal = /(\u7efc\u5408|\u5168\u666f|\u603b\u89c8|\u5168\u90e8|\u5404\u7c7b|\u591a\u9886\u57df|\u56fd\u5185\u5916|\u6d77\u5185\u5916|overall|broad|across categories)/i.test(raw);
        const aggregateSignal = broadScopeSignal || /(\u5934\u6761|\u8981\u95fb|top news|headlines)/i.test(raw);
        const summarySignal = /(\u603b\u7ed3|\u6982\u89c8|\u6574\u7406|\u68b3\u7406|\u770b\u770b|\u6709\u4ec0\u4e48|\u54ea\u4e9b|\u7b80\u62a5|brief|summary|roundup|digest|overview)/i.test(raw);
        const simpleDailyNews = /(\u4eca\u5929|\u4eca\u65e5|\u6700\u65b0|today|daily).{0,12}(\u65b0\u95fb|\u5934\u6761|\u8981\u95fb|\u7b80\u62a5|news|headlines|brief)|(\u65b0\u95fb|\u5934\u6761|\u8981\u95fb|\u7b80\u62a5).{0,12}(\u4eca\u5929|\u4eca\u65e5|\u6700\u65b0|today|daily)/i.test(raw)
            || /^(\u65b0\u95fb|\u4eca\u65e5\u65b0\u95fb|\u4eca\u5929\u65b0\u95fb|news|today news)$/i.test(raw.trim());
        const recentEventsQuestion = /(\u8fd9\u51e0\u5929|\u6700\u8fd1\u51e0\u5929|\u8fd1\u51e0\u5929|\u8fc7\u53bb\u51e0\u5929|\u8fd9\u4e24\u5929|\u6700\u8fd1|recently|last few days|these days).{0,16}(\u53d1\u751f\u4e86\u4ec0\u4e48|\u6709\u4ec0\u4e48\u4e8b|\u6709\u4ec0\u4e48\u65b0\u95fb|\u5927\u4e8b|\u8981\u95fb|\u52a8\u6001|what happened|what is happening|what's going on)/i.test(raw);
        const aiSignal = /(^|[^a-z])ai([^a-z]|$)|\u4eba\u5de5\u667a\u80fd|\u5927\u6a21\u578b|\u667a\u80fd\u4f53|openai|anthropic|deepmind|llm|machine learning/i.test(text);
        const technologyOnlySignal = categoryMatches === 1 && /(\u79d1\u6280|\u79d1\u5b66|technology|science|tech)/i.test(raw);
        if (recentEventsQuestion && !(aiSignal || technologyOnlySignal)) return true;
        if (!asksNews) return false;
        if (categoryMatches >= 2 || broadScopeSignal) return true;
        if (aiSignal || technologyOnlySignal) return false;
        if (categoryMatches === 1) return summarySignal || aggregateSignal || simpleDailyNews;
        return aggregateSignal || summarySignal || simpleDailyNews;
    }

    getNewsBriefScope(userMessage) {
        const raw = String(userMessage || '');
        const categories = this.getNewsBriefCategoryMatches(raw);
        const broadScopeSignal = /(\u7efc\u5408|\u5168\u666f|\u603b\u89c8|\u5168\u90e8|\u5404\u7c7b|\u591a\u9886\u57df|\u56fd\u5185\u5916|\u6d77\u5185\u5916|overall|broad|across categories)/i.test(raw);
        const recentEventsQuestion = /(\u8fd9\u51e0\u5929|\u6700\u8fd1\u51e0\u5929|\u8fd1\u51e0\u5929|\u8fc7\u53bb\u51e0\u5929|\u8fd9\u4e24\u5929|\u6700\u8fd1|recently|last few days|these days).{0,16}(\u53d1\u751f\u4e86\u4ec0\u4e48|\u6709\u4ec0\u4e48\u4e8b|\u6709\u4ec0\u4e48\u65b0\u95fb|\u5927\u4e8b|\u8981\u95fb|\u52a8\u6001|what happened|what is happening|what's going on)/i.test(raw);
        const focus = !broadScopeSignal && !recentEventsQuestion && categories.length === 1
            ? categories[0]
            : 'broad';
        return {
            focus,
            categories: focus === 'broad' ? categories : [focus],
            broad: focus === 'broad'
        };
    }

    getNewsBriefCategoryMatches(userMessage) {
        const raw = String(userMessage || '');
        const tests = [
            ['domestic', /(\u56fd\u5185|\u4e2d\u56fd|china|domestic)/i],
            ['international', /(\u56fd\u9645|\u4e16\u754c|\u5168\u7403|world|international|global)/i],
            ['finance', /(\u8d22\u7ecf|\u7ecf\u6d4e|\u5e02\u573a|\u91d1\u878d|finance|business|market|markets|economy)/i],
            ['technology', /(\u79d1\u6280|\u79d1\u5b66|technology|science|tech)/i],
            ['society', /(\u793e\u4f1a|\u4f53\u80b2|\u5a31\u4e50|\u6587\u5a31|\u6587\u5316|society|sports|entertainment|culture)/i]
        ];
        return tests.filter(([, pattern]) => pattern.test(raw)).map(([key]) => key);
    }

    getRequiredNewsCoverageKeys(scope = null) {
        const focus = scope?.focus || 'broad';
        if (focus && focus !== 'broad') return [focus];
        return ['domestic', 'international', 'finance', 'technology', 'society'];
    }

    getNewsBriefScopeLabel(scope = null) {
        return this.getNewsBriefCoverageLabel(scope?.focus || 'broad');
    }

    getNewsBriefCoverageLabel(key) {
        const labels = {
            broad: 'broad daily news',
            domestic: 'domestic/China news',
            international: 'international/world news',
            finance: 'finance/markets news',
            technology: 'technology/science news',
            society: 'society/sports/culture news'
        };
        return labels[key] || 'news';
    }

    isResearchLikeMode(mode) {
        return mode === 'research' || mode === 'news_brief';
    }

    getEvidenceDomains(evidence = []) {
        return new Set(evidence
            .map(entry => this.extractHostname(entry?.url || ''))
            .filter(Boolean));
    }

    getResearchEvidenceStats(evidence = []) {
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
        const haystack = evidence.map(entry => [
            entry?.title,
            entry?.url,
            entry?.snippet,
            entry?.content_preview
        ].filter(Boolean).join(' ')).join('\n').toLowerCase();
        return {
            domestic: this.matchesAny(haystack, ['news.sina.com.cn', 'chinanews.com.cn', 'news.163.com', 'people.com.cn', 'xinhuanet.com', 'cctv.com', 'cctv.cn', 'thepaper.cn', '\u56fd\u5185', '\u4e2d\u56fd\u65b0\u95fb\u7f51', '\u7f51\u6613', '\u65b0\u6d6a']),
            international: this.matchesAny(haystack, ['bbc.com', 'reuters.com', 'apnews.com', 'theguardian.com', 'voachinese.com', 'world', 'international', 'global', '\u56fd\u9645', '\u4e16\u754c']),
            finance: this.matchesAny(haystack, ['business', 'finance', 'markets', 'market', 'cnbc.com', 'ft.com', 'bloomberg.com', 'nbd.com.cn', 'wallstreetcn.com', 'caixin.com', '\u8d22\u7ecf', '\u5e02\u573a', '\u7ecf\u6d4e', '\u91d1\u878d']),
            technology: this.matchesAny(haystack, ['technology', 'science', 'tech', 'theverge.com', 'techcrunch.com', 'arstechnica.com', 'wired.com', 'ithome.com', '36kr.com', '\u79d1\u6280', '\u79d1\u5b66', '\u4eba\u5de5\u667a\u80fd', '\u5927\u6a21\u578b']),
            society: this.matchesAny(haystack, ['society', 'sports', 'culture', 'entertainment', '\u793e\u4f1a', '\u4f53\u80b2', '\u5a31\u4e50', '\u6587\u5316', '\u6587\u5a31'])
        };
    }

    matchesAny(text, terms = []) {
        const value = String(text || '').toLowerCase();
        return terms.some(term => value.includes(String(term || '').toLowerCase()));
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
