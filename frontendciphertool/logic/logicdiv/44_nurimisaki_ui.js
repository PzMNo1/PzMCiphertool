(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('nurimisaki-workspace', 'nurimisaki-layout',
        window.LogicUI.backButton('nurimisaki-workspace') +
        window.LogicUI.title('NURIMISAKI', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('nurimisaki-rows', 'nurimisaki-cols', { rowVal: 7, colVal: 7, rowMin: 3, colMin: 3, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initNurimisakiGrid && window.initNurimisakiGrid()' },
            { label: '计算核心分析', onclick: 'window.solveNurimisakiUI && window.solveNurimisakiUI()', id: 'nurimisaki-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearNurimisakiGrid && window.clearNurimisakiGrid()' },
            { label: '简单示例', onclick: 'window.buildNurimisakiExample && window.buildNurimisakiExample()' }
        ]) +
        window.LogicUI.statsPanel('nurimisaki', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('nurimisaki', 'showNurimisakiSol', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击格子: 输入线索数字 (可见白格数,含自身)',
            '右键点击格子: 循环 无标记→黑格→白格',
            '键盘: 数字键填写, 方向键导航',
            '线索格(岬角)恰有1个白邻居; 非线索白格≥2个白邻居',
            '无2×2同色块; 所有白格必须连通'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="nurimisaki-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;"></div>`,
        `#nurimisaki-grid-container{gap:1px}
        .nm-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700}
        .nm-cell:hover{background:rgba(0,255,231,.1)}
        .nm-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .nm-cell.black-mark{background:#0a0a14;box-shadow:inset 0 0 10px rgba(0,0,0,.8)}
        .nm-cell.white-mark{background:rgba(0,255,231,.06)}
        .nm-cell.editing{outline:2px solid var(--neon-cyan,#00ffe7);z-index:10;background:rgba(0,255,231,.15)}
        .nm-cell.active-nav{outline:2px solid rgba(0,255,231,.5);z-index:5}
        .nm-cell input.ki{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.95rem;font-weight:700;outline:0;padding:0;margin:0}
        .nm-cell.sol-black{background:#0a0a14;box-shadow:inset 0 0 12px rgba(0,0,0,.9),0 0 4px rgba(0,0,0,.5)}`
    ));

    const $ = id => document.getElementById(id);
    let R = 7, C = 7, clues = {}, marks = [], solutions = [], solIdx = 0, showing = false, sel = null;

    function reset() { solutions = []; solIdx = 0; showing = false; }
    function stats(c, t) { const a = $('nurimisaki-solutionsCount'), b = $('nurimisaki-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; }
    function nav(v) { const n = $('nurimisaki-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; }
    function ct() { return $('nurimisaki-grid-container'); }
    function cellEl(r, c) { const g = ct(); return g && g.querySelector(`.nm-cell[data-r="${r}"][data-c="${c}"]`); }

    function readSize() {
        const ri = $('nurimisaki-rows'), ci = $('nurimisaki-cols');
        if (ri && ci) { R = Math.max(3, Math.min(12, +ri.value || 7)); C = Math.max(3, Math.min(12, +ci.value || 7)); ri.value = R; ci.value = C; }
    }

    function paint(el, r, c) {
        el.innerHTML = ''; el.className = 'nm-cell';
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
            cell.className = 'nm-cell'; cell.dataset.r = r; cell.dataset.c = c;
            paint(cell, r, c); bind(cell, r, c); g.appendChild(cell);
        }
    }

    function select(r, c) {
        sel = { r, c }; const g = ct(); if (!g) return;
        g.querySelectorAll('.nm-cell.active-nav').forEach(e => e.classList.remove('active-nav'));
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
        const ws = $('nurimisaki-workspace');
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

    window.initNurimisakiGrid = () => { readSize(); reset(); clues = {}; marks = Array.from({ length: R }, () => new Array(C).fill(null)); sel = null; render(); stats('-', '-'); nav(false); };
    window.clearNurimisakiGrid = () => { reset(); marks = Array.from({ length: R }, () => new Array(C).fill(null)); render(); stats('-', '-'); nav(false); };
    window.buildNurimisakiExample = () => {
        R = 3; C = 3;
        const ri = $('nurimisaki-rows'), ci = $('nurimisaki-cols');
        if (ri) ri.value = 3; if (ci) ci.value = 3;
        reset(); clues = {}; marks = Array.from({ length: R }, () => new Array(C).fill(null));
        clues['0,2'] = 2; clues['2,1'] = 3;
        render(); stats('-', '-'); nav(false);
    };

    window.solveNurimisakiUI = () => {
        if (!window.solveNurimisaki) return stats('模块未加载', '-');
        if (!Object.keys(clues).length) return stats('需要至少1个线索', '-');
        const t0 = performance.now();
        const res = window.solveNurimisaki({ rows: R, cols: C, clues });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showNurimisakiSol(0); }
    };

    window.showNurimisakiSol = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('nurimisaki-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        const g = ct(); if (g) g.querySelectorAll('.nm-cell').forEach(c => paint(c, +c.dataset.r, +c.dataset.c));
    };
})();
