/* 36_nagare.js — window.solveNagare({rows,cols,clues}) → {solutions,timeout}
 * clues = {"r,c":"black"|"wind-U/D/L/R"|"path-U/D/L/R"}
 * solution = {h:int8[R][C-1], v:int8[R-1][C]}
 *   h[r][c]: 0=no, 1=right(→), -1=left(←)
 *   v[r][c]: 0=no, 1=down(↓), -1=up(↑) */
window.solveNagare = function ({ rows: R, cols: C, clues }) {
    const TM = 3500, MX = 20, t0 = performance.now(), N = R * C;
    let out = false;
    const black = new Uint8Array(N);
    const windClue = {}; // p → 'U'|'D'|'L'|'R'
    const pathClue = {}; // p → 'U'|'D'|'L'|'R'
    for (const k in clues) {
        const [r, c] = k.split(',').map(Number), p = r * C + c, v = clues[k];
        if (v === 'black') black[p] = 1;
        else if (v.startsWith('wind-')) windClue[p] = v[5];
        else if (v.startsWith('path-')) pathClue[p] = v[5];
    }
    // edge indices
    const nH = R * (C - 1), nV = (R - 1) * C;
    const hi = (r, c) => r * (C - 1) + c, vi = (r, c) => nH + r * C + c;
    // directed edge state: 0=unk, +1=forward, -1=backward, 2=off
    const E = new Int8Array(nH + nV);
    // inDeg/outDeg per cell
    const inD = new Int8Array(N), outD = new Int8Array(N);

    // cell connections: for each cell, get list of {edge, other, isFwd}
    // isFwd: if edge set to +1, flow goes from this cell to other
    function getEdges(p) {
        const r = p / C | 0, c = p % C, res = [];
        if (c < C - 1) res.push({ ei: hi(r, c), other: p + 1, fwdOut: true }); // h: +1=right → out from p
        if (c > 0) res.push({ ei: hi(r, c - 1), other: p - 1, fwdOut: false }); // h: +1=right → in to p
        if (r < R - 1) res.push({ ei: vi(r, c), other: p + C, fwdOut: true }); // v: +1=down → out from p
        if (r > 0) res.push({ ei: vi(r - 1, c), other: p - C, fwdOut: false }); // v: +1=down → in to p
        return res;
    }

    function cellOK(p) {
        if (black[p]) return inD[p] === 0 && outD[p] === 0;
        if (inD[p] > 1 || outD[p] > 1) return false;
        // path clue: if fully determined (in=1,out=1), check direction
        if (p in pathClue && inD[p] === 1 && outD[p] === 1) {
            if (!checkPathDir(p)) return false;
        }
        return true;
    }

    function checkPathDir(p) {
        const dir = pathClue[p], r = p / C | 0, c = p % C;
        // find out-direction
        const edges = getEdges(p);
        for (const e of edges) {
            const v = E[e.ei];
            if (v === 0 || v === 2) continue;
            const isOut = (v === 1 && e.fwdOut) || (v === -1 && !e.fwdOut);
            if (isOut) {
                const or = e.other / C | 0, oc = e.other % C;
                const actualDir = or < r ? 'U' : or > r ? 'D' : oc < c ? 'L' : 'R';
                return actualDir === dir;
            }
        }
        return true;
    }

    // Check final: single directed loop + all constraints
    function checkFinal() {
        let start = -1, total = 0;
        for (let i = 0; i < N; i++) {
            if (black[i]) { if (inD[i] || outD[i]) return false; continue; }
            if (inD[i] !== outD[i]) return false;
            if (inD[i] !== 0 && inD[i] !== 1) return false;
            if (inD[i] === 1) { total++; if (start < 0) start = i; }
        }
        if (!total) return false;
        // follow directed loop
        let cur = start, cnt = 0;
        do {
            cnt++;
            const edges = getEdges(cur);
            let next = -1;
            for (const e of edges) {
                const v = E[e.ei];
                if (v === 0 || v === 2) continue;
                const isOut = (v === 1 && e.fwdOut) || (v === -1 && !e.fwdOut);
                if (isOut) { next = e.other; break; }
            }
            if (next < 0) return false;
            cur = next;
        } while (cur !== start);
        if (cnt !== total) return false;
        // path clues
        for (const p in pathClue) if (inD[+p] !== 1 || !checkPathDir(+p)) return false;
        // wind clues: check flow direction in affected cells
        for (const p in windClue) {
            const dir = windClue[p], r = (+p) / C | 0, c = (+p) % C;
            const dr = dir === 'U' ? -1 : dir === 'D' ? 1 : 0;
            const dc = dir === 'L' ? -1 : dir === 'R' ? 1 : 0;
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                const np = nr * C + nc;
                if (black[np] || np in windClue) break;
                if (inD[np] === 1) {
                    // check: the loop segment through this cell has a component matching wind direction
                    if (!checkWindCell(np, dir)) return false;
                }
                nr += dr; nc += dc;
            }
        }
        return true;
    }

    function checkWindCell(p, windDir) {
        // Cell is on loop. Check if flow through cell has component matching wind.
        // Wind-L: cell must have flow component going left (entering from right or exiting to left)
        const r = p / C | 0, c = p % C, edges = getEdges(p);
        for (const e of edges) {
            const v = E[e.ei]; if (v === 0 || v === 2) continue;
            const isIn = (v === 1 && !e.fwdOut) || (v === -1 && e.fwdOut);
            const isOut = !isIn;
            const or = e.other / C | 0, oc = e.other % C;
            if (isIn) {
                // flow comes FROM other → this cell in direction opposite to (other→this)
                const fromDir = or < r ? 'U' : or > r ? 'D' : oc < c ? 'L' : 'R';
                // Wind says flow should have component in windDir
                // "in from" direction: the flow enters from fromDir side
                // wind-L means flow goes left, i.e. enters from RIGHT or exits to LEFT
                if (windDir === 'L' && fromDir === 'R') return true;
                if (windDir === 'R' && fromDir === 'L') return true;
                if (windDir === 'U' && fromDir === 'D') return true;
                if (windDir === 'D' && fromDir === 'U') return true;
            }
            if (isOut) {
                const toDir = or < r ? 'U' : or > r ? 'D' : oc < c ? 'L' : 'R';
                if (toDir === windDir) return true;
            }
        }
        return false;
    }

    // edge list
    const edgeList = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) edgeList.push({ i: hi(r, c), a: r * C + c, b: r * C + c + 1 });
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) edgeList.push({ i: vi(r, c), a: r * C + c, b: (r + 1) * C + c });

    const res = [];
    function solve(idx) {
        if (out || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TM) { out = true; return; }
        if (idx === edgeList.length) { if (checkFinal()) res.push(E.slice()); return; }
        const e = edgeList[idx];
        // if either endpoint is black, edge must be off
        if (black[e.a] || black[e.b]) { E[e.i] = 2; solve(idx + 1); E[e.i] = 0; return; }
        // try forward (+1)
        E[e.i] = 1; outD[e.a]++; inD[e.b]++;
        if (cellOK(e.a) && cellOK(e.b)) solve(idx + 1);
        outD[e.a]--; inD[e.b]--; if (out || res.length >= MX) { E[e.i] = 0; return; }
        // try backward (-1)
        E[e.i] = -1; inD[e.a]++; outD[e.b]++;
        if (cellOK(e.a) && cellOK(e.b)) solve(idx + 1);
        inD[e.a]--; outD[e.b]--; if (out || res.length >= MX) { E[e.i] = 0; return; }
        // try off (2)
        E[e.i] = 2; solve(idx + 1); E[e.i] = 0;
    }
    solve(0);
    const solutions = res.map(e => {
        const h = [], v = [];
        for (let r = 0; r < R; r++) { h.push([]); for (let c = 0; c < C - 1; c++) h[r].push(e[hi(r, c)]); }
        for (let r = 0; r < R - 1; r++) { v.push([]); for (let c = 0; c < C; c++) v[r].push(e[vi(r, c)]); }
        return { h, v };
    });
    return { solutions, timeout: out };
};
