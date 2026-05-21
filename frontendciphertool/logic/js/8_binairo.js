(function () {
    function solveBinairoBT(puzzle) {
        const R = puzzle.rows;
        const C = puzzle.cols;
        const solverGrid = puzzle.grid;

        let solutions = [];
        let timeoutFlag = false;
        const start = performance.now();

        function isValid(g, r, c, val) {
            if (c >= 2 && g[r][c - 1] === val && g[r][c - 2] === val) return false;
            if (r >= 2 && g[r - 1][c] === val && g[r - 2][c] === val) return false;

            let countRow = 0;
            for (let k = 0; k < c; k++) if (g[r][k] === val) countRow++;
            if (val === val) countRow++;
            if (countRow > C / 2) return false;

            let countCol = 0;
            for (let k = 0; k < r; k++) if (g[k][c] === val) countCol++;
            if (val === val) countCol++;
            if (countCol > R / 2) return false;

            if (c === C - 1 && countRow !== C / 2) return false;
            if (r === R - 1 && countCol !== R / 2) return false;

            return true;
        }

        function checkUnique(g) {
            const rows = new Set();
            for (let r = 0; r < R; r++) {
                const s = g[r].join('');
                if (rows.has(s)) return false;
                rows.add(s);
            }
            const cols = new Set();
            for (let c = 0; c < C; c++) {
                let s = '';
                for (let r = 0; r < R; r++) s += g[r][c];
                if (cols.has(s)) return false;
                cols.add(s);
            }
            return true;
        }

        function backtrack(g, r, c) {
            if (timeoutFlag) return false;
            if (performance.now() - start > 3000) {
                timeoutFlag = true;
                return false;
            }
            if (solutions.length >= 10) return true;

            if (r === R) {
                if (checkUnique(g)) {
                    solutions.push(g.map(row => [...row]));
                    return solutions.length >= 10;
                }
                return false;
            }

            let nextR = r, nextC = c + 1;
            if (nextC === C) {
                nextR = r + 1;
                nextC = 0;
            }

            if (g[r][c] !== null) {
                if (!isValid(g, r, c, g[r][c])) return false;
                return backtrack(g, nextR, nextC);
            }

            for (let val of [0, 1]) {
                if (isValid(g, r, c, val)) {
                    g[r][c] = val;
                    if (backtrack(g, nextR, nextC)) return true;
                    g[r][c] = null;
                }
            }
            return false;
        }

        backtrack(solverGrid, 0, 0);

        return {
            solutions: solutions,
            timeout: timeoutFlag
        };
    }

    window.solveBinairo = solveBinairoBT;

})();
