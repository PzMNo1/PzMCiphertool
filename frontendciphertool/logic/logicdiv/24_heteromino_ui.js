(function() {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('heteromino-workspace', 'heteromino-layout',
        // Left
        window.LogicUI.backButton('heteromino-workspace') +
        window.LogicUI.title('HETEROMINO', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('heteromino-rows', 'heteromino-cols', { rowVal: 8, colVal: 8 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initHeterominoGrid && window.initHeterominoGrid()' },
            { label: '计算核心分析', onclick: 'window.solveHeterominoPuzzleUI && window.solveHeterominoPuzzleUI()', id: 'heteromino-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearHeterominoGrid && window.clearHeterominoGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleHeterominoExample && window.buildSimpleHeterominoExample()' }
        ]) +
        window.LogicUI.statsPanel('heteromino', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('heteromino', 'showHeterominoSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击方格可将其涂黑，黑色方格表示不参与分割的区域。',
            '将所有白色方格划分成各种由3个方格组成的三连块（Tromino）。',
            '相邻的（即使仅点相邻不是，边相邻才是）三连块形状必须不同（不同旋转/翻转视为同形的不同朝向，只要类型相同就不允许相邻）。',
            '白色格子总数必须是3的倍数。'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

        // Right
        `<div id="heteromino-grid-container" style="position: relative; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 8px; border: 1px solid var(--neon-cyan); box-shadow: 0 0 15px rgba(0,255,255,0.2); display: inline-grid;"></div>`,

        // CSS
        `.heteromino-cell { width: 40px; height: 40px; border: 1px solid #444; background: #2a2a2a; color: #00ffe7;      font-size: 18px; font-weight: bold;}
        .heteromino-cell:hover { background: #3d3d3d; }
        .heteromino-cell.black { background: #000; box-shadow: inset 0 0 15px #000; border-color: #111; }
        .border-top { border-top: 2px solid #00d26a !important; }
        .border-bottom { border-bottom: 2px solid #00d26a !important; }
        .border-left { border-left: 2px solid #00d26a !important; }
        .border-right { border-right: 2px solid #00d26a !important; }`
    ));

    let currentRows = 8;
    let currentCols = 8;
    let gridState = []; // 0 = empty, 1 = black
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;

    window.initHeterominoGrid = function() {
        const rowsInput = document.getElementById('heteromino-rows');
        const colsInput = document.getElementById('heteromino-cols');
        if (rowsInput && colsInput) {
            currentRows = parseInt(rowsInput.value) || 8;
            currentCols = parseInt(colsInput.value) || 8;
        }

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(0));

        renderHeterominoGrid();
        updateHeterominoStats('-', '-');
    };

    window.clearHeterominoGrid = function() {
        if (isShowingSolution) {
            isShowingSolution = false;
            
        }
        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(0));
        updateHeterominoStats('-', '-');
        renderHeterominoGrid();
    };

    window.buildSimpleHeterominoExample = function() {
        currentRows = 4;
        currentCols = 4;
        const rowsInput = document.getElementById('heteromino-rows');
        const colsInput = document.getElementById('heteromino-cols');
        if(rowsInput) rowsInput.value = 4;
        if(colsInput) colsInput.value = 4;

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(0));
        gridState[0][0] = 1; 
        gridState[2][2] = 1; 
        gridState[3][3] = 1; 
        gridState[1][2] = 1; 
        // 4x4=16 cells. 4 black cells -> 12 white cells (4 trominoes)

        renderHeterominoGrid();
        updateHeterominoStats('-', '-');
    };

    function renderHeterominoGrid() {
        const container = document.getElementById('heteromino-grid-container');
        if (!container) return;
        container.innerHTML = '';

        container.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        container.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;

        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'heteromino-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                updateHeterominoCellDisplay(cell, gridState[r][c]);

                cell.addEventListener('click', function(e) {
                    if (isShowingSolution) return;
                    gridState[r][c] = gridState[r][c] === 0 ? 1 : 0;
                    updateHeterominoCellDisplay(this, gridState[r][c]);
                });

                container.appendChild(cell);
            }
        }
    }

    function updateHeterominoCellDisplay(el, val, borderData = null) {
        el.className = 'heteromino-cell';
        if (val === 1) el.classList.add('black');
        if (borderData) {
            if (borderData.top) el.classList.add('border-top');
            if (borderData.bottom) el.classList.add('border-bottom');
            if (borderData.left) el.classList.add('border-left');
            if (borderData.right) el.classList.add('border-right');
        }
    }

    window.solveHeterominoPuzzleUI = function() {
        if (!window.solveHeteromino) { updateHeterominoStats('模块未加载', '-'); return; }

        const puzzle = {
            rows: currentRows,
            cols: currentCols,
            grid: gridState
        };

        const startTime = performance.now();
        const res = window.solveHeteromino(puzzle);
        const elapsed = LogicUI.formatElapsed(performance.now() - startTime);

        if (res.error) { updateHeterominoStats(res.error, elapsed); return; }

        solutions = res.solutions || [];

        if (res.timeout) {
            updateHeterominoStats(solutions.length + '+ (超时中断)', elapsed);
        } else {
            updateHeterominoStats(solutions.length || '未找到解', elapsed);
        }

        if (solutions.length > 0) {
            isShowingSolution = true;
            currentSolutionIndex = 0;
            const nav = document.getElementById('heteromino-solution-nav');
            if (nav) nav.style.display = 'flex';
            window.showHeterominoSolution(0);
        }
    };

    window.showHeterominoSolution = function (delta) {
        if (!solutions || solutions.length === 0) return;
        currentSolutionIndex = (currentSolutionIndex + delta + solutions.length) % solutions.length;
        
        const counter = document.getElementById('heteromino-solution-counter');
        if (counter) counter.innerText = (currentSolutionIndex + 1) + ' / ' + solutions.length;

        const sol = solutions[currentSolutionIndex];
        const container = document.getElementById('heteromino-grid-container');
        if (!container) return;

        const cells = container.querySelectorAll('.heteromino-cell');
        
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            
            const val = sol[r][c]; 
            
            const borderData = {
                top: r === 0 || sol[r-1][c] !== val,
                bottom: r === currentRows-1 || sol[r+1][c] !== val,
                left: c === 0 || sol[r][c-1] !== val,
                right: c === currentCols-1 || sol[r][c+1] !== val
            };
            
            updateHeterominoCellDisplay(cell, gridState[r][c], borderData);
        });
    };

    function updateHeterominoStats(cnt, time) {
        const countEl = document.getElementById('heteromino-solutionsCount');
        const timeEl = document.getElementById('heteromino-timeElapsed');
        if (countEl) countEl.innerText = cnt;
        if (timeEl) timeEl.innerText = time;
    }
})();
