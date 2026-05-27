(function () {
    const NUMBER_HUARONG_STYLE_ID = 'number-huarong-inline-style';

    function injectNumberHuarongStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById(NUMBER_HUARONG_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = NUMBER_HUARONG_STYLE_ID;
        style.textContent = `
.space-size-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 1.2rem;
}

.sliding-size-btn {
  min-width: 0;
}

.sliding-size-btn.active {
  border-color: rgba(255, 218, 89, 0.8);
  background: rgba(255, 218, 89, 0.1);
  box-shadow: 0 0 16px rgba(255, 218, 89, 0.22);
}

.space-sliding-panel {
  min-width: 400px;
  background:
    linear-gradient(135deg, rgba(255, 218, 89, 0.08), rgba(64, 224, 255, 0.04)),
    rgba(0, 0, 0, 0.22);
}

#sliding-step-counter {
  color: #ffda59;
  font-weight: 800;
  text-shadow: 0 0 6px rgba(255, 218, 89, 0.86);
}

#sliding-step-move {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.78);
}

.sliding-step-panel .cyber-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.45);
}

.sliding-step-panel .cyber-button:disabled:hover {
  transform: none;
}

.sliding-board {
  --sliding-size: 4;
  width: min(520px, 100%);
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(var(--sliding-size), minmax(0, 1fr));
  grid-template-rows: repeat(var(--sliding-size), minmax(0, 1fr));
  gap: 0.65rem;
  padding: 0.85rem;
  margin: 0 auto 1.8rem;
  border: 1px solid rgba(64, 224, 255, 0.25);
  background:
    linear-gradient(145deg, rgba(2, 12, 18, 0.96), rgba(8, 24, 32, 0.72)),
    rgba(0, 0, 0, 0.32);
  box-shadow:
    inset 0 0 24px rgba(64, 224, 255, 0.1),
    0 0 28px rgba(0, 0, 0, 0.24);
}

.sliding-tile,
.sliding-empty {
  min-width: 0;
  min-height: 0;
  border-radius: 6px;
}

.sliding-tile {
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 218, 89, 0.45);
  color: rgba(255, 255, 255, 0.92);
  background:
    radial-gradient(circle at 28% 20%, rgba(255, 255, 255, 0.32), transparent 26%),
    linear-gradient(145deg, rgba(255, 218, 89, 0.24), rgba(64, 224, 255, 0.08)),
    rgba(10, 18, 22, 0.9);
  box-shadow:
    inset 0 0 18px rgba(255, 255, 255, 0.08),
    0 0 16px rgba(255, 218, 89, 0.12);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 1.65rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.sliding-tile:hover {
  transform: translateY(-2px);
  border-color: rgba(64, 224, 255, 0.85);
  box-shadow:
    inset 0 0 18px rgba(255, 255, 255, 0.1),
    0 0 20px rgba(64, 224, 255, 0.26);
}

.sliding-tile-guide {
  border-color: rgba(64, 224, 255, 0.95);
  color: #061016;
  background:
    radial-gradient(circle at 28% 20%, rgba(255, 255, 255, 0.55), transparent 28%),
    linear-gradient(145deg, #ffda59, #40e0ff);
  box-shadow:
    inset 0 0 16px rgba(255, 255, 255, 0.28),
    0 0 22px rgba(64, 224, 255, 0.42),
    0 0 10px rgba(255, 218, 89, 0.34);
}

.sliding-empty {
  border: 1px dashed rgba(64, 224, 255, 0.34);
  background:
    repeating-linear-gradient(
      135deg,
      rgba(64, 224, 255, 0.08) 0,
      rgba(64, 224, 255, 0.08) 8px,
      rgba(255, 255, 255, 0.02) 8px,
      rgba(255, 255, 255, 0.02) 16px
    ),
    rgba(0, 0, 0, 0.24);
  box-shadow: inset 0 0 18px rgba(64, 224, 255, 0.08);
}

@media (max-width: 760px) {
  .space-size-row {
    grid-template-columns: 1fr;
  }

  .sliding-board {
    gap: 0.45rem;
    padding: 0.6rem;
  }

  .sliding-tile {
    font-size: 1.25rem;
  }
}
`;
        document.head.appendChild(style);
    }

    injectNumberHuarongStyles();

    const SLIDING_SIZES = [3, 4, 5];
    let slidingSize = 4;
    let slidingBoard = [];
    let slidingHistory = [];
    let slidingRawHistoryLength = 0;
    let slidingLastSolution = [];
    let slidingSolutionIndex = 0;
    let slidingSolutionElapsed = 0;

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function getSlidingScrambleLength(size = slidingSize) {
        if (size === 3) return 42;
        if (size === 4) return 72;
        return 96;
    }

    function createSolvedSlidingBoard(size = slidingSize) {
        const total = size * size;
        return Array.from({ length: total }, (_, index) => index === total - 1 ? 0 : index + 1);
    }

    function getBlankSlidingIndex(board = slidingBoard) {
        return board.indexOf(0);
    }

    function areSlidingNeighbors(a, b, size = slidingSize) {
        const ar = Math.floor(a / size);
        const ac = a % size;
        const br = Math.floor(b / size);
        const bc = b % size;
        return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
    }

    function isSlidingSolved() {
        return slidingBoard.every((tile, index) => tile === createSolvedSlidingBoard(slidingSize)[index]);
    }

    function getMovableSlidingTiles() {
        const blank = getBlankSlidingIndex();
        return slidingBoard
            .map((tile, index) => ({ tile, index }))
            .filter(item => item.tile && areSlidingNeighbors(item.index, blank))
            .map(item => item.tile);
    }

    function getSlidingBoardKey(board) {
        return board.join(',');
    }

    function moveTileOnSlidingBoard(board, tile, size = slidingSize) {
        const numericTile = Number(tile);
        const tileIndex = board.indexOf(numericTile);
        const blankIndex = board.indexOf(0);
        if (tileIndex < 0 || blankIndex < 0 || !areSlidingNeighbors(tileIndex, blankIndex, size)) {
            return null;
        }

        const next = board.slice();
        next[blankIndex] = numericTile;
        next[tileIndex] = 0;
        return next;
    }

    function compactSlidingMovePath(moves, size = slidingSize) {
        const path = [];
        const states = [createSolvedSlidingBoard(size)];
        const seen = new Map([[getSlidingBoardKey(states[0]), 0]]);

        moves.forEach(tile => {
            const next = moveTileOnSlidingBoard(states[states.length - 1], tile, size);
            if (!next) return;

            path.push(tile);
            states.push(next);
            const key = getSlidingBoardKey(next);
            if (!seen.has(key)) {
                seen.set(key, path.length);
                return;
            }

            const keepLength = seen.get(key);
            path.length = keepLength;
            states.length = keepLength + 1;
            seen.clear();
            states.forEach((state, index) => seen.set(getSlidingBoardKey(state), index));
        });

        return path;
    }

    function getSlidingHeuristic(board, size = slidingSize) {
        let distance = 0;
        let conflicts = 0;

        for (let index = 0; index < board.length; index++) {
            const tile = board[index];
            if (!tile) continue;
            const currentRow = Math.floor(index / size);
            const currentCol = index % size;
            const goalIndex = tile - 1;
            const goalRow = Math.floor(goalIndex / size);
            const goalCol = goalIndex % size;
            distance += Math.abs(currentRow - goalRow) + Math.abs(currentCol - goalCol);
        }

        for (let row = 0; row < size; row++) {
            const rowTiles = [];
            for (let col = 0; col < size; col++) {
                const tile = board[row * size + col];
                if (tile && Math.floor((tile - 1) / size) === row) {
                    rowTiles.push((tile - 1) % size);
                }
            }
            for (let i = 0; i < rowTiles.length; i++) {
                for (let j = i + 1; j < rowTiles.length; j++) {
                    if (rowTiles[i] > rowTiles[j]) conflicts += 2;
                }
            }
        }

        for (let col = 0; col < size; col++) {
            const colTiles = [];
            for (let row = 0; row < size; row++) {
                const tile = board[row * size + col];
                if (tile && (tile - 1) % size === col) {
                    colTiles.push(Math.floor((tile - 1) / size));
                }
            }
            for (let i = 0; i < colTiles.length; i++) {
                for (let j = i + 1; j < colTiles.length; j++) {
                    if (colTiles[i] > colTiles[j]) conflicts += 2;
                }
            }
        }

        return distance + conflicts;
    }

    function getSlidingCandidateMoves(board, blankIndex, previousTile, size = slidingSize) {
        const row = Math.floor(blankIndex / size);
        const col = blankIndex % size;
        const candidates = [];
        const neighborIndexes = [
            row > 0 ? blankIndex - size : -1,
            row < size - 1 ? blankIndex + size : -1,
            col > 0 ? blankIndex - 1 : -1,
            col < size - 1 ? blankIndex + 1 : -1
        ];

        neighborIndexes.forEach(index => {
            if (index < 0) return;
            const tile = board[index];
            if (!tile || tile === previousTile) return;
            const next = board.slice();
            next[blankIndex] = tile;
            next[index] = 0;
            candidates.push({
                tile,
                next,
                blankIndex: index,
                score: getSlidingHeuristic(next, size)
            });
        });

        candidates.sort((a, b) => a.score - b.score);
        return candidates;
    }

    function findSlidingSearchSolution(board, size, fallbackLength) {
        if (size > 4 || fallbackLength <= 1) return null;
        const start = board.slice();
        const timeLimit = size === 3 ? 900 : 650;
        const maxDepth = Math.min(fallbackLength - 1, size === 3 ? 80 : 64);
        let bound = getSlidingHeuristic(start, size);
        if (bound > maxDepth) return null;

        const started = performance.now();
        const path = [];
        const pathSet = new Set([getSlidingBoardKey(start)]);
        const FOUND = Symbol('found');
        const TIMEOUT = Symbol('timeout');

        function dfs(state, blankIndex, depth, currentBound, previousTile) {
            if (performance.now() - started > timeLimit) return TIMEOUT;

            const estimate = getSlidingHeuristic(state, size);
            const score = depth + estimate;
            if (score > currentBound) return score;
            if (estimate === 0) return FOUND;
            if (depth >= maxDepth) return Infinity;

            let min = Infinity;
            const candidates = getSlidingCandidateMoves(state, blankIndex, previousTile, size);
            for (const candidate of candidates) {
                const key = getSlidingBoardKey(candidate.next);
                if (pathSet.has(key)) continue;

                path.push(candidate.tile);
                pathSet.add(key);
                const result = dfs(candidate.next, candidate.blankIndex, depth + 1, currentBound, candidate.tile);
                if (result === FOUND) return FOUND;
                if (result === TIMEOUT) return TIMEOUT;
                if (result < min) min = result;
                path.pop();
                pathSet.delete(key);
            }

            return min;
        }

        while (bound <= maxDepth) {
            const result = dfs(start, start.indexOf(0), 0, bound, null);
            if (result === FOUND) return path.slice();
            if (result === TIMEOUT || result === Infinity) return null;
            bound = result;
        }

        return null;
    }

    function heapPush(heap, node) {
        heap.push(node);
        let index = heap.length - 1;
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (heap[parent].score <= node.score) break;
            heap[index] = heap[parent];
            index = parent;
        }
        heap[index] = node;
    }

    function heapPop(heap) {
        if (!heap.length) return null;
        const top = heap[0];
        const last = heap.pop();
        if (!heap.length) return top;

        let index = 0;
        while (true) {
            let child = index * 2 + 1;
            if (child >= heap.length) break;
            if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
            if (heap[child].score >= last.score) break;
            heap[index] = heap[child];
            index = child;
        }
        heap[index] = last;
        return top;
    }

    function findSlidingAStarSolution(board, size, fallbackLength) {
        if (size > 4 || fallbackLength <= 1) return null;
        const start = board.slice();
        const maxDepth = Math.min(fallbackLength - 1, size === 3 ? 80 : 72);
        const timeLimit = size === 3 ? 700 : 1100;
        const nodeLimit = size === 3 ? 45000 : 65000;
        const weight = size === 3 ? 1 : 1.35;
        const started = performance.now();
        const startHeuristic = getSlidingHeuristic(start, size);
        if (startHeuristic > maxDepth) return null;

        const heap = [];
        const bestDepth = new Map();
        const startKey = getSlidingBoardKey(start);
        bestDepth.set(startKey, 0);
        heapPush(heap, {
            board: start,
            blankIndex: start.indexOf(0),
            previousTile: null,
            depth: 0,
            path: [],
            heuristic: startHeuristic,
            score: startHeuristic * weight
        });

        let nodes = 0;
        while (heap.length && nodes < nodeLimit) {
            if (performance.now() - started > timeLimit) return null;
            const node = heapPop(heap);
            nodes++;
            if (node.heuristic === 0) return node.path;
            if (node.depth >= maxDepth) continue;

            const candidates = getSlidingCandidateMoves(node.board, node.blankIndex, node.previousTile, size);
            for (const candidate of candidates) {
                const nextDepth = node.depth + 1;
                const key = getSlidingBoardKey(candidate.next);
                if (bestDepth.has(key) && bestDepth.get(key) <= nextDepth) continue;
                bestDepth.set(key, nextDepth);
                heapPush(heap, {
                    board: candidate.next,
                    blankIndex: candidate.blankIndex,
                    previousTile: candidate.tile,
                    depth: nextDepth,
                    path: [...node.path, candidate.tile],
                    heuristic: candidate.score,
                    score: nextDepth + candidate.score * weight
                });
            }
        }

        return null;
    }

    function recordSlidingMove(tile) {
        slidingRawHistoryLength++;
        if (slidingHistory[slidingHistory.length - 1] === tile) {
            slidingHistory.pop();
        } else {
            slidingHistory.push(tile);
        }
    }

    function getSlidingGuidedTile() {
        if (!slidingLastSolution.length || slidingSolutionIndex >= slidingLastSolution.length) return null;
        return slidingLastSolution[slidingSolutionIndex];
    }

    function moveSlidingTile(tile, options = {}) {
        const { record = true, render = true } = options;
        const numericTile = Number(tile);
        const tileIndex = slidingBoard.indexOf(numericTile);
        const blankIndex = getBlankSlidingIndex();
        if (tileIndex < 0 || blankIndex < 0 || !areSlidingNeighbors(tileIndex, blankIndex)) {
            return false;
        }

        slidingBoard[blankIndex] = numericTile;
        slidingBoard[tileIndex] = 0;

        if (record) {
            recordSlidingMove(numericTile);
            slidingLastSolution = [];
            slidingSolutionIndex = 0;
            slidingSolutionElapsed = 0;
        }

        if (render) renderSlidingPuzzle();
        return true;
    }

    function setSlidingStatus(text) {
        setText('sliding-status', text);
    }

    function updateSlidingStats() {
        setText('sliding-history-count', String(slidingRawHistoryLength));
        setText('sliding-reduced-count', String(slidingLastSolution.length || slidingHistory.length));
        document.querySelectorAll('.sliding-size-btn').forEach(button => {
            button.classList.toggle('active', Number(button.dataset.size) === slidingSize);
        });
    }

    function updateSlidingStepPanel() {
        const panel = document.getElementById('sliding-step-panel');
        const counter = document.getElementById('sliding-step-counter');
        const move = document.getElementById('sliding-step-move');
        const progress = document.getElementById('sliding-step-progress');
        const prev = document.getElementById('sliding-step-prev');
        const next = document.getElementById('sliding-step-next');
        const current = document.getElementById('sliding-step-current-btn');
        if (!panel || !counter || !move || !progress) return;

        const total = slidingLastSolution.length;
        if (!total) {
            panel.style.display = 'none';
            counter.textContent = '0 / 0';
            move.textContent = '等待求解';
            progress.style.width = '0%';
            if (prev) prev.disabled = true;
            if (next) next.disabled = true;
            if (current) current.disabled = true;
            return;
        }

        panel.style.display = 'grid';
        const isComplete = slidingSolutionIndex >= total;
        counter.textContent = `${slidingSolutionIndex} / ${total}`;
        move.textContent = isComplete ? '已完成' : `下一步：移动 ${slidingLastSolution[slidingSolutionIndex]}`;
        progress.style.width = `${(slidingSolutionIndex / total) * 100}%`;
        if (prev) prev.disabled = slidingSolutionIndex <= 0;
        if (next) next.disabled = isComplete;
        if (current) current.disabled = isComplete;
    }

    function updateSlidingSolutionPanel(solution, elapsed) {
        const output = document.getElementById('sliding-solution-output');
        slidingSolutionElapsed = elapsed;
        setText('sliding-solutionsCount', solution.length ? '1' : '0');
        setText('sliding-timeElapsed', String(elapsed));
        updateSlidingStats();
        updateSlidingStepPanel();
        if (output) {
            if (!solution.length) {
                output.textContent = '等待生成解法。';
            } else if (slidingSolutionIndex >= solution.length) {
                output.textContent = '解法已执行完成。';
            } else {
                output.textContent = `下一步：移动 ${solution[slidingSolutionIndex]}。`;
            }
        }
    }

    function renderSlidingPuzzle() {
        const board = document.getElementById('number-huarong-board');
        if (!board) return;
        const guidedTile = getSlidingGuidedTile();
        board.style.setProperty('--sliding-size', slidingSize);
        board.innerHTML = slidingBoard.map(tile => {
            if (!tile) return '<div class="sliding-empty" aria-label="空格"></div>';
            const guideClass = tile === guidedTile ? ' sliding-tile-guide' : '';
            return `<button class="sliding-tile${guideClass}" type="button" onclick="window.slideHuarongTile(${tile})">${tile}</button>`;
        }).join('');
        updateSlidingStats();
        updateSlidingStepPanel();
        if (slidingLastSolution.length && slidingSolutionIndex < slidingLastSolution.length) {
            setSlidingStatus(`按步骤移动高亮数字 ${slidingLastSolution[slidingSolutionIndex]}`);
        } else {
            setSlidingStatus(isSlidingSolved() ? '数字华容道已还原' : '点击空格相邻数字块进行移动');
        }
    }

    function getSlidingPuzzleHTML() {
        const sizeButtons = SLIDING_SIZES.map(size => `
            <button class="cyber-button sliding-size-btn" data-size="${size}" onclick="window.setNumberHuarongSize(${size})">
                <span class="cyber-button__tag">${size}x${size}</span>
            </button>`).join('');

        return `
                <div id="number-huarong-workspace" class="space-workspace">
                    <div class="control-panel card cyber-border space-control-panel">
                        <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                        <h2 class="neon-title space-title" data-text="NUMBER SLIDER">NUMBER SLIDER</h2>
                        <div class="space-subtitle">数字华容道求解</div>

                        <div class="space-size-row">${sizeButtons}</div>

                        <div class="space-action-grid">
                            <button class="cyber-button" onclick="window.resetNumberHuarong()"><span class="cyber-button__tag">重置棋盘</span></button>
                            <button class="cyber-button" onclick="window.scrambleNumberHuarong()"><span class="cyber-button__tag">随机打乱</span></button>
                            <button class="cyber-button cyber-glow" onclick="window.solveNumberHuarong()"><span class="cyber-button__tag">规约求解</span></button>
                            <button class="cyber-button" onclick="window.executeNumberHuarongSolution()"><span class="cyber-button__tag">执行解法</span></button>
                        </div>

                        <div class="space-stats">
                            <div>解记录数: <span id="sliding-solutionsCount">0</span></div>
                            <div>算力耗时: <span id="sliding-timeElapsed">0</span> ms</div>
                            <div>历史步数: <span id="sliding-history-count">0</span></div>
                            <div>有效步数: <span id="sliding-reduced-count">0</span></div>
                        </div>

                        <div class="space-solution-card">
                            <div class="badge">解法步骤</div>
                            <div class="cube-step-panel sliding-step-panel" id="sliding-step-panel">
                                <div class="cube-step-reader">
                                    <button class="cyber-button" id="sliding-step-prev" onclick="window.browseNumberHuarongSolution(-1)"><span class="cyber-button__tag">上一步</span></button>
                                    <div class="cube-step-current">
                                        <div id="sliding-step-counter">0 / 0</div>
                                        <div id="sliding-step-move">等待求解</div>
                                    </div>
                                    <button class="cyber-button" id="sliding-step-next" onclick="window.browseNumberHuarongSolution(1)"><span class="cyber-button__tag">下一步</span></button>
                                </div>
                                <div class="cube-step-bar"><span id="sliding-step-progress"></span></div>
                                <button class="cyber-button cyber-glow" id="sliding-step-current-btn" onclick="window.executeNumberHuarongStep()"><span class="cyber-button__tag">执行当前步</span></button>
                            </div>
                            <div class="result" id="sliding-solution-output">等待生成解法。</div>
                        </div>

                        <div class="instructions space-instructions">
                            <h3>系统法则:</h3>
                            <p>数字块只能滑入相邻空格，目标是按从小到大顺序还原棋盘。</p>
                            <p>求解器会先压缩历史路径，再尝试启发式搜索生成更短解法。</p>
                            <p>可切换 3x3、4x4、5x5 尺寸；切换尺寸会重置当前棋盘。</p>
                        </div>
                    </div>

                    <div class="grid-container card space-display-panel space-sliding-panel">
                        <div class="space-cube-hud">
                            <span id="sliding-status">数字华容道已还原</span>
                        </div>
                        <div class="sliding-board" id="number-huarong-board"></div>
                        <div class="cube-drag-hint">点击与空格相邻的数字块进行移动</div>
                    </div>
                </div>`;
    }

    function openNumberHuarongWorkspace() {
        const workspace = document.getElementById('number-huarong-workspace');
        if (!workspace) return;
        workspace.style.display = 'flex';
        if (!slidingBoard.length) window.resetNumberHuarong();
        renderSlidingPuzzle();
    }

    window.spacePuzzleModules = (window.spacePuzzleModules || []).filter(module => module.id !== 'number-huarong');
    window.spacePuzzleModules.push({
        id: 'number-huarong',
        getListButton() {
            return '<button class="logic-btn" type="button" onclick="window.openSpacePuzzle(\'number-huarong\')">数字华容道</button>';
        },
        getWorkspaceHTML: getSlidingPuzzleHTML,
        init() {
            window.resetNumberHuarong();
        },
        open: openNumberHuarongWorkspace
    });

    window.setNumberHuarongSize = function (size) {
        const nextSize = Number(size);
        if (!SLIDING_SIZES.includes(nextSize)) return;
        slidingSize = nextSize;
        window.resetNumberHuarong();
    };

    window.resetNumberHuarong = function () {
        slidingBoard = createSolvedSlidingBoard(slidingSize);
        slidingHistory = [];
        slidingRawHistoryLength = 0;
        slidingLastSolution = [];
        slidingSolutionIndex = 0;
        slidingSolutionElapsed = 0;
        updateSlidingSolutionPanel([], 0);
        renderSlidingPuzzle();
    };

    window.scrambleNumberHuarong = function () {
        slidingBoard = createSolvedSlidingBoard(slidingSize);
        slidingHistory = [];
        slidingRawHistoryLength = 0;
        slidingLastSolution = [];
        slidingSolutionIndex = 0;
        slidingSolutionElapsed = 0;

        const steps = getSlidingScrambleLength(slidingSize);
        let previousTile = null;
        for (let i = 0; i < steps; i++) {
            let candidates = getMovableSlidingTiles().filter(tile => tile !== previousTile);
            if (!candidates.length) candidates = getMovableSlidingTiles();
            const tile = candidates[Math.floor(Math.random() * candidates.length)];
            moveSlidingTile(tile, { record: true, render: false });
            previousTile = tile;
        }
        if (isSlidingSolved()) {
            const tile = getMovableSlidingTiles()[0];
            moveSlidingTile(tile, { record: true, render: false });
        }

        updateSlidingSolutionPanel([], 0);
        renderSlidingPuzzle();
        setSlidingStatus(`已随机打乱 ${slidingRawHistoryLength} 步，等待求解`);
    };

    window.slideHuarongTile = function (tile) {
        const numericTile = Number(tile);
        if (slidingLastSolution.length && numericTile === getSlidingGuidedTile()) {
            window.executeNumberHuarongStep();
            return;
        }
        if (!moveSlidingTile(tile)) return;
        updateSlidingSolutionPanel([], 0);
    };

    window.solveNumberHuarong = function () {
        const started = performance.now();
        if (isSlidingSolved()) {
            slidingLastSolution = [];
            slidingSolutionIndex = 0;
            slidingHistory = [];
            slidingRawHistoryLength = 0;
        } else {
            const compactPath = compactSlidingMovePath(slidingHistory, slidingSize);
            const fallbackSolution = compactPath.slice().reverse();
            const searchSolution =
                findSlidingAStarSolution(slidingBoard, slidingSize, fallbackSolution.length) ||
                findSlidingSearchSolution(slidingBoard, slidingSize, fallbackSolution.length);
            slidingHistory = compactPath;
            slidingLastSolution = searchSolution && searchSolution.length < fallbackSolution.length
                ? searchSolution
                : fallbackSolution;
            slidingSolutionIndex = 0;
        }

        const elapsed = Math.max(1, Math.round(performance.now() - started));
        updateSlidingSolutionPanel(slidingLastSolution, elapsed);
        renderSlidingPuzzle();
        if (slidingLastSolution.length) {
            const mode = slidingLastSolution.length < slidingHistory.length ? '搜索优化解法' : '历史规约解法';
            setSlidingStatus(`已生成${mode}：共 ${slidingLastSolution.length} 步，下一步移动 ${slidingLastSolution[0]}`);
        } else {
            setSlidingStatus(isSlidingSolved() ? '无需求解，当前棋盘已处于还原态' : '缺少可回溯的移动历史');
        }
    };

    window.browseNumberHuarongSolution = function (delta) {
        if (!slidingLastSolution.length) return;

        if (delta > 0) {
            if (slidingSolutionIndex >= slidingLastSolution.length) return;
            const tile = slidingLastSolution[slidingSolutionIndex];
            if (!moveSlidingTile(tile, { record: false, render: false })) {
                setSlidingStatus('当前步骤不可执行，请重新求解');
                return;
            }
            slidingSolutionIndex++;
        } else if (delta < 0) {
            if (slidingSolutionIndex <= 0) return;
            const tile = slidingLastSolution[slidingSolutionIndex - 1];
            if (!moveSlidingTile(tile, { record: false, render: false })) {
                setSlidingStatus('无法撤回当前步骤，请重新求解');
                return;
            }
            slidingSolutionIndex--;
        }

        updateSlidingSolutionPanel(slidingLastSolution, slidingSolutionElapsed);
        renderSlidingPuzzle();
        if (slidingSolutionIndex >= slidingLastSolution.length) {
            setSlidingStatus('解法已执行完成，棋盘已还原');
        } else {
            setSlidingStatus(`下一步移动 ${slidingLastSolution[slidingSolutionIndex]}`);
        }
    };

    window.executeNumberHuarongStep = function () {
        window.browseNumberHuarongSolution(1);
    };

    window.executeNumberHuarongSolution = function () {
        if (!slidingLastSolution.length) {
            window.solveNumberHuarong();
        }
        if (!slidingLastSolution.length) return;

        const solution = slidingLastSolution.slice(slidingSolutionIndex);
        solution.forEach(tile => moveSlidingTile(tile, { record: false, render: false }));
        slidingSolutionIndex = slidingLastSolution.length;
        slidingHistory = [];
        slidingRawHistoryLength = 0;
        updateSlidingSolutionPanel(slidingLastSolution, slidingSolutionElapsed);
        renderSlidingPuzzle();
    };
})();
