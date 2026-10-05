/**
 * AgentIntentContract —— 极简意图。
 *
 * 原则：不再做死关键词识别。
 * 语义路由、工具选择、写作风格全部交给模型自主判定。
 * 这里只保留确定性的开关信号：用户是否开了工具、是否带了附件。
 */
(function () {
    class AgentIntentContractBuilder {
        constructor(runtime) {
            this.runtime = runtime;
        }

        build(userMessage, options = {}) {
            const rawMessage = String(userMessage || '');
            const hasAttachments = Boolean(options.hasAttachments);
            const toolEnabled = Boolean(options.toolEnabled);
            const wantsTools = toolEnabled || hasAttachments;
            return {
                rawMessage,
                text: rawMessage.toLowerCase(),
                mode: wantsTools ? 'agent' : 'chat',
                hasAttachments,
                toolEnabled,
                wantsTools,
                writingContract: null
            };
        }
    }

    window.AgentIntentContractBuilder = AgentIntentContractBuilder;
})();
