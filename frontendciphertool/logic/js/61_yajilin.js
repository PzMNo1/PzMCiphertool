document.addEventListener('DOMContentLoaded', () => {
    const gridEl = document.getElementById('grid');
    const sizeInput = document.getElementById('size');
    const createBtn = document.getElementById('create-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const status = document.getElementById('status');

    let N = 8;
    let grid = []; // { val: num, dir: string, type: 'clue'|'empty', shaded: bool, loop: {} }

    function init() {
        createBtn.addEventListener('click', () => {
            N = parseInt(sizeInput.value);
            createGrid();
        });
        resetBtn.addEventListener('click', createGrid);
        solveBtn.addEventListener('click', solve);
        createGrid();
    }

    function createGrid() {
        gridEl.style.gridTemplateColumns = `repeat(${N}, 40px)`;
        gridEl.innerHTML = '';
        grid = Array(N).fill().map(() => Array(N).fill().map(() => ({ type: 'empty', val: null, dir: '', shaded: false, loop: {} })));

        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = document.createElement('div');
                cell.className = 'yajilin-cell';
                
                // Clue Input
                const group = document.createElement('div');
                group.className = 'clue-input-group';
                
                const numIn = document.createElement('input');
                numIn.className = 'clue-num';
                numIn.placeholder = '#';
                numIn.addEventListener('change', (e) => updateClue(i, j, 'val', e.target.value));
                
                const dirIn = document.createElement('select');
                dirIn.className = 'clue-dir';
                dirIn.innerHTML = '<option value="">Dir</option><option value="u">↑</option><option value="d">↓</option><option value="l">←</option><option value="r">→</option>';
                dirIn.addEventListener('change', (e) => updateClue(i, j, 'dir', e.target.value));
                
                group.appendChild(numIn);
                group.appendChild(dirIn);
                cell.appendChild(group);
                gridEl.appendChild(cell);
            }
        }
    }
    
    function updateClue(r, c, field, val) {
        const cellData = grid[r][c];
        if (field === 'val') cellData.val = val ? parseInt(val) : null;
        if (field === 'dir') cellData.dir = val;
        
        if (cellData.val !== null && cellData.dir) {
            cellData.type = 'clue';
            gridEl.children[r*N+c].classList.add('clue-cell');
        } else {
            cellData.type = 'empty'; // Only if both clear? Keep simple.
            if (cellData.val === null && !cellData.dir) gridEl.children[r*N+c].classList.remove('clue-cell');
        }
    }

    function renderResult() {
        const cells = gridEl.children;
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = cells[i*N+j];
                // Clear lines
                cell.querySelectorAll('.loop-line').forEach(e=>e.remove());
                cell.classList.remove('shaded');
                
                if (grid[i][j].shaded) {
                    cell.classList.add('shaded');
                } else if (grid[i][j].loop) {
                    // Draw loop lines
                    const l = grid[i][j].loop;
                    if (l.top) addLine(cell, 't');
                    if (l.bottom) addLine(cell, 'b');
                    if (l.left) addLine(cell, 'l');
                    if (l.right) addLine(cell, 'r');
                }
            }
        }
    }

    function addLine(cell, type) {
        const line = document.createElement('div');
        line.className = `loop-line line-h line-${type}`;
        if (type === 't' || type === 'b') line.className = `loop-line line-v line-${type}`;
        cell.appendChild(line);
    }

    async function solve() {
        status.textContent = '求解中...';
        await new Promise(r => setTimeout(r, 50));

        const clues = {};
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                if (grid[i][j].type === 'clue') clues[`${i},${j}`] = { val: grid[i][j].val, dir: grid[i][j].dir };
            }
        }

        const sol = solveYajilin(N, clues);
        if (sol) {
            // Update grid state
            for(let i=0; i<N; i++) {
                for(let j=0; j<N; j++) {
                    grid[i][j].shaded = sol.shaded[i][j];
                    grid[i][j].loop = sol.loop[i][j];
                }
            }
            renderResult();
            status.textContent = '已解决!';
        } else {
            status.textContent = '无解';
        }
    }

    function solveYajilin(size, clues) {
        // 1. Shading phase
        // 2. Loop phase
        // Constraint: Shaded cells cannot be adjacent.
        // Constraint: Loop passes through all non-shaded non-clue cells.
        // Constraint: Clues satisfied.
        
        let shaded = Array(size).fill().map(() => Array(size).fill(false));
        
        // Backtrack shading
        const res = backtrackShade(0, 0, shaded, size, clues);
        return res;
    }

    function backtrackShade(idx, count, shaded, size, clues) {
        if (idx === size * size) {
            // Verify clues
            if (!checkClues(shaded, size, clues)) return null;
            // Try to build loop
            const loop = solveLoop(shaded, size, clues);
            if (loop) return { shaded, loop };
            return null;
        }

        const r = Math.floor(idx / size);
        const c = idx % size;

        // If clue, cannot shade
        if (clues[`${r},${c}`]) {
            return backtrackShade(idx + 1, count, shaded, size, clues);
        }

        // Option 1: Not Shaded
        const res1 = backtrackShade(idx + 1, count, shaded, size, clues);
        if (res1) return res1;

        // Option 2: Shaded
        // Check adj adjacency
        if ((r > 0 && shaded[r-1][c]) || (c > 0 && shaded[r][c-1])) {
            // Invalid
        } else {
            shaded[r][c] = true;
            // Optimization: Check partial clues
            // Can we?
            
            const res2 = backtrackShade(idx + 1, count, shaded, size, clues);
            if (res2) return res2;
            shaded[r][c] = false;
        }
        return null;
    }

    function checkClues(shaded, size, clues) {
        for(const key in clues) {
            const [r, c] = key.split(',').map(Number);
            const {val, dir} = clues[key];
            let count = 0;
            if (dir === 'u') for(let i=0; i<r; i++) { if(shaded[i][c]) count++; }
            if (dir === 'd') for(let i=r+1; i<size; i++) { if(shaded[i][c]) count++; }
            if (dir === 'l') for(let j=0; j<c; j++) { if(shaded[r][j]) count++; }
            if (dir === 'r') for(let j=c+1; j<size; j++) { if(shaded[r][j]) count++; }
            
            if (count !== val) return false;
        }
        return true;
    }

    function solveLoop(shaded, size, clues) {
        // Loop must visit all cells where !shaded[r][c] && !clues[r,c]
        // Clue cells CANNOT be part of loop (usually? Rules: "Clue cells are not shaded, but loop cannot pass through them"?
        // Wait. Yajilin rules: "The loop must go through all cells that are not shaded and not clues."
        // Wait, actually clue cells act as obstacles? 
        // Usually clue cells are NOT part of the loop.
        
        let targetCells = 0;
        const board = Array(size).fill().map(() => Array(size).fill().map(() => new Set()));
        
        for(let i=0; i<size; i++) for(let j=0; j<size; j++) {
            if (!shaded[i][j] && !clues[`${i},${j}`]) targetCells++;
        }

        // Backtrack loop
        // Simple approach: Construct path? Or set connections?
        // Connection approach (degree 2 for all targets, 0 for others).
        // + Single loop check.
        
        // Use the TLL solver logic slightly modified
        return backtrackLoop(0, 0, board, size, shaded, clues);
    }

    function backtrackLoop(idx, count, board, size, shaded, clues) {
        if (idx === size*size) {
            // Check single loop
            if (checkLoopConnectivity(board, size)) return parseLoop(board, size);
            return null;
        }
        const r = Math.floor(idx / size);
        const c = idx % size;

        // If cell is obstacle (shaded or clue)
        if (shaded[r][c] || clues[`${r},${c}`]) {
            if (board[r][c].size !== 0) return null; // Should be 0
            return backtrackLoop(idx + 1, count, board, size, shaded, clues);
        }

        // Must be degree 2
        // Check options like TLL
        const currentDeg = board[r][c].size;
        if (currentDeg > 2) return null;
        
        // Can add Right?
        const canR = (c < size - 1) && !shaded[r][c+1] && !clues[`${r},${c+1}`];
        const canB = (r < size - 1) && !shaded[r+1][c] && !clues[`${r+1},${c}`];
        
        const attempts = [];
        // Only valid moves are those that allow degree to eventually become 2.
        // If deg=0, need 2. If deg=1, need 1. If deg=2, need 0.
        
        // We are at (r,c). We decide Right and Bottom.
        // We can't change Left/Top.
        
        // If deg=2: Must add 0.
        if (currentDeg === 2) {
             return backtrackLoop(idx + 1, count, board, size, shaded, clues);
        }
        // If deg=1: Must add 1.
        // If deg=0: Must add 2.
        
        if (currentDeg === 1) {
            if (canR) attempts.push({r:true, b:false});
            if (canB) attempts.push({r:false, b:true});
        }
        if (currentDeg === 0) {
            if (canR && canB) attempts.push({r:true, b:true});
        }

        for(const opt of attempts) {
            if (opt.r) { board[r][c].add('right'); board[r][c+1].add('left'); }
            if (opt.b) { board[r][c].add('bottom'); board[r+1][c].add('top'); }
            
            const res = backtrackLoop(idx + 1, count, board, size, shaded, clues);
            if (res) return res;

            if (opt.r) { board[r][c].delete('right'); board[r][c+1].delete('left'); }
            if (opt.b) { board[r][c].delete('bottom'); board[r+1][c].delete('top'); }
        }
        return null;
    }

    function checkLoopConnectivity(board, size) {
        let start = null;
        let nodes = 0;
        for(let i=0; i<size; i++) for(let j=0; j<size; j++) {
             if (board[i][j].size > 0) {
                 if (!start) start = {r:i, c:j};
                 nodes++;
             }
        }
        if (nodes === 0) return true; // Empty loop?
        
        let q = [start];
        let visited = new Set();
        visited.add(`${start.r},${start.c}`);
        let found = 0;
        while(q.length) {
            const u = q.shift();
            found++;
            board[u.r][u.c].forEach(dir => {
                let nr=u.r, nc=u.c;
                if (dir==='left') nc--;
                if (dir==='right') nc++;
                if (dir==='top') nr--;
                if (dir==='bottom') nr++;
                if (!visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    q.push({r:nr, c:nc});
                }
            });
        }
        return found === nodes;
    }

    function parseLoop(board, size) {
        const res = Array(size).fill().map(() => Array(size).fill(null));
        for(let i=0; i<size; i++) for(let j=0; j<size; j++) {
            if (board[i][j].size > 0) {
                res[i][j] = {
                    top: board[i][j].has('top'),
                    bottom: board[i][j].has('bottom'),
                    left: board[i][j].has('left'),
                    right: board[i][j].has('right')
                };
            }
        }
        return res;
    }

    init();
});



















