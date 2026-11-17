/* 38_ncells.js — window.solveNcells({rows,cols,regionSize,clues}) → {solutions,timeout}
 * clues = {"r,c": number}  number = count of orthogonal neighbors in a DIFFERENT region
 * solution = borders {hB: bool[R-1][C], vB: bool[R][C-1]}  (true = border between regions) */
window.solveNcells = function ({ rows: R, cols: C, regionSize: RS, clues }) {
    const TM = 3500, MX = 20, t0 = performance.now(), N = R * C;
    if (N % RS !== 0) return { solutions: [], timeout: false };
    const numRegs = N / RS;
    let out = false;
    // region assignment per cell: -1=unassigned
    const reg = new Int16Array(N).fill(-1);
    const regSz = new Int16Array(numRegs); // current size of each region

    // build adjacency
    function neighbors(p) {
        const r = p / C | 0, c = p % C, nb = [];
        if (r > 0) nb.push(p - C); if (r < R - 1) nb.push(p + C);
        if (c > 0) nb.push(p - 1); if (c < C - 1) nb.push(p + 1);
        return nb;
    }

    // check clue: for cell p with clue value v, the number of neighbors in different regions must match
    function checkClue(p) {
        const [r, c] = [p / C | 0, p % C], k = r + ',' + c;
        if (!(k in clues)) return true;
        const v = clues[k];
        if (reg[p] < 0) return true; // can't check yet
        const nb = neighbors(p);
        let diff = 0, unk = 0;
        for (const np of nb) {
            if (reg[np] < 0) unk++;
            else if (reg[np] !== reg[p]) diff++;
        }
        if (diff > v) return false;
        if (diff + unk < v) return false;
        return true;
    }

    function checkClueFinal(p) {
        const [r, c] = [p / C | 0, p % C], k = r + ',' + c;
        if (!(k in clues)) return true;
        const v = clues[k];
        let diff = 0;
        for (const np of neighbors(p)) if (reg[np] !== reg[p]) diff++;
        return diff === v;
    }

    // check region contiguity via BFS for region id
    function regionConnected(rid) {
        let start = -1;
        for (let i = 0; i < N; i++) if (reg[i] === rid) { start = i; break; }
        if (start < 0) return true;
        const seen = new Uint8Array(N); seen[start] = 1;
        const q = [start]; let cnt = 1, h = 0;
        while (h < q.length) {
            const p = q[h++];
            for (const np of neighbors(p)) {
                if (!seen[np] && reg[np] === rid) { seen[np] = 1; cnt++; q.push(np); }
            }
        }
        return cnt === regSz[rid];
    }

    // BFS: can unassigned cells still form regions of size RS?
    // Simple check: each connected component of unassigned cells must have size >= RS
    // and be divisible by RS... too expensive for pruning, skip.

    const res = [];
    function solve(idx) {
        if (out || res.length >= MX) return;
        if (!(idx & 15) && performance.now() - t0 > TM) { out = true; return; }
        if (idx === N) {
            // final check: all clues satisfied exactly + all regions connected
            for (let i = 0; i < N; i++) if (!checkClueFinal(i)) return;
            for (let rid = 0; rid < numRegs; rid++) if (!regionConnected(rid)) return;
            res.push(reg.slice());
            return;
        }
        // try assigning cell idx to each possible region
        const nb = neighbors(idx);
        const tried = new Set();
        // option 1: join an existing neighboring region
        for (const np of nb) {
            if (reg[np] < 0) continue;
            const rid = reg[np];
            if (tried.has(rid)) continue;
            tried.add(rid);
            if (regSz[rid] >= RS) continue;
            reg[idx] = rid; regSz[rid]++;
            if (checkClue(idx)) {
                let ok = true;
                for (const np2 of nb) if (!checkClue(np2)) { ok = false; break; }
                if (ok) solve(idx + 1);
            }
            reg[idx] = -1; regSz[rid]--;
            if (out || res.length >= MX) return;
        }
        // option 2: start a new region (if available)
        let newRid = -1;
        for (let r = 0; r < numRegs; r++) if (regSz[r] === 0) { newRid = r; break; }
        if (newRid >= 0) {
            reg[idx] = newRid; regSz[newRid] = 1;
            if (checkClue(idx)) {
                let ok = true;
                for (const np of nb) if (!checkClue(np)) { ok = false; break; }
                if (ok) solve(idx + 1);
            }
            reg[idx] = -1; regSz[newRid] = 0;
        }
    }
    solve(0);
    return {
        solutions: res.map(r => {
            const hBord = [], vBord = [];
            for (let i = 0; i < R - 1; i++) { hBord.push([]); for (let j = 0; j < C; j++) hBord[i].push(r[i * C + j] !== r[(i + 1) * C + j]); }
            for (let i = 0; i < R; i++) { vBord.push([]); for (let j = 0; j < C - 1; j++) vBord[i].push(r[i * C + j] !== r[i * C + j + 1]); }
            return { hB: hBord, vB: vBord };
        }),
        timeout: out
    };
};
