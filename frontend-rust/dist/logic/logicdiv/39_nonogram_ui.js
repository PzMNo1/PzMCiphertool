(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('nonogram-workspace', 'nonogram-layout',
        window.LogicUI.backButton('nonogram-workspace') +
        window.LogicUI.title('NONOGRAM', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('no-rows', 'no-cols', { rowVal: 5, colVal: 5, rowMin: 2, colMin: 2, rowMax: 15, colMax: 15 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initNOGrid && window.initNOGrid()' },
            { label: '计算核心分析', onclick: 'window.solveNOPuzzleUI && window.solveNOPuzzleUI()', id: 'no-solve-btn', glow: true },
            { label: '清空线索', onclick: 'window.clearNOGrid && window.clearNOGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleNOExample && window.buildSimpleNOExample()' }
        ]) +
        window.LogicUI.statsPanel('no', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('no', 'showNOSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '在行/列线索框输入数字(空格分隔)',
            '如: "2 1" 表示一组2格 + 一组1格',
            '也可点击网格设计图案，自动生成线索',
            '求解后显示填色方案'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="no-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-block;"></div>`,
        `.no-wrap{display:inline-block}
        .no-clue-row{display:flex;align-items:flex-end;gap:0;margin-bottom:2px}
        .no-clue-row .no-corner{flex:0 0 auto}
        .no-col-hdr{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;width:36px;padding:0 1px}
        .no-col-hdr input{width:32px;height:22px;background:rgba(0,0,0,.4);border:1px solid rgba(0,255,231,.25);border-radius:3px;color:#0ff;text-align:center;font-size:.65rem;padding:0 1px;font-family:inherit;box-sizing:border-box}
        .no-body-row{display:flex;align-items:center;gap:0}
        .no-row-hdr{display:flex;align-items:center;justify-content:flex-end;padding-right:4px}
        .no-row-hdr input{width:54px;height:22px;background:rgba(0,0,0,.4);border:1px solid rgba(0,255,231,.25);border-radius:3px;color:#0ff;text-align:center;font-size:.7rem;padding:0 2px;font-family:inherit;box-sizing:border-box}
        .no-cell{width:36px;height:36px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);cursor:pointer;display:flex;align-items:center;justify-content:center;box-sizing:border-box;transition:background .12s}
        .no-cell:hover{background:rgba(0,255,231,.1)}
        .no-cell.filled{background:rgba(0,255,231,.85);box-shadow:inset 0 0 8px rgba(0,255,231,.6)}
        .no-cell.design{background:rgba(0,255,231,.35);box-shadow:inset 0 0 4px rgba(0,255,231,.3)}`
    ));

    const $ = id => document.getElementById(id), S = 36;
    let R = 5, C = 5;
    let design = new Set();
    let solutions = [], solIdx = 0, showing = false;
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('no-solutionsCount'), b = $('no-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = s => { const n = $('no-solution-nav'); if (n) n.style.display = s ? 'flex' : 'none'; };
    const readSize = () => { const ri = $('no-rows'), ci = $('no-cols'); if (ri && ci) { R = Math.max(2, Math.min(15, +ri.value || 5)); C = Math.max(2, Math.min(15, +ci.value || 5)); ri.value = R; ci.value = C; } };

    // clue storage (persisted between renders)
    let rowClueVals = [], colClueVals = [];
    function initClueVals() { rowClueVals = Array(R).fill(''); colClueVals = Array(C).fill(''); }

    function calcClues(filled, len) {
        const res = []; let cnt = 0;
        for (let i = 0; i < len; i++) { if (filled[i]) cnt++; else if (cnt > 0) { res.push(cnt); cnt = 0; } }
        if (cnt > 0) res.push(cnt);
        return res.length ? res : [0];
    }

    function render() {
        const ct = $('no-grid-container'); if (!ct) return;
        ct.innerHTML = '';
        const wrap = document.createElement('div'); wrap.className = 'no-wrap';
        const sol = showing && solutions.length ? solutions[solIdx] : null;

        // Row 0: corner + column clue inputs
        const clueRow = document.createElement('div'); clueRow.className = 'no-clue-row';
        const corner = document.createElement('div'); corner.className = 'no-corner';
        corner.style.width = '58px'; corner.style.height = '26px';
        clueRow.appendChild(corner);
        for (let c = 0; c < C; c++) {
            const hdr = document.createElement('div'); hdr.className = 'no-col-hdr';
            const inp = document.createElement('input'); inp.type = 'text';
            inp.id = 'no-cc-' + c; inp.value = colClueVals[c] || ''; inp.placeholder = '…';
            inp.addEventListener('input', () => { colClueVals[c] = inp.value; });
            hdr.appendChild(inp); clueRow.appendChild(hdr);
        }
        wrap.appendChild(clueRow);

        // Body rows
        for (let r = 0; r < R; r++) {
            const row = document.createElement('div'); row.className = 'no-body-row';
            // row clue
            const rhdr = document.createElement('div'); rhdr.className = 'no-row-hdr';
            const rinp = document.createElement('input'); rinp.type = 'text';
            rinp.id = 'no-rc-' + r; rinp.value = rowClueVals[r] || ''; rinp.placeholder = '…';
            rinp.addEventListener('input', () => { rowClueVals[r] = rinp.value; });
            rhdr.appendChild(rinp); row.appendChild(rhdr);
            // cells
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div'); cell.className = 'no-cell';
                const k = r + ',' + c;
                if (sol) {
                    if (sol[r][c]) cell.classList.add('filled');
                } else {
                    if (design.has(k)) cell.classList.add('design');
                    cell.addEventListener('click', () => {
                        if (design.has(k)) design.delete(k); else design.add(k);
                        updateDesignClues();
                        render();
                    });
                }
                row.appendChild(cell);
            }
            wrap.appendChild(row);
        }
        ct.appendChild(wrap);
    }

    function updateDesignClues() {
        for (let r = 0; r < R; r++) {
            const filled = []; for (let c = 0; c < C; c++) filled.push(design.has(r + ',' + c));
            rowClueVals[r] = calcClues(filled, C).join(' ');
        }
        for (let c = 0; c < C; c++) {
            const filled = []; for (let r = 0; r < R; r++) filled.push(design.has(r + ',' + c));
            colClueVals[c] = calcClues(filled, R).join(' ');
        }
    }

    function readClues() {
        const rc = [], cc = [];
        for (let r = 0; r < R; r++) {
            const v = (rowClueVals[r] || '').trim();
            rc.push(v ? v.split(/\s+/).map(Number).filter(n => !isNaN(n)) : [0]);
        }
        for (let c = 0; c < C; c++) {
            const v = (colClueVals[c] || '').trim();
            cc.push(v ? v.split(/\s+/).map(Number).filter(n => !isNaN(n)) : [0]);
        }
        return { rc, cc };
    }

    window.initNOGrid = () => { readSize(); reset(); design = new Set(); initClueVals(); render(); stats('-', '-'); nav(false); };
    window.clearNOGrid = () => { reset(); design = new Set(); initClueVals(); render(); stats('-', '-'); nav(false); };
    window.buildSimpleNOExample = () => {
        R = 5; C = 5; const ri = $('no-rows'), ci = $('no-cols'); if (ri) ri.value = 5; if (ci) ci.value = 5;
        reset(); initClueVals();
        design = new Set(['0,2','1,2','2,0','2,1','2,2','2,3','2,4','3,2','4,2']);
        updateDesignClues(); render();
        stats('-', '-'); nav(false);
    };

    window.solveNOPuzzleUI = () => {
        if (!window.solveNonogram) return stats('模块未加载', '-');
        // sync from DOM inputs into clueVals
        for (let r = 0; r < R; r++) { const inp = $('no-rc-' + r); if (inp) rowClueVals[r] = inp.value; }
        for (let c = 0; c < C; c++) { const inp = $('no-cc-' + c); if (inp) colClueVals[c] = inp.value; }
        const { rc, cc } = readClues();
        const t0 = performance.now();
        const res = window.solveNonogram({ rows: R, cols: C, rowClues: rc, colClues: cc });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showNOSolution(0); }
    };
    window.showNOSolution = d => {
        if (!solutions.length) return;
        solIdx = (solIdx + d + solutions.length) % solutions.length;
        const ctr = $('no-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        render();
    };
})();
