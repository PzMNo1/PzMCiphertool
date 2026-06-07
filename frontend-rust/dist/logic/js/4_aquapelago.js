(function() {
// -------------------------------------------------------------
// CORE DFS SOLVER
// -------------------------------------------------------------
function solveAquapelagoBT(puzzle) {
    const R = puzzle.rows;
    const C = puzzle.cols;
    const clues = puzzle.clues;
    const shadedBlocks = puzzle.shadedBlocks;

    const maxSolutions = 5;
    const solutions = [];
    const grid = Array(R).fill(0).map(() => Array(C).fill(null));

    for (const key in clues) {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = 1;
    }
    for (const key in shadedBlocks) {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = 1;
    }

    const startTime = Date.now();
    const MAX_SOLVE_TIME = 2000;

    function checkOrthogonalAdjacencyAt(r, c) {
        if (grid[r][c] !== 1) return true;
        for (const [dr, dc] of [[-1,0], [1,0], [0,-1], [0,1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 1) {
                return false;
            }
        }
        return true;
    }

    function checkNoUnshaded2x2At(r, c) {
        if (grid[r][c] !== 0) return true;
        for (let dr = -1; dr <= 0; dr++) {
            for (let dc = -1; dc <= 0; dc++) {
                const r1 = r + dr, c1 = c + dc;
                if (r1 >= 0 && r1 < R - 1 && c1 >= 0 && c1 < C - 1) {
                    if (grid[r1][c1] === 0 && grid[r1+1][c1] === 0 &&
                        grid[r1][c1+1] === 0 && grid[r1+1][c1+1] === 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function checkPartialComponents() {
        const visited = Array(R).fill(0).map(() => Array(C).fill(false));
        for (let i = 0; i < R; i++) {
            for (let j = 0; j < C; j++) {
                if (grid[i][j] === 1 && !visited[i][j]) {
                    let size = 0;
                    let clueVal = null;
                    const queue = [[i, j]];
                    visited[i][j] = true;
                    let canGrow = false;

                    while (queue.length > 0) {
                        const [cr, cc] = queue.shift();
                        size++;
                        const clue = clues[`${cr},${cc}`];
                        if (clue) {
                            if (clueVal !== null && clueVal !== clue) return false;
                            clueVal = clue;
                        }
                        for (const [dr, dc] of [[-1,-1], [-1,1], [1,-1], [1,1]]) {
                            const nr = cr + dr, nc = cc + dc;
                            if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                                if (grid[nr][nc] === 1 && !visited[nr][nc]) {
                                    visited[nr][nc] = true;
                                    queue.push([nr, nc]);
                                } else if (grid[nr][nc] === null) {
                                    canGrow = true;
                                }
                            }
                        }
                    }
                    if (clueVal !== null) {
                        if (size > clueVal) return false;
                        if (!canGrow && size < clueVal) return false;
                    }
                }
            }
        }
        return true;
    }

    function checkPartialReachability0() {
        let firstR = -1, firstC = -1, count0 = 0;
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (grid[r][c] === 0) {
                    count0++;
                    if(firstR === -1) { firstR = r; firstC = c; }
                }
            }
        }
        if (firstR === -1) return true;
        const visited = Array(R).fill(0).map(() => Array(C).fill(false));
        let reached0 = 0;
        const queue = [[firstR, firstC]];
        visited[firstR][firstC] = true;
        while(queue.length > 0) {
            const [r, c] = queue.shift();
            if (grid[r][c] === 0) reached0++;
            for(const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const nr = r+dr, nc = c+dc;
                if(nr>=0 && nr<R && nc>=0 && nc<C && !visited[nr][nc] && grid[nr][nc] !== 1) {
                    visited[nr][nc] = true;
                    queue.push([nr, nc]);
                }
            }
        }
        return reached0 === count0;
    }

    function checkFinal() {
        for (let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if(grid[r][c]===1 && !checkOrthogonalAdjacencyAt(r,c)) return false;
            }
        }
        for (let r=0; r<R-1; r++) {
            for(let c=0; c<C-1; c++) {
                if(grid[r][c]===0 && grid[r+1][c]===0 && grid[r][c+1]===0 && grid[r+1][c+1]===0) return false;
            }
        }
        // Strict Unshaded connectivity
        let unshadedCount = 0;
        let startR = -1, startC = -1;
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (grid[r][c] === 0) {
                    unshadedCount++;
                    if (startR === -1) { startR = r; startC = c; }
                }
            }
        }
        if (unshadedCount > 0) {
            const visited = Array(R).fill(0).map(() => Array(C).fill(false));
            const queue = [[startR, startC]];
            visited[startR][startC] = true;
            let connected = 0;
            while(queue.length > 0) {
                const [r, c] = queue.shift();
                connected++;
                for (const [dr, dc] of [[-1,0], [1,0], [0,-1], [0,1]]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 0 && !visited[nr][nc]) {
                        visited[nr][nc] = true;
                        queue.push([nr, nc]);
                    }
                }
            }
            if (connected !== unshadedCount) return false;
        }

        const visited1 = Array(R).fill(0).map(() => Array(C).fill(false));
        for (let i = 0; i < R; i++) {
            for (let j = 0; j < C; j++) {
                if (grid[i][j] === 1 && !visited1[i][j]) {
                    let size = 0;
                    let clueVal = null;
                    const queue = [[i, j]];
                    visited1[i][j] = true;
                    while (queue.length > 0) {
                        const [cr, cc] = queue.shift();
                        size++;
                        const clue = clues[`${cr},${cc}`];
                        if (clue) {
                            if (clueVal !== null && clueVal !== clue) return false;
                            clueVal = clue;
                        }
                        for (const [dr, dc] of [[-1,-1], [-1,1], [1,-1], [1,1]]) {
                            const nr = cr + dr, nc = cc + dc;
                            if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 1 && !visited1[nr][nc]) {
                                visited1[nr][nc] = true;
                                queue.push([nr, nc]);
                            }
                        }
                    }
                    if (clueVal !== null && size !== clueVal) return false;
                }
            }
        }
        return true;
    }

    const cells = [];
    for(let r=0; r<R; r++){
        for(let c=0; c<C; c++){
            if(grid[r][c] === null) cells.push([r,c]);
        }
    }

    function solveBT(idx) {
        if (Date.now() - startTime > MAX_SOLVE_TIME) return false;
        if (solutions.length >= maxSolutions) return true;

        if (idx === cells.length) {
            if (checkFinal()) {
                solutions.push(grid.map(row => [...row]));
                return solutions.length >= maxSolutions;
            }
            return false;
        }

        const [r, c] = cells[idx];

        grid[r][c] = 0;
        if (checkNoUnshaded2x2At(r, c) && checkPartialReachability0() && checkPartialComponents()) {
            if (solveBT(idx + 1)) return true;
        }

        grid[r][c] = 1;
        if (checkOrthogonalAdjacencyAt(r, c) && checkPartialComponents() && checkPartialReachability0()) {
            if (solveBT(idx + 1)) return true;
        }

        grid[r][c] = null;
        return false;
    }

    solveBT(0);
    return solutions;
}

window.solveAquapelago = solveAquapelagoBT;

})();