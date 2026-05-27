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
            const data = await requestJson(url);
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
            headers: { 'Content-Type': 'application/json' },
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

        root.innerHTML = `
            <section class="apizz-shell">
                <div class="apizz-header">
                    <div>
                        <div class="module-header">
                            <h2 class="neon-title" data-text="API ROUTER">API ROUTER</h2>
                        </div>
                        <div class="apizz-subtitle">API 中转站 / 后端数据、登录邮箱隔离、密钥与用量管理</div>
                    </div>
                    <div class="apizz-header-actions">
                        <span class="apizz-pill">${escapeHtml(maskEmail(state.email))}</span>
                        <span class="apizz-pill">后端通道已连接</span>
                        <span class="apizz-pill">余额 $${numberValue(state.metrics.balance).toFixed(2)}</span>
                    </div>
                </div>

                <div class="apizz-grid apizz-metric-grid">
                    ${metricCard('余额', `$${numberValue(state.metrics.balance).toFixed(2)}`, '可用', 'BAL', 'green')}
                    ${metricCard('API 密钥', state.metrics.apiKeys, `${enabledKeys} 启用`, 'KEY', 'blue')}
                    ${metricCard('范围请求', state.metrics.requests, `总计: ${state.metrics.requests}`, 'REQ', '')}
                    ${metricCard('范围消费', `$${numberValue(state.metrics.spend).toFixed(4)}`, `标准 $${numberValue(state.metrics.standardSpend).toFixed(4)}`, 'USD', 'purple', 'purple')}
                    ${metricCard('范围 Token', `${numberValue(state.metrics.todayToken).toFixed(1)}M`, `输入: ${inputToken.toFixed(1)}M / 输出: ${outputToken.toFixed(4)}M`, 'TOK', 'orange')}
                    ${metricCard('累计 Token', `${numberValue(state.metrics.totalToken).toFixed(1)}M`, `输入: ${inputToken.toFixed(1)}M / 输出: ${outputToken.toFixed(4)}M`, 'SUM', 'blue')}
                    ${metricCard('性能指标', state.metrics.rpm, `${numberValue(state.metrics.tpm).toFixed(1)}K TPM`, 'RPM', 'purple')}
                    ${metricCard('平均响应', `${numberValue(state.metrics.avgLatency).toFixed(2)}s`, '平均时间', 'LAT', 'red')}
                </div>

                <div class="apizz-card apizz-toolbar">
                    <div class="apizz-filter-row">
                        <span class="apizz-muted">时间范围:</span>
                        <select id="apizz-range" class="apizz-select">
                            <option value="1" ${selected('1', state.range)}>近 24 小时</option>
                            <option value="7" ${selected('7', state.range)}>近 7 天</option>
                            <option value="30" ${selected('30', state.range)}>近 30 天</option>
                        </select>
                        <button id="apizz-refresh" class="apizz-ghost-btn" type="button">刷新</button>
                    </div>
                    <div class="apizz-filter-row">
                        <span class="apizz-muted">粒度:</span>
                        <select id="apizz-granularity" class="apizz-select">
                            <option value="hour" ${selected('hour', state.granularity)}>按小时</option>
                            <option value="day" ${selected('day', state.granularity)}>按天</option>
                            <option value="model" ${selected('model', state.granularity)}>按模型</option>
                        </select>
                    </div>
                </div>

                ${createdKeyNotice()}

                <div class="apizz-grid apizz-main-grid">
                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">模型分布 <small>按请求与消费聚合</small></div>
                        <div class="apizz-donut-wrap">
                            <div class="apizz-donut" aria-hidden="true" style="${donutGradient()}"></div>
                            <div class="apizz-table-wrap">
                                <table class="apizz-table">
                                    <thead><tr><th>模型</th><th>请求</th><th>Token</th><th>实际</th><th>标准</th></tr></thead>
                                    <tbody>${state.models.map(modelRow).join('')}</tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">Token 使用趋势 <small>Input / Output / Cache</small></div>
                        <div class="apizz-legend">
                            <span style="color:#3b82f6"><i class="apizz-dot"></i>Input</span>
                            <span style="color:#2eccbf"><i class="apizz-dot"></i>Output</span>
                            <span style="color:#ffd27b"><i class="apizz-dot"></i>Cache Creation</span>
                            <span style="color:#b388ff"><i class="apizz-dot"></i>Hit Rate</span>
                        </div>
                        <div class="apizz-chart">${chartSvg()}</div>
                    </section>
                </div>

                <div class="apizz-grid apizz-bottom-grid">
                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">最近使用 <small>近 ${escapeHtml(state.range)} 天</small></div>
                        <div class="apizz-usage-list">${state.usage.map(usageItem).join('')}</div>
                    </section>

                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">快捷操作</div>
                        <div class="apizz-action-list">
                            ${actionButton('KEY', '创建 API 密钥', '生成新的后端密钥记录', 'create-key')}
                            ${actionButton('LOG', '查看使用记录', '使用记录已由后端返回', 'usage-log')}
                            ${actionButton('PAY', '兑换码', '充值接口预留入口', 'redeem-code')}
                            ${actionButton('CFG', '路由规则', '模型映射和限流策略预留入口', 'route-config')}
                        </div>
                    </section>
                </div>

                <div class="apizz-grid apizz-key-grid">
                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">API 密钥 <small>按登录邮箱存储于后端</small></div>
                        <div class="apizz-table-wrap">
                            <table class="apizz-table">
                                <thead><tr><th>名称</th><th>密钥</th><th>状态</th><th>额度</th><th>已用</th><th>RPM</th><th>TPM</th><th>最后使用</th><th>操作</th></tr></thead>
                                <tbody>${state.keys.length ? state.keys.map(keyRow).join('') : emptyKeyRow()}</tbody>
                            </table>
                        </div>
                    </section>
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

        const messages = {
            'usage-log': '使用记录已接入后端 dashboard 数据',
            'redeem-code': '兑换码入口已保留，当前未开放充值写入',
            'route-config': '路由规则入口已保留，当前未开放编辑写入'
        };
        toast(root, messages[action] || '功能入口已就绪');
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
            trend: Array.isArray(source.trend) ? source.trend : []
        };
    }

    function getCurrentUser() {
        return window.CipherAuth && typeof window.CipherAuth.getUser === 'function'
            ? window.CipherAuth.getUser()
            : null;
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
