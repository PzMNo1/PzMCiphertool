window.solveMasyu = function ({ rows: R, cols: C, circles }) {
    const TM = 3500, MX = 20, t0 = performance.now();
    let out = false;
    const nH = R * (C - 1), nV = (R - 1) * C, nE = nH + nV;
    // edge state: 0=unknown, 1=line, -1=no-line
    const E = new Int8Array(nE);
    // helpers: edge index
    const hi = (r, c) => r * (C - 1) + c;           // h edge (r,c)-(r,c+1)
    const vi = (r, c) => nH + r * C + c;             // v edge (r,c)-(r+1,c)

    // cell lines
    function cellDeg(r, c) {
        let on = 0, off = 0;
        if (c > 0) { const v = E[hi(r, c - 1)]; if (v === 1) on++; else if (v === -1) off++; }
        if (c < C - 1) { const v = E[hi(r, c)]; if (v === 1) on++; else if (v === -1) off++; }
        if (r > 0) { const v = E[vi(r - 1, c)]; if (v === 1) on++; else if (v === -1) off++; }
        if (r < R - 1) { const v = E[vi(r, c)]; if (v === 1) on++; else if (v === -1) off++; }
        const total = (c > 0 ? 1 : 0) + (c < C - 1 ? 1 : 0) + (r > 0 ? 1 : 0) + (r < R - 1 ? 1 : 0);
        return { on, off, unk: total - on - off };
    }

    function dirs(r, c) {
        // returns which directions have active lines: u,d,l,r
        let u = false, d = false, l = false, ri = false;
        if (r > 0 && E[vi(r - 1, c)] === 1) u = true;
        if (r < R - 1 && E[vi(r, c)] === 1) d = true;
        if (c > 0 && E[hi(r, c - 1)] === 1) l = true;
        if (c < C - 1 && E[hi(r, c)] === 1) ri = true;
        return { u, d, l, r: ri };
    }

    function isStraight(r, c) {
        const d = dirs(r, c);
        return (d.u && d.d) || (d.l && d.r);
    }

    function cellOK(r, c) {
        const { on, unk } = cellDeg(r, c);
        if (on > 2) return false;
        if (on + unk < 2 && on > 0) return false; // dead end
        const k = r + ',' + c;
        if (k in circles) {
            if (on + unk < 2) return false; // circle must be visited
            if (on === 2) {
                const st = isStraight(r, c);
                if (circles[k] === 'w' && !st) return false;
                if (circles[k] === 'b' && st) return false;
            }
        }
        return true;
    }

    // terminal check
    function checkLoop() {
        // degree check + circle geometry + single connected loop
        let start = -1, total = 0;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            const { on } = cellDeg(r, c);
            if (on !== 0 && on !== 2) return false;
            if (on === 2) { total++; if (start < 0) start = r * C + c; }
            const k = r + ',' + c;
            if (k in circles) {
                if (on !== 2) return false;
                const st = isStraight(r, c);
                if (circles[k] === 'w') {
                    if (!st) return false;
                    // at least one neighbor must turn
                    const d = dirs(r, c);
                    let turned = false;
                    if (d.u && !isStraight(r - 1, c)) turned = true;
                    if (d.d && !isStraight(r + 1, c)) turned = true;
                    if (d.l && !isStraight(r, c - 1)) turned = true;
                    if (d.r && !isStraight(r, c + 1)) turned = true;
                    if (!turned) return false;
                } else {
                    if (st) return false;
                    // both neighbors must be straight
                    const d = dirs(r, c);
                    if (d.u && !isStraight(r - 1, c)) return false;
                    if (d.d && !isStraight(r + 1, c)) return false;
                    if (d.l && !isStraight(r, c - 1)) return false;
                    if (d.r && !isStraight(r, c + 1)) return false;
                }
            }
        }
        if (!total) return false;
        // BFS connectivity
        const seen = new Uint8Array(R * C), q = [start]; seen[start] = 1; let cnt = 1, h = 0;
        while (h < q.length) {
            const p = q[h++], pr = p / C | 0, pc = p % C;
            const go = np => { if (!seen[np]) { seen[np] = 1; cnt++; q.push(np); } };
            if (pr > 0 && E[vi(pr - 1, pc)] === 1) go(p - C);
            if (pr < R - 1 && E[vi(pr, pc)] === 1) go(p + C);
            if (pc > 0 && E[hi(pr, pc - 1)] === 1) go(p - 1);
            if (pc < C - 1 && E[hi(pr, pc)] === 1) go(p + 1);
        }
        return cnt === total;
    }

    // edge list sorted by proximity to circles
    const edges = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) edges.push({ i: hi(r, c), r1: r, c1: c, r2: r, c2: c + 1 });
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) edges.push({ i: vi(r, c), r1: r, c1: c, r2: r + 1, c2: c });
    edges.sort((a, b) => {
        const sc = e => { let s = 0; if ((e.r1 + ',' + e.c1) in circles) s += 10; if ((e.r2 + ',' + e.c2) in circles) s += 10; return s; };
        return sc(b) - sc(a);
    });

    const res = [];
    function solve(idx) {
        if (out || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TM) { out = true; return; }
        if (idx === edges.length) { if (checkLoop()) res.push(E.slice()); return; }
        const e = edges[idx];
        for (const val of [1, -1]) {
            E[e.i] = val;
            if (cellOK(e.r1, e.c1) && cellOK(e.r2, e.c2)) solve(idx + 1);
            if (out || res.length >= MX) { E[e.i] = 0; return; }
        }
        E[e.i] = 0;
    }
    solve(0);

    // convert to 2D arrays
    const solutions = res.map(e => {
        const h = [], v = [];
        for (let r = 0; r < R; r++) { h.push([]); for (let c = 0; c < C - 1; c++) h[r].push(e[hi(r, c)] === 1); }
        for (let r = 0; r < R - 1; r++) { v.push([]); for (let c = 0; c < C; c++) v[r].push(e[vi(r, c)] === 1); }
        return { h, v };
    });
    return { solutions, timeout: out };
};
