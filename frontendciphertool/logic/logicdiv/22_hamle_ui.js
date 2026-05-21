(function() {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('hamle-workspace', 'hamle-layout',
        // Left
        window.LogicUI.backButton('hamle-workspace') +
        window.LogicUI.title('HAMLE', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('hamle-rows', 'hamle-cols', { rowVal: 6, colVal: 6 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initHamleGrid && window.initHamleGrid()' },
            { label: '计算核心分析', onclick: 'window.solveHamlePuzzleUI && window.solveHamlePuzzleUI()', id: 'hamle-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearHamleGrid && window.clearHamleGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleHamleExample && window.buildSimpleHamleExample()' }
        ]) +
        window.LogicUI.statsPanel('hamle', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('hamle', 'showHamleSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '每个带有数字的方格都按照其数字指示的步数进行直线移动，然后停留，并使所在的格子变为黑色。',
            '黑色格子不相邻。',
            '剩余格子需保持四通八达（单一连通区域）。'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

        // Right
        `<div id="hamle-grid-container" style="position: relative; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 8px; border: 1px solid var(--neon-cyan); box-shadow: 0 0 15px rgba(0,255,255,0.2); display: inline-grid;"></div>`,

        // CSS
        `.hamle-cell { width: 40px; height: 40px; border: 1px solid #333; background: #111; color: #00ffe7;      font-size: 18px; font-weight: bold;}
        .hamle-cell:hover { background: #222; }
        .hamle-cell.clue { color: #fff; }
        .hamle-cell.source { color: rgba(255,255,255,0.4); borderStyle: dashed; }
        .hamle-cell.black { background: #000; color: #f00; box-shadow: inset 0 0 10px #f00;}
        .hamle-cell.editing { background: #00ffe7; color: #000; box-shadow: inset 0 0 10px #000; outline: none; }
        .move-arrow { position: absolute; background: #0f0; z-index: 5; box-shadow: 0 0 5px #0f0; pointer-events: none; height: 2px; transform-origin: 0 50%;}`
    ));

    let currentRows = 6;
    let currentCols = 6;
    let gridState = []; // num, null
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;

    window.initHamleGrid = function() {
        const rowsInput = document.getElementById('hamle-rows');
        const colsInput = document.getElementById('hamle-cols');
        if (rowsInput && colsInput) {
            currentRows = parseInt(rowsInput.value) || 6;
            currentCols = parseInt(colsInput.value) || 6;
        }

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));

        renderHamleGrid();
        updateHamleStats('-', '-');
    };

    window.clearHamleGrid = function() {
        if (isShowingSolution) {
            isShowingSolution = false;
            
        }
        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        updateHamleStats('-', '-');
        renderHamleGrid();
    };

    window.buildSimpleHamleExample = function() {
        currentRows = 5;
        currentCols = 5;
        const rowsInput = document.getElementById('hamle-rows');
        const colsInput = document.getElementById('hamle-cols');
        if(rowsInput) rowsInput.value = 5;
        if(colsInput) colsInput.value = 5;

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        gridState[0][1] = 1;
        gridState[1][3] = 2;
        gridState[3][0] = 3;
        gridState[4][2] = 2;
        gridState[3][4] = 1;

        renderHamleGrid();
        updateHamleStats('-', '-');
    };

    function renderHamleGrid() {
        const container = document.getElementById('hamle-grid-container');
        if (!container) return;
        container.innerHTML = '';

        container.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        container.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;

        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'hamle-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                updateHamleCellDisplay(cell, gridState[r][c]);

                cell.addEventListener('click', function(e) {
                    if (isShowingSolution) return;
                    this.contentEditable = true;
                    this.classList.add('editing');
                    this.textContent = '';
                    this.focus();

                    const commitVal = () => {
                        let val = this.textContent.trim();
                        if (val && !isNaN(val) && parseInt(val) > 0) gridState[r][c] = parseInt(val);
                        else gridState[r][c] = null;

                        this.contentEditable = false;
                        this.classList.remove('editing');
                        updateHamleCellDisplay(this, gridState[r][c]);
                    };

                    this.addEventListener('blur', commitVal, { once: true });
                    this.addEventListener('keydown', function(event) {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            this.blur();
                        }
                    });
                });

                container.appendChild(cell);
            }
        }
    }

    function updateHamleCellDisplay(el, val) {
        el.className = 'hamle-cell';
        el.textContent = '';
        if (typeof val === 'number') {
            el.classList.add('clue');
            el.textContent = val;
        }
    }

    window.solveHamlePuzzleUI = function() {
        if (!window.solveHamle) { updateHamleStats('模块未加载', '-'); return; }

        const puzzle = {
            rows: currentRows,
            cols: currentCols,
            grid: gridState
        };

        const startTime = performance.now();
        const res = window.solveHamle(puzzle);
        const elapsed = Math.round(performance.now() - startTime) + 'ms';

        if (res.error) { updateHamleStats(res.error, elapsed); return; }

        solutions = res.solutions || [];

        if (res.timeout) {
            updateHamleStats(solutions.length + '+ (超时中断)', elapsed);
        } else {
            updateHamleStats(solutions.length || '未找到解', elapsed);
        }

        if (solutions.length > 0) {
            isShowingSolution = true;
            currentSolutionIndex = 0;
            const nav = document.getElementById('hamle-solution-nav');
            if (nav) nav.style.display = 'flex';
            window.showHamleSolution(0);
        }
    };

    window.showHamleSolution = function (delta) {
        if (!solutions || solutions.length === 0) return;
        currentSolutionIndex = (currentSolutionIndex + delta + solutions.length) % solutions.length;
        
        const counter = document.getElementById('hamle-solution-counter');
        if (counter) counter.innerText = (currentSolutionIndex + 1) + ' / ' + solutions.length;

        const sol = solutions[currentSolutionIndex];
        const container = document.getElementById('hamle-grid-container');
        if (!container) return;

        const arrows = container.querySelectorAll('.move-arrow');
        arrows.forEach(el => el.remove());

        const cells = container.querySelectorAll('.hamle-cell');
        
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            cell.className = 'hamle-cell';
            cell.textContent = '';

            if (gridState[r][c] !== null) {
                cell.classList.add('clue');
                cell.classList.add('source');
                cell.textContent = gridState[r][c];
            }
        });

        sol.forEach(move => {
            const toCell = cells[move.to.r * currentCols + move.to.c];
            toCell.classList.remove('source'); 
            toCell.classList.add('black');
            toCell.textContent = move.val; 
            
            const padding = 10;
            const cellSize = 40;
            const fromX = padding + move.from.c * cellSize + cellSize/2;
            const fromY = padding + move.from.r * cellSize + cellSize/2;
            const toX = padding + move.to.c * cellSize + cellSize/2;
            const toY = padding + move.to.r * cellSize + cellSize/2;
            
            const dx = toX - fromX;
            const dy = toY - fromY;
            const length = Math.sqrt(dx*dx + dy*dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            const arrow = document.createElement('div');
            arrow.className = 'move-arrow';
            arrow.style.left = `${fromX}px`;
            arrow.style.top = `${fromY}px`;
            arrow.style.width = `${length}px`;
            arrow.style.transform = `rotate(${angle}deg)`;
            container.appendChild(arrow);
        });
    };

    function updateHamleStats(cnt, time) {
        const countEl = document.getElementById('hamle-solutionsCount');
        const timeEl = document.getElementById('hamle-timeElapsed');
        if (countEl) countEl.innerText = cnt;
        if (timeEl) timeEl.innerText = time;
    }
})();
