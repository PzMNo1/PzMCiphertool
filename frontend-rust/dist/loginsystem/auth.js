/**
 * 登录系统逻辑
 * 包含 UI 生成、事件处理和后端 API 调用 (邮箱版)
 */

(function() {
    // === 配置 ===
    const API_BASE = window.CIPHERTOOL_API_BASE || 'http://localhost:8080'; 
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
                        <input type="email" class="auth-input" id="authEmail" placeholder="请输入邮箱地址">
                    </div>
                    <div class="auth-form-group auth-code-container">
                        <input type="text" class="auth-input" id="authCode" placeholder="验证码" maxlength="6">
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
                    <span class="menu-text">退出登录 (${maskEmail(user.email)})</span>
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

    function maskEmail(email) {
        if (!email || !email.includes('@')) return email;
        const [name, domain] = email.split('@');
        if (name.length <= 3) return email;
        return name.substring(0, 3) + '****@' + domain;
    }

    // === 事件绑定 ===
    function bindEvents() {
        const closeBtn = document.getElementById('authClose');
        const sendCodeBtn = document.getElementById('authSendCode');
        const loginBtn = document.getElementById('authLoginBtn');
        const inputs = document.querySelectorAll('.auth-input');

        // 关闭模态框
        if(closeBtn) closeBtn.addEventListener('click', closeModal);

        // 发送验证码
        if(sendCodeBtn) sendCodeBtn.addEventListener('click', handleSendCode);

        // 登录
        if(loginBtn) loginBtn.addEventListener('click', handleLogin);

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
        const email = document.getElementById('authEmail').value.trim();
        const btn = document.getElementById('authSendCode');
        
        // 简单邮箱正则
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage('请输入有效的邮箱地址', 'error');
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = '发送中...';

            const response = await fetch(`${API_BASE}/api/auth/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            const result = await response.json();

            if (result.success) {
                showMessage('验证码已发送，请查收邮件', 'success');
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
        const email = document.getElementById('authEmail').value.trim();
        const code = document.getElementById('authCode').value.trim();

        if (!email || !code) {
            showMessage('请填写完整信息', 'error');
            return;
        }

        const loginBtn = document.getElementById('authLoginBtn');
        
        try {
            loginBtn.textContent = '登录中...';
            loginBtn.disabled = true;

            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, code: code })
            });

            const result = await response.json();

            if (result.success) {
                // 登录成功
                saveUser({
                    email: result.data.email || email,
                    maskedEmail: result.data.maskedEmail || maskEmail(email),
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
                document.getElementById('authEmail').value = '';
                document.getElementById('authCode').value = '';
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
