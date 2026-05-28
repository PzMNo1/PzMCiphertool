/**
 * AgentRunReplay - derives a compact replay/audit view from AgentEvent rows.
 */
class AgentRunReplay {
    constructor() {
        this.STAGES = ['plan', 'route', 'act', 'observe', 'synthesize'];
    }

    build(events = [], snapshot = null) {
        const orderedEvents = this.normalizeEvents(events, snapshot);
        const replay = {
            runId: snapshot?.runId || orderedEvents[0]?.runId || '',
            mode: snapshot?.mode || '',
            researchProfile: snapshot?.researchProfile || '',
            status: orderedEvents.length ? 'running' : 'snapshot',
            startedAt: '',
            finishedAt: '',
            eventCount: orderedEvents.length,
            stageStates: this.defaultStageStates(),
            tools: new Map(),
            approvals: new Map(),
            evidence: [],
            citation: null,
            warnings: Array.isArray(snapshot?.warnings) ? snapshot.warnings : [],
            timeline: orderedEvents
        };

        orderedEvents.forEach(event => this.applyEvent(replay, event));
        this.applySnapshotFallback(replay, snapshot);

        return {
            ...replay,
            tools: Array.from(replay.tools.values()),
            approvals: Array.from(replay.approvals.values()),
            metrics: this.buildMetrics(replay)
        };
    }

    normalizeEvents(events = [], snapshot = null) {
        const fromSnapshot = Array.isArray(snapshot?.events) ? snapshot.events : [];
        const merged = [...(Array.isArray(events) ? events : []), ...fromSnapshot];
        const seen = new Set();
        return merged
            .filter(event => event && event.type && event.type !== 'model.delta')
            .filter(event => {
                const key = `${event.runId || ''}:${event.seq || ''}:${event.type}:${event.ts || ''}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => {
                const seqA = Number(a.seq) || Number.MAX_SAFE_INTEGER;
                const seqB = Number(b.seq) || Number.MAX_SAFE_INTEGER;
                if (seqA !== seqB) return seqA - seqB;
                return Date.parse(a.ts || 0) - Date.parse(b.ts || 0);
            });
    }

    defaultStageStates() {
        return Object.fromEntries(this.STAGES.map(stage => [stage, {
            id: stage,
            state: 'pending',
            note: ''
        }]));
    }

    applyEvent(replay, event) {
        const payload = event.payload || {};
        replay.runId = replay.runId || event.runId || '';
        if (event.ts && !replay.startedAt) replay.startedAt = event.ts;
        if (payload.mode) replay.mode = payload.mode;
        if (payload.researchProfile) replay.researchProfile = payload.researchProfile;

        switch (event.type) {
            case 'run.started':
                replay.status = 'running';
                this.setStage(replay, 'plan', 'active', replay.mode || 'started');
                break;
            case 'context.built':
            case 'plan.created':
                this.setStage(replay, 'plan', 'done', event.type === 'plan.created' ? 'plan ready' : 'context ready');
                break;
            case 'route.completed':
                this.setStage(replay, 'route', 'done', `${(payload.selectedTools || []).length || 0} tools`);
                break;
            case 'model.started':
                this.setStage(replay, event.stage || 'act', 'active', payload.iteration ? `iteration ${payload.iteration}` : 'model');
                break;
            case 'tool.requested':
                this.upsertTool(replay, event, 'requested');
                this.setStage(replay, 'act', 'active', payload.name || 'tool requested');
                break;
            case 'approval.required':
                this.upsertApproval(replay, event, 'waiting');
                this.setStage(replay, 'act', 'active', `approval ${payload.name || ''}`.trim());
                break;
            case 'approval.resolved':
                this.upsertApproval(replay, event, payload.status || 'resolved');
                break;
            case 'tool.started':
                this.upsertTool(replay, event, 'running');
                this.setStage(replay, 'act', 'active', payload.name || 'tool running');
                break;
            case 'tool.completed':
                this.upsertTool(replay, event, 'success');
                this.setStage(replay, 'observe', 'done', payload.name || 'tool completed');
                break;
            case 'tool.failed':
                this.upsertTool(replay, event, 'error');
                this.setStage(replay, 'observe', 'error', payload.name || 'tool failed');
                break;
            case 'evidence.added':
                replay.evidence.push({
                    id: payload.evidence_id || '',
                    kind: payload.kind || '',
                    title: payload.title || '',
                    url: payload.url || '',
                    trustLevel: payload.trustLevel || '',
                    tool: payload.tool || ''
                });
                break;
            case 'synthesis.started':
                this.setStage(replay, 'act', 'done', 'tool loop complete');
                this.setStage(replay, 'synthesize', 'active', 'synthesis');
                break;
            case 'citation.verified':
                replay.citation = {
                    matched: (payload.matched || []).length,
                    unmatched: (payload.unmatched || []).length,
                    weak: (payload.weak || []).length,
                    citedEvidenceCount: payload.citedEvidenceCount || 0
                };
                this.setStage(replay, 'synthesize', 'active', 'citations verified');
                break;
            case 'run.completed':
                replay.status = 'completed';
                replay.finishedAt = event.ts || replay.finishedAt;
                replay.warnings = Array.isArray(payload.warnings) ? payload.warnings : replay.warnings;
                this.setStage(replay, 'synthesize', 'done', 'completed');
                break;
            case 'run.failed':
                replay.status = 'failed';
                replay.finishedAt = event.ts || replay.finishedAt;
                this.setStage(replay, event.stage || 'act', 'error', payload.message || 'failed');
                break;
            case 'run.cancelled':
                replay.status = 'cancelled';
                replay.finishedAt = event.ts || replay.finishedAt;
                this.setStage(replay, event.stage || 'act', 'error', 'cancelled');
                break;
            default:
                if (event.stage) this.setStage(replay, event.stage, 'active', event.type);
        }
    }

    applySnapshotFallback(replay, snapshot) {
        if (!snapshot) return;
        replay.runId = replay.runId || snapshot.runId || '';
        replay.mode = replay.mode || snapshot.mode || '';
        replay.researchProfile = replay.researchProfile || snapshot.researchProfile || '';

        if (Array.isArray(snapshot.stages)) {
            snapshot.stages.forEach(stage => {
                if (!stage?.id || !replay.stageStates[stage.id]) return;
                if (replay.stageStates[stage.id].state === 'pending' || replay.eventCount === 0) {
                    replay.stageStates[stage.id] = {
                        id: stage.id,
                        state: stage.state || 'pending',
                        note: stage.note || ''
                    };
                }
            });
        }

        if (Array.isArray(snapshot.tool_results) && replay.tools.size === 0) {
            snapshot.tool_results.forEach(tool => {
                const key = tool.id || `${tool.name || 'tool'}-${replay.tools.size + 1}`;
                replay.tools.set(key, {
                    id: key,
                    name: tool.name || '',
                    status: tool.status || '',
                    risk: tool.risk || '',
                    resultChars: tool.result_chars || 0,
                    startedAt: tool.started_at || tool.executed_at || '',
                    finishedAt: tool.finished_at || ''
                });
            });
        }

        if (Array.isArray(snapshot.evidence_ledger) && replay.evidence.length === 0) {
            replay.evidence = snapshot.evidence_ledger.map(item => ({
                id: item.id || '',
                kind: item.kind || '',
                title: item.title || '',
                url: item.url || '',
                trustLevel: item.trustLevel || '',
                tool: item.tool || ''
            }));
        }

        if (!replay.citation && snapshot.citation_verification) {
            replay.citation = {
                matched: (snapshot.citation_verification.matched || []).length,
                unmatched: (snapshot.citation_verification.unmatched || []).length,
                weak: (snapshot.citation_verification.weak || []).length,
                citedEvidenceCount: snapshot.citation_verification.citedEvidenceCount || 0
            };
        }

        if (snapshot.metrics && replay.status === 'snapshot') {
            replay.status = snapshot.metrics.failed_tool_calls > 0 ? 'completed_with_errors' : 'completed';
        }
    }

    setStage(replay, stage, state, note = '') {
        if (!this.STAGES.includes(stage)) return;
        const current = replay.stageStates[stage] || { id: stage, state: 'pending', note: '' };
        const rank = { pending: 0, active: 1, error: 2, done: 3 };
        const nextState = (rank[state] || 0) >= (rank[current.state] || 0) ? state : current.state;
        replay.stageStates[stage] = {
            id: stage,
            state: nextState,
            note: note || current.note
        };
    }

    upsertTool(replay, event, status) {
        const payload = event.payload || {};
        const key = payload.tool_call_id || payload.name || `tool-${event.seq || replay.tools.size + 1}`;
        const existing = replay.tools.get(key) || {
            id: key,
            name: payload.name || '',
            status: 'pending',
            risk: payload.metadata?.risk || '',
            resultChars: 0,
            startedAt: '',
            finishedAt: ''
        };
        existing.name = payload.name || existing.name;
        existing.status = status || existing.status;
        existing.risk = payload.metadata?.risk || existing.risk;
        if (status === 'running' && !existing.startedAt) existing.startedAt = event.ts || '';
        if (status === 'success' || status === 'error') existing.finishedAt = event.ts || '';
        if (payload.result_chars !== undefined) existing.resultChars = payload.result_chars;
        replay.tools.set(key, existing);
    }

    upsertApproval(replay, event, status) {
        const payload = event.payload || {};
        const key = payload.approval_id || payload.tool_call_id || payload.name || `approval-${event.seq || replay.approvals.size + 1}`;
        const existing = replay.approvals.get(key) || {
            id: key,
            tool: payload.name || '',
            risk: payload.risk || '',
            status: 'waiting',
            edited: false,
            resolvedAt: ''
        };
        existing.tool = payload.name || existing.tool;
        existing.risk = payload.risk || existing.risk;
        existing.status = status || existing.status;
        existing.edited = Boolean(payload.edited || existing.edited);
        if (event.type === 'approval.resolved') existing.resolvedAt = event.ts || '';
        replay.approvals.set(key, existing);
    }

    buildMetrics(replay) {
        const tools = Array.from(replay.tools.values());
        const approvals = Array.from(replay.approvals.values());
        return {
            events: replay.eventCount,
            tools: tools.length,
            successfulTools: tools.filter(tool => tool.status === 'success').length,
            failedTools: tools.filter(tool => tool.status === 'error').length,
            approvals: approvals.length,
            rejectedApprovals: approvals.filter(item => item.status === 'rejected').length,
            evidence: replay.evidence.length,
            warnings: replay.warnings.length
        };
    }
}

window.AgentRunReplay = AgentRunReplay;
window.agentRunReplay = new AgentRunReplay();
