/**
 * AgentDurableStore provides browser-local checkpoints for AgentRun state.
 *
 * This is a durable UX layer: a refresh or tab close no longer loses the run
 * snapshot. True background execution still needs a backend worker queue.
 */
(function () {
    const STORAGE_KEY = 'PZM_AGENT_DURABLE_RUNS_V1';
    const MAX_RECORDS = 32;
    const MAX_CONTENT_CHARS = 80000;
    const MAX_PREVIEW_CHARS = 900;

    class AgentDurableStore {
        constructor() {
            this.storageKey = STORAGE_KEY;
            this.maxRecords = MAX_RECORDS;
        }

        startRun(input = {}) {
            const now = this.nowIso();
            const record = {
                contract_version: window.AgentContract?.CONTRACT_VERSION || 'agent-contract-v1',
                durable_version: 'durable-local-v1',
                durableRunId: input.durableRunId || this.createId('durable'),
                runId: input.runId || '',
                chatId: input.chatId || '',
                messageId: input.messageId || '',
                status: 'running',
                created_at: now,
                updated_at: now,
                completed_at: null,
                checkpoint_seq: 0,
                checkpoint_reason: 'run.started',
                last_checkpoint: null,
                user_message_preview: this.truncate(input.userMessage || input.routingMessage || '', MAX_PREVIEW_CHARS),
                routing_message_preview: this.truncate(input.routingMessage || input.userMessage || '', MAX_PREVIEW_CHARS),
                context_pack_summary: input.contextPack?.summary || input.context_pack_summary || null,
                content: '',
                content_preview: '',
                reasoning_preview: '',
                agent_run: null,
                resume_prompt: '',
                resume_policy: {
                    canResumeFromPrompt: true,
                    actualBackgroundExecution: false,
                    storage: 'localStorage'
                }
            };
            record.resume_prompt = this.buildResumePrompt(record);
            this.upsert(record);
            return record;
        }

        checkpoint(input = {}) {
            const record = this.resolveRecord(input);
            if (!record) return null;

            const now = this.nowIso();
            const snapshot = input.agent_run || input.snapshot || record.agent_run || null;
            const content = input.content !== undefined ? String(input.content || '') : record.content || '';
            const reasoning = input.reasoning_content !== undefined
                ? String(input.reasoning_content || '')
                : record.reasoning_preview || '';
            const lastStage = this.getLastStage(snapshot);
            const lastEvent = this.getLastEvent(snapshot);

            record.updated_at = now;
            record.status = input.status || record.status || 'running';
            record.runId = input.runId || snapshot?.runId || record.runId || '';
            record.checkpoint_seq = Number(record.checkpoint_seq || 0) + 1;
            record.checkpoint_reason = input.reason || input.checkpoint_reason || 'message.persisted';
            record.content = this.truncate(content, MAX_CONTENT_CHARS);
            record.content_preview = this.truncate(content, MAX_PREVIEW_CHARS);
            record.reasoning_preview = this.truncate(reasoning, MAX_PREVIEW_CHARS);
            record.agent_run = this.compactAgentRun(snapshot);
            record.context_pack_summary = snapshot?.context_pack_summary || record.context_pack_summary || null;
            record.last_checkpoint = {
                ts: now,
                seq: record.checkpoint_seq,
                reason: record.checkpoint_reason,
                stage: lastStage?.id || lastStage?.label || '',
                stage_state: lastStage?.state || '',
                event_type: lastEvent?.type || '',
                content_chars: content.length,
                metrics: snapshot?.metrics || null
            };
            record.resume_prompt = this.buildResumePrompt(record);
            this.upsert(record);
            return record;
        }

        finish(durableRunId, status = 'completed', patch = {}) {
            const record = this.get(durableRunId);
            if (!record) return null;
            const next = this.checkpoint({
                durableRunId,
                ...patch,
                status,
                reason: patch.reason || `run.${status}`
            }) || record;
            next.status = status;
            next.completed_at = this.nowIso();
            next.updated_at = next.completed_at;
            this.upsert(next);
            return next;
        }

        recoverStaleRuns() {
            const recovered = [];
            const records = this.getAll().map(record => {
                if (!record || record.status !== 'running') return record;
                const next = {
                    ...record,
                    status: 'recoverable',
                    updated_at: this.nowIso(),
                    checkpoint_reason: 'durable.recovered',
                    resume_prompt: this.buildResumePrompt(record)
                };
                recovered.push(next);
                return next;
            });
            if (recovered.length) this.persistAll(records);
            return recovered;
        }

        markResumed(durableRunId) {
            const record = this.get(durableRunId);
            if (!record) return null;
            const next = {
                ...record,
                status: 'resumed',
                updated_at: this.nowIso(),
                checkpoint_reason: 'durable.resumed'
            };
            this.upsert(next);
            return next;
        }

        get(durableRunId) {
            const key = String(durableRunId || '');
            if (!key) return null;
            return this.getAll().find(record => record?.durableRunId === key) || null;
        }

        getByMessage(chatId, messageId) {
            const chatKey = String(chatId || '');
            const messageKey = String(messageId || '');
            if (!chatKey || !messageKey) return null;
            return this.getAll().find(record =>
                String(record?.chatId || '') === chatKey &&
                String(record?.messageId || '') === messageKey
            ) || null;
        }

        removeForChats(chatIds = []) {
            const targets = new Set((Array.isArray(chatIds) ? chatIds : []).map(String));
            if (!targets.size) return;
            const kept = this.getAll().filter(record => !targets.has(String(record?.chatId || '')));
            this.persistAll(kept);
        }

        resolveRecord(input = {}) {
            if (input.durableRunId) return this.get(input.durableRunId);
            if (input.chatId && input.messageId) return this.getByMessage(input.chatId, input.messageId);
            return null;
        }

        upsert(record) {
            if (!record?.durableRunId) return false;
            const records = this.getAll().filter(item => item?.durableRunId !== record.durableRunId);
            records.push(record);
            records.sort((a, b) => Date.parse(b?.updated_at || 0) - Date.parse(a?.updated_at || 0));
            this.persistAll(records.slice(0, this.maxRecords));
            return true;
        }

        getAll() {
            try {
                const parsed = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                console.warn('Failed to parse durable AgentRun store.', error);
                return [];
            }
        }

        persistAll(records) {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(Array.isArray(records) ? records : []));
                return true;
            } catch (error) {
                console.warn('Failed to persist durable AgentRun store.', error);
                return false;
            }
        }

        compactAgentRun(snapshot) {
            if (!snapshot || typeof snapshot !== 'object') return null;
            if (window.historyManager?.compactAgentRunForStorage) {
                return window.historyManager.compactAgentRunForStorage(snapshot, 'tight');
            }
            return snapshot;
        }

        getLastStage(snapshot) {
            const stages = Array.isArray(snapshot?.stages) ? snapshot.stages : [];
            return stages.find(stage => stage?.state === 'active')
                || stages.slice().reverse().find(stage => stage?.state === 'done' || stage?.state === 'error')
                || null;
        }

        getLastEvent(snapshot) {
            const events = Array.isArray(snapshot?.events) ? snapshot.events : [];
            return events.slice().reverse().find(event => event?.type && event.type !== 'model.delta') || null;
        }

        buildResumePrompt(record = {}) {
            const original = String(record.user_message_preview || record.routing_message_preview || '').trim();
            const checkpoint = record.last_checkpoint || {};
            const lines = [
                '继续刚才中断的 Agent 任务。',
                '请基于上一条 Agent Run 状态、已保存的 checkpoint、已有工具结果和证据继续推进，避免重复已经完成的读取或检索。',
                original ? `原始任务：${original}` : '',
                checkpoint.stage ? `最近阶段：${checkpoint.stage} / ${checkpoint.stage_state || 'unknown'}` : '',
                checkpoint.event_type ? `最近事件：${checkpoint.event_type}` : '',
                record.content_preview ? `上次输出预览：${record.content_preview}` : '',
                '如果不能真正从后台进程恢复，就把已有快照当作上下文，继续完成剩余工作。'
            ];
            return lines.filter(Boolean).join('\n');
        }

        createId(prefix) {
            return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
        }

        nowIso() {
            return new Date().toISOString();
        }

        truncate(value, max) {
            const text = String(value ?? '');
            if (!max || text.length <= max) return text;
            return `${text.slice(0, max)}...`;
        }
    }

    window.AgentDurableStore = AgentDurableStore;
    window.agentDurableStore = window.agentDurableStore || new AgentDurableStore();
})();
