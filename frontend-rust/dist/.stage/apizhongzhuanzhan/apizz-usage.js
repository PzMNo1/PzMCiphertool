(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    const PAYMENT_REVIEWER_EMAIL = '1551601828@qq.com';
    const WECHAT_QR_IMAGE = './apizhongzhuanzhan/weixinzhifu.jpg';

    let activeTab = 'recharge';
    let selectedAmount = 10;
    let paymentOrder = null;

    const TABS = [
        { id: 'recharge', label: '充值' },
        { id: 'subscription', label: '订阅' },
        { id: 'orders', label: '我的订单' }
    ];

    const RECHARGE_AMOUNTS = [5, 10, 20, 50];
    const PAYMENT_METHODS = [
        { id: 'wechat', label: '微信支付', meta: '人工审核入账' }
    ];
    const PLANS = [
        { id: 'basic', name: '基础版', price: 9, credit: 10, quota: '100 万 tokens', badge: 'Starter' }
    ];

    api.registerPage({
        id: 'usage',
        title: '充值/订阅',
        render(ctx) {
            const state = ctx.state;
            const h = ctx.helpers;
            const balance = h.numberValue(state.metrics.balance).toFixed(2);

            if (paymentOrder) {
                return `
                    <section id="apizz-page-usage" class="apizz-page apizz-subscribe-page">
                        ${renderPaymentPage(paymentOrder, h)}
                    </section>
                `;
            }

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
            bindOrderControls(ctx);
        }
    });

    function renderRechargePanel(ctx) {
        const state = ctx.state;
        const h = ctx.helpers;
        const balance = h.numberValue(state.metrics.balance).toFixed(2);
        const spend = h.numberValue(state.metrics.standardSpend || state.metrics.spend).toFixed(4);

        if (paymentOrder) {
            return `
                <section
                    id="apizz-recharge-panel"
                    class="apizz-subtab-panel ${activeTab === 'recharge' ? 'active' : ''}"
                    role="tabpanel"
                    data-apizz-panel="recharge"
                    ${activeTab === 'recharge' ? '' : 'hidden'}>
                    ${renderPaymentPage(paymentOrder, h)}
                </section>
            `;
        }

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
                            ${RECHARGE_AMOUNTS.map(amount => `
                                <button class="apizz-choice ${amount === selectedAmount ? 'active' : ''}" type="button" data-apizz-amount="${amount}">
                                    <span class="apizz-choice-value">$${amount}</span>
                                    <span class="apizz-choice-meta">到账余额 $${amount}</span>
                                </button>
                            `).join('')}
                        </div>

                        <div class="apizz-form-grid apizz-recharge-form">
                            <div class="apizz-form-group">
                                <label class="apizz-form-label" for="apizz-recharge-custom">自定义金额</label>
                                <input id="apizz-recharge-custom" class="apizz-form-input" type="number" min="0.0001" step="0.0001" value="${selectedAmount}" placeholder="例如 15">
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
                            <button class="apizz-primary-btn apizz-start-pay-btn" type="button" data-apizz-usage-action="start-pay">开始支付</button>
                            ${h.workflowButton('PAY', '兑换码充值', '活动码直接入账', 'redeem-code')}
                            <button class="apizz-ghost-btn apizz-usage-refresh" type="button" data-apizz-usage-action="refresh">刷新余额</button>
                        </div>
                    </section>
                </div>
            </section>
        `;
    }

    function renderPaymentPage(order, h) {
        const amount = h.numberValue(order.amount || selectedAmount);
        const expires = order.paymentExpiresAt ? h.escapeHtml(formatRemainTime(order.paymentExpiresAt)) : '29:31';
        return `
            <section class="apizz-wechat-pay-page" id="apizz-wechat-pay-page">
                <section class="apizz-card apizz-wechat-pay-card">
                    <div class="apizz-wechat-pay-title">请使用微信完成转账</div>
                    <div class="apizz-wechat-order-box">
                        <div><span>订单内容</span><strong>余额充值</strong></div>
                        <div><span>本次需支付</span><strong class="apizz-wechat-amount">¥${amount.toFixed(2)}</strong></div>
                    </div>
                    <div class="apizz-wechat-qr-frame">
                        <img src="${WECHAT_QR_IMAGE}" alt="微信支付二维码">
                    </div>
                    <div class="apizz-wechat-note">
                        <p>请使用微信扫一扫或长按识别二维码完成付款，付款后点击下方按钮提交审核。</p>
                        <p>支付完成后通常 10 分钟内到账，如未到账请联系客服。</p>
                        <p>客服：客服微信：senyunice</p>
                    </div>
                </section>
                <section class="apizz-card apizz-wechat-countdown">
                    <div>剩余支付时间</div>
                    <strong>${expires}</strong>
                    <span>${h.escapeHtml(orderStatusText(String(order.status || 'PENDING').toUpperCase()))}</span>
                </section>
                <div class="apizz-wechat-actions">
                    <button class="apizz-primary-btn apizz-wechat-done" type="button" data-apizz-order-id="${h.escapeHtml(order.id)}">我已完成支付</button>
                    <button class="apizz-ghost-btn apizz-wechat-cancel" type="button" data-apizz-order-id="${h.escapeHtml(order.id)}">取消订单</button>
                </div>
            </section>
        `;
    }

    function renderSubscriptionPanel(ctx) {
        const state = ctx.state;
        const h = ctx.helpers;
        const plans = Array.isArray(state.subscriptionPlans) && state.subscriptionPlans.length
            ? state.subscriptionPlans
            : PLANS;
        return `
            <section
                id="apizz-subscription-panel"
                class="apizz-subtab-panel ${activeTab === 'subscription' ? 'active' : ''}"
                role="tabpanel"
                data-apizz-panel="subscription"
                ${activeTab === 'subscription' ? '' : 'hidden'}>
                <div class="apizz-plan-grid">
                    ${plans.map(plan => `
                        <article class="apizz-card apizz-plan-card">
                            <div class="apizz-plan-badge">${h.escapeHtml(plan.badge)}</div>
                            <div class="apizz-panel-title">${h.escapeHtml(plan.name)}</div>
                            <div class="apizz-plan-price">$${h.numberValue(plan.price).toFixed(0)}<small>/月</small></div>
                            <div class="apizz-plan-credit">含 $${h.numberValue(plan.credit).toFixed(0)} 可用余额</div>
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
        const isReviewer = isPaymentReviewer(currentUser()?.email);
        const orders = Array.isArray(state.orders) ? state.orders : [];
        const ledger = Array.isArray(state.ledger) ? state.ledger : [];
        const rows = orders.length
            ? orders.slice(0, isReviewer ? 200 : 10).map(item => orderRow(item, h)).join('')
            : ledger
                .filter(item => String(item.type || '').toUpperCase() === 'ORDER_CREDIT')
                .slice(0, 10)
                .map(item => ledgerOrderRow(item, h, isReviewer))
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
                        <div class="apizz-panel-title">${isReviewer ? '支付审核' : '我的订单'} <small>${isReviewer ? '最多 200 条' : '最近 10 条'}</small></div>
                        <div class="apizz-orders-tools">
                            ${isReviewer ? '<button class="apizz-ghost-btn apizz-load-admin-orders" type="button">查看全部订单</button>' : ''}
                            <button class="apizz-ghost-btn apizz-usage-refresh" type="button" data-apizz-usage-action="refresh">刷新</button>
                        </div>
                    </div>
                    <div class="apizz-table-wrap apizz-orders-table-wrap">
                        <table class="apizz-table">
                            <thead>
                                <tr><th>订单/流水</th><th>用户</th><th>金额</th><th>方式</th><th>时间</th><th>备注</th>${isReviewer ? '<th>审核</th>' : ''}</tr>
                            </thead>
                            <tbody>
                                ${rows || `<tr><td colspan="${isReviewer ? '7' : '6'}" class="apizz-muted">暂无订单记录。</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </section>
            </section>
        `;
    }

    function orderRow(item, h) {
        const status = String(item.status || 'PENDING').toUpperCase();
        const isReviewer = isPaymentReviewer(currentUser()?.email);
        const canReview = isReviewer && status === 'PAYMENT_REVIEW';
        return `
            <tr>
                <td>${h.escapeHtml(item.id || '-')}<div class="apizz-muted">${h.escapeHtml(orderStatusText(status))}</div></td>
                <td class="apizz-muted">${h.escapeHtml(item.email || '-')}</td>
                <td>$${h.numberValue(item.amount).toFixed(4)}</td>
                <td>${h.escapeHtml(item.payMethod || 'manual')}</td>
                <td class="apizz-muted">${h.escapeHtml(item.createdAt || '-')}</td>
                <td class="apizz-muted">${h.escapeHtml(item.paymentInstructions || item.note || '')}</td>
                ${isReviewer ? `<td>
                    ${canReview ? `
                        <div class="apizz-key-actions">
                            <button class="apizz-key-action apizz-review-order" type="button" data-order-id="${h.escapeHtml(item.id)}" data-status="PAID">通过</button>
                            <button class="apizz-key-action danger apizz-review-order" type="button" data-order-id="${h.escapeHtml(item.id)}" data-status="CANCELLED">驳回</button>
                        </div>
                    ` : '<span class="apizz-muted">-</span>'}
                </td>` : ''}
            </tr>
        `;
    }

    function ledgerOrderRow(item, h, isReviewer) {
        const amount = h.numberValue(item.amount);
        const amountClass = amount >= 0 ? 'positive' : 'negative';
        return `
            <tr>
                <td>${h.escapeHtml(item.id || '-')}<div class="apizz-muted">${h.escapeHtml(item.type || 'ORDER_CREDIT')}</div></td>
                <td class="apizz-muted">-</td>
                <td class="apizz-ledger-amount ${amountClass}">$${amount.toFixed(4)}</td>
                <td>余额</td>
                <td class="apizz-muted">${h.escapeHtml(item.createdAt || '-')}</td>
                <td class="apizz-muted">$${h.numberValue(item.balanceAfter).toFixed(4)} ${h.escapeHtml(item.description || '')}</td>
                ${isReviewer ? '<td class="apizz-muted">-</td>' : ''}
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
                selectedAmount = Number(button.dataset.apizzAmount) || selectedAmount;
                const input = root.querySelector('#apizz-recharge-custom');
                if (input) input.value = selectedAmount;
            });
        });

        const customAmount = root.querySelector('#apizz-recharge-custom');
        if (customAmount) {
            customAmount.addEventListener('input', () => {
                const amount = Number(customAmount.value);
                if (Number.isFinite(amount) && amount > 0) selectedAmount = amount;
                root.querySelectorAll('[data-apizz-amount]').forEach(item => {
                    item.classList.toggle('active', Number(item.dataset.apizzAmount) === selectedAmount);
                });
            });
        }

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

        root.querySelector('[data-apizz-usage-action="start-pay"]')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            if (button.disabled) return;
            const amount = readRechargeAmount(root);
            if (!amount || amount <= 0) {
                ctx.actions.toast('请输入有效充值金额');
                return;
            }
            button.disabled = true;
            try {
                const order = await ctx.actions.postDashboard('orders', {
                    amount,
                    payMethod: 'wechat',
                    idempotencyKey: `wechat-${amount}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    note: '微信余额充值，待用户扫码付款'
                });
                selectedAmount = amount;
                paymentOrder = order;
                activeTab = 'recharge';
                ctx.actions.render();
                ctx.actions.toast('订单已创建，请扫码支付');
            } catch (error) {
                ctx.actions.toast(error.message || '订单创建失败');
            } finally {
                button.disabled = false;
            }
        });

        root.querySelector('.apizz-wechat-done')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            if (button.disabled) return;
            button.disabled = true;
            try {
                const order = await ctx.actions.postDashboard('orders/payment-review', {
                    orderId: button.dataset.apizzOrderId,
                    note: '用户点击我已完成支付，等待人工审核'
                });
                paymentOrder = null;
                activeTab = 'orders';
                await ctx.actions.loadDashboard({ message: '已提交人工审核，请等待入账' });
            } catch (error) {
                ctx.actions.toast(error.message || '提交审核失败');
            } finally {
                button.disabled = false;
            }
        });

        root.querySelector('.apizz-wechat-cancel')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            if (button.disabled) return;
            button.disabled = true;
            try {
                await ctx.actions.postDashboard('orders/cancel', {
                    orderId: button.dataset.apizzOrderId,
                    note: '用户在微信支付页取消订单'
                });
                paymentOrder = null;
                await ctx.actions.loadDashboard({ message: '订单已取消' });
            } catch (error) {
                ctx.actions.toast(error.message || '取消订单失败');
            } finally {
                button.disabled = false;
            }
        });
    }

    function bindSubscriptionControls(ctx) {
        const root = ctx.root;
        root.querySelectorAll('[data-apizz-plan]').forEach(button => {
            button.addEventListener('click', async () => {
                if (button.disabled) return;
                button.disabled = true;
                try {
                    await ctx.actions.postDashboard('subscriptions/orders', {
                        planId: button.dataset.apizzPlan,
                        payMethod: 'wechat',
                        idempotencyKey: `plan-${button.dataset.apizzPlan}-${Date.now()}-${Math.random().toString(36).slice(2)}`
                    });
                    activeTab = 'orders';
                    await ctx.actions.loadDashboard({ message: '订阅订单已创建，请按订单支付信息完成付款' });
                } catch (error) {
                    ctx.actions.toast(error.message || '订阅订单创建失败');
                } finally {
                    button.disabled = false;
                }
            });
        });
    }

    function bindOrderControls(ctx) {
        const root = ctx.root;
        root.querySelector('.apizz-load-admin-orders')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            if (button.disabled) return;
            button.disabled = true;
            try {
                const orders = await ctx.actions.getRouter('orders', { admin: true });
                ctx.state.orders = Array.isArray(orders) ? orders : [];
                ctx.actions.render();
                ctx.actions.toast('已加载全部订单');
            } catch (error) {
                ctx.actions.toast(error.message || '加载审核订单失败');
            } finally {
                button.disabled = false;
            }
        });

        root.querySelectorAll('.apizz-review-order').forEach(button => {
            button.addEventListener('click', async () => {
                if (button.disabled) return;
                const status = button.dataset.status;
                const orderId = button.dataset.orderId;
                const actionText = status === 'PAID' ? '通过' : '驳回';
                if (!window.confirm(`确认${actionText}订单 ${orderId}？`)) return;
                button.disabled = true;
                try {
                    const orders = await ctx.actions.postDashboard('orders/status', {
                        orderId,
                        status,
                        note: status === 'PAID' ? '人工审核通过，微信支付入账' : '人工审核驳回'
                    });
                    ctx.state.orders = Array.isArray(orders) ? orders : [];
                    ctx.actions.render();
                    ctx.actions.toast(status === 'PAID' ? '订单已入账' : '订单已驳回');
                } catch (error) {
                    ctx.actions.toast(error.message || '审核操作失败');
                } finally {
                    button.disabled = false;
                }
            });
        });
    }

    function orderStatusText(status) {
        if (status === 'PAID') return '已支付';
        if (status === 'PAYMENT_REVIEW') return '待人工审核';
        if (status === 'CANCELLED') return '已取消';
        return '待支付';
    }

    function readRechargeAmount(root) {
        const input = root.querySelector('#apizz-recharge-custom');
        const custom = Number(input && input.value);
        if (Number.isFinite(custom) && custom > 0) return custom;
        const active = root.querySelector('[data-apizz-amount].active');
        const preset = Number(active && active.dataset.apizzAmount);
        return Number.isFinite(preset) && preset > 0 ? preset : selectedAmount;
    }

    function currentUser() {
        return window.CipherAuth && typeof window.CipherAuth.getUser === 'function'
            ? window.CipherAuth.getUser()
            : null;
    }

    function isPaymentReviewer(email) {
        return String(email || '').trim().toLowerCase() === PAYMENT_REVIEWER_EMAIL;
    }

    function formatRemainTime(value) {
        const target = new Date(value).getTime();
        if (!Number.isFinite(target)) return '29:31';
        const leftSeconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
        const minutes = Math.floor(leftSeconds / 60);
        const seconds = leftSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
})();
