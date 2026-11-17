// Chaocipher：双盘动态替换
const Chaocipher = (() => {
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const normalize = (s, fallback) => {
    const raw = String(s || '').toUpperCase().replace(/[^A-Z]/g, '');
    const seen = new Set();
    const out = [...raw].filter(c => !seen.has(c) && seen.add(c));
    for (const c of fallback || ALPHA) if (!seen.has(c)) { seen.add(c); out.push(c); }
    return out.slice(0, 26);
  };
  const rotate = (arr, idx) => arr.slice(idx).concat(arr.slice(0, idx));

  function permuteLeft(arr, cipherChar) {
    const i = arr.indexOf(cipherChar);
    if (i < 0) return arr;
    const a = rotate(arr.slice(), i);
    const ch = a.splice(1, 1)[0];
    a.splice(13, 0, ch);
    return a;
  }

  function permuteRight(arr, plainChar) {
    const i = arr.indexOf(plainChar);
    if (i < 0) return arr;
    const a = rotate(arr.slice(), (i + 1) % 26);
    const ch = a.splice(2, 1)[0];
    a.splice(13, 0, ch);
    return a;
  }

  function run(text, leftTxt, rightTxt, decrypt) {
    let left = normalize(leftTxt, ALPHA);
    let right = normalize(rightTxt, ALPHA);
    let out = '';
    for (const ch of String(text || '')) {
      const up = ch.toUpperCase();
      if (!/[A-Z]/.test(up)) { out += ch; continue; }
      let plain, cipher;
      if (decrypt) {
        const idx = left.indexOf(up);
        cipher = up;
        plain = idx >= 0 ? right[idx] : up;
      } else {
        const idx = right.indexOf(up);
        plain = up;
        cipher = idx >= 0 ? left[idx] : up;
      }
      out += ch === up ? (decrypt ? plain : cipher) : (decrypt ? plain : cipher).toLowerCase();
      left = permuteLeft(left, cipher);
      right = permuteRight(right, plain);
    }
    return out;
  }

  return {
    process: (text, left, right) => `加密: ${run(text, left, right, false)}\n解密: ${run(text, left, right, true)}`,
    encrypt: (text, left, right) => run(text, left, right, false),
    decrypt: (text, left, right) => run(text, left, right, true)
  };
})();
