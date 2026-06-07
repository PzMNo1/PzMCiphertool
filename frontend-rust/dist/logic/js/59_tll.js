// TLL (Tapa Like Loop) — Pure solver.  window.solveTLL({ size, clues })
// clues: { "r,c": [n1,n2,...] }   Returns { solutions:[{h,v}], timeout }
window.solveTLL = function (puzzle) {
    const { size: N, clues } = puzzle;
    const TL = 3500, MX = 20, t0 = performance.now();
    const NN = N * N, OFF8 = [[-1,-1],[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1]];
    let timeout = false;

    const isClue = new Uint8Array(NN), conn = new Uint8Array(NN), clueMap = {};
    for (const k in clues) {
        const p = k.split(','), idx = (+p[0]) * N + (+p[1]);
        isClue[idx] = 1;
        clueMap[idx] = clues[k].slice().sort((a, b) => a - b);
    }

    // Precompute: which clues to check after processing each cell
    const chk = new Array(NN);
    for (let i = 0; i < NN; i++) chk[i] = [];
    for (const ci in clueMap) {
        const idx = +ci, cr = (idx / N) | 0, cc = idx % N;
        let last = -1;
        for (const [dr, dc] of OFF8) {
            const nr = cr + dr, nc = cc + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N) { const ni = nr * N + nc; if (ni > last) last = ni; }
        }
        if (last >= 0) chk[last].push(idx);
    }

    function validClue(ci) {
        const cr = (ci / N) | 0, cc = ci % N, exp = clueMap[ci], ring = [];
        for (const [dr, dc] of OFF8) {
            const nr = cr + dr, nc = cc + dc;
            ring.push((nr >= 0 && nr < N && nc >= 0 && nc < N && conn[nr * N + nc]) ? 1 : 0);
        }
        if (ring.every(v => !v)) return !exp.length;
        if (ring.every(v => v)) return exp.length === 1 && exp[0] === 8;
        const rot = ring.slice();
        while (rot[0]) rot.push(rot.shift());
        const bl = []; let cu = 0;
        for (const v of rot) { if (v) cu++; else { if (cu) bl.push(cu); cu = 0; } }
        if (cu) bl.push(cu);
        bl.sort((a, b) => a - b);
        if (bl.length !== exp.length) return false;
        for (let i = 0; i < bl.length; i++) if (bl[i] !== exp[i]) return false;
        return true;
    }

    function isSingleLoop() {
        let s = -1, total = 0;
        for (let i = 0; i < NN; i++) if (conn[i]) { if (s < 0) s = i; total++; }
        if (!total) return false;
        const vis = new Uint8Array(NN), q = [s]; vis[s] = 1; let f = 0;
        while (q.length) {
            const p = q.pop(); f++; const m = conn[p];
            if (m & 1) { const n = p - N; if (!vis[n]) { vis[n] = 1; q.push(n); } }
            if (m & 2) { const n = p + 1; if (!vis[n]) { vis[n] = 1; q.push(n); } }
            if (m & 4) { const n = p + N; if (!vis[n]) { vis[n] = 1; q.push(n); } }
            if (m & 8) { const n = p - 1; if (!vis[n]) { vis[n] = 1; q.push(n); } }
        }
        return f === total;
    }

    const res = [];
    function dfs(idx) {
        if (timeout || res.length >= MX) return;
        if (!(idx & 63) && performance.now() - t0 > TL) { timeout = true; return; }
        if (idx >= NN) {
            if (!isSingleLoop()) return;
            const h = [], v = [];
            for (let r = 0; r < N; r++) {
                const hr = []; for (let c = 0; c < N - 1; c++) hr.push(!!(conn[r * N + c] & 2));
                h.push(hr);
                if (r < N - 1) { const vr = []; for (let c = 0; c < N; c++) vr.push(!!(conn[r * N + c] & 4)); v.push(vr); }
            }
            res.push({ h, v }); return;
        }
        const r = (idx / N) | 0, c = idx % N;
        const up = r > 0 ? (conn[idx - N] >> 2) & 1 : 0;
        const lf = c > 0 ? (conn[idx - 1] >> 1) & 1 : 0;
        const inh = up + lf;

        if (isClue[idx]) {
            if (inh) return; conn[idx] = 0;
            let ok = true; for (const ci of chk[idx]) if (!validClue(ci)) { ok = false; break; }
            if (ok) dfs(idx + 1); conn[idx] = 0; return;
        }
        if (inh > 2) return;
        const cR = c < N - 1 && !isClue[idx + 1], cD = r < N - 1 && !isClue[idx + N];

        for (let bits = 0; bits < 4; bits++) {
            const aR = bits & 1, aD = (bits >> 1) & 1, deg = inh + aR + aD;
            if (deg !== 0 && deg !== 2) continue;
            if (aR && !cR || aD && !cD) continue;
            conn[idx] = (up ? 1 : 0) | (aR ? 2 : 0) | (aD ? 4 : 0) | (lf ? 8 : 0);
            let ok = true; for (const ci of chk[idx]) if (!validClue(ci)) { ok = false; break; }
            if (ok) dfs(idx + 1);
            conn[idx] = 0;
            if (timeout || res.length >= MX) return;
        }
    }

    dfs(0);
    return { solutions: res, timeout };
};
