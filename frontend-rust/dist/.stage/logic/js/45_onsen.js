window.solveOnsen = function (puzzle) {
    const { rows: R, cols: C, clues, rooms } = puzzle;
    const TL = 3500, MX = 20, t0 = performance.now(), N = R * C;
    let out = false;
    const K = Object.keys(clues).length; if (!K) return { solutions: [], timeout: false };
    const ca = {}, clist = []; let lid = 1;
    for (const k in clues) { const [r, c] = k.split(',').map(Number); const p = r * C + c; ca[p] = { v: clues[k], id: lid }; clist.push({ p, v: clues[k], id: lid++ }); }
    const rm = new Uint8Array(N); // room index per cell
    rooms.forEach((room, i) => room.forEach(p => rm[p] = i));
    const NR = rooms.length;
    // Connection bitmask: UP=1 RIGHT=2 DOWN=4 LEFT=8
    const MASKS = [3, 5, 6, 9, 10, 12]; // valid 2-edge combos
    const vm = new Array(N);
    for (let i = 0; i < N; i++) {
        const r = (i / C) | 0, c = i % C, v = [0];
        for (const m of MASKS) {
            if ((m & 1) && r === 0) continue; if ((m & 2) && c === C - 1) continue;
            if ((m & 4) && r === R - 1) continue; if ((m & 8) && c === 0) continue; v.push(m);
        } vm[i] = v;
    }
    const G = new Int8Array(N).fill(-1), L = new Int8Array(N).fill(0); // mask, loop id
    const rcnt = Array.from({ length: NR }, () => new Int8Array(K + 1)); // rcnt[room][lid] = count

    function val() {
        // Each loop must form exactly one closed cycle
        for (const cl of clist) {
            let cur = cl.p, prev = -1, steps = 0;
            do {
                steps++;
                const m = G[cur], r = (cur / C) | 0, c = cur % C;
                const dirs = [[r - 1, c, 1, 4], [r, c + 1, 2, 8], [r + 1, c, 4, 1], [r, c - 1, 8, 2]];
                let next = -1;
                for (const [nr, nc, bit, opp] of dirs) {
                    if (!(m & bit)) continue;
                    const np = nr * C + nc;
                    if (np !== prev && L[np] === cl.id) { next = np; break; }
                }
                if (next < 0) return false;
                prev = cur; cur = next;
            } while (cur !== cl.p);
            // Count cells in this loop
            let total = 0; for (let i = 0; i < N; i++) if (L[i] === cl.id) total++;
            if (steps !== total) return false;
        }
        // Every room visited, room counts match
        for (let ri = 0; ri < NR; ri++) {
            let hit = false;
            for (let k = 1; k <= K; k++) {
                const cnt = rcnt[ri][k];
                if (cnt > 0) { hit = true; if (cnt !== clist[k - 1].v) return false; }
            }
            if (!hit) return false;
        }
        // No re-entrance: in each room, cells of same loop must be contiguous
        for (let k = 1; k <= K; k++) {
            for (let ri = 0; ri < NR; ri++) {
                if (rcnt[ri][k] === 0) continue;
                const cells = rooms[ri].filter(p => L[p] === k);
                // BFS connectivity within room
                const vis = new Set([cells[0]]); const q = [cells[0]];
                while (q.length) {
                    const p = q.pop(), r = (p / C) | 0, c = p % C;
                    const m = G[p];
                    for (const [nr, nc, bit] of [[r - 1, c, 1], [r, c + 1, 2], [r + 1, c, 4], [r, c - 1, 8]]) {
                        if (!(m & bit)) continue;
                        const np = nr * C + nc;
                        if (L[np] === k && rm[np] === ri && !vis.has(np)) { vis.add(np); q.push(np); }
                    }
                }
                if (vis.size !== cells.length) return false;
            }
        }
        return true;
    }

    const res = [];
    function dfs(idx) {
        if (out || res.length >= MX) return;
        if (!(idx & 15) && performance.now() - t0 > TL) { out = true; return; }
        while (idx < N && G[idx] !== -1) idx++;
        if (idx === N) { if (val()) { const s = []; for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push({ m: G[r * C + c], l: L[r * C + c] }); s.push(row); } res.push(s); } return; }
        const r = (idx / C) | 0, c = idx % C;
        const ai = r > 0 ? idx - C : -1, li = c > 0 ? idx - 1 : -1;
        const mU = ai >= 0 && G[ai] > 0 && (G[ai] & 4), nU = ai >= 0 && G[ai] >= 0 && !(G[ai] & 4);
        const mL = li >= 0 && G[li] > 0 && (G[li] & 2), nL = li >= 0 && G[li] >= 0 && !(G[li] & 2);
        for (const mask of vm[idx]) {
            if (mU && !(mask & 1)) continue; if (nU && (mask & 1)) continue;
            if (mL && !(mask & 8)) continue; if (nL && (mask & 8)) continue;
            if (mask === 0) {
                if (mU || mL || ca[idx]) continue;
                G[idx] = 0; L[idx] = 0; dfs(idx + 1); G[idx] = -1; L[idx] = 0;
            } else {
                let id = 0;
                if ((mask & 1) && ai >= 0 && L[ai] > 0) id = L[ai];
                if ((mask & 8) && li >= 0 && L[li] > 0) { if (id > 0 && id !== L[li]) continue; id = L[li]; }
                if (ca[idx]) { if (id > 0 && id !== ca[idx].id) continue; id = ca[idx].id; }
                const tryIds = id > 0 ? [id] : Array.from({ length: K }, (_, i) => i + 1);
                for (const tid of tryIds) {
                    const ri = rm[idx];
                    if (rcnt[ri][tid] > 0 && rcnt[ri][tid] >= clist[tid - 1].v) continue;
                    G[idx] = mask; L[idx] = tid; rcnt[ri][tid]++;
                    dfs(idx + 1);
                    G[idx] = -1; L[idx] = 0; rcnt[ri][tid]--;
                    if (out || res.length >= MX) return;
                }
            }
        }
    }
    // Pre-assign clue cells as "must be on loop"
    for (const cl of clist) G[cl.p] = -1; // ensure not pre-set
    dfs(0);
    return { solutions: res, timeout: out };
};
