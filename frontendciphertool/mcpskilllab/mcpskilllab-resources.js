(function () {
    const groups = window.MCPSKILLLAB_RESOURCE_GROUPS || [];
    const categoryIds = new Set(['mcp', 'skill', 'prompt', 'workflow', 'devTools', 'dataApis', 'security', 'automation', 'other']);

    function normalizeCategory(value) {
        const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
        const aliases = {
            mcp: 'mcp',
            mcptools: 'mcp',
            skill: 'skill',
            skills: 'skill',
            prompt: 'prompt',
            prompts: 'prompt',
            workflow: 'workflow',
            workflows: 'workflow',
            devtools: 'devTools',
            developer: 'devTools',
            dataapis: 'dataApis',
            dataapi: 'dataApis',
            data: 'dataApis',
            apis: 'dataApis',
            security: 'security',
            automation: 'automation',
            other: 'other'
        };
        return aliases[normalized] || '';
    }

    function hasAnyKeyword(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }

    function inferCategory(item) {
        const explicit = [
            ...(Array.isArray(item.categories) ? item.categories : []),
            item.category,
            item.primaryCategory
        ].map(normalizeCategory).filter(Boolean);
        if (explicit.length) return explicit[0];

        const type = String(item.type || '').toLowerCase();
        const tags = (Array.isArray(item.tags) ? item.tags : []).map(tag => String(tag).toLowerCase());
        const text = [
            item.name,
            item.type,
            item.recommend,
            item.scenario,
            item.template,
            tags.join(' ')
        ].join(' ').toLowerCase();

        if (type.includes('mcp') || (tags.includes('mcp') && !type.includes('skill') && !type.includes('plugin'))) return 'mcp';
        if (type.includes('skill registry') || type.includes('skill standard')) return 'skill';
        if (tags.includes('prompt') || hasAnyKeyword(text, ['prompt', 'prompts', '提示词'])) return 'prompt';
        if (tags.includes('workflow') || hasAnyKeyword(text, ['workflow', 'workflows', '工作流', '编排'])) return 'workflow';
        if (hasAnyKeyword(text, ['security', 'safety', 'risk', 'audit', '权限', '风险', '安全', '审计'])) return 'security';
        if (hasAnyKeyword(text, ['automation', 'browser', 'office', '自动化', '浏览器'])) return 'automation';
        if (hasAnyKeyword(text, ['database', 'api', 'connector', 'data', '数据库', '数据源', '连接器'])) return 'dataApis';
        if (type.includes('skill') || type.includes('plugin') || tags.includes('skill')) return 'skill';
        if (hasAnyKeyword(text, ['github', 'vscode', 'cursor', 'cli', 'debug', 'developer', '开发', '调试'])) return 'devTools';
        return 'other';
    }

    function normalizeResource(item) {
        if (!item || typeof item !== 'object') return item;
        const category = normalizeCategory(item.category) || inferCategory(item);
        const categories = [
            ...(Array.isArray(item.categories) ? item.categories.map(normalizeCategory).filter(Boolean) : []),
            category
        ].filter(value => categoryIds.has(value));
        return {
            ...item,
            category,
            categories: Array.from(new Set(categories.length ? categories : ['other']))
        };
    }

    window.MCPSKILLLAB_RESOURCES = groups.reduce((list, group) => {
        const resources = group && Array.isArray(group.resources) ? group.resources : [];
        return list.concat(resources.map(normalizeResource));
    }, []);
})();
