window.solveTren = function (puzzle) {
    const { rows: R, cols: C, clues } = puzzle;
    const N = R * C, TL = 4000, MX = 20, t0 = performance.now();
    let timeout = false;

    const clueMap = new Map();
    for (const k in clues) { const [r, c] = k.split(',').map(Number); clueMap.set(r * C + c, clues[k]); }

    const board = new Int16Array(N);
    let vid = 1;
    const shapes = [[2,1],[3,1],[1,2],[1,3]];

    function canPlace(p, w, h) {
        const r0 = p / C | 0, c0 = p % C;
        if (r0 + h > R || c0 + w > C) return false;
        for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++)
            if (board[(r0 + dr) * C + c0 + dc]) return false;
        return true;
    }
    function fill(p, w, h, v) {
        const r0 = p / C | 0, c0 = p % C;
        for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++)
            board[(r0 + dr) * C + c0 + dc] = v;
    }

    function check() {
        const meta = new Map();
        for (let i = 0; i < N; i++) {
            const v = board[i]; if (v <= 0 || meta.has(v)) continue;
            const r = i / C | 0, c = i % C; let w = 1, h = 1;
            while (c + w < C && board[r * C + c + w] === v) w++;
            while (r + h < R && board[(r + h) * C + c] === v) h++;
            meta.set(v, [r, c, w, h]);
        }
        for (const [idx, val] of clueMap) {
            const v = board[idx]; if (v <= 0) return false;
            const m = meta.get(v); if (!m) return false;
            const [r0, c0, w, h] = m; let f = 0;
            if (w > h) {
                for (let x = c0 - 1; x >= 0 && board[r0 * C + x] <= 0; x--) f++;
                for (let x = c0 + w; x < C && board[r0 * C + x] <= 0; x++) f++;
            } else {
                for (let y = r0 - 1; y >= 0 && board[y * C + c0] <= 0; y--) f++;
                for (let y = r0 + h; y < R && board[y * C + c0] <= 0; y++) f++;
            }
            if (f !== val) return false;
        }
        return true;
    }

    function snap() {
        const o = [];
        for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) { const v = board[r * C + c]; row.push(v > 0 ? v : 0); } o.push(row); }
        return o;
    }

    const res = [];
    (function dfs(p) {
        if (timeout || res.length >= MX) return;
        if (!(p & 31) && performance.now() - t0 > TL) { timeout = true; return; }
        if (p >= N) { if (check()) res.push(snap()); return; }
        if (board[p]) { dfs(p + 1); return; }

        if (!clueMap.has(p)) { board[p] = -1; dfs(p + 1); board[p] = 0; if (timeout || res.length >= MX) return; }
        for (const [w, h] of shapes) {
            if (!canPlace(p, w, h)) continue;
            const id = vid++; fill(p, w, h, id); dfs(p + 1); fill(p, w, h, 0); vid--;
            if (timeout || res.length >= MX) return;
        }
    })(0);

    return { solutions: res, timeout };
};
