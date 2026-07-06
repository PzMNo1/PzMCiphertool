(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    let channels = [];
    let prices = [];
    let plans = [];
    let status = null;
    let loadError = '';
    let loaded = false;

    api.registerPage({
        id: 'ops',
        title: '运营配置',
        render(ctx) {
            const h = ctx.helpers;
            const enabledChannels = channels.filter(item => item.enabled).length;
            const enabledPrices = prices.filter(item => item.enabled).length;
            const enabledPlans = plans.filter(item => item.enabled).length;
            const servedModelNames = status && Array.isArray(status.servedModelNames) ? status.servedModelNames : [];
            const servedModelMeta = servedModelNames.length
                ? servedModelNames.slice(0, 3).join(', ')
                : '需启用渠道和价格';
            const healthRows = status && Array.isArray(status.channels) && status.channels.length
                ? status.channels.map(item => healthRow(item, h)).join('')
                : '<tr><td colspan="5" class="apizz-muted">状态数据未加载。</td></tr>';
            const channelRows = channels.length
                ? channels.map(item => channelRow(item, h)).join('')
                : '<tr><td colspan="9" class="apizz-muted">暂无渠道，请先添加上游。</td></tr>';
            const priceRows = prices.length
                ? prices.map(item => priceRow(item, h)).join('')
                : '<tr><td colspan="8" class="apizz-muted">暂无模型价格规则。</td></tr>';
            const planRows = plans.length
                ? plans.map(item => planRow(item, h)).join('')
                : '<tr><td colspan="8" class="apizz-muted">暂无套餐。</td></tr>';

            return `
                <section id="apizz-page-ops" class="apizz-page apizz-ops-page">
                    <section class="apizz-card apizz-command-bar apizz-ops-command">
                        <div class="apizz-command-actions apizz-ops-actions">
                            <button class="apizz-action apizz-work-action" type="button" data-apizz-ops-action="reload">
                                <span class="apizz-icon">RLD</span>
                                <span>
                                    <span class="apizz-action-title">刷新配置</span>
                                    <span class="apizz-action-desc">${loaded ? '已加载后端配置' : '读取渠道和价格'}</span>
                                </span>
                            </button>
                            <button class="apizz-action apizz-work-action" type="button" data-apizz-ops-action="new-channel">
                                <span class="apizz-icon blue">CHN</span>
                                <span>
                                    <span class="apizz-action-title">新增渠道</span>
                                    <span class="apizz-action-desc">${enabledChannels} 个启用</span>
                                </span>
                            </button>
                            <button class="apizz-action apizz-work-action" type="button" data-apizz-ops-action="new-price">
                                <span class="apizz-icon orange">PRC</span>
                                <span>
                                    <span class="apizz-action-title">新增价格</span>
                                    <span class="apizz-action-desc">${enabledPrices} 条启用</span>
                                </span>
                            </button>
                            <button class="apizz-action apizz-work-action" type="button" data-apizz-ops-action="new-plan">
                                <span class="apizz-icon green">PLN</span>
                                <span>
                                    <span class="apizz-action-title">新增套餐</span>
                                    <span class="apizz-action-desc">${enabledPlans} 个启用</span>
                                </span>
                            </button>
                            <button class="apizz-action apizz-work-action" type="button" data-apizz-ops-action="status">
                                <span class="apizz-icon purple">STS</span>
                                <span>
                                    <span class="apizz-action-title">检查状态</span>
                                    <span class="apizz-action-desc">${status ? h.escapeHtml(status.generatedAt || '已更新') : '网关状态'}</span>
                                </span>
                            </button>
                        </div>
                    </section>

                    ${loadError ? `<div class="apizz-empty-state">运营配置加载失败：${h.escapeHtml(loadError)}</div>` : ''}

                    <div class="apizz-grid apizz-metric-grid apizz-ops-metrics">
                        ${h.metricCard('启用渠道', enabledChannels, `${channels.length} total`, 'CHN', 'blue')}
                        ${h.metricCard('价格规则', enabledPrices, `${prices.length} total`, 'PRC', 'orange')}
                        ${h.metricCard('余额套餐', enabledPlans, `${plans.length} total`, 'PLN', 'green')}
                        ${h.metricCard('可服务模型', status ? h.numberValue(status.servedModels || 0) : '-', servedModelMeta, 'MDL', 'purple')}
                        ${h.metricCard('网关状态', status ? healthText(status.status || status.health) : '未检查', '渠道检测', 'STS', statusClass(status))}
                    </div>

                    <section class="apizz-card apizz-panel apizz-panel-span apizz-ops-panel">
                        <div class="apizz-panel-title">上游渠道 <small>OpenAI compatible providers</small></div>
                        <div class="apizz-table-wrap apizz-ops-table-wrap">
                            <table class="apizz-table">
                                <thead><tr><th>名称</th><th>Provider</th><th>Base URL</th><th>模型</th><th>优先级</th><th>权重</th><th>并发</th><th>状态</th><th>操作</th></tr></thead>
                                <tbody>${channelRows}</tbody>
                            </table>
                        </div>
                    </section>

                    <section class="apizz-card apizz-panel apizz-panel-span apizz-ops-panel">
                        <div class="apizz-panel-title">模型价格 <small>per 1M tokens</small></div>
                        <div class="apizz-table-wrap apizz-ops-table-wrap">
                            <table class="apizz-table">
                                <thead><tr><th>模型匹配</th><th>Provider</th><th>Channel</th><th>输入</th><th>输出</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead>
                                <tbody>${priceRows}</tbody>
                            </table>
                        </div>
                    </section>

                    <section class="apizz-card apizz-panel apizz-panel-span apizz-ops-panel">
                        <div class="apizz-panel-title">余额套餐 <small>balance packages</small></div>
                        <div class="apizz-table-wrap apizz-ops-table-wrap">
                            <table class="apizz-table">
                                <thead><tr><th>名称</th><th>价格</th><th>到账</th><th>额度</th><th>标记</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead>
                                <tbody>${planRows}</tbody>
                            </table>
                        </div>
                    </section>

                    <section class="apizz-card apizz-panel apizz-panel-span apizz-ops-panel">
                        <div class="apizz-panel-title">网关状态 <small>channel health</small></div>
                        <div class="apizz-table-wrap apizz-ops-table-wrap">
                            <table class="apizz-table">
                                <thead><tr><th>渠道</th><th>Provider</th><th>状态</th><th>HTTP</th><th>最近错误</th></tr></thead>
                                <tbody>${healthRows}</tbody>
                            </table>
                        </div>
                    </section>
                </section>
            `;
        },
        bind(ctx) {
            if (!loaded && !loadError) {
                loadOps(ctx, false);
            }
            bindOps(ctx);
        }
    });

    function bindOps(ctx) {
        const root = ctx.root;
        root.querySelector('[data-apizz-ops-action="reload"]')?.addEventListener('click', () => loadOps(ctx, true));
        root.querySelector('[data-apizz-ops-action="status"]')?.addEventListener('click', () => loadStatus(ctx, true));
        root.querySelector('[data-apizz-ops-action="new-channel"]')?.addEventListener('click', () => openChannelModal(ctx));
        root.querySelector('[data-apizz-ops-action="new-price"]')?.addEventListener('click', () => openPriceModal(ctx));
        root.querySelector('[data-apizz-ops-action="new-plan"]')?.addEventListener('click', () => openPlanModal(ctx));

        root.querySelectorAll('[data-apizz-channel-action]').forEach(button => {
            button.addEventListener('click', async () => {
                const item = channels.find(channel => channel.id === button.dataset.channelId);
                const action = button.dataset.apizzChannelAction;
                if (!item) return;
                if (action === 'edit') {
                    openChannelModal(ctx, item);
                    return;
                }
                try {
                    if (action === 'toggle') {
                        channels = await ctx.actions.postDashboard('channels/status', {
                            channelId: item.id,
                            enabled: !item.enabled
                        });
                    } else if (action === 'delete') {
                        if (!window.confirm(`删除渠道 ${item.name || item.id}？`)) return;
                        channels = await ctx.actions.postDashboard('channels/delete', { channelId: item.id });
                    } else if (action === 'check') {
                        status = await ctx.actions.postDashboard('status/check', { channelId: item.id });
                    }
                    loaded = true;
                    ctx.actions.render();
                    ctx.actions.toast('渠道配置已更新');
                } catch (error) {
                    ctx.actions.toast(error.message || '渠道操作失败');
                }
            });
        });

        root.querySelectorAll('[data-apizz-price-action]').forEach(button => {
            button.addEventListener('click', async () => {
                const item = prices.find(price => price.id === button.dataset.priceId);
                const action = button.dataset.apizzPriceAction;
                if (!item) return;
                if (action === 'edit') {
                    openPriceModal(ctx, item);
                    return;
                }
                try {
                    if (action === 'toggle') {
                        prices = await ctx.actions.postDashboard('model-prices/status', {
                            id: item.id,
                            enabled: !item.enabled
                        });
                    } else if (action === 'delete') {
                        if (!window.confirm(`删除价格规则 ${item.modelPattern || item.id}？`)) return;
                        prices = await ctx.actions.postDashboard('model-prices/delete', { id: item.id });
                    }
                    loaded = true;
                    ctx.actions.render();
                    ctx.actions.toast('价格规则已更新');
                } catch (error) {
                    ctx.actions.toast(error.message || '价格规则操作失败');
                }
            });
        });

        root.querySelectorAll('[data-apizz-plan-action]').forEach(button => {
            button.addEventListener('click', async () => {
                const item = plans.find(plan => plan.id === button.dataset.planId);
                const action = button.dataset.apizzPlanAction;
                if (!item) return;
                if (action === 'edit') {
                    openPlanModal(ctx, item);
                    return;
                }
                try {
                    if (action === 'toggle') {
                        plans = await ctx.actions.postDashboard('subscription-plans/status', {
                            id: item.id,
                            enabled: !item.enabled
                        });
                        syncCommercePlans(ctx);
                    } else if (action === 'delete') {
                        if (!window.confirm(`删除套餐 ${item.name || item.id}？`)) return;
                        plans = await ctx.actions.postDashboard('subscription-plans/delete', { id: item.id });
                        syncCommercePlans(ctx);
                    }
                    loaded = true;
                    ctx.actions.render();
                    ctx.actions.toast('套餐配置已更新');
                } catch (error) {
                    ctx.actions.toast(error.message || '套餐操作失败');
                }
            });
        });
    }

    async function loadOps(ctx, showToast) {
        try {
            const [nextChannels, nextPrices, nextPlans, nextStatus] = await Promise.all([
                ctx.actions.getRouter('channels'),
                ctx.actions.getRouter('model-prices'),
                ctx.actions.getRouter('subscription-plans/admin'),
                ctx.actions.getRouter('status', { admin: true })
            ]);
            channels = Array.isArray(nextChannels) ? nextChannels : [];
            prices = Array.isArray(nextPrices) ? nextPrices : [];
            plans = Array.isArray(nextPlans) ? nextPlans : [];
            syncCommercePlans(ctx);
            status = nextStatus || null;
            loaded = true;
            loadError = '';
            ctx.actions.render();
            if (showToast) ctx.actions.toast('运营配置已刷新');
        } catch (error) {
            loadError = error.message || '需要管理员权限或后端不可用';
            loaded = true;
            ctx.actions.render();
            if (showToast) ctx.actions.toast(loadError);
        }
    }

    async function loadStatus(ctx, showToast) {
        try {
            status = await ctx.actions.getRouter('status', { admin: true });
            loaded = true;
            loadError = '';
            ctx.actions.render();
            if (showToast) ctx.actions.toast('网关状态已更新');
        } catch (error) {
            ctx.actions.toast(error.message || '状态加载失败');
        }
    }

    function channelRow(item, h) {
        const enabled = !!item.enabled;
        const status = enabled ? '启用' : '停用';
        const badge = enabled ? 'healthy' : 'disabled';
        return `
            <tr>
                <td>
                    <div>${h.escapeHtml(item.name || item.id || '-')}</div>
                    <div class="apizz-muted">${h.escapeHtml(item.id || '')}</div>
                </td>
                <td>${h.escapeHtml(item.provider || '-')}</td>
                <td class="apizz-muted">${h.escapeHtml(compactUrl(item.baseUrl || ''))}</td>
                <td class="apizz-muted">${h.escapeHtml(item.models || '未配置')}</td>
                <td>${h.escapeHtml(item.priority ?? 100)}</td>
                <td>${h.escapeHtml(item.weight ?? 1)}</td>
                <td>${h.escapeHtml(channelConcurrencyText(item.concurrencyLimit))}</td>
                <td><span class="apizz-status-pill ${badge}">${status}</span></td>
                <td>
                    <div class="apizz-key-actions">
                        <button class="apizz-key-action" type="button" data-apizz-channel-action="edit" data-channel-id="${h.escapeHtml(item.id)}">编辑</button>
                        <button class="apizz-key-action" type="button" data-apizz-channel-action="toggle" data-channel-id="${h.escapeHtml(item.id)}">${enabled ? '停用' : '启用'}</button>
                        <button class="apizz-key-action" type="button" data-apizz-channel-action="check" data-channel-id="${h.escapeHtml(item.id)}">检测</button>
                        <button class="apizz-key-action danger" type="button" data-apizz-channel-action="delete" data-channel-id="${h.escapeHtml(item.id)}">删除</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function channelConcurrencyText(value) {
        const limit = Number(value);
        return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : '不限';
    }

    function priceRow(item, h) {
        const enabled = !!item.enabled;
        return `
            <tr>
                <td>${h.escapeHtml(item.modelPattern || '*')}</td>
                <td>${h.escapeHtml(item.provider || '*')}</td>
                <td>${h.escapeHtml(item.channelId || '*')}</td>
                <td>$${h.numberValue(item.inputPricePerMillion).toFixed(4)}</td>
                <td>$${h.numberValue(item.outputPricePerMillion).toFixed(4)}</td>
                <td>${h.escapeHtml(item.priority ?? 100)}</td>
                <td><span class="apizz-status-pill ${enabled ? 'healthy' : 'disabled'}">${enabled ? '启用' : '停用'}</span></td>
                <td>
                    <div class="apizz-key-actions">
                        <button class="apizz-key-action" type="button" data-apizz-price-action="edit" data-price-id="${h.escapeHtml(item.id)}">编辑</button>
                        <button class="apizz-key-action" type="button" data-apizz-price-action="toggle" data-price-id="${h.escapeHtml(item.id)}">${enabled ? '停用' : '启用'}</button>
                        <button class="apizz-key-action danger" type="button" data-apizz-price-action="delete" data-price-id="${h.escapeHtml(item.id)}">删除</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function planRow(item, h) {
        const enabled = !!item.enabled;
        return `
            <tr>
                <td>${h.escapeHtml(item.name || item.id || '-')}</td>
                <td>$${h.numberValue(item.price).toFixed(4)}</td>
                <td>$${h.numberValue(item.credit).toFixed(4)}</td>
                <td class="apizz-muted">${h.escapeHtml(item.quota || '-')}</td>
                <td>${h.escapeHtml(item.badge || '-')}</td>
                <td>${h.escapeHtml(item.priority ?? 100)}</td>
                <td><span class="apizz-status-pill ${enabled ? 'healthy' : 'disabled'}">${enabled ? '启用' : '停用'}</span></td>
                <td>
                    <div class="apizz-key-actions">
                        <button class="apizz-key-action" type="button" data-apizz-plan-action="edit" data-plan-id="${h.escapeHtml(item.id)}">编辑</button>
                        <button class="apizz-key-action" type="button" data-apizz-plan-action="toggle" data-plan-id="${h.escapeHtml(item.id)}">${enabled ? '停用' : '启用'}</button>
                        <button class="apizz-key-action danger" type="button" data-apizz-plan-action="delete" data-plan-id="${h.escapeHtml(item.id)}">删除</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function healthRow(item, h) {
        const healthy = String(item.health || item.status || '').toUpperCase();
        const cls = healthy.includes('HEALTH') || healthy.includes('OK') ? 'healthy' : healthy.includes('DISABLED') ? 'disabled' : 'degraded';
        return `
            <tr>
                <td>${h.escapeHtml(item.name || item.id || '-')}</td>
                <td>${h.escapeHtml(item.provider || '-')}</td>
                <td><span class="apizz-status-pill ${cls}">${h.escapeHtml(healthText(item.health || item.status || '-'))}</span></td>
                <td>${h.escapeHtml(item.lastStatus || item.statusCode || '-')}</td>
                <td class="apizz-muted">${h.escapeHtml(item.lastError || item.message || '')}</td>
            </tr>
        `;
    }

    function openChannelModal(ctx, item = {}) {
        closeModal();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay apizz-ops-modal';
        overlay.innerHTML = `
            <div class="apizz-modal apizz-modal-wide">
                <div class="apizz-modal-title">${item.id ? '编辑渠道' : '新增渠道'}<small>OpenAI compatible</small></div>
                <div class="apizz-form-grid apizz-ops-form-grid">
                    ${field('apizz-channel-name', '名称', item.name || '', 'DeepSeek 主通道')}
                    ${field('apizz-channel-provider', 'Provider', item.provider || '', 'deepseek')}
                    ${field('apizz-channel-base-url', 'Base URL', item.baseUrl || '', 'https://api.example.com/v1')}
                    ${field('apizz-channel-api-key', '上游 API Key', '', item.id ? '留空则保持原值' : 'sk-...')}
                    ${field('apizz-channel-models', '模型', item.id ? (item.models || '') : '*', 'deepseek-chat,gpt-4o-mini 或 *')}
                    ${field('apizz-channel-priority', '优先级', item.priority ?? 100, '数字越小越优先', 'number')}
                    ${field('apizz-channel-weight', '权重', item.weight ?? 1, '同优先级分流权重', 'number')}
                    ${field('apizz-channel-concurrency', '并发上限', item.concurrencyLimit ?? 0, '0 表示不限', 'number')}
                    <label class="apizz-form-group apizz-checkbox-row">
                        <span class="apizz-form-label">启用渠道</span>
                        <input id="apizz-channel-enabled" type="checkbox" ${item.enabled === false ? '' : 'checked'}>
                    </label>
                    <label class="apizz-form-group apizz-checkbox-row">
                        <span class="apizz-form-label">失败重试</span>
                        <input id="apizz-channel-retry" type="checkbox" ${item.retryEnabled === false ? '' : 'checked'}>
                    </label>
                </div>
                <div class="apizz-modal-actions">
                    <button class="apizz-ghost-btn" type="button" data-apizz-modal-close>取消</button>
                    <button class="apizz-primary-btn" type="button" data-apizz-channel-save>保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        bindModalClose(overlay);
        overlay.querySelector('[data-apizz-channel-save]')?.addEventListener('click', async buttonEvent => {
            const button = buttonEvent.currentTarget;
            if (button.disabled) return;
            button.disabled = true;
            try {
                channels = await ctx.actions.postDashboard('channels', {
                    id: item.id || '',
                    name: value('apizz-channel-name'),
                    provider: value('apizz-channel-provider'),
                    baseUrl: value('apizz-channel-base-url'),
                    apiKey: value('apizz-channel-api-key'),
                    models: value('apizz-channel-models'),
                    priority: numberValue('apizz-channel-priority', 100),
                    weight: numberValue('apizz-channel-weight', 1),
                    concurrencyLimit: numberValue('apizz-channel-concurrency', 0),
                    enabled: document.getElementById('apizz-channel-enabled')?.checked !== false,
                    retryEnabled: document.getElementById('apizz-channel-retry')?.checked !== false
                });
                loaded = true;
                closeModal();
                ctx.actions.render();
                ctx.actions.toast('渠道已保存');
            } catch (error) {
                ctx.actions.toast(error.message || '渠道保存失败');
            } finally {
                button.disabled = false;
            }
        });
        requestAnimationFrame(() => overlay.querySelector('#apizz-channel-name')?.focus());
    }

    function openPriceModal(ctx, item = {}) {
        closeModal();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay apizz-ops-modal';
        const channelOptions = channels
            .map(channel => `<option value="${escapeHtml(channel.id || '')}" label="${escapeHtml(channel.name || channel.id || '')}"></option>`)
            .join('');
        overlay.innerHTML = `
            <div class="apizz-modal apizz-modal-wide">
                <div class="apizz-modal-title">${item.id ? '编辑价格' : '新增价格'}<small>per 1M tokens</small></div>
                <div class="apizz-form-grid apizz-ops-form-grid">
                    ${field('apizz-price-pattern', '模型匹配', item.modelPattern || '*', 'deepseek-* 或 *')}
                    ${field('apizz-price-provider', 'Provider', item.provider || '*', '*')}
                    ${field('apizz-price-channel', 'Channel ID', item.channelId || '*', '*', 'text', '1', ' list="apizz-price-channel-options"')}
                    <datalist id="apizz-price-channel-options">
                        <option value="*" label="全部渠道"></option>
                        ${channelOptions}
                    </datalist>
                    ${field('apizz-price-input', '输入价格', item.inputPricePerMillion ?? 0, '0.2000', 'number', '0.000001')}
                    ${field('apizz-price-output', '输出价格', item.outputPricePerMillion ?? 0, '0.8000', 'number', '0.000001')}
                    ${field('apizz-price-priority', '优先级', item.priority ?? 100, '100', 'number')}
                    ${field('apizz-price-note', '备注', item.note || '', '成本价、套餐价或促销价')}
                    <label class="apizz-form-group apizz-checkbox-row">
                        <span class="apizz-form-label">启用价格</span>
                        <input id="apizz-price-enabled" type="checkbox" ${item.enabled === false ? '' : 'checked'}>
                    </label>
                </div>
                <div class="apizz-modal-actions">
                    <button class="apizz-ghost-btn" type="button" data-apizz-modal-close>取消</button>
                    <button class="apizz-primary-btn" type="button" data-apizz-price-save>保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        bindModalClose(overlay);
        overlay.querySelector('[data-apizz-price-save]')?.addEventListener('click', async buttonEvent => {
            const button = buttonEvent.currentTarget;
            if (button.disabled) return;
            button.disabled = true;
            try {
                prices = await ctx.actions.postDashboard('model-prices', {
                    id: item.id || '',
                    modelPattern: value('apizz-price-pattern'),
                    provider: value('apizz-price-provider') || '*',
                    channelId: value('apizz-price-channel') || '*',
                    inputPricePerMillion: numberValue('apizz-price-input', 0),
                    outputPricePerMillion: numberValue('apizz-price-output', 0),
                    priority: numberValue('apizz-price-priority', 100),
                    enabled: document.getElementById('apizz-price-enabled')?.checked !== false,
                    note: value('apizz-price-note')
                });
                loaded = true;
                closeModal();
                ctx.actions.render();
                ctx.actions.toast('价格规则已保存');
            } catch (error) {
                ctx.actions.toast(error.message || '价格规则保存失败');
            } finally {
                button.disabled = false;
            }
        });
        requestAnimationFrame(() => overlay.querySelector('#apizz-price-pattern')?.focus());
    }

    function openPlanModal(ctx, item = {}) {
        closeModal();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay apizz-ops-modal';
        overlay.innerHTML = `
            <div class="apizz-modal apizz-modal-wide">
                <div class="apizz-modal-title">${item.id ? '编辑套餐' : '新增套餐'}<small>balance package</small></div>
                <div class="apizz-form-grid apizz-ops-form-grid">
                    ${field('apizz-plan-name', '名称', item.name || '', '如 专业版')}
                    ${field('apizz-plan-price', '售价', item.price ?? '', '如 29.0000', 'number', '0.0001')}
                    ${field('apizz-plan-credit', '到账余额', item.credit ?? '', '如 35.0000', 'number', '0.0001')}
                    ${field('apizz-plan-quota', '额度说明', item.quota || '', '如 350 万 tokens')}
                    ${field('apizz-plan-badge', '标记', item.badge || '', '如 Pro')}
                    ${field('apizz-plan-priority', '优先级', item.priority ?? 100, '100', 'number')}
                    ${field('apizz-plan-note', '备注', item.note || '', '套餐说明或运营备注')}
                    <label class="apizz-form-group apizz-checkbox-row">
                        <span class="apizz-form-label">启用套餐</span>
                        <input id="apizz-plan-enabled" type="checkbox" ${item.enabled === false ? '' : 'checked'}>
                    </label>
                </div>
                <div class="apizz-modal-actions">
                    <button class="apizz-ghost-btn" type="button" data-apizz-modal-close>取消</button>
                    <button class="apizz-primary-btn" type="button" data-apizz-plan-save>保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        bindModalClose(overlay);
        overlay.querySelector('[data-apizz-plan-save]')?.addEventListener('click', async buttonEvent => {
            const button = buttonEvent.currentTarget;
            if (button.disabled) return;
            button.disabled = true;
            try {
                const price = numberValue('apizz-plan-price', 0);
                const credit = numberValue('apizz-plan-credit', 0);
                const enabled = document.getElementById('apizz-plan-enabled')?.checked !== false;
                if (price <= 0) {
                    throw new Error('套餐售价必须大于 0');
                }
                if (enabled && credit <= 0) {
                    throw new Error('到账余额必须大于 0');
                }
                plans = await ctx.actions.postDashboard('subscription-plans', {
                    id: item.id || '',
                    name: value('apizz-plan-name'),
                    price,
                    credit,
                    quota: value('apizz-plan-quota'),
                    badge: value('apizz-plan-badge'),
                    priority: numberValue('apizz-plan-priority', 100),
                    enabled,
                    note: value('apizz-plan-note')
                });
                syncCommercePlans(ctx);
                loaded = true;
                closeModal();
                ctx.actions.render();
                ctx.actions.toast('套餐已保存');
            } catch (error) {
                ctx.actions.toast(error.message || '套餐保存失败');
            } finally {
                button.disabled = false;
            }
        });
        requestAnimationFrame(() => overlay.querySelector('#apizz-plan-name')?.focus());
    }

    function field(id, label, currentValue, placeholder, type = 'text', step = '1', extraAttrs = '') {
        const safeType = type || 'text';
        const stepAttr = safeType === 'number' ? ` step="${step}"` : '';
        return `
            <label class="apizz-form-group" for="${id}">
                <span class="apizz-form-label">${escapeHtml(label)}</span>
                <input id="${id}" class="apizz-form-input" type="${safeType}" value="${escapeHtml(currentValue)}" placeholder="${escapeHtml(placeholder || '')}"${stepAttr}${extraAttrs}>
            </label>
        `;
    }

    function bindModalClose(overlay) {
        overlay.querySelectorAll('[data-apizz-modal-close]').forEach(button => {
            button.addEventListener('click', closeModal);
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeModal();
        });
    }

    function closeModal() {
        document.querySelector('.apizz-ops-modal')?.remove();
    }

    function value(id) {
        return String(document.getElementById(id)?.value || '').trim();
    }

    function numberValue(id, fallback) {
        const raw = value(id);
        if (!raw) return fallback;
        const number = Number(raw);
        return Number.isFinite(number) ? number : fallback;
    }

    function syncCommercePlans(ctx) {
        if (ctx && ctx.state) {
            ctx.state.subscriptionPlans = plans.filter(item => item.enabled);
        }
    }

    function compactUrl(url) {
        const value = String(url || '');
        return value.length <= 58 ? value : `${value.slice(0, 32)}...${value.slice(-18)}`;
    }

    function healthText(value) {
        const raw = String(value || '').toUpperCase();
        if (!raw) return '未知';
        if (raw.includes('HEALTH') || raw === 'OK') return '正常';
        if (raw.includes('DISABLED')) return '停用';
        if (raw.includes('DEGRADED')) return '降级';
        return raw;
    }

    function statusClass(currentStatus) {
        const value = String(currentStatus?.status || currentStatus?.health || '').toUpperCase();
        if (value.includes('HEALTH') || value === 'OK') return 'green';
        if (value.includes('DEGRADED')) return 'orange';
        return 'red';
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
})();
