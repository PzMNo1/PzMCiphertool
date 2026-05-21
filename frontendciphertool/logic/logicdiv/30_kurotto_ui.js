(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('kurotto-workspace', 'kurotto-layout',
        window.LogicUI.backButton('kurotto-workspace') +
        window.LogicUI.title('KUROTTO', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('kurotto-rows', 'kurotto-cols', { rowVal: 6, colVal: 6, rowMin: 2, colMin: 2, rowMax: 15, colMax: 15 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initKurottoGrid && window.initKurottoGrid()' },
            { label: '计算核心分析', onclick: 'window.solveKurottoPuzzleUI && window.solveKurottoPuzzleUI()', id: 'kurotto-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearKurottoGrid && window.clearKurottoGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleKurottoExample && window.buildSimpleKurottoExample()' }
        ]) +
        window.LogicUI.statsPanel('kurotto', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('kurotto', 'showKurottoSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击格子: 放置/编辑线索圆圈 (输入数字)',
            '右键点击格子: 移除线索 / 切换黑白标记',
            '线索数字 = 与该格正交相邻的黑格连通块大小之和',
            '线索格本身必须为白色'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="kurotto-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;"></div>`,
        `#kurotto-grid-container{gap:1px}
        .kt-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);position:relative;display:flex;align-items:center;justify-content:center;font-size:1rem;color:var(--neon-cyan,#00ffe7);font-weight:700;cursor:pointer}
        .kt-cell:hover{background:rgba(0,255,231,.1)}
        .kt-cell.clue{background:rgba(255,255,255,.05)}
        .kt-cell .clue-circle{width:32px;height:32px;border-radius:50%;border:2px solid var(--neon-cyan,#00ffe7);display:flex;align-items:center;justify-content:center;font-size:.9rem;color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6);background:rgba(0,20,30,.6)}
        .kt-cell.black-mark{background:#0a0a14;box-shadow:inset 0 0 10px rgba(0,0,0,.8)}
        .kt-cell.white-mark{background:rgba(0,255,231,.06)}
        .kt-cell.editing{outline:2px solid var(--neon-cyan,#00ffe7);z-index:10}
        .kt-cell input.ki{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.85rem;font-weight:700;outline:0;padding:0;margin:0}
        .kt-cell.sol-black{background:#0a0a14;box-shadow:inset 0 0 12px rgba(0,0,0,.9),0 0 4px rgba(0,0,0,.5)}`
    ));

    const $ = id => document.getElementById(id);
    let R = 6, C = 6;
    let clues = {};    // "r,c" → number
    let marks = [];    // 2D: null | 'b' | 'w'
    let solutions = [], solIdx = 0, showing = false;

    function reset() { solutions = []; solIdx = 0; showing = false; }
    function stats(c, t) { const a = $('kurotto-solutionsCount'), b = $('kurotto-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; }
    function nav(show) { const n = $('kurotto-solution-nav'); if (n) n.style.display = show ? 'flex' : 'none'; }

    function readSize() {
        const ri = $('kurotto-rows'), ci = $('kurotto-cols');
        if (ri && ci) { R = Math.max(2, Math.min(15, parseInt(ri.value) || 6)); C = Math.max(2, Math.min(15, parseInt(ci.value) || 6)); ri.value = R; ci.value = C; }
    }

    function emptyGrid() {
        clues = {};
        marks = Array.from({ length: R }, () => new Array(C).fill(null));
    }

    function paint(el, r, c) {
        el.innerHTML = ''; el.className = 'kt-cell';
        const k = r + ',' + c;
        if (k in clues) {
            el.classList.add('clue');
            const circle = document.createElement('div');
            circle.className = 'clue-circle';
            circle.textContent = clues[k];
            el.appendChild(circle);
        }
        if (showing && solutions.length) {
            if (solutions[solIdx]?.[r]?.[c] === 1) el.classList.add('sol-black');
        } else {
            if (marks[r][c] === 'b') el.classList.add('black-mark');
            else if (marks[r][c] === 'w') el.classList.add('white-mark');
        }
    }

    function render() {
        const ct = $('kurotto-grid-container'); if (!ct) return;
        ct.innerHTML = '';
        ct.style.gridTemplateColumns = `repeat(${C},42px)`;
        ct.style.gridTemplateRows = `repeat(${R},42px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div');
            cell.className = 'kt-cell'; cell.dataset.r = r; cell.dataset.c = c;
            paint(cell, r, c);
            bindCell(cell, r, c);
            ct.appendChild(cell);
        }
    }

    function bindCell(cell, r, c) {
        const k = r + ',' + c;
        cell.addEventListener('click', () => {
            if (showing) return;
            // 左键：放置/编辑线索
            if (cell.querySelector('input.ki')) return;
            // 如果已有线索，进入编辑
            cell.classList.add('editing');
            const circle = document.createElement('div');
            circle.className = 'clue-circle';
            const inp = document.createElement('input');
            inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'ki'; inp.maxLength = 3; inp.placeholder = '0';
            if (k in clues) inp.value = clues[k];
            circle.appendChild(inp);
            cell.innerHTML = ''; cell.appendChild(circle);
            inp.focus(); inp.select();
            const commit = () => {
                const v = inp.value.trim();
                if (v === '' || v === '-') { delete clues[k]; }
                else { const n = parseInt(v); if (!isNaN(n) && n >= 0) clues[k] = n; else delete clues[k]; }
                cell.classList.remove('editing');
                paint(cell, r, c);
            };
            inp.addEventListener('blur', commit, { once: true });
            inp.addEventListener('keydown', ev => {
                if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
                else if (ev.key === 'Escape') { inp.value = k in clues ? clues[k] : ''; inp.blur(); }
                else if (ev.key === 'Backspace' || ev.key === 'Delete') { /* allow */ }
                else if (ev.key.length === 1 && !/[0-9]/.test(ev.key)) ev.preventDefault();
            });
        });
        cell.addEventListener('contextmenu', e => {
            e.preventDefault(); if (showing) return;
            if (k in clues) { delete clues[k]; paint(cell, r, c); return; }
            marks[r][c] = marks[r][c] === null ? 'b' : marks[r][c] === 'b' ? 'w' : null;
            paint(cell, r, c);
        });
    }

    /* ── 公共 API ── */
    window.initKurottoGrid = () => { readSize(); reset(); emptyGrid(); render(); stats('-', '-'); nav(false); };
    window.clearKurottoGrid = () => { reset(); marks = Array.from({ length: R }, () => new Array(C).fill(null)); render(); stats('-', '-'); nav(false); };

    // 验证过的 3×3 示例
    //  0  _  2       解:  0  W  2
    //  _  _  _            W  B  B
    //  _  _  _            W  W  W
    // (0,0)=0: 四邻均无黑格 → 0 ✓
    // (0,2)=2: 邻(1,2)=B → BFS: (1,2)连(1,1)=B → count=2 ✓
    window.buildSimpleKurottoExample = () => {
        R = 3; C = 3;
        const ri = $('kurotto-rows'), ci = $('kurotto-cols');
        if (ri) ri.value = 3; if (ci) ci.value = 3;
        reset(); emptyGrid();
        clues['0,0'] = 0;
        clues['0,2'] = 2;
        render(); stats('-', '-'); nav(false);
    };

    window.solveKurottoPuzzleUI = () => {
        if (!window.solveKurotto) return stats('模块未加载', '-');
        if (!Object.keys(clues).length) return stats('需要至少1个线索', '-');
        const t0 = performance.now();
        const res = window.solveKurotto({ rows: R, cols: C, clues });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showKurottoSolution(0); }
    };

    window.showKurottoSolution = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('kurotto-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        const ct = $('kurotto-grid-container'); if (ct) ct.querySelectorAll('.kt-cell').forEach(c => paint(c, +c.dataset.r, +c.dataset.c));
    };
})();
