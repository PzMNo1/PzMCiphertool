window.solveNurimisaki = function (puzzle) {
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
    // no 2×2 all-same block check
    function no2x2(p, v) {
        const r = (p / C) | 0, c = p % C;
        for (let dr = -1; dr <= 0; dr++) for (let dc = -1; dc <= 0; dc++) {
            const r0 = r + dr, c0 = c + dc;
            if (r0 < 0 || r0 + 1 >= R || c0 < 0 || c0 + 1 >= C) continue;
            const i0 = r0 * C + c0;
            if (G[i0] === v && G[i0 + 1] === v && G[i0 + C] === v && G[i0 + C + 1] === v) return false;
        } return true;
    }
    // Cape check: white cell at p must have exactly 1 white neighbor if clue, ≥2 if non-clue
    function capeOk(p) {
        if (G[p] !== 0) return true;
        let wn = 0, un = 0;
        for (const n of aj[p]) { if (G[n] === 0) wn++; else if (G[n] === -1) un++; }
        if (ca[p] >= 0) { // clue cell: exactly 1 white neighbor
            if (wn > 1) return false;
            if (wn + un < 1) return false; // can't reach 1
        } else { // non-clue: at least 2 white neighbors
            if (wn + un < 2) return false; // impossible to reach 2
        }
        return true;
    }
    // Clue visibility: count white cells seen in 4 dirs from p (including p itself)
    function visCount(p) {
        const r = (p / C) | 0, c = p % C; let cnt = 1;
        for (let d = 0; d < 4; d++) {
            const dr = d === 0 ? -1 : d === 2 ? 1 : 0, dc = d === 1 ? 1 : d === 3 ? -1 : 0;
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < R && nc >= 0 && nc < C && G[nr * C + nc] === 0) { cnt++; nr += dr; nc += dc; }
        }
        return cnt;
    }
    // Check if clue at p is still satisfiable
    function clueOk(p) {
        if (ca[p] < 0 || G[p] !== 0) return true;
        const r = (p / C) | 0, c = p % C; let cnt = 1, maxCnt = 1;
        for (let d = 0; d < 4; d++) {
            const dr = d === 0 ? -1 : d === 2 ? 1 : 0, dc = d === 1 ? 1 : d === 3 ? -1 : 0;
            let nr = r + dr, nc = c + dc, seg = 0, mseg = 0;
            while (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                const v = G[nr * C + nc];
                if (v === 1) break; if (v === 0) { seg++; mseg++; } else { mseg++; }
                nr += dr; nc += dc;
            }
            cnt += seg; maxCnt += mseg;
        }
        return cnt <= ca[p] && maxCnt >= ca[p];
    }
    const V = new Uint32Array(N); let vg = 0;
    function val() {
        // White connectivity
        let ws = -1; ++vg;
        for (let i = 0; i < N; i++) if (G[i] === 0) { ws = i; break; }
        if (ws === -1) return false;
        const q = [ws]; V[ws] = vg; let h = 0, wc = 0;
        while (h < q.length) { const p = q[h++]; wc++; for (const n of aj[p]) if (G[n] === 0 && V[n] !== vg) { V[n] = vg; q.push(n); } }
        let tw = 0; for (let i = 0; i < N; i++) if (G[i] === 0) tw++;
        if (wc !== tw) return false;
        // Cape constraint (final): clue cells must have exactly 1 white neighbor, non-clue white must have ≥2
        for (let i = 0; i < N; i++) {
            if (G[i] !== 0) continue;
            let wn = 0; for (const n of aj[i]) if (G[n] === 0) wn++;
            if (ca[i] >= 0) { if (wn !== 1) return false; }
            else { if (wn < 2) return false; }
        }
        // Clue visibility exact
        for (let i = 0; i < N; i++) if (ca[i] >= 0 && visCount(i) !== ca[i]) return false;
        return true;
    }
    const res = [];
    function dfs(i) {
        if (out || res.length >= MX) return;
        if (!(i & 31) && performance.now() - t0 > TL) { out = true; return; }
        while (i < N && G[i] !== -1) i++;
        if (i === N) { if (val()) { const s = []; for (let r = 0; r < R; r++) s.push(Array.from(G.subarray(r * C, r * C + C))); res.push(s); } return; }
        // Try white
        G[i] = 0;
        if (no2x2(i, 0) && capeOk(i) && clueOk(i)) {
            let ok = true; for (const n of aj[i]) if (!capeOk(n) || !clueOk(n)) { ok = false; break; }
            if (ok) dfs(i + 1);
        }
        G[i] = -1;
        if (out || res.length >= MX) return;
        // Try black
        G[i] = 1;
        if (no2x2(i, 1)) {
            let ok = true; for (const n of aj[i]) if (!capeOk(n) || !clueOk(n)) { ok = false; break; }
            if (ok) dfs(i + 1);
        }
        G[i] = -1;
    }
    dfs(0); return { solutions: res, timeout: out };
};
