/* 35_moonsun.js — window.solveMoonsun({rows,cols,hBorders,vBorders,symbols}) → {solutions,timeout}
 * symbols = {"r,c":"moon"|"sun"}
 * solution = {h:bool[R][C-1], v:bool[R-1][C]} — loop edges */
window.solveMoonsun = function ({ rows: R, cols: C, hBorders: hB, vBorders: vB, symbols: sym }) {
    const TM = 3500, MX = 20, t0 = performance.now(), N = R * C;
    let out = false;
    // BFS regions
    const regOf = new Int16Array(N).fill(-1), regs = [];
    for (let i = 0; i < N; i++) {
        if (regOf[i] >= 0) continue;
        const id = regs.length, q = [i], cells = []; regOf[i] = id;
        while (q.length) {
            const p = q.shift(), r = p / C | 0, c = p % C; cells.push(p);
            const go = n => { if (regOf[n] < 0) { regOf[n] = id; q.push(n); } };
            if (r > 0 && !hB[r - 1][c]) go(p - C);
            if (r < R - 1 && !hB[r][c]) go(p + C);
            if (c > 0 && !vB[r][c - 1]) go(p - 1);
            if (c < C - 1 && !vB[r][c]) go(p + 1);
        }
        regs.push(cells);
    }
    // region symbol data
    const regMoons = regs.map(() => []), regSuns = regs.map(() => []);
    for (const k in sym) {
        const [r, c] = k.split(',').map(Number), p = r * C + c, id = regOf[p];
        if (sym[k] === 'moon') regMoons[id].push(p); else regSuns[id].push(p);
    }
    // edges
    const nH = R * (C - 1), nV = (R - 1) * C, nE = nH + nV;
    const hi = (r, c) => r * (C - 1) + c, vi = (r, c) => nH + r * C + c;
    const E = new Int8Array(nE); // 0=unk,1=on,-1=off
    const deg = new Int8Array(N);
    // edge list sorted by symbol proximity
    const edges = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) edges.push({ i: hi(r, c), a: r * C + c, b: r * C + c + 1 });
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) edges.push({ i: vi(r, c), a: r * C + c, b: (r + 1) * C + c });
    edges.sort((a, b) => {
        const sc = e => { let s = 0; const ka = (e.a / C | 0) + ',' + e.a % C, kb = (e.b / C | 0) + ',' + e.b % C; if (ka in sym) s += 10; if (kb in sym) s += 10; return s; };
        return sc(b) - sc(a);
    });

    function cellOK(p) {
        if (deg[p] > 2) return false;
        // count remaining edges from edges array... simplified: just degree check
        return true;
    }

    function regOK(p) {
        // quick region check: if both moon and sun are active in same region → fail
        const id = regOf[p];
        let hasM = false, hasS = false;
        for (const mp of regMoons[id]) if (deg[mp] > 0) { hasM = true; break; }
        if (hasM) for (const sp of regSuns[id]) if (deg[sp] > 0) { hasS = true; break; }
        return !(hasM && hasS);
    }

    function checkLoop() {
        // degree must be 0 or 2
        let start = -1, total = 0;
        for (let i = 0; i < N; i++) { if (deg[i] !== 0 && deg[i] !== 2) return false; if (deg[i] === 2) { total++; if (start < 0) start = i; } }
        if (!total) return false;
        // BFS connectivity
        const seen = new Uint8Array(N), q = [start]; seen[start] = 1; let cnt = 1, h = 0;
        while (h < q.length) {
            const p = q[h++], pr = p / C | 0, pc = p % C;
            const go = np => { if (!seen[np]) { seen[np] = 1; cnt++; q.push(np); } };
            if (pc > 0 && E[hi(pr, pc - 1)] === 1) go(p - 1);
            if (pc < C - 1 && E[hi(pr, pc)] === 1) go(p + 1);
            if (pr > 0 && E[vi(pr - 1, pc)] === 1) go(p - C);
            if (pr < R - 1 && E[vi(pr, pc)] === 1) go(p + C);
        }
        if (cnt !== total) return false;
        // region constraints
        for (let id = 0; id < regs.length; id++) {
            let hitM = 0, hitS = 0;
            for (const p of regMoons[id]) if (deg[p] === 2) hitM++;
            for (const p of regSuns[id]) if (deg[p] === 2) hitS++;
            if (hitM > 0 && hitS > 0) return false;
            if (hitM === 0 && hitS === 0) return false; // must visit at least one symbol
            if (hitM > 0 && hitM !== regMoons[id].length) return false; // must hit ALL moons
            if (hitS > 0 && hitS !== regSuns[id].length) return false; // must hit ALL suns
        }
        return true;
    }

    const res = [];
    function solve(idx) {
        if (out || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TM) { out = true; return; }
        if (idx === edges.length) { if (checkLoop()) res.push(E.slice()); return; }
        const e = edges[idx];
        // try on
        if (deg[e.a] < 2 && deg[e.b] < 2) {
            E[e.i] = 1; deg[e.a]++; deg[e.b]++;
            if (regOK(e.a) && regOK(e.b)) solve(idx + 1);
            deg[e.a]--; deg[e.b]--; E[e.i] = 0;
            if (out || res.length >= MX) return;
        }
        // try off
        E[e.i] = -1; solve(idx + 1); E[e.i] = 0;
    }
    solve(0);
    const solutions = res.map(e => {
        const h = [], v = [];
        for (let r = 0; r < R; r++) { h.push([]); for (let c = 0; c < C - 1; c++) h[r].push(e[hi(r, c)] === 1); }
        for (let r = 0; r < R - 1; r++) { v.push([]); for (let c = 0; c < C; c++) v[r].push(e[vi(r, c)] === 1); }
        return { h, v };
    });
    return { solutions, timeout: out };
};
