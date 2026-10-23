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
                    <option value="runningKey">Running Key 文本密钥</option>
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
            <select id="phoneMode">
                <option value="coord">键位坐标 (21/22)</option>
                <option value="multitap">多击 T9 (2/22/222)</option>
            </select>
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
            <select id="qweMode">
                <option value="qwe">QWE 字母替换</option>
                <option value="coord">键盘坐标 (1-1)</option>
                <option value="shiftLeft">整体左移一格</option>
                <option value="shiftRight">整体右移一格</option>
            </select>
            <div class="result" id="qweResult"></div>
        </div>

        <div class="card">
            <div class="badge">键盘布局 Keyboard Layout</div>
            <select id="kbdLayout">
                <option value="dvorak">Dvorak</option>
                <option value="azerty">AZERTY</option>
                <option value="colemak">Colemak</option>
            </select>
            <div class="result" id="kbdResult"></div>
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

        <!-- 汉字编码拆分为独立卡片 -->
        <div class="card">
            <div class="badge">中文电码 Chinese Telegraph Code</div>
            <div class="result" id="cccResult"></div>
        </div>

        <div class="card">
            <div class="badge">区位码 Quwei</div>
            <div class="result" id="quweiResult"></div>
        </div>

        <div class="card">
            <div class="badge">GB2312</div>
            <div class="result" id="gb2312Result"></div>
        </div>

        <div class="card">
            <div class="badge">GBK</div>
            <div class="result" id="gbkResult"></div>
        </div>

        <div class="card">
            <div class="badge">GB18030</div>
            <div class="result" id="gb18030Result"></div>
        </div>

        <div class="card">
            <div class="badge">康熙部首 Kangxi Radicals</div>
            <div class="result" id="radicalResult"></div>
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
                    <option value="fourSquare">Four-square</option>
                    <option value="twoSquare">Two-square</option>
                    <option value="nihilist">Nihilist</option>
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
                    <option value="base45">BASE45</option>
                    <option value="base58">BASE58</option>
                    <option value="base62">BASE62</option>
                    <option value="base64">BASE64</option>
                    <option value="base85">BASE85</option>
                    <option value="base91">BASE91</option>
                    <option value="base100">BASE100</option>
                </select>
            </div>
            <div class="result" id="baseEncodeResult"></div>
        </div>

        <!-- Quagmire I-IV -->
        <div class="card">
            <div class="badge">Quagmire I–IV</div>
            <div class="grid-2">
                <select id="quagmireVariant">
                    <option value="quagmire1">Quagmire I</option>
                    <option value="quagmire2">Quagmire II</option>
                    <option value="quagmire3">Quagmire III</option>
                    <option value="quagmire4">Quagmire IV</option>
                </select>
                <input type="text" id="quagmireKeyA" placeholder="字母表密钥 A" value="CIPHER">
            </div>
            <div class="grid-2">
                <input type="text" id="quagmireKeyB" placeholder="字母表密钥 B（仅 IV）" value="KEYWORD">
                <input type="text" id="quagmireIndicator" placeholder="指示密钥" value="KEY">
            </div>
            <div class="result" id="quagmireResult"></div>
        </div>

        <!-- Web 文本编码 -->
        <div class="card">
            <div class="badge">Web 文本编码</div>
            <div class="grid-full">
                <select id="webEncodingType">
                    <option value="url">URL</option>
                    <option value="html">HTML Entity</option>
                    <option value="unicode">Unicode Escape</option>
                    <option value="uu">UUencode</option>
                    <option value="xx">XXencode</option>
                    <option value="qp">Quoted-Printable</option>
                </select>
            </div>
            <div class="result" id="webEncodingResult"></div>
        </div>

        <!-- 通用码表 -->
        <div class="card">
            <div class="badge">通用码表 Code Tables</div>
            <div class="grid-full">
                <select id="codeTableType">
                    <option value="nato">NATO 音标</option>
                    <option value="roman">罗马数字</option>
                    <option value="seven">七段数码管</option>
                    <option value="element">元素周期表</option>
                    <option value="music">音乐唱名</option>
                    <option value="scrabble">Scrabble 分值</option>
                </select>
            </div>
            <div class="result" id="codeTableResult"></div>
        </div>

        <!-- 书码 -->
        <div class="card">
            <div class="badge">书码 Book Cipher</div>
            <div class="grid-2">
                <select id="bookCipherMode">
                    <option value="lineWordLetter">行-词-字</option>
                    <option value="wordLetter">词-字</option>
                    <option value="absolute">绝对字符位置</option>
                </select>
                <select id="bookCipherBase">
                    <option value="1">1 基</option>
                    <option value="0">0 基</option>
                </select>
            </div>
            <textarea id="bookCipherText" placeholder="粘贴书文（编码/解码都从这里取索引）"></textarea>
            <div class="result" id="bookCipherResult"></div>
        </div>

        <!-- Chaocipher -->
        <div class="card">
            <div class="badge">Chaocipher</div>
            <input type="text" id="chaoLeft" placeholder="左盘字母表（密文）" value="CHAOBDEFGIJKLMNPQRSTUVWXYZ">
            <input type="text" id="chaoRight" placeholder="右盘字母表（明文）" value="CIPHERABDFGJKLMNOQSTUVWXYZ">
            <div class="result" id="chaoResult"></div>
        </div>

        <!-- Morbit -->
        <div class="card">
            <div class="badge">Morbit</div>
            <input type="text" id="morbitKey" placeholder="9 字母密钥" value="MORSECODE">
            <div class="result" id="morbitResult"></div>
        </div>

        <!-- Pollux -->
        <div class="card">
            <div class="badge">Pollux</div>
            <div class="grid-3">
                <input type="text" id="polluxDot" placeholder="点替换字符" value="047">
                <input type="text" id="polluxDash" placeholder="划替换字符" value="158">
                <input type="text" id="polluxSpace" placeholder="空格替换字符" value="2369">
            </div>
            <div class="result" id="polluxResult"></div>
        </div>

        <!-- Solitaire -->
        <div class="card">
            <div class="badge">Solitaire</div>
            <input type="text" id="solitaireKey" placeholder="密钥（留空为初始牌序）">
            <div class="result" id="solitaireResult"></div>
        </div>

        <!-- Double Transposition -->
        <div class="card">
            <div class="badge">Double Transposition</div>
            <div class="grid-2">
                <input type="text" id="dtKey1" placeholder="第一层密钥" value="KEY">
                <input type="text" id="dtKey2" placeholder="第二层密钥" value="WORD">
            </div>
            <div class="result" id="dtResult"></div>
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

            <!-- 频率分析 Substitution -->
            <div class="card">
                <div class="badge">频率分析 Substitution</div>
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

            <!-- AES -->
            <div class="card">
                <div class="badge">AES</div>
                <div class="grid-2">
                    <select id="aesMode">
                        <option value="CBC">CBC</option>
                        <option value="ECB">ECB</option>
                        <option value="CFB">CFB</option>
                        <option value="OFB">OFB</option>
                        <option value="CTR">CTR</option>
                        <option value="GCM">GCM</option>
                    </select>
                    <select id="aesPadding">
                        <option value="pkcs7">PKCS7</option>
                        <option value="none">无填充</option>
                    </select>
                </div>
                <div class="grid-2">
                    <select id="aesInputFmt">
                        <option value="text">输入文本</option>
                        <option value="hex">输入 Hex</option>
                        <option value="base64">输入 Base64</option>
                    </select>
                    <select id="aesOutputFmt">
                        <option value="hex">输出 Hex</option>
                        <option value="base64">输出 Base64</option>
                        <option value="text">输出文本</option>
                    </select>
                </div>
                <input type="text" id="aesKey" placeholder="密钥 hex（16/24/32 字节）" value="000102030405060708090a0b0c0d0e0f">
                <input type="text" id="aesIv" placeholder="IV/nonce hex（GCM 12 字节）" value="000102030405060708090a0b0c0d0e0f">
                <div class="result" id="aesResult"></div>
            </div>

            <!-- RSA -->
            <div class="card">
                <div class="badge">RSA</div>
                <div class="grid-2">
                    <select id="rsaMode">
                        <option value="decrypt">解密 / 求明文</option>
                        <option value="encrypt">加密</option>
                        <option value="smallE">小 e 开方</option>
                        <option value="commonMod">共模攻击</option>
                        <option value="wiener">Wiener 小 d</option>
                        <option value="fermat">Fermat 分解</option>
                        <option value="pollard">Pollard 分解</option>
                        <option value="hastad">Hastad 广播</option>
                        <option value="dpLeak">dp 泄露</option>
                    </select>
                    <select id="rsaRadix">
                        <option value="dec">十进制</option>
                        <option value="hex">Hex</option>
                    </select>
                </div>
                <input type="text" id="rsaN" placeholder="n">
                <div class="grid-2">
                    <input type="text" id="rsaE" placeholder="e" value="65537">
                    <input type="text" id="rsaD" placeholder="d">
                </div>
                <input type="text" id="rsaC" placeholder="c（解密/攻击用；留空时取主输入）">
                <div class="grid-2">
                    <input type="text" id="rsaE2" placeholder="e2（共模攻击）">
                    <input type="text" id="rsaC2" placeholder="c2（共模攻击）">
                </div>
                <input type="text" id="rsaDp" placeholder="dp（dp 泄露攻击）">
                <textarea id="rsaBroadcast" placeholder="Hastad：每行 n:c（十进制或 Hex）"></textarea>
                <div class="result" id="rsaResult"></div>
            </div>

            <!-- Hash 算法拆分为独立卡片 -->
            <div class="card">
                <div class="badge">MD4</div>
                <div class="result" id="md4Result"></div>
            </div>

            <div class="card">
                <div class="badge">SHA3-256</div>
                <div class="result" id="sha3_256Result"></div>
            </div>

            <div class="card">
                <div class="badge">SHA3-512</div>
                <div class="result" id="sha3_512Result"></div>
            </div>

            <div class="card">
                <div class="badge">RIPEMD-160</div>
                <div class="result" id="ripemd160Result"></div>
            </div>

            <div class="card">
                <div class="badge">SM3</div>
                <div class="result" id="sm3Result"></div>
            </div>

            <div class="card">
                <div class="badge">CRC32</div>
                <div class="result" id="crc32Result"></div>
            </div>

            <!-- JWT -->
            <div class="card">
                <div class="badge">JWT</div>
                <input type="text" id="jwtSecret" placeholder="HS256/384/512 密钥">
                <div class="result" id="jwtResult"></div>
            </div>

            <!-- PRNG -->
            <div class="card">
                <div class="badge">PRNG</div>
                <div class="grid-2">
                    <select id="prngMode">
                        <option value="mt">MT19937</option>
                        <option value="lcg">LCG</option>
                    </select>
                    <input type="number" id="prngCount" placeholder="预测个数" value="5">
                </div>
                <div class="grid-3">
                    <input type="text" id="prngMod" placeholder="LCG modulus">
                    <input type="text" id="prngA" placeholder="LCG a">
                    <input type="text" id="prngC" placeholder="LCG c">
                </div>
                <div class="result" id="prngResult"></div>
            </div>

            <!-- 对称密码拆分为独立卡片 -->
            <div class="card">
                <div class="badge">RC4</div>
                <div class="grid-2">
                    <select id="rc4InputFmt">
                        <option value="text">输入文本</option>
                        <option value="hex">输入 Hex</option>
                        <option value="base64">输入 Base64</option>
                    </select>
                    <select id="rc4OutputFmt">
                        <option value="hex">输出 Hex</option>
                        <option value="base64">输出 Base64</option>
                        <option value="text">输出文本</option>
                    </select>
                </div>
                <input type="text" id="rc4Key" placeholder="key（文本或 Hex）" value="Key">
                <div class="result" id="rc4Result"></div>
            </div>

            <div class="card">
                <div class="badge">DES</div>
                <div class="grid-2">
                    <select id="desMode">
                        <option value="ECB">ECB</option>
                        <option value="CBC">CBC</option>
                    </select>
                    <select id="desInputFmt">
                        <option value="text">输入文本</option>
                        <option value="hex">输入 Hex</option>
                        <option value="base64">输入 Base64</option>
                    </select>
                </div>
                <div class="grid-2">
                    <select id="desOutputFmt">
                        <option value="hex">输出 Hex</option>
                        <option value="base64">输出 Base64</option>
                        <option value="text">输出文本</option>
                    </select>
                    <select id="desPadding">
                        <option value="pkcs7">PKCS7</option>
                        <option value="none">无填充</option>
                    </select>
                </div>
                <input type="text" id="desKey" placeholder="key（8 字节 Hex）" value="133457799bbcdff1">
                <input type="text" id="desIv" placeholder="IV（8 字节 Hex）" value="0001020304050607">
                <div class="result" id="desResult"></div>
            </div>

            <div class="card">
                <div class="badge">3DES</div>
                <div class="grid-2">
                    <select id="tdesMode">
                        <option value="ECB">ECB</option>
                        <option value="CBC">CBC</option>
                    </select>
                    <select id="tdesInputFmt">
                        <option value="text">输入文本</option>
                        <option value="hex">输入 Hex</option>
                        <option value="base64">输入 Base64</option>
                    </select>
                </div>
                <div class="grid-2">
                    <select id="tdesOutputFmt">
                        <option value="hex">输出 Hex</option>
                        <option value="base64">输出 Base64</option>
                        <option value="text">输出文本</option>
                    </select>
                    <select id="tdesPadding">
                        <option value="pkcs7">PKCS7</option>
                        <option value="none">无填充</option>
                    </select>
                </div>
                <input type="text" id="tdesKey" placeholder="key（16/24 字节 Hex）" value="0123456789abcdeffedcba9876543210">
                <input type="text" id="tdesIv" placeholder="IV（8 字节 Hex）" value="0001020304050607">
                <div class="result" id="tdesResult"></div>
            </div>

            <div class="card">
                <div class="badge">ChaCha20</div>
                <div class="grid-2">
                    <select id="chachaInputFmt">
                        <option value="text">输入文本</option>
                        <option value="hex">输入 Hex</option>
                        <option value="base64">输入 Base64</option>
                    </select>
                    <select id="chachaOutputFmt">
                        <option value="hex">输出 Hex</option>
                        <option value="base64">输出 Base64</option>
                        <option value="text">输出文本</option>
                    </select>
                </div>
                <input type="text" id="chachaKey" placeholder="key（32 字节 Hex）" value="000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f">
                <input type="text" id="chachaNonce" placeholder="nonce（12 字节 Hex）" value="000000090000004a00000000">
                <div class="result" id="chachaResult"></div>
            </div>

            <!-- ECDSA nonce reuse -->
            <div class="card">
                <div class="badge">ECDSA nonce reuse</div>
                <div class="grid-2">
                    <select id="ecdsaCurve">
                        <option value="secp256k1">secp256k1</option>
                        <option value="p256">P-256</option>
                    </select>
                    <select id="ecdsaRadix">
                        <option value="dec">十进制</option>
                        <option value="hex">Hex</option>
                    </select>
                </div>
                <input type="text" id="ecdsaR" placeholder="r（两次签名相同）">
                <div class="grid-2">
                    <input type="text" id="ecdsaS1" placeholder="s1">
                    <input type="text" id="ecdsaS2" placeholder="s2">
                </div>
                <div class="grid-2">
                    <input type="text" id="ecdsaZ1" placeholder="z1（消息哈希）">
                    <input type="text" id="ecdsaZ2" placeholder="z2（消息哈希）">
                </div>
                <div class="result" id="ecdsaResult"></div>
            </div>

            <!-- ECC 本地计算器 -->
            <div class="card">
                <div class="badge">ECC 计算器</div>
                <div class="grid-2">
                    <select id="eccCurve">
                        <option value="secp256k1">secp256k1</option>
                        <option value="p256">P-256</option>
                        <option value="custom">自定义曲线</option>
                    </select>
                    <select id="eccMode">
                        <option value="check">曲线/子群检查</option>
                        <option value="mul">点乘 k·P</option>
                        <option value="add">点加 P+Q</option>
                        <option value="double">倍点 2P</option>
                        <option value="neg">取负 -P</option>
                    </select>
                </div>
                <div class="grid-2">
                    <select id="eccRadix">
                        <option value="hex">Hex</option>
                        <option value="dec">十进制</option>
                    </select>
                    <input type="text" id="eccP" placeholder="p（自定义曲线）">
                </div>
                <div class="grid-2">
                    <input type="text" id="eccA" placeholder="a（自定义曲线）">
                    <input type="text" id="eccB" placeholder="b（自定义曲线）">
                </div>
                <input type="text" id="eccN" placeholder="n（子群阶，自定义曲线）">
                <div class="grid-2">
                    <input type="text" id="eccPx" placeholder="P.x" value="79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798">
                    <input type="text" id="eccPy" placeholder="P.y" value="483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8">
                </div>
                <div class="grid-2">
                    <input type="text" id="eccQx" placeholder="Q.x（点加用）">
                    <input type="text" id="eccQy" placeholder="Q.y（点加用）">
                </div>
                <input type="text" id="eccK" placeholder="k（点乘用）" value="2">
                <div class="result" id="eccResult"></div>
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

            <div class="card">
                <div class="badge">XOR 工具</div>
                <div class="grid-2">
                    <select id="xorMode">
                        <option value="single">单字节枚举</option>
                        <option value="repeat">重复密钥解密</option>
                        <option value="keylen">密钥长度（汉明距离）</option>
                        <option value="crib">crib drag</option>
                        <option value="many">多密文两两异或</option>
                    </select>
                    <select id="xorInputMode">
                        <option value="text">文本</option>
                        <option value="hex">Hex</option>
                        <option value="base64">Base64</option>
                    </select>
                </div>
                <div class="grid-2">
                    <input type="text" id="xorKey" placeholder="重复密钥（hex 或文本）">
                    <input type="number" id="xorMaxLen" placeholder="最大密钥长度" value="32">
                </div>
                <input type="text" id="xorCrib" placeholder="crib（已知明文片段）">
                <div class="result" id="xorResult"></div>
            </div>

            <div class="card">
                <div class="badge">频率分析</div>
                <div class="result" id="freqResult"></div>
            </div>

            <div class="card">
                <div class="badge">Vigenère 分析</div>
                <div class="grid-2">
                    <input type="number" id="vigMaxLen" placeholder="最大密钥长度" value="20">
                    <input type="text" id="vigKey" placeholder="已知密钥（可选）">
                </div>
                <div class="result" id="vigResult"></div>
            </div>

            <div class="card">
                <div class="badge">换位爆破</div>
                <input type="number" id="transMax" placeholder="最大层数/列数" value="10">
                <div class="result" id="transResult"></div>
            </div>

            <div class="card">
                <div class="badge">索引提取</div>
                <div class="grid-2">
                    <select id="indexMode">
                        <option value="first">每行首字母</option>
                        <option value="last">每行尾字母</option>
                        <option value="nth">每行第 n 字</option>
                        <option value="diagonal">主对角线</option>
                        <option value="antiDiagonal">副对角线</option>
                        <option value="snake">蛇形读取</option>
                        <option value="spiral">螺旋读取</option>
                        <option value="wordLength">词长</option>
                        <option value="sort">按行排序</option>
                        <option value="dedup">去重</option>
                        <option value="reverse">整体反转</option>
                    </select>
                    <input type="number" id="indexN" placeholder="n" value="1">
                </div>
                <div class="result" id="indexResult"></div>
            </div>

            <div class="card">
                <div class="badge">自动解码链</div>
                <div class="result" id="autoResult"></div>
            </div>

            <div class="card">
                <div class="badge">谜格</div>
                <div class="result" id="migeResult"></div>
            </div>

            <div class="card">
                <div class="badge">图片隐写</div>
                <input type="file" id="imgFile" accept="image/*">
                <div class="grid-2">
                    <select id="imgOp">
                        <option value="reset">原图</option>
                        <option value="rot90">旋转 90</option>
                        <option value="rot180">旋转 180</option>
                        <option value="rot270">旋转 270</option>
                        <option value="fliph">水平翻转</option>
                        <option value="flipv">垂直翻转</option>
                        <option value="invert">反色</option>
                        <option value="gray">灰度</option>
                        <option value="boost">对比度拉伸</option>
                        <option value="chR">R 通道</option>
                        <option value="chG">G 通道</option>
                        <option value="chB">B 通道</option>
                        <option value="chA">A 通道</option>
                        <option value="diffRG">R-G 差值</option>
                        <option value="diffRB">R-B 差值</option>
                        <option value="diffGB">G-B 差值</option>
                        <option value="bit0">位平面 0</option>
                        <option value="bit1">位平面 1</option>
                        <option value="bit2">位平面 2</option>
                        <option value="bit3">位平面 3</option>
                        <option value="bit4">位平面 4</option>
                        <option value="bit5">位平面 5</option>
                        <option value="bit6">位平面 6</option>
                        <option value="bit7">位平面 7</option>
                    </select>
                    <input type="number" id="imgGain" placeholder="差值增益" value="4">
                </div>
                <div class="grid-2">
                    <input type="number" id="imgLsbChannel" placeholder="LSB 通道 0-3" value="0" min="0" max="3">
                    <input type="number" id="imgLsbBit" placeholder="LSB 位 0-7" value="0" min="0" max="7">
                </div>
                <div id="imgInfo"></div>
                <div id="imgOutput"></div>
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
    './cipher/5_web_encoding.js',
    './cipher/6_semaphore.js',
    './cipher/7_code_tables.js',
    './cipher/8_book_cipher.js',
    './cipher/9_AES.js',
    './cipher/11_RSA.js',
    './cipher/12_hash_toolbox.js',
    './cipher/13_jwt.js',
    './cipher/14_prng.js',
    './cipher/15_symmetric.js',
    './cipher/16_ecdsa.js',
    './cipher/17_chaocipher.js',
    './cipher/18_morbit.js',
    './cipher/19_pollux.js',
    './cipher/20_solitaire.js',
    './cipher/21_hash_extra.js',
    './cipher/22_double_transposition.js',
    './cipher/24_keyboard_layout.js',
    './cipher/25_ecc_calc.js',
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