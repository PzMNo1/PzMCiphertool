// Pollux：Morse 的点/划/空格映射到数字或字符
const PolluxCipher = (() => {
  const morseEncode = text => String(text || '').toUpperCase().split(/\s+/).filter(Boolean).map(word =>
    [...word].map(c => MorseCode.dict[c] || '').filter(Boolean).join(' ')
  ).join(' / ');
  const morseDecode = morse => {
    const rev = Object.fromEntries(Object.entries(MorseCode.dict).map(([k, v]) => [v, k]));
    return String(morse || '').split('/').map(word =>
      word.trim().split(/\s+/).filter(Boolean).map(code => rev[code] || '?').join('')
    ).join(' ');
  };
  const pick = (group, fallback) => String(group || fallback || '').replace(/\s/g, '') || fallback;

  function encrypt(text, dot, dash, space) {
    const dots = pick(dot, '047'), dashes = pick(dash, '158'), spaces = pick(space, '2369');
    let out = '';
    for (const ch of morseEncode(text)) {
      if (ch === '.') out += dots[0];
      else if (ch === '-') out += dashes[0];
      else if (ch === ' ') out += spaces[0];
      else out += ch;
    }
    return out;
  }

  function decrypt(text, dot, dash, space) {
    const dots = pick(dot, '047'), dashes = pick(dash, '158'), spaces = pick(space, '2369');
    let morse = '';
    for (const ch of String(text || '')) {
      if (ch === '/') morse += '/';
      else if (dots.includes(ch)) morse += '.';
      else if (dashes.includes(ch)) morse += '-';
      else if (spaces.includes(ch)) morse += ' ';
      else morse += '?';
    }
    return morseDecode(morse.replace(/\?/g, ''));
  }

  return {
    process: (text, dot, dash, space) => `加密: ${encrypt(text, dot, dash, space)}\n解密: ${decrypt(text, dot, dash, space)}`,
    encrypt, decrypt
  };
})();
