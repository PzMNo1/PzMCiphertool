(function () {
    // -------------------------------------------------------------
    // CORE SOLVER LOGIC
    // -------------------------------------------------------------
    function generateAqreRegions(R, C, edgeIds) {
        const regions = [];
        const visited = Array(R).fill().map(() => Array(C).fill(false));

        for (let i = 0; i < R; i++) {
            for (let j = 0; j < C; j++) {
                if (!visited[i][j]) {
                    const region = [];
                    const queue = [[i, j]];
                    visited[i][j] = true;

                    while (queue.length > 0) {
                        const [r, c] = queue.shift();
                        region.push([r, c]);

                        // up
                        if (r > 0 && !visited[r - 1][c] && !edgeIds['h_' + r + '_' + c]) {
                            visited[r - 1][c] = true;
                            queue.push([r - 1, c]);
                        }
                        // down
                        if (r < R - 1 && !visited[r + 1][c] && !edgeIds['h_' + (r + 1) + '_' + c]) {
                            visited[r + 1][c] = true;
                            queue.push([r + 1, c]);
                        }
                        // left
                        if (c > 0 && !visited[r][c - 1] && !edgeIds['v_' + r + '_' + (c - 1)]) {
                            visited[r][c - 1] = true;
                            queue.push([r, c - 1]);
                        }
                        // right
                        if (c < C - 1 && !visited[r][c + 1] && !edgeIds['v_' + r + '_' + c]) {
                            visited[r][c + 1] = true;
                            queue.push([r, c + 1]);
                        }
                    }
                    regions.push(region);
                }
            }
        }
        return regions;
    }

    function solveAqreBT(R, C, clues, edgeIds, initialGridState) {
        const maxSolutions = 10;
        const solutions = [];

        const grid = Array(R).fill().map(() => Array(C).fill(null));
        const regions = generateAqreRegions(R, C, edgeIds);

        const cellRegion = Array(R).fill().map(() => Array(C).fill(-1));
        const regionMaxBlacks = Array(regions.length).fill(-1);
        const regionCurrBlacks = Array(regions.length).fill(0);
        const regionCurrNulls = Array(regions.length).fill(0);

        for (const coord in clues) {
            const parts = coord.split(',');
            const r = parseInt(parts[0], 10);
            const c = parseInt(parts[1], 10);
            for (let idx = 0; idx < regions.length; idx++) {
                if (regions[idx].some((p) => p[0] === r && p[1] === c)) {
                    regionMaxBlacks[idx] = clues[coord];
                }
            }
        }

        let globalTotalOnes = 0;
        for (let idx = 0; idx < regions.length; idx++) {
            for (const p of regions[idx]) {
                const r = p[0], c = p[1];
                cellRegion[r][c] = idx;
                if (initialGridState[r][c].type === 'black') {
                    grid[r][c] = 1;
                    regionCurrBlacks[idx]++;
                    globalTotalOnes++;
                } else {
                    regionCurrNulls[idx]++;
                }
            }
        }

        const startTime = Date.now();
        const MAX_SOLVE_TIME = 5000;
        let timeoutFlag = false;

        function checkFourConnectedAt(row, col) {
            const color = grid[row][col];
            if (col >= 3 && grid[row][col - 1] === color && grid[row][col - 2] === color && grid[row][col - 3] === color) return false;
            if (row >= 3 && grid[row - 1][col] === color && grid[row - 2][col] === color && grid[row - 3][col] === color) return false;
            return true;
        }

        function checkPotentialConnectivity() {
            if (globalTotalOnes <= 1) return true;

            let firstR = -1, firstC = -1;
            for (let r = 0; r < R; r++) {
                for (let c = 0; c < C; c++) {
                    if (grid[r][c] === 1) {
                        firstR = r; firstC = c;
                        break;
                    }
                }
                if (firstR !== -1) break;
            }

            const visited = Array(R).fill().map(() => Array(C).fill(false));
            const queue = Array(R * C);
            let head = 0, tail = 0;

            queue[tail++] = (firstR << 8) | firstC;
            visited[firstR][firstC] = true;
            let reachedOnes = 1;

            while (head < tail) {
                const val = queue[head++];
                const r = val >> 8;
                const c = val & 0xFF;

                if (r > 0 && !visited[r - 1][c] && grid[r - 1][c] !== 0) {
                    visited[r - 1][c] = true;
                    if (grid[r - 1][c] === 1) reachedOnes++;
                    queue[tail++] = ((r - 1) << 8) | c;
                }
                if (r < R - 1 && !visited[r + 1][c] && grid[r + 1][c] !== 0) {
                    visited[r + 1][c] = true;
                    if (grid[r + 1][c] === 1) reachedOnes++;
                    queue[tail++] = ((r + 1) << 8) | c;
                }
                if (c > 0 && !visited[r][c - 1] && grid[r][c - 1] !== 0) {
                    visited[r][c - 1] = true;
                    if (grid[r][c - 1] === 1) reachedOnes++;
                    queue[tail++] = (r << 8) | (c - 1);
                }
                if (c < C - 1 && !visited[r][c + 1] && grid[r][c + 1] !== 0) {
                    visited[r][c + 1] = true;
                    if (grid[r][c + 1] === 1) reachedOnes++;
                    queue[tail++] = (r << 8) | (c + 1);
                }

                if (reachedOnes === globalTotalOnes) return true;
            }
            return false;
        }

        function checkFinalValidity() {
            if (globalTotalOnes <= 1) return true;

            let firstR = -1, firstC = -1;
            for (let r = 0; r < R; r++) {
                for (let c = 0; c < C; c++) {
                    if (grid[r][c] === 1) {
                        firstR = r; firstC = c;
                        break;
                    }
                }
                if (firstR !== -1) break;
            }

            const visited = Array(R).fill().map(() => Array(C).fill(false));
            const queue = Array(R * C);
            let head = 0, tail = 0;

            queue[tail++] = (firstR << 8) | firstC;
            visited[firstR][firstC] = true;
            let connectedCount = 1;

            while (head < tail) {
                const val = queue[head++];
                const r = val >> 8;
                const c = val & 0xFF;

                if (r > 0 && !visited[r - 1][c] && grid[r - 1][c] === 1) {
                    visited[r - 1][c] = true;
                    connectedCount++;
                    queue[tail++] = ((r - 1) << 8) | c;
                }
                if (r < R - 1 && !visited[r + 1][c] && grid[r + 1][c] === 1) {
                    visited[r + 1][c] = true;
                    connectedCount++;
                    queue[tail++] = ((r + 1) << 8) | c;
                }
                if (c > 0 && !visited[r][c - 1] && grid[r][c - 1] === 1) {
                    visited[r][c - 1] = true;
                    connectedCount++;
                    queue[tail++] = (r << 8) | (c - 1);
                }
                if (c < C - 1 && !visited[r][c + 1] && grid[r][c + 1] === 1) {
                    visited[r][c + 1] = true;
                    connectedCount++;
                    queue[tail++] = (r << 8) | (c + 1);
                }
            }
            return connectedCount === globalTotalOnes;
        }

        let solveCounter = 0;
        function solve(r, c) {
            if (timeoutFlag) return false;

            solveCounter++;
            if ((solveCounter & 0xFFF) === 0) {
                if (Date.now() - startTime > MAX_SOLVE_TIME) {
                    timeoutFlag = true;
                    return false;
                }
            }

            if (solutions.length >= maxSolutions) return true;

            if (r >= R) {
                if (checkFinalValidity()) {
                    solutions.push(grid.map(row => [...row]));
                    return solutions.length >= maxSolutions;
                }
                return false;
            }

            let nextR = r, nextC = c + 1;
            if (nextC >= C) { nextR++; nextC = 0; }

            if (grid[r][c] !== null) {
                if (!checkFourConnectedAt(r, c)) return false;
                const rid = cellRegion[r][c];
                const maxBlacks = regionMaxBlacks[rid];
                if (maxBlacks !== -1 && regionCurrBlacks[rid] > maxBlacks) return false;
                if (grid[r][c] === 0 && !checkPotentialConnectivity()) return false;
                return solve(nextR, nextC);
            }

            const rid = cellRegion[r][c];
            const maxBlacks = regionMaxBlacks[rid];

            grid[r][c] = 1;
            regionCurrBlacks[rid]++;
            regionCurrNulls[rid]--;
            globalTotalOnes++;

            if (checkFourConnectedAt(r, c)) {
                if (maxBlacks === -1 || (regionCurrBlacks[rid] <= maxBlacks && (regionCurrBlacks[rid] + regionCurrNulls[rid] >= maxBlacks))) {
                    if (solve(nextR, nextC)) return true;
                }
            }

            grid[r][c] = 0;
            regionCurrBlacks[rid]--;
            globalTotalOnes--;

            if (checkFourConnectedAt(r, c)) {
                if (maxBlacks === -1 || (regionCurrBlacks[rid] <= maxBlacks && (regionCurrBlacks[rid] + regionCurrNulls[rid] >= maxBlacks))) {
                    if (checkPotentialConnectivity()) {
                        if (solve(nextR, nextC)) return true;
                    }
                }
            }

            grid[r][c] = null;
            regionCurrNulls[rid]++;
            return false;
        }

        solve(0, 0);
        return { solutions, timeout: timeoutFlag };
    }

    // ------------------------------------------------------------------
    // API Export
    // ------------------------------------------------------------------
    window.solveAqre = function(puzzle) {
        return solveAqreBT(puzzle.rows, puzzle.cols, puzzle.clues, puzzle.edgeIds, puzzle.gridState);
    };

})();