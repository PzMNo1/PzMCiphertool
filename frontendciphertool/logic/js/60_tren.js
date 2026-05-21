document.addEventListener('DOMContentLoaded', () => {
    const gridEl = document.getElementById('grid');
    const sizeInput = document.getElementById('size');
    const createBtn = document.getElementById('create-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const status = document.getElementById('status');

    let N = 8;
    let grid = []; // { val: number | null, vehicleId: null }

    function init() {
        createBtn.addEventListener('click', () => {
            N = parseInt(sizeInput.value);
            createGrid();
        });
        resetBtn.addEventListener('click', createGrid);
        solveBtn.addEventListener('click', solve);
        createGrid();
    }

    function createGrid() {
        gridEl.style.gridTemplateColumns = `repeat(${N}, 40px)`;
        gridEl.innerHTML = '';
        grid = Array(N).fill().map(() => Array(N).fill().map(() => ({ val: null, vehicleId: null })));

        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = document.createElement('div');
                cell.className = 'tren-cell';
                const input = document.createElement('input');
                input.type = 'number';
                input.addEventListener('change', (e) => {
                    const v = parseInt(e.target.value);
                    grid[i][j].val = isNaN(v) ? null : v;
                });
                cell.appendChild(input);
                gridEl.appendChild(cell);
            }
        }
    }

    function renderSolution(vehicles) {
        // Reset styles
        document.querySelectorAll('.tren-cell').forEach(c => c.classList.remove('vehicle'));
        
        vehicles.forEach((v, idx) => {
            // v: {r, c, w, h}
            for(let i=0; i<v.h; i++) {
                for(let j=0; j<v.w; j++) {
                    const cellIndex = (v.r + i) * N + (v.c + j);
                    gridEl.children[cellIndex].classList.add('vehicle');
                    // Add borders?
                }
            }
        });
    }

    async function solve() {
        status.textContent = '求解中...';
        await new Promise(r => setTimeout(r, 50));

        const clues = {};
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                if (grid[i][j].val !== null) clues[`${i},${j}`] = grid[i][j].val;
            }
        }

        const sol = solveTren(N, clues);
        if (sol) {
            renderSolution(sol);
            status.textContent = '已解决!';
        } else {
            status.textContent = '无解';
        }
    }

    function solveTren(size, clues) {
        // Backtracking placement of vehicles.
        // Clues MUST be part of a vehicle.
        // Each vehicle is size 2 or 3.
        // Partition the grid into vehicles and empty space?
        // Wait, empty space is allowed.
        // "Each number implies...". So clue cells MUST be covered by a vehicle.
        
        // We need to cover all clues. Non-clue cells can be vehicle or empty?
        // "Place vehicles ... The grid is not necessarily fully covered."
        
        // Strategy:
        // 1. Identify all clue cells.
        // 2. Each clue cell must belong to a vehicle.
        // 3. A vehicle can cover multiple clues (if they match).
        // 4. Backtrack: Iterate clue cells that are not yet covered.
        //    Try placing a vehicle (horz/vert, len 2/3) covering this cell.
        //    If valid, move to next clue.
        // 5. After covering all clues, check if we need to place MORE vehicles?
        //    Usually Tren puzzles only require satisfying clues.
        //    BUT, vehicles cannot overlap.
        //    Is it allowed to have vehicles without clues? Yes, usually.
        //    But do we NEED them?
        //    If the puzzle is well-formed, maybe we only need vehicles that cover clues?
        //    Wait, standard Tren: "Locate some blocks... Each number is part of a block."
        //    Does NOT say all blocks must have numbers.
        //    However, in logic puzzles, typically we only place things forced by clues.
        //    Let's assume we only place vehicles touching at least one clue?
        //    Or does the freedom constraint require blocking cars?
        //    If I need a car to move exactly X steps, I might need ANOTHER car (without clue) to block it.
        //    That makes it hard.
        
        //    Let's look at the Python solver.
        //    It uses `RectangularGridRegionSolver`. "White region" is empty space.
        //    It covers the WHOLE grid with regions. Some are "White".
        //    Vehicles are regions of size 2 or 3. White region is any size.
        //    So: Every cell is either Vehicle or Empty.
        
        //    Simplified Solver for JS:
        //    Since implementing full region solver is complex, let's assume:
        //    - Backtrack to assign each cell to {VehicleID, or Empty}.
        //    - Constraint: Vehicle size 2/3.
        //    - Constraint: Clues satisfied.
        
        //    Optimization:
        //    Focus on Clues.
        //    For each clue, it MUST belong to a vehicle.
        //    Try to assign a vehicle to it.
        //    Once all clues are covered, we check constraints.
        //    The constraints might NOT be satisfied if we don't place blocking cars.
        //    This suggests we might need to fill empty spaces with blocking cars.
        //    
        //    Heuristic: Most Tren puzzles are packed.
        //    Let's try to just cover clues first. If check fails, maybe we need "blocking" cars?
        //    Actually, the number indicates movement freedom.
        //    Movement is stopped by other cars OR grid edge.
        //    So we definitely need to know where OTHER cars are.
        
        //    State: Board with IDs. 0 = Empty. >0 = Vehicle ID.
        //    We need to fill the board.
        //    Backtracking cell by cell?
        //    Try: Empty, H2, H3, V2, V3 starting at cell.
        //    This is slow but general.
        
        let board = Array(size).fill().map(() => Array(size).fill(0)); // 0: empty/unassigned
        
        // Identify clue locations
        const clueLocs = [];
        for(let r=0; r<size; r++) for(let c=0; c<size; c++) if (clues[`${r},${c}`] !== undefined) clueLocs.push([r,c]);
        
        // Sort clues to prioritize?
        
        // We backtrack on CELLS.
        // At each cell (r,c), if it's unassigned:
        // Options:
        // 1. Leave Empty (0). (Only if not a clue cell)
        // 2. Start H2 vehicle.
        // 3. Start H3 vehicle.
        // 4. Start V2 vehicle.
        // 5. Start V3 vehicle.
        
        // Constraints:
        // - Vehicles fit.
        // - Vehicles don't overlap.
        // - If cell is a clue, it MUST be covered (Option 1 invalid).
        
        return backtrack(0, 0, board, size, clues);
    }

    function backtrack(r, c, board, size, clues) {
        if (r === size) {
            return checkConstraints(board, size, clues) ? extractVehicles(board, size) : null;
        }

        const nextR = c === size - 1 ? r + 1 : r;
        const nextC = c === size - 1 ? 0 : c + 1;

        // If already covered by previous placement
        if (board[r][c] !== 0) {
            return backtrack(nextR, nextC, board, size, clues);
        }

        const isClue = clues[`${r},${c}`] !== undefined;

        // Option 1: Empty
        // Cannot be empty if it's a clue
        if (!isClue) {
            board[r][c] = -1; // -1 for explicitly empty
            const res = backtrack(nextR, nextC, board, size, clues);
            if (res) return res;
            board[r][c] = 0;
        }

        // Generate unique ID for new vehicle
        const vid = r * size + c + 1; // simple ID

        // Option 2,3,4,5: Place Vehicle
        const shapes = [
            {w:2, h:1}, {w:3, h:1},
            {w:1, h:2}, {w:1, h:3}
        ];

        for(const s of shapes) {
            if (canPlace(board, r, c, s.w, s.h, size)) {
                place(board, r, c, s.w, s.h, vid);
                
                // Pruning: Check if this placement violates any "closed" clues?
                // Hard to check efficiently.
                
                const res = backtrack(nextR, nextC, board, size, clues);
                if (res) return res;
                
                clear(board, r, c, s.w, s.h);
            }
        }

        return null;
    }

    function canPlace(board, r, c, w, h, size) {
        if (r + h > size || c + w > size) return false;
        for(let i=0; i<h; i++) {
            for(let j=0; j<w; j++) {
                if (board[r+i][c+j] !== 0) return false;
            }
        }
        return true;
    }

    function place(board, r, c, w, h, id) {
        for(let i=0; i<h; i++) for(let j=0; j<w; j++) board[r+i][c+j] = id;
    }
    function clear(board, r, c, w, h) {
        for(let i=0; i<h; i++) for(let j=0; j<w; j++) board[r+i][c+j] = 0;
    }

    function checkConstraints(board, size, clues) {
        // Check all clues
        for(const key in clues) {
            const [r, c] = key.split(',').map(Number);
            const val = clues[key];
            const vid = board[r][c];
            if (vid <= 0) return false; // Should not happen logic wise

            // Find vehicle bounds
            let vr=r, vc=c, w=0, h=0;
            // Find top-left
            while(vr > 0 && board[vr-1][vc] === vid) vr--;
            while(vc > 0 && board[vr][vc-1] === vid) vc--;
            
            // Calc w, h
            while(vr+h < size && board[vr+h][vc] === vid) h++;
            while(vc+w < size && board[vr][vc+w] === vid) w++;
            
            // Calculate freedom
            let freedom = 0;
            
            if (w > h) { // Horizontal car
                // Move Left
                for(let k=vc-1; k>=0; k--) {
                     if (board[vr][k] === -1 || board[vr][k] === 0) freedom++;
                     else break; // hit another car or edge
                }
                // Move Right
                for(let k=vc+w; k<size; k++) {
                    if (board[vr][k] === -1 || board[vr][k] === 0) freedom++;
                    else break;
                }
            } else { // Vertical car
                // Move Up
                for(let k=vr-1; k>=0; k--) {
                    if (board[k][vc] === -1 || board[k][vc] === 0) freedom++;
                    else break;
                }
                // Move Down
                for(let k=vr+h; k<size; k++) {
                    if (board[k][vc] === -1 || board[k][vc] === 0) freedom++;
                    else break;
                }
            }
            
            if (freedom !== val) return false;
        }
        return true;
    }

    function extractVehicles(board, size) {
        const vehicles = [];
        const seen = new Set();
        for(let i=0; i<size; i++) {
            for(let j=0; j<size; j++) {
                const id = board[i][j];
                if (id > 0 && !seen.has(id)) {
                    seen.add(id);
                    let w=0, h=0;
                    while(j+w < size && board[i][j+w] === id) w++;
                    while(i+h < size && board[i+h][j] === id) h++;
                    vehicles.push({r:i, c:j, w, h});
                }
            }
        }
        return vehicles;
    }

    init();
});



















