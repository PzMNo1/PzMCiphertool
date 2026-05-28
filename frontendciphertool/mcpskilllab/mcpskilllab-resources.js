(function () {
    const groups = window.MCPSKILLLAB_RESOURCE_GROUPS || [];
    window.MCPSKILLLAB_RESOURCES = groups.reduce((list, group) => {
        const resources = group && Array.isArray(group.resources) ? group.resources : [];
        return list.concat(resources);
    }, []);
})();
