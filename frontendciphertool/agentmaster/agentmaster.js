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

    const windowAgent = createBrowserWorkspaceAgent();
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
                'Only use tools when the latest user message explicitly asks for a UI operation such as open, switch, click, fill, search, scroll, focus, highlight, close, reload, or navigate.',
                'Do not use tools for explanation, knowledge, definition, debugging, or general Q&A requests, even when they mention module names such as 知识图谱, Agent, Skill/MCP, or 联系我们.',
                'Use tools for visible UI operations such as opening sections, switching cipher tabs, filling inputs, clicking controls, scrolling, searching, and highlighting.',
                'Use browser_action for same-origin project window/tab coordination: list windows, open a project window, switch/focus, close, reload, back/forward, or dispatch ui_action to another registered project window.',
                'Browser boundary: a web page cannot control arbitrary external browser tabs. Coordinate only this project and windows opened by this project; be explicit when the browser blocks focus or popup operations.',
                'If native tool calls are not available, emit exact operation blocks such as <ui_action>{"action":"navigate_section","target":"jiamishiyanshi"}</ui_action> or <browser_action>{"action":"list_windows"}</browser_action>.',
                'Do not wrap ui_action or browser_action blocks in Markdown code fences.',
                'Prefer one or more precise tool calls over long instructions when the user asks you to manipulate the page.',
                'For multi-step page operations, use ui_action action=batch with a steps array instead of narrating each step.',
                'Allowed ui_action actions are exactly: navigate_section, switch_submodule, switch_contact_submodule, open_logic_puzzle, open_space_puzzle, set_value, click, search, clear_search, highlight, scroll_to, focus, select_option, press_key, snapshot, batch.',
                'Never invent action names. Use switch_submodule for cipher tabs, switch_contact_submodule for 联系我们 subpages, open_logic_puzzle for logic puzzles such as 数独/Sudoku, open_space_puzzle for space puzzles such as Skewb, set_value for filling inputs, and click for ordinary buttons.',
                'Available section targets: jiamishiyanshi, electroniclab, workflow, zhishitupu, damoxing, apizhongzhuanzhan, mcpskilllab, yijianfankui.',
                'Available cipher submodule targets: mimaqu, xiandaiqu, luojimiti, cihuiqu, yuliu. Use yuliu for 空间类 / space puzzle.',
                'Available contact submodule targets: guanyuzuozhe, zuozhecaifang, yijianfankui, kaifarizhi.',
                'Available logic puzzle targets include sudoku, akari, nonogram, kakuro, hashi, hitori, nurikabe, slitherlink.',
                'Available space puzzle targets include standard-cube, skewbmofang, jinzitamofang, rubiksclock, squreonemofang, number-huarong, qiqiaoban, pentomino.'
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
                            'switch_contact_submodule',
                            'open_logic_puzzle',
                            'open_space_puzzle',
                            'set_value',
                            'click',
                            'search',
                            'clear_search',
                            'highlight',
                            'scroll_to',
                            'focus',
                            'select_option',
                            'press_key',
                            'snapshot',
                            'batch'
                        ],
                        description: 'The UI operation to execute.'
                    },
                    target: {
                        type: 'string',
                        description: 'A known target id/name or a CSS selector. Examples: jiamishiyanshi, mimaqu, sudoku, skewbmofang, #mainInput, .usage-guide-btn.'
                    },
                    value: {
                        type: 'string',
                        description: 'Text/value for set_value or search.'
                    },
                    append: {
                        type: 'boolean',
                        description: 'Append value instead of replacing it when action is set_value.'
                    },
                    key: {
                        type: 'string',
                        description: 'Keyboard key for press_key, for example Enter, Escape, Tab.'
                    },
                    steps: {
                        type: 'array',
                        description: 'Batch of ui_action argument objects executed in order.',
                        items: { type: 'object' }
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

    const browserActionTool = {
        type: 'function',
        function: {
            name: 'browser_action',
            description: 'Fast browser/project-window operations for this same-origin toolkit workspace.',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: [
                            'list_windows',
                            'new_window',
                            'switch_window',
                            'focus_current',
                            'close_window',
                            'reload_window',
                            'back',
                            'forward',
                            'dispatch_ui_action',
                            'broadcast_ui_action',
                            'set_window_label'
                        ],
                        description: 'The browser/window operation to execute.'
                    },
                    target: {
                        type: 'string',
                        description: 'Window id/label/title/url fragment, or project section target.'
                    },
                    url: {
                        type: 'string',
                        description: 'URL or hash to open for new_window.'
                    },
                    label: {
                        type: 'string',
                        description: 'Human readable label for the current project window.'
                    },
                    ui_action: {
                        type: 'object',
                        description: 'ui_action argument object to dispatch to one or more project windows.'
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

        const fastResult = await tryRunFastCommand(text);
        if (fastResult) {
            if (fastResult.tool) addToolMsg(fastResult.tool);
            if (fastResult.reply) addMsg('ai', fastResult.reply);
            messages.push({ role: 'assistant', content: fastResult.reply || fastResult.tool || 'Fast action completed.' });
            return;
        }

        const allowAgentTools = shouldAllowAgentTools(text);
        const loader = showLoading();

        try {
            const payload = {
                model: AGENT_MODEL,
                messages: buildRequestMessages(messages, allowAgentTools),
                stream: true
            };

            if (AGENT_USE_NATIVE_TOOLS && allowAgentTools) {
                payload.tools = [uiActionTool, browserActionTool];
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

            const { reply, toolCalls, inlineActions } = await readStream(res, allowAgentTools);

            if (reply) {
                messages.push({ role: 'assistant', content: reply });
            }

            if (allowAgentTools && (toolCalls.length > 0 || inlineActions.length > 0)) {
                const executed = [
                    ...await executeToolCalls(toolCalls),
                    ...await executeInlineActions(inlineActions)
                ];
                if (!reply) {
                    messages.push({ role: 'assistant', content: executed.join('\n') || 'UI action completed.' });
                }
            } else if (!allowAgentTools && (toolCalls.length > 0 || inlineActions.length > 0)) {
                addToolMsg('已忽略页面操作：当前消息被识别为普通问答。');
            }
        } catch (err) {
            loader.remove();
            addMsg('ai', `**[Network Error]** ${err.message}`);
        }
    }

    function buildRequestMessages(baseMessages, allowTools) {
        if (allowTools) return baseMessages;
        const guard = {
            role: 'system',
            content: 'The latest user message is a normal information/explanation question, not a page-control request. Do not call tools and do not emit <ui_action> or <browser_action> blocks. Answer directly in the user language.'
        };
        return [baseMessages[0], guard, ...baseMessages.slice(1)];
    }

    async function readStream(res, allowInlineActions = true) {
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

        const parsed = allowInlineActions ? extractInlineActions(reply) : { text: reply, actions: [] };
        msgDiv.innerHTML = parsed.text ? fmt(parsed.text) : (allowInlineActions ? '<p>正在操作页面...</p>' : '<p>我理解这是普通问题，但没有生成回答。</p>');
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

    async function executeToolCalls(toolCalls) {
        const results = [];
        for (const call of toolCalls) {
            try {
                const args = JSON.parse(call.arguments || '{}');
                const result = await executeAgentAction(call.name, args);
                results.push(result.message);
                addToolMsg(result.message);
            } catch (err) {
                const message = `${call.name || 'tool'} failed: ${err.message}`;
                results.push(message);
                addToolMsg(message);
            }
        }
        return results;
    }

    async function executeInlineActions(actions) {
        const results = [];
        for (const action of actions) {
            try {
                const result = await executeAgentAction(action.name, action.arguments);
                results.push(result.message);
                addToolMsg(result.message);
            } catch (err) {
                const message = `${action.name || 'inline action'} failed: ${err.message}`;
                results.push(message);
                addToolMsg(message);
            }
        }
        return results;
    }

    function extractInlineActions(text) {
        const actions = [];
        const cleaned = String(text || '').replace(/<(ui_action|browser_action)>([\s\S]*?)<\/\1>/g, (match, name, raw) => {
            try {
                const parsed = JSON.parse(raw.trim());
                actions.push({ name, arguments: parsed });
            } catch {
                // Leave malformed action blocks visible for debugging.
                return match;
            }
            return '';
        }).trim();
        return { text: cleaned, actions };
    }

    async function executeAgentAction(name, args) {
        if (name === 'ui_action') return executeUiAction(args);
        if (name === 'browser_action') return executeBrowserAction(args);
        throw new Error(`unknown tool "${name}"`);
    }

    function executeUiAction(args) {
        const action = normalizeUiActionName(args.action);
        const target = normalizeTarget(resolveActionTarget(args, action));
        const value = String(args.value ?? args.text ?? args.content ?? args.input ?? '');

        switch (action) {
            case 'navigate_section':
                return navigateSection(target, args.reason);
            case 'switch_submodule':
                return switchSubmodule(target, args.reason);
            case 'switch_contact_submodule':
                return switchContactSubmodule(target, args.reason);
            case 'open_logic_puzzle':
                return openLogicPuzzle(target, args.reason);
            case 'open_space_puzzle':
                return openSpacePuzzle(target, args.reason);
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
            case 'focus':
                return focusElement(target, args.reason);
            case 'select_option':
                return selectOption(target, value, args.reason);
            case 'press_key':
                return pressKey(target, args.key || value, args.reason);
            case 'snapshot':
                return snapshotPage(args.reason);
            case 'batch':
                return executeUiBatch(args.steps, args.reason);
            default:
                throw new Error(`unknown action "${action}"`);
        }
    }

    function resolveActionTarget(args, action) {
        if (!args || typeof args !== 'object') return '';
        const direct = args.target ?? args.selector ?? args.element ?? args.id ?? args.name;
        if (action === 'open_logic_puzzle') return args.puzzle ?? args.logic_puzzle ?? args.logicPuzzle ?? args.puzzle_target ?? args.puzzleTarget ?? direct ?? '';
        if (action === 'open_space_puzzle') {
            return args.puzzle ?? args.space_puzzle ?? args.spacePuzzle ?? args.space_puzzle_target ?? args.spacePuzzleTarget ?? args.puzzle_target ?? args.puzzleTarget ?? args.puzzle_id ?? args.puzzleId ?? direct ?? '';
        }
        if (direct) return direct;
        if (action === 'navigate_section') return args.section ?? args.page ?? args.module ?? '';
        if (action === 'switch_submodule') return args.tab ?? args.submodule ?? args.cipher_tab ?? args.cipherTab ?? '';
        if (action === 'switch_contact_submodule') return args.tab ?? args.submodule ?? args.contact_tab ?? args.contactTab ?? '';
        if (action === 'set_value') return args.field ?? args.input_target ?? args.inputTarget ?? args.input_name ?? args.inputName ?? '#mainInput';
        if (action === 'click') return args.button ?? args.label ?? '';
        return '';
    }

    function normalizeUiActionName(action) {
        const raw = String(action || '').trim();
        const aliases = {
            open_section: 'navigate_section',
            go_to_section: 'navigate_section',
            goto_section: 'navigate_section',
            switch_section: 'navigate_section',
            switch_cipher_tab: 'switch_submodule',
            switch_tab: 'switch_submodule',
            switch_cipher_submodule: 'switch_submodule',
            open_cipher_tab: 'switch_submodule',
            switch_contact_tab: 'switch_contact_submodule',
            switch_contact_submodule: 'switch_contact_submodule',
            open_contact_tab: 'switch_contact_submodule',
            open_contact_submodule: 'switch_contact_submodule',
            contact_submodule: 'switch_contact_submodule',
            open_logic: 'open_logic_puzzle',
            open_logic_puzzle: 'open_logic_puzzle',
            select_logic_puzzle: 'open_logic_puzzle',
            switch_logic_puzzle: 'open_logic_puzzle',
            logic_puzzle: 'open_logic_puzzle',
            open_space: 'open_space_puzzle',
            open_space_puzzle: 'open_space_puzzle',
            select_space_puzzle: 'open_space_puzzle',
            switch_space_puzzle: 'open_space_puzzle',
            space_puzzle: 'open_space_puzzle',
            fill_input: 'set_value',
            fill: 'set_value',
            input_text: 'set_value',
            type_text: 'set_value',
            set_input: 'set_value',
            click_element: 'click',
            press_button: 'click',
            find: 'search'
        };
        return aliases[raw] || aliases[raw.toLowerCase()] || raw;
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
            'Skill/MCP实验室': 'mcpskilllab',
            'Skill / MCP 实验室': 'mcpskilllab',
            'MCP实验室': 'mcpskilllab',
            'Skill实验室': 'mcpskilllab',
            '技能实验室': 'mcpskilllab',
            '联系我们': 'yijianfankui',
            '反馈': 'yijianfankui',
            '经典区': 'mimaqu',
            '现代区': 'xiandaiqu',
            '逻辑区': 'luojimiti',
            '词汇区': 'cihuiqu',
            '预留区': 'yuliu',
            '预留': 'yuliu',
            '空间类': 'yuliu',
            '空间区': 'yuliu',
            '空间': 'yuliu',
            '空间谜题': 'yuliu',
            'mainInput': '#mainInput',
            'main_input': '#mainInput',
            'main-input': '#mainInput',
            'main input': '#mainInput',
            '主输入': '#mainInput',
            '主输入框': '#mainInput'
        };
        Object.assign(aliases, {
            '加密实验室': 'jiamishiyanshi',
            '密码': 'jiamishiyanshi',
            '电子实验室': 'electroniclab',
            '电路': 'electroniclab',
            '工作流': 'workflow',
            '知识图谱': 'zhishitupu',
            '大模型': 'damoxing',
            '模型': 'damoxing',
            'Skill/MCP实验室': 'mcpskilllab',
            'Skill / MCP 实验室': 'mcpskilllab',
            'MCP实验室': 'mcpskilllab',
            'Skill实验室': 'mcpskilllab',
            '技能实验室': 'mcpskilllab',
            '反馈': 'yijianfankui',
            '联系我们': 'yijianfankui',
            '经典区': 'mimaqu',
            '经典': 'mimaqu',
            '现代区': 'xiandaiqu',
            '现代': 'xiandaiqu',
            '逻辑谜题': 'luojimiti',
            '逻辑区': 'luojimiti',
            '词汇区': 'cihuiqu',
            '词汇': 'cihuiqu',
            '空间类': 'yuliu',
            '空间区': 'yuliu',
            '空间': 'yuliu',
            '空间谜题': 'yuliu',
            '预留': 'yuliu',
            space: 'yuliu',
            Space: 'yuliu',
            spacepuzzle: 'yuliu',
            'space puzzle': 'yuliu',
            '主输入框': '#mainInput',
            '主输入': '#mainInput',
            '输入框': '#mainInput',
            '输入': '#mainInput',
            'main_input': '#mainInput',
            'main-input': '#mainInput',
            'main input': '#mainInput',
            'search': '#cardSearch',
            '搜索框': '#cardSearch',
            '逻辑': 'luojimiti',
            'logic': 'luojimiti',
            'logic area': 'luojimiti',
            'sudoku': '数独',
            'Sudoku': '数独'
        });
        aliases.Agent = 'damoxing';
        aliases.agent = 'damoxing';
        aliases['API中转站'] = 'apizhongzhuanzhan';
        aliases['api中转站'] = 'apizhongzhuanzhan';
        aliases['中转站'] = 'apizhongzhuanzhan';
        aliases['API Router'] = 'apizhongzhuanzhan';
        aliases['api router'] = 'apizhongzhuanzhan';
        aliases.mcpskilllab = 'mcpskilllab';
        aliases['skill/mcp'] = 'mcpskilllab';
        aliases['skill mcp'] = 'mcpskilllab';
        aliases['mcp lab'] = 'mcpskilllab';
        aliases['skill lab'] = 'mcpskilllab';
        return aliases[target] || target;
    }

    function navigateSection(target, reason) {
        const item = document.querySelector(`.menu-item[data-target="${cssEscape(target)}"]`);
        if (!item) throw new Error(`section not found: ${target}`);
        item.click();
        return ok(`已打开 ${item.textContent.trim() || target}`, reason);
    }

    function switchSubmodule(target, reason) {
        ensureCipherLabVisible();
        const btn = document.querySelector(`.submodule-btn[data-target="${cssEscape(target)}"]`);
        if (!btn) throw new Error(`submodule not found: ${target}`);
        btn.click();
        return ok(`已切换到 ${btn.textContent.trim() || target}`, reason);
    }

    function switchContactSubmodule(target, reason) {
        const contactTarget = normalizeContactSubmoduleTarget(target);
        navigateSection('yijianfankui');
        const btn = document.querySelector(`.contact-submodule-btn[data-target="${cssEscape(contactTarget)}"]`);
        if (!btn) throw new Error(`contact submodule not found: ${target}`);
        btn.click();
        syncContactSubmoduleState(contactTarget, btn);
        return ok(`已打开 联系我们 / ${btn.textContent.trim() || contactTarget}`, reason);
    }

    function syncContactSubmoduleState(target, btn) {
        const submodules = Array.from(document.querySelectorAll('#yijianfankui-content .lianxiwomen-submodule'));
        const active = document.getElementById(target);
        if (!active || !submodules.includes(active)) return;

        document.querySelectorAll('#yijianfankui-content .contact-submodule-btn').forEach(item => {
            item.classList.toggle('active', item === btn);
        });
        submodules.forEach(item => item.classList.toggle('active', item === active));

        const wrapper = active.closest('.cipher-swiper-wrapper');
        const container = active.closest('.cipher-swiper-container');
        if (wrapper && container) {
            const index = submodules.indexOf(active);
            wrapper.style.transform = `translateX(${-index * container.offsetWidth}px)`;
            container.style.height = `${active.scrollHeight}px`;
        }
    }

    function openLogicPuzzle(target, reason) {
        const puzzleTarget = normalizeLogicPuzzleTarget(target);
        ensureCipherLabVisible();

        const logicSection = document.querySelector('.submodule-btn[data-target="luojimiti"]');
        if (logicSection && !document.getElementById('luojimiti')?.classList.contains('active')) {
            logicSection.click();
        }

        const btn = findLogicPuzzleButton(puzzleTarget);
        if (!btn) throw new Error(`logic puzzle not found: ${target}`);
        btn.click();
        return ok(`已打开逻辑谜题 ${btn.textContent.trim() || puzzleTarget}`, reason);
    }

    function openSpacePuzzle(target, reason) {
        const puzzleTarget = normalizeSpacePuzzleTarget(target);
        ensureCipherLabVisible();

        const spaceSection = document.querySelector('.submodule-btn[data-target="yuliu"]');
        if (spaceSection && !document.getElementById('yuliu')?.classList.contains('active')) {
            spaceSection.click();
        }

        ensureSpacePuzzleInitialized();

        if (typeof window.openSpacePuzzle === 'function' && isKnownSpacePuzzleTarget(puzzleTarget)) {
            window.openSpacePuzzle(puzzleTarget);
            return ok(`已打开空间类 ${getSpacePuzzleLabel(puzzleTarget)}`, reason);
        }

        const btn = findSpacePuzzleButton(puzzleTarget);
        if (!btn) throw new Error(`space puzzle not found: ${target}`);
        btn.click();
        return ok(`已打开空间类 ${btn.textContent.trim() || puzzleTarget}`, reason);
    }

    function ensureCipherLabVisible() {
        if (getCurrentSection() === 'jiamishiyanshi') return;
        const item = document.querySelector('.menu-item[data-target="jiamishiyanshi"]');
        if (item) item.click();
    }

    function ensureSpacePuzzleInitialized() {
        const container = document.getElementById('spacepuzzle');
        if (container && !document.getElementById('space-list-container') && typeof window.initSpacePuzzle === 'function') {
            window.initSpacePuzzle();
        }
    }

    function findLogicPuzzleButton(target) {
        const raw = String(target || '').trim();
        const normalized = normalizeText(raw);
        if (!normalized) return null;
        const buttons = Array.from(document.querySelectorAll('.logic-btn')).filter(isVisible);
        return buttons.find(btn => normalizeText(btn.dataset?.target) === normalized) ||
            buttons.find(btn => normalizeText(btn.dataset?.workspace) === normalized) ||
            buttons.find(btn => normalizeText(btn.textContent) === normalized) ||
            buttons.find(btn => normalizeText(btn.dataset?.target).includes(normalized)) ||
            buttons.find(btn => normalizeText(btn.textContent).includes(normalized)) ||
            null;
    }

    function normalizeLogicPuzzleTarget(target) {
        const raw = String(target || '').trim();
        const aliases = {
            '数独': 'sudoku',
            sudoku: 'sudoku',
            '数独题': 'sudoku',
            nonogram: 'nonogram',
            '数织': 'nonogram',
            '绘图方块': 'nonogram',
            kakuro: 'kakuro',
            '数和': 'kakuro',
            hashi: 'hashi',
            '桥梁': 'hashi',
            hitori: 'hitori',
            nurikabe: 'nurikabe',
            slitherlink: 'slitherlink',
            akari: 'akari',
            '美术馆': 'akari'
        };
        return aliases[raw] || aliases[raw.toLowerCase()] || raw;
    }

    function normalizeContactSubmoduleTarget(target) {
        const raw = String(target || '').trim();
        const normalized = normalizeText(raw);
        const found = getContactSubmoduleAliases().find(item =>
            item.names.some(name => normalizeText(name) === normalized)
        );
        return found ? found.target : raw;
    }

    function findContactSubmoduleTargetInText(text) {
        const normalized = normalizeText(text);
        const found = getContactSubmoduleAliases().find(item =>
            item.names.some(name => normalized.includes(normalizeText(name)))
        );
        return found ? found.target : '';
    }

    function getContactSubmoduleAliases() {
        return [
            {
                target: 'guanyuzuozhe',
                names: ['guanyuzuozhe', '关于作者', '作者', 'about author', 'about']
            },
            {
                target: 'zuozhecaifang',
                names: ['zuozhecaifang', '作者采访', '采访', 'interview']
            },
            {
                target: 'yijianfankui',
                names: ['yijianfankui', '意见反馈', '一键反馈', '反馈', 'feedback']
            },
            {
                target: 'kaifarizhi',
                names: ['kaifarizhi', '开发日志', '日志', '更新日志', 'changelog', 'devlog']
            }
        ];
    }

    function findSpacePuzzleButton(target) {
        const raw = String(target || '').trim();
        const normalized = normalizeText(raw);
        if (!normalized) return null;

        const root = document.getElementById('spacepuzzle') || document;
        const buttons = Array.from(root.querySelectorAll('.logic-btn, button')).filter(isVisible);
        return buttons.find(btn => normalizeSpacePuzzleTarget(readSpacePuzzleButtonTarget(btn)) === raw) ||
            buttons.find(btn => normalizeSpacePuzzleTarget(btn.textContent) === raw) ||
            buttons.find(btn => normalizeText(readSpacePuzzleButtonTarget(btn)) === normalized) ||
            buttons.find(btn => normalizeText(btn.textContent) === normalized) ||
            buttons.find(btn => normalizeText(btn.textContent).includes(normalized)) ||
            null;
    }

    function readSpacePuzzleButtonTarget(btn) {
        const dataTarget = btn.dataset?.target || btn.dataset?.workspace;
        if (dataTarget) return dataTarget;
        const onclick = btn.getAttribute?.('onclick') || '';
        const match = onclick.match(/openSpacePuzzle\(['"]([^'"]+)['"]\)/);
        return match ? match[1] : '';
    }

    function normalizeSpacePuzzleTarget(target) {
        const raw = String(target || '').trim();
        const normalized = normalizeSpacePuzzleAliasText(raw);
        const found = getSpacePuzzleAliases().find(item =>
            item.names.some(name => normalizeSpacePuzzleAliasText(name) === normalized)
        );
        return found ? found.target : raw;
    }

    function findSpacePuzzleTargetInText(text) {
        const normalized = normalizeSpacePuzzleAliasText(text);
        const found = getSpacePuzzleAliases().find(item =>
            item.names.some(name => normalized.includes(normalizeSpacePuzzleAliasText(name)))
        );
        return found ? found.target : '';
    }

    function normalizeSpacePuzzleAliasText(value) {
        return normalizeText(value).replace(/['’]/g, '');
    }

    function getSpacePuzzleAliases() {
        return [
            {
                target: 'standard-cube',
                names: ['standard-cube', 'standard cube', 'standardcube', 'rubikscube', 'rubiks cube', 'rubik cube', '标准三维魔方', '标准魔方', '三阶魔方']
            },
            {
                target: 'skewbmofang',
                names: ['skewbmofang', 'skewb', 'skewb魔方', '斜转魔方', '斜轉魔方']
            },
            {
                target: 'jinzitamofang',
                names: ['jinzitamofang', 'pyraminx', 'pyramid cube', '金字塔魔方']
            },
            {
                target: 'rubiksclock',
                names: ['rubiksclock', "rubik's clock", 'rubiks clock', 'rubik clock', '魔表']
            },
            {
                target: 'squreonemofang',
                names: ['squreonemofang', 'square-1', 'square1', 'square one', 'square-1魔方']
            },
            {
                target: 'number-huarong',
                names: ['number-huarong', 'number huarong', '数字华容道', '华容道']
            },
            {
                target: 'qiqiaoban',
                names: ['qiqiaoban', '七巧板', 'tangram']
            },
            {
                target: 'pentomino',
                names: ['pentomino', '五连方', '五连块']
            }
        ];
    }

    function isKnownSpacePuzzleTarget(target) {
        if (target === 'standard-cube') return true;
        return Array.isArray(window.spacePuzzleModules) &&
            window.spacePuzzleModules.some(module => module && module.id === target);
    }

    function getSpacePuzzleLabel(target) {
        const labels = {
            'standard-cube': '标准三维魔方',
            skewbmofang: 'Skewb 魔方',
            jinzitamofang: '金字塔魔方',
            rubiksclock: "Rubik's Clock",
            squreonemofang: 'Square-1 魔方',
            'number-huarong': '数字华容道',
            qiqiaoban: '七巧板',
            pentomino: 'Pentomino 五连方'
        };
        return labels[target] || target;
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

    function focusElement(target, reason) {
        const el = findElement(target || getActiveEditableSelector());
        if (!el) throw new Error(`element not found: ${target}`);
        el.focus?.({ preventScroll: false });
        el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        return ok(`Focused ${describeElement(el)}`, reason);
    }

    function selectOption(target, value, reason) {
        const el = findElement(target);
        if (!el) throw new Error(`element not found: ${target}`);
        if (el.tagName !== 'SELECT') throw new Error(`element is not a select: ${target}`);

        const wanted = normalizeText(value);
        const option = Array.from(el.options).find(opt => {
            const text = normalizeText(opt.textContent);
            return normalizeText(opt.value) === wanted || text === wanted || text.includes(wanted);
        });
        if (!option) throw new Error(`option not found: ${value}`);

        el.value = option.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return ok(`Selected ${option.textContent.trim() || option.value} in ${describeElement(el)}`, reason);
    }

    function pressKey(target, key, reason) {
        const el = findElement(target) || document.activeElement || document.body;
        const normalizedKey = String(key || '').trim();
        if (!normalizedKey) throw new Error('missing key');

        if (normalizedKey.toLowerCase() === 'tab') {
            focusNextElement(el, false);
            return ok('Pressed Tab', reason);
        }
        if (normalizedKey.toLowerCase() === 'shift+tab') {
            focusNextElement(el, true);
            return ok('Pressed Shift+Tab', reason);
        }

        el.focus?.();
        const eventInit = { key: normalizedKey, code: normalizedKey, bubbles: true, cancelable: true };
        el.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        el.dispatchEvent(new KeyboardEvent('keyup', eventInit));

        if (normalizedKey.toLowerCase() === 'enter' && typeof el.click === 'function' && isClickable(el)) {
            el.click();
        }
        return ok(`Pressed ${normalizedKey} on ${describeElement(el)}`, reason);
    }

    function snapshotPage(reason) {
        const activeSection = getActiveSectionElement() || document.querySelector('.container1') || document.body;
        const candidates = getInteractiveCandidates(activeSection)
            .slice(0, 28)
            .map((el, index) => `${index + 1}. ${describeElement(el)} ${summarizeElement(el)}`.trim());
        const message = [
            `Page snapshot: section=${getCurrentSection()}, url=${location.href}`,
            candidates.length ? 'Interactive targets:' : 'No visible interactive targets found.',
            ...candidates
        ].join('\n');
        return ok(message, reason);
    }

    function executeUiBatch(steps, reason) {
        if (!Array.isArray(steps) || steps.length === 0) throw new Error('batch requires non-empty steps');
        const results = [];
        for (const step of steps.slice(0, 12)) {
            results.push(executeUiAction(step).message);
        }
        return ok(`Batch completed:\n${results.join('\n')}`, reason);
    }

    function findElement(target) {
        const raw = String(target || '').trim();
        if (!raw) return null;
        if (raw === 'active' || raw === ':focus') return document.activeElement;

        if (raw.startsWith('#') || raw.startsWith('.') || raw.startsWith('[') || /^[a-z][\w-]*(?:[.#\[]|$)/i.test(raw)) {
            try {
                const direct = querySelectorPreferActive(raw);
                if (direct) return direct;
            } catch {
                // Continue with semantic lookup.
            }
        }

        const byId = querySelectorPreferActive(`#${cssEscape(raw)}`) || document.getElementById(raw);
        if (byId) return byId;

        const normalized = normalizeText(raw);
        const candidates = getInteractiveCandidates(document);
        const exact = candidates.find(el => candidateTexts(el).some(text => normalizeText(text) === normalized));
        if (exact) return exact;

        return candidates.find(el => candidateTexts(el).some(text => normalizeText(text).includes(normalized))) || null;
    }

    function querySelectorPreferActive(selector) {
        const matches = Array.from(document.querySelectorAll(selector));
        if (!matches.length) return null;
        return matches.find(isInActiveUiContext) ||
            matches.find(isVisible) ||
            matches[0];
    }

    function isInActiveUiContext(el) {
        if (!isVisible(el)) return false;
        const submodule = el.closest?.('.submodule, .lianxiwomen-submodule');
        if (submodule && !submodule.classList.contains('active')) return false;
        const section = el.closest?.('.content-section');
        if (section) {
            const style = getComputedStyle(section);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
        }
        return true;
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

    function summarizeElement(el) {
        const bits = [];
        const dataTarget = el.getAttribute?.('data-target');
        const aria = el.getAttribute?.('aria-label');
        const placeholder = el.getAttribute?.('placeholder');
        const text = visibleText(el);
        if (dataTarget) bits.push(`target=${dataTarget}`);
        if (aria) bits.push(`aria=${aria}`);
        if (placeholder) bits.push(`placeholder=${placeholder}`);
        if ('value' in el && el.value) bits.push(`value=${String(el.value).slice(0, 32)}`);
        if (text) bits.push(`text=${text.slice(0, 48)}`);
        return bits.length ? `(${bits.join(', ')})` : '';
    }

    function visibleText(el) {
        return String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function candidateTexts(el) {
        return [
            el.id,
            el.name,
            el.getAttribute?.('data-target'),
            el.getAttribute?.('aria-label'),
            el.getAttribute?.('title'),
            el.getAttribute?.('placeholder'),
            el.value,
            visibleText(el)
        ].filter(Boolean);
    }

    function getInteractiveCandidates(root) {
        const selector = [
            'button',
            'a[href]',
            'input',
            'textarea',
            'select',
            '[role="button"]',
            '[role="tab"]',
            '[contenteditable="true"]',
            '.card',
            '.menu-item',
            '.submodule-btn',
            '.quick-nav-input'
        ].join(',');
        return Array.from((root || document).querySelectorAll(selector)).filter(isVisible);
    }

    function getActiveEditableSelector() {
        const active = document.activeElement;
        if (active && (isEditable(active) || active.isContentEditable)) return 'active';
        return '#mainInput';
    }

    function getActiveSectionElement() {
        return Array.from(document.querySelectorAll('.content-section')).find(section => {
            const style = getComputedStyle(section);
            return style.display !== 'none' && style.visibility !== 'hidden';
        }) || null;
    }

    function getCurrentSection() {
        const active = getActiveSectionElement();
        if (active?.id?.endsWith('-content')) return active.id.replace(/-content$/, '');
        return location.hash.replace('#', '') || 'unknown';
    }

    function isEditable(el) {
        return el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    }

    function isClickable(el) {
        return el && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute?.('role') === 'button');
    }

    function isVisible(el) {
        if (!el || !el.getBoundingClientRect) return false;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }

    function normalizeText(value) {
        return String(value || '').toLowerCase().replace(/\s+/g, '').trim();
    }

    function focusNextElement(current, reverse) {
        const focusables = getInteractiveCandidates(document).filter(el => {
            if (el.disabled || el.getAttribute?.('aria-hidden') === 'true') return false;
            return typeof el.focus === 'function';
        });
        if (!focusables.length) return;
        const index = Math.max(0, focusables.indexOf(current));
        const nextIndex = reverse
            ? (index - 1 + focusables.length) % focusables.length
            : (index + 1) % focusables.length;
        focusables[nextIndex].focus();
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
        button.innerHTML = '<span class="agent-orb-label" aria-hidden="true">Agent</span>';
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

    function shouldAllowAgentTools(text) {
        const raw = String(text || '').trim();
        const normalized = normalizeText(raw);
        if (!normalized) return false;

        if (isLikelyAnswerOnlyRequest(raw, normalized)) return false;
        return hasExplicitOperationIntent(raw, normalized);
    }

    function isLikelyAnswerOnlyRequest(raw, normalized) {
        const answerTerms = [
            '解释', '说明', '科普', '是什么', '什么意思', '含义', '定义', '用途', '原理', '为什么', '为何',
            '怎么', '如何', '介绍', '分析', '讲讲', '告诉我', '区别', '谁', '哪', '何时', '多少',
            'explain', 'what', 'why', 'how', 'who', 'where', 'when', 'which', 'meaning', 'definition'
        ];
        const hasAnswerTerm = answerTerms.some(term => normalized.includes(normalizeText(term))) ||
            /[?？]$/.test(raw);
        return hasAnswerTerm && !hasExplicitOperationIntent(raw, normalized);
    }

    function hasExplicitOperationIntent(raw, normalized) {
        const operationStarts = [
            '打开', '开启', '进入', '切换', '切到', '跳转', '转到', '导航到', '去', '点击', '点开', '选择',
            '输入', '填入', '填充', '设置', '搜索', '查找', '清空', '高亮', '滚动', '滚到', '聚焦',
            '刷新', '关闭', '后退', '前进', '打开窗口', '新窗口',
            'open', 'show', 'goto', 'switch', 'navigate', 'click', 'select', 'type', 'set', 'search',
            'find', 'clear', 'highlight', 'scroll', 'focus', 'reload', 'close', 'back', 'forward'
        ].map(normalizeText);
        if (operationStarts.some(term => normalized.startsWith(term))) return true;

        const helperPrefixes = ['帮我', '请帮我', '帮忙', '麻烦', '替我', '给我', '现在', '直接', 'please'];
        const hasHelperPrefix = helperPrefixes.some(prefix => normalized.startsWith(normalizeText(prefix)));
        if (!hasHelperPrefix) return false;

        const operationTerms = [
            '打开', '开启', '进入', '切换', '切到', '跳转', '转到', '导航', '去到', '点击', '点开', '选择',
            '输入', '填入', '填成', '填充', '设置', '搜索', '查找', '清空', '高亮', '滚动', '滚到', '聚焦',
            '刷新', '关闭', '后退', '前进', 'open', 'show', 'goto', 'switch', 'navigate', 'click', 'select',
            'type', 'set', 'search', 'find', 'clear', 'highlight', 'scroll', 'focus', 'reload', 'close'
        ];
        return operationTerms.some(term => normalized.includes(normalizeText(term)));
    }

    async function tryRunFastCommand(text) {
        const raw = String(text || '').trim();
        const normalized = normalizeText(raw);
        if (!normalized) return null;

        const browserResult = matchFastBrowserCommand(raw, normalized);
        if (browserResult) {
            const result = await executeBrowserAction(browserResult);
            return { tool: result.message };
        }

        const uiResult = matchFastUiCommand(raw, normalized);
        if (uiResult) {
            const result = executeUiAction(uiResult);
            return { tool: result.message };
        }

        return null;
    }

    function matchFastBrowserCommand(raw, normalized) {
        if (/^(windows|tabs|listwindows|listtabs|窗口列表|列出窗口|列出标签|标签列表)$/.test(normalized)) {
            return { action: 'list_windows' };
        }
        if (/^(当前窗口|聚焦当前|focuscurrent|focuswindow)$/.test(normalized)) {
            return { action: 'focus_current' };
        }
        if (/^(刷新窗口|刷新页面|reload|reloadwindow)$/.test(normalized)) {
            return { action: 'reload_window' };
        }
        if (/^(后退|返回|back)$/.test(normalized)) return { action: 'back' };
        if (/^(前进|forward)$/.test(normalized)) return { action: 'forward' };

        let match = raw.match(/^(?:打开窗口|新窗口|open window|new window)\s+(.+)$/i);
        if (match) return { action: 'new_window', url: match[1].trim() };

        match = raw.match(/^(?:切换窗口|切到窗口|switch window|focus window)\s+(.+)$/i);
        if (match) return { action: 'switch_window', target: match[1].trim() };

        match = raw.match(/^(?:关闭窗口|close window)\s+(.+)$/i);
        if (match) return { action: 'close_window', target: match[1].trim() };

        match = raw.match(/^(?:标记窗口|命名窗口|label window)\s+(.+)$/i);
        if (match) return { action: 'set_window_label', label: match[1].trim() };

        return null;
    }

    function matchFastUiCommand(raw, normalized) {
        if (['apizhongzhuanzhan', 'apirouter', 'api中转站', 'api中轉站', '中转站'].includes(normalized)) {
            return { action: 'navigate_section', target: 'apizhongzhuanzhan' };
        }

        const sections = {
            jiamishiyanshi: ['jiamishiyanshi', 'cipher', 'ciphers', '加密实验室', '密码', '密码区'],
            electroniclab: ['electroniclab', 'electronics', 'circuit', '电子实验室', '电路'],
            workflow: ['workflow', '工作流'],
            zhishitupu: ['zhishitupu', 'graph', '知识图谱'],
            damoxing: ['damoxing', 'agent', '大模型', '模型'],
            mcpskilllab: ['mcpskilllab', 'skill/mcp实验室', 'skill / mcp 实验室', 'mcp实验室', 'skill实验室', '技能实验室', 'skillmcp', 'mcp lab', 'skill lab'],
            yijianfankui: ['yijianfankui', 'feedback', '反馈', '联系我们']
        };
        for (const [target, names] of Object.entries(sections)) {
            if (names.some(name => isFastSectionCommand(normalized, name))) {
                return { action: 'navigate_section', target };
            }
        }

        const contactSubmoduleTarget = findContactSubmoduleTargetInText(raw);
        if (contactSubmoduleTarget && hasFastOpenIntent(normalized)) {
            return { action: 'switch_contact_submodule', target: contactSubmoduleTarget };
        }

        const spacePuzzleTarget = findSpacePuzzleTargetInText(raw);
        if (spacePuzzleTarget && hasFastOpenIntent(normalized)) {
            return { action: 'open_space_puzzle', target: spacePuzzleTarget };
        }

        const submodules = {
            mimaqu: ['mimaqu', '经典区', '经典'],
            xiandaiqu: ['xiandaiqu', '现代区', '现代'],
            luojimiti: ['luojimiti', '逻辑区', '逻辑谜题'],
            cihuiqu: ['cihuiqu', '词汇区', '词汇'],
            yuliu: ['yuliu', '空间类', '空间区', '空间', '空间谜题', 'space', 'spacepuzzle', 'space puzzle']
        };
        for (const [target, names] of Object.entries(submodules)) {
            if (names.some(name => normalized === normalizeText(name) || normalized === normalizeText(`切换${name}`) || normalized === normalizeText(`打开${name}`))) {
                return { action: 'switch_submodule', target };
            }
        }

        let match = raw.match(/^(?:搜索|search)\s+(.+)$/i);
        if (match) return { action: 'search', value: match[1].trim() };

        if (/^(清空搜索|clearsearch|clear search)$/.test(normalized)) return { action: 'clear_search' };

        match = raw.match(/^(?:输入|填入|set|type)\s+(.+)$/i);
        if (match) return { action: 'set_value', target: '#mainInput', value: match[1] };

        match = raw.match(/^(?:点击|click)\s+(.+)$/i);
        if (match) return { action: 'click', target: match[1].trim() };

        match = raw.match(/^(?:高亮|highlight)\s+(.+)$/i);
        if (match) return { action: 'highlight', target: match[1].trim() };

        if (/^(页面快照|snapshot|page snapshot)$/.test(normalized)) return { action: 'snapshot' };

        return null;
    }

    function hasFastOpenIntent(normalized) {
        return ['打开', '开启', '进入', '切换', '跳转', '转到', '去', 'open', 'show', 'goto', 'switch']
            .some(term => normalized.includes(normalizeText(term)));
    }

    function isFastSectionCommand(normalized, name) {
        const section = normalizeText(name);
        return normalized === section ||
            normalized === normalizeText(`打开${name}`) ||
            normalized === normalizeText(`开启${name}`) ||
            normalized === normalizeText(`进入${name}`) ||
            normalized === normalizeText(`切换到${name}`) ||
            normalized === normalizeText(`切换${name}`) ||
            normalized === normalizeText(`转到${name}`) ||
            normalized === normalizeText(`去${name}`) ||
            normalized === normalizeText(`goto ${name}`) ||
            normalized === normalizeText(`open ${name}`) ||
            normalized === normalizeText(`show ${name}`) ||
            normalized === normalizeText(`switch ${name}`);
    }

    async function executeBrowserAction(args) {
        const action = args.action;
        switch (action) {
            case 'list_windows':
                return ok(formatWindowList(windowAgent.listWindows()), args.reason);
            case 'new_window':
                return windowAgent.openWindow(args.url || args.target || '', args.reason);
            case 'switch_window':
                return windowAgent.focusWindow(args.target || '', args.reason);
            case 'focus_current':
                window.focus();
                return ok(`Focused current project window ${windowAgent.id}`, args.reason);
            case 'close_window':
                return windowAgent.closeWindow(args.target || '', args.reason);
            case 'reload_window':
                return windowAgent.reloadWindow(args.target || '', args.reason);
            case 'back':
                return windowAgent.historyMove(args.target || '', -1, args.reason);
            case 'forward':
                return windowAgent.historyMove(args.target || '', 1, args.reason);
            case 'dispatch_ui_action':
                return windowAgent.dispatchUiAction(args.target || '', args.ui_action || {}, args.reason);
            case 'broadcast_ui_action':
                return windowAgent.broadcastUiAction(args.ui_action || {}, args.reason);
            case 'set_window_label':
                return windowAgent.setLabel(args.label || args.target || '', args.reason);
            default:
                throw new Error(`unknown browser action "${action}"`);
        }
    }

    function createBrowserWorkspaceAgent() {
        const channelName = 'AGENTMASTER_WORKSPACE_V1';
        const storageKey = 'AGENTMASTER_WINDOWS_V1';
        const selfId = getOrCreateWindowId();
        const openedRefs = new Map();
        const pending = new Map();
        const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;

        const api = {
            id: selfId,
            listWindows,
            openWindow,
            focusWindow,
            closeWindow,
            reloadWindow,
            historyMove,
            dispatchUiAction,
            broadcastUiAction,
            setLabel
        };

        channel?.addEventListener('message', event => handleChannelMessage(event.data));
        window.addEventListener('storage', event => {
            if (event.key === storageKey) registerSelf();
        });
        window.addEventListener('focus', registerSelf);
        window.addEventListener('hashchange', registerSelf);
        window.addEventListener('beforeunload', () => {
            const registry = readRegistry();
            delete registry[selfId];
            writeRegistry(registry);
            channel?.postMessage({ type: 'agent-window-left', id: selfId });
        });

        registerSelf();
        channel?.postMessage({ type: 'agent-window-hello', id: selfId, state: getSelfState() });
        setInterval(registerSelf, 2500);

        return api;

        function getOrCreateWindowId() {
            try {
                if (!window.name || !window.name.startsWith('agentmaster:')) {
                    window.name = `agentmaster:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
                }
                return window.name.replace(/^agentmaster:/, '');
            } catch {
                return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            }
        }

        function getSelfState() {
            const savedLabel = sessionStorage.getItem('AGENTMASTER_WINDOW_LABEL') || '';
            return {
                id: selfId,
                label: savedLabel,
                title: document.title || 'PzM Toolkit',
                url: location.href,
                hash: location.hash,
                section: getCurrentSection(),
                focused: document.hasFocus(),
                lastSeen: Date.now()
            };
        }

        function registerSelf() {
            const registry = readRegistry();
            registry[selfId] = getSelfState();
            writeRegistry(cleanRegistry(registry));
            channel?.postMessage({ type: 'agent-window-state', id: selfId, state: registry[selfId] });
        }

        function readRegistry() {
            try {
                return JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
            } catch {
                return {};
            }
        }

        function writeRegistry(registry) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(registry));
            } catch {
                // Storage can be unavailable in strict privacy modes.
            }
        }

        function cleanRegistry(registry) {
            const now = Date.now();
            for (const [id, item] of Object.entries(registry)) {
                if (!item || !item.lastSeen || now - item.lastSeen > 15000) delete registry[id];
            }
            return registry;
        }

        function listWindows() {
            registerSelf();
            const registry = cleanRegistry(readRegistry());
            writeRegistry(registry);
            return Object.values(registry).sort((a, b) => b.lastSeen - a.lastSeen);
        }

        function openWindow(url, reason) {
            const resolvedUrl = resolveWorkspaceUrl(url);
            const name = `agentmaster:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            const ref = window.open(resolvedUrl, name, 'popup=no');
            if (!ref) {
                return ok(`Popup blocked while opening ${resolvedUrl}. Allow popups for this site and retry.`, reason);
            }
            openedRefs.set(name.replace(/^agentmaster:/, ''), ref);
            return ok(`Opened project window ${resolvedUrl}`, reason);
        }

        function focusWindow(target, reason) {
            const win = resolveWindow(target);
            if (!win) return ok(`No registered project window matched "${target}".\n${formatWindowList(listWindows())}`, reason);
            if (win.id === selfId) {
                window.focus();
                return ok(`Focused current project window ${selfId}`, reason);
            }
            const ref = openedRefs.get(win.id);
            if (ref && !ref.closed) {
                ref.focus();
                return ok(`Focused opened project window ${describeWindow(win)}`, reason);
            }
            channel?.postMessage({ type: 'agent-window-command', target: win.id, command: 'focus' });
            return ok(`Requested focus for project window ${describeWindow(win)}. Browser may require a user gesture.`, reason);
        }

        function closeWindow(target, reason) {
            const win = resolveWindow(target);
            if (!win) return ok(`No registered project window matched "${target}".`, reason);
            if (win.id === selfId) return ok('Refusing to close the current assistant window from itself.', reason);
            const ref = openedRefs.get(win.id);
            if (ref && !ref.closed) {
                ref.close();
                return ok(`Closed opened project window ${describeWindow(win)}`, reason);
            }
            channel?.postMessage({ type: 'agent-window-command', target: win.id, command: 'close' });
            return ok(`Requested close for project window ${describeWindow(win)}. Browser may block script-close for tabs not opened by this page.`, reason);
        }

        function reloadWindow(target, reason) {
            const win = resolveWindow(target) || (target ? null : getSelfState());
            if (!win) return ok(`No registered project window matched "${target}".`, reason);
            if (win.id === selfId) {
                location.reload();
                return ok('Reloading current project window.', reason);
            }
            channel?.postMessage({ type: 'agent-window-command', target: win.id, command: 'reload' });
            return ok(`Requested reload for project window ${describeWindow(win)}`, reason);
        }

        function historyMove(target, direction, reason) {
            const win = resolveWindow(target) || (target ? null : getSelfState());
            if (!win) return ok(`No registered project window matched "${target}".`, reason);
            const command = direction < 0 ? 'back' : 'forward';
            if (win.id === selfId) {
                direction < 0 ? history.back() : history.forward();
                return ok(`Requested ${command} in current project window.`, reason);
            }
            channel?.postMessage({ type: 'agent-window-command', target: win.id, command });
            return ok(`Requested ${command} in project window ${describeWindow(win)}`, reason);
        }

        async function dispatchUiAction(target, uiAction, reason) {
            const win = resolveWindow(target);
            if (!win) throw new Error(`window not found: ${target}`);
            if (win.id === selfId) return executeUiAction(uiAction);
            const result = await requestRemote(win.id, { command: 'ui_action', args: uiAction });
            return ok(`Remote ${describeWindow(win)}: ${result.message || 'action completed'}`, reason);
        }

        async function broadcastUiAction(uiAction, reason) {
            const windows = listWindows();
            if (!windows.length) throw new Error('no registered project windows');
            const local = [];
            const remote = [];
            for (const win of windows) {
                if (win.id === selfId) local.push(executeUiAction(uiAction).message);
                else remote.push(requestRemote(win.id, { command: 'ui_action', args: uiAction }).catch(err => ({ message: err.message })));
            }
            const remoteResults = await Promise.all(remote);
            return ok(`Broadcast completed:\n${[...local, ...remoteResults.map(item => item.message)].join('\n')}`, reason);
        }

        function setLabel(label, reason) {
            const next = String(label || '').trim().slice(0, 48);
            sessionStorage.setItem('AGENTMASTER_WINDOW_LABEL', next);
            registerSelf();
            return ok(`Set current project window label to "${next || 'blank'}"`, reason);
        }

        function requestRemote(targetId, payload) {
            if (!channel) return Promise.reject(new Error('BroadcastChannel is not available in this browser'));
            const requestId = `${selfId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
            channel.postMessage({ type: 'agent-window-request', target: targetId, requestId, source: selfId, payload });
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pending.delete(requestId);
                    reject(new Error(`remote window ${targetId} timed out`));
                }, 5000);
                pending.set(requestId, { resolve, reject, timer });
            });
        }

        function handleChannelMessage(message) {
            if (!message || message.id === selfId || message.source === selfId) return;
            if (message.type === 'agent-window-hello' || message.type === 'agent-window-state') {
                const registry = readRegistry();
                registry[message.id] = message.state;
                writeRegistry(cleanRegistry(registry));
                if (message.type === 'agent-window-hello') registerSelf();
                return;
            }
            if (message.type === 'agent-window-left') {
                const registry = readRegistry();
                delete registry[message.id];
                writeRegistry(registry);
                return;
            }
            if (message.type === 'agent-window-command' && message.target === selfId) {
                runWindowCommand(message.command);
                return;
            }
            if (message.type === 'agent-window-request' && message.target === selfId) {
                handleRemoteRequest(message);
                return;
            }
            if (message.type === 'agent-window-response') {
                const item = pending.get(message.requestId);
                if (!item) return;
                clearTimeout(item.timer);
                pending.delete(message.requestId);
                message.ok ? item.resolve(message.result) : item.reject(new Error(message.error || 'remote action failed'));
            }
        }

        function runWindowCommand(command) {
            if (command === 'focus') window.focus();
            if (command === 'close') window.close();
            if (command === 'reload') location.reload();
            if (command === 'back') history.back();
            if (command === 'forward') history.forward();
        }

        async function handleRemoteRequest(message) {
            try {
                let result;
                if (message.payload?.command === 'ui_action') {
                    result = executeUiAction(message.payload.args || {});
                } else {
                    throw new Error(`unknown remote command: ${message.payload?.command}`);
                }
                channel?.postMessage({ type: 'agent-window-response', requestId: message.requestId, source: selfId, ok: true, result });
            } catch (err) {
                channel?.postMessage({ type: 'agent-window-response', requestId: message.requestId, source: selfId, ok: false, error: err.message });
            }
        }

        function resolveWindow(target) {
            const query = normalizeText(target);
            const windows = listWindows();
            if (!query) return windows.find(item => item.focused) || windows[0] || null;
            return windows.find(item => {
                return normalizeText(item.id) === query ||
                    normalizeText(item.id).includes(query) ||
                    normalizeText(item.label).includes(query) ||
                    normalizeText(item.title).includes(query) ||
                    normalizeText(item.url).includes(query) ||
                    normalizeText(item.section).includes(query);
            }) || null;
        }

        function resolveWorkspaceUrl(rawUrl) {
            const raw = String(rawUrl || '').trim();
            if (!raw) return location.href;
            const mapped = normalizeTarget(raw);
            if (document.querySelector(`.menu-item[data-target="${cssEscape(mapped)}"]`)) {
                const url = new URL(location.href);
                url.hash = mapped;
                return url.href;
            }
            if (raw.startsWith('#')) {
                const url = new URL(location.href);
                url.hash = raw.slice(1);
                return url.href;
            }
            try {
                const url = new URL(raw, location.href);
                if (url.origin !== location.origin) {
                    return url.href;
                }
                return url.href;
            } catch {
                const url = new URL(location.href);
                url.hash = mapped || raw;
                return url.href;
            }
        }
    }

    function formatWindowList(windows) {
        if (!windows.length) return 'No registered project windows.';
        return windows.map((win, index) => {
            const marker = win.id === windowAgent.id ? '*' : ' ';
            return `${marker}${index + 1}. ${describeWindow(win)} section=${win.section || 'unknown'} ${win.focused ? '[focused]' : ''}`;
        }).join('\n');
    }

    function describeWindow(win) {
        const label = win.label ? `${win.label} ` : '';
        const shortId = String(win.id || '').slice(0, 8);
        const title = String(win.title || 'PzM Toolkit').slice(0, 42);
        return `${label}[${shortId}] ${title}`;
    }

    function getAgentConfig() {
        const config = window.AGENTMASTER_CONFIG || {};
        const model = config.model || localStorage.getItem('AGENTMASTER_MODEL') || 'deepseek-v4-flash';
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
        if (normalized === 'deepseekv4' || normalized === 'deepseek-v4') return 'deepseek-v4-flash';
        return normalized || 'deepseek-v4-flash';
    }

    function resolveChatCompletionsUrl(baseUrl) {
        let normalized = String(baseUrl || 'https://api.deepseek.com/v1').trim();
        while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
        if (normalized.endsWith('/chat/completions')) return normalized;
        return `${normalized}/chat/completions`;
    }
});
