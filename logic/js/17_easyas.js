document.addEventListener('DOMContentLoaded', function() {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const sizeInput = document.getElementById('size');
    const rangeInput = document.getElementById('range'); // Number of letters (e.g. 3 for A-C)
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
    let letterCount = 3; // Default A, B, C
    let gridState = []; 
    let clues = { top: [], bottom: [], left: [], right: [] }; 
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    
    // Char helpers
    const numToChar = (n) => String.fromCharCode(64 + n); // 1->A, 2->B
    const charToNum = (c) => c.toUpperCase().charCodeAt(0) - 64; // A->1
    
    createGridBtn.addEventListener('click', function() {
        currentSize = parseInt(sizeInput.value);
        letterCount = parseInt(rangeInput.value);
        
        if (currentSize < 3) currentSize = 3;
        if (currentSize > 9) currentSize = 9;
        if (letterCount >= currentSize) letterCount = currentSize - 1; // Must have at least 1 empty
        if (letterCount < 1) letterCount = 1;
        
        sizeInput.value = currentSize;
        rangeInput.value = letterCount;
        
        createEmptyGrid();
    });
    
    function createEmptyGrid() {
        solutions = [];
        currentSolutionIndex = 0;
        solutionNav.style.display = 'none';
        result.innerHTML = '';
        
        gridState = Array(currentSize).fill().map(() => 
            Array(currentSize).fill().map(() => ({ type: 'empty', value: null })));
            
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
        puzzleGrid.style.gridTemplateColumns = `40px repeat(${currentSize}, 40px) 40px`;
        puzzleGrid.style.gridTemplateRows = `40px repeat(${currentSize}, 40px) 40px`;
        
        createCorner();
        for(let c=0; c<currentSize; c++) createClueCell('top', c);
        createCorner();
        
        for(let r=0; r<currentSize; r++) {
            createClueCell('left', r);
            for(let c=0; c<currentSize; c++) {
                createGridCell(r, c);
            }
            createClueCell('right', r);
        }
        
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
        input.maxLength = 1;
        
        if (clues[pos][idx] !== null) input.value = clues[pos][idx];
        
        input.addEventListener('change', (e) => {
            let val = e.target.value.trim().toUpperCase();
            if (val && val.length === 1 && val >= 'A' && val <= numToChar(letterCount)) {
                clues[pos][idx] = val;
                e.target.value = val;
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
        
        // Left click: Text input
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            this.contentEditable = true;
            this.classList.add('editing');
            this.textContent = '';
            this.focus();
            
            const saveChar = (e) => {
                let val = e.target.textContent.trim().toUpperCase();
                if (val && val.length === 1 && val >= 'A' && val <= numToChar(letterCount)) {
                    gridState[r][c] = { type: 'letter', value: val };
                } else {
                    gridState[r][c] = { type: 'empty', value: null };
                }
                this.contentEditable = false;
                this.classList.remove('editing');
                updateCellDisplay(this, gridState[r][c]);
            };
            
            this.addEventListener('blur', saveChar, { once: true });
            this.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                }
            });
        });
        
        // Right click: Toggle Empty Marker (X)
        div.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (isShowingSolution) return;
            
            if (gridState[r][c].type === 'marker') {
                gridState[r][c] = { type: 'empty', value: null };
            } else if (gridState[r][c].type === 'empty') {
                gridState[r][c] = { type: 'marker', value: null };
            }
            updateCellDisplay(this, gridState[r][c]);
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, state) {
        el.className = 'cell grid-cell';
        el.textContent = '';
        
        if (state.type === 'letter') {
            el.textContent = state.value;
        } else if (state.type === 'marker') {
            el.classList.add('empty-marker');
            el.textContent = '×';
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
            size: currentSize,
            letters: letterCount,
            grid: gridState,
            clues: clues
        };
        
        setTimeout(() => {
            try {
                solutions = jsEasyAsSolver(puzzle);
                if (!solutions || solutions.length === 0) {
                    result.innerHTML = `<div class="error-msg">未找到解决方案</div>`;
                } else {
                    currentSolutionIndex = 0;
                    isShowingSolution = true;
                    displaySolution(currentSolutionIndex);
                    solutionNav.style.display = 'flex';
                    solutionCount.textContent = `${currentSolutionIndex + 1}/${solutions.length}`;
                    result.innerHTML = `<div class="success-msg">找到 ${solutions.length} 个解决方案</div>`;
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
    
    function displaySolution(index) {
        if (!solutions || !solutions.length) return;
        const sol = solutions[index];
        
        const cells = puzzleGrid.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            const val = sol[r][c];
            
            cell.className = 'cell grid-cell';
            cell.textContent = '';
            if (val === 0) {
                cell.classList.add('empty-marker');
                cell.textContent = '×';
            } else {
                cell.textContent = numToChar(val);
            }
        });
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        renderPuzzleGrid();
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
    
    // --- EasyAs Solver ---
    function jsEasyAsSolver(puzzle) {
        const N = puzzle.size;
        const K = puzzle.letters; // Max Letter Index (1=A, 2=B...)
        const maxSolutions = 10;
        
        // Internal Grid: 0=Empty, 1=A, 2=B...
        const grid = Array(N).fill().map(() => Array(N).fill(null));
        
        // Initialize
        for(let r=0; r<N; r++) {
            for(let c=0; c<N; c++) {
                const s = puzzle.grid[r][c];
                if (s.type === 'letter') grid[r][c] = charToNum(s.value);
                else if (s.type === 'marker') grid[r][c] = 0; // Force empty
            }
        }
        
        const clues = {
            top: puzzle.clues.top.map(c => c ? charToNum(c) : null),
            bottom: puzzle.clues.bottom.map(c => c ? charToNum(c) : null),
            left: puzzle.clues.left.map(c => c ? charToNum(c) : null),
            right: puzzle.clues.right.map(c => c ? charToNum(c) : null)
        };
        
        // Track usage
        const rowUsed = Array(N).fill().map(() => new Set());
        const colUsed = Array(N).fill().map(() => new Set());
        const rowEmptyCount = Array(N).fill(0);
        const colEmptyCount = Array(N).fill(0);
        
        // Validate initial state
        for(let r=0; r<N; r++) {
            for(let c=0; c<N; c++) {
                const val = grid[r][c];
                if (val !== null) {
                    if (val > 0) {
                        if (rowUsed[r].has(val)) throw new Error(`Row ${r+1} duplicate ${numToChar(val)}`);
                        if (colUsed[c].has(val)) throw new Error(`Col ${c+1} duplicate ${numToChar(val)}`);
                        rowUsed[r].add(val);
                        colUsed[c].add(val);
                    } else {
                        rowEmptyCount[r]++;
                        colEmptyCount[c]++;
                    }
                }
            }
        }
        
        const maxEmpty = N - K;
        
        const solutions = [];
        
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === N*N) {
                // Final validations
                // Check all rows/cols have exactly K letters (or N-K empty)
                for(let i=0; i<N; i++) {
                    if (rowEmptyCount[i] !== maxEmpty) return;
                    if (colEmptyCount[i] !== maxEmpty) return;
                }
                // Check Right/Bottom clues (if not fully checked during process)
                if (!checkViewpoints()) return;
                
                solutions.push(grid.map(row => [...row]));
                return;
            }
            
            const r = Math.floor(idx / N);
            const c = idx % N;
            
            if (grid[r][c] !== null) {
                solve(idx + 1);
                return;
            }
            
            // Try Empty (0)
            if (rowEmptyCount[r] < maxEmpty && colEmptyCount[c] < maxEmpty) {
                grid[r][c] = 0;
                rowEmptyCount[r]++;
                colEmptyCount[c]++;
                solve(idx + 1);
                rowEmptyCount[r]--;
                colEmptyCount[c]--;
                grid[r][c] = null;
            }
            
            if (solutions.length >= maxSolutions) return;
            
            // Try Letters (1..K)
            for(let val=1; val<=K; val++) {
                if (!rowUsed[r].has(val) && !colUsed[c].has(val)) {
                    grid[r][c] = val;
                    rowUsed[r].add(val);
                    colUsed[c].add(val);
                    
                    // Pruning: Check Viewpoint (Top/Left) immediately if this is the FIRST letter
                    let valid = true;
                    
                    // Check Left Clue
                    // Is this the first letter in row r?
                    // If all previous cells in row r are 0
                    let isFirstRow = true;
                    for(let k=0; k<c; k++) if(grid[r][k] !== 0) { isFirstRow = false; break; }
                    
                    if (isFirstRow) {
                        if (clues.left[r] !== null && clues.left[r] !== val) valid = false;
                    }
                    
                    // Check Top Clue
                    let isFirstCol = true;
                    for(let k=0; k<r; k++) if(grid[k][c] !== 0) { isFirstCol = false; break; }
                    
                    if (valid && isFirstCol) {
                         if (clues.top[c] !== null && clues.top[c] !== val) valid = false;
                    }
                    
                    // Check Right Clue (Pruning if we passed the point where we could satisfy it)
                    // If this is the last possible letter slot in row? Hard to say.
                    // But if we place a letter, and we have already placed all K letters in this row,
                    // this must match the Right clue IF it is the last letter.
                    // (Only 1 letter allowed if K=1, but usually K>1).
                    // Simpler: Check if we have placed K letters.
                    if (valid && rowUsed[r].size === K) {
                        // This is the last letter to be placed in this row.
                        // Is it the right-most letter? Not necessarily, future cells could be empty.
                        // But future cells MUST be empty if we reached K letters.
                        // So this IS the last letter visible from right.
                        if (clues.right[r] !== null && clues.right[r] !== val) valid = false;
                    }
                    
                    if (valid && colUsed[c].size === K) {
                        if (clues.bottom[c] !== null && clues.bottom[c] !== val) valid = false;
                    }

                    if (valid) solve(idx + 1);
                    
                    rowUsed[r].delete(val);
                    colUsed[c].delete(val);
                    grid[r][c] = null;
                }
            }
        }
        
        function checkViewpoints() {
            // Check all clues fully
            for(let r=0; r<N; r++) {
                // Left
                let first = 0;
                for(let c=0; c<N; c++) if(grid[r][c] !== 0) { first = grid[r][c]; break; }
                if (clues.left[r] !== null && first !== clues.left[r]) return false;
                
                // Right
                let last = 0;
                for(let c=N-1; c>=0; c--) if(grid[r][c] !== 0) { last = grid[r][c]; break; }
                if (clues.right[r] !== null && last !== clues.right[r]) return false;
            }
            
            for(let c=0; c<N; c++) {
                // Top
                let first = 0;
                for(let r=0; r<N; r++) if(grid[r][c] !== 0) { first = grid[r][c]; break; }
                if (clues.top[c] !== null && first !== clues.top[c]) return false;
                
                // Bottom
                let last = 0;
                for(let r=N-1; r>=0; r--) if(grid[r][c] !== 0) { last = grid[r][c]; break; }
                if (clues.bottom[c] !== null && last !== clues.bottom[c]) return false;
            }
            return true;
        }
        
        solve(0);
        return solutions;
    }
    
    createEmptyGrid();
});
























