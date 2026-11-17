// Tatamibari Solver — DOM-free. Input: {rows,cols,clues{"r,c":"+|-|"}} → {solutions:[board[][]],timeout}
window.solveTatamibari = function ({ rows: R, cols: C, clues }) {
    const TL = 3500, MX = 20, t0 = performance.now(), N = R * C;
    let timeout = false;
    const cList = [];
    for (const k in clues) { const [r, c] = k.split(',').map(Number); cList.push({ r, c, type: clues[k] }); }
    if (!cList.length) return { solutions: [], timeout: false };

    const board = new Int8Array(N).fill(-1), res = [];
    const I = (r, c) => r * C + c;

    function empty(r, c, w, h) {
        for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) if (board[I(r + i, c + j)] !== -1) return false;
        return true;
    }
    function fill(r, c, w, h, id) { for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) board[I(r + i, c + j)] = id; }
    function clear(r, c, w, h) { for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) board[I(r + i, c + j)] = -1; }

    function enclosed(r, c, w, h) {
        let f = -1;
        for (let i = 0; i < cList.length; i++) {
            const s = cList[i];
            if (s.r >= r && s.r < r + h && s.c >= c && s.c < c + w) { if (f !== -1) return -2; f = i; }
        }
        return f;
    }

    function cornersOk(rr, cc, w, h) {
        for (let i = Math.max(0, rr - 1); i <= Math.min(R - 2, rr + h - 1); i++)
            for (let j = Math.max(0, cc - 1); j <= Math.min(C - 2, cc + w - 1); j++) {
                const a = board[I(i, j)], b = board[I(i, j + 1)], c = board[I(i + 1, j)], d = board[I(i + 1, j + 1)];
                if (a >= 0 && b >= 0 && c >= 0 && d >= 0 && a !== b && a !== c && a !== d && b !== c && b !== d && c !== d) return false;
            }
        return true;
    }

    (function dfs() {
        if (timeout || res.length >= MX) return;
        if (performance.now() - t0 > TL) { timeout = true; return; }
        let fr = -1, fc;
        for (let p = 0; p < N; p++) if (board[p] === -1) { fr = (p / C) | 0; fc = p % C; break; }
        if (fr === -1) { const s = []; for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(board[I(r, c)]); s.push(row); } res.push(s); return; }
        for (let h = 1; fr + h <= R; h++) for (let w = 1; fc + w <= C; w++) {
            if (timeout || res.length >= MX) return;
            if (!empty(fr, fc, w, h)) { let rb = false; for (let i = 0; i < h; i++) if (board[I(fr + i, fc + w - 1)] !== -1) { rb = true; break; } if (rb) break; continue; }
            const ci = enclosed(fr, fc, w, h);
            if (ci < 0) continue;
            const t = cList[ci].type;
            if ((t === '+' && w !== h) || (t === '-' && w <= h) || (t === '|' && h <= w)) continue;
            fill(fr, fc, w, h, ci);
            if (cornersOk(fr, fc, w, h)) dfs();
            clear(fr, fc, w, h);
        }
    })();
    return { solutions: res, timeout };
};
