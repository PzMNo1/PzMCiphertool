let R = 8;
let C = 8;
let grid = []; // Array of { type: 0, clue: null }
// clue: { color: 'w'|'b', val: number|null }
// type: 0=empty, 1=│, 2=─, 3=└, 4=┘, 5=┐, 6=┌

let currentMode = 'clue_white'; // clue_white, clue_black, line
let foundSolutions = [];
let currentSolIndex = 0;

const SHAPES = {
    0: { u:0, r:0, d:0, l:0, name: '' },
    1: { u:1, r:0, d:1, l:0, name: '│' },
    2: { u:0, r:1, d:0, l:1, name: '─' },
    3: { u:1, r:1, d:0, l:0, name: '└' },
    4: { u:1, r:0, d:0, l:1, name: '┘' },
    5: { u:0, r:0, d:1, l:1, name: '┐' },
    6: { u:0, r:1, d:1, l:0, name: '┌' }
};

// DOM Elements
const gridContainer = document.getElementById('grid-container');
const msgEl = document.getElementById('status-msg');

window.onload = () => {
    initGrid();
};

function initGrid() {
    const rIn = parseInt(document.getElementById('rows-in').value);
    const cIn = parseInt(document.getElementById('cols-in').value);
    if (rIn < 2 || rIn > 15 || cIn < 2 || cIn > 15) return;
    R = rIn; C = cIn;
    
    grid = [];
    for(let r=0; r<R; r++) {
        let row = [];
        for(let c=0; c<C; c++) {
            row.push({ type: 0, clue: null });
        }
        grid.push(row);
    }
    
    renderGrid();
    msg("READY");
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-opt').forEach(el => el.classList.remove('active'));
    document.getElementById(`mode-${mode}`).classList.add('active');
}

function msg(text) {
    if(msgEl) msgEl.textContent = text;
}

function renderGrid() {
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${C}, var(--bl-cell-size))`;

    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            const cell = document.createElement('div');
            cell.className = 'bl-cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.onclick = () => handleCellClick(r, c);
            cell.oncontextmenu = (e) => { e.preventDefault(); handleRightClick(r, c); };

            // Draw Clue
            if (grid[r][c].clue) {
                const clueDiv = document.createElement('div');
                clueDiv.className = `bl-clue ${grid[r][c].clue.color === 'w' ? 'white' : 'black'}`;
                if (grid[r][c].clue.val !== null) {
                    clueDiv.textContent = grid[r][c].clue.val;
                }
                cell.appendChild(clueDiv);
            }

            // Draw Line
            const type = grid[r][c].type;
            if (type > 0) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.classList.add('bl-line-svg');
                svg.setAttribute('viewBox', '0 0 100 100');
                
                let pathD = "";
                const s = SHAPES[type];
                const mid = 50;
                
                if(s.u) pathD += `M${mid},${mid} L${mid},0 `;
                if(s.r) pathD += `M${mid},${mid} L100,${mid} `;
                if(s.d) pathD += `M${mid},${mid} L${mid},100 `;
                if(s.l) pathD += `M${mid},${mid} L0,${mid} `;
                
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute('d', pathD);
                path.classList.add('bl-line');
                svg.appendChild(path);
                cell.appendChild(svg);
            }
            
            gridContainer.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    if (currentMode.startsWith('clue')) {
        // Toggle clue
        const color = currentMode === 'clue_white' ? 'w' : 'b';
        if (grid[r][c].clue && grid[r][c].clue.color === color) {
            // If same color, cycle number/clear?
            // Simple interaction: click to set color. 
            // To set number, maybe prompt? Or cycle?
            // Let's implement: click -> set color. 
            // If already set, prompt for number.
            const val = prompt("Enter number (or leave empty):");
            const num = val ? parseInt(val) : null;
            if (!isNaN(num) || val === '') {
                 grid[r][c].clue.val = isNaN(num) ? null : num;
            }
        } else {
            grid[r][c].clue = { color: color, val: null };
        }
    } else if (currentMode === 'line') {
        // Cycle line types
        grid[r][c].type = (grid[r][c].type + 1) % 7;
    } else if (currentMode === 'clear') {
        grid[r][c].type = 0;
        grid[r][c].clue = null;
    }
    renderGrid();
}

function handleRightClick(r, c) {
    // Quick clear cell
    grid[r][c].type = 0;
    grid[r][c].clue = null;
    renderGrid();
}

function clearGridState() {
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            grid[r][c].type = 0;
        }
    }
    renderGrid();
    msg("CLEARED LINES");
}

function clearAll() {
    initGrid();
}

// --- Solver ---

async function solvePuzzle() {
    msg("SOLVING...");
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Clear previous lines
    for(let r=0; r<R; r++) for(let c=0; c<C; c++) grid[r][c].type = 0;
    
    foundSolutions = [];
    
    // Small delay to show loading
    await new Promise(r => setTimeout(r, 100));
    
    const solution = backtrack(0, 0);
    
    document.getElementById('loading-overlay').style.display = 'none';
    
    if (solution) {
        foundSolutions.push(solution);
        applySolution(solution);
        msg("SOLVED!");
    } else {
        msg("NO SOLUTION FOUND");
    }
}

function applySolution(solGrid) {
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            grid[r][c].type = solGrid[r][c];
        }
    }
    renderGrid();
}

function backtrack(idx) {
    if (idx === R * C) {
        // All cells filled. Validate global loop constraints.
        if (checkGlobalConstraints()) {
            // Deep copy grid types
            return grid.map(row => row.map(cell => cell.type));
        }
        return null;
    }

    const r = Math.floor(idx / C);
    const c = idx % C;
    
    // Domain pruning based on neighbors
    // Neighbors: Up (r-1, c), Left (r, c-1) are already set.
    
    let validShapes = [];
    
    // Determine required connections from Up and Left
    const upReq = (r > 0) && SHAPES[grid[r-1][c].type].d;
    const leftReq = (c > 0) && SHAPES[grid[r][c-1].type].r;
    
    // Boundary constraints
    const isTop = (r === 0);
    const isBottom = (r === R - 1);
    const isLeft = (c === 0);
    const isRight = (c === C - 1);
    
    for (let t = 0; t <= 6; t++) {
        const s = SHAPES[t];
        
        // 1. Match Up
        if (isTop) {
            if (s.u) continue; // Cannot go up
        } else {
            if (!!s.u !== !!upReq) continue; // Must match neighbor
        }
        
        // 2. Match Left
        if (isLeft) {
            if (s.l) continue; // Cannot go left
        } else {
            if (!!s.l !== !!leftReq) continue; // Must match neighbor
        }
        
        // 3. Boundary Right/Bottom check (Optimization)
        if (isRight && s.r) continue;
        if (isBottom && s.d) continue;
        
        // 4. Clue Constraint (Local Check)
        // If this cell has a clue, it MUST be part of the loop (type != 0)
        if (grid[r][c].clue && t === 0) continue;
        
        // 5. Clue Logic (Partial check not easy here, checking later)
        
        validShapes.push(t);
    }
    
    for (let type of validShapes) {
        grid[r][c].type = type;
        
        // Check Clues Locally if possible?
        // We can check clues at (r, c) only if we know full lengths. We don't know yet.
        // But we can check COMPLETED clues (clues where all legs have ended).
        // This is complex. Let's rely on global check at end for now (slow but correct).
        // Or maybe check "local consistency" if possible.
        
        const res = backtrack(idx + 1);
        if (res) return res;
    }
    
    grid[r][c].type = 0; // Backtrack
    return null;
}

function checkGlobalConstraints() {
    // 1. Check Clues
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (grid[r][c].clue) {
                if (grid[r][c].type === 0) return false; // Should be covered by backtrack, but safety
                if (!checkClue(r, c)) return false;
            }
        }
    }
    
    // 2. Single Loop Check
    // Must form exactly one closed loop. No isolated loops.
    // All non-empty cells must be part of the single loop.
    
    let visited = Array(R).fill(0).map(() => Array(C).fill(false));
    let loopCount = 0;
    let nonEmptyCount = 0;
    
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (grid[r][c].type !== 0) nonEmptyCount++;
        }
    }
    
    if (nonEmptyCount === 0) return false; // Empty grid not allowed if clues exist (checked above)
    
    // Find first non-empty
    let startNode = null;
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (grid[r][c].type !== 0) {
                startNode = {r, c};
                break;
            }
        }
        if (startNode) break;
    }
    
    // Traverse loop
    let q = [startNode];
    visited[startNode.r][startNode.c] = true;
    let visitedCount = 0;
    
    while(q.length) {
        const {r, c} = q.pop();
        visitedCount++;
        const s = SHAPES[grid[r][c].type];
        
        // Neighbors
        const neighbors = [
            {dr: -1, dc: 0, connect: s.u},
            {dr: 1, dc: 0, connect: s.d},
            {dr: 0, dc: -1, connect: s.l},
            {dr: 0, dc: 1, connect: s.r}
        ];
        
        for(let n of neighbors) {
            if (n.connect) {
                const nr = r + n.dr;
                const nc = c + n.dc;
                if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc].type !== 0 && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    q.push({r: nr, c: nc});
                }
            }
        }
    }
    
    // If visitedCount != nonEmptyCount, we have disjoint pieces -> Invalid
    if (visitedCount !== nonEmptyCount) return false;
    
    // Also need to check degree of every node is 2 (implicit by shapes 1-6 having 2 exits)
    // And check no "dangling" ends? Shapes 1-6 all have 2 exits.
    // So if grid matches neighbors, it must be a collection of loops.
    // visitedCount == nonEmptyCount ensures it's a SINGLE component.
    // So yes, it is a single loop.
    
    return true;
}

function checkClue(r, c) {
    const clue = grid[r][c].clue;
    const s = SHAPES[grid[r][c].type];
    
    // Directions: U, R, D, L
    // Count straight lengths in each direction
    
    const lens = { u:0, r:0, d:0, l:0 };
    
    // Up
    if (s.u) {
        let len = 0;
        for(let i=r-1; i>=0; i--) {
            if (grid[i][c].type === 1 || grid[i][c].type === 2) { // 1=| (Straight V), 2=- (Straight H)
                 // Wait, straight means STRAIGHT line. 
                 // If direction is Up, we continue as long as we see '|' (type 1) OR '+' (type ? no crossing).
                 // Balanceloop: "Straight loop cells".
                 // If we are moving Up, the cell must have Up and Down connections (vertical straight).
                 if (SHAPES[grid[i][c].type].u && SHAPES[grid[i][c].type].d) { // Type 1 (|)
                     // Is it straight? Yes.
                     // BUT, the Python code says:
                     // is_straight = var_in(ls.grid[y][x], STRAIGHT) where STRAIGHT=['-', '1']
                     // And checks direction.
                     // If we are going Up, does a '-' count? No, '-' is Horizontal.
                     // So for Up direction, only '|' counts as straight continuation?
                     // No, the python code counts "straight loop cells".
                     // It checks `grid[y][x]` in `STRAIGHT` (1 or 2).
                     // And `grid[y][x]` in `TURNING`.
                     // It stops at a turn?
                     // Python:
                     // count[direction] += is_straight & ~has_found_bend
                     // has_found_bend |= is_bend
                     // So it counts straight pieces (1 or 2) UNTIL a bend is found.
                     // Wait, does it include the clue cell itself? The loop starts at r,c (the clue).
                     // The loop shapes at r,c determines which legs exist.
                     // E.g. if clue is 'L' (Up, Right).
                     // We count 'u' leg and 'r' leg.
                     // Going Up: count cells (y, c) for y in r-1 down to 0.
                     // If cell is Straight (1 or 2), add to count IF not found bend yet.
                     // If cell is Turn, mark found bend.
                     // Note: if cell is straight but orthogonal (e.g. '-' when going up), that's impossible in a valid loop 
                     // because '-' doesn't connect Up/Down.
                     // So effectively: Count number of '|' cells immediately above, before the first turn.
                 }
             }
        }
    }
    // Re-reading Python:
    // STRAIGHT = ['-', '1'] (Horizontal, Vertical)
    // TURNING = ['J', '7', 'L', 'r']
    // count[dir] starts at 1 (the clue cell itself? No, Python `IntVar(1)`).
    // Loop `for y in range(r-1, -1, -1)`:
    //    is_straight = grid in STRAIGHT
    //    is_bend = grid in TURNING
    //    count += (is_straight & !found_bend)
    //    found_bend |= is_bend
    // So it includes the straight segments extending out.
    // AND it initializes `count` to 1. This implies the leg length includes the segment "leaving" the clue?
    // Or maybe it just counts the cells *adjacent*?
    // If I have Clue(L) -> | -> | -> 7
    // The Up leg has length: 1 (base) + 1 (|) + 1 (|) = 3? 
    // The '7' is a turn, so it stops counting. '7' is NOT straight.
    // So it counts the sequence of straight pipes.
    
    function countDir(dr, dc) {
        let count = 0;
        let currR = r + dr;
        let currC = c + dc;
        while(currR >= 0 && currR < R && currC >= 0 && currC < C) {
            const type = grid[currR][currC].type;
            // Straight types: 1 (|) and 2 (-)
            // Depending on direction, only one is valid for connection, but the constraint is just "is straight".
            // Since we enforce connection validness elsewhere, we just check if type is 1 or 2.
            if (type === 1 || type === 2) {
                count++;
                currR += dr;
                currC += dc;
            } else {
                break; // Stop at turn or empty
            }
        }
        return count;
    }
    
    if (s.u) lens.u = countDir(-1, 0);
    if (s.d) lens.d = countDir(1, 0);
    if (s.l) lens.l = countDir(0, -1);
    if (s.r) lens.r = countDir(0, 1);
    
    // Note: Python starts count at 1. So let's add 1 to our counts?
    // Yes, `count = {direction: IntVar(1) ...}`
    // So length = number of straight pipe cells + 1 (for the edge leaving the clue?). 
    // Actually, if the clue cell itself is a Turn (e.g. L), the leg starts immediately.
    // If the clue cell is Straight (e.g. |), does it count itself?
    // Python `shape_to_counts` maps 'L' to (count['u'], count['r']).
    // If clue is 'L', it compares Up and Right counts.
    // If clue is '|', it compares Up and Down counts.
    // The counts represent the length of the straight segment in that direction.
    // So `lens.u + 1` is the value to use?
    
    const vals = [];
    if (s.u) vals.push(lens.u + 1);
    if (s.d) vals.push(lens.d + 1);
    if (s.l) vals.push(lens.l + 1);
    if (s.r) vals.push(lens.r + 1);
    
    // Wait, shape has exactly 2 directions.
    // White: x == y
    // Black: x != y
    // Num: x + y == num
    
    const v1 = vals[0];
    const v2 = vals[1];
    
    if (clue.color === 'w') {
        if (v1 !== v2) return false;
    } else if (clue.color === 'b') {
        if (v1 === v2) return false;
    }
    
    if (clue.val !== null) {
        if (v1 + v2 !== clue.val) return false;
    }
    
    return true;
}
























