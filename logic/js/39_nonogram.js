//这是nonogram的js代码

document.addEventListener('DOMContentLoaded', function() {
    const rInput = document.getElementById('grid-rows'), cInput = document.getElementById('grid-cols'),
          createBtn = document.getElementById('create-grid'), solveBtn = document.getElementById('solve-btn'),
          resetBtn = document.getElementById('reset-btn'), msg = document.getElementById('result-message'),
          grid = document.getElementById('nonogram-grid'), designBtn = document.getElementById('design-mode'),
          solutionBtn = document.getElementById('solution-mode'), prevBtn = document.getElementById('prev-solution'),
          nextBtn = document.getElementById('next-solution'), solCount = document.getElementById('solution-count'),
          solNav = document.getElementById('solution-nav');
    let mode = 'design', design = [], sols = [], solIdx = 0, clues = {rows:{}, cols:{}};
    
    designBtn.addEventListener('click', function() {
        if (mode !== 'design') {
            mode = 'design'; designBtn.classList.add('active'); solutionBtn.classList.remove('active');
            updateGrid();
        }
    });
    
    solutionBtn.addEventListener('click', function() {
        if (mode !== 'solution' && sols.length > 0) {
            mode = 'solution'; solutionBtn.classList.add('active'); designBtn.classList.remove('active');
            solNav.style.display = 'flex'; updateSolNav(); updateGrid();
        } else if (sols.length === 0) {
            msg.textContent = '请先求解谜题获取解决方案';
        }
    });
    
    prevBtn.addEventListener('click', function() {
        if (sols.length > 1) {
            solIdx = (solIdx - 1 + sols.length) % sols.length;
            updateSolNav(); updateGrid();
        }
    });
    
    nextBtn.addEventListener('click', function() {
        if (sols.length > 1) {
            solIdx = (solIdx + 1) % sols.length;
            updateSolNav(); updateGrid();
        }
    });
    
    function updateSolNav() {
        if (sols.length > 0) solCount.textContent = `解决方案 ${solIdx + 1}/${sols.length}`;
    }
    
    createBtn.addEventListener('click', function() {
        const r = parseInt(rInput.value), c = parseInt(cInput.value);
        if (r < 1 || r > 20 || c < 1 || c > 20) {
            msg.textContent = '请输入1到20之间的网格尺寸'; return;
        }
        sols = []; design = []; clues = {rows:{}, cols:{}};
        mode = 'design'; designBtn.classList.add('active'); solutionBtn.classList.remove('active');
        createGrid(r, c);
        msg.textContent = '点击单元格设计谜题，或直接在行列线索框中输入数字（用空格分隔）';
    });
    
    function createGrid(r, c) {
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `auto repeat(${c}, 1fr)`;
        grid.style.gridTemplateRows = `auto repeat(${r}, 1fr)`;
        const corner = document.createElement('div');
        corner.className = 'nonogram-cell corner-cell';
        grid.appendChild(corner);
        for (let j = 0; j < c; j++) {
            const clueCell = document.createElement('div');
            clueCell.className = 'nonogram-cell clue-cell';
            clueCell.id = `col-clue-container-${j}`;
            const input = document.createElement('input');
            input.type = 'text'; input.className = 'clue-input';
            input.id = `col-clue-${j}`; input.placeholder = '线索';
            input.addEventListener('input', function() { clues.cols[j] = this.value; });
            
            clueCell.appendChild(input);
            grid.appendChild(clueCell);
        }
        
        for (let i = 0; i < r; i++) {
            const rowClueCell = document.createElement('div');
            rowClueCell.className = 'nonogram-cell clue-cell';
            rowClueCell.id = `row-clue-container-${i}`;
            const input = document.createElement('input');
            input.type = 'text'; input.className = 'clue-input';
            input.id = `row-clue-${i}`; input.placeholder = '线索';
            input.addEventListener('input', function() { clues.rows[i] = this.value; });
            rowClueCell.appendChild(input);
            grid.appendChild(rowClueCell);
            
            for (let j = 0; j < c; j++) {
                const cell = document.createElement('div');
                cell.className = 'nonogram-cell';
                cell.dataset.row = i; cell.dataset.col = j;
                cell.addEventListener('click', () => {
                    if (mode === 'design') toggleCell(cell, i, j);
                });
                grid.appendChild(cell);
            }
        }
    }
    
    function toggleCell(cell, row, col) {
        if (mode === 'solution') {
            mode = 'design'; designBtn.classList.add('active'); solutionBtn.classList.remove('active');
            solNav.style.display = 'none';
            if (sols.length > 0) {
                design = [...sols[solIdx]]; updateGrid();
            }
            msg.textContent = '已切换回设计模式';
        }
        
        const isFilled = cell.classList.toggle('filled');
        const point = [row + 1, col + 1];
        const idx = design.findIndex(p => p[0] === point[0] && p[1] === point[1]);
        
        if (isFilled && idx === -1) design.push(point);
        else if (!isFilled && idx !== -1) design.splice(idx, 1);
        
        updateClues();
    }
    
    function updateClues() {
        const r = parseInt(rInput.value), c = parseInt(cInput.value);
        
        for (let i = 0; i < r; i++) {
            const rowInput = document.getElementById(`row-clue-${i}`);
            if (!clues.rows[i]) {
                const rowClues = calcClues(design.filter(p => p[0] === i+1), 'row', c);
                rowInput.value = rowClues.join(' ');
            }
        }
        
        for (let j = 0; j < c; j++) {
            const colInput = document.getElementById(`col-clue-${j}`);
            if (!clues.cols[j]) {
                const colClues = calcClues(design.filter(p => p[1] === j+1), 'col', r);
                colInput.value = colClues.join(' ');
            }
        }
    }
    
    function calcClues(points, type, len) {
        const filled = new Array(len).fill(false);
        for (const p of points) filled[type === 'row' ? p[1] - 1 : p[0] - 1] = true;
        
        const cls = []; let count = 0;
        for (let i = 0; i < filled.length; i++) {
            if (filled[i]) count++;
            else if (count > 0) { cls.push(count); count = 0; }
        }
        if (count > 0) cls.push(count);
        return cls.length ? cls : [0];
    }
    
    function updateGrid() {
        const cells = document.querySelectorAll('.nonogram-cell:not(.clue-cell):not(.corner-cell)');
        cells.forEach(cell => cell.classList.remove('filled'));
        
        if (mode === 'design') {
            for (const p of design) {
                const cell = document.querySelector(`.nonogram-cell[data-row="${p[0]-1}"][data-col="${p[1]-1}"]`);
                if (cell) cell.classList.add('filled');
            }
            solNav.style.display = 'none';
        } else if (mode === 'solution') {
            const sol = sols[solIdx] || [];
            for (const p of sol) {
                const cell = document.querySelector(`.nonogram-cell[data-row="${p[0]-1}"][data-col="${p[1]-1}"]`);
                if (cell) cell.classList.add('filled');
            }
            solNav.style.display = 'flex';
        }
    }
    
    function collectClues() {
        const r = parseInt(rInput.value), c = parseInt(cInput.value);
        const rowClues = {}, colClues = {};
        
        for (let i = 0; i < r; i++) {
            const input = document.getElementById(`row-clue-${i}`);
            if (input.value.trim()) rowClues[i] = input.value.trim();
        }
        
        for (let j = 0; j < c; j++) {
            const input = document.getElementById(`col-clue-${j}`);
            if (input.value.trim()) colClues[j] = input.value.trim();
        }
        
        return {rowClues, colClues};
    }
    
    solveBtn.addEventListener('click', function() {
        const r = parseInt(rInput.value), c = parseInt(cInput.value);
        const {rowClues, colClues} = collectClues();
        
        if (Object.keys(rowClues).length === 0 || Object.keys(colClues).length === 0) {
            msg.textContent = '请提供至少一行和一列的线索'; return;
        }
        
        msg.textContent = '求解中...';
        
        const parsedRowClues = {}, parsedColClues = {};
        for (const [idx, str] of Object.entries(rowClues))
            parsedRowClues[idx] = str.split(' ').map(n => parseInt(n)).filter(n => !isNaN(n));
        
        for (const [idx, str] of Object.entries(colClues))
            parsedColClues[idx] = str.split(' ').map(n => parseInt(n)).filter(n => !isNaN(n));
        
        setTimeout(() => {
            try {
                sols = solveNonogram(r, c, parsedRowClues, parsedColClues);
                
                if (sols.length > 0) {
                    solIdx = 0; mode = 'solution';
                    solutionBtn.classList.add('active'); designBtn.classList.remove('active');
                    updateSolNav(); updateGrid();
                    msg.textContent = `成功找到 ${sols.length} 个解决方案！`;
                } else {
                    msg.textContent = '无法找到符合线索的解决方案，请检查线索是否正确。';
                }
            } catch (error) {
                msg.textContent = '求解过程出错: ' + error.message;
            }
        }, 500);
    });
    
    function solveNonogram(r, c, rowCls, colCls) {
        if (design.length > 0 && validateSol(design, r, c, rowCls, colCls)) return [[...design]];
        
        let g = Array(r).fill().map(() => Array(c).fill(0));
        g = applyLogic(g, r, c, rowCls, colCls);
        
        const allSols = [];
        backtrack(g, 0, 0, allSols);
        
        return allSols.map(sol => {
            const points = [];
            for (let i = 0; i < r; i++)
                for (let j = 0; j < c; j++)
                    if (sol[i][j] === 1) points.push([i+1, j+1]);
            return points;
        });
        
        function applyLogic(g, r, c, rowCls, colCls) {
            const ng = g.map(row => [...row]);
            
            for (let i = 0; i < r; i++) {
                if (!rowCls[i]) continue;
                const cls = rowCls[i];
                if (cls.length === 1 && cls[0] === c)
                    for (let j = 0; j < c; j++) ng[i][j] = 1;
                else if (cls.length === 0 || (cls.length === 1 && cls[0] === 0))
                    for (let j = 0; j < c; j++) ng[i][j] = -1;
            }
            
            for (let j = 0; j < c; j++) {
                if (!colCls[j]) continue;
                const cls = colCls[j];
                if (cls.length === 1 && cls[0] === r)
                    for (let i = 0; i < r; i++) ng[i][j] = 1;
                else if (cls.length === 0 || (cls.length === 1 && cls[0] === 0))
                    for (let i = 0; i < r; i++) ng[i][j] = -1;
            }
            
            return ng;
        }
        
        function backtrack(g, row, col, allSols) {
            if (allSols.length >= 10) return true;
            if (row >= r) {
                if (isValidSol(g)) allSols.push(g.map(row => [...row]));
                return allSols.length >= 10;
            }
            
            const nr = col < c - 1 ? row : row + 1;
            const nc = col < c - 1 ? col + 1 : 0;
            
            if (g[row][col] !== 0) return backtrack(g, nr, nc, allSols);
            
            g[row][col] = 1;
            if (isPartialValid(g, row, col, rowCls, colCls))
                if (backtrack(g, nr, nc, allSols)) return true;
            
            g[row][col] = -1;
            if (isPartialValid(g, row, col, rowCls, colCls))
                if (backtrack(g, nr, nc, allSols)) return true;
            
            g[row][col] = 0;
            return false;
        }
        
        function isPartialValid(g, row, col, rowCls, colCls) {
            if (col === c - 1 || col === 0) {
                const rs = g[row].map(cell => cell === 1 ? 1 : 0);
                const rg = countGroups(rs);
                const eg = rowCls[row] || [0];
                
                if (!rs.includes(0) && !arrEqual(rg, eg)) return false;
                if (rg.length > eg.length) return false;
                
                for (let i = 0; i < rg.length - 1; i++)
                    if (rg[i] !== eg[i]) return false;
                
                if (rg.length > 0 && rg[rg.length - 1] > eg[rg.length - 1])
                    return false;
            }
            
            if (row === r - 1 || row === 0) {
                const cs = [];
                for (let i = 0; i < r; i++) cs.push(g[i][col] === 1 ? 1 : 0);
                const cg = countGroups(cs);
                const eg = colCls[col] || [0];
                
                if (!cs.includes(0) && !arrEqual(cg, eg)) return false;
                if (cg.length > eg.length) return false;
                
                for (let i = 0; i < cg.length - 1; i++)
                    if (cg[i] !== eg[i]) return false;
                
                if (cg.length > 0 && cg[cg.length - 1] > eg[cg.length - 1])
                    return false;
            }
            
            return true;
        }
        
        function isValidSol(g) {
            for (let i = 0; i < r; i++) {
                const rs = g[i].map(cell => cell === 1 ? 1 : 0);
                const rg = countGroups(rs);
                const eg = rowCls[i] || [0];
                if (!arrEqual(rg, eg)) return false;
            }
            
            for (let j = 0; j < c; j++) {
                const cs = [];
                for (let i = 0; i < r; i++) cs.push(g[i][j] === 1 ? 1 : 0);
                const cg = countGroups(cs);
                const eg = colCls[j] || [0];
                if (!arrEqual(cg, eg)) return false;
            }
            
            return true;
        }
        
        function countGroups(arr) {
            const g = []; let count = 0;
            
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] === 1) count++;
                else if (count > 0) { g.push(count); count = 0; }
            }
            
            if (count > 0) g.push(count);
            return g.length ? g : [0];
        }
        
        function validateSol(d, r, c, rowCls, colCls) {
            const g = Array(r).fill().map(() => Array(c).fill(-1));
            for (const p of d) {
                const ri = p[0] - 1, ci = p[1] - 1;
                if (ri >= 0 && ri < r && ci >= 0 && ci < c) g[ri][ci] = 1;
            }
            return isValidSol(g);
        }
        
        function arrEqual(a, b) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
            return true;
        }
    }
    
    resetBtn.addEventListener('click', function() {
        grid.innerHTML = '';
        design = []; sols = []; solIdx = 0; clues = {rows:{}, cols:{}};
        mode = 'design'; designBtn.classList.add('active'); solutionBtn.classList.remove('active');
        solNav.style.display = 'none';
        msg.textContent = '请创建网格并设计您的Nonogram谜题';
        
        const r = parseInt(rInput.value), c = parseInt(cInput.value);
        createGrid(r, c);
    });
    
    createGrid(10, 10);
});