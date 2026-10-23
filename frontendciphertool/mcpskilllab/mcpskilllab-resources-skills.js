(function () {
    const promptResources = [];
    const skillResources = [];
    const workflowResources = [];
    const harnessResources = [];

    const groups = (window.MCPSKILLLAB_RESOURCE_GROUPS || [])
        .filter(group => group && !['prompt', 'skill', 'workflow', 'harness'].includes(group.id));
    groups.push({ id: 'prompt', resources: promptResources });
    groups.push({ id: 'skill', resources: skillResources });
    groups.push({ id: 'workflow', resources: workflowResources });
    groups.push({ id: 'harness', resources: harnessResources });
    window.MCPSKILLLAB_RESOURCE_GROUPS = groups;
})();
