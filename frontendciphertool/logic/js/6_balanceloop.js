(function () {
    const SHAPES = {
        0: { u: 0, r: 0, d: 0, l: 0, name: '' },
        1: { u: 1, r: 0, d: 1, l: 0, name: '│' },
        2: { u: 0, r: 1, d: 0, l: 1, name: '─' },
        3: { u: 1, r: 1, d: 0, l: 0, name: '└' },
        4: { u: 1, r: 0, d: 0, l: 1, name: '┘' },
        5: { u: 0, r: 0, d: 1, l: 1, name: '┐' },
        6: { u: 0, r: 1, d: 1, l: 0, name: '┌' }
    };

    function checkClue(testGrid, r, c, R, C) {
        const clue = testGrid[r][c].clue;
        const s = SHAPES[testGrid[r][c].type];
        const lens = { u: 0, r: 0, d: 0, l: 0 };

        function countDir(dr, dc) {
            let count = 0;
            let currR = r + dr;
            let currC = c + dc;
            while (currR >= 0 && currR < R && currC >= 0 && currC < C) {
                const type = testGrid[currR][currC].type;
                if (type === 1 || type === 2) {
                    count++;
                    currR += dr;
                    currC += dc;
                } else break;
            }
            return count;
        }

        if (s.u) lens.u = countDir(-1, 0);
        if (s.d) lens.d = countDir(1, 0);
        if (s.l) lens.l = countDir(0, -1);
        if (s.r) lens.r = countDir(0, 1);

        const vals = [];
        if (s.u) vals.push(lens.u + 1);
        if (s.d) vals.push(lens.d + 1);
        if (s.l) vals.push(lens.l + 1);
        if (s.r) vals.push(lens.r + 1);

        const v1 = vals[0];
        const v2 = vals[1];

        if (clue.color === 'w' && v1 === v2) return false;
        if (clue.color === 'b' && v1 !== v2) return false;
        if (clue.val !== null && (v1 + v2 !== clue.val)) return false;

        return true;
    }

    function checkGlobalConstraints(testGrid, R, C) {
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (testGrid[r][c].clue) {
                    if (testGrid[r][c].type === 0) return false;
                    if (!checkClue(testGrid, r, c, R, C)) return false;
                }
            }
        }

        let visited = Array(R).fill(0).map(() => Array(C).fill(false));
        let nonEmptyCount = 0;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (testGrid[r][c].type !== 0) nonEmptyCount++;
            }
        }
        if (nonEmptyCount === 0) return false;

        let startNode = null;
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (testGrid[r][c].type !== 0) {
                    startNode = { r, c };
                    break;
                }
            }
            if (startNode) break;
        }

        let q = [startNode];
        visited[startNode.r][startNode.c] = true;
        let visitedCount = 0;

        while (q.length) {
            const { r, c } = q.pop();
            visitedCount++;
            const s = SHAPES[testGrid[r][c].type];

            const neighbors = [
                { dr: -1, dc: 0, connect: s.u },
                { dr: 1, dc: 0, connect: s.d },
                { dr: 0, dc: -1, connect: s.l },
                { dr: 0, dc: 1, connect: s.r }
            ];

            for (let n of neighbors) {
                if (n.connect) {
                    const nr = r + n.dr;
                    const nc = c + n.dc;
                    if (nr >= 0 && nr < R && nc >= 0 && nc < C && testGrid[nr][nc].type !== 0 && !visited[nr][nc]) {
                        visited[nr][nc] = true;
                        q.push({ r: nr, c: nc });
                    }
                }
            }
        }

        if (visitedCount !== nonEmptyCount) return false;
        return true;
    }

    function solveBalanceloopBT(puzzle) {
        const R = puzzle.rows;
        const C = puzzle.cols;
        const startGrid = puzzle.grid;

        let solutions = [];
        let timeoutFlag = false;
        const start = performance.now();

        function solve(gridCopy, idx) {
            if (timeoutFlag) return false;
            
            // Limit execution time to 3 seconds safely
            if ((idx & 0xFF) === 0 && performance.now() - start > 3000) {
                timeoutFlag = true;
                return false;
            }

            if (solutions.length >= 10) return true;

            if (idx === R * C) {
                if (checkGlobalConstraints(gridCopy, R, C)) {
                    solutions.push(gridCopy.map(row => row.map(cell => cell.type)));
                    return solutions.length >= 10;
                }
                return false;
            }

            const r = Math.floor(idx / C);
            const c = idx % C;

            const upReq = (r > 0) && SHAPES[gridCopy[r - 1][c].type].d;
            const leftReq = (c > 0) && SHAPES[gridCopy[r][c - 1].type].r;

            const isTop = (r === 0);
            const isBottom = (r === R - 1);
            const isLeft = (c === 0);
            const isRight = (c === C - 1);

            let validShapes = [];
            for (let t = 0; t <= 6; t++) {
                const s = SHAPES[t];
                if (isTop && s.u) continue;
                if (!isTop && !!s.u !== !!upReq) continue;
                if (isLeft && s.l) continue;
                if (!isLeft && !!s.l !== !!leftReq) continue;
                if (isRight && s.r) continue;
                if (isBottom && s.d) continue;
                if (gridCopy[r][c].clue && t === 0) continue;
                validShapes.push(t);
            }

            for (let type of validShapes) {
                gridCopy[r][c].type = type;
                if (solve(gridCopy, idx + 1)) return true;
            }

            gridCopy[r][c].type = 0;
            return false;
        }

        solve(startGrid, 0);

        return {
            solutions: solutions,
            timeout: timeoutFlag
        };
    }

    window.solveBalanceloop = solveBalanceloopBT;

})();
