// Morbit：Morse 双字符分组 + 9 字母密钥数字替换
const MorbitCipher = (() => {
  const BIGRAMS = ['..', '.-', './', '-.', '--', '-/', '/.', '/-', '//'];
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const keyLetters = key => {
    const raw = String(key || '').toUpperCase().replace(/[^A-Z]/g, '');
    const out = [...raw].slice(0, 9);
    for (const c of ALPHA) if (out.length < 9) out.push(c);
    return out.slice(0, 9);
  };
  const orderOf = key => {
    const letters = keyLetters(key);
    const sorted = letters.slice().sort();
    const used = new Array(9).fill(false);
    return letters.map(c => {
      for (let i = 0; i < 9; i++) {
        if (!used[i] && sorted[i] === c) { used[i] = true; return i + 1; }
      }
      return 0;
    });
  };
  const morseEncode = text => String(text || '').toUpperCase().split(/\s+/).filter(Boolean).map(word =>
    [...word].map(c => MorseCode.dict[c] || '').filter(Boolean).join('/')
  ).join('//');
  const morseDecode = morse => {
    const rev = Object.fromEntries(Object.entries(MorseCode.dict).map(([k, v]) => [v, k]));
    return String(morse || '').split('//').map(word =>
      word.split('/').filter(Boolean).map(code => rev[code] || '?').join('')
    ).join(' ');
  };

  function encrypt(text, key) {
    const order = orderOf(key);
    let morse = morseEncode(text);
    if (morse.length % 2) morse += '/';
    let out = '';
    for (let i = 0; i < morse.length; i += 2) {
      const idx = BIGRAMS.indexOf(morse.slice(i, i + 2));
      out += idx >= 0 ? order[idx] : '?';
    }
    return out;
  }

  function decrypt(text, key) {
    const order = orderOf(key);
    let morse = '';
    for (const ch of String(text || '').replace(/[^1-9]/g, '')) {
      const idx = order.indexOf(Number(ch));
      morse += idx >= 0 ? BIGRAMS[idx] : '';
    }
    return morseDecode(morse);
  }

  return {
    process: (text, key) => `加密: ${encrypt(text, key)}\n解密: ${decrypt(text, key)}`,
    encrypt, decrypt, orderOf
  };
})();
