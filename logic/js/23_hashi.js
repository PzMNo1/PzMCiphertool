document.addEventListener('DOMContentLoaded', function() {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const createGridBtn = document.getElementById('create-grid');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const solutionNav = document.getElementById('solutionNav');
    const solutionCount = document.getElementById('solution-count');
    const prevSolution = document.getElementById('prev-solution');
    const nextSolution = document.getElementById('next-solution');
    const backToEditBtn = document.getElementById('back-to-edit');
    
    let currentRows = 7;
    let currentCols = 7;
    let gridState = []; // number (1-8) or null
    let solutions = []; // each solution is grid of connections
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    
    createGridBtn.addEventListener('click', function() {
        currentRows = parseInt(rowsInput.value);
        currentCols = parseInt(colsInput.value);
        if (currentRows < 3) currentRows = 3;
        if (currentCols < 3) currentCols = 3;
        if (currentRows > 15) currentRows = 15;
        if (currentCols > 15) currentCols = 15;
        
        rowsInput.value = currentRows;
        colsInput.value = currentCols;
        createEmptyGrid();
    });
    
    function createEmptyGrid() {
        solutions = [];
        currentSolutionIndex = 0;
        solutionNav.style.display = 'none';
        result.innerHTML = '';
        
        gridState = Array(currentRows).fill().map(() => 
            Array(currentCols).fill().map(() => null));
            
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        puzzleGrid.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        puzzleGrid.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;
        
        for(let r=0; r<currentRows; r++) {
            for(let c=0; c<currentCols; c++) {
                createGridCell(r, c);
            }
        }
    }
    
    function createGridCell(r, c) {
        const div = document.createElement('div');
        div.className = 'hashi-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, gridState[r][c]);
        
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            // Only allow editing if no bridges are passing through (not implemented in edit mode yet)
            // In edit mode, we just set islands.
            
            this.contentEditable = true;
            // Find island div if exists
            let island = this.querySelector('.hashi-island');
            if (!island) {
                island = document.createElement('div');
                island.className = 'hashi-island editing';
                this.appendChild(island);
            } else {
                island.className = 'hashi-island editing';
            }
            
            island.textContent = '';
            island.focus();
            
            // Helper to clean up input
            const finishEdit = (val) => {
                this.contentEditable = false;
                if (val && !isNaN(val)) {
                    let n = parseInt(val);
                    if (n >= 1 && n <= 8) {
                        gridState[r][c] = n;
                    } else {
                        gridState[r][c] = null;
                    }
                } else {
                    gridState[r][c] = null;
                }
                updateCellDisplay(this, gridState[r][c]);
            };
            
            // We need to handle the editable element carefully
            // Actually contentEditable on parent might be weird if children exist.
            // Let's use a simple prompt or overlay input for robustness, 
            // or just type into the cell directly.
            // Using standard strategy from other puzzles:
            
            // Reset content for clean input
            this.innerHTML = '';
            this.classList.add('editing');
            this.textContent = '';
            this.focus();
            
            const saveVal = (e) => {
                let val = e.target.textContent.trim();
                this.classList.remove('editing');
                if (val && !isNaN(val)) {
                    let n = parseInt(val);
                    if (n >= 1 && n <= 8) gridState[r][c] = n;
                    else gridState[r][c] = null;
                } else {
                    gridState[r][c] = null;
                }
                this.contentEditable = false;
                updateCellDisplay(this, gridState[r][c]);
            };
            
            this.addEventListener('blur', saveVal, { once: true });
            this.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                }
            });
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, val) {
        el.innerHTML = '';
        el.className = 'hashi-cell';
        
        if (val !== null) {
            const island = document.createElement('div');
            island.className = 'hashi-island';
            island.textContent = val;
            el.appendChild(island);
        }
    }
    
    solveBtn.addEventListener('click', function() {
        result.innerHTML = '';
        loading.style.display = 'flex';
        let loadingTime = 0;
        const loadingTimer = setInterval(() => {
            loadingTime++;
            document.getElementById('loading-time').textContent = loadingTime;
        }, 1000);
        
        const puzzle = {
            R: currentRows,
            C: currentCols,
            grid: gridState
        };
        
        setTimeout(() => {
            try {
                solutions = jsHashiSolver(puzzle);
                if (!solutions || solutions.length === 0) {
                    result.innerHTML = `<div class="error-msg">未找到解决方案</div>`;
                } else {
                    currentSolutionIndex = 0;
                    isShowingSolution = true;
                    displaySolution(currentSolutionIndex);
                    solutionNav.style.display = 'flex';
                    solutionCount.textContent = `${currentSolutionIndex + 1}/${solutions.length}`;
                    result.innerHTML = `<div class="success-msg">找到 ${solutions.length} 个解决方案</div>`;
                }
            } catch (e) {
                console.error("求解错误:", e);
                result.innerHTML = `<div class="error-msg">求解出错: ${e.message}</div>`;
            } finally {
                loading.style.display = 'none';
                clearInterval(loadingTimer);
            }
        }, 50);
    });
    
    function displaySolution(index) {
        if (!solutions || !solutions.length) return;
        const sol = solutions[index];
        // sol: list of bridges. Bridge: {r1, c1, r2, c2, count}
        
        // Clear bridges
        const cells = puzzleGrid.querySelectorAll('.hashi-cell');
        cells.forEach(cell => {
            // Keep islands, remove bridges
            const bridges = cell.querySelectorAll('.bridge-h, .bridge-v, .bridge-double-h, .bridge-double-v');
            bridges.forEach(b => b.remove());
            
            const island = cell.querySelector('.hashi-island');
            if (island) {
                // Reset status classes
                island.classList.remove('completed');
                island.classList.remove('error');
                island.classList.add('completed'); // Assume correct for solution view
            }
        });
        
        // Draw bridges
        sol.forEach(bridge => {
            // Bridge connects (r1, c1) and (r2, c2)
            // They are aligned either horizontally or vertically.
            
            // We need to draw bridge segments in all cells BETWEEN the islands.
            // Note: Bridges do not overlap islands (handled by solver).
            // But visually, they pass through empty cells.
            
            const r1 = Math.min(bridge.r1, bridge.r2);
            const r2 = Math.max(bridge.r1, bridge.r2);
            const c1 = Math.min(bridge.c1, bridge.c2);
            const c2 = Math.max(bridge.c1, bridge.c2);
            const count = bridge.count;
            
            if (r1 === r2) { // Horizontal
                // From c1+1 to c2-1
                for(let c = c1 + 1; c < c2; c++) {
                    const cell = cells[r1 * currentCols + c];
                    const b = document.createElement('div');
                    b.className = count === 2 ? 'bridge-double-h' : 'bridge-h';
                    cell.appendChild(b);
                }
                // Add small connectors to the islands themselves?
                // CSS handles width=100% for cells. 
                // Islands are z-index 10, bridges z-index 5.
                // So bridges go "under" islands visually if we extend them.
                // We can extend into c1 and c2 cells.
                const cell1 = cells[r1 * currentCols + c1];
                const b1 = document.createElement('div');
                b1.className = count === 2 ? 'bridge-double-h' : 'bridge-h';
                cell1.appendChild(b1);
                
                const cell2 = cells[r1 * currentCols + c2];
                const b2 = document.createElement('div');
                b2.className = count === 2 ? 'bridge-double-h' : 'bridge-h';
                cell2.appendChild(b2);
                
            } else { // Vertical
                for(let r = r1 + 1; r < r2; r++) {
                    const cell = cells[r * currentCols + c1];
                    const b = document.createElement('div');
                    b.className = count === 2 ? 'bridge-double-v' : 'bridge-v';
                    cell.appendChild(b);
                }
                
                const cell1 = cells[r1 * currentCols + c1];
                const b1 = document.createElement('div');
                b1.className = count === 2 ? 'bridge-double-v' : 'bridge-v';
                cell1.appendChild(b1);
                
                const cell2 = cells[r2 * currentCols + c1];
                const b2 = document.createElement('div');
                b2.className = count === 2 ? 'bridge-double-v' : 'bridge-v';
                cell2.appendChild(b2);
            }
        });
        
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        
        const cells = puzzleGrid.querySelectorAll('.hashi-cell');
        cells.forEach(cell => {
            const bridges = cell.querySelectorAll('.bridge-h, .bridge-v, .bridge-double-h, .bridge-double-v');
            bridges.forEach(b => b.remove());
            const island = cell.querySelector('.hashi-island');
            if (island) {
                island.classList.remove('completed');
                island.classList.remove('error');
            }
        });
    });
    
    resetBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        createEmptyGrid();
    });
    
    prevSolution.addEventListener('click', function() {
        if (solutions.length > 1) {
            currentSolutionIndex = (currentSolutionIndex - 1 + solutions.length) % solutions.length;
            displaySolution(currentSolutionIndex);
        }
    });
    
    nextSolution.addEventListener('click', function() {
        if (solutions.length > 1) {
            currentSolutionIndex = (currentSolutionIndex + 1) % solutions.length;
            displaySolution(currentSolutionIndex);
        }
    });
    
    // --- Hashi Solver ---
    function jsHashiSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const grid = puzzle.grid; // R x C array
        const maxSolutions = 5;
        
        // Collect Islands
        const islands = [];
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (grid[r][c] !== null) {
                    islands.push({r, c, val: grid[r][c], current: 0, id: islands.length});
                }
            }
        }
        
        if (islands.length === 0) throw new Error("No islands found");
        
        // Find Potential Neighbors (Graph edges)
        // Two islands can connect if they are on same row/col and no islands between them.
        const edges = []; // {u, v, type: 'h'/'v'}
        
        // Horizontal edges
        for(let r=0; r<R; r++) {
            let lastIslandIdx = -1;
            for(let c=0; c<C; c++) {
                if (grid[r][c] !== null) {
                    const currIdx = islands.findIndex(i => i.r === r && i.c === c);
                    if (lastIslandIdx !== -1) {
                        edges.push({u: lastIslandIdx, v: currIdx, type: 'h', count: 0}); // u is left of v
                    }
                    lastIslandIdx = currIdx;
                }
            }
        }
        
        // Vertical edges
        for(let c=0; c<C; c++) {
            let lastIslandIdx = -1;
            for(let r=0; r<R; r++) {
                if (grid[r][c] !== null) {
                    const currIdx = islands.findIndex(i => i.r === r && i.c === c);
                    if (lastIslandIdx !== -1) {
                        edges.push({u: lastIslandIdx, v: currIdx, type: 'v', count: 0}); // u is above v
                    }
                    lastIslandIdx = currIdx;
                }
            }
        }
        
        // Crossing logic:
        // A horizontal edge between (r, c1) and (r, c2)
        // A vertical edge between (r1, c) and (r2, c)
        // They cross if r1 < r < r2 AND c1 < c < c2.
        // If two edges cross, they cannot BOTH be > 0.
        
        // Precompute crossing pairs
        const crossingPairs = [];
        for(let i=0; i<edges.length; i++) {
            for(let j=i+1; j<edges.length; j++) {
                const e1 = edges[i];
                const e2 = edges[j];
                if (e1.type !== e2.type) {
                    const h = e1.type === 'h' ? e1 : e2;
                    const v = e1.type === 'v' ? e1 : e2;
                    // h connects islands[h.u] and islands[h.v]
                    const h_r = islands[h.u].r;
                    const h_c1 = islands[h.u].c;
                    const h_c2 = islands[h.v].c;
                    
                    const v_c = islands[v.u].c;
                    const v_r1 = islands[v.u].r;
                    const v_r2 = islands[v.v].r;
                    
                    if (v_r1 < h_r && h_r < v_r2 && h_c1 < v_c && v_c < h_c2) {
                        crossingPairs.push([i, j]);
                    }
                }
            }
        }
        
        const solutions = [];
        
        // DSU for connectivity
        const parent = new Int32Array(islands.length).fill(-1);
        function find(i) {
            let root = i;
            while(parent[root] >= 0) root = parent[root];
            return root;
        }
        function union(i, j) {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                if (parent[rootI] < parent[rootJ]) {
                    parent[rootI] += parent[rootJ];
                    parent[rootJ] = rootI;
                    return [rootJ, rootI]; 
                } else {
                    parent[rootJ] += parent[rootI];
                    parent[rootI] = rootJ;
                    return [rootI, rootJ];
                }
            }
            return null;
        }
        
        // Backtracking on edges
        // Each edge can have 0, 1, or 2 bridges.
        // Constraints:
        // - Island capacity
        // - Crossings
        // - Connectivity (at the end)
        
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === edges.length) {
                // Check full connectivity
                // Find number of components with bridges
                // Actually, ALL islands must be connected.
                // Check if all islands are in same component.
                let root = find(0);
                // Optimization: check size directly
                if (-parent[root] !== islands.length) return;
                
                // Check all island capacities met exactly
                for(let i=0; i<islands.length; i++) {
                    if (islands[i].current !== islands[i].val) return;
                }
                
                // Build solution
                const sol = [];
                for(const e of edges) {
                    if (e.count > 0) {
                        sol.push({
                            r1: islands[e.u].r, c1: islands[e.u].c,
                            r2: islands[e.v].r, c2: islands[e.v].c,
                            count: e.count
                        });
                    }
                }
                solutions.push(sol);
                return;
            }
            
            const edge = edges[idx];
            
            // Check if blocked by existing crossing edge
            let blocked = false;
            for(const pair of crossingPairs) {
                if (pair[0] === idx) { // idx is one of them
                    const other = edges[pair[1]];
                    if (other.count > 0) { blocked = true; break; } // Future edge? No, pair[1] > idx.
                    // Crossing pairs are (i, j) with i < j.
                    // So if we are at i, j is future. j is not set yet (count=0).
                    // We only care if we are at j, and i is already set.
                } else if (pair[1] === idx) {
                    const other = edges[pair[0]];
                    if (other.count > 0) { blocked = true; break; }
                }
            }
            
            // Determine possible counts (0, 1, 2)
            // Restricted by: blocked, island capacity
            let possible = [0];
            if (!blocked) {
                const uRem = islands[edge.u].val - islands[edge.u].current;
                const vRem = islands[edge.v].val - islands[edge.v].current;
                const maxBridges = Math.min(2, uRem, vRem);
                for(let k=1; k<=maxBridges; k++) possible.push(k);
            }
            
            // Heuristic: Try larger bridges first to connectivity?
            // Or 0 first to be sparse?
            // Hashi usually has many connections. Try 2, 1, 0?
            // Let's stick to 0, 1, 2 for standard search unless optimize.
            possible.reverse(); // 2, 1, 0
            
            for(const cnt of possible) {
                edge.count = cnt;
                islands[edge.u].current += cnt;
                islands[edge.v].current += cnt;
                
                let dsuLog = null;
                if (cnt > 0) {
                    dsuLog = union(edge.u, edge.v);
                }
                
                // Pruning: Connectivity Check?
                // If we leave an island saturated but isolated, fail.
                // Hard to check cheaply.
                
                // Check if we oversaturated (already handled by maxBridges)
                
                solve(idx + 1);
                
                // Backtrack
                if (dsuLog) {
                    const [child, p] = dsuLog;
                    // We need old child value.
                    // Here we don't have it.
                    // Wait, standard union by size:
                    // parent[p] -= parent[child]; parent[child] = -1;
                    // Is this correct?
                    // parent[child] was a root, so it was negative size.
                    // parent[p] was negative size.
                    // new parent[p] = old p + old child.
                    // parent[child] is now index p.
                    // Restore:
                    // We need to know how much was added.
                    // But `parent[child]` holds `p`. We lost the size of child.
                    // We MUST return size in union.
                    // However, we can re-calculate size of child?
                    // No.
                    // Let's just implement union with logging or simpler DSU.
                    // Since recursion depth is bounded by edges, we can afford to pass state?
                    // Or just use the `dsuLog` to store value.
                    // We didn't update `union` function here.
                    // We need to fix `union`.
                }
                islands[edge.u].current -= cnt;
                islands[edge.v].current -= cnt;
                edge.count = 0;
            }
        }
        
        // Fix Union for Backtracking
        function union_safe(i, j) {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                if (parent[rootI] < parent[rootJ]) {
                    const oldVal = parent[rootI]; // I is bigger (more negative)
                    parent[rootI] += parent[rootJ];
                    parent[rootJ] = rootI;
                    return {p: rootI, child: rootJ, childVal: parent[rootJ] /*Wait*/ };
                    // We need val of J.
                    // parent[rootJ] is now rootI.
                    // We need old value of rootJ.
                    // Return {p: rootI, child: rootJ, oldChildVal: oldVal (No, old val of J) }
                } else {
                    // J is bigger or equal
                    const oldValI = parent[rootI];
                    const oldValJ = parent[rootJ];
                    parent[rootJ] += parent[rootI];
                    parent[rootI] = rootJ;
                    return {p: rootJ, child: rootI, oldChildVal: oldValI};
                }
            }
            return null;
        }
        
        // Correct `solve` to use `union_safe` and restore correctly
        // But wait, `union` above was buggy for backtrack.
        // Let's patch `solve` loop:
        
        // Re-define solve inside to access fixed union
        const solve2 = (idx) => {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === edges.length) {
                let root = find(0);
                if (-parent[root] !== islands.length) return;
                for(let i=0; i<islands.length; i++) {
                    if (islands[i].current !== islands[i].val) return;
                }
                const sol = [];
                for(const e of edges) {
                    if (e.count > 0) {
                        sol.push({
                            r1: islands[e.u].r, c1: islands[e.u].c,
                            r2: islands[e.v].r, c2: islands[e.v].c,
                            count: e.count
                        });
                    }
                }
                solutions.push(sol);
                return;
            }
            
            const edge = edges[idx];
            let blocked = false;
            // Crossing check only against *previous* edges (indices < idx)
            // Wait, blocked if ANY crossing edge is active.
            // crossingPairs has [i, j] where i < j.
            // If we are at j (idx), we check i. If i active, we are blocked.
            // If we are at i (idx), we check j. j is not active yet.
            // So we only check if `other < idx` and `other.count > 0`.
            
            for(const pair of crossingPairs) {
                let otherIdx = -1;
                if (pair[0] === idx) otherIdx = pair[1];
                else if (pair[1] === idx) otherIdx = pair[0];
                
                if (otherIdx !== -1 && otherIdx < idx) {
                    if (edges[otherIdx].count > 0) {
                        blocked = true; break;
                    }
                }
            }
            
            let possible = [0];
            if (!blocked) {
                const uRem = islands[edge.u].val - islands[edge.u].current;
                const vRem = islands[edge.v].val - islands[edge.v].current;
                const maxBridges = Math.min(2, uRem, vRem);
                for(let k=1; k<=maxBridges; k++) possible.push(k);
            }
            possible.reverse();
            
            for(const cnt of possible) {
                edge.count = cnt;
                islands[edge.u].current += cnt;
                islands[edge.v].current += cnt;
                
                let dsuLog = null;
                if (cnt > 0) {
                    // Inlined safe union
                    const rootI = find(edge.u);
                    const rootJ = find(edge.v);
                    if (rootI !== rootJ) {
                        if (parent[rootI] < parent[rootJ]) { // I larger
                            dsuLog = {p: rootI, child: rootJ, oldVal: parent[rootJ]};
                            parent[rootI] += parent[rootJ];
                            parent[rootJ] = rootI;
                        } else {
                            dsuLog = {p: rootJ, child: rootI, oldVal: parent[rootI]};
                            parent[rootJ] += parent[rootI];
                            parent[rootI] = rootJ;
                        }
                    }
                }
                
                solve2(idx + 1);
                
                // Backtrack
                if (dsuLog) {
                    const {p, child, oldVal} = dsuLog;
                    parent[p] -= oldVal; // Subtract the added size
                    parent[child] = oldVal; // Restore original root value
                }
                islands[edge.u].current -= cnt;
                islands[edge.v].current -= cnt;
                edge.count = 0;
            }
        };
        
        solve2(0);
        return solutions;
    }
    
    createEmptyGrid();
});
























