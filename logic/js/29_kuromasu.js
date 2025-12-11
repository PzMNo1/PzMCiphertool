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
    let gridState = []; // numbers or null
    let previewState = []; // 0=white, 1=black (for manual solving)
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
        previewState = Array(currentRows).fill().map(() => 
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
        div.className = 'kuromasu-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, r, c);
        
        // Left Click: Input Number
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            this.contentEditable = true;
            this.classList.add('editing');
            this.textContent = ''; 
            this.focus();
            
            const saveVal = (e) => {
                let val = e.target.textContent.trim();
                if (val && !isNaN(val) && parseInt(val) > 0) {
                    gridState[r][c] = parseInt(val);
                } else {
                    gridState[r][c] = null;
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
        });
        
        // Right Click: Toggle Black
        div.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (isShowingSolution) return;
            
            if (previewState[r][c] === null) previewState[r][c] = 1; // Black
            else if (previewState[r][c] === 1) previewState[r][c] = 0; // White (Mark)
            else previewState[r][c] = null;
            
            updateCellDisplay(div, r, c);
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, r, c) {
        el.className = 'kuromasu-cell';
        el.innerHTML = '';
        
        // Clue
        if (gridState[r][c] !== null) {
            el.classList.add('clue');
            el.textContent = gridState[r][c];
        }
        
        if (isShowingSolution) {
            if (solutions[currentSolutionIndex][r][c] === 1) {
                el.classList.add('black');
            }
        } else {
            if (previewState[r][c] === 1) {
                el.classList.add('black');
            } else if (previewState[r][c] === 0) {
                el.classList.add('white-mark');
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
                solutions = jsKuromasuSolver(puzzle);
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
        const cells = puzzleGrid.querySelectorAll('.kuromasu-cell');
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
        const cells = puzzleGrid.querySelectorAll('.kuromasu-cell');
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
    
    // --- Kuromasu Solver ---
    function jsKuromasuSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const clues = puzzle.grid;
        const maxSolutions = 1;
        
        // Grid: 0=White, 1=Black
        const grid = Array(R).fill().map(() => Array(C).fill(null));
        
        // 1. Fixed Constraints
        // Clue cells are always White
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (clues[r][c] !== null) grid[r][c] = 0;
            }
        }
        
        const solutions = [];
        
        // Helper to check visibility for a clue
        function checkVisibility(r, c, clueVal) {
            let count = 1; // Self
            const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
            
            let possibleCount = 1;
            
            for(const d of dirs) {
                let n = 1;
                let stopped = false;
                while(true) {
                    const nr = r + d[0]*n;
                    const nc = c + d[1]*n;
                    if (nr<0 || nr>=R || nc<0 || nc>=C) break;
                    
                    if (grid[nr][nc] === 1) { // Black
                        stopped = true;
                        break;
                    } else if (grid[nr][nc] === 0) { // White
                        count++;
                        possibleCount++;
                    } else { // Null (Unknown)
                        possibleCount++; // Can potentially be white
                        // Don't increment count yet
                    }
                    n++;
                }
            }
            
            if (count > clueVal) return -1; // Too many visible white cells
            if (possibleCount < clueVal) return -2; // Not enough potential cells
            if (count === clueVal && possibleCount === clueVal) return 1; // Exact match possible/satisfied
            return 0; // Ongoing
        }
        
        // Optimized check: Only check affected clues?
        // For simplicity, check all clues periodically?
        // Or check a clue when we touch its row/col?
        
        // List of clue positions
        const cluePos = [];
        for(let r=0; r<R; r++) for(let c=0; c<C; c++) if(clues[r][c] !== null) cluePos.push({r,c,val:clues[r][c]});
        
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === R*C) {
                // Final check for all clues (should be covered by pruning, but double check)
                for(const cp of cluePos) {
                    const res = checkVisibility(cp.r, cp.c, cp.val);
                    // checkVisibility calculation changes when grid is fully filled.
                    // "possibleCount" equals "count" when grid full.
                    // So checkVisibility returns -1 if > clue, or -2 if < clue.
                    // We need exact match.
                    // Actually checkVisibility logic:
                    // If grid[nr][nc] is 0, count++. If null, possible++.
                    // At end, nulls are gone. count == possible.
                    // If res !== 1 (exact match implied if not -1/-2?), wait.
                    // If count == clue, returns 1 (since possible==count).
                    // If count != clue, returns -1 or -2.
                    // So just check res === 1.
                    
                    // Note: We need to explicitly recalculate strict visibility here to be safe.
                    let v = 1;
                    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                    for(const d of dirs) {
                        let n = 1;
                        while(true) {
                            const nr = cp.r + d[0]*n;
                            const nc = cp.c + d[1]*n;
                            if (nr<0 || nr>=R || nc<0 || nc>=C) break;
                            if (grid[nr][nc] === 1) break;
                            v++;
                            n++;
                        }
                    }
                    if (v !== cp.val) return;
                }
                
                // Connectivity Check
                let whiteStart = null;
                let whiteCount = 0;
                for(let r=0; r<R; r++) for(let c=0; c<C; c++) if(grid[r][c] === 0) { whiteCount++; whiteStart = {r,c}; }
                
                if (whiteCount === 0) return;
                
                let visited = 0;
                const q = [whiteStart];
                const seen = new Set([`${whiteStart.r},${whiteStart.c}`]);
                visited++;
                let head = 0;
                while(head < q.length) {
                    const curr = q[head++];
                    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                    for(const d of dirs) {
                        const nr = curr.r + d[0];
                        const nc = curr.c + d[1];
                        if (nr>=0 && nr<R && nc>=0 && nc<C && grid[nr][nc] === 0) {
                            const k = `${nr},${nc}`;
                            if (!seen.has(k)) {
                                seen.add(k);
                                visited++;
                                q.push({r: nr, c: nc});
                            }
                        }
                    }
                }
                
                if (visited === whiteCount) {
                    solutions.push(grid.map(row => [...row]));
                }
                return;
            }
            
            const r = Math.floor(idx / C);
            const c = idx % C;
            
            // If already set (Clue or previously forced?)
            if (grid[r][c] !== null) {
                solve(idx + 1);
                return;
            }
            
            // Try Black (1)
            // Valid if no adjacent black
            let canBlack = true;
            if (r>0 && grid[r-1][c]===1) canBlack = false;
            if (c>0 && grid[r][c-1]===1) canBlack = false;
            
            if (canBlack) {
                grid[r][c] = 1;
                // Pruning: Check clues affected
                // Only check clues in same row/col?
                let ok = true;
                // We can check ALL clues. For 8x8 it's fast.
                for(const cp of cluePos) {
                    const res = checkVisibility(cp.r, cp.c, cp.val);
                    if (res < 0) { ok = false; break; }
                }
                
                if (ok) solve(idx + 1);
                
                grid[r][c] = null;
            }
            
            if (solutions.length >= maxSolutions) return;
            
            // Try White (0)
            grid[r][c] = 0;
            // Pruning
            let ok = true;
            for(const cp of cluePos) {
                const res = checkVisibility(cp.r, cp.c, cp.val);
                if (res < 0) { ok = false; break; }
            }
            if (ok) solve(idx + 1);
            
            grid[r][c] = null;
        }
        
        solve(0);
        return solutions;
    }
    
    createEmptyGrid();
});
























