function initSendFeedback() {
    // 渲染作者采访
    const interviewContainer = document.querySelector('#zuozhecaifang .container');
    if (interviewContainer) {
        initAuthorInterview(interviewContainer);
    }

    // 渲染意见反馈
    const feedbackContainer = document.querySelector('#yijianfankui .container');
    if (feedbackContainer) {
        initFeedbackBoard(feedbackContainer);
    }
}

const AUTHOR_INTERVIEW_ITEMS = [
    {
        question: '开发这个应用的团队有多少人',
        answer: '目前只有作者一个人，你们看到的PzM，泡面的面，还有版权里的LiangJunHao，都是作者。 当然，我们期待大家能加入我们开发团队，为人类的未来助一份力。'
    }
];

function initAuthorInterview(container) {
    if (container.dataset.interviewReady === 'true') return;
    container.dataset.interviewReady = 'true';
    container.innerHTML = AUTHOR_INTERVIEW_ITEMS.map((item, index) => renderAuthorInterviewCard(item, index)).join('');
}

function renderAuthorInterviewCard(item, index) {
    return `
        <article class="card author-interview-card">
            <div class="badge">Q${String(index + 1).padStart(2, '0')}</div>
            <p><strong>Q：</strong>${escapeHtml(item.question)}</p>
            <br>
            <p><strong>A：</strong>${escapeHtml(item.answer)}</p>
        </article>
    `;
}

const FEEDBACK_API_BASE = window.CIPHERTOOL_API_BASE || 'http://127.0.0.1:8080';
let feedbackAuthEventsBound = false;

function initFeedbackBoard(container) {
    if (container.dataset.feedbackReady !== 'true') {
        container.dataset.feedbackReady = 'true';
        container.innerHTML = `
            <section class="card feedback-composer">
                <div class="badge">意见反馈</div>
                <div class="feedback-account" id="feedbackAccount"></div>
                <textarea id="feedbackInput" class="feedback-input" maxlength="2000" placeholder="请输入您的意见或建议..."></textarea>
                <div class="feedback-actions">
                    <span id="feedbackMessage" class="feedback-message"></span>
                    <button id="submitFeedbackBtn" class="cyber-button" type="button">
                        <span class="cyber-button__glitch"></span>
                        <span class="cyber-button__tag">发送反馈</span>
                    </button>
                </div>
            </section>
            <section class="feedback-list" id="feedbackList" aria-live="polite"></section>
        `;
        bindFeedbackBoard(container);
    }

    bindFeedbackAuthEvents();
    loadFeedbackBoard(container);
}

function bindFeedbackBoard(container) {
    const submitBtn = container.querySelector('#submitFeedbackBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => submitFeedback(container));
    }

    container.addEventListener('click', event => {
        const deleteBtn = event.target.closest('[data-feedback-delete]');
        if (deleteBtn && container.contains(deleteBtn)) {
            deleteFeedback(container, deleteBtn.dataset.feedbackDelete, deleteBtn);
            return;
        }

        const replyBtn = event.target.closest('[data-feedback-reply]');
        if (!replyBtn || !container.contains(replyBtn)) return;
        submitFeedbackReply(container, replyBtn.dataset.feedbackReply, replyBtn);
    });
}

function bindFeedbackAuthEvents() {
    if (feedbackAuthEventsBound) return;
    feedbackAuthEventsBound = true;
    const reload = () => {
        const container = document.querySelector('#yijianfankui .container');
        if (container && container.dataset.feedbackReady === 'true') {
            loadFeedbackBoard(container);
        }
    };
    window.addEventListener('cipher-login-success', reload);
    window.addEventListener('cipher-logout-success', reload);
}

async function loadFeedbackBoard(container) {
    updateFeedbackAccount(container, false);
    setFeedbackMessage(container, '正在加载反馈...', 'muted');
    try {
        const overview = await feedbackRequest('/api/feedback', {
            method: 'GET',
            headers: authHeaders()
        });
        renderFeedbackOverview(container, overview);
        setFeedbackMessage(container, '', 'muted');
    } catch (error) {
        renderFeedbackOverview(container, { items: [], currentUserCanReply: false });
        setFeedbackMessage(container, error.message || '反馈加载失败', 'error');
    }
}

async function submitFeedback(container) {
    const input = container.querySelector('#feedbackInput');
    const content = input ? input.value.trim() : '';
    if (!content) {
        setFeedbackMessage(container, '请输入反馈内容', 'error');
        return;
    }

    const submitBtn = container.querySelector('#submitFeedbackBtn');
    setButtonBusy(submitBtn, true, '发送中...');
    try {
        const overview = await feedbackRequest('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify({ content })
        });
        if (input) input.value = '';
        renderFeedbackOverview(container, overview);
        setFeedbackMessage(container, '你的意见我们已收集', 'success');
    } catch (error) {
        setFeedbackMessage(container, error.message || '发送失败', 'error');
    } finally {
        setButtonBusy(submitBtn, false);
    }
}

async function submitFeedbackReply(container, feedbackId, button) {
    const input = container.querySelector(`[data-feedback-reply-input="${feedbackId}"]`);
    const content = input ? input.value.trim() : '';
    if (!content) {
        setFeedbackMessage(container, '请输入回复内容', 'error');
        return;
    }

    setButtonBusy(button, true, '发布中...');
    try {
        const overview = await feedbackRequest(`/api/feedback/${encodeURIComponent(feedbackId)}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify({ content })
        });
        renderFeedbackOverview(container, overview);
        setFeedbackMessage(container, '作者回复已发布', 'success');
    } catch (error) {
        if (isUnauthorizedMessage(error.message)) openLoginModal();
        setFeedbackMessage(container, error.message || '回复失败', 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

async function deleteFeedback(container, feedbackId, button) {
    setButtonBusy(button, true, '删除中...');
    try {
        const overview = await feedbackRequest(`/api/feedback/${encodeURIComponent(feedbackId)}/delete`, {
            method: 'POST',
            headers: authHeaders()
        });
        renderFeedbackOverview(container, overview);
        setFeedbackMessage(container, '反馈已删除', 'success');
    } catch (error) {
        if (isUnauthorizedMessage(error.message)) openLoginModal();
        setFeedbackMessage(container, error.message || '删除失败', 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

function renderFeedbackOverview(container, overview) {
    const canReply = !!overview?.currentUserCanReply;
    updateFeedbackAccount(container, canReply);

    const list = container.querySelector('#feedbackList');
    if (!list) return;
    const items = Array.isArray(overview?.items) ? overview.items : [];
    if (!items.length) {
        list.innerHTML = `
            <article class="card feedback-card feedback-empty">
                <div class="badge">反馈列表</div>
                <p>暂无反馈。</p>
            </article>
        `;
        return;
    }

    list.innerHTML = items.map(item => renderFeedbackCard(item, canReply)).join('');
}

function renderFeedbackCard(item, canReply) {
    const id = String(item.id || '');
    const replyContent = String(item.replyContent || '');
    const hasReply = !!item.replied && !!replyContent.trim();
    const authorActions = canReply
        ? `
            <div class="feedback-author-actions">
                <button class="cyber-button feedback-delete-button" type="button" data-feedback-delete="${escapeHtml(id)}">
                    <span class="cyber-button__glitch"></span>
                    <span class="cyber-button__tag">删除反馈</span>
                </button>
            </div>
        `
        : '';
    const replyForm = canReply
        ? `
            <div class="feedback-reply-form">
                <textarea class="feedback-reply-input" data-feedback-reply-input="${escapeHtml(id)}" maxlength="2000" placeholder="以作者身份回复...">${escapeHtml(replyContent)}</textarea>
                <button class="cyber-button feedback-reply-button" type="button" data-feedback-reply="${escapeHtml(id)}">
                    <span class="cyber-button__glitch"></span>
                    <span class="cyber-button__tag">${hasReply ? '更新回复' : '发布回复'}</span>
                </button>
            </div>
        `
        : '';

    return `
        <article class="card feedback-card" data-feedback-id="${escapeHtml(id)}">
            <div class="feedback-card-header">
                <div class="badge">用户反馈</div>
                <div class="feedback-meta">${escapeHtml(item.submitterMaskedEmail || '匿名用户')} · ${escapeHtml(formatFeedbackTime(item.createdAt))}</div>
            </div>
            <div class="feedback-content">${escapeHtml(item.content || '')}</div>
            ${hasReply ? `
                <div class="feedback-author-reply">
                    <div class="feedback-reply-title">作者回复 · ${escapeHtml(formatFeedbackTime(item.repliedAt))}</div>
                    <div class="feedback-reply-content">${escapeHtml(replyContent)}</div>
                </div>
            ` : ''}
            ${authorActions}
            ${replyForm}
        </article>
    `;
}

async function feedbackRequest(path, options = {}) {
    const response = await fetch(`${FEEDBACK_API_BASE}${path}`, options);
    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        throw new Error('后端响应格式错误');
    }

    if (!response.ok || !payload.success) {
        throw new Error(payload?.message || `请求失败 (${response.status})`);
    }
    return payload.data;
}

function updateFeedbackAccount(container, canReply) {
    const account = container.querySelector('#feedbackAccount');
    if (!account) return;
    const user = currentUser();
    if (!user) {
        account.textContent = '未登录将以匿名用户提交反馈';
        account.className = 'feedback-account';
        return;
    }
    account.textContent = canReply
        ? `当前账号：${maskAccount(user.phone)} · 作者回复权限`
        : `当前账号：${maskAccount(user.phone)}`;
    account.className = canReply ? 'feedback-account author' : 'feedback-account';
}

function setFeedbackMessage(container, text, type = 'muted') {
    const message = container.querySelector('#feedbackMessage');
    if (!message) return;
    message.textContent = text || '';
    message.className = `feedback-message ${type}`;
}

function setButtonBusy(button, busy, label) {
    if (!button) return;
    button.disabled = !!busy;
    const tag = button.querySelector('.cyber-button__tag') || button;
    if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = tag.textContent;
    }
    tag.textContent = busy ? label : button.dataset.defaultLabel;
}

function currentUser() {
    return window.CipherAuth && typeof window.CipherAuth.getUser === 'function'
        ? window.CipherAuth.getUser()
        : null;
}

function authHeaders() {
    return window.CipherAuth && typeof window.CipherAuth.getAuthHeaders === 'function'
        ? window.CipherAuth.getAuthHeaders()
        : {};
}

function openLoginModal() {
    if (window.CipherAuth && typeof window.CipherAuth.openModal === 'function') {
        window.CipherAuth.openModal();
    }
}

function isUnauthorizedMessage(message) {
    return /登录|未授权|unauthorized/i.test(String(message || ''));
}

function maskAccount(account) {
    const value = String(account || '');
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) return `${digits.slice(0, 3)}****${digits.slice(7)}`;
    if (!value.includes('@')) return value || '未登录';
    const [name, domain] = value.split('@');
    if (name.length <= 2) return `${'*'.repeat(name.length)}@${domain}`;
    return `${name.slice(0, 3)}****@${domain}`;
}

function formatFeedbackTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
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
