/**
 * 后端地址统一配置
 * 本地开发时用 127.0.0.1:8080（避免 localhost 被解析到 IPv6 ::1），线上自动切换到生产服务器。
 * 所有需要后端的模块应通过 window.CIPHERTOOL_API_BASE 取值。
 */
(function () {
    if (window.CIPHERTOOL_API_BASE) return; // 已由其他脚本设置

    var hostname = window.location.hostname || '';
    var isLocal = hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === ''
        || /^192\.168\./.test(hostname)
        || /^10\./.test(hostname);
    var isGithubPages = /\.github\.io$/.test(hostname);

    window.CIPHERTOOL_API_BASE = isLocal
        ? 'http://127.0.0.1:8080'
        : (isGithubPages ? 'https://www.paomian233.com' : window.location.origin);

    // 旧版本可能在 localStorage 里存过 localhost:8080 的聊天地址，统一改成 IPv4 回环地址。
    try {
        var savedChatUrl = localStorage.getItem('CIPHERTOOL_CHAT_API_URL');
        if (savedChatUrl && /^http:\/\/localhost:8080(\/|$)/i.test(savedChatUrl)) {
            localStorage.setItem('CIPHERTOOL_CHAT_API_URL', savedChatUrl.replace(/^http:\/\/localhost:8080/i, 'http://127.0.0.1:8080'));
        }
    } catch (e) { /* ignore */ }

    // 模型配置外部化：优先用户 localStorage 设置，未设置时回退默认值。
    var savedModel = '';
    try {
        savedModel = localStorage.getItem('DEEPSEEK_MODEL') || '';
    } catch (e) {
        savedModel = '';
    }
    // DeepSeek-V4.1-Flash-1017（官方稳定 API 模型名 deepseek-flash）：优先用户 localStorage 设置，未设置时回退默认值。
    var model = savedModel || 'deepseek-flash';

    window.DEEPSEEK_CONFIG = Object.assign({}, window.DEEPSEEK_CONFIG || {}, {
        model: model,
        defaultModel: model,
        reasonerModel: localStorage.getItem('DEEPSEEK_REASONER_MODEL') || model
    });

    window.AGENTMASTER_CONFIG = Object.assign({}, window.AGENTMASTER_CONFIG || {}, {
        model: localStorage.getItem('AGENTMASTER_MODEL') || model
    });
})();
