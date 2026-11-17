(function() {
    window.solveHamle = function(puzzle) {
        const startTime = performance.now();
        const timeoutLimit = 3500;
        let isTimeout = false;

        const R = puzzle.rows || puzzle.R;
        const C = puzzle.cols || puzzle.C;
        const puzzleGrid = puzzle.grid;
        const maxSolutions = 5;

        const clues = []; 
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (typeof puzzleGrid[r][c] === 'number') {
                    clues.push({r, c, val: puzzleGrid[r][c]});
                }
            }
        }

        const solutions = [];
        const occupied = Array(R).fill().map(() => Array(C).fill(false));
        const moves = []; 

        function solve(idx) {
            if (isTimeout || solutions.length >= maxSolutions) return;

            if (idx % 1000 === 0 && performance.now() - startTime > timeoutLimit) {
                isTimeout = true;
                return;
            }

            if (idx === clues.length) {
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        if (occupied[r][c]) {
                            if (r<R-1 && occupied[r+1][c]) return;
                            if (c<C-1 && occupied[r][c+1]) return;
                        }
                    }
                }

                let whiteCount = 0;
                let startR = -1, startC = -1;
                for(let r=0; r<R; r++) {
                    for(let c=0; c<C; c++) {
                        if (!occupied[r][c]) {
                            whiteCount++;
                            if (startR === -1) { startR = r; startC = c; }
                        }
                    }
                }

                if (whiteCount === 0) return;

                let visitedCount = 0;
                const q = [{r: startR, c: startC}];
                const visited = new Set();
                visited.add(startR + "," + startC);

                while(q.length > 0) {
                    const curr = q.shift();
                    visitedCount++;

                    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                    for(const [dr, dc] of dirs) {
                        const nr = curr.r + dr, nc = curr.c + dc;
                        if(nr>=0 && nr<R && nc>=0 && nc<C && !occupied[nr][nc]) {
                            const key = nr + "," + nc;
                            if (!visited.has(key)) {
                                visited.add(key);
                                q.push({r: nr, c: nc});
                            }
                        }
                    }
                }

                if (visitedCount === whiteCount) {
                    solutions.push([...moves]);
                }
                return;
            }

            const clue = clues[idx];
            const val = clue.val;

            const dests = [
                {r: clue.r - val, c: clue.c}, 
                {r: clue.r + val, c: clue.c}, 
                {r: clue.r, c: clue.c - val}, 
                {r: clue.r, c: clue.c + val}  
            ];

            for(const dest of dests) {
                if (dest.r >= 0 && dest.r < R && dest.c >= 0 && dest.c < C) {
                    if (!occupied[dest.r][dest.c]) {
                        let adjConflict = false;
                        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
                        for(const [dr, dc] of neighbors) {
                            const nr = dest.r + dr, nc = dest.c + dc;
                            if(nr>=0 && nr<R && nc>=0 && nc<C && occupied[nr][nc]) {
                                adjConflict = true; break;
                            }
                        }

                        if (!adjConflict) {
                            occupied[dest.r][dest.c] = true;
                            moves.push({from: {r: clue.r, c: clue.c}, to: dest, val: val});

                            solve(idx + 1);

                            moves.pop();
                            occupied[dest.r][dest.c] = false;
                        }
                    }
                }
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
