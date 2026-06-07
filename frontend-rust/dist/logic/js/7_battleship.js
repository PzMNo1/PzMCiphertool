(function () {
    const FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

    function solveBattleshipBT(puzzle) {
        const R = puzzle.rows;
        const C = puzzle.cols;
        const battleshipRowClues = puzzle.rowClues;
        const battleshipColClues = puzzle.colClues;
        const battleshipGridHints = puzzle.gridHints;

        let solutions = [];
        let timeoutFlag = false;
        const grid = Array(R).fill(0).map(() => Array(C).fill(0));
        const start = performance.now();

        function canPlace(r, c, len, orient) {
            const dr = orient === 'v' ? 1 : 0;
            const dc = orient === 'h' ? 1 : 0;

            if (r + (len - 1) * dr >= R) return false;
            if (c + (len - 1) * dc >= C) return false;

            // Proactive limit check
            if (orient === 'h') {
                if (battleshipRowClues[r] !== null) {
                    let count = 0; for (let k = 0; k < C; k++) count += grid[r][k];
                    if (count + len > battleshipRowClues[r]) return false;
                }
                for (let i = 0; i < len; i++) {
                    const cc = c + i;
                    if (battleshipColClues[cc] !== null) {
                        let count = 0; for (let k = 0; k < R; k++) count += grid[k][cc];
                        if (count + 1 > battleshipColClues[cc]) return false;
                    }
                }
            } else {
                for (let i = 0; i < len; i++) {
                    const cr = r + i;
                    if (battleshipRowClues[cr] !== null) {
                        let count = 0; for (let k = 0; k < C; k++) count += grid[cr][k];
                        if (count + 1 > battleshipRowClues[cr]) return false;
                    }
                }
                if (battleshipColClues[c] !== null) {
                    let count = 0; for (let k = 0; k < R; k++) count += grid[k][c];
                    if (count + len > battleshipColClues[c]) return false;
                }
            }

            for (let i = 0; i < len; i++) {
                const cr = r + i * dr;
                const cc = c + i * dc;

                if (grid[cr][cc] !== 0) return false;

                for (let nr = cr - 1; nr <= cr + 1; nr++) {
                    for (let nc = cc - 1; nc <= cc + 1; nc++) {
                        if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 1) return false;
                    }
                }

                const h = battleshipGridHints[cr][cc];
                if (h === 'w') return false;
                if (h) {
                    let part = 'm';
                    if (len === 1) part = 'o';
                    else {
                        if (i === 0) part = orient === 'h' ? 'l' : 't';
                        else if (i === len - 1) part = orient === 'h' ? 'r' : 'b';
                    }
                    if (h !== part) return false;
                }
            }

            for (let i = 0; i < len; i++) {
                const cr = r + i * dr;
                const cc = c + i * dc;
                for (let nr = cr - 1; nr <= cr + 1; nr++) {
                    for (let nc = cc - 1; nc <= cc + 1; nc++) {
                        if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                            let isSelf = false;
                            if (orient === 'v' && nc === c && nr >= r && nr < r + len) isSelf = true;
                            if (orient === 'h' && nr === r && nc >= c && nc < c + len) isSelf = true;

                            if (!isSelf) {
                                const nh = battleshipGridHints[nr][nc];
                                if (nh && nh !== 'w') return false;
                            }
                        }
                    }
                }
            }
            return true;
        }

        function checkFinalConstraints() {
            for (let r = 0; r < R; r++) {
                if (battleshipRowClues[r] !== null) {
                    let count = 0;
                    for (let c = 0; c < C; c++) if (grid[r][c] === 1) count++;
                    if (count !== battleshipRowClues[r]) return false;
                }
            }
            for (let c = 0; c < C; c++) {
                if (battleshipColClues[c] !== null) {
                    let count = 0;
                    for (let r = 0; r < R; r++) if (grid[r][c] === 1) count++;
                    if (count !== battleshipColClues[c]) return false;
                }
            }
            for (let r = 0; r < R; r++) {
                for (let c = 0; c < C; c++) {
                    if (battleshipGridHints[r][c] && battleshipGridHints[r][c] !== 'w') {
                        if (grid[r][c] !== 1) return false;
                    }
                }
            }
            return true;
        }

        function backtrack(shipIdx, minLoc) {
            if (timeoutFlag) return false;
            if (performance.now() - start > 4000) {
                timeoutFlag = true;
                return false;
            }
            if (solutions.length >= 10) return true;

            if (shipIdx === FLEET.length) {
                if (checkFinalConstraints()) {
                    solutions.push(grid.map(row => [...row]));
                    return solutions.length >= 10;
                }
                return false;
            }

            const len = FLEET[shipIdx];
            let startLoc = 0;
            if (shipIdx > 0 && len === FLEET[shipIdx - 1]) {
                startLoc = minLoc;
            }

            for (let loc = startLoc; loc < R * C; loc++) {
                const r = Math.floor(loc / C);
                const c = loc % C;
                if (canPlace(r, c, len, 'h')) {
                    for (let i = 0; i < len; i++) grid[r][c + i] = 1;
                    if (backtrack(shipIdx + 1, loc)) return true;
                    for (let i = 0; i < len; i++) grid[r][c + i] = 0;
                }
                if (len > 1 && canPlace(r, c, len, 'v')) {
                    for (let i = 0; i < len; i++) grid[r + i][c] = 1;
                    if (backtrack(shipIdx + 1, loc)) return true;
                    for (let i = 0; i < len; i++) grid[r + i][c] = 0;
                }
            }
            return false;
        }

        backtrack(0, 0);

        return {
            solutions: solutions,
            timeout: timeoutFlag
        };
    }

    window.solveBattleship = solveBattleshipBT;

})();
