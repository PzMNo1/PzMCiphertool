// agentmaster.js
document.addEventListener('DOMContentLoaded', () => {
    const agentConfig = getAgentConfig();
    const AGENT_API_URL = resolveChatCompletionsUrl(agentConfig.baseUrl);
    const AGENT_MODEL = agentConfig.model;
    const AGENT_API_KEY = agentConfig.apiKey;
    const AGENT_USE_NATIVE_TOOLS = agentConfig.useNativeTools;

    const chatWindow = document.getElementById('agent-chat-window');
    const collapseBtn = document.getElementById('agent-collapse-btn');
    const history = document.getElementById('agent-chat-history');
    const suggestions = document.querySelector('.agent-suggestions');
    const textarea = document.getElementById('agent-textarea');
    const submitBtn = document.getElementById('agent-submit-btn');

    if (!chatWindow || !collapseBtn || !history || !textarea || !submitBtn) return;

    let isChatActive = false;
    let isDocked = false;
    let wasChatActiveBeforeDock = false;
    let didDragOrb = false;
    let dockTimer = null;
    const orb = createAgentOrb();
    let messages = [
        {
            role: 'system',
            content: [
                'You are PzM assistant, a page-control agent embedded in this toolkit UI.',
                'You can answer questions normally, and when the user asks you to operate the page, call the ui_action tool.',
                'Use tools for visible UI operations such as opening sections, switching cipher tabs, filling inputs, clicking controls, scrolling, searching, and highlighting.',
                'If native tool calls are not available, emit one or more exact UI operation blocks in this format: <ui_action>{"action":"navigate_section","target":"jiamishiyanshi"}</ui_action>.',
                'Do not wrap ui_action blocks in Markdown code fences.',
                'Prefer one or more precise tool calls over long instructions when the user asks you to manipulate the page.',
                'Available section targets: jiamishiyanshi, electroniclab, workflow, zhishitupu, damoxing, yijianfankui.',
                'Available cipher submodule targets: mimaqu, xiandaiqu, luojimiti, cihuiqu, yuliu.'
            ].join('\n')
        }
    ];

    const uiActionTool = {
        type: 'function',
        function: {
            name: 'ui_action',
            description: 'Operate the current web page UI in a controlled way.',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: [
                            'navigate_section',
                            'switch_submodule',
                            'set_value',
                            'click',
                            'search',
                            'clear_search',
                            'highlight',
                            'scroll_to'
                        ],
                        description: 'The UI operation to execute.'
                    },
                    target: {
                        type: 'string',
                        description: 'A known target id/name or a CSS selector. Examples: jiamishiyanshi, mimaqu, #mainInput, .usage-guide-btn.'
                    },
                    value: {
                        type: 'string',
                        description: 'Text/value for set_value or search.'
                    },
                    append: {
                        type: 'boolean',
                        description: 'Append value instead of replacing it when action is set_value.'
                    },
                    reason: {
                        type: 'string',
                        description: 'Short natural-language reason shown in the tool status.'
                    }
                },
                required: ['action']
            }
        }
    };

    // MathJax
    if (!window.MathJax) {
        window.MathJax = {
            tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
            svg: { fontCache: 'global' }
        };
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        s.async = true;
        s.onload = () => window.MathJax?.typesetPromise?.([history]).catch(() => { });
        document.head.appendChild(s);
    }

    let mjBusy = false, mjLast = 0;
    function renderMath(el) {
        if (window.MathJax?.typesetPromise && !mjBusy && Date.now() - mjLast > 250) {
            mjBusy = true; mjLast = Date.now();
            window.MathJax.typesetPromise([el]).finally(() => { mjBusy = false; });
        }
    }

    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = s => esc(s).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');

    function fmt(text) {
        if (!text) return '';
        const lines = String(text).split('\n');
        let html = '', inCode = false, inMath = false, buf = [];

        for (const line of lines) {
            const t = line.trim();

            if (t.startsWith('```')) {
                if (inCode) { html += `<pre><code>${esc(buf.join('\n'))}</code></pre>`; buf = []; }
                inCode = !inCode;
                continue;
            }
            if (inCode) { buf.push(line); continue; }

            if (!inMath && (t.startsWith('\\[') || t.startsWith('$$'))) {
                inMath = true; buf.push(line);
                if ((t.endsWith('\\]') || t.endsWith('$$')) && t.length > 2) {
                    html += `<div class="math-block">${buf.join('\n')}</div>`; buf = []; inMath = false;
                }
                continue;
            }
            if (inMath) {
                buf.push(line);
                if (t.endsWith('\\]') || t.endsWith('$$')) {
                    html += `<div class="math-block">${buf.join('\n')}</div>`; buf = []; inMath = false;
                }
                continue;
            }

            if (!t) continue;
            if (t.startsWith('### ')) html += `<h3>${inline(t.slice(4))}</h3>`;
            else if (t.startsWith('## ')) html += `<h2>${inline(t.slice(3))}</h2>`;
            else if (t.startsWith('# ')) html += `<h1>${inline(t.slice(2))}</h1>`;
            else if (/^[-*] /.test(t)) html += `<ul><li>${inline(t.slice(2))}</li></ul>`;
            else html += `<p>${inline(line)}</p>`;
        }

        if (inCode) html += `<pre><code>${esc(buf.join('\n'))}</code></pre>`;
        if (inMath) html += `<div class="math-block">${buf.join('\n')}</div>`;
        return html.replace(/<\/ul><ul>/g, '');
    }

    textarea.addEventListener('input', function () {
        this.style.height = '24px';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    textarea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    submitBtn.addEventListener('click', dockAgent);

    collapseBtn.addEventListener('click', closeChatWindow);
    textarea.addEventListener('focus', () => {
        if (!isChatActive && messages.length > 1) {
            chatWindow.classList.add('active');
            isChatActive = true;
            suggestions?.classList.add('hidden');
        }
    });
    document.querySelectorAll('.agent-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => { textarea.value = btn.textContent; send(); });
    });

    const scrollDown = () => setTimeout(() => history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' }), 10);

    function addMsg(role, text) {
        const d = document.createElement('div');
        d.className = `agent-msg agent-msg-${role}`;
        role === 'user' ? (d.textContent = text) : (d.innerHTML = fmt(text));
        history.appendChild(d);
        scrollDown();
        return d;
    }

    function addToolMsg(text) {
        const d = document.createElement('div');
        d.className = 'agent-msg agent-msg-tool';
        d.textContent = text;
        history.appendChild(d);
        scrollDown();
        return d;
    }

    function showLoading() {
        const d = document.createElement('div');
        d.className = 'agent-msg agent-msg-ai agent-loading';
        d.innerHTML = '<div class="agent-dot"></div><div class="agent-dot"></div><div class="agent-dot"></div>';
        history.appendChild(d);
        scrollDown();
        return d;
    }

    async function send() {
        const text = textarea.value.trim();
        if (!text) return;
        textarea.value = '';
        textarea.style.height = '24px';
        suggestions?.classList.add('hidden');

        if (!isChatActive) { chatWindow.classList.add('active'); isChatActive = true; }

        addMsg('user', text);
        messages.push({ role: 'user', content: text });
        const loader = showLoading();

        try {
            const payload = {
                model: AGENT_MODEL,
                messages,
                stream: true
            };

            if (AGENT_USE_NATIVE_TOOLS) {
                payload.tools = [uiActionTool];
            }

            if (!AGENT_API_KEY) {
                loader.remove();
                addMsg('ai', '**[Config Error]** Missing `window.AGENTMASTER_CONFIG.apiKey`.');
                return;
            }

            const res = await fetch(AGENT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AGENT_API_KEY}`
                },
                body: JSON.stringify(payload)
            });

            loader.remove();

            if (!res.ok) {
                const errorText = await res.text().catch(() => '');
                const detail = errorText ? `\n\n${errorText.slice(0, 500)}` : '';
                addMsg('ai', `**[Error]** API request failed: ${res.status}${detail}`);
                return;
            }

            const { reply, toolCalls, inlineActions } = await readStream(res);

            if (reply) {
                messages.push({ role: 'assistant', content: reply });
            }

            if (toolCalls.length > 0 || inlineActions.length > 0) {
                const executed = [
                    ...executeToolCalls(toolCalls),
                    ...executeInlineActions(inlineActions)
                ];
                if (!reply) {
                    messages.push({ role: 'assistant', content: executed.join('\n') || 'UI action completed.' });
                }
            }
        } catch (err) {
            loader.remove();
            addMsg('ai', `**[Network Error]** ${err.message}`);
        }
    }

    async function readStream(res) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let reply = '', buf = '';
        const toolCalls = [];
        const msgDiv = addMsg('ai', '');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop();

            for (const line of lines) {
                const t = line.trim();
                if (!t.startsWith('data: ') || t === 'data: [DONE]') continue;

                try {
                    const data = JSON.parse(t.slice(6));
                    if (data.error) {
                        reply += `\n**[Error]** ${data.error}`;
                    }

                    const choice = data.choices?.[0];
                    const delta = choice?.delta;
                    if (!delta) continue;

                    if (delta.content) {
                        reply += delta.content;
                        msgDiv.innerHTML = fmt(reply) + '<span class="agent-caret"></span>';
                        renderMath(msgDiv);
                        history.scrollTop = history.scrollHeight;
                    }

                    if (delta.tool_calls) {
                        mergeToolCalls(toolCalls, delta.tool_calls);
                    }
                } catch {
                    // Ignore malformed SSE fragments from compatible providers.
                }
            }
        }

        const parsed = extractInlineUiActions(reply);
        msgDiv.innerHTML = parsed.text ? fmt(parsed.text) : '<p>正在操作页面...</p>';
        window.MathJax?.typesetPromise?.([msgDiv]);
        return {
            reply: parsed.text,
            toolCalls: compactToolCalls(toolCalls),
            inlineActions: parsed.actions
        };
    }

    function mergeToolCalls(store, partials) {
        for (const partial of partials) {
            const index = partial.index ?? store.length;
            if (!store[index]) {
                store[index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
            }
            if (partial.id) store[index].id = partial.id;
            if (partial.type) store[index].type = partial.type;
            if (partial.function?.name) store[index].function.name += partial.function.name;
            if (partial.function?.arguments) store[index].function.arguments += partial.function.arguments;
        }
    }

    function compactToolCalls(toolCalls) {
        return toolCalls
            .filter(Boolean)
            .filter(call => call.function?.name)
            .map(call => ({
                name: call.function.name,
                arguments: call.function.arguments || '{}'
            }));
    }

    function executeToolCalls(toolCalls) {
        const results = [];
        for (const call of toolCalls) {
            if (call.name !== 'ui_action') continue;
            try {
                const args = JSON.parse(call.arguments || '{}');
                const result = executeUiAction(args);
                results.push(result.message);
                addToolMsg(result.message);
            } catch (err) {
                const message = `UI action failed: ${err.message}`;
                results.push(message);
                addToolMsg(message);
            }
        }
        return results;
    }

    function executeInlineActions(actions) {
        const results = [];
        for (const args of actions) {
            try {
                const result = executeUiAction(args);
                results.push(result.message);
                addToolMsg(result.message);
            } catch (err) {
                const message = `UI action failed: ${err.message}`;
                results.push(message);
                addToolMsg(message);
            }
        }
        return results;
    }

    function extractInlineUiActions(text) {
        const actions = [];
        const cleaned = String(text || '').replace(/<ui_action>([\s\S]*?)<\/ui_action>/g, (_, raw) => {
            try {
                const parsed = JSON.parse(raw.trim());
                actions.push(parsed);
            } catch {
                // Leave malformed action blocks visible for debugging.
                return _;
            }
            return '';
        }).trim();
        return { text: cleaned, actions };
    }

    function executeUiAction(args) {
        const action = args.action;
        const target = normalizeTarget(args.target || '');
        const value = String(args.value ?? '');

        switch (action) {
            case 'navigate_section':
                return navigateSection(target, args.reason);
            case 'switch_submodule':
                return switchSubmodule(target, args.reason);
            case 'set_value':
                return setValue(target, value, Boolean(args.append), args.reason);
            case 'click':
                return clickElement(target, args.reason);
            case 'search':
                return searchCards(value || target, args.reason);
            case 'clear_search':
                return searchCards('', args.reason);
            case 'highlight':
                return highlightElement(target, args.reason);
            case 'scroll_to':
                return scrollToElement(target, args.reason);
            default:
                throw new Error(`unknown action "${action}"`);
        }
    }

    function normalizeTarget(target) {
        const aliases = {
            '加密实验室': 'jiamishiyanshi',
            '密码': 'jiamishiyanshi',
            '电子实验室': 'electroniclab',
            '电路': 'electroniclab',
            '工作流': 'workflow',
            '知识图谱': 'zhishitupu',
            '大模型': 'damoxing',
            '联系我们': 'yijianfankui',
            '反馈': 'yijianfankui',
            '经典区': 'mimaqu',
            '现代区': 'xiandaiqu',
            '逻辑区': 'luojimiti',
            '词汇区': 'cihuiqu',
            '预留区': 'yuliu',
            'mainInput': '#mainInput',
            '主输入框': '#mainInput'
        };
        aliases.Agent = 'damoxing';
        aliases.agent = 'damoxing';
        return aliases[target] || target;
    }

    function navigateSection(target, reason) {
        const item = document.querySelector(`.menu-item[data-target="${cssEscape(target)}"]`);
        if (!item) throw new Error(`section not found: ${target}`);
        item.click();
        return ok(`已打开 ${item.textContent.trim() || target}`, reason);
    }

    function switchSubmodule(target, reason) {
        const btn = document.querySelector(`.submodule-btn[data-target="${cssEscape(target)}"]`);
        if (!btn) throw new Error(`submodule not found: ${target}`);
        btn.click();
        return ok(`已切换到 ${btn.textContent.trim() || target}`, reason);
    }

    function setValue(target, value, append, reason) {
        const el = findElement(target || '#mainInput');
        if (!el) throw new Error(`element not found: ${target}`);

        if ('value' in el) {
            el.value = append ? el.value + value : value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.isContentEditable) {
            el.textContent = append ? el.textContent + value : value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            throw new Error(`element is not editable: ${target}`);
        }

        el.focus?.();
        return ok(`已填写 ${describeElement(el)}`, reason);
    }

    function clickElement(target, reason) {
        const el = findElement(target);
        if (!el) throw new Error(`element not found: ${target}`);
        el.click();
        return ok(`已点击 ${describeElement(el)}`, reason);
    }

    function searchCards(query, reason) {
        const globalSearch = document.getElementById('cardSearch');
        if (globalSearch) {
            globalSearch.value = query;
            globalSearch.dispatchEvent(new Event('input', { bubbles: true }));
        }

        const activeQuickSearch = document.querySelector('.submodule.active .quick-nav-input');
        if (activeQuickSearch) {
            activeQuickSearch.value = query;
            activeQuickSearch.dispatchEvent(new Event('input', { bubbles: true }));
        }

        return ok(query ? `已搜索 "${query}"` : '已清空搜索', reason);
    }

    function highlightElement(target, reason) {
        const el = findElement(target);
        if (!el) throw new Error(`element not found: ${target}`);
        el.classList.add('agent-ui-highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => el.classList.remove('agent-ui-highlight'), 2600);
        return ok(`已高亮 ${describeElement(el)}`, reason);
    }

    function scrollToElement(target, reason) {
        const el = findElement(target);
        if (!el) throw new Error(`element not found: ${target}`);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return ok(`已滚动到 ${describeElement(el)}`, reason);
    }

    function findElement(target) {
        if (!target) return null;
        if (target.startsWith('#') || target.startsWith('.') || target.startsWith('[')) {
            return document.querySelector(target);
        }
        return document.getElementById(target) || document.querySelector(target);
    }

    function ok(message, reason) {
        return { success: true, message: reason ? `${message}：${reason}` : message };
    }

    function describeElement(el) {
        if (el.id) return `#${el.id}`;
        const label = el.textContent?.trim();
        if (label) return label.slice(0, 24);
        return el.tagName.toLowerCase();
    }

    function cssEscape(value) {
        if (window.CSS?.escape) return CSS.escape(value);
        return String(value).replace(/["\\]/g, '\\$&');
    }

    window.openAgentMasterWithPrompt = function (prompt) {
        const text = String(prompt || '').trim();
        if (!text) return;
        restoreAgent();
        chatWindow.classList.add('active');
        isChatActive = true;
        suggestions?.classList.add('hidden');
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        send();
    };

    function createAgentOrb() {
        const button = document.createElement('button');
        button.id = 'agent-orb';
        button.type = 'button';
        button.setAttribute('aria-label', '展开助手');
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="8"></circle>
                <path d="M8.5 16l3.5-8 3.5 8"></path>
                <path d="M10 13h4"></path>
            </svg>`;
        chatWindow.parentElement.appendChild(button);
        button.addEventListener('click', () => {
            if (didDragOrb) {
                didDragOrb = false;
                return;
            }
            restoreAgent();
        });
        enableOrbDrag(button);
        return button;
    }

    function dockAgent() {
        if (isDocked || dockTimer) return;
        wasChatActiveBeforeDock = isChatActive;
        chatWindow.classList.remove('active');
        suggestions?.classList.add('hidden');
        isChatActive = false;
        orb.parentElement.classList.add('agent-docking');
        dockTimer = setTimeout(() => {
            dockTimer = null;
            isDocked = true;
            applyOrbPosition();
            orb.parentElement.classList.remove('agent-docking');
            orb.parentElement.classList.add('agent-docked');
        }, 240);
    }

    function closeChatWindow() {
        chatWindow.classList.remove('active');
        suggestions?.classList.add('hidden');
        isChatActive = false;
        wasChatActiveBeforeDock = false;
    }

    function restoreAgent() {
        if (dockTimer) {
            clearTimeout(dockTimer);
            dockTimer = null;
            orb.parentElement.classList.remove('agent-docking');
        }
        if (!isDocked) return;
        isDocked = false;
        orb.parentElement.classList.remove('agent-docked', 'agent-dragging');
        orb.parentElement.style.left = '';
        orb.parentElement.style.top = '';
        orb.parentElement.style.right = '';
        orb.parentElement.style.bottom = '';
        orb.parentElement.style.transform = '';
        if (wasChatActiveBeforeDock || messages.length > 1) {
            chatWindow.classList.add('active');
            isChatActive = true;
            suggestions?.classList.add('hidden');
        } else {
            suggestions?.classList.remove('hidden');
        }
        textarea.focus();
    }

    function applyOrbPosition() {
        const saved = readOrbPosition();
        const pos = saved || { left: window.innerWidth - 82, top: window.innerHeight - 82 };
        moveOrbTo(pos.left, pos.top);
    }

    function enableOrbDrag(button) {
        let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;

        button.addEventListener('pointerdown', event => {
            if (!isDocked) return;
            dragging = true;
            didDragOrb = false;
            startX = event.clientX;
            startY = event.clientY;
            const rect = button.parentElement.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            button.parentElement.classList.add('agent-dragging');
            button.setPointerCapture?.(event.pointerId);
        });

        button.addEventListener('pointermove', event => {
            if (!dragging) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragOrb = true;
            moveOrbTo(startLeft + dx, startTop + dy);
        });

        const finishDrag = event => {
            if (!dragging) return;
            dragging = false;
            button.parentElement.classList.remove('agent-dragging');
            button.releasePointerCapture?.(event.pointerId);
            const rect = button.parentElement.getBoundingClientRect();
            saveOrbPosition(rect.left, rect.top);
        };

        button.addEventListener('pointerup', finishDrag);
        button.addEventListener('pointercancel', finishDrag);
    }

    function moveOrbTo(left, top) {
        const wrapper = orb.parentElement;
        const maxLeft = Math.max(10, window.innerWidth - 68);
        const maxTop = Math.max(10, window.innerHeight - 68);
        const clampedLeft = Math.min(Math.max(10, left), maxLeft);
        const clampedTop = Math.min(Math.max(10, top), maxTop);
        wrapper.style.left = `${clampedLeft}px`;
        wrapper.style.top = `${clampedTop}px`;
        wrapper.style.right = 'auto';
        wrapper.style.bottom = 'auto';
        wrapper.style.transform = 'none';
    }

    function readOrbPosition() {
        try {
            const raw = localStorage.getItem('AGENTMASTER_ORB_POSITION');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) return parsed;
        } catch {
            return null;
        }
        return null;
    }

    function saveOrbPosition(left, top) {
        localStorage.setItem('AGENTMASTER_ORB_POSITION', JSON.stringify({ left, top }));
    }

    function getAgentConfig() {
        const config = window.AGENTMASTER_CONFIG || {};
        const model = config.model || localStorage.getItem('AGENTMASTER_MODEL') || 'deepseek-v4-pro';
        return {
            apiKey: config.apiKey || localStorage.getItem('AGENTMASTER_API_KEY') || '',
            baseUrl: config.baseUrl || localStorage.getItem('AGENTMASTER_BASE_URL') || 'https://api.deepseek.com/v1',
            model: normalizeDeepSeekModel(model),
            useNativeTools: config.useNativeTools === true || localStorage.getItem('AGENTMASTER_USE_NATIVE_TOOLS') === 'true'
        };
    }

    function normalizeDeepSeekModel(model) {
        const normalized = String(model || '').trim();
        if (normalized === 'deepseek-v4-pro' || normalized === 'deepseek-v4-flash') return normalized;
        if (normalized === 'deepseekv4' || normalized === 'deepseek-v4') return 'deepseek-v4-pro';
        return normalized || 'deepseek-v4-pro';
    }

    function resolveChatCompletionsUrl(baseUrl) {
        let normalized = String(baseUrl || 'https://api.deepseek.com/v1').trim();
        while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
        if (normalized.endsWith('/chat/completions')) return normalized;
        return `${normalized}/chat/completions`;
    }
});
