(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('statuepark-workspace', 'statuepark-layout',
        window.LogicUI.backButton('statuepark-workspace') +
        window.LogicUI.title('STATUE PARK', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('sp-rows', 'sp-cols', { rowVal: 8, colVal: 8, rowMin: 4, colMin: 4, rowMax: 15, colMax: 15 }) +
        `<div style="margin-bottom:1.2rem;display:flex;gap:10px;align-items:center;justify-content:center">
            <label style="color:var(--neon-cyan);font-size:.85rem;font-weight:700">形状集合:</label>
            <select id="sp-shape-set" style="background:rgba(0,0,0,.4);color:#fff;border:1px solid var(--neon-cyan);padding:6px 12px;border-radius:6px;font-family:inherit;font-size:.85rem">
                <option value="Pentominoes">Pentominoes (12)</option>
                <option value="Tetrominoes">Tetrominoes (5)</option>
            </select></div>` +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initStatueparkGrid && window.initStatueparkGrid()' },
            { label: '计算核心分析', onclick: 'window.solveStatueparkUI && window.solveStatueparkUI()', id: 'sp-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearStatueparkGrid && window.clearStatueparkGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleStatueparkExample && window.buildSimpleStatueparkExample()' }
        ]) +
        window.LogicUI.statsPanel('sp', { countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('sp', 'showStatueparkSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '点击格子切换：空 → ● 黑圆 → ○ 白圆 → 空',
            '● 必须被形状覆盖，○ 必须保持空白',
            '每个形状恰好放一次，可旋转翻转',
            '不同形状不能正交相邻（对角允许）',
            '未覆盖格子必须正交连通'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="sp-grid-container" style="position:relative;padding:12px;background:rgba(0,0,0,.5);border-radius:10px;border:1px solid #00ffe7;box-shadow:0 0 18px rgba(0,255,231,.2);display:inline-grid;user-select:none"></div>`,
        `#sp-grid-container{gap:1px}
        .sp-cell{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);cursor:pointer;position:relative;transition:background .2s}
        .sp-cell:hover{background:rgba(0,255,231,.1)}
        .sp-cell.circle-black::after{content:'';display:block;width:22px;height:22px;background:#111;border-radius:50%;border:2px solid #888;box-shadow:0 0 8px rgba(0,0,0,.8)}
        .sp-cell.circle-white::after{content:'';display:block;width:22px;height:22px;background:#fff;border-radius:50%;border:2px solid #555;box-shadow:0 0 8px rgba(255,255,255,.6)}
        .sp-cell.cell-occupied{box-shadow:inset 0 0 8px rgba(0,255,231,.3)}
        ${[0,1,2,3,4,5,6,7,8,9,10,11].map((i,_,__,colors=['255,60,60','60,220,60','80,80,255','255,220,40','40,220,220','220,60,220','200,100,50','50,200,100','100,50,200','200,200,50','50,200,200','200,50,200'])=>`.sp-cell.cell-shape-${i}{background:rgba(${colors[i]},.5)!important}`).join('\n        ')}`
    ));

    const $ = id => document.getElementById(id);
    let R = 8, C = 8, gridData, solutions = [], solIdx = 0, showing = false;
    const reset = () => { solutions = []; solIdx = 0; showing = false; };
    const stats = (c, t) => { const a = $('sp-solutionsCount'), b = $('sp-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('sp-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };

    function render() {
        const g = $('sp-grid-container'); if (!g) return; g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},40px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const cell = document.createElement('div');
            cell.className = 'sp-cell' + (gridData[r][c]===1?' circle-black':'') + (gridData[r][c]===2?' circle-white':'');
            cell.onclick = () => { if (showing) { reset(); nav(false); stats('-','-'); } gridData[r][c]=(gridData[r][c]+1)%3; render(); };
            if (showing && solutions[solIdx] && solutions[solIdx][r][c] !== -1) {
                cell.classList.add('cell-occupied', 'cell-shape-' + (solutions[solIdx][r][c] % 12));
            }
            g.appendChild(cell);
        }
    }

    window.initStatueparkGrid = () => {
        R = Math.max(4, Math.min(15, +($('sp-rows')||{}).value||8));
        C = Math.max(4, Math.min(15, +($('sp-cols')||{}).value||8));
        reset(); gridData = Array.from({length:R}, ()=>Array(C).fill(0)); render(); stats('-','-'); nav(false);
    };
    window.clearStatueparkGrid = () => { reset(); for(let r=0;r<R;r++) gridData[r].fill(0); render(); stats('-','-'); nav(false); };
    window.buildSimpleStatueparkExample = () => {
        R=8; C=8; const ri=$('sp-rows'),ci=$('sp-cols'); if(ri)ri.value=8; if(ci)ci.value=8;
        const ss=$('sp-shape-set'); if(ss)ss.value='Tetrominoes'; reset();
        gridData = Array.from({length:R}, ()=>Array(C).fill(0));
        gridData[1][1]=1; gridData[5][5]=1; gridData[0][4]=2; gridData[7][3]=2;
        render(); stats('-','-'); nav(false);
    };
    window.solveStatueparkUI = () => {
        if (!window.solveStatuePark) return stats('模块未加载','-');
        const btn=$('sp-solve-btn'); if(btn) btn.disabled=true; stats('正在求解...','-');
        setTimeout(() => {
            const t0=performance.now(), res=window.solveStatuePark({rows:R,cols:C,grid:gridData,shapeSet:($('sp-shape-set')||{}).value||'Pentominoes'});
            const ms=Math.round(performance.now()-t0)+'ms'; solutions=res.solutions||[];
            stats(res.timeout?solutions.length+'+ (超时)':(solutions.length||'未找到解'), ms);
            if(solutions.length){showing=true;solIdx=0;nav(true);window.showStatueparkSolution(0)} else{showing=false;nav(false)}
            if(btn)btn.disabled=false;
        }, 50);
    };
    window.showStatueparkSolution = delta => {
        if(!solutions.length)return; solIdx=(solIdx+delta+solutions.length)%solutions.length;
        const ctr=$('sp-solution-counter'); if(ctr) ctr.textContent=(solIdx+1)+' / '+solutions.length; showing=true; render();
    };
})();
