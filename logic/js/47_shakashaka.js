// shakashaka.js

document.addEventListener('DOMContentLoaded', function() {
    const gridEl = document.getElementById('shakashaka-grid');
    const rInput = document.getElementById('grid-rows');
    const cInput = document.getElementById('grid-cols');
    const createBtn = document.getElementById('create-grid');
    const solveBtn = document.getElementById('solve-btn');
    const clearBtn = document.getElementById('clear-btn');
    const msg = document.getElementById('result-message');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const numBtns = document.querySelectorAll('.num-btn');
    const loading = document.getElementById('loading');
    
    let rows = 10;
    let cols = 10;
    let gridData = []; 
    let selectedTool = 'black';
    let selectedNumber = null; // for black cells

    initGrid(rows, cols);

    createBtn.addEventListener('click', () => initGrid(parseInt(rInput.value), parseInt(cInput.value)));
    
    clearBtn.addEventListener('click', () => {
        gridData.forEach(row => row.forEach(cell => {
            cell.type = 'empty';
            cell.val = null;
        }));
        renderAll();
    });

    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTool = btn.dataset.tool;
        });
    });

    numBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            numBtns.forEach(b => b.classList.remove('active')); // Optional visual feedback
            btn.classList.add('active');
            const txt = btn.textContent;
            selectedNumber = txt === 'None' ? null : parseInt(txt);
        });
    });

    function initGrid(r, c) {
        rows = r; cols = c;
        gridEl.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
        gridEl.innerHTML = '';
        
        gridData = Array(r).fill().map(() => Array(c).fill(null).map(() => ({
            type: 'empty', // 'empty', 'black', 'TL', 'TR', 'BL', 'BR'
            val: null // number for black cells
        })));

        for(let i=0; i<r; i++) {
            for(let j=0; j<c; j++) {
                const cell = document.createElement('div');
                cell.className = 'shakashaka-cell';
                cell.dataset.r = i;
                cell.dataset.c = j;
                cell.addEventListener('click', () => handleCellClick(i, j, cell));
                gridEl.appendChild(cell);
            }
        }
    }

    function handleCellClick(r, c, cell) {
        const d = gridData[r][c];
        
        if (selectedTool === 'black') {
            if (d.type === 'black' && d.val === selectedNumber) {
                // Toggle off or change number
                if (selectedNumber !== d.val) d.val = selectedNumber;
                else d.type = 'empty';
            } else {
                d.type = 'black';
                d.val = selectedNumber;
            }
        } else if (selectedTool === 'empty') {
            d.type = 'empty';
            d.val = null;
        } else {
            // Triangles
            if (d.type === selectedTool) d.type = 'empty';
            else d.type = selectedTool;
            d.val = null; // Triangles don't have numbers
        }
        renderCell(r, c);
    }

    function renderCell(r, c) {
        const cell = document.querySelector(`.shakashaka-cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) return;
        const d = gridData[r][c];
        
        cell.className = 'shakashaka-cell';
        if (d.type === 'black') {
            cell.classList.add('black');
            cell.textContent = d.val !== null ? d.val : '';
        } else if (d.type !== 'empty') {
            cell.classList.add(d.type);
            cell.textContent = '';
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
            msg.textContent = 'Solver pending.';
        }, 500);
    });
});

