document.addEventListener('DOMContentLoaded', () => {
    const gridEl = document.getElementById('grid');
    const sizeInput = document.getElementById('size');
    const createBtn = document.getElementById('create-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const status = document.getElementById('status');

    let N = 6;
    let grid = []; // 0: empty, 1: white, 2: black
    let fixed = []; // boolean grid

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
        grid = Array(N).fill().map(() => Array(N).fill(0));
        fixed = Array(N).fill().map(() => Array(N).fill(false));
        
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = document.createElement('div');
                cell.className = 'yinyang-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                cell.addEventListener('click', () => toggleCell(i, j, cell));
                gridEl.appendChild(cell);
            }
        }
        status.textContent = '准备就绪';
    }

    function toggleCell(r, c, cell) {
        // Cycle: 0 -> 1 -> 2 -> 0
        grid[r][c] = (grid[r][c] + 1) % 3;
        fixed[r][c] = grid[r][c] !== 0;
        updateCellVisual(cell, grid[r][c]);
    }

    function updateCellVisual(cell, val) {
        cell.classList.remove('cell-white', 'cell-black');
        if (val === 1) cell.classList.add('cell-white');
        if (val === 2) cell.classList.add('cell-black');
    }

    function renderGrid() {
        const cells = gridEl.children;
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                updateCellVisual(cells[i*N+j], grid[i][j]);
            }
        }
    }

    async function solve() {
        status.textContent = '求解中...';
        await new Promise(r => setTimeout(r, 50));

        // Create a copy for solving
        const board = grid.map(row => [...row]);
        
        const result = solveYinYang(N, board);
        if (result) {
            grid = result;
            renderGrid();
            status.textContent = '已解决!';
        } else {
            status.textContent = '无解';
        }
    }

    // --- Solver ---
    
    function solveYinYang(n, board) {
        return backtrack(0, 0, board, n);
    }

    function backtrack(r, c, board, n) {
        if (r === n) {
            // Filled
            if (checkGlobalConnectivity(board, n)) return board;
            return null;
        }

        const nextR = c === n - 1 ? r + 1 : r;
        const nextC = c === n - 1 ? 0 : c + 1;

        const original = board[r][c];
        // If fixed, just proceed
        if (original !== 0) {
            if (!check2x2(board, r, c, original)) return null;
            // Optimization: Check partial connectivity? hard.
            // Optimization: Check "checkerboard" pattern reachability?
            return backtrack(nextR, nextC, board, n);
        }

        // Try White (1)
        board[r][c] = 1;
        if (check2x2(board, r, c, 1)) {
            // Optimization: Check if we cut off any color region?
            // For small N, global check at end is okay.
            const res = backtrack(nextR, nextC, board, n);
            if (res) return res;
        }

        // Try Black (2)
        board[r][c] = 2;
        if (check2x2(board, r, c, 2)) {
            const res = backtrack(nextR, nextC, board, n);
            if (res) return res;
        }

        board[r][c] = 0;
        return null;
    }

    function check2x2(board, r, c, val) {
        // Check if placing val at (r,c) creates a 2x2 square of same color
        // Only need to check 2x2s that involve (r,c)
        // Top-Left: (r-1, c-1), (r-1, c), (r, c-1), (r, c)
        // Top-Right: (r-1, c), (r-1, c+1), (r, c), (r, c+1)
        // Bot-Left: (r, c-1), (r, c), (r+1, c-1), (r+1, c) -> Not filled yet usually
        // Since we fill row by row, we only care about Top-Left.
        
        if (r > 0 && c > 0) {
            if (board[r-1][c-1] === val && board[r-1][c] === val && board[r][c-1] === val) return false;
        }
        return true;
    }

    function checkGlobalConnectivity(board, n) {
        // Check all 1s connected, all 2s connected.
        return checkColorConnected(board, n, 1) && checkColorConnected(board, n, 2);
    }

    function checkColorConnected(board, n, color) {
        let start = null;
        let count = 0;
        for(let i=0; i<n; i++) {
            for(let j=0; j<n; j++) {
                if (board[i][j] === color) {
                    if (!start) start = [i,j];
                    count++;
                }
            }
        }
        if (count === 0) return true; // Empty is connected

        let q = [start];
        let visited = new Set();
        visited.add(`${start[0]},${start[1]}`);
        let found = 0;
        
        while(q.length > 0) {
            const [r, c] = q.shift();
            found++;
            const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
            for(const [dr, dc] of dirs) {
                const nr = r+dr, nc = c+dc;
                if(nr>=0 && nr<n && nc>=0 && nc<n && board[nr][nc] === color) {
                    const key = `${nr},${nc}`;
                    if(!visited.has(key)) {
                        visited.add(key);
                        q.push([nr,nc]);
                    }
                }
            }
        }
        return found === count;
    }

    init();
});



















