// 这是经典区-现代区-分析区的作用函数
// 主输入框共用同一段文本：三个区各一个，workflow 里一个隐藏的。
// 分析区那张主输入卡和经典区/现代区结构完全一致（置顶 + 输入框 + [搜索密码卡片]）。
const inputClassic = document.querySelector('#mimaqu #mainInput');
const inputModern = document.querySelector('#xiandaiqu #mainInput');
const inputFenxiqu = document.querySelector('#fenxiqu #mainInput');
const inputCoze = document.querySelector('#workflow-content #mainInputCoze');
const sharedInputs = [inputClassic, inputModern, inputFenxiqu, inputCoze];
const cipherResultSelector = '#mimaqu .result, #xiandaiqu .result, .card[data-card-id] .result';
let updateAllFrame = 0;
let updateAllRunning = false;
let updateAllQueued = false;

/* =============================================================================
 * 卡片注册表
 * 卡片文件比本文件先加载，所以 0_cipher_div_batch.js 里先放了一个只负责收集的
 * registerCard（推入 window.CIPHER_CARD_DEFS），这里把缓冲区接过来换成真表。
 * ========================================================================== */

const cipherCardDefs = [];
(function adoptBufferedCards() {
    (window.CIPHER_CARD_DEFS || []).forEach(def => cipherCardDefs.push(def));
    window.CIPHER_CARD_DEFS = cipherCardDefs;   
})();

function registerCipherCard(def) {
    if (!def || !def.id) return;
    cipherCardDefs.push(def);
}


window.registerCard = registerCipherCard;

function cipherValue(id, fallback = '') {
    return document.getElementById(id)?.value ?? fallback;
}


function param(id, fallback = '') {
    const v = cipherValue(id, '');
    return v === '' || v === undefined || v === null ? fallback : v;
}


function paramInt(id, fallback) {
    const n = parseInt(param(id, ''), 10);
    return Number.isFinite(n) ? n : fallback;
}

/** 主输入框当前文本（卡片文件用） */
function mainInput() {
    return (inputClassic && inputClassic.value) || (inputModern && inputModern.value) || '';
}

function setCipherText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

//跳舞的小人
function setSymbolCipherResult(cipher, text) {
    const el = document.getElementById('symbolCipherResult');
    if (!el) return;
    const out = `编码: ${cipher.e(text)}\n解码: ${cipher.d(text)}`;
    if (cipher.html) el.innerHTML = out;
    else el.textContent = out;
}


function refreshHanziCodes() {
    if (typeof CCCHandler === 'undefined') return;
    const query = mainInput().trim();
    if (!query) return;
    setResult('hanziResult', CCCHandler.cardConvert(query, CCCHandler.mode, 'auto'));
}

const _ownOutputResultIds = new Set();
function collectOwnOutputResultIds() {
    _ownOutputResultIds.clear();
    cipherCardDefs.forEach(def => {
        if (def.resultId && def.needsMainInput === false) _ownOutputResultIds.add(def.resultId);
    });
}


const _lastWritten = new Map();
function setResult(id, text) {
    if (!id) return;
    const out = text === undefined || text === null ? '' : String(text);
    if (_lastWritten.get(id) === out) return;
    const el = document.getElementById(id);
    if (!el) return;
    _lastWritten.set(id, out);
    el.textContent = out;
}

function clearCipherResults() {
    document.querySelectorAll(cipherResultSelector).forEach(el => {
        if (el.id && _ownOutputResultIds.has(el.id)) return;
        el.textContent = '';
    });
    _lastWritten.clear();
}

function getActiveCipherSubmodule() {
    return document.querySelector('#jiamishiyanshi-content .submodule.active')?.id || 'mimaqu';
}

function isCipherLabVisible() {
    const section = document.getElementById('jiamishiyanshi-content');
    return !section || section.style.display !== 'none';
}

function mountCipherCards() {
    const groups = new Map();
    cipherCardDefs.forEach(def => {
        const section = def.section || 'mimaqu';
        if (!groups.has(section)) groups.set(section, []);
        groups.get(section).push(def);
    });

    groups.forEach((list, sectionId) => {
        const host = document.getElementById(sectionId);
        if (!host) {
            console.warn(`[CipherCards] 找不到子模块容器 #${sectionId}，跳过 ${list.length} 张卡片`);
            return;
        }

        list.forEach(def => {
            if (document.querySelector(`.card[data-card-id="${def.id}"]`)) return; // 幂等

            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.card = def.id;
            card.dataset.cardId = def.id;
            card.dataset.section = sectionId;
            if (def.needsMainInput === false) card.dataset.ownOutput = '1';
            card.innerHTML = `<div class="badge">${def.badge || def.id}</div>` + (def.html || '');
            if (def.resultId && !card.querySelector(`#${def.resultId}`)) {
                card.insertAdjacentHTML('beforeend', `<div class="result" id="${def.resultId}"></div>`);
            }
            const refCard = def.afterBadge
                ? Array.from(host.querySelectorAll('.card')).find(c => {
                    const b = c.querySelector('.badge');
                    return b && b.textContent.replace(/\s+/g, ' ').trim().startsWith(def.afterBadge);
                  })
                : null;
            const node = refCard || host.querySelector('.card.main-input');
            if (node) {
                const parent = node.parentNode && host.contains(node.parentNode) ? node.parentNode : host;
                const before = node.nextElementSibling;
                if (before && before.parentNode === parent) parent.insertBefore(card, before);
                else parent.appendChild(card);
            } else {
                host.appendChild(card);
            }
        });
    });

    bindCipherCardInputs();
    collectOwnOutputResultIds();

    // 777_cardindex.js 靠这个事件给各卡片挂「算法索引」，
    // 少了它那些卡片内的子算法入口就不会出现。
    try {
        document.dispatchEvent(new CustomEvent('cipher-cards-mounted', {
            detail: { count: cipherCardDefs.length }
        }));
    } catch (err) {
        console.warn('[CipherCards] 派发 cipher-cards-mounted 失败:', err);
    }
}

/** 绑定卡片内部控件：变了就整体刷新一次 */
function bindCipherCardInputs() {
    cipherCardDefs.forEach(def => {
        (def.listens || []).forEach(controlId => {
            const el = document.getElementById(controlId);
            if (!el || el.dataset.cipherBound === '1') return;
            el.dataset.cipherBound = '1';
            const handler = () => scheduleUpdateAll();
            el.addEventListener('input', handler);
            el.addEventListener('change', handler);
        });
    });
}

/** 逐张执行卡片计算 */
function computeCipherCards() {
    cipherCardDefs.forEach(def => {
        if (typeof def.compute !== 'function') return;
        try {
            def.compute();
        } catch (err) {
            console.error(`[CipherCards] 卡片 ${def.id} 计算失败:`, err);
        }
    });
}

window.CipherCards = {
    register: registerCipherCard,
    mount: mountCipherCards,
    compute: computeCipherCards,
    setResult,
    defs: cipherCardDefs
};


function scheduleUpdateAll() {
    if (updateAllFrame) return;
    updateAllFrame = requestAnimationFrame(runScheduledUpdateAll);
}

async function runScheduledUpdateAll() {
    updateAllFrame = 0;
    if (updateAllRunning) { updateAllQueued = true; return; }
    updateAllRunning = true;
    try {
        await updateAll();
        computeCipherCards();
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
        if (updateClassic && symbolCipherText) setSymbolCipherResult(symbolCipher, symbolCipherText);
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
        if (window.caesarShowAll) {
            caesarText += `\n\n一键枚举:\n${Caesar.brute(t)}`;
        }
        setCipherText('caesarResult', caesarText);
        setCipherText('vigenereResult', Vigenere.process(t,k,vigenereVariant));
        setCipherText('railResult', TranspositionVariants.process(t, r, railKey, railVariant));
        setCipherText('atbashResult', `解密: ${AtBash.e(t)}`);

        // 进制转换 摩尔斯电码 手机九键 比尔密码 反切码 mRNA V字键盘 QWE键盘 培根密码
        // 柱状栅栏 W型栅栏 01248密码 元音密码 ASCII转换 四角号码 ROT密码转换
        // （中文电码/区位码/GBK 等已并入「汉字编码卡组」，见 1_cipherlab.js 尾部登记的那张卡）
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
        setSymbolCipherResult(symbolCipher, symbolCipherSource);
        setCipherText('columnarRailResult', `加密: ${ColumnarRailCipher.e(t, columnarRails)}\n解密: ${ColumnarRailCipher.d(t, columnarRails)}`);
        setCipherText('wRailResult', `加密: ${WShapeRailFenceCipher.e(t, wRails)}\n解密: ${WShapeRailFenceCipher.d(t, wRails)}`);
        setCipherText('cipher01248Result', `加密: ${Cipher01248.e(t)}\n解密: ${Cipher01248.d(t)}`);
        setCipherText('vowelCipherResult', `加密: ${VowelCipher.e(t)}\n解密: ${VowelCipher.d(t)}`);
        setCipherText('asciiResult', `结果: ${ASCIIHandler.convert(t, inputType, outputType)}`);
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

        // 汉字编码卡组：HTML 在 0_cipher_div_batch.js 里，和上面这些卡一样在这一轮里算
        refreshHanziCodes();
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
    sharedInputs.forEach(el => {
        if (el && el !== e.target) el.value = value;
    });
}

sharedInputs.forEach(el => {
    if (el) el.addEventListener('input', syncInputs);
});

document
    .querySelectorAll('#mimaqu input:not(.quick-nav-input), #mimaqu textarea, #mimaqu select, #xiandaiqu input, #xiandaiqu textarea, #xiandaiqu select, #fenxiqu #mainInput, #workflow-content #mainInputCoze')
    .forEach(el => {        el.addEventListener('input', scheduleUpdateAll);
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
