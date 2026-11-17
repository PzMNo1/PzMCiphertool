/**
 * AgentMcpClient —— MCP 插件层。
 *
 * 把 MCP Server 当作可装卸能力源：连接后 tools/list 映射为 `mcp__<server>__<tool>`，
 * 通过 ToolRegistry 与内置工具同权路由；移除即撤销注册与本地目录。
 * 传输层限定 HTTP(S) JSON-RPC；浏览器直连受跨域限制，同源中继可复用同一接口。
 */
(function () {
    const SERVER_KEY = 'pzm_mcp_servers_v1';
    const CATALOG_KEY = 'pzm_mcp_catalogs_v1';
    const PROTOCOL_VERSION = '2025-06-18';
    const TOOL_PREFIX = 'mcp__';
    const TOOL_NAME_MAX = 64;
    const REQUEST_TIMEOUT = 20000;
    const CALL_TIMEOUT = 60000;

    function sanitize(value) {
        const text = String(value || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
        return text || 'server';
    }

    function shortHash(value) {
        const text = String(value || '');
        let hash = 2166136261;
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    }

    function storage() {
        try {
            return window.localStorage || null;
        } catch (error) {
            return null;
        }
    }

    function readJson(key, fallback) {
        const store = storage();
        if (!store) return fallback;
        try {
            const raw = store.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        const store = storage();
        if (!store) return;
        try {
            store.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn('[MCP] persist failed', key, error?.message || error);
        }
    }

    function parseMessages(text, contentType) {
        const trimmed = String(text || '').trim();
        if (!trimmed) return [];
        const looksSse = /text\/event-stream/i.test(contentType) || /^data:/m.test(trimmed) || /^event:/m.test(trimmed);
        if (looksSse) {
            return trimmed
                .split(/\r?\n/)
                .filter(line => line.startsWith('data:'))
                .map(line => line.slice(5).trim())
                .filter(Boolean)
                .map(payload => {
                    try {
                        return JSON.parse(payload);
                    } catch (error) {
                        return null;
                    }
                })
                .filter(Boolean);
        }
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
            return [];
        }
    }

    class AgentMcpClient {
        constructor(options = {}) {
            this.registry = options.registry || null;
            this.executor = options.executor || null;
            this.servers = [];
            this.catalogs = {};
            this.sessions = new Map();
            this.toolIds = new Map();
            this.sequence = 0;
            this.load();
        }

        attachExecutor(executor) {
            this.executor = executor || null;
            return this;
        }

        detachExecutor() {
            this.executor = null;
            return this;
        }

        disconnectAll() {
            this.sessions.clear();
            return this;
        }

        unregisterAll() {
            Array.from(this.toolIds.keys()).forEach(serverId => this.unregisterTools(serverId));
            this.disconnectAll();
            return this;
        }

        getRegistry() {
            return this.registry || window.toolRegistry || null;
        }

        load() {
            const servers = readJson(SERVER_KEY, []);
            const catalogs = readJson(CATALOG_KEY, {});
            this.servers = Array.isArray(servers)
                ? servers.filter(server => server && server.id && server.url)
                : [];
            this.catalogs = catalogs && typeof catalogs === 'object' && !Array.isArray(catalogs) ? catalogs : {};
            return this;
        }

        save() {
            writeJson(SERVER_KEY, this.servers);
            writeJson(CATALOG_KEY, this.catalogs);
        }

        listServers() {
            return this.servers.map(server => {
                const catalog = this.catalogs[server.id] || {};
                return {
                    id: server.id,
                    name: server.name,
                    url: server.url,
                    connected: this.sessions.has(server.id),
                    tools: (Array.isArray(catalog.tools) ? catalog.tools : []).map(tool => tool.name),
                    fetchedAt: Number(catalog.fetchedAt) || 0
                };
            });
        }

        normalizeServer(config = {}) {
            const url = String(config.url || '').trim();
            if (!/^https?:\/\//i.test(url)) throw new Error('MCP server url 必须是 http(s) 地址');
            const id = sanitize(config.id || config.name || url.replace(/^https?:\/\//i, ''));
            return {
                id,
                name: String(config.name || id),
                url,
                headers: config.headers && typeof config.headers === 'object' ? { ...config.headers } : null
            };
        }

        addServer(config = {}) {
            const server = this.normalizeServer(config);
            const index = this.servers.findIndex(item => item.id === server.id);
            if (index >= 0) this.servers[index] = server;
            else this.servers.push(server);
            this.sessions.delete(server.id);
            this.save();
            return server;
        }

        removeServer(id) {
            const key = sanitize(id);
            this.unregisterTools(key);
            this.servers = this.servers.filter(item => item.id !== key);
            delete this.catalogs[key];
            this.sessions.delete(key);
            this.save();
            return true;
        }

        requireServer(id) {
            const key = sanitize(id);
            const server = this.servers.find(item => item.id === key);
            if (!server) throw new Error(`未登记的 MCP 服务: ${key}`);
            return server;
        }

        hydrate() {
            this.servers.forEach(server => {
                const tools = this.catalogs[server.id]?.tools || [];
                if (tools.length) this.registerTools(server, tools);
            });
            return this;
        }

        async connect(id, options = {}) {
            const server = this.requireServer(id);
            try {
                await this.initialize(server, options);
                const tools = await this.listTools(server, options);
                this.catalogs[server.id] = { tools, fetchedAt: Date.now() };
                this.save();
                this.registerTools(server, tools);
                return tools;
            } catch (error) {
                this.sessions.delete(server.id);
                throw error;
            }
        }

        async connectAll(options = {}) {
            const results = [];
            for (const server of this.servers.slice()) {
                try {
                    const tools = await this.connect(server.id, options);
                    results.push({ id: server.id, ok: true, tools: tools.length });
                } catch (error) {
                    results.push({ id: server.id, ok: false, error: error?.message || String(error) });
                }
            }
            return results;
        }

        async initialize(server, options = {}) {
            const { payload, sessionId } = await this.request(server, 'initialize', {
                protocolVersion: PROTOCOL_VERSION,
                capabilities: {},
                clientInfo: { name: 'pzm-ciphertool-agent', version: '1.0.0' }
            }, { ...options, session: false });
            this.sessions.set(server.id, {
                sessionId: sessionId || '',
                protocolVersion: payload?.protocolVersion || PROTOCOL_VERSION
            });
            await this.notify(server, 'notifications/initialized', {}, options).catch(() => {});
            return payload;
        }

        async listTools(server, options = {}) {
            const { payload } = await this.request(server, 'tools/list', {}, options);
            const tools = Array.isArray(payload?.tools) ? payload.tools : [];
            return tools
                .map(tool => ({
                    name: String(tool?.name || ''),
                    description: String(tool?.description || ''),
                    inputSchema: tool?.inputSchema && typeof tool.inputSchema === 'object'
                        ? tool.inputSchema
                        : { type: 'object', properties: {} }
                }))
                .filter(tool => tool.name);
        }

        async callTool(serverId, toolName, args = {}, options = {}) {
            const server = this.requireServer(serverId);
            if (!this.sessions.has(server.id)) await this.initialize(server, options);
            const { payload } = await this.request(server, 'tools/call', {
                name: toolName,
                arguments: args && typeof args === 'object' ? args : {}
            }, { timeoutMs: CALL_TIMEOUT, ...options });
            const content = Array.isArray(payload?.content) ? payload.content : [];
            const text = content
                .map(part => {
                    if (!part) return '';
                    if (part.type === 'text') return String(part.text || '');
                    if (part.type === 'resource') return JSON.stringify(part.resource || {});
                    return '';
                })
                .filter(Boolean)
                .join('\n');
            if (payload?.isError) throw new Error(text || 'MCP tool returned an error');
            return text || JSON.stringify(payload || {});
        }

        buildHeaders(server, session, extra = {}) {
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                ...(server.headers || {}),
                ...extra
            };
            if (session?.sessionId) headers['Mcp-Session-Id'] = session.sessionId;
            if (session?.protocolVersion) headers['MCP-Protocol-Version'] = session.protocolVersion;
            return headers;
        }

        async request(server, method, params, options = {}) {
            const session = options.session === false ? null : this.sessions.get(server.id);
            const id = ++this.sequence;
            const body = { jsonrpc: '2.0', id, method, params: params || {} };
            const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : REQUEST_TIMEOUT;
            const response = await this.post(server, body, this.buildHeaders(server, session), timeoutMs);
            return { payload: response.payload, sessionId: response.sessionId };
        }

        async notify(server, method, params, options = {}) {
            const session = this.sessions.get(server.id);
            const body = { jsonrpc: '2.0', method, params: params || {} };
            const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : REQUEST_TIMEOUT;
            await this.post(server, body, this.buildHeaders(server, session), timeoutMs, { expectResponse: false });
        }

        async post(server, body, headers, timeoutMs, options = {}) {
            let response;
            try {
                response = await this.send(server, body, headers, timeoutMs);
            } catch (error) {
                throw new Error(this.describeNetworkError(server, error));
            }
            const text = await response.text().catch(() => '');
            const sessionId = response.headers?.get?.('Mcp-Session-Id') || '';
            if (!response.ok) {
                throw new Error(`MCP ${server.id} HTTP ${response.status}: ${String(text).slice(0, 240)}`);
            }
            if (options.expectResponse === false) return { payload: {}, sessionId };
            const messages = parseMessages(text, response.headers?.get?.('content-type') || '');
            const message = messages.find(item => item && item.id === body.id) || messages[0];
            if (!message) throw new Error(`MCP ${server.id} 未返回 JSON-RPC 响应`);
            if (message.error) {
                const code = message.error.code ? ` (${message.error.code})` : '';
                throw new Error(`MCP ${server.id} ${message.error.message || 'error'}${code}`);
            }
            return { payload: message.result || {}, sessionId };
        }

        async send(server, body, headers, timeoutMs) {
            const request = {
                url: server.url,
                init: { method: 'POST', headers, body: JSON.stringify(body) },
                timeoutMs
            };
            if (this.executor) {
                const transport = typeof window !== 'undefined' && window.PZM_MCP_TRANSPORT === 'relay' ? 'relay' : 'http';
                return this.executor.run({ transport, capability: 'network', request, timeoutMs });
            }
            throw new Error('执行器未挂载，MCP 网络能力不可用');
        }

        describeNetworkError(server, error) {
            if (error?.name === 'AbortError') return `MCP ${server.id} 请求超时`;
            return `MCP ${server.id} 连接失败：${error?.message || 'network error'}（浏览器直连需服务端允许跨域，否则应走同源中继）`;
        }

        toolId(serverId, toolName) {
            const base = `${TOOL_PREFIX}${sanitize(serverId)}__${sanitize(toolName)}`;
            if (base.length <= TOOL_NAME_MAX) return base;
            return `${base.slice(0, TOOL_NAME_MAX - 9)}_${shortHash(toolName).slice(0, 8)}`;
        }

        registerTools(server, tools = []) {
            const registry = this.getRegistry();
            if (!registry || typeof registry.register !== 'function') return [];
            this.unregisterTools(server.id);
            const ids = [];
            tools.forEach(tool => {
                const id = this.toolId(server.id, tool.name);
                try {
                    registry.register({
                        name: id,
                        description: `[MCP ${server.name}] ${tool.description || tool.name}`.slice(0, 900),
                        parameters: tool.inputSchema || { type: 'object', properties: {} },
                        execute: args => this.callTool(server.id, tool.name, args),
                        metadata: {
                            package: 'mcp_tools',
                            risk: 'network_read',
                            sideEffect: false,
                            requiresApproval: false,
                            timeoutMs: CALL_TIMEOUT,
                            maxOutputChars: 16000,
                            networkAccess: true,
                            projectAccess: 'none',
                            owner: 'mcp',
                            enabledByDefault: true,
                            mcpServer: server.id,
                            mcpTool: tool.name
                        }
                    });
                    ids.push(id);
                } catch (error) {
                    console.warn('[MCP] 注册工具失败', id, error?.message || error);
                }
            });
            this.toolIds.set(server.id, ids);
            return ids;
        }

        unregisterTools(serverId) {
            const registry = this.getRegistry();
            const key = sanitize(serverId);
            const ids = this.toolIds.get(key) || [];
            ids.forEach(id => {
                try {
                    registry?.unregister?.(id);
                } catch (error) {
                    console.warn('[MCP] 注销工具失败', id, error?.message || error);
                }
            });
            this.toolIds.delete(key);
            return ids.length;
        }

        buildPromptFragment() {
            const lines = [];
            this.servers.forEach(server => {
                const tools = this.catalogs[server.id]?.tools || [];
                if (!tools.length) return;
                const names = tools.slice(0, 8).map(tool => tool.name).join(', ');
                lines.push(`- ${server.name}（${server.id}）：${names}${tools.length > 8 ? ' …' : ''}`);
            });
            if (!lines.length) return [];
            return [
                '',
                '【MCP 能力】以下工具由已连接的 MCP 服务提供，与内置工具同权调用，前缀 mcp__ 表示来源：',
                ...lines
            ];
        }
    }

    window.AgentMcpClient = AgentMcpClient;
    window.agentMcpClient = new AgentMcpClient({ registry: window.toolRegistry || null });
})();
