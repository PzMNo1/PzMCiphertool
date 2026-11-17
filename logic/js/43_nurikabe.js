window.solveNurikabe = function (puzzle) {
    const { rows: R, cols: C, clues } = puzzle;
    const TL = 3500, MX = 80, t0 = performance.now(), N = R * C;
    let out = false;
    const ca = new Int16Array(N).fill(-1), G = new Int8Array(N).fill(-1);
    for (const k in clues) { const [r, c] = k.split(',').map(Number); ca[r * C + c] = clues[k]; }
    for (let i = 0; i < N; i++) if (ca[i] >= 0) G[i] = 0;
    const aj = new Array(N);
    for (let i = 0; i < N; i++) {
        const r = (i / C) | 0, c = i % C, a = [];
        if (r > 0) a.push(i - C); if (r < R - 1) a.push(i + C);
        if (c > 0) a.push(i - 1); if (c < C - 1) a.push(i + 1); aj[i] = a;
    }
    function no2x2(p) {
        const r = (p / C) | 0, c = p % C;
        for (let dr = -1; dr <= 0; dr++) for (let dc = -1; dc <= 0; dc++) {
            const r0 = r + dr, c0 = c + dc;
            if (r0 < 0 || r0 + 1 >= R || c0 < 0 || c0 + 1 >= C) continue;
            const i0 = r0 * C + c0;
            if (G[i0] === 1 && G[i0 + 1] === 1 && G[i0 + C] === 1 && G[i0 + C + 1] === 1) return false;
        } return true;
    }
    const V = new Uint32Array(N); let vg = 0;
    function bfs(s) {
        ++vg; const q = [s]; V[s] = vg; let h = 0, cn = 0, cv = 0; const uk = [];
        while (h < q.length) {
            const p = q[h++]; if (ca[p] >= 0) { cn++; cv = ca[p]; if (cn > 1) return null; }
            for (const n of aj[p]) { if (V[n] === vg) continue; V[n] = vg; if (G[n] === 0) q.push(n); else if (G[n] === -1) uk.push(n); }
        }
        if (cn > 1 || (cn === 1 && (q.length > cv || (!uk.length && q.length !== cv))) || (!cn && !uk.length)) return null;
        return { sz: q.length, cv, cn, uk };
    }
    function prop(seed) {
        const f = [], ck = [seed];
        while (ck.length) {
            const s = ck.pop(), ws = G[s] === 0 ? [s] : [];
            if (G[s] === 1) for (const n of aj[s]) if (G[n] === 0) ws.push(n);
            for (const w of ws) {
                const r = bfs(w); if (!r) { for (const x of f) G[x] = -1; return null; }
                if (r.cn === 1 && r.sz === r.cv) for (const u of r.uk) {
                    if (G[u] !== -1) continue; G[u] = 1; f.push(u);
                    if (!no2x2(u)) { for (const x of f) G[x] = -1; return null; }
                    ck.push(u);
                }
            }
        } return f;
    }
    function val() {
        ++vg;
        for (let i = 0; i < N; i++) {
            if (G[i] !== 0 || V[i] === vg) continue;
            const q = [i]; V[i] = vg; let h = 0, cn = 0, cv = 0;
            while (h < q.length) { const p = q[h++]; if (ca[p] >= 0) { cn++; cv = ca[p]; } for (const n of aj[p]) if (G[n] === 0 && V[n] !== vg) { V[n] = vg; q.push(n); } }
            if (cn !== 1 || q.length !== cv) return false;
        }
        // Black connectivity: all black cells must form one connected region
        let bc = -1; ++vg;
        for (let i = 0; i < N; i++) if (G[i] === 1) { bc = i; break; }
        if (bc === -1) return true;
        const q = [bc]; V[bc] = vg; let h = 0, cnt = 0;
        while (h < q.length) { const p = q[h++]; cnt++; for (const n of aj[p]) if (G[n] === 1 && V[n] !== vg) { V[n] = vg; q.push(n); } }
        let total = 0; for (let i = 0; i < N; i++) if (G[i] === 1) total++;
        return cnt === total;
    }
    const res = [];
    function dfs(i) {
        if (out || res.length >= MX) return;
        if (!(i & 31) && performance.now() - t0 > TL) { out = true; return; }
        while (i < N && G[i] !== -1) i++;
        if (i === N) { if (val()) { const s = []; for (let r = 0; r < R; r++) s.push(Array.from(G.subarray(r * C, r * C + C))); res.push(s); } return; }
        G[i] = 0; if (bfs(i)) { const f = prop(i); if (f) { dfs(i + 1); for (const x of f) G[x] = -1; } } G[i] = -1;
        if (out || res.length >= MX) return;
        G[i] = 1; if (no2x2(i)) { const f = prop(i); if (f) { dfs(i + 1); for (const x of f) G[x] = -1; } } G[i] = -1;
    }
    dfs(0); return { solutions: res, timeout: out };
};
