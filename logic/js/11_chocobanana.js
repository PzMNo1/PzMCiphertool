(function () {
    // ── Solver ──
    function solveChocobananaBT(puzzle) {
        const R = puzzle.rows;
        const C = puzzle.cols;
        const gridClasses = puzzle.grid;

        const start = performance.now();
        let solutions = [];
        let timeoutFlag = false;

        const N = R * C;
        const g = new Int8Array(N);
        const clues = new Int8Array(N);
        
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (gridClasses[r][c].clue !== null) clues[r * C + c] = gridClasses[r][c].clue;
            }
        }

        const queue = new Int32Array(N);
        const visited = new Uint8Array(N);
        const stepVis = new Uint8Array(N);

        // Check Exactly-3 2x2 local rule (Choco)
        function check2x2Fast(r, c) {
            if (r < 0 || r >= R - 1 || c < 0 || c >= C - 1) return true;
            const c1 = g[r * C + c], c2 = g[r * C + c + 1];
            const c3 = g[(r + 1) * C + c], c4 = g[(r + 1) * C + c + 1];
            let choco = 0, banana = 0;
            if (c1 === 1) choco++; else if (c1 === 2) banana++;
            if (c2 === 1) choco++; else if (c2 === 2) banana++;
            if (c3 === 1) choco++; else if (c3 === 2) banana++;
            if (c4 === 1) choco++; else if (c4 === 2) banana++;
            // Exactly 3 chocos and 1 banana -> Inner L-shape (Violates Choco rectangle rule)
            if (choco === 3 && banana === 1) return false;
            return true;
        }

        function checkComp(startIdx) {
            const val = g[startIdx];
            let qH = 0, qT = 0;
            queue[qT++] = startIdx;
            visited[startIdx] = 1;
            stepVis[startIdx] = 1;
            
            let size = 0;
            let clueVal = -1;
            let minR = R, maxR = -1;
            let minC = C, maxC = -1;
            let open = false;
            
            while (qH < qT) {
                const curr = queue[qH++];
                size++;
                const r = (curr / C) | 0;
                const c = curr - r * C; // faster mod
                if (r < minR) minR = r;
                if (r > maxR) maxR = r;
                if (c < minC) minC = c;
                if (c > maxC) maxC = c;

                if (clues[curr] > 0) {
                    if (clueVal === -1) clueVal = clues[curr];
                    else if (clueVal !== clues[curr]) return false; // Conflicting clues in same region
                }

                // Neighbors
                const u = curr - C, d = curr + C, l = curr - 1, lr = curr + 1;
                if (r > 0) {
                    if (g[u] === 0) open = true;
                    else if (g[u] === val && !visited[u]) { visited[u] = 1; stepVis[u] = 1; queue[qT++] = u; }
                }
                if (r < R - 1) {
                    if (g[d] === 0) open = true;
                    else if (g[d] === val && !visited[d]) { visited[d] = 1; stepVis[d] = 1; queue[qT++] = d; }
                }
                if (c > 0) {
                    if (g[l] === 0) open = true;
                    else if (g[l] === val && !visited[l]) { visited[l] = 1; stepVis[l] = 1; queue[qT++] = l; }
                }
                if (c < C - 1) {
                    if (g[lr] === 0) open = true;
                    else if (g[lr] === val && !visited[lr]) { visited[lr] = 1; stepVis[lr] = 1; queue[qT++] = lr; }
                }
            }

            // Reset visited for subsequent component checks
            for (let i = 0; i < qT; i++) visited[queue[i]] = 0;

            if (clueVal !== -1) {
                // Region exceeds its clue
                if (size > clueVal) return false;
                // Region is closed and size mismatches
                if (!open && size !== clueVal) return false;
            }

            if (!open) {
                const area = (maxR - minR + 1) * (maxC - minC + 1);
                // Banana (2) must NOT be a rectangle
                if (val === 2 && size === area) return false;
                // Choco (1) MUST be a rectangle (Size = Area)
                if (val === 1 && size !== area) return false;
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
                solutions.push(Array.from(g));
                return solutions.length >= 10;
            }

            const r = (idx / C) | 0, c = idx - r * C;

            for (let t = 1; t <= 2; t++) {
                g[idx] = t;
                
                // 1. Local 2x2 checks
                if (!check2x2Fast(r - 1, c - 1) || 
                    !check2x2Fast(r - 1, c) || 
                    !check2x2Fast(r, c - 1) || 
                    !check2x2Fast(r, c)) {
                    continue;
                }

                // 2. Component Pruning
                stepVis.fill(0);
                
                let pruned = false;
                if (!checkComp(idx)) {
                    pruned = true;
                } else {
                    const u = idx - C, d = idx + C, l = idx - 1, lr = idx + 1;
                    if (r > 0 && g[u] && !stepVis[u]) { if (!checkComp(u)) pruned = true; }
                    if (!pruned && r < R - 1 && g[d] && !stepVis[d]) { if (!checkComp(d)) pruned = true; }
                    if (!pruned && c > 0 && g[l] && !stepVis[l]) { if (!checkComp(l)) pruned = true; }
                    if (!pruned && c < C - 1 && g[lr] && !stepVis[lr]) { if (!checkComp(lr)) pruned = true; }
                }

                if (!pruned) {
                    if (bt(idx + 1)) {
                        g[idx] = 0;
                        return true;
                    }
                }
            }

            g[idx] = 0;
            return false;
        }

        bt(0);

        return {
            solutions: solutions,
            timeout: timeoutFlag
        };
    }

    // Export required globals
    window.solveChocobanana = solveChocobananaBT;
})();
