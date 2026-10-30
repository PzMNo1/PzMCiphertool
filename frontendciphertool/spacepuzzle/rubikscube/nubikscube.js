(function () {
    const STANDARD_CUBE_STYLE_ID = 'standard-rubiks-cube-style';
const STANDARD_CUBE_STYLES = `
/* 空间类：标准三维魔方 */
#cube-step-counter {
  color: var(--neon-cyan);
  font-weight: 800;
  text-shadow: 0 0 6px var(--neon-cyan);
}

#cube-step-move {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.7);
}

#standard-cube-workspace .space-cube-hud {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  row-gap: 0.25rem;
  font-size: 0.9rem;
}

.cube-last-move {
  color: rgba(64, 224, 255, 0.62);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 1px;
  white-space: nowrap;
}

.cube-last-move b {
  margin-left: 2px;
  color: #eaffff;
  font-weight: 800;
}

.space-cube-panel {
  min-width: 400px;
  background:
    linear-gradient(135deg, rgba(64, 224, 255, 0.07), rgba(255, 255, 255, 0.02)),
    rgba(0, 0, 0, 0.22);
}

.space-workspace-header {
  display: none;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
}

.space-mobile-actions {
  display: none;
}

.cube-scene {
  position: relative;
  width: 320px;
  height: 300px;
  display: grid;
  place-items: center;
  perspective: 900px;
  margin: 0 auto 1.1rem;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.cube-scene.dragging {
  cursor: grabbing;
}

.cube-3d {
  width: 180px;
  height: 180px;
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(var(--cube-rot-x, -28deg)) rotateY(var(--cube-rot-y, -38deg));
  transition: transform 0.08s linear;
}

.cube-3d.is-resetting {
  transition: transform 0.46s cubic-bezier(0.2, 0.85, 0.25, 1);
}

.cube-face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  padding: 7px;
  background: rgba(2, 12, 18, 0.86);
  border: 1px solid rgba(64, 224, 255, 0.26);
  box-shadow:
    inset 0 0 18px rgba(64, 224, 255, 0.12),
    0 0 24px rgba(64, 224, 255, 0.08);
}

.cube-face b {
  position: absolute;
  right: 8px;
  bottom: 5px;
  color: rgba(255, 255, 255, 0.28);
  font-size: 0.65rem;
  letter-spacing: 1px;
  pointer-events: none;
}

.cube-face-f {
  transform: translateZ(94px);
}

.cube-face-b {
  transform: rotateY(180deg) translateZ(94px);
}

.cube-face-r {
  transform: rotateY(90deg) translateZ(94px);
}

.cube-face-l {
  transform: rotateY(-90deg) translateZ(94px);
}

.cube-face-u {
  transform: rotateX(90deg) translateZ(94px);
}

.cube-face-d {
  transform: rotateX(-90deg) translateZ(94px);
}

.cube-sticker {
  display: block;
  border-radius: 4px;
  background:
    radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.72), transparent 22%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.24), transparent 42%),
    var(--sticker-color);
  border: 1px solid rgba(255, 255, 255, 0.38);
  box-shadow:
    inset 0 0 10px rgba(255, 255, 255, 0.24),
    0 0 12px rgba(64, 224, 255, 0.16);
}

.cube-sticker.is-grabbed {
  outline: 2px solid rgba(240, 255, 255, 0.92);
  outline-offset: -2px;
  box-shadow:
    inset 0 0 14px rgba(255, 255, 255, 0.6),
    0 0 18px rgba(64, 224, 255, 0.62);
}

.cube-face.is-turned {
  animation: cube-face-turn 0.44s ease;
}

@keyframes cube-face-turn {
  0% {
    border-color: rgba(170, 248, 255, 0.95);
    box-shadow:
      inset 0 0 30px rgba(64, 224, 255, 0.5),
      0 0 36px rgba(64, 224, 255, 0.45);
  }

  100% {
    border-color: rgba(64, 224, 255, 0.26);
    box-shadow:
      inset 0 0 18px rgba(64, 224, 255, 0.12),
      0 0 24px rgba(64, 224, 255, 0.08);
  }
}

.cube-drag-badge {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 6;
  min-width: 48px;
  padding: 3px 10px;
  transform: translate(-50%, -165%);
  border: 1px solid var(--cube-badge-color, #40e0ff);
  border-radius: 4px;
  background: rgba(2, 12, 18, 0.9);
  color: #f2ffff;
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 1px;
  text-align: center;
  box-shadow: 0 0 14px rgba(64, 224, 255, 0.4);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
}

.cube-drag-badge.is-visible {
  opacity: 1;
}

.cube-drag-badge.is-committed {
  animation: cube-badge-pop 0.32s ease;
}

@keyframes cube-badge-pop {
  0% {
    transform: translate(-50%, -165%) scale(0.78);
  }

  55% {
    transform: translate(-50%, -165%) scale(1.12);
  }

  100% {
    transform: translate(-50%, -165%) scale(1);
  }
}

#standard-cube-workspace .cube-drag-hint {
  margin: -0.35rem 0 1rem;
  line-height: 1.7;
  text-align: center;
}

.cube-toolbar {
  width: min(620px, 100%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.1rem;
}

.cube-toolbar .cyber-button {
  flex: 1 1 0;
  min-width: 0;
  min-height: 42px;
  padding: 0.35rem 0.3rem;
  font-size: 0.78rem;
}

.cube-toolbar .cyber-button:disabled {
  opacity: 0.34;
  border-color: rgba(255, 255, 255, 0.28);
  color: rgba(255, 255, 255, 0.5);
  box-shadow: none;
  cursor: not-allowed;
  pointer-events: none;
}

.cube-pad {
  width: min(620px, 100%);
}

.cube-pad-toggle {
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0.4rem 0.8rem;
  border: 1px dashed rgba(64, 224, 255, 0.3);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.24);
  color: rgba(255, 255, 255, 0.72);
  font-family: inherit;
  font-size: 0.8rem;
  letter-spacing: 2px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.cube-pad-toggle:hover {
  border-color: rgba(64, 224, 255, 0.72);
  color: #eaffff;
}

.cube-pad-caret {
  transition: transform 0.24s ease;
}

.cube-pad:not(.is-collapsed) .cube-pad-caret {
  transform: rotate(180deg);
}

.cube-pad.is-collapsed .cube-move-spatial {
  display: none;
}

.cube-move-grid {
  display: none;
}

.cube-move-btn {
  min-width: 0;
  padding: 0.55rem 0.25rem;
}

.space-stats.cube-stats-area {
  display: block;
}

.cube-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.7rem;
}

.cube-map-panel {
  display: none;
  width: 100%;
}

.space-stats.cube-map-open .cube-stat-grid {
  display: none;
}

.space-stats.cube-map-open .cube-map-panel {
  display: block;
}

.cube-map-frame {
  min-height: 238px;
  padding: 0.75rem;
  border: 1px solid rgba(64, 224, 255, 0.18);
  background:
    radial-gradient(circle at 50% 50%, rgba(64, 224, 255, 0.1), transparent 68%),
    rgba(0, 0, 0, 0.28);
  overflow: visible;
}

.cube-map-svg {
  display: block;
  width: 100%;
  min-height: 238px;
}

.cube-map-cycle {
  fill: none;
  stroke: rgba(225, 241, 255, 0.28);
  stroke-width: 1.15;
  vector-effect: non-scaling-stroke;
}

.cube-map-face-loop {
  fill: none;
  stroke: rgba(64, 224, 255, 0.2);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.cube-map-node {
  stroke: rgba(2, 12, 18, 0.92);
  stroke-width: 1.4;
  filter: drop-shadow(0 0 3px rgba(64, 224, 255, 0.35));
}

.cube-map-node-center {
  stroke: rgba(255, 255, 255, 0.82);
  stroke-width: 1.7;
}

.cube-map-label {
  fill: rgba(234, 255, 255, 0.72);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0;
  text-anchor: middle;
  pointer-events: none;
}

@media (max-width: 760px) {
  .cube-scene {
    width: 100%;
    height: 280px;
    margin-bottom: 0.9rem;
  }

  .cube-3d {
    width: 138px;
    height: 138px;
  }

  .cube-face {
    gap: 3px;
    padding: 5px;
  }

  .cube-face-f {
    transform: translateZ(72px);
  }

  .cube-face-b {
    transform: rotateY(180deg) translateZ(72px);
  }

  .cube-face-r {
    transform: rotateY(90deg) translateZ(72px);
  }

  .cube-face-l {
    transform: rotateY(-90deg) translateZ(72px);
  }

  .cube-face-u {
    transform: rotateX(90deg) translateZ(72px);
  }

  .cube-face-d {
    transform: rotateX(-90deg) translateZ(72px);
  }

  #standard-cube-workspace {
    flex-direction: column;
    gap: 1rem;
  }

  #standard-cube-workspace .space-workspace-header {
    display: flex;
    order: -2;
  }

  #standard-cube-workspace .space-workspace-header .space-back-btn {
    margin-bottom: 0.35rem;
  }

  #standard-cube-workspace .space-workspace-header .space-title {
    margin: 0;
    line-height: 1.2;
  }

  #standard-cube-workspace .space-workspace-header .space-subtitle {
    margin-bottom: 0;
  }

  #standard-cube-workspace .space-mobile-actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
    margin-top: 0.45rem;
  }

  #standard-cube-workspace .space-mobile-actions .cyber-button {
    min-height: 36px;
    padding: 0.35rem 0.2rem;
    font-size: 0.78rem;
  }

  #standard-cube-workspace > .space-display-panel {
    order: -1;
  }

  .space-cube-panel {
    min-width: 0;
  }

  .cube-toolbar {
    gap: 0.4rem;
  }

  .cube-toolbar .cyber-button {
    min-height: 46px;
    font-size: 0.8rem;
  }

  .cube-pad-toggle {
    min-height: 44px;
  }

  #standard-cube-workspace .cube-move-chip {
    min-height: 42px;
    font-size: 0.85rem;
  }

  #standard-cube-workspace .cube-move-spatial {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-areas:
      "top top top"
      "left front right"
      "back bottom bottom";
    gap: 0.5rem;
  }

  #standard-cube-workspace > .space-control-panel > .space-back-btn,
  #standard-cube-workspace > .space-control-panel > .space-title,
  #standard-cube-workspace > .space-control-panel > .space-subtitle {
    display: none;
  }
}
`;

    function injectStandardCubeStyles() {
        if (window.SpacePuzzleUI && typeof window.SpacePuzzleUI.injectStyles === 'function') {
            window.SpacePuzzleUI.injectStyles(STANDARD_CUBE_STYLE_ID, STANDARD_CUBE_STYLES);
            return;
        }
        if (typeof document === 'undefined' || document.getElementById(STANDARD_CUBE_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STANDARD_CUBE_STYLE_ID;
        style.textContent = STANDARD_CUBE_STYLES;
        document.head.appendChild(style);
    }

    injectStandardCubeStyles();

    const FACE_COLORS = {
        U: '#f4f7fb',
        D: '#ffd84a',
        F: '#19d27f',
        B: '#2688ff',
        R: '#ff4d5e',
        L: '#ff9f2e'
    };

    const MOVE_DEFS = {
        U: { axis: 'y', layer: 1, dir: 1 },
        D: { axis: 'y', layer: -1, dir: -1 },
        R: { axis: 'x', layer: 1, dir: 1 },
        L: { axis: 'x', layer: -1, dir: -1 },
        F: { axis: 'z', layer: 1, dir: 1 },
        B: { axis: 'z', layer: -1, dir: -1 }
    };

    const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'];
    const AXIS_INDEX = { x: 0, y: 1, z: 2 };
    const FACE_AXIS = { U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z' };
    const FACE_ORDER = ['U', 'D', 'R', 'L', 'F', 'B'];
    let stickers = [];
    let history = [];
    let rawHistoryLength = 0;
    let lastSolution = [];
    let solutionFrames = [];
    let solutionFrameIndex = 0;
    let cubeRotX = -28;
    let cubeRotY = -38;
    let cubeMapOpen = false;
    let moveLog = [];
    let redoStack = [];
    let gesture = null;
    let orbitFrame = 0;
    let orbitVelocity = { x: 0, y: 0 };
    let lastBackgroundTap = null;
    let faceFlashTimer = 0;
    let badgeTimer = 0;
    const activePointers = new Map();

    const DEFAULT_VIEW = { x: -28, y: -38 };
    const TURN_THRESHOLD = 12;
    const ORBIT_SENSITIVITY = 0.45;
    const FACE_NORMALS = {
        U: [0, 1, 0],
        D: [0, -1, 0],
        R: [1, 0, 0],
        L: [-1, 0, 0],
        F: [0, 0, 1],
        B: [0, 0, -1]
    };

    function makeSticker(face, x, y, z, nx, ny, nz) {
        return {
            pos: [x, y, z],
            normal: [nx, ny, nz],
            color: FACE_COLORS[face]
        };
    }

    function createSolvedStickers() {
        const next = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const x = col - 1;
                const y = 1 - row;
                const z = 1 - row;
                next.push(makeSticker('F', x, y, 1, 0, 0, 1));
                next.push(makeSticker('B', -x, y, -1, 0, 0, -1));
                next.push(makeSticker('U', x, 1, row - 1, 0, 1, 0));
                next.push(makeSticker('D', x, -1, 1 - row, 0, -1, 0));
                next.push(makeSticker('R', 1, y, -x, 1, 0, 0));
                next.push(makeSticker('L', -1, y, x, -1, 0, 0));
            }
        }
        return next;
    }

    function cloneState(state) {
        return state.map(sticker => ({
            pos: [...sticker.pos],
            normal: [...sticker.normal],
            color: sticker.color
        }));
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
        let row = 0;
        let col = 0;
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
        FACE_NAMES.forEach(face => faces[face] = Array(9).fill('#111'));
        state.forEach(sticker => {
            const face = normalToFace(sticker.normal);
            faces[face][faceIndex(face, sticker.pos)] = sticker.color;
        });
        return faces;
    }

    function stateKey(state) {
        const faces = getFacelets(state);
        return FACE_NAMES.map(face => faces[face].join(',')).join('|');
    }

    function rotateVector(vec, axis, dir) {
        const [x, y, z] = vec;
        if (axis === 'x') return dir === 1 ? [x, -z, y] : [x, z, -y];
        if (axis === 'y') return dir === 1 ? [z, y, -x] : [-z, y, x];
        return dir === 1 ? [-y, x, z] : [y, -x, z];
    }

    function invertMove(move) {
        if (move.endsWith('2')) return move;
        if (move.endsWith("'")) return move.slice(0, -1);
        return move + "'";
    }

    function moveAmount(move) {
        if (move.endsWith('2')) return 2;
        if (move.endsWith("'")) return 3;
        return 1;
    }

    function amountToMove(face, amount) {
        const normalized = ((amount % 4) + 4) % 4;
        if (normalized === 0) return '';
        if (normalized === 1) return face;
        if (normalized === 2) return `${face}2`;
        return `${face}'`;
    }

    function normalizeMoveSequence(moves) {
        let current = moves.filter(move => MOVE_DEFS[move.charAt(0)]);
        let changed = true;

        while (changed) {
            changed = false;
            const next = [];

            for (let i = 0; i < current.length;) {
                const axis = FACE_AXIS[current[i].charAt(0)];
                const amounts = {};
                const blockMoves = [];
                let j = i;

                while (j < current.length && FACE_AXIS[current[j].charAt(0)] === axis) {
                    const face = current[j].charAt(0);
                    amounts[face] = ((amounts[face] || 0) + moveAmount(current[j])) % 4;
                    blockMoves.push(current[j]);
                    j++;
                }

                const normalizedBlock = [];
                FACE_ORDER.forEach(face => {
                    if (FACE_AXIS[face] !== axis) return;
                    const move = amountToMove(face, amounts[face] || 0);
                    if (move) normalizedBlock.push(move);
                });

                if (normalizedBlock.join(' ') !== blockMoves.join(' ')) changed = true;
                next.push(...normalizedBlock);
                i = j;
            }

            if (next.join(' ') !== current.join(' ')) changed = true;
            current = next;
        }

        return current;
    }

    function parseFormula(formula) {
        const compact = String(formula || '')
            .toUpperCase()
            .replace(/[’`]/g, "'")
            .replace(/[，,]/g, ' ')
            .replace(/\s+/g, '');
        if (!compact) return [];
        const tokens = compact.match(/[URFDLB](?:2|')?/g) || [];
        if (tokens.join('') !== compact) {
            throw new Error('公式只能包含 U D R L F B、撇号和 2，例如 R U R\' U\'');
        }
        return tokens;
    }

    function turnState(state, move) {
        const base = move.charAt(0);
        const def = MOVE_DEFS[base];
        if (!def) return;
        const turns = move.endsWith('2') ? 2 : 1;
        const dir = move.endsWith("'") ? -def.dir : def.dir;
        const layerAxisIndex = AXIS_INDEX[def.axis];

        for (let turn = 0; turn < turns; turn++) {
            state.forEach(sticker => {
                if (sticker.pos[layerAxisIndex] !== def.layer) return;
                sticker.pos = rotateVector(sticker.pos, def.axis, dir);
                sticker.normal = rotateVector(sticker.normal, def.axis, dir);
            });
        }
    }

    function applyMove(move, shouldRecord) {
        turnState(stickers, move);

        if (shouldRecord) {
            moveLog.push(move);
            redoStack.length = 0;
            rawHistoryLength = moveLog.length;
            history = normalizeMoveSequence(moveLog);
            lastSolution = [];
            resetSolutionPreview();
            setLastAction(move);
        }
    }

    function applyMoves(moves, shouldRecord) {
        moves.forEach(move => applyMove(move, shouldRecord));
        renderCube();
    }

    function syncHistoryAfterLog() {
        rawHistoryLength = moveLog.length;
        history = normalizeMoveSequence(moveLog);
        lastSolution = [];
        resetSolutionPreview();
    }

    function inverseSequence(moves) {
        return [...moves].reverse().map(invertMove);
    }

    function removeStateLoops(moves) {
        const result = [];
        const seen = new Map();
        let state = createSolvedStickers();
        seen.set(stateKey(state), 0);

        moves.forEach(move => {
            turnState(state, move);
            result.push(move);

            const key = stateKey(state);
            if (!seen.has(key)) {
                seen.set(key, result.length);
                return;
            }

            result.length = seen.get(key);
            seen.clear();
            state = createSolvedStickers();
            seen.set(stateKey(state), 0);
            result.forEach((recordedMove, index) => {
                turnState(state, recordedMove);
                seen.set(stateKey(state), index + 1);
            });
        });

        return result;
    }

    function optimizedInverseSequence(moves) {
        const reducedPath = removeStateLoops(normalizeMoveSequence(moves));
        return normalizeMoveSequence(inverseSequence(reducedPath));
    }

    function isSolved(state = stickers) {
        const faces = getFacelets(state);
        return FACE_NAMES.every(face => faces[face].every(color => color === faces[face][0]));
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function setStatus(text) {
        setText('cube-status', text);
    }

    function applyCubeRotation() {
        const mount = document.getElementById('standard-cube-3d');
        if (!mount) return;
        mount.style.setProperty('--cube-rot-x', `${cubeRotX}deg`);
        mount.style.setProperty('--cube-rot-y', `${cubeRotY}deg`);
    }

    const MAP_RING_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
    const MAP_FACE_LAYOUT = {
        U: { x: 180, y: 54 },
        L: { x: 96, y: 122 },
        F: { x: 180, y: 122 },
        R: { x: 264, y: 122 },
        B: { x: 132, y: 196 },
        D: { x: 228, y: 196 }
    };

    function getCubeMapPositions() {
        const positions = {};
        FACE_NAMES.forEach(face => {
            const center = MAP_FACE_LAYOUT[face];
            const start = -Math.PI / 2;
            const radius = 25;
            MAP_RING_ORDER.forEach((index, orderIndex) => {
                const angle = start + (Math.PI * 2 * orderIndex / MAP_RING_ORDER.length);
                positions[`${face}${index}`] = {
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius
                };
            });
            positions[`${face}4`] = { x: center.x, y: center.y };
        });
        return positions;
    }

    function stickerPositionId(sticker) {
        const face = normalToFace(sticker.normal);
        return `${face}${faceIndex(face, sticker.pos)}`;
    }

    function getMoveCycles(move, positions) {
        const before = createSolvedStickers();
        const after = cloneState(before);
        const mapping = new Map();
        turnState(after, move);

        before.forEach((sticker, index) => {
            const from = stickerPositionId(sticker);
            const to = stickerPositionId(after[index]);
            if (from !== to && positions[from] && positions[to]) {
                mapping.set(from, to);
            }
        });

        const cycles = [];
        const visited = new Set();
        mapping.forEach((_, start) => {
            if (visited.has(start)) return;
            const cycle = [];
            let current = start;
            while (mapping.has(current) && !visited.has(current)) {
                visited.add(current);
                cycle.push(current);
                current = mapping.get(current);
            }
            if (cycle.length > 1 && current === start) cycles.push(cycle);
        });
        return cycles;
    }

    function makeCurvedPath(points) {
        if (points.length < 2) return '';
        const center = points.reduce((acc, point) => ({
            x: acc.x + point.x / points.length,
            y: acc.y + point.y / points.length
        }), { x: 0, y: 0 });
        return points.map((point, index) => {
            if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
            return `Q ${center.x.toFixed(1)} ${center.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        }).join(' ') + ` Q ${center.x.toFixed(1)} ${center.y.toFixed(1)} ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    }

    function getDisplayedCubeState() {
        if (solutionFrames.length && solutionFrames[solutionFrameIndex]) {
            return solutionFrames[solutionFrameIndex].state;
        }
        return stickers;
    }

    function renderCubeMap(state = getDisplayedCubeState()) {
        const svg = document.getElementById('cube-map-svg');
        if (!svg || !cubeMapOpen) return;
        const faces = getFacelets(state);
        const positions = getCubeMapPositions();
        const faceLoops = FACE_NAMES.map(face => {
            const center = MAP_FACE_LAYOUT[face];
            return `<circle class="cube-map-face-loop" cx="${center.x}" cy="${center.y}" r="29"></circle>`;
        }).join('');
        const cyclePaths = Object.keys(MOVE_DEFS).flatMap(move =>
            getMoveCycles(move, positions).map(cycle => {
                const points = cycle.map(id => positions[id]).filter(Boolean);
                return `<path class="cube-map-cycle" d="${makeCurvedPath(points)}"></path>`;
            })
        ).join('');
        const nodes = FACE_NAMES.map(face => faces[face].map((color, index) => {
            const point = positions[`${face}${index}`];
            const centerClass = index === 4 ? ' cube-map-node-center' : '';
            const radius = index === 4 ? 6.2 : 5.5;
            return `<circle class="cube-map-node${centerClass}" cx="${point.x}" cy="${point.y}" r="${radius}" fill="${color}"><title>${face}${index + 1}</title></circle>`;
        }).join('')).join('');
        const labels = FACE_NAMES.map(face => {
            const center = MAP_FACE_LAYOUT[face];
            return `<text class="cube-map-label" x="${center.x}" y="${center.y + 3}">${face}</text>`;
        }).join('');
        svg.innerHTML = `${faceLoops}${cyclePaths}${nodes}${labels}`;
    }

    function setCubeMapOpen(open) {
        cubeMapOpen = open;
        const area = document.getElementById('cube-stats-area');
        const panel = document.getElementById('cube-map-panel');
        const button = document.getElementById('cube-map-toggle');
        const tag = button ? button.querySelector('.cyber-button__tag') : null;
        if (area) area.classList.toggle('cube-map-open', cubeMapOpen);
        if (panel) panel.setAttribute('aria-hidden', String(!cubeMapOpen));
        if (tag) tag.textContent = cubeMapOpen ? '二维映射收起' : '二维映射展开';
        renderCubeMap(getDisplayedCubeState());
    }

    function renderCube(state = stickers, options = {}) {
        const mount = document.getElementById('standard-cube-3d');
        if (!mount) return;
        const faces = getFacelets(state);
        mount.innerHTML = FACE_NAMES.map(face => {
            const cells = faces[face].map(color => `<span class="cube-sticker" style="--sticker-color:${color}"></span>`).join('');
            return `<div class="cube-face cube-face-${face.toLowerCase()}">${cells}<b>${face}</b></div>`;
        }).join('');
        applyCubeRotation();
        renderCubeMap(state);
        setText('cube-history-count', String(rawHistoryLength));
        setText('cube-reduced-count', String(history.length));
        syncHistoryButtons();
        if (!options.preview) {
            setStatus(isSolved() ? '魔方处于还原态' : '魔方已扰乱，等待求解');
        }
    }

    function setLastAction(label) {
        setText('cube-last-move', label);
    }

    function syncHistoryButtons() {
        const undo = document.getElementById('cube-undo-btn');
        const redo = document.getElementById('cube-redo-btn');
        if (undo) undo.disabled = moveLog.length === 0;
        if (redo) redo.disabled = redoStack.length === 0;
    }

    function updateSolutionPanel(solution, elapsed) {
        const output = document.getElementById('cube-solution-output');
        const count = document.getElementById('cube-solutionsCount');
        const time = document.getElementById('cube-timeElapsed');
        const raw = document.getElementById('cube-history-count');
        const reduced = document.getElementById('cube-reduced-count');
        if (count) count.textContent = solution.length ? '1' : '0';
        if (time) time.textContent = `${elapsed} ms`;
        if (raw) raw.textContent = String(rawHistoryLength);
        if (reduced) reduced.textContent = String(history.length);
        if (output) {
            output.textContent = solution.length
                ? solution.join(' ')
                : '当前没有需要执行的还原步骤。';
        }
    }

    function updateStepPanel() {
        const panel = document.getElementById('cube-step-panel');
        const counter = document.getElementById('cube-step-counter');
        const move = document.getElementById('cube-step-move');
        const progress = document.getElementById('cube-step-progress');
        if (!panel || !counter || !move || !progress) return;

        if (!solutionFrames.length) {
            panel.style.display = 'none';
            counter.textContent = '0 / 0';
            move.textContent = '等待求解';
            progress.style.width = '0%';
            return;
        }

        const frame = solutionFrames[solutionFrameIndex];
        const totalMoves = Math.max(0, solutionFrames.length - 1);
        panel.style.display = 'grid';
        counter.textContent = `${solutionFrameIndex} / ${totalMoves}`;
        move.textContent = solutionFrameIndex === 0 ? '起始状态' : `执行 ${frame.move}`;
        progress.style.width = totalMoves ? `${(solutionFrameIndex / totalMoves) * 100}%` : '0%';
        renderCube(frame.state, { preview: true });
        setStatus(solutionFrameIndex === totalMoves
            ? '预览完成：此状态将被还原'
            : `解法预览：第 ${solutionFrameIndex} 步`);
    }

    function resetSolutionPreview() {
        solutionFrames = [];
        solutionFrameIndex = 0;
        updateStepPanel();
    }

    function buildSolutionFrames(solution) {
        let frameState = cloneState(stickers);
        solutionFrames = [{ move: 'START', state: cloneState(frameState) }];
        solution.forEach(move => {
            turnState(frameState, move);
            solutionFrames.push({ move, state: cloneState(frameState) });
        });
        solutionFrameIndex = 0;
        updateStepPanel();
    }

    function randomScramble(length) {
        const faces = Object.keys(MOVE_DEFS);
        const suffixes = ['', "'", '2'];
        const moves = [];
        let previous = '';
        while (moves.length < length) {
            const face = faces[Math.floor(Math.random() * faces.length)];
            if (face === previous) continue;
            previous = face;
            moves.push(face + suffixes[Math.floor(Math.random() * suffixes.length)]);
        }
        return moves;
    }

    function solutionRestoresCube(solution) {
        const state = cloneState(stickers);
        solution.forEach(move => turnState(state, move));
        return isSolved(state);
    }

    function rotateByView(point) {
        const angleX = cubeRotX * Math.PI / 180;
        const angleY = cubeRotY * Math.PI / 180;
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const x1 = point[0] * cosY + point[2] * sinY;
        const z1 = -point[0] * sinY + point[2] * cosY;
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const y2 = -point[1] * cosX - z1 * sinX;
        const z2 = -point[1] * sinX + z1 * cosX;
        return [x1, y2, z2];
    }

    function projectCubePoint(point, metrics) {
        const [x, y, z] = rotateByView(point);
        const scale = metrics.perspective / Math.max(1, metrics.perspective - z);
        return { x: metrics.cx + x * scale, y: metrics.cy + y * scale, z };
    }

    function cubeMetrics() {
        const scene = document.getElementById('cube-scene');
        const mount = document.getElementById('standard-cube-3d');
        if (!scene || !mount) return null;
        const rect = scene.getBoundingClientRect();
        if (!rect.width) return null;
        const size = parseFloat(getComputedStyle(mount).width) || 180;
        const face = mount.querySelector('.cube-face-f');
        let faceZ = size / 2 + 4;
        if (face) {
            const transform = getComputedStyle(face).transform;
            if (transform && transform.indexOf('matrix3d') === 0) {
                const depth = parseFloat(transform.slice(9, -1).split(',')[14]);
                if (Number.isFinite(depth) && depth > 0) faceZ = depth;
            }
        }
        const faceStyle = face ? getComputedStyle(face) : null;
        const padding = faceStyle ? parseFloat(faceStyle.paddingLeft) || 0 : 0;
        const gap = faceStyle ? parseFloat(faceStyle.columnGap) || 0 : 0;
        const cell = (size - padding * 2 - gap * 2) / 3;
        return {
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            size,
            faceZ,
            pitch: cell + gap || size / 3,
            perspective: parseFloat(getComputedStyle(scene).perspective) || 900
        };
    }

    function faceBasis(face) {
        const axis = FACE_AXIS[face];
        if (axis === 'x') return [[0, 1, 0], [0, 0, 1]];
        if (axis === 'y') return [[1, 0, 0], [0, 0, 1]];
        return [[1, 0, 0], [0, 1, 0]];
    }

    function stickerWorldPoint(sticker, metrics) {
        const axisIndex = AXIS_INDEX[FACE_AXIS[normalToFace(sticker.normal)]];
        return sticker.pos.map((value, index) => value * (index === axisIndex ? metrics.faceZ : metrics.pitch));
    }

    function hitTestCube(clientX, clientY, metrics) {
        if (!metrics) return null;
        if (clientX < metrics.left || clientX > metrics.right || clientY < metrics.top || clientY > metrics.bottom) return null;
        const radius = metrics.pitch * 0.8;
        let best = null;
        stickers.forEach(sticker => {
            if (rotateByView(sticker.normal)[2] <= 0.02) return;
            const point = projectCubePoint(stickerWorldPoint(sticker, metrics), metrics);
            const distance = Math.hypot(clientX - point.x, clientY - point.y);
            if (distance > radius) return;
            if (!best || distance < best.distance - 2 || (Math.abs(distance - best.distance) <= 2 && point.z > best.z)) {
                const face = normalToFace(sticker.normal);
                best = {
                    face,
                    index: faceIndex(face, sticker.pos),
                    pos: [...sticker.pos],
                    distance,
                    z: point.z
                };
            }
        });
        return best;
    }

    function turnScreenDelta(point, face, metrics) {
        const def = MOVE_DEFS[face];
        const axisIndex = AXIS_INDEX[def.axis];
        const rotated = rotateVector(point, def.axis, def.dir);
        const tangent = rotated.map((value, index) => index === axisIndex ? 0 : value);
        const length = Math.hypot(...tangent);
        if (!length) return { x: 0, y: 0 };
        const step = metrics.pitch * 0.4 / length;
        const from = projectCubePoint(point, metrics);
        const to = projectCubePoint(point.map((value, index) => value + tangent[index] * step), metrics);
        return { x: to.x - from.x, y: to.y - from.y };
    }

    function faceReferencePoint(face, metrics, dragX, dragY) {
        const centerPoint = FACE_NORMALS[face].map(value => value * metrics.faceZ);
        const origin = projectCubePoint(centerPoint, metrics);
        const basis = faceBasis(face);
        const projected = basis.map(vector =>
            projectCubePoint(centerPoint.map((value, index) => value + vector[index] * metrics.pitch), metrics)
        );
        const horizontal = Math.abs(dragX) >= Math.abs(dragY);
        let use = 0;
        if (horizontal) {
            if (Math.abs(projected[1].y - origin.y) > Math.abs(projected[0].y - origin.y)) use = 1;
        } else if (Math.abs(projected[1].x - origin.x) > Math.abs(projected[0].x - origin.x)) {
            use = 1;
        }
        const screen = { x: projected[use].x - origin.x, y: projected[use].y - origin.y };
        const flip = horizontal ? screen.y > 0 : screen.x < 0;
        return centerPoint.map((value, index) => {
            const offset = basis[use][index] * metrics.pitch * 0.7;
            return value + (flip ? -offset : offset);
        });
    }

    function turnSign(point, face, dragX, dragY, metrics) {
        const delta = turnScreenDelta(point, face, metrics);
        const scale = Math.hypot(delta.x, delta.y) * Math.hypot(dragX, dragY);
        if (!scale) return 0;
        return (delta.x * dragX + delta.y * dragY) / scale;
    }

    function resolveTurn(hit, dragX, dragY, metrics) {
        if (!metrics) return '';
        const axisIndex = AXIS_INDEX[FACE_AXIS[hit.face]];
        const contact = hit.pos.map((value, index) => value * (index === axisIndex ? metrics.faceZ : metrics.pitch));
        const inPlane = Math.hypot(...contact.map((value, index) => index === axisIndex ? 0 : value));
        let score = inPlane < metrics.pitch * 0.3 ? 0 : turnSign(contact, hit.face, dragX, dragY, metrics);
        if (Math.abs(score) < 0.22) {
            score = turnSign(faceReferencePoint(hit.face, metrics, dragX, dragY), hit.face, dragX, dragY, metrics);
        }
        return score >= 0 ? hit.face : `${hit.face}'`;
    }

    function stickerElement(hit) {
        const mount = document.getElementById('standard-cube-3d');
        if (!mount) return null;
        const face = mount.querySelector(`.cube-face-${hit.face.toLowerCase()}`);
        if (!face) return null;
        return face.querySelectorAll('.cube-sticker')[hit.index] || null;
    }

    function flashFace(face) {
        const mount = document.getElementById('standard-cube-3d');
        if (!mount) return;
        const element = mount.querySelector(`.cube-face-${face.toLowerCase()}`);
        if (!element) return;
        window.clearTimeout(faceFlashTimer);
        mount.querySelectorAll('.cube-face.is-turned').forEach(node => node.classList.remove('is-turned'));
        element.classList.add('is-turned');
        faceFlashTimer = window.setTimeout(() => element.classList.remove('is-turned'), 460);
    }

    function showDragBadge(move, clientX, clientY) {
        const scene = document.getElementById('cube-scene');
        const badge = document.getElementById('cube-drag-badge');
        if (!scene || !badge) return;
        const rect = scene.getBoundingClientRect();
        badge.textContent = move;
        badge.style.left = `${clientX - rect.left}px`;
        badge.style.top = `${clientY - rect.top}px`;
        badge.style.setProperty('--cube-badge-color', FACE_COLORS[move.charAt(0)] || '#40e0ff');
        badge.classList.remove('is-committed');
        badge.classList.add('is-visible');
        window.clearTimeout(badgeTimer);
    }

    function hideDragBadge(committed) {
        const badge = document.getElementById('cube-drag-badge');
        if (!badge) return;
        window.clearTimeout(badgeTimer);
        if (committed) {
            badge.classList.add('is-committed');
            badgeTimer = window.setTimeout(() => badge.classList.remove('is-visible', 'is-committed'), 420);
            return;
        }
        badge.classList.remove('is-visible', 'is-committed');
    }

    function commitCubeTurn(move, face) {
        applyMove(move, true);
        hideDragBadge(true);
        renderCube();
        flashFace(face);
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate(8); } catch (error) {}
        }
    }

    function stopOrbitInertia() {
        if (orbitFrame) window.cancelAnimationFrame(orbitFrame);
        orbitFrame = 0;
        orbitVelocity = { x: 0, y: 0 };
    }

    function startOrbitInertia(velocityX, velocityY) {
        stopOrbitInertia();
        if (Math.hypot(velocityX, velocityY) < 0.4) return;
        orbitVelocity = {
            x: Math.max(-6, Math.min(6, velocityX)),
            y: Math.max(-6, Math.min(6, velocityY))
        };
        const step = () => {
            rotateByDrag(orbitVelocity.x, orbitVelocity.y);
            orbitVelocity.x *= 0.87;
            orbitVelocity.y *= 0.87;
            if (Math.abs(orbitVelocity.x) + Math.abs(orbitVelocity.y) < 0.2) {
                orbitFrame = 0;
                return;
            }
            orbitFrame = window.requestAnimationFrame(step);
        };
        orbitFrame = window.requestAnimationFrame(step);
    }

    function rotateByDrag(x, y) {
        cubeRotY += x;
        cubeRotX = Math.max(-85, Math.min(85, cubeRotX + y));
        applyCubeRotation();
    }

    function pointerCentroid() {
        let x = 0;
        let y = 0;
        activePointers.forEach(point => {
            x += point.x;
            y += point.y;
        });
        const count = activePointers.size || 1;
        return { x: x / count, y: y / count };
    }

    function releasePointer(scene, pointerId) {
        if (!scene || !scene.releasePointerCapture || pointerId === undefined) return;
        try { scene.releasePointerCapture(pointerId); } catch (error) {}
    }

    function clearCubeGesture(scene, pointerId) {
        if (gesture && gesture.stickerEl) gesture.stickerEl.classList.remove('is-grabbed');
        if (scene) scene.classList.remove('dragging');
        releasePointer(scene, pointerId);
        activePointers.clear();
        gesture = null;
    }

    function handleScenePointerDown(event) {
        if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2) return;
        const scene = event.currentTarget;
        if (!gesture) activePointers.clear();
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (gesture) {
            if (gesture.mode === 'sticker') {
                if (gesture.stickerEl) gesture.stickerEl.classList.remove('is-grabbed');
                gesture.stickerEl = null;
                gesture.committed = true;
                gesture.mode = 'orbit';
                scene.classList.add('dragging');
            }
            gesture.lastCentroid = pointerCentroid();
            return;
        }

        stopOrbitInertia();
        hideDragBadge(false);
        const mount = document.getElementById('standard-cube-3d');
        if (mount) mount.classList.remove('is-resetting');
        const forceOrbit = event.pointerType === 'mouse' && event.button === 2;
        const metrics = forceOrbit ? null : cubeMetrics();
        const hit = forceOrbit ? null : hitTestCube(event.clientX, event.clientY, metrics);
        if (hit) {
            if (solutionFrames.length) {
                resetSolutionPreview();
                renderCube();
            }
        } else {
            scene.classList.add('dragging');
        }

        gesture = {
            pointerId: event.pointerId,
            mode: hit ? 'sticker' : 'orbit',
            hit,
            metrics,
            startX: event.clientX,
            startY: event.clientY,
            startedAt: performance.now(),
            lastMoveAt: performance.now(),
            lastCentroid: pointerCentroid(),
            moved: 0,
            committed: false,
            velocityX: 0,
            velocityY: 0,
            stickerEl: hit ? stickerElement(hit) : null
        };
        if (gesture.stickerEl) gesture.stickerEl.classList.add('is-grabbed');
        try { scene.setPointerCapture(event.pointerId); } catch (error) {}
    }

    function handleScenePointerMove(event) {
        if (!activePointers.has(event.pointerId)) return;
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (!gesture) return;

        if (gesture.mode === 'sticker') {
            if (event.pointerId !== gesture.pointerId) return;
            const dragX = event.clientX - gesture.startX;
            const dragY = event.clientY - gesture.startY;
            const distance = Math.hypot(dragX, dragY);
            gesture.moved = Math.max(gesture.moved, distance);
            if (gesture.committed) return;
            if (distance >= TURN_THRESHOLD) {
                const move = resolveTurn(gesture.hit, dragX, dragY, gesture.metrics);
                if (move) {
                    gesture.committed = true;
                    commitCubeTurn(move, gesture.hit.face);
                }
                return;
            }
            if (distance > 6) {
                const move = resolveTurn(gesture.hit, dragX, dragY, gesture.metrics);
                if (move) showDragBadge(move, event.clientX, event.clientY);
            }
            return;
        }

        const centroid = pointerCentroid();
        const dx = centroid.x - gesture.lastCentroid.x;
        const dy = centroid.y - gesture.lastCentroid.y;
        if (!dx && !dy) return;
        gesture.lastCentroid = centroid;
        gesture.moved = Math.max(gesture.moved, Math.hypot(centroid.x - gesture.startX, centroid.y - gesture.startY));
        rotateByDrag(dx * ORBIT_SENSITIVITY, -dy * ORBIT_SENSITIVITY);
        const now = performance.now();
        const frameRatio = Math.min(2.5, 16.7 / Math.max(8, now - gesture.lastMoveAt));
        gesture.velocityX = gesture.velocityX * 0.7 + dx * ORBIT_SENSITIVITY * frameRatio * 0.35;
        gesture.velocityY = gesture.velocityY * 0.7 - dy * ORBIT_SENSITIVITY * frameRatio * 0.35;
        gesture.lastMoveAt = now;
    }

    function handleBackgroundTap(clientX, clientY) {
        const now = performance.now();
        if (lastBackgroundTap && now - lastBackgroundTap.at < 340 && Math.hypot(clientX - lastBackgroundTap.x, clientY - lastBackgroundTap.y) < 40) {
            lastBackgroundTap = null;
            window.resetCubeView();
            return;
        }
        lastBackgroundTap = { x: clientX, y: clientY, at: now };
    }

    function finishCubeGesture(event, cancelled) {
        const scene = event.currentTarget;
        const current = gesture;
        if (!current) {
            releasePointer(scene, event.pointerId);
            return;
        }
        const distance = Math.max(current.moved, Math.hypot(event.clientX - current.startX, event.clientY - current.startY));
        const duration = performance.now() - current.startedAt;
        const tapped = !cancelled && duration < 500 && distance < TURN_THRESHOLD;

        if (!cancelled && current.mode === 'sticker' && !current.committed && tapped) {
            current.committed = true;
            showDragBadge(current.hit.face, event.clientX, event.clientY);
            commitCubeTurn(current.hit.face, current.hit.face);
        }
        if (!cancelled && current.mode === 'orbit' && tapped) {
            handleBackgroundTap(event.clientX, event.clientY);
        }
        if (!cancelled && current.mode === 'orbit' && !tapped && performance.now() - current.lastMoveAt < 90) {
            lastBackgroundTap = null;
            startOrbitInertia(current.velocityX, current.velocityY);
        }
        if (!current.committed) hideDragBadge(false);
        clearCubeGesture(scene, event.pointerId);
    }

    function handleScenePointerUp(event) {
        activePointers.delete(event.pointerId);
        if (!gesture) {
            releasePointer(event.currentTarget, event.pointerId);
            return;
        }
        if (event.pointerId !== gesture.pointerId) {
            gesture.lastCentroid = pointerCentroid();
            return;
        }
        finishCubeGesture(event, false);
    }

    function handleScenePointerCancel(event) {
        activePointers.delete(event.pointerId);
        if (!gesture) return;
        finishCubeGesture(event, true);
    }

    function bindCubeGestures() {
        const scene = document.getElementById('cube-scene');
        if (!scene || scene.dataset.gestureReady === 'true') return;
        scene.dataset.gestureReady = 'true';
        scene.addEventListener('pointerdown', handleScenePointerDown);
        scene.addEventListener('pointermove', handleScenePointerMove);
        scene.addEventListener('pointerup', handleScenePointerUp);
        scene.addEventListener('pointercancel', handleScenePointerCancel);
        scene.addEventListener('contextmenu', event => event.preventDefault());
    }

    function bindCubeKeyboard() {
        if (window.standardCubeKeyboardReady) return;
        window.standardCubeKeyboardReady = true;
        document.addEventListener('keydown', event => {
            const target = event.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
            const workspace = document.getElementById('standard-cube-workspace');
            if (!workspace || !workspace.offsetParent) return;
            const key = event.key.length === 1 ? event.key.toUpperCase() : '';

            if (event.ctrlKey || event.metaKey) {
                if (key === 'Z') {
                    event.preventDefault();
                    if (event.shiftKey) window.redoCubeMove();
                    else window.undoCubeMove();
                } else if (key === 'Y') {
                    event.preventDefault();
                    window.redoCubeMove();
                }
                return;
            }
            if (event.key === 'Backspace') {
                event.preventDefault();
                window.undoCubeMove();
                return;
            }
            if (!FACE_NAMES.includes(key)) return;
            event.preventDefault();
            const move = event.shiftKey ? `${key}'` : key;
            applyMove(move, true);
            renderCube();
            flashFace(key);
        });
    }

    function getRegisteredSpacePuzzleModules() {
        return Array.isArray(window.spacePuzzleModules) ? window.spacePuzzleModules : [];
    }

    function getSpacePuzzleHTML() {
        const faceGroups = [
            { face: 'U', label: '上层', pos: 'top' },
            { face: 'L', label: '左层', pos: 'left' },
            { face: 'F', label: '前层', pos: 'front' },
            { face: 'R', label: '右层', pos: 'right' },
            { face: 'B', label: '后层', pos: 'back' },
            { face: 'D', label: '下层', pos: 'bottom' }
        ];
        const moveButtons = faceGroups.map(group => {
            const moves = [group.face, `${group.face}'`, `${group.face}2`]
                .map(move => `<button class="cube-move-chip" onclick="window.applyCubeMoveFromButton('${move.replace("'", "\\'")}')">${move}</button>`)
                .join('');
            return `<div class="cube-face-control cube-face-control-${group.pos}" style="--face-color:${FACE_COLORS[group.face]}">
                <div class="cube-face-control-label"><span>${group.face}</span><small>${group.label}</small></div>
                <div class="cube-face-control-actions">${moves}</div>
            </div>`;
        })
            .join('');

        const extraModules = getRegisteredSpacePuzzleModules();
        const extraButtons = extraModules
            .map(module => typeof module.getListButton === 'function' ? module.getListButton() : '')
            .join('');
        const extraWorkspaces = extraModules
            .map(module => typeof module.getWorkspaceHTML === 'function' ? module.getWorkspaceHTML() : '')
            .join('');

        return `
            <div class="container" id="space-list-container">
                <button class="logic-btn" type="button" onclick="window.openSpacePuzzle('standard-cube')">标准三维魔方</button>
                ${extraButtons}
            </div>

            <div id="space-workspace-container" class="space-workspace-container">
                <div id="standard-cube-workspace" class="space-workspace">
                    <div class="space-workspace-header">
                        <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                        <h2 class="neon-title space-title" data-text="STANDARD CUBE">STANDARD CUBE</h2>
                        <div class="space-subtitle">标准三维魔方求解</div>
                        <div class="space-mobile-actions">
                            <button class="cyber-button" onclick="window.resetStandardCube()"><span class="cyber-button__tag">重置</span></button>
                            <button class="cyber-button" onclick="window.scrambleStandardCube()"><span class="cyber-button__tag">扰乱</span></button>
                            <button class="cyber-button cyber-glow" onclick="window.solveStandardCube()"><span class="cyber-button__tag">求解</span></button>
                        </div>
                    </div>

                    <div class="control-panel card cyber-border space-control-panel">
                        <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                        <h2 class="neon-title space-title" data-text="STANDARD CUBE">STANDARD CUBE</h2>
                        <div class="space-subtitle">标准三维魔方求解</div>

                        <textarea id="cube-formula-input" class="space-formula-input" placeholder="输入扰乱公式，例如：R U R' U' F2"></textarea>

                        <div class="space-action-grid">
                            <button class="cyber-button" onclick="window.resetStandardCube()"><span class="cyber-button__tag">重置魔方</span></button>
                            <button class="cyber-button" onclick="window.scrambleStandardCube()"><span class="cyber-button__tag">随机扰乱</span></button>
                            <button class="cyber-button" onclick="window.applyCubeFormula()"><span class="cyber-button__tag">执行公式</span></button>
                            <button class="cyber-button cyber-glow" id="cube-solve-btn" onclick="window.solveStandardCube()"><span class="cyber-button__tag">求解</span></button>
                        </div>

                        <div class="space-stats cube-stats-area" id="cube-stats-area">
                            <div class="cube-stat-grid">
                                <div>解记录数: <span id="cube-solutionsCount">0</span></div>
                                <div>算力耗时: <span id="cube-timeElapsed">0 ms</span></div>
                                <div>历史步数: <span id="cube-history-count">0</span></div>
                                <div>有效步数: <span id="cube-reduced-count">0</span></div>
                            </div>
                            <div class="cube-map-panel" id="cube-map-panel" aria-hidden="true">
                                <div class="cube-map-frame">
                                    <svg class="cube-map-svg" id="cube-map-svg" viewBox="48 18 264 226" role="img" aria-label="三阶魔方二维映射"></svg>
                                </div>
                            </div>
                        </div>

                        <div class="space-solution-card">
                            <div class="badge">解法步骤</div>
                            <div class="cube-step-panel" id="cube-step-panel">
                                <div class="cube-step-reader">
                                    <button class="cyber-button" onclick="window.browseCubeSolution(-1)"><span class="cyber-button__tag">上一页</span></button>
                                    <div class="cube-step-current">
                                        <div id="cube-step-counter">0 / 0</div>
                                        <div id="cube-step-move">等待求解</div>
                                    </div>
                                    <button class="cyber-button" onclick="window.browseCubeSolution(1)"><span class="cyber-button__tag">下一页</span></button>
                                </div>
                                <div class="cube-step-bar"><span id="cube-step-progress"></span></div>
                            </div>
                            <div class="result" id="cube-solution-output">等待生成解法。</div>
                            <button class="cyber-button" id="cube-map-toggle" onclick="window.toggleCubeMap()"><span class="cyber-button__tag">二维映射展开</span></button>
                        </div>

                        <div class="instructions space-instructions">
                            <h3>系统法则:</h3>
                            <p>支持标准 Singmaster 记号：U D R L F B，可加 ' 或 2。</p>
                            <p>求解器会先合并抵消同面转动，并规约同轴可交换转动，再生成还原公式。</p>
                            <p>直接拖动魔方贴纸即可转动该面，空白处拖动旋转视角；点击贴纸旋转 90°。桌面端可按 U D R L F B 键，按住 Shift 反向。</p>
                        </div>
                    </div>

                    <div class="grid-container card space-display-panel space-cube-panel">
                        <div class="space-cube-hud">
                            <span id="cube-status">魔方处于还原态</span>
                            <span class="cube-last-move" aria-live="polite">最近 <b id="cube-last-move">—</b></span>
                        </div>
                        <div class="cube-scene" id="cube-scene" role="img" aria-label="三维魔方：拖动贴纸转动该面，空白处拖动旋转视角">
                            <div class="cube-3d" id="standard-cube-3d"></div>
                            <div class="cube-drag-badge" id="cube-drag-badge" aria-hidden="true"></div>
                        </div>
                        <div class="cube-drag-hint">拖动贴纸转面 · 空白处拖动转视角</div>
                        <div class="cube-toolbar">
                            <button class="cyber-button cube-tool-btn" id="cube-undo-btn" type="button" onclick="window.undoCubeMove()"><span class="cyber-button__tag">↶ 撤销</span></button>
                            <button class="cyber-button cube-tool-btn" id="cube-redo-btn" type="button" onclick="window.redoCubeMove()"><span class="cyber-button__tag">↷ 重做</span></button>
                            <button class="cyber-button cube-tool-btn" type="button" onclick="window.resetCubeView()"><span class="cyber-button__tag">⟲ 视角</span></button>
                        </div>
                        <div class="cube-pad is-collapsed" id="cube-pad">
                            <button class="cube-pad-toggle" id="cube-pad-toggle" type="button" aria-expanded="false" onclick="window.toggleCubePad()">
                                <span class="cube-pad-label">空间转动面板 · 展开</span><span class="cube-pad-caret">▾</span>
                            </button>
                            <div class="cube-move-spatial">${moveButtons}</div>
                        </div>
                    </div>
                </div>
                ${extraWorkspaces}
            </div>`;
    }

    window.initSpacePuzzle = function () {
        const container = document.getElementById('spacepuzzle');
        if (!container) return;
        container.innerHTML = getSpacePuzzleHTML();
        window.resetStandardCube();
        getRegisteredSpacePuzzleModules().forEach(module => {
            if (typeof module.init === 'function') module.init();
        });
        bindCubeGestures();
        bindCubeKeyboard();
    };

    window.openSpacePuzzle = function (id) {
        document.getElementById('space-list-container').style.display = 'none';
        document.getElementById('space-workspace-container').style.display = 'block';
        document.querySelectorAll('#space-workspace-container > div').forEach(el => el.style.display = 'none');
        if (id === 'standard-cube') {
            document.getElementById('standard-cube-workspace').style.display = 'flex';
            renderCube();
            bindCubeGestures();
            bindCubeKeyboard();
        }
        const extraModule = getRegisteredSpacePuzzleModules().find(module => module.id === id);
        if (extraModule && typeof extraModule.open === 'function') {
            extraModule.open();
        }
    };

    window.backSpacePuzzle = function () {
        document.getElementById('space-workspace-container').style.display = 'none';
        document.querySelectorAll('#space-workspace-container > div').forEach(el => el.style.display = 'none');
        document.getElementById('space-list-container').style.display = '';
    };

    window.resetStandardCube = function () {
        stickers = createSolvedStickers();
        history = [];
        moveLog = [];
        redoStack = [];
        rawHistoryLength = 0;
        lastSolution = [];
        setLastAction('—');
        resetSolutionPreview();
        const input = document.getElementById('cube-formula-input');
        if (input) input.value = '';
        updateSolutionPanel([], 0);
        renderCube();
    };

    window.scrambleStandardCube = function () {
        stickers = createSolvedStickers();
        history = [];
        moveLog = [];
        redoStack = [];
        rawHistoryLength = 0;
        lastSolution = [];
        resetSolutionPreview();
        const moves = randomScramble(20);
        const input = document.getElementById('cube-formula-input');
        if (input) input.value = moves.join(' ');
        applyMoves(moves, true);
        setLastAction('扰乱');
        updateSolutionPanel([], 0);
    };

    window.applyCubeFormula = function () {
        try {
            const input = document.getElementById('cube-formula-input');
            const moves = parseFormula(input ? input.value : '');
            applyMoves(moves, true);
            if (moves.length) setLastAction('公式');
            updateSolutionPanel([], 0);
        } catch (error) {
            setStatus(error.message);
        }
    };

    window.applyCubeMoveFromButton = function (move) {
        applyMoves([move], true);
        flashFace(move.charAt(0));
    };

    window.undoCubeMove = function () {
        if (!moveLog.length) return;
        const move = moveLog.pop();
        redoStack.push(move);
        turnState(stickers, invertMove(move));
        syncHistoryAfterLog();
        setLastAction(`↶ ${move}`);
        renderCube();
    };

    window.redoCubeMove = function () {
        if (!redoStack.length) return;
        const move = redoStack.pop();
        turnState(stickers, move);
        moveLog.push(move);
        syncHistoryAfterLog();
        setLastAction(`↷ ${move}`);
        renderCube();
    };

    window.resetCubeView = function () {
        stopOrbitInertia();
        cubeRotX = DEFAULT_VIEW.x;
        cubeRotY = DEFAULT_VIEW.y;
        const mount = document.getElementById('standard-cube-3d');
        if (mount) {
            mount.classList.add('is-resetting');
            window.setTimeout(() => mount.classList.remove('is-resetting'), 520);
        }
        applyCubeRotation();
    };

    window.toggleCubePad = function (force) {
        const pad = document.getElementById('cube-pad');
        if (!pad) return;
        const open = typeof force === 'boolean' ? force : pad.classList.contains('is-collapsed');
        pad.classList.toggle('is-collapsed', !open);
        const toggle = document.getElementById('cube-pad-toggle');
        const label = toggle ? toggle.querySelector('.cube-pad-label') : null;
        if (toggle) toggle.setAttribute('aria-expanded', String(open));
        if (label) label.textContent = open ? '空间转动面板 · 收起' : '空间转动面板 · 展开';
    };

    window.solveStandardCube = function () {
        const started = performance.now();
        if (isSolved()) {
            lastSolution = [];
            history = [];
            moveLog = [];
            redoStack = [];
            rawHistoryLength = 0;
            setLastAction('—');
        } else {
            lastSolution = optimizedInverseSequence(history);
            if (!solutionRestoresCube(lastSolution)) {
                lastSolution = inverseSequence(history);
            }
        }
        const elapsed = Math.max(1, Math.round(performance.now() - started));
        updateSolutionPanel(lastSolution, elapsed);
        syncHistoryButtons();
        if (lastSolution.length) {
            buildSolutionFrames(lastSolution);
            setStatus(`已生成规约解法：${rawHistoryLength} 步历史压缩为 ${lastSolution.length} 步，可翻页查看`);
        } else {
            resetSolutionPreview();
            setStatus('无需求解，当前魔方已处于还原态');
        }
    };

    window.browseCubeSolution = function (delta) {
        if (!solutionFrames.length) return;
        const nextIndex = Math.max(0, Math.min(solutionFrames.length - 1, solutionFrameIndex + delta));
        solutionFrameIndex = nextIndex;
        updateStepPanel();
    };

    window.toggleCubeMap = function () {
        setCubeMapOpen(!cubeMapOpen);
    };

    window.executeCubeSolution = function () {
        if (!lastSolution.length) {
            window.solveStandardCube();
        }
        if (!lastSolution.length) return;
        applyMoves(lastSolution, false);
        history = [];
        moveLog = [];
        redoStack = [];
        rawHistoryLength = 0;
        lastSolution = [];
        setLastAction('—');
        resetSolutionPreview();
        updateSolutionPanel([], 0);
        renderCube();
    };

})();
