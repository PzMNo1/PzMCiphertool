// nagare.js - Nagare Logic Puzzle Solver

document.addEventListener('DOMContentLoaded', function() {
    const rInput = document.getElementById('grid-rows');
    const cInput = document.getElementById('grid-cols');
    const createBtn = document.getElementById('create-grid');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const msg = document.getElementById('result-message');
    const grid = document.getElementById('nagare-grid');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const loading = document.getElementById('loading');

    let selectedTool = 'black'; // Default tool
    let gridData = []; 
    let solution = null;

    // Tool selection logic
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTool = btn.dataset.tool;
        });
    });

    createBtn.addEventListener('click', () => {
        const r = parseInt(rInput.value);
        const c = parseInt(cInput.value);
        createGrid(r, c);
    });

    resetBtn.addEventListener('click', () => {
        const r = parseInt(rInput.value);
        const c = parseInt(cInput.value);
        createGrid(r, c);
        msg.textContent = 'Grid reset.';
    });

    function createGrid(r, c) {
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
        // Max width constraint based on container
        
        gridData = Array(r).fill().map(() => Array(c).fill({ type: 'empty' }));
        solution = null;

        for (let i = 0; i < r; i++) {
            for (let j = 0; j < c; j++) {
                const cell = document.createElement('div');
                cell.className = 'nagare-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener('click', () => handleCellClick(i, j, cell));
                grid.appendChild(cell);
            }
        }
        msg.textContent = 'Design mode ready.';
    }

    function handleCellClick(r, c, cell) {
        const current = gridData[r][c];
        let newData = { type: 'empty' };

        if (selectedTool === 'empty') {
            newData = { type: 'empty' };
        } else if (current.type === selectedTool) {
             // Toggle off if clicking same tool
             newData = { type: 'empty' };
        } else {
            newData = { type: selectedTool };
        }
        
        gridData[r][c] = newData;
        updateCellVisual(cell, newData);
    }

    function updateCellVisual(cell, data) {
        cell.className = 'nagare-cell';
        cell.textContent = '';
        cell.style.backgroundImage = '';
        
        if (data.type === 'black') {
            cell.classList.add('black');
        } else if (data.type && data.type.startsWith('wind-')) {
            cell.classList.add('wind');
            const dir = data.type.split('-')[1];
            cell.textContent = getArrow(dir);
        } else if (data.type && data.type.startsWith('path-')) {
            cell.classList.add('path-clue');
            const dir = data.type.split('-')[1];
            // Small arrow logic
            cell.innerHTML = `<span style="font-size:0.8em">${getArrow(dir)}</span>`;
        } else if (data.type === 'solution-path') {
            cell.classList.add('solution-path');
            cell.innerHTML = getLineSvg(data.dirs);
        }
    }

    function getArrow(dir) {
        const map = { 'U': '↑', 'D': '↓', 'L': '←', 'R': '→' };
        return map[dir] || '';
    }

    function getLineSvg(dirs) {
        // dirs string like "UD", "UL"
        // Draw line through center
        let path = "";
        const c = 50; // Center %
        const u = "50,0", d = "50,100", l = "0,50", r = "100,50", m = "50,50";
        
        if (dirs.includes('U')) path += `M${m} L${u} `;
        if (dirs.includes('D')) path += `M${m} L${d} `;
        if (dirs.includes('L')) path += `M${m} L${l} `;
        if (dirs.includes('R')) path += `M${m} L${r} `;
        
        return `<svg viewBox="0 0 100 100"><path d="${path}" stroke="#2CB67D" stroke-width="15" stroke-linecap="round" fill="none" /></svg>`;
    }

    solveBtn.addEventListener('click', () => {
        loading.style.display = 'flex';
        msg.textContent = 'Solving...';
        
        // Simulate Async work
        setTimeout(() => {
            try {
                const sol = solveNagare(gridData);
                if (sol) {
                    msg.textContent = 'Solution found!';
                    renderSolution(sol);
                } else {
                    msg.textContent = 'No solution found.';
                }
            } catch(e) {
                msg.textContent = 'Error: ' + e.message;
            } finally {
                loading.style.display = 'none';
            }
        }, 500);
    });

    function renderSolution(solGrid) {
        const cells = document.querySelectorAll('.nagare-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const solCell = solGrid[r][c];
            
            // Preserve clues text if present, overlay line
            if (gridData[r][c].type !== 'empty' && gridData[r][c].type !== 'black') {
                // It's a clue, keep text but add background line if part of loop
                // For simplicity in this demo, we just draw the line if solution exists
            }
            
            if (solCell) {
                // Create SVG overlay
                const svg = getLineSvg(solCell);
                // If cell has content (clue), we want line BEHIND text
                if (cell.textContent) {
                    cell.innerHTML = svg + `<span style="position:relative; z-index:2">${cell.innerHTML}</span>`;
                } else {
                    cell.innerHTML = svg;
                }
            }
        });
    }

    // --- DUMMY SOLVER LOGIC (Placeholder) ---
    function solveNagare(inputGrid) {
        // Returns a grid of "UD", "LR" etc. strings or null
        const R = inputGrid.length;
        const C = inputGrid[0].length;
        const res = Array(R).fill().map(() => Array(C).fill(null));
        
        // Dummy Pattern: Simple Loop around the edges if no black cells
        for(let r=0; r<R; r++) {
            for(let c=0; c<C; c++) {
                if (inputGrid[r][c].type === 'black') continue;
                
                let dirs = "";
                // Simple rectangular loop logic for demo
                if (r === 0 && c > 0 && c < C-1) dirs = "LR";
                else if (r === R-1 && c > 0 && c < C-1) dirs = "LR";
                else if (c === 0 && r > 0 && r < R-1) dirs = "UD";
                else if (c === C-1 && r > 0 && r < R-1) dirs = "UD";
                else if (r===0 && c===0) dirs = "RD";
                else if (r===0 && c===C-1) dirs = "LD";
                else if (r===R-1 && c===0) dirs = "RU";
                else if (r===R-1 && c===C-1) dirs = "LU";
                
                // Random internal fills for demo look
                if (!dirs && Math.random() > 0.7) dirs = "UD";
                
                if(dirs) res[r][c] = dirs;
            }
        }
        return res;
    }
    
    createGrid(10, 10);
});
