(function () {
    // ── Tile Direction Constants (bitmask) ──
    // Types: 0=empty, 1=│, 2=─, 3=└, 4=┘, 5=┐, 6=┌
    const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8;
    const TILE = [0, UP | DOWN, LEFT | RIGHT, UP | RIGHT, UP | LEFT, DOWN | LEFT, DOWN | RIGHT];

    // ── Direction scan helper for hint precompute ──
    function scanCells(dir, hr, hc, R, C) {
        const cells = [];
        if (dir === 'u')      for (let y = 0; y < hr; y++)          cells.push(y * C + hc);
        else if (dir === 'd') for (let y = hr + 1; y < R - 1; y++)  cells.push(y * C + hc);
        else if (dir === 'l') for (let x = 0; x < hc; x++)          cells.push(hr * C + x);
        else if (dir === 'r') for (let x = hc + 1; x < C - 1; x++) cells.push(hr * C + x);
        return { cells, vert: dir === 'u' || dir === 'd' };
    }

    // ── Verify single connected closed loop (BFS) ──
    function verifyLoop(g, total, R, C, solutions) {
        const N = R * C;
        let s = -1;
        for (let i = 0; i < N; i++) if (g[i] > 0) { s = i; break; }
        if (s < 0) return false;

        const vis = new Uint8Array(N);
        const q = new Int32Array(total);
        let head = 0, tail = 0;
        q[tail++] = s; vis[s] = 1;
        let cnt = 1;

        while (head < tail) {
            const idx = q[head++];
            const ir = (idx / C) | 0, ic = idx - ir * C;
            const d = TILE[g[idx]];
            if ((d & UP)    && ir > 0     && g[idx - C] > 0 && !vis[idx - C]) { vis[idx - C] = 1; cnt++; q[tail++] = idx - C; }
            if ((d & DOWN)  && ir < R - 1 && g[idx + C] > 0 && !vis[idx + C]) { vis[idx + C] = 1; cnt++; q[tail++] = idx + C; }
            if ((d & LEFT)  && ic > 0     && g[idx - 1] > 0 && !vis[idx - 1]) { vis[idx - 1] = 1; cnt++; q[tail++] = idx - 1; }
            if ((d & RIGHT) && ic < C - 1 && g[idx + 1] > 0 && !vis[idx + 1]) { vis[idx + 1] = 1; cnt++; q[tail++] = idx + 1; }
        }

        if (cnt !== total) return false;
        solutions.push(Array.from({ length: R }, (_, r) =>
            Array.from({ length: C }, (_, c) => g[r * C + c])
        ));
        return solutions.length >= 10;
    }

    // ── Solver ──
    function solveCastlewallBT(puzzle) {
        const R = puzzle.rows;
        const C = puzzle.cols;
        const startGrid = puzzle.grid;

        let solutions = [];
        let timeoutFlag = false;
        const start = performance.now();

        const N = R * C;

        // ── Clue map ──
        const isClue = new Uint8Array(N);
        const hints = [];
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (startGrid[r][c].clue) {
                    hints.push({ r, c, ...startGrid[r][c].clue });
                    isClue[r * C + c] = 1;
                }
            }
        }

        // ── Directional hints (number + direction constraints) ──
        const dirHints = [];
        for (const h of hints) {
            if (h.num !== null && h.dir !== null) {
                const { cells, vert } = scanCells(h.dir, h.r, h.c, R, C);
                dirHints.push({ num: h.num, vert, cells, last: cells.length ? Math.max(...cells) : -1 });
            }
        }

        // ── Color hints (inside/outside via leftward ray-cast) ──
        const colorHints = hints.map(h => {
            const cells = [];
            for (let x = 0; x < h.c; x++) cells.push(h.r * C + x);
            return { color: h.color, cells, last: cells.length ? Math.max(...cells) : -1 };
        });

        // ── Trigger maps: which hints complete at each cell ──
        const dirTrig = Array.from({ length: N }, () => []);
        const colTrig = Array.from({ length: N }, () => []);
        dirHints.forEach((h, i) => { if (h.last >= 0) dirTrig[h.last].push(i); });
        colorHints.forEach((h, i) => { if (h.last >= 0) colTrig[h.last].push(i); });

        // ── Per-cell dir-hint membership (for overflow pruning) ──
        const cellDH = Array.from({ length: N }, () => []);
        dirHints.forEach((h, i) => h.cells.forEach(ci => cellDH[ci].push(i)));

        // ── Valid tile types per cell (prefiltered by borders & adjacent clues) ──
        const validT = new Array(N);
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const i = r * C + c;
                if (isClue[i]) { validT[i] = null; continue; }
                const block =
                    ((r === 0     || isClue[i - C]) ? UP    : 0) |
                    ((r === R - 1 || isClue[i + C]) ? DOWN  : 0) |
                    ((c === 0     || isClue[i - 1]) ? LEFT  : 0) |
                    ((c === C - 1 || isClue[i + 1]) ? RIGHT : 0);
                validT[i] = [];
                for (let t = 0; t < TILE.length; t++)
                    if (!(TILE[t] & block)) validT[i].push(t);
            }
        }

        // ── Forward-look capability flags ──
        const canUp = new Uint8Array(N), canDown = new Uint8Array(N);
        const canLeft = new Uint8Array(N), canRight = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
            if (!validT[i]) continue;
            for (const t of validT[i]) {
                if (TILE[t] & UP)    canUp[i] = 1;
                if (TILE[t] & DOWN)  canDown[i] = 1;
                if (TILE[t] & LEFT)  canLeft[i] = 1;
                if (TILE[t] & RIGHT) canRight[i] = 1;
            }
        }

        // ── Solver state ──
        const g = new Int8Array(N);
        hints.forEach(h => g[h.r * C + h.c] = -1);
        const dhCnt = new Int16Array(dirHints.length);
        let lineTotal = 0;

        // Check completed directional & color constraints at cell index
        function checkDone(idx) {
            for (const di of dirTrig[idx])
                if (dhCnt[di] !== dirHints[di].num) return false;
            for (const ci of colTrig[idx]) {
                const ch = colorHints[ci];
                let cross = 0;
                for (const ci of ch.cells)
                    if (g[ci] > 0 && (TILE[g[ci]] & DOWN)) cross++;
                if ((ch.color === 'w') !== ((cross & 1) === 1)) return false;
            }
            return true;
        }

        // Check no directional hint has exceeded its target
        function checkBound(idx) {
            for (const di of cellDH[idx])
                if (dhCnt[di] > dirHints[di].num) return false;
            return true;
        }

        // ── Backtracking with constraint propagation & pruning ──
        function bt(idx) {
            if (timeoutFlag) return false;
            if ((idx & 0xFF) === 0 && performance.now() - start > 4000) {
                timeoutFlag = true;
                return false;
            }
            if (solutions.length >= 10) return true;
            if (idx === N) return lineTotal > 0 && verifyLoop(g, lineTotal, R, C, solutions);
            if (isClue[idx]) return bt(idx + 1);

            const r = (idx / C) | 0, c = idx - r * C;
            const reqU = r > 0 && g[idx - C] > 0 && !!(TILE[g[idx - C]] & DOWN);
            const reqL = c > 0 && g[idx - 1] > 0 && !!(TILE[g[idx - 1]] & RIGHT);

            for (const t of validT[idx]) {
                // Neighbor compatibility
                if (!!(TILE[t] & UP) !== reqU || !!(TILE[t] & LEFT) !== reqL) continue;
                // Forward pruning: ensure neighbor can accept the connection
                if (t > 0) {
                    if ((TILE[t] & DOWN)  && (r >= R - 1 || !canUp[idx + C]))   continue;
                    if ((TILE[t] & RIGHT) && (c >= C - 1 || !canLeft[idx + 1])) continue;
                }

                g[idx] = t;
                if (t > 0) {
                    lineTotal++;
                    // Increment dir-hint counts for this cell
                    const dh = cellDH[idx];
                    let delta = 0;
                    for (let i = 0; i < dh.length; i++) {
                        if (dirHints[dh[i]].vert ? (TILE[t] & DOWN) : (TILE[t] & RIGHT)) {
                            dhCnt[dh[i]]++;
                            delta |= (1 << i);
                        }
                    }
                    if (checkBound(idx) && checkDone(idx) && bt(idx + 1)) {
                        lineTotal--; g[idx] = 0;
                        for (let i = 0; i < dh.length; i++) if (delta & (1 << i)) dhCnt[dh[i]]--;
                        return true;
                    }
                    lineTotal--;
                    for (let i = 0; i < dh.length; i++) if (delta & (1 << i)) dhCnt[dh[i]]--;
                } else if (checkDone(idx) && bt(idx + 1)) {
                    g[idx] = 0; return true;
                }
                g[idx] = 0;
            }
            return false;
        }

        bt(0);

        return {
            solutions: solutions,
            timeout: timeoutFlag
        };
    }

    window.solveCastlewall = solveCastlewallBT;

})();
