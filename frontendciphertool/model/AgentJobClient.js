/**
 * AgentJobClient - 后台任务客户端。
 *
 * 目标：研报/深度研究、作图、视频创作在关闭网页后继续在服务端执行，重新进入网页时
 * 按任务状态恢复现场。实现方式是把长任务提交到 /api/agent-jobs，由后端任务目录记录
 * 状态，页面只负责轮询和渲染。
 *
 * 本文件不改 main.js / ChatUI.js，而是以补丁方式接入现有链路：
 *   - AgentRuntime.prototype.run：研究型 run（非 chat 档）改为提交后台任务；
 *   - DeepSeekClient.prototype.generateImage / generateVideo：改为提交后台任务；
 *   - ChatUI.prototype.displayMessageFromHistory：历史里仍在 running 的消息，
 *     如果对应后台任务，就恢复进度面板并继续轮询。
 *
 * 后端未部署或接口不可用时自动落回原来的前端执行路径（不会破坏现有功能），
 * 因此前端可以先上线、后端随后部署。
 */
(function () {
    'use strict';

    const STATE = {
        enabled: true,
        disabledReason: '',
        disabledUntil: 0,
        activeLoadedAt: 0,
        activePromise: null,
        jobsByMessage: new Map(),   // chatId::messageId -> job record
        monitors: new Map(),        // jobId -> monitor
        started: false
    };

    const POLL_INTERVAL_MS = 1500;
    const HIDDEN_POLL_INTERVAL_MS = 6000;
    const ACTIVE_REFRESH_MS = 4000;
    const RESUME_RETRY_MS = 5000;
    const RECOVERY_PLACEHOLDER_TEXT = '运行已恢复到本地检查点。可以继续此任务，系统会带上上次的 AgentRun 状态。';

    function keyOf(chatId, messageId) {
        return `${chatId || ''}::${messageId || ''}`;
    }

    function now() {
        return Date.now();
    }

    function apiBase() {
        try {
            const override = window.CIPHERTOOL_API_BASE || localStorage.getItem('CIPHERTOOL_API_BASE') || '';
            if (/^https?:\/\//i.test(override)) {
                return String(override).replace(/\/+$/, '');
            }
        } catch (error) {
            // ignore
        }
        return '';
    }

    function apiUrl(path) {
        return `${apiBase()}${path}`;
    }

    function authHeaders() {
        try {
            const headers = window.CipherAuth?.getAuthHeaders?.() || {};
            return headers && typeof headers === 'object' ? headers : {};
        } catch (error) {
            return {};
        }
    }

    function isLoggedIn() {
        try {
            return Boolean(window.CipherAuth?.getUser?.()?.token);
        } catch (error) {
            return false;
        }
    }

    function currentChatId() {
        try {
            return window.historyManager?.getCurrentChatId?.() || '';
        } catch (error) {
            return '';
        }
    }

    function runningAssistantMessage(chatId) {
        try {
            const messages = window.historyManager?.getMessages?.(chatId) || [];
            for (let index = messages.length - 1; index >= 0; index -= 1) {
                const message = messages[index];
                if (!message || message.role !== 'assistant') continue;
                if (message.status !== 'running') continue;
                const messageId = message.message_id || message.id;
                if (!messageId) continue;
                const known = STATE.jobsByMessage.get(keyOf(chatId, messageId));
                if (known && !isTerminal(known.view?.status)) continue;
                return { chatId, messageId, message };
            }
        } catch (error) {
            // ignore
        }
        return null;
    }

    function isTerminal(status) {
        return status === 'completed' || status === 'failed' || status === 'cancelled';
    }

    class JobUnavailableError extends Error {
        constructor(message) {
            super(message || '后台任务接口不可用');
            this.name = 'JobUnavailableError';
        }
    }

    function disableTemporarily(reason, millis) {
        STATE.enabled = false;
        STATE.disabledReason = reason || '';
        STATE.disabledUntil = now() + (millis || 60000);
        console.warn(`[AgentJobClient] 后台任务暂不可用，回到前端执行：${STATE.disabledReason}`);
    }

    function refreshAvailability() {
        if (!STATE.enabled && STATE.disabledUntil && now() > STATE.disabledUntil) {
            STATE.enabled = true;
            STATE.disabledReason = '';
            STATE.disabledUntil = 0;
        }
        return STATE.enabled;
    }

    async function parseResponse(response) {
        let payload = null;
        const raw = await response.text().catch(() => '');
        try {
            payload = raw ? JSON.parse(raw) : null;
        } catch (error) {
            payload = null;
        }
        return { response, payload, raw };
    }

    async function submitJob(kind, chatId, messageId, payload) {
        if (!refreshAvailability()) throw new JobUnavailableError(STATE.disabledReason);
        if (!isLoggedIn()) throw new JobUnavailableError('未登录');
        const body = JSON.stringify({ kind, chatId, messageId, payload: payload || {} });
        let response;
        try {
            response = await fetch(apiUrl('/api/agent-jobs'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body
            });
        } catch (error) {
            disableTemporarily(`网络错误：${error?.message || error}`, 60000);
            throw new JobUnavailableError(`后台任务接口不可达：${error?.message || error}`);
        }
        const { payload: result } = await parseResponse(response);
        if (response.status === 404 || response.status === 405 || response.status === 501) {
            disableTemporarily(`接口 ${response.status}`, 10 * 60 * 1000);
            throw new JobUnavailableError(`后台任务接口未部署（${response.status}）`);
        }
        if (response.status >= 500) {
            // 后端没有这个接口时 Spring 可能落到 500；暂时回退到前端执行，过一分钟再试。
            disableTemporarily(`接口 ${response.status}`, 60 * 1000);
            throw new JobUnavailableError(`后台任务接口异常（${response.status}）`);
        }
        if (!response.ok || result?.success === false) {
            const message = result?.message || `HTTP ${response.status}`;
            if (response.status === 401 || response.status === 403) {
                throw new JobUnavailableError(`登录状态不可用：${message}`);
            }
            throw new Error(`提交后台任务失败：${message}`);
        }
        const view = result?.data || null;
        if (!view?.id) throw new Error('后台任务接口没有返回任务 ID');
        registerJob(view);
        return view;
    }

    async function getJob(jobId, after, contentVersion, includeResult) {
        const query = new URLSearchParams({
            after: String(after || 0),
            contentVersion: String(contentVersion == null ? -1 : contentVersion)
        });
        if (includeResult) query.set('includeResult', '1');
        const response = await fetch(apiUrl(`/api/agent-jobs/${encodeURIComponent(jobId)}?${query.toString()}`), {
            headers: { Accept: 'application/json', ...authHeaders() }
        });
        const { payload } = await parseResponse(response);
        if (response.status === 404) throw new JobUnavailableError('任务不存在（后台可能已重启清理）');
        if (response.status === 401 || response.status === 403) throw new JobUnavailableError('登录状态不可用');
        if (!response.ok || payload?.success === false) {
            throw new Error(payload?.message || `查询任务失败：HTTP ${response.status}`);
        }
        return payload?.data || null;
    }

    async function fetchActiveJobs(force) {
        if (!isLoggedIn()) return [];
        if (!force && STATE.activeLoadedAt && now() - STATE.activeLoadedAt < ACTIVE_REFRESH_MS) return [];
        if (STATE.activePromise) return STATE.activePromise;
        STATE.activePromise = (async () => {
            try {
                const response = await fetch(apiUrl('/api/agent-jobs/active'), {
                    headers: { Accept: 'application/json', ...authHeaders() }
                });
                if (response.status === 404 || response.status === 405) {
                    disableTemporarily('active 接口未部署', 10 * 60 * 1000);
                    return [];
                }
                const { payload } = await parseResponse(response);
                if (!response.ok || payload?.success === false) return [];
                const list = Array.isArray(payload?.data) ? payload.data : [];
                STATE.activeLoadedAt = now();
                list.forEach(view => registerJob(view));
                return list;
            } catch (error) {
                return [];
            } finally {
                STATE.activePromise = null;
            }
        })();
        return STATE.activePromise;
    }

    async function acknowledgeJob(jobId) {
        try {
            await fetch(apiUrl(`/api/agent-jobs/${encodeURIComponent(jobId)}/ack`), {
                method: 'POST',
                headers: { ...authHeaders() }
            });
        } catch (error) {
            // 认领失败不影响本地结果；下一次进入页面还会再拿到同一个终态任务。
        }
    }

    async function cancelJob(jobId) {
        try {
            await fetch(apiUrl(`/api/agent-jobs/${encodeURIComponent(jobId)}/cancel`), {
                method: 'POST',
                headers: { ...authHeaders() }
            });
        } catch (error) {
            // ignore
        }
    }

    function registerJob(view) {
        if (!view?.id || !view.chatId || !view.messageId) return null;
        const key = keyOf(view.chatId, view.messageId);
        const existing = STATE.jobsByMessage.get(key);
        if (existing && existing.view?.id === view.id) {
            existing.view = { ...existing.view, ...view };
            return existing;
        }
        const record = {
            view,
            contentVersion: -1,
            seq: 0,
            lastContent: '',
            lastPersistAt: 0,
            applied: false,
            monitor: null
        };
        STATE.jobsByMessage.set(key, record);
        return record;
    }

    function getJobRecord(chatId, messageId) {
        return STATE.jobsByMessage.get(keyOf(chatId, messageId)) || null;
    }

    function delay(ms, signal) {
        return new Promise(resolve => {
            if (signal?.aborted) {
                resolve(false);
                return;
            }
            const timer = setTimeout(() => {
                signal?.removeEventListener('abort', onAbort);
                resolve(true);
            }, ms);
            const onAbort = () => {
                clearTimeout(timer);
                resolve(false);
            };
            signal?.addEventListener('abort', onAbort, { once: true });
        });
    }

    /**
     * 轮询任务并把状态喂给 onView；终态时 resolve 任务视图。
     * 页面隐藏时降低轮询频率（任务本身在服务端继续，不影响）。
     */
    function monitorJob(record, { signal, onView, onTerminal, onError } = {}) {
        const job = record.view;
        const localController = new AbortController();
        const abort = () => {
            localController.abort();
            if (signal) signal.removeEventListener('abort', abort);
        };
        if (signal) {
            if (signal.aborted) abort();
            else signal.addEventListener('abort', abort, { once: true });
        }
        let stopped = false;
        const loop = async () => {
            let failures = 0;
            while (!stopped && !localController.signal.aborted) {
                try {
                    const view = await getJob(job.id, record.seq || 0, record.contentVersion, isTerminal(record.view?.status));
                    failures = 0;
                    if (view) {
                        applyView(record, view);
                        if (onView) onView(view);
                        if (isTerminal(view.status)) {
                            if (onTerminal) await onTerminal(view);
                            stopped = true;
                            break;
                        }
                    }
                } catch (error) {
                    if (error?.name === 'JobUnavailableError' && /任务不存在/.test(error.message)) {
                        if (onError) onError(error);
                        stopped = true;
                        break;
                    }
                    failures += 1;
                    if (failures >= 8) {
                        if (onError) onError(error);
                        stopped = true;
                        break;
                    }
                    await delay(Math.min(30000, 1000 * Math.pow(2, failures)), localController.signal);
                    continue;
                }
                const interval = document.hidden ? HIDDEN_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
                const keepGoing = await delay(interval, localController.signal);
                if (!keepGoing) break;
            }
        };
        const controller = {
            stop() {
                stopped = true;
                localController.abort();
            }
        };
        record.monitor = controller;
        loop();
        return controller;
    }

    function applyView(record, view) {
        record.view = { ...(record.view || {}), ...view };
        if (typeof view.contentVersion === 'number') {
            record.contentVersion = view.contentVersion;
        }
        if (typeof view.seq === 'number') {
            record.seq = view.seq;
        }
    }

    function resolveChatUI(ui) {
        return ui || window.chatUI;
    }

    function applyAgentEvent(chatUI, container, event) {
        if (!chatUI || !container || !event) return;
        try {
            switch (event.type) {
                case 'panel':
                    if (!container.element?.querySelector?.('.agent-run-panel') && chatUI.createAgentRunPanel) {
                        chatUI.createAgentRunPanel(container, event.plan);
                    }
                    break;
                case 'stage':
                    chatUI.setAgentStage?.(container, event.stage, event.status, event.label);
                    break;
                case 'trace':
                    chatUI.addAgentTrace?.(container, event.stage, event.message);
                    break;
                case 'tool':
                    chatUI.displayToolCall?.(container, {
                        id: event.id,
                        type: 'function',
                        function: { name: event.name, arguments: event.arguments || '{}' }
                    });
                    break;
                case 'toolResult':
                    chatUI.updateToolResult?.(event.id, event.summary, event.success);
                    break;
                case 'reasoning':
                    chatUI.setReasoningStatus?.(container, event.status);
                    break;
                case 'reasoningDone':
                    chatUI.finishReasoning?.(container);
                    break;
                case 'collaboration':
                    chatUI.updateAgentCollaboration?.(container, event.collaboration);
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.warn('[AgentJobClient] 应用事件失败', event.type, error);
        }
    }

    function applyContent(chatUI, container, record, view) {
        if (!view || view.content === undefined) return;
        const content = String(view.content || '');
        if (!content || content === record.lastContent) return;
        record.lastContent = content;
        try {
            chatUI?.updateContent?.(container, content, { streaming: view.status !== 'completed' });
        } catch (error) {
            console.warn('[AgentJobClient] 更新正文失败', error);
        }
        persistPartial(record, content);
    }

    function persistPartial(record, content) {
        const view = record.view || {};
        if (view.kind !== 'agent') return;
        if (now() - record.lastPersistAt < 2000) return;
        record.lastPersistAt = now();
        try {
            window.historyManager?.updateMessage?.(view.chatId, view.messageId, {
                status: 'running',
                content
            });
        } catch (error) {
            // ignore
        }
    }

    function startProgress(chatUI, container, view) {
        if (!chatUI || !container) return;
        try {
            if (view.kind === 'video') {
                chatUI.startVideoGenerationProgress?.(container, {
                    startedAt: Number(view.createdAt) || now(),
                    model: view.model || 'muse-video',
                    phase: view.phase || 'submitting'
                });
            } else if (view.kind === 'image') {
                chatUI.startImageGenerationProgress?.(container, {
                    startedAt: Number(view.createdAt) || now(),
                    model: view.model || '',
                    phase: view.phase || 'connecting'
                });
            }
        } catch (error) {
            console.warn('[AgentJobClient] 启动进度面板失败', error);
        }
    }

    function updateProgress(chatUI, container, view) {
        try {
            chatUI?.updateImageGenerationProgress?.(container, {
                phase: view.phase,
                progress: view.progress
            });
        } catch (error) {
            // ignore
        }
    }

    function buildTerminalPatch(view) {
        const result = view.result || {};
        if (view.kind === 'image') {
            return {
                status: view.status === 'completed' ? 'completed' : (view.status === 'cancelled' ? 'interrupted' : 'error'),
                content: result.content || view.content || (view.status === 'completed' ? '已生成图片。' : ''),
                images: Array.isArray(result.images) ? result.images : undefined,
                error_message: view.error || undefined
            };
        }
        if (view.kind === 'video') {
            return {
                status: view.status === 'completed' ? 'completed' : (view.status === 'cancelled' ? 'interrupted' : 'error'),
                content: result.content || view.content || (view.status === 'completed' ? '已生成视频。' : ''),
                videos: Array.isArray(result.videos) ? result.videos : undefined,
                error_message: view.error || undefined
            };
        }
        return {
            status: view.status === 'completed' ? 'completed' : (view.status === 'cancelled' ? 'interrupted' : 'error'),
            content: result.content || view.content || '',
            agent_run: result.agent_run || undefined,
            tool_calls: Array.isArray(result.tool_calls) ? result.tool_calls : undefined,
            error_message: view.error || undefined
        };
    }

    function messageAlreadyFinal(message, patch) {
        if (!message || message.status !== patch.status) return false;
        if (patch.status !== 'completed') return true;
        if (patch.content && String(message.content || '') !== String(patch.content || '')) return false;
        if (patch.images && (!Array.isArray(message.images) || message.images.length !== patch.images.length)) return false;
        if (patch.videos && (!Array.isArray(message.videos) || message.videos.length !== patch.videos.length)) return false;
        return true;
    }

    function updateHistoryFromJob(view) {
        const patch = buildTerminalPatch(view);
        const message = window.historyManager?.getMessage?.(view.chatId, view.messageId);
        if (!message) return { message: null, patch, changed: false };
        if (messageAlreadyFinal(message, patch)) {
            return { message, patch, changed: false };
        }
        const updated = window.historyManager.updateMessage(view.chatId, view.messageId, patch);
        return { message: updated || message, patch, changed: true };
    }

    /**
     * 终态任务：写入历史（替换占位/可恢复状态），认领任务，必要时刷新当前 DOM。
     */
    function applyTerminalJob(record, rendered, chatUI) {
        const view = record.view || {};
        if (!isTerminal(view.status)) return false;
        const { message, changed } = updateHistoryFromJob(view);
        if (message && rendered?.element?.parentElement && changed) {
            try {
                const fresh = ORIGINAL_DISPLAY_MESSAGE.call(chatUI, message);
                rendered.element.replaceWith(fresh.element);
            } catch (error) {
                console.warn('[AgentJobClient] 终态消息重绘失败', error);
            }
        }
        if (message) {
            acknowledgeJob(view.id);
            STATE.jobsByMessage.delete(keyOf(view.chatId, view.messageId));
            record.applied = true;
        }
        return changed;
    }

    /**
     * 运行中的任务：把历史里那条 running 消息替换成干净容器，回放事件并继续轮询。
     */
    async function attachRunningJob(record, rendered, chatUI) {
        const view = record.view || {};
        let container = rendered;
        try {
            const message = window.historyManager?.getMessage?.(view.chatId, view.messageId);
            // 后台任务接手时不能再把「已恢复到本地检查点」的占位正文留在回答里，
            // 否则面板在跑，正文却还写着运行已中断。
            const storedContent = String(message?.content || '');
            const cleanContent = storedContent === RECOVERY_PLACEHOLDER_TEXT ? '' : storedContent;
            if (message && rendered?.element?.parentElement) {
                const clean = { ...message, status: 'running', content: cleanContent, agent_run: null, tool_calls: null, images: [], videos: [] };
                const fresh = ORIGINAL_DISPLAY_MESSAGE.call(chatUI, clean);
                rendered.element.replaceWith(fresh.element);
                container = fresh;
            }
            window.historyManager?.updateMessage?.(view.chatId, view.messageId, {
                status: 'running',
                content: cleanContent,
                resume_prompt: undefined,
                error_message: undefined
            });
        } catch (error) {
            console.warn('[AgentJobClient] 重绘运行中消息失败', error);
        }
        // 恢复前先回放当前快照里的事件和正文。
        try {
            const full = await getJob(view.id, 0, -1, false);
            if (full) {
                applyView(record, full);
                if (Array.isArray(full.events)) {
                    full.events.forEach(event => applyAgentEvent(chatUI, container, event));
                }
                if (view.kind === 'image' || view.kind === 'video') startProgress(chatUI, container, full);
                if (isTerminal(full.status)) {
                    record.view = { ...record.view, ...full };
                    applyTerminalJob(record, container, chatUI);
                    return;
                }
                applyContent(chatUI, container, record, full);
            }
        } catch (error) {
            console.warn('[AgentJobClient] 拉取任务快照失败', error);
        }
        if (record.monitor) record.monitor.stop();
        monitorJob(record, {
            onView: current => {
                if (current.events && Array.isArray(current.events)) {
                    current.events.forEach(event => applyAgentEvent(chatUI, container, event));
                }
                if (current.kind === 'image' || current.kind === 'video') updateProgress(chatUI, container, current);
                applyContent(chatUI, container, record, current);
            },
            onTerminal: () => {
                try {
                    chatUI.finalizeMessage?.(container);
                } catch (error) {
                    // ignore
                }
                applyTerminalJob(record, container, chatUI);
            },
            onError: error => {
                console.warn('[AgentJobClient] 任务轮询失败', error);
            }
        });
    }

    function attachToRenderedMessage(chatUI, msg, rendered) {
        if (!msg || msg.role !== 'assistant') return;
        const chatId = currentChatId();
        const messageId = msg.message_id || msg.id;
        if (!chatId || !messageId) return;
        const existing = getJobRecord(chatId, messageId);
        const handle = record => {
            if (!record) return;
            // 本页正在跑的 run 由 runAgentJob/runMediaJob 直接驱动；main.js 会在切走再切回时
            // 把活跃运行的容器引用搬到新 DOM，这里不能再起第二个轮询把旧容器当成现场。
            if (record.live) return;
            if (isTerminal(record.view?.status)) {
                loadTerminalAndApply(record, rendered, chatUI);
                return;
            }
            attachRunningJob(record, rendered, chatUI);
        };
        if (existing) {
            handle(existing);
            return;
        }
        // 历史里显示为 running/recoverable 的消息才值得查后台任务；已完成的消息不打扰。
        if (msg.status !== 'running' && msg.status !== 'recoverable') return;
        fetchActiveJobs().then(() => handle(getJobRecord(chatId, messageId))).catch(() => {});
    }

    async function loadTerminalAndApply(record, rendered, chatUI) {
        try {
            const full = await getJob(record.view.id, 0, -1, true);
            if (full) applyView(record, full);
        } catch (error) {
            // 取不到完整结果时先保留 durable 恢复态，等下一次进入页面再试，避免用空正文覆盖历史。
            console.warn('[AgentJobClient] 拉取任务结果失败', error);
            return;
        }
        if (!record.view?.result && record.view?.status === 'completed') return;
        applyTerminalJob(record, rendered, chatUI);
    }

    /**
     * 「继续此任务」：不再把整段 checkpoint 说明塞进输入框、当成新的用户消息发出去。
     *
     * 优先接上同一条消息仍在跑的后台任务；没有对应任务时，用同一个 assistant 消息
     * 直接提交续跑任务，checkpoint 只作为模型内部上下文。界面上看到的仍然是
     * 上次中断的那条回答在继续，而不是多出一条长文用户消息。
     */
    async function resumeMessage({ chatId, message, rendered }) {
        if (!message || !chatId) return false;
        const messageId = message.message_id || message.id;
        if (!messageId) return false;
        if (!isLoggedIn() || !refreshAvailability()) return false;
        const chatUI = resolveChatUI();
        const existing = getJobRecord(chatId, messageId);
        if (existing) {
            if (!isTerminal(existing.view?.status)) {
                attachRunningJob(existing, rendered, chatUI);
                return true;
            }
            loadTerminalAndApply(existing, rendered, chatUI);
            return true;
        }
        const resumePrompt = String(message.resume_prompt || '').trim() || buildInternalResumePrompt(message);
        const messages = buildResumeMessages(chatId, messageId);
        messages.push({ role: 'user', content: resumePrompt });
        const payload = {
            messages,
            userMessage: resumePrompt,
            enableThinking: true,
            toolEnabled: true,
            hasAttachments: false,
            contextPack: null,
            toolContext: null,
            // 续跑沿用中断前的交付档位：对话档不要突然拉起并行专家，
            // 研报档也不要降成一段普通回答。
            routingHint: buildCheckpointRoutingHint(message),
            usageTurnId: `resume_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        };
        let view = null;
        try {
            view = await submitJob('agent', chatId, messageId, payload);
        } catch (error) {
            console.warn('[AgentJobClient] 续跑任务提交失败', error);
            return false;
        }
        const record = getJobRecord(chatId, messageId);
        if (!record || !view) return false;
        await attachRunningJob(record, rendered, chatUI);
        return true;
    }

    function buildCheckpointRoutingHint(message) {
        const events = message?.agent_run?.events;
        if (!Array.isArray(events)) return null;
        const planEvent = events.slice().reverse().find(event => event?.type === 'plan.created');
        const payload = planEvent?.payload || {};
        const routing = payload.routing || {};
        const tier = String(payload.deliverable_tier || routing.tier || '').trim();
        if (!tier) return null;
        return {
            tier,
            dimensions: Array.isArray(routing.dimensions) ? routing.dimensions.slice(0, 24) : [],
            reason: '沿用中断前的档位判定'
        };
    }

    function buildInternalResumePrompt(message) {
        const preview = String(message?.content || '').trim().slice(0, 1200);
        return [
            '继续这个中断的 Agent 任务，从上次中断的位置接着完成；不要重新开始，也不要重复已经完成的检索和写作。',
            preview ? '上次输出预览：' + preview : ''
        ].filter(Boolean).join('\n');
    }

    function buildResumeMessages(chatId, messageId) {
        const history = window.historyManager?.getMessages?.(chatId) || [];
        const result = [];
        for (const item of history) {
            if (item.role !== 'user' && item.role !== 'assistant') continue;
            const id = item.message_id || item.id;
            if (id === messageId) break;
            const content = String(item.content || '').trim();
            if (!content) continue;
            result.push({ role: item.role, content: content.slice(0, 8000) });
        }
        // 续跑只需要最近的上下文；旧对话不要把任务请求撑得过大。
        return result.slice(-16);
    }

    async function resumeAllJobs() {
        if (!isLoggedIn()) return;
        const list = await fetchActiveJobs(true);
        if (!Array.isArray(list)) return;
        for (const view of list) {
            if (!view?.id) continue;
            const record = registerJob(view);
            if (!record) continue;
            if (!isTerminal(view.status)) continue;
            // active 列表只带元数据；终态结果要单独取一次，才能写回聊天记录。
            try {
                const full = await getJob(view.id, 0, -1, true);
                if (full) applyView(record, full);
            } catch (error) {
                continue;
            }
            const { message } = updateHistoryFromJob(record.view);
            if (message) {
                acknowledgeJob(record.view.id);
                STATE.jobsByMessage.delete(keyOf(record.view.chatId, record.view.messageId));
            }
        }
        // 重新进入网页时如果当前是空会话，自动打开最后一个仍在跑/未认领任务所在的会话，
        // 否则用户会停在欢迎面板，看不到后台任务已经跑到哪一步。
        const target = list.find(item => item?.status === 'running') || list.find(item => item && !item.acknowledged);
        if (target?.chatId) {
            const current = currentChatId();
            const currentMessages = window.historyManager?.getMessages?.(current) || [];
            if (current !== target.chatId && currentMessages.length === 0) {
                try {
                    window.historyManager?.setCurrentChatId?.(target.chatId);
                } catch (error) {
                    // ignore
                }
                openHistoryChat(target.chatId);
            }
        }
    }

    function openHistoryChat(chatId) {
        let attempts = 0;
        const escaped = String(chatId || '').replace(/["\\]/g, '\\$&');
        const tryOpen = () => {
            const checkbox = document.querySelector(`.history-checkbox[data-id="${escaped}"]`);
            const item = checkbox?.closest?.('.history-item');
            if (item) {
                item.click();
                return;
            }
            attempts += 1;
            if (attempts < 12) window.setTimeout(tryOpen, 500);
        };
        tryOpen();
    }

    /* ------------------------------------------------------------------ */
    /* 研究型 run：提交后台任务并驱动同一个 ChatUI                           */
    /* ------------------------------------------------------------------ */

    /**
     * 与真实运行使用同一次模型路由来判定交付档位。
     *
     * 之前的实现用本地词表 classify() 预判，词表把「最近几次深空探测的新发现」
     * 这类没有研究关键词的问题判成对话档，于是长任务留在页面里执行；用户退出
     * 网页后页面进程被销毁，任务就中断了。真实运行随后由模型判成研究报告档，
     * 但那时已经没有后台任务可接。这里提前做同一次路由，判档口径与运行完全一致。
     */
    async function decideRunContract(runtime, options) {
        if (!runtime || typeof runtime.decideContract !== 'function') return null;
        try {
            return await runtime.decideContract(options.userMessage, {
                mode: options.toolEnabled === false ? 'chat' : 'agent',
                toolEnabled: options.toolEnabled !== false,
                deepThink: options.enableThinking !== false,
                signal: options.signal,
                client: options.client || runtime.client
            });
        } catch (error) {
            return null;
        }
    }

    function buildRoutingHint(contract) {
        if (!contract || !contract.tier) return null;
        return {
            tier: contract.tier,
            tierLabel: contract.tierLabel || '',
            dimensions: Array.isArray(contract.dimensions) ? contract.dimensions.slice(0, 24) : [],
            reason: String(contract.reason || '').slice(0, 240)
        };
    }

    function shouldRunInBackground(contract, options = {}) {
        // 只有启用工具的研究型运行才需要后台进程；关掉工具的对话档留在页面里，
        // 保持原来的低延迟路径。
        if (options.toolEnabled === false) return false;
        return Boolean(contract && contract.tier && contract.tier !== 'chat');
    }

    function buildAgentPayload(options) {
        return {
            messages: Array.isArray(options.messages) ? options.messages : [],
            userMessage: String(options.userMessage || ''),
            enableThinking: options.enableThinking !== false,
            toolEnabled: options.toolEnabled !== false,
            hasAttachments: Boolean(options.hasAttachments),
            contextPack: options.contextPack || null,
            toolContext: options.toolContext || null,
            runConfig: window.PZM_AGENT_RUN_CONFIG || null,
            agentStyle: window.PZM_AGENT_STYLE || null,
            // 提交前的路由调用已经用这个 turn 计过额度，后台进程复用同一个 turn，
            // 否则一次任务会被算成两次（真实用户额度只有每天 2 次）。
            usageTurnId: String(options.usageTurnId || '')
        };
    }

    function runAgentJob(record, options) {
        const chatUI = resolveChatUI(options.ui) || window.chatUI;
        const job = record.view;
        record.live = true;
        record.container = options.container;
        record.attachedChatUI = chatUI;
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (error, value) => {
                if (settled) return;
                settled = true;
                record.live = false;
                if (record.monitor) record.monitor.stop();
                if (error) reject(error);
                else resolve(value);
            };
            const monitor = monitorJob(record, {
                signal: options.signal,
                onView: view => {
                    if (Array.isArray(view.events)) {
                        view.events.forEach(event => applyAgentEvent(chatUI, record.container, event));
                    }
                    applyContent(chatUI, record.container, record, view);
                },
                onTerminal: view => {
                    if (view.status === 'completed') {
                        const result = view.result || {};
                        const content = result.content || view.content || '';
                        if (content) {
                            try {
                                chatUI?.updateContent?.(record.container, content);
                            } catch (error) {
                                // ignore
                            }
                        }
                        finish(null, {
                            content,
                            agent_run: result.agent_run || null,
                            agent_tool_calls: result.tool_calls || null,
                            tool_calls: result.tool_calls || null,
                            finish_reason: 'stop'
                        });
                    } else if (view.status === 'cancelled') {
                        finish(new DOMException('Aborted', 'AbortError'));
                    } else {
                        finish(new Error(view.error || '后台任务执行失败'));
                    }
                },
                onError: error => finish(error)
            });
            record.monitor = monitor;
            if (options.signal) {
                const onAbort = () => {
                    cancelJob(job.id);
                    finish(new DOMException('Aborted', 'AbortError'));
                };
                if (options.signal.aborted) onAbort();
                else options.signal.addEventListener('abort', onAbort, { once: true });
            }
        });
    }

    function installAgentRuntimePatch() {
        const Runtime = window.AgentRuntime;
        if (!Runtime || Runtime.__agentJobPatched) return Boolean(Runtime);
        const originalRun = Runtime.prototype.run;
        Runtime.prototype.run = async function patchedRun(options = {}) {
            if (!refreshAvailability() || !STATE.enabled || !isLoggedIn()) {
                return originalRun.call(this, options);
            }
            const chatId = currentChatId();
            const running = runningAssistantMessage(chatId);
            if (!chatId || !running) {
                return originalRun.call(this, options);
            }
            // 先判档位再决定在哪里执行。chat 档复用这次判定留在页面；研究档交给后台进程，
            // 页面关掉/刷新都不会中断任务。
            const contract = await decideRunContract(this, options);
            const routingHint = buildRoutingHint(contract);
            if (!shouldRunInBackground(contract, options)) {
                if (contract) this.__predecidedContract = contract;
                return originalRun.call(this, options);
            }
            let submitted = false;
            try {
                const payload = buildAgentPayload(options);
                payload.routingHint = routingHint;
                payload.usageTurnId = String(options.usageTurnId || this.client?.usageTurnId || '');
                const view = await submitJob('agent', chatId, running.messageId, payload);
                submitted = true;
                const record = getJobRecord(chatId, running.messageId);
                if (!record) throw new JobUnavailableError('任务登记失败');
                record.uiOverride = this.ui;
                return await runAgentJob(record, {
                    ui: this.ui,
                    container: options.container,
                    signal: options.signal
                });
            } catch (error) {
                // 只在“任务还没提交成功”时回退到前端执行；任务已经在后台跑起来之后的失败
                // 不能再跑第二遍（会重复消耗模型额度）。
                if (!submitted) {
                    if (contract) this.__predecidedContract = contract;
                    return originalRun.call(this, options);
                }
                throw error;
            }
        };
        Runtime.__agentJobPatched = true;
        return true;
    }

    /* ------------------------------------------------------------------ */
    /* 作图 / 视频：沿用原有 generateImage / generateVideo 的返回契约         */
    /* ------------------------------------------------------------------ */

    function mediaProgressOptions(kind, options) {
        const config = kind === 'video'
            ? (window.VideoGenerationClient?.resolveConfig?.() || {})
            : (window.ImageGenerationClient?.resolveConfig?.() || {});
        return config;
    }

    async function runMediaJob(record, kind, options) {
        const job = record.view;
        record.live = true;
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (error, value) => {
                if (settled) return;
                settled = true;
                record.live = false;
                if (record.monitor) record.monitor.stop();
                if (error) reject(error);
                else resolve(value);
            };
            const emit = event => {
                try {
                    options.onProgress?.(event);
                } catch (error) {
                    // ignore
                }
            };
            const startedAt = Number(options.startedAt) || Number(record.view.createdAt) || now();
            const monitor = monitorJob(record, {
                signal: options.signal,
                onView: view => {
                    emit({
                        phase: view.phase || (kind === 'video' ? 'processing' : 'generating'),
                        progress: view.progress,
                        elapsedMs: Math.max(0, now() - startedAt),
                        taskId: view.taskId || job.id
                    });
                },
                onTerminal: view => {
                    if (view.status === 'completed') {
                        const result = view.result || {};
                        finish(null, kind === 'video'
                            ? { content: result.content || '已生成视频。', videos: result.videos || [], taskId: result.taskId || view.taskId || job.id }
                            : { content: result.content || '已生成图片。', images: result.images || [] });
                    } else if (view.status === 'cancelled') {
                        finish(new DOMException('Aborted', 'AbortError'));
                    } else {
                        finish(new Error(view.error || (kind === 'video' ? '视频生成失败' : '图片生成失败')));
                    }
                },
                onError: error => finish(error)
            });
            record.monitor = monitor;
            if (options.signal) {
                const onAbort = () => {
                    cancelJob(job.id);
                    finish(new DOMException('Aborted', 'AbortError'));
                };
                if (options.signal.aborted) onAbort();
                else options.signal.addEventListener('abort', onAbort, { once: true });
            }
        });
    }

    function installMediaPatches() {
        const Client = window.DeepSeekClient;
        if (!Client || Client.__agentJobMediaPatched) return Boolean(Client);
        const originalImage = Client.prototype.generateImage;
        const originalVideo = Client.prototype.generateVideo;

        Client.prototype.generateImage = async function patchedGenerateImage(options = {}) {
            if (!refreshAvailability() || !STATE.enabled) return originalImage.call(this, options);
            const chatId = currentChatId();
            const running = runningAssistantMessage(chatId);
            if (!chatId || !running) return originalImage.call(this, options);
            const config = mediaProgressOptions('image', options);
            const payload = {
                prompt: options.prompt || '',
                referenceImage: options.referenceImage || '',
                model: options.model || config.model || '',
                size: options.size || config.size || '',
                n: options.n || config.n || 1
            };
            let submitted = false;
            try {
                const view = await submitJob('image', chatId, running.messageId, payload);
                submitted = true;
                const record = getJobRecord(chatId, running.messageId);
                if (!record) throw new JobUnavailableError('任务登记失败');
                return await runMediaJob(record, 'image', options);
            } catch (error) {
                if (!submitted) return originalImage.call(this, options);
                throw error;
            }
        };

        Client.prototype.generateVideo = async function patchedGenerateVideo(options = {}) {
            if (!refreshAvailability() || !STATE.enabled) return originalVideo.call(this, options);
            const chatId = currentChatId();
            const running = runningAssistantMessage(chatId);
            if (!chatId || !running) return originalVideo.call(this, options);
            const config = mediaProgressOptions('video', options);
            const payload = {
                prompt: options.prompt || '',
                aspectRatio: options.aspectRatio || config.aspectRatio || ''
            };
            let submitted = false;
            try {
                const view = await submitJob('video', chatId, running.messageId, payload);
                submitted = true;
                const record = getJobRecord(chatId, running.messageId);
                if (!record) throw new JobUnavailableError('任务登记失败');
                return await runMediaJob(record, 'video', options);
            } catch (error) {
                if (!submitted) return originalVideo.call(this, options);
                throw error;
            }
        };
        Client.__agentJobMediaPatched = true;
        return true;
    }

    /* ------------------------------------------------------------------ */
    /* 历史渲染钩子：重新进入网页时恢复现场                                 */
    /* ------------------------------------------------------------------ */

    let ORIGINAL_DISPLAY_MESSAGE = null;

    function installHistoryPatch() {
        const ChatUI = window.ChatUI;
        if (!ChatUI || !window.chatUI || ChatUI.__agentJobHistoryPatched) {
            // ChatUI 的实例方法可能直接挂在实例上；都处理一次。
            if (window.chatUI && !window.chatUI.__agentJobHistoryPatched && !ORIGINAL_DISPLAY_MESSAGE) {
                return installHistoryPatchOnInstance(window.chatUI);
            }
            return Boolean(ORIGINAL_DISPLAY_MESSAGE);
        }
        const original = window.chatUI.displayMessageFromHistory;
        ORIGINAL_DISPLAY_MESSAGE = original.bind(window.chatUI);
        window.chatUI.displayMessageFromHistory = function (msg) {
            const rendered = original.call(this, msg);
            try {
                attachToRenderedMessage(this, msg, rendered);
            } catch (error) {
                console.warn('[AgentJobClient] 恢复后台任务失败', error);
            }
            return rendered;
        };
        ChatUI.__agentJobHistoryPatched = true;
        return true;
    }

    function installHistoryPatchOnInstance(instance) {
        const original = instance.displayMessageFromHistory;
        if (typeof original !== 'function') return false;
        ORIGINAL_DISPLAY_MESSAGE = original.bind(instance);
        instance.displayMessageFromHistory = function (msg) {
            const rendered = original.call(this, msg);
            try {
                attachToRenderedMessage(this, msg, rendered);
            } catch (error) {
                console.warn('[AgentJobClient] 恢复后台任务失败', error);
            }
            return rendered;
        };
        instance.__agentJobHistoryPatched = true;
        return true;
    }

    /* ------------------------------------------------------------------ */
    /* 启动                                                                */
    /* ------------------------------------------------------------------ */

    function start() {
        if (STATE.started) return;
        STATE.started = true;
        resumeAllJobs().catch(() => {});
        window.addEventListener('cipher-login-success', () => {
            STATE.activeLoadedAt = 0;
            resumeAllJobs().catch(() => {});
        });
        window.addEventListener('focus', () => {
            if (isLoggedIn()) resumeAllJobs().catch(() => {});
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) resumeAllJobs().catch(() => {});
        });
        // 登录是异步的：前几次可能还没拿到 token，低频重试到拿到为止。
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            if (isLoggedIn()) {
                clearInterval(timer);
                resumeAllJobs().catch(() => {});
            } else if (attempts >= 30) {
                clearInterval(timer);
            }
        }, RESUME_RETRY_MS);
        console.log('[AgentJobClient] 后台任务客户端已加载');
    }

    // 补丁必须在 main.js 的初始化之前就位：脚本按 modules.js 顺序在 main.js 之前加载，
    // 这里立刻安装，DOM 是否就绪不影响补丁本身。
    installAgentRuntimePatch();
    installMediaPatches();
    installHistoryPatch();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }

    window.AgentJobClient = {
        submit: submitJob,
        get: getJob,
        active: fetchActiveJobs,
        resume: resumeAllJobs,
        resumeMessage,
        cancel: cancelJob,
        isEnabled: () => STATE.enabled,
        getJobForMessage: (chatId, messageId) => getJobRecord(chatId, messageId)?.view || null,
        _state: STATE
    };
})();
