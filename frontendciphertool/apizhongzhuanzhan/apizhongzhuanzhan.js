(function () {
    const API_BASE = 'http://localhost:8080';
    const DEFAULT_STATE = {
        email: '',
        range: '7',
        granularity: 'day',
        metrics: {
            balance: 0,
            apiKeys: 0,
            requests: 0,
            spend: 0,
            standardSpend: 0,
            todayToken: 0,
            totalToken: 0,
            rpm: 0,
            tpm: 0,
            avgLatency: 0,
            inputToken: 0,
            outputToken: 0
        },
        models: [],
        usage: [],
        keys: [],
        ledger: [],
        trend: []
    };

    let state = normalizeDashboard(DEFAULT_STATE);
    let authEventsBound = false;
    let lastCreatedKey = '';

    window.initApiZhongZhuanZhan = function initApiZhongZhuanZhan() {
        const root = document.getElementById('apizz-root');
        if (!root) return;

        if (root.dataset.ready !== 'true') {
            root.dataset.ready = 'true';
            bindAuthEvents(root);
        }

        if (!isApiRouterVisible(root)) return;
        loadDashboard(root);
    };

    function bindAuthEvents(root) {
        if (authEventsBound) return;
        authEventsBound = true;
        window.addEventListener('cipher-login-success', () => {
            if (isApiRouterVisible(root)) {
                loadDashboard(root, { message: '登录成功，已加载后端 API 中转站数据' });
            }
        });
        window.addEventListener('cipher-logout-success', () => {
            if (isApiRouterVisible(root)) {
                renderLoginRequired(root);
            }
        });
    }

    function isApiRouterVisible(root) {
        const container = root.closest('#apizhongzhuanzhan-container');
        return !!container && container.style.display !== 'none';
    }

    async function loadDashboard(root, options = {}) {
        const user = getCurrentUser();
        if (!user || !user.email) {
            renderLoginRequired(root);
            return;
        }

        const nextRange = options.range || state.range || '7';
        const nextGranularity = options.granularity || state.granularity || 'day';
        if (root.dataset.loaded !== 'true') renderLoading(root);

        try {
            const url = `${API_BASE}/api/api-router/dashboard?email=${encodeURIComponent(user.email)}&range=${encodeURIComponent(nextRange)}&granularity=${encodeURIComponent(nextGranularity)}`;
            const data = await requestJson(url, {
                headers: authHeaders()
            });
            state = normalizeDashboard(data);
            render(root);
            bind(root);
            if (options.message) toast(root, options.message);
        } catch (error) {
            renderBackendError(root, error.message || '后端连接失败');
        }
    }

    async function postDashboard(root, endpoint, extra = {}) {
        const user = getCurrentUser();
        if (!user || !user.email) {
            renderLoginRequired(root);
            throw new Error('请先登录');
        }

        return requestJson(`${API_BASE}/api/api-router/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
                email: user.email,
                range: state.range || '7',
                granularity: state.granularity || 'day',
                ...extra
            })
        });
    }

    async function requestJson(url, options) {
        const response = await fetch(url, options);
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || `请求失败: ${response.status}`);
        }
        return result.data;
    }

    function renderLoginRequired(root) {
        root.dataset.loaded = 'false';
        root.innerHTML = `
            <section class="apizz-shell">
                <div class="apizz-card apizz-panel">
                    <div class="apizz-panel-title">API 中转站需要登录 <small>按登录邮箱隔离后端数据</small></div>
                    <p class="apizz-muted">请先登录或注册，再查看余额、密钥、用量和模型分发数据。</p>
                    <button id="apizz-login-btn" class="apizz-ghost-btn" type="button">登录 / 注册</button>
                </div>
            </section>
        `;
        root.querySelector('#apizz-login-btn')?.addEventListener('click', () => {
            if (window.CipherAuth && typeof window.CipherAuth.openModal === 'function') {
                window.CipherAuth.openModal();
            }
        });
    }

    function renderLoading(root) {
        root.innerHTML = `
            <section class="apizz-shell">
                <div class="apizz-card apizz-panel">
                    <div class="apizz-panel-title">正在连接 API 中转站后端</div>
                    <p class="apizz-muted">正在按当前登录邮箱加载仪表盘数据。</p>
                </div>
            </section>
        `;
    }

    function renderBackendError(root, message) {
        root.dataset.loaded = 'false';
        root.innerHTML = `
            <section class="apizz-shell">
                <div class="apizz-card apizz-panel">
                    <div class="apizz-panel-title">后端连接失败 <small>API Router</small></div>
                    <p class="apizz-muted">${escapeHtml(message)}</p>
                    <button id="apizz-retry-btn" class="apizz-ghost-btn" type="button">重试</button>
                </div>
            </section>
        `;
        root.querySelector('#apizz-retry-btn')?.addEventListener('click', () => loadDashboard(root));
    }

    function render(root) {
        root.dataset.loaded = 'true';
        const enabledKeys = state.keys.filter(item => item.status === 'Enabled').length;
        const inputToken = numberValue(state.metrics.inputToken);
        const outputToken = numberValue(state.metrics.outputToken);
        const recentUsage = Array.isArray(state.usage) ? state.usage.slice(0, 6) : [];
        const recentLedger = Array.isArray(state.ledger) ? state.ledger.slice(0, 6) : [];
        const modelRows = Array.isArray(state.models) && state.models.length
            ? state.models.map(modelRow).join('')
            : '<tr><td colspan="5" class="apizz-muted">暂无模型调用数据。</td></tr>';

        root.innerHTML = `
            <section class="apizz-shell">
                <div class="apizz-header">
                    <div>
                        <div class="module-header">
                            <h2 class="neon-title" data-text="API ROUTER">API ROUTER</h2>
                        </div>
                    </div>
                    <div class="apizz-header-actions">
                        <span class="apizz-pill">${escapeHtml(maskEmail(state.email))}</span>
                        <span class="apizz-pill">后端通道已连接</span>
                        <span class="apizz-pill">余额 $${numberValue(state.metrics.balance).toFixed(2)}</span>
                    </div>
                </div>

                <div class="apizz-console-layout">
                    <aside class="apizz-console-nav" aria-label="API 中转站导航">
                        <a href="#apizz-section-overview">概览</a>
                        <a href="#apizz-section-keys">API Keys</a>
                        <a href="#apizz-section-usage">用量</a>
                        <a href="#apizz-section-billing">账务</a>
                        <a href="#apizz-section-ops">运营</a>
                    </aside>

                    <main class="apizz-console-main">
                        <section id="apizz-section-overview" class="apizz-card apizz-command-bar">
                            <div class="apizz-filter-row">
                                <span class="apizz-muted">范围</span>
                                <select id="apizz-range" class="apizz-select">
                                    <option value="1" ${selected('1', state.range)}>近 24 小时</option>
                                    <option value="7" ${selected('7', state.range)}>近 7 天</option>
                                    <option value="30" ${selected('30', state.range)}>近 30 天</option>
                                </select>
                                <span class="apizz-muted">粒度</span>
                                <select id="apizz-granularity" class="apizz-select">
                                    <option value="hour" ${selected('hour', state.granularity)}>按小时</option>
                                    <option value="day" ${selected('day', state.granularity)}>按天</option>
                                    <option value="model" ${selected('model', state.granularity)}>按模型</option>
                                </select>
                                <button id="apizz-refresh" class="apizz-ghost-btn" type="button">刷新</button>
                            </div>
                            <div class="apizz-command-actions">
                                ${workflowButton('KEY', '创建 Key', `${enabledKeys} / ${state.metrics.apiKeys} 启用`, 'create-key')}
                                ${workflowButton('ORD', '充值订单', `$${numberValue(state.metrics.balance).toFixed(2)} 余额`, 'orders')}
                                ${workflowButton('LOG', '账务流水', `${recentLedger.length} 条最近记录`, 'usage-log')}
                                ${workflowButton('HLT', '状态健康', `${numberValue(state.metrics.avgLatency).toFixed(2)}s 平均响应`, 'gateway-status')}
                            </div>
                        </section>

                        ${createdKeyNotice()}

                        <div class="apizz-grid apizz-metric-grid apizz-metric-grid-compact">
                            ${metricCard('可用余额', `$${numberValue(state.metrics.balance).toFixed(2)}`, '钱包', 'BAL', 'green')}
                            ${metricCard('API Keys', state.metrics.apiKeys, `${enabledKeys} 启用`, 'KEY', 'blue')}
                            ${metricCard('请求量', state.metrics.requests, `近 ${escapeHtml(state.range)} 天`, 'REQ', '')}
                            ${metricCard('消费', `$${numberValue(state.metrics.spend).toFixed(4)}`, `标准 $${numberValue(state.metrics.standardSpend).toFixed(4)}`, 'USD', 'purple', 'purple')}
                            ${metricCard('Token', `${numberValue(state.metrics.todayToken).toFixed(1)}M`, `输入 ${inputToken.toFixed(1)}M / 输出 ${outputToken.toFixed(4)}M`, 'TOK', 'orange')}
                            ${metricCard('吞吐', `${state.metrics.rpm} RPM`, `${numberValue(state.metrics.tpm).toFixed(1)}K TPM`, 'TPS', 'blue')}
                        </div>

                        <div class="apizz-grid apizz-product-grid">
                            <section id="apizz-section-keys" class="apizz-card apizz-panel apizz-panel-span">
                                <div class="apizz-panel-title">API Keys <small>${enabledKeys} enabled</small></div>
                                <div class="apizz-table-wrap">
                                    <table class="apizz-table">
                                        <thead><tr><th>名称</th><th>密钥</th><th>状态</th><th>额度</th><th>已用</th><th>RPM</th><th>TPM</th><th>最后使用</th><th>操作</th></tr></thead>
                                        <tbody>${state.keys.length ? state.keys.map(keyRow).join('') : emptyKeyRow()}</tbody>
                                    </table>
                                </div>
                            </section>

                            <section id="apizz-section-usage" class="apizz-card apizz-panel">
                                <div class="apizz-panel-title">用量趋势 <small>Token</small></div>
                                <div class="apizz-legend">
                                    <span style="color:#3b82f6"><i class="apizz-dot"></i>Input</span>
                                    <span style="color:#2eccbf"><i class="apizz-dot"></i>Output</span>
                                    <span style="color:#ffd27b"><i class="apizz-dot"></i>Cache Creation</span>
                                    <span style="color:#b388ff"><i class="apizz-dot"></i>Hit Rate</span>
                                </div>
                                <div class="apizz-chart">${chartSvg()}</div>
                            </section>

                            <section id="apizz-section-billing" class="apizz-card apizz-panel">
                                <div class="apizz-panel-title">账务 <small>Wallet</small></div>
                                <div class="apizz-billing-summary">
                                    <div>
                                        <div class="apizz-label">余额</div>
                                        <div class="apizz-billing-balance">$${numberValue(state.metrics.balance).toFixed(4)}</div>
                                    </div>
                                    <button class="apizz-ghost-btn apizz-action apizz-mini-action" type="button" data-action="orders">充值</button>
                                </div>
                                <div class="apizz-ledger-list">${ledgerRows(recentLedger)}</div>
                            </section>

                            <section class="apizz-card apizz-panel">
                                <div class="apizz-panel-title">最近调用 <small>${recentUsage.length} records</small></div>
                                <div class="apizz-usage-list">${recentUsage.length ? recentUsage.map(usageItem).join('') : emptyUsageList()}</div>
                            </section>

                            <section id="apizz-section-ops" class="apizz-card apizz-panel">
                                <div class="apizz-panel-title">运营入口 <small>Ops</small></div>
                                <div class="apizz-action-list apizz-action-list-compact">
                                    ${actionButton('PAY', '兑换码', '余额活动码', 'redeem-code')}
                                    ${actionButton('REC', '支付对账', '订单和回调异常', 'payment-reconciliation')}
                                    ${actionButton('CFG', '路由规则', '上游渠道', 'route-config')}
                                    ${actionButton('USD', '模型价格', '销售价和成本', 'model-prices')}
                                    ${actionButton('ADM', '管理后台', '用户与审计', 'admin-console')}
                                </div>
                            </section>

                            <section class="apizz-card apizz-panel apizz-panel-span">
                                <div class="apizz-panel-title">模型分布 <small>Requests / Spend</small></div>
                                <div class="apizz-donut-wrap apizz-donut-wrap-compact">
                                    <div class="apizz-donut" aria-hidden="true" style="${donutGradient()}"></div>
                                    <div class="apizz-table-wrap">
                                        <table class="apizz-table">
                                            <thead><tr><th>模型</th><th>请求</th><th>Token</th><th>实际</th><th>标准</th></tr></thead>
                                            <tbody>${modelRows}</tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </main>
                </div>
            </section>
            <div id="apizz-toast" class="apizz-toast"></div>
        `;
    }

    function bind(root) {
        root.querySelector('#apizz-range')?.addEventListener('change', event => {
            loadDashboard(root, {
                range: event.target.value,
                message: `已从后端切换到近 ${event.target.value === '1' ? '24 小时' : event.target.value + ' 天'}`
            });
        });

        root.querySelector('#apizz-granularity')?.addEventListener('change', event => {
            loadDashboard(root, {
                granularity: event.target.value,
                message: `粒度已切换为 ${event.target.selectedOptions[0].textContent}`
            });
        });

        root.querySelector('#apizz-refresh')?.addEventListener('click', async () => {
            try {
                const data = await postDashboard(root, 'refresh');
                state = normalizeDashboard(data);
                render(root);
                bind(root);
                toast(root, '后端仪表盘数据已刷新');
            } catch (error) {
                toast(root, error.message || '刷新失败');
            }
        });

        root.querySelectorAll('.apizz-action').forEach(button => {
            button.addEventListener('click', () => handleAction(root, button.dataset.action));
        });

        root.querySelectorAll('.apizz-key-action').forEach(button => {
            button.addEventListener('click', () => handleKeyAction(root, button.dataset.keyAction, button.dataset.keyId));
        });

        root.querySelector('#apizz-copy-key')?.addEventListener('click', async () => {
            const input = root.querySelector('#apizz-created-key');
            if (!input) return;
            try {
                await navigator.clipboard.writeText(input.value);
                toast(root, '已复制新密钥');
            } catch (error) {
                input.select();
                toast(root, '已选中新密钥，请手动复制');
            }
        });
    }

    async function handleAction(root, action) {
        if (action === 'create-key') {
            try {
                const nextName = `router-key-${state.keys.length + 1}`;
                const data = await postDashboard(root, 'keys', { name: nextName, quota: '1,000,000 tokens' });
                lastCreatedKey = data.plainKey || '';
                state = normalizeDashboard(data.dashboard);
                render(root);
                bind(root);
                toast(root, `已在后端创建 ${nextName}`);
            } catch (error) {
                toast(root, error.message || '创建密钥失败');
            }
            return;
        }

        if (action === 'usage-log') {
            try {
                const ledger = await requestJson(`${API_BASE}/api/api-router/ledger?limit=80`, { headers: authHeaders() });
                openLedgerModal(ledger);
            } catch (error) {
                toast(root, error.message || '账务流水加载失败');
            }
            return;
        }

        if (action === 'redeem-code') {
            openRedeemModal(root);
            return;
        }

        if (action === 'orders') {
            openOrderModal(root);
            return;
        }

        if (action === 'payment-reconciliation') {
            try {
                const reconciliation = await loadPaymentReconciliation();
                openReconciliationModal(root, reconciliation);
            } catch (error) {
                toast(root, error.message || '支付对账加载失败');
            }
            return;
        }

        if (action === 'gateway-status') {
            try {
                const status = await loadGatewayStatus();
                openStatusModal(root, status);
            } catch (error) {
                toast(root, error.message || '状态健康加载失败');
            }
            return;
        }

        if (action === 'model-prices') {
            try {
                const prices = await requestJson(`${API_BASE}/api/api-router/model-prices`, { headers: authHeaders() });
                openModelPriceModal(root, prices);
            } catch (error) {
                toast(root, error.message || '模型价格加载失败');
            }
            return;
        }

        if (action === 'route-config') {
            try {
                const channels = await requestJson(`${API_BASE}/api/api-router/channels`, { headers: authHeaders() });
                openChannelModal(root, channels);
            } catch (error) {
                toast(root, error.message || '渠道配置加载失败');
            }
            return;
        }

        if (action === 'admin-console') {
            try {
                const overview = await loadAdminOverview();
                openAdminModal(root, overview);
            } catch (error) {
                toast(root, error.message || '管理后台加载失败');
            }
            return;
        }

        toast(root, '功能入口已就绪');
    }

    async function handleKeyAction(root, action, keyId) {
        if (!keyId) return;

        if (action === 'edit') {
            const keyInfo = state.keys.find(k => k.id === keyId);
            if (keyInfo) openEditModal(root, keyInfo);
            return;
        }

        try {
            const payload = { keyId };
            let endpoint = 'keys/status';
            if (action === 'enable') {
                payload.status = 'Enabled';
            } else if (action === 'pause') {
                payload.status = 'Paused';
            } else if (action === 'delete') {
                if (!confirm('确定要删除这个 API 密钥吗？删除后不会再出现在列表中。')) return;
                endpoint = 'keys/delete';
            } else {
                return;
            }

            const data = await postDashboard(root, endpoint, payload);
            lastCreatedKey = '';
            state = normalizeDashboard(data);
            render(root);
            bind(root);
            toast(root, '密钥状态已更新');
        } catch (error) {
            toast(root, error.message || '密钥操作失败');
        }
    }

    function openEditModal(root, keyInfo) {
        closeEditModal();
        const rpmDisplay = numberValue(keyInfo.keyRpm) || '';
        const tpmDisplay = numberValue(keyInfo.keyTpm) || '';
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal">
                <div class="apizz-modal-title">编辑密钥配置 <small>${escapeHtml(keyInfo.mask)}</small></div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">名称</label>
                    <input id="apizz-cfg-name" class="apizz-form-input" type="text" value="${escapeHtml(keyInfo.name)}" placeholder="key 名称">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">Token 配额</label>
                    <input id="apizz-cfg-quota" class="apizz-form-input" type="text" value="${escapeHtml(keyInfo.quota)}" placeholder="如 1,000,000 tokens 或 $10.00">
                    <div class="apizz-form-hint">支持 tokens 和 $ 两种格式，留空保持不变</div>
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">每分钟请求限制 (RPM)</label>
                    <input id="apizz-cfg-rpm" class="apizz-form-input" type="number" min="0" value="${escapeHtml(rpmDisplay)}" placeholder="0 = 使用全局默认">
                    <div class="apizz-form-hint">0 或留空表示使用全局默认值</div>
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">每分钟 Token 限制 (TPM)</label>
                    <input id="apizz-cfg-tpm" class="apizz-form-input" type="number" min="0" value="${escapeHtml(tpmDisplay)}" placeholder="0 = 使用全局默认">
                    <div class="apizz-form-hint">0 或留空表示使用全局默认值</div>
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-cfg-cancel" class="apizz-ghost-btn" type="button">取消</button>
                    <button id="apizz-cfg-save" class="apizz-primary-btn" type="button">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#apizz-cfg-cancel').addEventListener('click', closeEditModal);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
        overlay.querySelector('#apizz-cfg-save').addEventListener('click', async () => {
            await handleKeyConfig(root, keyInfo.id);
        });
    }

    function closeEditModal() {
        const overlay = document.getElementById('apizz-modal-overlay');
        if (overlay) overlay.remove();
    }

    async function handleKeyConfig(root, keyId) {
        const nameInput = document.getElementById('apizz-cfg-name');
        const quotaInput = document.getElementById('apizz-cfg-quota');
        const rpmInput = document.getElementById('apizz-cfg-rpm');
        const tpmInput = document.getElementById('apizz-cfg-tpm');

        const payload = { keyId };
        if (nameInput && nameInput.value.trim()) payload.name = nameInput.value.trim();
        if (quotaInput && quotaInput.value.trim()) payload.quota = quotaInput.value.trim();
        if (rpmInput && rpmInput.value !== '') payload.keyRpm = parseInt(rpmInput.value, 10) || 0;
        if (tpmInput && tpmInput.value !== '') payload.keyTpm = parseInt(tpmInput.value, 10) || 0;

        try {
            const data = await postDashboard(root, 'keys/config', payload);
            closeEditModal();
            lastCreatedKey = '';
            state = normalizeDashboard(data);
            render(root);
            bind(root);
            toast(root, '密钥配置已更新');
        } catch (error) {
            toast(root, error.message || '密钥配置更新失败');
        }
    }

    function openLedgerModal(ledger) {
        closeEditModal();
        const rows = Array.isArray(ledger) && ledger.length
            ? ledger.map(item => `
                <tr>
                    <td>${escapeHtml(item.type)}</td>
                    <td class="${numberValue(item.amount) >= 0 ? 'apizz-positive' : ''}">${numberValue(item.amount).toFixed(4)}</td>
                    <td>${numberValue(item.balanceAfter).toFixed(4)}</td>
                    <td>${escapeHtml(item.description)}</td>
                    <td class="apizz-muted">${escapeHtml(item.createdAt)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" class="apizz-muted">暂无账务流水</td></tr>';
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal">
                <div class="apizz-modal-title">账务流水 <small>充值、预授权、扣费、释放</small></div>
                <div class="apizz-table-wrap">
                    <table class="apizz-table">
                        <thead><tr><th>类型</th><th>金额</th><th>余额</th><th>说明</th><th>时间</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-modal-close" class="apizz-ghost-btn" type="button">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#apizz-modal-close').addEventListener('click', closeEditModal);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
    }

    async function loadAdminOverview(query = '') {
        const params = new URLSearchParams({
            userLimit: '100',
            auditLimit: '100',
            query: query || ''
        });
        return requestJson(`${API_BASE}/api/api-router/admin/overview?${params.toString()}`, {
            headers: authHeaders()
        });
    }

    function openAdminModal(root, overview, query = '') {
        closeEditModal();
        const data = overview || {};
        const users = Array.isArray(data.users) ? data.users : [];
        const audits = Array.isArray(data.audits) ? data.audits : [];
        const frozenUsers = users.filter(item => item && item.frozen).length;
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal apizz-modal-xwide">
                <div class="apizz-modal-title">管理后台 <small>${escapeHtml(data.generatedAt || '-')}</small></div>
                <div class="apizz-status-summary">
                    ${statusTile('用户数', users.length, '已纳入中转站数据', '')}
                    ${statusTile('总余额', `$${adminTotal(users, 'balance').toFixed(2)}`, '钱包余额合计', 'healthy')}
                    ${statusTile('总请求', adminTotal(users, 'requests').toFixed(0), '全部用户请求', '')}
                    ${statusTile('冻结用户', frozenUsers, '当前筛选范围', frozenUsers ? 'unhealthy' : '')}
                </div>
                <div class="apizz-admin-section">
                    <div class="apizz-admin-toolbar">
                        <div class="apizz-panel-title">用户概览 <small>余额、密钥、订单和活跃度</small></div>
                        <div class="apizz-filter-row">
                            <input id="apizz-admin-search" class="apizz-form-input apizz-admin-search" type="search" value="${escapeHtml(query)}" placeholder="搜索邮箱">
                            <button id="apizz-admin-search-btn" class="apizz-ghost-btn" type="button">搜索</button>
                        </div>
                    </div>
                    <div class="apizz-table-wrap">
                        <table class="apizz-table apizz-admin-table">
                            <thead><tr><th>邮箱</th><th>状态</th><th>余额</th><th>密钥</th><th>请求</th><th>消费</th><th>订单</th><th>最近活动</th><th>操作</th></tr></thead>
                            <tbody id="apizz-admin-users">${adminUserRows(users)}</tbody>
                        </table>
                    </div>
                </div>
                <div class="apizz-admin-section">
                    <div class="apizz-panel-title">管理员审计 <small>最近 ${audits.length} 条</small></div>
                    <div class="apizz-table-wrap">
                        <table class="apizz-table apizz-admin-table">
                            <thead><tr><th>时间</th><th>操作者</th><th>动作</th><th>目标</th><th>目标邮箱</th><th>详情</th></tr></thead>
                            <tbody id="apizz-admin-audits">${adminAuditRows(audits)}</tbody>
                        </table>
                    </div>
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-admin-refresh" class="apizz-ghost-btn" type="button">刷新</button>
                    <button id="apizz-admin-close" class="apizz-primary-btn" type="button">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#apizz-admin-close').addEventListener('click', closeEditModal);
        overlay.querySelector('#apizz-admin-refresh').addEventListener('click', async () => {
            try {
                const nextQuery = overlay.querySelector('#apizz-admin-search')?.value.trim() || '';
                const next = await loadAdminOverview(nextQuery);
                closeEditModal();
                openAdminModal(root, next, nextQuery);
                toast(root, '管理后台已刷新');
            } catch (error) {
                toast(root, error.message || '管理后台刷新失败');
            }
        });
        overlay.querySelector('#apizz-admin-search-btn').addEventListener('click', async () => {
            await refreshAdminModal(root, overlay);
        });
        overlay.querySelector('#apizz-admin-search').addEventListener('keydown', async event => {
            if (event.key === 'Enter') {
                await refreshAdminModal(root, overlay);
            }
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
        bindAdminUserActions(root, overlay);
    }

    async function refreshAdminModal(root, overlay) {
        try {
            const query = overlay.querySelector('#apizz-admin-search')?.value.trim() || '';
            const next = await loadAdminOverview(query);
            closeEditModal();
            openAdminModal(root, next, query);
            toast(root, '管理后台已刷新');
        } catch (error) {
            toast(root, error.message || '管理后台刷新失败');
        }
    }

    function bindAdminUserActions(root, overlay) {
        overlay.querySelectorAll('.apizz-admin-user-action').forEach(button => {
            button.addEventListener('click', async () => {
                const action = button.dataset.userAction;
                const targetEmail = button.dataset.email;
                const query = overlay.querySelector('#apizz-admin-search')?.value.trim() || '';
                let reason = '';
                let frozen = null;
                let disableKeys = false;

                if (action === 'freeze') {
                    const input = window.prompt('冻结原因', 'risk control');
                    if (input === null) return;
                    reason = input.trim();
                    frozen = true;
                } else if (action === 'unfreeze') {
                    frozen = false;
                    reason = 'unfreeze';
                } else if (action === 'pause-keys') {
                    disableKeys = true;
                    reason = 'pause user keys';
                }

                try {
                    const next = await requestJson(`${API_BASE}/api/api-router/admin/users/control`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify({ targetEmail, frozen, disableKeys, reason, userLimit: 100, auditLimit: 100, query })
                    });
                    closeEditModal();
                    openAdminModal(root, next, query);
                    toast(root, '用户治理操作已写入审计');
                } catch (error) {
                    toast(root, error.message || '用户治理操作失败');
                }
            });
        });
    }

    function adminTotal(users, field) {
        return users.reduce((sum, item) => sum + numberValue(item && item[field]), 0);
    }

    function adminUserRows(users) {
        if (!Array.isArray(users) || !users.length) {
            return '<tr><td colspan="9" class="apizz-muted">暂无用户数据。</td></tr>';
        }
        return users.map(item => `
            <tr>
                <td>${escapeHtml(item.email || '-')}</td>
                <td>${adminUserStatus(item)}</td>
                <td class="apizz-positive">$${numberValue(item.balance).toFixed(4)}</td>
                <td>${numberValue(item.enabledApiKeys)} / ${numberValue(item.apiKeys)}</td>
                <td>${numberValue(item.requests)}</td>
                <td>$${numberValue(item.spend).toFixed(4)}</td>
                <td>${numberValue(item.pendingOrders)} 待 / ${numberValue(item.paidOrders)} 已付</td>
                <td class="apizz-muted">${escapeHtml(item.lastActivity || '-')}</td>
                <td>
                    <div class="apizz-key-actions">
                        <button class="apizz-key-action apizz-admin-user-action" type="button" data-user-action="${item.frozen ? 'unfreeze' : 'freeze'}" data-email="${escapeHtml(item.email || '')}">${item.frozen ? '解冻' : '冻结'}</button>
                        <button class="apizz-key-action danger apizz-admin-user-action" type="button" data-user-action="pause-keys" data-email="${escapeHtml(item.email || '')}">停用 Key</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function adminUserStatus(item) {
        if (item && item.frozen) {
            return `<span class="apizz-status-pill unhealthy">冻结</span>${item.frozenReason ? `<div class="apizz-muted">${escapeHtml(item.frozenReason)}</div>` : ''}`;
        }
        return '<span class="apizz-status-pill healthy">正常</span>';
    }

    function adminAuditRows(audits) {
        if (!Array.isArray(audits) || !audits.length) {
            return '<tr><td colspan="6" class="apizz-muted">暂无管理员审计记录。</td></tr>';
        }
        return audits.map(item => `
            <tr>
                <td class="apizz-muted">${escapeHtml(item.createdAt || '-')}</td>
                <td>${escapeHtml(item.operatorEmail || '-')}</td>
                <td>${escapeHtml(item.action || '-')}</td>
                <td>${escapeHtml(item.targetType || '-')}${item.targetId ? `<div class="apizz-muted">${escapeHtml(shortId(item.targetId))}</div>` : ''}</td>
                <td>${escapeHtml(item.targetEmail || '-')}</td>
                <td>${escapeHtml(item.detail || '')}</td>
            </tr>
        `).join('');
    }

    function openCreditModal(root) {
        closeEditModal();
        const user = getCurrentUser();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal">
                <div class="apizz-modal-title">运营充值 / 赠送 <small>需要管理员权限</small></div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">目标邮箱</label>
                    <input id="apizz-credit-email" class="apizz-form-input" type="email" value="${escapeHtml(user?.email || '')}">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">金额</label>
                    <input id="apizz-credit-amount" class="apizz-form-input" type="number" min="0.0001" step="0.0001" value="1">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">说明</label>
                    <input id="apizz-credit-desc" class="apizz-form-input" type="text" value="Manual credit">
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-credit-cancel" class="apizz-ghost-btn" type="button">取消</button>
                    <button id="apizz-credit-save" class="apizz-primary-btn" type="button">写入</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#apizz-credit-cancel').addEventListener('click', closeEditModal);
        overlay.querySelector('#apizz-credit-save').addEventListener('click', async () => {
            try {
                const data = await postDashboard(root, 'wallet/credit', {
                    targetEmail: document.getElementById('apizz-credit-email').value.trim(),
                    amount: Number(document.getElementById('apizz-credit-amount').value),
                    description: document.getElementById('apizz-credit-desc').value.trim()
                });
                closeEditModal();
                state = normalizeDashboard(data);
                render(root);
                bind(root);
                toast(root, '余额已写入账务流水');
            } catch (error) {
                toast(root, error.message || '充值写入失败');
            }
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
    }

    function openRedeemModal(root) {
        closeEditModal();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal">
                <div class="apizz-modal-title">兑换码 <small>用户兑换 / 管理员生成</small></div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">兑换码</label>
                    <input id="apizz-redeem-code" class="apizz-form-input" type="text" placeholder="PZM-XXXX-XXXX-XXXX">
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-redeem-close" class="apizz-ghost-btn" type="button">关闭</button>
                    <button id="apizz-redeem-apply" class="apizz-primary-btn" type="button">兑换</button>
                </div>

                <div class="apizz-modal-title">生成兑换码 <small>需要管理员权限</small></div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">指定代码</label>
                    <input id="apizz-code-code" class="apizz-form-input" type="text" placeholder="留空自动生成">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">金额</label>
                    <input id="apizz-code-amount" class="apizz-form-input" type="number" min="0.0001" step="0.0001" value="1">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">可用次数</label>
                    <input id="apizz-code-max" class="apizz-form-input" type="number" min="1" value="1">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">过期时间</label>
                    <input id="apizz-code-expire" class="apizz-form-input" type="text" placeholder="yyyy-MM-ddTHH:mm:ss，留空不过期">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">备注</label>
                    <input id="apizz-code-note" class="apizz-form-input" type="text" placeholder="V2EX launch campaign">
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-code-refresh" class="apizz-ghost-btn" type="button">刷新列表</button>
                    <button id="apizz-code-create" class="apizz-primary-btn" type="button">生成</button>
                </div>
                <div class="apizz-table-wrap">
                    <table class="apizz-table">
                        <thead><tr><th>兑换码</th><th>金额</th><th>次数</th><th>状态</th><th>过期</th><th>操作</th></tr></thead>
                        <tbody id="apizz-code-rows"><tr><td colspan="6" class="apizz-muted">管理员可刷新查看兑换码列表。</td></tr></tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        bindRedeemModal(root, overlay);
        refreshRedeemCodes(root, overlay, false);
    }

    function bindRedeemModal(root, overlay) {
        overlay.querySelector('#apizz-redeem-close').addEventListener('click', closeEditModal);
        overlay.querySelector('#apizz-redeem-apply').addEventListener('click', async () => {
            const code = document.getElementById('apizz-redeem-code').value.trim();
            if (!code) {
                toast(root, '请输入兑换码');
                return;
            }
            try {
                const data = await postDashboard(root, 'redeem', { code });
                closeEditModal();
                state = normalizeDashboard(data);
                render(root);
                bind(root);
                toast(root, '兑换成功，余额已更新');
            } catch (error) {
                toast(root, error.message || '兑换失败');
            }
        });
        overlay.querySelector('#apizz-code-refresh').addEventListener('click', () => refreshRedeemCodes(root, overlay, true));
        overlay.querySelector('#apizz-code-create').addEventListener('click', async () => {
            try {
                const codes = await requestJson(`${API_BASE}/api/api-router/redeem-codes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({
                        code: document.getElementById('apizz-code-code').value.trim(),
                        amount: Number(document.getElementById('apizz-code-amount').value),
                        maxUses: parseInt(document.getElementById('apizz-code-max').value, 10) || 1,
                        expiresAt: document.getElementById('apizz-code-expire').value.trim(),
                        note: document.getElementById('apizz-code-note').value.trim(),
                        enabled: true
                    })
                });
                overlay.querySelector('#apizz-code-rows').innerHTML = redeemCodeRows(codes);
                bindRedeemCodeActions(root, overlay);
                toast(root, '兑换码已生成');
            } catch (error) {
                toast(root, error.message || '兑换码生成失败');
            }
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
    }

    async function refreshRedeemCodes(root, overlay, showError) {
        try {
            const codes = await requestJson(`${API_BASE}/api/api-router/redeem-codes`, { headers: authHeaders() });
            overlay.querySelector('#apizz-code-rows').innerHTML = redeemCodeRows(codes);
            bindRedeemCodeActions(root, overlay);
        } catch (error) {
            overlay.querySelector('#apizz-code-rows').innerHTML = '<tr><td colspan="6" class="apizz-muted">无管理员权限或未配置 API_ROUTER_ADMIN_EMAILS。</td></tr>';
            if (showError) toast(root, error.message || '兑换码列表加载失败');
        }
    }

    function bindRedeemCodeActions(root, overlay) {
        overlay.querySelectorAll('.apizz-redeem-code-action').forEach(button => {
            button.addEventListener('click', async () => {
                try {
                    const code = button.dataset.code;
                    const enabled = button.dataset.action === 'enable';
                    const codes = await requestJson(`${API_BASE}/api/api-router/redeem-codes/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify({ code, enabled })
                    });
                    overlay.querySelector('#apizz-code-rows').innerHTML = redeemCodeRows(codes);
                    bindRedeemCodeActions(root, overlay);
                    toast(root, '兑换码状态已更新');
                } catch (error) {
                    toast(root, error.message || '兑换码操作失败');
                }
            });
        });
    }

    function redeemCodeRows(codes) {
        if (!Array.isArray(codes) || !codes.length) {
            return '<tr><td colspan="6" class="apizz-muted">暂无兑换码。</td></tr>';
        }
        return codes.map(item => {
            const action = item.enabled ? 'disable' : 'enable';
            const actionText = item.enabled ? '停用' : '启用';
            return `
                <tr>
                    <td>${escapeHtml(item.code)}<div class="apizz-muted">${escapeHtml(item.note || '')}</div></td>
                    <td>${numberValue(item.amount).toFixed(4)}</td>
                    <td>${escapeHtml(item.usedCount)} / ${escapeHtml(item.maxUses)}</td>
                    <td>${item.enabled ? '启用' : '停用'}</td>
                    <td class="apizz-muted">${escapeHtml(item.expiresAt || '不过期')}</td>
                    <td><button class="apizz-key-action apizz-redeem-code-action" type="button" data-action="${action}" data-code="${escapeHtml(item.code)}">${actionText}</button></td>
                </tr>
            `;
        }).join('');
    }

    function openOrderModal(root) {
        closeEditModal();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal">
                <div class="apizz-modal-title">充值订单 <small>收银台参数和回调入账</small></div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">金额</label>
                    <input id="apizz-order-amount" class="apizz-form-input" type="number" min="0.0001" step="0.0001" value="10">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">支付方式</label>
                    <select id="apizz-order-method" class="apizz-form-input">
                        <option value="manual">手动确认</option>
                        <option value="alipay">支付宝</option>
                        <option value="wechat">微信支付</option>
                        <option value="stripe">Stripe</option>
                    </select>
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">备注</label>
                    <input id="apizz-order-note" class="apizz-form-input" type="text" placeholder="充值备注">
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-order-close" class="apizz-ghost-btn" type="button">关闭</button>
                    <button id="apizz-order-refresh" class="apizz-ghost-btn" type="button">刷新</button>
                    <button id="apizz-order-admin" class="apizz-ghost-btn" type="button">管理员列表</button>
                    <button id="apizz-order-create" class="apizz-primary-btn" type="button">创建订单</button>
                </div>
                <div id="apizz-order-payment" class="apizz-payment-box"></div>
                <div class="apizz-table-wrap">
                    <table class="apizz-table">
                        <thead><tr><th>订单</th><th>邮箱</th><th>金额</th><th>方式</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
                        <tbody id="apizz-order-rows"><tr><td colspan="7" class="apizz-muted">正在加载订单。</td></tr></tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        bindOrderModal(root, overlay);
        refreshOrders(root, overlay, false, false);
    }

    function bindOrderModal(root, overlay) {
        overlay.querySelector('#apizz-order-close').addEventListener('click', closeEditModal);
        overlay.querySelector('#apizz-order-refresh').addEventListener('click', () => refreshOrders(root, overlay, false, true));
        overlay.querySelector('#apizz-order-admin').addEventListener('click', () => refreshOrders(root, overlay, true, true));
        overlay.querySelector('#apizz-order-create').addEventListener('click', async () => {
            try {
                const order = await requestJson(`${API_BASE}/api/api-router/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({
                        amount: Number(document.getElementById('apizz-order-amount').value),
                        payMethod: document.getElementById('apizz-order-method').value,
                        idempotencyKey: `order-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        note: document.getElementById('apizz-order-note').value.trim()
                    })
                });
                overlay.querySelector('#apizz-order-payment').innerHTML = paymentBox(order);
                await refreshOrders(root, overlay, false, false);
                toast(root, order.checkoutUrl ? '订单已创建，请打开收银台支付' : '订单已创建，请按支付说明处理');
            } catch (error) {
                toast(root, error.message || '订单创建失败');
            }
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
    }

    async function refreshOrders(root, overlay, admin, showError) {
        try {
            overlay.dataset.adminOrders = admin ? 'true' : 'false';
            const orders = await requestJson(`${API_BASE}/api/api-router/orders?admin=${admin ? 'true' : 'false'}`, { headers: authHeaders() });
            overlay.querySelector('#apizz-order-rows').innerHTML = orderRows(orders, admin);
            bindOrderActions(root, overlay);
        } catch (error) {
            overlay.querySelector('#apizz-order-rows').innerHTML = '<tr><td colspan="7" class="apizz-muted">订单加载失败或无管理员权限。</td></tr>';
            if (showError) toast(root, error.message || '订单加载失败');
        }
    }

    function bindOrderActions(root, overlay) {
        overlay.querySelectorAll('.apizz-order-action').forEach(button => {
            button.addEventListener('click', async () => {
                try {
                    const status = button.dataset.status;
                    const orderId = button.dataset.orderId;
                    const orders = await requestJson(`${API_BASE}/api/api-router/orders/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify({
                            orderId,
                            status,
                            externalTradeNo: '',
                            note: status === 'PAID' ? 'Manual confirmed' : 'Manual cancelled'
                        })
                    });
                    overlay.querySelector('#apizz-order-rows').innerHTML = orderRows(orders, true);
                    bindOrderActions(root, overlay);
                    await loadDashboard(root, { message: '订单状态已更新' });
                } catch (error) {
                    toast(root, error.message || '订单操作失败');
                }
            });
        });
    }

    function orderRows(orders, admin) {
        if (!Array.isArray(orders) || !orders.length) {
            return '<tr><td colspan="7" class="apizz-muted">暂无订单。</td></tr>';
        }
        return orders.map(item => {
            const actions = admin && item.status === 'PENDING'
                ? `<button class="apizz-key-action apizz-order-action" type="button" data-status="PAID" data-order-id="${escapeHtml(item.id)}">确认</button>
                   <button class="apizz-key-action danger apizz-order-action" type="button" data-status="CANCELLED" data-order-id="${escapeHtml(item.id)}">取消</button>`
                : '<span class="apizz-muted">-</span>';
            return `
                <tr>
                    <td>${escapeHtml(shortId(item.id))}<div class="apizz-muted">${escapeHtml(item.note || item.paymentInstructions || '')}</div>${orderPayLink(item)}</td>
                    <td>${escapeHtml(maskEmail(item.email || ''))}</td>
                    <td>${numberValue(item.amount).toFixed(4)}</td>
                    <td>${escapeHtml(item.payMethod)}</td>
                    <td>${escapeHtml(item.status)}</td>
                    <td class="apizz-muted">${escapeHtml(item.createdAt)}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    }

    function paymentBox(order) {
        if (!order) return '';
        const link = order.checkoutUrl
            ? `<a class="apizz-payment-link" href="${escapeHtml(order.checkoutUrl)}" target="_blank" rel="noopener">打开收银台</a>`
            : '';
        return `
            <div class="apizz-payment-card">
                <div>
                    <div class="apizz-panel-title">支付信息 <small>${escapeHtml(shortId(order.id))}</small></div>
                    <div class="apizz-muted">${escapeHtml(order.paymentInstructions || '订单已创建，等待支付确认。')}</div>
                    <div class="apizz-muted">过期时间: ${escapeHtml(order.paymentExpiresAt || '-')}</div>
                </div>
                ${link}
            </div>
        `;
    }

    function orderPayLink(order) {
        if (!order || !order.checkoutUrl || order.status !== 'PENDING') return '';
        return `<div><a class="apizz-inline-link" href="${escapeHtml(order.checkoutUrl)}" target="_blank" rel="noopener">收银台</a></div>`;
    }

    async function loadPaymentReconciliation(limit = 120) {
        return requestJson(`${API_BASE}/api/api-router/admin/reconciliation?limit=${encodeURIComponent(limit)}`, {
            headers: authHeaders()
        });
    }

    function openReconciliationModal(root, reconciliation) {
        closeEditModal();
        const data = reconciliation || {};
        const summary = data.summary || {};
        const issues = Array.isArray(data.issues) ? data.issues : [];
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal apizz-modal-xwide">
                <div class="apizz-modal-title">支付对账 <small>${escapeHtml(summary.generatedAt || '-')}</small></div>
                <div class="apizz-status-summary">
                    ${statusTile('未处理异常', numberValue(summary.openIssues), '当前对账问题', numberValue(summary.openIssues) ? 'degraded' : 'healthy')}
                    ${statusTile('阻断问题', numberValue(summary.blockerIssues), '金额、流水或入账异常', numberValue(summary.blockerIssues) ? 'unhealthy' : 'healthy')}
                    ${statusTile('回调失败', numberValue(summary.failedCallbacks), '未成功入账的回调', numberValue(summary.failedCallbacks) ? 'degraded' : 'healthy')}
                    ${statusTile('重放回调', numberValue(summary.replayCallbacks), '重复 nonce 拦截', numberValue(summary.replayCallbacks) ? 'unhealthy' : 'healthy')}
                </div>
                <div class="apizz-admin-section">
                    <div class="apizz-panel-title">异常明细 <small>过期订单、失败回调、重复流水和缺失入账</small></div>
                    <div class="apizz-table-wrap">
                        <table class="apizz-table apizz-admin-table">
                            <thead><tr><th>等级</th><th>类型</th><th>订单</th><th>邮箱</th><th>金额</th><th>流水</th><th>信息</th><th>时间</th><th>操作</th></tr></thead>
                            <tbody id="apizz-reconcile-rows">${reconciliationRows(issues)}</tbody>
                        </table>
                    </div>
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-reconcile-refresh" class="apizz-ghost-btn" type="button">刷新</button>
                    <button id="apizz-reconcile-close" class="apizz-primary-btn" type="button">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#apizz-reconcile-close').addEventListener('click', closeEditModal);
        overlay.querySelector('#apizz-reconcile-refresh').addEventListener('click', async () => {
            try {
                const next = await loadPaymentReconciliation();
                closeEditModal();
                openReconciliationModal(root, next);
                toast(root, '支付对账已刷新');
            } catch (error) {
                toast(root, error.message || '支付对账刷新失败');
            }
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
        bindReconciliationActions(root, overlay);
    }

    function bindReconciliationActions(root, overlay) {
        overlay.querySelectorAll('.apizz-reconcile-action').forEach(button => {
            button.addEventListener('click', async () => {
                const issueId = button.dataset.issueId;
                const input = window.prompt('处理备注', '已人工核对');
                if (input === null) return;
                try {
                    const next = await requestJson(`${API_BASE}/api/api-router/admin/reconciliation/resolve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify({ issueId, note: input.trim(), limit: 120 })
                    });
                    closeEditModal();
                    openReconciliationModal(root, next);
                    toast(root, '对账问题已标记处理');
                } catch (error) {
                    toast(root, error.message || '对账问题处理失败');
                }
            });
        });
    }

    function reconciliationRows(issues) {
        if (!Array.isArray(issues) || !issues.length) {
            return '<tr><td colspan="9" class="apizz-muted">暂无未处理支付异常。</td></tr>';
        }
        return issues.map(item => {
            const issueId = escapeHtml(item.id || '');
            const orderId = item.orderId || '';
            const action = issueId
                ? `<button class="apizz-key-action apizz-reconcile-action" type="button" data-issue-id="${issueId}">已处理</button>`
                : '<span class="apizz-muted">-</span>';
            const callbackAmount = numberValue(item.callbackAmount);
            const amountText = callbackAmount > 0
                ? `${numberValue(item.orderAmount).toFixed(4)} / ${callbackAmount.toFixed(4)}`
                : numberValue(item.orderAmount).toFixed(4);
            return `
                <tr>
                    <td>${reconciliationSeverity(item.severity)}</td>
                    <td>${escapeHtml(reconciliationIssueLabel(item.issueType))}<div class="apizz-muted">${escapeHtml(item.issueType || '')}</div></td>
                    <td>${orderId ? escapeHtml(shortId(orderId)) : '-'}</td>
                    <td>${escapeHtml(maskEmail(item.email || ''))}</td>
                    <td>${escapeHtml(amountText)}</td>
                    <td>${escapeHtml(item.externalTradeNo || '-')}<div class="apizz-muted">${escapeHtml(item.payMethod || '-')}</div></td>
                    <td>${escapeHtml(item.message || '')}</td>
                    <td class="apizz-muted">${escapeHtml(item.lastSeenAt || item.firstSeenAt || '-')}</td>
                    <td>${action}</td>
                </tr>
            `;
        }).join('');
    }

    function reconciliationSeverity(severity) {
        const value = String(severity || 'WARN').toUpperCase();
        const className = value === 'BLOCKER' ? 'unhealthy' : value === 'INFO' ? 'disabled' : 'degraded';
        const text = value === 'BLOCKER' ? '阻断' : value === 'INFO' ? '提示' : '警告';
        return `<span class="apizz-status-pill ${className}">${text}</span>`;
    }

    function reconciliationIssueLabel(type) {
        const value = String(type || '');
        return {
            EXPIRED_PENDING_ORDER: '订单过期',
            CALLBACK_UNVERIFIED: '签名失败',
            CALLBACK_UNPROCESSED: '回调未入账',
            AMOUNT_MISMATCH: '金额不一致',
            PAY_METHOD_MISMATCH: '支付方式不一致',
            ORDER_NOT_FOUND: '订单不存在',
            REPLAY_CALLBACK: '回调重放',
            PAID_ORDER_WITHOUT_LEDGER: '缺失入账',
            DUPLICATE_EXTERNAL_TRADE: '重复流水'
        }[value] || value || '未知异常';
    }

    function shortId(value) {
        const text = String(value || '');
        return text.length <= 14 ? text : `${text.slice(0, 10)}...${text.slice(-4)}`;
    }

    function openModelPriceModal(root, prices) {
        closeEditModal();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal apizz-modal-wide">
                <div class="apizz-modal-title">模型价格 <small>按百万 Token 计费</small></div>
                <div class="apizz-table-wrap">
                    <table class="apizz-table">
                        <thead><tr><th>模型规则</th><th>Provider</th><th>渠道</th><th>输入</th><th>输出</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead>
                        <tbody id="apizz-price-rows">${modelPriceRows(prices)}</tbody>
                    </table>
                </div>
                <div class="apizz-form-grid">
                    <div class="apizz-form-group">
                        <label class="apizz-form-label">模型规则</label>
                        <input id="apizz-price-pattern" class="apizz-form-input" type="text" value="*" placeholder="gpt-4.1-mini 或 gpt-4*">
                    </div>
                    <div class="apizz-form-group">
                        <label class="apizz-form-label">Provider</label>
                        <input id="apizz-price-provider" class="apizz-form-input" type="text" value="*" placeholder="openai 或 *">
                    </div>
                    <div class="apizz-form-group">
                        <label class="apizz-form-label">渠道 ID</label>
                        <input id="apizz-price-channel" class="apizz-form-input" type="text" value="*" placeholder="指定渠道 ID 或 *">
                    </div>
                    <div class="apizz-form-group">
                        <label class="apizz-form-label">输入价 / 1M</label>
                        <input id="apizz-price-input" class="apizz-form-input" type="number" min="0" step="0.000001" value="0">
                    </div>
                    <div class="apizz-form-group">
                        <label class="apizz-form-label">输出价 / 1M</label>
                        <input id="apizz-price-output" class="apizz-form-input" type="number" min="0" step="0.000001" value="0">
                    </div>
                    <div class="apizz-form-group">
                        <label class="apizz-form-label">优先级</label>
                        <input id="apizz-price-priority" class="apizz-form-input" type="number" min="0" value="100">
                    </div>
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">备注</label>
                    <input id="apizz-price-note" class="apizz-form-input" type="text" placeholder="公开售价、活动价格或渠道成本说明">
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-price-close" class="apizz-ghost-btn" type="button">关闭</button>
                    <button id="apizz-price-refresh" class="apizz-ghost-btn" type="button">刷新</button>
                    <button id="apizz-price-save" class="apizz-primary-btn" type="button">新增价格</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        bindModelPriceModal(root, overlay);
    }

    function bindModelPriceModal(root, overlay) {
        overlay.querySelector('#apizz-price-close').addEventListener('click', closeEditModal);
        overlay.querySelector('#apizz-price-refresh').addEventListener('click', () => refreshModelPrices(root, overlay));
        overlay.querySelector('#apizz-price-save').addEventListener('click', async () => {
            try {
                const prices = await requestJson(`${API_BASE}/api/api-router/model-prices`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({
                        modelPattern: document.getElementById('apizz-price-pattern').value.trim(),
                        provider: document.getElementById('apizz-price-provider').value.trim() || '*',
                        channelId: document.getElementById('apizz-price-channel').value.trim() || '*',
                        inputPricePerMillion: Number(document.getElementById('apizz-price-input').value),
                        outputPricePerMillion: Number(document.getElementById('apizz-price-output').value),
                        priority: parseInt(document.getElementById('apizz-price-priority').value, 10) || 100,
                        enabled: true,
                        note: document.getElementById('apizz-price-note').value.trim()
                    })
                });
                overlay.querySelector('#apizz-price-rows').innerHTML = modelPriceRows(prices);
                bindModelPriceActions(root, overlay);
                toast(root, '模型价格已保存');
            } catch (error) {
                toast(root, error.message || '模型价格保存失败');
            }
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
        bindModelPriceActions(root, overlay);
    }

    async function refreshModelPrices(root, overlay) {
        try {
            const prices = await requestJson(`${API_BASE}/api/api-router/model-prices`, { headers: authHeaders() });
            overlay.querySelector('#apizz-price-rows').innerHTML = modelPriceRows(prices);
            bindModelPriceActions(root, overlay);
            toast(root, '模型价格已刷新');
        } catch (error) {
            toast(root, error.message || '模型价格刷新失败');
        }
    }

    function bindModelPriceActions(root, overlay) {
        overlay.querySelectorAll('.apizz-price-action').forEach(button => {
            button.addEventListener('click', async () => {
                try {
                    const action = button.dataset.priceAction;
                    const id = button.dataset.priceId;
                    const endpoint = action === 'delete' ? 'model-prices/delete' : 'model-prices/status';
                    const prices = await requestJson(`${API_BASE}/api/api-router/${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify(action === 'delete' ? { id } : { id, enabled: action === 'enable' })
                    });
                    overlay.querySelector('#apizz-price-rows').innerHTML = modelPriceRows(prices);
                    bindModelPriceActions(root, overlay);
                    toast(root, '模型价格状态已更新');
                } catch (error) {
                    toast(root, error.message || '模型价格操作失败');
                }
            });
        });
    }

    function modelPriceRows(prices) {
        if (!Array.isArray(prices) || !prices.length) {
            return '<tr><td colspan="8" class="apizz-muted">暂无模型价格，未配置时使用后端全局兜底价格。</td></tr>';
        }
        return prices.map(item => {
            const action = item.enabled ? 'disable' : 'enable';
            const actionText = item.enabled ? '停用' : '启用';
            return `
                <tr>
                    <td>${escapeHtml(item.modelPattern)}<div class="apizz-muted">${escapeHtml(item.note || '')}</div></td>
                    <td>${escapeHtml(item.provider || '*')}</td>
                    <td>${escapeHtml(shortId(item.channelId || '*'))}</td>
                    <td>$${numberValue(item.inputPricePerMillion).toFixed(6)}</td>
                    <td>$${numberValue(item.outputPricePerMillion).toFixed(6)}</td>
                    <td>${escapeHtml(item.priority)}</td>
                    <td>${item.enabled ? '启用' : '停用'}</td>
                    <td>
                        <button class="apizz-key-action apizz-price-action" type="button" data-price-action="${action}" data-price-id="${escapeHtml(item.id)}">${actionText}</button>
                        <button class="apizz-key-action danger apizz-price-action" type="button" data-price-action="delete" data-price-id="${escapeHtml(item.id)}">删除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openChannelModal(root, channels) {
        closeEditModal();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal">
                <div class="apizz-modal-title">上游渠道 <small>模型路由与 fallback</small></div>
                <div class="apizz-table-wrap">
                    <table class="apizz-table">
                        <thead><tr><th>名称</th><th>Provider</th><th>模型</th><th>优先级</th><th>状态</th><th>健康</th><th>失败</th><th>操作</th></tr></thead>
                        <tbody id="apizz-channel-rows">${channelRows(channels)}</tbody>
                    </table>
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">名称</label>
                    <input id="apizz-channel-name" class="apizz-form-input" type="text" placeholder="stable-openai">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">上游地址</label>
                    <input id="apizz-channel-base" class="apizz-form-input" type="text" placeholder="https://api.example.com/v1">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">上游 API Key</label>
                    <input id="apizz-channel-key" class="apizz-form-input" type="password" placeholder="保存后只显示 mask">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">模型列表</label>
                    <input id="apizz-channel-models" class="apizz-form-input" type="text" value="*" placeholder="*,gpt-5.5,gpt-4.1-mini">
                </div>
                <div class="apizz-form-group">
                    <label class="apizz-form-label">优先级</label>
                    <input id="apizz-channel-priority" class="apizz-form-input" type="number" min="0" value="100">
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-channel-close" class="apizz-ghost-btn" type="button">关闭</button>
                    <button id="apizz-channel-check-all" class="apizz-ghost-btn" type="button">全部检查</button>
                    <button id="apizz-channel-save" class="apizz-primary-btn" type="button">新增渠道</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        bindChannelModal(root, overlay);
    }

    function bindChannelModal(root, overlay) {
        overlay.querySelector('#apizz-channel-close').addEventListener('click', closeEditModal);
        overlay.querySelector('#apizz-channel-check-all').addEventListener('click', async () => {
            try {
                await runHealthCheck('');
                const channels = await requestJson(`${API_BASE}/api/api-router/channels`, { headers: authHeaders() });
                overlay.querySelector('#apizz-channel-rows').innerHTML = channelRows(channels);
                bindChannelRowActions(root, overlay);
                toast(root, '已完成启用渠道健康检查');
            } catch (error) {
                toast(root, error.message || '健康检查失败');
            }
        });
        overlay.querySelector('#apizz-channel-save').addEventListener('click', async () => {
            try {
                const channels = await requestJson(`${API_BASE}/api/api-router/channels`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({
                        name: document.getElementById('apizz-channel-name').value.trim(),
                        baseUrl: document.getElementById('apizz-channel-base').value.trim(),
                        apiKey: document.getElementById('apizz-channel-key').value.trim(),
                        models: document.getElementById('apizz-channel-models').value.trim() || '*',
                        priority: parseInt(document.getElementById('apizz-channel-priority').value, 10) || 100,
                        enabled: true,
                        retryEnabled: true
                    })
                });
                overlay.querySelector('#apizz-channel-rows').innerHTML = channelRows(channels);
                bindChannelRowActions(root, overlay);
                toast(root, '渠道已保存');
            } catch (error) {
                toast(root, error.message || '渠道保存失败');
            }
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
        bindChannelRowActions(root, overlay);
    }

    function bindChannelRowActions(root, overlay) {
        overlay.querySelectorAll('.apizz-channel-action').forEach(button => {
            button.addEventListener('click', async () => {
                try {
                    const action = button.dataset.channelAction;
                    const channelId = button.dataset.channelId;
                    if (action === 'health') {
                        await runHealthCheck(channelId);
                        const channels = await requestJson(`${API_BASE}/api/api-router/channels`, { headers: authHeaders() });
                        overlay.querySelector('#apizz-channel-rows').innerHTML = channelRows(channels);
                        bindChannelRowActions(root, overlay);
                        toast(root, '渠道健康检查已完成');
                        return;
                    }
                    const endpoint = action === 'delete' ? 'channels/delete' : 'channels/status';
                    const payload = action === 'delete'
                        ? { channelId }
                        : { channelId, enabled: action === 'enable' };
                    const channels = await requestJson(`${API_BASE}/api/api-router/${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify(payload)
                    });
                    overlay.querySelector('#apizz-channel-rows').innerHTML = channelRows(channels);
                    bindChannelRowActions(root, overlay);
                    toast(root, '渠道状态已更新');
                } catch (error) {
                    toast(root, error.message || '渠道操作失败');
                }
            });
        });
    }

    function channelRows(channels) {
        if (!Array.isArray(channels) || !channels.length) {
            return '<tr><td colspan="8" class="apizz-muted">暂无渠道，请新增上游。</td></tr>';
        }
        return channels.map(item => {
            const action = item.enabled ? 'disable' : 'enable';
            const actionText = item.enabled ? '禁用' : '启用';
            const healthState = channelDisplayState(item);
            return `
                <tr>
                    <td>${escapeHtml(item.name)}<div class="apizz-muted">${escapeHtml(item.apiKeyMask)}</div></td>
                    <td>${escapeHtml(item.provider)}</td>
                    <td>${escapeHtml(item.models)}</td>
                    <td>${escapeHtml(item.priority)}</td>
                    <td>${item.enabled ? '启用' : '禁用'}</td>
                    <td><span class="apizz-status-pill ${escapeHtml(statusClass(healthState))}">${escapeHtml(formatGatewayStatus(healthState))}</span><div class="apizz-muted">${escapeHtml(item.lastCheckedAt || '')}</div></td>
                    <td>${escapeHtml(item.failureCount)}<div class="apizz-muted">${escapeHtml(item.lastStatus || '')}</div></td>
                    <td>
                        <button class="apizz-key-action apizz-channel-action" type="button" data-channel-action="health" data-channel-id="${escapeHtml(item.id)}">检查</button>
                        <button class="apizz-key-action apizz-channel-action" type="button" data-channel-action="${action}" data-channel-id="${escapeHtml(item.id)}">${actionText}</button>
                        <button class="apizz-key-action danger apizz-channel-action" type="button" data-channel-action="delete" data-channel-id="${escapeHtml(item.id)}">删除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function runHealthCheck(channelId) {
        return requestJson(`${API_BASE}/api/api-router/channels/health-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(channelId ? { channelId } : {})
        });
    }

    async function loadGatewayStatus() {
        try {
            return await requestJson(`${API_BASE}/api/api-router/admin/status`, { headers: authHeaders() });
        } catch (error) {
            return requestJson(`${API_BASE}/api/api-router/status`, { headers: authHeaders() });
        }
    }

    function openStatusModal(root, status) {
        closeEditModal();
        const data = status || {};
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal apizz-modal-wide">
                <div class="apizz-modal-title">状态健康 <small>${escapeHtml(formatGatewayStatus(data.status))}</small></div>
                <div class="apizz-status-summary">
                    ${statusTile('网关状态', formatGatewayStatus(data.status), data.message || '-', statusClass(data.status))}
                    ${statusTile('启用渠道', `${numberValue(data.enabledChannelCount)} / ${numberValue(data.channelCount)}`, `健康 ${numberValue(data.healthyChannelCount)}`, '')}
                    ${statusTile('24h 请求', numberValue(data.last24hRequests), `累计 ${numberValue(data.totalRequests)}`, '')}
                    ${statusTile('成功率', successRate(data), `失败 ${numberValue(data.failedRequests)}`, '')}
                </div>
                <div class="apizz-table-wrap">
                    <table class="apizz-table">
                        <thead><tr><th>渠道</th><th>Provider</th><th>模型</th><th>状态</th><th>失败</th><th>最近状态</th><th>更新</th></tr></thead>
                        <tbody>${statusChannelRows(data.channels)}</tbody>
                    </table>
                </div>
                <div class="apizz-modal-actions">
                    <button id="apizz-status-refresh" class="apizz-ghost-btn" type="button">刷新</button>
                    <button id="apizz-status-check" class="apizz-ghost-btn" type="button">主动检查</button>
                    <button id="apizz-status-close" class="apizz-primary-btn" type="button">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#apizz-status-close').addEventListener('click', closeEditModal);
        overlay.querySelector('#apizz-status-refresh').addEventListener('click', async () => {
            try {
                const next = await loadGatewayStatus();
                closeEditModal();
                openStatusModal(root, next);
                toast(root, '状态健康已刷新');
            } catch (error) {
                toast(root, error.message || '状态刷新失败');
            }
        });
        overlay.querySelector('#apizz-status-check').addEventListener('click', async () => {
            try {
                const next = await runHealthCheck('');
                closeEditModal();
                openStatusModal(root, next);
                toast(root, '主动健康检查已完成');
            } catch (error) {
                toast(root, error.message || '主动检查失败');
            }
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
    }

    function statusTile(label, value, meta, stateClass) {
        return `
            <div class="apizz-status-tile">
                <div class="apizz-label">${escapeHtml(label)}</div>
                <div class="apizz-status-value ${escapeHtml(stateClass || '')}">${escapeHtml(value)}</div>
                <div class="apizz-meta">${escapeHtml(meta)}</div>
            </div>
        `;
    }

    function statusChannelRows(channels) {
        if (!Array.isArray(channels) || !channels.length) {
            return '<tr><td colspan="7" class="apizz-muted">暂无渠道状态。</td></tr>';
        }
        return channels.map(item => `
            <tr>
                <td>${escapeHtml(item.name || shortId(item.id))}${item.lastError ? `<div class="apizz-muted">${escapeHtml(item.lastError)}</div>` : ''}</td>
                <td>${escapeHtml(item.provider || '-')}</td>
                <td>${escapeHtml(item.models || '*')}</td>
                <td><span class="apizz-status-pill ${escapeHtml(statusClass(item.state))}">${escapeHtml(formatGatewayStatus(item.state))}</span></td>
                <td>${numberValue(item.failureCount)}</td>
                <td>${item.lastStatus ? escapeHtml(item.lastStatus) : '<span class="apizz-muted">未检测</span>'}${item.circuitDisabledUntil ? `<div class="apizz-muted">至 ${escapeHtml(item.circuitDisabledUntil)}</div>` : ''}</td>
                <td class="apizz-muted">${escapeHtml(item.lastCheckedAt || item.updatedAt || '-')}</td>
            </tr>
        `).join('');
    }

    function channelDisplayState(item) {
        if (!item || !item.enabled) return 'disabled';
        const circuitState = String(item.circuitState || '').toUpperCase();
        if (circuitState === 'OPEN') return 'circuit_open';
        const lastStatus = numberValue(item.lastStatus);
        const failureCount = numberValue(item.failureCount);
        if (!lastStatus && !failureCount) return 'unknown';
        if (lastStatus >= 200 && lastStatus < 400 && failureCount === 0) return 'healthy';
        if (lastStatus >= 500 || failureCount >= 3) return 'unhealthy';
        return 'degraded';
    }

    function successRate(status) {
        const total = numberValue(status && status.totalRequests);
        if (!total) return '0.00%';
        const success = numberValue(status.successRequests);
        return `${((success / total) * 100).toFixed(2)}%`;
    }

    function formatGatewayStatus(value) {
        const statusText = String(value || '').toLowerCase();
        if (statusText === 'healthy') return '健康';
        if (statusText === 'degraded') return '降级';
        if (statusText === 'unhealthy') return '异常';
        if (statusText === 'unavailable') return '不可用';
        if (statusText === 'disabled') return '禁用';
        if (statusText === 'unknown') return '未检测';
        if (statusText === 'circuit_open') return '熔断';
        if (statusText === 'half_open') return '恢复探测';
        return value || '-';
    }

    function statusClass(value) {
        const statusText = String(value || '').toLowerCase();
        if (statusText === 'healthy') return 'healthy';
        if (statusText === 'degraded' || statusText === 'unknown' || statusText === 'half_open') return 'degraded';
        if (statusText === 'unhealthy' || statusText === 'unavailable' || statusText === 'circuit_open') return 'unhealthy';
        if (statusText === 'disabled') return 'disabled';
        return '';
    }

    function metricCard(label, value, meta, icon, color = '', valueColor = '') {
        return `
            <article class="apizz-card apizz-metric">
                <div class="apizz-icon ${escapeHtml(color)}">${escapeHtml(icon)}</div>
                <div>
                    <div class="apizz-label">${escapeHtml(label)}</div>
                    <div class="apizz-value ${escapeHtml(valueColor)}">${escapeHtml(value)}</div>
                    <div class="apizz-meta">${escapeHtml(meta)}</div>
                </div>
            </article>
        `;
    }

    function modelRow(item) {
        return `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.requests)}</td>
                <td>${escapeHtml(item.token)}</td>
                <td class="apizz-positive">$${numberValue(item.cost).toFixed(4)}</td>
                <td class="apizz-muted">$${numberValue(item.standard).toFixed(4)}</td>
            </tr>
        `;
    }

    function usageItem(item) {
        const model = String(item.model || '');
        return `
            <div class="apizz-usage-item">
                <div class="apizz-icon">${escapeHtml(model.slice(0, 3).toUpperCase())}</div>
                <div>
                    <div class="apizz-usage-name">${escapeHtml(model)}</div>
                    <div class="apizz-usage-time">${escapeHtml(item.time)}</div>
                </div>
                <div class="apizz-cost">$${numberValue(item.cost).toFixed(4)}<div class="apizz-usage-token">${escapeHtml(item.token)}</div></div>
            </div>
        `;
    }

    function emptyUsageList() {
        return '<div class="apizz-empty-state">暂无调用记录</div>';
    }

    function ledgerRows(items) {
        if (!Array.isArray(items) || !items.length) {
            return '<div class="apizz-empty-state">暂无账务流水</div>';
        }
        return items.map(item => `
            <div class="apizz-ledger-item">
                <div>
                    <div class="apizz-ledger-type">${escapeHtml(item.type || '-')}</div>
                    <div class="apizz-muted">${escapeHtml(item.description || '')}</div>
                </div>
                <div class="apizz-ledger-amount ${numberValue(item.amount) >= 0 ? 'positive' : 'negative'}">
                    ${numberValue(item.amount) >= 0 ? '+' : ''}${numberValue(item.amount).toFixed(4)}
                    <div class="apizz-muted">$${numberValue(item.balanceAfter).toFixed(4)}</div>
                </div>
            </div>
        `).join('');
    }

    function workflowButton(icon, title, meta, action) {
        return `
            <button class="apizz-action apizz-work-action" type="button" data-action="${escapeHtml(action)}">
                <span class="apizz-icon">${escapeHtml(icon)}</span>
                <span>
                    <span class="apizz-action-title">${escapeHtml(title)}</span>
                    <span class="apizz-action-desc">${escapeHtml(meta)}</span>
                </span>
            </button>
        `;
    }

    function actionButton(icon, title, desc, action) {
        return `
            <button class="apizz-action" type="button" data-action="${escapeHtml(action)}">
                <span class="apizz-icon">${escapeHtml(icon)}</span>
                <span><span class="apizz-action-title">${escapeHtml(title)}</span><span class="apizz-action-desc">${escapeHtml(desc)}</span></span>
                <span class="apizz-muted">&gt;</span>
            </button>
        `;
    }

    function keyRow(item) {
        const status = item.status === 'Enabled' ? '启用' : '暂停';
        const toggleAction = item.status === 'Enabled' ? 'pause' : 'enable';
        const toggleText = item.status === 'Enabled' ? '暂停' : '启用';
        const rpmDisplay = numberValue(item.keyRpm) > 0 ? numberValue(item.keyRpm) : '全局';
        const tpmDisplay = numberValue(item.keyTpm) > 0 ? formatTpmDisplay(numberValue(item.keyTpm)) : '全局';
        return `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.mask)}</td>
                <td><span class="apizz-key-status">${status}</span></td>
                <td>${escapeHtml(item.quota)}</td>
                <td class="apizz-positive">${escapeHtml(item.used)}</td>
                <td class="apizz-muted">${escapeHtml(rpmDisplay)}</td>
                <td class="apizz-muted">${escapeHtml(tpmDisplay)}</td>
                <td class="apizz-muted">${escapeHtml(item.lastUsed)}</td>
                <td>
                    <div class="apizz-key-actions">
                        <button class="apizz-key-action" type="button" data-key-action="edit" data-key-id="${escapeHtml(item.id)}">编辑</button>
                        <button class="apizz-key-action" type="button" data-key-action="${toggleAction}" data-key-id="${escapeHtml(item.id)}">${toggleText}</button>
                        <button class="apizz-key-action danger" type="button" data-key-action="delete" data-key-id="${escapeHtml(item.id)}">删除</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function formatTpmDisplay(value) {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return String(value);
    }

    function emptyKeyRow() {
        return '<tr><td colspan="9" class="apizz-muted">暂无真实 API 密钥，请从快捷操作创建。</td></tr>';
    }

    function createdKeyNotice() {
        if (!lastCreatedKey) return '';
        return `
            <section class="apizz-card apizz-key-secret">
                <div>
                    <div class="apizz-panel-title">新密钥已创建 <small>仅显示这一次</small></div>
                    <p class="apizz-muted">请立即保存完整密钥。后端只保存 hash，刷新后无法再次查看明文。</p>
                </div>
                <div class="apizz-created-key-row">
                    <input id="apizz-created-key" class="apizz-created-key" value="${escapeHtml(lastCreatedKey)}" readonly>
                    <button id="apizz-copy-key" class="apizz-ghost-btn" type="button">复制</button>
                </div>
            </section>
        `;
    }

    function chartSvg() {
        const values = Array.isArray(state.trend) && state.trend.length ? state.trend.map(value => numberValue(value)) : [0, 0, 0, 0, 0, 0, 0];
        const width = 620;
        const height = 220;
        const left = 44;
        const top = 16;
        const chartW = width - left - 20;
        const chartH = height - top - 32;
        const max = Math.max(1, ...values);
        const points = values.map((value, index) => {
            const x = left + (chartW / Math.max(1, values.length - 1)) * index;
            const y = top + chartH - (value / max) * chartH;
            return [x, y];
        });
        const line = points.map((point, index) => `${index ? 'L' : 'M'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ');
        const area = `${line} L${left + chartW},${top + chartH} L${left},${top + chartH} Z`;
        const grid = [0, .2, .4, .6, .8, 1].map(ratio => {
            const value = max * ratio;
            const y = top + chartH - (value / max) * chartH;
            return `<line x1="${left}" y1="${y}" x2="${left + chartW}" y2="${y}" stroke="rgba(203,213,225,.12)"/><text x="4" y="${y + 4}" fill="rgba(203,213,225,.55)" font-size="10">${formatTrendLabel(value)}</text>`;
        }).join('');
        const bars = values.map((value, index) => {
            const x = left + (chartW / values.length) * index + 10;
            const barH = (value / max) * chartH;
            return `<rect x="${x}" y="${top + chartH - barH}" width="16" height="${barH}" rx="5" fill="rgba(46,204,191,.46)"/>`;
        }).join('');
        const dots = points.map(point => `<circle cx="${point[0]}" cy="${point[1]}" r="4" fill="#3b82f6" stroke="#dbeafe" stroke-width="2"/>`).join('');

        return `
            <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Token 使用趋势">
                <defs>
                    <linearGradient id="apizz-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="#3b82f6" stop-opacity=".34"/>
                        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                ${grid}
                ${bars}
                <path d="${area}" fill="url(#apizz-area)"/>
                <path d="${line}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                ${dots}
                <text x="${left}" y="${height - 6}" fill="rgba(203,213,225,.55)" font-size="10">range ${escapeHtml(state.range)}</text>
                <text x="${left + chartW - 96}" y="${height - 6}" fill="rgba(203,213,225,.55)" font-size="10">${escapeHtml(state.granularity)}</text>
            </svg>
        `;
    }

    function donutGradient() {
        const colors = ['#3b82f6', '#2eccbf', '#ffd27b', '#b388ff', '#ff8fa3'];
        let cursor = 0;
        const parts = state.models.map((item, index) => {
            const share = Math.max(0, Math.min(100, numberValue(item.share)));
            const start = cursor;
            cursor += share;
            return `${colors[index % colors.length]} ${start}% ${cursor}%`;
        });
        return `background: conic-gradient(${parts.length ? parts.join(', ') : '#3b82f6 0 100%'});`;
    }

    function formatTrendLabel(value) {
        const safeValue = Math.max(0, numberValue(value));
        if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
        if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
        return `${Math.round(safeValue)}`;
    }

    function normalizeDashboard(data) {
        const source = data || {};
        const defaults = JSON.parse(JSON.stringify(DEFAULT_STATE));
        return {
            ...defaults,
            ...source,
            metrics: { ...defaults.metrics, ...(source.metrics || {}) },
            models: Array.isArray(source.models) ? source.models : [],
            usage: Array.isArray(source.usage) ? source.usage : [],
            keys: Array.isArray(source.keys) ? source.keys : [],
            ledger: Array.isArray(source.ledger) ? source.ledger : [],
            trend: Array.isArray(source.trend) ? source.trend : []
        };
    }

    function getCurrentUser() {
        return window.CipherAuth && typeof window.CipherAuth.getUser === 'function'
            ? window.CipherAuth.getUser()
            : null;
    }

    function authHeaders() {
        return window.CipherAuth && typeof window.CipherAuth.getAuthHeaders === 'function'
            ? window.CipherAuth.getAuthHeaders()
            : {};
    }

    function selected(value, current) {
        return value === current ? 'selected' : '';
    }

    function numberValue(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function maskEmail(email) {
        const value = String(email || '');
        if (!value.includes('@')) return value || '未登录';
        const [name, domain] = value.split('@');
        if (name.length <= 3) return value;
        return `${name.slice(0, 3)}****@${domain}`;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function toast(root, text) {
        const el = root.querySelector('#apizz-toast');
        if (!el) return;
        el.textContent = text;
        el.classList.add('show');
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => el.classList.remove('show'), 1600);
    }
})();
