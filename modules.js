// 模块内容作为JavaScript变量
const MODULES = {
    // 加密实验室模块
    jiamishiyanshi: `<!-- 加密实验室 -->
<div id="jiamishiyanshi-content" class="content-section">

    <!-- 模块内切换按钮 -->
    <div class="submodule-nav">
        <button class="btn back-btn submodule-btn active" data-target="mimaqu">经典区</button>
        <button class="btn back-btn submodule-btn" data-target="xiandaiqu">现代区</button>
        <button class="btn back-btn submodule-btn" data-target="luojimiti">逻辑区</button>
        <button class="btn back-btn submodule-btn" data-target="cihuibaopoqu">词汇区</button>
    </div>

    <!-- 密码区 -->
    <div id="mimaqu" class="submodule active">
        <div class="container">

        <!-- 输入 -->
        <div class="card main-input">
            <div class="badge">输入</div>
            <textarea id="mainInput" placeholder="输入要加密/解密的内容..." autofocus></textarea>
        </div>

        <!-- 凯撒密码 -->
        <div class="card">
            <div class="badge">凯撒</div>
            <input type="number" id="caesarShift" placeholder="偏移量" value="3" min="-26" max="26">
            <div class="result" id="caesarResult"></div>
        </div>

        <!-- 维吉尼亚密码 -->
        <div class="card">
            <div class="badge">维吉尼亚</div>
            <input type="text" id="vigenereKey" placeholder="输入密钥">
            <div class="result" id="vigenereResult"></div>
        </div>

        <!-- 栅栏密码 -->
        <div class="card">
            <div class="badge">栅栏</div>
            <input type="number" id="railCount" placeholder="层数" value="3">
            <div class="result" id="railResult"></div>
        </div>

        <!-- AtBash密码 -->
        <div class="card">
            <div class="badge">AtBash</div>
            <div class="result" id="atbashResult"></div>
        </div>

        <!-- 进制转换 -->
        <div class="card">
            <div class="badge">进制</div>
            <div class="grid-2">
                <input type="number" id="fromBase" placeholder="原进制" value="36">
                <input type="number" id="toBase" placeholder="目标进制" value="10">
            </div>
            <div class="result" id="baseResult"></div>
        </div>

        <!-- 摩尔斯电码 -->
        <div class="card">
            <div class="badge">摩尔斯</div>
            <div class="result" id="morseResult"></div>
        </div>

        <!-- 手机九键 -->
        <div class="card">
            <div class="badge">手机九键</div>
            <div class="result" id="phoneResult"></div>
        </div>

        <!-- 比尔密码 -->
        <div class="card">
            <div class="badge">比尔密码</div>
            <input type="text" id="bealeKey" placeholder="密钥用空格分隔">
            <div class="result" id="bealeResult"></div>
        </div>

        <!-- 反切码 -->
        <div class="card">
            <div class="badge">反切码</div>
            <div class="result" id="fanqieResult"></div>
        </div>

        <!-- mRNA序列 -->
        <div class="card">
            <div class="badge">mRNA序列</div>
            <div class="result" id="dnaResult"></div>
        </div>

        <!-- V字键盘密码 -->
        <div class="card">
            <div class="badge">V字键盘</div>
            <div class="result" id="vKeyboardResult"></div>
        </div>

        <!-- QWE密码 -->
        <div class="card">
            <div class="badge">QWE键盘</div>
            <div class="result" id="qweResult"></div>
        </div>

        <!-- Bacon密码 --> 
        <div class="card">
            <div class="badge">Bacon培根</div>
            <div class="result" id="baconResult"></div>
        </div>

        <!-- 柱状栅栏密码 -->
        <div class="card">
            <div class="badge">柱状栅栏</div>
            <input type="number" id="columnarRailCount" placeholder="列数" value="2">
            <div class="result" id="columnarRailResult"></div>
        </div>

        <!-- w型栅栏密码 -->
        <div class="card">
            <div class="badge">W型栅栏</div>
            <input type="number" id="wRailCount" placeholder="层数" value="3">
            <div class="result" id="wRailResult"></div>
        </div>

        <!-- 01248密码 -->
        <div class="card">
            <div class="badge">01248密码</div>
            <div class="result" id="cipher01248Result"></div>
        </div>

        <!-- 元音密码 -->
        <div class="card">
            <div class="badge">元音密码</div>
            <div class="result" id="vowelCipherResult"></div>
        </div>

        <!-- ASCII 转换 -->
        <div class="card">
            <div class="badge">ASCII</div>
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
            <div class="badge">中文电码</div>
            <div class="result" id="cccResult"></div>
        </div>

        <!-- ROT 转换 -->
        <div class="card">
            <div class="badge">ROT</div>
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
            <div class="badge">Polybius Square</div>
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
            <div class="badge">ADFGX/ADFVGX</div>
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
            <div class="badge">仿射</div>
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
            <div class="badge">敲击码</div>
            <div class="grid-3"> 
                <input type="text" id="tapMark" placeholder="Tap" value=".">
                <input type="text" id="groupMark" placeholder="Group" value="a">
                <input type="text" id="letterMark" placeholder="Letter" value="b">
            </div>
            <div class="result" id="tapCodeResult"></div>
        </div>

        <!-- 旗语-盲文 -->
        <div class="card">
            <div class="badge">旗语-盲文</div>
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
                    <span class="cyber-button__tag">清空</span>
                </button>
            </div>
            <div id="qiyuCanvasContainer" class="input-group" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;"></div>
            <div class="result" id="qiyuResult"></div>
        </div>

        <!-- Base码 -->
        <div class="card">
            <div class="badge">Base</div>
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
                <textarea id="mainInput" placeholder="输入要加密/解密的内容..." autofocus></textarea>
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
                <input type="text" id="SHA1Key" placeholder="输入十六进制生成Hmac">
                <div class="result" id="SHA1Result"></div>
            </div>

            <!-- SHA-256 -->
            <div class="card">
                <div class="badge">SHA-256</div>
                <input type="text" id="SHA256Key" placeholder="输入十六进制生成Hmac">
                <div class="result" id="SHA256Result"></div>
            </div>

            <!-- SHA-384 -->
            <div class="card">
                <div class="badge">SHA-384</div>
                <input type="text" id="SHA384Key" placeholder="输入十六进制生成Hmac">
                <div class="result" id="SHA384Result"></div>
            </div>

            <!-- SHA-512 -->
            <div class="card">
                <div class="badge">SHA-512</div>
                <input type="text" id="SHA512Key" placeholder="输入十六进制生成Hmac">
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
            <a href="./logic/1_sudoku.html" class="btn back-btn logic-btn">数独</a>
            <a href="./logic/2_Akari.html" class="btn back-btn">Akari</a>
            <a href="./logic/3_Aqre.html" class="btn back-btn">Aqre</a>
            <a href="./logic/4_aquapelago.html" class="btn back-btn">aquapelago</a>
            <a href="./logic/5_aquarium.html" class="btn back-btn">aquarium</a>
            <a href="./logic/6_balanceloop.html" class="btn back-btn">balanceloop</a>
            <a href="./logic/7_battleship.html" class="btn back-btn">battleship</a>
            <a href="./logic/8_binairo.html" class="btn back-btn">binairo</a>
            <a href="./logic/9_castlewall.html" class="btn back-btn">castlewall</a>
            <a href="./logic/10_cave.html" class="btn back-btn">cave</a>
            <a href="./logic/11_chocobanana.html" class="btn back-btn">chocobanana</a>
            <a href="./logic/12_chocona.html" class="btn back-btn">chocona</a>
            <a href="./logic/15_countryroad.html" class="btn back-btn">countryroad</a>
            <a href="./logic/16_doppelblock.html" class="btn back-btn">doppelblock</a>
            <a href="./logic/17_easyas.html" class="btn back-btn">easyas</a>
            <a href="./logic/18_fillomino.html" class="btn back-btn">fillomino</a>
            <a href="./logic/19_gokigen.html" class="btn back-btn">gokigen</a>
            <a href="./logic/20_haisu.html" class="btn back-btn">haisu</a>
            <a href="./logic/21_haisuslow.html" class="btn back-btn">haisuslow</a>
            <a href="./logic/22_hamle.html" class="btn back-btn">hamle</a>
            <a href="./logic/23_hashi.html" class="btn back-btn">hashi</a>
            <a href="./logic/24_heteromino.html" class="btn back-btn">heteromino</a>
            <a href="./logic/25_heyawake.html" class="btn back-btn">heyawake</a>
            <a href="./logic/26_hitori.html" class="btn back-btn">hitori</a>
            <a href="./logic/27_hotaru.html" class="btn back-btn">hotaru</a>
            <a href="./logic/28_kakuro.html" class="btn back-btn">kakuro</a>
            <a href="./logic/29_kuromasu.html" class="btn back-btn">kuromasu</a>
            <a href="./logic/30_kurotto.html" class="btn back-btn">kurotto</a>
            <a href="./logic/31_lits.html" class="btn back-btn">lits</a>
            <a href="./logic/32_magnets.html" class="btn back-btn">magnets</a>
            <a href="./logic/33_masyu.html" class="btn back-btn">masyu</a>
            <a href="./logic/34_minesweeper.html" class="btn back-btn">minesweeper</a>
            <a href="./logic/35_moonsun.html" class="btn back-btn">moonsun</a>
            <a href="./logic/36_nagare.html" class="btn back-btn">nagare</a>
            <a href="./logic/37_nanro.html" class="btn back-btn">nanro</a>
            <a href="./logic/38_ncells.html" class="btn back-btn">ncells</a>
            <a href="./logic/39_nonogram.html" class="btn back-btn">nonogram</a>
            <a href="./logic/40_norinori.html" class="btn back-btn">norinori</a>
            <a href="./logic/41_numberlink.html" class="btn back-btn">numberlink</a>
            <a href="./logic/42_nuribou.html" class="btn back-btn">nuribou</a>
            <a href="./logic/43_nurikabe.html" class="btn back-btn">nurikabe</a>
            <a href="./logic/44_nurimisaki.html" class="btn back-btn">nurimisaki</a>
            <a href="./logic/45_onsen.html" class="btn back-btn">onsen</a>
            <a href="./logic/46_rippleeffect.html" class="btn back-btn">rippleeffect</a>
            <a href="./logic/47_shakashaka.html" class="btn back-btn">shakashaka</a>
            <a href="./logic/48_shikaku.html" class="btn back-btn">shikaku</a>
            <a href="./logic/49_shimaguni.html" class="btn back-btn">shimaguni</a>
            <a href="./logic/50_skyscrapers.html" class="btn back-btn">skyscrapers</a>
            <a href="./logic/51_slitherlink.html" class="btn back-btn">slitherlink</a>
            <a href="./logic/52_spiralgalaxies.html" class="btn back-btn">spiralgalaxies</a>
            <a href="./logic/53_starbattle.html" class="btn back-btn">starbattle</a>
            <a href="./logic/54_statuepark.html" class="btn back-btn">statuepark</a>
            <a href="./logic/55_stostone.html" class="btn back-btn">stostone</a>
            <a href="./logic/56_tapa.html" class="btn back-btn">tapa</a>
            <a href="./logic/57_tatamibari.html" class="btn back-btn">tatamibari</a>
            <a href="./logic/58_tents.html" class="btn back-btn">tents</a>
            <a href="./logic/59_tll.html" class="btn back-btn">tll</a>
            <a href="./logic/60_tren.html" class="btn back-btn">tren</a>
            <a href="./logic/61_yajilin.html" class="btn back-btn">yajilin</a>
            <a href="./logic/62_yajisankazusan.html" class="btn back-btn">yajisankazusan</a>
            <a href="./logic/63_yinyang.html" class="btn back-btn">yinyang</a>
        </div>
    </div>
    
    <!-- 词汇区 -->
    <div id="cihuibaopoqu" class="submodule">
        <div class="container">
            <div class="card">
                <div class="result">词汇爆破内容...</div>
            </div>
        </div>
    </div>
</div>`,

    // 知识图谱模块
    zhishitupu: `<!-- 知识图谱 -->
<div id="zhishitupu-content" class="content-section">
    <div class="container">
    <h3>这里是知识图谱的内容...<h3>
        知识图谱
    </div>
</div>`,

    // 大模型模块
    damoxing: `<!-- 大模型 -->
<div id="damoxing-content" class="content-section" > 
    <div class="container">
    <h3>这里是大模型的内容...<h3>
        大模型
    </div>
</div>`,

    // 意见反馈模块
    yijianfankui: `<!-- 意见反馈 -->
<div id="yijianfankui-content" class="content-section">
    <div class="container">
    <h3>这里是意见反馈的内容...<h3>
        input: 你的意见...
        return: 你的意见被碎纸机吃掉了
    </div>
</div>`
}; 


// 先加载所有模块内容
function loadModulesFromJS() {
    if (typeof MODULES === 'undefined') {
        console.error('模块内容未定义，请确保modules.js已正确加载');
        return;
    }
    
    document.getElementById('jiamishiyanshi-container').innerHTML = MODULES.jiamishiyanshi;
    document.getElementById('zhishitupu-container').innerHTML = MODULES.zhishitupu;
    document.getElementById('damoxing-container').innerHTML = MODULES.damoxing;
    document.getElementById('yijianfankui-container').innerHTML = MODULES.yijianfankui;
    
    // 延迟初始化Enigma
    setTimeout(window.initEnigma, 300);
}

function showModule(moduleId) {
    const containers = document.querySelectorAll('.container1 > div');
    containers.forEach(container => {
        container.style.display = 'none';
    });
    document.getElementById(moduleId + '-container').style.display = 'block';
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        if (item.getAttribute('data-target') === moduleId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function initSubmoduleButtons() {
    document.querySelectorAll('.submodule-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.submodule-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            document.querySelectorAll('.submodule').forEach(sub => sub.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });
}
function initSearchFunction() {
    const searchInput = document.getElementById('cardSearch');
    searchInput.addEventListener('keydown', (event) => { 
        if (event.key === 'Enter') {
            event.preventDefault(); 
            const searchTerm = searchInput.value.toLowerCase();
            let foundCard = null;
            document.querySelectorAll('.card').forEach(card => {
                const badge = card.querySelector('.badge');
                if (badge) {const cardTitle = badge.textContent.toLowerCase();
                    if (cardTitle.includes(searchTerm)) {if (!foundCard) {foundCard = card;}}}});
            if (foundCard) {
                foundCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                foundCard.classList.add('card-highlight');
                setTimeout(() => {foundCard.classList.remove('card-highlight');}, 5000);
            }}});}

function initQiyuCanvas() {
    if (typeof setupQiyuCanvas === 'function') {
        setupQiyuCanvas();
    }
}

function initApp() {
    loadModulesFromJS();
    showModule('jiamishiyanshi');
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            showModule(target);
        });
    });
    const scripts = [
        './cipher/1_cipherlab.js',
        './cipher/2_ADFGXCipher.js',
        './cipher/3_Enigma.js',
        './cipher/4_MD5.js',
        './cipher/6_semaphore.js',
        '0_sidebar_funtion.js',
        './cipher/999_funtion.js'
    ];
    function loadScriptsSequentially(index) {
        if (index >= scripts.length) {
            initSubmoduleButtons();
            initSearchFunction();
            initQiyuCanvas();
            return;
        }
        
        const script = document.createElement('script');
        script.src = scripts[index];
        script.onload = function() {
            loadScriptsSequentially(index + 1);
        };
        document.body.appendChild(script);
    }
    loadScriptsSequentially(0);
}
document.addEventListener('DOMContentLoaded', initApp);

// 全局暴露Enigma初始化函数
window.initEnigma = function() {
    if (typeof initEnigmaUI === 'function') {
        initEnigmaUI();
    } else if (typeof updateEnigmaLayout === 'function') {
        updateEnigmaLayout();
    }
};