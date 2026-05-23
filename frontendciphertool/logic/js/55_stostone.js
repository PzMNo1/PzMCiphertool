window.solveStostone = function (puzzle) {
    const { rows: R, cols: C, rooms, clues } = puzzle;
    const N = R * C, TL = 3500, MX = 20, t0 = performance.now(), half = R >>> 1;
    let timeout = false;

    const roomOf = new Int8Array(N);
    rooms.forEach((rm, i) => rm.forEach(p => { roomOf[p] = i; }));

    const roomClue = new Array(rooms.length).fill(-1);
    for (const k in clues) roomClue[roomOf[+k]] = clues[k];
    for (let i = 0; i < rooms.length; i++)
        if (roomClue[i] >= 0 && roomClue[i] > rooms[i].length) return { solutions: [], timeout: false };

    const board = new Int8Array(N), rc = new Int32Array(rooms.length), cc = new Int32Array(C), res = [];

    function connected(ri) {
        const stones = [];
        for (const p of rooms[ri]) if (board[p]) stones.push(p);
        if (stones.length <= 1) return true;
        const vis = new Set([stones[0]]), q = [stones[0]];
        while (q.length) {
            const cur = q.pop(), cr = (cur / C) | 0, cx = cur % C;
            for (const nb of [cur - C, cur + C, cur - 1, cur + 1]) {
                if (nb < 0 || nb >= N) continue;
                const nr = (nb / C) | 0, nc = nb % C;
                if (Math.abs(cr - nr) + Math.abs(cx - nc) !== 1) continue;
                if (!vis.has(nb) && board[nb] && roomOf[nb] === ri) { vis.add(nb); q.push(nb); }
            }
        }
        return vis.size === stones.length;
    }

    function gravity() {
        const g = new Int32Array(N);
        for (let c = 0; c < C; c++) {
            g[(R - 1) * C + c] = board[(R - 1) * C + c];
            for (let r = R - 2; r >= 0; r--) g[r * C + c] = g[(r + 1) * C + c] + board[r * C + c];
            if (g[c] !== half) return false;
        }
        for (let r = 0; r < R; r++)
            for (let c = 0; c < C - 1; c++) {
                const p = r * C + c;
                if (board[p] && board[p + 1] && g[p] !== g[p + 1]) return false;
            }
        return true;
    }

    (function dfs(idx) {
        if (timeout || res.length >= MX) return;
        if (!(idx & 63) && performance.now() - t0 > TL) { timeout = true; return; }
        if (idx >= N) {
            for (let i = 0; i < rooms.length; i++) {
                if (roomClue[i] >= 0 && rc[i] !== roomClue[i]) return;
                if (!rc[i] || !connected(i)) return;
            }
            if (!gravity()) return;
            const s = [];
            for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(board[r * C + c]); s.push(row); }
            res.push(s); return;
        }
        const r = (idx / C) | 0, c = idx % C, ri = roomOf[idx];
        // try empty
        if (cc[c] + R - r - 1 >= half) { board[idx] = 0; dfs(idx + 1); if (timeout || res.length >= MX) return; }
        // try stone
        if (cc[c] < half) {
            let ok = true;
            if (r > 0 && board[idx - C] && roomOf[idx - C] !== ri) ok = false;
            if (ok && c > 0 && board[idx - 1] && roomOf[idx - 1] !== ri) ok = false;
            if (ok && roomClue[ri] >= 0 && rc[ri] >= roomClue[ri]) ok = false;
            if (ok) { board[idx] = 1; rc[ri]++; cc[c]++; dfs(idx + 1); board[idx] = 0; rc[ri]--; cc[c]--; }
        }
    })(0);

    return { solutions: res, timeout };
};
