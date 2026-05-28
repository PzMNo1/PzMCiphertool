(function () {
    const STYLE_ID = 'mcpskilllab-inline-style';
    const FAVORITES_KEY = 'MCPSKILLLAB_FAVORITES';
    const BACKLOG_META_KEY = 'MCPSKILLLAB_BACKLOG_META';
    const CUSTOM_RESOURCES_KEY = 'MCPSKILLLAB_CUSTOM_RESOURCES';
    const CHECK_CACHE_KEY = 'MCPSKILLLAB_CHECK_CACHE';
    const CHECK_API_PATH = '/check-resource';
    const HEALTH_API_PATH = '/health';
    const LOCAL_API_BASE = window.CIPHERTOOL_API_BASE || 'http://localhost:8080';
    const BATCH_CHECK_DELAY_MS = 350;
    const REVIEW_HIGH_RISK_PERMISSIONS = ['shell', 'filesWrite', 'browser', 'database', 'docker', 'installScript', 'scripts'];
    const REVIEW_ITEM_LIMIT = 8;

    const fallbackResources = [
        {
            id: 'official-mcp-registry-fallback',
            name: 'Official MCP Registry',
            type: 'MCP Registry',
            source: 'Official',
            risk: 'Low',
            recommend: 'Official first',
            tags: ['mcp', 'registry', 'official'],
            scenario: 'Fallback entry used only when mcpskilllab-resources.js fails to load.',
            url: 'https://registry.modelcontextprotocol.io/',
            docs: 'https://github.com/modelcontextprotocol/registry',
            template: '{"mcpServers":{"server-name":{"command":"npx","args":["-y","package-name"]}}}',
            platforms: ['Generic MCP'],
            permissions: ['network'],
            installModes: ['registry', 'remote'],
            authRequired: false,
            maintenance: 'official',
            trustScore: 80,
            lastChecked: 'fallback'
        }
    ];

    const templates = [
        {
            id: 'mcp-json',
            title: 'MCP JSON 基础模板',
            body: '{\n  "mcpServers": {\n    "tool-name": {\n      "command": "npx",\n      "args": ["-y", "package-name"],\n      "env": {\n        "API_KEY": "your-key"\n      }\n    }\n  }\n}'
        },
        {
            id: 'skill-folder',
            title: 'Skill 文件夹结构',
            body: 'my-skill/\n  SKILL.md\n  scripts/\n  references/\n  assets/\n\nSKILL.md 写清楚何时使用、工作流、限制条件；脚本和参考资料按需加载。'
        },
        {
            id: 'audit-list',
            title: '安装前审计清单',
            body: '1. 阅读源码、manifest 和安装脚本。\n2. 检查文件、命令、浏览器、数据库、网络权限。\n3. 检查 API Key 是否只走本地环境变量。\n4. 优先选择官方或维护活跃项目。\n5. 先用最小权限测试，再逐步开放。'
        }
    ];

    const auditItems = [
        '先看上游仓库、manifest、安装脚本和最近维护记录。',
        '确认它是否会读取文件、运行命令、控制浏览器、连接数据库或访问云服务。',
        '高权限场景优先选择官方、维护活跃、可 Docker 隔离运行的 MCP Server。',
        'API Key 只放环境变量或本地忽略文件，不写进公开代码。',
        '第一次接入先用只读权限和测试账号，通过后再逐步开放写入权限。'
    ];

    const backlogStatuses = [
        { id: 'review', label: '待评估' },
        { id: 'ready', label: '准备接入' },
        { id: 'connected', label: '已接入' },
        { id: 'paused', label: '暂缓' }
    ];

    const categoryTabs = [
        { id: 'mcp', label: 'MCP', hint: 'MCP Server、Registry、Inspector、远程/本地 MCP 接入入口。' },
        { id: 'skill', label: 'skill', hint: 'Skill 仓库、Skill 市场、插件/技能目录。' },
        { id: 'prompt', label: 'prompt', hint: '提示词模板、提示词库、Prompt 配置和复用片段。' },
        { id: 'workflow', label: 'workflow', hint: '可复用工作流、Agent 编排、任务链路和流程模板。' },
        { id: 'devTools', label: 'dev tools', hint: '开发、调试、代码审查、CLI、IDE、仓库和工程工具。' },
        { id: 'dataApis', label: 'data&APIs', hint: '数据源、数据库、API、云服务和连接器。' },
        { id: 'security', label: 'security', hint: '安全审计、权限评估、风险扫描和防护工具。' },
        { id: 'automation', label: 'automation', hint: '浏览器、文件、办公、集成服务和自动化执行。' },
        { id: 'other', label: 'Other', hint: '暂时无法归入以上分类的资源。' }
    ];

    const sortOptions = [
        { id: 'trust', label: '可信分优先' },
        { id: 'name', label: '名称 A-Z' },
        { id: 'recent', label: '最近检查' }
    ];

    const allowedResourceTypes = [
        'MCP Registry',
        'MCP Directory',
        'MCP Documentation',
        'Skill Registry',
        'Skill Standard',
        'Skill Directory',
        'Plugin Marketplace'
    ];
    const allowedSources = ['Official', 'Community'];
    const allowedRisks = ['Low', 'Medium'];
    const allowedPermissions = [
        'network',
        'apiKey',
        'filesRead',
        'filesWrite',
        'shell',
        'browser',
        'database',
        'docker',
        'remote',
        'installScript',
        'scripts'
    ];
    const allowedInstallModes = [
        'registry',
        'remote',
        'docker',
        'local',
        'cli',
        'directory',
        'documentation',
        'inspector',
        'riskReview',
        'sourceReview',
        'marketplace'
    ];
    const allowedMaintenance = ['official', 'community', 'unknown'];
    const allowedAuth = ['true', 'false', 'depends'];
    const MAX_IMPORT_BYTES = 200 * 1024;
    const MAX_CUSTOM_RESOURCES = 200;
    const MAX_FAVORITES = 500;
    const MAX_CHECK_RESULTS = 300;
    const CHECK_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

    const wizardPlatforms = [
        { id: 'codex', label: 'Codex', configPath: '.codex/skills/', format: 'folder', hint: '在项目 .codex/skills/ 文件夹下创建 Skill 目录' },
        { id: 'claude', label: 'Claude Code', configPath: '.claude/', format: 'json', hint: '在 .claude/ 目录或 Claude Code 设置中添加 MCP JSON 配置' },
        { id: 'chatgpt', label: 'ChatGPT', configPath: 'Developer Mode > MCP Apps', format: 'remote', hint: 'ChatGPT 仅支持远程 MCP。本地 MCP Server 需通过隧道暴露。' },
        { id: 'cursor', label: 'Cursor', configPath: '.cursor/mcp.json', format: 'json', hint: '在项目根目录 .cursor/mcp.json 中添加 MCP Server 配置' },
        { id: 'generic', label: '通用 MCP', configPath: 'mcp.json', format: 'json', hint: '标准 MCP JSON 格式，适用于大多数兼容客户端' }
    ];

    const wizardModes = [
        { id: 'local', label: '本地安装', icon: '💻', hint: '在本机运行 npx / node 命令启动 MCP Server' },
        { id: 'remote', label: '远程 MCP', icon: '🌐', hint: '连接已部署的远程 MCP Server（需要 URL）' },
        { id: 'docker', label: 'Docker', icon: '🐳', hint: '通过 Docker 容器隔离运行 MCP Server' }
    ];

    const displayText = {
        source: {
            Official: '官方',
            Community: '社区'
        },
        risk: {
            Low: '低风险',
            Medium: '中风险'
        },
        type: {
            'MCP Registry': 'MCP 注册表',
            'MCP Documentation': 'MCP 文档',
            'MCP Directory': 'MCP 目录',
            'Skill Registry': 'Skill 仓库',
            'Skill Standard': 'Skill 标准',
            'Skill Directory': 'Skill 目录',
            'Plugin Marketplace': '插件市场'
        },
        recommend: {
            'Official first': '官方优先入口',
            'Best for isolated local runs': '适合隔离运行',
            'API-side MCP reference': 'API 接入参考',
            'ChatGPT custom app reference': 'ChatGPT 自定义应用参考',
            'Good discovery and install UX': '适合发现和安装',
            'Good inspector and schema view': '适合看工具结构',
            'Broad ecosystem scan': '适合扫全生态',
            'Meta search across directories': '跨目录搜索',
            'Simple category browsing': '分类浏览清晰',
            'Useful for initial risk triage': '适合初步风险判断',
            'Good GitHub curated list': 'GitHub 精选列表',
            'Codex skill baseline': 'Codex Skill 基准',
            'Good reference for portable skills': '可迁移 Skill 参考',
            'Use as neutral format reference': '中立标准参考',
            'Search Codex plugins and skills': 'Codex 插件/Skill 搜索',
            'Claude Code plugin discovery': 'Claude Code 插件发现',
            'Cross ecosystem search': '跨生态搜索',
            'Skill marketplace for CLI agents': 'CLI Agent Skill 市场',
            'Multi-platform skill search': '多平台 Skill 搜索'
        },
        scenario: {
            'Search standard MCP servers and inspect registry metadata.': '查询标准 MCP Server，并查看注册表元数据。',
            'Run MCP servers as Docker images with clearer isolation boundaries.': '用 Docker 镜像运行 MCP Server，权限边界更清楚。',
            'Use OpenAI API documentation for connector and MCP server integration patterns.': '查看 OpenAI API 侧连接器和 MCP Server 的接入方式。',
            'Reference ChatGPT custom MCP app behavior, connector boundaries, and testing flow.': '查看 ChatGPT 自定义 MCP App 的行为边界和测试流程。',
            'Find MCP servers, review tools, and use install-oriented workflows.': '发现 MCP Server、查看工具列表，并参考安装流程。',
            'Inspect MCP server tools and schemas before connecting them.': '接入前查看 MCP Server 暴露的工具和 schema。',
            'Browse MCP servers by category such as GitHub, Figma, Notion, browser, database.': '按 GitHub、Figma、Notion、浏览器、数据库等分类浏览 MCP Server。',
            'Search across multiple MCP sources from one place.': '聚合多个 MCP 来源，适合快速查找入口。',
            'Browse reference, official, and community MCP servers.': '按参考实现、官方、社区分类浏览 MCP Server。',
            'Use scoring and classification as a first pass before manual review.': '先看评分和分类，再做人工源码审查。',
            'Find community MCP projects and compare maintenance status.': '查找社区 MCP 项目，并比较维护活跃度。',
            'Use official Codex skills as examples for SKILL.md structure.': '参考 OpenAI 官方 Codex Skills 的 SKILL.md 组织方式。',
            'Study skill layout and reusable agent workflows.': '学习 Skill 的目录结构和可复用 Agent 工作流。',
            'Understand the open folder-based skill standard centered on SKILL.md.': '了解以 SKILL.md 为核心的开放 Skill 文件夹标准。',
            'Discover community Codex plugins and skills.': '查找社区 Codex 插件和 Skill。',
            'Discover Claude Code plugins and plugin marketplaces.': '查找 Claude Code 插件和 marketplace 接入方式。',
            'Search skills, MCP servers, GPT plugins, and other agent resources.': '跨 Skill、MCP Server、GPT 插件等资源搜索。',
            'Browse skills for Claude Code, Codex CLI, and compatible agents.': '浏览 Claude Code、Codex CLI 等 Agent 可用的 Skill。',
            'Search skills across OpenClaw, MCP, Claude, OpenAI, Cursor, and VS Code.': '跨 OpenClaw、MCP、Claude、OpenAI、Cursor、VS Code 搜索 Skill。'
        },
        permission: {
            network: '网络访问',
            apiKey: '需要密钥',
            filesRead: '读文件',
            filesWrite: '写文件',
            shell: '命令行',
            browser: '浏览器',
            database: '数据库',
            docker: 'Docker',
            remote: '远程服务',
            installScript: '安装脚本',
            scripts: '脚本资源'
        },
        installMode: {
            registry: '注册表',
            remote: '远程接入',
            docker: 'Docker',
            local: '本地安装',
            cli: 'CLI 安装',
            directory: '目录检索',
            documentation: '文档参考',
            inspector: '工具检查',
            riskReview: '风险审查',
            sourceReview: '源码审查',
            marketplace: '市场安装'
        },
        maintenance: {
            official: '官方维护',
            community: '社区维护',
            unknown: '维护未知'
        },
        auth: {
            true: '需要密钥',
            false: '不强制',
            depends: '视资源而定'
        }
    };

    window.MCPSKILLLAB_CONFIG = {
        styleId: STYLE_ID,
        favoritesKey: FAVORITES_KEY,
        backlogMetaKey: BACKLOG_META_KEY,
        customResourcesKey: CUSTOM_RESOURCES_KEY,
        checkCacheKey: CHECK_CACHE_KEY,
        checkApiPath: CHECK_API_PATH,
        healthApiPath: HEALTH_API_PATH,
        localApiBase: LOCAL_API_BASE,
        batchCheckDelayMs: BATCH_CHECK_DELAY_MS,
        reviewHighRiskPermissions: REVIEW_HIGH_RISK_PERMISSIONS,
        reviewItemLimit: REVIEW_ITEM_LIMIT,
        fallbackResources,
        templates,
        auditItems,
        backlogStatuses,
        categoryTabs,
        sortOptions,
        allowedResourceTypes,
        allowedSources,
        allowedRisks,
        allowedPermissions,
        allowedInstallModes,
        allowedMaintenance,
        allowedAuth,
        maxImportBytes: MAX_IMPORT_BYTES,
        maxCustomResources: MAX_CUSTOM_RESOURCES,
        maxFavorites: MAX_FAVORITES,
        maxCheckResults: MAX_CHECK_RESULTS,
        checkCacheTtlMs: CHECK_CACHE_TTL_MS,
        wizardPlatforms,
        wizardModes,
        displayText
    };
})();
