(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    api.registerPage({
        id: 'keys',
        title: 'API Keys',
        render(ctx) {
            const state = ctx.state;
            const h = ctx.helpers;
            const enabledKeys = state.keys.filter(item => item.status === 'Enabled').length;
            const baseUrl = h.routerBaseUrl();
            const servedModels = Array.isArray(state.servedModels) && state.servedModels.length
                ? state.servedModels
                : [];
            const modelList = servedModels.length
                ? servedModels.slice(0, 8).join(', ')
                : '暂无可服务模型，请先配置启用渠道和价格规则';

            return `
                <section id="apizz-page-keys" class="apizz-page">
                    <section class="apizz-card apizz-command-bar apizz-keys-command">
                        <div class="apizz-command-actions apizz-keys-actions">
                            ${h.workflowButton('KEY', '创建 API Key', `${enabledKeys} / ${state.metrics.apiKeys} 启用`, 'create-key')}
                        </div>
                    </section>

                    ${h.createdKeyNotice()}

                    <section class="apizz-card apizz-panel apizz-panel-span apizz-access-panel">
                        <div class="apizz-panel-title">接入信息 <small>OpenAI compatible</small></div>
                        <div class="apizz-access-grid">
                            <div class="apizz-access-field">
                                <span class="apizz-form-label">Base URL</span>
                                <div class="apizz-access-copy-row">
                                    <code>${h.escapeHtml(baseUrl)}</code>
                                    <button class="apizz-key-action" type="button" data-apizz-copy-value="${h.escapeHtml(baseUrl)}">复制</button>
                                </div>
                            </div>
                            <div class="apizz-access-field">
                                <span class="apizz-form-label">Authorization</span>
                                <div class="apizz-access-copy-row">
                                    <code>Bearer sk-...</code>
                                    <span class="apizz-muted">使用本页创建的 API Key</span>
                                </div>
                            </div>
                            <div class="apizz-access-field apizz-access-wide">
                                <span class="apizz-form-label">模型</span>
                                <div class="apizz-muted ${servedModels.length ? '' : 'apizz-access-warning'}">${h.escapeHtml(modelList)}</div>
                            </div>
                            <div class="apizz-access-field apizz-access-wide">
                                <span class="apizz-form-label">端点</span>
                                <div class="apizz-muted">GET /models, POST /responses, POST /chat/completions, POST /completions, POST /embeddings</div>
                            </div>
                        </div>
                    </section>

                    <section class="apizz-card apizz-panel apizz-panel-span apizz-keys-panel">
                        <div class="apizz-panel-title">密钥列表</div>
                        <div class="apizz-table-wrap apizz-key-table-wrap">
                            <table class="apizz-table">
                                <thead><tr><th>名称</th><th>密钥</th><th>状态</th><th>额度</th><th>已用</th><th>RPM</th><th>TPM</th><th>最后使用</th><th>操作</th></tr></thead>
                                <tbody>${state.keys.length ? state.keys.map(h.keyRow).join('') : h.emptyKeyRow()}</tbody>
                            </table>
                        </div>
                    </section>
                </section>
            `;
        },
        bind(ctx) {
            ctx.root.querySelectorAll('[data-apizz-copy-value]').forEach(button => {
                button.addEventListener('click', async () => {
                    const value = button.dataset.apizzCopyValue || '';
                    try {
                        await navigator.clipboard.writeText(value);
                        ctx.actions.toast('接入地址已复制');
                    } catch (error) {
                        ctx.actions.toast('复制失败，请手动选择地址');
                    }
                });
            });
        }
    });
})();
