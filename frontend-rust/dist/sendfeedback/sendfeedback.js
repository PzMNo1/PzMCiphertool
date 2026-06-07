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
    },
    {
        question: '这个工具应用是用AI生成的吗？',
        answer: '10%是纯AI，40%是AI生成后作者手动打磨细节，50%是纯手动，你们看到的密码卡片的转换算法大部分是来自2024年年底的纯人工，那时候我们在尝试用最少的代码来转换密码。还有你们看到的比较科幻的样式，也是年初GPTo3或DeepSeek-R1生成几百个不同样式后作者调整细节花99%的时间打磨的。'
    },
    {
        question: '这个应用是什么时候开始做的？',
        answer: '源头来说是2024年9月开始，最初是个python脚本和GUI，后来换了很多语言和框架，重构了十几次代码，甚至有几次是全部删除重来的，目的是为了给早期开发者更好的体验，以及简化开发流程。'
    },
    {
        question: '我看到有些页面还没开发完？',
        answer: '是的，目前整体的开发进度还不到1%，甚至是0.1%，因为作者还有2000多个想法，但精力有限。我们欢迎你随时能够为本工具提供更多的支持。'
    },
    {
        question: '我记得不是今年九月上线吗，怎么年底才上线',
        answer: '作者临时加了几百个想法，为了能合并更多其它模块并更快上线，作者这三个月几乎天天通宵，通完宵还得回去上班，艰苦这个词已经不足以形容作者了。'
    },
    {
        question: '不怕有人入侵你的服务器吗？',
        answer: '既然以及上线了，那么就已经做好了一些相关的防御措施，作者为了这个也是啃了很多书。当然我们也需要后端安全部署师来做维护，我们不看学历和工作经历，只需要向作者提交代码。'
    },
    {
        question: '作者用了多久的AI？',
        answer: '从22年底用GPT3开始，然后3.5，4.0，然后转到claude，和Gemini，Grok。开始是直接调用API，到后面R1开始尝试本地部署，然后再到深层一点的Transformer搭建，神经网络底层.....啃了不少论文和其它大神的成品，希望明年大家能看到作者原生训练搭建的模型。'
    },
    {
        question: '我看到好多人说他们之前体验过这个工具？',
        answer: '是的，这半年作者都在找不同的早期体验者，一开始是身边玩得好的朋友，然后逐渐转向其它庞大的群体，包括C9高校的部分学生和老师（集中在清北复交较多）、以及各大企业的一些中高层精英（大疆、美的、库卡、Tesla、华为），还有书记和委员，以及海外的华人精英（集中在华尔街、硅谷较多）。如果你们想要体验最新版本，欢迎随时联系作者。'
    },
    {
        question: '我没看到现代区MD5、SHA有解密？',
        answer: '作者查过这是属于违法行为，上线了会被黑白两头围剿。而且我们希望本工具更多的是用于学习和娱乐交流，不希望触碰真实的边界。'
    },
    {
        question: '什么时候会更新新的版本',
        answer: '目前还有几百个bug没修复，离新版本还有些时间。'
    }
];

function initAuthorInterview(container) {
    if (container.dataset.interviewReady === 'true') return;
    container.dataset.interviewReady = 'true';
    container.innerHTML = `
        <section class="card main-input author-interview-search-card">
            <div class="badge">作者采访</div>
            <input type="search" id="authorInterviewSearch" class="author-interview-search-input" placeholder="搜索问题或回答...">
        </section>
        ${AUTHOR_INTERVIEW_ITEMS.map((item, index) => renderAuthorInterviewCard(item, index)).join('')}
        <section class="card main-input author-interview-empty" hidden>
            <div class="badge">搜索结果</div>
            <p>没有匹配的采访内容。</p>
        </section>
    `;

    const searchInput = container.querySelector('#authorInterviewSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterAuthorInterview(container, searchInput.value));
    }
}

function renderAuthorInterviewCard(item, index) {
    const searchText = `${item.question} ${item.answer}`.toLowerCase();
    return `
        <article class="card author-interview-card" data-author-interview-search="${escapeHtml(searchText)}">
            <div class="badge">Q${String(index + 1).padStart(2, '0')}</div>
            <p><strong>Q：</strong>${escapeHtml(item.question)}</p>
            <br>
            <p><strong>A：</strong>${escapeHtml(item.answer)}</p>
        </article>
    `;
}

function filterAuthorInterview(container, query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    let visibleCount = 0;
    container.querySelectorAll('.author-interview-card').forEach(card => {
        const matched = !normalizedQuery || card.dataset.authorInterviewSearch.includes(normalizedQuery);
        card.hidden = !matched;
        if (matched) visibleCount++;
    });

    const empty = container.querySelector('.author-interview-empty');
    if (empty) empty.hidden = visibleCount !== 0;
}

const FEEDBACK_API_BASE = window.CIPHERTOOL_API_BASE || 'http://localhost:8080';
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
        ? `当前账号：${maskEmail(user.email)} · 作者回复权限`
        : `当前账号：${maskEmail(user.email)}`;
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

function maskEmail(email) {
    const value = String(email || '');
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
