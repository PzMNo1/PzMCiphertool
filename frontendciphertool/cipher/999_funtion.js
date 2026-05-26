// 这是经典区-现代区的作用函数
async function updateAll(){
    let t = inputClassic.value;
    const symbolCipherText = document.getElementById('symbolCipherInput')?.value || '';
    const symbolCipherType = document.getElementById('symbolCipherType')?.value || 'pigpen';
    const symbolCipher = symbolCipherType === 'dancingMen' ? DancingMenCipher : PigpenCipher;
    if(!t && !symbolCipherText){document.querySelectorAll('.result').forEach(el=>el.textContent=""); return;}
    if(!t){
        document.querySelectorAll('.result').forEach(el=>el.textContent="");
        if (symbolCipherText) document.getElementById('symbolCipherResult').textContent = `编码: ${symbolCipher.e(symbolCipherText)}\n解码: ${symbolCipher.d(symbolCipherText)}`;
        return;
    }
    
    // 凯撒 维吉尼亚 栅栏 Atbash码
    let s = parseInt(document.getElementById('caesarShift').value);
    let k = document.getElementById('vigenereKey').value||"KEY";
    let vigenereVariant = document.getElementById('vigenereVariant')?.value || "vigenere";
    let r = parseInt(document.getElementById('railCount').value);
    let railKey = document.getElementById('railKey')?.value || "BALLOON";
    let railVariant = document.getElementById('railVariant')?.value || "railFence";
    let caesarText = `加密: ${Caesar.e(t,s)}\n解密: ${Caesar.d(t,s)}`;
    if (window.caesarShowAll) caesarText += `\n\n一键枚举:\n${Caesar.brute(t)}`;
    document.getElementById('caesarResult').textContent = caesarText;
    document.getElementById('vigenereResult').textContent = Vigenere.process(t,k,vigenereVariant);
    document.getElementById('railResult').textContent = TranspositionVariants.process(t, r, railKey, railVariant);
    document.getElementById('atbashResult').textContent = `解密: ${AtBash.e(t)}`;
  
    // 进制转换 摩尔斯电码 手机九键 比尔密码 反切码 mRNA V字键盘 QWE键盘 培根密码
    // 柱状栅栏 W型栅栏 01248密码 元音密码 ASCII转换 中文电码 四角号码 ROT密码转换
    const fromBase = parseInt(document.getElementById('fromBase').value) || 36;
    const toBase = parseInt(document.getElementById('toBase').value) || 2;
    const bealeKey = document.getElementById('bealeKey').value || '';
    const columnarRails = parseInt(document.getElementById('columnarRailCount').value);
    const wRails = parseInt(document.getElementById('wRailCount').value);
    const inputType = document.getElementById('asciiInputType').value;
    const outputType = document.getElementById('asciiOutputType').value;
    const cccText = document.getElementById('mainInput').value; 
    const fourcccText = document.getElementById('mainInput').value; 
    const rotOutputType = document.getElementById('rotOutputType').value
    const a1z26Mode = document.getElementById('a1z26Mode')?.value || 'a1';
    const morseVariant = document.getElementById('morseVariant')?.value || 'morse';
    const morseKey = document.getElementById('morseKey')?.value || 'KEYWORD';
    const symbolCipherSource = symbolCipherText || t;
    document.getElementById('baseResult').textContent = `结果: ${BaseConverter.convert(t, fromBase, toBase)}\n` + `字符隔开结果: ${BaseConverter.convertByChar(t, fromBase, toBase)}`;
    document.getElementById('a1z26Result').textContent = `编码: ${A1Z26Cipher.e(t, a1z26Mode)}\n解码: ${A1Z26Cipher.d(t, a1z26Mode)}`;
    document.getElementById('morseResult').textContent = MorseVariants.process(t, morseVariant, morseKey);
    document.getElementById('phoneResult').textContent = `加密: ${PhoneKeyCipher.e(t)}\n解密: ${PhoneKeyCipher.d(t)}`;
    document.getElementById('bealeResult').textContent = `解密: ${BealeCipher.e(t, bealeKey)}`;
    document.getElementById('fanqieResult').textContent = `解密: ${FanqieCipher.e(t)}\n加密: ${FanqieCipher.d(t)}`;
    document.getElementById('dnaResult').textContent = `解密: ${DnaCipher.e(t)}\n加密: ${DnaCipher.d(t)}`;
    document.getElementById('vKeyboardResult').textContent =`解密: ${VKeyboardCipher.e(t)}\n加密: ${VKeyboardCipher.d(t)}`;
    document.getElementById('qweResult').textContent = `解密: ${QweCipher.e(t)}\n加密: ${QweCipher.d(t)}`;
    document.getElementById('baconResult').textContent = `加密: ${BaconCipher.e(t)}\n解密: ${BaconCipher.d(t)}`; 
    document.getElementById('symbolCipherResult').textContent = `编码: ${symbolCipher.e(symbolCipherSource)}\n解码: ${symbolCipher.d(symbolCipherSource)}`;
    document.getElementById('columnarRailResult').textContent = `加密: ${ColumnarRailCipher.e(t, columnarRails)}\n解密: ${ColumnarRailCipher.d(t, columnarRails)}`;
    document.getElementById('wRailResult').textContent = `加密: ${WShapeRailFenceCipher.e(t, wRails)}\n解密: ${WShapeRailFenceCipher.d(t, wRails)}`;
    document.getElementById('cipher01248Result').textContent =`加密: ${Cipher01248.e(t)}\n解密: ${Cipher01248.d(t)}`;
    document.getElementById('vowelCipherResult').textContent = `加密: ${VowelCipher.e(t)}\n解密: ${VowelCipher.d(t)}`;
    document.getElementById('asciiResult').textContent = `结果: ${ASCIIHandler.convert(t, inputType, outputType)}`;
	document.getElementById('cccResult').textContent =`结果: ${CCCHandler.convert(cccText)}`;
    document.getElementById('fourcccResult').textContent =`结果: ${fourCCCHandler.convert(fourcccText)}`;
    document.getElementById('rotResult').textContent = `结果: ${ROTCipher.e(t, rotOutputType)}`;

    // Polybius方阵 ADFGX/ADFVGX 仿射密码 敲击码 BifidCipher
    const psAlpha = document.getElementById('psAlpha').value;
    const psRows = document.getElementById('psRows').value;
    const psColumns = document.getElementById('psColumns').value;
    const polybiusVariant = document.getElementById('polybiusVariant')?.value || 'polybius';
    const polybiusKeyA = document.getElementById('polybiusKeyA')?.value || 'keyword';
    const polybiusKeyB = document.getElementById('polybiusKeyB')?.value || 'cipher';
    const polybiusPeriod = parseInt(document.getElementById('polybiusPeriod')?.value) || 5;
    const alp = document.getElementById('ADFAlpha').value;
    const afK = document.getElementById('ADFTranspositionKeyword').value;
    const aCi = document.getElementById('adfCipherType').value;
    const playfairKey = document.getElementById('playfairKey')?.value || 'keyword';
    let alpha = document.getElementById('AffineAlpha').value;
    let a = parseInt(document.getElementById('Affineslope').value);
    let b = parseInt(document.getElementById('AffineIntercept').value);
    let tm = document.getElementById('tapMark').value || '.';
    let gm = document.getElementById('groupMark').value || ' ';
    let lm = document.getElementById('letterMark').value || '  ';
    document.getElementById('PolybiusResult').textContent = PolybiusVariants.process(t, polybiusVariant, psAlpha, psRows, psColumns, polybiusKeyA, polybiusKeyB, polybiusPeriod);
    document.getElementById('playfairResult').textContent = `加密: ${PlayfairCipher.e(t, playfairKey)}\n解密: ${PlayfairCipher.d(t, playfairKey)}`;
    document.getElementById('ADFGXResult').textContent = `加密: ${ADFGXCipher.ect(t, alp, afK, aCi)}\n解密: ${ADFGXCipher.dpt(t, alp, afK, aCi)}`;
    document.getElementById('AffineResult').textContent = `加密: ${Affine.e(t,alpha,a,b)}\n解密: ${Affine.d(t,alpha,a,b)}`;
    document.getElementById('tapCodeResult').textContent = `加密: ${TapCode.e(t,tm,gm,lm)}\n解密: ${TapCode.d(t,tm,gm,lm)}`; 
    let bk = document.getElementById('BifidCipherkey').value || '';
    document.getElementById('BifidCipherResult').textContent = `加密: ${Bifid.e(t, bk)}\n解密: ${Bifid.d(t, bk)}`;

    const substPlainAlphabet = document.getElementById('substPlainAlphabet')?.value || 'abcdefghijklmnopqrstuvwxyz';
    const substCipherAlphabet = document.getElementById('substCipherAlphabet')?.value || 'qwertyuiopasdfghjklzxcvbnm';
    const substManualMap = document.getElementById('substManualMap')?.value || '';
    const substCribCipher = document.getElementById('substCribCipher')?.value || '';
    const substCribPlain = document.getElementById('substCribPlain')?.value || '';
    document.getElementById('substitutionResult').textContent = SubstitutionTools.analyze(t, substPlainAlphabet, substCipherAlphabet, substManualMap, substCribCipher, substCribPlain);
    const hillSize = document.getElementById('hillSize')?.value || '2';
    const hillKey = document.getElementById('hillKey')?.value || '3 3 2 5';
    document.getElementById('hillResult').textContent = HillCipher.process(t, hillKey, hillSize);

    // MD5码 SHA-1 SHA-256 SHA-384 SHA-512
    let md5k = document.getElementById('MD5Key').value;
    let sha1Key = document.getElementById('SHA1Key').value;
    let sha256Key = document.getElementById('SHA256Key').value;
    let sha384Key = document.getElementById('SHA384Key').value;
    let sha512Key = document.getElementById('SHA512Key').value;
    document.getElementById('MD5Result').textContent = `MD5结果: ${MD5Cipher.e(t)}\nHMAC结果: ${MD5Cipher.hmac(md5k, t)}`; 
    document.getElementById('SHA1Result').textContent = `结果: ${await SHA1Cipher.e(t)}` + (sha1Key?.trim() ? `\nHMAC结果: ${await SHA1Cipher.hmac(sha1Key, t)}` : "");
    document.getElementById('SHA256Result').textContent = `结果: ${await SHA256Cipher.e(t)}` + (sha256Key?.trim() ? `\nHMAC结果: ${await SHA256Cipher.hmac(sha256Key, t)}` : "");
    document.getElementById('SHA384Result').textContent =  `结果: ${await SHA384Cipher.e(t)}` + (sha384Key?.trim() ? `\nHMAC结果: ${await SHA384Cipher.hmac(sha384Key, t)}` : "");
    document.getElementById('SHA512Result').textContent = `结果: ${await SHA512Cipher.e(t)}` + (sha512Key?.trim() ? `\nHMAC结果: ${await SHA512Cipher.hmac(sha512Key, t)}` : "");
    
    // Enigma Base码
    if (typeof processEnigma === 'function') {processEnigma(); }
    const baseOutputType = document.getElementById('baseOutputType').value
    document.getElementById('baseEncodeResult').textContent = `结果: ${baseCipher.e(t, baseOutputType)}\n加密结果: ${baseCipher.d(t, baseOutputType)}`;

}

//事件监听
document.querySelectorAll('#mainInput, input, textarea, select').forEach(el => {el.addEventListener('input', updateAll);});

// 获取三个输入框元素并进行绑定
const inputClassic = document.querySelector('#mimaqu #mainInput');
const inputModern = document.querySelector('#xiandaiqu #mainInput');
const inputCoze = document.querySelector('#workflow-content #mainInputCoze');
async function syncInputs(e) {
    if (e.target === inputClassic) {inputModern.value = e.target.value; inputCoze.value = e.target.value; } 
    else if (e.target === inputModern) {inputClassic.value = e.target.value; inputCoze.value = e.target.value; }
    else if (e.target === inputCoze) {inputClassic.value = e.target.value; inputModern.value = e.target.value; }
    updateAll();    
}
inputClassic.addEventListener('input', syncInputs);
inputModern.addEventListener('input', syncInputs);
inputCoze.addEventListener('input', syncInputs);

window.caesarShowAll = false;
window.toggleCaesarBruteforce = function () {
    window.caesarShowAll = !window.caesarShowAll;
    const btn = document.getElementById('caesarBruteBtn');
    if (btn) btn.classList.toggle('active', window.caesarShowAll);
    updateAll();
};

updateAll();

//单字母变量已用 t s k r a b
