// 凯撒密码
const Caesar = {
  shift: (t, s) => {
    s = Number(s) || 0;
    return t.replace(/[a-z]/gi, c => {
      const b = c < 'a' ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - b + s + 2600) % 26 + b);
    });
  },
  e: (t, s) => Caesar.shift(t, s),
  d: (t, s) => Caesar.shift(t, -s),
  brute: t => Array.from({ length: 25 }, (_, i) => {
    const s = i + 1;
    return `偏移 ${String(s).padStart(2, '0')}: ${Caesar.d(t, s)}`;
  }).join('\n')
}

// 维吉尼亚密码
const Vigenere = {
  keyLetters: (k, fallback = 'KEY') => ((k || fallback).toString().toUpperCase().match(/[A-Z]/g) || fallback.split('')),
  keyDigits: k => ((k || '').toString().match(/\d/g) || '31415'.split('')).map(Number),
  val: c => c.toUpperCase().charCodeAt(0) - 65,
  fromVal: (c, v) => String.fromCharCode(((v % 26) + 26) % 26 + (c < 'a' ? 65 : 97)),
  runLetters: (t, keys, fn) => {
    t = (t || '').replace(/\s/g, '');
    let r = '', ki = 0;
    for (const c of t) {
      if (/[a-z]/i.test(c)) {
        const k = keys[ki % keys.length];
        r += Vigenere.fromVal(c, fn(Vigenere.val(c), k));
        ki++;
      } else r += c;
    }
    return r;
  },
  e: (t, k, mode = 1) => Vigenere.runLetters(t, Vigenere.keyLetters(k).map(Vigenere.val), (v, sh) => v + (mode === 1 ? sh : -sh)),
  d: (t, k) => Vigenere.e(t, k, -1),
  beaufort: (t, k) => Vigenere.runLetters(t, Vigenere.keyLetters(k).map(Vigenere.val), (v, sh) => sh - v),
  variantBeaufortE: (t, k) => Vigenere.d(t, k),
  variantBeaufortD: (t, k) => Vigenere.e(t, k),
  gronsfeldE: (t, k) => Vigenere.runLetters(t, Vigenere.keyDigits(k), (v, sh) => v + sh),
  gronsfeldD: (t, k) => Vigenere.runLetters(t, Vigenere.keyDigits(k), (v, sh) => v - sh),
  autokeyE: (t, k) => {
    t = (t || '').replace(/\s/g, '');
    const baseKey = Vigenere.keyLetters(k).join('');
    const plain = t.replace(/[^a-z]/gi, '').toUpperCase();
    let r = '', li = 0;
    for (const c of t) {
      if (/[a-z]/i.test(c)) {
        const keyChar = li < baseKey.length ? baseKey[li] : plain[li - baseKey.length];
        r += Vigenere.fromVal(c, Vigenere.val(c) + Vigenere.val(keyChar || 'A'));
        li++;
      } else r += c;
    }
    return r;
  },
  autokeyD: (t, k) => {
    t = (t || '').replace(/\s/g, '');
    const baseKey = Vigenere.keyLetters(k).join('');
    let r = '', recovered = '', li = 0;
    for (const c of t) {
      if (/[a-z]/i.test(c)) {
        const keyChar = li < baseKey.length ? baseKey[li] : recovered[li - baseKey.length];
        const p = Vigenere.fromVal(c, Vigenere.val(c) - Vigenere.val(keyChar || 'A'));
        recovered += p.toUpperCase();
        r += p;
        li++;
      } else r += c;
    }
    return r;
  },
  porta: (t, k) => Vigenere.runLetters(t, Vigenere.keyLetters(k).map(c => Math.floor(Vigenere.val(c) / 2)), (v, pair) => {
    if (v < 13) return 13 + ((v + pair) % 13);
    return (v - 13 - pair + 13) % 13;
  }),
  process: (t, k, variant = 'vigenere') => {
    switch (variant) {
      case 'beaufort': return `加密/解密: ${Vigenere.beaufort(t, k)}`;
      case 'variantBeaufort': return `加密: ${Vigenere.variantBeaufortE(t, k)}\n解密: ${Vigenere.variantBeaufortD(t, k)}`;
      case 'autokey': return `加密: ${Vigenere.autokeyE(t, k)}\n解密: ${Vigenere.autokeyD(t, k)}`;
      case 'gronsfeld': return `加密: ${Vigenere.gronsfeldE(t, k)}\n解密: ${Vigenere.gronsfeldD(t, k)}`;
      case 'porta': return `加密/解密: ${Vigenere.porta(t, k)}`;
      default: return `加密: ${Vigenere.e(t, k)}\n解密: ${Vigenere.d(t, k)}`;
    }
  }
}

// 栅栏密码
const RailFence = {
  e: (t, r = 3) => {
    if (r < 2) return "";
    t = t.replace(/\s/g, "");
    let p = 2 * r - 2, res = "";
    for (let i = 0; i < r; i++)
      for (let j = 0; j < t.length; j++)
        if (j % p === i || j % p === p - i) res += t[j];
    return res;
  },
  d: (t, r = 3) => {
    t = t.replace(/\s/g, "");
    let n = t.length,
      m = [...Array(n)].map((_, i) => String.fromCharCode(33 + i)).join(''),
      p = RailFence.e(m, r).split('').map(x => m.indexOf(x));
    return Array(n).fill().map((_, i) => t[p.indexOf(i)]).join('');
  }
}

// 换位类变体
const TranspositionVariants = {
  clean: t => (t || '').replace(/\s+/g, ''),
  keyOrder: (key, count) => {
    const raw = (key || '').toString().trim();
    let tokens;
    if (/^\d+(?:[\s,]+\d+)*$/.test(raw) && /[\s,]/.test(raw)) tokens = raw.split(/[\s,]+/).map(Number);
    else if (/^\d{2,}$/.test(raw)) tokens = [...raw].map(Number);
    else tokens = [...(raw || 'KEY')].map(c => c.toUpperCase().charCodeAt(0));
    if (count && tokens.length !== count) tokens = tokens.slice(0, count);
    return tokens.map((v, i) => ({ v, i })).sort((a, b) => a.v === b.v ? a.i - b.i : a.v > b.v ? 1 : -1).map(x => x.i);
  },
  keyLength: (key, fallback) => {
    const raw = (key || '').toString().trim();
    if (/^\d+(?:[\s,]+\d+)*$/.test(raw) && /[\s,]/.test(raw)) return Math.max(2, raw.split(/[\s,]+/).length);
    if (/^\d{2,}$/.test(raw)) return Math.max(2, raw.length);
    return Math.max(2, raw.length || fallback || 3);
  },
  routeE: (t, cols = 3) => {
    t = TranspositionVariants.clean(t); cols = Math.max(2, cols | 0);
    const rows = Math.ceil(t.length / cols), grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => t[r * cols + c] || 'X'));
    let top = 0, bottom = rows - 1, left = 0, right = cols - 1, out = '';
    while (top <= bottom && left <= right) {
      for (let c = left; c <= right; c++) out += grid[top][c]; top++;
      for (let r = top; r <= bottom; r++) out += grid[r][right]; right--;
      if (top <= bottom) { for (let c = right; c >= left; c--) out += grid[bottom][c]; bottom--; }
      if (left <= right) { for (let r = bottom; r >= top; r--) out += grid[r][left]; left++; }
    }
    return out;
  },
  routeD: (t, cols = 3) => {
    t = TranspositionVariants.clean(t); cols = Math.max(2, cols | 0);
    const rows = Math.ceil(t.length / cols), grid = Array.from({ length: rows }, () => Array(cols).fill(''));
    let top = 0, bottom = rows - 1, left = 0, right = cols - 1, idx = 0;
    while (top <= bottom && left <= right) {
      for (let c = left; c <= right; c++) grid[top][c] = t[idx++] || ''; top++;
      for (let r = top; r <= bottom; r++) grid[r][right] = t[idx++] || ''; right--;
      if (top <= bottom) { for (let c = right; c >= left; c--) grid[bottom][c] = t[idx++] || ''; bottom--; }
      if (left <= right) { for (let r = bottom; r >= top; r--) grid[r][left] = t[idx++] || ''; left++; }
    }
    return grid.flat().join('').replace(/X+$/g, '');
  },
  scytaleE: (t, cols = 3) => ColumnarRailCipher.e(t, cols),
  scytaleD: (t, cols = 3) => ColumnarRailCipher.d(t, cols),
  amscoLayout: (len, cols) => {
    const layout = [];
    let used = 0, size = 1;
    while (used < len) {
      const row = [];
      for (let c = 0; c < cols && used < len; c++) {
        const n = Math.min(size, len - used);
        row.push(n); used += n; size = size === 1 ? 2 : 1;
      }
      while (row.length < cols) row.push(0);
      layout.push(row);
    }
    return layout;
  },
  amscoE: (t, key = '3142', fallback = 3) => {
    t = TranspositionVariants.clean(t); const cols = TranspositionVariants.keyLength(key, fallback), layout = TranspositionVariants.amscoLayout(t.length, cols);
    let idx = 0; const grid = layout.map(row => row.map(n => { const part = t.slice(idx, idx + n); idx += n; return part; }));
    return TranspositionVariants.keyOrder(key, cols).map(c => grid.map(row => row[c] || '').join('')).join('');
  },
  amscoD: (t, key = '3142', fallback = 3) => {
    t = TranspositionVariants.clean(t); const cols = TranspositionVariants.keyLength(key, fallback), layout = TranspositionVariants.amscoLayout(t.length, cols);
    const grid = layout.map(row => row.map(() => '')); let idx = 0;
    for (const c of TranspositionVariants.keyOrder(key, cols)) {
      const need = layout.reduce((sum, row) => sum + row[c], 0);
      const chunk = t.slice(idx, idx + need); idx += need; let p = 0;
      for (let r = 0; r < layout.length; r++) { const n = layout[r][c]; grid[r][c] = chunk.slice(p, p + n); p += n; }
    }
    return grid.map(row => row.join('')).join('');
  },
  myszkowskiGroups: key => {
    const chars = [...((key || 'BALLOON').toString().toUpperCase())];
    const values = [...new Set(chars)].sort();
    return values.map(v => chars.map((c, i) => c === v ? i : -1).filter(i => i >= 0));
  },
  myszkowskiE: (t, key = 'BALLOON') => {
    t = TranspositionVariants.clean(t); const cols = Math.max(2, (key || 'BALLOON').length), rows = Math.ceil(t.length / cols);
    const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => t[r * cols + c] || ''));
    let out = '';
    for (const group of TranspositionVariants.myszkowskiGroups(key)) {
      if (group.length === 1) for (let r = 0; r < rows; r++) out += grid[r][group[0]] || '';
      else for (let r = 0; r < rows; r++) for (const c of group) out += grid[r][c] || '';
    }
    return out;
  },
  myszkowskiD: (t, key = 'BALLOON') => {
    t = TranspositionVariants.clean(t); const cols = Math.max(2, (key || 'BALLOON').length), rows = Math.ceil(t.length / cols);
    const grid = Array.from({ length: rows }, () => Array(cols).fill('')); let idx = 0;
    for (const group of TranspositionVariants.myszkowskiGroups(key)) {
      const positions = [];
      if (group.length === 1) for (let r = 0; r < rows; r++) { const p = r * cols + group[0]; if (p < t.length) positions.push([r, group[0]]); }
      else for (let r = 0; r < rows; r++) for (const c of group) { const p = r * cols + c; if (p < t.length) positions.push([r, c]); }
      for (const [r, c] of positions) grid[r][c] = t[idx++] || '';
    }
    return grid.flat().join('');
  },
  process: (t, count, key, variant = 'railFence') => {
    const c = Math.max(2, parseInt(count, 10) || 3);
    switch (variant) {
      case 'route': return `加密: ${TranspositionVariants.routeE(t, c)}\n解密: ${TranspositionVariants.routeD(t, c)}`;
      case 'scytale': return `加密: ${TranspositionVariants.scytaleE(t, c)}\n解密: ${TranspositionVariants.scytaleD(t, c)}`;
      case 'amsco': return `加密: ${TranspositionVariants.amscoE(t, key, c)}\n解密: ${TranspositionVariants.amscoD(t, key, c)}`;
      case 'myszkowski': return `加密: ${TranspositionVariants.myszkowskiE(t, key)}\n解密: ${TranspositionVariants.myszkowskiD(t, key)}`;
      default: return `加密: ${RailFence.e(t, c)}\n解密: ${RailFence.d(t, c)}`;
    }
  }
}

// AtBash码
const AtBash = {
  e: t => t.replace(/[a-z]/gi,
    c => String.fromCharCode(
      (c < 'a' ? 90 : 122) - (c.charCodeAt(0) - (c < 'a' ? 65 : 97))))
};

// 进制转换
const BaseConverter = {
  CHAR_SET: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  convert: (i, f, t) => i.split(' ').map(n => {
    const [p, q] = n.split('.');
    let d = 0n, r = [];
    for (const c of (p || '').toUpperCase()) {
      const v = BaseConverter.CHAR_SET.indexOf(c);
      if (v < 0 || v >= f) return `?${n}`;
      d = d * BigInt(f) + BigInt(v);
    }
    if (t == 1) return '0'.repeat(Number(d));
    if (d === 0n) r.push('0');
    while (d > 0n) {
      r.unshift(BaseConverter.CHAR_SET[Number(d % BigInt(t))]);
      d /= BigInt(t);
    }
    const i = r.join('') || '0';
    if (!q) return i; let e = 0;
    for (const c of q.toUpperCase()) {
      const v = BaseConverter.CHAR_SET.indexOf(c);
      if (v < 0 || v >= f) return `?${n}`;
      e = e * f + v;
    }
    if ((e /= Math.pow(f, q.length)) <= 0) return i;
    let s = '.';
    for (let j = 0; j < 20 && e > 0; j++) {
      e *= t;
      s += BaseConverter.CHAR_SET[Math.floor(e)];
      e -= Math.floor(e);
    }
    return i + s;
  }).join(' '),
  convertByChar: (i, f, t) => [...i.toUpperCase()]
    .map(c => c === '.' ? '.' : (v = BaseConverter
      .CHAR_SET.indexOf(c)) < 0 || v >= f ? `?${c}` : v ? BigInt(v)
        .toString(t).toUpperCase() : '0')
    .join(' ')
};

// 摩尔斯电码
const MorseCode = {
  dict: {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-',
    L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-',
    W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', 0: '-----',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
    '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
    '$': '...-..-', '@': '.--.-.', ' ': '/'
  },
  e: t => t.toUpperCase().split('')
    .map(c => MorseCode.dict[c] || c).join(' '),
  d: t => t.split(' ')
    .map(c => Object.keys(MorseCode.dict)
      .find(k => MorseCode.dict[k] === c) || c)
    .join('')
}

// 摩尔斯变体
const MorseVariants = {
  trigrams: (() => {
    const marks = ['.', '-', 'x'], out = [];
    for (const a of marks) for (const b of marks) for (const c of marks) out.push(a + b + c);
    return out.filter(g => g !== 'xxx');
  })(),
  keyedAlphabet: key => {
    const seen = new Set(), raw = ((key || '') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').toUpperCase().replace(/[^A-Z]/g, '');
    return [...raw].filter(c => !seen.has(c) && seen.add(c)).join('').slice(0, 26);
  },
  reverseDict: () => Object.fromEntries(Object.entries(MorseCode.dict).map(([k, v]) => [v, k])),
  fractionatedE: (t, key) => {
    const alpha = MorseVariants.keyedAlphabet(key);
    const table = Object.fromEntries(MorseVariants.trigrams.map((g, i) => [g, alpha[i]]));
    const words = (t || '').toUpperCase().split(/\s+/).map(w => [...w].map(c => /^[A-Z]$/.test(c) ? MorseCode.dict[c] : '').filter(Boolean).join('x')).filter(Boolean);
    let stream = words.join('xx');
    if (!stream) return '';
    stream = stream.padEnd(Math.ceil(stream.length / 3) * 3, 'x');
    return (stream.match(/.{3}/g) || []).map(g => table[g] || '?').join('');
  },
  fractionatedD: (t, key) => {
    const alpha = MorseVariants.keyedAlphabet(key);
    const reverseTri = Object.fromEntries([...alpha].map((c, i) => [c, MorseVariants.trigrams[i]]));
    const reverseMorse = MorseVariants.reverseDict();
    const stream = [...(t || '').toUpperCase()].map(c => reverseTri[c] || '').join('').replace(/x+$/g, '');
    return stream.split('xx').map(word => word.split('x').map(code => reverseMorse[code] || '').join('')).join(' ');
  },
  process: (t, variant = 'morse', key = 'KEYWORD') => variant === 'fractionated'
    ? `加密: ${MorseVariants.fractionatedE(t, key)}\n解密: ${MorseVariants.fractionatedD(t, key)}`
    : `加密: ${MorseCode.e(t)}\n解密: ${MorseCode.d(t)}`
}

// 手机九键
const PhoneKeyCipher = {
  dict: {
    A: '21', B: '22', C: '23', D: '31', E: '32', F: '33', G: '41', H: '42', I: '43', J: '51', K: '52',
    L: '53', M: '61', N: '62', O: '63', P: '71', Q: '72', R: '73', S: '74', T: '81', U: '82', V: '83',
    W: '91', X: '92', Y: '93', Z: '94', ' ': '0'
  },
  e: t => t.toUpperCase().split('')
    .map(c => PhoneKeyCipher.dict[c] || c)
    .join(' '),
  d: t => t.split(' ')
    .map(c => Object.keys(PhoneKeyCipher.dict)
      .find(k => PhoneKeyCipher.dict[k] === c) || c)
    .join('')
}

// 比尔密码
const BealeCipher = {
  e: (text, key) => text && key
    ? text.split(' ')
      .map((w, i) => key.split(' ')
        .map(Number)[i] && w[0])
      .join('') : '无效密钥或文本',
  d: () => '预留'
}

// 反切码
const FanqieCipher = {
  initials: { 1: 'l', 2: 'b', 3: 'q', 4: 'd', 5: 'b', 6: 't', 7: 'zh', 8: 'r', 9: 'sh', 11: 'y', 12: 'm', 13: 'y', 14: 'ch', 15: 'x', 16: 'd', 17: 'zh', 18: 'y', 19: 'j', 20: 'zh' },
  finals: { 1: 'un', 2: 'ua', 3: 'iang', 4: 'iu', 5: 'an', 6: 'ai', 7: 'ia', 8: 'in', 9: 'uan', 10: 'e', 11: 'v', 12: 'in', 13: 'ei', 14: 'u', 15: 'eng', 16: 'uang', 17: 'ui', 18: 'ao', 19: 'in', 20: 'ang', 22: 'ong', 23: 'iao', 24: 'uo', 25: 'i', 26: 'iao', 27: 'i', 28: 'eng', 29: 'ui', 30: 'u', 31: 'ian', 32: 'i', 33: 'ei', 34: 'ai', 35: 'e', 36: 'ou' },
  rev: dict => Object.fromEntries(Object.entries(dict).map(([k, v]) => [v, k])),
  e(fc) {
    return fc.trim().split(/\s+/).map(p => {
      const [i, f] = p.split(/[\/-]/);
      return (this.initials[i] || '') + (this.finals[f] || '') || '输入如15-8';
    }).join(' ')
  },
  d(pt) {
    const rf = this.rev(this.finals);
    return pt.trim().split(/\s+/).map(w => {
      const code = Object.entries(this.rev(this.initials)).find(([p]) => w.startsWith(p));
      return code ? `${code[1]}/${rf[w.slice(code[0].length)] || ''}`
        : rf[w] ? `0/${rf[w]}` : '输入如qiu'
    }).join(' ')
  }
}

//mRNA序列
const DnaCipher = {
  dnaMap: {
    GCU: 'A', GCC: 'A', GCA: 'B', GCG: 'B', UGU: 'C', UGC: 'C', GAU: 'D', GAC: 'D',
    GAA: 'E', GAG: 'E', UUU: 'F', UUC: 'F', GGU: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
    CAU: 'H', AUU: 'I', AUC: 'I', AUA: 'I', AGA: 'J', AGG: 'J', AAA: 'K', AAG: 'K',
    CUU: 'L', CUC: 'L', CUA: 'L', CUG: 'L', AUG: 'M', AAU: 'N', AAC: 'N', CCA: 'O',
    CCG: 'O', CCU: 'P', CCC: 'P', CAA: 'Q', CAG: 'Q', CGU: 'R', CGC: 'R', CGA: 'R',
    CGG: 'R', UCU: 'S', UCC: 'S', UCA: 'S', UCG: 'S', AGU: 'S', AGC: 'S', ACU: 'T',
    ACC: 'T', ACA: 'T', ACG: 'T', UUA: 'U', UUG: 'U', GUU: 'V', GUC: 'V', UGG: 'W',
    GUA: 'X', GUG: 'X', UAU: 'Y', UAC: 'Y', CAC: 'Z'
  },

  e: s => s?.trim().split(/\s+/)
    .map(c => DnaCipher.dnaMap[c])?.join('') || '请输入正确密码子如:GCU',
  d: t => t?.toUpperCase().split('')
    .map(l => DnaCipher.reverseMap[l] || '?')?.join(' ') || ' ',

  get reverseMap() {
    return Object.fromEntries(Object.entries(this.dnaMap).map(([k, v]) => [v, k]))
  }
}

// V字键盘
const VKeyboardCipher = {
  keyboardMap: {
    12: 'q', 23: 'w', 34: 'e', 45: 'r', 56: 't', 67: 'y', 78: 'u', 89: 'i', 90: 'o',
    13: 'a', 24: 's', 35: 'd', 46: 'f', 57: 'g', 68: 'h', 79: 'j', 80: 'k',
    14: 'z', 25: 'x', 36: 'c', 47: 'v', 58: 'b', 69: 'n', 70: 'm'
  },
  get reverseMap() { return Object.fromEntries(Object.entries(this.keyboardMap).map(([k, v]) => [v, k])) },
  e: function (t) {
    const chars = [...(t?.toLowerCase() || '')];
    const invalid = chars.find(c => c !== ' ' && !this.reverseMap[c]);
    return invalid ? `无效字符 ${invalid}`
      : chars.map(c => c === ' ' ? ' ' : this.reverseMap[c]).join(' ');
  },
  d: function (s) {
    const codes = (s?.trim().split(/\s+/) || []);
    const invalid = codes.find(code => code && !this.keyboardMap[code]);
    return invalid || codes.map(code => this.keyboardMap[code] || '').join('');
  }
}

//QWE键盘
const QweCipher = {
  keyboardMap: {
    q: 'a', w: 'b', e: 'c', r: 'd', t: 'e', y: 'f', u: 'g', i: 'h', o: 'i', p: 'j',
    a: 'k', s: 'l', d: 'm', f: 'n', g: 'o', h: 'p', j: 'q', k: 'r', l: 's',
    z: 't', x: 'u', c: 'v', v: 'w', b: 'x', n: 'y', m: 'z'
  },
  get reverseMap() { return Object.fromEntries(Object.entries(this.keyboardMap).map(([k, v]) => [v, k])) },
  e(t = '') {
    const chars = [...t.toLowerCase()]
    const invalid = chars.find(c => c !== ' ' && !this.keyboardMap[c])
    return invalid ? `无效字符: ${invalid}`
      : chars.map(c => c === ' ' ? ' ' : this.keyboardMap[c]).join('')
  },
  d(t = '') {
    const chars = [...t.toLowerCase()]
    const invalid = chars.find(c => c !== ' ' && !this.reverseMap[c])
    return invalid ? `无效字符: ${invalid}`
      : chars.map(c => c === ' ' ? ' ' : this.reverseMap[c]).join('')
  }
}

//培根密码
const BaconCipher = {
  baconMap: {
    A: 'aaaaa', B: 'aaaab', C: 'aaaba', D: 'aaabb', E: 'aabaa', F: 'aabab', G: 'aabba', H: 'aabbb', I: 'abaaa', K: 'ababa',
    L: 'ababb', M: 'abbaa', N: 'abbab', O: 'abbba', P: 'abbbb', Q: 'baaaa', R: 'baaab', S: 'baaba', T: 'baabb', U: 'babaa',
    V: 'babab', W: 'babba', X: 'babbb', Y: 'bbaaa', Z: 'bbaab', 0: 'abbba', 1: 'aaaaa', 2: 'aaaab', 3: 'aaaba', 4: 'aaabb',
    5: 'aabaa', 6: 'aabab', 7: 'aabba', 8: 'aabbb', 9: 'abaaa'
  },
  get reverseMap() { return Object.fromEntries(Object.entries(this.baconMap).map(([k, v]) => [v, k])) },
  e(t = '') {
    const chars = [...t.toUpperCase()]
    const invalid = chars.find(c => c !== ' ' && !this.baconMap[c])
    return invalid ? `Invalid char: ${invalid}`
      : chars.map(c => c === ' ' ? ' ' : this.baconMap[c]).join(' ')
        .toLowerCase().replace(/\s+/g, ' ').trim()
  },
  d(t = '') {
    const codes = t.toLowerCase().replace(/[^ab]/g, '').match(/.{5}/g) || []
    const invalid = codes.find(c => !this.reverseMap[c])
    return invalid ? `Invalid code: ${invalid}`
      : codes.map(c => this.reverseMap[c] || '').join('')
  }
}


// 柱状栅栏 (实际上是柱状转置密码)
class ColumnarRailCipher {
  static e = (t, c) => {
    c = Math.max(2, c | 0); t = t.replace(/\s/g, '');
    let r = Math.ceil(t.length / c), s = '';
    for (let j = 0; j < c; j++) for (let i = 0; i < r; i++) {
      let k = i * c + j; k < t.length && (s += t[k]);
    }
    return s;
  }
  static d = (t, c) => {
    c = Math.max(2, c | 0); t = t.replace(/\s/g, '');
    let r = Math.ceil(t.length / c), s = '';
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
      let k = j * r + i; k < t.length && (s += t[k]);
    }
    return s;
  }
}

// W型栅栏
const WShapeRailFenceCipher = {
  e: (s, r) => {
    s = s.replace(/\s+/g, ''); r = Math.max(2, r | 0);
    const cycle = 2 * r - 2, rows = Array(r).fill('');
    [...s].forEach((c, i) =>
      rows[Math.min(i % cycle, cycle - i % cycle)] += c
    ); return rows.join('');
  },
  d: (s, r) => {
    s = s.replace(/\s+/g, ''); r = Math.max(2, r | 0);
    const cycle = 2 * r - 2, n = s.length;
    const cnt = Array(r).fill(0);
    [...Array(n)].forEach((_, i) =>
      cnt[Math.min(i % cycle, cycle - i % cycle)]++);

    const rows = cnt.map((c, i) =>
      s.slice(cnt.slice(0, i).reduce((a, b) => a + b, 0),
        cnt.slice(0, i + 1).reduce((a, b) => a + b, 0)));
    let row = 0, step = 1;

    return Array.from({ length: n },
      () => {
        const c = rows[row][0];
        rows[row] = rows[row].slice(1); row += step;
        if (row >= r - 1 || row <= 0) step *= -1; return c;
      }).join('');
  }
}

// 01248密码
const Cipher01248 = {
  e: function (text) {
    return [...(text?.toUpperCase() || '')]
      .map(c => {
        const n = c.charCodeAt() - 64;
        if (n < 1 || n > 26) return '';
        const segment = [8, 4, 2, 1].reduce(([str, num], val) =>
          [str + val.toString().repeat(Math.floor(num / val)), num % val], ['', n])[0];
        return segment + '0';
      })
      .join('')
      .replace(/0$/, '') || ''
  },
  d: function (cipher) {
    return (cipher?.split('0') || [])
      .map(seg => seg
        ? String.fromCharCode([...seg].reduce((a, b) => a + +b, 0) + 64)
        : '')
      .join('')
      .replace(/[^A-Z]/g, '')
  }
}

// 元音密码
const VowelCipher = {
  encryptionMap: {
    A: '1', B: '11', C: '12', D: '13', E: '2', F: '21', G: '22', H: '23', I: '3',
    J: '31', K: '32', L: '33', M: '34', N: '35', O: '4', P: '41', Q: '42', R: '43',
    S: '44', T: '45', U: '5', V: '51', W: '52', X: '53', Y: '54', Z: '55'
  },
  get decryptionMap() {
    return Object.fromEntries(
      Object.entries(this.encryptionMap).map(([k, v]) => [v, k])
    )
  },
  e(text = '') {
    return [...text.toUpperCase()]
      .map(c => this.encryptionMap[c] ? `${this.encryptionMap[c]} ` : c)
      .join('').replace(/  +/g, ' ').trim()
  },
  d(ciphertext = '') {
    return ciphertext.split(/\s+/)
      .map(code => this.decryptionMap[code] || code)
      .join('')
  }
}

// ASCII码
const ASCIIHandler = {
  convert(t, i, ot) {
    if (i === ot) return t;
    let decimals = [];
    switch (i) {
      case 'char': decimals = [...t].map(c => c.charCodeAt(0)); break;
      case 'dec': decimals = t.split(/[ ,]/).filter(Boolean).map(Number); break;
      case 'hex': decimals = t.split(/[ ,]/).filter(Boolean).map(h => parseInt(h, 16)); break;
      case 'oct': decimals = t.split(/[ ,]/).filter(Boolean).map(o => parseInt(o, 8)); break;
      case 'bin': decimals = t.split(/[ ,]/).filter(Boolean).map(b => parseInt(b, 2)); break;
    }
    return decimals.map(d => {
      if (isNaN(d)) return '请输入正确字符';
      switch (ot) {
        case 'char': return String.fromCharCode(d);
        case 'dec': return d.toString(10);
        case 'hex': return d.toString(16).toUpperCase();
        case 'oct': return d.toString(8);
        case 'bin': return d.toString(2).padStart(8, '0');
      }
    }).join(' ');
  }
}

// 中文电码
function convertKnownChars(text, lookup) {
  const out = [];
  let raw = '';
  const flushRaw = () => { if (raw) { out.push(raw); raw = ''; } };
  for (const char of [...text]) {
    const converted = lookup(char);
    if (converted != null) { flushRaw(); out.push(converted); } else { raw += char; }
  }
  flushRaw();
  return out.join(' ');
}

const CCCHandler = {
  codeTable: CCC_TABLE || [],
  convert(text) {
    if (!text.trim()) return "";
    return /^[\d\s]+$/.test(text.trim()) ? this.d(text) : this.e(text);
  },
  d(text) {
    return text.trim().split(/\s+/).map(c => {
      const codeNum = parseInt(c.replace(/^0+/, '') || '0', 10);
      return this.codeTable.find(i => i.CCCnumber === codeNum)?.CCCCharacter || c;
    }).join("");
  },
  e(text) {
    return convertKnownChars(text, c => {
      const e = this.codeTable.find(i => i.CCCCharacter === c);
      return e ? e.CCCnumber.toString().padStart(4, '0') : null;
    });
  }
};

// 四角号码处理函数
const fourCCCHandler = {
  codeTable: fourCCC_TABLE || [],
  convert(text) {
    if (!text.trim()) return "";
    return /^[\d\s]+$/.test(text.trim()) ? this.d(text) : this.e(text);
  },
  d(text) {
    return text.trim().split(/\s+/).map(c =>
      this.codeTable.find(i => i.fourCCCnumber === parseInt(c, 10))?.fourCCCCharacter || c
    ).join("");
  },
  e(text) {
    return convertKnownChars(text, c => {
      const e = this.codeTable.find(i => i.fourCCCCharacter === c);
      return e ? e.fourCCCnumber : null;
    });
  }
};

// ROT密码转换
const ROTCipher = {
  rotMethods: {
    char: [[48, 57]], dec: [[65, 90], [97, 122]],
    hex: [[48, 57], [65, 90], [97, 122]], oct: [[33, 126]]
  },
  _rotate: (cp, ranges) => {
    const range = ranges.find(([s, e]) => cp >= s && cp <= e);
    if (!range) return cp;
    const [start, end] = range;
    const count = end - start + 1;
    cp += Math.floor(count / 2);
    return cp > end ? cp - count : cp;
  },
  _process: (t, ranges) =>
    String.fromCharCode(...[...t].map(c => ROTCipher._rotate(c.charCodeAt(0), ranges))),
  e: (t, type) => ROTCipher._process(t, ROTCipher.rotMethods[type] || []) || t
}

//Polybius方阵  
class PolybiusCipher {
  static createSquare(abc, r, c) {
    const sq = {}; let idx = 0; for (const ro of r)
      for (const co of c)
        if (idx < abc.length) sq[abc[idx++]] = ro + co;
        else return sq;
    return sq
  }
  static e(t, abc, r, c) {
    if (!abc || !r || !c)
      return "请配置字母表、行和列";
    const sq = this.createSquare(abc, r, c);
    return t.toLowerCase().split('').map(
      ch => sq[ch] ? sq[ch] + ' ' : (ch === ' ' ? '  ' : '')
    ).join('').trim()
  }
  static d(encT, abc, r, c) {
    if (!abc || !r || !c)
      return "请配置字母表、行和列";
    const sq = this.createSquare(abc, r, c);
    const revSq = Object.fromEntries(
      Object.entries(sq).map(([k, v]) => [v, k]));
    return encT.trim().split(/\s+/).filter(Boolean).map(
      p => revSq[p] || ''
    ).join('')
  }
}

// Polybius 类变体
const PolybiusVariants = {
  square5: key => {
    const seen = new Set(), raw = ((key || '') + 'ABCDEFGHIKLMNOPQRSTUVWXYZ').toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    return [...raw].filter(c => !seen.has(c) && seen.add(c)).join('').slice(0, 25);
  },
  clean5: t => (t || '').toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, ''),
  pairs: t => {
    const s = PolybiusVariants.clean5(t), out = [];
    for (let i = 0; i < s.length; i += 2) out.push([s[i], s[i + 1] || 'X']);
    return out;
  },
  pos5: (sq, c) => { const i = sq.indexOf(c); return [Math.floor(i / 5), i % 5]; },
  trifidAlpha: key => {
    const seen = new Set(), raw = ((key || '') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.').toUpperCase().replace(/[^A-Z.]/g, '');
    return [...raw].filter(c => !seen.has(c) && seen.add(c)).join('').slice(0, 27);
  },
  trifidCoord: (alpha, c) => {
    const i = Math.max(0, alpha.indexOf(c));
    return [Math.floor(i / 9) + 1, Math.floor((i % 9) / 3) + 1, i % 3 + 1];
  },
  trifidChar: (alpha, a, b, c) => alpha[(a - 1) * 9 + (b - 1) * 3 + c - 1] || '',
  trifidE: (t, key, period = 5) => {
    const alpha = PolybiusVariants.trifidAlpha(key), s = (t || '').toUpperCase().replace(/[^A-Z.]/g, '');
    period = Math.max(1, parseInt(period, 10) || 5); let out = '';
    for (let i = 0; i < s.length; i += period) {
      const block = [...s.slice(i, i + period)], coords = block.map(c => PolybiusVariants.trifidCoord(alpha, c));
      const seq = coords.map(x => x[0]).concat(coords.map(x => x[1]), coords.map(x => x[2]));
      for (let j = 0; j < seq.length; j += 3) out += PolybiusVariants.trifidChar(alpha, seq[j], seq[j + 1], seq[j + 2]);
    }
    return out;
  },
  trifidD: (t, key, period = 5) => {
    const alpha = PolybiusVariants.trifidAlpha(key), s = (t || '').toUpperCase().replace(/[^A-Z.]/g, '');
    period = Math.max(1, parseInt(period, 10) || 5); let out = '';
    for (let i = 0; i < s.length; i += period) {
      const block = [...s.slice(i, i + period)], seq = block.flatMap(c => PolybiusVariants.trifidCoord(alpha, c));
      const n = block.length, a = seq.slice(0, n), b = seq.slice(n, 2 * n), c = seq.slice(2 * n);
      for (let j = 0; j < n; j++) out += PolybiusVariants.trifidChar(alpha, a[j], b[j], c[j]);
    }
    return out;
  },
  fourSquareE: (t, keyA, keyB) => {
    const normal = 'ABCDEFGHIKLMNOPQRSTUVWXYZ', sqA = PolybiusVariants.square5(keyA), sqB = PolybiusVariants.square5(keyB);
    return PolybiusVariants.pairs(t).map(([a, b]) => {
      const [r1, c1] = PolybiusVariants.pos5(normal, a), [r2, c2] = PolybiusVariants.pos5(normal, b);
      return sqA[r1 * 5 + c2] + sqB[r2 * 5 + c1];
    }).join('');
  },
  fourSquareD: (t, keyA, keyB) => {
    const normal = 'ABCDEFGHIKLMNOPQRSTUVWXYZ', sqA = PolybiusVariants.square5(keyA), sqB = PolybiusVariants.square5(keyB), s = PolybiusVariants.clean5(t);
    let out = '';
    for (let i = 0; i < s.length; i += 2) {
      const [r1, c2] = PolybiusVariants.pos5(sqA, s[i]), [r2, c1] = PolybiusVariants.pos5(sqB, s[i + 1] || 'X');
      out += normal[r1 * 5 + c1] + normal[r2 * 5 + c2];
    }
    return out;
  },
  twoSquareE: (t, keyA, keyB) => {
    const sqA = PolybiusVariants.square5(keyA), sqB = PolybiusVariants.square5(keyB);
    return PolybiusVariants.pairs(t).map(([a, b]) => {
      const [r1, c1] = PolybiusVariants.pos5(sqA, a), [r2, c2] = PolybiusVariants.pos5(sqB, b);
      return sqA[r1 * 5 + c2] + sqB[r2 * 5 + c1];
    }).join('');
  },
  twoSquareD: (t, keyA, keyB) => {
    const sqA = PolybiusVariants.square5(keyA), sqB = PolybiusVariants.square5(keyB), s = PolybiusVariants.clean5(t);
    let out = '';
    for (let i = 0; i < s.length; i += 2) {
      const [r1, c2] = PolybiusVariants.pos5(sqA, s[i]), [r2, c1] = PolybiusVariants.pos5(sqB, s[i + 1] || 'X');
      out += sqA[r1 * 5 + c1] + sqB[r2 * 5 + c2];
    }
    return out;
  },
  nihilistMap: key => {
    const sq = PolybiusVariants.square5(key), map = {}, rev = {};
    [...sq].forEach((c, i) => { const n = (Math.floor(i / 5) + 1) * 10 + i % 5 + 1; map[c] = n; rev[n] = c; });
    return { map, rev };
  },
  nihilistE: (t, keyA, keyB) => {
    const { map } = PolybiusVariants.nihilistMap(keyA), s = PolybiusVariants.clean5(t), keyNums = PolybiusVariants.clean5(keyB || 'KEY').split('').map(c => map[c]).filter(Boolean);
    if (!keyNums.length) return '密钥无效';
    return [...s].map((c, i) => map[c] + keyNums[i % keyNums.length]).join(' ');
  },
  nihilistD: (t, keyA, keyB) => {
    const { map, rev } = PolybiusVariants.nihilistMap(keyA), keyNums = PolybiusVariants.clean5(keyB || 'KEY').split('').map(c => map[c]).filter(Boolean);
    if (!keyNums.length) return '密钥无效';
    return ((t || '').match(/\d+/g) || []).map((n, i) => rev[parseInt(n, 10) - keyNums[i % keyNums.length]] || '?').join('');
  },
  process: (t, variant, abc, rows, cols, keyA, keyB, period) => {
    switch (variant) {
      case 'trifid': return `加密: ${PolybiusVariants.trifidE(t, keyA, period)}\n解密: ${PolybiusVariants.trifidD(t, keyA, period)}`;
      case 'fourSquare': return `加密: ${PolybiusVariants.fourSquareE(t, keyA, keyB)}\n解密: ${PolybiusVariants.fourSquareD(t, keyA, keyB)}`;
      case 'twoSquare': return `加密: ${PolybiusVariants.twoSquareE(t, keyA, keyB)}\n解密: ${PolybiusVariants.twoSquareD(t, keyA, keyB)}`;
      case 'nihilist': return `加密: ${PolybiusVariants.nihilistE(t, keyA, keyB)}\n解密: ${PolybiusVariants.nihilistD(t, keyA, keyB)}`;
      default: return `加密: ${PolybiusCipher.e(t, abc, rows, cols)} \n解密: ${PolybiusCipher.d(t, abc, rows, cols)}`;
    }
  }
}

// 仿射
const Affine = {
  modInv: (a, m) => {
    a = ((a % m) + m) % m;
    for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x
    return null
  },
  e: (t, alpha, a, b) => {
    let m = alpha.length, r = "";
    for (let c of t) {
      let i = alpha.indexOf(c.toLowerCase());
      if (i === -1) r += c; else {
        let j = ((a * i + b) % m + m) % m;
        r += c === c.toUpperCase() ? alpha[j].toUpperCase() : alpha[j];
      }
    }
    return r
  },
  d: (t, alpha, a, b) => {
    let m = alpha.length, inv = Affine.modInv(a, m);
    if (inv === null) return "无解";
    let r = ""; for (let c of t) {
      let i = alpha.indexOf(c.toLowerCase());
      if (i === -1) r += c; else {
        let j = ((inv * (i - b)) % m + m) % m;
        r += c === c.toUpperCase() ? alpha[j].toUpperCase() : alpha[j]
      }
    }
    return r
  }
}

// 敲击码 
const TapCode = {
  e: (t, tm = '.', gm = ' ', lm = '  ') => {
    t = t.toLowerCase().replace(/k/g, 'c').replace(/[^a-z]/g, '');
    if (!t) return '';
    let r = '';
    for (let i = 0, l = t.length; i < l; i++) {
      const p = 'abcdefghijlmnopqrstuvwxyz'.indexOf(t[i]);
      if (p < 0) continue;
      const row = ~~(p / 5) + 1, col = p % 5 + 1;
      i > 0 && (r += lm);
      r += tm.repeat(row) + gm + tm.repeat(col);
    } return r;
  },

  d: (c, tm = '.', gm = ' ', lm = '  ') => {
    if (!c) return '';
    const a = 'abcdefghijlmnopqrstuvwxyz';
    let r = '';
    c.split(lm).forEach(g => {
      if (!g.trim()) return;
      const p = g.split(gm);
      if (p.length !== 2) return;
      const re = new RegExp(tm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const row = (p[0].match(re) || []).length;
      const col = (p[1].match(re) || []).length;
      if (row < 1 || row > 5 || col < 1 || col > 5) return;
      const idx = (row - 1) * 5 + (col - 1);
      idx < a.length && (r += a[idx]);
    });
    return r;
  }
}

//Bifid Cipher
const Bifid = {
  generateSquare: k => {
    k = k.toLowerCase()
      .replace(/[^a-z]/g, "").replace(/j/g, "i"); let s = "", n = new Set;
    for (let e of k) n.has(e) || (s += e, n.add(e));
    for (let e of "abcdefghiklmnopqrstuvwxyz") n.has(e) || (s += e, n.add(e));
    return s
  },
  e: (t, k) => {
    t = t.toLowerCase().replace(/[^a-z]/g, "")
      .replace(/j/g, "i"); if (!t) return "";
    let s = Bifid.generateSquare(k),
      r = "", o = ""; for (let e of t) {
        let a = s.indexOf(e), l = Math.floor(a / 5) + 1, f = a % 5 + 1; r += l, o += f
      }
    let n = r + o, c = ""; for (let e = 0; e < n.length; e += 2) {
      let r = parseInt(n[e]) - 1, a = parseInt(n[e + 1]) - 1; c += s[5 * r + a]
    } return c
  },

  d: (t, k) => {
    t = t.toLowerCase().replace(/[^a-z]/g, "")
      .replace(/j/g, "i"); if (!t) return "";
    let s = Bifid.generateSquare(k), r = "";
    for (let e of t) { let a = s.indexOf(e), l = Math.floor(a / 5) + 1, f = a % 5 + 1; r += l + "" + f }
    let o = t.length, n = r.substring(0, o), c = r.substring(o), a = "";
    for (let e = 0; e < o; e++) { let l = parseInt(n[e]) - 1, t = parseInt(c[e]) - 1; a += s[5 * l + t] }
    return a
  }
};

// Base码 Base16 Base32 Base64 Base58 Base85 Base91 Base100
const baseCipher = {
  e: (t, type) => {
    try {
      const m = type.toLowerCase().replace(/^base/, '');
      switch (m) {
        case '16': return [...new TextEncoder().encode(t || '')].map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
        case '32': {
          if (!t) return ''; const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', b = new TextEncoder().encode(t);
          let r = '', s = 0, v = 0; for (let i = 0; i < b.length; i++) {
            v = (v << 8) | b[i]; s += 8;
            while (s >= 5) { s -= 5; r += a[(v >> s) & 31]; }
          }
          if (s > 0) r += a[(v << (5 - s)) & 31];
          return r.padEnd(Math.ceil(r.length / 8) * 8, '=');
        }
        case '64': return t ? btoa(unescape(encodeURIComponent(t))) : '';
        case '58': {
          if (!t) return ''; const a = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
          const b = new TextEncoder().encode(t); let z = 0; while (z < b.length && b[z] === 0) z++;
          let v = 0n; for (let i = 0; i < b.length; i++) v = v * 256n + BigInt(b[i]);
          let r = ''; while (v > 0n) { r = a[Number(v % 58n)] + r; v /= 58n; }
          return '1'.repeat(z) + r;
        }
        case '85': {
          if (!t) return '';
          const a = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu';
          const b = new TextEncoder().encode(t), r = [];
          for (let i = 0; i < b.length; i += 4) {
            let c = b.slice(i, i + 4);
            if (c.length < 4) c = [...c, ...Array(4 - c.length).fill(0)];
            let v = (c[0] << 24) | (c[1] << 16) | (c[2] << 8) | c[3];
            if (v === 0 && c.length === 4) { r.push('z'); continue; }
            for (let j = 0; j < 5; j++) r.push(a[Math.floor(v / Math.pow(85, 4 - j)) % 85]);
          } return r.join('').slice(0, r.length - (4 - (b.length % 4)) % 4);
        }
        case '91': {
          if (!t) return '';
          const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
          const b = new TextEncoder().encode(t); let r = '', n = 0, v = 0;
          for (let i = 0; i < b.length; i++) {
            v |= b[i] << n; n += 8;
            if (n > 13) {
              let c = v & (n > 13 ? 8191 : 16383);
              v >>= c > 88 ? 13 : 14; n -= c > 88 ? 13 : 14;
              r += a[c % 91] + a[Math.floor(c / 91)];
            }
          } if (n > 0) { r += a[v % 91]; if (n > 7 || v > 90) r += a[Math.floor(v / 91)]; } return r;
        }
        case '100': return t ? [...new TextEncoder().encode(t)].map(b => String.fromCodePoint(128512 + b)).join('') : '';
        default: return `不支持的编码: base${m}`;
      }
    } catch (e) { return `编码错误: ${e.message}`; }
  },

  d: (t, type) => {
    try {
      if (!t) return ''; const m = type.toLowerCase().replace(/^base/, '');
      switch (m) {
        case '16': {
          if (!/^[0-9A-Fa-f]+$/.test(t)) return '无效的Base16编码';
          if (t.length % 2) return '无效的Base16编码长度'; const b = new Uint8Array(t.length / 2);
          for (let i = 0; i < t.length; i += 2) b[i / 2] = parseInt(t.substr(i, 2), 16);
          return new TextDecoder().decode(b);
        }
        case '32': {
          const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
          t = t.replace(/=+$/, '').toUpperCase(); if (!/^[A-Z2-7]+$/.test(t)) return '无效的Base32编码';
          let b = [], v = 0, s = 0; for (let i = 0; i < t.length; i++) {
            v = (v << 5) | a.indexOf(t[i]); s += 5;
            while (s >= 8) { s -= 8; b.push((v >> s) & 0xFF); }
          }
          return new TextDecoder().decode(new Uint8Array(b));
        }
        case '64': return t ? decodeURIComponent(escape(atob(t))) : '';
        case '58': {
          const a = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
          let z = 0; while (t[z] === '1') z++;
          let v = 0n; for (let i = z; i < t.length; i++) {
            const idx = a.indexOf(t[i]);
            if (idx === -1) return '无效的Base58字符'; v = v * 58n + BigInt(idx);
          }
          let b = []; while (v > 0n) { b.unshift(Number(v & 255n)); v >>= 8n; }
          for (let i = 0; i < z; i++) b.unshift(0);
          return new TextDecoder().decode(new Uint8Array(b));
        }
        case '85': {
          const a = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu';
          t = t.replace(/z/g, '!!!!!'); let b = []; for (let i = 0; i < t.length; i += 5) {
            const chunk = t.substr(i, 5);
            if (chunk.length < 5) break; let v = 0; for (let j = 0; j < 5; j++) v = v * 85 + a.indexOf(chunk[j]);
            b.push((v >> 24) & 0xFF); b.push((v >> 16) & 0xFF); b.push((v >> 8) & 0xFF); b.push(v & 0xFF);
          }
          if (t.length % 5) {
            const chunk = t.substr(Math.floor(t.length / 5) * 5);
            let v = 0; for (let j = 0; j < chunk.length; j++) v = v * 85 + a.indexOf(chunk[j]);
            for (let j = chunk.length; j < 5; j++) v = v * 85 + 84;
            for (let j = 0; j < chunk.length - 1; j++) b.push((v >> (24 - j * 8)) & 0xFF);
          }
          return new TextDecoder().decode(new Uint8Array(b));
        }
        case '91': {
          const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
          let b = [], v = 0, n = 0, l = t.length; for (let i = 0; i < l; i += 2) {
            if (i + 1 >= l) break;
            const c1 = a.indexOf(t[i]); const c2 = a.indexOf(t[i + 1]); if (c1 < 0 || c2 < 0) continue; const val = c1 + c2 * 91;
            if (val >= 8192) { v |= val << n; b.push(v & 0xFF); v >>= 8; n -= 8; b.push(v & 0xFF); v >>= 8; n -= 8; }
            else { v |= val << n; b.push(v & 0xFF); v >>= 8; n -= 8; } n += val < 8192 ? 13 : 14;
          }
          if (l % 2) {
            const c = a.indexOf(t[l - 1]); if (c >= 0) {
              v |= c << n;
              while (n >= 8) { b.push(v & 0xFF); v >>= 8; n -= 8; }
            }
          }
          return new TextDecoder().decode(new Uint8Array(b));
        } case '100': {
          let b = []; for (const c of t) {
            const cp = c.codePointAt(0);
            if (cp >= 128512 && cp < 128768) b.push(cp - 128512);
          }
          return new TextDecoder().decode(new Uint8Array(b));
        } default: return `不支持的解码: base${m}`;
      }
    } catch (e) { return `无效字符`; }
  }
};

// A1Z26 字母序号
const A1Z26Cipher = {
  offset: mode => mode === 'a0' ? 0 : 1,
  e: (t, mode = 'a1') => {
    const off = A1Z26Cipher.offset(mode);
    return [...(t || '')].map(c => {
      if (/[a-z]/i.test(c)) return String(c.toUpperCase().charCodeAt(0) - 65 + off);
      if (/\s/.test(c)) return '/';
      return c;
    }).join(' ').replace(/\s+\/\s+/g, ' / ').replace(/\s+/g, ' ').trim();
  },
  d: (t, mode = 'a1') => {
    const off = A1Z26Cipher.offset(mode), min = off, max = off + 25;
    return (t || '').replace(/\d+/g, n => {
      const v = parseInt(n, 10);
      return v >= min && v <= max ? String.fromCharCode(v - off + 65) : n;
    }).replace(/\s*\/\s*/g, ' ');
  }
}

// Playfair 双字母密码
const PlayfairCipher = {
  alphabet: 'ABCDEFGHIKLMNOPQRSTUVWXYZ',
  square: key => {
    const seen = new Set(), letters = ((key || '') + PlayfairCipher.alphabet).toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    return [...letters].filter(c => !seen.has(c) && seen.add(c));
  },
  pairs: t => {
    const letters = (t || '').toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    const pairs = [];
    for (let i = 0; i < letters.length; i++) {
      const a = letters[i], b = letters[i + 1] || 'X';
      if (a === b) pairs.push([a, 'X']);
      else { pairs.push([a, b]); i++; }
    }
    return pairs;
  },
  pos: (sq, c) => {
    const i = sq.indexOf(c);
    return { r: Math.floor(i / 5), c: i % 5 };
  },
  runPair: (sq, a, b, dir) => {
    const pa = PlayfairCipher.pos(sq, a), pb = PlayfairCipher.pos(sq, b);
    if (pa.r === pb.r) return sq[pa.r * 5 + (pa.c + dir + 5) % 5] + sq[pb.r * 5 + (pb.c + dir + 5) % 5];
    if (pa.c === pb.c) return sq[((pa.r + dir + 5) % 5) * 5 + pa.c] + sq[((pb.r + dir + 5) % 5) * 5 + pb.c];
    return sq[pa.r * 5 + pb.c] + sq[pb.r * 5 + pa.c];
  },
  e: (t, key) => {
    const sq = PlayfairCipher.square(key);
    return PlayfairCipher.pairs(t).map(([a, b]) => PlayfairCipher.runPair(sq, a, b, 1)).join('');
  },
  d: (t, key) => {
    const sq = PlayfairCipher.square(key), letters = (t || '').toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    let r = '';
    for (let i = 0; i < letters.length; i += 2) r += PlayfairCipher.runPair(sq, letters[i], letters[i + 1] || 'X', -1);
    return r;
  }
}

// Pigpen 共济会密码
const PigpenCipher = {
  letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  symbols: ['⌜','⊓','⌝','⊏','□','⊐','⌞','⊔','⌟','⌜·','⊓·','⌝·','⊏·','□·','⊐·','⌞·','⊔·','⌟·','◇⌜','◇⊓','◇⌝','◇⊏','◇⌞','◇⊔','◇⌟','◇□'],
  e: t => [...(t || '').toUpperCase()].map(c => {
    const i = PigpenCipher.letters.indexOf(c);
    if (i >= 0) return PigpenCipher.symbols[i];
    if (/\s/.test(c)) return '/';
    return c;
  }).join(' '),
  d: t => {
    const reverse = Object.fromEntries(PigpenCipher.symbols.map((s, i) => [s, PigpenCipher.letters[i]]));
    return (t || '').split(/\s+/).map(token => token === '/' ? ' ' : (reverse[token] || token)).join('');
  }
}

// Substitution 替换分析助手
const SubstitutionTools = {
  unique: s => [...(s || '')].filter((c, i, a) => c && a.indexOf(c) === i).join(''),
  mapAlphabet: (from, to) => {
    from = SubstitutionTools.unique(from); to = SubstitutionTools.unique(to);
    const map = {};
    for (let i = 0; i < Math.min(from.length, to.length); i++) {
      map[from[i]] = to[i];
      if (/[a-z]/i.test(from[i]) && /[a-z]/i.test(to[i])) {
        map[from[i].toUpperCase()] = to[i].toUpperCase();
        map[from[i].toLowerCase()] = to[i].toLowerCase();
      }
    }
    return map;
  },
  applyMap: (t, map, unknown = null) => [...(t || '')].map(c => {
    const mapped = map[c] || map[c.toUpperCase?.()];
    if (!mapped) return unknown === null || !/[a-z]/i.test(c) ? c : unknown;
    return c === c.toLowerCase() ? mapped.toLowerCase() : mapped.toUpperCase();
  }).join(''),
  applyAlphabet: (t, from, to) => SubstitutionTools.applyMap(t, SubstitutionTools.mapAlphabet(from, to)),
  frequency: t => {
    const counts = {}, letters = ((t || '').toUpperCase().match(/[A-Z]/g) || []);
    letters.forEach(c => counts[c] = (counts[c] || 0) + 1);
    const total = letters.length || 1;
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return rows.length ? rows.map(([c, n]) => `${c}:${n}(${Math.round(n * 100 / total)}%)`).join(' ') : '无字母';
  },
  parseManual: m => {
    const map = {};
    (m || '').split(/[\s,;]+/).filter(Boolean).forEach(part => {
      const pair = part.split(/[:=\-＞>]/).filter(Boolean);
      if (pair.length < 2) return;
      const left = pair[0].toUpperCase().replace(/[^A-Z]/g, ''), right = pair[1].toUpperCase().replace(/[^A-Z]/g, '');
      for (let i = 0; i < Math.min(left.length, right.length); i++) map[left[i]] = right[i];
    });
    return map;
  },
  cribMap: (cipher, plain) => {
    const map = {}, conflicts = [];
    cipher = (cipher || '').toUpperCase(); plain = (plain || '').toUpperCase();
    for (let i = 0; i < Math.min(cipher.length, plain.length); i++) {
      const c = cipher[i], p = plain[i];
      if (!/[A-Z]/.test(c) || !/[A-Z]/.test(p)) continue;
      if (map[c] && map[c] !== p) conflicts.push(`${c}:${map[c]}/${p}`);
      map[c] = p;
    }
    return { map, conflicts };
  },
  replaceCrib: (t, cipher, plain) => {
    if (!cipher || !plain) return '未设置';
    const esc = cipher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (t || '').replace(new RegExp(esc, 'gi'), m => m === m.toUpperCase() ? plain.toUpperCase() : plain.toLowerCase());
  },
  analyze: (t, plainAlphabet, cipherAlphabet, manual, cribCipher, cribPlain) => {
    const manualMap = SubstitutionTools.parseManual(manual);
    const crib = SubstitutionTools.cribMap(cribCipher, cribPlain);
    const merged = { ...manualMap, ...crib.map };
    const manualResult = Object.keys(merged).length ? SubstitutionTools.applyMap(t, merged, '.') : '未设置';
    const conflicts = crib.conflicts.length ? `\nCrib冲突: ${crib.conflicts.join(' ')}` : '';
    return `任意字母表加密: ${SubstitutionTools.applyAlphabet(t, plainAlphabet, cipherAlphabet)}\n` +
      `任意字母表解密: ${SubstitutionTools.applyAlphabet(t, cipherAlphabet, plainAlphabet)}\n` +
      `频率分析: ${SubstitutionTools.frequency(t)}\n` +
      `手动映射/Crib映射: ${manualResult}\n` +
      `Crib替换: ${SubstitutionTools.replaceCrib(t, cribCipher, cribPlain)}${conflicts}`;
  }
}
// 跳舞的小人密码
const DancingMenCipher = {
  letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  symbols: ['○╱│╲','╲○│╱','○─│╲','╱○│─','○╱│─','─○│╲','○─│╱','╲○│─','○╱╲','╲○╱','○┌│','┐○│','○│┘','└│○','○┬│','┴○│','○╱┘','└○╲','○─┘','└─○','○╲┐','┌╱○','○┤╱','╲├○','○┬╲','╱┴○'],
  e: t => [...(t || '').toUpperCase()].map(c => {
    const i = DancingMenCipher.letters.indexOf(c);
    if (i >= 0) return DancingMenCipher.symbols[i];
    if (/\s/.test(c)) return '/';
    return c;
  }).join(' '),
  d: t => {
    const rev = Object.fromEntries(DancingMenCipher.symbols.map((s, i) => [s, DancingMenCipher.letters[i]]));
    return (t || '').split(/\s+/).map(token => token === '/' ? ' ' : rev[token] || token).join('');
  }
}

// Hill Cipher
const HillCipher = {
  mod: n => ((n % 26) + 26) % 26,
  invMod: n => {
    n = HillCipher.mod(n);
    for (let i = 1; i < 26; i++) if ((n * i) % 26 === 1) return i;
    return null;
  },
  parseKey: (key, size) => {
    const need = size * size;
    let vals = ((key || '').match(/-?\d+/g) || []).map(Number);
    if (vals.length < need) vals = (((key || '').toUpperCase().match(/[A-Z]/g) || []).map(c => c.charCodeAt(0) - 65));
    if (vals.length < need) return null;
    vals = vals.slice(0, need).map(HillCipher.mod);
    return Array.from({ length: size }, (_, r) => vals.slice(r * size, r * size + size));
  },
  det: m => m.length === 2
    ? m[0][0] * m[1][1] - m[0][1] * m[1][0]
    : m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]),
  inverse: m => {
    const size = m.length, invDet = HillCipher.invMod(HillCipher.det(m));
    if (invDet == null) return null;
    if (size === 2) return [
      [HillCipher.mod(m[1][1] * invDet), HillCipher.mod(-m[0][1] * invDet)],
      [HillCipher.mod(-m[1][0] * invDet), HillCipher.mod(m[0][0] * invDet)]
    ];
    const cof = Array.from({ length: 3 }, () => Array(3).fill(0));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const sub = [0, 1, 2].filter(i => i !== r).map(i => [0, 1, 2].filter(j => j !== c).map(j => m[i][j]));
      cof[r][c] = ((r + c) % 2 ? -1 : 1) * (sub[0][0] * sub[1][1] - sub[0][1] * sub[1][0]);
    }
    return Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, c) => HillCipher.mod(cof[c][r] * invDet)));
  },
  multiply: (m, vec) => m.map(row => HillCipher.mod(row.reduce((sum, v, i) => sum + v * vec[i], 0))),
  run: (t, key, size, decrypt = false) => {
    size = parseInt(size, 10) === 3 ? 3 : 2;
    let matrix = HillCipher.parseKey(key, size);
    if (!matrix) return '密钥长度不足';
    if (decrypt) {
      matrix = HillCipher.inverse(matrix);
      if (!matrix) return '密钥矩阵不可逆';
    }
    let s = (t || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!s) return '';
    while (s.length % size) s += 'X';
    let out = '';
    for (let i = 0; i < s.length; i += size) {
      const vec = [...s.slice(i, i + size)].map(c => c.charCodeAt(0) - 65);
      out += HillCipher.multiply(matrix, vec).map(n => String.fromCharCode(n + 65)).join('');
    }
    return out;
  },
  process: (t, key, size) => `加密: ${HillCipher.run(t, key, size, false)}\n解密: ${HillCipher.run(t, key, size, true)}`
}

// SHA-1 SHA-256 SHA-384 SHA-512
function createHashCipher(algorithm) {
  return {
    e: async function (input) {
      return Array.from(new Uint8Array(
        await crypto.subtle.digest(
          algorithm, new TextEncoder().encode(input))))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    },
    hmac: async function (key, message) {
      const messageBytes = typeof message === 'string'
        ? new TextEncoder().encode(message)
        : message;
      const blockSize = algorithm === 'SHA-1' || algorithm === 'SHA-256' ? 64 : 128;
      let keyBytes;
      if (typeof key === 'string') {
        const hexRegex = /^([0-9a-fA-F]{2}\s*)+$/;
        if (hexRegex.test(key)) {
          const cleanHex = key.replace(/\s+/g, '');
          keyBytes = new Uint8Array(cleanHex.length / 2);
          for (let i = 0; i < cleanHex.length; i += 2) {
            keyBytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
          }
        } else { keyBytes = new TextEncoder().encode(key); }
      } else { keyBytes = key; }
      if (keyBytes.length > blockSize) {
        keyBytes = new Uint8Array(
          await crypto.subtle.digest(algorithm, keyBytes)
        );
      }
      const innerPadding = new Uint8Array(blockSize).fill(0x36);
      const outerPadding = new Uint8Array(blockSize).fill(0x5C);
      for (let i = 0; i < keyBytes.length; i++) {
        innerPadding[i] ^= keyBytes[i];
        outerPadding[i] ^= keyBytes[i];
      }
      const innerInput = new Uint8Array(innerPadding.length + messageBytes.length);
      innerInput.set(innerPadding);
      innerInput.set(messageBytes, innerPadding.length);
      const innerHash = await crypto.subtle.digest(algorithm, innerInput);
      const outerInput = new Uint8Array(outerPadding.length + innerHash.byteLength);
      outerInput.set(outerPadding);
      outerInput.set(new Uint8Array(innerHash), outerPadding.length);
      return Array.from(new Uint8Array(await crypto.subtle.digest(algorithm, outerInput)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  }
}


const SHA1Cipher = createHashCipher('SHA-1')
const SHA256Cipher = createHashCipher('SHA-256')
const SHA384Cipher = createHashCipher('SHA-384')
const SHA512Cipher = createHashCipher('SHA-512')

