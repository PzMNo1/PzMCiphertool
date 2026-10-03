/**
 * AgentResearchContract - 研究交付契约
 *
 * 解决的问题：Agent 检索了 402 条证据 / 252 个来源，却只写出 2564 个中文字、
 * 0 个表格、0 个图表。根因不是参数被截断（maxTokens 32768 没用满、warnings 为空，
 * 循环是自然结束的），而是缺少"交付标准"——模型自己决定写多少就是多少。
 *
 * 本模块提供三件事：
 * 1. classify()   —— 按意图信号（而非字符数）判定任务档位，输出硬性交付指标。
 * 2. 契约提示词   —— 注入系统提示词，把篇幅/章节/表格/图表变成明确要求。
 * 3. verify()     —— 生成后校验，不合格则给出可执行的补充指令（repair）。
 * 4. buildEvidenceDigest() —— 把数百条证据压成可引用的编号摘要，提高引用利用率。
 */
(function () {
    const TIERS = {
        chat: {
            key: 'chat',
            label: '对话',
            minChars: 0,
            minTables: 0,
            minDiagrams: 0,
            minCitations: 0,
            panelSize: 0,
            requiresSources: false
        },
        brief: {
            key: 'brief',
            label: '情报简报',
            minChars: 12000,
            minTables: 3,
            minDiagrams: 5,
            minCitations: 20,
            // 即使是简报也并行拆 3 个专家：既提升信息密度，又把多轮串联的墙钟时间压到最慢专家的耗时
            panelSize: 3,
            requiresSources: true
        },
        report: {
            key: 'report',
            label: '研究报告',
            minChars: 14000,
            minTables: 4,
            minDiagrams: 6,
            minCitations: 25,
            panelSize: 4,
            requiresSources: true
        },
        deep_research: {
            key: 'deep_research',
            label: '深度研究报告',
            minChars: 16000,
            minTables: 5,
            minDiagrams: 8,
            minCitations: 35,
            panelSize: 5,
            requiresSources: true
        }
    };

    // 研究型意图信号
    const RESEARCH_SIGNALS = [
        '研报', '研究报告', '报告', '白皮书', '深度', '全面', '系统梳理', '综述', '调研', '尽调',
        '产业链', '供应链', '格局', '趋势', '前景', '展望', '技术路线', '市场规模', '竞争分析',
        '行业分析', '投研', '策略', '专题', '分析报告', '论文', '文献', '方法论'
    ];

    // 时效型意图信号（偏简报，但依旧需要结构化交付）
    const BRIEF_SIGNALS = [
        '动态', '新闻', '今日', '最新', '快讯', '日报', '周报', '月报', '行情', '盘面',
        '进展', '发生了什么', '有哪些'
    ];

    // 广度信号：出现越多，越应该拆维度并行
    const BREADTH_SIGNALS = [
        '多维度', '多个角度', '各方面', '全局', '上下', '竞争', '政策', '监管', '技术',
        '市场', '资本', '融资', '人才', '地缘', '产能', '成本', '客户', '份额'
    ];

    // 分析动作信号：表示这是一次需要论证的请求，但强度低于"研报"
    const ANALYSIS_SIGNALS = [
        '分析', '研究', '评估', '对比', '比较', '解读', '怎么看', '为什么', '如何', '影响',
        '原因', '判断', '预测', '展望', '梳理', '总结'
    ];

    // 纯操作指令：属于工具调用而非研究任务，必须快速通道处理，不要启动专家面板与长文写作
    const QUICK_ACTION_SIGNALS = [
        '打开', '切换', '点击', '跳转', '收起', '展开', '关闭', '停止', '取消', '重试',
        '现在几点', '今天几号', '现在时间', '当前日期', '搜索卡片', '高亮', '滚动到', '清空'
    ];

    // 报告档位的章节骨架（模型可增删，但不得少于这些主题）
    const REPORT_SECTIONS = [
        '摘要与核心结论',
        '关键数据一览',
        '背景与范围界定',
        '政策与监管',
        '技术与产品路线',
        '市场与竞争格局',
        '产业链与供给',
        '资本与财务',
        '风险与反方证据',
        '未来 6-18 个月关键节点',
        '结论与行动建议'
    ];

    const BRIEF_SECTIONS = [
        '要点速览',
        '关键数据一览',
        '分项动态',
        '风险与不确定项',
        '值得盯的下一节点'
    ];

    class AgentResearchContract {
        constructor(options = {}) {
            this.options = Object.assign({
                // 单条证据摘要的字符上限
                digestItemChars: 220,
                // 证据摘要总字符上限。刻意不设太大：提示词越长，预填充越慢，
                // 而单次写作请求有硬超时（后端 SSE 300 秒），过长提示词会挤压生成时间。
                digestMaxChars: 8000,
                // 摘要中最多保留的来源条数
                digestMaxItems: 80,
                // 是否允许把档位降级（用户明确说"简单说"时）
                allowDowngrade: true
            }, options || {});
        }

        /* ---------------- 任务分级 ---------------- */

        /**
         * 按意图信号判定档位。刻意不使用字符长度作为门槛——
         * 「半导体今天的动态」只有 9 个字符，却是典型的简报/研报请求。
         */
        classify(input = {}) {
            const text = String(input.query || '');
            const lower = text.toLowerCase();

            if (input.mode === 'chat' && !input.toolEnabled) {
                return this.describe(TIERS.chat, { query: text, reasons: ['对话模式且未启用工具'] });
            }

            const researchHits = this.matchSignals(lower, RESEARCH_SIGNALS);
            const briefHits = this.matchSignals(lower, BRIEF_SIGNALS);
            const breadthHits = this.matchSignals(lower, BREADTH_SIGNALS);
            const analysisHits = this.matchSignals(lower, ANALYSIS_SIGNALS);
            const quickActionHits = this.matchSignals(lower, QUICK_ACTION_SIGNALS);

            let tier = TIERS.chat;
            const reasons = [];

            const researchScore = researchHits.length * 3 + breadthHits.length;
            const substantive = researchHits.length + briefHits.length + breadthHits.length + analysisHits.length;

            // 纯操作指令（"帮我打开知识图谱"、"现在几点"）：走对话档，不启动专家面板与长文写作。
            // 注意：只有当它同时不含研究/广度信号时才降级，避免"打开研报页面并分析"这类混合请求被误判。
            if (quickActionHits.length && !researchHits.length && !breadthHits.length) {
                return this.describe(TIERS.chat, {
                    query: text,
                    briefHits,
                    analysisHits,
                    reasons: ['纯操作指令（' + quickActionHits.join('/') + '），按对话档快速处理']
                });
            }

            if (researchScore >= 6 || (researchHits.length >= 2 && breadthHits.length >= 3)) {
                tier = TIERS.deep_research;
                reasons.push(`研究型信号 ${researchHits.length} 个、广度信号 ${breadthHits.length} 个`);
            } else if (researchScore >= 2 || breadthHits.length >= 3) {
                tier = TIERS.report;
                reasons.push(`研究型信号 ${researchHits.length} 个、广度信号 ${breadthHits.length} 个`);
            } else if (briefHits.length > 0 || substantive >= 1) {
                tier = TIERS.brief;
                reasons.push(`时效信号 ${briefHits.length} 个、分析信号 ${analysisHits.length} 个`);
            } else {
                tier = TIERS.chat;
                reasons.push('未检出研究/时效/分析意图');
            }

            // 显式要求简洁时降级
            if (this.options.allowDowngrade && /简单说|一句话|简短|简要|不用展开|只需/.test(text)) {
                const downgrade = { chat: TIERS.chat, brief: TIERS.chat, report: TIERS.brief, deep_research: TIERS.report };
                reasons.push('用户要求简短，档位降级');
                tier = downgrade[tier.key] || tier;
            }

            return this.describe(tier, {
                query: text,
                researchHits,
                briefHits,
                breadthHits,
                reasons,
                toolEnabled: Boolean(input.toolEnabled),
                deepThink: Boolean(input.deepThink)
            });
        }

        describe(tier, meta = {}) {
            const sections = tier.key === 'deep_research' || tier.key === 'report'
                ? REPORT_SECTIONS.slice()
                : (tier.key === 'brief' ? BRIEF_SECTIONS.slice() : []);

            return {
                tier: tier.key,
                tierLabel: tier.label,
                minChars: tier.minChars,
                minTables: tier.minTables,
                minDiagrams: tier.minDiagrams,
                minCitations: tier.minCitations,
                requiresSources: tier.requiresSources,
                panelSize: tier.panelSize || 0,
                sections,
                signals: {
                    research: meta.researchHits || [],
                    brief: meta.briefHits || [],
                    breadth: meta.breadthHits || [],
                    analysis: meta.analysisHits || []
                },
                reasons: meta.reasons || [],
                isResearch: tier.key === 'report' || tier.key === 'deep_research',
                // 需要并行专家面板的档位与规模
                needsExpertPanel: (tier.panelSize || 0) > 0
            };
        }

        matchSignals(lowerText, signals) {
            return signals.filter(signal => lowerText.includes(String(signal).toLowerCase()));
        }

        /* ---------------- 契约提示词 ---------------- */

        /**
         * 注入系统提示词的交付契约段落。
         */
        buildContractPrompt(contract) {
            if (!contract || contract.tier === 'chat') return '';

            const lines = [
                '【交付契约 - 强制】本次任务的交付标准如下，必须全部满足，不满足视为未完成：',
                `- 档位：${contract.tierLabel}`,
                `- 正文篇幅：不少于 ${contract.minChars} 个中文字（不含来源列表与 URL）。宁可写长，不可写短。`,
                `- 必须包含至少 ${contract.minTables} 个 Markdown 表格（用 | 分隔，含表头与分隔行），用于承载可比较的数据、指标、参与者、时间线。`,
                `- 必须包含至少 ${contract.minDiagrams} 个 Mermaid 图表，用 \`\`\`mermaid 围栏包裹。推荐用法：因果/归因分析用 flowchart（鱼骨式：把多个成因分支汇入结果节点）；结构占比用 pie；量级对比或帕累托分析用 xychart-beta（柱状，按数值降序排列即帕累托图）；时间线用 timeline 或 gantt。`,
                `- 引用：全文至少 ${contract.minCitations} 个 [n] 编号引用，编号必须与文末来源列表一一对应，不得跳号或编造。`,
                '- 结构与篇幅分配建议（可按实际情况增删章节，但不得缺失这些主题）：'
            ];

            contract.sections.forEach((section, index) => {
                lines.push(`  ${index + 1}. ${section}`);
            });

            lines.push(
                '- 章节内部不得使用「结论先行」「一句话判断」「适用条件与不确定性」这类标签前缀；主张直接陈述，限定语内嵌在句子里。',
                '- 每个核心论断需具备：主张、依据（带引用编号）、推理（依据为何支持主张）、限定（适用条件，用词汇表达）。',
                '- 局限性与证据强度说明集中写到文末「局限与数据说明」一节，只写一次，不要在正文各段落重复。',
                '- 字数必须来自信息密度（数据、对比、机制、边界条件），不得用同义反复与空泛议论凑字数。'
            );

            return lines.join('\n');
        }

        /* ---------------- 长文合成指令 ---------------- */

        /**
         * 工具循环结束后的独立长文合成指令。
         * 这一步是拿到 5000-10000+ 字的关键：与工具循环解耦，不受"轮次耗尽"影响。
         *
         * 注意：这里刻意**不**传入检索过程元数据（证据条数、工具调用次数、缺口清单）。
         * 一旦把这些喂给写作模型，正文就会变成「本轮证据/本次采集/未取得…」的实验室笔记口吻，
         * 而不是研究者陈述世界的口吻——这是上一版语言污染的主要来源之一。
         */
        buildSynthesisInstruction(contract, options = {}) {
            const {
                outline = null,
                evidenceDigest = '',
                expertDigest = '',
                stylePrompt = ''
            } = options;

            const blocks = [
                '请撰写这份交付物的完整正文。检索已经结束，不要再调用工具，一次写完。',
                '',
                this.buildContractPrompt(contract)
            ];

            if (stylePrompt) {
                blocks.push('', stylePrompt);
            }

            if (outline) {
                blocks.push('', '章节骨架（可增删，但不得缺失这些主题）：', outline);
            }

            // 并行专家的实质研究成果：这是最富信息量的材料，必须进写作阶段。
            // 只保留发现本身（事实、数字、来源），过程统计（调用次数、轮次）一律不带。
            if (expertDigest) {
                blocks.push(
                    '',
                    '【分维度研究材料】以下是各方向专家完成的一手检索结果。写作时必须把它们的事实、数字与来源用进正文，不要只是概括转述：',
                    expertDigest
                );
            }

            if (evidenceDigest) {
                blocks.push(
                    '',
                    '【参考资料】编号 1-N 与文末来源列表一一对应。撰写时把关键论断落到具体编号上，编号就近贴在其支撑的数字或论断之后：',
                    evidenceDigest
                );
            }

            blocks.push(
                '',
                '输出要求：',
                '1. 直接输出正文，不要写开场白，不要复述本指令，不要输出修改说明。',
                '2. 开篇是执行摘要：给出核心结论与关键数字，不写"本文分为几部分"这类目录式元话语。',
                `3. 全文不少于 ${contract.minChars} 个中文字，用小标题分隔章节。`,
                `4. 至少 ${contract.minTables} 个 Markdown 表格、${contract.minDiagrams} 个 Mermaid 图表，放在最能承载信息的位置；仅为凑数而存在的图表不要出现。`,
                '5. 文末依次为「局限与数据说明」与「来源：」两节；来源每条一行「[n] 标题 — URL」，编号与正文引用严格对应。',
                '6. 保持用户使用的语言。',
                '7. 正文中不得出现任何关于检索过程的叙述（本轮、本次、本简报、检索、采集、未取得、缺口等）。'
            );

            return blocks.join('\n');
        }

        /**
         * 不合格时的补充指令（repair pass）。
         */
        buildRepairInstruction(contract, issues = []) {
            return [
                '上一次交付物未达到交付标准，请针对下列问题重写或扩写，并输出完整交付物（不是补丁、不是差异说明）：',
                ...issues.map(issue => `- ${issue}`),
                '',
                `篇幅下限 ${contract.minChars} 个中文字；表格下限 ${contract.minTables} 个；Mermaid 图表下限 ${contract.minDiagrams} 个；引用下限 ${contract.minCitations} 个。`,
                '不要重复堆砌已有段落来凑字数：需要补充的是新的数据点、对比、机制解释、边界条件与反面证据。',
                '如果某处信息确实不足以支撑强主张，请用证据动词降低主张强度（如"尚不能判定"），而不是写"证据缺口"或用泛泛议论填充。'
            ].join('\n');
        }

        /* ---------------- 交付物校验 ---------------- */

        countChineseChars(text) {
            return (String(text || '').match(/[\u4e00-\u9fa5]/g) || []).length;
        }

        countTables(text) {
            const lines = String(text || '').split('\n');
            let count = 0;
            for (const line of lines) {
                const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
                if (cells.length >= 2 && cells.every(cell => /^:?-{3,}:?$/.test(cell.trim().replace(/\s+/g, '')))) {
                    count += 1;
                }
            }
            return count;
        }

        countDiagrams(text) {
            return (String(text || '').match(/```mermaid\b/gi) || []).length;
        }

        countCitations(text) {
            const markers = new Set();
            const matches = String(text || '').matchAll(/\[(\d{1,3})\]/g);
            for (const match of matches) markers.add(match[1]);
            return markers.size;
        }

        hasSourcesSection(text) {
            return /(^|\n)\s*(#{1,6}\s*)?(来源|参考|引用|Sources|References)\s*[:：]?\s*(\n|$)/i.test(String(text || ''));
        }

        /**
         * 校验交付物，返回未达标项与可执行的补充指令。
         */
        verify(content, contract) {
            const text = String(content || '');
            if (!contract || contract.tier === 'chat') {
                return { ok: true, issues: [], stats: { chars: this.countChineseChars(text), tables: 0, diagrams: 0, citations: 0 } };
            }

            const stats = {
                chars: this.countChineseChars(text),
                tables: this.countTables(text),
                diagrams: this.countDiagrams(text),
                citations: this.countCitations(text),
                hasSources: this.hasSourcesSection(text)
            };

            const issues = [];
            if (stats.chars < contract.minChars) {
                issues.push(`正文仅 ${stats.chars} 个中文字，低于 ${contract.minChars} 字下限，缺口约 ${contract.minChars - stats.chars} 字。`);
            }
            if (stats.tables < contract.minTables) {
                issues.push(`Markdown 表格只有 ${stats.tables} 个，需要至少 ${contract.minTables} 个。`);
            }
            if (stats.diagrams < contract.minDiagrams) {
                issues.push(`Mermaid 图表只有 ${stats.diagrams} 个，需要至少 ${contract.minDiagrams} 个。`);
            }
            if (stats.citations < contract.minCitations) {
                issues.push(`引用编号只有 ${stats.citations} 个，需要至少 ${contract.minCitations} 个。`);
            }
            if (contract.requiresSources && !stats.hasSources) {
                issues.push('缺少文末「来源：」列表。');
            }

            return { ok: issues.length === 0, issues, stats };
        }

        /* ---------------- 证据消化 ---------------- */

        /**
         * 从 evidenceLedger 中挑选可引用来源，并**重新分配 1..N 的稠密编号**。
         *
         * 为什么要重编号：ledger 里的 source_id 来自采集顺序（可能只有 500 条里的第 73、77、103 条），
         * 直接沿用它会让正文出现 [73][77][103] 这种跳号，读者无从对照，也违反契约里"不得跳号"的要求。
         * 返回的 entries 编号与 digest、正文引用、文末来源列表三者严格一致。
         */
        buildCitationSources(evidenceLedger = [], options = {}) {
            const list = Array.isArray(evidenceLedger) ? evidenceLedger : [];
            if (!list.length) return { entries: [], digest: '' };

            const maxItems = Number(options.maxItems) > 0 ? Number(options.maxItems) : this.options.digestMaxItems;
            const maxChars = Number(options.maxChars) > 0 ? Number(options.maxChars) : this.options.digestMaxChars;

            // 按域名分层，保证来源多样性：同一域名最多保留 N 条
            const perHostLimit = Math.max(2, Math.ceil(maxItems / 12));
            const hostCount = new Map();
            const picked = [];
            const seen = new Set();

            // 优先保留带标题、且带内容片段的条目（信息量更高）
            const score = entry => {
                let value = 0;
                if (String(entry?.title || '').length > 4) value -= 2;
                if (String(entry?.snippet || entry?.content_preview || '').length > 20) value -= 3;
                return value;
            };
            const ordered = list.slice().sort((a, b) => score(a) - score(b));

            const consider = (entry, limit) => {
                const url = String(entry?.url || '');
                if (!/^https?:\/\//i.test(url)) return false;
                if (seen.has(url)) return false;
                const host = this.hostOf(url);
                const used = hostCount.get(host) || 0;
                if (used >= limit) return false;
                hostCount.set(host, used + 1);
                seen.add(url);
                picked.push(entry);
                return true;
            };

            // 第一轮：每域名限流，保证多样性
            for (const entry of ordered) {
                if (picked.length >= maxItems) break;
                consider(entry, perHostLimit);
            }
            // 第二轮：域名集中时放宽限流，把预算用满
            if (picked.length < maxItems) {
                for (const entry of ordered) {
                    if (picked.length >= maxItems) break;
                    consider(entry, Number.MAX_SAFE_INTEGER);
                }
            }

            // 稠密重编号
            const entries = picked.map((entry, index) => ({
                ...entry,
                id: `evd-${index + 1}`,
                source_id: String(index + 1),
                sourceId: String(index + 1)
            }));

            return { entries, digest: this.buildEvidenceDigest(entries, options) };
        }

        /**
         * 把来源列表压成可引用的编号摘要。
         * 目标是让模型在合成阶段真的能用上采集到的证据，而不是只引 26/402。
         */
        buildEvidenceDigest(evidenceLedger = [], options = {}) {
            const list = Array.isArray(evidenceLedger) ? evidenceLedger : [];
            if (!list.length) return '';

            const maxChars = Number(options.maxChars) > 0 ? Number(options.maxChars) : this.options.digestMaxChars;
            const itemChars = Number(options.itemChars) > 0 ? Number(options.itemChars) : this.options.digestItemChars;

            const lines = [];
            let used = 0;
            for (const entry of list) {
                const id = entry.source_id ?? entry.sourceId ?? '';
                const title = String(entry.title || '').replace(/\s+/g, ' ').trim() || this.hostOf(String(entry.url || ''));
                const url = String(entry.url || '');
                const snippet = String(entry.snippet || entry.content_preview || entry.contentPreview || '')
                    .replace(/\s+/g, ' ')
                    .trim();
                // 带上内容片段：只给 URL 的话，写作阶段只能写出"某机构页面显示…"这类空话
                const detail = snippet && snippet.length > 20
                    ? `\n    ${this.clip(snippet, itemChars)}`
                    : '';
                const line = `[${id}] ${this.clip(title, 120)} — ${url}${detail}`;
                if (used + line.length > maxChars) break;
                lines.push(line);
                used += line.length + 1;
            }

            // 头部刻意不带"共采集 N 条/其中 M 条带片段"这类过程统计：
            // 把采集统计写进参考资料，会诱导模型在正文里汇报检索过程。
            const header = `参考资料清单（编号 1-${lines.length}，与文末来源列表一一对应）：`;

            return [header, ...lines].join('\n');
        }

        hostOf(url) {
            try {
                return new URL(url).hostname.replace(/^www\./, '');
            } catch (error) {
                return '';
            }
        }

        clip(text, max) {
            const str = String(text || '');
            return str.length <= max ? str : `${str.slice(0, max)}…`;
        }

        getTiers() {
            return Object.keys(TIERS).map(key => ({ ...TIERS[key] }));
        }
    }

    window.AgentResearchContract = AgentResearchContract;
    window.agentResearchContract = window.agentResearchContract || new AgentResearchContract();
})();
