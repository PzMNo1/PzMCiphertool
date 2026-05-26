(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('yajilin-workspace', 'yajilin-layout',
        window.LogicUI.backButton('yajilin-workspace') +
        window.LogicUI.title('YAJILIN', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('yaj-rows', 'yaj-cols', { rowVal: 7, colVal: 7, rowMin: 3, colMin: 3, rowMax: 10, colMax: 10 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initYajilinGrid && window.initYajilinGrid()' },
            { label: '计算核心分析', onclick: 'window.solveYajilinPuzzleUI && window.solveYajilinPuzzleUI()', id: 'yaj-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearYajilinGrid && window.clearYajilinGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleYajilinExample && window.buildSimpleYajilinExample()' }
        ]) +
        window.LogicUI.statsPanel('yaj', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('yaj', 'showYajilinSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击格子输入线索：格式 "数字方向"，如 2r = 右方向2个涂黑格',
            '方向: u=上 d=下 l=左 r=右',
            '涂黑格不能相邻，剩余格连成回路'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="yaj-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block"></div>`,
        `.yaj-wrap{position:relative;display:inline-block}.yaj-grid{display:inline-grid;gap:0}
        .yaj-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);position:relative;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.75rem;color:var(--neon-cyan);font-weight:700;user-select:none;flex-direction:column;line-height:1.1}
        .yaj-cell:hover{background:rgba(0,255,231,.08)}.yaj-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6);background:rgba(64,224,255,.08)}
        .yaj-cell.shaded{background:rgba(255,60,60,.35);border-color:rgba(255,60,60,.5)}.yaj-cell.loop-on{background:rgba(0,255,231,.10)}
        .yaj-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}
        .yaj-cell input.yaj-inp{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.8rem;font-weight:700;outline:0}
        .yaj-arrow{font-size:.65rem;opacity:.8}
        .yaj-edge{position:absolute;z-index:5;border-radius:2px;pointer-events:none}.yaj-edge.h{height:4px;background:#00ffe7;box-shadow:0 0 6px rgba(0,255,231,.5)}.yaj-edge.v{width:4px;background:#00ffe7;box-shadow:0 0 6px rgba(0,255,231,.5)}
        .yaj-dot{position:absolute;width:8px;height:8px;border-radius:50%;background:#00ffe7;box-shadow:0 0 6px #00ffe7;z-index:6;pointer-events:none}`
    ));

    const $ = id => document.getElementById(id), S = 42, DM = { u:'↑', d:'↓', l:'←', r:'→' };
    let R = 7, C = 7, clues = {}, sols = [], si = 0, show = false;
    const reset = () => { sols = []; si = 0; show = false; };
    const stat = (c, t) => { const a = $('yaj-solutionsCount'), b = $('yaj-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('yaj-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const rdSz = () => { const ri = $('yaj-rows'), ci = $('yaj-cols'); if (ri && ci) { R = Math.max(3, Math.min(10, +ri.value || 7)); C = Math.max(3, Math.min(10, +ci.value || 7)); ri.value = R; ci.value = C; } };
    const hasLoop = (sol, r, c) => (r > 0 && sol.v[r-1]?.[c]) || (c > 0 && sol.h[r]?.[c-1]) || sol.h[r]?.[c] || sol.v[r]?.[c];

    function render() {
        const ct = $('yaj-grid-container'); if (!ct) return; ct.innerHTML = '';
        const wrap = document.createElement('div'); wrap.className = 'yaj-wrap';
        wrap.style.cssText = `width:${C*S}px;height:${R*S}px`;
        const g = document.createElement('div'); g.className = 'yaj-grid';
        g.style.gridTemplateColumns = `repeat(${C},${S}px)`;
        const sol = show ? sols[si] : null;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'), k = r+','+c;
            cell.className = 'yaj-cell';
            if (k in clues) { cell.classList.add('clue'); cell.innerHTML = `<span>${clues[k].val}</span><span class="yaj-arrow">${DM[clues[k].dir]}</span>`; }
            if (sol) { if (sol.shaded[r][c]) cell.classList.add('shaded'); else if (!(k in clues) && hasLoop(sol,r,c)) cell.classList.add('loop-on'); }
            if (!show) cell.onclick = () => {
                cell.classList.add('editing');
                const inp = document.createElement('input'); inp.type='text'; inp.className='yaj-inp'; inp.maxLength=4; inp.placeholder='2r';
                if (k in clues) inp.value = clues[k].val + clues[k].dir;
                cell.innerHTML = ''; cell.appendChild(inp); inp.focus();
                const commit = () => { const m = inp.value.trim().toLowerCase().match(/^(\d+)\s*([udlr])$/);
                    if (m) clues[k] = { val: +m[1], dir: m[2] }; else delete clues[k]; render(); };
                inp.addEventListener('blur', commit, { once: true });
                inp.onkeydown = e => { if (e.key==='Enter') inp.blur(); else if (e.key==='Escape') { inp.value=''; inp.blur(); } };
            };
            g.appendChild(cell);
        }
        wrap.appendChild(g);
        if (sol) for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            if (sol.shaded[r][c] || (r+','+c) in clues || !hasLoop(sol,r,c)) continue;
            const dot = document.createElement('div'); dot.className = 'yaj-dot';
            dot.style.cssText = `left:${c*S+S/2-4}px;top:${r*S+S/2-4}px`; wrap.appendChild(dot);
            if (sol.h[r]?.[c]) { const e = document.createElement('div'); e.className='yaj-edge h';
                e.style.cssText = `left:${c*S+S*.4}px;top:${r*S+S/2-2}px;width:${S}px`; wrap.appendChild(e); }
            if (sol.v[r]?.[c]) { const e = document.createElement('div'); e.className='yaj-edge v';
                e.style.cssText = `left:${c*S+S/2-2}px;top:${r*S+S*.4}px;height:${S}px`; wrap.appendChild(e); }
        }
        ct.appendChild(wrap);
    }

    window.initYajilinGrid = () => { rdSz(); reset(); clues = {}; render(); stat('-', '-'); nav(false); };
    window.clearYajilinGrid = () => { reset(); clues = {}; render(); stat('-', '-'); nav(false); };
    window.buildSimpleYajilinExample = () => {
        R = 3; C = 3; const ri = $('yaj-rows'), ci = $('yaj-cols');
        if (ri) ri.value = 3; if (ci) ci.value = 3;
        reset(); clues = { '1,1': { val: 0, dir: 'u' } }; render(); stat('-', '-'); nav(false);
    };
    window.solveYajilinPuzzleUI = () => {
        if (!window.solveYajilin) return stat('模块未加载', '-');
        const t0 = performance.now(), res = window.solveYajilin({ rows: R, cols: C, clues });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        sols = res.solutions || [];
        stat(res.timeout ? sols.length + '+ (超时)' : (sols.length || '未找到解'), ms);
        if (sols.length) { show = true; si = 0; nav(true); window.showYajilinSolution(0); }
    };
    window.showYajilinSolution = delta => {
        if (!sols.length) return;
        si = (si + delta + sols.length) % sols.length;
        const ctr = $('yaj-solution-counter'); if (ctr) ctr.textContent = (si+1)+' / '+sols.length;
        render();
    };
})();
