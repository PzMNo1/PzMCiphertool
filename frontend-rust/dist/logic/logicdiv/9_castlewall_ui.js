window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
window.logicWorkspaceHTMLs.push(LogicUI.workspace('castlewall-workspace', 'castlewall-layout',
    // ── Left ──
    LogicUI.backButton('castlewall-workspace') +
    LogicUI.title('CASTLEWALL', { color: 'var(--neon-cyan)' }) +
    LogicUI.sizeInputs('cw-rows', 'cw-cols', { rowVal: 7, colVal: 7, rowMin: 4, colMin: 4 }) +
    `<div style="margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:8px;">
        <div id="cw-tool-clue_w" class="cw-tool-btn active" onclick="window.setCWTool && window.setCWTool('clue_w')">⬜ 白线索</div>
        <div id="cw-tool-clue_b" class="cw-tool-btn" onclick="window.setCWTool && window.setCWTool('clue_b')">⬛ 黑线索</div>
        <div id="cw-tool-line" class="cw-tool-btn" onclick="window.setCWTool && window.setCWTool('line')">✏️ 画线</div>
        <div id="cw-tool-clear" class="cw-tool-btn" onclick="window.setCWTool && window.setCWTool('clear')">❌ 清除</div>
    </div>` +
    LogicUI.actionGrid4([
        { label: '重置网格', onclick: 'window.initCastlewallGrid && window.initCastlewallGrid()' },
        { label: '计算核心分析', onclick: 'window.solveCastlewallPuzzle && window.solveCastlewallPuzzle()', id: 'cw-solve-btn', glow: true },
        { label: '清空线段', onclick: 'window.clearCastlewallGrid && window.clearCastlewallGrid()' },
        { label: '简单示例', onclick: 'window.buildSimpleCastlewallExample && window.buildSimpleCastlewallExample()' }
    ]) +
    LogicUI.statsPanel('cw', { countLabel: '回路解数', timeLabel: 'AI thinking耗时', accent: 'var(--neon-cyan)' }) +
    LogicUI.solutionNav('cw', 'showCWSolution', { accent: 'var(--neon-cyan)' }) +
    LogicUI.instructions([
        '• <strong>白线索(⬜)</strong>: 放置在回路<strong>内部</strong>的线索格。',
        '• <strong>黑线索(⬛)</strong>: 放置在回路<strong>外部</strong>的线索格。',
        '• <strong>点击线索格</strong>: 弹出编辑器，直接输入数字和选择方向。',
        '• <strong>数字+箭头</strong> = 该方向上的线段数量之和。',
        '• <strong>右键</strong> 或编辑器中 🗑: 清除线索。',
        '• <strong>Esc</strong> / 点击空白区域: 关闭编辑器。',
        '• 求解器会画出满足所有约束的单一闭合回路。'
    ], { accent: '#00ffcc', title: '系统法则' }),

    // ── Right ──
    `<div id="castlewall-grid-container"></div>`,

    // ── Style (Castlewall has extensive custom CSS for clues, popover, tool buttons) ──
    `#castlewall-grid-container{--cw-cell-size:50px;display:grid;gap:2px;background:var(--neon-cyan);padding:4px;border-radius:8px;width:fit-content;margin:0 auto;border:2px solid var(--neon-cyan);box-shadow:0 0 20px rgba(0,229,255,0.4)}
    .cw-cell{width:var(--cw-cell-size);height:var(--cw-cell-size);background:rgba(20,10,30,0.95);border-radius:4px;}
    .cw-cell:hover{background:rgba(0,229,255,0.15);box-shadow:inset 0 0 10px rgba(0,229,255,0.3)}
    .cw-clue{position:absolute;top:2px;left:2px;right:2px;bottom:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Orbitron',monospace;font-weight:bold;font-size:0.85rem;border-radius:4px;z-index:10}
    .cw-clue.black{background:rgba(10,5,20,0.95);color:#ff4466;border:1px solid #ff4466;box-shadow:inset 0 0 8px rgba(255,68,102,0.3)}
    .cw-clue.white{background:rgba(200,220,255,0.9);color:#0a0520;border:1px solid rgba(0,200,255,0.6);box-shadow:inset 0 0 8px rgba(0,200,255,0.3)}
    .cw-arrow{font-size:0.75rem;margin-top:-2px}
    .cw-line-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5}
    .cw-line{stroke:#00e5ff;stroke-width:4px;stroke-linecap:round;fill:none;filter:drop-shadow(0 0 4px #00e5ff)}
    .cw-tool-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:#ccc;border-radius:6px;cursor:pointer;font-size:0.85rem;transition:all .2s}
    .cw-tool-btn.active{background:rgba(0,229,255,0.25);border-color:var(--neon-cyan);color:#fff;box-shadow:0 0 10px rgba(0,229,255,0.3)}
    .cw-tool-btn:hover{background:rgba(0,229,255,0.15)}
    .cw-popover{position:fixed;z-index:9999;background:rgba(15,8,30,0.96);border:1px solid rgba(0,229,255,0.6);border-radius:10px;padding:12px 14px;min-width:195px;box-shadow:0 0 20px rgba(0,229,255,0.35),0 8px 32px rgba(0,0,0,0.6),inset 0 0 30px rgba(0,229,255,0.05);backdrop-filter:blur(12px);display:flex;flex-direction:column;gap:10px;opacity:0;transform:translateY(-4px);transition:opacity .15s ease,transform .15s ease;font-family:'Orbitron','Inter',monospace}
    .cw-pop-row{display:flex;align-items:center;gap:8px}
    .cw-pop-label{font-size:0.75rem;color:rgba(180,230,255,0.7);min-width:32px;text-transform:uppercase;letter-spacing:1px}
    .cw-pop-input{flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(0,229,255,0.3);border-radius:6px;color:#fff;font-size:0.9rem;padding:5px 8px;width:60px;font-family:'Orbitron',monospace;outline:none;transition:border-color .2s,box-shadow .2s}
    .cw-pop-input:focus{border-color:rgba(0,229,255,0.7);box-shadow:0 0 8px rgba(0,229,255,0.3)}
    .cw-pop-input::placeholder{color:rgba(255,255,255,0.25)}
    .cw-pop-input::-webkit-inner-spin-button,.cw-pop-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    .cw-pop-input[type=number]{-moz-appearance:textfield}
    .cw-pop-dirs{display:flex;gap:4px}
    .cw-pop-dir{width:30px;height:30px;border:1px solid rgba(255,255,255,0.12);border-radius:6px;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);font-size:0.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;padding:0}
    .cw-pop-dir:hover{background:rgba(0,229,255,0.15);border-color:rgba(0,229,255,0.4);color:#fff}
    .cw-pop-dir.active{background:rgba(0,229,255,0.3);border-color:var(--neon-cyan);color:#fff;box-shadow:0 0 8px rgba(0,229,255,0.4)}
    .cw-pop-delete{background:rgba(255,50,80,0.1);border:1px solid rgba(255,50,80,0.25);border-radius:6px;color:rgba(255,100,120,0.8);font-size:0.75rem;padding:5px 10px;cursor:pointer;transition:all .15s;text-align:center}
    .cw-pop-delete:hover{background:rgba(255,50,80,0.25);border-color:rgba(255,50,80,0.5);color:#ff6680}`
));

(function () {
    const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8;
    const TILE = [0, UP | DOWN, LEFT | RIGHT, UP | RIGHT, UP | LEFT, DOWN | LEFT, DOWN | RIGHT];
    const ARROWS = { u: '▲', d: '▼', l: '◀', r: '▶' };

    let R = 7, C = 7, grid = [], tool = 'clue_w';
    let activePopover = null;

    window.cwSolutions = [];
    window.cwSolIdx = 0;

    const $ = id => document.getElementById(id);

    window.initCastlewallGrid = function() {
        R = Math.max(4, Math.min(15, parseInt($('cw-rows')?.value) || 7));
        C = Math.max(4, Math.min(15, parseInt($('cw-cols')?.value) || 7));
        grid = Array.from({ length: R }, () =>
            Array.from({ length: C }, () => ({ type: 0, clue: null }))
        );
        tool = 'clue_w';
        
        window.cwSolutions = [];
        window.cwSolIdx = 0;
        
        closePopover();

        const nav = $('cw-solution-nav');
        if (nav) nav.style.display = 'none';
        
        const cnt = $('cw-solutionsCount');
        if (cnt) cnt.textContent = '0';
        
        const tm = $('cw-timeElapsed');
        if (tm) tm.textContent = '0';
        
        render();
    };

    function render() {
        const el = $('castlewall-grid-container');
        if (!el) return;
        el.innerHTML = '';
        el.style.gridTemplateColumns = `repeat(${C}, var(--cw-cell-size))`;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div');
                cell.className = 'cw-cell';
                cell.onclick = (e) => { e.stopPropagation(); window.handleCWCellClick?.(r, c, cell); };
                cell.oncontextmenu = e => { e.preventDefault(); window.handleCWRightClick?.(r, c); };

                const cl = grid[r][c].clue;
                if (cl) {
                    const div = document.createElement('div');
                    div.className = `cw-clue ${cl.color === 'b' ? 'black' : 'white'}`;
                    let html = '';
                    if (cl.num !== null) html += `<span>${cl.num}</span>`;
                    if (cl.dir) html += `<span class="cw-arrow">${ARROWS[cl.dir]}</span>`;
                    div.innerHTML = html;
                    cell.appendChild(div);
                } else if (grid[r][c].type > 0) {
                    cell.appendChild(lineSvg(grid[r][c].type));
                }
                el.appendChild(cell);
            }
        }
    }

    function lineSvg(type) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('cw-line-svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        const d = TILE[type];
        let pd = '';
        if (d & UP)    pd += 'M50,50 L50,0 ';
        if (d & DOWN)  pd += 'M50,50 L50,100 ';
        if (d & LEFT)  pd += 'M50,50 L0,50 ';
        if (d & RIGHT) pd += 'M50,50 L100,50 ';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pd);
        path.classList.add('cw-line');
        svg.appendChild(path);
        return svg;
    }

    function closePopover() {
        if (activePopover) {
            activePopover.remove();
            activePopover = null;
        }
    }

    function openClueEditor(r, c, anchorEl) {
        closePopover();
        const cl = grid[r][c].clue;
        if (!cl) return;

        const pop = document.createElement('div');
        pop.className = 'cw-popover';
        pop.onclick = e => e.stopPropagation();

        const numRow = document.createElement('div');
        numRow.className = 'cw-pop-row';
        const numLabel = document.createElement('span');
        numLabel.className = 'cw-pop-label';
        numLabel.textContent = '数字';
        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.className = 'cw-pop-input';
        numInput.min = '0';
        numInput.max = '99';
        numInput.placeholder = '—';
        if (cl.num !== null) numInput.value = cl.num;
        numInput.oninput = () => {
            const v = numInput.value.trim();
            cl.num = v === '' ? null : parseInt(v);
            render();
        };
        numRow.appendChild(numLabel);
        numRow.appendChild(numInput);
        pop.appendChild(numRow);

        const dirRow = document.createElement('div');
        dirRow.className = 'cw-pop-row';
        const dirLabel = document.createElement('span');
        dirLabel.className = 'cw-pop-label';
        dirLabel.textContent = '方向';
        dirRow.appendChild(dirLabel);

        const dirWrap = document.createElement('div');
        dirWrap.className = 'cw-pop-dirs';
        const dirs = [
            { key: null, label: '✕' },
            { key: 'u', label: '▲' },
            { key: 'r', label: '▶' },
            { key: 'd', label: '▼' },
            { key: 'l', label: '◀' },
        ];
        dirs.forEach(({ key, label }) => {
            const btn = document.createElement('button');
            btn.className = 'cw-pop-dir' + (cl.dir === key ? ' active' : '');
            btn.textContent = label;
            btn.title = key ? `方向: ${key}` : '无方向';
            btn.onclick = (e) => {
                e.stopPropagation();
                cl.dir = key;
                dirWrap.querySelectorAll('.cw-pop-dir').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                render();
            };
            dirWrap.appendChild(btn);
        });
        dirRow.appendChild(dirWrap);
        pop.appendChild(dirRow);

        const delBtn = document.createElement('button');
        delBtn.className = 'cw-pop-delete';
        delBtn.textContent = '🗑 删除线索';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            grid[r][c].clue = null;
            grid[r][c].type = 0;
            closePopover();
            render();
        };
        pop.appendChild(delBtn);

        document.body.appendChild(pop);
        activePopover = pop;

        const rect = anchorEl.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();
        let top = rect.bottom + 6;
        let left = rect.left + rect.width / 2 - popRect.width / 2;

        if (top + popRect.height > window.innerHeight - 10) {
            top = rect.top - popRect.height - 6;
        }
        left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));

        pop.style.top = top + 'px';
        pop.style.left = left + 'px';
        pop.style.opacity = '1';
        pop.style.transform = 'translateY(0)';

        setTimeout(() => numInput.focus(), 50);
    }

    document.addEventListener('click', () => closePopover());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePopover();
    });

    window.setCWTool = function (t) {
        tool = t;
        closePopover();
        document.querySelectorAll('.cw-tool-btn').forEach(b => b.classList.remove('active'));
        $('cw-tool-' + t)?.classList.add('active');
    };

    window.handleCWCellClick = function (r, c, cellEl) {
        const cell = grid[r][c];
        if (tool === 'line') {
            closePopover();
            if (!cell.clue) cell.type = (cell.type + 1) % TILE.length;
        } else if (tool.startsWith('clue')) {
            const color = tool === 'clue_w' ? 'w' : 'b';
            if (cell.clue) {
                if (cell.clue.color !== color) {
                    cell.clue.color = color;
                    render();
                }
                openClueEditor(r, c, cellEl);
                return;
            } else {
                cell.clue = { color, num: null, dir: null };
                cell.type = 0;
                render();
                const gridEl = $('castlewall-grid-container');
                const idx = r * C + c;
                const newCellEl = gridEl?.children[idx];
                if (newCellEl) openClueEditor(r, c, newCellEl);
                return;
            }
        } else if (tool === 'clear') {
            closePopover();
            cell.clue = null; cell.type = 0;
        }
        render();
    };

    window.handleCWRightClick = function (r, c) {
        closePopover();
        grid[r][c].clue = null; grid[r][c].type = 0; render();
    };

    function updateCWStats(count, time) {
        const cEl = $('cw-solutionsCount');
        const tEl = $('cw-timeElapsed');
        if (cEl) cEl.textContent = count;
        if (tEl) tEl.textContent = time;
    }

    window.solveCastlewallPuzzle = function() {
        if (!window.solveCastlewall) { updateCWStats('模块未加载', '-'); return; }

        const puzzleCtx = {
            rows: R,
            cols: C,
            grid: grid.map(row => row.map(cell => ({ ...cell })))
        };

        updateCWStats('计算中...', '...');
        setTimeout(() => {
            const t0 = performance.now();
            let res;
            try { res = window.solveCastlewall(puzzleCtx); } catch (e) {
                updateCWStats('错误: ' + e.message, '-'); return;
            }
            const elapsed = LogicUI.formatElapsed(performance.now() - t0);

            if (res && res.error) { updateCWStats(res.error, elapsed); return; }

            const solutions = (res && res.solutions) ? res.solutions
                : Array.isArray(res) ? res
                    : window.cwSolutions || [];
            window.cwSolutions = solutions;
            window.cwSolIdx = 0;

            if (res && res.timeout) {
                updateCWStats(solutions.length + '+ (超时中断)', elapsed);
            } else {
                updateCWStats(solutions.length || '未找到解', elapsed);
            }

            if (solutions.length > 0) {
                const nav = $('cw-solution-nav');
                if (nav) nav.style.display = 'flex';
                window.showCWSolution(0);
            }
        }, 20);
    };

    function applySol(idx) {
        if (!window.cwSolutions || !window.cwSolutions[idx]) return;
        const sol = window.cwSolutions[idx];
        for (let r = 0; r < R; r++)
            for (let c = 0; c < C; c++)
                if (!grid[r][c].clue) grid[r][c].type = sol[r][c];
        render();
    }

    window.showCWSolution = function (delta) {
        const solutions = window.cwSolutions;
        if (!solutions || !solutions.length) return;
        const len = solutions.length;
        let idx = window.cwSolIdx || 0;
        idx = ((idx + delta) % len + len) % len;
        window.cwSolIdx = idx;
        const counter = $('cw-solution-counter');
        if (counter) counter.textContent = `${idx + 1} / ${len}`;
        applySol(idx);
    };

    window.clearCastlewallGrid = function () {
        closePopover();
        for (let r = 0; r < R; r++)
            for (let c = 0; c < C; c++)
                if (!grid[r][c].clue) grid[r][c].type = 0;
        render();
    };

    window.buildSimpleCastlewallExample = function () {
        const rIn = $('cw-rows'), cIn = $('cw-cols');
        if (rIn) rIn.value = 5;
        if (cIn) cIn.value = 5;
        window.initCastlewallGrid();
        grid[2][2].clue = { color: 'w', num: null, dir: null };
        render();
    };

})();
