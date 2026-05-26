(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('shikaku-workspace', 'shikaku-layout',
        window.LogicUI.backButton('shikaku-workspace') +
        window.LogicUI.title('SHIKAKU', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('shk-rows', 'shk-cols', { rowVal: 7, colVal: 7, rowMin: 2, colMin: 2, rowMax: 15, colMax: 15 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initShikakuGrid && window.initShikakuGrid()' },
            { label: '计算核心分析', onclick: 'window.solveShikakuPuzzleUI && window.solveShikakuPuzzleUI()', id: 'shk-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearShikakuGrid && window.clearShikakuGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleShikakuExample && window.buildSimpleShikakuExample()' }
        ]) +
        window.LogicUI.statsPanel('shk', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('shk', 'showShikakuSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击格子输入数字（矩形面积线索）',
            '将整个网格划分为若干矩形',
            '每个矩形恰好包含一个数字，数字等于矩形面积',
            '支持键盘方向键移动、数字键输入、Delete 清除'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

        `<div id="shk-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;user-select:none"></div>`,

        `#shk-grid-container{gap:0}
        .shk-cell{width:42px;height:42px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative;cursor:pointer;user-select:none;box-sizing:border-box}
        .shk-cell:hover{background:rgba(0,255,231,.08)}
        .shk-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .shk-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}
        .shk-cell input.shk-inp{width:100%;height:100%;border:0;background:transparent;color:#fff;text-align:center;font-size:.95rem;font-weight:700;outline:0;padding:0;margin:0}
        .shk-cell.bt{border-top:3px solid var(--hologram-purple,#b388ff)!important}
        .shk-cell.bb{border-bottom:3px solid var(--hologram-purple,#b388ff)!important}
        .shk-cell.bl{border-left:3px solid var(--hologram-purple,#b388ff)!important}
        .shk-cell.br{border-right:3px solid var(--hologram-purple,#b388ff)!important}`
    ));

    const $ = id => document.getElementById(id);
    let R = 7, C = 7, clues = {}, solutions = [], solIdx = 0, showing = false;
    const CL = ['rgba(0,255,231,.12)','rgba(178,102,255,.12)','rgba(255,64,129,.12)','rgba(0,176,255,.12)','rgba(255,214,0,.12)','rgba(105,240,174,.12)','rgba(255,138,101,.12)','rgba(130,177,255,.12)','rgba(255,82,82,.12)','rgba(0,230,118,.12)','rgba(234,128,252,.12)','rgba(100,255,218,.12)','rgba(255,171,64,.12)','rgba(64,196,255,.12)','rgba(255,110,64,.12)','rgba(29,233,182,.12)','rgba(213,0,249,.12)','rgba(0,200,83,.12)','rgba(255,61,0,.12)','rgba(24,255,255,.12)'];
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('shk-solutionsCount'), b = $('shk-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('shk-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('shk-rows'), ci = $('shk-cols'); if (ri && ci) { R = Math.max(2, Math.min(15, +ri.value || 7)); C = Math.max(2, Math.min(15, +ci.value || 7)); ri.value = R; ci.value = C; } };

    function render () {
        const g = $('shk-grid-container'); if (!g) return;
        g.innerHTML = ''; g.style.gridTemplateColumns = `repeat(${C},42px)`; g.style.gridTemplateRows = `repeat(${R},42px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'), k = r + ',' + c;
            cell.className = 'shk-cell'; cell.dataset.r = r; cell.dataset.c = c;
            if (r === 0) cell.classList.add('bt'); if (r === R - 1) cell.classList.add('bb');
            if (c === 0) cell.classList.add('bl'); if (c === C - 1) cell.classList.add('br');
            if (k in clues) { cell.classList.add('clue'); cell.textContent = clues[k]; }
            cell.onclick = () => {
                if (showing) return;
                cell.classList.add('editing');
                const inp = document.createElement('input');
                inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'shk-inp'; inp.maxLength = 3;
                if (k in clues) inp.value = clues[k];
                cell.textContent = ''; cell.appendChild(inp); inp.focus();
                const commit = () => { const n = parseInt(inp.value); if (n > 0) clues[k] = n; else delete clues[k]; render(); };
                inp.addEventListener('blur', commit, { once: true });
                inp.onkeydown = ev => {
                    if (ev.key === 'Enter') inp.blur();
                    else if (ev.key === 'Escape') { inp.value = ''; inp.blur(); }
                    else if (ev.key.startsWith('Arrow')) {
                        ev.preventDefault(); inp.blur();
                        let nr = r, nc = c;
                        if (ev.key === 'ArrowUp' && nr > 0) nr--; if (ev.key === 'ArrowDown' && nr < R - 1) nr++;
                        if (ev.key === 'ArrowLeft' && nc > 0) nc--; if (ev.key === 'ArrowRight' && nc < C - 1) nc++;
                        setTimeout(() => { const nx = g.querySelector(`.shk-cell[data-r="${nr}"][data-c="${nc}"]`); if (nx) nx.click(); }, 30);
                    }
                };
            };
            g.appendChild(cell);
        }
        if (showing && solutions[solIdx]) {
            const sol = solutions[solIdx];
            g.querySelectorAll('.shk-cell').forEach(cell => {
                const r = +cell.dataset.r, c = +cell.dataset.c, id = sol[r][c];
                cell.style.background = CL[id % CL.length];
                cell.classList.remove('bt', 'bb', 'bl', 'br');
                if (r === 0 || sol[r - 1][c] !== id) cell.classList.add('bt');
                if (r === R - 1 || sol[r + 1][c] !== id) cell.classList.add('bb');
                if (c === 0 || sol[r][c - 1] !== id) cell.classList.add('bl');
                if (c === C - 1 || sol[r][c + 1] !== id) cell.classList.add('br');
            });
        }
    }

    window.initShikakuGrid = () => { readSize(); reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.clearShikakuGrid = () => { reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.buildSimpleShikakuExample = () => {
        R = 4; C = 4; const ri = $('shk-rows'), ci = $('shk-cols');
        if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); clues = { '0,0': 4, '0,2': 4, '2,0': 4, '2,2': 4 };
        render(); stats('-', '-'); nav(false);
    };
    window.solveShikakuPuzzleUI = () => {
        if (!window.solveShikaku) return stats('模块未加载', '-');
        if (!Object.keys(clues).length) return stats('请先输入线索', '-');
        const t0 = performance.now(), res = window.solveShikaku({ rows: R, cols: C, clues });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showShikakuSolution(0); }
    };
    window.showShikakuSolution = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('shk-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
