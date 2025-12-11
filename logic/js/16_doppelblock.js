document.addEventListener('DOMContentLoaded', function() {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const sizeInput = document.getElementById('size');
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
    
    let currentSize = 5;
    let gridState = []; // Inner grid state
    let clues = { top: [], bottom: [], left: [], right: [] }; // External clues
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    
    createGridBtn.addEventListener('click', function() {
        currentSize = parseInt(sizeInput.value);
        if (currentSize < 3) currentSize = 3;
        if (currentSize > 9) currentSize = 9; // Limit size for performance
        sizeInput.value = currentSize;
        createEmptyGrid();
    });
    
    function createEmptyGrid() {
        solutions = [];
        currentSolutionIndex = 0;
        solutionNav.style.display = 'none';
        result.innerHTML = '';
        
        // Initialize inner grid
        gridState = Array(currentSize).fill().map(() => 
            Array(currentSize).fill().map(() => ({ type: 'empty', value: null })));
        
        // Initialize clues
        clues = {
            top: Array(currentSize).fill(null),
            bottom: Array(currentSize).fill(null),
            left: Array(currentSize).fill(null),
            right: Array(currentSize).fill(null)
        };
        
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        // Layout: (Size + 2) x (Size + 2) grid
        // Top/Bottom/Left/Right for clues, Center for puzzle
        puzzleGrid.style.gridTemplateColumns = `40px repeat(${currentSize}, 40px) 40px`;
        puzzleGrid.style.gridTemplateRows = `40px repeat(${currentSize}, 40px) 40px`;
        
        // Top Row (Corner, Top Clues, Corner)
        createCorner();
        for(let c=0; c<currentSize; c++) createClueCell('top', c);
        createCorner();
        
        // Middle Rows (Left Clue, Grid Cells..., Right Clue)
        for(let r=0; r<currentSize; r++) {
            createClueCell('left', r);
            for(let c=0; c<currentSize; c++) {
                createGridCell(r, c);
            }
            createClueCell('right', r);
        }
        
        // Bottom Row
        createCorner();
        for(let c=0; c<currentSize; c++) createClueCell('bottom', c);
        createCorner();
    }
    
    function createCorner() {
        const div = document.createElement('div');
        div.className = 'cell corner-cell';
        puzzleGrid.appendChild(div);
    }
    
    function createClueCell(pos, idx) {
        const div = document.createElement('div');
        div.className = 'cell clue-cell';
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 2;
        
        // Load value
        if (clues[pos][idx] !== null) input.value = clues[pos][idx];
        
        input.addEventListener('change', (e) => {
            const val = e.target.value.trim();
            if (val && !isNaN(val)) {
                clues[pos][idx] = parseInt(val);
            } else {
                clues[pos][idx] = null;
                e.target.value = '';
            }
        });
        
        if (isShowingSolution) input.disabled = true;
        
        div.appendChild(input);
        puzzleGrid.appendChild(div);
    }
    
    function createGridCell(r, c) {
        const div = document.createElement('div');
        div.className = 'cell grid-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, gridState[r][c]);
        
        // Left click: Number input
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            this.contentEditable = true;
            this.classList.add('editing');
            this.textContent = '';
            this.focus();
            
            const saveNumber = (e) => {
                let value = e.target.textContent.trim();
                const maxNum = currentSize - 2;
                if (value !== '' && !isNaN(value)) {
                    const num = parseInt(value);
                    if (num >= 1 && num <= maxNum) {
                        gridState[r][c] = { type: 'number', value: num };
                    } else {
                         // Invalid number for this size
                         gridState[r][c] = { type: 'empty', value: null };
                    }
                } else {
                    gridState[r][c] = { type: 'empty', value: null };
                }
                this.contentEditable = false;
                this.classList.remove('editing');
                updateCellDisplay(this, gridState[r][c]);
            };
            
            this.addEventListener('blur', saveNumber, { once: true });
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
            
            if (gridState[r][c].type === 'black') {
                gridState[r][c] = { type: 'empty', value: null };
            } else {
                gridState[r][c] = { type: 'black', value: null };
            }
            updateCellDisplay(this, gridState[r][c]);
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, state) {
        el.className = 'cell grid-cell';
        el.textContent = '';
        
        if (state.type === 'black') {
            el.classList.add('black');
        } else if (state.type === 'number') {
            el.textContent = state.value;
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
        
        const puzzle = preparePuzzleData();
        
        setTimeout(() => {
            try {
                solutions = jsDoppelblockSolver(puzzle);
                if (!solutions || solutions.length === 0) {
                    result.innerHTML = `<div class="error-msg">未找到解决方案</div>`;
                } else {
                    currentSolutionIndex = 0;
                    isShowingSolution = true;
                    displaySolution(currentSolutionIndex);
                    solutionNav.style.display = 'flex';
                    solutionCount.textContent = `${currentSolutionIndex + 1}/${solutions.length}`;
                    result.innerHTML = `<div class="success-msg">找到 ${solutions.length} 个解决方案</div>`;
                    // Lock inputs
                    renderPuzzleGrid(); 
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
    
    function preparePuzzleData() {
        return {
            size: currentSize,
            grid: gridState,
            clues: clues
        };
    }
    
    function displaySolution(index) {
        if (!solutions || !solutions.length) return;
        const sol = solutions[index];
        // Update gridState for display
        // We don't overwrite 'gridState' logic completely if we want to "Back to Edit"
        // But renderPuzzleGrid uses gridState. 
        // We will update the DOM directly or create a temporary view.
        // Let's update the DOM directly.
        
        const cells = puzzleGrid.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            const val = sol[r][c];
            
            cell.className = 'cell grid-cell';
            cell.textContent = '';
            if (val === 0) { // Black
                cell.classList.add('black');
            } else {
                cell.textContent = val;
            }
        });
        
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        renderPuzzleGrid(); // Re-render original user input state
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

    // --- Doppelblock Solver Logic ---
    function jsDoppelblockSolver(puzzle) {
        const N = puzzle.size;
        const userGrid = puzzle.grid;
        const clues = puzzle.clues;
        const maxSolutions = 10;
        
        // Grid Values: 0 = Black, 1..(N-2) = Numbers
        const grid = Array(N).fill().map(() => Array(N).fill(null));
        
        // Initialize with user input
        for(let r=0; r<N; r++) {
            for(let c=0; c<N; c++) {
                if (userGrid[r][c].type === 'black') grid[r][c] = 0;
                else if (userGrid[r][c].type === 'number') grid[r][c] = userGrid[r][c].value;
            }
        }
        
        const solutions = [];
        
        // Tracking state
        const rowBlacks = Array(N).fill(0);
        const colBlacks = Array(N).fill(0);
        const rowNums = Array(N).fill().map(() => new Set()); // Numbers used in row
        const colNums = Array(N).fill().map(() => new Set()); // Numbers used in col
        
        // Populate tracking from initial grid
        // And validate initial state
        for(let r=0; r<N; r++) {
            for(let c=0; c<N; c++) {
                const val = grid[r][c];
                if (val !== null) {
                    if (val === 0) {
                        rowBlacks[r]++;
                        colBlacks[c]++;
                    } else {
                        if (rowNums[r].has(val)) throw new Error(`Row ${r+1} has duplicate number ${val}`);
                        if (colNums[c].has(val)) throw new Error(`Col ${c+1} has duplicate number ${val}`);
                        rowNums[r].add(val);
                        colNums[c].add(val);
                    }
                }
            }
        }
        
        // Pre-check counts
        for(let i=0; i<N; i++) {
            if(rowBlacks[i] > 2) throw new Error(`Row ${i+1} has too many black cells`);
            if(colBlacks[i] > 2) throw new Error(`Col ${i+1} has too many black cells`);
        }

        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === N * N) {
                // Check if all rows/cols have exactly 2 blacks
                // And all numbers 1..N-2 present? 
                // If we filled all cells, and rules were followed locally, 
                // we just need to ensure count(blacks) == 2 implies count(nums) == N-2.
                for(let i=0; i<N; i++) {
                    if(rowBlacks[i] !== 2) return;
                    if(colBlacks[i] !== 2) return;
                }
                
                // Verify Sum Clues (Double check)
                // Top
                for(let c=0; c<N; c++) {
                    if (clues.top[c] !== null && getColSum(c) !== clues.top[c]) return;
                    if (clues.bottom[c] !== null && getColSum(c) !== clues.bottom[c]) return;
                }
                // Left
                for(let r=0; r<N; r++) {
                    if (clues.left[r] !== null && getRowSum(r) !== clues.left[r]) return;
                    if (clues.right[r] !== null && getRowSum(r) !== clues.right[r]) return;
                }
                
                solutions.push(grid.map(row => [...row]));
                return;
            }
            
            const r = Math.floor(idx / N);
            const c = idx % N;
            
            // Pruning: If end of row/col and not enough blacks?
            // If N - c < (2 - rowBlacks[r]) -> Impossible
            if (N - c < 2 - rowBlacks[r]) return;
            // If N - r < 2 - colBlacks[c] -> Impossible
            if (N - r < 2 - colBlacks[c]) return;

            if (grid[r][c] !== null) {
                solve(idx + 1);
                return;
            }
            
            // Try Black (0)
            if (rowBlacks[r] < 2 && colBlacks[c] < 2) {
                grid[r][c] = 0;
                rowBlacks[r]++;
                colBlacks[c]++;
                
                // Pruning: Check Left Clue if this is the 2nd black cell in Row
                let valid = true;
                if (rowBlacks[r] === 2) {
                    const sum = getRowSum(r); // Partial sum up to here is actually full sum for left clue
                    if (clues.left[r] !== null && sum !== clues.left[r]) valid = false;
                    if (clues.right[r] !== null && sum !== clues.right[r]) valid = false;
                }
                // Check Top Clue if this is the 2nd black cell in Col
                if (valid && colBlacks[c] === 2) {
                    const sum = getColSum(c);
                    if (clues.top[c] !== null && sum !== clues.top[c]) valid = false;
                    if (clues.bottom[c] !== null && sum !== clues.bottom[c]) valid = false;
                }
                
                if (valid) solve(idx + 1);
                
                rowBlacks[r]--;
                colBlacks[c]--;
                grid[r][c] = null;
            }
            
            if (solutions.length >= maxSolutions) return;
            
            // Try Numbers (1 .. N-2)
            for(let n=1; n <= N-2; n++) {
                if (!rowNums[r].has(n) && !colNums[c].has(n)) {
                    grid[r][c] = n;
                    rowNums[r].add(n);
                    colNums[c].add(n);
                    
                    // Pruning: Check Sum if between two blacks (row)
                    let valid = true;
                    if (rowBlacks[r] === 1) {
                         // We are between blacks (or after first, before second)
                         // Current sum + potential min sum of remaining?
                         // Or just check if current sum > clue (if we have seen 1st black)
                         // Wait, getRowSum calculates sum BETWEEN blacks.
                         // If we have only seen 1 black, we are accumulating sum.
                         // If sum > clue, pruning!
                         if (clues.left[r] !== null || clues.right[r] !== null) {
                             // Calculate current running sum
                             let s = 0;
                             let passedFirst = false;
                             for(let k=0; k<=c; k++) {
                                 if (grid[r][k] === 0) passedFirst = true;
                                 else if (passedFirst) s += grid[r][k];
                             }
                             // Note: if we haven't seen 2nd black, 's' is partial sum.
                             const limit = clues.left[r] !== null ? clues.left[r] : clues.right[r];
                             if (limit !== null && s > limit) valid = false;
                         }
                    }
                    // Same for Col
                    if (valid && colBlacks[c] === 1) {
                         if (clues.top[c] !== null || clues.bottom[c] !== null) {
                             let s = 0;
                             let passedFirst = false;
                             for(let k=0; k<=r; k++) {
                                 if (grid[k][c] === 0) passedFirst = true;
                                 else if (passedFirst) s += grid[k][c];
                             }
                             const limit = clues.top[c] !== null ? clues.top[c] : clues.bottom[c];
                             if (limit !== null && s > limit) valid = false;
                         }
                    }

                    if (valid) solve(idx + 1);
                    
                    rowNums[r].delete(n);
                    colNums[c].delete(n);
                    grid[r][c] = null;
                }
            }
        }
        
        function getRowSum(r) {
            let sum = 0;
            let foundFirst = false;
            for(let c=0; c<N; c++) {
                if (grid[r][c] === 0) {
                    if (foundFirst) return sum; // Found second black
                    foundFirst = true;
                } else if (foundFirst && grid[r][c] !== null) {
                    sum += grid[r][c];
                }
            }
            return foundFirst ? sum : 0; // If only 1 black found, technically undefined/invalid for full check
        }
        
        function getColSum(c) {
            let sum = 0;
            let foundFirst = false;
            for(let r=0; r<N; r++) {
                if (grid[r][c] === 0) {
                    if (foundFirst) return sum;
                    foundFirst = true;
                } else if (foundFirst && grid[r][c] !== null) {
                    sum += grid[r][c];
                }
            }
            return foundFirst ? sum : 0;
        }
        
        solve(0);
        return solutions;
    }
    
    createEmptyGrid();
});
























