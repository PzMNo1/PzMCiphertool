(function() {
    function jsAkariSolver(puzzle) {
        const size = puzzle.size;
        const clues = puzzle.clues;
        const getClue = (r, c) => clues[`${r},${c}`];
        
        const freeCells = [];
        const visibility = {};
        
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (!getClue(r, c)) {
                    freeCells.push([r, c]);
                    const vis = [];
                    for (let [dr, dc] of [[0,1], [1,0], [0,-1], [-1,0]]) {
                        let i = 1;
                        while (true) {
                            let nr = r + dr * i, nc = c + dc * i;
                            if (nr >= 0 && nr < size && nc >= 0 && nc < size && !getClue(nr, nc)) {
                                vis.push([nr, nc]);
                            } else break;
                            i++;
                        }
                    }
                    visibility[`${r},${c}`] = vis;
                }
            }
        }
        
        const maxSolutions = 10;
        const solutions = [];
        const grid = Array(size).fill(0).map(() => Array(size).fill(false)); // true = bulb
        
        // Check if placing a true/false at (r,c) breaks any adjacent number clue sums
        function checkPartialNumberClues(r, c, isBulb) {
            grid[r][c] = isBulb;
            let valid = true;
            for (let [dr, dc] of [[0,1], [1,0], [0,-1], [-1,0]]) {
                let nr = r + dr, nc = c + dc;
                let clue = getClue(nr, nc);
                if (clue && clue !== 'wall') {
                    let target = parseInt(clue);
                    let bulbs = 0, empties = 0;
                    for (let [ddr, ddc] of [[0,1], [1,0], [0,-1], [-1,0]]) {
                        let nnr = nr + ddr, nnc = nc + ddc;
                        if (nnr >= 0 && nnr < size && nnc >= 0 && nnc < size && !getClue(nnr, nnc)) {
                            // Backtracking proceeds rightwards and downwards
                            if (grid[nnr][nnc]) bulbs++;
                            else if (nnr > r || (nnr === r && nnc > c)) empties++;
                        }
                    }
                    if (bulbs > target || bulbs + empties < target) {
                        valid = false;
                        break;
                    }
                }
            }
            grid[r][c] = false;
            return valid;
        }
        
        function isValidState() {
            // ENFORCE THAT NUMBERED CLUES ARE CORRECT
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    let clue = getClue(r, c);
                    if (clue && clue !== 'wall') {
                        let target = parseInt(clue);
                        let bulbs = 0;
                        for (let [dr, dc] of [[0,1],[1,0],[0,-1],[-1,0]]) {
                            let nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc]) bulbs++;
                        }
                        if (bulbs !== target) return false;
                    }
                }
            }
            // ENFORCE THAT EVERY CELL IS LIT UP AND NO TWO LIGHTBULBS SEE EACH OTHER
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (!getClue(r, c)) {
                        let hasBulb = grid[r][c];
                        let visibleBulbCount = 0;
                        for (let [vr, vc] of visibility[`${r},${c}`]) {
                            if (grid[vr][vc]) visibleBulbCount++;
                        }
                        // hasBulb XOR visibleBulbCount > 0
                        if (hasBulb && visibleBulbCount > 0) return false;
                        if (!hasBulb && visibleBulbCount === 0) return false;
                    }
                }
            }
            return true;
        }

        function solveBT(index) {
            if (solutions.length >= maxSolutions) return;
            
            if (index === freeCells.length) {
                if (isValidState()) {
                    solutions.push(grid.map(row => [...row]));
                }
                return;
            }
            
            const [r, c] = freeCells[index];
            
            // Option 1: Place a bulb
            let canPlaceBulb = true;
            for (let [vr, vc] of visibility[`${r},${c}`]) {
                if (grid[vr][vc]) {
                    canPlaceBulb = false;
                    break;
                }
            }
            if (canPlaceBulb && checkPartialNumberClues(r, c, true)) {
                grid[r][c] = true;
                solveBT(index + 1);
                grid[r][c] = false;
            }
            
            // Option 2: Leave empty
            if (checkPartialNumberClues(r, c, false)) {
                solveBT(index + 1);
            }
        }
        
        solveBT(0);
        return solutions;
    }

    // ------------------------------------------------------------------
    // API Export
    // ------------------------------------------------------------------
    window.solveAkari = function(puzzle) {
        return jsAkariSolver(puzzle);
    };
})();