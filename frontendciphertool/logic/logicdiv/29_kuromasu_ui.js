(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('kuromasu-workspace', 'kuromasu-layout',
        window.LogicUI.backButton('kuromasu-workspace') +
        window.LogicUI.title('KUROMASU', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('kuromasu-rows', 'kuromasu-cols', { rowVal: 8, colVal: 8, rowMin: 3, colMin: 3, rowMax: 15, colMax: 15 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initKuromasuGrid && window.initKuromasuGrid()' },
            { label: '计算核心分析', onclick: 'window.solveKuromasuPuzzleUI && window.solveKuromasuPuzzleUI()', id: 'kuromasu-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearKuromasuGrid && window.clearKuromasuGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleKuromasuExample && window.buildSimpleKuromasuExample()' }
        ]) +
        window.LogicUI.statsPanel('kuromasu', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('kuromasu', 'showKuromasuSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击格子: 输入数字 (视野范围)',
            '右键点击格子: 循环切换 无标记 → 黑格 → 白格标记',
            '数字 = 从该格上下左右能看到的连续白格数 (含自身)',
            '黑格不能正交相邻，所有白格必须连通'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="kuromasu-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;"></div>`,
        `#kuromasu-grid-container{gap:1px}
        .km-cell{width:40px;height:40px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);position:relative;font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700}
        .km-cell:hover{background:rgba(0,255,231,.1)}
        .km-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .km-cell.black{background:#111;box-shadow:inset 0 0 8px rgba(0,0,0,.8)}
        .km-cell.white-mark{background:rgba(0,255,231,.08);box-shadow:inset 0 0 4px rgba(0,255,231,.15)}
        .km-cell.editing{background:rgba(0,255,231,.15);outline:2px solid var(--neon-cyan,#00ffe7);z-index:10}
        .km-cell input.ki{width:100%;height:100%;border:0;background:0 0;color:var(--neon-cyan,#00ffe7);text-align:center;font-size:1rem;font-weight:700;outline:0;padding:0;margin:0}
        .km-cell input.ki::placeholder{color:rgba(0,255,231,.2)}
        .km-cell.sol-black{background:#0a0a14;box-shadow:inset 0 0 12px rgba(0,0,0,.9),0 0 6px rgba(0,0,0,.5)}`
    ));

    const $ = id => document.getElementById(id);
    let R = 8, C = 8;
    let grid = [];     // number|null — 线索数字
    let marks = [];    // null|0|1 — 手动标记（0=白标记, 1=黑标记）
    let solutions = [], solIdx = 0, showing = false;

    function reset() { solutions = []; solIdx = 0; showing = false; }
    function stats(c, t) { const a = $('kuromasu-solutionsCount'), b = $('kuromasu-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; }
    function nav(show) { const n = $('kuromasu-solution-nav'); if (n) n.style.display = show ? 'flex' : 'none'; }

    function readSize() {
        const ri = $('kuromasu-rows'), ci = $('kuromasu-cols');
        if (ri && ci) { R = Math.max(3, Math.min(15, parseInt(ri.value) || 8)); C = Math.max(3, Math.min(15, parseInt(ci.value) || 8)); ri.value = R; ci.value = C; }
    }

    function emptyGrid() {
        grid = Array.from({ length: R }, () => new Array(C).fill(null));
        marks = Array.from({ length: R }, () => new Array(C).fill(null));
    }

    function paint(el, r, c) {
        el.innerHTML = ''; el.className = 'km-cell';
        if (grid[r][c] != null) { el.classList.add('clue'); el.textContent = grid[r][c]; }
        if (showing && solutions.length) {
            if (solutions[solIdx]?.[r]?.[c] === 1) el.classList.add('sol-black');
        } else {
            if (marks[r][c] === 1) el.classList.add('black');
            else if (marks[r][c] === 0) el.classList.add('white-mark');
        }
    }

    function render() {
        const ct = $('kuromasu-grid-container'); if (!ct) return;
        ct.innerHTML = '';
        ct.style.gridTemplateColumns = `repeat(${C},40px)`;
        ct.style.gridTemplateRows = `repeat(${R},40px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div');
            cell.className = 'km-cell'; cell.dataset.r = r; cell.dataset.c = c;
            paint(cell, r, c);
            bindCell(cell, r, c);
            ct.appendChild(cell);
        }
    }

    function bindCell(cell, r, c) {
        cell.addEventListener('click', () => {
            if (showing) return;
            if (cell.querySelector('input.ki')) return;
            cell.classList.add('editing'); cell.textContent = '';
            const inp = document.createElement('input');
            inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'ki'; inp.maxLength = 2; inp.placeholder = '-';
            if (grid[r][c] != null) inp.value = grid[r][c];
            cell.appendChild(inp); inp.focus(); inp.select();
            const commit = () => { const n = parseInt(inp.value); grid[r][c] = (n > 0) ? n : null; cell.classList.remove('editing'); paint(cell, r, c); };
            inp.addEventListener('blur', commit, { once: true });
            inp.addEventListener('keydown', ev => {
                if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
                else if (ev.key === 'Escape') { inp.value = grid[r][c] ?? ''; inp.blur(); }
                else if (ev.key.length === 1 && !/[0-9]/.test(ev.key)) ev.preventDefault();
            });
        });
        cell.addEventListener('contextmenu', e => {
            e.preventDefault(); if (showing) return;
            marks[r][c] = marks[r][c] === null ? 1 : marks[r][c] === 1 ? 0 : null;
            paint(cell, r, c);
        });
    }

    /* ── 公共 API ── */
    window.initKuromasuGrid = () => { readSize(); reset(); emptyGrid(); render(); stats('-', '-'); nav(false); };
    window.clearKuromasuGrid = () => { reset(); emptyGrid(); render(); stats('-', '-'); nav(false); };

    // 验证过的 3×3 示例
    // 3  _  3      解:  3  W  3
    // _  _  _           B  W  B
    // 3  _  3           3  W  3
    // 每个角 vis=1(self)+0(被B阻断)+2(沿边)=3 ✓  黑格不相邻 ✓  白格连通 ✓
    window.buildSimpleKuromasuExample = () => {
        R = 3; C = 3;
        const ri = $('kuromasu-rows'), ci = $('kuromasu-cols');
        if (ri) ri.value = 3; if (ci) ci.value = 3;
        reset(); emptyGrid();
        grid[0][0] = 3; grid[0][2] = 3;
        grid[2][0] = 3; grid[2][2] = 3;
        render(); stats('-', '-'); nav(false);
    };

    window.solveKuromasuPuzzleUI = () => {
        if (!window.solveKuromasu) return stats('模块未加载', '-');
        // 需要至少一个线索
        let hasClue = false;
        for (let r = 0; r < R && !hasClue; r++) for (let c = 0; c < C; c++) if (grid[r][c] != null) { hasClue = true; break; }
        if (!hasClue) return stats('需要至少1个线索', '-');
        const t0 = performance.now();
        const res = window.solveKuromasu({ rows: R, cols: C, grid });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showKuromasuSolution(0); }
    };

    window.showKuromasuSolution = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('kuromasu-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        const ct = $('kuromasu-grid-container'); if (ct) ct.querySelectorAll('.km-cell').forEach(c => paint(c, +c.dataset.r, +c.dataset.c));
    };
})();
