(function() {
    window.solveHashi = function(puzzle) {
        const startTime = performance.now();
        const timeoutLimit = 3500;
        let isTimeout = false;

        const R = puzzle.rows || puzzle.R;
        const C = puzzle.cols || puzzle.C;
        const grid = puzzle.grid; 
        const maxSolutions = 5;

        const islands = [];
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (grid[r][c] !== null) {
                    islands.push({r, c, val: grid[r][c], current: 0, id: islands.length});
                }
            }
        }

        if (islands.length === 0) {
            return { solutions: [], timeout: false, error: "No islands found" };
        }

        const edges = []; 

        for(let r=0; r<R; r++) {
            let lastIslandIdx = -1;
            for(let c=0; c<C; c++) {
                if (grid[r][c] !== null) {
                    const currIdx = islands.findIndex(i => i.r === r && i.c === c);
                    if (lastIslandIdx !== -1) {
                        edges.push({u: lastIslandIdx, v: currIdx, type: 'h', count: 0}); 
                    }
                    lastIslandIdx = currIdx;
                }
            }
        }

        for(let c=0; c<C; c++) {
            let lastIslandIdx = -1;
            for(let r=0; r<R; r++) {
                if (grid[r][c] !== null) {
                    const currIdx = islands.findIndex(i => i.r === r && i.c === c);
                    if (lastIslandIdx !== -1) {
                        edges.push({u: lastIslandIdx, v: currIdx, type: 'v', count: 0}); 
                    }
                    lastIslandIdx = currIdx;
                }
            }
        }

        const crossingPairs = [];
        for(let i=0; i<edges.length; i++) {
            for(let j=i+1; j<edges.length; j++) {
                const e1 = edges[i];
                const e2 = edges[j];
                if (e1.type !== e2.type) {
                    const h = e1.type === 'h' ? e1 : e2;
                    const v = e1.type === 'v' ? e1 : e2;
                    const h_r = islands[h.u].r;
                    const h_c1 = islands[h.u].c;
                    const h_c2 = islands[h.v].c;
                    
                    const v_c = islands[v.u].c;
                    const v_r1 = islands[v.u].r;
                    const v_r2 = islands[v.v].r;
                    
                    if (v_r1 < h_r && h_r < v_r2 && h_c1 < v_c && v_c < h_c2) {
                        crossingPairs.push([i, j]);
                    }
                }
            }
        }

        const solutions = [];
        const parent = new Int32Array(islands.length).fill(-1);

        function find(i) {
            let root = i;
            while(parent[root] >= 0) root = parent[root];
            return root;
        }

        let edgeCount = 0;

        function solve2(idx) {
            if (isTimeout || solutions.length >= maxSolutions) return;

            edgeCount++;
            if (edgeCount % 1000 === 0 && performance.now() - startTime > timeoutLimit) {
                isTimeout = true;
                return;
            }

            if (idx === edges.length) {
                let root = find(0);
                if (-parent[root] !== islands.length) return;

                for(let i=0; i<islands.length; i++) {
                    if (islands[i].current !== islands[i].val) return;
                }

                const sol = [];
                for(const e of edges) {
                    if (e.count > 0) {
                        sol.push({
                            r1: islands[e.u].r, c1: islands[e.u].c,
                            r2: islands[e.v].r, c2: islands[e.v].c,
                            count: e.count
                        });
                    }
                }
                solutions.push(sol);
                return;
            }

            const edge = edges[idx];
            let blocked = false;

            for(const pair of crossingPairs) {
                let otherIdx = -1;
                if (pair[0] === idx) otherIdx = pair[1];
                else if (pair[1] === idx) otherIdx = pair[0];
                
                if (otherIdx !== -1 && otherIdx < idx) {
                    if (edges[otherIdx].count > 0) {
                        blocked = true; break;
                    }
                }
            }

            let possible = [0];
            if (!blocked) {
                const uRem = islands[edge.u].val - islands[edge.u].current;
                const vRem = islands[edge.v].val - islands[edge.v].current;
                const maxBridges = Math.min(2, uRem, vRem);
                for(let k=1; k<=maxBridges; k++) possible.push(k);
            }
            possible.reverse();

            for(const cnt of possible) {
                edge.count = cnt;
                islands[edge.u].current += cnt;
                islands[edge.v].current += cnt;
                
                let dsuLog = null;
                if (cnt > 0) {
                    const rootI = find(edge.u);
                    const rootJ = find(edge.v);
                    if (rootI !== rootJ) {
                        if (parent[rootI] < parent[rootJ]) { 
                            dsuLog = {p: rootI, child: rootJ, oldVal: parent[rootJ]};
                            parent[rootI] += parent[rootJ];
                            parent[rootJ] = rootI;
                        } else {
                            dsuLog = {p: rootJ, child: rootI, oldVal: parent[rootI]};
                            parent[rootJ] += parent[rootI];
                            parent[rootI] = rootJ;
                        }
                    }
                }
                
                solve2(idx + 1);
                
                if (dsuLog) {
                    const {p, child, oldVal} = dsuLog;
                    parent[p] -= oldVal; 
                    parent[child] = oldVal; 
                }
                islands[edge.u].current -= cnt;
                islands[edge.v].current -= cnt;
                edge.count = 0;
            }
        }

        try {
            solve2(0);
        } catch(e) {
            console.error(e);
        }

        return {
            solutions: solutions,
            timeout: isTimeout
        };
    };
})();
