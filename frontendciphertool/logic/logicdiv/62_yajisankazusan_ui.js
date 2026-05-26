(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('yajisankazusan-workspace', 'yajisankazusan-layout',
        window.LogicUI.backButton('yajisankazusan-workspace') +
        window.LogicUI.title('YAJISAN-KAZUSAN', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('yk-rows', 'yk-cols', { rowVal: 7, colVal: 7, rowMin: 3, colMin: 3, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initYKGrid && window.initYKGrid()' },
            { label: '计算核心分析', onclick: 'window.solveYKPuzzleUI && window.solveYKPuzzleUI()', id: 'yk-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearYKGrid && window.clearYKGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleYKExample && window.buildSimpleYKExample()' }
        ]) +
        window.LogicUI.statsPanel('yk', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('yk', 'showYKSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击格子输入线索："数字+方向" (如 2r = 向右2个黑格)',
            '方向: u=↑ d=↓ l=← r=→',
            '涂黑格不能相邻，未涂黑格必须全部连通',
            '未涂黑的线索格约束该方向涂黑数，涂黑线索被忽略'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="yk-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;user-select:none"></div>`,
        `#yk-grid-container{gap:0}
        .yk-cell{width:44px;height:44px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);font-size:.75rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative;flex-direction:column;line-height:1.1}
        .yk-cell:hover{background:rgba(0,255,231,.08)}
        .yk-cell.clue-cell{background:rgba(0,255,231,.08)}
        .yk-cell.shaded{background:rgba(100,100,100,.7);border-color:rgba(150,150,150,.5)}
        .yk-cell.shaded .yk-clue-text{opacity:.35}
        .yk-cell .yk-clue-text,.yk-cell .yk-dir-text{pointer-events:none;text-align:center}
        .yk-cell .yk-clue-text{font-size:.8rem}
        .yk-cell .yk-dir-text{font-size:.6rem;opacity:.7}
        .yk-cell input.yk-input{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.8rem;font-weight:700;outline:0;padding:0;margin:0}
        .yk-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}`
    ));

    const $ = id => document.getElementById(id);
    const DA = { u: '↑', d: '↓', l: '←', r: '→' };
    let R = 7, C = 7, clues = {}, sols = [], si = 0, showing = false;
    const reset = () => { sols = []; si = 0; showing = false; };
    const stat = (c, t) => { const a = $('yk-solutionsCount'), b = $('yk-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('yk-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };

    function render() {
        const g = $('yk-grid-container'); if (!g) return;
        g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},44px)`;
        g.style.gridTemplateRows = `repeat(${R},44px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'), k = r + ',' + c;
            cell.className = 'yk-cell'; cell.dataset.r = r; cell.dataset.c = c;
            if (k in clues) {
                cell.classList.add('clue-cell');
                cell.innerHTML = `<span class="yk-clue-text">${clues[k].val}</span><span class="yk-dir-text">${DA[clues[k].dir] || clues[k].dir}</span>`;
            }
            cell.onclick = () => {
                if (showing) return;
                cell.classList.add('editing');
                const inp = document.createElement('input');
                inp.type = 'text'; inp.className = 'yk-input'; inp.maxLength = 3; inp.placeholder = '2r';
                if (k in clues) inp.value = clues[k].val + clues[k].dir;
                cell.innerHTML = ''; cell.appendChild(inp); inp.focus();
                const commit = () => {
                    const m = inp.value.trim().toLowerCase().match(/^(\d+)\s*([udlr])$/);
                    if (m) clues[k] = { val: +m[1], dir: m[2] }; else delete clues[k];
                    cell.classList.remove('editing'); render();
                };
                inp.addEventListener('blur', commit, { once: true });
                inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); else if (e.key === 'Escape') { inp.value = ''; inp.blur(); } };
            };
            g.appendChild(cell);
        }
        if (showing && sols[si]) g.querySelectorAll('.yk-cell').forEach(cell => {
            if (sols[si][+cell.dataset.r][+cell.dataset.c] === 1) cell.classList.add('shaded');
        });
    }

    window.initYKGrid = () => {
        const ri = $('yk-rows'), ci = $('yk-cols');
        if (ri && ci) { R = Math.max(3, Math.min(12, +ri.value || 7)); C = Math.max(3, Math.min(12, +ci.value || 7)); ri.value = R; ci.value = C; }
        reset(); clues = {}; render(); stat('-', '-'); nav(false);
    };
    window.clearYKGrid = () => { reset(); clues = {}; render(); stat('-', '-'); nav(false); };

    window.buildSimpleYKExample = () => {
        R = 5; C = 5;
        const ri = $('yk-rows'), ci = $('yk-cols');
        if (ri) ri.value = 5; if (ci) ci.value = 5;
        reset();
        clues = { '0,2':{val:1,dir:'d'}, '1,1':{val:0,dir:'r'}, '1,4':{val:1,dir:'l'}, '2,0':{val:1,dir:'d'}, '2,3':{val:1,dir:'u'}, '3,2':{val:0,dir:'l'}, '4,1':{val:1,dir:'u'}, '4,4':{val:0,dir:'d'} };
        render(); stat('-', '-'); nav(false);
    };

    window.solveYKPuzzleUI = () => {
        if (!window.solveYajisanKazusan) return stat('模块未加载', '-');
        if (!Object.keys(clues).length) return stat('请先输入线索', '-');
        const t0 = performance.now(), res = window.solveYajisanKazusan({ rows: R, cols: C, clues });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        sols = res.solutions || [];
        stat(res.timeout ? sols.length + '+ (超时)' : (sols.length || '未找到解'), ms);
        if (sols.length) { showing = true; si = 0; nav(sols.length > 1); window.showYKSolution(0); }
        else { showing = false; render(); }
    };

    window.showYKSolution = d => {
        if (!sols.length) return;
        si = (si + d + sols.length) % sols.length;
        const ctr = $('yk-solution-counter'); if (ctr) ctr.textContent = (si + 1) + ' / ' + sols.length;
        render();
    };
})();
