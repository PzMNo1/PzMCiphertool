window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('chocobanana-workspace', 'chocobanana-layout',
    // ── Left ──
    LogicUI.backButton('chocobanana-workspace') +
    LogicUI.title('CHOCOBANANA', { color: 'var(--neon-cyan)' }) +
    LogicUI.sizeInputs('cb-rows', 'cb-cols', { rowVal: 8, colVal: 8, rowMin: 4, colMin: 4 }) +
    LogicUI.actionGrid4([
        { label: '重置网格', onclick: 'window.initChocobananaGrid && window.initChocobananaGrid()' },
        { label: '计算核心分析', onclick: 'window.solveChocobananaPuzzle && window.solveChocobananaPuzzle()', id: 'cb-solve-btn', glow: true },
        { label: '清空填涂', onclick: 'window.clearChocobananaGrid && window.clearChocobananaGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleChocobananaExample && window.buildSimpleChocobananaExample()' }
    ]) +
    LogicUI.statsPanel('cb', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
    LogicUI.solutionNav('cb', 'showCBSolution', { accent: 'var(--neon-cyan)' }) +
    LogicUI.instructions([
        '• <strong>左键点击格子</strong>：直接输入提示数字线索。',
        '• <strong>右键点击格子</strong>：网格涂色循环（巧克力 -> 香蕉 -> 空白）。',
        '• <strong>巧克力(棕)</strong>：连续区块必须是<strong>矩形</strong>。任意 2x2 无法形成「3填1空」的凹角。',
        '• <strong>香蕉(白)</strong>：相连区块<strong>一定不能是矩形</strong>。',
        '• 指定数字等于该块面积大小，一块中可含 0～N 个相同数字。'
    ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

    // ── Right ──
    `<div id="chocobanana-grid-container"></div>`,

    // ── Style ──
    `#chocobanana-grid-container{--cb-cell-size:50px;display:grid;gap:2px;background:var(--neon-cyan);padding:4px;border-radius:8px;width:fit-content;margin:0 auto;border:2px solid var(--neon-cyan);box-shadow:0 0 20px rgba(0,229,255,0.4)}
    .cb-cell{width:var(--cb-cell-size);height:var(--cb-cell-size);background:rgba(15,8,30,0.95);border-radius:4px;overflow:hidden}
    .cb-cell:hover{box-shadow:inset 0 0 10px rgba(0,229,255,0.3)}
    .cb-cell.choco{background:#4a3629;box-shadow:inset 0 0 8px rgba(0,0,0,0.5)}
    .cb-cell.banana{background:rgba(220,240,255,0.9);box-shadow:inset 0 0 8px rgba(0,229,255,0.3)}
    .cb-clue-input{width:100%;height:100%;background:transparent;border:none;outline:none;text-align:center;font-family:'Orbitron',monospace;font-weight:bold;font-size:1.5rem;color:#00e5ff;text-shadow:0 0 4px rgba(0,0,0,0.8);cursor:pointer}
    .cb-cell.choco .cb-clue-input{text-shadow:0 0 5px #000}
    .cb-cell.banana .cb-clue-input{color:#0a0520;text-shadow:none}`
));

(function () {
    let R = 8;
    let C = 8;
    let grid = []; // { type: 0, clue: null|int }

    window.cbSolutions = [];
    window.cbSolIdx = 0;

    const $ = id => document.getElementById(id);

    window.initChocobananaGrid = function () {
        R = Math.max(4, Math.min(15, parseInt($('cb-rows')?.value) || 8));
        C = Math.max(4, Math.min(15, parseInt($('cb-cols')?.value) || 8));
        grid = Array.from({ length: R }, () =>
            Array.from({ length: C }, () => ({ type: 0, clue: null }))
        );
        window.cbSolutions = [];
        window.cbSolIdx = 0;

        const nav = $('cb-solution-nav');
        if (nav) nav.style.display = 'none';

        const cnt = $('cb-solutionsCount');
        if (cnt) cnt.textContent = '0';

        const tm = $('cb-timeElapsed');
        if (tm) tm.textContent = '0';

        render();
    };

    function render() {
        const el = $('chocobanana-grid-container');
        if (!el) return;
        el.innerHTML = '';
        el.style.gridTemplateColumns = `repeat(${C}, var(--cb-cell-size))`;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div');
                cell.className = 'cb-cell';
                if (grid[r][c].type === 1) cell.classList.add('choco');
                if (grid[r][c].type === 2) cell.classList.add('banana');

                const input = document.createElement('input');
                input.className = 'cb-clue-input';
                input.type = 'text';
                input.inputMode = 'numeric';
                input.maxLength = 2;
                if (grid[r][c].clue !== null) input.value = grid[r][c].clue;

                input.oninput = () => {
                    const v = input.value.trim();
                    if (!/^\d*$/.test(v)) {
                        input.value = grid[r][c].clue !== null ? grid[r][c].clue : '';
                        return;
                    }
                    grid[r][c].clue = v === '' ? null : parseInt(v);
                };

                input.oncontextmenu = e => { e.preventDefault(); window.handleCBRightClick?.(r, c); };
                cell.oncontextmenu = e => { e.preventDefault(); window.handleCBRightClick?.(r, c); };
                cell.onclick = () => input.focus();

                cell.appendChild(input);
                el.appendChild(cell);
            }
        }
    }

    window.handleCBRightClick = function (r, c) {
        // Toggle: 0(Unknown) -> 1(Choco) -> 2(Banana) -> 0
        grid[r][c].type = (grid[r][c].type + 1) % 3;
        render();
    };

    function updateCBStats(count, time) {
        const cEl = $('cb-solutionsCount');
        const tEl = $('cb-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    window.solveChocobananaPuzzle = function () {
        if (!window.solveChocobanana) { updateCBStats('模块未加载', '-'); return; }

        const puzzleCtx = {
            rows: R,
            cols: C,
            grid: grid.map(row => row.map(cell => ({ ...cell })))
        };

        updateCBStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveChocobanana(puzzleCtx); } catch (e) {
                updateCBStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = LogicUI.formatElapsed(performance.now() - t0);

            if (res && res.error) { updateCBStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : window.cbSolutions || [];
            window.cbSolutions = solutions;
            window.cbSolIdx = 0;

            if (res && res.timeout) {
                updateCBStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateCBStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = $('cb-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showCBSolution(0);
            }
        }, 20);
    };

    function applySol(idx) {
        if (!window.cbSolutions || !window.cbSolutions[idx]) return;
        const sol = window.cbSolutions[idx];
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                grid[r][c].type = sol[r * C + c];
            }
        }
        render();
    }

    window.showCBSolution = function (delta) {
        if (!window.cbSolutions?.length) return;
        window.cbSolIdx = (window.cbSolIdx + delta + window.cbSolutions.length) % window.cbSolutions.length;
        $('cb-solution-counter').textContent = `解 ${window.cbSolIdx + 1}/${window.cbSolutions.length}`;
        applySol(window.cbSolIdx);
    };

    window.clearChocobananaGrid = function () {
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                grid[r][c].type = 0;
            }
        }
        render();
    };

    window.buildSimpleChocobananaExample = function () {
        const rIn = $('cb-rows'), cIn = $('cb-cols');
        if (rIn) rIn.value = 5;
        if (cIn) cIn.value = 5;
        window.initChocobananaGrid();
        grid[0][0].clue = 6;
        grid[2][2].clue = 4;
        grid[0][4].clue = 2;
        grid[4][1].clue = 3;
        grid[4][4].clue = 6;
        render();
    };

})();

