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
    
    let gridState = [];
    let currentRows = 8;
    let currentCols = 8;
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    let edgeState = {}; 
    let isDragging = false;
    let dragStartPos = null;
    
    createGridBtn.addEventListener('click', function() {
        currentRows = parseInt(rowsInput.value);
        currentCols = parseInt(colsInput.value);
        createEmptyGrid();
    });
    
    function createEmptyGrid() {
        solutions = [];
        currentSolutionIndex = 0;
        solutionNav.style.display = 'none';
        result.innerHTML = '';
        gridState = Array(currentRows).fill().map(() => 
            Array(currentCols).fill().map(() => ({ type: 'empty' })));
        edgeState = {};
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        puzzleGrid.style.position = 'relative';
        puzzleGrid.style.gridTemplateColumns = `repeat(${currentCols}, 1fr)`;
        
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                const cell = document.createElement('div');
                cell.className = 'countryroad-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                updateCellDisplay(cell, gridState[i][j]);
                
                // Left Click: Number Input
                cell.addEventListener('click', function(e) {
                    if (isShowingSolution) return;
                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);
                    this.contentEditable = true;
                    this.classList.add('editing');
                    this.textContent = '';
                    this.focus();
                    
                    const saveNumber = (e) => {
                        let value = e.target.textContent.trim();
                        if (value !== '' && !isNaN(value) && value > 0) { // Numbers usually > 0
                            gridState[row][col] = { type: 'clue', value: parseInt(value) };
                        } else {
                            gridState[row][col] = { type: 'empty' };
                        }
                        this.contentEditable = false;
                        this.classList.remove('editing');
                        updateCellDisplay(this, gridState[row][col]);
                    };
                    
                    this.addEventListener('blur', saveNumber, { once: true });
                    this.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            this.blur();
                        }
                    });
                    e.preventDefault();
                });
                
                // Right Click: Toggle Empty Marker (X)
                cell.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    if (isShowingSolution) return;
                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);
                    if (gridState[row][col].type === 'marker') {
                        gridState[row][col] = { type: 'empty' };
                    } else if (gridState[row][col].type === 'empty') {
                        gridState[row][col] = { type: 'marker' };
                    }
                    updateCellDisplay(this, gridState[row][col]);
                });
                
                puzzleGrid.appendChild(cell);
            }
        }
        createGridLines();
        updateGridLines();
    }
    
    function createGridLines() {
        const existingLines = puzzleGrid.querySelectorAll('.grid-line');
        existingLines.forEach(line => line.remove());
        const cells = puzzleGrid.querySelectorAll('.countryroad-cell');
        if (cells.length === 0) return;
        const cellSize = cells[0].offsetWidth;
        const gap = 1; 
        const padding = parseInt(getComputedStyle(puzzleGrid).padding) || 16;
        
        for (let i = 0; i <= currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                if (i === 0 || i === currentRows) continue;
                const line = document.createElement('div');
                line.className = 'grid-line horizontal-line';
                line.dataset.row = i;
                line.dataset.col = j;
                line.dataset.type = 'h';
                line.dataset.id = `h_${i}_${j}`;
                line.style.position = 'absolute';
                line.style.left = `${padding + j * (cellSize + gap)}px`;
                line.style.top = `${padding + i * (cellSize + gap) - gap - 4}px`; 
                line.style.width = `${cellSize}px`;
                line.style.height = '9px';
                line.style.backgroundColor = 'transparent';
                line.style.zIndex = '30';
                if (edgeState[`h_${i}_${j}`]) line.classList.add('active');
                line.addEventListener('mousedown', handleLineMouseDown);
                puzzleGrid.appendChild(line);
            }
        }
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j <= currentCols; j++) {
                if (j === 0 || j === currentCols) continue;
                const line = document.createElement('div');
                line.className = 'grid-line vertical-line';
                line.dataset.row = i;
                line.dataset.col = j;
                line.dataset.type = 'v';
                line.dataset.id = `v_${i}_${j-1}`;
                line.style.position = 'absolute';
                line.style.left = `${padding + j * (cellSize + gap) - gap - 4}px`;
                line.style.top = `${padding + i * (cellSize + gap)}px`;
                line.style.width = '9px';
                line.style.height = `${cellSize}px`;
                line.style.backgroundColor = 'transparent';
                line.style.zIndex = '30';
                if (edgeState[`v_${i}_${j-1}`]) line.classList.add('active');
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
        dragStartPos = { type: this.dataset.type, row: parseInt(this.dataset.row), col: parseInt(this.dataset.col), lineId: lineId };
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
    
    function updateCellDisplay(cellElement, state) {
        cellElement.className = 'countryroad-cell';
        cellElement.innerHTML = ''; // Clear content
        
        if (state.type === 'clue') {
            cellElement.classList.add('clue');
            cellElement.textContent = state.value;
        } else if (state.type === 'marker') {
            cellElement.classList.add('empty-marker');
        }
    }
    
    solveBtn.addEventListener('click', function() {
        result.innerHTML = '';
        loading.style.display = 'flex';
        let loadingTime = 0;
        const loadingTimer = setInterval(() => {
            loadingTime++;
            document.getElementById('loading-time').textContent = loadingTime;
        }, 1000);
        
        const puzzle = preparePuzzleData();
        
        setTimeout(() => {
            try {
                solutions = jsCountryRoadSolver(puzzle);
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
    
    function preparePuzzleData() {
        let clues = {};
        // Manual empty markers
        let markers = {};
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                if (gridState[i][j].type === 'clue') {
                    clues[`${i},${j}`] = gridState[i][j].value;
                } else if (gridState[i][j].type === 'marker') {
                    markers[`${i},${j}`] = true;
                }
            }
        }
        return {
            R: currentRows,
            C: currentCols,
            clues: clues,
            markers: markers,
            edge_ids: edgeState
        };
    }
    
    function displaySolution(index) {
        if (!solutions || !solutions.length) return;
        const solution = solutions[index];
        const cells = puzzleGrid.querySelectorAll('.countryroad-cell');
        let cellIndex = 0;
        
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                const cell = cells[cellIndex++];
                if (!cell) continue;
                cell.className = 'countryroad-cell';
                cell.innerHTML = '';
                
                if (gridState[i][j].type === 'clue') {
                    cell.classList.add('clue');
                    cell.textContent = gridState[i][j].value;
                }
                
                // Draw Loop
                if (solution[i][j] === 1) {
                    const center = document.createElement('div');
                    center.className = 'loop-center';
                    cell.appendChild(center);
                    
                    // Connections
                    // Up
                    if (i > 0 && solution[i-1][j] === 1) {
                        const line = document.createElement('div');
                        line.className = 'loop-line-v';
                        line.style.top = '0';
                        line.style.height = '50%';
                        cell.appendChild(line);
                    }
                    // Down
                    if (i < currentRows - 1 && solution[i+1][j] === 1) {
                        const line = document.createElement('div');
                        line.className = 'loop-line-v';
                        line.style.top = '50%';
                        line.style.height = '50%';
                        cell.appendChild(line);
                    }
                    // Left
                    if (j > 0 && solution[i][j-1] === 1) {
                        const line = document.createElement('div');
                        line.className = 'loop-line-h';
                        line.style.left = '0';
                        line.style.width = '50%';
                        cell.appendChild(line);
                    }
                    // Right
                    if (j < currentCols - 1 && solution[i][j+1] === 1) {
                        const line = document.createElement('div');
                        line.className = 'loop-line-h';
                        line.style.left = '50%';
                        line.style.width = '50%';
                        cell.appendChild(line);
                    }
                } else {
                    // Empty
                    cell.classList.add('empty-marker');
                }
            }
        }
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    prevSolution.addEventListener('click', function() {
        if (solutions && solutions.length > 1) {
            currentSolutionIndex = (currentSolutionIndex - 1 + solutions.length) % solutions.length;
            displaySolution(currentSolutionIndex);
        }
    });
    
    nextSolution.addEventListener('click', function() {
        if (solutions && solutions.length > 1) {
            currentSolutionIndex = (currentSolutionIndex + 1) % solutions.length;
            displaySolution(currentSolutionIndex);
        }
    });
    
    backToEditBtn.addEventListener('click', function() {
        if (isShowingSolution) {
            isShowingSolution = false;
            solutionNav.style.display = 'none';
            renderPuzzleGrid();
        }
    });
    
    resetBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        createEmptyGrid();
    });

    // --- Country Road Solver Logic ---
    function jsCountryRoadSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const clues = puzzle.clues;
        const markers = puzzle.markers;
        const edgeIds = puzzle.edge_ids;
        const maxSolutions = 5;
        
        // 1. Identify Regions
        const regionMap = Array(R).fill().map(() => Array(C).fill(-1));
        const regions = [];
        let regionCount = 0;
        
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if(regionMap[r][c] === -1) {
                    const q = [{r,c}];
                    regionMap[r][c] = regionCount;
                    const regionCells = [{r,c}];
                    let target = null;
                    if (clues[`${r},${c}`] !== undefined) target = clues[`${r},${c}`];
                    
                    let head = 0;
                    while(head < q.length) {
                        const curr = q[head++];
                        const neighbors = [
                            {r: curr.r-1, c: curr.c, type:'h', er: curr.r, ec: curr.c},
                            {r: curr.r+1, c: curr.c, type:'h', er: curr.r+1, ec: curr.c},
                            {r: curr.r, c: curr.c-1, type:'v', er: curr.r, ec: curr.c-1},
                            {r: curr.r, c: curr.c+1, type:'v', er: curr.r, ec: curr.c}
                        ];
                        for(const n of neighbors) {
                            if(n.r >= 0 && n.r < R && n.c >= 0 && n.c < C) {
                                const edgeKey = `${n.type}_${n.er}_${n.ec}`;
                                if(!edgeIds[edgeKey]) {
                                    if(regionMap[n.r][n.c] === -1) {
                                        regionMap[n.r][n.c] = regionCount;
                                        q.push(n);
                                        regionCells.push(n);
                                        if(clues[`${n.r},${n.c}`] !== undefined) {
                                            target = clues[`${n.r},${n.c}`];
                                        }
                                    }
                                }
                            }
                        }
                    }
                    regions.push({ id: regionCount, cells: regionCells, target: target, current: 0 });
                    regionCount++;
                }
            }
        }
        
        // 2. Solver State
        const grid = Array(R).fill().map(() => Array(C).fill(null));
        const solutions = [];
        
        // DSU for Loop components
        // 0..RC-1 map to cells.
        const parent = new Int32Array(R*C).fill(-1); // -1 implies root, value < 0 implies -size
        // Initialize parent to -1
        for(let i=0; i<R*C; i++) parent[i] = -1;
        
        function find(i) {
            let root = i;
            while(parent[root] >= 0) root = parent[root];
            return root;
        }
        
        function union(i, j) {
            const rootI = find(i);
            const rootJ = find(j);
            if(rootI !== rootJ) {
                // union by size
                if(parent[rootI] < parent[rootJ]) { // rootI larger
                     parent[rootI] += parent[rootJ];
                     parent[rootJ] = rootI;
                } else {
                     parent[rootJ] += parent[rootI];
                     parent[rootI] = rootJ;
                }
                return true;
            }
            return false; // cycle detected
        }
        
        // Region Boundary Crossings
        const regionCrossings = new Int32Array(regionCount).fill(0);
        
        // Pre-process markers
        for(const k in markers) {
            const [r, c] = k.split(',').map(Number);
            grid[r][c] = 0; // Forced Empty
        }
        
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === R * C) {
                // Final Checks
                // 1. All required regions visited (count > 0)
                // 2. All region targets met exactly
                // 3. Single Connected Component (DSU)
                // 4. Degree of last row/col (checked incrementally, but verify last cells)
                
                // Check components count
                let componentCount = 0;
                let loopCells = 0;
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        if(grid[r][c] === 1) {
                            loopCells++;
                            if(parent[r*C+c] < 0) componentCount++;
                        }
                    }
                }
                if (loopCells > 0 && componentCount !== 1) return;
                if (loopCells === 0) return; // Empty grid not allowed
                
                // Check Region Targets & Visitation
                for(let i=0; i<regionCount; i++) {
                    if (regions[i].current === 0) return; // Must visit
                    if (regions[i].target !== null && regions[i].current !== regions[i].target) return;
                    if (regionCrossings[i] !== 2) return; // Wait, exact 2 crossings?
                    // For a single loop, it enters and leaves.
                    // If it just touches 2 cells and leaves?
                    // Crossing count = number of edges (links) connecting a cell inside to a cell outside.
                    // If region is visited once, degree sum of region subgraph = 2 * V_in.
                    // Sum of degrees in full graph = 2 * V_in (all loop cells have deg 2).
                    // Edges internal + Edges boundary = Sum degrees.
                    // 2 * E_int + E_boundary = 2 * V_in.
                    // E_boundary must be even.
                    // If single path through region, E_boundary = 2.
                    // If loop is entirely inside region? E_boundary = 0. 
                    // But loop must visit EVERY region.
                    // So if regionCount > 1, E_boundary >= 2.
                    // If loop visits region multiple times, E_boundary >= 4.
                    // So "No Re-entry" => E_boundary == 2 (except if single region puzzle, then 0).
                    if (regionCount > 1 && regionCrossings[i] !== 2) return;
                }
                
                solutions.push(grid.map(row => [...row]));
                return;
            }
            
            const r = Math.floor(idx / C);
            const c = idx % C;
            const regId = regionMap[r][c];
            
            // Incremental Check: Degree of (r-1, c)
            // Neighbors of (r-1, c): (r-2, c), (r-1, c-1), (r-1, c+1), (r, c)
            // At step `idx` (r, c), `(r-1, c)` neighbors are all set?
            // (r, c) is the last neighbor of (r-1, c) to be visited?
            // Yes, in raster scan.
            // If r > 0, we can check (r-1, c).
            
            // Also check (r, c-1) if it's the last column? No, (r, c-1) has neighbor (r, c) and (r+1, c-1).
            // (r+1, c-1) is future.
            
            // Pre-check: if grid[r][c] is pre-assigned
            const possibleValues = grid[r][c] !== null ? [grid[r][c]] : [1, 0];
            
            for(const val of possibleValues) {
                grid[r][c] = val;
                
                // 1. Check Empty Adjacency (Cross-border)
                if (val === 0) {
                    // Check Up
                    if (r > 0 && grid[r-1][c] === 0 && regionMap[r-1][c] !== regId) {
                        grid[r][c] = null; continue; 
                    }
                    // Check Left
                    if (c > 0 && grid[r][c-1] === 0 && regionMap[r][c-1] !== regId) {
                        grid[r][c] = null; continue;
                    }
                }
                
                // 2. Update/Check Region Count
                if (val === 1) {
                    regions[regId].current++;
                    if (regions[regId].target !== null && regions[regId].current > regions[regId].target) {
                        regions[regId].current--;
                        grid[r][c] = null; continue;
                    }
                }
                
                // 3. Check Degree of (r-1, c)
                let validDegree = true;
                if (r > 0) {
                    const pr = r - 1;
                    const pc = c;
                    if (grid[pr][pc] === 1) {
                        let d = 0;
                        if (pr > 0 && grid[pr-1][pc] === 1) d++; // Up
                        if (pc > 0 && grid[pr][pc-1] === 1) d++; // Left
                        if (pc < C-1 && grid[pr][pc+1] === 1) d++; // Right
                        if (grid[r][c] === 1) d++; // Down (current)
                        if (d !== 2) validDegree = false;
                    }
                }
                if (!validDegree) {
                    if (val === 1) regions[regId].current--;
                    grid[r][c] = null; continue;
                }
                
                // 4. DSU & Boundary Crossings (Only if val === 1)
                let dsuRollback = []; // [index, oldValue]
                let crossingRollback = []; // [regId, oldValue]
                let validLoop = true;
                let cycleFormed = false;
                
                if (val === 1) {
                    // Try connect Left
                    if (c > 0 && grid[r][c-1] === 1) {
                        // Boundary
                        if (regionMap[r][c-1] !== regId) {
                            // Update crossings
                            crossingRollback.push([regId, regionCrossings[regId]]);
                            crossingRollback.push([regionMap[r][c-1], regionCrossings[regionMap[r][c-1]]]);
                            regionCrossings[regId]++;
                            regionCrossings[regionMap[r][c-1]]++;
                        }
                        // DSU
                        const rootA = find(r*C + c);
                        const rootB = find(r*C + c - 1);
                        if (rootA !== rootB) {
                            // Save state for rollback
                            // Since we modify parent array directly
                            // We need to store the index modified and its old value
                            // union logic: parent[rootJ] = rootI (or vice versa)
                            // parent[rootI] += size
                            // Just check which one changed.
                            // Re-implement simplified union with rollback:
                            if(parent[rootA] < parent[rootB]) { 
                                dsuRollback.push([rootA, parent[rootA]]);
                                dsuRollback.push([rootB, parent[rootB]]);
                                parent[rootA] += parent[rootB];
                                parent[rootB] = rootA;
                            } else {
                                dsuRollback.push([rootB, parent[rootB]]);
                                dsuRollback.push([rootA, parent[rootA]]);
                                parent[rootB] += parent[rootA];
                                parent[rootA] = rootB;
                            }
                        } else {
                            cycleFormed = true;
                        }
                    }
                    
                    // Try connect Up
                    if (r > 0 && grid[r-1][c] === 1) {
                        // Boundary
                        if (regionMap[r-1][c] !== regId) {
                            crossingRollback.push([regId, regionCrossings[regId]]);
                            crossingRollback.push([regionMap[r-1][c], regionCrossings[regionMap[r-1][c]]]);
                            regionCrossings[regId]++;
                            regionCrossings[regionMap[r-1][c]]++;
                        }
                        // DSU
                        const rootA = find(r*C + c);
                        const rootB = find((r-1)*C + c);
                        if (rootA !== rootB) {
                            if(parent[rootA] < parent[rootB]) { 
                                dsuRollback.push([rootA, parent[rootA]]);
                                dsuRollback.push([rootB, parent[rootB]]);
                                parent[rootA] += parent[rootB];
                                parent[rootB] = rootA;
                            } else {
                                dsuRollback.push([rootB, parent[rootB]]);
                                dsuRollback.push([rootA, parent[rootA]]);
                                parent[rootB] += parent[rootA];
                                parent[rootA] = rootB;
                            }
                        } else {
                            cycleFormed = true;
                        }
                    }
                    
                    // Pruning: Boundary Crossings > 2 (if regionCount > 1)
                    if (regionCount > 1) {
                        if (regionCrossings[regId] > 2) validLoop = false;
                        if (c > 0 && regionMap[r][c-1] !== regId && regionCrossings[regionMap[r][c-1]] > 2) validLoop = false;
                        if (r > 0 && regionMap[r-1][c] !== regId && regionCrossings[regionMap[r-1][c]] > 2) validLoop = false;
                    }
                    
                    // Pruning: Premature Cycle
                    // If cycle formed, it must be the END of the loop (Global)
                    // We can't easily check "END" here because we have future cells.
                    // BUT, if we form a cycle, and there are ANY other components, or ANY future requirements, it is invalid.
                    // Simplest check: If cycle formed, check if ALL currently assigned '1's are in this component.
                    // And if we have met all region requirements.
                    // Since we process in order, if we close a loop now, we can't extend it later.
                    // So all future cells MUST be 0.
                    // If we assume future cells are 0, we can validate everything now.
                    // But instead of checking future, we just say: If cycle formed, we effectively "Finished" the loop.
                    // If we are not at the last cell, we can only continue if we force all remaining cells to 0.
                    // But that's equivalent to: Only allow cycle formation if it satisfies final conditions locally?
                    // Let's just Prune if cycle formed AND we are not "Done".
                    // Definition of "Done": All regions visited? All targets met?
                    // It's safer to just say: "If cycle formed, return false" unless we want to support early exit?
                    // No, because we need to fill the rest of the grid with 0s to be a valid grid state (for display).
                    // So, if cycle formed, we continue, but we track that "Loop Closed".
                    // If "Loop Closed" and we try to add another 1 -> Invalid.
                    // Actually, simpler: DSU doesn't prevent cycles. It detects them.
                    // If cycle formed, validLoop = false?
                    // Only if there are other components?
                    // Let's just use: If cycle formed, ensure current component size == total 1s count.
                    // If not, it's disjoint loops -> Invalid.
                    if (cycleFormed) {
                         // Count total 1s so far
                         let totalOnes = 0;
                         // This is slow. Optimization needed?
                         // Maintain totalOnes variable passed in recursion?
                         // Just iterate.
                         for(let k=0; k<=idx; k++) if(grid[Math.floor(k/C)][k%C] === 1) totalOnes++;
                         
                         // Check size of current component
                         const root = find(r*C + c);
                         const size = -parent[root];
                         if (size !== totalOnes) validLoop = false; // Disjoint loops
                         
                         // If valid cycle, we must NOT add any more 1s to it?
                         // Actually if we form a cycle, we cannot add more edges to these nodes (degree 2 constraint handles it).
                         // But we could start a NEW component (disjoint).
                         // But we just checked size == totalOnes.
                         // So if we form a cycle, we have a Single Loop using all current 1s.
                         // If we add more 1s later, they will start a new component (invalid) or connect to this one (impossible if degree 2 saturated).
                         // So, if cycle formed, effectively we are done with 1s.
                         // We can continue recursion, but future 1s will fail degree checks or connectivity checks.
                    }
                }
                
                if (validLoop) {
                    solve(idx + 1);
                }
                
                // Rollback
                if (val === 1) {
                    regions[regId].current--;
                    while(dsuRollback.length > 0) {
                        const [idx, val] = dsuRollback.pop();
                        parent[idx] = val;
                    }
                    // Restore crossings efficiently
                    // Since we added +1, we can just decrement?
                    // But we might have added to same region twice (if corner case).
                    // Use the saved values.
                    // Order of popping matters? We pushed in pairs.
                    // Actually we pushed [regId, oldVal].
                    // Just restore.
                    // Use a Set/Map to avoid restoring same region twice if pushed twice?
                    // Or just iterate backwards.
                    // We might have pushed: [RegA, 0], [RegB, 0] ...
                    // Just restoring is fine.
                    // Use a map to store initial values before modification in this step?
                    // Simpler:
                    if (crossingRollback.length > 0) {
                        // The rollback array contains [id, oldVal]. 
                        // If we modified A then B, we restore B then A.
                        // If we modified A then A (possible?), we restore A (intermediate) then A (original).
                        // Correct.
                        while(crossingRollback.length > 0) {
                            const [id, v] = crossingRollback.pop();
                            regionCrossings[id] = v;
                        }
                    }
                }
                
                grid[r][c] = null;
            }
        }
        
        try {
            solve(0);
        } catch (e) {
            console.error(e);
        }
        
        return solutions;
    }
    
    // Initialize
    createEmptyGrid();
});
























