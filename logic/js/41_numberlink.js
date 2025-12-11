// numberlink.js

document.addEventListener('DOMContentLoaded', function() {
    const gridEl = document.getElementById('numberlink-grid');
    const rInput = document.getElementById('grid-rows');
    const cInput = document.getElementById('grid-cols');
    const createBtn = document.getElementById('create-grid');
    const solveBtn = document.getElementById('solve-btn');
    const clearBtn = document.getElementById('clear-btn');
    const msg = document.getElementById('result-message');
    const numBtns = document.querySelectorAll('.num-btn');
    const loading = document.getElementById('loading');
    
    let rows = 8;
    let cols = 8;
    let gridData = []; 
    let selectedCell = null;

    initGrid(rows, cols);

    createBtn.addEventListener('click', () => initGrid(parseInt(rInput.value), parseInt(cInput.value)));
    
    clearBtn.addEventListener('click', () => {
        gridData.forEach(row => row.forEach(cell => cell.val = null));
        renderAll();
    });

    function initGrid(r, c) {
        rows = r; cols = c;
        gridEl.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
        gridEl.innerHTML = '';
        
        gridData = Array(r).fill().map(() => Array(c).fill(null).map(() => ({
            val: null,
            path: null // for solution visualization
        })));

        for(let i=0; i<r; i++) {
            for(let j=0; j<c; j++) {
                const cell = document.createElement('div');
                cell.className = 'numberlink-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                cell.addEventListener('click', () => selectCell(i, j));
                gridEl.appendChild(cell);
            }
        }
        selectedCell = null;
    }

    function selectCell(r, c) {
        const prev = document.querySelector('.numberlink-cell.active-input');
        if (prev) prev.classList.remove('active-input');
        selectedCell = {r, c};
        const cell = document.querySelector(`.numberlink-cell[data-r="${r}"][data-c="${c}"]`);
        if (cell) cell.classList.add('active-input');
    }

    function setNumber(num) {
        if (!selectedCell) return;
        const {r, c} = selectedCell;
        gridData[r][c].val = num;
        renderCell(r, c);
    }

    document.addEventListener('keydown', (e) => {
        if (!selectedCell) return;
        if (e.key >= '1' && e.key <= '9') setNumber(parseInt(e.key));
        else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') setNumber(null);
        
        // Navigation
        if (e.key.startsWith('Arrow')) {
            let {r, c} = selectedCell;
            if (e.key === 'ArrowUp' && r > 0) r--;
            if (e.key === 'ArrowDown' && r < rows-1) r++;
            if (e.key === 'ArrowLeft' && c > 0) c--;
            if (e.key === 'ArrowRight' && c < cols-1) c++;
            selectCell(r, c);
        }
    });

    numBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const txt = btn.textContent;
            if (txt === 'Backspace') setNumber(null);
            else setNumber(parseInt(txt));
        });
    });

    function renderCell(r, c) {
        const cell = document.querySelector(`.numberlink-cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) return;
        const d = gridData[r][c];
        cell.textContent = d.val || '';
        
        // If path exists (solution), overlay SVG
        if (d.path) {
            // ... render path logic ...
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
            msg.textContent = 'Solver would connect matching numbers.';
        }, 500);
    });
});

