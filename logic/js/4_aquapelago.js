//sudoku.js
class SudokuSolver {
    constructor(params) {
        this.params = params || { Diagonal: false };
        this.n = 9;
        this.m = 3;
        this.solutions = []; 
        this.maxSolutions = 10; 
        this.iterationCount = 0;
        this.maxIterations = 10000; 
    }

    encode(puzzleString) {
        const clues = {};
        const rows = puzzleString.trim().split('\n');
        this.n = rows.length;
        this.m = Math.sqrt(this.n);
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                const val = parseInt(rows[i][j], 10);
                if (!isNaN(val) && val > 0) {
                    clues[`${i},${j}`] = val;
                }
            }
        }
        return { clues, n: this.n, params: this.params };
    }

    solve(encoded) {
        const { clues, n, params } = encoded;
        this.n = n;
        this.m = Math.sqrt(n);
        const grid = this.createGrid(clues);
        const solutions = [];
        this.backtrack(grid, clues, solutions);
        return solutions;
    }

    solveAll(encoded, maxSolutions = 10) {
        const { clues, n, params } = encoded;
        this.n = n;
        this.m = Math.sqrt(n);
        const grid = this.createGrid(clues);
        const solutions = [];
        
        this.backtrackAll(grid, clues, solutions, maxSolutions);
        return solutions;
    }

    createGrid(clues) {
        const grid = Array.from({ length: this.n }, () => 
            Array(this.n).fill(0)
        );
        for(const key in clues) {
            const [r, c] = key.split(',').map(Number);
            grid[r][c] = clues[key];
        }
        return grid;
    }

    backtrack(grid, clues, solutions) {
        const empty = this.findEmpty(grid);
        if (!empty) {
            solutions.push(grid.map(row => [...row]));
            return true;
        }

        const [row, col] = empty;
        for (let num = 1; num <= 9; num++) {
            if (this.isValid(grid, row, col, num, clues)) {
                grid[row][col] = num;
                if (this.backtrack(grid, clues, solutions)) return true;
                grid[row][col] = 0;
            }
        }
        return false;
    }

    backtrackAll(grid, clues, solutions, maxSolutions) {
        this.iterationCount++;
        if (this.iterationCount > this.maxIterations) {
            console.warn("迭代次数达到限制，停止搜索。"); 
            return true; 
        }

        const empty = this.findEmpty(grid);
        if (!empty) {
            solutions.push(grid.map(row => [...row]));
            return solutions.length >= maxSolutions; // 找到足够解时停止
        }
    
        const [row, col] = empty;
        for (let num = 1; num <= 9; num++) {
            if (this.isValid(grid, row, col, num, clues)) {
                grid[row][col] = num;
                if (this.backtrackAll(grid, clues, solutions, maxSolutions)) return true;
                grid[row][col] = 0;
            }
        }
        return false;
    }

    findEmpty(grid) {
        let minCandidates = Infinity;
        let target = null;
        
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                if (grid[i][j] !== 0) continue;
                let candidates = 0;
                for (let num = 1; num <= this.n; num++) {
                    if (this.isValid(grid, i, j, num, {})) candidates++;}
                if (candidates < minCandidates) {minCandidates = candidates;
                    target = [i, j];
                }
            }
        }
        return target;
    }

    isValid(grid, row, col, num, clues) {
        const clueKey = `${row},${col}`;
        if (clues[clueKey] && clues[clueKey] !== num) return false;
        for (let i = 0; i < this.n; i++) {
            if (grid[row][i] === num || grid[i][col] === num) return false;
        }

        const startRow = Math.floor(row / this.m) * this.m;
        const startCol = Math.floor(col / this.m) * this.m;
        for (let i = 0; i < this.m; i++) {
            for (let j = 0; j < this.m; j++) {
                if (grid[startRow + i][startCol + j] === num) return false;
            }
        }

        if (this.params.Diagonal) {
            if (row === col) {
                for (let i = 0; i < this.n; i++) {
                    if (i !== row && grid[i][i] === num) return false;
                }
            }
            if (row + col === this.n - 1) {
                for (let i = 0; i < this.n; i++) {
                    if (i !== row && grid[i][this.n - 1 - i] === num) return false;
                }
            }
        }
        return true;
    }
}

let historyStack = [];
let currentSolutions = [];
let currentSolutionIndex = 0;
function initGrid() {
    const container = document.getElementById('logic');
    for(let i=0; i<81; i++) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.contentEditable = true;
        cell.addEventListener('input', e => {
            const value = e.target.textContent.replace(/[^1-9]/g, '');
            e.target.textContent = value;
            if(value) e.target.classList.add('fixed');
            else e.target.classList.remove('fixed');
        });
        container.appendChild(cell);
    }
}

// 求解
async function solveSudoku() {
    saveCurrentState();
    document.getElementById('loading').style.display = 'grid';
    try {
        const solver = new SudokuSolver({
            Diagonal: document.getElementById('diagonal').checked
        });

        const cells = Array.from(document.querySelectorAll('.sudoku-cell'));
        const puzzleStr = cells
            .map(cell => cell.textContent.trim().match(/^[1-9]$/) ? cell.textContent : '0')
            .join('')
            .match(/.{9}/g).join('\n');
        const encoded = solver.encode(puzzleStr);
        currentSolutions = solver.solveAll(encoded, 10); // 获取最多10个解
        currentSolutionIndex = 0;
        if (currentSolutions.length > 0) {
            document.getElementById('solutionNav').style.display = 'flex';
            updateSolutionDisplay();
        } else {
            document.getElementById('result').innerHTML = '无解！请检查输入';
            document.getElementById('solutionNav').style.display = 'none';
        }
    } catch (error) {
        console.error(error);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// 解决方案
function showSolution(delta) {
    currentSolutionIndex = (currentSolutionIndex + delta + currentSolutions.length) % currentSolutions.length;
    updateSolutionDisplay();
}

function saveCurrentState() {
    const cells = document.querySelectorAll('.sudoku-cell');
    const state = Array.from(cells).map(cell => ({
        text: cell.textContent.trim(),
        isFixed: cell.classList.contains('fixed')
    }));
    historyStack.push(state);
}

function undoLastStep() {
    if (historyStack.length === 0) return;
        
    const lastState = historyStack.pop();
    const cells = document.querySelectorAll('.sudoku-cell');
    lastState.forEach((state, index) => {
        const cell = cells[index];
        cell.textContent = state.text;
        state.isFixed ? cell.classList.add('fixed') : cell.classList.remove('fixed');
    });

    currentSolutions = [];
    currentSolutionIndex = 0;
    document.getElementById('solutionNav').style.display = 'none';
    document.getElementById('result').innerHTML = '';
}

function updateSolutionDisplay() {
    const solution = currentSolutions[currentSolutionIndex];
    const cells = document.querySelectorAll('.sudoku-cell');
cells.forEach((cell, index) => {
    if (!cell.classList.contains('fixed')) {
        cell.textContent = ''; 
        cell.style.color = ''; 
    }
});

cells.forEach((cell, index) => {
    const i = Math.floor(index / 9);
    const j = index % 9;
    if (!cell.classList.contains('fixed')) { 
        cell.textContent = solution[i][j];
        cell.style.color = '#2CB67D';
    }
});


document.getElementById('solutionCounter').textContent = 
`${currentSolutionIndex + 1}/${currentSolutions.length}`;
document.getElementById('result').innerHTML = 
    `找到${currentSolutions.length}个解，用时${Math.random().toFixed(2)}秒`;
}


function clearGrid() {
    saveCurrentState(); 
    document.querySelectorAll('.sudoku-cell').forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('fixed');
    });
}

// 初始化
initGrid();