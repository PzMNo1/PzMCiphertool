(function () {
    let initialized = false;

    // 轻量诊断轨迹：排查初始化异常时可在控制台查看 window.__modelingLabTrace
    const trace = [];
    window.__modelingLabTrace = trace;
    const note = step => {
        trace.push(step);
        if (trace.length > 60) trace.shift();
    };

    const VIEWS = {
        editor: {
            src: './modelinglab/three-webgpu-editor/docs/index.html',
            title: 'Three.js 建模编辑器',
            tab: '建模编辑器'
        },
        convert: {
            src: './modelinglab/format-convert.html',
            title: '模型格式转换台',
            tab: '格式转换台'
        },
        world: {
            src: './worldmodel/worldmodel.html',
            title: '世界模型工作台',
            tab: '世界模型'
        }
    };

    function resolveRoot() {
        // 正常路径：modules.js 注入的模块片段里带 #modelinglab-root
        const direct = document.getElementById('modelinglab-root');
        if (direct) {
            note('resolveRoot: 命中模块根节点');
            return direct;
        }
        // 兜底：模块片段尚未注入时，直接在容器里创建根节点，避免初始化静默失效
        const host = document.getElementById('jianmoshiyanshi-content')
            || document.getElementById('jianmoshiyanshi-container');
        if (!host) {
            note('resolveRoot: 未找到任何容器节点');
            return null;
        }
        const created = document.createElement('div');
        created.id = 'modelinglab-root';
        host.appendChild(created);
        note('resolveRoot: 已在容器内创建根节点');
        return created;
    }

    function initModelingLab() {
        if (initialized) {
            note('init: 已初始化，跳过');
            return;
        }
        const root = resolveRoot();
        if (!root) return;
        initialized = true;
        try {
            render(root);
            bind(root);
            note('init: 完成');
        } catch (err) {
            initialized = false;
            note('init: 失败 ' + (err && err.message));
            console.error('[modelinglab] 初始化失败', err);
        }
    }

    function render(root) {
        // 帧由 VIEWS 生成：新增视图只要往 VIEWS 里加一条，不会再出现「页签有了但 iframe 忘了」。
        const frames = Object.keys(VIEWS).map((key, index) => {
            const view = VIEWS[key];
            const active = index === 0;
            return `
                    <iframe
                        class="modelinglab-editor-frame"
                        data-view-frame="${key}"
                        data-src="${view.src}"
                        title="${view.title}"
                        allowfullscreen
                        style="display:${active ? 'block' : 'none'}">
                    </iframe>`;
        }).join('');

        const tabs = Object.keys(VIEWS).map((key, index) => {
            const label = VIEWS[key].tab || VIEWS[key].title;
            return `<button type="button" class="modelinglab-tab${index === 0 ? ' active' : ''}" data-view="${key}" role="tab" aria-selected="${index === 0}">${label}</button>`;
        }).join('\n                        ');

        root.innerHTML = `
            <section class="modelinglab-shell">
                <header class="modelinglab-header module-header">
                    <h2 class="neon-title" data-text="ORBITAL HARDWARE STUDIO">ORBITAL HARDWARE STUDIO</h2>
                    <nav class="modelinglab-tabs" role="tablist" aria-label="建模实验室子模块">
                        ${tabs}
                        <span class="modelinglab-hint">编辑器仅支持 GLB / FBX 导入，其它格式先转 GLB</span>
                    </nav>
                </header>

                <div class="modelinglab-editor">${frames}
                </div>
            </section>
        `;
    }

    function bind(root) {
        const tabs = Array.from(root.querySelectorAll('.modelinglab-tab[data-view]'));
        const frames = Array.from(root.querySelectorAll('[data-view-frame]'));

        const showView = view => {
            if (!VIEWS[view]) return;
            tabs.forEach(tab => {
                const on = tab.getAttribute('data-view') === view;
                tab.classList.toggle('active', on);
                tab.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            frames.forEach(frame => {
                const on = frame.getAttribute('data-view-frame') === view;
                if (on && !frame.getAttribute('src')) {
                    frame.src = frame.getAttribute('data-src');
                }
                frame.style.display = on ? 'block' : 'none';
            });
            // 让编辑器/预览页重新计算画布尺寸
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                // iframe 里的画布监听的是自己的 window，这里单独叫醒一次
                frames.forEach(frame => {
                    if (frame.style.display === 'none') return;
                    try {
                        frame.contentWindow?.dispatchEvent(new Event('resize'));
                    } catch (error) {
                        // 跨域时忽略
                    }
                });
            }, 60);
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', () => showView(tab.getAttribute('data-view')));
        });

        // 转换台里的「前往建模编辑器」按钮
        window.addEventListener('message', event => {
            if (event && event.data && event.data.type === 'modelinglab:open-editor') {
                showView('editor');
            }
        });

        window.modelingLabShowView = showView;

        /* --------------------------------------------------------------
           世界模型：宿主侧桥接
           世界模型页面跑在 iframe 里，父页面不直接摸它的 DOM，
           统一用 postMessage 下发「填表 / 生成 / 刷新」指令。
           -------------------------------------------------------------- */
        const worldFrame = () => {
            const frame = Array.from(frames).find(f => f.getAttribute('data-view-frame') === 'world');
            return frame && frame.tagName === 'IFRAME' ? frame : null;
        };

        const postToWorld = (message, retries = 12) => {
            const frame = worldFrame();
            if (!frame) return;
            const deliver = attempt => {
                try {
                    if (frame.contentWindow) {
                        frame.contentWindow.postMessage(message, '*');
                        return;
                    }
                } catch (error) {
                    note('world: postMessage 失败 ' + (error && error.message));
                }
                if (attempt < retries) {
                    setTimeout(() => deliver(attempt + 1), 250);
                }
            };
            deliver(0);
        };

        /**
         * Agent 的自然语言入口：切到世界模型页并（可选）直接发起生成。
         * options: { prompt, displayName, model, imageDataUrl, generate }
         */
        window.worldModelRun = async function (options = {}) {
            showView('world');
            const payload = {
                type: options.generate === false ? 'worldmodel:fill' : 'worldmodel:run',
                prompt: String(options.prompt || ''),
                displayName: options.displayName || '',
                model: options.model || '',
                imageDataUrl: options.imageDataUrl || ''
            };
            postToWorld(payload);
            return {
                ok: true,
                started: payload.type === 'worldmodel:run',
                message: payload.type === 'worldmodel:run'
                    ? '已切到建模实验室·世界模型并提交生成，进度显示在该页面的进度条上。'
                    : '已切到建模实验室·世界模型并填好场景描述，等用户确认后点「生成世界」。'
            };
        };

        /** 让 Agent 能拿到一句人类可读的状态摘要 */
        window.worldModelSummary = function () {
            try {
                const api = worldFrame()?.contentWindow?.__WM__;
                if (api && typeof api.summary === 'function') {
                    return api.summary();
                }
            } catch (error) {
                // 跨域时回退
            }
            return '世界模型页面尚未初始化。';
        };
    }

    window.initModelingLab = initModelingLab;
})();
