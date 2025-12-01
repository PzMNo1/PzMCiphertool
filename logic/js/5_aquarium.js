    // --- 核心逻辑变量 ---
    let R = 6;
    let C = 6;
    let hBorders = []; // 水平边界 (Row x Col)
    let vBorders = []; // 垂直边界 (Row x Col)
    let cellStates = []; // 0:Empty, 1:Water, 2:Air
    let rowClues = [];
    let colClues = [];
    let currentMode = 'edit';
    
    // --- 多解管理变量 ---
    let foundSolutions = [];
    let currentSolIndex = 0;
    let cachedRegions = [];

    // --- 初始化 ---
    window.onload = () => {
        // 尝试从 URL 读取数据
        const urlParams = new URLSearchParams(window.location.search);
        const dataStr = urlParams.get('data');
        let dataLoaded = false; // 新增标记：是否有数据加载成功

        if (dataStr) {
            try {
                const data = JSON.parse(atob(dataStr));
                document.getElementById('rows-in').value = data.R;
                document.getElementById('cols-in').value = data.C;
                R = data.R; C = data.C;
                hBorders = data.hBorders;
                vBorders = data.vBorders;
                rowClues = data.rowClues;
                colClues = data.colClues;
                dataLoaded = true; // 标记加载成功
            } catch(e) { console.error("Data load failed"); }
        }
        
        // 修复：如果没有加载数据(!dataLoaded)，传 true 进行初始化；如果加载了数据，传 false 保留数据
        initGrid(!dataLoaded); 
    };

    function setMode(mode) {
        currentMode = mode;
        document.getElementById('mode-edit').className = mode === 'edit' ? 'mode-opt active' : 'mode-opt';
        document.getElementById('mode-play').className = mode === 'play' ? 'mode-opt active' : 'mode-opt';
        msg(mode === 'edit' ? "MODE: REGION EDITING" : "MODE: FILLING TEST");
    }

    function msg(text) {
        const el = document.getElementById('status-msg');
        el.style.opacity = 0;
        setTimeout(() => {
            el.innerText = text;
            el.style.opacity = 1;
        }, 200);
    }

    function initGrid(resetData = true) {
        const rIn = parseInt(document.getElementById('rows-in').value);
        const cIn = parseInt(document.getElementById('cols-in').value);
        
        if (rIn < 2 || cIn < 2 || rIn > 15 || cIn > 15) {
            msg("ERROR: Dimensions must be 2-15");
            return;
        }

        R = rIn;
        C = cIn;

        if (resetData) {
            hBorders = Array(R).fill(0).map(() => Array(C).fill(false));
            vBorders = Array(R).fill(0).map(() => Array(C).fill(false));
            rowClues = Array(R).fill(null);
            colClues = Array(C).fill(null);
        }
        // 无论是否重置数据，状态都清空
        cellStates = Array(R).fill(0).map(() => Array(C).fill(0));

        // 新增：重置网格时清除之前的解导航栏
        const nav = document.getElementById('sol-nav-container');
        if(nav) nav.remove();

        renderGrid();
        if(resetData) msg("GRID INITIALIZED");
    }

    function renderGrid() {
        const container = document.getElementById('grid-container');
        container.innerHTML = '';
        
        // 移除：此处不应清除导航栏，否则切换解时按钮会消失
        // const oldNav = document.getElementById('sol-nav-container');
        // if(oldNav) oldNav.remove();

        // 设置 CSS Grid 列定义：1列提示 + C列格子
        container.style.gridTemplateColumns = `var(--aq-cell-size) repeat(${C}, var(--aq-cell-size))`;

        // 1. 顶部提示行 (Top Clues)
        // 左上角空白占位
        const corner = document.createElement('div');
        container.appendChild(corner);

        for (let c = 0; c < C; c++) {
            const input = document.createElement('input');
            input.type = 'text'; // 允许空
            input.className = 'clue-input';
            input.placeholder = '↓';
            input.value = colClues[c] !== null ? colClues[c] : '';
            input.onchange = (e) => { 
                const v = parseInt(e.target.value);
                colClues[c] = isNaN(v) ? null : v;
            };
            container.appendChild(input);
        }

        // 2. 主体行 (Row Clue + Cells)
        for (let r = 0; r < R; r++) {
            // 左侧提示 (Left Clue)
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'clue-input';
            input.placeholder = '→';
            input.value = rowClues[r] !== null ? rowClues[r] : '';
            input.onchange = (e) => { 
                const v = parseInt(e.target.value);
                rowClues[r] = isNaN(v) ? null : v;
            };
            container.appendChild(input);

            // 单元格
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div');
                cell.className = 'aq-cell';
                
                // 状态样式
                if (cellStates[r][c] === 1) cell.classList.add('water');
                if (cellStates[r][c] === 2) cell.classList.add('air');

                // 边界样式
                // 1. 外部大框总是粗线
                const isOuterRight = (c === C - 1);
                const isOuterBottom = (r === R - 1);
                
                if (isOuterRight) cell.style.borderRight = "3px solid var(--quantum-blue)";
                if (isOuterBottom) cell.style.borderBottom = "3px solid var(--quantum-blue)";
                if (r === 0) cell.style.borderTop = "3px solid var(--quantum-blue)";
                if (c === 0) cell.style.borderLeft = "3px solid var(--quantum-blue)";

                // 2. 内部自定义边界
                if (!isOuterRight && vBorders[r][c]) cell.classList.add('border-right');
                if (!isOuterBottom && hBorders[r][c]) cell.classList.add('border-bottom');

                // 点击事件
                cell.onclick = (e) => handleCellClick(r, c, e);

                // 边界交互热区 (Handles) - 仅在非边缘处添加
                if (!isOuterRight) {
                    const handle = document.createElement('div');
                    handle.className = 'border-handle-v';
                    handle.onclick = (e) => { e.stopPropagation(); toggleBorder('v', r, c); };
                    cell.appendChild(handle);
                }
                if (!isOuterBottom) {
                    const handle = document.createElement('div');
                    handle.className = 'border-handle-h';
                    handle.onclick = (e) => { e.stopPropagation(); toggleBorder('h', r, c); };
                    cell.appendChild(handle);
                }

                container.appendChild(cell);
            }
        }
    }

    function toggleBorder(type, r, c) {
        // 允许在任何模式下调整边界，或者限制在 edit 模式
        // 这里为了方便，始终允许
        if (type === 'v') vBorders[r][c] = !vBorders[r][c];
        if (type === 'h') hBorders[r][c] = !hBorders[r][c];
        renderGrid();
    }

    function handleCellClick(r, c, e) {
        if (currentMode === 'play') {
            // 循环：空 -> 水 -> 空气 -> 空
            let s = cellStates[r][c];
            s = (s + 1) % 3;
            cellStates[r][c] = s;
            renderGrid();
        }
        // Edit 模式下点击单元格本身不操作，只操作边界
    }

    function clearState() {
        cellStates = cellStates.map(row => row.map(() => 0));
        renderGrid();
        msg("WATER CLEARED");
    }

    function copyToClipboard() {
        const data = { R, C, rowClues, colClues, hBorders, vBorders };
        const str = btoa(JSON.stringify(data));
        const url = window.location.href.split('?')[0] + '?data=' + str;
        navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
            msg("DATA COPIED TO CLIPBOARD");
        });
    }

    // --- 算法核心 (Backtracking Solver) ---

    async function solvePuzzle() {
        document.getElementById('loading-overlay').style.display = 'flex';
        msg("CALCULATING...");
        
        // 清除旧解状态
        foundSolutions = [];
        currentSolIndex = 0;
        const nav = document.getElementById('sol-nav-container');
        if(nav) nav.remove();

        await new Promise(r => setTimeout(r, 100)); // UI refresh

        try {
            cachedRegions = findRegions();
            // 修改：runSolver 现在返回所有找到的解（最多10个）
            const solutions = runSolver(cachedRegions);
            
            if (solutions && solutions.length > 0) {
                foundSolutions = solutions;
                currentSolIndex = 0;
                
                // 应用第一个解
                applySolution(foundSolutions[0], cachedRegions);
                
                if (solutions.length > 1) {
                    msg(`FOUND ${solutions.length} SOLUTIONS`);
                    createSolutionNav(solutions.length);
                } else {
                    msg("UNIQUE SOLUTION FOUND");
                }
            } else {
                msg("NO SOLUTION DETECTED");
            }
        } catch (e) {
            console.error(e);
            msg("COMPUTATION ERROR");
        }
        
        document.getElementById('loading-overlay').style.display = 'none';
    }

    // --- 新增：创建解导航栏 ---
    function createSolutionNav(count) {
        const controlsDiv = document.querySelector('.controls');
        
        const navDiv = document.createElement('div');
        navDiv.id = 'sol-nav-container';
        navDiv.className = 'solution-nav';
        navDiv.style.display = 'flex';
        navDiv.style.justifyContent = 'center';
        navDiv.style.alignItems = 'center';
        navDiv.style.marginTop = '1rem';

        // 上一个按钮
        const prevBtn = document.createElement('button');
        prevBtn.className = 'solution-btn';
        prevBtn.innerHTML = '◀';
        prevBtn.onclick = () => navigateSolution(-1);

        // 计数器
        const counter = document.createElement('div');
        counter.id = 'sol-counter';
        counter.className = 'solution-counter';
        counter.innerHTML = `1 / ${count}`;

        // 下一个按钮
        const nextBtn = document.createElement('button');
        nextBtn.className = 'solution-btn';
        nextBtn.innerHTML = '▶';
        nextBtn.onclick = () => navigateSolution(1);

        navDiv.appendChild(prevBtn);
        navDiv.appendChild(counter);
        navDiv.appendChild(nextBtn);
        
        // 插入到状态消息之后
        const statusMsg = document.getElementById('status-msg');
        controlsDiv.insertBefore(navDiv, statusMsg.nextSibling);
    }

    function navigateSolution(delta) {
        if (foundSolutions.length === 0) return;
        
        let newIndex = currentSolIndex + delta;
        if (newIndex < 0) newIndex = foundSolutions.length - 1;
        if (newIndex >= foundSolutions.length) newIndex = 0;
        
        currentSolIndex = newIndex;
        applySolution(foundSolutions[currentSolIndex], cachedRegions);
        
        const counter = document.getElementById('sol-counter');
        if(counter) counter.innerHTML = `${currentSolIndex + 1} / ${foundSolutions.length}`;
    }

    function findRegions() {
        const visited = Array(R).fill(0).map(() => Array(C).fill(false));
        const regions = [];
        let regionId = 0;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (!visited[r][c]) {
                    // Flood fill to find region
                    const cells = [];
                    const stack = [[r, c]];
                    visited[r][c] = true;
                    let minR = r, maxR = r;

                    while (stack.length) {
                        const [cr, cc] = stack.pop();
                        cells.push({r: cr, c: cc});
                        minR = Math.min(minR, cr);
                        maxR = Math.max(maxR, cr);

                        // Neighbors check based on borders
                        // Up
                        if (cr > 0 && !hBorders[cr-1][cc] && !visited[cr-1][cc]) {
                            visited[cr-1][cc] = true; stack.push([cr-1, cc]);
                        }
                        // Down
                        if (cr < R-1 && !hBorders[cr][cc] && !visited[cr+1][cc]) {
                            visited[cr+1][cc] = true; stack.push([cr+1, cc]);
                        }
                        // Left
                        if (cc > 0 && !vBorders[cr][cc-1] && !visited[cr][cc-1]) {
                            visited[cr][cc-1] = true; stack.push([cr, cc-1]);
                        }
                        // Right
                        if (cc < C-1 && !vBorders[cr][cc] && !visited[cr][cc+1]) {
                            visited[cr][cc+1] = true; stack.push([cr, cc+1]);
                        }
                    }
                    regions.push({
                        id: regionId++,
                        cells,
                        maxR,
                        height: maxR - minR + 1
                    });
                }
            }
        }
        return regions;
    }

    function runSolver(regions) {
        const finalRowClues = rowClues.map(x => x === null ? -1 : x);
        const finalColClues = colClues.map(x => x === null ? -1 : x);
        
        // Current state tracking
        const currR = Array(R).fill(0);
        const currC = Array(C).fill(0);
        const regionLevels = Array(regions.length).fill(0);
        
        const solutions = []; // 存储所有找到的解

        function solve(idx) {
            // 如果已经找到10个解，停止搜索
            if (solutions.length >= 10) return;

            if (idx === regions.length) {
                // Verify strict equality for clues
                for(let i=0; i<R; i++) if(finalRowClues[i] !== -1 && currR[i] !== finalRowClues[i]) return;
                for(let i=0; i<C; i++) if(finalColClues[i] !== -1 && currC[i] !== finalColClues[i]) return;
                
                // 找到一个解，保存副本
                solutions.push([...regionLevels]);
                return;
            }

            const region = regions[idx];
            
            for (let lvl = 0; lvl <= region.height; lvl++) {
                // 如果已经够了，跳出循环
                if (solutions.length >= 10) break;

                // 1. Calculate impact
                const waterTopRow = region.maxR - lvl + 1;
                const addedR = {}, addedC = {};
                
                let possible = true;

                for (const cell of region.cells) {
                    if (cell.r >= waterTopRow) {
                        const nr = cell.r;
                        const nc = cell.c;
                        
                        addedR[nr] = (addedR[nr] || 0) + 1;
                        if (finalRowClues[nr] !== -1 && currR[nr] + addedR[nr] > finalRowClues[nr]) {
                            possible = false; break;
                        }
                        
                        addedC[nc] = (addedC[nc] || 0) + 1;
                        if (finalColClues[nc] !== -1 && currC[nc] + addedC[nc] > finalColClues[nc]) {
                            possible = false; break;
                        }
                    }
                }

                if (!possible) continue;

                // 2. Apply
                for(let r in addedR) currR[r] += addedR[r];
                for(let c in addedC) currC[c] += addedC[c];
                regionLevels[idx] = lvl;

                // 3. Recurse
                solve(idx+1);
                
                // 注意：这里不再有 if(solve(...)) return true，因为我们要继续找

                // 4. Backtrack
                for(let r in addedR) currR[r] -= addedR[r];
                for(let c in addedC) currC[c] -= addedC[c];
            }
        }

        solve(0);
        return solutions;
    }

    function applySolution(levels, regions) {
        cellStates = cellStates.map(row => row.map(() => 2)); // Default to Air (2)
        
        regions.forEach((region, i) => {
            const lvl = levels[i];
            const waterTop = region.maxR - lvl + 1;
            region.cells.forEach(c => {
                if (c.r >= waterTop) cellStates[c.r][c.c] = 1; // Water
            });
        });
        renderGrid();
    }