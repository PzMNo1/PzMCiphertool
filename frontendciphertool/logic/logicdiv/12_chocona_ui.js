window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('chocona-workspace', 'chocona-layout',
    // ── Left ──
    LogicUI.backButton('chocona-workspace') +
    LogicUI.title('CHOCONA', { color: 'var(--neon-cyan)' }) +
    LogicUI.sizeInputs('chocona-rows', 'chocona-cols', { rowVal: 7, colVal: 7 }) +
    LogicUI.actionGrid4([
        { label: '重置网格', onclick: 'window.initChoconaGrid && window.initChoconaGrid()' },
        { label: '计算核心分析', onclick: 'window.solveChoconaPuzzle && window.solveChoconaPuzzle()', id: 'chocona-solve-btn', glow: true },
        { label: '清空填涂', onclick: 'window.clearChoconaGrid && window.clearChoconaGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleChoconaExample && window.buildSimpleChoconaExample()' }
    ]) +
    LogicUI.statsPanel('chocona', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
    LogicUI.solutionNav('chocona', 'showChoconaSolution', { accent: 'var(--neon-cyan)' }) +
    LogicUI.instructions([
        '• <strong>左键点击格子</strong>：直接输入区域提示数字线索。',
        '• <strong>点击网格线</strong>：添加/删除区域边界（粉色高亮）。',
        '• <strong>涂黑规则</strong>：涂黑格子必须组成<strong>矩形</strong>（跨越区域边界亦可）。',
        '• <strong>区域线索</strong>：数字表示该区域内的涂黑格数量。'
    ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

    // ── Right ──
    `<div id="chocona-grid-container"></div>`,

    // ── Style ──
    `#chocona-grid-container{--chocona-cell-size:50px;display:grid;gap:2px;background:rgba(0,229,255,0.15);padding:4px;border-radius:8px;width:fit-content;margin:0 auto;border:2px solid var(--neon-cyan);box-shadow:0 0 20px rgba(0,229,255,0.4);position:relative}
    .chocona-cell{width:var(--chocona-cell-size);height:var(--chocona-cell-size);background:rgba(15,8,30,0.95);border-radius:3px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)}
    .chocona-cell:hover{box-shadow:inset 0 0 10px rgba(0,229,255,0.3)}
    .chocona-cell.border-top{border-top:2px solid var(--neon-cyan)!important}
    .chocona-cell.border-bottom{border-bottom:2px solid var(--neon-cyan)!important}
    .chocona-cell.border-left{border-left:2px solid var(--neon-cyan)!important}
    .chocona-cell.border-right{border-right:2px solid var(--neon-cyan)!important}
    .chocona-cell.shaded{background:rgba(100,100,110,0.85);box-shadow:inset 0 0 8px rgba(0,0,0,0.5)}
    .chocona-clue-input{width:100%;height:100%;background:transparent;border:none;outline:none;text-align:center;font-family:'Orbitron',monospace;font-weight:bold;font-size:1.4rem;color:#00e5ff;text-shadow:0 0 6px rgba(0,229,255,0.5);cursor:pointer}
    .chocona-cell.shaded .chocona-clue-input{color:#fff;text-shadow:0 0 5px #000}
    .chocona-edge-overlay{position:absolute;z-index:30;cursor:pointer;background-color:rgba(255,255,255,0.08);transition:background-color .15s ease}
    .chocona-edge-overlay:hover,.chocona-edge-overlay.drag-hover{background-color:rgba(0,229,255,0.5)!important;box-shadow:0 0 3px rgba(0,229,255,0.6)!important}
    .chocona-edge-overlay.active{background-color:var(--neon-cyan,#00e5ff)!important;box-shadow:0 0 3px var(--neon-cyan,#00e5ff),0 0 3px var(--neon-cyan,#00e5ff) inset!important;z-index:40}
    .chocona-edge-h{height:4px}
    .chocona-edge-v{width:4px}`
));

(function () {
    let R = 7, C = 7;
    let grid = [];      // { clue: null|int }
    let edgeState = {};  // 'h_r_c' or 'v_r_c' -> true

    window.choconaSolIdx = 0;

    const $ = id => document.getElementById(id);

    window.initChoconaGrid = function() {
        R = Math.max(3, Math.min(15, parseInt($('chocona-rows')?.value) || 7));
        C = Math.max(3, Math.min(15, parseInt($('chocona-cols')?.value) || 7));
        grid = Array.from({ length: R }, () =>
            Array.from({ length: C }, () => ({ clue: null }))
        );
        edgeState = {};
        
        window.choconaSolutions = [];
        window.choconaSolIdx = 0;

        const nav = $('chocona-solution-nav');
        if (nav) nav.style.display = 'none';
        
        const cnt = $('chocona-solutionsCount');
        if (cnt) cnt.textContent = '0';
        
        const tm = $('chocona-timeElapsed');
        if (tm) tm.textContent = '0';
        
        render();
    };

    function render() {
        const el = $('chocona-grid-container');
        if (!el) return;
        el.innerHTML = '';
        el.style.gridTemplateColumns = `repeat(${C}, var(--chocona-cell-size))`;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div');
                cell.className = 'chocona-cell';

                if (r === 0 || edgeState[`h_${r}_${c}`]) cell.classList.add('border-top');
                if (r === R - 1 || edgeState[`h_${r + 1}_${c}`]) cell.classList.add('border-bottom');
                if (c === 0 || edgeState[`v_${r}_${c - 1}`]) cell.classList.add('border-left');
                if (c === C - 1 || edgeState[`v_${r}_${c}`]) cell.classList.add('border-right');

                const input = document.createElement('input');
                input.className = 'chocona-clue-input';
                input.type = 'text';
                input.inputMode = 'numeric';
                input.maxLength = 2;
                if (grid[r][c].clue !== null) input.value = grid[r][c].clue;

                input.oninput = () => {
                    const v = input.value.trim();
                    if (!/^\d*$/.test(v)) {
                        input.value = grid[r][c].clue !== null ? grid[r][c].clue : '';
                        return;
                    }
                    grid[r][c].clue = v === '' ? null : parseInt(v);
                };

                cell.onclick = () => input.focus();

                cell.appendChild(input);
                el.appendChild(cell);
            }
        }

        renderEdgeOverlays();
    }

    let isDragging = false;
    let dragStartPos = null;

    function renderEdgeOverlays() {
        const el = $('chocona-grid-container');
        if (!el) return;
        el.querySelectorAll('.chocona-edge-overlay').forEach(e => e.remove());

        const cells = el.querySelectorAll('.chocona-cell');
        if (cells.length === 0) return;
        const cellW = cells[0].offsetWidth;
        const cellH = cells[0].offsetHeight;
        const gap = 2; // matches CSS gap

        for (let i = 1; i < R; i++) {
            for (let j = 0; j < C; j++) {
                const edgeId = `h_${i}_${j}`;
                const overlay = document.createElement('div');
                overlay.className = 'chocona-edge-overlay chocona-edge-h';
                overlay.dataset.edgeId = edgeId;
                overlay.dataset.type = 'h';
                if (edgeState[edgeId]) overlay.classList.add('active');
                overlay.style.left = `${j * (cellW + gap)}px`;
                overlay.style.top = `${i * (cellH + gap) - gap - 1}px`;
                overlay.style.width = `${cellW}px`;
                overlay.style.cursor = 'ns-resize';

                overlay.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleEdgeOverlay(edgeId, this);
                    isDragging = true;
                    dragStartPos = { type: 'h', lineId: edgeId };
                });
                el.appendChild(overlay);
            }
        }

        for (let i = 0; i < R; i++) {
            for (let j = 0; j < C - 1; j++) {
                const edgeId = `v_${i}_${j}`;
                const overlay = document.createElement('div');
                overlay.className = 'chocona-edge-overlay chocona-edge-v';
                overlay.dataset.edgeId = edgeId;
                overlay.dataset.type = 'v';
                if (edgeState[edgeId]) overlay.classList.add('active');
                overlay.style.left = `${(j + 1) * (cellW + gap) - gap - 1}px`;
                overlay.style.top = `${i * (cellH + gap)}px`;
                overlay.style.height = `${cellH}px`;
                overlay.style.cursor = 'ew-resize';

                overlay.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleEdgeOverlay(edgeId, this);
                    isDragging = true;
                    dragStartPos = { type: 'v', lineId: edgeId };
                });
                el.appendChild(overlay);
            }
        }

        document.removeEventListener('mousemove', handleChoconaEdgeDrag);
        document.addEventListener('mousemove', handleChoconaEdgeDrag);
        document.removeEventListener('mouseup', handleChoconaMouseUp);
        document.addEventListener('mouseup', handleChoconaMouseUp);
    }

    function handleChoconaEdgeDrag(e) {
        if (!isDragging || !dragStartPos) return;
        const el = $('chocona-grid-container');
        if (!el) return;

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const selector = dragStartPos.type === 'h' ? '.chocona-edge-overlay.chocona-edge-h' : '.chocona-edge-overlay.chocona-edge-v';
        const overlays = el.querySelectorAll(selector);

        el.querySelectorAll('.chocona-edge-overlay.drag-hover').forEach(ov => ov.classList.remove('drag-hover'));

        let closest = null;
        let closestDist = Infinity;

        overlays.forEach(ov => {
            const rect = ov.getBoundingClientRect();
            const eid = ov.dataset.edgeId;
            if (eid === dragStartPos.lineId) return;

            if (dragStartPos.type === 'h') {
                const lineY = rect.top + rect.height / 2;
                if (mouseX >= rect.left && mouseX <= rect.right) {
                    const d = Math.abs(mouseY - lineY);
                    if (d < 20 && d < closestDist) { closest = { ov, eid }; closestDist = d; }
                }
            } else {
                const lineX = rect.left + rect.width / 2;
                if (mouseY >= rect.top && mouseY <= rect.bottom) {
                    const d = Math.abs(mouseX - lineX);
                    if (d < 20 && d < closestDist) { closest = { ov, eid }; closestDist = d; }
                }
            }
        });

        if (closest) {
            closest.ov.classList.add('drag-hover');
            if (closest.eid !== dragStartPos.lineId) {
                toggleEdgeOverlay(closest.eid, closest.ov);
                dragStartPos.lineId = closest.eid;
            }
        }
        e.preventDefault();
    }

    function handleChoconaMouseUp() {
        if (isDragging) {
            const el = $('chocona-grid-container');
            if (el) el.querySelectorAll('.chocona-edge-overlay.drag-hover').forEach(ov => ov.classList.remove('drag-hover'));
            isDragging = false;
            dragStartPos = null;
        }
    }

    function toggleEdgeOverlay(edgeId, element) {
        if (edgeState[edgeId]) {
            delete edgeState[edgeId];
            element.classList.remove('active');
        } else {
            edgeState[edgeId] = true;
            element.classList.add('active');
        }
        updateCellBorders();
    }

    function updateCellBorders() {
        const el = $('chocona-grid-container');
        if (!el) return;
        const cells = el.querySelectorAll('.chocona-cell');
        let ci = 0;
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = cells[ci++];
                if (!cell) continue;
                cell.classList.remove('border-top', 'border-bottom', 'border-left', 'border-right');
                if (r === 0 || edgeState[`h_${r}_${c}`]) cell.classList.add('border-top');
                if (r === R - 1 || edgeState[`h_${r + 1}_${c}`]) cell.classList.add('border-bottom');
                if (c === 0 || edgeState[`v_${r}_${c - 1}`]) cell.classList.add('border-left');
                if (c === C - 1 || edgeState[`v_${r}_${c}`]) cell.classList.add('border-right');
            }
        }
    }

    function updateChoconaStats(count, time) {
        const cEl = $('chocona-solutionsCount');
        const tEl = $('chocona-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    window.solveChoconaPuzzle = function () {
        if (!window.solveChocona) { updateChoconaStats('模块未加载', '-'); return; }

        const puzzleCtx = {
            rows: R,
            cols: C,
            grid: grid.map(row => row.map(cell => ({ ...cell }))),
            edgeState: Object.assign({}, edgeState)
        };

        updateChoconaStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveChocona(puzzleCtx); } catch (e) {
                updateChoconaStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = Math.round(performance.now() - t0);

            if (res && res.error) { updateChoconaStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : window.choconaSolutions || [];
            window.choconaSolutions = solutions;
            window.choconaSolIdx = 0;

            if (res && res.timeout) {
                updateChoconaStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateChoconaStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = $('chocona-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showChoconaSolution(0);
            }
        }, 20);
    };

    function applySol(idx) {
        const sol = window.choconaSolutions[idx];
        const el = $('chocona-grid-container');
        if (!el) return;
        const cells = el.querySelectorAll('.chocona-cell');
        let ci = 0;
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = cells[ci++];
                if (!cell) continue;
                cell.classList.remove('shaded');
                if (sol[r * C + c] === 1) {
                    cell.classList.add('shaded');
                }
            }
        }
    }

    window.showChoconaSolution = function (delta) {
        if (!window.choconaSolutions?.length) return;
        window.choconaSolIdx = (window.choconaSolIdx + delta + window.choconaSolutions.length) % window.choconaSolutions.length;
        const ctr = $('chocona-solution-counter');
        if (ctr) ctr.textContent = `${window.choconaSolIdx + 1} / ${window.choconaSolutions.length}`;
        applySol(window.choconaSolIdx);
    };

    window.clearChoconaGrid = function () {
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                grid[r][c].clue = null;
            }
        }
        edgeState = {};
        window.choconaSolutions = [];
        window.choconaSolIdx = 0;
        
        const nav = $('chocona-solution-nav');
        if (nav) nav.style.display = 'none';
        
        const cnt = $('chocona-solutionsCount');
        if (cnt) cnt.textContent = '0';
        
        const tm = $('chocona-timeElapsed');
        if (tm) tm.textContent = '0';
        
        render();
    };

    window.buildSimpleChoconaExample = function () {
        const rIn = $('chocona-rows'), cIn = $('chocona-cols');
        if (rIn) rIn.value = 5;
        if (cIn) cIn.value = 5;
        window.initChoconaGrid();
        
        edgeState = {};
        for (let j = 0; j < 5; j++) edgeState[`h_2_${j}`] = true;
        edgeState['v_0_1'] = true;
        edgeState['v_1_1'] = true;
        edgeState['v_2_2'] = true;
        edgeState['v_3_2'] = true;
        edgeState['v_4_2'] = true;

        grid[0][0].clue = 2; // Room A
        grid[0][3].clue = 4; // Room B
        grid[3][1].clue = 3; // Room C
        grid[3][4].clue = 2; // Room D

        render();
    };

})();
