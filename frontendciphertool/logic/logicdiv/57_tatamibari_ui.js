(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('tatamibari-workspace', 'tatamibari-layout',
        window.LogicUI.backButton('tatamibari-workspace') +
        window.LogicUI.title('TATAMIBARI', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('ttb-rows', 'ttb-cols', { rowVal: 6, colVal: 6, rowMin: 2, colMin: 2, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initTatamibariGrid && window.initTatamibariGrid()' },
            { label: '计算核心分析', onclick: 'window.solveTatamibariUI && window.solveTatamibariUI()', id: 'ttb-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearTatamibariGrid && window.clearTatamibariGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleTatamibariExample && window.buildSimpleTatamibariExample()' }
        ]) +
        `<div style="margin-bottom:1.5rem;display:flex;gap:10px"><button class="cyber-button" style="flex:1" id="ttb-symbol-btn" onclick="window.cycleTtbSymbol && window.cycleTtbSymbol()"><span class="cyber-button__tag">当前符号: +</span></button></div>` +
        window.LogicUI.statsPanel('ttb', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('ttb', 'showTatamibariSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击格子放置/清除当前符号（+/-/|）',
            '+ 正方形 | - 横长 | | 竖长',
            '每个矩形恰含一个符号，不允许四区交角'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="ttb-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;user-select:none"></div>`,
        `#ttb-grid-container{gap:0}
        .ttb-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.3rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
        .ttb-cell:hover{background:rgba(0,255,231,.08)}
        .ttb-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .ttb-cell.bt{border-top:3px solid var(--neon-cyan)}.ttb-cell.bb{border-bottom:3px solid var(--neon-cyan)}.ttb-cell.bl{border-left:3px solid var(--neon-cyan)}.ttb-cell.br{border-right:3px solid var(--neon-cyan)}
        .ttb-region-color{opacity:.18;position:absolute;inset:0;pointer-events:none}`
    ));

    const $ = id => document.getElementById(id);
    const SYM = ['+', '-', '|'], COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6ec7','#845ec2','#ffc75f','#00c9a7','#c34a36','#008f7a'];
    let R = 6, C = 6, clues = {}, sols = [], si = 0, show = false, sym = 0;

    const reset = () => { sols = []; si = 0; show = false; };
    const st = (c, t) => { const a = $('ttb-solutionsCount'), b = $('ttb-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nv = v => { const n = $('ttb-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const rdSz = () => { const ri = $('ttb-rows'), ci = $('ttb-cols'); if (ri && ci) { R = Math.max(2, Math.min(12, +ri.value || 6)); C = Math.max(2, Math.min(12, +ci.value || 6)); ri.value = R; ci.value = C; } };

    function render() {
        const g = $('ttb-grid-container'); if (!g) return;
        g.innerHTML = ''; g.style.gridTemplateColumns = `repeat(${C},42px)`; g.style.gridTemplateRows = `repeat(${R},42px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'), k = r + ',' + c;
            cell.className = 'ttb-cell'; cell.dataset.r = r; cell.dataset.c = c;
            if (r === 0) cell.classList.add('bt'); if (r === R - 1) cell.classList.add('bb');
            if (c === 0) cell.classList.add('bl'); if (c === C - 1) cell.classList.add('br');
            if (k in clues) { cell.classList.add('clue'); cell.textContent = clues[k]; }
            cell.onclick = () => { if (show) return; (k in clues && clues[k] === SYM[sym]) ? delete clues[k] : clues[k] = SYM[sym]; reset(); render(); st('-', '-'); nv(false); };
            g.appendChild(cell);
        }
        if (show && sols[si]) {
            const sol = sols[si], cells = g.querySelectorAll('.ttb-cell'), reg = {};
            for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
                const id = sol[r][c]; if (id < 0) continue;
                if (!(id in reg)) reg[id] = { r0: r, r1: r, c0: c, c1: c };
                else { reg[id].r0 = Math.min(reg[id].r0, r); reg[id].r1 = Math.max(reg[id].r1, r); reg[id].c0 = Math.min(reg[id].c0, c); reg[id].c1 = Math.max(reg[id].c1, c); }
            }
            for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
                const cell = cells[r * C + c], id = sol[r][c]; if (id < 0) continue;
                const b = reg[id]; cell.classList.remove('bt', 'bb', 'bl', 'br');
                if (r === b.r0) cell.classList.add('bt'); if (r === b.r1) cell.classList.add('bb');
                if (c === b.c0) cell.classList.add('bl'); if (c === b.c1) cell.classList.add('br');
                const ov = document.createElement('div'); ov.className = 'ttb-region-color'; ov.style.background = COLORS[id % COLORS.length]; cell.appendChild(ov);
            }
        }
    }

    window.cycleTtbSymbol = () => { sym = (sym + 1) % 3; const b = $('ttb-symbol-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = '当前符号: ' + SYM[sym]; };
    window.initTatamibariGrid = () => { rdSz(); reset(); clues = {}; sym = 0; const b = $('ttb-symbol-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = '当前符号: +'; render(); st('-', '-'); nv(false); };
    window.clearTatamibariGrid = () => { reset(); clues = {}; render(); st('-', '-'); nv(false); };

    window.buildSimpleTatamibariExample = () => {
        R = 4; C = 4; const ri = $('ttb-rows'), ci = $('ttb-cols'); if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); clues = { '0,2': '-', '2,0': '|', '1,2': '-', '3,1': '-' };
        render(); st('-', '-'); nv(false);
    };

    window.solveTatamibariUI = () => {
        if (!window.solveTatamibari) return st('模块未加载', '-');
        if (!Object.keys(clues).length) return st('请先放置符号', '-');
        const t0 = performance.now(), res = window.solveTatamibari({ rows: R, cols: C, clues });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        sols = res.solutions || [];
        st(res.timeout ? sols.length + '+ (超时)' : (sols.length || '未找到解'), ms);
        if (sols.length) { show = true; si = 0; nv(true); window.showTatamibariSolution(0); }
        else { show = false; nv(false); render(); }
    };

    window.showTatamibariSolution = d => {
        if (!sols.length) return;
        si = (si + d + sols.length) % sols.length;
        const ctr = $('ttb-solution-counter'); if (ctr) ctr.textContent = (si + 1) + ' / ' + sols.length;
        render();
    };
})();
