(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('spiralgalaxies-workspace', 'spiralgalaxies-layout',
        window.LogicUI.backButton('spiralgalaxies-workspace') +
        window.LogicUI.title('SPIRAL GALAXIES', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('sg-rows', 'sg-cols', { rowVal: 7, colVal: 7, rowMin: 3, colMin: 3, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initSGGrid && window.initSGGrid()' },
            { label: '计算核心分析', onclick: 'window.solveSGUI && window.solveSGUI()', id: 'sg-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearSGGrid && window.clearSGGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleSGExample && window.buildSimpleSGExample()' }
        ]) +
        `<div style="margin-bottom:1.5rem;display:flex;gap:10px"><button class="cyber-button" style="flex:1" id="sg-mode-btn" onclick="window.toggleSGMode && window.toggleSGMode()"><span class="cyber-button__tag">模式: 放置星系中心</span></button></div>` +
        window.LogicUI.statsPanel('sg', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('sg', 'showSGSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '编辑模式: 点击网格放置/删除星系中心',
            '填色模式: 选中圆点后点格子着色 (180°对称)',
            '每区域含且仅含一个圆点，关于圆点旋转对称'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="sg-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block;user-select:none"></div>`,
        `#sg-grid-container{position:relative}
        .sg-cell{position:absolute !important;display:block !important;border:1px solid rgba(255,255,255,.1);box-sizing:border-box;transition:background .2s;cursor:pointer}
        .sg-cell:hover{background:rgba(0,255,231,.08)}.sg-cell.solved{opacity:.65}
        .sg-dot{position:absolute;width:12px;height:12px;border-radius:50%;transform:translate(-50%,-50%);z-index:10;cursor:pointer;box-shadow:0 0 6px rgba(255,255,255,.7);transition:transform .15s,box-shadow .15s}
        .sg-dot:hover{transform:translate(-50%,-50%) scale(1.3)}.sg-dot.selected{box-shadow:0 0 14px var(--neon-cyan);transform:translate(-50%,-50%) scale(1.35)}
        .sg-hit{position:absolute;width:16px;height:16px;background:transparent;transform:translate(-50%,-50%);z-index:20;border-radius:50%;cursor:crosshair}.sg-hit:hover{background:rgba(0,255,231,.35)}
        .sg-border-h{position:absolute;height:3px;background:var(--neon-cyan);z-index:5;pointer-events:none}
        .sg-border-v{position:absolute;width:3px;background:var(--neon-cyan);z-index:5;pointer-events:none}`
    ));

    const $ = id => document.getElementById(id), CS = 42;
    let R = 7, C = 7, dots = [], asgn = [], mode = 'edit', selDot = -1, solutions = [], solIdx = 0, showing = false;
    const CLR = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEEAD','#D4A5A5','#9B59B6','#3498DB','#E67E22','#2ECC71','#F1C40F','#E74C3C','#1ABC9C','#95A5A6','#34495E','#e056a0','#56e0c8','#c8e056','#5668e0','#e09056'];
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const st = (c, t) => { const a = $('sg-solutionsCount'), b = $('sg-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nv = v => { const n = $('sg-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const mkAsgn = () => Array.from({ length: R }, () => Array(C).fill(-1));
    const readSize = () => { const ri = $('sg-rows'), ci = $('sg-cols'); if (ri && ci) { R = Math.max(3, Math.min(12, +ri.value || 7)); C = Math.max(3, Math.min(12, +ci.value || 7)); ri.value = R; ci.value = C; } };
    const modeText = m => m === 'edit' ? '模式: 放置星系中心' : '模式: 手动填色';
    const setModeBtn = m => { const b = $('sg-mode-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = modeText(m); };

    function render() {
        const g = $('sg-grid-container'); if (!g) return; g.innerHTML = '';
        g.style.width = (C * CS + 20) + 'px'; g.style.height = (R * CS + 20) + 'px';
        const ox = 10, oy = 10, sol = showing && solutions[solIdx];

        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.className = 'sg-cell';
            cell.style.cssText = `width:${CS}px;height:${CS}px;top:${oy + r * CS}px;left:${ox + c * CS}px`;
            const k = sol ? sol[r][c] : (asgn[r] && asgn[r][c]);
            if (k !== undefined && k !== -1 && dots[k]) { cell.style.backgroundColor = dots[k].color; cell.classList.add('solved'); }
            cell.onclick = () => { if (mode === 'play' && selDot !== -1 && !showing) assignCell(r, c, selDot); };
            g.appendChild(cell);
        }

        dots.forEach((dot, i) => {
            const d = document.createElement('div'); d.className = 'sg-dot' + (i === selDot ? ' selected' : '');
            d.style.cssText = `top:${oy + dot.fr * CS / 2}px;left:${ox + dot.fc * CS / 2}px;background:${dot.color}`;
            d.onclick = e => { e.stopPropagation();
                if (mode === 'play' && !showing) { selDot = i; render(); }
                else if (mode === 'edit') { dots.splice(i, 1); asgn = mkAsgn(); selDot = -1; render(); }
            }; g.appendChild(d);
        });

        if (mode === 'edit') for (let fr = 0; fr <= 2 * R; fr++) for (let fc = 0; fc <= 2 * C; fc++) {
            if (dots.some(d => d.fr === fr && d.fc === fc)) continue;
            const h = document.createElement('div'); h.className = 'sg-hit';
            h.style.cssText = `top:${oy + fr * CS / 2}px;left:${ox + fc * CS / 2}px`;
            h.onclick = () => { dots.push({ fr, fc, color: CLR[dots.length % CLR.length] }); render(); };
            g.appendChild(h);
        }

        if (sol) for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            if (r < R - 1 && sol[r][c] !== sol[r + 1][c]) { const b = document.createElement('div'); b.className = 'sg-border-h'; b.style.cssText = `left:${ox + c * CS}px;top:${oy + (r + 1) * CS - 1}px;width:${CS}px`; g.appendChild(b); }
            if (c < C - 1 && sol[r][c] !== sol[r][c + 1]) { const b = document.createElement('div'); b.className = 'sg-border-v'; b.style.cssText = `left:${ox + (c + 1) * CS - 1}px;top:${oy + r * CS}px;height:${CS}px`; g.appendChild(b); }
        }
    }

    function assignCell(r, c, di) {
        const d = dots[di]; if (!d) return;
        const sr = d.fr - r - 1, sc = d.fc - c - 1;
        if (sr < 0 || sr >= R || sc < 0 || sc >= C) return;
        asgn[r][c] = di; asgn[sr][sc] = di; render();
    }

    window.toggleSGMode = () => { mode = mode === 'edit' ? 'play' : 'edit'; setModeBtn(mode); selDot = -1; render(); };
    window.initSGGrid = () => { readSize(); reset(); dots = []; asgn = mkAsgn(); mode = 'edit'; selDot = -1; setModeBtn('edit'); render(); st('-', '-'); nv(false); };
    window.clearSGGrid = () => { reset(); asgn = mkAsgn(); selDot = -1; render(); st('-', '-'); nv(false); };
    window.buildSimpleSGExample = () => {
        R = 5; C = 5; const ri = $('sg-rows'), ci = $('sg-cols'); if (ri) ri.value = 5; if (ci) ci.value = 5;
        reset(); mode = 'edit'; selDot = -1; asgn = mkAsgn();
        dots = [{ fr:1,fc:1,color:CLR[0] },{ fr:1,fc:9,color:CLR[1] },{ fr:5,fc:5,color:CLR[2] },{ fr:9,fc:1,color:CLR[3] },{ fr:9,fc:9,color:CLR[4] }];
        setModeBtn('edit'); render(); st('-', '-'); nv(false);
    };
    window.solveSGUI = () => {
        if (!window.solveSpiralGalaxies) return st('模块未加载', '-');
        if (!dots.length) return st('请先放置星系中心', '-');
        const t0 = performance.now(), res = window.solveSpiralGalaxies({ rows: R, cols: C, dots });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        st(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nv(true); window.showSGSolution(0); }
    };
    window.showSGSolution = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('sg-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
