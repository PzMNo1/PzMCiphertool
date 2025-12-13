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

    <div id="mimaqu" class="submodule active">
        <div class="container">
        
        <div class="card main-input">
            <div class="badge">输入</div>
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
                <div class="badge">输入</div>
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
        <div class="container">
            <a href="./logic/1_sudoku.html" class="logic-btn">数独</a>
            <a href="./logic/2_Akari.html" class="logic-btn">Akari</a>
            <a href="./logic/3_Aqre.html" class="logic-btn">Aqre</a>
            <a href="./logic/4_aquapelago.html" class="logic-btn">aquapelago</a>
            <a href="./logic/5_aquarium.html" class="logic-btn">aquarium</a>
            <a href="./logic/6_balanceloop.html" class="logic-btn">balanceloop</a>
            <a href="./logic/7_battleship.html" class="logic-btn">battleship</a>
            <a href="./logic/8_binairo.html" class="logic-btn">binairo</a>
            <a href="./logic/9_castlewall.html" class="logic-btn">castlewall</a>
            <a href="./logic/10_cave.html" class="logic-btn">cave</a>
            <a href="./logic/11_chocobanana.html" class="logic-btn">chocobanana</a>
            <a href="./logic/12_chocona.html" class="logic-btn">chocona</a>
            <a href="./logic/15_countryroad.html" class="logic-btn">countryroad</a>
            <a href="./logic/16_doppelblock.html" class="logic-btn">doppelblock</a>
            <a href="./logic/17_easyas.html" class="logic-btn">easyas</a>
            <a href="./logic/18_fillomino.html" class="logic-btn">fillomino</a>
            <a href="./logic/19_gokigen.html" class="logic-btn">gokigen</a>
            <a href="./logic/20_haisu.html" class="logic-btn">haisu</a>
            <a href="./logic/21_haisuslow.html" class="logic-btn">haisuslow</a>
            <a href="./logic/22_hamle.html" class="logic-btn">hamle</a>
            <a href="./logic/23_hashi.html" class="logic-btn">hashi</a>
            <a href="./logic/24_heteromino.html" class="logic-btn">heteromino</a>
            <a href="./logic/25_heyawake.html" class="logic-btn">heyawake</a>
            <a href="./logic/26_hitori.html" class="logic-btn">hitori</a>
            <a href="./logic/27_hotaru.html" class="logic-btn">hotaru</a>
            <a href="./logic/28_kakuro.html" class="logic-btn">kakuro</a>
            <a href="./logic/29_kuromasu.html" class="logic-btn">kuromasu</a>
            <a href="./logic/30_kurotto.html" class="logic-btn">kurotto</a>
            <a href="./logic/31_lits.html" class="logic-btn">lits</a>
            <a href="./logic/32_magnets.html" class="logic-btn">magnets</a>
            <a href="./logic/33_masyu.html" class="logic-btn">masyu</a>
            <a href="./logic/34_minesweeper.html" class="logic-btn">minesweeper</a>
            <a href="./logic/35_moonsun.html" class="logic-btn">moonsun</a>
            <a href="./logic/36_nagare.html" class="logic-btn">nagare</a>
            <a href="./logic/37_nanro.html" class="logic-btn">nanro</a>
            <a href="./logic/38_ncells.html" class="logic-btn">ncells</a>
            <a href="./logic/39_nonogram.html" class="logic-btn">nonogram</a>
            <a href="./logic/40_norinori.html" class="logic-btn">norinori</a>
            <a href="./logic/41_numberlink.html" class="logic-btn">numberlink</a>
            <a href="./logic/42_nuribou.html" class="logic-btn">nuribou</a>
            <a href="./logic/43_nurikabe.html" class="logic-btn">nurikabe</a>
            <a href="./logic/44_nurimisaki.html" class="logic-btn">nurimisaki</a>
            <a href="./logic/45_onsen.html" class="logic-btn">onsen</a>
            <a href="./logic/46_rippleeffect.html" class="logic-btn">rippleeffect</a>
            <a href="./logic/47_shakashaka.html" class="logic-btn">shakashaka</a>
            <a href="./logic/48_shikaku.html" class="logic-btn">shikaku</a>
            <a href="./logic/49_shimaguni.html" class="logic-btn">shimaguni</a>
            <a href="./logic/50_skyscrapers.html" class="logic-btn">skyscrapers</a>
            <a href="./logic/51_slitherlink.html" class="logic-btn">slitherlink</a>
            <a href="./logic/52_spiralgalaxies.html" class="logic-btn">spiralgalaxies</a>
            <a href="./logic/53_starbattle.html" class="logic-btn">starbattle</a>
            <a href="./logic/54_statuepark.html" class="logic-btn">statuepark</a>
            <a href="./logic/55_stostone.html" class="logic-btn">stostone</a>
            <a href="./logic/56_tapa.html" class="logic-btn">tapa</a>
            <a href="./logic/57_tatamibari.html" class="logic-btn">tatamibari</a>
            <a href="./logic/58_tents.html" class="logic-btn">tents</a>
            <a href="./logic/59_tll.html" class="logic-btn">tll</a>
            <a href="./logic/60_tren.html" class="logic-btn">tren</a>
            <a href="./logic/61_yajilin.html" class="logic-btn">yajilin</a>
            <a href="./logic/62_yajisankazusan.html" class="logic-btn">yajisankazusan</a>
            <a href="./logic/63_yinyang.html" class="logic-btn">yinyang</a>
        </div>
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
        <div class="workflow-header">
            <h2 class="neon-title">WORKFLOW STUDIO</h2>
        </div>

        <div class="card main-input">
            <div class="badge">全局输入</div>
            <button class="cyber-button pin-toggle-btn">
                <span class="cyber-button__glitch"></span>
                <span class="cyber-button__tag">置顶</span>
            </button>
            <button class="cyber-button usage-guide-btn">
                <span class="cyber-button__glitch"></span>
                <span class="cyber-button__tag">使用说明</span>
            </button>
            <textarea id="mainInputCoze" placeholder="输入要处理的内容 (所有工作流将共用此输入)..." autofocus></textarea>
        </div>

        <div id="workflow-list">
            </div>

        <div class="global-controls">
            <button class="cyber-button" id="addNewWorkflowBtn">
                <span class="cyber-button__tag">+ 添加新工作流组</span>
            </button>
        </div>
    </div>
`,

    // 知识图谱模块
    zhishitupu: `<div id="zhishitupu-content" class="content-section">
        <div id="zstp-vignette"></div>

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

        <div id="guanyuzuozhe" class="lianxiwomen-submodule active">
            <div class="container">
                <div class="card">
                    <div class="badge">关于作者</div>
                        <p>这里是关于作者的内容...</p>
                </div>
            </div>
        </div>

        <div id="zuozhecaifang" class="lianxiwomen-submodule">
            <div class="container">
                <div class="card">
                    <div class="badge">作者采访</div>
                        <p>这里是作者采访的内容...</p>
                </div>
            </div>
        </div>

        <div id="yijianfankui" class="lianxiwomen-submodule">
            <div class="container">
                <div class="card">
                    <div class="badge">意见反馈</div>
                        <p>这里是意见反馈的内容...</p>
                </div>
            </div>
        </div>

        <div id="kaifarizhi" class="lianxiwomen-submodule">
            <div class="container">
                <div class="card">
                    <div class="badge">开发日志</div>
                        <p>这里是开发日志的内容...</p>
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
        './model/script.js',
        './workflow/workflow.js',
        './zhishitupu/zhishitupu.js',
        './wordsearch/wordsearch.js',
    ];

    Promise.all(scripts.map(src => new Promise(resolve => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            //异步加载，提高并行度
            document.body.appendChild(script);
        }))).then(() => {
                if (typeof initSearchFunction === 'function') initSearchFunction();
        if (typeof initWordSearch === 'function') initWordSearch();
        
        // 初始化大模型功能
        if (typeof initChatFunctions === 'function') {
            initChatFunctions();
        }
        
        // 初始化工作流
        initWorkflowCoze();
        // 初始化电子实验室
        if (typeof initElectronicLab === 'function') initElectronicLab();
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
                if(typeof initKnowledgeGraph === 'function') {
                    initKnowledgeGraph();
                }
            }, 50);  
        }

        // 大模型特殊处理
        if (id === 'damoxing' && typeof bindChatEvents === 'function') {
            bindChatEvents(); 
        }
    };

    showModule('jiamishiyanshi');
    document.querySelectorAll('.menu-item').forEach(item => 
        item.addEventListener('click', e => {
            e.preventDefault();
            showModule(item.getAttribute('data-target'));
        })
    );
});



