let R = 10;
let C = 10;
let grid = []; // { type: 0..6 (line), clue: { color:'w'|'b', num:int|null, dir:'u'|'d'|'l'|'r'|null } }

let currentTool = 'clue_w'; // clue_w, clue_b, line, clear
// For clue editing, we might need a popover or cycle interaction. 
// Let's use: Click to place/cycle color. Right click/Long press to set details?
// Or separate tool modes for "Color", "Number", "Arrow".
// Let's use a combined Clue Editor approach in the UI.

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

function setTool(t) {
    currentTool = t;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tool-${t}`).classList.add('active');
}

function renderGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${C}, var(--cw-cell-size))`;
    
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            const cell = document.createElement('div');
            cell.className = 'cw-cell';
            cell.onclick = () => handleCellClick(r, c);
            cell.oncontextmenu = (e) => { e.preventDefault(); handleRightClick(r, c); };
            
            // Draw Clue
            if (grid[r][c].clue) {
                const cl = grid[r][c].clue;
                const div = document.createElement('div');
                div.className = `cw-clue ${cl.color === 'b' ? 'black' : 'white'}`;
                
                let content = '';
                if (cl.num !== null) content += `<span>${cl.num}</span>`;
                if (cl.dir) {
                    const arrows = { u:'▲', d:'▼', l:'◀', r:'▶' };
                    content += `<span class="cw-arrow">${arrows[cl.dir]}</span>`;
                }
                div.innerHTML = content;
                cell.appendChild(div);
            }
            
            // Draw Line (if no clue)
            if (!grid[r][c].clue && grid[r][c].type > 0) {
                const svg = createLineSvg(grid[r][c].type);
                cell.appendChild(svg);
            }
            
            container.appendChild(cell);
        }
    }
}

function createLineSvg(type) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add('cw-line-svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    
    const mid = 50;
    let d = "";
    // Types: 1=|, 2=-, 3=L, 4=J, 5=7, 6=F (Mapping might vary, using standard)
    // Let's stick to standard mapping:
    // 1: U-D, 2: L-R, 3: U-R (L), 4: U-L (J), 5: D-L (7), 6: D-R (F)
    // Note: In Balanceloop I used:
    // 3: L (Up-Right), 4: J (Up-Left) -- Wait, Balanceloop used standard chars mapping?
    // Balanceloop Code: 3:└(U,R), 4:┘(U,L), 5:┐(D,L), 6:┌(D,R) -> Yes.
    
    const t = type;
    if (t === 1 || t === 3 || t === 4) d += `M${mid},${mid} L${mid},0 `; // Up
    if (t === 1 || t === 5 || t === 6) d += `M${mid},${mid} L${mid},100 `; // Down
    if (t === 2 || t === 4 || t === 5) d += `M${mid},${mid} L0,${mid} `; // Left
    if (t === 2 || t === 3 || t === 6) d += `M${mid},${mid} L100,${mid} `; // Right
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('d', d);
    path.classList.add('cw-line');
    svg.appendChild(path);
    return svg;
}

function handleCellClick(r, c) {
    if (currentTool === 'line') {
        if (grid[r][c].clue) return; // Can't draw on clue
        grid[r][c].type = (grid[r][c].type + 1) % 7;
        renderGrid();
    } else if (currentTool.startsWith('clue')) {
        const color = currentTool === 'clue_w' ? 'w' : 'b';
        // If already has clue of same color, edit properties
        if (grid[r][c].clue && grid[r][c].clue.color === color) {
            cycleClueProps(r, c);
        } else {
            grid[r][c].clue = { color: color, num: null, dir: null };
            grid[r][c].type = 0; // Remove line
        }
        renderGrid();
    } else if (currentTool === 'clear') {
        grid[r][c].clue = null;
        grid[r][c].type = 0;
        renderGrid();
    }
}

function handleRightClick(r, c) {
    grid[r][c].clue = null;
    grid[r][c].type = 0;
    renderGrid();
}

function cycleClueProps(r, c) {
    const cl = grid[r][c].clue;
    // Cycle: (Num, Dir) combinations?
    // Simplified: Prompt for num, Cycle Dir
    // Or: Click cycles Dir (None->U->R->D->L). Long press/Prompt for Num.
    
    const dirs = [null, 'u', 'r', 'd', 'l'];
    const currIdx = dirs.indexOf(cl.dir);
    const nextIdx = (currIdx + 1) % dirs.length;
    cl.dir = dirs[nextIdx];
    
    if (nextIdx === 0) {
        // If dir reset to null, maybe ask for number?
        // Or separate input.
        // Let's prompt for number if clicking.
        const n = prompt("Enter number (optional):", cl.num || "");
        if (n !== null) {
            cl.num = n === "" ? null : parseInt(n);
        }
    }
}

// --- Solver ---

async function solvePuzzle() {
    msg("SOLVING...");
    document.getElementById('loading-overlay').style.display = 'flex';
    await new Promise(r => setTimeout(r, 100));

    // 1. Parse hints to constraints
    const hints = [];
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (grid[r][c].clue) {
                hints.push({r, c, ...grid[r][c].clue});
            }
        }
    }

    // 2. Backtrack
    // We need a single loop.
    // Cells with clues are BLOCKED (type=0).
    const solution = solveLoop(hints);
    
    document.getElementById('loading-overlay').style.display = 'none';
    
    if (solution) {
        applySolution(solution);
        msg("SOLVED!");
    } else {
        msg("NO SOLUTION FOUND");
    }
}

function applySolution(solGrid) {
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (!grid[r][c].clue) {
                grid[r][c].type = solGrid[r][c];
            }
        }
    }
    renderGrid();
}

// Simplified JS Backtracking Solver for Castlewall
// Constraints:
// 1. Single Loop
// 2. No lines in Clue cells
// 3. Clue Direction Sum
// 4. Clue Color Inside/Outside

function solveLoop(hints) {
    // Initialize empty grid
    // We will fill types 1-6. 0 is empty/clue.
    const g = Array(R).fill(0).map(() => Array(C).fill(0));
    
    // Mark clues as -1 (blocked)
    for(let h of hints) g[h.r][h.c] = -1;
    
    // Helper to check clue length sum
    function checkClueDir(g, r, c, dir, targetNum) {
        if (targetNum === null) return true;
        let count = 0;
        let cr = r, cc = c;
        const dr = dir==='u'?-1 : dir==='d'?1 : 0;
        const dc = dir==='l'?-1 : dir==='r'?1 : 0;
        
        cr += dr; cc += dc;
        while(cr >= 0 && cr < R && cc >= 0 && cc < C) {
            const t = g[cr][cc];
            // Check connection in the direction of movement (Parallel)
            // If moving U/D, need Vertical segment.
            // Vertical: 1, 3(L), 4(J), 5(7), 6(F) have vertical parts?
            // No, length is "loop segments".
            // If I am at (cr,cc), is the segment parallel to travel part of the loop?
            // U/D: Need (1, 3, 4, 5, 6) having 'u' or 'd' connections?
            // Castlewall counts "lengths of loop segments".
            // Grid lines connect centers.
            // A vertical loop segment exists at (cr,cc) if type has U AND D? No.
            // It exists if the loop passes through (cr,cc) vertically?
            // Or does it count ANY loop segment?
            // "Sum of the lengths of the loop segments in the direction".
            // The loop is a path of unit segments.
            // The segments in the direction of arrow.
            // Arrow Up: sum of lengths of vertical segments in the column above.
            // A vertical segment connects (y, c) and (y-1, c).
            // If grid[y][c] connects Up, that's a segment.
            // So we count cells with Up connection?
            
            const S = getShape(t);
            // If dir is U, we check if cell has Up connection?
            // Wait, a segment is between two cells.
            // If grid[cr][cc] connects to grid[cr-dr][cc-dc] (the one closer to clue),
            // that is one unit of length.
            // And if grid[cr][cc] connects to grid[cr+dr][cc+dc] (further), that's another.
            // Actually simpler:
            // "Length of loop segments" = Number of unit borders crossed?
            // Usually in these puzzles, it matches "number of cells with parallel flow".
            // If grid[cr][cc] is '|' (Vertical), it contributes 1? Or 2 (entering and leaving)?
            // Standard interpretation: Number of unit edges in that direction.
            // Each cell with a vertical line piece contributes to length?
            // A '|' cell has length 1 (center to center)? No, visualizations show lines crossing cells.
            // If cell is '|', the line goes from top edge to bottom edge. Length = 1.
            // If cell is 'L' (Up-Right), line goes Center-Top and Center-Right.
            // The Vertical part is Center-Top (length 0.5).
            // Clues are usually integers.
            // "The number indicates the sum of the lengths of the loop segments".
            // This implies we count the number of unit intervals.
            // A unit interval connects two adjacent cell centers.
            // So if grid[y][c] connects to grid[y-1][c], that is ONE segment of length 1.
            // So we count edges.
            
            // For 'u' direction: Count edges connecting (k, c) and (k-1, c) for k < r.
            // Edge at k exists if grid[k][c] has U connection (and thus grid[k-1][c] has D).
            
            if (dir === 'u' || dir === 'd') {
                 if (S.u && S.d) count += 1; // Through vertical
                 // What if turn?
                 // L (U, R). Passes vertical boundary? No. It connects center to top.
                 // So it's 0.5 length?
                 // Castlewall usually counts borders crossed.
                 // Let's assume "Loop Segments" = Edges between cells.
                 // The edge (cr, cc) <-> (cr-dr, cc-dc)
                 // If we are moving U, we look at cells above.
                 // The edge between (cr, cc) and (cr+1, cc) (below it)
                 // And edge between (cr, cc) and (cr-1, cc) (above it)
                 // This is getting complicated.
                 // Let's try the Python interpretation:
                 // `require(sum_bools(int(num), [var_in(loop_solver.grid[y][c], DOWN_CONNECTING) ...]))`
                 // DOWN_CONNECTING means grid[y][c] connects to grid[y+1][c].
                 // So it counts the number of vertical connections in the column.
                 // Yes.
                 
                 // For Up direction: count vertical connections in cells above (y < r).
                 // A vertical connection is "Down connection of cell y" where y < r.
                 // Wait, if clue is at r. We look at y = 0..r-1.
                 // The connection between y and y+1.
                 // We count Down connections of y for y in 0..r-1.
                 // Wait, y=r-1 connects to r (the clue). But clue is blocked. So grid[r-1][c] cannot connect Down.
                 // So connection to Clue is impossible.
                 // So we count connections strictly inside the region?
                 // y in range(r-1) -> 0 .. r-2.
                 // So we count edges (0,1), (1,2) ... (r-2, r-1).
                 // Total count of vertical links.
            }
            
            cr += dr; cc += dc;
        }
        
        // Recalculate properly using grid traversal
        count = 0;
        // Reset and loop properly
        if (dir === 'u') {
            for(let y=0; y < r - 1; y++) { // Edges between y and y+1
                 if (hasDown(g[y][c])) count++;
            }
        } else if (dir === 'd') {
            for(let y=r+1; y < R - 1; y++) { // Edges between y and y+1
                 if (hasDown(g[y][c])) count++;
            }
        } else if (dir === 'l') {
            for(let x=0; x < c - 1; x++) { // Edges between x and x+1
                 if (hasRight(g[r][x])) count++;
            }
        } else if (dir === 'r') {
            for(let x=c+1; x < C - 1; x++) { // Edges between x and x+1
                 if (hasRight(g[r][x])) count++;
            }
        }
        
        return count === targetNum;
    }
    
    // Helper maps
    function hasDown(t) { return [1, 5, 6].includes(t); }
    function hasRight(t) { return [2, 3, 6].includes(t); }
    function getShape(t) {
        return {
            u: [1, 3, 4].includes(t),
            d: [1, 5, 6].includes(t),
            l: [2, 4, 5].includes(t),
            r: [2, 3, 6].includes(t)
        };
    }

    // TODO: Full Loop solver logic
    // This requires significant backtracking state.
    // Due to browser JS limitations, implementing a full global constraint solver here is hard.
    // We will use a simplified "find valid local + loop check" or skip if too complex.
    // But user wants it to work.
    // We can implement the standard "Backtrack on Edges" approach.
    
    // Or just use the provided Python structure's logic:
    // 1. Fill cells ensuring local consistency.
    // 2. Check Clues.
    // 3. Check Single Loop.
    // 4. Check Inside/Outside colors.
    
    // Inside/Outside check:
    // Using Ray Casting algorithm (parity).
    // From a cell, cast a ray to edge. Count crossings.
    // Odd crossings = Inside (White clue should be here? No, Loop Interior).
    // Castlewall: 
    // White Clue = INSIDE loop.
    // Black Clue = OUTSIDE loop.
    // Clue cells are not part of loop, but they reside in the area.
    
    return backtrack(g, 0);
}

function backtrack(g, idx) {
    if (idx === R * C) {
        if (checkLoopAndClues(g)) return g.map(r => [...r]);
        return null;
    }
    
    const r = Math.floor(idx / C);
    const c = idx % C;
    
    if (g[r][c] === -1) { // Clue
        return backtrack(g, idx + 1);
    }
    
    // Try all 7 types (0=Empty, 1-6=Line)
    // Pruning: Match Up and Left neighbors
    const upT = r>0 ? g[r-1][c] : -1;
    const leftT = c>0 ? g[r][c-1] : -1;
    
    // Determine required connections
    const reqU = (upT !== -1 && upT !== 0 && hasDown(upT));
    const reqL = (leftT !== -1 && leftT !== 0 && hasRight(leftT));
    
    // Boundary check
    const isBottom = r === R-1;
    const isRight = c === C-1;
    
    for(let t=0; t<=6; t++) {
        const S = getShape(t);
        
        // Match Up
        if (!!S.u !== reqU) continue;
        
        // Match Left
        if (!!S.l !== reqL) continue;
        
        // Boundary
        if (isBottom && S.d) continue;
        if (isRight && S.r) continue;
        
        // Clue adjacency check (Optional optimization)
        // If neighbor is clue (-1), we cannot connect to it.
        if (r<R-1 && g[r+1][c]===-1 && S.d) continue;
        if (c<C-1 && g[r][c+1]===-1 && S.r) continue;
        
        g[r][c] = t;
        const res = backtrack(g, idx + 1);
        if (res) return res;
    }
    
    g[r][c] = 0;
    return null;
}

function hasDown(t) { return [1, 5, 6].includes(t); }
function hasRight(t) { return [2, 3, 6].includes(t); }
function getShape(t) {
    return {
        u: [1, 3, 4].includes(t),
        d: [1, 5, 6].includes(t),
        l: [2, 4, 5].includes(t),
        r: [2, 3, 6].includes(t)
    };
}

function checkLoopAndClues(g) {
    // 1. Check Loop Connectivity (Single Loop)
    // Also ensure no loose ends (Degree constraint handled by matching neighbors, except borders)
    // 0-degree nodes (Empty) are allowed.
    
    let nodes = [];
    for(let r=0; r<R; r++) for(let c=0; c<C; c++) if(g[r][c] > 0) nodes.push({r,c});
    
    if (nodes.length === 0) return false; // Empty grid?
    
    const start = nodes[0];
    const q = [start];
    const visited = new Set([`${start.r},${start.c}`]);
    
    while(q.length) {
        const {r, c} = q.pop();
        const t = g[r][c];
        const S = getShape(t);
        
        const nbors = [];
        if (S.u) nbors.push({r:r-1, c:c});
        if (S.d) nbors.push({r:r+1, c:c});
        if (S.l) nbors.push({r:r, c:c-1});
        if (S.r) nbors.push({r:r, c:c+1});
        
        for(let n of nbors) {
            if (g[n.r][n.c] > 0 && !visited.has(`${n.r},${n.c}`)) {
                visited.add(`${n.r},${n.c}`);
                q.push(n);
            }
        }
    }
    
    if (visited.size !== nodes.length) return false; // Disconnected
    
    // 2. Check Clue Logic (Number + Direction)
    // And Color
    
    for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
            if (grid[r][c].clue) { // Check original grid for clues
                const cl = grid[r][c].clue;
                
                // Number check
                if (cl.num !== null && cl.dir !== null) {
                     // Reuse logic from before, adapted for completed grid
                     let count = 0;
                     if (cl.dir === 'u') {
                        for(let y=0; y < r - 1; y++) if (hasDown(g[y][c])) count++;
                     } else if (cl.dir === 'd') {
                        for(let y=r+1; y < R - 1; y++) if (hasDown(g[y][c])) count++;
                     } else if (cl.dir === 'l') {
                        for(let x=0; x < c - 1; x++) if (hasRight(g[r][x])) count++;
                     } else if (cl.dir === 'r') {
                        for(let x=c+1; x < C - 1; x++) if (hasRight(g[r][x])) count++;
                     }
                     if (count !== cl.num) return false;
                }
                
                // Color Check (Inside/Outside)
                // Cast ray to top
                let crossings = 0;
                // A horizontal line crossing a vertical loop segment counts as 1 crossing.
                // Ray from (r, c) up to -1.
                // The vertical segments are edges (y, c)-(y-1, c).
                // Ray is along column c.
                // Ray passes through cell centers.
                // Loop lines connect centers.
                // So ray overlaps loop lines? No.
                // Parity check works by casting a ray to infinity and counting boundary crossings.
                // Since clues are not on the loop, they are in regions.
                // Grid edges are where loop segments live.
                // Ray direction: Horizontal to Left.
                // Ray passes through vertical edges: (r, k)-(r, k-1).
                // No, loop connects centers.
                // Let's use standard point-in-polygon ray casting.
                // Clue is at (r, c). Ray goes Left (r, -1).
                // It crosses vertical loop segments.
                // A vertical loop segment is at column x, connecting (y, x) and (y+1, x).
                // If our ray is at row r, does it cross?
                // Only if the segment is at column x < c, and connects row r-1 and r?
                // No, Grid:
                // Cells are nodes. Edges connect nodes.
                // Loop is a subgraph of the grid graph.
                // Clue node (r,c) is not in loop.
                // Ray to left: passes nodes (r, c-1), (r, c-2)...
                // We cross a "vertical" loop edge?
                // A vertical edge connects (y, x) to (y+1, x).
                // Our ray is along row r (nodes).
                // It never "crosses" a vertical edge because vertical edges are parallel to columns?
                // Wait, geometric interpretation:
                // Nodes are at (r+0.5, c+0.5).
                // Loop edges connect these points.
                // Clue is at (r+0.5, c+0.5).
                // Ray going left: y = r+0.5, x goes to 0.
                // We cross vertical edges? No, vertical edges are on x = integer+0.5 lines.
                // We cross horizontal edges? Yes, on the same line.
                // This is topological.
                // Easier: "Parity of vertical segments in the row to the left/right".
                // Count number of Vertical Segments in row r? No.
                // Count number of Vertical Segments in the column crossing the horizontal ray?
                // Ray is y=r+0.5.
                // Vertical segment x=k+0.5, y from j+0.5 to j+1.5.
                // Does y=r+0.5 intersect? No, it passes through the node.
                // But the node (r, k) is either ON the loop or OFF.
                // Clue is OFF.
                // If we pass a node (r, k) that is ON the loop, and has a vertical connection...
                // Does that count as crossing?
                // Yes, if the loop goes "Through" the row.
                // i.e. The cell (r, k) has 'u' and 'd'. (Type 1).
                // What if 'L' (u, r)? It comes from Up, turns Right. It doesn't cross the row fully.
                // What if 'F' (d, r)?
                // Tangent: standard algorithm for grid graph.
                // Count crossings of "Vertical Edges".
                // The ray is usually offset, e.g. y = r + 0.2.
                // Then we check vertical edges connecting (r, k) to (r+1, k).
                // These edges cross y=r+0.2.
                // So: For each column k < c:
                // If there is a connection between (r, k) and (r+1, k) (i.e. g[r][k] has 'd' connection),
                // Then we crossed the boundary.
                
                let boundaryCrossings = 0;
                // Cast ray Left
                for(let x=0; x < c; x++) {
                     // Check edge between (r, x) and (r+1, x)
                     // Does (r, x) have 'd' connection?
                     if (hasDown(g[r][x])) boundaryCrossings++;
                }
                
                const isInside = (boundaryCrossings % 2 === 1);
                
                if (cl.color === 'w' && !isInside) return false; // White must be Inside
                if (cl.color === 'b' && isInside) return false;  // Black must be Outside
            }
        }
    }
    
    return true;
}
























