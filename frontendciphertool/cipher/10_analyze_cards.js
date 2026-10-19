(function () {
  'use strict';

  const splitLines = text => String(text || '').split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const splitItems = text => String(text || '').split(/[\n,;\t]+/).map(s => s.trim()).filter(Boolean);
  const hasCJK = s => /[\u4e00-\u9fff]/.test(s);

  function hanziInfo(ch) {
    return (window.ZhongwenSearch && window.ZhongwenSearch.charInfo(ch)) || null;
  }

  function nthChar(str, n, oneBased = true) {
    const chars = [...String(str)];
    let idx = oneBased ? n - 1 : n;
    if (idx < 0) idx = chars.length + idx;
    if (!Number.isInteger(idx)) return { ch: '', ok: false, why: '索引不是整数' };
    if (idx < 0 || idx >= chars.length) return { ch: '', ok: false, why: `越界（长度 ${chars.length}）` };
    return { ch: chars[idx], ok: true, why: '' };
  }

  function letterSum(s) {
    return [...String(s).toUpperCase()].reduce((acc, c) => {
      const v = c.charCodeAt(0) - 64;
      return acc + (v >= 1 && v <= 26 ? v : 0);
    }, 0);
  }

  function pinyinKey(s) {
    return [...String(s)].map(c => {
      const info = hanziInfo(c);
      return info ? info.plain : c.toLowerCase();
    }).join('');
  }

  function makeComparator(key) {
    switch (key) {
      case 'alpha': return (a, b) => a.localeCompare(b, 'zh');
      case 'alphaDesc': return (a, b) => b.localeCompare(a, 'zh');
      case 'len': return (a, b) => a.length - b.length;
      case 'lenDesc': return (a, b) => b.length - a.length;
      case 'last': return (a, b) => ([...a].pop() || '').localeCompare([...b].pop() || '', 'zh');
      case 'sum': return (a, b) => letterSum(a) - letterSum(b);
      case 'pinyin': return (a, b) => pinyinKey(a).localeCompare(pinyinKey(b));
      default: return null;
    }
  }

  // 批量索引器
  function computeIndexer(src, indices, base, mode, sortKey) {
    const lines = splitLines(src);
    if (!lines.length) return '';

    const cmp = makeComparator(sortKey);
    const sorted = cmp ? [...lines].sort(cmp) : lines;
    const nums = indices.trim() ? indices.split(/\s+/).map(x => parseInt(x, 10)) : [];

    let out = '';

    if (mode === 'nth' && nums.length) {
      sorted.forEach((line, i) => {
        const idx = nums[i % nums.length];
        const res = nthChar(line, idx, base === 1);
        out += res.ok ? res.ch : '?';
      });
    } else if (mode === 'first') {
      out = sorted.map(l => l[0] || '').join('');
    } else if (mode === 'last') {
      out = sorted.map(l => [...l].pop() || '').join('');
    } else if (mode === 'middle') {
      out = sorted.map(l => {
        const chars = [...l];
        return chars[Math.floor(chars.length / 2)] || '';
      }).join('');
    } else if (mode === 'diagonal') {
      sorted.forEach((line, i) => {
        const res = nthChar(line, i + 1, base === 1);
        out += res.ok ? res.ch : '?';
      });
    } else if (mode === 'all') {
      out = sorted.map((l, i) => `${i + 1}. ${l}`).join('\n');
    }

    return out;
  }

  // 口味分析
  function computeFlavor(src) {
    const lines = splitLines(src);
    if (!lines.length) return '';

    const hits = key => {
      const patterns = {
        qiuqian: () => lines[0].split('').reverse().join(''),
        juanlian: () => lines.slice().reverse().join(' '),
        lihua: () => lines.map(l => [...l].map((c, i) => i % 2 === 0 ? c : '').join('')).join(' '),
        baitou: () => lines.map(l => l.slice(1)).join(' '),
        fendi: () => lines.map(l => l.slice(0, -1)).join(' '),
        sujie: () => lines.map(l => l.slice(1, -1)).join(' '),
        xufei: () => lines.map(l => [...l].filter((_, i) => i % 2 === 1).join('')).join(' '),
        qiuhuang: () => [...lines[0]].filter((_, i) => i % 2 === 1).join(''),
        yaodui: () => `${[...lines[0]].pop() || ''} ${lines[lines.length - 1][0] || ''}`,
        lizhu: () => `${lines[0]} · ${[...lines[lines.length - 1]].pop() || ''}`,
        zhiqiu: () => lines[lines.length - 1],
        tuoluo: () => lines[0].slice(1)
      };
      return patterns[key] ? patterns[key]() : '';
    };

    const formats = [
      { id: 'qiuqian', name: '秋千格' },
      { id: 'juanlian', name: '卷帘格' },
      { id: 'lihua', name: '梨花格' },
      { id: 'baitou', name: '白头格' },
      { id: 'fendi', name: '粉底格' },
      { id: 'sujie', name: '素心格' },
      { id: 'xufei', name: '徐妃格' },
      { id: 'qiuhuang', name: '求凰格' },
      { id: 'yaodui', name: '遥对格' },
      { id: 'lizhu', name: '骊珠格' },
      { id: 'zhiqiu', name: '只履格' },
      { id: 'tuoluo', name: '脱帽格' }
    ];

    return formats.map(f => `${f.name}: ${hits(f.id)}`).join('\n');
  }

  function parseEnumeration(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    return lines.map(line => {
      const m = line.match(/^([^=:：]+)[=:：]\s*(.+)$/);
      return m ? { key: m[1].trim(), val: m[2].trim() } : null;
    }).filter(Boolean);
  }

  function normalize(s) {
    return s.toLowerCase().replace(/\s+/g, '');
  }

  // 枚举查验
  function computeEnum(src, targetText) {
    const pairs = parseEnumeration(src);
    if (!pairs.length || !targetText.trim()) return '';

    const target = normalize(targetText);
    const results = pairs.filter(p => normalize(p.val) === target);

    if (!results.length) return `未找到匹配项（目标：${targetText}）`;
    return results.map(r => `${r.key} = ${r.val}`).join('\n');
  }

  // 字母审计
  function computeAudit(src) {
    const lines = splitLines(src);
    if (!lines.length) return '';

    const rows = lines.map(l => l.split(/\s+/));
    const colCount = Math.max(...rows.map(r => r.length));

    const stats = {
      rows: rows.length,
      cols: colCount,
      cells: rows.reduce((sum, r) => sum + r.length, 0)
    };

    const vals = rows.flat();
    const numeric = vals.filter(v => !isNaN(v) && v.trim() !== '');
    const sum = numeric.reduce((acc, v) => acc + parseFloat(v), 0);
    const avg = numeric.length ? sum / numeric.length : 0;

    const unused = [];
    for (let i = 1; i <= 26; i++) {
      const letter = String.fromCharCode(64 + i);
      if (!vals.some(v => v.toUpperCase().includes(letter))) unused.push(letter);
    }

    return `行数: ${stats.rows}\n列数: ${stats.cols}\n单元格数: ${stats.cells}\n数值个数: ${numeric.length}\n数值总和: ${sum.toFixed(2)}\n数值平均: ${avg.toFixed(2)}\n未使用字母: ${unused.join(' ')}`;
  }

  const isCJK = ch => /[\u4e00-\u9fff]/.test(ch);

  function toneOf(pinyin) {
    const map = {
      'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
      'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
      'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
      'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
      'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
      'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4
    };
    for (const [k, v] of Object.entries(map)) {
      if (pinyin.includes(k)) return v;
    }
    return 0;
  }

  const stripTone = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function computePuzzleMige(src) {
    const lines = splitLines(src);
    const formats = [
      { id: 'qiuqian', name: '秋千格', fn: l => l[0].split('').reverse().join('') },
      { id: 'juanlian', name: '卷帘格', fn: l => l.slice().reverse().join(' ') },
      { id: 'lihua', name: '梨花格', fn: l => l.map(x => [...x].map((c, i) => i % 2 === 0 ? c : '').join('')).join(' ') }
    ];
    return formats.map(f => `${f.name}: ${f.fn(lines)}`).join('\n');
  }

  function computePuzzlePinyin(src) {
    const chars = [...src].filter(isCJK);
    return chars.map(ch => {
      const info = hanziInfo(ch);
      if (!info) return `${ch}: ?`;
      const tone = toneOf(info.raw);
      const plain = stripTone(info.raw);
      return `${ch}: ${info.raw} (${plain}, 声调${tone})`;
    }).join('\n');
  }

  function computePuzzleHanziAttr(src) {
    const chars = [...src].filter(isCJK);
    return chars.map(ch => {
      const info = hanziInfo(ch);
      if (!info) return `${ch}: 无数据`;
      return `${ch}: 拼音=${info.raw}, 笔画=${info.stroke || '?'}, 部首=${info.radical || '?'}`;
    }).join('\n');
  }

  function xorBruteforce(cipher, keyLen) {
    const bytes = cipher.split('').map(c => c.charCodeAt(0));
    const results = [];

    for (let k = 0; k < 256; k++) {
      const plain = bytes.map(b => String.fromCharCode(b ^ k)).join('');
      if (/^[\x20-\x7e]+$/.test(plain)) {
        results.push({ key: k.toString(16).padStart(2, '0'), text: plain });
      }
    }

    return results.length ? results.map(r => `Key=${r.key}: ${r.text}`).join('\n') : '无可读结果';
  }

  function frequencyAnalysis(text) {
    const freq = {};
    [...text.toUpperCase()].forEach(c => {
      if (/[A-Z]/.test(c)) freq[c] = (freq[c] || 0) + 1;
    });

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return sorted.map(([ch, count]) => `${ch}: ${count}`).join(', ');
  }

  function vigenereBruteforce(cipher, keyLen) {
    return `维吉尼亚破解（密钥长度=${keyLen}）：需实现 Kasiski 或 IC 分析`;
  }

  function kasiskiExamination(text) {
    const repeats = new Map();
    for (let len = 3; len <= 6; len++) {
      for (let i = 0; i <= text.length - len; i++) {
        const substr = text.slice(i, i + len);
        const positions = [];
        let pos = text.indexOf(substr);
        while (pos !== -1) {
          positions.push(pos);
          pos = text.indexOf(substr, pos + 1);
        }
        if (positions.length > 1) {
          repeats.set(substr, positions);
        }
      }
    }

    if (repeats.size === 0) return '未发现重复片段';

    const distances = [];
    repeats.forEach((positions, substr) => {
      for (let i = 1; i < positions.length; i++) {
        distances.push(positions[i] - positions[i - 1]);
      }
    });

    const gcdAll = distances.reduce((a, b) => {
      const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
      return gcd(a, b);
    });

    return `重复片段数: ${repeats.size}\n可能密钥长度: ${gcdAll}\n距离: ${distances.slice(0, 10).join(', ')}`;
  }

  function autoDecode(cipher) {
    const tests = [
      { name: 'Base64', fn: () => atob(cipher) },
      { name: 'URL解码', fn: () => decodeURIComponent(cipher) },
      { name: 'ROT13', fn: () => cipher.replace(/[a-z]/gi, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)) }
    ];

    return tests.map(t => {
      try {
        const result = t.fn();
        return `${t.name}: ${result}`;
      } catch {
        return `${t.name}: 失败`;
      }
    }).join('\n');
  }

  function rotate(canvas, deg) {
    const { width, height } = canvas;
    const out = document.createElement('canvas');
    const ctx = out.getContext('2d');

    if (deg === 90 || deg === 270) {
      out.width = height;
      out.height = width;
    } else {
      out.width = width;
      out.height = height;
    }

    ctx.save();
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(canvas, -width / 2, -height / 2);
    ctx.restore();

    return out;
  }

  function flip(canvas, dir) {
    const { width, height } = canvas;
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');

    ctx.save();
    if (dir === 'h') {
      ctx.scale(-1, 1);
      ctx.drawImage(canvas, -width, 0);
    } else {
      ctx.scale(1, -1);
      ctx.drawImage(canvas, 0, -height);
    }
    ctx.restore();

    return out;
  }

  function mapPixels(canvas, fn) {
    const { width, height } = canvas;
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    const imageData = canvas.getContext('2d').getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = fn(data[i], data[i + 1], data[i + 2], data[i + 3]);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }

    ctx.putImageData(imageData, 0, 0);
    return out;
  }

  function clamp255(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  function channelImage(canvas, ch) {
    const idx = { r: 0, g: 1, b: 2, a: 3 }[ch];
    return mapPixels(canvas, (r, g, b, a) => {
      const arr = [r, g, b, a];
      const v = arr[idx];
      return idx === 3 ? [v, v, v, 255] : [0, 0, 0, 0].map((_, i) => i === idx ? v : 0).concat(a);
    });
  }

  function channelDiff(canvas, ch1, ch2, gain) {
    const idx1 = { r: 0, g: 1, b: 2 }[ch1];
    const idx2 = { r: 0, g: 1, b: 2 }[ch2];
    return mapPixels(canvas, (r, g, b, a) => {
      const arr = [r, g, b];
      const diff = clamp255((arr[idx1] - arr[idx2]) * gain + 128);
      return [diff, diff, diff, a];
    });
  }

  function bitPlane(canvas, bit, mode) {
    return mapPixels(canvas, (r, g, b, a) => {
      const extract = v => ((v >> bit) & 1) * 255;
      if (mode === 'all') {
        return [extract(r), extract(g), extract(b), a];
      }
      return [extract(r), extract(r), extract(r), a];
    });
  }

  function extractLsbText(canvas, channel, bit) {
    const { width, height } = canvas;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let bits = '';
    for (let i = 0; i < data.length; i += 4) {
      const val = data[i + channel];
      bits += ((val >> bit) & 1).toString();
    }

    let text = '';
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8), 2);
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) text += String.fromCharCode(byte);
    }

    return text;
  }

  window.AnalyzeTools = {
    computeIndexer,
    computeFlavor,
    computeEnum,
    computeAudit,
    computePuzzleMige,
    computePuzzlePinyin,
    computePuzzleHanziAttr,
    xorBruteforce,
    frequencyAnalysis,
    vigenereBruteforce,
    kasiskiExamination,
    autoDecode,
    rotate,
    flip,
    mapPixels,
    channelImage,
    channelDiff,
    bitPlane,
    extractLsbText
  };
})();
