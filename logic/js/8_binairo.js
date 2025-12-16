let R = 10;
let C = 10;
let grid = []; // Array of rows. Each cell: { val: 0|1|null, fixed: bool }
// 0 = White, 1 = Black

window.onload = () => {
    initGrid();
};

function initGrid() {
    const rIn = parseInt(document.getElementById('rows-in').value);
    const cIn = parseInt(document.getElementById('cols-in').value);
    
    // Ensure even dimensions
    if (rIn % 2 !== 0 || cIn % 2 !== 0) {
        msg("ERROR: Dimensions must be even numbers!");
        return;
    }
    
    R = rIn; C = cIn;
    
    grid = [];
    for(let r=0; r<R; r++) {
        let row = [];
        for(let c=0; c<C; c++) {
            row.push({ val: null, fixed: false });
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
    container.style.gridTemplateColumns = `repeat(${C}, var(--bi-cell-size))`;
    
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            const cell = document.createElement('div');
            cell.className = 'bi-cell';
            if (grid[r][c].fixed) cell.classList.add('fixed');
            
            cell.onclick = () => handleCellClick(r, c);
            cell.oncontextmenu = (e) => { e.preventDefault(); handleRightClick(r, c); };
            
            const val = grid[r][c].val;
            if (val !== null) {
                const circle = document.createElement('div');
                circle.className = `bi-circle val-${val}`;
                cell.appendChild(circle);
            }
            
            container.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    // Cycle: null -> 0 (White) -> 1 (Black) -> null
    // If fixed, toggle fixed status? No, fixed usually means initial clue.
    // Let's say in edit mode (default):
    // Left click: Cycle White -> Black -> Empty
    // Right click: Toggle Fixed (Lock)
    
    let v = grid[r][c].val;
    if (v === null) v = 0;
    else if (v === 0) v = 1;
    else v = null;
    
    grid[r][c].val = v;
    grid[r][c].fixed = false; // Reset fixed if manually changed
    renderGrid();
}

function handleRightClick(r, c) {
    // Toggle fixed status for solver
    if (grid[r][c].val !== null) {
        grid[r][c].fixed = !grid[r][c].fixed;
        renderGrid();
    }
}

function clearGridState() {
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (!grid[r][c].fixed) {
                grid[r][c].val = null;
            }
        }
    }
    renderGrid();
    msg("CLEARED (KEPT FIXED)");
}

// --- Solver ---

async function solvePuzzle() {
    msg("SOLVING...");
    document.getElementById('loading-overlay').style.display = 'flex';
    
    await new Promise(r => setTimeout(r, 100));
    
    // Prepare solver grid
    // Copy fixed values.
    // We need to fill the grid such that:
    // 1. No more than 2 consecutive same colors in any row/col.
    // 2. Rows and Cols have equal number of 0s and 1s.
    // 3. No duplicate rows or cols (Unique).
    
    const solverGrid = grid.map(row => row.map(c => c.val));
    const solution = backtrack(solverGrid, 0, 0);
    
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
            grid[r][c].val = sol[r][c];
        }
    }
    renderGrid();
}

function backtrack(g, r, c) {
    // Base case: Filled all
    if (r === R) {
        if (checkUnique(g)) return g;
        return null;
    }
    
    // Next cell
    let nextR = r, nextC = c + 1;
    if (nextC === C) {
        nextR = r + 1;
        nextC = 0;
    }
    
    // If fixed/already set
    if (g[r][c] !== null) {
        // Validate placement
        if (!isValid(g, r, c, g[r][c])) return null;
        return backtrack(g, nextR, nextC);
    }
    
    // Try 0 and 1
    // Heuristic: check valid counts first
    for (let val of [0, 1]) {
        if (isValid(g, r, c, val)) {
            g[r][c] = val;
            const res = backtrack(g, nextR, nextC);
            if (res) return res;
            g[r][c] = null;
        }
    }
    
    return null;
}

function isValid(g, r, c, val) {
    // 1. Consecutive Check
    // Row: check (r, c-1) and (r, c-2)
    if (c >= 2) {
        if (g[r][c-1] === val && g[r][c-2] === val) return false;
    }
    // Col: check (r-1, c) and (r-2, c)
    if (r >= 2) {
        if (g[r-1][c] === val && g[r-2][c] === val) return false;
    }
    
    // 2. Count Check (Balance)
    // Count so far in row
    let countRow = 0;
    for(let k=0; k<c; k++) if (g[r][k] === val) countRow++;
    if (val === val) countRow++; // include self
    if (countRow > C/2) return false;
    
    // Count so far in col
    let countCol = 0;
    for(let k=0; k<r; k++) if (g[k][c] === val) countCol++;
    if (val === val) countCol++; // include self
    if (countCol > R/2) return false;
    
    // Pruning: If remaining cells aren't enough to reach C/2 or R/2?
    // Current filled in row is c+1. Remaining: C - (c+1).
    // Current count of val: countRow.
    // Max possible count = countRow + (C - 1 - c).
    // If Max < C/2, then impossible.
    // But we only need EXACTLY C/2 at the end.
    // If we filled the row (c == C-1), we check countRow == C/2.
    if (c === C - 1) {
        if (countRow !== C/2) return false;
    }
    if (r === R - 1) {
        // Need to check full column count
        // But backtrack fills row by row.
        // So when we are at the last row, we are completing the column 'c'.
        if (countCol !== R/2) return false;
    }
    
    return true;
}

function checkUnique(g) {
    // Check Rows
    const rows = new Set();
    for(let r=0; r<R; r++) {
        const s = g[r].join('');
        if (rows.has(s)) return false;
        rows.add(s);
    }
    
    // Check Cols
    const cols = new Set();
    for(let c=0; c<C; c++) {
        let s = '';
        for(let r=0; r<R; r++) s += g[r][c];
        if (cols.has(s)) return false;
        cols.add(s);
    }
    return true;
}
























