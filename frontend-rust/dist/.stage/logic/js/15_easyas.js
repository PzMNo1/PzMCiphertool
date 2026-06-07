/**
 * EasyAs Solver (Refactored for cyber-harness)
 * No DOM references allowed here.
 */
(function () {
    window.solveEasyas = function (puzzle) {
        const N = puzzle.rows; // Assumes rows == cols and is square
        const K = puzzle.letters;
        const maxSolutions = 5;
        const TIME_LIMIT = 3500;
        const startTime = performance.now();
        let isTimeout = false;
        const maxEmpty = N - K;
        const grid = new Int8Array(N * N);
        grid.fill(-1);
        const rowUsed = new Int32Array(N);
        const colUsed = new Int32Array(N);
        const rowEmptyCount = new Int8Array(N);
        const colEmptyCount = new Int8Array(N);
        const clues = {
            top: new Int8Array(N).fill(0),
            bottom: new Int8Array(N).fill(0),
            left: new Int8Array(N).fill(0),
            right: new Int8Array(N).fill(0)
        };
        const charToNum = (c) => c ? c.toUpperCase().charCodeAt(0) - 64 : 0;
        const numToChar = (n) => String.fromCharCode(64 + n);
        for (let i = 0; i < N; i++) {
            if (puzzle.clues.top[i]) clues.top[i] = charToNum(puzzle.clues.top[i]);
            if (puzzle.clues.bottom[i]) clues.bottom[i] = charToNum(puzzle.clues.bottom[i]);
            if (puzzle.clues.left[i]) clues.left[i] = charToNum(puzzle.clues.left[i]);
            if (puzzle.clues.right[i]) clues.right[i] = charToNum(puzzle.clues.right[i]);
        }
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                const cell = puzzle.grid[r][c];
                const type = cell.type;
                if (type === 'letter') {
                    const val = charToNum(cell.value);
                    grid[r * N + c] = val;
                    rowUsed[r] |= (1 << val);
                    colUsed[c] |= (1 << val);
                } else if (type === 'marker') {
                    grid[r * N + c] = 0;
                    rowEmptyCount[r]++;
                    colEmptyCount[c]++;
                }
            }
        }
        for (let i = 0; i < N; i++) {
            if (rowEmptyCount[i] > maxEmpty || colEmptyCount[i] > maxEmpty) {
                return { solutions: [], timeout: false };
            }
        }

        const solutions = [];
        let iterationCounter = 0;
        function solve(idx) {
            if (solutions.length >= maxSolutions) return;
            if ((++iterationCounter & 0xFFF) === 0) { // Check timeout every 4096 iterations
                if (performance.now() - startTime > TIME_LIMIT) {
                    isTimeout = true;
                    return;
                }
            }
            if (isTimeout) return;

            if (idx === N * N) {
                for (let i = 0; i < N; i++) {
                    if (rowEmptyCount[i] !== maxEmpty) return;
                    if (colEmptyCount[i] !== maxEmpty) return;
                }
                if (checkViewpoints()) {
                    const sol = [];
                    for (let r = 0; r < N; r++) {
                        const row = [];
                        for (let c = 0; c < N; c++) {
                            row.push(grid[r * N + c]);
                        }
                        sol.push(row);
                    }
                    solutions.push(sol);
                }
                return;
            }

            const r = Math.floor(idx / N);
            const c = idx % N;

            if (grid[idx] !== -1) {
                if (grid[idx] > 0) {
                    if (!checkIncrementalValidity(r, c, grid[idx])) return;
                } else { }
                solve(idx + 1);
                return;
            }

            // Try Empty (0)
            if (rowEmptyCount[r] < maxEmpty && colEmptyCount[c] < maxEmpty) {
                grid[idx] = 0;
                let ok = true;
                if (c === N - 1) {
                    if (clues.right[r] !== 0) {
                        let last = 0;
                        for (let k = N - 1; k >= 0; k--) if (grid[r * N + k] > 0) { last = grid[r * N + k]; break; }
                        if (last !== clues.right[r]) ok = false;
                    }
                }
                if (ok && r === N - 1) {
                    if (clues.bottom[c] !== 0) {
                        let last = 0;
                        for (let k = N - 1; k >= 0; k--) if (grid[k * N + c] > 0) { last = grid[k * N + c]; break; }
                        if (last !== clues.bottom[c]) ok = false;
                    }
                }

                if (ok) {
                    rowEmptyCount[r]++;
                    colEmptyCount[c]++;
                    solve(idx + 1);
                    rowEmptyCount[r]--;
                    colEmptyCount[c]--;
                }
                grid[idx] = -1;
            }
            if (solutions.length >= maxSolutions || isTimeout) return;

            // Try Letters (1..K)
            for (let val = 1; val <= K; val++) {
                if (((rowUsed[r] & (1 << val)) === 0) && ((colUsed[c] & (1 << val)) === 0)) {
                    // Check Left/Top incrementally before modifying state
                    let ok = true;
                    if (clues.left[r] !== 0) {
                        let isFirst = true;
                        for (let k = 0; k < c; k++) if (grid[r * N + k] > 0) { isFirst = false; break; }
                        if (isFirst && clues.left[r] !== val) ok = false;
                    }
                    if (ok && clues.top[c] !== 0) {
                        let isFirst = true;
                        for (let k = 0; k < r; k++) if (grid[k * N + c] > 0) { isFirst = false; break; }
                        if (isFirst && clues.top[c] !== val) ok = false;
                    }

                    if (!ok) continue;

                    grid[idx] = val;
                    
                    if (c === N - 1) {
                        if (clues.right[r] !== 0) {
                            let last = 0;
                            for (let k = N - 1; k >= 0; k--) if (grid[r * N + k] > 0) { last = grid[r * N + k]; break; }
                            if (last !== clues.right[r]) ok = false;
                        }
                    }
                    if (ok && r === N - 1) {
                        if (clues.bottom[c] !== 0) {
                            let last = 0;
                            for (let k = N - 1; k >= 0; k--) if (grid[k * N + c] > 0) { last = grid[k * N + c]; break; }
                            if (last !== clues.bottom[c]) ok = false;
                        }
                    }

                    if (ok) {
                        rowUsed[r] |= (1 << val);
                        colUsed[c] |= (1 << val);
                        solve(idx + 1);
                        rowUsed[r] &= ~(1 << val);
                        colUsed[c] &= ~(1 << val);
                    }
                    grid[idx] = -1;
                }
            }
        }

        function checkViewpoints() {
            for (let r = 0; r < N; r++) {
                if (clues.left[r]) {
                    let first = 0;
                    for (let c = 0; c < N; c++) if (grid[r * N + c] > 0) { first = grid[r * N + c]; break; }
                    if (first !== clues.left[r]) return false;
                }
                if (clues.right[r]) {
                    let last = 0;
                    for (let c = N - 1; c >= 0; c--) if (grid[r * N + c] > 0) { last = grid[r * N + c]; break; }
                    if (last !== clues.right[r]) return false;
                }
            }
            for (let c = 0; c < N; c++) {
                if (clues.top[c]) {
                    let first = 0;
                    for (let r = 0; r < N; r++) if (grid[r * N + c] > 0) { first = grid[r * N + c]; break; }
                    if (first !== clues.top[c]) return false;
                }
                if (clues.bottom[c]) {
                    let last = 0;
                    for (let r = N - 1; r >= 0; r--) if (grid[r * N + c] > 0) { last = grid[r * N + c]; break; }
                    if (last !== clues.bottom[c]) return false;
                }
            }
            return true;
        }

        solve(0);

        return {
            solutions: solutions,
            timeout: isTimeout
        };
    };
})();
