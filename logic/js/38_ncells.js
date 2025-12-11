// ncells.js

document.addEventListener('DOMContentLoaded', function() {
    const gridEl = document.getElementById('ncells-grid');
    const rInput = document.getElementById('grid-rows');
    const cInput = document.getElementById('grid-cols');
    const regionSizeInput = document.getElementById('region-size');
    const createBtn = document.getElementById('create-grid');
    const solveBtn = document.getElementById('solve-btn');
    const clearBtn = document.getElementById('clear-btn');
    const msg = document.getElementById('result-message');
    const numBtns = document.querySelectorAll('.num-btn');
    const loading = document.getElementById('loading');
    
    let rows = 10;
    let cols = 10;
    let gridData = []; 
    let selectedCell = null; 

    // Initialize
    initGrid(rows, cols);

    createBtn.addEventListener('click', () => initGrid(parseInt(rInput.value), parseInt(cInput.value)));
    
    clearBtn.addEventListener('click', () => {
        gridData.forEach(row => row.forEach(cell => {
            cell.val = null;
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
            borders: {t:false, b:false, l:false, r:false}
        })));
        
        // Default borders: Outline
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
                cell.className = 'ncells-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                
                cell.addEventListener('click', (e) => handleCellClick(i, j, e, cell));
                cell.addEventListener('contextmenu', (e) => { e.preventDefault(); }); // No shading in Ncells usually, but maybe region color?
                
                gridEl.appendChild(cell);
            }
        }
        selectedCell = null;
        renderAll();
    }

    function handleCellClick(r, c, e, cell) {
        const rect = cell.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;
        const threshold = 10; 

        if (x < threshold && c > 0) toggleBorder(r, c, 'l');
        else if (x > w - threshold && c < cols-1) toggleBorder(r, c, 'r');
        else if (y < threshold && r > 0) toggleBorder(r, c, 't');
        else if (y > h - threshold && r < rows-1) toggleBorder(r, c, 'b');
        else {
            selectCell(r, c);
        }
    }

    function selectCell(r, c) {
        const prev = document.querySelector('.ncells-cell.active-input');
        if (prev) prev.classList.remove('active-input');
        
        selectedCell = {r, c};
        const cell = document.querySelector(`.ncells-cell[data-r="${r}"][data-c="${c}"]`);
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

    function setNumber(num) {
        if (!selectedCell) return;
        const {r, c} = selectedCell;
        gridData[r][c].val = num;
        renderCell(r, c);
    }

    document.addEventListener('keydown', (e) => {
        if (!selectedCell) return;
        if (e.key >= '0' && e.key <= '9') {
            setNumber(parseInt(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            setNumber(null);
        } else if (e.key === 'ArrowUp' && selectedCell.r > 0) selectCell(selectedCell.r-1, selectedCell.c);
        else if (e.key === 'ArrowDown' && selectedCell.r < rows-1) selectCell(selectedCell.r+1, selectedCell.c);
        else if (e.key === 'ArrowLeft' && selectedCell.c > 0) selectCell(selectedCell.r, selectedCell.c-1);
        else if (e.key === 'ArrowRight' && selectedCell.c < cols-1) selectCell(selectedCell.r, selectedCell.c+1);
    });

    numBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const txt = btn.textContent;
            if (txt === 'Backspace') setNumber(null);
            else setNumber(parseInt(txt));
        });
    });

    function renderCell(r, c) {
        const cell = document.querySelector(`.ncells-cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) return;
        const d = gridData[r][c];
        
        cell.className = 'ncells-cell';
        if (d.borders.t) cell.classList.add('border-top');
        if (d.borders.b) cell.classList.add('border-bottom');
        if (d.borders.l) cell.classList.add('border-left');
        if (d.borders.r) cell.classList.add('border-right');
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) cell.classList.add('active-input');
        
        if (d.val !== null) {
            cell.textContent = d.val;
            cell.classList.add('clue');
        } else {
            cell.textContent = '';
        }
    }

    function renderAll() {
        for(let i=0; i<rows; i++) for(let j=0; j<cols; j++) renderCell(i, j);
    }

    solveBtn.addEventListener('click', () => {
        loading.style.display = 'flex';
        msg.textContent = 'Solving...';
        setTimeout(() => {
            loading.style.display = 'none';
            msg.textContent = 'Solver function placeholder.';
        }, 500);
    });
});
