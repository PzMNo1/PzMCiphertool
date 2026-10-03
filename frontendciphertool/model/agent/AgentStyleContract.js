/**
 * AgentStyleContract - 语言范式契约
 *
 * 要解决的问题（用户实测反馈）：输出充满「不是……而是……」「一句话判断」
 * 「证据缺口」「适用条件与不确定性」「深入挖掘」这类词，且大量弯弯绕绕。
 *
 * 根因一：这些词是我自己提示词里的字面量，模型只是忠实回声。
 *   - AgentResearchContract 曾写「结论先行的一句话判断」「明确写出"证据缺口"」
 *   - AgentExpertPanel 曾写「明确区分『已核实的事实』…证据不足就直接写"证据缺口"」
 * 根因二：写作阶段被喂入了检索过程元数据（证据条数、工具调用次数、缺口清单），
 *   于是模型用「本轮/本次/本简报未取得」这种**实验室笔记口吻**写报告，
 *   而不是以研究者口吻写世界。
 * 根因三：逐节模板（每节都要"结论先行+适用条件"）逼出 ~20 次同构修辞，
 *   模型用最廉价的断言动作（否定稻草人后断言）填空，即「不是A，而是B」。
 *
 * 本模块把「人类高智力论文/研报」的范式固化为可执行的规则 + 可审计的检测器 + 确定性清洗。
 * 规则依据（范畴级，检索确认）：
 *   - reporting verbs / 证据动词分级：主张强度由动词承载，而非标签
 *   - hedging & epistemic modality：限定语用于表达可信度，且不逐段重复
 *   - Toulmin 论证模型：主张 + 依据 + 推理 + 限定
 *   - separating claim from interpretation：事实与解释分离，归因就近
 *   - academic style：反对名词化堆砌、含糊强化词与元话语
 */
(function () {
    /* ---------------- 一、范式规则 ---------------- */

    const PARADIGM = {
        syntax: [
            '以陈述句承载主张，一句一个论断；避免用破折号、括注、并列短语把多重信息塞进一句。',
            '用具体动词承载判断（上升、回落、占比、集中、达到、降至），不用「是……的」「有着……的特点」这类空动词结构。',
            '术语可以名词化（如"良率爬坡"），但不允许用名词短语堆叠替代完整的因果句。',
            '每个数字必须紧邻量纲、统计口径与期间；无法给出三者的数字不得写入正文。',
            '长句用显式逻辑连接词衔接（因此、然而、在……条件下、与之相对），不用排比与对偶制造气势。',
            '禁止口语化对比修辞。需要对比时改为同维度并列陈述：先列 A 的数值与其口径，再列 B 的数值与其口径，然后说明二者是否可比。'
        ],
        semantics: [
            '主张强度用证据动词分级，而不是用标签声明。可用动词：证实、表明、估计、提示、与……一致、尚不能判定。',
            '避免过度断言动词："这说明""充分证明""彰显""凸显"——除非证据确实支持因果。',
            '归因就近：引用编号紧跟其所支撑的具体数字或论断，不要在一段末尾堆一串编号。',
            '事实与解释分离：先给可核实的事实，再给解释，用"据此""这与其……一致"衔接；无因果证据时写"同时出现""与……一致"，不写"导致"。',
            '术语一致：首次出现时给出定义，此后沿用同一术语，不替换同义词。',
            '禁用无主体表述（据悉、业内人士称、有观点认为）。给不出具体来源的论断直接删除，不要保留为"某种说法"。'
        ],
        discourse: [
            '局限性与不确定性集中在一处：固定的"局限与数据说明"小节，或摘要末尾一句。禁止逐段重复限定。',
            '禁止自我指涉检索过程。正文不得出现本轮、本次、本简报、检索、采集、证据库、未取得、缺口等过程词；方法与数据来源说明写入固定的"数据与方法"小节，且只写一次。',
            '段落首句承载该段主张（主题句），但不允许使用固定标签（如"一句话判断：""结论先行："）。主张直接陈述，不加标签前缀。',
            '摘要写实：给出结论与关键数字，不写"本报告分为几部分""本文将从三个角度展开"这类目录式元话语。',
            '表格需有表号、表题、单位（置于表头）与资料来源注；图需有图号、图题与坐标轴单位。仅用于凑数的图表不出现。',
            '不写元话语：值得注意的是、综上所述、不难看出、显而易见、众所周知。'
        ],
        logic: [
            '每个核心论断具备四要素：主张、依据（带引用）、推理（依据为何支持主张）、限定（适用条件）。限定用词汇表达，不单独成段、不加标签。',
            '区分相关与因果；无因果证据时明确写为共现或相关。',
            '证据冲突必须同时呈现双方数值、口径与可能原因，不做单边取舍，也不以"存疑"一笔带过。',
            '预测必须写明前提假设与失效条件；周期、幅度、时点三者缺一即降级为方向性判断并明示。'
        ]
    };

    /* ---------------- 二、禁用与限频模式 ---------------- */

    // severity: block = 必须清除；limit = 单篇出现次数上限
    const PATTERNS = [
        { id: 'contrast-rhetoric', re: /不是[^，。；！？\n]{1,40}[，,]\s*而?是/g, severity: 'block', label: '口语化对比修辞（不是…而是…）', advice: '改为同维度并列陈述并标注口径' },
        { id: 'not-but-variant', re: /并非[^，。；！？\n]{1,40}[，,]\s*而是/g, severity: 'block', label: '口语化对比修辞（并非…而是…）', advice: '同上' },
        { id: 'rather-than', re: /而不是/g, severity: 'limit', limit: 2, label: '口语化对比（而不是）', advice: '改为书面语「而非」，或改为并列陈述' },
        { id: 'label-yijuhua', re: /一句话(判断|总结|概括|说明|结论)/g, severity: 'block', label: '标签化表达（一句话…）', advice: '删掉标签，直接陈述主张' },
        { id: 'label-conclusion-first', re: /(结论先行|核心判断|一句话判断)\s*[:：]/g, severity: 'block', label: '结论标签', advice: '删掉标签前缀' },
        { id: 'label-conditions', re: /(适用条件与不确定性|适用条件|不确定性说明)\s*[:：]/g, severity: 'block', label: '限定标签（逐段重复）', advice: '限定改为词汇内嵌，并集中到"局限与数据说明"一处' },
        { id: 'meta-gap', re: /(证据缺口|数据缺口|证据不足|信息缺口)/g, severity: 'limit', limit: 3, label: '缺口类元话语', advice: '集中到"局限与数据说明"，正文改用"尚不能判定"等证据动词' },
        { id: 'meta-process', re: /(本简报|本报告|本轮|本次)(证据|检索|采集|未取得|未获得|覆盖)/g, severity: 'block', label: '自我指涉检索过程', advice: '删除过程叙述；方法信息只写在"数据与方法"小节' },
        { id: 'meta-not-obtained', re: /未(取得|获得|采集到)/g, severity: 'limit', limit: 2, label: '过程性否定', advice: '改为对结论强度的限定' },
        { id: 'meta-noteworthy', re: /(值得注意的是|综上所述|不难看出|显而易见|众所周知)/g, severity: 'limit', limit: 1, label: '元话语', advice: '删除' },
        { id: 'meta-bottomline', re: /(底层逻辑|归根结底|说到底|本质上就是)/g, severity: 'block', label: '空泛升华', advice: '替换为具体机制表述' },
        { id: 'meta-dig', re: /(深入挖掘|深挖|深耕|掘金)/g, severity: 'block', label: '夸张动作词', advice: '替换为"进一步检索/核算/拆分"' },
        { id: 'biz-jargon', re: /(赋能|抓手|闭环|生态位|打法|组合拳|护城河|第二曲线)/g, severity: 'limit', limit: 2, label: '商业黑话', advice: '替换为具体业务描述' },
        { id: 'vague-source', re: /(据悉|业内人士(称|表示|认为)|有分析(师)?认为|相关人士)/g, severity: 'block', label: '无主体归因', advice: '给出具体来源或删除该论断' },
        { id: 'over-assert', re: /(这说明|这充分说明|充分证明|彰显|凸显|无疑将)/g, severity: 'limit', limit: 2, label: '过度断言', advice: '降级为"与……一致""表明"' },
        { id: 'hype', re: /(颠覆|重塑行业|革命性|里程碑式|历史性|史无前例|王炸)/g, severity: 'limit', limit: 2, label: '夸张修辞', advice: '改为可量化的变化描述' },
        { id: 'parallel-tic', re: /(既要[^。\n]{1,20}又要|一方面[^。\n]{1,30}另一方面)/g, severity: 'limit', limit: 3, label: '排比套路', advice: '拆成独立陈述句' },
        { id: 'vague-hedge', re: /(可能或许|或许可能|大概也许|在一定程度上可能会)/g, severity: 'block', label: '叠加含糊限定', advice: '保留一个限定词' }
    ];

    // 需要审计但并不必然违规的软信号（用于风格修复决策）
    const SOFT_SIGNALS = [
        { id: 'hedge-dense', re: /(可能|或许|大概|似乎|恐怕)/g, per1000Limit: 6, label: '含糊限定词过密' },
        { id: 'emphasis-bold', re: /\*\*[^*\n]{2,40}\*\*/g, per1000Limit: 6, label: '加粗强调过密' }
    ];

    /* ---------------- 三、写作阶段风格简报 ---------------- */

    class AgentStyleContract {
        buildStylePrompt() {
            const section = (title, items) => [`【${title}】`, ...items.map(item => '- ' + item)].join('\n');
            return [
                '语言范式要求（面向专业读者：教授、博士、产业分析师；这是硬性要求，与内容要求同等重要）：',
                '',
                section('句法', PARADIGM.syntax),
                '',
                section('语义', PARADIGM.semantics),
                '',
                section('语篇', PARADIGM.discourse),
                '',
                section('论证', PARADIGM.logic),
                '',
                '以下表达一律不得出现（出现即视为不合格）：不是……而是……、并非……而是……、一句话判断、一句话总结、结论先行、适用条件与不确定性、证据缺口、数据缺口、本简报、本报告未取得、本轮证据、深入挖掘、深挖、底层逻辑、据悉、业内人士称、值得注意的是、综上所述、不难看出。',
                '',
                '自查口径：如果把文中的机构名与产品名替换成同类主体的名字，语句依然成立，说明这段是空话，必须重写为带具体数字与来源的表述。'
            ].join('\n');
        }

        /**
         * 写作阶段可选的简短版（放入 system message，与交付契约并列）
         */
        buildStyleSystemLine() {
            return [
                'Language paradigm (mandatory):',
                '- 以研究者口吻陈述世界，不要以检索系统口吻汇报过程。正文不得出现「本轮/本次/本简报/检索/采集/未取得」。',
                '- 主张强度由证据动词承载（证实/表明/估计/提示/与…一致/尚不能判定），不使用标签式前缀。',
                '- 禁止「不是……而是……」这类对比修辞；对比改为同维度并列陈述并标注口径。',
                '- 限定与局限集中写在「局限与数据说明」一处，不在各段重复。',
                '- 数字必须带量纲、口径、期间；引用编号就近贴在其支撑的论断之后。'
            ].join('\n');
        }

        /* ---------------- 四、审计 ---------------- */

        audit(content) {
            const text = String(content || '');
            if (!text.trim()) {
                return { ok: false, issues: ['交付物为空'], hits: [], stats: this.styleStats(text) };
            }

            const hits = [];
            for (const pattern of PATTERNS) {
                const matches = text.match(pattern.re);
                const count = matches ? matches.length : 0;
                if (!count) continue;
                const limit = pattern.severity === 'block' ? 0 : (pattern.limit || 1);
                if (count > limit) {
                    hits.push({
                        id: pattern.id,
                        label: pattern.label,
                        count,
                        limit,
                        severity: pattern.severity,
                        advice: pattern.advice,
                        samples: Array.from(new Set(matches)).slice(0, 3)
                    });
                }
            }

            const soft = [];
            const per1000 = text.length > 0 ? text.length / 1000 : 1;
            for (const signal of SOFT_SIGNALS) {
                const matches = text.match(signal.re);
                const count = matches ? matches.length : 0;
                if (count / per1000 > signal.per1000Limit) {
                    soft.push({ id: signal.id, label: signal.label, count, per1000: Number((count / per1000).toFixed(1)) });
                }
            }

            const stats = this.styleStats(text);
            const issues = [];

            hits.forEach(hit => {
                const verb = hit.severity === 'block' ? '必须清除' : `最多允许 ${hit.limit} 次`;
                issues.push(`${hit.label}：出现 ${hit.count} 次（${verb}）。处理建议：${hit.advice}。示例：${hit.samples.join(' / ')}`);
            });
            soft.forEach(item => {
                issues.push(`${item.label}：每千字 ${item.per1000} 次，密度偏高，请减少。`);
            });
            if (stats.labelLineCount > 0) {
                issues.push(`段落标签行 ${stats.labelLineCount} 处（形如「**xxx判断：**」的纯标签前缀），请删除标签只保留主张本身。`);
            }
            if (stats.repeatedLead > 0) {
                issues.push(`段落首句同构重复 ${stats.repeatedLead} 处，行文已呈模板化，请改为各自直接陈述主张。`);
            }
            if (stats.citationTailRatio > 0.5 && stats.citationParagraphs >= 4) {
                issues.push(`${Math.round(stats.citationTailRatio * 100)}% 的含引用段落把引用集中在段末，请改为就近归因（引用紧跟所支撑的数字或论断）。`);
            }

            return { ok: issues.length === 0, issues, hits, soft, stats };
        }

        styleStats(text) {
            const lines = String(text || '').split('\n');
            const body = lines.filter(line => !/^\s*$/.test(line));

            // 纯标签行：以 **标签：** 或 标签： 起头且标签本身不含数字
            // 注意：排除「判断一」「要点二」这类编号枚举——它们在研究报告里是正常写法，
            // 真正要治的是「一句话判断」「结论先行」「适用条件与不确定性」这类模板化标签。
            const labelLineCount = body.filter(line => {
                const trimmed = line.trim();
                const m = trimmed.match(/^(?:\*\*)?([^*：:\n]{2,20})(?:\*\*)?\s*[:：]/);
                if (!m) return false;
                const label = m[1].replace(/\*\*/g, '').trim();
                if (/\d/.test(label)) return false;
                // 以中文数字/序号结尾的是枚举标签，不算模板化标签
                if (/[一二三四五六七八九十]$/.test(label)) return false;
                return /(一句话|总结|结论|要点|条件|不确定|缺口|说明|概述|评价)/.test(label);
            }).length;

            // 段落首句同构：统计以相同 5 字重复开头的段落数
            const paragraphs = String(text || '').split(/\n{2,}/).filter(p => p.trim().length > 40);
            const leadMap = new Map();
            paragraphs.forEach(p => {
                const first = p.replace(/^[#>\-*\s]+/, '').slice(0, 5);
                if (first.length < 5) return;
                leadMap.set(first, (leadMap.get(first) || 0) + 1);
            });
            const repeatedLead = Array.from(leadMap.values()).filter(v => v > 1).reduce((sum, v) => sum + (v - 1), 0);

            // 引用是否集中在段末
            let citationParagraphs = 0;
            let tailClustered = 0;
            paragraphs.forEach(p => {
                const positions = Array.from(p.matchAll(/\[\d{1,3}\]/g)).map(m => m.index);
                if (!positions.length) return;
                citationParagraphs += 1;
                const threshold = p.length * 0.72;
                if (positions[0] >= threshold) tailClustered += 1;
            });

            const sentences = String(text || '').split(/[。！？!?]/).filter(s => s.trim().length > 0);
            const avgSentence = sentences.length
                ? Math.round(sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length)
                : 0;
            const longSentences = sentences.filter(s => s.length > 70).length;

            const cjk = (String(text || '').match(/[\u4e00-\u9fa5]/g) || []).length;

            return {
                chars: cjk,
                paragraphs: paragraphs.length,
                sentences: sentences.length,
                avgSentenceLength: avgSentence,
                longSentenceRatio: sentences.length ? Number((longSentences / sentences.length).toFixed(2)) : 0,
                labelLineCount,
                repeatedLead,
                citationParagraphs,
                citationTailRatio: citationParagraphs ? Number((tailClustered / citationParagraphs).toFixed(2)) : 0
            };
        }

        /* ---------------- 五、风格修复指令 ---------------- */

        buildStyleRepairPrompt(issues = [], contract = null) {
            return [
                '上一次的输出未达到语言范式要求。请重写整篇交付物（输出完整正文，不要输出修改说明或差异对比）。',
                '',
                '需要修正的问题：',
                ...issues.map(issue => '- ' + issue),
                '',
                '重写要求：',
                '1. 以研究者口吻陈述研究对象，不要出现任何关于检索过程的叙述。',
                '2. 主张直接陈述，不加标签前缀；限定语内嵌在句子里。',
                '3. 局限性、证据强度说明集中写到文末「局限与数据说明」一节，只写一次。',
                '4. 每个段落的首句是该段主张，但各段不得使用相同句式开头。',
                '5. 引用编号就近贴在被支撑的数字或论断之后。',
                '6. 保留原有的数据、表格与图表（表格/图表的下限：'
                + (contract ? `${contract.minTables} 个表格、${contract.minDiagrams} 个图表` : '按原样保留')
                + '），但删除仅为凑数而存在的图表。',
                contract ? `7. 正文中文字数不得少于 ${contract.minChars} 字。` : '',
                '8. 如果某处信息确实不足，用证据动词降低主张强度（如"尚不能判定"），而不是写"证据缺口"。'
            ].filter(Boolean).join('\n');
        }

        /* ---------------- 六、确定性清洗 ---------------- */

        /**
         * 在不改变事实内容的前提下，确定性地去掉标签前缀与重复限定行。
         * 这一步很关键：模型即使被要求不写标签，残留率仍不为零。
         */
        normalize(text) {
            const labelWords = /(一句话(判断|总结|概括|结论)|结论先行|核心判断|适用条件与不确定性|适用条件|不确定性说明|明确证据缺口|证据缺口|数据缺口)/;
            const lines = String(text || '').split('\n');
            const out = [];

            for (const rawLine of lines) {
                let line = rawLine;

                // 1) 纯标签行（标签独占一行）→ 整行删除
                const solo = line.trim().match(/^(?:\*\*)?([^*：:\n]{2,24})(?:\*\*)?\s*[:：]\s*$/);
                if (solo && labelWords.test(solo[1])) continue;

                // 2) 行首标签前缀 → 去掉标签只留内容
                const prefixed = line.match(/^(\s*(?:[-*+>]\s+|#{1,6}\s+)?)(?:\*\*)?([^*：:\n]{2,24})(?:\*\*)?\s*[:：]\s*([\s\S]+)$/);
                if (prefixed && labelWords.test(prefixed[2])) {
                    const marker = prefixed[1] || '';
                    line = marker + prefixed[3];
                }

                out.push(line);
            }

            let text2 = out.join('\n');

            // 3) 去掉「不是X，而是Y」的对比外壳，保留 Y 的陈述（仅在句式清晰时）
            text2 = text2.replace(/(?:并)?不是[^，。；！？\n]{1,40}[，,]\s*而是\s*/g, '');

            // 4) 「而不是」→ 书面语「而非」（语义不变，语域提升）
            text2 = text2.replace(/而不是/g, '而非');
            text2 = text2.replace(/而非(?=[，。；、])/g, '而非');

            // 5) 压缩连续空行
            text2 = text2.replace(/\n{3,}/g, '\n\n');

            // 6) 清理行尾多余空格
            text2 = text2.split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n');

            return text2.trim();
        }

        getParadigm() {
            return JSON.parse(JSON.stringify(PARADIGM));
        }

        listPatterns() {
            return PATTERNS.map(p => ({ id: p.id, label: p.label, severity: p.severity, limit: p.limit || 0 }));
        }
    }

    window.AgentStyleContract = AgentStyleContract;
    window.agentStyleContract = window.agentStyleContract || new AgentStyleContract();
})();
