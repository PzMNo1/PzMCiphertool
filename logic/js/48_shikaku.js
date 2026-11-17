window.solveShikaku = function (puzzle) {
    const { rows: R, cols: C, clues } = puzzle;
    const N = R * C, TL = 3500, MX = 20, t0 = performance.now();
    let timeout = false;
    const cv = new Int16Array(N), hc = new Uint8Array(N);
    let nc = 0;
    for (const k in clues) {
        const p = k.split(','), idx = +p[0] * C + +p[1];
        cv[idx] = clues[k]; hc[idx] = 1; nc++;
    }
    if (!nc) return { solutions: [], timeout: false };
    const cov = new Int16Array(N).fill(-1), res = [];
    let rid = 0;
    (function dfs () {
        if (timeout || res.length >= MX) return;
        if (!(rid & 15) && performance.now() - t0 > TL) { timeout = true; return; }
        let pos = -1;
        for (let i = 0; i < N; i++) if (cov[i] < 0) { pos = i; break; }
        if (pos < 0) {
            const s = [];
            for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(cov[r * C + c]); s.push(row); }
            res.push(s); return;
        }
        const pr = (pos / C) | 0, pc = pos % C;
        for (let h = 1; pr + h <= R; h++) {
            if (cov[(pr + h - 1) * C + pc] >= 0) break;
            let cc = 0, val = 0;
            for (let w = 1; pc + w <= C; w++) {
                let blk = false;
                for (let d = 0; d < h; d++) { if (cov[(pr + d) * C + pc + w - 1] >= 0) { blk = true; break; } }
                if (blk) break;
                for (let d = 0; d < h; d++) { const i = (pr + d) * C + pc + w - 1; if (hc[i]) { cc++; val = cv[i]; } }
                if (cc > 1) break;
                if (cc === 1 && val === h * w) {
                    const id = rid++;
                    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) cov[(pr + dr) * C + pc + dc] = id;
                    dfs();
                    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) cov[(pr + dr) * C + pc + dc] = -1;
                    rid--;
                    if (timeout || res.length >= MX) return;
                }
            }
        }
    })();
    return { solutions: res, timeout };
};
