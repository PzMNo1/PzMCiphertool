document.addEventListener('DOMContentLoaded', () => {
    const gridEl = document.getElementById('grid');
    const sizeInput = document.getElementById('size');
    const createBtn = document.getElementById('create-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const status = document.getElementById('status');

    let N = 10;
    let grid = []; // { val: string (clue), shaded: bool }

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
        gridEl.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${N}, 40px)`;
        grid = Array(N).fill().map(() => Array(N).fill().map(() => ({ val: '', shaded: false })));

        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = document.createElement('div');
                cell.className = 'tapa-cell';
                
                // Input for clues
                const input = document.createElement('input');
                input.className = 'tapa-input';
                input.type = 'text';
                input.addEventListener('change', (e) => {
                    grid[i][j].val = e.target.value.trim();
                    if (grid[i][j].val) cell.classList.add('clue-cell');
                    else cell.classList.remove('clue-cell');
                });
                
                cell.appendChild(input);
                gridEl.appendChild(cell);
            }
        }
    }

    function renderShading() {
        const cells = document.querySelectorAll('.tapa-cell');
        cells.forEach((cell, idx) => {
            const r = Math.floor(idx / N);
            const c = idx % N;
            const input = cell.querySelector('input');
            
            if (grid[r][c].shaded) {
                cell.classList.add('shaded');
                input.style.display = 'none';
            } else {
                cell.classList.remove('shaded');
                input.style.display = 'block';
                if (grid[r][c].val) {
                    cell.classList.add('clue-cell');
                    input.value = grid[r][c].val;
                } else {
                    cell.classList.remove('clue-cell');
                    input.value = '';
                }
            }
        });
    }

    async function solve() {
        status.textContent = '求解中...';
        // clear previous shading
        for(let i=0; i<N; i++) for(let j=0; j<N; j++) grid[i][j].shaded = false;
        
        await new Promise(r => setTimeout(r, 50));

        const clues = {};
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                if (grid[i][j].val) {
                    const nums = grid[i][j].val.split(/\D+/).filter(s=>s).map(Number);
                    if (nums.length > 0) clues[`${i},${j}`] = nums;
                }
            }
        }

        const res = solveTapa(N, clues);
        if (res) {
            for(let i=0; i<N; i++) {
                for(let j=0; j<N; j++) {
                    if (res[i][j] === 1) grid[i][j].shaded = true;
                }
            }
            renderShading();
            status.textContent = '已解决!';
        } else {
            status.textContent = '无解';
        }
    }

    function solveTapa(size, clues) {
        let board = Array(size).fill().map(() => Array(size).fill(0)); // 0: white, 1: black

        // Clue cells must be white (usually, unless told otherwise)
        // Standard Tapa: clue cells are unshaded.
        for(const key in clues) {
            const [r, c] = key.split(',').map(Number);
            board[r][c] = 0; // fixed white
        }

        return backtrack(0, 0, board, size, clues);
    }

    function backtrack(r, c, board, size, clues) {
        if (r === size) {
            if (checkConnectivity(board, size) && checkAllClues(board, size, clues)) return board;
            return null;
        }

        const nextR = c === size - 1 ? r + 1 : r;
        const nextC = c === size - 1 ? 0 : c + 1;

        // If fixed (clue), skip
        if (clues[`${r},${c}`]) {
            return backtrack(nextR, nextC, board, size, clues);
        }

        // Try Black (1)
        // Check 2x2 constraint immediately
        if (canShade(board, r, c)) {
            board[r][c] = 1;
            
            // Optimization: Check local clue validity if neighbors of a clue are fully decided
            // Just simple backtrack for now
            
            const res = backtrack(nextR, nextC, board, size, clues);
            if (res) return res;
        }

        // Try White (0)
        board[r][c] = 0;
        const res = backtrack(nextR, nextC, board, size, clues);
        if (res) return res;

        return null;
    }

    function canShade(board, r, c) {
        // Check 2x2
        if (r > 0 && c > 0) {
            if (board[r-1][c-1] === 1 && board[r-1][c] === 1 && board[r][c-1] === 1) return false;
        }
        // Note: upcoming cells are 0, so only need to check Top-Left direction
        return true;
    }

    function checkAllClues(board, size, clues) {
        for(const key in clues) {
            const [r, c] = key.split(',').map(Number);
            const expected = clues[key]; // array of lengths
            
            // Get 8 neighbors clockwise starting from top-left? Or any order, usually starts Top-Left.
            // Order: (-1,-1), (-1,0), (-1,1), (0,1), (1,1), (1,0), (1,-1), (0,-1)
            // Actually order matters for "consecutive" blocks.
            const neighborOffsets = [
                [-1,-1], [-1,0], [-1,1], [0,1], 
                [1,1], [1,0], [1,-1], [0,-1]
            ];
            
            const vals = [];
            for(const [dr, dc] of neighborOffsets) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    vals.push(board[nr][nc]);
                } else {
                    vals.push(0); // out of bounds is white
                }
            }
            
            // Parse vals to block lengths
            const blocks = [];
            let current = 0;
            // Handle circularity: duplicate array to handle wrap around
            // Actually, logic is: find runs. If ends wrap, merge them.
            // Simplest: rotate so it starts with 0.
            if (vals.every(v => v === 1)) {
                // Full circle = 8 (special case, but usually max is 8 for Tapa center)
                // If all 1s, block is [8]
                 if (expected.length === 1 && expected[0] === 8) continue;
                 return false;
            }
            if (vals.every(v => v === 0)) {
                 // If clue is [0]? Tapa clues usually > 0.
                 // If expected is empty or [0], OK.
                 continue; // Assuming clues are positive integers
                 // Wait, if clue exists but no shaded neighbors -> violation
                 return false; 
            }

            // Rotate to start with 0
            let rotated = [...vals];
            while(rotated[0] === 1) {
                rotated.push(rotated.shift());
            }
            
            // Now count runs
            for(const v of rotated) {
                if (v === 1) current++;
                else {
                    if (current > 0) blocks.push(current);
                    current = 0;
                }
            }
            if (current > 0) blocks.push(current);
            
            // Sort blocks and compare with sorted expected
            blocks.sort((a,b) => a-b);
            const expSorted = [...expected].sort((a,b) => a-b);
            
            if (blocks.length !== expSorted.length) return false;
            for(let k=0; k<blocks.length; k++) if (blocks[k] !== expSorted[k]) return false;
        }
        return true;
    }

    function checkConnectivity(board, size) {
        // All 1s connected
        let start = null;
        let count = 0;
        for(let i=0; i<size; i++) {
            for(let j=0; j<size; j++) {
                if (board[i][j] === 1) {
                    if (!start) start = [i,j];
                    count++;
                }
            }
        }
        if (count === 0) return true; // valid?
        
        let q = [start];
        let visited = new Set();
        visited.add(`${start[0]},${start[1]}`);
        let found = 0;
        
        while(q.length) {
            const [r, c] = q.shift();
            found++;
            [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr, nc]) => {
                if (nr>=0 && nr<size && nc>=0 && nc<size && board[nr][nc]===1) {
                    if (!visited.has(`${nr},${nc}`)) {
                        visited.add(`${nr},${nc}`);
                        q.push([nr, nc]);
                    }
                }
            });
        }
        
        return found === count;
    }

    init();
});



















