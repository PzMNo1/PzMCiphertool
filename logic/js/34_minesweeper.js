/* 34_minesweeper.js — window.solveMinesweeper({rows,cols,clues}) → {solutions,timeout}
 * clues = {"r,c": number, ...}  线索格: 周围8格中地雷数量 */
window.solveMinesweeper = function ({ rows: R, cols: C, clues }) {
    const TM = 3500, MX = 100, t0 = performance.now(), N = R * C;
    let out = false;
    const G = new Int8Array(N); // 0=unknown,-1=safe,1=mine
    // 线索格预设为安全
    const clueSet = new Set();
    for (const k in clues) { const [r, c] = k.split(',').map(Number); G[r * C + c] = -1; clueSet.add(r * C + c); }

    function check(p) {
        // 检查 p 周围的所有线索格
        const pr = p / C | 0, pc = p % C;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const nr = pr + dr, nc = pc + dc;
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
            const np = nr * C + nc;
            if (!clueSet.has(np)) continue;
            const val = clues[nr + ',' + nc];
            let mines = 0, unk = 0;
            for (let dr2 = -1; dr2 <= 1; dr2++) for (let dc2 = -1; dc2 <= 1; dc2++) {
                if (!dr2 && !dc2) continue;
                const ar = nr + dr2, ac = nc + dc2;
                if (ar < 0 || ar >= R || ac < 0 || ac >= C) continue;
                const v = G[ar * C + ac];
                if (v === 1) mines++; else if (v === 0) unk++;
            }
            if (mines > val || mines + unk < val) return false;
        }
        return true;
    }

    function finalCheck() {
        for (const k in clues) {
            const [r, c] = k.split(',').map(Number), val = clues[k];
            let mines = 0;
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                if (!dr && !dc) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < R && nc >= 0 && nc < C && G[nr * C + nc] === 1) mines++;
            }
            if (mines !== val) return false;
        }
        return true;
    }

    const res = [];
    function solve(idx) {
        if (out || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TM) { out = true; return; }
        if (idx === N) { if (finalCheck()) res.push(G.slice()); return; }
        if (G[idx] !== 0) { if (check(idx)) solve(idx + 1); return; }
        // try mine
        G[idx] = 1; if (check(idx)) solve(idx + 1);
        if (out || res.length >= MX) { G[idx] = 0; return; }
        // try safe
        G[idx] = -1; if (check(idx)) solve(idx + 1);
        G[idx] = 0;
    }
    solve(0);
    return {
        solutions: res.map(g => { const s = []; for (let r = 0; r < R; r++) { s.push([]); for (let c = 0; c < C; c++) s[r].push(g[r * C + c] === 1); } return s; }),
        timeout: out
    };
};
