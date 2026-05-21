/**
 * ChatUI - 聊天界面渲染模块
 * 负责消息显示、格式化、工具调用状态展示
 */

class ChatUI {
    constructor() {
        this.messagesContainer = null;
        this.mathJaxRendering = false;
        this.lastMathJaxRenderTime = 0;
    }

    /**
     * 初始化 UI 元素引用
     */
    init() {
        this.messagesContainer = document.getElementById('chat-messages');
    }

    /**
     * 格式化消息文本为 HTML
     * @param {string} text
     * @returns {string}
     */
    formatMessage(text) {
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
            } else if (/^\d+\./.test(trimmed)) {
                html += `<p class="section-title">${processInline(line)}</p>`;
            } else if (trimmed.startsWith('- ')) {
                html += `<p class="subsection"><span class="bold-text">${processInline(trimmed.replace(/^-/, '').trim())}</span></p>`;
            } else if (trimmed.includes(':') && trimmed.length < 100 && !trimmed.includes('http') && !trimmed.includes('//')) {
                let firstColon = trimmed.indexOf(':');
                let subtitle = trimmed.substring(0, firstColon).trim();
                let content = trimmed.substring(firstColon + 1).trim();
                html += `<p><span class="subtitle">${processInline(subtitle)}</span>: ${processInline(content)}</p>`;
            } else {
                html += `<p>${processInline(line)}</p>`;
            }
        }

        if (mathBuffer.length > 0) {
            html += `<div class="math-block">${mathBuffer.join('\n')}</div>`;
        }

        return html;
    }

    /**
     * 显示用户消息
     * @param {string} content
     */
    displayUserMessage(content) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;

        messageElement.appendChild(messageContent);
        this.messagesContainer.appendChild(messageElement);
        messageElement.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 创建助手消息容器（用于流式响应）
     * @returns {Object} { element, reasoningDetails, reasoningContent, contentDiv, cursorSpan }
     */
    createAssistantMessageContainer() {
        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant-message';

        // 思维链区域
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

        // 内容区域
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content message-text';

        messageElement.appendChild(reasoningDetails);
        messageElement.appendChild(contentDiv);
        this.messagesContainer.appendChild(messageElement);
        messageElement.scrollIntoView({ behavior: 'smooth' });

        return {
            element: messageElement,
            reasoningDetails,
            reasoningSummary,
            reasoningContent,
            contentDiv,
            cursorSpan
        };
    }

    /**
     * 更新思维链内容（流式）
     * @param {Object} container - createAssistantMessageContainer 返回的对象
     * @param {string} text - 新增的文本
     */
    appendReasoningContent(container, text) {
        container.reasoningContent.insertBefore(
            document.createTextNode(text),
            container.cursorSpan
        );
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * 完成思维链阶段
     * @param {Object} container
     */
    finishReasoning(container) {
        container.reasoningDetails.classList.remove('thinking-state');
        container.reasoningSummary.innerHTML = `<span>ANALYSIS COMPLETE</span> <span class="status-dot"></span>`;
        if (container.cursorSpan.parentNode) {
            container.cursorSpan.parentNode.removeChild(container.cursorSpan);
        }
    }

    /**
     * 更新内容区域（流式）
     * @param {Object} container
     * @param {string} fullContent - 完整的内容文本
     */
    updateContent(container, fullContent) {
        container.contentDiv.innerHTML = this.formatMessage(fullContent);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        this.debouncedMathJax(container.contentDiv);
    }

    /**
     * 防抖的 MathJax 渲染
     * @param {HTMLElement} element
     */
    debouncedMathJax(element) {
        if (window.MathJax && window.MathJax.typesetPromise && !this.mathJaxRendering &&
            (Date.now() - this.lastMathJaxRenderTime > 250)) {
            this.mathJaxRendering = true;
            this.lastMathJaxRenderTime = Date.now();
            window.MathJax.typesetPromise([element])
                .then(() => { this.mathJaxRendering = false; })
                .catch(() => { this.mathJaxRendering = false; });
        }
    }

    /**
     * 显示工具调用卡片
     * @param {Object} container
     * @param {Object} toolCall - { id, function: { name, arguments } }
     * @returns {HTMLElement} 工具卡片元素
     */
    displayToolCall(container, toolCall) {
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-call-card tool-executing';
        toolCard.id = `tool-${toolCall.id}`;

        let args = '{}';
        try {
            args = JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2);
        } catch (e) {
            args = toolCall.function.arguments;
        }

        toolCard.innerHTML = `
            <div class="tool-call-header">
                <span class="tool-icon">🔧</span>
                <span class="tool-name">${toolCall.function.name}</span>
                <span class="tool-status">执行中...</span>
            </div>
            <div class="tool-call-args">
                <pre>${args}</pre>
            </div>
            <div class="tool-call-result"></div>
        `;

        container.element.insertBefore(toolCard, container.contentDiv);
        return toolCard;
    }

    /**
     * 更新工具调用结果
     * @param {string} toolCallId
     * @param {string} result
     * @param {boolean} success
     */
    updateToolResult(toolCallId, result, success = true) {
        const toolCard = document.getElementById(`tool-${toolCallId}`);
        if (!toolCard) return;

        toolCard.classList.remove('tool-executing');
        toolCard.classList.add(success ? 'tool-success' : 'tool-error');

        const statusEl = toolCard.querySelector('.tool-status');
        statusEl.textContent = success ? '已完成' : '失败';

        const resultEl = toolCard.querySelector('.tool-call-result');
        resultEl.innerHTML = `<pre>${result}</pre>`;
    }

    /**
     * 完成消息（保存状态）
     * @param {Object} container
     */
    finalizeMessage(container) {
        container.reasoningDetails.classList.remove('thinking-state');
        container.reasoningSummary.innerHTML = `<span>ANALYSIS LOG [SAVED]</span> <span class="status-dot"></span>`;
        if (container.cursorSpan.parentNode) {
            container.cursorSpan.parentNode.removeChild(container.cursorSpan);
        }

        // 最终 MathJax 渲染
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([container.contentDiv]).catch(err => console.log('MathJax error:', err));
        }
    }

    /**
     * 显示中断状态
     * @param {Object} container
     */
    showInterrupted(container) {
        container.reasoningDetails.classList.remove('thinking-state');
        container.reasoningSummary.innerHTML = `<span>ANALYSIS INTERRUPTED</span> <span class="status-dot"></span>`;
        if (container.cursorSpan.parentNode) {
            container.cursorSpan.parentNode.removeChild(container.cursorSpan);
        }
    }

    /**
     * 显示错误消息
     * @param {Object} container
     * @param {string} errorMessage
     */
    showError(container, errorMessage) {
        container.contentDiv.innerHTML = `<span style="color:#ff0055">[SYSTEM FAILURE]: ${errorMessage}</span>`;
    }

    /**
     * 从历史记录显示消息
     * @param {Object} msg - { role, content, reasoning, tool_calls }
     */
    displayMessageFromHistory(msg) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`;

        // 显示思维链
        if (msg.reasoning_content || msg.reasoning) {
            const reasoningDetails = document.createElement('details');
            reasoningDetails.className = 'reasoning-details';
            reasoningDetails.open = false;

            const reasoningSummary = document.createElement('summary');
            reasoningSummary.innerHTML = `<span>ANALYSIS LOG [SAVED]</span> <span class="status-dot"></span>`;

            const reasoningContentDiv = document.createElement('div');
            reasoningContentDiv.className = 'reasoning-content';
            reasoningContentDiv.textContent = msg.reasoning_content || msg.reasoning;

            reasoningDetails.appendChild(reasoningSummary);
            reasoningDetails.appendChild(reasoningContentDiv);
            messageElement.appendChild(reasoningDetails);
        }

        // 显示工具调用
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            msg.tool_calls.forEach(tc => {
                const toolCard = document.createElement('div');
                toolCard.className = 'tool-call-card tool-success';

                let args = '{}';
                try {
                    args = JSON.stringify(JSON.parse(tc.function.arguments), null, 2);
                } catch (e) {
                    args = tc.function.arguments;
                }

                toolCard.innerHTML = `
                    <div class="tool-call-header">
                        <span class="tool-icon">🔧</span>
                        <span class="tool-name">${tc.function.name}</span>
                        <span class="tool-status">已完成</span>
                    </div>
                    <div class="tool-call-args">
                        <pre>${args}</pre>
                    </div>
                `;
                messageElement.appendChild(toolCard);
            });
        }

        // 显示内容
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content message-text';
        messageContent.innerHTML = msg.role === 'user' ? msg.content : this.formatMessage(msg.content);
        messageElement.appendChild(messageContent);

        this.messagesContainer.appendChild(messageElement);

        // MathJax 渲染
        if (window.MathJax && window.MathJax.typesetPromise && msg.role !== 'user') {
            window.MathJax.typesetPromise([messageContent]).catch(err => console.log('MathJax error:', err));
        }
    }

    /**
     * 清空消息区域并显示初始提示
     */
    clearMessages() {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = `
                <div class="message system-message">
                    <div class="message-content">请输入您的问题...</div>
                </div>
            `;
        }
    }

    /**
     * 更新聊天历史列表 UI
     * @param {Array} sortedHistory - 排序后的历史记录
     * @param {string} currentChatId - 当前聊天ID
     * @param {Function} onSelect - 选择回调
     */
    updateHistoryList(sortedHistory, currentChatId, onSelect) {
        const historyList = document.getElementById('chat-history-list');
        if (!historyList) return;

        historyList.innerHTML = '';

        sortedHistory.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'history-item';
            if (chat.id === currentChatId) {
                chatItem.classList.add('active');
            }

            chatItem.innerHTML = `
                <div class="history-title">${chat.title}</div>
                <div class="history-time">${window.historyManager.formatDate(chat.timestamp)}</div>
                <div class="history-select"><input type="checkbox" class="history-checkbox" data-id="${chat.id}"></div>
            `;

            chatItem.addEventListener('click', (e) => {
                if (e.target.classList.contains('history-checkbox')) return;
                onSelect(chat.id);
            });

            historyList.appendChild(chatItem);
        });
    }

    /**
     * 初始化 MathJax
     */
    initMathJax() {
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
}

// 导出单例
window.chatUI = new ChatUI();
