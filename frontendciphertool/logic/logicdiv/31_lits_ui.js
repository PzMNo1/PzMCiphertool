(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('lits-workspace', 'lits-layout',
        window.LogicUI.backButton('lits-workspace') +
        window.LogicUI.title('LITS', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('lits-rows', 'lits-cols', { rowVal: 6, colVal: 6, rowMin: 4, colMin: 4, rowMax: 15, colMax: 15 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initLITSGrid && window.initLITSGrid()' },
            { label: '计算核心分析', onclick: 'window.solveLITSPuzzleUI && window.solveLITSPuzzleUI()', id: 'lits-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearLITSGrid && window.clearLITSGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleLITSExample && window.buildSimpleLITSExample()' }
        ]) +
        window.LogicUI.statsPanel('lits', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('lits', 'showLITSSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击或拖动格子边缘: 添加/移除区域分割线',
            '右键点击格子: 循环 涂黑 → 标白 → 无标记',
            '每个区域放一个 L/I/T/S 四连骨牌',
            '所有涂色格连通，无 2×2，同形状不正交相邻'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="lits-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;"></div>`,
        `#lits-grid-container{gap:0}
        .lt-cell{width:38px;height:38px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);position:relative;cursor:pointer}
        .lt-cell:hover{background:rgba(0,255,231,.08)}
        .lt-cell.shaded{background:rgba(0,255,231,.35);box-shadow:inset 0 0 8px rgba(0,255,231,.2)}
        .lt-cell.empty-mark{background:rgba(255,255,255,.02)}
        .lt-cell.sol-shade{background:rgba(0,255,231,.4);box-shadow:inset 0 0 10px rgba(0,255,231,.3)}
        .lt-cell.br-right{border-right:3px solid #00ffe7!important}
        .lt-cell.br-bottom{border-bottom:3px solid #00ffe7!important}
        .lt-cell.br-outer-t{border-top:3px solid #00ffe7!important}
        .lt-cell.br-outer-l{border-left:3px solid #00ffe7!important}
        .lt-cell.br-outer-r{border-right:3px solid #00ffe7!important}
        .lt-cell.br-outer-b{border-bottom:3px solid #00ffe7!important}
        .lt-handle{position:absolute;z-index:5;opacity:0;transition:opacity .15s}
        .lt-handle:hover{opacity:1!important;background:rgba(0,255,231,.3)}
        .lt-cell:hover .lt-handle{opacity:.3}
        .lt-handle.v{right:-4px;top:2px;width:8px;height:calc(100% - 4px);cursor:col-resize}
        .lt-handle.h{bottom:-4px;left:2px;height:8px;width:calc(100% - 4px);cursor:row-resize}`
    ));

    const $ = id => document.getElementById(id);
    let R = 6, C = 6, hB = [], vB = [], marks = [];
    let solutions = [], solIdx = 0, showing = false;
    let dragType = null, dragVal = false, dragging = false;
    document.addEventListener('mouseup', () => { dragging = false; dragType = null; });

    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('lits-solutionsCount'), b = $('lits-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('lits-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const mkArr = v => Array.from({ length: R }, () => new Array(C).fill(v));
    const readSize = () => { const ri = $('lits-rows'), ci = $('lits-cols'); if (ri && ci) { R = Math.max(4, Math.min(15, +ri.value || 6)); C = Math.max(4, Math.min(15, +ci.value || 6)); ri.value = R; ci.value = C; } };

    function addHandle(el, dir, r, c) {
        const h = document.createElement('div'); h.className = 'lt-handle ' + dir;
        const arr = dir === 'v' ? vB : hB;
        h.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); dragging = true; dragType = dir; dragVal = !arr[r][c]; arr[r][c] = dragVal; paintBorders(); });
        h.addEventListener('mouseenter', () => { if (dragging && dragType === dir) { arr[r][c] = dragVal; paintBorders(); } });
        el.appendChild(h);
    }

    function paint(el, r, c) {
        el.innerHTML = ''; el.className = 'lt-cell';
        if (r === 0) el.classList.add('br-outer-t');
        if (c === 0) el.classList.add('br-outer-l');
        if (r === R-1) el.classList.add('br-outer-b');
        if (c === C-1) el.classList.add('br-outer-r');
        if (c < C-1 && vB[r][c]) el.classList.add('br-right');
        if (r < R-1 && hB[r][c]) el.classList.add('br-bottom');
        if (showing && solutions.length) { if (solutions[solIdx]?.[r]?.[c] === 1) el.classList.add('sol-shade'); }
        else { if (marks[r][c] === 'b') el.classList.add('shaded'); else if (marks[r][c] === 'w') el.classList.add('empty-mark'); }
        if (c < C-1) addHandle(el, 'v', r, c);
        if (r < R-1) addHandle(el, 'h', r, c);
    }

    function render() {
        const ct = $('lits-grid-container'); if (!ct) return;
        ct.innerHTML = ''; ct.style.gridTemplateColumns = `repeat(${C},38px)`; ct.style.gridTemplateRows = `repeat(${R},38px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.dataset.r = r; cell.dataset.c = c;
            paint(cell, r, c);
            cell.addEventListener('contextmenu', e => { e.preventDefault(); if (showing) return; marks[r][c] = marks[r][c] === null ? 'b' : marks[r][c] === 'b' ? 'w' : null; paint(cell, r, c); });
            ct.appendChild(cell);
        }
    }

    function paintBorders() {
        const ct = $('lits-grid-container'); if (!ct) return;
        ct.querySelectorAll('.lt-cell').forEach(el => { const r = +el.dataset.r, c = +el.dataset.c; el.classList.toggle('br-right', c < C-1 && vB[r][c]); el.classList.toggle('br-bottom', r < R-1 && hB[r][c]); });
    }

    window.initLITSGrid = () => { readSize(); reset(); hB = mkArr(false); vB = mkArr(false); marks = mkArr(null); render(); stats('-', '-'); nav(false); };
    window.clearLITSGrid = () => { reset(); marks = mkArr(null); render(); stats('-', '-'); nav(false); };
    window.buildSimpleLITSExample = () => {
        R = 4; C = 6; const ri = $('lits-rows'), ci = $('lits-cols'); if (ri) ri.value = 4; if (ci) ci.value = 6;
        reset(); hB = mkArr(false); vB = mkArr(false); marks = mkArr(null);
        for (let r = 0; r < R; r++) { vB[r][1] = true; vB[r][3] = true; }
        render(); stats('-', '-'); nav(false);
    };
    window.solveLITSPuzzleUI = () => {
        if (!window.solveLITS) return stats('模块未加载', '-');
        const t0 = performance.now(), res = window.solveLITS({ rows: R, cols: C, hBorders: hB, vBorders: vB }), ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showLITSSolution(0); }
    };
    window.showLITSSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('lits-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        const ct = $('lits-grid-container'); if (ct) ct.querySelectorAll('.lt-cell').forEach(c => paint(c, +c.dataset.r, +c.dataset.c));
    };
})();
