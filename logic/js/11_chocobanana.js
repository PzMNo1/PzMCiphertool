let R = 8;
let C = 8;
let grid = []; // { type: 0(Unknown), 1(Choco), 2(Banana), clue: int|null }

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
    container.style.gridTemplateColumns = `repeat(${C}, var(--cb-cell-size))`;
    
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            const cell = document.createElement('div');
            cell.className = 'cb-cell';
            if (grid[r][c].type === 1) cell.classList.add('choco');
            if (grid[r][c].type === 2) cell.classList.add('banana');
            
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
    // If clue, toggle type only? Clue can be Choco OR Banana.
    // Click: Cycle 0 -> 1(Choco) -> 2(Banana) -> 0
    let t = grid[r][c].type;
    t = (t + 1) % 3;
    grid[r][c].type = t;
    renderGrid();
}

function handleRightClick(r, c) {
    const n = prompt("Enter area size (or empty to remove):", grid[r][c].clue !== null ? grid[r][c].clue : "");
    if (n !== null) {
        grid[r][c].clue = n === "" ? null : parseInt(n);
    }
    renderGrid();
}

// --- Solver ---

async function solvePuzzle() {
    msg("SOLVING...");
    document.getElementById('loading-overlay').style.display = 'flex';
    await new Promise(r => setTimeout(r, 100));

    const clues = [];
    for(let r=0; r<R; r++) for(let c=0; c<C; c++) if(grid[r][c].clue !== null) clues.push({r,c,val:grid[r][c].clue});

    // If user preset some cells (without clues), we keep them? 
    // Let's assume solver overwrites non-clue cells unless fixed.
    // For now, clear grid types.
    const solverGrid = grid.map(row => row.map(c => 0)); // 0=Unknown

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
        if (checkGlobalConstraints(g, clues)) return g.map(r => [...r]);
        return null;
    }

    const r = Math.floor(idx / C);
    const c = idx % C;
    
    // Try Choco (1) then Banana (2)
    for (let t of [1, 2]) {
        g[r][c] = t;
        // Basic partial check? 
        // Maybe check if we formed a non-rectangular Choco?
        // Or a rectangular Banana?
        // Hard to check partially without regions.
        // Let's try full backtrack for small grids (8x8 is fine).
        const res = backtrack(g, idx + 1, clues);
        if (res) return res;
    }
    
    g[r][c] = 0;
    return null;
}

function checkGlobalConstraints(g, clues) {
    // 1. Find all regions
    const regions = findRegions(g);
    
    // 2. Check Clues
    // Each clue must be in a region of size clue.val
    for(let cl of clues) {
        // Find region containing clue
        const reg = regions.find(reg => reg.cells.some(cell => cell.r === cl.r && cell.c === cl.c));
        if (!reg) return false; // Should not happen
        if (reg.cells.length !== cl.val) return false;
    }
    
    // 3. Choco (Type 1) must be Rectangle
    // 4. Banana (Type 2) must be Non-Rectangle
    for(let reg of regions) {
        const isChoco = (reg.type === 1);
        const isRect = checkIsRectangle(reg.cells);
        
        if (isChoco && !isRect) return false;
        if (!isChoco && isRect) return false;
    }
    
    // 5. Banana Connectivity? 
    // "All non-shaded areas must be connected" ? No, Chocobanana rule:
    // "Shade some cells black (Chocolate). Black cells form rectangles."
    // "White cells (Banana) form non-rectangular shapes."
    // Standard Chocobanana does NOT require all white to be connected globally.
    // It just defines regions.
    // Wait, let me check rules.
    // "Paint some cells black. Black cells form rectangles. White regions are not rectangles."
    // Usually no global connectivity required unless specified.
    // The python solver `chocobanana.py` uses `utils.regions`.
    // It doesn't seem to enforce global white connectivity.
    
    return true;
}

function findRegions(g) {
    const visited = new Set();
    const regions = [];
    
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (!visited.has(`${r},${c}`)) {
                const type = g[r][c];
                const cells = [];
                const q = [{r,c}];
                visited.add(`${r},${c}`);
                
                while(q.length) {
                    const curr = q.pop();
                    cells.push(curr);
                    const nbors = [[curr.r-1,curr.c], [curr.r+1,curr.c], [curr.r,curr.c-1], [curr.r,curr.c+1]];
                    for(let [nr, nc] of nbors) {
                        if (nr>=0 && nr<R && nc>=0 && nc<C && g[nr][nc] === type && !visited.has(`${nr},${nc}`)) {
                            visited.add(`${nr},${nc}`);
                            q.push({r:nr, c:nc});
                        }
                    }
                }
                regions.push({type, cells});
            }
        }
    }
    return regions;
}

function checkIsRectangle(cells) {
    // Find bounds
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for(let c of cells) {
        minR = Math.min(minR, c.r);
        maxR = Math.max(maxR, c.r);
        minC = Math.min(minC, c.c);
        maxC = Math.max(maxC, c.c);
    }
    
    const height = maxR - minR + 1;
    const width = maxC - minC + 1;
    
    return cells.length === height * width;
}
























