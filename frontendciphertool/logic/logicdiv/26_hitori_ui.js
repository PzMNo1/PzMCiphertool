(function() {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('hitori-workspace', 'hitori-layout',
        // Left
        window.LogicUI.backButton('hitori-workspace') +
        window.LogicUI.title('HITORI', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('hitori-rows', 'hitori-cols', { rowVal: 8, colVal: 8 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initHitoriGrid && window.initHitoriGrid()' },
            { label: '计算核心分析', onclick: 'window.solveHitoriPuzzleUI && window.solveHitoriPuzzleUI()', id: 'hitori-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearHitoriGrid && window.clearHitoriGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleHitoriExample && window.buildSimpleHitoriExample()' }
        ]) +
        window.LogicUI.statsPanel('hitori', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('hitori', 'showHitoriSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击或编辑方格输入数字，右键点击格子可标记为黑色或白色圈进行推理预览。',
            '将一些包含数字的格子涂黑，使得每一行和每一列中，没有重复的未涂黑（白色）数字出现。',
            '黑色格子不能相邻（上下左右共享边缘）。',
            '所有未涂黑的白色格子必须相互连通，不可被黑色格子完全隔断。'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

        // Right
        `<div id="hitori-grid-container" style="position: relative; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 8px; border: 1px solid var(--neon-cyan); box-shadow: 0 0 15px rgba(0,255,255,0.2); display: inline-grid;"></div>`,

        // CSS
        `.hitori-cell { width: 40px; height: 40px; border: 1px solid #333; background: #111; color: #00ffe7;      font-size: 18px; font-weight: bold;}
        .hitori-cell:hover { background: #222; }
        .hitori-cell.clue { color: #fff; }
        .hitori-cell.black { background: #000; box-shadow: inset 0 0 10px #000; color: #555; }
        .hitori-cell.circle::after { content: ''; position: absolute; width: 30px; height: 30px; border-radius: 50%; border: 2px solid #0f0; pointer-events: none;}
        .hitori-cell.editing { background: #00ffe7; color: #000; box-shadow: inset 0 0 10px #000; outline: none; }`
    ));

    let currentRows = 8;
    let currentCols = 8;
    let gridState = []; // number
    let previewState = []; // 0=circle, 1=black
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;

    window.initHitoriGrid = function() {
        const rowsInput = document.getElementById('hitori-rows');
        const colsInput = document.getElementById('hitori-cols');
        if (rowsInput && colsInput) {
            currentRows = parseInt(rowsInput.value) || 8;
            currentCols = parseInt(colsInput.value) || 8;
        }

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        previewState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));

        renderHitoriGrid();
        updateHitoriStats('-', '-');
    };

    window.clearHitoriGrid = function() {
        if (isShowingSolution) {
            isShowingSolution = false;
            
        }
        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        previewState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        updateHitoriStats('-', '-');
        renderHitoriGrid();
    };

    window.buildSimpleHitoriExample = function() {
        currentRows = 5;
        currentCols = 5;
        const rowsInput = document.getElementById('hitori-rows');
        const colsInput = document.getElementById('hitori-cols');
        if(rowsInput) rowsInput.value = 5;
        if(colsInput) colsInput.value = 5;

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        previewState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));

        const exampleGrid = [
            [1, 5, 3, 1, 2],
            [2, 4, 1, 5, 3],
            [4, 1, 2, 3, 5],
            [3, 2, 5, 4, 1],
            [5, 3, 4, 2, 5]
        ];

        for(let r=0; r<5; r++) {
            for(let c=0; c<5; c++) {
                gridState[r][c] = exampleGrid[r][c];
            }
        }

        renderHitoriGrid();
        updateHitoriStats('-', '-');
    };

    function renderHitoriGrid() {
        const container = document.getElementById('hitori-grid-container');
        if (!container) return;
        container.innerHTML = '';

        container.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        container.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;

        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'hitori-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                updateHitoriCellDisplay(cell, r, c);

                cell.addEventListener('click', function(e) {
                    if (isShowingSolution) return;
                    if (this.querySelector('input')) return;
                    const cellEl = this;

                    cellEl.classList.add('editing');
                    cellEl.textContent = '';

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 2;
                    input.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;text-align:center;background:transparent;border:none;color:#00ffe7;font-size:18px;font-weight:bold;z-index:10;outline:none;padding:0;';
                    cellEl.appendChild(input);
                    input.focus();

                    const saveVal = () => {
                        let val = input.value.trim();
                        if (val && !isNaN(val) && parseInt(val) > 0) gridState[r][c] = parseInt(val);
                        else gridState[r][c] = null;

                        input.remove();
                        cellEl.classList.remove('editing');
                        updateHitoriCellDisplay(cellEl, r, c);
                    };

                    input.addEventListener('blur', saveVal, { once: true });
                    input.addEventListener('keydown', function(event) {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            input.blur();
                        }
                    });
                });

                cell.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    if (isShowingSolution) return;
                    if (previewState[r][c] === null) previewState[r][c] = 1;
                    else if (previewState[r][c] === 1) previewState[r][c] = 0;
                    else previewState[r][c] = null;
                    updateHitoriCellDisplay(this, r, c);
                });

                container.appendChild(cell);
            }
        }
    }

    function updateHitoriCellDisplay(el, r, c) {
        el.className = 'hitori-cell';
        el.textContent = '';
        
        if (gridState[r][c] !== null) {
            el.textContent = gridState[r][c];
            el.classList.add('clue');
        }
        
        if (isShowingSolution) {
            if (solutions[currentSolutionIndex][r][c] === 1) {
                el.classList.add('black');
            } else {
                el.classList.add('circle');
            }
        } else {
            if (previewState[r][c] === 1) {
                el.classList.add('black');
            } else if (previewState[r][c] === 0) {
                el.classList.add('circle');
            }
        }
    }

    window.solveHitoriPuzzleUI = function() {
        if (!window.solveHitori) { updateHitoriStats('模块未加载', '-'); return; }

        const puzzle = {
            rows: currentRows,
            cols: currentCols,
            grid: gridState
        };

        const startTime = performance.now();
        const res = window.solveHitori(puzzle);
        const elapsed = Math.round(performance.now() - startTime) + 'ms';

        if (res.error) { updateHitoriStats(res.error, elapsed); return; }

        solutions = res.solutions || [];

        if (res.timeout) {
            updateHitoriStats(solutions.length + '+ (超时中断)', elapsed);
        } else {
            updateHitoriStats(solutions.length || '未找到解', elapsed);
        }

        if (solutions.length > 0) {
            isShowingSolution = true;
            currentSolutionIndex = 0;
            const nav = document.getElementById('hitori-solution-nav');
            if (nav) nav.style.display = 'flex';
            window.showHitoriSolution(0);
        }
    };

    window.showHitoriSolution = function (delta) {
        if (!solutions || solutions.length === 0) return;
        currentSolutionIndex = (currentSolutionIndex + delta + solutions.length) % solutions.length;
        
        const counter = document.getElementById('hitori-solution-counter');
        if (counter) counter.innerText = (currentSolutionIndex + 1) + ' / ' + solutions.length;

        const container = document.getElementById('hitori-grid-container');
        if (!container) return;

        const cells = container.querySelectorAll('.hitori-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            updateHitoriCellDisplay(cell, r, c);
        });
    };

    function updateHitoriStats(cnt, time) {
        const countEl = document.getElementById('hitori-solutionsCount');
        const timeEl = document.getElementById('hitori-timeElapsed');
        if (countEl) countEl.innerText = cnt;
        if (timeEl) timeEl.innerText = time;
    }
})();
