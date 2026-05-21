window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('aqre-workspace', 'aqre-layout',
    // ── Left ──
    LogicUI.backButton('aqre-workspace') +
    LogicUI.title('AQRE 求解器', { color: 'var(--neon-blue)' }) +
    LogicUI.singleSizeInput('aqre-size', { val: 8, placeholder: '网格大小 (默认8)', max: 20 }) +
    LogicUI.actionGrid4([
        { label: '生成网格', onclick: 'window.initAqreGrid && window.initAqreGrid()' },
        { label: '求解谜题', onclick: 'window.solveAqrePuzzle && window.solveAqrePuzzle()', id: 'aqre-solve-btn', glow: true },
        { label: '重置清理', onclick: 'window.clearAqreGrid && window.clearAqreGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleAqreExample && window.buildSimpleAqreExample()' }
    ]) +
    LogicUI.statsPanel('aqre', { countLabel: '找到解决方案', timeLabel: '耗时', accent: 'var(--neon-blue)' }) +
    LogicUI.solutionNav('aqre', 'showAqreSolution', { accent: 'var(--neon-blue)' }) +
    LogicUI.instructions([
        '• <strong>左键点击格子</strong>: 输入线索数字',
        '• <strong>右键点击格子</strong>: 强行置为黑格限制',
        '• <strong>拖动网格线</strong>: 划分线索边界区域'
    ], { accent: 'var(--neon-purple)', title: '操作说明' }),

    // ── Right ──
    `<div id="aqre-grid-container"></div>`,

    // ── Style ──
    `#aqre-grid-container{--grid-size:40px;display:grid;gap:0;background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;border:1px solid var(--neon-blue);position:relative;user-select:none;width:fit-content;margin:0 auto}
    .aqre-cell{width:var(--grid-size);height:var(--grid-size);background:rgba(255,255,255,0.05);font-size:1.5rem;color:white;text-shadow:0 0 5px white;border:1px solid rgba(255,255,255,0.1)}
    .aqre-cell:hover{background:rgba(255,255,255,0.1)}
    .aqre-cell.black{background:rgba(0,0,0,0.8);border:1px solid rgba(0,0,0,0.9)}
    .aqre-cell.clue{}
    .aqre-cell.editing{background:rgba(var(--neon-blue-rgb),0.2);caret-color:white}
    .grid-line{position:absolute;background-color:rgba(255,255,255,0.08);z-index:30;transition:background-color .15s ease}
    .grid-line:hover,.grid-line.drag-hover{background-color:var(--neon-purple,#cc00ff)!important;box-shadow:0 0 3px var(--neon-purple,#cc00ff)!important}
    .grid-line.active{background-color:var(--neon-blue,#00f3ff)!important;box-shadow:0 0 3px var(--neon-blue,#00f3ff),0 0 3px var(--neon-blue,#00f3ff) inset!important;z-index:40}`
));

// JS integration logic for the UI
(function () {
    let aqreGridState = [];
    let aqreRows = 8;
    let aqreCols = 8;
    window.aqreSolutions = [];
    window.aqreCurrentSolIndex = 0;

    function updateStats(count, time) {
        const cEl = document.getElementById('aqre-solutionsCount');
        const tEl = document.getElementById('aqre-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    function resetPuzzle() {
        window.aqreSolutions = [];
        window.aqreCurrentSolIndex = 0;
        const nav = document.getElementById('aqre-solution-nav');
        if (nav) nav.style.display = 'none';
        updateStats('0', '0');
    }

    let aqreIsShowingSolution = false;
    let aqreEdgeState = {};
    let aqreIsDragging = false;
    let aqreDragStartPos = null;

    window.initAqreGrid = function () {
        let sizeInput = document.getElementById('aqre-size');
        let size = sizeInput ? parseInt(sizeInput.value) : 8;
        aqreRows = Math.max(3, Math.min(20, size));
        aqreCols = Math.max(3, Math.min(20, size));
        resetPuzzle();
        aqreIsShowingSolution = false;
        aqreGridState = Array(aqreRows).fill().map(() =>
            Array(aqreCols).fill().map(() => ({ type: 'empty' }))
        );
        aqreEdgeState = {};

        renderAqrePuzzleGrid();
    };

    window.clearAqreGrid = function () {
        window.initAqreGrid();
    };

    function renderAqrePuzzleGrid() {
        const puzzleGrid = document.getElementById('aqre-grid-container');
        if (!puzzleGrid) return;

        puzzleGrid.innerHTML = '';
        puzzleGrid.style.position = 'relative';
        puzzleGrid.style.gridTemplateColumns = 'repeat(' + aqreCols + ', var(--grid-size))';
        puzzleGrid.style.gridTemplateRows = 'repeat(' + aqreRows + ', var(--grid-size))';

        for (let i = 0; i < aqreRows; i++) {
            for (let j = 0; j < aqreCols; j++) {
                const cell = document.createElement('div');
                cell.className = 'aqre-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;

                updateAqreCellDisplay(cell, aqreGridState[i][j]);

                cell.addEventListener('click', function (e) {
                    if (aqreIsShowingSolution) return;
                    if (this.querySelector('input')) return;

                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);
                    const cellEl = this;

                    cellEl.classList.add('editing');
                    cellEl.textContent = '';

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;text-align:center;background:transparent;border:none;color:white;font-size:1.5rem;z-index:10;outline:none;padding:0;';
                    cellEl.appendChild(input);
                    input.focus();

                    const save = () => {
                        const value = input.value.trim();
                        if (value !== '' && !isNaN(value) && value >= 0 && value <= 9) {
                            aqreGridState[row][col] = { type: 'clue', value: parseInt(value) };
                        } else {
                            aqreGridState[row][col] = { type: 'empty' };
                        }
                        input.remove();
                        cellEl.classList.remove('editing');
                        updateAqreCellDisplay(cellEl, aqreGridState[row][col]);
                    };

                    input.addEventListener('blur', save, { once: true });
                    input.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            input.blur();
                        }
                    });
                });

                cell.addEventListener('contextmenu', function (e) {
                    e.preventDefault();
                    if (aqreIsShowingSolution) return;

                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);

                    if (aqreGridState[row][col].type === 'black') {
                        aqreGridState[row][col] = { type: 'empty' };
                    } else {
                        aqreGridState[row][col] = { type: 'black' };
                    }

                    updateAqreCellDisplay(this, aqreGridState[row][col]);
                });

                puzzleGrid.appendChild(cell);
            }
        }

        createAqreGridLines();
    }

    function createAqreGridLines() {
        const puzzleGrid = document.getElementById('aqre-grid-container');
        if (!puzzleGrid) return;
        const existingLines = puzzleGrid.querySelectorAll('.grid-line');
        existingLines.forEach(line => line.remove());

        const cells = puzzleGrid.querySelectorAll('.aqre-cell');
        if (cells.length === 0) return;

        const cellSize = cells[0].offsetWidth;
        const padding = parseInt(getComputedStyle(puzzleGrid).padding) || 16;

        for (let i = 1; i < aqreRows; i++) {
            for (let j = 0; j < aqreCols; j++) {
                const line = document.createElement('div');
                line.className = 'grid-line horizontal-line';
                line.dataset.id = 'h_' + i + '_' + j;
                line.dataset.type = 'h';

                line.style.position = 'absolute';
                line.style.left = (padding + j * cellSize) + 'px';
                line.style.top = (padding + i * cellSize - 2) + 'px';
                line.style.width = cellSize + 'px';
                line.style.height = '4px';
                line.style.cursor = 'ns-resize';
                line.style.zIndex = '30';

                if (aqreEdgeState[line.dataset.id]) line.classList.add('active');

                line.addEventListener('mousedown', function (e) {
                    if (aqreIsShowingSolution) return;

                    toggleAqreEdgeLine(this.dataset.id, this);
                    aqreIsDragging = true;
                    aqreDragStartPos = { type: 'h', lineId: this.dataset.id };

                    e.preventDefault();
                    e.stopPropagation();
                });

                puzzleGrid.appendChild(line);
            }
        }

        for (let i = 0; i < aqreRows; i++) {
            for (let j = 1; j < aqreCols; j++) {
                const line = document.createElement('div');
                line.className = 'grid-line vertical-line';
                line.dataset.id = 'v_' + i + '_' + (j - 1);
                line.dataset.type = 'v';

                line.style.position = 'absolute';
                line.style.left = (padding + j * cellSize - 2) + 'px';
                line.style.top = (padding + i * cellSize) + 'px';
                line.style.width = '4px';
                line.style.height = cellSize + 'px';
                line.style.cursor = 'ew-resize';
                line.style.zIndex = '30';

                if (aqreEdgeState[line.dataset.id]) line.classList.add('active');

                line.addEventListener('mousedown', function (e) {
                    if (aqreIsShowingSolution) return;

                    toggleAqreEdgeLine(this.dataset.id, this);
                    aqreIsDragging = true;
                    aqreDragStartPos = { type: 'v', lineId: this.dataset.id };

                    e.preventDefault();
                    e.stopPropagation();
                });

                puzzleGrid.appendChild(line);
            }
        }

        document.removeEventListener('mousemove', handleAqreGridLineDrag);
        document.addEventListener('mousemove', handleAqreGridLineDrag);
        document.removeEventListener('mouseup', handleAqreMouseUp);
        document.addEventListener('mouseup', handleAqreMouseUp);
    }

    function handleAqreGridLineDrag(e) {
        if (!aqreIsDragging || !aqreDragStartPos || aqreIsShowingSolution) return;

        const puzzleGrid = document.getElementById('aqre-grid-container');
        if (!puzzleGrid) return;
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const selector = aqreDragStartPos.type === 'h' ? '.grid-line.horizontal-line' : '.grid-line.vertical-line';
        const gridLines = puzzleGrid.querySelectorAll(selector);
        const linesUnderPath = [];

        gridLines.forEach(line => {
            const rect = line.getBoundingClientRect();
            const lineId = line.dataset.id;
            if (lineId === aqreDragStartPos.lineId) return;

            let distance;
            if (aqreDragStartPos.type === 'h') {
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

            if (lineId !== aqreDragStartPos.lineId) {
                toggleAqreEdgeLine(lineId, line);
                aqreDragStartPos.lineId = lineId;
            }
        }
        e.preventDefault();
    }

    function handleAqreMouseUp() {
        if (aqreIsDragging) {
            document.querySelectorAll('.grid-line.drag-hover').forEach(line => {
                line.classList.remove('drag-hover');
            });
            aqreIsDragging = false;
            aqreDragStartPos = null;
        }
    }

    function toggleAqreEdgeLine(lineId, lineElement) {
        aqreEdgeState[lineId] = !aqreEdgeState[lineId];
        if (!aqreEdgeState[lineId]) {
            delete aqreEdgeState[lineId];
            lineElement.classList.remove('active');
        } else {
            lineElement.classList.add('active');
        }
    }

    function updateAqreCellDisplay(cellElement, state) {
        cellElement.className = 'aqre-cell';
        cellElement.textContent = '';
        if (state.type === 'black') {
            cellElement.classList.add('black');
        } else if (state.type === 'clue') {
            cellElement.classList.add('clue');
            cellElement.textContent = state.value;
        }
    }

    window.solveAqrePuzzle = function () {
        if (!window.solveAqre) { updateStats('模块未加载', '-'); return; }

        let clues = {};
        for (let i = 0; i < aqreRows; i++) {
            for (let j = 0; j < aqreCols; j++) {
                if (aqreGridState[i][j].type === 'clue') {
                    clues[i + ',' + j] = aqreGridState[i][j].value;
                }
            }
        }

        let puzzle = {
            rows: aqreRows,
            cols: aqreCols,
            clues: clues,
            edgeIds: aqreEdgeState,
            gridState: aqreGridState
        };

        updateStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveAqre(puzzle); } catch (e) {
                updateStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = Math.round(performance.now() - t0) + 'ms';

            if (res && res.error) { updateStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : window.aqreSolutions || [];
            window.aqreSolutions = solutions;
            window.aqreCurrentSolIndex = 0;

            if (res && res.timeout) {
                updateStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = document.getElementById('aqre-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showAqreSolution(0);
            }
        }, 20);
    };

    function displayAqreSolution(index) {
        if (!window.aqreSolutions || !window.aqreSolutions.length) return;

        const solution = window.aqreSolutions[index];
        const puzzleGrid = document.getElementById('aqre-grid-container');
        if (!puzzleGrid) return;
        const cells = puzzleGrid.querySelectorAll('.aqre-cell');

        let cellIndex = 0;
        for (let i = 0; i < aqreRows; i++) {
            for (let j = 0; j < aqreCols; j++) {
                const cell = cells[cellIndex++];
                if (!cell) continue;
                cell.className = 'aqre-cell';
                if (solution[i][j] === 1) {
                    cell.classList.add('black');
                }
            }
        }

    }

    window.showAqreSolution = function (delta) {
        const solutions = window.aqreSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.aqreCurrentSolIndex || 0;
        idx = ((idx + delta) % len + len) % len;
        window.aqreCurrentSolIndex = idx;
        const counter = document.getElementById('aqre-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;

        displayAqreSolution(idx);
    };

    window.buildSimpleAqreExample = function () {
        let sizeInput = document.getElementById('aqre-size');
        if (sizeInput) sizeInput.value = 4;
        window.initAqreGrid();

        aqreEdgeState['h_2_0'] = true;
        aqreEdgeState['h_2_1'] = true;
        aqreEdgeState['h_2_2'] = true;
        aqreEdgeState['h_2_3'] = true;

        aqreGridState[0][0] = { type: 'clue', value: 6 };
        aqreGridState[3][3] = { type: 'clue', value: 6 };

        renderAqrePuzzleGrid();
    };

})();
