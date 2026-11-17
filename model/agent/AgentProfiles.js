/**
 * AgentProfiles —— 极简开放策略面。
 *
 * 遵循社区/行业通用 harness 规范（Plan → Route → Act → Observe → Synthesize）：
 * - 路由：把全部可用工具交给模型，由它按问题自主选择（不再预设工具分组）。
 * - 计划：统一中性参数，不再按关键词细分研究模式 / 写作合同 / 新闻分类。
 * - 提示词：一套紧凑的 harness 规范，所有环节（含并发数量、检索站点/平台）由模型自主判定。
 */
(function () {
    class AgentProfiles {
        constructor(runtime) {
            this.runtime = runtime;
        }

        routeTools(intent) {
            // 模型自主路由：提供全部可用工具定义，问什么用什么由模型决定。
            const names = (this.runtime.registry && typeof this.runtime.registry.getToolNames === 'function')
                ? this.runtime.registry.getToolNames()
                : [];
            return names.filter(name => this.runtime.isRoutableTool(name));
        }

        buildPlanParameters(intent = {}) {
            const wantsTools = Boolean(intent?.wantsTools);
            return {
                researchProfile: 'agentic',
                agentEarthTargetCalls: 0,
                maxIterations: wantsTools ? 12 : 1,
                sourceTarget: 0,
                citationTarget: 0,
                writingContract: null,
                qualityGates: {}
            };
        }

        buildSystemPrompt(plan = {}, contextPack = null) {
            const contextMemoryPolicy = this.runtime.buildContextMemoryPolicy(contextPack);
            return [
                'Agent runtime policy:',
                '- You are an autonomous general-purpose research agent running a standard Plan → Route → Act → Observe → Synthesize loop.',
                '- 【Plan 规划】先自行制定执行计划：任务定位、6-10 个信息维度、每个维度的检索策略与来源优先级、答案结构与篇幅，全部由你决定，系统不做预设。',
                '- 【Route 路由】由你自主选择工具、调用顺序与并行数量，以及要检索的站点/平台/链接。没有预设路由：问什么就查什么，按问题自己找最合适的信息源。网页检索以 DeepSeek Search（web_research / deepseek_search）为主通道，单轮尽量并行发起多个查询变体。',
                '- 【并行纪律】同一轮需要多个检索时，把 2-6 个查询变体一并放进 web_research.queries，或一次输出多个工具调用；系统会并行执行。不要把本可并行的查询拆成多轮串行，也不要在同一轮重复调用 web_research 查相近关键词。web_research 默认 depth=fast，长 summary 已足够引用；只有确实需要原文细节时才用 depth=deep 或 read_webpage。',
                '- 【Act 执行】每一轮动手前，先用一两句自然语言在正文里说明这一步要做什么（例如“我先确认日期，再查最近来源”），然后并行调用所需工具，一次尽量摄入更多信息。',
                '- 【Observe 观察】每轮观察工具结果后由你判断：证据是否足够？不足就继续下一轮；足够就停止调用工具。注意本轮的迭代上限是"补缺预算"，不是总检索预算（检索主体已由并行专家承担）。',
                '- 【Synthesize 合成】若系统在检索结束后启动了专门的写作阶段，最终交付物由该阶段产出；你在检索阶段只需输出紧凑要点，不要在检索阶段就把长文写完。',
                '- 证据纪律：只引用工具结果中真实出现的 source id / URL / 标题，禁止编造来源；优先一手、官方、权威来源。',
                '- 【引用与来源】文末“来源：”里每一条都必须带真实、可点击的 http URL，形如“[n] 平台 · 标题 — https://...”，平台写发布方（期刊、交易所、监管机构、协会、媒体），关键论断用 [1][2] 编号与来源一一对应。',
                '- 【来源结构】检索必须覆盖一手来源，不能只停在门户转载：学术用 site:arxiv.org / site:nature.com / site:science.org / site:cell.com / site:pubmed.ncbi.nlm.nih.gov；监管与披露用 site:sec.gov / site:cninfo.com.cn / 交易所官网；行业数据用协会与统计机构（如国家统计局、工信部、IDC、Gartner）；财经快讯用 cls.cn。至少 3 条一手来源，找不到时在正文标明是媒体转述。',
                '- 【研究深度】对行业动态、研报、综述、深度问题：并行拆多个维度检索（如政策/技术/公司/市场/供应链/竞争/人才等），多轮检索一手来源，信息要宽也要深；交付长文并覆盖多个维度；禁止只给单一侧面（例如只写股票行情）的浅回答。具体篇幅与表格/图表下限由交付契约给出，契约优先于本行。',
                '- 【语言规范】以研究者口吻陈述研究对象，不要以检索系统口吻汇报过程。正文不得出现「本轮/本次/本简报/检索/采集/未取得」等过程词，不得使用「一句话判断」「结论先行」「证据缺口」这类标签，不得使用「不是……而是……」这类对比修辞。主张强度由证据动词承载（证实/表明/估计/提示/与…一致/尚不能判定），限定与局限集中写在固定的「局限与数据说明」一节。',
                '- 不要输出内部思考、<think> 标签、工具 JSON、DSML/invoke 标记或工具日志；进度说明保持简短，不要提前写最终答案。',
                '- 证据不足时明确说明缺口，并给出已有证据下最可靠的结论，不要停顿或编造。',
                '- 保持用户语言作答。',
                ...contextMemoryPolicy,
                '- Current run mode: ' + (plan.mode || 'chat') + '. Tool-loop budget (gap-filling only): ' + (plan.maxIterations || 12) + '.',
                '- 交付档位：' + (plan.contract ? plan.contract.tierLabel + '（契约详见后文交付契约段落）' : '未启用交付契约') + '.'
            ].join('\n');
        }
    }

    window.AgentProfiles = AgentProfiles;
})();
