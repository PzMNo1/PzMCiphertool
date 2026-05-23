// 56_tapa_ui.js — Tapa UI (LogicUI factory)
(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('tapa-workspace', 'tapa-layout',
        window.LogicUI.backButton('tapa-workspace') +
        window.LogicUI.title('TAPA', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.singleSizeInput('tapa-size', { val: 7, min: 3, max: 12, placeholder: '网格大小 (N×N)' }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initTapaGrid && window.initTapaGrid()' },
            { label: '计算核心分析', onclick: 'window.solveTapaPuzzleUI && window.solveTapaPuzzleUI()', id: 'tapa-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearTapaGrid && window.clearTapaGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleTapaExample && window.buildSimpleTapaExample()' }
        ]) +
        window.LogicUI.statsPanel('tapa', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('tapa', 'showTapaSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击格子输入线索 (空格分隔, 如 "1 3")',
            '线索 = 8邻域涂黑格的连续段长度',
            '涂黑格须正交连通, 禁止 2×2 全黑',
            '线索格自身始终留白'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="tapa-grid-container"></div>`,
        `#tapa-grid-container{display:inline-grid;gap:0;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);user-select:none}
        .tapa-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);font-size:.75rem;color:var(--neon-cyan,#00ffe7);font-weight:700;cursor:pointer;transition:background .15s}
        .tapa-cell:hover{background:rgba(0,255,231,.08)}
        .tapa-cell.clue-cell{background:rgba(0,229,255,.12);color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6);cursor:text}
        .tapa-cell.solved-shaded{background:rgba(0,200,0,.35);border-color:rgba(0,200,0,.5);box-shadow:inset 0 0 6px rgba(0,255,0,.2)}
        .tapa-cell input.tapa-inp{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.72rem;font-weight:700;outline:0}
        .tapa-cell .tapa-clue-display{pointer-events:none;font-size:.72rem;line-height:1.1;text-align:center}`
    ));

    const $ = id => document.getElementById(id);
    let N = 7, clues = {}, sols = [], si = 0, showing = false;
    const reset = () => { sols = []; si = 0; showing = false; };
    const st = (c, t) => { const a = $('tapa-solutionsCount'), b = $('tapa-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nv = v => { const n = $('tapa-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };

    function render() {
        const g = $('tapa-grid-container'); if (!g) return;
        g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${N},42px)`;
        g.style.gridTemplateRows = `repeat(${N},42px)`;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            const cell = document.createElement('div'), k = r + ',' + c;
            cell.className = 'tapa-cell';
            if (k in clues) {
                cell.classList.add('clue-cell');
                const d = document.createElement('span');
                d.className = 'tapa-clue-display'; d.textContent = clues[k].join(' ');
                cell.appendChild(d);
            }
            if (showing && sols[si] && sols[si][r][c] === 1 && !(k in clues)) cell.classList.add('solved-shaded');
            cell.onclick = () => {
                if (showing) return;
                cell.innerHTML = ''; cell.classList.add('clue-cell');
                const inp = document.createElement('input');
                inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'tapa-inp'; inp.maxLength = 10;
                if (k in clues) inp.value = clues[k].join(' ');
                cell.appendChild(inp); inp.focus();
                const commit = () => {
                    const nums = (inp.value.trim().match(/\d+/g) || []).map(Number).filter(n => n >= 0);
                    nums.length ? clues[k] = nums : delete clues[k];
                    render();
                };
                inp.addEventListener('blur', commit, { once: true });
                inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); else if (e.key === 'Escape') { inp.value = ''; inp.blur(); } };
            };
            g.appendChild(cell);
        }
    }

    window.initTapaGrid = () => {
        const s = $('tapa-size'); if (s) { N = Math.max(3, Math.min(12, +s.value || 7)); s.value = N; }
        reset(); clues = {}; render(); st('-', '-'); nv(false);
    };
    window.clearTapaGrid = () => { reset(); clues = {}; render(); st('-', '-'); nv(false); };

    window.buildSimpleTapaExample = () => {
        N = 5; const s = $('tapa-size'); if (s) s.value = 5;
        reset(); clues = {};
        // Verified 5×5:  .....  / ■■.■■ / .■.■. / .■■■. / .....
        clues['0,0'] = [2]; clues['0,2'] = [1, 1]; clues['0,4'] = [2];
        clues['2,2'] = [7]; clues['4,2'] = [3];
        render(); st('-', '-'); nv(false);
    };

    window.solveTapaPuzzleUI = () => {
        if (!window.solveTapa) return st('模块未加载', '-');
        reset();
        const pc = {}; for (const k in clues) pc[k] = clues[k].slice();
        if (!Object.keys(pc).length) return st('请先输入线索', '-');
        const t0 = performance.now(), res = window.solveTapa({ rows: N, cols: N, clues: pc });
        const ms = Math.round(performance.now() - t0) + 'ms';
        sols = res.solutions || [];
        st(res.timeout ? sols.length + '+ (超时)' : (sols.length || '未找到解'), ms);
        if (sols.length) { showing = true; si = 0; nv(true); window.showTapaSolution(0); } else render();
    };

    window.showTapaSolution = delta => {
        if (!sols.length) return;
        si = (si + delta + sols.length) % sols.length;
        const ctr = $('tapa-solution-counter'); if (ctr) ctr.textContent = (si + 1) + ' / ' + sols.length;
        showing = true; render();
    };
})();
