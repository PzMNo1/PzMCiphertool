window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('aquapelago-workspace', 'aquapelago-layout',
    // ── Left ──
    LogicUI.backButton('aquapelago-workspace') +
    LogicUI.title('Aquapelago', { color: 'var(--neon-blue)' }) +
    LogicUI.singleSizeInput('aq-size', { val: 8, placeholder: '谜题大小 (默认8)', max: 20 }) +
    LogicUI.actionGrid4([
        { label: '生成网格', onclick: 'window.initAquapelagoGrid && window.initAquapelagoGrid()' },
        { label: '计算核心分析', onclick: 'window.startAquapelagoSolve && window.startAquapelagoSolve()', glow: true },
        { label: '重置清理', onclick: 'window.clearAquapelagoGrid && window.clearAquapelagoGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleAquapelagoExample && window.buildSimpleAquapelagoExample()' }
    ]) +
    LogicUI.statsPanel('aquapelago', { countLabel: '找到解决方案', timeLabel: '耗时', accent: 'var(--neon-blue)' }) +
    LogicUI.solutionNav('aquapelago', 'showAquapelagoSolution', { accent: 'var(--neon-blue)' }) +
    LogicUI.instructions([
        '• <strong>点击网格</strong>即可使用键盘输入数字',
        '• <strong>右键点击格子</strong>: 可将格子人为切换为固定岛屿阴影块（排除预测，多用于草稿）',
        '• <strong>规则</strong>: 阴影部分不得呈十字连通，而非阴影(水)必须互相连通且不得出现2x2的水域。',
        '• <strong>数字</strong>: 表示此数字所在的阴影组合必定斜向连通，其数字等同该斜向区块拥有几个阴影。'
    ], { accent: 'var(--neon-purple)', title: '操作说明' }),

    // ── Right ──
    `<div id="logic-aquapelago-grid"></div>
    <div class="loading" id="logic-aquapelago-loading" style="display:none;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10;place-items:center;"><div class="cyber-spinner"></div></div>`,

    // ── Style ──
    `#logic-aquapelago-grid{width:100%;max-width:550px;display:grid;gap:2px;background:var(--neon-blue);padding:4px;border:2px solid var(--neon-blue);box-shadow:0 0 20px rgba(0,255,255,0.2);border-radius:8px;position:relative}
    .aquapelago-cell{width:100%;height:auto;aspect-ratio:1;background:rgba(10,10,15,0.95);border:none;text-align:center;font-size:2rem;color:white;cursor:text;outline:none;padding:0;margin:0;}
    .aquapelago-cell:focus{background:rgba(0,255,255,0.15);box-shadow:inset 0 0 10px rgba(0,255,255,0.3)}
    .aquapelago-cell.shaded{background:rgba(0,0,0,0.8);box-shadow:inset 0 0 10px rgba(0,0,0,1)}
    .aquapelago-cell.clue{color:var(--neon-purple);font-weight:bold;background:rgba(255,0,255,0.05);text-shadow:0 0 8px rgba(255,0,255,0.5)}
    .aquapelago-cell.solution-shaded{background:rgba(0,255,255,0.5);box-shadow:inset 0 0 15px rgba(0,255,255,0.8)}`
));

(function () {
    let currentGrid = [];
    let gridSize = 8;
    window.aquapelagoSolutions = [];
    window.aquapelagoCurrentSolIndex = 0;

    function updateStats(count, time) {
        const cEl = document.getElementById('aquapelago-solutionsCount');
        const tEl = document.getElementById('aquapelago-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    function resetPuzzle() {
        window.aquapelagoSolutions = [];
        window.aquapelagoCurrentSolIndex = 0;
        const nav = document.getElementById('aquapelago-solution-nav');
        if (nav) nav.style.display = 'none';
        updateStats('0', '0');
    }

    window.initAquapelagoGrid = function () {
        gridSize = parseInt(document.getElementById('aq-size') ? document.getElementById('aq-size').value : 8) || 8;
        gridSize = Math.max(3, Math.min(20, gridSize));

        const gridElement = document.getElementById('logic-aquapelago-grid');
        if (!gridElement) return;

        gridElement.innerHTML = '';
        gridElement.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

        currentGrid = Array(gridSize).fill().map(() =>
            Array(gridSize).fill(null).map(() => ({ type: 'empty', value: null }))
        );
        resetPuzzle();

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('input');
                cell.type = 'text';
                cell.maxLength = 2; // clues might be up to gridSize*gridSize
                cell.className = 'aquapelago-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;

                cell.addEventListener('contextmenu', function (e) {
                    e.preventDefault();
                    toggleAquapelagoCellState(i, j, this);
                });

                cell.addEventListener('input', function (e) {
                    handleAquapelagoCellInput(i, j, this.value, this);
                });

                gridElement.appendChild(cell);
            }
        }
    };

    function toggleAquapelagoCellState(row, col, el) {
        const cell = currentGrid[row][col];
        if (cell.type === 'empty') {
            currentGrid[row][col] = { type: 'shaded', value: null };
        } else if (cell.type === 'shaded') {
            currentGrid[row][col] = { type: 'empty', value: null };
        } else if (cell.type === 'clue') {
            currentGrid[row][col] = { type: 'empty', value: null };
        }
        updateAquapelagoCellDisplay(row, col, el);
    }

    function handleAquapelagoCellInput(row, col, text, el) {
        const cleanText = text.replace(/[^0-9]/g, '');
        el.value = cleanText;
        const value = cleanText ? parseInt(cleanText) : null;

        if (value && value > 0 && value <= gridSize * gridSize) {
            currentGrid[row][col] = { type: 'clue', value: value };
        } else {
            currentGrid[row][col] = { type: 'empty', value: null };
        }
        updateAquapelagoCellDisplay(row, col, el);
    }

    function updateAquapelagoCellDisplay(row, col, el) {
        const cellData = currentGrid[row][col];
        el.className = 'aquapelago-cell';

        if (cellData.type === 'shaded') {
            el.classList.add('shaded');
            el.value = '';
        } else if (cellData.type === 'clue') {
            el.classList.add('clue');
            el.value = cellData.value;
        } else if (cellData.type === 'solution-shaded') {
            el.classList.add('solution-shaded');
            el.value = '';
        }
    }

    window.clearAquapelagoGrid = function () {
        window.initAquapelagoGrid();
    };

    window.buildSimpleAquapelagoExample = function () {
        if (document.getElementById('aq-size')) document.getElementById('aq-size').value = 5;
        window.initAquapelagoGrid();
        const cells = document.querySelectorAll('.aquapelago-cell');

        const ex = [
            [0, 0, 1],
            [2, 3, 6],
            [4, 4, 1]
        ];
        ex.forEach(item => {
            const r = item[0], c = item[1], val = item[2];
            currentGrid[r][c] = { type: 'clue', value: val };
            const el = cells[r * gridSize + c];
            if (el) {
                el.value = val;
                updateAquapelagoCellDisplay(r, c, el);
            }
        });
    };

    function displayAquapelagoSolution(index) {
        if (!window.aquapelagoSolutions || window.aquapelagoSolutions.length === 0) return;

        const solution = window.aquapelagoSolutions[index];
        const cells = document.querySelectorAll('.aquapelago-cell');

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cellIndex = i * gridSize + j;
                const el = cells[cellIndex];
                if (!el) continue;

                if (currentGrid[i][j].type === 'clue') {
                    el.className = 'aquapelago-cell clue';
                    el.value = currentGrid[i][j].value;
                } else if (currentGrid[i][j].type === 'shaded') {
                    el.className = 'aquapelago-cell shaded';
                    el.value = '';
                } else if (solution[i][j] === 1) {
                    el.className = 'aquapelago-cell solution-shaded';
                    el.value = '';
                } else {
                    el.className = 'aquapelago-cell';
                    el.value = '';
                }
            }
        }
    }

    window.showAquapelagoSolution = function (delta) {
        const solutions = window.aquapelagoSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.aquapelagoCurrentSolIndex || 0;
        idx = ((idx + delta) % len + len) % len;
        window.aquapelagoCurrentSolIndex = idx;
        const counter = document.getElementById('aquapelago-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;

        displayAquapelagoSolution(idx);
    };

    window.startAquapelagoSolve = function () {
        if (!window.solveAquapelago) return;

        const loading = document.getElementById('logic-aquapelago-loading');
        if (loading) loading.style.display = 'grid';

        const start = performance.now();

        setTimeout(() => {
            try {
                const clues = {};
                const shadedBlocks = {};
                for (let i = 0; i < gridSize; i++) {
                    for (let j = 0; j < gridSize; j++) {
                        const c = currentGrid[i][j];
                        if (c.type === 'clue' && c.value) {
                            clues[`${i},${j}`] = c.value;
                        } else if (c.type === 'shaded') {
                            shadedBlocks[`${i},${j}`] = 1;
                        }
                    }
                }

                const puzzle = {
                    rows: gridSize,
                    cols: gridSize,
                    clues: clues,
                    shadedBlocks: shadedBlocks
                };

                window.aquapelagoSolutions = window.solveAquapelago(puzzle);

                const countEl = document.getElementById('aquapelago-solutionsCount');
                if (window.aquapelagoSolutions.length > 0) {
                    if (countEl) countEl.textContent = window.aquapelagoSolutions.length;
                    window.aquapelagoCurrentSolIndex = 0;
                    displayAquapelagoSolution(0);
                    if (document.getElementById('aquapelago-solution-nav')) {
                        document.getElementById('aquapelago-solution-nav').style.display = window.aquapelagoSolutions.length > 1 ? 'flex' : 'none';
                    }
                    if (document.getElementById('aquapelago-solution-counter')) {
                        document.getElementById('aquapelago-solution-counter').textContent = '1 / ' + window.aquapelagoSolutions.length;
                    }
                } else {
                    if (countEl) countEl.textContent = '无有效解';
                    if (document.getElementById('aquapelago-solution-nav')) {
                        document.getElementById('aquapelago-solution-nav').style.display = 'none';
                    }
                }
                if (document.getElementById('aquapelago-timeElapsed')) {
                    document.getElementById('aquapelago-timeElapsed').textContent = Math.round(performance.now() - start);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (loading) loading.style.display = 'none';
            }
        }, 50);
    };
})();
