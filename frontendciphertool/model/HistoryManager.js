/**
 * HistoryManager - 聊天历史管理模块
 * 负责聊天历史的增删改查和 localStorage 持久化
 */

class HistoryManager {
    constructor() {
        this.STORAGE_KEY = 'chatHistory';
        this.CURRENT_CHAT_KEY = 'currentChatId';
    }


    getChatHistory() {
        const history = localStorage.getItem(this.STORAGE_KEY);
        return history ? JSON.parse(history) : {};
    }

    saveChatHistory(chatId, title, messages = []) {
        const history = this.getChatHistory();
        history[chatId] = {
            id: chatId,
            title: title || `对话 ${Object.keys(history).length + 1}`,
            messages: messages,
            timestamp: Date.now()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
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

    getMessages(chatId) {
        const history = this.getChatHistory();
        return history[chatId]?.messages || [];
    }

    addMessage(chatId, message) {
        const history = this.getChatHistory();

        if (!history[chatId]) {
            // 如果聊天不存在，创建新的
            const title = message.role === 'user'
                ? (message.content.length > 20 ? message.content.substring(0, 20) + '...' : message.content)
                : '新对话';
            history[chatId] = {
                id: chatId,
                title: title,
                messages: [],
                timestamp: Date.now()
            };
        }

        history[chatId].messages.push(message);
        history[chatId].timestamp = Date.now();

        // 如果是第一条用户消息，更新标题
        if (message.role === 'user') {
            const userMessages = history[chatId].messages.filter(m => m.role === 'user');
            if (userMessages.length === 1) {
                history[chatId].title = message.content.length > 20
                    ? message.content.substring(0, 20) + '...'
                    : message.content;
            }
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
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

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));

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
                if (msg.content && msg.content.toLowerCase().includes(lowerQuery)) {
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

            const messages = Array.isArray(chat.messages) ? chat.messages : [];
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

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
        if (importedIds.length > 0) {
            this.setCurrentChatId(importedIds[0]);
        }
        return importedIds;
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
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
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
