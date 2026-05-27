// 空间类公共 UI 基座
// 放跨空间谜题复用的样式和轻量工具，具体谜题仍保留自己的棋盘/模型样式。
(function () {
    const BASE_STYLE_ID = 'space-puzzle-base-style';

    function injectStyles(id, cssText) {
        if (typeof document === 'undefined' || !id || document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = cssText;
        document.head.appendChild(style);
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function loadScripts(list, version = new Date().getTime()) {
        return Promise.all(list.map(src => new Promise(resolve => {
            const s = document.createElement('script');
            s.src = src + '?v=' + version;
            s.async = false;
            s.onload = s.onerror = resolve;
            document.body.appendChild(s);
        })));
    }

    const baseStyles = `
#spacepuzzle {
  width: 100%;
}

.space-workspace-container {
  display: none;
  padding-top: 4rem;
  margin-top: 2rem;
}

.space-workspace {
  display: none;
  gap: 2rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.space-control-panel {
  flex: 1;
  min-width: 320px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

.space-back-btn {
  align-self: flex-start;
  width: auto;
  padding: 4px 15px;
  font-size: 0.85rem;
  margin: 0 0 1.25rem;
  min-height: 32px;
}

.space-title {
  margin-bottom: 0.4rem;
  font-size: 1.8rem;
  white-space: nowrap;
}

.space-subtitle {
  color: rgba(64, 224, 255, 0.72);
  font-size: 0.95rem;
  letter-spacing: 2px;
  margin-bottom: 1.2rem;
}

.space-formula-input {
  width: 100%;
  min-height: 92px;
  resize: vertical;
  margin-bottom: 1.2rem;
}

.space-action-grid {
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.space-stats,
.space-solution-card,
.space-instructions {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.4);
  border-left: 3px solid var(--neon-cyan);
  border-radius: 4px;
}

.space-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.7rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.space-stats span {
  color: var(--neon-cyan);
  font-weight: 700;
  text-shadow: 0 0 5px var(--neon-cyan);
}

.space-solution-card {
  display: grid;
  gap: 0.8rem;
  margin-bottom: 1rem;
  overflow: hidden;
}

.space-solution-card .result {
  min-height: 46px;
  max-height: 92px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.space-instructions {
  opacity: 0.9;
  font-size: 0.85em;
}

.space-instructions h3 {
  margin-bottom: 0.8rem;
  color: var(--neon-cyan);
}

.space-instructions p {
  margin-bottom: 0.35rem;
}

.space-display-panel {
  flex: 2;
  min-width: 420px;
  padding: 2.4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(135deg, rgba(64, 224, 255, 0.06), rgba(255, 255, 255, 0.03)),
    rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.space-cube-hud {
  width: min(520px, 100%);
  display: flex;
  justify-content: center;
  padding: 0.75rem 1rem;
  margin-bottom: 1.8rem;
  border: 1px solid rgba(64, 224, 255, 0.25);
  color: rgba(255, 255, 255, 0.82);
  background: rgba(0, 0, 0, 0.28);
  box-shadow: inset 0 0 20px rgba(64, 224, 255, 0.08);
}

.cube-drag-hint {
  margin: -0.8rem 0 1.2rem;
  color: rgba(64, 224, 255, 0.62);
  font-size: 0.82rem;
  letter-spacing: 1px;
}

.cube-step-panel {
  display: none;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid rgba(64, 224, 255, 0.22);
  background: rgba(0, 0, 0, 0.28);
  width: 100%;
  box-sizing: border-box;
}

.cube-step-reader {
  display: grid;
  grid-template-columns: minmax(68px, 0.75fr) minmax(118px, 1.5fr) minmax(68px, 0.75fr);
  gap: 0.7rem;
  align-items: center;
}

.cube-step-reader .cyber-button {
  min-width: 0;
  padding: 0.5rem 0.35rem;
  width: 100%;
}

.cube-step-current {
  min-height: 54px;
  display: grid;
  place-items: center;
  text-align: center;
  border: 1px solid rgba(64, 224, 255, 0.18);
  background: rgba(64, 224, 255, 0.05);
  color: rgba(255, 255, 255, 0.86);
}

.cube-step-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.cube-step-bar span {
  display: block;
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, var(--neon-cyan), #ffffff);
  box-shadow: 0 0 12px var(--neon-cyan);
  transition: width 0.22s ease;
}

.cube-control-title {
  width: min(620px, 100%);
  margin-bottom: 0.8rem;
  color: rgba(255, 255, 255, 0.78);
  text-align: center;
  font-size: 0.86rem;
  letter-spacing: 2px;
}

.cube-move-spatial {
  width: min(620px, 100%);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-areas:
    ". top top ."
    "left front right back"
    ". bottom bottom .";
  gap: 0.7rem;
  align-items: stretch;
}

.cube-face-control {
  min-height: 96px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.55rem;
  padding: 0.7rem;
  border: 1px solid rgba(64, 224, 255, 0.18);
  border-top-color: var(--face-color);
  background:
    linear-gradient(135deg, rgba(64, 224, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(0, 0, 0, 0.28);
  box-shadow:
    inset 0 0 18px rgba(64, 224, 255, 0.08),
    0 0 18px rgba(0, 0, 0, 0.18);
}

.cube-face-control-top {
  grid-area: top;
}

.cube-face-control-left {
  grid-area: left;
}

.cube-face-control-front {
  grid-area: front;
}

.cube-face-control-right {
  grid-area: right;
}

.cube-face-control-back {
  grid-area: back;
}

.cube-face-control-bottom {
  grid-area: bottom;
}

.cube-face-control-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.cube-face-control-label span {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: #061016;
  background: var(--face-color);
  border-radius: 4px;
  font-weight: 900;
  box-shadow: 0 0 14px rgba(64, 224, 255, 0.24);
}

.cube-face-control-label small {
  color: rgba(255, 255, 255, 0.64);
  font-size: 0.72rem;
  white-space: nowrap;
}

.cube-face-control-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.cube-move-chip {
  min-width: 0;
  min-height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.86);
  background: rgba(0, 0, 0, 0.32);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.cube-move-chip:hover {
  transform: translateY(-2px);
  border-color: var(--face-color);
  background: rgba(64, 224, 255, 0.12);
  box-shadow: 0 0 12px rgba(64, 224, 255, 0.24);
}

@media (max-width: 760px) {
  .space-control-panel,
  .space-display-panel {
    min-width: 0;
    width: 100%;
    padding: 1.25rem;
  }

  .space-title {
    font-size: 1.25rem;
    white-space: normal;
  }

  .space-action-grid,
  .space-stats {
    grid-template-columns: 1fr;
  }

  .cube-step-reader {
    grid-template-columns: 1fr;
  }

  .cube-move-spatial {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      "top top"
      "left front"
      "right back"
      "bottom bottom";
  }

  .cube-face-control {
    min-height: 86px;
    padding: 0.6rem;
  }

  .cube-face-control-actions {
    gap: 0.35rem;
  }
}
`;

    window.SpacePuzzleUI = {
        injectStyles,
        setText,
        loadScripts
    };

    injectStyles(BASE_STYLE_ID, baseStyles);
})();
