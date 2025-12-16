    // Magnets Logic
    let R = 6;
    let C = 6;
    let hBorders = []; // R x C
    let vBorders = []; // R x C
    let cellStates = []; // 0:Empty, 1:+, 2:-, 3:Neutral(Black)
    
    // Clues
    let topClues = [];
    let leftClues = [];
    let bottomClues = [];
    let rightClues = [];

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
                hBorders = data.hBorders;
                vBorders = data.vBorders;
                topClues = data.topClues;
                leftClues = data.leftClues;
                bottomClues = data.bottomClues;
                rightClues = data.rightClues;
                dataLoaded = true;
            } catch(e) { console.error("Data load failed"); }
        }
        initGrid(!dataLoaded);
    };

    function setMode(mode) {
        currentMode = mode;
        document.getElementById('mode-edit').className = mode === 'edit' ? 'mode-opt active' : 'mode-opt';
        document.getElementById('mode-play').className = mode === 'play' ? 'mode-opt active' : 'mode-opt';
        msg(mode === 'edit' ? "MODE: EDIT DOMINOES" : "MODE: SOLVING");
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
            hBorders = Array(R).fill(0).map(() => Array(C).fill(false));
            vBorders = Array(R).fill(0).map(() => Array(C).fill(false));
            topClues = Array(C).fill(null);
            leftClues = Array(R).fill(null);
            bottomClues = Array(C).fill(null);
            rightClues = Array(R).fill(null);
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
        
        // Layout: 3 rows (Top clues, Grid, Bottom clues), 3 cols (Left clues, Grid, Right clues)
        // But actually simpler to just use R+2 rows and C+2 cols
        
        container.style.gridTemplateColumns = `var(--cell-size) repeat(${C}, var(--cell-size)) var(--cell-size)`;
        container.style.gridTemplateRows = `var(--cell-size) repeat(${R}, var(--cell-size)) var(--cell-size)`;

        // Top Row: Corner, Top Clues, Corner
        createCorner(container);
        for(let c=0; c<C; c++) createClue(container, c, topClues, 'top');
        createCorner(container);

        // Main Rows
        for(let r=0; r<R; r++) {
            // Left Clue
            createClue(container, r, leftClues, 'left');
            
            // Grid Cells
            for(let c=0; c<C; c++) {
                const cell = document.createElement('div');
                cell.className = 'm-cell';
                
                // State
                if (cellStates[r][c] === 1) cell.classList.add('plus');
                else if (cellStates[r][c] === 2) cell.classList.add('minus');
                else if (cellStates[r][c] === 3) cell.classList.add('neutral');

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

                // Handles
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
            
            // Right Clue
            createClue(container, r, rightClues, 'right');
        }

        // Bottom Row
        createCorner(container);
        for(let c=0; c<C; c++) createClue(container, c, bottomClues, 'bottom');
        createCorner(container);
    }

    function createCorner(container) {
        const div = document.createElement('div');
        div.className = 'corner';
        container.appendChild(div);
    }

    function createClue(container, idx, arr, type) {
        const div = document.createElement('div');
        div.className = `clue-box clue-${type}`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'clue-input';
        input.value = arr[idx] !== null ? arr[idx] : '';
        input.placeholder = type === 'top' || type === 'left' ? '+' : '-';
        input.onchange = (e) => {
            const v = parseInt(e.target.value);
            arr[idx] = isNaN(v) ? null : v;
        };
        
        div.appendChild(input);
        container.appendChild(div);
    }

    function toggleBorder(type, r, c) {
        if (type === 'v') vBorders[r][c] = !vBorders[r][c];
        if (type === 'h') hBorders[r][c] = !hBorders[r][c];
        renderGrid();
    }

    function handleCellClick(r, c, e) {
        if (currentMode === 'play') {
            // Cycle: Empty -> + -> - -> Neutral -> Empty
            cellStates[r][c] = (cellStates[r][c] + 1) % 4;
            renderGrid();
        }
    }

    function clearState() {
        cellStates = cellStates.map(row => row.map(() => 0));
        renderGrid();
        msg("BOARD CLEARED");
    }

    function copyToClipboard() {
        const data = { R, C, hBorders, vBorders, topClues, leftClues, bottomClues, rightClues };
        const str = btoa(JSON.stringify(data));
        const url = window.location.href.split('?')[0] + '?data=' + str;
        navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
            msg("DATA COPIED TO CLIPBOARD");
        });
    }

    // --- Solver ---
    
    function findDominoes() {
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
                        
                        // Neighbors with no border
                        if (currR > 0 && !hBorders[currR-1][currC] && !visited[currR-1][currC]) {
                            visited[currR-1][currC] = true; q.push([currR-1, currC]);
                        }
                        if (currR < R-1 && !hBorders[currR][currC] && !visited[currR+1][currC]) {
                            visited[currR+1][currC] = true; q.push([currR+1, currC]);
                        }
                        if (currC > 0 && !vBorders[currR][currC-1] && !visited[currR][currC-1]) {
                            visited[currR][currC-1] = true; q.push([currR, currC-1]);
                        }
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
            const dominoes = findDominoes();
            
            // Validate dominoes
            for(let d of dominoes) {
                if(d.length !== 2) {
                    msg("ERROR: ALL REGIONS MUST BE DOMINOES (SIZE 2)");
                    document.getElementById('loading-overlay').style.display = 'none';
                    return;
                }
            }

            // Solve
            const solutions = [];
            const grid = Array(R).fill(0).map(() => Array(C).fill(0)); // 0:Empty, 1:+, 2:-, 3:Neutral

            const finalTop = topClues.map(x => x === null ? -1 : x);
            const finalLeft = leftClues.map(x => x === null ? -1 : x);
            const finalBottom = bottomClues.map(x => x === null ? -1 : x);
            const finalRight = rightClues.map(x => x === null ? -1 : x);

            // Current counts
            const currTop = Array(C).fill(0);
            const currLeft = Array(R).fill(0);
            const currBottom = Array(C).fill(0);
            const currRight = Array(R).fill(0);

            function checkConstraints(r, c, type) {
                // 1. Clues
                if (finalTop[c] !== -1 && currTop[c] > finalTop[c]) return false;
                if (finalLeft[r] !== -1 && currLeft[r] > finalLeft[r]) return false;
                if (finalBottom[c] !== -1 && currBottom[c] > finalBottom[c]) return false;
                if (finalRight[r] !== -1 && currRight[r] > finalRight[r]) return false;

                // 2. Neighbors
                if (type === 3) return true; // Neutral doesn't care

                const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
                for(let [dr, dc] of neighbors) {
                    const nr = r+dr, nc = c+dc;
                    if (nr>=0 && nr<R && nc>=0 && nc<C && grid[nr][nc] === type) {
                        // If neighbor is same type, check if it's the SAME DOMINO
                        // Since we iterate by dominoes, previously placed cells are from DIFFERENT dominoes.
                        // So if we find a neighbor with same type, it's an error.
                        // Wait, we only fill previous dominoes.
                        // The other half of current domino is not yet filled or is being filled.
                        // We fill dominoes atomically.
                        return false;
                    }
                }
                return true;
            }
            
            function addCount(r, c, type) {
                if (type === 1) { currTop[c]++; currLeft[r]++; }
                if (type === 2) { currBottom[c]++; currRight[r]++; }
            }
            
            function removeCount(r, c, type) {
                if (type === 1) { currTop[c]--; currLeft[r]--; }
                if (type === 2) { currBottom[c]--; currRight[r]--; }
            }

            function solve(idx) {
                if (solutions.length >= 10) return;

                if (idx === dominoes.length) {
                    // Final validation of counts
                    for(let i=0; i<C; i++) if(finalTop[i] !== -1 && currTop[i] !== finalTop[i]) return;
                    for(let i=0; i<R; i++) if(finalLeft[i] !== -1 && currLeft[i] !== finalLeft[i]) return;
                    for(let i=0; i<C; i++) if(finalBottom[i] !== -1 && currBottom[i] !== finalBottom[i]) return;
                    for(let i=0; i<R; i++) if(finalRight[i] !== -1 && currRight[i] !== finalRight[i]) return;
                    
                    solutions.push(grid.map(row => [...row]));
                    return;
                }

                const d = dominoes[idx];
                const [c1, c2] = d;

                // Option 1: Neutral (3, 3)
                grid[c1.r][c1.c] = 3;
                grid[c2.r][c2.c] = 3;
                
                // Neutral always valid locally (no adjacent rule for neutrals)
                // Counts don't change.
                solve(idx+1);
                if (solutions.length >= 10) return;
                
                // Option 2: (+, -) -> c1=+, c2=-
                grid[c1.r][c1.c] = 1;
                grid[c2.r][c2.c] = 2;
                addCount(c1.r, c1.c, 1);
                addCount(c2.r, c2.c, 2);
                
                if (checkConstraints(c1.r, c1.c, 1) && checkConstraints(c2.r, c2.c, 2)) {
                    solve(idx+1);
                }
                
                removeCount(c1.r, c1.c, 1);
                removeCount(c2.r, c2.c, 2);
                if (solutions.length >= 10) return;

                // Option 3: (-, +) -> c1=-, c2=+
                grid[c1.r][c1.c] = 2;
                grid[c2.r][c2.c] = 1;
                addCount(c1.r, c1.c, 2);
                addCount(c2.r, c2.c, 1);

                if (checkConstraints(c1.r, c1.c, 2) && checkConstraints(c2.r, c2.c, 1)) {
                    solve(idx+1);
                }
                
                removeCount(c1.r, c1.c, 2);
                removeCount(c2.r, c2.c, 1);
                
                // Cleanup
                grid[c1.r][c1.c] = 0;
                grid[c2.r][c2.c] = 0;
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
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
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
























