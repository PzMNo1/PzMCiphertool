(function () {
    const API_BASE = window.CIPHERTOOL_API_BASE || 'http://localhost:8080';
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
        ledger: [],
        trend: [],
        orders: [],
        subscriptionPlans: [],
        invite: {
            code: '',
            invitedUsers: 0,
            pendingRewards: 0,
            creditedRewards: 0,
            referredBy: '',
            invitees: [],
            loadError: ''
        }
    };

    let state = normalizeDashboard(DEFAULT_STATE);
    let authEventsBound = false;
    let lastCreatedKey = '';
    let activePage = 'overview';
    const PAGE_NAV = [
        { id: 'overview', label: '仪表盘' },
        { id: 'keys', label: 'API Keys' },
        { id: 'usage', label: '充值/订阅' },
        { id: 'billing', label: '邀请返利' }
    ];
    const pageRegistry = new Map();
    const publicApi = window.ApiZhongZhuanZhan = window.ApiZhongZhuanZhan || {};

    publicApi.registerPage = function registerPage(page) {
        if (!page || !page.id || typeof page.render !== 'function') return;
        pageRegistry.set(page.id, page);
    };

    publicApi.setPage = function setPage(pageId) {
        const root = document.getElementById('apizz-root');
        if (root) selectPage(root, pageId);
    };

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
            const data = await requestJson(url, {
                headers: authHeaders()
            });
            state = normalizeDashboard(data);
            await loadCommerceState();
            render(root);
            bind(root);
            if (options.message) toast(root, options.message);
        } catch (error) {
            renderBackendError(root, error.message || '后端连接失败');
        }
    }

    async function loadCommerceState() {
        const tasks = [
            ['orders', () => getRouter('orders')],
            ['subscriptionPlans', () => getRouter('subscription-plans')],
            ['invite', () => getRouter('invites/overview')]
        ];
        const results = await Promise.allSettled(tasks.map(([, load]) => load()));
        results.forEach((result, index) => {
            const key = tasks[index][0];
            if (result.status === 'fulfilled') {
                state[key] = result.value;
            } else if (key === 'invite') {
                state.invite = {
                    ...normalizeInvite(state.invite),
                    loadError: result.reason?.message || '邀请返利接口不可用'
                };
            }
        });
    }

    async function getRouter(endpoint, query = {}) {
        const params = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') params.set(key, value);
        });
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return requestJson(`${API_BASE}/api/api-router/${endpoint}${suffix}`, { headers: authHeaders() });
    }

    async function postDashboard(root, endpoint, extra = {}) {
        const user = getCurrentUser();
        if (!user || !user.email) {
            renderLoginRequired(root);
            throw new Error('请先登录');
        }

        return requestJson(`${API_BASE}/api/api-router/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
        const currentPage = pageRegistry.has(activePage) ? activePage : 'overview';
        const balance = numberValue(state.metrics.balance).toFixed(2);

        root.innerHTML = `
            <section class="apizz-shell">
                <div class="apizz-header">
                    <div>
                        <div class="module-header">
                            <h2 class="neon-title" data-text="API ROUTER">API ROUTER</h2>
                        </div>
                    </div>
                    <div class="apizz-header-actions">
                        <span class="apizz-pill">${escapeHtml(maskEmail(state.email))}</span>
                        <span class="apizz-pill">后端通道已连接</span>
                        <span class="apizz-pill">余额 $${balance}</span>
                    </div>
                </div>

                <div class="apizz-console-layout">
                    <aside class="apizz-console-nav" aria-label="API 中转站导航">
                        ${renderPageNav(currentPage)}
                    </aside>

                    <main class="apizz-console-main" id="apizz-console-main">
                        ${renderPageContent(root, currentPage)}
                    </main>
                </div>
            </section>
            <div id="apizz-toast" class="apizz-toast"></div>
        `;
    }

    function renderPageNav(currentPage) {
        return PAGE_NAV.map(page => `
            <a href="#apizz-page-${escapeHtml(page.id)}" class="${page.id === currentPage ? 'active' : ''}" data-apizz-page="${escapeHtml(page.id)}">${escapeHtml(page.label)}</a>
        `).join('');
    }

    function renderPageContent(root, pageId) {
        const page = pageRegistry.get(pageId) || pageRegistry.get('overview');
        if (!page) {
            return `
                <section class="apizz-card apizz-panel">
                    <div class="apizz-panel-title">页面脚本正在加载 <small>API Router</small></div>
                    <p class="apizz-muted">请稍后刷新中转站模块。</p>
                </section>
            `;
        }

        try {
            return page.render(pageContext(root));
        } catch (error) {
            console.error('[ApiZhongZhuanZhan] render page failed:', pageId, error);
            return `
                <section class="apizz-card apizz-panel">
                    <div class="apizz-panel-title">页面渲染失败 <small>${escapeHtml(page.title || pageId)}</small></div>
                    <p class="apizz-muted">${escapeHtml(error.message || '未知错误')}</p>
                </section>
            `;
        }
    }

    function pageContext(root) {
        return {
            root,
            state,
            helpers: {
                selected,
                numberValue,
                maskEmail,
                escapeHtml,
                metricCard,
                modelRow,
                usageItem,
                emptyUsageList,
                workflowButton,
                keyRow,
                emptyKeyRow,
                createdKeyNotice,
                chartSvg,
                donutGradient
            },
            actions: {
                loadDashboard: options => loadDashboard(root, options),
                getRouter,
                postDashboard: (endpoint, extra) => postDashboard(root, endpoint, extra),
                render: () => {
                    render(root);
                    bind(root);
                },
                toast: message => toast(root, message)
            }
        };
    }

    function selectPage(root, pageId) {
        if (!pageRegistry.has(pageId)) return;
        activePage = pageId;
        render(root);
        bind(root);
    }

    function bind(root) {
        root.querySelectorAll('[data-apizz-page]').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                selectPage(root, link.dataset.apizzPage);
            });
        });
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
                await loadCommerceState();
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

        root.querySelectorAll('.apizz-key-name-button').forEach(button => {
            button.addEventListener('click', () => startKeyNameEdit(root, button.dataset.keyId));
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

        const page = pageRegistry.get(activePage);
        if (page && typeof page.bind === 'function') {
            page.bind(pageContext(root));
        }
    }

    async function handleAction(root, action) {
        if (action === 'goto-keys') {
            selectPage(root, 'keys');
            return;
        }

        if (action === 'create-key') {
            try {
                const nextName = `router-key-${state.keys.length + 1}`;
                const data = await postDashboard(root, 'keys', { name: nextName, quota: '1,000,000 tokens' });
                lastCreatedKey = data.plainKey || '';
                state = normalizeDashboard(data.dashboard);
                await loadCommerceState();
                render(root);
                bind(root);
                toast(root, `已在后端创建 ${nextName}`);
            } catch (error) {
                toast(root, error.message || '创建密钥失败');
            }
            return;
        }

        if (action === 'refresh') {
            try {
                const data = await postDashboard(root, 'refresh');
                state = normalizeDashboard(data);
                await loadCommerceState();
                render(root);
                bind(root);
                toast(root, '后端仪表盘数据已刷新');
            } catch (error) {
                toast(root, error.message || '刷新失败');
            }
            return;
        }

        if (action === 'redeem-code') {
            openRedeemModal(root);
            return;
        }

        toast(root, '功能入口已就绪');
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
            let successMessage = '密钥状态已更新';
            if (action === 'enable') {
                payload.status = 'Enabled';
                successMessage = '密钥已启用';
            } else if (action === 'pause') {
                payload.status = 'Paused';
                successMessage = '密钥已暂停';
            } else if (action === 'delete') {
                endpoint = 'keys/delete';
                successMessage = '密钥已删除';
            } else {
                return;
            }

            const data = await postDashboard(root, endpoint, payload);
            lastCreatedKey = '';
            state = normalizeDashboard(data);
            await loadCommerceState();
            render(root);
            bind(root);
            toast(root, successMessage);
        } catch (error) {
            toast(root, error.message || '密钥操作失败');
        }
    }

    function startKeyNameEdit(root, keyId) {
        if (!keyId) return;
        const keyInfo = state.keys.find(item => item.id === keyId);
        if (!keyInfo) return;
        const cell = Array.from(root.querySelectorAll('[data-key-name-cell]'))
            .find(item => item.dataset.keyNameCell === keyId);
        if (!cell || cell.dataset.editing === 'true') return;

        const currentName = keyInfo.name || '';
        cell.dataset.editing = 'true';
        cell.innerHTML = `<input class="apizz-key-name-input" type="text" value="${escapeHtml(currentName)}" maxlength="80" aria-label="修改 API Key 名称">`;
        const input = cell.querySelector('.apizz-key-name-input');
        if (!input) return;
        input.focus();
        input.select();

        let finished = false;
        const finish = async shouldSave => {
            if (finished) return;
            finished = true;
            const nextName = input.value.trim();

            if (!shouldSave || !nextName || nextName === currentName) {
                render(root);
                bind(root);
                return;
            }

            input.disabled = true;
            try {
                const data = await postDashboard(root, 'keys/config', { keyId, name: nextName });
                lastCreatedKey = '';
                state = normalizeDashboard(data);
                await loadCommerceState();
                render(root);
                bind(root);
                toast(root, '密钥名称已更新');
            } catch (error) {
                render(root);
                bind(root);
                toast(root, error.message || '密钥名称更新失败');
            }
        };

        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                finish(true);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                finish(false);
            }
        });
        input.addEventListener('blur', () => finish(true));
    }

    function openEditModal(root, keyInfo) {
        closeEditModal();
        const rpmDisplay = numberValue(keyInfo.keyRpm) || '';
        const tpmDisplay = numberValue(keyInfo.keyTpm) || '';
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal apizz-key-edit-modal">
                <div class="apizz-modal-title">编辑密钥配置 <small>${escapeHtml(keyInfo.mask)}</small></div>
                <div class="apizz-key-edit-grid">
                    <div class="apizz-form-group apizz-key-edit-wide">
                        <label class="apizz-form-label">名称</label>
                        <input id="apizz-cfg-name" class="apizz-form-input" type="text" value="${escapeHtml(keyInfo.name)}" placeholder="key 名称">
                    </div>
                    <div class="apizz-form-group apizz-key-edit-wide">
                        <label class="apizz-form-label">Token 配额</label>
                        <input id="apizz-cfg-quota" class="apizz-form-input" type="text" value="${escapeHtml(keyInfo.quota)}" placeholder="如 1,000,000 tokens 或 $10.00">
                        <div class="apizz-form-hint">支持 tokens 和 $ 两种格式，留空保持不变</div>
                    </div>
                    <div class="apizz-form-group">
                        <label class="apizz-form-label">RPM 限制</label>
                        <input id="apizz-cfg-rpm" class="apizz-form-input" type="number" min="0" value="${escapeHtml(rpmDisplay)}" placeholder="0 = 全局默认">
                        <div class="apizz-form-hint">0 或留空使用全局默认</div>
                    </div>
                    <div class="apizz-form-group">
                        <label class="apizz-form-label">TPM 限制</label>
                        <input id="apizz-cfg-tpm" class="apizz-form-input" type="number" min="0" value="${escapeHtml(tpmDisplay)}" placeholder="0 = 全局默认">
                        <div class="apizz-form-hint">0 或留空使用全局默认</div>
                    </div>
                </div>
                <div class="apizz-modal-actions apizz-key-edit-actions">
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
            await loadCommerceState();
            render(root);
            bind(root);
            toast(root, '密钥配置已更新');
        } catch (error) {
            toast(root, error.message || '密钥配置更新失败');
        }
    }

    function openRedeemModal(root) {
        closeEditModal();
        const overlay = document.createElement('div');
        overlay.className = 'apizz-modal-overlay apizz-redeem-overlay';
        overlay.id = 'apizz-modal-overlay';
        overlay.innerHTML = `
            <div class="apizz-modal apizz-redeem-modal">
                <div class="apizz-redeem-head">
                    <div>
                        <div class="apizz-modal-title">兑换码 <small>输入活动码后直接入账</small></div>
                    </div>
                    <button id="apizz-redeem-close" class="apizz-ghost-btn" type="button">关闭</button>
                </div>

                <div class="apizz-redeem-card">
                    <div class="apizz-redeem-line">
                        <div class="apizz-form-group">
                            <label class="apizz-form-label">兑换码</label>
                            <input id="apizz-redeem-code" class="apizz-form-input" type="text" placeholder="PZM-XXXX-XXXX-XXXX" autocomplete="off">
                        </div>
                        <button id="apizz-redeem-apply" class="apizz-primary-btn" type="button">兑换</button>
                    </div>
                </div>

                <div class="apizz-redeem-admin-toggle">
                    <div>
                        <div class="apizz-redeem-admin-title">管理员生成</div>
                        <div class="apizz-muted">展开后再加载兑换码列表。</div>
                    </div>
                    <button id="apizz-code-toggle" class="apizz-ghost-btn" type="button" aria-expanded="false">展开</button>
                </div>

                <div id="apizz-code-admin" class="apizz-redeem-admin-panel" hidden>
                    <div class="apizz-redeem-form-grid">
                        <div class="apizz-form-group">
                            <label class="apizz-form-label">指定代码</label>
                            <input id="apizz-code-code" class="apizz-form-input" type="text" placeholder="留空自动生成">
                        </div>
                        <div class="apizz-form-group">
                            <label class="apizz-form-label">金额</label>
                            <input id="apizz-code-amount" class="apizz-form-input" type="number" min="0.0001" step="0.0001" value="1">
                        </div>
                        <div class="apizz-form-group">
                            <label class="apizz-form-label">可用次数</label>
                            <input id="apizz-code-max" class="apizz-form-input" type="number" min="1" value="1">
                        </div>
                        <div class="apizz-form-group">
                            <label class="apizz-form-label">过期时间</label>
                            <input id="apizz-code-expire" class="apizz-form-input" type="text" placeholder="yyyy-MM-ddTHH:mm:ss，留空不过期">
                        </div>
                        <div class="apizz-form-group">
                            <label class="apizz-form-label">备注</label>
                            <input id="apizz-code-note" class="apizz-form-input" type="text" placeholder="V2EX launch campaign">
                        </div>
                    </div>
                    <div class="apizz-modal-actions apizz-redeem-actions">
                        <button id="apizz-code-refresh" class="apizz-ghost-btn" type="button">刷新列表</button>
                        <button id="apizz-code-create" class="apizz-primary-btn" type="button">生成</button>
                    </div>
                    <div class="apizz-table-wrap apizz-redeem-table-wrap">
                        <table class="apizz-table">
                            <thead><tr><th>兑换码</th><th>金额</th><th>次数</th><th>状态</th><th>过期</th><th>操作</th></tr></thead>
                            <tbody id="apizz-code-rows"><tr><td colspan="6" class="apizz-muted">展开后可刷新查看兑换码列表。</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        bindRedeemModal(root, overlay);
        requestAnimationFrame(() => overlay.querySelector('#apizz-redeem-code')?.focus());
    }

    function bindRedeemModal(root, overlay) {
        const codeInput = overlay.querySelector('#apizz-redeem-code');
        const applyButton = overlay.querySelector('#apizz-redeem-apply');
        const adminPanel = overlay.querySelector('#apizz-code-admin');
        const toggleButton = overlay.querySelector('#apizz-code-toggle');
        const refreshButton = overlay.querySelector('#apizz-code-refresh');
        const createButton = overlay.querySelector('#apizz-code-create');
        let redeemCodesLoaded = false;

        const setAdminOpen = open => {
            adminPanel.hidden = !open;
            toggleButton.setAttribute('aria-expanded', String(open));
            toggleButton.textContent = open ? '收起' : '展开';
        };

        const loadRedeemCodes = showError => {
            redeemCodesLoaded = true;
            return refreshRedeemCodes(root, overlay, showError);
        };

        overlay.querySelector('#apizz-redeem-close').addEventListener('click', closeEditModal);
        applyButton.addEventListener('click', async () => {
            const code = codeInput.value.trim();
            if (!code) {
                toast(root, '请输入兑换码');
                codeInput.focus();
                return;
            }
            if (applyButton.disabled) return;
            applyButton.disabled = true;
            try {
                const data = await postDashboard(root, 'redeem', { code });
                closeEditModal();
                state = normalizeDashboard(data);
                await loadCommerceState();
                render(root);
                bind(root);
                toast(root, '兑换成功，余额已更新');
            } catch (error) {
                toast(root, error.message || '兑换失败');
            } finally {
                applyButton.disabled = false;
            }
        });
        codeInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyButton.click();
            }
        });
        toggleButton.addEventListener('click', () => {
            const shouldOpen = adminPanel.hidden;
            setAdminOpen(shouldOpen);
            if (shouldOpen && !redeemCodesLoaded) {
                loadRedeemCodes(false);
            }
        });
        refreshButton.addEventListener('click', () => {
            if (adminPanel.hidden) setAdminOpen(true);
            loadRedeemCodes(true);
        });
        createButton.addEventListener('click', async () => {
            if (createButton.disabled) return;
            createButton.disabled = true;
            try {
                const codes = await requestJson(`${API_BASE}/api/api-router/redeem-codes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({
                        code: document.getElementById('apizz-code-code').value.trim(),
                        amount: Number(document.getElementById('apizz-code-amount').value),
                        maxUses: parseInt(document.getElementById('apizz-code-max').value, 10) || 1,
                        expiresAt: document.getElementById('apizz-code-expire').value.trim(),
                        note: document.getElementById('apizz-code-note').value.trim(),
                        enabled: true
                    })
                });
                const rows = overlay.querySelector('#apizz-code-rows');
                if (rows) rows.innerHTML = redeemCodeRows(codes);
                redeemCodesLoaded = true;
                bindRedeemCodeActions(root, overlay);
                toast(root, '兑换码已生成');
            } catch (error) {
                toast(root, error.message || '兑换码生成失败');
            } finally {
                createButton.disabled = false;
            }
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeEditModal();
        });
    }

    async function refreshRedeemCodes(root, overlay, showError) {
        const rows = overlay.querySelector('#apizz-code-rows');
        if (!rows) return;
        rows.innerHTML = '<tr><td colspan="6" class="apizz-muted">正在加载兑换码列表...</td></tr>';
        try {
            const codes = await requestJson(`${API_BASE}/api/api-router/redeem-codes`, { headers: authHeaders() });
            const nextRows = overlay.querySelector('#apizz-code-rows');
            if (!nextRows) return;
            nextRows.innerHTML = redeemCodeRows(codes);
            bindRedeemCodeActions(root, overlay);
        } catch (error) {
            const nextRows = overlay.querySelector('#apizz-code-rows');
            if (nextRows) {
                nextRows.innerHTML = '<tr><td colspan="6" class="apizz-muted">无管理员权限或未配置 API_ROUTER_ADMIN_EMAILS。</td></tr>';
            }
            if (showError) toast(root, error.message || '兑换码列表加载失败');
        }
    }

    function bindRedeemCodeActions(root, overlay) {
        overlay.querySelectorAll('.apizz-redeem-code-action').forEach(button => {
            button.addEventListener('click', async () => {
                try {
                    const code = button.dataset.code;
                    const enabled = button.dataset.action === 'enable';
                    const codes = await requestJson(`${API_BASE}/api/api-router/redeem-codes/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify({ code, enabled })
                    });
                    overlay.querySelector('#apizz-code-rows').innerHTML = redeemCodeRows(codes);
                    bindRedeemCodeActions(root, overlay);
                    toast(root, '兑换码状态已更新');
                } catch (error) {
                    toast(root, error.message || '兑换码操作失败');
                }
            });
        });
    }

    function redeemCodeRows(codes) {
        if (!Array.isArray(codes) || !codes.length) {
            return '<tr><td colspan="6" class="apizz-muted">暂无兑换码。</td></tr>';
        }
        return codes.map(item => {
            const action = item.enabled ? 'disable' : 'enable';
            const actionText = item.enabled ? '停用' : '启用';
            return `
                <tr>
                    <td>${escapeHtml(item.code)}<div class="apizz-muted">${escapeHtml(item.note || '')}</div></td>
                    <td>${numberValue(item.amount).toFixed(4)}</td>
                    <td>${escapeHtml(item.usedCount)} / ${escapeHtml(item.maxUses)}</td>
                    <td>${item.enabled ? '启用' : '停用'}</td>
                    <td class="apizz-muted">${escapeHtml(item.expiresAt || '不过期')}</td>
                    <td><button class="apizz-key-action apizz-redeem-code-action" type="button" data-action="${action}" data-code="${escapeHtml(item.code)}">${actionText}</button></td>
                </tr>
            `;
        }).join('');
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

    function emptyUsageList() {
        return '<div class="apizz-empty-state">暂无调用记录</div>';
    }

    function workflowButton(icon, title, meta, action) {
        return `
            <button class="apizz-action apizz-work-action" type="button" data-action="${escapeHtml(action)}">
                <span class="apizz-icon">${escapeHtml(icon)}</span>
                <span>
                    <span class="apizz-action-title">${escapeHtml(title)}</span>
                    <span class="apizz-action-desc">${escapeHtml(meta)}</span>
                </span>
            </button>
        `;
    }

    function keyRow(item) {
        const statusEnabled = item.status === 'Enabled';
        const status = statusEnabled ? '启用' : '暂停';
        const statusClass = statusEnabled ? 'enabled' : 'paused';
        const toggleAction = statusEnabled ? 'pause' : 'enable';
        const toggleText = statusEnabled ? '暂停' : '启用';
        const rpmDisplay = numberValue(item.keyRpm) > 0 ? numberValue(item.keyRpm) : '全局';
        const tpmDisplay = numberValue(item.keyTpm) > 0 ? formatTpmDisplay(numberValue(item.keyTpm)) : '全局';
        return `
            <tr>
                <td data-key-name-cell="${escapeHtml(item.id)}">
                    <button class="apizz-key-name-button" type="button" data-key-id="${escapeHtml(item.id)}" title="点击修改名称">
                        ${escapeHtml(item.name || '未命名')}
                    </button>
                </td>
                <td>${escapeHtml(item.mask)}</td>
                <td><span class="apizz-key-status ${statusClass}">${status}</span></td>
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
                    <div class="apizz-panel-title">新密钥已创建</div>
                    <p class="apizz-muted">请立即保存完整密钥。</p>
                </div>
                <div class="apizz-created-key-field">
                    <div class="apizz-created-key-label">仅显示这一次</div>
                    <div class="apizz-created-key-row">
                        <input id="apizz-created-key" class="apizz-created-key" value="${escapeHtml(lastCreatedKey)}" readonly>
                        <button id="apizz-copy-key" class="apizz-ghost-btn" type="button">复制</button>
                    </div>
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
            ledger: Array.isArray(source.ledger) ? source.ledger : [],
            trend: Array.isArray(source.trend) ? source.trend : [],
            orders: Array.isArray(source.orders) ? source.orders : defaults.orders,
            subscriptionPlans: Array.isArray(source.subscriptionPlans) ? source.subscriptionPlans : defaults.subscriptionPlans,
            invite: normalizeInvite(source.invite || defaults.invite)
        };
    }

    function normalizeInvite(invite) {
        const defaults = DEFAULT_STATE.invite;
        const source = invite || {};
        return {
            ...defaults,
            ...source,
            invitedUsers: numberValue(source.invitedUsers),
            pendingRewards: numberValue(source.pendingRewards),
            creditedRewards: numberValue(source.creditedRewards),
            invitees: Array.isArray(source.invitees) ? source.invitees : [],
            loadError: String(source.loadError || '')
        };
    }

    function getCurrentUser() {
        return window.CipherAuth && typeof window.CipherAuth.getUser === 'function'
            ? window.CipherAuth.getUser()
            : null;
    }

    function authHeaders() {
        return window.CipherAuth && typeof window.CipherAuth.getAuthHeaders === 'function'
            ? window.CipherAuth.getAuthHeaders()
            : {};
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
