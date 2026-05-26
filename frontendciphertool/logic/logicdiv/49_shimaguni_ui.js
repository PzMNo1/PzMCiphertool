(function () {
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('shimaguni-workspace', 'shimaguni-layout',
        window.LogicUI.backButton('shimaguni-workspace') +
        window.LogicUI.title('SHIMAGUNI', { color: 'var(--neon-cyan)' }) +
        window.LogicUI.sizeInputs('smg-rows', 'smg-cols', { rowVal: 6, colVal: 6, rowMin: 2, colMin: 2, rowMax: 12, colMax: 12 }) +
        window.LogicUI.actionGrid4([
            { label: '重置网格', onclick: 'window.initShimaguniGrid&&window.initShimaguniGrid()' },
            { label: '计算核心分析', onclick: 'window.solveShimaguniUI&&window.solveShimaguniUI()', id: 'smg-solve-btn', glow: true },
            { label: '清空填涂', onclick: 'window.clearShimaguniGrid&&window.clearShimaguniGrid()' },
            { label: '简单示例', onclick: 'window.buildSimpleShimaguniExample&&window.buildSimpleShimaguniExample()' }
        ]) +
        `<div style="margin-bottom:1.5rem;display:flex;gap:10px"><button class="cyber-button" style="flex:1" id="smg-mode-btn" onclick="window.toggleShimaguniMode&&window.toggleShimaguniMode()"><span class="cyber-button__tag">模式: 编辑边界</span></button></div>` +
        window.LogicUI.statsPanel('smg', { countLabel: '解记录数', timeLabel: 'AI thinking耗时', accent: '#00e5ff' }) +
        window.LogicUI.solutionNav('smg', 'showShimaguniSolution', { accent: 'var(--neon-cyan)' }) +
        window.LogicUI.instructions([
            '边界模式: 拖拽网格线绘制区域',
            '线索模式: 点击格子输入涂色数',
            '区域内涂色格正交连通，跨边界不能相邻涂色',
            '相邻区域涂色数量不同，最大 12×12'
        ], { accent: 'var(--neon-cyan)', title: '系统法则' }),
        `<div id="smg-grid-container" style="position:relative;padding:10px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,0.2);display:inline-grid;user-select:none"></div>`,
        `#smg-grid-container{gap:0}
        .smg-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative}
        .smg-cell:hover{background:rgba(0,255,231,.08)}
        .smg-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .smg-cell.shaded-sol{background:rgba(64,224,255,.3);box-shadow:0 0 15px rgba(64,224,255,.2) inset}
        .smg-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}
        .smg-cell.bt{border-top:3px solid var(--neon-cyan)}.smg-cell.bb{border-bottom:3px solid var(--neon-cyan)}.smg-cell.bl{border-left:3px solid var(--neon-cyan)}.smg-cell.br{border-right:3px solid var(--neon-cyan)}
        .smg-cell input.ki{width:100%;height:100%;border:0;background:0 0;color:#fff;text-align:center;font-size:.95rem;font-weight:700;outline:0;padding:0;margin:0}
        .smg-line{position:absolute;z-index:50;cursor:pointer;transition:background .15s}
        .smg-line.h-line{height:7px;background:rgba(255,255,255,.08)}
        .smg-line.v-line{width:7px;background:rgba(255,255,255,.08)}
        .smg-line:hover{background:#00ffe7!important;box-shadow:0 0 6px #00ffe7!important}
        .smg-line.active{background:#00ffe7!important;box-shadow:0 0 5px #00ffe7,0 0 2px #00ffe7 inset!important}`
    ));

    const $ = id => document.getElementById(id);
    let R = 6, C = 6, clues = {}, hB = [], vB = [], mode = 'edit', sols = [], si = 0, showing = false, dragging = false, dragVal = true;
    const reset = () => { sols = []; si = 0; showing = false; };
    const stat = (c, t) => { const a = $('smg-solutionsCount'), b = $('smg-timeElapsed'); if (a) a.textContent = c; if (b) b.textContent = t; };
    const nav = v => { const n = $('smg-solution-nav'); if (n) n.style.display = v ? 'flex' : 'none'; };
    const rdSz = () => { const ri = $('smg-rows'), ci = $('smg-cols'); if (ri && ci) { R = Math.max(2, Math.min(12, +ri.value || 6)); C = Math.max(2, Math.min(12, +ci.value || 6)); ri.value = R; ci.value = C; } };
    const mkB = () => { hB = Array.from({ length: R }, () => Array(C).fill(false)); vB = Array.from({ length: R }, () => Array(C).fill(false)); };

    function borders(el, r, c) {
        el.classList.remove('bt', 'bb', 'bl', 'br');
        if (r === 0 || hB[r - 1]?.[c]) el.classList.add('bt');
        if (r === R - 1 || hB[r]?.[c]) el.classList.add('bb');
        if (c === 0 || vB[r]?.[c - 1]) el.classList.add('bl');
        if (c === C - 1 || vB[r]?.[c]) el.classList.add('br');
    }

    function buildRooms() {
        const vis = Array.from({ length: R }, () => Array(C).fill(false)), rooms = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            if (vis[r][c]) continue;
            const room = [], q = [[r, c]]; vis[r][c] = true;
            while (q.length) {
                const [cr, cc] = q.pop(); room.push(cr * C + cc);
                [[cr-1,cc,cr-1,cc,'h'],[cr+1,cc,cr,cc,'h'],[cr,cc-1,cr,cc-1,'v'],[cr,cc+1,cr,cc,'v']].forEach(([nr,nc,br,bc,t]) => {
                    if (nr<0||nr>=R||nc<0||nc>=C||vis[nr][nc]) return;
                    if (t==='h'&&hB[br][bc]) return; if (t==='v'&&vB[br][bc]) return;
                    vis[nr][nc]=true; q.push([nr,nc]);
                });
            }
            rooms.push(room);
        }
        return rooms;
    }

    function render() {
        const g = $('smg-grid-container'); if (!g) return; g.innerHTML = '';
        g.style.gridTemplateColumns = `repeat(${C},42px)`; g.style.gridTemplateRows = `repeat(${R},42px)`;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const el = document.createElement('div'), k = r+','+c;
            el.className = 'smg-cell'; el.dataset.r = r; el.dataset.c = c;
            borders(el, r, c);
            if (k in clues) { el.classList.add('clue'); el.textContent = clues[k]; }
            el.onclick = () => {
                if (mode !== 'number' || showing) return;
                el.classList.add('editing');
                const inp = Object.assign(document.createElement('input'), { type:'text', inputMode:'numeric', className:'ki', maxLength:2 });
                if (k in clues) inp.value = clues[k];
                el.textContent = ''; el.appendChild(inp); inp.focus();
                const commit = () => { const n = parseInt(inp.value); n > 0 ? clues[k] = n : delete clues[k]; el.classList.remove('editing'); render(); };
                inp.addEventListener('blur', commit, { once: true });
                inp.onkeydown = e => { if (e.key==='Enter') inp.blur(); else if (e.key==='Escape') { inp.value=''; inp.blur(); } };
            };
            g.appendChild(el);
        }
        if (mode === 'edit') drawLines(g);
        if (showing && sols[si]) g.querySelectorAll('.smg-cell').forEach(el => {
            if (sols[si][+el.dataset.r][+el.dataset.c] === 1) el.classList.add('shaded-sol');
        });
    }

    function drawLines(g) {
        const cs = 42, pad = 10, mk = (t, r, c, css) => {
            const ln = document.createElement('div'); ln.className = `smg-line ${t}-line`;
            if ((t==='h'?hB:vB)[r][c]) ln.classList.add('active');
            ln.style.cssText = css;
            ln.onmousedown = e => { e.preventDefault(); e.stopPropagation(); const a=t==='h'?hB:vB; a[r][c]=!a[r][c]; dragging=true; dragVal=a[r][c]; ln.classList.toggle('active',a[r][c]); updB(); };
            ln.onmouseenter = () => { if(!dragging)return; (t==='h'?hB:vB)[r][c]=dragVal; ln.classList.toggle('active',dragVal); updB(); };
            g.appendChild(ln);
        };
        for (let r=0;r<R-1;r++) for (let c=0;c<C;c++) mk('h',r,c,`left:${pad+c*cs}px;top:${pad+(r+1)*cs-3}px;width:${cs}px`);
        for (let r=0;r<R;r++) for (let c=0;c<C-1;c++) mk('v',r,c,`left:${pad+(c+1)*cs-3}px;top:${pad+r*cs}px;height:${cs}px`);
    }

    function updB() { const g=$('smg-grid-container'); if(g) g.querySelectorAll('.smg-cell').forEach(el=>borders(el,+el.dataset.r,+el.dataset.c)); }
    document.addEventListener('mouseup', () => dragging = false);

    const modeBtn = () => { const b=$('smg-mode-btn'); if(b) b.querySelector('.cyber-button__tag').textContent = mode==='edit'?'模式: 编辑边界':'模式: 输入线索'; };
    window.toggleShimaguniMode = () => { mode = mode==='edit'?'number':'edit'; modeBtn(); render(); };
    window.initShimaguniGrid = () => { rdSz(); reset(); clues={}; mkB(); mode='edit'; modeBtn(); render(); stat('-','-'); nav(false); };
    window.clearShimaguniGrid = () => { reset(); clues={}; render(); stat('-','-'); nav(false); };

    window.buildSimpleShimaguniExample = () => {
        R=4; C=4; const ri=$('smg-rows'), ci=$('smg-cols'); if(ri) ri.value=4; if(ci) ci.value=4;
        reset(); clues={}; mode='edit'; mkB();
        hB[1][0]=hB[1][1]=hB[1][2]=hB[1][3]=true;
        vB[0][1]=vB[1][1]=vB[2][1]=vB[3][1]=true;
        clues['0,0']=2; clues['2,3']=1;
        render(); stat('-','-'); nav(false);
    };

    window.solveShimaguniUI = () => {
        if (!window.solveShimaguni) return stat('模块未加载','-');
        const rooms = buildRooms();
        if (!rooms.length) return stat('请先绘制区域','-');
        const t0 = performance.now(), r = window.solveShimaguni({ rows:R, cols:C, rooms, clues });
        const ms = LogicUI.formatElapsed(performance.now() - t0);
        sols = r.solutions||[];
        stat(r.timeout ? sols.length+'+ (超时)' : (sols.length||'未找到解'), ms);
        if (sols.length) { showing=true; si=0; nav(true); window.showShimaguniSolution(0); }
    };

    window.showShimaguniSolution = d => {
        if (!sols.length) return;
        si = (si+d+sols.length)%sols.length;
        const c=$('smg-solution-counter'); if(c) c.textContent=(si+1)+' / '+sols.length;
        render();
    };
})();
