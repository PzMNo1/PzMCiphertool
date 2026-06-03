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

            return `
                <section id="apizz-page-keys" class="apizz-page">
                    <section class="apizz-card apizz-command-bar apizz-keys-command">
                        <div class="apizz-command-actions apizz-keys-actions">
                            ${h.workflowButton('KEY', '创建 API Key', `${enabledKeys} / ${state.metrics.apiKeys} 启用`, 'create-key')}
                        </div>
                    </section>

                    ${h.createdKeyNotice()}

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
        }
    });
})();