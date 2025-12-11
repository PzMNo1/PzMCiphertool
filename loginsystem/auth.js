/**
 * 登录系统逻辑
 * 包含 UI 生成、事件处理和模拟后端 API
 */

(function() {
    // === 配置 ===
    const MOCK_CODE = '123456'; 
    const STORAGE_KEY = 'cipher_toolbox_user';
    
    // === HTML 模板 ===
    const modalHTML = `
        <div class="auth-modal-overlay" id="authModal">
            <div class="auth-modal">
                <div class="auth-header">
                    <span>用户登录</span>
                    <button class="auth-close-btn" id="authClose">&times;</button>
                </div>
                <div class="auth-form">
                    <div class="auth-form-group">
                        <input type="tel" class="auth-input" id="authPhone" placeholder="请输入手机号" maxlength="11">
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
        return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }

    // === 事件绑定 ===
    function bindEvents() {
        const modal = document.getElementById('authModal');
        const closeBtn = document.getElementById('authClose');
        const sendCodeBtn = document.getElementById('authSendCode');
        const loginBtn = document.getElementById('authLoginBtn');
        const inputs = document.querySelectorAll('.auth-input');

        // 关闭模态框
        closeBtn.addEventListener('click', closeModal);

        // 发送验证码
        sendCodeBtn.addEventListener('click', handleSendCode);

        // 登录
        loginBtn.addEventListener('click', handleLogin);

        // 输入框聚焦清除错误信息
        inputs.forEach(input => {
            input.addEventListener('focus', () => showMessage(''));
        });
    }

    // === 业务逻辑 ===
    function openModal() {
        document.getElementById('authModal').classList.add('active');
        showMessage('');
    }

    function closeModal() {
        document.getElementById('authModal').classList.remove('active');
    }

    function handleSendCode() {
        const phone = document.getElementById('authPhone').value.trim();
        const btn = document.getElementById('authSendCode');
        
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            showMessage('请输入有效的手机号码', 'error');
            return;
        }

        // 模拟发送请求
        btn.disabled = true;
        btn.textContent = '发送中...';

        setTimeout(() => {
            // 模拟成功
            console.log(`【模拟短信网关】验证码已发送至 ${phone}: ${MOCK_CODE}`);
            alert(`【模拟测试】您的验证码是: ${MOCK_CODE}`);
            
            showMessage('验证码已发送', 'success');
            startCountdown(60);
        }, 1000);
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

    function handleLogin() {
        const phone = document.getElementById('authPhone').value.trim();
        const code = document.getElementById('authCode').value.trim();

        if (!phone || !code) {
            showMessage('请填写完整信息', 'error');
            return;
        }

        // 模拟登录请求
        const loginBtn = document.getElementById('authLoginBtn');
        loginBtn.textContent = '登录中...';
        loginBtn.disabled = true;

        setTimeout(() => {
            loginBtn.textContent = '登 录';
            loginBtn.disabled = false;

            if (code !== MOCK_CODE) {
                showMessage('验证码错误 (测试码: 123456)', 'error');
                return;
            }

            // 登录成功
            saveUser({ phone: phone, loginTime: new Date().toISOString() });
            closeModal();
            renderSidebarBtn();
            alert('登录成功！');
            
            // 清空表单
            document.getElementById('authPhone').value = '';
            document.getElementById('authCode').value = '';

        }, 1000);
    }

    function handleLogout() {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem(STORAGE_KEY);
            renderSidebarBtn();
        }
    }

    // === 状态管理 ===
    function saveUser(user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }

    function getUser() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    }

    function showMessage(msg, type = 'error') {
        const el = document.getElementById('authMessage');
        el.textContent = msg;
        el.className = `auth-message ${type}`;
    }

    // 启动
    document.addEventListener('DOMContentLoaded', init);

})();

