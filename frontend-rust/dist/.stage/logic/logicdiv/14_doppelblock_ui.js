window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('doppelblock-workspace', 'doppelblock-layout',
    // ── Left: Control Panel ──
    LogicUI.backButton('doppelblock-workspace') +
    LogicUI.title('DOPPELBLOCK', { color: 'var(--neon-cyan)' }) +
    LogicUI.singleSizeInput('doppelblock-size', { val: 5, min: 3, max: 9, placeholder: 'Size (NxN)' }) +
    LogicUI.actionGrid4([
        { label: '重置网格', onclick: 'window.initDoppelblockGrid && window.initDoppelblockGrid()' },
        { label: '计算核心分析', onclick: 'window.solveDoppelblockPuzzle && window.solveDoppelblockPuzzle()', id: 'doppelblock-solve-btn', glow: true },
        { label: '清空填涂', onclick: 'window.clearDoppelblockGrid && window.clearDoppelblockGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleDoppelblockExample && window.buildSimpleDoppelblockExample()' }
    ]) +
    LogicUI.statsPanel('doppelblock', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
    LogicUI.solutionNav('doppelblock', 'showDoppelblockSolution', { accent: 'var(--neon-cyan)' }) +
    LogicUI.instructions([
        '• <strong>网格规则</strong>：每行每列必须恰好包含 <strong>2 个黑色方块</strong>。',
        '• <strong>数字规则</strong>：其余格子填入数字 1 到 N-2，每行每列每个数字恰好出现一次。',
        '• <strong>线索规则</strong>：网格外部数字表示该行/列中两个黑块之间的数字之和。',
        '• <strong>左键格子</strong>：切换黑块/数字。外部边缘格子用于输入线索数字。'
    ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

    // ── Right: Grid Panel ──
    `<div id="doppelblock-grid-container"></div>`,

    // ── Style ──
    `#doppelblock-grid-container {
        --db-cell-size: 40px;
        display: grid;
        background: rgba(0, 229, 255, 0.1);
        padding: 8px;
        border-radius: 8px;
        border: 2px solid var(--neon-cyan);
        box-shadow: 0 0 15px rgba(0,229,255,0.3);
        width: fit-content;
        margin: 0 auto;
        gap: 2px;
    }
    .doppelblock-cell {
        width: var(--db-cell-size);
        height: var(--db-cell-size);
        background: rgba(15, 8, 30, 0.95);
        color: #fff;
        
        
        
        font-family: 'Orbitron', monospace;
        font-size: 1.2rem;
        
        border: 1px solid rgba(255, 255, 255, 0.1);}
    .doppelblock-cell.black {
        background: #000;
        box-shadow: inset 0 0 10px rgba(255,255,255,0.2);
    }
    .doppelblock-cell.clue {
        background: transparent;
        border: none;
    }
    .doppelblock-cell.clue input {
        width: 100%;
        height: 100%;
        background: transparent;
        border: none;
        color: #00e5ff;
        text-align: center;
        font-family: 'Orbitron', monospace;
        font-weight: bold;
        font-size: 1.2rem;
        text-shadow: 0 0 5px #00e5ff;
        outline: none;
    }
    .doppelblock-corner {
        width: var(--db-cell-size);
        height: var(--db-cell-size);
        background: transparent;
    }`
));

// JS integration logic for the UI
(function() {
    window.doppelblockState = [];
    window.doppelblockClues = { top: [], bottom: [], left: [], right: [] };

    let currentN = 5;

    window.initDoppelblockGrid = function() {
        const sizeInput = document.getElementById('doppelblock-size');
        let n = sizeInput ? parseInt(sizeInput.value) : 5;
        if (isNaN(n) || n < 3) n = 3;
        currentN = n;
        
        window.doppelblockState = Array(n).fill(0).map(() => Array(n).fill({type: 'empty', value: null}));
        window.doppelblockClues = {
            top: Array(n).fill(null),
            bottom: Array(n).fill(null),
            left: Array(n).fill(null),
            right: Array(n).fill(null)
        };
        window.doppelblockSolutions = [];
        window.doppelblockCurrentSolIndex = 0;
        
        
        
        renderDoppelblockGrid();
    };

    window.clearDoppelblockGrid = function() {
        for(let r=0; r<currentN; r++){
            for(let c=0; c<currentN; c++){
                window.doppelblockState[r][c] = {type: 'empty', value: null};
            }
        }
        window.doppelblockSolutions = [];
        window.doppelblockCurrentSolIndex = 0;
        
        renderDoppelblockGrid();
    };

    function renderDoppelblockGrid() {
        const container = document.getElementById('doppelblock-grid-container');
        if (!container) return;
        container.innerHTML = '';
        container.style.gridTemplateColumns = `var(--db-cell-size) repeat(${currentN}, var(--db-cell-size)) var(--db-cell-size)`;
        
        // Top row
        container.appendChild(createCorner());
        for(let c=0; c<currentN; c++) container.appendChild(createClueCell('top', c));
        container.appendChild(createCorner());
        
        // Middle rows
        for(let r=0; r<currentN; r++) {
            container.appendChild(createClueCell('left', r));
            for(let c=0; c<currentN; c++) {
                container.appendChild(createGridCell(r, c));
            }
            container.appendChild(createClueCell('right', r));
        }
        
        // Bottom row
        container.appendChild(createCorner());
        for(let c=0; c<currentN; c++) container.appendChild(createClueCell('bottom', c));
        container.appendChild(createCorner());
    }

    function createCorner() {
        const div = document.createElement('div');
        div.className = 'doppelblock-corner';
        return div;
    }

    function createClueCell(pos, idx) {
        const div = document.createElement('div');
        div.className = 'doppelblock-cell clue doppelblock-clue';
        div.dataset.pos = pos;
        div.dataset.idx = idx;
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 2;
        if (window.doppelblockClues[pos][idx] !== null) {
            input.value = window.doppelblockClues[pos][idx];
        }
        input.onchange = (e) => {
            const val = e.target.value.trim();
            window.doppelblockClues[pos][idx] = val === '' || isNaN(val) ? null : parseInt(val);
        };
        div.appendChild(input);
        return div;
    }

    function createGridCell(r, c) {
        const div = document.createElement('div');
        div.className = 'doppelblock-cell';
        const cellState = window.doppelblockState[r][c];
        
        if (cellState.type === 'black') {
            div.classList.add('black');
        } else if (cellState.type === 'number') {
            div.textContent = cellState.value;
        }

        div.onclick = function() {
            if (window.doppelblockSolutions && window.doppelblockSolutions.length > 0) return;
            if (cellState.type === 'empty') {
                window.doppelblockState[r][c] = {type: 'black', value: null};
            } else if (cellState.type === 'black') {
                window.doppelblockState[r][c] = {type: 'number', value: 1};
            } else if (cellState.type === 'number') {
                if (cellState.value < currentN - 2) {
                    window.doppelblockState[r][c] = {type: 'number', value: cellState.value + 1};
                } else {
                    window.doppelblockState[r][c] = {type: 'empty', value: null};
                }
            }
            renderDoppelblockGrid();
        };
        
        div.oncontextmenu = function(e) {
            e.preventDefault();
            if (window.doppelblockSolutions && window.doppelblockSolutions.length > 0) return;
            window.doppelblockState[r][c] = {type: 'empty', value: null};
            renderDoppelblockGrid();
        };

        return div;
    }

    window.solveDoppelblockPuzzle = function() {
        if (!window.solveDoppelblock) return;
        const startTime = performance.now();
        
        const puzzle = {
            size: currentN,
            grid: window.doppelblockState,
            clues: window.doppelblockClues
        };
        
        const solutions = window.solveDoppelblock(puzzle);
        const elapsed = performance.now() - startTime;
        
        document.getElementById('doppelblock-timeElapsed').textContent = LogicUI.formatElapsed(elapsed);
        document.getElementById('doppelblock-solutionsCount').textContent = solutions.length;
        
        if (solutions.length > 0) {
            window.doppelblockSolutions = solutions;
            window.doppelblockCurrentSolIndex = 0;
            document.getElementById('doppelblock-solution-nav').style.display = 'flex';
            window.showDoppelblockSolution(0);
        }
    };

    window.showDoppelblockSolution = function (delta) {
        const solutions = window.doppelblockSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.doppelblockCurrentSolIndex || 0;
        idx = ((idx + delta) % len + len) % len;
        window.doppelblockCurrentSolIndex = idx;

        const counter = document.getElementById('doppelblock-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;

        const sol = solutions[idx];
        const container = document.getElementById('doppelblock-grid-container');
        if (!container) return;

        for (let r = 0; r < currentN; r++) {
            for (let c = 0; c < currentN; c++) {
                const childIdx = (r + 1) * (currentN + 2) + c + 1;
                const div = container.children[childIdx];
                if (!div) continue;
                div.className = 'doppelblock-cell';
                div.textContent = '';
                if (sol[r][c] === 0) {
                    div.classList.add('black');
                } else {
                    div.textContent = sol[r][c];
                }
            }
        }
    };
})();
