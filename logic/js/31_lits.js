    // LITS Logic
    let R = 10;
    let C = 10;
    let hBorders = []; // R x C, true if bottom border
    let vBorders = []; // R x C, true if right border
    let cellStates = []; // 0: Unknown, 1: Shaded, 2: Empty
    let currentMode = 'edit'; // 'edit' or 'play'
    
    let foundSolutions = [];
    let currentSolIndex = 0;

    // Tetromino definitions (relative coordinates)
    const SHAPES = {
        'L': [
            [[0,0],[1,0],[2,0],[2,1]], // L
            [[0,0],[0,1],[0,2],[1,0]], // L-90
            [[0,0],[0,1],[1,1],[2,1]], // L-180
            [[0,2],[1,0],[1,1],[1,2]], // L-270
            [[0,1],[1,1],[2,1],[2,0]], // J (L mirrored)
            [[0,0],[1,0],[1,1],[1,2]], // J-90
            [[0,0],[0,1],[1,0],[2,0]], // J-180
            [[0,0],[0,1],[0,2],[1,2]]  // J-270
        ],
        'I': [
            [[0,0],[1,0],[2,0],[3,0]], // I vertical
            [[0,0],[0,1],[0,2],[0,3]]  // I horizontal
        ],
        'T': [
            [[0,0],[0,1],[0,2],[1,1]], // T
            [[0,0],[1,0],[2,0],[1,1]], // T-90
            [[1,0],[1,1],[1,2],[0,1]], // T-180
            [[1,0],[0,1],[1,1],[2,1]]  // T-270
        ],
        'S': [
            [[0,1],[0,2],[1,0],[1,1]], // S
            [[0,0],[1,0],[1,1],[2,1]], // S-90
            [[0,0],[0,1],[1,1],[1,2]], // Z
            [[0,1],[1,0],[1,1],[2,0]]  // Z-90
        ]
    };

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
                hBorders = data.hBorders;
                vBorders = data.vBorders;
                dataLoaded = true;
            } catch(e) { console.error("Data load failed"); }
        }
        initGrid(!dataLoaded);
    };

    function setMode(mode) {
        currentMode = mode;
        document.getElementById('mode-edit').className = mode === 'edit' ? 'mode-opt active' : 'mode-opt';
        document.getElementById('mode-play').className = mode === 'play' ? 'mode-opt active' : 'mode-opt';
        msg(mode === 'edit' ? "MODE: REGION EDITING" : "MODE: SOLVING");
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
            hBorders = Array(R).fill(0).map(() => Array(C).fill(false));
            vBorders = Array(R).fill(0).map(() => Array(C).fill(false));
        }
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
                cell.className = 'l-cell';
                
                // State
                if (cellStates[r][c] === 1) cell.classList.add('shaded');
                if (cellStates[r][c] === 2) cell.classList.add('empty');
                
                // Borders
                const isOuterRight = (c === C - 1);
                const isOuterBottom = (r === R - 1);
                
                if (isOuterRight) cell.style.borderRight = "3px solid #000";
                if (isOuterBottom) cell.style.borderBottom = "3px solid #000";
                if (r === 0) cell.style.borderTop = "3px solid #000";
                if (c === 0) cell.style.borderLeft = "3px solid #000";

                if (!isOuterRight && vBorders[r][c]) cell.classList.add('border-right');
                if (!isOuterBottom && hBorders[r][c]) cell.classList.add('border-bottom');

                cell.onclick = (e) => handleCellClick(r, c, e);

                // Border handles
                if (!isOuterRight) {
                    const handle = document.createElement('div');
                    handle.className = 'border-handle-v';
                    handle.onclick = (e) => { e.stopPropagation(); toggleBorder('v', r, c); };
                    cell.appendChild(handle);
                }
                if (!isOuterBottom) {
                    const handle = document.createElement('div');
                    handle.className = 'border-handle-h';
                    handle.onclick = (e) => { e.stopPropagation(); toggleBorder('h', r, c); };
                    cell.appendChild(handle);
                }

                container.appendChild(cell);
            }
        }
    }

    function toggleBorder(type, r, c) {
        if (type === 'v') vBorders[r][c] = !vBorders[r][c];
        if (type === 'h') hBorders[r][c] = !hBorders[r][c];
        renderGrid();
    }

    function handleCellClick(r, c, e) {
        if (currentMode === 'play') {
            // Cycle: Unknown -> Shaded -> Empty -> Unknown
            cellStates[r][c] = (cellStates[r][c] + 1) % 3;
            renderGrid();
        }
    }

    function clearState() {
        cellStates = cellStates.map(row => row.map(() => 0));
        renderGrid();
        msg("BOARD CLEARED");
    }

    function copyToClipboard() {
        const data = { R, C, hBorders, vBorders };
        const str = btoa(JSON.stringify(data));
        const url = window.location.href.split('?')[0] + '?data=' + str;
        navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
            msg("DATA COPIED TO CLIPBOARD");
        });
    }

    // --- Solver ---
    
    function findRegions() {
        const visited = Array(R).fill(0).map(() => Array(C).fill(false));
        const regions = [];
        
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (!visited[r][c]) {
                    const cells = [];
                    const q = [[r, c]];
                    visited[r][c] = true;
                    
                    while(q.length) {
                        const [currR, currC] = q.shift();
                        cells.push({r: currR, c: currC});
                        
                        // Check neighbors taking borders into account
                        // Up
                        if (currR > 0 && !hBorders[currR-1][currC] && !visited[currR-1][currC]) {
                            visited[currR-1][currC] = true; q.push([currR-1, currC]);
                        }
                        // Down
                        if (currR < R-1 && !hBorders[currR][currC] && !visited[currR+1][currC]) {
                            visited[currR+1][currC] = true; q.push([currR+1, currC]);
                        }
                        // Left
                        if (currC > 0 && !vBorders[currR][currC-1] && !visited[currR][currC-1]) {
                            visited[currR][currC-1] = true; q.push([currR, currC-1]);
                        }
                        // Right
                        if (currC < C-1 && !vBorders[currR][currC] && !visited[currR][currC+1]) {
                            visited[currR][currC+1] = true; q.push([currR, currC+1]);
                        }
                    }
                    regions.push(cells);
                }
            }
        }
        return regions;
    }

    async function solvePuzzle() {
        document.getElementById('loading-overlay').style.display = 'flex';
        msg("SOLVING...");
        
        foundSolutions = [];
        currentSolIndex = 0;
        const nav = document.getElementById('sol-nav-container');
        if(nav) nav.remove();

        await new Promise(r => setTimeout(r, 100));

        try {
            const regions = findRegions();
            
            // 1. Precompute valid placements per region
            const regionOptions = [];
            for(let reg of regions) {
                if (reg.length < 4) {
                    msg("ERROR: REGION SIZE < 4");
                    document.getElementById('loading-overlay').style.display = 'none';
                    return;
                }
                
                const opts = [];
                const regSet = new Set(reg.map(c => `${c.r},${c.c}`));
                
                // Try to place every shape at every cell in region
                for (let type in SHAPES) {
                    for (let shape of SHAPES[type]) {
                        // shape is list of [dr, dc]
                        // Try anchoring at each cell of region
                        // Optimization: we only need to anchor at one cell of the shape to cover all positions
                        // But iterating all region cells as anchor point ensures we cover all.
                        // We must filter duplicates.
                        
                        for (let anchor of reg) {
                            const cells = [];
                            let valid = true;
                            
                            for(let [dr, dc] of shape) {
                                const nr = anchor.r + dr;
                                const nc = anchor.c + dc;
                                if (!regSet.has(`${nr},${nc}`)) {
                                    valid = false;
                                    break;
                                }
                                cells.push({r: nr, c: nc});
                            }
                            
                            if (valid) {
                                // Check internal 2x2
                                if (has2x2(cells)) continue;

                                // Deduplicate
                                // Sort cells by r then c to create signature
                                cells.sort((a,b) => (a.r - b.r) || (a.c - b.c));
                                const sig = cells.map(c => `${c.r},${c.c}`).join('|');
                                
                                // Check if we already have this placement for this region
                                // (Different anchor + same shape can result in same placement)
                                const exists = opts.some(o => o.sig === sig);
                                if (!exists) {
                                    opts.push({ type, cells, sig });
                                }
                            }
                        }
                    }
                }
                
                if (opts.length === 0) {
                    msg("IMPOSSIBLE REGION");
                    document.getElementById('loading-overlay').style.display = 'none';
                    return;
                }
                regionOptions.push(opts);
            }
            
            // 2. Backtracking
            const solutions = [];
            const currentGrid = Array(R).fill(0).map(() => Array(C).fill(0)); // 0:Empty, 1:Shaded
            const typeGrid = Array(R).fill(0).map(() => Array(C).fill(null)); // Store type at shaded cells

            function has2x2(cells) {
                const set = new Set(cells.map(c => `${c.r},${c.c}`));
                for(let c of cells) {
                    // Check if this cell is top-left of 2x2
                    if (set.has(`${c.r+1},${c.c}`) && 
                        set.has(`${c.r},${c.c+1}`) && 
                        set.has(`${c.r+1},${c.c+1}`)) return true;
                }
                return false;
            }
            
            function checkGlobal2x2AndTouch(newCells, type) {
                // Check if adding newCells creates a 2x2 with existing cells
                // Also check touching same type
                
                for(let cell of newCells) {
                    const r = cell.r;
                    const c = cell.c;
                    
                    // 2x2 check involving (r,c)
                    // Top-Left
                    if (r>0 && c>0 && currentGrid[r-1][c-1] && currentGrid[r-1][c] && currentGrid[r][c-1]) return false;
                    // Top-Right
                    if (r>0 && c<C-1 && currentGrid[r-1][c+1] && currentGrid[r-1][c] && currentGrid[r][c+1]) return false;
                    // Bottom-Left
                    if (r<R-1 && c>0 && currentGrid[r+1][c-1] && currentGrid[r+1][c] && currentGrid[r][c-1]) return false;
                    // Bottom-Right
                    if (r<R-1 && c<C-1 && currentGrid[r+1][c+1] && currentGrid[r+1][c] && currentGrid[r][c+1]) return false;
                    
                    // Same type touch check
                    const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
                    for(let [dr, dc] of neighbors) {
                        const nr = r+dr, nc = c+dc;
                        if(nr>=0 && nr<R && nc>=0 && nc<C && currentGrid[nr][nc]) {
                            if (typeGrid[nr][nc] === type) return false;
                        }
                    }
                }
                return true;
            }

            function checkConnectivity() {
                // Find first shaded cell
                let start = null;
                let totalShaded = 0;
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        if(currentGrid[r][c]) {
                            if(!start) start = {r, c};
                            totalShaded++;
                        }
                    }
                }
                
                if (totalShaded === 0) return true; // Empty grid
                
                // BFS
                const q = [start];
                const visited = new Set([`${start.r},${start.c}`]);
                let count = 0;
                
                while(q.length) {
                    const {r, c} = q.shift();
                    count++;
                    
                    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                    for(let [dr, dc] of dirs) {
                        const nr = r+dr, nc = c+dc;
                        if(nr>=0 && nr<R && nc>=0 && nc<C && currentGrid[nr][nc]) {
                            const key = `${nr},${nc}`;
                            if(!visited.has(key)) {
                                visited.add(key);
                                q.push({r:nr, c:nc});
                            }
                        }
                    }
                }
                
                return count === totalShaded;
            }

            function solve(idx) {
                if (solutions.length >= 10) return;
                
                if (idx === regions.length) {
                    if (checkConnectivity()) {
                        solutions.push(currentGrid.map(r => [...r]));
                    }
                    return;
                }
                
                const options = regionOptions[idx];
                
                for(let opt of options) {
                    // Try placing
                    // Check consistency with already placed
                    let consistent = checkGlobal2x2AndTouch(opt.cells, opt.type);
                    
                    if (consistent) {
                        // Apply
                        for(let c of opt.cells) {
                            currentGrid[c.r][c.c] = 1;
                            typeGrid[c.r][c.c] = opt.type;
                        }
                        
                        solve(idx+1);
                        if (solutions.length >= 10) return;
                        
                        // Backtrack
                        for(let c of opt.cells) {
                            currentGrid[c.r][c.c] = 0;
                            typeGrid[c.r][c.c] = null;
                        }
                    }
                }
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

    function applySolution(grid) {
        cellStates = cellStates.map(row => row.map(() => 2)); // Reset to Empty
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (grid[r][c] === 1) cellStates[r][c] = 1;
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
























