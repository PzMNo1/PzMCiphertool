window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('aquarium-workspace', 'aquarium-layout',
    // ── Left ──
    LogicUI.backButton('aquarium-workspace') +
    LogicUI.title('AQUARIUM 水族箱', { color: 'var(--neon-blue)' }) +
    LogicUI.sizeInputs('aquarium-rows', 'aquarium-cols', { rowVal: 6, colVal: 6, rowMin: 2, colMin: 2 }) +
    LogicUI.actionGrid4([
        { label: '生成网格', onclick: 'window.initAquariumGrid && window.initAquariumGrid()' },
        { label: '计算核心分析', onclick: 'window.solveAquariumPuzzle && window.solveAquariumPuzzle()', id: 'aquarium-solve-btn', glow: true },
        { label: '重置清理', onclick: 'window.clearAquariumGrid && window.clearAquariumGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleAquariumExample && window.buildSimpleAquariumExample()' }
    ]) +
    `<div style="margin-bottom:1.5rem;display:flex;gap:10px;"><button class="cyber-button" style="flex:1;" id="aquarium-mode-btn" onclick="window.toggleAquariumMode && window.toggleAquariumMode()"><span class="cyber-button__tag">模式: 调整边界</span></button></div>` +
    LogicUI.statsPanel('aquarium', { countLabel: '找到解决方案', timeLabel: 'AI thinking耗时', accent: 'var(--neon-blue)' }) +
    LogicUI.solutionNav('aquarium', 'showAquariumSolution', { accent: 'var(--neon-blue)' }) +
    LogicUI.instructions([
        '• <strong>边界模式</strong>: 在网格间拖动或点击来绘制区域!',
        '• <strong>填水模式</strong>: 点击格子切换 水/空气/空 状态!',
        '• <strong>规则</strong>: 每一个区域内的水必须形成平齐的水平面，列/行提示数字表示该列/行有多少格子是水。'
    ], { accent: 'var(--neon-purple)', title: '操作说明' }),

    // ── Right ──
    `<div id="aquarium-grid-container"></div>`,

    // ── Style ──
    `#aquarium-grid-container{--grid-size:40px;display:grid;gap:0;background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;border:1px solid var(--neon-blue);position:relative;user-select:none;width:fit-content;margin:0 auto;box-sizing:border-box}
    .aquarium-cell{width:var(--grid-size);height:var(--grid-size);background:rgba(255,255,255,0.05);font-size:1.2rem;color:white;text-shadow:0 0 5px white;border:1px solid rgba(255,255,255,0.1);}
    .aquarium-cell.empty-corner{border:none;background:none}
    .aquarium-clue-input{width:var(--grid-size);height:var(--grid-size);box-sizing:border-box;background:rgba(0,255,255,0.1);border:1px solid rgba(0,255,255,0.3);color:var(--neon-blue);text-align:center;font-size:1.2rem;font-weight:bold;outline:none;transition:all .2s}
    .aquarium-clue-input:focus{background:rgba(0,255,255,0.2);border-color:var(--neon-blue);box-shadow:0 0 5px var(--neon-blue)}
    .aquarium-cell:hover{background:rgba(255,255,255,0.1)}
    .aquarium-cell.water{background:rgba(0,150,255,0.6);border:1px solid rgba(0,150,255,0.8);box-shadow:inset 0 0 10px rgba(0,150,255,0.8)}
    .aquarium-cell.air{background:rgba(200,200,200,0.2);border:1px solid rgba(200,200,200,0.4)}
    .aquarium-cell.outer-top{border-top:3px solid var(--neon-purple)}
    .aquarium-cell.outer-bottom{border-bottom:3px solid var(--neon-purple)}
    .aquarium-cell.outer-left{border-left:3px solid var(--neon-purple)}
    .aquarium-cell.outer-right{border-right:3px solid var(--neon-purple)}
    .grid-line{position:absolute;background-color:rgba(255,255,255,0.08);z-index:30;transition:background-color .15s ease}
    .grid-line:hover,.grid-line.drag-hover{background-color:var(--neon-purple,#cc00ff)!important;box-shadow:0 0 3px var(--neon-purple,#cc00ff)!important}
    .grid-line.active{background-color:var(--neon-blue,#00f3ff)!important;box-shadow:0 0 3px var(--neon-blue,#00f3ff),0 0 3px var(--neon-blue,#00f3ff) inset!important;z-index:40}`
));

(function () {
    // Aquarium Global State
    let aquariumRows = 6;
    let aquariumCols = 6;

    // Arrays for states
    let aquariumHBorders = []; // row x col, true if border BELOW cell (row, col)
    let aquariumVBorders = []; // row x col, true if border RIGHT OF cell (row, col)
    let aquariumCellStates = []; // 0: empty, 1: water, 2: air
    let aquariumRowClues = [];
    let aquariumColClues = [];

    let aquariumCurrentMode = 'edit'; // 'edit' or 'play'
    window.aquariumSolutions = [];
    window.aquariumRegionsCache = [];
    window.aquariumCurrentSolIndex = 0;

    function updateStats(count, time) {
        const cEl = document.getElementById('aquarium-solutionsCount');
        const tEl = document.getElementById('aquarium-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    function resetPuzzle() {
        window.aquariumSolutions = [];
        window.aquariumCurrentSolIndex = 0;
        const nav = document.getElementById('aquarium-solution-nav');
        if (nav) nav.style.display = 'none';
        updateStats('0', '0');
    }

    let aquariumIsShowingSolution = false;
    let aquariumIsDragging = false;
    let aquariumDragStartPos = null;

    window.initAquariumGrid = function () {
        let rowsInput = document.getElementById('aquarium-rows');
        let colsInput = document.getElementById('aquarium-cols');
        aquariumRows = rowsInput ? parseInt(rowsInput.value) : 6;
        aquariumCols = colsInput ? parseInt(colsInput.value) : 6;

        aquariumRows = Math.max(2, Math.min(15, aquariumRows));
        aquariumCols = Math.max(2, Math.min(15, aquariumCols));

        // Reset state
        window.aquariumRegionsCache = [];
        aquariumIsShowingSolution = false;
        resetPuzzle();
        aquariumCurrentMode = 'edit';
        updateModeButton();

        aquariumHBorders = Array(aquariumRows).fill().map(() => Array(aquariumCols).fill(false));
        aquariumVBorders = Array(aquariumRows).fill().map(() => Array(aquariumCols).fill(false));
        aquariumCellStates = Array(aquariumRows).fill().map(() => Array(aquariumCols).fill(0));
        aquariumRowClues = Array(aquariumRows).fill('');
        aquariumColClues = Array(aquariumCols).fill('');

        renderAquariumPuzzleGrid();
    };

    window.clearAquariumGrid = function () {
        window.initAquariumGrid();
    };

    window.toggleAquariumMode = function () {
        aquariumCurrentMode = (aquariumCurrentMode === 'edit') ? 'play' : 'edit';
        updateModeButton();
    };

    function updateModeButton() {
        const btn = document.getElementById('aquarium-mode-btn');
        if (btn) {
            btn.querySelector('.cyber-button__tag').textContent = aquariumCurrentMode === 'edit' ? '模式: 调整边界' : '模式: 手动填水';
            if (aquariumCurrentMode === 'play') {
                btn.classList.add('cyber-glow');
            } else {
                btn.classList.remove('cyber-glow');
            }
        }
    }

    function renderAquariumPuzzleGrid() {
        const puzzleGrid = document.getElementById('aquarium-grid-container');
        if (!puzzleGrid) return;
        puzzleGrid.innerHTML = '';

        puzzleGrid.style.position = 'relative';
        puzzleGrid.style.gridTemplateColumns = 'var(--grid-size) repeat(' + aquariumCols + ', var(--grid-size))';
        puzzleGrid.style.gridTemplateRows = 'var(--grid-size) repeat(' + aquariumRows + ', var(--grid-size))';

        // Top-left corner (empty)
        const corner = document.createElement('div');
        corner.className = 'aquarium-cell empty-corner';
        puzzleGrid.appendChild(corner);

        // Top clues (Column clues)
        for (let c = 0; c < aquariumCols; c++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'aquarium-clue-input';
            input.placeholder = '↓';
            input.value = aquariumColClues[c];
            input.onchange = (e) => {
                const val = e.target.value.trim();
                aquariumColClues[c] = val;
            };
            puzzleGrid.appendChild(input);
        }

        for (let r = 0; r < aquariumRows; r++) {
            // Left clue (Row clue)
            const rowInput = document.createElement('input');
            rowInput.type = 'text';
            rowInput.className = 'aquarium-clue-input';
            rowInput.placeholder = '→';
            rowInput.value = aquariumRowClues[r];
            rowInput.onchange = (e) => {
                const val = e.target.value.trim();
                aquariumRowClues[r] = val;
            };
            puzzleGrid.appendChild(rowInput);

            // Cells
            for (let c = 0; c < aquariumCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'aquarium-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                // Add exterior strong borders to cells itself
                if (r === 0) cell.classList.add('outer-top');
                if (r === aquariumRows - 1) cell.classList.add('outer-bottom');
                if (c === 0) cell.classList.add('outer-left');
                if (c === aquariumCols - 1) cell.classList.add('outer-right');

                updateAquariumCellDisplay(cell, aquariumCellStates[r][c]);

                cell.addEventListener('click', function (e) {
                    if (aquariumIsShowingSolution || aquariumCurrentMode !== 'play') return;
                    // Cycle: 0 -> 1 -> 2 -> 0
                    aquariumCellStates[r][c] = (aquariumCellStates[r][c] + 1) % 3;
                    updateAquariumCellDisplay(this, aquariumCellStates[r][c]);
                    e.preventDefault();
                });

                puzzleGrid.appendChild(cell);
            }
        }

        createAquariumGridLines();
    }

    function createAquariumGridLines() {
        const puzzleGrid = document.getElementById('aquarium-grid-container');
        if (!puzzleGrid) return;
        const existingLines = puzzleGrid.querySelectorAll('.grid-line');
        existingLines.forEach(line => line.remove());

        // Grid lines should be placed according to the internal DOM structure.
        // We have var(--grid-size) padding on left and top because of the inputs.
        const cells = puzzleGrid.querySelectorAll('.aquarium-cell:not(.empty-corner)');
        if (cells.length === 0) return;

        const cellSize = cells[0].offsetWidth;
        const padding = parseInt(getComputedStyle(puzzleGrid).padding) || 16;
        const offsetLeft = padding + cellSize; // accommodate row inputs
        const offsetTop = padding + cellSize;  // accommodate col inputs

        // Horizontal lines (placed below each cell, except last row)
        for (let r = 0; r < aquariumRows - 1; r++) {
            for (let c = 0; c < aquariumCols; c++) {
                const line = document.createElement('div');
                line.className = 'grid-line horizontal-line';
                line.dataset.id = 'h_' + r + '_' + c;
                line.dataset.type = 'h';

                line.style.position = 'absolute';
                line.style.left = (offsetLeft + c * cellSize) + 'px';
                line.style.top = (offsetTop + (r + 1) * cellSize - 2) + 'px';
                line.style.width = cellSize + 'px';
                line.style.height = '4px';
                line.style.cursor = 'ns-resize';

                if (aquariumHBorders[r][c]) line.classList.add('active');

                line.addEventListener('mousedown', function (e) {
                    if (aquariumIsShowingSolution || aquariumCurrentMode !== 'edit') return;
                    toggleAquariumEdgeLine(this.dataset.id, this);
                    aquariumIsDragging = true;
                    aquariumDragStartPos = { type: 'h', lineId: this.dataset.id };
                    e.preventDefault();
                    e.stopPropagation();
                });

                puzzleGrid.appendChild(line);
            }
        }

        // Vertical lines (placed right of each cell, except last col)
        for (let r = 0; r < aquariumRows; r++) {
            for (let c = 0; c < aquariumCols - 1; c++) {
                const line = document.createElement('div');
                line.className = 'grid-line vertical-line';
                line.dataset.id = 'v_' + r + '_' + c;
                line.dataset.type = 'v';

                line.style.position = 'absolute';
                line.style.left = (offsetLeft + (c + 1) * cellSize - 2) + 'px';
                line.style.top = (offsetTop + r * cellSize) + 'px';
                line.style.width = '4px';
                line.style.height = cellSize + 'px';
                line.style.cursor = 'ew-resize';

                if (aquariumVBorders[r][c]) line.classList.add('active');

                line.addEventListener('mousedown', function (e) {
                    if (aquariumIsShowingSolution || aquariumCurrentMode !== 'edit') return;
                    toggleAquariumEdgeLine(this.dataset.id, this);
                    aquariumIsDragging = true;
                    aquariumDragStartPos = { type: 'v', lineId: this.dataset.id };
                    e.preventDefault();
                    e.stopPropagation();
                });

                puzzleGrid.appendChild(line);
            }
        }

        document.removeEventListener('mousemove', handleAquariumGridLineDrag);
        document.addEventListener('mousemove', handleAquariumGridLineDrag);

        document.removeEventListener('mouseup', handleAquariumMouseUp);
        document.addEventListener('mouseup', handleAquariumMouseUp);
    }

    function handleAquariumGridLineDrag(e) {
        if (!aquariumIsDragging || !aquariumDragStartPos || aquariumIsShowingSolution || aquariumCurrentMode !== 'edit') return;

        const puzzleGrid = document.getElementById('aquarium-grid-container');
        if (!puzzleGrid) return;
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const selector = aquariumDragStartPos.type === 'h' ? '.grid-line.horizontal-line' : '.grid-line.vertical-line';
        const gridLines = puzzleGrid.querySelectorAll(selector);
        const linesUnderPath = [];

        gridLines.forEach(line => {
            const rect = line.getBoundingClientRect();
            const lineId = line.dataset.id;
            if (lineId === aquariumDragStartPos.lineId) return;

            let distance;
            if (aquariumDragStartPos.type === 'h') {
                const lineY = rect.top + rect.height / 2;
                if (mouseX >= rect.left && mouseX <= rect.right) {
                    distance = Math.abs(mouseY - lineY);
                    if (distance < 20) linesUnderPath.push({ line, distance, lineId });
                }
            } else {
                const lineX = rect.left + rect.width / 2;
                if (mouseY >= rect.top && mouseY <= rect.bottom) {
                    distance = Math.abs(mouseX - lineX);
                    if (distance < 20) linesUnderPath.push({ line, distance, lineId });
                }
            }
        });

        linesUnderPath.sort((a, b) => a.distance - b.distance);

        document.querySelectorAll('.grid-line.drag-hover').forEach(line => {
            line.classList.remove('drag-hover');
        });

        if (linesUnderPath.length > 0) {
            const { line, lineId } = linesUnderPath[0];
            line.classList.add('drag-hover');

            if (lineId !== aquariumDragStartPos.lineId) {
                toggleAquariumEdgeLine(lineId, line);
                aquariumDragStartPos.lineId = lineId;
            }
        }
        e.preventDefault();
    }

    function handleAquariumMouseUp() {
        if (aquariumIsDragging) {
            document.querySelectorAll('.grid-line.drag-hover').forEach(line => {
                line.classList.remove('drag-hover');
            });
            aquariumIsDragging = false;
            aquariumDragStartPos = null;
        }
    }

    function toggleAquariumEdgeLine(lineId, lineElement) {
        const parts = lineId.split('_');
        const type = parts[0];
        const r = parseInt(parts[1], 10);
        const c = parseInt(parts[2], 10);

        if (type === 'h') {
            aquariumHBorders[r][c] = !aquariumHBorders[r][c];
            if (aquariumHBorders[r][c]) lineElement.classList.add('active');
            else lineElement.classList.remove('active');
        } else {
            aquariumVBorders[r][c] = !aquariumVBorders[r][c];
            if (aquariumVBorders[r][c]) lineElement.classList.add('active');
            else lineElement.classList.remove('active');
        }
    }

    function updateAquariumCellDisplay(cellElement, state) {
        cellElement.classList.remove('water', 'air');
        if (state === 1) cellElement.classList.add('water');
        else if (state === 2) cellElement.classList.add('air');
    }

    function applyAquariumSolution(levels, regions) {
        aquariumCellStates = aquariumCellStates.map(row => row.map(() => 2)); // default air

        regions.forEach((region, i) => {
            const lvl = levels[i];
            const waterTop = region.maxR - lvl + 1;
            region.cells.forEach(c => {
                if (c.r >= waterTop) aquariumCellStates[c.r][c.c] = 1; // water
            });
        });

        // Only update UI classes, don't recreate the grid
        const puzzleGrid = document.getElementById('aquarium-grid-container');
        if (!puzzleGrid) return;
        for (let r = 0; r < aquariumRows; r++) {
            for (let c = 0; c < aquariumCols; c++) {
                const cell = puzzleGrid.querySelector('.aquarium-cell[data-row="' + r + '"][data-col="' + c + '"]');
                if (cell) updateAquariumCellDisplay(cell, aquariumCellStates[r][c]);
            }
        }
    }

    window.solveAquariumPuzzle = function () {
        if (!window.solveAquarium) { updateStats('模块未加载', '-'); return; }

        const finalRowClues = aquariumRowClues.map(x => (x === '' || isNaN(parseInt(x))) ? -1 : parseInt(x));
        const finalColClues = aquariumColClues.map(x => (x === '' || isNaN(parseInt(x))) ? -1 : parseInt(x));

        const puzzle = {
            rows: aquariumRows,
            cols: aquariumCols,
            rowClues: finalRowClues,
            colClues: finalColClues,
            hBorders: aquariumHBorders,
            vBorders: aquariumVBorders
        };

        updateStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveAquarium(puzzle); } catch (e) {
                updateStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = LogicUI.formatElapsed(performance.now() - t0);

            if (res && res.error) { updateStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : [];
            window.aquariumSolutions = solutions;
            window.aquariumCurrentSolIndex = 0;

            // Store regions from solver result for use in applyAquariumSolution
            if (res && res.regions) {
                window.aquariumRegionsCache = res.regions;
            }

            if (res && res.timeout) {
                updateStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = document.getElementById('aquarium-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showAquariumSolution(0);
            }
        }, 20);
    };

    window.showAquariumSolution = function (delta) {
        const solutions = window.aquariumSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.aquariumCurrentSolIndex || 0;
        idx = ((idx + delta) % len + len) % len;
        window.aquariumCurrentSolIndex = idx;
        const counter = document.getElementById('aquarium-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;

        applyAquariumSolution(solutions[idx], window.aquariumRegionsCache);
    };

    window.buildSimpleAquariumExample = function () {
        let rIn = document.getElementById('aquarium-rows');
        let cIn = document.getElementById('aquarium-cols');
        if (rIn) rIn.value = 4;
        if (cIn) cIn.value = 4;
        window.initAquariumGrid();

        // 4 quadrants (2x2 each)
        aquariumVBorders[0][1] = true;
        aquariumVBorders[1][1] = true;
        aquariumHBorders[1][0] = true;
        aquariumHBorders[1][1] = true;

        aquariumHBorders[1][2] = true;
        aquariumHBorders[1][3] = true;

        aquariumVBorders[2][1] = true;
        aquariumVBorders[3][1] = true;

        aquariumRowClues[0] = '2';
        aquariumRowClues[1] = '4';
        aquariumRowClues[2] = '2';
        aquariumRowClues[3] = '4';

        aquariumColClues[0] = '3';
        aquariumColClues[1] = '3';
        aquariumColClues[2] = '3';
        aquariumColClues[3] = '3';

        renderAquariumPuzzleGrid();
    };

})();
