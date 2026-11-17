// Web 文本编码：URL / HTML / Unicode / UUencode / XXencode / Quoted-Printable
const WebEncodingCipher = {
  htmlMap: {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    '\u00a0': '&nbsp;', '\u00a9': '&copy;', '\u00ae': '&reg;', '\u2026': '&hellip;',
    '\u2014': '&mdash;', '\u2013': '&ndash;', '\u2018': '&lsquo;', '\u2019': '&rsquo;',
    '\u201c': '&ldquo;', '\u201d': '&rdquo;', '\u00d7': '&times;', '\u00f7': '&divide;'
  },
  htmlReverse: null,
  getHtmlReverse() {
    if (!this.htmlReverse) {
      this.htmlReverse = Object.fromEntries(Object.entries(this.htmlMap).map(([k, v]) => [v, k]));
    }
    return this.htmlReverse;
  },
  urlE: t => encodeURIComponent(t || ''),
  urlD: t => { try { return decodeURIComponent(t || ''); } catch { return '无效的 URL 编码'; } },
  htmlE(t) {
    return [...(t || '')].map(c => this.htmlMap[c] || c).join('');
  },
  htmlD(t) {
    const rev = this.getHtmlReverse();
    return (t || '').replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body) => {
      if (body[0] === '#') {
        const n = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return rev[m] || m;
    });
  },
  unicodeE: t => [...(t || '')].map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(''),
  unicodeD: t => (t || '').replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16))),
  uuAlphabet: null,
  uuE(t) {
    const bytes = new TextEncoder().encode(t || '');
    const lines = [];
    for (let i = 0; i < bytes.length; i += 45) {
      const chunk = bytes.slice(i, i + 45);
      let line = String.fromCharCode(32 + chunk.length);
      for (let j = 0; j < chunk.length; j += 3) {
        const a = chunk[j], b = chunk[j + 1] || 0, c = chunk[j + 2] || 0;
        line += String.fromCharCode(
          32 + ((a >> 2) & 0x3f),
          32 + (((a << 4) | (b >> 4)) & 0x3f),
          32 + (((b << 2) | (c >> 6)) & 0x3f),
          32 + (c & 0x3f)
        );
      }
      lines.push(line);
    }
    return lines.join('\n');
  },
  uuD(t) {
    const out = [];
    for (const line of String(t || '').split(/\r?\n/)) {
      if (!line) continue;
      const len = line.charCodeAt(0) - 32;
      if (!Number.isFinite(len) || len <= 0) continue;
      const chars = [...line.slice(1)];
      const lineOut = [];
      for (let i = 0; i < chars.length; i += 4) {
        const a = ((chars[i]?.charCodeAt(0) || 32) - 32) & 0x3f;
        const b = ((chars[i + 1]?.charCodeAt(0) || 32) - 32) & 0x3f;
        const c = ((chars[i + 2]?.charCodeAt(0) || 32) - 32) & 0x3f;
        const d = ((chars[i + 3]?.charCodeAt(0) || 32) - 32) & 0x3f;
        lineOut.push(((a << 2) | (b >> 4)) & 0xff, ((b << 4) | (c >> 2)) & 0xff, ((c << 6) | d) & 0xff);
      }
      out.push(...lineOut.slice(0, len));
    }
    return new TextDecoder().decode(new Uint8Array(out));
  },
  xxAlphabet: '+-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  xxE(t) {
    const bytes = new TextEncoder().encode(t || '');
    const a = this.xxAlphabet;
    const lines = [];
    for (let i = 0; i < bytes.length; i += 45) {
      const chunk = bytes.slice(i, i + 45);
      let line = a[chunk.length];
      for (let j = 0; j < chunk.length; j += 3) {
        const x = chunk[j], y = chunk[j + 1] || 0, z = chunk[j + 2] || 0;
        line += a[(x >> 2) & 0x3f] + a[((x << 4) | (y >> 4)) & 0x3f] +
          a[((y << 2) | (z >> 6)) & 0x3f] + a[z & 0x3f];
      }
      lines.push(line);
    }
    return lines.join('\n');
  },
  xxD(t) {
    const a = this.xxAlphabet;
    const out = [];
    for (const line of String(t || '').split(/\r?\n/)) {
      if (!line) continue;
      const len = a.indexOf(line[0]);
      if (len < 0) continue;
      const chars = [...line.slice(1)];
      const lineOut = [];
      for (let i = 0; i < chars.length; i += 4) {
        const x = a.indexOf(chars[i]), y = a.indexOf(chars[i + 1]), z = a.indexOf(chars[i + 2]), w = a.indexOf(chars[i + 3]);
        lineOut.push(((x << 2) | (y >> 4)) & 0xff, ((y << 4) | (z >> 2)) & 0xff, ((z << 6) | w) & 0xff);
      }
      out.push(...lineOut.slice(0, len));
    }
    return new TextDecoder().decode(new Uint8Array(out));
  },
  qpE(t) {
    const bytes = new TextEncoder().encode(t || '');
    let out = '';
    for (const b of bytes) {
      if (b === 0x3d) out += '=3D';
      else if (b >= 0x20 && b <= 0x7e) out += String.fromCharCode(b);
      else out += '=' + b.toString(16).toUpperCase().padStart(2, '0');
    }
    return out;
  },
  qpD(t) {
    const s = String(t || '').replace(/=\r?\n/g, '');
    const bytes = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '=' && /^[0-9a-fA-F]{2}$/.test(s.slice(i + 1, i + 3))) {
        bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
        i += 2;
      } else {
        bytes.push(s.charCodeAt(i) & 0xff);
      }
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  },
  process: (t, type) => {
    switch (type) {
      case 'html': return `编码: ${WebEncodingCipher.htmlE(t)}\n解码: ${WebEncodingCipher.htmlD(t)}`;
      case 'unicode': return `编码: ${WebEncodingCipher.unicodeE(t)}\n解码: ${WebEncodingCipher.unicodeD(t)}`;
      case 'uu': return `编码:\n${WebEncodingCipher.uuE(t)}\n解码: ${WebEncodingCipher.uuD(t)}`;
      case 'xx': return `编码:\n${WebEncodingCipher.xxE(t)}\n解码: ${WebEncodingCipher.xxD(t)}`;
      case 'qp': return `编码: ${WebEncodingCipher.qpE(t)}\n解码: ${WebEncodingCipher.qpD(t)}`;
      default: return `编码: ${WebEncodingCipher.urlE(t)}\n解码: ${WebEncodingCipher.urlD(t)}`;
    }
  }
};
