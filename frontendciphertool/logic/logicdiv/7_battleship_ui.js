window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('battleship-workspace', 'battleship-layout',
    // ── Left ──
    LogicUI.backButton('battleship-workspace') +
    LogicUI.title('BATTLESHIP 海战棋', { color: 'var(--neon-blue)' }) +
    LogicUI.singleSizeInput('bs-size', { val: 10, placeholder: '通常为10x10', max: 15 }) +
    LogicUI.actionGrid4([
        { label: '生成网格', onclick: 'window.initBattleshipGrid && window.initBattleshipGrid()' },
        { label: '计算核心分析', onclick: 'window.solveBattleshipPuzzle && window.solveBattleshipPuzzle()', id: 'bs-solve-btn', glow: true },
        { label: '重置清理', onclick: 'window.clearBattleshipGrid && window.clearBattleshipGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleBattleshipExample && window.buildSimpleBattleshipExample()' }
    ]) +
    `<div class="tool-selector" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 20px;">
        <button id="bs-tool-w" class="cyber-button tool-btn active cyber-glow" onclick="window.setBattleshipTool && window.setBattleshipTool('w')" style="flex:1; min-width:40px; padding:4px;" title="快捷键: 1"><span class="cyber-button__tag">1:🌊</span></button>
        <button id="bs-tool-o" class="cyber-button tool-btn" onclick="window.setBattleshipTool && window.setBattleshipTool('o')" style="flex:1; min-width:40px; padding:4px;" title="快捷键: 2"><span class="cyber-button__tag">2:○</span></button>
        <button id="bs-tool-t" class="cyber-button tool-btn" onclick="window.setBattleshipTool && window.setBattleshipTool('t')" style="flex:1; min-width:40px; padding:4px;" title="快捷键: 3"><span class="cyber-button__tag">3:↑</span></button>
        <button id="bs-tool-b" class="cyber-button tool-btn" onclick="window.setBattleshipTool && window.setBattleshipTool('b')" style="flex:1; min-width:40px; padding:4px;" title="快捷键: 4"><span class="cyber-button__tag">4:↓</span></button>
        <button id="bs-tool-l" class="cyber-button tool-btn" onclick="window.setBattleshipTool && window.setBattleshipTool('l')" style="flex:1; min-width:40px; padding:4px;" title="快捷键: 5"><span class="cyber-button__tag">5:←</span></button>
        <button id="bs-tool-r" class="cyber-button tool-btn" onclick="window.setBattleshipTool && window.setBattleshipTool('r')" style="flex:1; min-width:40px; padding:4px;" title="快捷键: 6"><span class="cyber-button__tag">6:→</span></button>
        <button id="bs-tool-m" class="cyber-button tool-btn" onclick="window.setBattleshipTool && window.setBattleshipTool('m')" style="flex:1; min-width:40px; padding:4px;" title="快捷键: 7"><span class="cyber-button__tag">7:■</span></button>
    </div>` +
    LogicUI.statsPanel('bs', { countLabel: '部署预案数', timeLabel: 'AI thinking耗时', accent: 'var(--neon-blue)' }) +
    LogicUI.solutionNav('bs', 'showBattleshipSolution', { accent: 'var(--neon-blue)' }) +
    LogicUI.instructions([
        '• <strong>舰队配置</strong>: 1艘战列舰(4), 2艘巡洋舰(3), 3艘驱逐舰(2), 4艘潜艇(1)',
        '• <strong>行列数字</strong>: 代表该行或该列出现的船只总格数。',
        '• <strong>放置规则</strong>: 任何两艘船只不能处于相邻格子（包括斜向相邻）！',
        '• <strong>快捷操作</strong>: 按键盘 1-7 快速切换标记工具。',
        '• <strong>连续点击</strong>: 如果点击同一个格子，会按顺序自动循环切换不同的船只部件标记！右键点击可以直接清除。'
    ], { accent: 'var(--neon-purple)', title: '战术法则' }),

    // ── Right ──
    `<div id="battleship-grid-container"></div>`,

    // ── Style ──
    `#battleship-grid-container{--bs-cell-size: 40px; display: grid; gap: 2px; padding: 15px; background: rgba(0,20,40,0.8); border: 2px solid var(--neon-blue); box-shadow: 0 0 15px rgba(0,255,255,0.3); border-radius: 8px; width: fit-content; margin: 0 auto; }
    .bs-cell{width: var(--bs-cell-size); height: var(--bs-cell-size); background: rgba(0,50,80,0.6);  cursor: crosshair;    border: 1px solid rgba(0,255,255,0.2);}
    .bs-cell:hover{background: rgba(0,255,255,0.2);}
    .bs-clue-outer{display: flex; justify-content: center; align-items: center;}
    .bs-input-outer{width: 85%; height: 85%; padding: 0; box-sizing: border-box; text-align: center; border: 1px solid var(--neon-purple); background: rgba(0,0,0,0.5); color: #00ffff; font-family: inherit; font-weight: bold; font-size: 1.2rem; outline: none; text-shadow: 0 0 5px #00ffff;}
    .bs-input-outer:focus{box-shadow: 0 0 5px var(--neon-purple);}
    .bs-clue{position: absolute; display: flex; justify-content: center; align-items: center; pointer-events: none;}
    .bs-marker-water{width: 60%; height: 60%; background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 13.5C4 13.5 5 12 7.5 12C10 12 11 13.5 12.5 13.5C14 13.5 15 12 17.5 12C20 12 21 13.5 22.5 13.5" stroke="cyan" stroke-width="2" fill="none"/></svg>') center/contain no-repeat; opacity: 0.7;}
    .bs-ship{background: #aaa; border: 2px solid #fff;}
    .bs-ship.circle{width: 80%; height: 80%; border-radius: 50%;}
    .bs-ship.top{width: 80%; height: 100%; border-top-left-radius: 20px; border-top-right-radius: 20px; border-bottom: none;}
    .bs-ship.bottom{width: 80%; height: 100%; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px; border-top: none;}
    .bs-ship.left{width: 100%; height: 80%; border-top-left-radius: 20px; border-bottom-left-radius: 20px; border-right: none;}
    .bs-ship.right{width: 100%; height: 80%; border-top-right-radius: 20px; border-bottom-right-radius: 20px; border-left: none;}
    .bs-ship.middle{width: 100%; height: 80%; border-left: none; border-right: none;}`
));

(function () {
    let battleshipRows = 10;
    let battleshipCols = 10;
    let battleshipRowClues = [];
    let battleshipColClues = [];
    let battleshipGridHints = [];

    const HINT_SYMBOLS = { 'w': '🌊', 'o': '○', 't': '↑', 'b': '↓', 'l': '←', 'r': '→', 'm': '■' };

    let battleshipCurrentTool = 'w';
    window.battleshipSolutions = [];
    window.battleshipCurrentSolIndex = 0;

    function updateStats(count, time) {
        const cEl = document.getElementById('bs-solutionsCount');
        const tEl = document.getElementById('bs-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    function resetPuzzle() {
        window.battleshipSolutions = [];
        window.battleshipCurrentSolIndex = 0;
        const nav = document.getElementById('bs-solution-nav');
        if (nav) nav.style.display = 'none';
        updateStats('0', '0');
    }

    window.initBattleshipGrid = function() {
        const szIn = document.getElementById('bs-size');
        const size = szIn ? parseInt(szIn.value) : 10;
        battleshipRows = size;
        battleshipCols = size;
        if (battleshipRows < 5 || battleshipRows > 15) battleshipRows = 10;
        if (battleshipCols < 5 || battleshipCols > 15) battleshipCols = 10;

        battleshipRowClues = Array(battleshipRows).fill(null);
        battleshipColClues = Array(battleshipCols).fill(null);
        battleshipGridHints = Array(battleshipRows).fill(0).map(() => Array(battleshipCols).fill(null));

        resetPuzzle();

        renderBattleshipGrid();
    };

    window.setBattleshipTool = function(tool) {
        battleshipCurrentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active', 'cyber-glow'));
        const activeBtn = document.getElementById(`bs-tool-${tool}`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'cyber-glow');
        }
    };

    function renderBattleshipGrid() {
        const gridContainer = document.getElementById('battleship-grid-container');
        if (!gridContainer) return;

        gridContainer.innerHTML = '';
        gridContainer.style.gridTemplateColumns = `var(--bs-cell-size) repeat(${battleshipCols}, var(--bs-cell-size))`;

        // 1. Top Row (Corner + Col Clues)
        const corner = document.createElement('div');
        gridContainer.appendChild(corner);

        for (let c = 0; c < battleshipCols; c++) {
            const div = document.createElement('div');
            div.className = 'bs-clue-outer';
            const input = document.createElement('input');
            input.className = 'bs-input-outer';
            input.value = battleshipColClues[c] === null ? '' : battleshipColClues[c];
            input.onchange = (e) => {
                const v = parseInt(e.target.value);
                battleshipColClues[c] = isNaN(v) ? null : v;
            };
            div.appendChild(input);
            gridContainer.appendChild(div);
        }

        // 2. Rows
        for (let r = 0; r < battleshipRows; r++) {
            const clueDiv = document.createElement('div');
            clueDiv.className = 'bs-clue-outer';
            const input = document.createElement('input');
            input.className = 'bs-input-outer';
            input.value = battleshipRowClues[r] === null ? '' : battleshipRowClues[r];
            input.onchange = (e) => {
                const v = parseInt(e.target.value);
                battleshipRowClues[r] = isNaN(v) ? null : v;
            };
            clueDiv.appendChild(input);
            gridContainer.appendChild(clueDiv);

            for (let c = 0; c < battleshipCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'bs-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.onclick = () => window.handleBattleshipCellClick && window.handleBattleshipCellClick(r, c);
                cell.oncontextmenu = (e) => { e.preventDefault(); battleshipGridHints[r][c] = null; renderBattleshipGrid(); };

                const h = battleshipGridHints[r][c];
                if (h) {
                    const inner = document.createElement('div');
                    inner.className = 'bs-clue';
                    if (h === 'w') {
                        inner.classList.add('bs-marker-water');
                    } else {
                        inner.textContent = HINT_SYMBOLS[h] || h;
                        inner.style.fontSize = '1.5rem';
                        inner.style.color = 'white';
                    }
                    cell.appendChild(inner);
                }

                gridContainer.appendChild(cell);
            }
        }
    }

    const TOOL_CYCLE = [null, 'w', 'o', 't', 'b', 'l', 'r', 'm'];

    window.handleBattleshipCellClick = function (r, c) {
        if (!battleshipCurrentTool) battleshipCurrentTool = 'w';
        
        if (battleshipGridHints[r][c] === battleshipCurrentTool) {
            let idx = TOOL_CYCLE.indexOf(battleshipCurrentTool);
            let nextTool = TOOL_CYCLE[(idx + 1) % TOOL_CYCLE.length];
            if (!nextTool) nextTool = TOOL_CYCLE[1]; // skip null to avoid unselecting tool
            
            window.setBattleshipTool(nextTool);
            battleshipGridHints[r][c] = nextTool;
        } else {
            battleshipGridHints[r][c] = battleshipCurrentTool;
        }
        
        const nav = document.getElementById('bs-solution-nav');
        if (nav) nav.style.display = 'none';
        renderBattleshipGrid();
    };

    // Global keyboard listener for tool shortcuts 1-7
    document.addEventListener('keydown', function(e) {
        // Ignore if user is typing in a clue input box
        if (e.target && e.target.tagName === 'INPUT') return;
        
        const keyMap = {
            '1': 'w', '2': 'o', '3': 't', '4': 'b', '5': 'l', '6': 'r', '7': 'm'
        };
        if (keyMap[e.key]) {
            e.preventDefault();
            window.setBattleshipTool(keyMap[e.key]);
        }
    });

    window.solveBattleshipPuzzle = function() {
        if (!window.solveBattleship) { updateStats('模块未加载', '-'); return; }

        const puzzleCtx = {
            rows: battleshipRows,
            cols: battleshipCols,
            rowClues: battleshipRowClues,
            colClues: battleshipColClues,
            gridHints: battleshipGridHints
        };

        updateStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveBattleship(puzzleCtx); } catch (e) {
                updateStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = LogicUI.formatElapsed(performance.now() - t0);

            if (res && res.error) { updateStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : [];
            window.battleshipSolutions = solutions;
            window.battleshipCurrentSolIndex = 0;

            if (res && res.timeout) {
                updateStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = document.getElementById('bs-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showBattleshipSolution(0);
            }
        }, 20);
    };

    function applyBattleshipSolution(idx) {
        if (!window.battleshipSolutions || !window.battleshipSolutions[idx]) return;
        const grid = window.battleshipSolutions[idx];
        const R = battleshipRows;
        const C = battleshipCols;

        const shapes = Array(R).fill(0).map(() => Array(C).fill(null));
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (grid[r][c] === 1) {
                    const u = (r > 0 && grid[r - 1][c] === 1);
                    const d = (r < R - 1 && grid[r + 1][c] === 1);
                    const l = (c > 0 && grid[r][c - 1] === 1);
                    const ri = (c < C - 1 && grid[r][c + 1] === 1);
                    if (!u && !d && !l && !ri) shapes[r][c] = 'circle';
                    else if (!u && d) shapes[r][c] = 'top';
                    else if (u && !d) shapes[r][c] = 'bottom';
                    else if (!l && ri) shapes[r][c] = 'left';
                    else if (l && !ri) shapes[r][c] = 'right';
                    else shapes[r][c] = 'middle';
                } else {
                    shapes[r][c] = 'water';
                }
            }
        }

        const puzzleGrid = document.getElementById('battleship-grid-container');
        if (!puzzleGrid) return;
        
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = puzzleGrid.querySelector(`.bs-cell[data-r="${r}"][data-c="${c}"]`);
                if (cell) {
                    cell.innerHTML = '';
                    if (shapes[r][c] !== 'water') {
                        const div = document.createElement('div');
                        div.className = `bs-clue bs-ship ${shapes[r][c]}`;
                        cell.appendChild(div);
                    } else {
                        // water
                        const div = document.createElement('div');
                        div.className = 'bs-clue bs-marker-water';
                        cell.appendChild(div);
                    }
                }
            }
        }
    }

    window.clearBattleshipGrid = function () {
        window.initBattleshipGrid();
    };

    window.showBattleshipSolution = function(delta) {
        const solutions = window.battleshipSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.battleshipCurrentSolIndex || 0;
        idx = ((idx + delta) % len + len) % len;
        window.battleshipCurrentSolIndex = idx;
        const counter = document.getElementById('bs-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;

        applyBattleshipSolution(idx);
    };

    window.buildSimpleBattleshipExample = function () {
        const szIn = document.getElementById('bs-size');
        if (szIn) szIn.value = 10;
        window.initBattleshipGrid(); // Reset to 10x10 empty

        battleshipRowClues[0] = 5;
        battleshipRowClues[1] = 0;
        battleshipRowClues[2] = 4;
        battleshipRowClues[3] = 0;
        battleshipRowClues[4] = 4;
        battleshipRowClues[5] = 0;
        battleshipRowClues[6] = 5;
        battleshipRowClues[7] = 0;
        battleshipRowClues[8] = 2;
        battleshipRowClues[9] = 0;
        battleshipColClues[0] = 5;
        battleshipColClues[1] = 5;
        battleshipColClues[2] = 3;
        battleshipColClues[3] = 2;
        battleshipColClues[4] = 1;
        battleshipColClues[5] = 0;
        battleshipColClues[6] = 3;
        battleshipColClues[7] = 1;
        battleshipColClues[8] = 0;
        battleshipColClues[9] = 0;
        battleshipGridHints[0][0] = 'l'; // left of size 4
        battleshipGridHints[4][0] = 'l'; // left of size 3
        battleshipGridHints[0][6] = 'o'; // size 1

        renderBattleshipGrid();
    };
})();
