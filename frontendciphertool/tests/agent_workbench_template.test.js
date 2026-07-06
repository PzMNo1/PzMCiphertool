const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const ROOT = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(ROOT, 'frontendciphertool/modules.js'), 'utf8');
const sandbox = {
    window: {
        CIPHER_CLASSIC_MODERN_DIV_BATCH: '',
        addEventListener() {},
        dispatchEvent() {}
    },
    document: {
        addEventListener() {},
        querySelectorAll: () => [],
        getElementById: () => null,
        createElement: () => ({})
    },
    console,
    setTimeout
};

vm.runInNewContext(`${source}\nwindow.__MODULES__ = MODULES;`, sandbox, {
    filename: 'frontendciphertool/modules.js'
});

const html = sandbox.window.__MODULES__.damoxing;

assert(html.includes('aria-label="Agent 使用说明"'), 'Agent page should expose usage instructions');
assert(html.includes('data-guide-id="agent"'), 'Agent page should wire usage button to the shared guide system');
assert(!html.includes('BACKEND RESEARCH AGENT'), 'Agent page should not render decorative backend identity hero');
assert(html.includes('单次成稿模式'), 'Agent page should show direct-writing mode');
assert(html.includes('id="backend-agent-lock"'), 'Agent page should keep the runtime status control');
assert(html.includes('id="agent-deliverable-select"'), 'Agent page should expose deliverable select');
assert(html.includes('value="research_report"'), 'Deliverable select should include report');
assert(html.includes('value="paper"'), 'Deliverable select should include paper');
assert(html.includes('value="article"'), 'Deliverable select should include article');
assert(html.includes('id="agent-style-select"'), 'Agent page should expose style select');
assert(html.includes('data-quality="quick"'), 'Agent page should expose quick quality mode');
assert(html.includes('data-quality="deep"'), 'Agent page should expose deep quality mode');
assert(html.includes('data-quality="publication"'), 'Agent page should expose publication quality mode');
assert(!html.includes('生产级证明'), 'Agent page should not render explanatory proof copy in the shell');
assert(!html.includes('未接入真实模型或真实检索时会明确显示缺口'), 'Agent page should not render explanatory proof copy in the shell');
assert(!html.includes('agent-flow-list'), 'Agent page should not render decorative backend flow list');
assert((html.match(/class="agent-prompt-chip"/g) || []).length === 0, 'Agent page should not render quick-start guide chips');

console.log('agent_workbench_template: ok');
