document.addEventListener('DOMContentLoaded', () => {
    const gridWrapper = document.getElementById('grid-wrapper');
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const createBtn = document.getElementById('create-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const msg = document.getElementById('msg');

    let R = 8, C = 8;
    let grid = []; // 0: empty, 1: tree, 2: tent
    let rowClues = [];
    let colClues = [];

    function init() {
        createBtn.addEventListener('click', () => {
            R = parseInt(rowsInput.value);
            C = parseInt(colsInput.value);
            createGrid();
        });
        resetBtn.addEventListener('click', createGrid);
        solveBtn.addEventListener('click', solve);
        createGrid();
    }

    function createGrid() {
        gridWrapper.innerHTML = '';
        gridWrapper.style.gridTemplateColumns = `40px repeat(${C}, 40px)`;
        gridWrapper.style.gridTemplateRows = `40px repeat(${R}, 40px)`;
        
        grid = Array(R).fill().map(() => Array(C).fill(0));
        rowClues = Array(R).fill('');
        colClues = Array(C).fill('');

        // Top-Left corner
        const corner = document.createElement('div');
        gridWrapper.appendChild(corner);

        // Top Clues (Cols)
        for(let j=0; j<C; j++) {
            const cell = document.createElement('div');
            cell.className = 'clue-cell';
            const input = document.createElement('input');
            input.className = 'clue-input';
            input.placeholder = '#';
            input.addEventListener('input', (e) => colClues[j] = e.target.value);
            cell.appendChild(input);
            gridWrapper.appendChild(cell);
        }

        for(let i=0; i<R; i++) {
            // Left Clue (Row)
            const clueCell = document.createElement('div');
            clueCell.className = 'clue-cell';
            const input = document.createElement('input');
            input.className = 'clue-input';
            input.placeholder = '#';
            input.addEventListener('input', (e) => rowClues[i] = e.target.value);
            clueCell.appendChild(input);
            gridWrapper.appendChild(clueCell);

            // Grid Cells
            for(let j=0; j<C; j++) {
                const cell = document.createElement('div');
                cell.className = 'tents-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                cell.addEventListener('click', () => toggleCell(i, j, cell));
                gridWrapper.appendChild(cell);
            }
        }
        msg.textContent = '请设置树木和线索';
    }

    function toggleCell(r, c, cell) {
        // Cycle: Empty -> Tree -> Empty
        // (Solver will place Tents, user only places Trees)
        if (grid[r][c] === 0) {
            grid[r][c] = 1; // Tree
            cell.classList.add('cell-tree');
        } else {
            grid[r][c] = 0; // Empty
            cell.classList.remove('cell-tree');
            cell.classList.remove('cell-tent');
        }
    }

    async function solve() {
        msg.textContent = '求解中...';
        // Clear previous tents
        for(let i=0; i<R; i++)
            for(let j=0; j<C; j++)
                if (grid[i][j] === 2) grid[i][j] = 0;
        updateView();

        // Parse clues
        const rC = rowClues.map(v => v === '' ? -1 : parseInt(v));
        const cC = colClues.map(v => v === '' ? -1 : parseInt(v));

        await new Promise(r => setTimeout(r, 50));

        const solution = solveTents(R, C, grid, rC, cC);
        if (solution) {
            grid = solution;
            updateView();
            msg.textContent = '已找到解!';
        } else {
            msg.textContent = '无解';
        }
    }

    function updateView() {
        const cells = document.querySelectorAll('.tents-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            cell.className = 'tents-cell';
            if (grid[r][c] === 1) cell.classList.add('cell-tree');
            if (grid[r][c] === 2) cell.classList.add('cell-tent');
        });
    }

    // --- Solver Logic ---
    function solveTents(rows, cols, initialGrid, rClues, cClues) {
        let board = initialGrid.map(row => [...row]);
        
        // Validate clues vs trees count? No, standard tents logic
        
        // Find all trees
        const trees = [];
        for(let r=0; r<rows; r++)
            for(let c=0; c<cols; c++)
                if (board[r][c] === 1) trees.push({r, c});

        // Constraint Check: Count of trees must match total tents count from clues (if all clues present)
        // Skip for now as clues might be partial

        // Backtracking
        // Strategy: Assign a tent position for each tree.
        // This ensures 1-1 mapping.
        // BUT, if we just place tents, we might miss the row/col counts if not careful.
        // Better: Iterate through cells? No, trees are sparse usually.
        // Let's iterate through trees and try to assign a valid tent neighbor.
        
        return backtrack(0, board, trees, rClues, cClues);
    }

    function backtrack(treeIdx, board, trees, rClues, cClues) {
        if (treeIdx === trees.length) {
            // All trees have a tent.
            // Check if all tents are valid (no touch) - handled during placement
            // Check row/col counts
            if (checkClues(board, rClues, cClues)) return board;
            return null;
        }

        const tree = trees[treeIdx];
        const neighbors = [[-1,0], [1,0], [0,-1], [0,1]];

        for(const [dr, dc] of neighbors) {
            const nr = tree.r + dr;
            const nc = tree.c + dc;
            
            // Check bounds
            if (nr < 0 || nr >= board.length || nc < 0 || nc >= board[0].length) continue;

            // If already has a tent (placed for another tree), can we share? 
            // Rules: Each tree is connected to exactly one tent. Each tent to exactly one tree.
            // So NO sharing.
            
            if (board[nr][nc] === 2) continue; // Already occupied by tent
            if (board[nr][nc] === 1) continue; // Occupied by tree

            // Tentative placement
            // Check if placing tent here violates "no touch" with EXISTING tents
            if (!canPlaceTent(board, nr, nc)) continue;

            // Optimization: Check row/col limits
            if (rClues[nr] !== -1 && countRow(board, nr, 2) + 1 > rClues[nr]) continue;
            if (cClues[nc] !== -1 && countCol(board, nc, 2) + 1 > cClues[nc]) continue;

            board[nr][nc] = 2; // Place tent
            
            const result = backtrack(treeIdx + 1, board, trees, rClues, cClues);
            if (result) return result;

            board[nr][nc] = 0; // Backtrack
        }

        return null;
    }

    function canPlaceTent(board, r, c) {
        // Check 8 neighbors for other tents
        const R = board.length;
        const C = board[0].length;
        for(let i=-1; i<=1; i++) {
            for(let j=-1; j<=1; j++) {
                if (i===0 && j===0) continue;
                const nr = r + i;
                const nc = c + j;
                if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                    if (board[nr][nc] === 2) return false;
                }
            }
        }
        return true;
    }

    function checkClues(board, rClues, cClues) {
        const R = board.length;
        const C = board[0].length;
        for(let i=0; i<R; i++) {
            if (rClues[i] !== -1) {
                if (countRow(board, i, 2) !== rClues[i]) return false;
            }
        }
        for(let j=0; j<C; j++) {
            if (cClues[j] !== -1) {
                if (countCol(board, j, 2) !== cClues[j]) return false;
            }
        }
        return true;
    }

    function countRow(board, r, val) {
        let c = 0;
        for(let j=0; j<board[0].length; j++) if (board[r][j] === val) c++;
        return c;
    }

    function countCol(board, c, val) {
        let count = 0;
        for(let i=0; i<board.length; i++) if (board[i][c] === val) count++;
        return count;
    }

    init();
});



















