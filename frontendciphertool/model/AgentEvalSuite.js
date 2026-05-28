/**
 * AgentEvalSuite - deterministic offline regression fixtures for Agent replay/quality.
 */
class AgentEvalSuite {
    constructor(options = {}) {
        this.replay = options.replay || window.agentRunReplay;
        this.quality = options.quality || window.agentRunQuality;
        this.version = 'agent-eval-suite-v1';
    }

    getReplay() {
        return this.replay || window.agentRunReplay;
    }

    getQuality() {
        return this.quality || window.agentRunQuality;
    }

    runAll() {
        const startedAt = performance.now();
        const cases = this.fixtures().map(test => this.runCase(test));
        const passed = cases.filter(item => item.pass).length;
        const failed = cases.length - passed;
        return {
            version: this.version,
            runAt: new Date().toISOString(),
            durationMs: Math.round(performance.now() - startedAt),
            total: cases.length,
            passed,
            failed,
            pass: failed === 0,
            cases
        };
    }

    runCase(test) {
        try {
            const replay = this.getReplay().build(test.events || [], test.snapshot || null);
            const quality = this.getQuality().build(replay);
            const assertions = test.assertions({ replay, quality });
            const failures = assertions.filter(item => !item.pass);
            return {
                id: test.id,
                title: test.title,
                pass: failures.length === 0,
                score: quality.score,
                grade: quality.grade,
                assertions,
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
                pass: false,
                score: 0,
                grade: 'error',
                assertions: [],
                failures: [e.message || String(e)],
                findings: []
            };
        }
    }

    fixtures() {
        return [
            this.completedPlainRun(),
            this.researchWithPrimaryEvidence(),
            this.toolFailureDetection(),
            this.approvalRejectionDetection(),
            this.weakCitationDetection(),
            this.snapshotFallback()
        ];
    }

    completedPlainRun() {
        const runId = 'eval-plain-run';
        return {
            id: 'EVAL-001',
            title: 'completed plain run',
            events: [
                this.event(runId, 1, 'run.started', 'plan', { mode: 'chat', researchProfile: 'none' }),
                this.event(runId, 2, 'plan.created', 'plan', { mode: 'chat', maxIterations: 1 }),
                this.event(runId, 3, 'route.completed', 'route', { selectedTools: [] }),
                this.event(runId, 4, 'model.started', 'synthesize', { toolsEnabled: false }),
                this.event(runId, 5, 'model.completed', 'synthesize', { content_chars: 80 }),
                this.event(runId, 6, 'run.completed', 'synthesize', { content_chars: 80, warnings: [] })
            ],
            assertions: ({ replay, quality }) => [
                this.expect(replay.status === 'completed', 'run should complete'),
                this.expect(replay.metrics.events === 6, 'all non-delta events should replay'),
                this.expect(quality.score >= 90, 'plain completed run should score cleanly'),
                this.expect(quality.findings.length === 0, 'plain completed run should have no findings')
            ]
        };
    }

    researchWithPrimaryEvidence() {
        const runId = 'eval-research-evidence';
        return {
            id: 'EVAL-002',
            title: 'research with primary evidence',
            events: [
                this.event(runId, 1, 'run.started', 'plan', { mode: 'research', researchProfile: 'academic' }),
                this.event(runId, 2, 'route.completed', 'route', { selectedTools: ['read_webpage'] }),
                this.event(runId, 3, 'evidence.added', 'observe', {
                    evidence_id: 'evd-1',
                    kind: 'opened_source',
                    title: 'Primary paper',
                    url: 'https://example.org/paper',
                    trustLevel: 'primary',
                    tool: 'read_webpage'
                }),
                this.event(runId, 4, 'citation.verified', 'synthesize', {
                    matched: [{ marker: '1', evidence_ids: ['evd-1'] }],
                    unmatched: [],
                    weak: [],
                    citedEvidenceCount: 1
                }),
                this.event(runId, 5, 'run.completed', 'synthesize', { content_chars: 320, warnings: [] })
            ],
            assertions: ({ replay, quality }) => [
                this.expect(replay.metrics.evidence === 1, 'research evidence should be counted'),
                this.expect(replay.citation?.matched === 1, 'citation should match evidence'),
                this.expect((quality.trustDistribution.primary || 0) === 1, 'primary evidence should be tracked'),
                this.expect(!this.hasFinding(quality, 'Research run has no evidence'), 'research evidence finding should not fire')
            ]
        };
    }

    toolFailureDetection() {
        const runId = 'eval-tool-failure';
        return {
            id: 'EVAL-003',
            title: 'tool failure detection',
            events: [
                this.event(runId, 1, 'run.started', 'plan', { mode: 'agent', researchProfile: 'none' }),
                this.event(runId, 2, 'route.completed', 'route', { selectedTools: ['read_file'] }),
                this.event(runId, 3, 'tool.requested', 'act', { tool_call_id: 'tc-1', name: 'read_file' }),
                this.event(runId, 4, 'tool.failed', 'observe', { tool_call_id: 'tc-1', name: 'read_file', result_chars: 120 }),
                this.event(runId, 5, 'run.completed', 'synthesize', { content_chars: 180, warnings: [] })
            ],
            assertions: ({ replay, quality }) => [
                this.expect(replay.metrics.failedTools === 1, 'failed tool should be counted'),
                this.expect(this.hasFinding(quality, 'Tool failure observed'), 'tool failure finding should be emitted'),
                this.expect(quality.score < 100, 'tool failure should reduce score')
            ]
        };
    }

    approvalRejectionDetection() {
        const runId = 'eval-approval-rejected';
        return {
            id: 'EVAL-004',
            title: 'approval rejection detection',
            events: [
                this.event(runId, 1, 'run.started', 'plan', { mode: 'agent', researchProfile: 'none' }),
                this.event(runId, 2, 'approval.required', 'act', { approval_id: 'ap-1', name: 'run_tests', risk: 'project_exec' }),
                this.event(runId, 3, 'approval.resolved', 'act', { approval_id: 'ap-1', name: 'run_tests', status: 'rejected', approved: false }),
                this.event(runId, 4, 'run.failed', 'act', { message: 'user rejected execution' })
            ],
            assertions: ({ replay, quality }) => [
                this.expect(replay.metrics.rejectedApprovals === 1, 'rejected approval should be counted'),
                this.expect(this.hasFinding(quality, 'Approval rejected'), 'approval rejection finding should be emitted'),
                this.expect(this.hasFinding(quality, 'Run did not complete'), 'failed terminal status should be flagged'),
                this.expect(quality.grade === 'fail', 'failed run should receive fail grade')
            ]
        };
    }

    weakCitationDetection() {
        const runId = 'eval-weak-citation';
        return {
            id: 'EVAL-005',
            title: 'weak citation detection',
            events: [
                this.event(runId, 1, 'run.started', 'plan', { mode: 'research', researchProfile: 'general' }),
                this.event(runId, 2, 'evidence.added', 'observe', {
                    evidence_id: 'evd-low',
                    kind: 'search_result',
                    title: 'Search snippet',
                    trustLevel: 'low'
                }),
                this.event(runId, 3, 'citation.verified', 'synthesize', {
                    matched: [],
                    unmatched: [{ marker: '2' }],
                    weak: [{ marker: '1', evidence_ids: ['evd-low'] }],
                    citedEvidenceCount: 1
                }),
                this.event(runId, 4, 'run.completed', 'synthesize', { content_chars: 220, warnings: ['weak citation'] })
            ],
            assertions: ({ replay, quality }) => [
                this.expect(replay.citation?.unmatched === 1, 'unmatched citation should replay'),
                this.expect(replay.citation?.weak === 1, 'weak citation should replay'),
                this.expect(this.hasFinding(quality, 'Unmatched citation markers'), 'unmatched citation finding should be emitted'),
                this.expect(this.hasFinding(quality, 'Weak citations'), 'weak citation finding should be emitted')
            ]
        };
    }

    snapshotFallback() {
        return {
            id: 'EVAL-006',
            title: 'snapshot fallback',
            events: [],
            snapshot: {
                contract_version: 'agent-contract-v1',
                runId: 'eval-snapshot-fallback',
                mode: 'agent',
                researchProfile: 'none',
                stages: [
                    { id: 'plan', state: 'done', note: 'plan ready' },
                    { id: 'synthesize', state: 'done', note: 'completed' }
                ],
                metrics: { failed_tool_calls: 0 },
                tool_results: [{ id: 'tc-snapshot', name: 'calculate', status: 'success', result_chars: 4 }],
                evidence_ledger: [{ id: 'evd-snapshot', kind: 'opened_source', title: 'Snapshot source', trustLevel: 'high' }],
                citation_verification: { matched: [{ marker: '1' }], unmatched: [], weak: [], citedEvidenceCount: 1 },
                warnings: []
            },
            assertions: ({ replay, quality }) => [
                this.expect(replay.status === 'completed', 'snapshot should infer completed status'),
                this.expect(replay.metrics.tools === 1, 'snapshot tool result should be counted'),
                this.expect(replay.metrics.evidence === 1, 'snapshot evidence should be counted'),
                this.expect(quality.score >= 90, 'healthy snapshot fallback should score cleanly')
            ]
        };
    }

    event(runId, seq, type, stage, payload = {}) {
        return {
            id: `evt-${runId}-${seq}`,
            contract_version: 'agent-contract-v1',
            runId,
            seq,
            type,
            ts: `2026-05-28T00:00:${String(seq).padStart(2, '0')}Z`,
            stage,
            payload,
            visibility: type.startsWith('approval.') ? 'audit' : 'history'
        };
    }

    expect(pass, message) {
        return { pass: Boolean(pass), message };
    }

    hasFinding(quality, title) {
        return (quality.findings || []).some(item => item.title === title || item.title.includes(title));
    }
}

window.AgentEvalSuite = AgentEvalSuite;
window.agentEvalSuite = new AgentEvalSuite();
