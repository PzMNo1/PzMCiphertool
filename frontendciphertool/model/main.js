/**
 * main.js - 大模型模块主入口
 * 整合所有模块，处理事件绑定和初始化
 */

(function () {
    let agentRuntime = null;
    // 客户端实例（使用后端代理，无需 API 密钥）
    let client = null;

    // 状态
    let isToolEnabled = false;
    let isDeepThinkEnabled = false;
    let eventsInitialized = false;

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

        // 检查是否正在请求中（中止逻辑）
        if (client && client.abortController) {
            client.abort();
            client.reset();
            if (sendButton) {
                sendButton.querySelector('.cyber-button__tag').textContent = '发送';
            }
            return;
        }

        const message = inputElement.value.trim();
        if (!message) return;

        // 更新按钮状态
        if (sendButton) {
            sendButton.querySelector('.cyber-button__tag').textContent = '停止';
        }

        // 显示用户消息
        window.chatUI.displayUserMessage(message);

        // 保存用户消息到历史
        let chatId = window.historyManager.getCurrentChatId();
        if (!chatId) {
            chatId = window.historyManager.createNewChat();
        }
        window.historyManager.addMessage(chatId, { role: 'user', content: message });

        // 清空输入框
        inputElement.value = '';

        // 创建助手消息容器
        const container = window.chatUI.createAssistantMessageContainer();

        // 获取状态
        const deepThinkToggle = document.getElementById('deep-think-toggle');
        const toolToggle = document.getElementById('tool-toggle');
        isDeepThinkEnabled = deepThinkToggle && deepThinkToggle.classList.contains('active');
        isToolEnabled = toolToggle && toolToggle.classList.contains('active');

        // 构建消息
        const messages = [
            { role: 'system', content: window.PZM_SYSTEM_PROMPT },
            ...window.historyManager.getMessagesForAPI(chatId)
        ];

        // 初始化客户端
        initClient();

        let finalReasoning = '';
        let finalContent = '';
        let agentRunSnapshot = null;
        let collectedToolCalls = []; // 收集工具调用信息

        try {
            if (agentRuntime) {
                const response = await agentRuntime.run({
                    messages,
                    userMessage: message,
                    enableThinking: isDeepThinkEnabled,
                    toolEnabled: isToolEnabled,
                    container
                });

                finalContent = response?.content || finalContent;
                finalReasoning = response?.reasoning_content || finalReasoning;
                collectedToolCalls = response?.agent_tool_calls || response?.tool_calls || collectedToolCalls;
                agentRunSnapshot = response?.agent_run || null;
            } else if (isToolEnabled) {
                // 带工具调用的对话
                const tools = window.toolRegistry.getToolDefinitions();

                const response = await client.chatWithTools({
                    messages,
                    tools,
                    enableThinking: isDeepThinkEnabled,
                    onReasoning: (text) => {
                        finalReasoning += text;
                        window.chatUI.appendReasoningContent(container, text);
                    },
                    onContent: (delta, full) => {
                        if (container.reasoningDetails.classList.contains('thinking-state')) {
                            window.chatUI.finishReasoning(container);
                        }
                        finalContent = full;
                        window.chatUI.updateContent(container, full);
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
                const response = await client.chat({
                    messages,
                    enableThinking: isDeepThinkEnabled,
                    onReasoning: (text) => {
                        finalReasoning += text;
                        window.chatUI.appendReasoningContent(container, text);
                    },
                    onContent: (delta, full) => {
                        if (container.reasoningDetails.classList.contains('thinking-state')) {
                            window.chatUI.finishReasoning(container);
                        }
                        finalContent = full;
                        window.chatUI.updateContent(container, full);
                    },
                    onToolCall: () => { }
                });

                finalContent = response.content || finalContent;
                finalReasoning = response.reasoning_content || finalReasoning;
            }

            // 完成消息
            window.chatUI.finalizeMessage(container);

            // 保存助手消息到历史（包含工具调用信息）
            window.historyManager.addMessage(chatId, {
                role: 'assistant',
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

                window.historyManager.addMessage(chatId, {
                    role: 'assistant',
                    content: finalContent,
                    reasoning_content: finalReasoning || null
                });
            } else {
                window.chatUI.showError(container, error.message);
                console.error('Chat error:', error);
            }
        } finally {
            client.reset();
            if (sendButton) {
                sendButton.querySelector('.cyber-button__tag').textContent = '发送';
            }
            updateHistoryUI();
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
                            window.chatUI.displayMessageFromHistory(msg);
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
    }

    /**
     * 新建聊天
     */
    function newChat(force = false) {
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
    }

    /**
     * 删除选中的聊天
     */
    function deleteSelectedChats() {
        const checkboxes = document.querySelectorAll('.history-checkbox:checked');
        if (checkboxes.length === 0) return;

        const chatIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
        const currentDeleted = window.historyManager.deleteChats(chatIds);

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
    }

    /**
     * 搜索历史
     */
    function searchHistory(query) {
        const filtered = window.historyManager.searchHistory(query);
        const sorted = window.historyManager.getSortedHistory(filtered);
        window.chatUI.updateHistoryList(sorted, window.historyManager.getCurrentChatId(), loadChat);
    }

    /**
     * 更新历史列表 UI
     */
    function updateHistoryUI() {
        const history = window.historyManager.getChatHistory();
        const sorted = window.historyManager.getSortedHistory(history);
        window.chatUI.updateHistoryList(sorted, window.historyManager.getCurrentChatId(), loadChat);
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
        }

        // 新建聊天
        const newChatButton = document.getElementById('new-chat');
        if (newChatButton) {
            newChatButton.addEventListener('click', () => newChat());
        }

        // 删除历史
        const deleteButton = document.getElementById('delete-history');
        if (deleteButton) {
            deleteButton.addEventListener('click', deleteSelectedChats);
        }

        // 深度思考开关
        const deepThinkToggle = document.getElementById('deep-think-toggle');
        if (deepThinkToggle) {
            deepThinkToggle.addEventListener('click', () => {
                deepThinkToggle.classList.toggle('active');
            });
        }

        // 工具开关
        const toolToggle = document.getElementById('tool-toggle');
        if (toolToggle) {
            toolToggle.addEventListener('click', () => {
                toolToggle.classList.toggle('active');
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
        // 初始化 UI
        window.chatUI.init();
        window.chatUI.initMathJax();

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
