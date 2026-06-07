(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    api.registerPage({
        id: 'overview',
        title: '仪表盘',
        render(ctx) {
            const state = ctx.state;
            const h = ctx.helpers;
            const enabledKeys = state.keys.filter(item => item.status === 'Enabled').length;
            const inputToken = h.numberValue(state.metrics.inputToken);
            const outputToken = h.numberValue(state.metrics.outputToken);
            const cacheHitRate = h.numberValue(state.metrics.cacheHitRate || state.metrics.hitRate || 0);
            const recentUsage = Array.isArray(state.usage) ? state.usage.slice(0, 6) : [];
            const modelRows = Array.isArray(state.models) && state.models.length
                ? state.models.slice(0, 6).map(h.modelRow).join('')
                : '<tr><td colspan="5" class="apizz-muted">暂无模型调用数据。</td></tr>';

            return `
                <section id="apizz-page-overview" class="apizz-page apizz-dashboard-page">
                    <section class="apizz-dashboard-command">
                        <div class="apizz-dashboard-action-row">
                            ${h.workflowButton('KEY', '创建 API Key', `${enabledKeys} / ${state.metrics.apiKeys} 启用`, 'goto-keys')}
                            ${h.workflowButton('PAY', '兑换码', '余额活动码', 'redeem-code')}
                        </div>
                    </section>

                    <div class="apizz-grid apizz-metric-grid apizz-metric-grid-compact apizz-dashboard-metrics">
                        ${h.metricCard('可用余额', `$${h.numberValue(state.metrics.balance).toFixed(2)}`, '钱包', 'BAL', 'green')}
                        ${h.metricCard('API Keys', state.metrics.apiKeys, `${enabledKeys} 启用`, 'KEY', 'blue')}
                        ${h.metricCard('请求量', state.metrics.requests, `近 ${h.escapeHtml(state.range)} 天`, 'REQ', '')}
                        ${h.metricCard('今日消费', `$${h.numberValue(state.metrics.spend).toFixed(4)}`, `总消费 $${h.numberValue(state.metrics.standardSpend).toFixed(4)}`, 'USD', 'purple', 'purple')}
                        ${h.metricCard('Token', `${h.numberValue(state.metrics.todayToken).toFixed(1)}M`, `输入 ${inputToken.toFixed(1)}M / 输出 ${outputToken.toFixed(4)}M`, 'TOK', 'orange')}
                        ${h.metricCard('吞吐', `${state.metrics.rpm} RPM`, `${h.numberValue(state.metrics.tpm).toFixed(1)}K TPM`, 'TPS', 'blue')}
                        ${h.metricCard('累计 Token', `${h.numberValue(state.metrics.totalToken || state.metrics.todayToken).toFixed(1)}M`, `输入: ${inputToken.toFixed(1)}M / 输出: ${(outputToken * 1000).toFixed(1)}K`, 'TOK', 'blue')}
                        ${h.metricCard('平均响应', `${h.numberValue(state.metrics.avgLatency).toFixed(2)}s`, '平均时间', 'LAT', 'red')}
                        ${h.metricCard('缓存命中率', `${cacheHitRate.toFixed(1)}%`, `累计: ${cacheHitRate.toFixed(1)}%`, 'CH', 'blue')}
                    </div>

                    <section class="apizz-card apizz-dashboard-filter-bar">
                        <div class="apizz-filter-row">
                            <span class="apizz-muted">时间范围:</span>
                            <select id="apizz-range" class="apizz-select">
                                <option value="1" ${h.selected('1', state.range)}>近 24 小时</option>
                                <option value="7" ${h.selected('7', state.range)}>近 7 天</option>
                                <option value="30" ${h.selected('30', state.range)}>近 30 天</option>
                            </select>
                        </div>
                        <div class="apizz-filter-row apizz-dashboard-granularity-row">
                            <span class="apizz-muted">粒度:</span>
                            <select id="apizz-granularity" class="apizz-select">
                                <option value="hour" ${h.selected('hour', state.granularity)}>按小时</option>
                                <option value="day" ${h.selected('day', state.granularity)}>按天</option>
                                <option value="model" ${h.selected('model', state.granularity)}>按模型</option>
                            </select>
                        </div>
                        <button id="apizz-refresh" class="apizz-ghost-btn apizz-dashboard-refresh" type="button">刷新</button>
                    </section>

                    <div class="apizz-dashboard-analytics">
                        <section class="apizz-card apizz-panel apizz-dashboard-analytics-card">
                            <div class="apizz-panel-title">模型分布 <small>Requests / Spend</small></div>
                            <div class="apizz-donut-wrap apizz-donut-wrap-compact apizz-dashboard-donut-wrap">
                                <div class="apizz-donut" aria-hidden="true" style="${h.donutGradient()}"></div>
                                <div class="apizz-table-wrap">
                                    <table class="apizz-table">
                                        <thead><tr><th>模型</th><th>请求</th><th>Token</th><th>实际</th><th>标准</th></tr></thead>
                                        <tbody>${modelRows}</tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section class="apizz-card apizz-panel apizz-dashboard-analytics-card">
                            <div class="apizz-panel-title">Token 使用趋势 <small>Token</small></div>
                            <div class="apizz-legend apizz-dashboard-legend">
                                <span style="color:#3b82f6"><i class="apizz-dot"></i>Input</span>
                                <span style="color:#2eccbf"><i class="apizz-dot"></i>Output</span>
                                <span style="color:#ffd27b"><i class="apizz-dot"></i>Cache Creation</span>
                                <span style="color:#b388ff"><i class="apizz-dot"></i>Hit Rate</span>
                            </div>
                            <div class="apizz-chart apizz-dashboard-chart">${h.chartSvg()}</div>
                        </section>
                    </div>

                    <section class="apizz-card apizz-panel apizz-dashboard-recent">
                        <div class="apizz-panel-title">最近调用 <small>${recentUsage.length} records</small></div>
                        <div class="apizz-usage-list">${recentUsage.length ? recentUsage.map(h.usageItem).join('') : h.emptyUsageList()}</div>
                    </section>
                </section>
            `;
        }
    });
})();
