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

// 加载特定聊天
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
                displayMessageFromHistory(msg.role, msg.content);
            });
        }
    }
    
    updateChatHistoryUI();
}

// 从历史记录显示消息
function displayMessageFromHistory(role, message) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = role === 'user' ? message : formatMessage(message);
    
    messageElement.appendChild(messageContent);
    messagesContainer.appendChild(messageElement);
}

// 保存当前消息到聊天历史
function saveMessageToHistory(role, content) {
    const chatId = getCurrentChatId();
    const history = getChatHistory();
    
    if (!history[chatId]) {
        const title = content.length > 20 ? content.substring(0, 20) + '...' : content;
        saveChatHistory(chatId, title, []);
    }
    
    history[chatId].messages.push({ role, content });
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

function sendMessage() {
    const inputElement = document.getElementById('user-input');
    if (!inputElement) return;
    const message = inputElement.value;
    if (!message.trim()) return;
    displayMessage('user', message);
    inputElement.value = '';
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'message assistant-message loading-message';
    loadingMessage.innerHTML = `
        <div class="message-content">思考中</div>
        <div class="loading-dots">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        </div>
    `;
    document.getElementById('chat-messages').appendChild(loadingMessage);
    const apiKey = 'sk-066fc908d21449679765556b1a18d111'; 
    const endpoint = 'https://api.deepseek.com/chat/completions';

    const payload = {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: "您是密码工具箱AI助手，名字叫泡面的面，请根据用户的问题，给出详细的解答。" },
            { role: "user", content: message }
        ],
        stream: false
    };

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('chat-messages').removeChild(loadingMessage);
        if (data.choices && data.choices.length > 0) {
            displayMessage('assistant', data.choices[0].message.content);
        } else {
            displayMessage('assistant', '出错了，请稍后再试。');
        }
    })
    .catch(error => {
        document.getElementById('chat-messages').removeChild(loadingMessage);
        displayMessage('assistant', '出错了，请稍后再试。');
        console.error('Error:', error);
    });
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