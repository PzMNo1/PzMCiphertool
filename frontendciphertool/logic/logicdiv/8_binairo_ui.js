window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('binairo-workspace', 'binairo-layout',
    // ── Left ──
    LogicUI.backButton('binairo-workspace') +
    LogicUI.title('BINAIRO', { color: 'var(--neon-purple)' }) +
    `<div style="margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <input type="number" id="bi-rows" placeholder="行数 (偶数, 默认10)" value="10" min="4" max="16" step="2" style="width:100%;" class="cyber-input">
        <input type="number" id="bi-cols" placeholder="列数 (偶数, 默认10)" value="10" min="4" max="16" step="2" style="width:100%;" class="cyber-input">
    </div>` +
    LogicUI.actionGrid4([
        { label: '重置网格', onclick: 'window.initBinairoGrid && window.initBinairoGrid()' },
        { label: '计算核心分析', onclick: 'window.solveBinairoPuzzle && window.solveBinairoPuzzle()', id: 'bi-solve-btn', glow: true },
        { label: '清空非固定', onclick: 'window.clearBinairoGrid && window.clearBinairoGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleBinairoExample && window.buildSimpleBinairoExample()' }
    ]) +
    LogicUI.statsPanel('bi', { countLabel: '平衡可能矩阵', timeLabel: '算力耗时', accent: 'var(--neon-purple)' }) +
    LogicUI.solutionNav('bi', 'showBinairoSolution', { accent: 'var(--neon-purple)' }) +
    LogicUI.instructions([
        '• <strong>左键</strong>: 切换 白圆 / 黑圆 / 空白。',
        '• <strong>右键</strong>: 锁定(固定)当前格子，其背景将加深并不可被清空。',
        '1. 每行每列白圆与黑圆数目必须对等。',
        '2. 相同颜色的圆不能连续超过2个。',
        '3. 每行/每列的黑白排列顺序必须独一无二。'
    ], { accent: '#00ffcc', title: '系统法则' }),

    // ── Right ──
    `<div id="binairo-grid-container"></div>`,

    // ── Style ──
    `#binairo-grid-container{--bi-cell-size:55px;display:grid;gap:2px;background:var(--neon-cyan);padding:4px;border-radius:8px;width:fit-content;margin:0 auto;border:2px solid var(--neon-cyan);box-shadow:0 0 20px rgba(0,229,255,0.4)}
    .bi-cell{width:var(--bi-cell-size);height:var(--bi-cell-size);background:rgba(20,10,30,0.95);border-radius:4px;}
    .bi-cell.fixed{background:rgba(255,255,255,0.1);box-shadow:inset 0 0 5px rgba(255,255,255,0.2)}
    .bi-cell:hover{background:rgba(204,0,255,0.2);box-shadow:inset 0 0 10px rgba(204,0,255,0.4)}
    .bi-circle{width:75%;height:75%;border-radius:50%;transition:all .3s}
    .bi-circle.val-0{background-color:white;box-shadow:0 0 10px rgba(255,255,255,0.8);border:1px solid #aaa}
    .bi-circle.val-1{background-color:black;box-shadow:0 0 10px rgba(0,0,0,0.8);border:2px solid rgba(255,255,255,0.3)}`
));


(function () {
    let binairoRows = 10;
    let binairoCols = 10;
    let binairoGrid = [];

    window.initBinairoGrid = function() {
        const rIn = document.getElementById('bi-rows');
        const cIn = document.getElementById('bi-cols');
        let rVal = rIn ? parseInt(rIn.value) : 10;
        let cVal = cIn ? parseInt(cIn.value) : 10;

        if (rVal % 2 !== 0 || cVal % 2 !== 0) {
            rVal = rVal % 2 === 0 ? rVal : rVal + 1;
            cVal = cVal % 2 === 0 ? cVal : cVal + 1;
            if (rIn) rIn.value = rVal;
            if (cIn) cIn.value = cVal;
        }

        binairoRows = Math.max(4, Math.min(16, rVal));
        binairoCols = Math.max(4, Math.min(16, cVal));

        binairoGrid = Array(binairoRows).fill(null).map(() =>
            Array(binairoCols).fill(null).map(() => ({ val: null, fixed: false }))
        );

        window.binairoSolutions = [];
        window.binairoCurrentSolIndex = 0;
        
        const nav = document.getElementById('bi-solution-nav');
        if (nav) nav.style.display = 'none';
        
        const cnt = document.getElementById('bi-solutionsCount');
        if(cnt) cnt.textContent = '0';
        
        const tm = document.getElementById('bi-timeElapsed');
        if(tm) tm.textContent = '0';

        renderBinairoGrid();
    };

    function renderBinairoGrid() {
        const container = document.getElementById('binairo-grid-container');
        if (!container) return;

        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${binairoCols}, var(--bi-cell-size))`;

        for (let r = 0; r < binairoRows; r++) {
            for (let c = 0; c < binairoCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'bi-cell';
                if (binairoGrid[r][c].fixed) cell.classList.add('fixed');

                cell.onclick = () => window.handleBinairoCellClick && window.handleBinairoCellClick(r, c);
                cell.oncontextmenu = (e) => { e.preventDefault(); window.handleBinairoRightClick && window.handleBinairoRightClick(r, c); };

                const val = binairoGrid[r][c].val;
                if (val !== null) {
                    const circle = document.createElement('div');
                    circle.className = `bi-circle val-${val}`;
                    cell.appendChild(circle);
                }

                container.appendChild(cell);
            }
        }
    }

    window.handleBinairoCellClick = function (r, c) {
        let v = binairoGrid[r][c].val;
        if (v === null) v = 0;
        else if (v === 0) v = 1;
        else v = null;

        binairoGrid[r][c].val = v;
        binairoGrid[r][c].fixed = false;
        renderBinairoGrid();
    };

    window.handleBinairoRightClick = function (r, c) {
        if (binairoGrid[r][c].val !== null) {
            binairoGrid[r][c].fixed = !binairoGrid[r][c].fixed;
            renderBinairoGrid();
        }
    };

    function updateBinairoStats(count, time) {
        const cEl = document.getElementById('bi-solutionsCount');
        const tEl = document.getElementById('bi-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    window.solveBinairoPuzzle = function() {
        if (!window.solveBinairo) { updateBinairoStats('模块未加载', '-'); return; }

        const solverGrid = binairoGrid.map(row => row.map(c => c.val));
        const puzzleCtx = {
            rows: binairoRows,
            cols: binairoCols,
            grid: solverGrid
        };

        updateBinairoStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveBinairo(puzzleCtx); } catch (e) {
                updateBinairoStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = Math.round(performance.now() - t0);

            if (res && res.error) { updateBinairoStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : window.binairoSolutions || [];
            window.binairoSolutions = solutions;
            window.binairoCurrentSolIndex = 0;

            if (res && res.timeout) {
                updateBinairoStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateBinairoStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = document.getElementById('bi-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showBinairoSolution(0);
            }
        }, 20);
    };

    function applyBinairoSolution(idx) {
        if (!window.binairoSolutions || !window.binairoSolutions[idx]) return;
        const sol = window.binairoSolutions[idx];
        for (let r = 0; r < binairoRows; r++) {
            for (let c = 0; c < binairoCols; c++) {
                binairoGrid[r][c].val = sol[r][c];
            }
        }
        renderBinairoGrid();
    }

    window.clearBinairoGrid = function () {
        for (let r = 0; r < binairoRows; r++) {
            for (let c = 0; c < binairoCols; c++) {
                if (!binairoGrid[r][c].fixed) {
                    binairoGrid[r][c].val = null;
                }
            }
        }
        renderBinairoGrid();
    };

    window.showBinairoSolution = function(delta) {
        const solutions = window.binairoSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.binairoCurrentSolIndex || 0;
        idx = ((idx + delta) % len + len) % len;
        window.binairoCurrentSolIndex = idx;
        const counter = document.getElementById('bi-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;

        applyBinairoSolution(idx);
    };

    window.buildSimpleBinairoExample = function () {
        const rIn = document.getElementById('bi-rows');
        const cIn = document.getElementById('bi-cols');
        if (rIn) rIn.value = 4;
        if (cIn) cIn.value = 4;
        window.initBinairoGrid(); // 4x4

        binairoGrid[0][0] = { val: 1, fixed: true };
        binairoGrid[1][0] = { val: 1, fixed: true };
        binairoGrid[0][1] = { val: 0, fixed: true };
        binairoGrid[0][3] = { val: 0, fixed: true };
        binairoGrid[2][2] = { val: 1, fixed: true };
        binairoGrid[3][3] = { val: 1, fixed: true };

        renderBinairoGrid();
    };

})();
