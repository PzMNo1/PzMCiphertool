(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('masyu-workspace', 'masyu-layout',
        window.LogicUI.backButton('masyu-workspace') +
        window.LogicUI.title('MASYU', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('masyu-rows', 'masyu-cols', { rowVal: 5, colVal: 5, rowMin: 4, colMin: 4, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initMasyuGrid && window.initMasyuGrid()' },
            { label: '计算核心分析', onclick: 'window.solveMasyuPuzzleUI && window.solveMasyuPuzzleUI()', id: 'masyu-solve-btn', glow: true },
            { label: '清空回路', onclick: 'window.clearMasyuGrid && window.clearMasyuGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleMasyuExample && window.buildSimpleMasyuExample()' }
        ]) +
        window.LogicUI.statsPanel('masyu', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('masyu', 'showMasyuSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击格子: 循环 无 → 白圈 → 黑圈',
            '点击或拖动格子间的线段: 绘制/擦除回路',
            '白圈: 直线通过，前后至少一格必须转弯',
            '黑圈: 必须转弯，前后两格必须直行'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="masyu-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block;"></div>`,
        `.my-wrap{position:relative;display:inline-block}
        .my-grid{display:inline-grid;gap:0}
        .my-cell{width:40px;height:40px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);position:relative;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .my-cell:hover{background:rgba(0,255,231,.08)}
        .my-circle{width:22px;height:22px;border-radius:50%;pointer-events:none;position:relative;z-index:2}
        .my-circle.w{background:transparent;border:3px solid #fff;box-shadow:0 0 6px rgba(255,255,255,.4)}
        .my-circle.b{background:#fff;border:2px solid #fff;box-shadow:0 0 8px rgba(255,255,255,.5)}
        .my-edge{position:absolute;z-index:3;cursor:pointer;border-radius:2px}
        .my-edge.h{height:12px;margin-top:-4px;background:transparent;border-radius:3px}
        .my-edge.v{width:12px;margin-left:-4px;background:transparent;border-radius:3px}
        .my-edge::after{content:'';position:absolute;border-radius:2px}
        .my-edge.h::after{left:0;top:4px;width:100%;height:4px;background:rgba(255,255,255,.06)}
        .my-edge.v::after{top:0;left:4px;width:4px;height:100%;background:rgba(255,255,255,.06)}
        .my-edge:hover::after{background:rgba(0,255,231,.25)!important}
        .my-edge.on::after{background:#00ffe7!important;box-shadow:0 0 6px rgba(0,255,231,.5)}`
    ));

    const $ = id => document.getElementById(id);
    const S = 40; // cell size must match CSS
    let R = 5, C = 5, circles = {};
    let hEdges = [], vEdges = []; // manual edge state
    let solutions = [], solIdx = 0, showing = false;
    let dragging = false, dragVal = false;
    document.addEventListener('mouseup', () => { dragging = false; });
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('masyu-solutionsCount'), b = $('masyu-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('masyu-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('masyu-rows'), ci = $('masyu-cols'); if (ri && ci) { R = Math.max(4, Math.min(12, +ri.value || 5)); C = Math.max(4, Math.min(12, +ci.value || 5)); ri.value = R; ci.value = C; } };
    const initEdges = () => { hEdges = Array.from({length:R}, () => new Array(C-1).fill(false)); vEdges = Array.from({length:R-1}, () => new Array(C).fill(false)); };

    function render() {
        const ct = $('masyu-grid-container'); if (!ct) return;
        ct.innerHTML = '';
        const wrap = document.createElement('div'); wrap.className = 'my-wrap';
        wrap.style.width = C * S + 'px'; wrap.style.height = R * S + 'px';
        // grid
        const g = document.createElement('div'); g.className = 'my-grid';
        g.style.gridTemplateColumns = `repeat(${C},${S}px)`;
        g.style.gridTemplateRows = `repeat(${R},${S}px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.className = 'my-cell';
            const k = r + ',' + c;
            if (k in circles) {
                const ci = document.createElement('div'); ci.className = 'my-circle ' + circles[k]; cell.appendChild(ci);
            }
            if (!showing) {
                cell.addEventListener('click', () => {
                    if (!(k in circles)) circles[k] = 'w';
                    else if (circles[k] === 'w') circles[k] = 'b';
                    else delete circles[k];
                    render();
                });
            }
            g.appendChild(cell);
        }
        wrap.appendChild(g);
        // edges — overlaid absolutely (click/drag to draw)
        const sol = showing && solutions.length ? solutions[solIdx] : null;
        function mkEdge(type, r, c, isOn) {
            const e = document.createElement('div'); e.className = 'my-edge ' + type;
            if (isOn) e.classList.add('on');
            if (!showing) {
                const arr = type === 'h' ? hEdges : vEdges;
                e.addEventListener('mousedown', ev => { ev.preventDefault(); dragging = true; dragVal = !arr[r][c]; arr[r][c] = dragVal; e.classList.toggle('on', dragVal); });
                e.addEventListener('mouseenter', () => { if (dragging) { arr[r][c] = dragVal; e.classList.toggle('on', dragVal); } });
            }
            return e;
        }
        for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) {
            const e = mkEdge('h', r, c, sol ? sol.h[r][c] : hEdges[r]?.[c]);
            e.style.left = (c * S + S / 2) + 'px'; e.style.top = (r * S + S / 2 - 2) + 'px'; e.style.width = S + 'px';
            wrap.appendChild(e);
        }
        for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) {
            const e = mkEdge('v', r, c, sol ? sol.v[r][c] : vEdges[r]?.[c]);
            e.style.left = (c * S + S / 2 - 2) + 'px'; e.style.top = (r * S + S / 2) + 'px'; e.style.height = S + 'px';
            wrap.appendChild(e);
        }
        ct.appendChild(wrap);
    }

    window.initMasyuGrid = () => { readSize(); reset(); circles = {}; initEdges(); render(); stats('-', '-'); nav(false); };
    window.clearMasyuGrid = () => { reset(); initEdges(); render(); stats('-', '-'); nav(false); };
    window.buildSimpleMasyuExample = () => {
        R = 4; C = 4; const ri = $('masyu-rows'), ci = $('masyu-cols'); if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); circles = { '0,1': 'w', '1,2': 'b' };
        render(); stats('-', '-'); nav(false);
    };

    window.solveMasyuPuzzleUI = () => {
        if (!window.solveMasyu) return stats('模块未加载', '-');
        const t0 = performance.now();
        const res = window.solveMasyu({ rows: R, cols: C, circles });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showMasyuSolution(0); }
    };
    window.showMasyuSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('masyu-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
