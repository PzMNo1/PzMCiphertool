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
assert(normal.agent_run.events.length === 412, 'normal history should preserve all 412 Agent events');
assert(normal.agent_run.events[0].seq === 1, 'normal history should preserve the first Agent event');
assert(normal.agent_run.events[411].seq === 412, 'normal history should preserve the last Agent event');

const tight = manager.prepareMessageForStorage(message, 'tight');
assert(tight.agent_run.events.length === 412, 'tight checkpoints should preserve 412 Agent events');
assert(tight.agent_run.events[0].seq === 1, 'tight checkpoints should preserve the first Agent event');

const minimal = manager.prepareMessageForStorage(message, 'minimal');
assert(minimal.agent_run.events.length === 200, 'minimal fallback should still cap Agent events for quota recovery');
assert(minimal.agent_run.events[0].seq === 213, 'minimal fallback should keep the newest Agent events');

manager.saveChatHistory('chat-events', 'events', [message]);
const saved = JSON.parse(storage.chatHistory);
assert(saved['chat-events'].messages[0].agent_run.events.length === 412, 'persisted chat history should keep 412 Agent events');

console.log('history_agent_events: ok');
