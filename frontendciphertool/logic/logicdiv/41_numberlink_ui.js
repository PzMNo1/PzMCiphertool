(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    /* ── color palette for up to 9 number pairs ── */
    const PAIR_COLORS = [
        '#ff4081', '#00e5ff', '#76ff03', '#ffab00', '#e040fb',
        '#00e676', '#ff6e40', '#448aff', '#eeff41'
    ];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('numberlink-workspace', 'numberlink-layout',
        window.LogicUI.backButton('numberlink-workspace') +
        window.LogicUI.title('NUMBERLINK', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('nl-rows', 'nl-cols', { rowVal: 5, colVal: 5, rowMin: 3, colMin: 3, rowMax: 10, colMax: 10 }) +
        `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
            <label style="color:#aaa;font-size:.85rem">
                <input type="checkbox" id="nl-useall" checked style="accent-color:#0ff;margin-right:4px">填满所有格子
            </label>
        </div>` +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initNLGrid && window.initNLGrid()' },
            { label: '计算核心分析', onclick: 'window.solveNLPuzzleUI && window.solveNLPuzzleUI()', id: 'nl-solve-btn', glow: true },
            { label: '清空线索', onclick: 'window.clearNLGrid && window.clearNLGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleNLExample && window.buildSimpleNLExample()' }
        ]) +
        window.LogicUI.statsPanel('nl', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('nl', 'showNLSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击格子: 输入数字(1-9), 相同数字成对',
            '右键: 清除该格',
            '求解后显示连线路径',
            '路径不可交叉, 可勾选"填满所有格子"'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="nl-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block;"></div>`,
        `.nl-grid{display:inline-grid;gap:0}
        .nl-cell{width:40px;height:40px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:700;font-size:1.1rem;color:#fff;user-select:none;position:relative;box-sizing:border-box;transition:background .1s}
        .nl-cell:hover{background:rgba(0,255,231,.08)}
        .nl-cell.selected{box-shadow:inset 0 0 0 2px #0ff}
        .nl-path{position:absolute;pointer-events:none}
        .nl-path.seg-h{height:6px;top:17px;border-radius:3px}
        .nl-path.seg-v{width:6px;left:17px;border-radius:3px}
        .nl-path.seg-dot{width:14px;height:14px;border-radius:50%;top:13px;left:13px}
        .nl-clue-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;color:#111;z-index:2}`
    ));

    const $ = id => document.getElementById(id), S = 40;
    let R = 5, C = 5, clues = {}, selected = null;
    let solutions = [], solIdx = 0, showing = false;
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('nl-solutionsCount'), b = $('nl-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('nl-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('nl-rows'), ci = $('nl-cols'); if (ri && ci) { R = Math.max(3, Math.min(10, +ri.value || 5)); C = Math.max(3, Math.min(10, +ci.value || 5)); ri.value = R; ci.value = C; } };
    const pairColor = n => PAIR_COLORS[(n - 1) % PAIR_COLORS.length];

    function render() {
        const ct = $('nl-grid-container'); if (!ct) return;
        ct.innerHTML = '';
        const g = document.createElement('div'); g.className = 'nl-grid';
        g.style.gridTemplateColumns = `repeat(${C},${S}px)`;
        g.style.gridTemplateRows = `repeat(${R},${S}px)`;
        const sol = showing && solutions.length ? solutions[solIdx] : null;
        // build owner map from solution for coloring paths
        let ownerMap = null, pairMap = {};
        if (sol) {
            // collect pairs from clues
            for (const k in clues) { const v = clues[k]; (pairMap[v] = pairMap[v] || []).push(k); }
            // trace paths to build owner grid
            ownerMap = Array.from({ length: R }, () => new Array(C).fill(-1));
            const DI = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
            let pidx = 0;
            for (const v in pairMap) {
                const [sk] = pairMap[v];
                const [sr, sc] = sk.split(',').map(Number);
                let r = sr, c = sc;
                while (true) {
                    ownerMap[r][c] = pidx;
                    const d = sol[r][c];
                    if (!d) break;
                    const [dr, dc] = DI[d];
                    r += dr; c += dc;
                }
                pidx++;
            }
        }
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.className = 'nl-cell';
            const k = r + ',' + c;
            // clue dot
            if (k in clues) {
                const dot = document.createElement('div'); dot.className = 'nl-clue-dot';
                dot.style.background = pairColor(clues[k]);
                dot.textContent = clues[k];
                cell.appendChild(dot);
            }
            // solution path segments
            if (sol && ownerMap) {
                const pidx = ownerMap[r][c];
                if (pidx >= 0) {
                    const col = PAIR_COLORS[pidx % PAIR_COLORS.length];
                    const d = sol[r][c];
                    // draw a dot at cell center (for path presence)
                    if (!(k in clues)) {
                        const dot = document.createElement('div'); dot.className = 'nl-path seg-dot';
                        dot.style.background = col; cell.appendChild(dot);
                    }
                    // draw segment toward direction
                    if (d === 'R') { const s = document.createElement('div'); s.className = 'nl-path seg-h'; s.style.left = '17px'; s.style.width = '23px'; s.style.background = col; cell.appendChild(s); }
                    if (d === 'L') { const s = document.createElement('div'); s.className = 'nl-path seg-h'; s.style.left = '0'; s.style.width = '23px'; s.style.background = col; cell.appendChild(s); }
                    if (d === 'D') { const s = document.createElement('div'); s.className = 'nl-path seg-v'; s.style.top = '17px'; s.style.height = '23px'; s.style.background = col; cell.appendChild(s); }
                    if (d === 'U') { const s = document.createElement('div'); s.className = 'nl-path seg-v'; s.style.top = '0'; s.style.height = '23px'; s.style.background = col; cell.appendChild(s); }
                    // incoming segment (from neighbor pointing here)
                    const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
                    const DINB = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
                    for (const dd of ['U', 'D', 'L', 'R']) {
                        const [dr, dc] = DINB[dd];
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < R && nc >= 0 && nc < C && sol[nr][nc] === OPP[dd] && ownerMap[nr][nc] === pidx) {
                            // already drawn from that cell
                        }
                    }
                }
            }
            if (!showing) {
                cell.addEventListener('click', () => {
                    if (selected && selected.r === r && selected.c === c) {
                        // cycle number
                        const cur = clues[k] || 0;
                        if (cur < 9) clues[k] = cur + 1; else delete clues[k];
                    } else {
                        selected = { r, c };
                        if (!(k in clues)) clues[k] = 1;
                    }
                    render();
                });
                cell.addEventListener('contextmenu', e => { e.preventDefault(); delete clues[k]; render(); });
                if (selected && selected.r === r && selected.c === c) cell.classList.add('selected');
            }
            g.appendChild(cell);
        }
        ct.appendChild(g);
    }

    window.initNLGrid = () => { readSize(); reset(); clues = {}; selected = null; render(); stats('-', '-'); nav(false); };
    window.clearNLGrid = () => { reset(); clues = {}; selected = null; render(); stats('-', '-'); nav(false); };
    window.buildSimpleNLExample = () => {
        R = 5; C = 5; const ri = $('nl-rows'), ci = $('nl-cols'); if (ri) ri.value = 5; if (ci) ci.value = 5;
        reset(); selected = null;
        // 3 pairs on a 5x5 grid
        clues = { '0,0': 1, '4,4': 1, '0,4': 2, '4,0': 2, '2,0': 3, '2,4': 3 };
        render(); stats('-', '-'); nav(false);
    };

    window.solveNLPuzzleUI = () => {
        if (!window.solveNumberlink) return stats('模块未加载', '-');
        const ua = $('nl-useall'); const useAll = ua ? ua.checked : true;
        const t0 = performance.now();
        const res = window.solveNumberlink({ rows: R, cols: C, clues, useAll });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showNLSolution(0); }
    };
    window.showNLSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('nl-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
