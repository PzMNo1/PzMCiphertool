(function() {
    window.solveGokigen = function(puzzle) {
        const startTime = performance.now();
        const timeoutLimit = 3500;
        let isTimeout = false;

        const R = puzzle.rows || puzzle.R;
        const C = puzzle.cols || puzzle.C;
        const clues = puzzle.clues; // (R+1) x (C+1)
        const puzzleGrid = puzzle.grid; // R x C
        
        const maxSolutions = 5;
        const solutions = [];

        // Grid: R x C. 0=Unset, 1=/, 2=\
        const grid = Array(R).fill().map(() => Array(C).fill(0));
        // Load initial state
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (puzzleGrid && puzzleGrid[r][c] !== 0) {
                    grid[r][c] = puzzleGrid[r][c];
                }
            }
        }

        const numNodes = (R + 1) * (C + 1);
        const parent = new Int32Array(numNodes).fill(-1);

        function find(i) {
            let root = i;
            while (parent[root] >= 0) root = parent[root];
            return root;
        }

        function union(i, j) {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                if (parent[rootI] < parent[rootJ]) { 
                    parent[rootI] += parent[rootJ];
                    parent[rootJ] = rootI;
                    return true;
                } else {
                    parent[rootJ] += parent[rootI];
                    parent[rootI] = rootJ;
                    return true;
                }
            }
            return false;
        }

        const currentCounts = Array(R + 1).fill().map(() => Array(C + 1).fill(0));

        // Pre-fill DSU with given initial grid elements
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (grid[r][c] !== 0) {
                    const val = grid[r][c];
                    if (val === 1) { 
                        const n1 = (r + 1) * (C + 1) + c;
                        const n2 = r * (C + 1) + (c + 1);
                        if (!union(n1, n2)) throw new Error("Initial grid has loop");
                        currentCounts[r + 1][c]++;
                        currentCounts[r][c + 1]++;
                    } else { 
                        const n1 = r * (C + 1) + c;
                        const n2 = (r + 1) * (C + 1) + (c + 1);
                        if (!union(n1, n2)) throw new Error("Initial grid has loop");
                        currentCounts[r][c]++;
                        currentCounts[r + 1][c + 1]++;
                    }
                }
            }
        }

        for (let r = 0; r <= R; r++) {
            for (let c = 0; c <= C; c++) {
                if (clues[r][c] !== null && currentCounts[r][c] > clues[r][c]) {
                    throw new Error("Initial grid violates clues");
                }
            }
        }

        function solve2(idx) {
            if (isTimeout) return;
            if (solutions.length >= maxSolutions) return;

            if (idx % 20 === 0 && performance.now() - startTime > timeoutLimit) {
                isTimeout = true;
                return;
            }

            if (idx === R * C) {
                for (let r = 0; r <= R; r++) {
                    for (let c = 0; c <= C; c++) {
                        if (clues[r][c] !== null && currentCounts[r][c] !== clues[r][c]) return;
                    }
                }
                solutions.push(grid.map(row => [...row]));
                return;
            }

            const r = Math.floor(idx / C);
            const c = idx % C;

            if (grid[r][c] !== 0) {
                if (r > 0 && c > 0 && clues[r][c] !== null && currentCounts[r][c] !== clues[r][c]) return;
                solve2(idx + 1);
                return;
            }

            const moves = [1, 2];
            for (const m of moves) {
                let n1, n2, ir1, ic1, ir2, ic2;
                if (m === 1) { 
                    n1 = (r + 1) * (C + 1) + c; n2 = r * (C + 1) + (c + 1);
                    ir1 = r + 1; ic1 = c; ir2 = r; ic2 = c + 1;
                } else { 
                    n1 = r * (C + 1) + c; n2 = (r + 1) * (C + 1) + (c + 1);
                    ir1 = r; ic1 = c; ir2 = r + 1; ic2 = c + 1;
                }

                let valid = true;
                if (clues[ir1][ic1] !== null && currentCounts[ir1][ic1] + 1 > clues[ir1][ic1]) valid = false;
                if (valid && clues[ir2][ic2] !== null && currentCounts[ir2][ic2] + 1 > clues[ir2][ic2]) valid = false;

                let dsuLog = null;
                if (valid) {
                    const root1 = find(n1);
                    const root2 = find(n2);
                    if (root1 !== root2) {
                        if (parent[root1] < parent[root2]) { 
                            dsuLog = { child: root2, p: root1, oldChildVal: parent[root2] };
                            parent[root1] += parent[root2];
                            parent[root2] = root1;
                        } else {
                            dsuLog = { child: root1, p: root2, oldChildVal: parent[root1] };
                            parent[root2] += parent[root1];
                            parent[root1] = root2;
                        }
                    } else {
                        valid = false; 
                    }
                }

                if (valid) {
                    grid[r][c] = m;
                    currentCounts[ir1][ic1]++;
                    currentCounts[ir2][ic2]++;

                    let clueOk = true;
                    if (r > 0 && c > 0 && clues[r][c] !== null) {
                        if (currentCounts[r][c] !== clues[r][c]) clueOk = false;
                    }

                    if (clueOk) solve2(idx + 1);

                    currentCounts[ir1][ic1]--;
                    currentCounts[ir2][ic2]--;

                    const { child, p, oldChildVal } = dsuLog;
                    parent[p] -= oldChildVal; 
                    parent[child] = oldChildVal; 
                }
            }
            grid[r][c] = 0;
        }

        try {
            solve2(0);
        } catch (e) {
            console.error(e);
        }

        return {
            solutions: solutions,
            timeout: isTimeout
        };
    };
})();
