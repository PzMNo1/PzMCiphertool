// ========== 知识图谱 - 树形数据源 ==========
// 添加节点只需在对应分支的 children 下加一行 { name: '名称' }
// id、group、color、link 全部自动生成，无需手动维护
//
// 默认图谱参考：
// - ODataMap 的七个知识大陆、研究对象尺度轴、知识成熟度轴
// - Google Data Commons / Google Knowledge Graph 的实体、类型、统计变量、来源组织方式

let _graphAutoId = 0;

const GRAPH_DETAIL_FACETS = [
    {
        key: 'concept',
        label: '概念边界',
        title: '概念边界与同义词',
        focus: '定义、上位概念、下位概念、同义词、容易混淆的相邻概念。'
    },
    {
        key: 'evidence',
        label: '证据与指标',
        title: '证据来源与关键指标',
        focus: '论文、数据集、基准、统计指标、实验结果、工程性能与可信来源。'
    },
    {
        key: 'application',
        label: '应用与风险',
        title: '应用场景、瓶颈与风险',
        focus: '典型应用、产业化路径、约束条件、安全伦理风险、治理或标准化抓手。'
    }
];

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

function buildGraphNodeKnowledgeBase(raw, meta, graphPath, childNames) {
    const terms = splitGraphNodeTerms(raw.name);
    const pathText = graphPath.join(' > ');
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
    const records = normalizeGraphKnowledgeBase(raw.knowledgeBase);

    records.push(
        {
            id: 'node-overview',
            title: '节点知识卡',
            content: [
                `节点: ${terms.raw}`,
                terms.chinese ? `中文检索词: ${terms.chinese}` : '',
                terms.english ? `英文检索词: ${terms.english}` : '',
                `图谱路径: ${pathText}`,
                meta.description ? `图谱说明: ${meta.description}` : '',
                meta.source ? `来源线索: ${meta.source}` : '',
                meta.scale ? `研究尺度: ${meta.scale}` : '',
                meta.maturity ? `成熟度: ${meta.maturity}` : '',
                meta.layer ? `知识层: ${meta.layer}` : '',
            ].filter(Boolean).join('\n'),
            keywords
        },
        {
            id: 'retrieval-profile',
            title: '检索画像',
            content: [
                `优先查询: ${terms.english || terms.chinese || terms.raw}`,
                `中文扩展: ${terms.chinese || '无'}`,
                `英文扩展: ${terms.english || '无'}`,
                childNames?.length ? `直接子主题: ${childNames.slice(0, 12).join('；')}` : '直接子主题: 无',
                '检索时优先合并上位路径、同义词、论文/数据/实现/风险等限定词，避免同名概念误解。'
            ].join('\n'),
            keywords
        },
        {
            id: 'explanation-guide',
            title: '模型解释提示',
            content: [
                '解释顺序: 先给定义和边界，再说明关键机制或关系，随后补充证据来源、应用场景、风险瓶颈与相邻节点。',
                '回答应把本节点放回图谱路径中说明，不只给百科式定义。',
                '证据不足时需要说明不确定性，并给出下一步可检索的数据源或关键词。'
            ].join('\n'),
            keywords
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
        const generatedChildren = shouldCreateGraphDetailNodes(raw, rawChildren, depth || 0)
            ? buildGeneratedGraphDetailNodes(raw, meta, graphPath)
            : [];
        [...rawChildren, ...generatedChildren].forEach(c => walk(c, id, nextGroup, nextColor, meta, (depth || 0) + 1));
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
