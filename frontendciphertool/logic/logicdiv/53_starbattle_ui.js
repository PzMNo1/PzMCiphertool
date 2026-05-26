(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('starbattle-workspace', 'starbattle-layout',
        window.LogicUI.backButton('starbattle-workspace') +
        window.LogicUI.title('STAR BATTLE', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('sb-rows', 'sb-cols', { rowVal: 5, colVal: 5, rowMin: 4, colMin: 4, rowMax: 14, colMax: 14 }) +
        `<div style="margin-bottom:1rem;display:flex;gap:10px;align-items:center;justify-content:center"><label style="color:var(--neon-cyan);font-size:.85rem;font-weight:700">★ 星星数</label><input type="text" inputmode="numeric" id="sb-stars" value="1" style="width:50px;height:32px;text-align:center;background:rgba(255,255,255,.06);border:1px solid rgba(0,255,231,.3);border-radius:6px;color:#fff;font-size:.95rem;font-weight:700;outline:0"></div>` +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initSBGrid && window.initSBGrid()' },
            { label: '计算核心分析', onclick: 'window.solveSBUI && window.solveSBUI()', id: 'sb-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearSBGrid && window.clearSBGrid()' },
            { label: '简单示例', onclick: 'window.buildSBExample && window.buildSBExample()' }
        ]) +
        `<div style="margin-bottom:1.5rem;display:flex;gap:10px"><button class="cyber-button" style="flex:1" id="sb-mode-btn" onclick="window.toggleSBMode && window.toggleSBMode()"><span class="cyber-button__tag">模式: 编辑区域</span></button></div>` +
        window.LogicUI.statsPanel('sb', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('sb', 'showSBSol', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '区域模式: 点击/拖拽网格线绘制区域边界',
            '星星模式: 点击格子放置/移除 ★',
            '每行、每列、每个粗线区域恰好放置指定数量的 ★',
            '★ 之间不能相邻（含对角线八方向）'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="sb-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);display:inline-grid;user-select:none"></div>`,
        `#sb-grid-container{gap:0}
        .sb-cell{width:40px;height:40px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.4rem;color:var(--neon-cyan);font-weight:700;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
        .sb-cell:hover{background:rgba(0,255,231,.08)}
        .sb-cell.star{text-shadow:0 0 8px var(--neon-cyan)}.sb-cell.sol{color:#0f0;text-shadow:0 0 10px rgba(0,255,0,.6)}
        .sb-cell.bt{border-top:3px solid var(--neon-cyan)}.sb-cell.bb{border-bottom:3px solid var(--neon-cyan)}.sb-cell.bl{border-left:3px solid var(--neon-cyan)}.sb-cell.br{border-right:3px solid var(--neon-cyan)}
        .sb-line{position:absolute;z-index:50;cursor:pointer;transition:background .15s}
        .sb-line.h-line{height:7px;background:rgba(255,255,255,.08)}.sb-line.v-line{width:7px;background:rgba(255,255,255,.08)}
        .sb-line:hover{background:#00ffe7!important;box-shadow:0 0 6px #00ffe7!important}
        .sb-line.active{background:#00ffe7!important;box-shadow:0 0 5px #00ffe7,0 0 2px #00ffe7 inset!important}`
    ));

    const $ = id => document.getElementById(id);
    let R = 5, C = 5, S = 1, uStars = {}, hB = [], vB = [], mode = 'edit', sols = [], si = 0, showing = false, drag = false, dv = true;
    const reset = () => { sols = []; si = 0; showing = false; };
    const stat = (c, t) => { const a = $('sb-solutionsCount'), b = $('sb-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('sb-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const rdSz = () => { const r = $('sb-rows'), c = $('sb-cols'), s = $('sb-stars'); if (r && c) { R = Math.max(4, Math.min(14, +r.value || 5)); C = Math.max(4, Math.min(14, +c.value || 5)); r.value = R; c.value = C; } if (s) { S = Math.max(1, Math.min(5, +s.value || 1)); s.value = S; } };
    const mkB = () => { hB = Array.from({ length: R }, () => Array(C).fill(false)); vB = Array.from({ length: R }, () => Array(C).fill(false)); };
    const setMode = m => { mode = m; const b = $('sb-mode-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = m === 'edit' ? '模式: 编辑区域' : '模式: 放置星星'; };

    function cb(el, r, c) {
        el.classList.remove('bt', 'bb', 'bl', 'br');
        if (r === 0 || (r > 0 && hB[r - 1][c])) el.classList.add('bt');
        if (r === R - 1 || (r < R - 1 && hB[r][c])) el.classList.add('bb');
        if (c === 0 || (c > 0 && vB[r][c - 1])) el.classList.add('bl');
        if (c === C - 1 || (c < C - 1 && vB[r][c])) el.classList.add('br');
    }

    function regions() {
        const vis = Array.from({ length: R }, () => Array(C).fill(false)), rg = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            if (vis[r][c]) continue;
            const rm = [], q = [[r, c]]; vis[r][c] = true;
            while (q.length) {
                const [cr, cc] = q.pop(); rm.push(cr * C + cc);
                [[cr-1,cc,cr-1,cc,'h'],[cr+1,cc,cr,cc,'h'],[cr,cc-1,cr,cc-1,'v'],[cr,cc+1,cr,cc,'v']].forEach(([nr,nc,br,bc,t]) => {
                    if (nr < 0 || nr >= R || nc < 0 || nc >= C || vis[nr][nc]) return;
                    if (t === 'h' && hB[br][bc]) return; if (t === 'v' && vB[br][bc]) return;
                    vis[nr][nc] = true; q.push([nr, nc]);
                });
            }
            rg.push(rm);
        }
        return rg;
    }

    function render() {
        const g = $('sb-grid-container'); if (!g) return; g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},40px)`; g.style.gridTemplateRows = `repeat(${R},40px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const el = document.createElement('div'), k = r + ',' + c;
            el.className = 'sb-cell'; el.dataset.r = r; el.dataset.c = c; cb(el, r, c);
            if (uStars[k]) { el.classList.add('star'); el.textContent = '★'; }
            el.onclick = () => { if (mode !== 'star' || showing) return; uStars[k] ? delete uStars[k] : uStars[k] = 1; render(); };
            g.appendChild(el);
        }
        if (mode === 'edit') { const cs = 40, p = 10; const mk = (t, r, c, css) => { const ln = document.createElement('div'); ln.className = `sb-line ${t}-line`; if ((t === 'h' ? hB : vB)[r][c]) ln.classList.add('active'); ln.style.cssText = css; ln.onmousedown = e => { e.preventDefault(); e.stopPropagation(); const a = t === 'h' ? hB : vB; a[r][c] = !a[r][c]; drag = true; dv = a[r][c]; ln.classList.toggle('active', a[r][c]); g.querySelectorAll('.sb-cell').forEach(el => cb(el, +el.dataset.r, +el.dataset.c)); }; ln.onmouseenter = () => { if (!drag) return; (t === 'h' ? hB : vB)[r][c] = dv; ln.classList.toggle('active', dv); g.querySelectorAll('.sb-cell').forEach(el => cb(el, +el.dataset.r, +el.dataset.c)); }; g.appendChild(ln); };
            for (let r = 0; r < R-1; r++) for (let c = 0; c < C; c++) mk('h', r, c, `left:${p+c*cs}px;top:${p+(r+1)*cs-3}px;width:${cs}px`);
            for (let r = 0; r < R; r++) for (let c = 0; c < C-1; c++) mk('v', r, c, `left:${p+(c+1)*cs-3}px;top:${p+r*cs}px;height:${cs}px`);
        }
        if (showing && sols[si]) g.querySelectorAll('.sb-cell').forEach(el => { if (sols[si][+el.dataset.r][+el.dataset.c]) { el.textContent = '★'; el.classList.add('sol'); } });
    }

    document.addEventListener('mouseup', () => { drag = false; });

    window.toggleSBMode = () => { setMode(mode === 'edit' ? 'star' : 'edit'); render(); };
    window.initSBGrid = () => { rdSz(); reset(); uStars = {}; mkB(); setMode('edit'); render(); stat('-', '-'); nav(false); };
    window.clearSBGrid = () => { reset(); uStars = {}; render(); stat('-', '-'); nav(false); };
    window.buildSBExample = () => {
        R = 5; C = 5; S = 1; const r = $('sb-rows'), c = $('sb-cols'), s = $('sb-stars');
        if (r) r.value = 5; if (c) c.value = 5; if (s) s.value = 1;
        reset(); uStars = {}; setMode('edit'); mkB();
        // 5×5 1-star: A A B B C | A A B C C | D D B C C | D E E E E | D D E E E
        hB[0][3]=1; hB[1][0]=hB[1][1]=1; hB[2][1]=hB[2][2]=hB[2][3]=hB[2][4]=1; hB[3][1]=1;
        vB[0][1]=vB[0][3]=1; vB[1][1]=vB[1][2]=1; vB[2][1]=vB[2][2]=1; vB[3][0]=1; vB[4][1]=1;
        render(); stat('-', '-'); nav(false);
    };
    window.solveSBUI = () => {
        if (!window.solveStarbattle) return stat('模块未加载', '-');
        rdSz(); const rg = regions(); if (!rg.length) return stat('请先绘制区域', '-');
        const t0 = performance.now(), res = window.solveStarbattle({ rows: R, cols: C, stars: S, regions: rg });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        sols = res.solutions || [];
        stat(res.timeout ? sols.length + '+ (超时)' : (sols.length || '未找到解'), ms);
        if (sols.length) { showing = true; si = 0; nav(true); window.showSBSol(0); }
    };
    window.showSBSol = d => { if (!sols.length) return; si = (si + d + sols.length) % sols.length; const c = $('sb-solution-counter'); if (c) c.textContent = (si + 1) + ' / ' + sols.length; render(); };
})();
