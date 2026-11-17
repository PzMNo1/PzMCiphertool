window.solveSpiralGalaxies = function (puzzle) {
    const { rows: R, cols: C, dots } = puzzle;
    const N = R * C, K = dots.length, TL = 3500, MX = 20, t0 = performance.now();
    if (!K) return { solutions: [], timeout: false };
    let timeout = false;
    const grid = new Int8Array(N).fill(-1);

    // sym(cell p, dot k) & eligibility lookup
    const sym = new Int16Array(N * K).fill(-1), ok = new Uint8Array(N * K);
    for (let k = 0; k < K; k++) for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const sr = dots[k].fr - r - 1, sc = dots[k].fc - c - 1;
        if (sr >= 0 && sr < R && sc >= 0 && sc < C) { const p = r * C + c; sym[p * K + k] = sr * C + sc; ok[p * K + k] = 1; }
    }

    // Force cells adjacent to dot center
    const forced = new Int8Array(N).fill(-1);
    for (let k = 0; k < K; k++) {
        const d = dots[k], rN = d.fr & 1 ? [(d.fr - 1) >> 1] : [(d.fr - 2) >> 1, d.fr >> 1], cN = d.fc & 1 ? [(d.fc - 1) >> 1] : [(d.fc - 2) >> 1, d.fc >> 1];
        for (const r of rN) for (const c of cN)
            if (r >= 0 && r < R && c >= 0 && c < C) { const p = r * C + c; if (forced[p] !== -1 && forced[p] !== k) return { solutions: [], timeout: false }; forced[p] = k; }
    }
    for (let p = 0; p < N; p++) if (forced[p] !== -1) {
        const k = forced[p]; if (!ok[p * K + k]) return { solutions: [], timeout: false };
        grid[p] = k; const sp = sym[p * K + k];
        if (sp !== -1 && sp !== p) { if (grid[sp] !== -1 && grid[sp] !== k) return { solutions: [], timeout: false }; grid[sp] = k; }
    }

    // MRV order
    const order = []; for (let p = 0; p < N; p++) if (grid[p] === -1) order.push(p);
    const cc = new Int8Array(N); for (let p = 0; p < N; p++) { let n = 0; for (let k = 0; k < K; k++) if (ok[p * K + k]) n++; cc[p] = n; }
    order.sort((a, b) => cc[a] - cc[b]);

    function connected() {
        for (let k = 0; k < K; k++) {
            let f = -1, tot = 0; for (let p = 0; p < N; p++) if (grid[p] === k) { tot++; if (f < 0) f = p; }
            if (!tot) return false;
            const vis = new Uint8Array(N), q = [f]; vis[f] = 1; let cnt = 0;
            while (q.length) { const p = q.pop(); cnt++; const r = (p / C) | 0, c = p % C;
                for (const np of [p - C, p + C, c > 0 ? p - 1 : -1, c < C - 1 ? p + 1 : -1])
                    if (np >= 0 && np < N && grid[np] === k && !vis[np]) { vis[np] = 1; q.push(np); }
            } if (cnt !== tot) return false;
        } return true;
    }

    const res = [];
    (function dfs(i) {
        if (timeout || res.length >= MX) return;
        if (!(i & 31) && performance.now() - t0 > TL) { timeout = true; return; }
        if (i >= order.length) { if (connected()) { const s = []; for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(grid[r * C + c]); s.push(row); } res.push(s); } return; }
        const p = order[i]; if (grid[p] !== -1) { dfs(i + 1); return; }
        for (let k = 0; k < K; k++) {
            if (!ok[p * K + k]) continue; const sp = sym[p * K + k];
            if (sp !== -1 && grid[sp] !== -1 && grid[sp] !== k) continue;
            grid[p] = k; let aS = false;
            if (sp !== -1 && sp !== p && grid[sp] === -1) { grid[sp] = k; aS = true; }
            dfs(i + 1); grid[p] = -1; if (aS) grid[sp] = -1;
            if (timeout || res.length >= MX) return;
        }
    })(0);
    return { solutions: res, timeout };
};
