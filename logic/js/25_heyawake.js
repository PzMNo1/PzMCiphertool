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
    
    let currentRows = 8;
    let currentCols = 8;
    let gridState = []; // Stores clues (numbers) or null
    let edgeState = {}; // Stores active borders. Key: "h_r_c" or "v_r_c"
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    let isDragging = false;
    let dragStartPos = null;
    
    // For manual solving preview (right click)
    let previewState = []; // 0=white, 1=black
    
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
            Array(currentCols).fill(null));
        previewState = Array(currentRows).fill().map(() => 
            Array(currentCols).fill(null));
        edgeState = {};
        
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        puzzleGrid.style.gridTemplateColumns = `repeat(${currentCols}, 40px)`;
        puzzleGrid.style.gridTemplateRows = `repeat(${currentRows}, 40px)`;
        
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
        div.className = 'heyawake-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        
        updateCellDisplay(div, r, c);
        
        // Left click: Input clue
        div.addEventListener('click', function(e) {
            if (isShowingSolution) return;
            
            this.contentEditable = true;
            this.classList.add('editing');
            this.textContent = ''; // Clear content to type
            this.focus();
            
            const saveVal = (e) => {
                let val = e.target.textContent.trim();
                if (val && !isNaN(val) && parseInt(val) >= 0) {
                    gridState[r][c] = parseInt(val);
                } else {
                    gridState[r][c] = null;
                }
                this.contentEditable = false;
                this.classList.remove('editing');
                updateCellDisplay(this, r, c);
            };
            
            this.addEventListener('blur', saveVal, { once: true });
            this.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                }
            });
        });
        
        // Right click: Toggle black/white preview
        div.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (isShowingSolution) return;
            
            if (previewState[r][c] === null) previewState[r][c] = 1; // Black
            else if (previewState[r][c] === 1) previewState[r][c] = 0; // White (dot?) - let's just clear for now or make explicit white
            else previewState[r][c] = null;
            
            updateCellDisplay(this, r, c);
        });
        
        puzzleGrid.appendChild(div);
    }
    
    function updateCellDisplay(el, r, c) {
        el.className = 'heyawake-cell';
        el.textContent = '';
        
        // Priority: Clue > Solution > Preview
        if (gridState[r][c] !== null) {
            el.classList.add('clue');
            el.textContent = gridState[r][c];
        }
        
        if (isShowingSolution) {
            if (solutions[currentSolutionIndex][r][c] === 1) {
                el.classList.add('black');
            }
        } else {
            if (previewState[r][c] === 1) {
                el.classList.add('black');
            }
        }
    }
    
    function createGridLines() {
        const existingLines = puzzleGrid.querySelectorAll('.grid-line');
        existingLines.forEach(line => line.remove());
        
        const padding = 10; 
        const cellSize = 40;
        
        // Horizontal lines (between rows)
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
                
                line.addEventListener('mousedown', handleLineMouseDown);
                puzzleGrid.appendChild(line);
            }
        }
        
        // Vertical lines (between cols)
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
            clues: gridState,
            edges: edgeState
        };
        
        setTimeout(() => {
            try {
                solutions = jsHeyawakeSolver(puzzle);
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
        const cells = puzzleGrid.querySelectorAll('.heyawake-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            updateCellDisplay(cell, r, c);
        });
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    backToEditBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        const cells = puzzleGrid.querySelectorAll('.heyawake-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            updateCellDisplay(cell, r, c);
        });
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
    
    // --- Heyawake Solver ---
    function jsHeyawakeSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const edgeState = puzzle.edges; // "h_r_c" or "v_r_c"
        const clueGrid = puzzle.clues; // numbers
        const maxSolutions = 5;
        
        // 1. Identify Regions (Rooms)
        const regionMap = Array(R).fill().map(() => Array(C).fill(-1));
        const regions = [];
        let regionCount = 0;
        
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (regionMap[r][c] === -1) {
                    const q = [{r,c}];
                    regionMap[r][c] = regionCount;
                    const cells = [{r,c}];
                    let clue = null;
                    
                    if (clueGrid[r][c] !== null) clue = clueGrid[r][c];
                    
                    let head = 0;
                    while(head < q.length) {
                        const curr = q[head++];
                        const dirs = [
                            {dr: -1, dc: 0, type: 'h', edgeR: curr.r, edgeC: curr.c}, // Up: edge is h_r_c
                            {dr: 1, dc: 0, type: 'h', edgeR: curr.r+1, edgeC: curr.c}, // Down: edge is h_r+1_c
                            {dr: 0, dc: -1, type: 'v', edgeR: curr.r, edgeC: curr.c}, // Left: edge is v_r_c
                            {dr: 0, dc: 1, type: 'v', edgeR: curr.r, edgeC: curr.c+1} // Right: edge is v_r_c+1
                        ];
                        
                        for(const d of dirs) {
                            const nr = curr.r + d.dr;
                            const nc = curr.c + d.dc;
                            if (nr>=0 && nr<R && nc>=0 && nc<C) {
                                const edgeKey = `${d.type}_${d.edgeR}_${d.edgeC}`;
                                if (!edgeState[edgeKey]) { // No border
                                    if (regionMap[nr][nc] === -1) {
                                        regionMap[nr][nc] = regionCount;
                                        q.push({r: nr, c: nc});
                                        cells.push({r: nr, c: nc});
                                        if (clueGrid[nr][nc] !== null) {
                                            if (clue !== null && clue !== clueGrid[nr][nc]) throw new Error("Conflicting clues in room");
                                            clue = clueGrid[nr][nc];
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
        
        // 2. Pre-compute "Forbidden Spans" (Line of Sight)
        // A horizontal span of white cells cannot cross 2 vertical borders.
        // Identify all spans of cells that cover 2 borders.
        // Row r: borders at c1, c2. Span c1-1 to c2.
        const forbiddenSpans = [];
        
        // Horizontal
        for(let r=0; r<R; r++) {
            // Find all vertical borders in this row
            const borders = [];
            for(let c=1; c<C; c++) {
                if (edgeState[`v_${r}_${c}`]) borders.push(c);
            }
            for(let i=0; i<borders.length-1; i++) {
                const b1 = borders[i];
                const b2 = borders[i+1];
                // Cells from b1-1 to b2 (inclusive) cannot ALL be white.
                // Indices: [r, b1-1] ... [r, b2]
                const spanCells = [];
                for(let c=b1-1; c<=b2; c++) spanCells.push({r, c});
                forbiddenSpans.push(spanCells);
            }
        }
        
        // Vertical
        for(let c=0; c<C; c++) {
            const borders = [];
            for(let r=1; r<R; r++) {
                if (edgeState[`h_${r}_${c}`]) borders.push(r);
            }
            for(let i=0; i<borders.length-1; i++) {
                const b1 = borders[i];
                const b2 = borders[i+1];
                const spanCells = [];
                for(let r=b1-1; r<=b2; r++) spanCells.push({r, c});
                forbiddenSpans.push(spanCells);
            }
        }
        
        // 3. Solver
        const grid = Array(R).fill().map(() => Array(C).fill(null)); // 0=White, 1=Black
        const solutions = [];
        const regionBlackCounts = new Int32Array(regionCount).fill(0);
        
        // DSU for White connectivity
        // Or perform connectivity check at end.
        // Incremental connectivity is hard for "White" because "White" is default? 
        // Or we fill cell by cell.
        // Let's use standard backtracking with pruning.
        
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === R * C) {
                // Check Final Region Counts (Exact Match)
                for(let i=0; i<regionCount; i++) {
                    if (regions[i].clue !== null && regionBlackCounts[i] !== regions[i].clue) return;
                }
                
                // Check White Connectivity
                let whiteStart = null;
                let whiteCount = 0;
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        if (grid[r][c] === 0) {
                            whiteCount++;
                            if (!whiteStart) whiteStart = {r, c};
                        }
                    }
                }
                
                if (whiteCount === 0) return; // No white cells? Valid? Rules say white connected. Usually implies >0.
                
                // BFS
                let visitedCount = 0;
                const q = [whiteStart];
                const visited = new Set([`${whiteStart.r},${whiteStart.c}`]);
                visitedCount++;
                
                let head = 0;
                while(head < q.length) {
                    const curr = q[head++];
                    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                    for(const d of dirs) {
                        const nr = curr.r + d[0];
                        const nc = curr.c + d[1];
                        if (nr>=0 && nr<R && nc>=0 && nc<C && grid[nr][nc] === 0) {
                            const k = `${nr},${nc}`;
                            if (!visited.has(k)) {
                                visited.add(k);
                                visitedCount++;
                                q.push({r: nr, c: nc});
                            }
                        }
                    }
                }
                
                if (visitedCount === whiteCount) {
                    solutions.push(grid.map(row => [...row]));
                }
                return;
            }
            
            const r = Math.floor(idx / C);
            const c = idx % C;
            const regId = regionMap[r][c];
            
            // Try placing Black (1) or White (0)
            
            // Can place Black?
            // 1. No orthogonal black neighbors
            // 2. Room count not exceeded
            let canBlack = true;
            if (r > 0 && grid[r-1][c] === 1) canBlack = false;
            if (c > 0 && grid[r][c-1] === 1) canBlack = false;
            
            if (regions[regId].clue !== null && regionBlackCounts[regId] >= regions[regId].clue) canBlack = false;
            
            if (canBlack) {
                grid[r][c] = 1;
                regionBlackCounts[regId]++;
                
                // Check Forbidden Spans (Optimized: Only check spans ending at current cell)
                // Since we placed Black, we actually break white spans, so this is safe regarding "White line too long".
                // Placing black helps satisfy "At least one shaded".
                // Wait, the rule is "Forbidden if ALL WHITE".
                // Placing Black avoids the violation.
                // So no check needed here for spans.
                
                solve(idx + 1);
                
                regionBlackCounts[regId]--;
                grid[r][c] = null;
            }
            
            if (solutions.length >= maxSolutions) return;
            
            // Can place White?
            // 1. Room count potential? (If we fill rest with black, can we reach clue? - Optional pruning)
            // 2. Forbidden spans (Line of Sight)
            
            grid[r][c] = 0;
            
            // Check Spans
            // If we place White, we might complete a forbidden span.
            // Check any span that *ends* at (r,c).
            let spanValid = true;
            
            // Optimized span check:
            // We can pre-calculate which spans end at which cell.
            // Or just iterate. (Slow?)
            // For R=8, C=8, spans are few.
            
            // Let's perform a quick check for spans ending here.
            // Horizontal span ending at (r, c): means b2 = c.
            // Vertical span ending at (r, c): means b2 = r.
            // Actually, span is range [start, end].
            // If current (r,c) == end, we check if [start...end-1] are all white.
            
            // To make this fast, let's just check "Line of Sight" dynamically.
            // Check Horizontal: Look left.
            // Count borders crossed by continuous white segment.
            // If borders crossed >= 2, invalid.
            
            let bordersCrossed = 0;
            // Scan left
            for(let k=c-1; k>=0; k--) {
                if (grid[r][k] === 1) break; // Stopped by black
                if (grid[r][k] === null) break; // Unknown (should not happen in standard backtracking order)
                
                // Check border between k and k+1
                if (edgeState[`v_${r}_${k+1}`]) bordersCrossed++;
            }
            // Check border right of current cell? No, we are extending rightwards.
            // We only care if the segment *so far* has crossed 2 borders.
            // Actually, the rule is "Cannot cross 2 borders".
            // So if we have:  [Room A] | [Room B] | [Room C]
            // White in A, White in B, White in C.
            // Borders crossed: A|B, B|C. Total 2.
            // So if bordersCrossed == 2, and we are in C, invalid.
            
            // But wait, we are at C. We look left.
            // We see border B|C. Count = 1.
            // We continue through B.
            // We see border A|B. Count = 2.
            // We are in A (white).
            // So yes, if we see 2 borders while scanning continuous white cells, FAIL.
            
            // Note: We need to check if `edgeState` exists.
            // Also, we only count borders that are "crossed".
            // Border at `v_r_c` is left of `c`.
            
            // Correct logic:
            // Start scanning left from current `c`.
            // If `edgeState['v_r_' + (k+1)]` exists, we crossed a border between k and k+1.
            
            let whiteRunValid = true;
            
            // Horizontal Check
            if (c > 0) { // Only possible if we have cells to the left
                let bCount = 0;
                // Check border immediately to left of current cell (r,c)
                if (edgeState[`v_${r}_${c}`]) bCount++;
                
                for(let k=c-1; k>=0; k--) {
                    if (grid[r][k] === 1) break;
                    if (grid[r][k] === 0) {
                         // Check border to left of k
                         if (edgeState[`v_${r}_${k}`]) bCount++;
                    }
                    if (bCount >= 2) { whiteRunValid = false; break; }
                }
            }
            
            if (whiteRunValid) {
                // Vertical Check
                if (r > 0) {
                    let bCount = 0;
                    if (edgeState[`h_${r}_${c}`]) bCount++;
                    
                    for(let k=r-1; k>=0; k--) {
                        if (grid[k][c] === 1) break;
                        if (grid[k][c] === 0) {
                            if (edgeState[`h_${k}_${c}`]) bCount++;
                        }
                        if (bCount >= 2) { whiteRunValid = false; break; }
                    }
                }
            }
            
            if (whiteRunValid) {
                solve(idx + 1);
            }
            
            grid[r][c] = null;
        }
        
        solve(0);
        return solutions;
    }
    
    createEmptyGrid();
});
























