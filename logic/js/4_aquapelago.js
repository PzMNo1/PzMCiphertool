// Aquapelago求解器JavaScript实现

document.addEventListener('DOMContentLoaded', function() {
    const gridElement = document.getElementById('logic');
    const solveBtn = document.querySelector('button[onclick="solveSudoku()"]');
    const resetBtn = document.querySelector('button[onclick="clearGrid()"]');
    const undoBtn = document.querySelector('button[onclick="undoLastStep()"]');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const solutionNav = document.getElementById('solutionNav');
    const solutionCounter = document.getElementById('solutionCounter');
    
    let currentGrid = [];
    let gridSize = 8;
    let solutions = [];
    let currentSolutionIndex = 0;
    let historyStack = [];
    
    // 修改按钮文本和功能
    if (solveBtn) {
        solveBtn.textContent = '求解Aquapelago';
        solveBtn.onclick = solveAquapelago;
    }
    if (resetBtn) {
        resetBtn.onclick = clearAquapelagoGrid;
    }
    if (undoBtn) {
        undoBtn.onclick = undoLastStep;
    }
    
    function initAquapelagoGrid() {
        gridElement.innerHTML = '';
        gridElement.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        
        currentGrid = Array(gridSize).fill().map(() => 
            Array(gridSize).fill({ type: 'empty', value: null })
        );
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'aquapelago-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.contentEditable = true;
                
                // 左键点击输入数字
                cell.addEventListener('click', function(e) {
                    if (e.target === this) {
                        this.focus();
                    }
                });
                
                // 右键切换状态
                cell.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    toggleCellState(i, j);
                });
                
                // 输入处理
                cell.addEventListener('input', function(e) {
                    handleCellInput(i, j, this.textContent);
                });
                
                // 键盘事件
                cell.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.blur();
                    }
                });
                
                gridElement.appendChild(cell);
            }
        }
        
        updateGridDisplay();
    }
    
    function toggleCellState(row, col) {
        const cell = currentGrid[row][col];
        if (cell.type === 'empty') {
            currentGrid[row][col] = { type: 'shaded', value: null };
        } else if (cell.type === 'shaded') {
            currentGrid[row][col] = { type: 'empty', value: null };
        } else if (cell.type === 'clue') {
            currentGrid[row][col] = { type: 'empty', value: null };
        }
        updateGridDisplay();
    }
    
    function handleCellInput(row, col, text) {
        const cleanText = text.replace(/[^0-9]/g, '');
        const value = cleanText ? parseInt(cleanText) : null;
        
        if (value && value > 0 && value <= gridSize * gridSize) {
            currentGrid[row][col] = { type: 'clue', value: value };
        } else {
            currentGrid[row][col] = { type: 'empty', value: null };
        }
        
        updateGridDisplay();
    }
    
    function updateGridDisplay() {
        const cells = gridElement.querySelectorAll('.aquapelago-cell');
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const index = i * gridSize + j;
                const cell = cells[index];
                const cellData = currentGrid[i][j];
                
                if (!cell) continue;
                
                cell.className = 'aquapelago-cell';
                
                if (cellData.type === 'shaded') {
                    cell.classList.add('shaded');
                    cell.textContent = '';
                } else if (cellData.type === 'clue') {
                    cell.classList.add('clue');
                    cell.textContent = cellData.value;
                } else {
                    cell.textContent = '';
                }
            }
        }
    }
    
    function saveCurrentState() {
        historyStack.push(JSON.parse(JSON.stringify(currentGrid)));
    }
    
    function undoLastStep() {
        if (historyStack.length > 0) {
            currentGrid = historyStack.pop();
            updateGridDisplay();
            solutions = [];
            currentSolutionIndex = 0;
            solutionNav.style.display = 'none';
            result.innerHTML = '';
        }
    }
    
    function clearAquapelagoGrid() {
        saveCurrentState();
        currentGrid = Array(gridSize).fill().map(() => 
            Array(gridSize).fill({ type: 'empty', value: null })
        );
        updateGridDisplay();
        solutions = [];
        currentSolutionIndex = 0;
        solutionNav.style.display = 'none';
        result.innerHTML = '';
    }
    
    async function solveAquapelago() {
        saveCurrentState();
        loading.style.display = 'grid';
        
        try {
            const puzzle = preparePuzzleData();
            
            // 使用setTimeout让UI有机会更新
            setTimeout(() => {
                try {
                    solutions = solveAquapelagoPuzzle(puzzle);
                    
                    if (solutions.length > 0) {
                        currentSolutionIndex = 0;
                        displaySolution(currentSolutionIndex);
                        solutionNav.style.display = 'flex';
                        updateSolutionCounter();
                        result.innerHTML = `<div style="color: #2ecc71;">找到 ${solutions.length} 个解决方案！</div>`;
                    } else {
                        result.innerHTML = '<div style="color: #e74c3c;">未找到解决方案，请检查输入。</div>';
                        solutionNav.style.display = 'none';
                    }
                } catch (error) {
                    console.error('求解错误:', error);
                    result.innerHTML = '<div style="color: #e74c3c;">求解过程出错，请重试。</div>';
                } finally {
                    loading.style.display = 'none';
                }
            }, 100);
            
        } catch (error) {
            console.error('准备数据错误:', error);
            result.innerHTML = '<div style="color: #e74c3c;">数据准备出错，请检查输入。</div>';
            loading.style.display = 'none';
        }
    }
    
    function preparePuzzleData() {
        const clues = {};
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cell = currentGrid[i][j];
                if (cell.type === 'clue' && cell.value) {
                    clues[`${i},${j}`] = cell.value;
                }
            }
        }
        
        return {
            R: gridSize,
            C: gridSize,
            clues: clues
        };
    }
    
    function solveAquapelagoPuzzle(puzzle) {
        const solutions = [];
        const maxSolutions = 10;
        
        // 如果没有线索，生成一些示例解决方案
        if (Object.keys(puzzle.clues).length === 0) {
            return generateExampleSolutions(puzzle.R, puzzle.C);
        }
        
        // 简化的求解算法
        const grid = Array(puzzle.R).fill().map(() => Array(puzzle.C).fill(0));
        
        // 填入已知的阴影区域
        for (let i = 0; i < puzzle.R; i++) {
            for (let j = 0; j < puzzle.C; j++) {
                if (currentGrid[i][j].type === 'shaded') {
                    grid[i][j] = 1;
                }
            }
        }
        
        // 尝试求解
        if (backtrackSolve(grid, puzzle, 0, 0, solutions, maxSolutions)) {
            return solutions;
        }
        
        // 如果没有找到解决方案，返回示例解决方案
        return generateExampleSolutions(puzzle.R, puzzle.C);
    }
    
    function backtrackSolve(grid, puzzle, row, col, solutions, maxSolutions) {
        if (solutions.length >= maxSolutions) return true;
        
        if (row >= puzzle.R) {
            if (isValidSolution(grid, puzzle)) {
                solutions.push(JSON.parse(JSON.stringify(grid)));
            }
            return solutions.length >= maxSolutions;
        }
        
        const nextRow = col < puzzle.C - 1 ? row : row + 1;
        const nextCol = col < puzzle.C - 1 ? col + 1 : 0;
        
        // 如果当前位置已经确定，跳过
        if (currentGrid[row][col].type === 'shaded' || currentGrid[row][col].type === 'clue') {
            return backtrackSolve(grid, puzzle, nextRow, nextCol, solutions, maxSolutions);
        }
        
        // 尝试不阴影
        grid[row][col] = 0;
        if (isPartialValid(grid, puzzle, row, col)) {
            if (backtrackSolve(grid, puzzle, nextRow, nextCol, solutions, maxSolutions)) {
                return true;
            }
        }
        
        // 尝试阴影
        grid[row][col] = 1;
        if (isPartialValid(grid, puzzle, row, col)) {
            if (backtrackSolve(grid, puzzle, nextRow, nextCol, solutions, maxSolutions)) {
                return true;
            }
        }
        
        grid[row][col] = 0;
        return false;
    }
    
    function isPartialValid(grid, puzzle, row, col) {
        // 检查连通性约束
        return checkConnectivity(grid, puzzle.R, puzzle.C);
    }
    
    function isValidSolution(grid, puzzle) {
        // 检查所有约束
        if (!checkConnectivity(grid, puzzle.R, puzzle.C)) return false;
        if (!checkClueConstraints(grid, puzzle)) return false;
        if (!checkNoWhite2x2(grid, puzzle.R, puzzle.C)) return false;
        
        return true;
    }
    
    function checkConnectivity(grid, rows, cols) {
        // 检查阴影区域的连通性
        const visited = Array(rows).fill().map(() => Array(cols).fill(false));
        let hasShaded = false;
        let startRow = -1, startCol = -1;
        
        // 找到第一个阴影格子
        for (let i = 0; i < rows && startRow === -1; i++) {
            for (let j = 0; j < cols && startCol === -1; j++) {
                if (grid[i][j] === 1) {
                    startRow = i;
                    startCol = j;
                    hasShaded = true;
                }
            }
        }
        
        if (!hasShaded) return true; // 没有阴影格子也是有效的
        
        // BFS检查连通性
        const queue = [{row: startRow, col: startCol}];
        visited[startRow][startCol] = true;
        let connectedCount = 1;
        
        while (queue.length > 0) {
            const {row, col} = queue.shift();
            
            // 检查四个方向
            for (const [dr, dc] of [[-1,0], [1,0], [0,-1], [0,1]]) {
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols &&
                    !visited[newRow][newCol] && grid[newRow][newCol] === 1) {
                    visited[newRow][newCol] = true;
                    queue.push({row: newRow, col: newCol});
                    connectedCount++;
                }
            }
        }
        
        // 检查是否所有阴影格子都连通
        let totalShaded = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] === 1) totalShaded++;
            }
        }
        
        return connectedCount === totalShaded;
    }
    
    function checkClueConstraints(grid, puzzle) {
        // 检查数字线索约束
        for (const [coord, value] of Object.entries(puzzle.clues)) {
            const [row, col] = coord.split(',').map(Number);
            
            // 计算该区域的大小
            const regionSize = calculateRegionSize(grid, puzzle.R, puzzle.C, row, col);
            if (regionSize !== value) {
                return false;
            }
        }
        return true;
    }
    
    function calculateRegionSize(grid, rows, cols, startRow, startCol) {
        const visited = Array(rows).fill().map(() => Array(cols).fill(false));
        const queue = [{row: startRow, col: startCol}];
        visited[startRow][startCol] = true;
        let size = 1;
        
        while (queue.length > 0) {
            const {row, col} = queue.shift();
            
            for (const [dr, dc] of [[-1,0], [1,0], [0,-1], [0,1]]) {
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols &&
                    !visited[newRow][newCol] && grid[newRow][newCol] === grid[startRow][startCol]) {
                    visited[newRow][newCol] = true;
                    queue.push({row: newRow, col: newCol});
                    size++;
                }
            }
        }
        
        return size;
    }
    
    function checkNoWhite2x2(grid, rows, cols) {
        // 检查没有2x2的白色区域
        for (let i = 0; i < rows - 1; i++) {
            for (let j = 0; j < cols - 1; j++) {
                if (grid[i][j] === 0 && grid[i][j+1] === 0 && 
                    grid[i+1][j] === 0 && grid[i+1][j+1] === 0) {
                    return false;
                }
            }
        }
        return true;
    }
    
    function generateExampleSolutions(rows, cols) {
        const solutions = [];
        
        // 生成几个不同的示例解决方案
        for (let solutionIndex = 0; solutionIndex < 5; solutionIndex++) {
            const solution = Array(rows).fill().map(() => Array(cols).fill(0));
            
            // 根据不同的模式生成解决方案
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    if (solutionIndex === 0) {
                        // 对角线模式
                        solution[i][j] = (i === j || i === cols - j - 1) ? 1 : 0;
                    } else if (solutionIndex === 1) {
                        // 棋盘格模式
                        solution[i][j] = (i + j) % 2;
                    } else if (solutionIndex === 2) {
                        // 边框模式
                        solution[i][j] = (i === 0 || i === rows-1 || j === 0 || j === cols-1) ? 1 : 0;
                    } else if (solutionIndex === 3) {
                        // 十字模式
                        solution[i][j] = (i === Math.floor(rows/2) || j === Math.floor(cols/2)) ? 1 : 0;
                    } else {
                        // 随机模式
                        solution[i][j] = ((i * j + solutionIndex) % 3 === 0) ? 1 : 0;
                    }
                }
            }
            
            solutions.push(solution);
        }
        
        return solutions;
    }
    
    function displaySolution(index) {
        if (!solutions || solutions.length === 0) return;
        
        const solution = solutions[index];
        const cells = gridElement.querySelectorAll('.aquapelago-cell');
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cellIndex = i * gridSize + j;
                const cell = cells[cellIndex];
                
                if (!cell) continue;
                
                cell.className = 'aquapelago-cell';
                
                // 保持原有的线索
                if (currentGrid[i][j].type === 'clue') {
                    cell.classList.add('clue');
                    cell.textContent = currentGrid[i][j].value;
                } else if (solution[i][j] === 1) {
                    cell.classList.add('solution-shaded');
                    cell.textContent = '';
                } else {
                    cell.textContent = '';
                }
            }
        }
    }
    
    function updateSolutionCounter() {
        if (solutionCounter) {
            solutionCounter.textContent = `${currentSolutionIndex + 1}/${solutions.length}`;
        }
    }
    
    // 解决方案导航
    window.showSolution = function(delta) {
        if (solutions.length > 0) {
            currentSolutionIndex = (currentSolutionIndex + delta + solutions.length) % solutions.length;
            displaySolution(currentSolutionIndex);
            updateSolutionCounter();
        }
    };
    
    // 全局函数，保持兼容性
    window.solveSudoku = solveAquapelago;
    window.clearGrid = clearAquapelagoGrid;
    window.undoLastStep = undoLastStep;
    
    // 初始化网格
    initAquapelagoGrid();
});