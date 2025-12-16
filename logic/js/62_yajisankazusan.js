document.addEventListener('DOMContentLoaded', () => {
    const gridEl = document.getElementById('grid');
    const sizeInput = document.getElementById('size');
    const createBtn = document.getElementById('create-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const status = document.getElementById('status');

    let N = 8;
    let grid = []; // { type, val, dir, shaded }

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
        grid = Array(N).fill().map(() => Array(N).fill().map(() => ({ type: 'empty', val: null, dir: '', shaded: false })));

        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = document.createElement('div');
                cell.className = 'yk-cell';
                
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
            cellData.type = 'empty';
            if (cellData.val === null && !cellData.dir) gridEl.children[r*N+c].classList.remove('clue-cell');
        }
    }

    function renderResult() {
        const cells = gridEl.children;
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = cells[i*N+j];
                cell.classList.remove('shaded');
                if (grid[i][j].shaded) cell.classList.add('shaded');
            }
        }
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

        const sol = solveYK(N, clues);
        if (sol) {
            for(let i=0; i<N; i++) for(let j=0; j<N; j++) grid[i][j].shaded = sol[i][j];
            renderResult();
            status.textContent = '已解决!';
        } else {
            status.textContent = '无解';
        }
    }

    function solveYK(size, clues) {
        let shaded = Array(size).fill().map(() => Array(size).fill(false));
        return backtrack(0, 0, shaded, size, clues);
    }

    function backtrack(idx, count, shaded, size, clues) {
        if (idx === size * size) {
            if (checkConnectivity(shaded, size)) return shaded;
            return null;
        }
        const r = Math.floor(idx / size);
        const c = idx % size;

        // Option 1: Unshaded (False)
        shaded[r][c] = false;
        // Check constraint: If this is a clue, it must be valid now?
        // Clue validation: A clue at (r,c) counts shaded cells in direction.
        // Since we fill Top->Bottom, Right->Left (or similar),
        // "Up" and "Left" clues might be fully checkable?
        // "Right" and "Down" clues are not fully checkable.
        
        // However, "Unshaded clues MUST be correct".
        // If we mark it unshaded, we commit to it being correct.
        // Since we can't check future, we just proceed.
        // BUT: If we finish row/col, we can check.
        
        const res1 = backtrack(idx + 1, count, shaded, size, clues);
        if (res1) return res1;

        // Option 2: Shaded (True)
        // Constraint: No adjacent shaded cells.
        if ((r > 0 && shaded[r-1][c]) || (c > 0 && shaded[r][c-1])) {
            // Invalid placement
        } else {
            shaded[r][c] = true;
            // If shaded, clue is ignored. No constraint to check here.
            
            const res2 = backtrack(idx + 1, count, shaded, size, clues);
            if (res2) return res2;
            
            shaded[r][c] = false; // Backtrack
        }
        return null;
    }

    function checkConnectivity(shaded, size) {
        // Verify all clues first
        // For every clue (r,c):
        // If !shaded[r][c], count must match.
        // If shaded[r][c], ignore.
        // (Wait, provided logic was: !shaded => must match. shaded => ignore).
        
        // Wait, I need to check clues globally now.
        // Access clues from parent scope or pass them? 
        // Ah, I need to pass clues to checkConnectivity or check before.
        // Let's do checkClues separately.
        return true; 
    }
    
    // Corrected Backtrack to include clue check
    function backtrack(idx, count, shaded, size, clues) {
        if (idx === size * size) {
            if (checkAllClues(shaded, size, clues) && checkConnectivity(shaded, size)) return shaded;
            return null;
        }
        const r = Math.floor(idx / size);
        const c = idx % size;

        // Try Unshaded
        shaded[r][c] = false;
        if (backtrack(idx+1, count, shaded, size, clues)) return shaded;

        // Try Shaded
        if (!hasShadedNeighbor(r, c, shaded, size)) {
            shaded[r][c] = true;
            if (backtrack(idx+1, count, shaded, size, clues)) return shaded;
            shaded[r][c] = false;
        }
        return null;
    }

    function hasShadedNeighbor(r, c, shaded, size) {
        if (r > 0 && shaded[r-1][c]) return true;
        if (c > 0 && shaded[r][c-1]) return true;
        return false;
    }

    function checkAllClues(shaded, size, clues) {
        for(const key in clues) {
            const [r, c] = key.split(',').map(Number);
            if (shaded[r][c]) continue; // Ignored if shaded

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
    
    function checkConnectivity(shaded, size) {
        let start = null;
        let whiteCount = 0;
        for(let i=0; i<size; i++) for(let j=0; j<size; j++) {
            if (!shaded[i][j]) {
                if (!start) start = {r:i, c:j};
                whiteCount++;
            }
        }
        if (whiteCount === 0) return true;

        let q = [start];
        let visited = new Set();
        visited.add(`${start.r},${start.c}`);
        let found = 0;
        while(q.length) {
            const u = q.shift();
            found++;
            [[u.r-1,u.c],[u.r+1,u.c],[u.r,u.c-1],[u.r,u.c+1]].forEach(([nr, nc]) => {
                if(nr>=0 && nr<size && nc>=0 && nc<size && !shaded[nr][nc]) {
                    if (!visited.has(`${nr},${nc}`)) {
                        visited.add(`${nr},${nc}`);
                        q.push({r:nr, c:nc});
                    }
                }
            });
        }
        return found === whiteCount;
    }

    init();
});



















