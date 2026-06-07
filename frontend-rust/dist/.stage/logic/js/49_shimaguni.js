// 49_shimaguni.js — Shimaguni solver (DOM-free)
// API: window.solveShimaguni({ rows, cols, rooms, clues }) → { solutions, timeout }
window.solveShimaguni = function ({ rows: R, cols: C, rooms, clues }) {
    const N = R * C, TL = 3500, MX = 20, t0 = performance.now();
    let timeout = false;

    const roomOf = new Int8Array(N), nR = rooms.length;
    const rSize = new Int8Array(nR), rClue = new Int8Array(nR).fill(-1);
    rooms.forEach((rm, i) => { rSize[i] = rm.length; rm.forEach(p => roomOf[p] = i); });
    for (const k in clues) { const [r, c] = k.split(',').map(Number); rClue[roomOf[r * C + c]] = clues[k]; }

    // adjacency between rooms
    const adj = Array.from({ length: nR }, () => new Set());
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const p = r * C + c, ri = roomOf[p];
        if (c < C - 1 && roomOf[p + 1] !== ri) { adj[ri].add(roomOf[p + 1]); adj[roomOf[p + 1]].add(ri); }
        if (r < R - 1 && roomOf[p + C] !== ri) { adj[ri].add(roomOf[p + C]); adj[roomOf[p + C]].add(ri); }
    }
    const adjL = adj.map(s => [...s]);

    // order: clued & small rooms first
    const order = [];
    const rOrd = [...Array(nR).keys()].sort((a, b) => (rClue[b] >= 0) - (rClue[a] >= 0) || rSize[a] - rSize[b]);
    for (const ri of rOrd) for (const p of rooms[ri]) order.push(p);

    const sh = new Int8Array(N), rCnt = new Int32Array(nR), rDone = new Int32Array(nR);

    function connected(ri) {
        const cells = rooms[ri]; let first = -1, tot = 0;
        for (const p of cells) if (sh[p] === 1) { if (first < 0) first = p; tot++; }
        if (tot <= 1) return true;
        const vis = new Set([first]), q = [first]; let n = 0;
        while (q.length) {
            const p = q.pop(); n++;
            for (const d of [-C, C, -1, 1]) {
                const np = p + d;
                if (!vis.has(np) && roomOf[np] === ri && sh[np] === 1) { vis.add(np); q.push(np); }
            }
        }
        return n === tot;
    }

    function crossOk(p, ri) {
        const r = (p / C) | 0, c = p % C;
        if (r > 0 && roomOf[p - C] !== ri && sh[p - C] === 1) return false;
        if (r < R - 1 && roomOf[p + C] !== ri && sh[p + C] === 1) return false;
        if (c > 0 && roomOf[p - 1] !== ri && sh[p - 1] === 1) return false;
        if (c < C - 1 && roomOf[p + 1] !== ri && sh[p + 1] === 1) return false;
        return true;
    }

    const res = [];
    (function dfs(idx) {
        if (timeout || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TL) { timeout = true; return; }
        if (idx >= order.length) {
            const s = []; for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(sh[r * C + c] === 1 ? 1 : 0); s.push(row); }
            res.push(s); return;
        }
        const p = order[idx], ri = roomOf[p], cl = rClue[ri], rem = rSize[ri] - rDone[ri];

        for (const v of [1, -1]) {
            if (timeout || res.length >= MX) return;
            if (v === 1) {
                if (cl >= 0 && rCnt[ri] + 1 > cl) continue;
                if (!crossOk(p, ri)) continue;
            } else {
                if (cl >= 0 && rCnt[ri] + rem - 1 < cl) continue;
                if (rCnt[ri] === 0 && rem <= 1) continue;
            }
            sh[p] = v; if (v === 1) rCnt[ri]++; rDone[ri]++;

            let ok = true;
            if (rDone[ri] === rSize[ri]) {
                if (cl >= 0 && rCnt[ri] !== cl) ok = false;
                if (ok && rCnt[ri] === 0) ok = false;
                if (ok && !connected(ri)) ok = false;
                if (ok) for (const rj of adjL[ri]) if (rDone[rj] === rSize[rj] && rCnt[ri] === rCnt[rj]) { ok = false; break; }
            }
            if (ok) dfs(idx + 1);

            sh[p] = 0; if (v === 1) rCnt[ri]--; rDone[ri]--;
        }
    })(0);

    return { solutions: res, timeout };
};
