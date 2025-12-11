const FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
let R = 10;
let C = 10;
let rowClues = []; // Numbers
let colClues = []; // Numbers
let gridHints = []; // Array of Arrays: null, 'w', 'c' (circle), 't' (top), 'b' (bottom), 'l', 'r', 'm' (middle)
// Hint types mapping to UI
const HINT_TYPES = [null, 'w', 'o', 't', 'b', 'l', 'r', 'm'];
const HINT_SYMBOLS = {'w':'•', 'o':'○', 't':'^', 'b':'v', 'l':'<', 'r':'>', 'm':'□'};

let currentHintTool = 'w'; // Selected tool
let foundSolutions = [];
let currentSolIndex = 0;

// DOM
const gridContainer = document.getElementById('grid-container');

window.onload = () => {
    initGrid();
};

function initGrid() {
    const rIn = parseInt(document.getElementById('rows-in').value);
    const cIn = parseInt(document.getElementById('cols-in').value);
    if (rIn < 5 || rIn > 15 || cIn < 5 || cIn > 15) return; // Minimum size for fleet
    R = rIn; C = cIn;
    
    rowClues = Array(R).fill(null);
    colClues = Array(C).fill(null);
    gridHints = Array(R).fill(0).map(() => Array(C).fill(null));
    
    renderGrid();
    msg("FLEET ADMIRAL READY");
}

function msg(text) {
    const el = document.getElementById('status-msg');
    if(el) el.textContent = text;
}

function setTool(tool) {
    currentHintTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tool-${tool}`).classList.add('active');
}

function renderGrid() {
    gridContainer.innerHTML = '';
    // Grid Layout: (C+1) columns. First col for row clues. First row for col clues.
    gridContainer.style.gridTemplateColumns = `var(--bs-cell-size) repeat(${C}, var(--bs-cell-size))`;
    
    // 1. Top Row (Corner + Col Clues)
    const corner = document.createElement('div');
    gridContainer.appendChild(corner);
    
    for(let c=0; c<C; c++) {
        const div = document.createElement('div');
        div.className = 'bs-clue-outer';
        const input = document.createElement('input');
        input.className = 'bs-input-outer';
        input.value = colClues[c] === null ? '' : colClues[c];
        input.onchange = (e) => {
            const v = parseInt(e.target.value);
            colClues[c] = isNaN(v) ? null : v;
        };
        div.appendChild(input);
        gridContainer.appendChild(div);
    }
    
    // 2. Rows
    for(let r=0; r<R; r++) {
        // Row Clue
        const clueDiv = document.createElement('div');
        clueDiv.className = 'bs-clue-outer';
        const input = document.createElement('input');
        input.className = 'bs-input-outer';
        input.value = rowClues[r] === null ? '' : rowClues[r];
        input.onchange = (e) => {
            const v = parseInt(e.target.value);
            rowClues[r] = isNaN(v) ? null : v;
        };
        clueDiv.appendChild(input);
        gridContainer.appendChild(clueDiv);
        
        // Cells
        for(let c=0; c<C; c++) {
            const cell = document.createElement('div');
            cell.className = 'bs-cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.onclick = () => handleCellClick(r, c);
            cell.oncontextmenu = (e) => { e.preventDefault(); handleRightClick(r, c); };
            
            // Render Hint
            const h = gridHints[r][c];
            if (h) {
                const inner = document.createElement('div');
                inner.className = 'bs-clue';
                if (h === 'w') {
                    inner.classList.add('bs-marker-water');
                } else {
                    inner.textContent = HINT_SYMBOLS[h] || h;
                    inner.style.fontSize = '1.5rem';
                    inner.style.color = 'white';
                }
                cell.appendChild(inner);
            }
            
            gridContainer.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    if (currentHintTool) {
        if (gridHints[r][c] === currentHintTool) {
            gridHints[r][c] = null;
        } else {
            gridHints[r][c] = currentHintTool;
        }
        renderGrid();
    }
}

function handleRightClick(r, c) {
    gridHints[r][c] = null;
    renderGrid();
}

// --- Solver ---

async function solvePuzzle() {
    msg("DEPLOYING FLEET...");
    document.getElementById('loading-overlay').style.display = 'flex';
    foundSolutions = [];
    
    await new Promise(r => setTimeout(r, 100));
    
    const grid = Array(R).fill(0).map(() => Array(C).fill(0)); // 0=Empty, 1=Ship
    
    // Pre-validate hints against fleet?
    // Complex. Let's just run backtrack.
    
    const solution = backtrack(grid, 0);
    
    document.getElementById('loading-overlay').style.display = 'none';
    
    if (solution) {
        msg("FLEET DEPLOYED SUCCESSFULLY");
        applySolution(solution);
    } else {
        msg("MISSION FAILED: IMPOSSIBLE CONFIGURATION");
    }
}

function applySolution(grid) {
    // Convert grid (1s and 0s) to specific ship shapes for display
    // We can just reuse renderGrid but we need to overlay the ship shapes.
    // Or update gridHints to show the ships? No, hints are inputs.
    // We should render the solution state.
    // Let's add a 'solution' layer or modify renderGrid to accept an optional solution grid.
    
    // Let's compute shapes.
    const shapes = Array(R).fill(0).map(() => Array(C).fill(null));
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (grid[r][c] === 1) {
                const u = (r>0 && grid[r-1][c]===1);
                const d = (r<R-1 && grid[r+1][c]===1);
                const l = (c>0 && grid[r][c-1]===1);
                const ri = (c<C-1 && grid[r][c+1]===1);
                
                if (!u && !d && !l && !ri) shapes[r][c] = 'circle';
                else if (!u && d) shapes[r][c] = 'top';
                else if (u && !d) shapes[r][c] = 'bottom';
                else if (!l && ri) shapes[r][c] = 'left';
                else if (l && !ri) shapes[r][c] = 'right';
                else shapes[r][c] = 'middle';
            } else {
                shapes[r][c] = 'water';
            }
        }
    }
    
    // Render
    const cells = document.querySelectorAll('.bs-cell');
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        cell.innerHTML = ''; // Clear hints
        
        if (shapes[r][c] === 'water') {
            const div = document.createElement('div');
            div.className = 'bs-clue bs-marker-water';
            cell.appendChild(div);
        } else {
            const div = document.createElement('div');
            div.className = `bs-clue bs-ship ${shapes[r][c]}`;
            cell.appendChild(div);
        }
    });
}

function backtrack(grid, shipIdx) {
    if (shipIdx === FLEET.length) {
        // Check if all mandatory clues are satisfied
        if (checkFinalConstraints(grid)) {
            return grid.map(row => [...row]);
        }
        return null;
    }
    
    const len = FLEET[shipIdx];
    
    // Try placing at every position (Horizontal & Vertical)
    // Optimization: Don't re-check same start positions for identical ships if we enforce order?
    // Yes, if FLEET is sorted desc. If fleet[i] == fleet[i-1], start search from prev ship's position.
    // But implementing that state passing is slightly complex. Standard loop is fine for 10x10.
    
    // Optimization: Check remaining capacity vs remaining fleet size.
    
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            // Try Horizontal
            if (canPlace(grid, r, c, len, 'h')) {
                place(grid, r, c, len, 'h', 1);
                const res = backtrack(grid, shipIdx + 1);
                if (res) return res;
                place(grid, r, c, len, 'h', 0); // Undo
            }
            
            // Try Vertical (if len > 1, otherwise same as H)
            if (len > 1 && canPlace(grid, r, c, len, 'v')) {
                place(grid, r, c, len, 'v', 1);
                const res = backtrack(grid, shipIdx + 1);
                if (res) return res;
                place(grid, r, c, len, 'v', 0); // Undo
            }
        }
    }
    return null;
}

function canPlace(grid, r, c, len, orient) {
    // 1. Bounds & Overlap & Touch
    const dr = orient === 'v' ? 1 : 0;
    const dc = orient === 'h' ? 1 : 0;
    
    if (r + (len-1)*dr >= R) return false;
    if (c + (len-1)*dc >= C) return false;
    
    // Check the ship cells and their neighbors
    for(let i=0; i<len; i++) {
        const cr = r + i*dr;
        const cc = c + i*dc;
        
        if (grid[cr][cc] !== 0) return false; // Overlap
        
        // Check 8-neighbors for touch
        for(let nr = cr-1; nr <= cr+1; nr++) {
            for(let nc = cc-1; nc <= cc+1; nc++) {
                if (nr>=0 && nr<R && nc>=0 && nc<C) {
                    // If it's part of the current ship being placed, ignore
                    // The current ship cells are (r+k*dr, c+k*dc) for k=0..len-1
                    // But since we haven't placed it yet, grid is 0.
                    // We just need to check if grid[nr][nc] is 1 (existing ship).
                    if (grid[nr][nc] === 1) return false;
                }
            }
        }
        
        // 2. Hint Constraints (Cell must be compatible)
        const h = gridHints[cr][cc];
        if (h === 'w') return false; // Cannot place on water hint
        
        // Specific shape hints
        if (h) {
            // Determine part type
            let part = 'm'; // default middle
            if (len === 1) part = 'o';
            else {
                if (i === 0) part = orient === 'h' ? 'l' : 't';
                else if (i === len-1) part = orient === 'h' ? 'r' : 'b';
            }
            
            if (h !== part && h !== 'm') { 
                // Allow 'm' hint to match any ship part? 
                // 'm' usually means "middle" (square). 'o' is circle.
                // Actually, 'm' usually means "Ship segment", could be any part? 
                // Python code: 'm' means Middle? No. 
                // Python says: elif value == 'm': ... requires neighbors. It seems 'm' is specifically a middle piece.
                // But user might use generic symbol.
                // Let's be strict: if hint is 't', part MUST be 't'.
                if (h !== part) return false;
            }
        }
    }
    
    // 3. Surroundings Constraints (Must be water)
    // If we place a ship, all adjacent cells (that are not part of this ship) must be water.
    // If any adjacent cell has a Ship Hint, it's invalid.
    for(let i=0; i<len; i++) {
        const cr = r + i*dr;
        const cc = c + i*dc;
        for(let nr = cr-1; nr <= cr+1; nr++) {
            for(let nc = cc-1; nc <= cc+1; nc++) {
                if (nr>=0 && nr<R && nc>=0 && nc<C) {
                    // If it's part of current ship, skip
                    let isSelf = false;
                    // Check if (nr,nc) is in the segment
                    if (orient==='v' && nc===c && nr>=r && nr<r+len) isSelf = true;
                    if (orient==='h' && nr===r && nc>=c && nc<c+len) isSelf = true;
                    
                    if (!isSelf) {
                        // Neighbor must be water.
                        // If hint is Ship Type, fail.
                        const nh = gridHints[nr][nc];
                        if (nh && nh !== 'w') return false;
                    }
                }
            }
        }
    }
    
    // 4. Row/Col Count Checks (Incremental)
    // If we place this ship, do we exceed row/col clues?
    // (Optional optimization)
    
    return true;
}

function place(grid, r, c, len, orient, val) {
    const dr = orient === 'v' ? 1 : 0;
    const dc = orient === 'h' ? 1 : 0;
    for(let i=0; i<len; i++) {
        grid[r + i*dr][c + i*dc] = val;
    }
}

function checkFinalConstraints(grid) {
    // 1. Row/Col Counts
    for(let r=0; r<R; r++) {
        if (rowClues[r] !== null) {
            let count = 0;
            for(let c=0; c<C; c++) if(grid[r][c]===1) count++;
            if (count !== rowClues[r]) return false;
        }
    }
    for(let c=0; c<C; c++) {
        if (colClues[c] !== null) {
            let count = 0;
            for(let r=0; r<R; r++) if(grid[r][c]===1) count++;
            if (count !== colClues[c]) return false;
        }
    }
    
    // 2. All Ship Hints Covered
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (gridHints[r][c] && gridHints[r][c] !== 'w') {
                if (grid[r][c] !== 1) return false;
            }
        }
    }
    
    return true;
}
























