let currentGrid = [];
let gridSize = 10;
let allSolutions = [];
let currentSolutionIndex = 0;

function initGrid() {
    gridSize = parseInt(document.getElementById('size').value) || 10;
    gridSize = Math.max(3, Math.min(20, gridSize));
    
    const grid = document.getElementById('grid');
    grid.style.gridTemplateColumns = `repeat(${gridSize}, var(--grid-size))`;
    grid.innerHTML = '';
    
    // 初始化网格：type: 'empty' | 'clue'
    // value: 数字 0-8 (如果type是clue)
    currentGrid = Array(gridSize).fill().map(() => 
        Array(gridSize).fill({type: 'empty', value: null})
    );

    for(let i = 0; i < gridSize; i++) {
        for(let j = 0; j < gridSize; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            cell.addEventListener('click', (e) => handleCellClick(i, j, e));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleCellRightClick(i, j);
            });
            
            grid.appendChild(cell);
        }
    }
    
    grid.addEventListener('contextmenu', e => e.preventDefault());
    allSolutions = [];
    updateUIState();
    updateGridDisplay();
}

function handleCellClick(row, col, e) {
    // 左键点击：在 空 -> 数字0-8 -> 空 之间循环
    // 为了方便，我们可以按住Shift点击来减少数字，或者直接循环
    const cell = currentGrid[row][col];
    
    if (cell.type === 'empty') {
        currentGrid[row][col] = { type: 'clue', value: 0 };
    } else if (cell.type === 'clue') {
        if (cell.value < 8) {
            currentGrid[row][col].value++;
        } else {
            currentGrid[row][col] = { type: 'empty', value: null };
        }
    }
    
    updateGridDisplay();
    resetSolutions();
}

function handleCellRightClick(row, col) {
    // 右键点击：快速清除或标记 (在设计模式下可能没太大用，也许可以用来回退数字)
    const cell = currentGrid[row][col];
    if (cell.type === 'clue') {
        // 回退数字或变回空
        if (cell.value > 0) {
            currentGrid[row][col].value--;
        } else {
            currentGrid[row][col] = { type: 'empty', value: null };
        }
    } else {
        // 如果是空，变回空（无操作）或变成8（反向循环）
        currentGrid[row][col] = { type: 'clue', value: 8 };
    }
    updateGridDisplay();
    resetSolutions();
}

function updateGridDisplay() {
    const cells = document.querySelectorAll('.cell');
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            const cellEl = cells[index];
            const cellData = currentGrid[i][j];
            
            // 清除所有状态类
            cellEl.className = 'cell';
            cellEl.textContent = '';
            
            if (cellData.type === 'clue') {
                cellEl.classList.add('clue');
                cellEl.textContent = cellData.value;
                
                // 根据数字给点颜色差异
                if (cellData.value === 1) cellEl.style.color = '#00f3ff';
                else if (cellData.value === 2) cellEl.style.color = '#00ff00';
                else if (cellData.value === 3) cellEl.style.color = '#ff3366';
                else if (cellData.value >= 4) cellEl.style.color = '#bc13fe';
                else cellEl.style.color = 'white';
            }
        }
    }
}

function resetSolutions() {
    allSolutions = [];
    updateUIState();
}

function updateUIState() {
    const solNav = document.getElementById('solution-nav');
    const countEl = document.getElementById('solutionsCount');
    
    if (allSolutions.length > 0) {
        solNav.style.display = 'block';
        countEl.textContent = allSolutions.length;
        document.getElementById('solution-counter').textContent = `解 ${currentSolutionIndex + 1}/${allSolutions.length}`;
    } else {
        solNav.style.display = 'none';
        countEl.textContent = '0';
    }
}

function solvePuzzle() {
    const solveBtn = document.querySelector('button.cyber-glow');
    solveBtn.disabled = true;
    solveBtn.textContent = '求解中...';
    
    const start = performance.now();
    
    setTimeout(() => {
        try {
            const solver = new MinesweeperSolver(gridSize, currentGrid);
            allSolutions = solver.solve();
            
            const timeElapsed = Math.round(performance.now() - start);
            document.getElementById('timeElapsed').textContent = timeElapsed;
            
            if (allSolutions.length > 0) {
                currentSolutionIndex = 0;
                displaySolution(0);
            } else {
                alert('无解！请检查线索是否矛盾。');
            }
            updateUIState();
        } catch (e) {
            console.error(e);
            alert('求解出错');
        } finally {
            solveBtn.disabled = false;
            solveBtn.textContent = '求解谜题';
        }
    }, 100);
}

function displaySolution(index) {
    if (!allSolutions[index]) return;
    
    const solution = allSolutions[index]; // solution is a grid of true(mine)/false(empty)
    const cells = document.querySelectorAll('.cell');
    
    // 先恢复基础显示
    updateGridDisplay();
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const idx = i * gridSize + j;
            const cellEl = cells[idx];
            
            // 如果是地雷
            if (solution[i][j]) {
                // 线索格不可能是地雷，所以只在非线索格显示地雷
                // 但如果原始数据有误，这里可能会覆盖
                if (currentGrid[i][j].type !== 'clue') {
                    cellEl.classList.add('mine');
                }
            }
        }
    }
    
    document.getElementById('solution-counter').textContent = `解 ${index + 1}/${allSolutions.length}`;
}

document.getElementById('prev-solution').addEventListener('click', () => {
    if (currentSolutionIndex > 0) {
        currentSolutionIndex--;
        displaySolution(currentSolutionIndex);
        updateUIState();
    }
});

document.getElementById('next-solution').addEventListener('click', () => {
    if (currentSolutionIndex < allSolutions.length - 1) {
        currentSolutionIndex++;
        displaySolution(currentSolutionIndex);
        updateUIState();
    }
});

function clearGrid() {
    initGrid();
}

function buildSimpleExample() {
    gridSize = 5;
    document.getElementById('size').value = 5;
    initGrid();
    
    // 创建一个简单的示例
    // 1 1 1
    // 1 ? 1
    // 1 1 1 -> 中间应该是8？不，中间是地雷
    // 让我们做一个典型的 3x3 雷区周围一圈1
    
    // 0 0 0 0 0
    // 0 1 1 1 0
    // 0 1 ? 1 0  <- 中间是地雷
    // 0 1 1 1 0
    // 0 0 0 0 0
    
    const clues = [
        {r:1, c:1, v:1}, {r:1, c:2, v:1}, {r:1, c:3, v:1},
        {r:2, c:1, v:1},                  {r:2, c:3, v:1},
        {r:3, c:1, v:1}, {r:3, c:2, v:1}, {r:3, c:3, v:1}
    ];
    
    clues.forEach(c => {
        currentGrid[c.r][c.c] = { type: 'clue', value: c.v };
    });
    
    updateGridDisplay();
}

class MinesweeperSolver {
    constructor(size, cluesGrid) {
        this.size = size;
        this.cluesGrid = cluesGrid;
        this.solutions = [];
        this.maxSolutions = 10;
        
        // 初始化解题网格: null=未知, true=雷, false=空
        this.grid = Array(size).fill().map(() => Array(size).fill(null));
        
        // 预处理：所有线索格一定不是雷
        for(let r=0; r<size; r++) {
            for(let c=0; c<size; c++) {
                if(this.cluesGrid[r][c].type === 'clue') {
                    this.grid[r][c] = false; // Not a mine
                }
            }
        }
    }
    
    solve() {
        this.backtrack(0, 0);
        return this.solutions;
    }
    
    backtrack(row, col) {
        if (this.solutions.length >= this.maxSolutions) return;
        
        if (row >= this.size) {
            // 检查所有线索是否满足
            if (this.isValidCompleteSolution()) {
                // 复制解
                this.solutions.push(this.grid.map(r => [...r]));
            }
            return;
        }
        
        const nextRow = col === this.size - 1 ? row + 1 : row;
        const nextCol = col === this.size - 1 ? 0 : col + 1;
        
        // 如果当前格已经确定（比如是线索格，或者被之前的推导确定了-这里没有推导逻辑，只有预设）
        if (this.grid[row][col] !== null) {
            // 剪枝：检查当前状态是否已经违反了某些已完成的线索
            if (!this.isSafe(row, col)) return;
            
            this.backtrack(nextRow, nextCol);
            return;
        }
        
        // 尝试设为 雷 (true)
        this.grid[row][col] = true;
        if (this.isSafe(row, col)) {
            this.backtrack(nextRow, nextCol);
        }
        
        if (this.solutions.length >= this.maxSolutions) return;

        // 尝试设为 空 (false)
        this.grid[row][col] = false;
        if (this.isSafe(row, col)) {
            this.backtrack(nextRow, nextCol);
        }
        
        // 回溯
        this.grid[row][col] = null;
    }
    
    // 检查在(r,c)改变后，是否违反了周围的线索
    // 只需要检查(r,c)周围的线索格
    isSafe(r, c) {
        // 检查当前格周围3x3区域内的所有线索格
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                    if (this.cluesGrid[nr][nc].type === 'clue') {
                        if (!this.checkClue(nr, nc)) return false;
                    }
                }
            }
        }
        return true;
    }
    
    checkClue(r, c) {
        const clueVal = this.cluesGrid[r][c].value;
        let mineCount = 0;
        let unknownCount = 0;
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                // 跳过自己(线索格本身不可能是雷，但逻辑上不计算自己，虽然它是0)
                if (dr === 0 && dc === 0) continue;
                
                if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                    if (this.grid[nr][nc] === true) mineCount++;
                    else if (this.grid[nr][nc] === null) unknownCount++;
                }
            }
        }
        
        // 如果已发现的雷超过了线索值 -> 错误
        if (mineCount > clueVal) return false;
        
        // 如果已发现的雷 + 未知格 < 线索值 -> 即使全填雷也不够 -> 错误
        if (mineCount + unknownCount < clueVal) return false;
        
        return true;
    }
    
    isValidCompleteSolution() {
        // 再次全面检查所有线索（虽然回溯中检查了，但为了保险）
        for(let r=0; r<this.size; r++) {
            for(let c=0; c<this.size; c++) {
                if (this.cluesGrid[r][c].type === 'clue') {
                    if (!this.checkClueFinal(r, c)) return false;
                }
            }
        }
        return true;
    }
    
    checkClueFinal(r, c) {
        const clueVal = this.cluesGrid[r][c].value;
        let mineCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr===0 && dc===0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                    if (this.grid[nr][nc] === true) mineCount++;
                }
            }
        }
        return mineCount === clueVal;
    }
}

window.onload = initGrid;
























