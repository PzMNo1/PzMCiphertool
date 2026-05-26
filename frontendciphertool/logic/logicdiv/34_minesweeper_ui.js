(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('minesweeper-workspace', 'minesweeper-layout',
        window.LogicUI.backButton('minesweeper-workspace') +
        window.LogicUI.title('MINESWEEPER', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('ms-rows', 'ms-cols', { rowVal: 5, colVal: 5, rowMin: 3, colMin: 3, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initMSGrid && window.initMSGrid()' },
            { label: '计算核心分析', onclick: 'window.solveMSPuzzleUI && window.solveMSPuzzleUI()', id: 'ms-solve-btn', glow: true },
            { label: '清空标记', onclick: 'window.clearMSGrid && window.clearMSGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleMSExample && window.buildSimpleMSExample()' }
        ]) +
        window.LogicUI.statsPanel('ms', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('ms', 'showMSSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击: 循环 空白 → 线索0 → 1 → ... → 8 → 空白',
            '右键点击: 反向循环 / 快速清除',
            '线索格 = 周围8格中的地雷数',
            '线索格本身不是地雷'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="ms-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;"></div>`,
        `#ms-grid-container{gap:1px}
        .ms-cell{width:36px;height:36px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:700;font-size:1rem;position:relative;user-select:none}
        .ms-cell:hover{background:rgba(0,255,231,.1)}
        .ms-cell.clue{background:rgba(0,50,80,.4)}
        .ms-cell.mine-sol{background:radial-gradient(circle,rgba(255,40,40,.25) 0%,rgba(0,0,0,.5) 70%);animation:ms-pulse 1.5s ease-in-out infinite}
        .ms-cell.mine-sol::after{content:'';width:12px;height:12px;background:#ff2828;transform:rotate(45deg);box-shadow:0 0 8px #ff2828,0 0 16px rgba(255,40,40,.5);border-radius:2px}
        .ms-cell.mine-sol::before{content:'';position:absolute;width:24px;height:24px;border:1px solid rgba(255,40,40,.3);border-radius:50%;animation:ms-ripple 2s ease-out infinite}
        @keyframes ms-pulse{0%,100%{opacity:.85}50%{opacity:1}}
        @keyframes ms-ripple{0%{transform:scale(.5);opacity:.6}100%{transform:scale(1.3);opacity:0}}
        .ms-cell.safe-sol{background:rgba(0,255,231,.06)}
        .ms-c0{color:rgba(255,255,255,.3)} .ms-c1{color:#0cf} .ms-c2{color:#0f0} .ms-c3{color:#f36}
        .ms-c4{color:#bc13fe} .ms-c5{color:#ff0} .ms-c6{color:#0ff} .ms-c7{color:#f90} .ms-c8{color:#f00}`
    ));

    const $ = id => document.getElementById(id);
    let R = 5, C = 5, clues = {}; // "r,c" → number
    let solutions = [], solIdx = 0, showing = false;
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('ms-solutionsCount'), b = $('ms-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('ms-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('ms-rows'), ci = $('ms-cols'); if (ri && ci) { R = Math.max(3, Math.min(12, +ri.value || 5)); C = Math.max(3, Math.min(12, +ci.value || 5)); ri.value = R; ci.value = C; } };

    const COLORS = ['ms-c0','ms-c1','ms-c2','ms-c3','ms-c4','ms-c5','ms-c6','ms-c7','ms-c8'];

    function render() {
        const ct = $('ms-grid-container'); if (!ct) return;
        ct.innerHTML = ''; ct.style.gridTemplateColumns = `repeat(${C},36px)`; ct.style.gridTemplateRows = `repeat(${R},36px)`;
        const sol = showing && solutions.length ? solutions[solIdx] : null;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.className = 'ms-cell';
            const k = r + ',' + c;
            if (k in clues) {
                cell.classList.add('clue', COLORS[clues[k]]);
                cell.textContent = clues[k];
            }
            if (sol) {
                if (sol[r][c]) cell.classList.add('mine-sol');
                else if (!(k in clues)) cell.classList.add('safe-sol');
            }
            // left click: cycle empty → 0 → 1 → ... → 8 → empty
            cell.addEventListener('click', () => {
                if (showing) return;
                if (!(k in clues)) clues[k] = 0;
                else if (clues[k] < 8) clues[k]++;
                else delete clues[k];
                render();
            });
            // right click: reverse
            cell.addEventListener('contextmenu', e => {
                e.preventDefault(); if (showing) return;
                if (k in clues) { if (clues[k] > 0) clues[k]--; else delete clues[k]; }
                else clues[k] = 8;
                render();
            });
            ct.appendChild(cell);
        }
    }

    window.initMSGrid = () => { readSize(); reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.clearMSGrid = () => { reset(); render(); stats('-', '-'); nav(false); };
    window.buildSimpleMSExample = () => {
        R = 5; C = 5; const ri = $('ms-rows'), ci = $('ms-cols'); if (ri) ri.value = 5; if (ci) ci.value = 5;
        reset(); clues = {};
        // 中心一颗雷，周围8个线索=1
        [[1,1],[1,2],[1,3],[2,1],[2,3],[3,1],[3,2],[3,3]].forEach(([r,c]) => clues[r+','+c] = 1);
        render(); stats('-', '-'); nav(false);
    };

    window.solveMSPuzzleUI = () => {
        if (!window.solveMinesweeper) return stats('模块未加载', '-');
        const t0 = performance.now();
        const res = window.solveMinesweeper({ rows: R, cols: C, clues });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showMSSolution(0); }
    };
    window.showMSSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('ms-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
