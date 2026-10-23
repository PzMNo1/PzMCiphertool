/**
 * 登录系统逻辑
 * 包含 UI 生成、事件处理和后端 API 调用 (手机号版)
 */

(function() {
    // === 配置 ===
    const API_BASE = window.CIPHERTOOL_API_BASE || 'http://127.0.0.1:8080';
    const STORAGE_KEY = 'cipher_toolbox_user';

    // === HTML 模板 ===
    const modalHTML = `
        <div class="auth-modal-overlay" id="authModal" style="display: none;">
            <div class="auth-modal">
                <div class="auth-header">
                    <span>用户登录</span>
                    <button class="auth-close-btn" id="authClose">&times;</button>
                </div>
                <div class="auth-form">
                    <div class="auth-form-group">
                        <input type="tel" class="auth-input" id="authPhone" placeholder="请输入手机号" maxlength="11" inputmode="numeric" autocomplete="tel">
                    </div>
                    <div class="auth-form-group auth-code-container">
                        <input type="text" class="auth-input" id="authCode" placeholder="验证码" maxlength="6" inputmode="numeric" autocomplete="one-time-code">
                        <button class="auth-btn-code" id="authSendCode">获取验证码</button>
                    </div>
                    <button class="auth-btn-submit" id="authLoginBtn">登 录</button>
                    <div class="auth-message" id="authMessage"></div>
                </div>
            </div>
        </div>
    `;

    // === 初始化 ===
    function init() {
        if (document.querySelector('.auth-modal-overlay')) return; // 防止重复初始化
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const saved = getUser();
        if (saved && !saved.phone) {
            localStorage.removeItem(STORAGE_KEY);
        }

        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            const btnContainer = document.createElement('div');
            btnContainer.id = 'authSidebarContainer';
            sidebar.appendChild(btnContainer);
            renderSidebarBtn();
        }
        bindEvents();
    }

    // === 渲染逻辑 ===
    function renderSidebarBtn() {
        const container = document.getElementById('authSidebarContainer');
        if (!container) return;
        const user = getUser();

        if (user) {
            container.innerHTML = `
                <div class="login-sidebar-btn" id="authLogoutBtn">
                    <div class="logout-icon"></div>
                    <span class="menu-text">退出登录 (${maskPhone(user.phone)})</span>
                </div>
            `;
            // 绑定退出事件
            document.getElementById('authLogoutBtn').addEventListener('click', handleLogout);
        } else {
            container.innerHTML = `
                <div class="login-sidebar-btn" id="authLoginTrigger">
                    <div class="login-icon"></div>
                    <span class="menu-text">登录 / 注册</span>
                </div>
            `;
            // 绑定打开 Modal 事件
            document.getElementById('authLoginTrigger').addEventListener('click', openModal);
        }
    }

    function maskPhone(phone) {
        const value = String(phone || '').replace(/\D/g, '');
        if (value.length !== 11) return phone || '';
        return value.slice(0, 3) + '****' + value.slice(7);
    }

    // === 事件绑定 ===
    function bindEvents() {
        const closeBtn = document.getElementById('authClose');
        const sendCodeBtn = document.getElementById('authSendCode');
        const loginBtn = document.getElementById('authLoginBtn');
        const accountInput = document.getElementById('authPhone');
        const inputs = document.querySelectorAll('.auth-input');

        // 关闭模态框
        if(closeBtn) closeBtn.addEventListener('click', closeModal);

        // 发送验证码
        if(sendCodeBtn) sendCodeBtn.addEventListener('click', handleSendCode);

        // 登录
        if(loginBtn) loginBtn.addEventListener('click', handleLogin);

        // 账号输入时切换验证码/密码输入态
        if(accountInput) accountInput.addEventListener('input', syncSecretInputMode);

        // 输入框聚焦清除错误信息
        inputs.forEach(input => {
            input.addEventListener('focus', () => showMessage(''));
        });
    }

    // === 业务逻辑 ===
    function openModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'flex'; // 先显示，再加 active
            // 强制重绘
            modal.offsetHeight;
            modal.classList.add('active');
            showMessage('');
        }
    }

    function closeModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // 等待动画结束
        }
    }

    async function handleSendCode() {
        const phone = document.getElementById('authPhone').value.trim();
        const btn = document.getElementById('authSendCode');

        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            showMessage('请输入有效的手机号', 'error');
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = '发送中...';

            const response = await fetch(`${API_BASE}/api/auth/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone })
            });

            const result = await response.json();

            if (result.success) {
                showMessage('验证码已发送，请查收短信', 'success');
                startCountdown(60);
            } else {
                showMessage(result.message || '发送失败', 'error');
                btn.disabled = false;
                btn.textContent = '获取验证码';
            }
        } catch (error) {
            console.error('Send code error:', error);
            showMessage('网络错误，请检查后端服务', 'error');
            btn.disabled = false;
            btn.textContent = '获取验证码';
        }
    }

    function startCountdown(seconds) {
        const btn = document.getElementById('authSendCode');
        let left = seconds;

        btn.textContent = `${left}s 后重发`;
        btn.disabled = true;

        const timer = setInterval(() => {
            left--;
            if (left <= 0) {
                clearInterval(timer);
                btn.textContent = '获取验证码';
                btn.disabled = false;
            } else {
                btn.textContent = `${left}s 后重发`;
            }
        }, 1000);
    }

    async function handleLogin() {
        const account = document.getElementById('authPhone').value.trim();
        const secret = document.getElementById('authCode').value.trim();

        if (!account || !secret) {
            showMessage('请填写完整信息', 'error');
            return;
        }

        const isPhone = /^1[3-9]\d{9}$/.test(account);
        if (!isPhone && !/[^\d\s]/.test(account)) {
            showMessage('请输入有效的手机号', 'error');
            return;
        }

        if (isPhone && !/^\d{4,6}$/.test(secret)) {
            showMessage('请输入有效的验证码', 'error');
            return;
        }

        const loginBtn = document.getElementById('authLoginBtn');
        const endpoint = isPhone ? '/api/auth/login' : '/api/auth/developer-login';
        const payload = isPhone
            ? { phone: account, code: secret }
            : { account: account, password: secret };

        try {
            loginBtn.textContent = '登录中...';
            loginBtn.disabled = true;

            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                // 登录成功
                saveUser({
                    phone: result.data.phone || account,
                    maskedPhone: result.data.maskedPhone || maskPhone(account),
                    token: result.data.token || '',
                    loginTime: result.data.loginTime,
                    expiresAt: result.data.expiresAt
                });
                closeModal();
                renderSidebarBtn();
                alert('登录成功！');

                // 触发登录成功事件
                window.dispatchEvent(new CustomEvent('cipher-login-success', { detail: getUser() }));

                // 清空表单
                document.getElementById('authPhone').value = '';
                document.getElementById('authCode').value = '';
                syncSecretInputMode();
            } else {
                showMessage(result.message || '登录失败', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('网络错误，请检查后端服务', 'error');
        } finally {
            loginBtn.textContent = '登 录';
            loginBtn.disabled = false;
        }
    }

    function syncSecretInputMode() {
        const accountInput = document.getElementById('authPhone');
        const secretInput = document.getElementById('authCode');
        if (!accountInput || !secretInput) return;

        const account = accountInput.value.trim();
        const phoneMode = !account || /^\d+$/.test(account);

        secretInput.maxLength = phoneMode ? 6 : 64;
        secretInput.setAttribute('inputmode', phoneMode ? 'numeric' : 'text');
        secretInput.setAttribute('autocomplete', phoneMode ? 'one-time-code' : 'current-password');
        secretInput.placeholder = phoneMode ? '验证码' : '密码';
    }

    function handleLogout() {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem(STORAGE_KEY);
            renderSidebarBtn();
            // 触发登出事件
            window.dispatchEvent(new CustomEvent('cipher-logout-success'));
        }
    }

    // === 状态管理 ===
    function saveUser(user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }

    function getUser() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return null;
        try {
            const user = JSON.parse(data);
            if (!user || !user.token) return null;
            return user;
        } catch (error) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    function getAuthHeaders() {
        const user = getUser();
        return user && user.token ? { Authorization: `Bearer ${user.token}` } : {};
    }

    function showMessage(msg, type = 'error') {
        const el = document.getElementById('authMessage');
        if (el) {
            el.textContent = msg;
            el.className = `auth-message ${type}`;
        }
    }

    // === 公开接口 ===
    window.CipherAuth = {
        getUser: getUser,
        getAuthHeaders: getAuthHeaders,
        openModal: openModal
    };

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
