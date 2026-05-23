(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('tents-workspace', 'tents-layout',
        window.LogicUI.backButton('tents-workspace') +
        window.LogicUI.title('TENTS', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('tnt-rows', 'tnt-cols', { rowVal: 8, colVal: 8, rowMin: 3, colMin: 3, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initTentsGrid && window.initTentsGrid()' },
            { label: '计算核心分析', onclick: 'window.solveTentsPuzzleUI && window.solveTentsPuzzleUI()', id: 'tnt-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearTentsGrid && window.clearTentsGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleTentsExample && window.buildSimpleTentsExample()' }
        ]) +
        window.LogicUI.statsPanel('tnt', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('tnt', 'showTentsSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击格子放置/移除树木 🌲',
            '顶部输入每列帐篷数，左侧输入每行帐篷数',
            '每棵树恰好对应一个帐篷 (上下左右相邻)',
            '帐篷之间不能相邻 (含对角线)'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="tnt-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;user-select:none"></div>`,
        `#tnt-grid-container{gap:0}
        .tnt-clue{width:42px;height:42px;display:flex;justify-content:center;align-items:center;font-weight:700;color:var(--neon-cyan,#00ffe7)}
        .tnt-clue input{width:100%;height:100%;border:0;background:0 0;color:var(--neon-cyan,#00ffe7);text-align:center;font-size:1rem;font-weight:700;outline:0;padding:0;margin:0}
        .tnt-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.5rem;display:flex;justify-content:center;align-items:center;cursor:pointer;user-select:none;transition:background .15s}
        .tnt-cell:hover{background:rgba(0,255,231,.08)}
        .tnt-cell.tree::after{content:'🌲'}.tnt-cell.tent::after{content:'⛺';animation:tntPop .5s ease}
        .tnt-cell.tent{background:rgba(0,255,100,.12);border-color:rgba(0,255,100,.3)}
        .tnt-corner{width:42px;height:42px}
        @keyframes tntPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`
    ));

    const $ = id => document.getElementById(id);
    let R = 8, C = 8, grid = [], rowClues = [], colClues = [], solutions = [], solIdx = 0, showing = false;
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('tnt-solutionsCount'), b = $('tnt-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('tnt-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const sz = () => { const ri = $('tnt-rows'), ci = $('tnt-cols'); if (ri && ci) { R = Math.max(3, Math.min(12, +ri.value || 8)); C = Math.max(3, Math.min(12, +ci.value || 8)); ri.value = R; ci.value = C; } };

    const mkInput = (arr, idx) => { const inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.maxLength = 2; inp.placeholder = '#'; inp.value = arr[idx] || ''; inp.oninput = () => { arr[idx] = inp.value; }; return inp; };

    function render() {
        const g = $('tnt-grid-container'); if (!g) return; g.innerHTML = '';
        g.style.gridTemplateColumns = `42px repeat(${C},42px)`;
        g.style.gridTemplateRows = `42px repeat(${R},42px)`;
        const d = t => { const e = document.createElement('div'); e.className = t; return e; };
        g.appendChild(d('tnt-corner'));
        for (let j = 0; j < C; j++) { const cl = d('tnt-clue'); cl.appendChild(mkInput(colClues, j)); g.appendChild(cl); }
        for (let i = 0; i < R; i++) {
            const cl = d('tnt-clue'); cl.appendChild(mkInput(rowClues, i)); g.appendChild(cl);
            for (let j = 0; j < C; j++) {
                const cell = d('tnt-cell'), sv = showing && solutions[solIdx] ? solutions[solIdx][i][j] : grid[i][j];
                if (sv === 1 || grid[i][j] === 1) cell.classList.add('tree');
                if (sv === 2) cell.classList.add('tent');
                cell.onclick = () => { if (showing) return; grid[i][j] ^= 1; render(); };
                g.appendChild(cell);
            }
        }
    }

    const fresh = () => { grid = Array.from({ length: R }, () => Array(C).fill(0)); };

    window.initTentsGrid = () => { sz(); reset(); fresh(); rowClues = Array(R).fill(''); colClues = Array(C).fill(''); render(); stats('-', '-'); nav(false); };
    window.clearTentsGrid = () => { reset(); fresh(); render(); stats('-', '-'); nav(false); };

    window.buildSimpleTentsExample = () => {
        R = 5; C = 5; const ri = $('tnt-rows'), ci = $('tnt-cols'); if (ri) ri.value = 5; if (ci) ci.value = 5;
        reset(); fresh();
        // Trees: (0,0),(1,2),(3,1) → Tents: (0,1),(1,3),(3,0)
        grid[0][0] = grid[1][2] = grid[3][1] = 1;
        rowClues = ['1','1','0','1','0']; colClues = ['1','1','0','1','0'];
        render(); stats('-', '-'); nav(false);
    };

    window.solveTentsPuzzleUI = () => {
        if (!window.solveTents) return stats('模块未加载', '-');
        if (!grid.some(r => r.some(v => v === 1))) return stats('请先放置树木', '-');
        const t0 = performance.now();
        const res = window.solveTents({ rows: R, cols: C, grid, rowClues: rowClues.map(v => v === '' ? -1 : +v), colClues: colClues.map(v => v === '' ? -1 : +v) });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showTentsSolution(0); }
    };

    window.showTentsSolution = d => { if (!solutions.length) return; solIdx = (solIdx + d + solutions.length) % solutions.length; const c = $('tnt-solution-counter'); if (c) c.textContent = (solIdx+1)+' / '+solutions.length; render(); };
})();
