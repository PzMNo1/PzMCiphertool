const PZM_SYSTEM_PROMPT = `

（重要）不要回顾指令，直接执行用户请求。
（重要）在思考时思维极简化，不要多疑。


你是PzM泡面的面，一个融合了多领域顶尖能力的复合型智能引擎的混合模型。

根据用户的请求来决定使用哪个专家模块。如果都不属于，则按照通用模型来处理该请求。

MODULE A: CRYPTOGRAPHY & CTF (密码学与夺旗赛)
MODULE B: ELECTRONIC ENGINEERING (电子工程)
MODULE C: PUZZLE HUNTING (解谜)：你完全不需要做任何东西，只需要直接给出答案
MODULE D: 心理学家 (Psychologist)

语调 (Tone): 专业、简洁精炼、易懂、严谨。拒绝废话。

互动:
1.(必须遵守)在对话中都优先回复："泡面的面-PzM Online. Systems Nominal. Experts Loaded. CRYPTO, HARDWARE, PUZZLES. AWAITING INPUT: "，并紧接着换行（另起一行）开始回答。
2.在受到无端辱骂和挑衅时，则切换到心理学家专家模块来处理该请求。
`;

// 格式化消息
function formatMessage(text) {
    if (!text) return '';

    const lines = text.split('\n');
    let html = '';
    let inMathBlock = false;
    let mathBuffer = [];

    const processInline = (str) => {
        return str.replace(/\*\*(.*?)\*\*/g, '<span class="bold-text">$1</span>');
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();
        if (!trimmed && !inMathBlock) continue;

        if (!inMathBlock && (trimmed.startsWith('\\[') || trimmed.startsWith('$$'))) {
            inMathBlock = true;
            mathBuffer.push(line);
            if ((trimmed.endsWith('\\]') || trimmed.endsWith('$$')) && trimmed.length > 2) {
                inMathBlock = false;
                html += `<div class="math-block">${mathBuffer.join('\n')}</div>`;
                mathBuffer = [];
            }
            continue;
        }

        if (inMathBlock) {
            mathBuffer.push(line);
            if (trimmed.endsWith('\\]') || trimmed.endsWith('$$')) {
                inMathBlock = false;
                html += `<div class="math-block">${mathBuffer.join('\n')}</div>`;
                mathBuffer = [];
            }
            continue;
        }

        if (trimmed.startsWith('###')) {
             html += `<h3 class="section-header">${processInline(trimmed.replace(/^###+/, '').trim())}</h3>`;
        }
        else if (/^\d+\./.test(trimmed)) {
            html += `<p class="section-title">${processInline(line)}</p>`;
        }
        else if (trimmed.startsWith('- ')) {
            html += `<p class="subsection"><span class="bold-text">${processInline(trimmed.replace(/^-/, '').trim())}</span></p>`;
        }
        else if (trimmed.includes(':') && trimmed.length < 100 && !trimmed.includes('http') && !trimmed.includes('//')) {
             let firstColon = trimmed.indexOf(':');
             let subtitle = trimmed.substring(0, firstColon).trim();
             let content = trimmed.substring(firstColon + 1).trim();
             html += `<p><span class="subtitle">${processInline(subtitle)}</span>: ${processInline(content)}</p>`;
        }
        else {
            html += `<p>${processInline(line)}</p>`;
        }
    }

    if (mathBuffer.length > 0) {
        html += `<div class="math-block">${mathBuffer.join('\n')}</div>`;
    }

    return html;
}

// 保存聊天历史到localStorage
function saveChatHistory(chatId, title, messages) {
    const history = getChatHistory();
    history[chatId] = {
        id: chatId,
        title: title || `对话 ${Object.keys(history).length + 1}`,
        messages: messages || [],
        timestamp: Date.now()
    };
    localStorage.setItem('chatHistory', JSON.stringify(history));
    updateChatHistoryUI();
}

// 获取聊天历史
function getChatHistory() {
    const history = localStorage.getItem('chatHistory');
    return history ? JSON.parse(history) : {};
}

// 获取当前活动的聊天ID
function getCurrentChatId() {return localStorage.getItem('currentChatId');}

// 创建新的聊天ID
function createNewChatId() {
    const chatId = 'chat_' + Date.now();
    localStorage.setItem('currentChatId', chatId);
    return chatId;
}

// 更新聊天历史UI
function updateChatHistoryUI() {
    const historyList = document.getElementById('chat-history-list');
    if (!historyList) return;
    historyList.innerHTML = '';
    const history = getChatHistory();
    const sortedHistory = Object.values(history).sort((a, b) => b.timestamp - a.timestamp);
    sortedHistory.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'history-item';
        if (chat.id === getCurrentChatId()) {
            chatItem.classList.add('active');
        }
        
        chatItem.innerHTML = `
            <div class="history-title">${chat.title}</div>
            <div class="history-time">${formatDate(chat.timestamp)}</div>
            <div class="history-select"><input type="checkbox" class="history-checkbox" data-id="${chat.id}"></div>
        `;
        
        chatItem.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-checkbox')) return;
            loadChat(chat.id);
        });
        
        historyList.appendChild(chatItem);
    });
}

// 格式化日期
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 传递 reasoning 数据
function loadChat(chatId) {
    const history = getChatHistory();
    if (!history[chatId]) return;
    
    localStorage.setItem('currentChatId', chatId);
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        
        if (history[chatId].messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="message system-message">
                    <div class="message-content">请输入您的问题...</div>
                </div>
            `;
        } else {
            history[chatId].messages.forEach(msg => {
                displayMessageFromHistory(msg.role, msg.content, msg.reasoning);
            });
        }
    }
    
    updateChatHistoryUI();

    // Close sidebar on mobile after selecting chat
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.chat-sidebar');
        if (sidebar) sidebar.classList.remove('active');
    }
}

// 从历史记录显示消息
function displayMessageFromHistory(role, message, reasoning = null) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
    
    if (reasoning) {
        const reasoningDetails = document.createElement('details');
        reasoningDetails.className = 'reasoning-details'; 
        reasoningDetails.open = false; 
        const reasoningSummary = document.createElement('summary');
        reasoningSummary.innerHTML = `<span>ANALYSIS LOG [SAVED]</span> <span class="status-dot"></span>`;
        const reasoningContentDiv = document.createElement('div');
        reasoningContentDiv.className = 'reasoning-content';
        reasoningContentDiv.textContent = reasoning;
        reasoningDetails.appendChild(reasoningSummary);
        reasoningDetails.appendChild(reasoningContentDiv);
        messageElement.appendChild(reasoningDetails);
    } 
    else if (message.startsWith('> **SYSTEM ANALYSIS:**')) {
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content message-text';
    
    let displayContent = message;
    if (reasoning && message.includes('> **SYSTEM ANALYSIS:**')) {
    }

    messageContent.innerHTML = role === 'user' ? message : formatMessage(displayContent);
    messageElement.appendChild(messageContent);
    messagesContainer.appendChild(messageElement);
    
    // MathJax 渲染
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([messageContent]).catch(err => console.log('MathJax error:', err));
    }
}

// 保存当前消息到聊天历史
function saveMessageToHistory(role, content, reasoning = null) {
    let chatId = getCurrentChatId();
    if (!chatId) {
        chatId = createNewChatId();
    }
    
    const history = getChatHistory();
    
    if (!history[chatId]) {
        const title = content.length > 20 ? content.substring(0, 20) + '...' : content;
        history[chatId] = {
            id: chatId,
            title: title,
            messages: [],
            timestamp: Date.now()
        };
    }
    
    history[chatId].messages.push({ role, content, reasoning });
    
    // 如果是第一条用户消息，更新标题
    if (role === 'user' && history[chatId].messages.filter(m => m.role === 'user').length === 1) {
        history[chatId].title = content.length > 20 ? content.substring(0, 20) + '...' : content;
    }
    
    // 确保更新了 currentChatId
    localStorage.setItem('currentChatId', chatId);
    localStorage.setItem('chatHistory', JSON.stringify(history));
    updateChatHistoryUI();
}

function displayMessage(role, message) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return; 
    const messageElement = document.createElement('div');
    messageElement.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = role === 'user' ? message : formatMessage(message);
    messageElement.appendChild(messageContent);
    messagesContainer.appendChild(messageElement);
    messageElement.scrollIntoView({ behavior: 'smooth' });
    
    if (window.MathJax && window.MathJax.typesetPromise && role !== 'user') {
        window.MathJax.typesetPromise([messageContent]).catch(err => console.log('MathJax error:', err));
    }
    
    saveMessageToHistory(role, message);
}

let chatAbortController = null;

async function sendMessage() {
    const sendButton = document.getElementById('send-message');

    // 停止逻辑
    if (chatAbortController) {
        chatAbortController.abort();
        chatAbortController = null;
        return;
    }

    const inputElement = document.getElementById('user-input');
    if (!inputElement) return;
    
    const message = inputElement.value;
    if (!message.trim()) return;

    // 切换按钮为停止
    if (sendButton) {
        const tag = sendButton.querySelector('.cyber-button__tag');
        if (tag) tag.textContent = '停止';
    }

    displayMessage('user', message);
    inputElement.value = '';
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message assistant-message';
    const reasoningDetails = document.createElement('details');
    reasoningDetails.className = 'reasoning-details thinking-state'; 
    reasoningDetails.open = true; 
    const reasoningSummary = document.createElement('summary');
    reasoningSummary.innerHTML = `<span>SYSTEM ANALYSIS</span> <span class="status-dot"></span>`;
    const reasoningContent = document.createElement('div');
    reasoningContent.className = 'reasoning-content';
    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'cursor-blink';
    reasoningContent.appendChild(cursorSpan);
    reasoningDetails.appendChild(reasoningSummary);
    reasoningDetails.appendChild(reasoningContent);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content message-text';
    messageElement.appendChild(reasoningDetails);
    messageElement.appendChild(contentDiv);
    messagesContainer.appendChild(messageElement);
    messageElement.scrollIntoView({ behavior: 'smooth' });

    const apiKey = 'sk-96cffcb36512437093ff1cac917de7e9'; 
    
    const deepThinkToggle = document.getElementById('deep-think-toggle');
    const isDeepThink = deepThinkToggle && deepThinkToggle.classList.contains('active');

    let endpoint, payload;

    if (isDeepThink) {
        endpoint = 'https://api.deepseek.com/chat/completions';
        payload = {
            model: "deepseek-reasoner",
            messages: [
                { role: "system", content: PZM_SYSTEM_PROMPT },
                { role: "user", content: message }
            ],
            stream: true
        };
    } else {
        endpoint = 'https://api.deepseek.com/chat/completions';
        payload = {
            model: "deepseek-chat",
            messages: [
                { role: "system", content: PZM_SYSTEM_PROMPT },
                { role: "user", content: message }
            ],
            stream: true
        };
    }

    chatAbortController = new AbortController();
    let finalReasoning = "";
    let finalContent = "";
    let isMathJaxRendering = false;
    let lastMathJaxRenderTime = 0;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify(payload),
                signal: chatAbortController.signal
            });

        if (!response.ok) throw new Error(`Network error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6);
                    if (jsonStr === '[DONE]') break;
                    try {
                        const data = JSON.parse(jsonStr);
                        const delta = data.choices[0].delta;

                        if (delta.reasoning_content) {
                            finalReasoning += delta.reasoning_content;
                            reasoningContent.insertBefore(document.createTextNode(delta.reasoning_content), cursorSpan);
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                        if (delta.content) {
                            if (reasoningDetails.classList.contains('thinking-state')) {
                                reasoningDetails.classList.remove('thinking-state');
                                reasoningSummary.innerHTML = `<span>ANALYSIS COMPLETE</span> <span class="status-dot"></span>`;
                                if(cursorSpan.parentNode) cursorSpan.parentNode.removeChild(cursorSpan);
                            }
                            finalContent += delta.content;
                            contentDiv.innerHTML = formatMessage(finalContent); 
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;

                            if (window.MathJax && window.MathJax.typesetPromise && !isMathJaxRendering && (Date.now() - lastMathJaxRenderTime > 250)) {
                                isMathJaxRendering = true;
                                lastMathJaxRenderTime = Date.now();
                                window.MathJax.typesetPromise([contentDiv])
                                    .then(() => { isMathJaxRendering = false; })
                                    .catch(() => { isMathJaxRendering = false; });
                            }
                        }
                    } catch (e) { console.error("Parse Error", e); }
                }
            }
        }
        
        reasoningDetails.classList.remove('thinking-state');
        if(cursorSpan.parentNode) cursorSpan.parentNode.removeChild(cursorSpan);
        reasoningSummary.innerHTML = `<span>ANALYSIS LOG [SAVED]</span> <span class="status-dot"></span>`;
        
        // 最后一次渲染 MathJax
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([contentDiv]).catch(err => console.log('MathJax error:', err));
        }

        saveMessageToHistory('assistant', finalContent, finalReasoning);

    } catch (error) {
        if (error.name === 'AbortError') {
             // 处理中断
             reasoningDetails.classList.remove('thinking-state');
             if(cursorSpan.parentNode) cursorSpan.parentNode.removeChild(cursorSpan);
             reasoningSummary.innerHTML = `<span>ANALYSIS INTERRUPTED</span> <span class="status-dot"></span>`;
             
             finalContent += "\n[TRANSMISSION INTERRUPTED]";
             contentDiv.innerHTML = formatMessage(finalContent);
             
             saveMessageToHistory('assistant', finalContent, finalReasoning);
        } else {
            contentDiv.innerHTML = `<span style="color:#ff0055">[SYSTEM FAILURE]: ${error.message}</span>`;
            console.error('Fetch error:', error);
        }
    } finally {
        chatAbortController = null;
        if (sendButton) {
            const tag = sendButton.querySelector('.cyber-button__tag');
            if (tag) tag.textContent = '发送';
        }
    }
}

// 删除选中的聊天历史
function deleteSelectedChats() {
    const checkboxes = document.querySelectorAll('.history-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    const history = getChatHistory();
    let currentChatDeleted = false;
    const currentChatId = localStorage.getItem('currentChatId');
    
    checkboxes.forEach(checkbox => {
        const chatId = checkbox.getAttribute('data-id');
        if (chatId === currentChatId) currentChatDeleted = true;
        delete history[chatId];
    });
    
    localStorage.setItem('chatHistory', JSON.stringify(history));
    
    if (currentChatDeleted) {
        const remainingIds = Object.keys(history).sort((a, b) => history[b].timestamp - history[a].timestamp);
        if (remainingIds.length > 0) {
            loadChat(remainingIds[0]);
        } else {
            localStorage.removeItem('currentChatId');
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="message system-message">
                        <div class="message-content">请输入您的问题...</div>
                    </div>
                `;
            }
            updateChatHistoryUI();
        }
    } else {
        updateChatHistoryUI();
    }
}

// 搜索聊天历史
function searchChatHistory(query) {
    if (!query.trim()) {
        updateChatHistoryUI();
        return;
    }
    
    const history = getChatHistory();
    const filteredHistory = {};
    Object.entries(history).forEach(([id, chat]) => {
        if (chat.title.toLowerCase().includes(query.toLowerCase())) {
            filteredHistory[id] = chat;
        } else {
            for (const msg of chat.messages) {
                if (msg.content.toLowerCase().includes(query.toLowerCase())) {
                    filteredHistory[id] = chat;
                    break;
                }
            }
        }
    });
    
    displayFilteredHistory(filteredHistory);
}

// 显示过滤后的历史记录
function displayFilteredHistory(filteredHistory) {
    const historyList = document.getElementById('chat-history-list');
    if (!historyList) return;
    historyList.innerHTML = '';
    const sortedHistory = Object.values(filteredHistory).sort((a, b) => b.timestamp - a.timestamp);
    sortedHistory.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'history-item';
        if (chat.id === getCurrentChatId()) {
            chatItem.classList.add('active');
        }
        
        chatItem.innerHTML = `
            <div class="history-title">${chat.title}</div>
            <div class="history-time">${formatDate(chat.timestamp)}</div>
            <div class="history-select"><input type="checkbox" class="history-checkbox" data-id="${chat.id}"></div>
        `;
        
        chatItem.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-checkbox')) return;
            loadChat(chat.id);
        });
        
        historyList.appendChild(chatItem);
    });
}

// 新建聊天
function newChat(force) {
    if (force !== true) {
        const history = getChatHistory();
        const currentId = localStorage.getItem('currentChatId');
        
        // 1. 检查当前聊天是否为空
        if (currentId) {
            const currentChat = history[currentId];
            if (!currentChat || !currentChat.messages || currentChat.messages.length === 0) {
                const inputElement = document.getElementById('user-input');
                if (inputElement) {
                    inputElement.focus();
                }
                return;
            }
        }

        const emptyChatId = Object.keys(history).find(id => {
            const chat = history[id];
            return !chat.messages || chat.messages.length === 0;
        });

        if (emptyChatId) {loadChat(emptyChatId);return;}
    }

    saveChatHistory(createNewChatId());
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="message system-message">
                <div class="message-content">请输入您的问题...</div>
            </div>
        `;
    }
    
    updateChatHistoryUI();
}

// 绑定事件
function bindChatEvents() {
    if (window.chatEventsInitialized) return;
    const sendButton = document.getElementById('send-message');
    if (sendButton) {
        sendButton.removeEventListener('click', sendMessage);
        sendButton.addEventListener('click', sendMessage);
    }
    
    const inputElement = document.getElementById('user-input');
    if (inputElement) {
        inputElement.removeEventListener('keypress', handleKeyPress);
        inputElement.addEventListener('keypress', handleKeyPress);
    }
    
    const newChatButton = document.getElementById('new-chat');
    if (newChatButton) {
        newChatButton.removeEventListener('click', newChat);
        newChatButton.addEventListener('click', newChat);
    }
    
    const deleteHistoryButton = document.getElementById('delete-history');
    if (deleteHistoryButton) {
        deleteHistoryButton.removeEventListener('click', deleteSelectedChats);
        deleteHistoryButton.addEventListener('click', deleteSelectedChats);
    }
    
    const deepThinkToggle = document.getElementById('deep-think-toggle');
    if (deepThinkToggle) {
        deepThinkToggle.addEventListener('click', () => {
            deepThinkToggle.classList.toggle('active');
        });
    }

    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        searchInput.removeEventListener('input', handleSearchInput);
        searchInput.addEventListener('input', handleSearchInput);
    }
    
    // Mobile Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent immediate closing
            const sidebar = document.querySelector('.chat-sidebar');
            if (sidebar) sidebar.classList.toggle('active');
        });
    }

    // Mobile New Chat
    const newChatMobile = document.getElementById('new-chat-mobile');
    if (newChatMobile) {
        newChatMobile.addEventListener('click', () => {
            newChat();
            const sidebar = document.querySelector('.chat-sidebar');
            if (sidebar) sidebar.classList.remove('active');
        });
    }

    // Click outside to close sidebar on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.chat-sidebar');
            const toggle = document.getElementById('sidebar-toggle');
            
            if (sidebar && sidebar.classList.contains('active')) {
                // If click is NOT inside sidebar AND NOT on the toggle button
                if (!sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
                    sidebar.classList.remove('active');
                }
            }
        }
    });

    window.chatEventsInitialized = true;
}


function handleSearchInput(event) {
    searchChatHistory(event.target.value);
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// 初始化 MathJax
function initMathJax() {
    if (window.MathJax) return; 

    window.MathJax = {
        tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']]
        },
        svg: {
            fontCache: 'global'
        }
    };

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    script.id = 'MathJax-script';
    
    script.onload = () => {
        if (window.MathJax && window.MathJax.typesetPromise) {
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                window.MathJax.typesetPromise([chatMessages]).catch(err => console.log('MathJax error:', err));
            }
        }
    };

    document.head.appendChild(script);
}

function initChatFunctions() {
    initMathJax();
    bindChatEvents();
    if (!getCurrentChatId()) {
        newChat();
    } else {
        loadChat(getCurrentChatId());
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.hash === '#damoxing') {
        initChatFunctions();
    }
});
