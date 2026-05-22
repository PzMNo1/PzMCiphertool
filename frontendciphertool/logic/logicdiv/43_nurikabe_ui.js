(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('nurikabe-workspace', 'nurikabe-layout',
        window.LogicUI.backButton('nurikabe-workspace') +
        window.LogicUI.title('NURIKABE', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('nurikabe-rows', 'nurikabe-cols', { rowVal: 7, colVal: 7, rowMin: 3, colMin: 3, rowMax: 15, colMax: 15 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initNurikabeGrid && window.initNurikabeGrid()' },
            { label: '计算核心分析', onclick: 'window.solveNurikabePuzzleUI && window.solveNurikabePuzzleUI()', id: 'nurikabe-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearNurikabeGrid && window.clearNurikabeGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleNurikabeExample && window.buildSimpleNurikabeExample()' }
        ]) +
        window.LogicUI.statsPanel('nurikabe', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('nurikabe', 'showNurikabeSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击格子: 放置/编辑线索数字 (岛屿大小)',
            '右键点击格子: 循环切换 无标记 → 海洋(黑) → 岛屿(白)',
            '键盘: 数字键填写, 方向键导航, Delete 清除',
            '所有海洋(黑格)必须连通且无2×2; 每个岛屿恰含一个线索'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="nurikabe-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;"></div>`,
        `#nurikabe-grid-container{gap:1px}
        .nk-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700}
        .nk-cell:hover{background:rgba(0,255,231,.1)}
        .nk-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .nk-cell.black-mark{background:#0a0a14;box-shadow:inset 0 0 10px rgba(0,0,0,.8)}
        .nk-cell.white-mark{background:rgba(0,255,231,.06)}
        .nk-cell.editing{outline:2px solid var(--neon-cyan,#00ffe7);z-index:10;background:rgba(0,255,231,.15)}
        .nk-cell.active-nav{outline:2px solid rgba(0,255,231,.5);z-index:5}
        .nk-cell input.ki{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.95rem;font-weight:700;outline:0;padding:0;margin:0}
        .nk-cell.sol-black{background:#0a0a14;box-shadow:inset 0 0 12px rgba(0,0,0,.9),0 0 4px rgba(0,0,0,.5)}`
    ));

    const $ = id => document.getElementById(id);
    let R = 7, C = 7, clues = {}, marks = [], solutions = [], solIdx = 0, showing = false, sel = null;

    function reset() { solutions = []; solIdx = 0; showing = false; }
    function stats(c, t) { const a = $('nurikabe-solutionsCount'), b = $('nurikabe-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; }
    function nav(v) { const n = $('nurikabe-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; }
    function ct() { return $('nurikabe-grid-container'); }
    function cellEl(r, c) { const g = ct(); return g && g.querySelector(`.nk-cell[data-r="${r}"][data-c="${c}"]`); }

    function readSize() {
        const ri = $('nurikabe-rows'), ci = $('nurikabe-cols');
        if (ri && ci) { R = Math.max(3, Math.min(15, +ri.value || 7)); C = Math.max(3, Math.min(15, +ci.value || 7)); ri.value = R; ci.value = C; }
    }

    function paint(el, r, c) {
        el.innerHTML = ''; el.className = 'nk-cell';
        const k = r + ',' + c;
        if (k in clues) { el.classList.add('clue'); el.textContent = clues[k]; }
        if (showing && solutions.length) { if (solutions[solIdx]?.[r]?.[c] === 1) el.classList.add('sol-black'); }
        else { if (marks[r]?.[c] === 'b') el.classList.add('black-mark'); else if (marks[r]?.[c] === 'w') el.classList.add('white-mark'); }
        if (sel && sel.r === r && sel.c === c) el.classList.add('active-nav');
    }

    function render() {
        const g = ct(); if (!g) return; g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},42px)`; g.style.gridTemplateRows = `repeat(${R},42px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div');
            cell.className = 'nk-cell'; cell.dataset.r = r; cell.dataset.c = c;
            paint(cell, r, c); bind(cell, r, c); g.appendChild(cell);
        }
    }

    function select(r, c) {
        sel = { r, c }; const g = ct(); if (!g) return;
        g.querySelectorAll('.nk-cell.active-nav').forEach(e => e.classList.remove('active-nav'));
        const el = cellEl(r, c); if (el) el.classList.add('active-nav');
    }

    function bind(cell, r, c) {
        const k = r + ',' + c;
        cell.onclick = () => {
            if (showing) return; select(r, c);
            if (cell.querySelector('input.ki')) return;
            cell.classList.add('editing');
            const inp = document.createElement('input');
            inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'ki'; inp.maxLength = 3; inp.placeholder = '-';
            if (k in clues) inp.value = clues[k];
            cell.textContent = ''; cell.appendChild(inp); inp.focus(); inp.select();
            const commit = () => { const n = parseInt(inp.value); if (n > 0) clues[k] = n; else delete clues[k]; cell.classList.remove('editing'); paint(cell, r, c); };
            inp.addEventListener('blur', commit, { once: true });
            inp.onkeydown = ev => {
                if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
                else if (ev.key === 'Escape') { inp.value = k in clues ? clues[k] : ''; inp.blur(); }
                else if (ev.key.length === 1 && !/[0-9]/.test(ev.key) && ev.key !== 'Backspace') ev.preventDefault();
            };
        };
        cell.oncontextmenu = e => {
            e.preventDefault(); if (showing) return; select(r, c);
            if (k in clues) { delete clues[k]; paint(cell, r, c); return; }
            marks[r][c] = marks[r][c] === null ? 'b' : marks[r][c] === 'b' ? 'w' : null;
            paint(cell, r, c);
        };
    }

    document.addEventListener('keydown', e => {
        const ws = $('nurikabe-workspace');
        if (!ws || ws.style.display === 'none' || !sel) return;
        if (document.activeElement?.classList.contains('ki')) return;
        let { r, c } = sel;
        if (e.key === 'ArrowUp' && r > 0) { e.preventDefault(); select(r - 1, c); }
        else if (e.key === 'ArrowDown' && r < R - 1) { e.preventDefault(); select(r + 1, c); }
        else if (e.key === 'ArrowLeft' && c > 0) { e.preventDefault(); select(r, c - 1); }
        else if (e.key === 'ArrowRight' && c < C - 1) { e.preventDefault(); select(r, c + 1); }
        else if (e.key >= '1' && e.key <= '9' && !showing) {
            clues[r + ',' + c] = +e.key; marks[r][c] = null;
            const el = cellEl(r, c); if (el) paint(el, r, c);
        } else if ((e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') && !showing) {
            delete clues[r + ',' + c]; const el = cellEl(r, c); if (el) paint(el, r, c);
        }
    });

    window.initNurikabeGrid = () => { readSize(); reset(); clues = {}; marks = Array.from({ length: R }, () => new Array(C).fill(null)); sel = null; render(); stats('-', '-'); nav(false); };
    window.clearNurikabeGrid = () => { reset(); marks = Array.from({ length: R }, () => new Array(C).fill(null)); render(); stats('-', '-'); nav(false); };

    // 3×3 示例: clues (0,0)=2, (2,2)=2 → 2解
    window.buildSimpleNurikabeExample = () => {
        R = 3; C = 3;
        const ri = $('nurikabe-rows'), ci = $('nurikabe-cols');
        if (ri) ri.value = 3; if (ci) ci.value = 3;
        reset(); clues = {}; marks = Array.from({ length: R }, () => new Array(C).fill(null));
        clues['0,0'] = 2; clues['2,2'] = 2;
        render(); stats('-', '-'); nav(false);
    };

    window.solveNurikabePuzzleUI = () => {
        if (!window.solveNurikabe) return stats('模块未加载', '-');
        if (!Object.keys(clues).length) return stats('需要至少1个线索', '-');
        const t0 = performance.now();
        const res = window.solveNurikabe({ rows: R, cols: C, clues });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showNurikabeSolution(0); }
    };

    window.showNurikabeSolution = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('nurikabe-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        const g = ct(); if (g) g.querySelectorAll('.nk-cell').forEach(c => paint(c, +c.dataset.r, +c.dataset.c));
    };
})();
