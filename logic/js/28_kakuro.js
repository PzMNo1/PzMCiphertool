/**
 * 28_kakuro.js — Kakuro 纯算法求解器
 * window.solveKakuro(puzzle) → { solutions, timeout }
 */
window.solveKakuro = function (puzzle) {
    const { rows: R, cols: C, grid } = puzzle;
    const TIMEOUT = 3500, MAX = 100, t0 = performance.now();
    let timedOut = false;

    // 1. 扫描 Runs（水平 + 垂直连续白格段）
    const runs = [];
    const scanLine = (outer, inner, getCell, getFlat, getClue) => {
        for (let a = 0; a < outer; a++) {
            let buf = [], clue = null;
            for (let b = 0; b < inner; b++) {
                const cell = getCell(a, b);
                if (cell.type === 'white') { buf.push(getFlat(a, b)); }
                else { if (buf.length && clue !== null) runs.push({ target: clue, idx: buf }); buf = []; clue = getClue(cell); }
            }
            if (buf.length && clue !== null) runs.push({ target: clue, idx: buf });
        }
    };
    scanLine(R, C, (r, c) => grid[r][c], (r, c) => r * C + c, c => c.across);
    scanLine(C, R, (c, r) => grid[r][c], (c, r) => r * C + c, c => c.down);

    // 2. 白格变量映射
    const fMap = new Int32Array(R * C).fill(-1);
    const vars = []; // [flat, prefilled]
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
        if (grid[r][c].type === 'white') { fMap[r * C + c] = vars.length; vars.push([r * C + c, grid[r][c].val]); }

    const N = vars.length;
    if (!N) return { solutions: [], timeout: false };

    const cons = runs.map(r => ({ t: r.target, vi: r.idx.map(f => fMap[f]) }));
    const vCons = Array.from({ length: N }, () => []);
    cons.forEach((c, i) => c.vi.forEach(v => { if (v >= 0) vCons[v].push(i); }));

    // 3. 回溯
    const A = new Int8Array(N);
    for (let i = 0; i < N; i++) if (vars[i][1] != null) A[i] = vars[i][1];

    const check = ci => {
        const { t, vi } = cons[ci];
        let sum = 0, filled = 0, mask = 0;
        for (let k = 0; k < vi.length; k++) {
            const v = A[vi[k]];
            if (v) { if (mask & (1 << v)) return false; mask |= (1 << v); sum += v; filled++; }
        }
        if (!t) return true;
        if (sum > t) return false;
        if (filled === vi.length) return sum === t;
        const rem = vi.length - filled;
        let lo = 0, hi = 0, n = 0;
        for (let d = 1; d <= 9 && n < rem; d++) if (!(mask & (1 << d))) { lo += d; n++; }
        n = 0;
        for (let d = 9; d >= 1 && n < rem; d--) if (!(mask & (1 << d))) { hi += d; n++; }
        return sum + lo <= t && sum + hi >= t;
    };

    const valid = i => { for (const ci of vCons[i]) if (!check(ci)) return false; return true; };
    const res = [];

    const solve = idx => {
        if (timedOut || res.length >= MAX) return;
        if (!(idx & 63) && performance.now() - t0 > TIMEOUT) { timedOut = true; return; }
        if (idx === N) {
            const sol = Array.from({ length: R }, () => new Array(C).fill(null));
            for (let i = 0; i < N; i++) { const f = vars[i][0]; sol[f / C | 0][f % C] = A[i]; }
            res.push(sol); return;
        }
        if (vars[idx][1] != null) { if (valid(idx)) solve(idx + 1); return; }
        for (let v = 1; v <= 9; v++) { A[idx] = v; if (valid(idx)) solve(idx + 1); A[idx] = 0; }
    };

    solve(0);
    return { solutions: res, timeout: timedOut };
};
