/*!
 * PzM Agent 模块顶部滑动入口
 *
 * 顶部居中的半透明横线按钮同时是「工程模式」开关：
 * 点击或向下拖动进入 / 退出工程模式。工程模式只切换 Agent 的会话历史，
 * 并隐藏作图、视频创作入口，不新增任何面板。
 */
(function () {
    'use strict';

    if (window.__PZM_HIDDEN_CODE_PANEL__) return;
    window.__PZM_HIDDEN_CODE_PANEL__ = true;

    const MODE_STORAGE_KEY = 'pzm_agent_engineering_mode_v1';
    const BODY_CLASS = 'pzm-engineering-mode';
    const PULL_THRESHOLD = 26;

    const state = {
        drag: null,
        hintTimer: 0,
        els: null,
        visibilityObserver: null,
        mode: false
    };

    function buildRoot() {
        const root = document.createElement('div');
        root.id = 'hcp-root';
        root.className = 'hcp-root hcp-module-hidden';
        root.innerHTML = `
            <button id="hcp-handle" class="hcp-handle" type="button"
                aria-label="进入工程模式" aria-pressed="false"
                title="进入工程模式">
                <span class="hcp-handle-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                <span class="hcp-handle-arrow" aria-hidden="true"></span>
            </button>
            <span id="hcp-handle-hint" class="hcp-handle-hint" aria-hidden="true">进入工程模式</span>
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

    function readEngineeringMode() {
        try {
            if (typeof window.historyManager?.isEngineeringMode === 'function') {
                return window.historyManager.isEngineeringMode();
            }
            return localStorage.getItem(MODE_STORAGE_KEY) === '1';
        } catch (error) {
            return false;
        }
    }

    function syncModeUI() {
        if (!state.els) return;
        state.mode = readEngineeringMode();
        const { root, handle, hint } = state.els;
        const label = state.mode ? '退出工程模式' : '进入工程模式';
        root.classList.toggle('hcp-engineering', state.mode);
        document.body.classList.toggle(BODY_CLASS, state.mode);
        handle.classList.toggle('is-active', state.mode);
        handle.setAttribute('aria-pressed', String(state.mode));
        handle.setAttribute('aria-label', label);
        handle.title = label;
        hint.textContent = state.mode ? '工程模式 · 已开启' : '进入工程模式';
    }

    function rerenderHistory() {
        const search = document.getElementById('history-search');
        if (!search) return;
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function selectorValue(value) {
        const text = String(value || '');
        if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(text);
        return text.replace(/["\\]/g, '\\$&');
    }

    function loadModeChat() {
        const manager = window.historyManager;
        let targetId = '';
        if (manager) {
            const history = manager.getChatHistory();
            const currentId = manager.getCurrentChatId();
            if (currentId && history[currentId]) {
                targetId = currentId;
            } else {
                targetId = manager.getSortedHistory(history)[0]?.id || '';
            }
        }
        if (targetId) {
            const checkbox = document.querySelector(
                `#chat-history-list .history-checkbox[data-id="${selectorValue(targetId)}"]`
            );
            const item = checkbox?.closest('.history-item');
            if (item) {
                item.click();
                return;
            }
        }
        document.getElementById('new-chat')?.click();
    }

    function setEngineeringMode(enabled, options = {}) {
        const manager = window.historyManager;
        if (!manager || typeof manager.setEngineeringMode !== 'function') {
            if (!options.silent) showHint('工程模式暂不可用');
            return false;
        }
        const next = Boolean(enabled);
        if (manager.isEngineeringMode() === next) {
            syncModeUI();
            return next;
        }
        manager.setEngineeringMode(next);
        syncModeUI();
        const activeModeToggle = document.querySelector('#image-mode-toggle.active, #video-mode-toggle.active');
        if (activeModeToggle) activeModeToggle.click();
        rerenderHistory();
        window.requestAnimationFrame(() => {
            loadModeChat();
            if (!options.silent) showHint(next ? '已进入工程模式' : '已退出工程模式');
        });
        return next;
    }

    function showHint(text) {
        if (!state.els) return;
        if (text) state.els.hint.textContent = text;
        state.els.root.classList.add('hcp-hint-on');
        window.clearTimeout(state.hintTimer);
        state.hintTimer = window.setTimeout(() => {
            if (state.els) {
                state.els.root.classList.remove('hcp-hint-on');
                state.els.hint.textContent = state.mode ? '工程模式 · 已开启' : '进入工程模式';
            }
        }, 2200);
    }

    function hideHint() {
        window.clearTimeout(state.hintTimer);
        if (state.els) {
            state.els.root.classList.remove('hcp-hint-on');
            state.els.hint.textContent = state.mode ? '工程模式 · 已开启' : '进入工程模式';
        }
    }

    function toggleEngineeringMode() {
        setEngineeringMode(!state.mode);
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
            if (cancelled) return;
            if (!drag.moved || drag.dy >= PULL_THRESHOLD) toggleEngineeringMode();
        };
        handle.addEventListener('pointerup', (event) => finish(event, false));
        handle.addEventListener('pointercancel', (event) => finish(event, true));
        handle.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleEngineeringMode();
            }
        });
    }

    function init() {
        if (document.getElementById('hcp-root')) {
            syncModeUI();
            syncVisibility();
            return true;
        }
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
        syncModeUI();
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
