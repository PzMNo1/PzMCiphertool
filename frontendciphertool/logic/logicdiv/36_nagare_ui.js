(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('nagare-workspace', 'nagare-layout',
        window.LogicUI.backButton('nagare-workspace') +
        window.LogicUI.title('NAGARE', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('ng-rows', 'ng-cols', { rowVal: 5, colVal: 5, rowMin: 3, colMin: 3, rowMax: 10, colMax: 10 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initNGGrid && window.initNGGrid()' },
            { label: '计算核心分析', onclick: 'window.solveNGPuzzleUI && window.solveNGPuzzleUI()', id: 'ng-solve-btn', glow: true },
            { label: '清空标记', onclick: 'window.clearNGGrid && window.clearNGGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleNGExample && window.buildSimpleNGExample()' }
        ]) +
        window.LogicUI.statsPanel('ng', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('ng', 'showNGSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击: 循环 空 → ⬛黑格 → 💨Wind → 🛤Path',
            '右键点击: 旋转方向 ↑→↓→←→↑',
            'Wind(💨): 沿方向吹风，影响路径流向',
            'Path(🛤): 强制回路在该格的出口方向'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="ng-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block;"></div>`,
        `.ng-wrap{position:relative;display:inline-block}
        .ng-grid{display:inline-grid;gap:0}
        .ng-cell{width:40px;height:40px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);position:relative;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.95rem;user-select:none;transition:background .15s}
        .ng-cell:hover{background:rgba(0,255,231,.08)}
        .ng-cell.black{background:rgba(255,255,255,.15)}
        .ng-cell.wind{color:#7df;font-weight:700;text-shadow:0 0 6px #7df}
        .ng-cell.path{color:#fc0;font-weight:700;text-shadow:0 0 6px #fc0}
        .ng-edge{position:absolute;z-index:3}
        .ng-edge.h{height:4px;border-radius:2px}
        .ng-edge.v{width:4px;border-radius:2px}
        .ng-edge.on{background:#00ffe7;box-shadow:0 0 6px rgba(0,255,231,.5)}
        .ng-arrow{position:absolute;z-index:4;color:#00ffe7;font-size:.7rem;pointer-events:none;text-shadow:0 0 4px #00ffe7}`
    ));

    const $ = id => document.getElementById(id), S = 40;
    let R = 5, C = 5, clues = {};
    let solutions = [], solIdx = 0, showing = false;
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('ng-solutionsCount'), b = $('ng-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('ng-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('ng-rows'), ci = $('ng-cols'); if (ri && ci) { R = Math.max(3, Math.min(10, +ri.value || 5)); C = Math.max(3, Math.min(10, +ci.value || 5)); ri.value = R; ci.value = C; } };
    const ARROWS = { U: '↑', D: '↓', L: '←', R: '→' };
    const DIR_ORDER = ['R', 'D', 'L', 'U']; // rotation order for right-click

    function nextDir(d) { return DIR_ORDER[(DIR_ORDER.indexOf(d) + 1) % 4]; }

    // Left-click cycle: empty → black → wind-R → path-R → empty
    function cycleClue(k) {
        const v = clues[k];
        if (!v) clues[k] = 'black';
        else if (v === 'black') clues[k] = 'wind-R';
        else if (v.startsWith('wind-')) clues[k] = 'path-R';
        else delete clues[k];
    }

    // Right-click: rotate direction (wind/path only), or reverse cycle type
    function rotateOrReverse(k) {
        const v = clues[k];
        if (!v) return;
        if (v === 'black') { delete clues[k]; return; } // reverse: remove
        const prefix = v.substring(0, 5); // "wind-" or "path-"
        const dir = v[5];
        clues[k] = prefix + nextDir(dir);
    }

    function render() {
        const ct = $('ng-grid-container'); if (!ct) return;
        ct.innerHTML = '';
        const wrap = document.createElement('div'); wrap.className = 'ng-wrap';
        wrap.style.width = C * S + 'px'; wrap.style.height = R * S + 'px';
        const g = document.createElement('div'); g.className = 'ng-grid';
        g.style.gridTemplateColumns = `repeat(${C},${S}px)`;
        g.style.gridTemplateRows = `repeat(${R},${S}px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.className = 'ng-cell';
            const k = r + ',' + c;
            if (k in clues) {
                const v = clues[k];
                if (v === 'black') cell.classList.add('black');
                else if (v.startsWith('wind-')) { cell.classList.add('wind'); cell.textContent = '💨' + ARROWS[v[5]]; }
                else if (v.startsWith('path-')) { cell.classList.add('path'); cell.textContent = '🛤' + ARROWS[v[5]]; }
            }
            if (!showing) {
                cell.addEventListener('click', () => { cycleClue(k); render(); });
                cell.addEventListener('contextmenu', e => { e.preventDefault(); rotateOrReverse(k); render(); });
            }
            g.appendChild(cell);
        }
        wrap.appendChild(g);
        // solution edges
        const sol = showing && solutions.length ? solutions[solIdx] : null;
        if (sol) {
            for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) {
                const v = sol.h[r][c]; if (!v || v === 2) continue;
                const e = document.createElement('div'); e.className = 'ng-edge h on';
                e.style.left = (c * S + S / 2) + 'px'; e.style.top = (r * S + S / 2 - 2) + 'px'; e.style.width = S + 'px';
                wrap.appendChild(e);
                const ar = document.createElement('div'); ar.className = 'ng-arrow';
                ar.textContent = v === 1 ? '▶' : '◀';
                ar.style.left = (c * S + S - 4) + 'px'; ar.style.top = (r * S + S / 2 - 7) + 'px';
                wrap.appendChild(ar);
            }
            for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) {
                const v = sol.v[r][c]; if (!v || v === 2) continue;
                const e = document.createElement('div'); e.className = 'ng-edge v on';
                e.style.left = (c * S + S / 2 - 2) + 'px'; e.style.top = (r * S + S / 2) + 'px'; e.style.height = S + 'px';
                wrap.appendChild(e);
                const ar = document.createElement('div'); ar.className = 'ng-arrow';
                ar.textContent = v === 1 ? '▼' : '▲';
                ar.style.left = (c * S + S / 2 - 5) + 'px'; ar.style.top = (r * S + S - 4) + 'px';
                wrap.appendChild(ar);
            }
        }
        ct.appendChild(wrap);
    }

    window.initNGGrid = () => { readSize(); reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.clearNGGrid = () => { reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.buildSimpleNGExample = () => {
        R = 4; C = 4; const ri = $('ng-rows'), ci = $('ng-cols'); if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); clues = { '1,1': 'black', '0,0': 'wind-R', '3,3': 'wind-L' };
        render(); stats('-', '-'); nav(false);
    };

    window.solveNGPuzzleUI = () => {
        if (!window.solveNagare) return stats('模块未加载', '-');
        const t0 = performance.now();
        const res = window.solveNagare({ rows: R, cols: C, clues });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showNGSolution(0); }
    };
    window.showNGSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('ng-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
