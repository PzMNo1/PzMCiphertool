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
    let gridState = []; // Stores numbers.
    let previewState = []; // 0=white, 1=black (for manual solving)
    let solutions = []; // Stores solution grids (0=white, 1=black)
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
        div.className = 'hitori-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, r, c);
        
        // Left click: Input number
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
        
        // Right click: Toggle Black
        div.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (isShowingSolution) return;
            
            if (previewState[r][c] === null) previewState[r][c] = 1;
            else if (previewState[r][c] === 1) previewState[r][c] = 0; // Circle/White
            else previewState[r][c] = null;
            
            updateCellDisplay(this, r, c);
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, r, c) {
        el.className = 'hitori-cell';
        el.innerHTML = '';
        
        // Show Number
        if (gridState[r][c] !== null) {
            el.textContent = gridState[r][c];
            el.classList.add('clue');
        }
        
        if (isShowingSolution) {
            if (solutions[currentSolutionIndex][r][c] === 1) {
                el.classList.add('black');
            } else {
                // el.classList.add('circle'); // Optional: Mark safe
            }
        } else {
            if (previewState[r][c] === 1) {
                el.classList.add('black');
            } else if (previewState[r][c] === 0) {
                el.classList.add('circle');
            }
        }
    }
    
    solveBtn.addEventListener('click', function() {
        // Validate grid has numbers
        let hasNumbers = false;
        for(let r=0; r<currentRows; r++) for(let c=0; c<currentCols; c++) if(gridState[r][c] !== null) hasNumbers = true;
        
        if (!hasNumbers) {
            result.innerHTML = `<div class="error-msg">请先输入数字</div>`;
            return;
        }

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
                solutions = jsHitoriSolver(puzzle);
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
        const cells = puzzleGrid.querySelectorAll('.hitori-cell');
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
        const cells = puzzleGrid.querySelectorAll('.hitori-cell');
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
    
    // --- Hitori Solver ---
    function jsHitoriSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const nums = puzzle.grid;
        const maxSolutions = 1; // Hitori usually has unique solution, but find 1 is enough for now.
        
        // Pre-process: Identify duplicates
        // We only need to shade cells that cause conflicts.
        // Cells with unique numbers in row AND col MUST be white.
        // This is a constraint satisfaction problem.
        
        const mustBeWhite = Array(R).fill().map(() => Array(C).fill(false));
        
        // Find conflict sets
        // For each row, if X appears multiple times, one or more must be black.
        // If X appears only once, it doesn't force black on itself, but might be forced black by neighbor.
        
        // Solver State: 0=White, 1=Black, null=Unset
        const grid = Array(R).fill().map(() => Array(C).fill(null));
        const solutions = [];
        
        // Track unshaded numbers in rows/cols
        const rowSets = Array(R).fill().map(() => new Map()); // num -> count
        const colSets = Array(C).fill().map(() => new Map());
        
        // Initialize counts (assuming all white initially?)
        // No, we build counts incrementally.
        
        // Backtracking order: Standard raster?
        // Optimization: Process cells involved in conflicts first?
        // Standard raster is fine for reasonable sizes.
        
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === R * C) {
                // Check Connectivity
                let whiteStart = null;
                let whiteCount = 0;
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        if (grid[r][c] === 0) {
                            whiteCount++;
                            if (!whiteStart) whiteStart = {r, c};
                        }
                    }
                }
                
                if (whiteCount === 0) return; // Should not happen
                
                let visitedCount = 0;
                const q = [whiteStart];
                const visited = new Set([`${whiteStart.r},${whiteStart.c}`]);
                visitedCount++;
                
                let head = 0;
                while(head < q.length) {
                    const curr = q[head++];
                    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                    for(const d of dirs) {
                        const nr = curr.r + d[0];
                        const nc = curr.c + d[1];
                        if (nr>=0 && nr<R && nc>=0 && nc<C && grid[nr][nc] === 0) {
                            const k = `${nr},${nc}`;
                            if (!visited.has(k)) {
                                visited.add(k);
                                visitedCount++;
                                q.push({r: nr, c: nc});
                            }
                        }
                    }
                }
                
                if (visitedCount === whiteCount) {
                    solutions.push(grid.map(row => [...row]));
                }
                return;
            }
            
            const r = Math.floor(idx / C);
            const c = idx % C;
            const val = nums[r][c];
            
            if (val === null) {
                // Empty cell input? Treat as White (safe) or skip?
                // Treat as unused. 0.
                grid[r][c] = 0;
                solve(idx + 1);
                return;
            }
            
            // Try White (0)
            // Valid if: Value not already in rowSets[r] or colSets[c]
            let canWhite = true;
            if (rowSets[r].has(val)) canWhite = false;
            if (colSets[c].has(val)) canWhite = false;
            
            if (canWhite) {
                grid[r][c] = 0;
                rowSets[r].set(val, true);
                colSets[c].set(val, true);
                
                solve(idx + 1);
                
                rowSets[r].delete(val);
                colSets[c].delete(val);
                grid[r][c] = null;
            }
            
            if (solutions.length >= maxSolutions) return;
            
            // Try Black (1)
            // Valid if: No adjacent black
            let canBlack = true;
            if (r > 0 && grid[r-1][c] === 1) canBlack = false;
            if (c > 0 && grid[r][c-1] === 1) canBlack = false;
            
            // Pruning: If picking black isolates a white region? Hard to check cheaply.
            // But basic "No adjacent black" handles most.
            
            // Also check if picking black is FORCED?
            // No, we are trying both.
            
            if (canBlack) {
                grid[r][c] = 1;
                solve(idx + 1);
                grid[r][c] = null;
            }
        }
        
        solve(0);
        return solutions;
    }
    
    createEmptyGrid();
});
























