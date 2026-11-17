/* logic/js/16_fillomino.js — Fillomino Solver v4 (IIFE, DOM-free, optimised) */
(function () {
    'use strict';

    window.solveFillomino = function (puzzle) {
        const R = puzzle.R || puzzle.rows;
        const C = puzzle.C || puzzle.cols;
        const N = R * C;
        const gridData = puzzle.grid;
        const startTime = performance.now();
        const TIMEOUT_MS = 5000;
        const MAX_SOLUTIONS = 5;
        let timedOut = false;
        const grid = new Int32Array(N);
        const fixed = new Uint8Array(N);

        let maxClue = 0;
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const v = gridData[r][c].value;
                if (v !== null && v > 0) {
                    const i = r * C + c;
                    grid[i] = v;
                    fixed[i] = 1;
                    if (v > maxClue) maxClue = v;
                }
            }
        }
        const maxVal = Math.max(maxClue, Math.min(N, 9));
        const adj = new Array(N);
        for (let i = 0; i < N; i++) {
            const r = (i / C) | 0, c2 = i % C, a = [];
            if (r > 0) a.push(i - C);
            if (c2 < C - 1) a.push(i + 1);
            if (r < R - 1) a.push(i + C);
            if (c2 > 0) a.push(i - 1);
            adj[i] = a;
        }
        const par = new Int32Array(N).fill(-1);

        function find(x) { while (par[x] >= 0) x = par[x]; return x; }

        function unionRec(a, b) {
            let ra = find(a), rb = find(b);
            if (ra === rb) return null;
            if (par[ra] > par[rb]) { const t = ra; ra = rb; rb = t; }
            const oa = par[ra], ob = par[rb];
            par[ra] += par[rb];
            par[rb] = ra;
            return [rb, ra, ob, oa];
        }

        function undoUnion(rec) {
            par[rec[1]] = rec[3];
            par[rec[0]] = rec[2];
        }
        const vis = new Int32Array(N);
        let gen = 0;
        function canReachSize(startCell, targetVal, curSize) {
            if (curSize > targetVal) return false;
            if (curSize === targetVal) return true;
            const needed = targetVal - curSize;
            const rootId = find(startCell);
            const g = ++gen;
            const comp = [startCell];
            vis[startCell] = g;
            let ci = 0;
            while (ci < comp.length) {
                const nb = adj[comp[ci++]];
                for (let k = 0, kl = nb.length; k < kl; k++) {
                    const ni = nb[k];
                    if (vis[ni] === g) continue;
                    if (grid[ni] === targetVal && find(ni) === rootId) {
                        vis[ni] = g;
                        comp.push(ni);
                    }
                }
            }
            let count = 0;
            const q = [];

            // Seed from component boundary
            for (let i = 0, il = comp.length; i < il; i++) {
                const nb = adj[comp[i]];
                for (let k = 0, kl = nb.length; k < kl; k++) {
                    const ni = nb[k];
                    if (vis[ni] === g) continue;
                    vis[ni] = g;
                    const nv = grid[ni];
                    if (nv === 0 || (nv === targetVal)) {
                        if (++count >= needed) return true;
                        q.push(ni);
                    }
                }
            }
            let head = 0;
            while (head < q.length) {
                const nb = adj[q[head++]];
                for (let k = 0, kl = nb.length; k < kl; k++) {
                    const ni = nb[k];
                    if (vis[ni] === g) continue;
                    vis[ni] = g;
                    const nv = grid[ni];
                    if (nv === 0 || nv === targetVal) {
                        if (++count >= needed) return true;
                        q.push(ni);
                    }
                }
            }
            return false;
        }

        /* ── solutions ── */
        const solutions = [];
        let ticks = 0;

        /* ── main backtracker ── */
        function solve(idx) {
            if (solutions.length >= MAX_SOLUTIONS || timedOut) return;
            if ((++ticks & 4095) === 0 && performance.now() - startTime > TIMEOUT_MS) {
                timedOut = true; return;
            }

            if (idx === N) {
                for (let i = 0; i < N; i++) {
                    if (par[i] < 0 && -par[i] !== grid[i]) return;
                }
                const sol = [];
                for (let r = 0; r < R; r++) {
                    const row = new Array(C);
                    for (let c2 = 0; c2 < C; c2++) row[c2] = grid[r * C + c2];
                    sol.push(row);
                }
                solutions.push(sol);
                return;
            }

            const r = (idx / C) | 0, c = idx % C;

            /* ── build candidates ── */
            let candidates;
            if (fixed[idx]) {
                candidates = [grid[idx]];
            } else {
                // Check ALL 4 neighbours for complete-group exclusion
                const excluded = new Uint8Array(maxVal + 1);
                const preferred = [];
                const prefSeen = new Uint8Array(maxVal + 1);
                const nb = adj[idx];
                for (let k = 0, kl = nb.length; k < kl; k++) {
                    const ni = nb[k];
                    const nv = grid[ni];
                    if (nv <= 0 || nv > maxVal) continue;
                    const root = find(ni);
                    const sz = -par[root];
                    if (sz >= nv) {
                        excluded[nv] = 1;
                    } else if (!excluded[nv] && !prefSeen[nv]) {
                        prefSeen[nv] = 1;
                        preferred.push(nv);
                    }
                }

                candidates = [];
                for (let i = 0; i < preferred.length; i++) {
                    if (!excluded[preferred[i]]) candidates.push(preferred[i]);
                }
                for (let v = 1; v <= maxVal; v++) {
                    if (!excluded[v] && !prefSeen[v]) candidates.push(v);
                }
            }

            for (let ci = 0, cl = candidates.length; ci < cl; ci++) {
                const val = candidates[ci];

                grid[idx] = val;
                par[idx] = -1;

                const undos = [];
                let valid = true;

                /* union with same-value above */
                if (r > 0 && grid[idx - C] === val) {
                    const rec = unionRec(idx, idx - C);
                    if (rec) undos.push(rec);
                    if (-par[find(idx)] > val) valid = false;
                }
                /* union with same-value left */
                if (valid && c > 0 && grid[idx - 1] === val) {
                    const rec = unionRec(idx, idx - 1);
                    if (rec) undos.push(rec);
                    if (-par[find(idx)] > val) valid = false;
                }

                /* current component reachability */
                if (valid) {
                    const root = find(idx);
                    const sz = -par[root];
                    if (sz > val) valid = false;
                    else if (sz < val && !canReachSize(idx, val, sz)) valid = false;
                }

                /* above component (different value) sealed? */
                if (valid && r > 0 && grid[idx - C] > 0 && grid[idx - C] !== val) {
                    const upRoot = find(idx - C);
                    const upSz = -par[upRoot];
                    const upVal = grid[idx - C];
                    if (upSz > upVal) valid = false;
                    else if (upSz < upVal && !canReachSize(idx - C, upVal, upSz)) valid = false;
                }

                /* left component (different value) sealed? */
                if (valid && c > 0 && grid[idx - 1] > 0 && grid[idx - 1] !== val) {
                    const leftRoot = find(idx - 1);
                    let skip = false;
                    if (r > 0 && grid[idx - C] > 0 && grid[idx - C] !== val && find(idx - C) === leftRoot) skip = true;
                    if (!skip) {
                        const lSz = -par[leftRoot];
                        const lVal = grid[idx - 1];
                        if (lSz > lVal) valid = false;
                        else if (lSz < lVal && !canReachSize(idx - 1, lVal, lSz)) valid = false;
                    }
                }

                if (valid) solve(idx + 1);

                for (let u = undos.length - 1; u >= 0; u--) undoUnion(undos[u]);
                if (!fixed[idx]) grid[idx] = 0;
                par[idx] = -1;

                if (solutions.length >= MAX_SOLUTIONS || timedOut) return;
            }
        }

        solve(0);
        return { solutions, timeout: timedOut };
    };
})();
