/**
 * 0_logic_ui.js — 逻辑谜题 UI 公共层
 * 提供 HTML 片段工厂函数，消除 14 个 *_ui.js 文件中的结构性重复。
 * 必须在所有 *_ui.js 之前加载。
 */
window.LogicUI = (function () {

    /* ── 返回按钮 ── */
    function backButton(workspaceId) {
        return `<button class="cyber-button" style="margin-top:-55px;align-self:flex-start;width:auto;padding:4px 15px;font-size:0.85rem;margin-bottom:1rem;min-height:32px;" onclick="document.getElementById('logic-workspace-container').style.display='none';document.getElementById('logic-list-container').style.display='';document.getElementById('${workspaceId}').style.display='none';"><span class="cyber-button__tag">← 返回列表</span></button>`;
    }

    /* ── 统计面板 ── */
    function statsPanel(prefix, opts) {
        const o = Object.assign({ countLabel: '解记录数', timeLabel: '算力耗时', accent: '#00e5ff' }, opts);
        return `<div class="stats" style="padding:1rem;background:rgba(0,0,0,0.4);border-left:3px solid ${o.accent};border-radius:4px;"><div style="margin-bottom:0.5rem;font-size:0.95rem;">${o.countLabel}: <span id="${prefix}-solutionsCount" style="color:${o.accent};font-weight:bold;text-shadow:0 0 5px ${o.accent};font-size:1.1rem;">0</span></div><div style="font-size:0.95rem;">${o.timeLabel}: <span id="${prefix}-timeElapsed" style="color:${o.accent};font-weight:bold;text-shadow:0 0 5px ${o.accent};font-size:1.1rem;">0</span> ms</div></div>`;
    }

    /* ── 翻解导航 ── */
    function solutionNav(prefix, showFn, opts) {
        const o = Object.assign({ accent: 'var(--neon-cyan)' }, opts);
        return `<div id="${prefix}-solution-nav" style="display:none;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.4);padding:12px;border-radius:4px;margin-top:1rem;border:1px solid ${o.accent};"><button class="cyber-button" style="min-width:60px;padding:6px 10px;" onclick="window.${showFn} && window.${showFn}(-1)"><span class="cyber-button__tag">◀ <span style="font-size:0.8rem">上一解</span></span></button><span id="${prefix}-solution-counter" style="font-weight:bold;font-size:1.2rem;color:${o.accent};text-shadow:0 0 5px ${o.accent};">1 / 1</span><button class="cyber-button" style="min-width:60px;padding:6px 10px;" onclick="window.${showFn} && window.${showFn}(1)"><span class="cyber-button__tag"><span style="font-size:0.8rem">下一解</span> ▶</span></button></div>`;
    }

    /* ── 操作说明 ── */
    function instructions(items, opts) {
        const o = Object.assign({ accent: 'var(--neon-cyan)', title: '系统法则' }, opts);
        const body = items.map(t => `<p style="margin-bottom:0.3rem;">${t}</p>`).join('');
        return `<div class="instructions" style="margin-top:1.5rem;padding:1rem;background:rgba(0,0,0,0.4);border-left:3px solid ${o.accent};border-radius:4px;opacity:0.9;font-size:0.85em;"><h3 style="margin-bottom:0.8rem;color:${o.accent};">${o.title}:</h3>${body}</div>`;
    }

    /* ── 标题行 ── */
    function title(text, opts) {
        const o = Object.assign({ color: 'var(--neon-cyan)' }, opts);
        return `<h2 class="neon-title" style="color:${o.color};margin-bottom:1.5rem;font-size:1.8rem;white-space:nowrap;">${text}</h2>`;
    }

    /* ── 行列输入 (双列) ── */
    function sizeInputs(rowId, colId, opts) {
        const o = Object.assign({ rowVal: 7, colVal: 7, rowMin: 3, colMin: 3, rowMax: 15, colMax: 15 }, opts);
        return `<div style="margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:10px;"><input type="number" id="${rowId}" placeholder="行数" value="${o.rowVal}" min="${o.rowMin}" max="${o.rowMax}" style="width:100%;"><input type="number" id="${colId}" placeholder="列数" value="${o.colVal}" min="${o.colMin}" max="${o.colMax}" style="width:100%;"></div>`;
    }

    /* ── 单尺寸输入 ── */
    function singleSizeInput(id, opts) {
        const o = Object.assign({ val: 8, min: 3, max: 20, placeholder: '网格大小' }, opts);
        return `<div style="margin-bottom:1.5rem;"><input type="number" id="${id}" placeholder="${o.placeholder}" value="${o.val}" min="${o.min}" max="${o.max}" style="width:100%;"></div>`;
    }

    /* ── 4 按钮动作栏 ── */
    function actionGrid4(btns) {
        // btns = [{ label, onclick, id?, glow? }]
        const cells = btns.map(b => {
            const cls = b.glow ? 'cyber-button cyber-glow' : 'cyber-button';
            const idAttr = b.id ? ` id="${b.id}"` : '';
            return `<button class="${cls}"${idAttr} onclick="${b.onclick}"><span class="cyber-button__tag">${b.label}</span></button>`;
        }).join('');
        return `<div style="margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;">${cells}</div>`;
    }

    /* ── 组装：workspace 外壳────── */
    function workspace(id, layoutClass, leftHTML, rightHTML, styleHTML) {
        const commonCellStyle = `
        [class$="-cell"], [class*="-cell "] {
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
            box-sizing: border-box;
            user-select: none;
            -webkit-user-select: none;
        }
        `;
        const styleBlock = styleHTML ? `<style>${commonCellStyle}\n${styleHTML}</style>` : `<style>${commonCellStyle}</style>`;
        return `<!-- ${id} Workspace -->
<div id="${id}" class="${layoutClass}" style="display:none;gap:2rem;flex-wrap:wrap;align-items:flex-start;">
${styleBlock}
<div class="control-panel card cyber-border" style="flex:1;min-width:320px;padding:2rem;display:flex;flex-direction:column;">
${leftHTML}
</div>
<div class="grid-container card" style="flex:2;min-width:400px;padding:3rem 2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);">
${rightHTML}
</div>
</div>`;
    }

    return {
        backButton,
        statsPanel,
        solutionNav,
        instructions,
        title,
        sizeInputs,
        singleSizeInput,
        actionGrid4,
        workspace
    };
})();
