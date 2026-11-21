/*
 * PWA 注册脚本：注册 service worker，让站点可“添加到主屏幕”并支持离线打开。
 * 只在安全上下文（https / localhost）下注册，失败时静默降级，不影响页面功能。
 */
(function () {
    'use strict';

    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

    function register() {
        navigator.serviceWorker.register('./sw.js', {
            scope: './',
            updateViaCache: 'none'
        }).then(function (registration) {
            // 新版本已就绪时立即接管，避免用户长时间停留在旧缓存上。
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            registration.addEventListener('updatefound', function () {
                var worker = registration.installing;
                if (!worker) return;
                worker.addEventListener('statechange', function () {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        worker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
        }).catch(function (error) {
            if (window.console && console.warn) {
                console.warn('[PWA] Service worker 注册失败：', error);
            }
        });
    }

    if (document.readyState === 'complete') {
        register();
    } else {
        window.addEventListener('load', register, { once: true });
    }
})();
