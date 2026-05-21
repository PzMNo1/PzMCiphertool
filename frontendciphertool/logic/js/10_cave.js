(function () {
    // --- Solver ---
    // Cave rules (from Python solver):
    // 1. All cave (white) cells must be connected
    // 2. All wall (shaded) cells must be connected to the edge
    // 3. Clue cells are cave cells; the number = total visible cave cells from that cell 
    //    (up/down/left/right until hitting a wall), including itself

    function solveCaveBT(puzzle) {
        const R = puzzle.rows;
        const C = puzzle.cols;
        const caveGrid = puzzle.grid;

        let solutions = [];
        let timeoutFlag = false;
        const start = performance.now();

        // Collect clues
        const clues = [];
        for (let r = 0; r < R; r++)
            for (let c = 0; c < C; c++)
                if (caveGrid[r][c].clue !== null)
                    clues.push({ r, c, val: caveGrid[r][c].clue });

        // Solver grid: 0=unset, 1=cave, 2=wall. Clue cells are pre-set to cave(1).
        const g = Array(R).fill(null).map(() => Array(C).fill(0));
        for (let cl of clues) g[cl.r][cl.c] = 1;

        // Dynamic tracking for connectivity pruning
        // Build free cells list (cells that aren't pre-assigned)
        const freeCells = [];
        for (let r = 0; r < R; r++)
            for (let c = 0; c < C; c++)
                if (g[r][c] === 0) freeCells.push({ r, c });

        function floodConnected(grid, start, type, totalCount, R, C) {
            const visited = new Set();
            const q = [start];
            visited.add(start.r * C + start.c);
            let count = 0;
            while (q.length) {
                const { r, c } = q.shift();
                count++;
                for (let [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
                    if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === type && !visited.has(nr * C + nc)) {
                        visited.add(nr * C + nc);
                        q.push({ r: nr, c: nc });
                    }
                }
            }
            return count === totalCount;
        }

        function verifyFullSolution(grid, clues, R, C) {
            // 1. All cave cells must be connected
            let caveCells = [];
            let wallCells = [];
            for (let r = 0; r < R; r++)
                for (let c = 0; c < C; c++) {
                    if (grid[r][c] === 1) caveCells.push({ r, c });
                    else wallCells.push({ r, c });
                }

            if (caveCells.length === 0) return false;
            if (!floodConnected(grid, caveCells[0], 1, caveCells.length, R, C)) return false;

            // 2. All wall cells must connect to edge
            if (wallCells.length > 0) {
                let edgeWalls = wallCells.filter(w => w.r === 0 || w.r === R - 1 || w.c === 0 || w.c === C - 1);
                if (edgeWalls.length === 0) return false;
                // BFS from edge walls
                const visited = new Set();
                const q = [...edgeWalls];
                for (let w of edgeWalls) visited.add(w.r * C + w.c);
                let count = 0;
                while (q.length) {
                    const { r, c } = q.shift();
                    count++;
                    for (let [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
                        if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 2 && !visited.has(nr * C + nc)) {
                            visited.add(nr * C + nc);
                            q.push({ r: nr, c: nc });
                        }
                    }
                }
                if (count !== wallCells.length) return false;
            }

            // 3. Clue visibility: count visible cave cells in 4 dirs including self
            for (let cl of clues) {
                let count = 1; // self
                // Up
                for (let y = cl.r - 1; y >= 0; y--) { if (grid[y][cl.c] === 1) count++; else break; }
                // Down
                for (let y = cl.r + 1; y < R; y++) { if (grid[y][cl.c] === 1) count++; else break; }
                // Left
                for (let x = cl.c - 1; x >= 0; x--) { if (grid[cl.r][x] === 1) count++; else break; }
                // Right
                for (let x = cl.c + 1; x < C; x++) { if (grid[cl.r][x] === 1) count++; else break; }
                if (count !== cl.val) return false;
            }

            return true;
        }

        function bt(fIdx) {
            if (timeoutFlag) return false;
            if ((fIdx & 0xFF) === 0 && performance.now() - start > 4000) {
                timeoutFlag = true;
                return false;
            }
            if (solutions.length >= 10) return true;

            if (fIdx === freeCells.length) {
                if (verifyFullSolution(g, clues, R, C)) {
                    solutions.push(g.map(row => [...row]));
                    return solutions.length >= 10;
                }
                return false;
            }

            const { r, c } = freeCells[fIdx];

            // Try wall (2) first, then cave (1)
            for (let val of [2, 1]) {
                g[r][c] = val;
                if (bt(fIdx + 1)) return true;
            }
            g[r][c] = 0;
            return false;
        }

        bt(0);

        return {
            solutions: solutions,
            timeout: timeoutFlag
        };
    }

    window.solveCave = solveCaveBT;

})();
