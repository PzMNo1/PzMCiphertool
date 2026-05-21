(function() {
    window.solveHeteromino = function(puzzle) {
        const startTime = performance.now();
        const timeoutLimit = 3500;
        let isTimeout = false;

        const R = puzzle.rows || puzzle.R;
        const C = puzzle.cols || puzzle.C;
        const maxSolutions = 5;

        const grid = Array(R).fill().map(() => Array(C).fill(0));
        let whiteCount = 0;
        
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (puzzle.grid[r][c] === 1) grid[r][c] = -1; // Black
                else whiteCount++;
            }
        }
        
        if (whiteCount % 3 !== 0) {
            return { solutions: [], timeout: false, error: "Empty cells count must be divisible by 3" };
        }
        
        const solutions = [];
        const resultGrid = Array(R).fill().map(() => Array(C).fill(null));

        const SHAPES = [
            { type: 'I', cells: [[0,0], [1,0], [2,0]] },
            { type: '-', cells: [[0,0], [0,1], [0,2]] },
            { type: 'L', cells: [[0,0], [1,0], [1,1]] }, 
            { type: 'J', cells: [[0,0], [1,-1], [1,0]] }, 
            { type: '7', cells: [[0,0], [0,1], [1,1]] }, 
            { type: 'r', cells: [[0,0], [0,1], [1,0]] }  
        ];
        
        let trominoIdCounter = 0;

        let visitCount = 0;

        function solve(idx) {
            if (isTimeout || solutions.length >= maxSolutions) return;

            visitCount++;
            if (visitCount % 5000 === 0 && performance.now() - startTime > timeoutLimit) {
                isTimeout = true;
                return;
            }

            let r, c;
            let found = false;
            for(let i=idx; i<R*C; i++) {
                r = Math.floor(i/C);
                c = i%C;
                if (grid[r][c] === -1) continue; 
                if (resultGrid[r][c] === null) {
                    found = true;
                    idx = i; 
                    break;
                }
            }
            
            if (!found) {
                const solGrid = Array(R).fill().map(() => Array(C).fill(null));
                for(let rr=0; rr<R; rr++) {
                    for(let cc=0; cc<C; cc++) {
                        if (resultGrid[rr][cc] !== null) solGrid[rr][cc] = resultGrid[rr][cc].id;
                        else solGrid[rr][cc] = -1;
                    }
                }
                solutions.push(solGrid);
                return;
            }
            
            for(const shape of SHAPES) {
                let fits = true;
                const currentCells = [];
                
                for(const os of shape.cells) {
                    const nr = r + os[0];
                    const nc = c + os[1];
                    
                    if (nr < 0 || nr >= R || nc < 0 || nc >= C) { fits = false; break; }
                    if (grid[nr][nc] === -1) { fits = false; break; } 
                    if (resultGrid[nr][nc] !== null) { fits = false; break; } 
                    
                    currentCells.push({r: nr, c: nc});
                }
                
                if (fits) {
                    let adjValid = true;
                    const currentId = trominoIdCounter;
                    
                    for(const cell of currentCells) {
                        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                        for(const d of dirs) {
                            const nr = cell.r + d[0];
                            const nc = cell.c + d[1];
                            if (nr>=0 && nr<R && nc>=0 && nc<C) {
                                const neighbor = resultGrid[nr][nc];
                                if (neighbor !== null && neighbor.type === shape.type) {
                                    adjValid = false; break;
                                }
                            }
                        }
                        if (!adjValid) break;
                    }
                    
                    if (adjValid) {
                        trominoIdCounter++;
                        const trominoData = { id: currentId, type: shape.type };
                        for(const cell of currentCells) {
                            resultGrid[cell.r][cell.c] = trominoData;
                        }
                        
                        solve(idx + 1);
                        
                        for(const cell of currentCells) {
                            resultGrid[cell.r][cell.c] = null;
                        }
                        trominoIdCounter--;
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
