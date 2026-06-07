window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('cave-workspace', 'cave-layout',
    // ── Left ──
    LogicUI.backButton('cave-workspace') +
    LogicUI.title('CAVE', { color: 'var(--neon-purple)' }) +
    LogicUI.sizeInputs('cave-rows', 'cave-cols', { rowVal: 7, colVal: 7, rowMin: 4, colMin: 4 }) +
    LogicUI.actionGrid4([
        { label: '重置网格', onclick: 'window.initCaveGrid && window.initCaveGrid()' },
        { label: '计算核心分析', onclick: 'window.solveCavePuzzle && window.solveCavePuzzle()', id: 'cave-solve-btn', glow: true },
        { label: '清空非线索', onclick: 'window.clearCaveGrid && window.clearCaveGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleCaveExample && window.buildSimpleCaveExample()' }
    ]) +
    LogicUI.statsPanel('cave', { countLabel: '洞穴解数', timeLabel: 'AI thinking耗时', accent: 'var(--neon-purple)' }) +
    LogicUI.solutionNav('cave', 'showCaveSolution', { accent: 'var(--neon-purple)' }) +
    LogicUI.instructions([
        '• <strong>左键</strong>: 循环切换 空白 → 墙壁(暗紫) → 洞穴(亮蓝) → 空白。',
        '• <strong>右键</strong>: 输入数字线索 (线索格自动标记为洞穴)。',
        '• 所有<strong>洞穴</strong>格必须连通。',
        '• 所有<strong>墙壁</strong>格必须连接到边界。',
        '• <strong>数字</strong> = 从该格向四方向可见的洞穴格总数(含自身)。'
    ], { accent: '#00ffcc', title: '系统法则' }),

    // ── Right ──
    `<div id="cave-grid-container"></div>`,

    // ── Style ──
    `#cave-grid-container{--cave-cell-size:50px;display:grid;gap:3px;background:rgba(255,255,255,0.06);padding:8px;border-radius:14px;width:fit-content;margin:0 auto;border:1px solid rgba(255,255,255,0.22);backdrop-filter:blur(18px) saturate(1.25);-webkit-backdrop-filter:blur(18px) saturate(1.25);box-shadow:0 18px 60px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.18),inset 0 0 28px rgba(255,255,255,0.04)}
    .cave-cell{width:var(--cave-cell-size);height:var(--cave-cell-size);background:linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035));border:1px solid rgba(255,255,255,0.16);border-radius:10px;backdrop-filter:blur(12px) saturate(1.18);-webkit-backdrop-filter:blur(12px) saturate(1.18);box-shadow:inset 0 1px 0 rgba(255,255,255,0.16),inset 0 -10px 20px rgba(0,0,0,0.12)}
    .cave-cell:hover{background:linear-gradient(145deg,rgba(255,255,255,0.18),rgba(210,245,255,0.08));border-color:rgba(255,255,255,0.34);box-shadow:inset 0 1px 0 rgba(255,255,255,0.28),0 0 18px rgba(190,230,255,0.12)}
    .cave-cell.cave-wall{background:linear-gradient(145deg,rgba(255,255,255,0.34),rgba(255,255,255,0.12));box-shadow:inset 0 1px 0 rgba(255,255,255,0.42),inset 0 -16px 26px rgba(0,0,0,0.18),0 10px 24px rgba(0,0,0,0.16);border:1px solid rgba(255,255,255,0.38)}
    .cave-cell.cave-open{background:rgba(0,200,255,0.1);box-shadow:inset 0 0 8px rgba(0,200,255,0.15)}
    .cave-clue-num{font-family:'Orbitron',monospace;font-weight:bold;font-size:1.1rem;color:#00e5ff;text-shadow:0 0 8px rgba(0,229,255,0.8);z-index:10}
    .cave-cell.cave-wall .cave-clue-num{color:#ff4466;text-shadow:0 0 8px rgba(255,68,102,0.8)}`
));

(function () {
    let caveRows = 7;
    let caveCols = 7;
    let caveGrid = [];

    window.initCaveGrid = function () {
        const rIn = document.getElementById('cave-rows');
        const cIn = document.getElementById('cave-cols');
        let rVal = rIn ? parseInt(rIn.value) : 7;
        let cVal = cIn ? parseInt(cIn.value) : 7;
        caveRows = Math.max(4, Math.min(15, rVal || 7));
        caveCols = Math.max(4, Math.min(15, cVal || 7));

        caveGrid = Array(caveRows).fill(null).map(() =>
            Array(caveCols).fill(null).map(() => ({ type: 0, clue: null }))
        );
        window.caveSolutions = [];
        window.caveCurrentSolIndex = 0;

        const nav = document.getElementById('cave-solution-nav');
        if (nav) nav.style.display = 'none';
        const cnt = document.getElementById('cave-solutionsCount');
        if (cnt) cnt.textContent = '0';
        const tm = document.getElementById('cave-timeElapsed');
        if (tm) tm.textContent = '0';

        renderCaveGrid();
    };

    function renderCaveGrid() {
        const container = document.getElementById('cave-grid-container');
        if (!container) return;
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${caveCols}, var(--cave-cell-size))`;

        for (let r = 0; r < caveRows; r++) {
            for (let c = 0; c < caveCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cave-cell';

                if (caveGrid[r][c].type === 1) cell.classList.add('cave-open');
                if (caveGrid[r][c].type === 2) cell.classList.add('cave-wall');

                cell.onclick = () => window.handleCaveCellClick && window.handleCaveCellClick(r, c);
                cell.oncontextmenu = (e) => {
                    e.preventDefault();
                    window.handleCaveRightClick && window.handleCaveRightClick(r, c);
                };

                if (caveGrid[r][c].clue !== null) {
                    const span = document.createElement('span');
                    span.className = 'cave-clue-num';
                    span.textContent = caveGrid[r][c].clue;
                    cell.appendChild(span);
                }

                container.appendChild(cell);
            }
        }
    }

    window.handleCaveCellClick = function (r, c) {
        if (caveGrid[r][c].clue !== null) {
            const n = prompt("输入线索值 (留空移除):", caveGrid[r][c].clue);
            if (n !== null) {
                caveGrid[r][c].clue = n === "" ? null : parseInt(n);
                if (caveGrid[r][c].clue !== null) caveGrid[r][c].type = 1;
            }
        } else {
            let t = caveGrid[r][c].type;
            if (t === 0) t = 2;
            else if (t === 2) t = 1;
            else t = 0;
            caveGrid[r][c].type = t;
        }
        renderCaveGrid();
    };

    window.handleCaveRightClick = function (r, c) {
        const n = prompt("输入线索值 (留空移除):", caveGrid[r][c].clue !== null ? caveGrid[r][c].clue : "");
        if (n !== null) {
            caveGrid[r][c].clue = n === "" ? null : parseInt(n);
            if (caveGrid[r][c].clue !== null) caveGrid[r][c].type = 1;
        }
        renderCaveGrid();
    };

    function updateCaveStats(count, time) {
        const cEl = document.getElementById('cave-solutionsCount');
        const tEl = document.getElementById('cave-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    window.solveCavePuzzle = function () {
        if (!window.solveCave) { updateCaveStats('模块未加载', '-'); return; }

        const puzzleCtx = {
            rows: caveRows,
            cols: caveCols,
            grid: caveGrid.map(row => row.map(cell => ({ ...cell })))
        };

        updateCaveStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveCave(puzzleCtx); } catch (e) {
                updateCaveStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = LogicUI.formatElapsed(performance.now() - t0);

            if (res && res.error) { updateCaveStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : window.caveSolutions || [];
            window.caveSolutions = solutions;
            window.caveCurrentSolIndex = 0;

            if (res && res.timeout) {
                updateCaveStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateCaveStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = document.getElementById('cave-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showCaveSolution(0);
            }
        }, 20);
    };

    function applyCaveSolution(idx) {
        if (!window.caveSolutions || !window.caveSolutions[idx]) return;
        const sol = window.caveSolutions[idx];
        for (let r = 0; r < caveRows; r++)
            for (let c = 0; c < caveCols; c++)
                caveGrid[r][c].type = sol[r][c];
        renderCaveGrid();
    }

    window.showCaveSolution = function (delta) {
        const solutions = window.caveSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.caveCurrentSolIndex || 0;
        idx = ((idx + delta) % len + len) % len;
        window.caveCurrentSolIndex = idx;
        const counter = document.getElementById('cave-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;
        applyCaveSolution(idx);
    };

    window.clearCaveGrid = function () {
        for (let r = 0; r < caveRows; r++)
            for (let c = 0; c < caveCols; c++) {
                if (caveGrid[r][c].clue === null) caveGrid[r][c].type = 0;
            }
        renderCaveGrid();
    };

    window.buildSimpleCaveExample = function () {
        const rIn = document.getElementById('cave-rows');
        const cIn = document.getElementById('cave-cols');
        if (rIn) rIn.value = 5;
        if (cIn) cIn.value = 5;
        window.initCaveGrid();

        // Place clues
        caveGrid[1][1].clue = 3;
        caveGrid[1][1].type = 1;
        caveGrid[2][2].clue = 5;
        caveGrid[2][2].type = 1;
        caveGrid[3][3].clue = 3;
        caveGrid[3][3].type = 1;

        renderCaveGrid();
    };

})();
