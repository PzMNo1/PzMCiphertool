(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('yinyang-workspace', 'yinyang-layout',
        window.LogicUI.backButton('yinyang-workspace') +
        window.LogicUI.title('YIN YANG', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.singleSizeInput('yy-size', { val: 6, min: 4, max: 10, placeholder: 'N×N' }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initYinyangGrid&&window.initYinyangGrid()' },
            { label: '计算核心分析', onclick: 'window.solveYinyangPuzzleUI&&window.solveYinyangPuzzleUI()', id: 'yy-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearYinyangGrid&&window.clearYinyangGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleYinyangExample&&window.buildSimpleYinyangExample()' }
        ]) +
        window.LogicUI.statsPanel('yy', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('yy', 'showYinyangSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions(['点击格子切换: 空→阳→阴→空', '阳/阴各自必须四连通', '不得出现2×2同色方块'], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="yy-grid-container"></div>`,
        `#yy-grid-container{display:inline-grid;padding:10px;background:rgba(0,0,0,.55);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);user-select:none;gap:3px}
        .yy-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:5px;cursor:pointer;position:relative;transition:all .2s}
        .yy-cell:hover{box-shadow:0 0 8px rgba(0,255,231,.25);border-color:rgba(0,255,231,.3)}
        .yy-cell.yy-w{background:rgba(255,180,50,.55);border-color:rgba(255,180,50,.4)}
        .yy-cell.yy-b{background:rgba(40,190,170,.55);border-color:rgba(40,190,170,.4)}
        .yy-cell.yy-clue::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.7)}
        .yy-cell.yy-sol.yy-w{background:rgba(240,120,180,.5);border-color:rgba(240,120,180,.35)}
        .yy-cell.yy-sol.yy-b{background:rgba(100,130,230,.5);border-color:rgba(100,130,230,.35)}`
    ));
    const $ = id => document.getElementById(id);
    let N = 6, g = [], s = [], si = 0, sh = false;
    const st = (c, t) => { const a = $('yy-solutionsCount'), b = $('yy-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nv = v => { const n = $('yy-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const mk = () => Array.from({ length: N }, () => Array(N).fill(0));
    function render() {
        const c = $('yy-grid-container'); if (!c) return; c.innerHTML = '';
        c.style.gridTemplateColumns = `repeat(${N},42px)`;
        for (let r = 0; r < N; r++) for (let j = 0; j < N; j++) {
            const d = document.createElement('div'), v = g[r][j];
            d.className = 'yy-cell'; d.dataset.r = r; d.dataset.c = j;
            if (v === 1) d.classList.add('yy-w'); if (v === 2) d.classList.add('yy-b'); if (v) d.classList.add('yy-clue');
            d.onclick = () => { if (sh) return; g[r][j] = (g[r][j] + 1) % 3; render(); };
            c.appendChild(d);
        }
        if (sh && s[si]) c.querySelectorAll('.yy-cell').forEach(d => {
            const r = +d.dataset.r, j = +d.dataset.c, v = s[si][r][j];
            d.classList.remove('yy-w', 'yy-b', 'yy-clue');
            if (v === 1) d.classList.add('yy-w'); if (v === 2) d.classList.add('yy-b');
            d.classList.add(g[r][j] ? 'yy-clue' : 'yy-sol');
        });
    }
    const rs = () => { s = []; si = 0; sh = false; };
    window.initYinyangGrid = () => { const i = $('yy-size'); if (i) { N = Math.max(4, Math.min(10, +i.value || 6)); i.value = N; } rs(); g = mk(); render(); st('-', '-'); nv(false); };
    window.clearYinyangGrid = () => { rs(); g = mk(); render(); st('-', '-'); nv(false); };
    window.buildSimpleYinyangExample = () => { N = 4; const i = $('yy-size'); if (i) i.value = 4; rs(); g = mk(); g[0][0]=1;g[0][3]=1;g[1][1]=2;g[1][3]=2;g[3][0]=1;g[3][3]=2; render(); st('-','-'); nv(false); };
    window.solveYinyangPuzzleUI = () => {
        if (!window.solveYinYang) return st('模块未加载', '-');
        const i = $('yy-size'); if (i) { N = Math.max(4, Math.min(10, +i.value || 6)); i.value = N; }
        const t0 = performance.now(), r = window.solveYinYang({ size: N, grid: g.map(r => [...r]) }), ms = Math.round(performance.now() - t0) + 'ms';
        s = r.solutions || []; st(r.timeout ? s.length + '+ (超时)' : (s.length || '未找到解'), ms);
        if (s.length) { sh = true; si = 0; nv(true); window.showYinyangSolution(0); }
    };
    window.showYinyangSolution = d => { if (!s.length) return; si = (si + d + s.length) % s.length; const c = $('yy-solution-counter'); if (c) c.textContent = (si+1)+' / '+s.length; render(); };
})();
