#!/usr/bin/env node
/**
 * Agent 后台任务执行器（单任务进程）。
 *
 * 浏览器不再承担研报/深度研究的长链路：Java 端 /api/agent-jobs 把任务参数写到任务目录，
 * 再以独立进程启动本脚本。本进程复用 frontendciphertool/model 下**同一份** AgentRuntime、
 * DeepSeekClient、ToolRegistry 代码，把原本发生在页面里的 run 搬到后台执行；页面关闭、
 * 刷新、换设备都不会中断，页面只需轮询任务状态。
 *
 * 进程契约：
 *   argv[2]                    任务目录
 *   <jobDir>/payload.json      运行参数：messages / userMessage / contextPack / toolContext / ...
 *   <jobDir>/auth.txt          Authorization 头（Bearer token），启动后立即删除
 *   <jobDir>/state.json        本进程持续写出的快照（Java 只读，不写；原子替换）
 *   <jobDir>/cancel            出现即中止（Java 的取消/超时入口）
 *   <jobDir>/worker.log        stdout/stderr 落盘
 *
 * 环境变量：
 *   AGENT_WORKER_FRONTEND_ROOT  frontendciphertool 目录
 *   CIPHERTOOL_API_BASE         Java 后端地址（默认 http://127.0.0.1:8080）
 *   AGENT_WORKER_TIMEOUT_MS     单任务超时（默认 30 分钟）
 *
 * state.json 结构（版本 agent-job-state-v1）：
 *   { version, status, phase, seq, contentVersion, content, events[], result, error,
 *     startedAt, updatedAt }
 * events 只记录低频事件（panel/stage/trace/tool/toolResult/reasoning），正文走 content 字段，
 * 由前端按 contentVersion 判断是否刷新，避免每个流式增量都写一条事件。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JOB_DIR = process.argv[2];
if (!JOB_DIR) {
    console.error('usage: node run-job.js <jobDir>');
    process.exit(2);
}

const FRONTEND_ROOT = process.env.AGENT_WORKER_FRONTEND_ROOT
    || path.resolve(__dirname, '..', '..', 'frontendciphertool');
const API_BASE = (process.env.CIPHERTOOL_API_BASE || 'http://127.0.0.1:8080').replace(/\/+$/, '');
const TIMEOUT_MS = Math.max(60000, Number(process.env.AGENT_WORKER_TIMEOUT_MS) || 30 * 60 * 1000);
const STATE_VERSION = 'agent-job-state-v1';
const MAX_EVENTS = 600;
const MAX_CONTENT_CHARS = 160000;

const startedAt = new Date().toISOString();
const state = {
    version: STATE_VERSION,
    status: 'running',
    phase: 'plan',
    seq: 0,
    contentVersion: 0,
    content: '',
    events: [],
    result: null,
    error: '',
    startedAt,
    updatedAt: startedAt
};
let stateDirty = true;
let lastStateWrite = 0;
let finalWritten = false;

function nowIso() {
    return new Date().toISOString();
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function atomicWrite(file, text) {
    const tmp = `${file}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, text, { mode: 0o600 });
    fs.renameSync(tmp, file);
}

function scheduleStateWrite(force) {
    state.updatedAt = nowIso();
    stateDirty = true;
    const now = Date.now();
    // 流式正文更新很密集：最多每 700ms 落一次盘；stage/tool/结束等关键节点强制落盘。
    if (!force && now - lastStateWrite < 700) return;
    flushState();
}

function flushState() {
    if (!stateDirty) return;
    try {
        atomicWrite(path.join(JOB_DIR, 'state.json'), JSON.stringify(state));
        stateDirty = false;
        lastStateWrite = Date.now();
    } catch (error) {
        // 状态写盘失败不应打断主流程；下一次更新会重试。
        console.error('state write failed:', error && error.message);
    }
}

function addEvent(type, data, options = {}) {
    state.seq += 1;
    const event = Object.assign({ seq: state.seq, type, at: nowIso() }, data || {});
    state.events.push(event);
    if (state.events.length > MAX_EVENTS) {
        state.events.splice(0, state.events.length - MAX_EVENTS);
    }
    if (options.phase) state.phase = options.phase;
    scheduleStateWrite(Boolean(options.force));
    return event;
}

function setPhase(phase) {
    if (phase && state.phase !== phase) {
        state.phase = phase;
        scheduleStateWrite(true);
    }
}

function setContent(content) {
    const text = String(content || '');
    if (!text || text === state.content) return;
    const clipped = text.length > MAX_CONTENT_CHARS
        ? text.slice(text.length - MAX_CONTENT_CHARS)
        : text;
    state.content = clipped;
    state.contentVersion += 1;
    scheduleStateWrite(false);
}

function finish(status, result, error) {
    if (finalWritten) return;
    finalWritten = true;
    state.status = status;
    state.phase = status === 'completed' ? 'completed' : state.phase;
    if (result && typeof result === 'object') {
        state.result = result;
        if (typeof result.content === 'string' && result.content) {
            state.content = result.content.length > MAX_CONTENT_CHARS
                ? result.content.slice(result.content.length - MAX_CONTENT_CHARS)
                : result.content;
            state.contentVersion += 1;
        }
    }
    if (error) state.error = String(error).slice(0, 4000);
    state.updatedAt = nowIso();
    flushState();
    cleanupSensitiveFiles();
}

function cleanupSensitiveFiles() {
    for (const name of ['auth.txt', 'payload.json']) {
        try {
            fs.rmSync(path.join(JOB_DIR, name), { force: true });
        } catch (error) {
            // ignore
        }
    }
}

/* ------------------------------------------------------------------ */
/* 浏览器环境 shim：只提供 AgentRuntime 需要的部分，不模拟完整 DOM。      */
/* ------------------------------------------------------------------ */

const localStore = new Map();
function fakeElement() {
    const element = {
        style: {},
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        appendChild() {}, prepend() {}, remove() {}, insertBefore() {},
        setAttribute() {}, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        closest() { return null; },
        getAttribute() { return null; },
        isConnected: false,
        dataset: {},
        innerHTML: '',
        textContent: '',
        hidden: false
    };
    return element;
}

globalThis.window = globalThis;
globalThis.location = { hostname: '127.0.0.1', origin: API_BASE, href: API_BASE };
try {
    Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'pzma-agent-worker/1.0' },
        configurable: true
    });
} catch (error) {
    // Node 22 自带只读 navigator；保留默认值即可。
}
globalThis.localStorage = {
    getItem: key => (localStore.has(key) ? localStore.get(key) : null),
    setItem: (key, value) => localStore.set(key, String(value)),
    removeItem: key => localStore.delete(key)
};
globalThis.document = {
    readyState: 'complete',
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    createElement() { return fakeElement(); },
    createTextNode() { return {}; },
    body: fakeElement(),
    head: fakeElement(),
    documentElement: fakeElement()
};
globalThis.CIPHERTOOL_API_BASE = API_BASE;
// 后台进程没有页面的 backendconfig.js：模型默认沿用线上口径 deepseek-flash，
// 部署机的上游模型不同时可用 AGENT_WORKER_MODEL 覆盖。
const WORKER_MODEL = String(process.env.AGENT_WORKER_MODEL || '').trim();
if (WORKER_MODEL) {
    globalThis.DEEPSEEK_CONFIG = {
        model: WORKER_MODEL,
        defaultModel: WORKER_MODEL,
        reasonerModel: WORKER_MODEL
    };
}

function readAuthHeader() {
    try {
        const authFile = path.join(JOB_DIR, 'auth.txt');
        const value = fs.readFileSync(authFile, 'utf8').trim();
        fs.rmSync(authFile, { force: true });
        return value;
    } catch (error) {
        return '';
    }
}

const authHeader = readAuthHeader();
globalThis.CipherAuth = {
    getAuthHeaders: () => (authHeader ? { Authorization: authHeader } : {}),
    getUser: () => ({ phone: 'agent-job' })
};

function loadRuntimeModules() {
    const files = [
        'model/contracts/AgentContract.js',
        'model/DeepSeekClient.js',
        'model/ToolRegistry.js',
        'model/agent/AgentIntentContract.js',
        'model/agent/AgentProfiles.js',
        'model/agent/AgentPolicyResolver.js',
        'model/agent/AgentDurableStore.js',
        'model/agent/AgentPerformanceMonitor.js',
        'model/agent/AgentContextManager.js',
        'model/agent/AgentResearchContract.js',
        'model/agent/AgentStyleContract.js',
        'model/agent/AgentExpertPanel.js',
        'model/agent/AgentSkillRegistry.js',
        'model/agent/AgentHarnessRegistry.js',
        'model/agent/AgentMcpClient.js',
        'model/agent/AgentToolExecutor.js',
        'model/agent/AgentPluginKernel.js',
        'model/agent/AgentPluginCatalog.js',
        'model/AgentRuntime.js'
    ];
    for (const relative of files) {
        const absolute = path.join(FRONTEND_ROOT, relative);
        const code = fs.readFileSync(absolute, 'utf8');
        vm.runInThisContext(code, { filename: relative });
    }
    if (!globalThis.AgentRuntime) {
        throw new Error('AgentRuntime 未加载');
    }
}

/* ------------------------------------------------------------------ */
/* UI 适配器：把原页面里的 ChatUI 调用转换成可轮询的事件与正文快照。       */
/* ------------------------------------------------------------------ */

// 让 snapshotRun() 能读到和页面里一致的阶段条/轨迹行，任务完成后恢复出来的
// AgentRun 面板仍然带完整阶段与执行轨迹（而不是只剩正文）。
const stageNodes = new Map();
const traceNodes = [];

function mockStageNode(stage, status, label) {
    const node = {
        dataset: { stage: String(stage || '') },
        _status: status,
        _label: String(label || ''),
        _note: String(label || ''),
        classList: {
            contains(name) { return name === node._status; }
        },
        querySelector(selector) {
            if (selector === '.agent-stage-label') {
                return { get textContent() { return node._label; }, set textContent(value) { node._label = value; } };
            }
            if (selector === '.agent-stage-note') {
                return { get textContent() { return node._note; }, set textContent(value) { node._note = value; } };
            }
            return null;
        }
    };
    return node;
}

function mockTraceRow(stage, message) {
    return {
        querySelector(selector) {
            if (selector === '.agent-trace-stage') return { textContent: String(stage || '') };
            if (selector === '.agent-trace-message') return { textContent: String(message || '') };
            return null;
        }
    };
}

const workerContainer = {
    element: fakeElement(),
    reasoningDetails: { classList: { contains() { return false; } } },
    reasoningSummary: null,
    reasoningContent: null,
    contentDiv: fakeElement(),
    cursorSpan: null,
    agentRunStatus: null,
    agentRunPanel: null,
    agentStages: { querySelectorAll() { return Array.from(stageNodes.values()); } },
    agentApprovalDeck: null,
    toolDeck: null,
    agentTrace: { querySelectorAll() { return traceNodes.slice(); } },
    agentEventTimeline: null,
    agentEventLog: null,
    agentEventCount: null,
    agentThoughtPanel: null
};

function compactPlan(plan) {
    if (!plan) return null;
    const contract = plan.contract || null;
    return {
        runId: plan.runId || '',
        mode: plan.mode || 'agent',
        researchProfile: plan.researchProfile || '',
        harness: plan.harness || null,
        skills: Array.isArray(plan.skills) ? plan.skills.map(skill => skill && skill.id).filter(Boolean) : [],
        selectedTools: Array.isArray(plan.selectedTools) ? plan.selectedTools.slice(0, 64) : [],
        stages: Array.isArray(plan.stages) ? plan.stages : [],
        collaboration: plan.collaboration || null,
        contract: contract ? {
            tier: contract.tier,
            tierLabel: contract.tierLabel,
            minChars: contract.minChars,
            minTables: contract.minTables,
            minDiagrams: contract.minDiagrams,
            minCitations: contract.minCitations,
            panelSize: contract.panelSize,
            isResearch: Boolean(contract.isResearch)
        } : null
    };
}

function preview(value, max) {
    const text = typeof value === 'string' ? value : JSON.stringify(value || '');
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

let lastReasoningStatus = '';

const uiAdapter = {
    createAgentRunPanel(container, plan) {
        addEvent('panel', { plan: compactPlan(plan) }, { phase: 'plan', force: true });
    },
    setAgentStage(container, stage, status, label) {
        const key = String(stage || '');
        stageNodes.set(key, mockStageNode(key, status, label));
        addEvent('stage', {
            stage: key,
            status: String(status || ''),
            label: String(label || '').slice(0, 240)
        }, { force: status === 'done' || status === 'error' });
    },
    addAgentTrace(container, stage, message) {
        traceNodes.push(mockTraceRow(stage, message));
        if (traceNodes.length > 400) traceNodes.splice(0, traceNodes.length - 400);
        addEvent('trace', {
            stage: String(stage || ''),
            message: preview(message, 600)
        });
    },
    displayToolCall(container, toolCall) {
        if (!toolCall) return;
        const fn = toolCall.function || {};
        addEvent('tool', {
            id: String(toolCall.id || ''),
            name: String(fn.name || ''),
            arguments: preview(fn.arguments || '', 4000)
        }, { phase: 'act', force: true });
    },
    updateToolResult(toolCallId, summary, success) {
        addEvent('toolResult', {
            id: String(toolCallId || ''),
            summary: preview(summary, 800),
            success: Boolean(success)
        }, { phase: 'observe', force: true });
    },
    updateContent(container, content) {
        setContent(content);
    },
    setReasoningStatus(container, status) {
        const text = String(status || '').slice(0, 240);
        // 流式阶段会连续收到同一个状态，去重后事件数量从几百降到个位数。
        if (text === lastReasoningStatus) return;
        lastReasoningStatus = text;
        addEvent('reasoning', { status: text });
    },
    finishReasoning() {
        lastReasoningStatus = '';
        addEvent('reasoningDone', {}, { force: true });
    },
    buildCollaboratorRows() {
        return '';
    },
    buildCollaboratorSummary(experts) {
        const list = Array.isArray(experts) ? experts : [];
        return `${list.filter(item => item && item.status === 'done').length}/${list.length} ok`;
    }
};

/* ------------------------------------------------------------------ */
/* 执行主流程                                                          */
/* ------------------------------------------------------------------ */

function readPayload() {
    const raw = fs.readFileSync(path.join(JOB_DIR, 'payload.json'), 'utf8');
    try {
        fs.rmSync(path.join(JOB_DIR, 'payload.json'), { force: true });
    } catch (error) {
        // ignore
    }
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') {
        throw new Error('任务参数为空');
    }
    return payload;
}

function installCancelWatcher(controller) {
    const cancelFile = path.join(JOB_DIR, 'cancel');
    let stopped = false;
    const timer = setInterval(() => {
        if (stopped) return;
        try {
            if (fs.existsSync(cancelFile)) {
                stopped = true;
                controller.abort();
            }
        } catch (error) {
            // ignore
        }
    }, 1000);
    timer.unref?.();
    return () => {
        stopped = true;
        clearInterval(timer);
    };
}

async function main() {
    ensureDir(JOB_DIR);
    flushState();
    const payload = readPayload();
    loadRuntimeModules();

    if (payload.runConfig && typeof payload.runConfig === 'object') {
        globalThis.PZM_AGENT_RUN_CONFIG = payload.runConfig;
    }
    if (payload.agentStyle && typeof payload.agentStyle === 'object') {
        globalThis.PZM_AGENT_STYLE = payload.agentStyle;
    }

    const controller = new AbortController();
    const stopWatcher = installCancelWatcher(controller);
    const timeout = setTimeout(() => {
        state.error = `任务超过 ${Math.round(TIMEOUT_MS / 60000)} 分钟仍未完成，已中止`;
        controller.abort();
    }, TIMEOUT_MS);
    timeout.unref?.();

    const onExit = signal => {
        try {
            finish('cancelled', null, `进程收到 ${signal}`);
        } finally {
            process.exit(0);
        }
    };
    process.once('SIGTERM', () => onExit('SIGTERM'));
    process.once('SIGINT', () => onExit('SIGINT'));

    try {
        const client = new globalThis.DeepSeekClient();
        if (typeof client.beginUsageTurn === 'function') {
            client.beginUsageTurn(payload.usageTurnId || `job_${path.basename(JOB_DIR)}`);
        }
        const runtime = new globalThis.AgentRuntime({
            client,
            registry: globalThis.toolRegistry,
            ui: uiAdapter,
            clientFactory: () => new globalThis.DeepSeekClient()
        });

        const response = await runtime.run({
            messages: Array.isArray(payload.messages) ? payload.messages : [],
            userMessage: String(payload.userMessage || ''),
            enableThinking: payload.enableThinking !== false,
            toolEnabled: payload.toolEnabled !== false,
            hasAttachments: Boolean(payload.hasAttachments),
            contextPack: payload.contextPack || null,
            toolContext: payload.toolContext || null,
            container: workerContainer,
            signal: controller.signal,
            // 页面提交任务前已经做过档位路由（并据此决定移交后台），这里沿用同一结果，
            // 避免后台再判一次档位导致「提交时是研究报告、执行时又变成对话」。
            routingContract: payload.routingHint || null,
            onRunSnapshot: (snapshot, meta = {}) => {
                if (!snapshot) return;
                if (meta.content !== undefined) {
                    setContent(meta.content);
                }
                if (meta.reason === 'run.completed') {
                    state.result = Object.assign({}, state.result || {}, {
                        agent_run: snapshot
                    });
                }
                // 协作面板进度单独走事件，页面据此实时刷新专家行；
                // 没有 DOM 时 renderExpertStatus 的界面更新会直接返回，只能从这里带出去。
                if (meta.reason === 'collaboration.updated' && snapshot.collaboration) {
                    addEvent('collaboration', { collaboration: snapshot.collaboration }, { force: true });
                }
            }
        });

        const content = String(response?.content || state.content || '');
        if (content) setContent(content);
        const result = {
            content,
            agent_run: response?.agent_run || state.result?.agent_run || null,
            tool_calls: response?.agent_tool_calls || response?.tool_calls || null,
            finish_reason: response?.finish_reason || 'stop'
        };
        finish('completed', result, '');
        process.exit(0);
    } catch (error) {
        const aborted = controller.signal.aborted || error?.name === 'AbortError';
        if (aborted) {
            finish('cancelled', null, state.error || '任务已取消');
        } else {
            finish('failed', null, (error && (error.message || String(error))) || '任务执行失败');
        }
        process.exit(aborted ? 0 : 1);
    } finally {
        stopWatcher();
        clearTimeout(timeout);
    }
}

main().catch(error => {
    finish('failed', null, (error && (error.message || String(error))) || '任务启动失败');
    process.exit(1);
});
