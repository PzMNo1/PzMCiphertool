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
    
    // gridState[r][c] can be:
    // { type: 'white', val: number|null }
    // { type: 'black', down: number|null, across: number|null }
    // By default, all are white? No, usually kakuro starts with a pattern.
    // Let's default to white. User can right-click to toggle.
    let gridState = []; 
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    
    createGridBtn.addEventListener('click', function() {
        currentRows = parseInt(rowsInput.value);
        currentCols = parseInt(colsInput.value);
        if (currentRows < 3) currentRows = 3;
        if (currentCols < 3) currentCols = 3;
        if (currentRows > 20) currentRows = 20;
        if (currentCols > 20) currentCols = 20;
        
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
            Array(currentCols).fill().map(() => ({ type: 'white', val: null }))
        );
        
        // Default border to black? Usually top row and left col are black in Kakuro.
        // Let's initialize top row and left column as black.
        for(let c=0; c<currentCols; c++) gridState[0][c] = { type: 'black', down: null, across: null };
        for(let r=0; r<currentRows; r++) gridState[r][0] = { type: 'black', down: null, across: null };
            
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        puzzleGrid.style.gridTemplateColumns = `repeat(${currentCols}, 45px)`;
        puzzleGrid.style.gridTemplateRows = `repeat(${currentRows}, 45px)`;
        
        for(let r=0; r<currentRows; r++) {
            for(let c=0; c<currentCols; c++) {
                createGridCell(r, c);
            }
        }
    }
    
    function createGridCell(r, c) {
        const div = document.createElement('div');
        div.className = 'kakuro-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, r, c);
        
        // Left Click
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            const cellData = gridState[r][c];
            
            if (cellData.type === 'white') {
                // Edit number
                // e.stopPropagation();
                this.contentEditable = true;
                this.classList.add('editing');
                this.textContent = '';
                this.focus();
                
                const saveVal = (e) => {
                    let val = e.target.textContent.trim();
                    if (val && !isNaN(val) && parseInt(val) >= 1 && parseInt(val) <= 9) {
                        gridState[r][c].val = parseInt(val);
                    } else {
                        gridState[r][c].val = null;
                    }
                    this.contentEditable = false;
                    this.classList.remove('editing');
                    updateCellDisplay(this, r, c);
                };
                
                this.addEventListener('blur', saveVal, { once: true });
                this.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.blur();
                    }
                });
            } else {
                // Black cell: Edit clues
                // We need a custom prompt or UI.
                // Prompt for "Down" and "Across"
                const currentDown = cellData.down !== null ? cellData.down : '';
                const currentAcross = cellData.across !== null ? cellData.across : '';
                
                // Simple sequence of prompts
                // Or a custom modal? Let's use prompt for simplicity.
                
                // Ask for Down (Vertical)
                let newDown = prompt("输入竖向线索 (Bottom-Left, 留空则无):", currentDown);
                if (newDown === null) return; // Cancelled
                
                // Ask for Across (Horizontal)
                let newAcross = prompt("输入横向线索 (Top-Right, 留空则无):", currentAcross);
                if (newAcross === null) return; // Cancelled
                
                // Update state
                gridState[r][c].down = (newDown.trim() !== '' && !isNaN(newDown)) ? parseInt(newDown) : null;
                gridState[r][c].across = (newAcross.trim() !== '' && !isNaN(newAcross)) ? parseInt(newAcross) : null;
                
                updateCellDisplay(this, r, c);
            }
        });
        
        // Right Click: Toggle Type
        div.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (isShowingSolution) return;
            
            if (gridState[r][c].type === 'white') {
                gridState[r][c] = { type: 'black', down: null, across: null };
            } else {
                gridState[r][c] = { type: 'white', val: null };
            }
            updateCellDisplay(div, r, c);
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, r, c) {
        el.className = 'kakuro-cell';
        el.innerHTML = '';
        
        const data = gridState[r][c];
        
        if (data.type === 'black') {
            el.classList.add('black');
            
            if (data.down !== null) {
                const s = document.createElement('span');
                s.className = 'clue-val clue-down';
                s.textContent = data.down;
                el.appendChild(s);
            }
            if (data.across !== null) {
                const s = document.createElement('span');
                s.className = 'clue-val clue-across';
                s.textContent = data.across;
                el.appendChild(s);
            }
        } else {
            el.classList.add('white');
            if (isShowingSolution) {
                // Show solution value
                const sol = solutions[currentSolutionIndex];
                if (sol && sol[r][c]) {
                    el.textContent = sol[r][c];
                    el.style.color = '#72f1b8'; // Solution color
                }
            } else {
                // Show user input
                if (data.val !== null) {
                    el.textContent = data.val;
                    el.style.color = 'var(--neon-cyan)';
                }
            }
        }
    }
    
    solveBtn.addEventListener('click', function() {
        result.innerHTML = '';
        loading.style.display = 'flex';
        
        const puzzle = {
            R: currentRows,
            C: currentCols,
            grid: gridState
        };
        
        setTimeout(() => {
            try {
                solutions = jsKakuroSolver(puzzle);
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
        const cells = puzzleGrid.querySelectorAll('.kakuro-cell');
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
        const cells = puzzleGrid.querySelectorAll('.kakuro-cell');
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
    
    // --- Kakuro Solver ---
    function jsKakuroSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const grid = puzzle.grid;
        const maxSolutions = 1;
        
        // 1. Identify Runs (Sequences of white cells)
        // And associate them with clues.
        // Clue for horizontal run at (r, c..c+k) is at (r, c-1).across
        // Clue for vertical run at (r..r+k, c) is at (r-1, c).down
        
        const runs = []; // { type: 'h'/'v', clueVal: number, cells: [{r,c}] }
        
        // Horizontal Runs
        for(let r=0; r<R; r++) {
            let currentRun = [];
            let currentClue = null;
            
            for(let c=0; c<C; c++) {
                if (grid[r][c].type === 'white') {
                    currentRun.push({r, c});
                } else {
                    // Black cell
                    // Close previous run
                    if (currentRun.length > 0 && currentClue !== null) {
                        runs.push({ type: 'h', clueVal: currentClue, cells: currentRun });
                    }
                    // Start new potential run
                    currentRun = [];
                    currentClue = grid[r][c].across;
                }
            }
            // End of row
            if (currentRun.length > 0 && currentClue !== null) {
                runs.push({ type: 'h', clueVal: currentClue, cells: currentRun });
            }
        }
        
        // Vertical Runs
        for(let c=0; c<C; c++) {
            let currentRun = [];
            let currentClue = null;
            
            for(let r=0; r<R; r++) {
                if (grid[r][c].type === 'white') {
                    currentRun.push({r, c});
                } else {
                    // Black cell
                    if (currentRun.length > 0 && currentClue !== null) {
                        runs.push({ type: 'v', clueVal: currentClue, cells: currentRun });
                    }
                    currentRun = [];
                    currentClue = grid[r][c].down;
                }
            }
            // End of col
            if (currentRun.length > 0 && currentClue !== null) {
                runs.push({ type: 'v', clueVal: currentClue, cells: currentRun });
            }
        }
        
        // Variables: White cells.
        // Collect all white cells and map them to an index 0..N-1
        const whiteCells = [];
        const whiteMap = Array(R).fill().map(() => Array(C).fill(-1));
        
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (grid[r][c].type === 'white') {
                    whiteMap[r][c] = whiteCells.length;
                    whiteCells.push({r, c, val: grid[r][c].val}); // Keep pre-filled value if any
                }
            }
        }
        
        const N = whiteCells.length;
        const assignments = new Int8Array(N).fill(0);
        
        // Pre-fill user values
        for(let i=0; i<N; i++) {
            if (whiteCells[i].val !== null) {
                assignments[i] = whiteCells[i].val;
            }
        }
        
        // Convert runs to constraints on indices
        const constraints = runs.map(run => {
            return {
                target: run.clueVal,
                indices: run.cells.map(cell => whiteMap[cell.r][cell.c])
            };
        });
        
        // Optimize: Sort runs by length? Or by constraint tightness?
        // Or map constraints to variables for faster checking.
        // For each variable, know which constraints it participates in.
        
        const varConstraints = Array(N).fill().map(() => []);
        for(let i=0; i<constraints.length; i++) {
            const cons = constraints[i];
            for(const idx of cons.indices) {
                varConstraints[idx].push(i);
            }
        }
        
        // Constraint Checking Helper
        // Check if constraint `cIdx` is violated or satisfied
        function checkConstraint(cIdx) {
            const cons = constraints[cIdx];
            let sum = 0;
            let filledCount = 0;
            const used = 0; // Bitmask for uniqueness
            
            for(const idx of cons.indices) {
                const val = assignments[idx];
                if (val !== 0) {
                    sum += val;
                    filledCount++;
                    // Uniqueness check
                    if ((used & (1 << val))) return false; // Duplicate
                    // used |= (1 << val); // JS bitwise safe up to 32 bits, 1<<9 is fine.
                }
            }
            
            // Intermediate check
            if (sum > cons.target) return false;
            
            // Uniqueness check (separate loop or combined)
            // Re-loop for uniqueness because we need 'used' mask.
            let usedMask = 0;
            for(const idx of cons.indices) {
                const val = assignments[idx];
                if (val !== 0) {
                    if ((usedMask & (1 << val)) !== 0) return false;
                    usedMask |= (1 << val);
                }
            }
            
            if (filledCount === cons.indices.length) {
                // Fully filled, sum must match
                return sum === cons.target;
            } else {
                // Partially filled
                // Min possible sum for remaining? 
                // Max possible sum?
                // Simple pruning: sum < target is fine (already checked > target)
                
                // Advanced pruning: Can we reach target with remaining cells?
                // Assume remaining cells pick smallest available distinct numbers?
                // This is expensive to calculate every step.
                // Minimal check:
                const remaining = cons.indices.length - filledCount;
                // Min sum of `remaining` distinct positive integers is roughly sum(1..remaining) 
                // but we must exclude already used numbers.
                // Let's skip advanced pruning for now.
                
                // Another Check: If remaining * 9 + sum < target, impossible.
                if (sum + remaining * 9 < cons.target) return false;
                
                // If sum + sum(smallest available) > target, impossible.
            }
            
            return true;
        }
        
        const solutionsResult = [];
        
        function solve(idx) {
            if (solutionsResult.length >= maxSolutions) return;
            
            if (idx === N) {
                // Found solution
                // Construct grid
                const solGrid = Array(R).fill().map(() => Array(C).fill(null));
                for(let i=0; i<N; i++) {
                    const cell = whiteCells[i];
                    solGrid[cell.r][cell.c] = assignments[i];
                }
                solutionsResult.push(solGrid);
                return;
            }
            
            // If pre-filled
            if (whiteCells[idx].val !== null) {
                // Check constraints
                let ok = true;
                for(const cIdx of varConstraints[idx]) {
                    if (!checkConstraint(cIdx)) { ok = false; break; }
                }
                if (ok) solve(idx + 1);
                return;
            }
            
            // Try values 1-9
            for(let val=1; val<=9; val++) {
                assignments[idx] = val;
                
                // Check validity
                let ok = true;
                for(const cIdx of varConstraints[idx]) {
                    if (!checkConstraint(cIdx)) { ok = false; break; }
                }
                
                if (ok) {
                    solve(idx + 1);
                }
                
                assignments[idx] = 0;
            }
        }
        
        solve(0);
        return solutionsResult;
    }
    
    createEmptyGrid();
});
























