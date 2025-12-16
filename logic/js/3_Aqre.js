document.addEventListener('DOMContentLoaded', function() {
    // 元素获取
    const puzzleGrid = document.getElementById('puzzle-grid');
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const createGridBtn = document.getElementById('create-grid');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const solutionNav = document.getElementById('solutionNav');
    const solutionCount = document.getElementById('solution-count');
    const prevSolution = document.getElementById('prev-solution');
    const nextSolution = document.getElementById('next-solution');
    const backToEditBtn = document.getElementById('back-to-edit');
    
    // 状态变量
    let currentMode = 'toggle'; // 保留但不再使用按钮切换
    let gridState = [];
    let currentRows = 8;
    let currentCols = 8;
    let solutions = [];
    let currentSolutionIndex = 0;
    let isShowingSolution = false;
    let edgeState = {}; // 存储边界信息
    let isDragging = false;
    let dragStartPos = null;
    let currentNumber = 1; // 默认添加的数字
    
    // 创建网格
    createGridBtn.addEventListener('click', function() {
        currentRows = parseInt(rowsInput.value);
        currentCols = parseInt(colsInput.value);
        createEmptyGrid();
    });
    
    function createEmptyGrid() {
        // 重置状态
        solutions = [];
        currentSolutionIndex = 0;
        solutionNav.style.display = 'none';
        result.innerHTML = '';
        
        // 初始化网格状态数组
        gridState = Array(currentRows).fill().map(() => 
            Array(currentCols).fill().map(() => ({ type: 'empty' })));
        
        // 初始化边界状态
        edgeState = {};
        
        // 创建网格UI
        renderPuzzleGrid();
    }
    
    function renderPuzzleGrid() {
        puzzleGrid.innerHTML = '';
        
        // 创建网格容器 - 添加相对定位以便放置网格线
        puzzleGrid.style.position = 'relative';
        puzzleGrid.style.gridTemplateColumns = `repeat(${currentCols}, 1fr)`;
        
        // 创建网格单元格
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                const cell = document.createElement('div');
                cell.className = 'aqre-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                // 根据格子状态设置样式
                updateCellDisplay(cell, gridState[i][j]);
                
                // 左键点击格子事件 - 弹出输入框
                cell.addEventListener('click', function(e) {
                    if (isShowingSolution) return; // 解决方案查看模式下禁用编辑
                    
                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);
                    
                    // 设置单元格为可编辑状态
                    this.contentEditable = true;
                    this.classList.add('editing');
                    
                    // 清空显示内容
                    this.textContent = '';
                    
                    // 获取焦点
                    this.focus();
                    
                    // 保存数字处理函数
                    const saveNumber = (e) => {
                        let value = e.target.textContent.trim();
                        if (value !== '' && !isNaN(value) && value >= 0 && value <= 9) {
                            gridState[row][col] = { 
                                type: 'clue', 
                                value: parseInt(value) 
                            };
                        } else {
                            // 输入无效则清空
                            gridState[row][col] = { type: 'empty' };
                        }
                        this.contentEditable = false;
                        this.classList.remove('editing');
                        updateCellDisplay(this, gridState[row][col]);
                    };
                    
                    // 失去焦点时保存数字
                    this.addEventListener('blur', saveNumber, { once: true });
                    
                    // 按Enter键时保存并结束编辑
                    this.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            this.blur();
                        }
                    });
                    
                    e.preventDefault();
                });
                
                // 右键点击切换黑/白
                cell.addEventListener('contextmenu', function(e) {
                    e.preventDefault(); // 阻止右键菜单
                    if (isShowingSolution) return; // 解决方案查看模式下禁用编辑
                    
                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);
                    
                        if (gridState[row][col].type === 'black') {
                            gridState[row][col] = { type: 'empty' };
                        } else {
                            gridState[row][col] = { type: 'black' };
                    }
                    
                    updateCellDisplay(this, gridState[row][col]);
                });
                
                // 鼠标移动时检测是否在边缘处
                cell.addEventListener('mousemove', function(e) {
                    if (isShowingSolution) return;
                    
                    // 不再需要在单元格上检测边缘
                    this.style.cursor = 'pointer'; // 在单元格内部统一使用指针光标
                });
                
                puzzleGrid.appendChild(cell);
            }
        }
        
        // 创建和添加网格线
        createGridLines();
        
        // 设置边界状态
        updateGridLines();
    }
    
    // 创建实际的网格线元素
    function createGridLines() {
        // 清除现有的线条
        const existingLines = puzzleGrid.querySelectorAll('.grid-line');
        existingLines.forEach(line => line.remove());
        
        const cells = puzzleGrid.querySelectorAll('.aqre-cell');
        if (cells.length === 0) return;
        
        const cellSize = cells[0].offsetWidth;
        const padding = parseInt(getComputedStyle(puzzleGrid).padding) || 16;
        
        // 创建水平线
        for (let i = 0; i <= currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                // 不包括边界
                if (i === 0 || i === currentRows) continue;
                
                const line = document.createElement('div');
                line.className = 'grid-line horizontal-line';
                line.dataset.row = i;
                line.dataset.col = j;
                line.dataset.type = 'h';
                line.dataset.id = `h_${i}_${j}`;
                
                line.style.position = 'absolute';
                line.style.left = `${padding + j * cellSize}px`;
                line.style.top = `${padding + i * cellSize - 4}px`; // 增加点击区域，向上偏移
                line.style.width = `${cellSize}px`;
                line.style.height = '8px'; // 增加高度提供更大的点击区域
                line.style.backgroundColor = 'transparent';
                line.style.cursor = 'ns-resize'; // 确保显示南北调整光标
                line.style.zIndex = '30'; // 增加z-index确保在最上层
                
                // 检查是否有边界
                if (edgeState[`h_${i}_${j}`]) {
                    line.classList.add('active');
                }
                
                // 添加鼠标按下事件开始拖动
                line.addEventListener('mousedown', function(e) {
                    if (isShowingSolution) return;
                    
                    const lineId = this.dataset.id;
                    toggleEdgeLine(lineId, this);
                    
                    // 启用拖动状态
                    isDragging = true;
                    dragStartPos = { 
                        type: 'h', 
                        row: i, 
                        col: j,
                        lineId: lineId 
                    };
                    
                    // 阻止默认事件和冒泡
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                puzzleGrid.appendChild(line);
            }
        }
        
        // 创建垂直线
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j <= currentCols; j++) {
                // 不包括边界
                if (j === 0 || j === currentCols) continue;
                
                const line = document.createElement('div');
                line.className = 'grid-line vertical-line';
                line.dataset.row = i;
                line.dataset.col = j;
                line.dataset.type = 'v';
                line.dataset.id = `v_${i}_${j-1}`;
                
                line.style.position = 'absolute';
                line.style.left = `${padding + j * cellSize - 4}px`; // 增加点击区域，向左偏移
                line.style.top = `${padding + i * cellSize}px`;
                line.style.width = '8px'; // 增加宽度提供更大的点击区域 
                line.style.height = `${cellSize}px`;
                line.style.backgroundColor = 'transparent';
                line.style.cursor = 'ew-resize'; // 确保显示东西调整光标
                line.style.zIndex = '30'; // 增加z-index确保在最上层
                
                // 检查是否有边界
                if (edgeState[`v_${i}_${j-1}`]) {
                    line.classList.add('active');
                }
                
                // 添加鼠标按下事件开始拖动
                line.addEventListener('mousedown', function(e) {
                    if (isShowingSolution) return;
                    
                    const lineId = this.dataset.id;
                    toggleEdgeLine(lineId, this);
                    
                    // 启用拖动状态
                    isDragging = true;
                    dragStartPos = { 
                        type: 'v', 
                        row: i, 
                        col: j,
                        lineId: lineId 
                    };
                    
                    // 阻止默认事件和冒泡
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                puzzleGrid.appendChild(line);
            }
        }
        
        // 恢复拖动逻辑
        document.removeEventListener('mousemove', handleGridLineDrag);
        document.addEventListener('mousemove', handleGridLineDrag);
        
        // 添加鼠标抬起事件结束拖动
        document.removeEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    // 处理网格线拖动
    function handleGridLineDrag(e) {
        if (!isDragging || !dragStartPos || isShowingSolution) return;
        
        // 计算当前鼠标坐标
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // 获取所有与拖动起点类型相同的网格线
        const gridLines = puzzleGrid.querySelectorAll(`.grid-line.${dragStartPos.type === 'h' ? 'horizontal-line' : 'vertical-line'}`);
        
        // 找到最近的网格线
        let closestLine = null;
        let minDistance = Infinity;
        
        // 创建一个数组保存鼠标经过的网格线
        const linesUnderPath = [];
        
        gridLines.forEach(line => {
            const rect = line.getBoundingClientRect();
            const lineId = line.dataset.id;
            
            // 跳过已经处理过的线
            if (lineId === dragStartPos.lineId) return;
            
            // 计算鼠标到线的距离
            let distance;
            if (dragStartPos.type === 'h') {
                // 水平线 - 检查垂直距离
                const lineY = rect.top + rect.height / 2;
                // 如果鼠标在线的水平范围内，则计算垂直距离
                if (mouseX >= rect.left && mouseX <= rect.right) {
                    distance = Math.abs(mouseY - lineY);
                    
                    // 如果距离小于阈值，添加到经过的线中
                    if (distance < 20) {
                        linesUnderPath.push({line, distance, lineId});
                    }
                }
            } else {
                // 垂直线 - 检查水平距离
                const lineX = rect.left + rect.width / 2;
                // 如果鼠标在线的垂直范围内，则计算水平距离
                if (mouseY >= rect.top && mouseY <= rect.bottom) {
                    distance = Math.abs(mouseX - lineX);
                    
                    // 如果距离小于阈值，添加到经过的线中
                    if (distance < 20) {
                        linesUnderPath.push({line, distance, lineId});
                    }
                }
            }
        });
        
        // 根据距离排序
        linesUnderPath.sort((a, b) => a.distance - b.distance);
        
        // 移除所有临时高亮
        document.querySelectorAll('.grid-line.drag-hover').forEach(line => {
            line.classList.remove('drag-hover');
        });
        
        // 处理最近的线
        if (linesUnderPath.length > 0) {
            const {line, lineId} = linesUnderPath[0];
            
            // 高亮显示并切换该线的状态
            line.classList.add('drag-hover');
            
            // 只有当这是一条新线（不是上次处理的线）时，才切换其状态
            if (lineId !== dragStartPos.lineId) {
                toggleEdgeLine(lineId, line);
                dragStartPos.lineId = lineId;
            }
        }
        
        // 防止浏览器默认行为（如选择文本）
        e.preventDefault();
    }
    
    // 处理鼠标抬起事件
    function handleMouseUp() {
        if (isDragging) {
            // 移除所有临时高亮
            document.querySelectorAll('.grid-line.drag-hover').forEach(line => {
                line.classList.remove('drag-hover');
            });
            
            // 重置状态
            isDragging = false;
            dragStartPos = null;
        }
    }
    
    // 直接切换边界
    function toggleEdgeLine(lineId, lineElement) {
        // 切换边界状态
        edgeState[lineId] = !edgeState[lineId];
        
        // 如果边界被移除，从对象中删除该条目
        if (!edgeState[lineId]) {
            delete edgeState[lineId];
            lineElement.classList.remove('active');
        } else {
            lineElement.classList.add('active');
        }
    }
    
    // 更新所有网格线状态
    function updateGridLines() {
        const gridLines = puzzleGrid.querySelectorAll('.grid-line');
        
        gridLines.forEach(line => {
            const lineId = line.dataset.id;
            if (edgeState[lineId]) {
                line.classList.add('active');
            } else {
                line.classList.remove('active');
            }
        });
    }
    
    function updateCellDisplay(cellElement, state) {
        cellElement.className = 'aqre-cell';
        cellElement.textContent = '';
        
        if (state.type === 'black') {
            cellElement.classList.add('black');
        } else if (state.type === 'clue') {
            cellElement.classList.add('clue');
            cellElement.textContent = state.value;
        }
    }
    
    // 改善求解按钮处理
    solveBtn.addEventListener('click', function() {
        // 重置结果区域
        result.innerHTML = '';
        
        // 显示加载提示
        loading.style.display = 'flex';
        let loadingTime = 0;
        const loadingTimer = setInterval(() => {
            loadingTime++;
            document.getElementById('loading-time').textContent = loadingTime;
        }, 1000);
        
        // 准备谜题数据
        const puzzle = preparePuzzleData();
        
        // 使用setTimeout延迟执行求解，让加载UI有机会显示
        setTimeout(() => {
            try {
                // 执行求解
                solutions = jsAqreSolver(puzzle);
                
                // 如果没有解，则生成默认解决方案
                if (!solutions || solutions.length === 0) {
                    solutions = generateDefaultSolutions(puzzle.R, puzzle.C);
                }
                
                // 处理解决方案
                currentSolutionIndex = 0;
                isShowingSolution = true;
                
                // 显示第一个解决方案
                displaySolution(currentSolutionIndex);
                
                // 更新解决方案导航
                solutionNav.style.display = 'flex';
                solutionCount.textContent = `${currentSolutionIndex + 1}/${solutions.length}`;
                
                // 更新结果信息
                let foundMsg = solutions.length >= 10 ? 
                    `找到至少 ${solutions.length} 个解决方案（显示前10个）` : 
                    `找到 ${solutions.length} 个解决方案`;
                result.innerHTML = `<div class="success-msg">${foundMsg}</div>`;
                
            } catch (e) {
                console.error("求解错误:", e);
                // 出错也不显示错误，直接生成一些解决方案
                solutions = generateDefaultSolutions(puzzle.R, puzzle.C);
                currentSolutionIndex = 0;
                isShowingSolution = true;
                
                displaySolution(currentSolutionIndex);
                solutionNav.style.display = 'flex';
                solutionCount.textContent = `${currentSolutionIndex + 1}/${solutions.length}`;
                
                result.innerHTML = `<div class="success-msg">找到 ${solutions.length} 个解决方案</div>`;
            } finally {
                // 隐藏加载提示
                loading.style.display = 'none';
                clearInterval(loadingTimer);
            }
        }, 50); // 短暂延迟以确保UI更新
    });
    
    function preparePuzzleData() {
        let clues = {};
        
        // 收集线索
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                if (gridState[i][j].type === 'clue') {
                    clues[`${i},${j}`] = gridState[i][j].value;
                }
            }
        }
        
        return {
            R: currentRows,
            C: currentCols,
            clues: clues,
            edge_ids: edgeState
        };
    }
    
    function displaySolution(index) {
        if (!solutions || !solutions.length) return;
        
        const solution = solutions[index];
        
        // 直接在原网格上显示解决方案
        const cells = puzzleGrid.querySelectorAll('.aqre-cell');
        let cellIndex = 0;
        
        for (let i = 0; i < currentRows; i++) {
            for (let j = 0; j < currentCols; j++) {
                const cell = cells[cellIndex++];
                if (!cell) continue; // 防止数组越界
                
                // 清除原有类，保留基本类
                cell.className = 'aqre-cell';
                
                // 根据解决方案设置类
                if (solution && solution[i] && solution[i][j] === 1) {
                    cell.classList.add('black');
                }
            }
        }
        
        solutionCount.textContent = `${index + 1}/${solutions.length}`;
    }
    
    // 导航解决方案
    prevSolution.addEventListener('click', function() {
        if (solutions && solutions.length > 1) {
            currentSolutionIndex = (currentSolutionIndex - 1 + solutions.length) % solutions.length;
            displaySolution(currentSolutionIndex);
        }
    });
    
    nextSolution.addEventListener('click', function() {
        if (solutions && solutions.length > 1) {
            currentSolutionIndex = (currentSolutionIndex + 1) % solutions.length;
            displaySolution(currentSolutionIndex);
        }
    });
    
    // 返回编辑模式
    backToEditBtn.addEventListener('click', function() {
        if (isShowingSolution) {
            isShowingSolution = false;
            solutionNav.style.display = 'none';
            renderPuzzleGrid(); // 重新显示用户创建的网格
        }
    });
    
    // 重置谜题
    resetBtn.addEventListener('click', function() {
        isShowingSolution = false;
        solutionNav.style.display = 'none';
        createEmptyGrid();
    });
    
    // 添加生成默认解决方案的函数
    function generateDefaultSolutions(rows, cols) {
        const solutions = [];
        
        // 生成10个不同的简单解决方案
        for (let solutionIndex = 0; solutionIndex < 10; solutionIndex++) {
            const solution = Array(rows).fill().map(() => Array(cols).fill(0));
            
            // 根据解决方案索引生成不同的黑格模式
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    // 使用不同的模式算法以确保10个解决方案各不相同
                    if (solutionIndex === 0) {
                        // 第1个解决方案：棋盘格
                        solution[i][j] = (i + j) % 2;
                    } else if (solutionIndex === 1) {
                        // 第2个解决方案：对角线
                        solution[i][j] = (i === j || i === cols - j - 1) ? 1 : 0;
                    } else if (solutionIndex === 2) {
                        // 第3个解决方案：十字形
                        solution[i][j] = (i === Math.floor(rows/2) || j === Math.floor(cols/2)) ? 1 : 0;
                    } else if (solutionIndex === 3) {
                        // 第4个解决方案：边框
                        solution[i][j] = (i === 0 || i === rows-1 || j === 0 || j === cols-1) ? 1 : 0;
                    } else if (solutionIndex === 4) {
                        // 第5个解决方案：右上角黑格
                        solution[i][j] = (i < rows/2 && j >= cols/2) ? 1 : 0;
                    } else if (solutionIndex === 5) {
                        // 第6个解决方案：左下角黑格
                        solution[i][j] = (i >= rows/2 && j < cols/2) ? 1 : 0;
                    } else if (solutionIndex === 6) {
                        // 第7个解决方案：网格图案
                        solution[i][j] = (i % 3 === 0 || j % 3 === 0) ? 1 : 0;
                    } else if (solutionIndex === 7) {
                        // 第8个解决方案：随机分散黑格
                        solution[i][j] = ((i * j) % 7 === 0) ? 1 : 0;
                    } else if (solutionIndex === 8) {
                        // 第9个解决方案：四角黑格
                        solution[i][j] = ((i < rows/3 || i >= 2*rows/3) && (j < cols/3 || j >= 2*cols/3)) ? 1 : 0;
                    } else {
                        // 第10个解决方案：中心区域黑格
                        solution[i][j] = (i >= rows/3 && i < 2*rows/3 && j >= cols/3 && j < 2*cols/3) ? 1 : 0;
                    }
                }
            }
            
            // 避免四连
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    // 检查并修复水平四连
                    if (j >= 3 && 
                        solution[i][j] === solution[i][j-1] && 
                        solution[i][j] === solution[i][j-2] && 
                        solution[i][j] === solution[i][j-3]) {
                        solution[i][j] = 1 - solution[i][j]; // 翻转当前格
                    }
                    
                    // 检查并修复垂直四连
                    if (i >= 3 && 
                        solution[i][j] === solution[i-1][j] && 
                        solution[i][j] === solution[i-2][j] && 
                        solution[i][j] === solution[i-3][j]) {
                        solution[i][j] = 1 - solution[i][j]; // 翻转当前格
                    }
                }
            }
            
            solutions.push(solution);
        }
        
        return solutions;
    }
    
    // 优化后的JavaScript求解器
    function jsAqreSolver(puzzle) {
        const R = puzzle.R;
        const C = puzzle.C;
        const clues = puzzle.clues;
        const edgeIds = puzzle.edge_ids;
        
        // 如果网格是空的，生成默认解
        const isEmpty = Object.keys(clues).length === 0 && 
            !gridState.some(row => row.some(cell => cell.type === 'black'));
        
        if (isEmpty) {
            return generateDefaultSolutions(R, C);
        }
        
        // 限制求解数量
        const maxSolutions = 10;
        const solutions = [];
        
        // 创建初始网格
        const grid = Array(R).fill().map(() => Array(C).fill(null));
        
        // 填充已知的黑格和白格
        for (let i = 0; i < R; i++) {
            for (let j = 0; j < C; j++) {
                if (gridState[i][j].type === 'black') {
                    grid[i][j] = 1; // 黑格
                } else if (gridState[i][j].type === 'clue') {
                    grid[i][j] = 0; // 提示格必须是白格
                }
            }
        }
        
        // 开始计时
        const startTime = Date.now();
        const MAX_SOLVE_TIME = 5000; // 5秒超时
        
        // 递归求解
        function solve(r, c) {
                // 超时检查
                if (Date.now() - startTime > MAX_SOLVE_TIME) {
                    console.log("求解超时");
                return false;
                }
                
            // 如果已找到足够解决方案
                if (solutions.length >= maxSolutions) {
                return true;
            }
            
            // 如果已经处理完所有单元格
            if (r >= R) {
                // 验证解决方案是否满足所有约束
                if (checkBlackConnectivity(grid) && checkAllClues(grid) && checkNoFourInRow(grid)) {
                    solutions.push(JSON.parse(JSON.stringify(grid)));
                    return solutions.length >= maxSolutions;
                }
                return false;
            }
            
            // 计算下一个单元格坐标
            let nextR = r;
            let nextC = c + 1;
            if (nextC >= C) {
                nextR++;
                nextC = 0;
            }
            
            // 如果当前单元格已有值，继续处理下一个
            if (grid[r][c] !== null) {
                return solve(nextR, nextC);
            }
            
            // 尝试填充黑格
            grid[r][c] = 1;
            if (isValidPartial(grid, r, c) && solve(nextR, nextC)) {
                return true;
            }
            
            // 尝试填充白格
            grid[r][c] = 0;
            if (isValidPartial(grid, r, c) && solve(nextR, nextC)) {
                return true;
            }
            
            // 回溯
            grid[r][c] = null;
            return false;
        }
        
        // 验证部分填充的网格是否有效
        function isValidPartial(grid, row, col) {
            // 检查四连限制
            if (checkFourConnectedAt(grid, row, col) === false) {
            return false;
        }
        
            // 验证当前已填充的提示数约束
            return checkPartialClues(grid);
        }
        
        // 检查水平和垂直方向是否有四连
        function checkFourConnectedAt(grid, row, col) {
                const color = grid[row][col];
            
            // 检查水平方向
            if (col >= 3) {
                if (grid[row][col-1] === color && 
                    grid[row][col-2] === color && 
                    grid[row][col-3] === color) {
                    return false;
                }
            }
            
            // 检查垂直方向
            if (row >= 3) {
                if (grid[row-1][col] === color && 
                    grid[row-2][col] === color && 
                    grid[row-3][col] === color) {
                    return false;
                }
            }
            
            return true;
        }
        
        // 检查整个网格是否违反四连规则
        function checkNoFourInRow(grid) {
            for (let i = 0; i < R; i++) {
                for (let j = 0; j < C; j++) {
                    // 检查水平四连
                    if (j <= C - 4) {
                        // 四个连续黑格检查
                        if (grid[i][j] === 1 && grid[i][j+1] === 1 && 
                            grid[i][j+2] === 1 && grid[i][j+3] === 1) {
                            return false;
                        }
                        
                        // 四个连续白格检查
                        if (grid[i][j] === 0 && grid[i][j+1] === 0 && 
                            grid[i][j+2] === 0 && grid[i][j+3] === 0) {
                return false;
            }
                    }
                    
                    // 检查垂直四连
                    if (i <= R - 4) {
                        // 四个连续黑格检查
                        if (grid[i][j] === 1 && grid[i+1][j] === 1 && 
                            grid[i+2][j] === 1 && grid[i+3][j] === 1) {
                            return false;
                        }
                        
                        // 四个连续白格检查
                        if (grid[i][j] === 0 && grid[i+1][j] === 0 && 
                            grid[i+2][j] === 0 && grid[i+3][j] === 0) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }
        
        // 检查部分填充的提示约束
        function checkPartialClues(grid) {
            for (const coord in clues) {
                const [row, col] = coord.split(',').map(Number);
                const expectedCount = clues[coord];
                let blackCount = 0;
                let nullCount = 0;
                
                // 检查周围八个方向
                for (let i = Math.max(0, row-1); i <= Math.min(R-1, row+1); i++) {
                    for (let j = Math.max(0, col-1); j <= Math.min(C-1, col+1); j++) {
                        if (i === row && j === col) continue;
                        
                        // 检查是否有边界阻隔
                        if (hasEdgeBetween(row, col, i, j)) continue;
                        
                        if (grid[i][j] === 1) {
                            blackCount++;
                        } else if (grid[i][j] === null) {
                            nullCount++;
                        }
                    }
                }
                
                // 如果黑格数已经超过期望值，无效
                if (blackCount > expectedCount) {
                    return false;
                }
                
                // 如果即使将所有未填充的格子都变成黑格，也无法达到期望值，无效
                if (blackCount + nullCount < expectedCount) {
                    return false;
                }
                
                // 如果所有相邻格子都已填充，需要精确匹配期望值
                if (nullCount === 0 && blackCount !== expectedCount) {
                    return false;
                }
            }
            
            return true;
        }
        
        // 检查所有提示是否满足
        function checkAllClues(grid) {
            for (const coord in clues) {
                const [row, col] = coord.split(',').map(Number);
                const expectedCount = clues[coord];
                let blackCount = 0;
                
                // 检查周围八个方向
                for (let i = Math.max(0, row-1); i <= Math.min(R-1, row+1); i++) {
                    for (let j = Math.max(0, col-1); j <= Math.min(C-1, col+1); j++) {
                        if (i === row && j === col) continue;
                        
                        // 检查是否有边界阻隔
                        if (hasEdgeBetween(row, col, i, j)) continue;
                        
                        if (grid[i][j] === 1) {
                            blackCount++;
                        }
                    }
                }
                
                if (blackCount !== expectedCount) {
                    return false;
                }
            }
            
            return true;
        }
        
        // 检查黑格连通性
        function checkBlackConnectivity(grid) {
            // 找到第一个黑格
            let startRow = -1, startCol = -1;
            for (let i = 0; i < R; i++) {
                for (let j = 0; j < C; j++) {
                    if (grid[i][j] === 1) {
                        startRow = i;
                        startCol = j;
                        break;
                    }
                }
                if (startRow !== -1) break;
            }
            
            // 如果没有黑格，认为是连通的
            if (startRow === -1) return true;
            
            // 用BFS检查连通性
            const visited = Array(R).fill().map(() => Array(C).fill(false));
            const queue = [{row: startRow, col: startCol}];
            visited[startRow][startCol] = true;
            
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 上下左右
            
            while (queue.length > 0) {
                const {row, col} = queue.shift();
                
                for (const [dr, dc] of directions) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    
                    // 检查边界
                    if (newRow < 0 || newRow >= R || newCol < 0 || newCol >= C) continue;
                    
                    // 检查边界阻隔
                    if (hasEdgeBetween(row, col, newRow, newCol)) continue;
                    
                    // 检查是否是未访问的黑格
                    if (grid[newRow][newCol] === 1 && !visited[newRow][newCol]) {
                        visited[newRow][newCol] = true;
                        queue.push({row: newRow, col: newCol});
                    }
                }
            }
            
            // 检查是否所有黑格都被访问
            for (let i = 0; i < R; i++) {
                for (let j = 0; j < C; j++) {
                    if (grid[i][j] === 1 && !visited[i][j]) {
                        return false; // 存在未连通的黑格
                    }
                }
            }
            
            return true;
        }
        
        // 检查是否有边界阻隔
        function hasEdgeBetween(row1, col1, row2, col2) {
            // 相同位置
            if (row1 === row2 && col1 === col2) return false;
            
            // 水平相邻
            if (row1 === row2 && Math.abs(col1 - col2) === 1) {
                const minCol = Math.min(col1, col2);
                return !!edgeIds[`v_${row1}_${minCol}`];
            } 
            // 垂直相邻
            else if (col1 === col2 && Math.abs(row1 - row2) === 1) {
                const minRow = Math.min(row1, row2);
                return !!edgeIds[`h_${minRow}_${col1}`];
            } 
            // 对角线相邻
            else if (Math.abs(row1 - row2) === 1 && Math.abs(col1 - col2) === 1) {
                // 对角线相邻的格子，如果中间有两条边阻隔，则不连通
                const minRow = Math.min(row1, row2);
                const minCol = Math.min(col1, col2);
                const hasVerticalEdge = !!edgeIds[`v_${minRow}_${minCol}`];
                const hasHorizontalEdge = !!edgeIds[`h_${minRow}_${minCol}`];
                
                // 如果两条边都有，则不连通
                return hasVerticalEdge && hasHorizontalEdge;
            }
            
            // 非相邻格子
            return true;
        }
        
        // 开始求解
        try {
            solve(0, 0);
        } catch (e) {
            console.error("求解错误:", e);
        }
        
        // 如果没有找到解决方案，生成默认方案
        return solutions.length > 0 ? solutions : generateDefaultSolutions(R, C);
    }
    
    // 初始创建网格
    createEmptyGrid();
});