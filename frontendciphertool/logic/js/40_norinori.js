/* 40_norinori.js — window.solveNorinori({rows,cols,hBorders,vBorders}) → {solutions,timeout}
 * solution = bool[R][C] (true=shaded)
 * Rules: each region has exactly 2 shaded cells; each shaded cell has exactly 1 shaded neighbor (dominoes) */
window.solveNorinori = function ({ rows: R, cols: C, hBorders: hB, vBorders: vB }) {
    const TM = 3500, MX = 20, t0 = performance.now(), N = R * C;
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
    const G = new Uint8Array(N); // 0=unk, 1=shaded, 2=unshaded
    const regShaded = new Uint8Array(regs.length);

    function neighbors(p) {
        const r = p / C | 0, c = p % C, nb = [];
        if (r > 0) nb.push(p - C); if (r < R - 1) nb.push(p + C);
        if (c > 0) nb.push(p - 1); if (c < C - 1) nb.push(p + 1);
        return nb;
    }

    function ok(p) {
        if (G[p] !== 1) return true;
        // shaded: count shaded neighbors
        const nb = neighbors(p);
        let sn = 0, un = 0;
        for (const np of nb) { if (G[np] === 1) sn++; else if (G[np] === 0) un++; }
        if (sn > 1) return false; // too many shaded neighbors
        if (sn + un < 1) return false; // can't get even 1 shaded neighbor
        return true;
    }

    const res = [];
    function solve(idx) {
        if (out || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TM) { out = true; return; }
        if (idx === N) {
            // final: each shaded cell must have exactly 1 shaded neighbor
            for (let i = 0; i < N; i++) {
                if (G[i] !== 1) continue;
                let sn = 0;
                for (const np of neighbors(i)) if (G[np] === 1) sn++;
                if (sn !== 1) return;
            }
            res.push(G.slice());
            return;
        }
        const rid = regOf[idx];
        const regCells = regs[rid];
        const remaining = regCells.filter(p => p > idx && G[p] === 0).length;
        // try shaded
        if (regShaded[rid] < 2) {
            G[idx] = 1; regShaded[rid]++;
            if (ok(idx)) {
                // check neighbors still ok
                let pass = true;
                for (const np of neighbors(idx)) if (!ok(np)) { pass = false; break; }
                if (pass) solve(idx + 1);
            }
            regShaded[rid]--; G[idx] = 0;
            if (out || res.length >= MX) return;
        }
        // try unshaded
        if (regShaded[rid] + remaining >= 2) { // enough room to reach 2
            G[idx] = 2;
            // if shaded and now we skip, check neighbors still have room for a partner
            let pass = true;
            for (const np of neighbors(idx)) if (!ok(np)) { pass = false; break; }
            if (pass) solve(idx + 1);
            G[idx] = 0;
        }
    }
    solve(0);
    return {
        solutions: res.map(g => {
            const s = [];
            for (let r = 0; r < R; r++) { s.push([]); for (let c = 0; c < C; c++) s[r].push(g[r * C + c] === 1); }
            return s;
        }),
        timeout: out
    };
};
