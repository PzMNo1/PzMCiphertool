(function () {
    // -------------------------------------------------------------
    // CORE SOLVER LOGIC
    // -------------------------------------------------------------
    
    function generateAquariumRegions(aquariumRows, aquariumCols, aquariumHBorders, aquariumVBorders) {
        const visited = Array(aquariumRows).fill(0).map(() => Array(aquariumCols).fill(false));
        const regions = [];
        let regionId = 0;

        for (let r = 0; r < aquariumRows; r++) {
            for (let c = 0; c < aquariumCols; c++) {
                if (!visited[r][c]) {
                    const cells = [];
                    const stack = [[r, c]];
                    visited[r][c] = true;
                    let minR = r, maxR = r;

                    while (stack.length) {
                        const [cr, cc] = stack.pop();
                        cells.push({r: cr, c: cc});
                        minR = Math.min(minR, cr);
                        maxR = Math.max(maxR, cr);

                        // up
                        if (cr > 0 && !aquariumHBorders[cr-1][cc] && !visited[cr-1][cc]) {
                            visited[cr-1][cc] = true; stack.push([cr-1, cc]);
                        }
                        // down (hBorders[cr] means border below cr)
                        if (cr < aquariumRows-1 && !aquariumHBorders[cr][cc] && !visited[cr+1][cc]) {
                            visited[cr+1][cc] = true; stack.push([cr+1, cc]);
                        }
                        // left
                        if (cc > 0 && !aquariumVBorders[cr][cc-1] && !visited[cr][cc-1]) {
                            visited[cr][cc-1] = true; stack.push([cr, cc-1]);
                        }
                        // right
                        if (cc < aquariumCols-1 && !aquariumVBorders[cr][cc] && !visited[cr][cc+1]) {
                            visited[cr][cc+1] = true; stack.push([cr, cc+1]);
                        }
                    }
                    regions.push({
                        id: regionId++,
                        cells,
                        maxR,
                        height: maxR - minR + 1
                    });
                }
            }
        }
        return regions;
    }

    function solveAquariumBT(puzzle) {
        const aquariumRows = puzzle.rows;
        const aquariumCols = puzzle.cols;
        const finalRowClues = puzzle.rowClues;
        const finalColClues = puzzle.colClues;
        
        const regions = generateAquariumRegions(aquariumRows, aquariumCols, puzzle.hBorders, puzzle.vBorders);

        const currR = Array(aquariumRows).fill(0);
        const currC = Array(aquariumCols).fill(0);
        const regionLevels = Array(regions.length).fill(0);
        
        const maxSolutions = 10;
        const solutions = []; 

        function solve(idx) {
            if (solutions.length >= maxSolutions) return;

            if (idx === regions.length) {
                // strict check bounds
                for(let i=0; i<aquariumRows; i++) if(finalRowClues[i] !== -1 && currR[i] !== finalRowClues[i]) return;
                for(let i=0; i<aquariumCols; i++) if(finalColClues[i] !== -1 && currC[i] !== finalColClues[i]) return;
                
                solutions.push([...regionLevels]);
                return;
            }

            const region = regions[idx];
            
            for (let lvl = 0; lvl <= region.height; lvl++) {
                if (solutions.length >= maxSolutions) break;

                const waterTopRow = region.maxR - lvl + 1;
                const addedR = {}, addedC = {};
                let possible = true;

                for (const cell of region.cells) {
                    if (cell.r >= waterTopRow) {
                        const nr = cell.r, nc = cell.c;
                        
                        addedR[nr] = (addedR[nr] || 0) + 1;
                        if (finalRowClues[nr] !== -1 && currR[nr] + addedR[nr] > finalRowClues[nr]) {
                            possible = false; break;
                        }
                        
                        addedC[nc] = (addedC[nc] || 0) + 1;
                        if (finalColClues[nc] !== -1 && currC[nc] + addedC[nc] > finalColClues[nc]) {
                            possible = false; break;
                        }
                    }
                }

                if (!possible) continue;

                for(let r in addedR) currR[r] += addedR[r];
                for(let c in addedC) currC[c] += addedC[c];
                regionLevels[idx] = lvl;

                solve(idx+1);

                for(let r in addedR) currR[r] -= addedR[r];
                for(let c in addedC) currC[c] -= addedC[c];
            }
        }

        solve(0);
        return { solutions, regions };
    }

    // ------------------------------------------------------------------
    // API Export
    // ------------------------------------------------------------------
    window.solveAquarium = solveAquariumBT;

})();