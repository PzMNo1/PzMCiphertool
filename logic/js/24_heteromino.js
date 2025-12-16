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
    let gridState = []; // 0 = empty (white), 1 = black (clue/void)
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
            Array(currentCols).fill(0));
            
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
        div.className = 'heteromino-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, gridState[r][c]);
        
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            // Toggle state
            gridState[r][c] = gridState[r][c] === 0 ? 1 : 0;
            updateCellDisplay(this, gridState[r][c]);
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, val, borderData = null) {
        el.className = 'heteromino-cell';
        el.textContent = '';
        
        if (val === 1) { // Black
            el.classList.add('black');
        }
        
        if (borderData) {
            if (borderData.top) el.classList.add('border-top');
            if (borderData.bottom) el.classList.add('border-bottom');
            if (borderData.left) el.classList.add('border-left');
            if (borderData.right) el.classList.add('border-right');
            
            // Optional: Show symbol or color for shape type?
            // For now, borders are sufficient.
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
                solutions = jsHeterominoSolver(puzzle);
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
        const sol = solutions[index]; // sol is grid of Shape IDs
        
        const cells = puzzleGrid.querySelectorAll('.heteromino-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            
            // Borders
            // If black, no borders needed usually, or border around it.
            // If white, border if neighbor is diff shape or black or boundary.
            
            const val = sol[r][c]; // shape ID (or -1 if black)
            
            const borderData = {
                top: r === 0 || sol[r-1][c] !== val,
                bottom: r === currentRows-1 || sol[r+1][c] !== val,
                left: c === 0 || sol[r][c-1] !== val,
                right: c === currentCols-1 || sol[r][c+1] !== val
            };
            
            updateCellDisplay(cell, gridState[r][c], borderData);
        });
        
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        
        const cells = puzzleGrid.querySelectorAll('.heteromino-cell');
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
    
    // --- Heteromino Solver ---
    function jsHeterominoSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const maxSolutions = 5;
        
        // Shapes (Trominoes - size 3)
        // Definitions: Relative to a 'Center' (root).
        // Python solver defines SHAPES: I, -, 7, J, L, r
        // All size 3.
        // Neighbors map:
        // I (Vertical): (-1,0), (1,0) relative to center
        // - (Horizontal): (0,-1), (0,1)
        // 7 (Top-Left corner?): Python says ((0,-1), (1,0)) -> Left and Down. So it's ┐ shape?
        // J (Top-Right?): ((-1,0), (0,-1)) -> Up and Left. So it's ┘ shape?
        // L (Bottom-Left?): ((-1,0), (0,1)) -> Up and Right. So it's └ shape.
        // r (Bottom-Right?): ((0,1), (1,0)) -> Right and Down. So it's ┌ shape.
        
        // We need to partition all White cells into Trominoes.
        // Constraint: Adjacent Trominoes must be different SHAPES.
        // The 'shape' property is rotation-dependent in this puzzle?
        // Python solver logic:
        // `SHAPES = (shapeI, shape_, shape7, shapeJ, shapeL, shaper)`
        // `require((shape[cell_r][cell_c] != shape[r][c]) ...)`
        // This implies exact shape+orientation match is forbidden.
        // If I have shape 'I' (Vertical), I cannot touch another 'I'.
        // But 'I' and '-' are different.
        // Yes.
        
        // Grid: -1 = Black (User set), 0 = Empty (to be filled)
        const grid = Array(R).fill().map(() => Array(C).fill(0));
        let whiteCount = 0;
        
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (puzzle.grid[r][c] === 1) grid[r][c] = -1; // Black
                else whiteCount++;
            }
        }
        
        if (whiteCount % 3 !== 0) return []; // Must be divisible by 3
        
        const solutions = [];
        
        // Result grid: Stores shape ID for each cell.
        // To allow "different shapes", we store {id, type}.
        // id is unique per tromino. type is 'I', '-', etc.
        const resultGrid = Array(R).fill().map(() => Array(C).fill(null));
        
        // We can fill cell by cell.
        // Find first empty cell. Assign a shape rooted at it?
        // Or rooted at neighbor?
        // Standard approach: Find first empty. It must belong to SOME tromino.
        // It can be the center, or one of the leaves.
        // If it's center, we pick type and fill neighbors.
        // If it's leaf, we pick center and type.
        
        // Optimization: Always picking the "first empty cell" (raster order)
        // This cell must be filled.
        // It can be:
        // 1. The top/left cell of a tromino.
        // Since we scan raster order, it CANNOT be the bottom/right cell of a new tromino,
        // unless the center was already filled? No, if we find empty, it's not filled.
        // So this cell is the "First" cell of the new tromino in raster order.
        
        // Let's define shapes by their raster-ordered cells offsets relative to "First" cell.
        // (0,0) is the current cell.
        // I (Vertical): (0,0), (1,0), (2,0)
        // - (Horizontal): (0,0), (0,1), (0,2)
        // L (└): (0,0), (1,0), (1,1) -- First is Top-Left of bounding box
        // J (┘): (0,1), (1,1), (1,0) -- First is (0,1)? No raster order first is (0,1).
        // Wait, if (0,1) is first, then (0,0) must be non-empty.
        
        // Let's list all 6 shapes and their cells relative to the Top-Left-most cell.
        // 1. I: (0,0), (1,0), (2,0). Type 0.
        // 2. -: (0,0), (0,1), (0,2). Type 1.
        // 3. L (└): Cells are (0,0), (1,0), (1,1). (Top-Left, Bottom-Left, Bottom-Right). Type 2.
        // 4. J (┘): Cells are (0,1), (1,1), (1,0). (Top-Right, Bottom-Right, Bottom-Left).
        //    First cell in raster order is (0,1).
        //    So relative to (0,1), cells are (0,0), (1,0), (1,-1). Type 3.
        // 5. 7 (┐): Cells are (0,0), (0,1), (1,0). (Top-Left, Top-Right, Bottom-Left). Type 4.
        // 6. r (┌): Cells are (0,0), (0,1), (1,1). (Top-Left, Top-Right, Bottom-Right). Type 5.
        
        // Correct check on 7 and r:
        // Python solver NEIGHBORS definition:
        // 7: ((0, -1), (1, 0)) from CENTER.
        //    Center at (r,c). Neighbors (r, c-1) and (r+1, c).
        //    Cells: (r,c-1), (r,c), (r+1,c).
        //    Raster first: (r, c-1).
        //    Relative to (r,c-1): (0,0), (0,1), (1,1).
        //    This shape is ┌ (r). Wait.
        //    (r, c-1) - Left. (r, c) - Center. (r+1, c) - Down.
        //    Visual:
        //    X X
        //      X
        //    This looks like 7 (┐).
        //    Wait, (r,c-1) is left of (r,c).
        //    (r, c-1) [First] -> (r, c) [Second] -> (r+1, c) [Third]
        //    Visual:
        //    [1][2]
        //       [3]
        //    Yes, this is 7.
        //    So offsets relative to [1]: (0,0), (0,1), (1,1).
        
        // r: ((0, 1), (1, 0)) from CENTER.
        //    Center (r,c). Neighbors (r, c+1), (r+1, c).
        //    Cells: (r,c), (r,c+1), (r+1,c).
        //    Raster first: (r,c).
        //    Relative to (r,c): (0,0), (0,1), (1,0).
        //    Visual:
        //    [1][2]
        //    [3]
        //    This is r (┌).
        
        // Let's re-verify names.
        // I: |
        // -: ---
        // L: |_  (0,0), (1,0), (1,1)
        // J: _|  (0,1), (1,0), (1,1) -- First is (0,1). Rel: (0,0), (1,-1), (1,0).
        // 7: 7   (0,0), (0,1), (1,1) -- Based on previous analysis.
        // r: r   (0,0), (0,1), (1,0) -- Based on previous analysis.
        
        const SHAPES = [
            { type: 'I', cells: [[0,0], [1,0], [2,0]] },
            { type: '-', cells: [[0,0], [0,1], [0,2]] },
            { type: 'L', cells: [[0,0], [1,0], [1,1]] }, // └
            { type: 'J', cells: [[0,0], [1,-1], [1,0]] }, // ┘ (First cell is top-right)
            { type: '7', cells: [[0,0], [0,1], [1,1]] }, // ┐ (First cell is top-left)
            { type: 'r', cells: [[0,0], [0,1], [1,0]] }  // ┌ (First cell is top-left)
        ];
        
        // Note on J:
        // The shape is:
        //   X
        // X X
        // Raster first is the top X. Let's call it (r,c).
        // Then (r+1, c-1) and (r+1, c) are the others.
        // So offsets: (0,0), (1,-1), (1,0).
        
        let trominoIdCounter = 0;
        const trominoes = []; // List of {id, type, cells}
        
        function solve(idx) { // idx = r*C + c
            if (solutions.length >= maxSolutions) return;
            
            // Find first empty cell
            let r, c;
            let found = false;
            for(let i=idx; i<R*C; i++) {
                r = Math.floor(i/C);
                c = i%C;
                if (grid[r][c] === -1) continue; // Black
                if (resultGrid[r][c] === null) {
                    found = true;
                    idx = i; // Update idx for next calls
                    break;
                }
            }
            
            if (!found) {
                // All filled. Solution found.
                // Reconstruct a grid of IDs or Types for display
                // We need to differentiate regions.
                // We can use unique ID per tromino.
                const solGrid = Array(R).fill().map(() => Array(C).fill(null));
                for(let rr=0; rr<R; rr++) {
                    for(let cc=0; cc<C; cc++) {
                        if (resultGrid[rr][cc] !== null) solGrid[rr][cc] = resultGrid[rr][cc].id;
                        else solGrid[rr][cc] = -1;
                    }
                }
                solutions.push(solGrid);
                return;
            }
            
            // Try placing a shape rooted at (r,c)
            for(const shape of SHAPES) {
                // Check if shape fits
                let fits = true;
                const currentCells = [];
                
                for(const os of shape.cells) {
                    const nr = r + os[0];
                    const nc = c + os[1];
                    
                    if (nr < 0 || nr >= R || nc < 0 || nc >= C) { fits = false; break; }
                    if (grid[nr][nc] === -1) { fits = false; break; } // Black
                    if (resultGrid[nr][nc] !== null) { fits = false; break; } // Occupied
                    
                    currentCells.push({r: nr, c: nc});
                }
                
                if (fits) {
                    // Check adjacency constraint
                    // For each cell in new shape, check neighbors.
                    // If neighbor belongs to a different tromino, check types.
                    // If types are same -> Invalid.
                    let adjValid = true;
                    const currentId = trominoIdCounter;
                    
                    for(const cell of currentCells) {
                        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                        for(const d of dirs) {
                            const nr = cell.r + d[0];
                            const nc = cell.c + d[1];
                            if (nr>=0 && nr<R && nc>=0 && nc<C) {
                                const neighbor = resultGrid[nr][nc];
                                if (neighbor !== null) {
                                    // Neighbor is occupied
                                    // Check if it's not the current one (which is impossible as we haven't placed it, 
                                    // but currentCells are checked to be null in resultGrid).
                                    if (neighbor.type === shape.type) {
                                        adjValid = false; break;
                                    }
                                }
                            }
                        }
                        if (!adjValid) break;
                    }
                    
                    if (adjValid) {
                        // Place
                        trominoIdCounter++;
                        const trominoData = { id: currentId, type: shape.type };
                        for(const cell of currentCells) {
                            resultGrid[cell.r][cell.c] = trominoData;
                        }
                        
                        solve(idx + 1);
                        
                        // Backtrack
                        for(const cell of currentCells) {
                            resultGrid[cell.r][cell.c] = null;
                        }
                        trominoIdCounter--;
                    }
                }
            }
        }
        
        solve(0);
        return solutions;
    }
    
    createEmptyGrid();
});
























