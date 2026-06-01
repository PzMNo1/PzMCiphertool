// 这是经典区-现代区的作用函数
const inputClassic = document.querySelector('#mimaqu #mainInput');
const inputModern = document.querySelector('#xiandaiqu #mainInput');
const inputCoze = document.querySelector('#workflow-content #mainInputCoze');
const cipherResultSelector = '#mimaqu .result, #xiandaiqu .result';
let updateAllFrame = 0;
let updateAllRunning = false;
let updateAllQueued = false;

function cipherValue(id, fallback = '') {
    return document.getElementById(id)?.value ?? fallback;
}

function setCipherText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function clearCipherResults() {
    document.querySelectorAll(cipherResultSelector).forEach(el => { el.textContent = ''; });
}

function getActiveCipherSubmodule() {
    return document.querySelector('#jiamishiyanshi-content .submodule.active')?.id || 'mimaqu';
}

function isCipherLabVisible() {
    const section = document.getElementById('jiamishiyanshi-content');
    return !section || section.style.display !== 'none';
}

function scheduleUpdateAll() {
    if (updateAllRunning) {
        updateAllQueued = true;
        return;
    }
    if (updateAllFrame) return;
    updateAllFrame = requestAnimationFrame(runScheduledUpdateAll);
}

async function runScheduledUpdateAll() {
    updateAllFrame = 0;
    if (updateAllRunning) {
        updateAllQueued = true;
        return;
    }
    updateAllRunning = true;
    try {
        await updateAll();
    } finally {
        updateAllRunning = false;
        if (updateAllQueued) {
            updateAllQueued = false;
            scheduleUpdateAll();
        }
    }
}

async function updateAll(){
    if (!isCipherLabVisible()) return;

    const activeSubmodule = getActiveCipherSubmodule();
    const updateClassic = activeSubmodule === 'mimaqu';
    const updateModern = activeSubmodule === 'xiandaiqu';
    if (!updateClassic && !updateModern) return;

    const sourceInput = updateModern ? inputModern : inputClassic;
    const t = sourceInput?.value || inputClassic?.value || inputModern?.value || '';
    const symbolCipherText = cipherValue('symbolCipherInput');
    const symbolCipherType = cipherValue('symbolCipherType', 'pigpen');
    const symbolCipher = symbolCipherType === 'dancingMen' ? DancingMenCipher : PigpenCipher;

    if(!t && !symbolCipherText){clearCipherResults(); return;}
    if(!t){
        clearCipherResults();
        if (updateClassic && symbolCipherText) setCipherText('symbolCipherResult', `编码: ${symbolCipher.e(symbolCipherText)}\n解码: ${symbolCipher.d(symbolCipherText)}`);
        return;
    }

    if (updateClassic) {
        // 凯撒 维吉尼亚 栅栏 Atbash码
        let s = parseInt(cipherValue('caesarShift'), 10);
        let k = cipherValue('vigenereKey', 'KEY') || 'KEY';
        let vigenereVariant = cipherValue('vigenereVariant', 'vigenere') || 'vigenere';
        let r = parseInt(cipherValue('railCount'), 10);
        let railKey = cipherValue('railKey', 'BALLOON') || 'BALLOON';
        let railVariant = cipherValue('railVariant', 'railFence') || 'railFence';
        let caesarText = `加密: ${Caesar.e(t,s)}\n解密: ${Caesar.d(t,s)}`;
        if (window.caesarShowAll) caesarText += `\n\n一键枚举:\n${Caesar.brute(t)}`;
        setCipherText('caesarResult', caesarText);
        setCipherText('vigenereResult', Vigenere.process(t,k,vigenereVariant));
        setCipherText('railResult', TranspositionVariants.process(t, r, railKey, railVariant));
        setCipherText('atbashResult', `解密: ${AtBash.e(t)}`);

        // 进制转换 摩尔斯电码 手机九键 比尔密码 反切码 mRNA V字键盘 QWE键盘 培根密码
        // 柱状栅栏 W型栅栏 01248密码 元音密码 ASCII转换 中文电码 四角号码 ROT密码转换
        const fromBase = parseInt(cipherValue('fromBase'), 10) || 36;
        const toBase = parseInt(cipherValue('toBase'), 10) || 2;
        const bealeKey = cipherValue('bealeKey');
        const columnarRails = parseInt(cipherValue('columnarRailCount'), 10);
        const wRails = parseInt(cipherValue('wRailCount'), 10);
        const inputType = cipherValue('asciiInputType');
        const outputType = cipherValue('asciiOutputType');
        const rotOutputType = cipherValue('rotOutputType');
        const a1z26Mode = cipherValue('a1z26Mode', 'a1') || 'a1';
        const morseVariant = cipherValue('morseVariant', 'morse') || 'morse';
        const morseKey = cipherValue('morseKey', 'KEYWORD') || 'KEYWORD';
        const symbolCipherSource = symbolCipherText || t;
        setCipherText('baseResult', `结果: ${BaseConverter.convert(t, fromBase, toBase)}\n` + `字符隔开结果: ${BaseConverter.convertByChar(t, fromBase, toBase)}`);
        setCipherText('a1z26Result', `编码: ${A1Z26Cipher.e(t, a1z26Mode)}\n解码: ${A1Z26Cipher.d(t, a1z26Mode)}`);
        setCipherText('morseResult', MorseVariants.process(t, morseVariant, morseKey));
        setCipherText('phoneResult', `加密: ${PhoneKeyCipher.e(t)}\n解密: ${PhoneKeyCipher.d(t)}`);
        setCipherText('bealeResult', `解密: ${BealeCipher.e(t, bealeKey)}`);
        setCipherText('fanqieResult', `解密: ${FanqieCipher.e(t)}\n加密: ${FanqieCipher.d(t)}`);
        setCipherText('dnaResult', `解密: ${DnaCipher.e(t)}\n加密: ${DnaCipher.d(t)}`);
        setCipherText('vKeyboardResult', `解密: ${VKeyboardCipher.e(t)}\n加密: ${VKeyboardCipher.d(t)}`);
        setCipherText('qweResult', `解密: ${QweCipher.e(t)}\n加密: ${QweCipher.d(t)}`);
        setCipherText('baconResult', `加密: ${BaconCipher.e(t)}\n解密: ${BaconCipher.d(t)}`);
        setCipherText('symbolCipherResult', `编码: ${symbolCipher.e(symbolCipherSource)}\n解码: ${symbolCipher.d(symbolCipherSource)}`);
        setCipherText('columnarRailResult', `加密: ${ColumnarRailCipher.e(t, columnarRails)}\n解密: ${ColumnarRailCipher.d(t, columnarRails)}`);
        setCipherText('wRailResult', `加密: ${WShapeRailFenceCipher.e(t, wRails)}\n解密: ${WShapeRailFenceCipher.d(t, wRails)}`);
        setCipherText('cipher01248Result', `加密: ${Cipher01248.e(t)}\n解密: ${Cipher01248.d(t)}`);
        setCipherText('vowelCipherResult', `加密: ${VowelCipher.e(t)}\n解密: ${VowelCipher.d(t)}`);
        setCipherText('asciiResult', `结果: ${ASCIIHandler.convert(t, inputType, outputType)}`);
        setCipherText('cccResult', `结果: ${CCCHandler.convert(t)}`);
        setCipherText('fourcccResult', `结果: ${fourCCCHandler.convert(t)}`);
        setCipherText('rotResult', `结果: ${ROTCipher.e(t, rotOutputType)}`);

        // Polybius方阵 ADFGX/ADFVGX 仿射密码 敲击码 BifidCipher
        const psAlpha = cipherValue('psAlpha');
        const psRows = cipherValue('psRows');
        const psColumns = cipherValue('psColumns');
        const polybiusVariant = cipherValue('polybiusVariant', 'polybius') || 'polybius';
        const polybiusKeyA = cipherValue('polybiusKeyA', 'keyword') || 'keyword';
        const polybiusKeyB = cipherValue('polybiusKeyB', 'cipher') || 'cipher';
        const polybiusPeriod = parseInt(cipherValue('polybiusPeriod'), 10) || 5;
        const alp = cipherValue('ADFAlpha');
        const afK = cipherValue('ADFTranspositionKeyword');
        const aCi = cipherValue('adfCipherType');
        const playfairKey = cipherValue('playfairKey', 'keyword') || 'keyword';
        let alpha = cipherValue('AffineAlpha');
        let a = parseInt(cipherValue('Affineslope'), 10);
        let b = parseInt(cipherValue('AffineIntercept'), 10);
        let tm = cipherValue('tapMark', '.') || '.';
        let gm = cipherValue('groupMark', ' ') || ' ';
        let lm = cipherValue('letterMark', '  ') || '  ';
        setCipherText('PolybiusResult', PolybiusVariants.process(t, polybiusVariant, psAlpha, psRows, psColumns, polybiusKeyA, polybiusKeyB, polybiusPeriod));
        setCipherText('playfairResult', `加密: ${PlayfairCipher.e(t, playfairKey)}\n解密: ${PlayfairCipher.d(t, playfairKey)}`);
        setCipherText('ADFGXResult', `加密: ${ADFGXCipher.ect(t, alp, afK, aCi)}\n解密: ${ADFGXCipher.dpt(t, alp, afK, aCi)}`);
        setCipherText('AffineResult', `加密: ${Affine.e(t,alpha,a,b)}\n解密: ${Affine.d(t,alpha,a,b)}`);
        setCipherText('tapCodeResult', `加密: ${TapCode.e(t,tm,gm,lm)}\n解密: ${TapCode.d(t,tm,gm,lm)}`);
        let bk = cipherValue('BifidCipherkey');
        setCipherText('BifidCipherResult', `加密: ${Bifid.e(t, bk)}\n解密: ${Bifid.d(t, bk)}`);

        const baseOutputType = cipherValue('baseOutputType');
        setCipherText('baseEncodeResult', `结果: ${baseCipher.e(t, baseOutputType)}\n加密结果: ${baseCipher.d(t, baseOutputType)}`);
    }

    if (updateModern) {
        const substPlainAlphabet = cipherValue('substPlainAlphabet', 'abcdefghijklmnopqrstuvwxyz') || 'abcdefghijklmnopqrstuvwxyz';
        const substCipherAlphabet = cipherValue('substCipherAlphabet', 'qwertyuiopasdfghjklzxcvbnm') || 'qwertyuiopasdfghjklzxcvbnm';
        const substManualMap = cipherValue('substManualMap');
        const substCribCipher = cipherValue('substCribCipher');
        const substCribPlain = cipherValue('substCribPlain');
        setCipherText('substitutionResult', SubstitutionTools.analyze(t, substPlainAlphabet, substCipherAlphabet, substManualMap, substCribCipher, substCribPlain));
        const hillSize = cipherValue('hillSize', '2') || '2';
        const hillKey = cipherValue('hillKey', '3 3 2 5') || '3 3 2 5';
        setCipherText('hillResult', HillCipher.process(t, hillKey, hillSize));

        // MD5码 SHA-1 SHA-256 SHA-384 SHA-512
        let md5k = cipherValue('MD5Key');
        let sha1Key = cipherValue('SHA1Key');
        let sha256Key = cipherValue('SHA256Key');
        let sha384Key = cipherValue('SHA384Key');
        let sha512Key = cipherValue('SHA512Key');
        setCipherText('MD5Result', `MD5结果: ${MD5Cipher.e(t)}\nHMAC结果: ${MD5Cipher.hmac(md5k, t)}`);
        setCipherText('SHA1Result', `结果: ${await SHA1Cipher.e(t)}` + (sha1Key?.trim() ? `\nHMAC结果: ${await SHA1Cipher.hmac(sha1Key, t)}` : ''));
        setCipherText('SHA256Result', `结果: ${await SHA256Cipher.e(t)}` + (sha256Key?.trim() ? `\nHMAC结果: ${await SHA256Cipher.hmac(sha256Key, t)}` : ''));
        setCipherText('SHA384Result',  `结果: ${await SHA384Cipher.e(t)}` + (sha384Key?.trim() ? `\nHMAC结果: ${await SHA384Cipher.hmac(sha384Key, t)}` : ''));
        setCipherText('SHA512Result', `结果: ${await SHA512Cipher.e(t)}` + (sha512Key?.trim() ? `\nHMAC结果: ${await SHA512Cipher.hmac(sha512Key, t)}` : ''));
    }
}

//事件监听
function syncInputs(e) {
    const value = e.target.value;
    if (e.target === inputClassic) {
        if (inputModern) inputModern.value = value;
        if (inputCoze) inputCoze.value = value;
    } else if (e.target === inputModern) {
        if (inputClassic) inputClassic.value = value;
        if (inputCoze) inputCoze.value = value;
    } else if (e.target === inputCoze) {
        if (inputClassic) inputClassic.value = value;
        if (inputModern) inputModern.value = value;
    }
}

[inputClassic, inputModern, inputCoze].forEach(el => {
    if (el) el.addEventListener('input', syncInputs);
});

document
    .querySelectorAll('#mimaqu input:not(.quick-nav-input), #mimaqu textarea, #mimaqu select, #xiandaiqu input, #xiandaiqu textarea, #xiandaiqu select, #workflow-content #mainInputCoze')
    .forEach(el => {
        el.addEventListener('input', scheduleUpdateAll);
        el.addEventListener('change', scheduleUpdateAll);
    });

document.querySelectorAll('#jiamishiyanshi-content .submodule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        scheduleUpdateAll();
        if (btn.dataset.target === 'xiandaiqu' && typeof processEnigma === 'function') {
            requestAnimationFrame(processEnigma);
        }
    });
});

document.querySelectorAll('.menu-item[data-target="jiamishiyanshi"]').forEach(item => {
    item.addEventListener('click', scheduleUpdateAll);
});

window.caesarShowAll = false;
window.toggleCaesarBruteforce = function () {
    window.caesarShowAll = !window.caesarShowAll;
    const btn = document.getElementById('caesarBruteBtn');
    if (btn) btn.classList.toggle('active', window.caesarShowAll);
    scheduleUpdateAll();
};

scheduleUpdateAll();

//单字母变量已用 t s k r a b
