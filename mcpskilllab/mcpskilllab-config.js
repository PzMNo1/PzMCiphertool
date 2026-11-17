(function () {
    const STYLE_ID = 'mcpskilllab-inline-style';
    const FAVORITES_KEY = 'MCPSKILLLAB_FAVORITES';
    const BACKLOG_META_KEY = 'MCPSKILLLAB_BACKLOG_META';
    const CUSTOM_RESOURCES_KEY = 'MCPSKILLLAB_CUSTOM_RESOURCES';
    const LOCAL_API_BASE = window.CIPHERTOOL_API_BASE || 'http://127.0.0.1:8080';

    const fallbackResources = [];

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
        { id: 'prompt', label: 'Prompt', hint: '提示词模板、系统指令和可复用的 Prompt 片段。' },
        { id: 'tools', label: 'Tools', hint: 'Agent 能调用的工具、命令和外部执行能力。' },
        { id: 'skill', label: 'Skill', hint: '可复用的技能包、操作手册和领域知识。' },
        { id: 'mcp', label: 'MCP', hint: '通过 MCP 接入的外部服务、数据源和工具。' },
        { id: 'workflow', label: 'Workflow', hint: '多步骤任务编排、自动化流程和协作链路。' },
        { id: 'harness', label: 'Harness', hint: 'DeepSeek Harness 本体能力、插件和运行环境。' }
    ];

    const allowedResourceTypes = [
        'Prompt',
        'Tool',
        'Skill',
        'MCP Server',
        'Workflow',
        'Harness',
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
            'Prompt': 'Prompt',
            'Tool': 'Tool',
            'Skill': 'Skill',
            'Workflow': 'Workflow',
            'Harness': 'Harness',
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
