const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
global.localStorage = {
    getItem: () => '',
    setItem: () => {},
    removeItem: () => {}
};
global.fetch = async () => ({
    ok: false,
    text: async () => '{}',
    json: async () => ({})
});

const ROOT = path.resolve(__dirname, '../..');
vm.runInThisContext(
    fs.readFileSync(path.join(ROOT, 'frontendciphertool/model/ToolRegistry.js'), 'utf8'),
    { filename: 'frontendciphertool/model/ToolRegistry.js' }
);

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

(async function run() {
    const registry = new ToolRegistry();
    const simple = await registry.execute('calculate', { expression: '2 + 3 * 4' });
    assert(simple === '14', 'calculate should evaluate basic arithmetic');

    const math = await registry.execute('calculate', { expression: 'Math.sqrt(16) + pow(2, 3)' });
    assert(math === '12', 'calculate should support whitelisted Math calls');

    global.__calculateExploit = false;
    const exploit = await registry.execute('calculate', {
        expression: 'globalThis.__calculateExploit = true'
    });
    assert(/计算错误/.test(exploit), 'calculate should reject assignment/global access');
    assert(global.__calculateExploit === false, 'calculate must not execute arbitrary JS');

    const constructorExploit = await registry.execute('calculate', {
        expression: 'constructor.constructor("globalThis.__calculateExploit=true")()'
    });
    assert(/计算错误/.test(constructorExploit), 'calculate should reject constructor escape');
    assert(global.__calculateExploit === false, 'constructor escape must not run');

    let missingFailed = false;
    try {
        await registry.execute('calculate', {});
    } catch (error) {
        missingFailed = /expression is required/.test(error.message);
    }
    assert(missingFailed, 'tool argument validation should enforce required properties');

    console.log('toolregistry_calculate_security: ok');
})();
