(function () {
    const RUBIKS_CLOCK_STYLE_ID = 'rubiks-clock-inline-style';

    function injectRubiksClockStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById(RUBIKS_CLOCK_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = RUBIKS_CLOCK_STYLE_ID;
        style.textContent = `
.rubiks-clock-control {
  min-width: 360px;
}

.clock-action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.clock-pattern-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 1rem;
}

.clock-pattern-btn {
  min-width: 0;
}

.clock-pattern-btn.active {
  border-color: rgba(255, 218, 89, 0.82);
  background: rgba(255, 218, 89, 0.11);
  box-shadow:
    inset 0 0 16px rgba(255, 218, 89, 0.1),
    0 0 18px rgba(255, 218, 89, 0.22);
}

.clock-wheel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin-bottom: 1.2rem;
}

.clock-wheel-card {
  min-width: 0;
  padding: 0.85rem;
  border: 1px solid rgba(64, 224, 255, 0.18);
  background:
    linear-gradient(135deg, rgba(64, 224, 255, 0.06), rgba(255, 218, 89, 0.05)),
    rgba(0, 0, 0, 0.26);
  border-radius: 6px;
}

.clock-wheel-title {
  margin-bottom: 0.65rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.82rem;
  font-weight: 700;
}

.clock-wheel-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}

.clock-wheel-actions button {
  min-width: 0;
  min-height: 34px;
  border: 1px solid rgba(64, 224, 255, 0.28);
  color: rgba(255, 255, 255, 0.86);
  background: rgba(4, 18, 24, 0.82);
  border-radius: 4px;
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.clock-wheel-actions button:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 218, 89, 0.8);
  box-shadow: 0 0 14px rgba(255, 218, 89, 0.18);
}

.rubiks-clock-panel {
  min-width: 460px;
  background:
    radial-gradient(circle at 20% 16%, rgba(255, 218, 89, 0.1), transparent 28%),
    linear-gradient(135deg, rgba(64, 224, 255, 0.06), rgba(255, 107, 138, 0.06)),
    rgba(0, 0, 0, 0.22);
}

.rubiks-clock-board {
  width: min(820px, 100%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;
  align-items: start;
}

.rubiks-clock-side {
  min-width: 0;
  padding: 1rem;
  border: 1px solid rgba(64, 224, 255, 0.2);
  background:
    linear-gradient(145deg, rgba(2, 12, 18, 0.96), rgba(8, 24, 32, 0.78)),
    rgba(0, 0, 0, 0.34);
  box-shadow:
    inset 0 0 24px rgba(64, 224, 255, 0.08),
    0 0 26px rgba(0, 0, 0, 0.22);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.rubiks-clock-side.active {
  border-color: rgba(255, 218, 89, 0.72);
  box-shadow:
    inset 0 0 24px rgba(255, 218, 89, 0.1),
    0 0 22px rgba(255, 218, 89, 0.15);
}

.rubiks-clock-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  margin-bottom: 0.85rem;
  color: rgba(255, 255, 255, 0.84);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 0.9rem;
  font-weight: 800;
}

.rubiks-clock-focus-btn {
  min-width: 72px;
  min-height: 28px;
  padding: 0 0.55rem;
  border: 1px solid rgba(64, 224, 255, 0.28);
  color: rgba(255, 255, 255, 0.72);
  background: rgba(0, 0, 0, 0.32);
  border-radius: 4px;
  cursor: pointer;
}

.rubiks-clock-side.active .rubiks-clock-focus-btn {
  border-color: rgba(255, 218, 89, 0.64);
  color: #ffda59;
}

.rubiks-clock-grid {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 0.68rem;
  padding: 0.72rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at 50% 50%, rgba(64, 224, 255, 0.06), transparent 58%),
    rgba(0, 0, 0, 0.22);
}

.rubiks-clock-dial {
  position: relative;
  min-width: 0;
  min-height: 0;
  border-radius: 50%;
  border: 2px solid rgba(64, 224, 255, 0.32);
  background:
    radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.22), transparent 22%),
    radial-gradient(circle at center, rgba(255, 218, 89, 0.12), rgba(2, 12, 18, 0.94) 64%);
  box-shadow:
    inset 0 0 18px rgba(0, 0, 0, 0.36),
    0 0 13px rgba(64, 224, 255, 0.12);
}

.rubiks-clock-dial.solved {
  border-color: rgba(255, 218, 89, 0.54);
}

.rubiks-clock-hand {
  position: absolute;
  left: calc(50% - 2px);
  top: 16%;
  width: 4px;
  height: 36%;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffda59, #ff6b8a);
  box-shadow: 0 0 10px rgba(255, 218, 89, 0.45);
  transform: rotate(var(--clock-angle, 0deg));
  transform-origin: 50% 94%;
  transition: transform 0.16s ease;
}

.rubiks-clock-hand::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  transform: translateX(-50%);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.55);
}

.rubiks-clock-value {
  position: absolute;
  left: 50%;
  bottom: 12%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.82);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: clamp(0.66rem, 1.7vw, 0.95rem);
  font-weight: 900;
}

.rubiks-clock-tick {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.44);
}

.rubiks-clock-tick-12 {
  top: 9%;
  left: calc(50% - 2px);
}

.rubiks-clock-tick-3 {
  top: calc(50% - 2px);
  right: 9%;
}

.rubiks-clock-tick-6 {
  bottom: 9%;
  left: calc(50% - 2px);
}

.rubiks-clock-tick-9 {
  top: calc(50% - 2px);
  left: 9%;
}

.rubiks-clock-pin {
  position: absolute;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid rgba(64, 224, 255, 0.5);
  color: rgba(255, 255, 255, 0.86);
  background: rgba(3, 16, 22, 0.94);
  box-shadow: 0 0 14px rgba(64, 224, 255, 0.2);
  cursor: pointer;
  transform: translate(-50%, -50%);
  z-index: 3;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.rubiks-clock-pin span {
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0;
}

.rubiks-clock-pin.up {
  border-color: rgba(255, 218, 89, 0.94);
  color: #061016;
  background: linear-gradient(135deg, #ffda59, #40e0ff);
  box-shadow:
    0 0 14px rgba(255, 218, 89, 0.36),
    0 0 9px rgba(64, 224, 255, 0.24);
}

.rubiks-clock-pin:hover {
  transform: translate(-50%, -50%) scale(1.06);
}

.rubiks-clock-pin-ul {
  left: 35%;
  top: 35%;
}

.rubiks-clock-pin-ur {
  left: 65%;
  top: 35%;
}

.rubiks-clock-pin-dl {
  left: 35%;
  top: 65%;
}

.rubiks-clock-pin-dr {
  left: 65%;
  top: 65%;
}

#clock-step-counter {
  color: #ffda59;
  font-weight: 800;
  text-shadow: 0 0 6px rgba(255, 218, 89, 0.86);
}

#clock-step-move {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.76);
  word-break: break-word;
}

@media (max-width: 980px) {
  .rubiks-clock-board {
    grid-template-columns: 1fr;
    width: min(460px, 100%);
  }
}

@media (max-width: 760px) {
  .rubiks-clock-control {
    min-width: 0;
    width: 100%;
    padding: 1.25rem;
  }

  .clock-action-grid,
  .clock-wheel-grid,
  .clock-pattern-row {
    grid-template-columns: 1fr;
  }

  .rubiks-clock-grid {
    gap: 0.42rem;
    padding: 0.5rem;
  }

  .rubiks-clock-pin {
    width: 32px;
    height: 32px;
  }
}
`;
        document.head.appendChild(style);
    }

    injectRubiksClockStyles();

    const PIN_KEYS = ['UL', 'UR', 'DL', 'DR'];
    const SIDE_NAMES = { front: '正面', back: '背面' };
    const SIDE_SHORT = { front: 'F', back: 'B' };
    const PIN_LABELS = { UL: '左上', UR: '右上', DL: '左下', DR: '右下' };
    const MIRROR_PIN = { UL: 'UR', UR: 'UL', DL: 'DR', DR: 'DL' };
    const CORNER_INDEX = { UL: 0, UR: 2, DL: 6, DR: 8 };
    const PIN_CELLS = {
        UL: [0, 1, 3, 4],
        UR: [1, 2, 4, 5],
        DL: [3, 4, 6, 7],
        DR: [4, 5, 7, 8]
    };
    const PIN_PATTERNS = {
        UL: ['UL'],
        UR: ['UR'],
        DL: ['DL'],
        DR: ['DR'],
        U: ['UL', 'UR'],
        R: ['UR', 'DR'],
        D: ['DL', 'DR'],
        L: ['UL', 'DL'],
        ALL: ['UL', 'UR', 'DL', 'DR']
    };
    const PATTERN_LABELS = {
        UL: 'UL',
        UR: 'UR',
        DL: 'DL',
        DR: 'DR',
        U: '上排',
        R: '右列',
        D: '下排',
        L: '左列',
        ALL: '全盘'
    };
    const WHEEL_FOR_PATTERN = {
        UL: 'UL',
        UR: 'UR',
        DL: 'DL',
        DR: 'DR',
        U: 'UR',
        R: 'UR',
        D: 'DR',
        L: 'UL',
        ALL: 'UR'
    };
    const SCRAMBLE_SEQUENCE = ['UR', 'DR', 'DL', 'UL', 'U', 'R', 'D', 'L', 'ALL', 'y2', 'U', 'R', 'D', 'L', 'ALL'];

    const PIN_GRAPH = PIN_KEYS.reduce((graph, pin) => {
        graph[pin] = PIN_KEYS.filter(other => other !== pin && PIN_CELLS[pin].some(cell => PIN_CELLS[other].includes(cell)));
        return graph;
    }, {});

    let faces = createSolvedFaces();
    let physicalPins = createPhysicalPins(false);
    let activeSide = 'front';
    let history = [];
    let rawHistoryLength = 0;
    let lastSolution = [];
    let solutionIndex = 0;
    let solutionElapsed = 0;

    function createSolvedFaces() {
        return {
            front: Array(9).fill(0),
            back: Array(9).fill(0)
        };
    }

    function createPhysicalPins(value) {
        return Object.fromEntries(PIN_KEYS.map(pin => [pin, Boolean(value)]));
    }

    function normalizeHour(value) {
        return ((value % 12) + 12) % 12;
    }

    function displayHour(value) {
        const hour = normalizeHour(value);
        return hour === 0 ? '12' : String(hour);
    }

    function getOtherSide(side) {
        return side === 'front' ? 'back' : 'front';
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function getVisiblePins(side = activeSide) {
        const pins = {};
        PIN_KEYS.forEach(pin => {
            pins[pin] = side === 'front'
                ? physicalPins[pin]
                : !physicalPins[MIRROR_PIN[pin]];
        });
        return pins;
    }

    function setVisiblePins(pinList, side = activeSide) {
        const wanted = new Set(pinList || []);
        PIN_KEYS.forEach(pin => {
            if (side === 'front') {
                physicalPins[pin] = wanted.has(pin);
            } else {
                physicalPins[MIRROR_PIN[pin]] = !wanted.has(pin);
            }
        });
    }

    function setVisiblePinsFromMap(pinMap, side = activeSide) {
        const wanted = PIN_KEYS.filter(pin => pinMap[pin]);
        setVisiblePins(wanted, side);
    }

    function getPinListFromMap(pinMap) {
        return PIN_KEYS.filter(pin => pinMap[pin]);
    }

    function getPatternFromPins(pinMap) {
        const activePins = getPinListFromMap(pinMap);
        const key = Object.keys(PIN_PATTERNS).find(pattern => {
            const patternPins = PIN_PATTERNS[pattern];
            return patternPins.length === activePins.length && patternPins.every(pin => activePins.includes(pin));
        });
        return key || (activePins.length ? activePins.join('+') : 'DOWN');
    }

    function getAffectedCells(side, selectedPin) {
        const pins = getVisiblePins(side);
        if (!pins[selectedPin]) return [CORNER_INDEX[selectedPin]];

        const queue = [selectedPin];
        const seen = new Set([selectedPin]);
        while (queue.length) {
            const current = queue.shift();
            PIN_GRAPH[current].forEach(next => {
                if (pins[next] && !seen.has(next)) {
                    seen.add(next);
                    queue.push(next);
                }
            });
        }

        return Array.from(new Set(Array.from(seen).flatMap(pin => PIN_CELLS[pin]))).sort((a, b) => a - b);
    }

    function addToFace(side, cells, amount) {
        cells.forEach(index => {
            faces[side][index] = normalizeHour(faces[side][index] + amount);
        });
    }

    function formatTurnAmount(amount) {
        const value = Math.abs(amount) % 12;
        return `${value}${amount >= 0 ? '+' : '-'}`;
    }

    function formatPatternMove(pattern, amount, side = activeSide) {
        return `${SIDE_SHORT[side]}:${pattern}${formatTurnAmount(amount)}`;
    }

    function formatManualMove(selectedPin, amount, pins, side = activeSide) {
        const pattern = getPatternFromPins(pins);
        return `${SIDE_SHORT[side]}:${selectedPin}${formatTurnAmount(amount)} [${pattern}]`;
    }

    function makeHistoryRecord(side, selectedPin, amount, pins, label) {
        return {
            side,
            selectedPin,
            amount,
            pins: getPinListFromMap(pins),
            label
        };
    }

    function clearSolution() {
        lastSolution = [];
        solutionIndex = 0;
        solutionElapsed = 0;
    }

    function applyClockTurn(selectedPin, amount, options = {}) {
        const turnAmount = normalizeSignedAmount(amount);
        if (!PIN_KEYS.includes(selectedPin) || turnAmount === 0) return false;

        const side = options.side || activeSide;
        const pinsBeforeTurn = getVisiblePins(side);
        const otherSide = getOtherSide(side);
        const otherPin = MIRROR_PIN[selectedPin];

        addToFace(side, getAffectedCells(side, selectedPin), turnAmount);
        addToFace(otherSide, getAffectedCells(otherSide, otherPin), -turnAmount);

        if (options.record) {
            history.push(makeHistoryRecord(
                side,
                selectedPin,
                turnAmount,
                pinsBeforeTurn,
                options.label || formatManualMove(selectedPin, turnAmount, pinsBeforeTurn, side)
            ));
            rawHistoryLength++;
            clearSolution();
        }

        if (options.makeActive !== false) activeSide = side;
        return true;
    }

    function normalizeSignedAmount(amount) {
        const numeric = Number(amount) || 0;
        let normalized = numeric % 12;
        if (normalized > 6) normalized -= 12;
        if (normalized < -6) normalized += 12;
        return normalized;
    }

    function applyPatternMove(pattern, amount, options = {}) {
        if (!PIN_PATTERNS[pattern]) return false;
        const side = options.side || activeSide;
        const turnAmount = normalizeSignedAmount(amount);
        setVisiblePins(PIN_PATTERNS[pattern], side);

        if (turnAmount !== 0) {
            applyClockTurn(WHEEL_FOR_PATTERN[pattern], turnAmount, {
                side,
                record: options.record,
                makeActive: options.makeActive,
                label: options.label || formatPatternMove(pattern, turnAmount, side)
            });
        }

        if (options.autoDrop !== false) setVisiblePins([], side);
        return true;
    }

    function applySolutionRecord(record, amountOverride) {
        const amount = typeof amountOverride === 'number' ? amountOverride : record.amount;
        setVisiblePins(record.pins, record.side);
        applyClockTurn(record.selectedPin, amount, {
            side: record.side,
            record: false,
            makeActive: true
        });
        setVisiblePins([], record.side);
    }

    function parseClockFormula(formula) {
        const source = String(formula || '')
            .toUpperCase()
            .replace(/[，,;；]/g, ' ')
            .replace(/[−–—]/g, '-')
            .replace(/\s+/g, '');
        const tokens = [];
        let index = 0;
        const tokenRegex = /(ALL|UR|DR|DL|UL|U|R|D|L)(\d{1,2})([+-])|Y2/g;

        while (index < source.length) {
            tokenRegex.lastIndex = index;
            const match = tokenRegex.exec(source);
            if (!match || match.index !== index) {
                throw new Error('公式格式错误：支持 UR3+、D2-、ALL4+ 与 y2');
            }

            if (match[0] === 'Y2') {
                tokens.push({ type: 'flip' });
            } else {
                const value = Number(match[2]);
                if (!Number.isFinite(value) || value > 11) {
                    throw new Error('转动步数必须在 0 到 11 之间');
                }
                tokens.push({
                    type: 'move',
                    pattern: match[1],
                    amount: value * (match[3] === '+' ? 1 : -1)
                });
            }
            index = tokenRegex.lastIndex;
        }

        return tokens;
    }

    function applyClockTokens(tokens, options = {}) {
        tokens.forEach(token => {
            if (token.type === 'flip') {
                activeSide = getOtherSide(activeSide);
                setVisiblePins([], activeSide);
                return;
            }
            applyPatternMove(token.pattern, token.amount, {
                record: options.record,
                autoDrop: true,
                makeActive: true
            });
        });
    }

    function formatClockToken(pattern, amount) {
        return `${pattern}${formatTurnAmount(amount)}`;
    }

    function makeRandomClockToken(pattern) {
        const magnitude = Math.floor(Math.random() * 6);
        const sign = Math.random() < 0.5 ? -1 : 1;
        return {
            type: 'move',
            pattern,
            amount: magnitude * sign,
            text: formatClockToken(pattern, magnitude * sign)
        };
    }

    function isSolved() {
        return faces.front.every(value => value === 0) && faces.back.every(value => value === 0);
    }

    function renderClockDial(side, index) {
        const value = faces[side][index];
        const angle = value * 30;
        return `<div class="rubiks-clock-dial ${value === 0 ? 'solved' : ''}">
            <span class="rubiks-clock-tick rubiks-clock-tick-12"></span>
            <span class="rubiks-clock-tick rubiks-clock-tick-3"></span>
            <span class="rubiks-clock-tick rubiks-clock-tick-6"></span>
            <span class="rubiks-clock-tick rubiks-clock-tick-9"></span>
            <span class="rubiks-clock-hand" style="--clock-angle:${angle}deg"></span>
            <span class="rubiks-clock-value">${displayHour(value)}</span>
        </div>`;
    }

    function renderClockSide(side) {
        const pins = getVisiblePins(side);
        const activeClass = side === activeSide ? ' active' : '';
        const dials = faces[side].map((_, index) => renderClockDial(side, index)).join('');
        const pinButtons = PIN_KEYS.map(pin => {
            const stateClass = pins[pin] ? ' up' : ' down';
            return `<button class="rubiks-clock-pin rubiks-clock-pin-${pin.toLowerCase()}${stateClass}" type="button" onclick="window.focusRubiksClockSide('${side}'); window.toggleRubiksClockPin('${pin}')" title="${PIN_LABELS[pin]}针">
                <span>${pin}</span>
            </button>`;
        }).join('');

        return `<div class="rubiks-clock-side${activeClass}">
            <div class="rubiks-clock-side-head">
                <span>${SIDE_NAMES[side]}</span>
                <button class="rubiks-clock-focus-btn" type="button" onclick="window.focusRubiksClockSide('${side}')">${side === activeSide ? '操作中' : '操作此面'}</button>
            </div>
            <div class="rubiks-clock-grid">
                ${dials}
                ${pinButtons}
            </div>
        </div>`;
    }

    function renderClockBoards() {
        const board = document.getElementById('rubiks-clock-board');
        if (!board) return;
        board.innerHTML = renderClockSide('front') + renderClockSide('back');
    }

    function updatePatternButtons() {
        const pattern = getPatternFromPins(getVisiblePins(activeSide));
        document.querySelectorAll('[data-clock-pattern]').forEach(button => {
            button.classList.toggle('active', button.dataset.clockPattern === pattern);
        });
    }

    function updateSolutionPanel() {
        setText('clock-history-count', String(rawHistoryLength));
        setText('clock-solution-count', String(lastSolution.length));
        setText('clock-time-elapsed', String(solutionElapsed));

        const output = document.getElementById('clock-solution-output');
        if (output) {
            output.textContent = lastSolution.length
                ? lastSolution.map(record => record.label).join(' ')
                : '等待生成解法。';
        }

        const panel = document.getElementById('clock-step-panel');
        const counter = document.getElementById('clock-step-counter');
        const move = document.getElementById('clock-step-move');
        const progress = document.getElementById('clock-step-progress');
        if (panel) panel.style.display = lastSolution.length ? 'grid' : 'none';
        if (counter) counter.textContent = `${solutionIndex} / ${lastSolution.length}`;
        if (move) {
            move.textContent = solutionIndex >= lastSolution.length
                ? (lastSolution.length ? '执行完成' : '等待求解')
                : lastSolution[solutionIndex].label;
        }
        if (progress) {
            const percent = lastSolution.length ? (solutionIndex / lastSolution.length) * 100 : 0;
            progress.style.width = `${percent}%`;
        }
    }

    function renderRubiksClock() {
        renderClockBoards();
        updatePatternButtons();
        updateSolutionPanel();
        setText('clock-active-side', SIDE_NAMES[activeSide]);
        setText('clock-active-pattern', getPatternFromPins(getVisiblePins(activeSide)));
        setText('clock-state-summary', isSolved() ? '已还原' : '待还原');
        setText('clock-status', isSolved() ? 'Rubik\'s Clock 处于还原态' : 'Rubik\'s Clock 已扰乱，等待求解');
    }

    function resetState() {
        faces = createSolvedFaces();
        physicalPins = createPhysicalPins(false);
        activeSide = 'front';
        history = [];
        rawHistoryLength = 0;
        clearSolution();
    }

    function getWorkspaceHTML() {
        const patternButtons = ['UR', 'DR', 'DL', 'UL', 'U', 'R', 'D', 'L', 'ALL'].map(pattern => {
            return `<button class="cyber-button clock-pattern-btn" data-clock-pattern="${pattern}" type="button" onclick="window.setRubiksClockPinPattern('${pattern}')"><span class="cyber-button__tag">${PATTERN_LABELS[pattern]}</span></button>`;
        }).join('');
        const wheelCards = PIN_KEYS.map(pin => {
            return `<div class="clock-wheel-card">
                <div class="clock-wheel-title">${PIN_LABELS[pin]}齿轮</div>
                <div class="clock-wheel-actions">
                    <button type="button" onclick="window.turnRubiksClockWheel('${pin}', -3)">-3</button>
                    <button type="button" onclick="window.turnRubiksClockWheel('${pin}', -1)">-1</button>
                    <button type="button" onclick="window.turnRubiksClockWheel('${pin}', 1)">+1</button>
                    <button type="button" onclick="window.turnRubiksClockWheel('${pin}', 3)">+3</button>
                </div>
            </div>`;
        }).join('');

        return `<div id="rubiksclock-workspace" class="space-workspace">
            <div class="grid-container card space-control-panel rubiks-clock-control">
                <button class="cyber-button space-back-btn" onclick="window.backSpacePuzzle()"><span class="cyber-button__tag">← 返回空间类</span></button>
                <h2 class="space-title">Rubik's Clock</h2>
                <div class="space-subtitle">双面时钟 / 针位联动 / 历史反向求解</div>

                <textarea id="clock-formula-input" class="space-formula-input" placeholder="输入公式，例如：UR4+ DR3+ DL5- UL3+ U2- R3- D1+ L0+ ALL4- y2 U4+ R0+ D4+ L4- ALL2-"></textarea>

                <div class="space-action-grid clock-action-grid">
                    <button class="cyber-button" onclick="window.applyRubiksClockFormula()"><span class="cyber-button__tag">应用公式</span></button>
                    <button class="cyber-button" onclick="window.scrambleRubiksClock()"><span class="cyber-button__tag">随机扰乱</span></button>
                    <button class="cyber-button" onclick="window.resetRubiksClock()"><span class="cyber-button__tag">重置时钟</span></button>
                    <button class="cyber-button" onclick="window.flipRubiksClockView()"><span class="cyber-button__tag">翻转视角</span></button>
                    <button class="cyber-button" onclick="window.setRubiksClockPinPattern('DOWN')"><span class="cyber-button__tag">针位全下</span></button>
                    <button class="cyber-button cyber-glow" onclick="window.solveRubiksClock()"><span class="cyber-button__tag">规约求解</span></button>
                </div>

                <div class="clock-pattern-row">
                    ${patternButtons}
                </div>

                <div class="clock-wheel-grid">
                    ${wheelCards}
                </div>

                <div class="space-stats">
                    <div>操作面: <span id="clock-active-side">正面</span></div>
                    <div>针位: <span id="clock-active-pattern">DOWN</span></div>
                    <div>状态: <span id="clock-state-summary">已还原</span></div>
                    <div>历史步数: <span id="clock-history-count">0</span></div>
                    <div>解法步数: <span id="clock-solution-count">0</span></div>
                    <div>算力耗时: <span id="clock-time-elapsed">0</span> ms</div>
                </div>

                <div class="space-solution-card">
                    <div class="cube-step-panel clock-step-panel" id="clock-step-panel">
                        <div class="cube-step-reader">
                            <button class="cyber-button" onclick="window.browseRubiksClockSolution(-1)"><span class="cyber-button__tag">上一步</span></button>
                            <div class="cube-step-current">
                                <div id="clock-step-counter">0 / 0</div>
                                <div id="clock-step-move">等待求解</div>
                            </div>
                            <button class="cyber-button" onclick="window.browseRubiksClockSolution(1)"><span class="cyber-button__tag">下一步</span></button>
                        </div>
                        <div class="cube-step-bar"><span id="clock-step-progress"></span></div>
                    </div>
                    <div class="result" id="clock-solution-output">等待生成解法。</div>
                </div>

                <div class="instructions space-instructions">
                    <h3>系统规则:</h3>
                    <p>支持 WCA 风格记号：UR、DR、DL、UL、U、R、D、L、ALL，加 0-11 和 +/-，可用 y2 翻面。</p>
                    <p>手动模式先选择针位，再用四个角齿轮转动；正反面会按针位联动。</p>
                    <p>求解会反向执行本模块记录的扰乱历史，适合随机扰乱、公式输入和手动操作后的复原。</p>
                </div>
            </div>

            <div class="grid-container card space-display-panel rubiks-clock-panel">
                <div class="space-cube-hud">
                    <span id="clock-status">Rubik's Clock 处于还原态</span>
                </div>
                <div id="rubiks-clock-board" class="rubiks-clock-board"></div>
            </div>
        </div>`;
    }

    function initRubiksClock() {
        resetState();
        renderRubiksClock();
    }

    function openRubiksClockWorkspace() {
        const workspace = document.getElementById('rubiksclock-workspace');
        if (!workspace) return;
        workspace.style.display = 'flex';
        renderRubiksClock();
    }

    window.spacePuzzleModules = (window.spacePuzzleModules || []).filter(module => module.id !== 'rubiksclock');
    window.spacePuzzleModules.push({
        id: 'rubiksclock',
        getListButton() {
            return `<button class="logic-btn" type="button" onclick="window.openSpacePuzzle('rubiksclock')">Rubik's Clock</button>`;
        },
        getWorkspaceHTML: getWorkspaceHTML,
        init: initRubiksClock,
        open: openRubiksClockWorkspace
    });

    window.focusRubiksClockSide = function (side) {
        if (side !== 'front' && side !== 'back') return;
        activeSide = side;
        renderRubiksClock();
    };

    window.setRubiksClockPinPattern = function (pattern) {
        if (pattern === 'DOWN') {
            setVisiblePins([], activeSide);
        } else if (PIN_PATTERNS[pattern]) {
            setVisiblePins(PIN_PATTERNS[pattern], activeSide);
        }
        renderRubiksClock();
    };

    window.toggleRubiksClockPin = function (pin) {
        if (!PIN_KEYS.includes(pin)) return;
        const pins = getVisiblePins(activeSide);
        pins[pin] = !pins[pin];
        setVisiblePinsFromMap(pins, activeSide);
        renderRubiksClock();
    };

    window.turnRubiksClockWheel = function (pin, amount) {
        if (!PIN_KEYS.includes(pin)) return;
        const pins = getVisiblePins(activeSide);
        const changed = applyClockTurn(pin, amount, {
            side: activeSide,
            record: true,
            label: formatManualMove(pin, normalizeSignedAmount(amount), pins, activeSide)
        });
        if (changed) renderRubiksClock();
    };

    window.flipRubiksClockView = function () {
        activeSide = getOtherSide(activeSide);
        setVisiblePins([], activeSide);
        renderRubiksClock();
    };

    window.applyRubiksClockFormula = function () {
        try {
            const input = document.getElementById('clock-formula-input');
            const tokens = parseClockFormula(input ? input.value : '');
            applyClockTokens(tokens, { record: true });
            renderRubiksClock();
        } catch (error) {
            setText('clock-status', error.message);
        }
    };

    window.scrambleRubiksClock = function () {
        resetState();
        const tokens = SCRAMBLE_SEQUENCE.map(pattern => pattern === 'y2' ? { type: 'flip', text: 'y2' } : makeRandomClockToken(pattern));
        const formula = tokens.map(token => token.text).join(' ');
        const input = document.getElementById('clock-formula-input');
        if (input) input.value = formula;
        applyClockTokens(tokens, { record: true });

        if (isSolved()) {
            applyPatternMove('UR', 3, { record: true, autoDrop: true });
        }

        activeSide = 'front';
        setVisiblePins([], activeSide);
        renderRubiksClock();
    };

    window.resetRubiksClock = function () {
        resetState();
        const input = document.getElementById('clock-formula-input');
        if (input) input.value = '';
        renderRubiksClock();
    };

    window.solveRubiksClock = function () {
        const started = performance.now();
        if (isSolved()) {
            history = [];
            rawHistoryLength = 0;
            clearSolution();
        } else {
            lastSolution = history.slice().reverse().map(record => ({
                side: record.side,
                selectedPin: record.selectedPin,
                amount: -record.amount,
                pins: record.pins.slice(),
                label: `${SIDE_SHORT[record.side]}:${record.selectedPin}${formatTurnAmount(-record.amount)} [${record.pins.join('+') || 'DOWN'}]`
            }));
            solutionIndex = 0;
            solutionElapsed = Math.max(1, Math.round(performance.now() - started));
        }

        renderRubiksClock();
        if (lastSolution.length) {
            setText('clock-status', `已生成规约解法：共 ${lastSolution.length} 步，下一步 ${lastSolution[0].label}`);
        } else {
            setText('clock-status', isSolved() ? '无需求解，当前时钟已处于还原态' : '缺少可回溯的扰乱历史');
        }
    };

    window.browseRubiksClockSolution = function (delta) {
        if (!lastSolution.length) return;

        if (delta > 0) {
            if (solutionIndex >= lastSolution.length) return;
            applySolutionRecord(lastSolution[solutionIndex]);
            solutionIndex++;
        } else if (delta < 0) {
            if (solutionIndex <= 0) return;
            solutionIndex--;
            applySolutionRecord(lastSolution[solutionIndex], -lastSolution[solutionIndex].amount);
        }

        renderRubiksClock();
        if (solutionIndex >= lastSolution.length && isSolved()) {
            history = [];
            rawHistoryLength = 0;
            updateSolutionPanel();
            setText('clock-status', '解法已执行完成，时钟已还原');
        } else if (solutionIndex < lastSolution.length) {
            setText('clock-status', `下一步 ${lastSolution[solutionIndex].label}`);
        }
    };

    window.executeRubiksClockSolution = function () {
        if (!lastSolution.length) window.solveRubiksClock();
        while (solutionIndex < lastSolution.length) {
            applySolutionRecord(lastSolution[solutionIndex]);
            solutionIndex++;
        }
        history = [];
        rawHistoryLength = 0;
        renderRubiksClock();
    };
})();
