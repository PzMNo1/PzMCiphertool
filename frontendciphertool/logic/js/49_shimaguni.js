document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('grid-container');
    const rowsInput = document.getElementById('rows-input');
    const colsInput = document.getElementById('cols-input');
    const newGridBtn = document.getElementById('new-grid-btn');
    const modeBtns = {
        border: document.getElementById('mode-border'),
        clue: document.getElementById('mode-clue'),
        solve: document.getElementById('mode-solve'),
        reset: document.getElementById('mode-reset')
    };
    const numpad = document.getElementById('numpad');
    const message = document.getElementById('message');

    let R = 10, C = 10;
    let grid = []; // {r, c, val, borders: {t,b,l,r}}
    let mode = 'border'; // 'border', 'clue'
    let selectedCell = null;

    // Initialize
    initGrid(R, C);

    // Event Listeners
    newGridBtn.addEventListener('click', () => {
        R = parseInt(rowsInput.value);
        C = parseInt(colsInput.value);
        initGrid(R, C);
    });

    modeBtns.border.addEventListener('click', () => setMode('border'));
    modeBtns.clue.addEventListener('click', () => setMode('clue'));
    modeBtns.solve.addEventListener('click', solvePuzzle);
    modeBtns.reset.addEventListener('click', resetSolution);

    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!selectedCell) return;
            const val = btn.innerText === 'Clear' ? null : parseInt(btn.innerText);
            grid[selectedCell.r][selectedCell.c].val = val;
            renderCell(selectedCell.r, selectedCell.c);
        });
    });

    function setMode(m) {
        mode = m;
        Object.values(modeBtns).forEach(b => b.classList.remove('active'));
        modeBtns[m].classList.add('active');
        numpad.style.display = m === 'clue' ? 'grid' : 'none';
        selectedCell = null;
        renderAll();
    }

    function initGrid(r, c) {
        gridContainer.style.gridTemplateColumns = `repeat(${c}, 40px)`;
        grid = [];
        for (let i = 0; i < r; i++) {
            let row = [];
            for (let j = 0; j < c; j++) {
                row.push({
                    r: i, c: j,
                    val: null,
                    borders: {
                        t: i === 0,
                        b: i === r - 1,
                        l: j === 0,
                        r: j === c - 1
                    },
                    shaded: false // for solution
                });
            }
            grid.push(row);
        }
        renderAll();
    }

    function renderAll() {
        gridContainer.innerHTML = '';
        for (let i = 0; i < R; i++) {
            for (let j = 0; j < C; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                
                const cellData = grid[i][j];
                
                if (cellData.borders.t) cell.classList.add('border-top');
                if (cellData.borders.b) cell.classList.add('border-bottom');
                if (cellData.borders.l) cell.classList.add('border-left');
                if (cellData.borders.r) cell.classList.add('border-right');
                
                if (cellData.val !== null) cell.innerText = cellData.val;
                if (cellData.shaded) cell.classList.add('solution-shaded');

                cell.addEventListener('click', (e) => handleCellClick(i, j, e));
                gridContainer.appendChild(cell);
            }
        }
    }

    function renderCell(r, c) {
        const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) return;
        const d = grid[r][c];
        
        cell.className = 'cell';
        if (d.borders.t) cell.classList.add('border-top');
        if (d.borders.b) cell.classList.add('border-bottom');
        if (d.borders.l) cell.classList.add('border-left');
        if (d.borders.r) cell.classList.add('border-right');
        if (d.shaded) cell.classList.add('solution-shaded');
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) cell.classList.add('active');
        
        cell.innerText = d.val !== null ? d.val : '';
    }

    function handleCellClick(r, c, e) {
        if (mode === 'border') {
            // Toggle borders based on click position relative to cell center
            // Simple version: toggle borders shared with neighbors
            const cell = e.target;
            const rect = cell.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;

            const threshold = 10;
            
            if (y < threshold && r > 0) toggleBorder(r, c, 't');
            else if (y > h - threshold && r < R - 1) toggleBorder(r, c, 'b');
            else if (x < threshold && c > 0) toggleBorder(r, c, 'l');
            else if (x > w - threshold && c < C - 1) toggleBorder(r, c, 'r');
        } else if (mode === 'clue') {
            if (selectedCell) {
                const prev = document.querySelector(`.cell[data-r="${selectedCell.r}"][data-c="${selectedCell.c}"]`);
                if (prev) prev.classList.remove('active');
            }
            selectedCell = {r, c};
            renderCell(r, c);
        }
    }
    
    // Add Keyboard Support
    document.addEventListener('keydown', (e) => {
        if (!selectedCell || mode !== 'clue') return;
        
        if (e.key >= '0' && e.key <= '9') {
            const num = parseInt(e.key);
            grid[selectedCell.r][selectedCell.c].val = num;
            renderCell(selectedCell.r, selectedCell.c);
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            grid[selectedCell.r][selectedCell.c].val = null;
            renderCell(selectedCell.r, selectedCell.c);
        }
    });

    function toggleBorder(r, c, side) {
        const d = grid[r][c];
        d.borders[side] = !d.borders[side];
        
        // Update neighbor
        if (side === 't' && r > 0) grid[r-1][c].borders.b = d.borders.t;
        if (side === 'b' && r < R-1) grid[r+1][c].borders.t = d.borders.b;
        if (side === 'l' && c > 0) grid[r][c-1].borders.r = d.borders.l;
        if (side === 'r' && c < C-1) grid[r][c+1].borders.l = d.borders.r;

        renderCell(r, c);
        if (side === 't') renderCell(r-1, c);
        if (side === 'b') renderCell(r+1, c);
        if (side === 'l') renderCell(r, c-1);
        if (side === 'r') renderCell(r, c+1);
    }

    function resetSolution() {
        for(let i=0; i<R; i++) for(let j=0; j<C; j++) grid[i][j].shaded = false;
        renderAll();
        message.innerText = '';
    }

    // --- SOLVER ---
    async function solvePuzzle() {
        message.innerText = '求解中...';
        resetSolution();

        // 1. Identify Regions
        const regions = identifyRegions();
        
        // 2. Validate Inputs (basic)
        for (const reg of regions) {
            let clues = reg.cells.filter(p => grid[p.r][p.c].val !== null).map(p => grid[p.r][p.c].val);
            if (clues.length > 0) {
                // Check consistency if multiple clues
                const first = clues[0];
                if (clues.some(v => v !== first)) {
                    message.innerText = '错误：同一区域内存在矛盾的线索。';
                    return;
                }
                reg.targetCount = first;
            } else {
                reg.targetCount = null;
            }
        }

        // 3. Backtracking Solver
        // State: grid[r][c].shaded = true/false
        // Optimization: Solve region by region? No, cell by cell is easier to implement correctly first.
        
        // Flatten cells for recursion
        const cells = [];
        for(let i=0; i<R; i++) for(let j=0; j<C; j++) cells.push({r:i, c:j});

        const solution = await runSolver(cells, regions);
        
        if (solution) {
            // Apply solution
            for(let i=0; i<R; i++) {
                for(let j=0; j<C; j++) {
                    grid[i][j].shaded = solution[i][j] === 1;
                }
            }
            renderAll();
            message.innerText = '求解成功！';
        } else {
            message.innerText = '无解。';
        }
    }

    function identifyRegions() {
        const visited = Array(R).fill().map(() => Array(C).fill(false));
        const regions = [];
        
        for(let i=0; i<R; i++) {
            for(let j=0; j<C; j++) {
                if (!visited[i][j]) {
                    const cells = [];
                    const q = [{r:i, c:j}];
                    visited[i][j] = true;
                    
                    while(q.length > 0) {
                        const p = q.shift();
                        cells.push(p);
                        
                        // Check neighbors based on borders
                        // Top
                        if (p.r > 0 && !grid[p.r][p.c].borders.t && !visited[p.r-1][p.c]) {
                            visited[p.r-1][p.c] = true;
                            q.push({r:p.r-1, c:p.c});
                        }
                        // Bottom
                        if (p.r < R-1 && !grid[p.r][p.c].borders.b && !visited[p.r+1][p.c]) {
                            visited[p.r+1][p.c] = true;
                            q.push({r:p.r+1, c:p.c});
                        }
                        // Left
                        if (p.c > 0 && !grid[p.r][p.c].borders.l && !visited[p.r][p.c-1]) {
                            visited[p.r][p.c-1] = true;
                            q.push({r:p.r, c:p.c-1});
                        }
                        // Right
                        if (p.c < C-1 && !grid[p.r][p.c].borders.r && !visited[p.r][p.c+1]) {
                            visited[p.r][p.c+1] = true;
                            q.push({r:p.r, c:p.c+1});
                        }
                    }
                    // Map region id to cells
                    const regId = regions.length;
                    cells.forEach(c => c.regId = regId);
                    regions.push({id: regId, cells: cells});
                }
            }
        }
        return regions;
    }

    function runSolver(cells, regions) {
        return new Promise(resolve => {
            // Prepare state
            const state = Array(R).fill().map(() => Array(C).fill(0)); // 0: unknown, 1: shaded, -1: unshaded
            
            // Pre-check regions with clues > region size
            for(const reg of regions) {
                if (reg.targetCount !== null && reg.targetCount > reg.cells.length) {
                    resolve(null); return;
                }
            }

            // Helper to get region of a cell
            const getReg = (r, c) => {
                // Could use a map, but linear search in regions is okay for small grids, 
                // optimized by adding regId to cells in identifyRegions
                // We added regId to objects in regions[].cells, but we need quick lookup
                // Let's build a map
                return regionsMap[r][c];
            };
            
            const regionsMap = Array(R).fill().map(() => Array(C).fill(-1));
            regions.forEach(reg => reg.cells.forEach(c => regionsMap[c.r][c.c] = reg.id));

            const backtrack = (idx) => {
                if (idx === cells.length) {
                    // Final checks
                    if (checkAllRegionsConnected(state, regions) && checkAdjacencyConstraints(state, regions, regionsMap)) {
                        return state;
                    }
                    return null;
                }

                const {r, c} = cells[idx];
                const regId = regionsMap[r][c];
                const reg = regions[regId];

                // Try Shaded (1)
                state[r][c] = 1;
                if (isValidPartial(state, r, c, reg, regionsMap)) {
                    const res = backtrack(idx + 1);
                    if (res) return res;
                }

                // Try Unshaded (-1)
                state[r][c] = -1;
                if (isValidPartial(state, r, c, reg, regionsMap)) {
                    const res = backtrack(idx + 1);
                    if (res) return res;
                }

                state[r][c] = 0;
                return null;
            };

            // Optimization: Check validity incrementally
            function isValidPartial(st, r, c, reg, regMap) {
                // 1. Check Clue Count (Optimistic)
                let currentShaded = 0;
                let unknowns = 0;
                for(const cell of reg.cells) {
                    const s = st[cell.r][cell.c];
                    if (s === 1) currentShaded++;
                    else if (s === 0) unknowns++;
                }

                if (reg.targetCount !== null) {
                    if (currentShaded > reg.targetCount) return false; // Too many
                    if (currentShaded + unknowns < reg.targetCount) return false; // Too few possible
                } else {
                    // Must have at least 1
                    if (currentShaded === 0 && unknowns === 0) return false;
                }

                // 2. Check Adjacency across regions (Immediate check for current cell)
                // If shaded, check neighbors in DIFFERENT regions
                if (st[r][c] === 1) {
                    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                    for(const [dr, dc] of dirs) {
                        const nr = r+dr, nc = c+dc;
                        if(nr>=0 && nr<R && nc>=0 && nc<C) {
                            if (regMap[nr][nc] !== reg.id && st[nr][nc] === 1) {
                                return false; // Touching shaded cell of another region
                            }
                        }
                    }
                }

                // 3. Check Connectivity (Partial? Hard to do efficiently incrementally for all cases)
                // Only check connectivity if region is fully assigned
                if (unknowns === 0) {
                     if (!isRegionConnected(st, reg)) return false;
                     // Also check neighbor count constraint if neighbor region is full
                     // This is complex to track, maybe do at end or if convenient
                }

                return true;
            }

            function isRegionConnected(st, reg) {
                const shadedCells = reg.cells.filter(c => st[c.r][c.c] === 1);
                if (shadedCells.length === 0) return false; // Must have at least 1 (checked above, but good to be safe)
                if (shadedCells.length === 1) return true;

                // BFS
                const start = shadedCells[0];
                const q = [start];
                const visited = new Set([`${start.r},${start.c}`]);
                let count = 0;

                while(q.length > 0) {
                    const p = q.shift();
                    count++;
                    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                    for(const [dr, dc] of dirs) {
                        const nr = p.r+dr, nc = p.c+dc;
                        // Check if neighbor is in region AND shaded
                        if (shadedCells.some(sc => sc.r === nr && sc.c === nc)) {
                            const key = `${nr},${nc}`;
                            if (!visited.has(key)) {
                                visited.add(key);
                                q.push({r:nr, c:nc});
                            }
                        }
                    }
                }
                return count === shadedCells.length;
            }

            function checkAllRegionsConnected(st, regions) {
                for(const reg of regions) {
                    if (!isRegionConnected(st, reg)) return false;
                }
                return true;
            }

            function checkAdjacencyConstraints(st, regions, regMap) {
                // Two regions with same # shaded cells cannot be adjacent
                // We need to know adjacency graph of regions
                // Iterate all borders
                const regionCounts = regions.map(reg => 
                    reg.cells.filter(c => st[c.r][c.c] === 1).length
                );

                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        const rid = regMap[r][c];
                        const count = regionCounts[rid];

                        // Check Right Neighbor
                        if (c < C-1) {
                            const nid = regMap[r][c+1];
                            if (rid !== nid) {
                                if (count === regionCounts[nid]) return false;
                            }
                        }
                        // Check Bottom Neighbor
                        if (r < R-1) {
                            const nid = regMap[r+1][c];
                            if (rid !== nid) {
                                if (count === regionCounts[nid]) return false;
                            }
                        }
                    }
                }
                return true;
            }

            // Run with timeout to allow UI update
            setTimeout(() => {
                const result = backtrack(0);
                resolve(result);
            }, 10);
        });
    }
});

