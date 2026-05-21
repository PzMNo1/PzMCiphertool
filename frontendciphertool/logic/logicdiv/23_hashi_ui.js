(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('hashi-workspace', 'hashi-layout',
        // Left
        window.LogicUI.backButton('hashi-workspace') +
        window.LogicUI.title('HASHI', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('hashi-rows', 'hashi-cols', { rowVal: 7, colVal: 7 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initHashiGrid && window.initHashiGrid()' },
            { label: '计算核心分析', onclick: 'window.solveHashiPuzzleUI && window.solveHashiPuzzleUI()', id: 'hashi-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearHashiGrid && window.clearHashiGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleHashiExample && window.buildSimpleHashiExample()' }
        ]) +
        window.LogicUI.statsPanel('hashi', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('hashi', 'showHashiSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '用直线（单线或双线）连接所有的岛屿（带有数字的圆圈）。',
            '每个岛屿上连接的线条总数必须等于其数字。',
            '线条不能相交。',
            '所有岛屿必须通过线条相互连接，形成一个单一的连通区域。'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

        // Right
        `<div id="hashi-grid-container" style="position: relative; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 8px; border: 1px solid var(--neon-cyan); box-shadow: 0 0 15px rgba(0,255,255,0.2); display: inline-grid;"></div>`,

        // CSS
        `.hashi-cell { width: 40px; height: 40px; border: 1px dashed rgba(0,255,231,0.15);   background: transparent;}
        .hashi-island { position: relative; width: 30px; height: 30px; border-radius: 50%; background: rgba(0,255,231,0.15); border: 2px solid #00ffe7; color: #fff; display: flex; justify-content: center; align-items: center; z-index: 10; font-weight: bold; font-size: 14px; cursor: pointer; transition: all 0.3s; }
        .hashi-island.editing { background: #00ffe585; color: #000; box-shadow: 0 0 10px #00ffe596; outline: none; }
        .hashi-island:hover { background: rgba(0,255,231,0.3); }
        .hashi-island.completed { border-color: rgba(0, 255, 0, 0.57); box-shadow: 0 0 8px rgba(0, 255, 0, 0.45); }
        .hashi-island.error { border-color: #f00; box-shadow: 0 0 8px #f00; }
        .bridge-h { position: absolute; height: 2px; width: 100%; background: #00ffe59f; top: calc(50% - 1px); left: 0; z-index: 2; box-shadow: 0 0 3px rgba(0,255,231,0.3); pointer-events: none; }
        .bridge-double-h { position: absolute; height: 6px; width: 100%; border-top: 2px solid #00ffe596; border-bottom: 2px solid #00ffe7; top: calc(50% - 3px); left: 0; z-index: 2; box-sizing: border-box; box-shadow: 0 0 3px rgba(0,255,255,0.3); pointer-events: none; }
        .bridge-v { position: absolute; width: 2px; height: 100%; background: #00ffe583; left: calc(50% - 1px); top: 0; z-index: 2; box-shadow: 0 0 3px rgba(0,255,231,0.3); pointer-events: none; }
        .bridge-double-v { position: absolute; width: 6px; height: 100%; border-left: 2px solid #00ffe594; border-right: 2px solid #00ffe7; left: calc(50% - 3px); top: 0; z-index: 2; box-sizing: border-box; box-shadow: 0 0 3px rgba(0,255,255,0.3); pointer-events: none; }`
    ));

    let currentRows = 7;
    let currentCols = 7;
    let gridState = [];
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;

    window.initHashiGrid = function () {
        const rowsInput = document.getElementById('hashi-rows');
        const colsInput = document.getElementById('hashi-cols');
        if (rowsInput && colsInput) {
            currentRows = parseInt(rowsInput.value) || 7;
            currentCols = parseInt(colsInput.value) || 7;
        }

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));

        renderHashiGrid();
        updateHashiStats('-', '-');
    };

    window.clearHashiGrid = function () {
        if (isShowingSolution) {
            isShowingSolution = false;
            
        }
        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        updateHashiStats('-', '-');
        renderHashiGrid();
    };

    window.buildSimpleHashiExample = function () {
        currentRows = 5;
        currentCols = 5;
        const rowsInput = document.getElementById('hashi-rows');
        const colsInput = document.getElementById('hashi-cols');
        if (rowsInput) rowsInput.value = 5;
        if (colsInput) colsInput.value = 5;

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        gridState[0][0] = 3;
        gridState[0][4] = 3;
        gridState[4][0] = 3;
        gridState[4][4] = 3;

        renderHashiGrid();
        updateHashiStats('-', '-');
    };

    function renderHashiGrid() {
        const container = document.getElementById('hashi-grid-container');
        if (!container) return;
        container.innerHTML = '';

        container.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        container.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;

        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'hashi-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                updateHashiCellDisplay(cell, gridState[r][c]);

                cell.addEventListener('click', function (e) {
                    if (isShowingSolution) return;
                    if (this.querySelector('input')) return;
                    const cellEl = this;

                    cellEl.innerHTML = '';
                    cellEl.classList.add('editing');

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.className = 'hashi-island editing';
                    input.style.cssText = 'width:30px;height:30px;text-align:center;background:rgba(0,255,231,0.15);border:2px solid #00ffe7;color:#fff;font-size:14px;font-weight:bold;outline:none;padding:0;';
                    cellEl.appendChild(input);
                    input.focus();

                    const saveVal = () => {
                        let val = input.value.trim();
                        cellEl.classList.remove('editing');
                        if (val && !isNaN(val)) {
                            let n = parseInt(val);
                            if (n >= 1 && n <= 8) gridState[r][c] = n;
                            else gridState[r][c] = null;
                        } else {
                            gridState[r][c] = null;
                        }
                        input.remove();
                        updateHashiCellDisplay(cellEl, gridState[r][c]);
                    };

                    input.addEventListener('blur', saveVal, { once: true });
                    input.addEventListener('keydown', function (event) {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            input.blur();
                        }
                    });
                });

                container.appendChild(cell);
            }
        }
    }

    function updateHashiCellDisplay(el, val) {
        el.innerHTML = '';
        el.className = 'hashi-cell';
        if (val !== null) {
            const island = document.createElement('div');
            island.className = 'hashi-island';
            island.textContent = val;
            el.appendChild(island);
        }
    }

    window.solveHashiPuzzleUI = function () {
        if (!window.solveHashi) { updateHashiStats('模块未加载', '-'); return; }

        const puzzle = {
            rows: currentRows,
            cols: currentCols,
            grid: gridState
        };

        const startTime = performance.now();
        const res = window.solveHashi(puzzle);
        const elapsed = Math.round(performance.now() - startTime) + 'ms';

        if (res.error) { updateHashiStats(res.error, elapsed); return; }

        solutions = res.solutions || [];

        if (res.timeout) {
            updateHashiStats(solutions.length + '+ (超时中断)', elapsed);
        } else {
            updateHashiStats(solutions.length || '未找到解', elapsed);
        }

        if (solutions.length > 0) {
            isShowingSolution = true;
            currentSolutionIndex = 0;
            const nav = document.getElementById('hashi-solution-nav');
            if (nav) nav.style.display = 'flex';
            window.showHashiSolution(0);
        }
    };

    window.showHashiSolution = function (delta) {
        if (!solutions || solutions.length === 0) return;
        currentSolutionIndex = (currentSolutionIndex + delta + solutions.length) % solutions.length;

        const counter = document.getElementById('hashi-solution-counter');
        if (counter) counter.innerText = (currentSolutionIndex + 1) + ' / ' + solutions.length;

        const sol = solutions[currentSolutionIndex];
        const container = document.getElementById('hashi-grid-container');
        if (!container) return;

        const cells = container.querySelectorAll('.hashi-cell');
        cells.forEach(cell => {
            const bridges = cell.querySelectorAll('.bridge-h, .bridge-v, .bridge-double-h, .bridge-double-v');
            bridges.forEach(b => b.remove());

            const island = cell.querySelector('.hashi-island');
            if (island) {
                island.classList.remove('completed');
                island.classList.remove('error');
                island.classList.add('completed');
            }
        });

        sol.forEach(bridge => {
            const r1 = Math.min(bridge.r1, bridge.r2);
            const r2 = Math.max(bridge.r1, bridge.r2);
            const c1 = Math.min(bridge.c1, bridge.c2);
            const c2 = Math.max(bridge.c1, bridge.c2);
            const count = bridge.count;

            if (r1 === r2) {
                for (let c = c1 + 1; c < c2; c++) {
                    const cell = cells[r1 * currentCols + c];
                    const b = document.createElement('div');
                    b.className = count === 2 ? 'bridge-double-h' : 'bridge-h';
                    cell.prepend(b);
                }
                const cell1 = cells[r1 * currentCols + c1];
                const b1 = document.createElement('div');
                b1.className = count === 2 ? 'bridge-double-h' : 'bridge-h';
                cell1.prepend(b1);

                const cell2 = cells[r1 * currentCols + c2];
                const b2 = document.createElement('div');
                b2.className = count === 2 ? 'bridge-double-h' : 'bridge-h';
                cell2.prepend(b2);
            } else {
                for (let r = r1 + 1; r < r2; r++) {
                    const cell = cells[r * currentCols + c1];
                    const b = document.createElement('div');
                    b.className = count === 2 ? 'bridge-double-v' : 'bridge-v';
                    cell.prepend(b);
                }
                const cell1 = cells[r1 * currentCols + c1];
                const b1 = document.createElement('div');
                b1.className = count === 2 ? 'bridge-double-v' : 'bridge-v';
                cell1.prepend(b1);

                const cell2 = cells[r2 * currentCols + c1];
                const b2 = document.createElement('div');
                b2.className = count === 2 ? 'bridge-double-v' : 'bridge-v';
                cell2.prepend(b2);
            }
        });
    };

    function updateHashiStats(cnt, time) {
        const countEl = document.getElementById('hashi-solutionsCount');
        const timeEl = document.getElementById('hashi-timeElapsed');
        if (countEl) countEl.innerText = cnt;
        if (timeEl) timeEl.innerText = time;
    }
})();
