const { ChatUI } = require('../model/ChatUI.js');

function createClassList(element) {
    const values = new Set();
    return {
        add: (...items) => {
            items.forEach(item => {
                if (item) values.add(item);
            });
            element.className = Array.from(values).join(' ');
        },
        remove: (...items) => {
            items.forEach(item => values.delete(item));
            element.className = Array.from(values).join(' ');
        },
        contains: item => values.has(item)
    };
}

function createElement(tagName) {
    const element = {
        tagName: String(tagName || '').toUpperCase(),
        className: '',
        attributes: {},
        children: [],
        listeners: {},
        dataset: {},
        style: {},
        disabled: false,
        _textContent: '',
        _innerHTML: '',
        classList: null,
        append(...items) {
            this.children.push(...items.filter(Boolean));
        },
        appendChild(item) {
            this.children.push(item);
            return item;
        },
        setAttribute(key, value) {
            this.attributes[key] = String(value);
            if (key === 'id') this.id = String(value);
            if (key.startsWith('data-')) {
                this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
            }
        },
        getAttribute(key) {
            return this.attributes[key] || '';
        },
        addEventListener(type, handler) {
            this.listeners[type] = handler;
        },
        click() {
            this.listeners.click?.({ type: 'click', preventDefault() {} });
        },
        remove() {
            this.removed = true;
        },
        querySelector(selector) {
            return findByClass(this, selector.replace(/^\./, ''));
        },
        querySelectorAll(selector) {
            return findAllByClass(this, selector.replace(/^\./, ''));
        },
        set textContent(value) {
            this._textContent = String(value ?? '');
        },
        get textContent() {
            return [this._textContent, ...this.children.map(child => child?.textContent || '')].join('');
        },
        set innerHTML(value) {
            this._innerHTML = String(value ?? '');
            this.children = [];
        },
        get innerHTML() {
            return this._innerHTML;
        }
    };
    element.classList = createClassList(element);
    return element;
}

function findByClass(node, className) {
    if (!node) return null;
    if (String(node.className || '').split(/\s+/).includes(className)) return node;
    for (const child of node.children || []) {
        const found = findByClass(child, className);
        if (found) return found;
    }
    return null;
}

function findAllByClass(node, className, output = []) {
    if (!node) return output;
    if (String(node.className || '').split(/\s+/).includes(className)) output.push(node);
    (node.children || []).forEach(child => findAllByClass(child, className, output));
    return output;
}

function collectHtml(node) {
    if (!node) return '';
    return [node.innerHTML || '', node._textContent || '', ...(node.children || []).map(collectHtml)].join('');
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

global.window = {};
global.document = {
    body: createElement('body'),
    createElement
};
global.URL = {
    createObjectURL: () => 'blob://agent-bundle',
    revokeObjectURL: () => {}
};
global.Blob = function Blob(parts, options) {
    this.parts = parts;
    this.options = options;
};
global.navigator = {
    clipboard: {
        writeText: async value => {
            global.__copiedText = value;
        }
    }
};

(async function run() {
    const ui = new ChatUI();
    const downloads = [];
    const copies = [];
    ui.copyTextToClipboard = async text => {
        copies.push(String(text || ''));
        return true;
    };
    ui.downloadTextFile = (filename, content, mimeType) => {
        downloads.push({ filename, content, mimeType });
        return true;
    };

    const panel = ui.createResearchBundlePanel({
        runId: 'bundle-run-1',
        manuscript: {
            contentChars: 32,
            content: '# 标题\n\n正文 [E1]'
        },
        review: { status: 'ready' },
        writingProfile: {
            schemaVersion: 'research-writing-quality-profile-v1',
            score: 88,
            status: 'taste_ready',
            templateRisk: 'low',
            metrics: {
                structure: 90,
                argumentDensity: 84,
                styleStrength: 91,
                readingRhythm: 82,
                evidenceIntegration: 95,
                repetitionControl: 96
            },
            strengths: ['风格辨识度较强'],
            revisionTargets: ['进入人工精修或事实核验阶段'],
            editorialBrief: '研报 / editorial：继续打磨标题和节奏。'
        },
        qualityRevision: {
            schemaVersion: 'backend-research-quality-revision-v1',
            status: 'fallback_revised',
            triggered: true,
            reason: 'model_unavailable',
            model: 'deepseek-v4-flash',
            revisionTargets: ['增强标题、段落节奏和句式辨识度']
        },
        deliverableAcceptance: {
            schemaVersion: 'research-deliverable-acceptance-v1',
            deliverable: 'research_report',
            label: '研报',
            status: 'ready',
            expectedSections: ['执行摘要', '问题定义', '关键链路', '风险', '结论'],
            presentSections: ['执行摘要', '问题定义', '关键链路'],
            missingSections: ['风险', '结论'],
            editorialStandard: '研报必须结论前置，覆盖问题定义、关键链路、风险限制和结论。'
        },
        finalDeliverable: {
            schemaVersion: 'research-final-deliverable-v1',
            target: 'complete_tasteful_research_manuscript',
            deliverable: 'research_report',
            label: '研报',
            qualityMode: 'deep',
            status: 'deliverable_ready',
            readinessScore: 100,
            summary: '后端主循环、结构、长度、风格、证据边界和导出能力均已通过最终交付验收。',
            checks: [
                { id: 'backend_loop', label: '后端主循环', status: 'pass', passed: true },
                { id: 'style_taste', label: '风格与 taste', status: 'pass', passed: true },
                { id: 'non_repetitive', label: '非重复成稿', status: 'pass', passed: true }
            ],
            nextActions: ['进入人工事实核验、标题精修和发布前排版。']
        },
        productionReadiness: {
            schemaVersion: 'research-production-readiness-v1',
            target: 'excellent_tasteful_publishable_manuscript',
            qualityMode: 'deep',
            status: 'harness_validated',
            readinessScore: 75,
            summary: '本次运行已形成可审计研究包；若模型或真实检索未完成，它只能证明 harness 与成稿门禁有效，不能宣称生产级卓越成品已验证。',
            checks: [
                { id: 'backend_loop', label: '后端主循环', status: 'pass', passed: true },
                { id: 'real_model_synthesis', label: '真实模型成稿', status: 'warn', passed: false },
                { id: 'retrieval_evidence', label: '真实检索证据', status: 'warn', passed: false }
            ],
            diagnostics: {
                model: { status: 'failed', errorCategory: 'model_auth', statusCode: 403 },
                editorial: { status: 'failed', errorCategory: 'model_auth', statusCode: 403 },
                recommendedAction: '模型鉴权失败：更新 OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL 后重新运行真实 E2E。'
            },
            missing: ['配置可用模型 Key，并让 synthesis pass 返回 completed。']
        },
        qualityGates: {
            status: 'ready',
            score: 92,
            gates: [
                { id: 'backend_loop', label: '后端主循环', status: 'pass', note: 'backend' }
            ]
        },
        evidenceMatrix: [
            { evidenceId: 'E1', citationKey: '[E1]', title: 'source', trustLevel: 'tool_output' }
        ],
        citationMatrix: [
            { evidenceId: 'E1', marker: '[E1]', linked: true }
        ],
        exportFiles: [
            {
                path: 'manuscript.md',
                kind: 'manuscript',
                mimeType: 'text/markdown;charset=utf-8',
                bytes: 18,
                content: '# 标题\n\n正文 [E1]'
            }
        ]
    });

    assert(panel.className === 'agent-bundle-panel', 'bundle panel should render');
    const html = collectHtml(panel);
    assert(html.includes('WRITING QUALITY'), 'bundle panel should expose writing quality profile');
    assert(html.includes('taste_ready'), 'writing quality status should be visible');
    assert(html.includes('风格辨识度较强'), 'writing strengths should be visible');
    assert(html.includes('重复'), 'writing quality metrics should expose repetition control');
    assert(html.includes('QUALITY REVISION'), 'bundle panel should expose quality revision pass');
    assert(html.includes('fallback_revised'), 'quality revision status should be visible');
    assert(html.includes('DELIVERABLE'), 'bundle panel should expose deliverable acceptance');
    assert(html.includes('研报'), 'deliverable label should be visible');
    assert(html.includes('执行摘要'), 'present deliverable section should be visible');
    assert(html.includes('风险'), 'missing deliverable section should be visible');
    assert(html.includes('FINAL DELIVERABLE'), 'bundle panel should expose final deliverable acceptance');
    assert(html.includes('deliverable_ready'), 'final deliverable status should be visible');
    assert(html.includes('风格与 taste'), 'final deliverable taste check should be visible');
    assert(html.includes('非重复成稿'), 'final deliverable repetition check should be visible');
    assert(html.includes('PRODUCTION READINESS'), 'bundle panel should expose production readiness');
    assert(html.includes('harness_validated'), 'production readiness status should be visible');
    assert(html.includes('真实模型成稿'), 'production readiness should show model proof');
    assert(html.includes('model_auth'), 'production diagnostics should expose model auth failures');
    assert(html.includes('重新运行真实 E2E'), 'production diagnostics should expose recommended action');
    assert(html.includes('配置可用模型 Key'), 'production readiness should show missing proof actions');
    const actions = panel.querySelectorAll('.agent-bundle-action');
    assert(actions.length === 3, 'bundle panel should expose three actions');
    assert(actions.map(button => button.textContent).join('|') === '复制正文|下载正文|下载研究包', 'actions should be human-facing');

    await actions[0].listeners.click({ preventDefault() {} });
    assert(copies[0].includes('[E1]'), 'copy action should copy manuscript content');

    actions[1].click();
    actions[2].click();
    assert(downloads[0].filename === 'manuscript.md', 'manuscript download should use export file path');
    assert(downloads[0].mimeType === 'text/markdown;charset=utf-8', 'manuscript download should preserve mime type');
    assert(downloads[1].filename === 'bundle-run-1-bundle.json', 'bundle download should use run id');
    assert(downloads[1].mimeType === 'application/json;charset=utf-8', 'bundle download should be JSON');
    assert(downloads[1].content.includes('"bundle-run-1"'), 'bundle download should include run id');

    console.log('agent_bundle_panel: ok');
})();
