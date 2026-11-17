// 书码 / Ottendorf：用一段书文做索引
const BookCipher = {
  normalizeBook(book) {
    const lines = String(book || '').split(/\r?\n/);
    return lines.map(line => line.split(/\s+/).filter(Boolean).map(w => [...w]));
  },
  charAt(book, mode, a, b, c, base) {
    const off = base === 0 ? 0 : 1;
    if (mode === 'absolute') {
      return [...String(book || '')][a - off] || '';
    }
    if (mode === 'wordLetter') {
      const words = String(book || '').split(/\s+/).filter(Boolean);
      return (words[a - off] || '')[b - off] || '';
    }
    const lines = this.normalizeBook(book);
    return ((lines[a - off] || [])[b - off] || [])[c - off] || '';
  },
  encode(plain, book, mode, base) {
    const off = base === 0 ? 0 : 1;
    const lines = this.normalizeBook(book);
    const words = String(book || '').split(/\s+/).filter(Boolean);
    const chars = [...String(book || '')];
    const out = [];
    for (const ch of String(plain || '')) {
      if (/\s/.test(ch)) { out.push('/'); continue; }
      let token = '?';
      if (mode === 'absolute') {
        const i = chars.indexOf(ch);
        if (i >= 0) token = String(i + off);
      } else if (mode === 'wordLetter') {
        const wi = words.findIndex(w => [...w].includes(ch));
        if (wi >= 0) token = `${wi + off}.${[...words[wi]].indexOf(ch) + off}`;
      } else {
        outer: for (let li = 0; li < lines.length; li++) {
          for (let wi = 0; wi < lines[li].length; wi++) {
            const ci = lines[li][wi].indexOf(ch);
            if (ci >= 0) { token = `${li + off}.${wi + off}.${ci + off}`; break outer; }
          }
        }
      }
      out.push(token);
    }
    return out.join(' ');
  },
  decode(code, book, mode, base) {
    const off = base === 0 ? 0 : 1;
    return String(code || '').split(/\s+/).filter(Boolean).map(token => {
      if (token === '/') return ' ';
      const n = token.split(/[.,:;\-]/).map(x => parseInt(x, 10));
      if (n.some(x => !Number.isFinite(x))) return '?';
      if (mode === 'absolute') return this.charAt(book, mode, n[0], 0, 0, base);
      if (mode === 'wordLetter') return this.charAt(book, mode, n[0], n[1], 0, base);
      return this.charAt(book, mode, n[0], n[1], n[2], base);
    }).join('');
  },
  process(plain, code, book, mode, base) {
    return `编码: ${this.encode(plain, book, mode, base)}\n解码: ${this.decode(code, book, mode, base)}`;
  }
};
