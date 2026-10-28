/**
 * AgentPluginPanel —— 插件面板。
 *
 * 渲染与操作都走内核：装卸 Skill / Harness / MCP 等同一次 mount / unmount。
 * snapshot() 与 render() 不碰 DOM，便于脱离浏览器回归。
 */
(function () {
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    class AgentPluginPanel {
        constructor(options = {}) {
            this.kernel = options.kernel || null;
            this.api = options.api || null;
            this.manifests = Array.isArray(options.manifests) ? options.manifests : [];
            this.root = null;
            this.status = '';
        }

        resolve() {
            this.kernel = this.kernel || window.agentPluginKernel || null;
            this.api = this.api || window.PZMAgentPlugins || null;
            if (!this.manifests.length) this.manifests = window.agentPluginManifests || [];
            return this;
        }

        snapshot() {
            this.resolve();
            const kernel = this.kernel;
            const harnesses = window.agentHarnessRegistry;
            const current = harnesses ? harnesses.resolve() : null;
            const mcpServers = window.agentMcpClient ? window.agentMcpClient.listServers() : [];
            return {
                pluginCount: kernel ? kernel.list().length : 0,
                networkGranted: Boolean(window.agentToolExecutor && window.agentToolExecutor.allows('network')),
                harnesses: harnesses
                    ? harnesses.list().map(item => ({
                        id: item.id,
                        name: item.name,
                        summary: item.summary,
                        active: Boolean(current && current.id === item.id)
                    }))
                    : [],
                skills: this.manifests
                    .filter(item => item.kind === 'skill')
                    .map(item => ({
                        id: item.id,
                        name: item.name,
                        mounted: Boolean(kernel && kernel.get(item.id))
                    })),
                mcp: mcpServers.map(server => ({
                    id: server.id,
                    name: server.name,
                    url: server.url,
                    tools: server.tools.length,
                    mounted: Boolean(kernel && kernel.get(`mcp.${server.id}`))
                }))
            };
        }

        render(state = this.snapshot()) {
            const harnessRows = state.harnesses.map(item => `
                <button class="agent-plugin-row ${item.active ? 'active' : ''}" data-action="use-harness" data-id="${escapeHtml(item.id)}">
                    <span class="agent-plugin-row-name">${escapeHtml(item.name)}</span>
                    <span class="agent-plugin-row-note">${escapeHtml(item.summary || '')}</span>
                </button>`).join('');

            const skillRows = state.skills.map(item => `
                <button class="agent-plugin-row ${item.mounted ? 'active' : ''}" data-action="toggle-skill" data-id="${escapeHtml(item.id)}">
                    <span class="agent-plugin-row-name">${escapeHtml(item.name)}</span>
                    <span class="agent-plugin-row-note">${item.mounted ? '已装载' : '已卸载'}</span>
                </button>`).join('');

            const mcpRows = state.mcp.length
                ? state.mcp.map(item => `
                <div class="agent-plugin-mcp-row">
                    <span class="agent-plugin-row-name">${escapeHtml(item.name)}</span>
                    <span class="agent-plugin-row-note">${item.tools} 个工具</span>
                    <button class="agent-plugin-mini" data-action="remove-mcp" data-id="${escapeHtml(item.id)}">移除</button>
                </div>`).join('')
                : '<div class="agent-plugin-empty">未接入 MCP 服务</div>';

            return `
                <div class="agent-plugin-head">
                    <strong>插件</strong>
                    <span class="agent-plugin-count">已装载 ${state.pluginCount}</span>
                    <button class="agent-plugin-mini" data-action="close">关闭</button>
                </div>
                <div class="agent-plugin-section">
                    <div class="agent-plugin-title">Harness</div>
                    ${harnessRows || '<div class="agent-plugin-empty">无可用 Harness</div>'}
                </div>
                <div class="agent-plugin-section">
                    <div class="agent-plugin-title">Skill</div>
                    ${skillRows || '<div class="agent-plugin-empty">无可用 Skill</div>'}
                </div>
                <div class="agent-plugin-section">
                    <div class="agent-plugin-title">MCP</div>
                    ${mcpRows}
                    <div class="agent-plugin-form">
                        <input data-field="mcp-name" placeholder="服务名" />
                        <input data-field="mcp-url" placeholder="https://mcp.example.com/rpc" />
                        <button class="agent-plugin-mini" data-action="add-mcp">接入</button>
                    </div>
                </div>
                <div class="agent-plugin-foot">
                    <span>网络能力：${state.networkGranted ? '已授权' : '未授权'}</span>
                    ${this.status ? `<span class="agent-plugin-status">${escapeHtml(this.status)}</span>` : ''}
                </div>`;
        }

        init(selector = '#agent-plugin-panel') {
            this.root = document.querySelector(selector);
            if (!this.root) return this;
            if (!this.root.dataset.pluginBound) {
                this.root.dataset.pluginBound = '1';
                this.root.addEventListener('click', event => this.handleClick(event));
            }
            if (!window.__agentPluginPanelDismissBound) {
                window.__agentPluginPanelDismissBound = true;
                document.addEventListener('click', event => {
                    if (!this.isOpen()) return;
                    if (!event.target.isConnected) return;
                    const trigger = document.getElementById('agent-plugin-btn');
                    if (this.root.contains(event.target) || (trigger && trigger.contains(event.target))) return;
                    this.close();
                });
                document.addEventListener('keydown', event => {
                    if (event.key === 'Escape' && this.isOpen()) this.close();
                });
            }
            this.root.innerHTML = this.render();
            return this;
        }

        refresh() {
            if (!this.root) return this;
            this.root.innerHTML = this.render();
            return this;
        }

        isOpen() {
            return Boolean(this.root && this.root.classList.contains('open'));
        }

        open() {
            if (!this.root) return this;
            this.root.classList.add('open');
            this.root.setAttribute('aria-hidden', 'false');
            return this.refresh();
        }

        close() {
            if (!this.root) return this;
            this.root.classList.remove('open');
            this.root.setAttribute('aria-hidden', 'true');
            return this;
        }

        toggle() {
            return this.isOpen() ? this.close() : this.open();
        }

        async handleClick(event) {
            // 面板内点击不再冒泡到 document，否则 refresh() 重建 DOM 后会误判定为外部点击
            event.stopPropagation();
            const button = event.target.closest('[data-action]');
            if (!button) return;
            const action = button.dataset.action;
            const id = button.dataset.id || '';
            this.status = '';
            try {
                if (action === 'close') return this.close();
                if (action === 'use-harness') {
                    this.api.harnesses.use(id);
                    return this.refresh();
                }
                if (action === 'toggle-skill') {
                    const manifest = this.manifests.find(item => item.id === id);
                    if (!manifest) throw new Error(`未找到插件 ${id}`);
                    if (this.kernel.get(id)) this.kernel.unmount(id);
                    else this.kernel.mount(manifest);
                    return this.refresh();
                }
                if (action === 'remove-mcp') {
                    this.api.mcp.remove(id);
                    return this.refresh();
                }
                if (action === 'add-mcp') {
                    const name = this.root.querySelector('[data-field="mcp-name"]')?.value.trim() || '';
                    const url = this.root.querySelector('[data-field="mcp-url"]')?.value.trim() || '';
                    if (!url) throw new Error('请填写 MCP 地址');
                    await this.api.mcp.add({ id: name || url, name: name || url, url });
                    this.status = '已接入';
                    return this.refresh();
                }
            } catch (error) {
                this.status = error?.message || String(error);
                return this.refresh();
            }
        }
    }

    window.AgentPluginPanel = AgentPluginPanel;
    window.agentPluginPanel = new AgentPluginPanel();
})();
