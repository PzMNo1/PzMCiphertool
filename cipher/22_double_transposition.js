// 双重列换位（keyed columnar ×2）
const DoubleTransposition = (() => {
  const clean = t => String(t || '').replace(/\s+/g, '');
  const order = key => [...String(key || 'KEY').toUpperCase()].map((c, i) => ({ c, i }))
    .sort((a, b) => a.c === b.c ? a.i - b.i : a.c > b.c ? 1 : -1).map(x => x.i);

  function onceE(text, key) {
    const s = clean(text), cols = Math.max(2, String(key || '').length);
    const rows = Math.ceil(s.length / cols);
    const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => s[r * cols + c] || ''));
    return order(key).map(c => grid.map(row => row[c]).join('')).join('');
  }

  function onceD(text, key) {
    const s = clean(text), cols = Math.max(2, String(key || '').length);
    const rows = Math.ceil(s.length / cols);
    const orderArr = order(key);
    const lens = Array.from({ length: cols }, (_, c) => rows - (c >= s.length % cols && s.length % cols ? 1 : 0));
    const columns = new Array(cols);
    let pos = 0;
    for (const c of orderArr) {
      const len = lens[c];
      columns[c] = [...s.slice(pos, pos + len)];
      pos += len;
    }
    let out = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out += columns[c][r] || '';
    return out;
  }

  return {
    encrypt: (t, k1, k2) => onceE(onceE(t, k1), k2),
    decrypt: (t, k1, k2) => onceD(onceD(t, k2), k1),
    process: (t, k1, k2) => `加密: ${onceE(onceE(t, k1), k2)}\n解密: ${onceD(onceD(t, k2), k1)}`
  };
})();
