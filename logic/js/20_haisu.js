document.addEventListener('DOMContentLoaded', function() {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const createGridBtn = document.getElementById('create-grid');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const solutionNav = document.getElementById('solutionNav');
    const solutionCount = document.getElementById('solution-count');
    const prevSolution = document.getElementById('prev-solution');
    const nextSolution = document.getElementById('next-solution');
    const backToEditBtn = document.getElementById('back-to-edit');
    
    let currentRows = 6;
    let currentCols = 6;
    let gridState = []; // 'S', 'G', number, or null
    let edgeState = {}; 
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    let isDragging = false;
    let dragStartPos = null;
    
    createGridBtn.addEventListener('click', function() {
        currentRows = parseInt(rowsInput.value);
        currentCols = parseInt(colsInput.value);
        if (currentRows < 2) currentRows = 2;
        if (currentCols < 2) currentCols = 2;
        if (currentRows > 15) currentRows = 15;
        if (currentCols > 15) currentCols = 15;
        
        rowsInput.value = currentRows;
        colsInput.value = currentCols;
        createEmptyGrid();
    });
    
    function createEmptyGrid() {
        solutions = [];
        currentSolutionIndex = 0;
        solutionNav.style.display = 'none';
        result.innerHTML = '';
        
        gridState = Array(currentRows).fill().map(() => 
            Array(currentCols).fill().map(() => null));
        edgeState = {};
        
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        puzzleGrid.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        puzzleGrid.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;
        puzzleGrid.style.position = 'relative';
        
        for(let r=0; r<currentRows; r++) {
            for(let c=0; c<currentCols; c++) {
                createGridCell(r, c);
            }
        }
        
        createGridLines();
        updateGridLines();
    }
    
    function createGridCell(r, c) {
        const div = document.createElement('div');
        div.className = 'haisu-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, gridState[r][c]);
        
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            this.contentEditable = true;
            this.classList.add('editing');
            this.textContent = '';
            this.focus();
            
            const saveVal = (e) => {
                let val = e.target.textContent.trim();
                if (val.toUpperCase() === 'S') {
                    gridState[r][c] = 'S';
                } else if (val.toUpperCase() === 'G') {
                    gridState[r][c] = 'G';
                } else if (val && !isNaN(val) && parseInt(val) > 0) {
                    gridState[r][c] = parseInt(val);
                } else {
                    gridState[r][c] = null;
                }
                this.contentEditable = false;
                this.classList.remove('editing');
                updateCellDisplay(this, gridState[r][c]);
            };
            
            this.addEventListener('blur', saveVal, { once: true });
            this.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                }
            });
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, val) {
        el.className = 'haisu-cell';
        el.textContent = '';
        
        if (val === 'S') {
            el.classList.add('start');
            el.textContent = 'S';
        } else if (val === 'G') {
            el.classList.add('goal');
            el.textContent = 'G';
        } else if (typeof val === 'number') {
            el.classList.add('clue');
            el.textContent = val;
        }
    }
    
    // Grid Lines Logic (similar to Aqre/Countryroad)
    function createGridLines() {
        const existingLines = puzzleGrid.querySelectorAll('.grid-line');
        existingLines.forEach(line => line.remove());
        
        const padding = 10; // from .haisu-grid padding
        const cellSize = 40;
        
        // Horizontal Lines
        for(let r=1; r<currentRows; r++) {
            for(let c=0; c<currentCols; c++) {
                const line = document.createElement('div');
                line.className = 'grid-line horizontal-line';
                line.dataset.type = 'h';
                line.dataset.r = r;
                line.dataset.c = c;
                line.dataset.id = `h_${r}_${c}`;
                
                line.style.position = 'absolute';
                line.style.left = `${padding + c * cellSize}px`;
                line.style.top = `${padding + r * cellSize - 4}px`;
                line.style.width = `${cellSize}px`;
                line.style.backgroundColor = 'transparent';
                line.style.zIndex = 30;
                
                if (edgeState[line.dataset.id]) line.classList.add('active');
                
                line.addEventListener('mousedown', handleLineMouseDown);
                puzzleGrid.appendChild(line);
            }
        }
        
        // Vertical Lines
        for(let r=0; r<currentRows; r++) {
            for(let c=1; c<currentCols; c++) {
                const line = document.createElement('div');
                line.className = 'grid-line vertical-line';
                line.dataset.type = 'v';
                line.dataset.r = r;
                line.dataset.c = c;
                line.dataset.id = `v_${r}_${c}`;
                
                line.style.position = 'absolute';
                line.style.left = `${padding + c * cellSize - 4}px`;
                line.style.top = `${padding + r * cellSize}px`;
                line.style.height = `${cellSize}px`;
                line.style.backgroundColor = 'transparent';
                line.style.zIndex = 30;
                
                if (edgeState[line.dataset.id]) line.classList.add('active');
                
                line.addEventListener('mousedown', handleLineMouseDown);
                puzzleGrid.appendChild(line);
            }
        }
        
        document.removeEventListener('mousemove', handleGridLineDrag);
        document.addEventListener('mousemove', handleGridLineDrag);
        document.removeEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    function handleLineMouseDown(e) {
        if (isShowingSolution) return;
        const lineId = this.dataset.id;
        toggleEdgeLine(lineId, this);
        isDragging = true;
        dragStartPos = { type: this.dataset.type, r: parseInt(this.dataset.r), c: parseInt(this.dataset.c), lineId: lineId };
        e.preventDefault();
        e.stopPropagation();
    }

    function handleGridLineDrag(e) {
        if (!isDragging || !dragStartPos || isShowingSolution) return;
        
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const gridLines = puzzleGrid.querySelectorAll(`.grid-line.${dragStartPos.type === 'h' ? 'horizontal-line' : 'vertical-line'}`);
        
        gridLines.forEach(line => {
            const rect = line.getBoundingClientRect();
            const lineId = line.dataset.id;
            
            if (lineId === dragStartPos.lineId) return;
            
            let isOver = false;
            if (dragStartPos.type === 'h') {
                if (Math.abs(mouseY - (rect.top + rect.height/2)) < 20 && mouseX >= rect.left && mouseX <= rect.right) isOver = true;
            } else {
                if (Math.abs(mouseX - (rect.left + rect.width/2)) < 20 && mouseY >= rect.top && mouseY <= rect.bottom) isOver = true;
            }
            
            if (isOver) {
                toggleEdgeLine(lineId, line);
                dragStartPos.lineId = lineId;
            }
        });
        e.preventDefault();
    }
    
    function handleMouseUp() {
        isDragging = false;
        dragStartPos = null;
    }
    
    function toggleEdgeLine(lineId, lineElement) {
        edgeState[lineId] = !edgeState[lineId];
        if (!edgeState[lineId]) {
            delete edgeState[lineId];
            lineElement.classList.remove('active');
        } else {
            lineElement.classList.add('active');
        }
    }
    
    function updateGridLines() {
        const gridLines = puzzleGrid.querySelectorAll('.grid-line');
        gridLines.forEach(line => {
            const lineId = line.dataset.id;
            if (edgeState[lineId]) line.classList.add('active');
            else line.classList.remove('active');
        });
    }
    
    solveBtn.addEventListener('click', function() {
        result.innerHTML = '';
        loading.style.display = 'flex';
        let loadingTime = 0;
        const loadingTimer = setInterval(() => {
            loadingTime++;
            document.getElementById('loading-time').textContent = loadingTime;
        }, 1000);
        
        const puzzle = {
            R: currentRows,
            C: currentCols,
            grid: gridState,
            edges: edgeState
        };
        
        setTimeout(() => {
            try {
                solutions = jsHaisuSolver(puzzle);
                if (!solutions || solutions.length === 0) {
                    result.innerHTML = `<div class="error-msg">未找到解决方案</div>`;
                } else {
                    currentSolutionIndex = 0;
                    isShowingSolution = true;
                    displaySolution(currentSolutionIndex);
                    solutionNav.style.display = 'flex';
                    solutionCount.textContent = `${currentSolutionIndex + 1}/${solutions.length}`;
                    result.innerHTML = `<div class="success-msg">找到 ${solutions.length} 个解决方案</div>`;
                }
            } catch (e) {
                console.error("求解错误:", e);
                result.innerHTML = `<div class="error-msg">求解出错: ${e.message}</div>`;
            } finally {
                loading.style.display = 'none';
                clearInterval(loadingTimer);
            }
        }, 50);
    });
    
    function displaySolution(index) {
        if (!solutions || !solutions.length) return;
        const sol = solutions[index];
        
        // Clear previous path
        const existingPath = puzzleGrid.querySelectorAll('.path-line, .path-center');
        existingPath.forEach(el => el.remove());
        
        const cells = puzzleGrid.querySelectorAll('.haisu-cell');
        // sol is grid of parent directions: '^', 'v', '<', '>', '.'
        
        for(let r=0; r<currentRows; r++) {
            for(let c=0; c<currentCols; c++) {
                const cell = cells[r*currentCols + c];
                const dir = sol[r][c];
                
                // Draw center dot
                const center = document.createElement('div');
                center.className = 'path-center';
                cell.appendChild(center);
                
                // Draw line to parent
                if (dir !== '.' && dir !== null) {
                    const line = document.createElement('div');
                    line.className = 'path-line';
                    if (dir === '^') { // Parent is Up
                        line.style.width = '4px';
                        line.style.height = '50%';
                        line.style.top = '0';
                        line.style.left = 'calc(50% - 2px)';
                    } else if (dir === 'v') { // Parent is Down
                        line.style.width = '4px';
                        line.style.height = '50%';
                        line.style.top = '50%';
                        line.style.left = 'calc(50% - 2px)';
                    } else if (dir === '<') { // Parent is Left
                        line.style.height = '4px';
                        line.style.width = '50%';
                        line.style.left = '0';
                        line.style.top = 'calc(50% - 2px)';
                    } else if (dir === '>') { // Parent is Right
                        line.style.height = '4px';
                        line.style.width = '50%';
                        line.style.left = '50%';
                        line.style.top = 'calc(50% - 2px)';
                    }
                    cell.appendChild(line);
                }
                
                // Draw line from children
                // (Need to scan neighbors to see if they point to this)
                const dirs = [
                    {dr: -1, dc: 0, from: 'v'}, // Up neighbor points Down
                    {dr: 1, dc: 0, from: '^'},  // Down neighbor points Up
                    {dr: 0, dc: -1, from: '>'}, // Left neighbor points Right
                    {dr: 0, dc: 1, from: '<'}   // Right neighbor points Left
                ];
                
                for(const d of dirs) {
                    const nr = r + d.dr;
                    const nc = c + d.dc;
                    if (nr >= 0 && nr < currentRows && nc >= 0 && nc < currentCols) {
                        if (sol[nr][nc] === d.from) {
                            const line = document.createElement('div');
                            line.className = 'path-line';
                            if (d.dr === -1) { // Child is Up
                                line.style.width = '4px';
                                line.style.height = '50%';
                                line.style.top = '0';
                                line.style.left = 'calc(50% - 2px)';
                            } else if (d.dr === 1) { // Child is Down
                                line.style.width = '4px';
                                line.style.height = '50%';
                                line.style.top = '50%';
                                line.style.left = 'calc(50% - 2px)';
                            } else if (d.dc === -1) { // Child is Left
                                line.style.height = '4px';
                                line.style.width = '50%';
                                line.style.left = '0';
                                line.style.top = 'calc(50% - 2px)';
                            } else if (d.dc === 1) { // Child is Right
                                line.style.height = '4px';
                                line.style.width = '50%';
                                line.style.left = '50%';
                                line.style.top = 'calc(50% - 2px)';
                            }
                            cell.appendChild(line);
                        }
                    }
                }
            }
        }
        
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        const existingPath = puzzleGrid.querySelectorAll('.path-line, .path-center');
        existingPath.forEach(el => el.remove());
        renderPuzzleGrid();
    });
    
    resetBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        createEmptyGrid();
    });
    
    prevSolution.addEventListener('click', function() {
        if (solutions.length > 1) {
            currentSolutionIndex = (currentSolutionIndex - 1 + solutions.length) % solutions.length;
            displaySolution(currentSolutionIndex);
        }
    });
    
    nextSolution.addEventListener('click', function() {
        if (solutions.length > 1) {
            currentSolutionIndex = (currentSolutionIndex + 1) % solutions.length;
            displaySolution(currentSolutionIndex);
        }
    });
    
    // --- Haisu Solver ---
    function jsHaisuSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const maxSolutions = 5;
        
        // Identify Regions
        const regionMap = Array(R).fill().map(() => Array(C).fill(-1));
        const regions = [];
        let startPos = null;
        let goalPos = null;
        
        // Parse Grid
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                const val = puzzle.grid[r][c];
                if (val === 'S') startPos = {r, c};
                if (val === 'G') goalPos = {r, c};
            }
        }
        
        if (!startPos || !goalPos) throw new Error("Start (S) and Goal (G) required");
        
        // BFS for regions
        let regionCount = 0;
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (regionMap[r][c] === -1) {
                    const q = [{r,c}];
                    regionMap[r][c] = regionCount;
                    const cells = [{r,c}];
                    let clue = null;
                    
                    if (typeof puzzle.grid[r][c] === 'number') clue = puzzle.grid[r][c];
                    
                    let head = 0;
                    while(head < q.length) {
                        const curr = q[head++];
                        const dirs = [
                            {dr: -1, dc: 0, type: 'h', id: `h_${curr.r}_${curr.c}`}, // Up (h line at r)
                            {dr: 1, dc: 0, type: 'h', id: `h_${curr.r+1}_${curr.c}`}, // Down (h line at r+1)
                            {dr: 0, dc: -1, type: 'v', id: `v_${curr.r}_${curr.c}`}, // Left (v line at c)
                            {dr: 0, dc: 1, type: 'v', id: `v_${curr.r}_${curr.c+1}`}  // Right (v line at c+1)
                        ];
                        // Wait, edge IDs logic in `createGridLines`:
                        // H line at (r, c) is between (r-1, c) and (r, c) ?
                        // Code: h_${r}_${c} at top of cell (r,c). So it separates (r-1,c) and (r,c).
                        // Correct.
                        // V line at (r, c) is at left of cell (r,c). Separates (r, c-1) and (r, c).
                        
                        for(const d of dirs) {
                            const nr = curr.r + d.dr;
                            const nc = curr.c + d.dc;
                            
                            // Check boundary
                            if (nr>=0 && nr<R && nc>=0 && nc<C) {
                                // Check Edge
                                // Logic check:
                                // Up neighbor: (r-1, c). Edge is h_${r}_${c}.
                                // Down neighbor: (r+1, c). Edge is h_${r+1}_${c}.
                                // Left neighbor: (r, c-1). Edge is v_${r}_${c}.
                                // Right neighbor: (r, c+1). Edge is v_${r}_${c+1}.
                                
                                let edgeId;
                                if (d.dr === -1) edgeId = `h_${curr.r}_${curr.c}`;
                                else if (d.dr === 1) edgeId = `h_${curr.r+1}_${curr.c}`;
                                else if (d.dc === -1) edgeId = `v_${curr.r}_${curr.c}`;
                                else edgeId = `v_${curr.r}_${curr.c+1}`;
                                
                                if (!puzzle.edges[edgeId]) {
                                    if (regionMap[nr][nc] === -1) {
                                        regionMap[nr][nc] = regionCount;
                                        q.push({r: nr, c: nc});
                                        cells.push({r: nr, c: nc});
                                        if (typeof puzzle.grid[nr][nc] === 'number') {
                                            if (clue !== null && clue !== puzzle.grid[nr][nc]) throw new Error("Conflicting clues in region");
                                            clue = puzzle.grid[nr][nc];
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    regions.push({id: regionCount, cells, clue});
                    regionCount++;
                }
            }
        }
        
        // Path Finding (Hamiltonian Path S->G)
        // Constraints:
        // 1. Visit every cell exactly once.
        // 2. In each region, enter/leave such that total visits = K.
        // Wait, "visit N times" means N distinct segments? 
        // "Number of times the path enters the region"?
        // Standard Haisu rule: "The path must pass through region X exactly N times."
        // Passing through involves entering and leaving (or starting/ending).
        // It counts the number of disconnected path segments within the region.
        
        // State:
        // Visited grid (boolean)
        // Current path (stack)
        // Region segment counts
        
        const visited = Array(R).fill().map(() => Array(C).fill(false));
        const pathGrid = Array(R).fill().map(() => Array(C).fill(null)); // Store direction to parent
        const solutions = [];
        
        const regionSegments = new Int32Array(regionCount).fill(0);
        // Track if currently inside a region to detect segment start
        // But we move cell by cell.
        // When moving A -> B:
        // If region(A) != region(B):
        //   Region(A) segment finished? Yes (unless we return later, which is a new segment).
        //   Region(B) segment started.
        
        // S counts as start of first segment for Region(S).
        regionSegments[regionMap[startPos.r][startPos.c]] = 1;
        visited[startPos.r][startPos.c] = true;
        pathGrid[startPos.r][startPos.c] = '.'; // Root
        
        function solve(currR, currC, count) {
            if (solutions.length >= maxSolutions) return;
            
            if (currR === goalPos.r && currC === goalPos.c) {
                // Reached Goal.
                // Check if all cells visited
                if (count !== R * C) return;
                
                // Check all region clues
                for(let i=0; i<regionCount; i++) {
                    if (regions[i].clue !== null && regionSegments[i] !== regions[i].clue) return;
                }
                
                // Found solution
                solutions.push(pathGrid.map(row => [...row]));
                return;
            }
            
            // Try neighbors
            const dirs = [
                {r: -1, c: 0, val: '^'}, 
                {r: 1, c: 0, val: 'v'}, 
                {r: 0, c: -1, val: '<'}, 
                {r: 0, c: 1, val: '>'}
            ];
            
            // Optimization: Order neighbors towards goal?
            // dist = abs(nr - gr) + abs(nc - gc)
            dirs.sort((a,b) => {
                const da = Math.abs(currR+a.r - goalPos.r) + Math.abs(currC+a.c - goalPos.c);
                const db = Math.abs(currR+b.r - goalPos.r) + Math.abs(currC+b.c - goalPos.c);
                return da - db;
            });
            
            for(const d of dirs) {
                const nr = currR + d.r;
                const nc = currC + d.c;
                
                if (nr >= 0 && nr < R && nc >= 0 && nc < C && !visited[nr][nc]) {
                    const currReg = regionMap[currR][currC];
                    const nextReg = regionMap[nr][nc];
                    let newSegment = false;
                    
                    // Check Constraints
                    if (currReg !== nextReg) {
                        // Leaving currReg
                        if (regions[currReg].clue !== null && regionSegments[currReg] > regions[currReg].clue) continue; // Already exceeded?
                        // Actually, we just finished a segment. If we exceeded, invalid.
                        // If we are below, we might return later.
                        // Entering nextReg
                        if (regions[nextReg].clue !== null && regionSegments[nextReg] + 1 > regions[nextReg].clue) continue;
                        
                        regionSegments[nextReg]++;
                        newSegment = true;
                    }
                    
                    // Basic pruning: Dead ends
                    // If any unvisited neighbor of Current (besides Next) has 0 unvisited neighbors, and is not Goal, it's dead.
                    // Expensive to check every step.
                    
                    visited[nr][nc] = true;
                    pathGrid[nr][nc] = d.val; // Parent direction (relative to child? No, standard is relative to cell)
                    // If we move A -> B. A is parent of B.
                    // In standard notation: parent[B] points to A.
                    // d.val is direction FROM A TO B? 
                    // Usually parent pointer is stored.
                    // If d.val is 'v', it means we moved Down. So B is below A.
                    // Parent of B is A (Up).
                    // Let's store 'Parent Direction'.
                    // If we moved Down (1,0), parent is Up (-1,0) -> '^'.
                    let pDir;
                    if (d.r === 1) pDir = '^';
                    else if (d.r === -1) pDir = 'v';
                    else if (d.c === 1) pDir = '<';
                    else pDir = '>';
                    
                    pathGrid[nr][nc] = pDir;
                    
                    solve(nr, nc, count + 1);
                    
                    // Backtrack
                    pathGrid[nr][nc] = null;
                    visited[nr][nc] = false;
                    if (newSegment) regionSegments[nextReg]--;
                }
            }
        }
        
        solve(startPos.r, startPos.c, 1);
        return solutions;
    }
    
    createEmptyGrid();
});
























