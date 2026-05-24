(function () {
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
            rawHistoryLength++;
            history = normalizeMoveSequence([...history, move]);
            lastSolution = [];
            resetSolutionPreview();
        }
    }

    function applyMoves(moves, shouldRecord) {
        moves.forEach(move => applyMove(move, shouldRecord));
        renderCube();
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

    function renderCube(state = stickers, options = {}) {
        const mount = document.getElementById('standard-cube-3d');
        if (!mount) return;
        const faces = getFacelets(state);
        mount.innerHTML = FACE_NAMES.map(face => {
            const cells = faces[face].map(color => `<span class="cube-sticker" style="--sticker-color:${color}"></span>`).join('');
            return `<div class="cube-face cube-face-${face.toLowerCase()}">${cells}<b>${face}</b></div>`;
        }).join('');
        applyCubeRotation();
        setText('cube-history-count', String(rawHistoryLength));
        setText('cube-reduced-count', String(history.length));
        if (!options.preview) {
            setStatus(isSolved() ? '魔方处于还原态' : '魔方已扰乱，等待求解');
        }
    }

    function updateSolutionPanel(solution, elapsed) {
        const output = document.getElementById('cube-solution-output');
        const count = document.getElementById('cube-solutionsCount');
        const time = document.getElementById('cube-timeElapsed');
        const raw = document.getElementById('cube-history-count');
        const reduced = document.getElementById('cube-reduced-count');
        if (count) count.textContent = solution.length ? '1' : '0';
        if (time) time.textContent = String(elapsed);
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

    function bindCubeDrag() {
        const scene = document.querySelector ? document.querySelector('.cube-scene') : null;
        if (!scene || scene.dataset.dragReady === 'true') return;
        scene.dataset.dragReady = 'true';

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startRotX = cubeRotX;
        let startRotY = cubeRotY;

        scene.addEventListener('pointerdown', event => {
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            startRotX = cubeRotX;
            startRotY = cubeRotY;
            scene.classList.add('dragging');
            if (scene.setPointerCapture) scene.setPointerCapture(event.pointerId);
        });

        scene.addEventListener('pointermove', event => {
            if (!dragging) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            cubeRotY = startRotY + dx * 0.45;
            cubeRotX = Math.max(-80, Math.min(80, startRotX - dy * 0.45));
            applyCubeRotation();
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

        return `
            <div class="container" id="space-list-container">
                <button class="logic-btn" type="button" onclick="window.openSpacePuzzle('standard-cube')">标准三维魔方</button>
            </div>

            <div id="space-workspace-container" style="display:none;padding-top:4rem;margin-top:2rem;">
                <div id="standard-cube-workspace" class="space-workspace" style="display:none;gap:2rem;flex-wrap:wrap;align-items:flex-start;">
                    <div class="control-panel card cyber-border space-control-panel">
                        <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                        <h2 class="neon-title space-title" data-text="STANDARD CUBE">STANDARD CUBE</h2>
                        <div class="space-subtitle">标准三维魔方求解</div>

                        <textarea id="cube-formula-input" class="space-formula-input" placeholder="输入扰乱公式，例如：R U R' U' F2"></textarea>

                        <div class="space-action-grid">
                            <button class="cyber-button" onclick="window.resetStandardCube()"><span class="cyber-button__tag">重置魔方</span></button>
                            <button class="cyber-button" onclick="window.scrambleStandardCube()"><span class="cyber-button__tag">随机扰乱</span></button>
                            <button class="cyber-button" onclick="window.applyCubeFormula()"><span class="cyber-button__tag">执行公式</span></button>
                            <button class="cyber-button cyber-glow" id="cube-solve-btn" onclick="window.solveStandardCube()"><span class="cyber-button__tag">规约求解</span></button>
                        </div>

                        <div class="space-stats">
                            <div>解记录数: <span id="cube-solutionsCount">0</span></div>
                            <div>算力耗时: <span id="cube-timeElapsed">0</span> ms</div>
                            <div>历史步数: <span id="cube-history-count">0</span></div>
                            <div>有效步数: <span id="cube-reduced-count">0</span></div>
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
                            <button class="cyber-button" onclick="window.executeCubeSolution()"><span class="cyber-button__tag">执行全部解法</span></button>
                        </div>

                        <div class="instructions space-instructions">
                            <h3>系统法则:</h3>
                            <p>支持标准 Singmaster 记号：U D R L F B，可加 ' 或 2。</p>
                            <p>求解器会先合并抵消同面转动，并规约同轴可交换转动，再生成还原公式。</p>
                            <p>可用下方空间操作台单步旋转，也可直接输入完整公式。</p>
                        </div>
                    </div>

                    <div class="grid-container card space-cube-panel">
                        <div class="space-cube-hud">
                            <span id="cube-status">魔方处于还原态</span>
                        </div>
                        <div class="cube-scene">
                            <div class="cube-3d" id="standard-cube-3d"></div>
                        </div>
                        <div class="cube-drag-hint">拖动魔方观察空间姿态</div>
                        <div class="cube-control-title">空间转动面板</div>
                        <div class="cube-move-spatial">${moveButtons}</div>
                    </div>
                </div>
            </div>`;
    }

    window.initSpacePuzzle = function () {
        const container = document.getElementById('spacepuzzle');
        if (!container) return;
        container.innerHTML = getSpacePuzzleHTML();
        window.resetStandardCube();
        bindCubeDrag();
    };

    window.openSpacePuzzle = function (id) {
        document.getElementById('space-list-container').style.display = 'none';
        document.getElementById('space-workspace-container').style.display = 'block';
        document.querySelectorAll('#space-workspace-container > div').forEach(el => el.style.display = 'none');
        if (id === 'standard-cube') {
            document.getElementById('standard-cube-workspace').style.display = 'flex';
            renderCube();
            bindCubeDrag();
        }
    };

    window.backSpacePuzzle = function () {
        document.getElementById('space-workspace-container').style.display = 'none';
        document.getElementById('standard-cube-workspace').style.display = 'none';
        document.getElementById('space-list-container').style.display = '';
    };

    window.resetStandardCube = function () {
        stickers = createSolvedStickers();
        history = [];
        rawHistoryLength = 0;
        lastSolution = [];
        resetSolutionPreview();
        const input = document.getElementById('cube-formula-input');
        if (input) input.value = '';
        updateSolutionPanel([], 0);
        renderCube();
    };

    window.scrambleStandardCube = function () {
        stickers = createSolvedStickers();
        history = [];
        rawHistoryLength = 0;
        lastSolution = [];
        resetSolutionPreview();
        const moves = randomScramble(20);
        const input = document.getElementById('cube-formula-input');
        if (input) input.value = moves.join(' ');
        applyMoves(moves, true);
        updateSolutionPanel([], 0);
    };

    window.applyCubeFormula = function () {
        try {
            const input = document.getElementById('cube-formula-input');
            const moves = parseFormula(input ? input.value : '');
            applyMoves(moves, true);
            updateSolutionPanel([], 0);
        } catch (error) {
            setStatus(error.message);
        }
    };

    window.applyCubeMoveFromButton = function (move) {
        applyMoves([move], true);
    };

    window.solveStandardCube = function () {
        const started = performance.now();
        if (isSolved()) {
            lastSolution = [];
            history = [];
            rawHistoryLength = 0;
        } else {
            lastSolution = optimizedInverseSequence(history);
            if (!solutionRestoresCube(lastSolution)) {
                lastSolution = inverseSequence(history);
            }
        }
        const elapsed = Math.max(1, Math.round(performance.now() - started));
        updateSolutionPanel(lastSolution, elapsed);
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

    window.executeCubeSolution = function () {
        if (!lastSolution.length) {
            window.solveStandardCube();
        }
        if (!lastSolution.length) return;
        applyMoves(lastSolution, false);
        history = [];
        rawHistoryLength = 0;
        lastSolution = [];
        resetSolutionPreview();
        updateSolutionPanel([], 0);
        renderCube();
    };
})();
