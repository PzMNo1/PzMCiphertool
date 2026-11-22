/*!
 * PzM Agent 模块顶部滑动按钮（占位）
 *
 * 按用户要求，产物工作区面板与全部功能已删除；这里只保留顶部居中的
 * 半透明横线入口，向下拖动有回弹反馈，点击显示“暂未开放”提示。
 */
(function () {
    'use strict';

    if (window.__PZM_HIDDEN_CODE_PANEL__) return;
    window.__PZM_HIDDEN_CODE_PANEL__ = true;

    const state = {
        drag: null,
        hintTimer: 0,
        els: null,
        visibilityObserver: null
    };

    function buildRoot() {
        const root = document.createElement('div');
        root.id = 'hcp-root';
        root.className = 'hcp-root hcp-module-hidden';
        root.innerHTML = `
            <button id="hcp-handle" class="hcp-handle" type="button"
                aria-label="编程面板入口（暂未开放）"
                title="编程面板（暂未开放）">
                <span class="hcp-handle-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                <span class="hcp-handle-arrow" aria-hidden="true"></span>
            </button>
            <span id="hcp-handle-hint" class="hcp-handle-hint" aria-hidden="true">编程面板 · 暂未开放</span>
        `;
        return root;
    }

    function agentModuleVisible() {
        const container = document.getElementById('damoxing-container');
        const content = document.getElementById('damoxing-content');
        if (!container || !content) return false;
        return getComputedStyle(container).display !== 'none'
            && getComputedStyle(content).display !== 'none';
    }

    function syncVisibility() {
        if (!state.els) return;
        const visible = agentModuleVisible();
        state.els.root.classList.toggle('hcp-module-hidden', !visible);
        if (!visible) hideHint();
    }

    function observeVisibility() {
        const targets = [
            document.getElementById('damoxing-container'),
            document.getElementById('damoxing-content')
        ].filter(Boolean);
        state.visibilityObserver = new MutationObserver(syncVisibility);
        targets.forEach((target) => {
            state.visibilityObserver.observe(target, { attributes: true, attributeFilter: ['style', 'class'] });
        });
    }

    function showHint() {
        if (!state.els) return;
        state.els.root.classList.add('hcp-hint-on');
        window.clearTimeout(state.hintTimer);
        state.hintTimer = window.setTimeout(() => {
            if (state.els) state.els.root.classList.remove('hcp-hint-on');
        }, 2200);
    }

    function hideHint() {
        window.clearTimeout(state.hintTimer);
        if (state.els) state.els.root.classList.remove('hcp-hint-on');
    }

    function bindDrag() {
        const handle = state.els.handle;
        handle.addEventListener('pointerdown', (event) => {
            if (event.button > 0) return;
            state.drag = {
                pointerId: event.pointerId,
                startY: event.clientY,
                dy: 0,
                moved: false
            };
            handle.setPointerCapture(event.pointerId);
            handle.classList.add('is-grabbing');
        });
        handle.addEventListener('pointermove', (event) => {
            const drag = state.drag;
            if (!drag || drag.pointerId !== event.pointerId) return;
            drag.dy = event.clientY - drag.startY;
            if (Math.abs(drag.dy) > 6) drag.moved = true;
            const offset = Math.max(0, Math.min(drag.dy * 0.65, 34));
            handle.style.transform = `translateX(-50%) translateY(${offset}px)`;
            if (drag.moved) event.preventDefault();
        });
        const finish = (event, cancelled) => {
            const drag = state.drag;
            if (!drag || drag.pointerId !== event.pointerId) return;
            state.drag = null;
            handle.classList.remove('is-grabbing');
            handle.style.transform = '';
            if (!cancelled && !drag.moved) showHint();
        };
        handle.addEventListener('pointerup', (event) => finish(event, false));
        handle.addEventListener('pointercancel', (event) => finish(event, true));
        handle.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                showHint();
            }
        });
    }

    function init() {
        if (document.getElementById('hcp-root')) return true;
        if (!document.getElementById('damoxing-container')) return false;
        const root = buildRoot();
        // 挂到 body：Agent 容器带有 z-index 堆叠上下文，会让入口被侧边栏/悬浮球盖住。
        document.body.appendChild(root);
        state.els = {
            root,
            handle: root.querySelector('#hcp-handle'),
            hint: root.querySelector('#hcp-handle-hint')
        };
        bindDrag();
        observeVisibility();
        syncVisibility();
        return true;
    }

    function boot(attempt) {
        if (init()) return;
        if (attempt > 40) return;
        window.setTimeout(() => boot(attempt + 1), 250);
    }

    window.initHiddenCodePanel = init;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => boot(0), { once: true });
    } else {
        boot(0);
    }
})();
