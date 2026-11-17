/**
 * AgentSkillRegistry —— Skill 服务。
 *
 * 只负责装载与激活，不内置任何 Skill：
 * 内置 Skill 由 AgentPluginCatalog 以 manifest 形式挂载，卸载即撤销提示词与工具偏好。
 */
(function () {
    const MAX_ACTIVE = 2;

    class AgentSkillRegistry {
        constructor(options = {}) {
            this.skills = new Map();
            this.maxActive = Number(options.maxActive) > 0 ? Number(options.maxActive) : MAX_ACTIVE;
        }

        register(skill = {}) {
            const id = String(skill.id || '').trim();
            if (!id) throw new Error('skill.id is required');
            const keywords = Array.isArray(skill.keywords)
                ? skill.keywords.map(item => String(item || '').trim()).filter(Boolean)
                : [];
            const normalized = {
                id,
                name: String(skill.name || id),
                summary: String(skill.summary || ''),
                source: String(skill.source || 'builtin'),
                modes: Array.isArray(skill.modes) && skill.modes.length ? skill.modes.slice() : ['agent'],
                keywords,
                tools: Array.isArray(skill.tools) ? skill.tools.map(String) : [],
                prompt: Array.isArray(skill.prompt) ? skill.prompt.map(line => String(line)).filter(Boolean) : [],
                priority: Number(skill.priority) || 0
            };
            this.skills.set(id, normalized);
            return () => this.unregister(id);
        }

        unregister(id) {
            return this.skills.delete(String(id || ''));
        }

        get(id) {
            return this.skills.get(String(id || '')) || null;
        }

        has(id) {
            return this.skills.has(String(id || ''));
        }

        list() {
            return Array.from(this.skills.values()).map(skill => ({
                id: skill.id,
                name: skill.name,
                summary: skill.summary,
                source: skill.source,
                keywords: skill.keywords.slice(),
                tools: skill.tools.slice()
            }));
        }

        activate(intent = {}) {
            const mode = String(intent.mode || 'chat');
            const text = String(intent.text || intent.rawMessage || '').toLowerCase();
            const hits = [];
            this.skills.forEach(skill => {
                if (!skill.modes.includes(mode)) return;
                const matched = skill.keywords.filter(keyword => text.includes(keyword.toLowerCase()));
                if (skill.keywords.length && !matched.length) return;
                hits.push({ skill, matched, score: skill.priority + matched.length });
            });
            hits.sort((a, b) => b.score - a.score || a.skill.id.localeCompare(b.skill.id));
            return hits.slice(0, this.maxActive).map(hit => ({
                id: hit.skill.id,
                name: hit.skill.name,
                matched: hit.matched.slice()
            }));
        }

        buildPrompt(activeOrIds = []) {
            const items = Array.isArray(activeOrIds) ? activeOrIds : [];
            const skills = items
                .map(item => this.get(typeof item === 'string' ? item : item?.id))
                .filter(Boolean);
            if (!skills.length) return [];
            const parts = [];
            skills.forEach(skill => {
                parts.push('', '【Skill：' + skill.name + '】');
                parts.push(...skill.prompt);
            });
            return parts;
        }

        preferredTools(activeOrIds = []) {
            const names = new Set();
            (Array.isArray(activeOrIds) ? activeOrIds : []).forEach(item => {
                const skill = this.get(typeof item === 'string' ? item : item?.id);
                if (skill) skill.tools.forEach(name => names.add(name));
            });
            return Array.from(names);
        }
    }

    window.AgentSkillRegistry = AgentSkillRegistry;
    window.agentSkillRegistry = new AgentSkillRegistry();
})();
