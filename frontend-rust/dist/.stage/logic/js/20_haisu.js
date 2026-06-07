(function() {
    window.solveHaisu = function(puzzle) {
        const startTime = performance.now();
        const timeoutLimit = 3500;
        let isTimeout = false;

        const R = puzzle.rows || puzzle.R;
        const C = puzzle.cols || puzzle.C;
        const edges = puzzle.edges || {};
        const puzzleGrid = puzzle.grid;

        const maxSolutions = 5;
        const solutions = [];

        const regionMap = Array(R).fill().map(() => Array(C).fill(-1));
        const regions = [];
        let startPos = null;
        let goalPos = null;

        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                const val = puzzleGrid[r][c];
                if (val === 'S') startPos = {r, c};
                if (val === 'G') goalPos = {r, c};
            }
        }

        if (!startPos || !goalPos) {
            return { solutions: [], timeout: false, error: "Start (S) and Goal (G) required" };
        }

        let regionCount = 0;
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (regionMap[r][c] === -1) {
                    const q = [{r,c}];
                    regionMap[r][c] = regionCount;
                    const cells = [{r,c}];
                    let clue = null;

                    if (typeof puzzleGrid[r][c] === 'number') clue = puzzleGrid[r][c];

                    let head = 0;
                    while(head < q.length) {
                        const curr = q[head++];
                        const dirs = [
                            {dr: -1, dc: 0, type: 'h', id: `h_${curr.r}_${curr.c}`},
                            {dr: 1, dc: 0, type: 'h', id: `h_${curr.r+1}_${curr.c}`},
                            {dr: 0, dc: -1, type: 'v', id: `v_${curr.r}_${curr.c}`},
                            {dr: 0, dc: 1, type: 'v', id: `v_${curr.r}_${curr.c+1}`}
                        ];

                        for(const d of dirs) {
                            const nr = curr.r + d.dr;
                            const nc = curr.c + d.dc;

                            if (nr>=0 && nr<R && nc>=0 && nc<C) {
                                let edgeId;
                                if (d.dr === -1) edgeId = `h_${curr.r}_${curr.c}`;
                                else if (d.dr === 1) edgeId = `h_${curr.r+1}_${curr.c}`;
                                else if (d.dc === -1) edgeId = `v_${curr.r}_${curr.c}`;
                                else edgeId = `v_${curr.r}_${curr.c+1}`;

                                if (!edges[edgeId]) {
                                    if (regionMap[nr][nc] === -1) {
                                        regionMap[nr][nc] = regionCount;
                                        q.push({r: nr, c: nc});
                                        cells.push({r: nr, c: nc});
                                        if (typeof puzzleGrid[nr][nc] === 'number') {
                                            if (clue !== null && clue !== puzzleGrid[nr][nc]) {
                                                return { solutions: [], timeout: false, error: "Conflicting clues in region" };
                                            }
                                            clue = puzzleGrid[nr][nc];
                                        }
                                    }
                                }
                            }
                        }
                    }

                    regions.push({id: regionCount, cells, clue});
                    regionCount++;
                }
            }
        }

        const visited = Array(R).fill().map(() => Array(C).fill(false));
        const pathGrid = Array(R).fill().map(() => Array(C).fill(null));
        const regionSegments = new Int32Array(regionCount).fill(0);

        regionSegments[regionMap[startPos.r][startPos.c]] = 1;
        visited[startPos.r][startPos.c] = true;
        pathGrid[startPos.r][startPos.c] = '.';

        let visitCount = 1; // start is visited
        
        // Fast Unvisited Counter
        let totalCells = R * C;
        
        function solve(currR, currC) {
            if (isTimeout || solutions.length >= maxSolutions) return;

            if (visitCount % 10000 === 0 && performance.now() - startTime > timeoutLimit) {
                isTimeout = true;
                return;
            }

            if (currR === goalPos.r && currC === goalPos.c) {
                if (visitCount !== totalCells) return;
                for(let i=0; i<regionCount; i++) {
                    if (regions[i].clue !== null && regionSegments[i] !== regions[i].clue) return;
                }
                solutions.push(pathGrid.map(row => [...row]));
                return;
            }

            const dirs = [
                {r: -1, c: 0},
                {r: 1, c: 0},
                {r: 0, c: -1},
                {r: 0, c: 1}
            ];

            let reachableCount = 0;
            const validNeighbors = [];

            for(const d of dirs) {
                const nr = currR + d.r;
                const nc = currC + d.c;
                if (nr >= 0 && nr < R && nc >= 0 && nc < C && !visited[nr][nc]) {
                    reachableCount++;
                    validNeighbors.push({
                        nr, nc,
                        dr: d.r, dc: d.c,
                        dist: Math.abs(nr - goalPos.r) + Math.abs(nc - goalPos.c)
                    });
                }
            }

            // Simple pruning: If not at goal, and reachable == 0 but we haven't visited all cells -> dead end
            if (reachableCount === 0) return;

            validNeighbors.sort((a,b) => a.dist - b.dist);

            for (const neighbor of validNeighbors) {
                const nr = neighbor.nr;
                const nc = neighbor.nc;

                const currReg = regionMap[currR][currC];
                const nextReg = regionMap[nr][nc];
                let newSegment = false;

                if (currReg !== nextReg) {
                    if (regions[currReg].clue !== null && regionSegments[currReg] > regions[currReg].clue) continue;
                    if (regions[nextReg].clue !== null && regionSegments[nextReg] + 1 > regions[nextReg].clue) continue;
                    regionSegments[nextReg]++;
                    newSegment = true;
                }

                visited[nr][nc] = true;
                visitCount++;
                
                let pDir;
                if (neighbor.dr === 1) pDir = '^';
                else if (neighbor.dr === -1) pDir = 'v';
                else if (neighbor.dc === 1) pDir = '<';
                else pDir = '>';
                
                pathGrid[nr][nc] = pDir;

                solve(nr, nc);

                pathGrid[nr][nc] = null;
                visited[nr][nc] = false;
                visitCount--;
                if (newSegment) regionSegments[nextReg]--;
            }
        }

        try {
            solve(startPos.r, startPos.c);
        } catch(e) {
            console.error(e);
        }

        return {
            solutions: solutions,
            timeout: isTimeout
        };
    };
})();
