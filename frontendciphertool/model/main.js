/**
 * main.js - 大模型模块主入口
 * 整合所有模块，处理事件绑定和初始化
 */

(function () {
    let agentRuntime = null;
    // 默认客户端实例保留给兼容路径；每个并发运行会创建独立客户端。
    let client = null;

    // 状态
    let isToolEnabled = false;
    let isDeepThinkEnabled = false;
    let eventsInitialized = false;
    let durableRecoveryInitialized = false;
    let attachments = [];
    const selectedChatIds = new Set();
    const activeRunRegistry = new Map();
    const runningRunOrderByChat = new Map();

    const MAX_ATTACHMENTS = 80;
    const MAX_TEXT_BYTES_PER_FILE = 512 * 1024;
    const MAX_TEXT_CHARS_PER_FILE = 12000;
    const MAX_TOTAL_TEXT_CHARS = 60000;
    const MAX_IMAGE_ATTACHMENTS = 8;
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const SKIPPED_ATTACHMENT_DIRS = new Set(['.git', 'node_modules', 'target', 'dist', 'build', '.idea', '.vscode', '__pycache__']);
    const SKIPPED_ATTACHMENT_FILES = new Set(['.env', '.env.local', '.env.production', 'agentmaster.local.js', 'llm.txt']);
    const SKIPPED_ATTACHMENT_EXTENSIONS = new Set(['pem', 'key', 'p12', 'pfx']);
    const TEXT_EXTENSIONS = new Set([
        'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'xml', 'html', 'htm', 'css', 'scss',
        'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'java', 'py', 'rb', 'go', 'rs', 'c', 'h', 'cpp',
        'hpp', 'cs', 'php', 'swift', 'kt', 'kts', 'sql', 'sh', 'bat', 'ps1', 'yml', 'yaml',
        'toml', 'ini', 'properties', 'env', 'log', 'svg'
    ]);

    function getAttachmentElements() {
        return {
            addBtn: document.getElementById('attachment-add-btn'),
            menu: document.getElementById('attachment-menu'),
            fileInput: document.getElementById('attachment-file-input'),
            folderInput: document.getElementById('attachment-folder-input'),
            chatImportInput: document.getElementById('import-chat-history-input'),
            list: document.getElementById('attachment-list'),
            status: document.getElementById('attachment-status')
        };
    }

    function formatBytes(bytes) {
        const value = Number(bytes) || 0;
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / 1024 / 1024).toFixed(1)} MB`;
    }

    function getAttachmentPath(file) {
        return file.webkitRelativePath || file.name || 'unnamed';
    }

    function getFileExtension(file) {
        const name = (file.name || '').toLowerCase();
        const idx = name.lastIndexOf('.');
        return idx >= 0 ? name.slice(idx + 1) : '';
    }

    function isTextAttachment(file) {
        const mime = file.type || '';
        return mime.startsWith('text/') || TEXT_EXTENSIONS.has(getFileExtension(file));
    }

    function getAttachmentKind(file) {
        if ((file.type || '').startsWith('image/')) return 'image';
        if (isTextAttachment(file)) return 'text';
        return 'binary';
    }

    function shouldSkipAttachment(path) {
        const parts = String(path || '').split(/[\\/]/);
        if (parts.some(part => SKIPPED_ATTACHMENT_DIRS.has(part))) return true;
        const fileName = (parts[parts.length - 1] || '').toLowerCase();
        if (SKIPPED_ATTACHMENT_FILES.has(fileName)) return true;
        const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1) : '';
        return SKIPPED_ATTACHMENT_EXTENSIONS.has(ext);
    }

    function setAttachmentStatus(message) {
        const { status } = getAttachmentElements();
        if (status) status.textContent = message || '';
    }

    function toggleAttachmentMenu(force) {
        const { addBtn, menu } = getAttachmentElements();
        if (!menu || !addBtn) return;
        const shouldOpen = typeof force === 'boolean' ? force : !menu.classList.contains('active');
        menu.classList.toggle('active', shouldOpen);
        addBtn.classList.toggle('active', shouldOpen);
        menu.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    }

    function addAttachments(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        let added = 0;
        let skipped = 0;
        for (const file of files) {
            const path = getAttachmentPath(file);
            if (shouldSkipAttachment(path)) {
                skipped++;
                continue;
            }
            if (attachments.length >= MAX_ATTACHMENTS) {
                skipped++;
                continue;
            }
            const fingerprint = `${path}:${file.size}:${file.lastModified}`;
            const duplicated = attachments.some(item => item.fingerprint === fingerprint);
            if (duplicated) {
                skipped++;
                continue;
            }
            attachments.push({
                id: `att-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`,
                fingerprint,
                file,
                name: file.name || path,
                path,
                size: file.size || 0,
                type: file.type || '',
                kind: getAttachmentKind(file)
            });
            added++;
        }

        renderAttachments();
        const parts = [];
        if (added) parts.push(`已导入 ${added} 个附件`);
        if (skipped) parts.push(`跳过 ${skipped} 个`);
        setAttachmentStatus(parts.join('，'));
    }

    function removeAttachment(id) {
        attachments = attachments.filter(item => item.id !== id);
        renderAttachments();
        if (!attachments.length) setAttachmentStatus('');
    }

    function clearAttachments() {
        attachments = [];
        renderAttachments();
        setAttachmentStatus('');
    }

    function renderAttachments() {
        const { list } = getAttachmentElements();
        if (!list) return;
        list.innerHTML = '';
        list.classList.toggle('has-items', attachments.length > 0);

        attachments.forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'attachment-chip';
            chip.title = item.path;

            const kind = document.createElement('span');
            kind.className = 'attachment-chip-kind';
            kind.textContent = item.kind;

            const name = document.createElement('span');
            name.className = 'attachment-chip-name';
            name.textContent = item.path;

            const size = document.createElement('span');
            size.className = 'attachment-chip-size';
            size.textContent = formatBytes(item.size);

            const remove = document.createElement('button');
            remove.className = 'attachment-remove-btn';
            remove.type = 'button';
            remove.setAttribute('aria-label', `移除 ${item.path}`);
            remove.textContent = '×';
            remove.addEventListener('click', () => removeAttachment(item.id));

            chip.append(kind, name, size, remove);
            list.appendChild(chip);
        });

        if (attachments.length > 1) {
            const clear = document.createElement('button');
            clear.className = 'attachment-clear-btn';
            clear.type = 'button';
            clear.textContent = '清空';
            clear.addEventListener('click', clearAttachments);
            list.appendChild(clear);
        }
    }

    function bindAttachmentEvents() {
        const { addBtn, menu, fileInput, folderInput, chatImportInput } = getAttachmentElements();
        if (!addBtn || !menu || !fileInput || !folderInput) return;

        addBtn.addEventListener('click', event => {
            event.stopPropagation();
            toggleAttachmentMenu();
        });

        document.getElementById('attachment-file-btn')?.addEventListener('click', event => {
            event.stopPropagation();
            toggleAttachmentMenu(false);
            fileInput.click();
        });

        document.getElementById('attachment-folder-btn')?.addEventListener('click', event => {
            event.stopPropagation();
            toggleAttachmentMenu(false);
            folderInput.click();
        });

        document.getElementById('import-chat-history-btn')?.addEventListener('click', event => {
            event.stopPropagation();
            toggleAttachmentMenu(false);
            chatImportInput?.click();
        });

        fileInput.addEventListener('change', event => {
            addAttachments(event.target.files);
            fileInput.value = '';
        });

        folderInput.addEventListener('change', event => {
            addAttachments(event.target.files);
            folderInput.value = '';
        });

        chatImportInput?.addEventListener('change', event => {
            importChatHistoryFiles(event.target.files);
            chatImportInput.value = '';
        });

        document.addEventListener('click', event => {
            if (!menu.contains(event.target) && event.target !== addBtn) {
                toggleAttachmentMenu(false);
            }
        });
    }

    async function readAttachmentText(item) {
        const blob = item.file.slice(0, MAX_TEXT_BYTES_PER_FILE);
        const text = await blob.text();
        const truncatedByBytes = item.file.size > MAX_TEXT_BYTES_PER_FILE;
        const truncatedByChars = text.length > MAX_TEXT_CHARS_PER_FILE;
        return {
            text: text.slice(0, MAX_TEXT_CHARS_PER_FILE),
            truncated: truncatedByBytes || truncatedByChars
        };
    }

    async function readAttachmentImage(item) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Image read failed'));
            reader.readAsDataURL(item.file);
        });
    }

    function escapeAttachmentAttr(value) {
        return String(value || '').replace(/"/g, '&quot;');
    }

    async function prepareAttachmentsForModel() {
        const historyAttachments = attachments.map(item => ({
            name: item.name,
            path: item.path,
            size: item.size,
            type: item.type,
            kind: item.kind
        }));

        if (!attachments.length) {
            return { contextText: '', imageParts: [], historyAttachments, routingText: '' };
        }

        const manifest = [];
        const textSections = [];
        const notes = [];
        const imageParts = [];
        let totalTextChars = 0;
        let imageCount = 0;

        for (const item of attachments) {
            manifest.push(`- ${item.path} | ${item.kind} | ${formatBytes(item.size)} | ${item.type || 'unknown'}`);

            if (item.kind === 'text') {
                if (totalTextChars >= MAX_TOTAL_TEXT_CHARS) {
                    notes.push(`${item.path}: 文本上下文总量已达上限，仅保留文件清单。`);
                    continue;
                }
                try {
                    const result = await readAttachmentText(item);
                    let text = result.text;
                    const remaining = MAX_TOTAL_TEXT_CHARS - totalTextChars;
                    if (text.length > remaining) {
                        text = text.slice(0, remaining);
                    }
                    totalTextChars += text.length;
                    const truncated = result.truncated || text.length < result.text.length;
                    textSections.push(
                        `<attached_file path="${escapeAttachmentAttr(item.path)}" type="${escapeAttachmentAttr(item.type || 'text')}" truncated="${truncated}">\n${text}\n</attached_file>`
                    );
                } catch (error) {
                    notes.push(`${item.path}: 文本读取失败：${error.message}`);
                }
                continue;
            }

            if (item.kind === 'image') {
                if (item.size > MAX_IMAGE_BYTES) {
                    notes.push(`${item.path}: 图片超过 ${formatBytes(MAX_IMAGE_BYTES)}，未作为视觉附件发送。`);
                    continue;
                }
                if (imageCount >= MAX_IMAGE_ATTACHMENTS) {
                    notes.push(`${item.path}: 图片数量超过 ${MAX_IMAGE_ATTACHMENTS} 张，仅保留文件清单。`);
                    continue;
                }
                try {
                    const dataUrl = await readAttachmentImage(item);
                    imageParts.push({
                        type: 'image_url',
                        image_url: { url: dataUrl, detail: 'auto' }
                    });
                    imageCount++;
                } catch (error) {
                    notes.push(`${item.path}: 图片读取失败：${error.message}`);
                }
                continue;
            }

            notes.push(`${item.path}: 二进制或暂不支持的文件类型，仅提供文件名、类型与大小。`);
        }

        const contextParts = [
            '以下是用户导入给你阅读的附件。请优先基于附件内容回答；如果内容被截断或只有元数据，请明确说明限制。',
            '<attachment_manifest>',
            manifest.join('\n'),
            '</attachment_manifest>'
        ];

        if (textSections.length) {
            contextParts.push('<attachment_texts>', textSections.join('\n\n'), '</attachment_texts>');
        }
        if (notes.length) {
            contextParts.push('<attachment_notes>', notes.join('\n'), '</attachment_notes>');
        }
        if (imageParts.length) {
            contextParts.push(`<attachment_images>${imageParts.length} image_url attachment(s) included. 只有支持视觉输入的模型才能直接读取图片内容。</attachment_images>`);
        }

        return {
            contextText: contextParts.join('\n'),
            imageParts,
            historyAttachments,
            routingText: manifest.join('\n')
        };
    }

    function buildUserApiContent(userText, preparedAttachments) {
        const text = [userText, preparedAttachments.contextText].filter(Boolean).join('\n\n');
        if (preparedAttachments.imageParts.length > 0) {
            return [
                { type: 'text', text },
                ...preparedAttachments.imageParts
            ];
        }
        return text;
    }

    function buildContextPack({ chatId, userMessage, routingMessage, priorMessages, priorAgentRuns = [], preparedAttachments, isImageModeEnabled, isModelingModeEnabled }) {
        if (window.AgentContract?.createContextPack) {
            return window.AgentContract.createContextPack({
                chatId,
                userMessage,
                routingMessage,
                priorMessages,
                priorAgentRuns,
                preparedAttachments,
                isImageModeEnabled,
                isModelingModeEnabled,
                isToolEnabled,
                isDeepThinkEnabled,
                maxAttachments: MAX_ATTACHMENTS,
                maxTotalTextChars: MAX_TOTAL_TEXT_CHARS,
                maxImageAttachments: MAX_IMAGE_ATTACHMENTS
            });
        }

        const historyAttachments = preparedAttachments.historyAttachments || [];
        const textAttachmentCount = historyAttachments.filter(item => item.kind === 'text').length;
        const imageAttachmentCount = historyAttachments.filter(item => item.kind === 'image').length;
        return {
            id: `ctx-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`,
            contract_version: 'agent-contract-v1',
            task: {
                text: userMessage,
                routingText: routingMessage,
                imageMode: Boolean(isImageModeEnabled),
                modelingMode: Boolean(isModelingModeEnabled),
                toolEnabled: Boolean(isToolEnabled),
                deepThinkEnabled: Boolean(isDeepThinkEnabled)
            },
            recentMessages: (priorMessages || []).slice(-12).map(msg => ({
                role: msg.role,
                contentPreview: String(msg.content || '').slice(0, 600)
            })),
            attachmentsManifest: historyAttachments,
            attachmentChunks: historyAttachments.filter(item => item.kind === 'text').map(item => ({
                path: item.path,
                kind: 'text',
                includedInPrompt: true
            })),
            imageInputs: historyAttachments.filter(item => item.kind === 'image').map(item => ({
                path: item.path,
                kind: 'image',
                includedInPrompt: true
            })),
            projectSnippets: [],
            toolResultSummaries: [],
            agentRunSummaries: priorAgentRuns,
            toolResultSummaries: priorAgentRuns.flatMap(run => run.toolResultSummaries || []).slice(-12),
            evidenceLedger: priorAgentRuns.flatMap(run => run.evidence || []).slice(-24),
            outputPolicy: {
                citeSourcesWhenEvidenceExists: true,
                preserveUserLanguage: true
            },
            limits: {
                maxAttachments: MAX_ATTACHMENTS,
                maxTotalTextChars: MAX_TOTAL_TEXT_CHARS,
                maxImageAttachments: MAX_IMAGE_ATTACHMENTS
            },
            summary: {
                chatId,
                priorMessageCount: (priorMessages || []).length,
                attachmentCount: historyAttachments.length,
                textAttachmentCount,
                imageAttachmentCount,
                hasAttachmentContext: Boolean(preparedAttachments.contextText),
                priorAgentRunCount: priorAgentRuns.length,
                priorEvidenceCount: priorAgentRuns.reduce((sum, run) => sum + (Array.isArray(run.evidence) ? run.evidence.length : 0), 0)
            }
        };
    }

    function buildPriorAgentRunSummaries(messages = []) {
        return (Array.isArray(messages) ? messages : [])
            .filter(message => message?.role === 'assistant' && resolveAgentRunForMessage(message))
            .slice(-4)
            .map(message => summarizeAgentRunForContext(resolveAgentRunForMessage(message), message.content || ''))
            .filter(Boolean);
    }

    function resolveAgentRunForMessage(message) {
        if (!message || typeof message !== 'object') return null;
        return message.agent_run || null;
    }

    function summarizeAgentRunForContext(run, assistantContent) {
        if (!run || typeof run !== 'object') return null;
        const evidence = selectAgentRunEvidence(run.evidence_ledger || []);
        const metrics = run.metrics || {};
        return {
            runId: run.runId || '',
            mode: run.mode || '',
            researchProfile: run.researchProfile || '',
            selectedTools: Array.isArray(run.selectedTools) ? run.selectedTools.slice(0, 12) : [],
            finalAnswerPreview: truncateContextText(assistantContent, 700),
            metrics: {
                tool_calls: metrics.tool_calls || 0,
                evidence_items: metrics.evidence_items || 0,
                citation_markers: metrics.citation_markers || 0,
                matched_citation_markers: metrics.matched_citation_markers || 0,
                unmatched_citation_markers: metrics.unmatched_citation_markers || 0,
                weak_citation_markers: metrics.weak_citation_markers || 0
            },
            warnings: Array.isArray(run.warnings) ? run.warnings.slice(0, 5).map(warning => truncateContextText(warning, 240)) : [],
            citationVerification: summarizeCitationVerification(run.citation_verification),
            evidence,
            toolResultSummaries: summarizeToolResultsForContext(run.tool_results || [])
        };
    }

    function selectAgentRunEvidence(evidenceLedger = []) {
        const trustRank = { primary: 5, high: 4, medium: 3, low: 2, unknown: 1 };
        return (Array.isArray(evidenceLedger) ? evidenceLedger : [])
            .filter(item => item && (item.url || item.title || item.source_id))
            .slice()
            .sort((a, b) => {
                const usedDelta = Number(Boolean(b.usedInFinalAnswer)) - Number(Boolean(a.usedInFinalAnswer));
                if (usedDelta) return usedDelta;
                return (trustRank[b.trustLevel] || 0) - (trustRank[a.trustLevel] || 0);
            })
            .slice(0, 8)
            .map(item => ({
                id: item.id || '',
                source_id: item.source_id ?? item.sourceId ?? '',
                kind: item.kind || '',
                title: truncateContextText(item.title || '', 180),
                url: truncateContextText(item.url || '', 320),
                trustLevel: item.trustLevel || 'unknown',
                usedInFinalAnswer: Boolean(item.usedInFinalAnswer),
                claimIds: Array.isArray(item.claimIds) ? item.claimIds.slice(0, 6) : []
            }));
    }

    function summarizeCitationVerification(verification) {
        if (!verification || typeof verification !== 'object') return null;
        return {
            matched: Array.isArray(verification.matched) ? verification.matched.slice(0, 8).map(item => ({
                marker: item.marker,
                evidence_ids: Array.isArray(item.evidence_ids) ? item.evidence_ids.slice(0, 6) : [],
                strongestTrustLevel: item.strongestTrustLevel || ''
            })) : [],
            unmatched: Array.isArray(verification.unmatched) ? verification.unmatched.slice(0, 8).map(item => ({
                marker: item.marker,
                source_line: truncateContextText(item.source_line || '', 240)
            })) : [],
            weak: Array.isArray(verification.weak) ? verification.weak.slice(0, 8).map(item => ({
                marker: item.marker,
                reason: truncateContextText(item.reason || '', 180)
            })) : []
        };
    }

    function summarizeToolResultsForContext(toolResults = []) {
        return (Array.isArray(toolResults) ? toolResults : [])
            .slice(-8)
            .map(result => ({
                name: result.name || '',
                status: result.status || '',
                risk: result.risk || '',
                approval_required: Boolean(result.approval_required),
                result_preview: truncateContextText(result.result_preview || '', 260)
            }));
    }

    function truncateContextText(value, max) {
        const text = String(value ?? '').replace(/\s+/g, ' ').trim();
        return text.length <= max ? text : `${text.slice(0, max)}...`;
    }

    function buildImageGenerationPrompt(userText, preparedAttachments) {
        return [
            String(userText || '').trim(),
            preparedAttachments.contextText
                ? `\n参考用户导入的附件内容生成图片。附件上下文如下：\n${preparedAttachments.contextText}`
                : ''
        ].filter(Boolean).join('\n\n');
    }

    function getPersistableImages(images = []) {
        const MAX_STORED_IMAGE_CHARS = 4200000;
        return images
            .map(image => {
                if (!image?.url) return null;
                if (image.url.startsWith('data:') && image.url.length > MAX_STORED_IMAGE_CHARS) {
                    return null;
                }
                return {
                    url: image.url,
                    mimeType: image.mimeType || 'image',
                    revisedPrompt: image.revisedPrompt || ''
                };
            })
            .filter(Boolean);
    }

    /**
     * 检查登录状态
     * @returns {Object|null} 用户信息或 null
     */
    function checkLogin() {
        return true;
    }

    /**
     * 显示/隐藏登录遮罩层
     * @param {boolean} show
     */
    function showLoginOverlay(show) {
        const chatMain = document.querySelector('.chat-main');
        if (!chatMain) return;

        let overlay = document.getElementById('chat-login-overlay');

        if (show && !overlay) {
            overlay = document.createElement('div');
            overlay.id = 'chat-login-overlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(8px);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 100;
                color: #0ff;
            `;
            overlay.innerHTML = `
                <div style="font-size: 1.5rem; margin-bottom: 20px; text-shadow: 0 0 10px #0ff; font-family: 'Orbitron', sans-serif;">
                    SYSTEM LOCKED
                </div>
                <p style="margin-bottom: 20px; color: rgba(255,255,255,0.7);">请登录以访问大模型系统</p>
                <button class="cyber-button" onclick="window.CipherAuth && window.CipherAuth.openModal()">
                    <span class="cyber-button__tag">立即登录</span>
                </button>
            `;
            chatMain.style.position = 'relative';
            chatMain.appendChild(overlay);
        } else if (!show && overlay) {
            overlay.remove();
        }

        // 禁用/启用输入
        const input = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-message');
        if (input) input.disabled = show;
        if (sendBtn) sendBtn.disabled = show;
    }

    /**
     * 初始化客户端
     */
    function initClient() {
        if (!client) {
            // 使用后端代理，API 密钥由后端管理
            client = new DeepSeekClient();
        }
        if (!agentRuntime && window.AgentRuntime) {
            agentRuntime = new AgentRuntime({
                client,
                registry: window.toolRegistry,
                ui: window.chatUI
            });
        }
        return client;
    }

    function createRunClient() {
        return new DeepSeekClient();
    }

    function createRunRuntime(runClient) {
        if (!window.AgentRuntime) return null;
        return new AgentRuntime({
            client: runClient,
            registry: window.toolRegistry,
            ui: window.chatUI
        });
    }

    function getRunKey(chatId, messageId) {
        return `${chatId || ''}:${messageId || ''}`;
    }

    function createAssistantMessageId() {
        if (window.historyManager?.createMessageId) {
            return window.historyManager.createMessageId('assistant');
        }
        return `assistant_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
    }

    function getCurrentAccountId() {
        try {
            const auth = window.CipherAuth || window.cipherAuth || null;
            const user = auth?.getCurrentUser?.() || auth?.currentUser || window.currentUser || null;
            return user?.id || user?.user_id || user?.account_id || user?.username || null;
        } catch (e) {
            return null;
        }
    }

    function copyContainerRefs(target, source) {
        if (!target || !source) return target;
        [
            'element',
            'reasoningDetails',
            'reasoningSummary',
            'reasoningContent',
            'contentDiv',
            'cursorSpan',
            'agentRunStatus',
            'agentRunPanel',
            'agentStages',
            'agentApprovalDeck',
            'toolDeck',
            'agentTrace',
            'agentEventTimeline',
            'agentEventLog',
            'agentEventCount',
            'runtimeStartTime',
            'runtimeElapsedMs',
            'runtimeTimerId',
            'runtimeStopped'
        ].forEach(key => {
            if (source[key] !== undefined && source[key] !== null) target[key] = source[key];
        });
        return target;
    }

    function registerActiveRun(chatId, messageId, container, initial = {}) {
        const entry = {
            chatId,
            messageId,
            container,
            status: initial.status || 'running',
            latestContent: initial.content || '',
            latestReasoning: initial.reasoning_content || '',
            latestAgentRun: initial.agent_run || null,
            latestToolCalls: initial.tool_calls || null,
            latestImages: initial.images || null,
            durableRunId: initial.durableRunId || null,
            latestResumePrompt: initial.resume_prompt || '',
            latestErrorMessage: initial.error_message || null,
            abortController: initial.abortController || null,
            runtime: initial.runtime || null,
            client: initial.client || null,
            lastPersistAt: 0,
            pendingPersistTimer: null
        };
        activeRunRegistry.set(getRunKey(chatId, messageId), entry);
        if (!runningRunOrderByChat.has(chatId)) {
            runningRunOrderByChat.set(chatId, []);
        }
        runningRunOrderByChat.get(chatId).push(messageId);
        return entry;
    }

    function getActiveRun(chatId, messageId) {
        return activeRunRegistry.get(getRunKey(chatId, messageId));
    }

    function buildAssistantPatch(entry, patch = {}) {
        const next = {
            role: 'assistant',
            id: entry.messageId,
            message_id: entry.messageId,
            status: patch.status || entry.status || 'running',
            content: patch.content ?? entry.latestContent ?? '',
            reasoning_content: patch.reasoning_content ?? entry.latestReasoning ?? null,
            tool_calls: patch.tool_calls ?? entry.latestToolCalls ?? null,
            agent_run: patch.agent_run ?? entry.latestAgentRun ?? null,
            images: patch.images ?? entry.latestImages ?? null,
            durable_run_id: patch.durable_run_id ?? entry.durableRunId ?? null,
            resume_prompt: patch.resume_prompt ?? entry.latestResumePrompt ?? null,
            error_message: patch.error_message ?? entry.latestErrorMessage ?? null,
            owner_id: getCurrentAccountId()
        };
        return next;
    }

    function buildActiveRunLatestPatch(entry, patch = {}) {
        return {
            status: entry.status || patch.status || 'running',
            content: entry.latestContent || '',
            reasoning_content: entry.latestReasoning || null,
            tool_calls: entry.latestToolCalls || null,
            agent_run: entry.latestAgentRun || null,
            images: entry.latestImages || null,
            durable_run_id: entry.durableRunId || null,
            resume_prompt: entry.latestResumePrompt || null,
            error_message: entry.latestErrorMessage || null,
            checkpoint_reason: patch.checkpoint_reason || patch.status || 'message.persisted'
        };
    }

    function persistActiveRun(entry, patch = {}, options = {}) {
        if (!entry) return null;
        if (patch.status) entry.status = patch.status;
        if (patch.content !== undefined) entry.latestContent = patch.content || '';
        if (patch.reasoning_content !== undefined) entry.latestReasoning = patch.reasoning_content || '';
        if (patch.agent_run !== undefined) entry.latestAgentRun = patch.agent_run || null;
        if (patch.tool_calls !== undefined) entry.latestToolCalls = patch.tool_calls || null;
        if (patch.images !== undefined) entry.latestImages = patch.images || null;
        if (patch.durable_run_id !== undefined) entry.durableRunId = patch.durable_run_id || null;
        if (patch.resume_prompt !== undefined) entry.latestResumePrompt = patch.resume_prompt || '';
        if (patch.error_message !== undefined) entry.latestErrorMessage = patch.error_message || null;

        const save = () => {
            entry.lastPersistAt = Date.now();
            entry.pendingPersistTimer = null;
            const latestPatch = buildActiveRunLatestPatch(entry, patch);
            const durableRecord = checkpointDurableRun(entry, latestPatch);
            if (durableRecord?.resume_prompt) {
                entry.latestResumePrompt = durableRecord.resume_prompt;
                latestPatch.resume_prompt = durableRecord.resume_prompt;
            }
            return window.historyManager.updateMessage(entry.chatId, entry.messageId, buildAssistantPatch(entry, latestPatch));
        };

        if (options.immediate) {
            if (entry.pendingPersistTimer) {
                clearTimeout(entry.pendingPersistTimer);
                entry.pendingPersistTimer = null;
            }
            return save();
        }

        const elapsed = Date.now() - entry.lastPersistAt;
        if (elapsed > 900) return save();
        if (!entry.pendingPersistTimer) {
            entry.pendingPersistTimer = setTimeout(save, 900 - elapsed);
        }
        return null;
    }

    function completeActiveRun(entry, patch = {}) {
        if (!entry) return;
        persistActiveRun(entry, { ...patch, status: patch.status || 'completed' }, { immediate: true });
        finishDurableRun(entry, patch.status || 'completed', patch);
        activeRunRegistry.delete(getRunKey(entry.chatId, entry.messageId));
        removeRunFromOrder(entry.chatId, entry.messageId);
    }

    function getDurableStore() {
        return window.agentDurableStore || null;
    }

    function startDurableRun(entry, details = {}) {
        const store = getDurableStore();
        if (!store || !entry) return null;
        const record = store.startRun({
            chatId: entry.chatId,
            messageId: entry.messageId,
            userMessage: details.userMessage || '',
            routingMessage: details.routingMessage || '',
            contextPack: details.contextPack || null
        });
        entry.durableRunId = record.durableRunId;
        entry.latestResumePrompt = record.resume_prompt || '';
        persistActiveRun(entry, {
            durable_run_id: record.durableRunId,
            resume_prompt: record.resume_prompt || '',
            status: entry.status || 'running'
        }, { immediate: true });
        return record;
    }

    function checkpointDurableRun(entry, patch = {}) {
        const store = getDurableStore();
        if (!store || !entry?.durableRunId) return null;
        return store.checkpoint({
            durableRunId: entry.durableRunId,
            chatId: entry.chatId,
            messageId: entry.messageId,
            status: patch.status || entry.status || 'running',
            content: patch.content ?? entry.latestContent ?? '',
            reasoning_content: patch.reasoning_content ?? entry.latestReasoning ?? '',
            agent_run: patch.agent_run ?? entry.latestAgentRun ?? null,
            reason: patch.checkpoint_reason || patch.status || 'message.persisted'
        });
    }

    function finishDurableRun(entry, status, patch = {}) {
        const store = getDurableStore();
        if (!store || !entry?.durableRunId) return null;
        return store.finish(entry.durableRunId, status, {
            content: patch.content ?? entry.latestContent ?? '',
            reasoning_content: patch.reasoning_content ?? entry.latestReasoning ?? '',
            agent_run: patch.agent_run ?? entry.latestAgentRun ?? null,
            reason: `run.${status}`
        });
    }

    function recoverDurableRunsIntoHistory() {
        if (durableRecoveryInitialized) return;
        durableRecoveryInitialized = true;
        const store = getDurableStore();
        if (!store || !window.historyManager) return;
        const recovered = store.recoverStaleRuns();
        recovered.forEach(record => {
            const existing = window.historyManager.getMessage(record.chatId, record.messageId);
            if (!existing) return;
            if (!['running', 'aborting'].includes(existing.status)) return;
            window.historyManager.updateMessage(record.chatId, record.messageId, {
                ...existing,
                status: 'recoverable',
                content: existing.content || record.content || '运行已恢复到本地检查点。可以继续此任务，系统会带上上次的 AgentRun 状态。',
                agent_run: existing.agent_run || record.agent_run || null,
                durable_run_id: record.durableRunId,
                resume_prompt: record.resume_prompt || '',
                error_message: '页面或会话中断后，运行已恢复为可继续状态。'
            });
        });
    }

    function appendRecoverableRunActions(chatId, msg, rendered) {
        if (!rendered?.element || msg?.role !== 'assistant' || msg.status !== 'recoverable') return;
        if (!msg.resume_prompt && !msg.durable_run_id) return;
        if (rendered.element.querySelector('.agent-recovery-actions')) return;

        const actions = document.createElement('div');
        actions.className = 'agent-recovery-actions';
        const label = document.createElement('span');
        label.className = 'agent-recovery-note';
        label.textContent = '本地检查点已恢复，可从上次阶段继续。';
        const resume = document.createElement('button');
        resume.type = 'button';
        resume.className = 'agent-recovery-btn';
        resume.textContent = '继续此任务';
        resume.addEventListener('click', () => {
            getDurableStore()?.markResumed?.(msg.durable_run_id);
            const input = document.getElementById('user-input');
            if (input) {
                input.value = msg.resume_prompt || buildFallbackResumePrompt(msg);
                input.focus();
            }
            window.historyManager.setCurrentChatId(chatId);
            sendMessage();
        });
        actions.append(label, resume);
        rendered.element.appendChild(actions);
    }

    function buildFallbackResumePrompt(msg) {
        const preview = String(msg?.content || '').trim();
        return [
            '继续刚才中断的 Agent 任务。',
            '请基于上一条 Agent Run 状态、已有工具结果和证据继续推进，避免重复已经完成的步骤。',
            preview ? `上次输出预览：${preview.slice(0, 900)}` : ''
        ].filter(Boolean).join('\n');
    }

    function hydrateMessageFromDurableCheckpoint(chatId, msg) {
        if (!msg || msg.role !== 'assistant') return msg;
        if (String(msg.content || '').trim()) return msg;
        if (!['running', 'aborting', 'recoverable'].includes(msg.status)) return msg;

        const store = getDurableStore();
        const record = msg.durable_run_id
            ? store?.get?.(msg.durable_run_id)
            : store?.getByMessage?.(chatId, msg.message_id || msg.id);
        if (!record) return msg;

        const recoveredContent = String(record.content || record.content_preview || '').trim();
        const recovered = {
            ...msg,
            durable_run_id: msg.durable_run_id || record.durableRunId,
            resume_prompt: msg.resume_prompt || record.resume_prompt || ''
        };

        if (recoveredContent) {
            recovered.content = recoveredContent;
            recovered.status = record.status === 'completed' ? 'completed' : 'recoverable';
            recovered.agent_run = msg.agent_run || record.agent_run || null;
            recovered.error_message = msg.error_message || (record.status === 'completed'
                ? ''
                : '历史正文已从本地 AgentRun checkpoint 恢复。');
            window.historyManager.updateMessage(chatId, recovered.message_id || recovered.id, recovered);
            return recovered;
        }

        if (msg.status === 'running') {
            recovered.status = 'recoverable';
            recovered.content = '运行已恢复到本地检查点。可以继续此任务，系统会带上上次的 AgentRun 状态。';
            recovered.agent_run = msg.agent_run || record.agent_run || null;
            recovered.error_message = msg.error_message || '历史正文为空；本地 checkpoint 没有可恢复正文。';
            window.historyManager.updateMessage(chatId, recovered.message_id || recovered.id, recovered);
            return recovered;
        }

        return recovered;
    }

    function removeRunFromOrder(chatId, messageId) {
        const order = runningRunOrderByChat.get(chatId);
        if (!order) return;
        const next = order.filter(id => id !== messageId);
        if (next.length) runningRunOrderByChat.set(chatId, next);
        else runningRunOrderByChat.delete(chatId);
    }

    function getLatestActiveRunForChat(chatId) {
        const order = runningRunOrderByChat.get(chatId) || [];
        for (let i = order.length - 1; i >= 0; i--) {
            const entry = getActiveRun(chatId, order[i]);
            if (entry?.status === 'running') return entry;
        }
        return null;
    }

    function abortActiveRun(entry) {
        if (!entry || entry.status !== 'running') return false;
        entry.status = 'aborting';
        if (entry.abortController && !entry.abortController.signal?.aborted) {
            entry.abortController.abort();
            return true;
        }
        if (entry.client && typeof entry.client.abort === 'function') {
            entry.client.abort();
            return true;
        }
        return false;
    }

    function setSendButtonLabel(label) {
        const tag = document.querySelector('#send-message .cyber-button__tag');
        if (tag) tag.textContent = label;
    }

    function refreshSendButtonState() {
        const inputElement = document.getElementById('user-input');
        const rawMessage = inputElement?.value?.trim() || '';
        const chatId = window.historyManager?.getCurrentChatId?.();
        const hasRunningCurrentChat = Boolean(chatId && getLatestActiveRunForChat(chatId));
        setSendButtonLabel(!rawMessage && !attachments.length && hasRunningCurrentChat ? '停止' : '发送');
    }

    function hasAssistantOutput(content, options = {}) {
        return Boolean(
            String(content || '').trim()
            || (Array.isArray(options.images) && options.images.length)
        );
    }

    function assertAssistantOutput(content, options = {}) {
        if (hasAssistantOutput(content, options)) return;
        const diagnosticParts = [];
        if (options.agentRun) diagnosticParts.push('已收到 AgentRun 快照');
        if (options.toolCalls) diagnosticParts.push('已收到工具调用');
        const diagnostic = diagnosticParts.length ? ` (${diagnosticParts.join('，')}，但没有最终正文)` : '';
        throw new Error(`模型代理返回了空响应${diagnostic}，未收到可保存的助手正文。请检查后端 /api/chat/completions 的 SSE 返回是否包含 data: ... choices[0].delta.content。`);
    }

    function bindActiveRunContainer(chatId, messageId, restoredContainer) {
        const entry = getActiveRun(chatId, messageId);
        if (!entry || !restoredContainer) return;
        copyContainerRefs(entry.container, restoredContainer);
        const panelAttached = entry.container?.agentRunPanel && entry.container?.element?.contains(entry.container.agentRunPanel);
        if (!panelAttached && entry.latestAgentRun && entry.container?.element && entry.container?.contentDiv) {
            const panel = window.chatUI.restoreAgentRunPanel(entry.container.element, entry.container.contentDiv, entry.latestAgentRun);
            if (panel) panel.open = true;
            copyContainerRefs(entry.container, {
                agentRunPanel: entry.container.element.querySelector('.agent-run-panel'),
                agentStages: entry.container.element.querySelector('.agent-stage-strip'),
                agentApprovalDeck: entry.container.element.querySelector('.agent-approval-deck'),
                toolDeck: entry.container.element.querySelector('.agent-tool-deck'),
                agentTrace: entry.container.element.querySelector('.agent-trace-log'),
                agentEventTimeline: entry.container.element.querySelector('.agent-event-panel'),
                agentEventLog: entry.container.element.querySelector('.agent-event-log'),
                agentEventCount: entry.container.element.querySelector('.agent-event-count')
            });
        }
        if (entry.latestContent && entry.container?.contentDiv) {
            window.chatUI.updateContent(entry.container, entry.latestContent);
        }
        if (entry.status && entry.status !== 'running' && entry.container?.reasoningDetails) {
            window.chatUI.finalizeMessage(entry.container);
        }
    }

    /**
     * 发送消息
     */
    async function sendMessage() {
        // 检查登录状态
        if (!checkLogin()) {
            showLoginOverlay(true);
            return;
        }

        const sendButton = document.getElementById('send-message');
        const inputElement = document.getElementById('user-input');

        if (!inputElement) return;

        const rawMessage = inputElement.value.trim();
        const hasAttachments = attachments.length > 0;
        if (!rawMessage && !hasAttachments) {
            const runningEntry = getLatestActiveRunForChat(window.historyManager.getCurrentChatId());
            if (abortActiveRun(runningEntry)) {
                refreshSendButtonState();
            }
            return;
        }
        const message = rawMessage || '请阅读这些附件并总结重点。';
        const modelingModeToggle = document.getElementById('modeling-mode-toggle');
        const imageModeToggle = document.getElementById('image-mode-toggle');
        const isModelingModeEnabled = modelingModeToggle && modelingModeToggle.classList.contains('active');
        const isImageModeEnabled = imageModeToggle && imageModeToggle.classList.contains('active');

        // 更新按钮状态
        if (sendButton) {
            sendButton.querySelector('.cyber-button__tag').textContent = hasAttachments ? '读取中' : isImageModeEnabled ? '作图中' : isModelingModeEnabled ? '建模中' : '停止';
        }

        let preparedAttachments;
        try {
            preparedAttachments = await prepareAttachmentsForModel();
        } catch (error) {
            setAttachmentStatus(`附件读取失败：${error.message}`);
            refreshSendButtonState();
            return;
        }
        const apiUserContent = buildUserApiContent(message, preparedAttachments);

        // 显示用户消息
        window.chatUI.displayUserMessage(message, preparedAttachments.historyAttachments);

        // 保存用户消息到历史
        let chatId = window.historyManager.getCurrentChatId();
        if (!chatId) {
            chatId = window.historyManager.createNewChat();
        }
        const priorStoredMessages = window.historyManager.getMessages(chatId);
        const priorMessages = window.historyManager.getMessagesForAPI(chatId);
        const priorAgentRuns = buildPriorAgentRunSummaries(priorStoredMessages);
        window.historyManager.addMessage(chatId, {
            role: 'user',
            content: message,
            attachments: preparedAttachments.historyAttachments
        });

        // 清空输入框和本轮附件
        inputElement.value = '';
        clearAttachments();

        // 创建助手消息容器
        const container = window.chatUI.createAssistantMessageContainer();
        const assistantMessageId = createAssistantMessageId();
        const runClient = createRunClient();
        const abortController = new AbortController();
        let runRuntime = null;
        let activeRun = null;
        let assistantMessagePersisted = false;
        let finalReasoning = '';
        let finalContent = '';
        let agentRunSnapshot = null;
        let collectedToolCalls = []; // 收集工具调用信息

        try {
            runRuntime = createRunRuntime(runClient);
            activeRun = registerActiveRun(chatId, assistantMessageId, container, {
                status: 'running',
                abortController,
                client: runClient,
                runtime: runRuntime
            });
            assistantMessagePersisted = window.historyManager.addMessage(chatId, {
                role: 'assistant',
                id: assistantMessageId,
                message_id: assistantMessageId,
                status: 'running',
                content: '',
                owner_id: getCurrentAccountId()
            }) !== false;

            // 获取状态
            const deepThinkToggle = document.getElementById('deep-think-toggle');
            const toolToggle = document.getElementById('tool-toggle');
            isDeepThinkEnabled = deepThinkToggle && deepThinkToggle.classList.contains('active');
            isToolEnabled = toolToggle && toolToggle.classList.contains('active');

            // 构建消息
            const messages = [
                { role: 'system', content: window.PZM_SYSTEM_PROMPT },
                ...priorMessages,
                { role: 'user', content: apiUserContent }
            ];
            const routingMessage = [isImageModeEnabled ? '作图模式' : isModelingModeEnabled ? '建模模式' : '', message, preparedAttachments.routingText].filter(Boolean).join('\n');
            const contextPack = buildContextPack({
                chatId,
                userMessage: message,
                routingMessage,
                priorMessages,
                priorAgentRuns,
                preparedAttachments,
                isImageModeEnabled,
                isModelingModeEnabled
            });
            startDurableRun(activeRun, {
                userMessage: message,
                routingMessage,
                contextPack
            });

            // 初始化客户端
            initClient();
            refreshSendButtonState();

            if (isImageModeEnabled) {
                window.chatUI.setReasoningStatus(container, '正在生成图片');
                window.chatUI.appendReasoningEvent(container, '已进入作图模式，正在请求图片生成模型。');

                const imagePrompt = buildImageGenerationPrompt(message, preparedAttachments);
                const imageResponse = await runClient.generateImage({
                    prompt: imagePrompt,
                    signal: abortController.signal
                });
                finalContent = imageResponse.content || '已生成图片。';
                window.chatUI.displayGeneratedImages(container, imageResponse.images, finalContent);
                window.chatUI.finalizeMessage(container);

                completeActiveRun(activeRun, {
                    content: finalContent,
                    images: getPersistableImages(imageResponse.images)
                });
                return;
            } else if (runRuntime) {
                const response = await runRuntime.run({
                    messages,
                    userMessage: routingMessage,
                    enableThinking: isDeepThinkEnabled,
                    toolEnabled: isToolEnabled,
                    hasAttachments: preparedAttachments.historyAttachments.length > 0,
                    contextPack,
                    toolContext: {
                        attachmentContext: preparedAttachments.contextText || '',
                        attachmentManifest: preparedAttachments.historyAttachments || [],
                        priorAgentRuns
                    },
                    container,
                    signal: abortController.signal,
                    onRunSnapshot: (snapshot, meta = {}) => {
                        agentRunSnapshot = snapshot || agentRunSnapshot;
                        if (meta.content !== undefined) {
                            finalContent = meta.content || finalContent;
                        }
                        persistActiveRun(activeRun, {
                            content: finalContent,
                            agent_run: agentRunSnapshot,
                            checkpoint_reason: meta.reason || 'run.snapshot'
                        }, { immediate: meta.reason === 'panel.created' || meta.reason === 'run.completed' });
                    }
                });

                finalContent = response?.content || finalContent;
                finalReasoning = '';
                collectedToolCalls = response?.agent_tool_calls || response?.tool_calls || collectedToolCalls;
                agentRunSnapshot = response?.agent_run || null;
            } else if (isToolEnabled) {
                // 带工具调用的对话
                const tools = window.toolRegistry.getToolDefinitions();

                const response = await runClient.chatWithTools({
                    messages,
                    tools,
                    enableThinking: isDeepThinkEnabled,
                    signal: abortController.signal,
                    onReasoning: (text) => {
                        finalReasoning += text;
                        window.chatUI.appendReasoningContent(container, text);
                        persistActiveRun(activeRun, { reasoning_content: finalReasoning });
                    },
                    onContent: (delta, full) => {
                        if (container.reasoningDetails.classList.contains('thinking-state')) {
                            window.chatUI.finishReasoning(container);
                        }
                        finalContent = full;
                        window.chatUI.updateContent(container, full);
                        persistActiveRun(activeRun, {
                            content: finalContent,
                            reasoning_content: finalReasoning || null
                        });
                    },
                    onToolCall: (toolCall) => {
                        // 收集工具调用信息用于保存到历史
                        collectedToolCalls.push({
                            id: toolCall.id,
                            type: 'function',
                            function: {
                                name: toolCall.function.name,
                                arguments: toolCall.function.arguments
                            }
                        });
                        window.chatUI.displayToolCall(container, toolCall);
                        persistActiveRun(activeRun, { tool_calls: collectedToolCalls }, { immediate: true });
                    },
                    onToolResult: (toolCallId, result, success) => {
                        window.chatUI.updateToolResult(toolCallId, result, success);
                    },
                    executeToolFn: async (name, args) => {
                        return await window.toolRegistry.execute(name, args);
                    }
                });

                finalContent = response.content || finalContent;
                finalReasoning = response.reasoning_content || finalReasoning;

            } else {
                // 普通对话（无工具）
                const response = await runClient.chat({
                    messages,
                    enableThinking: isDeepThinkEnabled,
                    signal: abortController.signal,
                    onReasoning: (text) => {
                        finalReasoning += text;
                        window.chatUI.appendReasoningContent(container, text);
                        persistActiveRun(activeRun, { reasoning_content: finalReasoning });
                    },
                    onContent: (delta, full) => {
                        if (container.reasoningDetails.classList.contains('thinking-state')) {
                            window.chatUI.finishReasoning(container);
                        }
                        finalContent = full;
                        window.chatUI.updateContent(container, full);
                        persistActiveRun(activeRun, {
                            content: finalContent,
                            reasoning_content: finalReasoning || null
                        });
                    },
                    onToolCall: () => { }
                });

                finalContent = response.content || finalContent;
                finalReasoning = response.reasoning_content || finalReasoning;
            }

            assertAssistantOutput(finalContent, {
                agentRun: agentRunSnapshot,
                toolCalls: collectedToolCalls.length ? collectedToolCalls : null
            });

            // 完成消息
            window.chatUI.finalizeMessage(container);

            // 保存助手消息到历史（包含工具调用信息）
            completeActiveRun(activeRun, {
                content: finalContent,
                reasoning_content: finalReasoning || null,
                tool_calls: collectedToolCalls.length > 0 ? collectedToolCalls : null,
                agent_run: agentRunSnapshot
            });

        } catch (error) {
            if (error.name === 'AbortError') {
                window.chatUI.showInterrupted(container);
                finalContent += '\n[TRANSMISSION INTERRUPTED]';
                window.chatUI.updateContent(container, finalContent);

                const interruptedPatch = {
                    status: 'interrupted',
                    content: finalContent,
                    reasoning_content: finalReasoning || null
                };
                if (activeRun) {
                    completeActiveRun(activeRun, interruptedPatch);
                } else if (!assistantMessagePersisted) {
                    window.historyManager.addMessage(chatId, {
                        role: 'assistant',
                        id: assistantMessageId,
                        message_id: assistantMessageId,
                        ...interruptedPatch
                    });
                }
            } else {
                window.chatUI.showError(container, error.message);
                const errorPatch = {
                    status: 'error',
                    content: finalContent || `[SYSTEM FAILURE]: ${error.message}`,
                    reasoning_content: finalReasoning || null,
                    agent_run: agentRunSnapshot,
                    error_message: error.message
                };
                if (activeRun) {
                    completeActiveRun(activeRun, errorPatch);
                } else if (!assistantMessagePersisted) {
                    window.historyManager.addMessage(chatId, {
                        role: 'assistant',
                        id: assistantMessageId,
                        message_id: assistantMessageId,
                        ...errorPatch,
                        owner_id: getCurrentAccountId()
                    });
                }
                console.error('Chat error:', error);
            }
        } finally {
            runClient.reset();
            updateHistoryUI();
            refreshSendButtonState();
        }
    }

    /**
     * 加载聊天
     */
    function loadChat(chatId) {
        window.historyManager.setCurrentChatId(chatId);
        const messages = window.historyManager.getMessages(chatId);

        window.chatUI.init();

        if (messages.length === 0) {
            window.chatUI.clearMessages();
        } else {
            const container = document.getElementById('chat-messages');
            if (container) {
                container.innerHTML = '';
                messages.forEach(msg => {
                    if (msg.role !== 'tool' && msg.role !== 'system') {
                        try {
                            const displayMsg = hydrateMessageFromDurableCheckpoint(chatId, msg);
                            const rendered = window.chatUI.displayMessageFromHistory(displayMsg);
                            if (displayMsg.role === 'assistant' && displayMsg.status === 'running') {
                                bindActiveRunContainer(chatId, displayMsg.message_id || displayMsg.id, rendered);
                            }
                            appendRecoverableRunActions(chatId, displayMsg, rendered);
                        } catch (e) {
                            console.warn('Failed to render history message:', e, msg);
                        }
                    }
                });
            }
        }

        updateHistoryUI();

        // 移动端关闭侧边栏
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.chat-sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }
        refreshSendButtonState();
    }

    /**
     * 新建聊天
     */
    function newChat(force = false) {
        clearAttachments();
        const history = window.historyManager.getChatHistory();
        const currentId = window.historyManager.getCurrentChatId();

        if (!force) {
            // 检查当前聊天是否为空
            if (currentId && history[currentId]) {
                const currentChat = history[currentId];
                if (!currentChat.messages || currentChat.messages.length === 0) {
                    document.getElementById('user-input')?.focus();
                    return;
                }
            }

            // 检查是否有空聊天
            const emptyChat = window.historyManager.findEmptyChat();
            if (emptyChat) {
                loadChat(emptyChat);
                return;
            }
        }

        // 创建新聊天
        const newChatId = window.historyManager.createNewChat();
        window.historyManager.saveChatHistory(newChatId);
        window.chatUI.clearMessages();
        updateHistoryUI();
        refreshSendButtonState();
    }

    /**
     * 删除选中的聊天
     */
    function deleteSelectedChats() {
        document.querySelectorAll('.history-checkbox:checked').forEach(checkbox => {
            const chatId = checkbox.getAttribute('data-id');
            if (chatId) selectedChatIds.add(chatId);
        });

        const chatIds = Array.from(selectedChatIds);
        if (chatIds.length === 0) return;
        chatIds.forEach(chatId => {
            const order = runningRunOrderByChat.get(chatId) || [];
            order
                .map(messageId => getActiveRun(chatId, messageId))
                .filter(Boolean)
                .forEach(abortActiveRun);
        });
        getDurableStore()?.removeForChats?.(chatIds);
        const currentDeleted = window.historyManager.deleteChats(chatIds);
        selectedChatIds.clear();

        if (currentDeleted) {
            const history = window.historyManager.getChatHistory();
            const sorted = window.historyManager.getSortedHistory(history);
            if (sorted.length > 0) {
                loadChat(sorted[0].id);
            } else {
                window.chatUI.clearMessages();
                updateHistoryUI();
            }
        } else {
            updateHistoryUI();
        }
        refreshSendButtonState();
    }

    /**
     * 搜索历史
     */
    function searchHistory(query) {
        const filtered = window.historyManager.searchHistory(query);
        const sorted = window.historyManager.getSortedHistory(filtered);
        window.chatUI.updateHistoryList(sorted, window.historyManager.getCurrentChatId(), loadChat, selectedChatIds, updateHistorySelection);
    }

    /**
     * 更新历史列表 UI
     */
    function updateHistoryUI() {
        const history = window.historyManager.getChatHistory();
        pruneHistorySelection(history);
        const sorted = window.historyManager.getSortedHistory(history);
        window.chatUI.updateHistoryList(sorted, window.historyManager.getCurrentChatId(), loadChat, selectedChatIds, updateHistorySelection);
    }

    function updateHistorySelection(chatId, checked) {
        if (!chatId) return;
        if (checked) {
            selectedChatIds.add(chatId);
        } else {
            selectedChatIds.delete(chatId);
        }
    }

    function selectAllVisibleHistory() {
        const checkboxes = document.querySelectorAll('#chat-history-list .history-checkbox');
        checkboxes.forEach(checkbox => {
            const chatId = checkbox.getAttribute('data-id');
            if (!chatId) return;
            checkbox.checked = true;
            selectedChatIds.add(chatId);
        });
    }

    function pruneHistorySelection(history) {
        selectedChatIds.forEach(chatId => {
            if (!history[chatId]) selectedChatIds.delete(chatId);
        });
    }

    function exportSelectedChats() {
        document.querySelectorAll('#chat-history-list .history-checkbox:checked').forEach(checkbox => {
            const chatId = checkbox.getAttribute('data-id');
            if (chatId) selectedChatIds.add(chatId);
        });

        const history = window.historyManager.getChatHistory();
        pruneHistorySelection(history);

        let chatIds = Array.from(selectedChatIds).filter(id => history[id]);
        const currentId = window.historyManager.getCurrentChatId();
        if (chatIds.length === 0 && currentId && history[currentId]) {
            chatIds = [currentId];
        }
        if (chatIds.length === 0) {
            alert('没有可导出的聊天记录');
            return;
        }

        const sortedChats = window.historyManager
            .getSortedHistory(history)
            .filter(chat => chatIds.includes(chat.id));

        const exportedAt = new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const content = [
            'PzM Agent 聊天导出',
            `导出时间: ${exportedAt}`,
            `会话数量: ${sortedChats.length}`,
            '',
            sortedChats.map(formatChatForExport).join('\n\n' + '='.repeat(72) + '\n\n')
        ].join('\n');

        const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `PzM-chat-export-${formatExportDate(new Date())}.txt`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    function formatChatForExport(chat) {
        const debugExport = shouldExportDebugInternals();
        const lines = [
            `会话标题: ${chat.title || '未命名会话'}`,
            `会话 ID: ${chat.id}`,
            `更新时间: ${new Date(chat.timestamp || Date.now()).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
            '',
            '消息记录:',
            ''
        ];

        const messages = Array.isArray(chat.messages) ? chat.messages : [];
        if (!messages.length) {
            lines.push('(空会话)');
            return lines.join('\n');
        }

        messages.forEach((msg, index) => {
            lines.push(`--- ${index + 1}. ${formatRole(msg.role)} ---`);
            lines.push(formatMessageContentForExport(msg.content, msg));

            if (msg.status && msg.status !== 'completed') {
                lines.push('', '[状态]');
                lines.push(String(msg.status));
            }
            if (msg.error_message) {
                lines.push('', '[错误]');
                lines.push(String(msg.error_message));
            }
            if (msg.durable_run_id) {
                lines.push('', '[Durable Run]');
                lines.push(String(msg.durable_run_id));
            }

            if (Array.isArray(msg.attachments) && msg.attachments.length) {
                lines.push('', '[附件]');
                msg.attachments.forEach(file => {
                    lines.push(`- ${file.path || file.name || 'attachment'} | ${file.kind || 'file'} | ${formatBytes(file.size || 0)} | ${file.type || 'unknown'}`);
                });
            }

            if (debugExport && (msg.reasoning_content || msg.reasoning)) {
                lines.push('', '[思维链]');
                lines.push(String(msg.reasoning_content || msg.reasoning));
            }

            if (debugExport && Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
                lines.push('', '[工具调用]');
                msg.tool_calls.forEach((toolCall, toolIndex) => {
                    lines.push(formatToolCallForExport(toolCall, toolIndex));
                });
            }

            const agentRunForExport = resolveAgentRunForMessage(msg);
            if (agentRunForExport) {
                lines.push('', '[Agent Run 状态]');
                lines.push(formatAgentRunForExport(agentRunForExport));
            }

            if (Array.isArray(msg.images) && msg.images.length) {
                lines.push('', '[生成图片]');
                msg.images.forEach((image, imageIndex) => {
                    const url = String(image.url || '');
                    const outputUrl = url.startsWith('data:') ? `[base64 image omitted, ${url.length} chars]` : url;
                    lines.push(`${imageIndex + 1}. ${outputUrl}`);
                    if (image.revisedPrompt) lines.push(`   revisedPrompt: ${image.revisedPrompt}`);
                });
            }

            lines.push('');
        });

        return lines.join('\n');
    }

    function shouldExportDebugInternals() {
        try {
            return localStorage.getItem('PZM_EXPORT_DEBUG') === '1';
        } catch (e) {
            return false;
        }
    }

    function formatRole(role) {
        const map = {
            user: '用户',
            assistant: '助手',
            system: '系统',
            tool: '工具'
        };
        return map[role] || role || '未知';
    }

    function formatMessageContentForExport(content, message = null) {
        let text;
        if (Array.isArray(content)) {
            text = content.map(part => {
                if (part?.type === 'text') return part.text || '';
                if (part?.type === 'image_url') return `[image_url] ${part.image_url?.url || ''}`;
                return JSON.stringify(part, null, 2);
            }).join('\n');
        } else if (content == null || content === '') {
            text = '(空内容)';
        } else {
            text = String(content);
        }
        if (message?.role === 'assistant') {
            return normalizeExportFinalAnswerText(normalizeExportSourceSections(text));
        }
        return text;
    }

    function normalizeExportFinalAnswerText(text) {
        return String(text || '')
            .split('\n')
            .map(line => normalizeExportSummaryHeadingLine(line))
            .join('\n');
    }

    function normalizeExportSummaryHeadingLine(line) {
        const raw = String(line || '');
        if (!/一句话/.test(raw)) return raw;
        const heading = raw.match(/^(\s{0,3}#{1,6}\s+).*一句话.*$/u);
        if (heading) return `${heading[1]}总结`;
        const trimmed = raw.trim();
        if (/^\d+[.)、]\s+/.test(trimmed)) return raw;
        const labelish = /^(\*\*)?[^:：\n]{0,28}一句话[^:：\n]{0,28}(\*\*)?\s*[:：]/u.test(trimmed)
            || /^(\*\*)?[^:：\n]{0,28}一句话[^:：\n]{0,28}(\*\*)?$/u.test(trimmed)
            || /^[\-*+> ]{0,4}[^:：\n]{0,16}一句话[^:：\n]{0,16}\s*[:：]/u.test(trimmed);
        if (!labelish) return raw;
        const boldLabel = raw.match(/^(\s*(?:[-*+]\s+|>\s*)?)(\*\*)?[^:：\n]{0,40}一句话[^:：\n]{0,40}([:：])(\*\*)?\s*(.*)$/u);
        if (boldLabel) {
            const marker = boldLabel[2] || boldLabel[4] ? '**' : '';
            const suffix = boldLabel[5] ? ` ${boldLabel[5].replace(/^\*\*\s*/, '').trim()}` : '';
            return `${boldLabel[1] || ''}${marker}总结${boldLabel[3]}${marker}${suffix}`.trimEnd();
        }
        const plainLabel = raw.match(/^(\s*(?:[-*+]\s+|>\s*)?)(\*\*)?[^:：\n]{0,40}一句话[^:：\n]{0,40}(\*\*)?\s*$/u);
        if (plainLabel) {
            const marker = plainLabel[2] || plainLabel[3] ? '**' : '';
            return `${plainLabel[1] || ''}${marker}总结${marker}`.trimEnd();
        }
        return raw;
    }

    function normalizeExportSourceSections(text) {
        const value = String(text || '').trimEnd();
        const matches = Array.from(value.matchAll(exportSourceHeadingPattern()));
        if (matches.length < 2) return value;

        const last = matches[matches.length - 1];
        const headingStart = last.index + (last[1] ? last[1].length : 0);
        const before = stripTrailingExportSourceSections(value.slice(0, headingStart));
        const finalSourceBlock = value.slice(headingStart).trimStart();
        return [before, finalSourceBlock].filter(Boolean).join('\n\n').trimEnd();
    }

    function exportSourceHeadingPattern() {
        return /(^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(来源|参考|Sources|References)\s*(?:\*\*)?\s*[:：]?\s*(?:\*\*)?\s*(?=\n|$)/gi;
    }

    function matchExportSourceHeadingAtStart(value) {
        return String(value || '').match(/^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(来源|参考|Sources|References)\s*(?:\*\*)?\s*[:：]?\s*(?:\*\*)?\s*/i);
    }

    function stripTrailingExportSourceSections(value) {
        let body = String(value || '').trimEnd();
        while (body) {
            const matches = Array.from(body.matchAll(exportSourceHeadingPattern()));
            if (!matches.length) return body;
            const match = matches[matches.length - 1];
            const headingStart = match.index + (match[1] ? match[1].length : 0);
            const trailing = body.slice(headingStart);
            if (!looksLikeExportSourceSection(trailing)) return body;
            body = body.slice(0, headingStart).trimEnd();
        }
        return body;
    }

    function looksLikeExportSourceSection(value) {
        const heading = matchExportSourceHeadingAtStart(value);
        const body = heading ? String(value || '').slice(heading[0].length).trim() : String(value || '').trim();
        if (!body) return true;
        const sourceLikeLines = body
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .filter(line => /\[\d+\]|https?:\/\/|agentearth\.ai|[\u2014-]{2,}/i.test(line));
        return sourceLikeLines.length >= 2 || /https?:\/\/|\[\d+\]/.test(body);
    }

    function formatToolCallForExport(toolCall, index) {
        const fn = toolCall.function || {};
        const lines = [
            `${index + 1}. id: ${toolCall.id || ''}`,
            `   name: ${fn.name || ''}`
        ];
        if (fn.arguments) {
            lines.push('   arguments:');
            lines.push(indentText(formatJsonLike(fn.arguments), '     '));
        }
        return lines.join('\n');
    }

    function formatAgentRunForExport(run) {
        const lines = [
            `contract_version: ${run.contract_version || 'agent-contract-v1'}`,
            `runId: ${run.runId || ''}`,
            `mode: ${run.mode || ''}`,
            `researchProfile: ${run.researchProfile || ''}`,
            `agentEarthTargetCalls: ${run.agentEarthTargetCalls || 0}`,
            `maxIterations: ${run.maxIterations ?? ''}`
        ];
        if (Array.isArray(run.selectedTools) && run.selectedTools.length) {
            lines.push(`selectedTools: ${run.selectedTools.join(', ')}`);
        }
        if (Array.isArray(run.tool_contracts) && run.tool_contracts.length) {
            lines.push('tool_contracts:');
            lines.push(indentText(JSON.stringify(run.tool_contracts, null, 2), '  '));
        }
        if (run.collaboration) {
            lines.push('collaboration:');
            lines.push(indentText(JSON.stringify(run.collaboration, null, 2), '  '));
        }
        if (Array.isArray(run.events) && run.events.length) {
            const exportableEvents = run.events.filter(event => event?.type !== 'model.delta').slice(0, 3000);
            lines.push('events:');
            lines.push(indentText(JSON.stringify(exportableEvents, null, 2), '  '));
        }
        if (run.metrics) {
            lines.push('metrics:');
            lines.push(indentText(JSON.stringify(run.metrics, null, 2), '  '));
        }
        if (run.context_pack_summary) {
            lines.push('context_pack_summary:');
            lines.push(indentText(JSON.stringify(run.context_pack_summary, null, 2), '  '));
        }
        if (Array.isArray(run.warnings) && run.warnings.length) {
            lines.push('warnings:');
            run.warnings.forEach(warning => {
                lines.push(`  - ${warning}`);
            });
        }
        if (run.citation_verification) {
            lines.push('citation_verification:');
            lines.push(indentText(JSON.stringify(run.citation_verification, null, 2), '  '));
        }
        if (Array.isArray(run.evidence_ledger) && run.evidence_ledger.length) {
            lines.push('evidence_ledger:');
            lines.push(indentText(JSON.stringify(run.evidence_ledger, null, 2), '  '));
        }
        if (Array.isArray(run.tool_results) && run.tool_results.length) {
            lines.push('tool_results:');
            lines.push(indentText(JSON.stringify(run.tool_results, null, 2), '  '));
        }
        if (Array.isArray(run.stages) && run.stages.length) {
            lines.push('stages:');
            run.stages.forEach(stage => {
                lines.push(`  - ${stage.id || stage.label || ''} | ${stage.state || ''} | ${stage.note || ''}`);
            });
        }
        if (Array.isArray(run.traces) && run.traces.length) {
            lines.push('traces:');
            run.traces.forEach(trace => {
                lines.push(`  - [${trace.stage || ''}] ${trace.message || ''}`);
            });
        }
        return lines.join('\n');
    }

    function formatJsonLike(value) {
        try {
            return JSON.stringify(JSON.parse(value), null, 2);
        } catch (e) {
            return String(value);
        }
    }

    function indentText(text, prefix) {
        return String(text).split('\n').map(line => prefix + line).join('\n');
    }

    function formatExportDate(date) {
        const pad = value => String(value).padStart(2, '0');
        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate())
        ].join('') + '-' + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('');
    }

    async function importChatHistoryFiles(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        const importedChats = [];
        const errors = [];
        for (const file of files) {
            try {
                const text = await file.text();
                const chats = parseChatExportText(text);
                if (!chats.length) {
                    errors.push(`${file.name}: 未识别到聊天记录`);
                    continue;
                }
                importedChats.push(...chats);
            } catch (error) {
                errors.push(`${file.name}: ${error.message}`);
            }
        }

        if (!importedChats.length) {
            alert(errors.length ? `导入失败：\n${errors.join('\n')}` : '没有可导入的聊天记录');
            return;
        }

        const importedIds = window.historyManager.importChats(importedChats);
        selectedChatIds.clear();
        updateHistoryUI();
        loadChat(importedIds[0]);
        setAttachmentStatus(`已导入 ${importedIds.length} 个聊天`);
        if (errors.length) {
            alert(`已导入 ${importedIds.length} 个聊天，部分文件失败：\n${errors.join('\n')}`);
        }
    }

    function parseChatExportText(rawText) {
        const text = String(rawText || '').replace(/^\ufeff/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (!text.includes('PzM Agent 聊天导出') && !text.includes('会话标题:')) {
            throw new Error('不是 PzM Agent 聊天导出文件');
        }

        const body = text.replace(/^PzM Agent 聊天导出[\s\S]*?(?=会话标题:)/, '');
        return body
            .split(/\n={20,}\n/g)
            .map(section => section.trim())
            .filter(Boolean)
            .map(parseExportedChatSection)
            .filter(chat => chat.messages.length > 0);
    }

    function parseExportedChatSection(section) {
        const title = matchLine(section, /^会话标题:\s*(.*)$/m) || '导入会话';
        const originalId = matchLine(section, /^会话 ID:\s*(.*)$/m) || '';
        const updatedAt = matchLine(section, /^更新时间:\s*(.*)$/m);
        const timestamp = parseExportTimestamp(updatedAt);
        const messagesStart = section.search(/^消息记录:\s*$/m);
        const messageText = messagesStart >= 0
            ? section.slice(messagesStart).replace(/^消息记录:\s*\n?/m, '')
            : section;

        return {
            id: originalId,
            title,
            timestamp,
            messages: parseExportedMessages(messageText)
        };
    }

    function parseExportedMessages(messageText) {
        const messages = [];
        const markerPattern = /^---\s+\d+\.\s+(.+?)\s+---\s*$/gm;
        const markers = [];
        let match;
        while ((match = markerPattern.exec(messageText)) !== null) {
            markers.push({
                roleLabel: match[1],
                start: match.index,
                contentStart: markerPattern.lastIndex
            });
        }

        markers.forEach((marker, index) => {
            const end = markers[index + 1]?.start ?? messageText.length;
            const block = messageText.slice(marker.contentStart, end).trim();
            const message = parseExportedMessageBlock(marker.roleLabel, block);
            if (message) messages.push(message);
        });
        return messages;
    }

    function parseExportedMessageBlock(roleLabel, block) {
        const role = parseExportRole(roleLabel);
        const sections = splitExportMessageSections(block);
        const content = normalizeImportedContent(sections.content);
        const message = { role, content };

        if (sections['附件']) {
            message.attachments = parseImportedAttachments(sections['附件']);
        }
        if (sections['思维链']) {
            message.reasoning_content = sections['思维链'].trim();
        }
        if (sections['工具调用']) {
            message.tool_calls = parseImportedToolCalls(sections['工具调用']);
        }
        if (sections['Agent Run 状态']) {
            const agentRun = parseImportedAgentRun(sections['Agent Run 状态']);
            if (agentRun) {
                message.agent_run = agentRun;
                message.agent_run_id = agentRun.runId || null;
            }
        }
        if (sections['生成图片']) {
            message.images = parseImportedImages(sections['生成图片']);
        }
        if (sections['状态']) {
            message.status = sections['状态'].trim() || undefined;
        }
        if (sections['错误']) {
            message.error_message = sections['错误'].trim();
        }
        if (sections['Durable Run']) {
            message.durable_run_id = sections['Durable Run'].trim();
        }
        return message;
    }

    function splitExportMessageSections(block) {
        const labels = new Set(['附件', '思维链', '工具调用', 'Agent Run 状态', '生成图片', '状态', '错误', 'Durable Run']);
        const sections = { content: [] };
        let current = 'content';

        String(block || '').split('\n').forEach(line => {
            const labelMatch = line.match(/^\[(.+)]\s*$/);
            if (labelMatch && labels.has(labelMatch[1])) {
                current = labelMatch[1];
                sections[current] = [];
                return;
            }
            sections[current].push(line);
        });

        Object.keys(sections).forEach(key => {
            sections[key] = sections[key].join('\n').trim();
        });
        return sections;
    }

    function parseImportedAttachments(section) {
        return String(section || '').split('\n')
            .map(line => line.match(/^-\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*)$/))
            .filter(Boolean)
            .map(match => ({
                path: match[1].trim(),
                name: match[1].trim().split(/[\\/]/).pop(),
                kind: match[2].trim(),
                size: parseImportedSize(match[3]),
                type: match[4].trim()
            }));
    }

    function parseImportedToolCalls(section) {
        const chunks = String(section || '').split(/(?=^\d+\.\s+id:)/m).map(part => part.trim()).filter(Boolean);
        return chunks.map((chunk, index) => {
            const id = matchLine(chunk, /^\d+\.\s+id:\s*(.*)$/m) || `imported_tool_${index}`;
            const name = matchLine(chunk, /^\s*name:\s*(.*)$/m) || '';
            const argsMatch = chunk.match(/^\s*arguments:\s*\n([\s\S]*)$/m);
            const args = argsMatch ? argsMatch[1].replace(/^ {5}/gm, '').trim() : '';
            return {
                id,
                type: 'function',
                function: {
                    name,
                    arguments: args
                }
            };
        }).filter(toolCall => toolCall.function.name);
    }

    function parseImportedAgentRun(section) {
        const text = String(section || '').trim();
        if (!text) return null;
        const contractVersion = matchLine(text, /^contract_version:\s*(.*)$/m) || 'agent-contract-v1';
        const runId = matchLine(text, /^runId:\s*(.*)$/m);
        const mode = matchLine(text, /^mode:\s*(.*)$/m);
        const researchProfile = matchLine(text, /^researchProfile:\s*(.*)$/m);
        const agentEarthTargetCallsText = matchLine(text, /^agentEarthTargetCalls:\s*(.*)$/m);
        const maxIterationsText = matchLine(text, /^maxIterations:\s*(.*)$/m);
        const selectedToolsText = matchLine(text, /^selectedTools:\s*(.*)$/m);
        const toolContracts = parseIndentedJsonField(text, 'tool_contracts') || [];
        const events = parseIndentedJsonField(text, 'events') || [];
        const metrics = parseIndentedJsonField(text, 'metrics') || null;
        const contextPackSummary = parseIndentedJsonField(text, 'context_pack_summary') || null;
        const citationVerification = parseIndentedJsonField(text, 'citation_verification') || null;
        const collaboration = parseIndentedJsonField(text, 'collaboration') || null;
        const evidenceLedger = parseIndentedJsonField(text, 'evidence_ledger') || [];
        const toolResults = parseIndentedJsonField(text, 'tool_results') || [];
        const stages = parseImportedAgentRunStages(text);
        const traces = parseImportedAgentRunTraces(text);
        const warnings = parseIndentedListField(text, 'warnings');
        const restoredEvents = Array.isArray(events) ? events : [];
        if (!restoredEvents.length && citationVerification) {
            restoredEvents.push(createImportedAgentRunEvent(runId, 1, 'citation.verified', {
                citation_markers: [
                    ...(Array.isArray(citationVerification.matched) ? citationVerification.matched.map(item => item.marker) : []),
                    ...(Array.isArray(citationVerification.unmatched) ? citationVerification.unmatched.map(item => item.marker) : []),
                    ...(Array.isArray(citationVerification.weak) ? citationVerification.weak.map(item => item.marker) : [])
                ].filter(Boolean),
                matched: citationVerification.matched || [],
                unmatched: citationVerification.unmatched || [],
                weak: citationVerification.weak || [],
                imported: true
            }));
        }

        if (!runId && !mode && !metrics && !evidenceLedger.length && !toolResults.length) {
            return null;
        }

        const maxIterations = Number(maxIterationsText);
        const agentEarthTargetCalls = Number(agentEarthTargetCallsText);
        return {
            contract_version: contractVersion,
            runId,
            mode,
            researchProfile,
            selectedTools: selectedToolsText
                ? selectedToolsText.split(',').map(item => item.trim()).filter(Boolean)
                : [],
            agentEarthTargetCalls: Number.isFinite(agentEarthTargetCalls) ? agentEarthTargetCalls : 0,
            maxIterations: Number.isFinite(maxIterations) ? maxIterations : '',
            stages,
            traces,
            context_pack_summary: contextPackSummary,
            tool_contracts: Array.isArray(toolContracts) ? toolContracts : [],
            events: restoredEvents,
            metrics,
            warnings,
            tool_results: Array.isArray(toolResults) ? toolResults : [],
            evidence_ledger: Array.isArray(evidenceLedger) ? evidenceLedger : [],
            citation_verification: citationVerification,
            collaboration,
            artifacts: []
        };
    }

    function createImportedAgentRunEvent(runId, seq, type, payload) {
        return {
            id: `evt-imported-${Date.now().toString(36)}-${seq}`,
            contract_version: 'agent-contract-v1',
            runId: runId || '',
            seq,
            type,
            ts: new Date().toISOString(),
            stage: 'synthesize',
            payload: payload || {},
            visibility: 'history'
        };
    }

    function parseIndentedJsonField(section, label) {
        const block = extractIndentedField(section, label);
        if (!block) return null;
        try {
            return JSON.parse(block);
        } catch (e) {
            console.warn(`AgentRun import skipped invalid JSON field ${label}:`, e);
            return null;
        }
    }

    function parseIndentedListField(section, label) {
        const block = extractIndentedField(section, label);
        if (!block) return [];
        return block.split('\n')
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(Boolean);
    }

    function extractIndentedField(section, label) {
        const lines = String(section || '').split('\n');
        const start = lines.findIndex(line => line.trim() === `${label}:`);
        if (start < 0) return '';
        const block = [];
        for (let i = start + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('  ')) {
                block.push(line.replace(/^ {2}/, ''));
                continue;
            }
            if (!line.trim()) {
                if (block.length) block.push('');
                continue;
            }
            break;
        }
        return block.join('\n').trim();
    }

    function parseImportedAgentRunStages(section) {
        const block = extractIndentedField(section, 'stages');
        if (!block) return [];
        return block.split('\n')
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(Boolean)
            .map(line => {
                const parts = line.split('|').map(part => part.trim());
                return {
                    id: parts[0] || '',
                    label: parts[0] || '',
                    state: parts[1] || 'done',
                    note: parts.slice(2).join(' | ')
                };
            });
    }

    function parseImportedAgentRunTraces(section) {
        const block = extractIndentedField(section, 'traces');
        if (!block) return [];
        return block.split('\n')
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(Boolean)
            .map(line => {
                const match = line.match(/^\[(.*?)]\s*(.*)$/);
                return match
                    ? { stage: match[1], message: match[2] || '' }
                    : { stage: '', message: line };
            });
    }

    function parseImportedImages(section) {
        return String(section || '').split('\n')
            .map(line => line.match(/^\d+\.\s+(.*)$/))
            .filter(Boolean)
            .map(match => ({ url: match[1].trim(), mimeType: 'image' }))
            .filter(image => image.url && !image.url.startsWith('[base64 image omitted'));
    }

    function parseExportRole(label) {
        const normalized = String(label || '').trim();
        const map = {
            '用户': 'user',
            '助手': 'assistant',
            '系统': 'system',
            '工具': 'tool'
        };
        return map[normalized] || normalized.toLowerCase() || 'assistant';
    }

    function normalizeImportedContent(content) {
        const text = String(content || '').trim();
        return text === '(空内容)' ? '' : text;
    }

    function parseExportTimestamp(value) {
        const parsed = Date.parse(String(value || '').trim());
        return Number.isNaN(parsed) ? Date.now() : parsed;
    }

    function parseImportedSize(value) {
        const text = String(value || '').trim();
        const match = text.match(/^([\d.]+)\s*(B|KB|MB)$/i);
        if (!match) return 0;
        const number = Number(match[1]);
        const unit = match[2].toUpperCase();
        if (unit === 'MB') return Math.round(number * 1024 * 1024);
        if (unit === 'KB') return Math.round(number * 1024);
        return Math.round(number);
    }

    function matchLine(text, pattern) {
        const match = String(text || '').match(pattern);
        return match ? match[1].trim() : '';
    }

    /**
     * 处理按键事件
     */
    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        if (eventsInitialized) return;

        // 发送按钮
        const sendButton = document.getElementById('send-message');
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }

        // 输入框
        const inputElement = document.getElementById('user-input');
        if (inputElement) {
            inputElement.addEventListener('keypress', handleKeyPress);
            inputElement.addEventListener('input', refreshSendButtonState);
        }

        bindAttachmentEvents();

        // 新建聊天
        const newChatButton = document.getElementById('new-chat');
        if (newChatButton) {
            newChatButton.addEventListener('click', () => newChat());
        }

        const selectAllButton = document.getElementById('select-all-history');
        if (selectAllButton) {
            selectAllButton.addEventListener('click', selectAllVisibleHistory);
        }

        const exportChatButton = document.getElementById('export-chat-history');
        if (exportChatButton) {
            exportChatButton.addEventListener('click', exportSelectedChats);
        }

        // 删除历史
        const deleteButton = document.getElementById('delete-history');
        if (deleteButton) {
            deleteButton.addEventListener('click', deleteSelectedChats);
        }

        // 深度思考开关
        const deepThinkToggle = document.getElementById('deep-think-toggle');
        if (deepThinkToggle) {
            deepThinkToggle.classList.add('active');
            deepThinkToggle.addEventListener('click', () => {
                deepThinkToggle.classList.toggle('active');
            });
        }

        // 工具开关
        const toolToggle = document.getElementById('tool-toggle');
        if (toolToggle) {
            toolToggle.classList.add('active');
            toolToggle.addEventListener('click', () => {
                toolToggle.classList.toggle('active');
            });
        }

        const modelingModeToggle = document.getElementById('modeling-mode-toggle');
        const imageModeToggle = document.getElementById('image-mode-toggle');
        if (modelingModeToggle || imageModeToggle) {
            const inputActions = (modelingModeToggle || imageModeToggle).closest('.input-actions');
            const syncModeControls = activeMode => {
                const modelingEnabled = activeMode === 'modeling';
                const imageEnabled = activeMode === 'image';
                modelingModeToggle?.classList.toggle('active', modelingEnabled);
                imageModeToggle?.classList.toggle('active', imageEnabled);
                inputActions?.classList.toggle('image-mode-only', modelingEnabled || imageEnabled);
                if (modelingEnabled || imageEnabled) {
                    toolToggle?.classList.remove('active');
                    deepThinkToggle?.classList.remove('active');
                } else {
                    toolToggle?.classList.add('active');
                    deepThinkToggle?.classList.add('active');
                }
            };
            const initialMode = modelingModeToggle?.classList.contains('active')
                ? 'modeling'
                : imageModeToggle?.classList.contains('active')
                    ? 'image'
                    : '';
            syncModeControls(initialMode);
            modelingModeToggle?.addEventListener('click', () => {
                syncModeControls(modelingModeToggle.classList.contains('active') ? '' : 'modeling');
            });
            imageModeToggle?.addEventListener('click', () => {
                syncModeControls(imageModeToggle.classList.contains('active') ? '' : 'image');
            });
        }

        // 搜索
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => searchHistory(e.target.value));
        }

        // 移动端侧边栏切换
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const sidebar = document.querySelector('.chat-sidebar');
                if (sidebar) sidebar.classList.toggle('active');
            });
        }

        // 移动端新建聊天
        const newChatMobile = document.getElementById('new-chat-mobile');
        if (newChatMobile) {
            newChatMobile.addEventListener('click', () => {
                newChat();
                const sidebar = document.querySelector('.chat-sidebar');
                if (sidebar) sidebar.classList.remove('active');
            });
        }

        // 点击外部关闭侧边栏
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.chat-sidebar');
                const toggle = document.getElementById('sidebar-toggle');

                if (sidebar && sidebar.classList.contains('active')) {
                    if (!sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
                        sidebar.classList.remove('active');
                    }
                }
            }
        });

        eventsInitialized = true;
    }

    /**
     * 初始化聊天功能
     */
    function initChatFunctions() {
        recoverDurableRunsIntoHistory();
        // 初始化 UI
        window.chatUI.init();

        // 绑定事件
        bindEvents();

        // 检查登录状态
        if (!checkLogin()) {
            showLoginOverlay(true);
            window.chatUI.clearMessages();
        } else {
            showLoginOverlay(false);
            // 加载或创建聊天
            const currentId = window.historyManager.getCurrentChatId();
            if (currentId) {
                loadChat(currentId);
            } else {
                newChat();
            }
        }

        // 监听登录/登出事件
        window.addEventListener('cipher-login-success', () => {
            showLoginOverlay(false);
            const currentId = window.historyManager.getCurrentChatId();
            if (currentId) {
                loadChat(currentId);
            } else {
                newChat();
            }
        });

        window.addEventListener('cipher-logout-success', () => {
            showLoginOverlay(false);
        });
    }

    // 导出全局函数
    window.initChatFunctions = initChatFunctions;
    window.bindChatEvents = bindEvents;

    // DOM 加载完成后自动初始化（如果在大模型页面）
    document.addEventListener('DOMContentLoaded', function () {
        if (window.location.hash === '#damoxing') {
            initChatFunctions();
        }
    });
})();
