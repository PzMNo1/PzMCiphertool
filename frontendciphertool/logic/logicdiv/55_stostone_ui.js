(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('stostone-workspace', 'stostone-layout',
        window.LogicUI.backButton('stostone-workspace') +
        window.LogicUI.title('STOSTONE', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('sto-rows', 'sto-cols', { rowVal: 6, colVal: 6, rowMin: 4, colMin: 4, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initStostoneGrid && window.initStostoneGrid()' },
            { label: '计算核心分析', onclick: 'window.solveStostonePuzzleUI && window.solveStostonePuzzleUI()', id: 'sto-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearStostoneGrid && window.clearStostoneGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleStostoneExample && window.buildSimpleStostoneExample()' }
        ]) +
        `<div style="margin-bottom:1.5rem;display:flex;gap:10px"><button class="cyber-button" style="flex:1" id="sto-mode-btn" onclick="window.toggleStostoneMode && window.toggleStostoneMode()"><span class="cyber-button__tag">模式: 调整边界</span></button></div>` +
        window.LogicUI.statsPanel('sto', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('sto', 'showStostoneSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '边界模式: 点击/拖拽网格线绘制房间边界',
            '数字模式: 点击格子输入该房间石头数线索',
            '行数必须为偶数；每列恰好 R/2 个石头',
            '房间内石头连通，跨房间不相邻',
            '所有石头满足重力刚体下落约束'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="sto-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;user-select:none"></div>`,
        `#sto-grid-container{gap:0}
        .sto-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
        .sto-cell:hover{background:rgba(0,255,231,.08)}
        .sto-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .sto-cell.shaded{background:rgba(64,224,255,.35);box-shadow:inset 0 0 8px rgba(0,229,255,.3)}
        .sto-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}
        .sto-cell.bt{border-top:3px solid var(--neon-cyan)}.sto-cell.bb{border-bottom:3px solid var(--neon-cyan)}.sto-cell.bl{border-left:3px solid var(--neon-cyan)}.sto-cell.br{border-right:3px solid var(--neon-cyan)}
        .sto-cell input.ki{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.95rem;font-weight:700;outline:0;padding:0;margin:0}
        .sto-line{position:absolute;z-index:50;cursor:pointer;transition:background .15s}
        .sto-line.h-line{height:7px;background:rgba(255,255,255,.08)}
        .sto-line.v-line{width:7px;background:rgba(255,255,255,.08)}
        .sto-line:hover,.sto-line.drag-hover{background:#00ffe7!important;box-shadow:0 0 6px #00ffe7!important}
        .sto-line.active{background:#00ffe7!important;box-shadow:0 0 5px #00ffe7,0 0 2px #00ffe7 inset!important}`
    ));

    const $ = id => document.getElementById(id);
    let R = 6, C = 6, clues = {}, hB = [], vB = [], mode = 'edit', sols = [], si = 0, showing = false, dragging = false, dragVal = true;
    const reset = () => { sols = []; si = 0; showing = false; };
    const stats = (c, t) => { const a = $('sto-solutionsCount'), b = $('sto-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('sto-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const readSize = () => {
        const ri = $('sto-rows'), ci = $('sto-cols');
        if (ri && ci) { R = Math.max(4, Math.min(12, +ri.value || 6)); C = Math.max(4, Math.min(12, +ci.value || 6)); if (R & 1) R = Math.min(R + 1, 12); ri.value = R; ci.value = C; }
    };
    const mkB = () => { hB = Array.from({ length: R }, () => Array(C).fill(false)); vB = Array.from({ length: R }, () => Array(C).fill(false)); };

    function borders(cell, r, c) {
        cell.classList.remove('bt', 'bb', 'bl', 'br');
        if (r === 0 || (r > 0 && hB[r - 1][c])) cell.classList.add('bt');
        if (r === R - 1 || (r < R - 1 && hB[r][c])) cell.classList.add('bb');
        if (c === 0 || (c > 0 && vB[r][c - 1])) cell.classList.add('bl');
        if (c === C - 1 || (c < C - 1 && vB[r][c])) cell.classList.add('br');
    }

    function buildRooms() {
        const vis = Array.from({ length: R }, () => Array(C).fill(false)), rooms = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            if (vis[r][c]) continue;
            const room = [], q = [[r, c]]; vis[r][c] = true;
            while (q.length) {
                const [cr, cc] = q.pop(); room.push(cr * C + cc);
                [[cr - 1, cc, cr - 1, cc, 'h'], [cr + 1, cc, cr, cc, 'h'], [cr, cc - 1, cr, cc - 1, 'v'], [cr, cc + 1, cr, cc, 'v']].forEach(([nr, nc, br, bc, t]) => {
                    if (nr < 0 || nr >= R || nc < 0 || nc >= C || vis[nr][nc]) return;
                    if (t === 'h' && hB[br][bc]) return; if (t === 'v' && vB[br][bc]) return;
                    vis[nr][nc] = true; q.push([nr, nc]);
                });
            }
            rooms.push(room);
        }
        return rooms;
    }

    function render() {
        const g = $('sto-grid-container'); if (!g) return; g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},42px)`; g.style.gridTemplateRows = `repeat(${R},42px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'), k = r + ',' + c;
            cell.className = 'sto-cell'; cell.dataset.r = r; cell.dataset.c = c;
            borders(cell, r, c);
            if (k in clues) { cell.classList.add('clue'); cell.textContent = clues[k]; }
            cell.onclick = () => {
                if (mode !== 'number' || showing) return;
                cell.classList.add('editing');
                const inp = document.createElement('input');
                inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'ki'; inp.maxLength = 2;
                if (k in clues) inp.value = clues[k];
                cell.textContent = ''; cell.appendChild(inp); inp.focus();
                const commit = () => { const n = parseInt(inp.value); if (n > 0) clues[k] = n; else delete clues[k]; cell.classList.remove('editing'); render(); };
                inp.addEventListener('blur', commit, { once: true });
                inp.onkeydown = ev => { if (ev.key === 'Enter') inp.blur(); else if (ev.key === 'Escape') { inp.value = ''; inp.blur(); } };
            };
            g.appendChild(cell);
        }
        if (mode === 'edit') drawLines(g);
        if (showing && sols[si]) g.querySelectorAll('.sto-cell').forEach(cell => { if (sols[si][+cell.dataset.r][+cell.dataset.c]) cell.classList.add('shaded'); });
    }

    function drawLines(g) {
        const cs = 42, pad = 10;
        const mk = (type, r, c, css) => {
            const ln = document.createElement('div'); ln.className = `sto-line ${type}-line`;
            if ((type === 'h' ? hB : vB)[r][c]) ln.classList.add('active');
            ln.style.cssText = css;
            ln.onmousedown = e => { e.preventDefault(); e.stopPropagation(); const a = type === 'h' ? hB : vB; a[r][c] = !a[r][c]; dragging = true; dragVal = a[r][c]; ln.classList.toggle('active', a[r][c]); updB(); };
            ln.onmouseenter = () => { if (!dragging) return; (type === 'h' ? hB : vB)[r][c] = dragVal; ln.classList.toggle('active', dragVal); updB(); };
            g.appendChild(ln);
        };
        for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) mk('h', r, c, `left:${pad + c * cs}px;top:${pad + (r + 1) * cs - 3}px;width:${cs}px`);
        for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) mk('v', r, c, `left:${pad + (c + 1) * cs - 3}px;top:${pad + r * cs}px;height:${cs}px`);
    }

    function updB() { const g = $('sto-grid-container'); if (g) g.querySelectorAll('.sto-cell').forEach(cell => borders(cell, +cell.dataset.r, +cell.dataset.c)); }
    document.addEventListener('mouseup', () => { dragging = false; });

    window.toggleStostoneMode = () => { mode = mode === 'edit' ? 'number' : 'edit'; const b = $('sto-mode-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = mode === 'edit' ? '模式: 调整边界' : '模式: 输入数字'; render(); };
    window.initStostoneGrid = () => { readSize(); reset(); clues = {}; mkB(); mode = 'edit'; const b = $('sto-mode-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = '模式: 调整边界'; render(); stats('-', '-'); nav(false); };
    window.clearStostoneGrid = () => { reset(); clues = {}; render(); stats('-', '-'); nav(false); };

    window.buildSimpleStostoneExample = () => {
        R = 6; C = 6; const ri = $('sto-rows'), ci = $('sto-cols'); if (ri) ri.value = 6; if (ci) ci.value = 6;
        reset(); clues = {}; mode = 'edit'; mkB();
        for (let c = 0; c < 6; c++) hB[2][c] = true;
        for (let r = 0; r < 6; r++) vB[r][2] = true;
        clues['0,0'] = 3; clues['0,3'] = 3;
        render(); stats('-', '-'); nav(false);
    };

    window.solveStostonePuzzleUI = () => {
        if (!window.solveStostone) return stats('模块未加载', '-');
        if (R & 1) return stats('行数必须为偶数', '-');
        const rooms = buildRooms();
        if (!rooms.length) return stats('请先绘制房间', '-');
        const cm = {}; for (const k in clues) { const [r, c] = k.split(',').map(Number); cm[r * C + c] = clues[k]; }
        const t0 = performance.now(), res = window.solveStostone({ rows: R, cols: C, rooms, clues: cm }), ms = Math.round(performance.now() - t0) + 'ms';
        sols = res.solutions || [];
        stats(res.timeout ? sols.length + '+ (超时)' : (sols.length || '未找到解'), ms);
        if (sols.length) { showing = true; si = 0; nav(true); window.showStostoneSolution(0); }
    };

    window.showStostoneSolution = delta => {
        if (!sols.length) return;
        si = (si + delta + sols.length) % sols.length;
        const ctr = $('sto-solution-counter'); if (ctr) ctr.textContent = (si + 1) + ' / ' + sols.length;
        render();
    };
})();
