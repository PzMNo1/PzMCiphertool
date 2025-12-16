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
    let gridState = []; 
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
        div.className = 'haisuslow-cell';
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
        el.className = 'haisuslow-cell';
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
    
    function createGridLines() {
        const existingLines = puzzleGrid.querySelectorAll('.grid-line');
        existingLines.forEach(line => line.remove());
        
        const padding = 10; 
        const cellSize = 40;
        
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
        
        const existingPath = puzzleGrid.querySelectorAll('.path-line, .path-center');
        existingPath.forEach(el => el.remove());
        
        const cells = puzzleGrid.querySelectorAll('.haisuslow-cell');
        
        for(let r=0; r<currentRows; r++) {
            for(let c=0; c<currentCols; c++) {
                const cell = cells[r*currentCols + c];
                const dir = sol[r][c];
                
                const center = document.createElement('div');
                center.className = 'path-center';
                cell.appendChild(center);
                
                if (dir !== '.' && dir !== null) {
                    const line = document.createElement('div');
                    line.className = 'path-line';
                    if (dir === '^') {
                        line.style.width = '4px';
                        line.style.height = '50%';
                        line.style.top = '0';
                        line.style.left = 'calc(50% - 2px)';
                    } else if (dir === 'v') {
                        line.style.width = '4px';
                        line.style.height = '50%';
                        line.style.top = '50%';
                        line.style.left = 'calc(50% - 2px)';
                    } else if (dir === '<') {
                        line.style.height = '4px';
                        line.style.width = '50%';
                        line.style.left = '0';
                        line.style.top = 'calc(50% - 2px)';
                    } else if (dir === '>') {
                        line.style.height = '4px';
                        line.style.width = '50%';
                        line.style.left = '50%';
                        line.style.top = 'calc(50% - 2px)';
                    }
                    cell.appendChild(line);
                }
                
                const dirs = [
                    {dr: -1, dc: 0, from: 'v'}, 
                    {dr: 1, dc: 0, from: '^'}, 
                    {dr: 0, dc: -1, from: '>'}, 
                    {dr: 0, dc: 1, from: '<'}   
                ];
                
                for(const d of dirs) {
                    const nr = r + d.dr;
                    const nc = c + d.dc;
                    if (nr >= 0 && nr < currentRows && nc >= 0 && nc < currentCols) {
                        if (sol[nr][nc] === d.from) {
                            const line = document.createElement('div');
                            line.className = 'path-line';
                            if (d.dr === -1) {
                                line.style.width = '4px';
                                line.style.height = '50%';
                                line.style.top = '0';
                                line.style.left = 'calc(50% - 2px)';
                            } else if (d.dr === 1) {
                                line.style.width = '4px';
                                line.style.height = '50%';
                                line.style.top = '50%';
                                line.style.left = 'calc(50% - 2px)';
                            } else if (d.dc === -1) {
                                line.style.height = '4px';
                                line.style.width = '50%';
                                line.style.left = '0';
                                line.style.top = 'calc(50% - 2px)';
                            } else if (d.dc === 1) {
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
    
    // --- Haisu Solver (Same logic as 20_haisu) ---
    function jsHaisuSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const maxSolutions = 5;
        
        const regionMap = Array(R).fill().map(() => Array(C).fill(-1));
        const regions = [];
        let startPos = null;
        let goalPos = null;
        
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                const val = puzzle.grid[r][c];
                if (val === 'S') startPos = {r, c};
                if (val === 'G') goalPos = {r, c};
            }
        }
        
        if (!startPos || !goalPos) throw new Error("Start (S) and Goal (G) required");
        
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
                            {dr: -1, dc: 0, id: `h_${curr.r}_${curr.c}`}, 
                            {dr: 1, dc: 0, id: `h_${curr.r+1}_${curr.c}`}, 
                            {dr: 0, dc: -1, id: `v_${curr.r}_${curr.c}`}, 
                            {dr: 0, dc: 1, id: `v_${curr.r}_${curr.c+1}`} 
                        ];
                        
                        for(const d of dirs) {
                            const nr = curr.r + d.dr;
                            const nc = curr.c + d.dc;
                            if (nr>=0 && nr<R && nc>=0 && nc<C) {
                                if (!puzzle.edges[d.id]) {
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
        
        const visited = Array(R).fill().map(() => Array(C).fill(false));
        const pathGrid = Array(R).fill().map(() => Array(C).fill(null)); 
        const solutions = [];
        const regionSegments = new Int32Array(regionCount).fill(0);
        
        regionSegments[regionMap[startPos.r][startPos.c]] = 1;
        visited[startPos.r][startPos.c] = true;
        pathGrid[startPos.r][startPos.c] = '.'; 
        
        function solve(currR, currC, count) {
            if (solutions.length >= maxSolutions) return;
            
            if (currR === goalPos.r && currC === goalPos.c) {
                if (count !== R * C) return;
                for(let i=0; i<regionCount; i++) {
                    if (regions[i].clue !== null && regionSegments[i] !== regions[i].clue) return;
                }
                solutions.push(pathGrid.map(row => [...row]));
                return;
            }
            
            const dirs = [
                {r: -1, c: 0, val: '^'}, 
                {r: 1, c: 0, val: 'v'}, 
                {r: 0, c: -1, val: '<'}, 
                {r: 0, c: 1, val: '>'}
            ];
            
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
                    
                    if (currReg !== nextReg) {
                        if (regions[currReg].clue !== null && regionSegments[currReg] > regions[currReg].clue) continue;
                        if (regions[nextReg].clue !== null && regionSegments[nextReg] + 1 > regions[nextReg].clue) continue;
                        regionSegments[nextReg]++;
                        newSegment = true;
                    }
                    
                    visited[nr][nc] = true;
                    let pDir;
                    if (d.r === 1) pDir = '^';
                    else if (d.r === -1) pDir = 'v';
                    else if (d.c === 1) pDir = '<';
                    else pDir = '>';
                    
                    pathGrid[nr][nc] = pDir;
                    solve(nr, nc, count + 1);
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
























