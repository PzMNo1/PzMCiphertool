// 56_tapa.js — Tapa solver (DOM-free)
// API: window.solveTapa({ rows, cols, clues }) → { solutions, timeout }
// clues: { "r,c": [n1,n2,...] } → sorted block lengths around that cell
window.solveTapa = function ({ rows: R, cols: C, clues }) {
    const N = R * C, TL = 4000, MX = 20, t0 = performance.now();
    let timeout = false;

    const clueMap = new Map(), isClue = new Uint8Array(N);
    for (const k in clues) {
        const [r, c] = k.split(',').map(Number), idx = r * C + c;
        clueMap.set(idx, clues[k].slice().sort((a, b) => a - b));
        isClue[idx] = 1;
    }

    // 8-neighbor ring (clockwise)
    const D8 = [[-1,-1],[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1]];
    const adj8 = new Array(N);
    for (let i = 0; i < N; i++) {
        const r = (i / C) | 0, c = i % C;
        adj8[i] = D8.map(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            return nr >= 0 && nr < R && nc >= 0 && nc < C ? nr * C + nc : -1;
        });
    }

    // Parse ring mask → sorted block lengths
    function parseRing(mask) {
        const v = []; for (let k = 0; k < 8; k++) v.push((mask >> k) & 1);
        if (v.every(x => x === 1)) return [8];
        if (v.every(x => x === 0)) return [0];
        while (v[0] === 1) v.push(v.shift());
        const b = []; let c = 0;
        for (const x of v) { if (x) c++; else { if (c) b.push(c); c = 0; } }
        if (c) b.push(c);
        return b.length ? b.sort((a, b) => a - b) : [0];
    }

    function arrEq(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    }

    // Precompute valid masks per clue cell
    const cluePatterns = new Map();
    for (const [idx, exp] of clueMap) {
        const nb = adj8[idx], masks = [];
        for (let m = 0; m < 256; m++) {
            let ok = true;
            for (let k = 0; k < 8; k++) {
                if (!((m >> k) & 1)) continue;
                if (nb[k] < 0 || isClue[nb[k]]) { ok = false; break; }
            }
            if (ok && arrEq(parseRing(m), exp)) masks.push(m);
        }
        cluePatterns.set(idx, masks);
    }

    const board = new Int8Array(N).fill(-1); // -1=undecided, 0=white, 1=black
    for (const idx of clueMap.keys()) board[idx] = 0;

    // Decision order: cells near clues first
    const pressure = new Int8Array(N);
    for (const [idx] of clueMap) for (const n of adj8[idx]) if (n >= 0 && !isClue[n]) pressure[n]++;
    const order = [];
    for (let i = 0; i < N; i++) if (!isClue[i]) order.push(i);
    order.sort((a, b) => pressure[b] - pressure[a]);

    // 2×2 all-black check
    function bad2x2(pos) {
        const r = (pos / C) | 0, c = pos % C;
        for (let dr = 0; dr <= 1; dr++) for (let dc = 0; dc <= 1; dc++) {
            const tr = r - dr, tc = c - dc;
            if (tr < 0 || tr + 1 >= R || tc < 0 || tc + 1 >= C) continue;
            const i = tr * C + tc;
            if (board[i] === 1 && board[i+1] === 1 && board[i+C] === 1 && board[i+C+1] === 1) return true;
        }
        return false;
    }

    // Check affected clue constraints still satisfiable
    function cluesOk(pos) {
        const r = (pos / C) | 0, c = pos % C;
        for (const [dr, dc] of D8) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
            const ci = nr * C + nc;
            if (!clueMap.has(ci)) continue;
            const nb = adj8[ci], pats = cluePatterns.get(ci);
            let any = false;
            for (const m of pats) {
                let ok = true;
                for (let k = 0; k < 8; k++) {
                    const n = nb[k]; if (n < 0) continue;
                    if (board[n] !== -1 && board[n] !== ((m >> k) & 1)) { ok = false; break; }
                }
                if (ok) { any = true; break; }
            }
            if (!any) return false;
        }
        return true;
    }

    // BFS connectivity of all black cells
    function connected() {
        let s = -1, tot = 0;
        for (let i = 0; i < N; i++) if (board[i] === 1) { if (s < 0) s = i; tot++; }
        if (tot <= 1) return true;
        const vis = new Uint8Array(N), q = [s]; vis[s] = 1; let n = 0, h = 0;
        while (h < q.length) {
            const p = q[h++]; n++;
            const pr = (p / C) | 0, pc = p % C;
            for (const np of [pr > 0 ? p-C : -1, pr < R-1 ? p+C : -1, pc > 0 ? p-1 : -1, pc < C-1 ? p+1 : -1])
                if (np >= 0 && board[np] === 1 && !vis[np]) { vis[np] = 1; q.push(np); }
        }
        return n === tot;
    }

    // Final clue verification
    function allCluesOk() {
        for (const [idx, exp] of clueMap) {
            let m = 0; const nb = adj8[idx];
            for (let k = 0; k < 8; k++) if (nb[k] >= 0 && board[nb[k]] === 1) m |= 1 << k;
            if (!arrEq(parseRing(m), exp)) return false;
        }
        return true;
    }

    const res = [];
    (function dfs(di) {
        if (timeout || res.length >= MX) return;
        if (!(di & 255) && performance.now() - t0 > TL) { timeout = true; return; }
        if (di >= order.length) {
            if (connected() && allCluesOk()) {
                const s = []; for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(board[r*C+c] === 1 ? 1 : 0); s.push(row); }
                res.push(s);
            }
            return;
        }
        const p = order[di];
        // Try black
        board[p] = 1;
        if (!bad2x2(p) && cluesOk(p)) dfs(di + 1);
        if (timeout || res.length >= MX) { board[p] = -1; return; }
        // Try white
        board[p] = 0;
        if (cluesOk(p)) dfs(di + 1);
        board[p] = -1;
    })(0);

    return { solutions: res, timeout };
};
