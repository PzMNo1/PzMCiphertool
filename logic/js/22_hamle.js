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
    
    let currentRows = 6;
    let currentCols = 6;
    let gridState = []; // number or null
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
            Array(currentCols).fill().map(() => null));
            
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        puzzleGrid.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        puzzleGrid.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;
        puzzleGrid.style.position = 'relative';
        
        for(let r=0; r<currentRows; r++) {
            for(let c=0; c<currentCols; c++) {
                createGridCell(r, c);
            }
        }
    }
    
    function createGridCell(r, c) {
        const div = document.createElement('div');
        div.className = 'hamle-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, gridState[r][c]);
        
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
        el.className = 'hamle-cell';
        el.innerHTML = ''; // Clear content (including arrows)
        
        if (typeof val === 'number') {
            el.classList.add('clue');
            el.textContent = val;
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
                solutions = jsHamleSolver(puzzle);
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
        // sol: array of {from: {r,c}, to: {r,c}, val}
        
        // Reset view
        const cells = puzzleGrid.querySelectorAll('.hamle-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            cell.className = 'hamle-cell';
            cell.innerHTML = '';
            
            // If it was a clue, show it ghosted if moved?
            // Actually, if a cell is a destination, it becomes black.
            // Original clue positions remain? The rules say "Clue moves".
            // Usually in Hamle, the original number remains visible as reference, 
            // and the destination becomes black.
            // Let's show original clues.
            if (gridState[r][c] !== null) {
                cell.classList.add('clue');
                cell.classList.add('source'); // Add source style
                cell.textContent = gridState[r][c];
            }
        });
        
        // Apply moves
        sol.forEach(move => {
            const toCell = cells[move.to.r * currentCols + move.to.c];
            
            // Mark destination as black
            toCell.classList.remove('source'); // If source was also destination? (Distance 0 impossible per rules usually, but if so)
            toCell.classList.add('black');
            toCell.textContent = move.val; // Show value in black cell
            
            // Draw arrow
            drawArrow(move.from, move.to);
        });
        
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    function drawArrow(from, to) {
        // Calculate position
        const cellSize = 40;
        const fromX = from.c * cellSize + cellSize/2;
        const fromY = from.r * cellSize + cellSize/2;
        const toX = to.c * cellSize + cellSize/2;
        const toY = to.r * cellSize + cellSize/2;
        
        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        const arrow = document.createElement('div');
        arrow.className = 'move-arrow';
        arrow.style.left = `${fromX}px`;
        arrow.style.top = `${fromY}px`;
        arrow.style.width = `${length}px`;
        arrow.style.height = '2px';
        arrow.style.transform = `rotate(${angle}deg)`;
        
        // Don't cover text
        // arrow.style.zIndex = 5;
        
        puzzleGrid.appendChild(arrow);
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        // Remove arrows
        const arrows = puzzleGrid.querySelectorAll('.move-arrow');
        arrows.forEach(el => el.remove());
        
        // Restore cells
        const cells = puzzleGrid.querySelectorAll('.hamle-cell');
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
    
    // --- Hamle Solver ---
    function jsHamleSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const clues = []; // List of {r, c, val}
        const maxSolutions = 5;
        
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (typeof puzzle.grid[r][c] === 'number') {
                    clues.push({r, c, val: puzzle.grid[r][c]});
                }
            }
        }
        
        const solutions = [];
        const occupied = Array(R).fill().map(() => Array(C).fill(false));
        const moves = []; // Current set of moves
        
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === clues.length) {
                // All clues moved.
                // Verify global constraints:
                // 1. No adjacent black cells (occupied cells)
                // 2. All white cells connected
                
                // Check adjacency
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        if (occupied[r][c]) {
                            if (r<R-1 && occupied[r+1][c]) return;
                            if (c<C-1 && occupied[r][c+1]) return;
                        }
                    }
                }
                
                // Check connectivity of White cells
                // Count white cells
                let whiteCount = 0;
                let startR = -1, startC = -1;
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        if (!occupied[r][c]) {
                            whiteCount++;
                            if (startR === -1) { startR = r; startC = c; }
                        }
                    }
                }
                
                if (whiteCount === 0) return; // Should not happen normally
                
                // BFS
                let visitedCount = 0;
                const q = [{r: startR, c: startC}];
                const visited = new Set();
                visited.add(startR + "," + startC);
                
                while(q.length > 0) {
                    const curr = q.shift();
                    visitedCount++;
                    
                    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                    for(const [dr, dc] of dirs) {
                        const nr = curr.r + dr, nc = curr.c + dc;
                        if(nr>=0 && nr<R && nc>=0 && nc<C && !occupied[nr][nc]) {
                            const key = nr + "," + nc;
                            if (!visited.has(key)) {
                                visited.add(key);
                                q.push({r: nr, c: nc});
                            }
                        }
                    }
                }
                
                if (visitedCount === whiteCount) {
                    solutions.push([...moves]);
                }
                return;
            }
            
            const clue = clues[idx];
            const val = clue.val;
            
            // Potential destinations
            const dests = [
                {r: clue.r - val, c: clue.c}, // Up
                {r: clue.r + val, c: clue.c}, // Down
                {r: clue.r, c: clue.c - val}, // Left
                {r: clue.r, c: clue.c + val}  // Right
            ];
            
            for(const dest of dests) {
                if (dest.r >= 0 && dest.r < R && dest.c >= 0 && dest.c < C) {
                    if (!occupied[dest.r][dest.c]) {
                        // Optimization: Check adjacency with *already placed* black cells?
                        // Yes, pruning: if we place here, does it touch existing black?
                        let adjConflict = false;
                        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
                        for(const [dr, dc] of neighbors) {
                            const nr = dest.r + dr, nc = dest.c + dc;
                            if(nr>=0 && nr<R && nc>=0 && nc<C && occupied[nr][nc]) {
                                adjConflict = true; break;
                            }
                        }
                        
                        if (!adjConflict) {
                            occupied[dest.r][dest.c] = true;
                            moves.push({from: {r: clue.r, c: clue.c}, to: dest, val: val});
                            
                            solve(idx + 1);
                            
                            moves.pop();
                            occupied[dest.r][dest.c] = false;
                        }
                    }
                }
            }
        }
        
        solve(0);
        return solutions;
    }
    
    createEmptyGrid();
});
























