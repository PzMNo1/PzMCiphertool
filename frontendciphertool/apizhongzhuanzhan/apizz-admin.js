(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    let overview = null;
    let query = '';
    let loaded = false;
    let loading = false;
    let loadError = '';

    window.addEventListener('cipher-login-success', resetAdminState);
    window.addEventListener('cipher-logout-success', resetAdminState);

    function resetAdminState() {
        overview = null;
        query = '';
        loaded = false;
        loading = false;
        loadError = '';
    }

    api.registerPage({
        id: 'admin',
        title: '管理员后台',
        render(ctx) {
            const h = ctx.helpers;
            if (!overview && !loadError) {
                return `
                    <section id="apizz-page-admin" class="apizz-page apizz-admin-page">
                        <section class="apizz-card apizz-panel">
                            <div class="apizz-panel-title">正在加载管理员后台</div>
                            <p class="apizz-muted">正在读取用户余额与管理员操作记录。</p>
                        </section>
                    </section>
                `;
            }
            if (loadError && !overview) {
                return `
                    <section id="apizz-page-admin" class="apizz-page apizz-admin-page">
                        <section class="apizz-card apizz-panel">
                            <div class="apizz-panel-title">管理员后台加载失败</div>
                            <p class="apizz-muted">${h.escapeHtml(loadError)}</p>
                            <button class="apizz-ghost-btn" type="button" data-apizz-admin-action="reload">重试</button>
                        </section>
                    </section>
                `;
            }

            const users = Array.isArray(overview?.users) ? overview.users : [];
            const audits = Array.isArray(overview?.audits) ? overview.audits : [];
            const totalBalance = users.reduce((sum, item) => sum + h.numberValue(item.balance), 0);
            const totalSpend = users.reduce((sum, item) => sum + h.numberValue(item.spend), 0);
            const pendingOrders = users.reduce((sum, item) => sum + h.numberValue(item.pendingOrders), 0);
            const frozenUsers = users.filter(item => item.frozen).length;
            const userRows = users.length
                ? users.map(item => userRow(item, h)).join('')
                : '<tr><td colspan="9" class="apizz-muted">暂无用户数据。</td></tr>';
            const auditRows = audits.length
                ? audits.slice(0, 20).map(item => auditRow(item, h)).join('')
                : '<tr><td colspan="5" class="apizz-muted">暂无管理员操作记录。</td></tr>';

            return `
                <section id="apizz-page-admin" class="apizz-page apizz-admin-page">
                    <section class="apizz-card apizz-command-bar apizz-ops-command">
                        <div class="apizz-command-actions apizz-ops-actions apizz-admin-actions">
                            <button class="apizz-action apizz-work-action" type="button" data-apizz-admin-action="reload">
                                <span class="apizz-icon">RLD</span>
                                <span>
                                    <span class="apizz-action-title">刷新后台</span>
                                    <span class="apizz-action-desc">同步用户余额与流水</span>
                                </span>
                            </button>
                        </div>
                        <div class="apizz-filter-row">
                            <input id="apizz-admin-query" class="apizz-form-input apizz-admin-query" type="search" value="${h.escapeHtml(query)}" placeholder="搜索账号">
                            <button class="apizz-ghost-btn" type="button" data-apizz-admin-action="search">搜索</button>
                        </div>
                    </section>

                    ${loadError ? `<div class="apizz-empty-state">${h.escapeHtml(loadError)}</div>` : ''}

                    <div class="apizz-grid apizz-metric-grid apizz-ops-metrics">
                        ${h.metricCard('用户总数', users.length, `冻结 ${frozenUsers} 个`, 'USR', 'blue')}
                        ${h.metricCard('钱包总余额', `$${totalBalance.toFixed(2)}`, '全部账号合计', 'BAL', 'green')}
                        ${h.metricCard('累计消费', `$${totalSpend.toFixed(4)}`, '按真实调用计费', 'USD', 'orange')}
                        ${h.metricCard('待付订单', pendingOrders, '等待用户付款', 'ORD', 'purple')}
                    </div>

                    <section class="apizz-card apizz-panel apizz-panel-span apizz-ops-panel">
                        <div class="apizz-panel-title">用户余额 <small>admin wallet</small></div>
                        <div class="apizz-table-wrap apizz-ops-table-wrap">
                            <table class="apizz-table">
                                <thead><tr><th>账号</th><th>状态</th><th>余额</th><th>API Keys</th><th>请求</th><th>消费</th><th>待付</th><th>最近活动</th><th>操作</th></tr></thead>
                                <tbody>${userRows}</tbody>
                            </table>
                        </div>
                    </section>

                    <section class="apizz-card apizz-panel apizz-panel-span apizz-ops-panel">
                        <div class="apizz-panel-title">管理员操作记录 <small>recent audits</small></div>
                        <div class="apizz-table-wrap apizz-ops-table-wrap">
                            <table class="apizz-table">
                                <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>目标</th><th>详情</th></tr></thead>
                                <tbody>${auditRows}</tbody>
                            </table>
                        </div>
                    </section>
                </section>
            `;
        },
        bind(ctx) {
            if (!loaded && !loading && !loadError) {
                loadAdmin(ctx, false);
            }
            bindAdmin(ctx);
        }
    });

    function bindAdmin(ctx) {
        const root = ctx.root;
        root.querySelector('[data-apizz-admin-action="reload"]')?.addEventListener('click', () => loadAdmin(ctx, true));
        root.querySelector('[data-apizz-admin-action="search"]')?.addEventListener('click', () => {
            query = String(root.querySelector('#apizz-admin-query')?.value || '').trim();
            loadAdmin(ctx, false);
        });
        root.querySelector('#apizz-admin-query')?.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            query = String(event.currentTarget.value || '').trim();
            loadAdmin(ctx, false);
        });
        root.querySelectorAll('[data-apizz-admin-wallet]').forEach(button => {
            button.addEventListener('click', () => {
                const user = (overview?.users || []).find(item => item.email === button.dataset.apizzAdminWallet);
                if (user) openWalletModal(ctx, user);
            });
        });
    }

    async function loadAdmin(ctx, showToast) {
        if (loading) return;
        loading = true;
        loadError = '';
        try {
            overview = await ctx.actions.getRouter('admin/overview', {
                userLimit: 200,
                auditLimit: 30,
                query
            });
            loaded = true;
        } catch (error) {
            loadError = error.message || '需要管理员权限';
            loaded = true;
        } finally {
            loading = false;
        }
        ctx.actions.render();
        if (showToast) {
            ctx.actions.toast(loadError || '管理员后台已刷新');
        }
    }

    function userRow(item, h) {
        const email = String(item.email || '');
        const frozen = item.frozen === true;
        const statusClass = frozen ? 'disabled' : 'healthy';
        const keys = `${h.numberValue(item.enabledApiKeys)} / ${h.numberValue(item.apiKeys)}`;
        return `
            <tr>
                <td>
                    <div>${h.escapeHtml(email || '-')}</div>
                    <div class="apizz-muted">${h.escapeHtml(item.status || 'ACTIVE')}</div>
                </td>
                <td><span class="apizz-status-pill ${statusClass}">${frozen ? '冻结' : '正常'}</span></td>
                <td class="apizz-positive">$${h.numberValue(item.balance).toFixed(4)}</td>
                <td>${h.escapeHtml(keys)}</td>
                <td>${h.escapeHtml(h.numberValue(item.requests))}</td>
                <td>$${h.numberValue(item.spend).toFixed(4)}</td>
                <td>${h.escapeHtml(h.numberValue(item.pendingOrders))}</td>
                <td class="apizz-muted">${h.escapeHtml(item.lastActivity || '-')}</td>
                <td>
                    <button class="apizz-key-action" type="button" data-apizz-admin-wallet="${h.escapeHtml(email)}">调整余额</button>
                </td>
            </tr>
        `;
    }

    function auditRow(item, h) {
        const target = [item.targetType, item.targetId].filter(Boolean).join(':');
        return `
            <tr>
                <td class="apizz-muted">${h.escapeHtml(item.createdAt || '-')}</td>
                <td>${h.escapeHtml(item.operatorEmail || '-')}</td>
                <td>${h.escapeHtml(item.action || '-')}</td>
                <td>${h.escapeHtml(target || item.targetEmail || '-')}</td>
                <td class="apizz-muted">${h.escapeHtml(item.detail || '')}</td>
            </tr>
        `;
    }

    function openWalletModal(ctx, user) {
        closeWalletModal();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay apizz-admin-wallet-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal apizz-key-edit-modal">
                <div class="apizz-modal-title">调整余额 <small>${escapeHtml(user.email)}</small></div>
                <div class="apizz-key-edit-grid">
                    <div class="apizz-form-group apizz-key-edit-wide">
                        <label class="apizz-form-label">当前余额</label>
                        <input class="apizz-form-input" type="text" value="$${Number(user.balance || 0).toFixed(4)}" readonly>
                    </div>
                    <div class="apizz-form-group apizz-key-edit-wide">
                        <label class="apizz-form-label">调整金额</label>
                        <input id="apizz-admin-amount" class="apizz-form-input" type="number" step="0.0001" placeholder="正数充值，负数扣减">
                        <div class="apizz-form-hint">调整后余额不能为负，操作会写入钱包流水。</div>
                    </div>
                    <div class="apizz-form-group apizz-key-edit-wide">
                        <label class="apizz-form-label">备注</label>
                        <input id="apizz-admin-note" class="apizz-form-input" type="text" placeholder="例如：线下充值、活动赠送">
                    </div>
                </div>
                <div class="apizz-modal-actions apizz-key-edit-actions">
                    <button class="apizz-ghost-btn" type="button" data-apizz-admin-cancel>取消</button>
                    <button class="apizz-primary-btn" type="button" data-apizz-admin-save>保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('[data-apizz-admin-cancel]')?.addEventListener('click', closeWalletModal);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeWalletModal();
        });
        overlay.querySelector('[data-apizz-admin-save]')?.addEventListener('click', async buttonEvent => {
            const button = buttonEvent.currentTarget;
            if (button.disabled) return;
            const amount = Number(overlay.querySelector('#apizz-admin-amount')?.value);
            if (!Number.isFinite(amount) || Math.abs(amount) < 0.0001) {
                ctx.actions.toast('请输入非 0 的调整金额');
                return;
            }
            button.disabled = true;
            try {
                await ctx.actions.postDashboard('admin/wallet', {
                    targetEmail: user.email,
                    amount,
                    description: String(overlay.querySelector('#apizz-admin-note')?.value || '').trim()
                });
                closeWalletModal();
                await loadAdmin(ctx, false);
                ctx.actions.toast(loadError || '余额已调整');
                if (String(ctx.state.email || '').toLowerCase() === String(user.email || '').toLowerCase()) {
                    ctx.actions.loadDashboard();
                }
            } catch (error) {
                ctx.actions.toast(error.message || '余额调整失败');
            } finally {
                button.disabled = false;
            }
        });
        requestAnimationFrame(() => overlay.querySelector('#apizz-admin-amount')?.focus());
    }

    function closeWalletModal() {
        document.querySelector('.apizz-admin-wallet-overlay')?.remove();
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
