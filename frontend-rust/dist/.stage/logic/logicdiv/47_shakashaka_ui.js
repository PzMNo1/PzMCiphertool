(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('shakashaka-workspace', 'shakashaka-layout',
        window.LogicUI.backButton('shakashaka-workspace') +
        window.LogicUI.title('SHAKASHAKA', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('shaka-rows', 'shaka-cols', { rowVal: 5, colVal: 5, rowMin: 2, colMin: 2, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initShakashakaGrid && window.initShakashakaGrid()' },
            { label: '计算核心分析', onclick: 'window.solveShakashakaPuzzleUI && window.solveShakashakaPuzzleUI()', id: 'shaka-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearShakashakaGrid && window.clearShakashakaGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleShakashakaExample && window.buildSimpleShakashakaExample()' }
        ]) +
        window.LogicUI.statsPanel('shaka', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('shaka', 'showShakashakaSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '先在下方 <strong>模式栏</strong> 选择要放置的元素',
            '然后 <strong>点击/触摸</strong> 网格中的格子即可放置',
            '选择黑格模式时，可在数字栏选数字(或无)',
            '<strong>规则</strong>: 空白区域须组成矩形(可斜45°)，数字=相邻三角形数量'
        ], { accent: 'var(--neon-cyan)', title: '操作指南' }),

        // ── Right: Grid + Mode Bar ──
        `<div id="shaka-mode-bar"></div>
         <div id="shaka-grid-container"></div>`,

        // ── Style ──
        `#shaka-mode-bar{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;user-select:none}
        .shaka-mode-row{display:flex;gap:4px;justify-content:center;flex-wrap:wrap}
        .shaka-mode-btn{
            min-width:48px;height:42px;display:flex;align-items:center;justify-content:center;
            border-radius:6px;cursor:pointer;font-size:.9rem;font-weight:600;
            border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);
            color:rgba(255,255,255,.6);transition:all .15s;padding:0 10px;
            -webkit-tap-highlight-color:transparent;touch-action:manipulation
        }
        .shaka-mode-btn:hover{background:rgba(0,255,231,.08)}
        .shaka-mode-btn.active{background:rgba(0,229,255,.18);border-color:var(--neon-cyan,#00ffe7);color:var(--neon-cyan,#00ffe7);box-shadow:0 0 8px rgba(0,229,255,.2)}
        .shaka-mode-btn .preview{display:inline-block;width:20px;height:20px;margin-right:4px;border-radius:2px;vertical-align:middle;flex-shrink:0}
        .shaka-num-row{display:flex;gap:4px;justify-content:center;transition:opacity .2s,max-height .2s;overflow:hidden}
        .shaka-num-row.hidden{opacity:0;max-height:0;margin:0;pointer-events:none}
        .shaka-num-btn{
            width:42px;height:38px;display:flex;align-items:center;justify-content:center;
            border-radius:5px;cursor:pointer;font-size:.95rem;font-weight:700;
            border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);
            color:rgba(255,255,255,.6);transition:all .15s;
            -webkit-tap-highlight-color:transparent;touch-action:manipulation
        }
        .shaka-num-btn:hover{background:rgba(0,255,231,.08)}
        .shaka-num-btn.active{background:rgba(0,229,255,.18);border-color:var(--neon-cyan,#00ffe7);color:var(--neon-cyan,#00ffe7);box-shadow:0 0 8px rgba(0,229,255,.2)}
        #shaka-grid-container{gap:0;display:inline-grid;padding:6px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);user-select:none}
        .shaka-cell{
            width:38px;height:38px;display:flex;align-items:center;justify-content:center;
            border:1px solid rgba(255,255,255,.12);background:rgba(10,10,15,.9);
            font-size:1.1rem;color:var(--neon-cyan);font-weight:700;
            cursor:pointer;user-select:none;box-sizing:border-box;
            -webkit-tap-highlight-color:transparent;touch-action:manipulation;
            transition:background .1s
        }
        .shaka-cell:hover{background:rgba(0,255,231,.1)}
        .shaka-cell.black{background:#111;color:#fff;font-weight:900;text-shadow:0 0 4px rgba(255,255,255,.4)}
        .shaka-cell.black:hover{background:#222}
        .shaka-cell.TL{background:linear-gradient(135deg,rgba(180,220,255,.75) 50%,rgba(10,10,15,.9) 50%)}
        .shaka-cell.TR{background:linear-gradient(-135deg,rgba(180,220,255,.75) 50%,rgba(10,10,15,.9) 50%)}
        .shaka-cell.BL{background:linear-gradient(45deg,rgba(180,220,255,.75) 50%,rgba(10,10,15,.9) 50%)}
        .shaka-cell.BR{background:linear-gradient(-45deg,rgba(180,220,255,.75) 50%,rgba(10,10,15,.9) 50%)}
        .shaka-cell.TL:hover,.shaka-cell.TR:hover,.shaka-cell.BL:hover,.shaka-cell.BR:hover{filter:brightness(1.15)}`
    ));

    const $ = id => document.getElementById(id);
    const MODES = [
        { key: 'erase', label: '⬜ 清除', color: null },
        { key: 'black', label: '⬛ 黑格', color: null },
        { key: 'TL',    label: '◤',      color: '135deg' },
        { key: 'TR',    label: '◥',      color: '-135deg' },
        { key: 'BL',    label: '◣',      color: '45deg' },
        { key: 'BR',    label: '◢',      color: '-45deg' }
    ];
    let R = 5, C = 5, grid = [], mode = 'black', clueNum = 5;
    let solutions = [], solIdx = 0, showing = false;

    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('shaka-solutionsCount'), b = $('shaka-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('shaka-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const readSize = () => {
        const ri = $('shaka-rows'), ci = $('shaka-cols');
        if (ri && ci) { R = Math.max(2, Math.min(12, +ri.value || 5)); C = Math.max(2, Math.min(12, +ci.value || 5)); ri.value = R; ci.value = C; }
    };
    function isBlack(v) { return typeof v === 'number' && v >= 0 && v <= 5; }

    function buildModeBar() {
        const bar = $('shaka-mode-bar');
        if (!bar) return;

        // Mode buttons row
        let html = '<div class="shaka-mode-row">';
        MODES.forEach(m => {
            let preview = '';
            if (m.color) {
                preview = `<span class="preview" style="background:linear-gradient(${m.color},rgba(180,220,255,.75) 50%,rgba(40,40,50,.9) 50%)"></span>`;
            }
            html += `<div class="shaka-mode-btn${mode === m.key ? ' active' : ''}" data-mode="${m.key}">${preview}${m.label}</div>`;
        });
        html += '</div>';

        // Number row (only for black mode)
        html += `<div class="shaka-num-row${mode !== 'black' ? ' hidden' : ''}" id="shaka-num-row">`;
        for (let i = 0; i <= 4; i++) {
            html += `<div class="shaka-num-btn${clueNum === i ? ' active' : ''}" data-num="${i}">${i}</div>`;
        }
        html += `<div class="shaka-num-btn${clueNum === 5 ? ' active' : ''}" data-num="5" style="padding:0 12px">无</div>`;
        html += '</div>';

        bar.innerHTML = html;

        // Mode click
        bar.querySelectorAll('.shaka-mode-btn').forEach(btn => {
            btn.onclick = () => {
                mode = btn.dataset.mode;
                bar.querySelectorAll('.shaka-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
                const nr = $('shaka-num-row');
                if (nr) nr.classList.toggle('hidden', mode !== 'black');
            };
        });

        // Number click
        bar.querySelectorAll('.shaka-num-btn').forEach(btn => {
            btn.onclick = () => {
                clueNum = +btn.dataset.num;
                bar.querySelectorAll('.shaka-num-btn').forEach(b => b.classList.toggle('active', +b.dataset.num === clueNum));
            };
        });
    }

    function render() {
        const g = $('shaka-grid-container');
        if (!g) return;
        g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},38px)`;
        g.style.gridTemplateRows = `repeat(${R},38px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const i = r * C + c, v = grid[i];
            const cell = document.createElement('div');
            cell.className = 'shaka-cell';
            if (isBlack(v)) {
                cell.classList.add('black');
                if (v <= 4) cell.textContent = v;
            } else if (typeof v === 'string') {
                cell.classList.add(v);
            }

            cell.onclick = () => {
                if (showing) return;
                if (mode === 'erase') {
                    grid[i] = -1;
                } else if (mode === 'black') {
                    grid[i] = clueNum;
                } else {
                    // Triangle — don't overwrite black cells
                    if (isBlack(grid[i])) return;
                    grid[i] = mode;
                }
                render();
            };

            g.appendChild(cell);
        }
    }

    window.initShakashakaGrid = () => {
        readSize(); reset(); grid = new Array(R * C).fill(-1);
        render(); buildModeBar(); stats('-', '-'); nav(false);
    };
    window.clearShakashakaGrid = () => {
        reset();
        for (let i = 0; i < grid.length; i++) {
            if (typeof grid[i] === 'string') grid[i] = -1;
        }
        render(); stats('-', '-'); nav(false);
    };
    window.buildSimpleShakashakaExample = () => {
        R = 4; C = 4;
        const ri = $('shaka-rows'), ci = $('shaka-cols');
        if (ri) ri.value = 4; if (ci) ci.value = 4;
        reset();
        grid = new Array(16).fill(-1);
        grid[3] = 2;   // (0,3) = black with 2
        grid[12] = 2;  // (3,0) = black with 2
        render(); buildModeBar(); stats('-', '-'); nav(false);
    };

    window.solveShakashakaPuzzleUI = () => {
        if (!window.solveShakashaka) return stats('模块未加载', '-');
        const puzzleGrid = new Array(R * C).fill(-1);
        for (let i = 0; i < R * C; i++) {
            const v = grid[i];
            if (isBlack(v)) puzzleGrid[i] = v;
        }
        setTimeout(() => {
            const t0 = performance.now();
            const res = window.solveShakashaka({ rows: R, cols: C, grid: puzzleGrid });
            const ms = LogicUI.formatElapsed(performance.now() - t0);
            solutions = res.solutions || [];
            stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
            if (solutions.length) {
                showing = true; solIdx = 0; nav(solutions.length > 1);
                window.showShakashakaSolution(0);
            }
        }, 30);
    };

    function applySolution(idx) {
        const sol = solutions[idx]; if (!sol) return;
        for (let i = 0; i < sol.length; i++) {
            const v = sol[i];
            if (v === 0) continue;
            if (v === 1) grid[i] = -1;
            else if (v === 2) grid[i] = 'TL';
            else if (v === 3) grid[i] = 'TR';
            else if (v === 4) grid[i] = 'BL';
            else if (v === 5) grid[i] = 'BR';
        }
        render();
    }

    window.showShakashakaSolution = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('shaka-solution-counter');
        if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        applySolution(solIdx);
    };
})();
