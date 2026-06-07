/* 32_magnets.js — Magnets solver: window.solveMagnets({rows,cols,hBorders,vBorders,topClues,leftClues,bottomClues,rightClues}) */
window.solveMagnets = function ({ rows: R, cols: C, hBorders: hB, vBorders: vB, topClues: tC, leftClues: lC, bottomClues: bC, rightClues: rC }) {
    const TM = 3500, MX = 100, t0 = performance.now(), N = R * C;
    let out = false;
    // BFS 找骨牌(2格区域)
    const vis = new Uint8Array(N), doms = [];
    for (let i = 0; i < N; i++) {
        if (vis[i]) continue;
        const q = [i], cells = []; vis[i] = 1;
        while (q.length) {
            const p = q.shift(), r = p / C | 0, c = p % C; cells.push(p);
            const add = n => { if (!vis[n]) { vis[n] = 1; q.push(n); } };
            if (r > 0 && !hB[r-1][c]) add(p-C);
            if (r < R-1 && !hB[r][c]) add(p+C);
            if (c > 0 && !vB[r][c-1]) add(p-1);
            if (c < C-1 && !vB[r][c]) add(p+1);
        }
        if (cells.length !== 2) return { solutions: [], timeout: false };
        doms.push(cells);
    }
    // 线索 (-1=无约束)
    const ft = tC.map(x => x ?? -1), fl = lC.map(x => x ?? -1);
    const fb = bC.map(x => x ?? -1), fr = rC.map(x => x ?? -1);
    // 计数器: ct[c]=列+数, cl[r]=行+数, cb[c]=列-数, cr[r]=行-数
    const ct = new Int8Array(C), cl = new Int8Array(R), cb = new Int8Array(C), cr = new Int8Array(R);
    const G = new Int8Array(N); // 0=空,1=+,2=-,3=中性
    const res = [];

    function ok(p, type) {
        if (type === 3) return true;
        const r = p / C | 0, c = p % C;
        // 同极相邻检查
        if (r > 0 && G[p-C] === type) return false;
        if (r < R-1 && G[p+C] === type) return false;
        if (c > 0 && G[p-1] === type) return false;
        if (c < C-1 && G[p+1] === type) return false;
        return true;
    }

    function clueOK() {
        // 上限检查（放置中）
        for (let c = 0; c < C; c++) { if (ft[c] >= 0 && ct[c] > ft[c]) return false; if (fb[c] >= 0 && cb[c] > fb[c]) return false; }
        for (let r = 0; r < R; r++) { if (fl[r] >= 0 && cl[r] > fl[r]) return false; if (fr[r] >= 0 && cr[r] > fr[r]) return false; }
        return true;
    }

    function finalOK() {
        for (let c = 0; c < C; c++) { if (ft[c] >= 0 && ct[c] !== ft[c]) return false; if (fb[c] >= 0 && cb[c] !== fb[c]) return false; }
        for (let r = 0; r < R; r++) { if (fl[r] >= 0 && cl[r] !== fl[r]) return false; if (fr[r] >= 0 && cr[r] !== fr[r]) return false; }
        return true;
    }

    function addC(p, t) { const r = p/C|0, c = p%C; if (t===1){ct[c]++;cl[r]++;} if (t===2){cb[c]++;cr[r]++;} }
    function subC(p, t) { const r = p/C|0, c = p%C; if (t===1){ct[c]--;cl[r]--;} if (t===2){cb[c]--;cr[r]--;} }

    function solve(idx) {
        if (out || res.length >= MX) return;
        if (!(idx & 15) && performance.now() - t0 > TM) { out = true; return; }
        if (idx === doms.length) { if (finalOK()) res.push(G.slice()); return; }
        const [a, b] = doms[idx];
        // 中性
        G[a] = 3; G[b] = 3; solve(idx + 1);
        if (out || res.length >= MX) return;
        // a=+, b=-
        G[a] = 1; G[b] = 2; addC(a, 1); addC(b, 2);
        if (ok(a, 1) && ok(b, 2) && clueOK()) solve(idx + 1);
        subC(a, 1); subC(b, 2);
        if (out || res.length >= MX) return;
        // a=-, b=+
        G[a] = 2; G[b] = 1; addC(a, 2); addC(b, 1);
        if (ok(a, 2) && ok(b, 1) && clueOK()) solve(idx + 1);
        subC(a, 2); subC(b, 1);
        G[a] = 0; G[b] = 0;
    }

    solve(0);
    return { solutions: res.map(g => { const s = []; for (let r = 0; r < R; r++) s.push(Array.from(g.subarray(r*C, r*C+C))); return s; }), timeout: out };
};
