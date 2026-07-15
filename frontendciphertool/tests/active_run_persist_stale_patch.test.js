const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const ROOT = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(ROOT, 'frontendciphertool/model/main.js'), 'utf8');
const body = source.match(/\(function \(\) \{([\s\S]*)\}\)\(\);\s*$/)[1];
const start = body.indexOf('    function buildAssistantPatch');
const end = body.indexOf('    function completeActiveRun');
const snippet = body.slice(start, end);

const timers = [];
const entry = {
    chatId: 'chat-stale',
    messageId: 'assistant-stale',
    status: 'running',
    latestContent: '',
    latestReasoning: '',
    latestAgentRun: null,
    latestToolCalls: null,
    latestImages: null,
    durableRunId: null,
    latestResumePrompt: '',
    latestErrorMessage: null,
    lastPersistAt: Date.now(),
    pendingPersistTimer: null
};

const updates = [];
const sandbox = {
    window: {
        historyManager: {
            updateMessage(chatId, messageId, patch) {
                updates.push({ chatId, messageId, patch });
                return patch;
            }
        }
    },
    Date,
    console,
    setTimeout(fn) {
        timers.push(fn);
        return timers.length;
    },
    clearTimeout() {},
    checkpointDurableRun() {
        return null;
    },
    getCurrentAccountId() {
        return 'tester';
    }
};

vm.runInNewContext(`${snippet}
this.persistActiveRun = persistActiveRun;`, sandbox, {
    filename: 'frontendciphertool/model/main.js'
});

sandbox.persistActiveRun(entry, { content: '' });
assert(updates.length === 0, 'first throttled save should be queued');
assert(timers.length === 1, 'first throttled save should install one timer');

sandbox.persistActiveRun(entry, { content: 'final visible answer' });
assert(entry.latestContent === 'final visible answer', 'latest active run content should update before timer fires');
assert(updates.length === 0, 'second throttled save should not write immediately');

timers[0]();

assert(updates.length === 1, 'queued save should write once');
assert(updates[0].patch.content === 'final visible answer', 'queued save must use latest content, not stale empty patch');

console.log('active_run_persist_stale_patch: ok');
