window.solveRippleEffect = function (puzzle) {
    const { rows: R, cols: C, rooms, clues } = puzzle;
    const N = R * C, TL = 3500, MX = 20, t0 = performance.now();
    let timeout = false;

    const roomOf = new Int8Array(N), maxV = new Int8Array(N);
    rooms.forEach((rm, i) => rm.forEach(p => { roomOf[p] = i; maxV[p] = rm.length; }));

    const grid = new Int8Array(N);
    for (const k in clues) { const [r, c] = k.split(',').map(Number); grid[r * C + c] = clues[k]; }

    const peers = rooms.map(rm => { const s = new Set(rm); return rm.map(p => { s.delete(p); const a = [...s]; s.add(p); return a; }); });
    const peerOf = new Array(N);
    rooms.forEach((rm, i) => rm.forEach((p, j) => peerOf[p] = peers[i][j]));

    const order = [];
    for (let i = 0; i < N; i++) if (!grid[i]) order.push(i);
    order.sort((a, b) => maxV[a] - maxV[b]);

    function ok(p, v) {
        for (const q of peerOf[p]) if (grid[q] === v) return false;
        const r = (p / C) | 0, c = p % C;
        for (let cc = Math.max(0, c - v); cc <= Math.min(C - 1, c + v); cc++)
            if (cc !== c && grid[r * C + cc] === v) return false;
        for (let rr = Math.max(0, r - v); rr <= Math.min(R - 1, r + v); rr++)
            if (rr !== r && grid[rr * C + c] === v) return false;
        return true;
    }

    for (let i = 0; i < N; i++) {
        if (grid[i]) { const v = grid[i]; grid[i] = 0; if (!ok(i, v)) return { solutions: [], timeout: false }; grid[i] = v; }
    }

    const res = [];
    (function dfs(idx) {
        if (timeout || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TL) { timeout = true; return; }
        if (idx >= order.length) {
            const s = []; for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(grid[r * C + c]); s.push(row); } res.push(s); return;
        }
        const p = order[idx];
        for (let v = 1; v <= maxV[p]; v++) {
            if (ok(p, v)) { grid[p] = v; dfs(idx + 1); grid[p] = 0; if (timeout || res.length >= MX) return; }
        }
    })(0);

    return { solutions: res, timeout };
};
