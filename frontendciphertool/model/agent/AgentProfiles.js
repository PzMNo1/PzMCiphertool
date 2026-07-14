/**
 * AgentProfiles owns configurable agent policy surfaces.
 *
 * Intent detection still lives in AgentRuntime for now. This registry keeps
 * profile-owned tool preferences, synthesis policies, and target helpers out of
 * the run loop so future profile changes do not require editing orchestration.
 */
(function () {
    class AgentProfiles {
        constructor(runtime) {
            this.runtime = runtime;
            this.toolGroups = {
                core: ['get_current_date', 'get_current_time', 'calculate', 'text_analysis'],
                crypto: [
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
                ],
                research: ['community_snapshot', 'web_research', 'search_urls', 'read_webpage', 'news_query', 'get_weather'],
                newsBrief: ['get_current_date', 'get_current_time', 'news_query', 'web_research', 'search_urls', 'read_webpage'],
                academicResearch: ['web_research', 'search_urls', 'read_webpage'],
                codexWeb: ['search_query', 'open_url', 'find_in_page', 'open', 'find', 'get_time', 'time', 'weather', 'news_query'],
                project: ['list_files', 'read_file', 'search_files', 'file_info', 'update_plan'],
                codeOps: ['propose_patch', 'run_tests', 'run_build'],
                market: ['finance_query'],
                utility: ['random_number', 'uuid_generate', 'unit_convert'],
                agentEarth: ['agent_earth_run'],
                localService: ['web_research', 'search_urls', 'read_webpage', 'get_weather'],
                businessIntel: ['web_research', 'search_urls', 'read_webpage', 'news_query'],
                agentEarthSupport: ['web_research', 'search_urls', 'read_webpage']
            };
        }

        routeTools(intent) {
            if (!intent?.wantsTools) return [];
            const selected = new Set(this.toolGroups.core);
            const addGroup = groupName => (this.toolGroups[groupName] || []).forEach(name => selected.add(name));

            if (intent.wantsCrypto) addGroup('crypto');
            if (intent.wantsNewsBrief) addGroup('newsBrief');
            else if (intent.wantsFreshInfo) addGroup(intent.wantsAcademicResearch ? 'academicResearch' : 'research');
            if (intent.wantsMath) addGroup('utility');
            if (intent.wantsProject) {
                addGroup('project');
                addGroup('codeOps');
            }
            if (intent.wantsMarket) {
                addGroup('market');
                selected.add('news_query');
            }
            if (intent.wantsLocalService) addGroup('localService');
            if (intent.wantsBusinessIntel) addGroup('businessIntel');
            if (intent.wantsAgentEarth) {
                addGroup('agentEarth');
                if (!intent.wantsFreshInfo && !intent.wantsNewsBrief && !intent.wantsMarket) {
                    addGroup('agentEarthSupport');
                }
            }
            if (!intent.wantsCrypto && !intent.wantsFreshInfo && !intent.wantsMath && !intent.wantsProject && !intent.wantsMarket && !intent.wantsAgentEarth && !intent.hasAttachments) {
                ['crypto', 'research', 'codexWeb', 'project', 'utility'].forEach(group => addGroup(group));
            }

            return Array.from(selected).filter(name => this.runtime.isRoutableTool(name));
        }

        buildPlanParameters(intent) {
            const mode = intent?.mode || 'chat';
            const selectedTools = Array.isArray(intent?.selectedTools) ? intent.selectedTools : [];
            const researchLike = this.runtime.isResearchLikeMode(mode);
            const writingContract = intent?.writingContract?.active ? intent.writingContract : null;
            const writingGates = writingContract?.qualityGates || {};
            const focusedNewsBrief = Boolean(intent?.focusedNewsBrief);
            const baseResearchSourceTarget = intent?.wantsNewsBrief ? (focusedNewsBrief ? 24 : 32) : 28;
            const baseResearchCitationTarget = intent?.wantsNewsBrief
                ? (focusedNewsBrief ? 12 : 18)
                : intent?.wantsCommunityScan
                ? 20
                : 18;
            const writingSourceTarget = writingContract?.needsResearch
                ? Math.max(12, Number(writingGates.minSources || 0))
                : 0;
            const writingCitationTarget = writingContract?.needsCitations
                ? Math.max(6, Number(writingGates.minCitations || 0))
                : 0;
            const industrySourceTarget = intent?.wantsIndustryResearch ? Math.max(30, writingSourceTarget || 0) : 0;
            const industryCitationTarget = intent?.wantsIndustryResearch ? Math.max(22, writingCitationTarget || 0) : 0;
            const researchSourceTarget = Math.max(baseResearchSourceTarget, writingSourceTarget, industrySourceTarget);
            const researchCitationTarget = Math.max(baseResearchCitationTarget, writingCitationTarget, industryCitationTarget);
            const researchIterations = 8;
            const agentEarthSelected = selectedTools.includes('agent_earth_run');
            const agentEarthTargetCalls = agentEarthSelected
                ? (intent?.wantsNewsBrief || intent?.wantsFreshInfo || intent?.wantsBusinessIntel || writingContract?.needsResearch ? 10 : 8)
                : 0;
            const agentHasNetworkTools = mode === 'agent' && this.runtime.hasNetworkTools(selectedTools);
            const agentSourceTarget = agentHasNetworkTools ? 36 : 0;
            const agentCitationTarget = agentHasNetworkTools ? 20 : 0;
            const agentIterations = agentHasNetworkTools ? 8 : 6;

            return {
                researchProfile: intent?.wantsNewsBrief
                    ? 'news_brief'
                    : intent?.wantsIndustryResearch
                    ? 'industry'
                    : intent?.wantsAcademicResearch
                    ? 'academic'
                    : intent?.wantsFreshInfo
                    ? 'general'
                    : agentHasNetworkTools
                    ? 'agentic'
                    : 'none',
                agentEarthTargetCalls,
                maxIterations: researchLike ? researchIterations : mode === 'agent' ? agentIterations : 1,
                sourceTarget: researchLike ? researchSourceTarget : agentSourceTarget,
                citationTarget: researchLike ? researchCitationTarget : agentCitationTarget,
                writingContract,
                qualityGates: writingGates
            };
        }

        getAgentEarthTargetCalls(plan = null) {
            const configured = Number(plan?.agentEarthTargetCalls || 0);
            if (configured > 0) return Math.min(14, Math.max(8, configured));
            if (Array.isArray(plan?.selectedTools) && plan.selectedTools.includes('agent_earth_run')) return 8;
            return 0;
        }

        buildSystemPrompt(plan, contextPack = null) {
            const runtime = this.runtime;
            const sourceTarget = Number.isFinite(Number(plan?.sourceTarget)) ? Number(plan.sourceTarget) : 28;
            const citationTarget = Number.isFinite(Number(plan?.citationTarget)) ? Number(plan.citationTarget) : 18;
            const needsEvidencePolicy = runtime.isEvidenceSeekingPlan(plan)
                || plan.researchProfile === 'agentic'
                || Boolean(plan?.policyFlags?.needsSourceLibrary);
            const researchPolicy = this.buildResearchPolicy(plan, sourceTarget, citationTarget);
            const writingPolicy = this.buildWritingPolicy(plan);
            const finalAnswerStyle = this.buildFinalAnswerStyle(plan, citationTarget);
            const agentEarthPolicy = this.buildAgentEarthPolicy(plan);
            const sourceAlignmentPolicy = this.buildSourceAlignmentPolicy(plan);
            const contextMemoryPolicy = runtime.buildContextMemoryPolicy(contextPack);
            const toolLoopPolicy = needsEvidencePolicy
                ? [
                    '- Use one canonical tool for each action: community_snapshot for community dashboards, web_research for broad maps, search_urls for narrow targeted queries, read_webpage for opening URLs. Avoid duplicate alias tools and avoid looping over equivalent searches.',
                    `- For research/news brief/agentic evidence runs, treat ${sourceTarget}+ distinct sources and ${citationTarget}+ cited sources as soft coverage targets when available. If coverage is thin, make at most a useful targeted follow-up; if retrieval remains sparse, synthesize with explicit evidence gaps instead of stalling.`,
                    '- Batch independent tool calls aggressively in the first two tool turns: combine web_research, search_urls, read_webpage, news_query, and agent_earth_run calls instead of spreading them across many later iterations.',
                    '- The run is capped at 8 tool iterations. After iteration 6, prefer final synthesis unless a clearly missing required category or user-requested source type remains. Do not continue slow broad collection just to add marginal sources.'
                ]
                : [
                    '- Default lightweight mode: answer directly for random, conceptual, conversational, or non-current questions. Do not force research structure, citations, outlines, or source targets unless the user asks for them or the task depends on fresh external facts.'
                ];

            return [
                'Agent runtime policy:',
                '- Treat the conversation as a bounded run with these phases: plan, route, act, observe, synthesize.',
                '- For current, external, fast-changing, recommended, price/policy/version/news, or citation-sensitive claims, do not answer from memory.',
                ...researchPolicy,
                ...writingPolicy,
                ...agentEarthPolicy,
                ...sourceAlignmentPolicy,
                ...finalAnswerStyle,
                ...contextMemoryPolicy,
                ...toolLoopPolicy,
                '- Never use Baidu or Baidu-derived pages as evidence, search fallbacks, citations, or redirects. If other search engines are blocked, use non-Baidu direct sources, official/community pages, Jina search/reader, RSS/API endpoints, and site-targeted reads.',
                '- Prefer authoritative, primary, official, peer-reviewed, reputable media, or first-hand community sources over search result pages, SEO pages, mirrors, and encyclopedic summaries.',
                '- Source policy is claim-dependent: if the user asks for papers, journals, peer-reviewed work, academic research, or formal publications, use academic citation standards even when the run mode is agent. Do not cite news/media pages as paper evidence.',
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

        buildWritingPolicy(plan) {
            const contract = plan?.writingContract;
            if (!contract?.active) return [];
            const gates = contract.qualityGates || {};
            const deliverableLabel = this.getWritingDeliverableLabel(contract.deliverable);
            const audienceLabel = this.getWritingAudienceLabel(contract.audience);
            const styleLabel = this.getWritingStyleLabel(contract.styleProfile);
            const sourceLine = contract.needsResearch
                ? contract.needsCitations
                    ? `  - Research target: aim for about ${gates.minSources || 0} useful sources and ${gates.minCitations || 0} cited sources when available; prioritize primary, official, peer-reviewed, data-rich, or first-hand sources.`
                    : `  - Research target: aim for enough useful evidence to support the draft; prioritize primary, official, peer-reviewed, data-rich, or first-hand sources, but do not force citations because the user did not ask for them.`
                : '  - Research target: use tools only if the user asks for current facts, sources, or verification; otherwise write from available context.';
            const citationLine = contract.needsCitations
                ? `  - Citation style: use ${contract.citationStyle || 'numeric'} citations. Every important factual claim, statistic, named report, paper, product comparison, or historical/current claim needs source support.`
                : '  - Citation style: citations are optional unless external factual claims are introduced.';

            return [
                '- Long-form research writing contract:',
                `  - Deliverable: ${deliverableLabel}. Audience: ${audienceLabel}. Depth: ${contract.depth}. Target length: ${contract.targetLength}.`,
                `  - Style profile: ${styleLabel}. The writing should be complete, distinctive, modern, and reader-aware, while staying precise and source-grounded.`,
                sourceLine,
                citationLine,
                '  - Build the answer as a finished publication draft, not a loose note dump: strong title, sharp lead, clear thesis, coherent section sequence, transitions, implications, limits, and a memorable close when appropriate.',
                '  - Reader attention design: open with the stakes or tension, vary paragraph length, alternate evidence with interpretation, use tables only when they improve scanning, and avoid monotonous bullet walls.',
                '  - Use an internal outline before final synthesis. Do not expose tool logs or raw planning JSON; expose the outline only when it improves the final deliverable.',
                '  - Preserve the user language unless explicitly asked otherwise. Avoid generic AI prose, cliches, slogan endings, and empty executive-speak.',
                '  - If evidence is insufficient for a complete report/paper/article, still deliver the best finished draft and explicitly mark evidence gaps or assumptions instead of fabricating support.'
            ];
        }

        getWritingDeliverableLabel(deliverable) {
            const labels = {
                research_report: 'research report',
                paper: 'academic paper',
                article: 'long-form article',
                literature_review: 'literature review',
                white_paper: 'white paper'
            };
            return labels[deliverable] || 'long-form writing';
        }

        getWritingAudienceLabel(audience) {
            const labels = {
                general: 'general readers',
                technical: 'technical readers',
                academic: 'academic readers',
                executive: 'executive or decision-maker readers'
            };
            return labels[audience] || 'general readers';
        }

        getWritingStyleLabel(styleProfile) {
            const labels = {
                modern_feature: 'modern feature writing with a distinctive voice',
                academic_clear: 'clear academic prose with strong argument structure',
                executive_research: 'executive research prose with sharp implications',
                default: 'clear, reader-aware prose'
            };
            return labels[styleProfile] || labels.default;
        }

        buildResearchPolicy(plan, sourceTarget, citationTarget) {
            if (plan.researchProfile === 'news_brief') {
                return this.buildNewsBriefPolicy(sourceTarget, citationTarget, plan.newsBriefScope);
            }
            if (plan.researchProfile === 'academic') {
                return [
                    '- Academic research mode: prefer primary sources over broad search. Go directly to arXiv, Nature, Science, Optica/OSA, IEEE, ACM, PubMed, official journal/conference pages, or known project papers when the target source is obvious.',
                    '- For academic questions, use web_research depth="fast" at most once only as a map. For the evidence pass, use web_research depth="deep" read_top=true max_results=28-32, then pivot to site-targeted search_urls queries such as site:arxiv.org, site:nature.com, site:science.org, site:opg.optica.org, site:ieeexplore.ieee.org, and read_webpage on the best primary sources.',
                    `- Aim for about ${sourceTarget} distinct primary or high-authority source URLs and cite about ${citationTarget} useful sources when available. If the first pass is sparse, run one narrower targeted follow-up; if coverage is still limited, synthesize and label the uncertainty.`,
                    '- Academic citation boundary: the final source list should be papers, preprints, proceedings, journal pages, DOI/PubMed records, standards, official lab/project pages, or official technical documentation. Do not use BBC/Reuters/AP/CNBC/Guardian/news homepages, search result pages, trending pages, or general media as academic evidence unless the user explicitly asks for media/industry coverage.',
                    '- Do not cite an ACM/IEEE/Nature/etc. homepage when the page read says no relevant paragraph was found; search for a specific paper title or DOI instead.',
                    '- If the user says the previous sources were all arXiv/airxiv or asks for other journals, prioritize non-arXiv peer-reviewed journal/conference sources such as Nature, Science, Optica/OSA, IEEE, ACM, PubMed, Springer, ScienceDirect, Wiley, Cell, and DOI pages.',
                    '- Do not spend repeated iterations on generic search once useful primary-source candidates exist.'
                ];
            }
            if (plan.researchProfile === 'industry') {
                return [
                    '- Industry research mode: write like a serious industry/strategy analyst, not an academic literature reviewer. Prioritize market data, company disclosures, standards bodies, supply-chain reports, product announcements, investor presentations, credible industry media, and specialist reports.',
                    '- Evidence ladder: first map the market structure with web_research depth="deep" read_top=true max_results=32-40; then use search_urls/read_webpage for named companies, standards, market sizing, shipments, ASP/BOM, capacity, margins, customer concentration, technology readiness, and policy drivers.',
                    `- Aim for about ${sourceTarget} distinct useful sources and cite about ${citationTarget} sources when available. A long report with fewer than 12 cited sources is under-evidenced unless retrieval was blocked and the limitation is explicit.`,
                    '- Industry terminology contract: use precise sector language such as TAM/SAM/SOM, CAGR, ASP, gross margin, capex, yield, capacity utilization, attach rate, design win, qualification cycle, lead time, supply chain bottleneck, downstream pull, pricing power, channel inventory, and technology readiness only when they fit the evidence. Do not invent vague labels or slogan terms.',
                    '- Data discipline: separate reported facts, estimates, and your inference. When numbers come from different source types or years, name the scope and caveat. Do not merge incompatible market-size definitions without saying so.',
                    '- Structure should feel like a publishable research report: executive thesis, market map, demand drivers, supply chain, competitive landscape, technology inflection, risks, and watchlist/KPIs. Avoid generic encyclopedia exposition.'
                ];
            }
            if (plan.researchProfile === 'agentic') {
                return [
                    '- Agentic evidence mode: this is a general tool run with network-capable tools. Do not stop after a single fast lookup when the answer depends on external facts.',
                    '- Use web_research/search_urls/read_webpage as an evidence ladder: map the topic, open the most useful sources, then synthesize. Prefer direct readable pages over search result snippets.',
                    `- Aim for about ${sourceTarget} useful source candidates and cite about ${citationTarget} sources when the answer makes factual external claims. If fewer are available, say the coverage is limited instead of padding with weak sources.`,
                    '- After tool observations, first distill what the tools established, then write a user-facing answer with source-backed claims and a compact source list. Do not dump raw tool output.'
                ];
            }
            if (plan.researchProfile === 'none') {
                return [];
            }
            return [
                '- For broad community scans, call community_snapshot first. It has dedicated routes for Hacker News, GitHub Trending, V2EX, Reddit, Lobsters, and Product Hunt and should be preferred over generic page reads for those sites.',
                '- For news, communities, products, and current events, use web_research depth="deep" read_top=true max_results=28-40 for the main evidence pass. Use depth="fast" only for a preliminary map when the source landscape is unclear.',
                '- For broad daily news briefs, cover domestic, international, finance/markets, technology, and society/sports/culture before final synthesis. Use general news home/rolling pages first; do not substitute AI company blogs unless the user asked for AI/technology news.',
                '- For broad community scans, preserve breadth before synthesis: cover several distinct communities when relevant, such as Hacker News, GitHub Trending, Product Hunt, V2EX, Reddit/Lobsters, official blogs, or security/news sources. Do not collapse the answer into a shallow daily digest if the user asked for research.',
                `- Aim for about ${sourceTarget} distinct source URLs or community items and cite about ${citationTarget} useful sources when available. If coverage is thin, make one narrower follow-up with web_research/search_urls/read_webpage, then synthesize with limitations instead of padding weak sources.`,
                '- The final answer should include findings, cross-source patterns, source notes, and uncertainty in a natural research-brief style. Do not add a forced closing summary or slogan unless the user explicitly asks for one.'
            ];
        }

        buildFinalAnswerStyle(plan, citationTarget) {
            if (!this.runtime.isEvidenceSeekingPlan(plan)) {
                return [
                    '- When the answer depends on external facts, cite source ids such as [1], [2] and include a compact Sources/来源 section.'
                ];
            }
            return [
                '- Final answer style contract for evidence-backed tool runs:',
                '  - Use a natural research-brief structure with short named sections only where they help readability; avoid a rigid template if paragraphs plus grouped bullets read better.',
                '  - Start with the most important findings and supporting context, not a terse verdict. The opening should have a clear thesis and a reason the reader should care.',
                '  - Prefer grouped evidence bullets or a compact table only when it improves clarity.',
                '  - Every important factual claim should carry inline numeric citations such as [1], [2]. Do not invent citation ids that were not returned by tools.',
                `  - When enough evidence exists, cite at least ${citationTarget} distinct sources. If the answer has many bullets, use broad citation coverage: most bullets should have their own source marker, not a reused section marker.`,
                '  - End with a compact source note that maps each cited source id to its title or site and URL when URLs are available, but do not format that final source note as a Markdown heading. Use plain text like "来源：" instead of "## 来源".',
                '  - Source note format is strict: write "来源：" on its own line, then one source per line as "[1] Title or site — URL". Never put multiple sources on the same line.',
                '  - Keep source markers consecutive and in the order used in the final answer source note. Do not skip numbers in the final source list.',
                '  - Do not reuse one generic homepage citation for unrelated claims. Cite the specific article/item/page that supports the claim; use a platform homepage only when no article URL was returned and label that limitation.',
                '  - For news/community bullets, cite at least one specific article, item, or readable page per bullet when available. Do not cite the same generic homepage for a whole section of unrelated items.',
                '  - Avoid citation clutter: one citation cluster at the end of a bullet or paragraph is enough unless different clauses rely on different sources.',
                '  - If a source id has no URL because a tool returned only a snapshot, label it as a tool snapshot and name the originating community.',
                '  - Use domain terms that practitioners use. For industry reports, prefer market sizing, CAGR, ASP, capex, yield, capacity, margin, customer concentration, qualification, and adoption curve language over invented slogans.',
                '  - Style pass: make the final answer feel authored. Use sharper section names, concrete transitions, and interpretive sentences that explain why the evidence matters. Avoid sterile list dumps and generic AI prose.',
                '  - Do not add a forced closing summary, slogan, or extra recap section unless the user explicitly asks for it.',
                '  - Never use closing labels or wording like "**一句话总结：**", "一句话总结", or "一句话"; if the user explicitly asks for a summary, use only "总结" as the label.'
            ];
        }

        buildAgentEarthPolicy(plan) {
            if (!Array.isArray(plan?.selectedTools) || !plan.selectedTools.includes('agent_earth_run')) return [];
            return [
                '- AgentEarth collaboration policy:',
                '  - agent_earth_run is a professional external tool aggregator. It must be used as a cooperating tool when selected, not only after other tools fail.',
                '  - Keep AgentEarth inside the normal model tool loop. Before the tool calls in a turn, stream one short natural progress sentence to the user, then request the tools.',
                `  - For broad research/news/specialist tasks, treat ${plan.agentEarthTargetCalls || 8} AgentEarth calls as an upper-bound planning target, not a hard quota. Prefer one concise batched AgentEarth pass early, then synthesize from the useful results.`,
                '  - Let AgentEarth choose suitable resources freely. Do not over-constrain it with a preferred_tool_name unless the user explicitly names a specific AgentEarth tool. Use max_attempts=0 to let the backend try all recommended candidates.',
                '  - For blocked, sparse, or failed foreign-source searches, call AgentEarth again with a narrower query instead of giving up after one attempt.',
                '  - Make AgentEarth searches platform-aware when relevant: ask it to use X/Twitter search/news tools, Reuters/BrightData news extraction, Bloomberg/markets tools, Google News/Serper news, 财联社/China finance tools, Facebook, YouTube, Reddit, Tushare/finance indicators, and other available specialist tools.',
                '  - Use agent_earth_run together with relevant local/web/market tools for local services, travel, multimedia creation, business intelligence, social intelligence, live external data, and specialist-tool tasks.',
                '  - The backend wrapper already performs AgentEarth Recommend before Execute and can try all recommended tools. Do not try to call hidden recommend/execute endpoints manually.',
                '  - Provide agent_earth_run with a concise query and only relevant task_context. Do not dump unrelated full chat history.',
                '  - If attachment context is relevant, rely on the runtime-injected task_context rather than copying large attachment text into the query.',
                '  - When AgentEarth and existing tools both return useful results, synthesize them together. Do not present AgentEarth output as raw JSON.'
            ];
        }

        buildSourceAlignmentPolicy(plan) {
            const needsEvidence = this.runtime.isEvidenceSeekingPlan(plan) || plan?.researchProfile === 'agentic';
            if (!needsEvidence) return [];
            return [
                '- Claim-source alignment policy:',
                '  - Every current or external factual claim must be grounded by a source that could actually know that claim. The cited source must match the same subject, event, paper, product, metric, organization, or time window.',
                '  - Do not source-launder: a homepage, rolling page, category page, search result, policy page, or unrelated authoritative source cannot support a concrete claim just because it looks reputable.',
                '  - If a claim is specific but direct evidence is thin, label the evidence state as unverified, conflicting, or retrieval-limited instead of filling gaps with plausible dates, numbers, mechanisms, codenames, or substitutions.',
                '  - If specific claims appear to rely on generic/mismatched sources, make one targeted verification pass from the claim text itself before final synthesis. When normal web or foreign-source retrieval is weak, use AgentEarth max_attempts=0 to try all relevant platform routes.'
            ];
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
                    '- If Reuters/AP or other foreign sources return 451/403/429 or no useful article, immediately add AgentEarth fallback calls with max_attempts=0 for Reuters/BrightData, Bloomberg, Google News/Serper, X/Twitter, YouTube, Facebook, Reddit, and other relevant platforms, then continue with accessible reputable sources such as BBC, Guardian, Sina, Chinanews, NetEase, CNBC, NBD, CCTV, People, or other readable outlets.',
                    '- Do not use OpenAI, Anthropic, DeepMind, Google AI, Microsoft AI, Hugging Face, GitHub AI, The Batch, or AI-only sections as dominant sources unless the user explicitly asked for AI/technology news.',
                    `- Aim for ${sourceTarget}+ distinct source URLs and cite ${citationTarget}+ useful sources when available, but prioritize on-topic source diversity over unrelated breadth.`,
                    '- Final density: provide at least 10 well-supported items for the requested category when evidence allows. Each important item should include what happened and why it matters, not just a headline.',
                    `- Final format should read like a ${label} news brief: start with a short lead, then group important stories by theme or region. Keep the vivid, plain-language one-line interpretation style when evidence supports it, and answer in the user language.`
                ];
            }
            return [
                '- News brief route: this is a broad daily news briefing, not a generic research run.',
                '- First tool pass should establish date and broad coverage: call get_current_date, then use news_query for at least world/international, finance/markets, technology, and general China/domestic keywords when useful.',
                '- Main evidence pass: use web_research mode="news_brief" or mode="news" with max_results=28-32, read_top=true, and queries that separately target domestic China, international/world, finance/markets, technology/science, and society/sports/culture.',
                '- Direct source reads are mandatory when broad coverage is thin. Prefer readable general news pages such as Sina News, China News Service, NetEase Latest News, BBC News, Reuters World/Business/Markets, CNBC Markets, CCTV News 30, and National Business Daily.',
                '- If Reuters/AP/The Verge/Wired or other foreign sources return 451/403/429, section-only pages, or thin snippets, do not let those failures narrow the answer to AI. Add AgentEarth fallback calls with max_attempts=0 for Reuters/BrightData, Bloomberg, Google News/Serper, X/Twitter, YouTube, Facebook, Reddit, 财联社, Tushare/finance, and other relevant tools, then continue with accessible general sources such as Sina, Chinanews, NetEase, BBC, CNBC, NBD, CCTV, People, or Guardian.',
                '- Do not use OpenAI, Anthropic, DeepMind, Google AI, Microsoft AI, Hugging Face, GitHub AI, The Batch, or AI-only sections as dominant sources unless the user explicitly asked for AI/technology news.',
                '- Coverage target before synthesis: try to include domestic, international, finance/markets, technology/science, and society/sports/culture. If one section is weak after a bounded attempt, explicitly say so and explain the retrieval gap.',
                `- Aim for ${sourceTarget}+ distinct source URLs and cite ${citationTarget}+ useful sources when available, but prioritize category breadth over repeating similar AI/company sources.`,
                '- Final density: for a broad daily brief, aim for 40-60 well-supported items across 6-8 sections. Each major item should include what happened plus why it matters or what changed. Avoid single-line headline dumps.',
                '- Final format should read like a daily news brief: start with a short lead, then grouped sections such as \u56fd\u9645, \u56fd\u5185, \u79d1\u6280, \u8d22\u7ecf, \u793e\u4f1a/\u6c11\u751f, \u4f53\u80b2/\u6587\u5a31, \u79d1\u5b66/\u5065\u5eb7 when evidence supports them. Keep the vivid, plain-language one-line interpretation style when evidence supports it, and answer in the user language.'
            ];
        }

        buildForcedAgentEarthFollowUp(plan, runState, userMessage, forcedCount = 0) {
            if (!Array.isArray(plan?.selectedTools) || !plan.selectedTools.includes('agent_earth_run')) return null;
            if (forcedCount >= 1) return null;
            const calls = Array.isArray(runState?.toolCalls) ? runState.toolCalls : [];
            const agentEarthCalls = calls.filter(call => call.name === 'agent_earth_run');
            const targetCalls = this.getAgentEarthTargetCalls(plan);
            if (agentEarthCalls.length >= targetCalls) return null;
            const remaining = Math.max(1, targetCalls - agentEarthCalls.length);

            return [
                'AgentEarth collaboration request: agent_earth_run was routed for this run but the useful cooperating-tool pass is still thin.',
                `Make one concise batched AgentEarth pass with up to ${Math.min(remaining, 4)} additional call(s) if they add distinct value, then synthesize even if the original planning target is not fully reached.`,
                'Let AgentEarth freely choose suitable resources; do not set preferred_tool_name unless the user explicitly named one. Use max_attempts=0 so the backend can try all recommended candidates.',
                'Use diverse concise queries for resource discovery, verification, primary sources, community/social signals, data/comparison, and missing angles. Name relevant platforms directly when useful: X/Twitter, Reuters, Bloomberg, Google News, BrightData, 财联社, Facebook, YouTube, Reddit, Tushare, and other available tools. Include only relevant task_context if available.',
                'If another existing tool is relevant, use it too, then synthesize all observations without dumping raw JSON.',
                `User task: ${this.runtime.previewValue(userMessage, 1200)}`
            ].join('\n');
        }

        buildForcedNewsBriefDensityFollowUp(plan, runState, response, userMessage, forcedCount = 0) {
            const runtime = this.runtime;
            const isNewsBriefRun = plan?.researchProfile === 'news_brief' || plan?.mode === 'news_brief';
            if (!isNewsBriefRun || forcedCount >= 1) return null;

            const content = String(response?.content || '').trim();
            if (!content) return null;

            const scope = plan?.newsBriefScope || runtime.getNewsBriefScope(userMessage);
            const focused = scope?.focus && scope.focus !== 'broad';
            const stats = this.analyzeNewsBriefAnswer(content, scope);
            const evidenceStats = runtime.getResearchEvidenceStats(Array.isArray(runState?.evidenceLedger) ? runState.evidenceLedger : []);
            const minimums = focused
                ? { sections: 1, stories: 10, citations: 8, chars: 3600 }
                : { sections: 5, stories: 42, citations: 24, chars: 9000 };

            const gaps = [];
            if (stats.sectionCount < minimums.sections) gaps.push(`sections ${stats.sectionCount}/${minimums.sections}`);
            if (stats.storyCount < minimums.stories) gaps.push(`items ${stats.storyCount}/${minimums.stories}`);
            if (stats.citationCount < minimums.citations && evidenceStats.uniqueUrls >= minimums.citations) {
                gaps.push(`citations ${stats.citationCount}/${minimums.citations}`);
            }
            if (stats.contentChars < minimums.chars) gaps.push(`detail ${stats.contentChars}/${minimums.chars} chars`);
            if (!gaps.length) return null;

            const label = this.getNewsBriefScopeLabel(scope);
            return [
                'News brief expansion request: the current draft is probably too thin for the requested brief.',
                `The current draft is too thin for ${label}: ${gaps.join(', ')}.`,
                focused
                    ? 'Rewrite or expand the final brief with at least 10 substantial items in the requested category. Each major item needs what happened, why it matters, and one source marker when available.'
                    : 'Rewrite or expand the final brief into a fuller cross-category briefing with 40-60 substantial items across international, domestic, finance/markets, technology/science, society/livelihood, sports/culture/entertainment, and health/science when evidence supports them.',
                'Do not dump raw source JSON. Do not add decorative divider lines. Keep the answer readable with clear sections, short paragraphs, and compact but information-rich story bullets.',
                'Use the existing tool evidence first. Call more tools only for categories or source coverage that are still weak.'
            ].join('\n');
        }

        buildForcedSourceAlignmentFollowUp(plan, response, forcedCount = 0) {
            const needsEvidence = this.runtime.isEvidenceSeekingPlan(plan) || plan?.researchProfile === 'agentic';
            if (!needsEvidence || forcedCount >= 1) return null;

            const report = this.analyzeSourceAlignment(response?.content || '');
            if (!this.needsSourceAlignmentFollowUp(report)) return null;

            const examples = report.issues
                .slice(0, 4)
                .map(issue => `- ${issue.reason}: ${this.runtime.previewValue(issue.line, 180)}`)
                .join('\n');
            return [
                'Source-alignment verification request: the draft has specific claims whose citations look generic, missing, or semantically mismatched.',
                `Alignment check: ${report.claimCount} claim-like line(s), ${report.sourceCount} source entrie(s), ${report.issues.length} issue(s).`,
                examples ? `Examples:\n${examples}` : '',
                'Make one targeted verification pass from the unsupported claim text itself. Use the right source class: official/primary pages for status and releases, papers/DOIs/journals for research claims, filings/regulators/company disclosures for financial or legal claims, and reputable reporting for news events.',
                'If retrieval is weak or foreign sources are blocked, use AgentEarth max_attempts=0 when available to try all relevant platform routes. Then rewrite only the affected claims: keep them only with directly matching sources, otherwise mark them unverified, conflicting, or retrieval-limited.'
            ].filter(Boolean).join('\n');
        }

        buildForcedResearchFollowUp(plan, runState, userMessage, forcedCount = 0) {
            const runtime = this.runtime;
            const isNewsBriefRun = plan?.researchProfile === 'news_brief' || plan?.mode === 'news_brief';
            if (!isNewsBriefRun && !runtime.isBroadDailyNewsRequest(userMessage)) {
                const maxForcedFollowups = 1;
                if (!runtime.isEvidenceSeekingPlan(plan) || forcedCount >= maxForcedFollowups) return null;
                return this.buildGenericResearchFollowUp(plan, runState, userMessage);
            }
            if (forcedCount >= 1) return null;

            const evidence = Array.isArray(runState?.evidenceLedger) ? runState.evidenceLedger : [];
            const stats = runtime.getResearchEvidenceStats(evidence);
            const domains = stats.hosts;
            const readableCount = stats.readableCount;
            const coverage = this.getDailyNewsCoverage(evidence);
            const scope = plan?.newsBriefScope || runtime.getNewsBriefScope(userMessage);
            const requiredCoverage = this.getRequiredNewsCoverageKeys(scope);
            const focusedNewsBrief = scope?.focus && scope.focus !== 'broad';
            const hasCoreSections = requiredCoverage.every(key => coverage[key]);
            const hasEnoughBreadth = focusedNewsBrief
                ? stats.uniqueUrls >= 10 && domains.size >= 5 && readableCount >= 4
                : stats.uniqueUrls >= 32 && domains.size >= 12 && readableCount >= 10;

            if (hasCoreSections && hasEnoughBreadth) return null;

            const missing = [];
            requiredCoverage.forEach(key => {
                if (!coverage[key]) missing.push(this.getNewsBriefCoverageLabel(key));
            });

            if (focusedNewsBrief) {
                const label = this.getNewsBriefScopeLabel(scope);
                return [
                    'Coverage improvement request: make one more targeted evidence pass if it is useful.',
                    `This is a focused ${label} news brief. Add on-topic evidence before synthesis when accessible; do not broaden into unrelated categories.`,
                    `Current source coverage: ${stats.uniqueUrls} unique URLs, ${domains.size} hosts, ${readableCount} readable items; missing coverage: ${missing.join(', ') || label}.`,
                    `Next pass: use web_research mode="news_brief" with query variants for ${label}, then use read_webpage on readable sources from multiple reputable outlets.`,
                    'If Reuters/AP return 451/403/429 or useful foreign coverage is thin, add AgentEarth fallback calls with max_attempts=0 for relevant news/social/data platforms, then continue with accessible reputable sources. After this pass, synthesize in the user language and mark any weak coverage.'
                ].join('\n');
            }

            return [
                'Coverage improvement request: make one more targeted evidence pass if it is useful.',
                'This is a broad daily news brief, not an AI/technology-only topic. Add general news coverage before synthesis when accessible.',
                `Current source coverage: ${stats.uniqueUrls} unique URLs, ${domains.size} hosts, ${readableCount} readable items; missing coverage: ${missing.join(', ') || 'overall news breadth'}.`,
                'Next pass: use web_research mode="news_brief" with separate queries for domestic China, international/world, finance/markets, technology/science, and society/sports/culture, then use read_webpage on readable general sources.',
                'Prefer direct reads from these accessible general sources when search results are thin:',
                '- https://news.sina.com.cn/',
                '- https://www.chinanews.com.cn/',
                '- https://news.163.com/latest/',
                '- https://www.bbc.com/news',
                '- https://www.reuters.com/world/ or https://www.reuters.com/business/',
                '- https://www.cnbc.com/markets/ or https://www.nbd.com.cn/',
                'If Reuters/AP return 451/403/429 or foreign-source coverage remains thin, add AgentEarth fallback calls with max_attempts=0 for Reuters/BrightData, Bloomberg, Google News/Serper, X/Twitter, YouTube, Facebook, Reddit, 财联社, Tushare/finance, and other relevant tools, then continue with Sina, Chinanews, NetEase, BBC, CNBC, NBD, CCTV, People, or Guardian.',
                'After this pass, synthesize in the user language. Try to cover international, domestic, finance/markets, technology/science, and society/sports/culture; if one remains weak, say so explicitly.'
            ].join('\n');
        }

        buildGenericResearchFollowUp(plan, runState, userMessage) {
            const runtime = this.runtime;
            const profile = plan?.researchProfile || 'general';
            const rawEvidence = Array.isArray(runState?.evidenceLedger) ? runState.evidenceLedger : [];
            const evidence = profile === 'academic'
                ? rawEvidence.filter(entry => runtime.isAllowedAcademicEvidence(entry))
                : rawEvidence;
            const stats = runtime.getResearchEvidenceStats(evidence);
            const sourceTarget = Number(plan?.sourceTarget) || 28;
            const minUrls = profile === 'academic'
                ? Math.min(28, Math.max(18, Math.floor(sourceTarget * 0.45)))
                : profile === 'industry'
                ? Math.min(24, Math.max(16, Math.floor(sourceTarget * 0.55)))
                : profile === 'agentic'
                ? Math.min(22, Math.max(12, Math.floor(sourceTarget * 0.5)))
                : Math.min(20, Math.max(14, Math.floor(sourceTarget * 0.6)));
            const minReadable = profile === 'academic' ? 8 : profile === 'industry' ? 8 : profile === 'agentic' ? 6 : 6;

            if (stats.uniqueUrls >= minUrls && stats.readableCount >= minReadable) return null;

            const profileHint = profile === 'academic'
                ? 'Use targeted primary-source searches and direct reads: arXiv abs pages, DOI pages, PubMed records, Nature/Science/Optica/IEEE/ACM paper pages, official journal/conference pages, and known project pages. Do not count BBC/Reuters/AP/CNBC/Guardian/news homepages, Papers with Code, Hugging Face trending pages, or failed homepage reads as academic evidence.'
                : profile === 'industry'
                ? 'Use targeted industry searches and direct reads: company annual reports/investor decks, standards bodies, SEMI/SPIE/Yole/Omdia/LightCounting-style reports when accessible, credible industry media, product announcements, policy documents, and market-data pages. Do not rely on one syndicated article for all market numbers.'
                : profile === 'agentic'
                ? 'Use web_research depth="deep" read_top=true when broad context is needed, then open/read the most relevant sources with search_urls/read_webpage. Distill observations before final synthesis; do not rely only on fast snippets.'
                : 'Use web_research depth="deep" read_top=true max_results=28-32, then follow with search_urls/read_webpage for weak or missing angles.';
            const queryHint = runtime.previewValue(userMessage, 260).replace(/\s+/g, ' ');

            return [
                'Evidence improvement request: make one more targeted tool pass if it is useful.',
                `The current research evidence is still shallow for this request. Query: ${queryHint}`,
                `Current qualifying evidence: ${stats.uniqueUrls} unique URLs, ${stats.hosts.size} unique hosts, ${stats.readableCount} readable evidence items, ${stats.candidateCount} search/community candidates, ${stats.errorCount} read errors.`,
                `Soft target before final synthesis: about ${minUrls}+ unique URLs and ${minReadable}+ readable evidence items when accessible; do not stall if retrieval is blocked or the topic has limited sources.`,
                profileHint,
                'After this pass, synthesize even if coverage is limited, but mark weak or unsupported claims and do not invent citations.'
            ].join('\n');
        }

        analyzeSourceAlignment(content) {
            const { body, sourceSection } = this.splitAnswerSources(content);
            const sources = this.parseSourceEntries(sourceSection);
            const claims = this.extractSourceAlignmentClaims(body);
            const issues = [];
            let alignedCitedClaimCount = 0;

            claims.forEach(claim => {
                if (!claim.citationIds.length) {
                    if (claim.specificity >= 3) issues.push({ reason: 'uncited specific claim', line: claim.text });
                    return;
                }

                let aligned = false;
                claim.citationIds.forEach(id => {
                    const source = sources.get(id);
                    if (!source) {
                        issues.push({ reason: `missing source [${id}]`, line: claim.text });
                        return;
                    }
                    const assessment = this.assessClaimSourceAlignment(claim.text, source);
                    if (assessment.aligned) aligned = true;
                    else if (assessment.generic) issues.push({ reason: `generic source [${id}]`, line: claim.text });
                    else if (claim.specificity >= 4) issues.push({ reason: `weak source match [${id}]`, line: claim.text });
                });
                if (aligned) alignedCitedClaimCount += 1;
            });

            return { claimCount: claims.length, sourceCount: sources.size, alignedCitedClaimCount, issues };
        }

        needsSourceAlignmentFollowUp(report) {
            if (!report || !report.claimCount) return false;
            const issues = Array.isArray(report.issues) ? report.issues : [];
            if (issues.some(issue => /^generic source/.test(issue.reason))) return true;
            if (issues.filter(issue => /^missing source/.test(issue.reason)).length >= 2) return true;
            if (issues.filter(issue => /^weak source match/.test(issue.reason)).length >= 2) return true;
            return report.sourceCount >= 2 && report.alignedCitedClaimCount === 0 && issues.length >= 2;
        }

        splitAnswerSources(content) {
            const text = String(content || '');
            const match = text.match(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:来源|参考|引用|Sources|References)\s*[:：]?\s*\n/i);
            if (!match) return { body: text, sourceSection: '' };
            return { body: text.slice(0, match.index), sourceSection: text.slice(match.index + match[0].length) };
        }

        parseSourceEntries(sourceSection) {
            const sources = new Map();
            const pattern = /(?:^|\n)\s*\[(\d{1,3})]\s*([\s\S]*?)(?=\n\s*\[\d{1,3}]\s+|$)/g;
            let match;
            while ((match = pattern.exec(String(sourceSection || ''))) !== null) {
                sources.set(match[1], String(match[2] || '').replace(/\s+/g, ' ').trim());
            }
            return sources;
        }

        extractSourceAlignmentClaims(body) {
            return String(body || '').split('\n')
                .map(line => this.cleanClaimLine(line))
                .filter(Boolean)
                .map(text => ({
                    text,
                    citationIds: Array.from(text.matchAll(/\[(\d{1,3})]/g)).map(match => match[1]),
                    specificity: this.estimateClaimSpecificity(text)
                }))
                .filter(claim => claim.citationIds.length || claim.specificity >= 3);
        }

        cleanClaimLine(line) {
            const text = String(line || '')
                .replace(/^\s{0,3}#{1,6}\s*/, '')
                .replace(/^\s*(?:[-*+]\s+|\d+[.)、）]\s+)/, '')
                .replace(/\|/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (text.length < 18 || /^[-*_]{3,}$/.test(text)) return '';
            if (/^(声明|注|备注|来源|参考|引用|Sources|References)\s*[:：]?/i.test(text)) return '';
            return text;
        }

        estimateClaimSpecificity(text) {
            const value = String(text || '');
            let score = 0;
            if (/\[(\d{1,3})]/.test(value)) score += 1;
            if (/(?:19|20)\d{2}|Q[1-4]|[12]?\d月|[123]?\d日/i.test(value)) score += 1;
            if (/\d+(?:\.\d+)?\s*(?:%|bp|bps|美元|亿元|亿|万|kg|nm|GHz|Tbps|TOPS|W|Wh|T|K|MW|GW|倍|次|例|人|家|桶|oz|token|qubits?)/i.test(value)) score += 1;
            if (/(发布|宣布|推出|批准|实现|完成|获得|上涨|下跌|回落|维持|降息|突破|证实|证伪|收购|融资|量产|部署|发表|报道|签署|制裁|打击|袭击|监管|预计|目标|released|announced|reported|approved|published|launched|fell|rose|signed|deployed|confirmed|expected)/i.test(value)) score += 1;
            if (/\b[A-Z][A-Za-z0-9&+.-]{2,}(?:\s+[A-Z][A-Za-z0-9&+.-]{2,}){0,3}\b/.test(value)) score += 1;
            if (/(公司|大学|研究院|实验室|交易所|央行|监管局|委员会|基金|银行|政府|集团|芯片|电池|模型|论文|报告|装置|协议|项目|法院|部门)/.test(value)) score += 1;
            if (/(未证实|待验证|传闻|推测|unverified|uncertain|retrieval-limited)/i.test(value)) score = Math.max(0, score - 1);
            return score;
        }

        assessClaimSourceAlignment(claim, source) {
            const claimTerms = this.extractAlignmentKeywords(claim);
            const sourceTerms = this.extractAlignmentKeywords(source);
            const overlap = claimTerms.filter(term => sourceTerms.some(sourceTerm => sourceTerm === term || (term.length >= 3 && sourceTerm.includes(term)) || (sourceTerm.length >= 3 && term.includes(sourceTerm)))).length;
            const sharedNumbers = this.extractAlignmentNumbers(claim).filter(value => this.extractAlignmentNumbers(source).includes(value)).length;
            const generic = this.isGenericSourceEntry(source);
            return { aligned: overlap + sharedNumbers > 0, generic };
        }

        extractAlignmentKeywords(value) {
            const text = String(value || '').replace(/https?:\/\/\S+/gi, ' ').replace(/\[(?:\d{1,3})]/g, ' ').toLowerCase();
            const stop = new Set(['the', 'and', 'for', 'with', 'from', 'news', 'source', 'sources', 'html', 'http', 'https', 'www', 'com', 'org', 'net', '来源', '内容', '新闻', '报道', '目前', '最新', '以及', '主要', '方面', '阶段', '状态', '领域', '技术', '产品', '市场', '公司', '官方', '显示', '数据', '研究', '行业', '全球', '国际', '国内']);
            const terms = [];
            (text.match(/[a-z0-9][a-z0-9+.-]{1,}/g) || []).forEach(token => {
                const normalized = token.replace(/^[.-]+|[.-]+$/g, '');
                if (normalized.length >= 2 && !stop.has(normalized) && !/^\d+$/.test(normalized)) terms.push(normalized);
            });
            (text.match(/[\u4e00-\u9fff]{2,}/g) || []).forEach(token => {
                if (!stop.has(token)) terms.push(token);
                if (token.length > 5) {
                    for (let i = 0; i <= token.length - 3; i += 2) terms.push(token.slice(i, i + 3));
                }
            });
            return Array.from(new Set(terms)).slice(0, 40);
        }

        extractAlignmentNumbers(value) {
            return Array.from(String(value || '').toLowerCase().matchAll(/(?:19|20)\d{2}|q[1-4]|\d+(?:\.\d+)?\s*(?:%|bp|bps|nm|ghz|tbps|tops|wh|mw|gw|kg|oz|t|k|w|亿|万|倍|次|例|人|家|桶)?/g))
                .map(match => match[0].replace(/\s+/g, ''))
                .filter(Boolean);
        }

        isGenericSourceEntry(source) {
            const text = String(source || '').toLowerCase();
            if (/(press releases|latest news|top stories|homepage|index|rolling news|live updates|category|topics|滚动|首页|即时|新闻首页|资讯首页|快讯)/i.test(text)) return true;
            const urlMatch = text.match(/https?:\/\/[^\s<>)\]}]+/i);
            if (!urlMatch) return false;
            try {
                const url = new URL(urlMatch[0]);
                const path = url.pathname.replace(/\/+$/, '').toLowerCase();
                return !path || path === '/' || /\/(?:news|world|business|markets|finance|technology|press-releases|topics|latest|live|roll|index)$/i.test(path) || /\/index\.(?:html?|shtml|asp|php)$/i.test(path);
            } catch (_) {
                return false;
            }
        }

        analyzeNewsBriefAnswer(content, scope = null) {
            const text = String(content || '');
            const body = text.split(/(^|\n)\s*(来源|Sources|References|参考)\s*[:：]?/i)[0] || text;
            const citationCount = new Set(Array.from(body.matchAll(/\[(\d+)]/g)).map(match => match[1])).size;
            const storyCount = (body.match(/(^|\n)\s*(?:#{3,}\s+|\d+[.)]\s+|[-*+]\s+)/g) || []).length;
            const sectionPatterns = scope?.focus && scope.focus !== 'broad'
                ? [new RegExp(this.runtime.escapeRegex(this.getNewsBriefCoverageLabel(scope.focus)), 'i')]
                : [
                    /(国际|世界|全球|冲突|外交|world|international|global)/i,
                    /(国内|中国|政策|治理|民生|china|domestic)/i,
                    /(财经|经济|市场|金融|投资|股市|finance|market|economy|business)/i,
                    /(科技|科学|AI|芯片|technology|tech|science)/i,
                    /(社会|民生|体育|文娱|文化|娱乐|society|sports|culture|entertainment)/i,
                    /(健康|医疗|气候|教育|health|climate|education)/i
                ];
            const sectionCount = sectionPatterns.filter(pattern => pattern.test(body)).length;
            return {
                citationCount,
                storyCount,
                sectionCount,
                contentChars: body.trim().length
            };
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

        getDailyNewsCoverage(evidence = []) {
            const haystack = (Array.isArray(evidence) ? evidence : []).map(entry => [
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
    }

    window.AgentProfiles = AgentProfiles;
})();
