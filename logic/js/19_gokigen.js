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
    
    let currentRows = 5;
    let currentCols = 5;
    let gridState = []; // cells state: 0=empty, 1=/, 2=\
    let clueState = []; // intersection clues: null or 0-4
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    
    createGridBtn.addEventListener('click', function() {
        currentRows = parseInt(rowsInput.value);
        currentCols = parseInt(colsInput.value);
        if (currentRows < 2) currentRows = 2;
        if (currentCols < 2) currentCols = 2;
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
        
        // gridState is R x C
        gridState = Array(currentRows).fill().map(() => Array(currentCols).fill(0));
        
        // clueState is (R+1) x (C+1)
        clueState = Array(currentRows + 1).fill().map(() => Array(currentCols + 1).fill(null));
        
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        // Grid layout: Alternating Intersection (10px) and Cell (40px)
        // Col Template: 10px 40px 10px 40px ... 10px
        let colTemp = '';
        for(let c=0; c<currentCols; c++) colTemp += '24px 40px ';
        colTemp += '24px';
        
        let rowTemp = '';
        for(let r=0; r<currentRows; r++) rowTemp += '24px 40px ';
        rowTemp += '24px';
        
        puzzleGrid.style.gridTemplateColumns = colTemp;
        puzzleGrid.style.gridTemplateRows = rowTemp;
        
        // We iterate by intersection rows
        for(let r=0; r <= currentRows; r++) {
            // Intersection Row
            for(let c=0; c <= currentCols; c++) {
                // Add Intersection
                createIntersection(r, c);
                
                // Add Horizontal Gap (if not last col) - actually gap is handled by grid layout implicitly?
                // Wait, we need to place items in correct grid cells.
                // Intersection (r, c) is at grid row (2r+1), grid col (2c+1)
                
                // If we are not at last col, maybe add a "Horizonal Edge Placeholder"? 
                // No, Gokigen doesn't have edges between intersections like Slitherlink.
                // The "Cell" is strictly between intersections.
                
                // We need to fill the grid slots.
                // Slot (2r+1, 2c+2) is horizontal space between intersection (r,c) and (r,c+1).
                // Gokigen doesn't use it. We can leave empty div or use it for spacing.
                // The grid-template handles size.
                if (c < currentCols) {
                   let spacer = document.createElement('div');
                   spacer.style.gridRow = `${2*r + 1}`;
                   spacer.style.gridColumn = `${2*c + 2}`;
                   puzzleGrid.appendChild(spacer);
                }
            }
            
            // Cell Row (if not last row)
            if (r < currentRows) {
                for(let c=0; c <= currentCols; c++) {
                    // Vertical spacer at (2r+2, 2c+1)
                    let spacer = document.createElement('div');
                    spacer.style.gridRow = `${2*r + 2}`;
                    spacer.style.gridColumn = `${2*c + 1}`;
                    puzzleGrid.appendChild(spacer);
                    
                    // Cell at (2r+2, 2c+2)
                    if (c < currentCols) {
                        createCell(r, c);
                    }
                }
            }
        }
    }
    
    function createIntersection(r, c) {
        const div = document.createElement('div');
        div.className = 'gokigen-node';
        div.style.gridRow = `${2*r + 1}`;
        div.style.gridColumn = `${2*c + 1}`;
        div.dataset.r = r;
        div.dataset.c = c;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        if (clueState[r][c] !== null) input.value = clueState[r][c];
        
        input.addEventListener('change', (e) => {
            let val = e.target.value.trim();
            if (val !== '' && !isNaN(val)) {
                let num = parseInt(val);
                if (num >= 0 && num <= 4) {
                    clueState[r][c] = num;
                } else {
                    e.target.value = '';
                    clueState[r][c] = null;
                }
            } else {
                clueState[r][c] = null;
                e.target.value = '';
            }
        });
        
        if (isShowingSolution) input.disabled = true;
        div.appendChild(input);
        puzzleGrid.appendChild(div);
    }
    
    function createCell(r, c) {
        const div = document.createElement('div');
        div.className = 'gokigen-cell';
        div.style.gridRow = `${2*r + 2}`;
        div.style.gridColumn = `${2*c + 2}`;
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, gridState[r][c]);
        
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            // Cycle: Empty -> / (1) -> \ (2) -> Empty
            let val = gridState[r][c];
            val = (val + 1) % 3;
            gridState[r][c] = val;
            
            updateCellDisplay(this, val);
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, val) {
        el.innerHTML = '';
        el.className = 'gokigen-cell';
        
        if (val === 1) { // Forward Slash /
            let line = document.createElement('div');
            line.className = 'slash-line slash-forward';
            el.appendChild(line);
        } else if (val === 2) { // Backward Slash \
            let line = document.createElement('div');
            line.className = 'slash-line slash-backward';
            el.appendChild(line);
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
            clues: clueState,
            grid: gridState
        };
        
        setTimeout(() => {
            try {
                solutions = jsGokigenSolver(puzzle);
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
        
        // Update cells
        const cells = puzzleGrid.querySelectorAll('.gokigen-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            const val = sol[r][c];
            
            cell.className = 'gokigen-cell solved'; // Add solved class for styling
            updateCellDisplay(cell, val);
        });
        
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
        
        // Verify clues visually (Optional)
        verifyClues(sol);
    }
    
    function verifyClues(sol) {
        const nodes = puzzleGrid.querySelectorAll('.gokigen-node');
        nodes.forEach(node => {
            const r = parseInt(node.dataset.r);
            const c = parseInt(node.dataset.c);
            const target = clueState[r][c];
            
            if (target !== null) {
                // Count connections
                let count = 0;
                // Top-Left Cell (r-1, c-1): Needs \ (2) to connect to (r,c)
                if (r > 0 && c > 0 && sol[r-1][c-1] === 2) count++;
                
                // Top-Right Cell (r-1, c): Needs / (1) to connect to (r,c)
                if (r > 0 && c < currentCols && sol[r-1][c] === 1) count++;
                
                // Bottom-Left Cell (r, c-1): Needs / (1) to connect to (r,c)
                if (r < currentRows && c > 0 && sol[r][c-1] === 1) count++;
                
                // Bottom-Right Cell (r, c): Needs \ (2) to connect to (r,c)
                if (r < currentRows && c < currentCols && sol[r][c] === 2) count++;
                
                if (count === target) {
                    node.classList.add('satisfied');
                    node.classList.remove('error');
                } else {
                    node.classList.add('error');
                    node.classList.remove('satisfied');
                }
            } else {
                node.classList.remove('satisfied');
                node.classList.remove('error');
            }
        });
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        const cells = puzzleGrid.querySelectorAll('.gokigen-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            cell.className = 'gokigen-cell';
            updateCellDisplay(cell, gridState[r][c]);
        });
        
        const nodes = puzzleGrid.querySelectorAll('.gokigen-node');
        nodes.forEach(n => {
            n.classList.remove('satisfied');
            n.classList.remove('error');
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
    
    // --- Gokigen Solver ---
    function jsGokigenSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const clues = puzzle.clues; // (R+1) x (C+1)
        const maxSolutions = 5;
        
        // Grid: R x C. 0=Unset, 1=/, 2=\
        const grid = Array(R).fill().map(() => Array(C).fill(0));
        // Load initial state
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (puzzle.grid[r][c] !== 0) grid[r][c] = puzzle.grid[r][c];
            }
        }
        
        const solutions = [];
        
        // DSU for Loop Detection
        // Nodes are intersections: (R+1)*(C+1) nodes.
        // Index = r * (C+1) + c
        const numNodes = (R+1)*(C+1);
        const parent = new Int32Array(numNodes).fill(-1);
        
        function find(i) {
            let root = i;
            while(parent[root] >= 0) root = parent[root];
            return root;
        }
        
        function union(i, j) {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                if (parent[rootI] < parent[rootJ]) { // size I > size J (more negative)
                     parent[rootI] += parent[rootJ];
                     parent[rootJ] = rootI;
                     return [rootJ, rootI]; // child, p
                } else {
                     parent[rootJ] += parent[rootI];
                     parent[rootI] = rootJ;
                     return [rootI, rootJ];
                }
            }
            return null; // Cycle detected
        }
        
        // We need to track Clue Counts incrementally
        const currentCounts = Array(R+1).fill().map(() => Array(C+1).fill(0));
        
        // Initialize DSU and Counts based on pre-filled grid
        // This might be complex for rollback if we allow pre-filled.
        // Let's just re-build DSU in solve loop? No, too slow.
        // We handle pre-filled by processing them first in the recursion or just initialize state?
        // Better: Initialize state before starting recursion.
        // And verify validity of pre-filled.
        
        // Pre-fill state
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if(grid[r][c] !== 0) {
                    const val = grid[r][c];
                    if (val === 1) { // /
                        // Connect (r+1, c) and (r, c+1)
                        const n1 = (r+1)*(C+1) + c;
                        const n2 = r*(C+1) + (c+1);
                        if (!union(n1, n2)) throw new Error("Initial grid has loop");
                        currentCounts[r+1][c]++;
                        currentCounts[r][c+1]++;
                    } else { // \
                        // Connect (r, c) and (r+1, c+1)
                        const n1 = r*(C+1) + c;
                        const n2 = (r+1)*(C+1) + (c+1);
                        if (!union(n1, n2)) throw new Error("Initial grid has loop");
                        currentCounts[r][c]++;
                        currentCounts[r+1][c+1]++;
                    }
                }
            }
        }
        
        // Check initial clue violations
        for(let r=0; r<=R; r++) {
            for(let c=0; c<=C; c++) {
                if (clues[r][c] !== null && currentCounts[r][c] > clues[r][c]) {
                    throw new Error("Initial grid violates clues");
                }
            }
        }
        
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === R * C) {
                // Final check: Clues must be EXACTLY satisfied
                for(let r=0; r<=R; r++) {
                    for(let c=0; c<=C; c++) {
                        if (clues[r][c] !== null && currentCounts[r][c] !== clues[r][c]) return;
                    }
                }
                solutions.push(grid.map(row => [...row]));
                return;
            }
            
            const r = Math.floor(idx / C);
            const c = idx % C;
            
            if (grid[r][c] !== 0) {
                // Already filled, move on
                // Need to check if this cell "completes" any clues?
                // Clues at (r,c), (r,c+1), (r+1,c), (r+1,c+1) might be affected.
                // (r,c) is Top-Left of current cell. It is fully surrounded by cells (r-1, c-1), (r-1, c), (r, c-1), (r, c).
                // If we are at (r, c), then intersection (r, c) has all its 4 neighbors decided?
                // Neighbors of intersection (r,c) are cells: (r-1, c-1), (r-1, c), (r, c-1), (r, c).
                // Yes, after deciding cell (r, c), intersection (r, c) is fully determined.
                // So we can check clue at (r,c).
                if (r > 0 && c > 0) {
                    if (clues[r][c] !== null && currentCounts[r][c] !== clues[r][c]) return;
                }
                // Intersection (r, c+1) is determined? No, depends on (r, c+1).
                
                solve(idx + 1);
                return;
            }
            
            // Try 1 (/) connecting (r+1, c) - (r, c+1)
            // Try 2 (\) connecting (r, c) - (r+1, c+1)
            
            // Heuristic? No specific order.
            
            const moves = [1, 2];
            
            for(const m of moves) {
                let n1, n2; // Nodes to connect
                let inc1_r, inc1_c, inc2_r, inc2_c; // Intersections to increment
                
                if (m === 1) { // /
                    n1 = (r+1)*(C+1) + c;      // Bottom-Left
                    n2 = r*(C+1) + (c+1);      // Top-Right
                    inc1_r = r+1; inc1_c = c;
                    inc2_r = r;   inc2_c = c+1;
                } else { // \
                    n1 = r*(C+1) + c;          // Top-Left
                    n2 = (r+1)*(C+1) + (c+1);  // Bottom-Right
                    inc1_r = r;   inc1_c = c;
                    inc2_r = r+1; inc2_c = c+1;
                }
                
                // Check Clue Capacity
                let valid = true;
                if (clues[inc1_r][inc1_c] !== null && currentCounts[inc1_r][inc1_c] + 1 > clues[inc1_r][inc1_c]) valid = false;
                if (valid && clues[inc2_r][inc2_c] !== null && currentCounts[inc2_r][inc2_c] + 1 > clues[inc2_r][inc2_c]) valid = false;
                
                // Check Loop
                let dsuRes = null;
                if (valid) {
                    dsuRes = union(n1, n2);
                    if (!dsuRes) valid = false; // Loop detected
                }
                
                if (valid) {
                    // Apply
                    grid[r][c] = m;
                    currentCounts[inc1_r][inc1_c]++;
                    currentCounts[inc2_r][inc2_c]++;
                    
                    // Pruning: Check fully determined intersection (r, c)
                    // Intersection (r, c) depends on cells: (r-1, c-1), (r-1, c), (r, c-1), (r, c).
                    // We just filled (r, c).
                    // If r>0, c>0, then (r,c) intersection is done.
                    let clueOk = true;
                    if (r > 0 && c > 0 && clues[r][c] !== null) {
                        if (currentCounts[r][c] !== clues[r][c]) clueOk = false;
                    }
                    
                    if (clueOk) {
                        solve(idx + 1);
                    }
                    
                    // Backtrack
                    currentCounts[inc1_r][inc1_c]--;
                    currentCounts[inc2_r][inc2_c]--;
                    // DSU Undo
                    // dsuRes = [child, parent]
                    // parent[p] -= parent[child]; parent[child] = -1;
                    // Wait, we need to restore exact parent value.
                    // parent[p] stores negative size.
                    // We need to know old size of child.
                    // Actually, size of child is just `parent[p_new] - parent[p_old]`.
                    // But we don't have `p_old`.
                    // DSU in array logic:
                    // parent[rootJ] += parent[rootI]; parent[rootI] = rootJ;
                    // To undo: parent[rootJ] -= parent[rootI] (Wait, rootI is now index rootJ).
                    // No, parent[rootI] holds `rootJ`.
                    // We need to know what `parent[rootI]` was.
                    // Since we are in recursion, we can't easily store this without passing it or using a stack object.
                    // But we have `dsuRes` which is a local variable!
                    // But `dsuRes` only stores indices.
                    // We need to modify `union` to return old value?
                    // Or just re-implement union inline.
                    // Let's check `union` function above.
                    // It returns [child, parent].
                    // It assumes we can't undo without extra info?
                    // Yes.
                }
                
                // Correction: DSU Undo
                // Since we cannot easily modify `union` in recursion context without changing signature,
                // let's just re-implement logic here or fix `union` to return old value.
                // But wait, `dsuRes` was returned.
                // If valid, we proceeded.
                // If we proceeded, we modified global state.
                // We MUST undo.
                // The `union` implementation above is destructive.
                // We need to fix it.
            }
            
            grid[r][c] = 0;
        }
        
        // Improved Union with Undo capability
        function union(i, j) {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                if (parent[rootI] < parent[rootJ]) { // size I > size J
                     const oldValI = parent[rootI]; // Save size
                     parent[rootI] += parent[rootJ];
                     parent[rootJ] = rootI;
                     return { child: rootJ, p: rootI, oldChildVal: parent[rootJ] }; // Wait, we overwrote parent[rootJ] with rootI
                } else {
                     const oldValJ = parent[rootJ];
                     parent[rootJ] += parent[rootI];
                     parent[rootI] = rootJ;
                     return { child: rootI, p: rootJ, oldChildVal: parent[rootI] }; // overwrote parent[rootI] with rootJ
                }
            }
            return null;
        }
        
        // Re-implement loop with fixed logic
        function solve2(idx) {
            if (solutions.length >= maxSolutions) return;
            if (idx === R * C) {
                for(let r=0; r<=R; r++) for(let c=0; c<=C; c++) 
                    if (clues[r][c] !== null && currentCounts[r][c] !== clues[r][c]) return;
                solutions.push(grid.map(row => [...row]));
                return;
            }
            const r = Math.floor(idx / C);
            const c = idx % C;
            
            if (grid[r][c] !== 0) {
                if (r > 0 && c > 0 && clues[r][c] !== null && currentCounts[r][c] !== clues[r][c]) return;
                solve2(idx + 1);
                return;
            }
            
            const moves = [1, 2];
            for(const m of moves) {
                let n1, n2, ir1, ic1, ir2, ic2;
                if (m === 1) { // / (BL-TR)
                    n1 = (r+1)*(C+1) + c; n2 = r*(C+1) + (c+1);
                    ir1 = r+1; ic1 = c; ir2 = r; ic2 = c+1;
                } else { // \ (TL-BR)
                    n1 = r*(C+1) + c; n2 = (r+1)*(C+1) + (c+1);
                    ir1 = r; ic1 = c; ir2 = r+1; ic2 = c+1;
                }
                
                let valid = true;
                if (clues[ir1][ic1] !== null && currentCounts[ir1][ic1] + 1 > clues[ir1][ic1]) valid = false;
                if (valid && clues[ir2][ic2] !== null && currentCounts[ir2][ic2] + 1 > clues[ir2][ic2]) valid = false;
                
                let dsuLog = null;
                if (valid) {
                    // Manual Union with logging
                    const root1 = find(n1);
                    const root2 = find(n2);
                    if (root1 !== root2) {
                        if (parent[root1] < parent[root2]) { // 1 is larger
                            dsuLog = { child: root2, p: root1, oldChildVal: parent[root2] };
                            parent[root1] += parent[root2];
                            parent[root2] = root1;
                        } else {
                            dsuLog = { child: root1, p: root2, oldChildVal: parent[root1] };
                            parent[root2] += parent[root1];
                            parent[root1] = root2;
                        }
                    } else {
                        valid = false; // Loop
                    }
                }
                
                if (valid) {
                    grid[r][c] = m;
                    currentCounts[ir1][ic1]++;
                    currentCounts[ir2][ic2]++;
                    
                    let clueOk = true;
                    if (r > 0 && c > 0 && clues[r][c] !== null) {
                        if (currentCounts[r][c] !== clues[r][c]) clueOk = false;
                    }
                    
                    if (clueOk) solve2(idx + 1);
                    
                    currentCounts[ir1][ic1]--;
                    currentCounts[ir2][ic2]--;
                    
                    // DSU Undo
                    const { child, p, oldChildVal } = dsuLog;
                    parent[p] -= oldChildVal; // Restore size
                    parent[child] = oldChildVal; // Restore child (was root)
                }
            }
            grid[r][c] = 0;
        }
        
        try {
            solve2(0);
        } catch(e) { console.error(e); }
        return solutions;
    }
    
    createEmptyGrid();
});
























