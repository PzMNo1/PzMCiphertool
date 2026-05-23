(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('skyscrapers-workspace', 'skyscrapers-layout',
        window.LogicUI.backButton('skyscrapers-workspace') +
        window.LogicUI.title('SKYSCRAPERS', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.singleSizeInput('sky-size', { val: 4, min: 3, max: 9, placeholder: '尺寸 N' }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initSkyscrapersGrid && window.initSkyscrapersGrid()' },
            { label: '计算核心分析', onclick: 'window.solveSkyscrapersUI && window.solveSkyscrapersUI()', id: 'sky-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearSkyscrapersGrid && window.clearSkyscrapersGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleSkyscrapersExample && window.buildSimpleSkyscrapersExample()' }
        ]) +
        window.LogicUI.statsPanel('sky', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('sky', 'showSkyscrapersSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '在 N×N 网格中填入 1~N，每行每列不重复',
            '外围线索 = 从该方向能看到几栋摩天楼',
            '点击格子后用数字键盘或键盘输入，尺寸 3~9'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="sky-grid-container"></div>`,
        `#sky-grid-container{display:inline-grid;gap:0;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);user-select:none}
        .sky-cell{width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;font-weight:700;cursor:pointer;border-radius:3px;transition:all .2s}
        .sky-cell.corner{visibility:hidden;cursor:default}
        .sky-cell.clue-cell{background:0 0;color:var(--hologram-purple,#b388ff);text-shadow:0 0 5px rgba(179,136,255,.5)}
        .sky-cell.clue-cell:hover{background:rgba(179,136,255,.1)}
        .sky-cell.inner-cell{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--neon-cyan,#00ffe7)}
        .sky-cell.inner-cell:hover{background:rgba(0,255,231,.08)}
        .sky-cell.active{background:rgba(0,243,255,.15)!important;border:1px solid var(--neon-cyan)!important;box-shadow:0 0 10px rgba(0,243,255,.2)}
        .sky-cell.fixed{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .sky-cell.solved{color:#0f0;text-shadow:0 0 8px rgba(0,255,0,.5)}
        .sky-np{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:10px}
        .sky-np button{padding:6px 12px;min-width:36px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#fff;cursor:pointer;border-radius:6px;transition:background .2s}
        .sky-np button:hover{background:rgba(255,255,255,.15);border-color:var(--neon-cyan)}`
    ));

    const $ = id => document.getElementById(id);
    let N = 4, cells = [], sel = null, sols = [], idx = 0, showing = false;
    const reset = () => { sols = []; idx = 0; showing = false; };
    const st = (c, t) => { const a = $('sky-solutionsCount'), b = $('sky-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nv = v => { const e = $('sky-solution-nav'); if (e) e.style.display = v ? 'flex' : 'none'; };
    const rdSz = () => { const s = $('sky-size'); if (s) { N = Math.max(3, Math.min(9, +s.value || 4)); s.value = N; } };

    function setClue(r, c, v) { const d = cells[r][c]; d.val = v; d.dom.textContent = v; d.dom.classList.add('fixed'); }

    function render() {
        const g = $('sky-grid-container'); if (!g) return;
        g.innerHTML = ''; const T = N + 2;
        g.style.gridTemplateColumns = `repeat(${T},42px)`; g.style.gridTemplateRows = `repeat(${T},42px)`;
        cells = [];
        for (let r = 0; r < T; r++) { cells[r] = []; for (let c = 0; c < T; c++) {
            const d = document.createElement('div'); d.className = 'sky-cell';
            const isClue = ((r === 0 || r === N + 1) && c > 0 && c < N + 1) || ((c === 0 || c === N + 1) && r > 0 && r < N + 1);
            const isInner = r > 0 && r < N + 1 && c > 0 && c < N + 1;
            const type = isInner ? 'inner' : isClue ? 'clue' : 'corner';
            d.classList.add(type === 'inner' ? 'inner-cell' : type === 'clue' ? 'clue-cell' : 'corner');
            const cd = { r, c, type, val: null, dom: d };
            if (type !== 'corner') d.onclick = () => { if (sel) sel.dom.classList.remove('active'); sel = cd; d.classList.add('active'); };
            g.appendChild(d); cells[r][c] = cd;
        }}
        /* numpad */
        const old = g.parentNode.querySelector('.sky-np'); if (old) old.remove();
        const np = document.createElement('div'); np.className = 'sky-np';
        for (let v = 1; v <= N; v++) { const b = document.createElement('button'); b.textContent = v; b.onclick = () => setNum(v); np.appendChild(b); }
        const cb = document.createElement('button'); cb.textContent = 'C'; cb.onclick = () => setNum(null); np.appendChild(cb);
        g.parentNode.appendChild(np);
    }

    function setNum(v) {
        if (!sel || sel.type === 'corner' || showing) return;
        sel.val = v; sel.dom.textContent = v == null ? '' : v;
        if (v != null) { sel.dom.classList.add('fixed'); sel.dom.classList.remove('solved'); } else sel.dom.classList.remove('fixed');
    }

    function kbHandler(e) {
        if (!sel) return;
        if (e.key >= '1' && e.key <= '9') { if (+e.key <= N) setNum(+e.key); }
        else if ('Backspace Delete 0'.split(' ').includes(e.key) || e.key.toLowerCase() === 'c') setNum(null);
        else if (e.key.startsWith('Arrow')) {
            e.preventDefault(); let { r, c } = sel;
            if (e.key === 'ArrowUp') r--; else if (e.key === 'ArrowDown') r++; else if (e.key === 'ArrowLeft') c--; else if (e.key === 'ArrowRight') c++;
            if (cells[r] && cells[r][c] && cells[r][c].type !== 'corner') { sel.dom.classList.remove('active'); sel = cells[r][c]; sel.dom.classList.add('active'); }
        }
    }

    function showSol(sol) {
        if (!sol) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            const cell = cells[r + 1][c + 1]; cell.dom.textContent = sol[r][c]; if (cell.val === null) cell.dom.classList.add('solved');
        }
    }

    window.initSkyscrapersGrid = () => { rdSz(); reset(); sel = null; render(); document.removeEventListener('keydown', kbHandler); document.addEventListener('keydown', kbHandler); st('-', '-'); nv(false); };
    window.clearSkyscrapersGrid = () => { reset(); for (let r = 1; r <= N; r++) for (let c = 1; c <= N; c++) { const d = cells[r][c]; d.val = null; d.dom.textContent = ''; d.dom.classList.remove('fixed', 'solved'); } st('-', '-'); nv(false); };

    window.buildSimpleSkyscrapersExample = () => {
        N = 4; const s = $('sky-size'); if (s) s.value = 4; reset(); sel = null; render();
        // Sol: 2 1 4 3 / 3 4 1 2 / 4 3 2 1 / 1 2 3 4
        [3,2,1,2].forEach((v, j) => setClue(0, j + 1, v));
        [2,3,2,1].forEach((v, j) => setClue(N + 1, j + 1, v));
        [2,2,1,4].forEach((v, i) => setClue(i + 1, 0, v));
        [2,2,4,1].forEach((v, i) => setClue(i + 1, N + 1, v));
        st('-', '-'); nv(false);
    };

    window.solveSkyscrapersUI = () => {
        if (!window.solveSkyscrapers) return st('模块未加载', '-');
        const clues = { top: [], bottom: [], left: [], right: [] }, fixed = {};
        for (let j = 1; j <= N; j++) { clues.top.push(cells[0][j].val); clues.bottom.push(cells[N + 1][j].val); }
        for (let i = 1; i <= N; i++) { clues.left.push(cells[i][0].val); clues.right.push(cells[i][N + 1].val); }
        for (let r = 1; r <= N; r++) for (let c = 1; c <= N; c++) if (cells[r][c].val != null) fixed[(r-1)+','+(c-1)] = cells[r][c].val;
        const t0 = performance.now(), res = window.solveSkyscrapers({ n: N, clues, fixed }), ms = Math.round(performance.now() - t0) + 'ms';
        sols = res.solutions || [];
        st(res.timeout ? sols.length + '+ (超时)' : (sols.length || '未找到解'), ms);
        if (sols.length) { showing = true; idx = 0; nv(true); window.showSkyscrapersSolution(0); }
    };

    window.showSkyscrapersSolution = delta => {
        if (!sols.length) return;
        idx = (idx + delta + sols.length) % sols.length;
        const ctr = $('sky-solution-counter'); if (ctr) ctr.textContent = (idx + 1) + ' / ' + sols.length;
        for (let r = 1; r <= N; r++) for (let c = 1; c <= N; c++) { const d = cells[r][c]; d.dom.classList.remove('solved'); d.dom.textContent = d.val != null ? d.val : ''; }
        showSol(sols[idx]);
    };
})();
