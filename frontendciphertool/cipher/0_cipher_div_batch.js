(function () {
  window.CIPHER_LAB_DIV_BATCH = `
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
            <button type="button" id="caesarBruteBtn" class="cyber-button" onclick="window.toggleCaesarBruteforce && window.toggleCaesarBruteforce()">
                <span class="cyber-button__glitch"></span>
                <span class="cyber-button__tag">一键枚举 25 位</span>
            </button>
            <div class="result" id="caesarResult"></div>
        </div>
        <!-- 维吉尼亚密码 -->
        <div class="card">
            <div class="badge">维吉尼亚 Vigenère</div>
            <div class="grid-2">
                <input type="text" id="vigenereKey" placeholder="输入密钥">
                <select id="vigenereVariant">
                    <option value="vigenere">Vigenère</option>
                    <option value="beaufort">Beaufort</option>
                    <option value="variantBeaufort">Variant Beaufort</option>
                    <option value="autokey">Autokey</option>
                    <option value="gronsfeld">Gronsfeld</option>
                    <option value="porta">Porta</option>
                </select>
            </div>
            <div class="result" id="vigenereResult"></div>
        </div>
        <!-- 栅栏密码 -->
        <div class="card">
            <div class="badge">栅栏 Rail Fence</div>
            <div class="grid-3">
                <input type="number" id="railCount" placeholder="层数/列数" value="3">
                <input type="text" id="railKey" placeholder="换位密钥" value="BALLOON">
                <select id="railVariant">
                    <option value="railFence">Rail Fence</option>
                    <option value="route">Route Transposition</option>
                    <option value="scytale">Scytale</option>
                    <option value="amsco">AMSCO</option>
                    <option value="myszkowski">Myszkowski</option>
                </select>
            </div>
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

        <!-- A1Z26 字母序号 -->
        <div class="card">
            <div class="badge">A1Z26 字母序号</div>
            <div class="grid-full">
                <select id="a1z26Mode">
                    <option value="a1">A=1, Z=26</option>
                    <option value="a0">A=0, Z=25</option>
                </select>
            </div>
            <div class="result" id="a1z26Result"></div>
        </div>
        <!-- 摩尔斯电码 -->
        <div class="card">
            <div class="badge">摩尔斯 Morse</div>
            <div class="grid-2">
                <select id="morseVariant">
                    <option value="morse">Morse</option>
                    <option value="fractionated">Fractionated Morse</option>
                </select>
                <input type="text" id="morseKey" placeholder="Fractionated Morse 密钥" value="KEYWORD">
            </div>
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

        <!-- Pigpen / 跳舞的小人密码 -->
        <div class="card">
            <div class="badge">Pigpen / 跳舞的小人 符号密码</div>
            <div class="grid-2">
                <select id="symbolCipherType">
                    <option value="pigpen">Pigpen 共济会密码</option>
                    <option value="dancingMen">跳舞的小人 Dancing Men</option>
                </select>
                <input type="text" id="symbolCipherInput" placeholder="点击刷新展开符号面板，或直接输入字母" value="">
            </div>
            <div class="grid-2">
                <button type="button" id="symbolCipherBackspace" class="cyber-button">
                    <span class="cyber-button__glitch"></span>
                    <span class="cyber-button__tag">退格</span>
                </button>
                <button type="button" id="symbolCipherRefresh" class="cyber-button">
                    <span class="cyber-button__glitch"></span>
                    <span class="cyber-button__tag">刷新符号面板</span>
                </button>
            </div>
            <div id="symbolCipherPanel" class="input-group" style="display:none;"></div>
            <div class="result" id="symbolCipherResult"></div>
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

        <!-- 汉字编码卡组（原中文电码卡，合并了区位码/GB2312/GBK/GB18030/康熙部首） -->
        <div class="card">
            <div class="badge">汉字编码卡组 电码/区位/GBK/部首</div>
            <div class="result" id="hanziResult"></div>
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
                    <option value="rot5">ROT5</option>
                    <option value="rot13">ROT13</option>
                    <option value="rot18">ROT18</option>
                    <option value="rot47">ROT47</option>
                </select>
            </div>
            <div class="result" id="rotResult"></div>
        </div>

        <!-- Polybius 方阵 -->
        <div class="card">
            <div class="badge">Polybius Square 波利比乌斯方阵</div>
            <div class="grid-full">
                <select id="polybiusVariant">
                    <option value="polybius">Polybius</option>
                    <option value="bifid">Bifid-like</option>
                    <option value="trifid">Extended</option>
                </select>
            </div>
            <div class="grid-full"> 
                <input type="text" id="psAlpha" placeholder="字母" value="abcdefghiklmnopqrstuvwxyz"></div>
            <div class="grid-2"> 
                <input type="number" id="psRows" placeholder="行" value="12345">
                <input type="number" id="psColumns" placeholder="列" value="12345">
            </div>
            <div class="grid-3">
                <input type="text" id="polybiusKeyA" placeholder="密钥 A" value="keyword">
                <input type="text" id="polybiusKeyB" placeholder="密钥 B" value="cipher">
                <input type="number" id="polybiusPeriod" placeholder="周期" value="5">
            </div>
            <div class="result" id="PolybiusResult"></div>
        </div>

        <!-- Playfair -->
        <div class="card">
            <div class="badge">Playfair 普莱菲尔</div>
            <input type="text" id="playfairKey" placeholder="密钥" value="keyword">
            <div class="result" id="playfairResult"></div>
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

            <!-- Substitution 替换分析助手 -->
            <div class="card">
                <div class="badge">Substitution 替换分析助手</div>
                <div class="grid-2">
                    <input type="text" id="substPlainAlphabet" placeholder="明文字母表" value="abcdefghijklmnopqrstuvwxyz">
                    <input type="text" id="substCipherAlphabet" placeholder="密文字母表" value="qwertyuiopasdfghjklzxcvbnm">
                </div>
                <input type="text" id="substManualMap" placeholder="手动映射: A=E B=T 或 ABC=ETA">
                <div class="grid-2">
                    <input type="text" id="substCribCipher" placeholder="crib 密文片段">
                    <input type="text" id="substCribPlain" placeholder="crib 明文片段">
                </div>
                <div class="result" id="substitutionResult"></div>
            </div>

            <!-- Hill Cipher -->
            <div class="card">
                <div class="badge">Hill Cipher 希尔密码</div>
                <div class="grid-2">
                    <select id="hillSize">
                        <option value="2">2x2</option>
                        <option value="3">3x3</option>
                    </select>
                    <input type="text" id="hillKey" placeholder="矩阵密钥" value="3 3 2 5">
                </div>
                <div class="result" id="hillResult"></div>
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

    <!-- 分析区 -->
    <div id="fenxiqu" class="submodule">
        <div class="container">
            <div class="card main-input">
                <button class="cyber-button pin-toggle-btn">
                    <span class="cyber-button__glitch"></span>
                    <span class="cyber-button__tag">置顶</span>
                </button>
                <button class="cyber-button usage-guide-btn" data-guide-id="fenxiqu">
                    <span class="cyber-button__glitch"></span>
                    <span class="cyber-button__tag">使用说明</span>
                </button>
                <textarea id="mainInput" placeholder="[输入待处理的文本...]"></textarea>
                <div class="quick-nav-container" id="quick-nav-container-fenxiqu" data-quick-nav="fenxiqu">
                    <input type="text" class="quick-nav-input" id="quick-nav-input-fenxiqu" placeholder="[搜索密码卡片...]" autocomplete="off">
                    <div class="quick-nav-options" id="quick-nav-options-fenxiqu"></div>
                </div>
            </div>
        <!-- 批量索引器 -->
        <div class="card">
            <div class="badge">批量索引器</div>
            <div class="grid-2">
                <input type="text" id="anIndices" placeholder="索引数字，如 2 3 1（留空则用取字规则）" autocomplete="off">
                <select id="anIndexBase">
                    <option value="1">索引从 1 开始</option>
                    <option value="0">索引从 0 开始</option>
                </select>
            </div>
            <div class="grid-2">
                <select id="anIndexMode">
                    <option value="nth">按索引数字取字</option>
                    <option value="first">取首字母</option>
                    <option value="last">取末字母</option>
                    <option value="middle">取中间字母</option>
                    <option value="diagonal">对角化（1,2,3…）</option>
                    <option value="all">列出每个条目的所有字母</option>
                </select>
                <select id="anSortKey">
                    <option value="none">不排序（保持原顺序）</option>
                    <option value="alpha">按字母序</option>
                    <option value="alphaDesc">按字母倒序</option>
                    <option value="len">按长度</option>
                    <option value="lenDesc">按长度倒序</option>
                    <option value="last">按末字母</option>
                    <option value="sum">按字母序号之和</option>
                    <option value="pinyin">按汉字拼音</option>
                </select>
            </div>
            <div class="result" id="anIndexerResult"></div>
        </div>
        <!-- 口味分析 -->
        <div class="card">
            <div class="badge">口味分析</div>
            <div class="result" id="anFlavorResult"></div>
        </div>
        <!-- 枚举查验 -->
        <div class="card">
            <div class="badge">枚举查验</div>
            <div class="grid-2">
                <input type="text" id="anEnumSpec" placeholder="枚举写法，例如 (3 6 2 4) 或 (5)" autocomplete="off">
                <input type="text" id="anEnumAnswer" placeholder="待校验的答案" autocomplete="off">
            </div>
            <div class="result" id="anEnumResult"></div>
        </div>
        <!-- 字母审计 -->
        <div class="card">
            <div class="badge">字母审计</div>
            <div class="grid-2">
                <input type="text" id="anAuditUsed" placeholder="已经用过的列号，例如 1,2" autocomplete="off">
            </div>
            <div class="result" id="anAuditResult"></div>
        </div>
        <!-- 米格密码 -->
        <div class="card">
            <div class="badge">米格密码</div>
            <div class="grid-2">
                <select id="migeSelect"></select>
            </div>
            <div class="result" id="migeResult"></div>
        </div>
        <!-- 拼音工具 -->
        <div class="card">
            <div class="badge">拼音工具</div>
            <div class="grid-2">
                <select id="pyMode">
                    <option value="all">全拼（带声调）</option>
                    <option value="plain">全拼（无声调）</option>
                    <option value="initial">声母</option>
                    <option value="final">韵母</option>
                    <option value="tone">声调数字</option>
                    <option value="abbr">首字母缩写</option>
                    <option value="homophone">谐音候选（同声母韵母）</option>
                    <option value="reverse">反查：按拼音找字</option>
                </select>
            </div>
            <div class="result" id="pyResult"></div>
        </div>
        <!-- 汉字属性 -->
        <div class="card">
            <div class="badge">汉字属性</div>
            <div class="grid-2">
                <select id="hzAttrMode">
                    <option value="attrs">查字的读音与声调</option>
                    <option value="tone">按声调找字</option>
                </select>
            </div>
            <div class="result" id="hzAttrResult"></div>
        </div>
        <!-- XOR 破解 -->
        <div class="card">
            <div class="badge">XOR 破解</div>
            <div class="grid-3">
                <select id="xorInputMode">
                    <option value="text">输入是文本</option>
                    <option value="hex">输入是十六进制</option>
                    <option value="dec">输入是十进制字节</option>
                </select>
                <input type="number" id="xorMaxLen" placeholder="最大密钥长度" value="32" min="1" max="64">
                <input type="text" id="xorCrib" placeholder="已知明文片段，例如 flag{（可选）">
            </div>
            <div class="result" id="xorResult"></div>
        </div>
        <!-- 统计分析 -->
        <div class="card">
            <div class="badge">统计分析</div>
            <select id="statsInputMode">
                <option value="text">按文本统计</option>
                <option value="hex">按十六进制字节统计</option>
            </select>
            <div class="result" id="statsResult"></div>
        </div>
        <!-- 维吉尼亚分析 -->
        <div class="card">
            <div class="badge">维吉尼亚分析</div>
            <div class="grid-2">
                <select id="vigInputMode">
                    <option value="text">输入是密文文本</option>
                    <option value="letters">输入含空格标点，只取字母</option>
                </select>
                <input type="number" id="vigMaxLen" placeholder="最大密钥长度" value="20" min="2" max="40">
            </div>
            <div class="result" id="vigResult"></div>
        </div>
        <!-- 卡辛斯基检验 -->
        <div class="card">
            <div class="badge">卡辛斯基检验</div>
            <div class="grid-2">
                <input type="number" id="kasMinLen" placeholder="重复片段最小长度" value="3" min="2" max="8">
                <input type="number" id="kasMaxSeq" placeholder="最多列出几条重复片段" value="20" min="5" max="60">
            </div>
            <div class="result" id="kasResult"></div>
        </div>
        <!-- 自动解密 -->
        <div class="card">
            <div class="badge">自动解密</div>
            <div class="grid-3">
                <input type="number" id="autoDepth" placeholder="最大层数" value="3" min="1" max="5">
                <input type="number" id="autoBeam" placeholder="每层保留分支数" value="8" min="1" max="30">
                <input type="text" id="autoCustomFlag" placeholder="自定义 flag 正则，例如 \\w+\\{.*?\\}" autocomplete="off">
            </div>
            <div class="result" id="autoResult"></div>
        </div>
        <!-- 图像识别 -->
        <div class="card">
            <div class="badge">图像识别</div>
            <div class="grid-2">
                <input type="file" id="imgFile" accept="image/*">
                <select id="imgOp">
                    <option value="">— 选择处理方式 —</option>
                    <option value="rot90">旋转 90°</option>
                    <option value="rot180">旋转 180°</option>
                    <option value="rot270">旋转 270°</option>
                    <option value="fliph">水平翻转</option>
                    <option value="flipv">垂直翻转</option>
                    <option value="invert">反色</option>
                    <option value="gray">灰度</option>
                    <option value="bright">提亮</option>
                    <option value="dark">压暗</option>
                    <option value="boost">增强对比度</option>
                    <option value="chR">只看 R 通道</option>
                    <option value="chG">只看 G 通道</option>
                    <option value="chB">只看 B 通道</option>
                    <option value="chA">只看 A 通道（透明度）</option>
                    <option value="diffRG">R−G 相减</option>
                    <option value="diffRB">R−B 相减</option>
                    <option value="diffGB">G−B 相减</option>
                    <option value="bit0">位平面 0（最低位）</option>
                    <option value="bit1">位平面 1</option>
                    <option value="bit2">位平面 2</option>
                    <option value="bit3">位平面 3</option>
                    <option value="bit4">位平面 4</option>
                    <option value="bit5">位平面 5</option>
                    <option value="bit6">位平面 6</option>
                    <option value="bit7">位平面 7（最高位）</option>
                    <option value="grid">叠加网格 / 遮罩</option>
                    <option value="reset">回到原图</option>
                </select>
            </div>
            <div class="grid-3">
                <input type="number" id="imgGridCols" placeholder="网格列数" value="8" min="1" max="64">
                <input type="number" id="imgGridRows" placeholder="网格行数" value="8" min="1" max="64">
                <input type="number" id="imgGain" placeholder="相减放大倍数" value="4" min="1" max="64">
            </div>
            <div class="grid-2">
                <select id="imgLsbChannel">
                    <option value="0">LSB 取 R 通道</option>
                    <option value="1">LSB 取 G 通道</option>
                    <option value="2">LSB 取 B 通道</option>
                    <option value="3">LSB 取 A 通道</option>
                </select>
                <input type="number" id="imgLsbBit" placeholder="取第几位（0=最低）" value="0" min="0" max="7">
            </div>
            <div id="imgInfo" style="opacity:.7;font-size:.75rem;margin-top:.3rem;">尚未载入图片</div>
            <div id="imgOutput" style="margin-top:.6rem;overflow:auto;max-height:70vh;"></div>
            <div class="result" id="imgResult"></div>
        </div>
        </div>
    </div>
    `;

  window.CIPHER_CARD_DEFS = [];
  window.registerCard = function (def) {
    if (def && def.id) window.CIPHER_CARD_DEFS.push(def);
  };

  window.CIPHER_SCRIPT_BATCH = [
    './cipher/1_cipherlab.js',
    './cipher/2_ADFGXCipher.js',
    './cipher/3_Enigma.js',
    './cipher/4_MD5.js',
    './cipher/6_semaphore.js',
    './cipher/777_cardindex.js',
    './cipher/10_analyze_cards.js',
    './cipher/999_fenxi_funtion.js',
    './cipher/shiyongshuoming/shiyongshuoming.js',
    './cipher/999_funtion.js'
  ];

  window.loadCipherScriptBatch = function (loadBatch) {
    if (typeof loadBatch !== 'function') return Promise.resolve([]);
    const setupScript = './cipher/999_funtion.js';
    const dependencyScripts = window.CIPHER_SCRIPT_BATCH.filter(src => src !== setupScript);
    return loadBatch(dependencyScripts).then(() => loadBatch([setupScript]));
  };
})();