/**
 * AgentRunQuality - lightweight, explainable quality signals for replayed runs.
 */
class AgentRunQuality {
    build(replay = {}) {
        const findings = [];
        let score = 100;
        const metrics = replay.metrics || {};
        const timing = this.computeTiming(replay);
        const trustDistribution = this.computeTrustDistribution(replay.evidence || []);
        const citation = replay.citation || null;

        const penalize = (severity, title, detail, points) => {
            findings.push({ severity, title, detail, points });
            score -= points;
        };

        if (replay.status === 'failed' || replay.status === 'cancelled') {
            penalize('critical', 'Run did not complete', `Status is ${replay.status}.`, 35);
        } else if (replay.status === 'running' && metrics.events > 0) {
            penalize('medium', 'No terminal event', 'The event stream has no run.completed/run.failed/run.cancelled event.', 12);
        }

        if (metrics.failedTools > 0) {
            penalize('high', 'Tool failure observed', `${metrics.failedTools} tool call(s) failed.`, Math.min(25, metrics.failedTools * 12));
        }

        if (metrics.rejectedApprovals > 0) {
            penalize('medium', 'Approval rejected', `${metrics.rejectedApprovals} approval request(s) were rejected.`, Math.min(16, metrics.rejectedApprovals * 8));
        }

        if (citation) {
            if (citation.unmatched > 0) {
                penalize('high', 'Unmatched citation markers', `${citation.unmatched} final-answer citation marker(s) did not map to evidence.`, Math.min(25, citation.unmatched * 10));
            }
            if (citation.weak > 0) {
                penalize('medium', 'Weak citations', `${citation.weak} citation marker(s) only map to weak or low-trust evidence.`, Math.min(18, citation.weak * 6));
            }
        }

        const researchLike = replay.mode === 'research' || ['academic', 'general'].includes(replay.researchProfile || '');
        if (researchLike && metrics.evidence === 0) {
            penalize('high', 'Research run has no evidence', 'The run profile implies external research but no evidence was recorded.', 18);
        }

        const weakEvidenceCount = (trustDistribution.low || 0) + (trustDistribution.unknown || 0);
        if (metrics.evidence >= 3 && weakEvidenceCount / metrics.evidence > 0.5) {
            penalize('medium', 'Evidence trust is weak', `${weakEvidenceCount}/${metrics.evidence} evidence item(s) are low or unknown trust.`, 8);
        }

        if (metrics.warnings > 0) {
            penalize('low', 'Runtime warnings', `${metrics.warnings} warning(s) were recorded.`, Math.min(12, metrics.warnings * 4));
        }

        if (timing.durationMs > 900000) {
            penalize('medium', 'Long run duration', `Run duration was ${this.formatDuration(timing.durationMs)}.`, 8);
        } else if (timing.durationMs > 300000) {
            penalize('low', 'Long run duration', `Run duration was ${this.formatDuration(timing.durationMs)}.`, 4);
        }

        score = Math.max(0, Math.min(100, score));
        return {
            score,
            grade: this.grade(score, findings),
            findings,
            timing: {
                ...timing,
                durationLabel: this.formatDuration(timing.durationMs)
            },
            trustDistribution,
            citation,
            summary: this.summary(score, findings)
        };
    }

    computeTiming(replay = {}) {
        const events = Array.isArray(replay.timeline) ? replay.timeline : [];
        const eventTimes = events
            .map(event => ({ event, time: Date.parse(event.ts || '') }))
            .filter(item => Number.isFinite(item.time))
            .sort((a, b) => a.time - b.time);
        const start = Date.parse(replay.startedAt || '') || eventTimes[0]?.time || 0;
        const end = Date.parse(replay.finishedAt || '') || eventTimes[eventTimes.length - 1]?.time || start;
        const stages = {};

        eventTimes.forEach(({ event, time }) => {
            const stage = event.stage || 'unknown';
            if (!stages[stage]) {
                stages[stage] = { stage, startMs: time, endMs: time, events: 0 };
            }
            stages[stage].startMs = Math.min(stages[stage].startMs, time);
            stages[stage].endMs = Math.max(stages[stage].endMs, time);
            stages[stage].events += 1;
        });

        return {
            startedAt: start ? new Date(start).toISOString() : '',
            finishedAt: end ? new Date(end).toISOString() : '',
            durationMs: Math.max(0, end - start),
            stages: Object.values(stages).map(item => ({
                stage: item.stage,
                durationMs: Math.max(0, item.endMs - item.startMs),
                durationLabel: this.formatDuration(Math.max(0, item.endMs - item.startMs)),
                events: item.events
            }))
        };
    }

    computeTrustDistribution(evidence = []) {
        return evidence.reduce((acc, item) => {
            const key = item.trustLevel || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }

    grade(score, findings) {
        if (findings.some(item => item.severity === 'critical') || score < 50) return 'fail';
        if (score < 75 || findings.some(item => item.severity === 'high')) return 'risk';
        if (score < 90 || findings.some(item => item.severity === 'medium')) return 'watch';
        return 'clean';
    }

    summary(score, findings) {
        if (!findings.length) return `Quality score ${score}: no obvious replay issues.`;
        const top = findings[0];
        return `Quality score ${score}: ${top.title}.`;
    }

    formatDuration(ms) {
        const value = Math.max(0, Number(ms) || 0);
        if (value < 1000) return `${value}ms`;
        const seconds = Math.round(value / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const rest = seconds % 60;
        return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
    }
}

window.AgentRunQuality = AgentRunQuality;
window.agentRunQuality = new AgentRunQuality();
