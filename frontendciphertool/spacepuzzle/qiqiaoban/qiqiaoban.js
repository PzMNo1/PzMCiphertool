(function () {
    const BOARD_WIDTH = 640;
    const BOARD_HEIGHT = 560;
    const OFFSET_X = 120;
    const OFFSET_Y = 70;
    const ROTATE_STEP = 45;

    const PIECE_POINTS = {
        largeA: [[0, 0], [400, 0], [200, 200]],
        largeB: [[0, 0], [0, 400], [200, 200]],
        smallA: [[400, 0], [400, 200], [300, 100]],
        square: [[300, 100], [400, 200], [300, 300], [200, 200]],
        parallelogram: [[200, 200], [300, 300], [200, 400], [100, 300]],
        smallB: [[0, 400], [200, 400], [100, 300]],
        medium: [[400, 400], [200, 400], [400, 200]]
    };

    const PIECE_META = [
        { id: 'largeA', label: '大三角 A', color: '#40e0ff' },
        { id: 'largeB', label: '大三角 B', color: '#2ecc71' },
        { id: 'medium', label: '中三角', color: '#ffda59' },
        { id: 'smallA', label: '小三角 A', color: '#ff6b8a' },
        { id: 'smallB', label: '小三角 B', color: '#9f7cff' },
        { id: 'square', label: '正方形', color: '#ff9f2e' },
        { id: 'parallelogram', label: '平行四边形', color: '#48d6c8' }
    ];

    const PIECES = PIECE_META.map(meta => {
        const points = PIECE_POINTS[meta.id];
        const center = getCentroid(points);
        return {
            ...meta,
            localPoints: points.map(point => [point[0] - center.x, point[1] - center.y]),
            home: {
                x: OFFSET_X + center.x,
                y: OFFSET_Y + center.y,
                rot: 0,
                flip: false
            }
        };
    });

    const TEMPLATE_NAMES = {
        square: '经典方形',
        house: '小屋',
        boat: '小船'
    };

    const TEMPLATES = {
        square: buildSquareTemplate(),
        house: {
            largeA: { x: 250, y: 155, rot: 0, flip: false },
            largeB: { x: 390, y: 155, rot: 90, flip: false },
            medium: { x: 320, y: 390, rot: 180, flip: false },
            smallA: { x: 200, y: 360, rot: -45, flip: false },
            smallB: { x: 455, y: 355, rot: 135, flip: false },
            square: { x: 315, y: 285, rot: 45, flip: false },
            parallelogram: { x: 380, y: 320, rot: 0, flip: false }
        },
        boat: {
            largeA: { x: 245, y: 200, rot: 45, flip: false },
            largeB: { x: 405, y: 200, rot: -45, flip: false },
            medium: { x: 325, y: 390, rot: 180, flip: false },
            smallA: { x: 155, y: 405, rot: 0, flip: false },
            smallB: { x: 495, y: 405, rot: 180, flip: false },
            square: { x: 320, y: 305, rot: 45, flip: false },
            parallelogram: { x: 420, y: 330, rot: 0, flip: false }
        }
    };

    let activeTemplate = 'square';
    let selectedPieceId = 'largeA';
    let showGuide = true;
    let snapEnabled = true;
    let pieces = [];
    let dragState = null;

    function getCentroid(points) {
        const sum = points.reduce((acc, point) => {
            acc.x += point[0];
            acc.y += point[1];
            return acc;
        }, { x: 0, y: 0 });
        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    }

    function buildSquareTemplate() {
        return Object.fromEntries(PIECES.map(piece => [piece.id, { ...piece.home }]));
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function getPieceDef(id) {
        return PIECES.find(piece => piece.id === id);
    }

    function getPieceState(id) {
        return pieces.find(piece => piece.id === id);
    }

    function normalizeAngle(angle) {
        return ((Math.round(angle) % 360) + 360) % 360;
    }

    function getAngleDelta(a, b) {
        const delta = Math.abs(normalizeAngle(a) - normalizeAngle(b));
        return Math.min(delta, 360 - delta);
    }

    function getTargetState(id) {
        return TEMPLATES[activeTemplate][id];
    }

    function pointsToAttr(points) {
        return points.map(point => `${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(' ');
    }

    function getTransform(state) {
        const scaleX = state.flip ? -1 : 1;
        return `translate(${state.x.toFixed(2)} ${state.y.toFixed(2)}) rotate(${normalizeAngle(state.rot)}) scale(${scaleX} 1)`;
    }

    function cloneTargetState(state) {
        return {
            x: state.x,
            y: state.y,
            rot: normalizeAngle(state.rot),
            flip: Boolean(state.flip)
        };
    }

    function applyTemplateToPieces() {
        pieces = PIECES.map(piece => ({
            id: piece.id,
            ...cloneTargetState(getTargetState(piece.id))
        }));
    }

    function scatterPieces() {
        pieces = PIECES.map((piece, index) => ({
            id: piece.id,
            x: 110 + (index % 4) * 135 + Math.random() * 32,
            y: 115 + Math.floor(index / 4) * 190 + Math.random() * 44,
            rot: normalizeAngle(Math.floor(Math.random() * 8) * ROTATE_STEP),
            flip: piece.id === 'parallelogram' ? Math.random() > 0.5 : false
        }));
        selectedPieceId = pieces[0].id;
    }

    function getFitCount() {
        return pieces.filter(piece => {
            const target = getTargetState(piece.id);
            const distance = Math.hypot(piece.x - target.x, piece.y - target.y);
            return distance < 5 && getAngleDelta(piece.rot, target.rot) < 1 && piece.flip === Boolean(target.flip);
        }).length;
    }

    function updateStatus(text) {
        setText('tangram-status', text);
    }

    function updateStats() {
        const selected = getPieceDef(selectedPieceId);
        setText('tangram-template-name', TEMPLATE_NAMES[activeTemplate]);
        setText('tangram-fit-count', `${getFitCount()} / ${PIECES.length}`);
        setText('tangram-selected-name', selected ? selected.label : '未选中');

        document.querySelectorAll('.tangram-template-btn').forEach(button => {
            button.classList.toggle('active', button.dataset.template === activeTemplate);
        });
        const guideButton = document.getElementById('tangram-guide-toggle');
        if (guideButton) guideButton.querySelector('.cyber-button__tag').textContent = showGuide ? '隐藏轮廓' : '显示轮廓';
        const snapButton = document.getElementById('tangram-snap-toggle');
        if (snapButton) snapButton.querySelector('.cyber-button__tag').textContent = snapEnabled ? '吸附: 开' : '吸附: 关';
    }

    function renderGuidePieces() {
        if (!showGuide) return '';
        return PIECES.map(piece => {
            const target = getTargetState(piece.id);
            return `<g class="tangram-guide-piece" transform="${getTransform(target)}">
                <polygon points="${pointsToAttr(piece.localPoints)}"></polygon>
            </g>`;
        }).join('');
    }

    function renderActivePieces() {
        return pieces.map(piece => {
            const def = getPieceDef(piece.id);
            const selectedClass = piece.id === selectedPieceId ? ' selected' : '';
            return `<g class="tangram-piece${selectedClass}" data-tangram-id="${piece.id}" transform="${getTransform(piece)}" style="--piece-color:${def.color}">
                <polygon points="${pointsToAttr(def.localPoints)}"></polygon>
                <text class="tangram-piece-label" y="5">${def.label.replace(/\s.+$/, '')}</text>
            </g>`;
        }).join('');
    }

    function renderTangramBoard() {
        const board = document.getElementById('tangram-board');
        if (!board) return;
        board.innerHTML = `
            <rect class="tangram-board-bg" x="0" y="0" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" rx="10"></rect>
            ${renderGuidePieces()}
            ${renderActivePieces()}
        `;
        bindPieceEvents();
        updateStats();
        updateStatus(getFitCount() === PIECES.length ? '七巧板已贴合当前模板' : '拖动拼块，点击后可旋转或镜像');
    }

    function updatePieceTransform(id) {
        const piece = getPieceState(id);
        const node = document.querySelector(`[data-tangram-id="${id}"]`);
        if (piece && node) node.setAttribute('transform', getTransform(piece));
    }

    function updateSelectionClasses() {
        document.querySelectorAll('.tangram-piece').forEach(node => {
            node.classList.toggle('selected', node.dataset.tangramId === selectedPieceId);
        });
        updateStats();
    }

    function getSvgScale(svg) {
        const rect = svg.getBoundingClientRect ? svg.getBoundingClientRect() : { width: BOARD_WIDTH, height: BOARD_HEIGHT };
        return {
            x: BOARD_WIDTH / Math.max(1, rect.width || BOARD_WIDTH),
            y: BOARD_HEIGHT / Math.max(1, rect.height || BOARD_HEIGHT)
        };
    }

    function bindPieceEvents() {
        const svg = document.getElementById('tangram-board');
        if (!svg) return;

        svg.querySelectorAll('.tangram-piece').forEach(node => {
            node.addEventListener('pointerdown', event => {
                const id = node.dataset.tangramId;
                const piece = getPieceState(id);
                if (!piece) return;
                selectedPieceId = id;
                updateSelectionClasses();
                dragState = {
                    id,
                    pointerId: event.pointerId,
                    startClientX: event.clientX,
                    startClientY: event.clientY,
                    startX: piece.x,
                    startY: piece.y
                };
                if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
                event.preventDefault();
            });
        });

        if (svg.dataset.tangramBound === 'true') return;
        svg.dataset.tangramBound = 'true';
        svg.addEventListener('pointermove', event => {
            if (!dragState) return;
            const piece = getPieceState(dragState.id);
            if (!piece) return;
            const scale = getSvgScale(svg);
            piece.x = dragState.startX + (event.clientX - dragState.startClientX) * scale.x;
            piece.y = dragState.startY + (event.clientY - dragState.startClientY) * scale.y;
            updatePieceTransform(piece.id);
            updateStats();
        });

        const stopDrag = event => {
            if (!dragState) return;
            if (svg.releasePointerCapture) svg.releasePointerCapture(event.pointerId);
            const id = dragState.id;
            dragState = null;
            if (snapEnabled) snapPieceToTarget(id);
            renderTangramBoard();
        };
        svg.addEventListener('pointerup', stopDrag);
        svg.addEventListener('pointercancel', stopDrag);
        svg.addEventListener('pointerleave', stopDrag);
    }

    function snapPieceToTarget(id) {
        const piece = getPieceState(id);
        const target = getTargetState(id);
        if (!piece || !target) return;
        const distance = Math.hypot(piece.x - target.x, piece.y - target.y);
        if (distance <= 32 && getAngleDelta(piece.rot, target.rot) <= ROTATE_STEP / 2 && piece.flip === Boolean(target.flip)) {
            Object.assign(piece, cloneTargetState(target));
        }
    }

    function getWorkspaceHTML() {
        const templateButtons = Object.keys(TEMPLATES).map(key => `
            <button class="cyber-button tangram-template-btn" data-template="${key}" onclick="window.setQiqiaobanTemplate('${key}')">
                <span class="cyber-button__tag">${TEMPLATE_NAMES[key]}</span>
            </button>`).join('');

        return `
            <div id="qiqiaoban-workspace" class="space-workspace" style="display:none;gap:2rem;flex-wrap:wrap;align-items:flex-start;">
                <div class="control-panel card cyber-border space-control-panel">
                    <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                    <h2 class="neon-title space-title" data-text="TANGRAM">TANGRAM</h2>
                    <div class="space-subtitle">七巧板拼图台</div>

                    <div class="tangram-template-row">${templateButtons}</div>

                    <div class="space-action-grid tangram-action-grid">
                        <button class="cyber-button cyber-glow" onclick="window.applyQiqiaobanTemplate()"><span class="cyber-button__tag">一键归位</span></button>
                        <button class="cyber-button" onclick="window.scrambleQiqiaoban()"><span class="cyber-button__tag">随机打散</span></button>
                        <button class="cyber-button" onclick="window.rotateQiqiaobanPiece(-45)"><span class="cyber-button__tag">左旋 45°</span></button>
                        <button class="cyber-button" onclick="window.rotateQiqiaobanPiece(45)"><span class="cyber-button__tag">右旋 45°</span></button>
                        <button class="cyber-button" onclick="window.flipQiqiaobanPiece()"><span class="cyber-button__tag">镜像选中</span></button>
                        <button class="cyber-button" id="tangram-guide-toggle" onclick="window.toggleQiqiaobanGuide()"><span class="cyber-button__tag">隐藏轮廓</span></button>
                        <button class="cyber-button" id="tangram-snap-toggle" onclick="window.toggleQiqiaobanSnap()"><span class="cyber-button__tag">吸附: 开</span></button>
                    </div>

                    <div class="space-stats">
                        <div>当前模板: <span id="tangram-template-name">经典方形</span></div>
                        <div>贴合拼块: <span id="tangram-fit-count">0 / 7</span></div>
                        <div>选中拼块: <span id="tangram-selected-name">大三角 A</span></div>
                    </div>

                    <div class="instructions space-instructions">
                        <h3>系统法则:</h3>
                        <p>拖动七块拼板到轮廓中，点击拼块后可旋转或镜像。</p>
                        <p>开启吸附时，拼块接近当前模板位置会自动贴合。</p>
                        <p>切换模板只更换轮廓；使用一键归位可直接套入当前模板。</p>
                    </div>
                </div>

                <div class="grid-container card space-tangram-panel">
                    <div class="space-cube-hud">
                        <span id="tangram-status">七巧板已贴合当前模板</span>
                    </div>
                    <svg id="tangram-board" class="tangram-board" viewBox="0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}" role="img" aria-label="七巧板画布"></svg>
                </div>
            </div>`;
    }

    function initQiqiaoban() {
        applyTemplateToPieces();
        renderTangramBoard();
    }

    function openQiqiaobanWorkspace() {
        const workspace = document.getElementById('qiqiaoban-workspace');
        if (!workspace) return;
        workspace.style.display = 'flex';
        if (!pieces.length) applyTemplateToPieces();
        renderTangramBoard();
    }

    window.spacePuzzleModules = (window.spacePuzzleModules || []).filter(module => module.id !== 'qiqiaoban');
    window.spacePuzzleModules.push({
        id: 'qiqiaoban',
        getListButton() {
            return '<button class="logic-btn" type="button" onclick="window.openSpacePuzzle(\'qiqiaoban\')">七巧板</button>';
        },
        getWorkspaceHTML: getWorkspaceHTML,
        init: initQiqiaoban,
        open: openQiqiaobanWorkspace
    });

    window.setQiqiaobanTemplate = function (templateId) {
        if (!TEMPLATES[templateId]) return;
        activeTemplate = templateId;
        renderTangramBoard();
        updateStatus(`已切换到${TEMPLATE_NAMES[templateId]}模板`);
    };

    window.applyQiqiaobanTemplate = function () {
        applyTemplateToPieces();
        renderTangramBoard();
    };

    window.scrambleQiqiaoban = function () {
        scatterPieces();
        renderTangramBoard();
        updateStatus('七巧板已打散，开始拼放');
    };

    window.rotateQiqiaobanPiece = function (delta) {
        const piece = getPieceState(selectedPieceId);
        if (!piece) return;
        piece.rot = normalizeAngle(piece.rot + delta);
        if (snapEnabled) snapPieceToTarget(piece.id);
        renderTangramBoard();
    };

    window.flipQiqiaobanPiece = function () {
        const piece = getPieceState(selectedPieceId);
        if (!piece) return;
        piece.flip = !piece.flip;
        if (snapEnabled) snapPieceToTarget(piece.id);
        renderTangramBoard();
    };

    window.toggleQiqiaobanGuide = function () {
        showGuide = !showGuide;
        renderTangramBoard();
    };

    window.toggleQiqiaobanSnap = function () {
        snapEnabled = !snapEnabled;
        renderTangramBoard();
    };
})();
