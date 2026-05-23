(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('tll-workspace', 'tll-layout',
        window.LogicUI.backButton('tll-workspace') +
        window.LogicUI.title('TAPA LIKE LOOP', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.singleSizeInput('tll-size', { val: 6, min: 3, max: 10, placeholder: '网格尺寸' }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initTllGrid && window.initTllGrid()' },
            { label: '计算核心分析', onclick: 'window.solveTllPuzzleUI && window.solveTllPuzzleUI()', id: 'tll-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearTllGrid && window.clearTllGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleTllExample && window.buildSimpleTllExample()' }
        ]) +
        window.LogicUI.statsPanel('tll', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('tll', 'showTllSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击格子输入 Tapa 线索（多数字空格分隔，如 "1 3"）',
            '线索表示周围8格中回路连续段长度',
            '回路连通不交叉，线索格不属于回路'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="tll-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block"></div>`,
        `.tll-wrap{position:relative;display:inline-block}
        .tll-grid{display:inline-grid;gap:0}
        .tll-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);position:relative;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:var(--neon-cyan);font-weight:700;user-select:none}
        .tll-cell:hover{background:rgba(0,255,231,.08)}
        .tll-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6);background:rgba(0,0,0,.35);font-size:.85rem}
        .tll-cell.loop-on{background:rgba(0,255,231,.12)}
        .tll-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}
        .tll-cell input.tll-inp{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.8rem;font-weight:700;outline:0;padding:0;margin:0}
        .tll-edge{position:absolute;z-index:5;border-radius:2px;pointer-events:none}
        .tll-edge.h{height:4px;background:#00ffe7;box-shadow:0 0 6px rgba(0,255,231,.5)}
        .tll-edge.v{width:4px;background:#00ffe7;box-shadow:0 0 6px rgba(0,255,231,.5)}
        .tll-dot{position:absolute;width:8px;height:8px;border-radius:50%;background:#00ffe7;box-shadow:0 0 6px #00ffe7;z-index:6;pointer-events:none}`
    ));

    const $ = id => document.getElementById(id), S = 42;
    let N = 6, clues = {}, solutions = [], solIdx = 0, showing = false;
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('tll-solutionsCount'), b = $('tll-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('tll-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const readSize = () => { const si = $('tll-size'); if (si) { N = Math.max(3, Math.min(10, +si.value || 6)); si.value = N; } };

    // Helper: is cell (r,c) in the loop for current solution?
    function inLoop(sol, r, c) {
        return (r > 0 && sol.v[r - 1]?.[c]) || (c > 0 && sol.h[r]?.[c - 1]) || sol.h[r]?.[c] || sol.v[r]?.[c];
    }

    function render() {
        const ct = $('tll-grid-container'); if (!ct) return; ct.innerHTML = '';
        const wrap = document.createElement('div'); wrap.className = 'tll-wrap';
        wrap.style.cssText = `width:${N * S}px;height:${N * S}px`;
        const g = document.createElement('div'); g.className = 'tll-grid';
        g.style.gridTemplateColumns = `repeat(${N},${S}px)`;
        const sol = showing ? solutions[solIdx] : null;

        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            const cell = document.createElement('div'), k = r + ',' + c;
            cell.className = 'tll-cell';
            if (k in clues) { cell.classList.add('clue'); cell.textContent = clues[k].join(' '); }
            if (sol && inLoop(sol, r, c)) cell.classList.add('loop-on');
            if (!showing) cell.onclick = () => {
                cell.classList.add('editing');
                const inp = document.createElement('input');
                inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'tll-inp'; inp.maxLength = 8;
                if (k in clues) inp.value = clues[k].join(' ');
                cell.textContent = ''; cell.appendChild(inp); inp.focus();
                const commit = () => {
                    const nums = (inp.value.match(/[1-8]/g) || []).map(Number);
                    if (nums.length) clues[k] = nums; else delete clues[k];
                    cell.classList.remove('editing'); render();
                };
                inp.addEventListener('blur', commit, { once: true });
                inp.onkeydown = ev => { if (ev.key === 'Enter') inp.blur(); else if (ev.key === 'Escape') { inp.value = ''; inp.blur(); } };
            };
            g.appendChild(cell);
        }
        wrap.appendChild(g);

        // Draw loop overlay (edges + dots) in a single pass
        if (sol) {
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
                if (!inLoop(sol, r, c)) continue;
                // Dot at cell center
                const dot = document.createElement('div'); dot.className = 'tll-dot';
                dot.style.cssText = `left:${c * S + S / 2 - 4}px;top:${r * S + S / 2 - 4}px`;
                wrap.appendChild(dot);
                // Right edge
                if (sol.h[r]?.[c]) {
                    const e = document.createElement('div'); e.className = 'tll-edge h';
                    e.style.cssText = `left:${c * S + S * .4}px;top:${r * S + S / 2 - 2}px;width:${S}px`;
                    wrap.appendChild(e);
                }
                // Down edge
                if (sol.v[r]?.[c]) {
                    const e = document.createElement('div'); e.className = 'tll-edge v';
                    e.style.cssText = `left:${c * S + S / 2 - 2}px;top:${r * S + S * .4}px;height:${S}px`;
                    wrap.appendChild(e);
                }
            }
        }
        ct.appendChild(wrap);
    }

    window.initTllGrid = () => { readSize(); reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.clearTllGrid = () => { reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.buildSimpleTllExample = () => {
        N = 5; const si = $('tll-size'); if (si) si.value = 5;
        reset(); clues = { '2,2': [8] };
        render(); stats('-', '-'); nav(false);
    };
    window.solveTllPuzzleUI = () => {
        if (!window.solveTLL) return stats('模块未加载', '-');
        const t0 = performance.now(), res = window.solveTLL({ size: N, clues });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showTllSolution(0); }
    };
    window.showTllSolution = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('tll-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
