(function () {
    const SQUARE_ONE_STYLE_ID = 'square-one-inline-style';

    function injectSquareOneStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById(SQUARE_ONE_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = SQUARE_ONE_STYLE_ID;
        style.textContent = `
.squareone-control-panel {
  min-width: 360px;
}

.squareone-action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.squareone-panel {
  min-width: 470px;
  background:
    radial-gradient(circle at 24% 16%, rgba(255, 218, 89, 0.1), transparent 30%),
    linear-gradient(135deg, rgba(64, 224, 255, 0.06), rgba(159, 124, 255, 0.06)),
    rgba(0, 0, 0, 0.22);
}

.squareone-scene {
  width: 330px;
  height: 300px;
  display: grid;
  place-items: center;
  perspective: 920px;
  margin: 0 auto 2rem;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.squareone-scene.dragging {
  cursor: grabbing;
}

.squareone-3d {
  width: 246px;
  height: 246px;
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(var(--squareone-rot-x, -30deg)) rotateY(var(--squareone-rot-y, -34deg));
  transition: transform 0.08s linear;
}

.squareone-layer {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 244px;
  height: 244px;
  margin: -122px 0 0 -122px;
  transform-style: preserve-3d;
  filter: drop-shadow(0 0 14px rgba(64, 224, 255, 0.12));
}

.squareone-layer-top {
  transform: translateZ(45px);
}

.squareone-layer-bottom {
  transform: translateZ(-45px) rotateY(180deg);
  opacity: 0.96;
}

.squareone-slice-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 222px;
  height: 222px;
  margin: -111px 0 0 -111px;
  border-radius: 8px;
  border: 1px solid rgba(64, 224, 255, 0.18);
  background:
    linear-gradient(90deg, rgba(64, 224, 255, 0.09), rgba(255, 218, 89, 0.06)),
    rgba(2, 12, 18, 0.68);
  box-shadow:
    inset 0 0 20px rgba(64, 224, 255, 0.1),
    0 0 18px rgba(0, 0, 0, 0.24);
  transform: translateZ(0);
}

.squareone-slice-core::before,
.squareone-slice-core::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  pointer-events: none;
}

.squareone-slice-core::before {
  border-top: 5px solid rgba(255, 255, 255, 0.08);
  border-left: 5px solid rgba(64, 224, 255, 0.08);
}

.squareone-slice-core::after {
  border-right: 8px solid rgba(0, 0, 0, 0.3);
  border-bottom: 8px solid rgba(0, 0, 0, 0.32);
}

.squareone-layer-svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.squareone-unit {
  fill: var(--piece-color);
  stroke: rgba(2, 12, 18, 0.92);
  stroke-width: 1.8;
  filter:
    drop-shadow(0 0 5px rgba(0, 0, 0, 0.26))
    drop-shadow(0 0 5px rgba(255, 255, 255, 0.04));
}

.squareone-unit.corner {
  filter:
    drop-shadow(0 0 8px rgba(64, 224, 255, 0.12))
    drop-shadow(0 0 4px rgba(255, 255, 255, 0.08));
}

.squareone-unit.edge {
  opacity: 0.92;
}

.squareone-unit.cut {
  stroke: rgba(255, 218, 89, 0.9);
  stroke-width: 2.2;
}

.squareone-side-unit {
  fill: var(--side-color);
  stroke: rgba(2, 12, 18, 0.84);
  stroke-width: 1.5;
  opacity: 0.95;
}

.squareone-layer-core {
  fill: rgba(2, 12, 18, 0.92);
  stroke: rgba(64, 224, 255, 0.42);
  stroke-width: 1.5;
  filter: drop-shadow(0 0 8px rgba(64, 224, 255, 0.18));
}

.squareone-cut-line {
  stroke: rgba(255, 255, 255, 0.16);
  stroke-width: 1.4;
  stroke-dasharray: 7 6;
}

.squareone-layer-label {
  fill: rgba(255, 255, 255, 0.74);
  text-anchor: middle;
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
}

.squareone-move-spatial {
  grid-template-areas:
    ". top top ."
    "left left right right"
    ". bottom bottom .";
}

.squareone-top-control {
  grid-area: top;
}

.squareone-slice-control {
  grid-column: 1 / -1;
  grid-row: 2;
}

.squareone-bottom-control {
  grid-area: bottom;
}

.squareone-face-control {
  min-height: 90px;
}

.squareone-face-control .cube-face-control-actions {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.squareone-slice-control .cube-face-control-actions {
  grid-template-columns: 1fr;
}

.squareone-slash-chip {
  min-height: 42px;
  font-size: 1.2rem;
}

#squareone-step-counter {
  color: #ffda59;
  font-weight: 800;
  text-shadow: 0 0 6px rgba(255, 218, 89, 0.86);
}

#squareone-step-move {
  font-size: 0.86rem;
  color: rgba(255, 255, 255, 0.78);
}

@media (max-width: 980px) {
  .squareone-move-spatial {
    width: min(580px, 100%);
  }
}

@media (max-width: 760px) {
  .squareone-control-panel {
    min-width: 0;
    width: 100%;
    padding: 1.25rem;
  }

  .squareone-action-grid {
    grid-template-columns: 1fr;
  }

  .squareone-scene {
    width: 270px;
    height: 255px;
    margin-bottom: 1.6rem;
  }

  .squareone-3d {
    width: 206px;
    height: 206px;
  }

  .squareone-layer {
    width: 204px;
    height: 204px;
    margin: -102px 0 0 -102px;
  }

  .squareone-layer-top {
    transform: translateZ(36px);
  }

  .squareone-layer-bottom {
    transform: translateZ(-36px) rotateY(180deg);
  }

  .squareone-slice-core {
    width: 186px;
    height: 186px;
    margin: -93px 0 0 -93px;
  }

  .squareone-move-spatial {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      "top top"
      "left right"
      "bottom bottom";
  }

  .squareone-face-control .cube-face-control-actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .squareone-slice-control .cube-face-control-actions {
    grid-template-columns: 1fr;
  }
}
`;
        document.head.appendChild(style);
    }

    injectSquareOneStyles();

    const UNIT_COUNT = 12;
    const TOP_COLOR = '#f4f7fb';
    const BOTTOM_COLOR = '#ffd84a';
    const EDGE_COLORS = ['#19d27f', '#ff4d5e', '#2688ff', '#ff9f2e', '#48d6c8', '#9f7cff', '#ff6b8a', '#40e0ff'];
    const TURN_OPTIONS = [-3, -2, -1, 1, 2, 3];

    let topLayer = createSolvedLayer('U', TOP_COLOR, 0);
    let bottomLayer = createSolvedLayer('D', BOTTOM_COLOR, 4);
    let history = [];
    let rawHistoryLength = 0;
    let lastSolution = [];
    let solutionIndex = 0;
    let solutionElapsed = 0;
    let squareOneRotX = -30;
    let squareOneRotY = -34;

    function makePieceUnits(id, type, faceColor, sideColor) {
        const size = type === 'corner' ? 2 : 1;
        return Array.from({ length: size }, (_, part) => ({
            id,
            type,
            part,
            size,
            faceColor,
            sideColor
        }));
    }

    function createSolvedLayer(prefix, faceColor, colorOffset) {
        const units = [];
        for (let i = 0; i < 4; i++) {
            units.push(...makePieceUnits(`${prefix}C${i + 1}`, 'corner', faceColor, EDGE_COLORS[(colorOffset + i * 2) % EDGE_COLORS.length]));
            units.push(...makePieceUnits(`${prefix}E${i + 1}`, 'edge', faceColor, EDGE_COLORS[(colorOffset + i * 2 + 1) % EDGE_COLORS.length]));
        }
        return units;
    }

    function cloneUnit(unit) {
        return { ...unit };
    }

    function cloneLayer(layer) {
        return layer.map(cloneUnit);
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function normalizeAmount(amount) {
        let normalized = Math.round(Number(amount) || 0) % UNIT_COUNT;
        if (normalized > 6) normalized -= UNIT_COUNT;
        if (normalized < -5) normalized += UNIT_COUNT;
        return normalized;
    }

    function rotateLayer(layer, amount) {
        const shift = ((amount % UNIT_COUNT) + UNIT_COUNT) % UNIT_COUNT;
        if (!shift) return cloneLayer(layer);
        return layer.slice(UNIT_COUNT - shift).concat(layer.slice(0, UNIT_COUNT - shift)).map(cloneUnit);
    }

    function layerHasSliceCut(layer) {
        return layer[0].id !== layer[UNIT_COUNT - 1].id && layer[5].id !== layer[6].id;
    }

    function canSlice() {
        return layerHasSliceCut(topLayer) && layerHasSliceCut(bottomLayer);
    }

    function isSolvedLayer(layer, prefix) {
        const solved = createSolvedLayer(prefix, prefix === 'U' ? TOP_COLOR : BOTTOM_COLOR, prefix === 'U' ? 0 : 4);
        return layer.every((unit, index) => unit.id === solved[index].id && unit.part === solved[index].part);
    }

    function isSolved() {
        return isSolvedLayer(topLayer, 'U') && isSolvedLayer(bottomLayer, 'D');
    }

    function clearSolution() {
        lastSolution = [];
        solutionIndex = 0;
        solutionElapsed = 0;
    }

    function formatTurn(topAmount, bottomAmount) {
        return `(${normalizeAmount(topAmount)},${normalizeAmount(bottomAmount)})`;
    }

    function recordLabel(record) {
        return record.type === 'slash' ? '/' : formatTurn(record.top, record.bottom);
    }

    function invertRecord(record) {
        if (record.type === 'slash') return { type: 'slash' };
        return {
            type: 'turn',
            top: normalizeAmount(-record.top),
            bottom: normalizeAmount(-record.bottom)
        };
    }

    function pushHistory(record) {
        history.push(record);
        rawHistoryLength++;
        clearSolution();
    }

    function applyTurn(topAmount, bottomAmount, options = {}) {
        const topTurn = normalizeAmount(topAmount);
        const bottomTurn = normalizeAmount(bottomAmount);
        if (topTurn === 0 && bottomTurn === 0) return true;

        topLayer = rotateLayer(topLayer, topTurn);
        bottomLayer = rotateLayer(bottomLayer, bottomTurn);

        if (options.record) {
            pushHistory({ type: 'turn', top: topTurn, bottom: bottomTurn });
        }

        if (options.render !== false) renderSquareOne();
        return true;
    }

    function applySlash(options = {}) {
        if (!canSlice()) {
            if (options.render !== false) {
                renderSquareOne();
                setText('squareone-status', '当前切线穿过角块，不能执行 / 切片');
            }
            return false;
        }

        const topFront = topLayer.slice(0, 6).reverse().map(cloneUnit);
        const bottomFront = bottomLayer.slice(0, 6).reverse().map(cloneUnit);
        topLayer = bottomFront.concat(topLayer.slice(6).map(cloneUnit));
        bottomLayer = topFront.concat(bottomLayer.slice(6).map(cloneUnit));

        if (options.record) {
            pushHistory({ type: 'slash' });
        }

        if (options.render !== false) renderSquareOne();
        return true;
    }

    function applyRecord(record, options = {}) {
        if (record.type === 'slash') return applySlash(options);
        return applyTurn(record.top, record.bottom, options);
    }

    function getLegalLayerTurns(layer) {
        const turns = [];
        for (let amount = -5; amount <= 6; amount++) {
            if (layerHasSliceCut(rotateLayer(layer, amount))) turns.push(amount);
        }
        return turns.length ? turns : [0];
    }

    function chooseRandom(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    function randomScramble(length = 10) {
        const records = [];
        for (let i = 0; i < length; i++) {
            const topTurn = chooseRandom(getLegalLayerTurns(topLayer));
            const bottomTurn = chooseRandom(getLegalLayerTurns(bottomLayer));
            if (topTurn || bottomTurn) {
                const record = { type: 'turn', top: topTurn, bottom: bottomTurn };
                applyRecord(record, { record: false, render: false });
                records.push(record);
            }
            if (canSlice()) {
                const slash = { type: 'slash' };
                applyRecord(slash, { record: false, render: false });
                records.push(slash);
            }
        }
        return records;
    }

    function parseFormula(formula) {
        const source = String(formula || '')
            .replace(/[，]/g, ',')
            .replace(/[／]/g, '/')
            .replace(/\s+/g, '');
        const records = [];
        let index = 0;

        while (index < source.length) {
            const char = source[index];
            if (char === '/') {
                records.push({ type: 'slash' });
                index++;
                continue;
            }

            if (char !== '(') {
                throw new Error('公式格式错误：请使用 (x,y) / 记号，例如：(3,0)/(-2,1)/');
            }

            const end = source.indexOf(')', index);
            if (end < 0) throw new Error('公式格式错误：缺少右括号');
            const parts = source.slice(index + 1, end).split(',');
            if (parts.length !== 2) throw new Error('公式格式错误：括号内需要两个数字');

            const top = Number(parts[0]);
            const bottom = Number(parts[1]);
            if (!Number.isInteger(top) || !Number.isInteger(bottom) || top < -6 || top > 6 || bottom < -6 || bottom > 6) {
                throw new Error('Square-1 转动值必须是 -6 到 6 的整数');
            }
            records.push({ type: 'turn', top: normalizeAmount(top), bottom: normalizeAmount(bottom) });
            index = end + 1;
        }

        return records;
    }

    function squareBoundaryPoint(halfSize, angleDeg) {
        const angle = (angleDeg - 90) * Math.PI / 180;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const scale = halfSize / Math.max(Math.abs(dx), Math.abs(dy));
        return {
            x: dx * scale,
            y: dy * scale
        };
    }

    function squareBoundaryPoints(startAngle, endAngle, halfSize) {
        const cornerAngles = [45, 135, 225, 315];
        const angles = [startAngle];
        cornerAngles.forEach(angle => {
            if (angle > startAngle && angle < endAngle) angles.push(angle);
        });
        angles.push(endAngle);
        return angles.map(angle => squareBoundaryPoint(halfSize, angle));
    }

    function pointsToPath(points) {
        return points.map((point, index) => {
            const command = index === 0 ? 'M' : 'L';
            return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
        }).join(' ');
    }

    function squareWedgePath(startAngle, endAngle, innerHalf, outerHalf) {
        const outerPoints = squareBoundaryPoints(startAngle, endAngle, outerHalf);
        const innerPoints = squareBoundaryPoints(startAngle, endAngle, innerHalf).reverse();
        return `${pointsToPath(outerPoints)} ${pointsToPath(innerPoints).replace(/^M/, 'L')} Z`;
    }

    function collectLayerPieces(layer) {
        const pieces = [];
        for (let index = 0; index < UNIT_COUNT;) {
            const unit = layer[index];
            let span = 1;
            while (index + span < UNIT_COUNT && layer[index + span].id === unit.id) {
                span++;
            }
            pieces.push({ unit, start: index, span });
            index += span;
        }
        return pieces;
    }

    function isSliceBoundaryPiece(start, span) {
        const end = start + span;
        return start === 0 || start === 6 || end === 6 || end === UNIT_COUNT;
    }

    function renderLayerSideWalls(layer) {
        return layer.map((unit, index) => {
            const start = index * 30;
            const end = start + 30;
            return `<path class="squareone-side-unit" d="${squareWedgePath(start, end, 108, 120)}" style="--side-color:${unit.sideColor}" />`;
        }).join('');
    }

    function renderLayerFacePieces(layer) {
        return collectLayerPieces(layer).map(piece => {
            const start = piece.start * 30;
            const end = (piece.start + piece.span) * 30;
            const cutClass = isSliceBoundaryPiece(piece.start, piece.span) ? 'cut' : '';
            return `<path class="squareone-unit ${piece.unit.type} ${cutClass}" d="${squareWedgePath(start, end, 18, 108)}" style="--piece-color:${piece.unit.faceColor};--side-color:${piece.unit.sideColor}" />`;
        }).join('');
    }

    function squareCorePath(halfSize) {
        const p = halfSize;
        return [
            `M ${-p} ${-p}`,
            `L ${p} ${-p}`,
            `L ${p} ${p}`,
            `L ${-p} ${p}`,
            'Z'
        ].join(' ');
    }

    function renderLayerSvg(layer, label, className) {
        return `<svg class="squareone-layer-svg ${className}" viewBox="-122 -122 244 244" aria-label="${label}">
            ${renderLayerSideWalls(layer)}
            ${renderLayerFacePieces(layer)}
            <path class="squareone-layer-core" d="${squareCorePath(18)}"></path>
            <line class="squareone-cut-line" x1="0" y1="-122" x2="0" y2="122"></line>
            <line class="squareone-cut-line" x1="-122" y1="0" x2="122" y2="0"></line>
            <text class="squareone-layer-label" x="0" y="6">${label}</text>
        </svg>`;
    }

    function applySquareOneRotation() {
        const mount = document.getElementById('squareone-3d');
        if (!mount) return;
        mount.style.setProperty('--squareone-rot-x', `${squareOneRotX}deg`);
        mount.style.setProperty('--squareone-rot-y', `${squareOneRotY}deg`);
    }

    function bindSquareOneDrag() {
        const scene = document.querySelector ? document.querySelector('.squareone-scene') : null;
        if (!scene || scene.dataset.dragReady === 'true') return;
        scene.dataset.dragReady = 'true';

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startRotX = squareOneRotX;
        let startRotY = squareOneRotY;

        scene.addEventListener('pointerdown', event => {
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            startRotX = squareOneRotX;
            startRotY = squareOneRotY;
            scene.classList.add('dragging');
            if (scene.setPointerCapture) scene.setPointerCapture(event.pointerId);
        });

        scene.addEventListener('pointermove', event => {
            if (!dragging) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            squareOneRotY = startRotY + dx * 0.45;
            squareOneRotX = Math.max(-78, Math.min(78, startRotX - dy * 0.45));
            applySquareOneRotation();
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

    function updateSolutionPanel() {
        setText('squareone-history-count', String(rawHistoryLength));
        setText('squareone-solution-count', String(lastSolution.length));
        setText('squareone-time-elapsed', String(solutionElapsed));
        setText('squareone-slice-state', canSlice() ? '可切片' : '切线锁定');
        setText('squareone-state-summary', isSolved() ? '已还原' : '待还原');

        const output = document.getElementById('squareone-solution-output');
        if (output) output.textContent = lastSolution.length ? lastSolution.map(recordLabel).join(' ') : '等待生成解法。';

        const panel = document.getElementById('squareone-step-panel');
        const counter = document.getElementById('squareone-step-counter');
        const move = document.getElementById('squareone-step-move');
        const progress = document.getElementById('squareone-step-progress');
        if (panel) panel.style.display = lastSolution.length ? 'grid' : 'none';
        if (counter) counter.textContent = `${solutionIndex} / ${lastSolution.length}`;
        if (move) {
            move.textContent = solutionIndex >= lastSolution.length
                ? (lastSolution.length ? '执行完成' : '等待求解')
                : recordLabel(lastSolution[solutionIndex]);
        }
        if (progress) {
            const percent = lastSolution.length ? (solutionIndex / lastSolution.length) * 100 : 0;
            progress.style.width = `${percent}%`;
        }
    }

    function renderSquareOne() {
        const mount = document.getElementById('squareone-3d');
        if (mount) {
            mount.innerHTML = `
                <div class="squareone-layer squareone-layer-top">${renderLayerSvg(topLayer, 'TOP', 'top')}</div>
                <div class="squareone-slice-core"></div>
                <div class="squareone-layer squareone-layer-bottom">${renderLayerSvg(bottomLayer, 'BOTTOM', 'bottom')}</div>
            `;
            applySquareOneRotation();
            bindSquareOneDrag();
        }

        updateSolutionPanel();
        setText('squareone-status', isSolved() ? 'Square-1 魔方处于还原态' : 'Square-1 已扰乱，等待求解');
    }

    function getWorkspaceHTML() {
        const turnButtons = TURN_OPTIONS
            .map(amount => `<button class="cube-move-chip" onclick="window.turnSquareOneTop(${amount})">${amount > 0 ? '+' : ''}${amount}</button>`)
            .join('');
        const bottomButtons = TURN_OPTIONS
            .map(amount => `<button class="cube-move-chip" onclick="window.turnSquareOneBottom(${amount})">${amount > 0 ? '+' : ''}${amount}</button>`)
            .join('');

        return `<div id="squreonemofang-workspace" class="space-workspace">
            <div class="grid-container card space-control-panel squareone-control-panel">
                <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                <h2 class="space-title">Square-1 魔方</h2>
                <div class="space-subtitle">形变魔方 / (x,y) / 切片记号 / 历史反向求解</div>

                <textarea id="squareone-formula-input" class="space-formula-input" placeholder="输入扰乱公式，例如：(3,0)/(-2,1)/(0,-3)/"></textarea>

                <div class="space-action-grid squareone-action-grid">
                    <button class="cyber-button" onclick="window.applySquareOneFormula()"><span class="cyber-button__tag">应用公式</span></button>
                    <button class="cyber-button" onclick="window.scrambleSquareOne()"><span class="cyber-button__tag">随机扰乱</span></button>
                    <button class="cyber-button" onclick="window.resetSquareOne()"><span class="cyber-button__tag">重置魔方</span></button>
                    <button class="cyber-button cyber-glow" onclick="window.solveSquareOne()"><span class="cyber-button__tag">规约求解</span></button>
                    <button class="cyber-button" onclick="window.executeSquareOneSolution()"><span class="cyber-button__tag">执行全部</span></button>
                    <button class="cyber-button" onclick="window.clearSquareOneHistory()"><span class="cyber-button__tag">清空记录</span></button>
                </div>

                <div class="space-stats">
                    <div>状态: <span id="squareone-state-summary">已还原</span></div>
                    <div>切片: <span id="squareone-slice-state">可切片</span></div>
                    <div>历史步数: <span id="squareone-history-count">0</span></div>
                    <div>解法步数: <span id="squareone-solution-count">0</span></div>
                    <div>算力耗时: <span id="squareone-time-elapsed">0</span> ms</div>
                </div>

                <div class="space-solution-card">
                    <div class="cube-step-panel squareone-step-panel" id="squareone-step-panel">
                        <div class="cube-step-reader">
                            <button class="cyber-button" onclick="window.browseSquareOneSolution(-1)"><span class="cyber-button__tag">上一步</span></button>
                            <div class="cube-step-current">
                                <div id="squareone-step-counter">0 / 0</div>
                                <div id="squareone-step-move">等待求解</div>
                            </div>
                            <button class="cyber-button" onclick="window.browseSquareOneSolution(1)"><span class="cyber-button__tag">下一步</span></button>
                        </div>
                        <div class="cube-step-bar"><span id="squareone-step-progress"></span></div>
                    </div>
                    <div class="result" id="squareone-solution-output">等待生成解法。</div>
                </div>

                <div class="instructions space-instructions">
                    <h3>系统规则:</h3>
                    <p>支持 Square-1 常用记号：(x,y) 表示上层和下层按 30 度单位旋转，/ 表示切片。</p>
                    <p>切片前必须保证上下层切线没有穿过角块；状态栏会显示当前是否可切片。</p>
                    <p>求解器会反向执行本模块记录的公式、随机扰乱和手动操作，适合形变演示和复原练习。</p>
                </div>
            </div>

            <div class="grid-container card space-display-panel squareone-panel">
                <div class="space-cube-hud">
                    <span id="squareone-status">Square-1 魔方处于还原态</span>
                </div>
                <div class="squareone-scene">
                    <div id="squareone-3d" class="squareone-3d"></div>
                </div>
                <div class="cube-drag-hint">拖动 Square-1 观察上下层形变</div>
                <div class="cube-control-title">Square-1 空间操作台</div>
                <div class="cube-move-spatial squareone-move-spatial">
                    <div class="cube-face-control squareone-face-control squareone-top-control" style="--face-color:${TOP_COLOR}">
                        <div class="cube-face-control-label"><span>U</span><small>上层旋转</small></div>
                        <div class="cube-face-control-actions">${turnButtons}</div>
                    </div>
                    <div class="cube-face-control squareone-face-control squareone-slice-control" style="--face-color:#40e0ff">
                        <div class="cube-face-control-label"><span>/</span><small>切片交换</small></div>
                        <div class="cube-face-control-actions">
                            <button class="cube-move-chip squareone-slash-chip" onclick="window.sliceSquareOne()">/</button>
                        </div>
                    </div>
                    <div class="cube-face-control squareone-face-control squareone-bottom-control" style="--face-color:${BOTTOM_COLOR}">
                        <div class="cube-face-control-label"><span>D</span><small>下层旋转</small></div>
                        <div class="cube-face-control-actions">${bottomButtons}</div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function initSquareOne() {
        topLayer = createSolvedLayer('U', TOP_COLOR, 0);
        bottomLayer = createSolvedLayer('D', BOTTOM_COLOR, 4);
        history = [];
        rawHistoryLength = 0;
        clearSolution();
        renderSquareOne();
    }

    function openSquareOneWorkspace() {
        const workspace = document.getElementById('squreonemofang-workspace');
        if (!workspace) return;
        workspace.style.display = 'flex';
        renderSquareOne();
    }

    window.spacePuzzleModules = (window.spacePuzzleModules || []).filter(module => module.id !== 'squreonemofang');
    window.spacePuzzleModules.push({
        id: 'squreonemofang',
        getListButton() {
            return '<button class="logic-btn" type="button" onclick="window.openSpacePuzzle(\'squreonemofang\')">Square-1 魔方</button>';
        },
        getWorkspaceHTML: getWorkspaceHTML,
        init: initSquareOne,
        open: openSquareOneWorkspace
    });

    window.resetSquareOne = function () {
        initSquareOne();
        const input = document.getElementById('squareone-formula-input');
        if (input) input.value = '';
    };

    window.clearSquareOneHistory = function () {
        history = [];
        rawHistoryLength = 0;
        clearSolution();
        renderSquareOne();
        setText('squareone-status', '已清空当前操作记录');
    };

    window.turnSquareOneTop = function (amount) {
        applyTurn(amount, 0, { record: true });
    };

    window.turnSquareOneBottom = function (amount) {
        applyTurn(0, amount, { record: true });
    };

    window.sliceSquareOne = function () {
        applySlash({ record: true });
    };

    window.applySquareOneFormula = function () {
        try {
            const input = document.getElementById('squareone-formula-input');
            const records = parseFormula(input ? input.value : '');
            records.forEach(record => {
                const ok = applyRecord(record, { record: true, render: false });
                if (!ok) throw new Error(`无法执行 ${recordLabel(record)}：切线穿过角块`);
            });
            renderSquareOne();
        } catch (error) {
            renderSquareOne();
            setText('squareone-status', error.message);
        }
    };

    window.scrambleSquareOne = function () {
        initSquareOne();
        const records = randomScramble();
        history = records.map(record => ({ ...record }));
        rawHistoryLength = history.length;
        clearSolution();
        const input = document.getElementById('squareone-formula-input');
        if (input) input.value = history.map(recordLabel).join(' ');
        renderSquareOne();
        setText('squareone-status', `已随机扰乱 ${rawHistoryLength} 步，等待求解`);
    };

    window.solveSquareOne = function () {
        const started = performance.now();
        if (isSolved()) {
            history = [];
            rawHistoryLength = 0;
            clearSolution();
        } else {
            lastSolution = history.slice().reverse().map(invertRecord);
            solutionIndex = 0;
            solutionElapsed = Math.max(1, Math.round(performance.now() - started));
        }
        renderSquareOne();
        if (lastSolution.length) {
            setText('squareone-status', `已生成规约解法：共 ${lastSolution.length} 步，下一步 ${recordLabel(lastSolution[0])}`);
        } else {
            setText('squareone-status', isSolved() ? '无需求解，当前 Square-1 已处于还原态' : '缺少可回溯的扰乱历史');
        }
    };

    window.browseSquareOneSolution = function (delta) {
        if (!lastSolution.length) return;

        if (delta > 0) {
            if (solutionIndex >= lastSolution.length) return;
            applyRecord(lastSolution[solutionIndex], { record: false, render: false });
            solutionIndex++;
        } else if (delta < 0) {
            if (solutionIndex <= 0) return;
            solutionIndex--;
            applyRecord(invertRecord(lastSolution[solutionIndex]), { record: false, render: false });
        }

        renderSquareOne();
        if (solutionIndex >= lastSolution.length && isSolved()) {
            history = [];
            rawHistoryLength = 0;
            updateSolutionPanel();
            setText('squareone-status', '解法已执行完成，Square-1 已还原');
        } else if (solutionIndex < lastSolution.length) {
            setText('squareone-status', `下一步 ${recordLabel(lastSolution[solutionIndex])}`);
        }
    };

    window.executeSquareOneSolution = function () {
        if (!lastSolution.length) window.solveSquareOne();
        if (!lastSolution.length) return;

        while (solutionIndex < lastSolution.length) {
            applyRecord(lastSolution[solutionIndex], { record: false, render: false });
            solutionIndex++;
        }
        history = [];
        rawHistoryLength = 0;
        renderSquareOne();
        setText('squareone-status', isSolved() ? '解法已执行完成，Square-1 已还原' : '解法执行完成，但状态仍未还原');
    };
})();
