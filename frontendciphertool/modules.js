// 模块内容作为JavaScript变量
const MODULES = {
    // 加密实验室模块
    jiamishiyanshi: `<div id="jiamishiyanshi-content" class="content-section">

    <div class="module-header">
        <h2 class="neon-title" data-text="CIPHER LABORATORY">CIPHER LABORATORY</h2>
    </div>

    <div class="submodule-nav" style="margin-top: 2rem;">
        <button class="btn back-btn submodule-btn active" data-target="mimaqu">经典区</button>
        <button class="btn back-btn submodule-btn" data-target="xiandaiqu">现代区</button>
        <button class="btn back-btn submodule-btn" data-target="luojimiti">逻辑区</button>
        <button class="btn back-btn submodule-btn" data-target="cihuiqu">词汇区</button>
        <button class="btn back-btn submodule-btn" data-target="yuliu">空间类</button>
    </div>

    <div class="cipher-swiper-container">
        <div class="cipher-swiper-wrapper">

    ${window.CIPHER_CLASSIC_MODERN_DIV_BATCH || ''}

    <!-- 逻辑谜题区 -->
    <div id="luojimiti" class="submodule">
        <!-- 内容将由 logic_module.js 动态加载 -->
    </div>
    
    <!-- 词汇区 -->
    <div id="cihuiqu" class="submodule">
        <!-- 内容将由 wordsearch.js 动态加载 -->
    </div>

        <!-- 空间类 -->
    <div id="yuliu" class="submodule">
        <div id="spacepuzzle"></div>
    </div>

        </div>
    </div>

</div>`,

    // 电子实验室模块
    electroniclab: `
    <div id="electroniclab-content" class="content-section">
        <div class="module-header">
            <h2 class="neon-title" data-text="CIPHER LABORATORY">ELECTRONIC LABORATORY</h2>
            <div class="source-selector-container">
                <select id="circuit-source-select" class="circuit-source-select">
                    <option value="./electronic/war/circuitjs.html">线路1: 本地源 (Local)</option>
                </select>
            </div>
        </div>
        <div class="engine-viewport">
            <div id="circuit-loading" class="loading-mask active">
                <div><i class="fas fa-spinner fa-spin"></i> 正在初始化电路引擎...</div>
            </div>
            <iframe 
                id="circuit-frame" 
                src="" 
                data-src="./electronic/war/circuitjs.html" 
                allowfullscreen>
            </iframe>
        </div>
    </div>
`,

    // 工作流模块
    workflow: `
    <div id="workflow-content" class="content-section">
        <div class="module-header">
            <h2 class="neon-title" data-text="WORKFLOW STUDIO">WORKFLOW STUDIO</h2>
        </div>
        <textarea id="mainInputCoze" style="display:none"></textarea>

        <div class="wf-container">
            <div class="wf-toolbar">
                <div class="wf-toolbar-search"><input type="text" id="wf-search" placeholder="搜索算法..."></div>
                <div class="wf-toolbar-list">
                    <div class="wf-toolbar-category">
                        <div class="wf-toolbar-category-title">经典密码</div>
                        <div class="wf-toolbar-item" data-algo="Caesar凯撒">🔐 Caesar 凯撒</div>
                        <div class="wf-toolbar-item" data-algo="Vigenere维吉尼亚">🔐 Vigenere 维吉尼亚</div>
                        <div class="wf-toolbar-item" data-algo="Beaufort">🔐 Beaufort</div>
                        <div class="wf-toolbar-item" data-algo="Variant Beaufort">🔐 Variant Beaufort</div>
                        <div class="wf-toolbar-item" data-algo="Autokey Vigenere">🔐 Autokey Vigenere</div>
                        <div class="wf-toolbar-item" data-algo="Gronsfeld">🔐 Gronsfeld</div>
                        <div class="wf-toolbar-item" data-algo="Porta">🔐 Porta</div>
                        <div class="wf-toolbar-item" data-algo="RailFence栅栏">🔐 RailFence 栅栏</div>
                        <div class="wf-toolbar-item" data-algo="Route Transposition">🔐 Route Transposition</div>
                        <div class="wf-toolbar-item" data-algo="Scytale">🔐 Scytale</div>
                        <div class="wf-toolbar-item" data-algo="AMSCO">🔐 AMSCO</div>
                        <div class="wf-toolbar-item" data-algo="Myszkowski">🔐 Myszkowski</div>
                        <div class="wf-toolbar-item" data-algo="Bifid双歧">🔐 Bifid 双歧</div>
                        <div class="wf-toolbar-item" data-algo="AtBash埃特巴什">🔐 AtBash 埃特巴什</div>
                        <div class="wf-toolbar-item" data-algo="BaseConverter进制">🔐 进制转换</div>
                        <div class="wf-toolbar-item" data-algo="Morse摩尔斯">🔐 Morse 摩尔斯</div>
                        <div class="wf-toolbar-item" data-algo="Bacon培根">🔐 Bacon 培根</div>
                        <div class="wf-toolbar-item" data-algo="QWE键盘">🔐 QWE 键盘</div>
                        <div class="wf-toolbar-item" data-algo="PhoneKey九键">🔐 手机九键</div>
                        <div class="wf-toolbar-item" data-algo="Beale比尔">🔐 Beale 比尔</div>
                        <div class="wf-toolbar-item" data-algo="Fanqie反切">🔐 反切码</div>
                        <div class="wf-toolbar-item" data-algo="VKeyboard">🔐 V字键盘</div>
                        <div class="wf-toolbar-item" data-algo="Cipher01248">🔐 01248密码</div>
                        <div class="wf-toolbar-item" data-algo="Vowel元音">🔐 元音密码</div>
                        <div class="wf-toolbar-item" data-algo="DNA_mRNA">🔐 DNA/mRNA</div>
                        <div class="wf-toolbar-item" data-algo="ColRail柱栅栏">🔐 柱状栅栏</div>
                        <div class="wf-toolbar-item" data-algo="WRail-W栅栏">🔐 W型栅栏</div>
                        <div class="wf-toolbar-item" data-algo="Polybius方阵">🔐 Polybius 方阵</div>
                        <div class="wf-toolbar-item" data-algo="Playfair">🔐 Playfair</div>
                        <div class="wf-toolbar-item" data-algo="ADFGX/ADFVGX">🔐 ADFGX/ADFVGX</div>
                        <div class="wf-toolbar-item" data-algo="Affine仿射">🔐 Affine 仿射</div>
                        <div class="wf-toolbar-item" data-algo="TapCode敲击码">🔐 敲击码</div>
                        <div class="wf-toolbar-item" data-algo="SemaphoreBraille旗语盲文">🔐 旗语/盲文</div>
                    </div>
                    <div class="wf-toolbar-category">
                        <div class="wf-toolbar-category-title">编码 & 哈希</div>
                        <div class="wf-toolbar-item" data-algo="A1Z26">🔐 A1Z26</div>
                        <div class="wf-toolbar-item" data-algo="ASCII">🔐 ASCII</div>
                        <div class="wf-toolbar-item" data-algo="Base编码">🔐 Base 编码</div>
                        <div class="wf-toolbar-item" data-algo="ROT旋转">🔐 ROT 旋转</div>
                        <div class="wf-toolbar-item" data-algo="CCC中文电码">🔐 中文电码</div>
                        <div class="wf-toolbar-item" data-algo="FourCCC四角号码">🔐 四角号码</div>
                        <div class="wf-toolbar-item" data-algo="MD5">🔐 MD5</div>
                        <div class="wf-toolbar-item" data-algo="SHA-1">🔐 SHA-1</div>
                        <div class="wf-toolbar-item" data-algo="SHA-256">🔐 SHA-256</div>
                        <div class="wf-toolbar-item" data-algo="SHA-384">🔐 SHA-384</div>
                        <div class="wf-toolbar-item" data-algo="SHA-512">🔐 SHA-512</div>
                    </div>
                    <div class="wf-toolbar-category">
                        <div class="wf-toolbar-category-title">现代密码</div>
                        <div class="wf-toolbar-item" data-algo="Substitution Analysis">🔐 Substitution Analysis</div>
                        <div class="wf-toolbar-item" data-algo="Hill Cipher">🔐 Hill Cipher</div>
                        <div class="wf-toolbar-item" data-algo="Enigma恩尼格玛">🔐 Enigma 恩尼格玛</div>
                    </div>
                </div>
                <div class="wf-toolbar-actions">
                    <button class="cyber-button" id="wf-clear-btn"><span class="cyber-button__tag">🗑 清空画布</span></button>
                </div>
            </div>

            <div class="wf-canvas-wrap" id="wf-canvas">
                <canvas id="wf-grid-canvas" class="wf-grid"></canvas>
                <svg class="wf-svg" id="wf-svg">
                    <defs>
                        <linearGradient id="wf-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#2ecc71" stop-opacity="0.8"/>
                            <stop offset="100%" stop-color="#3498db" stop-opacity="0.8"/>
                        </linearGradient>
                    </defs>
                    <path id="wf-temp-line" class="wf-temp-line" d=""/>
                </svg>
                <div class="wf-nodes-layer" id="wf-nodes-layer"></div>
            </div>
        </div>

        <div id="wf-context-menu" class="wf-context-menu"></div>
    </div>
`,

    // 知识图谱模块
    zhishitupu: `<div id="zhishitupu-content" class="content-section">
        <div id="zstp-vignette"></div>

        <div id="zstp-import-layer">
            <div class="zstp-action-stack">
                <button id="zstp-import-btn" class="zstp-import-btn">项目导入</button>
                <button id="zstp-guide-btn" class="zstp-import-btn" data-guide-id="zhishitupu">使用说明</button>
            </div>
            <input type="file" id="zstp-folder-input" webkitdirectory multiple style="display:none">
        </div>

        <div id="ui-layer">
            <div class="hud-panel" id="hud-panel">
                <button id="hud-close-btn" class="hud-close-btn">×</button>
                <h2> Knowledge Graph </h2>
                <div class="subtitle">知识图谱</div>
                <div style="height: 1px; background: linear-gradient(90deg, rgba(0, 255, 255, 0.99), transparent); margin-bottom: 1px;"></div>
                <div class="controls">
                    <div><span class="key">L-CLICK</span> ROTATE 旋转</div>
                    <div><span class="key">R-CLICK</span> PAN 平移</div>
                    <div><span class="key">SCROLL</span> ZOOM 缩放</div>
                    <div><span class="key">CLICK</span> FOCUS 聚焦</div>
                </div>
                <div style="margin-top: 15px; font-size: 10px; color: #4a6; letter-spacing: 1px;">● SYSTEM ONLINE</div>
            </div>
        </div>

        <div id="zstp-loader">
            <div>INITIALIZING LINK...</div>
            <div class="scan-line"></div>
        </div>
        
        <div id="graph-wrapper"></div>
    </div>`,

    // 大模型模块
    apizhongzhuanzhan: `
    <div id="apizhongzhuanzhan-content" class="content-section">
        <div id="apizz-root"></div>
    </div>`,

    mcpskilllab: `
    <div id="mcpskilllab-content" class="content-section">
        <div class="module-header">
            <h2 class="neon-title" data-text="SKILL MCP LAB">SKILL / MCP LAB</h2>
        </div>
        <div id="mcpskilllab-root"></div>
    </div>`,

    damoxing: `
    <div id="damoxing-content" class="content-section">
    <div id="damoxing-container">
        <div class="chat-interface">
            <!-- 主对话区域 -->
            <div class="chat-main">
                <div class="chat-mobile-header" style="display: none;">
                    <button id="sidebar-toggle" class="cyber-button">
                        <span class="cyber-button__tag">≡</span>
                    </button>
                    <button id="new-chat-mobile" class="cyber-button">
                        <span class="cyber-button__tag">+</span>
                    </button>
                </div>
                <div id="chat-messages">
                    <!-- 初始消息 -->
                    <div class="message system-message">
                        <div class="message-content">请输入您的问题...</div>
                    </div>
                </div>
                
                <div class="input-container">
                    <div class="attachment-controls">
                        <button id="image-mode-toggle" class="cyber-button image-mode-toggle" title="作图模式" type="button">
                            <span class="cyber-button__tag">作图模式</span>
                        </button>
                        <button id="attachment-add-btn" class="attachment-add-btn" title="导入文件或目录" aria-label="导入文件或目录" type="button">+</button>
                        <div id="attachment-menu" class="attachment-menu" aria-hidden="true">
                            <button id="attachment-file-btn" type="button">导入文件</button>
                            <button id="attachment-folder-btn" type="button">导入目录</button>
                            <button id="import-chat-history-btn" type="button">导入聊天</button>
                        </div>
                        <input id="attachment-file-input" type="file" multiple hidden>
                        <input id="attachment-folder-input" type="file" webkitdirectory multiple hidden>
                        <input id="import-chat-history-input" type="file" accept=".txt,text/plain" multiple hidden>
                    </div>
                    <div class="input-main">
                        <div id="attachment-list" class="attachment-list" aria-live="polite"></div>
                        <div id="attachment-status" class="attachment-status" aria-live="polite"></div>
                        <textarea id="user-input" placeholder="输入您的问题..." autofocus></textarea>
                    </div>
                    <div class="input-actions">
                        <button id="tool-toggle" class="cyber-button" title="启用工具">
                            <span class="cyber-button__tag">🔧 工具</span>
                        </button>
                        <button id="deep-think-toggle" class="cyber-button" title="深度思考">
                            <span class="cyber-button__tag">深度思考</span>
                        </button>
                        <button id="send-message" class="cyber-button">
                            <span class="cyber-button__tag">发送</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 右侧边栏（历史对话） -->
            <div class="chat-sidebar">
                <div class="sidebar-header">
                    <button id="new-chat" class="cyber-button">
                        <span class="cyber-button__tag">新对话</span>
                    </button>
                    <button id="select-all-history" class="cyber-button">
                        <span class="cyber-button__tag">全选</span>
                    </button>
                    <button id="export-chat-history" class="cyber-button">
                        <span class="cyber-button__tag">导出聊天</span>
                    </button>
                    <button id="agent-workbench-open" class="cyber-button">
                        <span class="cyber-button__tag">运行记录</span>
                    </button>
                </div>
                <div class="search-container">
                    <input type="text" id="history-search" placeholder="搜索对话...">
                </div>
                
                <div id="chat-history-list">
                    <!-- 历史对话会动态添加到这里 -->
                </div>
                
                <div class="sidebar-footer">
                    <button id="delete-history" class="cyber-button">
                        <span class="cyber-button__tag">删除选中</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>`,
    // 意见反馈模块
    yijianfankui:
        `<div id="yijianfankui-content" class="content-section">
        <div class="module-header"><h2 class="neon-title" data-text="YIJIANFANKUI">「SENDFEEDBACK」关于作者</h2></div>

        <div class="submodule-nav" style="margin-top: 2rem;">
            <button class="btn back-btn contact-submodule-btn active" data-target="guanyuzuozhe">关于作者</button>
            <button class="btn back-btn contact-submodule-btn" data-target="zuozhecaifang">作者采访</button>
            <button class="btn back-btn contact-submodule-btn" data-target="yijianfankui">意见反馈</button>
            <button class="btn back-btn contact-submodule-btn" data-target="kaifarizhi">开发日志</button>
        </div>

    <div class="cipher-swiper-container">
        <div class="cipher-swiper-wrapper">

        <div id="guanyuzuozhe" class="lianxiwomen-submodule active">
            <div class="container">
                <!-- Bilibili -->
                <a href="https://space.bilibili.com/262497072?spm_id_from=333.337.0.0" target="_blank" class="author-image-link">
                    <img src="./sendfeedback/zuozhetupian/zuozhedeBilibili.jpg" alt="Bilibili">
                </a>

                <!-- 公众号 -->
                <a href="https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzI3NTI2MTE4OA==&scene=110#wechat_redirect" target="_blank" class="author-image-link">
                    <img src="./sendfeedback/zuozhetupian/zuozhedegongzhonghao.jpg" alt="公众号">
                </a>

                <!-- 知乎 -->
                <a href="https://www.zhihu.com/people/lei-shen-45-3" target="_blank" class="author-image-link">
                    <img src="./sendfeedback/zuozhetupian/zuozhedezhihu.jpg" alt="知乎">
                </a>

                <!-- 赞赏 -->
                <div class="author-image-link" id="rewardCard" style="cursor: pointer;">
                    <img src="./sendfeedback/zuozhetupian/zanshangzuozhe.jpg" alt="赞赏作者">
                </div>
            </div>
        </div>

        <div id="zuozhecaifang" class="lianxiwomen-submodule">
            <div class="container">
                <!-- 内容将由 sendfeedback.js 动态加载 -->
            </div>
        </div>

        <div id="yijianfankui" class="lianxiwomen-submodule">
            <div class="container">
                <!-- 内容将由 sendfeedback.js 动态加载 -->
            </div>
        </div>

        <div id="kaifarizhi" class="lianxiwomen-submodule">
            <div class="container">
                <div class="card">
                    <div class="badge">开发日志</div>
                        <p>稍安勿躁，即将呈现</p>
                </div>
            </div>
        </div>

        </div>
    </div>

    </div>`
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // ===== 核心脚本（页面框架、密码、工作流等）=====
    const coreScripts = [
        './electronic/electronic_lab.js',
        './apizhongzhuanzhan/apizhongzhuanzhan.js',
        './mcpskilllab/mcpskilllab-config.js',
        './mcpskilllab/mcpskilllab-resources-mcp.js',
        './mcpskilllab/mcpskilllab-resources-skills.js',
        './mcpskilllab/mcpskilllab-resources.js',
        './mcpskilllab/mcpskilllab.js',
        './0_sidebar_funtion.js',

        './model/contracts/AgentContract.js',
        './model/AgentRunStore.js',
        './model/AgentRunReplay.js',
        './model/AgentRunQuality.js',
        './model/AgentEvalSuite.js',
        './model/AgentLiveEvalRunner.js',
        './model/AgentEvalBatchStore.js',
        './model/AgentEvalDiagnostics.js',
        './model/AgentWorkbench.js',
        './model/DeepSeekClient.js',
        './model/ToolRegistry.js',
        './model/ChatUI.js',
        './model/HistoryManager.js',
        './model/AgentRuntime.js',
        './model/main.js',
        './workflow/workflow.js',
        './zhishitupu/graphData.js',
        './zhishitupu/zhishitupu.js',
        './wordsearch/wordsearch.js',
        './spacepuzzle/spacepuzzlebatch.js',
        './sendfeedback/sendfeedback.js',
    ];

    const loadVersion = new Date().getTime();
    function loadBatch(list) {
        return Promise.all(list.map(src => new Promise(resolve => {
            const s = document.createElement('script');
            s.async = false;
            s.src = src + '?v=' + loadVersion;
            s.onload = s.onerror = resolve;
            document.body.appendChild(s);
        })));
    }

    // ===== 并行加载：核心区 + 逻辑区（互不阻塞）=====
    // 核心区：加载完立即初始化页面
    Promise.all([loadBatch(coreScripts), window.loadCipherScriptBatch ? window.loadCipherScriptBatch(loadBatch) : Promise.resolve([])])
        .then(() => Promise.resolve(window.spacePuzzleBatchReady))
        .then(() => {
        if (typeof initClickSymbolCiphers === 'function') initClickSymbolCiphers();
        if (typeof initSearchFunction === 'function') initSearchFunction();
        if (typeof initWordSearch === 'function') initWordSearch();
        if (typeof initApiZhongZhuanZhan === 'function') initApiZhongZhuanZhan();
        if (typeof initMcpSkillLab === 'function') initMcpSkillLab();
        if (typeof initSpacePuzzle === 'function') initSpacePuzzle();
        if (typeof initSendFeedback === 'function') initSendFeedback();
        if (typeof initChatFunctions === 'function') initChatFunctions();
        initWorkflowCoze();
        if (typeof initElectronicLab === 'function') initElectronicLab();
        if (typeof initAuthorPage === 'function') initAuthorPage();
    });

    // 逻辑区：由 logicbatch.js 独立管理分批加载和初始化
    loadBatch(['./logic/logicbatch.js']);

    if (!MODULES) return console.error('模块内容未定义');
    ['jiamishiyanshi', 'electroniclab', 'workflow', 'zhishitupu', 'damoxing', 'apizhongzhuanzhan', 'mcpskilllab', 'yijianfankui'].forEach(id =>
        document.getElementById(id + '-container').innerHTML = MODULES[id]
    );

    const showModule = id => {
        // 性能优化：菜单切换时唤醒图谱或休眠
        if (window.ZSTP) {
            if (id === 'zhishitupu') {
                window.ZSTP.resume();
            } else {
                window.ZSTP.pause();
            }
        }

        document.querySelectorAll('.container1 > div').forEach(e => e.style.display = 'none');
        const targetContainer = document.getElementById(id + '-container');
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }

        // 电子实验室懒加载
        if (id === 'electroniclab') {
            const frame = document.getElementById('circuit-frame');
            const loading = document.getElementById('circuit-loading');
            if (frame && !frame.getAttribute('src')) {
                if (loading) loading.classList.add('active'); // 显示加载遮罩
                frame.src = frame.getAttribute('data-src');
            }
        }

        document.querySelectorAll('.menu-item').forEach(item =>
            item.classList[item.getAttribute('data-target') === id ? 'add' : 'remove']('active')
        );

        // 知识图谱模块特殊处理
        if (id === 'zhishitupu') {
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                if (typeof initKnowledgeGraph === 'function') {
                    initKnowledgeGraph();
                }
            }, 50);
        }

        // 工作流画布切换时触发resize重绘连线和网格
        if (id === 'workflow') {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        }

        // 大模型特殊处理：仅在切换到大模型页面时初始化
        if (id === 'damoxing') {
            if (typeof initChatFunctions === 'function') {
                initChatFunctions();
            } else if (typeof bindChatEvents === 'function') {
                bindChatEvents();
            }
        }

        if (id === 'apizhongzhuanzhan' && typeof initApiZhongZhuanZhan === 'function') {
            initApiZhongZhuanZhan();
        }

        if (id === 'mcpskilllab' && typeof initMcpSkillLab === 'function') {
            initMcpSkillLab();
        }
    }

    showModule('jiamishiyanshi');
    document.querySelectorAll('.menu-item').forEach(item =>
        item.addEventListener('click', e => {
            e.preventDefault();
            showModule(item.getAttribute('data-target'));
        })
    );
});
