// ADFGX/ADFVGX
const ADFGXCipher = {
    ect(p, a, k, t) {
        const { square, rows } = this.bPS(a, t);
        const coords = this.enTC(p, square, t);
        return this.tpse(coords, k, rows);},

    dpt(c, a, k, t) {
        const { square, rows } = this.bPS(a, t);
        const columnOrder = this.gCO(k);
        const coords = this.istp(c.toUpperCase(), columnOrder, rows);
        return this.dFrC(coords, square).toLowerCase();},

    bPS(c, t) {
        const isADFGVX = t === 'ADFVGX';
        const defaultAlpha = isADFGVX 
          ? 'abcdefghijklmnopqrstuvwxyz0123456789' : 'abcdefghiklmnopqrstuvwxyz';
        let alpha = [...new Set(c.toLowerCase().replace(/j/g, 'i'))]
          .join('') .replace(/[^a-z0-9]/g, '');
        const fullAlpha = alpha + [...defaultAlpha].filter(c => !alpha.includes(c)).join('');
        const validAlpha = isADFGVX ? fullAlpha.slice(0, 36) : fullAlpha.slice(0, 25);
        const rows = isADFGVX ? 'ADFGVX' : 'ADFGX'; const size = rows.length;
        const square = {};
        for (let i = 0; i < validAlpha.length; i++) {
            const rowChar = rows[Math.floor(i / size)];
            const colChar = rows[i % size];
            square[validAlpha[i]] = rowChar + colChar;
        } return { square, rows };},

    enTC(text, square, type) {
      return [...text.toLowerCase()]
        .map(c => c === 'j' && type === 'ADFGX' ? 'i' : c)
        .filter(c => c in square) .map(c => square[c])
        .join('');
    },

    dFrC(coords, square) {
        const reverseSquare = Object.entries(square).reduce((acc, [k, v]) => {
            acc[v] = k; return acc; }, {});
        return Array.from({length: coords.length / 2}, (_, i) => {
            return reverseSquare[coords.substr(i*2, 2)] || '';
        }).join('');
    },
    gCO(keyword) {
      const sorted = [...keyword].map((c, i) => ({
        char: c.toLowerCase(),
        index: i
      })).sort((a, b) => a.char.localeCompare(b.char) || a.index - b.index);
      return sorted.map(({ index }) => index);
    },

    tpse(coords, keyword, rows) {
      const keyLen = keyword.length;
      if (keyLen === 0) return coords;
      const columnOrder = this.gCO(keyword);
      const result = [];
      columnOrder.forEach(col => {
        for (let i = col; i < coords.length; i += keyLen) {
          result.push(coords[i]);
        }
      }); return result.join('').match(/.{1,5}/g)?.join(' ') || '';
    },

    istp(ciphertext, columnOrder, rows) {
        const cleanText = [...ciphertext.toUpperCase()]
            .filter(c => rows.includes(c))
            .join('');
        const keyLen = columnOrder.length;
        const totalLen = cleanText.length;
        const result = new Array(totalLen);
        let ptr = 0;
        columnOrder.forEach(origCol => {
            const colLen = Math.ceil((totalLen - origCol) / keyLen);
            for (let i = 0; i < colLen; i++) {
                const pos = origCol + i * keyLen;
                if (pos < totalLen) result[pos] = cleanText[ptr++];
            }
        });
        return result.join('');
    }
}
