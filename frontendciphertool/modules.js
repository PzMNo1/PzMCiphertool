// 模块内容作为JavaScript变量
const MODULES = {
    // 加密实验室模块
    jiamishiyanshi: `<div id="jiamishiyanshi-content" class="content-section">

    <section class="cipher-lab-shell apizz-shell">
        <div class="apizz-header cipher-lab-header">
            <div>
                <div class="module-header">
                    <h2 class="neon-title" data-text="CIPHER LABORATORY">CIPHER LABORATORY</h2>
                </div>
            </div>
        </div>

        <div class="apizz-console-layout cipher-lab-console-layout">
            <aside class="apizz-console-nav cipher-lab-console-nav" aria-label="加密实验室导航">
                <button type="button" class="submodule-btn" data-target="mimaqu">经典区</button>
                <button type="button" class="submodule-btn" data-target="xiandaiqu">现代区</button>
                <button type="button" class="submodule-btn" data-target="fenxiqu">分析区</button>
                <button type="button" class="submodule-btn" data-target="luojimiti">逻辑区</button>
                <button type="button" class="submodule-btn" data-target="cihuiqu">词汇区</button>
                <button type="button" class="submodule-btn" data-target="yuliu">空间类</button>
            </aside>

            <main class="apizz-console-main cipher-lab-console-main">
                <div class="cipher-lab-panel-stack">

    ${window.CIPHER_LAB_DIV_BATCH || ''}

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
            </main>
        </div>
    </section>

</div>`,

    // 电子实验室模块
    electroniclab: `
    <div id="electroniclab-content" class="content-section">
        <div class="module-header">
            <h2 class="neon-title" data-text="ELECTRONIC LABORATORY">ELECTRONIC LABORATORY</h2>
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

    // 建模实验室模块
    jianmoshiyanshi: `
    <div id="jianmoshiyanshi-content" class="content-section">
        <div id="modelinglab-root"></div>
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
            <div class="wf-toolbar card">
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
                    <button type="button" class="cyber-button" id="wf-clear-btn">
                        <span class="cyber-button__glitch"></span>
                        <span class="cyber-button__tag">清空画布</span>
                    </button>
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
                <button id="zstp-restore-btn" class="zstp-import-btn">恢复默认</button>
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
                        <button id="attachment-add-btn" class="attachment-add-btn" title="导入文件或目录" aria-label="导入文件或目录" type="button"></button>
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
                        <div class="input-field-wrap">
                            <textarea id="user-input" placeholder="输入您的问题..." autofocus></textarea>
                            <div id="context-progress-ring" class="context-progress-ring" role="img"
                                aria-label="上下文窗口使用率" title="上下文窗口使用率">
                                <svg viewBox="0 0 44 44" aria-hidden="true">
                                    <circle class="context-ring-track" cx="22" cy="22" r="18"></circle>
                                    <circle class="context-ring-value" cx="22" cy="22" r="18"></circle>
                                </svg>
                                <span class="context-ring-label">0%</span>
                            </div>
                        </div>
                        <div id="agent-performance-monitor" class="performance-monitor" aria-live="polite"></div>
                    </div>
                    <div class="input-actions">
                        <button id="modeling-mode-toggle" class="cyber-button image-mode-toggle" title="建模模式" type="button">
                            <span class="cyber-button__tag">建模模式</span>
                        </button>
                        <button id="image-mode-toggle" class="cyber-button image-mode-toggle" title="作图模式" type="button">
                            <span class="cyber-button__tag">作图模式</span>
                        </button>
                        <button id="tool-toggle" class="cyber-button active" title="启用工具">
                            <span class="cyber-button__tag">🔧 工具</span>
                        </button>
                        <button id="deep-think-toggle" class="cyber-button active" title="深度思考">
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
    // 联系我们模块
    yijianfankui:
        `<div id="yijianfankui-content" class="content-section">

    <section class="cipher-lab-shell apizz-shell contact-shell">
        <div class="apizz-header cipher-lab-header">
            <div>
                <div class="module-header">
                    <h2 class="neon-title" data-text="CONTACT CONSOLE">CONTACT CONSOLE</h2>
                </div>
            </div>
        </div>

        <div class="apizz-console-layout cipher-lab-console-layout">
            <aside class="apizz-console-nav cipher-lab-console-nav" aria-label="联系我们导航">
                <button type="button" class="submodule-btn contact-submodule-btn active" data-target="guanyuzuozhe">关于作者</button>
                <button type="button" class="submodule-btn contact-submodule-btn" data-target="zuozhecaifang">作者采访</button>
                <button type="button" class="submodule-btn contact-submodule-btn" data-target="yijianfankui">意见反馈</button>
                <button type="button" class="submodule-btn contact-submodule-btn" data-target="kaifarizhi">开发日志</button>
            </aside>

            <main class="apizz-console-main cipher-lab-console-main">
                <div class="cipher-lab-panel-stack">
                    <div id="guanyuzuozhe" class="submodule lianxiwomen-submodule active">
                        <div class="container">
                            <!-- Bilibili -->
                            <a href="https://space.bilibili.com/262497072?spm_id_from=333.337.0.0" target="_blank" class="author-image-link">
                                <img data-src="./sendfeedback/zuozhetupian/zuozhedeBilibili.jpg" alt="Bilibili" loading="lazy">
                            </a>

                            <!-- 公众号 -->
                            <a href="https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzI3NTI2MTE4OA==&scene=110#wechat_redirect" target="_blank" class="author-image-link">
                                <img data-src="./sendfeedback/zuozhetupian/zuozhedegongzhonghao.jpg" alt="公众号" loading="lazy">
                            </a>

                            <!-- 知乎 -->
                            <a href="https://www.zhihu.com/people/lei-shen-45-3" target="_blank" class="author-image-link">
                                <img data-src="./sendfeedback/zuozhetupian/zuozhedezhihu.jpg" alt="知乎" loading="lazy">
                            </a>

                            <!-- 赞赏 -->
                            <div class="author-image-link" id="rewardCard" style="cursor: pointer;">
                                <img data-src="./sendfeedback/zuozhetupian/zanshangzuozhe.jpg" alt="赞赏作者" loading="lazy">
                            </div>
                        </div>
                    </div>

                    <div id="zuozhecaifang" class="submodule lianxiwomen-submodule">
                        <div class="container">
                            <!-- 内容将由 sendfeedback.js 动态加载 -->
                        </div>
                    </div>

                    <div id="yijianfankui" class="submodule lianxiwomen-submodule">
                        <div class="container">
                            <!-- 内容将由 sendfeedback.js 动态加载 -->
                        </div>
                    </div>

                    <div id="kaifarizhi" class="submodule lianxiwomen-submodule">
                        <div class="container">
                            <section class="card devlog-summary-card">
                                <div class="badge">开发日志</div>
                                <h3>从脚本到 Agent 工具箱</h3>
                                <p>这里按项目阶段整理核心进展。更细的提交记录可以查看 GitHub 仓库。</p>
                                <a class="devlog-repo-link" href="https://github.com/PzMNo1/PzMCiphertool" target="_blank" rel="noopener noreferrer">查看 GitHub 仓库</a>
                            </section>

                            <section class="devlog-timeline" aria-label="开发日志时间线">
                                <article class="devlog-item">
                                    <div class="devlog-marker"></div>
                                    <div class="devlog-card">
                                        <time>2024.09</time>
                                        <h4>项目原型启动</h4>
                                        <p>从 Python 脚本和 GUI 开始，目标是把常见 Puzzlehunt、CTF 解密流程做成更快的辅助工具。</p>
                                    </div>
                                </article>

                                <article class="devlog-item">
                                    <div class="devlog-marker"></div>
                                    <div class="devlog-card">
                                        <time>2024 Q4</time>
                                        <h4>密码卡片与核心算法成型</h4>
                                        <p>整理传统区、现代区的转换逻辑，优先追求少输入、快反馈、便于人工推理的卡片式体验。</p>
                                    </div>
                                </article>

                                <article class="devlog-item">
                                    <div class="devlog-marker"></div>
                                    <div class="devlog-card">
                                        <time>2025 H1</time>
                                        <h4>界面风格和早期体验打磨</h4>
                                        <p>经过多轮重构，形成当前科幻控制台视觉方向，并持续收集早期用户对解题流程、布局和可读性的反馈。</p>
                                    </div>
                                </article>

                                <article class="devlog-item">
                                    <div class="devlog-marker"></div>
                                    <div class="devlog-card">
                                        <time>2026.05.24</time>
                                        <h4>逻辑谜题模块化与加载优化</h4>
                                        <p>拆出 logicbatch.js，调整逻辑题脚本批次和懒加载策略，让主页面先显示，复杂谜题资源再分批进入。</p>
                                    </div>
                                </article>

                                <article class="devlog-item">
                                    <div class="devlog-marker"></div>
                                    <div class="devlog-card">
                                        <time>2026.05.25 - 05.29</time>
                                        <h4>部署、后端和新模块扩展</h4>
                                        <p>补充 API Key 配置说明，更新 Agent、Workflow、Space Puzzle、MCP Skill Lab、API 中转站和后端安全配置。</p>
                                    </div>
                                </article>

                                <article class="devlog-item">
                                    <div class="devlog-marker"></div>
                                    <div class="devlog-card">
                                        <time>2026.05.31</time>
                                        <h4>Agent Runtime 和项目图谱整理</h4>
                                        <p>清理 Agent 运行时、聊天 UI、历史管理和代码图谱相关内容，增强工具箱内部模块之间的协同。</p>
                                    </div>
                                </article>

                                <article class="devlog-item">
                                    <div class="devlog-marker"></div>
                                    <div class="devlog-card">
                                        <time>2026.06.03 - 06.04</time>
                                        <h4>控制台框架和移动端体验升级</h4>
                                        <p>继续推进 API Router、MCP/Skill Lab、AgentEarth 后端控制器，并重构加密实验室布局、移动端拨盘导航和侧边栏细节。</p>
                                    </div>
                                </article>

                                <article class="devlog-item">
                                    <div class="devlog-marker"></div>
                                    <div class="devlog-card">
                                        <time>2026.06.06</time>
                                        <h4>Rust 前端迁移计划</h4>
                                        <p>建立 frontend-rust 渐进重构路线，计划优先接管登录、API 中转站、MCP Lab、联系我们等纯 UI 和 API 页面。</p>
                                    </div>
                                </article>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </section>

    </div>`
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // ===== 首屏批次：加密实验室 + 词汇区 =====
    const coreScripts = [
        './0_sidebar_funtion.js',
        './wordsearch/wordsearch.js',
        './wordsearch/wordsearch_chinese.js',
    ];

    // ===== 其余模块：首屏就绪后在后台分 5 组预热；用户提前点击时也会由 showModule 兜底触发 =====
    // key 用侧边栏 data-target（也是 showModule 的入参）；逻辑区/空间类是加密实验室的子区，用独立 key。
    const LAZY_GROUPS = {
        logic: [
            './logic/logicbatch.js',
        ],
        spacepuzzle: [
            './spacepuzzle/spacepuzzlebatch.js',
        ],
        jianmoshiyanshi: [
            './modelinglab/modelinglab.js',
        ],
        electroniclab: [
            './electronic/electronic_lab.js',
        ],
        workflow: [
            './workflow/workflow.js',
        ],
        yijianfankui: [
            './sendfeedback/sendfeedback.js',
        ],
        apizhongzhuanzhan: [
            './apizhongzhuanzhan/apizhongzhuanzhan.js',
            './apizhongzhuanzhan/apizz-overview.js',
            './apizhongzhuanzhan/apizz-keys.js',
            './apizhongzhuanzhan/apizz-usage.js',
            './apizhongzhuanzhan/apizz-billing.js',
        ],
        mcpskilllab: [
            './mcpskilllab/mcpskilllab-config.js',
            './mcpskilllab/mcpskilllab-resources-mcp.js',
            './mcpskilllab/mcpskilllab-resources-skills.js',
            './mcpskilllab/mcpskilllab-resources.js',
            './mcpskilllab/mcpskilllab.js',
        ],
        zhishitupu: [
            './zhishitupu/obsidianVault.js',
            './zhishitupu/worldKnowledge.js',
            './zhishitupu/nodeKnowledgeCorpus.js',
            './zhishitupu/graphData.js',
            './zhishitupu/zhishitupu.js',
        ],
        damoxing: [
            './model/contracts/AgentContract.js',
            './model/DeepSeekClient.js',
            './model/ImageGenerationClient.js',
            './model/ToolRegistry.js',
            './model/ChatUI.js',
            './model/HistoryManager.js',
            './model/agent/AgentIntentContract.js',
            './model/agent/AgentProfiles.js',
            './model/agent/AgentPolicyResolver.js',
            './model/agent/AgentDurableStore.js',
            './model/agent/AgentPerformanceMonitor.js',
            './model/agent/AgentContextManager.js',
            './model/agent/AgentResearchContract.js',
            './model/agent/AgentStyleContract.js',
            './model/agent/AgentExpertPanel.js',
            './model/agent/AgentDiagramRenderer.js',
            './model/AgentRuntime.js',
            './model/main.js',
        ],
    };

    // 脚本到位后只执行一次的初始化（后台预热用；电子实验室的 iframe 也在这里挂 src）
    const GROUP_INITS = {
        spacepuzzle: () => window.spacePuzzleBatchReady || Promise.resolve(),
        electroniclab: () => {
            if (typeof initElectronicLab === 'function') initElectronicLab();
            const frame = document.getElementById('circuit-frame');
            if (frame && !frame.getAttribute('src')) frame.src = frame.getAttribute('data-src');
        },
        workflow: () => {
            if (typeof initWorkflowCoze === 'function') initWorkflowCoze();
        },
        yijianfankui: () => {
            if (typeof initSendFeedback === 'function') initSendFeedback();
        },
    };

    // 每次切到该区都要执行的初始化（沿用原来 showModule 里的调用；脚本没到就先等脚本）
    const SWITCH_INITS = {
        jianmoshiyanshi: () => {
            if (typeof initModelingLab === 'function') initModelingLab();
            if (typeof window.modelingLabShowView === 'function') {
                window.modelingLabShowView(document.querySelector('.modelinglab-tab.active')?.getAttribute('data-view') || 'editor');
            }
        },
        zhishitupu: () => {
            if (typeof initKnowledgeGraph === 'function') initKnowledgeGraph();
        },
        damoxing: () => {
            if (typeof initChatFunctions === 'function') initChatFunctions();
            else if (typeof bindChatEvents === 'function') bindChatEvents();
        },
        apizhongzhuanzhan: () => {
            if (typeof initApiZhongZhuanZhan === 'function') initApiZhongZhuanZhan();
        },
        mcpskilllab: () => {
            if (typeof initMcpSkillLab === 'function') initMcpSkillLab();
        },
    };

    const loadVersion = window.CIPHERTOOL_ASSET_VERSION || '20261011';
    function loadBatch(list) {
        return Promise.all(list.map(src => new Promise(resolve => {
            const s = document.createElement('script');
            s.async = false;
            s.src = src + '?v=' + loadVersion;
            s.onload = s.onerror = resolve;
            document.body.appendChild(s);
        })));
    }

    // 按区懒加载：同一组只加载一次，初始化在脚本到位之后才执行
    const groupPromises = {};
    function ensureGroup(id) {
        if (!LAZY_GROUPS[id]) return Promise.resolve();
        if (!groupPromises[id]) {
            groupPromises[id] = loadBatch(LAZY_GROUPS[id]).then(() => {
                const init = GROUP_INITS[id];
                if (typeof init === 'function') return init();
            });
        }
        return groupPromises[id];
    }
    // 供首屏脚本按需唤醒某个区（例如侧边栏搜索跳到知识图谱节点）
    window.ensureCipherModule = ensureGroup;

    function loadLazyImages(root = document) {
        root.querySelectorAll('img[data-src]').forEach(img => {
            if (!img.getAttribute('src')) {
                img.setAttribute('src', img.dataset.src);
            }
        });
    }
    window.loadLazyImages = loadLazyImages;

    // 首屏就绪后按 5 组并行预热其余模块
    const BACKGROUND_WAVES = [
        ['logic', 'spacepuzzle'],
        ['yijianfankui', 'workflow', 'apizhongzhuanzhan'],
        ['jianmoshiyanshi'],
        ['damoxing', 'electroniclab'],
        ['mcpskilllab'],
    ];

    // ===== 并行加载：首屏批次 + 加密实验室脚本批次（互不阻塞）=====
    Promise.all([loadBatch(coreScripts), window.loadCipherScriptBatch ? window.loadCipherScriptBatch(loadBatch) : Promise.resolve([])])
        .then(() => {
            // 加密实验室的数据驱动卡片必须等本文件把 MODULES 注入 DOM 之后再挂载，
            // 否则拿不到 #mimaqu / #xiandaiqu 这些子模块容器
            if (window.CipherCards) window.CipherCards.mount();
            // 各区自带的「搜索卡片」框：从这里统一初始化，保证 DOM 已经注入
            document.querySelectorAll('[data-quick-nav]').forEach(el => {
                if (typeof initQuickNav === 'function') initQuickNav(el.dataset.quickNav);
            });
            if (typeof initClickSymbolCiphers === 'function') initClickSymbolCiphers();
            if (typeof initSearchFunction === 'function') initSearchFunction();
            if (typeof initWordSearch === 'function') initWordSearch();
            if (typeof initAuthorPage === 'function') initAuthorPage();
            // 首屏可用了 → 5 组并行后台预热
            BACKGROUND_WAVES.forEach(wave => Promise.all(wave.map(ensureGroup)));
        });

    if (!MODULES) return console.error('模块内容未定义');
    ['jiamishiyanshi', 'electroniclab', 'jianmoshiyanshi', 'workflow', 'zhishitupu', 'damoxing', 'apizhongzhuanzhan', 'mcpskilllab', 'yijianfankui'].forEach(id =>
        document.getElementById(id + '-container').innerHTML = MODULES[id]
    );

    const showModule = id => {
        // 脚本到位（后台预热或现拉）后再按原时机执行该区的初始化
        ensureGroup(id).then(() => {
            const init = SWITCH_INITS[id];
            if (typeof init === 'function') init();
        });

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
            loadLazyImages(targetContainer);
        }

        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        const targetSection = document.getElementById(id + '-content');
        if (targetSection) {
            targetSection.style.display = (id === 'workflow') ? 'flex' : 'block';
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

        if (id === 'jianmoshiyanshi') {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        }

        // 建模实验室模块特殊处理：切走时休眠 iframe，切回时唤醒
        document.querySelectorAll('#modelinglab-root [data-view-frame]').forEach(frame => {
            if (id !== 'jianmoshiyanshi') frame.style.display = 'none'; // 休眠：iframe 停止渲染，页面状态保留
        });
        if (id === 'jianmoshiyanshi' && typeof window.modelingLabShowView === 'function') {
            // 唤醒：恢复上次所在视图，并让 iframe 内部画布重新计算尺寸
            window.modelingLabShowView(document.querySelector('.modelinglab-tab.active')?.getAttribute('data-view') || 'editor');
        }

        document.querySelectorAll('.menu-item').forEach(item =>
            item.classList[item.getAttribute('data-target') === id ? 'add' : 'remove']('active')
        );

        // 知识图谱模块特殊处理：初始化交给 ensureGroup('zhishitupu') 在脚本到位后触发
        if (id === 'zhishitupu') {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        }

        // 工作流画布切换时触发resize重绘连线和网格
        if (id === 'workflow') {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
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
