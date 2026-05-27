window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('sudoku-workspace', 'sudoku-layout',
    // ── Left: Control Panel ──
    LogicUI.backButton('sudoku-workspace') +
    LogicUI.title('数独 求解器', { color: 'var(--neon-blue)' }) +
    LogicUI.actionGrid4([
        { label: '重置网格', onclick: 'window.initSudokuGrid && window.initSudokuGrid()' },
        { label: '计算核心分析', onclick: 'window.solveSudokuPuzzle && window.solveSudokuPuzzle()', id: 'sudoku-solve-btn', glow: true },
        { label: '清空填涂 / 返回上步', onclick: 'window.undoSudokuLastStep && window.undoSudokuLastStep()' },
        { label: '简单示例', onclick: 'window.buildSimpleSudokuExample && window.buildSimpleSudokuExample()' }
    ]) +
    `<div style="margin-bottom:1.5rem;padding:1rem;background:rgba(0,0,0,0.4);border-left:3px solid var(--neon-purple);border-radius:4px;">
        <h3 style="color:var(--neon-purple);margin-bottom:10px;font-size:1rem;">高级规则</h3>
        <button id="sudoku-diagonal-btn" class="cyber-button" style="width:100%;justify-content:center;border-color:rgba(255,255,255,0.2);" onclick="this.classList.toggle('active');this.style.borderColor=this.classList.contains('active')?'var(--neon-blue)':'rgba(255,255,255,0.2)';this.querySelector('.status').textContent=this.classList.contains('active')?'ON':'OFF';this.querySelector('.status').style.color=this.classList.contains('active')?'var(--neon-blue)':'#888';"><span class="cyber-button__tag">对角线约束 <span class="status" style="margin-left:10px;color:#888;font-weight:bold;">OFF</span></span></button>
    </div>` +
    LogicUI.statsPanel('sudoku', { countLabel: '找到解决方案', timeLabel: 'AI thinking耗时', accent: 'var(--neon-blue)' }) +
    `<div id="sudoku-result" style="margin-top:1rem;color:var(--neon-green);text-align:center;font-size:1.1rem;height:1.5rem;"></div>` +
    LogicUI.solutionNav('sudoku', 'showSudokuSolution', { accent: 'var(--neon-blue)' }) +
    LogicUI.instructions([
        '• <strong>点击网格</strong> 并使用键盘输入数字',
        '• <strong>对角线约束</strong>: 打开时，两条主对角线上也需满足1-9不重复的规则。'
    ], { accent: 'var(--neon-blue)', title: '操作说明' }),

    // ── Right: Grid Panel ──
    `<div class="logic-sudoku-grid" id="logic-sudoku-grid"></div>
    <div class="loading" id="logic-sudoku-loading" style="display:none;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10;place-items:center;"><div class="cyber-spinner"></div></div>`,

    // ── Style ──
    `.logic-sudoku-grid{width:100%;max-width:550px;display:grid;grid-template-columns:repeat(9,1fr);gap:1px;background:var(--neon-blue);padding:2px;border:2px solid var(--neon-blue);box-shadow:0 0 20px rgba(0,255,255,0.2);position:relative}
    .sudoku-cell{width:100%;height:auto;aspect-ratio:1;background:rgba(10,10,15,0.95);border:none;text-align:center;font-size:2.2rem;font-family:'Courier New',Courier,monospace;color:white;cursor:text;outline:none;transition:all .2s ease;padding:0;margin:0}
    .sudoku-cell:focus{background:rgba(0,255,255,0.15);box-shadow:inset 0 0 10px rgba(0,255,255,0.3)}
    .sudoku-cell.fixed{color:var(--neon-purple);font-weight:bold;background:rgba(255,0,255,0.08);text-shadow:0 0 8px rgba(255,0,255,0.5)}
    .sudoku-cell:nth-child(3n){border-right:2px solid var(--neon-blue)}
    .sudoku-cell:nth-child(9n){border-right:none}
    .sudoku-cell:nth-child(n+19):nth-child(-n+27),.sudoku-cell:nth-child(n+46):nth-child(-n+54){border-bottom:2px solid var(--neon-blue)}
    #sudoku-diagonal-btn.active{box-shadow:0 0 15px rgba(0,255,255,0.4);background:rgba(0,255,255,0.1)}`
));

// JS integration logic for the UI
(function () {
    let sudokuHistoryStack = [];
    window.sudokuSolutions = [];
    window.sudokuCurrentSolIndex = 0;

    window.initSudokuGrid = function () {
        saveSudokuCurrentState();

        const container = document.getElementById('logic-sudoku-grid');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('input');
            cell.type = 'text';
            cell.maxLength = 1;
            cell.className = 'sudoku-cell';
            cell.addEventListener('input', e => {
                const value = e.target.value.replace(/[^1-9]/g, '');
                e.target.value = value;
                if (value) e.target.classList.add('fixed');
                else e.target.classList.remove('fixed');
            });
            container.appendChild(cell);
        }

        window.sudokuSolutions = [];
        window.sudokuCurrentSolIndex = 0;
        const navDiv = document.getElementById('sudoku-solution-nav');
        if (navDiv) navDiv.style.display = 'none';
        const resultDiv = document.getElementById('sudoku-result');
        if (resultDiv) resultDiv.innerHTML = '';
    };

    function saveSudokuCurrentState() {
        const cells = document.querySelectorAll('.sudoku-cell');
        if (cells.length === 0) return;
        const state = Array.from(cells).map(cell => ({
            text: cell.value.trim(),
            isFixed: cell.classList.contains('fixed')
        }));
        sudokuHistoryStack.push(state);
    }

    window.undoSudokuLastStep = function () {
        if (sudokuHistoryStack.length === 0) {
            // Nothing to undo, just clear grid
            window.initSudokuGrid();
            sudokuHistoryStack = [];
            return;
        }

        const lastState = sudokuHistoryStack.pop();
        const cells = document.querySelectorAll('.sudoku-cell');
        lastState.forEach((state, index) => {
            if (cells[index]) {
                cells[index].value = state.text;
                state.isFixed ? cells[index].classList.add('fixed') : cells[index].classList.remove('fixed');
                cells[index].style.color = ''; // clear green solution color
            }
        });

        window.sudokuSolutions = [];
        window.sudokuCurrentSolIndex = 0;
        const navDiv = document.getElementById('sudoku-solution-nav');
        const resultDiv = document.getElementById('sudoku-result');
        if (navDiv) navDiv.style.display = 'none';
        if (resultDiv) resultDiv.innerHTML = '';
    };

    window.solveSudokuPuzzle = function () {
        if (!window.solveSudoku) return;
        saveSudokuCurrentState();

        const loading = document.getElementById('logic-sudoku-loading');
        if (loading) loading.style.display = 'grid';

        // allow UI update
        setTimeout(() => {
            try {
                const diagonalBtn = document.getElementById('sudoku-diagonal-btn');
                const diagonalConstraint = diagonalBtn ? diagonalBtn.classList.contains('active') : false;

                const cells = Array.from(document.querySelectorAll('.sudoku-cell'));
                const clues = {};
                let n = 9;

                cells.forEach((cell, index) => {
                    const r = Math.floor(index / n);
                    const c = index % n;
                    const val = parseInt(cell.value.trim(), 10);
                    if (!isNaN(val) && val > 0 && val <= 9) {
                        clues[`${r},${c}`] = val;
                    }
                });

                const puzzle = {
                    size: n,
                    clues: clues,
                    params: { Diagonal: diagonalConstraint }
                };

                const startTime = performance.now();
                const solutions = window.solveSudoku(puzzle);
                const elapsed = performance.now() - startTime;

                const resultDiv = document.getElementById('sudoku-result');
                const navDiv = document.getElementById('sudoku-solution-nav');

                if (solutions.length > 0) {
                    window.sudokuSolutions = solutions;
                    window.sudokuCurrentSolIndex = 0;

                    if (navDiv) navDiv.style.display = 'flex';

                    const timeSpan = document.getElementById('sudoku-timeElapsed');
                    if (timeSpan) timeSpan.textContent = Math.round(elapsed);

                    const solCountSpan = document.getElementById('sudoku-solutionsCount');
                    if (solCountSpan) solCountSpan.textContent = solutions.length;

                    if (resultDiv) resultDiv.innerHTML = '';

                    window.showSudokuSolution(0);
                } else {
                    if (resultDiv) resultDiv.innerHTML = '<span style="color: #ff5555;">无解！请检查输入约束冲突。</span>';
                    if (navDiv) navDiv.style.display = 'none';
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (loading) loading.style.display = 'none';
            }
        }, 50);
    };

    window.showSudokuSolution = function (delta) {
        if (!window.sudokuSolutions || window.sudokuSolutions.length === 0) return;
        window.sudokuCurrentSolIndex = (window.sudokuCurrentSolIndex + delta + window.sudokuSolutions.length) % window.sudokuSolutions.length;

        const solution = window.sudokuSolutions[window.sudokuCurrentSolIndex];
        const cells = document.querySelectorAll('.sudoku-cell');

        cells.forEach((cell, index) => {
            if (!cell.classList.contains('fixed')) {
                cell.value = '';
                cell.style.color = '';
            }
        });

        cells.forEach((cell, index) => {
            const i = Math.floor(index / 9);
            const j = index % 9;
            if (!cell.classList.contains('fixed')) {
                cell.value = solution[i][j];
                cell.style.color = 'var(--neon-green)';
            }
        });

        const counterDiv = document.getElementById('sudoku-solution-counter');
        if (counterDiv) counterDiv.textContent = (window.sudokuCurrentSolIndex + 1) + ' / ' + window.sudokuSolutions.length;
    };
})();
