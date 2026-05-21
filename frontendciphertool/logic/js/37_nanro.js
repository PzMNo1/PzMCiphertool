/* 37_nanro.js — window.solveNanro({rows,cols,hBorders,vBorders,clues}) → {solutions,timeout}
 * clues = {"r,c": number}  线索格（该区域填充数量）
 * solution = grid[R][C]: number(填充值) or 0(空) */
window.solveNanro = function ({ rows: R, cols: C, hBorders: hB, vBorders: vB, clues }) {
    const TM = 3500, MX = 50, t0 = performance.now(), N = R * C;
    let out = false;
    // BFS regions
    const regOf = new Int16Array(N).fill(-1), regs = [];
    for (let i = 0; i < N; i++) {
        if (regOf[i] >= 0) continue;
        const id = regs.length, q = [i], cells = []; regOf[i] = id;
        while (q.length) {
            const p = q.shift(), r = p / C | 0, c = p % C; cells.push(p);
            const go = n => { if (regOf[n] < 0) { regOf[n] = id; q.push(n); } };
            if (r > 0 && !hB[r - 1][c]) go(p - C);
            if (r < R - 1 && !hB[r][c]) go(p + C);
            if (c > 0 && !vB[r][c - 1]) go(p - 1);
            if (c < C - 1 && !vB[r][c]) go(p + 1);
        }
        regs.push(cells);
    }
    // region clue map
    const regClue = new Array(regs.length).fill(-1); // -1=no clue
    for (const k in clues) {
        const [r, c] = k.split(',').map(Number);
        regClue[regOf[r * C + c]] = clues[k];
    }
    const G = new Int8Array(N); // 0=unk, 1=filled, -1=empty
    const regFilled = new Int16Array(regs.length); // count of filled cells per region

    function no2x2(p) {
        const r = p / C | 0, c = p % C;
        // check all 2x2 blocks containing p
        for (let dr = 0; dr >= -1; dr--) for (let dc = 0; dc >= -1; dc--) {
            const tr = r + dr, tc = c + dc;
            if (tr < 0 || tr + 1 >= R || tc < 0 || tc + 1 >= C) continue;
            if (G[tr * C + tc] === 1 && G[tr * C + tc + 1] === 1 &&
                G[(tr + 1) * C + tc] === 1 && G[(tr + 1) * C + tc + 1] === 1) return false;
        }
        return true;
    }

    function adjDiffRegSameNum(p) {
        const r = p / C | 0, c = p % C, rid = regOf[p], cnt = regFilled[rid];
        const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (const [nr, nc] of nb) {
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
            const np = nr * C + nc;
            if (G[np] !== 1) continue;
            const nrid = regOf[np];
            if (nrid !== rid && regFilled[nrid] === cnt) return false;
        }
        return true;
    }

    function checkFinal() {
        // each region must have at least 1 filled
        for (let id = 0; id < regs.length; id++) {
            if (regFilled[id] === 0) return false;
            if (regClue[id] >= 0 && regFilled[id] !== regClue[id]) return false;
        }
        // all filled cells connected (BFS)
        let start = -1, total = 0;
        for (let i = 0; i < N; i++) if (G[i] === 1) { total++; if (start < 0) start = i; }
        if (!total) return false;
        const seen = new Uint8Array(N), q = [start]; seen[start] = 1; let cnt = 1, h = 0;
        while (h < q.length) {
            const p = q[h++], pr = p / C | 0, pc = p % C;
            const go = np => { if (G[np] === 1 && !seen[np]) { seen[np] = 1; cnt++; q.push(np); } };
            if (pr > 0) go(p - C); if (pr < R - 1) go(p + C);
            if (pc > 0) go(p - 1); if (pc < C - 1) go(p + 1);
        }
        if (cnt !== total) return false;
        // adjacent different-region same-number check (final)
        for (let i = 0; i < N; i++) if (G[i] === 1 && !adjDiffRegSameNum(i)) return false;
        return true;
    }

    const res = [];
    function solve(idx) {
        if (out || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TM) { out = true; return; }
        if (idx === N) { if (checkFinal()) res.push(G.slice()); return; }
        const rid = regOf[idx];
        // try filled
        G[idx] = 1; regFilled[rid]++;
        const clueVal = regClue[rid];
        if ((clueVal < 0 || regFilled[rid] <= clueVal) && no2x2(idx)) solve(idx + 1);
        regFilled[rid]--; if (out || res.length >= MX) { G[idx] = 0; return; }
        // try empty
        G[idx] = -1;
        // prune: remaining cells in region must be enough to reach clue
        let remaining = 0;
        for (const p of regs[rid]) if (p > idx && G[p] === 0) remaining++;
        if (clueVal < 0 || regFilled[rid] + remaining >= clueVal) solve(idx + 1);
        G[idx] = 0;
    }
    solve(0);
    return {
        solutions: res.map(g => {
            const s = [];
            for (let r = 0; r < R; r++) {
                s.push([]);
                for (let c = 0; c < C; c++) {
                    const p = r * C + c;
                    s[r].push(g[p] === 1 ? regFilled[regOf[p]] : 0);
                }
            }
            // recalculate regFilled from solution
            const rf = new Int16Array(regs.length);
            for (let i = 0; i < N; i++) if (g[i] === 1) rf[regOf[i]]++;
            for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
                const p = r * C + c;
                s[r][c] = g[p] === 1 ? rf[regOf[p]] : 0;
            }
            return s;
        }),
        timeout: out
    };
};
