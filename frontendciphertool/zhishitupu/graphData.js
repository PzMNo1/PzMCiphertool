// ========== 知识图谱 - 树形数据源 ==========
// 添加节点只需在对应分支的 children 下加一行 { name: '名称' }
// id、group、color、link 全部自动生成，无需手动维护
//
// 默认图谱参考：
// - ODataMap 的七个知识大陆、研究对象尺度轴、知识成熟度轴
// - Google Data Commons / Google Knowledge Graph 的实体、类型、统计变量、来源组织方式

let _graphAutoId = 0;

const GRAPH_EXPERT_DOMAINS = [
    {
        id: 'ai', label: '人工智能与自主系统',
        patterns: ['agent', 'model', 'learning', 'intelligence', 'robot', 'ai', '智能', '模型', '学习', '机器人'],
        vocabulary: ['表征学习', '自监督预训练', '推理时计算', '工具调用', '长期记忆', '可解释性', '分布外泛化', '对齐与红队评测'],
        mechanisms: '从数据生成过程、表征空间、训练目标、推断策略和闭环反馈分析能力来源；区分参数知识、上下文学习、外部记忆与具身交互。',
        metrics: '任务成功率、校准误差、鲁棒性、延迟、吞吐量、token/能耗成本、工具调用准确率、长程任务完成率与安全违规率。',
        evidence: '优先系统综述、顶级会议/期刊、公开基准及可复现实验；工程结论须报告模型版本、数据污染控制、消融实验和置信区间。',
        risks: '重点审查幻觉、提示注入、奖励投机、分布漂移、自动化偏差、隐私泄露、双重用途及人类监督失效。',
        sources: ['arXiv', 'OpenAlex', 'Semantic Scholar', 'Papers with Code', 'Hugging Face', 'GitHub']
    },
    {
        id: 'quantum-materials', label: '量子科学、材料与微纳器件',
        patterns: ['quantum', 'superconduct', 'photon', 'material', 'nano', '量子', '超导', '光子', '材料', '纳米'],
        vocabulary: ['哈密顿量', '量子相干', '退相干', '能带结构', '拓扑不变量', '声子散射', '缺陷态', '工艺良率'],
        mechanisms: '从对称性、守恒律、哈密顿量、能谱与多体相互作用推导可观测量，并连接材料制备、器件结构和读出链路。',
        metrics: '相干时间、门保真度、量子体积、能隙、迁移率、品质因数、噪声谱密度、缺陷密度、良率和工作温区。',
        evidence: '优先同行评审实验、计量可溯源数据、独立复现和原始谱图；必须注明样品、边界条件、误差棒及统计显著性。',
        risks: '关注尺度放大、材料批次差异、低温与真空条件、测量反作用、器件串扰、制造一致性和“实验演示即工程可用”的外推错误。',
        sources: ['APS', 'Nature Portfolio', 'Science', 'arXiv', 'OpenAlex', 'NIST']
    },
    {
        id: 'bio-health', label: '生命科学、生物工程与精准医学',
        patterns: ['gene', 'protein', 'cell', 'bio', 'medical', 'health', 'brain', '基因', '蛋白', '细胞', '生物', '医学', '健康', '脑'],
        vocabulary: ['基因型-表型映射', '因果通路', '靶点可成药性', '药代动力学/药效学', '脱靶效应', '伴随诊断', '真实世界证据', '临床终点'],
        mechanisms: '按分子、细胞、组织、个体和人群尺度建立机制链，区分相关性、生物学可解释机制、临床效力与真实世界有效性。',
        metrics: '效应量、置信区间、敏感度/特异度、AUC、无进展生存期、总生存期、不良事件分级、脱靶率和批间一致性。',
        evidence: '证据按体外、动物模型、观察性研究、随机对照试验、系统综述和上市后监测分级；报告样本量、预注册、偏倚及人群外推性。',
        risks: '重点审查生物安全、免疫原性、脱靶毒性、种系编辑、知情同意、群体偏差、隐私和双重用途研究。',
        sources: ['PubMed', 'ClinicalTrials.gov', 'WHO ICTRP', 'FDA', 'EMA', 'Cochrane', 'OpenAlex']
    },
    {
        id: 'energy-earth', label: '能源、气候与地球系统',
        patterns: ['energy', 'battery', 'climate', 'carbon', 'earth', 'water', 'fusion', '能源', '电池', '气候', '碳', '地球', '水', '聚变'],
        vocabulary: ['平准化成本', '全生命周期评价', '容量因子', '往返效率', '边际减排成本', '能量投资回报率', '范围一至三排放', '情景分析'],
        mechanisms: '以质量与能量守恒、资源禀赋、基础设施网络和经济调度为主线，联合技术性能、生命周期排放、土地水资源及政策约束。',
        metrics: 'LCOE/LCOS、CAPEX/OPEX、能量密度、循环寿命、容量因子、gCO2e/kWh、边际减排成本、部署速率和供应链集中度。',
        evidence: '优先实测运行数据、技术经济模型、生命周期清单、遥感/再分析数据和多模型情景；必须公开系统边界、折现率与敏感性分析。',
        risks: '关注反弹效应、碳泄漏、关键矿物、土地与水竞争、极端天气韧性、搁浅资产、环境正义和政策依赖。',
        sources: ['IPCC', 'IEA', 'IRENA', 'NREL', 'USGS', 'Copernicus', 'OpenAlex']
    },
    {
        id: 'engineering', label: '半导体、制造与复杂工程系统',
        patterns: ['semiconductor', 'chip', 'manufactur', '6g', 'compute', 'sensor', '半导体', '芯片', '制造', '通信', '算力', '传感'],
        vocabulary: ['设计-工艺协同优化', '良率学习', '失效模式与影响分析', '平均无故障时间', '可制造性设计', '数字线程', '供应链韧性', '技术成熟度等级'],
        mechanisms: '按需求、架构、部件、接口、制造、验证与运维分解系统，结合多物理场约束、可靠性工程和供应链依赖分析。',
        metrics: 'PPA、制程节点、良率、OEE、MTBF/MTTR、缺陷百万机会数、时延、带宽、能效、单位成本和TRL/MRL。',
        evidence: '优先标准化测试、晶圆/产线统计、现场可靠性、认证报告和可复现参考设计；区分原型峰值、典型工况与量产规格。',
        risks: '关注单点故障、共因失效、热管理、电磁兼容、网络安全、出口管制、供应商锁定、维护性和生命周期停产。',
        sources: ['IEEE', 'IEC', 'ISO', 'SEMI', 'NIST', 'GitHub', 'OpenAlex']
    },
    {
        id: 'space', label: '天文学、宇宙学与空间系统',
        patterns: ['space', 'cosmo', 'planet', 'satellite', 'lunar', 'universe', '宇宙', '行星', '卫星', '月球', '空间'],
        vocabulary: ['标准烛光', '引力透镜', '功率谱', '贝叶斯模型比较', '轨道摄动', '辐射剂量', '任务载荷', '技术就绪度'],
        mechanisms: '将理论模型与观测选择函数、仪器响应、数据处理流水线和系统误差联立；工程节点按任务轨道、平台、载荷、测控和地面段分析。',
        metrics: '信噪比、角/光谱分辨率、巡天体积、参数后验、假警报率、Δv、比冲、载荷质量、链路余量和任务可靠度。',
        evidence: '优先任务数据发布、同行评审目录、校准文件和独立管线交叉验证；明确先验、选择偏差、宇宙方差和系统误差预算。',
        risks: '关注模型简并、观测偏差、空间天气、辐射损伤、轨道碎片、行星保护、任务单点故障和成本进度超支。',
        sources: ['NASA ADS', 'ESA', 'NASA', 'arXiv', 'OpenAlex', 'IAU']
    },
    {
        id: 'knowledge-data', label: '知识图谱、数据基础设施与RAG',
        patterns: ['knowledge graph', 'data commons', 'ontology', 'rdf', 'sparql', 'retrieval', '知识图谱', '本体', '检索', '数据基础设施'],
        vocabulary: ['本体工程', '实体消歧', '规范化标识符', '开放世界假设', '溯源图', '混合检索', '交叉编码器重排', '最大边际相关性'],
        mechanisms: '以实体-关系-事件-声明为基本单元，使用本体约束、身份解析、来源溯源和时间有效性组织知识；RAG采用查询改写、图扩展、稀疏/稠密混合召回与证据重排。',
        metrics: '实体链接F1、关系抽取F1、Hits@K/MRR、Recall@K、nDCG、答案忠实度、引用正确率、覆盖率、时效性和检索延迟。',
        evidence: '每项声明绑定可定位来源、发布时间、访问时间和证据片段；用黄金集、困难负例、时间切分与端到端问答评测验证。',
        risks: '关注本体漂移、实体合并错误、来源循环引用、过期事实、嵌入偏差、检索污染、提示注入和无依据生成。',
        sources: ['Wikidata', 'Data Commons', 'Schema.org', 'W3C', 'OpenAlex', 'DBpedia', 'GitHub']
    },
    {
        id: 'society', label: '社会科学、治理与文明韧性',
        patterns: ['society', 'governance', 'education', 'policy', 'work', 'risk', '社会', '治理', '教育', '政策', '风险', '制度'],
        vocabulary: ['因果识别', '双重差分', '断点回归', '工具变量', '制度分析', '分配效应', '算法问责', '社会技术系统'],
        mechanisms: '区分个体、组织、制度与宏观结构层次，通过理论机制、反事实框架和混合方法连接行为、政策干预与分配结果。',
        metrics: '平均处理效应、异质性效应、基尼系数、代际流动、劳动生产率、福利变化、制度信任、合规成本和韧性指标。',
        evidence: '优先预注册实验、准实验、代表性调查、行政数据、系统综述和可复现代码；报告识别假设、平行趋势、测量误差及外部效度。',
        risks: '关注选择偏差、生态谬误、古德哈特定律、算法歧视、权力不对称、监控扩张、政策俘获和弱势群体负担。',
        sources: ['OECD', 'World Bank', 'UN Data', 'Data Commons', 'ICPSR', 'OpenAlex']
    }
];

const GRAPH_DEFAULT_EXPERT_DOMAIN = {
    id: 'frontier-general', label: '跨学科前沿研究',
    vocabulary: ['机制模型', '操作性定义', '证据等级', '基准测量', '不确定性量化', '技术成熟度', '可复现性', '系统边界'],
    mechanisms: '先给出操作性定义与边界，再建立机制、可观测量、验证方法、工程约束和相邻概念之间的因果或结构关系。',
    metrics: '按领域报告效应量、误差与置信区间、性能-成本-可靠性指标、成熟度、可扩展性和外部有效性。',
    evidence: '优先同行评审综述、权威标准、原始数据和独立复现；明确来源、时间、适用条件、反例和未决争议。',
    risks: '检查定义漂移、相关替代因果、选择性报告、基准污染、尺度外推、利益冲突和技术炒作周期。',
    sources: ['OpenAlex', 'Semantic Scholar', 'Crossref', 'Wikidata', 'GitHub']
};

function graphDomainPatternMatches(text, pattern) {
    const haystack = String(text || '').toLowerCase();
    const needle = String(pattern || '').toLowerCase();
    if (/^[a-z0-9 -]+$/.test(needle)) {
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(haystack);
    }
    return haystack.includes(needle);
}

function selectGraphExpertDomain(nodeName, contextText) {
    let best = null;
    GRAPH_EXPERT_DOMAINS.forEach(domain => domain.patterns.forEach(pattern => {
        const direct = graphDomainPatternMatches(nodeName, pattern);
        const contextual = graphDomainPatternMatches(contextText, pattern);
        if (!direct && !contextual) return;
        const specificity = String(pattern).length / 100;
        const score = (direct ? 10 : 1) + specificity;
        if (!best || score > best.score) best = { domain, score };
    }));
    return best?.domain || GRAPH_DEFAULT_EXPERT_DOMAIN;
}

function splitGraphNodeTerms(name) {
    const raw = String(name || '').replace(/\s+/g, ' ').trim();
    const englishParts = raw.match(/[A-Za-z][A-Za-z0-9+\-./& ]*[A-Za-z0-9)]/g) || [];
    const english = englishParts
        .map(item => item.replace(/\s+/g, ' ').trim())
        .filter(item => item.length > 2)
        .sort((a, b) => b.length - a.length)[0] || '';
    const chinese = raw.replace(/[A-Za-z0-9+\-./&():]/g, ' ').replace(/\s+/g, '').trim();
    return {
        raw,
        chinese,
        english,
        primary: chinese || english || raw
    };
}

function normalizeGraphKnowledgeBase(rawKnowledgeBase) {
    if (!rawKnowledgeBase) return [];
    const list = Array.isArray(rawKnowledgeBase) ? rawKnowledgeBase : [rawKnowledgeBase];
    return list
        .filter(Boolean)
        .map((item, index) => {
            if (typeof item === 'string') {
                return {
                    id: `custom-${index + 1}`,
                    title: '自定义知识库',
                    content: item,
                    keywords: []
                };
            }
            return {
                id: item.id || `custom-${index + 1}`,
                title: item.title || '自定义知识库',
                content: item.content || item.summary || '',
                source: item.source || '',
                url: item.url || '',
                keywords: Array.isArray(item.keywords) ? item.keywords : []
            };
        })
        .filter(item => item.content || item.title);
}

// ========== 世界知识层（compileWorldKnowledge.js 产出） ==========
// 与 nodeKnowledgeCorpus.js（论文证据）并列：这一层放的是权威实体与百科知识，
// 也就是“这个节点在真实世界里到底指什么”，而不是检索到的论文或模板话术。

function getGraphNodeWorldKnowledge(nodeName) {
    const store = typeof window !== 'undefined' ? window.GRAPH_NODE_WORLD_KNOWLEDGE : null;
    if (!store || !nodeName) return null;
    return store[nodeName] || null;
}

function worldKnowledgeStatusLabel(status) {
    return {
        'entity-confirmed': '实体已确认',
        'entity-candidate': '实体待确认',
        'article-confirmed': '百科条目已确认',
        'article-candidate': '百科条目待确认',
        'no-authoritative-match': '未匹配到权威来源',
        'source-error': '来源访问失败'
    }[status] || (status || '未知状态');
}

function worldClaimSummary(entry) {
    return (entry.claims || []).map(claim => {
        const values = (claim.values || []).slice(0, 6).map(value => {
            if (value.display) return value.display;
            if (value.kind === 'entity') return value.label ? `${value.label}${value.id ? ` (${value.id})` : ''}` : value.id;
            return value.value;
        }).filter(Boolean);
        const label = (claim.label && (claim.label.zh || claim.label.en)) || claim.property;
        return values.length ? `${label} (${claim.property}): ${values.join('；')}` : '';
    }).filter(Boolean);
}

function buildWorldKnowledgeRecords(nodeName) {
    const entry = getGraphNodeWorldKnowledge(nodeName);
    if (!entry) return [];

    const sourceName = entry.matchMode === 'wikidata' ? 'Wikidata 规范实体'
        : entry.matchMode === 'wikipedia' ? '维基百科条目'
            : 'Wikidata 与维基百科（均未达到置信度阈值）';
    const attribution = [
        `来源: ${sourceName}`,
        `解析时间: ${String(entry.resolvedAt || '').slice(0, 10) || '未知'}`,
        `匹配置信度: ${Number(entry.score || 0).toFixed(2)}（${worldKnowledgeStatusLabel(entry.status)}）`,
        entry.matchedBy ? `命中方式: 「${entry.matchedBy.query}」的${entry.matchedBy.matchType || '匹配'}（${entry.matchedBy.language}）` : ''
    ].filter(Boolean).join('；');

    const records = [];
    const entity = entry.entityDetail;

    if (entity) {
        const label = entity.label.zh || entity.label.en || nodeName;
        const secondary = entity.label.zh && entity.label.en && entity.label.zh !== entity.label.en ? ` / ${entity.label.en}` : '';
        const description = entity.description.zh || entity.description.en || 'Wikidata 未提供权威描述。';
        const content = [
            `规范实体: ${label}${secondary} (${entity.id})`,
            `权威描述: ${description}`,
            entity.aliases.length ? `别名与跨语言名称: ${entity.aliases.join('；')}` : '',
            ...worldClaimSummary(entry).map(line => `关系声明: ${line}`),
            entry.rejectedEntity && Number(entry.rejectedEntity.score || 0) > 0 && entry.rejectedEntity.id !== entity.id
                ? `被拒绝的候选（低于接受阈值）: ${entry.rejectedEntity.label} ${entry.rejectedEntity.id} [${Number(entry.rejectedEntity.score).toFixed(2)}]`
                : '',
            attribution,
            '证据边界: 本记录用于实体规范化、消歧与关系定位，属于权威结构化知识；具体领域主张仍需原始研究、标准或实验数据支撑。'
        ].filter(Boolean).join('\n');

        records.push({
            id: `world-entity-${entity.id}`,
            title: `世界知识 · 规范实体 ${label} (${entity.id})`,
            content,
            source: 'Wikidata',
            url: entity.uri,
            keywords: [label, entity.label.en, entity.id, ...entity.aliases.slice(0, 8)].filter(Boolean),
            evidenceLevel: 'curated-entity',
            evidenceUsability: 'claim-supporting',
            citation: {
                source: 'Wikidata',
                title: `${label} (${entity.id})`,
                url: entity.uri,
                identifier: entity.id,
                retrievedAt: entry.resolvedAt,
                evidenceLevel: 'curated-entity'
            },
            provenance: { compiler: 'compileWorldKnowledge.js', status: entry.status, score: entry.score, matchMode: entry.matchMode }
        });

        if (entity.wikipedia && entity.wikipedia.extract) {
            records.push({
                id: 'world-encyclopedia',
                title: `世界知识 · 百科条目《${entity.wikipedia.title}》`,
                content: [
                    entity.wikipedia.extract,
                    `条目地址: ${entity.wikipedia.url}`,
                    entity.wikipedia.revision ? `对应版本: ${entity.wikipedia.revision}` : '',
                    '许可: 维基百科正文采用 CC BY-SA 4.0，转载与再分发需保留署名与相同方式共享。',
                    attribution
                ].filter(Boolean).join('\n'),
                source: 'Wikipedia',
                url: entity.wikipedia.url,
                keywords: [label, entity.wikipedia.title, 'encyclopedia'],
                evidenceLevel: 'encyclopedia',
                evidenceUsability: 'claim-supporting',
                citation: {
                    source: 'Wikipedia',
                    title: entity.wikipedia.title,
                    url: entity.wikipedia.url,
                    retrievedAt: entry.resolvedAt,
                    evidenceLevel: 'encyclopedia'
                },
                provenance: { compiler: 'compileWorldKnowledge.js', status: entry.status, score: entry.score, matchMode: entry.matchMode }
            });
        }
    } else if (entry.article) {
        const article = entry.article;
        records.push({
            id: 'world-encyclopedia',
            title: `世界知识 · 百科条目《${article.title}》`,
            content: [
                article.extract,
                article.description ? `条目定位: ${article.description}` : '',
                `条目地址: ${article.url}`,
                article.revision ? `对应版本: ${article.revision}` : '',
                article.excerptFromSearch ? '说明: 未取到完整导言，此处为百科检索摘要。' : '',
                '许可: 维基百科正文采用 CC BY-SA 4.0，转载与再分发需保留署名与相同方式共享。',
                attribution
            ].filter(Boolean).join('\n'),
            source: 'Wikipedia',
            url: article.url,
            keywords: [article.title, ...(article.description ? [article.description] : [])],
            evidenceLevel: 'encyclopedia',
            evidenceUsability: 'claim-supporting',
            citation: {
                source: 'Wikipedia',
                title: article.title,
                url: article.url,
                retrievedAt: entry.resolvedAt,
                evidenceLevel: 'encyclopedia'
            },
            provenance: { compiler: 'compileWorldKnowledge.js', status: entry.status, score: entry.score, matchMode: entry.matchMode }
        });
    } else {
        records.push({
            id: 'world-no-match',
            title: '世界知识 · 未匹配到权威来源',
            content: [
                `节点「${nodeName}」在 Wikidata 与维基百科中都没有找到达到置信度阈值的权威实体或条目。`,
                entry.query ? `检索式: 中文「${entry.query.zh || '无'}」；英文「${entry.query.en || '无'}」` : '',
                entry.score ? `最高候选分数: ${Number(entry.score).toFixed(2)}（低于接受阈值，已拒绝，避免把节点链到错误实体）` : '未返回任何候选。',
                entry.runnersUp && entry.runnersUp.length
                    ? `被拒绝的候选: ${entry.runnersUp.map(item => `${item.label || item.title} ${item.id || ''} [${Number(item.score).toFixed(2)}]`).join('；')}`
                    : '',
                attribution,
                '说明: 这类节点通常是聚合类、路线图类或跨域能力类概念（而非可消歧的实体），属于图谱自身的组织节点。'
            ].filter(Boolean).join('\n'),
            source: 'PzMAgentool world knowledge compiler',
            keywords: ['no-authoritative-match'],
            evidenceLevel: 'unverified',
            evidenceUsability: 'discovery-only',
            provenance: { compiler: 'compileWorldKnowledge.js', status: entry.status, score: entry.score }
        });
    }

    return records;
}

function buildCompiledEvidenceRecords(nodeName) {
    const corpus = typeof window !== 'undefined' ? window.GRAPH_NODE_EVIDENCE_CORPUS : null;
    const compiled = corpus?.[nodeName];
    if (!compiled) return [];
    const records = [];
    if (compiled.entity) {
        records.push({
            id: `entity-${compiled.entity.id}`,
            title: `规范实体: ${compiled.entity.label} (${compiled.entity.id})`,
            content: [
                compiled.entity.description || 'Wikidata未提供实体描述。',
                `规范标识符: ${compiled.entity.id}`,
                `自动消歧置信度: ${Number(compiled.entity.confidence || 0).toFixed(2)}`,
                '证据边界: 该记录用于实体规范化和消歧；具体领域主张仍需原始研究或权威标准支持。'
            ].join('\n'),
            source: 'Wikidata', url: compiled.entity.url,
            keywords: [compiled.entity.label, compiled.entity.id, 'entity linking', '实体消歧'],
            evidenceLevel: 'curated-entity', evidenceUsability: 'claim-supporting',
            provenance: { compiledAt: compiled.compiledAt, query: compiled.query, compiler: 'Wikidata entity search' }
        });
    }
    (compiled.works || []).forEach((work, index) => {
        const hasAbstract = Boolean(work.abstract);
        const scholarlySource = work.source || (work.crossrefDoi ? 'Crossref' : 'OpenAlex');
        const scholarlyId = work.doi || work.openAlexId || work.crossrefDoi || work.url;
        records.push({
            id: `scholarly-${index + 1}-${String(scholarlyId || '').split('/').pop()}`,
            title: work.title,
            content: [
                work.abstract || 'OpenAlex未提供摘要；该记录仅作为文献导航，不得据其标题生成事实性结论。',
                `文献类型: ${work.type || 'work'}；年份: ${work.year || 'n.d.'}；引用数: ${work.citations || 0}`,
                `主题匹配置信度: ${Number(work.confidence || 0).toFixed(2)}`,
                work.doi || work.crossrefDoi ? `DOI: ${work.doi || work.crossrefDoi}` : `来源标识符: ${work.openAlexId || work.url}`
            ].join('\n'),
            snippet: work.abstract || '',
            source: scholarlySource, url: work.url,
            keywords: [compiled.query, work.type, 'scholarly evidence'].filter(Boolean),
            evidenceLevel: hasAbstract ? 'abstract-supported' : 'bibliographic-only',
            evidenceUsability: hasAbstract ? 'claim-supporting' : 'discovery-only',
            citation: { source: scholarlySource, title: work.title, url: work.url, year: work.year, identifier: scholarlyId, retrievedAt: compiled.compiledAt, evidenceLevel: hasAbstract ? 'abstract-supported' : 'bibliographic-only' },
            provenance: { compiledAt: compiled.compiledAt, query: compiled.query, confidence: work.confidence }
        });
    });
    if (!records.length) {
        records.push({
            id: 'expert-review-required', title: '专家核验状态',
            content: `自动编纂未找到达到消歧阈值的权威实体或学术记录。状态: ${compiled.status}。禁止用通用模板补写节点事实；需要领域专家或新的权威来源完成核验。`,
            source: 'PzMAgentool corpus compiler', keywords: [compiled.query, 'expert review'],
            evidenceLevel: 'unverified', evidenceUsability: 'discovery-only', provenance: compiled.provenance
        });
    }
    return records;
}

function buildGraphNodeKnowledgeBase(raw, meta, graphPath, childNames) {
    const terms = splitGraphNodeTerms(raw.name);
    const pathText = graphPath.join(' > ');
    const domain = selectGraphExpertDomain(raw.name, [meta.description, pathText, ...(childNames || [])].filter(Boolean).join(' '));
    const keywords = [
        terms.raw,
        terms.chinese,
        terms.english,
        meta.source,
        meta.scale,
        meta.maturity,
        meta.layer,
        ...(childNames || [])
    ].filter(Boolean);
    // 顺序即优先级：世界知识（权威实体与百科正文）排最前，其次是节点自带知识库，
    // 然后是论文证据，最后才是 5 条专家框架记录。前端节点面板也按这个顺序展示。
    const records = [
        ...buildWorldKnowledgeRecords(raw.name),
        ...normalizeGraphKnowledgeBase(raw.knowledgeBase),
        ...buildCompiledEvidenceRecords(raw.name)
    ];

    records.push(
        {
            id: 'expert-definition', title: '专家定义、边界与术语体系',
            content: [
                `研究对象: ${terms.raw}`, `图谱路径: ${pathText}`, `学科框架: ${domain.label}`,
                `操作性定义要求: 用${terms.english || terms.chinese || terms.raw}在该学科共同体中的规范含义作定义，明确必要条件、充分条件、研究尺度和适用边界；不得用同义反复或营销性描述替代定义。`,
                `规范术语: ${domain.vocabulary.join('；')}`,
                childNames?.length ? `下位概念/组成: ${childNames.slice(0, 16).join('；')}` : '下位概念/组成: 应依据领域本体或权威分类补充，禁止凭词面臆造。',
                meta.description ? `图谱原始说明: ${meta.description}` : ''
            ].filter(Boolean).join('\n'),
            keywords: [...keywords, ...domain.vocabulary], quality: { level: 'expert', facet: 'definition', evidenceRequired: true }
        },
        {
            id: 'expert-mechanism', title: '核心机制、形式化模型与可证伪命题',
            content: [
                `对象: ${terms.raw}`, `机制分析框架: ${domain.mechanisms}`,
                '形式化要求: 优先给出变量、状态、约束、目标函数、守恒关系或因果图；说明模型假设、初始/边界条件和可识别性。',
                '可证伪性: 把核心主张改写为可由观测或实验否证的命题，并列出竞争性解释、关键消融与反事实检验。',
                meta.scale ? `研究尺度: ${meta.scale}` : ''
            ].filter(Boolean).join('\n'),
            keywords: [...keywords, 'mechanism', 'formal model', 'causal inference', 'falsifiability'], quality: { level: 'doctoral', facet: 'mechanism', evidenceRequired: true }
        },
        {
            id: 'expert-evidence', title: '证据等级、关键指标与验证协议',
            content: [
                `关键指标: ${domain.metrics}`, `证据规范: ${domain.evidence}`, `权威来源族: ${domain.sources.join('；')}`,
                '验证协议: 检索综述建立术语与争议，再回溯原始研究、数据集、标准和复现；区分统计显著性、实际显著性、机制证据与工程可用性。',
                '不确定性: 必须报告数据截止时间、样本与适用范围、误差来源、负面结果和领域尚无共识之处。'
            ].join('\n'),
            keywords: [...keywords, ...domain.sources, 'benchmark', 'replication', 'uncertainty'], quality: { level: 'doctoral', facet: 'evidence', evidenceRequired: true }
        },
        {
            id: 'expert-frontier', title: '世界前沿、工程转化与开放问题',
            content: [
                `前沿判据: 对${terms.raw}按“基础原理突破—实验验证—原型系统—规模化部署—制度化采用”分层，不把预印本、演示或融资新闻等同于成熟技术。`,
                `风险与失效模式: ${domain.risks}`,
                '技术转化: 分别评估性能上限、成本曲线、基础设施、人才、监管、互操作标准、供应链和全生命周期外部性。',
                '开放问题: 优先列出限制领域进展的理论瓶颈、测量瓶颈、数据缺口、工程失效模式和治理难题，并为每项给出可验证的研究路径。',
                meta.maturity ? `图谱成熟度标注: ${meta.maturity}` : '成熟度: 应依据TRL/MRL或本领域等价分级由当前证据判定。'
            ].join('\n'),
            keywords: [...keywords, 'state of the art', 'open problems', 'technology readiness', 'failure modes'], quality: { level: 'frontier', facet: 'frontier', evidenceRequired: true }
        },
        {
            id: 'expert-retrieval', title: '专业检索式与证据路由',
            content: [
                `精确主题: ${terms.english || terms.chinese || terms.raw}`, `中英文别名: ${[terms.chinese, terms.english].filter(Boolean).join('；') || terms.raw}`,
                `查询扩展: (${terms.english || terms.chinese || terms.raw}) AND (review OR benchmark OR dataset OR mechanism OR standard OR replication OR failure mode)`,
                `图谱限定: ${pathText}`, `来源路由: ${domain.sources.join(' -> ')}`,
                '检索顺序: 术语消歧 -> 权威综述 -> 原始证据 -> 数据/基准 -> 工程实现 -> 标准/监管 -> 社区故障经验；对重复来源、循环引用和未验证二手摘要降权。'
            ].join('\n'),
            keywords: [...keywords, ...domain.sources], quality: { level: 'expert', facet: 'retrieval', evidenceRequired: false }
        }
    );

    return records;
}

function shouldCreateGraphDetailNodes(raw, children, depth) {
    return depth >= 2 &&
        !raw.kind &&
        !raw.path &&
        raw.name &&
        raw.kind !== 'knowledge-detail' &&
        !raw.disableAutoDetails &&
        (!children || children.length === 0);
}

function buildGeneratedGraphDetailNodes(raw, meta, graphPath) {
    const terms = splitGraphNodeTerms(raw.name);
    const subject = terms.primary || raw.name;
    return GRAPH_DETAIL_FACETS.map(facet => ({
        name: `${subject}: ${facet.label}`,
        val: 5,
        kind: 'knowledge-detail',
        disableAutoDetails: true,
        description: `${subject} 的${facet.title}检索节点。`,
        source: meta.source,
        scale: meta.scale,
        maturity: meta.maturity,
        layer: facet.key,
        knowledgeBase: [
            {
                id: `${facet.key}-focus`,
                title: `${subject} - ${facet.title}`,
                content: [
                    `主题: ${subject}`,
                    terms.english ? `英文查询: ${terms.english}` : '',
                    `所在路径: ${graphPath.join(' > ')}`,
                    `检索重点: ${facet.focus}`,
                    '模型解释时把该条作为本节点的细化检索切面，并与父节点知识卡合并使用。'
                ].filter(Boolean).join('\n'),
                keywords: [subject, terms.english, facet.label, facet.title].filter(Boolean)
            }
        ]
    }));
}

function buildGraphData(roots, THEME, prefix) {
    const nodes = [], links = [];
    const pfx = prefix || '_n';
    function walk(raw, parentId, inheritGroup, inheritColor, inheritMeta, depth) {
        const group = raw.group || inheritGroup || 'classic';
        const color = raw.color != null ? raw.color : (inheritColor != null ? inheritColor : (THEME[group] ?? 0xffffff));
        const graphPath = [...(inheritMeta?.graphPath || []), raw.name];
        const rawChildren = raw.children || [];
        const meta = {
            description: raw.description || inheritMeta?.description,
            source: raw.source || inheritMeta?.source,
            axis: raw.axis || inheritMeta?.axis,
            scale: raw.scale || inheritMeta?.scale,
            maturity: raw.maturity || inheritMeta?.maturity,
            layer: raw.layer || inheritMeta?.layer,
            graphPath
        };
        const childNames = rawChildren.map(child => child.name).filter(Boolean);
        const id = pfx + _graphAutoId++;
        nodes.push({
            id,
            name: raw.name,
            val: raw.val,
            color,
            group,
            path: raw.path,
            kind: raw.kind,
            ext: raw.ext,
            mime: raw.mime,
            description: meta.description,
            source: meta.source,
            axis: meta.axis,
            scale: meta.scale,
            maturity: meta.maturity,
            layer: meta.layer,
            knowledgeBase: buildGraphNodeKnowledgeBase(raw, meta, graphPath, childNames)
        });
        if (parentId) links.push({ source: parentId, target: id });
        const nextGroup = raw.childGroup || group;
        const nextColor = raw.childColor != null ? raw.childColor : color;
        rawChildren.forEach(c => walk(c, id, nextGroup, nextColor, meta, (depth || 0) + 1));
    }
    roots.forEach(r => walk(r, null, null, null, null, 0));
    return { nodes, links };

}

function getGraphTree(THEME) {
    const palette = {
        root: THEME.root,
        graphRoot: 0x00e5ff,
        transitionRoot: 0xffd166,
        axis: 0xb8f7ff,
        matter: 0x8b5cf6,
        life: 0x10b981,
        intelligence: 0x3b82f6,
        engineering: 0xf59e0b,
        earth: 0x06b6d4,
        universe: 0x6366f1,
        society: 0xec4899,
        graph: 0x22d3ee,
        source: 0xa3e635,
        risk: 0xfb7185,
        market: 0xfacc15
    };

    return [
        {
            name: 'ODataMap 世界前沿知识地图',
            val: 95,
            group: 'root',
            color: palette.root,
            description: '按研究对象尺度与知识成熟度组织的全球前沿知识默认图谱。',
            source: 'ODataMap',
            children: [
                {
                    name: '物质与微观 Matter & Microcosm',
                    val: 52,
                    group: 'category',
                    color: palette.matter,
                    childGroup: 'modern',
                    childColor: palette.matter,
                    scale: 'subatomic to molecular',
                    children: [
                        {
                            name: '量子信息 Quantum Information',
                            val: 26,
                            group: 'category',
                            color: palette.matter,
                            children: [
                                {
                                    name: '容错量子计算 Fault-Tolerant Quantum Computing',
                                    children: [
                                        { name: '逻辑量子比特 Logical Qubits' },
                                        { name: '表面码 Surface Code' },
                                        { name: '魔态蒸馏 Magic State Distillation' },
                                    ]
                                },
                                {
                                    name: '量子纠错 Quantum Error Correction',
                                    children: [
                                        { name: '稳定子码 Stabilizer Codes' },
                                        { name: '量子LDPC码 Quantum LDPC Codes' },
                                        { name: '解码器 Decoders' },
                                    ]
                                },
                                {
                                    name: '量子网络 Quantum Networks',
                                    children: [
                                        { name: '量子中继 Quantum Repeaters' },
                                        { name: '纠缠分发 Entanglement Distribution' },
                                        { name: '量子互联网协议 Quantum Internet Protocols' },
                                    ]
                                },
                                {
                                    name: '量子密钥分发 Quantum Key Distribution',
                                    children: [
                                        { name: 'BB84协议 BB84 Protocol' },
                                        { name: '设备无关QKD Device-Independent QKD' },
                                        { name: '卫星QKD Satellite QKD' },
                                    ]
                                },
                                { name: '量子传感 Quantum Sensing' },
                                { name: '量子模拟 Quantum Simulation' },
                                { name: '后量子密码 Post-Quantum Cryptography' },
                            ]
                        },
                        {
                            name: '材料前沿 Advanced Materials',
                            val: 26,
                            group: 'category',
                            color: palette.matter,
                            children: [
                                {
                                    name: '高温超导 High-Temperature Superconductors',
                                    children: [
                                        { name: '铜氧化物超导 Cuprates' },
                                        { name: '铁基超导 Iron-Based Superconductors' },
                                        { name: '室温超导候选 Room-Temperature Superconductor Candidates' },
                                    ]
                                },
                                {
                                    name: '拓扑材料 Topological Materials',
                                    children: [
                                        { name: '拓扑绝缘体 Topological Insulators' },
                                        { name: '外尔半金属 Weyl Semimetals' },
                                        { name: '拓扑量子计算材料 Topological Quantum Computing Materials' },
                                    ]
                                },
                                {
                                    name: '二维材料 2D Materials',
                                    children: [
                                        { name: '石墨烯 Graphene' },
                                        { name: '过渡金属硫族化物 TMDs' },
                                        { name: '二维异质结 2D Heterostructures' },
                                    ]
                                },
                                { name: '超材料 Metamaterials' },
                                { name: '自修复材料 Self-Healing Materials' },
                                { name: '结构电池复合材料 Structural Battery Composites' },
                                { name: '材料基因组 Materials Genome' },
                            ]
                        },
                        {
                            name: '化学与催化 Chemistry & Catalysis',
                            val: 24,
                            group: 'category',
                            color: palette.matter,
                            children: [
                                { name: 'AI分子设计 AI Molecular Design' },
                                { name: '电催化 Electrocatalysis' },
                                { name: '光催化 Photocatalysis' },
                                { name: '绿色合成 Green Synthesis' },
                                { name: '碳氮固定 Carbon and Nitrogen Fixation' },
                                { name: '可持续聚合物 Sustainable Polymers' },
                            ]
                        },
                        {
                            name: '纳米与光子 Nano & Photonics',
                            val: 24,
                            group: 'category',
                            color: palette.matter,
                            children: [
                                { name: '纳米制造 Nanofabrication' },
                                { name: '硅光子 Silicon Photonics' },
                                { name: '集成光子 Integrated Photonics' },
                                { name: '等离激元 Plasmonics' },
                                { name: '光学计算 Optical Computing' },
                                { name: '太赫兹技术 Terahertz Technology' },
                            ]
                        },
                    ]
                },
                {
                    name: '生命与健康 Life & Health',
                    val: 52,
                    group: 'category',
                    color: palette.life,
                    childGroup: 'classic',
                    childColor: palette.life,
                    scale: 'molecular to organism',
                    children: [
                        {
                            name: 'AI生命科学 AI for Biology',
                            val: 28,
                            group: 'category',
                            color: palette.life,
                            children: [
                                {
                                    name: '蛋白质结构预测 Protein Structure Prediction',
                                    children: [
                                        { name: 'AlphaFold类模型 AlphaFold-like Models' },
                                        { name: '多聚体复合物预测 Protein Complex Prediction' },
                                        { name: '结构置信度与实验验证 Structure Confidence and Validation' },
                                    ]
                                },
                                {
                                    name: '蛋白质设计 Protein Design',
                                    children: [
                                        { name: '逆折叠 Inverse Folding' },
                                        { name: '扩散蛋白设计 Diffusion Protein Design' },
                                        { name: '抗体设计 Antibody Design' },
                                    ]
                                },
                                {
                                    name: '生成式药物发现 Generative Drug Discovery',
                                    children: [
                                        { name: '小分子生成 Molecular Generation' },
                                        { name: 'ADMET性质预测 ADMET Prediction' },
                                        { name: '靶点发现 Target Discovery' },
                                        { name: '虚拟筛选 Virtual Screening' },
                                    ]
                                },
                                {
                                    name: '细胞图谱 Cell Atlas',
                                    children: [
                                        { name: '单细胞测序 Single-Cell Sequencing' },
                                        { name: '空间转录组 Spatial Transcriptomics' },
                                        { name: '细胞类型注释 Cell Type Annotation' },
                                    ]
                                },
                                { name: '多组学整合 Multi-Omics Integration' },
                                { name: '实验室自动化 Self-Driving Labs' },
                                { name: '数字孪生患者 Digital Twin Patient' },
                            ]
                        },
                        {
                            name: '基因与细胞医学 Genomic & Cell Medicine',
                            val: 28,
                            group: 'category',
                            color: palette.life,
                            children: [
                                {
                                    name: 'CRISPR基因编辑 CRISPR Gene Editing',
                                    children: [
                                        { name: 'Cas9核酸酶 Cas9 Nuclease' },
                                        { name: '脱靶检测 Off-Target Detection' },
                                        { name: '递送载体 Delivery Vectors' },
                                    ]
                                },
                                {
                                    name: '碱基编辑 Base Editing',
                                    children: [
                                        { name: '胞嘧啶碱基编辑 CBE' },
                                        { name: '腺嘌呤碱基编辑 ABE' },
                                        { name: '线粒体碱基编辑 Mitochondrial Base Editing' },
                                    ]
                                },
                                {
                                    name: '引导编辑 Prime Editing',
                                    children: [
                                        { name: 'pegRNA设计 pegRNA Design' },
                                        { name: 'Prime Editor系统 Prime Editor Systems' },
                                        { name: '编辑效率优化 Editing Efficiency Optimization' },
                                    ]
                                },
                                {
                                    name: '体内基因疗法 In Vivo Gene Therapy',
                                    children: [
                                        { name: 'AAV递送 AAV Delivery' },
                                        { name: '脂质纳米颗粒 LNP Delivery' },
                                        { name: '免疫原性 Immunogenicity' },
                                    ]
                                },
                                {
                                    name: 'CAR-T与细胞疗法 CAR-T and Cell Therapy',
                                    children: [
                                        { name: '实体瘤CAR-T Solid Tumor CAR-T' },
                                        { name: '通用型细胞疗法 Off-the-Shelf Cell Therapy' },
                                        { name: '细胞制造与质控 Cell Manufacturing and QC' },
                                    ]
                                },
                                { name: '干细胞再生医学 Stem Cell Regeneration' },
                                { name: '工程化活体疗法 Engineered Living Therapeutics' },
                            ]
                        },
                        {
                            name: '神经科学与脑机接口 Neuroscience & BCI',
                            val: 25,
                            group: 'category',
                            color: palette.life,
                            children: [
                                { name: '高通量脑机接口 High-Bandwidth BCI' },
                                { name: '神经调控 Neuromodulation' },
                                { name: '连接组学 Connectomics' },
                                { name: '类脑器官 Brain Organoids' },
                                { name: '神经退行性疾病 Neurodegeneration' },
                                { name: '认知增强 Cognitive Augmentation' },
                            ]
                        },
                        {
                            name: '精准健康 Precision Health',
                            val: 25,
                            group: 'category',
                            color: palette.life,
                            children: [
                                { name: 'mRNA平台 mRNA Platforms' },
                                { name: '癌症免疫治疗 Immuno-Oncology' },
                                { name: '微生物组疗法 Microbiome Therapeutics' },
                                { name: '液体活检 Liquid Biopsy' },
                                { name: '长寿科学 Longevity Science' },
                                { name: '可穿戴生物传感 Wearable Biosensing' },
                            ]
                        },
                    ]
                },
                {
                    name: '数学与智能 Mathematics & Intelligence',
                    val: 56,
                    group: 'category',
                    color: palette.intelligence,
                    childGroup: 'modern',
                    childColor: palette.intelligence,
                    scale: 'symbolic to cyber-physical',
                    children: [
                        {
                            name: '基础模型 Foundation Models',
                            val: 30,
                            group: 'category',
                            color: palette.intelligence,
                            children: [
                                {
                                    name: '大语言模型 Large Language Models',
                                    children: [
                                        { name: '预训练 Pretraining' },
                                        { name: '指令微调 Instruction Tuning' },
                                        { name: '上下文学习 In-Context Learning' },
                                        { name: '长上下文 Long Context' },
                                    ]
                                },
                                {
                                    name: '多模态模型 Multimodal Models',
                                    children: [
                                        { name: '视觉语言模型 Vision-Language Models' },
                                        { name: '语音语言模型 Speech-Language Models' },
                                        { name: '多模态对齐 Multimodal Alignment' },
                                    ]
                                },
                                {
                                    name: '世界模型 World Models',
                                    children: [
                                        { name: '环境表征 Environment Representation' },
                                        { name: '预测式仿真 Predictive Simulation' },
                                        { name: '规划中的世界模型 World Models for Planning' },
                                    ]
                                },
                                {
                                    name: '视频生成模型 Video Generation Models',
                                    children: [
                                        { name: '扩散视频模型 Diffusion Video Models' },
                                        { name: '时序一致性 Temporal Consistency' },
                                        { name: '视频可控生成 Controllable Video Generation' },
                                    ]
                                },
                                { name: '小模型与端侧AI Small Models and Edge AI' },
                                {
                                    name: '检索增强生成 Retrieval-Augmented Generation',
                                    children: [
                                        { name: '向量检索 Vector Retrieval' },
                                        { name: '重排序 Reranking' },
                                        { name: '引用与溯源 Citation Grounding' },
                                    ]
                                },
                                { name: '合成数据 Synthetic Data' },
                            ]
                        },
                        {
                            name: 'Agent与自主系统 Agentic AI',
                            val: 30,
                            group: 'category',
                            color: palette.intelligence,
                            children: [
                                {
                                    name: '自主规划 Autonomous Planning',
                                    children: [
                                        { name: '任务分解 Task Decomposition' },
                                        { name: '反思与自校验 Reflection and Self-Check' },
                                        { name: '长程任务记忆 Long-Horizon Memory' },
                                    ]
                                },
                                {
                                    name: '工具调用 Tool Use',
                                    children: [
                                        { name: '函数调用 Function Calling' },
                                        { name: '浏览器操作 Browser Automation' },
                                        { name: '工具风险控制 Tool Risk Control' },
                                    ]
                                },
                                {
                                    name: '多智能体协作 Multi-Agent Collaboration',
                                    children: [
                                        { name: '角色分工 Role Assignment' },
                                        { name: '消息协议 Agent Communication Protocols' },
                                        { name: '群体评审 Collective Critique' },
                                    ]
                                },
                                {
                                    name: '代码智能 Coding Agents',
                                    children: [
                                        { name: '代码库理解 Repository Understanding' },
                                        { name: '自动修复 Automated Bug Fixing' },
                                        { name: '测试生成 Test Generation' },
                                    ]
                                },
                                {
                                    name: '企业流程Agent Workflow Agents',
                                    children: [
                                        { name: '流程编排 Workflow Orchestration' },
                                        { name: '权限与审计 Permission and Audit' },
                                        { name: '人机交接 Human Handoff' },
                                    ]
                                },
                                { name: '具身智能 Embodied AI' },
                                { name: '机器人基础模型 Robotics Foundation Models' },
                            ]
                        },
                        {
                            name: '可信AI Trustworthy AI',
                            val: 26,
                            group: 'category',
                            color: palette.intelligence,
                            children: [
                                { name: 'AI安全评测 AI Safety Evaluation' },
                                { name: '可解释AI Explainable AI' },
                                { name: '模型对齐 Model Alignment' },
                                { name: '隐私保护机器学习 Privacy-Preserving ML' },
                                { name: '水印与溯源 AI Content Watermarking' },
                                { name: '红队测试 AI Red Teaming' },
                                { name: '模型治理 Model Governance' },
                            ]
                        },
                        {
                            name: '图、因果与科学智能 Graph, Causal & Scientific AI',
                            val: 26,
                            group: 'category',
                            color: palette.intelligence,
                            children: [
                                { name: '图神经网络 Graph Neural Networks' },
                                { name: '知识图谱推理 Knowledge Graph Reasoning' },
                                { name: '因果推断 Causal Inference' },
                                { name: '强化学习 Reinforcement Learning' },
                                { name: '神经符号AI Neuro-Symbolic AI' },
                                { name: '科学机器学习 Scientific Machine Learning' },
                                { name: '优化理论 Optimization Theory' },
                            ]
                        },
                    ]
                },
                {
                    name: '工程技术 Engineering Technology',
                    val: 54,
                    group: 'category',
                    color: palette.engineering,
                    childGroup: 'classic',
                    childColor: palette.engineering,
                    scale: 'device to infrastructure',
                    children: [
                        {
                            name: '半导体与算力 Semiconductors & Compute',
                            val: 29,
                            group: 'category',
                            color: palette.engineering,
                            children: [
                                {
                                    name: '应用专用半导体 Application-Specific Semiconductors',
                                    children: [
                                        { name: 'AI加速器 AI Accelerators' },
                                        { name: 'RISC-V定制芯片 RISC-V Custom Silicon' },
                                        { name: '领域专用架构 Domain-Specific Architectures' },
                                    ]
                                },
                                {
                                    name: '先进封装 Advanced Packaging',
                                    children: [
                                        { name: '2.5D封装 2.5D Packaging' },
                                        { name: '3D堆叠 3D Stacking' },
                                        { name: '硅中介层 Silicon Interposer' },
                                    ]
                                },
                                {
                                    name: 'Chiplet异构集成 Chiplet Integration',
                                    children: [
                                        { name: 'UCIe互连 UCIe Interconnect' },
                                        { name: 'Die-to-Die通信 Die-to-Die Communication' },
                                        { name: '良率与测试 Yield and Test' },
                                    ]
                                },
                                {
                                    name: '高带宽存储 High-Bandwidth Memory',
                                    children: [
                                        { name: 'HBM堆叠 HBM Stacking' },
                                        { name: '内存墙 Memory Wall' },
                                        { name: '带宽功耗优化 Bandwidth Power Optimization' },
                                    ]
                                },
                                { name: '数据中心能效 Data Center Efficiency' },
                                { name: '神经形态计算 Neuromorphic Computing' },
                                { name: '光互连 Optical Interconnects' },
                            ]
                        },
                        {
                            name: '机器人与制造 Robotics & Manufacturing',
                            val: 28,
                            group: 'category',
                            color: palette.engineering,
                            children: [
                                {
                                    name: '通用机器人 General-Purpose Robotics',
                                    children: [
                                        { name: '机器人操作 Manipulation' },
                                        { name: '导航与定位 Navigation and Localization' },
                                        { name: '多任务策略 Multi-Task Policies' },
                                    ]
                                },
                                {
                                    name: '人形机器人 Humanoid Robots',
                                    children: [
                                        { name: '全身控制 Whole-Body Control' },
                                        { name: '双足运动 Bipedal Locomotion' },
                                        { name: '遥操作数据 Teleoperation Data' },
                                    ]
                                },
                                {
                                    name: '软体机器人 Soft Robotics',
                                    children: [
                                        { name: '柔性执行器 Soft Actuators' },
                                        { name: '可拉伸传感 Stretchable Sensors' },
                                        { name: '仿生抓取 Bio-Inspired Grasping' },
                                    ]
                                },
                                {
                                    name: '增材制造 Additive Manufacturing',
                                    children: [
                                        { name: '金属3D打印 Metal 3D Printing' },
                                        { name: '拓扑优化 Topology Optimization' },
                                        { name: '过程监控 Process Monitoring' },
                                    ]
                                },
                                { name: '工业数字孪生 Industrial Digital Twins' },
                                { name: '自主工厂 Autonomous Factories' },
                                { name: '空间制造 Space Manufacturing' },
                            ]
                        },
                        {
                            name: '能源系统 Energy Systems',
                            val: 29,
                            group: 'category',
                            color: palette.engineering,
                            children: [
                                {
                                    name: '固态电池 Solid-State Batteries',
                                    children: [
                                        { name: '固态电解质 Solid Electrolytes' },
                                        { name: '锂金属负极 Lithium Metal Anode' },
                                        { name: '界面稳定性 Interface Stability' },
                                    ]
                                },
                                {
                                    name: '长时储能 Long-Duration Energy Storage',
                                    children: [
                                        { name: '铁空气电池 Iron-Air Batteries' },
                                        { name: '液流电池 Flow Batteries' },
                                        { name: '热储能 Thermal Energy Storage' },
                                    ]
                                },
                                {
                                    name: '钠离子电池 Sodium-Ion Batteries',
                                    children: [
                                        { name: '硬碳负极 Hard Carbon Anode' },
                                        { name: '层状氧化物正极 Layered Oxide Cathodes' },
                                        { name: '低成本供应链 Low-Cost Supply Chain' },
                                    ]
                                },
                                {
                                    name: '氢能 Hydrogen Energy',
                                    children: [
                                        { name: '绿氢 Green Hydrogen' },
                                        { name: '电解槽 Electrolyzers' },
                                        { name: '储运与氨载体 Storage Transport and Ammonia Carriers' },
                                    ]
                                },
                                {
                                    name: '核聚变 Fusion Energy',
                                    children: [
                                        { name: '托卡马克 Tokamak' },
                                        { name: '惯性约束聚变 Inertial Confinement Fusion' },
                                        { name: '聚变材料 Fusion Materials' },
                                    ]
                                },
                                { name: '先进地热 Advanced Geothermal' },
                                { name: '渗透能 Osmotic Power' },
                            ]
                        },
                        {
                            name: '连接与基础设施 Connectivity & Infrastructure',
                            val: 25,
                            group: 'category',
                            color: palette.engineering,
                            children: [
                                { name: '6G通信 6G Communications' },
                                { name: '非地面网络 Non-Terrestrial Networks' },
                                { name: '边缘云 Edge Cloud' },
                                { name: '网络安全韧性 Cyber Resilience' },
                                { name: '数字身份 Digital Identity' },
                                { name: '智能电网 Smart Grids' },
                                { name: '未来交通 Future Mobility' },
                            ]
                        },
                    ]
                },
                {
                    name: '地球与环境 Earth & Environment',
                    val: 52,
                    group: 'category',
                    color: palette.earth,
                    childGroup: 'logic',
                    childColor: palette.earth,
                    scale: 'ecosystem to planet',
                    children: [
                        {
                            name: '气候智能 Climate Intelligence',
                            val: 27,
                            group: 'category',
                            color: palette.earth,
                            children: [
                                {
                                    name: '高分辨率气候模型 High-Resolution Climate Models',
                                    children: [
                                        { name: '公里级模拟 Kilometer-Scale Simulation' },
                                        { name: '云微物理 Cloud Microphysics' },
                                        { name: '集合预报 Ensemble Forecasting' },
                                    ]
                                },
                                {
                                    name: '地球数字孪生 Digital Twin Earth',
                                    children: [
                                        { name: '数据同化 Data Assimilation' },
                                        { name: '情景模拟 Scenario Simulation' },
                                        { name: '地球系统耦合 Earth System Coupling' },
                                    ]
                                },
                                {
                                    name: 'AI天气预报 AI Weather Forecasting',
                                    children: [
                                        { name: '图神经天气模型 Graph Weather Models' },
                                        { name: '中期预报 Medium-Range Forecasting' },
                                        { name: '极端天气 Nowcasting Extreme Events' },
                                    ]
                                },
                                {
                                    name: '气候归因 Climate Attribution',
                                    children: [
                                        { name: '事件归因 Event Attribution' },
                                        { name: '反事实模拟 Counterfactual Simulation' },
                                        { name: '损失与损害 Loss and Damage' },
                                    ]
                                },
                                { name: '灾害早期预警 Disaster Early Warning' },
                                { name: '遥感基础模型 Remote Sensing Foundation Models' },
                            ]
                        },
                        {
                            name: '碳与能源转型 Carbon & Energy Transition',
                            val: 27,
                            group: 'category',
                            color: palette.earth,
                            children: [
                                {
                                    name: '碳捕集利用与封存 CCUS',
                                    children: [
                                        { name: '点源捕集 Point-Source Capture' },
                                        { name: '地质封存 Geological Storage' },
                                        { name: '碳利用 Carbon Utilization' },
                                    ]
                                },
                                {
                                    name: '直接空气捕集 Direct Air Capture',
                                    children: [
                                        { name: '吸附剂 Sorbents' },
                                        { name: '再生能耗 Regeneration Energy' },
                                        { name: '永久封存 Permanent Storage' },
                                    ]
                                },
                                { name: '生物炭 Biochar' },
                                { name: '增强风化 Enhanced Weathering' },
                                { name: '甲烷监测 Methane Monitoring' },
                                { name: '碳市场数据 Carbon Market Data' },
                            ]
                        },
                        {
                            name: '生态与生物多样性 Ecosystems & Biodiversity',
                            val: 25,
                            group: 'category',
                            color: palette.earth,
                            children: [
                                { name: '生物多样性监测 Biodiversity Monitoring' },
                                { name: '环境DNA Environmental DNA' },
                                { name: '海洋酸化 Ocean Acidification' },
                                { name: '自然资本核算 Natural Capital Accounting' },
                                { name: '再野化 Rewilding' },
                                { name: '生态系统服务 Ecosystem Services' },
                            ]
                        },
                        {
                            name: '食物与水 Food & Water Systems',
                            val: 25,
                            group: 'category',
                            color: palette.earth,
                            children: [
                                { name: '精准农业 Precision Agriculture' },
                                { name: '抗逆作物 Climate-Resilient Crops' },
                                { name: '细胞农业 Cellular Agriculture' },
                                { name: '替代蛋白 Alternative Proteins' },
                                { name: '水资源安全 Water Security' },
                                { name: '海水淡化 Desalination' },
                            ]
                        },
                    ]
                },
                {
                    name: '宇宙 Universe',
                    val: 46,
                    group: 'category',
                    color: palette.universe,
                    childGroup: 'modern',
                    childColor: palette.universe,
                    scale: 'planetary to cosmic',
                    children: [
                        {
                            name: '宇宙学 Cosmology',
                            val: 24,
                            group: 'category',
                            color: palette.universe,
                            children: [
                                { name: '暗物质 Dark Matter' },
                                { name: '暗能量 Dark Energy' },
                                { name: '引力波 Gravitational Waves' },
                                { name: '宇宙微波背景 Cosmic Microwave Background' },
                                { name: '黑洞物理 Black Hole Physics' },
                            ]
                        },
                        {
                            name: '观测天文学 Observational Astronomy',
                            val: 24,
                            group: 'category',
                            color: palette.universe,
                            children: [
                                { name: '系外行星 Exoplanets' },
                                { name: 'JWST深空观测 JWST Deep Field Science' },
                                { name: '时域天文学 Time-Domain Astronomy' },
                                { name: '多信使天文学 Multi-Messenger Astronomy' },
                                { name: '射电阵列 Radio Telescope Arrays' },
                            ]
                        },
                        {
                            name: '空间经济 Space Economy',
                            val: 24,
                            group: 'category',
                            color: palette.universe,
                            children: [
                                { name: '可重复使用运载 Reusable Launch' },
                                { name: '卫星互联网 Satellite Internet' },
                                { name: '月球基础设施 Lunar Infrastructure' },
                                { name: '小行星资源 Asteroid Resources' },
                                { name: '在轨服务 In-Orbit Servicing' },
                                { name: '空间态势感知 Space Situational Awareness' },
                            ]
                        },
                    ]
                },
                {
                    name: '社会与人文 Society & Humanities',
                    val: 48,
                    group: 'category',
                    color: palette.society,
                    childGroup: 'logic',
                    childColor: palette.society,
                    scale: 'individual to civilization',
                    children: [
                        {
                            name: '计算社会科学 Computational Social Science',
                            val: 24,
                            group: 'category',
                            color: palette.society,
                            children: [
                                { name: '行为经济学 Behavioral Economics' },
                                { name: '计算传播 Computational Communication' },
                                { name: '社会仿真 Social Simulation' },
                                { name: '网络科学 Network Science' },
                                { name: '城市计算 Urban Computing' },
                                { name: '人口转型 Demographic Transition' },
                            ]
                        },
                        {
                            name: '知识、教育与工作 Knowledge, Education & Work',
                            val: 24,
                            group: 'category',
                            color: palette.society,
                            children: [
                                { name: '数字人文 Digital Humanities' },
                                { name: 'AI教育导师 AI Tutors' },
                                { name: '技能图谱 Skill Graphs' },
                                { name: '人机协作 Human-AI Collaboration' },
                                { name: '未来工作 Future of Work' },
                                { name: '开放科学 Open Science' },
                            ]
                        },
                        {
                            name: '治理与文明韧性 Governance & Resilience',
                            val: 24,
                            group: 'category',
                            color: palette.society,
                            children: [
                                { name: 'AI治理 AI Governance' },
                                { name: '信息可信度 Information Integrity' },
                                { name: '公共卫生韧性 Public Health Resilience' },
                                { name: '供应链韧性 Supply Chain Resilience' },
                                { name: '地缘技术 Geotechnology' },
                                { name: '数字公共基础设施 Digital Public Infrastructure' },
                            ]
                        },
                    ]
                },
            ]
        },
        {
            name: '世界知识库与相关图谱',
            val: 90,
            group: 'root',
            color: palette.graphRoot,
            description: '将世界实体、统计变量、科研对象、地理空间和来源证据连接起来的知识基础设施。',
            source: 'Google Data Commons / Google Knowledge Graph / Open Knowledge Graphs',
            children: [
                {
                    name: 'Google Data Commons 统计图谱',
                    val: 38,
                    group: 'category',
                    color: palette.graph,
                    childGroup: 'classic',
                    childColor: palette.graph,
                    children: [
                        {
                            name: '实体DCID Data Commons Entity IDs',
                            children: [
                                { name: '地点实体 Place DCIDs' },
                                { name: '生物实体 Bio Entity DCIDs' },
                                { name: '实体解析 Entity Resolution' },
                            ]
                        },
                        {
                            name: '地点层级 Place Hierarchy',
                            children: [
                                { name: '国家地区层级 Country and Region Hierarchy' },
                                { name: '行政区划 Administrative Areas' },
                                { name: '邻接与包含 Containment Relations' },
                            ]
                        },
                        {
                            name: '统计变量 Statistical Variables',
                            children: [
                                { name: '测量对象 Measured Property' },
                                { name: '统计口径 Population Type' },
                                { name: '约束属性 Constraint Properties' },
                            ]
                        },
                        {
                            name: '观测值 Observations',
                            children: [
                                { name: '观测日期 Observation Date' },
                                { name: '观测单位 Unit and Scaling' },
                                { name: '来源约束 Observation Provenance' },
                            ]
                        },
                        {
                            name: '时间序列 Time Series',
                            children: [
                                { name: '趋势检测 Trend Detection' },
                                { name: '缺失值处理 Missing Values' },
                                { name: '跨地区比较 Place Comparison' },
                            ]
                        },
                        {
                            name: '数据来源 Provenance',
                            children: [
                                { name: '来源导入 Import Sources' },
                                { name: '许可证 License Metadata' },
                                { name: '可信度与更新频率 Trust and Freshness' },
                            ]
                        },
                        { name: 'REST与Python API' },
                        { name: 'Data Commons MCP Server' },
                    ]
                },
                {
                    name: 'Google Knowledge Graph / schema.org',
                    val: 36,
                    group: 'category',
                    color: palette.graph,
                    childGroup: 'modern',
                    childColor: palette.graph,
                    children: [
                        {
                            name: '实体节点 Entities: People Places Things',
                            children: [
                                { name: '人物实体 Person Entities' },
                                { name: '地点实体 Place Entities' },
                                { name: '组织与产品 Organization and Product Entities' },
                            ]
                        },
                        {
                            name: 'schema.org类型 schema.org Types',
                            children: [
                                { name: 'Thing根类型 Thing Root Type' },
                                { name: 'CreativeWork创作物 CreativeWork' },
                                { name: 'Dataset数据集 Dataset' },
                            ]
                        },
                        {
                            name: 'JSON-LD结构化数据 JSON-LD',
                            children: [
                                { name: '上下文 Context' },
                                { name: '节点标识 @id' },
                                { name: '图结构 @graph' },
                            ]
                        },
                        {
                            name: '实体搜索 Entity Search API',
                            children: [
                                { name: '查询匹配 Query Matching' },
                                { name: '类型过滤 Type Filtering' },
                                { name: '结果置信分 Result Score' },
                            ]
                        },
                        { name: '实体消歧 Entity Disambiguation' },
                        { name: '显著性排序 Result Score' },
                        { name: '富结果 Rich Results' },
                        { name: '企业知识图谱 Enterprise Knowledge Graph' },
                    ]
                },
                {
                    name: '开放知识图谱 Open Knowledge Graphs',
                    val: 36,
                    group: 'category',
                    color: palette.source,
                    childGroup: 'classic',
                    childColor: palette.source,
                    children: [
                        {
                            name: 'Wikidata QID',
                            children: [
                                { name: '实体项 Items' },
                                { name: '属性 Properties' },
                                { name: '声明 Statements' },
                            ]
                        },
                        {
                            name: 'Wikipedia与Sitelinks',
                            children: [
                                { name: '跨语言链接 Cross-Language Sitelinks' },
                                { name: '页面摘要 Page Summaries' },
                                { name: '别名 Aliases' },
                            ]
                        },
                        { name: 'DBpedia' },
                        { name: 'YAGO' },
                        {
                            name: 'RDF三元组 RDF Triples',
                            children: [
                                { name: '主语 Subject' },
                                { name: '谓词 Predicate' },
                                { name: '宾语 Object' },
                            ]
                        },
                        {
                            name: 'SPARQL查询 SPARQL',
                            children: [
                                { name: 'SELECT查询 SELECT Queries' },
                                { name: '路径查询 Property Paths' },
                                { name: '联邦查询 Federated Queries' },
                            ]
                        },
                        { name: '外部标识 External IDs' },
                        { name: '实体对齐 Entity Alignment' },
                    ]
                },
                {
                    name: '科研知识图谱 Scholarly Graphs',
                    val: 36,
                    group: 'category',
                    color: palette.source,
                    childGroup: 'classic',
                    childColor: palette.source,
                    children: [
                        {
                            name: 'OpenAlex Works Authors Institutions',
                            children: [
                                { name: 'Works论文 Works' },
                                { name: 'Authors作者 Authors' },
                                { name: 'Institutions机构 Institutions' },
                            ]
                        },
                        {
                            name: '论文引用 Citation Graph',
                            children: [
                                { name: '被引计数 Cited By Count' },
                                { name: '参考文献 References' },
                                { name: '引用网络社区 Citation Communities' },
                            ]
                        },
                        {
                            name: '概念与学科 Concepts and Fields',
                            children: [
                                { name: '主题层级 Topic Hierarchy' },
                                { name: '概念漂移 Concept Drift' },
                                { name: '跨学科主题 Interdisciplinary Topics' },
                            ]
                        },
                        {
                            name: '期刊与会议 Venues',
                            children: [
                                { name: '期刊 Journal Venues' },
                                { name: '会议 Conference Venues' },
                                { name: '开放获取状态 Open Access Status' },
                            ]
                        },
                        { name: 'DOI ORCID ROR' },
                        { name: '基金资助 Funders' },
                        { name: '开放获取 Open Access' },
                        { name: '科研趋势检测 Research Trend Detection' },
                    ]
                },
                {
                    name: '地理空间知识图谱 Geospatial Graphs',
                    val: 34,
                    group: 'category',
                    color: palette.earth,
                    childGroup: 'logic',
                    childColor: palette.earth,
                    children: [
                        { name: 'GeoNames' },
                        { name: 'OpenStreetMap' },
                        { name: 'Natural Earth' },
                        { name: 'GADM行政边界' },
                        { name: 'ISO国家与地区代码' },
                        { name: 'S2与H3空间索引' },
                        { name: '遥感瓦片 Remote Sensing Tiles' },
                        { name: '灾害事件图谱 Disaster Event Graphs' },
                    ]
                },
                {
                    name: '生物医学与化学图谱 BioMedical & Chemistry Graphs',
                    val: 34,
                    group: 'category',
                    color: palette.life,
                    childGroup: 'classic',
                    childColor: palette.life,
                    children: [
                        { name: 'PubChem化合物 PubChem Compounds' },
                        { name: 'ChEMBL药物靶点 ChEMBL Targets' },
                        { name: 'UniProt蛋白 UniProt Proteins' },
                        { name: 'Gene Ontology' },
                        { name: 'MeSH医学主题词 MeSH' },
                        { name: 'UMLS语义网络 UMLS' },
                        { name: 'Human Phenotype Ontology' },
                        { name: 'DrugBank药物图谱 DrugBank' },
                    ]
                },
                {
                    name: '标准、本体与来源 Provenance & Ontology',
                    val: 34,
                    group: 'category',
                    color: palette.axis,
                    childGroup: 'modern',
                    childColor: palette.axis,
                    children: [
                        { name: 'RDF / RDFS' },
                        { name: 'OWL本体 OWL Ontology' },
                        { name: 'SKOS概念体系 SKOS' },
                        { name: 'SHACL约束 SHACL' },
                        { name: 'PROV-O来源模型 PROV-O' },
                        { name: '本体映射 Ontology Mapping' },
                        { name: '数据血缘 Data Lineage' },
                        { name: '质量评分 Data Quality Score' },
                    ]
                },
                {
                    name: '世界指标与观察 Global Indicators',
                    val: 34,
                    group: 'category',
                    color: palette.market,
                    childGroup: 'logic',
                    childColor: palette.market,
                    children: [
                        { name: '人口 Population' },
                        { name: 'GDP与产业 GDP and Industry' },
                        { name: '温室气体排放 GHG Emissions' },
                        { name: '能源结构 Energy Mix' },
                        { name: '疾病负担 Disease Burden' },
                        { name: '教育与技能 Education and Skills' },
                        { name: '互联网接入 Internet Access' },
                        { name: '专利与创新 Patents and Innovation' },
                        { name: 'SDGs可持续发展目标' },
                    ]
                },
            ]
        },
        {
            name: '前沿转化与风险路线图',
            val: 82,
            group: 'root',
            color: palette.transitionRoot,
            description: '把前沿知识从发现、验证、扩展到治理和产业应用的路径做成默认图谱。',
            source: 'WEF Top Emerging Technologies / McKinsey Technology Trends',
            children: [
                {
                    name: '知识成熟度层级 Maturity Layers',
                    val: 34,
                    group: 'category',
                    color: palette.market,
                    childGroup: 'modern',
                    childColor: palette.market,
                    children: [
                        { name: '基础理论 Basic Theory', maturity: 'basic' },
                        { name: '实验验证 Lab Validation', maturity: 'lab' },
                        { name: '原型系统 Prototype System', maturity: 'prototype' },
                        { name: '试点部署 Pilot Deployment', maturity: 'pilot' },
                        { name: '规模化 Scaling', maturity: 'scaling' },
                        { name: '商业化 Commercialization', maturity: 'commercial' },
                        { name: '社会制度化 Institutionalization', maturity: 'institutional' },
                    ]
                },
                {
                    name: '跨域能力栈 Cross-Domain Capability Stack',
                    val: 34,
                    group: 'category',
                    color: palette.axis,
                    childGroup: 'classic',
                    childColor: palette.axis,
                    children: [
                        { name: '算力 Compute' },
                        { name: '数据 Data' },
                        { name: '模型 Models' },
                        { name: '传感 Sensors' },
                        { name: '材料 Materials' },
                        { name: '能源 Energy' },
                        { name: '制造 Manufacturing' },
                        { name: '分发 Channels' },
                        { name: '标准 Standards' },
                    ]
                },
                {
                    name: '关键风险 Critical Risks',
                    val: 34,
                    group: 'category',
                    color: palette.risk,
                    childGroup: 'logic',
                    childColor: palette.risk,
                    children: [
                        { name: 'AI失控与误用 AI Misuse and Loss of Control' },
                        { name: '生物安全 Biosecurity' },
                        { name: '网络攻击 Cyberattacks' },
                        { name: '供应链瓶颈 Supply Chain Bottlenecks' },
                        { name: '能源与水约束 Energy and Water Constraints' },
                        { name: '隐私与监控 Privacy and Surveillance' },
                        { name: '信息污染 Information Pollution' },
                        { name: '不平等与数字鸿沟 Inequality and Digital Divide' },
                    ]
                },
                {
                    name: '治理抓手 Governance Levers',
                    val: 34,
                    group: 'category',
                    color: palette.society,
                    childGroup: 'classic',
                    childColor: palette.society,
                    children: [
                        { name: '评测基准 Evaluation Benchmarks' },
                        { name: '审计与认证 Audit and Certification' },
                        { name: '可追溯供应链 Traceable Supply Chains' },
                        { name: '开放标准 Open Standards' },
                        { name: '公共数据基础设施 Public Data Infrastructure' },
                        { name: '国际协作 International Coordination' },
                        { name: '事故报告 Incident Reporting' },
                        { name: '红队与压力测试 Red Teaming' },
                    ]
                },
                {
                    name: '战略观察指标 Strategic Signals',
                    val: 34,
                    group: 'category',
                    color: palette.source,
                    childGroup: 'modern',
                    childColor: palette.source,
                    children: [
                        { name: '论文增长 Research Publication Growth' },
                        { name: '专利活跃度 Patent Activity' },
                        { name: '开源项目 Open Source Momentum' },
                        { name: '人才需求 Talent Demand' },
                        { name: '资本投入 Capital Flows' },
                        { name: '政策法规 Policy and Regulation' },
                        { name: '标准组织 Standard Bodies' },
                        { name: '产业试点 Industrial Pilots' },
                    ]
                },
            ]
        }
    ];
}
