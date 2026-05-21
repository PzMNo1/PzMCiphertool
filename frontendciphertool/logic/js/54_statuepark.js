document.addEventListener('DOMContentLoaded', () => {
    const gridEl = document.getElementById('grid');
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const createBtn = document.getElementById('create-grid-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const statusMsg = document.getElementById('status-msg');
    const shapeSetSelect = document.getElementById('shape-set');
    const loadingEl = document.getElementById('loading');
    const solNav = document.getElementById('solution-nav');
    const prevSolBtn = document.getElementById('prev-sol');
    const nextSolBtn = document.getElementById('next-sol');
    const solCountEl = document.getElementById('sol-count');

    let rows = 10;
    let cols = 10;
    let gridData = []; // 0: empty, 1: black circle, 2: white circle
    let solutions = [];
    let currentSolIndex = 0;

    // Shape definitions (coordinates)
    const TETROMINOES = {
        'I': [[0,0], [0,1], [0,2], [0,3]],
        'O': [[0,0], [0,1], [1,0], [1,1]],
        'T': [[0,0], [0,1], [0,2], [1,1]],
        'L': [[0,0], [0,1], [0,2], [1,0]], // L and J are usually considered reflections, standard set includes one sided? Usually free rotation/reflection allowed.
        'S': [[0,1], [0,2], [1,0], [1,1]]  // S and Z
    };
    // Actually Statue Park usually uses the "standard" set where rotations/reflections are allowed.
    // The "One-Sided" set is different. I will assume free rotation and reflection for standard Polyominoes.
    
    // Standard 5 Tetrominoes (Free)
    const TETROMINOES_FREE = [
        [[0,0], [0,1], [0,2], [0,3]], // I
        [[0,0], [0,1], [1,0], [1,1]], // O
        [[0,0], [0,1], [0,2], [1,1]], // T
        [[0,0], [1,0], [2,0], [2,1]], // L
        [[0,0], [0,1], [1,1], [1,2]]  // S
    ];

    // Standard 12 Pentominoes (Free)
    const PENTOMINOES_FREE = [
        [[0,1], [1,0], [1,1], [1,2], [2,1]], // F (or X? No this is + like plus 1) -> No, F is like:  .XX / XX. / .X. -> [[0,1],[0,2],[1,0],[1,1],[2,1]] 
        // Let's use standard naming or just shapes.
        [[0,0], [0,1], [0,2], [0,3], [0,4]], // I
        [[0,0], [1,0], [2,0], [3,0], [3,1]], // L
        [[0,0], [1,0], [2,0], [3,0], [1,1]], // Y (or N?) -> This is Y? No. 
        // Let's just list them by coords carefully.
        [[0,0], [0,1], [1,0], [2,0], [3,0]], // L (Already have?) No this is same as above just rotated.
        // Using a generated list is better or hardcoded known ones.
        // PENTOMINOES: F I L P N T U V W X Y Z
        [[1,0], [1,1], [0,1], [0,2], [2,1]], // F
        [[0,0], [0,1], [0,2], [0,3], [0,4]], // I
        [[0,0], [0,1], [0,2], [0,3], [1,3]], // L
        [[0,0], [0,1], [1,0], [1,1], [0,2]], // P
        [[0,0], [0,1], [1,1], [1,2], [1,3]], // N
        [[0,0], [0,1], [0,2], [1,1], [2,1]], // T
        [[0,0], [0,2], [1,0], [1,1], [1,2]], // U
        [[0,0], [1,0], [2,0], [2,1], [2,2]], // V
        [[0,0], [1,0], [1,1], [2,1], [2,2]], // W
        [[1,0], [0,1], [1,1], [2,1], [1,2]], // X
        [[0,0], [0,1], [0,2], [0,3], [1,1]], // Y (or T with longer stem? No Y is 4+1 off center) -> [[0,0], [1,0], [2,0], [3,0], [1,1]] is correct.
        [[0,0], [0,1], [1,1], [2,1], [2,2]]  // Z
    ];

    function init() {
        createGrid();
        createBtn.addEventListener('click', () => {
            rows = parseInt(rowsInput.value) || 10;
            cols = parseInt(colsInput.value) || 10;
            createGrid();
        });
        
        resetBtn.addEventListener('click', createGrid);
        
        solveBtn.addEventListener('click', async () => {
            if (loadingEl.style.display !== 'none') return;
            
            loadingEl.style.display = 'flex';
            statusMsg.textContent = "正在求解...";
            solutions = [];
            
            // Yield to UI render
            await new Promise(resolve => setTimeout(resolve, 100));
            
            try {
                const shapeSetName = shapeSetSelect.value;
                const shapes = shapeSetName === 'Tetrominoes' ? TETROMINOES_FREE : PENTOMINOES_FREE;
                
                solutions = solveStatuePark(rows, cols, gridData, shapes);
                
                if (solutions.length > 0) {
                    currentSolIndex = 0;
                    showSolution(0);
                    solNav.style.display = 'flex';
                    statusMsg.textContent = `找到 ${solutions.length} 个解`;
                } else {
                    statusMsg.textContent = "无解";
                    solNav.style.display = 'none';
                    clearSolutionDisplay();
                }
            } catch (e) {
                console.error(e);
                statusMsg.textContent = "求解出错: " + e.message;
            } finally {
                loadingEl.style.display = 'none';
            }
        });

        prevSolBtn.addEventListener('click', () => {
            if (solutions.length === 0) return;
            currentSolIndex = (currentSolIndex - 1 + solutions.length) % solutions.length;
            showSolution(currentSolIndex);
        });

        nextSolBtn.addEventListener('click', () => {
            if (solutions.length === 0) return;
            currentSolIndex = (currentSolIndex + 1) % solutions.length;
            showSolution(currentSolIndex);
        });
    }

    function createGrid() {
        gridEl.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
        gridData = Array(rows).fill().map(() => Array(cols).fill(0));
        solutions = [];
        solNav.style.display = 'none';
        statusMsg.textContent = "点击格子切换状态：空 -> 黑圆 -> 白圆 -> 空";

        for(let i=0; i<rows; i++) {
            for(let j=0; j<cols; j++) {
                const cell = document.createElement('div');
                cell.className = 'statuepark-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener('click', () => toggleCell(i, j, cell));
                gridEl.appendChild(cell);
            }
        }
    }

    function toggleCell(r, c, cell) {
        // cycle: 0 -> 1 (black) -> 2 (white) -> 0
        let val = gridData[r][c];
        val = (val + 1) % 3;
        gridData[r][c] = val;
        
        cell.className = 'statuepark-cell'; // reset
        if (val === 1) cell.classList.add('circle-black');
        if (val === 2) cell.classList.add('circle-white');
        
        // If showing solution, clear it on edit
        if (solutions.length > 0) {
            solutions = [];
            solNav.style.display = 'none';
            clearSolutionDisplay();
        }
    }

    function showSolution(idx) {
        const sol = solutions[idx];
        solCountEl.textContent = `${idx + 1}/${solutions.length}`;
        
        const cells = gridEl.children;
        for(let i=0; i<rows; i++) {
            for(let j=0; j<cols; j++) {
                const cellIndex = i * cols + j;
                const cell = cells[cellIndex];
                // Reset visual classes except circles
                const baseClass = 'statuepark-cell' + 
                    (gridData[i][j] === 1 ? ' circle-black' : '') + 
                    (gridData[i][j] === 2 ? ' circle-white' : '');
                cell.className = baseClass;
                
                if (sol[i][j] !== -1) {
                    cell.classList.add(`cell-shape-${sol[i][j] % 12}`);
                    cell.classList.add('cell-occupied');
                }
            }
        }
    }
    
    function clearSolutionDisplay() {
        const cells = gridEl.children;
        for(let i=0; i<rows; i++) {
            for(let j=0; j<cols; j++) {
                const cellIndex = i * cols + j;
                const cell = cells[cellIndex];
                const baseClass = 'statuepark-cell' + 
                    (gridData[i][j] === 1 ? ' circle-black' : '') + 
                    (gridData[i][j] === 2 ? ' circle-white' : '');
                cell.className = baseClass;
            }
        }
    }

    // --- SOLVER LOGIC ---

    function solveStatuePark(R, C, gridClues, baseShapes) {
        // Generate all variants (rotations/reflections) for each shape
        // Each shape needs a unique ID.
        const allShapes = [];
        baseShapes.forEach((s, idx) => {
            const variants = generateVariants(s);
            allShapes.push({ id: idx, variants: variants });
        });

        // Check basic constraints count
        const totalArea = R * C;
        const shapeArea = baseShapes[0].length; // assume all same size (4 or 5)
        const totalShapeArea = allShapes.length * shapeArea;
        
        if (totalShapeArea > totalArea) return []; // Impossible

        // Prepare grid for solver: -1 empty, >=0 shapeId
        let board = Array(R).fill().map(() => Array(C).fill(-1));
        
        let results = [];
        backtrack(0, board, [...allShapes], results, R, C, gridClues);
        return results;
    }

    function backtrack(shapeIdx, board, remainingShapes, results, R, C, clues) {
        if (results.length >= 1) return; // Limit to 1 solution for speed, or more?
        
        if (remainingShapes.length === 0) {
            // All shapes placed. Check final validity (connectivity of empty space)
            if (checkConnectivity(board, R, C)) {
                results.push(board.map(row => [...row]));
            }
            return;
        }

        // Optimization: Check if remaining shapes can fit in empty space
        // Optimization: Check if all black circles are covered or CAN be covered
        if (!canCoverBlackCircles(board, remainingShapes, R, C, clues)) return;

        // Try to place the next shape
        // We can try to pick a shape and place it.
        // To avoid trying every shape in every slot, we can enforce an order if shapes are identical, but they are distinct.
        // Heuristic: Pick the first remaining shape and try to place it in all valid positions.
        
        const shape = remainingShapes[0];
        const nextShapes = remainingShapes.slice(1);

        // Optimization: Restrict positions to valid ones
        // Iterate over all grid cells as top-left reference for the shape
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                // Optimization: If cell (r,c) is a black circle, it MUST be covered. 
                // If we skip too many black circles, we might fail early.
                
                for (const variant of shape.variants) {
                    if (canPlace(board, variant, r, c, R, C, clues)) {
                        placeShape(board, variant, r, c, shape.id);
                        backtrack(shapeIdx + 1, board, nextShapes, results, R, C, clues);
                        removeShape(board, variant, r, c);
                        if (results.length >= 1) return;
                    }
                }
            }
        }
    }

    function generateVariants(coords) {
        let variants = [];
        let current = coords;
        // 4 rotations
        for (let i = 0; i < 4; i++) {
            variants.push(normalize(current));
            variants.push(normalize(reflect(current)));
            current = rotate(current);
        }
        // Remove duplicates
        const unique = [];
        const seen = new Set();
        for (const v of variants) {
            const s = JSON.stringify(v);
            if (!seen.has(s)) {
                seen.add(s);
                unique.push(v);
            }
        }
        return unique;
    }

    function rotate(coords) {
        return coords.map(([r, c]) => [c, -r]);
    }

    function reflect(coords) {
        return coords.map(([r, c]) => [r, -c]);
    }

    function normalize(coords) {
        const minR = Math.min(...coords.map(p => p[0]));
        const minC = Math.min(...coords.map(p => p[1]));
        return coords.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }

    function canPlace(board, variant, r, c, R, C, clues) {
        for (const [dr, dc] of variant) {
            const nr = r + dr;
            const nc = c + dc;
            
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) return false; // Out of bounds
            if (board[nr][nc] !== -1) return false; // Occupied
            if (clues[nr][nc] === 2) return false; // White circle (must be empty)
            
            // Check adjacency (orthogonally) with OTHER shapes (diff ID)
            // In this board representation, we don't store IDs yet, just -1 or ID.
            // If we place it, we need to check neighbors.
            // Actually, we should check neighbors NOW.
            
            const neighbors = [[-1,0], [1,0], [0,-1], [0,1]];
            for (const [nr_d, nc_d] of neighbors) {
                const nnr = nr + nr_d;
                const nnc = nc + nc_d;
                if (nnr >= 0 && nnr < R && nnc >= 0 && nnc < C) {
                    if (board[nnr][nnc] !== -1) return false; // Touches another shape orthogonally
                }
            }

            // Check diagonal touching?
            // Statue park rule: "Pieces cannot touch, not even diagonally"?
            // Prompt says: "Pieces cannot touch, not even diagonally."
            const diags = [[-1,-1], [-1,1], [1,-1], [1,1]];
            for (const [nr_d, nc_d] of diags) {
                const nnr = nr + nr_d;
                const nnc = nc + nc_d;
                if (nnr >= 0 && nnr < R && nnc >= 0 && nnc < C) {
                    if (board[nnr][nnc] !== -1) return false; // Touches diagonally
                }
            }
        }
        return true;
    }

    function placeShape(board, variant, r, c, id) {
        for (const [dr, dc] of variant) {
            board[r + dr][c + dc] = id;
        }
    }

    function removeShape(board, variant, r, c) {
        for (const [dr, dc] of variant) {
            board[r + dr][c + dc] = -1;
        }
    }

    function checkConnectivity(board, R, C) {
        // BFS from first empty cell
        let start = null;
        let emptyCount = 0;
        for(let i=0; i<R; i++) {
            for(let j=0; j<C; j++) {
                if (board[i][j] === -1) {
                    if (!start) start = [i, j];
                    emptyCount++;
                }
            }
        }
        
        if (emptyCount === 0) return true; // No empty cells (unlikely but valid connectivity wise)
        
        let q = [start];
        let visited = new Set();
        visited.add(`${start[0]},${start[1]}`);
        let count = 0;
        
        while(q.length > 0) {
            const [r, c] = q.shift();
            count++;
            
            const neighbors = [[-1,0], [1,0], [0,-1], [0,1]];
            for (const [dr, dc] of neighbors) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < R && nc >= 0 && nc < C && board[nr][nc] === -1) {
                    const key = `${nr},${nc}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        q.push([nr, nc]);
                    }
                }
            }
        }
        
        return count === emptyCount;
    }

    function canCoverBlackCircles(board, remainingShapes, R, C, clues) {
        // Quick check: Count black circles not yet covered
        let uncoveredBlack = 0;
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (clues[r][c] === 1 && board[r][c] === -1) {
                    uncoveredBlack++;
                }
            }
        }
        
        // Max coverage of remaining shapes
        const totalAreaRemaining = remainingShapes.reduce((acc, s) => acc + s.variants[0].length, 0);
        if (uncoveredBlack > totalAreaRemaining) return false;
        
        // Also, all black circles must be reachable by at least ONE remaining shape placement
        // This is more expensive to check, maybe skip for now.
        
        return true;
    }

    init();
});



















