// agentmaster.js
document.addEventListener('DOMContentLoaded', () => {
    const agentConfig = getAgentConfig();
    const AGENT_API_URL = agentConfig.chatUrl;
    const AGENT_MODEL = agentConfig.model;
    const AGENT_USE_NATIVE_TOOLS = agentConfig.useNativeTools;

    function buildUsageHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'X-Agent-Surface': 'agentmaster'
        };
        try {
            const auth = window.CipherAuth;
            if (auth && typeof auth.getAuthHeaders === 'function') {
                Object.assign(headers, auth.getAuthHeaders());
            }
        } catch (error) {
            // Anonymous fallback.
        }
        return headers;
    }

    const chatWindow = document.getElementById('agent-chat-window');
    const collapseBtn = document.getElementById('agent-collapse-btn');
    const history = document.getElementById('agent-chat-history');
    const suggestions = document.querySelector('.agent-suggestions');
    const textarea = document.getElementById('agent-textarea');
    const submitBtn = document.getElementById('agent-submit-btn');

    if (!chatWindow || !collapseBtn || !history || !textarea || !submitBtn) return;

    const mobileAgentMedia = window.matchMedia('(max-width: 1100px)');
    const windowAgent = createBrowserWorkspaceAgent();
    let isChatActive = false;
    let isSending = false;
    let activeLoadingEl = null;
    let isDocked = false;
    let wasChatActiveBeforeDock = false;
    let didDragOrb = false;
    let dockTimer = null;
    const orb = createAgentOrb();
    const VOICE_LONG_PRESS_MS = 550;
    const voiceInput = {
        pressTimer: null,
        pointerId: null,
        suppressClick: false,
        pressBecameVoice: false,
        recognition: null,
        active: false,
        stopping: false,
        sendOnEnd: false,
        initialText: '',
        transcript: '',
        latestTranscript: '',
        error: ''
    };
    let messages = [
        {
            role: 'system',
            content: [
                'You are PzM assistant, a page-control agent embedded in this toolkit UI.',
                'You can answer questions normally, and when the user asks you to operate the page, call the ui_action tool.',
                'Only use tools when the latest user message explicitly asks for a UI operation such as open, switch, click, fill, search, scroll, focus, highlight, close, reload, navigate, read PCB code, or write PCB TSX code.',
                'Do not use page-operation tools for explanation, knowledge, definition, debugging, or general Q&A requests, even when they mention module names such as 知识图谱, Agent, 插件实验室, or 联系我们.',
                'Exception: for knowledge, definition and explanation questions, the runtime automatically retrieves the local Wikipedia/Wikidata corpus before answering; cite the retrieved records instead of answering from memory. When a selected knowledge-graph node explanation is active, retrieve that node knowledge base first.',
                'Use tools for visible UI operations such as opening sections, switching cipher tabs, filling inputs, clicking controls, scrolling, searching, highlighting, and writing or reading the PCB TSX editor.',
                'Use browser_action for same-origin project window/tab coordination: list windows, open a project window, switch/focus, close, reload, back/forward, or dispatch ui_action to another registered project window.',
                'Browser boundary: a web page cannot control arbitrary external browser tabs. Coordinate only this project and windows opened by this project; be explicit when the browser blocks focus or popup operations.',
                'If native tool calls are not available, emit exact operation blocks such as <ui_action>{"action":"navigate_section","target":"jiamishiyanshi"}</ui_action> or <browser_action>{"action":"list_windows"}</browser_action>.',
                'Do not wrap ui_action or browser_action blocks in Markdown code fences.',
                'Prefer one or more precise tool calls over long instructions when the user asks you to manipulate the page.',
                'For multi-step page operations, use ui_action action=batch with a steps array instead of narrating each step.',
                'Allowed ui_action actions are exactly: navigate_section, switch_submodule, switch_contact_submodule, open_logic_puzzle, open_space_puzzle, set_value, click, search, clear_search, highlight, scroll_to, focus, select_option, press_key, snapshot, batch, generate_world, edit_pcb_code, read_pcb_code, build_circuit, read_circuit, run_circuit, stop_circuit.',
                'Never invent action names. Use switch_submodule for cipher tabs, switch_contact_submodule for 联系我们 subpages, open_logic_puzzle for logic puzzles such as 数独/Sudoku, open_space_puzzle for space puzzles such as Skewb, set_value for filling inputs, and click for ordinary buttons.',
                'Use generate_world when the user asks to create or generate a 3D world / scene / environment with the world model (世界模型, Marble, 世界生成, 生成场景, 文生世界). Put the scene description in the "prompt" argument. Set "confirm" to true to only fill the description and wait for the user to press 生成世界; omit it and the generation starts immediately.',
                'Use build_circuit to build or replace the circuit in 电子实验室 → 电路模拟. Pass a circuit object like {"title":"5V LED 指示灯","components":[{"type":"dc_source","name":"V1","from":"VCC","to":"GND","value":"5V"},{"type":"resistor","name":"R1","from":"VCC","to":"N1","value":"1k"},{"type":"led","name":"D1","from":"N1","to":"GND"}]}. Supported types: dc_source, ac_source, square_source, triangle_source, sawtooth_source, resistor, capacitor, inductor, diode, led, switch, current_source, wire, ground. Values accept SI suffixes (1k, 4.7k, 100nF, 10mH, 5V, 2mA). Net names are arbitrary; for LED/diode use from=anode and to=cathode; for sources use from=positive and to=negative. The tool auto-places, routes, adds a ground when missing, starts the simulation, and returns live readings. Inspect the readings and fix reverse-biased or disconnected parts before answering.',
                'Use read_circuit to inspect the circuit currently shown in 电路模拟, run_circuit to start it, and stop_circuit to pause it. When the user asks to design a circuit, produce the complete component list in one build_circuit call instead of narrating steps.',
                'Use edit_pcb_code to write or replace the TSX code in 电子实验室 → 电路板布局 left panel. Put the complete main.tsx in "value" and keep run=true (default) so the engine re-renders. The action opens the section and expands the code sidebar automatically.',
                'Use read_pcb_code before reviewing or modifying the board currently shown in the left panel; edit_pcb_code replaces the whole file, so preserve the user changes you still need.',
                'When generating PCB TSX, follow DFX/DFM: declare the board size, place connectors at the board edge, add mounting holes/fiducials/test points, put decoupling caps next to power pins, label silkscreen, use explicit pcbX/pcbY for placement and schX/schY for a clean schematic, keep signal traces about 0.25mm and power traces 0.5mm or wider, and keep every component inside the board outline.',
                'Every PCB component with pcbX/pcbY or edge placement needs a footprint (0603 for resistors/LEDs, pinrow2 or pinrow4 for pin headers). Prefer the verified main.tsx pattern: pinheader + resistor + led + testpoint + hole + fiducial + silkscreentext + trace. Do not put voltagesource/analogsimulation on the PCB unless they have the required footprint; use the circuit simulator for sources and waveforms.',
                'Verified PCB TSX syntax: <pinheader name="J1" pinCount={2} footprint="pinrow2" pitch="2.54mm" pinLabels={["5V","GND"]} pcbX={-16} pcbY={0} pcbRotation={90} />; <resistor name="R1" resistance="1k" footprint="0603" pcbX={-8} pcbY={5} />; <led name="D1" footprint="0603" color="green" pcbX={0} pcbY={5} />; <testpoint name="TP1" footprintVariant="pad" padShape="circle" padDiameter="1.4mm" pcbX={-13} pcbY={3} />; <hole name="H1" diameter="3.2mm" pcbX={-17} pcbY={-9.5} />; <fiducial name="FID1" padDiameter="1mm" soldermaskPullback="1mm" pcbX={-11} pcbY={9} />; <silkscreentext text="5V IN" pcbX={-18} pcbY={-4} fontSize="0.9mm" />; <trace from=".J1 > .pin1" to=".R1 > .pin1" width="0.5mm" />. Use width (not thickness) on traces, give every size a unit string, and keep component bodies at least 1mm inside the board edge.',
                'edit_pcb_code automatically fixes common TSX syntax and small placement overflows, then waits for the PCB engine and reports any remaining render errors. If errors remain, state them clearly in your reply and give the concrete fix instead of claiming success.',
                'If native tool calls are not available for PCB coding, emit the full TSX inside a raw <pcb_code>...</pcb_code> block (no JSON escaping and no Markdown fences inside the block). Prefer the native edit_pcb_code tool when it is available.',
                'If native tool calls are not available for circuit building, emit the circuit spec JSON inside a raw <circuit_spec>...</circuit_spec> block (valid JSON only, no Markdown fences inside the block). Prefer the native build_circuit tool when it is available.',
                'World generation is a long-running job (about 5 minutes) and consumes paid API credits, so for vague or very short requests prefer filling the prompt first instead of starting generation immediately.',
                'Available section targets: jiamishiyanshi, electroniclab, jianmoshiyanshi, workflow, zhishitupu, damoxing, apizhongzhuanzhan, mcpskilllab, yijianfankui.',
                'Sidebar label 建模实验室 means section target jianmoshiyanshi. Sidebar label Agent means section target damoxing. 插件实验室 means section target mcpskilllab. Do not map 建模实验室 requests to damoxing.',
                'Available cipher submodule targets: mimaqu, xiandaiqu, luojimiti, cihuiqu, yuliu. Use yuliu for 空间类 / space puzzle.',
                'Available contact submodule targets: guanyuzuozhe, zuozhecaifang, yijianfankui, kaifarizhi.',
                'Available logic puzzle targets include sudoku, akari, nonogram, kakuro, hashi, hitori, nurikabe, slitherlink.',
                'Available space puzzle targets include standard-cube, skewbmofang, jinzitamofang, rubiksclock, squreonemofang, number-huarong, qiqiaoban, pentomino.'
            ].join('\n')
        }
    ];

    // 上下文窗口预算：超出后折叠最早的消息，保留最近若干轮，长会话既不丢上下文也不会撑爆上游。
    const HISTORY_CHAR_BUDGET = 48000;
    const HISTORY_MIN_RECENT = 6;

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
                            'batch',
                            'generate_world',
                            'edit_pcb_code',
                            'read_pcb_code',
                            'build_circuit',
                            'read_circuit',
                            'run_circuit',
                            'stop_circuit'
                        ],
                        description: 'The UI operation to execute.'
                    },
                    target: {
                        type: 'string',
                        description: 'A known target id/name or a CSS selector. Examples: jiamishiyanshi, mimaqu, sudoku, skewbmofang, #mainInput, .usage-guide-btn.'
                    },
                    value: {
                        type: 'string',
                        description: 'Text/value for set_value or search, the full TSX source for edit_pcb_code, or raw CircuitJS text when format=circuitjs.'
                    },
                    circuit: {
                        type: 'object',
                        description: 'Circuit spec for build_circuit. Shape: {"title":"...","components":[{"type":"dc_source","name":"V1","from":"VCC","to":"GND","value":"5V"},{"type":"resistor","name":"R1","from":"VCC","to":"N1","value":"1k"},{"type":"led","name":"D1","from":"N1","to":"GND"}]}. Types: dc_source, ac_source, square_source, triangle_source, sawtooth_source, resistor, capacitor, inductor, diode, led, switch, current_source, wire, ground. from/to are net names; LED/diode from=anode to=cathode; sources from=positive to=negative.',
                        properties: {
                            title: { type: 'string', description: 'Short circuit title, max 80 characters.' },
                            components: {
                                type: 'array',
                                description: 'Complete component list. Each item needs type plus from/to net names.',
                                items: { type: 'object' }
                            }
                        },
                        required: ['components']
                    },
                    format: {
                        type: 'string',
                        enum: ['spec', 'circuitjs'],
                        description: 'For build_circuit: spec (default structured circuit) or circuitjs (raw CircuitJS netlist in value).'
                    },
                    prompt: {
                        type: 'string',
                        description: 'Scene description for generate_world. Write a vivid, concrete environment description (materials, lighting, layout, atmosphere).'
                    },
                    displayName: {
                        type: 'string',
                        description: 'Optional title for the generated world, max 64 characters.'
                    },
                    worldModel: {
                        type: 'string',
                        description: 'Optional world model id for generate_world: marble-1.1, marble-1.1-plus, marble-1.0, marble-1.0-draft.'
                    },
                    confirm: {
                        type: 'boolean',
                        description: 'For generate_world: true fills the description only and waits for the user to confirm; false or omitted starts generation right away.'
                    },
                    append: {
                        type: 'boolean',
                        description: 'Append value instead of replacing it when action is set_value.'
                    },
                    run: {
                        type: 'boolean',
                        description: 'For edit_pcb_code: rerun the PCB engine after writing the TSX (default true).'
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

    let pendingKnowledgeGraphContext = null;

    let mathJaxPromise = null;
    function hasMathSyntax(value) {
        const text = String(value || '');
        return text.includes('$$') ||
            text.includes('\\[') ||
            text.includes('\\(') ||
            /\$(?![\s$])(?:[^$]*\S)?\$/.test(text);
    }
    function ensureMathJax() {
        if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax);
        if (window.__cipherToolMathJaxPromise) return window.__cipherToolMathJaxPromise;
        if (mathJaxPromise) return mathJaxPromise;
        window.MathJax = {
            tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
            svg: { fontCache: 'global' }
        };
        mathJaxPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            s.async = true;
            s.onload = () => resolve(window.MathJax);
            s.onerror = reject;
            document.head.appendChild(s);
        });
        window.__cipherToolMathJaxPromise = mathJaxPromise;
        return mathJaxPromise;
    }
    let mjBusy = false, mjLast = 0;
    function renderMath(el, force = false) {
        if (!hasMathSyntax(el?.textContent)) return;
        if (!mjBusy && (force || Date.now() - mjLast > 250)) {
            mjBusy = true; mjLast = Date.now();
            ensureMathJax()
                .then(() => window.MathJax?.typesetPromise?.([el]))
                .catch(() => { })
                .finally(() => { mjBusy = false; });
        }
    }

    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = s => esc(s).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');

    function splitMarkdownTableRow(line) {
        const raw = String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '');
        const cells = [];
        let cell = '';
        for (let i = 0; i < raw.length; i++) {
            const ch = raw[i];
            if (ch === '\\' && raw[i + 1] === '|') {
                cell += '|';
                i++;
                continue;
            }
            if (ch === '|') {
                cells.push(cell.trim());
                cell = '';
                continue;
            }
            cell += ch;
        }
        cells.push(cell.trim());
        return cells;
    }

    function isMarkdownTableDivider(line) {
        const cells = splitMarkdownTableRow(line);
        return cells.length >= 2 && cells.every(cell => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));
    }

    function isMarkdownTableAt(lines, index) {
        const header = String(lines[index] || '').trim();
        const divider = String(lines[index + 1] || '').trim();
        return header.includes('|') &&
            splitMarkdownTableRow(header).length >= 2 &&
            isMarkdownTableDivider(divider);
    }

    function tableAlignment(dividerCell) {
        const marker = String(dividerCell || '').replace(/\s+/g, '');
        if (marker.startsWith(':') && marker.endsWith(':')) return 'center';
        if (marker.endsWith(':')) return 'right';
        if (marker.startsWith(':')) return 'left';
        return '';
    }

    function tableCellAttrs(align) {
        return align ? ` style="text-align:${align}"` : '';
    }

    function consumeMarkdownTable(lines, startIndex) {
        const headers = splitMarkdownTableRow(lines[startIndex]);
        const alignments = splitMarkdownTableRow(lines[startIndex + 1]).map(tableAlignment);
        const rows = [];
        let index = startIndex + 2;

        while (index < lines.length) {
            const line = String(lines[index] || '').trim();
            if (!line || !line.includes('|') || line.startsWith('```')) break;
            const cells = splitMarkdownTableRow(line);
            if (cells.length < 2) break;
            rows.push(cells);
            index++;
        }

        const head = headers.map((cell, cellIndex) => {
            const align = tableCellAttrs(alignments[cellIndex] || '');
            return `<th${align}>${inline(cell)}</th>`;
        }).join('');
        const body = rows.map(row => {
            const cells = headers.map((_, cellIndex) => {
                const align = tableCellAttrs(alignments[cellIndex] || '');
                return `<td${align}>${inline(row[cellIndex] || '')}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        return {
            html: `<div class="agent-table-wrap"><table class="agent-markdown-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`,
            nextIndex: index
        };
    }

    function fmt(text) {
        if (!text) return '';
        const lines = String(text).split('\n');
        let html = '', inCode = false, inMath = false, buf = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
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

            if (isMarkdownTableAt(lines, i)) {
                const table = consumeMarkdownTable(lines, i);
                html += table.html;
                i = table.nextIndex - 1;
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
    setupSubmitVoiceButton();

    collapseBtn.addEventListener('click', closeChatWindow);
    textarea.addEventListener('focus', () => {
        if (!isChatActive && messages.length > 1) {
            chatWindow.classList.add('active');
            isChatActive = true;
        }
    });
    document.querySelectorAll('.agent-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => { textarea.value = btn.textContent; send(); });
    });
    if (mobileAgentMedia.matches) {
        dockAgent({ immediate: true, preserveChat: false });
    }
    const handleAgentViewportChange = event => {
        if (event.matches && !isDocked && !isChatActive && messages.length <= 1) {
            dockAgent({ immediate: true, preserveChat: false });
            return;
        }
        if (isDocked) applyOrbPosition();
    };
    if (mobileAgentMedia.addEventListener) {
        mobileAgentMedia.addEventListener('change', handleAgentViewportChange);
    } else if (mobileAgentMedia.addListener) {
        mobileAgentMedia.addListener(handleAgentViewportChange);
    }

    const scrollDown = () => setTimeout(() => history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' }), 10);

    function addMsg(role, text) {
        const d = document.createElement('div');
        d.className = `agent-msg agent-msg-${role}`;
        role === 'user' ? (d.textContent = text) : (d.innerHTML = fmt(text));
        history.appendChild(d);
        if (activeLoadingEl && activeLoadingEl !== d && history.contains(activeLoadingEl)) {
            history.appendChild(activeLoadingEl);
        }
        scrollDown();
        return d;
    }

    function addToolMsg(text) {
        const d = document.createElement('div');
        d.className = 'agent-msg agent-msg-tool';
        d.textContent = text;
        history.appendChild(d);
        if (activeLoadingEl && history.contains(activeLoadingEl)) {
            history.appendChild(activeLoadingEl);
        }
        scrollDown();
        return d;
    }

    function showLoading(label) {
        const d = document.createElement('div');
        d.className = 'agent-msg agent-msg-ai agent-loading';
        d.innerHTML = '<div class="agent-dot"></div><div class="agent-dot"></div><div class="agent-dot"></div>';
        const text = document.createElement('span');
        text.textContent = label || '正在运行…';
        d.appendChild(text);
        activeLoadingEl = d;
        history.appendChild(d);
        scrollDown();
        return d;
    }

    function setLoadingLabel(label) {
        if (!activeLoadingEl || !label) return;
        const text = activeLoadingEl.querySelector('span');
        if (text) text.textContent = label;
    }

    function setupSubmitVoiceButton() {
        submitBtn.title = '点击收起为悬浮球，长按语音输入并发送';
        submitBtn.setAttribute('aria-label', '收纳助手，长按语音输入并发送');

        submitBtn.addEventListener('pointerdown', event => {
            if (event.button !== undefined && event.button !== 0) return;
            clearVoicePressTimer();
            voiceInput.pointerId = event.pointerId;
            voiceInput.pressBecameVoice = false;
            submitBtn.classList.add('agent-voice-arming');
            submitBtn.setPointerCapture?.(event.pointerId);
            voiceInput.pressTimer = setTimeout(() => {
                voiceInput.pressTimer = null;
                voiceInput.pressBecameVoice = true;
                suppressSubmitClickOnce();
                beginVoiceInput();
            }, VOICE_LONG_PRESS_MS);
        });

        submitBtn.addEventListener('pointerup', finishSubmitPointerPress);
        submitBtn.addEventListener('pointercancel', cancelSubmitPointerPress);
        submitBtn.addEventListener('contextmenu', event => {
            if (voiceInput.active || voiceInput.pressTimer) event.preventDefault();
        });

        submitBtn.addEventListener('click', event => {
            if (voiceInput.suppressClick) {
                event.preventDefault();
                event.stopPropagation();
                voiceInput.suppressClick = false;
                return;
            }
            dockAgent();
        });
    }

    function finishSubmitPointerPress(event) {
        const becameVoice = voiceInput.pressBecameVoice || voiceInput.active || voiceInput.recognition;
        clearVoicePressTimer();
        submitBtn.classList.remove('agent-voice-arming');
        submitBtn.releasePointerCapture?.(event.pointerId);
        if (becameVoice) {
            event.preventDefault();
            suppressSubmitClickOnce();
            stopVoiceInput(true);
        }
        voiceInput.pointerId = null;
        voiceInput.pressBecameVoice = false;
    }

    function cancelSubmitPointerPress(event) {
        const becameVoice = voiceInput.pressBecameVoice || voiceInput.active || voiceInput.recognition;
        clearVoicePressTimer();
        submitBtn.classList.remove('agent-voice-arming');
        submitBtn.releasePointerCapture?.(event.pointerId);
        if (becameVoice) {
            suppressSubmitClickOnce();
            stopVoiceInput(false);
        }
        voiceInput.pointerId = null;
        voiceInput.pressBecameVoice = false;
    }

    function clearVoicePressTimer() {
        if (!voiceInput.pressTimer) return;
        clearTimeout(voiceInput.pressTimer);
        voiceInput.pressTimer = null;
    }

    function suppressSubmitClickOnce() {
        voiceInput.suppressClick = true;
        setTimeout(() => {
            voiceInput.suppressClick = false;
        }, 700);
    }

    function beginVoiceInput() {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) {
            resetVoiceInputUi();
            addToolMsg('当前浏览器不支持语音识别。请使用 Chrome/Edge，或启用 Web Speech API。');
            return false;
        }

        if (voiceInput.recognition) {
            stopVoiceInput(false);
        }

        const recognition = new Recognition();
        voiceInput.recognition = recognition;
        voiceInput.active = true;
        voiceInput.stopping = false;
        voiceInput.sendOnEnd = true;
        voiceInput.initialText = textarea.value.trim();
        voiceInput.transcript = '';
        voiceInput.latestTranscript = '';
        voiceInput.error = '';

        recognition.lang = document.documentElement.lang || navigator.language || 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            submitBtn.classList.remove('agent-voice-arming');
            submitBtn.classList.add('agent-voice-recording');
            submitBtn.setAttribute('aria-pressed', 'true');
            textarea.placeholder = 'Listening... release to send';
            addToolMsg('正在听写，松开按钮发送。');
        };

        recognition.onresult = event => {
            let finalText = voiceInput.transcript;
            let interimText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const chunk = event.results[i][0]?.transcript || '';
                if (event.results[i].isFinal) finalText += chunk;
                else interimText += chunk;
            }
            voiceInput.transcript = finalText;
            voiceInput.latestTranscript = normalizeVoiceTranscript(`${finalText}${interimText}`);
            updateVoiceTextarea(voiceInput.latestTranscript);
        };

        recognition.onerror = event => {
            if (voiceInput.stopping && event.error === 'aborted') return;
            voiceInput.error = event.error || 'unknown';
            voiceInput.sendOnEnd = false;
            addToolMsg(formatVoiceError(voiceInput.error));
        };

        recognition.onend = () => {
            finishVoiceInput();
        };

        try {
            recognition.start();
            return true;
        } catch (err) {
            resetVoiceInputUi();
            addToolMsg(`语音识别启动失败：${err.message}`);
            return false;
        }
    }

    function stopVoiceInput(sendOnEnd) {
        if (!voiceInput.recognition) {
            resetVoiceInputUi();
            return;
        }
        voiceInput.sendOnEnd = Boolean(sendOnEnd);
        voiceInput.stopping = true;
        try {
            voiceInput.recognition.stop();
        } catch {
            finishVoiceInput();
        }
    }

    function finishVoiceInput() {
        const shouldSend = voiceInput.sendOnEnd && !voiceInput.error;
        const transcript = normalizeVoiceTranscript(voiceInput.latestTranscript || voiceInput.transcript);
        const recognition = voiceInput.recognition;
        resetVoiceInputUi();
        if (recognition) voiceInput.recognition = null;

        if (!shouldSend) return;
        if (!transcript) {
            addToolMsg('没有识别到语音内容。');
            return;
        }

        updateVoiceTextarea(transcript);
        send();
    }

    function resetVoiceInputUi() {
        submitBtn.classList.remove('agent-voice-arming', 'agent-voice-recording');
        submitBtn.removeAttribute('aria-pressed');
        textarea.placeholder = 'Reply...';
        voiceInput.active = false;
        voiceInput.stopping = false;
        voiceInput.sendOnEnd = false;
        voiceInput.recognition = null;
    }

    function updateVoiceTextarea(transcript) {
        const initial = voiceInput.initialText;
        const text = initial && transcript ? `${initial} ${transcript}` : (transcript || initial);
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function normalizeVoiceTranscript(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function formatVoiceError(error) {
        const messages = {
            'not-allowed': '语音识别权限被拒绝。请允许麦克风权限后重试。',
            'service-not-allowed': '语音识别服务不可用或被浏览器阻止。',
            'no-speech': '没有识别到语音内容。',
            network: '语音识别网络服务不可用，请稍后重试。',
            'audio-capture': '没有检测到可用麦克风。'
        };
        return messages[error] || `语音识别失败：${error}`;
    }

    async function send() {
        if (isSending) {
            addToolMsg('Agentmaster 正在处理上一条请求，请稍候...');
            return;
        }
        const text = textarea.value.trim();
        if (!text) return;
        isSending = true;
        let loader = null;
        try {
            await runSend(text, function (element) { loader = element; });
        } finally {
            if (loader) {
                loader.remove();
                if (activeLoadingEl === loader) activeLoadingEl = null;
            }
            isSending = false;
        }
    }

    async function runSend(text, setLoader) {
        textarea.value = '';
        textarea.style.height = '24px';

        if (!isChatActive) { chatWindow.classList.add('active'); isChatActive = true; }

        addMsg('user', text);
        messages.push({ role: 'user', content: text });

        const fastResult = await tryRunFastCommand(text);
        if (fastResult) {
            if (fastResult.tool) addToolMsg(fastResult.tool);
            if (fastResult.reply) addMsg('ai', fastResult.reply);
            rememberAssistant(fastResult.reply || fastResult.tool || 'Fast action completed.');
            return;
        }

        const allowKnowledgeGraphRetrieval = shouldAllowKnowledgeGraphRetrieval(text);
        if (allowKnowledgeGraphRetrieval) {
            const handled = await runKnowledgeGraphRag(text, { requireEvidence: true });
            if (handled) return;
            addMsg('ai', '本地世界知识语料中没有检索到与该节点相关的原文段落。请先在知识图谱中重新编译世界知识数据，或换一个更具体的问法。');
            rememberAssistant('本地世界知识语料中没有检索到与该节点相关的原文段落，本轮没有回答。');
            return;
        }

        if (shouldRetrieveWorldKnowledge(text)) {
            const handled = await runKnowledgeGraphRag(text, { requireEvidence: false });
            if (handled) return;
        }

        // 原生工具模式下始终挂载页面工具，由模型按系统提示词自主决定是否调用；
        // 关键词预闸仅保留给 inline-block fallback 模式（防注入必需）。
        const allowAgentTools = AGENT_USE_NATIVE_TOOLS ? true : shouldAllowAgentTools(text);
        setLoader(showLoading('正在思考…'));

        try {
            const payload = {
                messages: buildRequestMessages(buildConversationMessages(), allowAgentTools),
                stream: true
            };
            if (AGENT_MODEL) payload.model = AGENT_MODEL;

            const tools = [];
            if (AGENT_USE_NATIVE_TOOLS && allowAgentTools) tools.push(uiActionTool, browserActionTool);
            if (tools.length) payload.tools = tools;

            const res = await fetch(AGENT_API_URL, {
                method: 'POST',
                headers: buildUsageHeaders(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorText = await res.text().catch(() => '');
                const detail = errorText ? `\n\n${errorText.slice(0, 500)}` : '';
                addMsg('ai', `**[Error]** API request failed: ${res.status}${detail}`);
                rememberAssistant(`上一轮请求失败（HTTP ${res.status}），没有拿到回答。${errorText ? `上游返回：${errorText.slice(0, 300)}` : ''}`);
                return;
            }

            const { reply, reasoning, toolCalls, inlineActions, msgEl } = await readStream(res, allowAgentTools);

            if (toolCalls.length > 0 || inlineActions.length > 0) {
                setLoadingLabel('正在执行操作…');
                const executed = [
                    ...await executeToolCalls(toolCalls),
                    ...(allowAgentTools ? await executeInlineActions(inlineActions) : [])
                ];
                if (!reply) {
                    const summary = executed.filter(Boolean).join('\n');
                    const firstLine = (executed.find(Boolean) || 'Action completed.').split('\n')[0];
                    if (msgEl) {
                        const label = firstLine.length > 240 ? firstLine.slice(0, 240) + '…' : firstLine;
                        msgEl.innerHTML = fmt(label) + '<p>详细结果见上方工具消息。</p>';
                    }
                    rememberAssistant(summary || 'Action completed.');
                }
                if (!allowAgentTools && inlineActions.length > 0) {
                    addToolMsg('已忽略页面操作：当前消息被识别为普通问答。');
                }
            }

            if (reply) {
                rememberAssistant(reply);
            } else if (!toolCalls.length && !inlineActions.length) {
                rememberAssistant(emptyReplyNote(reasoning));
            }
        } catch (err) {
            addMsg('ai', `**[Network Error]** ${err.message}`);
            rememberAssistant(`上一轮请求网络异常：${err.message}`);
        }
    }

    async function runKnowledgeGraphRag(userText, { requireEvidence = false } = {}) {
        const loader = showLoading();
        try {
            const result = await executeKnowledgeGraphRetrieve({ query: userText, topK: 8 });
            loader.remove();
            if (!result.localCount) return false;
            if (!requireEvidence && !result.seeds.length && result.coverage < 0.55) return false;
            await answerWithKnowledgeGraphRetrieval(userText, [result.message]);
            return true;
        } catch (err) {
            loader.remove();
            if (requireEvidence) {
                addMsg('ai', `**[Knowledge Graph Retrieval Error]** ${err.message}`);
                rememberAssistant(`上一轮知识图谱检索失败：${err.message}`);
                return true;
            }
            return false;
        }
    }

    function rememberAssistant(content) {
        const text = String(content || '').trim();
        if (!text) return;
        messages.push({ role: 'assistant', content: text });
    }

    function messageChars(message) {
        const content = message?.content;
        if (typeof content === 'string') return content.length;
        if (Array.isArray(content)) return content.reduce((sum, part) => sum + String(part?.text || '').length, 0);
        return 0;
    }

    function buildConversationMessages() {
        const system = messages.filter(message => message.role === 'system').slice(0, 1);
        const turns = messages.filter(message => message.role !== 'system');
        let used = system.reduce((sum, message) => sum + messageChars(message), 0);
        const kept = [];
        for (let i = turns.length - 1; i >= 0; i -= 1) {
            const message = turns[i];
            const size = messageChars(message);
            if (kept.length >= HISTORY_MIN_RECENT && used + size > HISTORY_CHAR_BUDGET) break;
            used += size;
            kept.unshift(message);
        }
        const folded = turns.length - kept.length;
        if (!folded) return [...system, ...kept];
        return [
            ...system,
            {
                role: 'system',
                content: `Earlier ${folded} messages were folded out to fit the context window. Continue the conversation from the retained turns and do not invent the folded content.`
            },
            ...kept
        ];
    }

    function emptyReplyNote(reasoning) {
        if (String(reasoning || '').trim()) {
            return '模型本轮只在推理阶段输出了内容，没有给出最终回答。回复「继续」我会沿同一思路接着写；也可以把要求拆小一点再发一次。';
        }
        return '模型本轮没有返回任何内容。请再发一次，或稍后在大模型 Agent 模块里确认模型与接口是否可用。';
    }

    function isConversationFollowup(text) {
        const raw = String(text || '').trim();
        if (!raw) return false;
        if (/^(?:(?:选项|option|number|no\.?|选|要|做|用)\s*)?(?:第\s*)?(?:[0-9]{1,2}|[一二三四五六七八九十]{1,2}|[A-Da-d])\s*(?:个|条|项|步|节|页)?$/i.test(raw)) return true;
        return /^(?:继续|接着|接着写|继续写|继续往下|往下|下一步|好|好的|可以|行|开始|就这样|go\s*on|continue|next)\s*[!！。,.，；;~～]*$/i.test(raw);
    }

    function buildRequestMessages(baseMessages, allowTools, allowKnowledgeGraphRetrieval = false) {
        if (allowKnowledgeGraphRetrieval) {
            const selected = pendingKnowledgeGraphContext || {};
            const guard = {
                role: 'system',
                content: [
                    'The latest user message asks about a selected knowledge-graph node.',
                    'Do not answer from memory first. Call the knowledge_graph_retrieve tool to retrieve the node knowledge base, then answer in Chinese.',
                    'Do not call ui_action or browser_action for this explanation request.',
                    `Selected node: ${selected.nodeName || 'unknown'}`,
                    `Graph path: ${selected.graphPath || 'unknown'}`
                ].join('\n')
            };
            return [baseMessages[0], guard, ...baseMessages.slice(1)];
        }
        if (allowTools) return baseMessages;
        const guard = {
            role: 'system',
            content: [
                'The latest user message is a normal information/explanation request, not a page-control request. Do not call tools and do not emit <ui_action> or <browser_action> blocks. Answer in the user language.',
                'Treat it as the next turn of this conversation: when it is a number, a letter, or a short reply such as 继续/好的/第2个, resolve it against your previous answer and continue from there instead of asking the user to repeat the request.'
            ].join('\n')
        };
        return [baseMessages[0], guard, ...baseMessages.slice(1)];
    }

    async function readStream(res, allowInlineActions = true) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let reply = '', buf = '', reasoning = '';
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

                    if (delta.reasoning_content) {
                        reasoning += delta.reasoning_content;
                        if (!reply) setLoadingLabel('正在推理…');
                    }

                    if (delta.content) {
                        if (!reply) setLoadingLabel('正在生成…');
                        reply += delta.content;
                        msgDiv.innerHTML = fmt(stripDsmlForDisplay(reply)) + '<span class="agent-caret"></span>';
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
        msgDiv.innerHTML = parsed.text ? fmt(parsed.text) : `<p>${allowInlineActions ? '正在操作页面...' : esc(emptyReplyNote(reasoning))}</p>`;
        renderMath(msgDiv, true);
        return {
            reply: parsed.text,
            reasoning,
            toolCalls: compactToolCalls(toolCalls),
            inlineActions: parsed.actions,
            msgEl: msgDiv
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

    function normalizeDsmlMarkup(text) {
        return String(text || '')
            .replace(/<\s*\/\s*(?:\|\s*){0,2}\s*DSML\s*(?:\|\s*){0,2}/gi, '</||DSML||')
            .replace(/<\s*(?:\|\s*){0,2}\s*DSML\s*(?:\|\s*){0,2}/gi, '<||DSML||');
    }

    function parseDsmlParameter(raw, isString) {
        const value = String(raw || '').trim();
        if (isString) return value;
        try { return JSON.parse(value); } catch (error) { return value; }
    }

    function extractDsmlActions(text, actions) {
        let cleaned = normalizeDsmlMarkup(text);
        const invokePattern = /<\|{2}DSML\|{2}invoke\s+name\s*=\s*"([^"]+)"\s*>([\s\S]*?)<\/\|{2}DSML\|{2}invoke>/gi;
        let invoke;
        while ((invoke = invokePattern.exec(cleaned))) {
            const name = invoke[1];
            const body = invoke[2];
            const args = {};
            const paramPattern = /<\|{2}DSML\|{2}parameter\s+name\s*=\s*"([^"]+)"([^>]*)>([\s\S]*?)<\/\|{2}DSML\|{2}parameter>/gi;
            let param;
            while ((param = paramPattern.exec(body))) {
                args[param[1]] = parseDsmlParameter(param[3], /string\s*=\s*"true"/i.test(param[2] || ''));
            }
            if (name === 'ui_action' || name === 'browser_action') {
                actions.push({ name, arguments: args });
            } else {
                actions.push({ name: 'ui_action', arguments: Object.assign({ action: name }, args) });
            }
        }
        cleaned = cleaned.replace(/<\|{2}DSML\|{2}[\s\S]*?<\/\|{2}DSML\|{2}(?:calls?|tool_calls)>/gi, '');
        cleaned = cleaned.replace(/<\|{2}DSML\|{2}[\s\S]*?<\/\|{2}DSML\|{2}invoke>/gi, '');
        cleaned = cleaned.replace(/<\/?\|{2}DSML\|{2}[^>]*>/gi, '');
        return cleaned.trim();
    }

    function stripDsmlForDisplay(text) {
        const cleaned = normalizeDsmlMarkup(text);
        const start = cleaned.search(/<\|{2}DSML\|{2}/i);
        return start >= 0 ? cleaned.slice(0, start) : cleaned;
    }

    function extractInlineActions(text) {
        const actions = [];
        let hasPcbCode = false;
        let cleaned = extractDsmlActions(String(text || ''), actions);
        cleaned = cleaned.replace(/<pcb_code>([\s\S]*?)<\/pcb_code>/g, (match, raw) => {
            const code = String(raw || '')
                .replace(/^\s*```[a-zA-Z0-9_-]*\s*\n?/, '')
                .replace(/\n?```\s*$/, '')
                .trim();
            if (!code) return '';
            hasPcbCode = true;
            actions.push({ name: 'ui_action', arguments: { action: 'edit_pcb_code', value: code, run: true } });
            return '';
        });

        cleaned = cleaned.replace(/<circuit_spec>([\s\S]*?)<\/circuit_spec>/g, (match, raw) => {
            const text = String(raw || '')
                .replace(/^\s*```[a-zA-Z0-9_-]*\s*\n?/, '')
                .replace(/\n?```\s*$/, '')
                .trim();
            if (!text) return '';
            try {
                const spec = JSON.parse(text);
                actions.push({ name: 'ui_action', arguments: { action: 'build_circuit', circuit: spec } });
                return '';
            } catch {
                return match;
            }
        });

        cleaned = cleaned.replace(/<(ui_action|browser_action)>([\s\S]*?)<\/\1>/g, (match, name, raw) => {
            try {
                const parsed = JSON.parse(raw.trim());
                // 原生工具和 <pcb_code> 同时出现时，以代码块为准，避免写入两次。
                if (name === 'ui_action' && hasPcbCode && normalizeUiActionName(parsed.action) === 'edit_pcb_code') {
                    return '';
                }
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
        if (name === 'knowledge_graph_retrieve') return executeKnowledgeGraphRetrieve(args);
        throw new Error(`unknown tool "${name}"`);
    }

    async function executeKnowledgeGraphRetrieve(args = {}) {
        if (typeof window.ZSTP?.retrieveKnowledge !== 'function' && typeof window.ensureCipherModule === 'function') {
            await window.ensureCipherModule('zhishitupu');
        }
        const retriever = window.ZSTP?.retrieveKnowledge;
        if (typeof retriever !== 'function') {
            throw new Error('knowledge graph retriever is not available');
        }
        const result = await retriever({
            query: args.query || '',
            nodeName: args.nodeName || pendingKnowledgeGraphContext?.nodeName || '',
            topK: Number.isFinite(args.topK) ? args.topK : 8
        });
        const localRecords = result?.localRecords || [];
        return {
            message: JSON.stringify(compactKnowledgeGraphResult(result), null, 2),
            tool: 'knowledge_graph_retrieve',
            localCount: localRecords.length,
            topScore: Number(localRecords[0]?.score || 0),
            coverage: Number(result?.diagnostics?.queryCoverage || 0),
            seeds: result?.seeds || []
        };
    }

    function compactKnowledgeGraphResult(result) {
        if (!result || result.error) return result;
        const records = (result.localRecords || []).slice(0, 8).map((record, index) => ({
            citationId: `S${index + 1}`,
            type: record.type,
            title: record.title,
            content: String(record.content || record.snippet || '').slice(0, 1800),
            source: record.source || '',
            evidenceLevel: record.evidenceLevel || '',
            evidenceUsability: record.evidenceUsability || 'claim-supporting',
            graphRelation: record.graphRelation || ''
        }));
        const claims = (result.evidenceGraph?.nodes || [])
            .filter(node => node.type === 'claim')
            .slice(0, 6)
            .map((node, index) => ({
                citationId: `C${index + 1}`,
                statement: String(node.statement || '').slice(0, 1000),
                qualifiers: node.qualifiers
            }));
        return {
            node: result.node,
            graph: {
                path: result.graph?.path || [],
                parent: result.graph?.parent || '',
                children: (result.graph?.children || []).slice(0, 8),
                siblings: (result.graph?.siblings || []).slice(0, 6)
            },
            records,
            claims,
            mode: result.mode || 'local-corpus',
            diagnostics: {
                corpusChunks: result.diagnostics?.corpusChunks,
                queryTokens: result.diagnostics?.queryTokens,
                queryCoverage: result.diagnostics?.queryCoverage,
                seeds: result.diagnostics?.seeds || result.seeds || [],
                searchMs: result.diagnostics?.searchMs
            }
        };
    }

    async function answerWithKnowledgeGraphRetrieval(userText, retrievedMessages) {
        const retrievalText = retrievedMessages.join('\n\n');
        const history = buildConversationMessages();
        const lastIndex = history.length - 1;
        const priorTurns = history[lastIndex]?.role === 'user' ? history.slice(0, lastIndex) : history;
        const followupMessages = [
            ...priorTurns,
            {
                role: 'system',
                content: [
                    'Answer the user in Chinese using the retrieved local Wikipedia/Wikidata context below.',
                    'Write at expert depth. Use established Chinese and English disciplinary terminology; do not invent substitute terms or dilute technical concepts into generic slogans.',
                    'The records marked evidenceLevel=encyclopedia-verbatim are verbatim Wikipedia passages. They are the only evidence that may support concrete factual claims.',
                    'Cite the exact citationId shown on each record in square brackets after the supported sentence, for example [S1]. Cite Wikidata claim records as [C1] and call them structured Wikidata statements, not prose evidence.',
                    'Every factual sentence must be traceable to one of the retrieved records. If the records do not contain the answer, say exactly what is missing instead of filling the gap from memory.',
                    'Never fabricate a paper, metric, date, result or citation. Preserve the source language of technical terms and note when a source is a lead section rather than the full article.',
                    'Distinguish Wikipedia article statements, Wikidata structured claims, and your own synthesis. Do not present synthesis as a quoted source claim.',
                    'Do not print external URLs, revision ids, license notices or source-button instructions; citation ids such as [S1] are sufficient.',
                    'Do not mention internal JSON or retrieval implementation details unless the user asks.',
                    '',
                    'Retrieved local corpus records:',
                    retrievalText
                ].join('\n')
            },
            { role: 'user', content: userText }
        ];
        const loader = showLoading();
        try {
            const payload = { messages: followupMessages, stream: true };
            if (AGENT_MODEL) payload.model = AGENT_MODEL;
            const res = await fetch(AGENT_API_URL, {
                method: 'POST',
                headers: buildUsageHeaders(),
                body: JSON.stringify(payload)
            });
            loader.remove();
            if (!res.ok) {
                const errorText = await res.text().catch(() => '');
                addMsg('ai', `**[Error]** API request failed after retrieval: ${res.status}${errorText ? `\n\n${errorText.slice(0, 500)}` : ''}`);
                rememberAssistant(`上一轮检索回答请求失败（HTTP ${res.status}）。`);
                return;
            }
            const { reply, reasoning } = await readStream(res, false);
            rememberAssistant(reply || emptyReplyNote(reasoning));
        } catch (err) {
            loader.remove();
            addMsg('ai', `**[Network Error]** ${err.message}`);
            rememberAssistant(`上一轮检索回答网络异常：${err.message}`);
        }
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
            case 'generate_world':
                return generateWorld(args);
            case 'edit_pcb_code':
                return editPcbCode(args);
            case 'read_pcb_code':
                return readPcbCode(args);
            case 'build_circuit':
                return buildCircuit(args);
            case 'read_circuit':
                return readCircuit(args);
            case 'run_circuit':
                return runCircuit(args);
            case 'stop_circuit':
                return stopCircuit(args);
            default:
                throw new Error(`unknown action "${action}"`);
        }
    }

    /**
     * 世界模型入口：切到建模实验室·世界模型页，把描述填好，
     * 按 confirm 决定「只填表等用户点生成」还是「直接发起生成」。
     *
     * 实际执行发生在 worldmodel 的 iframe 里，这里只负责下发指令。
     */
    function generateWorld(args = {}) {
        if (typeof window.worldModelRun !== 'function') {
            throw new Error('世界模型未就绪：请确认建模实验室模块已加载');
        }
        const prompt = String(args.prompt ?? args.value ?? args.text ?? args.content ?? '').trim();
        const confirmOnly = args.confirm === true;
        const result = window.worldModelRun({
            prompt,
            displayName: args.displayName || args.name || '',
            model: args.worldModel || args.model || '',
            generate: !confirmOnly
        });
        if (!prompt && !confirmOnly) {
            // 没给描述就别贸然烧额度，退回到只填表。
            window.worldModelRun({ generate: false });
            return ok('已打开世界模型页。没有收到场景描述，先不发起生成，等用户确认。', args.reason);
        }
        return ok(result && result.message ? result.message : '已打开世界模型页。', args.reason);
    }

    function waitForWindowFunction(name, timeoutMs) {
        return new Promise(resolve => {
            const started = Date.now();
            (function check() {
                if (typeof window[name] === 'function') {
                    resolve(window[name]);
                    return;
                }
                if (Date.now() - started > timeoutMs) {
                    resolve(null);
                    return;
                }
                setTimeout(check, 150);
            })();
        });
    }

    async function preparePcbLab(reason) {
        navigateSection('electroniclab', reason);
        if (typeof window.ensureCipherModule === 'function') {
            try {
                await window.ensureCipherModule('electroniclab');
            } catch (error) {
                // 模块已加载但初始化失败时继续尝试使用已存在的桥接。
            }
        }
    }

    function replaceTsxTags(code, tagName, replacer) {
        const pattern = new RegExp('<' + tagName + '\\b', 'g');
        let result = '';
        let last = 0;
        let match;
        while ((match = pattern.exec(code))) {
            const start = match.index;
            let quote = null;
            let end = -1;
            for (let i = start + 1; i < code.length; i++) {
                const ch = code[i];
                if (quote) {
                    if (ch === quote) quote = null;
                } else if (ch === '"' || ch === "'") {
                    quote = ch;
                } else if (ch === '>') {
                    end = i + 1;
                    break;
                }
            }
            if (end < 0) break;
            const tag = code.slice(start, end);
            result += code.slice(last, start) + replacer(tag);
            last = end;
            pattern.lastIndex = end;
        }
        result += code.slice(last);
        return result;
    }

    function normalizePcbTsx(code) {
        const notes = [];
        let next = String(code || '');
        next = replaceTsxTags(next, 'trace', tag => {
            if (!/\sthickness=/.test(tag)) return tag;
            notes.push('trace thickness → width');
            if (/\swidth=/.test(tag)) return tag.replace(/\sthickness="[^"]*"/, '');
            return tag.replace(/\sthickness=/, ' width=');
        });
        next = replaceTsxTags(next, 'fiducial', tag => {
            if (/\bpadDiameter=/.test(tag) || !/\/>$/.test(tag)) return tag;
            notes.push('fiducial 补 padDiameter');
            return tag.replace(/\s*\/>$/, ' padDiameter="1mm" />');
        });
        next = replaceTsxTags(next, 'testpoint', tag => {
            if (!/\bfootprint="testpoint"/.test(tag)) return tag;
            notes.push('testpoint footprint → footprintVariant');
            const without = tag.replace(/\s*footprint="testpoint"/, '');
            if (/\bfootprintVariant=/.test(without)) return without;
            return without.replace(/<testpoint\b/, '<testpoint footprintVariant="pad"');
        });
        next = replaceTsxTags(next, 'silkscreentext', tag => {
            if (!/fontSize=\{/.test(tag)) return tag;
            notes.push('silkscreentext fontSize 补单位');
            return tag.replace(/fontSize=\{(\d+(?:\.\d+)?)\}/, 'fontSize="$1mm"');
        });
        return { code: next, notes: Array.from(new Set(notes)) };
    }

    function autoRepairPcbPlacement(code, errors) {
        const notes = [];
        let next = code;
        (errors || []).forEach(line => {
            const match = String(line).match(/Component\s+(\S+)\s+extends outside board boundaries by\s+([\d.]+)mm\.\s*Try moving it\s+([\d.]+)mm\s+(right|left|up|down)/i);
            if (!match) return;
            const name = match[1].replace(/["']/g, '');
            const axis = /right|left/i.test(match[4]) ? 'pcbX' : 'pcbY';
            const delta = parseFloat(match[3]) * (/right|up/i.test(match[4]) ? 1 : -1);
            const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const tagRe = new RegExp('<([a-zA-Z][\\w-]*)\\b[^>]*\\bname="' + safeName + '"[^>]*>');
            const before = next;
            next = next.replace(tagRe, tag => {
                const attrRe = new RegExp('\\b' + axis + '=\\{(-?[\\d.]+)\\}');
                if (attrRe.test(tag)) {
                    return tag.replace(attrRe, (full, value) => `${axis}={${(parseFloat(value) + delta).toFixed(2)}}`);
                }
                const stringRe = new RegExp('\\b' + axis + '="(-?[\\d.]+)mm"');
                if (stringRe.test(tag)) {
                    return tag.replace(stringRe, (full, value) => `${axis}="${(parseFloat(value) + delta).toFixed(2)}mm"`);
                }
                return tag;
            });
            if (next !== before) notes.push(`${name} ${axis} ${delta > 0 ? '+' : ''}${delta.toFixed(2)}mm`);
        });
        return { code: next, notes: notes, changed: next !== code };
    }

    async function editPcbCode(args = {}) {
        const rawCode = String(args.value ?? args.code ?? args.content ?? args.tsx ?? args.text ?? '')
            .replace(/^\s*```[a-zA-Z0-9_-]*\s*\n?/, '')
            .replace(/\n?```\s*$/, '');
        if (!rawCode.trim()) throw new Error('edit_pcb_code requires the full TSX code in value');
        const normalized = normalizePcbTsx(rawCode);
        let code = normalized.code;
        await preparePcbLab(args.reason);
        const writePcbCode = await waitForWindowFunction('electronicLabWritePcbCode', 15000);
        if (!writePcbCode) throw new Error('电子实验室模块未就绪，无法写入 PCB 代码');
        addToolMsg('正在写入 main.tsx 并等待 PCB 引擎渲染检查...');
        let result = await writePcbCode(code, { run: args.run !== false, reason: args.reason || '' });
        if (!result || result.ok === false) throw new Error(result?.message || 'PCB TSX 写入失败');
        let repairRounds = 0;
        while (result.errorCount > 0 && repairRounds < 2) {
            const repair = autoRepairPcbPlacement(code, result.errors);
            if (!repair.changed) break;
            code = repair.code;
            normalized.notes.push(...repair.notes);
            addToolMsg('PCB 引擎报告越界，正在自动微调位置并重跑...');
            result = await writePcbCode(code, { run: args.run !== false, reason: args.reason || '' });
            repairRounds += 1;
        }
        const errors = Array.isArray(result.errors) ? result.errors : [];
        const errorCount = Number.isFinite(result.errorCount) ? result.errorCount : errors.length;
        const fixNote = normalized.notes.length ? `\n已自动修正语法：${normalized.notes.join('；')}` : '';
        const suffix = errorCount
            ? `\nPCB 引擎报告 ${errorCount} 条错误：\n${errors.slice(0, 10).join('\n')}\n请修正 TSX 后重新调用 edit_pcb_code。`
            : '';
        return ok((result.message || `已写入 PCB TSX（${code.length} 字符）`) + fixNote + suffix, args.reason);
    }

    async function readPcbCode(args = {}) {
        await preparePcbLab(args.reason);
        const readPcb = await waitForWindowFunction('electronicLabReadPcbCode', 15000);
        if (!readPcb) throw new Error('电子实验室模块未就绪，无法读取 PCB 代码');
        const result = await readPcb();
        if (!result || result.ok === false) throw new Error(result?.message || 'PCB TSX 读取失败');
        const code = String(result.code || '');
        const errors = Array.isArray(result.errors) ? result.errors : [];
        const errorCount = Number.isFinite(result.errorCount) ? result.errorCount : errors.length;
        const status = errorCount
            ? `\nPCB 引擎错误（${errorCount}）：\n${errors.slice(0, 10).join('\n')}`
            : (result.engineReady ? '\nPCB 引擎已就绪，当前无渲染错误。' : '\nPCB 引擎仍在加载。');
        return ok(`当前 main.tsx（${code.length} 字符）：\n\`\`\`tsx\n${code}\n\`\`\`${status}`, args.reason);
    }

    async function prepareCircuitLab(reason) {
        navigateSection('electroniclab', reason);
        if (typeof window.ensureCipherModule === 'function') {
            try {
                await window.ensureCipherModule('electroniclab');
            } catch (error) {
                // 模块已加载但初始化失败时继续尝试使用已存在的桥接。
            }
        }
    }

    function formatCircuitReadings(readings) {
        return (readings || []).slice(0, 12).map(item => {
            const name = item.name || item.type || 'element';
            const info = (item.info || []).slice(0, 5).join(' ');
            return `${name}: ${info || '无读数'}`;
        }).join('\n');
    }

    function parseCircuitSpec(args = {}) {
        let spec = args.circuit ?? args.spec ?? args.plan ?? args.value ?? args.text ?? args.netlist;
        if (!spec && args.components !== undefined) {
            let components = args.components;
            if (typeof components === 'string') {
                try { components = JSON.parse(components); } catch (error) { /* 保留原始字符串 */ }
            }
            if (Array.isArray(components)) spec = { title: args.title || '', components };
        }
        if (typeof spec === 'string' && args.format !== 'circuitjs') {
            const trimmed = spec.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try { spec = JSON.parse(trimmed); } catch (error) { /* 保留原始字符串 */ }
            }
        }
        return spec;
    }

    async function buildCircuit(args = {}) {
        const spec = parseCircuitSpec(args);
        if (!spec) throw new Error('build_circuit requires a circuit spec in circuit');
        await prepareCircuitLab(args.reason);
        const build = await waitForWindowFunction('electronicLabBuildCircuit', 15000);
        if (!build) throw new Error('电子实验室模块未就绪，无法搭建电路');
        const result = await build(spec, {
            format: args.format,
            run: args.run !== false,
            reason: args.reason || ''
        });
        if (!result || result.ok === false) throw new Error(result?.message || '电路搭建失败');
        const readings = formatCircuitReadings(result.readings);
        const warnings = (result.warnings || []).filter(Boolean).join('；');
        const componentCount = Number.isFinite(result.componentCount) ? result.componentCount : (result.readings || []).length;
        const netCount = Number.isFinite(result.netCount) ? result.netCount : 0;
        const summary = `已搭建「${result.title || 'Agentmaster 电路'}」：${componentCount} 个元件 / ${netCount} 个网络，仿真已运行。`;
        return ok([summary, warnings ? `提示：${warnings}` : '', readings].filter(Boolean).join('\n'), args.reason);
    }

    async function readCircuit(args = {}) {
        await prepareCircuitLab(args.reason);
        const read = await waitForWindowFunction('electronicLabReadCircuit', 15000);
        if (!read) throw new Error('电子实验室模块未就绪，无法读取电路');
        const result = await read({ timeoutMs: 20000 });
        if (!result || result.ok === false) throw new Error(result?.message || '电路读取失败');
        const netlist = String(result.netlist || '');
        const readings = formatCircuitReadings(result.readings);
        const header = `当前电路「${result.title || '未命名'}」${result.running ? '，仿真运行中' : '，仿真已暂停'}（${netlist.split('\n').filter(Boolean).length} 行网表）：`;
        return ok(`${header}\n\`\`\`circuitjs\n${netlist.slice(0, 8000)}\n\`\`\`\n${readings}`, args.reason);
    }

    async function runCircuit(args = {}) {
        await prepareCircuitLab(args.reason);
        const run = await waitForWindowFunction('electronicLabRunCircuit', 15000);
        if (!run) throw new Error('电子实验室模块未就绪，无法运行仿真');
        const result = await run({ timeoutMs: 20000 });
        if (!result || result.ok === false) throw new Error(result?.message || '仿真启动失败');
        return ok('电路仿真已运行。', args.reason);
    }

    async function stopCircuit(args = {}) {
        await prepareCircuitLab(args.reason);
        const stop = await waitForWindowFunction('electronicLabStopCircuit', 15000);
        if (!stop) throw new Error('电子实验室模块未就绪，无法暂停仿真');
        const result = await stop({ timeoutMs: 20000 });
        if (!result || result.ok === false) throw new Error(result?.message || '仿真暂停失败');
        return ok('电路仿真已暂停。', args.reason);
    }

    function resolveActionTarget(args, action) {
        if (!args || typeof args !== 'object') return '';
        // 世界生成 / PCB 编码没有元素目标，别让 prompt 或代码被当成 CSS 选择器去 normalize
        if (action === 'generate_world' || action === 'edit_pcb_code' || action === 'read_pcb_code'
            || action === 'build_circuit' || action === 'read_circuit' || action === 'run_circuit' || action === 'stop_circuit') return '';
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
            find: 'search',
            generate_world: 'generate_world',
            create_world: 'generate_world',
            make_world: 'generate_world',
            world_generate: 'generate_world',
            world_model_generate: 'generate_world',
            generate_scene: 'generate_world',
            create_scene: 'generate_world',
            text_to_world: 'generate_world',
            image_to_world: 'generate_world',
            edit_pcb_code: 'edit_pcb_code',
            write_pcb_code: 'edit_pcb_code',
            set_pcb_code: 'edit_pcb_code',
            update_pcb_code: 'edit_pcb_code',
            generate_pcb_code: 'edit_pcb_code',
            write_pcb_tsx: 'edit_pcb_code',
            edit_pcb_tsx: 'edit_pcb_code',
            write_tsx: 'edit_pcb_code',
            edit_tsx: 'edit_pcb_code',
            read_pcb_code: 'read_pcb_code',
            get_pcb_code: 'read_pcb_code',
            show_pcb_code: 'read_pcb_code',
            read_pcb_tsx: 'read_pcb_code',
            get_pcb_tsx: 'read_pcb_code',
            build_circuit: 'build_circuit',
            create_circuit: 'build_circuit',
            make_circuit: 'build_circuit',
            generate_circuit: 'build_circuit',
            draw_circuit: 'build_circuit',
            design_circuit: 'build_circuit',
            edit_circuit: 'build_circuit',
            write_circuit: 'build_circuit',
            set_circuit: 'build_circuit',
            simulate_circuit: 'build_circuit',
            circuit_build: 'build_circuit',
            read_circuit: 'read_circuit',
            get_circuit: 'read_circuit',
            show_circuit: 'read_circuit',
            export_circuit: 'read_circuit',
            get_circuit_code: 'read_circuit',
            run_circuit: 'run_circuit',
            start_circuit: 'run_circuit',
            resume_circuit: 'run_circuit',
            stop_circuit: 'stop_circuit',
            pause_circuit: 'stop_circuit'
        };
        return aliases[raw] || aliases[raw.toLowerCase()] || raw;
    }

    function normalizeTarget(target) {
        const aliases = {
            '加密实验室': 'jiamishiyanshi',
            '密码': 'jiamishiyanshi',
            '电子实验室': 'electroniclab',
            '电路': 'electroniclab',
            '建模实验室': 'jianmoshiyanshi',
            '建模': 'jianmoshiyanshi',
            '工作流': 'workflow',
            '知识图谱': 'zhishitupu',
            '大模型': 'damoxing',
            'Skill/MCP实验室': 'mcpskilllab',
            'Skill / MCP 实验室': 'mcpskilllab',
            'MCP实验室': 'mcpskilllab',
            'Skill实验室': 'mcpskilllab',
            '技能实验室': 'mcpskilllab',
            '插件实验室': 'mcpskilllab',
            '插件': 'mcpskilllab',
            '联系我们': 'yijianfankui',
            '反馈': 'yijianfankui',
            '经典区': 'mimaqu',
            '现代区': 'xiandaiqu',
            '逻辑区': 'luojimiti',
            '词汇区': 'cihuiqu',
            '预留区': 'yuliu',
            '预留': 'yuliu',
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
            '建模实验室': 'jianmoshiyanshi',
            '建模': 'jianmoshiyanshi',
            '世界模型': 'jianmoshiyanshi',
            '世界模型实验室': 'jianmoshiyanshi',
            '世界生成': 'jianmoshiyanshi',
            'marble': 'jianmoshiyanshi',
            'Marble': 'jianmoshiyanshi',
            '工作流': 'workflow',
            '知识图谱': 'zhishitupu',
            '大模型': 'damoxing',
            '模型': 'damoxing',
            'Skill/MCP实验室': 'mcpskilllab',
            'Skill / MCP 实验室': 'mcpskilllab',
            'MCP实验室': 'mcpskilllab',
            'Skill实验室': 'mcpskilllab',
            '技能实验室': 'mcpskilllab',
            '插件实验室': 'mcpskilllab',
            '插件': 'mcpskilllab',
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
        aliases['Agent模块'] = 'damoxing';
        aliases['agent模块'] = 'damoxing';
        aliases.jianmoshiyanshi = 'jianmoshiyanshi';
        aliases['建模模块'] = 'jianmoshiyanshi';
        aliases['建模实验室模块'] = 'jianmoshiyanshi';
        aliases['modeling lab'] = 'jianmoshiyanshi';
        aliases['modeling laboratory'] = 'jianmoshiyanshi';
        aliases['世界模型'] = 'jianmoshiyanshi';
        aliases['世界模型实验室'] = 'jianmoshiyanshi';
        aliases['世界生成'] = 'jianmoshiyanshi';
        aliases['marble'] = 'jianmoshiyanshi';
        aliases['Marble'] = 'jianmoshiyanshi';
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

    function getContactSubmoduleAliases() {
        return [
            {
                target: 'guanyuzuozhe',
                names: ['guanyuzuozhe', '关于作者', '作者', 'about author', 'about']
            },
            {
                target: 'zuozhecaifang',
                names: ['zuozhecaifang', '技术答疑', '采访', 'interview']
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

    async function executeUiBatch(steps, reason) {
        if (!Array.isArray(steps) || steps.length === 0) throw new Error('batch requires non-empty steps');
        const results = [];
        for (const step of steps.slice(0, 12)) {
            const result = await executeUiAction(step);
            results.push(result.message);
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

    window.openAgentMasterWithPrompt = function (prompt, options = {}) {
        const text = String(prompt || '').trim();
        if (!text) return;
        pendingKnowledgeGraphContext = options?.knowledgeGraphContext || null;
        restoreAgent();
        chatWindow.classList.add('active');
        isChatActive = true;
        suggestions?.classList.remove('hidden');
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

    function dockAgent(options = {}) {
        if (isDocked || dockTimer) return;
        const immediate = Boolean(options.immediate);
        wasChatActiveBeforeDock = options.preserveChat === false ? false : isChatActive;
        chatWindow.classList.remove('active');
        suggestions?.classList.add('hidden');
        isChatActive = false;
        const finishDock = () => {
            dockTimer = null;
            isDocked = true;
            applyOrbPosition();
            orb.parentElement.classList.remove('agent-docking');
            orb.parentElement.classList.add('agent-docked');
        };
        if (immediate) {
            finishDock();
            return;
        }
        orb.parentElement.classList.add('agent-docking');
        dockTimer = setTimeout(finishDock, 240);
    }

    function closeChatWindow() {
        chatWindow.classList.remove('active');
        suggestions?.classList.remove('hidden');
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
        }
        suggestions?.classList.remove('hidden');
        textarea.focus();
    }

    function applyOrbPosition() {
        const saved = readOrbPosition();
        const pos = saved || getDefaultOrbPosition();
        moveOrbTo(pos.left, pos.top);
    }

    function getDefaultOrbPosition() {
        return { left: window.innerWidth - 82, top: window.innerHeight - 82 };
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

    function isMobileAgentViewport() {
        return mobileAgentMedia.matches;
    }

    function shouldAllowAgentTools(text) {
        const raw = String(text || '').trim();
        const normalized = normalizeText(raw);
        if (!normalized) return false;

        if (isLikelyAnswerOnlyRequest(raw, normalized)) return false;
        return hasExplicitOperationIntent(raw, normalized);
    }

    function shouldAllowKnowledgeGraphRetrieval(text) {
        if (!pendingKnowledgeGraphContext) return false;
        const raw = String(text || '').trim();
        const normalized = normalizeText(raw);
        if (!normalized) return false;
        if (isConversationFollowup(raw)) return false;
        const answerIntent = isLikelyAnswerOnlyRequest(raw, normalized) ||
            ['节点', '知识图谱', '是什么', '解释', '说明', 'what', 'explain', 'meaning']
                .some(term => normalized.includes(normalizeText(term)));
        return answerIntent && !hasExplicitOperationIntent(raw, normalized);
    }

    function shouldRetrieveWorldKnowledge(text) {
        const raw = String(text || '').trim();
        const normalized = normalizeText(raw);
        if (!normalized || raw.length < 4) return false;
        if (isConversationFollowup(raw)) return false;
        if (hasExplicitOperationIntent(raw, normalized)) return false;
        if (/^(?:你好|您好|hi|hello|hey|谢谢|多谢|再见|晚安|早上好|晚上好)[!！。,.，\s]*$/i.test(raw)) return false;
        if (/^(?:写|帮我写|生成|画|翻译|润色|续写|总结一下这|把这段)/.test(raw)) return false;
        if (isLikelyAnswerOnlyRequest(raw, normalized)) return true;
        return /^[\u4e00-\u9fffA-Za-z0-9][\u4e00-\u9fffA-Za-z0-9 .·+\-]{1,40}$/.test(raw);
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

    function isPcbCodingIntent(raw, normalized) {
        const target = /(电子实验室|电路板|pcb|tsx|main\.tsx|左侧|代码面板|布线|原理图|焊盘|封装)/i.test(raw);
        const action = /(写|编写|生成|画|改|修改|重写|替换|更新|读取|看看|查看|编辑|排版|优化|检查|重建)/.test(raw);
        return target && action;
    }

    function isCircuitBuildIntent(raw, normalized) {
        const target = /(电路模拟|电路仿真|仿真电路|电路|circuit|falstad|示波器|波形|信号源)/i.test(raw);
        const action = /(搭|搭建|创建|生成|画|设计|仿真|模拟|运行|启动|暂停|停止|读取|看看|查看|修改|调整|替换|重建|做一个|来个)/.test(raw);
        return target && action;
    }

    function hasExplicitOperationIntent(raw, normalized) {
        if (isPcbCodingIntent(raw, normalized)) return true;
        if (isCircuitBuildIntent(raw, normalized)) return true;
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
            '刷新', '关闭', '后退', '前进', '搭建', '生成', '画一个', '仿真', 'open', 'show', 'goto', 'switch', 'navigate', 'click', 'select',
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

        // UI operations must go through the agent tool flow so requested page actions are visible in the assistant pipeline.
        // Keep this fast path limited to browser/window commands above.
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
        setInterval(registerSelf, 30000);

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
                if (win.id === selfId) {
                    const localResult = await executeUiAction(uiAction);
                    local.push(localResult.message);
                } else {
                    remote.push(requestRemote(win.id, { command: 'ui_action', args: uiAction }).catch(err => ({ message: err.message })));
                }
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
                    result = await executeUiAction(message.payload.args || {});
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
        const model = config.model || localStorage.getItem('AGENTMASTER_MODEL') || 'deepseek-flash';
        return {
            chatUrl: config.chatUrl || localStorage.getItem('CIPHERTOOL_CHAT_API_URL') || resolveBackendChatUrl(),
            model: normalizeDeepSeekModel(model),
            useNativeTools: config.useNativeTools === true || localStorage.getItem('AGENTMASTER_USE_NATIVE_TOOLS') === 'true'
        };
    }

    function normalizeDeepSeekModel(model) {
        const normalized = String(model || '').trim();
        if (normalized === 'deepseek-flash' || normalized === 'deepseek-v4-pro') return normalized;
        // 历史模型名及版本号写法统一归一到 V4.1-Flash-1017 的稳定模型名。
        if (normalized === 'deepseek-v4-flash'
            || normalized === 'deepseek-v4-flash-vision-exp'
            || normalized === 'deepseek-v4.1-flash'
            || normalized === 'deepseek-v4-1-flash'
            || normalized === 'deepseek-v4.1-flash-1017'
            || normalized === 'deepseek-v4-1-flash-1017'
            || normalized === 'deepseek-v4.1'
            || normalized === 'deepseekv4.1'
            || normalized === 'deepseekv4'
            || normalized === 'deepseek-v4') {
            return 'deepseek-flash';
        }
        return normalized || 'deepseek-flash';
    }

    function resolveBackendChatUrl() {
        const base = (() => {
            try {
                const override = window.CIPHERTOOL_API_BASE || localStorage.getItem('CIPHERTOOL_API_BASE') || '';
                if (/^https?:\/\//i.test(override)) {
                    return override.replace(/\/+$/, '');
                }
            } catch {
                // Fall through to local backend.
            }
            return 'http://127.0.0.1:8080';
        })();
        return `${base}/api/chat/completions`;
    }
});
