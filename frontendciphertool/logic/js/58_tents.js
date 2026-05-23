window.solveTents = function ({ rows: R, cols: C, grid: src, rowClues: rC, colClues: cC }) {
    const N = R * C, TL = 3500, MX = 20, t0 = performance.now();
    const bd = new Int8Array(N), trees = [], res = [];
    let timeout = false;
    for (let i = 0; i < N; i++) { bd[i] = src[(i / C) | 0][i % C]; if (bd[i] === 1) trees.push(i); }

    const cands = trees.map(p => {
        const r = (p / C) | 0, c = p % C, a = [];
        [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
            const nr = r+dr, nc = c+dc;
            if (nr >= 0 && nr < R && nc >= 0 && nc < C && !bd[nr*C+nc]) a.push(nr*C+nc);
        });
        return a;
    });
    const order = trees.map((_,i) => i).sort((a,b) => cands[a].length - cands[b].length);

    const cnt = (axis, idx) => { let n = 0; for (let k = 0; k < (axis ? R : C); k++) if (bd[axis ? k*C+idx : idx*C+k] === 2) n++; return n; };

    const ok = p => {
        const r = (p/C)|0, c = p%C;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nr = r+dr, nc = c+dc;
            if (nr >= 0 && nr < R && nc >= 0 && nc < C && bd[nr*C+nc] === 2) return false;
        }
        return true;
    };

    (function dfs(idx) {
        if (timeout || res.length >= MX) return;
        if (!(idx & 15) && performance.now() - t0 > TL) { timeout = true; return; }
        if (idx >= order.length) {
            for (let i = 0; i < R; i++) if (rC[i] !== -1 && cnt(0, i) !== rC[i]) return;
            for (let j = 0; j < C; j++) if (cC[j] !== -1 && cnt(1, j) !== cC[j]) return;
            const s = []; for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(bd[r*C+c]); s.push(row); } res.push(s);
            return;
        }
        for (const p of cands[order[idx]]) {
            if (bd[p] || !ok(p)) continue;
            const pr = (p/C)|0, pc = p%C;
            if (rC[pr] !== -1 && cnt(0, pr) + 1 > rC[pr]) continue;
            if (cC[pc] !== -1 && cnt(1, pc) + 1 > cC[pc]) continue;
            bd[p] = 2; dfs(idx + 1); bd[p] = 0;
            if (timeout || res.length >= MX) return;
        }
    })(0);

    return { solutions: res, timeout };
};
