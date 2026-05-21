// nurimisaki.js

document.addEventListener('DOMContentLoaded', function() {
    const gridEl = document.getElementById('nurimisaki-grid');
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
    let gridData = []; 
    let selectedCell = null;

    initGrid(rows, cols);

    createBtn.addEventListener('click', () => initGrid(parseInt(rInput.value), parseInt(cInput.value)));
    
    clearBtn.addEventListener('click', () => {
        gridData.forEach(row => row.forEach(cell => {
            cell.val = null;
            cell.state = 'unknown';
        }));
        renderAll();
    });

    function initGrid(r, c) {
        rows = r; cols = c;
        gridEl.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
        gridEl.innerHTML = '';
        
        gridData = Array(r).fill().map(() => Array(c).fill(null).map(() => ({
            val: null,
            state: 'unknown' // 'shaded', 'white', 'unknown'
        })));

        for(let i=0; i<r; i++) {
            for(let j=0; j<c; j++) {
                const cell = document.createElement('div');
                cell.className = 'nurimisaki-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                cell.addEventListener('click', () => selectCell(i, j));
                cell.addEventListener('contextmenu', (e) => { e.preventDefault(); toggleShade(i, j); });
                gridEl.appendChild(cell);
            }
        }
        selectedCell = null;
    }

    function selectCell(r, c) {
        const prev = document.querySelector('.nurimisaki-cell.active-input');
        if (prev) prev.classList.remove('active-input');
        selectedCell = {r, c};
        const cell = document.querySelector(`.nurimisaki-cell[data-r="${r}"][data-c="${c}"]`);
        if (cell) cell.classList.add('active-input');
    }

    function toggleShade(r, c) {
        const d = gridData[r][c];
        if (d.state === 'unknown') d.state = 'shaded';
        else if (d.state === 'shaded') d.state = 'white';
        else d.state = 'unknown';
        renderCell(r, c);
    }

    function setNumber(num) {
        if (!selectedCell) return;
        const {r, c} = selectedCell;
        gridData[r][c].val = num;
        if (num !== null) gridData[r][c].state = 'white'; // Clues are unshaded
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
        const cell = document.querySelector(`.nurimisaki-cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) return;
        const d = gridData[r][c];
        
        cell.className = 'nurimisaki-cell';
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) cell.classList.add('active-input');
        
        if (d.state === 'shaded') cell.classList.add('shaded');
        else if (d.state === 'white') cell.classList.add('white');
        
        if (d.val !== null) {
            cell.textContent = d.val;
            cell.classList.add('clue');
        } else {
            cell.textContent = '';
            if (d.state === 'white') cell.textContent = '•';
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
            msg.textContent = 'Solver pending.';
        }, 500);
    });
});

