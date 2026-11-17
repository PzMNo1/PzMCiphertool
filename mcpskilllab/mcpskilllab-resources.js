(function () {
    const groups = window.MCPSKILLLAB_RESOURCE_GROUPS || [];
    const categoryIds = new Set(['prompt', 'tools', 'skill', 'mcp', 'workflow', 'harness']);

    function normalizeCategory(value) {
        const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
        const aliases = {
            prompt: 'prompt',
            prompts: 'prompt',
            tool: 'tools',
            tools: 'tools',
            skill: 'skill',
            skills: 'skill',
            mcp: 'mcp',
            mcptools: 'mcp',
            workflow: 'workflow',
            workflows: 'workflow',
            harness: 'harness',
            dsh: 'harness',
            cap: 'harness',
            capability: 'harness',
            plugin: 'harness',
            plugins: 'harness'
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
        if (tags.includes('prompt') || hasAnyKeyword(text, ['prompt', 'prompts', '提示词'])) return 'prompt';
        if (tags.includes('workflow') || hasAnyKeyword(text, ['workflow', 'workflows', '工作流', '编排'])) return 'workflow';
        if (hasAnyKeyword(text, ['harness', 'dsh', '插件'])) return 'harness';
        if (type.includes('skill') || type.includes('skill registry') || type.includes('skill standard') || tags.includes('skill')) return 'skill';
        return 'tools';
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
            categories: Array.from(new Set(categories.length ? categories : ['tools']))
        };
    }

    window.MCPSKILLLAB_RESOURCES = groups.reduce((list, group) => {
        const resources = group && Array.isArray(group.resources) ? group.resources : [];
        return list.concat(resources.map(normalizeResource));
    }, []);
})();
