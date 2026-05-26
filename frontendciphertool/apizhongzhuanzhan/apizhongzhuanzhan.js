(function () {
    const state = {
        range: '7',
        granularity: 'day',
        metrics: {
            balance: 806.84,
            apiKeys: 1,
            requests: 375,
            spend: 232.5708,
            standardSpend: 49.1168,
            todayToken: 44.5,
            totalToken: 44.5,
            rpm: 2,
            tpm: 8.8,
            avgLatency: 25.37
        },
        models: [
            { name: 'gpt-5.5', requests: 375, token: '44.5M', cost: 232.5708, standard: 49.1168, share: 72 },
            { name: 'gpt-5-mini', requests: 82, token: '6.8M', cost: 21.3042, standard: 8.9711, share: 19 },
            { name: 'embedding-pro', requests: 41, token: '1.2M', cost: 2.6801, standard: 1.1034, share: 9 }
        ],
        usage: [
            { model: 'gpt-5.5', time: '2026/05/26 22:13:20', cost: 0.1583, token: '15,874 tokens' },
            { model: 'gpt-5.5', time: '2026/05/26 22:12:08', cost: 0.1362, token: '2,092 tokens' },
            { model: 'gpt-5.5', time: '2026/05/26 22:11:42', cost: 0.1167, token: '1,233 tokens' },
            { model: 'gpt-5-mini', time: '2026/05/26 22:10:19', cost: 0.0421, token: '824 tokens' }
        ],
        keys: [
            { name: 'main-router-key', mask: 'sk-pzm-****-9f21', status: 'Enabled', quota: '$600.00', used: '$232.57', lastUsed: '2026/05/26 22:13' },
            { name: 'test-sandbox-key', mask: 'sk-pzm-****-1a77', status: 'Paused', quota: '$50.00', used: '$0.00', lastUsed: '-' }
        ]
    };

    window.initApiZhongZhuanZhan = function initApiZhongZhuanZhan() {
        const root = document.getElementById('apizz-root');
        if (!root || root.dataset.ready === 'true') return;
        root.dataset.ready = 'true';
        render(root);
        bind(root);
    };

    function render(root) {
        root.innerHTML = `
            <section class="apizz-shell">
                <div class="apizz-header">
                    <div>
                        <div class="module-header">
                            <h2 class="neon-title" data-text="API ROUTER">API ROUTER</h2>
                        </div>
                        <div class="apizz-subtitle">API 中转站 / 密钥、余额、用量、模型分发与性能概览</div>
                    </div>
                    <div class="apizz-header-actions">
                        <span class="apizz-pill">CN ZH</span>
                        <span class="apizz-pill">在线通道 1</span>
                        <span class="apizz-pill">余额 $${state.metrics.balance.toFixed(2)}</span>
                    </div>
                </div>

                <div class="apizz-grid apizz-metric-grid">
                    ${metricCard('余额', `$${state.metrics.balance.toFixed(2)}`, '可用', 'BAL', 'green')}
                    ${metricCard('API 密钥', state.metrics.apiKeys, '1 启用', 'KEY', 'blue')}
                    ${metricCard('今日请求', state.metrics.requests, `总计: ${state.metrics.requests}`, 'REQ', '')}
                    ${metricCard('今日消费', `$${state.metrics.spend.toFixed(4)}`, `标准 $${state.metrics.standardSpend.toFixed(4)}`, 'USD', 'purple', 'purple')}
                    ${metricCard('今日 Token', `${state.metrics.todayToken}M`, '输入: 4.3M / 输出: 260.3K', 'TOK', 'orange')}
                    ${metricCard('累计 Token', `${state.metrics.totalToken}M`, '输入: 4.3M / 输出: 260.3K', 'SUM', 'blue')}
                    ${metricCard('性能指标', state.metrics.rpm, `${state.metrics.tpm}K TPM`, 'RPM', 'purple')}
                    ${metricCard('平均响应', `${state.metrics.avgLatency}s`, '平均时间', 'LAT', 'red')}
                </div>

                <div class="apizz-card apizz-toolbar">
                    <div class="apizz-filter-row">
                        <span class="apizz-muted">时间范围:</span>
                        <select id="apizz-range" class="apizz-select">
                            <option value="1">近 24 小时</option>
                            <option value="7" selected>近 7 天</option>
                            <option value="30">近 30 天</option>
                        </select>
                        <button id="apizz-refresh" class="apizz-ghost-btn" type="button">刷新</button>
                    </div>
                    <div class="apizz-filter-row">
                        <span class="apizz-muted">粒度:</span>
                        <select id="apizz-granularity" class="apizz-select">
                            <option value="hour">按小时</option>
                            <option value="day" selected>按天</option>
                            <option value="model">按模型</option>
                        </select>
                    </div>
                </div>

                <div class="apizz-grid apizz-main-grid">
                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">模型分布 <small>按请求与消费聚合</small></div>
                        <div class="apizz-donut-wrap">
                            <div class="apizz-donut" aria-hidden="true"></div>
                            <div class="apizz-table-wrap">
                                <table class="apizz-table">
                                    <thead><tr><th>模型</th><th>请求</th><th>Token</th><th>实际</th><th>标准</th></tr></thead>
                                    <tbody>${state.models.map(modelRow).join('')}</tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">Token 使用趋势 <small>Input / Output / Cache</small></div>
                        <div class="apizz-legend">
                            <span style="color:#3b82f6"><i class="apizz-dot"></i>Input</span>
                            <span style="color:#2eccbf"><i class="apizz-dot"></i>Output</span>
                            <span style="color:#ffd27b"><i class="apizz-dot"></i>Cache Creation</span>
                            <span style="color:#b388ff"><i class="apizz-dot"></i>Hit Rate</span>
                        </div>
                        <div class="apizz-chart">${chartSvg()}</div>
                    </section>
                </div>

                <div class="apizz-grid apizz-bottom-grid">
                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">最近使用 <small>近 ${state.range} 天</small></div>
                        <div class="apizz-usage-list">${state.usage.map(usageItem).join('')}</div>
                    </section>

                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">快捷操作</div>
                        <div class="apizz-action-list">
                            ${actionButton('KEY', '创建 API 密钥', '生成新的 API 密钥')}
                            ${actionButton('LOG', '查看使用记录', '查看详细的使用日志')}
                            ${actionButton('PAY', '兑换码', '使用兑换码充值')}
                            ${actionButton('CFG', '路由规则', '设置模型映射和限流策略')}
                        </div>
                    </section>
                </div>

                <div class="apizz-grid apizz-key-grid">
                    <section class="apizz-card apizz-panel">
                        <div class="apizz-panel-title">API 密钥 <small>前端占位，后续接入真实管理接口</small></div>
                        <div class="apizz-table-wrap">
                            <table class="apizz-table">
                                <thead><tr><th>名称</th><th>密钥</th><th>状态</th><th>额度</th><th>已用</th><th>最后使用</th></tr></thead>
                                <tbody>${state.keys.map(keyRow).join('')}</tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </section>
            <div id="apizz-toast" class="apizz-toast"></div>
        `;
    }

    function bind(root) {
        root.querySelector('#apizz-range')?.addEventListener('change', event => {
            state.range = event.target.value;
            render(root);
            bind(root);
            toast(root, `已切换到近 ${state.range === '1' ? '24 小时' : state.range + ' 天'}`);
        });

        root.querySelector('#apizz-granularity')?.addEventListener('change', event => {
            state.granularity = event.target.value;
            toast(root, `粒度已切换为 ${event.target.selectedOptions[0].textContent}`);
        });

        root.querySelector('#apizz-refresh')?.addEventListener('click', () => {
            state.metrics.requests += Math.floor(Math.random() * 9) + 1;
            state.metrics.spend += Math.random() * 0.8;
            render(root);
            bind(root);
            toast(root, '仪表盘数据已刷新');
        });

        root.querySelectorAll('.apizz-action').forEach(button => {
            button.addEventListener('click', () => toast(root, `${button.dataset.action} 功能入口已就绪`));
        });
    }

    function metricCard(label, value, meta, icon, color = '', valueColor = '') {
        return `
            <article class="apizz-card apizz-metric">
                <div class="apizz-icon ${color}">${icon}</div>
                <div>
                    <div class="apizz-label">${label}</div>
                    <div class="apizz-value ${valueColor}">${value}</div>
                    <div class="apizz-meta">${meta}</div>
                </div>
            </article>
        `;
    }

    function modelRow(item) {
        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.requests}</td>
                <td>${item.token}</td>
                <td class="apizz-positive">$${item.cost.toFixed(4)}</td>
                <td class="apizz-muted">$${item.standard.toFixed(4)}</td>
            </tr>
        `;
    }

    function usageItem(item) {
        return `
            <div class="apizz-usage-item">
                <div class="apizz-icon">${item.model.slice(0, 3).toUpperCase()}</div>
                <div>
                    <div class="apizz-usage-name">${item.model}</div>
                    <div class="apizz-usage-time">${item.time}</div>
                </div>
                <div class="apizz-cost">$${item.cost.toFixed(4)}<div class="apizz-usage-token">${item.token}</div></div>
            </div>
        `;
    }

    function actionButton(icon, title, desc) {
        return `
            <button class="apizz-action" type="button" data-action="${title}">
                <span class="apizz-icon">${icon}</span>
                <span><span class="apizz-action-title">${title}</span><span class="apizz-action-desc">${desc}</span></span>
                <span class="apizz-muted">&gt;</span>
            </button>
        `;
    }

    function keyRow(item) {
        const status = item.status === 'Enabled' ? '启用' : '暂停';
        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.mask}</td>
                <td><span class="apizz-key-status">${status}</span></td>
                <td>${item.quota}</td>
                <td class="apizz-positive">${item.used}</td>
                <td class="apizz-muted">${item.lastUsed}</td>
            </tr>
        `;
    }

    function chartSvg() {
        const values = state.range === '1'
            ? [9, 14, 22, 18, 31, 29, 38]
            : state.range === '30'
                ? [18, 24, 16, 35, 42, 31, 48]
                : [12, 20, 28, 24, 36, 30, 44];
        const width = 620;
        const height = 220;
        const left = 44;
        const top = 16;
        const chartW = width - left - 20;
        const chartH = height - top - 32;
        const max = 50;
        const points = values.map((value, index) => {
            const x = left + (chartW / (values.length - 1)) * index;
            const y = top + chartH - (value / max) * chartH;
            return [x, y];
        });
        const line = points.map((point, index) => `${index ? 'L' : 'M'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ');
        const area = `${line} L${left + chartW},${top + chartH} L${left},${top + chartH} Z`;
        const grid = [0, 10, 20, 30, 40, 50].map(value => {
            const y = top + chartH - (value / max) * chartH;
            return `<line x1="${left}" y1="${y}" x2="${left + chartW}" y2="${y}" stroke="rgba(203,213,225,.12)"/><text x="4" y="${y + 4}" fill="rgba(203,213,225,.55)" font-size="10">${value}M</text>`;
        }).join('');
        const bars = values.map((value, index) => {
            const x = left + (chartW / values.length) * index + 10;
            const barH = (value / max) * chartH;
            return `<rect x="${x}" y="${top + chartH - barH}" width="16" height="${barH}" rx="5" fill="rgba(46,204,191,.46)"/>`;
        }).join('');
        const dots = points.map(point => `<circle cx="${point[0]}" cy="${point[1]}" r="4" fill="#3b82f6" stroke="#dbeafe" stroke-width="2"/>`).join('');

        return `
            <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Token 使用趋势">
                <defs>
                    <linearGradient id="apizz-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="#3b82f6" stop-opacity=".34"/>
                        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                ${grid}
                ${bars}
                <path d="${area}" fill="url(#apizz-area)"/>
                <path d="${line}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                ${dots}
                <text x="${left}" y="${height - 6}" fill="rgba(203,213,225,.55)" font-size="10">2026-05-20</text>
                <text x="${left + chartW - 58}" y="${height - 6}" fill="rgba(203,213,225,.55)" font-size="10">2026-05-26</text>
            </svg>
        `;
    }

    function toast(root, text) {
        const el = root.querySelector('#apizz-toast');
        if (!el) return;
        el.textContent = text;
        el.classList.add('show');
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => el.classList.remove('show'), 1600);
    }
})();
