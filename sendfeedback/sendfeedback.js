function initSendFeedback() {
    // 渲染技术答疑
    const interviewContainer = document.querySelector('#zuozhecaifang .container');
    if (interviewContainer) {
        initAuthorInterview(interviewContainer);
    }

    // 渲染意见反馈
    const feedbackContainer = document.querySelector('#yijianfankui .container');
    if (feedbackContainer) {
        initFeedbackBoard(feedbackContainer);
    }
}

const AUTHOR_INTERVIEW_ITEMS = [
    {
        question: '开发这个应用的团队有多少人',
        answer: '目前只有作者一个人，你们看到的PzM，泡面的面，还有版权里的LiangJunHao，都是作者。 当然，我们期待大家能加入我们开发团队，为人类的未来助一份力。'
    },
    {
        question: '有人说，猪肉价格低迷是因为失业率暴增',
        answer: '就业与街边餐饮的肉类毛利一般是处于双向循环，不过具体得看饮食结构变迁。这种情况一般是压大收储力度和降产能。'
    },
    {
        question: '昨天看了一个社会学分析，性解放会导致社会的崩溃，原因是整个社会都逐渐沉迷于多巴胺的获取之后，越来越少的人愿意专注于社会发展',
        answer: '对，社会发展动力与性冲动限制程度是成正比。主要是行为成本对多巴胺的延迟满足比例。打造长远目标共识是制度设计的一种'
    },
    {
        question: '日本的30年我觉得是整个社会结构的问题，地理、文化、政治，还有财政内斗骚操作引起的',
        answer: '差不多，不过那时候呈现的是性剥离的社会结构。主要还是财政的权重从增长走向平债，且破产重组因文化耻辱导致新型行业缺资金流动。洁癖是根源'
    },
    {
        question: 'QQ有元宝总结了，但微信没有',
        answer: '还不支持，微信单条消息承载量比QQ小，响应窗口期短。不过接入了clawbot说明有基础链路，关键是动态鉴权。可以先调好针对位置分块的传输逻辑'
    },
    {
        question: '民机会有新能源飞机吗',
        answer: '油和锂电的能量密度会关系到载重与航程，而且机场要从0构建全新的家注站和管网。不过目前有SAF混用，融入氢电是长期难题'
    },
    {
        question: '这几天说山东山西河南要协同京津冀共同发展',
        answer: '官方文件的重点是构建现代化都市圈和做强六链五群。主要还是基于黄河流域，京津冀承载瓶颈和绿电需求。好处是科创成果能向外辐射'
    },
    {
        question: 'Polymarket最近遭遇了带有"黑色幽默"的金融诈骗。一男子两次押注巴黎最高温达到22C，两次都中了，获利3.69万美元。他的做法很简单，用便携式吹风机加热戴高乐机场的气候传感器。巴黎气象局已报警。',
        answer: '主要还是内生性问题带来的roi失衡，可以聚合多源数据，环节引入常识审核机制就行。但上升到悖论以外的人类共同体事件，只能前期做干预'
    },
    {
        question: '翁家翌在采访中推测我们都生活在一个确定性的马尔科夫过程里面',
        answer: '可以再完善推测，大爆炸后每一个推理分子都是对内生性问题做押注，包括你人生某个节点是success还是loser。这种情况可以通过自身行径推动roi失衡，也可以用无形token提前自推去改变有形token。'
    },
    {
        question: '有人使用nssm或者pm2管理openclaw吗，nssm在win平台好像有bug，我一直没接通，主要提示我令牌上有异常问题。',
        answer: 'nssm是更原生的支持，pm2可能对资源占用和重启策略友好一些'
    },
    {
        question: '有哪个本地部署的模型可以联网的吗？',
        answer: '本地模型要联网需要开插件，或者用 Ollama 搭配浏览器扩展之类的工具'
    },
    {
        question: '为了让Openclaw不报错，弄了好几个小时,更新两分钟，修复仨小时。',
        answer: '这种情况可以先看下具体报错信息 有时候工具或者环境版本没对齐也会导致这种问题'
    },
    {
        question: '配置百炼的api这边应该选择那个呢',
        answer: '百炼大模型调用选模型API endpoint就行 key填在请求头里'
    },
    {
        question: '谁有遇到过 openclaw 接入企业微信机器人的时候，报错服务器返回有误？我看网络上腾讯云配置还是蛮简单的，但是到了我就直接服务器返回有误。',
        answer: '文档往往滞后于控制台 先抓具体报错码 重点排查权限策略和安全组'
    },
    {
        question: '龙虾的架构里本来就会自己写入memory文件,用户只需要自己装ollama什么的就行。我是本地部署了qwen 4B。',
        answer: '本地部署确实能减轻服务端压力 但普通用户配环境和网络镜像算是个大门槛。'
    },
    {
        question: 'minimax2.5月卡36.6块，够用。',
        answer: '早期推广确实香 不过得留意并发限制 跑长任务最好加个重试机制'
    },
    {
        question: '我是三天两头救小龙虾，天天把自己搞死了，救援网关搞了，他自己搞出一堆问题，把自己搞死了，最后检查是救援网关和主会话用同一个纸飞机。',
        answer: '纸飞机会话复用风险大 主备不隔离 救援网关也就形同虚设了'
    },
    {
        question: 'mac电脑上使用openclaw 为什么给不了node屏幕录制权限?',
        answer: 'mac权限是跟着父进程走的 把终端app加进屏幕录制列表 重启终端试试'
    },
    {
        question: '怎么给Openclaw增加图片识别和视频识别能力',
        answer: 'Openclaw.json文件，模型里面的input加个image'
    },
    {
        question: '虽然说我发图片Openclaw能收到，但是他看不到上面的内容，它可以正常给我发图片，发文件。说明通道是通的，但是它收到图片，他看不见。',
        answer: '大概率是配置项 权限问题报错会更直接 对照日志看下关键错误码更稳妥。'
    },
    {
        question: '之前一直使用的是qq邮箱登录的谷歌，注册不了国外的几个最快的LLM。前阵子更新成了gmail邮箱，然后体验了国外最快的LLM。那速度，火箭啊，日常聊天问答，太猛了。',
        answer: '确实gmail权限更广 不过推理速度主要还是看网络链路和服务端'
    },
    {
        question: '阿里的好像得那个万相模型才能生图',
        answer: '万相是主力 不过跑 Agent 工作流的话 接口稳定性还得实测 通义千问的多模态也能兜底。'
    },
    {
        question: '你们的Agent都接入向量库了吗',
        answer: '基本都接了 不然做不了知识库检索 不过向量选型得看场景 噪声太多反而影响推理'
    },
    {
        question: '怎么我的Openclaw飞书QQ都接不上',
        answer: '先别急着重试 容易触发风控 看看日志里是鉴权挂了还是链路超时'
    },
    {
        question: '调api好像都要额外充钱',
        answer: '确实得考虑成本 大部分都有免费额度先调试 量大了再考虑本地部署或者量化'
    },
    {
        question: '有人需要和openclaw并发聊天吗,就像和gpt一样，可以开新对话，旧对话保留。',
        answer: '得看它底层怎么维护会话状态，新建对话一般就是上下文重置。'
    },
    {
        question: '这么写为什么一直400不通',
        answer: '400 大多是请求构造问题 重点检查下参数格式和content-type'
    },
    {
        question: '多agent，他们互相可以商量解决问题，但是我还没找到如何给每个agent设置一个qqbot，所以现在只能用一个主agent来做总调度。',
        answer: '每个 agent 挂一个 bot 实例可行 但要注意设备指纹隔离和消息路由分发 不然风控容易把号封了'
    },
    {
        question: 'Claude Code 会采集硬件 UUID、设备安装 ID 和出口 IP 并上报——一旦封号，换账号也无效，因为设备不变。cac 在 wrapper 层拦截所有 Claude 调用，注入独立设备指纹，并强制走独立代理',
        answer: 'wrapper 层做隔离确实能避开关联 不过服务端风控不光看硬件信息 TLS 指纹和流量特征也得对齐 不然容易误伤。'
    },
    {
        question: '我用deepseek 1500万token 才五块钱，这2500万token 合不到十块钱',
        answer: '单价是挺香 不过实际跑 agent 得算上重试损耗 稳定有时候比单价更重要。'
    },
    {
        question: '我网页能打开chatgpt，也能用网页版的gpt对话，能否将这个网页版的chatgpt加进openclaw呢?理论上可以用反代，但是可能会被封号，不合规。',
        answer: '合规是底线，现在风控不止看IP，反代指纹和请求链路特征太明显很容易被封。'
    },
    {
        question: '你买订阅，api该花钱还是花钱，两套系统。',
        answer: '底层多是按 token 计量 对话次数只是封装 不同模型成本差异挺大'
    },
    {
        question: '做了个内容生成与分发自动化系统，但是太鸡肋，没有实质性内容，demo都不算，就是个壳子',
        answer: '嗯，有些项目只做了编排层，真正的决策逻辑还得自己往里填'
    },
    {
        question: '用openclaw算9999999999999x88888888888，像忽悠，还不如直接问豆包',
        answer: '单纯对话确实豆包更爽 但咱们搞Agent是为了把业务逻辑和数据握在自己手里 可控性不一样'
    },
    {
        question: '为啥我测的Gemini 3 flash 比minimax 2.7强多了，至少在写页面上好很多，不是说minimax评分高吗',
        answer: '通用榜单侧重逻辑推理 写页面对布局理解要求不一样 垂直场景下实测比评分更有参考性'
    },
    {
        question: '你们用来写软件可以拆成小目标让模型搞，但写刊文 诗歌就真的拆不了。',
        answer: '思路没错，不过上下文连贯性和结果校验才是落地难点'
    },
    {
        question: '之前装的旧版本就可以，昨天装了新版本就不行了',
        answer: '升级后失效通常是配置结构变动或依赖冲突 先抓下日志看看具体报错'
    },
    {
        question: '有很多人说openclaw底层是一坨屎 为什么',
        answer: '早期为了快速落地功能做了太多妥协 技术债累积多了架构就显得臃肿'
    },
    {
        question: '这样子，那现在目前上这么多claw 有没有公认相对好用的一个产品',
        answer: '行业共识是沙箱隔离 降门槛 统一接口，不过实际落地时这三者往往互相制约 尤其是沙箱隔离带来的性能损耗很难平衡'
    },
    {
        question: 'Openclaw的3.13版本，支持浏览器自动化，已经不需要手动安装浏览器插件了 这是个很重要的更新 他完全内置了插件，单独安装，虽然不冲突，但是也没用了，内置的比较好用，单独安装的你得手动开启。',
        answer: '内置确实省去了手动开启的麻烦 单独插件主要是为了灵活扩展 一般用法内置就够了'
    },
    {
        question: '用openrouter调用的模型，这里面免费模型也有次数限制',
        answer: '做Agent路由挺合适 但得处理好不同模型的参数差异'
    },
    {
        question: '本地轻量模型不如云端，可是云端免费的限流，不免费的费token',
        answer: '确实 所以得在链路上加缓存层或者本地模型兜底 不然量大了成本扛不住'
    },
    {
        question: '目前一个路径应该是工作流的代码化。每一个路径龙虾写好代码并调试好。最大限度减少token消耗。',
        answer: '工作流转代码是降 token 的有效手段 但得把通用逻辑抽离 不然后期维护成本太高'
    },
    {
        question: '其实我研究了那么久，最方便的安装方式，不需要任何教程。先安装OpenCode。再让Open Code去安装OpenClaw。OpenClaw出什么问题也可以让OpenCode去修理。包括像装什么ollama之类的。都可以让Open Code去干，前提是你告诉他我在国内，要用国内镜像源。它还能帮你把很多东西都弄得很简单。',
        answer: '确实能省手动配置的时间 前提是 OpenCode 得有足够的系统权限去处理底层依赖'
    },
    {
        question: '你们都用什么本地模型跑小龙虾',
        answer: '你是想说小模型吧 本地跑代理任务一般选 7B 以下的量化版 兼顾显存和速度'
    },
    {
        question: '我让openclaw给我汇报，就是定时汇报或者整点汇报，但是都是失效的？定时汇报新闻 没成功过，但是用的云端龙虾反而可以。具体原因我也不清楚，还没研究到那种程度。',
        answer: '具体得看cron调度器怎么处理任务堆积和失败重试，长任务场景下这块容易崩'
    },
    {
        question: '有那种codex grok之类的自动注册机吗',
        answer: '这类工具得搞定指纹环境和接码渠道 但平台风控更新太快 稳定的不多'
    },
    {
        question: '理论上开一千个openclaw都没问题。但是要从代码那边修改每个端口号。',
        answer: '手动改确实麻烦 写个脚本动态分配就行 关键是内存和句柄数能不能扛住'
    },
    {
        question: 'claude出问题了 干不了活了。派我的agent到群里服务吧。',
        answer: 'claude 最近确实波动大 不过 agent 进群得做好频率控制和异常捕获 不然容易触发风控'
    },
    {
        question: '我想着他自己写个后台 我后续好还模型，他自己写死了',
        answer: '模型自改配置属于高危操作 没做快照回滚机制很容易把环境搞挂'
    },
    {
        question: '用 mac 64G 竟然能跑超大参数 LLM 模型，通过 autoresearch 框架优化，跑出了6.1 到 6.6 token 每秒的速度，感觉用这个方法 32 内存也能跑',
        answer: '统一内存架构确实香 不过 32G 跑超大参数得看量化级别 不然频繁 swap 会影响推理速度'
    },
    {
        question: 'AI的信达雅翻译还没有什么共识点，不过token翻译成“符”我觉得还是挺信达雅的',
        answer: '译成符挺有韵味 不过 token 本质是分词单元 直接说英文反而歧义少'
    },
    {
        question: '不堆算力，不换模型。如何实现超长上下文？',
        answer: '核心其实是记忆管理 试试分层摘要配合按需检索 别硬塞进窗口里'
    },
    {
        question: '你哪里找到的,我微信更新最新版也没看到Openclaw插件',
        answer: '应该是服务端灰度还没推到你 这种功能一般看账号权限不看客户端版本'
    },
    {
        question: 'p100本地部署可以上什么大模型',
        answer: '16G 显存跑 7B 量化比较稳 13B 得压到 4bit P100 是 Pascal 架构没 Tensor Core 推理速度会慢些'
    },
    {
        question: 'docker内存反复跳，内存9G然后到100多M',
        answer: '显存才是硬瓶颈 内存不够还能 swap 撑一下 显存爆了直接报错'
    },
    {
        question: 'Linux的GUI控制技能有没有啊？',
        answer: '这块之前弄过 主要是得区分 X11 和 Wayland 环境 方案差别挺大的'
    },
    {
        question: 'Openclaw只有mac版的可以直接下，其他版本的都只能通过命令拉取',
        answer: '很多自动化工具都这样 系统签名麻烦 命令行部署其实更灵活 就是门槛高点'
    },
    {
        question: '我周三让openclaw发邮件，过了两天让他发，他不记得了，让我给他配置',
        answer: '这种跨天记忆得挂外部存储 光靠上下文窗口肯定记不住周三的事'
    },
    {
        question: '接入微信clawbot了，但是只能搜索进入，聊天界面看不到，开发真是人才',
        answer: '微信机制问题 没主动发消息的会话不会置顶 检查下 bot 初始化握手日志有没有异常'
    },
    {
        question: '我想提问一个问题，配置类的东西为什么不会一键化，甚至绑定友商电脑系统，虽然个人觉得第二个操作有点抠脚，因为所有人都会去优先选择平价和更适应自己需求价格高但优质的AI',
        answer: '配置难一键化主要是环境差异太大导致标准化成本高 绑定系统则是生态护城河的策略 跟技术优劣关系不大'
    },
    {
        question: 'Linux 12代i7+ 12GB 全力跑 OpenClaw，完美全速，大多时间可以利用好了',
        answer: '调优到这一步确实爽 后面多留意下高负载时的稳定性就行'
    }
];

function initAuthorInterview(container) {
    if (container.dataset.interviewReady === 'true') return;
    container.dataset.interviewReady = 'true';
    container.innerHTML = `
        <section class="card main-input author-interview-search-card">
            <div class="badge">技术答疑</div>
            <input type="search" id="authorInterviewSearch" class="author-interview-search-input" placeholder="搜索问题或回答...">
        </section>
        ${AUTHOR_INTERVIEW_ITEMS.map((item, index) => renderAuthorInterviewCard(item, index)).join('')}
        <section class="card main-input author-interview-empty" hidden>
            <div class="badge">搜索结果</div>
            <p>没有匹配的采访内容。</p>
        </section>
    `;

    const searchInput = container.querySelector('#authorInterviewSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterAuthorInterview(container, searchInput.value));
    }
}

function renderAuthorInterviewCard(item, index) {
    const searchText = `${item.question} ${item.answer}`.toLowerCase();
    return `
        <article class="card author-interview-card" data-author-interview-search="${escapeHtml(searchText)}">
            <div class="badge">Q${String(index + 1).padStart(2, '0')}</div>
            <p><strong>Q：</strong>${escapeHtml(item.question)}</p>
            <br>
            <p><strong>A：</strong>${escapeHtml(item.answer)}</p>
        </article>
    `;
}

function filterAuthorInterview(container, query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    let visibleCount = 0;
    container.querySelectorAll('.author-interview-card').forEach(card => {
        const matched = !normalizedQuery || card.dataset.authorInterviewSearch.includes(normalizedQuery);
        card.hidden = !matched;
        if (matched) visibleCount++;
    });

    const empty = container.querySelector('.author-interview-empty');
    if (empty) empty.hidden = visibleCount !== 0;
}

const FEEDBACK_API_BASE = window.CIPHERTOOL_API_BASE || 'http://127.0.0.1:8080';
let feedbackAuthEventsBound = false;

function initFeedbackBoard(container) {
    if (container.dataset.feedbackReady !== 'true') {
        container.dataset.feedbackReady = 'true';
        container.innerHTML = `
            <section class="card feedback-composer">
                <div class="badge">意见反馈</div>
                <div class="feedback-account" id="feedbackAccount"></div>
                <textarea id="feedbackInput" class="feedback-input" maxlength="2000" placeholder="请输入您的意见或建议..."></textarea>
                <div class="feedback-actions">
                    <span id="feedbackMessage" class="feedback-message"></span>
                    <button id="submitFeedbackBtn" class="cyber-button" type="button">
                        <span class="cyber-button__glitch"></span>
                        <span class="cyber-button__tag">发送反馈</span>
                    </button>
                </div>
            </section>
            <section class="feedback-list" id="feedbackList" aria-live="polite"></section>
        `;
        bindFeedbackBoard(container);
    }

    bindFeedbackAuthEvents();
    loadFeedbackBoard(container);
}

function bindFeedbackBoard(container) {
    const submitBtn = container.querySelector('#submitFeedbackBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => submitFeedback(container));
    }

    container.addEventListener('click', event => {
        const deleteBtn = event.target.closest('[data-feedback-delete]');
        if (deleteBtn && container.contains(deleteBtn)) {
            deleteFeedback(container, deleteBtn.dataset.feedbackDelete, deleteBtn);
            return;
        }

        const replyBtn = event.target.closest('[data-feedback-reply]');
        if (!replyBtn || !container.contains(replyBtn)) return;
        submitFeedbackReply(container, replyBtn.dataset.feedbackReply, replyBtn);
    });
}

function bindFeedbackAuthEvents() {
    if (feedbackAuthEventsBound) return;
    feedbackAuthEventsBound = true;
    const reload = () => {
        const container = document.querySelector('#yijianfankui .container');
        if (container && container.dataset.feedbackReady === 'true') {
            loadFeedbackBoard(container);
        }
    };
    window.addEventListener('cipher-login-success', reload);
    window.addEventListener('cipher-logout-success', reload);
}

async function loadFeedbackBoard(container) {
    updateFeedbackAccount(container, false);
    setFeedbackMessage(container, '正在加载反馈...', 'muted');
    try {
        const overview = await feedbackRequest('/api/feedback', {
            method: 'GET',
            headers: authHeaders()
        });
        renderFeedbackOverview(container, overview);
        setFeedbackMessage(container, '', 'muted');
    } catch (error) {
        renderFeedbackOverview(container, { items: [], currentUserCanReply: false });
        setFeedbackMessage(container, error.message || '反馈加载失败', 'error');
    }
}

async function submitFeedback(container) {
    const input = container.querySelector('#feedbackInput');
    const content = input ? input.value.trim() : '';
    if (!content) {
        setFeedbackMessage(container, '请输入反馈内容', 'error');
        return;
    }

    const submitBtn = container.querySelector('#submitFeedbackBtn');
    setButtonBusy(submitBtn, true, '发送中...');
    try {
        const overview = await feedbackRequest('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify({ content })
        });
        if (input) input.value = '';
        renderFeedbackOverview(container, overview);
        setFeedbackMessage(container, '你的意见我们已收集', 'success');
    } catch (error) {
        setFeedbackMessage(container, error.message || '发送失败', 'error');
    } finally {
        setButtonBusy(submitBtn, false);
    }
}

async function submitFeedbackReply(container, feedbackId, button) {
    const input = container.querySelector(`[data-feedback-reply-input="${feedbackId}"]`);
    const content = input ? input.value.trim() : '';
    if (!content) {
        setFeedbackMessage(container, '请输入回复内容', 'error');
        return;
    }

    setButtonBusy(button, true, '发布中...');
    try {
        const overview = await feedbackRequest(`/api/feedback/${encodeURIComponent(feedbackId)}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify({ content })
        });
        renderFeedbackOverview(container, overview);
        setFeedbackMessage(container, '作者回复已发布', 'success');
    } catch (error) {
        if (isUnauthorizedMessage(error.message)) openLoginModal();
        setFeedbackMessage(container, error.message || '回复失败', 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

async function deleteFeedback(container, feedbackId, button) {
    setButtonBusy(button, true, '删除中...');
    try {
        const overview = await feedbackRequest(`/api/feedback/${encodeURIComponent(feedbackId)}/delete`, {
            method: 'POST',
            headers: authHeaders()
        });
        renderFeedbackOverview(container, overview);
        setFeedbackMessage(container, '反馈已删除', 'success');
    } catch (error) {
        if (isUnauthorizedMessage(error.message)) openLoginModal();
        setFeedbackMessage(container, error.message || '删除失败', 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

function renderFeedbackOverview(container, overview) {
    const canReply = !!overview?.currentUserCanReply;
    updateFeedbackAccount(container, canReply);

    const list = container.querySelector('#feedbackList');
    if (!list) return;
    const items = Array.isArray(overview?.items) ? overview.items : [];
    if (!items.length) {
        list.innerHTML = `
            <article class="card feedback-card feedback-empty">
                <div class="badge">反馈列表</div>
                <p>暂无反馈。</p>
            </article>
        `;
        return;
    }

    list.innerHTML = items.map(item => renderFeedbackCard(item, canReply)).join('');
}

function renderFeedbackCard(item, canReply) {
    const id = String(item.id || '');
    const replyContent = String(item.replyContent || '');
    const hasReply = !!item.replied && !!replyContent.trim();
    const authorActions = canReply
        ? `
            <div class="feedback-author-actions">
                <button class="cyber-button feedback-delete-button" type="button" data-feedback-delete="${escapeHtml(id)}">
                    <span class="cyber-button__glitch"></span>
                    <span class="cyber-button__tag">删除反馈</span>
                </button>
            </div>
        `
        : '';
    const replyForm = canReply
        ? `
            <div class="feedback-reply-form">
                <textarea class="feedback-reply-input" data-feedback-reply-input="${escapeHtml(id)}" maxlength="2000" placeholder="以作者身份回复...">${escapeHtml(replyContent)}</textarea>
                <button class="cyber-button feedback-reply-button" type="button" data-feedback-reply="${escapeHtml(id)}">
                    <span class="cyber-button__glitch"></span>
                    <span class="cyber-button__tag">${hasReply ? '更新回复' : '发布回复'}</span>
                </button>
            </div>
        `
        : '';

    return `
        <article class="card feedback-card" data-feedback-id="${escapeHtml(id)}">
            <div class="feedback-card-header">
                <div class="badge">用户反馈</div>
                <div class="feedback-meta">${escapeHtml(item.submitterMaskedEmail || '匿名用户')} · ${escapeHtml(formatFeedbackTime(item.createdAt))}</div>
            </div>
            <div class="feedback-content">${escapeHtml(item.content || '')}</div>
            ${hasReply ? `
                <div class="feedback-author-reply">
                    <div class="feedback-reply-title">作者回复 · ${escapeHtml(formatFeedbackTime(item.repliedAt))}</div>
                    <div class="feedback-reply-content">${escapeHtml(replyContent)}</div>
                </div>
            ` : ''}
            ${authorActions}
            ${replyForm}
        </article>
    `;
}

async function feedbackRequest(path, options = {}) {
    const response = await fetch(`${FEEDBACK_API_BASE}${path}`, options);
    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        throw new Error('后端响应格式错误');
    }

    if (!response.ok || !payload.success) {
        throw new Error(payload?.message || `请求失败 (${response.status})`);
    }
    return payload.data;
}

function updateFeedbackAccount(container, canReply) {
    const account = container.querySelector('#feedbackAccount');
    if (!account) return;
    const user = currentUser();
    if (!user) {
        account.textContent = '未登录将以匿名用户提交反馈';
        account.className = 'feedback-account';
        return;
    }
    account.textContent = canReply
        ? `当前账号：${maskAccount(user.phone)} · 作者回复权限`
        : `当前账号：${maskAccount(user.phone)}`;
    account.className = canReply ? 'feedback-account author' : 'feedback-account';
}

function setFeedbackMessage(container, text, type = 'muted') {
    const message = container.querySelector('#feedbackMessage');
    if (!message) return;
    message.textContent = text || '';
    message.className = `feedback-message ${type}`;
}

function setButtonBusy(button, busy, label) {
    if (!button) return;
    button.disabled = !!busy;
    const tag = button.querySelector('.cyber-button__tag') || button;
    if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = tag.textContent;
    }
    tag.textContent = busy ? label : button.dataset.defaultLabel;
}

function currentUser() {
    return window.CipherAuth && typeof window.CipherAuth.getUser === 'function'
        ? window.CipherAuth.getUser()
        : null;
}

function authHeaders() {
    return window.CipherAuth && typeof window.CipherAuth.getAuthHeaders === 'function'
        ? window.CipherAuth.getAuthHeaders()
        : {};
}

function openLoginModal() {
    if (window.CipherAuth && typeof window.CipherAuth.openModal === 'function') {
        window.CipherAuth.openModal();
    }
}

function isUnauthorizedMessage(message) {
    return /登录|未授权|unauthorized/i.test(String(message || ''));
}

function maskAccount(account) {
    const value = String(account || '');
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) return `${digits.slice(0, 3)}****${digits.slice(7)}`;
    if (!value.includes('@')) return value || '未登录';
    const [name, domain] = value.split('@');
    if (name.length <= 2) return `${'*'.repeat(name.length)}@${domain}`;
    return `${name.slice(0, 3)}****@${domain}`;
}

function formatFeedbackTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}
