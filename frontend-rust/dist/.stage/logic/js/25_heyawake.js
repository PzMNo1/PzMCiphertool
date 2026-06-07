(function() {
    window.solveHeyawake = function(puzzle) {
        const startTime = performance.now();
        const timeoutLimit = 3500;
        let isTimeout = false;

        const R = puzzle.rows || puzzle.R;
        const C = puzzle.cols || puzzle.C;
        const edgeState = puzzle.edges || {}; 
        const clueGrid = puzzle.clues || puzzle.grid; 
        const maxSolutions = 5;

        const regionMap = Array(R).fill().map(() => Array(C).fill(-1));
        const regions = [];
        let regionCount = 0;

        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (regionMap[r][c] === -1) {
                    const q = [{r,c}];
                    regionMap[r][c] = regionCount;
                    const cells = [{r,c}];
                    let clue = null;

                    if (clueGrid[r][c] !== null) clue = clueGrid[r][c];

                    let head = 0;
                    while(head < q.length) {
                        const curr = q[head++];
                        const dirs = [
                            {dr: -1, dc: 0, type: 'h', edgeR: curr.r, edgeC: curr.c}, 
                            {dr: 1, dc: 0, type: 'h', edgeR: curr.r+1, edgeC: curr.c}, 
                            {dr: 0, dc: -1, type: 'v', edgeR: curr.r, edgeC: curr.c}, 
                            {dr: 0, dc: 1, type: 'v', edgeR: curr.r, edgeC: curr.c+1} 
                        ];

                        for(const d of dirs) {
                            const nr = curr.r + d.dr;
                            const nc = curr.c + d.dc;
                            if (nr>=0 && nr<R && nc>=0 && nc<C) {
                                const edgeKey = `${d.type}_${d.edgeR}_${d.edgeC}`;
                                if (!edgeState[edgeKey]) { 
                                    if (regionMap[nr][nc] === -1) {
                                        regionMap[nr][nc] = regionCount;
                                        q.push({r: nr, c: nc});
                                        cells.push({r: nr, c: nc});
                                        if (clueGrid[nr][nc] !== null) {
                                            if (clue !== null && clue !== clueGrid[nr][nc]) {
                                                return { solutions: [], timeout: false, error: "Conflicting clues in room" };
                                            }
                                            clue = clueGrid[nr][nc];
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

        const grid = Array(R).fill().map(() => Array(C).fill(null)); 
        const solutions = [];
        const regionBlackCounts = new Int32Array(regionCount).fill(0);

        let visitCount = 0;

        function solve(idx) {
            if (isTimeout || solutions.length >= maxSolutions) return;

            visitCount++;
            if (visitCount % 10000 === 0 && performance.now() - startTime > timeoutLimit) {
                isTimeout = true;
                return;
            }

            if (idx === R * C) {
                for(let i=0; i<regionCount; i++) {
                    if (regions[i].clue !== null && regionBlackCounts[i] !== regions[i].clue) return;
                }

                let whiteStart = null;
                let whiteCount = 0;
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        if (grid[r][c] === 0) {
                            whiteCount++;
                            if (!whiteStart) whiteStart = {r, c};
                        }
                    }
                }

                if (whiteCount === 0) return;

                let visitedCount = 0;
                const q = [whiteStart];
                const visited = new Set([`${whiteStart.r},${whiteStart.c}`]);
                visitedCount++;

                let head = 0;
                while(head < q.length) {
                    const curr = q[head++];
                    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                    for(const d of dirs) {
                        const nr = curr.r + d[0];
                        const nc = curr.c + d[1];
                        if (nr>=0 && nr<R && nc>=0 && nc<C && grid[nr][nc] === 0) {
                            const k = `${nr},${nc}`;
                            if (!visited.has(k)) {
                                visited.add(k);
                                visitedCount++;
                                q.push({r: nr, c: nc});
                            }
                        }
                    }
                }

                if (visitedCount === whiteCount) {
                    solutions.push(grid.map(row => [...row]));
                }
                return;
            }

            const r = Math.floor(idx / C);
            const c = idx % C;
            const regId = regionMap[r][c];

            let canBlack = true;
            if (r > 0 && grid[r-1][c] === 1) canBlack = false;
            if (c > 0 && grid[r][c-1] === 1) canBlack = false;
            if (regions[regId].clue !== null && regionBlackCounts[regId] >= regions[regId].clue) canBlack = false;

            if (canBlack) {
                grid[r][c] = 1;
                regionBlackCounts[regId]++;
                solve(idx + 1);
                regionBlackCounts[regId]--;
                grid[r][c] = null;
            }

            if (solutions.length >= maxSolutions) return;

            grid[r][c] = 0;

            let whiteRunValid = true;

            if (c > 0) { 
                let bCount = 0;
                if (edgeState[`v_${r}_${c}`]) bCount++;
                for(let k=c-1; k>=0; k--) {
                    if (grid[r][k] === 1) break;
                    if (grid[r][k] === 0) {
                        if (edgeState[`v_${r}_${k}`]) bCount++;
                    }
                    if (bCount >= 2) { whiteRunValid = false; break; }
                }
            }

            if (whiteRunValid && r > 0) {
                let bCount = 0;
                if (edgeState[`h_${r}_${c}`]) bCount++;
                for(let k=r-1; k>=0; k--) {
                    if (grid[k][c] === 1) break;
                    if (grid[k][c] === 0) {
                        if (edgeState[`h_${k}_${c}`]) bCount++;
                    }
                    if (bCount >= 2) { whiteRunValid = false; break; }
                }
            }

            if (whiteRunValid) {
                solve(idx + 1);
            }

            grid[r][c] = null;
        }

        try {
            solve(0);
        } catch(e) {
            console.error(e);
            return { solutions: [], timeout: false, error: e.message };
        }

        return {
            solutions: solutions,
            timeout: isTimeout
        };
    };
})();
