(function () {
    const SKEWB_STYLE_ID = 'skewb-module-style';
    const SKEWB_STYLES = `
/* 空间类：Skewb 魔方 */
.skewb-control-panel {
  min-width: 360px;
}

.skewb-action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.skewb-panel {
  min-width: 460px;
  background:
    radial-gradient(circle at 22% 16%, rgba(255, 218, 89, 0.1), transparent 30%),
    linear-gradient(135deg, rgba(64, 224, 255, 0.06), rgba(255, 77, 94, 0.06)),
    rgba(0, 0, 0, 0.22);
}

.skewb-scene {
  width: 300px;
  height: 300px;
  display: grid;
  place-items: center;
  perspective: 920px;
  margin: 0 auto 2rem;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.skewb-scene.dragging {
  cursor: grabbing;
}

.skewb-3d {
  width: 190px;
  height: 190px;
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(var(--skewb-rot-x, -28deg)) rotateY(var(--skewb-rot-y, -36deg));
  transition: transform 0.08s linear;
}

.skewb-cube-face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 5px;
  padding: 9px;
  background:
    linear-gradient(135deg, rgba(2, 12, 18, 0.94), rgba(9, 27, 35, 0.86)),
    rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(64, 224, 255, 0.28);
  box-shadow:
    inset 0 0 18px rgba(64, 224, 255, 0.12),
    0 0 24px rgba(64, 224, 255, 0.08);
}

.skewb-cube-face-f {
  transform: translateZ(98px);
}

.skewb-cube-face-b {
  transform: rotateY(180deg) translateZ(98px);
}

.skewb-cube-face-r {
  transform: rotateY(90deg) translateZ(98px);
}

.skewb-cube-face-l {
  transform: rotateY(-90deg) translateZ(98px);
}

.skewb-cube-face-u {
  transform: rotateX(90deg) translateZ(98px);
}

.skewb-cube-face-d {
  transform: rotateX(-90deg) translateZ(98px);
}

.skewb-cube-face-label {
  position: absolute;
  right: 8px;
  bottom: 5px;
  z-index: 2;
  color: rgba(255, 255, 255, 0.28);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0;
  pointer-events: none;
}

.skewb-face-grid {
  display: contents;
}

.skewb-cell {
  min-width: 0;
  min-height: 0;
}

.skewb-cell.empty {
  background:
    linear-gradient(135deg, transparent 45%, rgba(64, 224, 255, 0.16) 48%, rgba(64, 224, 255, 0.16) 52%, transparent 55%),
    rgba(255, 255, 255, 0.025);
  opacity: 0.6;
}

.skewb-cell.active {
  position: relative;
  background:
    radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.42), transparent 27%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.18), transparent 45%),
    var(--skewb-color);
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow:
    inset 0 0 12px rgba(255, 255, 255, 0.16),
    0 0 12px rgba(64, 224, 255, 0.14);
}

.skewb-cell-0.active {
  clip-path: polygon(0 0, 100% 0, 0 100%);
}

.skewb-cell-2.active {
  clip-path: polygon(0 0, 100% 0, 100% 100%);
}

.skewb-cell-6.active {
  clip-path: polygon(0 0, 100% 100%, 0 100%);
}

.skewb-cell-8.active {
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
}

.skewb-cell-4.active {
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  border-color: rgba(255, 218, 89, 0.78);
  box-shadow:
    inset 0 0 12px rgba(255, 255, 255, 0.16),
    0 0 15px rgba(255, 218, 89, 0.22);
}

.skewb-move-spatial {
  grid-template-areas:
    ". top top ."
    "left left right right"
    ". back back .";
}

.skewb-face-control {
  min-height: 88px;
}

.skewb-face-control .cube-face-control-actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

#skewb-step-counter {
  color: #ffda59;
  font-weight: 800;
  text-shadow: 0 0 6px rgba(255, 218, 89, 0.86);
}

#skewb-step-move {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.78);
}

@media (max-width: 980px) {
  .skewb-move-spatial {
    width: min(560px, 100%);
  }
}

@media (max-width: 760px) {
  .skewb-control-panel {
    min-width: 0;
    width: 100%;
    padding: 1.25rem;
  }

  .skewb-action-grid {
    grid-template-columns: 1fr;
  }

  .skewb-scene {
    width: 250px;
    height: 250px;
    margin-bottom: 1.6rem;
  }

  .skewb-3d {
    width: 156px;
    height: 156px;
  }

  .skewb-cube-face {
    gap: 4px;
    padding: 7px;
  }

  .skewb-cube-face-f {
    transform: translateZ(81px);
  }

  .skewb-cube-face-b {
    transform: rotateY(180deg) translateZ(81px);
  }

  .skewb-cube-face-r {
    transform: rotateY(90deg) translateZ(81px);
  }

  .skewb-cube-face-l {
    transform: rotateY(-90deg) translateZ(81px);
  }

  .skewb-cube-face-u {
    transform: rotateX(90deg) translateZ(81px);
  }

  .skewb-cube-face-d {
    transform: rotateX(-90deg) translateZ(81px);
  }

  .skewb-move-spatial {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      "top top"
      "left right"
      "back back";
  }
}
`;

    function injectSkewbStyles() {
        if (window.SpacePuzzleUI && typeof window.SpacePuzzleUI.injectStyles === 'function') {
            window.SpacePuzzleUI.injectStyles(SKEWB_STYLE_ID, SKEWB_STYLES);
            return;
        }
        if (typeof document === 'undefined' || document.getElementById(SKEWB_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = SKEWB_STYLE_ID;
        style.textContent = SKEWB_STYLES;
        document.head.appendChild(style);
    }

    injectSkewbStyles();

    const FACE_COLORS = {
        U: '#f4f7fb',
        D: '#ffd84a',
        F: '#19d27f',
        B: '#2688ff',
        R: '#ff4d5e',
        L: '#ff9f2e'
    };
    const FACE_LABELS = {
        U: '上',
        D: '下',
        F: '前',
        B: '后',
        R: '右',
        L: '左'
    };
    const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'];
    const ACTIVE_FACE_INDICES = [0, 2, 4, 6, 8];
    const MOVE_DEFS = {
        U: { axis: [1, 1, 1], label: '前上轴' },
        R: { axis: [1, 1, -1], label: '右上轴' },
        L: { axis: [-1, 1, 1], label: '左上轴' },
        B: { axis: [-1, 1, -1], label: '后上轴' }
    };
    const MOVE_FACES = Object.keys(MOVE_DEFS);
    const FACE_GEOMETRY = {
        U: { normal: [0, 1, 0], center: [0, 1, 0], corners: [[-1, 1, -1], [1, 1, -1], [-1, 1, 1], [1, 1, 1]] },
        D: { normal: [0, -1, 0], center: [0, -1, 0], corners: [[-1, -1, 1], [1, -1, 1], [-1, -1, -1], [1, -1, -1]] },
        F: { normal: [0, 0, 1], center: [0, 0, 1], corners: [[-1, 1, 1], [1, 1, 1], [-1, -1, 1], [1, -1, 1]] },
        B: { normal: [0, 0, -1], center: [0, 0, -1], corners: [[1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]] },
        R: { normal: [1, 0, 0], center: [1, 0, 0], corners: [[1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1]] },
        L: { normal: [-1, 0, 0], center: [-1, 0, 0], corners: [[-1, 1, -1], [-1, 1, 1], [-1, -1, -1], [-1, -1, 1]] }
    };

    let stickers = createSolvedStickers();
    let history = [];
    let rawHistoryLength = 0;
    let lastSolution = [];
    let solutionIndex = 0;
    let solutionElapsed = 0;
    let skewbRotX = -28;
    let skewbRotY = -36;

    function makeSticker(face, pos, normal) {
        return {
            pos: pos.slice(),
            normal: normal.slice(),
            color: FACE_COLORS[face]
        };
    }

    function createSolvedStickers() {
        const next = [];
        FACE_NAMES.forEach(face => {
            const geometry = FACE_GEOMETRY[face];
            next.push(makeSticker(face, geometry.center, geometry.normal));
            geometry.corners.forEach(pos => next.push(makeSticker(face, pos, geometry.normal)));
        });
        return next;
    }

    function cloneSticker(sticker) {
        return {
            pos: sticker.pos.slice(),
            normal: sticker.normal.slice(),
            color: sticker.color
        };
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function applySkewbRotation() {
        const mount = document.getElementById('skewb-3d');
        if (!mount) return;
        mount.style.setProperty('--skewb-rot-x', `${skewbRotX}deg`);
        mount.style.setProperty('--skewb-rot-y', `${skewbRotY}deg`);
    }

    function bindSkewbDrag() {
        const scene = document.querySelector ? document.querySelector('.skewb-scene') : null;
        if (!scene || scene.dataset.dragReady === 'true') return;
        scene.dataset.dragReady = 'true';

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startRotX = skewbRotX;
        let startRotY = skewbRotY;

        scene.addEventListener('pointerdown', event => {
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            startRotX = skewbRotX;
            startRotY = skewbRotY;
            scene.classList.add('dragging');
            if (scene.setPointerCapture) scene.setPointerCapture(event.pointerId);
        });

        scene.addEventListener('pointermove', event => {
            if (!dragging) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            skewbRotY = startRotY + dx * 0.45;
            skewbRotX = Math.max(-80, Math.min(80, startRotX - dy * 0.45));
            applySkewbRotation();
        });

        const stopDragging = event => {
            if (!dragging) return;
            dragging = false;
            scene.classList.remove('dragging');
            if (scene.releasePointerCapture) scene.releasePointerCapture(event.pointerId);
        };

        scene.addEventListener('pointerup', stopDragging);
        scene.addEventListener('pointercancel', stopDragging);
        scene.addEventListener('pointerleave', stopDragging);
    }

    function dot(vec, axis) {
        return vec[0] * axis[0] + vec[1] * axis[1] + vec[2] * axis[2];
    }

    function rotateByBodyAxis(vec, axis, dir) {
        const signed = [axis[0] * vec[0], axis[1] * vec[1], axis[2] * vec[2]];
        const rotated = dir === 1
            ? [signed[2], signed[0], signed[1]]
            : [signed[1], signed[2], signed[0]];
        return [
            axis[0] * rotated[0],
            axis[1] * rotated[1],
            axis[2] * rotated[2]
        ];
    }

    function normalToFace(normal) {
        const [x, y, z] = normal;
        if (y === 1) return 'U';
        if (y === -1) return 'D';
        if (z === 1) return 'F';
        if (z === -1) return 'B';
        if (x === 1) return 'R';
        return 'L';
    }

    function faceIndex(face, pos) {
        const [x, y, z] = pos;
        let row = 1;
        let col = 1;
        if (face === 'F') { row = 1 - y; col = x + 1; }
        if (face === 'B') { row = 1 - y; col = 1 - x; }
        if (face === 'U') { row = z + 1; col = x + 1; }
        if (face === 'D') { row = 1 - z; col = x + 1; }
        if (face === 'R') { row = 1 - y; col = 1 - z; }
        if (face === 'L') { row = 1 - y; col = z + 1; }
        return row * 3 + col;
    }

    function getFacelets(state = stickers) {
        const faces = {};
        FACE_NAMES.forEach(face => faces[face] = Array(9).fill(null));
        state.forEach(sticker => {
            const face = normalToFace(sticker.normal);
            const index = faceIndex(face, sticker.pos);
            faces[face][index] = sticker.color;
        });
        return faces;
    }

    function isSolved() {
        const faces = getFacelets();
        return FACE_NAMES.every(face => ACTIVE_FACE_INDICES.every(index => faces[face][index] === FACE_COLORS[face]));
    }

    function moveAmount(move) {
        if (move.endsWith("'") || move.endsWith('2')) return 2;
        return 1;
    }

    function amountToMove(face, amount) {
        const normalized = ((amount % 3) + 3) % 3;
        if (normalized === 0) return '';
        if (normalized === 1) return face;
        return `${face}'`;
    }

    function invertMove(move) {
        const face = move.charAt(0);
        return amountToMove(face, 3 - moveAmount(move));
    }

    function normalizeMoveSequence(moves) {
        const result = [];
        moves.forEach(move => {
            const face = move.charAt(0);
            if (!MOVE_DEFS[face]) return;
            const previous = result[result.length - 1];
            if (!previous || previous.charAt(0) !== face) {
                result.push(amountToMove(face, moveAmount(move)));
                return;
            }

            const mergedAmount = moveAmount(previous) + moveAmount(move);
            result.pop();
            const merged = amountToMove(face, mergedAmount);
            if (merged) result.push(merged);
        });
        return result;
    }

    function inverseSequence(moves) {
        return moves.slice().reverse().map(invertMove).filter(Boolean);
    }

    function parseFormula(formula) {
        const compact = String(formula || '')
            .toUpperCase()
            .replace(/[’‘`]/g, "'")
            .replace(/[，,;；]/g, ' ')
            .replace(/\s+/g, '');
        if (!compact) return [];
        const tokens = compact.match(/[RLUB](?:2|')?/g) || [];
        if (tokens.join('') !== compact) {
            throw new Error("公式只能包含 R L U B、撇号和 2，例如：R U R' B");
        }
        return tokens.map(move => amountToMove(move.charAt(0), moveAmount(move))).filter(Boolean);
    }

    function applyBaseMove(face, dir) {
        const def = MOVE_DEFS[face];
        if (!def) return;
        stickers = stickers.map(sticker => {
            if (dot(sticker.pos, def.axis) <= 0.5) return cloneSticker(sticker);
            return {
                pos: rotateByBodyAxis(sticker.pos, def.axis, dir),
                normal: rotateByBodyAxis(sticker.normal, def.axis, dir),
                color: sticker.color
            };
        });
    }

    function applyMove(move, options = {}) {
        const face = move.charAt(0);
        if (!MOVE_DEFS[face]) return false;
        const amount = moveAmount(move);
        for (let i = 0; i < amount; i++) {
            applyBaseMove(face, 1);
        }

        if (options.record) {
            history.push(amountToMove(face, amount));
            history = normalizeMoveSequence(history);
            rawHistoryLength++;
            lastSolution = [];
            solutionIndex = 0;
            solutionElapsed = 0;
        }

        if (options.render !== false) renderSkewb();
        return true;
    }

    function randomScramble(length = 12) {
        const moves = [];
        let previous = '';
        for (let i = 0; i < length; i++) {
            let face = MOVE_FACES[Math.floor(Math.random() * MOVE_FACES.length)];
            while (face === previous) {
                face = MOVE_FACES[Math.floor(Math.random() * MOVE_FACES.length)];
            }
            previous = face;
            moves.push(Math.random() < 0.5 ? face : `${face}'`);
        }
        return moves;
    }

    function renderFace(face, cells) {
        const faceCells = Array.from({ length: 9 }, (_, index) => {
            const color = cells[index];
            const activeClass = ACTIVE_FACE_INDICES.includes(index) ? 'active' : 'empty';
            const style = color ? ` style="--skewb-color:${color}"` : '';
            return `<span class="skewb-cell skewb-cell-${index} ${activeClass}"${style}></span>`;
        }).join('');
        return `<div class="skewb-cube-face skewb-cube-face-${face.toLowerCase()}">
            <div class="skewb-cube-face-label">${FACE_LABELS[face]}</div>
            <div class="skewb-face-grid">${faceCells}</div>
        </div>`;
    }

    function updateSolutionPanel() {
        setText('skewb-history-count', String(rawHistoryLength));
        setText('skewb-reduced-count', String(history.length));
        setText('skewb-solution-count', String(lastSolution.length));
        setText('skewb-time-elapsed', String(solutionElapsed));

        const output = document.getElementById('skewb-solution-output');
        if (output) {
            output.textContent = lastSolution.length ? lastSolution.join(' ') : '等待生成解法。';
        }

        const panel = document.getElementById('skewb-step-panel');
        const counter = document.getElementById('skewb-step-counter');
        const move = document.getElementById('skewb-step-move');
        const progress = document.getElementById('skewb-step-progress');
        if (panel) panel.style.display = lastSolution.length ? 'grid' : 'none';
        if (counter) counter.textContent = `${solutionIndex} / ${lastSolution.length}`;
        if (move) {
            move.textContent = solutionIndex >= lastSolution.length
                ? (lastSolution.length ? '执行完成' : '等待求解')
                : lastSolution[solutionIndex];
        }
        if (progress) {
            const percent = lastSolution.length ? (solutionIndex / lastSolution.length) * 100 : 0;
            progress.style.width = `${percent}%`;
        }
    }

    function renderSkewb() {
        const board = document.getElementById('skewb-3d');
        if (board) {
            const faces = getFacelets();
            board.innerHTML = ['U', 'L', 'F', 'R', 'B', 'D']
                .map(face => renderFace(face, faces[face]))
                .join('');
            applySkewbRotation();
            bindSkewbDrag();
        }

        updateSolutionPanel();
        setText('skewb-state-summary', isSolved() ? '已还原' : '待还原');
        setText('skewb-status', isSolved() ? 'Skewb 魔方处于还原态' : 'Skewb 魔方已扰乱，等待求解');
    }

    function getWorkspaceHTML() {
        const faceGroups = [
            { face: 'U', label: MOVE_DEFS.U.label, pos: 'top' },
            { face: 'L', label: MOVE_DEFS.L.label, pos: 'left' },
            { face: 'R', label: MOVE_DEFS.R.label, pos: 'right' },
            { face: 'B', label: MOVE_DEFS.B.label, pos: 'back' }
        ];
        const moveButtons = faceGroups.map(group => {
            const moves = [group.face, `${group.face}'`, `${group.face}2`]
                .map(move => `<button class="cube-move-chip" onclick="window.applySkewbMoveFromButton('${move.replace("'", "\\'")}')">${move}</button>`)
                .join('');
            return `<div class="cube-face-control skewb-face-control cube-face-control-${group.pos}" style="--face-color:${FACE_COLORS[group.face]}">
                <div class="cube-face-control-label"><span>${group.face}</span><small>${group.label}</small></div>
                <div class="cube-face-control-actions">${moves}</div>
            </div>`;
        }).join('');

        return `<div id="skewbmofang-workspace" class="space-workspace">
            <div class="grid-container card space-control-panel skewb-control-panel">
                <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                <h2 class="space-title">Skewb 魔方</h2>
                <div class="space-subtitle">斜转魔方 / R L U B 记号 / 历史规约求解</div>

                <textarea id="skewb-formula-input" class="space-formula-input" placeholder="输入扰乱公式，例如：R U R' B L' U"></textarea>

                <div class="space-action-grid skewb-action-grid">
                    <button class="cyber-button" onclick="window.applySkewbFormula()"><span class="cyber-button__tag">应用公式</span></button>
                    <button class="cyber-button" onclick="window.scrambleSkewb()"><span class="cyber-button__tag">随机扰乱</span></button>
                    <button class="cyber-button" onclick="window.resetSkewb()"><span class="cyber-button__tag">重置魔方</span></button>
                    <button class="cyber-button cyber-glow" onclick="window.solveSkewb()"><span class="cyber-button__tag">规约求解</span></button>
                    <button class="cyber-button" onclick="window.executeSkewbSolution()"><span class="cyber-button__tag">执行全部</span></button>
                    <button class="cyber-button" onclick="window.clearSkewbHistory()"><span class="cyber-button__tag">清空记录</span></button>
                </div>

                <div class="space-stats">
                    <div>状态: <span id="skewb-state-summary">已还原</span></div>
                    <div>历史步数: <span id="skewb-history-count">0</span></div>
                    <div>有效步数: <span id="skewb-reduced-count">0</span></div>
                    <div>解法步数: <span id="skewb-solution-count">0</span></div>
                    <div>算力耗时: <span id="skewb-time-elapsed">0</span> ms</div>
                </div>

                <div class="space-solution-card">
                    <div class="cube-step-panel skewb-step-panel" id="skewb-step-panel">
                        <div class="cube-step-reader">
                            <button class="cyber-button" onclick="window.browseSkewbSolution(-1)"><span class="cyber-button__tag">上一步</span></button>
                            <div class="cube-step-current">
                                <div id="skewb-step-counter">0 / 0</div>
                                <div id="skewb-step-move">等待求解</div>
                            </div>
                            <button class="cyber-button" onclick="window.browseSkewbSolution(1)"><span class="cyber-button__tag">下一步</span></button>
                        </div>
                        <div class="cube-step-bar"><span id="skewb-step-progress"></span></div>
                    </div>
                    <div class="result" id="skewb-solution-output">等待生成解法。</div>
                </div>

                <div class="instructions space-instructions">
                    <h3>系统规则:</h3>
                    <p>支持 Skewb 常用记号 R、L、U、B，可加撇号表示反向；2 会按两次 120 度转动处理。</p>
                    <p>右侧展开图显示六个面的四个角块与中心块，空位代表 Skewb 面上的斜切边线。</p>
                    <p>求解器会反向执行本模块记录的公式、随机扰乱和手动操作，适合演示与复原练习。</p>
                </div>
            </div>

            <div class="grid-container card space-display-panel skewb-panel">
                <div class="space-cube-hud">
                    <span id="skewb-status">Skewb 魔方处于还原态</span>
                </div>
                <div class="skewb-scene">
                    <div id="skewb-3d" class="skewb-3d"></div>
                </div>
                <div class="cube-drag-hint">拖动 Skewb 观察空间姿态</div>
                <div class="cube-control-title">Skewb 斜转操作台</div>
                <div class="cube-move-spatial skewb-move-spatial">${moveButtons}</div>
            </div>
        </div>`;
    }

    function initSkewb() {
        stickers = createSolvedStickers();
        history = [];
        rawHistoryLength = 0;
        lastSolution = [];
        solutionIndex = 0;
        solutionElapsed = 0;
        renderSkewb();
    }

    function openSkewbWorkspace() {
        const workspace = document.getElementById('skewbmofang-workspace');
        if (!workspace) return;
        workspace.style.display = 'flex';
        renderSkewb();
    }

    window.spacePuzzleModules = (window.spacePuzzleModules || []).filter(module => module.id !== 'skewbmofang');
    window.spacePuzzleModules.push({
        id: 'skewbmofang',
        getListButton() {
            return '<button class="logic-btn" type="button" onclick="window.openSpacePuzzle(\'skewbmofang\')">Skewb 魔方</button>';
        },
        getWorkspaceHTML: getWorkspaceHTML,
        init: initSkewb,
        open: openSkewbWorkspace
    });

    window.resetSkewb = function () {
        initSkewb();
        const input = document.getElementById('skewb-formula-input');
        if (input) input.value = '';
    };

    window.clearSkewbHistory = function () {
        history = [];
        rawHistoryLength = 0;
        lastSolution = [];
        solutionIndex = 0;
        solutionElapsed = 0;
        renderSkewb();
        setText('skewb-status', '已清空当前操作记录');
    };

    window.scrambleSkewb = function () {
        stickers = createSolvedStickers();
        history = [];
        rawHistoryLength = 0;
        lastSolution = [];
        solutionIndex = 0;
        solutionElapsed = 0;

        const moves = randomScramble();
        const input = document.getElementById('skewb-formula-input');
        if (input) input.value = moves.join(' ');
        moves.forEach(move => applyMove(move, { record: true, render: false }));
        renderSkewb();
        setText('skewb-status', `已随机扰乱 ${rawHistoryLength} 步，等待求解`);
    };

    window.applySkewbFormula = function () {
        try {
            const input = document.getElementById('skewb-formula-input');
            const moves = parseFormula(input ? input.value : '');
            moves.forEach(move => applyMove(move, { record: true, render: false }));
            renderSkewb();
        } catch (error) {
            setText('skewb-status', error.message);
        }
    };

    window.applySkewbMoveFromButton = function (move) {
        applyMove(move, { record: true });
    };

    window.solveSkewb = function () {
        const started = performance.now();
        if (isSolved()) {
            history = [];
            rawHistoryLength = 0;
            lastSolution = [];
            solutionIndex = 0;
        } else {
            history = normalizeMoveSequence(history);
            lastSolution = inverseSequence(history);
            solutionIndex = 0;
        }
        solutionElapsed = Math.max(1, Math.round(performance.now() - started));
        renderSkewb();
        if (lastSolution.length) {
            setText('skewb-status', `已生成规约解法：共 ${lastSolution.length} 步，下一步 ${lastSolution[0]}`);
        } else {
            setText('skewb-status', isSolved() ? '无需求解，当前 Skewb 已处于还原态' : '缺少可回溯的扰乱历史');
        }
    };

    window.browseSkewbSolution = function (delta) {
        if (!lastSolution.length) return;

        if (delta > 0) {
            if (solutionIndex >= lastSolution.length) return;
            applyMove(lastSolution[solutionIndex], { record: false, render: false });
            solutionIndex++;
        } else if (delta < 0) {
            if (solutionIndex <= 0) return;
            solutionIndex--;
            applyMove(invertMove(lastSolution[solutionIndex]), { record: false, render: false });
        }

        renderSkewb();
        if (solutionIndex >= lastSolution.length && isSolved()) {
            history = [];
            rawHistoryLength = 0;
            updateSolutionPanel();
            setText('skewb-status', '解法已执行完成，Skewb 已还原');
        } else if (solutionIndex < lastSolution.length) {
            setText('skewb-status', `下一步 ${lastSolution[solutionIndex]}`);
        }
    };

    window.executeSkewbSolution = function () {
        if (!lastSolution.length) window.solveSkewb();
        if (!lastSolution.length) return;

        lastSolution.slice(solutionIndex).forEach(move => applyMove(move, { record: false, render: false }));
        solutionIndex = lastSolution.length;
        history = [];
        rawHistoryLength = 0;
        renderSkewb();
        setText('skewb-status', isSolved() ? '解法已执行完成，Skewb 已还原' : '解法执行完成，但状态仍未还原');
    };
})();
