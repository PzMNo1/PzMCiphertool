// rippleeffect.js

document.addEventListener('DOMContentLoaded', function() {
    const gridEl = document.getElementById('rippleeffect-grid');
    const rInput = document.getElementById('grid-rows');
    const cInput = document.getElementById('grid-cols');
    const createBtn = document.getElementById('create-grid');
    const solveBtn = document.getElementById('solve-btn');
    const clearBtn = document.getElementById('clear-btn');
    const msg = document.getElementById('result-message');
    const numBtns = document.querySelectorAll('.num-btn');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const loading = document.getElementById('loading');
    
    let rows = 10;
    let cols = 10;
    let gridData = []; 
    let currentMode = 'border';
    let selectedCell = null;

    initGrid(rows, cols);

    createBtn.addEventListener('click', () => initGrid(parseInt(rInput.value), parseInt(cInput.value)));
    
    clearBtn.addEventListener('click', () => {
        gridData.forEach(row => row.forEach(cell => {
            cell.val = null;
            cell.borders = {t:false, b:false, l:false, r:false};
        }));
        setOuterBorders();
        renderAll();
    });

    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            if(currentMode === 'border') {
                if(document.querySelector('.active-input')) 
                    document.querySelector('.active-input').classList.remove('active-input');
                selectedCell = null;
            }
        });
    });

    function initGrid(r, c) {
        rows = r; cols = c;
        gridEl.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
        gridEl.innerHTML = '';
        
        gridData = Array(r).fill().map(() => Array(c).fill(null).map(() => ({
            val: null,
            borders: {t:false, b:false, l:false, r:false}
        })));
        
        setOuterBorders();

        for(let i=0; i<r; i++) {
            for(let j=0; j<c; j++) {
                const cell = document.createElement('div');
                cell.className = 'ripple-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                cell.addEventListener('click', (e) => handleCellClick(i, j, e, cell));
                gridEl.appendChild(cell);
            }
        }
        selectedCell = null;
        renderAll();
    }

    function setOuterBorders() {
        for(let i=0; i<rows; i++) {
            gridData[i][0].borders.l = true;
            gridData[i][cols-1].borders.r = true;
        }
        for(let j=0; j<cols; j++) {
            gridData[0][j].borders.t = true;
            gridData[rows-1][j].borders.b = true;
        }
    }

    function handleCellClick(r, c, e, cell) {
        if (currentMode === 'border') {
            const rect = cell.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;
            const threshold = 15;

            if (x < threshold && c > 0) toggleBorder(r, c, 'l');
            else if (x > w - threshold && c < cols-1) toggleBorder(r, c, 'r');
            else if (y < threshold && r > 0) toggleBorder(r, c, 't');
            else if (y > h - threshold && r < rows-1) toggleBorder(r, c, 'b');
        } else {
            selectCell(r, c);
        }
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

    function selectCell(r, c) {
        const prev = document.querySelector('.ripple-cell.active-input');
        if (prev) prev.classList.remove('active-input');
        selectedCell = {r, c};
        const cell = document.querySelector(`.ripple-cell[data-r="${r}"][data-c="${c}"]`);
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
        if (e.key >= '0' && e.key <= '9') setNumber(parseInt(e.key));
        else if (e.key === 'Backspace' || e.key === 'Delete') setNumber(null);
        
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
            if (txt === 'Delete') setNumber(null);
            else setNumber(parseInt(txt));
        });
    });

    function renderCell(r, c) {
        const cell = document.querySelector(`.ripple-cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) return;
        const d = gridData[r][c];
        
        cell.className = 'ripple-cell';
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

