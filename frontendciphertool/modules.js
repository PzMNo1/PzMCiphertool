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
        <button class="btn back-btn submodule-btn" data-target="yuliu">预留区</button>
    </div>

    <div class="cipher-swiper-container">
        <div class="cipher-swiper-wrapper">

    <div id="mimaqu" class="submodule active">
        <div class="container">
        
        <div class="card main-input">
            <button class="cyber-button pin-toggle-btn">
                <span class="cyber-button__glitch"></span>
                <span class="cyber-button__tag">置顶</span>
            </button>
            <button class="cyber-button usage-guide-btn">
                <span class="cyber-button__glitch"></span>
                <span class="cyber-button__tag">使用说明</span>
            </button>
            <textarea id="mainInput" placeholder="输入要加密/解密的内容..." autofocus></textarea>
            <div class="quick-nav-container" id="quick-nav-container-mimaqu">
                <input type="text" class="quick-nav-input" id="quick-nav-input-mimaqu" placeholder="[搜索密码卡片...]" autocomplete="off">
                <div class="quick-nav-options" id="quick-nav-options-mimaqu"></div>
            </div>
        </div>

        <!-- 凯撒密码 -->
        <div class="card">
            <div class="badge">凯撒 Caesar</div>
            <input type="number" id="caesarShift" placeholder="偏移量" value="3" min="-26" max="26">
            <div class="result" id="caesarResult"></div>
        </div>

        <!-- 维吉尼亚密码 -->
        <div class="card">
            <div class="badge">维吉尼亚 Vigenère</div>
            <input type="text" id="vigenereKey" placeholder="输入密钥">
            <div class="result" id="vigenereResult"></div>
        </div>

        <!-- 栅栏密码 -->
        <div class="card">
            <div class="badge">栅栏 Rail Fence</div>
            <input type="number" id="railCount" placeholder="层数" value="3">
            <div class="result" id="railResult"></div>
        </div>

        <!-- AtBash密码 -->
        <div class="card">
            <div class="badge">AtBash 埃特巴什</div>
            <div class="result" id="atbashResult"></div>
        </div>

        <!-- 进制转换 -->
        <div class="card">
            <div class="badge">进制 Base Converter</div>
            <div class="grid-2">
                <input type="number" id="fromBase" placeholder="原进制" value="36">
                <input type="number" id="toBase" placeholder="目标进制" value="10">
            </div>
            <div class="result" id="baseResult"></div>
        </div>

        <!-- 摩尔斯电码 -->
        <div class="card">
            <div class="badge">摩尔斯 Morse</div>
            <div class="result" id="morseResult"></div>
        </div>

        <!-- 手机九键 -->
        <div class="card">
            <div class="badge">手机九键 Phone Keypad</div>
            <div class="result" id="phoneResult"></div>
        </div>

        <!-- 比尔密码 -->
        <div class="card">
            <div class="badge">比尔密码 Beale Cipher</div>
            <input type="text" id="bealeKey" placeholder="密钥用空格分隔">
            <div class="result" id="bealeResult"></div>
        </div>

        <!-- 反切码 -->
        <div class="card">
            <div class="badge">反切码 Fanqie</div>
            <div class="result" id="fanqieResult"></div>
        </div>

        <!-- mRNA序列 -->
        <div class="card">
            <div class="badge">mRNA序列 mRNA Sequence</div>
            <div class="result" id="dnaResult"></div>
        </div>

        <!-- V字键盘密码 -->
        <div class="card">
            <div class="badge">V字键盘 V-Keyboard</div>
            <div class="result" id="vKeyboardResult"></div>
        </div>

        <!-- QWE密码 -->
        <div class="card">
            <div class="badge">QWE键盘 QWE Keyboard</div>
            <div class="result" id="qweResult"></div>
        </div>

        <!-- Bacon密码 --> 
        <div class="card">
            <div class="badge">Bacon 培根</div>
            <div class="result" id="baconResult"></div>
        </div>

        <!-- 柱状栅栏密码 -->
        <div class="card">
            <div class="badge">柱状栅栏 Columnar Rail Fence</div>
            <input type="number" id="columnarRailCount" placeholder="列数" value="2">
            <div class="result" id="columnarRailResult"></div>
        </div>

        <!-- w型栅栏密码 -->
        <div class="card">
            <div class="badge">W型栅栏 W-Rail Fence</div>
            <input type="number" id="wRailCount" placeholder="层数" value="3">
            <div class="result" id="wRailResult"></div>
        </div>

        <!-- 01248密码 -->
        <div class="card">
            <div class="badge">01248密码 01248 Cipher</div>
            <div class="result" id="cipher01248Result"></div>
        </div>

        <!-- 元音密码 -->
        <div class="card">
            <div class="badge">元音密码 Vowel Cipher</div>
            <div class="result" id="vowelCipherResult"></div>
        </div>

        <!-- ASCII 转换 -->
        <div class="card">
            <div class="badge">ASCII 美国标准信息交换码</div>
            <div class="grid-2">
                <select id="asciiInputType">
                    <option value="char">字符</option>
                    <option value="dec">十进制</option>
                    <option value="hex">十六进制</option>
                    <option value="oct">八进制</option>
                    <option value="bin">二进制</option>
                </select>
                <select id="asciiOutputType">
                    <option value="char">字符</option>
                    <option value="dec">十进制</option>
                    <option value="hex">十六进制</option>
                    <option value="oct">八进制</option>
                    <option value="bin">二进制</option>
                </select>
            </div>
            <div class="result" id="asciiResult"></div>
        </div>

        <!-- 中文电码 -->
        <div class="card">
            <div class="badge">中文电码 Chinese Telegraph Code</div>
            <div class="result" id="cccResult"></div>
        </div>

        <!-- 四角号码 -->
        <div class="card">
            <div class="badge">四角号码 Four Corner Code</div>
            <div class="result" id="fourcccResult"></div>
        </div>

        <!-- ROT 转换 -->
        <div class="card">
            <div class="badge">ROT 旋转加密</div>
            <div class="grid-full">
                <select id="rotOutputType">
                    <option value="char">ROT5</option>
                    <option value="dec">ROT13</option>
                    <option value="hex">ROT18</option>
                    <option value="oct">ROT47</option>
                </select>
            </div>
            <div class="result" id="rotResult"></div>
        </div>

        <!-- Polybius 方阵 -->
        <div class="card">
            <div class="badge">Polybius Square 波利比乌斯方阵</div>
            <div class="grid-full"> 
                <input type="text" id="psAlpha" placeholder="字母" value="abcdefghiklmnopqrstuvwxyz"></div>
            <div class="grid-2"> 
                <input type="number" id="psRows" placeholder="行" value="12345">
                <input type="number" id="psColumns" placeholder="列" value="12345">
            </div>
            <div class="result" id="PolybiusResult"></div>
        </div>

        <!-- ADFGX/ADFVGX -->
        <div class="card">
            <div class="badge">ADFGX/ADFVGX 密码</div>
            <div class="grid-full">
                <input type="text" id="ADFAlpha" placeholder="字母" value="abcdefghiklmnopqrstuvwxyz"></div>
            <div class="grid-2"> 
                <input type="text" id="ADFTranspositionKeyword" placeholder="换位密钥词" value="password">
                <select id="adfCipherType">
                    <option value="ADFGX">ADFGX</option>
                    <option value="ADFVGX">ADFVGX</option>
                </select>
            </div>
            <div class="result" id="ADFGXResult"></div>
        </div>

        <!-- 仿射 -->
        <div class="card">
            <div class="badge">仿射 Affine</div>
            <div class="grid-full">
                <input type="text" id="AffineAlpha" placeholder="字母" value="abcdefghijklmnopqrstuvwxyz"></div>
            <div class="grid-2"> 
                <input type="number" id="Affineslope" placeholder="坡度A" value="5">
                <input type="number" id="AffineIntercept" placeholder="截距B" value="8">
            </div>
            <div class="result" id="AffineResult"></div>
        </div>

        <!-- 敲击码 -->
        <div class="card">
            <div class="badge">敲击码 Tap Code</div>
            <div class="grid-3"> 
                <input type="text" id="tapMark" placeholder="Tap" value=".">
                <input type="text" id="groupMark" placeholder="Group" value="a">
                <input type="text" id="letterMark" placeholder="Letter" value="b">
            </div>
            <div class="result" id="tapCodeResult"></div>
        </div>

        <!-- BifidCipher -->
        <div class="card">
            <div class="badge">BifidCipher 双密码</div>
            <div class="grid-2"> 
                <input type="text" id="BifidCipherkey" placeholder="Key" value="abcdefghiklmnopqrstuvwxyz">
            </div>
            <div class="result" id="BifidCipherResult"></div>
        </div>

        <!-- 旗语-盲文 -->
        <div class="card">
            <div class="badge">旗语-盲文 Semaphore-Braille</div>
            <button class="cyber-button pin-toggle-btn">
                <span class="cyber-button__glitch"></span>
                <span class="cyber-button__tag">置顶</span>
            </button>
            <div class="grid-full2">
                <select id="qiyuType">
                    <option value="semaphore">旗语 (Semaphore)</option>
                    <option value="braille">盲文 (Braille)</option>
                </select>
            </div>
            <div class="grid-full2">
                <input type="text" id="qiyuInput" placeholder="输入字母" value="">
                <button id="qiyuClear" class="cyber-button">
                    <span class="cyber-button__glitch"></span>
                    <span class="cyber-button__tag">刷新</span>
                </button>
            </div>
            <div id="qiyuCanvasContainer" class="input-group" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;"></div>
            <div class="result" id="qiyuResult"></div>
        </div>

        <!-- Base码 -->
        <div class="card">
            <div class="badge">Base 编码</div>
            <div class="grid-full">
                <select id="baseOutputType">
                    <option value="base16">BASE16</option>
                    <option value="base32">BASE32</option>
                    <option value="base64">BASE64</option>
                    <option value="base58">BASE58</option>
                    <option value="base85">BASE85</option>
                    <option value="base91">BASE91</option>
                    <option value="base100">BASE100</option>
                </select>
            </div>
            <div class="result" id="baseEncodeResult"></div>
        </div>
        </div>
    </div>

    <!-- 现代区 -->
    <div id="xiandaiqu" class="submodule">
        <div class="container">

            <!-- 输入 -->
            <div class="card main-input">
            <button class="cyber-button pin-toggle-btn">
                <span class="cyber-button__glitch"></span>
                <span class="cyber-button__tag">置顶</span>
            </button>
            <button class="cyber-button usage-guide-btn">
                <span class="cyber-button__glitch"></span>
                <span class="cyber-button__tag">使用说明</span>
            </button>
            <textarea id="mainInput" placeholder="输入要加密/解密的内容..." autofocus></textarea>
            <div class="quick-nav-container" id="quick-nav-container-xiandaiqu">
                <input type="text" class="quick-nav-input" id="quick-nav-input-xiandaiqu" placeholder="[搜索密码卡片...]" autocomplete="off">
                <div class="quick-nav-options" id="quick-nav-options-xiandaiqu"></div>
            </div>
            </div>

            <!-- MD5 -->
            <div class="card">
                <div class="badge">MD5</div>
                <input type="text" id="MD5Key" placeholder="输入十六进制生成Hmac" value="12 3a bc">
                <div class="result" id="MD5Result"></div>
            </div>

            <!-- SHA-1 -->
            <div class="card">
                <div class="badge">SHA-1</div>
                <input type="text" id="SHA1Key" placeholder="输入十六进制生成Hmac" value="12 3a bc">
                <div class="result" id="SHA1Result"></div>
            </div>

            <!-- SHA-256 -->
            <div class="card">
                <div class="badge">SHA-256</div>
                <input type="text" id="SHA256Key" placeholder="输入十六进制生成Hmac" value="12 3a bc">
                <div class="result" id="SHA256Result"></div>
            </div>

            <!-- SHA-384 -->
            <div class="card">
                <div class="badge">SHA-384</div>
                <input type="text" id="SHA384Key" placeholder="输入十六进制生成Hmac" value="12 3a bc">
                <div class="result" id="SHA384Result"></div>
            </div>

            <!-- SHA-512 -->
            <div class="card">
                <div class="badge">SHA-512</div>
                <input type="text" id="SHA512Key" placeholder="输入十六进制生成Hmac" value="12 3a bc">
                <div class="result" id="SHA512Result"></div>
            </div>

            <!-- Enigma 具体子布局在3_Enigma.js里-->
            <div class="card">
                <div class="badge">Enigma恩尼格玛</div>
                <select id="enigmaModel" class="grid-3" onchange="updateEnigmaLayout()"></select>
                <div id="rotorSettings"></div>
                
                <!-- 插板 有些机型是不需要的，也纳入动态子布局里 -->
                <div class="grid-full2">
                    <input type="text" id="Plugboard" placeholder="插板" value="bq cr di ej kw mt os">
                </div>
                <div class="result" id="EnigmaResult"></div>
            </div>
        </div>
    </div>

    <!-- 逻辑谜题区 -->
    <div id="luojimiti" class="submodule">
        <!-- 内容将由 logic_module.js 动态加载 -->
    </div>
    
    <!-- 词汇区 -->
    <div id="cihuiqu" class="submodule">
        <!-- 内容将由 wordsearch.js 动态加载 -->
    </div>

        <!-- 预留区 -->
    <div id="yuliu" class="submodule">
        <div class="container">
            <div class="card">
                <div class="result">词汇爆破内容...</div>
            </div>
        </div>
    </div>

        </div>
    </div>

</div>`,

    // 电子实验室模块
    electroniclab: `
    <div id="electroniclab-content" class="content-section">
        <div class="module-header">
            <h2 class="neon-title" data-text="CIPHER LABORATORY">ELECTRONIC LABORATORY</h2>
            <div class="source-selector-container"">
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
                        <div class="wf-toolbar-category-title">基础节点</div>
                        <div class="wf-toolbar-item" data-type="input"><span class="wf-item-icon" style="background:#3498db;box-shadow:0 0 6px #3498db"></span>📝 输入节点</div>
                        <div class="wf-toolbar-item" data-type="output"><span class="wf-item-icon" style="background:#9b59b6;box-shadow:0 0 6px #9b59b6"></span>📤 输出节点</div>
                    </div>
                    <div class="wf-toolbar-category">
                        <div class="wf-toolbar-category-title">经典密码</div>
                        <div class="wf-toolbar-item" data-algo="Caesar凯撒">🔐 Caesar 凯撒</div>
                        <div class="wf-toolbar-item" data-algo="Vigenere维吉尼亚">🔐 Vigenere 维吉尼亚</div>
                        <div class="wf-toolbar-item" data-algo="RailFence栅栏">🔐 RailFence 栅栏</div>
                        <div class="wf-toolbar-item" data-algo="Bifid双歧">🔐 Bifid 双歧</div>
                        <div class="wf-toolbar-item" data-algo="AtBash埃特巴什">🔐 AtBash 埃特巴什</div>
                        <div class="wf-toolbar-item" data-algo="Morse摩尔斯">🔐 Morse 摩尔斯</div>
                        <div class="wf-toolbar-item" data-algo="Bacon培根">🔐 Bacon 培根</div>
                        <div class="wf-toolbar-item" data-algo="QWE键盘">🔐 QWE 键盘</div>
                        <div class="wf-toolbar-item" data-algo="PhoneKey九键">🔐 手机九键</div>
                        <div class="wf-toolbar-item" data-algo="VKeyboard">🔐 V字键盘</div>
                        <div class="wf-toolbar-item" data-algo="Cipher01248">🔐 01248密码</div>
                        <div class="wf-toolbar-item" data-algo="Vowel元音">🔐 元音密码</div>
                        <div class="wf-toolbar-item" data-algo="DNA_mRNA">🔐 DNA/mRNA</div>
                        <div class="wf-toolbar-item" data-algo="ColRail柱栅栏">🔐 柱状栅栏</div>
                        <div class="wf-toolbar-item" data-algo="WRail-W栅栏">🔐 W型栅栏</div>
                    </div>
                    <div class="wf-toolbar-category">
                        <div class="wf-toolbar-category-title">编码 & 哈希</div>
                        <div class="wf-toolbar-item" data-algo="Base编码">🔐 Base 编码</div>
                        <div class="wf-toolbar-item" data-algo="ROT旋转">🔐 ROT 旋转</div>
                        <div class="wf-toolbar-item" data-algo="CCC中文电码">🔐 中文电码</div>
                        <div class="wf-toolbar-item" data-algo="MD5">🔐 MD5</div>
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
            <button id="zstp-import-btn" class="zstp-import-btn">项目导入</button>
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
                    <textarea id="user-input" placeholder="输入您的问题..." autofocus></textarea>
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
    const scripts = [
        './electronic/electronic_lab.js',
        './cipher/1_cipherlab.js',
        './cipher/2_ADFGXCipher.js',
        './cipher/3_Enigma.js',
        './cipher/4_MD5.js',
        './cipher/6_semaphore.js',
        './0_sidebar_funtion.js',
        './cipher/999_funtion.js',
        './model/DeepSeekClient.js',
        './model/ToolRegistry.js',
        './model/ChatUI.js',
        './model/HistoryManager.js',
        './model/main.js',
        './workflow/workflow.js',
        './zhishitupu/graphData.js',
        './zhishitupu/zhishitupu.js',
        './wordsearch/wordsearch.js',
        './sendfeedback/sendfeedback.js',
        './logic/logicdiv/0_logic_ui.js',
        './logic/logicdiv/1_sudoku_ui.js',
        './logic/logicdiv/2_akari_ui.js',
        './logic/logicdiv/3_aqre_ui.js',
        './logic/logicdiv/4_aquapelago_ui.js',
        './logic/logicdiv/logic_module.js',
        './logic/js/1_sudoku.js',
        './logic/js/2_Akari.js',
        './logic/js/3_Aqre.js',
        './logic/js/4_aquapelago.js',
        './logic/logicdiv/5_aquarium_ui.js',
        './logic/js/5_aquarium.js',
        './logic/logicdiv/6_balanceloop_ui.js',
        './logic/js/6_balanceloop.js',
        './logic/logicdiv/7_battleship_ui.js',
        './logic/js/7_battleship.js',
        './logic/logicdiv/8_binairo_ui.js',
        './logic/js/8_binairo.js',
        './logic/logicdiv/9_castlewall_ui.js',
        './logic/js/9_castlewall.js',
        './logic/logicdiv/10_cave_ui.js',
        './logic/js/10_cave.js',
        './logic/logicdiv/11_chocobanana_ui.js',
        './logic/js/11_chocobanana.js',
        './logic/logicdiv/12_chocona_ui.js',
        './logic/js/12_chocona.js',
        './logic/logicdiv/14_doppelblock_ui.js',
        './logic/js/14_doppelblock.js',
        './logic/logicdiv/13_countryroad_ui.js',
        './logic/js/13_countryroad.js',
        './logic/logicdiv/15_easyas_ui.js',
        './logic/js/15_easyas.js',
        './logic/logicdiv/16_fillomino_ui.js',
        './logic/js/16_fillomino.js',
        './logic/logicdiv/19_gokigen_ui.js',
        './logic/js/19_gokigen.js',
        './logic/logicdiv/20_haisu_ui.js',
        './logic/js/20_haisu.js',
        './logic/logicdiv/21_haisuslow_ui.js',
        './logic/js/21_haisuslow.js',
        './logic/logicdiv/22_hamle_ui.js',
        './logic/js/22_hamle.js',
        './logic/logicdiv/23_hashi_ui.js',
        './logic/js/23_hashi.js',
        './logic/logicdiv/24_heteromino_ui.js',
        './logic/js/24_heteromino.js',
        './logic/logicdiv/25_heyawake_ui.js',
        './logic/js/25_heyawake.js',
        './logic/logicdiv/26_hitori_ui.js',
        './logic/js/26_hitori.js',
        './logic/logicdiv/27_hotaru_ui.js',
        './logic/js/27_hotaru.js',
        './logic/logicdiv/28_kakuro_ui.js',
        './logic/js/28_kakuro.js',
        './logic/logicdiv/29_kuromasu_ui.js',
        './logic/js/29_kuromasu.js',
        './logic/logicdiv/30_kurotto_ui.js',
        './logic/js/30_kurotto.js',
        './logic/logicdiv/31_lits_ui.js',
        './logic/js/31_lits.js',
        './logic/logicdiv/32_magnets_ui.js',
        './logic/js/32_magnets.js',
        './logic/logicdiv/33_masyu_ui.js',
        './logic/js/33_masyu.js',
        './logic/logicdiv/34_minesweeper_ui.js',
        './logic/js/34_minesweeper.js',
        './logic/logicdiv/35_moonsun_ui.js',
        './logic/js/35_moonsun.js',
        './logic/logicdiv/36_nagare_ui.js',
        './logic/js/36_nagare.js',
        './logic/logicdiv/37_nanro_ui.js',
        './logic/js/37_nanro.js',
        './logic/logicdiv/38_ncells_ui.js',
        './logic/js/38_ncells.js',
        './logic/logicdiv/39_nonogram_ui.js',
        './logic/js/39_nonogram.js',
        './logic/logicdiv/40_norinori_ui.js',
        './logic/js/40_norinori.js',
        './logic/logicdiv/41_numberlink_ui.js',
        './logic/js/41_numberlink.js',
    ];

    const loadVersion = new Date().getTime();
    Promise.all(scripts.map(src => new Promise(resolve => {
        const script = document.createElement('script');
        script.src = src + '?v=' + loadVersion;
        script.onload = resolve;
        //异步加载，提高并行度
        document.body.appendChild(script);
    }))).then(() => {
        if (typeof initSearchFunction === 'function') initSearchFunction();
        if (typeof initWordSearch === 'function') initWordSearch();
        if (typeof initSendFeedback === 'function') initSendFeedback();
        if (typeof initLogicModule === 'function') initLogicModule();

        // 初始化大模型功能
        if (typeof initChatFunctions === 'function') {
            initChatFunctions();
        }

        // 初始化工作流
        initWorkflowCoze();
        // 初始化电子实验室
        if (typeof initElectronicLab === 'function') initElectronicLab();

        // 初始化作者页面功能 (图片预览)
        if (typeof initAuthorPage === 'function') initAuthorPage();
    });

    if (!MODULES) return console.error('模块内容未定义');
    ['jiamishiyanshi', 'electroniclab', 'workflow', 'zhishitupu', 'damoxing', 'yijianfankui'].forEach(id =>
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

        // 大模型特殊处理
        if (typeof initChatFunctions === 'function') {
            initChatFunctions();
        } else if (typeof bindChatEvents === 'function') {
            bindChatEvents();
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
