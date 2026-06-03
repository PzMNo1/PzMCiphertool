(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    api.registerPage({
        id: 'ops',
        title: '实时状态',
        render(ctx) {
            const h = ctx.helpers;

            return `
                <section id="apizz-page-ops" class="apizz-page">
                    <section class="apizz-card apizz-command-bar">
                        <div>
                            <div class="apizz-panel-title">实时状态</div>
                        </div>
                        <div class="apizz-command-actions">
                            ${h.workflowButton('PAY', '兑换码', '余额活动码', 'redeem-code')}
                        </div>
                    </section>
                </section>
            `;
        }
    });
})();
