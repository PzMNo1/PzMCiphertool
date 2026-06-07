window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('balanceloop-workspace', 'balanceloop-layout',
    // ── Left ──
    LogicUI.backButton('balanceloop-workspace') +
    LogicUI.title('BALANCELOOP', { color: 'var(--neon-blue)' }) +
    LogicUI.sizeInputs('bl-rows', 'bl-cols', { rowVal: 8, colVal: 8, rowMin: 2, colMin: 2 }) +
    LogicUI.actionGrid4([
        { label: '生成网格', onclick: 'window.initBalanceloopGrid && window.initBalanceloopGrid()' },
        { label: '计算核心分析', onclick: 'window.solveBalanceloopPuzzle && window.solveBalanceloopPuzzle()', id: 'bl-solve-btn', glow: true },
        { label: '重置清理', onclick: 'window.clearBalanceloopGrid && window.clearBalanceloopGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleBalanceloopExample && window.buildSimpleBalanceloopExample()' }
    ]) +
    `<div class="mode-switcher" style="margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:8px;">
        <button id="bl-mode-clue_white" class="cyber-button active" style="padding:2px 8px;flex:1;min-width:80px;" onclick="window.setBalanceloopMode && window.setBalanceloopMode('clue_white')"><span class="cyber-button__tag">⚪ 白圆</span></button>
        <button id="bl-mode-clue_black" class="cyber-button" style="padding:2px 8px;flex:1;min-width:80px;" onclick="window.setBalanceloopMode && window.setBalanceloopMode('clue_black')"><span class="cyber-button__tag">⚫ 黑圆</span></button>
        <button id="bl-mode-line" class="cyber-button" style="padding:2px 8px;flex:1;min-width:80px;" onclick="window.setBalanceloopMode && window.setBalanceloopMode('line')"><span class="cyber-button__tag">✏️ 线条</span></button>
        <button id="bl-mode-clear" class="cyber-button" style="padding:2px 8px;flex:1;min-width:80px;" onclick="window.setBalanceloopMode && window.setBalanceloopMode('clear')"><span class="cyber-button__tag">❌ 橡皮</span></button>
    </div>` +
    LogicUI.statsPanel('bl', { countLabel: '找到解决方案', timeLabel: 'AI thinking耗时', accent: 'var(--neon-blue)' }) +
    LogicUI.solutionNav('bl', 'showBalanceloopSolution', { accent: 'var(--neon-blue)' }) +
    LogicUI.instructions([
        '• <strong>点击格子</strong>: 放置线索圆圈 (白/黑)，放置后直接按键盘数字设值',
        '• <strong>再次点击已有圆圈</strong>: 选中后用键盘修改数字；Backspace 清数字',
        '• 白圆需线段两端延伸不等长；黑圆需线段两端延伸等等长。数字即为它两端延伸直线块总和。',
        '• 线条只能形成一条闭合回路！'
    ], { accent: 'var(--neon-purple)', title: '操作说明' }),

    // ── Right ──
    `<div id="balanceloop-grid-container"></div>`,

    // ── Style ──
    `#balanceloop-grid-container{--bl-cell-size:50px;display:grid;gap:1px;background:var(--neon-blue);padding:2px;border:2px solid var(--neon-blue);box-shadow:0 0 20px rgba(0,255,255,0.2);border-radius:8px;width:fit-content;margin:0 auto}
    .bl-cell{width:var(--bl-cell-size);height:var(--bl-cell-size);background:rgba(10,10,15,0.95);}
    .bl-cell:hover{background:rgba(0,255,255,0.15);box-shadow:inset 0 0 10px rgba(0,255,255,0.3)}
    .bl-clue{width:70%;height:70%;border-radius:50%;display:flex;justify-content:center;align-items:center;font-family:inherit;font-weight:bold;font-size:1.2rem;z-index:5;transition:box-shadow 0.2s ease}
    .bl-clue.white{background-color:white;color:black;box-shadow:0 0 10px rgba(255,255,255,0.8);border:1px solid #aaa}
    .bl-clue.black{background-color:black;color:white;box-shadow:0 0 10px rgba(0,0,0,0.8);border:2px solid rgba(255,255,255,0.2)}
    .bl-clue.selected{box-shadow:0 0 18px var(--neon-cyan,#00e5ff),0 0 6px var(--neon-cyan,#00e5ff) inset!important;outline:2px solid var(--neon-cyan,#00e5ff);animation:bl-pulse .8s ease-in-out infinite alternate}
    @keyframes bl-pulse{0%{box-shadow:0 0 12px var(--neon-cyan,#00e5ff)}100%{box-shadow:0 0 22px var(--neon-cyan,#00e5ff),0 0 8px var(--neon-cyan,#00e5ff) inset}}
    .bl-line-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2}
    .bl-line{fill:none;stroke:var(--neon-purple,#cc00ff);stroke-width:15;stroke-linecap:square}`
));

(function () {
    let balanceloopRows = 8;
    let balanceloopCols = 8;
    let balanceloopGrid = [];

    let balanceloopCurrentMode = 'clue_white';
    window.balanceloopSolutions = [];
    window.balanceloopCurrentSolIndex = 0;

    // Track the currently selected clue cell for inline keyboard editing
    let selectedClueCell = null; // { r, c }

    function updateStats(count, time) {
        const cEl = document.getElementById('bl-solutionsCount');
        const tEl = document.getElementById('bl-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    function resetPuzzle() {
        window.balanceloopSolutions = [];
        window.balanceloopCurrentSolIndex = 0;
        const nav = document.getElementById('bl-solution-nav');
        if (nav) nav.style.display = 'none';
        updateStats('0', '0');
    }

    function deselectClue() {
        if (!selectedClueCell) return;
        selectedClueCell = null;
        const prev = document.querySelector('.bl-clue.selected');
        if (prev) prev.classList.remove('selected');
    }

    function selectClue(r, c) {
        deselectClue();
        selectedClueCell = { r, c };
        const gridContainer = document.getElementById('balanceloop-grid-container');
        if (!gridContainer) return;
        const cell = gridContainer.querySelector(`.bl-cell[data-r="${r}"][data-c="${c}"] .bl-clue`);
        if (cell) cell.classList.add('selected');
    }

    // Global keyboard handler for inline clue number editing
    document.addEventListener('keydown', function (e) {
        if (window.LogicUI?.shouldIgnoreGlobalKeydown?.(e, 'balanceloop-workspace')) return;
        if (!selectedClueCell) return;
        const { r, c } = selectedClueCell;
        const clue = balanceloopGrid[r] && balanceloopGrid[r][c] && balanceloopGrid[r][c].clue;
        if (!clue) { deselectClue(); return; }

        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            const current = clue.val !== null ? String(clue.val) : '';
            const next = current + e.key;
            clue.val = parseInt(next.slice(-2)); // max 2 digits
            updateClueDisplay(r, c);
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            if (clue.val !== null) {
                const s = String(clue.val);
                if (s.length > 1) {
                    clue.val = parseInt(s.slice(0, -1));
                } else {
                    clue.val = null;
                }
                updateClueDisplay(r, c);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            deselectClue();
        }
    });

    // Update just the clue text without full re-render
    function updateClueDisplay(r, c) {
        const gridContainer = document.getElementById('balanceloop-grid-container');
        if (!gridContainer) return;
        const clueEl = gridContainer.querySelector(`.bl-cell[data-r="${r}"][data-c="${c}"] .bl-clue`);
        if (!clueEl) return;
        const clue = balanceloopGrid[r][c].clue;
        clueEl.textContent = clue && clue.val !== null ? clue.val : '';
    }

    const SHAPES = {
        0: { u: 0, r: 0, d: 0, l: 0, name: '' },
        1: { u: 1, r: 0, d: 1, l: 0, name: '│' },
        2: { u: 0, r: 1, d: 0, l: 1, name: '─' },
        3: { u: 1, r: 1, d: 0, l: 0, name: '└' },
        4: { u: 1, r: 0, d: 0, l: 1, name: '┘' },
        5: { u: 0, r: 0, d: 1, l: 1, name: '┐' },
        6: { u: 0, r: 1, d: 1, l: 0, name: '┌' }
    };

    window.initBalanceloopGrid = function () {
        const rIn = document.getElementById('bl-rows');
        const cIn = document.getElementById('bl-cols');
        balanceloopRows = rIn ? parseInt(rIn.value) : 8;
        balanceloopCols = cIn ? parseInt(cIn.value) : 8;
        if (balanceloopRows < 2 || balanceloopRows > 15) balanceloopRows = 8;
        if (balanceloopCols < 2 || balanceloopCols > 15) balanceloopCols = 8;

        balanceloopGrid = Array(balanceloopRows).fill(null).map(() =>
            Array(balanceloopCols).fill(null).map(() => ({ type: 0, clue: null }))
        );

        deselectClue();
        resetPuzzle();
        renderBalanceloopGrid();
    };

    window.setBalanceloopMode = function (mode) {
        balanceloopCurrentMode = mode;
        deselectClue();
        const b0 = document.getElementById('bl-mode-clue_white');
        const b1 = document.getElementById('bl-mode-clue_black');
        const b2 = document.getElementById('bl-mode-line');
        const b3 = document.getElementById('bl-mode-clear');

        if (b0) b0.classList.toggle('active', mode === 'clue_white');
        if (b1) b1.classList.toggle('active', mode === 'clue_black');
        if (b2) b2.classList.toggle('active', mode === 'line');
        if (b3) b3.classList.toggle('active', mode === 'clear');
    };

    function renderBalanceloopGrid() {
        const gridContainer = document.getElementById('balanceloop-grid-container');
        if (!gridContainer) return;

        gridContainer.innerHTML = '';
        gridContainer.style.gridTemplateColumns = `repeat(${balanceloopCols}, var(--bl-cell-size))`;
        gridContainer.style.gridTemplateRows = `repeat(${balanceloopRows}, var(--bl-cell-size))`;

        for (let r = 0; r < balanceloopRows; r++) {
            for (let c = 0; c < balanceloopCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'bl-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.onclick = () => window.handleBalanceloopCellClick && window.handleBalanceloopCellClick(r, c);
                cell.oncontextmenu = (e) => {
                    e.preventDefault();
                    balanceloopGrid[r][c].type = 0;
                    balanceloopGrid[r][c].clue = null;
                    deselectClue();
                    renderBalanceloopGrid();
                };

                // Draw Clue
                if (balanceloopGrid[r][c].clue) {
                    const clueDiv = document.createElement('div');
                    const isSelected = selectedClueCell && selectedClueCell.r === r && selectedClueCell.c === c;
                    clueDiv.className = `bl-clue ${balanceloopGrid[r][c].clue.color === 'w' ? 'white' : 'black'}${isSelected ? ' selected' : ''}`;
                    if (balanceloopGrid[r][c].clue.val !== null) {
                        clueDiv.textContent = balanceloopGrid[r][c].clue.val;
                    }
                    cell.appendChild(clueDiv);
                }

                // Draw Line
                const type = balanceloopGrid[r][c].type;
                if (type > 0) {
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.classList.add('bl-line-svg');
                    svg.setAttribute('viewBox', '0 0 100 100');

                    let pathD = "";
                    const s = SHAPES[type];
                    const mid = 50;

                    if (s.u) pathD += `M${mid},${mid} L${mid},0 `;
                    if (s.r) pathD += `M${mid},${mid} L100,${mid} `;
                    if (s.d) pathD += `M${mid},${mid} L${mid},100 `;
                    if (s.l) pathD += `M${mid},${mid} L0,${mid} `;

                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute('d', pathD);
                    path.classList.add('bl-line');
                    svg.appendChild(path);
                    cell.appendChild(svg);
                }

                gridContainer.appendChild(cell);
            }
        }
    }

    window.handleBalanceloopCellClick = function (r, c) {
        if (balanceloopCurrentMode.startsWith('clue')) {
            const color = balanceloopCurrentMode === 'clue_white' ? 'w' : 'b';
            if (!balanceloopGrid[r][c].clue) {
                // First click: place the clue and select for keyboard input
                balanceloopGrid[r][c].clue = { color: color, val: null };
                renderBalanceloopGrid();
                selectClue(r, c);
            } else if (balanceloopGrid[r][c].clue.color === color) {
                // Same-color clue: toggle selection
                if (selectedClueCell && selectedClueCell.r === r && selectedClueCell.c === c) {
                    deselectClue();
                } else {
                    selectClue(r, c);
                }
            } else {
                // Different color: switch and select
                balanceloopGrid[r][c].clue.color = color;
                renderBalanceloopGrid();
                selectClue(r, c);
            }
        } else if (balanceloopCurrentMode === 'line') {
            deselectClue();
            balanceloopGrid[r][c].type = (balanceloopGrid[r][c].type + 1) % 7;
            renderBalanceloopGrid();
        } else if (balanceloopCurrentMode === 'clear') {
            deselectClue();
            balanceloopGrid[r][c].type = 0;
            balanceloopGrid[r][c].clue = null;
            renderBalanceloopGrid();
        }
    };

    window.solveBalanceloopPuzzle = function () {
        if (!window.solveBalanceloop) { updateStats('模块未加载', '-'); return; }

        // Wipe previous solution types before passing grid format
        for (let r = 0; r < balanceloopRows; r++) {
            for (let c = 0; c < balanceloopCols; c++) {
                balanceloopGrid[r][c].type = 0;
            }
        }

        const puzzleCtx = {
            rows: balanceloopRows,
            cols: balanceloopCols,
            grid: balanceloopGrid.map(row => row.map(cell => ({ ...cell })))
        };

        updateStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveBalanceloop(puzzleCtx); } catch (e) {
                updateStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = LogicUI.formatElapsed(performance.now() - t0);

            if (res && res.error) { updateStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : [];
            window.balanceloopSolutions = solutions;
            window.balanceloopCurrentSolIndex = 0;

            if (res && res.timeout) {
                updateStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = document.getElementById('bl-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showBalanceloopSolution(0);
            }
        }, 20);
    };

    function applyBalanceloopSolution(index) {
        if (!window.balanceloopSolutions || !window.balanceloopSolutions[index]) return;
        const sol = window.balanceloopSolutions[index];
        for (let r = 0; r < balanceloopRows; r++) {
            for (let c = 0; c < balanceloopCols; c++) {
                balanceloopGrid[r][c].type = sol[r][c];
            }
        }
        renderBalanceloopGrid();
    }

    window.showBalanceloopSolution = function (delta) {
        const solutions = window.balanceloopSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.balanceloopCurrentSolIndex || 0;
        idx = ((idx + delta) % len + len) % len;
        window.balanceloopCurrentSolIndex = idx;
        const counter = document.getElementById('bl-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;

        applyBalanceloopSolution(idx);
    };

    window.clearBalanceloopGrid = function () {
        window.initBalanceloopGrid();
    };

    window.buildSimpleBalanceloopExample = function () {
        const rIn = document.getElementById('bl-rows');
        const cIn = document.getElementById('bl-cols');
        if (rIn) rIn.value = 4;
        if (cIn) cIn.value = 4;
        window.initBalanceloopGrid();

        balanceloopGrid[0][0].clue = { color: 'b', val: null };
        balanceloopGrid[0][1].clue = { color: 'w', val: 3 };

        renderBalanceloopGrid();
    };
})();
