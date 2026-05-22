(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('onsen-workspace', 'onsen-layout',
        window.LogicUI.backButton('onsen-workspace') +
        window.LogicUI.title('ONSEN', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('onsen-rows', 'onsen-cols', { rowVal: 4, colVal: 4, rowMin: 2, colMin: 2, rowMax: 8, colMax: 8 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initOnsenGrid && window.initOnsenGrid()' },
            { label: '计算核心分析', onclick: 'window.solveOnsenUI && window.solveOnsenUI()', id: 'onsen-solve-btn', glow: true },
            { label: '清空线索', onclick: 'window.clearOnsenClues && window.clearOnsenClues()' },
            { label: '简单示例', onclick: 'window.buildOnsenExample && window.buildOnsenExample()' }
        ]) +
        `<div style="margin-bottom:1.5rem;display:flex;gap:10px"><button class="cyber-button" style="flex:1" id="onsen-mode-btn" onclick="window.toggleOnsenMode && window.toggleOnsenMode()"><span class="cyber-button__tag">模式: 调整边界</span></button></div>` +
        window.LogicUI.statsPanel('onsen', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('onsen', 'showOnsenSol', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '边界模式: 点击/拖拽网格线绘制房间边界',
            '数字模式: 左键输入线索(回路在该房间内的格数)',
            '回路须经过每个房间; 不可重入同一房间',
            '回路数 = 线索数; 最大网格 8×8'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="onsen-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;user-select:none"></div>`,
        `#onsen-grid-container{gap:0}
        .os-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative}
        .os-cell:hover{background:rgba(0,255,231,.08)}
        .os-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .os-cell.active-nav{outline:2px solid rgba(0,255,231,.5);z-index:5}
        .os-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}
        .os-cell.bt{border-top:3px solid var(--neon-cyan)}.os-cell.bb{border-bottom:3px solid var(--neon-cyan)}.os-cell.bl{border-left:3px solid var(--neon-cyan)}.os-cell.br{border-right:3px solid var(--neon-cyan)}
        .os-cell input.ki{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.95rem;font-weight:700;outline:0;padding:0;margin:0}
        .os-line{position:absolute;z-index:50;cursor:pointer;transition:background .15s}
        .os-line.h-line{height:7px;background:rgba(255,255,255,.08)}
        .os-line.v-line{width:7px;background:rgba(255,255,255,.08)}
        .os-line:hover,.os-line.drag-hover{background:#00ffe7!important;box-shadow:0 0 6px #00ffe7!important}
        .os-line.active{background:#00ffe7!important;box-shadow:0 0 5px #00ffe7,0 0 2px #00ffe7 inset!important}
        .os-loop-seg{position:absolute;background:rgba(0,255,200,.7);border-radius:2px;z-index:20;pointer-events:none}`
    ));

    const $ = id => document.getElementById(id);
    let R = 4, C = 4, clues = {}, hB = [], vB = [], mode = 'edit', solutions = [], solIdx = 0, showing = false, sel = null;
    let dragging = false, dragVal = true;

    function reset() { solutions = []; solIdx = 0; showing = false; }
    function stats(c, t) { const a = $('onsen-solutionsCount'), b = $('onsen-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; }
    function nav(v) { const n = $('onsen-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; }

    function readSize() {
        const ri = $('onsen-rows'), ci = $('onsen-cols');
        if (ri && ci) { R = Math.max(2, Math.min(8, +ri.value || 4)); C = Math.max(2, Math.min(8, +ci.value || 4)); ri.value = R; ci.value = C; }
    }

    function buildRooms() {
        const visited = Array.from({ length: R }, () => new Array(C).fill(false));
        const rooms = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            if (visited[r][c]) continue;
            const room = [], q = [[r, c]]; visited[r][c] = true;
            while (q.length) {
                const [cr, cc] = q.pop(); room.push(cr * C + cc);
                if (cr > 0 && !visited[cr - 1][cc] && !hB[cr - 1][cc]) { visited[cr - 1][cc] = true; q.push([cr - 1, cc]); }
                if (cr < R - 1 && !visited[cr + 1][cc] && !hB[cr][cc]) { visited[cr + 1][cc] = true; q.push([cr + 1, cc]); }
                if (cc > 0 && !visited[cr][cc - 1] && !vB[cr][cc - 1]) { visited[cr][cc - 1] = true; q.push([cr, cc - 1]); }
                if (cc < C - 1 && !visited[cr][cc + 1] && !vB[cr][cc]) { visited[cr][cc + 1] = true; q.push([cr, cc + 1]); }
            }
            rooms.push(room);
        }
        return rooms;
    }

    function render() {
        const g = $('onsen-grid-container'); if (!g) return; g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},42px)`; g.style.gridTemplateRows = `repeat(${R},42px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div');
            cell.className = 'os-cell'; cell.dataset.r = r; cell.dataset.c = c;
            // Outer borders
            if (r === 0) cell.classList.add('bt'); if (r === R - 1) cell.classList.add('bb');
            if (c === 0) cell.classList.add('bl'); if (c === C - 1) cell.classList.add('br');
            // Internal borders
            if (r > 0 && hB[r - 1][c]) cell.classList.add('bt');
            if (r < R - 1 && hB[r][c]) cell.classList.add('bb');
            if (c > 0 && vB[r][c - 1]) cell.classList.add('bl');
            if (c < C - 1 && vB[r][c]) cell.classList.add('br');
            const k = r + ',' + c;
            if (k in clues) { cell.classList.add('clue'); cell.textContent = clues[k]; }
            if (sel && sel.r === r && sel.c === c) cell.classList.add('active-nav');
            // Click for number mode
            cell.onclick = () => {
                if (mode !== 'number' || showing) return;
                sel = { r, c }; cell.classList.add('editing');
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
        // Draw clickable border lines
        if (mode === 'edit') drawLines(g);
        // Draw solution loops
        if (showing && solutions[solIdx]) drawLoop(g, solutions[solIdx]);
    }

    function drawLines(g) {
        const cs = 42, pad = 10;
        function toggleLine(type, r, c, ln) {
            if (type === 'h') hB[r][c] = !hB[r][c];
            else vB[r][c] = !vB[r][c];
            const isActive = type === 'h' ? hB[r][c] : vB[r][c];
            if (isActive) ln.classList.add('active'); else ln.classList.remove('active');
            updateCellBorders();
        }
        function setLine(type, r, c, val, ln) {
            if (type === 'h') hB[r][c] = val;
            else vB[r][c] = val;
            if (val) ln.classList.add('active'); else ln.classList.remove('active');
            updateCellBorders();
        }
        for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) {
            const ln = document.createElement('div'); ln.className = 'os-line h-line';
            if (hB[r][c]) ln.classList.add('active');
            ln.style.cssText = `left:${pad + c * cs}px;top:${pad + (r + 1) * cs - 3}px;width:${cs}px`;
            ln.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); toggleLine('h', r, c, ln); dragging = true; dragVal = hB[r][c]; });
            ln.addEventListener('mouseenter', () => { if (dragging) setLine('h', r, c, dragVal, ln); });
            g.appendChild(ln);
        }
        for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) {
            const ln = document.createElement('div'); ln.className = 'os-line v-line';
            if (vB[r][c]) ln.classList.add('active');
            ln.style.cssText = `left:${pad + (c + 1) * cs - 3}px;top:${pad + r * cs}px;height:${cs}px`;
            ln.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); toggleLine('v', r, c, ln); dragging = true; dragVal = vB[r][c]; });
            ln.addEventListener('mouseenter', () => { if (dragging) setLine('v', r, c, dragVal, ln); });
            g.appendChild(ln);
        }
    }

    function updateCellBorders() {
        const g = $('onsen-grid-container'); if (!g) return;
        g.querySelectorAll('.os-cell').forEach(cell => {
            const r = +cell.dataset.r, c = +cell.dataset.c;
            cell.classList.remove('bt', 'bb', 'bl', 'br');
            if (r === 0) cell.classList.add('bt'); if (r === R - 1) cell.classList.add('bb');
            if (c === 0) cell.classList.add('bl'); if (c === C - 1) cell.classList.add('br');
            if (r > 0 && hB[r - 1][c]) cell.classList.add('bt');
            if (r < R - 1 && hB[r][c]) cell.classList.add('bb');
            if (c > 0 && vB[r][c - 1]) cell.classList.add('bl');
            if (c < C - 1 && vB[r][c]) cell.classList.add('br');
        });
    }

    document.addEventListener('mouseup', () => { dragging = false; });

    function drawLoop(g, sol) {
        const cs = 42, hw = 4, pad = 10, colors = ['rgba(0,255,200,.8)', 'rgba(255,100,200,.8)', 'rgba(100,200,255,.8)', 'rgba(255,200,50,.8)'];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const d = sol[r][c]; if (!d.m) continue;
            const col = colors[(d.l - 1) % colors.length], cx = pad + c * cs + cs / 2, cy = pad + r * cs + cs / 2;
            if (d.m & 1) { const s = document.createElement('div'); s.className = 'os-loop-seg'; s.style.cssText = `left:${cx - hw / 2}px;top:${pad + r * cs}px;width:${hw}px;height:${cs / 2}px;background:${col}`; g.appendChild(s); }
            if (d.m & 2) { const s = document.createElement('div'); s.className = 'os-loop-seg'; s.style.cssText = `left:${cx}px;top:${cy - hw / 2}px;width:${cs / 2}px;height:${hw}px;background:${col}`; g.appendChild(s); }
            if (d.m & 4) { const s = document.createElement('div'); s.className = 'os-loop-seg'; s.style.cssText = `left:${cx - hw / 2}px;top:${cy}px;width:${hw}px;height:${cs / 2}px;background:${col}`; g.appendChild(s); }
            if (d.m & 8) { const s = document.createElement('div'); s.className = 'os-loop-seg'; s.style.cssText = `left:${pad + c * cs}px;top:${cy - hw / 2}px;width:${cs / 2}px;height:${hw}px;background:${col}`; g.appendChild(s); }
            const dot = document.createElement('div'); dot.className = 'os-loop-seg';
            dot.style.cssText = `left:${cx - 3}px;top:${cy - 3}px;width:6px;height:6px;border-radius:50%;background:${col}`;
            g.appendChild(dot);
        }
    }

    window.toggleOnsenMode = () => { mode = mode === 'edit' ? 'number' : 'edit'; const b = $('onsen-mode-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = mode === 'edit' ? '模式: 调整边界' : '模式: 输入数字'; render(); };
    window.initOnsenGrid = () => { readSize(); reset(); clues = {}; hB = Array.from({ length: R }, () => new Array(C).fill(false)); vB = Array.from({ length: R }, () => new Array(C).fill(false)); sel = null; mode = 'edit'; const b = $('onsen-mode-btn'); if (b) b.querySelector('.cyber-button__tag').textContent = '模式: 调整边界'; render(); stats('-', '-'); nav(false); };
    window.clearOnsenClues = () => { reset(); clues = {}; render(); stats('-', '-'); nav(false); };

    // Example: 2×2, 2 column rooms [A|B], clue at (0,0)=2
    // Solution: (0,0)→(0,1)→(1,1)→(1,0)→(0,0) — visits each room as contiguous segment
    window.buildOnsenExample = () => {
        R = 2; C = 2;
        const ri = $('onsen-rows'), ci = $('onsen-cols');
        if (ri) ri.value = 2; if (ci) ci.value = 2;
        reset(); clues = {}; mode = 'edit';
        hB = Array.from({ length: R }, () => new Array(C).fill(false));
        vB = Array.from({ length: R }, () => new Array(C).fill(false));
        vB[0][0] = true; vB[1][0] = true; // vertical border between col 0 and col 1
        clues['0,0'] = 2;
        render(); stats('-', '-'); nav(false);
    };

    window.solveOnsenUI = () => {
        if (!window.solveOnsen) return stats('模块未加载', '-');
        if (!Object.keys(clues).length) return stats('需要至少1个线索', '-');
        const rooms = buildRooms();
        const t0 = performance.now();
        const res = window.solveOnsen({ rows: R, cols: C, clues, rooms });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showOnsenSol(0); }
    };

    window.showOnsenSol = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('onsen-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
