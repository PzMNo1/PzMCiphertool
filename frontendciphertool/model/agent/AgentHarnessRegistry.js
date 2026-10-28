/**
 * AgentHarnessRegistry —— Harness 服务。
 *
 * 只负责装载与解析，不内置任何 Harness：
 * 内置 Harness 由 AgentPluginCatalog 挂载；全部卸载时退回 FALLBACK，链路与旧版一致。
 */
(function () {
    const DEFAULT_STAGES = [
        { id: 'plan', label: 'Plan' },
        { id: 'route', label: 'Route' },
        { id: 'act', label: 'Act' },
        { id: 'observe', label: 'Observe' },
        { id: 'synthesize', label: 'Synthesize' }
    ];

    const FALLBACK = {
        id: 'delivery',
        name: '交付链路',
        summary: '',
        stages: DEFAULT_STAGES,
        policy: { expertPanel: true, deliverable: true, synthesis: true },
        maxAgentIterations: null,
        prompt: []
    };

    class AgentHarnessRegistry {
        constructor(options = {}) {
            this.harnesses = new Map();
            this.defaultId = String(options.defaultId || 'delivery');
        }

        register(harness = {}) {
            const id = String(harness.id || '').trim();
            if (!id) throw new Error('harness.id is required');
            const stages = Array.isArray(harness.stages) && harness.stages.length
                ? harness.stages.map(stage => ({ id: String(stage.id || ''), label: String(stage.label || stage.id || '') }))
                : DEFAULT_STAGES.map(stage => ({ ...stage }));
            const normalized = {
                id,
                name: String(harness.name || id),
                summary: String(harness.summary || ''),
                source: String(harness.source || 'builtin'),
                stages,
                policy: {
                    expertPanel: harness.policy?.expertPanel !== false,
                    deliverable: harness.policy?.deliverable !== false,
                    synthesis: harness.policy?.synthesis !== false
                },
                maxAgentIterations: Number(harness.maxAgentIterations) > 0 ? Number(harness.maxAgentIterations) : null,
                prompt: Array.isArray(harness.prompt) ? harness.prompt.map(line => String(line)).filter(Boolean) : []
            };
            this.harnesses.set(id, normalized);
            return () => this.unregister(id);
        }

        unregister(id) {
            return this.harnesses.delete(String(id || ''));
        }

        get(id) {
            return this.harnesses.get(String(id || '')) || null;
        }

        has(id) {
            return this.harnesses.has(String(id || ''));
        }

        list() {
            return Array.from(this.harnesses.values()).map(harness => ({
                id: harness.id,
                name: harness.name,
                summary: harness.summary,
                source: harness.source,
                stages: harness.stages.map(stage => stage.id),
                policy: { ...harness.policy },
                maxAgentIterations: harness.maxAgentIterations
            }));
        }

        resolve() {
            const override = typeof window !== 'undefined' ? window.PZM_AGENT_HARNESS : '';
            const id = override && this.harnesses.has(override) ? override : this.defaultId;
            const harness = this.harnesses.get(id) || this.harnesses.get(this.defaultId) || FALLBACK;
            return {
                id: harness.id,
                name: harness.name,
                summary: harness.summary,
                stages: harness.stages.map(stage => ({ ...stage })),
                policy: { ...harness.policy },
                maxAgentIterations: harness.maxAgentIterations,
                prompt: harness.prompt.slice()
            };
        }

        buildPrompt(harness) {
            if (!harness || !Array.isArray(harness.prompt) || !harness.prompt.length) return [];
            return ['', '【Harness：' + harness.name + '】', ...harness.prompt];
        }
    }

    window.AgentHarnessRegistry = AgentHarnessRegistry;
    window.agentHarnessRegistry = new AgentHarnessRegistry();
})();
