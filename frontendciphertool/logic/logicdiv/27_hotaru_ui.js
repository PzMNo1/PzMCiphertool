(function() {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('hotaru-workspace', 'hotaru-layout',
        // Left
        window.LogicUI.backButton('hotaru-workspace') +
        window.LogicUI.title('HOTARU BEAM', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('hotaru-rows', 'hotaru-cols', { rowVal: 7, colVal: 7 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initHotaruGrid && window.initHotaruGrid()' },
            { label: '计算核心分析', onclick: 'window.solveHotaruPuzzleUI && window.solveHotaruPuzzleUI()', id: 'hotaru-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearHotaruGrid && window.clearHotaruGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleHotaruExample && window.buildSimpleHotaruExample()' }
        ]) +
        window.LogicUI.statsPanel('hotaru', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('hotaru', 'showHotaruSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '左键点击格子: 添加/切换圆点方向 (上→右→下→左→无)',
            '左键点击圆点数字: 输入光束转弯次数',
            '右键点击圆点: 删除圆点',
            '从每个圆点按箭头方向发射光束，光束可直行或90°转弯',
            '光束遇到另一个圆点停止，数字表示转弯次数 (空=任意)',
            '所有圆点必须由光束连通，路径不能交叉'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),

        // Right
        `<div id="hotaru-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;"></div>`,

        // CSS
        `.hotaru-cell { width:40px; height:40px; border:1px solid #333; background:#111; position:relative; }
        .hotaru-cell:hover { background:#1a2a2a; }
        .hotaru-dot { width:28px; height:28px; border-radius:50%; background:radial-gradient(circle at 35% 35%,#fff,#999); position:absolute; top:5px; left:5px; display:flex; justify-content:center; align-items:center; box-shadow:0 0 6px rgba(255,255,255,0.5); z-index:2; }
        .hotaru-dot span { color:#000; font-weight:bold; font-size:13px; cursor:pointer; }
        .hotaru-dot::after { content:''; position:absolute; width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-bottom:7px solid #00ffe7; }
        .dir-u::after { top:-4px; }
        .dir-r::after { right:-4px; transform:rotate(90deg); }
        .dir-d::after { bottom:-4px; transform:rotate(180deg); }
        .dir-l::after { left:-4px; transform:rotate(270deg); }
        .beam-seg { position:absolute; background:#00ffe7; box-shadow:0 0 8px #00ffe7; z-index:1; }
        .beam-h { top:17px; left:0; width:40px; height:6px; }
        .beam-v { top:0; left:17px; width:6px; height:40px; }
        .beam-turn-ul { top:0;left:0;width:20px;height:20px;border-right:3px solid #00ffe7;border-bottom:3px solid #00ffe7;border-radius:0 0 6px 0;background:transparent;box-shadow:3px 3px 6px rgba(0,255,231,0.3); }
        .beam-turn-ur { top:0;right:0;width:20px;height:20px;border-left:3px solid #00ffe7;border-bottom:3px solid #00ffe7;border-radius:0 0 0 6px;background:transparent;box-shadow:-3px 3px 6px rgba(0,255,231,0.3); }
        .beam-turn-dl { bottom:0;left:0;width:20px;height:20px;border-right:3px solid #00ffe7;border-top:3px solid #00ffe7;border-radius:0 6px 0 0;background:transparent;box-shadow:3px -3px 6px rgba(0,255,231,0.3); }
        .beam-turn-dr { bottom:0;right:0;width:20px;height:20px;border-left:3px solid #00ffe7;border-top:3px solid #00ffe7;border-radius:6px 0 0 0;background:transparent;box-shadow:-3px -3px 6px rgba(0,255,231,0.3); }`
    ));

    let R = 7, C = 7;
    let grid = [];       // null | { dir:'u'|'r'|'d'|'l', num:number|null }
    let solutions = [];
    let solIdx = 0;
    let showing = false;

    window.initHotaruGrid = function() {
        const ri = document.getElementById('hotaru-rows');
        const ci = document.getElementById('hotaru-cols');
        if (ri && ci) { R = Math.max(3, Math.min(15, parseInt(ri.value)||7)); C = Math.max(3, Math.min(15, parseInt(ci.value)||7)); ri.value=R; ci.value=C; }
        solutions = []; solIdx = 0; showing = false;
        grid = Array(R).fill().map(() => Array(C).fill(null));
        render();
        updateStats('-', '-');
    };

    window.clearHotaruGrid = function() {
        showing = false; solutions = [];
        grid = Array(R).fill().map(() => Array(C).fill(null));
        render(); updateStats('-', '-');
    };

    window.buildSimpleHotaruExample = function() {
        const ri = document.getElementById('hotaru-rows');
        const ci = document.getElementById('hotaru-cols');
        if (ri) ri.value = 5; if (ci) ci.value = 5;
        R = 5; C = 5;
        solutions = []; solIdx = 0; showing = false;
        grid = Array(R).fill().map(() => Array(C).fill(null));
        // 预设一个有解的 5×5 矩形环路示例 (0转弯=直线连接)
        grid[0][0] = { dir:'r', num:0 };
        grid[0][4] = { dir:'d', num:0 };
        grid[4][4] = { dir:'l', num:0 };
        grid[4][0] = { dir:'u', num:0 };
        render(); updateStats('-', '-');
    };

    function render() {
        const ct = document.getElementById('hotaru-grid-container');
        if (!ct) return;
        ct.innerHTML = '';
        ct.style.gridTemplateColumns = `repeat(${C}, 40px)`;
        ct.style.gridTemplateRows = `repeat(${R}, 40px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div');
            cell.className = 'hotaru-cell';
            cell.dataset.r = r; cell.dataset.c = c;
            paintCell(cell, r, c);

            cell.addEventListener('click', function(e) {
                if (showing) return;
                if (e.target.tagName === 'SPAN') {
                    const cur = grid[r][c].num;
                    const v = prompt('输入转弯次数 (留空=任意):', cur !== null ? cur : '');
                    if (v !== null) {
                        grid[r][c].num = (v.trim() === '' || isNaN(v)) ? null : Math.max(0, parseInt(v));
                        paintCell(cell, r, c);
                    }
                    return;
                }
                const dirs = ['u','r','d','l'];
                if (!grid[r][c]) { grid[r][c] = { num:null, dir:'u' }; }
                else { const i = dirs.indexOf(grid[r][c].dir); grid[r][c] = i===3 ? null : { num:grid[r][c].num, dir:dirs[i+1] }; }
                paintCell(cell, r, c);
            });

            cell.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                if (showing) return;
                if (grid[r][c]) { grid[r][c] = null; paintCell(cell, r, c); }
            });

            ct.appendChild(cell);
        }
    }

    function paintCell(el, r, c) {
        el.innerHTML = '';
        if (grid[r][c]) {
            const dot = document.createElement('div');
            dot.className = 'hotaru-dot dir-' + grid[r][c].dir;
            const sp = document.createElement('span');
            if (grid[r][c].num !== null) sp.textContent = grid[r][c].num;
            dot.appendChild(sp); el.appendChild(dot);
        }
        if (showing && solutions.length) {
            const t = solutions[solIdx][r][c];
            if (t) { const b = document.createElement('div'); b.className = (t==='h'||t==='v') ? 'beam-seg beam-'+t : 'beam-seg beam-turn-'+t; el.appendChild(b); }
        }
    }

    window.solveHotaruPuzzleUI = function() {
        if (!window.solveHotaru) { updateStats('模块未加载', '-'); return; }
        let dots = 0;
        for (let r=0;r<R;r++) for (let c=0;c<C;c++) if (grid[r][c]) dots++;
        if (dots < 2) { updateStats('至少需要2个圆点', '-'); return; }

        const t0 = performance.now();
        const res = window.solveHotaru({ rows:R, cols:C, grid });
        const elapsed = Math.round(performance.now()-t0) + 'ms';

        solutions = res.solutions || [];
        if (res.timeout) updateStats(solutions.length + '+ (超时中断)', elapsed);
        else updateStats(solutions.length || '未找到解', elapsed);

        if (solutions.length) {
            showing = true; solIdx = 0;
            const nav = document.getElementById('hotaru-solution-nav');
            if (nav) nav.style.display = 'flex';
            window.showHotaruSolution(0);
        }
    };

    window.showHotaruSolution = function(delta) {
        if (!solutions.length) return;
        solIdx = (solIdx + delta + solutions.length) % solutions.length;
        const counter = document.getElementById('hotaru-solution-counter');
        if (counter) counter.textContent = (solIdx+1) + ' / ' + solutions.length;
        const ct = document.getElementById('hotaru-grid-container');
        if (ct) ct.querySelectorAll('.hotaru-cell').forEach(cell => paintCell(cell, +cell.dataset.r, +cell.dataset.c));
    };

    function updateStats(cnt, time) {
        const a = document.getElementById('hotaru-solutionsCount');
        const b = document.getElementById('hotaru-timeElapsed');
        if (a) a.textContent = cnt;
        if (b) b.textContent = time;
    }
})();
