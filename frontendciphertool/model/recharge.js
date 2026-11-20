(function () {
    const PLANS_URL = '/api/agent-recharge/plans';
    const ORDERS_URL = '/api/agent-recharge/orders';
    const USAGE_URL = '/api/usage/summary';
    const ADMIN_ORDERS_URL = '/api/agent-recharge/admin/orders';
    const ADMIN_STATUS_URL = '/api/agent-recharge/admin/orders/status';

    const STATUS_LABELS = {
        PENDING: '待支付',
        PAYMENT_REVIEW: '待审核',
        PAID: '已到账',
        CANCELLED: '已取消',
        REFUNDED: '已退款'
    };

    const state = {
        plans: [],
        summary: null,
        orders: [],
        adminOrders: [],
        currentOrder: null,
        selectedPayMethod: 'wechat',
        countdownTimer: null,
        toastTimer: null,
        staleLogin: false
    };

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        bindLogin();
        bindPayMethods();
        bindDelegatedActions();
        loadPlans();
        refreshAccount();

        window.addEventListener('cipher-login-success', () => {
            state.staleLogin = false;
            refreshAccount();
        });
        window.addEventListener('cipher-logout-success', () => {
            state.summary = null;
            state.orders = [];
            state.adminOrders = [];
            state.currentOrder = null;
            state.staleLogin = false;
            renderAccount();
            renderOrders();
            renderAdmin();
            hidePayment();
        });
    }

    function apiBase() {
        const override = window.CIPHERTOOL_API_BASE || '';
        if (/^https?:\/\//i.test(override)) {
            return override.replace(/\/+$/, '');
        }
        return 'http://127.0.0.1:8080';
    }

    function authHeaders() {
        try {
            return window.CipherAuth?.getAuthHeaders?.() || {};
        } catch (error) {
            return {};
        }
    }

    function currentUser() {
        try {
            return window.CipherAuth?.getUser?.() || null;
        } catch (error) {
            return null;
        }
    }

    async function request(path, options = {}) {
        const response = await fetch(apiBase() + path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
                ...(options.headers || {})
            }
        });
        let payload = null;
        try {
            payload = await response.json();
        } catch (error) {
            payload = null;
        }
        if (!response.ok || !payload || payload.success === false) {
            const error = new Error(payload?.message || `${response.status} ${response.statusText}`);
            error.status = response.status;
            throw error;
        }
        return payload.data;
    }

    async function loadPlans() {
        const container = document.getElementById('recharge-plans');
        try {
            const plans = await request(PLANS_URL);
            state.plans = Array.isArray(plans) ? plans : [];
            renderPlans();
        } catch (error) {
            container.innerHTML = `<article class="result recharge-plan recharge-plan-error">套餐加载失败：${escapeHtml(error.message)}</article>`;
        }
    }

    function renderPlans() {
        const container = document.getElementById('recharge-plans');
        if (!state.plans.length) {
            container.innerHTML = '<article class="result recharge-plan">暂未开放充值套餐。</article>';
            return;
        }
        container.innerHTML = state.plans.map(plan => `
            <article class="result recharge-plan">
                <div class="recharge-plan-head">
                    <h3>${escapeHtml(plan.name || '充值套餐')}</h3>
                    ${plan.badge ? `<span class="recharge-plan-badge">${escapeHtml(plan.badge)}</span>` : ''}
                </div>
                <div class="recharge-plan-price"><span class="recharge-plan-currency">¥</span>${formatPrice(plan.price)}</div>
                <p class="recharge-plan-desc">${escapeHtml(plan.description || '')}</p>
                <ul class="recharge-plan-items">
                    <li><strong>${Number(plan.agentCredits) || 0}</strong><span>次研报 Agent</span></li>
                    <li><strong>${Number(plan.imageCredits) || 0}</strong><span>次图片生成</span></li>
                    <li><strong>${Number(plan.videoCredits) || 0}</strong><span>次视频生成</span></li>
                </ul>
                <button class="cyber-button recharge-buy-btn" type="button" data-buy-plan="${escapeHtml(plan.id)}">
                    <span class="cyber-button__tag">立即充值</span>
                </button>
            </article>
        `).join('');
    }

    async function refreshAccount() {
        const user = currentUser();
        const loginTip = document.getElementById('recharge-login-tip');
        const account = document.getElementById('recharge-account');
        const ordersSection = document.getElementById('recharge-orders-section');

        if (!user || state.staleLogin) {
            loginTip.hidden = false;
            account.hidden = true;
            ordersSection.hidden = true;
            renderAccount();
            renderOrders();
            renderAdmin();
            return;
        }

        loginTip.hidden = true;
        account.hidden = false;
        ordersSection.hidden = false;

        try {
            const [summary, orders] = await Promise.all([
                request(USAGE_URL),
                request(ORDERS_URL)
            ]);
            state.summary = summary;
            state.orders = Array.isArray(orders) ? orders : [];
        } catch (error) {
            if (error.status === 401) {
                state.staleLogin = true;
                loginTip.hidden = false;
                account.hidden = true;
                ordersSection.hidden = true;
                renderAccount();
                renderOrders();
                renderAdmin();
                toast('登录状态已失效，请重新登录');
                return;
            }
            toast(error.message || '额度加载失败');
        }

        renderAccount();
        renderOrders();
        loadAdminOrders();
    }

    function renderAccount() {
        const summary = state.summary;
        const cards = [
            { key: 'agent', totalId: 'recharge-agent-total', detailId: 'recharge-agent-detail', label: '研报 Agent' },
            { key: 'image', totalId: 'recharge-image-total', detailId: 'recharge-image-detail', label: '图片生成' },
            { key: 'video', totalId: 'recharge-video-total', detailId: 'recharge-video-detail', label: '视频生成' }
        ];
        cards.forEach(card => {
            const totalEl = document.getElementById(card.totalId);
            const detailEl = document.getElementById(card.detailId);
            if (!totalEl || !detailEl) return;
            const usage = summary?.[card.key];
            if (!usage || usage.unlimited) {
                totalEl.textContent = usage ? '不限次' : '--';
                detailEl.textContent = usage?.unlimited ? '当前账号无需额度' : '登录后查看';
                return;
            }
            const freeRemaining = Math.max(0, Number(usage.remaining) || 0);
            const credits = Math.max(0, Number(usage.credits) || 0);
            totalEl.textContent = String(freeRemaining + credits);
            detailEl.textContent = `今日免费剩余 ${freeRemaining} 次 · 已购 ${credits} 次`;
        });
    }

    function bindLogin() {
        document.getElementById('recharge-login-btn')?.addEventListener('click', () => {
            if (window.CipherAuth?.openModal) {
                window.CipherAuth.openModal();
            } else {
                toast('登录组件未加载，请返回首页登录');
            }
        });
    }

    function bindPayMethods() {
        document.querySelectorAll('.recharge-pay-method').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.recharge-pay-method').forEach(item => item.classList.remove('active'));
                button.classList.add('active');
                state.selectedPayMethod = button.dataset.payMethod || 'wechat';
            });
        });
    }

    function bindDelegatedActions() {
        document.addEventListener('click', event => {
            const buyButton = event.target.closest('[data-buy-plan]');
            if (buyButton) {
                buyPlan(buyButton.dataset.buyPlan);
                return;
            }
            const reviewButton = event.target.closest('[data-review-order]');
            if (reviewButton) {
                submitReview(reviewButton.dataset.reviewOrder);
                return;
            }
            const cancelButton = event.target.closest('[data-cancel-order]');
            if (cancelButton) {
                cancelOrder(cancelButton.dataset.cancelOrder);
                return;
            }
            const refreshButton = event.target.closest('[data-refresh-order]');
            if (refreshButton) {
                refreshOrder(refreshButton.dataset.refreshOrder);
                return;
            }
            const openButton = event.target.closest('[data-open-order]');
            if (openButton) {
                const order = state.orders.find(item => item.id === openButton.dataset.openOrder);
                if (order) {
                    state.currentOrder = order;
                    renderPayment();
                }
                return;
            }
            const adminButton = event.target.closest('[data-admin-order]');
            if (adminButton) {
                adminUpdateStatus(adminButton.dataset.adminOrder, adminButton.dataset.adminStatus);
            }
        });
    }

    async function buyPlan(planId) {
        if (!currentUser() || state.staleLogin) {
            toast('请先登录后再充值');
            window.CipherAuth?.openModal?.();
            return;
        }
        const buttons = document.querySelectorAll(`[data-buy-plan="${cssEscape(planId)}"]`);
        buttons.forEach(button => { button.disabled = true; });
        try {
            const order = await request(ORDERS_URL, {
                method: 'POST',
                body: JSON.stringify({
                    planId,
                    payMethod: state.selectedPayMethod,
                    idempotencyKey: `agent-recharge-${planId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    note: 'Agent 套餐充值'
                })
            });
            state.currentOrder = order;
            renderPayment();
            toast('订单已创建，请完成支付');
            await reloadOrdersOnly();
        } catch (error) {
            toast(error.message || '订单创建失败');
        } finally {
            buttons.forEach(button => { button.disabled = false; });
        }
    }

    function renderPayment() {
        const section = document.getElementById('recharge-payment-section');
        const container = document.getElementById('recharge-payment');
        const order = state.currentOrder;
        if (!order) {
            section.hidden = true;
            return;
        }
        section.hidden = false;
        clearCountdown();

        const status = String(order.status || 'PENDING').toUpperCase();
        const checkoutUrl = String(order.checkoutUrl || '').trim();
        const qrCodeUrl = String(order.qrCodeUrl || '').trim();
        const qrIsImage = /^data:image\//i.test(qrCodeUrl) || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(qrCodeUrl);
        const payLabel = order.payMethod === 'alipay' ? '支付宝' : (order.payMethod === 'stripe' ? 'Stripe' : '微信支付');
        const amount = Number(order.amount) || 0;
        const canReview = status === 'PENDING';
        const showCountdown = status === 'PENDING' || status === 'PAYMENT_REVIEW';

        container.innerHTML = `
            <article class="result recharge-payment-card">
                <div class="recharge-payment-head">
                    <div>
                        <div class="recharge-payment-plan">${escapeHtml(order.planName || 'Agent 充值套餐')}</div>
                        <div class="recharge-payment-meta">订单号：${escapeHtml(order.id || '')}</div>
                    </div>
                    <span class="recharge-status recharge-status-${status.toLowerCase()}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
                </div>
                <div class="recharge-payment-amount">¥${formatPrice(amount)}</div>
                <div class="recharge-payment-body">
                    <div class="recharge-payment-instructions">
                        <p>${escapeHtml(order.paymentInstructions || (qrIsImage ? '请使用' + payLabel + '扫码完成支付。' : '请完成支付后点击“我已完成支付”，等待管理员确认到账。'))}</p>
                        ${showCountdown ? `<p class="recharge-payment-countdown">剩余支付时间：<strong id="recharge-payment-countdown">--:--</strong></p>` : ''}
                        ${status === 'PAYMENT_REVIEW' ? '<p class="recharge-payment-review-tip">已提交支付审核，管理员确认后额度会自动到账。</p>' : ''}
                        ${status === 'PAID' ? '<p class="recharge-payment-paid-tip">支付已确认，额度已计入账号。</p>' : ''}
                    </div>
                    ${qrIsImage ? `<div class="recharge-payment-qr"><img src="${escapeHtml(qrCodeUrl)}" alt="${escapeHtml(payLabel)}收款码"><span>${escapeHtml(payLabel)}扫码支付</span></div>` : ''}
                </div>
                <div class="recharge-payment-actions">
                    ${checkoutUrl ? `<a class="cyber-button recharge-checkout-link" href="${escapeHtml(checkoutUrl)}" target="_blank" rel="noopener"><span class="cyber-button__tag">打开收银台</span></a>` : ''}
                    ${canReview ? `<button class="cyber-button" type="button" data-review-order="${escapeHtml(order.id)}"><span class="cyber-button__tag">我已完成支付</span></button>` : ''}
                    <button class="cyber-button" type="button" data-refresh-order="${escapeHtml(order.id)}"><span class="cyber-button__tag">刷新支付状态</span></button>
                    ${status === 'PENDING' ? `<button class="cyber-button recharge-muted-btn" type="button" data-cancel-order="${escapeHtml(order.id)}"><span class="cyber-button__tag">取消订单</span></button>` : ''}
                </div>
            </article>
        `;
        if (showCountdown) {
            startCountdown(order.paymentExpiresAt);
        }
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function hidePayment() {
        clearCountdown();
        state.currentOrder = null;
        document.getElementById('recharge-payment-section').hidden = true;
    }

    function startCountdown(expiresAt) {
        const target = new Date(expiresAt).getTime();
        const el = document.getElementById('recharge-payment-countdown');
        if (!el) return;
        const update = () => {
            if (!Number.isFinite(target)) {
                el.textContent = '--:--';
                return;
            }
            const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
            el.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
            if (left <= 0) clearCountdown();
        };
        update();
        state.countdownTimer = window.setInterval(update, 1000);
    }

    function clearCountdown() {
        if (state.countdownTimer) {
            window.clearInterval(state.countdownTimer);
            state.countdownTimer = null;
        }
    }

    async function submitReview(orderId) {
        try {
            state.currentOrder = await request(`${ORDERS_URL}/payment-review`, {
                method: 'POST',
                body: JSON.stringify({ orderId, note: '用户已完成支付，等待管理员确认' })
            });
            renderPayment();
            toast('已提交支付审核');
            await reloadOrdersOnly();
        } catch (error) {
            toast(error.message || '提交失败');
        }
    }

    async function cancelOrder(orderId) {
        try {
            state.currentOrder = await request(`${ORDERS_URL}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ orderId, note: '用户取消充值订单' })
            });
            renderPayment();
            toast('订单已取消');
            await reloadOrdersOnly();
        } catch (error) {
            toast(error.message || '取消失败');
        }
    }

    async function refreshOrder(orderId) {
        try {
            const orders = await request(ORDERS_URL);
            state.orders = Array.isArray(orders) ? orders : [];
            const latest = state.orders.find(item => item.id === orderId);
            if (latest) {
                state.currentOrder = latest;
                renderPayment();
                if (latest.status === 'PAID') {
                    toast('支付已确认，额度已到账');
                    await refreshAccount();
                } else {
                    toast('订单状态已刷新');
                }
            } else {
                toast('订单不存在');
            }
            renderOrders();
        } catch (error) {
            toast(error.message || '刷新失败');
        }
    }

    async function reloadOrdersOnly() {
        try {
            const orders = await request(ORDERS_URL);
            state.orders = Array.isArray(orders) ? orders : [];
            renderOrders();
        } catch (error) {
            // 支付页已经创建成功，订单列表刷新失败不阻塞支付流程。
        }
    }

    function renderOrders() {
        const section = document.getElementById('recharge-orders-section');
        const container = document.getElementById('recharge-orders');
        if (!currentUser() || state.staleLogin) {
            section.hidden = true;
            return;
        }
        if (!state.orders.length) {
            container.innerHTML = '<article class="result recharge-order-empty">还没有充值订单。</article>';
            return;
        }
        container.innerHTML = state.orders.slice(0, 10).map(order => {
            const status = String(order.status || 'PENDING').toUpperCase();
            const action = status === 'PENDING' || status === 'PAYMENT_REVIEW' || status === 'PAID'
                ? `<button class="recharge-order-action" type="button" data-open-order="${escapeHtml(order.id)}">查看</button>`
                : '';
            return `
                <article class="result recharge-order-row">
                    <div class="recharge-order-main">
                        <strong>${escapeHtml(order.planName || 'Agent 充值套餐')}</strong>
                        <span>¥${formatPrice(order.amount)} · ${escapeHtml(formatTime(order.createdAt))}</span>
                    </div>
                    <span class="recharge-status recharge-status-${status.toLowerCase()}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
                    ${action}
                </article>
            `;
        }).join('');
    }

    async function loadAdminOrders() {
        const section = document.getElementById('recharge-admin-section');
        try {
            const orders = await request(ADMIN_ORDERS_URL);
            state.adminOrders = Array.isArray(orders) ? orders : [];
            section.hidden = false;
            renderAdmin();
        } catch (error) {
            section.hidden = true;
            state.adminOrders = [];
        }
    }

    function renderAdmin() {
        const container = document.getElementById('recharge-admin-orders');
        const section = document.getElementById('recharge-admin-section');
        if (section.hidden) return;
        const pending = state.adminOrders.filter(order => ['PENDING', 'PAYMENT_REVIEW'].includes(String(order.status || '').toUpperCase()));
        if (!pending.length) {
            container.innerHTML = '<article class="result recharge-order-empty">暂无待审核订单。</article>';
            return;
        }
        container.innerHTML = pending.map(order => `
            <article class="result recharge-order-row recharge-admin-row">
                <div class="recharge-order-main">
                    <strong>${escapeHtml(order.planName || 'Agent 充值套餐')} · ¥${formatPrice(order.amount)}</strong>
                    <span>${escapeHtml(order.email || '')} · ${escapeHtml(formatTime(order.createdAt))} · 订单号 ${escapeHtml(order.id || '')}</span>
                    ${order.note ? `<span class="recharge-admin-note">${escapeHtml(order.note)}</span>` : ''}
                </div>
                <div class="recharge-admin-actions">
                    <button class="recharge-order-action recharge-approve" type="button" data-admin-order="${escapeHtml(order.id)}" data-admin-status="PAID">确认到账</button>
                    <button class="recharge-order-action" type="button" data-admin-order="${escapeHtml(order.id)}" data-admin-status="CANCELLED">取消</button>
                </div>
            </article>
        `).join('');
    }

    async function adminUpdateStatus(orderId, status) {
        const label = status === 'PAID' ? '确认到账' : '取消';
        if (!window.confirm(`确定要${label}该订单吗？`)) {
            return;
        }
        try {
            const orders = await request(ADMIN_STATUS_URL, {
                method: 'POST',
                body: JSON.stringify({
                    orderId,
                    status,
                    note: status === 'PAID' ? '管理员确认已收到充值款项' : '管理员取消充值订单'
                })
            });
            state.adminOrders = Array.isArray(orders) ? orders : [];
            renderAdmin();
            toast(status === 'PAID' ? '已确认到账，额度已入账' : '订单已取消');
            await refreshAccount();
        } catch (error) {
            toast(error.message || '操作失败');
        }
    }

    function toast(message) {
        const el = document.getElementById('recharge-toast');
        if (!el) return;
        el.textContent = message;
        el.hidden = false;
        if (state.toastTimer) window.clearTimeout(state.toastTimer);
        state.toastTimer = window.setTimeout(() => {
            el.hidden = true;
        }, 3200);
    }

    function formatPrice(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '0';
        return Number.isInteger(number) ? String(number) : number.toFixed(1);
    }

    function formatTime(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('zh-CN', { hour12: false });
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(value);
        }
        return String(value).replace(/["\\]/g, '\\$&');
    }
})();
