document.addEventListener('DOMContentLoaded', function() {
    // 元素获取
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
    
    // 状态变量
    let gridState = [];
    let currentRows = 8;
    let currentCols = 8;
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    let edgeState = {}; // 存储边界信息
    let isDragging = false;
    let dragStartPos = null;
    
    // 创建网格
    createGridBtn.addEventListener('click', function() {
        currentRows = parseInt(rowsInput.value);
        currentCols = parseInt(colsInput.value);
        createEmptyGrid();
    });
    
    function createEmptyGrid() {
        // 重置状态
        solutions = [];
        currentSolutionIndex = 0;
        solutionNav.style.display = 'none';
        result.innerHTML = '';
        
        // 初始化网格状态数组
        gridState = Array(currentRows).fill().map(() => 
            Array(currentCols).fill().map(() => ({ type: 'empty' })));
        
        // 初始化边界状态
        edgeState = {};
        
        // 创建网格UI
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        
        // 创建网格容器 - 添加相对定位以便放置网格线
        puzzleGrid.style.position = 'relative';
        puzzleGrid.style.gridTemplateColumns = `repeat(${currentCols}, 1fr)`;
        
        // 创建网格单元格
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                const cell = document.createElement('div');
                cell.className = 'chocona-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                // 根据格子状态设置样式
                updateCellDisplay(cell, gridState[i][j]);
                
                // 左键点击格子事件 - 弹出输入框
                cell.addEventListener('click', function(e) {
                    if (isShowingSolution) return;
                    
                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);
                    
                    // 设置单元格为可编辑状态
                    this.contentEditable = true;
                    this.classList.add('editing');
                    this.textContent = '';
                    this.focus();
                    
                    const saveNumber = (e) => {
                        let value = e.target.textContent.trim();
                        if (value !== '' && !isNaN(value) && value >= 0 && value <= 99) {
                            gridState[row][col] = { 
                                type: 'clue', 
                                value: parseInt(value) 
                            };
                        } else {
                            // 如果之前的状态是black，保持black，否则变empty
                            // 但这里我们简单处理：如果是数字就存数字，否则清空
                            // 因为Chocona的数字通常在区域内，我们可以允许用户在任何格子输入数字
                            // 求解器会自动归属到所在区域
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
                
                // 右键点击切换黑/白 (用于预设)
                cell.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    if (isShowingSolution) return;
                    
                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);
                    
                    if (gridState[row][col].type === 'black') {
                        gridState[row][col] = { type: 'empty' };
                    } else if (gridState[row][col].type !== 'clue') {
                        gridState[row][col] = { type: 'black' };
                    }
                    
                    updateCellDisplay(this, gridState[row][col]);
                });
                
                puzzleGrid.appendChild(cell);
            }
        }
        
        createGridLines();
        updateGridLines();
    }
    
    // 创建实际的网格线元素 (与Aqre相同，只需改类名引用)
    function createGridLines() {
        const existingLines = puzzleGrid.querySelectorAll('.grid-line');
        existingLines.forEach(line => line.remove());
        
        const cells = puzzleGrid.querySelectorAll('.chocona-cell');
        if (cells.length === 0) return;
        
        const cellSize = cells[0].offsetWidth;
        // 获取grid gap
        const gap = 1; 
        const padding = parseInt(getComputedStyle(puzzleGrid).padding) || 16;
        
        // 修正坐标计算: grid-gap 为 1px
        
        for (let i = 0; i <= currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                if (i === 0 || i === currentRows) continue; // 跳过外边框
                
                const line = document.createElement('div');
                line.className = 'grid-line horizontal-line';
                line.dataset.row = i;
                line.dataset.col = j;
                line.dataset.type = 'h';
                line.dataset.id = `h_${i}_${j}`;
                
                // 考虑gap的影响
                line.style.position = 'absolute';
                line.style.left = `${padding + j * (cellSize + gap)}px`;
                line.style.top = `${padding + i * (cellSize + gap) - gap - 4}px`; 
                line.style.width = `${cellSize}px`;
                line.style.height = '9px'; // 点击区域
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
                line.dataset.id = `v_${i}_${j-1}`; // 注意这里的ID命名逻辑
                
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
        
        // 简化的拖动逻辑
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
                dragStartPos.lineId = lineId; // 避免重复切换
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
        cellElement.className = 'chocona-cell';
        cellElement.textContent = '';
        
        if (state.type === 'black') {
            cellElement.classList.add('black');
        } else if (state.type === 'clue') {
            cellElement.classList.add('clue');
            cellElement.textContent = state.value;
        }
    }
    
    // 求解处理
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
                solutions = jsChoconaSolver(puzzle);
                
                if (!solutions || solutions.length === 0) {
                    // 无解
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
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                if (gridState[i][j].type === 'clue') {
                    clues[`${i},${j}`] = gridState[i][j].value;
                }
            }
        }
        return {
            R: currentRows,
            C: currentCols,
            clues: clues, // (r,c) -> value
            edge_ids: edgeState
        };
    }
    
    function displaySolution(index) {
        if (!solutions || !solutions.length) return;
        const solution = solutions[index];
        const cells = puzzleGrid.querySelectorAll('.chocona-cell');
        let cellIndex = 0;
        
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                const cell = cells[cellIndex++];
                if (!cell) continue;
                cell.className = 'chocona-cell';
                if (gridState[i][j].type === 'clue') {
                    cell.classList.add('clue');
                    cell.textContent = gridState[i][j].value;
                }
                // 解决方案中的黑色覆盖
                if (solution[i][j] === 1) {
                    cell.classList.add('black');
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

    // --- Chocona Solver Logic ---
    function jsChoconaSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const clues = puzzle.clues;
        const edgeIds = puzzle.edge_ids;
        const maxSolutions = 10;
        
        // 1. 预处理区域 (Regions)
        // regionMap[r][c] = regionId
        // regionData[id] = { count: 0, target: null, cells: [] }
        const regionMap = Array(R).fill().map(() => Array(C).fill(-1));
        const regionData = [];
        let regionCount = 0;
        
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (regionMap[r][c] === -1) {
                    // Start BFS for new region
                    const queue = [{r, c}];
                    regionMap[r][c] = regionCount;
                    const currentRegion = { id: regionCount, cells: [{r,c}], target: null };
                    
                    // Check if this cell has a clue
                    if (clues[`${r},${c}`] !== undefined) {
                        currentRegion.target = clues[`${r},${c}`];
                    }
                    
                    let head = 0;
                    while(head < queue.length) {
                        const curr = queue[head++];
                        const neighbors = [
                            {r: curr.r-1, c: curr.c, type: 'h', edgeR: curr.r, edgeC: curr.c}, // Up
                            {r: curr.r+1, c: curr.c, type: 'h', edgeR: curr.r+1, edgeC: curr.c}, // Down
                            {r: curr.r, c: curr.c-1, type: 'v', edgeR: curr.r, edgeC: curr.c-1}, // Left
                            {r: curr.r, c: curr.c+1, type: 'v', edgeR: curr.r, edgeC: curr.c}  // Right
                        ];
                        
                        for (const n of neighbors) {
                            if (n.r >= 0 && n.r < R && n.c >= 0 && n.c < C) {
                                // Check edge
                                const edgeKey = `${n.type}_${n.edgeR}_${n.edgeC}`;
                                if (!edgeIds[edgeKey]) {
                                    // Connected
                                    if (regionMap[n.r][n.c] === -1) {
                                        regionMap[n.r][n.c] = regionCount;
                                        queue.push(n);
                                        currentRegion.cells.push(n);
                                        if (clues[`${n.r},${n.c}`] !== undefined) {
                                            if (currentRegion.target !== null && currentRegion.target !== clues[`${n.r},${n.c}`]) {
                                                throw new Error("Region has conflicting clues");
                                            }
                                            currentRegion.target = clues[`${n.r},${n.c}`];
                                        }
                                    }
                                }
                            }
                        }
                    }
                    regionData.push(currentRegion);
                    regionCount++;
                }
            }
        }
        
        // 2. Backtracking Solver
        const grid = Array(R).fill().map(() => Array(C).fill(null));
        const currentRegionBlacks = Array(regionCount).fill(0);
        
        // Fill pre-set cells and count blacks
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (gridState[r][c].type === 'black') {
                    grid[r][c] = 1;
                    const regId = regionMap[r][c];
                    if (regId !== -1) currentRegionBlacks[regId]++;
                }
                // Note: Clue cells are NOT forced to be white in Chocona
                // They can be black or white.
            }
        }

        const solutions = [];
        
        // Helper: Check 2x2 for (r, c) being the bottom-right cell
        // Checks cells: (r-1, c-1), (r-1, c), (r, c-1), (r, c)
        function check2x2(r, c) {
            if (r > 0 && c > 0) {
                let blackCount = 0;
                // We need to handle nulls? 
                // In backtracking, previous cells are filled.
                // But if we pre-filled some cells, current cell (r,c) is being decided.
                // Neighbors might be null if they are future cells? 
                // No, (r-1, c-1), (r-1, c), (r, c-1) are previous in raster order.
                // So they must be filled (0 or 1).
                // EXCEPT if we pre-filled future cells?
                // The solver iterates 0..RC-1.
                // If we are at (r,c), (r-1,c) is already visited/decided.
                // So grid values should be 0 or 1.
                
                if (grid[r-1][c-1] === 1) blackCount++;
                if (grid[r-1][c] === 1) blackCount++;
                if (grid[r][c-1] === 1) blackCount++;
                if (grid[r][c] === 1) blackCount++;
                
                // Violation: Exactly 3 black cells in 2x2
                if (blackCount === 3) return false;
            }
            return true;
        }
        
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            
            if (idx === R * C) {
                // All filled. Final check.
                for (let i = 0; i < regionCount; i++) {
                    if (regionData[i].target !== null && currentRegionBlacks[i] !== regionData[i].target) {
                        return;
                    }
                }
                solutions.push(grid.map(row => [...row]));
                return;
            }
            
            const r = Math.floor(idx / C);
            const c = idx % C;
            const regId = regionMap[r][c];
            const reg = regionData[regId];
            
            // If already filled (by user input or pre-processing)
            if (grid[r][c] !== null) {
                // Validate 2x2
                if (!check2x2(r, c)) return;
                // Check region sum limit if it's black
                if (grid[r][c] === 1) {
                     if (reg.target !== null && currentRegionBlacks[regId] > reg.target) return;
                }
                solve(idx + 1);
                return;
            }
            
            // Try placing 1 (Black)
            let canPlaceBlack = true;
            if (reg.target !== null && currentRegionBlacks[regId] + 1 > reg.target) {
                canPlaceBlack = false;
            }
            
            if (canPlaceBlack) {
                grid[r][c] = 1;
                if (check2x2(r, c)) {
                    currentRegionBlacks[regId]++;
                    solve(idx + 1);
                    currentRegionBlacks[regId]--;
                }
                grid[r][c] = null;
            }
            
            if (solutions.length >= maxSolutions) return;
            
            // Try placing 0 (White)
            grid[r][c] = 0;
            if (check2x2(r, c)) {
                 // Pruning: Check if we can still reach target
                 let possible = true;
                 if (reg.target !== null) {
                     // Simple heuristic: remaining unvisited cells in region
                     // This is expensive to count every time.
                     // Just check global counts?
                     // Count unassigned cells in this region.
                     // Optimization: We can pre-calculate region cell indices and use binary search or pointer?
                     // Or just iterate region cells since regions are small.
                     let remaining = 0;
                     for(const cell of reg.cells) {
                         // cell is unvisited if grid[cell.r][cell.c] is null
                         // But we just set grid[r][c] = 0.
                         if (grid[cell.r][cell.c] === null) remaining++;
                     }
                     if (currentRegionBlacks[regId] + remaining < reg.target) {
                         possible = false;
                     }
                 }
                 
                 if (possible) {
                    solve(idx + 1);
                 }
            }
            grid[r][c] = null;
        }
        
        solve(0);
        return solutions;
    }

    // 初始化
    createEmptyGrid();
});

