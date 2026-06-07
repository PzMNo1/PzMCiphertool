(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('norinori-workspace', 'norinori-layout',
        window.LogicUI.backButton('norinori-workspace') +
        window.LogicUI.title('NORINORI', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('nri-rows', 'nri-cols', { rowVal: 5, colVal: 5, rowMin: 3, colMin: 3, rowMax: 10, colMax: 10 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initNRIGrid && window.initNRIGrid()' },
            { label: '计算核心分析', onclick: 'window.solveNRIPuzzleUI && window.solveNRIPuzzleUI()', id: 'nri-solve-btn', glow: true },
            { label: '清空标记', onclick: 'window.clearNRIGrid && window.clearNRIGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleNRIExample && window.buildSimpleNRIExample()' }
        ]) +
        window.LogicUI.statsPanel('nri', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('nri', 'showNRISolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '拖拽/点击边缘细条: 划分区域边界',
            '每个区域恰好包含2个涂色格',
            '涂色格必须成对（多米诺骨牌）',
            '每个涂色格恰好有1个涂色邻居'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="nri-grid-wrapper" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block;"></div>`,
        `.nri-grid{display:inline-grid;gap:0}
        .nri-cell{width:38px;height:38px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;transition:background .12s}
        .nri-cell:hover{background:rgba(0,255,231,.08)}
        .nri-cell.shaded{background:rgba(0,255,231,.55);box-shadow:inset 0 0 10px rgba(0,255,231,.4)}
        .nri-cell.br-right{border-right:3px solid #00ffe7!important}
        .nri-cell.br-bottom{border-bottom:3px solid #00ffe7!important}
        .nri-cell.br-outer-t{border-top:3px solid #00ffe7!important}
        .nri-cell.br-outer-l{border-left:3px solid #00ffe7!important}
        .nri-cell.br-outer-r{border-right:3px solid #00ffe7!important}
        .nri-cell.br-outer-b{border-bottom:3px solid #00ffe7!important}
        .nri-handle{position:absolute;z-index:5;opacity:0;transition:opacity .15s}
        .nri-handle:hover{opacity:1!important;background:rgba(0,255,231,.3)}
        .nri-cell:hover .nri-handle{opacity:.3}
        .nri-handle.v{right:-4px;top:2px;width:8px;height:calc(100% - 4px);cursor:col-resize}
        .nri-handle.h{bottom:-4px;left:2px;height:8px;width:calc(100% - 4px);cursor:row-resize}`
    ));

    const $ = id => document.getElementById(id);
    let R = 5, C = 5, hB = [], vB = [];
    let solutions = [], solIdx = 0, showing = false;
    let dragging = false, dragType = null, dragVal = false;
    document.addEventListener('mouseup', () => { dragging = false; dragType = null; });
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('nri-solutionsCount'), b = $('nri-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('nri-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('nri-rows'), ci = $('nri-cols'); if (ri && ci) { R = Math.max(3, Math.min(10, +ri.value || 5)); C = Math.max(3, Math.min(10, +ci.value || 5)); ri.value = R; ci.value = C; } };
    const initArrays = () => { hB = Array.from({length:R},()=>new Array(C).fill(false)); vB = Array.from({length:R},()=>new Array(C).fill(false)); };

    function addHandle(el, dir, r, c) {
        const h = document.createElement('div'); h.className = 'nri-handle ' + dir;
        const arr = dir === 'v' ? vB : hB;
        h.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); dragging = true; dragType = dir; dragVal = !arr[r][c]; arr[r][c] = dragVal; paintBorders(); });
        h.addEventListener('mouseenter', () => { if (dragging && dragType === dir) { arr[r][c] = dragVal; paintBorders(); } });
        el.appendChild(h);
    }

    function render() {
        const wr = $('nri-grid-wrapper'); if (!wr) return;
        wr.innerHTML = '';
        const g = document.createElement('div'); g.className = 'nri-grid';
        g.style.gridTemplateColumns = `repeat(${C},38px)`;
        g.style.gridTemplateRows = `repeat(${R},38px)`;
        const sol = showing && solutions.length ? solutions[solIdx] : null;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'); cell.className = 'nri-cell';
            cell.dataset.r = r; cell.dataset.c = c;
            if (r === 0) cell.classList.add('br-outer-t');
            if (c === 0) cell.classList.add('br-outer-l');
            if (r === R - 1) cell.classList.add('br-outer-b');
            if (c === C - 1) cell.classList.add('br-outer-r');
            if (c < C - 1 && vB[r][c]) cell.classList.add('br-right');
            if (r < R - 1 && hB[r][c]) cell.classList.add('br-bottom');
            if (sol && sol[r][c]) cell.classList.add('shaded');
            if (!showing) {
                if (c < C - 1) addHandle(cell, 'v', r, c);
                if (r < R - 1) addHandle(cell, 'h', r, c);
            }
            g.appendChild(cell);
        }
        wr.appendChild(g);
    }

    function paintBorders() {
        const wr = $('nri-grid-wrapper'); if (!wr) return;
        wr.querySelectorAll('.nri-cell').forEach(el => {
            const r = +el.dataset.r, c = +el.dataset.c;
            el.classList.toggle('br-right', c < C - 1 && vB[r][c]);
            el.classList.toggle('br-bottom', r < R - 1 && hB[r][c]);
        });
    }

    window.initNRIGrid = () => { readSize(); reset(); initArrays(); render(); stats('-', '-'); nav(false); };
    window.clearNRIGrid = () => { reset(); render(); stats('-', '-'); nav(false); };
    window.buildSimpleNRIExample = () => {
        R = 4; C = 4; const ri = $('nri-rows'), ci = $('nri-cols'); if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); initArrays();
        // 4 regions: 4 quadrants
        for (let c = 0; c < C; c++) hB[1][c] = true;
        for (let r = 0; r < R; r++) vB[r][1] = true;
        render(); stats('-', '-'); nav(false);
    };

    window.solveNRIPuzzleUI = () => {
        if (!window.solveNorinori) return stats('模块未加载', '-');
        const t0 = performance.now();
        const res = window.solveNorinori({ rows: R, cols: C, hBorders: hB, vBorders: vB });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showNRISolution(0); }
    };
    window.showNRISolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('nri-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
