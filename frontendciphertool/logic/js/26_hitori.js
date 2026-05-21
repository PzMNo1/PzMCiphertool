(function() {
    window.solveHitori = function(puzzle) {
        const startTime = performance.now();
        const timeoutLimit = 3500;
        let isTimeout = false;

        const R = puzzle.rows || puzzle.R;
        const C = puzzle.cols || puzzle.C;
        const nums = puzzle.grid; 
        const maxSolutions = 5;

        const grid = Array(R).fill().map(() => Array(C).fill(null));
        const solutions = [];
        
        const rowSets = Array(R).fill().map(() => new Map()); 
        const colSets = Array(C).fill().map(() => new Map());
        
        let visitCount = 0;

        function solve(idx) {
            if (isTimeout || solutions.length >= maxSolutions) return;

            visitCount++;
            if (visitCount % 10000 === 0 && performance.now() - startTime > timeoutLimit) {
                isTimeout = true;
                return;
            }

            if (idx === R * C) {
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
            const val = nums[r][c];
            
            if (val === null) {
                grid[r][c] = 0;
                solve(idx + 1);
                return;
            }
            
            let canWhite = true;
            if (rowSets[r].has(val)) canWhite = false;
            if (colSets[c].has(val)) canWhite = false;
            
            if (canWhite) {
                grid[r][c] = 0;
                rowSets[r].set(val, true);
                colSets[c].set(val, true);
                
                solve(idx + 1);
                
                rowSets[r].delete(val);
                colSets[c].delete(val);
                grid[r][c] = null;
            }
            
            if (solutions.length >= maxSolutions) return;
            
            let canBlack = true;
            if (r > 0 && grid[r-1][c] === 1) canBlack = false;
            if (c > 0 && grid[r][c-1] === 1) canBlack = false;
            
            if (canBlack) {
                grid[r][c] = 1;
                solve(idx + 1);
                grid[r][c] = null;
            }
        }
        
        try {
            solve(0);
        } catch(e) {
            console.error(e);
        }
        
        return {
            solutions: solutions,
            timeout: isTimeout
        };
    };
})();
