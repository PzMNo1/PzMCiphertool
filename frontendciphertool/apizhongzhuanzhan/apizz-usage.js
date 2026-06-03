(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    api.registerPage({
        id: 'usage',
        title: '充值/订阅',
        render(ctx) {
            return `
                <section id="apizz-page-usage" class="apizz-page apizz-subscribe-page"></section>
            `;
        }
    });
})();
