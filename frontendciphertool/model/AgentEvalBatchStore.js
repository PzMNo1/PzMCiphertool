/**
 * AgentEvalBatchStore - local history for eval batch reports.
 * Live eval cases already save individual AgentRuns; this store keeps the run
 * group, pass rate, failures, and run ids together for trend review.
 */
class AgentEvalBatchStore {
    constructor() {
        this.STORAGE_KEY = 'agentEvalBatchStoreV1';
        this.MAX_BATCHES = 80;
        this.MAX_CASES = 60;
        this.MAX_TEXT_FIELD = 4000;
    }

    getStore() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed && typeof parsed === 'object'
                ? {
                    version: parsed.version || 'agent-eval-batch-store-v1',
                    batches: parsed.batches && typeof parsed.batches === 'object' ? parsed.batches : {}
                }
                : { version: 'agent-eval-batch-store-v1', batches: {} };
        } catch (e) {
            console.warn('AgentEvalBatchStore read failed:', e);
            return { version: 'agent-eval-batch-store-v1', batches: {} };
        }
    }

    saveStore(store) {
        const normalized = this.pruneStore(store || { batches: {} });
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
        } catch (e) {
            console.warn('AgentEvalBatchStore save failed, retrying with fewer batches:', e);
            const compact = this.pruneStore(normalized, Math.max(20, Math.floor(this.MAX_BATCHES / 2)));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(compact));
        }
    }

    saveBatch(result, options = {}) {
        if (!result || typeof result !== 'object') return null;
        const store = this.getStore();
        const now = new Date().toISOString();
        const batchId = result.batchId || options.batchId || this.createBatchId(options.type || result.type || 'eval');
        const existing = store.batches[batchId] || {};
        const record = this.normalizeBatch({
            ...result,
            batchId,
            type: options.type || result.type || existing.type || 'live',
            label: options.label || result.label || existing.label || '',
            selectedCaseIds: options.selectedCaseIds || result.selectedCaseIds || existing.selectedCaseIds || [],
            savedAt: existing.savedAt || now,
            updatedAt: now
        });
        store.batches[batchId] = record;
        this.saveStore(store);
        return record;
    }

    getBatch(batchId) {
        if (!batchId) return null;
        const record = this.getStore().batches[String(batchId)] || null;
        return record ? this.normalizeBatch(record) : null;
    }

    listBatches(limit = 40, type = '') {
        return Object.values(this.getStore().batches || {})
            .filter(record => record?.batchId)
            .map(record => this.normalizeBatch(record))
            .filter(record => !type || record.type === type)
            .sort((a, b) => Date.parse(b.updatedAt || b.runAt || 0) - Date.parse(a.updatedAt || a.runAt || 0))
            .slice(0, limit);
    }

    latestDiff(type = 'live') {
        const batches = this.listBatches(2, type);
        return this.compareBatches(batches[0] || null, batches[1] || null);
    }

    compareBatches(currentBatch, previousBatch) {
        if (!currentBatch || !previousBatch) {
            return {
                hasComparison: false,
                status: 'insufficient',
                summary: 'Need at least two saved batches to compute trend.',
                current: currentBatch ? this.normalizeBatch(currentBatch) : null,
                previous: previousBatch ? this.normalizeBatch(previousBatch) : null,
                deltas: {},
                cases: {
                    newFailures: [],
                    recovered: [],
                    persistentFailures: [],
                    scoreDrops: [],
                    scoreGains: [],
                    slower: [],
                    faster: [],
                    added: [],
                    removed: []
                }
            };
        }

        const current = this.normalizeBatch(currentBatch);
        const previous = this.normalizeBatch(previousBatch);
        const currentCases = this.caseMap(current.cases);
        const previousCases = this.caseMap(previous.cases);
        const allCaseIds = Array.from(new Set([...Object.keys(currentCases), ...Object.keys(previousCases)]));
        const cases = {
            newFailures: [],
            recovered: [],
            persistentFailures: [],
            scoreDrops: [],
            scoreGains: [],
            slower: [],
            faster: [],
            added: [],
            removed: []
        };

        allCaseIds.forEach(id => {
            const currentCase = currentCases[id] || null;
            const previousCase = previousCases[id] || null;
            if (currentCase && !previousCase) {
                cases.added.push(this.caseDiffItem(currentCase, previousCase));
                if (!currentCase.pass) cases.newFailures.push(this.caseDiffItem(currentCase, previousCase));
                return;
            }
            if (!currentCase && previousCase) {
                cases.removed.push(this.caseDiffItem(currentCase, previousCase));
                return;
            }
            if (!currentCase || !previousCase) return;

            if (!currentCase.pass && previousCase.pass) cases.newFailures.push(this.caseDiffItem(currentCase, previousCase));
            if (currentCase.pass && !previousCase.pass) cases.recovered.push(this.caseDiffItem(currentCase, previousCase));
            if (!currentCase.pass && !previousCase.pass) cases.persistentFailures.push(this.caseDiffItem(currentCase, previousCase));

            const scoreDelta = this.numericDelta(currentCase.score, previousCase.score);
            if (scoreDelta !== null && scoreDelta <= -10) cases.scoreDrops.push(this.caseDiffItem(currentCase, previousCase, { scoreDelta }));
            if (scoreDelta !== null && scoreDelta >= 10) cases.scoreGains.push(this.caseDiffItem(currentCase, previousCase, { scoreDelta }));

            const durationDeltaMs = this.numericDelta(currentCase.durationMs, previousCase.durationMs);
            if (durationDeltaMs !== null) {
                const previousDuration = Number(previousCase.durationMs) || 0;
                const ratio = previousDuration > 0 ? Number(currentCase.durationMs) / previousDuration : 0;
                if (durationDeltaMs >= 1000 && ratio >= 1.25) cases.slower.push(this.caseDiffItem(currentCase, previousCase, { durationDeltaMs }));
                if (durationDeltaMs <= -1000 && previousDuration > 0) cases.faster.push(this.caseDiffItem(currentCase, previousCase, { durationDeltaMs }));
            }
        });

        Object.keys(cases).forEach(key => {
            cases[key] = cases[key].sort((a, b) => String(a.id).localeCompare(String(b.id)));
        });

        const deltas = {
            passRate: current.passRate - previous.passRate,
            averageScore: this.numericDelta(current.averageScore, previous.averageScore),
            durationMs: current.durationMs - previous.durationMs,
            passed: current.passed - previous.passed,
            failed: current.failed - previous.failed,
            total: current.total - previous.total
        };
        const regressionSignals = [
            cases.newFailures.length > 0,
            deltas.passRate <= -5,
            deltas.averageScore !== null && deltas.averageScore <= -5,
            cases.slower.length > 0
        ].filter(Boolean).length;
        const improvementSignals = [
            cases.recovered.length > 0,
            deltas.passRate >= 5,
            deltas.averageScore !== null && deltas.averageScore >= 5,
            cases.faster.length > 0
        ].filter(Boolean).length;
        const status = regressionSignals && improvementSignals
            ? 'mixed'
            : regressionSignals ? 'regressed'
                : improvementSignals ? 'improved'
                    : 'stable';

        return {
            hasComparison: true,
            status,
            summary: this.diffSummary(status, deltas, cases),
            current,
            previous,
            deltas,
            cases
        };
    }

    deleteBatch(batchId) {
        if (!batchId) return false;
        const store = this.getStore();
        if (!store.batches[batchId]) return false;
        delete store.batches[batchId];
        this.saveStore(store);
        return true;
    }

    normalizeBatch(batch = {}) {
        const cases = (Array.isArray(batch.cases) ? batch.cases : [])
            .slice(0, this.MAX_CASES)
            .map(item => this.normalizeCase(item));
        const passed = Number.isFinite(batch.passed) ? batch.passed : cases.filter(item => item.pass).length;
        const total = Number.isFinite(batch.total) ? batch.total : cases.length;
        const failed = Number.isFinite(batch.failed) ? batch.failed : Math.max(0, total - passed);
        const scores = cases.map(item => Number(item.score)).filter(score => Number.isFinite(score));
        const averageScore = scores.length
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : null;
        const runIds = cases.map(item => item.runId).filter(Boolean);
        const failedCaseIds = cases.filter(item => !item.pass).map(item => item.id).filter(Boolean);
        const pass = batch.pass === undefined ? total > 0 && passed === total : Boolean(batch.pass);
        return this.truncateDeep({
            batchId: batch.batchId || this.createBatchId(batch.type || 'eval'),
            type: batch.type || 'live',
            label: batch.label || '',
            version: batch.version || '',
            runAt: batch.runAt || batch.savedAt || new Date().toISOString(),
            savedAt: batch.savedAt || batch.runAt || new Date().toISOString(),
            updatedAt: batch.updatedAt || batch.savedAt || batch.runAt || new Date().toISOString(),
            durationMs: Number.isFinite(batch.durationMs) ? batch.durationMs : 0,
            total,
            passed,
            failed,
            pass,
            passRate: total ? Math.round((passed / total) * 100) : 0,
            averageScore,
            selectedCaseIds: Array.isArray(batch.selectedCaseIds) ? batch.selectedCaseIds.slice(0, this.MAX_CASES) : cases.map(item => item.id).filter(Boolean),
            failedCaseIds,
            runIds,
            warnings: Array.isArray(batch.warnings) ? batch.warnings.slice(0, 20) : [],
            cases
        });
    }

    normalizeCase(item = {}) {
        return this.truncateDeep({
            id: item.id || '',
            title: item.title || '',
            pass: Boolean(item.pass),
            durationMs: Number.isFinite(item.durationMs) ? item.durationMs : 0,
            score: Number.isFinite(item.score) ? item.score : null,
            grade: item.grade || '',
            runId: item.runId || '',
            risk: item.risk || '',
            usesTools: Boolean(item.usesTools),
            usesNetwork: Boolean(item.usesNetwork),
            requiresBackend: Boolean(item.requiresBackend),
            requiresApproval: Boolean(item.requiresApproval),
            warnings: Array.isArray(item.warnings) ? item.warnings.slice(0, 10) : [],
            failures: Array.isArray(item.failures) ? item.failures.slice(0, 12) : [],
            findings: Array.isArray(item.findings)
                ? item.findings.slice(0, 12).map(finding => ({
                    severity: finding?.severity || '',
                    title: finding?.title || ''
                }))
                : []
        });
    }

    caseMap(cases = []) {
        return Object.fromEntries((Array.isArray(cases) ? cases : [])
            .filter(item => item?.id)
            .map(item => [item.id, item]));
    }

    numericDelta(current, previous) {
        const currentNumber = Number(current);
        const previousNumber = Number(previous);
        if (!Number.isFinite(currentNumber) || !Number.isFinite(previousNumber)) return null;
        return currentNumber - previousNumber;
    }

    caseDiffItem(currentCase, previousCase, extra = {}) {
        const current = currentCase || {};
        const previous = previousCase || {};
        return {
            id: current.id || previous.id || '',
            title: current.title || previous.title || '',
            currentPass: currentCase ? Boolean(current.pass) : null,
            previousPass: previousCase ? Boolean(previous.pass) : null,
            currentScore: Number.isFinite(current.score) ? current.score : null,
            previousScore: Number.isFinite(previous.score) ? previous.score : null,
            currentDurationMs: Number.isFinite(current.durationMs) ? current.durationMs : null,
            previousDurationMs: Number.isFinite(previous.durationMs) ? previous.durationMs : null,
            runId: current.runId || '',
            ...extra
        };
    }

    diffSummary(status, deltas, cases) {
        if (status === 'regressed') {
            return `${cases.newFailures.length} new failure(s), pass rate ${this.formatSigned(deltas.passRate)}pt.`;
        }
        if (status === 'improved') {
            return `${cases.recovered.length} recovered case(s), pass rate ${this.formatSigned(deltas.passRate)}pt.`;
        }
        if (status === 'mixed') {
            return `${cases.newFailures.length} new failure(s), ${cases.recovered.length} recovered case(s).`;
        }
        return `Stable. Pass rate ${this.formatSigned(deltas.passRate)}pt.`;
    }

    formatSigned(value) {
        const number = Number(value) || 0;
        return number > 0 ? `+${number}` : String(number);
    }

    pruneStore(store, maxBatches = this.MAX_BATCHES) {
        const entries = Object.values(store.batches || {})
            .filter(record => record?.batchId)
            .sort((a, b) => Date.parse(b.updatedAt || b.runAt || 0) - Date.parse(a.updatedAt || a.runAt || 0))
            .slice(0, maxBatches);
        return {
            version: store.version || 'agent-eval-batch-store-v1',
            batches: Object.fromEntries(entries.map(record => [record.batchId, record]))
        };
    }

    truncateDeep(value) {
        if (typeof value === 'string') {
            return value.length <= this.MAX_TEXT_FIELD ? value : `${value.slice(0, this.MAX_TEXT_FIELD)}\n[AgentEvalBatchStore truncated]`;
        }
        if (Array.isArray(value)) return value.map(item => this.truncateDeep(item));
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.truncateDeep(item)]));
        }
        return value;
    }

    createBatchId(type = 'eval') {
        const safeType = String(type || 'eval').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'eval';
        return `batch-${safeType}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`;
    }
}

window.AgentEvalBatchStore = AgentEvalBatchStore;
window.agentEvalBatchStore = new AgentEvalBatchStore();
