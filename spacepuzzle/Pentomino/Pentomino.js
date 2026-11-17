(function () {
    const PENTOMINO_STYLE_ID = 'pentomino-inline-style';

    function injectPentominoStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById(PENTOMINO_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = PENTOMINO_STYLE_ID;
        style.textContent = `
.pentomino-control-panel {
  min-width: 360px;
}

.pentomino-action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pentomino-preview {
  min-height: 138px;
  display: grid;
  place-items: center;
  margin-bottom: 1.1rem;
  border: 1px solid rgba(64, 224, 255, 0.18);
  background:
    linear-gradient(135deg, rgba(64, 224, 255, 0.06), rgba(255, 218, 89, 0.05)),
    rgba(0, 0, 0, 0.24);
}

.pentomino-preview-grid {
  width: 120px;
  height: 120px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: repeat(5, minmax(0, 1fr));
  gap: 4px;
}

.pentomino-preview-cell {
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.025);
}

.pentomino-preview-cell.active {
  border-color: rgba(255, 255, 255, 0.48);
  background:
    radial-gradient(circle at 28% 20%, rgba(255, 255, 255, 0.28), transparent 30%),
    var(--piece-color);
  box-shadow:
    inset 0 0 10px rgba(255, 255, 255, 0.12),
    0 0 12px rgba(64, 224, 255, 0.14);
}

.pentomino-panel {
  min-width: 540px;
  background:
    radial-gradient(circle at 24% 16%, rgba(255, 218, 89, 0.1), transparent 30%),
    linear-gradient(135deg, rgba(64, 224, 255, 0.06), rgba(255, 107, 138, 0.06)),
    rgba(0, 0, 0, 0.22);
}

.pentomino-tray {
  width: min(620px, 100%);
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.pentomino-piece-btn {
  min-width: 0;
  min-height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.88);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.42)),
    var(--piece-color);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.pentomino-piece-btn:hover,
.pentomino-piece-btn.active {
  transform: translateY(-2px);
  border-color: var(--piece-color);
  box-shadow: 0 0 16px rgba(64, 224, 255, 0.24);
}

.pentomino-piece-btn.placed {
  opacity: 0.48;
}

.pentomino-piece-btn.active.placed {
  opacity: 0.72;
}

.pentomino-board {
  --pentomino-cols: 10;
  --pentomino-rows: 6;
  width: min(680px, 100%);
  aspect-ratio: 10 / 6;
  display: grid;
  grid-template-columns: repeat(var(--pentomino-cols), minmax(0, 1fr));
  grid-template-rows: repeat(var(--pentomino-rows), minmax(0, 1fr));
  gap: 0.36rem;
  padding: 0.8rem;
  border: 1px solid rgba(64, 224, 255, 0.24);
  background:
    repeating-linear-gradient(
      135deg,
      rgba(64, 224, 255, 0.055) 0,
      rgba(64, 224, 255, 0.055) 8px,
      rgba(255, 255, 255, 0.018) 8px,
      rgba(255, 255, 255, 0.018) 16px
    ),
    linear-gradient(145deg, rgba(2, 12, 18, 0.96), rgba(8, 24, 32, 0.72));
  box-shadow:
    inset 0 0 24px rgba(64, 224, 255, 0.1),
    0 0 28px rgba(0, 0, 0, 0.24);
}

.pentomino-cell {
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  border: 1px dashed rgba(64, 224, 255, 0.22);
  color: rgba(6, 16, 22, 0.78);
  background: rgba(255, 255, 255, 0.03);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: clamp(0.72rem, 1.3vw, 1rem);
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.pentomino-cell:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 218, 89, 0.78);
  box-shadow: 0 0 12px rgba(255, 218, 89, 0.14);
}

.pentomino-cell.filled {
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.42);
  background:
    radial-gradient(circle at 28% 20%, rgba(255, 255, 255, 0.34), transparent 28%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.18), transparent 44%),
    var(--piece-color);
  box-shadow:
    inset 0 0 12px rgba(255, 255, 255, 0.14),
    0 0 14px rgba(64, 224, 255, 0.16);
}

#pentomino-step-counter {
  color: #ffda59;
  font-weight: 800;
  text-shadow: 0 0 6px rgba(255, 218, 89, 0.86);
}

#pentomino-step-move {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.78);
}

@media (max-width: 980px) {
  .pentomino-tray {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .pentomino-control-panel {
    min-width: 0;
    width: 100%;
    padding: 1.25rem;
  }

  .pentomino-action-grid {
    grid-template-columns: 1fr;
  }

  .pentomino-board {
    gap: 0.2rem;
    padding: 0.45rem;
  }

  .pentomino-tray {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
`;
        document.head.appendChild(style);
    }

    injectPentominoStyles();

    const ROWS = 6;
    const COLS = 10;
    const CELL_COUNT = ROWS * COLS;
    const PIECE_ORDER = ['F', 'I', 'L', 'P', 'N', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    const COLORS = {
        F: '#ff6b8a',
        I: '#40e0ff',
        L: '#ff9f2e',
        P: '#9f7cff',
        N: '#2ecc71',
        T: '#ffda59',
        U: '#48d6c8',
        V: '#2688ff',
        W: '#19d27f',
        X: '#f4f7fb',
        Y: '#ff4d5e',
        Z: '#b6ff5a'
    };
    const BASE_SHAPES = {
        F: [[1, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
        I: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
        L: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
        P: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
        N: [[1, 0], [2, 0], [0, 1], [1, 1], [0, 2]],
        T: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
        U: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
        V: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
        W: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
        X: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
        Y: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1]],
        Z: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]]
    };

    const VARIANTS = Object.fromEntries(PIECE_ORDER.map(id => [id, buildVariants(BASE_SHAPES[id])]));
    const PLACEMENTS = Object.fromEntries(PIECE_ORDER.map(id => [id, buildPlacements(id)]));
    let selectedPiece = 'F';
    let variantIndex = 0;
    let placedPieces = {};
    let lastSolution = [];
    let solutionBasePieces = {};
    let solutionIndex = 0;
    let solutionElapsed = 0;

    function normalizeShape(shape) {
        const minX = Math.min(...shape.map(point => point[0]));
        const minY = Math.min(...shape.map(point => point[1]));
        return shape
            .map(point => [point[0] - minX, point[1] - minY])
            .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    }

    function shapeKey(shape) {
        return normalizeShape(shape).map(point => `${point[0]},${point[1]}`).join('|');
    }

    function rotateShape(shape) {
        return normalizeShape(shape.map(point => [point[1], -point[0]]));
    }

    function flipShape(shape) {
        return normalizeShape(shape.map(point => [-point[0], point[1]]));
    }

    function buildVariants(baseShape) {
        const variants = [];
        const seen = new Set();
        [baseShape, flipShape(baseShape)].forEach(seed => {
            let current = normalizeShape(seed);
            for (let i = 0; i < 4; i++) {
                const key = shapeKey(current);
                if (!seen.has(key)) {
                    seen.add(key);
                    variants.push(normalizeShape(current));
                }
                current = rotateShape(current);
            }
        });
        return variants;
    }

    function buildPlacements(pieceId) {
        const placements = [];
        VARIANTS[pieceId].forEach((shape, variant) => {
            const width = Math.max(...shape.map(point => point[0])) + 1;
            const height = Math.max(...shape.map(point => point[1])) + 1;
            for (let row = 0; row <= ROWS - height; row++) {
                for (let col = 0; col <= COLS - width; col++) {
                    const cells = shape.map(point => (row + point[1]) * COLS + (col + point[0]));
                    placements.push({ pieceId, variant, row, col, cells });
                }
            }
        });
        return placements;
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function copyPlacement(placement) {
        return {
            pieceId: placement.pieceId,
            variant: placement.variant,
            row: placement.row,
            col: placement.col,
            cells: placement.cells.slice()
        };
    }

    function clearSolution() {
        lastSolution = [];
        solutionBasePieces = {};
        solutionIndex = 0;
        solutionElapsed = 0;
    }

    function getCurrentVariant() {
        const variants = VARIANTS[selectedPiece] || [];
        return variants[variantIndex % variants.length] || [];
    }

    function getBoard() {
        const board = Array(CELL_COUNT).fill('');
        Object.values(placedPieces).forEach(placement => {
            placement.cells.forEach(cell => {
                board[cell] = placement.pieceId;
            });
        });
        return board;
    }

    function getPlacementForAnchor(pieceId, variant, row, col) {
        const shape = VARIANTS[pieceId][variant];
        if (!shape) return null;
        const cells = [];
        for (const point of shape) {
            const r = row + point[1];
            const c = col + point[0];
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
            cells.push(r * COLS + c);
        }
        return { pieceId, variant, row, col, cells };
    }

    function canPlace(placement, board = getBoard(), ignorePiece = '') {
        if (!placement) return false;
        return placement.cells.every(cell => !board[cell] || board[cell] === ignorePiece);
    }

    function removePiece(pieceId) {
        if (!pieceId) return;
        delete placedPieces[pieceId];
        clearSolution();
    }

    function placePieceAt(row, col) {
        const board = getBoard();
        const existing = board[row * COLS + col];
        if (existing) {
            selectedPiece = existing;
            variantIndex = placedPieces[existing] ? placedPieces[existing].variant : 0;
            removePiece(existing);
            renderPentomino();
            setText('pentomino-status', `已取回 ${existing} 块`);
            return;
        }

        const placement = getPlacementForAnchor(selectedPiece, variantIndex % VARIANTS[selectedPiece].length, row, col);
        if (!canPlace(placement, board, selectedPiece)) {
            setText('pentomino-status', '当前位置无法放置选中的五连方');
            return;
        }

        placedPieces[selectedPiece] = placement;
        clearSolution();
        renderPentomino();
        setText('pentomino-status', `已放置 ${selectedPiece} 块`);
    }

    function getPlacedCount() {
        return Object.keys(placedPieces).length;
    }

    function isSolved() {
        return getPlacedCount() === PIECE_ORDER.length && getBoard().every(Boolean);
    }

    function renderBoard() {
        const board = getBoard();
        return board.map((pieceId, index) => {
            const row = Math.floor(index / COLS);
            const col = index % COLS;
            const style = pieceId ? ` style="--piece-color:${COLORS[pieceId]}"` : '';
            return `<button class="pentomino-cell ${pieceId ? 'filled' : ''}" type="button" data-row="${row}" data-col="${col}" onclick="window.handlePentominoCell(${row}, ${col})"${style}>${pieceId || ''}</button>`;
        }).join('');
    }

    function renderTray() {
        return PIECE_ORDER.map(pieceId => {
            const placed = Boolean(placedPieces[pieceId]);
            const active = selectedPiece === pieceId;
            return `<button class="pentomino-piece-btn ${active ? 'active' : ''} ${placed ? 'placed' : ''}" type="button" onclick="window.selectPentominoPiece('${pieceId}')" style="--piece-color:${COLORS[pieceId]}">
                <span>${pieceId}</span>
            </button>`;
        }).join('');
    }

    function renderPreview() {
        const shape = getCurrentVariant();
        const width = Math.max(...shape.map(point => point[0])) + 1;
        const height = Math.max(...shape.map(point => point[1])) + 1;
        const cells = [];
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                const active = shape.some(point => point[0] === x && point[1] === y);
                cells.push(`<span class="pentomino-preview-cell ${active ? 'active' : ''}" style="--piece-color:${COLORS[selectedPiece]}"></span>`);
            }
        }
        return `<div class="pentomino-preview-grid" style="--shape-width:${width};--shape-height:${height}">${cells.join('')}</div>`;
    }

    function updateSolutionPanel() {
        setText('pentomino-placed-count', `${getPlacedCount()} / 12`);
        setText('pentomino-empty-count', String(getBoard().filter(cell => !cell).length));
        setText('pentomino-selected-piece', selectedPiece);
        setText('pentomino-variant-count', `${(variantIndex % VARIANTS[selectedPiece].length) + 1} / ${VARIANTS[selectedPiece].length}`);
        setText('pentomino-solution-count', String(lastSolution.length));
        setText('pentomino-time-elapsed', String(solutionElapsed));

        const panel = document.getElementById('pentomino-step-panel');
        const counter = document.getElementById('pentomino-step-counter');
        const move = document.getElementById('pentomino-step-move');
        const progress = document.getElementById('pentomino-step-progress');
        const output = document.getElementById('pentomino-solution-output');

        if (panel) panel.style.display = lastSolution.length ? 'grid' : 'none';
        if (counter) counter.textContent = `${solutionIndex} / ${lastSolution.length}`;
        if (move) {
            const next = lastSolution[solutionIndex];
            move.textContent = next ? `${next.pieceId} @ R${next.row + 1} C${next.col + 1}` : (lastSolution.length ? '执行完成' : '等待求解');
        }
        if (progress) {
            const percent = lastSolution.length ? (solutionIndex / lastSolution.length) * 100 : 0;
            progress.style.width = `${percent}%`;
        }
        if (output) {
            output.textContent = lastSolution.length
                ? lastSolution.map(item => `${item.pieceId}: R${item.row + 1} C${item.col + 1}`).join('  ')
                : '等待生成解法。';
        }
    }

    function renderPentomino() {
        const board = document.getElementById('pentomino-board');
        if (board) board.innerHTML = renderBoard();

        const tray = document.getElementById('pentomino-tray');
        if (tray) tray.innerHTML = renderTray();

        const preview = document.getElementById('pentomino-preview');
        if (preview) preview.innerHTML = renderPreview();

        updateSolutionPanel();
        setText('pentomino-status', isSolved() ? 'Pentomino 棋盘已完整铺满' : '选择一个五连方后点击棋盘放置');
    }

    function getFixedBoardAndRemaining() {
        const fixedBoard = Array(CELL_COUNT).fill('');
        const remaining = PIECE_ORDER.filter(pieceId => !placedPieces[pieceId]);

        for (const placement of Object.values(placedPieces)) {
            for (const cell of placement.cells) {
                if (fixedBoard[cell]) return null;
                fixedBoard[cell] = placement.pieceId;
            }
        }

        return { fixedBoard, remaining };
    }

    function solveExactCover() {
        const setup = getFixedBoardAndRemaining();
        if (!setup) return null;
        const started = performance.now();
        const deadline = started + 1800;
        const board = setup.fixedBoard.slice();
        const remaining = new Set(setup.remaining);
        const chosen = [];

        function fits(placement) {
            return placement.cells.every(cell => !board[cell]);
        }

        function place(placement, value) {
            placement.cells.forEach(cell => {
                board[cell] = value ? placement.pieceId : '';
            });
        }

        function candidatePlacementsForCell(cell) {
            const result = [];
            remaining.forEach(pieceId => {
                PLACEMENTS[pieceId].forEach(placement => {
                    if (placement.cells.includes(cell) && fits(placement)) result.push(placement);
                });
            });
            result.sort((a, b) => VARIANTS[a.pieceId].length - VARIANTS[b.pieceId].length || a.pieceId.localeCompare(b.pieceId));
            return result;
        }

        function pickBestCell() {
            let bestCell = -1;
            let bestCandidates = null;
            for (let cell = 0; cell < CELL_COUNT; cell++) {
                if (board[cell]) continue;
                const candidates = candidatePlacementsForCell(cell);
                if (!candidates.length) return { cell, candidates };
                if (!bestCandidates || candidates.length < bestCandidates.length) {
                    bestCell = cell;
                    bestCandidates = candidates;
                    if (candidates.length === 1) break;
                }
            }
            return { cell: bestCell, candidates: bestCandidates || [] };
        }

        function search() {
            if (performance.now() > deadline) return false;
            if (!remaining.size) return board.every(Boolean);

            const { cell, candidates } = pickBestCell();
            if (cell < 0) return false;
            if (!candidates.length) return false;

            for (const placement of candidates) {
                if (!remaining.has(placement.pieceId) || !fits(placement)) continue;
                remaining.delete(placement.pieceId);
                place(placement, true);
                chosen.push(placement);
                if (search()) return true;
                chosen.pop();
                place(placement, false);
                remaining.add(placement.pieceId);
            }
            return false;
        }

        return search()
            ? {
                fixed: Object.values(placedPieces).map(copyPlacement),
                additions: chosen.map(copyPlacement)
            }
            : null;
    }

    function applySolutionPrefix(count) {
        placedPieces = Object.fromEntries(Object.entries(solutionBasePieces).map(([pieceId, placement]) => [pieceId, copyPlacement(placement)]));
        lastSolution.slice(0, count).forEach(placement => {
            placedPieces[placement.pieceId] = copyPlacement(placement);
        });
    }

    function getWorkspaceHTML() {
        return `<div id="pentomino-workspace" class="space-workspace">
            <div class="grid-container card space-control-panel pentomino-control-panel">
                <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                <h2 class="space-title">Pentomino 五连方</h2>
                <div class="space-subtitle">12 标准五连方 / 6x10 铺砌 / Exact Cover 求解</div>

                <div id="pentomino-preview" class="pentomino-preview"></div>

                <div class="space-action-grid pentomino-action-grid">
                    <button class="cyber-button" onclick="window.rotatePentominoPiece()"><span class="cyber-button__tag">旋转</span></button>
                    <button class="cyber-button" onclick="window.flipPentominoPiece()"><span class="cyber-button__tag">镜像</span></button>
                    <button class="cyber-button" onclick="window.removeSelectedPentomino()"><span class="cyber-button__tag">取回选块</span></button>
                    <button class="cyber-button" onclick="window.clearPentominoBoard()"><span class="cyber-button__tag">清空棋盘</span></button>
                    <button class="cyber-button cyber-glow" onclick="window.solvePentominoBoard()"><span class="cyber-button__tag">求解铺砌</span></button>
                    <button class="cyber-button" onclick="window.executePentominoSolution()"><span class="cyber-button__tag">执行全部</span></button>
                </div>

                <div class="space-stats">
                    <div>已放置: <span id="pentomino-placed-count">0 / 12</span></div>
                    <div>空格: <span id="pentomino-empty-count">60</span></div>
                    <div>选块: <span id="pentomino-selected-piece">F</span></div>
                    <div>形态: <span id="pentomino-variant-count">1 / 8</span></div>
                    <div>解步骤: <span id="pentomino-solution-count">0</span></div>
                    <div>耗时: <span id="pentomino-time-elapsed">0</span> ms</div>
                </div>

                <div class="space-solution-card">
                    <div class="cube-step-panel pentomino-step-panel" id="pentomino-step-panel">
                        <div class="cube-step-reader">
                            <button class="cyber-button" onclick="window.browsePentominoSolution(-1)"><span class="cyber-button__tag">上一步</span></button>
                            <div class="cube-step-current">
                                <div id="pentomino-step-counter">0 / 0</div>
                                <div id="pentomino-step-move">等待求解</div>
                            </div>
                            <button class="cyber-button" onclick="window.browsePentominoSolution(1)"><span class="cyber-button__tag">下一步</span></button>
                        </div>
                        <div class="cube-step-bar"><span id="pentomino-step-progress"></span></div>
                    </div>
                    <div class="result" id="pentomino-solution-output">等待生成解法。</div>
                </div>

                <div class="instructions space-instructions">
                    <h3>系统规则:</h3>
                    <p>选中左侧字母块后点击棋盘放置；点击已放置格会取回对应块。</p>
                    <p>棋盘为标准 6x10，总面积 60，必须正好放入 12 个五连方。</p>
                    <p>求解器使用 exact-cover 回溯，会在当前已放置块的基础上补全剩余棋盘。</p>
                </div>
            </div>

            <div class="grid-container card space-display-panel pentomino-panel">
                <div class="space-cube-hud">
                    <span id="pentomino-status">选择一个五连方后点击棋盘放置</span>
                </div>
                <div id="pentomino-tray" class="pentomino-tray"></div>
                <div id="pentomino-board" class="pentomino-board" style="--pentomino-cols:${COLS};--pentomino-rows:${ROWS};"></div>
                <div class="cube-drag-hint">12 个 pentomino 正好铺满 6x10 棋盘</div>
            </div>
        </div>`;
    }

    function initPentomino() {
        selectedPiece = 'F';
        variantIndex = 0;
        placedPieces = {};
        clearSolution();
        renderPentomino();
    }

    function openPentominoWorkspace() {
        const workspace = document.getElementById('pentomino-workspace');
        if (!workspace) return;
        workspace.style.display = 'flex';
        renderPentomino();
    }

    window.spacePuzzleModules = (window.spacePuzzleModules || []).filter(module => module.id !== 'pentomino');
    window.spacePuzzleModules.push({
        id: 'pentomino',
        getListButton() {
            return '<button class="logic-btn" type="button" onclick="window.openSpacePuzzle(\'pentomino\')">Pentomino 五连方</button>';
        },
        getWorkspaceHTML: getWorkspaceHTML,
        init: initPentomino,
        open: openPentominoWorkspace
    });

    window.selectPentominoPiece = function (pieceId) {
        if (!VARIANTS[pieceId]) return;
        selectedPiece = pieceId;
        variantIndex = placedPieces[pieceId] ? placedPieces[pieceId].variant : 0;
        renderPentomino();
    };

    window.handlePentominoCell = function (row, col) {
        placePieceAt(row, col);
    };

    window.rotatePentominoPiece = function () {
        variantIndex = (variantIndex + 1) % VARIANTS[selectedPiece].length;
        renderPentomino();
    };

    window.flipPentominoPiece = function () {
        const variants = VARIANTS[selectedPiece];
        variantIndex = Math.floor(variants.length / 2 + variantIndex) % variants.length;
        renderPentomino();
    };

    window.removeSelectedPentomino = function () {
        removePiece(selectedPiece);
        renderPentomino();
    };

    window.clearPentominoBoard = function () {
        placedPieces = {};
        clearSolution();
        renderPentomino();
    };

    window.solvePentominoBoard = function () {
        const started = performance.now();
        const solution = isSolved() ? [] : solveExactCover();
        solutionElapsed = Math.max(1, Math.round(performance.now() - started));
        if (solution && solution.additions.length) {
            solutionBasePieces = Object.fromEntries(solution.fixed.map(placement => [placement.pieceId, copyPlacement(placement)]));
            lastSolution = solution.additions;
            solutionIndex = 0;
            renderPentomino();
            setText('pentomino-status', `已找到铺砌方案：${lastSolution.length} 块，下一步 ${lastSolution[0].pieceId}`);
        } else if (isSolved()) {
            clearSolution();
            renderPentomino();
            setText('pentomino-status', '当前棋盘已经完整铺满');
        } else {
            clearSolution();
            solutionElapsed = Math.max(1, Math.round(performance.now() - started));
            renderPentomino();
            setText('pentomino-status', '未在时间限制内找到可行铺砌，请调整已放置块');
        }
    };

    window.browsePentominoSolution = function (delta) {
        if (!lastSolution.length) return;
        solutionIndex = Math.max(0, Math.min(lastSolution.length, solutionIndex + delta));
        applySolutionPrefix(solutionIndex);
        renderPentomino();
        if (solutionIndex >= lastSolution.length) {
            setText('pentomino-status', '解法已执行完成，棋盘已铺满');
        } else {
            setText('pentomino-status', `下一步放置 ${lastSolution[solutionIndex].pieceId}`);
        }
    };

    window.executePentominoSolution = function () {
        if (!lastSolution.length) window.solvePentominoBoard();
        if (!lastSolution.length) return;
        solutionIndex = lastSolution.length;
        applySolutionPrefix(solutionIndex);
        renderPentomino();
        setText('pentomino-status', isSolved() ? '解法已执行完成，棋盘已铺满' : '解法执行完成，但棋盘仍未铺满');
    };
})();
