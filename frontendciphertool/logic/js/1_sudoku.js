(function() {
    function jsSudokuSolver(puzzle) {
        let n = puzzle.size;
        let m = Math.sqrt(n);
        let grid = Array.from({ length: n }, () => Array(n).fill(0));
        
        for (const key in puzzle.clues) {
            const [r, c] = key.split(',').map(Number);
            grid[r][c] = puzzle.clues[key];
        }

        let solutions = [];
        let iterationCount = 0;
        const maxIterations = 10000;
        const maxSolutions = 10;

        function isValid(r, c, num) {
            const clueKey = `${r},${c}`;
            if (puzzle.clues[clueKey] && puzzle.clues[clueKey] !== num) return false;
            for (let i = 0; i < n; i++) {
                if (grid[r][i] === num || grid[i][c] === num) return false;
            }
            const startRow = Math.floor(r / m) * m;
            const startCol = Math.floor(c / m) * m;
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < m; j++) {
                    if (grid[startRow + i][startCol + j] === num) return false;
                }
            }
            if (puzzle.params && puzzle.params.Diagonal) {
                if (r === c) {
                    for (let i = 0; i < n; i++) {
                        if (i !== r && grid[i][i] === num) return false;
                    }
                }
                if (r + c === n - 1) {
                    for (let i = 0; i < n; i++) {
                        if (i !== r && grid[i][n - 1 - i] === num) return false;
                    }
                }
            }
            return true;
        }

        function findEmpty() {
            let minCandidates = Infinity;
            let target = null;
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (grid[i][j] !== 0) continue;
                    let candidates = 0;
                    for (let num = 1; num <= n; num++) {
                        if (isValid(i, j, num)) candidates++;
                    }
                    if (candidates < minCandidates) {
                        minCandidates = candidates;
                        target = [i, j];
                        if (candidates === 1) return target; // Quick exit for deterministic cells
                    }
                }
            }
            return target;
        }

        function solveBT() {
            iterationCount++;
            if (iterationCount > maxIterations) return true; // Stop early
            
            const empty = findEmpty();
            if (!empty) {
                solutions.push(grid.map(row => [...row]));
                return solutions.length >= maxSolutions;
            }
            const [row, col] = empty;
            for (let num = 1; num <= n; num++) {
                if (isValid(row, col, num)) {
                    grid[row][col] = num;
                    if (solveBT()) return true;
                    grid[row][col] = 0;
                }
            }
            return false;
        }

        solveBT();
        return solutions;
    }

    // ------------------------------------------------------------------
    // API Export
    // ------------------------------------------------------------------
    window.solveSudoku = function(puzzle) {
        return jsSudokuSolver(puzzle);
    };

    window.buildSimpleSudokuExample = function() {
        if(window.clearSudokuGrid) window.clearSudokuGrid();
        
        // A simple valid 9x9 sudoku starter grid
        const starter = [
            [5, 3, 0, 0, 7, 0, 0, 0, 0],
            [6, 0, 0, 1, 9, 5, 0, 0, 0],
            [0, 9, 8, 0, 0, 0, 0, 6, 0],
            [8, 0, 0, 0, 6, 0, 0, 0, 3],
            [4, 0, 0, 8, 0, 3, 0, 0, 1],
            [7, 0, 0, 0, 2, 0, 0, 0, 6],
            [0, 6, 0, 0, 0, 0, 2, 8, 0],
            [0, 0, 0, 4, 1, 9, 0, 0, 5],
            [0, 0, 0, 0, 8, 0, 0, 7, 9]
        ];

        const cells = document.querySelectorAll('.sudoku-cell');
        if (cells.length === 81) {
            cells.forEach((cell, index) => {
                const r = Math.floor(index / 9);
                const c = index % 9;
                if (starter[r][c] !== 0) {
                    cell.value = starter[r][c];
                    cell.classList.add('fixed');
                } else {
                    cell.value = '';
                    cell.classList.remove('fixed');
                }
            });
        }
    };
})();