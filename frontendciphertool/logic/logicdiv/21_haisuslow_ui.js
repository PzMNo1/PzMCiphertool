(function() {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('haisuslow-workspace', 'haisuslow-layout',
        // Left
        window.LogicUI.backButton('haisuslow-workspace') +
        window.LogicUI.title('HAISUSLOW', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('haisuslow-rows', 'haisuslow-cols', { rowVal: 6, colVal: 6 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initHaisuslowGrid && window.initHaisuslowGrid()' },
            { label: '计算核心分析', onclick: 'window.solveHaisuslowPuzzleUI && window.solveHaisuslowPuzzleUI()', id: 'haisuslow-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearHaisuslowGrid && window.clearHaisuslowGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleHaisuslowExample && window.buildSimpleHaisuslowExample()' }
        ]) +
        window.LogicUI.statsPanel('haisuslow', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('haisuslow', 'showHaisuslowSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '通过格子画一条从S(起点)到G(终点)的连续路径。',
            '必须穿过多边形分隔的每个区域，粗线表示区域边界。',
            '包含数字的区域，路径必须正好穿过该区域指定的次数。',
            '每个方格都必须恰好经过一次。'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

        // Right
        `<div id="haisuslow-grid-container" style="position: relative; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 8px; border: 1px solid var(--neon-cyan); box-shadow: 0 0 15px rgba(0,255,255,0.2); display: inline-grid;"></div>`,

        // CSS
        `.haisuslow-cell { width: 40px; height: 40px; border: 1px solid #333; background: #111; color: #00ffe7;      font-size: 18px; font-weight: bold;}
        .haisuslow-cell:hover { background: #222; }
        .haisuslow-cell.start { color: #0f0; }
        .haisuslow-cell.goal { color: #f00; }
        .haisuslow-cell.clue { color: #fff; }
        .haisuslow-cell.editing { background: #00ffe7; color: #000; box-shadow: inset 0 0 10px #000; outline: none; }
        .grid-line { cursor: pointer; transition: background 0.1s; z-index: 10;}
        .grid-line:hover { background: rgba(0,255,255,0.4) !important; }
        .grid-line.active { background: var(--neon-cyan) !important; box-shadow: 0 0 8px var(--neon-cyan); z-index: 30;}
        .path-line { position: absolute; background: #0f0; z-index: 5; box-shadow: 0 0 5px #0f0; pointer-events: none;}
        .path-center { position: absolute; width: 6px; height: 6px; background: #0f0; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5; box-shadow: 0 0 5px #0f0; pointer-events: none;}`
    ));

    let currentRows = 6;
    let currentCols = 6;
    let gridState = [];
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
        const puzzleGrid = document.getElementById('haisuslow-grid-container');
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

    window.initHaisuslowGrid = function() {
        const rowsInput = document.getElementById('haisuslow-rows');
        const colsInput = document.getElementById('haisuslow-cols');
        if (rowsInput && colsInput) {
            currentRows = parseInt(rowsInput.value) || 6;
            currentCols = parseInt(colsInput.value) || 6;
        }

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        edgeState = {};

        renderHaisuslowGrid();
        updateHaisuslowStats('-', '-');
    };

    window.clearHaisuslowGrid = function() {
        if (isShowingSolution) {
            isShowingSolution = false;
            
        }
        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        edgeState = {};
        updateHaisuslowStats('-', '-');
        renderHaisuslowGrid();
    };

    window.buildSimpleHaisuslowExample = function() {
        currentRows = 4;
        currentCols = 4;
        const rowsInput = document.getElementById('haisuslow-rows');
        const colsInput = document.getElementById('haisuslow-cols');
        if(rowsInput) rowsInput.value = 4;
        if(colsInput) colsInput.value = 4;

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(null));
        edgeState = {};

        gridState[0][0] = 'S';
        gridState[3][2] = 'G';

        edgeState['h_2_0'] = true;
        edgeState['h_2_1'] = true;

        renderHaisuslowGrid();
        updateHaisuslowStats('-', '-');
    };

    function renderHaisuslowGrid() {
        const container = document.getElementById('haisuslow-grid-container');
        if (!container) return;
        container.innerHTML = '';

        container.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        container.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;

        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'haisuslow-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                updateHaisuslowCellDisplay(cell, gridState[r][c]);

                cell.addEventListener('click', function(e) {
                    if (isShowingSolution) return;
                    this.contentEditable = true;
                    this.classList.add('editing');
                    this.textContent = '';
                    this.focus();

                    const commitVal = () => {
                        let val = this.textContent.trim().toUpperCase();
                        if (val === 'S') gridState[r][c] = 'S';
                        else if (val === 'G') gridState[r][c] = 'G';
                        else if (val && !isNaN(val) && parseInt(val) > 0) gridState[r][c] = parseInt(val);
                        else gridState[r][c] = null;

                        this.contentEditable = false;
                        this.classList.remove('editing');
                        updateHaisuslowCellDisplay(this, gridState[r][c]);
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

    function updateHaisuslowCellDisplay(el, val) {
        el.className = 'haisuslow-cell';
        el.textContent = '';
        if (val === 'S') {
            el.classList.add('start');
            el.textContent = 'S';
        } else if (val === 'G') {
            el.classList.add('goal');
            el.textContent = 'G';
        } else if (typeof val === 'number') {
            el.classList.add('clue');
            el.textContent = val;
        }
    }

    window.solveHaisuslowPuzzleUI = function() {
        if (!window.solveHaisuslow) { updateHaisuslowStats('模块未加载', '-'); return; }

        const puzzle = {
            rows: currentRows,
            cols: currentCols,
            grid: gridState,
            edges: edgeState
        };

        const startTime = performance.now();
        const res = window.solveHaisuslow(puzzle);
        const elapsed = LogicUI.formatElapsed(performance.now() - startTime);

        if (res.error) { updateHaisuslowStats(res.error, elapsed); return; }

        solutions = res.solutions || [];

        if (res.timeout) {
            updateHaisuslowStats(solutions.length + '+ (超时中断)', elapsed);
        } else {
            updateHaisuslowStats(solutions.length || '未找到解', elapsed);
        }

        if (solutions.length > 0) {
            isShowingSolution = true;
            currentSolutionIndex = 0;
            const nav = document.getElementById('haisuslow-solution-nav');
            if (nav) nav.style.display = 'flex';
            window.showHaisuslowSolution(0);
        }
    };

    window.showHaisuslowSolution = function (delta) {
        if (!solutions || solutions.length === 0) return;
        currentSolutionIndex = (currentSolutionIndex + delta + solutions.length) % solutions.length;
        
        const counter = document.getElementById('haisuslow-solution-counter');
        if (counter) counter.innerText = (currentSolutionIndex + 1) + ' / ' + solutions.length;

        const sol = solutions[currentSolutionIndex];
        const container = document.getElementById('haisuslow-grid-container');
        if (!container) return;

        const existingPath = container.querySelectorAll('.path-line, .path-center');
        existingPath.forEach(el => el.remove());

        const cells = container.querySelectorAll('.haisuslow-cell');
        
        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCols; c++) {
                const cell = cells[r * currentCols + c];
                const dir = sol[r][c];
                
                const center = document.createElement('div');
                center.className = 'path-center';
                cell.appendChild(center);

                if (dir !== '.' && dir !== null) {
                    const line = document.createElement('div');
                    line.className = 'path-line';
                    if (dir === '^') { line.style.width = '4px'; line.style.height = '50%'; line.style.top = '0'; line.style.left = 'calc(50% - 2px)'; }
                    else if (dir === 'v') { line.style.width = '4px'; line.style.height = '50%'; line.style.top = '50%'; line.style.left = 'calc(50% - 2px)'; }
                    else if (dir === '<') { line.style.height = '4px'; line.style.width = '50%'; line.style.left = '0'; line.style.top = 'calc(50% - 2px)'; }
                    else if (dir === '>') { line.style.height = '4px'; line.style.width = '50%'; line.style.left = '50%'; line.style.top = 'calc(50% - 2px)'; }
                    cell.appendChild(line);
                }

                const dirs = [
                    {dr: -1, dc: 0, from: 'v'},
                    {dr: 1, dc: 0, from: '^'},
                    {dr: 0, dc: -1, from: '>'},
                    {dr: 0, dc: 1, from: '<'}
                ];

                for (const d of dirs) {
                    const nr = r + d.dr;
                    const nc = c + d.dc;
                    if (nr >= 0 && nr < currentRows && nc >= 0 && nc < currentCols) {
                        if (sol[nr][nc] === d.from) {
                            const line = document.createElement('div');
                            line.className = 'path-line';
                            if (d.dr === -1) { line.style.width = '4px'; line.style.height = '50%'; line.style.top = '0'; line.style.left = 'calc(50% - 2px)'; }
                            else if (d.dr === 1) { line.style.width = '4px'; line.style.height = '50%'; line.style.top = '50%'; line.style.left = 'calc(50% - 2px)'; }
                            else if (d.dc === -1) { line.style.height = '4px'; line.style.width = '50%'; line.style.left = '0'; line.style.top = 'calc(50% - 2px)'; }
                            else if (d.dc === 1) { line.style.height = '4px'; line.style.width = '50%'; line.style.left = '50%'; line.style.top = 'calc(50% - 2px)'; }
                            cell.appendChild(line);
                        }
                    }
                }
            }
        }
    };

    function updateHaisuslowStats(cnt, time) {
        const countEl = document.getElementById('haisuslow-solutionsCount');
        const timeEl = document.getElementById('haisuslow-timeElapsed');
        if (countEl) countEl.innerText = cnt;
        if (timeEl) timeEl.innerText = time;
    }
})();
