// workflow.js — 可视化卡片连线工作流引擎
function initWorkflowCoze() {
    const cipherMap = {
        'Caesar凯撒': { obj: Caesar, paramId: 'shift', def: 3, pType: 'number' },
        'Vigenere维吉尼亚': { obj: Vigenere, paramId: 'key', def: 'KEY', pType: 'text' },
        'RailFence栅栏': { obj: RailFence, paramId: 'rails', def: 3, pType: 'number' },
        'Bifid双歧': { obj: Bifid, paramId: 'key', def: 'abc', pType: 'text' },
        'AtBash埃特巴什': { obj: { e: AtBash.e, d: AtBash.e }, pType: 'none' },
        'Morse摩尔斯': { obj: MorseCode, pType: 'none' },
        'PhoneKey九键': { obj: PhoneKeyCipher, pType: 'none' },
        'Bacon培根': { obj: BaconCipher, pType: 'none' },
        'QWE键盘': { obj: QweCipher, pType: 'none' },
        'DNA_mRNA': { obj: DnaCipher, pType: 'none' },
        'VKeyboard': { obj: VKeyboardCipher, pType: 'none' },
        'Cipher01248': { obj: Cipher01248, pType: 'none' },
        'Vowel元音': { obj: VowelCipher, pType: 'none' },
        'Base编码': { obj: baseCipher, paramId: 'type', def: 'base64', pType: 'text' },
        'ROT旋转': { obj: { e: ROTCipher.e, d: ROTCipher.e }, paramId: 'type', def: 'dec', pType: 'text' },
        'CCC中文电码': { obj: CCCHandler, pType: 'none' },
        'MD5': { obj: { e: MD5Cipher.e, d: () => '不可逆' }, pType: 'none' },
        'ColRail柱栅栏': { obj: ColumnarRailCipher, paramId: 'cols', def: 2, pType: 'number' },
        'WRail-W栅栏': { obj: WShapeRailFenceCipher, paramId: 'rails', def: 3, pType: 'number' },
    };

    // === 状态 ===
    let nodes = {};
    let connections = [];
    let nextId = 1;
    let nextConnId = 1;
    let pan = { x: 0, y: 0 };
    let zoom = 1;
    let draggingNode = null;
    let dragOffset = { x: 0, y: 0 };
    let connecting = null; // { nodeId, port:'out' }
    let selectedNode = null;
    let selectedConn = null;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };

    // === DOM refs ===
    const canvas = document.getElementById('wf-canvas');
    const nodesLayer = document.getElementById('wf-nodes-layer');
    const svg = document.getElementById('wf-svg');
    const tempLine = document.getElementById('wf-temp-line');
    const searchInput = document.getElementById('wf-search');
    const ctxMenu = document.getElementById('wf-context-menu');
    if (!canvas) return;

    // Hidden input for sync with cipher/999_funtion.js
    const hiddenInput = document.getElementById('mainInputCoze');

    // === 坐标转换 ===
    function screenToCanvas(sx, sy) {
        const r = canvas.getBoundingClientRect();
        return { x: (sx - r.left - pan.x) / zoom, y: (sy - r.top - pan.y) / zoom };
    }

    // === 获取端口在画布坐标系中的位置 ===
    function getPortPos(nodeId, dir) {
        const n = nodes[nodeId];
        if (!n) return { x: 0, y: 0 };
        const el = document.getElementById('node-' + nodeId);
        if (!el) return { x: n.x, y: n.y };
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const port = el.querySelector(dir === 'out' ? '.port-out' : '.port-in');
        if (!port) return { x: n.x + (dir === 'out' ? w : 0), y: n.y + h / 2 };
        // port position relative to the node element
        const px = port.offsetLeft + port.offsetWidth / 2;
        const py = port.offsetTop + port.offsetHeight / 2;
        return { x: n.x + px, y: n.y + py };
    }

    // === 渲染所有连线 ===
    function renderConnections() {
        svg.querySelectorAll('.wf-connection').forEach(p => p.remove());
        connections.forEach(c => {
            const p1 = getPortPos(c.from, 'out');
            const p2 = getPortPos(c.to, 'in');
            const dx = Math.abs(p2.x - p1.x) * 0.5;
            const d = `M${p1.x},${p1.y} C${p1.x + dx},${p1.y} ${p2.x - dx},${p2.y} ${p2.x},${p2.y}`;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('class', 'wf-connection' + (selectedConn === c.id ? ' selected' : ''));
            path.setAttribute('data-id', c.id);
            path.style.pointerEvents = 'stroke';
            path.addEventListener('click', e => {
                e.stopPropagation();
                selectedConn = c.id;
                selectedNode = null;
                deselectAll();
                renderConnections();
            });
            svg.appendChild(path);
        });
    }

    // === 计算节点数据 (拓扑) ===
    async function propagate() {
        // Build adjacency
        const inMap = {}; // nodeId -> [fromNodeId]
        connections.forEach(c => {
            if (!inMap[c.to]) inMap[c.to] = [];
            inMap[c.to].push(c.from);
        });

        // Topo sort
        const visited = new Set();
        const order = [];
        function visit(id) {
            if (visited.has(id)) return;
            visited.add(id);
            (inMap[id] || []).forEach(visit);
            order.push(id);
        }
        Object.keys(nodes).forEach(visit);

        // Process
        for (const id of order) {
            const n = nodes[id];
            if (!n) continue;
            const resEl = document.querySelector(`#node-${id} .wf-node-result .result`);

            if (n.type === 'input') {
                const ta = document.querySelector(`#node-${id} textarea`);
                n.value = ta ? ta.value : '';
                if (resEl) { resEl.textContent = n.value || '等待输入...'; resEl.className = 'result' + (n.value ? '' : ' waiting'); }
                // sync hidden input
                if (hiddenInput && ta) hiddenInput.value = ta.value;
            } else if (n.type === 'cipher') {
                const sources = (inMap[id] || []).map(fid => nodes[fid]?.value).filter(v => v !== undefined);
                const input = sources.join('');
                if (!input) {
                    n.value = '';
                    if (resEl) { resEl.textContent = '无输入连接'; resEl.className = 'result waiting'; }
                    continue;
                }
                try {
                    const cfg = cipherMap[n.algorithm];
                    if (!cfg) { n.value = input; if (resEl) { resEl.textContent = input; resEl.className = 'result'; } continue; }
                    let p = n.param || cfg.def || '';
                    if (cfg.pType === 'number') p = parseInt(p) || cfg.def;
                    n.value = await cfg.obj[n.mode](input, p);
                    if (resEl) { resEl.textContent = n.value; resEl.className = 'result'; }
                } catch (e) {
                    n.value = '';
                    if (resEl) { resEl.textContent = '错误: ' + e.message; resEl.className = 'result error'; }
                }
            } else if (n.type === 'output') {
                const sources = (inMap[id] || []).map(fid => nodes[fid]?.value).filter(v => v !== undefined);
                n.value = sources.join('\n---\n');
                if (resEl) { resEl.textContent = n.value || '无输入连接'; resEl.className = 'result' + (n.value ? '' : ' waiting'); }
            }
        }
    }

    // === 创建节点 DOM ===
    function createNodeEl(n) {
        const el = document.createElement('div');
        el.className = 'wf-node';
        el.id = 'node-' + n.id;
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';

        const dotClass = n.type === 'input' ? 'input' : n.type === 'output' ? 'output' : 'cipher';
        const titleMap = { input: '📝 输入', output: '📤 输出', cipher: '🔐 ' + (n.algorithm || '') };

        let bodyHTML = '';
        if (n.type === 'input') {
            bodyHTML = `<div class="wf-node-body"><textarea placeholder="输入文本..." rows="2">${n.value || ''}</textarea></div>`;
        } else if (n.type === 'cipher') {
            const cfg = cipherMap[n.algorithm] || {};
            const paramHTML = cfg.pType && cfg.pType !== 'none'
                ? `<div class="wf-node-row"><label>参数</label><input type="${cfg.pType === 'number' ? 'number' : 'text'}" value="${n.param ?? cfg.def ?? ''}" class="wf-cipher-param" placeholder="参数"></div>`
                : '';
            bodyHTML = `<div class="wf-node-body">
                <div class="wf-node-row"><select class="wf-cipher-mode"><option value="e"${n.mode === 'e' ? ' selected' : ''}>加密</option><option value="d"${n.mode === 'd' ? ' selected' : ''}>解密</option></select></div>
                ${paramHTML}
            </div>`;
        }

        const hasIn = n.type !== 'input';
        const hasOut = n.type !== 'output';

        el.innerHTML = `
            ${hasIn ? '<div class="wf-port port-in" data-node="' + n.id + '" data-dir="in"></div>' : ''}
            ${hasOut ? '<div class="wf-port port-out" data-node="' + n.id + '" data-dir="out"></div>' : ''}
            <div class="wf-node-header">
                <span class="wf-node-title"><span class="wf-node-type-dot ${dotClass}"></span>${titleMap[n.type]}</span>
                <button class="wf-node-delete" data-node="${n.id}">✕</button>
            </div>
            ${bodyHTML}
            <div class="wf-node-result"><div class="result waiting">等待...</div></div>
        `;

        // Node drag
        el.addEventListener('mousedown', e => {
            if (e.target.closest('.wf-port') || e.target.closest('textarea') || e.target.closest('input') || e.target.closest('select') || e.target.closest('.wf-node-delete')) return;
            e.stopPropagation();
            draggingNode = n.id;
            const cp = screenToCanvas(e.clientX, e.clientY);
            dragOffset = { x: cp.x - n.x, y: cp.y - n.y };
            el.classList.add('dragging');
            selectNode(n.id);
        });

        // Delete
        el.querySelector('.wf-node-delete').addEventListener('click', e => {
            e.stopPropagation();
            deleteNode(n.id);
        });

        // Port: start connection
        el.querySelectorAll('.wf-port').forEach(port => {
            port.addEventListener('mousedown', e => {
                e.stopPropagation();
                e.preventDefault();
                const dir = port.dataset.dir;
                if (dir === 'out') {
                    connecting = { nodeId: n.id };
                    canvas.classList.add('connecting');
                } else if (dir === 'in') {
                    // Allow dragging from input port too — reverse
                    connecting = { nodeId: n.id, reverse: true };
                    canvas.classList.add('connecting');
                }
            });
            port.addEventListener('mouseup', e => {
                e.stopPropagation();
                if (!connecting) return;
                const dir = port.dataset.dir;
                if (connecting.reverse && dir === 'out') {
                    addConnection(n.id, connecting.nodeId);
                } else if (!connecting.reverse && dir === 'in') {
                    addConnection(connecting.nodeId, n.id);
                }
                connecting = null;
                canvas.classList.remove('connecting');
                tempLine.setAttribute('d', '');
            });
        });

        // Input changes
        const ta = el.querySelector('textarea');
        if (ta) ta.addEventListener('input', () => { n.value = ta.value; propagate(); });

        const modeSelect = el.querySelector('.wf-cipher-mode');
        if (modeSelect) modeSelect.addEventListener('change', () => { n.mode = modeSelect.value; propagate(); });

        const paramInput = el.querySelector('.wf-cipher-param');
        if (paramInput) paramInput.addEventListener('input', () => { n.param = paramInput.value; propagate(); });

        return el;
    }

    // === 添加节点 ===
    function addNode(type, x, y, algorithm) {
        const id = nextId++;
        const n = { id, type, x, y, value: '', algorithm: algorithm || '', mode: 'e', param: '' };
        if (type === 'cipher' && algorithm && cipherMap[algorithm]) {
            n.param = cipherMap[algorithm].def ?? '';
        }
        nodes[id] = n;
        const el = createNodeEl(n);
        nodesLayer.appendChild(el);
        propagate();
        renderConnections();
        return id;
    }

    // === 删除节点 ===
    function deleteNode(id) {
        connections = connections.filter(c => c.from !== id && c.to !== id);
        delete nodes[id];
        const el = document.getElementById('node-' + id);
        if (el) el.remove();
        if (selectedNode === id) selectedNode = null;
        renderConnections();
        propagate();
    }

    // === 添加连线 ===
    function addConnection(fromId, toId) {
        if (fromId === toId) return;
        if (connections.some(c => c.from === fromId && c.to === toId)) return;
        // Prevent connecting to input or from output type-wise
        if (nodes[fromId]?.type === 'output' || nodes[toId]?.type === 'input') return;
        const id = nextConnId++;
        connections.push({ id, from: fromId, to: toId });
        renderConnections();
        updatePortStyles();
        propagate();
    }

    // === 删除连线 ===
    function deleteConnection(id) {
        connections = connections.filter(c => c.id !== id);
        selectedConn = null;
        renderConnections();
        updatePortStyles();
        propagate();
    }

    // === 选择 ===
    function selectNode(id) {
        selectedNode = id;
        selectedConn = null;
        deselectAll();
        const el = document.getElementById('node-' + id);
        if (el) el.classList.add('selected');
    }

    function deselectAll() {
        document.querySelectorAll('.wf-node.selected').forEach(e => e.classList.remove('selected'));
    }

    // === 端口连接状态 ===
    function updatePortStyles() {
        document.querySelectorAll('.wf-port').forEach(p => p.classList.remove('connected'));
        connections.forEach(c => {
            const fromP = document.querySelector(`#node-${c.from} .port-out`);
            const toP = document.querySelector(`#node-${c.to} .port-in`);
            if (fromP) fromP.classList.add('connected');
            if (toP) toP.classList.add('connected');
        });
    }

    // === 变换更新 ===
    function applyTransform() {
        nodesLayer.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
        svg.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
        renderConnections();
    }

    // === 画布事件 ===
    canvas.addEventListener('mousedown', e => {
        if (e.target === canvas || e.target.classList.contains('wf-grid')) {
            isPanning = true;
            panStart = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            deselectAll();
            selectedNode = null;
            selectedConn = null;
            renderConnections();
        }
    });

    canvas.addEventListener('mousemove', e => {
        if (isPanning) {
            pan.x = e.clientX - panStart.x;
            pan.y = e.clientY - panStart.y;
            applyTransform();
        }
        if (draggingNode) {
            const cp = screenToCanvas(e.clientX, e.clientY);
            const n = nodes[draggingNode];
            n.x = cp.x - dragOffset.x;
            n.y = cp.y - dragOffset.y;
            const el = document.getElementById('node-' + draggingNode);
            el.style.left = n.x + 'px';
            el.style.top = n.y + 'px';
            renderConnections();
        }
        if (connecting) {
            const mp = screenToCanvas(e.clientX, e.clientY);
            const portDir = connecting.reverse ? 'in' : 'out';
            const pp = getPortPos(connecting.nodeId, portDir);
            const x1 = connecting.reverse ? mp.x : pp.x;
            const y1 = connecting.reverse ? mp.y : pp.y;
            const x2 = connecting.reverse ? pp.x : mp.x;
            const y2 = connecting.reverse ? pp.y : mp.y;
            const dx = Math.abs(x2 - x1) * 0.4;
            tempLine.setAttribute('d', `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
        }
    });

    canvas.addEventListener('mouseup', e => {
        if (draggingNode) {
            const el = document.getElementById('node-' + draggingNode);
            if (el) el.classList.remove('dragging');
            draggingNode = null;
        }
        isPanning = false;
        if (connecting) {
            connecting = null;
            canvas.classList.remove('connecting');
            tempLine.setAttribute('d', '');
        }
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const oldZ = zoom;
        zoom *= e.deltaY < 0 ? 1.1 : 0.9;
        zoom = Math.max(0.3, Math.min(3, zoom));
        const cr = canvas.getBoundingClientRect();
        const mx = e.clientX - cr.left;
        const my = e.clientY - cr.top;
        pan.x = mx - (mx - pan.x) * (zoom / oldZ);
        pan.y = my - (my - pan.y) * (zoom / oldZ);
        applyTransform();
    }, { passive: false });

    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (selectedConn) deleteConnection(selectedConn);
            else if (selectedNode) deleteNode(selectedNode);
        }
    });

    // Right-click context menu
    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        const cp = screenToCanvas(e.clientX, e.clientY);
        showContextMenu(e.clientX, e.clientY, cp.x, cp.y);
    });

    function showContextMenu(sx, sy, cx, cy) {
        ctxMenu.innerHTML = '';
        const items = [
            { label: '📝 添加输入节点', action: () => addNode('input', cx, cy) },
            { label: '📤 添加输出节点', action: () => addNode('output', cx, cy) },
            { sep: true },
        ];
        // Top 8 ciphers for quick add
        const quickCiphers = Object.keys(cipherMap).slice(0, 8);
        quickCiphers.forEach(name => {
            items.push({ label: '🔐 ' + name, action: () => addNode('cipher', cx, cy, name) });
        });
        items.push({ sep: true });
        items.push({ label: '🗑 清空画布', action: clearCanvas, cls: 'danger' });

        items.forEach(it => {
            if (it.sep) {
                const sep = document.createElement('div');
                sep.className = 'wf-context-menu-separator';
                ctxMenu.appendChild(sep);
            } else {
                const div = document.createElement('div');
                div.className = 'wf-context-menu-item' + (it.cls ? ' ' + it.cls : '');
                div.textContent = it.label;
                div.addEventListener('click', () => { it.action(); hideContextMenu(); });
                ctxMenu.appendChild(div);
            }
        });
        ctxMenu.style.left = sx + 'px';
        ctxMenu.style.top = sy + 'px';
        ctxMenu.classList.add('active');
    }

    function hideContextMenu() { ctxMenu.classList.remove('active'); }
    document.addEventListener('click', hideContextMenu);

    function clearCanvas() {
        Object.keys(nodes).forEach(id => {
            const el = document.getElementById('node-' + id);
            if (el) el.remove();
        });
        nodes = {};
        connections = [];
        selectedNode = null;
        selectedConn = null;
        renderConnections();
    }

    // === 搜索过滤工具栏 ===
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            document.querySelectorAll('.wf-toolbar-item').forEach(el => {
                const name = el.dataset.algo || el.dataset.type || '';
                el.classList.toggle('hidden', q && !name.toLowerCase().includes(q));
            });
        });
    }

    // === 工具栏拖拽到画布添加 ===
    let toolbarDrag = null; // { el, ghost, type, algo }

    document.querySelectorAll('.wf-toolbar-item').forEach(el => {
        el.addEventListener('mousedown', e => {
            e.preventDefault();
            const type = el.dataset.type || 'cipher';
            const algo = el.dataset.algo || '';
            // 创建拖拽幽灵
            const ghost = document.createElement('div');
            ghost.className = 'wf-drag-ghost';
            ghost.textContent = el.textContent.trim();
            ghost.style.left = e.clientX + 'px';
            ghost.style.top = e.clientY + 'px';
            document.body.appendChild(ghost);
            toolbarDrag = { el, ghost, type, algo };
        });
    });

    document.addEventListener('mousemove', e => {
        if (toolbarDrag) {
            toolbarDrag.ghost.style.left = e.clientX + 'px';
            toolbarDrag.ghost.style.top = e.clientY + 'px';
        }
    });

    document.addEventListener('mouseup', e => {
        if (toolbarDrag) {
            toolbarDrag.ghost.remove();
            // 检查是否在画布区域内释放
            const cr = canvas.getBoundingClientRect();
            if (e.clientX >= cr.left && e.clientX <= cr.right &&
                e.clientY >= cr.top && e.clientY <= cr.bottom) {
                const cp = screenToCanvas(e.clientX, e.clientY);
                if (toolbarDrag.type === 'input' || toolbarDrag.type === 'output') {
                    addNode(toolbarDrag.type, cp.x - 100, cp.y - 40);
                } else {
                    addNode('cipher', cp.x - 100, cp.y - 40, toolbarDrag.algo);
                }
            }
            toolbarDrag = null;
        }
    });

    // === 绘制网格 ===
    function drawGrid() {
        const gridCanvas = document.getElementById('wf-grid-canvas');
        if (!gridCanvas) return;
        const ctx = gridCanvas.getContext('2d');
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        gridCanvas.width = w;
        gridCanvas.height = h;
        ctx.clearRect(0, 0, w, h);
        const step = 30 * zoom;
        const ox = pan.x % step;
        const oy = pan.y % step;
        ctx.strokeStyle = 'rgba(64, 224, 255, 0.06)';
        ctx.lineWidth = 1;
        for (let x = ox; x < w; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = oy; y < h; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    }

    // Redraw grid on transform
    const origApply = applyTransform;
    const applyWithGrid = () => { origApply(); drawGrid(); };
    // Replace
    canvas.addEventListener('mousemove', drawGrid);
    window.addEventListener('resize', () => { drawGrid(); renderConnections(); });

    // Clear button
    document.getElementById('wf-clear-btn')?.addEventListener('click', clearCanvas);

    // === 初始化默认示例 ===
    const inId = addNode('input', 80, 150);
    const cId = addNode('cipher', 380, 120, 'Caesar凯撒');
    const outId = addNode('output', 680, 150);
    addConnection(inId, cId);
    addConnection(cId, outId);
    drawGrid();
    applyTransform();
}