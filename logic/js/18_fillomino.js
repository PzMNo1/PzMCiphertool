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
    
    let currentRows = 8;
    let currentCols = 8;
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
            Array(currentCols).fill().map(() => ({ type: 'empty', value: null })));
            
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
        div.className = 'fillomino-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, gridState[r][c]);
        
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            this.contentEditable = true;
            this.classList.add('editing');
            this.textContent = '';
            this.focus();
            
            const saveNum = (e) => {
                let val = e.target.textContent.trim();
                if (val && !isNaN(val) && parseInt(val) > 0) {
                    gridState[r][c] = { type: 'fixed', value: parseInt(val) };
                } else {
                    gridState[r][c] = { type: 'empty', value: null };
                }
                this.contentEditable = false;
                this.classList.remove('editing');
                updateCellDisplay(this, gridState[r][c]);
            };
            
            this.addEventListener('blur', saveNum, { once: true });
            this.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                }
            });
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, state, neighbors = null) {
        el.className = 'fillomino-cell';
        el.textContent = '';
        
        if (state.type === 'fixed') {
            el.classList.add('fixed');
            el.textContent = state.value;
        } else if (state.value !== null) { // Solution value
            el.textContent = state.value;
        }

        // Apply borders if neighbors provided (Solution mode)
        if (neighbors) {
            // neighbors: {top: val, bottom: val, left: val, right: val}
            // border if different value
            const val = state.value;
            if (neighbors.top !== val) el.classList.add('border-top');
            if (neighbors.bottom !== val) el.classList.add('border-bottom');
            if (neighbors.left !== val) el.classList.add('border-left');
            if (neighbors.right !== val) el.classList.add('border-right');
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
                solutions = jsFillominoSolver(puzzle);
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
        
        const cells = puzzleGrid.querySelectorAll('.fillomino-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            const val = sol[r][c];
            
            // Determine borders
            const neighbors = {
                top: (r > 0) ? sol[r-1][c] : -1,
                bottom: (r < currentRows - 1) ? sol[r+1][c] : -1,
                left: (c > 0) ? sol[r][c-1] : -1,
                right: (c < currentCols - 1) ? sol[r][c+1] : -1
            };
            
            const state = gridState[r][c].type === 'fixed' ? 
                { type: 'fixed', value: val } : 
                { type: 'solved', value: val };
                
            updateCellDisplay(cell, state, neighbors);
        });
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        
        // Re-render to remove borders and restore original state display
        const cells = puzzleGrid.querySelectorAll('.fillomino-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            updateCellDisplay(cell, gridState[r][c]);
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
    
    // --- Fillomino Solver ---
    function jsFillominoSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const maxSolutions = 5;
        
        const grid = Array(R).fill().map(() => Array(C).fill(0));
        const fixed = Array(R).fill().map(() => Array(C).fill(false));
        
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (puzzle.grid[r][c].value !== null) {
                    grid[r][c] = puzzle.grid[r][c].value;
                    fixed[r][c] = true;
                }
            }
        }
        
        const solutions = [];
        const parent = new Int32Array(R*C).fill(-1); // DSU parent
        
        function find(i) {
            let root = i;
            while(parent[root] >= 0) root = parent[root];
            return root;
        }
        
        function union_record(i, j) {
            let rootI = find(i);
            let rootJ = find(j);
            if(rootI !== rootJ) {
                if(parent[rootI] > parent[rootJ]) { // size I < size J (negative values)
                    const oldChildVal = parent[rootI];
                    parent[rootJ] += parent[rootI];
                    parent[rootI] = rootJ;
                    return [rootI, rootJ, oldChildVal];
                } else {
                    const oldChildVal = parent[rootJ];
                    parent[rootI] += parent[rootJ];
                    parent[rootJ] = rootI;
                    return [rootJ, rootI, oldChildVal];
                }
            }
            return null;
        }
        
        // Helper to check if component can extend
        function canExtend(rootIdx, needed) {
             const q = [];
             const visited = new Uint8Array(R*C);
             const componentVal = grid[Math.floor(rootIdx/C)][rootIdx%C];
             
             let count = 0;
             // Scan grid to find component cells
             // (Optimization: pass a hint or list if possible, but scan is safest without complex structures)
             // Just scanning the grid O(N) is acceptable for N<=100-200 in Backtracking?
             // Actually, we can optimize by checking if parent[i] leads to rootIdx.
             // But parent[i] points up, need path compression or traversal.
             // Simple traversal:
             
             // Collect component cells
             for(let i=0; i<R*C; i++) {
                 // We only care about filled cells that are part of this component
                 const r = Math.floor(i/C);
                 const c = i%C;
                 if (grid[r][c] === componentVal && find(i) === rootIdx) {
                     const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
                     for(const [dr, dc] of dirs) {
                         const nr = r + dr, nc = c + dc;
                         if(nr>=0 && nr<R && nc>=0 && nc<C) {
                             const nIdx = nr*C+nc;
                             if (!visited[nIdx]) {
                                 // If Empty or Fixed-with-same-value
                                 const nVal = grid[nr][nc];
                                 // nVal is 0 if empty, or value if fixed/filled
                                 if (nVal === 0 || (fixed[nr][nc] && nVal === componentVal)) {
                                     visited[nIdx] = 1;
                                     q.push(nIdx);
                                     count++;
                                 }
                             }
                         }
                     }
                 }
             }
             
             if (count >= needed) return true;
             
             // BFS
             let head = 0;
             while(head < q.length) {
                 if (count >= needed) return true;
                 const curr = q[head++];
                 const cr = Math.floor(curr/C);
                 const cc = curr%C;
                 
                 const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
                 for(const [dr, dc] of dirs) {
                     const nr = cr + dr, nc = cc + dc;
                     if(nr>=0 && nr<R && nc>=0 && nc<C) {
                         const nIdx = nr*C+nc;
                         if (!visited[nIdx]) {
                             const nVal = grid[nr][nc];
                             if (nVal === 0 || (fixed[nr][nc] && nVal === componentVal)) {
                                 visited[nIdx] = 1;
                                 q.push(nIdx);
                                 count++;
                             }
                         }
                     }
                 }
             }
             return count >= needed;
        }

        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === R * C) {
                // Validate final sizes
                for(let i=0; i<R*C; i++) {
                    if (parent[i] < 0) { // root
                        const r = Math.floor(i / C);
                        const c = i % C;
                        const val = grid[r][c];
                        const size = -parent[i];
                        if (size !== val) return;
                    }
                }
                solutions.push(grid.map(row => [...row]));
                return;
            }
            
            const r = Math.floor(idx / C);
            const c = idx % C;
            
            // Determine candidates
            let candidates = [];
            if (fixed[r][c]) {
                candidates.push(grid[r][c]);
            } else {
                const neighborVals = new Set();
                if (r > 0) neighborVals.add(grid[r-1][c]);
                if (c > 0) neighborVals.add(grid[r][c-1]);
                // Add heuristics
                const sorted = [];
                neighborVals.forEach(v => sorted.push(v));
                sorted.sort((a,b) => a-b);
                
                // Try 1..9 if not present, plus maybe specialized larger values?
                // Just standard 1..9 for now.
                for(let k=1; k<=9; k++) { 
                    if (!neighborVals.has(k)) sorted.push(k);
                }
                // Also try values appearing in the grid (fixed clues) that are reachable?
                // For solving arbitrary size, maybe check distinct fixed values.
                // But 1..9 covers most small logic puzzles.
                
                candidates = sorted;
            }
            
            for(const val of candidates) {
                grid[r][c] = val;
                
                // DSU Update
                const rollback = []; 
                const currentIdx = r * C + c;
                parent[currentIdx] = -1; 
                
                let valid = true;
                
                // Union Up
                if (r > 0 && grid[r-1][c] === val) {
                    const upIdx = (r-1)*C + c;
                    const res = union_record(currentIdx, upIdx);
                    if (res) {
                        rollback.push(res);
                        if (-parent[res[1]] > val) valid = false;
                    }
                }
                
                // Union Left
                if (valid && c > 0 && grid[r][c-1] === val) {
                    const leftIdx = r*C + (c-1);
                    const res = union_record(currentIdx, leftIdx);
                    if (res) {
                        rollback.push(res);
                        if (-parent[res[1]] > val) valid = false;
                    }
                }
                
                // Pruning: Check if neighbor components (different value) are valid
                if (valid && r > 0 && grid[r-1][c] !== val) {
                    const upIdx = (r-1)*C + c;
                    const rootUp = find(upIdx);
                    // Only check if not checked before (optimization?)
                    // Just check always
                    const currentSize = -parent[rootUp];
                    const targetSize = grid[r-1][c];
                    if (currentSize < targetSize) {
                        if (!canExtend(rootUp, targetSize - currentSize)) valid = false;
                    } else if (currentSize > targetSize) {
                        valid = false;
                    }
                }
                
                if (valid && c > 0 && grid[r][c-1] !== val) {
                    const leftIdx = r*C + (c-1);
                    const rootLeft = find(leftIdx);
                    // If Up was same val as Left, we already checked rootLeft (same as rootUp).
                    // Check if Up is diff from Left
                    let needCheck = true;
                    if (r > 0 && grid[r-1][c] !== val && find((r-1)*C+c) === rootLeft) needCheck = false;
                    
                    if (needCheck) {
                        const currentSize = -parent[rootLeft];
                        const targetSize = grid[r][c-1];
                        if (currentSize < targetSize) {
                            if (!canExtend(rootLeft, targetSize - currentSize)) valid = false;
                        } else if (currentSize > targetSize) {
                            valid = false;
                        }
                    }
                }

                if (valid) {
                    solve(idx + 1);
                }
                
                // Rollback
                while(rollback.length > 0) {
                    const [child, p, oldChildVal] = rollback.pop();
                    parent[p] -= oldChildVal; // Wait, parent size was += parent[child].
                    // parent[child] was oldChildVal (negative size).
                    // parent[p] (new) = parent[p] (old) + oldChildVal.
                    // So parent[p] (old) = parent[p] (new) - oldChildVal.
                    // Since oldChildVal is negative, we subtract a negative = add positive?
                    // No, size accumulates.
                    // Example: P size 2 (-2). C size 1 (-1).
                    // P new = -2 + -1 = -3.
                    // Restore: P old = -3 - (-1) = -2. Correct.
                    parent[child] = oldChildVal;
                }
                
                if (!fixed[r][c]) grid[r][c] = 0;
            }
        }
        
        try {
            solve(0);
        } catch(e) {
             console.error(e);
        }
        return solutions;
    }
    
    createEmptyGrid();
});
