// 这是经典区-现代区的作用函数
async function updateAll(){
    let t = inputClassic.value;
    if(!t){document.querySelectorAll('.result').forEach(el=>el.textContent=""); return;}
    
    // 凯撒 维吉尼亚 栅栏 Atbash码
    let s = parseInt(document.getElementById('caesarShift').value);
    let k = document.getElementById('vigenereKey').value||"KEY";
    let r = parseInt(document.getElementById('railCount').value);
    document.getElementById('caesarResult').textContent = `加密: ${Caesar.e(t,s)}\n解密: ${Caesar.d(t,s)}`;
    document.getElementById('vigenereResult').textContent = `加密: ${Vigenere.e(t,k)}\n解密: ${Vigenere.d(t,k)}`;
    document.getElementById('railResult').textContent = `加密: ${RailFence.e(t,r)}\n解密: ${RailFence.d(t,r)}`;
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
    document.getElementById('baseResult').textContent = `结果: ${BaseConverter.convert(t, fromBase, toBase)}\n` + `字符隔开结果: ${BaseConverter.convertByChar(t, fromBase, toBase)}`;
    document.getElementById('morseResult').textContent = `加密: ${MorseCode.e(t)}\n解密: ${MorseCode.d(t)}`;
    document.getElementById('phoneResult').textContent = `加密: ${PhoneKeyCipher.e(t)}\n解密: ${PhoneKeyCipher.d(t)}`;
    document.getElementById('bealeResult').textContent = `解密: ${BealeCipher.e(t, bealeKey)}`;
    document.getElementById('fanqieResult').textContent = `解密: ${FanqieCipher.e(t)}\n加密: ${FanqieCipher.d(t)}`;
    document.getElementById('dnaResult').textContent = `解密: ${DnaCipher.e(t)}\n加密: ${DnaCipher.d(t)}`;
    document.getElementById('vKeyboardResult').textContent =`解密: ${VKeyboardCipher.e(t)}\n加密: ${VKeyboardCipher.d(t)}`;
    document.getElementById('qweResult').textContent = `解密: ${QweCipher.e(t)}\n加密: ${QweCipher.d(t)}`;
    document.getElementById('baconResult').textContent = `加密: ${BaconCipher.e(t)}\n解密: ${BaconCipher.d(t)}`; 
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
    const alp = document.getElementById('ADFAlpha').value;
    const afK = document.getElementById('ADFTranspositionKeyword').value;
    const aCi = document.getElementById('adfCipherType').value;
    let alpha = document.getElementById('AffineAlpha').value;
    let a = parseInt(document.getElementById('Affineslope').value);
    let b = parseInt(document.getElementById('AffineIntercept').value);
    let tm = document.getElementById('tapMark').value || '.';
    let gm = document.getElementById('groupMark').value || ' ';
    let lm = document.getElementById('letterMark').value || '  ';
    document.getElementById('PolybiusResult').textContent = `加密: ${PolybiusCipher.e(t, psAlpha, psRows, psColumns)} \n解密: ${PolybiusCipher.d(t, psAlpha, psRows, psColumns)}`;
    document.getElementById('ADFGXResult').textContent = `加密: ${ADFGXCipher.ect(t, alp, afK, aCi)}\n解密: ${ADFGXCipher.dpt(t, alp, afK, aCi)}`;
    document.getElementById('AffineResult').textContent = `加密: ${Affine.e(t,alpha,a,b)}\n解密: ${Affine.d(t,alpha,a,b)}`;
    document.getElementById('tapCodeResult').textContent = `加密: ${TapCode.e(t,tm,gm,lm)}\n解密: ${TapCode.d(t,tm,gm,lm)}`; 
    let bk = document.getElementById('BifidCipherkey').value || '';
    document.getElementById('BifidCipherResult').textContent = `加密: ${Bifid.e(t, bk)}\n解密: ${Bifid.d(t, bk)}`;

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

updateAll();

//单字母变量已用 t s k r a b
