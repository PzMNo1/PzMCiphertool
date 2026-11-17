(function () {
    const toolResources = [];
    const mcpResources = [];

    const groups = (window.MCPSKILLLAB_RESOURCE_GROUPS || [])
        .filter(group => group && group.id !== 'tools' && group.id !== 'mcp');
    groups.push({ id: 'tools', resources: toolResources });
    groups.push({ id: 'mcp', resources: mcpResources });
    window.MCPSKILLLAB_RESOURCE_GROUPS = groups;
})();
