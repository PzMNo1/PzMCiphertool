(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('nanro-workspace', 'nanro-layout',
        window.LogicUI.backButton('nanro-workspace') +
        window.LogicUI.title('NANRO', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('nr-rows', 'nr-cols', { rowVal: 5, colVal: 5, rowMin: 3, colMin: 3, rowMax: 10, colMax: 10 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initNRGrid && window.initNRGrid()' },
            { label: '计算核心分析', onclick: 'window.solveNRPuzzleUI && window.solveNRPuzzleUI()', id: 'nr-solve-btn', glow: true },
            { label: '清空标记', onclick: 'window.clearNRGrid && window.clearNRGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleNRExample && window.buildSimpleNRExample()' }
        ]) +
        window.LogicUI.statsPanel('nr', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('nr', 'showNRSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '拖拽/点击边缘细条: 划分区域边界',
            '左键点击格子: 循环线索数字 0→1→...→9→无',
            '右键: 反向递减',
            '填充数 = 该区域内被填色格子的总数'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="nr-grid-wrapper" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block;"></div>`,
        `.nr-grid{display:inline-grid;gap:0}
        .nr-cell{width:38px;height:38px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);position:relative;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;cursor:pointer;user-select:none}
        .nr-cell:hover{background:rgba(0,255,231,.08)}
        .nr-cell.clue{color:var(--neon-cyan,#0ff)}
        .nr-cell.filled{background:rgba(0,255,231,.2);color:#0ff}
        .nr-cell.empty-sol{background:rgba(100,100,100,.15)}
        .nr-cell.br-right{border-right:3px solid #00ffe7!important}
        .nr-cell.br-bottom{border-bottom:3px solid #00ffe7!important}
        .nr-cell.br-outer-t{border-top:3px solid #00ffe7!important}
        .nr-cell.br-outer-l{border-left:3px solid #00ffe7!important}
        .nr-cell.br-outer-r{border-right:3px solid #00ffe7!important}
        .nr-cell.br-outer-b{border-bottom:3px solid #00ffe7!important}
        .nr-handle{position:absolute;z-index:5;opacity:0;transition:opacity .15s}
        .nr-handle:hover{opacity:1!important;background:rgba(0,255,231,.3)}
        .nr-cell:hover .nr-handle{opacity:.3}
        .nr-handle.v{right:-4px;top:2px;width:8px;height:calc(100% - 4px);cursor:col-resize}
        .nr-handle.h{bottom:-4px;left:2px;height:8px;width:calc(100% - 4px);cursor:row-resize}`
    ));

    const $ = id => document.getElementById(id);
    let R = 5, C = 5, hB = [], vB = [], clues = {};
    let solutions = [], solIdx = 0, showing = false;
    let dragging = false, dragType = null, dragVal = false;
    document.addEventListener('mouseup', () => { dragging = false; dragType = null; });
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('nr-solutionsCount'), b = $('nr-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('nr-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('nr-rows'), ci = $('nr-cols'); if (ri && ci) { R = Math.max(3, Math.min(10, +ri.value || 5)); C = Math.max(3, Math.min(10, +ci.value || 5)); ri.value = R; ci.value = C; } };
    const initArrays = () => { hB = Array.from({length:R},()=>new Array(C).fill(false)); vB = Array.from({length:R},()=>new Array(C).fill(false)); };

    function addHandle(el, dir, r, c) {
        const h = document.createElement('div'); h.className = 'nr-handle ' + dir;
        const arr = dir === 'v' ? vB : hB;
        h.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); dragging = true; dragType = dir; dragVal = !arr[r][c]; arr[r][c] = dragVal; paintBorders(); });
        h.addEventListener('mouseenter', () => { if (dragging && dragType === dir) { arr[r][c] = dragVal; paintBorders(); } });
        el.appendChild(h);
    }

    function render() {
        const wr = $('nr-grid-wrapper'); if (!wr) return;
        wr.innerHTML = '';
        const g = document.createElement('div'); g.className = 'nr-grid';
        g.style.gridTemplateColumns = `repeat(${C},38px)`;
        g.style.gridTemplateRows = `repeat(${R},38px)`;
        const sol = showing && solutions.length ? solutions[solIdx] : null;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.className = 'nr-cell';
            cell.dataset.r = r; cell.dataset.c = c;
            if (r === 0) cell.classList.add('br-outer-t');
            if (c === 0) cell.classList.add('br-outer-l');
            if (r === R - 1) cell.classList.add('br-outer-b');
            if (c === C - 1) cell.classList.add('br-outer-r');
            if (c < C - 1 && vB[r][c]) cell.classList.add('br-right');
            if (r < R - 1 && hB[r][c]) cell.classList.add('br-bottom');
            const k = r + ',' + c;
            if (sol) {
                if (sol[r][c] > 0) { cell.classList.add('filled'); cell.textContent = sol[r][c]; }
                else cell.classList.add('empty-sol');
            } else {
                if (k in clues) { cell.classList.add('clue'); cell.textContent = clues[k]; }
            }
            if (!showing) {
                cell.addEventListener('click', () => {
                    if (!(k in clues)) clues[k] = 1;
                    else if (clues[k] < 9) clues[k]++;
                    else delete clues[k];
                    render();
                });
                cell.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    if (k in clues) { if (clues[k] > 1) clues[k]--; else delete clues[k]; }
                    render();
                });
                if (c < C - 1) addHandle(cell, 'v', r, c);
                if (r < R - 1) addHandle(cell, 'h', r, c);
            }
            g.appendChild(cell);
        }
        wr.appendChild(g);
    }

    function paintBorders() {
        const wr = $('nr-grid-wrapper'); if (!wr) return;
        wr.querySelectorAll('.nr-cell').forEach(el => {
            const r = +el.dataset.r, c = +el.dataset.c;
            el.classList.toggle('br-right', c < C - 1 && vB[r][c]);
            el.classList.toggle('br-bottom', r < R - 1 && hB[r][c]);
        });
    }

    window.initNRGrid = () => { readSize(); reset(); clues = {}; initArrays(); render(); stats('-', '-'); nav(false); };
    window.clearNRGrid = () => { reset(); render(); stats('-', '-'); nav(false); };
    window.buildSimpleNRExample = () => {
        R = 4; C = 4; const ri = $('nr-rows'), ci = $('nr-cols'); if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); initArrays(); clues = {};
        // 4 regions: 4 quadrants
        for (let c = 0; c < C; c++) hB[1][c] = true;
        for (let r = 0; r < R; r++) vB[r][1] = true;
        // clues: top-left=2, top-right=1, bottom-left=1, bottom-right=2
        clues = { '0,0': 2, '0,3': 1, '3,0': 1, '3,3': 2 };
        render(); stats('-', '-'); nav(false);
    };

    window.solveNRPuzzleUI = () => {
        if (!window.solveNanro) return stats('模块未加载', '-');
        const t0 = performance.now();
        const res = window.solveNanro({ rows: R, cols: C, hBorders: hB, vBorders: vB, clues });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showNRSolution(0); }
    };
    window.showNRSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('nr-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
