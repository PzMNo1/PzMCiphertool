document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('grid-container');
    const rowsInput = document.getElementById('rows-input');
    const colsInput = document.getElementById('cols-input');
    const newGridBtn = document.getElementById('new-grid-btn');
    const modeBtns = {
        play: document.getElementById('mode-play'),
        edit: document.getElementById('mode-edit'),
        solve: document.getElementById('mode-solve'),
        reset: document.getElementById('mode-reset')
    };
    const message = document.getElementById('message');

    let R = 10, C = 10;
    let clues = []; // 2D array of clues (null or 0-3)
    let hEdges = []; // (R+1) x C: 0=empty, 1=line, 2=cross
    let vEdges = []; // R x (C+1)
    let mode = 'play'; // 'play', 'edit'

    // Init
    initGame(R, C);

    // Event Listeners
    newGridBtn.addEventListener('click', () => {
        const r = parseInt(rowsInput.value);
        const c = parseInt(colsInput.value);
        if (r < 3 || c < 3 || r > 20 || c > 20) {
            alert('尺寸请在 3-20 之间');
            return;
        }
        initGame(r, c);
    });

    modeBtns.play.addEventListener('click', () => setMode('play'));
    modeBtns.edit.addEventListener('click', () => setMode('edit'));
    modeBtns.solve.addEventListener('click', solvePuzzle);
    modeBtns.reset.addEventListener('click', resetState);

    function setMode(m) {
        mode = m;
        Object.values(modeBtns).forEach(b => b.classList.remove('active'));
        modeBtns[m].classList.add('active');
        renderGrid();
    }

    function initGame(r, c) {
        R = r; C = c;
        clues = Array(R).fill().map(() => Array(C).fill(null));
        resetEdges();
        renderGrid();
    }

    function resetEdges() {
        hEdges = Array(R + 1).fill().map(() => Array(C).fill(0));
        vEdges = Array(R).fill().map(() => Array(C + 1).fill(0));
    }

    function resetState() {
        resetEdges();
        renderGrid();
        message.innerText = '已重置';
    }

    function renderGrid() {
        gridContainer.innerHTML = '';
        // Grid Template: (Dot H-Edge) * C + Dot
        // Row layout:
        // 1. Dots and H-Edges
        // 2. V-Edges and Cells
        // ...
        
        // Columns: 2*C + 1. 
        // Widths: Dot(6px) Edge(40px) Dot(6px) ...
        let colTemplate = '';
        for(let j=0; j<C; j++) colTemplate += '6px 40px ';
        colTemplate += '6px';
        
        gridContainer.style.gridTemplateColumns = colTemplate;
        
        // Render Rows
        for (let i = 0; i <= R; i++) {
            // --- Horizontal Line Row (Dots & H-Edges) ---
            for (let j = 0; j <= C; j++) {
                // Dot
                const dot = document.createElement('div');
                dot.className = 'dot';
                gridContainer.appendChild(dot);

                // H-Edge (if not last col)
                if (j < C) {
                    const edge = document.createElement('div');
                    edge.className = 'h-edge';
                    if (hEdges[i][j] === 1) edge.classList.add('line');
                    if (hEdges[i][j] === 2) edge.classList.add('cross');
                    edge.addEventListener('click', () => toggleEdge('h', i, j));
                    gridContainer.appendChild(edge);
                }
            }

            // --- Vertical Line & Cell Row (if not last row) ---
            if (i < R) {
                for (let j = 0; j <= C; j++) {
                    // V-Edge
                    const edge = document.createElement('div');
                    edge.className = 'v-edge';
                    if (vEdges[i][j] === 1) edge.classList.add('line');
                    if (vEdges[i][j] === 2) edge.classList.add('cross');
                    edge.addEventListener('click', () => toggleEdge('v', i, j));
                    gridContainer.appendChild(edge);

                    // Cell (if not last col)
                    if (j < C) {
                        const cell = document.createElement('div');
                        cell.className = 'cell';
                        if (clues[i][j] !== null) cell.innerText = clues[i][j];
                        cell.addEventListener('click', () => editClue(i, j));
                        gridContainer.appendChild(cell);
                    }
                }
            }
        }
    }

    function toggleEdge(type, r, c) {
        if (mode === 'edit') return; // Don't toggle edges in edit mode? Or maybe allow both. Usually separate.
        
        if (type === 'h') {
            hEdges[r][c] = (hEdges[r][c] + 1) % 3; // 0->1->2->0
        } else {
            vEdges[r][c] = (vEdges[r][c] + 1) % 3;
        }
        renderGrid();
    }

    function editClue(r, c) {
        if (mode !== 'edit') return;
        
        let val = clues[r][c];
        if (val === null) val = 0;
        else {
            val++;
            if (val > 3) val = null; // Cycle null -> 0 -> 1 -> 2 -> 3 -> null
        }
        clues[r][c] = val;
        renderGrid();
    }

    // --- SOLVER ---
    async function solvePuzzle() {
        message.innerText = '求解中...';
        
        // Validate Clues
        // Nothing special, just need backtracking
        
        // State representation for solver
        // 0: unknown, 1: line, -1: empty (using -1 instead of 2 for solver logic usually easier)
        // We will convert our 0/1/2 to 0/1/-1
        
        // Actually, let's keep simple: 0=empty, 1=line.
        // But we need to know if an edge is forced empty.
        // Solver state: map key "h,r,c" -> 1 (line) or 0 (empty).
        // Or arrays.
        
        // Flatten edges for backtracking
        // hEdges: (R+1)*C
        // vEdges: R*(C+1)
        // Total edges = (R+1)C + R(C+1) = 2RC + R + C
        
        const edges = [];
        for(let i=0; i<=R; i++) for(let j=0; j<C; j++) edges.push({type:'h', r:i, c:j});
        for(let i=0; i<R; i++) for(let j=0; j<=C; j++) edges.push({type:'v', r:i, c:j});
        
        // Current assignment
        const solH = Array(R+1).fill().map(() => Array(C).fill(0)); // 0=undecided/empty, 1=line
        const solV = Array(R).fill().map(() => Array(C+1).fill(0));
        
        // We need 3 states for solver: Undecided, Line, Empty.
        // But standard backtracking usually assigns Line or Empty.
        // Let's try simple recursion.
        
        // Heuristic: Check small loops immediately?
        // Constraint Checking:
        // 1. Clues: lines around cell == clue
        // 2. Vertex: lines connected to vertex == 0 or 2
        
        const solution = await runSolver(edges, solH, solV);
        
        if (solution) {
            // Apply
            for(let i=0; i<=R; i++) for(let j=0; j<C; j++) hEdges[i][j] = solution.h[i][j];
            for(let i=0; i<R; i++) for(let j=0; j<=C; j++) vEdges[i][j] = solution.v[i][j];
            renderGrid();
            message.innerText = '求解成功！';
        } else {
            message.innerText = '无解。';
        }
    }

    function runSolver(edgeList, h, v) {
        return new Promise(resolve => {
            
            // Pre-check clues
            for(let r=0; r<R; r++) {
                for(let c=0; c<C; c++) {
                    if (clues[r][c] !== null) {
                         // If clue is 0, all surrounding edges are empty
                         if (clues[r][c] === 0) {
                             // handled in backtrack or pre-process?
                             // Let's do pre-process if we can, but backtrack is safer
                         }
                    }
                }
            }

            const backtrack = (idx) => {
                if (idx === edgeList.length) {
                    // Final check: Single Loop
                    return checkConnectivity(h, v) ? {h, v} : null;
                }

                const {type, r, c} = edgeList[idx];
                
                // Try Line (1)
                if (type === 'h') h[r][c] = 1; else v[r][c] = 1;
                
                if (isValidPartial(h, v, r, c, type)) {
                    const res = backtrack(idx + 1);
                    if (res) return res;
                }

                // Try Empty (0)
                if (type === 'h') h[r][c] = 0; else v[r][c] = 0;
                
                // Check if Empty is valid (e.g. vertex not left with 1 line, clue not impossible)
                if (isValidPartial(h, v, r, c, type)) {
                    const res = backtrack(idx + 1);
                    if (res) return res;
                }

                return null;
            };

            // Optimization: Check validity locally
            function isValidPartial(h, v, r, c, type) {
                // 1. Check Clues (Cells adjacent to this edge)
                // If type is h at r,c: adjacent cells are (r-1, c) and (r, c)
                // If type is v at r,c: adjacent cells are (r, c-1) and (r, c)
                
                const cellsToCheck = [];
                if (type === 'h') {
                    if (r > 0) cellsToCheck.push({r:r-1, c:c});
                    if (r < R) cellsToCheck.push({r:r, c:c});
                } else {
                    if (c > 0) cellsToCheck.push({r:r, c:c-1});
                    if (c < C) cellsToCheck.push({r:r, c:c});
                }
                
                for (const cell of cellsToCheck) {
                    const clue = clues[cell.r][cell.c];
                    if (clue !== null) {
                        // Count lines around cell
                        let lines = 0;
                        let undecided = 0;
                        
                        // Top (h, r, c)
                        // Bottom (h, r+1, c)
                        // Left (v, r, c)
                        // Right (v, r, c+1)
                        
                        // Check if these edges are decided
                        // Note: edgeList order matters. We assume '0' in h/v means empty OR undecided?
                        // This is the problem. We need 'undecided' state.
                        // But simple backtrack assigns 1 or 0. So everything "before" idx is decided.
                        // But we access future edges. 
                        // We need to know if an edge is visited.
                        // Or we just assume 0 is empty, but that breaks partial check.
                        // Let's pass 'idx' or check against edgeList? No too slow.
                        
                        // Better approach: Initialize h/v with -1 (undecided).
                        // Modify solver to use -1.
                        // Let's fix this now.
                    }
                }
                return true; // Placeholder
            }

            // Re-implement with 3-state logic
            const solH = Array(R+1).fill().map(() => Array(C).fill(-1));
            const solV = Array(R).fill().map(() => Array(C+1).fill(-1));

            const solve3State = (idx) => {
                if (idx === edgeList.length) {
                    return checkConnectivity(solH, solV) ? {h: solH, v: solV} : null;
                }

                const {type, r, c} = edgeList[idx];

                // Try Line (1)
                if (type === 'h') solH[r][c] = 1; else solV[r][c] = 1;
                if (checkLocal(type, r, c)) {
                    const res = solve3State(idx + 1);
                    if (res) return res;
                }

                // Try Empty (0)
                if (type === 'h') solH[r][c] = 0; else solV[r][c] = 0;
                if (checkLocal(type, r, c)) {
                    const res = solve3State(idx + 1);
                    if (res) return res;
                }

                // Reset
                if (type === 'h') solH[r][c] = -1; else solV[r][c] = -1;
                return null;
            };

            function checkLocal(type, r, c) {
                // Check Cells
                const cells = [];
                if (type === 'h') {
                    if (r > 0) cells.push({r:r-1, c:c});
                    if (r < R) cells.push({r:r, c:c});
                } else {
                    if (c > 0) cells.push({r:r, c:c-1});
                    if (c < C) cells.push({r:r, c:c});
                }

                for(const cell of cells) {
                    const k = clues[cell.r][cell.c];
                    if (k !== null) {
                        // Get 4 edges
                        const e1 = solH[cell.r][cell.c]; // Top
                        const e2 = solH[cell.r+1][cell.c]; // Bottom
                        const e3 = solV[cell.r][cell.c]; // Left
                        const e4 = solV[cell.r][cell.c+1]; // Right
                        
                        const arr = [e1, e2, e3, e4];
                        const lines = arr.filter(x => x === 1).length;
                        const unknown = arr.filter(x => x === -1).length;
                        
                        if (lines > k) return false; // Too many
                        if (lines + unknown < k) return false; // Not enough possible
                    }
                }

                // Check Vertices (0 or 2 lines)
                // h[r][c] is connected to vertices (r, c) and (r, c+1)
                // v[r][c] is connected to vertices (r, c) and (r+1, c)
                
                const verts = [];
                if (type === 'h') {
                    verts.push({r:r, c:c});
                    verts.push({r:r, c:c+1});
                } else {
                    verts.push({r:r, c:c});
                    verts.push({r:r+1, c:c});
                }
                
                for(const v of verts) {
                    // Identify 4 potential edges connected to vertex (r,c)
                    // Top: v[r-1][c] (if r>0)
                    // Bottom: v[r][c] (if r<R)
                    // Left: h[r][c-1] (if c>0)
                    // Right: h[r][c] (if c<C)
                    
                    const edges = [];
                    if (v.r > 0) edges.push(solV[v.r-1][v.c]);
                    if (v.r < R) edges.push(solV[v.r][v.c]);
                    if (v.c > 0) edges.push(solH[v.r][v.c-1]);
                    if (v.c < C) edges.push(solH[v.r][v.c]);
                    
                    const lines = edges.filter(x => x === 1).length;
                    const unknown = edges.filter(x => x === -1).length;
                    
                    // Degree must be 0 or 2
                    // If unknown == 0, degree must be 0 or 2
                    if (unknown === 0) {
                        if (lines !== 0 && lines !== 2) return false;
                    } else {
                        // If lines > 2, invalid
                        if (lines > 2) return false;
                        // If lines == 1 and unknown == 0 (caught above)
                        // If lines == 1 and unknown > 0, possible to reach 2
                    }
                }

                // Check Partial Connectivity (Prevent small closed loops)
                // If we formed a closed loop, it must be the ONLY loop and visit all lines.
                // Hard to check efficiently incrementally without union-find.
                // Simplified: Just return true, check global connectivity at end.
                // Or basic check: if degree 2 at a vertex, follow path?
                
                return true;
            }

            function checkConnectivity(h, v) {
                // 1. Check degrees
                for(let i=0; i<=R; i++) {
                    for(let j=0; j<=C; j++) {
                        let d = 0;
                        if (i>0 && v[i-1][j]===1) d++;
                        if (i<R && v[i][j]===1) d++;
                        if (j>0 && h[i][j-1]===1) d++;
                        if (j<C && h[i][j]===1) d++;
                        if (d !== 0 && d !== 2) return false;
                    }
                }

                // 2. Check Single Loop
                // Find first vertex with lines
                let start = null;
                let totalLines = 0;
                for(let i=0; i<=R; i++) for(let j=0; j<C; j++) if(h[i][j]===1) { totalLines++; if(!start) start={r:i, c:j, type:'h'}; }
                for(let i=0; i<R; i++) for(let j=0; j<=C; j++) if(v[i][j]===1) { totalLines++; if(!start) start={r:i, c:j, type:'v'}; }
                
                if (totalLines === 0) return false; // Empty grid usually invalid unless 0 clues allow it? Usually Slitherlink has a loop.

                // BFS/DFS to count connected edges
                // Graph of edges? Or vertices? Vertices is easier.
                // Find a vertex on the loop
                let startV = null;
                 for(let i=0; i<=R; i++) {
                    for(let j=0; j<=C; j++) {
                        let d = 0;
                        if (i>0 && v[i-1][j]===1) d++;
                        if (i<R && v[i][j]===1) d++;
                        if (j>0 && h[i][j-1]===1) d++;
                        if (j<C && h[i][j]===1) d++;
                        if (d > 0) { startV = {r:i, c:j}; break; }
                    }
                    if (startV) break;
                }
                
                if (!startV) return false;

                let visitedV = new Set();
                let q = [startV];
                visitedV.add(`${startV.r},${startV.c}`);
                let edgesCounted = 0;

                while(q.length > 0) {
                    const curr = q.shift();
                    const {r, c} = curr;
                    
                    // Check neighbors connected by lines
                    // Up
                    if (r > 0 && v[r-1][c] === 1) {
                        edgesCounted++; // This edge is shared by (r,c) and (r-1,c). We count it twice total?
                        // Better to count visited edges.
                        const n = {r:r-1, c:c};
                        const key = `${n.r},${n.c}`;
                        if (!visitedV.has(key)) { visitedV.add(key); q.push(n); }
                    }
                    // Down
                    if (r < R && v[r][c] === 1) {
                        const n = {r:r+1, c:c};
                        const key = `${n.r},${n.c}`;
                        if (!visitedV.has(key)) { visitedV.add(key); q.push(n); }
                    }
                    // Left
                    if (c > 0 && h[r][c-1] === 1) {
                        const n = {r:r, c:c-1};
                        const key = `${n.r},${n.c}`;
                        if (!visitedV.has(key)) { visitedV.add(key); q.push(n); }
                    }
                    // Right
                    if (c < C && h[r][c] === 1) {
                        const n = {r:r, c:c+1};
                        const key = `${n.r},${n.c}`;
                        if (!visitedV.has(key)) { visitedV.add(key); q.push(n); }
                    }
                }
                
                // Total lines is edgesCounted / 2? 
                // Actually, counting vertices doesn't verify edge count directly.
                // But if degree constraint holds (2), and graph is connected, it is a single loop.
                // We just need to ensure all edges with 1 are "covered" by visited vertices.
                
                // Verify all lines are adjacent to visitedV
                for(let i=0; i<=R; i++) {
                    for(let j=0; j<C; j++) {
                        if (h[i][j] === 1) {
                            if (!visitedV.has(`${i},${j}`)) return false;
                        }
                    }
                }
                for(let i=0; i<R; i++) {
                    for(let j=0; j<=C; j++) {
                        if (v[i][j] === 1) {
                             if (!visitedV.has(`${i},${j}`)) return false;
                        }
                    }
                }

                return true;
            }

            setTimeout(() => {
                const result = solve3State(0);
                resolve(result);
            }, 10);
        });
    }
});



















