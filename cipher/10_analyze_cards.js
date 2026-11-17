(function () {
  'use strict';

  const printable = s => {
    if (!s) return 0;
    const chars = [...s];
    const good = chars.filter(c => /[\x20-\x7e\u4e00-\u9fff]/.test(c)).length;
    return good / chars.length;
  };

  const toBytes = (text, mode) => {
    if (mode === 'hex') {
      const h = String(text || '').replace(/[^0-9a-fA-F]/g, '');
      if (h.length % 2) return [];
      const out = [];
      for (let i = 0; i < h.length; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
      return out;
    }
    if (mode === 'base64') {
      try { return [...Uint8Array.from(atob(String(text || '').trim()), c => c.charCodeAt(0))]; }
      catch { return []; }
    }
    return [...new TextEncoder().encode(String(text || ''))];
  };

  const fromBytes = bytes => {
    try { return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes)); }
    catch { return ''; }
  };

  const hex = bytes => bytes.map(b => b.toString(16).padStart(2, '0')).join('');

  const xorWith = (bytes, key) => bytes.map((b, i) => b ^ key[i % key.length]);

  function xorTool(text, mode, key, maxLen, crib, inputMode) {
    const bytes = toBytes(text, inputMode);
    if (!bytes.length) return '请输入 hex / base64 / 文本';

    if (mode === 'single') {
      const out = [];
      for (let k = 0; k < 256; k++) {
        const plain = fromBytes(bytes.map(b => b ^ k));
        if (printable(plain) >= 0.9) out.push(`Key=${k.toString(16).padStart(2, '0')}: ${plain}`);
        if (out.length >= 64) break;
      }
      return out.length ? out.join('\n') : '没有可打印结果';
    }

    if (mode === 'repeat') {
      const kb = toBytes(key || '', /^[0-9a-fA-F\s]+$/.test(key || '') ? 'hex' : 'text');
      if (!kb.length) return '请输入重复密钥（hex 或文本）';
      const plain = fromBytes(xorWith(bytes, kb));
      return `Key=${hex(kb)}\n明文: ${plain}\nHex: ${hex(xorWith(bytes, kb))}`;
    }

    if (mode === 'keylen') {
      const limit = Math.max(1, Math.min(64, parseInt(maxLen, 10) || 32));
      const rows = [];
      for (let len = 1; len <= limit && len + 1 < bytes.length; len += 1) {
        let dist = 0, count = 0;
        for (let i = 0; i + 2 * len <= bytes.length; i += len) {
          for (let j = 0; j < len; j++) {
            const x = bytes[i + j] ^ bytes[i + len + j];
            let bits = 0;
            for (let b = 0; b < 8; b++) bits += (x >> b) & 1;
            dist += bits;
          }
          count += len;
        }
        rows.push({ len, avg: count ? dist / count : 999 });
      }
      rows.sort((a, b) => a.avg - b.avg);
      return rows.slice(0, 8).map(r => `长度 ${r.len}: 平均汉明距离 ${r.avg.toFixed(3)}`).join('\n');
    }

    if (mode === 'crib') {
      const c = String(crib || '');
      if (!c) return '请输入 crib';
      const cb = [...new TextEncoder().encode(c)];
      const out = [];
      for (let i = 0; i + cb.length <= bytes.length; i++) {
        const k = cb.map((b, j) => bytes[i + j] ^ b);
        const kt = fromBytes(k);
        if (printable(kt) >= 0.9) out.push(`位置 ${i}: key=${hex(k)} (${kt})`);
        if (out.length >= 40) break;
      }
      return out.length ? out.join('\n') : '没有可打印的 crib 位置';
    }

    if (mode === 'many') {
      const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return '请每行输入一段密文';
      const out = [];
      for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
          const a = toBytes(lines[i], inputMode), b = toBytes(lines[j], inputMode);
          if (!a.length || !b.length) continue;
          const n = Math.min(a.length, b.length);
          const x = a.slice(0, n).map((v, k) => v ^ b[k]);
          out.push(`${i + 1}^${j + 1}: ${fromBytes(x)}`);
        }
      }
      return out.join('\n');
    }

    return '未知模式';
  }

  function frequency(text) {
    const letters = (String(text || '').toUpperCase().match(/[A-Z]/g) || []).join('');
    const n = letters.length;
    if (!n) return '没有字母';
    const count = {};
    for (const c of letters) count[c] = (count[c] || 0) + 1;
    const rows = Object.entries(count).sort((a, b) => b[1] - a[1]);
    const ic = n > 1 ? rows.reduce((s, [, v]) => s + v * (v - 1), 0) / (n * (n - 1)) : 0;
    const bigrams = {}, trigrams = {};
    for (let i = 0; i < letters.length - 1; i++) bigrams[letters.slice(i, i + 2)] = (bigrams[letters.slice(i, i + 2)] || 0) + 1;
    for (let i = 0; i < letters.length - 2; i++) trigrams[letters.slice(i, i + 3)] = (trigrams[letters.slice(i, i + 3)] || 0) + 1;
    const top = (obj, k) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, k).map(([s, v]) => `${s}:${v}`).join(' ');
    return [
      `字母数: ${n}`,
      `频率: ${rows.map(([c, v]) => `${c}:${v}(${(v * 100 / n).toFixed(1)}%)`).join(' ')}`,
      `IC: ${ic.toFixed(4)}`,
      `Friedman 估计密钥长度: ${ic > 0.038 ? ((0.027 * n) / ((n - 1) * ic - 0.038 * n + 0.065)).toFixed(2) : '-'}`,
      `常见双字母: ${top(bigrams, 10)}`,
      `常见三字母: ${top(trigrams, 10)}`
    ].join('\n');
  }

  function vigenereAnalyze(text, maxLen, key) {
    const letters = (String(text || '').toUpperCase().match(/[A-Z]/g) || []).join('');
    if (!letters) return '没有字母';
    const limit = Math.max(1, Math.min(30, parseInt(maxLen, 10) || 20));
    const rows = [];
    for (let len = 1; len <= limit; len++) {
      let sum = 0, cols = 0;
      for (let i = 0; i < len; i++) {
        const col = [...letters].filter((_, j) => j % len === i).join('');
        const n = col.length;
        if (n < 2) continue;
        const count = {};
        for (const c of col) count[c] = (count[c] || 0) + 1;
        sum += Object.values(count).reduce((s, v) => s + v * (v - 1), 0) / (n * (n - 1));
        cols++;
      }
      if (cols) rows.push({ len, ic: sum / cols });
    }
    rows.sort((a, b) => b.ic - a.ic);

    const repeats = new Map();
    for (let len = 3; len <= 5; len++) {
      for (let i = 0; i + len <= letters.length; i++) {
        const s = letters.slice(i, i + len);
        if (!repeats.has(s)) repeats.set(s, []);
        repeats.get(s).push(i);
      }
    }
    const dists = [];
    for (const pos of repeats.values()) {
      for (let i = 1; i < pos.length; i++) dists.push(pos[i] - pos[i - 1]);
    }
    const kasiski = [];
    for (let len = 2; len <= limit; len++) {
      const hits = dists.filter(d => d % len === 0).length;
      if (hits) kasiski.push({ len, hits });
    }
    kasiski.sort((a, b) => b.hits - a.hits || a.len - b.len);

    const out = [
      `IC 候选长度: ${rows.slice(0, 8).map(r => `${r.len}(${r.ic.toFixed(4)})`).join(' ')}`,
      `Kasiski 候选长度: ${kasiski.slice(0, 8).map(r => `${r.len}(${r.hits})`).join(' ')}`
    ];
    if (key) out.push(`按密钥解密: ${Vigenere.d(text, key)}`);
    return out.join('\n');
  }

  function transpositionBrute(text, max) {
    const limit = Math.max(2, Math.min(20, parseInt(max, 10) || 10));
    const clean = String(text || '').replace(/\s+/g, '');
    if (!clean) return '';
    const out = [];
    for (let r = 2; r <= limit; r++) {
      out.push(`Rail ${r}: ${RailFence.d(clean, r)}`);
      out.push(`W-Rail ${r}: ${WShapeRailFenceCipher.d(clean, r)}`);
      out.push(`Columnar ${r}: ${ColumnarRailCipher.d(clean, r)}`);
    }
    return out.join('\n');
  }

  function indexExtract(text, mode, n) {
    const lines = String(text || '').split(/\r?\n/).filter(l => l.length);
    if (!lines.length) return '';
    const nth = Math.max(1, parseInt(n, 10) || 1);
    if (mode === 'first') return lines.map(l => [...l][0] || '').join('');
    if (mode === 'last') return lines.map(l => [...l].pop() || '').join('');
    if (mode === 'nth') return lines.map(l => [...l][nth - 1] || '').join('');
    if (mode === 'diagonal') return lines.map((l, i) => [...l][i] || '').join('');
    if (mode === 'antiDiagonal') return lines.map((l, i) => [...l][[...l].length - 1 - i] || '').join('');
    if (mode === 'snake') return lines.map((l, i) => i % 2 ? [...l].reverse().join('') : l).join('');
    if (mode === 'spiral') {
      const grid = lines.map(l => [...l]);
      const out = [];
      let top = 0, bottom = grid.length - 1, left = 0, right = Math.max(...grid.map(l => l.length)) - 1;
      while (top <= bottom && left <= right) {
        for (let i = left; i <= right; i++) if (grid[top][i] != null) out.push(grid[top][i]);
        top++;
        for (let i = top; i <= bottom; i++) if (grid[i][right] != null) out.push(grid[i][right]);
        right--;
        if (top <= bottom) {
          for (let i = right; i >= left; i--) if (grid[bottom][i] != null) out.push(grid[bottom][i]);
          bottom--;
        }
        if (left <= right) {
          for (let i = bottom; i >= top; i--) if (grid[i][left] != null) out.push(grid[i][left]);
          left++;
        }
      }
      return out.join('');
    }
    if (mode === 'wordLength') return lines.map(l => l.split(/\s+/).filter(Boolean).map(w => [...w].length).join('-')).join(' ');
    if (mode === 'sort') return lines.slice().sort((a, b) => a.localeCompare(b)).join('\n');
    if (mode === 'dedup') return [...new Set([...String(text || '')])].join('');
    if (mode === 'reverse') return [...String(text || '')].reverse().join('');
    return '';
  }

  function autoDecode(text) {
    const s = String(text || '').trim();
    if (!s) return '';
    const out = [];
    const add = (name, value) => {
      if (value == null || value === '') return;
      const v = String(value);
      if (v === s) return;
      if (/无效|不支持|错误|请输入|没有/.test(v)) return;
      if (printable(v) >= 0.8) out.push(`${name}: ${v.length > 300 ? v.slice(0, 300) + '…' : v}`);
    };
    const tryB64 = (name, fn) => { try { add(name, fn()); } catch { } };
    tryB64('Base64', () => decodeURIComponent(escape(atob(s))));
    tryB64('Base32', () => baseCipher.d(s, 'base32'));
    tryB64('Base58', () => baseCipher.d(s, 'base58'));
    tryB64('Base16', () => baseCipher.d(s.replace(/\s/g, ''), 'base16'));
    tryB64('URL', () => decodeURIComponent(s));
    tryB64('HTML', () => WebEncodingCipher.htmlD(s));
    tryB64('Unicode', () => WebEncodingCipher.unicodeD(s));
    tryB64('ROT13', () => s.replace(/[a-z]/gi, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)));
    tryB64('ROT47', () => [...s].map(c => {
      const cp = c.charCodeAt(0);
      return cp >= 33 && cp <= 126 ? String.fromCharCode(33 + ((cp - 33 + 47) % 94)) : c;
    }).join(''));
    if (/^[.\-xX\s/]+$/.test(s)) tryB64('Morse', () => MorseCode.d(s));
    if (/^[abAB\s]+$/.test(s)) tryB64('Bacon', () => BaconCipher.d(s));
    if (/^[01\s]+$/.test(s)) tryB64('Binary', () => {
      const bits = s.replace(/\s/g, '');
      let r = '';
      for (let i = 0; i + 8 <= bits.length; i += 8) r += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
      return r;
    });
    if (/^[\d\s,]+$/.test(s)) tryB64('Decimal', () => s.split(/[\s,]+/).filter(Boolean).map(x => String.fromCharCode(parseInt(x, 10))).join(''));
    if (/^[0-9a-fA-F\s]+$/.test(s) && s.replace(/\s/g, '').length % 2 === 0) tryB64('Hex', () => baseCipher.d(s.replace(/\s/g, ''), 'base16'));
    tryB64('Reverse', () => [...s].reverse().join(''));
    return out.length ? out.join('\n') : '没有识别出可解码的结果';
  }

  function mige(text) {
    const lines = String(text || '').split(/\r?\n/);
    const s = String(text || '');
    if (!s.trim()) return '';
    const items = [
      ['秋千格', [...s].reverse().join('')],
      ['卷帘格', lines.slice().reverse().join(' ')],
      ['梨花格', [...s].filter((_, i) => i % 2 === 0).join('')],
      ['白头格', lines.map(l => l.slice(1)).join(' ')],
      ['粉底格', lines.map(l => l.slice(0, -1)).join(' ')],
      ['素心格', lines.map(l => {
        const a = [...l];
        if (a.length < 3) return l;
        a.splice(Math.floor(a.length / 2), 1);
        return a.join('');
      }).join(' ')],
      ['徐妃格', [...s].filter((_, i) => i % 2 === 1).join('')],
      ['求凰格', lines.map((l, i) => i % 2 ? [...l].reverse().join('') : l).join(' ')],
      ['遥对格', `${[...(lines[0] || '')].pop() || ''} ${[...(lines[lines.length - 1] || '')][0] || ''}`],
      ['骊珠格', `${lines[0] || ''}${[...(lines[lines.length - 1] || '')].pop() || ''}`],
      ['只履格', lines[lines.length - 1] || ''],
      ['脱帽格', (lines[0] || '').slice(1)]
    ];
    return items.map(([name, value]) => `${name}: ${value}`).join('\n');
  }

  function rotate(canvas, deg) {
    const { width, height } = canvas;
    const out = document.createElement('canvas');
    const ctx = out.getContext('2d');
    if (deg === 90 || deg === 270) { out.width = height; out.height = width; }
    else { out.width = width; out.height = height; }
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
    out.width = width; out.height = height;
    const ctx = out.getContext('2d');
    ctx.save();
    if (dir === 'h') { ctx.scale(-1, 1); ctx.drawImage(canvas, -width, 0); }
    else { ctx.scale(1, -1); ctx.drawImage(canvas, 0, -height); }
    ctx.restore();
    return out;
  }

  function mapPixels(canvas, fn) {
    const { width, height } = canvas;
    const out = document.createElement('canvas');
    out.width = width; out.height = height;
    const ctx = out.getContext('2d');
    const imageData = canvas.getContext('2d').getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = fn(data[i], data[i + 1], data[i + 2], data[i + 3]);
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    }
    ctx.putImageData(imageData, 0, 0);
    return out;
  }

  const clamp255 = v => Math.max(0, Math.min(255, Math.round(v)));

  function channelImage(canvas, ch) {
    const idx = { r: 0, g: 1, b: 2, a: 3 }[ch];
    return mapPixels(canvas, (r, g, b, a) => {
      const arr = [r, g, b, a];
      const v = arr[idx];
      if (idx === 3) return [v, v, v, 255];
      const out = [0, 0, 0, a];
      out[idx] = v;
      return out;
    });
  }

  function channelDiff(canvas, ch1, ch2, gain) {
    const i1 = { r: 0, g: 1, b: 2 }[ch1], i2 = { r: 0, g: 1, b: 2 }[ch2];
    return mapPixels(canvas, (r, g, b, a) => {
      const arr = [r, g, b];
      const d = clamp255((arr[i1] - arr[i2]) * gain + 128);
      return [d, d, d, a];
    });
  }

  function bitPlane(canvas, bit) {
    return mapPixels(canvas, (r, g, b, a) => {
      const f = v => ((v >> bit) & 1) * 255;
      return [f(r), f(g), f(b), a];
    });
  }

  function extractLsbText(canvas, channel, bit) {
    const { width, height } = canvas;
    const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    let bits = '';
    for (let i = 0; i < data.length; i += 4) bits += ((data[i + channel] >> bit) & 1).toString();
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      const b = parseInt(bits.slice(i, i + 8), 2);
      if (b === 0) break;
      bytes.push(b);
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  }

  window.AnalyzeTools = {
    xorTool, frequency, vigenereAnalyze, transpositionBrute, indexExtract,
    autoDecode, mige, rotate, flip, mapPixels, channelImage, channelDiff, bitPlane, extractLsbText
  };
})();
