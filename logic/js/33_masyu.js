    // Masyu Logic
    let R = 8;
    let C = 8;
    let circles = {}; // "r,c" -> 'w' or 'b'
    let hEdges = []; // R x (C-1)
    let vEdges = []; // (R-1) x C
    
    let currentMode = 'edit';
    let foundSolutions = [];
    let currentSolIndex = 0;

    window.onload = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const dataStr = urlParams.get('data');
        let dataLoaded = false;

        if (dataStr) {
            try {
                const data = JSON.parse(atob(dataStr));
                document.getElementById('rows-in').value = data.R;
                document.getElementById('cols-in').value = data.C;
                R = data.R; C = data.C;
                circles = data.circles || {};
                dataLoaded = true;
            } catch(e) { console.error("Data load failed"); }
        }
        initGrid(!dataLoaded);
    };

    function setMode(mode) {
        currentMode = mode;
        document.getElementById('mode-edit').className = mode === 'edit' ? 'mode-opt active' : 'mode-opt';
        document.getElementById('mode-play').className = mode === 'play' ? 'mode-opt active' : 'mode-opt';
        msg(mode === 'edit' ? "MODE: PLACE CIRCLES" : "MODE: DRAW LOOP");
    }

    function msg(text) {
        const el = document.getElementById('status-msg');
        el.style.opacity = 0;
        setTimeout(() => {
            el.innerText = text;
            el.style.opacity = 1;
        }, 200);
    }

    function initGrid(resetData = true) {
        const rIn = parseInt(document.getElementById('rows-in').value);
        const cIn = parseInt(document.getElementById('cols-in').value);
        
        if (rIn < 4 || cIn < 4 || rIn > 15 || cIn > 15) {
            msg("ERROR: Dimensions must be 4-15");
            return;
        }

        R = rIn;
        C = cIn;

        if (resetData) {
            circles = {};
        }
        
        hEdges = Array(R).fill(0).map(() => Array(C-1).fill(false));
        vEdges = Array(R-1).fill(0).map(() => Array(C).fill(false));

        const nav = document.getElementById('sol-nav-container');
        if(nav) nav.remove();

        renderGrid();
        if(resetData) msg("GRID INITIALIZED");
    }

    function renderGrid() {
        const container = document.getElementById('grid-container');
        container.innerHTML = '';
        
        const cellSize = 45; // Must match CSS
        container.style.width = `${C * cellSize}px`;
        container.style.height = `${R * cellSize}px`;
        container.style.position = 'relative';
        // We won't use grid layout for cells to allow absolute positioning of edges easily? 
        // Actually CSS Grid is fine, we can overlay edges.
        container.style.display = 'grid';
        container.style.gridTemplateColumns = `repeat(${C}, ${cellSize}px)`;
        container.style.gridTemplateRows = `repeat(${R}, ${cellSize}px)`;

        // Render Cells and Circles
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div');
                cell.className = 'm-cell';
                
                const key = `${r},${c}`;
                if (key in circles) {
                    const circle = document.createElement('div');
                    circle.className = `circle ${circles[key] === 'w' ? 'white' : 'black'}`;
                    cell.appendChild(circle);
                }
                
                cell.onmouseenter = () => cell.classList.add('hovered');
                cell.onmouseleave = () => cell.classList.remove('hovered');
                
                cell.onclick = () => handleCellClick(r, c);
                
                container.appendChild(cell);
            }
        }

        // Render Edges (Overlay)
        // Horizontal Edges
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C - 1; c++) {
                const edge = document.createElement('div');
                edge.className = 'edge-h';
                if (hEdges[r][c]) edge.classList.add('active');
                
                // Position: connecting center of (r,c) and (r,c+1)
                // (r,c) center is (c+0.5)*S, (r+0.5)*S
                // Edge starts at (c+0.5)*S, width S
                edge.style.left = `${(c + 0.5) * cellSize}px`;
                edge.style.top = `${(r + 0.5) * cellSize - 2}px`; // -2 for half line width
                edge.style.width = `${cellSize}px`;
                
                edge.onclick = (e) => { e.stopPropagation(); handleEdgeClick('h', r, c); };
                container.appendChild(edge);
            }
        }

        // Vertical Edges
        for (let r = 0; r < R - 1; r++) {
            for (let c = 0; c < C; c++) {
                const edge = document.createElement('div');
                edge.className = 'edge-v';
                if (vEdges[r][c]) edge.classList.add('active');
                
                edge.style.left = `${(c + 0.5) * cellSize - 2}px`;
                edge.style.top = `${(r + 0.5) * cellSize}px`;
                edge.style.height = `${cellSize}px`;
                
                edge.onclick = (e) => { e.stopPropagation(); handleEdgeClick('v', r, c); };
                container.appendChild(edge);
            }
        }
    }

    function handleCellClick(r, c) {
        if (currentMode === 'edit') {
            const key = `${r},${c}`;
            if (!(key in circles)) {
                circles[key] = 'w'; // White
            } else if (circles[key] === 'w') {
                circles[key] = 'b'; // Black
            } else {
                delete circles[key]; // Empty
            }
            renderGrid();
        }
    }

    function handleEdgeClick(type, r, c) {
        if (currentMode === 'play') {
            if (type === 'h') hEdges[r][c] = !hEdges[r][c];
            if (type === 'v') vEdges[r][c] = !vEdges[r][c];
            renderGrid();
        }
    }

    function clearState() {
        hEdges = hEdges.map(row => row.map(() => false));
        vEdges = vEdges.map(row => row.map(() => false));
        renderGrid();
        msg("BOARD CLEARED");
    }

    function copyToClipboard() {
        const data = { R, C, circles };
        const str = btoa(JSON.stringify(data));
        const url = window.location.href.split('?')[0] + '?data=' + str;
        navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
            msg("DATA COPIED TO CLIPBOARD");
        });
    }

    // --- Solver ---
    // Optimized Backtracking for Loop

    async function solvePuzzle() {
        document.getElementById('loading-overlay').style.display = 'flex';
        msg("SOLVING...");
        
        foundSolutions = [];
        currentSolIndex = 0;
        const nav = document.getElementById('sol-nav-container');
        if(nav) nav.remove();
        
        await new Promise(r => setTimeout(r, 100));

        try {
            // Data Structures
            const solH = Array(R).fill(0).map(() => Array(C-1).fill(0)); // 0:Unknown, 1:Line, -1:NoLine
            const solV = Array(R-1).fill(0).map(() => Array(C).fill(0));

            const solutions = [];

            // Helper to get neighbors of a cell (lines connected)
            function getCellLines(r, c) {
                const lines = []; // {type, r, c, val}
                // Up
                if(r>0) lines.push({type:'v', r:r-1, c, val: solV[r-1][c]});
                // Down
                if(r<R-1) lines.push({type:'v', r, c, val: solV[r][c]});
                // Left
                if(c>0) lines.push({type:'h', r, c:c-1, val: solH[r][c-1]});
                // Right
                if(c<C-1) lines.push({type:'h', r, c, val: solH[r][c]});
                return lines;
            }

            function checkCellConsistency(r, c) {
                const lines = getCellLines(r, c);
                const on = lines.filter(l => l.val === 1).length;
                const off = lines.filter(l => l.val === -1).length;
                const unknown = lines.filter(l => l.val === 0).length;

                if (on > 2) return false; // Too many lines
                if (on + unknown < 2) {
                     // Too few lines possible. 
                     // NOTE: Empty cells (no line passing through) have 0 lines.
                     // So if on + unknown < 2, it MUST be 0 lines.
                     // If on > 0, it's invalid.
                     if (on > 0) return false;
                }
                
                // Circle Rules
                const k = `${r},${c}`;
                if (k in circles) {
                    const type = circles[k];
                    // Must have exactly 2 lines
                    if (on > 2) return false;
                    if (on + unknown < 2) return false;
                    
                    // If fully determined (2 lines), check geometry
                    if (on === 2) {
                        // Identify directions of the 2 lines
                        // Up, Down, Left, Right
                        let dirs = [];
                        if(r>0 && solV[r-1][c]===1) dirs.push('u');
                        if(r<R-1 && solV[r][c]===1) dirs.push('d');
                        if(c>0 && solH[r][c-1]===1) dirs.push('l');
                        if(c<C-1 && solH[r][c]===1) dirs.push('r');
                        
                        const isStraight = (dirs.includes('u') && dirs.includes('d')) || (dirs.includes('l') && dirs.includes('r'));
                        
                        if (type === 'w') {
                            // White: Straight through
                            if (!isStraight) return false;
                            // Turn in adj: At least one adj must turn.
                            // This requires checking neighbors. 
                            // Usually hard to check locally if neighbors not set.
                        } else if (type === 'b') {
                            // Black: Turn
                            if (isStraight) return false;
                            // Straight in adj: Both adj must be straight.
                        }
                    }
                }
                return true;
            }

            // Check global loop status
            function checkLoop() {
                // 1. Every non-empty cell has degree 2.
                // 2. Single component.
                // 3. Circle rules satisfied.
                
                let degreeSum = 0;
                let startNode = null;
                
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        const lines = getCellLines(r, c);
                        const on = lines.filter(l => l.val === 1).length;
                        if (on !== 0 && on !== 2) return false;
                        if (on === 2) {
                            if(!startNode) startNode = {r, c};
                            degreeSum++;
                        }
                        
                        const k = `${r},${c}`;
                        if (k in circles) {
                            if (on !== 2) return false; // Circles must be visited
                            
                            // Check Geometry
                             let dirs = [];
                            if(r>0 && solV[r-1][c]===1) dirs.push('u');
                            if(r<R-1 && solV[r][c]===1) dirs.push('d');
                            if(c>0 && solH[r][c-1]===1) dirs.push('l');
                            if(c<C-1 && solH[r][c]===1) dirs.push('r');
                            
                            const isStraight = (dirs.includes('u') && dirs.includes('d')) || (dirs.includes('l') && dirs.includes('r'));
                            
                            if (circles[k] === 'w') {
                                if (!isStraight) return false;
                                // Check turn in adjacent
                                let turned = false;
                                for(let d of dirs) {
                                    let nr=r, nc=c;
                                    if(d==='u') nr--; if(d==='d') nr++; if(d==='l') nc--; if(d==='r') nc++;
                                    
                                    // Check if (nr,nc) turns
                                    // (nr,nc) lines
                                    // We know one line is coming from (r,c).
                                    // Check if the other line is straight relative to (r,c)->(nr,nc)
                                    // Or simpler: (nr,nc) is straight if its lines are U+D or L+R.
                                    // If not straight, it turns.
                                    if (!isNodeStraight(nr, nc)) turned = true;
                                }
                                if (!turned) return false;
                                
                            } else { // Black
                                if (isStraight) return false;
                                // Check straight in adjacent
                                for(let d of dirs) {
                                    let nr=r, nc=c;
                                    if(d==='u') nr--; if(d==='d') nr++; if(d==='l') nc--; if(d==='r') nc++;
                                    if (!isNodeStraight(nr, nc)) return false; // Must be straight
                                }
                            }
                        }
                    }
                }
                
                if (!startNode) return false; // No loop
                
                // Connectivity BFS
                const q = [startNode];
                const visited = new Set([`${startNode.r},${startNode.c}`]);
                let visitedCount = 1;
                
                while(q.length) {
                    const {r, c} = q.shift();
                    
                    // Follow lines
                    if(r>0 && solV[r-1][c]===1) visit(r-1, c);
                    if(r<R-1 && solV[r][c]===1) visit(r+1, c);
                    if(c>0 && solH[r][c-1]===1) visit(r, c-1);
                    if(c<C-1 && solH[r][c]===1) visit(r, c+1);
                    
                    function visit(nr, nc) {
                        const k = `${nr},${nc}`;
                        if(!visited.has(k)) {
                            visited.add(k);
                            visitedCount++;
                            q.push({r:nr, c:nc});
                        }
                    }
                }
                
                // Verify visited count matches total degree-2 nodes
                // degreeSum is number of nodes with degree 2
                return visitedCount === degreeSum;
            }
            
            function isNodeStraight(r, c) {
                 let dirs = [];
                if(r>0 && solV[r-1][c]===1) dirs.push('u');
                if(r<R-1 && solV[r][c]===1) dirs.push('d');
                if(c>0 && solH[r][c-1]===1) dirs.push('l');
                if(c<C-1 && solH[r][c]===1) dirs.push('r');
                return (dirs.includes('u') && dirs.includes('d')) || (dirs.includes('l') && dirs.includes('r'));
            }

            // List of all edges to iterate
            const allEdges = [];
            for(let r=0; r<R; r++) for(let c=0; c<C-1; c++) allEdges.push({type:'h', r, c});
            for(let r=0; r<R-1; r++) for(let c=0; c<C; c++) allEdges.push({type:'v', r, c});
            
            // Heuristic: Sort edges? Maybe edges connected to circles first?
            // Yes, highly recommended.
            allEdges.sort((a, b) => {
                // Score: near circles = high score
                function score(e) {
                    let s = 0;
                    if(e.type === 'h') {
                        if (`${e.r},${e.c}` in circles) s+=10;
                        if (`${e.r},${e.c+1}` in circles) s+=10;
                    } else {
                        if (`${e.r},${e.c}` in circles) s+=10;
                        if (`${e.r+1},${e.c}` in circles) s+=10;
                    }
                    return s;
                }
                return score(b) - score(a);
            });

            function solve(idx) {
                if (solutions.length >= 5) return; // Limit to 5

                if (idx === allEdges.length) {
                    if (checkLoop()) {
                        // Copy solution
                        solutions.push({
                            h: solH.map(r => [...r]),
                            v: solV.map(r => [...r])
                        });
                    }
                    return;
                }

                const e = allEdges[idx];
                
                // Optimization: Local check before branching
                // If any previous cell is "dead" (invalid degree or circle violation), backtrack.
                // This is complex to do efficiently. We just do rudimentary check.

                // Try 1 (Line)
                if(e.type==='h') solH[e.r][e.c] = 1; else solV[e.r][e.c] = 1;
                
                // Check affected cells
                // For edge (u, v), check u and v consistency
                let r1=e.r, c1=e.c;
                let r2 = e.type==='h' ? e.r : e.r+1;
                let c2 = e.type==='h' ? e.c+1 : e.c;
                
                if (checkCellConsistency(r1, c1) && checkCellConsistency(r2, c2)) {
                    // Premature loop check: if we formed a small closed loop that doesn't cover everything, stop.
                    // Complex, skip for now.
                    solve(idx+1);
                }

                if (solutions.length >= 5) return;

                // Try -1 (No Line)
                if(e.type==='h') solH[e.r][e.c] = -1; else solV[e.r][e.c] = -1;
                
                if (checkCellConsistency(r1, c1) && checkCellConsistency(r2, c2)) {
                    solve(idx+1);
                }
                
                // Reset
                if(e.type==='h') solH[e.r][e.c] = 0; else solV[e.r][e.c] = 0;
            }

            solve(0);

            if (solutions.length > 0) {
                foundSolutions = solutions;
                applySolution(foundSolutions[0]);
                msg(`FOUND ${solutions.length} SOLUTIONS`);
                if(solutions.length > 1) createSolutionNav(solutions.length);
            } else {
                msg("NO SOLUTION FOUND");
            }

        } catch(e) {
            console.error(e);
            msg("ERROR SOLVING");
        }
        
        document.getElementById('loading-overlay').style.display = 'none';
    }

    function applySolution(sol) {
        for(let r=0; r<R; r++) {
            for(let c=0; c<C-1; c++) hEdges[r][c] = (sol.h[r][c] === 1);
        }
        for(let r=0; r<R-1; r++) {
            for(let c=0; c<C; c++) vEdges[r][c] = (sol.v[r][c] === 1);
        }
        renderGrid();
    }

    function createSolutionNav(count) {
        const controlsDiv = document.querySelector('.controls');
        const navDiv = document.createElement('div');
        navDiv.id = 'sol-nav-container';
        navDiv.className = 'solution-nav';
        navDiv.style.display = 'flex';
        navDiv.style.justifyContent = 'center';
        navDiv.style.marginTop = '1rem';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn';
        prevBtn.innerHTML = '◀';
        prevBtn.onclick = () => navigateSolution(-1);

        const counter = document.createElement('div');
        counter.id = 'sol-counter';
        counter.style.margin = '0 1rem';
        counter.innerHTML = `1 / ${count}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn';
        nextBtn.innerHTML = '▶';
        nextBtn.onclick = () => navigateSolution(1);

        navDiv.appendChild(prevBtn);
        navDiv.appendChild(counter);
        navDiv.appendChild(nextBtn);
        
        const statusMsg = document.getElementById('status-msg');
        controlsDiv.insertBefore(navDiv, statusMsg.nextSibling);
    }

    function navigateSolution(delta) {
        if (foundSolutions.length === 0) return;
        let newIndex = currentSolIndex + delta;
        if (newIndex < 0) newIndex = foundSolutions.length - 1;
        if (newIndex >= foundSolutions.length) newIndex = 0;
        currentSolIndex = newIndex;
        applySolution(foundSolutions[currentSolIndex]);
        const counter = document.getElementById('sol-counter');
        if(counter) counter.innerHTML = `${currentSolIndex + 1} / ${foundSolutions.length}`;
    }
























