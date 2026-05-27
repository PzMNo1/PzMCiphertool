(function() {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('gokigen-workspace', 'gokigen-layout',
        // Left
        window.LogicUI.backButton('gokigen-workspace') +
        window.LogicUI.title('GOKIGEN', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('gokigen-rows', 'gokigen-cols', { rowVal: 5, colVal: 5 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initGokigenGrid && window.initGokigenGrid()' },
            { label: '计算核心分析', onclick: 'window.solveGokigenPuzzleUI && window.solveGokigenPuzzleUI()', id: 'gokigen-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearGokigenGrid && window.clearGokigenGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleGokigenExample && window.buildSimpleGokigenExample()' }
        ]) +
        window.LogicUI.statsPanel('gokigen', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('gokigen', 'showGokigenSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '在每个方格中画一条对角线（斜杠或反斜杠）。',
            '圆圈内的数字表示连接到该圆圈的对角线的数量。',
            '对角线不能形成闭合的回路。'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

        // Right
        `<div id="gokigen-grid-container"></div>`,

        // CSS
        `#gokigen-grid-container { display: grid; gap: 0; background: rgba(0,0,0,0.4); padding: 20px; border-radius: 8px; border: 1px solid #00ffe7; box-shadow: 0 0 15px rgba(0,255,255,0.1); justify-content: center; align-content: center;}
        .gokigen-cell { width: 40px; height: 40px;  background: rgba(0,255,255,0.03);   border: 1px solid rgba(255,255,255,0.05);}
        .gokigen-cell:hover { background: rgba(0,255,255,0.15); }
        .gokigen-cell.solved { pointer-events: none; }
        .gokigen-cell.solved .slash-line { background: #72f1b8 !important; box-shadow: 0 0 8px #72f1b8 !important; }
        .gokigen-node { width: 24px; height: 24px; position: relative; border-radius: 50%; background: rgba(10,12,23,0.8); border: 1px solid rgba(0,255,255,0.3); display: flex; justify-content: center; align-items: center; z-index: 10; transition: all 0.3s; box-sizing: border-box;}
        .gokigen-node.satisfied { border-color: #0f0; box-shadow: 0 0 8px #0f0; }
        .gokigen-node.error { border-color: #f00; box-shadow: 0 0 8px #f00; }
        .gokigen-node input { width: 100%; height: 100%; background: transparent; border: none; color: #ffcc00; text-align: center; font-weight: bold; font-size: 0.9rem; outline: none; padding: 0; }
        .gokigen-node input:focus { color: #fff; }
        .slash-line { position: absolute; width: 140%; height: 3px; background: #00ffe7; top: 50%; left: 50%; transform-origin: center; z-index: 1; pointer-events: none; box-shadow: 0 0 6px #00ffe7;}
        .slash-forward { transform: translate(-50%, -50%) rotate(-45deg); }
        .slash-backward { transform: translate(-50%, -50%) rotate(45deg); }`
    ));

    let currentRows = 5;
    let currentCols = 5;
    let gridState = []; // 0=unset, 1=/, 2=\
    let clueState = [];
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;

    window.initGokigenGrid = function() {
        const rowsInput = document.getElementById('gokigen-rows');
        const colsInput = document.getElementById('gokigen-cols');
        if (rowsInput && colsInput) {
            currentRows = parseInt(rowsInput.value) || 5;
            currentCols = parseInt(colsInput.value) || 5;
        }

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(0));
        clueState = Array(currentRows + 1).fill().map(() => Array(currentCols + 1).fill(null));

        renderGokigenGrid();
        updateGokigenStats('-', '-');
    };

    window.clearGokigenGrid = function() {
        if (isShowingSolution) {
            isShowingSolution = false;
            
        }
        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(0));
        updateGokigenStats('-', '-');
        renderGokigenGrid(); // rerender to clear lines and node styles
    };

    window.buildSimpleGokigenExample = function() {
        currentRows = 5;
        currentCols = 5;
        const rowsInput = document.getElementById('gokigen-rows');
        const colsInput = document.getElementById('gokigen-cols');
        if(rowsInput) rowsInput.value = 5;
        if(colsInput) colsInput.value = 5;

        solutions = [];
        currentSolutionIndex = 0;
        isShowingSolution = false;

        

        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(0));
        clueState = Array(currentRows + 1).fill().map(() => Array(currentCols + 1).fill(null));

        // Let's create a known valid example.
        // A simple 5x5
        clueState[0][0] = 1; clueState[0][1] = null; clueState[0][2] = null; clueState[0][3] = null; clueState[0][4] = null; clueState[0][5] = 1;
        clueState[1][0] = null; clueState[1][1] = 4; clueState[1][2] = null; clueState[1][3] = null; clueState[1][4] = 2; clueState[1][5] = null;
        clueState[2][0] = null; clueState[2][1] = null; clueState[2][2] = 2; clueState[2][3] = 4; clueState[2][4] = null; clueState[2][5] = null;
        clueState[3][0] = null; clueState[3][1] = null; clueState[3][2] = 3; clueState[3][3] = null; clueState[3][4] = null; clueState[3][5] = null;
        clueState[4][0] = null; clueState[4][1] = 2; clueState[4][2] = null; clueState[4][3] = null; clueState[4][4] = 4; clueState[4][5] = null;
        clueState[5][0] = 0; clueState[5][1] = null; clueState[5][2] = null; clueState[5][3] = null; clueState[5][4] = null; clueState[5][5] = 1;

        renderGokigenGrid();
        updateGokigenStats('-', '-');
    };

    function renderGokigenGrid() {
        const container = document.getElementById('gokigen-grid-container');
        if (!container) return;
        container.innerHTML = '';

        let colTemp = '';
        for (let c = 0; c < currentCols; c++) colTemp += '24px 40px ';
        colTemp += '24px';

        let rowTemp = '';
        for (let r = 0; r < currentRows; r++) rowTemp += '24px 40px ';
        rowTemp += '24px';

        container.style.gridTemplateColumns = colTemp;
        container.style.gridTemplateRows = rowTemp;

        for (let r = 0; r <= currentRows; r++) {
            for (let c = 0; c <= currentCols; c++) {
                const node = document.createElement('div');
                node.className = 'gokigen-node';
                node.style.gridRow = `${2 * r + 1}`;
                node.style.gridColumn = `${2 * c + 1}`;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.inputMode = 'numeric';
                input.maxLength = 1;
                if (clueState[r][c] !== null) input.value = clueState[r][c];
                
                input.addEventListener('change', (e) => {
                    let val = e.target.value.trim();
                    if (val !== '' && !isNaN(val) && parseInt(val) >= 0 && parseInt(val) <= 4) {
                        clueState[r][c] = parseInt(val);
                    } else {
                        e.target.value = '';
                        clueState[r][c] = null;
                    }
                });

                if (isShowingSolution) input.disabled = true;
                node.dataset.r = r;
                node.dataset.c = c;
                node.appendChild(input);
                container.appendChild(node);

                if (c < currentCols) {
                    let spacer = document.createElement('div');
                    spacer.style.gridRow = `${2 * r + 1}`;
                    spacer.style.gridColumn = `${2 * c + 2}`;
                    container.appendChild(spacer);
                }
            }

            if (r < currentRows) {
                for (let c = 0; c <= currentCols; c++) {
                    let spacer = document.createElement('div');
                    spacer.style.gridRow = `${2 * r + 2}`;
                    spacer.style.gridColumn = `${2 * c + 1}`;
                    container.appendChild(spacer);

                    if (c < currentCols) {
                        const cell = document.createElement('div');
                        cell.className = 'gokigen-cell' + (isShowingSolution ? ' solved' : '');
                        cell.style.gridRow = `${2 * r + 2}`;
                        cell.style.gridColumn = `${2 * c + 2}`;
                        cell.dataset.r = r;
                        cell.dataset.c = c;
                        
                        updateGokigenCell(cell, gridState[r][c]);

                        cell.addEventListener('click', function() {
                            if (isShowingSolution) return;
                            let val = gridState[r][c];
                            val = (val + 1) % 3;
                            gridState[r][c] = val;
                            updateGokigenCell(this, val);
                        });

                        container.appendChild(cell);
                    }
                }
            }
        }
        
        if(isShowingSolution && solutions.length > 0) {
            verifyGokigenClues(solutions[currentSolutionIndex]);
        }
    }

    function updateGokigenCell(el, val) {
        el.innerHTML = '';
        if (val === 1) { // /
            let line = document.createElement('div');
            line.className = 'slash-line slash-forward';
            el.appendChild(line);
        } else if (val === 2) { // \
            let line = document.createElement('div');
            line.className = 'slash-line slash-backward';
            el.appendChild(line);
        }
    }

    window.solveGokigenPuzzleUI = function() {
        if (!window.solveGokigen) return alert("算法模块未加载");
        
        const puzzle = {
            rows: currentRows,
            cols: currentCols,
            clues: clueState,
            grid: gridState
        };

        const startTime = performance.now();
        const res = window.solveGokigen(puzzle);
        const elapsed = LogicUI.formatElapsed(performance.now() - startTime);

        solutions = res.solutions || [];

        if (res.timeout) {
            updateGokigenStats(solutions.length + (solutions.length >= 5 ? '+' : '') + " (超时中断)", elapsed);
        } else {
            updateGokigenStats(solutions.length, elapsed);
        }
        
        if (solutions.length > 0) {
            isShowingSolution = true;
            currentSolutionIndex = 0;
            const nav = document.getElementById('gokigen-solution-nav');
            if (nav) nav.style.display = 'flex';
            
            window.showGokigenSolution(0);
        } else {
            updateGokigenStats("未找到解", elapsed);
        }
    };

    window.showGokigenSolution = function (delta) {
        if (!solutions || solutions.length === 0) return;
        currentSolutionIndex = (currentSolutionIndex + delta + solutions.length) % solutions.length;
        
        const counter = document.getElementById('gokigen-solution-counter');
        if (counter) counter.innerText = (currentSolutionIndex + 1) + ' / ' + solutions.length;

        const sol = solutions[currentSolutionIndex];
        const container = document.getElementById('gokigen-grid-container');
        if (!container) return;
        
        const cells = container.querySelectorAll('.gokigen-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            updateGokigenCell(cell, sol[r][c]);
            cell.classList.add('solved');
        });
        
        verifyGokigenClues(sol);
    };

    function verifyGokigenClues(sol) {
        const container = document.getElementById('gokigen-grid-container');
        if (!container) return;
        const nodes = container.querySelectorAll('.gokigen-node');
        nodes.forEach(node => {
            const r = parseInt(node.dataset.r);
            const c = parseInt(node.dataset.c);
            const target = clueState[r][c];
            if (target !== null) {
                let count = 0;
                if (r > 0 && c > 0 && sol[r - 1][c - 1] === 2) count++;
                if (r > 0 && c < currentCols && sol[r - 1][c] === 1) count++;
                if (r < currentRows && c > 0 && sol[r][c - 1] === 1) count++;
                if (r < currentRows && c < currentCols && sol[r][c] === 2) count++;
                
                if (count === target) {
                    node.classList.add('satisfied');
                    node.classList.remove('error');
                } else {
                    node.classList.add('error');
                    node.classList.remove('satisfied');
                }
            }
        });
    }

    function updateGokigenStats(cnt, time) {
        const countEl = document.getElementById('gokigen-solutionsCount');
        const timeEl = document.getElementById('gokigen-timeElapsed');
        if (countEl) countEl.innerText = cnt;
        if (timeEl) timeEl.innerText = time;
    }
})();
