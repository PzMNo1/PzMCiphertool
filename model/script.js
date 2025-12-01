// 格式化消息
function formatMessage(text) {
    if (!text) return '';
    let lines = text.split('\n');
    let formattedLines = lines.map(line => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<span class="bold-text">$1</span>');
        return line;
    });
    
    let processedText = formattedLines.join('\n');
    let sections = processedText
        .split('###')
        .filter(section => section.trim())
        .map(section => {
            let lines = section.split('\n').filter(line => line.trim());
            if (lines.length === 0) return '';
            let result = '';
            let currentIndex = 0;
            while (currentIndex < lines.length) {
                let line = lines[currentIndex].trim();
                if (/^\d+\./.test(line)) {
                    result += `<p class="section-title">${line}</p>`;
                }
                else if (line.startsWith('-')) {
                    result += `<p class="subsection"><span class="bold-text">${line.replace(/^-/, '').trim()}</span></p>`;
                }
                else if (line.includes(':')) {
                    let [subtitle, content] = line.split(':').map(part => part.trim());
                    result += `<p><span class="subtitle">${subtitle}</span>: ${content}</p>`;
                }
                else {
                    result += `<p>${line}</p>`;
                }
                currentIndex++;
            }
            return result;
        });
    
    return sections.join('');
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
function getCurrentChatId() {
    return localStorage.getItem('currentChatId') || createNewChatId();
}

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

// 加载特定聊天：传递 reasoning 数据
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
                // 这里的 msg.reasoning 就是我们单独存的思考内容
                displayMessageFromHistory(msg.role, msg.content, msg.reasoning);
            });
        }
    }
    
    updateChatHistoryUI();
}

// 从历史记录显示消息
function displayMessageFromHistory(role, message, reasoning = null) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
    
    if (reasoning) {
        // 构建外层容器
        const reasoningDetails = document.createElement('details');
        reasoningDetails.className = 'reasoning-details'; 
        reasoningDetails.open = false; 
        const reasoningSummary = document.createElement('summary');
        reasoningSummary.innerHTML = `<span>ANALYSIS LOG [SAVED]</span> <span class="status-dot"></span>`;
        
        // 构建内容区
        const reasoningContentDiv = document.createElement('div');
        reasoningContentDiv.className = 'reasoning-content';
        reasoningContentDiv.textContent = reasoning;
        reasoningDetails.appendChild(reasoningSummary);
        reasoningDetails.appendChild(reasoningContentDiv);
        messageElement.appendChild(reasoningDetails);
    } 
    // 兼容旧数据：如果 reasoning 为空，但 content 里包含了旧的格式
    else if (message.startsWith('> **SYSTEM ANALYSIS:**')) {
    }
    
    // 正文部分
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content message-text';
    

    let displayContent = message;
    if (reasoning && message.includes('> **SYSTEM ANALYSIS:**')) {
    }

    messageContent.innerHTML = role === 'user' ? message : formatMessage(displayContent);
    
    messageElement.appendChild(messageContent);
    messagesContainer.appendChild(messageElement);
}

// 保存当前消息到聊天历史
function saveMessageToHistory(role, content, reasoning = null) {
    const chatId = getCurrentChatId();
    const history = getChatHistory();
    
    if (!history[chatId]) {
        const title = content.length > 20 ? content.substring(0, 20) + '...' : content;
        saveChatHistory(chatId, title, []);
    }
    
    // 将 reasoning 单独存储在对象中
    history[chatId].messages.push({ role, content, reasoning });
    
    // 如果是用户的第一条消息，更新标题
    if (role === 'user' && history[chatId].messages.filter(m => m.role === 'user').length === 1) {
        history[chatId].title = content.length > 20 ? content.substring(0, 20) + '...' : content;
    }
    
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
    saveMessageToHistory(role, message);
}

async function sendMessage() {
    const inputElement = document.getElementById('user-input');
    if (!inputElement) return;
    
    const message = inputElement.value;
    if (!message.trim()) return;
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

    // 3. API 请求
    const apiKey = 'sk-066fc908d21449679765556b1a18d111'; 
    const endpoint = 'https://api.deepseek.com/chat/completions';

    const payload = {
        model: "deepseek-reasoner",
        messages: [
            { role: "system", content:

                 "您是密码工具箱AI助手，名字叫泡面的面。是本地部署的模型，年龄24岁，拥有广泛特长：包括但不限于摄影、剪辑、音乐、唱歌、钢琴、全栈编程、写书、电子工程、导弹研发、无人机开发、具身智能开发等等。21岁那年也就是2022年拿到全国推理大赛亚军，22岁从事东芝和大疆的顶尖技术开发，23岁在中央从事技术领域顾问工作，24岁隐藏所有身份回基层扎根，并准备回北京报告基层状况，以及发表一篇sci和Nature" 
                },
            { role: "user", content: message }
        ],
        stream: true
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Network error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let finalReasoning = "";
        let finalContent = "";

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
                        }
                    } catch (e) { console.error("Parse Error", e); }
                }
            }
        }
        
        reasoningDetails.classList.remove('thinking-state');
        if(cursorSpan.parentNode) cursorSpan.parentNode.removeChild(cursorSpan);
        reasoningSummary.innerHTML = `<span>ANALYSIS LOG [SAVED]</span> <span class="status-dot"></span>`;

        saveMessageToHistory('assistant', finalContent, finalReasoning);

    } catch (error) {
        contentDiv.innerHTML = `<span style="color:#ff0055">[SYSTEM FAILURE]: ${error.message}</span>`;
        console.error('Fetch error:', error);
    }
}

// 删除选中的聊天历史
function deleteSelectedChats() {
    const checkboxes = document.querySelectorAll('.history-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    const history = getChatHistory();
    let currentChatDeleted = false;
    const currentChatId = getCurrentChatId();
    
    checkboxes.forEach(checkbox => {
        const chatId = checkbox.getAttribute('data-id');
        if (chatId === currentChatId) currentChatDeleted = true;
        delete history[chatId];
    });
    
    localStorage.setItem('chatHistory', JSON.stringify(history));
    
    if (currentChatDeleted) {
        newChat();
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
function newChat() {
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
    
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        searchInput.removeEventListener('input', handleSearchInput);
        searchInput.addEventListener('input', handleSearchInput);
    }
    
    window.chatEventsInitialized = true;
}

// 处理搜索输入
function handleSearchInput(event) {
    searchChatHistory(event.target.value);
}

// 处理键盘事件
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function initChatFunctions() {
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