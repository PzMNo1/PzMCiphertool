(function () {
    const STYLE_ID = 'mcpskilllab-inline-style';
    const FAVORITES_KEY = 'MCPSKILLLAB_FAVORITES';
    const BACKLOG_META_KEY = 'MCPSKILLLAB_BACKLOG_META';
    const CUSTOM_RESOURCES_KEY = 'MCPSKILLLAB_CUSTOM_RESOURCES';
    const LOCAL_API_BASE = window.CIPHERTOOL_API_BASE || 'http://localhost:8080';

    const fallbackResources = [
        {
            id: 'mcp-filesystem',
            name: 'Filesystem（本地文件）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['文件', '本地', '读写'],
            use: '让任意 MCP 客户端在指定目录里读、写、搜索文件，目录之外的路径访问不到。',
            what: 'Model Context Protocol 官方维护的本地文件服务。启动时把允许访问的目录作为参数传进去，它只能操作这些目录。',
            steps: [
                {
                    title: '确认能启动',
                    text: '需要 Node.js 18 以上。先在终端跑一次，把 D:\\work 换成你要开放的目录：',
                    code: 'npx -y @modelcontextprotocol/server-filesystem D:\\work'
                },
                {
                    title: '写进客户端配置',
                    text: '把这段加到 Claude Desktop 的 claude_desktop_config.json，或 Cursor 的 .cursor/mcp.json：',
                    code: '{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:\\\\work"]\n    }\n  }\n}'
                },
                {
                    title: '重启并验证',
                    text: '重启客户端后问一句：「列出 D:\\work 下的文件」，能返回目录内容就说明接通了。'
                }
            ],
            notes: ['只把项目目录传进去，不要直接开放整个磁盘。'],
            url: 'https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem',
            docs: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem'
        }
    ];

    const templates = [
        {
            id: 'mcp-json',
            title: 'MCP 服务通用配置',
            body: '{\n  "mcpServers": {\n    "server-name": {\n      "command": "npx",\n      "args": ["-y", "package-name"],\n      "env": {\n        "API_KEY": "your-key"\n      }\n    }\n  }\n}'
        },
        {
            id: 'mcp-dsh-loader',
            title: 'DSH 里接入 MCP 服务',
            body: '- id: mcp-server-name\n  name: \'@deepseek-ai/dsh-mcp-client\'\n  config:\n    serverName: server-name\n    transport: stdio\n    command: npx\n    args: [\'-y\', \'package-name\']\n    env:\n      API_KEY: !!js process.env.API_KEY'
        },
        {
            id: 'skill-folder',
            title: 'Skill 文件夹结构',
            body: 'my-skill/\n  SKILL.md\n  scripts/\n  references/\n  assets/\n\nSKILL.md 写清楚：什么时候用、按什么步骤做、有哪些限制；脚本和参考资料按需加载。'
        }
    ];

    const categoryTabs = [
        { id: 'dsh', label: 'DSH 能力', hint: 'DeepSeek Harness 已经内置的能力，写清楚了能做什么、怎么开口用。' },
        { id: 'mcp', label: 'MCP 服务', hint: '接入后 Agent 就能调用外部工具。配置片段是通用 mcpServers 格式，DSH 用户对应写成 dsh-mcp-client 的 loader 条目。' },
        { id: 'plugins', label: 'DSH 插件', hint: 'DeepSeek Harness 的插件包清单，写清楚每个包负责什么、怎么启用。' },
        { id: 'skill', label: 'skill', hint: 'Skill 仓库、Skill 市场、插件/技能目录。' },
        { id: 'prompt', label: 'prompt', hint: '提示词模板、提示词库、Prompt 配置和复用片段。' },
        { id: 'workflow', label: 'workflow', hint: '可复用工作流、Agent 编排、任务链路和流程模板。' },
        { id: 'devTools', label: 'dev tools', hint: '开发、调试、代码审查、CLI、IDE、仓库和工程工具。' },
        { id: 'dataApis', label: 'data&APIs', hint: '数据源、数据库、API、云服务和连接器。' },
        { id: 'security', label: 'security', hint: '安全审计、权限评估、风险扫描和防护工具。' },
        { id: 'automation', label: 'automation', hint: '浏览器、文件、办公、集成服务和自动化执行。' },
        { id: 'other', label: 'Other', hint: '暂时无法归入以上分类的资源。' }
    ];

    const allowedResourceTypes = [
        'DSH Capability',
        'MCP Server',
        'DSH Plugin',
        'MCP Registry',
        'MCP Directory',
        'MCP Documentation',
        'Skill Registry',
        'Skill Standard',
        'Skill Directory',
        'Plugin Marketplace'
    ];
    const allowedSources = ['Official', 'Community'];
    const MAX_IMPORT_BYTES = 200 * 1024;
    const MAX_BUNDLE_IMPORT_BYTES = 2 * 1024 * 1024;
    const MAX_CUSTOM_RESOURCES = 200;
    const MAX_FAVORITES = 500;
    const PAGE_SIZE = 24;

    const displayText = {
        source: {
            Official: '官方',
            Community: '社区'
        },
        type: {
            'DSH Capability': 'DSH 能力',
            'MCP Server': 'MCP 服务',
            'DSH Plugin': 'DSH 插件',
            'MCP Registry': 'MCP 注册表',
            'MCP Documentation': 'MCP 文档',
            'MCP Directory': 'MCP 目录',
            'Skill Registry': 'Skill 仓库',
            'Skill Standard': 'Skill 标准',
            'Skill Directory': 'Skill 目录',
            'Plugin Marketplace': '插件市场'
        }
    };

    window.MCPSKILLLAB_CONFIG = {
        styleId: STYLE_ID,
        favoritesKey: FAVORITES_KEY,
        backlogMetaKey: BACKLOG_META_KEY,
        customResourcesKey: CUSTOM_RESOURCES_KEY,
        localApiBase: LOCAL_API_BASE,
        fallbackResources,
        templates,
        categoryTabs,
        allowedResourceTypes,
        allowedSources,
        maxImportBytes: MAX_IMPORT_BYTES,
        maxBundleImportBytes: MAX_BUNDLE_IMPORT_BYTES,
        maxCustomResources: MAX_CUSTOM_RESOURCES,
        maxFavorites: MAX_FAVORITES,
        pageSize: PAGE_SIZE,
        displayText
    };
})();
