(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    let activeTab = 'recharge';

    const TABS = [
        { id: 'recharge', label: '充值' },
        { id: 'subscription', label: '订阅' },
        { id: 'orders', label: '我的订单' }
    ];

    const RECHARGE_AMOUNTS = [5, 10, 20, 50];
    const PAYMENT_METHODS = [
        { id: 'manual', label: '手动付款', meta: '线下确认' },
        { id: 'alipay', label: '支付宝', meta: '待接入' },
        { id: 'wechat', label: '微信支付', meta: '待接入' },
        { id: 'stripe', label: 'Stripe', meta: '待接入' }
    ];
    const PLANS = [
        { id: 'basic', name: '基础版', price: 9, credit: 10, quota: '100 万 tokens', badge: 'Starter' },
        { id: 'standard', name: '标准版', price: 29, credit: 35, quota: '500 万 tokens', badge: 'Standard' },
        { id: 'pro', name: '专业版', price: 99, credit: 130, quota: '2000 万 tokens', badge: 'Pro' }
    ];

    api.registerPage({
        id: 'usage',
        title: '充值/订阅',
        render(ctx) {
            const state = ctx.state;
            const h = ctx.helpers;
            const balance = h.numberValue(state.metrics.balance).toFixed(2);

            return `
                <section id="apizz-page-usage" class="apizz-page apizz-subscribe-page">
                    <section class="apizz-card apizz-usage-switcher">
                        <div>
                            <div class="apizz-panel-title">充值/订阅 <small>Balance $${balance}</small></div>
                        </div>
                        <div class="apizz-subtab-nav" role="tablist" aria-label="充值订阅分类">
                            ${TABS.map(tab => `
                                <button
                                    class="apizz-subtab ${tab.id === activeTab ? 'active' : ''}"
                                    type="button"
                                    role="tab"
                                    aria-selected="${tab.id === activeTab ? 'true' : 'false'}"
                                    aria-controls="apizz-${tab.id}-panel"
                                    data-apizz-subtab="${h.escapeHtml(tab.id)}">
                                    ${h.escapeHtml(tab.label)}
                                </button>
                            `).join('')}
                        </div>
                    </section>

                    <div class="apizz-subtab-panels">
                        ${renderRechargePanel(ctx)}
                        ${renderSubscriptionPanel(ctx)}
                        ${renderOrdersPanel(ctx)}
                    </div>
                </section>
            `;
        },
        bind(ctx) {
            bindTabs(ctx);
            bindRechargeControls(ctx);
            bindSubscriptionControls(ctx);
        }
    });

    function renderRechargePanel(ctx) {
        const state = ctx.state;
        const h = ctx.helpers;
        const balance = h.numberValue(state.metrics.balance).toFixed(2);
        const spend = h.numberValue(state.metrics.standardSpend || state.metrics.spend).toFixed(4);

        return `
            <section
                id="apizz-recharge-panel"
                class="apizz-subtab-panel ${activeTab === 'recharge' ? 'active' : ''}"
                role="tabpanel"
                data-apizz-panel="recharge"
                ${activeTab === 'recharge' ? '' : 'hidden'}>
                <div class="apizz-recharge-grid">
                    <section class="apizz-card apizz-panel apizz-recharge-main">
                        <div class="apizz-billing-summary">
                            <div>
                                <div class="apizz-label">当前余额</div>
                                <div class="apizz-billing-balance">$${balance}</div>
                            </div>
                            <div class="apizz-muted">累计标准消费 $${spend}</div>
                        </div>

                        <div class="apizz-panel-title">充值金额</div>
                        <div class="apizz-amount-grid" aria-label="充值金额">
                            ${RECHARGE_AMOUNTS.map((amount, index) => `
                                <button class="apizz-choice ${index === 1 ? 'active' : ''}" type="button" data-apizz-amount="${amount}">
                                    <span class="apizz-choice-value">$${amount}</span>
                                    <span class="apizz-choice-meta">到账余额 $${amount}</span>
                                </button>
                            `).join('')}
                        </div>

                        <div class="apizz-form-grid apizz-recharge-form">
                            <div class="apizz-form-group">
                                <label class="apizz-form-label" for="apizz-recharge-custom">自定义金额</label>
                                <input id="apizz-recharge-custom" class="apizz-form-input" type="number" min="0.0001" step="0.0001" placeholder="例如 15">
                            </div>
                            <div class="apizz-form-group">
                                <label class="apizz-form-label" for="apizz-recharge-promo">促销码</label>
                                <input id="apizz-recharge-promo" class="apizz-form-input" type="text" placeholder="可选">
                            </div>
                        </div>
                    </section>

                    <section class="apizz-card apizz-panel apizz-recharge-side">
                        <div class="apizz-panel-title">支付方式</div>
                        <div class="apizz-payment-methods">
                            ${PAYMENT_METHODS.map((method, index) => `
                                <button class="apizz-pay-method ${index === 0 ? 'active' : ''}" type="button" data-apizz-pay-method="${h.escapeHtml(method.id)}">
                                    <span>${h.escapeHtml(method.label)}</span>
                                    <small>${h.escapeHtml(method.meta)}</small>
                                </button>
                            `).join('')}
                        </div>

                        <div class="apizz-action-list apizz-usage-actions">
                            ${h.workflowButton('PAY', '兑换码充值', '活动码直接入账', 'redeem-code')}
                            <button class="apizz-ghost-btn apizz-usage-refresh" type="button" data-apizz-usage-action="refresh">刷新余额</button>
                        </div>
                    </section>
                </div>
            </section>
        `;
    }

    function renderSubscriptionPanel(ctx) {
        const h = ctx.helpers;
        return `
            <section
                id="apizz-subscription-panel"
                class="apizz-subtab-panel ${activeTab === 'subscription' ? 'active' : ''}"
                role="tabpanel"
                data-apizz-panel="subscription"
                ${activeTab === 'subscription' ? '' : 'hidden'}>
                <div class="apizz-plan-grid">
                    ${PLANS.map(plan => `
                        <article class="apizz-card apizz-plan-card">
                            <div class="apizz-plan-badge">${h.escapeHtml(plan.badge)}</div>
                            <div class="apizz-panel-title">${h.escapeHtml(plan.name)}</div>
                            <div class="apizz-plan-price">$${plan.price}<small>/月</small></div>
                            <div class="apizz-plan-credit">含 $${plan.credit} 可用余额</div>
                            <div class="apizz-plan-quota">${h.escapeHtml(plan.quota)}</div>
                            <button class="apizz-plan-btn" type="button" data-apizz-plan="${h.escapeHtml(plan.id)}">
                                选择套餐
                            </button>
                        </article>
                    `).join('')}
                </div>
            </section>
        `;
    }

    function renderOrdersPanel(ctx) {
        const state = ctx.state;
        const h = ctx.helpers;
        const ledger = Array.isArray(state.ledger) ? state.ledger : [];
        const orderRows = ledger
            .filter(item => String(item.type || '').toUpperCase() === 'ORDER_CREDIT')
            .slice(0, 10)
            .map(item => orderRow(item, h))
            .join('');

        return `
            <section
                id="apizz-orders-panel"
                class="apizz-subtab-panel ${activeTab === 'orders' ? 'active' : ''}"
                role="tabpanel"
                data-apizz-panel="orders"
                ${activeTab === 'orders' ? '' : 'hidden'}>
                <section class="apizz-card apizz-panel apizz-orders-panel">
                    <div class="apizz-orders-head">
                        <div class="apizz-panel-title">我的订单 <small>最近 10 条</small></div>
                        <button class="apizz-ghost-btn apizz-usage-refresh" type="button" data-apizz-usage-action="refresh">刷新</button>
                    </div>
                    <div class="apizz-table-wrap apizz-orders-table-wrap">
                        <table class="apizz-table">
                            <thead>
                                <tr><th>订单/流水</th><th>金额</th><th>余额</th><th>时间</th><th>备注</th></tr>
                            </thead>
                            <tbody>
                                ${orderRows || '<tr><td colspan="5" class="apizz-muted">暂无订单记录。</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </section>
            </section>
        `;
    }

    function orderRow(item, h) {
        const amount = h.numberValue(item.amount);
        const amountClass = amount >= 0 ? 'positive' : 'negative';
        return `
            <tr>
                <td>${h.escapeHtml(item.id || '-')}<div class="apizz-muted">${h.escapeHtml(item.type || 'ORDER_CREDIT')}</div></td>
                <td class="apizz-ledger-amount ${amountClass}">$${amount.toFixed(4)}</td>
                <td>$${h.numberValue(item.balanceAfter).toFixed(4)}</td>
                <td class="apizz-muted">${h.escapeHtml(item.createdAt || '-')}</td>
                <td class="apizz-muted">${h.escapeHtml(item.description || '')}</td>
            </tr>
        `;
    }

    function bindTabs(ctx) {
        const root = ctx.root;
        root.querySelectorAll('[data-apizz-subtab]').forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.apizzSubtab || 'recharge';
                activeTab = tab;
                root.querySelectorAll('[data-apizz-subtab]').forEach(item => {
                    const isActive = item.dataset.apizzSubtab === tab;
                    item.classList.toggle('active', isActive);
                    item.setAttribute('aria-selected', isActive ? 'true' : 'false');
                });
                root.querySelectorAll('[data-apizz-panel]').forEach(panel => {
                    const isActive = panel.dataset.apizzPanel === tab;
                    panel.classList.toggle('active', isActive);
                    panel.hidden = !isActive;
                });
            });
        });
    }

    function bindRechargeControls(ctx) {
        const root = ctx.root;
        root.querySelectorAll('[data-apizz-amount]').forEach(button => {
            button.addEventListener('click', () => {
                root.querySelectorAll('[data-apizz-amount]').forEach(item => item.classList.remove('active'));
                button.classList.add('active');
                const input = root.querySelector('#apizz-recharge-custom');
                if (input) input.value = button.dataset.apizzAmount || '';
            });
        });

        root.querySelectorAll('[data-apizz-pay-method]').forEach(button => {
            button.addEventListener('click', () => {
                root.querySelectorAll('[data-apizz-pay-method]').forEach(item => item.classList.remove('active'));
                button.classList.add('active');
            });
        });

        root.querySelectorAll('[data-apizz-usage-action="refresh"]').forEach(button => {
            button.addEventListener('click', () => {
                ctx.actions.loadDashboard({ message: '余额和订单数据已刷新' });
            });
        });
    }

    function bindSubscriptionControls(ctx) {
        const root = ctx.root;
        root.querySelectorAll('[data-apizz-plan]').forEach(button => {
            button.addEventListener('click', () => {
                const plan = PLANS.find(item => item.id === button.dataset.apizzPlan);
                ctx.actions.toast(plan ? `已选择${plan.name}` : '已选择套餐');
            });
        });
    }
})();
