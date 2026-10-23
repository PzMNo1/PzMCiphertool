// 通用码表：NATO / 罗马数字 / 七段数码管 / 元素周期表 / 音乐唱名 / Scrabble
const CodeTables = {
  natoWords: ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'],
  romanTable: [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ],
  sevenMap: { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' },
  elements: ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'],
  musicMap: { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' },
  scrabbleMap: {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
    N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
  },
  toRoman(n) {
    n = parseInt(n, 10);
    if (!Number.isFinite(n) || n < 1 || n > 3999) return '?';
    let out = '';
    for (const [v, s] of this.romanTable) {
      while (n >= v) { out += s; n -= v; }
    }
    return out;
  },
  fromRoman(s) {
    const str = String(s || '').toUpperCase();
    if (!/^[IVXLCDM]+$/.test(str)) return '?';
    const val = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let n = 0;
    for (let i = 0; i < str.length; i++) {
      const cur = val[str[i]], next = val[str[i + 1]] || 0;
      n += cur < next ? -cur : cur;
    }
    return n;
  },
  natoE: t => [...String(t || '').toUpperCase()].map(c => /[A-Z]/.test(c) ? CodeTables.natoWords[c.charCodeAt(0) - 65] : c).join(' ').replace(/\s+/g, ' ').trim(),
  natoD: t => String(t || '').split(/[\s,;]+/).filter(Boolean).map(w => {
    const i = CodeTables.natoWords.findIndex(x => x.toLowerCase() === w.toLowerCase());
    return i >= 0 ? String.fromCharCode(65 + i) : w;
  }).join(''),
  romanE: t => String(t || '').split(/[\s,;]+/).filter(Boolean).map(x => CodeTables.toRoman(x)).join(' '),
  romanD: t => String(t || '').split(/[\s,;]+/).filter(Boolean).map(x => CodeTables.fromRoman(x)).join(' '),
  sevenE: t => [...String(t || '')].map(c => /\d/.test(c) ? CodeTables.sevenMap[c] : c).join(' ').replace(/\s+/g, ' ').trim(),
  sevenD: t => String(t || '').split(/[\s,;]+/).filter(Boolean).map(x => {
    const s = x.toLowerCase().split('').sort().join('');
    return Object.keys(CodeTables.sevenMap).find(k => CodeTables.sevenMap[k] === s) || '?';
  }).join(''),
  elementE: t => String(t || '').split(/[\s,;]+/).filter(Boolean).map(x => {
    const n = parseInt(x, 10);
    return Number.isFinite(n) && n >= 1 && n <= CodeTables.elements.length ? CodeTables.elements[n - 1] : x;
  }).join(' '),
  elementD: t => String(t || '').split(/[\s,;]+/).filter(Boolean).map(x => {
    const i = CodeTables.elements.findIndex(e => e.toLowerCase() === x.toLowerCase());
    return i >= 0 ? i + 1 : x;
  }).join(' '),
  musicE: t => [...String(t || '').toUpperCase()].map(c => CodeTables.musicMap[c] || c).join(' ').replace(/\s+/g, ' ').trim(),
  musicD: t => String(t || '').split(/[\s,;]+/).filter(Boolean).map(w => {
    if (/^\d$/.test(w)) return 'CDEFGAB'[parseInt(w, 10) - 1] || w;
    const i = Object.entries(CodeTables.musicMap).find(([, v]) => v.toLowerCase() === w.toLowerCase());
    return i ? i[0] : w;
  }).join(''),
  scrabbleE: t => [...String(t || '').toUpperCase()].map(c => CodeTables.scrabbleMap[c] ?? c).join(' ').replace(/\s+/g, ' ').trim(),
  process: (t, type) => {
    switch (type) {
      case 'roman': return `编码: ${CodeTables.romanE(t)}\n解码: ${CodeTables.romanD(t)}`;
      case 'seven': return `编码: ${CodeTables.sevenE(t)}\n解码: ${CodeTables.sevenD(t)}`;
      case 'element': return `编码: ${CodeTables.elementE(t)}\n解码: ${CodeTables.elementD(t)}`;
      case 'music': return `编码: ${CodeTables.musicE(t)}\n解码: ${CodeTables.musicD(t)}`;
      case 'scrabble': return `分值: ${CodeTables.scrabbleE(t)}`;
      default: return `编码: ${CodeTables.natoE(t)}\n解码: ${CodeTables.natoD(t)}`;
    }
  }
};
