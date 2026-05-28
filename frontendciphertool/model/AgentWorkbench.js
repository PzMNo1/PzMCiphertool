/**
 * AgentWorkbench - run list and replay panel backed by AgentRun snapshots/events.
 */
class AgentWorkbench {
    constructor(options = {}) {
        this.store = options.store || window.agentRunStore;
        this.replay = options.replay || window.agentRunReplay;
        this.quality = options.quality || window.agentRunQuality;
        this.evalSuite = options.evalSuite || window.agentEvalSuite;
        this.liveEvalRunner = options.liveEvalRunner || window.agentLiveEvalRunner;
        this.evalBatchStore = options.evalBatchStore || window.agentEvalBatchStore;
        this.evalDiagnostics = options.evalDiagnostics || window.agentEvalDiagnostics;
        this.records = [];
        this.selectedRunId = '';
        this.mounted = false;
    }

    getStore() {
        return this.store || window.agentRunStore;
    }

    getReplay() {
        return this.replay || window.agentRunReplay;
    }

    getQuality() {
        return this.quality || window.agentRunQuality;
    }

    getEvalSuite() {
        return this.evalSuite || window.agentEvalSuite;
    }

    getLiveEvalRunner() {
        return this.liveEvalRunner || window.agentLiveEvalRunner;
    }

    getEvalBatchStore() {
        return this.evalBatchStore || window.agentEvalBatchStore;
    }

    getEvalDiagnostics() {
        return this.evalDiagnostics || window.agentEvalDiagnostics;
    }

    mount() {
        if (this.mounted) return;
        this.ensureShell();
        this.bindLauncher();
        this.mounted = true;
    }

    bindLauncher() {
        const button = document.getElementById('agent-workbench-open');
        if (!button || button.dataset.agentWorkbenchBound === 'true') return;
        button.dataset.agentWorkbenchBound = 'true';
        button.addEventListener('click', () => this.open());
    }

    ensureShell() {
        if (document.getElementById('agent-workbench-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'agent-workbench-overlay';
        overlay.className = 'agent-workbench-overlay';
        overlay.hidden = true;
        overlay.innerHTML = `
            <div class="agent-workbench-shell" role="dialog" aria-modal="true" aria-labelledby="agent-workbench-title">
                <header class="agent-workbench-header">
                    <div>
                        <div id="agent-workbench-title" class="agent-workbench-title">Agent 智能体工作台</div>
                        <div class="agent-workbench-subtitle" data-agent-workbench-status>Run replay</div>
                    </div>
                    <div class="agent-workbench-actions">
                        <button id="agent-workbench-eval" class="agent-workbench-command" type="button" title="Run offline eval suite">Eval</button>
                        <button id="agent-workbench-live-eval" class="agent-workbench-command" type="button" title="Run live runtime matrix">Live</button>
                        <button id="agent-workbench-batches" class="agent-workbench-command" type="button" title="Live eval batch history">Batches</button>
                        <button id="agent-workbench-refresh" class="agent-workbench-icon-btn" type="button" title="Refresh">↻</button>
                        <button id="agent-workbench-close" class="agent-workbench-icon-btn" type="button" title="Close">×</button>
                    </div>
                </header>
                <div class="agent-workbench-body">
                    <aside class="agent-workbench-list-pane">
                        <div class="agent-workbench-search">
                            <input id="agent-workbench-search" type="text" placeholder="搜索 run / chat / mode">
                        </div>
                        <div id="agent-workbench-list" class="agent-workbench-list"></div>
                    </aside>
                    <section id="agent-workbench-detail" class="agent-workbench-detail"></section>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) this.close();
        });
        overlay.querySelector('#agent-workbench-eval')?.addEventListener('click', () => this.runEvalSuite());
        overlay.querySelector('#agent-workbench-live-eval')?.addEventListener('click', () => this.showLiveEvalMatrix());
        overlay.querySelector('#agent-workbench-batches')?.addEventListener('click', () => this.renderEvalBatchHistory());
        overlay.querySelector('#agent-workbench-close')?.addEventListener('click', () => this.close());
        overlay.querySelector('#agent-workbench-refresh')?.addEventListener('click', () => this.loadRuns({ force: true }));
        overlay.querySelector('#agent-workbench-search')?.addEventListener('input', event => {
            this.renderRunList(event.target.value);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !overlay.hidden) this.close();
        });
    }

    async open() {
        this.ensureShell();
        this.bindLauncher();
        const overlay = document.getElementById('agent-workbench-overlay');
        if (!overlay) return;
        overlay.hidden = false;
        await this.loadRuns();
    }

    close() {
        const overlay = document.getElementById('agent-workbench-overlay');
        if (overlay) overlay.hidden = true;
    }

    async loadRuns() {
        this.setStatus('Loading runs');
        const list = document.getElementById('agent-workbench-list');
        const detail = document.getElementById('agent-workbench-detail');
        if (list) list.innerHTML = '<div class="agent-workbench-empty">Loading</div>';
        if (detail) detail.innerHTML = '';
        try {
            this.records = await this.getStore()?.listRunRecords?.(80) || [];
            this.renderRunList();
            const nextRunId = this.records.some(record => record.runId === this.selectedRunId)
                ? this.selectedRunId
                : this.records[0]?.runId || '';
            if (nextRunId) {
                await this.selectRun(nextRunId);
            } else {
                this.renderEmptyDetail('No AgentRun records');
            }
            this.setStatus(`${this.records.length} runs`);
        } catch (e) {
            this.records = [];
            this.renderRunList();
            this.renderEmptyDetail(e.message || 'Failed to load runs');
            this.setStatus('Load failed');
        }
    }

    renderRunList(query = '') {
        const list = document.getElementById('agent-workbench-list');
        if (!list) return;
        const needle = String(query || '').trim().toLowerCase();
        const records = this.records.filter(record => {
            if (!needle) return true;
            return [record.runId, record.chatId, record.mode, record.researchProfile, record.source]
                .some(value => String(value || '').toLowerCase().includes(needle));
        });
        if (!records.length) {
            list.innerHTML = '<div class="agent-workbench-empty">No runs</div>';
            return;
        }
        list.innerHTML = '';
        records.forEach(record => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = `agent-workbench-run ${record.runId === this.selectedRunId ? 'active' : ''}`;
            item.dataset.runId = record.runId;
            item.innerHTML = `
                <span class="agent-workbench-run-main">${this.escapeHtml(record.mode || record.snapshot?.mode || 'agent')}</span>
                <span class="agent-workbench-run-id">${this.escapeHtml(this.shortId(record.runId))}</span>
                <span class="agent-workbench-run-meta">${this.escapeHtml(this.formatTime(record.updatedAt || record.savedAt))}</span>
            `;
            item.addEventListener('click', () => this.selectRun(record.runId));
            list.appendChild(item);
        });
    }

    async selectRun(runId) {
        if (!runId) return;
        this.selectedRunId = runId;
        this.renderRunList(document.getElementById('agent-workbench-search')?.value || '');
        const detail = document.getElementById('agent-workbench-detail');
        if (detail) detail.innerHTML = '<div class="agent-workbench-empty">Loading replay</div>';

        const store = this.getStore();
        const record = this.records.find(item => item.runId === runId) || store?.getRecord?.(runId) || {};
        const snapshot = record.snapshot || store?.getRun?.(runId) || null;
        const events = await store?.fetchRunEvents?.(runId, 800) || [];
        const replay = this.getReplay()?.build?.(events, snapshot) || null;
        this.renderReplay(record, replay, events.length);
    }

    async openEvalRun(runId) {
        if (!runId) {
            this.setStatus('No run id');
            return;
        }
        const store = this.getStore();
        try {
            this.setStatus(`Opening ${this.shortId(runId)}`);
            if (!this.records.some(item => item.runId === runId)) {
                const localRecord = store?.getRecord?.(runId) || null;
                if (localRecord) {
                    this.records = [localRecord, ...this.records.filter(item => item.runId !== runId)];
                } else {
                    const latest = await store?.listRunRecords?.(80);
                    if (Array.isArray(latest)) this.records = latest;
                }
            }
            this.renderRunList(document.getElementById('agent-workbench-search')?.value || '');
            await this.selectRun(runId);
            this.setStatus(`Replay ${this.shortId(runId)}`);
        } catch (e) {
            this.renderEmptyDetail(e.message || 'Failed to open eval run');
            this.setStatus('Replay open failed');
        }
    }

    runEvalSuite() {
        const suite = this.getEvalSuite();
        if (!suite?.runAll) {
            this.renderEmptyDetail('Eval suite is unavailable');
            return;
        }
        const result = suite.runAll();
        this.renderEvalResult(result);
        this.setStatus(`Eval ${result.passed}/${result.total}`);
    }

    showLiveEvalMatrix() {
        const runner = this.getLiveEvalRunner();
        const cases = runner?.getCases?.() || runner?.liveCases?.() || [];
        if (!runner || !cases.length) {
            this.renderEmptyDetail('Live eval runner is unavailable');
            return;
        }
        const defaultIds = new Set(runner.defaultCaseIds?.() || cases.filter(item => item.defaultSelected || item.default).map(item => item.id));
        const detail = document.getElementById('agent-workbench-detail');
        if (!detail) return;
        detail.innerHTML = `
            <div class="agent-workbench-detail-header">
                <div>
                    <div class="agent-workbench-detail-title">Agent Live Eval Matrix</div>
                    <div class="agent-workbench-detail-id">${this.escapeHtml(runner.version || '')}</div>
                </div>
                <div class="agent-workbench-status-pill running">select cases</div>
            </div>

            <div class="agent-workbench-live-toolbar">
                <button class="agent-workbench-command" type="button" data-agent-live-run-selected>Run Selected</button>
                <button class="agent-workbench-command" type="button" data-agent-live-run-smoke>Smoke</button>
                <button class="agent-workbench-command" type="button" data-agent-live-run-all>All</button>
                <span data-agent-live-error></span>
            </div>

            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Cases</div>
                <div class="agent-workbench-live-cases">
                    ${cases.map(item => this.renderLiveEvalCase(item, defaultIds.has(item.id))).join('')}
                </div>
            </div>
        `;
        detail.querySelector('[data-agent-live-run-selected]')?.addEventListener('click', () => {
            const ids = this.collectSelectedLiveCaseIds(detail);
            const error = detail.querySelector('[data-agent-live-error]');
            if (!ids.length) {
                if (error) error.textContent = 'Select at least one case';
                this.setStatus('Live eval selection empty');
                return;
            }
            this.runLiveEval(ids);
        });
        detail.querySelector('[data-agent-live-run-smoke]')?.addEventListener('click', () => {
            this.runLiveEval(runner.defaultCaseIds?.() || Array.from(defaultIds));
        });
        detail.querySelector('[data-agent-live-run-all]')?.addEventListener('click', () => {
            this.runLiveEval(cases.map(item => item.id));
        });
        detail.querySelectorAll('.agent-workbench-live-case input').forEach(input => {
            input.addEventListener('change', () => {
                input.closest('.agent-workbench-live-case')?.classList.toggle('selected', input.checked);
                this.setStatus(`${this.collectSelectedLiveCaseIds(detail).length}/${cases.length} live cases selected`);
            });
        });
        this.setStatus(`${defaultIds.size}/${cases.length} live cases selected`);
    }

    renderLiveEvalCase(item, selected) {
        return `
            <label class="agent-workbench-live-case ${selected ? 'selected' : ''}">
                <input type="checkbox" value="${this.escapeHtml(item.id || '')}" ${selected ? 'checked' : ''}>
                <span class="agent-workbench-live-case-main">
                    <span class="agent-workbench-live-case-title">
                        <strong>${this.escapeHtml(item.id || '')}</strong>
                        <span>${this.escapeHtml(item.title || '')}</span>
                    </span>
                    <span class="agent-workbench-live-case-prompt">${this.escapeHtml(item.prompt || '')}</span>
                    ${this.renderCaseTags(item)}
                </span>
            </label>
        `;
    }

    collectSelectedLiveCaseIds(root) {
        return Array.from(root.querySelectorAll('.agent-workbench-live-case input:checked'))
            .map(input => input.value)
            .filter(Boolean);
    }

    async runLiveEval(caseIds = null) {
        const runner = this.getLiveEvalRunner();
        if (!runner?.runSelected && !runner?.runSmoke) {
            this.renderEmptyDetail('Live eval runner is unavailable');
            return;
        }
        const ids = Array.isArray(caseIds) ? caseIds.filter(Boolean) : null;
        const detail = document.getElementById('agent-workbench-detail');
        if (detail) {
            const countLabel = ids?.length ? `${ids.length} case(s)` : 'default smoke';
            detail.innerHTML = `<div class="agent-workbench-empty">Running live eval: ${this.escapeHtml(countLabel)}. This calls the configured model API.</div>`;
        }
        this.setStatus('Live eval running');
        const result = runner.runSelected
            ? await runner.runSelected(ids)
            : await runner.runSmoke();
        const batchRecord = this.saveLiveEvalBatch(result, ids);
        this.renderEvalResult(result, { live: true, batchRecord });
        this.setStatus(`Live ${result.passed}/${result.total}${batchRecord?.batchId ? ` · ${this.shortId(batchRecord.batchId)}` : ''}`);
    }

    rerunLiveEvalCases(caseIds = [], label = 'selected cases') {
        const ids = this.uniqueStrings(Array.isArray(caseIds) ? caseIds : this.parseCaseIds(caseIds));
        if (!ids.length) {
            this.setStatus('No failed cases to rerun');
            return;
        }
        this.setStatus(`Rerunning ${ids.length} ${label}`);
        this.runLiveEval(ids);
    }

    bindLiveEvalRerunButtons(root) {
        if (!root?.querySelectorAll) return;
        root.querySelectorAll('[data-agent-live-rerun-case-ids]').forEach(button => {
            if (button.dataset.agentRerunBound === 'true') return;
            button.dataset.agentRerunBound = 'true';
            button.addEventListener('click', () => {
                const ids = this.parseCaseIds(button.dataset.caseIds || '');
                this.rerunLiveEvalCases(ids, button.dataset.rerunLabel || 'selected cases');
            });
        });
    }

    saveLiveEvalBatch(result, selectedCaseIds = null) {
        const store = this.getEvalBatchStore();
        if (!result || !store?.saveBatch) return null;
        result.warnings = Array.isArray(result.warnings) ? result.warnings : [];
        try {
            const ids = Array.isArray(selectedCaseIds) && selectedCaseIds.length
                ? selectedCaseIds
                : (result.cases || []).map(item => item.id).filter(Boolean);
            const record = store.saveBatch(result, {
                type: 'live',
                selectedCaseIds: ids,
                label: 'Live Eval Matrix'
            });
            if (record?.batchId) {
                result.batchId = record.batchId;
                result.type = record.type;
                result.savedAt = record.savedAt;
                result.updatedAt = record.updatedAt;
                result.passRate = record.passRate;
                result.averageScore = record.averageScore;
                result.failedCaseIds = record.failedCaseIds;
            } else {
                result.warnings.push('Live eval batch was not saved.');
            }
            return record;
        } catch (e) {
            result.warnings.push(`Live eval batch save failed: ${e.message || String(e)}.`);
            return null;
        }
    }

    renderEvalBatchHistory() {
        const store = this.getEvalBatchStore();
        if (!store?.listBatches) {
            this.renderEmptyDetail('Eval batch history is unavailable');
            return;
        }
        const batches = store.listBatches(40, 'live');
        const trend = store.latestDiff?.('live') || null;
        const latestDiagnostics = batches[0] ? this.getEvalDiagnostics()?.diagnoseBatch?.(batches[0]) || null : null;
        const detail = document.getElementById('agent-workbench-detail');
        if (!detail) return;
        detail.innerHTML = `
            <div class="agent-workbench-detail-header">
                <div>
                    <div class="agent-workbench-detail-title">Agent Eval Batches</div>
                    <div class="agent-workbench-detail-id">${this.escapeHtml(String(batches.length))} saved live batch(es)</div>
                </div>
                <div class="agent-workbench-status-pill completed">history</div>
            </div>

            <div class="agent-workbench-live-toolbar">
                <button class="agent-workbench-command" type="button" data-agent-live-matrix>Live Matrix</button>
                <button class="agent-workbench-command" type="button" data-agent-batches-refresh>Refresh</button>
            </div>

            ${this.renderEvalBatchTrend(trend)}
            ${this.renderEvalDiagnostics(latestDiagnostics, { title: 'Latest Batch Diagnostics', compact: true, live: true })}

            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Recent Batches</div>
                ${batches.length ? `
                    <div class="agent-workbench-batch-list">
                        ${batches.map(batch => this.renderEvalBatchCard(batch)).join('')}
                    </div>
                ` : '<div class="agent-workbench-empty">No live eval batches saved yet</div>'}
            </div>
        `;
        detail.querySelector('[data-agent-live-matrix]')?.addEventListener('click', () => this.showLiveEvalMatrix());
        detail.querySelector('[data-agent-batches-refresh]')?.addEventListener('click', () => this.renderEvalBatchHistory());
        detail.querySelectorAll('[data-agent-batch-open]').forEach(button => {
            button.addEventListener('click', () => this.renderEvalBatchReport(button.dataset.batchId || ''));
        });
        detail.querySelectorAll('[data-agent-eval-open-run]').forEach(button => {
            button.addEventListener('click', () => this.openEvalRun(button.dataset.runId || ''));
        });
        this.bindLiveEvalRerunButtons(detail);
        this.setStatus(`${batches.length} live batches`);
    }

    renderEvalBatchTrend(trend) {
        if (!trend) return '';
        if (!trend.hasComparison) {
            return `
                <div class="agent-workbench-section">
                    <div class="agent-workbench-section-title">Trend</div>
                    <div class="agent-workbench-empty">${this.escapeHtml(trend.summary || 'Need at least two saved batches to compute trend.')}</div>
                </div>
            `;
        }
        const cases = trend.cases || {};
        return `
            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Trend</div>
                <div class="agent-workbench-trend ${this.escapeHtml(trend.status || 'stable')}">
                    <div class="agent-workbench-trend-head">
                        <strong>${this.escapeHtml(trend.status || 'stable')}</strong>
                        <span>${this.escapeHtml(trend.summary || '')}</span>
                    </div>
                    <div class="agent-workbench-meta-grid compact">
                        ${this.metricCell('Pass Rate Δ', `${this.formatSigned(trend.deltas?.passRate || 0)}pt`)}
                        ${this.metricCell('Avg Score Δ', trend.deltas?.averageScore === null ? '-' : this.formatSigned(trend.deltas?.averageScore || 0))}
                        ${this.metricCell('Duration Δ', this.formatDurationDelta(trend.deltas?.durationMs || 0))}
                        ${this.metricCell('Failed Δ', this.formatSigned(trend.deltas?.failed || 0))}
                    </div>
                    ${this.renderTrendCaseGroup('New Failures', cases.newFailures || [], 'fail')}
                    ${this.renderTrendCaseGroup('Recovered', cases.recovered || [], 'pass')}
                    ${this.renderTrendCaseGroup('Persistent Failures', cases.persistentFailures || [], 'watch')}
                    ${this.renderTrendCaseGroup('Score Drops', cases.scoreDrops || [], 'watch', 'scoreDelta')}
                    ${this.renderTrendCaseGroup('Score Gains', cases.scoreGains || [], 'pass', 'scoreDelta')}
                    ${this.renderTrendCaseGroup('Slower Cases', cases.slower || [], 'watch', 'durationDeltaMs')}
                </div>
            </div>
        `;
    }

    renderTrendCaseGroup(label, items, tone = 'watch', deltaField = 'scoreDelta') {
        if (!items.length) return '';
        return `
            <div class="agent-workbench-trend-group ${this.escapeHtml(tone)}">
                <div class="agent-workbench-trend-group-title">${this.escapeHtml(label)}</div>
                <div class="agent-workbench-trend-cases">
                    ${items.slice(0, 8).map(item => this.renderTrendCase(item, deltaField)).join('')}
                </div>
            </div>
        `;
    }

    renderTrendCase(item, deltaField) {
        const delta = item[deltaField];
        const deltaText = delta === undefined || delta === null
            ? ''
            : deltaField === 'durationDeltaMs' ? this.formatDurationDelta(delta) : this.formatSigned(delta);
        return `
            <div class="agent-workbench-trend-case">
                <span>${this.escapeHtml(item.id || '')}</span>
                <strong>${this.escapeHtml(item.title || '')}</strong>
                <small>${this.escapeHtml(deltaText)}</small>
                ${item.runId ? `<button class="agent-workbench-command" type="button" data-agent-eval-open-run data-run-id="${this.escapeHtml(item.runId)}">Open Run</button>` : '<span></span>'}
            </div>
        `;
    }

    renderEvalBatchCard(batch) {
        const failed = (batch.failedCaseIds || []).slice(0, 5).join(', ') || 'none';
        const diagnostics = this.getEvalDiagnostics()?.diagnoseBatch?.(batch) || null;
        const topCategories = diagnostics?.topCategories || [];
        return `
            <div class="agent-workbench-batch-card ${batch.pass ? 'pass' : 'fail'}">
                <div class="agent-workbench-batch-card-head">
                    <div>
                        <strong>${this.escapeHtml(this.shortId(batch.batchId || 'batch'))}</strong>
                        <span>${this.escapeHtml(this.formatTime(batch.runAt || batch.savedAt))}</span>
                    </div>
                    <button class="agent-workbench-command" type="button" data-agent-batch-open data-batch-id="${this.escapeHtml(batch.batchId || '')}">Open</button>
                </div>
                <div class="agent-workbench-meta-grid compact">
                    ${this.metricCell('Pass Rate', `${batch.passRate || 0}%`)}
                    ${this.metricCell('Passed', `${batch.passed || 0}/${batch.total || 0}`)}
                    ${this.metricCell('Failed', batch.failed || 0)}
                    ${this.metricCell('Avg Score', batch.averageScore ?? '-')}
                </div>
                <div class="agent-workbench-batch-meta">
                    <span>failed: ${this.escapeHtml(failed)}</span>
                    <span>runs: ${this.escapeHtml(String((batch.runIds || []).length))}</span>
                </div>
                ${topCategories.length ? `
                    <div class="agent-workbench-batch-diagnostics">
                        ${this.renderDiagnosticPillList(topCategories, 3)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderEvalBatchReport(batchId) {
        const batch = this.getEvalBatchStore()?.getBatch?.(batchId);
        if (!batch) {
            this.renderEmptyDetail('Eval batch not found');
            this.setStatus('Batch not found');
            return;
        }
        this.renderEvalResult(batch, { live: batch.type === 'live', batch: true });
        this.setStatus(`Batch ${batch.passed}/${batch.total}`);
    }

    renderReplay(record, replay, backendEventCount) {
        const detail = document.getElementById('agent-workbench-detail');
        if (!detail || !replay) return;
        const metrics = replay.metrics || {};
        const stages = Object.values(replay.stageStates || {});
        const quality = this.getQuality()?.build?.(replay) || null;
        detail.innerHTML = `
            <div class="agent-workbench-detail-header">
                <div>
                    <div class="agent-workbench-detail-title">${this.escapeHtml(replay.mode || record.mode || 'agent')}</div>
                    <div class="agent-workbench-detail-id">${this.escapeHtml(replay.runId || record.runId || '')}</div>
                </div>
                <div class="agent-workbench-status-pill ${this.escapeHtml(replay.status || 'snapshot')}">${this.escapeHtml(replay.status || 'snapshot')}</div>
            </div>

            <div class="agent-workbench-meta-grid">
                ${this.metricCell('Events', metrics.events || 0)}
                ${this.metricCell('Backend', backendEventCount)}
                ${this.metricCell('Tools', metrics.tools || 0)}
                ${this.metricCell('Evidence', metrics.evidence || 0)}
                ${this.metricCell('Approvals', metrics.approvals || 0)}
                ${this.metricCell('Quality', quality ? quality.score : '-')}
                ${this.metricCell('Duration', quality?.timing?.durationLabel || '-')}
            </div>

            ${this.renderQuality(quality)}

            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Stages</div>
                <div class="agent-workbench-stage-strip">
                    ${stages.map(stage => this.stageCell(stage)).join('')}
                </div>
            </div>

            <div class="agent-workbench-section agent-workbench-actions-row">
                <button class="agent-workbench-command" type="button" data-agent-workbench-open-chat>Open Chat</button>
                <span>${this.escapeHtml(record.chatId || 'no chat id')}</span>
            </div>

            ${this.renderTools(replay.tools || [])}
            ${this.renderApprovals(replay.approvals || [])}
            ${this.renderEvidence(replay.evidence || [])}
            ${this.renderCitation(replay.citation)}
            ${this.renderTimeline(replay.timeline || [])}
        `;
        detail.querySelector('[data-agent-workbench-open-chat]')?.addEventListener('click', () => {
            if (!record.chatId) return;
            window.dispatchEvent(new CustomEvent('agent-workbench-open-chat', { detail: { chatId: record.chatId } }));
            this.close();
        });
    }

    renderQuality(quality) {
        if (!quality) return '';
        const findings = Array.isArray(quality.findings) ? quality.findings : [];
        return `
            <div class="agent-workbench-quality ${this.escapeHtml(quality.grade || 'clean')}">
                <div class="agent-workbench-quality-score">
                    <span>Quality</span>
                    <strong>${this.escapeHtml(String(quality.score))}</strong>
                    <small>${this.escapeHtml(quality.grade || '')}</small>
                </div>
                <div class="agent-workbench-quality-main">
                    <div class="agent-workbench-quality-summary">${this.escapeHtml(quality.summary || '')}</div>
                    ${findings.length ? `
                        <div class="agent-workbench-findings">
                            ${findings.slice(0, 6).map(item => `
                                <div class="agent-workbench-finding ${this.escapeHtml(item.severity || 'low')}">
                                    <span>${this.escapeHtml(item.severity || '')}</span>
                                    <strong>${this.escapeHtml(item.title || '')}</strong>
                                    <small>${this.escapeHtml(item.detail || '')}</small>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div class="agent-workbench-quality-empty">No quality findings</div>'}
                </div>
            </div>
            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Timing / Trust</div>
                <div class="agent-workbench-meta-grid compact">
                    ${this.metricCell('Duration', quality.timing?.durationLabel || '-')}
                    ${this.metricCell('Stages', (quality.timing?.stages || []).length)}
                    ${this.metricCell('Primary', quality.trustDistribution?.primary || 0)}
                    ${this.metricCell('Low/Unknown', (quality.trustDistribution?.low || 0) + (quality.trustDistribution?.unknown || 0))}
                </div>
                ${this.renderStageTiming(quality.timing?.stages || [])}
            </div>
        `;
    }

    renderStageTiming(stages) {
        if (!stages.length) return '';
        return `
            <div class="agent-workbench-stage-timing">
                ${stages.map(stage => `
                    <div class="agent-workbench-stage-time">
                        <span>${this.escapeHtml(stage.stage || '')}</span>
                        <strong>${this.escapeHtml(stage.durationLabel || '0ms')}</strong>
                        <small>${this.escapeHtml(String(stage.events || 0))} events</small>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderEvalResult(result, options = {}) {
        const detail = document.getElementById('agent-workbench-detail');
        if (!detail || !result) return;
        const title = options.batch
            ? 'Agent Live Eval Batch'
            : options.live ? 'Agent Live Eval' : 'Agent Eval Suite';
        const idLine = [
            result.batchId ? `batch ${this.shortId(result.batchId)}` : '',
            result.version || '',
            result.runAt || ''
        ].filter(Boolean).join(' · ');
        const diagnostics = this.getEvalDiagnostics()?.diagnoseBatch?.(result) || null;
        const failedCaseIds = this.failedEvalCaseIds(result);
        detail.innerHTML = `
            <div class="agent-workbench-detail-header">
                <div>
                    <div class="agent-workbench-detail-title">${this.escapeHtml(title)}</div>
                    <div class="agent-workbench-detail-id">${this.escapeHtml(idLine)}</div>
                </div>
                <div class="agent-workbench-status-pill ${result.pass ? 'completed' : 'failed'}">${result.pass ? 'pass' : 'fail'}</div>
            </div>

            <div class="agent-workbench-meta-grid compact">
                ${this.metricCell('Total', result.total || 0)}
                ${this.metricCell('Passed', result.passed || 0)}
                ${this.metricCell('Failed', result.failed || 0)}
                ${this.metricCell('Duration', `${result.durationMs || 0}ms`)}
                ${result.passRate !== undefined ? this.metricCell('Pass Rate', `${result.passRate || 0}%`) : ''}
                ${result.averageScore !== undefined ? this.metricCell('Avg Score', result.averageScore ?? '-') : ''}
            </div>

            ${options.live ? `
                <div class="agent-workbench-live-toolbar">
                    <button class="agent-workbench-command" type="button" data-agent-live-matrix>Matrix</button>
                    <button class="agent-workbench-command" type="button" data-agent-batches-open>Batches</button>
                    ${failedCaseIds.length ? `<button class="agent-workbench-command danger" type="button" data-agent-live-rerun-case-ids data-case-ids="${this.escapeHtml(failedCaseIds.join(','))}" data-rerun-label="failed cases">Rerun Failed</button>` : ''}
                    ${(result.warnings || []).map(text => `<span>${this.escapeHtml(text)}</span>`).join('')}
                </div>
            ` : ''}

            ${this.renderEvalDiagnostics(diagnostics, { title: 'Diagnostics', live: Boolean(options.live) })}

            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Cases</div>
                <div class="agent-workbench-eval-cases">
                    ${(result.cases || []).map(item => this.renderEvalCase(item)).join('')}
                </div>
            </div>
        `;
        if (options.live) {
            detail.querySelector('[data-agent-live-matrix]')?.addEventListener('click', () => this.showLiveEvalMatrix());
            detail.querySelector('[data-agent-batches-open]')?.addEventListener('click', () => this.renderEvalBatchHistory());
            detail.querySelectorAll('[data-agent-eval-open-run]').forEach(button => {
                button.addEventListener('click', () => this.openEvalRun(button.dataset.runId || ''));
            });
            this.bindLiveEvalRerunButtons(detail);
        }
    }

    renderEvalCase(item) {
        const diagnosis = this.getEvalDiagnostics()?.diagnoseCase?.(item) || null;
        return `
            <div class="agent-workbench-eval-case ${item.pass ? 'pass' : 'fail'}">
                <div class="agent-workbench-eval-case-head">
                    <span>${this.escapeHtml(item.id || '')}</span>
                    <strong>${this.escapeHtml(item.title || '')}</strong>
                    <small>${this.escapeHtml(item.pass ? 'PASS' : 'FAIL')}</small>
                    <small>${this.escapeHtml(String(item.score ?? '-'))} / ${this.escapeHtml(item.grade || '')}</small>
                </div>
                ${this.renderCaseTags(item)}
                ${this.renderEvalCaseRunLink(item)}
                ${this.renderEvalCaseDiagnosis(diagnosis)}
                ${(item.failures || []).length ? `
                    <div class="agent-workbench-eval-failures">
                        ${item.failures.map(text => `<div>${this.escapeHtml(text)}</div>`).join('')}
                    </div>
                ` : ''}
                ${(item.warnings || []).length ? `
                    <div class="agent-workbench-eval-findings">
                        ${item.warnings.map(text => `<span>warning: ${this.escapeHtml(text)}</span>`).join('')}
                    </div>
                ` : ''}
                ${(item.findings || []).length ? `
                    <div class="agent-workbench-eval-findings">
                        ${item.findings.map(finding => `<span>${this.escapeHtml(finding.severity || '')}: ${this.escapeHtml(finding.title || '')}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderEvalDiagnostics(diagnostics, options = {}) {
        if (!diagnostics) return '';
        const overview = diagnostics.overview || {};
        const topCategories = overview.topCategories || diagnostics.topCategories || [];
        const actionPlan = overview.actionPlan || [];
        const remediation = diagnostics.remediation || null;
        const actionCount = remediation?.actions?.length || actionPlan.length;
        const statusClass = diagnostics.hasFailures ? 'fail' : diagnostics.hasSignals ? 'watch' : 'clean';
        return `
            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">${this.escapeHtml(options.title || 'Diagnostics')}</div>
                <div class="agent-workbench-diagnostics ${this.escapeHtml(statusClass)} ${options.compact ? 'compact' : ''}">
                    <div class="agent-workbench-diagnostics-head">
                        <strong>${this.escapeHtml(overview.summaryText || 'No diagnostic signals detected.')}</strong>
                        <span>${this.escapeHtml(String(diagnostics.total || 0))} case(s) analyzed</span>
                    </div>
                    <div class="agent-workbench-diagnostic-grid">
                        ${this.metricCell('Failed Cases', overview.failedCases || 0)}
                        ${this.metricCell('Signal Cases', overview.signalCases || 0)}
                        ${this.metricCell('Categories', topCategories.length)}
                        ${this.metricCell('Actions', actionCount)}
                    </div>
                    <div class="agent-workbench-diagnostic-pills">
                        ${topCategories.length
                ? this.renderDiagnosticPillList(topCategories, options.compact ? 4 : 8)
                : '<span class="agent-workbench-diagnostic-pill clean">clean</span>'}
                    </div>
                    ${actionPlan.length ? `
                        <div class="agent-workbench-diagnostic-actions">
                            ${actionPlan.slice(0, options.compact ? 3 : 5).map(step => `<div>${this.escapeHtml(step)}</div>`).join('')}
                        </div>
                    ` : ''}
                    ${this.renderRemediationPlan(remediation, options)}
                </div>
            </div>
        `;
    }

    renderRemediationPlan(plan, options = {}) {
        if (!plan) return '';
        const actions = Array.isArray(plan.actions) ? plan.actions : [];
        const failedCaseIds = Array.isArray(plan.failedCaseIds) ? plan.failedCaseIds : [];
        const categoryReruns = Array.isArray(plan.categoryReruns) ? plan.categoryReruns : [];
        const visibleActions = actions.slice(0, options.compact ? 3 : 6);
        if (!visibleActions.length && !(options.live && failedCaseIds.length)) return '';
        return `
            <div class="agent-workbench-remediation">
                <div class="agent-workbench-remediation-head">
                    <strong>Runbook</strong>
                    <span>${this.escapeHtml(plan.summary || '')}</span>
                </div>
                ${options.live && failedCaseIds.length ? `
                    <div class="agent-workbench-remediation-reruns">
                        <button class="agent-workbench-command danger" type="button" data-agent-live-rerun-case-ids data-case-ids="${this.escapeHtml(failedCaseIds.join(','))}" data-rerun-label="failed cases">Rerun Failed</button>
                        ${categoryReruns.slice(0, options.compact ? 2 : 4).map(item => `
                            <button class="agent-workbench-command" type="button" data-agent-live-rerun-case-ids data-case-ids="${this.escapeHtml((item.caseIds || []).join(','))}" data-rerun-label="${this.escapeHtml(item.label || 'category')} cases">Rerun ${this.escapeHtml(item.label || 'Category')}</button>
                        `).join('')}
                    </div>
                ` : ''}
                ${visibleActions.length ? `
                    <div class="agent-workbench-remediation-grid">
                        ${visibleActions.map(action => `
                            <div class="agent-workbench-remediation-step">
                                <span>${this.escapeHtml(action.categoryLabel || action.categoryId || '')}</span>
                                <strong>${this.escapeHtml(action.label || '')}</strong>
                                <small>${this.escapeHtml(action.detail || '')}</small>
                                ${action.verify ? `<em>${this.escapeHtml(action.verify)}</em>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderEvalCaseDiagnosis(diagnosis) {
        if (!diagnosis?.categories?.length) return '';
        const primary = diagnosis.categories[0] || {};
        const signals = this.uniqueStrings(diagnosis.categories
            .flatMap(category => category.signals || [])
            .concat(diagnosis.signals || []))
            .slice(0, 2);
        return `
            <div class="agent-workbench-eval-diagnosis ${diagnosis.failed ? 'fail' : 'watch'}">
                <div class="agent-workbench-diagnostic-pills">
                    ${this.renderDiagnosticPillList(diagnosis.categories, 4)}
                </div>
                <div class="agent-workbench-eval-diagnosis-text">${this.escapeHtml(diagnosis.summary || '')}</div>
                ${primary.nextSteps?.length ? `<div class="agent-workbench-eval-diagnosis-next">next: ${this.escapeHtml(primary.nextSteps[0])}</div>` : ''}
                ${signals.length ? `
                    <div class="agent-workbench-eval-diagnosis-signals">
                        ${signals.map(signal => `<span>${this.escapeHtml(signal)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderDiagnosticPillList(categories, limit = 6) {
        return (Array.isArray(categories) ? categories : [])
            .slice(0, limit)
            .map(category => {
                const count = category.failed || category.count || 0;
                const countText = count ? ` ${count}` : '';
                const className = [category.id || '', category.tone || '', category.severity || '']
                    .map(value => this.safeClass(value))
                    .filter(Boolean)
                    .join(' ');
                return `<span class="agent-workbench-diagnostic-pill ${this.escapeHtml(className)}" title="${this.escapeHtml(category.description || category.reason || '')}">${this.escapeHtml((category.label || category.id || 'signal') + countText)}</span>`;
            })
            .join('');
    }

    renderEvalCaseRunLink(item) {
        if (!item.runId) return '';
        return `
            <div class="agent-workbench-eval-run-link">
                <span>run ${this.escapeHtml(this.shortId(item.runId))}</span>
                <button class="agent-workbench-command" type="button" data-agent-eval-open-run data-run-id="${this.escapeHtml(item.runId)}">Open Run</button>
            </div>
        `;
    }

    renderCaseTags(item) {
        const tags = [
            item.risk || '',
            item.usesTools ? 'tools' : '',
            item.usesNetwork ? 'network' : '',
            item.requiresBackend ? 'backend' : '',
            item.requiresApproval ? 'approval' : ''
        ].filter(Boolean);
        if (!tags.length) return '';
        return `
            <span class="agent-workbench-tag-row">
                ${tags.map(tag => `<span class="agent-workbench-tag ${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</span>`).join('')}
            </span>
        `;
    }

    failedEvalCaseIds(result = {}) {
        return this.uniqueStrings((Array.isArray(result.cases) ? result.cases : [])
            .filter(item => item && (item.pass === false || (Array.isArray(item.failures) && item.failures.length > 0)))
            .map(item => item.id)
            .filter(Boolean));
    }

    renderTools(tools) {
        if (!tools.length) return '';
        return `
            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Tools</div>
                <div class="agent-workbench-table">
                    ${tools.map(tool => `
                        <div class="agent-workbench-table-row">
                            <span>${this.escapeHtml(tool.name || 'tool')}</span>
                            <span class="${this.escapeHtml(tool.status || '')}">${this.escapeHtml(tool.status || '')}</span>
                            <span>${this.escapeHtml(tool.risk || '')}</span>
                            <span>${this.escapeHtml(String(tool.resultChars || 0))} chars</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderApprovals(approvals) {
        if (!approvals.length) return '';
        return `
            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Approvals</div>
                <div class="agent-workbench-table">
                    ${approvals.map(item => `
                        <div class="agent-workbench-table-row">
                            <span>${this.escapeHtml(item.tool || 'tool')}</span>
                            <span class="${this.escapeHtml(item.status || '')}">${this.escapeHtml(item.status || '')}</span>
                            <span>${this.escapeHtml(item.risk || '')}</span>
                            <span>${item.edited ? 'edited' : ''}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderEvidence(evidence) {
        if (!evidence.length) return '';
        return `
            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Evidence</div>
                <div class="agent-workbench-evidence">
                    ${evidence.slice(-12).map(item => `
                        <div class="agent-workbench-evidence-row">
                            <span>${this.escapeHtml(item.trustLevel || item.kind || 'evidence')}</span>
                            <span>${this.escapeHtml(item.title || item.url || item.id || '')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderCitation(citation) {
        if (!citation) return '';
        return `
            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Citation</div>
                <div class="agent-workbench-meta-grid compact">
                    ${this.metricCell('Matched', citation.matched || 0)}
                    ${this.metricCell('Weak', citation.weak || 0)}
                    ${this.metricCell('Unmatched', citation.unmatched || 0)}
                    ${this.metricCell('Cited', citation.citedEvidenceCount || 0)}
                </div>
            </div>
        `;
    }

    renderTimeline(events) {
        if (!events.length) return '';
        return `
            <div class="agent-workbench-section">
                <div class="agent-workbench-section-title">Timeline</div>
                <div class="agent-workbench-timeline">
                    ${events.map(event => `
                        <div class="agent-workbench-event">
                            <span>${this.escapeHtml(this.formatTime(event.ts))}</span>
                            <span>${this.escapeHtml(event.type || '')}</span>
                            <span>${this.escapeHtml(event.stage || '')}</span>
                            <span>${this.escapeHtml(this.eventMessage(event))}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    stageCell(stage) {
        return `
            <div class="agent-workbench-stage ${this.escapeHtml(stage.state || 'pending')}">
                <span>${this.escapeHtml(stage.id || '')}</span>
                <small>${this.escapeHtml(stage.note || stage.state || '')}</small>
            </div>
        `;
    }

    metricCell(label, value) {
        return `
            <div class="agent-workbench-metric">
                <span>${this.escapeHtml(label)}</span>
                <strong>${this.escapeHtml(String(value ?? 0))}</strong>
            </div>
        `;
    }

    renderEmptyDetail(message) {
        const detail = document.getElementById('agent-workbench-detail');
        if (detail) detail.innerHTML = `<div class="agent-workbench-empty">${this.escapeHtml(message)}</div>`;
    }

    setStatus(text) {
        const status = document.querySelector('[data-agent-workbench-status]');
        if (status) status.textContent = text;
    }

    eventMessage(event) {
        const payload = event.payload || {};
        if (payload.name) return payload.name;
        if (payload.mode) return payload.mode;
        if (payload.selectedTools) return `${payload.selectedTools.length} tools`;
        if (payload.evidence_id) return payload.title || payload.evidence_id;
        if (payload.content_chars !== undefined) return `${payload.content_chars} chars`;
        return '';
    }

    shortId(value) {
        const text = String(value || '');
        return text.length <= 18 ? text : `${text.slice(0, 10)}...${text.slice(-5)}`;
    }

    formatTime(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatSigned(value) {
        const number = Number(value) || 0;
        return number > 0 ? `+${number}` : String(number);
    }

    formatDurationDelta(value) {
        const number = Number(value) || 0;
        const abs = Math.abs(number);
        const label = abs >= 1000 ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}s` : `${abs}ms`;
        return number > 0 ? `+${label}` : number < 0 ? `-${label}` : '0ms';
    }

    parseCaseIds(value) {
        if (Array.isArray(value)) return value.filter(Boolean);
        return String(value || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }

    uniqueStrings(items) {
        return Array.from(new Set((items || []).map(item => String(item || '')).filter(Boolean)));
    }

    safeClass(value) {
        return String(value || '').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
    }

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }
}

window.AgentWorkbench = AgentWorkbench;
window.agentWorkbench = new AgentWorkbench();
