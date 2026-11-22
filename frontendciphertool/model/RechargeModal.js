/**
 * Agent 充值弹窗。
 *
 * 侧边栏/额度提示里的「充值」不再跳转到独立充值页，而是在当前 Agent 页面上
 * 弹出只包含两档套餐的紧凑面板；额度展示继续复用右侧边栏。
 */
(function () {
    const PLANS_URL = '/api/agent-recharge/plans';
    const ORDERS_URL = '/api/agent-recharge/orders';
    const ADMIN_ORDERS_URL = '/api/agent-recharge/admin/orders';
    const ADMIN_STATUS_URL = '/api/agent-recharge/admin/orders/status';
    const STATIC_QR = './model/recharge-pay-wechat.jpg';
    const STATUS_TEXT = {
        PENDING: '待支付',
        PAYMENT_REVIEW: '待审核',
        PAID: '已到账',
        CANCELLED: '已取消',
        REFUNDED: '已退款'
    };

    const state = {
        plans: [],
        order: null,
        selectedPayMethod: 'wechat',
        reviewer: false,
        busy: false,
        countdownTimer: null,
        noteTimer: null
    };

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

    function ensureModal() {
        if (document.getElementById('agent-recharge-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'agent-recharge-modal';
        modal.className = 'agent-recharge-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="agent-recharge-modal__backdrop" data-recharge-close></div>
            <section class="result agent-recharge-modal__panel" role="dialog" aria-modal="true" aria-labelledby="agent-recharge-modal-title">
                <header class="agent-recharge-modal__head">
                    <div>
                        <h3 class="agent-recharge-modal__title" id="agent-recharge-modal-title">充值</h3>
                        <p class="agent-recharge-modal__subtitle">选择套餐，额度会绑定到当前账号</p>
                    </div>
                    <button class="agent-recharge-modal__close" type="button" data-recharge-close aria-label="关闭充值面板">×</button>
                </header>
                <div class="agent-recharge-modal__body" id="agent-recharge-modal-body"></div>
                <footer class="agent-recharge-modal__foot" id="agent-recharge-modal-foot"></footer>
            </section>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', handleClick);
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !modal.hidden) close();
        });
    }

    function modalEl() {
        return document.getElementById('agent-recharge-modal');
    }

    function open() {
        ensureModal();
        const modal = modalEl();
        if (!modal) return;
        state.order = null;
        clearCountdown();
        modal.hidden = false;
        document.body.classList.add('agent-recharge-modal-open');
        renderPlans();
        loadPlans();
        loadReviewerState();
    }

    function close() {
        const modal = modalEl();
        if (!modal) return;
        state.order = null;
        clearCountdown();
        modal.hidden = true;
        document.body.classList.remove('agent-recharge-modal-open');
    }

    async function loadPlans() {
        try {
            const plans = await request(PLANS_URL);
            state.plans = Array.isArray(plans) ? plans : [];
            if (state.plans.length) renderPlans();
        } catch (error) {
            const body = document.getElementById('agent-recharge-modal-body');
            if (body) body.innerHTML = `<p class="agent-recharge-modal__error">套餐加载失败：${escapeHtml(error.message)}</p>`;
        }
    }

    function renderPlans() {
        const body = document.getElementById('agent-recharge-modal-body');
        if (!body) return;
        if (!state.plans.length) {
            body.innerHTML = '<p class="agent-recharge-modal__loading">正在加载套餐…</p>';
            return;
        }
        body.innerHTML = `
            <div class="agent-recharge-modal__grid">
                ${state.plans.map(plan => `
                    <article class="result agent-recharge-plan">
                        <div class="agent-recharge-plan__head">
                            <span class="agent-recharge-plan__name">${escapeHtml(plan.name || '充值套餐')}</span>
                            ${plan.badge ? `<span class="agent-recharge-plan__badge">${escapeHtml(plan.badge)}</span>` : ''}
                        </div>
                        <div class="agent-recharge-plan__price"><span>¥</span>${formatPrice(plan.price)}</div>
                        <p class="agent-recharge-plan__desc">${escapeHtml(plan.description || '')}</p>
                        <ul class="agent-recharge-plan__items">
                            <li><strong>${Number(plan.agentCredits) || 0}</strong><span>次研报 Agent</span></li>
                            <li><strong>${Number(plan.agentmasterCredits) || 0}</strong><span>次 Agentmaster</span></li>
                            <li><strong>${Number(plan.imageCredits) || 0}</strong><span>次图片生成</span></li>
                            <li><strong>${Number(plan.videoCredits) || 0}</strong><span>次视频生成</span></li>
                        </ul>
                        <button class="cyber-button agent-recharge-plan__buy" type="button" data-recharge-plan="${escapeHtml(plan.id)}">
                            <span class="cyber-button__tag">立即充值</span>
                        </button>
                    </article>
                `).join('')}
            </div>
        `;
        renderFooter();
    }

    function renderFooter() {
        const footer = document.getElementById('agent-recharge-modal-foot');
        if (!footer) return;
        footer.innerHTML = `
            <span>额度可在右侧「本账号剩余使用次数」查看</span>
            ${state.reviewer ? '<a class="agent-recharge-admin-link" href="./model/recharge.html?admin=1" target="_blank" rel="noopener">支付审核</a>' : ''}
        `;
    }

    function renderPayment() {
        const body = document.getElementById('agent-recharge-modal-body');
        const order = state.order;
        if (!body || !order) return;
        clearCountdown();
        const status = String(order.status || 'PENDING').toUpperCase();
        const isWechat = String(order.payMethod || 'wechat').toLowerCase() === 'wechat';
        const showQr = isWechat && status === 'PENDING';
        const instruction = showQr
            ? '请使用微信扫描下方收款码完成支付，付款后点击“我已完成支付”，等待管理员确认到账。'
            : (order.paymentInstructions || '请完成支付后等待管理员确认到账。');
        body.innerHTML = `
            <div class="result agent-recharge-payment">
                <div class="agent-recharge-payment__head">
                    <div>
                        <div class="agent-recharge-payment__plan">${escapeHtml(order.planName || '充值套餐')}</div>
                        <div class="agent-recharge-payment__meta">订单号：${escapeHtml(order.id || '')}</div>
                    </div>
                    <span class="agent-recharge-status agent-recharge-status--${status.toLowerCase()}">${escapeHtml(STATUS_TEXT[status] || status)}</span>
                </div>
                <div class="agent-recharge-payment__amount">¥${formatPrice(order.amount)}</div>
                <div class="agent-recharge-payment__body">
                    <div class="agent-recharge-payment__instructions">
                        <p>${escapeHtml(instruction)}</p>
                        ${status === 'PENDING' ? `<p class="agent-recharge-payment__countdown">剩余支付时间：<strong id="agent-recharge-countdown">--:--</strong></p>` : ''}
                        ${status === 'PAYMENT_REVIEW' ? '<p class="agent-recharge-payment__hint">已提交支付审核，管理员确认后额度会自动到账。</p>' : ''}
                        ${status === 'PAID' ? '<p class="agent-recharge-payment__success">支付已确认，额度已计入账号。</p>' : ''}
                        ${status === 'CANCELLED' ? '<p class="agent-recharge-payment__hint">订单已取消。</p>' : ''}
                    </div>
                    ${showQr ? `<div class="agent-recharge-payment__qr"><img src="${STATIC_QR}" alt="微信支付收款码"><span>微信扫码支付</span></div>` : ''}
                </div>
                <div class="agent-recharge-payment__actions">
                    ${status === 'PENDING' ? `<button class="cyber-button" type="button" data-recharge-review><span class="cyber-button__tag">我已完成支付</span></button>` : ''}
                    <button class="cyber-button" type="button" data-recharge-refresh><span class="cyber-button__tag">刷新状态</span></button>
                    ${status === 'PENDING' ? `<button class="cyber-button agent-recharge-muted" type="button" data-recharge-cancel><span class="cyber-button__tag">取消订单</span></button>` : ''}
                    <button class="cyber-button agent-recharge-muted" type="button" data-recharge-back><span class="cyber-button__tag">返回套餐</span></button>
                </div>
            </div>
        `;
        if (status === 'PENDING') startCountdown(order.paymentExpiresAt);
        if (status === 'PAID') {
            window.setTimeout(() => window.dispatchEvent(new Event('focus')), 500);
        }
    }

    async function buyPlan(planId) {
        if (state.busy) return;
        if (!currentUser()) {
            state.note = '请先登录后再充值';
            renderNote(state.note);
            window.CipherAuth?.openModal?.();
            return;
        }
        const buttons = document.querySelectorAll('[data-recharge-plan]');
        buttons.forEach(button => { button.disabled = true; });
        state.busy = true;
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
            state.order = order;
            renderPayment();
        } catch (error) {
            renderNote(error.message || '订单创建失败');
        } finally {
            state.busy = false;
            buttons.forEach(button => { button.disabled = false; });
        }
    }

    async function submitReview() {
        if (!state.order || state.busy) return;
        state.busy = true;
        try {
            state.order = await request(`${ORDERS_URL}/payment-review`, {
                method: 'POST',
                body: JSON.stringify({ orderId: state.order.id, note: '用户已完成支付，等待管理员确认' })
            });
            renderPayment();
        } catch (error) {
            renderNote(error.message || '提交失败');
        } finally {
            state.busy = false;
        }
    }

    async function cancelOrder() {
        if (!state.order || state.busy) return;
        state.busy = true;
        try {
            state.order = await request(`${ORDERS_URL}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ orderId: state.order.id, note: '用户取消充值订单' })
            });
            renderPayment();
        } catch (error) {
            renderNote(error.message || '取消失败');
        } finally {
            state.busy = false;
        }
    }

    async function refreshOrder() {
        if (!state.order || state.busy) return;
        state.busy = true;
        try {
            const orders = await request(ORDERS_URL);
            const latest = (Array.isArray(orders) ? orders : []).find(item => item.id === state.order.id);
            if (latest) {
                state.order = latest;
                renderPayment();
                if (latest.status === 'PAID') {
                    window.dispatchEvent(new Event('focus'));
                }
            }
        } catch (error) {
            renderNote(error.message || '刷新失败');
        } finally {
            state.busy = false;
        }
    }

    async function loadReviewerState() {
        state.reviewer = false;
        if (!currentUser()) {
            renderFooter();
            return;
        }
        try {
            await request(ADMIN_ORDERS_URL);
            state.reviewer = true;
        } catch (error) {
            state.reviewer = false;
        }
        renderFooter();
    }

    function handleClick(event) {
        const closeTarget = event.target.closest('[data-recharge-close]');
        if (closeTarget) {
            close();
            return;
        }
        const plan = event.target.closest('[data-recharge-plan]');
        if (plan) {
            buyPlan(plan.getAttribute('data-recharge-plan'));
            return;
        }
        if (event.target.closest('[data-recharge-review]')) {
            submitReview();
            return;
        }
        if (event.target.closest('[data-recharge-cancel]')) {
            cancelOrder();
            return;
        }
        if (event.target.closest('[data-recharge-refresh]')) {
            refreshOrder();
            return;
        }
        if (event.target.closest('[data-recharge-back]')) {
            state.order = null;
            renderPlans();
        }
    }

    function renderNote(text) {
        const body = document.getElementById('agent-recharge-modal-body');
        if (!body) return;
        let note = body.querySelector('.agent-recharge-modal__error');
        if (!note) {
            note = document.createElement('p');
            note.className = 'agent-recharge-modal__error';
            body.prepend(note);
        }
        note.textContent = text;
    }

    function startCountdown(expiresAt) {
        const target = new Date(expiresAt).getTime();
        const el = document.getElementById('agent-recharge-countdown');
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

    function formatPrice(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '0';
        return Number.isInteger(number) ? String(number) : number.toFixed(1);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    document.addEventListener('click', event => {
        const trigger = event.target.closest('[data-agent-recharge], .agent-recharge-link, .agent-recharge-inline-link');
        if (!trigger) return;
        event.preventDefault();
        open();
    });

    window.openAgentRechargeModal = open;
})();
