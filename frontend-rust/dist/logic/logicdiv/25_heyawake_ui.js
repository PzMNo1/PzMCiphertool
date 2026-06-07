(function() {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('heyawake-workspace', 'heyawake-layout',
        // Left
        window.LogicUI.backButton('heyawake-workspace') +
        window.LogicUI.title('HEYA WAKE', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('heyawake-rows', 'heyawake-cols', { rowVal: 8, colVal: 8 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initHeyawakeGrid && window.initHeyawakeGrid()' },
            { label: '计算核心分析', onclick: 'window.solveHeyawakePuzzleUI && window.solveHeyawakePuzzleUI()', id: 'heyawake-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearHeyawakeGrid && window.clearHeyawakeGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleHeyawakeExample && window.buildSimpleHeyawakeExample()' }
        ]) +
        window.LogicUI.statsPanel('heyawake', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('heyawake', 'showHeyawakeSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击方格输入数字，右键点击可标记黑/白色进行推理预览。在网格间拖动以绘制粗线划分区域（房间）。',
            '将一些格子涂黑，使得黑色格子之间不相邻（没有公共边）。',
            '所有未涂黑的白色格子必须相互连通，形成一个整体。',
            '如果有数字的房间，则该房间内的黑色格子数量必须等于该数字。',
            '任意一条由白色格子组成的直线段，绝不能穿过两个或以上的粗线边界（不能同时跨越三个区域）。'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

        // Right
        `<div id="heyawake-grid-container" style="position: relative; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 8px; border: 1px solid var(--neon-cyan); box-shadow: 0 0 15px rgba(0,255,255,0.2); display: inline-grid;"></div>`,

        // CSS
        `.heyawake-cell { width: 40px; height: 40px; border: 1px solid #444; background: #2a2a2a; color: #00ffe7;      font-size: 18px; font-weight: bold;}
        .heyawake-cell:hover { background: #3d3d3d; }
        .heyawake-cell.clue { color: #fff; }
        .heyawake-cell.black { background: #000; box-shadow: inset 0 0 15px #000; border-color: #111; }
        .heyawake-cell.editing { background: #00ffe7; color: #000; box-shadow: inset 0 0 10px #00ffe7; outline: none; }
        .grid-line { cursor: pointer; transition: background 0.1s; z-index: 10;}
        .grid-line:hover { background: rgba(0,255,255,0.4) !important; }
        .grid-line.active { background: var(--neon-cyan) !important; box-shadow: 0 0 8px var(--neon-cyan); z-index: 30;}`
    ));

    let currentRows = 8;
    let currentCols = 8;
    let gridState = []; // Clues
    let previewState = []; // 0, 1, or null
    let edgeState = {};
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    let isDragging = false;
    let dragStartPos = null;

    function handleGlobalMouseUp() {
        isDragging = false;
        dragStartPos = null;
    }

    function handleGlobalMouseMove(e) {
        if (!isDragging || !dragStartPos || isShowingSolution) return;
        const puzzleGrid = document.getElementById('heyawake-grid-container');
        if(!puzzleGrid) return;

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const gridLines = puzzleGrid.querySelectorAll(`.grid-line.${dragStartPos.type === 'h' ? 'horizontal-line' : 'vertical-line'}`);
        
        gridLines.forEach(line => {
            const rect = line.getBoundingClientRect();
            const lineId = line.dataset.id;
            
            if (lineId === dragStartPos.lineId) return;
            
            let isOver = false;
            if (dragStartPos.type === 'h') {
                if (Math.abs(mouseY - (rect.top + rect.height/2)) < 20 && mouseX >= rect.left && mouseX <= rect.right) isOver = true;
            } else {
                if (Math.abs(mouseX - (rect.left + rect.width/2)) < 20 && mouseY >= rect.top && mouseY <= rect.bottom) isOver = true;
            }
            
            if (isOver) {
                edgeState[lineId] = !edgeState[lineId];
                if (!edgeState[lineId]) {
                    delete edgeState[lineId];
                    line.classList.remove('active');
                } else {
                    line.classList.add('active');
                }
                dragStartPos.lineId = lineId;
            }
        });
        e.preventDefault();
    }

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mousemove', handleGlobalMouseMove);

    window.initHeyawakeGrid = function() {
        const rowsInput = document.getElementById('heyawake-rows');
        const colsInput = document.getElementById('heyawake-cols');
        if (rowsInput && colsInput) {
            currentRows = parseInt(rowsInput.value) || 8;
            currentCols = parseInt(colsInput.value) || 8;
        }

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        previewState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        edgeState = {};

        renderHeyawakeGrid();
        updateHeyawakeStats('-', '-');
    };

    window.clearHeyawakeGrid = function() {
        if (isShowingSolution) {
            isShowingSolution = false;
            
        }
        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        previewState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        edgeState = {};
        updateHeyawakeStats('-', '-');
        renderHeyawakeGrid();
    };

    window.buildSimpleHeyawakeExample = function() {
        currentRows = 4;
        currentCols = 4;
        const rowsInput = document.getElementById('heyawake-rows');
        const colsInput = document.getElementById('heyawake-cols');
        if(rowsInput) rowsInput.value = 4;
        if(colsInput) colsInput.value = 4;

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        previewState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        edgeState = {};

        gridState[0][0] = 1;
        gridState[2][2] = 2; // Room with 2 black
        
        edgeState['h_2_2'] = true;
        edgeState['h_2_3'] = true;
        edgeState['v_2_2'] = true;
        edgeState['v_3_2'] = true;

        renderHeyawakeGrid();
        updateHeyawakeStats('-', '-');
    };

    function renderHeyawakeGrid() {
        const container = document.getElementById('heyawake-grid-container');
        if (!container) return;
        container.innerHTML = '';

        container.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        container.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;

        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'heyawake-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                updateHeyawakeCellDisplay(cell, r, c);

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
                        if (val && !isNaN(val) && parseInt(val) >= 0) gridState[r][c] = parseInt(val);
                        else gridState[r][c] = null;

                        input.remove();
                        cellEl.classList.remove('editing');
                        updateHeyawakeCellDisplay(cellEl, r, c);
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
                    updateHeyawakeCellDisplay(this, r, c);
                });

                container.appendChild(cell);
            }
        }

        const padding = 10;
        const cellSize = 40;

        for (let r = 1; r < currentRows; r++) {
            for (let c = 0; c < currentCols; c++) {
                const line = document.createElement('div');
                line.className = 'grid-line horizontal-line';
                line.dataset.type = 'h';
                line.dataset.r = r;
                line.dataset.c = c;
                line.dataset.id = `h_${r}_${c}`;
                
                line.style.position = 'absolute';
                line.style.left = `${padding + c * cellSize}px`;
                line.style.top = `${padding + r * cellSize - 4}px`;
                line.style.width = `${cellSize}px`;
                line.style.height = `8px`;
                line.style.backgroundColor = 'transparent';
                
                if (edgeState[line.dataset.id]) line.classList.add('active');
                
                line.addEventListener('mousedown', function(e) {
                    if (isShowingSolution) return;
                    const lId = this.dataset.id;
                    edgeState[lId] = !edgeState[lId];
                    if (!edgeState[lId]) {
                        delete edgeState[lId];
                        this.classList.remove('active');
                    } else {
                        this.classList.add('active');
                    }
                    isDragging = true;
                    dragStartPos = { type: 'h', r: parseInt(this.dataset.r), c: parseInt(this.dataset.c), lineId: lId };
                    e.preventDefault();
                    e.stopPropagation();
                });
                container.appendChild(line);
            }
        }

        for (let r = 0; r < currentRows; r++) {
            for (let c = 1; c < currentCols; c++) {
                const line = document.createElement('div');
                line.className = 'grid-line vertical-line';
                line.dataset.type = 'v';
                line.dataset.r = r;
                line.dataset.c = c;
                line.dataset.id = `v_${r}_${c}`;
                
                line.style.position = 'absolute';
                line.style.left = `${padding + c * cellSize - 4}px`;
                line.style.top = `${padding + r * cellSize}px`;
                line.style.height = `${cellSize}px`;
                line.style.width = `8px`;
                line.style.backgroundColor = 'transparent';
                
                if (edgeState[line.dataset.id]) line.classList.add('active');
                
                line.addEventListener('mousedown', function(e) {
                    if (isShowingSolution) return;
                    const lId = this.dataset.id;
                    edgeState[lId] = !edgeState[lId];
                    if (!edgeState[lId]) {
                        delete edgeState[lId];
                        this.classList.remove('active');
                    } else {
                        this.classList.add('active');
                    }
                    isDragging = true;
                    dragStartPos = { type: 'v', r: parseInt(this.dataset.r), c: parseInt(this.dataset.c), lineId: lId };
                    e.preventDefault();
                    e.stopPropagation();
                });
                container.appendChild(line);
            }
        }
    }

    function updateHeyawakeCellDisplay(el, r, c) {
        el.className = 'heyawake-cell';
        el.textContent = '';
        
        if (gridState[r][c] !== null) {
            el.classList.add('clue');
            el.textContent = gridState[r][c];
        }
        
        if (isShowingSolution) {
            if (solutions[currentSolutionIndex][r][c] === 1) el.classList.add('black');
        } else {
            if (previewState[r][c] === 1) el.classList.add('black');
        }
    }

    window.solveHeyawakePuzzleUI = function() {
        if (!window.solveHeyawake) { updateHeyawakeStats('模块未加载', '-'); return; }

        const puzzle = {
            rows: currentRows,
            cols: currentCols,
            clues: gridState,
            edges: edgeState
        };

        const startTime = performance.now();
        const res = window.solveHeyawake(puzzle);
        const elapsed = LogicUI.formatElapsed(performance.now() - startTime);

        if (res.error) { updateHeyawakeStats(res.error, elapsed); return; }

        solutions = res.solutions || [];

        if (res.timeout) {
            updateHeyawakeStats(solutions.length + '+ (超时中断)', elapsed);
        } else {
            updateHeyawakeStats(solutions.length || '未找到解', elapsed);
        }

        if (solutions.length > 0) {
            isShowingSolution = true;
            currentSolutionIndex = 0;
            const nav = document.getElementById('heyawake-solution-nav');
            if (nav) nav.style.display = 'flex';
            window.showHeyawakeSolution(0);
        }
    };

    window.showHeyawakeSolution = function (delta) {
        if (!solutions || solutions.length === 0) return;
        currentSolutionIndex = (currentSolutionIndex + delta + solutions.length) % solutions.length;
        
        const counter = document.getElementById('heyawake-solution-counter');
        if (counter) counter.innerText = (currentSolutionIndex + 1) + ' / ' + solutions.length;

        const container = document.getElementById('heyawake-grid-container');
        if (!container) return;

        const cells = container.querySelectorAll('.heyawake-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            updateHeyawakeCellDisplay(cell, r, c);
        });
    };

    function updateHeyawakeStats(cnt, time) {
        const countEl = document.getElementById('heyawake-solutionsCount');
        const timeEl = document.getElementById('heyawake-timeElapsed');
        if (countEl) countEl.innerText = cnt;
        if (timeEl) timeEl.innerText = time;
    }
})();
