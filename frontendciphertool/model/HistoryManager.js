/**
 * HistoryManager - 聊天历史管理模块
 * 负责聊天历史的增删改查和 localStorage 持久化
 */

class HistoryManager {
    constructor() {
        this.STORAGE_KEY = 'chatHistory';
        this.CURRENT_CHAT_KEY = 'currentChatId';
        this.MAX_REASONING_CHARS = 8000;
        this.MAX_TOOL_ARGUMENT_CHARS = 800;
        this.MAX_AGENT_EVENTS = 240;
        this.MAX_AGENT_EVIDENCE = 64;
        this.MAX_AGENT_TOOL_RESULTS = 36;
        this.MAX_STORED_CONTENT_CHARS = 260000;
    }


    getChatHistory() {
        const history = localStorage.getItem(this.STORAGE_KEY);
        if (!history) return {};
        try {
            return JSON.parse(history) || {};
        } catch (error) {
            console.warn('Failed to parse chat history; starting with an empty history.', error);
            return {};
        }
    }

    saveChatHistory(chatId, title, messages = []) {

        const history = this.getChatHistory();
        history[chatId] = {
            id: chatId,
            title: title || `对话 ${Object.keys(history).length + 1}`,
            messages: Array.isArray(messages)
                ? messages.map(message => this.prepareMessageForStorage(message))
                : [],
            timestamp: Date.now()
        };
        return this.persistHistory(history);
    }


    getCurrentChatId() {
        return localStorage.getItem(this.CURRENT_CHAT_KEY);
    }

    setCurrentChatId(chatId) {
        localStorage.setItem(this.CURRENT_CHAT_KEY, chatId);
    }

    createNewChat() {
        const chatId = 'chat_' + Date.now();
        this.setCurrentChatId(chatId);
        return chatId;
    }

    createMessageId(role = 'message') {
        const prefix = String(role || 'message').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'message';
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
    }

    getMessages(chatId) {
        const history = this.getChatHistory();
        return history[chatId]?.messages || [];
    }

    addMessage(chatId, message) {
        const history = this.getChatHistory();
        const storedMessage = this.prepareMessageForStorage(message);

        if (!history[chatId]) {
            // 如果聊天不存在，创建新的
            const titleText = this.getMessageTitleText(message);
            const title = message.role === 'user'
                ? (titleText.length > 20 ? titleText.substring(0, 20) + '...' : titleText)
                : '新对话';
            history[chatId] = {
                id: chatId,
                title: title,
                messages: [],
                timestamp: Date.now()
            };
        }

        history[chatId].messages.push(storedMessage);
        const messageIndex = history[chatId].messages.length - 1;
        if (storedMessage.agent_run?.runId) {
            storedMessage.agent_run_id = storedMessage.agent_run.runId;

        }
        history[chatId].timestamp = Date.now();

        // 如果是第一条用户消息，更新标题
        if (storedMessage.role === 'user') {
            const userMessages = history[chatId].messages.filter(m => m.role === 'user');
            if (userMessages.length === 1) {
                const titleText = this.getMessageTitleText(storedMessage);
                history[chatId].title = titleText.length > 20
                    ? titleText.substring(0, 20) + '...'
                    : titleText;
            }
        }

        return this.persistHistory(history);
    }

    getMessage(chatId, messageId) {
        const messages = this.getMessages(chatId);
        const key = String(messageId || '');
        return messages.find(message => String(message?.message_id || message?.id || '') === key) || null;
    }

    updateMessage(chatId, messageId, patch = {}) {
        if (!chatId || !messageId) return null;
        const history = this.getChatHistory();
        const chat = history[chatId];
        if (!chat || !Array.isArray(chat.messages)) return null;

        const key = String(messageId);
        const index = chat.messages.findIndex(message => String(message?.message_id || message?.id || '') === key);
        if (index < 0) return null;

        const existing = chat.messages[index] || {};
        const merged = {
            ...existing,
            ...(patch || {}),
            id: existing.id || patch.id || key,
            message_id: existing.message_id || patch.message_id || key,
            role: patch.role || existing.role || 'assistant',
            created_at: existing.created_at || patch.created_at || Date.now(),
            updated_at: Date.now()
        };
        const storedMessage = this.prepareMessageForStorage(merged);
        chat.messages[index] = storedMessage;
        if (storedMessage.agent_run?.runId) {
            storedMessage.agent_run_id = storedMessage.agent_run.runId;
        }
        chat.timestamp = Date.now();
        this.persistHistory(history);
        return storedMessage;
    }

    deleteChats(chatIds) {
        const history = this.getChatHistory();
        const currentChatId = this.getCurrentChatId();
        let currentChatDeleted = false;

        chatIds.forEach(chatId => {
            if (chatId === currentChatId) {
                currentChatDeleted = true;
            }
            delete history[chatId];
        });


        this.persistHistory(history);

        if (currentChatDeleted) {
            // 切换到最新的聊天
            const remainingIds = Object.keys(history).sort((a, b) =>
                history[b].timestamp - history[a].timestamp
            );
            if (remainingIds.length > 0) {
                this.setCurrentChatId(remainingIds[0]);
            } else {
                localStorage.removeItem(this.CURRENT_CHAT_KEY);
            }
        }

        return currentChatDeleted;
    }

    searchHistory(query) {
        if (!query.trim()) {
            return this.getChatHistory();
        }

        const history = this.getChatHistory();
        const filtered = {};
        const lowerQuery = query.toLowerCase();

        Object.entries(history).forEach(([id, chat]) => {
            // 搜索标题
            if (chat.title.toLowerCase().includes(lowerQuery)) {
                filtered[id] = chat;
                return;
            }
            // 搜索消息内容
            for (const msg of chat.messages) {
                const contentText = this.getMessageTitleText(msg).toLowerCase();
                if (contentText && contentText.includes(lowerQuery)) {
                    filtered[id] = chat;
                    break;
                }
            }
        });

        return filtered;
    }

    getSortedHistory(history = null) {
        const data = history || this.getChatHistory();
        return Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
    }

    findEmptyChat() {
        const history = this.getChatHistory();
        return Object.keys(history).find(id => {
            const chat = history[id];
            return !chat.messages || chat.messages.length === 0;
        }) || null;
    }

    importChats(chats = []) {
        const history = this.getChatHistory();
        const importedIds = [];

        chats.forEach((chat, index) => {
            const baseId = String(chat.id || '').trim();
            let chatId = baseId && !history[baseId] ? baseId : `imported_${Date.now()}_${index}`;
            while (history[chatId]) {
                chatId = `imported_${Date.now()}_${index}_${Math.random().toString(16).slice(2, 8)}`;
            }

            const messages = Array.isArray(chat.messages)
                ? chat.messages.map(message => this.prepareMessageForStorage(message))
                : [];
            history[chatId] = {
                id: chatId,
                title: chat.title || `导入会话 ${Object.keys(history).length + 1}`,
                messages,
                timestamp: Number(chat.timestamp) || Date.now(),
                imported_at: Date.now(),
                imported_from: baseId || null
            };

            importedIds.push(chatId);
        });

        this.persistHistory(history);
        if (importedIds.length > 0) {
            this.setCurrentChatId(importedIds[0]);
        }
        return importedIds;
    }

    persistHistory(history) {
        const attempts = [
            this.compactHistoryForStorage(history, 'normal'),
            this.compactHistoryForStorage(history, 'tight'),
            this.pruneHistoryToBudget(this.compactHistoryForStorage(history, 'minimal'), 3600000)
        ];

        let lastError = null;
        for (const payload of attempts) {
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
                return true;
            } catch (error) {
                lastError = error;
                if (!this.isStorageQuotaError(error)) break;
            }
        }

        console.warn('Chat history was not persisted because browser storage is full or unavailable.', lastError);
        return false;
    }

    isStorageQuotaError(error) {
        const name = String(error?.name || '');
        const message = String(error?.message || '');
        return name === 'QuotaExceededError'
            || name === 'NS_ERROR_DOM_QUOTA_REACHED'
            || error?.code === 22
            || error?.code === 1014
            || /quota|exceeded|storage/i.test(message);
    }

    compactHistoryForStorage(history, level = 'normal') {
        const compacted = {};
        Object.entries(history || {}).forEach(([chatId, chat]) => {
            if (!chat || typeof chat !== 'object') return;
            const messages = Array.isArray(chat.messages) ? chat.messages : [];
            compacted[chatId] = {
                id: chat.id || chatId,
                title: this.truncateText(chat.title || '', 140),
                messages: messages.map(message => this.prepareMessageForStorage(message, level)),
                timestamp: Number(chat.timestamp) || Date.now()
            };
            if (chat.imported_at) compacted[chatId].imported_at = chat.imported_at;
            if (chat.imported_from) compacted[chatId].imported_from = chat.imported_from;
        });
        return compacted;
    }

    pruneHistoryToBudget(history, maxChars) {
        const currentChatId = this.getCurrentChatId();
        const entries = Object.entries(history || {}).sort((a, b) => {
            if (a[0] === currentChatId) return -1;
            if (b[0] === currentChatId) return 1;
            return (Number(b[1]?.timestamp) || 0) - (Number(a[1]?.timestamp) || 0);
        });
        const kept = {};
        for (const [chatId, chat] of entries) {
            kept[chatId] = chat;
            if (JSON.stringify(kept).length > maxChars) {
                delete kept[chatId];
                if (chatId === currentChatId) {
                    kept[chatId] = {
                        ...chat,
                        messages: (chat.messages || []).slice(-12)
                    };
                }
                break;
            }
        }
        return kept;
    }

    prepareMessageForStorage(message, level = 'normal') {
        const source = message && typeof message === 'object' ? message : {};
        const messageId = source.message_id || source.id || this.createMessageId(source.role || 'assistant');
        const stored = {
            id: messageId,
            message_id: messageId,
            role: source.role || 'assistant',
            content: this.compactMessageContent(source.content, level),
            status: source.status || 'completed',
            created_at: source.created_at || Date.now(),
            updated_at: source.updated_at || source.created_at || Date.now()
        };

        if (source.owner_id || source.user_id || source.account_id) {
            stored.owner_id = source.owner_id || source.user_id || source.account_id;
        }
        if (source.run_id) stored.run_id = source.run_id;
        if (source.error_message || source.error) {
            stored.error_message = this.truncateText(source.error_message || source.error || '', 1200);
        }
        if (source.agent_run_id) stored.agent_run_id = source.agent_run_id;
        if (source.reasoning_content || source.reasoning) {
            const max = level === 'normal' ? this.MAX_REASONING_CHARS : level === 'tight' ? 2400 : 0;
            if (max > 0) {
                stored.reasoning_content = this.truncateText(source.reasoning_content || source.reasoning || '', max);
            }
        }
        if (Array.isArray(source.attachments) && source.attachments.length) {
            stored.attachments = source.attachments.map(item => this.compactAttachment(item)).filter(Boolean);
        }
        if (Array.isArray(source.images) && source.images.length) {
            stored.images = source.images.map(image => this.compactStoredImage(image)).filter(Boolean);
        }
        if (source.agent_run) {
            stored.agent_run = this.compactAgentRunForStorage(source.agent_run, level);
            if (stored.agent_run?.runId) stored.agent_run_id = stored.agent_run.runId;
        }
        if (!source.agent_run && Array.isArray(source.tool_calls) && source.tool_calls.length) {
            stored.tool_calls = this.compactToolCallsForStorage(source.tool_calls, level);
        }
        return stored;
    }

    compactMessageContent(content, level = 'normal') {
        const max = level === 'minimal' ? 60000 : level === 'tight' ? 120000 : this.MAX_STORED_CONTENT_CHARS;
        if (Array.isArray(content)) {
            return content.map(part => {
                if (part?.type === 'text') {
                    return { type: 'text', text: this.truncateText(part.text || '', max) };
                }
                if (part?.type === 'image_url') {
                    const url = String(part.image_url?.url || '');
                    return {
                        type: 'image_url',
                        image_url: {
                            url: url.startsWith('data:') ? `[data image omitted, ${url.length} chars]` : this.truncateText(url, 1200),
                            detail: part.image_url?.detail || 'auto'
                        }
                    };
                }
                return this.compactJsonValue(part, 2, 400, 8);
            });
        }
        return this.truncateText(content == null ? '' : String(content), max);
    }

    compactAttachment(item) {
        if (!item || typeof item !== 'object') return null;
        return {
            name: this.truncateText(item.name || '', 180),
            path: this.truncateText(item.path || '', 500),
            size: Number(item.size) || 0,
            type: this.truncateText(item.type || '', 120),
            kind: this.truncateText(item.kind || '', 40)
        };
    }

    compactStoredImage(image) {
        if (!image || typeof image !== 'object') return null;
        const url = String(image.url || '');
        if (!url) return null;
        return {
            url: url.startsWith('data:') ? `[data image omitted, ${url.length} chars]` : this.truncateText(url, 1200),
            mimeType: image.mimeType || 'image',
            revisedPrompt: this.truncateText(image.revisedPrompt || '', 600)
        };
    }

    compactToolCallsForStorage(toolCalls, level = 'normal') {
        const limit = level === 'normal' ? 50 : level === 'tight' ? 24 : 0;
        if (limit <= 0) return [];
        return (Array.isArray(toolCalls) ? toolCalls : []).slice(0, limit).map(toolCall => {
            const fn = toolCall?.function || {};
            return {
                id: toolCall?.id || '',
                type: toolCall?.type || 'function',
                function: {
                    name: fn.name || '',
                    arguments: this.truncateText(
                        typeof fn.arguments === 'string' ? fn.arguments : JSON.stringify(fn.arguments || {}),
                        level === 'normal' ? this.MAX_TOOL_ARGUMENT_CHARS : 320
                    )
                }
            };
        }).filter(toolCall => toolCall.function.name);
    }

    compactAgentRunForStorage(run, level = 'normal') {
        if (!run || typeof run !== 'object') return null;
        const eventLimit = level === 'normal' ? this.MAX_AGENT_EVENTS : level === 'tight' ? 120 : 40;
        const evidenceLimit = level === 'normal' ? this.MAX_AGENT_EVIDENCE : level === 'tight' ? 44 : 20;
        const toolResultLimit = level === 'normal' ? this.MAX_AGENT_TOOL_RESULTS : level === 'tight' ? 16 : 0;
        return {
            contract_version: run.contract_version || 'agent-contract-v1',
            runId: run.runId || '',
            mode: run.mode || '',
            researchProfile: run.researchProfile || '',
            newsBriefScope: run.newsBriefScope || null,
            selectedTools: Array.isArray(run.selectedTools) ? run.selectedTools.slice(0, 24) : [],
            agentEarthTargetCalls: run.agentEarthTargetCalls || 0,
            maxIterations: run.maxIterations ?? '',
            stages: this.compactAgentStages(run.stages),
            traces: this.compactAgentTraces(run.traces, level === 'normal' ? 28 : 10),
            context_pack_summary: this.compactJsonValue(run.context_pack_summary || null, 2, 240, 12),
            tool_contracts: this.compactToolContracts(run.tool_contracts),
            events: this.compactAgentEvents(run.events, eventLimit, level),
            metrics: run.metrics || null,
            warnings: Array.isArray(run.warnings) ? run.warnings.slice(0, 12).map(warning => this.truncateText(warning, 240)) : [],
            tool_results: this.compactAgentToolResults(run.tool_results, toolResultLimit, level),
            evidence_ledger: this.compactEvidenceLedger(run.evidence_ledger, evidenceLimit, level),
            citation_verification: this.compactCitationVerification(run.citation_verification, level),
            artifacts: []
        };
    }

    compactAgentStages(stages) {
        return (Array.isArray(stages) ? stages : []).slice(0, 12).map(stage => ({
            id: stage?.id || '',
            label: stage?.label || '',
            state: stage?.state || '',
            note: this.truncateText(stage?.note || '', 120)
        }));
    }

    compactAgentTraces(traces, limit) {
        return (Array.isArray(traces) ? traces : []).slice(-limit).map(trace => ({
            stage: trace?.stage || '',
            message: this.truncateText(trace?.message || '', 220)
        }));
    }

    compactToolContracts(contracts) {
        return (Array.isArray(contracts) ? contracts : []).slice(0, 32).map(contract => ({
            name: contract?.name || '',
            package: contract?.package || '',
            risk: contract?.risk || '',
            sideEffect: contract?.sideEffect || '',
            requiresApproval: Boolean(contract?.requiresApproval),
            owner: contract?.owner || '',
            projectAccess: contract?.projectAccess || '',
            networkAccess: contract?.networkAccess || ''
        }));
    }

    compactAgentEvents(events, limit, level = 'normal') {
        const maxString = level === 'normal' ? 320 : 180;
        return (Array.isArray(events) ? events : [])
            .filter(event => event?.type !== 'model.delta')
            .slice(-limit)
            .map(event => ({
                id: event?.id || '',
                contract_version: event?.contract_version || 'agent-contract-v1',
                runId: event?.runId || '',
                seq: event?.seq || 0,
                type: event?.type || '',
                ts: event?.ts || '',
                stage: event?.stage || '',
                visibility: event?.visibility || 'history',
                payload: this.compactJsonValue(event?.payload || {}, 2, maxString, 14)
            }));
    }

    compactAgentToolResults(toolResults, limit, level = 'normal') {
        const maxString = level === 'normal' ? 320 : 180;
        if (limit <= 0) return [];
        return (Array.isArray(toolResults) ? toolResults : []).slice(-limit).map(result => ({
            id: result?.id || '',
            name: result?.name || '',
            status: result?.status || '',
            started_at: result?.started_at || '',
            finished_at: result?.finished_at || '',
            result_chars: result?.result_chars || 0,
            risk: result?.risk || '',
            approval_required: Boolean(result?.approval_required),
            arguments_preview: this.truncateText(result?.arguments_preview || '', maxString),
            result_preview: this.truncateText(result?.result_preview || '', maxString)
        }));
    }

    compactEvidenceLedger(evidenceLedger, limit, level = 'normal') {
        const maxSnippet = level === 'normal' ? 260 : 160;
        const trustRank = { primary: 5, high: 4, medium: 3, low: 2, unknown: 1 };
        return (Array.isArray(evidenceLedger) ? evidenceLedger : [])
            .filter(item => item && (item.title || item.url || item.source_id))
            .slice()
            .sort((a, b) => {
                const usedDelta = Number(Boolean(b.usedInFinalAnswer)) - Number(Boolean(a.usedInFinalAnswer));
                if (usedDelta) return usedDelta;
                return (trustRank[b.trustLevel] || 0) - (trustRank[a.trustLevel] || 0);
            })
            .slice(0, limit)
            .map(item => ({
                id: item.id || '',
                kind: item.kind || '',
                tool: item.tool || '',
                source_id: item.source_id ?? item.sourceId ?? '',
                title: this.truncateText(item.title || '', 220),
                url: this.truncateText(item.url || '', 700),
                observed_at: item.observed_at || item.retrievedAt || '',
                query: this.truncateText(item.query || '', 180),
                search_source: item.search_source || '',
                community: item.community || '',
                trustLevel: item.trustLevel || '',
                trustReason: this.truncateText(item.trustReason || '', 180),
                usedInFinalAnswer: Boolean(item.usedInFinalAnswer),
                claimIds: Array.isArray(item.claimIds) ? item.claimIds.slice(0, 8) : [],
                snippet: this.truncateText(item.snippet || '', maxSnippet),
                content_preview: this.truncateText(item.content_preview || '', maxSnippet),
                error: this.truncateText(item.error || '', 180)
            }));
    }

    compactCitationVerification(verification, level = 'normal') {
        if (!verification || typeof verification !== 'object') return null;
        const limit = level === 'normal' ? 28 : 12;
        return {
            matched: Array.isArray(verification.matched) ? verification.matched.slice(0, limit).map(item => ({
                marker: item.marker,
                evidence_ids: Array.isArray(item.evidence_ids) ? item.evidence_ids.slice(0, 8) : [],
                source_line: this.truncateText(item.source_line || '', 260),
                strongestTrustLevel: item.strongestTrustLevel || ''
            })) : [],
            unmatched: Array.isArray(verification.unmatched) ? verification.unmatched.slice(0, limit).map(item => ({
                marker: item.marker,
                source_line: this.truncateText(item.source_line || '', 260)
            })) : [],
            weak: Array.isArray(verification.weak) ? verification.weak.slice(0, limit).map(item => ({
                marker: item.marker,
                evidence_ids: Array.isArray(item.evidence_ids) ? item.evidence_ids.slice(0, 8) : [],
                reason: this.truncateText(item.reason || '', 220)
            })) : [],
            citedEvidenceCount: verification.citedEvidenceCount || 0,
            uncitedEvidenceCount: verification.uncitedEvidenceCount || 0
        };
    }

    compactJsonValue(value, depth = 2, maxString = 240, maxArray = 16) {
        if (value == null) return value;
        if (typeof value === 'string') return this.truncateText(value, maxString);
        if (typeof value === 'number' || typeof value === 'boolean') return value;
        if (depth <= 0) return this.truncateText(JSON.stringify(value), maxString);
        if (Array.isArray(value)) {
            return value.slice(0, maxArray).map(item => this.compactJsonValue(item, depth - 1, maxString, maxArray));
        }
        if (typeof value === 'object') {
            const compacted = {};
            Object.entries(value).slice(0, 24).forEach(([key, item]) => {
                compacted[key] = this.compactJsonValue(item, depth - 1, maxString, maxArray);
            });
            return compacted;
        }
        return String(value);
    }

    truncateText(value, max) {
        const text = String(value ?? '');
        if (!max || max <= 0) return '';
        return text.length <= max ? text : `${text.slice(0, max)}...`;
    }

    getMessageTitleText(message) {
        const content = message?.content;
        if (Array.isArray(content)) {
            const textPart = content.find(part => part?.type === 'text');
            return String(textPart?.text || '[multi-part message]');
        }
        return String(content || '');
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    clearReasoningContent(chatId) {
        const history = this.getChatHistory();
        if (history[chatId]) {
            history[chatId].messages = history[chatId].messages.map(msg => {
                if (msg.reasoning_content) {
                    return { ...msg, reasoning_content: null };
                }
                return msg;
            });
            this.persistHistory(history);
        }
    }

    getMessagesForAPI(chatId) {
        const messages = this.getMessages(chatId);
        return messages
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .map(msg => {
                return {
                    role: msg.role,
                    content: msg.content || ''
                };
            });
    }
}

// 导出单例
window.historyManager = new HistoryManager();
