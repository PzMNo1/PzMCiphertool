/**
 * AgentLiveEvalRunner - optional live regression checks that execute AgentRuntime.
 * It does not write chat history and uses a detached silent UI container.
 */
class AgentLiveEvalRunner {
    constructor(options = {}) {
        this.replay = options.replay || window.agentRunReplay;
        this.quality = options.quality || window.agentRunQuality;
        this.version = 'agent-live-eval-matrix-v1';
    }

    getReplay() {
        return this.replay || window.agentRunReplay;
    }

    getQuality() {
        return this.quality || window.agentRunQuality;
    }

    now() {
        const perf = window.performance || (typeof performance !== 'undefined' ? performance : null);
        return perf?.now ? perf.now() : Date.now();
    }

    getCases() {
        return this.liveCases();
    }

    liveCases() {
        return [
            {
                id: 'LIVE-001',
                title: 'plain chat runtime smoke',
                prompt: '简要解释凯撒密码是什么，不要调用工具。',
                risk: 'safe_read',
                usesTools: false,
                usesNetwork: false,
                requiresApproval: false,
                toolEnabled: false,
                enableThinking: false,
                defaultSelected: true,
                assertions: ({ response, snapshot, replay, quality }) => [
                    this.expect(Boolean(response?.content), 'response content should not be empty'),
                    this.expect(snapshot?.mode === 'chat', 'runtime mode should be chat'),
                    this.expect((snapshot?.selectedTools || []).length === 0, 'plain run should not route tools'),
                    this.expect(replay.status === 'completed', 'run should complete'),
                    this.expect(quality.score >= 75, 'quality score should be acceptable')
                ]
            },
            {
                id: 'LIVE-002',
                title: 'math route runtime smoke',
                prompt: '计算 17*23+19，并给出最终数字。',
                risk: 'safe_read',
                usesTools: true,
                usesNetwork: false,
                requiresApproval: false,
                toolEnabled: true,
                enableThinking: false,
                defaultSelected: true,
                assertions: ({ snapshot, replay }) => [
                    this.expect(this.hasSelectedTool(snapshot, 'calculate'), 'math prompt should route calculate'),
                    this.expect(replay.status === 'completed', 'math route run should complete')
                ]
            },
            {
                id: 'LIVE-003',
                title: 'crypto route runtime smoke',
                prompt: '把 khoor 用凯撒偏移 -3 解密，只给出结果和一句说明。',
                risk: 'safe_read',
                usesTools: true,
                usesNetwork: false,
                requiresApproval: false,
                toolEnabled: true,
                enableThinking: false,
                defaultSelected: true,
                assertions: ({ snapshot, replay, quality }) => [
                    this.expect(snapshot?.mode === 'agent', 'crypto prompt should enter agent mode'),
                    this.expect(this.hasSelectedTool(snapshot, 'caesar_cipher'), 'crypto prompt should route caesar_cipher'),
                    this.expect(replay.status === 'completed', 'crypto route run should complete'),
                    this.expect(quality.score >= 65, 'crypto route quality score should stay usable')
                ]
            },
            {
                id: 'LIVE-004',
                title: 'project read route smoke',
                prompt: '读取项目根目录文件结构，最多列出三类目录，不要运行命令。',
                risk: 'project_read',
                usesTools: true,
                usesNetwork: false,
                requiresApproval: false,
                requiresBackend: true,
                toolEnabled: true,
                enableThinking: false,
                defaultSelected: false,
                assertions: ({ snapshot, replay }) => [
                    this.expect(snapshot?.mode === 'agent', 'project prompt should enter agent mode'),
                    this.expect(this.hasAnySelectedTool(snapshot, ['list_files', 'read_file', 'search_files', 'file_info']), 'project prompt should route read-only project tools'),
                    this.expect(replay.status === 'completed', 'project read route should complete'),
                    this.expect((replay.approvals || []).length === 0, 'read-only project case should not request exec approval')
                ]
            },
            {
                id: 'LIVE-005',
                title: 'network research route smoke',
                prompt: '联网查找一个 OpenAI 官方文档页面，给出一个来源。',
                risk: 'network_read',
                usesTools: true,
                usesNetwork: true,
                requiresApproval: false,
                requiresBackend: true,
                toolEnabled: true,
                enableThinking: false,
                defaultSelected: false,
                assertions: ({ snapshot, replay, quality }) => [
                    this.expect(snapshot?.mode === 'research', 'research prompt should enter research mode'),
                    this.expect(this.hasAnySelectedTool(snapshot, ['web_research', 'search_urls', 'read_webpage', 'community_snapshot', 'news_query']), 'research prompt should route research tools'),
                    this.expect(replay.status === 'completed', 'network research route should complete'),
                    this.expect(replay.metrics.evidence > 0 || !this.hasFinding(quality, 'Research run has no evidence'), 'research run should either collect evidence or avoid missing-evidence findings')
                ]
            },
            {
                id: 'LIVE-006',
                title: 'approval rejection route smoke',
                prompt: '运行后端测试，用工具执行。不要跳过审批链路。',
                risk: 'project_exec',
                usesTools: true,
                usesNetwork: false,
                requiresApproval: true,
                requiresBackend: true,
                toolEnabled: true,
                enableThinking: false,
                defaultSelected: false,
                assertions: ({ snapshot, replay, quality }) => [
                    this.expect(this.hasAnySelectedTool(snapshot, ['run_tests', 'run_build']), 'exec prompt should route project exec tools'),
                    this.expect((replay.approvals || []).some(item => item.status === 'rejected'), 'silent live eval should reject project exec approval'),
                    this.expect(replay.metrics.rejectedApprovals > 0, 'rejected approval should be counted'),
                    this.expect(this.hasFinding(quality, 'Approval rejected'), 'quality layer should flag rejected approval')
                ]
            }
        ];
    }

    async runSmoke() {
        return this.runSelected(this.defaultCaseIds());
    }

    async runAll() {
        return this.runCases(this.liveCases());
    }

    async runSelected(caseIds = null) {
        const ids = Array.isArray(caseIds) && caseIds.length ? caseIds : this.defaultCaseIds();
        return this.runCasesById(ids);
    }

    async runCasesById(caseIds = []) {
        const selected = this.selectCases(caseIds);
        return this.runCases(selected);
    }

    defaultCaseIds() {
        return this.liveCases()
            .filter(item => item.defaultSelected || item.default)
            .map(item => item.id);
    }

    selectCases(caseIds = []) {
        const selectedIds = new Set(caseIds);
        return this.liveCases().filter(item => selectedIds.has(item.id));
    }

    async runCases(cases) {
        const startedAt = this.now();
        const results = [];
        for (const test of cases) {
            results.push(await this.runCase(test));
        }
        const passed = results.filter(item => item.pass).length;
        const warnings = results.flatMap(item => item.warnings || []);
        return {
            version: this.version,
            runAt: new Date().toISOString(),
            durationMs: Math.round(this.now() - startedAt),
            total: results.length,
            passed,
            failed: results.length - passed,
            pass: results.length > 0 && passed === results.length,
            warnings: results.length ? warnings : ['No live eval cases selected.'],
            cases: results
        };
    }

    async runCase(test) {
        const startedAt = this.now();
        try {
            this.assertRuntimeAvailable();
            const ui = new AgentLiveEvalSilentUI();
            const runtime = new window.AgentRuntime({
                client: new window.DeepSeekClient(),
                registry: window.toolRegistry,
                ui
            });
            const container = ui.createContainer();
            const messages = [
                { role: 'system', content: window.PZM_SYSTEM_PROMPT || 'You are a concise assistant.' },
                { role: 'user', content: test.prompt }
            ];
            const contextPack = window.AgentContract?.createContextPack?.({
                chatId: `live-eval-${test.id}`,
                userMessage: test.prompt,
                routingMessage: test.prompt,
                priorMessages: [],
                priorAgentRuns: [],
                preparedAttachments: { historyAttachments: [] },
                isToolEnabled: Boolean(test.toolEnabled),
                isDeepThinkEnabled: Boolean(test.enableThinking)
            }) || null;

            const response = await runtime.run({
                messages,
                userMessage: test.prompt,
                enableThinking: Boolean(test.enableThinking),
                toolEnabled: Boolean(test.toolEnabled),
                hasAttachments: false,
                contextPack,
                container
            });

            const snapshot = response?.agent_run || null;
            const warnings = [];
            if (snapshot?.runId) {
                try {
                    const saved = window.agentRunStore?.saveRun?.(snapshot, {
                        chatId: `live-eval-${test.id}`,
                        source: 'live-eval'
                    });
                    if (!saved) warnings.push(`AgentRunStore did not save ${snapshot.runId}.`);
                } catch (saveError) {
                    warnings.push(`AgentRunStore save failed for ${snapshot.runId}: ${saveError.message || String(saveError)}.`);
                }
            }
            const replay = this.getReplay().build(snapshot?.events || [], snapshot);
            const quality = this.getQuality().build(replay);
            const assertions = test.assertions({ response, snapshot, replay, quality });
            const failures = assertions.filter(item => !item.pass);
            return {
                id: test.id,
                title: test.title,
                risk: test.risk || 'unknown',
                usesTools: Boolean(test.usesTools),
                usesNetwork: Boolean(test.usesNetwork),
                requiresApproval: Boolean(test.requiresApproval),
                requiresBackend: Boolean(test.requiresBackend),
                pass: failures.length === 0,
                durationMs: Math.round(this.now() - startedAt),
                score: quality.score,
                grade: quality.grade,
                runId: snapshot?.runId || '',
                assertions,
                warnings,
                failures: failures.map(item => item.message),
                findings: quality.findings.map(item => ({
                    severity: item.severity,
                    title: item.title
                }))
            };
        } catch (e) {
            return {
                id: test.id,
                title: test.title,
                risk: test.risk || 'unknown',
                usesTools: Boolean(test.usesTools),
                usesNetwork: Boolean(test.usesNetwork),
                requiresApproval: Boolean(test.requiresApproval),
                requiresBackend: Boolean(test.requiresBackend),
                pass: false,
                durationMs: Math.round(this.now() - startedAt),
                score: 0,
                grade: 'error',
                runId: '',
                assertions: [],
                warnings: [],
                failures: [e.message || String(e)],
                findings: []
            };
        }
    }

    assertRuntimeAvailable() {
        if (!window.AgentRuntime || !window.DeepSeekClient || !window.toolRegistry) {
            throw new Error('AgentRuntime, DeepSeekClient, or ToolRegistry is unavailable.');
        }
        const probe = new window.DeepSeekClient();
        if (!probe.apiKey) {
            throw new Error('Live eval requires a configured model API key.');
        }
    }

    expect(pass, message) {
        return { pass: Boolean(pass), message };
    }

    hasSelectedTool(snapshot, name) {
        return (snapshot?.selectedTools || []).includes(name);
    }

    hasAnySelectedTool(snapshot, names) {
        const selected = new Set(snapshot?.selectedTools || []);
        return names.some(name => selected.has(name));
    }

    hasFinding(quality, title) {
        return (quality?.findings || []).some(item => item.title === title);
    }

}

class AgentLiveEvalSilentUI {
    createContainer() {
        const element = document.createElement('div');
        const reasoningDetails = document.createElement('details');
        reasoningDetails.className = 'reasoning-details thinking-state';
        const reasoningSummary = document.createElement('summary');
        const reasoningContent = document.createElement('div');
        const cursorSpan = document.createElement('span');
        const contentDiv = document.createElement('div');
        element.appendChild(reasoningDetails);
        element.appendChild(contentDiv);
        reasoningDetails.appendChild(reasoningSummary);
        reasoningDetails.appendChild(reasoningContent);
        reasoningContent.appendChild(cursorSpan);
        return { element, reasoningDetails, reasoningSummary, reasoningContent, cursorSpan, contentDiv };
    }

    createAgentRunPanel(container, plan) {
        const panel = document.createElement('details');
        const stages = document.createElement('div');
        const trace = document.createElement('div');
        stages.className = 'agent-stage-strip';
        trace.className = 'agent-trace-log';
        (plan.stages || []).forEach(stage => {
            const item = document.createElement('div');
            item.className = 'agent-stage pending';
            item.dataset.stage = stage.id;
            item.innerHTML = `
                <span class="agent-stage-label">${stage.label || stage.id}</span>
                <span class="agent-stage-note"></span>
            `;
            stages.appendChild(item);
        });
        container.agentRunPanel = panel;
        container.agentStages = stages;
        container.agentTrace = trace;
        return panel;
    }

    setAgentStage(container, stageId, state, note = '') {
        const stage = container.agentStages?.querySelector?.(`[data-stage="${stageId}"]`);
        if (!stage) return;
        stage.className = `agent-stage ${state || 'pending'}`;
        const noteEl = stage.querySelector('.agent-stage-note');
        if (noteEl) noteEl.textContent = note;
    }

    addAgentTrace(container, stage, message) {
        if (!container.agentTrace) return;
        const row = document.createElement('div');
        row.className = 'agent-trace-row';
        row.innerHTML = `
            <span class="agent-trace-stage">${stage || ''}</span>
            <span class="agent-trace-message">${message || ''}</span>
        `;
        container.agentTrace.appendChild(row);
    }

    appendReasoningContent(container, text) {
        container.reasoningContent?.appendChild(document.createTextNode(text || ''));
    }

    appendReasoningEvent(container, message) {
        this.appendReasoningContent(container, `${message || ''}\n`);
    }

    finishReasoning(container) {
        container.reasoningDetails?.classList?.remove('thinking-state');
    }

    updateContent(container, fullContent) {
        if (container.contentDiv) {
            container.contentDiv.textContent = fullContent || '';
        }
    }

    displayToolCall() {
    }

    updateToolResult() {
    }

    appendAgentEvent() {
    }

    waitForAgentApproval(container, event, context = {}) {
        return Promise.resolve({
            status: 'rejected',
            args: context.args || {},
            reason: 'Live eval does not approve side-effect tools.'
        });
    }
}

window.AgentLiveEvalRunner = AgentLiveEvalRunner;
window.agentLiveEvalRunner = new AgentLiveEvalRunner();
