window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('akari-workspace', 'akari-layout',
    // ── Left: Control Panel ──
    LogicUI.backButton('akari-workspace') +
    LogicUI.title('AKARI 求解器', { color: 'var(--neon-blue)' }) +
    LogicUI.singleSizeInput('akari-size', { val: 10, placeholder: '谜题大小 (默认10)' }) +
    LogicUI.actionGrid4([
        { label: '生成网格', onclick: 'window.initAkariGrid && window.initAkariGrid()' },
        { label: '计算核心分析', onclick: 'window.solveAkariPuzzle && window.solveAkariPuzzle()', id: 'akari-solve-btn', glow: true },
        { label: '清空填涂', onclick: 'window.clearAkariGrid && window.clearAkariGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleAkariExample && window.buildSimpleAkariExample()' }
    ]) +
    LogicUI.statsPanel('akari', { countLabel: '找到解决方案', timeLabel: '核心验证耗时', accent: 'var(--neon-blue)' }) +
    LogicUI.solutionNav('akari', 'showAkariSolution', { accent: 'var(--neon-blue)' }) +
    LogicUI.instructions([
        '• <strong>左键点击</strong>: 切换对空白/数字进行填列',
        '• <strong>右键点击</strong>: 切换空白或墙壁',
        '• <strong>注</strong>: 数字表示相邻灯泡数量。两个灯泡不能在无墙阻挡的情况下互相看到。所有空地必须被灯光照亮。'
    ], { accent: 'var(--neon-purple)', title: '操作说明' }),

    // ── Right: Grid Panel ──
    `<div id="akari-grid-container" class="puzzle-grid logic-akari-grid"></div>`,

    // ── Style ──
    `.logic-akari-grid{--grid-size:50px;display:grid;gap:2px;background:rgba(255,255,255,0.05);padding:4px;border-radius:8px;border:1px solid var(--neon-blue);width:fit-content;margin:0 auto;}
    .logic-akari-grid .akari-cell{width:var(--grid-size);height:var(--grid-size);background:rgba(255,255,255,0.05);font-size:1.5rem;color:var(--neon-purple);text-shadow:0 0 5px var(--neon-purple)}
    .logic-akari-grid .akari-cell:hover{background:rgba(255,255,255,0.1);transform:scale(1.05);z-index:2;box-shadow:0 0 10px var(--neon-blue)}
    .logic-akari-grid .akari-cell.wall{background:rgba(0,0,0,0.7);border:1px solid var(--neon-blue)}
    .logic-akari-grid .akari-cell.bulb::after{content:'💡';position:absolute;font-size:1.5rem;filter:drop-shadow(0 0 5px yellow)}
    .logic-akari-grid .akari-cell.lit{background:rgba(255,255,100,0.2)}`
));

// JS integration logic for the UI
(function () {
    let currentGrid = [];
    let currentSize = 10;
    window.akariSolutions = [];
    window.akariCurrentSolIndex = 0;

    function updateStats(count, time) {
        const cEl = document.getElementById('akari-solutionsCount');
        const tEl = document.getElementById('akari-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    function resetPuzzle() {
        window.akariSolutions = [];
        window.akariCurrentSolIndex = 0;
        const nav = document.getElementById('akari-solution-nav');
        if (nav) nav.style.display = 'none';
        updateStats('0', '0');
    }

    window.initAkariGrid = function () {
        const sizeInput = document.getElementById('akari-size');
        let n = sizeInput ? parseInt(sizeInput.value) : 10;
        if (isNaN(n) || n < 3) n = 3;
        if (n > 15) n = 15;
        currentSize = n;

        currentGrid = Array(currentSize).fill(0).map(() =>
            Array(currentSize).fill(0).map(() => ({ type: 'empty', value: 0 }))
        );

        resetPuzzle();
        renderAkariGrid();
    };

    window.clearAkariGrid = function () {
        for (let i = 0; i < currentSize; i++) {
            for (let j = 0; j < currentSize; j++) {
                currentGrid[i][j] = { type: 'empty', value: 0 };
            }
        }
        resetPuzzle();
        renderAkariGrid();
    };

    function renderAkariGrid() {
        const grid = document.getElementById('akari-grid-container');
        if (!grid) return;

        grid.style.gridTemplateColumns = `repeat(${currentSize}, var(--grid-size, 50px))`;
        grid.innerHTML = '';

        for (let i = 0; i < currentSize; i++) {
            for (let j = 0; j < currentSize; j++) {
                const cell = document.createElement('div');
                const cellData = currentGrid[i][j];

                cell.className = 'akari-cell';
                if (cellData.type === 'wall') {
                    cell.classList.add('wall');
                } else if (cellData.type === 'number') {
                    cell.classList.add('wall');
                    cell.textContent = cellData.value;
                }

                cell.dataset.row = i;
                cell.dataset.col = j;

                cell.addEventListener('click', () => { handleAkariCellClick(i, j, false); });
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    handleAkariCellClick(i, j, true);
                });

                grid.appendChild(cell);
            }
        }
        grid.addEventListener('contextmenu', e => e.preventDefault());
    }

    function handleAkariCellClick(row, col, isRightClick) {
        if (window.akariSolutions && window.akariSolutions.length > 0) return; // Locked when solved

        const cell = currentGrid[row][col];
        if (isRightClick) {
            currentGrid[row][col] = {
                type: cell.type === 'wall' || cell.type === 'number' ? 'empty' : 'wall',
                value: 0
            };
        } else {
            if (cell.type === 'wall') {
                currentGrid[row][col] = { type: 'number', value: 0 };
            } else if (cell.type === 'empty') {
                currentGrid[row][col] = { type: 'wall', value: 0 };
            } else {
                const nextValue = cell.type === 'number' ? cell.value + 1 : 1;
                if (nextValue > 4) {
                    currentGrid[row][col] = { type: 'empty', value: 0 };
                } else {
                    currentGrid[row][col] = { type: 'number', value: nextValue };
                }
            }
        }

        renderAkariGrid();
    }

    window.solveAkariPuzzle = function () {
        if (!window.solveAkari) { updateStats('模块未加载', '-'); return; }

        const clues = {};
        for (let i = 0; i < currentSize; i++) {
            for (let j = 0; j < currentSize; j++) {
                const cell = currentGrid[i][j];
                if (cell.type === 'wall') clues[`${i},${j}`] = 'wall';
                else if (cell.type === 'number') clues[`${i},${j}`] = cell.value.toString();
            }
        }
        const puzzle = { size: currentSize, clues };

        updateStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveAkari(puzzle); } catch (e) {
                updateStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = Math.round(performance.now() - t0) + 'ms';

            if (res && res.error) { updateStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : window.akariSolutions || [];
            window.akariSolutions = solutions;
            window.akariCurrentSolIndex = 0;

            if (res && res.timeout) {
                updateStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = document.getElementById('akari-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showAkariSolution(0);
            }
        }, 20);
    };

    window.showAkariSolution = function (delta) {
        const solutions = window.akariSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.akariCurrentSolIndex || 0;
        idx = ((idx + delta) % len + len) % len;
        window.akariCurrentSolIndex = idx;
        const counter = document.getElementById('akari-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;

        displayAkariSolution(idx);
    };

    function displayAkariSolution(index) {
        const solution = window.akariSolutions[index];
        const container = document.getElementById('akari-grid-container');
        if (!container) return;

        const cells = container.querySelectorAll('.akari-cell');

        // Clear previous solution decorations
        cells.forEach(el => {
            el.classList.remove('bulb');
            el.classList.remove('lit');
        });

        for (let i = 0; i < currentSize; i++) {
            for (let j = 0; j < currentSize; j++) {
                if (solution[i][j]) {
                    const cellIndex = i * currentSize + j;
                    if (cells[cellIndex]) cells[cellIndex].classList.add('bulb');
                }
            }
        }

        calculateLighting(solution, cells);


    }

    function calculateLighting(solution, domCells) {
        for (let i = 0; i < currentSize; i++) {
            for (let j = 0; j < currentSize; j++) {
                if (solution[i][j]) {
                    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                        let x = i + dx, y = j + dy;
                        while (x >= 0 && x < currentSize && y >= 0 && y < currentSize &&
                            currentGrid[x][y].type !== 'wall' && currentGrid[x][y].type !== 'number') {
                            const cellIndex = x * currentSize + y;
                            if (domCells[cellIndex]) domCells[cellIndex].classList.add('lit');
                            x += dx;
                            y += dy;
                        }
                    }
                }
            }
        }
    }

    window.buildSimpleAkariExample = function () {
        const sizeInput = document.getElementById('akari-size');
        if (sizeInput) sizeInput.value = 5;
        window.initAkariGrid();

        const example = [
            { row: 0, col: 2, type: 'wall', value: 0 },
            { row: 2, col: 0, type: 'wall', value: 0 },
            { row: 2, col: 2, type: 'number', value: 4 },
            { row: 2, col: 4, type: 'wall', value: 0 },
            { row: 4, col: 2, type: 'wall', value: 0 }
        ];

        example.forEach(item => {
            currentGrid[item.row][item.col] = {
                type: item.type,
                value: item.value
            };
        });

        renderAkariGrid();
    };

})();
