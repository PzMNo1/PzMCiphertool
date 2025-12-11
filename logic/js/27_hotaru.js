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
    // Grid state: null or object { num: string/null, dir: 'u'/'d'/'l'/'r' }
    let gridState = []; 
    let solutions = [];
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
            Array(currentCols).fill(null));
            
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
        div.className = 'hotaru-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, r, c);
        
        // Left Click: Cycle Dir (or add dot if null)
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            // If clicking the number inside, don't cycle direction
            if (e.target.tagName === 'SPAN') {
                editNumber(r, c, e.target);
                e.stopPropagation();
                return;
            }
            
            if (gridState[r][c] === null) {
                gridState[r][c] = { num: null, dir: 'u' };
            } else {
                const dirs = ['u', 'r', 'd', 'l'];
                const idx = dirs.indexOf(gridState[r][c].dir);
                if (idx === 3) {
                    gridState[r][c] = null; // Cycle back to empty
                } else {
                    gridState[r][c].dir = dirs[idx + 1];
                }
            }
            updateCellDisplay(div, r, c);
        });
        
        // Right Click: Remove Dot
        div.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (isShowingSolution) return;
            
            if (gridState[r][c] !== null) {
                gridState[r][c] = null;
                updateCellDisplay(div, r, c);
            }
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function editNumber(r, c, span) {
        const currentVal = gridState[r][c].num;
        const input = prompt("输入转弯次数 (留空表示任意):", currentVal !== null ? currentVal : "");
        if (input !== null) {
            if (input.trim() === "") {
                gridState[r][c].num = null;
            } else if (!isNaN(input) && parseInt(input) >= 0) {
                gridState[r][c].num = parseInt(input);
            }
            const cell = puzzleGrid.children[r * currentCols + c];
            updateCellDisplay(cell, r, c);
        }
    }
    
    function updateCellDisplay(el, r, c) {
        el.innerHTML = '';
        el.className = 'hotaru-cell';
        
        // Draw Dot
        if (gridState[r][c] !== null) {
            const dot = document.createElement('div');
            dot.className = `hotaru-dot dir-${gridState[r][c].dir}`;
            
            const span = document.createElement('span');
            if (gridState[r][c].num !== null) {
                span.textContent = gridState[r][c].num;
            }
            dot.appendChild(span);
            el.appendChild(dot);
        }
        
        // Draw Solution Beam
        if (isShowingSolution && solutions.length > 0) {
            const sol = solutions[currentSolutionIndex];
            // sol is a grid of path directions/types
            // Types: 'h', 'v', 'ul', 'ur', 'dl', 'dr' (turns)
            const cellType = sol[r][c];
            if (cellType) {
                // Map types to CSS classes
                if (cellType === 'h') {
                    const beam = document.createElement('div'); beam.className = 'beam-segment beam-h'; el.appendChild(beam);
                } else if (cellType === 'v') {
                    const beam = document.createElement('div'); beam.className = 'beam-segment beam-v'; el.appendChild(beam);
                } else {
                    const beam = document.createElement('div'); beam.className = `beam-segment beam-turn-${cellType}`; el.appendChild(beam);
                }
            }
        }
    }
    
    solveBtn.addEventListener('click', function() {
        // Validate at least 2 dots
        let dotCount = 0;
        for(let r=0; r<currentRows; r++) for(let c=0; c<currentCols; c++) if(gridState[r][c]) dotCount++;
        
        if (dotCount < 2) {
            result.innerHTML = `<div class="error-msg">至少需要2个圆点</div>`;
            return;
        }

        result.innerHTML = '';
        loading.style.display = 'flex';
        
        const puzzle = {
            R: currentRows,
            C: currentCols,
            grid: gridState
        };
        
        setTimeout(() => {
            try {
                solutions = jsHotaruSolver(puzzle);
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
            }
        }, 50);
    });
    
    function displaySolution(index) {
        if (!solutions || !solutions.length) return;
        const cells = puzzleGrid.querySelectorAll('.hotaru-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            updateCellDisplay(cell, r, c);
        });
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        const cells = puzzleGrid.querySelectorAll('.hotaru-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            updateCellDisplay(cell, r, c);
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
    
    // --- Hotaru Solver ---
    function jsHotaruSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const dots = [];
        const grid = puzzle.grid; // Contains dot info
        
        // Collect dots
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (grid[r][c]) {
                    dots.push({
                        r, c, 
                        dir: grid[r][c].dir, 
                        num: grid[r][c].num,
                        id: dots.length,
                        outPath: null, // Will store path cells
                        targetId: null
                    });
                }
            }
        }
        
        // We need to connect every dot D_i to some D_j.
        // Each dot must have exactly 1 outgoing path and 1 incoming path.
        // The paths form a set of cycles.
        // The problem requires *overall connectivity*, so it must be a SINGLE cycle visiting all dots.
        // This is a TSP / Hamiltonian Path problem on the dots with specific pathfinding constraints.
        
        // Constraints on Path from D_i:
        // - Starts in D_i.dir.
        // - Turns exactly D_i.num times (if num != null).
        // - Ends at some D_j (entering from any direction).
        // - Path cannot self-intersect or intersect other paths.
        
        // Approach:
        // Backtracking on Dots.
        // Order dots by index.
        // For Dot i, find a path to some Dot j (j != i, j not visited as target yet).
        // Mark path on grid.
        // Recurse.
        
        const usedGrid = Array(R).fill().map(() => Array(C).fill(false));
        // Mark dots as used (but they are valid start/end points)
        for(const d of dots) usedGrid[d.r][d.c] = true; 
        // Wait, path *can* pass through dots?
        // No, "Beam stops when it hits another dot".
        // So dots are terminals. Intermediate cells must be empty.
        
        const solutions = [];
        const maxSolutions = 1;
        
        // Track incoming connections for dots
        const dotHasIn = Array(dots.length).fill(false);
        
        // Solution path visualization grid
        const solPathGrid = Array(R).fill().map(() => Array(C).fill(null));
        
        // DSU to track connectivity of components
        const parent = new Int32Array(dots.length).fill(-1);
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
                    const oldVal = parent[rootI];
                    parent[rootI] += parent[rootJ];
                    parent[rootJ] = rootI;
                    return {p: rootI, child: rootJ, oldVal: parent[rootJ]};
                } else {
                    const oldVal = parent[rootJ];
                    parent[rootJ] += parent[rootI];
                    parent[rootI] = rootJ;
                    return {p: rootJ, child: rootI, oldVal: parent[rootI]};
                }
            }
            return null;
        }
        
        // BFS/DFS to find path from Dot 'startDotIdx' to ANY available target dot.
        function solve(dotIdx) {
            if (solutions.length >= maxSolutions) return;
            
            if (dotIdx === dots.length) {
                // All dots have outgoing paths.
                // Check single cycle connectivity.
                const root = find(0);
                if (-parent[root] === dots.length) {
                    // Valid solution found.
                    // Clone solution grid
                    solutions.push(solPathGrid.map(row => [...row]));
                }
                return;
            }
            
            const startDot = dots[dotIdx];
            
            // Find paths from startDot
            // State: r, c, dir, turns, path_cells
            // Initial: startDot.r, startDot.c, startDot.dir
            
            // We can use DFS to explore paths.
            // Max turns could be limited (e.g. size of grid). If num is null, set reasonable limit?
            // Solver says "max_possible_turns" calculated.
            // If no number, max turns < R*C.
            
            const targetTurns = startDot.num;
            
            // DFS Stack: {r, c, dir, turns, path}
            // This might be slow if grid is large. 7x7 is small enough.
            
            // We need to pass `usedGrid` state.
            // Since we are in backtracking loop, we modify global `usedGrid`.
            
            // Helper to explore paths
            findPathsAndRecurse(dotIdx, startDot.r, startDot.c, startDot.dir, 0, []);
        }
        
        function findPathsAndRecurse(dotIdx, r, c, dir, turns, currentPath) {
            if (solutions.length >= maxSolutions) return;
            
            // Move one step in `dir`
            let dr = 0, dc = 0;
            if (dir === 'u') dr = -1;
            else if (dir === 'd') dr = 1;
            else if (dir === 'l') dc = -1;
            else if (dir === 'r') dc = 1;
            
            const nr = r + dr;
            const nc = c + dc;
            
            // Check bounds
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) return;
            
            // Check collision
            // If hit a dot:
            if (grid[nr][nc]) {
                // Target found!
                const targetDotIdx = dots.findIndex(d => d.r === nr && d.c === nc);
                
                // Validate:
                // 1. Target is not Start (no self-loop immediately? Actually self-loop allowed if it's the ONLY dot? No, rules say "another dot" usually, but solver implies single loop. A loop of 1 is minimal. But rules say "hit another dot".)
                // Actually, if size > 1, must hit another.
                // Also target must not have IN beam yet.
                if (targetDotIdx !== dotIdx && !dotHasIn[targetDotIdx]) {
                    // Validate turns
                    if (targetTurns === null || turns === targetTurns) {
                        // Valid Path found.
                        // Apply state
                        dotHasIn[targetDotIdx] = true;
                        
                        // Mark path on solPathGrid
                        const addedCells = [];
                        for(const cell of currentPath) {
                            usedGrid[cell.r][cell.c] = true;
                            solPathGrid[cell.r][cell.c] = cell.type; 
                            addedCells.push(cell);
                        }
                        
                        // DSU Union
                        const dsuLog = union(dotIdx, targetDotIdx);
                        
                        // Recurse to next dot
                        solve(dotIdx + 1);
                        
                        // Backtrack
                        if (dsuLog) {
                            const {p, child, oldVal} = dsuLog;
                            parent[p] -= oldVal; // This was buggy before? 
                            // parent[p] stores size (negative).
                            // We added parent[child] (size).
                            // Wait, union logic:
                            // parent[rootI] += parent[rootJ];
                            // To restore: parent[rootI] -= parent[rootJ] (which is the size of J we added).
                            // But parent[rootJ] is now rootI. We lost size of J.
                            // So we return oldVal (size of J, or value of J).
                            // If J was root, oldVal is negative size.
                            // parent[p] -= oldVal. (e.g. -5 - (-2) = -3). Correct.
                            parent[child] = oldVal;
                        }
                        
                        for(const cell of addedCells) {
                            usedGrid[cell.r][cell.c] = false;
                            solPathGrid[cell.r][cell.c] = null;
                        }
                        dotHasIn[targetDotIdx] = false;
                    }
                }
                return; // Stop beam at dot
            }
            
            // If empty cell
            if (usedGrid[nr][nc]) return; // Blocked
            
            // Continue beam through (nr, nc)
            // Option 1: Straight
            // Option 2: Turn Left
            // Option 3: Turn Right
            // Pruning: If current turns > targetTurns, stop.
            
            // Optimization: Check if we can reach ANY target with remaining turns? (Manhattan dist)
            // Simple pruning:
            if (targetTurns !== null && turns > targetTurns) return;
            
            // 1. Straight
            // Record cell type for visualization
            // Previous cell was (r,c). Current is (nr,nc).
            // We determine type of (nr,nc) based on NEXT move.
            // Wait, visualization needs type on the CELL.
            // If we go straight through (nr,nc), type is 'h' or 'v'.
            // If we turn at (nr,nc), type is corner.
            // But we don't know next move yet.
            // We should record type of (r,c)? No, currentPath stores PREVIOUS cells.
            // (nr,nc) is being entered.
            // We can infer type later? Or store (r,c) and its type.
            
            // Actually, we need to record what we put at (nr,nc).
            // When we recurse, we decide what (nr,nc) does.
            // But (nr,nc) is just a path segment.
            // Let's modify `findPathsAndRecurse` to take `lastCell` and `currentPath`.
            
            // Let's iterate possible NEXT moves from (nr,nc)
            
            const nextMoves = [];
            // Straight
            nextMoves.push({ ndir: dir, nturns: turns, type: (dir==='u'||dir==='d')?'v':'h' });
            // Turn Left (relative)
            // u -> l, l -> d, d -> r, r -> u
            // Turn Right (relative)
            // u -> r, r -> d, d -> l, l -> u
            
            const dirs = ['u', 'r', 'd', 'l'];
            const idx = dirs.indexOf(dir);
            
            // Left Turn
            const lDir = dirs[(idx + 3) % 4];
            let lType = '';
            if (dir==='u') lType = 'ul'; // Coming from down (Up), going Left. ┐. Corner is Top-Right? No.
            // Beam comes FROM bottom, enters cell, turns Left (points West).
            // Path shape: ┐. This connects Bottom and Left.
            // My CSS classes: `beam-turn-dl` (Down to Left? No, connect D and L).
            // CSS classes: `ul` (Up-Left).
            // Let's map:
            // From Bottom (dir=u) to Left (dir=l): Bottom-Left connection? No.
            // Enters from Bottom, Exits Left. Shape is ┐.
            // This connects Bottom and Left.
            // CSS `beam-turn-dl`: border-right (connects right?), border-top (connects top?).
            // Let's stick to connectivity names.
            // u (from bottom) -> l (to left). Connects Bottom & Left. Name: `bl`.
            
            const getType = (inDir, outDir) => {
                // inDir is direction beam is MOVING.
                // entering from: opposite of inDir.
                // exiting to: outDir.
                const fromMap = { 'u': 'b', 'd': 't', 'l': 'r', 'r': 'l' };
                const toMap = { 'u': 't', 'd': 'b', 'l': 'l', 'r': 'r' };
                const f = fromMap[inDir];
                const t = toMap[outDir];
                const s = [f,t].sort().join('');
                // Map to CSS class names (ul, ur, dl, dr)
                // ul = Top+Left. ur = Top+Right. dl = Bottom+Left. dr = Bottom+Right.
                if (s === 'lt') return 'ul'; // Left-Top
                if (s === 'rt') return 'ur'; // Right-Top
                if (s === 'bl') return 'dl'; // Bottom-Left
                if (s === 'br') return 'dr'; // Bottom-Right
                return 'unknown';
            };
            
            // Left Turn
            if (targetTurns === null || turns + 1 <= targetTurns) {
                nextMoves.push({ ndir: lDir, nturns: turns + 1, type: getType(dir, lDir) });
            }
            
            // Right Turn
            const rDir = dirs[(idx + 1) % 4];
            if (targetTurns === null || turns + 1 <= targetTurns) {
                nextMoves.push({ ndir: rDir, nturns: turns + 1, type: getType(dir, rDir) });
            }
            
            for(const move of nextMoves) {
                // We occupy (nr, nc) with `move.type`
                currentPath.push({r: nr, c: nc, type: move.type});
                // Recurse from (nr, nc)
                findPathsAndRecurse(dotIdx, nr, nc, move.ndir, move.nturns, currentPath);
                currentPath.pop();
            }
        }
        
        solve(0);
        return solutions;
    }
    
    createEmptyGrid();
});
























