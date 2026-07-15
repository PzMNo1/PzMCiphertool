const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const ROOT = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(ROOT, 'frontendciphertool/model/HistoryManager.js'), 'utf8');
const storage = {};
const sandbox = {
    window: {},
    localStorage: {
        getItem: key => storage[key] || '',
        setItem: (key, value) => {
            storage[key] = String(value);
        },
        removeItem: key => {
            delete storage[key];
        }
    },
    console,
    Date,
    JSON,
    Math
};
sandbox.window.localStorage = sandbox.localStorage;

vm.runInNewContext(source, sandbox, {
    filename: 'frontendciphertool/model/HistoryManager.js'
});

const manager = sandbox.window.historyManager;
const events = Array.from({ length: 412 }, (_, index) => ({
    id: `evt-${index + 1}`,
    contract_version: 'agent-contract-v1',
    runId: 'run-events',
    seq: index + 1,
    type: index % 5 === 0 ? 'evidence.added' : 'tool.completed',
    ts: `2026-07-10T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
    stage: index % 2 === 0 ? 'act' : 'observe',
    visibility: 'history',
    payload: {
        message: `event ${index + 1}`,
        details: {
            url: `https://example.com/source/${index + 1}`,
            snippet: 'x'.repeat(500)
        }
    }
}));

const message = {
    id: 'assistant-events',
    role: 'assistant',
    content: 'done',
    agent_run: {
        runId: 'run-events',
        mode: 'agent',
        selectedTools: ['web_research'],
        stages: [],
        traces: [],
        events
    }
};

const normal = manager.prepareMessageForStorage(message, 'normal');
assert(normal.agent_run.events.length === 320, 'normal history should cap Agent events to protect chat content persistence');
assert(normal.agent_run.events[0].seq === 93, 'normal history should keep the newest Agent events after capping');
assert(normal.agent_run.events[normal.agent_run.events.length - 1].seq === 412, 'normal history should preserve the last Agent event');

const tight = manager.prepareMessageForStorage(message, 'tight');
assert(tight.agent_run.events.length === 120, 'tight checkpoints should cap Agent events');
assert(tight.agent_run.events[0].seq === 293, 'tight checkpoints should keep newest events');

const minimal = manager.prepareMessageForStorage(message, 'minimal');
assert(minimal.agent_run.events.length === 40, 'minimal fallback should cap Agent events aggressively for quota recovery');
assert(minimal.agent_run.events[0].seq === 373, 'minimal fallback should keep the newest Agent events');

manager.saveChatHistory('chat-events', 'events', [message]);
const saved = JSON.parse(storage.chatHistory);
assert(saved['chat-events'].messages[0].content === 'done', 'persisted chat history should preserve assistant content');
assert(saved['chat-events'].messages[0].agent_run.events.length === 320, 'persisted chat history should cap Agent events');

console.log('history_agent_events: ok');
