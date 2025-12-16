// nanro.js

document.addEventListener('DOMContentLoaded', function() {
    const gridEl = document.getElementById('nanro-grid');
    const rInput = document.getElementById('grid-rows');
    const cInput = document.getElementById('grid-cols');
    const createBtn = document.getElementById('create-grid');
    const solveBtn = document.getElementById('solve-btn');
    const clearBtn = document.getElementById('clear-btn');
    const msg = document.getElementById('result-message');
    const numBtns = document.querySelectorAll('.num-btn');
    const loading = document.getElementById('loading');
    
    let rows = 10;
    let cols = 10;
    let gridData = []; // Stores {val, borders: {t,b,l,r}, state}
    let selectedCell = null; // {r, c}

    // Initialize
    initGrid(rows, cols);

    createBtn.addEventListener('click', () => initGrid(parseInt(rInput.value), parseInt(cInput.value)));
    
    clearBtn.addEventListener('click', () => {
        gridData.forEach(row => row.forEach(cell => {
            cell.val = null;
            cell.state = 'unknown';
            cell.borders = {t:false, b:false, l:false, r:false};
        }));
        renderAll();
    });

    function initGrid(r, c) {
        rows = r; cols = c;
        gridEl.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
        gridEl.innerHTML = '';
        
        gridData = Array(r).fill().map(() => Array(c).fill(null).map(() => ({
            val: null,
            borders: {t:false, b:false, l:false, r:false}, // 'border' means THICK region border
            state: 'unknown' // 'shaded', 'unshaded'
        })));
        
        // Default borders: Outline of the grid
        for(let i=0; i<r; i++) {
            gridData[i][0].borders.l = true;
            gridData[i][c-1].borders.r = true;
        }
        for(let j=0; j<c; j++) {
            gridData[0][j].borders.t = true;
            gridData[r-1][j].borders.b = true;
        }

        for(let i=0; i<r; i++) {
            for(let j=0; j<c; j++) {
                const cell = document.createElement('div');
                cell.className = 'nanro-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                
                // Events
                cell.addEventListener('click', (e) => handleCellClick(i, j, e, cell));
                cell.addEventListener('contextmenu', (e) => { 
                    e.preventDefault(); 
                    toggleShade(i, j); 
                });
                
                gridEl.appendChild(cell);
            }
        }
        selectedCell = null;
        renderAll();
    }

    function handleCellClick(r, c, e, cell) {
        // Check if click is near edge for border toggling
        const rect = cell.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;
        const threshold = 10; // pixels

        // If clicked very close to edge, toggle border
        if (x < threshold && c > 0) toggleBorder(r, c, 'l');
        else if (x > w - threshold && c < cols-1) toggleBorder(r, c, 'r');
        else if (y < threshold && r > 0) toggleBorder(r, c, 't');
        else if (y > h - threshold && r < rows-1) toggleBorder(r, c, 'b');
        else {
            // Select cell for input
            selectCell(r, c);
        }
    }

    function selectCell(r, c) {
        // Clear previous selection
        const prev = document.querySelector('.nanro-cell.active-input');
        if (prev) prev.classList.remove('active-input');
        
        selectedCell = {r, c};
        const cell = document.querySelector(`.nanro-cell[data-r="${r}"][data-c="${c}"]`);
        if (cell) cell.classList.add('active-input');
    }

    function toggleBorder(r, c, side) {
        const d = gridData[r][c];
        if (side === 'l' && c > 0) {
            const v = !d.borders.l;
            d.borders.l = v;
            gridData[r][c-1].borders.r = v;
        } else if (side === 'r' && c < cols-1) {
            const v = !d.borders.r;
            d.borders.r = v;
            gridData[r][c+1].borders.l = v;
        } else if (side === 't' && r > 0) {
            const v = !d.borders.t;
            d.borders.t = v;
            gridData[r-1][c].borders.b = v;
        } else if (side === 'b' && r < rows-1) {
            const v = !d.borders.b;
            d.borders.b = v;
            gridData[r+1][c].borders.t = v;
        }
        renderAll();
    }

    function toggleShade(r, c) {
        const s = gridData[r][c].state;
        gridData[r][c].state = s === 'shaded' ? 'unknown' : 'shaded'; // Toggle
        renderCell(r, c);
    }

    function setNumber(num) {
        if (!selectedCell) return;
        const {r, c} = selectedCell;
        gridData[r][c].val = num;
        renderCell(r, c);
    }

    // Keyboard Input
    document.addEventListener('keydown', (e) => {
        if (!selectedCell) return;
        if (e.key >= '0' && e.key <= '9') {
            setNumber(parseInt(e.key) || null); // 0 usually clears or just 0
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            setNumber(null);
        } else if (e.key === 'ArrowUp' && selectedCell.r > 0) selectCell(selectedCell.r-1, selectedCell.c);
        else if (e.key === 'ArrowDown' && selectedCell.r < rows-1) selectCell(selectedCell.r+1, selectedCell.c);
        else if (e.key === 'ArrowLeft' && selectedCell.c > 0) selectCell(selectedCell.r, selectedCell.c-1);
        else if (e.key === 'ArrowRight' && selectedCell.c < cols-1) selectCell(selectedCell.r, selectedCell.c+1);
    });

    // On-screen keypad
    numBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const txt = btn.textContent;
            if (txt === 'Backspace') setNumber(null);
            else setNumber(parseInt(txt));
        });
    });

    function renderCell(r, c) {
        const cell = document.querySelector(`.nanro-cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) return;
        const d = gridData[r][c];
        
        // Borders
        cell.className = 'nanro-cell';
        if (d.borders.t) cell.classList.add('border-top');
        if (d.borders.b) cell.classList.add('border-bottom');
        if (d.borders.l) cell.classList.add('border-left');
        if (d.borders.r) cell.classList.add('border-right');
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) cell.classList.add('active-input');
        if (d.state === 'shaded') cell.classList.add('shaded');
        if (d.val !== null) {
            cell.textContent = d.val;
            cell.classList.add('clue');
        } else {
            cell.textContent = '';
        }
    }

    function renderAll() {
        for(let i=0; i<rows; i++) {
            for(let j=0; j<cols; j++) {
                renderCell(i, j);
            }
        }
    }

    solveBtn.addEventListener('click', () => {
        loading.style.display = 'flex';
        msg.textContent = 'Solving...';
        
        // Simulate Solver
        setTimeout(() => {
            loading.style.display = 'none';
            msg.textContent = 'Solver implementation pending server-side logic.';
            // Dummy: shade random cells
            // for(let i=0; i<rows; i++) for(let j=0; j<cols; j++) if(Math.random()>0.5) gridData[i][j].state = 'shaded';
            // renderAll();
        }, 500);
    });
});
