let R = 8;
let C = 8;
let grid = []; // { type: 0(Unknown), 1(Cave), 2(Wall), clue: int|null }

window.onload = () => {
    initGrid();
};

function initGrid() {
    const rIn = parseInt(document.getElementById('rows-in').value);
    const cIn = parseInt(document.getElementById('cols-in').value);
    if (rIn < 4 || rIn > 15 || cIn < 4 || cIn > 15) return;
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

function msg(text) {
    const el = document.getElementById('status-msg');
    if(el) el.textContent = text;
}

function renderGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${C}, var(--cave-cell-size))`;
    
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            const cell = document.createElement('div');
            cell.className = 'cave-cell';
            if (grid[r][c].type === 1) cell.classList.add('cave-marked');
            if (grid[r][c].type === 2) cell.classList.add('wall');
            
            cell.onclick = () => handleCellClick(r, c);
            cell.oncontextmenu = (e) => { e.preventDefault(); handleRightClick(r, c); };
            
            if (grid[r][c].clue !== null) {
                const span = document.createElement('span');
                span.textContent = grid[r][c].clue;
                cell.appendChild(span);
            }
            
            container.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    // Left click: Toggle Wall -> Empty
    // If clue exists, clicking might edit clue?
    // Let's separate: Click empty -> Wall -> Cave -> Empty
    
    // If Clue, it MUST be Cave. So toggle Clue Edit?
    if (grid[r][c].clue !== null) {
        const n = prompt("Enter clue value (or empty to remove):", grid[r][c].clue);
        if (n !== null) {
            grid[r][c].clue = n === "" ? null : parseInt(n);
            // If clue set, enforce Cave
            if (grid[r][c].clue !== null) grid[r][c].type = 1;
        }
    } else {
        // Cycle: 0 -> 2 (Wall) -> 1 (Cave) -> 0
        let t = grid[r][c].type;
        if (t === 0) t = 2;
        else if (t === 2) t = 1;
        else t = 0;
        grid[r][c].type = t;
    }
    renderGrid();
}

function handleRightClick(r, c) {
    // Add/Remove Clue? Or Toggle State?
    // Let's make Right Click = Input Clue
    const n = prompt("Enter clue value (or empty to remove):", grid[r][c].clue !== null ? grid[r][c].clue : "");
    if (n !== null) {
        grid[r][c].clue = n === "" ? null : parseInt(n);
        if (grid[r][c].clue !== null) grid[r][c].type = 1; // Clues are always cave
    }
    renderGrid();
}

// --- Solver ---

async function solvePuzzle() {
    msg("SOLVING...");
    document.getElementById('loading-overlay').style.display = 'flex';
    await new Promise(r => setTimeout(r, 100));

    // 1. Identify Clues
    const clues = [];
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (grid[r][c].clue !== null) {
                clues.push({r, c, val: grid[r][c].clue});
            }
        }
    }

    // 2. Solve
    // Grid: 0=Unknown, 1=Cave, 2=Wall
    // Initialize grid based on clues (Clues must be Cave=1)
    const solverGrid = grid.map(row => row.map(c => c.clue !== null ? 1 : 0));
    
    const solution = backtrack(solverGrid, 0, clues);
    
    document.getElementById('loading-overlay').style.display = 'none';
    
    if (solution) {
        applySolution(solution);
        msg("SOLVED!");
    } else {
        msg("NO SOLUTION FOUND");
    }
}

function applySolution(sol) {
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            grid[r][c].type = sol[r][c];
        }
    }
    renderGrid();
}

function backtrack(g, idx, clues) {
    if (idx === R * C) {
        if (checkConstraints(g, clues)) return g.map(row => [...row]);
        return null;
    }

    const r = Math.floor(idx / C);
    const c = idx % C;

    // If already set (e.g. clue), skip
    if (g[r][c] !== 0) {
        return backtrack(g, idx + 1, clues);
    }

    // Try Wall (2) then Cave (1)
    // Order heuristic: Walls might be more constrained?
    
    // Try Wall (2)
    g[r][c] = 2;
    if (checkPartial(g, r, c)) {
        const res = backtrack(g, idx + 1, clues);
        if (res) return res;
    }

    // Try Cave (1)
    g[r][c] = 1;
    if (checkPartial(g, r, c)) {
        const res = backtrack(g, idx + 1, clues);
        if (res) return res;
    }

    g[r][c] = 0;
    return null;
}

function checkPartial(g, r, c) {
    // Optional optimizations: 
    // 1. 2x2 Checkerboard of Wall/Cave? No specific rule.
    // 2. Clue visibility limit check?
    return true;
}

function checkConstraints(g, clues) {
    // 1. All Cave cells connected
    let caveCells = [];
    let wallCells = [];
    for(let r=0; r<R; r++) for(let c=0; c<C; c++) {
        if (g[r][c] === 1) caveCells.push({r,c});
        else wallCells.push({r,c});
    }

    if (caveCells.length === 0) return false; // Impossible with clues
    
    if (!isConnected(g, caveCells[0], 1, caveCells.length)) return false;

    // 2. All Wall cells connected to Edge
    // Check each wall cell: can it reach edge via walls?
    // OR: All Walls are connected to "Outside".
    // Union-Find for walls + "Outside" node.
    // Easier: BFS from all edge walls. If count visited walls == total walls, then OK.
    
    let edgeWalls = [];
    for(let w of wallCells) {
        if (w.r === 0 || w.r === R-1 || w.c === 0 || w.c === C-1) {
            edgeWalls.push(w);
        }
    }
    
    // If there are walls but no edge walls, fail.
    if (wallCells.length > 0 && edgeWalls.length === 0) return false;
    
    if (wallCells.length > 0) {
        // BFS from edgeWalls
        let visited = new Set();
        let q = [...edgeWalls];
        for(let w of edgeWalls) visited.add(`${w.r},${w.c}`);
        
        let count = 0;
        while(q.length) {
            const {r, c} = q.pop();
            count++;
            
            const nbors = [[r-1,c], [r+1,c], [r,c-1], [r,c+1]];
            for(let [nr, nc] of nbors) {
                if (nr>=0 && nr<R && nc>=0 && nc<C && g[nr][nc] === 2 && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    q.push({r:nr, c:nc});
                }
            }
        }
        
        if (count !== wallCells.length) return false; // Some walls are isolated inside
    }

    // 3. Check Clues
    for(let clue of clues) {
        // Count visible cave cells from (clue.r, clue.c)
        // Directions: U, D, L, R until Wall or Edge
        let count = 0;
        // Up
        for(let y=clue.r; y>=0; y--) { if(g[y][clue.c]===1) count++; else break; }
        // Down
        for(let y=clue.r+1; y<R; y++) { if(g[y][clue.c]===1) count++; else break; }
        // Left
        for(let x=clue.c-1; x>=0; x--) { if(g[clue.r][x]===1) count++; else break; }
        // Right
        for(let x=clue.c+1; x<C; x++) { if(g[clue.r][x]===1) count++; else break; }
        
        if (count !== clue.val) return false;
    }

    return true;
}

function isConnected(g, start, type, totalCount) {
    let q = [start];
    let visited = new Set([`${start.r},${start.c}`]);
    let count = 0;
    while(q.length) {
        const {r, c} = q.pop();
        count++;
        const nbors = [[r-1,c], [r+1,c], [r,c-1], [r,c+1]];
        for(let [nr, nc] of nbors) {
            if (nr>=0 && nr<R && nc>=0 && nc<C && g[nr][nc] === type && !visited.has(`${nr},${nc}`)) {
                visited.add(`${nr},${nc}`);
                q.push({r:nr, c:nc});
            }
        }
    }
    return count === totalCount;
}
























