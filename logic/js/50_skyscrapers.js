document.addEventListener('DOMContentLoaded', () => {
    const gridWrapper = document.getElementById('grid-wrapper');
    const sizeInput = document.getElementById('size-input');
    const newGridBtn = document.getElementById('new-grid-btn');
    const solveBtn = document.getElementById('mode-solve');
    const resetBtn = document.getElementById('mode-reset');
    const numpad = document.getElementById('numpad');
    const message = document.getElementById('message');

    let N = 4;
    let grid = []; // {val: int|null, type: 'clue'|'cell', pos: [r,c]}
    let selectedCell = null;

    // Init
    initGame(N);

    // Keydown listener for keyboard input
    document.addEventListener('keydown', handleKeyDown);

    newGridBtn.addEventListener('click', () => {
        const n = parseInt(sizeInput.value);
        if (n < 3 || n > 9) {
            alert('尺寸应在3到9之间');
            return;
        }
        initGame(n);
    });

    solveBtn.addEventListener('click', solvePuzzle);
    resetBtn.addEventListener('click', resetGrid);

    function initGame(n) {
        N = n;
        grid = [];
        selectedCell = null;
        
        // Generate Numpad
        numpad.innerHTML = '';
        for(let i=1; i<=N; i++) {
            const btn = document.createElement('button');
            btn.className = 'num-btn';
            btn.innerText = i;
            btn.addEventListener('click', () => setNumber(i));
            numpad.appendChild(btn);
        }
        const clearBtn = document.createElement('button');
        clearBtn.className = 'num-btn';
        clearBtn.innerText = 'C';
        clearBtn.addEventListener('click', () => setNumber(null));
        numpad.appendChild(clearBtn);

        // Grid Layout: (N+2) x (N+2)
        gridWrapper.style.gridTemplateColumns = `repeat(${N+2}, 40px)`;
        gridWrapper.innerHTML = '';

        // Helper to create cell
        const create = (r, c, type) => {
            const cell = document.createElement('div');
            cell.className = `cell ${type}`;
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            const data = {
                r, c, type, val: null, dom: cell
            };
            
            if (type !== 'corner') {
                cell.addEventListener('click', () => selectCell(data));
            } else {
                cell.style.visibility = 'hidden';
            }
            
            gridWrapper.appendChild(cell);
            return data;
        };

        grid = Array(N+2).fill().map(() => Array(N+2).fill(null));

        for(let r=0; r<N+2; r++) {
            for(let c=0; c<N+2; c++) {
                let type = 'corner';
                if (r === 0 && c > 0 && c < N+1) type = 'clue'; // Top
                else if (r === N+1 && c > 0 && c < N+1) type = 'clue'; // Bottom
                else if (c === 0 && r > 0 && r < N+1) type = 'clue'; // Left
                else if (c === N+1 && r > 0 && r < N+1) type = 'clue'; // Right
                else if (r > 0 && r < N+1 && c > 0 && c < N+1) type = 'grid-cell'; // Inner
                
                grid[r][c] = create(r, c, type);
            }
        }
    }

    function selectCell(data) {
        if (selectedCell) {
            selectedCell.dom.classList.remove('active');
        }
        selectedCell = data;
        data.dom.classList.add('active');
    }

    function setNumber(val) {
        if (!selectedCell) return;
        selectedCell.val = val;
        selectedCell.dom.innerText = val === null ? '' : val;
        if (val !== null) {
            // Mark user input as 'fixed' visually (optional, distinct from solver output)
            selectedCell.dom.classList.add('fixed'); 
            selectedCell.dom.classList.remove('solved');
        } else {
            selectedCell.dom.classList.remove('fixed');
        }
    }
    
    function handleKeyDown(e) {
        // If no cell selected, ignore
        if (!selectedCell) return;

        // Check for numbers 1-9
        if (e.key >= '1' && e.key <= '9') {
            const num = parseInt(e.key);
            if (num <= N) { // Only allow numbers valid for current grid size
                setNumber(num);
            }
        } 
        // Check for Backspace/Delete/C/c
        else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0' || e.key.toLowerCase() === 'c') {
            setNumber(null);
        }
        // Arrow keys navigation
        else if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            moveSelection(e.key);
        }
    }

    function moveSelection(key) {
        if (!selectedCell) return;
        let {r, c} = selectedCell;
        
        // Determine new coordinates
        if (key === 'ArrowUp') r--;
        else if (key === 'ArrowDown') r++;
        else if (key === 'ArrowLeft') c--;
        else if (key === 'ArrowRight') c++;

        // Boundary checks (within grid array bounds 0 to N+1)
        if (r >= 0 && r < N+2 && c >= 0 && c < N+2) {
            const target = grid[r][c];
            // Only select if it's a valid interactive cell (clue or grid-cell)
            if (target.type !== 'corner') {
                selectCell(target);
            } else {
                // Try to skip corner? 
                // Simple logic: just don't move if hitting corner
            }
        }
    }

    function resetGrid() {
        for(let r=0; r<N+2; r++) {
            for(let c=0; c<N+2; c++) {
                const d = grid[r][c];
                if (d.type === 'grid-cell' || d.type === 'clue') {
                   if (d.type === 'grid-cell') {
                       d.val = null;
                       d.dom.innerText = '';
                       d.dom.classList.remove('solved');
                       d.dom.classList.remove('fixed');
                   }
                   // Optionally clear clues too? User might want to keep clues.
                   // Let's keep clues unless it's a full reset. 
                   // Actually, "Reset Grid" usually means clearing the puzzle solution, not the problem definition.
                }
            }
        }
        message.innerText = '网格已重置';
    }

    // --- SOLVER ---
    async function solvePuzzle() {
        message.innerText = '求解中...';
        
        // Collect Inputs
        const clues = {
            top: [], bottom: [], left: [], right: []
        };
        const fixed = []; // pre-filled cells (user provided constraints inside grid)

        for(let i=1; i<=N; i++) {
            clues.top.push(grid[0][i].val);
            clues.bottom.push(grid[N+1][i].val);
            clues.left.push(grid[i][0].val);
            clues.right.push(grid[i][N+1].val);
        }

        const board = Array(N).fill().map(() => Array(N).fill(0));
        for(let r=1; r<=N; r++) {
            for(let c=1; c<=N; c++) {
                if (grid[r][c].val !== null) {
                    board[r-1][c-1] = grid[r][c].val;
                    fixed.push({r:r-1, c:c-1, v:grid[r][c].val});
                }
            }
        }

        // Validate Inputs
        if (!isValidInitial(board)) {
            message.innerText = '初始数字冲突！请检查行/列是否有重复数字。';
            return;
        }

        // Solver: Backtracking
        const solution = await solveSkyscrapers(N, clues, board);

        if (solution) {
            for(let r=0; r<N; r++) {
                for(let c=0; c<N; c++) {
                    const cell = grid[r+1][c+1];
                    // Don't overwrite user inputs if they match? Or just overwrite everything for consistency.
                    // Ideally preserve 'fixed' class for user inputs.
                    if (cell.val === null) {
                         cell.val = solution[r][c];
                         cell.dom.innerText = cell.val;
                         cell.dom.classList.add('solved');
                    }
                }
            }
            message.innerText = '求解成功！';
        } else {
            message.innerText = '无解。请检查线索或预填数字是否正确。';
        }
    }

    function isValidInitial(board) {
        // Check duplicates in rows/cols
        for(let i=0; i<N; i++) {
            const row = board[i].filter(x => x>0);
            if (new Set(row).size !== row.length) return false;
            
            const col = [];
            for(let j=0; j<N; j++) if(board[j][i]>0) col.push(board[j][i]);
            if (new Set(col).size !== col.length) return false;
        }
        return true;
    }

    function solveSkyscrapers(n, clues, initialBoard) {
        return new Promise(resolve => {
            const board = initialBoard.map(row => [...row]);
            
            // Optimization: Domain reduction could be added here, but for N<=9 simple backtracking might suffice if constraints are checked early.
            // Order of cells: find most constrained? Or just row-major.
            const cells = [];
            for(let r=0; r<n; r++) for(let c=0; c<n; c++) if(board[r][c] === 0) cells.push({r,c});

            const backtrack = (idx) => {
                if (idx === cells.length) {
                    return checkAllClues(n, clues, board) ? board : null;
                }

                const {r, c} = cells[idx];
                
                // Try values 1..N
                for(let v=1; v<=n; v++) {
                    // Check row/col uniqueness immediately
                    if (isValidPlacement(n, board, r, c, v)) {
                        board[r][c] = v;
                        
                        // Pruning: Check visible constraints if row/col is full
                        // Also check partial constraints if possible
                        if (!isPartialClueValid(n, clues, board, r, c)) {
                            board[r][c] = 0;
                            continue;
                        }

                        const res = backtrack(idx + 1);
                        if (res) return res;
                        board[r][c] = 0;
                    }
                }
                return null;
            };

            setTimeout(() => {
                resolve(backtrack(0));
            }, 10);
        });
    }

    function isValidPlacement(n, board, r, c, v) {
        // Row
        for(let j=0; j<n; j++) if (board[r][j] === v) return false;
        // Col
        for(let i=0; i<n; i++) if (board[i][c] === v) return false;
        return true;
    }

    function countVisible(arr) {
        let max = 0;
        let count = 0;
        for(const h of arr) {
            if (h > max) {
                max = h;
                count++;
            }
        }
        return count;
    }

    function isPartialClueValid(n, clues, board, r, c) {
        // Check Row if full
        let rowFull = true;
        for(let j=0; j<n; j++) if(board[r][j] === 0) { rowFull = false; break; }
        
        if (rowFull) {
            const row = board[r];
            if (clues.left[r] !== null) {
                if (countVisible(row) !== clues.left[r]) return false;
            }
            if (clues.right[r] !== null) {
                if (countVisible([...row].reverse()) !== clues.right[r]) return false;
            }
        }

        // Check Col if full
        let colFull = true;
        for(let i=0; i<n; i++) if(board[i][c] === 0) { colFull = false; break; }
        
        if (colFull) {
            const col = [];
            for(let i=0; i<n; i++) col.push(board[i][c]);
            
            if (clues.top[c] !== null) {
                if (countVisible(col) !== clues.top[c]) return false;
            }
            if (clues.bottom[c] !== null) {
                if (countVisible([...col].reverse()) !== clues.bottom[c]) return false;
            }
        }
        
        // Advanced Pruning (Optional):
        // If visible count so far > clue, it's invalid (because count never decreases)
        // Check Left
        if (clues.left[r] !== null) {
            // Construct partial row
            const row = [];
            for(let j=0; j<=c; j++) row.push(board[r][j]);
            // But wait, holes before c? 
            // Our solver fills cells sequentially? No, `cells` array order is unknown (row-major usually).
            // If we iterate row-major, then for current `r`, all `0..c` are filled.
            // So `row` is valid prefix.
            // Warning: if `cells` is not sorted by row/col, this assumption breaks.
            // But `cells` comes from row-major scan `for r... for c...`. So yes.
            if (countVisible(row) > clues.left[r]) return false;
        }
        
        // Check Top
        if (clues.top[c] !== null) {
            // Construct partial col
            const col = [];
            for(let i=0; i<=r; i++) col.push(board[i][c]);
            if (countVisible(col) > clues.top[c]) return false;
        }
        
        return true;
    }

    function checkAllClues(n, clues, board) {
        for(let r=0; r<n; r++) {
            const row = board[r];
            if (clues.left[r] !== null && countVisible(row) !== clues.left[r]) return false;
            if (clues.right[r] !== null && countVisible([...row].reverse()) !== clues.right[r]) return false;
        }
        for(let c=0; c<n; c++) {
            const col = [];
            for(let r=0; r<n; r++) col.push(board[r][c]);
            if (clues.top[c] !== null && countVisible(col) !== clues.top[c]) return false;
            if (clues.bottom[c] !== null && countVisible([...col].reverse()) !== clues.bottom[c]) return false;
        }
        return true;
    }
});
