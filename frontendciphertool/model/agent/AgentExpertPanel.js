/**
 * AgentExpertPanel - 并行专家研究面板
 *
 * 解决的问题：
 * 单 Agent 的 ReAct 循环天然串行——上一轮的检索结果决定下一轮查什么，
 * 13 轮迭代 = 26 次串行模型往返（实测 465.8 秒，其中绝大部分是 LLM 等待）。
 *
 * 本模块把研究任务按维度拆给多个专家 Agent，每个专家拥有**自己的完整工具循环**，
 * 彼此并行执行。墙钟时间从「所有轮次之和」变成「最慢那个专家的耗时」。
 *
 * 与旧 AgentCollaboration 的关键区别：
 * 1. 触发条件基于意图档位（AgentResearchContract.classify），不再用字符数门槛——
 *    「半导体今天的动态」只有 9 个字符，却是典型的简报请求。
 * 2. 每个专家真的调用工具（独立 chatWithTools 循环），而不只是一次裸模型问答。
 * 3. 专家各自回答**互不重叠的子问题**，而不是拿同一个问题问五遍。
 * 4. 每位专家的 LLM/工具/token 指标回传，供性能监控汇总。
 */
(function () {
    const DIMENSIONS = {
        policy: {
            label: '政策与监管',
            keywords: ['政策', '监管', '法规', '合规', '政府', '标准', '准入', '补贴', '审批', '出口管制', 'policy', 'regulation'],
            tools: ['web_research', 'news_query', 'search_urls', 'read_webpage'],
            focus: '官方政策文件、监管口径、法规变动、补贴与准入条件、出口管制与地缘限制。优先政府与监管机构一手来源，注明发布机构与生效时间，区分已生效与征求意见稿。'
        },
        technology: {
            label: '技术与产品',
            keywords: ['技术', '架构', '算法', '工艺', '制程', '性能', '研发', '产品', '路线', '专利', 'technical', 'technology'],
            tools: ['web_research', 'read_webpage', 'search_urls'],
            focus: '技术原理、关键指标与量化参数、工艺与产能爬坡、技术路线分歧、成熟度分级（实验室/中试/量产）、专利与标准。给出可验证的数字与单位。'
        },
        market: {
            label: '市场与竞争',
            keywords: ['市场', '竞争', '份额', '价格', '涨价', '供需', '营收', '客户', '订单', 'market', 'competition', 'pricing'],
            tools: ['web_research', 'finance_query', 'news_query', 'read_webpage'],
            focus: '市场规模与增速、价格与供需变化、份额格局、主要参与者、订单与客户结构。所有数字必须带口径与期间。'
        },
        supplychain: {
            label: '产业链与供给',
            keywords: ['产业链', '供应链', '上游', '下游', '产能', '原材料', '供应商', '库存', '交付', '扩产', 'supply', 'capacity'],
            tools: ['web_research', 'read_webpage', 'search_urls'],
            focus: '上下游关系、关键原材料与零部件、产能与扩产计划、良率与成本结构、库存与交期、供应商集中度与瓶颈环节。'
        },
        capital: {
            label: '资本与财务',
            keywords: ['资本', '融资', '估值', '财务', '利润', '毛利', '现金流', '资本开支', '回购', '分红', '财报', 'capital', 'valuation', 'earnings'],
            tools: ['finance_query', 'web_research', 'news_query', 'read_webpage'],
            focus: '财报关键数字（营收/毛利率/净利/指引）、资本开支与回购分红、估值与融资、机构观点分歧。区分实际业绩与业绩指引。'
        },
        risk: {
            label: '风险与反方证据',
            keywords: ['风险', '隐患', '挑战', '争议', '泡沫', '高估', '回调', '下修', '失败', 'risk', 'downside', 'bear'],
            tools: ['web_research', 'read_webpage', 'search_urls'],
            focus: '与主流叙事相反的证据、被忽略的假设、失败或下修案例、估值与杠杆风险、政策反转风险、替代技术威胁。主动寻找反例，不要为了平衡而编造。'
        },
        data: {
            label: '关键数据与时间线',
            keywords: ['数据', '指标', '统计', '时间线', '事件', '发布', '日历', '数据点', 'data', 'timeline', 'calendar'],
            tools: ['web_research', 'news_query', 'finance_query', 'search_urls'],
            focus: '可直接进表格的硬数据：具体数值、同比环比、日期、事件序列、后续关键日程。每条数据标注来源与口径，无法核实的明确标注。'
        }
    };

    const DEFAULT_ORDER = ['data', 'policy', 'technology', 'market', 'capital', 'supplychain', 'risk'];

    class AgentExpertPanel {
        constructor(runtime, options = {}) {
            this.runtime = runtime;
            this.config = Object.assign({
                maxConcurrency: 4,
                maxIterationsPerExpert: 4,
                maxFindingsChars: 2200,
                // 专家材料总上限。这是写作提示词里最大的一块，过大会拖慢预填充并挤压生成时间。
                digestMaxChars: 9000,
                perExpertTimeoutMs: 240000,
                enabled: true
            }, options || {});
            this.lastRun = null;
        }

        isEnabled() {
            if (window.PZM_AGENT_EXPERT_PANEL === false) return false;
            return Boolean(this.config.enabled);
        }

        listDimensions() {
            return Object.entries(DIMENSIONS).map(([key, dim]) => ({ key, label: dim.label, keywords: dim.keywords.slice() }));
        }

        /* ---------------- 维度选择与子问题生成 ---------------- */

        /**
         * 按关键词命中挑选维度；命中不足时按默认顺序补齐到 panelSize。
         */
        selectDimensions(query, panelSize, usedDimensions = []) {
            const lower = String(query || '').toLowerCase();
            const scored = Object.entries(DIMENSIONS).map(([key, dim]) => {
                let score = 0;
                dim.keywords.forEach(keyword => {
                    if (lower.includes(String(keyword).toLowerCase())) score += 1;
                });
                return { key, score };
            }).sort((a, b) => b.score - a.score);

            const picked = scored.filter(item => item.score > 0).map(item => item.key);
            for (const key of DEFAULT_ORDER) {
                if (picked.length >= panelSize) break;
                if (!picked.includes(key)) picked.push(key);
            }
            return picked.slice(0, Math.max(0, panelSize));
        }

        /**
         * 为每个维度生成**互不重叠**的子问题。
         */
        buildSubQuestion(dimensionKey, query, contract) {
            const dim = DIMENSIONS[dimensionKey] || DIMENSIONS.data;
            const sectionHint = contract && contract.sections.length
                ? `你的产出将用于报告中的相关章节，请让结论可直接支撑可比较的数据表。`
                : '';
            return [
                `总任务：${query}`,
                '',
                `你负责的维度：${dim.label}`,
                `取材范围：${dim.focus}`,
                sectionHint,
                '',
                '工作方式：',
                `1. 直接开始检索，不要写开场白。最多 ${this.config.maxIterationsPerExpert} 轮工具迭代，把火力集中在你的维度。`,
                '2. 不要重复其他维度的内容，不要撰写最终交付物，只输出你这个维度的发现。',
                '3. 输出 5-8 条发现，每条包含：具体数据或事实 + 来源（URL 或来源名 + 日期）。数字必须带单位、口径与期间。',
                '4. 用证据动词标注每条主张的强度：证实 / 表明 / 估计 / 提示 / 与……一致 / 尚不能判定。不要用「已核实」「口径不一致」「单一来源」「证据缺口」这类分类标签。',
                '5. 纯文本输出，不要输出工具调用 JSON，不要输出 <think> 之类标记。'
            ].filter(Boolean).join('\n');
        }

        buildExpertSystemPrompt(dimensionKey, query) {
            const dim = DIMENSIONS[dimensionKey] || DIMENSIONS.data;
            return [
                `你是「${dim.label}」方向的研究专家，正在参与一次多专家并行研究。`,
                `研究主题：${query}`,
                '',
                '纪律要求：',
                '- 只在自己的维度内检索，跨维度的线索一句带过即可。',
                '- 所有关键论断都要有来源；没有来源的推断必须显式标注为推断。',
                '- 数字必须带单位、口径与期间（例如"2026 Q3 毛利率 86.8%"而非"毛利率很高"）。',
                '- 宁可少写而准，不可多写而虚。禁止"据悉""业内人士称"这类无主体表述。',
                '- 用陈述句直接给出发现，不要使用「一句话判断」「结论先行」「证据缺口」这类标签或元话语。'
            ].join('\n');
        }

        /* ---------------- 单个专家执行 ---------------- */

        /**
         * 每个专家使用独立客户端：共享实例上的 abortController 会被并发调用互相覆盖。
         */
        resolveClient(clientFactory) {
            try {
                if (typeof clientFactory === 'function') {
                    const created = clientFactory();
                    if (created) return created;
                }
            } catch (error) {
                console.warn('[AgentExpertPanel] dedicated client creation failed, falling back.', error);
            }
            return this.runtime?.client || null;
        }

        async runExpert(dimensionKey, query, options = {}) {
            const {
                contract = null,
                plan = null,
                signal = null,
                executeTool = null,
                onStatus = null,
                perfMonitor = null,
                clientFactory = null
            } = options;

            const dim = DIMENSIONS[dimensionKey] || DIMENSIONS.data;
            const startedAt = Date.now();
            const expert = {
                key: dimensionKey,
                label: dim.label,
                status: 'running',
                ok: false,
                findings: '',
                durationMs: 0,
                error: '',
                // 可观测性：让界面能看出这个专家到底在做什么、有没有真的用过工具
                activity: {
                    iterations: 0,
                    toolCalls: 0,
                    toolsUsed: [],
                    queries: [],
                    lastAction: '启动',
                    findingsChars: 0
                },
                metrics: { llmMs: 0, toolMs: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, cacheHitTokens: 0, iterations: 0 }
            };

            if (onStatus) onStatus({ ...expert });

            const client = this.resolveClient(clientFactory);
            if (!client || typeof client.chatWithTools !== 'function') {
                expert.status = 'failed';
                expert.error = 'chatWithTools unavailable';
                expert.durationMs = Date.now() - startedAt;
                if (onStatus) onStatus({ ...expert });
                return expert;
            }

            const messages = [
                { role: 'system', content: this.buildExpertSystemPrompt(dimensionKey, query) },
                { role: 'user', content: this.buildSubQuestion(dimensionKey, query, contract) }
            ];

            const tools = this.resolveTools(dimensionKey, plan);

            // 每次迭代的 LLM 计时（该专家的指标，最终并入整轮性能统计）
            let iterationStartAt = 0;
            let iterationFirstTokenAt = 0;
            let llmCallId = null;

            try {
                const response = await client.chatWithTools({
                    messages,
                    tools,
                    enableThinking: false,
                    maxIterations: this.config.maxIterationsPerExpert,
                    signal,
                    onReasoning: () => { },
                    onContent: (delta) => {
                        if (perfMonitor && llmCallId && iterationFirstTokenAt === 0 && delta) {
                            iterationFirstTokenAt = now();
                            perfMonitor.markFirstToken(llmCallId);
                        }
                    },
                    onIterationStart: (iteration) => {
                        expert.metrics.iterations = iteration;
                        expert.activity.iterations = iteration;
                        expert.activity.lastAction = `第 ${iteration} 轮检索`;
                        iterationStartAt = now();
                        iterationFirstTokenAt = 0;
                        if (perfMonitor) llmCallId = perfMonitor.beginLLMCall(`expert:${dimensionKey}#${iteration}`);
                        if (onStatus) onStatus({ ...expert });
                    },
                    onIterationComplete: (iteration, iterResponse) => {
                        if (iterationStartAt) {
                            expert.metrics.llmMs += Math.max(0, now() - iterationStartAt);
                        }
                        if (perfMonitor && llmCallId) {
                            perfMonitor.completeLLMCall(llmCallId, iterResponse?.usage);
                            llmCallId = null;
                        }
                        const usage = iterResponse?.usage || {};
                        expert.metrics.inputTokens += toNumber(usage.prompt_tokens ?? usage.input_tokens);
                        expert.metrics.outputTokens += toNumber(usage.completion_tokens ?? usage.output_tokens);
                        expert.metrics.cacheHitTokens += toNumber(
                            usage.prompt_cache_hit_tokens ?? usage.cached_tokens ?? usage.cache_read_input_tokens
                        );
                    },
                    onToolCall: (toolCall) => {
                        expert.metrics.toolCalls += 1;
                        expert.activity.toolCalls += 1;

                        const name = toolCall?.function?.name || 'tool';
                        if (!expert.activity.toolsUsed.includes(name)) {
                            expert.activity.toolsUsed.push(name);
                        }

                        // 记录真实检索词：让界面能看出这个专家到底在查什么
                        let queryText = '';
                        try {
                            const args = JSON.parse(toolCall?.function?.arguments || '{}');
                            queryText = String(args.query || args.q || args.url || args.keyword || args.topic || '').trim();
                        } catch (error) {
                            queryText = '';
                        }
                        if (queryText) {
                            expert.activity.queries.push(queryText.slice(0, 80));
                            if (expert.activity.queries.length > 6) expert.activity.queries.shift();
                            expert.activity.lastAction = `${name}：${queryText.slice(0, 60)}`;
                        } else {
                            expert.activity.lastAction = name;
                        }
                        if (onStatus) onStatus({ ...expert });
                    },
                    onToolResult: () => { },
                    onUsage: () => { },
                    executeToolFn: async (name, args, toolCall) => {
                        if (typeof executeTool !== 'function') {
                            throw new Error(`expert panel has no tool executor for ${name}`);
                        }
                        const toolStartedAt = now();
                        try {
                            return await executeTool(name, args, toolCall);
                        } finally {
                            expert.metrics.toolMs += Math.max(0, now() - toolStartedAt);
                        }
                    }
                });

                const findings = String(response?.content || '').trim();
                if (perfMonitor && llmCallId) {
                    perfMonitor.completeLLMCall(llmCallId, response?.usage);
                    llmCallId = null;
                }

                expert.ok = Boolean(findings);
                expert.findings = findings;
                expert.activity.findingsChars = findings.length;
                expert.activity.lastAction = '已产出 ' + findings.length + ' 字结论';
                expert.status = expert.ok ? 'done' : 'empty';
                if (!expert.ok) expert.error = '专家未产出内容';
            } catch (error) {
                expert.status = 'failed';
                expert.error = String(error?.message || error);
                expert.activity.lastAction = '失败：' + expert.error.slice(0, 60);
            }

            expert.durationMs = Date.now() - startedAt;
            if (onStatus) onStatus({ ...expert });
            return expert;
        }

        resolveTools(dimensionKey, plan) {
            const available = Array.isArray(plan?.selectedTools) ? plan.selectedTools : [];
            if (!available.length) return [];
            const dim = DIMENSIONS[dimensionKey] || DIMENSIONS.data;
            const preferred = dim.tools.filter(name => available.includes(name));
            const chosen = preferred.length ? preferred : available;
            return this.runtime?.registry?.getToolDefinitions
                ? this.runtime.registry.getToolDefinitions(chosen)
                : [];
        }

        /* ---------------- 面板执行 ---------------- */

        /**
         * 并行执行专家面板。返回合并后的结论与聚合指标。
         */
        async run(options = {}) {
            const {
                query = '',
                contract = null,
                plan = null,
                signal = null,
                executeTool = null,
                onStatus = null,
                onTrace = null,
                perfMonitor = null,
                clientFactory = null
            } = options;

            if (!this.isEnabled()) {
                return null;
            }
            const panelSize = Number(contract?.panelSize) || 0;
            if (panelSize <= 0) {
                return null;
            }

            const dimensionKeys = this.selectDimensions(query, panelSize);
            if (!dimensionKeys.length) return null;

            const wallStart = now();
            const experts = dimensionKeys.map(key => ({
                key,
                label: (DIMENSIONS[key] || {}).label || key,
                status: 'queued',
                ok: false,
                findings: '',
                durationMs: 0
            }));

            if (onTrace) {
                onTrace('collaboration.started',
                    `启动 ${dimensionKeys.length} 路并行专家研究：${experts.map(item => item.label).join('、')}`);
            }

            // 用信号量限制并发，避免一次打满上游速率限制
            const results = new Array(dimensionKeys.length);
            let cursor = 0;
            const concurrency = Math.max(1, Math.min(this.config.maxConcurrency, dimensionKeys.length));
            const worker = async () => {
                while (cursor < dimensionKeys.length) {
                    const index = cursor++;
                    const key = dimensionKeys[index];
                    results[index] = await this.runExpert(key, query, {
                        contract,
                        plan,
                        signal,
                        executeTool,
                        perfMonitor,
                        clientFactory,
                        onStatus: status => {
                            experts[index] = { ...experts[index], ...status };
                            if (onStatus) onStatus(experts.slice());
                        }
                    });
                }
            };
            await Promise.all(Array.from({ length: concurrency }, () => worker()));

            const settled = results.filter(Boolean);
            const okExperts = settled.filter(item => item.ok);
            const failedExperts = settled.filter(item => !item.ok);

            const digest = this.buildDigest(query, okExperts, failedExperts, contract);
            const usage = this.aggregateUsage(settled);

            if (onTrace) {
                onTrace('collaboration.completed',
                    `专家面板结束：成功 ${okExperts.length}/${settled.length}，墙钟 ${((now() - wallStart) / 1000).toFixed(1)}s`);
            }

            const result = {
                mode: 'expert_panel',
                dimensions: dimensionKeys,
                experts: settled,
                digest,
                usage,
                successCount: okExperts.length,
                failureCount: failedExperts.length,
                wallMs: now() - wallStart,
                // 串行等价耗时：用于向用户解释并行带来的收益
                serialEquivalentMs: settled.reduce((sum, item) => sum + (item.durationMs || 0), 0)
            };
            this.lastRun = result;
            return result;
        }

        /**
         * 把各专家发现合并成一份供主 Agent / 长文合成使用的材料。
         */
        buildDigest(query, okExperts, failedExperts, contract) {
            const blocks = [
                '# 多专家并行研究材料（中间产物，不是最终交付物）',
                `研究主题：${query}`,
                contract ? `交付档位：${contract.tierLabel}（正文下限 ${contract.minChars} 中文字）` : '',
                ''
            ].filter(Boolean);

            if (!okExperts.length) {
                blocks.push('所有专家均未产出有效结论，请主 Agent 独立完成检索与撰写。');
                return blocks.join('\n');
            }

            okExperts.forEach((expert, index) => {
                blocks.push(`## ${index + 1}. ${expert.label}`);
                blocks.push(this.clip(expert.findings, this.config.maxFindingsChars));
                blocks.push('');
            });

            if (failedExperts.length) {
                blocks.push('## 采集缺口（撰写时必须在正文中如实说明）');
                failedExperts.forEach(expert => {
                    blocks.push(`- ${expert.label}：未产出结论${expert.error ? `（${expert.error}）` : ''}`);
                });
                blocks.push('');
            }

            blocks.push(
                '使用要求：',
                '- 专家材料是二手整理，关键论断需要用你后续检索到的一手来源交叉验证。',
                '- 专家之间结论冲突时，必须同时呈现分歧与各自成立条件。',
                '- 不得用专家材料里没有来源的数字直接写入正文。'
            );

            return this.clip(blocks.join('\n'), this.config.digestMaxChars);
        }

        aggregateUsage(experts = []) {
            const usage = {
                experts: experts.length,
                iterations: 0,
                toolCalls: 0,
                llmMs: 0,
                toolMs: 0,
                inputTokens: 0,
                outputTokens: 0,
                cacheHitTokens: 0,
                wallMs: 0
            };
            experts.forEach(expert => {
                const metrics = expert.metrics || {};
                usage.iterations += metrics.iterations || 0;
                usage.toolCalls += metrics.toolCalls || 0;
                usage.llmMs += metrics.llmMs || 0;
                usage.toolMs += metrics.toolMs || 0;
                usage.inputTokens += metrics.inputTokens || 0;
                usage.outputTokens += metrics.outputTokens || 0;
                usage.cacheHitTokens += metrics.cacheHitTokens || 0;
            });
            return usage;
        }

        getLastRun() {
            return this.lastRun;
        }

        clip(text, max) {
            const str = String(text || '');
            return str.length <= max ? str : `${str.slice(0, max)}\n…[已截断]`;
        }
    }

    function now() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    function toNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) && num > 0 ? num : 0;
    }

    window.AgentExpertPanel = AgentExpertPanel;
})();
