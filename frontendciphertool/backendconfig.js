/**
 * 后端地址统一配置
 * 本地开发时用 localhost:8080，线上自动切换到生产服务器。
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

    window.CIPHERTOOL_API_BASE = isLocal
        ? 'http://localhost:8080'
        : 'https://waiw.ozqmp.com';

    window.DEEPSEEK_CONFIG = Object.assign({}, window.DEEPSEEK_CONFIG || {}, {
        model: 'deepseek-v4-flash',
        defaultModel: 'deepseek-v4-flash',
        reasonerModel: 'deepseek-v4-flash'
    });

    window.AGENTMASTER_CONFIG = Object.assign({}, window.AGENTMASTER_CONFIG || {}, {
        model: 'deepseek-v4-flash'
    });
})();
