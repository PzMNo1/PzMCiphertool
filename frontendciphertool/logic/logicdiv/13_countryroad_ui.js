window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('countryroad-workspace', 'countryroad-layout',
    // ── Left ──
    LogicUI.backButton('countryroad-workspace') +
    LogicUI.title('COUNTRY ROAD', { color: 'var(--neon-cyan)' }) +
    LogicUI.sizeInputs('countryroad-rows', 'countryroad-cols', { rowVal: 7, colVal: 7 }) +
    LogicUI.actionGrid4([
        { label: '重置网格', onclick: 'window.initCountryroadGrid && window.initCountryroadGrid()' },
        { label: '计算核心分析', onclick: 'window.solveCountryroadPuzzle && window.solveCountryroadPuzzle()', id: 'countryroad-solve-btn', glow: true },
        { label: '清空填涂', onclick: 'window.clearCountryroadGrid && window.clearCountryroadGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleCountryroadExample && window.buildSimpleCountryroadExample()' }
    ]) +
    LogicUI.statsPanel('countryroad', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
    LogicUI.solutionNav('countryroad', 'showCountryroadSolution', { accent: 'var(--neon-cyan)' }) +
    LogicUI.instructions([
        '• <strong>左键点击格子</strong>：输入区域内循环路径必经格数线索。',
        '• <strong>点击网格线</strong>：添加/删除区域边界（高亮标注）。',
        '• <strong>循环路径</strong>：形成<strong>单一闭合环路</strong>，每格恰好2个相邻路径格。',
        '• <strong>禁止重入</strong>：环路进入每个区域后连续通过，不得再次进入。',
        '• <strong>跨区隔离</strong>：不同区域的非路径格不可正交相邻。'
    ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

    // ── Right ──
    `<div id="countryroad-grid-container"></div>`,

    // ── Style ──
    `#countryroad-grid-container{--cr-cell-size:50px;display:grid;gap:2px;background:rgba(0,229,255,0.15);padding:4px;border-radius:8px;width:fit-content;margin:0 auto;border:2px solid var(--neon-cyan);box-shadow:0 0 20px rgba(0,229,255,0.4);position:relative}
    .cr-cell{width:var(--cr-cell-size);height:var(--cr-cell-size);background:rgba(15,8,30,0.95);border-radius:3px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)}
    .cr-cell:hover{box-shadow:inset 0 0 10px rgba(0,229,255,0.3)}
    .cr-cell.border-top{border-top:2px solid var(--neon-cyan)!important}
    .cr-cell.border-bottom{border-bottom:2px solid var(--neon-cyan)!important}
    .cr-cell.border-left{border-left:2px solid var(--neon-cyan)!important}
    .cr-cell.border-right{border-right:2px solid var(--neon-cyan)!important}
    .cr-clue-input{width:100%;height:100%;background:transparent;border:none;outline:none;text-align:center;font-family:'Orbitron',monospace;font-weight:bold;font-size:1.4rem;color:#00e5ff;text-shadow:0 0 6px rgba(0,229,255,0.5);cursor:pointer}
    .cr-on-loop{background:rgba(0,100,120,0.35)!important}
    .cr-off-loop{background:rgba(15,8,30,0.95)}
    .cr-loop-center{position:absolute;width:8px;height:8px;background:#fff;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 0 5px #fff,0 0 10px #0ff;z-index:6;pointer-events:none}
    .cr-loop-line-h{position:absolute;height:4px;background:#fff;top:50%;margin-top:-2px;box-shadow:0 0 5px #fff,0 0 10px #0ff;z-index:5;pointer-events:none}
    .cr-loop-line-v{position:absolute;width:4px;background:#fff;left:50%;margin-left:-2px;box-shadow:0 0 5px #fff,0 0 10px #0ff;z-index:5;pointer-events:none}
    .cr-empty-x{color:rgba(255,255,255,0.15);font-size:1.2rem;pointer-events:none;user-select:none}
    .cr-edge-overlay{position:absolute;z-index:30;cursor:pointer;background-color:rgba(255,255,255,0.08);transition:background-color .15s ease}
    .cr-edge-overlay:hover,.cr-edge-overlay.drag-hover{background-color:rgba(0,229,255,0.5)!important;box-shadow:0 0 3px rgba(0,229,255,0.6)!important}
    .cr-edge-overlay.active{background-color:var(--neon-cyan,#00e5ff)!important;box-shadow:0 0 3px var(--neon-cyan,#00e5ff),0 0 3px var(--neon-cyan,#00e5ff) inset!important;z-index:40}
    .cr-edge-h{height:4px}
    .cr-edge-v{width:4px}`
));

(function () {
    let R = 7, C = 7;
    let grid = [];
    let edgeState = {};

    window.countryroadSolIdx = 0;

    const $ = id => document.getElementById(id);

    window.initCountryroadGrid = function() {
        R = Math.max(3, Math.min(15, parseInt($('countryroad-rows')?.value) || 7));
        C = Math.max(3, Math.min(15, parseInt($('countryroad-cols')?.value) || 7));
        grid = Array.from({ length: R }, () =>
            Array.from({ length: C }, () => ({ clue: null }))
        );
        edgeState = {};
        
        window.countryroadSolutions = [];
        window.countryroadSolIdx = 0;

        const nav = $('countryroad-solution-nav');
        if (nav) nav.style.display = 'none';
        
        const cnt = $('countryroad-solutionsCount');
        if (cnt) cnt.textContent = '0';
        
        const tm = $('countryroad-timeElapsed');
        if (tm) tm.textContent = '0';
        
        render();
    };

    function render() {
        const el = $('countryroad-grid-container');
        if (!el) return;
        el.innerHTML = '';
        el.style.gridTemplateColumns = `repeat(${C}, var(--cr-cell-size))`;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div');
                cell.className = 'cr-cell';

                if (r === 0 || edgeState[`h_${r}_${c}`]) cell.classList.add('border-top');
                if (r === R - 1 || edgeState[`h_${r + 1}_${c}`]) cell.classList.add('border-bottom');
                if (c === 0 || edgeState[`v_${r}_${c - 1}`]) cell.classList.add('border-left');
                if (c === C - 1 || edgeState[`v_${r}_${c}`]) cell.classList.add('border-right');

                const input = document.createElement('input');
                input.className = 'cr-clue-input';
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
        const el = $('countryroad-grid-container');
        if (!el) return;
        el.querySelectorAll('.cr-edge-overlay').forEach(e => e.remove());

        const cells = el.querySelectorAll('.cr-cell');
        if (cells.length === 0) return;
        const cellW = cells[0].offsetWidth;
        const cellH = cells[0].offsetHeight;
        const gap = 2;

        for (let i = 1; i < R; i++) {
            for (let j = 0; j < C; j++) {
                const edgeId = `h_${i}_${j}`;
                const ov = document.createElement('div');
                ov.className = 'cr-edge-overlay cr-edge-h';
                ov.dataset.edgeId = edgeId;
                ov.dataset.type = 'h';
                if (edgeState[edgeId]) ov.classList.add('active');
                ov.style.left = `${j * (cellW + gap)}px`;
                ov.style.top = `${i * (cellH + gap) - gap - 1}px`;
                ov.style.width = `${cellW}px`;
                ov.style.cursor = 'ns-resize';
                ov.addEventListener('mousedown', function (e) {
                    e.preventDefault(); e.stopPropagation();
                    toggleEdge(edgeId, this);
                    isDragging = true;
                    dragStartPos = { type: 'h', lineId: edgeId };
                });
                el.appendChild(ov);
            }
        }

        for (let i = 0; i < R; i++) {
            for (let j = 0; j < C - 1; j++) {
                const edgeId = `v_${i}_${j}`;
                const ov = document.createElement('div');
                ov.className = 'cr-edge-overlay cr-edge-v';
                ov.dataset.edgeId = edgeId;
                ov.dataset.type = 'v';
                if (edgeState[edgeId]) ov.classList.add('active');
                ov.style.left = `${(j + 1) * (cellW + gap) - gap - 1}px`;
                ov.style.top = `${i * (cellH + gap)}px`;
                ov.style.height = `${cellH}px`;
                ov.style.cursor = 'ew-resize';
                ov.addEventListener('mousedown', function (e) {
                    e.preventDefault(); e.stopPropagation();
                    toggleEdge(edgeId, this);
                    isDragging = true;
                    dragStartPos = { type: 'v', lineId: edgeId };
                });
                el.appendChild(ov);
            }
        }

        document.removeEventListener('mousemove', handleCREdgeDrag);
        document.addEventListener('mousemove', handleCREdgeDrag);
        document.removeEventListener('mouseup', handleCRMouseUp);
        document.addEventListener('mouseup', handleCRMouseUp);
    }

    function handleCREdgeDrag(e) {
        if (!isDragging || !dragStartPos) return;
        const el = $('countryroad-grid-container');
        if (!el) return;
        const mx = e.clientX, my = e.clientY;
        const sel = dragStartPos.type === 'h' ? '.cr-edge-overlay.cr-edge-h' : '.cr-edge-overlay.cr-edge-v';
        const overlays = el.querySelectorAll(sel);
        el.querySelectorAll('.cr-edge-overlay.drag-hover').forEach(o => o.classList.remove('drag-hover'));

        let closest = null, closestDist = Infinity;
        overlays.forEach(ov => {
            const rect = ov.getBoundingClientRect();
            const eid = ov.dataset.edgeId;
            if (eid === dragStartPos.lineId) return;
            if (dragStartPos.type === 'h') {
                const ly = rect.top + rect.height / 2;
                if (mx >= rect.left && mx <= rect.right) {
                    const d = Math.abs(my - ly);
                    if (d < 20 && d < closestDist) { closest = { ov, eid }; closestDist = d; }
                }
            } else {
                const lx = rect.left + rect.width / 2;
                if (my >= rect.top && my <= rect.bottom) {
                    const d = Math.abs(mx - lx);
                    if (d < 20 && d < closestDist) { closest = { ov, eid }; closestDist = d; }
                }
            }
        });
        if (closest) {
            closest.ov.classList.add('drag-hover');
            if (closest.eid !== dragStartPos.lineId) {
                toggleEdge(closest.eid, closest.ov);
                dragStartPos.lineId = closest.eid;
            }
        }
        e.preventDefault();
    }

    function handleCRMouseUp() {
        if (isDragging) {
            const el = $('countryroad-grid-container');
            if (el) el.querySelectorAll('.cr-edge-overlay.drag-hover').forEach(o => o.classList.remove('drag-hover'));
            isDragging = false;
            dragStartPos = null;
        }
    }

    function toggleEdge(edgeId, element) {
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
        const el = $('countryroad-grid-container');
        if (!el) return;
        const cells = el.querySelectorAll('.cr-cell');
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

    function updateCRStats(count, time) {
        const cEl = $('countryroad-solutionsCount');
        const tEl = $('countryroad-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    window.solveCountryroadPuzzle = function () {
        if (!window.solveCountryroad) { updateCRStats('模块未加载', '-'); return; }

        const puzzleCtx = {
            rows: R,
            cols: C,
            grid: grid.map(row => row.map(cell => ({ ...cell }))),
            edgeState: Object.assign({}, edgeState)
        };

        updateCRStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveCountryroad(puzzleCtx); } catch (e) {
                updateCRStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = LogicUI.formatElapsed(performance.now() - t0);

            if (res && res.error) { updateCRStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : window.countryroadSolutions || [];
            window.countryroadSolutions = solutions;
            window.countryroadSolIdx = 0;

            if (res && res.timeout) {
                updateCRStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateCRStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = $('countryroad-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showCountryroadSolution(0);
            }
        }, 20);
    };

    function applySol(idx) {
        const sol = window.countryroadSolutions[idx];
        const el = $('countryroad-grid-container');
        if (!el) return;
        const cells = el.querySelectorAll('.cr-cell');
        let ci = 0;
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = cells[ci++];
                if (!cell) continue;
                cell.querySelectorAll('.cr-loop-center, .cr-loop-line-h, .cr-loop-line-v, .cr-empty-x').forEach(e => e.remove());
                cell.classList.remove('cr-on-loop', 'cr-off-loop');

                if (sol[r][c] === 1) {
                    cell.classList.add('cr-on-loop');
                    const dot = document.createElement('div');
                    dot.className = 'cr-loop-center';
                    cell.appendChild(dot);
                    
                    if (r > 0 && sol[r - 1][c] === 1) {
                        const line = document.createElement('div');
                        line.className = 'cr-loop-line-v';
                        line.style.top = '0'; line.style.height = '50%';
                        cell.appendChild(line);
                    }
                    if (r < R - 1 && sol[r + 1][c] === 1) {
                        const line = document.createElement('div');
                        line.className = 'cr-loop-line-v';
                        line.style.top = '50%'; line.style.height = '50%';
                        cell.appendChild(line);
                    }
                    if (c > 0 && sol[r][c - 1] === 1) {
                        const line = document.createElement('div');
                        line.className = 'cr-loop-line-h';
                        line.style.left = '0'; line.style.width = '50%';
                        cell.appendChild(line);
                    }
                    if (c < C - 1 && sol[r][c + 1] === 1) {
                        const line = document.createElement('div');
                        line.className = 'cr-loop-line-h';
                        line.style.left = '50%'; line.style.width = '50%';
                        cell.appendChild(line);
                    }
                } else {
                    cell.classList.add('cr-off-loop');
                    const x = document.createElement('span');
                    x.className = 'cr-empty-x';
                    x.textContent = '×';
                    cell.appendChild(x);
                }
            }
        }
    }

    window.showCountryroadSolution = function (delta) {
        if (!window.countryroadSolutions?.length) return;
        window.countryroadSolIdx = (window.countryroadSolIdx + delta + window.countryroadSolutions.length) % window.countryroadSolutions.length;
        const ctr = $('countryroad-solution-counter');
        if (ctr) ctr.textContent = `${window.countryroadSolIdx + 1} / ${window.countryroadSolutions.length}`;
        applySol(window.countryroadSolIdx);
    };

    window.clearCountryroadGrid = function () {
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                grid[r][c].clue = null;
            }
        }
        edgeState = {};
        window.countryroadSolutions = [];
        window.countryroadSolIdx = 0;
        
        const nav = $('countryroad-solution-nav');
        if (nav) nav.style.display = 'none';
        
        const cnt = $('countryroad-solutionsCount');
        if (cnt) cnt.textContent = '0';
        
        const tm = $('countryroad-timeElapsed');
        if (tm) tm.textContent = '0';
        
        render();
    };

    window.buildSimpleCountryroadExample = function () {
        const rIn = $('countryroad-rows'), cIn = $('countryroad-cols');
        if (rIn) rIn.value = 5;
        if (cIn) cIn.value = 5;
        window.initCountryroadGrid();

        edgeState = {};
        for (let j = 0; j < 5; j++) edgeState[`h_2_${j}`] = true;
        edgeState['v_0_1'] = true;
        edgeState['v_1_1'] = true;
        edgeState['v_2_2'] = true;
        edgeState['v_3_2'] = true;
        edgeState['v_4_2'] = true;

        grid[0][0].clue = 3;
        grid[0][3].clue = 4;
        grid[3][1].clue = 5;
        grid[3][4].clue = 4;

        render();
    };

})();
