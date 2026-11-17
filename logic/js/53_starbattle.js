window.solveStarbattle = function (puzzle) {
    const { rows: R, cols: C, stars: S, regions } = puzzle;
    const N = R * C, TL = 3500, MX = 20, t0 = performance.now();
    let timeout = false;
    const reg = new Int8Array(N);
    regions.forEach((rm, i) => rm.forEach(p => { reg[p] = i; }));
    for (let i = 0; i < regions.length; i++) if (regions[i].length < S) return { solutions: [], timeout: false };
    const rc = new Int8Array(R), cc = new Int8Array(C), gc = new Int8Array(regions.length);
    const rr = new Int8Array(R), cr = new Int8Array(C), gr = new Int8Array(regions.length);
    for (let i = 0; i < R; i++) rr[i] = C;
    for (let i = 0; i < C; i++) cr[i] = R;
    regions.forEach((rm, i) => { gr[i] = rm.length; });
    const g = new Int8Array(N), res = [];
    const ok = p => { const r = (p / C) | 0, c = p % C; for (let d = -1; d <= 1; d++) for (let e = -1; e <= 1; e++) { if (!d && !e) continue; const nr = r + d, nc = c + e; if (nr >= 0 && nr < R && nc >= 0 && nc < C && g[nr * C + nc]) return false; } return true; };
    const can = (r, c, gi) => rc[r] + rr[r] >= S && cc[c] + cr[c] >= S && gc[gi] + gr[gi] >= S;
    (function dfs(i) {
        if (timeout || res.length >= MX) return;
        if (!(i & 31) && performance.now() - t0 > TL) { timeout = true; return; }
        if (i >= N) { for (let r = 0; r < R; r++) if (rc[r] !== S) return; for (let c = 0; c < C; c++) if (cc[c] !== S) return; const s = []; for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(g[r * C + c]); s.push(row); } res.push(s); return; }
        const r = (i / C) | 0, c = i % C, gi = reg[i];
        rr[r]--; cr[c]--; gr[gi]--;
        if (rc[r] < S && cc[c] < S && gc[gi] < S && ok(i)) { g[i] = 1; rc[r]++; cc[c]++; gc[gi]++; if (can(r, c, gi)) dfs(i + 1); g[i] = 0; rc[r]--; cc[c]--; gc[gi]--; }
        if (can(r, c, gi)) dfs(i + 1);
        rr[r]++; cr[c]++; gr[gi]++;
    })(0);
    return { solutions: res, timeout };
};
