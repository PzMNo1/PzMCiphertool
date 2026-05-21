/* logic/logicdiv/16_fillomino_ui.js */
(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(LogicUI.workspace('fillomino-workspace', 'fillomino-layout',
        // ── Left: Control Panel ──
        LogicUI.backButton('fillomino-workspace') +
        LogicUI.title('Fillomino', { color: 'var(--neon-pink)' }) +
        LogicUI.sizeInputs('fillomino-rows', 'fillomino-cols', { rowVal: 8, colVal: 8, rowMin: 3, colMin: 3, rowMax: 15, colMax: 15 }) +
        LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initFillominoGrid && window.initFillominoGrid()' },
            { label: '计算核心分析', onclick: 'window.solveFillominoPuzzleUI && window.solveFillominoPuzzleUI()', id: 'fillomino-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearFillominoGrid && window.clearFillominoGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleFillominoExample && window.buildSimpleFillominoExample()' }
        ]) +
        LogicUI.statsPanel('fillomino', { countLabel: '解记录数', timeLabel: '算力耗时', accent: 'var(--neon-pink)' }) +
        LogicUI.solutionNav('fillomino', 'showFillominoSolution', { accent: 'var(--neon-pink)' }) +
        LogicUI.instructions([
            '点击格子输入数字 (1-9)',
            '每个数字 N 表示它所在的区域包含 N 个格子',
            '相同大小的区域不能相邻，否则它们会合并成一个更大的区域'
        ], { accent: 'var(--neon-pink)', title: '系统法则' }),

        // ── Right: Grid Panel ──
        `<div id="fillomino-grid-container" class="fillomino-grid"></div>`,

        // ── Style: 仅谜题独有的 CSS ──
        `
        #fillomino-grid-container {
            display: grid;
            gap: 0;
            width: fit-content;
            margin: 0 auto;
            background: var(--quantum-glass);
            padding: 10px;
            border-radius: 12px;
            border: 1px solid rgba(255, 107, 107, 0.2);
        }
        .fillomino-cell {
            width: 40px;
            height: 40px;
            
            
            
            font-size: 1.2rem;
            color: var(--neon-pink);
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);}
        .fillomino-cell input {
            width: 100%;
            height: 100%;
            border: none;
            background: transparent;
            color: inherit;
            font-size: inherit;
            text-align: center;
            outline: none;
            padding: 0;
        }
        .fillomino-cell input:focus {
            background: rgba(255, 107, 107, 0.2);
        }
        .fillomino-cell.fixed {
            color: #fff;
            font-weight: bold;
            text-shadow: 0 0 5px var(--neon-pink);
        }
        .fillomino-cell.border-top { border-top: 2px solid var(--neon-pink) !important; z-index: 1; }
        .fillomino-cell.border-bottom { border-bottom: 2px solid var(--neon-pink) !important; z-index: 1;}
        .fillomino-cell.border-left { border-left: 2px solid var(--neon-pink) !important; z-index: 1;}
        .fillomino-cell.border-right { border-right: 2px solid var(--neon-pink) !important; z-index: 1;}
        `
    ));

    // Global properties
    let gridState = [];
    let currentSolutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;

    // Initialization
    window.initFillominoGrid = function () {
        const rInput = document.getElementById('fillomino-rows');
        const cInput = document.getElementById('fillomino-cols');
        const R = parseInt(rInput.value) || 8;
        const C = parseInt(cInput.value) || 8;

        const container = document.getElementById('fillomino-grid-container');
        container.style.gridTemplateColumns = `repeat(${C}, 40px)`;
        container.style.gridTemplateRows = `repeat(${R}, 40px)`;
        container.innerHTML = '';

        gridState = Array(R).fill().map(() =>
            Array(C).fill().map(() => ({ type: 'empty', value: null }))
        );

        currentSolutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        document.getElementById('fillomino-solution-nav').style.display = 'none';
        document.getElementById('fillomino-solutionsCount').textContent = '0';
        document.getElementById('fillomino-timeElapsed').textContent = '0ms';

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div');
                cell.className = 'fillomino-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                const input = document.createElement('input');
                input.type = 'text';
                input.inputMode = 'numeric';
                input.maxLength = 2;

                input.addEventListener('input', function () {
                    const val = parseInt(this.value);
                    if (!isNaN(val) && val > 0) {
                        gridState[r][c] = { type: 'fixed', value: val };
                        cell.classList.add('fixed');
                    } else {
                        this.value = '';
                        gridState[r][c] = { type: 'empty', value: null };
                        cell.classList.remove('fixed');
                    }
                    if (isShowingSolution) {
                        isShowingSolution = false;
                        window.clearFillominoBorders();
                    }
                });

                cell.appendChild(input);
                container.appendChild(cell);
            }
        }
    };

    window.clearFillominoGrid = function () {
        if (!gridState || gridState.length === 0) return;
        const R = gridState.length;
        const C = gridState[0].length;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                gridState[r][c] = { type: 'empty', value: null };
            }
        }

        const container = document.getElementById('fillomino-grid-container');
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
            input.parentElement.classList.remove('fixed');
            input.parentElement.classList.remove('border-top', 'border-bottom', 'border-left', 'border-right');
        });

        currentSolutions = [];
        isShowingSolution = false;
        document.getElementById('fillomino-solution-nav').style.display = 'none';
        document.getElementById('fillomino-solutionsCount').textContent = '0';
        document.getElementById('fillomino-timeElapsed').textContent = '0ms';
    };

    window.buildSimpleFillominoExample = function () {
        document.getElementById('fillomino-rows').value = 4;
        document.getElementById('fillomino-cols').value = 4;
        window.initFillominoGrid();

        const example = [
            [1, 2, 0, 0],
            [4, 0, 0, 0],
            [0, 0, 1, 0],
            [1, 0, 0, 1]
        ];

        const container = document.getElementById('fillomino-grid-container');
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (example[r][c] !== 0) {
                    const idx = r * 4 + c;
                    const cell = container.children[idx];
                    const input = cell.querySelector('input');
                    input.value = example[r][c];
                    gridState[r][c] = { type: 'fixed', value: example[r][c] };
                    cell.classList.add('fixed');
                }
            }
        }
    };

    window.clearFillominoBorders = function () {
        const container = document.getElementById('fillomino-grid-container');
        const cells = container.children;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            cell.classList.remove('border-top', 'border-bottom', 'border-left', 'border-right');
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            const input = cell.querySelector('input');
            if (gridState[r][c].type !== 'fixed') {
                input.value = '';
            }
        }
    };

    window.solveFillominoPuzzleUI = function () {
        if (!gridState || gridState.length === 0) return;
        const R = gridState.length;
        const C = gridState[0].length;

        const puzzle = {
            R: R,
            C: C,
            grid: gridState
        };

        const startTime = performance.now();
        const res = window.solveFillomino(puzzle);
        const endTime = performance.now();

        document.getElementById('fillomino-timeElapsed').textContent = Math.round(endTime - startTime) + 'ms' + (res.timeout ? ' (Timeout)' : '');

        if (res.solutions && res.solutions.length > 0) {
            currentSolutions = res.solutions;
            currentSolutionIndex = 0;
            isShowingSolution = true;
            document.getElementById('fillomino-solutionsCount').textContent = currentSolutions.length;
            document.getElementById('fillomino-solution-nav').style.display = 'flex';
            window.showFillominoSolution(0);
        } else {
            document.getElementById('fillomino-solutionsCount').textContent = '0';
            document.getElementById('fillomino-solution-nav').style.display = 'none';
        }
    };

    window.showFillominoSolution = function (delta) {
        if (!currentSolutions || currentSolutions.length === 0) return;

        const len = currentSolutions.length;
        currentSolutionIndex = (currentSolutionIndex + delta + len) % len;

        const counter = document.getElementById('fillomino-solution-counter');
        if (counter) counter.textContent = `${currentSolutionIndex + 1} / ${len}`;

        const sol = currentSolutions[currentSolutionIndex];
        const container = document.getElementById('fillomino-grid-container');
        const R = gridState.length;
        const C = gridState[0].length;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const idx = r * C + c;
                const cell = container.children[idx];
                const input = cell.querySelector('input');
                const val = sol[r][c];

                if (gridState[r][c].type !== 'fixed') {
                    input.value = val;
                }

                // Borders
                cell.classList.remove('border-top', 'border-bottom', 'border-left', 'border-right');

                if (r === 0 || sol[r - 1][c] !== val) cell.classList.add('border-top');
                if (r === R - 1 || sol[r + 1][c] !== val) cell.classList.add('border-bottom');
                if (c === 0 || sol[r][c - 1] !== val) cell.classList.add('border-left');
                if (c === C - 1 || sol[r][c + 1] !== val) cell.classList.add('border-right');
            }
        }
    };

})();
