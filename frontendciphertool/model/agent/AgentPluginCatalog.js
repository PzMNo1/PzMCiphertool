/**
 * AgentPluginCatalog —— 内置插件清单。
 *
 * 每个内置 Skill / Harness 都是一份 manifest：能力声明、约束、挂载函数、disposer。
 * 挂载失败只影响该插件，不阻塞内核启动；清单本身即 B 阶段交给 Cordis 的输入。
 */
(function () {
    const SKILLS = [
        {
            id: 'research',
            name: '研报 / 行业研究',
            summary: '行业与公司深度研究，多维取证与对照表交付',
            keywords: ['研报', '行业研究', '行业分析', '市场分析', '产业链', '赛道', '深度研究', '行业报告'],
            tools: ['web_research', 'deepseek_search', 'read_webpage', 'finance_query', 'news_query', 'agent_earth_run'],
            priority: 3,
            prompt: [
                '- 先固定口径：地区、时间窗、统计范围、币种，口径不清时先声明采用哪一种。',
                '- 按政策 / 需求 / 供给 / 竞争 / 财务 / 风险的顺序取证，每个维度至少一个一手来源。',
                '- 数字必须可追溯到年报、监管披露或协会统计；机构预测标注发布方与发布日期。',
                '- 一手来源至少 3 条：监管文件、行业协会统计、公司年报或招标公告；门户转载只能用于补充与交叉验证。',
                '- 交付优先用对照表（公司×指标、年份×指标），避免把来源平铺成大段罗列。'
            ]
        },
        {
            id: 'academic',
            name: '论文 / 文献',
            summary: '学术文献检索、研究设计与引用规范',
            keywords: ['论文', '文献', '综述', 'arxiv', 'doi', '引用', '实验', '方法论', 'peer review', 'paper'],
            tools: ['web_research', 'deepseek_search', 'read_webpage'],
            priority: 3,
            prompt: [
                '- 先写检索式：研究对象 + 同义词 + 方法词，再区分原始研究与综述。',
                '- 检索式带 site:arxiv.org / site:nature.com / site:science.org / site:pubmed.ncbi.nlm.nih.gov，优先读到原文。',
                '- 每项结论标注研究设计、样本量、效应方向；相关性不得表述为因果。',
                '- 引用带 DOI、arXiv 或期刊链接；预印本必须注明未经同行评审。',
                '- 多篇结论冲突时并列呈现证据强度，不要用票数决定结论。'
            ]
        },
        {
            id: 'finance',
            name: '财报 / 披露文件',
            summary: '三大表、口径还原与风险段落',
            keywords: ['财报', '年报', '季报', '10-k', '10-q', '招股书', '营收', '毛利率', '现金流', '资产负债表', '利润表'],
            tools: ['finance_query', 'news_query', 'web_research', 'read_webpage'],
            priority: 4,
            prompt: [
                '- 先确认口径：合并/母公司、会计年度、币种、是否经审计。',
                '- 取数优先巨潮资讯（cninfo）、交易所公告与公司 IR 页面，媒体转述只用于交叉验证。',
                '- 区分披露数字与计算数字；计算数字写出公式与取数来源。',
                '- 做同比/环比与同行对比，异常科目回到附注找原因。',
                '- 风险段落覆盖一次性损益、商誉减值、关联交易、表外负债、审计意见类型。'
            ]
        },
        {
            id: 'article',
            name: '长文 / 文章',
            summary: '长文结构与叙述推进',
            keywords: ['写一篇', '文章', '公众号', '稿件', '长文', '随笔', '评论', '专栏'],
            tools: ['web_research', 'deepseek_search', 'read_webpage'],
            priority: 2,
            prompt: [
                '- 先定结构骨架：问题 — 证据 — 反例 — 结论，再逐节填证据。',
                '- 段落之间用事实推进，不用「首先/其次/最后」这类空转连接词。',
                '- 每节至少一个可核验的具体事实，避免通篇观点。'
            ]
        }
    ];

    const HARNESSES = [
        {
            id: 'delivery',
            name: '交付链路',
            summary: '并行专家检索 + 补缺循环 + 长文交付校验',
            policy: { expertPanel: true, deliverable: true, synthesis: true },
            maxAgentIterations: null,
            prompt: []
        },
        {
            id: 'quick',
            name: '快速回答',
            summary: '单路工具循环，跳过专家面板与长文交付',
            stages: [
                { id: 'plan', label: 'Plan' },
                { id: 'act', label: 'Act' },
                { id: 'synthesize', label: 'Synthesize' }
            ],
            policy: { expertPanel: false, deliverable: false, synthesis: true },
            maxAgentIterations: 6,
            prompt: ['- 快速模式：在有限轮次内给出可核验的答案，先结论后证据，不铺陈。']
        },
        {
            id: 'deep',
            name: '深度研究',
            summary: '扩大检索维度与校验轮次，适用于长报告与多源交叉',
            policy: { expertPanel: true, deliverable: true, synthesis: true },
            maxAgentIterations: null,
            prompt: ['- 深度模式：先建立证据矩阵（维度×来源×年份），确认无维度缺口后再进入写作。']
        }
    ];

    function skillManifest(skill) {
        return {
            id: `skill.${skill.id}`,
            kind: 'skill',
            name: skill.name,
            source: 'builtin',
            placement: 'model/agent/',
            contracts: 'read-only',
            capabilities: [],
            prompt: skill.prompt,
            provides: { skills: [skill.id] },
            mount: ctx => ctx.skills.register({ ...skill, source: 'builtin' })
        };
    }

    function harnessManifest(harness) {
        return {
            id: `harness.${harness.id}`,
            kind: 'harness',
            name: harness.name,
            source: 'builtin',
            placement: 'model/agent/',
            contracts: 'read-only',
            capabilities: [],
            prompt: harness.prompt,
            provides: { harnesses: [harness.id] },
            mount: ctx => ctx.harnesses.register({ ...harness, source: 'builtin' })
        };
    }

    const TOOL_RUNTIME = {
        id: 'tools.builtin',
        kind: 'tool',
        name: '内置工具运行时',
        source: 'builtin',
        placement: 'model/agent/',
        contracts: 'read-only',
        capabilities: ['network'],
        provides: { tools: window.toolRegistry.getToolNames() },
        mount: ctx => {
            ctx.tools.attachExecutor(ctx.executor);
            return () => ctx.tools.detachExecutor();
        }
    };

    const MCP_RUNTIME = {
        id: 'mcp.runtime',
        kind: 'mcp',
        name: 'MCP 运行时',
        source: 'builtin',
        placement: 'model/agent/',
        contracts: 'read-only',
        capabilities: ['network'],
        provides: { tools: [] },
        mount: ctx => {
            ctx.mcp.attachExecutor(ctx.executor);
            ctx.mcp.hydrate();
            return () => {
                ctx.mcp.unregisterAll();
                ctx.mcp.detachExecutor();
            };
        }
    };

    const kernel = new AgentPluginKernel();
    kernel.provide('tools', window.toolRegistry);
    kernel.provide('skills', window.agentSkillRegistry);
    kernel.provide('harnesses', window.agentHarnessRegistry);
    kernel.provide('mcp', window.agentMcpClient);
    kernel.provide('executor', window.agentToolExecutor);

    const manifests = [
        ...SKILLS.map(skillManifest),
        ...HARNESSES.map(harnessManifest),
        TOOL_RUNTIME,
        MCP_RUNTIME
    ];

    manifests.forEach(manifest => {
        try {
            kernel.mount(manifest);
        } catch (error) {
            console.warn('[plugin] 内置插件挂载失败', manifest.id, error?.message || error);
        }
    });

    window.agentPluginKernel = kernel;
    window.agentPluginManifests = manifests;
})();
