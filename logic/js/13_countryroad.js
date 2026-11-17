(function () {
    // ── Solver ─────────────────────────────────────────────
    function solveCountryroadBT(puzzle) {
        const R = puzzle.rows;
        const C = puzzle.cols;
        const gridClasses = puzzle.grid;
        const edgeState = puzzle.edgeState;

        const start = performance.now();
        let solutions = [];
        let timeoutFlag = false;

        const N = R * C;

        // 1. Build region map via BFS
        const regionOf = new Int16Array(N).fill(-1);
        const regions = [];
        let regionCount = 0;

        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                const idx = r * C + c;
                if (regionOf[idx] !== -1) continue;
                const rid = regionCount++;
                const queue = [idx];
                regionOf[idx] = rid;
                const cells = [];
                let target = null;
                let qH = 0;

                while (qH < queue.length) {
                    const curr = queue[qH++];
                    cells.push(curr);
                    const cr = (curr / C) | 0, cc = curr - cr * C;
                    if (gridClasses[cr][cc].clue !== null) target = gridClasses[cr][cc].clue;

                    // Up
                    if (cr > 0 && !edgeState[`h_${cr}_${cc}`]) {
                        const ni = curr - C;
                        if (regionOf[ni] === -1) { regionOf[ni] = rid; queue.push(ni); }
                    }
                    // Down
                    if (cr < R - 1 && !edgeState[`h_${cr + 1}_${cc}`]) {
                        const ni = curr + C;
                        if (regionOf[ni] === -1) { regionOf[ni] = rid; queue.push(ni); }
                    }
                    // Left
                    if (cc > 0 && !edgeState[`v_${cr}_${cc - 1}`]) {
                        const ni = curr - 1;
                        if (regionOf[ni] === -1) { regionOf[ni] = rid; queue.push(ni); }
                    }
                    // Right
                    if (cc < C - 1 && !edgeState[`v_${cr}_${cc}`]) {
                        const ni = curr + 1;
                        if (regionOf[ni] === -1) { regionOf[ni] = rid; queue.push(ni); }
                    }
                }
                regions.push({ cells, target });
            }
        }

        // 2. Pre-compute per-region metadata
        const regionLastIdx = new Int32Array(regionCount);
        const regionCellCount = new Int16Array(regionCount);
        for (let rid = 0; rid < regionCount; rid++) {
            const cs = regions[rid].cells;
            regionCellCount[rid] = cs.length;
            let maxIdx = -1;
            for (let i = 0; i < cs.length; i++) if (cs[i] > maxIdx) maxIdx = cs[i];
            regionLastIdx[rid] = maxIdx;
        }

        // 3. Trigger map — at the last cell of a region we check its target
        const triggers = new Array(N);
        for (let i = 0; i < N; i++) triggers[i] = [];
        for (let rid = 0; rid < regionCount; rid++) {
            triggers[regionLastIdx[rid]].push(rid);
        }

        // 4. Incremental state
        const regionLoopCount = new Int16Array(regionCount);   // # loop cells per region
        const regionRemaining = new Int16Array(regionCount);   // # unvisited cells
        for (let rid = 0; rid < regionCount; rid++) regionRemaining[rid] = regionCellCount[rid];
        const regionCrossings = new Int16Array(regionCount);   // boundary crossings

        // 5. DSU for loop connectivity (rollback-friendly)
        const parent = new Int32Array(N).fill(-1);
        function find(i) { let r = i; while (parent[r] >= 0) r = parent[r]; return r; }

        // 6. Grid: 0=empty, 1=loop
        const g = new Int8Array(N);

        // Track total loop cells
        let totalLoopCells = 0;

        // Neighbor offsets for degree checking
        const DR = [-1, 0, 1, 0];
        const DC = [0, 1, 0, -1];

        function bt(idx) {
            if (timeoutFlag) return false;
            if ((idx & 0xFF) === 0 && performance.now() - start > 4000) {
                timeoutFlag = true;
                return false;
            }
            if (solutions.length >= 10) return true;

            if (idx === N) {
                // Final validation
                // 1. Must have loop cells
                if (totalLoopCells === 0) return false;
                // 2. Single connected component
                let compRoot = -1;
                for (let i = 0; i < N; i++) {
                    if (g[i] === 1) {
                        const rt = find(i);
                        if (compRoot === -1) compRoot = rt;
                        else if (rt !== compRoot) return false;
                    }
                }
                // 3. Each loop cell must have exactly degree 2
                for (let i = 0; i < N; i++) {
                    if (g[i] !== 1) continue;
                    const ir = (i / C) | 0, ic = i - ir * C;
                    let deg = 0;
                    for (let d = 0; d < 4; d++) {
                        const nr = ir + DR[d], nc = ic + DC[d];
                        if (nr >= 0 && nr < R && nc >= 0 && nc < C && g[nr * C + nc] === 1) deg++;
                    }
                    if (deg !== 2) return false;
                }
                // 4. Every region must be visited
                for (let rid = 0; rid < regionCount; rid++) {
                    if (regionLoopCount[rid] === 0) return false;
                    if (regions[rid].target !== null && regionLoopCount[rid] !== regions[rid].target) return false;
                    // No re-entrance: crossings must == 2 (enter + leave) if more than 1 region
                    if (regionCount > 1 && regionCrossings[rid] !== 2) return false;
                }

                // Store solution as 2D for rendering (1=loop, 0=empty)
                const sol = [];
                for (let r = 0; r < R; r++) {
                    const row = [];
                    for (let c = 0; c < C; c++) row.push(g[r * C + c]);
                    sol.push(row);
                }
                solutions.push(sol);
                return solutions.length >= 10;
            }

            const r = (idx / C) | 0, c = idx - r * C;
            const rid = regionOf[idx];
            regionRemaining[rid]--;

            for (let val = 1; val >= 0; val--) {
                g[idx] = val;

                // ─── Constraint checks ───

                // A) For loop cell (val=1)
                if (val === 1) {
                    regionLoopCount[rid]++;
                    totalLoopCells++;

                    // Region clue overflow
                    if (regions[rid].target !== null && regionLoopCount[rid] > regions[rid].target) {
                        regionLoopCount[rid]--; totalLoopCells--;
                        continue;
                    }

                    if (r > 0 && g[(r - 1) * C + c] === 1) {
                        let deg = 0;
                        const pr = r - 1;
                        if (pr > 0 && g[(pr - 1) * C + c] === 1) deg++;
                        if (c > 0 && g[pr * C + c - 1] === 1) deg++;
                        if (c < C - 1 && g[pr * C + c + 1] === 1) deg++;
                        if (g[idx] === 1) deg++; // down = current cell
                        if (deg > 2) { regionLoopCount[rid]--; totalLoopCells--; continue; }
                    }
                }

                // B) For empty cell (val=0): Cross-border isolation ban
                if (val === 0) {
                    let isolated = false;
                    // Up
                    if (r > 0 && g[(r - 1) * C + c] === 0 && regionOf[(r - 1) * C + c] !== rid) isolated = true;
                    // Left
                    if (!isolated && c > 0 && g[r * C + c - 1] === 0 && regionOf[r * C + c - 1] !== rid) isolated = true;
                    if (isolated) {
                        g[idx] = 0;
                        regionRemaining[rid]++;
                        continue; // try next val — but val=0 is last, so break
                    }
                }

                // C) Feasibility: can remaining cells still reach target?
                let pruned = false;
                if (val === 0 && regions[rid].target !== null) {
                    if (regionLoopCount[rid] + regionRemaining[rid] < regions[rid].target) pruned = true;
                }

                // D) DSU + boundary crossings (only for loop cells)
                let dsuRollback = [];
                let crossRollback = [];
                let cycleFormed = false;

                if (!pruned && val === 1) {
                    // Connect to up neighbour
                    if (r > 0 && g[(r - 1) * C + c] === 1) {
                        if (regionOf[(r - 1) * C + c] !== rid) {
                            crossRollback.push([rid, regionCrossings[rid]]);
                            crossRollback.push([regionOf[(r - 1) * C + c], regionCrossings[regionOf[(r - 1) * C + c]]]);
                            regionCrossings[rid]++;
                            regionCrossings[regionOf[(r - 1) * C + c]]++;
                        }
                        const rA = find(idx), rB = find((r - 1) * C + c);
                        if (rA !== rB) {
                            if (parent[rA] < parent[rB]) {
                                dsuRollback.push([rA, parent[rA]], [rB, parent[rB]]);
                                parent[rA] += parent[rB]; parent[rB] = rA;
                            } else {
                                dsuRollback.push([rB, parent[rB]], [rA, parent[rA]]);
                                parent[rB] += parent[rA]; parent[rA] = rB;
                            }
                        } else {
                            cycleFormed = true;
                        }
                    }
                    // Connect to left neighbour
                    if (c > 0 && g[r * C + c - 1] === 1) {
                        if (regionOf[r * C + c - 1] !== rid) {
                            crossRollback.push([rid, regionCrossings[rid]]);
                            crossRollback.push([regionOf[r * C + c - 1], regionCrossings[regionOf[r * C + c - 1]]]);
                            regionCrossings[rid]++;
                            regionCrossings[regionOf[r * C + c - 1]]++;
                        }
                        const rA = find(idx), rB = find(r * C + c - 1);
                        if (rA !== rB) {
                            if (parent[rA] < parent[rB]) {
                                dsuRollback.push([rA, parent[rA]], [rB, parent[rB]]);
                                parent[rA] += parent[rB]; parent[rB] = rA;
                            } else {
                                dsuRollback.push([rB, parent[rB]], [rA, parent[rA]]);
                                parent[rB] += parent[rA]; parent[rA] = rB;
                            }
                        } else {
                            cycleFormed = true;
                        }
                    }

                    // Prune: boundary crossings > 2
                    if (regionCount > 1) {
                        if (regionCrossings[rid] > 2) pruned = true;
                        if (!pruned && r > 0 && regionOf[(r - 1) * C + c] !== rid && regionCrossings[regionOf[(r - 1) * C + c]] > 2) pruned = true;
                        if (!pruned && c > 0 && regionOf[r * C + c - 1] !== rid && regionCrossings[regionOf[r * C + c - 1]] > 2) pruned = true;
                    }

                    // Prune: premature cycle
                    if (!pruned && cycleFormed) {
                        const root = find(idx);
                        const compSize = -parent[root];
                        if (compSize !== totalLoopCells) pruned = true;
                    }
                }

                // E) Trigger: all cells in region assigned — check target exact match
                if (!pruned) {
                    const trigs = triggers[idx];
                    for (let ti = 0; ti < trigs.length; ti++) {
                        const trid = trigs[ti];
                        if (regions[trid].target !== null && regionLoopCount[trid] !== regions[trid].target) {
                            pruned = true; break;
                        }
                    }
                }

                // F) Region fully assigned — must be visited
                if (!pruned) {
                    const trigs = triggers[idx];
                    for (let ti = 0; ti < trigs.length; ti++) {
                        const trid = trigs[ti];
                        if (regionLoopCount[trid] === 0) { pruned = true; break; }
                    }
                }

                if (!pruned) {
                    if (bt(idx + 1)) {
                        // Undo & return
                        if (val === 1) { regionLoopCount[rid]--; totalLoopCells--; }
                        while (dsuRollback.length > 0) { const [i, v] = dsuRollback.pop(); parent[i] = v; }
                        while (crossRollback.length > 0) { const [i, v] = crossRollback.pop(); regionCrossings[i] = v; }
                        g[idx] = 0;
                        regionRemaining[rid]++;
                        return true;
                    }
                }

                // Rollback
                if (val === 1) { regionLoopCount[rid]--; totalLoopCells--; }
                while (dsuRollback.length > 0) { const [i, v] = dsuRollback.pop(); parent[i] = v; }
                while (crossRollback.length > 0) { const [i, v] = crossRollback.pop(); regionCrossings[i] = v; }
            }

            g[idx] = 0;
            regionRemaining[rid]++;
            return false;
        }

        bt(0);

        return {
            solutions: solutions,
            timeout: timeoutFlag
        };
    }

    // Export module
    window.solveCountryroad = solveCountryroadBT;
})();
