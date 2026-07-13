(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    let activeTab = 'recharge';
    let selectedAmount = 10;
    let selectedPayMethod = 'wechat';
    let paymentOrder = null;

    const TABS = [
        { id: 'recharge', label: '充值' },
        { id: 'subscription', label: '余额套餐' },
        { id: 'orders', label: '我的订单' }
    ];

    const RECHARGE_AMOUNTS = [5, 10, 20, 50];
    const PAYMENT_METHODS = [
        { id: 'wechat', label: '微信支付', meta: '扫码或收银台' }
    ];

    api.registerPage({
        id: 'usage',
        title: '充值/套餐',
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
                            <div class="apizz-panel-title">充值/套餐 <small>Balance $${balance}</small></div>
                        </div>
                        <div class="apizz-subtab-nav" role="tablist" aria-label="充值套餐分类">
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
                                <button class="apizz-pay-method ${method.id === selectedPayMethod || (!selectedPayMethod && index === 0) ? 'active' : ''}" type="button" data-apizz-pay-method="${h.escapeHtml(method.id)}">
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
        const payload = parsePaymentPayload(order.paymentPayload);
        const isPackageOrder = String(payload.orderType || '') === 'subscription-plan';
        const orderTitle = isPackageOrder && payload.planName
            ? `余额套餐：${payload.planName}`
            : '余额充值';
        const creditAmount = h.numberValue(payload.creditAmount);
        const creditLine = isPackageOrder && creditAmount > 0
            ? `<div><span>到账余额</span><strong>$${creditAmount.toFixed(2)}</strong></div>`
            : '';
        const supportLine = payload.supportText
            ? `<p>${h.escapeHtml(payload.supportText)}</p>`
            : '';
        const payMethod = String(order.payMethod || payload.provider || 'wechat').toLowerCase();
        const payMethodName = paymentMethodName(payMethod);
        const checkoutUrl = String(order.checkoutUrl || payload.checkoutUrl || '').trim();
        const qrCodeUrl = String(order.qrCodeUrl || payload.qrCodeUrl || '').trim();
        const qrImage = qrCodeUrl;
        const checkoutAction = checkoutUrl
            ? `<a class="apizz-primary-btn apizz-checkout-link" href="${h.escapeHtml(checkoutUrl)}" target="_blank" rel="noopener">打开收银台</a>`
            : '';
        const qrAlt = `${payMethodName} 支付二维码`;
        const qrContent = qrImage
            ? `<img src="${h.escapeHtml(qrImage)}" alt="${h.escapeHtml(qrAlt)}">${checkoutAction}`
            : checkoutAction || '<div class="apizz-payment-placeholder">请按支付说明完成付款</div>';
        const payActionText = checkoutUrl
            ? '请打开收银台完成付款，付款后刷新订单状态。'
            : qrImage
            ? '请扫码完成付款，付款后刷新订单状态。'
            : '当前支付通道未配置，请取消订单后选择其他方式。';
        const amountLabel = payMethod === 'wechat' || payMethod === 'alipay' ? '¥' : '$';
        const instructionLine = order.paymentInstructions
            ? `<p>${h.escapeHtml(order.paymentInstructions)}</p>`
            : '<p>支付完成后通常 10 分钟内到账，如未到账请联系管理员。</p>';
        return `
            <section class="apizz-checkout-page" id="apizz-checkout-page">
                <section class="apizz-card apizz-checkout-card">
                    <div class="apizz-checkout-title">请使用${h.escapeHtml(payMethodName)}完成支付</div>
                    <div class="apizz-checkout-order-box">
                        <div><span>订单内容</span><strong>${h.escapeHtml(orderTitle)}</strong></div>
                        <div><span>本次需支付</span><strong class="apizz-checkout-amount">${amountLabel}${amount.toFixed(2)}</strong></div>
                        ${creditLine}
                    </div>
                    <div class="apizz-checkout-qr-frame ${!qrImage ? 'apizz-checkout-only' : ''}">
                        ${qrContent}
                    </div>
                    <div class="apizz-checkout-note">
                        <p>${payActionText}</p>
                        ${instructionLine}
                        ${supportLine}
                    </div>
                </section>
                <section class="apizz-card apizz-checkout-countdown">
                    <div>剩余支付时间</div>
                    <strong>${expires}</strong>
                    <span>${h.escapeHtml(orderStatusText(String(order.status || 'PENDING').toUpperCase()))}</span>
                </section>
                <div class="apizz-checkout-actions">
                    <button class="apizz-primary-btn apizz-checkout-refresh" type="button">刷新支付状态</button>
                    <button class="apizz-ghost-btn apizz-checkout-cancel" type="button" data-apizz-order-id="${h.escapeHtml(order.id)}">取消订单</button>
                </div>
            </section>
        `;
    }

    function paymentMethodName(payMethod) {
        if (payMethod === 'alipay') return '支付宝';
        if (payMethod === 'stripe') return 'Stripe';
        return '微信';
    }

    function parsePaymentPayload(value) {
        if (!value || typeof value !== 'string') return {};
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function renderSubscriptionPanel(ctx) {
        const state = ctx.state;
        const h = ctx.helpers;
        const plans = Array.isArray(state.subscriptionPlans) ? state.subscriptionPlans : [];
        const planCards = plans.length
            ? plans.map(plan => `
                <article class="apizz-card apizz-plan-card">
                    <div class="apizz-plan-badge">${h.escapeHtml(plan.badge)}</div>
                    <div class="apizz-panel-title">${h.escapeHtml(plan.name)}</div>
                    <div class="apizz-plan-price">$${h.numberValue(plan.price).toFixed(2)}<small>一次性</small></div>
                    <div class="apizz-plan-credit">到账 $${h.numberValue(plan.credit).toFixed(2)} 可用余额</div>
                    <div class="apizz-plan-quota">${h.escapeHtml(plan.quota)}</div>
                    <button class="apizz-plan-btn" type="button" data-apizz-plan="${h.escapeHtml(plan.id)}">
                        选择套餐
                    </button>
                </article>
            `).join('')
            : `
                <article class="apizz-card apizz-plan-card apizz-empty-plan">
                    <div class="apizz-panel-title">暂无可购套餐</div>
                    <div class="apizz-muted">请联系运营配置余额套餐，或先使用自定义充值。</div>
                </article>
            `;
        return `
            <section
                id="apizz-subscription-panel"
                class="apizz-subtab-panel ${activeTab === 'subscription' ? 'active' : ''}"
                role="tabpanel"
                data-apizz-panel="subscription"
                ${activeTab === 'subscription' ? '' : 'hidden'}>
                <div class="apizz-plan-pay-note">
                    当前支付方式：<span data-apizz-selected-pay-label>${h.escapeHtml(paymentMethodName(selectedPayMethod))}</span>
                    <button class="apizz-key-action" type="button" data-apizz-subtab="recharge">更换</button>
                </div>
                <div class="apizz-plan-grid">
                    ${planCards}
                </div>
            </section>
        `;
    }

    function renderOrdersPanel(ctx) {
        const state = ctx.state;
        const h = ctx.helpers;
        const orders = Array.isArray(state.orders) ? state.orders : [];
        const ledger = Array.isArray(state.ledger) ? state.ledger : [];
        const rows = orders.length
            ? orders.slice(0, 10).map(item => orderRow(item, h)).join('')
            : ledger
                .filter(item => String(item.type || '').toUpperCase() === 'ORDER_CREDIT')
                .slice(0, 10)
                .map(item => ledgerOrderRow(item, h))
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
                        <div class="apizz-orders-tools">
                            <button class="apizz-ghost-btn apizz-usage-refresh" type="button" data-apizz-usage-action="refresh">刷新</button>
                        </div>
                    </div>
                    <div class="apizz-table-wrap apizz-orders-table-wrap">
                        <table class="apizz-table">
                            <thead>
                                <tr><th>订单/流水</th><th>用户</th><th>金额</th><th>方式</th><th>时间</th><th>备注</th></tr>
                            </thead>
                            <tbody>
                                ${rows || '<tr><td colspan="6" class="apizz-muted">暂无订单记录。</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </section>
            </section>
        `;
    }

    function orderRow(item, h) {
        const status = String(item.status || 'PENDING').toUpperCase();
        return `
            <tr>
                <td>${h.escapeHtml(item.id || '-')}<div class="apizz-muted">${h.escapeHtml(item.externalTradeNo || '未绑定流水号')}</div></td>
                <td class="apizz-muted">${h.escapeHtml(item.email || '-')}</td>
                <td>$${h.numberValue(item.amount).toFixed(4)}</td>
                <td>${h.escapeHtml(paymentMethodName(String(item.payMethod || 'wechat').toLowerCase()))}</td>
                <td class="apizz-muted">${h.escapeHtml(item.createdAt || '-')}</td>
                <td class="apizz-muted">${h.escapeHtml(orderStatusText(status))} ${h.escapeHtml(item.paymentInstructions || item.note || '')}</td>
            </tr>
        `;
    }

    function ledgerOrderRow(item, h) {
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
                updateSelectedPayMethodLabels(root);
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
                selectedPayMethod = button.dataset.apizzPayMethod || 'wechat';
                updateSelectedPayMethodLabels(root);
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
                const payMethod = selectedPaymentMethod(root);
                const order = await ctx.actions.postDashboard('orders', {
                    amount,
                    payMethod,
                    idempotencyKey: `${payMethod}-${amount}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    note: `${paymentMethodName(payMethod)}余额充值，待用户完成付款`
                });
                selectedAmount = amount;
                selectedPayMethod = payMethod;
                paymentOrder = order;
                activeTab = 'recharge';
                ctx.actions.render();
                ctx.actions.toast('订单已创建，请完成支付');
            } catch (error) {
                ctx.actions.toast(error.message || '订单创建失败');
            } finally {
                button.disabled = false;
            }
        });

        root.querySelector('.apizz-checkout-refresh')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            if (button.disabled) return;
            button.disabled = true;
            try {
                paymentOrder = null;
                activeTab = 'orders';
                await ctx.actions.loadDashboard({ message: '订单状态已刷新' });
            } catch (error) {
                ctx.actions.toast(error.message || '刷新订单失败');
            } finally {
                button.disabled = false;
            }
        });

        root.querySelector('.apizz-checkout-cancel')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            if (button.disabled) return;
            button.disabled = true;
            try {
                await ctx.actions.postDashboard('orders/cancel', {
                    orderId: button.dataset.apizzOrderId,
                    note: '用户在支付页取消订单'
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
                    const payMethod = selectedPaymentMethod(root);
                    const order = await ctx.actions.postDashboard('subscriptions/orders', {
                        planId: button.dataset.apizzPlan,
                        payMethod,
                        idempotencyKey: `plan-${button.dataset.apizzPlan}-${payMethod}-${Date.now()}-${Math.random().toString(36).slice(2)}`
                    });
                    selectedPayMethod = payMethod;
                    paymentOrder = order;
                    ctx.actions.toast('套餐订单已创建，请完成支付');
                    ctx.actions.render();
                } catch (error) {
                    ctx.actions.toast(error.message || '套餐订单创建失败');
                } finally {
                    button.disabled = false;
                }
            });
        });
    }

    function bindOrderControls(ctx) {
        void ctx;
    }

    function orderStatusText(status) {
        if (status === 'PAID') return '已支付';
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

    function selectedPaymentMethod(root) {
        const active = root.querySelector('[data-apizz-pay-method].active');
        const value = active && active.dataset.apizzPayMethod ? active.dataset.apizzPayMethod : selectedPayMethod;
        return PAYMENT_METHODS.some(method => method.id === value) ? value : 'wechat';
    }

    function updateSelectedPayMethodLabels(root) {
        root.querySelectorAll('[data-apizz-selected-pay-label]').forEach(item => {
            item.textContent = paymentMethodName(selectedPayMethod);
        });
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
