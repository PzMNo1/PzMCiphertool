document.addEventListener('DOMContentLoaded', () => {
    const gridEl = document.getElementById('grid');
    const sizeInput = document.getElementById('size');
    const createBtn = document.getElementById('create-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const status = document.getElementById('status');

    let N = 8;
    let grid = []; // { clue: string, segments: {up, down, left, right} }
    // TLL is a loop on the cells (center-to-center).
    // We can represent it by connecting cell centers.
    // "Segments" means: does cell(i,j) connect to (i, j+1)?

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
        grid = Array(N).fill().map(() => Array(N).fill().map(() => ({ clue: '' })));

        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const cell = document.createElement('div');
                cell.className = 'tll-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                
                const input = document.createElement('input');
                input.className = 'clue-input';
                input.addEventListener('change', (e) => {
                    grid[i][j].clue = e.target.value;
                });
                cell.appendChild(input);
                gridEl.appendChild(cell);
            }
        }
    }

    // To render loop, we can use SVG overlay or just cell borders/center lines.
    // Center lines are easiest with SVG.
    function renderLoop(solution) {
        // Remove old svg if any
        const oldSvg = document.querySelector('.tll-svg');
        if(oldSvg) oldSvg.remove();

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('tll-svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';
        
        const cellSize = 40;
        const gap = 1;
        // Coordinate of center of cell (i, j):
        // x = j * (40 + 1) + 20
        // y = i * (40 + 1) + 20
        
        const getCenter = (r, c) => ({
            x: c * (cellSize + gap) + cellSize/2 + 10, // +10 for padding offset? Grid has padding 10px.
            y: r * (cellSize + gap) + cellSize/2 + 10
        });

        // Draw lines
        // Solution format: grid of booleans? No, solution usually tells connections.
        // My solver will return: for each cell, which neighbors it connects to.
        
        for(let r=0; r<N; r++) {
            for(let c=0; c<N; c++) {
                const conns = solution[r][c]; // ['top', 'bottom', ...]
                if (!conns) continue;
                const p1 = getCenter(r, c);
                
                conns.forEach(dir => {
                    let r2=r, c2=c;
                    if (dir === 'top') r2--;
                    if (dir === 'bottom') r2++;
                    if (dir === 'left') c2--;
                    if (dir === 'right') c2++;
                    
                    // Draw line to midpoint between cells? 
                    // Or just draw line to neighbor center if neighbor also connects.
                    // To avoid double drawing, only draw Right and Bottom.
                    if (dir === 'right' || dir === 'bottom') {
                         const p2 = getCenter(r2, c2);
                         const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                         line.setAttribute('x1', p1.x);
                         line.setAttribute('y1', p1.y);
                         line.setAttribute('x2', p2.x);
                         line.setAttribute('y2', p2.y);
                         line.setAttribute('stroke', '#40e0ff');
                         line.setAttribute('stroke-width', '4');
                         svg.appendChild(line);
                    }
                });
            }
        }
        
        document.querySelector('.tll-grid').appendChild(svg);
    }

    async function solve() {
        status.textContent = '求解中...';
        await new Promise(r => setTimeout(r, 50));

        const clues = {};
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                if (grid[i][j].clue) {
                    clues[`${i},${j}`] = grid[i][j].clue.split(/\D+/).filter(x=>x).map(Number);
                }
            }
        }

        const sol = solveTLL(N, clues);
        if (sol) {
            renderLoop(sol);
            status.textContent = '已解决!';
        } else {
            status.textContent = '无解';
        }
    }

    // --- Solver Logic ---
    function solveTLL(size, clues) {
        // Representation:
        // connections[r][c] = Set('top', 'bottom', 'left', 'right')
        // Each cell must have degree 0 or 2.
        // Single loop.
        
        let board = Array(size).fill().map(() => Array(size).fill().map(() => new Set()));
        
        return backtrack(0, 0, board, size, clues);
    }

    function backtrack(idx, count, board, size, clues) {
        // Linearize index
        const r = Math.floor(idx / size);
        const c = idx % size;
        
        if (idx === size * size) {
            // Finished placement
            if (checkClues(board, size, clues) && checkLoop(board, size)) return board;
            return null;
        }

        // Determine connections for (r, c)
        // We only decide 'right' and 'bottom' connections at this cell,
        // because 'left' and 'top' are already decided by previous cells.
        
        // Current state of (r, c) from previous neighbors
        const currentDeg = board[r][c].size;
        if (currentDeg > 2) return null; // Pruning
        
        // We can add Right connection?
        const canRight = (c < size - 1);
        // We can add Bottom connection?
        const canBottom = (r < size - 1);
        
        // Options:
        // 1. No new connections (Degree stays what it is)
        // 2. Add Right
        // 3. Add Bottom
        // 4. Add Right and Bottom
        
        // But we must satisfy degree constraint eventually (=2 or 0).
        // If currentDeg is 1, we MUST add exactly 1 more connection.
        // If currentDeg is 2, we CANNOT add more.
        // If currentDeg is 0, we can add 0 (stay 0) or 2 (become 2).
        
        // NOTE: We iterate cells. Decisions at (r,c) affect (r,c+1) and (r+1,c).
        
        const attempts = [];
        
        // Try adding NO new connections
        attempts.push({r:false, b:false});
        
        if (canRight) attempts.push({r:true, b:false});
        if (canBottom) attempts.push({r:false, b:true});
        if (canRight && canBottom) attempts.push({r:true, b:true});

        for (const opt of attempts) {
            // Apply
            if (opt.r) {
                board[r][c].add('right');
                board[r][c+1].add('left');
            }
            if (opt.b) {
                board[r][c].add('bottom');
                board[r+1][c].add('top');
            }
            
            // Check validity
            const d = board[r][c].size;
            let valid = true;
            // If we are done with this cell (idx moves on), degree MUST be 0 or 2
            // We are done adding connections to (r,c) after this step? 
            // Yes, because future steps only touch (r,c+1), (r+1,c) etc.
            if (d !== 0 && d !== 2) valid = false;
            
            // If valid, recurse
            if (valid) {
                // Optimization: Check partial clues?
                const res = backtrack(idx + 1, 0, board, size, clues);
                if (res) return res;
            }
            
            // Backtrack
            if (opt.r) {
                board[r][c].delete('right');
                board[r][c+1].delete('left');
            }
            if (opt.b) {
                board[r][c].delete('bottom');
                board[r+1][c].delete('top');
            }
        }
        return null;
    }

    function checkClues(board, size, clues) {
        for(const key in clues) {
            const [r, c] = key.split(',').map(Number);
            const expected = clues[key];
            
            // Tapa Loop clues count LENGTH of loop segments in 8 neighbors.
            // Neighbors: 8 cells.
            // Segment means: if the neighbor cell is PART OF THE LOOP.
            // A cell is part of the loop if degree > 0.
            
            const vals = [];
            const offsets = [[-1,-1],[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1]];
            for(const [dr, dc] of offsets) {
                const nr = r+dr, nc = c+dc;
                if(nr>=0 && nr<size && nc>=0 && nc<size) {
                    vals.push(board[nr][nc].size > 0 ? 1 : 0);
                } else {
                    vals.push(0); // Off grid is not loop
                }
            }
            
            // Calculate block lengths (same as Tapa)
            // Rotate to start 0
            if (vals.every(v => v === 1)) {
                 if (!(expected.length === 1 && expected[0] === 8)) return false;
                 continue;
            }
            if (vals.every(v => v === 0)) {
                // TLL empty clues?
                continue;
            }
            
            let rot = [...vals];
            while(rot[0] === 1) rot.push(rot.shift());
            
            const blocks = [];
            let cur = 0;
            for(const v of rot) {
                if (v === 1) cur++;
                else { if(cur>0) blocks.push(cur); cur=0; }
            }
            if (cur > 0) blocks.push(cur);
            
            blocks.sort((a,b)=>a-b);
            const expSorted = [...expected].sort((a,b)=>a-b);
            
            if (blocks.length !== expSorted.length) return false;
            for(let i=0; i<blocks.length; i++) if (blocks[i] !== expSorted[i]) return false;
        }
        return true;
    }

    function checkLoop(board, size) {
        // Must be single connected component (ignoring degree 0)
        let start = null;
        let count = 0;
        for(let i=0; i<size; i++) for(let j=0; j<size; j++) {
            if (board[i][j].size > 0) {
                if(!start) start = {r:i, c:j};
                count++;
            }
        }
        if (count === 0) return true; // Empty valid?
        
        let q = [start];
        let visited = new Set();
        visited.add(`${start.r},${start.c}`);
        let found = 0;
        
        while(q.length) {
            const curr = q.shift();
            found++;
            // Follow connections
            board[curr.r][curr.c].forEach(dir => {
                let nr = curr.r, nc = curr.c;
                if (dir === 'top') nr--;
                if (dir === 'bottom') nr++;
                if (dir === 'left') nc--;
                if (dir === 'right') nc++;
                
                if (!visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    q.push({r:nr, c:nc});
                }
            });
        }
        
        return found === count;
    }

    init();
});



















