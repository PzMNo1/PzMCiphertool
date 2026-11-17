(function () {
    // ── Solver (TypedArray + incremental constraint propagation) ──
    function solveChoconaBT(puzzle) {
        const R = puzzle.rows;
        const C = puzzle.cols;
        const gridClasses = puzzle.grid;
        const edgeState = puzzle.edgeState;

        const start = performance.now();
        let solutions = [];
        let timeoutFlag = false;

        const N = R * C;

        // 1. Build region map via BFS (respecting edgeState borders)
        const regionOf = new Int16Array(N).fill(-1);
        const regions = []; // { cells: [idx...], target: null|int }
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

                    if (gridClasses[cr][cc].clue !== null) {
                        target = gridClasses[cr][cc].clue;
                    }

                    // Try 4 neighbors
                    if (cr > 0 && !edgeState[`h_${cr}_${cc}`]) {
                        const ni = curr - C;
                        if (regionOf[ni] === -1) { regionOf[ni] = rid; queue.push(ni); }
                    }
                    if (cr < R - 1 && !edgeState[`h_${cr + 1}_${cc}`]) {
                        const ni = curr + C;
                        if (regionOf[ni] === -1) { regionOf[ni] = rid; queue.push(ni); }
                    }
                    if (cc > 0 && !edgeState[`v_${cr}_${cc - 1}`]) {
                        const ni = curr - 1;
                        if (regionOf[ni] === -1) { regionOf[ni] = rid; queue.push(ni); }
                    }
                    if (cc < C - 1 && !edgeState[`v_${cr}_${cc}`]) {
                        const ni = curr + 1;
                        if (regionOf[ni] === -1) { regionOf[ni] = rid; queue.push(ni); }
                    }
                }
                regions.push({ cells, target });
            }
        }

        // 2. Pre-compute per-region: cells sorted by scan-order, lastIdx for trigger
        const regionLastIdx = new Int32Array(regionCount);
        const regionCellCount = new Int16Array(regionCount);
        for (let rid = 0; rid < regionCount; rid++) {
            const cs = regions[rid].cells;
            regionCellCount[rid] = cs.length;
            let maxIdx = -1;
            for (let i = 0; i < cs.length; i++) {
                if (cs[i] > maxIdx) maxIdx = cs[i];
            }
            regionLastIdx[rid] = maxIdx;
        }

        // 3. Trigger map: at which linear index do we fully check which regions
        const triggers = new Array(N);
        for (let i = 0; i < N; i++) triggers[i] = [];
        for (let rid = 0; rid < regionCount; rid++) {
            if (regions[rid].target !== null) {
                triggers[regionLastIdx[rid]].push(rid);
            }
        }

        // 4. Incremental region shaded counts
        const regionBlacks = new Int16Array(regionCount);

        // 5. Remaining unvisited cells in each region (for feasibility pruning)
        const regionRemaining = new Int16Array(regionCount);
        for (let rid = 0; rid < regionCount; rid++) {
            regionRemaining[rid] = regionCellCount[rid];
        }

        // 6. Flat grid for backtracking
        const g = new Int8Array(N); // 0=white, 1=black

        function check2x2(idx) {
            const r = (idx / C) | 0, c = idx - r * C;
            if (r > 0 && c > 0) {
                const s = g[idx - C - 1] + g[idx - C] + g[idx - 1] + g[idx];
                if (s === 3) return false;
            }
            if (r > 0 && c < C - 1) {
                const s = g[idx - C] + g[idx - C + 1] + g[idx] + g[idx + 1];
                if (s === 3) return false;
            }
            if (r < R - 1 && c > 0) {
                const s = g[idx - 1] + g[idx] + g[idx + C - 1] + g[idx + C];
                if (s === 3) return false;
            }
            if (r < R - 1 && c < C - 1) {
                const s = g[idx] + g[idx + 1] + g[idx + C] + g[idx + C + 1];
                if (s === 3) return false;
            }
            return true;
        }

        const bfsVisited = new Uint8Array(N);
        const bfsQueue = new Int32Array(N);

        function verifyRectangles() {
            bfsVisited.fill(0);
            for (let i = 0; i < N; i++) {
                if (g[i] === 1 && !bfsVisited[i]) {
                    let qH = 0, qT = 0;
                    bfsQueue[qT++] = i;
                    bfsVisited[i] = 1;
                    let minR = R, maxR = -1, minC = C, maxC = -1;
                    let size = 0;

                    while (qH < qT) {
                        const curr = bfsQueue[qH++];
                        size++;
                        const cr = (curr / C) | 0, cc = curr - cr * C;
                        if (cr < minR) minR = cr;
                        if (cr > maxR) maxR = cr;
                        if (cc < minC) minC = cc;
                        if (cc > maxC) maxC = cc;

                        if (cr > 0 && g[curr - C] === 1 && !bfsVisited[curr - C]) { bfsVisited[curr - C] = 1; bfsQueue[qT++] = curr - C; }
                        if (cr < R - 1 && g[curr + C] === 1 && !bfsVisited[curr + C]) { bfsVisited[curr + C] = 1; bfsQueue[qT++] = curr + C; }
                        if (cc > 0 && g[curr - 1] === 1 && !bfsVisited[curr - 1]) { bfsVisited[curr - 1] = 1; bfsQueue[qT++] = curr - 1; }
                        if (cc < C - 1 && g[curr + 1] === 1 && !bfsVisited[curr + 1]) { bfsVisited[curr + 1] = 1; bfsQueue[qT++] = curr + 1; }
                    }

                    const area = (maxR - minR + 1) * (maxC - minC + 1);
                    if (size !== area) return false;
                }
            }
            return true;
        }

        function bt(idx) {
            if (timeoutFlag) return false;
            if ((idx & 0xFF) === 0 && performance.now() - start > 4000) {
                timeoutFlag = true;
                return false;
            }
            if (solutions.length >= 10) return true;
            
            if (idx === N) {
                if (!verifyRectangles()) return false;
                solutions.push(Int8Array.from(g));
                return solutions.length >= 10;
            }

            const rid = regionOf[idx];
            regionRemaining[rid]--;

            for (let t = 1; t >= 0; t--) {
                g[idx] = t;

                if (t === 1) {
                    regionBlacks[rid]++;
                    if (regions[rid].target !== null && regionBlacks[rid] > regions[rid].target) {
                        regionBlacks[rid]--;
                        continue;
                    }
                    if (!check2x2(idx)) {
                        regionBlacks[rid]--;
                        continue;
                    }
                }

                let pruned = false;
                if (t === 0 && regions[rid].target !== null) {
                    if (regionBlacks[rid] + regionRemaining[rid] < regions[rid].target) {
                        pruned = true;
                    }
                }

                if (!pruned) {
                    const trigs = triggers[idx];
                    for (let ti = 0; ti < trigs.length; ti++) {
                        const trid = trigs[ti];
                        if (regionBlacks[trid] !== regions[trid].target) {
                            pruned = true;
                            break;
                        }
                    }
                }

                if (!pruned) {
                    if (bt(idx + 1)) {
                        if (t === 1) regionBlacks[rid]--;
                        g[idx] = 0;
                        regionRemaining[rid]++;
                        return true;
                    }
                }

                if (t === 1) regionBlacks[rid]--;
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

    // Expose global interfaces
    window.solveChocona = solveChoconaBT;
})();
