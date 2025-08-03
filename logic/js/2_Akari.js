let currentGrid = [];
let gridSize = 10;
let selectedCell = null;
let allSolutions = [];
let currentSolutionIndex = 0;

function initGrid() {
    gridSize = parseInt(document.getElementById('size').value) || 10;
    gridSize = Math.max(3, Math.min(15, gridSize));
    
    const grid = document.getElementById('grid');
    grid.style.gridTemplateColumns = `repeat(${gridSize}, var(--grid-size))`;
    grid.innerHTML = '';
    
    currentGrid = Array(gridSize).fill().map(() => 
        Array(gridSize).fill({type: 'empty', value: 0})
    );

    for(let i = 0; i < gridSize; i++) {
        for(let j = 0; j < gridSize; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            cell.addEventListener('click', () => handleCellClick(i, j, false));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleCellClick(i, j, true);
            });
            
            grid.appendChild(cell);
        }
    }
    
    grid.addEventListener('contextmenu', e => e.preventDefault());
    allSolutions = [];
    document.getElementById('solution-nav').style.display = 'none';
    document.getElementById('solutionsCount').textContent = '0';
    document.getElementById('timeElapsed').textContent = '0';
    
    updateGridDisplay();
}

function handleCellClick(row, col, isRightClick) {
    const cell = currentGrid[row][col];
    if (isRightClick) {
        currentGrid[row][col] = {
            type: cell.type === 'wall' ? 'empty' : 'wall',
            value: 0
        };
    } else {
        if (cell.type === 'wall') {
            currentGrid[row][col] = {
                type: 'empty',
                value: 0
            };
        } else if (cell.type === 'empty') {
            currentGrid[row][col] = {
                type: 'number',
                value: 1
            };
        } else {
            const nextValue = (cell.value + 1) % 5;
            currentGrid[row][col] = {
                type: nextValue === 0 ? 'empty' : 'number',
                value: nextValue
            };
        }
    }
    
    updateGridDisplay();
    clearLightBulbs();
}

function updateGridDisplay() {
    const cells = document.querySelectorAll('.cell');
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            const cell = cells[index];
            const cellData = currentGrid[i][j];
            
            cell.className = 'cell';
            cell.textContent = '';
            
            if (cellData.type === 'wall') {
                cell.classList.add('wall');
            } else if (cellData.type === 'number') {
                cell.textContent = cellData.value;
            }
        }
    }
}

function clearLightBulbs() {
    document.querySelectorAll('.bulb').forEach(el => el.classList.remove('bulb'));
    document.querySelectorAll('.lit').forEach(el => el.classList.remove('lit'));
}

function solvePuzzle() {
    const solveBtn = document.querySelector('button.cyber-glow');
    solveBtn.disabled = true;
    solveBtn.textContent = '求解中...';
    clearLightBulbs();
    const start = performance.now();
    
    try {
        const puzzle = {
            rows: gridSize,
            cols: gridSize,
            clues: {}
        };
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cell = currentGrid[i][j];
                if (cell.type === 'wall') {
                    puzzle.clues[`${i},${j}`] = 'wall';
                } else if (cell.type === 'number') {
                    puzzle.clues[`${i},${j}`] = cell.value.toString();
                }
            }
        }
        
        const solutions = solveAkari(puzzle);
        
        if (solutions && solutions.length > 0) {
            allSolutions = solutions;
                    document.getElementById('solutionsCount').textContent = allSolutions.length;
                } else {
            document.getElementById('solutionsCount').textContent = '无有效解';
            allSolutions = [];
        }
        
        const timeElapsed = Math.round(performance.now() - start);
        document.getElementById('timeElapsed').textContent = timeElapsed;
        
        if (allSolutions.length > 0) {
        currentSolutionIndex = 0;
        document.getElementById('solution-nav').style.display = allSolutions.length > 1 ? 'block' : 'none';
        document.getElementById('solution-counter').textContent = `解 ${currentSolutionIndex + 1}/${allSolutions.length}`;
            displaySolution(currentSolutionIndex);
        }
    } catch (e) {
        console.error("求解出错:", e);
        document.getElementById('solutionsCount').textContent = '求解出错';
    } finally {
        solveBtn.disabled = false;
        solveBtn.textContent = '求解谜题';
    }
}

function displaySolution(index) {
    if (!allSolutions || allSolutions.length === 0) return;
    
    clearLightBulbs();
    
        const solution = allSolutions[index];
    const cells = document.querySelectorAll('.cell');
    
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
            if (solution[i][j]) {
                const cellIndex = i * gridSize + j;
                    cells[cellIndex].classList.add('bulb');
                }
            }
        }
    
    calculateLighting(solution);
    
    document.getElementById('solution-counter').textContent = `解 ${index + 1}/${allSolutions.length}`;
}

function calculateLighting(solution) {
    const cells = document.querySelectorAll('.cell');
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
            if (solution[i][j]) {
                const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                
                for (const [dx, dy] of directions) {
                    let x = i + dx;
                    let y = j + dy;
                    
                    while (x >= 0 && x < gridSize && y >= 0 && y < gridSize && 
                          currentGrid[x][y].type !== 'wall' && currentGrid[x][y].type !== 'number') {
                        const cellIndex = x * gridSize + y;
                        cells[cellIndex].classList.add('lit');
                        x += dx;
                        y += dy;
                    }
                }
            }
        }
    }
}

function clearGrid() {
    currentGrid = Array(gridSize).fill().map(() => 
        Array(gridSize).fill({type: 'empty', value: 0})
    );
    
    updateGridDisplay();
    clearLightBulbs();
    
    allSolutions = [];
    document.getElementById('solution-nav').style.display = 'none';
    document.getElementById('solutionsCount').textContent = '0';
    document.getElementById('timeElapsed').textContent = '0';
}

function buildSimpleExample() {
    gridSize = 5;
    initGrid();
    
    const example = [
        { row: 0, col: 2, type: 'wall', value: 0 },
        { row: 2, col: 0, type: 'wall', value: 0 },
        { row: 2, col: 2, type: 'number', value: 4 },
        { row: 2, col: 4, type: 'wall', value: 0 },
        { row: 4, col: 2, type: 'wall', value: 0 }
    ];
    
    applyExample(example);
}

function applyExample(example) {
    example.forEach(item => {
        currentGrid[item.row][item.col] = {
            type: item.type,
            value: item.value
        };
    });
    
    updateGridDisplay();
    clearLightBulbs();
}

function solveAkari(puzzle) {
    const rows = puzzle.rows;
    const cols = puzzle.cols;
    const clues = puzzle.clues;
    
    const solver = new AkariSolver(rows, cols, clues);
    return solver.solve();
}

class AkariSolver {
    constructor(rows, cols, clues) {
        this.rows = rows;
        this.cols = cols;
        this.clues = clues;
        this.grid = Array(rows).fill().map(() => Array(cols).fill(null));
        this.solutions = [];
        this.maxSolutions = 10;
        this.illuminatedCells = new Set(); // 跟踪被照亮的单元格
        this.visibilityMap = this.buildVisibilityMap(); // 预计算可见性
    }
    
    // 预计算可见性映射
    buildVisibilityMap() {
        const map = {};
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.clues[`${r},${c}`]) continue; // 跳过墙壁和数字
                
                map[`${r},${c}`] = this.getVisibleCells(r, c);
            }
        }
        return map;
    }
    
    // 获取从(r,c)可见的所有单元格
    getVisibleCells(r, c) {
        const visible = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dr, dc] of directions) {
            let nr = r + dr;
            let nc = c + dc;
            while (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                const key = `${nr},${nc}`;
                if (this.clues[key]) break; // 墙壁阻挡视线
                visible.push([nr, nc]);
                nr += dr;
                nc += dc;
            }
        }
        
        return visible;
    }

    // 放置灯泡并更新照明状态
    placeBulb(r, c) {
        this.grid[r][c] = true;
        
        // 更新被照亮的单元格
        const visible = this.visibilityMap[`${r},${c}`] || [];
        for (const [vr, vc] of visible) {
            this.illuminatedCells.add(`${vr},${vc}`);
        }
    }
    
    // 移除灯泡并更新照明状态
    removeBulb(r, c) {
        this.grid[r][c] = false;
        
        // 重新计算照明区域
        this.illuminatedCells.clear();
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.grid[i][j]) {
                    const visible = this.visibilityMap[`${i},${j}`] || [];
                    for (const [vr, vc] of visible) {
                        this.illuminatedCells.add(`${vr},${vc}`);
                    }
                }
            }
        }
    }
    
    solve() {
        // 推导数字0和4的约束
        this.deduceNumberConstraints();
        const result = this.backtrack(0, 0);
        return this.solutions;
    }
    
    // 推导数字为0或4的约束
    deduceNumberConstraints() {
        for (const key in this.clues) {
            const value = this.clues[key];
            if (value === '0' || value === '4') {
                const [row, col] = key.split(',').map(Number);
                const adjacent = this.getAdjacentCells(row, col);
                
                for (const [r, c] of adjacent) {
                    // 如果数字是0，相邻单元格不能放灯泡
                    // 如果数字是4，相邻单元格必须放灯泡
                    this.grid[r][c] = (value === '4');
                    
                    // 如果放置了灯泡，更新照明
                    if (value === '4') {
                        const visible = this.visibilityMap[`${r},${c}`] || [];
                        for (const [vr, vc] of visible) {
                            this.illuminatedCells.add(`${vr},${vc}`);
                        }
                    }
                }
            }
        }
    }
    
    // 获取相邻单元格
    getAdjacentCells(row, col) {
        const adjacent = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dr, dc] of directions) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && !this.clues[`${r},${c}`]) {
                adjacent.push([r, c]);
            }
        }
        
        return adjacent;
    }
    
    backtrack(row, col) {
        // 如果已经找到足够多的解决方案，提前结束
        if (this.solutions.length >= this.maxSolutions) return true;
        
        // 如果已经处理完所有单元格，检查是否是有效解
        if (row >= this.rows) {
            if (this.isValidSolution()) {
                // 复制当前解决方案
                const solution = Array(this.rows).fill().map((_, r) => 
                    Array(this.cols).fill().map((_, c) => this.grid[r][c] === true)
                );
                this.solutions.push(solution);
                return this.solutions.length >= this.maxSolutions; // 只有达到最大解数才返回true
            }
            return false;
        }
        
        // 计算下一个位置
        const nextCol = (col + 1) % this.cols;
        const nextRow = nextCol === 0 ? row + 1 : row;
        
        // 如果当前单元格是墙壁或数字，跳过
        const key = `${row},${col}`;
        if (this.clues[key]) {
            return this.backtrack(nextRow, nextCol);
        }
        
        // 如果当前单元格已经被确定，跳过
        if (this.grid[row][col] !== null) {
            return this.backtrack(nextRow, nextCol);
        }
        
        // 尝试放置灯泡
        if (this.canPlaceBulb(row, col)) {
            this.placeBulb(row, col);
            
            // 检查是否满足数字约束
            if (this.checkNumberConstraints()) {
                const foundAll = this.backtrack(nextRow, nextCol);
                if (foundAll) return true;
            }
            
            this.removeBulb(row, col);
        }
        
        // 尝试不放置灯泡
        this.grid[row][col] = false;
        const foundAll = this.backtrack(nextRow, nextCol);
        if (foundAll) return true;
        
        // 重置状态
        this.grid[row][col] = null;
        return false;
    }
    
    // 检查是否可以在(row,col)放置灯泡
    canPlaceBulb(row, col) {
        // 检查是否与可见区域内的其他灯泡冲突
        const visible = this.visibilityMap[`${row},${col}`] || [];
        for (const [r, c] of visible) {
            if (this.grid[r][c] === true) {
                return false;
            }
        }
        return true;
    }
    
    // 检查数字约束
    checkNumberConstraints() {
        for (const key in this.clues) {
            const value = this.clues[key];
            if (value !== 'wall' && !isNaN(parseInt(value))) {
                const [row, col] = key.split(',').map(Number);
                const adjacent = this.getAdjacentCells(row, col);
                
                // 计算已放置的灯泡数量
                let placedBulbs = 0;
                let nullCells = 0;
                
                for (const [r, c] of adjacent) {
                    if (this.grid[r][c] === true) {
                        placedBulbs++;
                    } else if (this.grid[r][c] === null) {
                        nullCells++;
                    }
                }
                
                const targetBulbs = parseInt(value);
                
                // 如果已放置的灯泡超过目标，或者即使放满也达不到目标，返回false
                if (placedBulbs > targetBulbs || placedBulbs + nullCells < targetBulbs) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // 检查是否是有效解决方案
    isValidSolution() {
        // 检查数字约束
        for (const key in this.clues) {
            const value = this.clues[key];
            if (value !== 'wall' && !isNaN(parseInt(value))) {
                const [row, col] = key.split(',').map(Number);
                const bulbCount = this.countAdjacentBulbs(row, col);
                if (bulbCount !== parseInt(value)) {
                    return false;
                }
            }
        }
        
        // 检查所有空白单元格是否被照亮
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const key = `${row},${col}`;
                
                if (this.clues[key]) continue; // 跳过墙壁和数字
                
                if (!this.grid[row][col] && !this.isIlluminated(row, col)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // 计算相邻灯泡数量
    countAdjacentBulbs(row, col) {
        const adjacent = this.getAdjacentCells(row, col);
        return adjacent.filter(([r, c]) => this.grid[r][c] === true).length;
    }
    
    // 检查单元格是否被照亮
    isIlluminated(row, col) {
        // 如果单元格有灯泡，它被照亮
        if (this.grid[row][col] === true) return true;
        
        // 检查是否在照明集合中
        return this.illuminatedCells.has(`${row},${col}`);
    }
}

document.getElementById('prev-solution').addEventListener('click', () => {
    if (currentSolutionIndex > 0) {
        currentSolutionIndex--;
        displaySolution(currentSolutionIndex);
    }
});

document.getElementById('next-solution').addEventListener('click', () => {
    if (currentSolutionIndex < allSolutions.length - 1) {
        currentSolutionIndex++;
        displaySolution(currentSolutionIndex);
    }
});

window.onload = initGrid;