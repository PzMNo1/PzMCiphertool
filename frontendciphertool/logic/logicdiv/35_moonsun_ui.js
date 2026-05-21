(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('moonsun-workspace', 'moonsun-layout',
        window.LogicUI.backButton('moonsun-workspace') +
        window.LogicUI.title('MOONSUN', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('msu-rows', 'msu-cols', { rowVal: 5, colVal: 5, rowMin: 4, colMin: 4, rowMax: 10, colMax: 10 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initMSUGrid && window.initMSUGrid()' },
            { label: '计算核心分析', onclick: 'window.solveMSUPuzzleUI && window.solveMSUPuzzleUI()', id: 'msu-solve-btn', glow: true },
            { label: '清空回路', onclick: 'window.clearMSUGrid && window.clearMSUGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleMSUExample && window.buildSimpleMSUExample()' }
        ]) +
        window.LogicUI.statsPanel('msu', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('msu', 'showMSUSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '拖拽/点击边缘细条: 划分区域边界',
            '左键点击格子: 循环 无 → ☽月亮 → ☀太阳',
            '每个区域: 回路经过所有月亮或所有太阳(二选一)',
            '回路不交叉、不分叉、穿过每个区域'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="msu-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block;"></div>`,
        `.msu-wrap{position:relative;display:inline-block}
        .msu-grid{display:inline-grid;gap:0}
        .msu-cell{width:40px;height:40px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);position:relative;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2rem;user-select:none}
        .msu-cell:hover{background:rgba(0,255,231,.08)}
        .msu-cell.br-right{border-right:3px solid #00ffe7!important}
        .msu-cell.br-bottom{border-bottom:3px solid #00ffe7!important}
        .msu-cell.br-outer-t{border-top:3px solid #00ffe7!important}
        .msu-cell.br-outer-l{border-left:3px solid #00ffe7!important}
        .msu-cell.br-outer-r{border-right:3px solid #00ffe7!important}
        .msu-cell.br-outer-b{border-bottom:3px solid #00ffe7!important}
        .msu-handle{position:absolute;z-index:5;opacity:0;transition:opacity .15s}
        .msu-handle:hover{opacity:1!important;background:rgba(0,255,231,.3)}
        .msu-cell:hover .msu-handle{opacity:.3}
        .msu-handle.v{right:-4px;top:2px;width:8px;height:calc(100% - 4px);cursor:col-resize}
        .msu-handle.h{bottom:-4px;left:2px;height:8px;width:calc(100% - 4px);cursor:row-resize}
        .msu-sym{pointer-events:none;z-index:2;text-shadow:0 0 6px currentColor}
        .msu-sym.moon{color:#c0c0ff}
        .msu-sym.sun{color:#ffe066}
        .msu-edge{position:absolute;z-index:3;cursor:pointer;border-radius:2px}
        .msu-edge.h{height:12px;margin-top:-4px;background:transparent}
        .msu-edge.v{width:12px;margin-left:-4px;background:transparent}
        .msu-edge::after{content:'';position:absolute;border-radius:2px}
        .msu-edge.h::after{left:0;top:4px;width:100%;height:4px;background:rgba(255,255,255,.06)}
        .msu-edge.v::after{top:0;left:4px;width:4px;height:100%;background:rgba(255,255,255,.06)}
        .msu-edge:hover::after{background:rgba(0,255,231,.25)!important}
        .msu-edge.on::after{background:#00ffe7!important;box-shadow:0 0 6px rgba(0,255,231,.5)}`
    ));

    const $ = id => document.getElementById(id), S = 40;
    let R = 5, C = 5, hB = [], vB = [], symbols = {};
    let hEdges = [], vEdges = [];
    let solutions = [], solIdx = 0, showing = false;
    let dragging = false, dragType = null, dragVal = false;
    let eDragging = false, eDragVal = false;
    document.addEventListener('mouseup', () => { dragging = false; dragType = null; eDragging = false; });
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('msu-solutionsCount'), b = $('msu-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('msu-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('msu-rows'), ci = $('msu-cols'); if (ri && ci) { R = Math.max(4, Math.min(10, +ri.value || 5)); C = Math.max(4, Math.min(10, +ci.value || 5)); ri.value = R; ci.value = C; } };
    const initArrays = () => { hB = Array.from({length:R},()=>new Array(C).fill(false)); vB = Array.from({length:R},()=>new Array(C).fill(false)); hEdges = Array.from({length:R},()=>new Array(C-1).fill(false)); vEdges = Array.from({length:R-1},()=>new Array(C).fill(false)); };

    function addHandle(el, dir, r, c) {
        const h = document.createElement('div'); h.className = 'msu-handle ' + dir;
        const arr = dir === 'v' ? vB : hB;
        h.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); dragging = true; dragType = dir; dragVal = !arr[r][c]; arr[r][c] = dragVal; paintBorders(); });
        h.addEventListener('mouseenter', () => { if (dragging && dragType === dir) { arr[r][c] = dragVal; paintBorders(); } });
        el.appendChild(h);
    }

    function render() {
        const ct = $('msu-grid-container'); if (!ct) return;
        ct.innerHTML = '';
        const wrap = document.createElement('div'); wrap.className = 'msu-wrap';
        wrap.style.width = C * S + 'px'; wrap.style.height = R * S + 'px';
        const g = document.createElement('div'); g.className = 'msu-grid';
        g.style.gridTemplateColumns = `repeat(${C},${S}px)`;
        g.style.gridTemplateRows = `repeat(${R},${S}px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.className = 'msu-cell';
            cell.dataset.r = r; cell.dataset.c = c;
            if (r === 0) cell.classList.add('br-outer-t');
            if (c === 0) cell.classList.add('br-outer-l');
            if (r === R - 1) cell.classList.add('br-outer-b');
            if (c === C - 1) cell.classList.add('br-outer-r');
            if (c < C - 1 && vB[r][c]) cell.classList.add('br-right');
            if (r < R - 1 && hB[r][c]) cell.classList.add('br-bottom');
            const k = r + ',' + c;
            if (k in symbols) {
                const sp = document.createElement('span'); sp.className = 'msu-sym ' + symbols[k];
                sp.textContent = symbols[k] === 'moon' ? '☽' : '☀';
                cell.appendChild(sp);
            }
            if (!showing) {
                cell.addEventListener('click', () => {
                    if (!(k in symbols)) symbols[k] = 'moon';
                    else if (symbols[k] === 'moon') symbols[k] = 'sun';
                    else delete symbols[k];
                    render();
                });
                if (c < C - 1) addHandle(cell, 'v', r, c);
                if (r < R - 1) addHandle(cell, 'h', r, c);
            }
            g.appendChild(cell);
        }
        wrap.appendChild(g);
        // edges
        const sol = showing && solutions.length ? solutions[solIdx] : null;
        function mkEdge(type, r, c, isOn) {
            const e = document.createElement('div'); e.className = 'msu-edge ' + type;
            if (isOn) e.classList.add('on');
            if (!showing) {
                const arr = type === 'h' ? hEdges : vEdges;
                e.addEventListener('mousedown', ev => { ev.preventDefault(); eDragging = true; eDragVal = !arr[r][c]; arr[r][c] = eDragVal; e.classList.toggle('on', eDragVal); });
                e.addEventListener('mouseenter', () => { if (eDragging) { arr[r][c] = eDragVal; e.classList.toggle('on', eDragVal); } });
            }
            return e;
        }
        for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) {
            const e = mkEdge('h', r, c, sol ? sol.h[r][c] : hEdges[r][c]);
            e.style.left = (c * S + S / 2) + 'px'; e.style.top = (r * S + S / 2 - 2) + 'px'; e.style.width = S + 'px';
            wrap.appendChild(e);
        }
        for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) {
            const e = mkEdge('v', r, c, sol ? sol.v[r][c] : vEdges[r]?.[c]);
            e.style.left = (c * S + S / 2 - 2) + 'px'; e.style.top = (r * S + S / 2) + 'px'; e.style.height = S + 'px';
            wrap.appendChild(e);
        }
        ct.appendChild(wrap);
    }

    function paintBorders() {
        const ct = $('msu-grid-container'); if (!ct) return;
        ct.querySelectorAll('.msu-cell').forEach(el => {
            const r = +el.dataset.r, c = +el.dataset.c;
            el.classList.toggle('br-right', c < C - 1 && vB[r][c]);
            el.classList.toggle('br-bottom', r < R - 1 && hB[r][c]);
        });
    }

    window.initMSUGrid = () => { readSize(); reset(); symbols = {}; initArrays(); render(); stats('-', '-'); nav(false); };
    window.clearMSUGrid = () => { reset(); hEdges = Array.from({length:R},()=>new Array(C-1).fill(false)); vEdges = Array.from({length:R-1},()=>new Array(C).fill(false)); render(); stats('-', '-'); nav(false); };
    window.buildSimpleMSUExample = () => {
        R = 4; C = 4; const ri = $('msu-rows'), ci = $('msu-cols'); if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); initArrays(); symbols = {};
        // 2 regions: top 2 rows, bottom 2 rows
        for (let c = 0; c < C; c++) hB[1][c] = true;
        // symbols: top region has moon(0,0) sun(0,2), bottom has sun(2,1) moon(3,3)
        symbols = { '0,0': 'moon', '0,2': 'sun', '2,1': 'sun', '3,3': 'moon' };
        render(); stats('-', '-'); nav(false);
    };

    window.solveMSUPuzzleUI = () => {
        if (!window.solveMoonsun) return stats('模块未加载', '-');
        const t0 = performance.now();
        const res = window.solveMoonsun({ rows: R, cols: C, hBorders: hB, vBorders: vB, symbols });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showMSUSolution(0); }
    };
    window.showMSUSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('msu-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
