/**
 * AgentPluginKernel —— 插件内核（A 路线的宿主）。
 *
 * manifest 是唯一插件描述：行为 + 能力声明 + 工程约束。
 * 约束不满足即拒载（硬拒载），没有警告档；B 阶段这份 manifest 交给 Cordis 托管。
 */
(function () {
    const KINDS = ['skill', 'harness', 'tool', 'mcp'];
    const PLACEMENTS = ['model/agent/', 'runtime'];
    const KNOWN_CAPABILITIES = ['memory', 'network', 'fs', 'model', 'exec'];
    const FORBIDDEN_CAPABILITIES = ['security', 'audit', 'logging', 'permission'];
    const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/;

    class AgentPluginError extends Error {
        constructor(pluginId, errors = []) {
            super(`插件 ${pluginId || '(unknown)'} 被拒载：${errors.join('；')}`);
            this.name = 'AgentPluginError';
            this.pluginId = pluginId || '';
            this.errors = errors.slice();
        }
    }

    class AgentPluginKernel {
        constructor(options = {}) {
            this.services = new Map();
            this.plugins = new Map();
            this.grants = new Map();
            this.limits = {
                maxTools: Number(options.maxTools) > 0 ? Number(options.maxTools) : 24,
                maxPromptChars: Number(options.maxPromptChars) > 0 ? Number(options.maxPromptChars) : 1200
            };
            this.forbidden = new Set(FORBIDDEN_CAPABILITIES);
            this.placements = PLACEMENTS.slice();
            this.kinds = KINDS.slice();
        }

        provide(name, instance) {
            this.services.set(String(name), instance);
            return instance;
        }

        hasService(name) {
            return this.services.has(String(name));
        }

        require(name) {
            const key = String(name);
            if (!this.services.has(key)) throw new Error(`服务 ${key} 未提供`);
            return this.services.get(key);
        }

        validate(manifest = {}) {
            const errors = [];
            const id = String(manifest.id || '');
            if (!ID_PATTERN.test(id)) errors.push(`id 必须匹配 ${ID_PATTERN}`);
            if (!this.kinds.includes(manifest.kind)) errors.push(`kind 只允许 ${this.kinds.join(' / ')}`);
            if (typeof manifest.mount !== 'function') errors.push('mount 必须是函数');
            if (!this.placements.includes(manifest.placement)) errors.push(`placement 只允许 ${this.placements.join(' / ')}`);
            if (manifest.contracts !== 'read-only') errors.push('contracts 必须是 read-only（contracts/ 已冻结）');

            const capabilities = Array.isArray(manifest.capabilities) ? manifest.capabilities : null;
            if (!capabilities) errors.push('capabilities 必须是数组（无能力传 []）');
            (capabilities || []).forEach(capability => {
                if (!KNOWN_CAPABILITIES.includes(capability)) errors.push(`未知能力 ${capability}`);
                if (this.forbidden.has(capability)) errors.push(`禁止的横切能力 ${capability}`);
            });

            const provides = manifest.provides && typeof manifest.provides === 'object' ? manifest.provides : {};
            const contract = window.AgentContract;
            if (contract) {
                (Array.isArray(provides.events) ? provides.events : []).forEach(name => {
                    if (!contract.EVENT_TYPES.includes(name)) errors.push(`事件 ${name} 不在 agent-contract-v1`);
                });
                (Array.isArray(provides.packages) ? provides.packages : []).forEach(name => {
                    if (!contract.TOOL_PACKAGES.includes(name)) errors.push(`工具包 ${name} 不在 agent-contract-v1`);
                });
            }

            const tools = Array.isArray(provides.tools) ? provides.tools : [];
            if (tools.length > this.limits.maxTools) {
                errors.push(`工具数 ${tools.length} 超过上限 ${this.limits.maxTools}`);
            }
            const promptChars = (Array.isArray(manifest.prompt) ? manifest.prompt : []).join('\n').length;
            if (promptChars > this.limits.maxPromptChars) {
                errors.push(`提示词 ${promptChars} 字超过上限 ${this.limits.maxPromptChars}`);
            }
            if (this.plugins.has(id)) errors.push(`插件 ${id} 已挂载`);
            return errors;
        }

        mount(manifest = {}) {
            const errors = this.validate(manifest);
            if (errors.length) throw new AgentPluginError(manifest.id, errors);

            const capabilities = manifest.capabilities.slice();
            this.grantCapabilities(capabilities);

            const toolsBefore = manifest.kind === 'tool' ? new Set(this.toolNames()) : null;
            const ctx = this.createContext(manifest);
            let dispose;
            try {
                dispose = manifest.mount(ctx);
            } catch (error) {
                this.releaseCapabilities(capabilities);
                throw error;
            }
            if (typeof dispose !== 'function') {
                this.releaseCapabilities(capabilities);
                throw new AgentPluginError(manifest.id, ['mount 必须返回 disposer']);
            }

            if (manifest.kind === 'tool') {
                const declared = new Set(manifest.provides?.tools || []);
                const undeclared = this.toolNames().filter(name => !toolsBefore.has(name) && !declared.has(name));
                if (undeclared.length) {
                    try {
                        dispose();
                    } catch (error) {
                        console.warn('[plugin] 回滚失败', error);
                    }
                    this.releaseCapabilities(capabilities);
                    throw new AgentPluginError(manifest.id, [`未声明的工具 ${undeclared.join(', ')}`]);
                }
            }

            this.plugins.set(manifest.id, {
                id: manifest.id,
                kind: manifest.kind,
                name: String(manifest.name || manifest.id),
                source: String(manifest.source || 'runtime'),
                capabilities,
                manifest,
                ctx,
                dispose
            });
            return { id: manifest.id, dispose: () => this.unmount(manifest.id) };
        }

        unmount(id) {
            const key = String(id || '');
            const record = this.plugins.get(key);
            if (!record) return false;
            try {
                record.dispose();
            } catch (error) {
                console.warn(`[plugin] ${key} 卸载失败`, error);
            }
            this.plugins.delete(key);
            this.releaseCapabilities(record.capabilities);
            return true;
        }

        get(id) {
            return this.plugins.get(String(id || '')) || null;
        }

        list() {
            return Array.from(this.plugins.values()).map(record => ({
                id: record.id,
                kind: record.kind,
                name: record.name,
                source: record.source,
                capabilities: record.capabilities.slice(),
                tools: (record.manifest.provides?.tools || []).slice(),
                placement: record.manifest.placement
            }));
        }

        createContext(manifest) {
            const ctx = { kernel: this, manifest };
            this.services.forEach((value, key) => {
                ctx[key] = value;
            });
            return ctx;
        }

        toolNames() {
            const tools = this.services.get('tools');
            return tools && typeof tools.getToolNames === 'function' ? tools.getToolNames() : [];
        }

        grantCapabilities(capabilities = []) {
            const executor = this.services.get('executor');
            capabilities.forEach(capability => {
                this.grants.set(capability, (this.grants.get(capability) || 0) + 1);
            });
            if (executor && capabilities.length) executor.grant(capabilities);
        }

        releaseCapabilities(capabilities = []) {
            const executor = this.services.get('executor');
            capabilities.forEach(capability => {
                const count = this.grants.get(capability) || 0;
                if (count <= 1) {
                    this.grants.delete(capability);
                    if (executor) executor.revoke([capability]);
                } else {
                    this.grants.set(capability, count - 1);
                }
            });
        }
    }

    window.AgentPluginError = AgentPluginError;
    window.AgentPluginKernel = AgentPluginKernel;
})();
