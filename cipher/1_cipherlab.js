// 凯撒密码
const Caesar = {
    e: (t,s) => t.replace(/[a-z]/gi, 
        c => String.fromCharCode((
        c.charCodeAt(0)-(c<'a'?65:97)+s+26) %26 + (c<'a'?65:97))),
    d: (t,s) => Caesar.e(t,-s)
}

// 维吉尼亚密码
const Vigenere = { 
    e: (t,k,mode=1)=>{ 
        t = t.replace(/\s/g, "");
        let r="",ki=0,K=(k||"KEY")
        .toUpperCase(); 
        for(let c of t){ if(/[a-z]/i.test(c)){ 
            let b=c<'a'?65:97, 
            sh=K[ki % K.length].charCodeAt(0)-65; 
            r+=String.fromCharCode(
                (c.charCodeAt(0)-b+(mode===1?sh:-sh)+26)%26+b); 
            ki++; } else r+=c; } return r; 
        },
    d: (t,k)=>Vigenere.e(t,k,-1) 
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

// AtBash码
const AtBash = { 
    e: t=> t.replace(/[a-z]/gi, 
    c=> String.fromCharCode(
        (c<'a'?90:122) - (c.charCodeAt(0)-(c<'a'?65:97))))
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

// 手机九键
const PhoneKeyCipher = { 
    dict: {
        A: '21', B: '22', C: '23', D: '31', E: '32', F: '33', G: '41', H: '42', I: '43', J: '51', K: '52', 
        L: '53', M: '61', N: '62', O: '63', P: '71', Q: '72', R: '73', S: '74', T: '81', U: '82', V: '83', 
        W: '91', X: '92', Y: '93', Z: '94', ' ': '0'},
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
    initials: {1:'l',2:'b',3:'q',4:'d',5:'b',6:'t',7:'zh',8:'r',9:'sh',11:'y',12:'m',13:'y',14:'ch',15:'x',16:'d',17:'zh',18:'y',19:'j',20:'zh'},
    finals: {1:'un',2:'ua',3:'iang',4:'iu',5:'an',6:'ai',7:'ia',8:'in',9:'uan',10:'e',11:'v',12:'in',13:'ei',14:'u',15:'eng',16:'uang',17:'ui',18:'ao',19:'in',20:'ang',22:'ong',23:'iao',24:'uo',25:'i',26:'iao',27:'i',28:'eng',29:'ui',30:'u',31:'ian',32:'i',33:'ei',34:'ai',35:'e',36:'ou'},
    rev: dict => Object.fromEntries(Object.entries(dict).map(([k,v]) => [v,k])),
    e(fc) {
      return fc.trim().split(/\s+/).map(p => {
        const [i, f] = p.split(/[\/-]/);
        return (this.initials[i] || '') + (this.finals[f] || '') || '输入如15-8';
      }).join(' ')},
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
      GCU:'A',GCC:'A',GCA:'B',GCG:'B',UGU:'C',UGC:'C',GAU:'D',GAC:'D',
      GAA:'E',GAG:'E',UUU:'F',UUC:'F',GGU:'G',GGC:'G',GGA:'G',GGG:'G',
      CAU:'H',AUU:'I',AUC:'I',AUA:'I',AGA:'J',AGG:'J',AAA:'K',AAG:'K',
      CUU:'L',CUC:'L',CUA:'L',CUG:'L',AUG:'M',AAU:'N',AAC:'N',CCA:'O',
      CCG:'O',CCU:'P',CCC:'P',CAA:'Q',CAG:'Q',CGU:'R',CGC:'R',CGA:'R',
      CGG:'R',UCU:'S',UCC:'S',UCA:'S',UCG:'S',AGU:'S',AGC:'S',ACU:'T',
      ACC:'T',ACA:'T',ACG:'T',UUA:'U',UUG:'U',GUU:'V',GUC:'V',UGG:'W',
      GUA:'X',GUG:'X',UAU:'Y',UAC:'Y',CAC:'Z'},
    
    e: s => s?.trim().split(/\s+/)
      .map(c => DnaCipher.dnaMap[c])?.join('') || '请输入正确密码子如:GCU',
    d: t => t?.toUpperCase().split('')
      .map(l => DnaCipher.reverseMap[l] || '?')?.join(' ') || ' ',
  
    get reverseMap() { 
      return Object.fromEntries(Object.entries(this.dnaMap).map(([k,v]) => [v,k])) 
    }
}

// V字键盘
const VKeyboardCipher = {
    keyboardMap: {
      12:'q',23:'w',34:'e',45:'r',56:'t',67:'y',78:'u',89:'i',90:'o',
      13:'a',24:'s',35:'d',46:'f',57:'g',68:'h',79:'j',80:'k',
      14:'z',25:'x',36:'c',47:'v',58:'b',69:'n',70:'m'},
    get reverseMap() {return Object.fromEntries(Object.entries(this.keyboardMap).map(([k,v]) => [v,k]))},
    e: function(t) {
        const chars = [...(t?.toLowerCase()||'')];
        const invalid = chars.find(c => c!==' ' && !this.reverseMap[c]);
        return invalid ? `无效字符 ${invalid}` 
             : chars.map(c => c === ' ' ? ' ' : this.reverseMap[c]).join(' ');
    },
    d: function(s) {
        const codes = (s?.trim().split(/\s+/) || []);
        const invalid = codes.find(code => code && !this.keyboardMap[code]);
        return invalid || codes.map(code => this.keyboardMap[code]||'').join('');
    }
}

//QWE键盘
const QweCipher = {
    keyboardMap: {
        q:'a',w:'b',e:'c',r:'d',t:'e',y:'f',u:'g',i:'h',o:'i',p:'j',
        a:'k',s:'l',d:'m',f:'n',g:'o',h:'p',j:'q',k:'r',l:'s',
        z:'t',x:'u',c:'v',v:'w',b:'x',n:'y',m:'z'
    },
    get reverseMap() {return Object.fromEntries(Object.entries(this.keyboardMap).map(([k,v]) => [v,k]))},
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
      A:'aaaaa', B:'aaaab', C:'aaaba', D:'aaabb', E:'aabaa', F:'aabab', G:'aabba', H:'aabbb', I:'abaaa', K:'ababa',
      L:'ababb', M:'abbaa', N:'abbab', O:'abbba', P:'abbbb', Q:'baaaa', R:'baaab', S:'baaba', T:'baabb', U:'babaa',
      V:'babab', W:'babba', X:'babbb', Y:'bbaaa', Z: 'bbaab', 0:'abbba', 1:'aaaaa', 2:'aaaab', 3:'aaaba', 4:'aaabb',
      5:'aabaa', 6:'aabab', 7:'aabba', 8:'aabbb', 9:'abaaa'
    },
    get reverseMap() {return Object.fromEntries(Object.entries(this.baconMap).map(([k, v]) => [v, k]))},
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
class ColumnarRailCipher{
    static e = (t,c) => {
        c = Math.max(2,c|0); t = t.replace(/\s/g,''); 
        let r = Math.ceil(t.length/c), s='';
        for(let j = 0; j < c; j++) for(let i = 0; i < r; i++){ 
            let k = i * c + j; k < t.length && (s += t[k]); }
        return s;
    }
    static d = (t,c) => {
        c = Math.max(2,c|0); t = t.replace(/\s/g,''); 
        let r = Math.ceil(t.length/c), s='';
        for(let i = 0; i < r; i++) for(let j = 0; j < c; j++){ 
            let k = j * r + i; k < t.length && (s += t[k]); }
        return s;
    }
}

// W型栅栏
const WShapeRailFenceCipher = {
    e: (s, r) => {
        s = s.replace(/\s+/g, ''); r = Math.max(2, r|0);
        const cycle = 2*r - 2, rows = Array(r).fill('');
        [...s].forEach((c, i) => 
          rows[Math.min(i%cycle, cycle - i%cycle)] += c
        ); return rows.join('');
    },
    d: (s, r) => {
        s = s.replace(/\s+/g, ''); r = Math.max(2, r|0);
        const cycle = 2*r-2, n = s.length;
        const cnt = Array(r).fill(0);
        [...Array(n)].forEach((_,i) => 
          cnt[Math.min(i%cycle, cycle -i%cycle)]++);

        const rows = cnt.map((c,i) => 
          s.slice(cnt.slice(0,i).reduce((a,b)=>a+b,0), 
          cnt.slice(0,i+1).reduce((a,b)=>a+b,0)));
        let row = 0, step = 1;

        return Array.from({length:n}, 
          () => {const c = rows[row][0];
          rows[row] = rows[row].slice(1); row += step;
          if(row >= r-1 || row <= 0) step *= -1; return c;
        }).join('');
    }
}

// 01248密码
const Cipher01248 = {
    e: function(text) {return [...(text?.toUpperCase()||'')]
        .map(c => {
          const n = c.charCodeAt() - 64;
          if (n < 1 || n > 26) return '';
          const segment = [8,4,2,1].reduce(([str, num], val) => 
            [str + val.toString().repeat(Math.floor(num/val)), num%val], ['',n])[0];
          return segment + '0';
        })
        .join('')
        .replace(/0$/, '') || ''
    },
    d: function(cipher) {return (cipher?.split('0') || [])
        .map(seg => seg 
             ? String.fromCharCode([...seg].reduce((a,b) => a + +b, 0) + 64)
             : '')
        .join('')
        .replace(/[^A-Z]/g, '')
    }
}
  
// 元音密码
const VowelCipher = {
    encryptionMap: {
      A:'1',B:'11',C:'12',D:'13',E:'2',F:'21',G:'22',H:'23',I:'3',
      J:'31',K:'32',L:'33',M:'34',N:'35',O:'4',P:'41',Q:'42',R:'43',
      S:'44',T:'45',U:'5',V:'51',W:'52',X:'53',Y:'54',Z:'55'
    },
    get decryptionMap() { return Object.fromEntries(
        Object.entries(this.encryptionMap).map(([k, v]) => [v, k])
        )
    },
    e(text = '') { return [...text.toUpperCase()]
        .map(c => this.encryptionMap[c] ? `${this.encryptionMap[c]} ` : c)
        .join('') .replace(/  +/g, ' ') .trim()
    },
    d(ciphertext = '') { return ciphertext.split(/\s+/)
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
const CCCHandler = {
  codeTable: CCC_TABLE || [],
  convert(text) {
    if(!text.trim()) return "";
    return /^[\d\s]+$/.test(text.trim()) ? this.d(text) : this.e(text);
  },
  d(text) {
    return text.trim().split(/\s+/).map(c => {
      const codeNum = parseInt(c.replace(/^0+/, '') || '0', 10);
      return this.codeTable.find(i => i.CCCnumber === codeNum)?.CCCCharacter || `错误:${c}`;
    }).join("");
  },
  e(text) {
    return [...text].map(c => {
      const e = this.codeTable.find(i => i.CCCCharacter === c);
      return e ? e.CCCnumber.toString().padStart(4, '0') : `错误:${c}`;
    }).join(" ");
  }
};

// 四角号码处理函数
const fourCCCHandler = {
  codeTable: fourCCC_TABLE || [],
  convert(text) {
    if(!text.trim()) return "";
    return /^[\d\s]+$/.test(text.trim()) ? this.d(text) : this.e(text);
  },
  d(text) {
    return text.trim().split(/\s+/).map(c => 
      this.codeTable.find(i => i.fourCCCnumber === parseInt(c, 10))?.fourCCCCharacter || `错误:${c}`
    ).join("");
  },
  e(text) {
    return [...text].map(c => {
      const e = this.codeTable.find(i => i.fourCCCCharacter === c);
      return e ? e.fourCCCnumber : `错误:${c}`;
    }).join(" ");
  }
};

// ROT密码转换
const ROTCipher = {
    rotMethods: {
        char: [[48,57]], dec:[[65,90],[97,122]], 
        hex:  [[48,57],[65,90],[97,122]], oct:  [[33,126]]         
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
    static createSquare(abc,r,c){
        const sq = {}; let idx=0;for(const ro of r)
        for(const co of c)
        if(idx < abc.length) sq[abc[idx++]] = ro + co;
        else return sq;
        return sq
    }
    static e(t,abc,r,c){
        if(!abc || !r || !c)
        return"请配置字母表、行和列";
        const sq = this.createSquare(abc,r,c);
        return t.toLowerCase().split('').map(
            ch => sq[ch]?sq[ch]+' ':(ch===' '?'  ':'')
        ).join('').trim()
    }
    static d(encT,abc,r,c){if(!abc || !r || !c)
        return"请配置字母表、行和列";
        const sq = this.createSquare(abc,r,c);
        const revSq = Object.fromEntries(
            Object.entries(sq).map(([k,v])=>[v,k]));
        return encT.trim().split(/\s+/).filter(Boolean).map(
            p => revSq[p] || ''
        ).join('')
    }
}

// 仿射
const Affine = {
    modInv: (a,m)=> { a=((a%m)+m)%m; 
        for(let x=1;x<m;x++) if((a*x)%m===1)return x
        return null
    },
    e: (t,alpha,a,b)=>{ 
        let m=alpha.length, r=""; 
        for(let c of t){ let i=alpha.indexOf(c.toLowerCase()); 
            if(i===-1) r+=c; else { let j = ((a*i+b)%m+m)%m; 
                r+= c===c.toUpperCase()? alpha[j].toUpperCase() : alpha[j]; 
            } } 
        return r
    },
    d: (t,alpha,a,b)=>{ 
        let m=alpha.length, inv=Affine.modInv(a,m); 
        if(inv===null)return "无解"; 
        let r=""; for(let c of t){ 
            let i=alpha.indexOf(c.toLowerCase()); 
            if(i===-1) r+=c; else { let j = ((inv*(i-b))%m+m)%m; 
                r+= c===c.toUpperCase()? alpha[j].toUpperCase() : alpha[j]
            } } 
        return r
    }
}

// 敲击码 
const TapCode = {
  e: (t, tm='.', gm=' ', lm='  ') => {
    t = t.toLowerCase().replace(/k/g,'c').replace(/[^a-z]/g,'');
    if(!t) return '';
    let r = '';
    for(let i=0, l=t.length; i<l; i++) {
      const p = 'abcdefghijlmnopqrstuvwxyz'.indexOf(t[i]);
      if(p < 0) continue;
      const row = ~~(p/5)+1, col = p%5+1;
      i > 0 && (r += lm);
      r += tm.repeat(row) + gm + tm.repeat(col);
    } return r;},
    
  d: (c, tm='.', gm=' ', lm='  ') => {
    if(!c) return '';
    const a = 'abcdefghijlmnopqrstuvwxyz';
    let r = '';
    c.split(lm).forEach(g => {
      if(!g.trim()) return;
      const p = g.split(gm);
      if(p.length !== 2) return;
      const re = new RegExp(tm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const row = (p[0].match(re) || []).length;
      const col = (p[1].match(re) || []).length;
      if(row<1 || row>5 || col<1 || col>5) return;
      const idx = (row-1)*5 + (col-1);
      idx < a.length && (r += a[idx]);
    });
    return r;
  }
}

//Bifid Cipher
const Bifid={
  generateSquare:k=>{k=k.toLowerCase()
    .replace(/[^a-z]/g,"").replace(/j/g,"i");let s="",n=new Set;
    for(let e of k)n.has(e)||(s+=e,n.add(e));
    for(let e of"abcdefghiklmnopqrstuvwxyz")n.has(e)||(s+=e,n.add(e));
    return s},
    e:(t,k)=>{t=t.toLowerCase().replace(/[^a-z]/g,"")
      .replace(/j/g,"i");if(!t)return"";
      let s=Bifid.generateSquare(k),
      r="",o="";for(let e of t){
        let a=s.indexOf(e),l=Math.floor(a/5)+1,f=a%5+1;r+=l,o+=f}
        let n=r+o,c="";for(let e=0;e<n.length;e+=2){
          let r=parseInt(n[e])-1,a=parseInt(n[e+1])-1;c+=s[5*r+a]
        } return c
      },
      
    d:(t,k)=>{t=t.toLowerCase().replace(/[^a-z]/g,"")
      .replace(/j/g,"i");if(!t)return"";
      let s=Bifid.generateSquare(k),r="";
      for(let e of t){let a=s.indexOf(e),l=Math.floor(a/5)+1,f=a%5+1;r+=l+""+f}
      let o=t.length,n=r.substring(0,o),c=r.substring(o),a="";
      for(let e=0;e<o;e++){let l=parseInt(n[e])-1,t=parseInt(c[e])-1;a+=s[5*l+t]}
      return a
    }
};

// Base码 Base16 Base32 Base64 Base58 Base85 Base91 Base100
const baseCipher = {
  e: (t, type) => { try { const m = type.toLowerCase().replace(/^base/, '');
      switch(m) {
        case '16': return [...new TextEncoder().encode(t||'')].map(b => b.toString(16).padStart(2,'0').toUpperCase()).join('');
        case '32': { if(!t) return ''; const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', b = new TextEncoder().encode(t);
          let r = '', s = 0, v = 0; for(let i = 0; i < b.length; i++) { v = (v << 8) | b[i]; s += 8;
            while(s >= 5) { s -= 5; r += a[(v >> s) & 31]; }}
          if(s > 0) r += a[(v << (5 - s)) & 31];
          return r.padEnd(Math.ceil(r.length / 8) * 8, '=');
        }
        case '64': return t ? btoa(unescape(encodeURIComponent(t))) : '';
        case '58': { if(!t) return ''; const a = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
          const b = new TextEncoder().encode(t); let z = 0; while(z < b.length && b[z] === 0) z++;
          let v = 0n; for(let i = 0; i < b.length; i++) v = v * 256n + BigInt(b[i]);
          let r = ''; while(v > 0n) { r = a[Number(v % 58n)] + r; v /= 58n;}
          return '1'.repeat(z) + r;
        }
        case '85': { if(!t) return '';
          const a = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu';
          const b = new TextEncoder().encode(t), r = [];
          for(let i = 0; i < b.length; i += 4) { let c = b.slice(i, i + 4);
            if(c.length < 4) c = [...c, ...Array(4-c.length).fill(0)];
            let v = (c[0] << 24) | (c[1] << 16) | (c[2] << 8) | c[3];
            if(v === 0 && c.length === 4) { r.push('z'); continue; }
            for(let j = 0; j < 5; j++) r.push(a[Math.floor(v / Math.pow(85, 4 - j)) % 85]);
          } return r.join('').slice(0, r.length - (4 - (b.length % 4)) % 4);
        }
        case '91': { if(!t) return '';
          const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
          const b = new TextEncoder().encode(t); let r = '', n = 0, v = 0;
          for(let i = 0; i < b.length; i++) { v |= b[i] << n; n += 8;
            if(n > 13) { let c = v & (n > 13 ? 8191 : 16383);
              v >>= c > 88 ? 13 : 14; n -= c > 88 ? 13 : 14;
              r += a[c % 91] + a[Math.floor(c / 91)];
            }
          } if(n > 0) {r += a[v % 91]; if(n > 7 || v > 90) r += a[Math.floor(v / 91)];} return r;
        }
        case '100': return t ? [...new TextEncoder().encode(t)].map(b => String.fromCodePoint(128512 + b)).join('') : '';
        default: return `不支持的编码: base${m}`;
      }
    } catch(e) { return `编码错误: ${e.message}`; }
  },
  
  d: (t, type) => {try { if(!t) return ''; const m = type.toLowerCase().replace(/^base/, '');
      switch(m) { case '16': { if(!/^[0-9A-Fa-f]+$/.test(t)) return '无效的Base16编码';
          if(t.length % 2) return '无效的Base16编码长度'; const b = new Uint8Array(t.length/2);
          for(let i=0; i<t.length; i+=2) b[i/2] = parseInt(t.substr(i,2), 16);
          return new TextDecoder().decode(b);
        }
        case '32': { const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
          t = t.replace(/=+$/, '').toUpperCase(); if(!/^[A-Z2-7]+$/.test(t)) return '无效的Base32编码';
          let b = [], v = 0, s = 0; for(let i=0; i<t.length; i++) {v = (v<<5) | a.indexOf(t[i]); s += 5;
            while(s >= 8) {s -= 8; b.push((v>>s) & 0xFF);}}
          return new TextDecoder().decode(new Uint8Array(b));
        }
        case '64': return t ? decodeURIComponent(escape(atob(t))) : '';
        case '58': {const a = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
          let z = 0; while(t[z] === '1') z++;
          let v = 0n; for(let i=z; i<t.length; i++) { const idx = a.indexOf(t[i]);
            if(idx === -1) return '无效的Base58字符'; v = v * 58n + BigInt(idx);}
          let b = []; while(v > 0n) {b.unshift(Number(v & 255n)); v >>= 8n;}
          for(let i=0; i<z; i++) b.unshift(0);
          return new TextDecoder().decode(new Uint8Array(b));
        }
        case '85': { const a = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu';
          t = t.replace(/z/g, '!!!!!'); let b = []; for(let i=0; i<t.length; i+=5) {const chunk = t.substr(i, 5);
            if(chunk.length < 5) break; let v = 0; for(let j=0; j<5; j++) v = v * 85 + a.indexOf(chunk[j]);
            b.push((v >> 24) & 0xFF); b.push((v >> 16) & 0xFF); b.push((v >> 8) & 0xFF); b.push(v & 0xFF);
          }
          if(t.length % 5) {const chunk = t.substr(Math.floor(t.length/5)*5);
            let v = 0; for(let j=0; j<chunk.length; j++) v = v * 85 + a.indexOf(chunk[j]);
            for(let j=chunk.length; j<5; j++) v = v * 85 + 84; 
            for(let j=0; j<chunk.length-1; j++) b.push((v >> (24 - j*8)) & 0xFF);}
          return new TextDecoder().decode(new Uint8Array(b));
        }
        case '91': {const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
          let b = [], v = 0, n = 0, l = t.length; for(let i=0; i<l; i+=2) { if(i+1 >= l) break;
            const c1 = a.indexOf(t[i]); const c2 = a.indexOf(t[i+1]); if(c1 < 0 || c2 < 0) continue; const val = c1 + c2 * 91;
            if(val >= 8192) { v |= val << n; b.push(v & 0xFF); v >>= 8; n -= 8; b.push(v & 0xFF); v >>= 8; n -= 8;} 
            else {v |= val << n;b.push(v & 0xFF);v >>= 8; n -= 8;} n += val < 8192 ? 13 : 14;}
          if(l % 2) {const c = a.indexOf(t[l-1]); if(c >= 0) {v |= c << n;
              while(n >= 8) {b.push(v & 0xFF);v >>= 8; n -= 8;}}}
          return new TextDecoder().decode(new Uint8Array(b));
        } case '100': {let b = [];for(const c of t) {const cp = c.codePointAt(0);
            if(cp >= 128512 && cp < 128768) b.push(cp - 128512);}
          return new TextDecoder().decode(new Uint8Array(b));
        } default: return `不支持的解码: base${m}`;
      }} catch(e) { return `无效字符`; }
  }
};

// SHA-1 SHA-256 SHA-384 SHA-512
function createHashCipher(algorithm) {
    return {
        e: async function(input) {
            return Array.from(new Uint8Array(
                await crypto.subtle.digest(
                algorithm, new TextEncoder().encode(input))))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        },
        hmac: async function(key, message) {
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
                        keyBytes[i/2] = parseInt(cleanHex.substring(i, i + 2), 16);
                    }
                } else {keyBytes = new TextEncoder().encode(key);}
            } else {keyBytes = key;}
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


