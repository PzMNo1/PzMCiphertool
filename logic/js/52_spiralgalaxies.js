document.addEventListener('DOMContentLoaded', () => {
    const gridWrapper = document.getElementById('grid-wrapper');
    const rowsInput = document.getElementById('rows-input');
    const colsInput = document.getElementById('cols-input');
    const newGridBtn = document.getElementById('new-grid-btn');
    const modeBtns = {
        play: document.getElementById('mode-play'),
        edit: document.getElementById('mode-edit'),
        solve: document.getElementById('mode-solve'),
        reset: document.getElementById('mode-reset')
    };
    const message = document.getElementById('message');

    let R = 7, C = 7;
    const CELL_SIZE = 40;
    let dots = []; // {fr, fc, color} fr, fc are 0..2R, 0..2C
    let assignment = []; // R x C, stores index of dot
    let mode = 'play'; // 'play', 'edit'
    let selectedDotIndex = -1;

    // Distinct Colors for regions
    const COLORS = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', 
        '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71',
        '#F1C40F', '#E74C3C', '#1ABC9C', '#95A5A6', '#34495E'
    ];

    // Init
    initGame(R, C);

    newGridBtn.addEventListener('click', () => {
        const r = parseInt(rowsInput.value);
        const c = parseInt(colsInput.value);
        if (r < 4 || c < 4 || r > 15 || c > 15) {
            alert('尺寸请在 4-15 之间');
            return;
        }
        initGame(r, c);
    });

    modeBtns.play.addEventListener('click', () => setMode('play'));
    modeBtns.edit.addEventListener('click', () => setMode('edit'));
    modeBtns.solve.addEventListener('click', solvePuzzle);
    modeBtns.reset.addEventListener('click', resetGame);

    function setMode(m) {
        mode = m;
        Object.values(modeBtns).forEach(b => b.classList.remove('active'));
        modeBtns[m].classList.add('active');
        selectedDotIndex = -1;
        render();
    }

    function initGame(r, c) {
        R = r; C = c;
        dots = [];
        assignment = Array(R).fill().map(() => Array(C).fill(-1));
        render();
    }

    function resetGame() {
        assignment = Array(R).fill().map(() => Array(C).fill(-1));
        render();
        message.innerText = '已重置';
    }

    function render() {
        gridWrapper.innerHTML = '';
        gridWrapper.style.width = `${C * CELL_SIZE}px`;
        gridWrapper.style.height = `${R * CELL_SIZE}px`;

        // 1. Render Cells
        for(let i=0; i<R; i++) {
            for(let j=0; j<C; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.width = `${CELL_SIZE}px`;
                cell.style.height = `${CELL_SIZE}px`;
                cell.style.top = `${i * CELL_SIZE}px`;
                cell.style.left = `${j * CELL_SIZE}px`;
                
                const dotIdx = assignment[i][j];
                if (dotIdx !== -1 && dots[dotIdx]) {
                    cell.style.backgroundColor = dots[dotIdx].color;
                    cell.style.opacity = 0.6;
                }

                cell.addEventListener('mousedown', (e) => {
                    if (mode === 'play' && selectedDotIndex !== -1) {
                        // Start painting
                        assignCell(i, j, selectedDotIndex);
                    }
                });
                
                // Drag painting could be added here
                
                gridWrapper.appendChild(cell);
            }
        }

        // 2. Render Dots
        dots.forEach((dot, idx) => {
            const d = document.createElement('div');
            d.className = 'dot';
            if (idx === selectedDotIndex) d.classList.add('selected');
            // fr, fc coordinates:
            // Vertex (0,0) is top-left of cell (0,0). Fine coord (0,0).
            // Cell (0,0) center is fine coord (1,1).
            // Vertex (i,j) -> fine (2i, 2j) -> px (i*SIZE, j*SIZE)
            // Fine (fr, fc) -> px (fr * SIZE/2, fc * SIZE/2)
            d.style.top = `${dot.fr * CELL_SIZE / 2}px`;
            d.style.left = `${dot.fc * CELL_SIZE / 2}px`;
            d.style.backgroundColor = dot.color;
            
            d.addEventListener('click', (e) => {
                e.stopPropagation();
                if (mode === 'play') {
                    selectedDotIndex = idx;
                    render();
                } else if (mode === 'edit') {
                    // Remove dot
                    dots.splice(idx, 1);
                    // Clean assignments
                    // Re-assign indices? No, just reset board for simplicity or keep colors?
                    // Removing dot shifts indices, so need to fix assignment array.
                    // Simple fix: clear assignment or map old index to new.
                    // Let's just clear assignment to avoid bugs.
                    assignment = Array(R).fill().map(() => Array(C).fill(-1));
                    render();
                }
            });
            
            gridWrapper.appendChild(d);
        });

        // 3. Render Hit Targets (Only in Edit Mode)
        if (mode === 'edit') {
            // Potential dots are at fine coords 0..2R, 0..2C
            // Optimization: Don't render all, maybe just on hover? 
            // Or render transparent divs.
            // Total 2R+1 * 2C+1 targets. For 10x10 grid, 21*21 = 441 targets. Acceptable.
            
            for(let fr=0; fr<=2*R; fr++) {
                for(let fc=0; fc<=2*C; fc++) {
                    // Skip if dot already exists
                    if (dots.some(d => d.fr === fr && d.fc === fc)) continue;

                    const hit = document.createElement('div');
                    hit.className = 'hit-target';
                    hit.style.top = `${fr * CELL_SIZE / 2}px`;
                    hit.style.left = `${fc * CELL_SIZE / 2}px`;
                    
                    hit.addEventListener('click', () => {
                        addDot(fr, fc);
                    });
                    
                    gridWrapper.appendChild(hit);
                }
            }
        }
    }

    function addDot(fr, fc) {
        const color = COLORS[dots.length % COLORS.length];
        dots.push({fr, fc, color});
        render();
    }

    function assignCell(r, c, dotIdx) {
        // Also assign symmetric cell
        const dot = dots[dotIdx];
        
        // Center coord in fine grid: (dot.fr, dot.fc)
        // Cell (r,c) center in fine grid: (2r+1, 2c+1)
        // Vector: (2r+1 - dot.fr, 2c+1 - dot.fc)
        // Symmetric Cell Center: (dot.fr - (2r+1 - dot.fr), dot.fc - (2c+1 - dot.fc))
        // = (2*dot.fr - 2r - 1, 2*dot.fc - 2c - 1)
        // Let symmetric cell be (r', c'). Center is (2r'+1, 2c'+1).
        // 2r'+1 = 2*dot.fr - 2r - 1  => 2r' = 2*dot.fr - 2r - 2 => r' = dot.fr - r - 1
        
        const r_sym = dot.fr - r - 1;
        const c_sym = dot.fc - c - 1;

        // Assign main cell
        assignment[r][c] = dotIdx;

        // Assign symmetric cell if in bounds
        if (r_sym >= 0 && r_sym < R && c_sym >= 0 && c_sym < C) {
            assignment[r_sym][c_sym] = dotIdx;
        }
        
        render();
    }

    // --- SOLVER ---
    async function solvePuzzle() {
        if (dots.length === 0) {
            message.innerText = '请先添加星系中心';
            return;
        }
        message.innerText = '求解中...';
        
        // Prepare solver
        // Cells: R*C
        // Dots: K
        // Assign each cell to a dot index 0..K-1
        
        const cells = [];
        for(let i=0; i<R; i++) for(let j=0; j<C; j++) cells.push({r:i, c:j});
        
        // Clear assignment
        const solGrid = Array(R).fill().map(() => Array(C).fill(-1));

        const solution = await runSolver(cells, solGrid);
        
        if (solution) {
            assignment = solution;
            render();
            message.innerText = '求解成功！';
        } else {
            message.innerText = '无解。';
        }
    }

    function runSolver(cells, grid) {
        return new Promise(resolve => {
            
            // Constraints check helper
            const isValid = (r, c, k) => {
                const dot = dots[k];
                // 1. Symmetry Check
                const r_sym = dot.fr - r - 1;
                const c_sym = dot.fc - c - 1;
                
                // Symmetric cell MUST be in bounds
                if (r_sym < 0 || r_sym >= R || c_sym < 0 || c_sym >= C) return false;
                
                // If symmetric cell is already assigned to different dot, invalid
                if (grid[r_sym][c_sym] !== -1 && grid[r_sym][c_sym] !== k) return false;
                
                return true;
            };
            
            const backtrack = (idx) => {
                if (idx === cells.length) {
                    return checkConnectivity(grid) ? grid : null;
                }

                const {r, c} = cells[idx];
                
                // If already assigned (by symmetry), skip
                if (grid[r][c] !== -1) {
                    return backtrack(idx + 1);
                }

                for(let k=0; k<dots.length; k++) {
                    if (isValid(r, c, k)) {
                        grid[r][c] = k;
                        const dot = dots[k];
                        const r_sym = dot.fr - r - 1;
                        const c_sym = dot.fc - c - 1;
                        let assignedSym = false;
                        
                        if (grid[r_sym][c_sym] === -1) {
                            grid[r_sym][c_sym] = k;
                            assignedSym = true;
                        } else if (grid[r_sym][c_sym] !== k) {
                            // Should be caught by isValid, but double check
                            grid[r][c] = -1;
                            continue;
                        }

                        const res = backtrack(idx + 1);
                        if (res) return res;
                        
                        // Backtrack
                        grid[r][c] = -1;
                        if (assignedSym) grid[r_sym][c_sym] = -1;
                    }
                }
                return null;
            };
            
            function checkConnectivity(g) {
                for(let k=0; k<dots.length; k++) {
                    const cellsInK = [];
                    for(let i=0; i<R; i++) for(let j=0; j<C; j++) if(g[i][j] === k) cellsInK.push({r:i, c:j});
                    
                    if (cellsInK.length === 0) return false; // Empty region?
                    
                    // BFS from first cell
                    const start = cellsInK[0];
                    const q = [start];
                    const visited = new Set([`${start.r},${start.c}`]);
                    
                    let count = 0;
                    while(q.length > 0) {
                        const p = q.shift();
                        count++;
                        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                        for(const [dr, dc] of dirs) {
                            const nr = p.r+dr, nc = p.c+dc;
                            if(nr>=0 && nr<R && nc>=0 && nc<C && g[nr][nc]===k) {
                                const key = `${nr},${nc}`;
                                if(!visited.has(key)) {
                                    visited.add(key);
                                    q.push({r:nr, c:nc});
                                }
                            }
                        }
                    }
                    
                    if (count !== cellsInK.length) return false;
                    
                    const dot = dots[k];
                    // Case 1: Center in cell (odd, odd)
                    if (dot.fr % 2 !== 0 && dot.fc % 2 !== 0) {
                        const r = (dot.fr-1)/2, c = (dot.fc-1)/2;
                        if (g[r][c] !== k) return false;
                    }
                    // Case 2: Center on Edge (odd, even) -> Vertical Edge between (r, c-1) and (r, c)
                    else if (dot.fr % 2 !== 0 && dot.fc % 2 === 0) {
                        const r = (dot.fr-1)/2, c = dot.fc/2;
                        if (c>0 && g[r][c-1] !== k) return false;
                        if (c<C && g[r][c] !== k) return false;
                    }
                    // Case 3: Center on Edge (even, odd) -> Horizontal Edge
                    else if (dot.fr % 2 === 0 && dot.fc % 2 !== 0) {
                        const r = dot.fr/2, c = (dot.fc-1)/2;
                        if (r>0 && g[r-1][c] !== k) return false;
                        if (r<R && g[r][c] !== k) return false;
                    }
                    // Case 4: Vertex (even, even)
                    else {
                        const r = dot.fr/2, c = dot.fc/2;
                        if (r>0 && c>0 && g[r-1][c-1] !== k) return false;
                        if (r>0 && c<C && g[r-1][c] !== k) return false;
                        if (r<R && c>0 && g[r][c-1] !== k) return false;
                        if (r<R && c<C && g[r][c] !== k) return false;
                    }
                }
                
                return true;
            }

            setTimeout(() => {
                const result = backtrack(0);
                resolve(result);
            }, 10);
        });
    }
});
