window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('easyas-workspace', 'easyas-layout',
    // ── Left: Control Panel ──
    window.LogicUI.backButton('easyas-workspace') +
    window.LogicUI.title('Easyas 直观字母', { color: 'var(--neon-green)' }) +
    `
    <div class="grid-2">
        <label>尺寸 (N): <input type="number" id="easyas-rows" value="5" min="3" max="9" class="cyber-input" style="width:100%; border:none;"></label>
        <label>字母 (K): <input type="number" id="easyas-caps" value="3" min="1" max="8" class="cyber-input" style="width:100%; border:none;"></label>
    </div>
    <div style="margin-top: 10px;"></div>
    ` +
    window.LogicUI.actionGrid4([
        { label: '重置网格', onclick: 'window.initEasyasGrid && window.initEasyasGrid()' },
        { label: '计算核心分析', onclick: 'window.solveEasyasPuzzleUI && window.solveEasyasPuzzleUI()', id: 'easyas-solve-btn', glow: true },
        { label: '清空填涂', onclick: 'window.clearEasyasGrid && window.clearEasyasGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleEasyasExample && window.buildSimpleEasyasExample()' }
    ]) +
    window.LogicUI.statsPanel('easyas', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: 'var(--neon-green)' }) +
    window.LogicUI.solutionNav('easyas', 'window.showEasyasSolution', { accent: 'var(--neon-green)' }) +
    window.LogicUI.instructions([
        '在网格中填入字母，每行每列中的每个规定字母必须出现且仅出现一次',
        '网格外边缘的字母表示从该方向看过去，第一眼能看到的字母',
        '其余格子标记为 × 留空',
        '左键点击填涂字母，右键点击切换为 × 留空标志'
    ], { accent: 'var(--neon-green)', title: '系统法则' }),

    // ── Right: Grid Panel ──
    `<div id="easyas-grid-container"></div>`,

    // ── Style ──
    `
    #easyas-grid-container {
        display: grid;
        justify-content: center;
        align-content: center;
        gap: 2px;
        background: rgba(0, 0, 0, 0.5);
        padding: 5px;
        border: 2px solid var(--neon-green);
        border-radius: 8px;
        box-shadow: 0 0 15px rgba(0, 255, 0, 0.2);
    }
    
    .easyas-cell {
        background: rgba(0, 30, 0, 0.7);
        border: 1px solid rgba(0, 255, 0, 0.3);
        
        font-size: 20px;
        color: white;
        text-shadow: 0 0 5px var(--neon-green);
    }
    
    .easyas-grid-cell {}
    .easyas-grid-cell:hover {
        background: rgba(0, 255, 0, 0.2);
        box-shadow: inset 0 0 10px var(--neon-green);
    }
    .easyas-clue-cell {
        background: transparent;
        border: none;
        color: var(--neon-cyan);
        text-shadow: 0 0 5px var(--neon-cyan);
    }
    .easyas-clue-input {
        width: 100%;
        height: 100%;
        background: transparent;
        border: 1px dashed rgba(0,255,255,0.4);
        color: var(--neon-cyan);
        text-align: center;
        font-size: 20px;
        outline: none;
    }
    .easyas-clue-input:focus {
        border: 1px solid var(--neon-cyan);
        box-shadow: inset 0 0 5px var(--neon-cyan);
    }
    .easyas-corner-cell {
        background: transparent;
        border: none;
    }
    .easyas-empty-marker {
        color: rgba(255, 255, 255, 0.3);
        text-shadow: none;
        font-size: 16px;
    }
    .easyas-cell.editing {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid white;
        outline: none;
    }
    `
));

window.easyasCurrentSize = 5;
window.easyasLetters = 3;
window.easyasGridState = [];
window.easyasClues = { top: [], bottom: [], left: [], right: [] };

window.easyasIsShowingSolution = false;

window.initEasyasGrid = function () {
    const rowInput = document.getElementById('easyas-rows');
    const capInput = document.getElementById('easyas-caps');

    let size = rowInput ? parseInt(rowInput.value) : 5;
    let letters = capInput ? parseInt(capInput.value) : 3;

    if (isNaN(size) || size < 3) size = 3;
    if (size > 9) size = 9;

    if (isNaN(letters) || letters < 1) letters = 1;
    if (letters > size - 1) letters = size - 1; // Need at least 1 empty cell

    if (rowInput) rowInput.value = size;
    if (capInput) capInput.value = letters;

    window.easyasCurrentSize = size;
    window.easyasLetters = letters;
    window.easyasSolutions = [];
    window.easyasCurrentSolutionIndex = 0;
    window.easyasIsShowingSolution = false;

    window.easyasGridState = Array(size).fill().map(() =>
        Array(size).fill().map(() => ({ type: 'empty', value: null })));

    window.easyasClues = {
        top: Array(size).fill(null),
        bottom: Array(size).fill(null),
        left: Array(size).fill(null),
        right: Array(size).fill(null)
    };

    window.renderEasyasGrid();
};

window.clearEasyasGrid = function () {
    if (window.easyasIsShowingSolution) {
        window.easyasIsShowingSolution = false;
    }

    for (let r = 0; r < window.easyasCurrentSize; r++) {
        for (let c = 0; c < window.easyasCurrentSize; c++) {
            window.easyasGridState[r][c] = { type: 'empty', value: null };
        }
    }
    window.renderEasyasGrid();
};

window.renderEasyasGrid = function () {
    const container = document.getElementById('easyas-grid-container');
    if (!container) return;

    const size = window.easyasCurrentSize;
    container.innerHTML = '';
    const cellSize = (size > 7) ? 35 : 45;
    container.style.gridTemplateColumns = `${cellSize}px repeat(${size}, ${cellSize}px) ${cellSize}px`;
    container.style.gridTemplateRows = `${cellSize}px repeat(${size}, ${cellSize}px) ${cellSize}px`;

    const numToChar = (n) => String.fromCharCode(64 + n);

    const createCorner = () => {
        const div = document.createElement('div');
        div.className = 'easyas-cell easyas-corner-cell';
        container.appendChild(div);
    };

    const createClueCell = (pos, idx) => {
        const div = document.createElement('div');
        div.className = 'easyas-cell easyas-clue-cell';
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.className = 'easyas-clue-input';

        if (window.easyasClues[pos][idx] !== null) {
            input.value = window.easyasClues[pos][idx];
        }

        input.addEventListener('change', (e) => {
            let val = e.target.value.trim().toUpperCase();
            if (val && val.length === 1 && val >= 'A' && val <= numToChar(window.easyasLetters)) {
                window.easyasClues[pos][idx] = val;
                e.target.value = val;
            } else {
                window.easyasClues[pos][idx] = null;
                e.target.value = '';
            }
        });

        if (window.easyasIsShowingSolution) input.disabled = true;

        div.appendChild(input);
        container.appendChild(div);
    };

    const createGridCell = (r, c) => {
        const div = document.createElement('div');
        div.className = 'easyas-cell easyas-grid-cell';
        const state = window.easyasGridState[r][c];

        if (state.type === 'letter') {
            div.textContent = state.value;
        } else if (state.type === 'marker') {
            div.classList.add('easyas-empty-marker');
            div.textContent = '×';
        }

        // Setup Interactions
        div.addEventListener('click', function (e) {
            if (window.easyasIsShowingSolution) return;

            this.contentEditable = true;
            this.classList.add('editing');
            this.textContent = '';
            this.focus();

            const saveChar = (e) => {
                let val = e.target.textContent.trim().toUpperCase();
                if (val && val.length === 1 && val >= 'A' && val <= numToChar(window.easyasLetters)) {
                    window.easyasGridState[r][c] = { type: 'letter', value: val };
                } else {
                    window.easyasGridState[r][c] = { type: 'empty', value: null };
                }
                this.contentEditable = false;
                this.classList.remove('editing');
                window.renderEasyasGrid(); // Just re-render
            };

            this.addEventListener('blur', saveChar, { once: true });
            this.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                }
            });
        });

        div.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            if (window.easyasIsShowingSolution) return;

            const curr = window.easyasGridState[r][c];
            if (curr.type === 'marker') {
                window.easyasGridState[r][c] = { type: 'empty', value: null };
            } else if (curr.type === 'empty') {
                window.easyasGridState[r][c] = { type: 'marker', value: null };
            }
            window.renderEasyasGrid(); // Re-render to clear states gracefully
        });

        container.appendChild(div);
    };

    createCorner();
    for (let c = 0; c < size; c++) createClueCell('top', c);
    createCorner();

    for (let r = 0; r < size; r++) {
        createClueCell('left', r);
        for (let c = 0; c < size; c++) {
            createGridCell(r, c);
        }
        createClueCell('right', r);
    }

    createCorner();
    for (let c = 0; c < size; c++) createClueCell('bottom', c);
    createCorner();
};

window.solveEasyasPuzzleUI = function () {
    if (!window.solveEasyas) {
        const cEl = document.getElementById('easyas-solutionsCount');
        if (cEl) cEl.textContent = '模块未加载';
        return;
    }

    const puzzleCtx = {
        rows: window.easyasCurrentSize,
        letters: window.easyasLetters,
        clues: window.easyasClues,
        grid: window.easyasGridState
    };

    const cEl = document.getElementById('easyas-solutionsCount');
    const tEl = document.getElementById('easyas-timeElapsed');
    if (cEl) cEl.textContent = '计算中...';
    if (tEl) tEl.textContent = '...';

    setTimeout(() => {
        const t0 = performance.now();
        let res;
        try { res = window.solveEasyas(puzzleCtx); } catch (e) {
            if (cEl) cEl.textContent = '错误: ' + e.message;
            return;
        }
        const elapsed = LogicUI.formatElapsed(performance.now() - t0);
        if (tEl) tEl.textContent = elapsed;

        if (res && res.error) { if (cEl) cEl.textContent = res.error; return; }

        const solutions = (res && res.solutions) ? res.solutions
            : Array.isArray(res) ? res
                : window.easyasSolutions || [];
        window.easyasSolutions = solutions;
        window.easyasCurrentSolutionIndex = 0;

        if (res && res.timeout) {
            if (cEl) cEl.textContent = solutions.length + '+ (超时中断)';
        } else {
            if (cEl) cEl.textContent = solutions.length || '未找到解';
        }

        if (solutions.length > 0) {
            window.easyasIsShowingSolution = true;
            const nav = document.getElementById('easyas-solution-nav');
            if (nav) nav.style.display = 'flex';
            window.showEasyasSolution(0);
        }
    }, 20);
};

window.showEasyasSolution = function (delta) {
    const solutions = window.easyasSolutions;
    if (!solutions || !solutions.length) return;
    const len = solutions.length;
    let idx = window.easyasCurrentSolutionIndex || 0;
    idx = ((idx + delta) % len + len) % len;
    window.easyasCurrentSolutionIndex = idx;

    const counter = document.getElementById('easyas-solution-counter');
    if (counter) counter.textContent = `${idx + 1} / ${len}`;

    const sol = solutions[idx];
    const size = window.easyasCurrentSize;
    const numToChar = (n) => String.fromCharCode(64 + n);

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const val = sol[r][c];
            if (val > 0) {
                window.easyasGridState[r][c] = { type: 'letter', value: numToChar(val) };
            } else {
                window.easyasGridState[r][c] = { type: 'marker', value: null };
            }
        }
    }
    window.renderEasyasGrid();
};

window.buildSimpleEasyasExample = function () {
    const rowInput = document.getElementById('easyas-rows');
    const capInput = document.getElementById('easyas-caps');
    if (rowInput) rowInput.value = 5;
    if (capInput) capInput.value = 3;
    window.initEasyasGrid();

    // Example layout from typical 5x5 EasyAs (A,B,C)
    // clues
    window.easyasClues.top[0] = 'A';
    window.easyasClues.top[1] = 'B';
    window.easyasClues.top[4] = 'C';
    window.easyasClues.bottom[0] = 'C';
    window.easyasClues.bottom[1] = 'A';
    window.easyasClues.bottom[4] = 'B';
    window.easyasClues.left[0] = 'A';
    window.easyasClues.left[1] = 'B';
    window.easyasClues.left[4] = 'C';
    window.easyasClues.right[0] = 'C';
    window.easyasClues.right[1] = 'A';
    window.easyasClues.right[4] = 'B';

    window.renderEasyasGrid();
};
