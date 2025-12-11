let R = 8;
let C = 8;
let hBorders = []; // R x C (bottom borders)
let vBorders = []; // R x C (right borders)
let symbols = {}; // "r,c" -> 'moon' | 'sun'
let hEdges = []; // R x (C-1)
let vEdges = []; // (R-1) x C

let currentMode = 'regions'; // regions, symbols, play
let foundSolutions = [];
let currentSolIndex = 0;

const cellSize = 40;

window.onload = () => {
    initGrid();
};

function initGrid(resetData = true) {
    const sizeInput = parseInt(document.getElementById('size').value) || 8;
    R = C = Math.max(4, Math.min(12, sizeInput));
    
    if (resetData) {
        hBorders = Array(R).fill().map(() => Array(C).fill(false));
        vBorders = Array(R).fill().map(() => Array(C).fill(false));
        symbols = {};
        hEdges = Array(R).fill().map(() => Array(C-1).fill(false));
        vEdges = Array(R-1).fill().map(() => Array(C).fill(false));
        
        // Default outer borders
        for(let i=0; i<R; i++) vBorders[i][C-1] = true;
        for(let j=0; j<C; j++) hBorders[R-1][j] = true;
    }
    
    renderGrid();
    updateStatus("GRID INITIALIZED");
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-opt').forEach(el => el.classList.remove('active'));
    document.getElementById(`mode-${mode}`).classList.add('active');
    updateStatus(`MODE: ${mode.toUpperCase()}`);
}

function updateStatus(msg) {
    const el = document.getElementById('status-msg');
    el.textContent = msg;
    el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0.7, 2000);
}

function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${C}, ${cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${R}, ${cellSize}px)`;
    grid.style.width = `${C * cellSize}px`;
    grid.style.height = `${R * cellSize}px`;

    // 1. Cells & Borders & Symbols
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // Borders
            // Logic: if hBorders[r][c] is true, bottom border.
            // if vBorders[r][c] is true, right border.
            // Also top/left if r=0/c=0 or neighbor has border?
            // To simplify: we draw borders on the cell itself.
            
            if (r===0 || (r>0 && hBorders[r-1][c])) cell.classList.add('border-top');
            if (hBorders[r][c]) cell.classList.add('border-bottom');
            if (c===0 || (c>0 && vBorders[r][c-1])) cell.classList.add('border-left');
            if (vBorders[r][c]) cell.classList.add('border-right');
            
            // Symbols
            const key = `${r},${c}`;
            if (symbols[key]) {
                cell.classList.add(symbols[key]);
            }
            
            // Interaction
            cell.onclick = (e) => handleCellClick(r, c, e);
            
            // Handles for region editing
            if (currentMode === 'regions') {
                if (c < C-1) {
                    const handleV = document.createElement('div');
                    handleV.className = 'border-handle-v';
                    handleV.onclick = (e) => { e.stopPropagation(); toggleBorder('v', r, c); };
                    cell.appendChild(handleV);
                }
                if (r < R-1) {
                    const handleH = document.createElement('div');
                    handleH.className = 'border-handle-h';
                    handleH.onclick = (e) => { e.stopPropagation(); toggleBorder('h', r, c); };
                    cell.appendChild(handleH);
                }
            }
            
            grid.appendChild(cell);
        }
    }
    
    // 2. Edges (Overlay)
    // Horizontal
    for(let r=0; r<R; r++) {
        for(let c=0; c<C-1; c++) {
            const edge = document.createElement('div');
            edge.className = 'edge-h';
            if (hEdges[r][c]) edge.classList.add('active');
            edge.style.left = `${(c + 0.5) * cellSize}px`;
            edge.style.top = `${(r + 0.5) * cellSize - 2}px`;
            edge.style.width = `${cellSize}px`;
            edge.onclick = (e) => { e.stopPropagation(); handleEdgeClick('h', r, c); };
            grid.appendChild(edge);
        }
    }
    
    // Vertical
    for(let r=0; r<R-1; r++) {
        for(let c=0; c<C; c++) {
            const edge = document.createElement('div');
            edge.className = 'edge-v';
            if (vEdges[r][c]) edge.classList.add('active');
            edge.style.left = `${(c + 0.5) * cellSize - 2}px`;
            edge.style.top = `${(r + 0.5) * cellSize}px`;
            edge.style.height = `${cellSize}px`;
            edge.onclick = (e) => { e.stopPropagation(); handleEdgeClick('v', r, c); };
            grid.appendChild(edge);
        }
    }
}

function handleCellClick(r, c, e) {
    if (currentMode === 'symbols') {
        const key = `${r},${c}`;
        if (!symbols[key]) symbols[key] = 'moon';
        else if (symbols[key] === 'moon') symbols[key] = 'sun';
        else delete symbols[key];
        renderGrid();
    }
}

function toggleBorder(type, r, c) {
    if (type === 'v') vBorders[r][c] = !vBorders[r][c];
    if (type === 'h') hBorders[r][c] = !hBorders[r][c];
    renderGrid();
}

function handleEdgeClick(type, r, c) {
    if (currentMode === 'play') {
        if (type === 'h') hEdges[r][c] = !hEdges[r][c];
        if (type === 'v') vEdges[r][c] = !vEdges[r][c];
        renderGrid();
    }
}

function clearGrid() {
    initGrid(true);
}

// --- Solver Logic ---

function getRegions() {
    const visited = Array(R).fill().map(() => Array(C).fill(false));
    const regions = [];
    
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (!visited[r][c]) {
                const cells = [];
                const stack = [[r,c]];
                visited[r][c] = true;
                
                while(stack.length) {
                    const [cr, cc] = stack.pop();
                    cells.push({r:cr, c:cc});
                    
                    // Neighbors within border
                    // Up
                    if (cr>0 && !hBorders[cr-1][cc] && !visited[cr-1][cc]) {
                        visited[cr-1][cc] = true; stack.push([cr-1,cc]);
                    }
                    // Down
                    if (cr<R-1 && !hBorders[cr][cc] && !visited[cr+1][cc]) {
                        visited[cr+1][cc] = true; stack.push([cr+1,cc]);
                    }
                    // Left
                    if (cc>0 && !vBorders[cr][cc-1] && !visited[cr][cc-1]) {
                        visited[cr][cc-1] = true; stack.push([cr,cc-1]);
                    }
                    // Right
                    if (cc<C-1 && !vBorders[cr][cc] && !visited[cr][cc+1]) {
                        visited[cr][cc+1] = true; stack.push([cr,cc+1]);
                    }
                }
                regions.push(cells);
            }
        }
    }
    return regions;
}

async function solvePuzzle() {
    updateStatus("SOLVING...");
    const solveBtn = document.querySelector('button.cyber-glow');
    solveBtn.disabled = true;
    
    await new Promise(r => setTimeout(r, 100));
    
    try {
        const regions = getRegions();
        const solH = Array(R).fill(0).map(() => Array(C-1).fill(0));
        const solV = Array(R-1).fill(0).map(() => Array(C).fill(0));
        const solutions = [];
        
        // Heuristic: Sort edges?
        // Let's just use simple backtracking
        const allEdges = [];
        for(let r=0; r<R; r++) for(let c=0; c<C-1; c++) allEdges.push({type:'h', r, c});
        for(let r=0; r<R-1; r++) for(let c=0; c<C; c++) allEdges.push({type:'v', r, c});
        
        function checkValidity() {
             // 1. Degree constraint (0 or 2)
             for(let r=0; r<R; r++) {
                 for(let c=0; c<C; c++) {
                     let deg = 0;
                     if(r>0 && solV[r-1][c]===1) deg++;
                     if(r<R-1 && solV[r][c]===1) deg++;
                     if(c>0 && solH[r][c-1]===1) deg++;
                     if(c<C-1 && solH[r][c]===1) deg++;
                     
                     // If degree is not 0 or 2 -> Fail
                     // Note: In partial solution, degree can be 1. 
                     // But here we call this at leaf node.
                     if (deg !== 0 && deg !== 2) return false;
                 }
             }
             
             // 2. Region constraints
             for(const region of regions) {
                 let visitedCells = [];
                 for(const cell of region) {
                     let deg = 0;
                     const r=cell.r, c=cell.c;
                     if(r>0 && solV[r-1][c]===1) deg++;
                     if(r<R-1 && solV[r][c]===1) deg++;
                     if(c>0 && solH[r][c-1]===1) deg++;
                     if(c<C-1 && solH[r][c]===1) deg++;
                     if (deg === 2) visitedCells.push(cell);
                 }
                 
                 if (visitedCells.length === 0) {
                     // Are we allowed to skip a region? "Loop must hit every region" usually?
                     // Moonsun.py says: "hit_every_region(rooms)"
                     return false;
                 }
                 
                 let hasMoon = false;
                 let hasSun = false;
                 
                 for(const cell of visitedCells) {
                     const k = `${cell.r},${cell.c}`;
                     if (symbols[k] === 'moon') hasMoon = true;
                     if (symbols[k] === 'sun') hasSun = true;
                 }
                 
                 // Must collect ALL moons in region OR ALL suns in region (if selected type)
                 // And must NOT collect other type.
                 // Logic:
                 // If hasMoon and hasSun -> Invalid.
                 // If hasMoon: Must visit ALL moons in this region.
                 // If hasSun: Must visit ALL suns in this region.
                 
                 if (hasMoon && hasSun) return false;
                 
                 if (hasMoon) {
                     // Check if we missed any moon
                     for(const cell of region) {
                         const k = `${cell.r},${cell.c}`;
                         if (symbols[k] === 'moon') {
                             // Is this cell visited?
                             // Ideally we check if cell is in visitedCells
                             if (!visitedCells.find(vc => vc.r === cell.r && vc.c === cell.c)) return false;
                         }
                     }
                 }
                 
                 if (hasSun) {
                     // Check if we missed any sun
                     for(const cell of region) {
                         const k = `${cell.r},${cell.c}`;
                         if (symbols[k] === 'sun') {
                             if (!visitedCells.find(vc => vc.r === cell.r && vc.c === cell.c)) return false;
                         }
                     }
                 }
             }
             
             // 3. Single Loop Check (BFS)
             // Find first visited cell
             let start = null;
             for(let r=0; r<R; r++) {
                 for(let c=0; c<C; c++) {
                     let deg=0;
                     if(r>0 && solV[r-1][c]===1) deg++;
                     if(r<R-1 && solV[r][c]===1) deg++;
                     if(c>0 && solH[r][c-1]===1) deg++;
                     if(c<C-1 && solH[r][c]===1) deg++;
                     if (deg===2) { start={r,c}; break; }
                 }
                 if(start) break;
             }
             if (!start) return false; // Empty loop
             
             let visitedCount = 0;
             let totalVisited = 0;
             for(let r=0; r<R; r++) for(let c=0; c<C; c++) {
                 let deg=0;
                 if(r>0 && solV[r-1][c]===1) deg++;
                 if(r<R-1 && solV[r][c]===1) deg++;
                 if(c>0 && solH[r][c-1]===1) deg++;
                 if(c<C-1 && solH[r][c]===1) deg++;
                 if (deg===2) totalVisited++;
             }
             
             const q = [start];
             const visitedSet = new Set([`${start.r},${start.c}`]);
             
             while(q.length) {
                 const {r, c} = q.pop();
                 visitedCount++;
                 
                 // Neighbors
                 // Up
                 if(r>0 && solV[r-1][c]===1) {
                     if(!visitedSet.has(`${r-1},${c}`)) { visitedSet.add(`${r-1},${c}`); q.push({r:r-1, c}); }
                 }
                 // Down
                 if(r<R-1 && solV[r][c]===1) {
                     if(!visitedSet.has(`${r+1},${c}`)) { visitedSet.add(`${r+1},${c}`); q.push({r:r+1, c}); }
                 }
                 // Left
                 if(c>0 && solH[r][c-1]===1) {
                     if(!visitedSet.has(`${r},${c-1}`)) { visitedSet.add(`${r},${c-1}`); q.push({r, c:c-1}); }
                 }
                 // Right
                 if(c<C-1 && solH[r][c]===1) {
                     if(!visitedSet.has(`${r},${c+1}`)) { visitedSet.add(`${r},${c+1}`); q.push({r, c:c+1}); }
                 }
             }
             
             return visitedCount === totalVisited;
        }

        function backtrack(idx) {
            if (solutions.length >= 1) return; // Find one solution
            
            if (idx === allEdges.length) {
                if (checkValidity()) {
                    solutions.push({
                        h: solH.map(r => [...r]),
                        v: solV.map(r => [...r])
                    });
                }
                return;
            }
            
            const e = allEdges[idx];
            
            // Try adding edge
            if(e.type==='h') solH[e.r][e.c] = 1; else solV[e.r][e.c] = 1;
            // Pruning check: check degrees of affected cells
            // If any degree > 2 -> Invalid
            // If any cell 'finished' (idx moves past it) and degree != 0 and != 2 -> Invalid
            // This is simplified; we rely on full check at end for now, which is slow but correct.
            backtrack(idx+1);
            
            if(solutions.length >= 1) return;
            
            // Try removing edge
            if(e.type==='h') solH[e.r][e.c] = 0; else solV[e.r][e.c] = 0;
            backtrack(idx+1);
        }
        
        backtrack(0);
        
        if (solutions.length > 0) {
            foundSolutions = solutions;
            applySolution(0);
            updateStatus("SOLUTION FOUND");
        } else {
            updateStatus("NO SOLUTION");
        }
    } catch(e) {
        console.error(e);
        updateStatus("ERROR");
    } finally {
        solveBtn.disabled = false;
    }
}

function applySolution(idx) {
    const sol = foundSolutions[idx];
    for(let r=0; r<R; r++) {
        for(let c=0; c<C-1; c++) hEdges[r][c] = (sol.h[r][c] === 1);
    }
    for(let r=0; r<R-1; r++) {
        for(let c=0; c<C; c++) vEdges[r][c] = (sol.v[r][c] === 1);
    }
    renderGrid();
}
























