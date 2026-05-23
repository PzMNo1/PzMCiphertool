(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('tren-workspace', 'tren-layout',
        window.LogicUI.backButton('tren-workspace') +
        window.LogicUI.title('TREN', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('trn-rows', 'trn-cols', { rowVal: 6, colVal: 6, rowMin: 3, colMin: 3, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initTrenGrid && window.initTrenGrid()' },
            { label: '计算核心分析', onclick: 'window.solveTrenPuzzleUI && window.solveTrenPuzzleUI()', id: 'trn-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearTrenGrid && window.clearTrenGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleTrenExample && window.buildSimpleTrenExample()' }
        ]) +
        window.LogicUI.statsPanel('trn', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('trn', 'showTrenSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击格子输入数字线索（留空 = 空白格）',
            '放置 1×2 或 1×3 的车辆，车辆不能重叠',
            '数字 = 该车沿移动方向可滑动的总格数',
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="tren-grid-container"></div>`,
        `#tren-grid-container{display:inline-grid;gap:0;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);user-select:none}
        .trn-cell{width:44px;height:44px;display:flex;justify-content:center;align-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);cursor:pointer;transition:background .15s}
        .trn-cell:hover{background:rgba(0,255,231,.08)}
        .trn-cell.clue{color:#fff;font-weight:700;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .trn-cell.vehicle{background:rgba(64,224,255,.35);border-color:rgba(0,229,255,.5)}
        .trn-cell.vehicle.vt{border-top:2px solid var(--neon-cyan)}.trn-cell.vehicle.vb{border-bottom:2px solid var(--neon-cyan)}.trn-cell.vehicle.vl{border-left:2px solid var(--neon-cyan)}.trn-cell.vehicle.vr{border-right:2px solid var(--neon-cyan)}
        .trn-cell input.ti{width:100%;height:100%;border:0;background:0 0;color:var(--neon-cyan);text-align:center;font-size:1rem;font-weight:700;outline:0;padding:0;margin:0}`
    ));

    const $ = id => document.getElementById(id);
    let R = 6, C = 6, clues = {}, sols = [], si = 0, showing = false;
    const reset = () => { sols = []; si = 0; showing = false; };
    const stat = (c, t) => { const a = $('trn-solutionsCount'), b = $('trn-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const snav = v => { const n = $('trn-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const rSz = () => { const ri = $('trn-rows'), ci = $('trn-cols'); if (ri && ci) { R = Math.max(3, Math.min(12, +ri.value || 6)); C = Math.max(3, Math.min(12, +ci.value || 6)); ri.value = R; ci.value = C; } };

    function render() {
        const g = $('tren-grid-container'); if (!g) return; g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},44px)`; g.style.gridTemplateRows = `repeat(${R},44px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'), k = r + ',' + c;
            cell.className = 'trn-cell'; cell.dataset.r = r; cell.dataset.c = c;
            if (k in clues) { cell.classList.add('clue'); cell.textContent = clues[k]; }
            cell.onclick = () => {
                if (showing) return;
                const inp = document.createElement('input');
                inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'ti'; inp.maxLength = 2;
                if (k in clues) inp.value = clues[k];
                cell.textContent = ''; cell.appendChild(inp); inp.focus();
                const commit = () => { const n = parseInt(inp.value); if (n >= 0 && !isNaN(n)) clues[k] = n; else delete clues[k]; render(); };
                inp.addEventListener('blur', commit, { once: true });
                inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); else if (e.key === 'Escape') { inp.value = ''; inp.blur(); } };
            };
            g.appendChild(cell);
        }
        if (showing && sols[si]) {
            const s = sols[si];
            g.querySelectorAll('.trn-cell').forEach(cell => {
                const r = +cell.dataset.r, c = +cell.dataset.c, v = s[r][c];
                if (v <= 0) return; cell.classList.add('vehicle');
                if (r === 0 || s[r-1][c] !== v) cell.classList.add('vt');
                if (r === R-1 || s[r+1][c] !== v) cell.classList.add('vb');
                if (c === 0 || s[r][c-1] !== v) cell.classList.add('vl');
                if (c === C-1 || s[r][c+1] !== v) cell.classList.add('vr');
            });
        }
    }

    window.initTrenGrid = () => { rSz(); reset(); clues = {}; render(); stat('-', '-'); snav(false); };
    window.clearTrenGrid = () => { reset(); clues = {}; render(); stat('-', '-'); snav(false); };
    window.buildSimpleTrenExample = () => {
        R = 4; C = 4; const ri = $('trn-rows'), ci = $('trn-cols');
        if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); clues = { '0,0': 2, '1,2': 1, '3,0': 2 };
        render(); stat('-', '-'); snav(false);
    };
    window.solveTrenPuzzleUI = () => {
        if (!window.solveTren) return stat('模块未加载', '-');
        if (!Object.keys(clues).length) return stat('请先输入线索', '-');
        const t0 = performance.now(), res = window.solveTren({ rows: R, cols: C, clues });
        const ms = Math.round(performance.now() - t0) + 'ms';
        sols = res.solutions || [];
        stat(res.timeout ? sols.length + '+ (超时)' : (sols.length || '未找到解'), ms);
        if (sols.length) { showing = true; si = 0; snav(true); window.showTrenSolution(0); }
    };
    window.showTrenSolution = d => {
        if (!sols.length) return;
        si = (si + d + sols.length) % sols.length;
        const ctr = $('trn-solution-counter'); if (ctr) ctr.textContent = (si + 1) + ' / ' + sols.length;
        render();
    };
})();
