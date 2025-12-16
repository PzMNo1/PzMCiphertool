    // Kurotto Logic
    let R = 8;
    let C = 8;
    let clues = {}; // Key: "r,c", Value: number
    let cellStates = []; // 0: Empty(White), 1: Black
    let currentMode = 'edit'; // 'edit' or 'play'
    
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
                clues = data.clues || {};
                dataLoaded = true;
            } catch(e) { console.error("Data load failed"); }
        }
        initGrid(!dataLoaded);
    };

    function setMode(mode) {
        currentMode = mode;
        document.getElementById('mode-edit').className = mode === 'edit' ? 'mode-opt active' : 'mode-opt';
        document.getElementById('mode-play').className = mode === 'play' ? 'mode-opt active' : 'mode-opt';
        msg(mode === 'edit' ? "MODE: EDIT CLUES" : "MODE: SOLVING");
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
        
        if (rIn < 2 || cIn < 2 || rIn > 15 || cIn > 15) {
            msg("ERROR: Dimensions must be 2-15");
            return;
        }

        R = rIn;
        C = cIn;

        if (resetData) {
            clues = {};
        }
        // Reset state
        cellStates = Array(R).fill(0).map(() => Array(C).fill(0));

        const nav = document.getElementById('sol-nav-container');
        if(nav) nav.remove();

        renderGrid();
        if(resetData) msg("GRID INITIALIZED");
    }

    function renderGrid() {
        const container = document.getElementById('grid-container');
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${C}, var(--cell-size))`;
        container.style.gridTemplateRows = `repeat(${R}, var(--cell-size))`;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const cell = document.createElement('div');
                cell.className = 'k-cell';
                
                // Apply state style
                if (cellStates[r][c] === 1) cell.classList.add('black');
                
                // Check if clue exists
                const key = `${r},${c}`;
                if (key in clues) {
                    cell.classList.add('clue');
                    // Render circle
                    const circle = document.createElement('div');
                    circle.className = 'clue-circle';
                    
                    // Clue value
                    const val = clues[key];
                    
                    if (currentMode === 'edit') {
                        const input = document.createElement('input');
                        input.className = 'clue-input';
                        input.value = val;
                        input.onchange = (e) => {
                            const v = parseInt(e.target.value);
                            if (!isNaN(v) && v >= 0) {
                                clues[key] = v;
                            } else {
                                delete clues[key];
                            }
                            renderGrid();
                        };
                        // Stop propagation to prevent cell click
                        input.onclick = (e) => e.stopPropagation(); 
                        circle.appendChild(input);
                    } else {
                        circle.innerText = val;
                    }
                    cell.appendChild(circle);
                }

                cell.onclick = (e) => handleCellClick(r, c, e);
                // Right click to remove clue in edit mode
                cell.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (currentMode === 'edit') {
                        const k = `${r},${c}`;
                        if (k in clues) {
                            delete clues[k];
                        } else {
                            // Right click on empty cell in edit mode could maybe clear it?
                            // Or maybe add a specific "empty" clue?
                            // For now just delete if exists.
                        }
                        renderGrid();
                    }
                };

                container.appendChild(cell);
            }
        }
    }

    function handleCellClick(r, c, e) {
        if (currentMode === 'edit') {
            const key = `${r},${c}`;
            if (key in clues) {
                // If clicking existing clue, maybe focus input? 
                // But we handled input click separately.
                // Let's cycle: Remove clue -> Empty
                delete clues[key];
            } else {
                // Add clue with default 0
                clues[key] = 0;
            }
            renderGrid();
        } else {
            // Play mode: Toggle Black/White
            // Clue cells cannot be toggled (must be white)
            const key = `${r},${c}`;
            if (key in clues) return;

            cellStates[r][c] = cellStates[r][c] === 1 ? 0 : 1;
            renderGrid();
        }
    }

    function clearState() {
        cellStates = cellStates.map(row => row.map(() => 0));
        renderGrid();
        msg("BOARD CLEARED");
    }

    function copyToClipboard() {
        const data = { R, C, clues };
        const str = btoa(JSON.stringify(data));
        const url = window.location.href.split('?')[0] + '?data=' + str;
        navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
            msg("DATA COPIED TO CLIPBOARD");
        });
    }

    // --- Solver ---

    async function solvePuzzle() {
        document.getElementById('loading-overlay').style.display = 'flex';
        msg("SOLVING...");
        
        foundSolutions = [];
        currentSolIndex = 0;
        const nav = document.getElementById('sol-nav-container');
        if(nav) nav.remove();

        await new Promise(r => setTimeout(r, 100));

        try {
            // Solver Logic
            // Variables: cellStates[r][c] (0 or 1)
            // Constraints:
            // 1. Clue cells must be 0.
            // 2. Clue connectivity sum = clue value.
            
            // Pre-check: Set all clues to 0
            const tempGrid = Array(R).fill(0).map(() => Array(C).fill(0));
            const clueCells = [];
            
            for(let r=0; r<R; r++) {
                for(let c=0; c<C; c++) {
                    const k = `${r},${c}`;
                    if (k in clues) {
                        tempGrid[r][c] = 0; // Fixed White
                        clueCells.push({r, c, val: clues[k]});
                    } else {
                        tempGrid[r][c] = -1; // Unknown
                    }
                }
            }

            const unknownCells = [];
            for(let r=0; r<R; r++) {
                for(let c=0; c<C; c++) {
                    if (tempGrid[r][c] === -1) {
                        unknownCells.push({r, c});
                    }
                }
            }

            // Optimization: Sort unknown cells? 
            // Maybe checking connectivity is expensive, so we want to assign cells near clues first.
            // Sort unknownCells by distance to nearest clue.
            unknownCells.sort((a, b) => {
                const distA = Math.min(...clueCells.map(cl => Math.abs(cl.r - a.r) + Math.abs(cl.c - a.c)));
                const distB = Math.min(...clueCells.map(cl => Math.abs(cl.r - b.r) + Math.abs(cl.c - b.c)));
                return distA - distB;
            });

            const solutions = [];
            
            function checkClue(grid, cr, cc, targetVal) {
                // BFS from (cr, cc) to find connected black cells
                // Note: (cr, cc) is white. We look at its 4 neighbors.
                // If a neighbor is black, we BFS from it to find the size of that black component.
                // We sum up sizes of all unique black components touching the clue.
                
                // Actually, better approach:
                // Do a BFS starting from all black neighbors of the clue.
                // Since all connected black cells form a single component in the context of "being connected to the clue",
                // we can just BFS from the clue's neighbors through black cells.
                
                const visited = new Set();
                const q = [];
                
                // Add black neighbors
                const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                for(let [dr, dc] of dirs) {
                    const nr = cr + dr, nc = cc + dc;
                    if(nr>=0 && nr<R && nc>=0 && nc<C && grid[nr][nc] === 1) {
                        const k = `${nr},${nc}`;
                        if(!visited.has(k)) {
                            visited.add(k);
                            q.push([nr, nc]);
                        }
                    }
                }
                
                let count = 0;
                let head = 0;
                while(head < q.length) {
                    const [currR, currC] = q[head++];
                    count++;
                    
                    for(let [dr, dc] of dirs) {
                        const nr = currR + dr, nc = currC + dc;
                        if(nr>=0 && nr<R && nc>=0 && nc<C && grid[nr][nc] === 1) {
                            const k = `${nr},${nc}`;
                            if(!visited.has(k)) {
                                visited.add(k);
                                q.push([nr, nc]);
                            }
                        }
                    }
                }
                return count === targetVal;
            }
            
            // Check partial validity:
            // If current count > target, INVALID.
            // If current count + potential (unknown neighbors) < target, INVALID.
            function checkCluePartial(grid, cr, cc, targetVal) {
                 const visited = new Set();
                 const q = [];
                 let potentialExtra = 0;
                 
                 // Start with black neighbors
                 const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                 for(let [dr, dc] of dirs) {
                    const nr = cr + dr, nc = cc + dc;
                    if(nr>=0 && nr<R && nc>=0 && nc<C) {
                        if (grid[nr][nc] === 1) {
                            const k = `${nr},${nc}`;
                            if(!visited.has(k)) {
                                visited.add(k);
                                q.push([nr, nc]);
                            }
                        } else if (grid[nr][nc] === -1) {
                             // Unknown neighbor could start a chain
                             // This simple heuristic is hard because an unknown cell might connect to a huge reservoir of unknown cells.
                             // So we just assume infinite potential if any neighbor is unknown?
                             // Let's just check if current count > targetVal (pruning).
                        }
                    }
                }
                
                let count = 0;
                let head = 0;
                let hitsUnknown = false;

                while(head < q.length) {
                    const [currR, currC] = q[head++];
                    count++;
                    if (count > targetVal) return false; // Prune: Too many already

                    for(let [dr, dc] of dirs) {
                        const nr = currR + dr, nc = currC + dc;
                        if(nr>=0 && nr<R && nc>=0 && nc<C) {
                            if (grid[nr][nc] === 1) {
                                const k = `${nr},${nc}`;
                                if(!visited.has(k)) {
                                    visited.add(k);
                                    q.push([nr, nc]);
                                }
                            } else if (grid[nr][nc] === -1) {
                                hitsUnknown = true;
                            }
                        }
                    }
                }
                
                // If we finished exploring current black component and didn't hit any unknown cells,
                // then the count is final. If count != target, then invalid.
                if (!hitsUnknown && count !== targetVal) return false;
                
                return true;
            }

            function backtrack(idx) {
                if (solutions.length >= 10) return;

                if (idx === unknownCells.length) {
                    // Full assignment. Verify all clues.
                    let valid = true;
                    for(let cl of clueCells) {
                        if (!checkClue(tempGrid, cl.r, cl.c, cl.val)) {
                            valid = false;
                            break;
                        }
                    }
                    if (valid) {
                        // Copy solution
                        solutions.push(tempGrid.map(row => [...row]));
                    }
                    return;
                }

                const {r, c} = unknownCells[idx];

                // Try Black (1)
                tempGrid[r][c] = 1;
                
                // Pruning check: Check all clues. If any broken, backtrack.
                // For speed, maybe only check nearby clues?
                // Let's check all for now, optimization later if needed.
                let possible = true;
                for(let cl of clueCells) {
                    if (!checkCluePartial(tempGrid, cl.r, cl.c, cl.val)) {
                        possible = false;
                        break;
                    }
                }
                
                if (possible) backtrack(idx + 1);

                if (solutions.length >= 10) return;

                // Try White (0)
                tempGrid[r][c] = 0;
                
                possible = true;
                for(let cl of clueCells) {
                    // White placement can also break things (isolating a clue with too few blacks)
                    if (!checkCluePartial(tempGrid, cl.r, cl.c, cl.val)) {
                        possible = false;
                        break;
                    }
                }
                
                if (possible) backtrack(idx + 1);
                
                // Restore
                tempGrid[r][c] = -1;
            }

            backtrack(0);

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

    function applySolution(grid) {
        // Copy to cellStates
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                // If it was a clue, grid[r][c] is 0, which is fine.
                // But we need to preserve clues in 'clues' map (which we didn't touch).
                // cellStates should just reflect the grid.
                cellStates[r][c] = grid[r][c];
            }
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
        navDiv.style.alignItems = 'center';
        navDiv.style.marginTop = '1rem';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn';
        prevBtn.innerHTML = '◀';
        prevBtn.style.padding = '0.5rem 1rem';
        prevBtn.onclick = () => navigateSolution(-1);

        const counter = document.createElement('div');
        counter.id = 'sol-counter';
        counter.style.margin = '0 1rem';
        counter.innerHTML = `1 / ${count}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn';
        nextBtn.innerHTML = '▶';
        nextBtn.style.padding = '0.5rem 1rem';
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
























