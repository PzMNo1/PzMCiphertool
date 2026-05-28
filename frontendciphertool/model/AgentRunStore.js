/**
 * AgentRunStore - local frontend index for structured AgentRun snapshots.
 * Chat messages keep agent_run for compatibility; this store makes run lookup,
 * restore, export/import indexing, and future backend migration explicit.
 */
class AgentRunStore {
    constructor() {
        this.STORAGE_KEY = 'agentRunStoreV1';
        this.API_PATH = '/api/agent-runs';
        this.MAX_RUNS = 120;
        this.MAX_EVENTS = 180;
        this.MAX_EVIDENCE = 100;
        this.MAX_TOOL_RESULTS = 80;
        this.MAX_TEXT_FIELD = 24000;
        this.EVENT_SYNC_DELAY_MS = 250;
        this.MAX_EVENT_BATCH = 25;
        this.EVENT_SYNC_EXCLUDED = new Set(['model.delta']);
        this.eventQueues = new Map();
        this.eventSyncTimers = new Map();
    }

    getStore() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed && typeof parsed === 'object'
                ? {
                    version: parsed.version || 'agent-run-store-v1',
                    runs: parsed.runs && typeof parsed.runs === 'object' ? parsed.runs : {}
                }
                : { version: 'agent-run-store-v1', runs: {} };
        } catch (e) {
            console.warn('AgentRunStore read failed:', e);
            return { version: 'agent-run-store-v1', runs: {} };
        }
    }

    saveStore(store) {
        const normalized = this.pruneStore(store || { runs: {} });
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
        } catch (e) {
            console.warn('AgentRunStore save failed, retrying with fewer runs:', e);
            const compact = this.pruneStore(normalized, Math.max(20, Math.floor(this.MAX_RUNS / 2)));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(compact));
        }
    }

    saveRun(run, options = {}) {
        if (!run || !run.runId) return null;
        const store = this.getStore();
        const now = new Date().toISOString();
        const existing = store.runs[run.runId] || {};
        const record = {
            runId: run.runId,
            chatId: options.chatId || existing.chatId || '',
            messageIndex: Number.isFinite(options.messageIndex) ? options.messageIndex : existing.messageIndex ?? null,
            source: options.source || existing.source || 'runtime',
            savedAt: existing.savedAt || now,
            updatedAt: now,
            snapshot: this.sanitizeRun(run)
        };
        store.runs[run.runId] = record;
        this.saveStore(store);
        if (options.syncBackend !== false) {
            this.syncRunToBackend(record);
        }
        return record;
    }

    getRun(runId) {
        if (!runId) return null;
        const record = this.getStore().runs[String(runId)];
        return record?.snapshot || null;
    }

    getRecord(runId) {
        if (!runId) return null;
        return this.getStore().runs[String(runId)] || null;
    }

    getRunsByChat(chatId) {
        const id = String(chatId || '');
        if (!id) return [];
        return Object.values(this.getStore().runs)
            .filter(record => record.chatId === id)
            .sort((a, b) => (a.messageIndex ?? 0) - (b.messageIndex ?? 0))
            .map(record => record.snapshot)
            .filter(Boolean);
    }

    resolveMessageRun(message) {
        if (!message || typeof message !== 'object') return null;
        if (message.agent_run) return message.agent_run;
        return this.getRun(message.agent_run_id || message.agentRunId || '');
    }

    hydrateMessages(messages = []) {
        return (Array.isArray(messages) ? messages : []).map(message => {
            if (!message || message.agent_run || !message.agent_run_id) return message;
            const run = this.getRun(message.agent_run_id);
            return run ? { ...message, agent_run: run } : message;
        });
    }

    indexChat(chatId, messages = [], source = 'history') {
        const indexed = [];
        (Array.isArray(messages) ? messages : []).forEach((message, index) => {
            const run = this.resolveMessageRun(message);
            if (!run?.runId) return;
            this.saveRun(run, { chatId, messageIndex: index, source });
            message.agent_run_id = run.runId;
            indexed.push(run.runId);
        });
        return indexed;
    }

    deleteRunsByChat(chatIds = []) {
        const ids = new Set((Array.isArray(chatIds) ? chatIds : [chatIds]).map(String));
        if (!ids.size) return 0;
        const store = this.getStore();
        let removed = 0;
        Object.entries(store.runs).forEach(([runId, record]) => {
            if (ids.has(String(record.chatId || ''))) {
                delete store.runs[runId];
                removed += 1;
            }
        });
        if (removed) this.saveStore(store);
        if (removed) this.deleteBackendRunsByChat(Array.from(ids));
        return removed;
    }

    async fetchRun(runId) {
        if (!runId || !this.canUseBackend()) return null;
        try {
            const data = await this.requestJson(`${this.getBackendBase()}${this.API_PATH}/${encodeURIComponent(runId)}`);
            if (data?.snapshot?.runId) {
                this.saveRun(data.snapshot, {
                    chatId: data.chatId || '',
                    messageIndex: Number.isFinite(data.messageIndex) ? data.messageIndex : null,
                    source: 'backend',
                    syncBackend: false
                });
            }
            return data?.snapshot || null;
        } catch (e) {
            console.warn('AgentRunStore backend fetch failed:', e);
            return null;
        }
    }

    async fetchRunsByChat(chatId, limit = 50) {
        if (!chatId || !this.canUseBackend()) return [];
        try {
            const url = `${this.getBackendBase()}${this.API_PATH}?chatId=${encodeURIComponent(chatId)}&limit=${encodeURIComponent(limit)}`;
            const records = await this.requestJson(url);
            const runs = Array.isArray(records)
                ? records.map(record => record?.snapshot).filter(run => run?.runId)
                : [];
            runs.forEach((run, index) => this.saveRun(run, {
                chatId,
                messageIndex: index,
                source: 'backend',
                syncBackend: false
            }));
            return runs;
        } catch (e) {
            console.warn('AgentRunStore backend list failed:', e);
            return [];
        }
    }

    async listRunRecords(limit = 60) {
        const localRecords = this.getLocalRunRecords(limit);
        if (!this.canUseBackend()) return localRecords;
        try {
            const url = `${this.getBackendBase()}${this.API_PATH}?limit=${encodeURIComponent(limit)}`;
            const records = await this.requestJson(url);
            if (!Array.isArray(records)) return localRecords;
            return records.map(record => {
                if (record?.snapshot?.runId) {
                    this.saveRun(record.snapshot, {
                        chatId: record.chatId || '',
                        messageIndex: Number.isFinite(record.messageIndex) ? record.messageIndex : null,
                        source: 'backend',
                        syncBackend: false
                    });
                }
                return this.normalizeRecord(record);
            }).filter(record => record?.runId);
        } catch (e) {
            console.warn('AgentRunStore backend list records failed:', e);
            return localRecords;
        }
    }

    getLocalRunRecords(limit = 60) {
        return Object.values(this.getStore().runs || {})
            .filter(record => record?.runId)
            .sort((a, b) => Date.parse(b.updatedAt || b.savedAt || 0) - Date.parse(a.updatedAt || a.savedAt || 0))
            .slice(0, limit)
            .map(record => this.normalizeRecord(record));
    }

    normalizeRecord(record = {}) {
        const snapshot = record.snapshot || null;
        return {
            runId: record.runId || snapshot?.runId || '',
            chatId: record.chatId || '',
            messageIndex: Number.isFinite(record.messageIndex) ? record.messageIndex : null,
            source: record.source || '',
            savedAt: record.savedAt || '',
            updatedAt: record.updatedAt || '',
            contractVersion: record.contractVersion || snapshot?.contract_version || 'agent-contract-v1',
            mode: record.mode || snapshot?.mode || '',
            researchProfile: record.researchProfile || snapshot?.researchProfile || '',
            snapshot
        };
    }

    appendEvent(event) {
        if (!event?.runId || !event.type || this.EVENT_SYNC_EXCLUDED.has(event.type) || !this.canUseBackend()) return;
        const runId = String(event.runId);
        const queue = this.eventQueues.get(runId) || [];
        queue.push(this.truncateDeep(this.deepClone(event) || event));
        this.eventQueues.set(runId, queue);
        this.scheduleEventFlush(runId);
    }

    async fetchRunEvents(runId, limit = 500) {
        if (!runId || !this.canUseBackend()) return [];
        try {
            const url = `${this.getBackendBase()}${this.API_PATH}/${encodeURIComponent(runId)}/events?limit=${encodeURIComponent(limit)}`;
            const records = await this.requestJson(url);
            return Array.isArray(records)
                ? records.map(record => record?.event).filter(Boolean)
                : [];
        } catch (e) {
            console.warn('AgentRunStore backend event fetch failed:', e);
            return [];
        }
    }

    sanitizeRun(run) {
        const cloned = this.deepClone(run) || {};
        cloned.contract_version = cloned.contract_version || 'agent-contract-v1';
        cloned.events = (Array.isArray(cloned.events) ? cloned.events : [])
            .filter(event => event?.type !== 'model.delta')
            .slice(-this.MAX_EVENTS)
            .map(event => this.truncateDeep(event));
        cloned.evidence_ledger = (Array.isArray(cloned.evidence_ledger) ? cloned.evidence_ledger : [])
            .slice(-this.MAX_EVIDENCE)
            .map(item => this.truncateDeep(item));
        cloned.tool_results = (Array.isArray(cloned.tool_results) ? cloned.tool_results : [])
            .slice(-this.MAX_TOOL_RESULTS)
            .map(item => this.truncateDeep(item));
        cloned.artifacts = (Array.isArray(cloned.artifacts) ? cloned.artifacts : []).slice(-20).map(item => this.truncateDeep(item));
        return this.truncateDeep(cloned);
    }

    pruneStore(store, maxRuns = this.MAX_RUNS) {
        const entries = Object.values(store.runs || {})
            .filter(record => record?.runId && record.snapshot)
            .sort((a, b) => Date.parse(b.updatedAt || b.savedAt || 0) - Date.parse(a.updatedAt || a.savedAt || 0))
            .slice(0, maxRuns);
        return {
            version: store.version || 'agent-run-store-v1',
            runs: Object.fromEntries(entries.map(record => [record.runId, record]))
        };
    }

    truncateDeep(value) {
        if (typeof value === 'string') {
            return value.length <= this.MAX_TEXT_FIELD ? value : `${value.slice(0, this.MAX_TEXT_FIELD)}\n[AgentRunStore truncated]`;
        }
        if (Array.isArray(value)) return value.map(item => this.truncateDeep(item));
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.truncateDeep(item)]));
        }
        return value;
    }

    deepClone(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return null;
        }
    }

    syncRunToBackend(record) {
        if (!record?.runId || !record.snapshot || !this.canUseBackend()) return;
        const payload = {
            runId: record.runId,
            chatId: record.chatId || '',
            messageIndex: Number.isFinite(record.messageIndex) ? record.messageIndex : null,
            source: record.source || 'runtime',
            savedAt: record.savedAt || '',
            updatedAt: record.updatedAt || '',
            snapshot: record.snapshot
        };
        this.requestJson(`${this.getBackendBase()}${this.API_PATH}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(e => console.warn('AgentRunStore backend sync failed:', e));
    }

    deleteBackendRunsByChat(chatIds = []) {
        const ids = (Array.isArray(chatIds) ? chatIds : [chatIds]).map(String).filter(Boolean);
        if (!ids.length || !this.canUseBackend()) return;
        this.requestJson(`${this.getBackendBase()}${this.API_PATH}/delete-by-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatIds: ids })
        }).catch(e => console.warn('AgentRunStore backend delete failed:', e));
    }

    scheduleEventFlush(runId) {
        if (this.eventSyncTimers.has(runId)) return;
        const timer = setTimeout(() => {
            this.eventSyncTimers.delete(runId);
            this.flushEventQueue(runId);
        }, this.EVENT_SYNC_DELAY_MS);
        this.eventSyncTimers.set(runId, timer);
    }

    flushEventQueue(runId) {
        const queue = this.eventQueues.get(runId) || [];
        if (!queue.length || !this.canUseBackend()) return;
        const events = queue.splice(0, this.MAX_EVENT_BATCH);
        if (queue.length) {
            this.eventQueues.set(runId, queue);
        } else {
            this.eventQueues.delete(runId);
        }
        this.requestJson(`${this.getBackendBase()}${this.API_PATH}/${encodeURIComponent(runId)}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events })
        }).catch(e => console.warn('AgentRunStore backend event sync failed:', e))
            .finally(() => {
                if ((this.eventQueues.get(runId) || []).length) {
                    this.scheduleEventFlush(runId);
                }
            });
    }

    async requestJson(url, options = {}) {
        const headers = {
            ...(options.headers || {}),
            ...this.getAuthHeaders()
        };
        const response = await fetch(url, { ...options, headers });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || `AgentRun backend request failed: ${response.status}`);
        }
        return result.data;
    }

    canUseBackend() {
        return typeof fetch === 'function' && Boolean(this.getAuthHeaders().Authorization);
    }

    getAuthHeaders() {
        return window.CipherAuth && typeof window.CipherAuth.getAuthHeaders === 'function'
            ? window.CipherAuth.getAuthHeaders()
            : {};
    }

    getBackendBase() {
        return this.getLocalBackendBase();
    }

    getLocalBackendBase() {
        try {
            const override = window.CIPHERTOOL_API_BASE || localStorage.getItem('CIPHERTOOL_API_BASE') || '';
            if (/^https?:\/\//i.test(override)) {
                return override.replace(/\/+$/, '');
            }
        } catch (error) {
            // Fall through to the local default.
        }
        return 'http://localhost:8080';
    }
}

window.agentRunStore = new AgentRunStore();
