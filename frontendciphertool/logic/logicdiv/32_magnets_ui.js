(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('magnets-workspace', 'magnets-layout',
        window.LogicUI.backButton('magnets-workspace') +
        window.LogicUI.title('MAGNETS', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('magnets-rows', 'magnets-cols', { rowVal: 4, colVal: 4, rowMin: 2, colMin: 2, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initMagnetsGrid && window.initMagnetsGrid()' },
            { label: '计算核心分析', onclick: 'window.solveMagnetsPuzzleUI && window.solveMagnetsPuzzleUI()', id: 'magnets-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearMagnetsGrid && window.clearMagnetsGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleMagnetsExample && window.buildSimpleMagnetsExample()' }
        ]) +
        window.LogicUI.statsPanel('magnets', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('magnets', 'showMagnetsSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击或拖动边缘: 划分骨牌边界',
            '上/左侧线索 = 该行/列 + 极数量',
            '下/右侧线索 = 该行/列 − 极数量',
            '同极(+/+或−/−)不能正交相邻'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="magnets-grid-wrapper" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block;"></div>`,
        `#magnets-grid-wrapper{overflow:visible}
        .mg-grid{display:inline-grid;gap:0}
        .mg-cell{width:38px;height:38px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);position:relative;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;cursor:pointer}
        .mg-cell:hover{background:rgba(0,255,231,.08)}
        .mg-cell.plus{background:rgba(0,200,255,.25);color:#0cf}
        .mg-cell.plus::after{content:'+'}
        .mg-cell.minus{background:rgba(255,80,80,.25);color:#f66}
        .mg-cell.minus::after{content:'−'}
        .mg-cell.neutral{background:rgba(100,100,100,.3);color:#888}
        .mg-cell.neutral::after{content:'·'}
        .mg-cell.br-right{border-right:3px solid #00ffe7!important}
        .mg-cell.br-bottom{border-bottom:3px solid #00ffe7!important}
        .mg-cell.br-outer-t{border-top:3px solid #00ffe7!important}
        .mg-cell.br-outer-l{border-left:3px solid #00ffe7!important}
        .mg-cell.br-outer-r{border-right:3px solid #00ffe7!important}
        .mg-cell.br-outer-b{border-bottom:3px solid #00ffe7!important}
        .mg-handle{position:absolute;z-index:5;opacity:0;transition:opacity .15s}
        .mg-handle:hover{opacity:1!important;background:rgba(0,255,231,.3)}
        .mg-cell:hover .mg-handle{opacity:.3}
        .mg-handle.v{right:-4px;top:2px;width:8px;height:calc(100% - 4px);cursor:col-resize}
        .mg-handle.h{bottom:-4px;left:2px;height:8px;width:calc(100% - 4px);cursor:row-resize}
        .mg-clue{width:38px;height:38px;display:flex;align-items:center;justify-content:center}
        .mg-clue input{width:28px;height:28px;border:1px solid rgba(0,255,231,.3);border-radius:4px;background:rgba(0,0,0,.4);color:var(--neon-cyan,#0ff);text-align:center;font-size:.85rem;font-weight:700;outline:0;padding:0}
        .mg-clue input::placeholder{color:rgba(0,255,231,.2);font-size:.7rem}
        .mg-corner{width:38px;height:38px}`
    ));

    const $ = id => document.getElementById(id);
    let R = 4, C = 4, hB = [], vB = [];
    let tC = [], lC = [], bC = [], rC = []; // 线索 null=无
    let solutions = [], solIdx = 0, showing = false;
    let dragType = null, dragVal = false, dragging = false;
    document.addEventListener('mouseup', () => { dragging = false; dragType = null; });

    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('magnets-solutionsCount'), b = $('magnets-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('magnets-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('magnets-rows'), ci = $('magnets-cols'); if (ri && ci) { R = Math.max(2, Math.min(12, +ri.value || 4)); C = Math.max(2, Math.min(12, +ci.value || 4)); ri.value = R; ci.value = C; } };

    function emptyGrid() {
        hB = Array.from({ length: R }, () => new Array(C).fill(false));
        vB = Array.from({ length: R }, () => new Array(C).fill(false));
        tC = new Array(C).fill(null); lC = new Array(R).fill(null);
        bC = new Array(C).fill(null); rC = new Array(R).fill(null);
    }

    function addHandle(el, dir, r, c) {
        const h = document.createElement('div'); h.className = 'mg-handle ' + dir;
        const arr = dir === 'v' ? vB : hB;
        h.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); dragging = true; dragType = dir; dragVal = !arr[r][c]; arr[r][c] = dragVal; paintBorders(); });
        h.addEventListener('mouseenter', () => { if (dragging && dragType === dir) { arr[r][c] = dragVal; paintBorders(); } });
        el.appendChild(h);
    }

    function mkClue(arr, idx, ph) {
        const d = document.createElement('div'); d.className = 'mg-clue';
        const inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.maxLength = 2; inp.placeholder = ph;
        inp.value = arr[idx] != null ? arr[idx] : '';
        inp.addEventListener('blur', () => { const v = parseInt(inp.value); arr[idx] = isNaN(v) ? null : v; });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); else if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault(); });
        d.appendChild(inp); return d;
    }

    function render() {
        const wr = $('magnets-grid-wrapper'); if (!wr) return;
        wr.innerHTML = '';
        const g = document.createElement('div'); g.className = 'mg-grid';
        g.style.gridTemplateColumns = `38px repeat(${C},38px) 38px`;
        g.style.gridTemplateRows = `38px repeat(${R},38px) 38px`;
        // 顶行: 角 + 线索 + 角
        g.appendChild(Object.assign(document.createElement('div'), { className: 'mg-corner' }));
        for (let c = 0; c < C; c++) g.appendChild(mkClue(tC, c, '+'));
        g.appendChild(Object.assign(document.createElement('div'), { className: 'mg-corner' }));
        // 主体
        for (let r = 0; r < R; r++) {
            g.appendChild(mkClue(lC, r, '+'));
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div'); cell.className = 'mg-cell'; cell.dataset.r = r; cell.dataset.c = c;
                // 外框
                if (r === 0) cell.classList.add('br-outer-t');
                if (c === 0) cell.classList.add('br-outer-l');
                if (r === R - 1) cell.classList.add('br-outer-b');
                if (c === C - 1) cell.classList.add('br-outer-r');
                if (c < C - 1 && vB[r][c]) cell.classList.add('br-right');
                if (r < R - 1 && hB[r][c]) cell.classList.add('br-bottom');
                // 解显示
                if (showing && solutions.length) {
                    const v = solutions[solIdx]?.[r]?.[c];
                    if (v === 1) cell.classList.add('plus');
                    else if (v === 2) cell.classList.add('minus');
                    else if (v === 3) cell.classList.add('neutral');
                }
                // 操控条
                if (c < C - 1) addHandle(cell, 'v', r, c);
                if (r < R - 1) addHandle(cell, 'h', r, c);
                g.appendChild(cell);
            }
            g.appendChild(mkClue(rC, r, '−'));
        }
        // 底行
        g.appendChild(Object.assign(document.createElement('div'), { className: 'mg-corner' }));
        for (let c = 0; c < C; c++) g.appendChild(mkClue(bC, c, '−'));
        g.appendChild(Object.assign(document.createElement('div'), { className: 'mg-corner' }));
        wr.appendChild(g);
    }

    function paintBorders() {
        const wr = $('magnets-grid-wrapper'); if (!wr) return;
        wr.querySelectorAll('.mg-cell').forEach(el => {
            const r = +el.dataset.r, c = +el.dataset.c;
            el.classList.toggle('br-right', c < C - 1 && vB[r][c]);
            el.classList.toggle('br-bottom', r < R - 1 && hB[r][c]);
        });
    }

    window.initMagnetsGrid = () => { readSize(); reset(); emptyGrid(); render(); stats('-', '-'); nav(false); };
    window.clearMagnetsGrid = () => { reset(); render(); stats('-', '-'); nav(false); };
    window.buildSimpleMagnetsExample = () => {
        R = 4; C = 4; const ri = $('magnets-rows'), ci = $('magnets-cols'); if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); emptyGrid();
        for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) hB[r][c] = true;
        for (let r = 0; r < R; r++) vB[r][1] = true;
        // 解: +- +- / -+ -+ / +- ·· / ·· +-
        tC = [2, 1, 2, 1]; bC = [1, 2, 1, 2]; lC = [2, 2, 1, 1]; rC = [2, 2, 1, 1];
        render(); stats('-', '-'); nav(false);
    };

    window.solveMagnetsPuzzleUI = () => {
        if (!window.solveMagnets) return stats('模块未加载', '-');
        const t0 = performance.now();
        const res = window.solveMagnets({ rows: R, cols: C, hBorders: hB, vBorders: vB, topClues: tC, leftClues: lC, bottomClues: bC, rightClues: rC });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showMagnetsSolution(0); }
    };
    window.showMagnetsSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('magnets-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
