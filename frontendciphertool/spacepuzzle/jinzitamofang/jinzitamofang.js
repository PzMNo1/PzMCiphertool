(function () {
    const FACE_COLORS = {
        U: '#ffda59',
        L: '#40e0ff',
        R: '#ff6b8a',
        B: '#2ecc71'
    };
    const FACE_NAMES = ['U', 'L', 'R', 'B'];
    const FACE_LABELS = {
        U: '顶面',
        L: '左面',
        R: '右面',
        B: '后面'
    };
    const TRIANGLE_HEIGHT = 155.884;
    const ROTATE_STEP = (Math.PI * 2) / 3;
    const CENTER = { x: 90, y: TRIANGLE_HEIGHT * 2 / 3 };
    const TRIANGLE_POINTS = [
        [[90, 0], [60, TRIANGLE_HEIGHT / 3], [120, TRIANGLE_HEIGHT / 3]],
        [[60, TRIANGLE_HEIGHT / 3], [30, TRIANGLE_HEIGHT * 2 / 3], [90, TRIANGLE_HEIGHT * 2 / 3]],
        [[60, TRIANGLE_HEIGHT / 3], [120, TRIANGLE_HEIGHT / 3], [90, TRIANGLE_HEIGHT * 2 / 3]],
        [[120, TRIANGLE_HEIGHT / 3], [90, TRIANGLE_HEIGHT * 2 / 3], [150, TRIANGLE_HEIGHT * 2 / 3]],
        [[30, TRIANGLE_HEIGHT * 2 / 3], [0, TRIANGLE_HEIGHT], [60, TRIANGLE_HEIGHT]],
        [[30, TRIANGLE_HEIGHT * 2 / 3], [90, TRIANGLE_HEIGHT * 2 / 3], [60, TRIANGLE_HEIGHT]],
        [[90, TRIANGLE_HEIGHT * 2 / 3], [60, TRIANGLE_HEIGHT], [120, TRIANGLE_HEIGHT]],
        [[90, TRIANGLE_HEIGHT * 2 / 3], [150, TRIANGLE_HEIGHT * 2 / 3], [120, TRIANGLE_HEIGHT]],
        [[150, TRIANGLE_HEIGHT * 2 / 3], [120, TRIANGLE_HEIGHT], [180, TRIANGLE_HEIGHT]]
    ];
    const EDGE_GROUPS = {
        left: [0, 1, 4],
        right: [0, 3, 8],
        bottom: [4, 6, 8]
    };
    const MOVE_CYCLES = {
        U: [
            { face: 'L', edge: 'right' },
            { face: 'R', edge: 'left' },
            { face: 'B', edge: 'left' }
        ],
        L: [
            { face: 'U', edge: 'left' },
            { face: 'B', edge: 'bottom' },
            { face: 'R', edge: 'left' }
        ],
        R: [
            { face: 'U', edge: 'right' },
            { face: 'L', edge: 'bottom' },
            { face: 'B', edge: 'right' }
        ],
        B: [
            { face: 'U', edge: 'bottom' },
            { face: 'R', edge: 'bottom' },
            { face: 'L', edge: 'left' }
        ]
    };

    const ROTATE_CW_MAP = buildRotationMap(1);
    const ROTATE_CCW_MAP = buildRotationMap(-1);
    let faces = createSolvedPyraminx();
    let history = [];
    let rawHistoryLength = 0;
    let lastSolution = [];
    let solutionIndex = 0;
    let solutionElapsed = 0;
    let pyraminxRotX = -22;
    let pyraminxRotY = -34;

    function centroid(points) {
        return points.reduce((acc, point) => {
            acc.x += point[0] / points.length;
            acc.y += point[1] / points.length;
            return acc;
        }, { x: 0, y: 0 });
    }

    function rotatePoint(point, dir) {
        const angle = ROTATE_STEP * dir;
        const dx = point.x - CENTER.x;
        const dy = point.y - CENTER.y;
        return {
            x: CENTER.x + dx * Math.cos(angle) - dy * Math.sin(angle),
            y: CENTER.y + dx * Math.sin(angle) + dy * Math.cos(angle)
        };
    }

    function buildRotationMap(dir) {
        const centers = TRIANGLE_POINTS.map(centroid);
        return centers.map(center => {
            const rotated = rotatePoint(center, dir);
            let bestIndex = 0;
            let bestDistance = Infinity;
            centers.forEach((candidate, index) => {
                const distance = Math.hypot(candidate.x - rotated.x, candidate.y - rotated.y);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = index;
                }
            });
            return bestIndex;
        });
    }

    function createSolvedPyraminx() {
        return Object.fromEntries(FACE_NAMES.map(face => [face, Array(9).fill(FACE_COLORS[face])]));
    }

    function cloneFaces(state = faces) {
        return Object.fromEntries(FACE_NAMES.map(face => [face, state[face].slice()]));
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function normalizeAngleAmount(move) {
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
        if (move.endsWith("'") || move.endsWith('2')) return move.charAt(0);
        return `${move.charAt(0)}'`;
    }

    function normalizeMoveSequence(moves) {
        const result = [];
        moves.forEach(move => {
            const face = move.charAt(0);
            const previous = result[result.length - 1];
            if (!previous || previous.charAt(0) !== face) {
                result.push(move);
                return;
            }

            const amount = normalizeAngleAmount(previous) + normalizeAngleAmount(move);
            result.pop();
            const merged = amountToMove(face, amount);
            if (merged) result.push(merged);
        });
        return result;
    }

    function parseFormula(formula) {
        const compact = String(formula || '')
            .toUpperCase()
            .replace(/[’`]/g, "'")
            .replace(/[，,]/g, ' ')
            .replace(/\s+/g, '');
        if (!compact) return [];
        const tokens = compact.match(/[ULRB](?:2|')?/g) || [];
        if (tokens.join('') !== compact) {
            throw new Error("公式只能包含 U L R B、撇号和 2，例如：U R U' L");
        }
        return tokens;
    }

    function isSolved(state = faces) {
        return FACE_NAMES.every(face => state[face].every(color => color === state[face][0]));
    }

    function rotateFace(state, face, dir) {
        const source = state[face].slice();
        const map = dir === 1 ? ROTATE_CW_MAP : ROTATE_CCW_MAP;
        map.forEach((targetIndex, sourceIndex) => {
            state[face][targetIndex] = source[sourceIndex];
        });
    }

    function cycleEdges(state, face, dir) {
        const cycle = MOVE_CYCLES[face];
        const values = cycle.map(item => EDGE_GROUPS[item.edge].map(index => state[item.face][index]));
        cycle.forEach((item, index) => {
            const sourceIndex = dir === 1
                ? (index + cycle.length - 1) % cycle.length
                : (index + 1) % cycle.length;
            EDGE_GROUPS[item.edge].forEach((targetIndex, stickerIndex) => {
                state[item.face][targetIndex] = values[sourceIndex][stickerIndex];
            });
        });
    }

    function turnState(state, move) {
        const face = move.charAt(0);
        if (!MOVE_CYCLES[face]) return;
        const turns = move.endsWith('2') ? 2 : 1;
        const dir = move.endsWith("'") ? -1 : 1;
        for (let i = 0; i < turns; i++) {
            rotateFace(state, face, dir);
            cycleEdges(state, face, dir);
        }
    }

    function applyMove(move, options = {}) {
        const { record = true, render = true } = options;
        turnState(faces, move);
        if (record) {
            rawHistoryLength++;
            history = normalizeMoveSequence([...history, move]);
            lastSolution = [];
            solutionIndex = 0;
            solutionElapsed = 0;
        }
        if (render) renderPyraminx();
    }

    function inverseSequence(moves) {
        return moves.slice().reverse().map(invertMove);
    }

    function randomScramble(length = 15) {
        const moves = [];
        const moveFaces = FACE_NAMES;
        const suffixes = ['', "'", '2'];
        let previous = '';
        while (moves.length < length) {
            const face = moveFaces[Math.floor(Math.random() * moveFaces.length)];
            if (face === previous) continue;
            previous = face;
            moves.push(face + suffixes[Math.floor(Math.random() * suffixes.length)]);
        }
        return moves;
    }

    function pointsToAttr(points) {
        return points.map(point => `${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(' ');
    }

    function renderFace(face) {
        const stickers = faces[face];
        const polygons = TRIANGLE_POINTS.map((points, index) => `
            <polygon class="pyraminx-sticker" points="${pointsToAttr(points)}" style="--sticker-color:${stickers[index]}"></polygon>
        `).join('');
        return `
            <div class="pyraminx-3d-face pyraminx-3d-face-${face.toLowerCase()}" style="--face-tint:${FACE_COLORS[face]}">
                <svg class="pyraminx-face-svg" viewBox="0 0 180 ${TRIANGLE_HEIGHT.toFixed(3)}" aria-label="${FACE_LABELS[face]}">
                    ${polygons}
                </svg>
                <b>${face}</b>
            </div>`;
    }

    function renderMoveControls() {
        return FACE_NAMES.map(face => {
            const buttons = [face, `${face}'`, `${face}2`].map(move => `
                <button class="pyraminx-move-chip" onclick="window.applyPyraminxMoveFromButton('${move.replace("'", "\\'")}')">${move}</button>
            `).join('');
            return `
                <div class="pyraminx-move-group" style="--face-color:${FACE_COLORS[face]}">
                    <div class="pyraminx-move-title">${face}<small>${FACE_LABELS[face]}</small></div>
                    <div class="pyraminx-move-actions">${buttons}</div>
                </div>`;
        }).join('');
    }

    function updateStats() {
        setText('pyraminx-history-count', String(rawHistoryLength));
        setText('pyraminx-reduced-count', String(history.length));
        setText('pyraminx-solutionsCount', lastSolution.length ? '1' : '0');
    }

    function updateStepPanel() {
        const panel = document.getElementById('pyraminx-step-panel');
        const counter = document.getElementById('pyraminx-step-counter');
        const move = document.getElementById('pyraminx-step-move');
        const progress = document.getElementById('pyraminx-step-progress');
        const prev = document.getElementById('pyraminx-step-prev');
        const next = document.getElementById('pyraminx-step-next');
        const current = document.getElementById('pyraminx-step-current-btn');
        if (!panel || !counter || !move || !progress) return;

        const total = lastSolution.length;
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

        const done = solutionIndex >= total;
        panel.style.display = 'grid';
        counter.textContent = `${solutionIndex} / ${total}`;
        move.textContent = done ? '已完成' : `下一步：${lastSolution[solutionIndex]}`;
        progress.style.width = `${(solutionIndex / total) * 100}%`;
        if (prev) prev.disabled = solutionIndex <= 0;
        if (next) next.disabled = done;
        if (current) current.disabled = done;
    }

    function updateSolutionPanel() {
        const output = document.getElementById('pyraminx-solution-output');
        const time = document.getElementById('pyraminx-timeElapsed');
        if (time) time.textContent = String(solutionElapsed);
        updateStats();
        updateStepPanel();
        if (!output) return;
        if (!lastSolution.length) {
            output.textContent = '等待生成解法。';
        } else if (solutionIndex >= lastSolution.length) {
            output.textContent = '解法已执行完成。';
        } else {
            output.textContent = `下一步执行：${lastSolution[solutionIndex]}`;
        }
    }

    function setStatus(text) {
        setText('pyraminx-status', text);
    }

    function applyPyraminxRotation() {
        const solid = document.getElementById('pyraminx-solid');
        if (!solid) return;
        solid.style.setProperty('--pyraminx-rot-x', `${pyraminxRotX}deg`);
        solid.style.setProperty('--pyraminx-rot-y', `${pyraminxRotY}deg`);
    }

    function bindPyraminxDrag() {
        const scene = document.getElementById('pyraminx-scene');
        if (!scene || scene.dataset.dragReady === 'true') return;
        scene.dataset.dragReady = 'true';

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startRotX = pyraminxRotX;
        let startRotY = pyraminxRotY;

        scene.addEventListener('pointerdown', event => {
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            startRotX = pyraminxRotX;
            startRotY = pyraminxRotY;
            scene.classList.add('dragging');
            if (scene.setPointerCapture) scene.setPointerCapture(event.pointerId);
        });

        scene.addEventListener('pointermove', event => {
            if (!dragging) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            pyraminxRotY = startRotY + dx * 0.45;
            pyraminxRotX = Math.max(-82, Math.min(82, startRotX - dy * 0.45));
            applyPyraminxRotation();
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

    function renderPyraminx() {
        const solid = document.getElementById('pyraminx-solid');
        if (solid) {
            solid.innerHTML = FACE_NAMES.map(renderFace).join('');
            applyPyraminxRotation();
        }
        updateSolutionPanel();
        setStatus(isSolved() ? '金字塔魔方处于还原态' : '金字塔魔方已扰乱，等待求解');
    }

    function getWorkspaceHTML() {
        return `
            <div id="jinzitamofang-workspace" class="space-workspace" style="display:none;gap:2rem;flex-wrap:wrap;align-items:flex-start;">
                <div class="control-panel card cyber-border space-control-panel">
                    <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                    <h2 class="neon-title space-title" data-text="PYRAMINX">PYRAMINX</h2>
                    <div class="space-subtitle">金字塔魔方求解</div>

                    <textarea id="pyraminx-formula-input" class="space-formula-input" placeholder="输入扰乱公式，例如：U R U' L B2"></textarea>

                    <div class="space-action-grid">
                        <button class="cyber-button" onclick="window.resetPyraminx()"><span class="cyber-button__tag">重置魔方</span></button>
                        <button class="cyber-button" onclick="window.scramblePyraminx()"><span class="cyber-button__tag">随机扰乱</span></button>
                        <button class="cyber-button" onclick="window.applyPyraminxFormula()"><span class="cyber-button__tag">执行公式</span></button>
                        <button class="cyber-button cyber-glow" onclick="window.solvePyraminx()"><span class="cyber-button__tag">规约求解</span></button>
                    </div>

                    <div class="space-stats">
                        <div>解记录数: <span id="pyraminx-solutionsCount">0</span></div>
                        <div>算力耗时: <span id="pyraminx-timeElapsed">0</span> ms</div>
                        <div>历史步数: <span id="pyraminx-history-count">0</span></div>
                        <div>有效步数: <span id="pyraminx-reduced-count">0</span></div>
                    </div>

                    <div class="space-solution-card">
                        <div class="badge">解法步骤</div>
                        <div class="cube-step-panel pyraminx-step-panel" id="pyraminx-step-panel">
                            <div class="cube-step-reader">
                                <button class="cyber-button" id="pyraminx-step-prev" onclick="window.browsePyraminxSolution(-1)"><span class="cyber-button__tag">上一步</span></button>
                                <div class="cube-step-current">
                                    <div id="pyraminx-step-counter">0 / 0</div>
                                    <div id="pyraminx-step-move">等待求解</div>
                                </div>
                                <button class="cyber-button" id="pyraminx-step-next" onclick="window.browsePyraminxSolution(1)"><span class="cyber-button__tag">下一步</span></button>
                            </div>
                            <div class="cube-step-bar"><span id="pyraminx-step-progress"></span></div>
                            <button class="cyber-button cyber-glow" id="pyraminx-step-current-btn" onclick="window.executePyraminxStep()"><span class="cyber-button__tag">执行当前步</span></button>
                        </div>
                        <div class="result" id="pyraminx-solution-output">等待生成解法。</div>
                        <button class="cyber-button" onclick="window.executePyraminxSolution()"><span class="cyber-button__tag">执行全部解法</span></button>
                    </div>

                    <div class="instructions space-instructions">
                        <h3>系统法则:</h3>
                        <p>支持金字塔魔方基础记号：U L R B，可加 ' 或 2。</p>
                        <p>求解器会压缩连续同面转动，并按当前历史生成还原路径。</p>
                        <p>可用右侧转动面板单步操作，也可直接输入完整公式。</p>
                    </div>
                </div>

                <div class="grid-container card space-pyraminx-panel">
                    <div class="space-cube-hud">
                        <span id="pyraminx-status">金字塔魔方处于还原态</span>
                    </div>
                    <div class="pyraminx-scene" id="pyraminx-scene">
                        <div class="pyraminx-solid" id="pyraminx-solid"></div>
                    </div>
                    <div class="cube-drag-hint">拖动金字塔观察空间姿态</div>
                    <div class="cube-control-title">金字塔转动面板</div>
                    <div class="pyraminx-move-grid">${renderMoveControls()}</div>
                </div>
            </div>`;
    }

    function initPyraminx() {
        faces = createSolvedPyraminx();
        history = [];
        rawHistoryLength = 0;
        lastSolution = [];
        solutionIndex = 0;
        solutionElapsed = 0;
        renderPyraminx();
        bindPyraminxDrag();
    }

    function openPyraminxWorkspace() {
        const workspace = document.getElementById('jinzitamofang-workspace');
        if (!workspace) return;
        workspace.style.display = 'flex';
        renderPyraminx();
        bindPyraminxDrag();
    }

    window.spacePuzzleModules = (window.spacePuzzleModules || []).filter(module => module.id !== 'jinzitamofang');
    window.spacePuzzleModules.push({
        id: 'jinzitamofang',
        getListButton() {
            return '<button class="logic-btn" type="button" onclick="window.openSpacePuzzle(\'jinzitamofang\')">金字塔魔方</button>';
        },
        getWorkspaceHTML: getWorkspaceHTML,
        init: initPyraminx,
        open: openPyraminxWorkspace
    });

    window.resetPyraminx = function () {
        initPyraminx();
        const input = document.getElementById('pyraminx-formula-input');
        if (input) input.value = '';
    };

    window.scramblePyraminx = function () {
        faces = createSolvedPyraminx();
        history = [];
        rawHistoryLength = 0;
        lastSolution = [];
        solutionIndex = 0;
        solutionElapsed = 0;
        const moves = randomScramble();
        const input = document.getElementById('pyraminx-formula-input');
        if (input) input.value = moves.join(' ');
        moves.forEach(move => applyMove(move, { record: true, render: false }));
        renderPyraminx();
    };

    window.applyPyraminxFormula = function () {
        try {
            const input = document.getElementById('pyraminx-formula-input');
            const moves = parseFormula(input ? input.value : '');
            moves.forEach(move => applyMove(move, { record: true, render: false }));
            renderPyraminx();
        } catch (error) {
            setStatus(error.message);
        }
    };

    window.applyPyraminxMoveFromButton = function (move) {
        applyMove(move);
    };

    window.solvePyraminx = function () {
        const started = performance.now();
        if (isSolved()) {
            lastSolution = [];
            history = [];
            rawHistoryLength = 0;
            solutionIndex = 0;
        } else {
            lastSolution = normalizeMoveSequence(inverseSequence(history));
            solutionIndex = 0;
        }
        solutionElapsed = Math.max(1, Math.round(performance.now() - started));
        updateSolutionPanel();
        if (lastSolution.length) {
            setStatus(`已生成规约解法：共 ${lastSolution.length} 步，下一步执行 ${lastSolution[0]}`);
        } else {
            setStatus('无需求解，当前金字塔魔方已处于还原态');
        }
    };

    window.browsePyraminxSolution = function (delta) {
        if (!lastSolution.length) return;
        if (delta > 0) {
            if (solutionIndex >= lastSolution.length) return;
            applyMove(lastSolution[solutionIndex], { record: false, render: false });
            solutionIndex++;
        } else if (delta < 0) {
            if (solutionIndex <= 0) return;
            applyMove(invertMove(lastSolution[solutionIndex - 1]), { record: false, render: false });
            solutionIndex--;
        }
        renderPyraminx();
        if (solutionIndex >= lastSolution.length) {
            setStatus('解法已执行完成，魔方已还原');
        } else {
            setStatus(`下一步执行 ${lastSolution[solutionIndex]}`);
        }
    };

    window.executePyraminxStep = function () {
        window.browsePyraminxSolution(1);
    };

    window.executePyraminxSolution = function () {
        if (!lastSolution.length) window.solvePyraminx();
        if (!lastSolution.length) return;
        lastSolution.slice(solutionIndex).forEach(move => applyMove(move, { record: false, render: false }));
        solutionIndex = lastSolution.length;
        history = [];
        rawHistoryLength = 0;
        renderPyraminx();
    };
})();
