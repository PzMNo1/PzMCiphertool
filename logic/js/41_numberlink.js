
window.solveNumberlink = function ({ rows: R, cols: C, clues, useAll }) {
    const TM = 3500, MX = 10, t0 = performance.now(), N = R * C;
    let out = false;
    // group clue pairs
    const pairs = {};
    for (const k in clues) {
        const v = clues[k], [r, c] = k.split(',').map(Number);
        (pairs[v] = pairs[v] || []).push(r * C + c);
    }
    for (const v in pairs) if (pairs[v].length !== 2) return { solutions: [], timeout: false };
    const pairKeys = Object.keys(pairs);
    if (!pairKeys.length) return { solutions: [], timeout: false };
    const owner = new Int8Array(N).fill(-1);
    // dir: 0=none, 1=U, 2=R, 3=D, 4=L
    const dir = new Int8Array(N);
    const DI = { 1: -C, 2: 1, 3: C, 4: -1 };
    const DNAME = ['', 'U', 'R', 'D', 'L'];
    const OPPOSITE = { 1: 3, 2: 4, 3: 1, 4: 2 };
    const res = [];
    // sinks set
    const sinks = new Set();
    for (const v in pairs) sinks.add(pairs[v][1]);

    function solvePair(pi) {
        if (out || res.length >= MX) return;
        if (performance.now() - t0 > TM) { out = true; return; }
        if (pi >= pairKeys.length) {
            // check: all cells used if required
            if (useAll) for (let i = 0; i < N; i++) if (owner[i] < 0) return;
            // build solution
            const sol = [];
            for (let r = 0; r < R; r++) { sol.push([]); for (let c = 0; c < C; c++) sol[r].push(DNAME[dir[r * C + c]]); }
            res.push(sol);
            return;
        }
        const v = pairKeys[pi];
        const [src, snk] = pairs[v];
        // DFS path from src to snk
        const pidx = pi;
        const path = [src];
        owner[src] = pidx;
        function dfs(cur) {
            if (out || res.length >= MX) return;
            if (!(path.length & 15) && performance.now() - t0 > TM) { out = true; return; }
            if (cur === snk) {
                // path complete for this pair
                solvePair(pi + 1);
                return;
            }
            const r = cur / C | 0, c = cur % C;
            // try 4 directions
            const moves = [];
            if (r > 0) moves.push([1, cur - C]);
            if (c < C - 1) moves.push([2, cur + 1]);
            if (r < R - 1) moves.push([3, cur + C]);
            if (c > 0) moves.push([4, cur - 1]);
            for (const [d, next] of moves) {
                if (next !== snk && owner[next] >= 0) continue; // occupied
                if (next !== snk && sinks.has(next)) continue; // can't pass through another sink
                let isOtherSrc = false;
                for (const v2 in pairs) if (v2 !== v && pairs[v2][0] === next) { isOtherSrc = true; break; }
                if (isOtherSrc) continue;
                dir[cur] = d;
                owner[next] = pidx;
                path.push(next);
                dfs(next);
                path.pop();
                if (next !== snk) owner[next] = -1;
                else owner[next] = -1;
                dir[cur] = 0;
                if (out || res.length >= MX) return;
            }
        }
        dfs(src);
        owner[src] = -1;
    }
    solvePair(0);
    return { solutions: res, timeout: out };
};
