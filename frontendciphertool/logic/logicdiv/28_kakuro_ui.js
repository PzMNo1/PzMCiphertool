(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('kakuro-workspace', 'kakuro-layout',
        window.LogicUI.backButton('kakuro-workspace') +
        window.LogicUI.title('KAKURO', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('kakuro-rows', 'kakuro-cols', { rowVal: 8, colVal: 8, rowMin: 3, colMin: 3, rowMax: 15, colMax: 15 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initKakuroGrid && window.initKakuroGrid()' },
            { label: '计算核心分析', onclick: 'window.solveKakuroPuzzleUI && window.solveKakuroPuzzleUI()', id: 'kakuro-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearKakuroGrid && window.clearKakuroGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleKakuroExample && window.buildSimpleKakuroExample()' }
        ]) +
        window.LogicUI.statsPanel('kakuro', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('kakuro', 'showKakuroSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '右键点击任意格: 切换 黑格 ↔ 白格',
            '左键点击白格: 直接输入数字 (1-9)',
            '左键点击黑格: 输入线索 (竖向和/横向和)',
            '连续白格的和必须等于线索数字，同一段内不重复'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="kakuro-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;"></div>`,
        `#kakuro-grid-container{gap:1px}
        .kakuro-cell{width:45px;height:45px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);position:relative;font-size:1.2rem;color:var(--neon-cyan,#00ffe7)}
        .kakuro-cell:hover{background:rgba(0,255,231,.1)}
        .kakuro-cell.black{background:#1a1a2e;border-color:#333;background-image:linear-gradient(to top right,transparent 47%,rgba(0,255,231,.25) 48%,rgba(0,255,231,.25) 52%,transparent 53%)}
        .kakuro-cell.white{background:rgba(255,255,255,.05)}
        .kakuro-cell.white.editing{background:rgba(0,255,231,.15);outline:2px solid var(--neon-cyan,#00ffe7);z-index:10}
        .kakuro-clue{position:absolute;font-size:.7rem;color:#ccc;font-weight:700;line-height:1;text-shadow:0 0 4px rgba(0,255,231,.4)}
        .kakuro-clue.down{bottom:3px;left:3px}.kakuro-clue.across{top:3px;right:3px}
        .kakuro-cell input.ki{width:100%;height:100%;border:0;background:0 0;color:var(--neon-cyan,#00ffe7);text-align:center;font-size:1.1rem;font-weight:700;outline:0;padding:0;margin:0}
        .kakuro-cell input.ki::placeholder{color:rgba(0,255,231,.2)}
        .kakuro-cell.sol{color:#72f1b8;text-shadow:0 0 8px rgba(114,241,184,.5);font-weight:700}`
    ));

    const $ = id => document.getElementById(id);
    const B = (d, a) => ({ type: 'black', down: d, across: a });
    const W = () => ({ type: 'white', val: null });

    let R = 8, C = 8, grid = [], solutions = [], solIdx = 0, showing = false;

    function reset() { solutions = []; solIdx = 0; showing = false; }
    function stats(c, t) { const a = $('kakuro-solutionsCount'), b = $('kakuro-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; }
    function nav(show) { const n = $('kakuro-solution-nav'); if (n) n.style.display = show ? 'flex' : 'none'; }

    function readSize() {
        const ri = $('kakuro-rows'), ci = $('kakuro-cols');
        if (ri && ci) { R = Math.max(3, Math.min(15, parseInt(ri.value) || 8)); C = Math.max(3, Math.min(15, parseInt(ci.value) || 8)); ri.value = R; ci.value = C; }
    }

    function emptyGrid() {
        grid = Array.from({ length: R }, () => Array.from({ length: C }, W));
        for (let c = 0; c < C; c++) grid[0][c] = B(null, null);
        for (let r = 0; r < R; r++) grid[r][0] = B(null, null);
    }

    function clueSpan(cls, val) { const s = document.createElement('span'); s.className = 'kakuro-clue ' + cls; s.textContent = val; return s; }

    function paint(el, r, c) {
        el.innerHTML = ''; el.className = 'kakuro-cell';
        const d = grid[r][c];
        if (d.type === 'black') {
            el.classList.add('black');
            if (d.down != null) el.appendChild(clueSpan('down', d.down));
            if (d.across != null) el.appendChild(clueSpan('across', d.across));
        } else {
            el.classList.add('white');
            if (showing && solutions.length) { const v = solutions[solIdx]?.[r]?.[c]; if (v) { el.classList.add('sol'); el.textContent = v; } }
            else if (d.val != null) el.textContent = d.val;
        }
    }

    function render() {
        const ct = $('kakuro-grid-container'); if (!ct) return;
        ct.innerHTML = '';
        ct.style.gridTemplateColumns = `repeat(${C},45px)`;
        ct.style.gridTemplateRows = `repeat(${R},45px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div');
            cell.className = 'kakuro-cell'; cell.dataset.r = r; cell.dataset.c = c;
            paint(cell, r, c);
            bindCell(cell, r, c);
            ct.appendChild(cell);
        }
    }

    function bindCell(cell, r, c) {
        cell.addEventListener('click', () => {
            if (showing) return;
            const d = grid[r][c];
            if (d.type === 'white') {
                if (cell.querySelector('input.ki')) return;
                cell.classList.add('editing'); cell.textContent = '';
                const inp = document.createElement('input');
                inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'ki'; inp.maxLength = 1; inp.placeholder = '-';
                if (d.val != null) inp.value = d.val;
                cell.appendChild(inp); inp.focus(); inp.select();
                const commit = () => { const n = parseInt(inp.value); grid[r][c].val = (n >= 1 && n <= 9) ? n : null; cell.classList.remove('editing'); paint(cell, r, c); };
                inp.addEventListener('blur', commit, { once: true });
                inp.addEventListener('keydown', ev => {
                    if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
                    else if (ev.key === 'Escape') { inp.value = d.val ?? ''; inp.blur(); }
                    else if (ev.key.length === 1 && !/[1-9]/.test(ev.key)) ev.preventDefault();
                });
            } else openClueEditor(cell, r, c, d);
        });
        cell.addEventListener('contextmenu', e => {
            e.preventDefault(); if (showing) return;
            grid[r][c] = grid[r][c].type === 'white' ? B(null, null) : W();
            paint(cell, r, c);
        });
    }

    function openClueEditor(cell, r, c, d) {
        if ($('kakuro-clue-editor')) return;
        const ov = document.createElement('div');
        ov.id = 'kakuro-clue-editor';
        ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.15);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)';
        const iStyle = 'width:100%;padding:6px 8px;background:#111;border:1px solid #333;color:#00ffe7;border-radius:4px;font-size:1rem;box-sizing:border-box';
        ov.innerHTML = `<div style="background:rgba(15,20,40,.55);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);border:1px solid rgba(0,255,231,.3);border-radius:12px;padding:22px 24px;min-width:240px;box-shadow:0 8px 32px rgba(0,0,0,.35),0 0 20px rgba(0,255,231,.12),inset 0 1px 0 rgba(255,255,255,.06)">
            <div style="color:#00ffe7;font-weight:700;margin-bottom:12px;font-size:.95rem">编辑线索</div>
            <label style="color:#ccc;font-size:.85rem;display:block;margin-bottom:4px">↓ 竖向线索</label>
            <input id="kc-d" type="text" inputmode="numeric" value="${d.down ?? ''}" style="${iStyle};margin-bottom:10px" placeholder="留空则无">
            <label style="color:#ccc;font-size:.85rem;display:block;margin-bottom:4px">→ 横向线索</label>
            <input id="kc-a" type="text" inputmode="numeric" value="${d.across ?? ''}" style="${iStyle};margin-bottom:14px" placeholder="留空则无">
            <div style="display:flex;gap:8px;justify-content:flex-end">
                <button id="kc-no" class="cyber-button" style="padding:4px 14px;min-height:28px;font-size:.85rem"><span class="cyber-button__tag">取消</span></button>
                <button id="kc-ok" class="cyber-button cyber-glow" style="padding:4px 14px;min-height:28px;font-size:.85rem"><span class="cyber-button__tag">确定</span></button>
            </div></div>`;
        document.body.appendChild(ov);
        const di = $('kc-d'), ai = $('kc-a');
        di.focus(); di.select();
        const close = () => ov.remove();
        const save = () => { const dv = di.value.trim(), av = ai.value.trim(); grid[r][c].down = (dv && !isNaN(dv)) ? +dv : null; grid[r][c].across = (av && !isNaN(av)) ? +av : null; close(); paint(cell, r, c); };
        $('kc-ok').onclick = save; $('kc-no').onclick = close;
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
        ai.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
        di.addEventListener('keydown', e => { if (e.key === 'Enter') ai.focus(); });
    }

    /* ── 公共 API ── */
    window.initKakuroGrid = () => { readSize(); reset(); emptyGrid(); render(); stats('-', '-'); nav(false); };
    window.clearKakuroGrid = () => { reset(); emptyGrid(); render(); stats('-', '-'); nav(false); };

    window.buildSimpleKakuroExample = () => {
        R = 3; C = 3;
        const ri = $('kakuro-rows'), ci = $('kakuro-cols');
        if (ri) ri.value = 3; if (ci) ci.value = 3;
        reset();
        // 唯一解: [1,2],[3,4] — col1:4✓ col2:6✓ row1:3✓ row2:7✓
        grid = [
            [B(null, null), B(4, null), B(6, null)],
            [B(null, 3),    W(),        W()       ],
            [B(null, 7),    W(),        W()       ]
        ];
        render(); stats('-', '-'); nav(false);
    };

    window.solveKakuroPuzzleUI = () => {
        if (!window.solveKakuro) return stats('模块未加载', '-');
        let whites = 0;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (grid[r][c].type === 'white') whites++;
        if (!whites) return stats('需要至少1个白格', '-');
        const t0 = performance.now();
        const res = window.solveKakuro({ rows: R, cols: C, grid });
        const ms = Math.round(performance.now() - t0) + 'ms';
        solutions = res.solutions || [];
        stats(res.timeout ? solutions.length + '+ (超时)' : (solutions.length || '未找到解'), ms);
        if (solutions.length) { showing = true; solIdx = 0; nav(true); window.showKakuroSolution(0); }
    };

    window.showKakuroSolution = delta => {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const ctr = $('kakuro-solution-counter'); if (ctr) ctr.textContent = (solIdx + 1) + ' / ' + solutions.length;
        const ct = $('kakuro-grid-container'); if (ct) ct.querySelectorAll('.kakuro-cell').forEach(c => paint(c, +c.dataset.r, +c.dataset.c));
    };
})();
