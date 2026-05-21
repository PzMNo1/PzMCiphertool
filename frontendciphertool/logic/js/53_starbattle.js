document.addEventListener('DOMContentLoaded', () => {
    const gridWrapper = document.getElementById('grid-wrapper');
    const rowsInput = document.getElementById('rows-input');
    const colsInput = document.getElementById('cols-input');
    const starsInput = document.getElementById('stars-input');
    const newGridBtn = document.getElementById('new-grid-btn');
    const modeBtns = {
        border: document.getElementById('mode-border'),
        play: document.getElementById('mode-play'),
        solve: document.getElementById('mode-solve'),
        reset: document.getElementById('mode-reset')
    };
    const message = document.getElementById('message');

    let R = 10, C = 10, STARS = 2;
    let grid = []; // {r, c, borders: {t,b,l,r}, val: 0(empty), 1(star), 2(cross)}
    let mode = 'border';

    initGame(R, C, STARS);

    newGridBtn.addEventListener('click', () => {
        const r = parseInt(rowsInput.value);
        const c = parseInt(colsInput.value);
        const s = parseInt(starsInput.value);
        if (r < 5 || c < 5 || r > 20 || c > 20) return alert('尺寸 5-20');
        initGame(r, c, s);
    });

    Object.keys(modeBtns).forEach(k => {
        modeBtns[k].addEventListener('click', () => setMode(k));
    });

    function setMode(m) {
        if (m === 'reset') {
            resetGame();
            return;
        }
        mode = m;
        Object.values(modeBtns).forEach(b => b.classList.remove('active'));
        modeBtns[m].classList.add('active');
        if (m === 'solve') solvePuzzle();
    }

    function initGame(r, c, s) {
        R = r; C = c; STARS = s;
        grid = Array(R).fill().map((_, i) => Array(C).fill().map((_, j) => ({
            r: i, c: j,
            borders: { t: i===0, b: i===R-1, l: j===0, r: j===C-1 },
            val: 0
        })));
        render();
    }

    function resetGame() {
        grid.forEach(row => row.forEach(cell => cell.val = 0));
        render();
        message.innerText = '已重置';
    }

    function render() {
        gridWrapper.innerHTML = '';
        gridWrapper.style.gridTemplateColumns = `repeat(${C}, 40px)`;
        
        for(let i=0; i<R; i++) {
            for(let j=0; j<C; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                const d = grid[i][j];
                
                if (d.borders.t) cell.classList.add('border-top');
                if (d.borders.b) cell.classList.add('border-bottom');
                if (d.borders.l) cell.classList.add('border-left');
                if (d.borders.r) cell.classList.add('border-right');
                
                if (d.val === 1) cell.classList.add('star');
                if (d.val === 2) cell.classList.add('cross');
                
                cell.addEventListener('click', (e) => handleCellClick(i, j, e));
                gridWrapper.appendChild(cell);
            }
        }
    }

    function handleCellClick(r, c, e) {
        if (mode === 'play') {
            const d = grid[r][c];
            d.val = (d.val + 1) % 3; // 0->1->2->0
            render();
        } else if (mode === 'border') {
            // Toggle border near click
            const cell = e.target;
            const rect = cell.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;
            const th = 10;

            if (y < th && r > 0) toggleBorder(r, c, 't');
            else if (y > h - th && r < R-1) toggleBorder(r, c, 'b');
            else if (x < th && c > 0) toggleBorder(r, c, 'l');
            else if (x > w - th && c < C-1) toggleBorder(r, c, 'r');
        }
    }

    function toggleBorder(r, c, side) {
        const d = grid[r][c];
        d.borders[side] = !d.borders[side];
        
        if (side === 't' && r > 0) grid[r-1][c].borders.b = d.borders[side];
        if (side === 'b' && r < R-1) grid[r+1][c].borders.t = d.borders[side];
        if (side === 'l' && c > 0) grid[r][c-1].borders.r = d.borders[side];
        if (side === 'r' && c < C-1) grid[r][c+1].borders.l = d.borders[side];
        
        render();
    }

    // --- SOLVER ---
    async function solvePuzzle() {
        message.innerText = '求解中...';
        
        // 1. Identify Regions
        const regions = identifyRegions();
        
        // 2. Prepare solver
        // Constraint: Each row, col, region has exactly STARS stars.
        // Constraint: No adjacent stars (8-neighbors).
        
        const cells = [];
        for(let i=0; i<R; i++) for(let j=0; j<C; j++) cells.push({r:i, c:j});
        
        const solGrid = Array(R).fill().map(() => Array(C).fill(0));
        
        // Pre-check region sizes
        for(const reg of regions) {
            if (reg.cells.length < STARS) {
                message.innerText = '区域太小，无法容纳星星';
                return;
            }
        }

        const solution = await runSolver(cells, solGrid, regions);
        
        if (solution) {
            grid.forEach((row, i) => row.forEach((cell, j) => cell.val = solution[i][j]));
            render();
            message.innerText = '求解成功！';
        } else {
            message.innerText = '无解。';
        }
    }

    function identifyRegions() {
        const visited = Array(R).fill().map(() => Array(C).fill(false));
        const regions = [];
        
        for(let i=0; i<R; i++) {
            for(let j=0; j<C; j++) {
                if (!visited[i][j]) {
                    const cells = [];
                    const q = [{r:i, c:j}];
                    visited[i][j] = true;
                    
                    while(q.length > 0) {
                        const p = q.shift();
                        cells.push(p);
                        
                        // Check neighbors based on borders
                        if (p.r > 0 && !grid[p.r][p.c].borders.t && !visited[p.r-1][p.c]) {
                            visited[p.r-1][p.c] = true; q.push({r:p.r-1, c:p.c});
                        }
                        if (p.r < R-1 && !grid[p.r][p.c].borders.b && !visited[p.r+1][p.c]) {
                            visited[p.r+1][p.c] = true; q.push({r:p.r+1, c:p.c});
                        }
                        if (p.c > 0 && !grid[p.r][p.c].borders.l && !visited[p.r][p.c-1]) {
                            visited[p.r][p.c-1] = true; q.push({r:p.r, c:p.c-1});
                        }
                        if (p.c < C-1 && !grid[p.r][p.c].borders.r && !visited[p.r][p.c+1]) {
                            visited[p.r][p.c+1] = true; q.push({r:p.r, c:p.c+1});
                        }
                    }
                    
                    // Map region id
                    const regId = regions.length;
                    regions.push({id: regId, cells: cells});
                }
            }
        }
        
        // Create Map
        const regionMap = Array(R).fill().map(() => Array(C).fill(-1));
        regions.forEach(reg => reg.cells.forEach(c => regionMap[c.r][c.c] = reg.id));
        return regions;
    }

    function runSolver(cells, solGrid, regions) {
        return new Promise(resolve => {
            
            // Arrays to track counts
            const rowCounts = Array(R).fill(0);
            const colCounts = Array(C).fill(0);
            const regCounts = Array(regions.length).fill(0);
            
            const regionMap = Array(R).fill().map(() => Array(C).fill(-1));
            regions.forEach(reg => reg.cells.forEach(c => regionMap[c.r][c.c] = reg.id));

            const backtrack = (idx) => {
                if (idx === cells.length) {
                    // Check if all counts exactly match STARS
                    return rowCounts.every(c => c === STARS) &&
                           colCounts.every(c => c === STARS) &&
                           regCounts.every(c => c === STARS) ? solGrid : null;
                }

                const {r, c} = cells[idx];
                const regId = regionMap[r][c];
                
                // Optimization: Pruning
                // If any count already exceeds STARS, stop
                // If remaining cells are not enough to reach STARS, stop (harder to track remaining)
                
                // Try placing Star (1)
                if (isValidPlacement(r, c)) {
                    solGrid[r][c] = 1;
                    rowCounts[r]++;
                    colCounts[c]++;
                    regCounts[regId]++;
                    
                    if (rowCounts[r] <= STARS && colCounts[c] <= STARS && regCounts[regId] <= STARS) {
                        const res = backtrack(idx + 1);
                        if (res) return res;
                    }
                    
                    // Backtrack
                    rowCounts[r]--;
                    colCounts[c]--;
                    regCounts[regId]--;
                    solGrid[r][c] = 0;
                }

                // Try Empty (0)
                // Pruning: If we skip this cell, can we still fill the row/col/region?
                // Simple pruning: check if remaining cells in row < needed
                // Count remaining empty cells? Expensive to calculate every time.
                // Let's just proceed.
                
                // Optimization: Check if row/col is finished?
                // If we are at end of row, and count != STARS, fail.
                if (c === C-1 && rowCounts[r] !== STARS) return null;
                // (Only if we are filling row by row)
                
                const res = backtrack(idx + 1);
                if (res) return res;

                return null;
            };

            function isValidPlacement(r, c) {
                // Check neighbors (including diagonals)
                for(let i=-1; i<=1; i++) {
                    for(let j=-1; j<=1; j++) {
                        if (i===0 && j===0) continue;
                        const nr = r+i, nc = c+j;
                        if(nr>=0 && nr<R && nc>=0 && nc<C) {
                            if (solGrid[nr][nc] === 1) return false;
                        }
                    }
                }
                return true;
            }

            setTimeout(() => {
                resolve(backtrack(0));
            }, 10);
        });
    }
});
