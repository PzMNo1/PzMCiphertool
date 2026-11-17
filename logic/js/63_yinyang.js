window.solveYinYang = function(p) {
    const N = p.size, TL = 3500, MX = 20, t0 = performance.now(), S = N * N;
    let to = false;
    const b = new Int8Array(S), f = new Uint8Array(S), order = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = p.grid[r][c], i = r * N + c; b[i] = v; if (v) f[i] = 1; }
    for (let i = 0; i < S; i++) if (!f[i]) order.push(i);
    function ok(p, v) {
        const r = (p / N) | 0, c = p % N;
        return !(r > 0 && c > 0 && b[(r-1)*N+c-1] === v && b[(r-1)*N+c] === v && b[r*N+c-1] === v) &&
               !(r > 0 && c < N-1 && b[(r-1)*N+c] === v && b[(r-1)*N+c+1] === v && b[r*N+c+1] === v);
    }
    function conn(cl) {
        let s = -1, n = 0;
        for (let i = 0; i < S; i++) if (b[i] === cl) { if (s < 0) s = i; n++; }
        if (n <= 1) return true;
        const v = new Uint8Array(S), q = new Int32Array(S); let h = 0, t = 0, c = 1;
        q[t++] = s; v[s] = 1;
        while (h < t) { const p = q[h++], r = (p/N)|0, x = p%N;
            for (const np of [r>0?p-N:-1,r<N-1?p+N:-1,x>0?p-1:-1,x<N-1?p+1:-1])
                if (np >= 0 && !v[np] && b[np] === cl) { v[np] = 1; q[t++] = np; c++; }
        } return c === n;
    }
    const R = [];
    (function dfs(i) {
        if (to || R.length >= MX) return;
        if (!(i & 31) && performance.now() - t0 > TL) { to = true; return; }
        if (i >= order.length) { if (conn(1) && conn(2)) { const s = []; for (let r = 0; r < N; r++) { const w = []; for (let c = 0; c < N; c++) w.push(b[r*N+c]); s.push(w); } R.push(s); } return; }
        const p = order[i];
        for (let v = 1; v <= 2; v++) { b[p] = v; if (ok(p, v)) { dfs(i+1); if (to || R.length >= MX) { b[p] = 0; return; } } }
        b[p] = 0;
    })(0);
    return { solutions: R, timeout: to };
};
