(function () {
    function jsDoppelblockSolver(puzzle) {
        const N = puzzle.size;
        const userGrid = puzzle.grid;
        const clues = puzzle.clues;
        const maxSolutions = 10;
        const grid = Array(N).fill(0).map(() => Array(N).fill(null));

        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (userGrid[r][c].type === 'black') grid[r][c] = 0;
                else if (userGrid[r][c].type === 'number') grid[r][c] = userGrid[r][c].value;
            }
        }

        const solutions = [];

        const rowBlacks = new Int8Array(N);
        const colBlacks = new Int8Array(N);
        const rowNums = Array(N).fill(0).map(() => new Set());
        const colNums = Array(N).fill(0).map(() => new Set());

        try {
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const val = grid[r][c];
                    if (val !== null) {
                        if (val === 0) {
                            rowBlacks[r]++;
                            colBlacks[c]++;
                        } else {
                            if (rowNums[r].has(val)) throw new Error(`Row ${r + 1} has duplicate number ${val}`);
                            if (colNums[c].has(val)) throw new Error(`Col ${c + 1} has duplicate number ${val}`);
                            rowNums[r].add(val);
                            colNums[c].add(val);
                        }
                    }
                }
            }

            for (let i = 0; i < N; i++) {
                if (rowBlacks[i] > 2) throw new Error(`Row ${i + 1} has >2 black cells`);
                if (colBlacks[i] > 2) throw new Error(`Col ${i + 1} has >2 black cells`);
            }
        } catch (e) {
            console.warn(e.message);
            return [];
        }

        function getRowSum(r) {
            let sum = 0;
            let foundFirst = false;
            for (let c = 0; c < N; c++) {
                if (grid[r][c] === 0) {
                    if (foundFirst) return sum;
                    foundFirst = true;
                } else if (foundFirst && grid[r][c] !== null) {
                    sum += grid[r][c];
                }
            }
            return foundFirst ? sum : 0;
        }

        function getColSum(c) {
            let sum = 0;
            let foundFirst = false;
            for (let r = 0; r < N; r++) {
                if (grid[r][c] === 0) {
                    if (foundFirst) return sum;
                    foundFirst = true;
                } else if (foundFirst && grid[r][c] !== null) {
                    sum += grid[r][c];
                }
            }
            return foundFirst ? sum : 0;
        }

        function solve(idx) {
            if (solutions.length >= maxSolutions) return;

            if (idx === N * N) {
                for (let i = 0; i < N; i++) {
                    if (rowBlacks[i] !== 2 || colBlacks[i] !== 2) return;
                }
                for (let c = 0; c < N; c++) {
                    if (clues.top[c] !== null && getColSum(c) !== clues.top[c]) return;
                    if (clues.bottom[c] !== null && getColSum(c) !== clues.bottom[c]) return;
                }
                for (let r = 0; r < N; r++) {
                    if (clues.left[r] !== null && getRowSum(r) !== clues.left[r]) return;
                    if (clues.right[r] !== null && getRowSum(r) !== clues.right[r]) return;
                }
                solutions.push(grid.map(row => [...row]));
                return;
            }

            const r = Math.floor(idx / N);
            const c = idx % N;

            if (N - c < 2 - rowBlacks[r] || N - r < 2 - colBlacks[c]) return;

            if (grid[r][c] !== null) {
                solve(idx + 1);
                return;
            }

            // Branch 1: Set Black
            if (rowBlacks[r] < 2 && colBlacks[c] < 2) {
                grid[r][c] = 0;
                rowBlacks[r]++;
                colBlacks[c]++;

                let valid = true;
                if (rowBlacks[r] === 2) {
                    const s = getRowSum(r);
                    if (clues.left[r] !== null && s !== clues.left[r]) valid = false;
                    if (clues.right[r] !== null && s !== clues.right[r]) valid = false;
                }
                if (valid && colBlacks[c] === 2) {
                    const s = getColSum(c);
                    if (clues.top[c] !== null && s !== clues.top[c]) valid = false;
                    if (clues.bottom[c] !== null && s !== clues.bottom[c]) valid = false;
                }

                if (valid) solve(idx + 1);

                rowBlacks[r]--;
                colBlacks[c]--;
                grid[r][c] = null;
            }

            if (solutions.length >= maxSolutions) return;

            // Branch 2: Set Number
            for (let n = 1; n <= N - 2; n++) {
                if (!rowNums[r].has(n) && !colNums[c].has(n)) {
                    grid[r][c] = n;
                    rowNums[r].add(n);
                    colNums[c].add(n);

                    let valid = true;
                    if (rowBlacks[r] === 1) {
                        if (clues.left[r] !== null || clues.right[r] !== null) {
                            let s = 0;
                            let passedFirst = false;
                            for (let k = 0; k <= c; k++) {
                                if (grid[r][k] === 0) passedFirst = true;
                                else if (passedFirst && grid[r][k] !== null) s += grid[r][k];
                            }
                            const limit = clues.left[r] !== null ? clues.left[r] : clues.right[r];
                            if (limit !== null && s > limit) valid = false;
                        }
                    }
                    if (valid && colBlacks[c] === 1) {
                        if (clues.top[c] !== null || clues.bottom[c] !== null) {
                            let s = 0;
                            let passedFirst = false;
                            for (let k = 0; k <= r; k++) {
                                if (grid[k][c] === 0) passedFirst = true;
                                else if (passedFirst && grid[k][c] !== null) s += grid[k][c];
                            }
                            const limit = clues.top[c] !== null ? clues.top[c] : clues.bottom[c];
                            if (limit !== null && s > limit) valid = false;
                        }
                    }

                    if (valid) solve(idx + 1);

                    rowNums[r].delete(n);
                    colNums[c].delete(n);
                    grid[r][c] = null;
                }
            }
        }

        solve(0);
        return solutions;
    }

    // ------------------------------------------------------------------
    // API Export
    // ------------------------------------------------------------------
    window.solveDoppelblock = function (puzzle) {
        return jsDoppelblockSolver(puzzle);
    };

    window.buildSimpleDoppelblockExample = function () {
        const sizeInput = document.getElementById('doppelblock-size');
        if (sizeInput) sizeInput.value = 5;
        window.initDoppelblockGrid();

        // 5x5 Example: numbers are 1, 2, 3
        const exampleClues = {
            top: [1, 2, null, 5, null],
            bottom: [null, null, null, null, null],
            left: [null, null, null, null, 3],
            right: [null, null, null, null, null]
        };

        // For a 5x5 Doppelblock solver, clues should be set in inputs
        for (let c = 0; c < 5; c++) {
            const topInput = document.querySelector(`.doppelblock-clue[data-pos="top"][data-idx="${c}"] input`);
            if (topInput && exampleClues.top[c] !== null) topInput.value = exampleClues.top[c];
        }
        for (let r = 0; r < 5; r++) {
            const leftInput = document.querySelector(`.doppelblock-clue[data-pos="left"][data-idx="${r}"] input`);
            if (leftInput && exampleClues.left[r] !== null) leftInput.value = exampleClues.left[r];
        }

        if (window.doppelblockClues) {
            window.doppelblockClues.top = exampleClues.top;
            window.doppelblockClues.bottom = exampleClues.bottom;
            window.doppelblockClues.left = exampleClues.left;
            window.doppelblockClues.right = exampleClues.right;
        }
    };
})();
