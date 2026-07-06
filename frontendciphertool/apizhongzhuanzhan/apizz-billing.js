(function () {
    const api = window.ApiZhongZhuanZhan;
    if (!api || typeof api.registerPage !== 'function') return;

    api.registerPage({
        id: 'billing',
        title: '邀请返利',
        render(ctx) {
            const state = ctx.state;
            const h = ctx.helpers;
            const invite = normalizeInvite(state.invite, h);
            const pendingRewards = h.numberValue(invite.pendingRewards);
            const creditedRewards = h.numberValue(invite.creditedRewards);
            const totalRewards = pendingRewards + creditedRewards;
            const inviteLink = buildInviteLink(invite.code);
            const inviteRows = invite.invitees.length
                ? invite.invitees.slice(0, 12).map(item => inviteeRow(item, h)).join('')
                : '<tr><td colspan="5" class="apizz-muted">暂无真实邀请用户。</td></tr>';
            const ledgerList = inviteLedgerList(state.ledger, h);
            const applyValue = h.escapeHtml(initialInviteCode());
            const inviteLoadNotice = invite.loadError
                ? `<div class="apizz-empty-state">邀请返利后端加载失败：${h.escapeHtml(invite.loadError)}</div>`
                : '';

            return `
                <section id="apizz-page-billing" class="apizz-page apizz-billing-page">
                    <div class="apizz-grid apizz-metric-grid apizz-billing-metric-grid">
                        ${h.metricCard('待入账返利', `${pendingRewards.toFixed(2)} 元`, '来自后端邀请记录', 'REB', 'green', 'green')}
                        ${h.metricCard('累计邀请返利', `${totalRewards.toFixed(2)} 元`, '待入账 + 已入账', 'SUM', 'green')}
                        ${h.metricCard('累计邀请人数', invite.invitedUsers, `已入账人数：${rewardedInviteCount(invite.invitees)}`, 'USR', 'blue')}
                        ${h.metricCard('已入账返利', `${creditedRewards.toFixed(2)} 美元`, '已写入钱包账务流水', 'USD', 'orange')}
                    </div>

                    ${inviteLoadNotice}

                    <section class="apizz-card apizz-panel apizz-billing-invite-panel">
                        <div class="apizz-orders-head">
                            <div>
                                <div class="apizz-panel-title">邀请好友</div>
                                <p class="apizz-muted">好友绑定你的邀请码后，首次真实充值或卡密兑换会按后台配置结算邀请返利。</p>
                            </div>
                            <div class="apizz-plan-badge">我的邀请码：${h.escapeHtml(invite.code || '未生成')}</div>
                        </div>

                        <div class="apizz-billing-share-grid">
                            <div class="apizz-table-wrap apizz-invite-share-box">
                                <div class="apizz-label">邀请码</div>
                                <div class="apizz-choice-value apizz-invite-code">${h.escapeHtml(invite.code || '-')}</div>
                                <button class="apizz-ghost-btn" type="button" data-apizz-copy="code">复制邀请码</button>
                            </div>

                            <div class="apizz-table-wrap apizz-invite-share-box">
                                <div class="apizz-label">邀请链接</div>
                                <div class="apizz-invite-link">${h.escapeHtml(inviteLink || '邀请码生成后可复制邀请链接')}</div>
                                <div class="apizz-billing-action-row">
                                    <button class="apizz-ghost-btn" type="button" data-apizz-copy="link">复制邀请链接</button>
                                    <button class="apizz-ghost-btn" type="button" data-apizz-invite-action="refresh">刷新数据</button>
                                </div>
                            </div>
                        </div>

                        <div class="apizz-status-summary apizz-billing-rule-grid">
                            <div class="apizz-status-tile">
                                <div class="apizz-label">返利规则</div>
                                <div class="apizz-status-value">后台配置</div>
                                <div class="apizz-muted">前端不写死金额或比例</div>
                            </div>
                            <div class="apizz-status-tile">
                                <div class="apizz-label">到账方式</div>
                                <div class="apizz-status-value">自动入账</div>
                                <div class="apizz-muted">后端结算后写入钱包流水</div>
                            </div>
                            <div class="apizz-status-tile">
                                <div class="apizz-label">代理身份</div>
                                <div class="apizz-status-value">普通邀请用户</div>
                                <div class="apizz-muted">${invite.referredBy ? `由 ${h.escapeHtml(invite.referredBy)} 邀请` : '未绑定上级邀请人'}</div>
                            </div>
                        </div>

                        <div class="apizz-billing-apply-box">
                            <div>
                                <div class="apizz-label">绑定上级邀请码</div>
                                <div class="apizz-muted">${invite.referredBy ? `当前已绑定：${h.escapeHtml(invite.referredBy)}` : '被邀请注册的账号可以在这里绑定真实邀请码。'}</div>
                            </div>
                            <div class="apizz-billing-apply-row">
                                <input id="apizz-invite-apply-code" class="apizz-form-input" type="text" value="${applyValue}" placeholder="输入邀请码">
                                <button class="apizz-ghost-btn" type="button" data-apizz-invite-action="apply">绑定</button>
                            </div>
                        </div>
                    </section>

                    <div class="apizz-grid apizz-bottom-grid apizz-billing-bottom-grid">
                        <section class="apizz-card apizz-panel apizz-billing-table-panel">
                            <div class="apizz-panel-title">邀请用户明细 <small>${invite.invitees.length} users</small></div>
                            <div class="apizz-table-wrap apizz-orders-table-wrap">
                                <table class="apizz-table">
                                    <thead><tr><th>用户</th><th>返利金额</th><th>状态</th><th>创建时间</th><th>入账时间</th></tr></thead>
                                    <tbody>${inviteRows}</tbody>
                                </table>
                            </div>
                        </section>

                        <section class="apizz-card apizz-panel apizz-billing-table-panel">
                            <div class="apizz-panel-title">最近返利流水 <small>ledger</small></div>
                            <div class="apizz-ledger-list">${ledgerList}</div>
                        </section>
                    </div>
                </section>
            `;
        },
        bind(ctx) {
            bindInvitePage(ctx);
        }
    });

    function bindInvitePage(ctx) {
        const root = ctx.root;
        root.querySelectorAll('[data-apizz-copy]').forEach(button => {
            button.addEventListener('click', async () => {
                const invite = normalizeInvite(ctx.state.invite, ctx.helpers);
                const value = button.dataset.apizzCopy === 'link'
                    ? buildInviteLink(invite.code)
                    : invite.code;
                await copyText(root, ctx, value, button.dataset.apizzCopy === 'link' ? '邀请链接' : '邀请码');
            });
        });

        root.querySelector('[data-apizz-invite-action="refresh"]')?.addEventListener('click', () => {
            ctx.actions.loadDashboard({ message: '邀请返利数据已刷新' });
        });

        root.querySelector('[data-apizz-invite-action="apply"]')?.addEventListener('click', async buttonEvent => {
            const button = buttonEvent.currentTarget;
            const input = root.querySelector('#apizz-invite-apply-code');
            const code = input ? input.value.trim() : '';
            if (!code) {
                ctx.actions.toast('请输入邀请码');
                input?.focus();
                return;
            }
            if (button.disabled) return;
            button.disabled = true;
            try {
                await ctx.actions.postDashboard('invites/apply', { code });
                await ctx.actions.loadDashboard({ message: '邀请码已绑定，邀请关系已更新' });
            } catch (error) {
                ctx.actions.toast(error.message || '邀请码绑定失败');
            } finally {
                button.disabled = false;
            }
        });
    }

    async function copyText(root, ctx, value, label) {
        if (!value) {
            ctx.actions.toast(`${label}尚未生成`);
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            ctx.actions.toast(`已复制${label}`);
        } catch (error) {
            const scratch = document.createElement('textarea');
            scratch.value = value;
            scratch.setAttribute('readonly', '');
            scratch.style.position = 'fixed';
            scratch.style.opacity = '0';
            root.appendChild(scratch);
            scratch.select();
            document.execCommand('copy');
            scratch.remove();
            ctx.actions.toast(`已复制${label}`);
        }
    }

    function normalizeInvite(invite, h) {
        const source = invite || {};
        return {
            code: String(source.code || ''),
            invitedUsers: h.numberValue(source.invitedUsers),
            pendingRewards: h.numberValue(source.pendingRewards),
            creditedRewards: h.numberValue(source.creditedRewards),
            referredBy: String(source.referredBy || ''),
            invitees: Array.isArray(source.invitees) ? source.invitees : [],
            loadError: String(source.loadError || '')
        };
    }

    function buildInviteLink(code) {
        if (!code) return '';
        const url = new URL(window.location.href);
        url.searchParams.set('ref', code);
        url.hash = 'apizhongzhuanzhan';
        return url.toString();
    }

    function initialInviteCode() {
        try {
            return new URLSearchParams(window.location.search).get('ref') || '';
        } catch (error) {
            return '';
        }
    }

    function rewardedInviteCount(invitees) {
        return (Array.isArray(invitees) ? invitees : [])
            .filter(item => String(item.status || '').toUpperCase() === 'REWARDED')
            .length;
    }

    function inviteeRow(item, h) {
        const status = String(item.status || '').toUpperCase();
        const amount = h.numberValue(item.rewardAmount);
        return `
            <tr>
                <td>${h.escapeHtml(item.email || '-')}</td>
                <td class="apizz-positive">${amount.toFixed(4)}</td>
                <td><span class="apizz-status-pill ${status === 'REWARDED' ? 'healthy' : 'degraded'}">${h.escapeHtml(inviteStatusText(status))}</span></td>
                <td class="apizz-muted">${h.escapeHtml(item.createdAt || '-')}</td>
                <td class="apizz-muted">${h.escapeHtml(item.rewardedAt || '-')}</td>
            </tr>
        `;
    }

    function inviteStatusText(status) {
        if (status === 'REWARDED') return '已入账';
        if (status === 'PENDING') return '待入账';
        return status || '待结算';
    }

    function inviteLedgerList(ledger, h) {
        const rows = (Array.isArray(ledger) ? ledger : [])
            .filter(item => {
                const type = String(item.type || '').toUpperCase();
                const description = String(item.description || '').toLowerCase();
                return type.includes('INVITE') || description.includes('invite reward') || description.includes('邀请');
            })
            .slice(0, 8);

        if (!rows.length) {
            return '<div class="apizz-empty-state">暂无返利流水</div>';
        }

        return rows.map(item => {
            const amount = h.numberValue(item.amount);
            return `
                <div class="apizz-ledger-item">
                    <div>
                        <div class="apizz-ledger-type">${h.escapeHtml(item.type || 'INVITE_REWARD')}</div>
                        <div class="apizz-muted">${h.escapeHtml(item.description || '邀请返利')}</div>
                        <div class="apizz-muted">${h.escapeHtml(item.createdAt || '-')}</div>
                    </div>
                    <div class="apizz-ledger-amount ${amount >= 0 ? 'positive' : 'negative'}">$${amount.toFixed(4)}</div>
                </div>
            `;
        }).join('');
    }
})();
