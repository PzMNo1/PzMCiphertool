// ========== 知识图谱 - 树形数据源 ==========
// 添加节点只需在对应分支的 children 下加一行 { name: '名称' }
// id、group、color、link 全部自动生成，无需手动维护
//
// 默认图谱参考：
// - ODataMap 的七个知识大陆、研究对象尺度轴、知识成熟度轴
// - Google Data Commons / Google Knowledge Graph 的实体、类型、统计变量、来源组织方式

let _graphAutoId = 0;

function buildGraphData(roots, THEME, prefix) {
    const nodes = [], links = [];
    const pfx = prefix || '_n';
    function walk(raw, parentId, inheritGroup, inheritColor, inheritMeta) {
        const group = raw.group || inheritGroup || 'classic';
        const color = raw.color != null ? raw.color : (inheritColor != null ? inheritColor : (THEME[group] ?? 0xffffff));
        const meta = {
            description: raw.description || inheritMeta?.description,
            source: raw.source || inheritMeta?.source,
            axis: raw.axis || inheritMeta?.axis,
            scale: raw.scale || inheritMeta?.scale,
            maturity: raw.maturity || inheritMeta?.maturity,
            layer: raw.layer || inheritMeta?.layer
        };
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
            layer: meta.layer
        });
        if (parentId) links.push({ source: parentId, target: id });
        const nextGroup = raw.childGroup || group;
        const nextColor = raw.childColor != null ? raw.childColor : color;
        (raw.children || []).forEach(c => walk(c, id, nextGroup, nextColor, meta));
    }
    roots.forEach(r => walk(r, null));
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
                    name: '坐标轴与读图方法',
                    val: 38,
                    group: 'category',
                    color: palette.axis,
                    childGroup: 'logic',
                    childColor: palette.axis,
                    children: [
                        { name: 'X轴: 研究对象尺度 Subatomic to Universe', axis: 'scale' },
                        { name: 'Y轴: 知识成熟度 Basic Research to Commercialization', axis: 'maturity' },
                        { name: '研究者密度 Scholar Concentration', layer: 'density' },
                        { name: '论文密度 Paper Concentration', layer: 'evidence' },
                        { name: '产业化距离 Translation Distance', layer: 'translation' },
                        { name: '跨学科桥接 Interdisciplinary Bridges', layer: 'bridge' },
                        { name: '技术路线图 Research Pathway', layer: 'roadmap' },
                        { name: '不确定性与证据强度 Evidence Confidence', layer: 'quality' },
                    ]
                },
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
                                { name: '容错量子计算 Fault-Tolerant Quantum Computing' },
                                { name: '量子纠错 Quantum Error Correction' },
                                { name: '量子网络 Quantum Networks' },
                                { name: '量子密钥分发 Quantum Key Distribution' },
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
                                { name: '高温超导 High-Temperature Superconductors' },
                                { name: '拓扑材料 Topological Materials' },
                                { name: '二维材料 2D Materials' },
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
                                { name: '蛋白质结构预测 Protein Structure Prediction' },
                                { name: '蛋白质设计 Protein Design' },
                                { name: '生成式药物发现 Generative Drug Discovery' },
                                { name: '细胞图谱 Cell Atlas' },
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
                                { name: 'CRISPR基因编辑 CRISPR Gene Editing' },
                                { name: '碱基编辑 Base Editing' },
                                { name: '引导编辑 Prime Editing' },
                                { name: '体内基因疗法 In Vivo Gene Therapy' },
                                { name: 'CAR-T与细胞疗法 CAR-T and Cell Therapy' },
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
                                { name: '大语言模型 Large Language Models' },
                                { name: '多模态模型 Multimodal Models' },
                                { name: '世界模型 World Models' },
                                { name: '视频生成模型 Video Generation Models' },
                                { name: '小模型与端侧AI Small Models and Edge AI' },
                                { name: '检索增强生成 Retrieval-Augmented Generation' },
                                { name: '合成数据 Synthetic Data' },
                            ]
                        },
                        {
                            name: 'Agent与自主系统 Agentic AI',
                            val: 30,
                            group: 'category',
                            color: palette.intelligence,
                            children: [
                                { name: '自主规划 Autonomous Planning' },
                                { name: '工具调用 Tool Use' },
                                { name: '多智能体协作 Multi-Agent Collaboration' },
                                { name: '代码智能 Coding Agents' },
                                { name: '企业流程Agent Workflow Agents' },
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
                                { name: '应用专用半导体 Application-Specific Semiconductors' },
                                { name: '先进封装 Advanced Packaging' },
                                { name: 'Chiplet异构集成 Chiplet Integration' },
                                { name: '高带宽存储 High-Bandwidth Memory' },
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
                                { name: '通用机器人 General-Purpose Robotics' },
                                { name: '人形机器人 Humanoid Robots' },
                                { name: '软体机器人 Soft Robotics' },
                                { name: '增材制造 Additive Manufacturing' },
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
                                { name: '固态电池 Solid-State Batteries' },
                                { name: '长时储能 Long-Duration Energy Storage' },
                                { name: '钠离子电池 Sodium-Ion Batteries' },
                                { name: '氢能 Hydrogen Energy' },
                                { name: '核聚变 Fusion Energy' },
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
                                { name: '高分辨率气候模型 High-Resolution Climate Models' },
                                { name: '地球数字孪生 Digital Twin Earth' },
                                { name: 'AI天气预报 AI Weather Forecasting' },
                                { name: '气候归因 Climate Attribution' },
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
                                { name: '碳捕集利用与封存 CCUS' },
                                { name: '直接空气捕集 Direct Air Capture' },
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
                        { name: '实体DCID Data Commons Entity IDs' },
                        { name: '地点层级 Place Hierarchy' },
                        { name: '统计变量 Statistical Variables' },
                        { name: '观测值 Observations' },
                        { name: '时间序列 Time Series' },
                        { name: '数据来源 Provenance' },
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
                        { name: '实体节点 Entities: People Places Things' },
                        { name: 'schema.org类型 schema.org Types' },
                        { name: 'JSON-LD结构化数据 JSON-LD' },
                        { name: '实体搜索 Entity Search API' },
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
                        { name: 'Wikidata QID' },
                        { name: 'Wikipedia与Sitelinks' },
                        { name: 'DBpedia' },
                        { name: 'YAGO' },
                        { name: 'RDF三元组 RDF Triples' },
                        { name: 'SPARQL查询 SPARQL' },
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
                        { name: 'OpenAlex Works Authors Institutions' },
                        { name: '论文引用 Citation Graph' },
                        { name: '概念与学科 Concepts and Fields' },
                        { name: '期刊与会议 Venues' },
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
