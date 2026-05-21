(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('ncells-workspace', 'ncells-layout',
        window.LogicUI.backButton('ncells-workspace') +
        window.LogicUI.title('NCELLS', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('nc-rows', 'nc-cols', { rowVal: 4, colVal: 4, rowMin: 3, colMin: 3, rowMax: 8, colMax: 8 }) +
        `<div style="display:flex;align-items:center;gap:8px;margin:6px 0">
            <label style="color:#aaa;font-size:.85rem">区域大小:</label>
            <input id="nc-regsize" type="number" value="4" min="2" max="9"
                   style="width:52px;padding:4px 6px;background:rgba(0,0,0,.4);border:1px solid rgba(0,255,231,.3);border-radius:4px;color:#0ff;text-align:center;font-size:.9rem">
        </div>` +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initNCGrid && window.initNCGrid()' },
            { label: '计算核心分析', onclick: 'window.solveNCPuzzleUI && window.solveNCPuzzleUI()', id: 'nc-solve-btn', glow: true },
            { label: '清空线索', onclick: 'window.clearNCGrid && window.clearNCGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleNCExample && window.buildSimpleNCExample()' }
        ]) +
        window.LogicUI.statsPanel('nc', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('nc', 'showNCSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击格子: 循环线索 0→1→2→3→4→无',
            '右键点击: 反向递减',
            '线索 = 该格4方向邻居中属于不同区域的数量',
            '将网格分成大小相等的连通区域'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="nc-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;"></div>`,
        `#nc-grid-container{gap:0}
        .nc-cell{width:38px;height:38px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:700;font-size:1.1rem;color:var(--neon-cyan,#0ff);position:relative;user-select:none}
        .nc-cell:hover{background:rgba(0,255,231,.08)}
        .nc-cell.br-right{border-right:3px solid #00ffe7!important}
        .nc-cell.br-bottom{border-bottom:3px solid #00ffe7!important}
        .nc-cell.br-outer-t{border-top:3px solid #00ffe7!important}
        .nc-cell.br-outer-l{border-left:3px solid #00ffe7!important}
        .nc-cell.br-outer-r{border-right:3px solid #00ffe7!important}
        .nc-cell.br-outer-b{border-bottom:3px solid #00ffe7!important}`
    ));

    const $ = id => document.getElementById(id);
    let R = 4, C = 4, RS = 4, clues = {};
    let solutions = [], solIdx = 0, showing = false;
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('nc-solutionsCount'), b = $('nc-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('nc-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => {
        const ri = $('nc-rows'), ci = $('nc-cols'), rs = $('nc-regsize');
        if (ri && ci) { R = Math.max(3, Math.min(8, +ri.value || 4)); C = Math.max(3, Math.min(8, +ci.value || 4)); ri.value = R; ci.value = C; }
        if (rs) { RS = Math.max(2, Math.min(9, +rs.value || 4)); rs.value = RS; }
    };

    function render() {
        const ct = $('nc-grid-container'); if (!ct) return;
        ct.innerHTML = ''; ct.style.gridTemplateColumns = `repeat(${C},38px)`; ct.style.gridTemplateRows = `repeat(${R},38px)`;
        const sol = showing && solutions.length ? solutions[solIdx] : null;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.className = 'nc-cell';
            // outer borders
            if (r === 0) cell.classList.add('br-outer-t');
            if (c === 0) cell.classList.add('br-outer-l');
            if (r === R - 1) cell.classList.add('br-outer-b');
            if (c === C - 1) cell.classList.add('br-outer-r');
            // solution borders
            if (sol) {
                if (c < C - 1 && sol.vB[r][c]) cell.classList.add('br-right');
                if (r < R - 1 && sol.hB[r][c]) cell.classList.add('br-bottom');
            }
            const k = r + ',' + c;
            if (k in clues) cell.textContent = clues[k];
            if (!showing) {
                cell.addEventListener('click', () => {
                    if (!(k in clues)) clues[k] = 0;
                    else if (clues[k] < 4) clues[k]++;
                    else delete clues[k];
                    render();
                });
                cell.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    if (k in clues) { if (clues[k] > 0) clues[k]--; else delete clues[k]; }
                    render();
                });
            }
            ct.appendChild(cell);
        }
    }

    window.initNCGrid = () => { readSize(); reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.clearNCGrid = () => { reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.buildSimpleNCExample = () => {
        R = 4; C = 4; RS = 4;
        const ri = $('nc-rows'), ci = $('nc-cols'), rs = $('nc-regsize');
        if (ri) ri.value = 4; if (ci) ci.value = 4; if (rs) rs.value = 4;
        reset(); clues = { '0,0': 1, '1,1': 2, '2,2': 2, '3,3': 1 };
        render(); stats('-', '-'); nav(false);
    };

    window.solveNCPuzzleUI = () => {
        if (!window.solveNcells) return stats('模块未加载', '-');
        readSize();
        const t0 = performance.now();
        const res = window.solveNcells({ rows: R, cols: C, regionSize: RS, clues });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showNCSolution(0); }
    };
    window.showNCSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('nc-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
