document.addEventListener('DOMContentLoaded', () => {
    const gridEl = document.getElementById('grid');
    const sizeInput = document.getElementById('size');
    const createBtn = document.getElementById('create-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const status = document.getElementById('status');
    const symbolSelect = document.getElementById('symbol-select');

    let N = 8;
    let grid = []; // { val: '', borders: {} }

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
        grid = Array(N).fill().map(() => Array(N).fill().map(() => ({
            val: '',
            borders: {t:false, b:false, l:false, r:false}
        })));
        
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = document.createElement('div');
                cell.className = 'tatamibari-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                cell.addEventListener('click', () => {
                    grid[i][j].val = symbolSelect.value;
                    cell.textContent = symbolSelect.value;
                });
                gridEl.appendChild(cell);
            }
        }
        // Outer borders visual only? No, we render from state.
        setOuterBorders();
        render();
    }

    function setOuterBorders() {
        for(let i=0; i<N; i++) {
            grid[i][0].borders.l = true;
            grid[i][N-1].borders.r = true;
        }
        for(let j=0; j<N; j++) {
            grid[0][j].borders.t = true;
            grid[N-1][j].borders.b = true;
        }
    }

    function render() {
        const cells = gridEl.children;
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = cells[i*N+j];
                const d = grid[i][j];
                cell.className = 'tatamibari-cell';
                if (d.borders.t) cell.classList.add('border-top');
                if (d.borders.b) cell.classList.add('border-bottom');
                if (d.borders.l) cell.classList.add('border-left');
                if (d.borders.r) cell.classList.add('border-right');
                cell.textContent = d.val;
            }
        }
    }

    async function solve() {
        status.textContent = '求解中...';
        // Reset borders to outer only
        grid.forEach(row => row.forEach(c => {
             c.borders = {t:false, b:false, l:false, r:false};
        }));
        setOuterBorders();
        render();
        await new Promise(r => setTimeout(r, 50));

        const symbols = [];
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                if (grid[i][j].val) symbols.push({r:i, c:j, type:grid[i][j].val});
            }
        }

        const result = solveTatamibari(N, symbols);
        if (result) {
            // Apply borders from result regions
            result.forEach(reg => {
                // reg = {r, c, w, h}
                for(let r=reg.r; r<reg.r+reg.h; r++) {
                    grid[r][reg.c].borders.l = true;
                    grid[r][reg.c+reg.w-1].borders.r = true;
                }
                for(let c=reg.c; c<reg.c+reg.w; c++) {
                    grid[reg.r][c].borders.t = true;
                    grid[reg.r+reg.h-1][c].borders.b = true;
                }
            });
            render();
            status.textContent = '已解决!';
        } else {
            status.textContent = '无解';
        }
    }

    function solveTatamibari(size, symbols) {
        // Assign each symbol a rectangular region containing it.
        // Symbols must form a partition of the grid.
        // Backtracking on symbols?
        // Order: Sort symbols?
        // Or backtrack on grid cells: fill empty cell with a new region belonging to a symbol.
        
        // Let's map each symbol to an ID.
        // State: grid of -1 (empty) or symbol_id.
        let board = Array(size).fill().map(() => Array(size).fill(-1));
        
        // Pre-fill symbol locations
        symbols.forEach((s, idx) => {
            // board[s.r][s.c] = idx; // Wait, we don't know if s.r/s.c is top-left.
            // Actually, the symbol is inside the region.
        });

        return backtrack(0, 0, board, size, symbols);
    }

    function backtrack(r, c, board, size, symbols) {
        // Find first empty cell
        let fr = -1, fc = -1;
        outer: for(let i=0; i<size; i++) {
            for(let j=0; j<size; j++) {
                if (board[i][j] === -1) {
                    fr = i; fc = j;
                    break outer;
                }
            }
        }

        if (fr === -1) {
            // Filled. Check if valid (all symbols used, no 4 corners)
            // Actually, my construction ensures partition.
            // Need to check if every region contains exactly 1 symbol.
            // And type check. And corner check.
            if (checkCornerConstraint(board, size)) return extractRegions(board, size);
            return null;
        }

        // Try to place a region starting at (fr, fc)
        // It must contain exactly one unused symbol?
        // Actually, simpler: Iterate unused symbols, try to create a rect for them that covers (fr, fc).
        // But (fr, fc) is top-left of remaining space.
        // So the rect must have (fr, fc) as its top-left? Yes, because any rect covering (fr, fc) but starting earlier would have been placed already.
        
        // So, try to place a rectangle at (fr, fc) with dim (w, h).
        // This rectangle MUST contain exactly 1 symbol from the list that hasn't been covered yet.
        // And that symbol's type must match the rect dimensions.
        
        // Optimization: Iterate through all available symbols.
        // For each symbol `s` that is not covered:
        // If s.r >= fr and s.c >= fc (since (fr, fc) is top-left of rect)
        // Try all valid (w, h) such that rect covers `s`.
        
        // Filter symbols that are NOT covered yet.
        // BUT we need to check `board`.
        // Wait, checking `board` for covered symbols is slow.
        // Better: Pass `usedSymbols` set.
        
        // Wait, iterating symbols is good, but what if the region for a symbol doesn't start at (fr, fc)?
        // Impossible. The first empty cell (top-left scan) MUST be the top-left corner of SOME region.
        // So we define the region starting at (fr, fc).
        // It must enclose exactly one symbol.
        
        // Heuristic: Iterate all possible Width/Height for a rect at (fr, fc).
        // Check if valid (inside bounds, no overlap).
        // Check if it contains exactly 1 symbol.
        // Check if dimensions match symbol type.
        
        // Possible W, H: 1..N
        // Limit search to reasonable sizes? No, full search.
        
        for(let h=1; fr+h <= size; h++) {
            for(let w=1; fc+w <= size; w++) {
                // Check if rect (fr, fc, w, h) overlaps with existing
                // Actually we only need to check if board is empty, since we fill sequentially.
                if (!isRectEmpty(board, fr, fc, w, h)) break; // if row `fr` blocked at `fc+w`, wider won't work.
                // Actually `isRectEmpty` scans area.
                
                // Check symbols inside
                const enclosed = getEnclosedSymbol(fr, fc, w, h, symbols);
                if (enclosed === null) continue; // No symbol or multiple symbols
                
                // Check type
                const type = enclosed.type;
                let ok = false;
                if (type === '+' && w === h) ok = true;
                if (type === '-' && w > h) ok = true;
                if (type === '|' && h > w) ok = true;
                
                if (ok) {
                    // Place
                    fillBoard(board, fr, fc, w, h, enclosed.id); // using symbol index as ID
                    const res = backtrack(fr, fc+w < size ? fr : fr+1, 0, board, size, symbols); 
                    // Wait, next search should start from current pos or just scan again?
                    // Scanning again is safer.
                    if (res) return res;
                    // Backtrack
                    clearBoard(board, fr, fc, w, h);
                }
            }
        }
        return null;
    }

    function isRectEmpty(board, r, c, w, h) {
        for(let i=0; i<h; i++) {
            for(let j=0; j<w; j++) {
                if (board[r+i][c+j] !== -1) return false;
            }
        }
        return true;
    }

    function getEnclosedSymbol(r, c, w, h, symbols) {
        let found = null;
        for(let i=0; i<symbols.length; i++) {
            const s = symbols[i];
            // Check if s is inside rect
            if (s.r >= r && s.r < r+h && s.c >= c && s.c < c+w) {
                if (found) return null; // Multiple
                found = { ...s, id: i };
            }
        }
        return found;
    }

    function fillBoard(board, r, c, w, h, id) {
        for(let i=0; i<h; i++) for(let j=0; j<w; j++) board[r+i][c+j] = id;
    }

    function clearBoard(board, r, c, w, h) {
        for(let i=0; i<h; i++) for(let j=0; j<w; j++) board[r+i][c+j] = -1;
    }

    function checkCornerConstraint(board, size) {
        for(let i=0; i<size-1; i++) {
            for(let j=0; j<size-1; j++) {
                const v1 = board[i][j];
                const v2 = board[i][j+1];
                const v3 = board[i+1][j];
                const v4 = board[i+1][j+1];
                if (v1 !== v2 && v1 !== v3 && v1 !== v4 && 
                    v2 !== v3 && v2 !== v4 && v3 !== v4) {
                    // 4 different regions meet at corner?
                    // Rule: "No four regions meet at a point"
                    // This means grid lines form a cross.
                    // This happens if board[i][j], board[i][j+1], board[i+1][j], board[i+1][j+1] are ALL DIFFERENT.
                    return false;
                }
            }
        }
        return true;
    }

    function extractRegions(board, size) {
        // Convert board IDs back to rects for rendering borders
        const regions = [];
        const seen = new Set();
        for(let i=0; i<size; i++) {
            for(let j=0; j<size; j++) {
                const id = board[i][j];
                if (!seen.has(id)) {
                    seen.add(id);
                    // Find width/height
                    let w=0, h=0;
                    while(j+w < size && board[i][j+w] === id) w++;
                    while(i+h < size && board[i+h][j] === id) h++;
                    regions.push({r:i, c:j, w, h});
                }
            }
        }
        return regions;
    }

    init();
});



















