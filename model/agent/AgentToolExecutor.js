/**
 * AgentToolExecutor —— 工具执行边界。
 *
 * 传输按能力授权：插件在 manifest 里声明 network/fs/exec，内核授予后 executor 才放行。
 * A 阶段只有 http（浏览器直连）；B 阶段换成同源中继或容器，只替换 transport 实现。
 */
(function () {
    const KNOWN_CAPABILITIES = ['memory', 'network', 'fs', 'model', 'exec'];

    class AgentToolExecutor {
        constructor() {
            this.transports = new Map();
            this.granted = new Set(['memory']);
            this.register({
                id: 'http',
                capabilities: ['network'],
                run: request => this.httpFetch(request)
            });
            this.register({
                id: 'relay',
                capabilities: ['network'],
                run: request => this.relayFetch(request)
            });
        }

        register(transport = {}) {
            const id = String(transport.id || '').trim();
            if (!id) throw new Error('transport.id is required');
            if (typeof transport.run !== 'function') throw new Error(`transport ${id} 缺少 run`);
            const capabilities = Array.isArray(transport.capabilities) ? transport.capabilities.slice() : ['memory'];
            capabilities.forEach(capability => {
                if (!KNOWN_CAPABILITIES.includes(capability)) throw new Error(`transport ${id} 声明了未知能力 ${capability}`);
            });
            this.transports.set(id, { id, capabilities, run: transport.run });
            return () => this.transports.delete(id);
        }

        grant(capabilities = []) {
            capabilities.forEach(capability => {
                if (KNOWN_CAPABILITIES.includes(capability)) this.granted.add(capability);
            });
            return this;
        }

        revoke(capabilities = []) {
            capabilities.forEach(capability => {
                if (capability !== 'memory') this.granted.delete(capability);
            });
            return this;
        }

        allows(capability) {
            return this.granted.has(String(capability || ''));
        }

        async run(options = {}) {
            const transportId = String(options.transport || 'http');
            const transport = this.transports.get(transportId);
            if (!transport) throw new Error(`未知 transport: ${transportId}`);
            const capability = String(options.capability || transport.capabilities[0] || 'memory');
            if (!this.allows(capability)) throw new Error(`能力 ${capability} 未授权，插件未在 manifest 中声明`);
            return transport.run(options.request || {}, options.timeoutMs);
        }

        async httpFetch(request = {}) {
            const { url, init = {}, timeoutMs = 30000 } = request;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                return await fetch(url, { ...init, signal: controller.signal });
            } catch (error) {
                if (error?.name === 'AbortError') throw new Error(`transport http 超时 ${timeoutMs}ms`);
                throw error;
            } finally {
                clearTimeout(timer);
            }
        }

        resolveBackendBase() {
            try {
                const override = window.CIPHERTOOL_API_BASE || localStorage.getItem('CIPHERTOOL_API_BASE') || '';
                if (/^https?:\/\//i.test(override)) return override.replace(/\/+$/, '');
            } catch (error) {
                console.warn('[executor] 读取后端地址失败', error?.message || error);
            }
            return 'http://127.0.0.1:8080';
        }

        async relayFetch(request = {}) {
            const { url, init = {}, timeoutMs = 30000 } = request;
            const base = this.resolveBackendBase();
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            let response;
            try {
                response = await fetch(`${base}/api/mcp/relay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url,
                        method: init.method || 'GET',
                        headers: init.headers || {},
                        body: typeof init.body === 'string' ? init.body : null,
                        timeoutMs
                    }),
                    signal: controller.signal
                });
            } catch (error) {
                if (error?.name === 'AbortError') throw new Error(`transport relay 超时 ${timeoutMs}ms`);
                throw error;
            } finally {
                clearTimeout(timer);
            }
            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                throw new Error(`同源中继失败: ${response.status} ${String(detail).slice(0, 300)}`);
            }
            const payload = await response.json();
            if (payload && payload.success === false) {
                throw new Error(`同源中继拒绝: ${payload.message || 'unknown'}`);
            }
            const envelope = payload && payload.data ? payload.data : payload;
            const headers = new Headers();
            if (envelope.contentType) headers.set('content-type', envelope.contentType);
            if (envelope.sessionId) headers.set('Mcp-Session-Id', envelope.sessionId);
            return new Response(envelope.body || '', { status: Number(envelope.status) || 200, headers });
        }
    }

    window.AgentToolExecutor = AgentToolExecutor;
    window.agentToolExecutor = new AgentToolExecutor();
})();
