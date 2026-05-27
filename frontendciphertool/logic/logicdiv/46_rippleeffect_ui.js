(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('rippleeffect-workspace', 'rippleeffect-layout',
        window.LogicUI.backButton('rippleeffect-workspace') +
        window.LogicUI.title('RIPPLE EFFECT', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('rip-rows', 'rip-cols', { rowVal: 6, colVal: 6, rowMin: 2, colMin: 2, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initRippleGrid && window.initRippleGrid()' },
            { label: '计算核心分析', onclick: 'window.solveRippleUI && window.solveRippleUI()', id: 'rip-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearRippleGrid && window.clearRippleGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleRippleExample && window.buildSimpleRippleExample()' }
        ]) +
        `<div style="margin-bottom:1.5rem;display:flex;gap:10px"><button class="cyber-button" style="flex:1" id="rip-mode-btn" onclick="window.toggleRippleMode && window.toggleRippleMode()"><span class="cyber-button__tag">模式: 调整边界</span></button></div>` +
        window.LogicUI.statsPanel('rip', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('rip', 'showRippleSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '边界模式: 点击/拖拽网格线绘制房间边界',
            '数字模式: 点击格子输入已知线索数字',
            '大小为 N 的区域中必须填入 1~N (各一次)',
            '若两个相同数字 X 在同行/同列，间距须 > X',
            '最大网格 12×12'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="rip-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;user-select:none"></div>`,
        `#rip-grid-container{gap:0}
        .rip-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative}
        .rip-cell:hover{background:rgba(0,255,231,.08)}
        .rip-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .rip-cell.solved{color:#0f0;text-shadow:0 0 8px rgba(0,255,0,.5)}
        .rip-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}
        .rip-cell.bt{border-top:3px solid var(--neon-cyan)}.rip-cell.bb{border-bottom:3px solid var(--neon-cyan)}.rip-cell.bl{border-left:3px solid var(--neon-cyan)}.rip-cell.br{border-right:3px solid var(--neon-cyan)}
        .rip-cell input.ki{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.95rem;font-weight:700;outline:0;padding:0;margin:0}
        .rip-line{position:absolute;z-index:50;cursor:pointer;transition:background .15s}
        .rip-line.h-line{height:7px;background:rgba(255,255,255,.08)}
        .rip-line.v-line{width:7px;background:rgba(255,255,255,.08)}
        .rip-line:hover,.rip-line.drag-hover{background:#00ffe7!important;box-shadow:0 0 6px #00ffe7!important}
        .rip-line.active{background:#00ffe7!important;box-shadow:0 0 5px #00ffe7,0 0 2px #00ffe7 inset!important}`
    ));

    const $ = id => document.getElementById(id);
    let R = 6, C = 6, clues = {}, hB = [], vB = [], mode = 'edit', solutions = [], solIdx = 0, showing = false, dragging = false, dragVal = true;
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('rip-solutionsCount'), b = $('rip-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('rip-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('rip-rows'), ci = $('rip-cols'); if (ri && ci) { R = Math.max(2, Math.min(12, +ri.value || 6)); C = Math.max(2, Math.min(12, +ci.value || 6)); ri.value = R; ci.value = C; } };
    const mkBorders = () => { hB = Array.from({ length: R }, () => Array(C).fill(false)); vB = Array.from({ length: R }, () => Array(C).fill(false)); };

    function cellBorders(cell, r, c) {
        cell.classList.remove('bt', 'bb', 'bl', 'br');
        if (r === 0 || (r > 0 && hB[r - 1][c])) cell.classList.add('bt');
        if (r === R - 1 || (r < R - 1 && hB[r][c])) cell.classList.add('bb');
        if (c === 0 || (c > 0 && vB[r][c - 1])) cell.classList.add('bl');
        if (c === C - 1 || (c < C - 1 && vB[r][c])) cell.classList.add('br');
    }

    function buildRooms() {
        const vis = Array.from({ length: R }, () => Array(C).fill(false)), rooms = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            if (vis[r][c]) continue;
            const room = [], q = [[r, c]]; vis[r][c] = true;
            while (q.length) {
                const [cr, cc] = q.pop(); room.push(cr * C + cc);
                [[cr - 1, cc, cr - 1, cc, 'h'], [cr + 1, cc, cr, cc, 'h'], [cr, cc - 1, cr, cc - 1, 'v'], [cr, cc + 1, cr, cc, 'v']].forEach(([nr, nc, br, bc, t]) => {
                    if (nr < 0 || nr >= R || nc < 0 || nc >= C || vis[nr][nc]) return;
                    if (t === 'h' && hB[br][bc]) return; if (t === 'v' && vB[br][bc]) return;
                    vis[nr][nc] = true; q.push([nr, nc]);
                });
            }
            rooms.push(room);
        }
        return rooms;
    }

    function render() {
        const g = $('rip-grid-container'); if (!g) return; g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},42px)`; g.style.gridTemplateRows = `repeat(${R},42px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div'), k = r + ',' + c;
            cell.className = 'rip-cell'; cell.dataset.r = r; cell.dataset.c = c;
            cellBorders(cell, r, c);
            if (k in clues) { cell.classList.add('clue'); cell.textContent = clues[k]; }
            cell.onclick = () => {
                if (mode !== 'number' || showing) return;
                cell.classList.add('editing');
                const inp = document.createElement('input');
                inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'ki'; inp.maxLength = 2;
                if (k in clues) inp.value = clues[k];
                cell.textContent = ''; cell.appendChild(inp); inp.focus();
                const commit = () => { const n = parseInt(inp.value); if (n > 0) clues[k] = n; else delete clues[k]; cell.classList.remove('editing'); render(); };
                inp.addEventListener('blur', commit, { once: true });
                inp.onkeydown = ev => { if (ev.key === 'Enter') inp.blur(); else if (ev.key === 'Escape') { inp.value = ''; inp.blur(); } };
            };
            g.appendChild(cell);
        }
        if (mode === 'edit') drawLines(g);
        if (showing && solutions[solIdx]) g.querySelectorAll('.rip-cell').forEach(cell => {
            const r = +cell.dataset.r, c = +cell.dataset.c, v = solutions[solIdx][r][c], k = r + ',' + c;
            if (v > 0) { cell.textContent = v; if (!(k in clues)) cell.classList.add('solved'); }
        });
    }

    function drawLines(g) {
        const cs = 42, pad = 10;
        const mkLine = (type, r, c, css) => {
            const ln = document.createElement('div'); ln.className = `rip-line ${type}-line`;
            if ((type === 'h' ? hB : vB)[r][c]) ln.classList.add('active');
            ln.style.cssText = css;
            ln.addEventListener('mousedown', e => {
                e.preventDefault(); e.stopPropagation();
                const arr = type === 'h' ? hB : vB; arr[r][c] = !arr[r][c]; dragging = true; dragVal = arr[r][c];
                ln.classList.toggle('active', arr[r][c]); updateBorders();
            });
            ln.addEventListener('mouseenter', () => {
                if (!dragging) return;
                (type === 'h' ? hB : vB)[r][c] = dragVal; ln.classList.toggle('active', dragVal); updateBorders();
            });
            g.appendChild(ln);
        };
        for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++)
            mkLine('h', r, c, `left:${pad + c * cs}px;top:${pad + (r + 1) * cs - 3}px;width:${cs}px`);
        for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++)
            mkLine('v', r, c, `left:${pad + (c + 1) * cs - 3}px;top:${pad + r * cs}px;height:${cs}px`);
    }

    function updateBorders() {
        const g = $('rip-grid-container'); if (!g) return;
        g.querySelectorAll('.rip-cell').forEach(cell => cellBorders(cell, +cell.dataset.r, +cell.dataset.c));
    }

    document.addEventListener('mouseup', () => { dragging = false; });

    window.toggleRippleMode = () => {
        mode = mode === 'edit' ? 'number' : 'edit';
        const b = $('rip-mode-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = mode === 'edit' ? '模式: 调整边界' : '模式: 输入数字';
        render();
    };
    window.initRippleGrid = () => { readSize(); reset(); clues = {}; mkBorders(); mode = 'edit'; const b = $('rip-mode-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = '模式: 调整边界'; render(); stats('-', '-'); nav(false); };
    window.clearRippleGrid = () => { reset(); clues = {}; render(); stats('-', '-'); nav(false); };
    window.buildSimpleRippleExample = () => {
        R = 4; C = 4; const ri = $('rip-rows'), ci = $('rip-cols'); if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset(); clues = {}; mode = 'edit'; mkBorders();
        hB[1][0] = hB[1][1] = hB[1][2] = hB[1][3] = true;
        vB[0][1] = vB[1][1] = vB[2][1] = vB[3][1] = true;
        clues['0,0'] = 1; clues['0,2'] = 2;
        render(); stats('-', '-'); nav(false);
    };
    window.solveRippleUI = () => {
        if (!window.solveRippleEffect) return stats('模块未加载', '-');
        const rooms = buildRooms();
        if (!rooms.length) return stats('请先绘制房间', '-');
        const t0 = performance.now(), res = window.solveRippleEffect({ rows: R, cols: C, rooms, clues });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showRippleSolution(0); }
    };
    window.showRippleSolution = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('rip-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
