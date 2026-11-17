// Hash 工具箱：MD4/MD5/SHA-1/SHA-2/SHA-3/CRC32 + HMAC + 识别
const HashToolbox = (() => {
  const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  const utf8 = s => [...new TextEncoder().encode(String(s || ''))];
  const base64 = bytes => btoa(String.fromCharCode(...bytes));

  const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;

  function md4(input) {
    const bytes = input.slice();
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 0; i < 8; i++) bytes.push((bitLen / Math.pow(2, 8 * i)) & 0xff);
    let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
    const F = (x, y, z) => (x & y) | (~x & z);
    const G = (x, y, z) => (x & y) | (x & z) | (y & z);
    const H = (x, y, z) => x ^ y ^ z;
    for (let i = 0; i < bytes.length; i += 64) {
      const X = [];
      for (let j = 0; j < 16; j++) X.push(bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) | (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24));
      const aa = a, bb = b, cc = c, dd = d;
      const r1 = [3, 7, 11, 19], r2 = [3, 5, 9, 13], r3 = [3, 9, 11, 15];
      for (let j = 0; j < 16; j++) {
        const k = j, s = r1[j % 4];
        const t = rotl((a + F(b, c, d) + X[k]) >>> 0, s);
        a = d; d = c; c = b; b = t;
      }
      for (let j = 0; j < 16; j++) {
        const k = (j % 4) * 4 + Math.floor(j / 4), s = r2[j % 4];
        const t = rotl((a + G(b, c, d) + X[k] + 0x5a827999) >>> 0, s);
        a = d; d = c; c = b; b = t;
      }
      for (let j = 0; j < 16; j++) {
        const order = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15];
        const k = order[j], s = r3[j % 4];
        const t = rotl((a + H(b, c, d) + X[k] + 0x6ed9eba1) >>> 0, s);
        a = d; d = c; c = b; b = t;
      }
      a = (a + aa) >>> 0; b = (b + bb) >>> 0; c = (c + cc) >>> 0; d = (d + dd) >>> 0;
    }
    const out = [];
    for (const v of [a, b, c, d]) for (let i = 0; i < 4; i++) out.push((v >>> (8 * i)) & 0xff);
    return out;
  }

  const RC = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
    0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
    0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
    0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
    0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
  ];
  const ROTC = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];
  const MASK = (1n << 64n) - 1n;
  const rotl64 = (x, n) => n === 0 ? x : (((x << BigInt(n)) | (x >> BigInt(64 - n))) & MASK);

  function keccakF(A) {
    for (let round = 0; round < 24; round++) {
      const C = new Array(5).fill(0n);
      for (let x = 0; x < 5; x++) C[x] = A[x] ^ A[x + 5] ^ A[x + 10] ^ A[x + 15] ^ A[x + 20];
      const D = new Array(5);
      for (let x = 0; x < 5; x++) D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) A[x + 5 * y] ^= D[x];

      const B = new Array(25).fill(0n);
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
        B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(A[x + 5 * y], ROTC[x + 5 * y]);
      }
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
        A[x + 5 * y] = B[x + 5 * y] ^ ((~B[(x + 1) % 5 + 5 * y] & MASK) & B[(x + 2) % 5 + 5 * y]);
      }
      A[0] ^= RC[round];
    }
  }

  function sha3(input, bits) {
    const rate = 200 - 2 * (bits / 8);
    const outBytes = bits / 8;
    const data = input.slice();
    const padLen = rate - (data.length % rate);
    if (padLen === 1) {
      data.push(0x86);
    } else {
      data.push(0x06);
      for (let i = 1; i < padLen - 1; i++) data.push(0);
      data.push(0x80);
    }
    const A = new Array(25).fill(0n);
    for (let off = 0; off < data.length; off += rate) {
      for (let i = 0; i < rate; i++) {
        const lane = i >> 3, shift = BigInt((i & 7) * 8);
        A[lane] ^= BigInt(data[off + i]) << shift;
      }
      keccakF(A);
    }
    const out = [];
    while (out.length < outBytes) {
      for (let i = 0; i < rate && out.length < outBytes; i++) {
        const lane = i >> 3, shift = BigInt((i & 7) * 8);
        out.push(Number((A[lane] >> shift) & 0xffn));
      }
      if (out.length < outBytes) keccakF(A);
    }
    return out;
  }

  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  async function webHash(algo, bytes) {
    const buf = await crypto.subtle.digest(algo, new Uint8Array(bytes));
    return [...new Uint8Array(buf)];
  }

  function parseKey(key) {
    const s = String(key || '').trim();
    if (!s) return null;
    if (/^[0-9a-fA-F]+$/.test(s.replace(/\s/g, '')) && s.replace(/\s/g, '').length % 2 === 0) {
      const h = s.replace(/\s/g, '');
      return [...new Uint8Array(h.match(/.{2}/g).map(x => parseInt(x, 16)))];
    }
    return utf8(s);
  }

  async function hmac(algo, key, msg) {
    if (/^SHA3|^RIPEMD|^SM3/.test(algo) || algo === 'CRC32') return null;
    const keyBytes = parseKey(key);
    if (!keyBytes) return null;
    const block = ['SHA-384', 'SHA-512'].includes(algo) ? 128 : 64;
    let k = keyBytes;
    if (algo === 'MD5') {
      return MD5Cipher.hmac(hex(keyBytes), msg);
    }
    if (algo === 'MD4') {
      if (k.length > block) k = md4(k);
      const ipad = new Array(block).fill(0x36).map((b, i) => b ^ (k[i] || 0));
      const opad = new Array(block).fill(0x5c).map((b, i) => b ^ (k[i] || 0));
      return hex(md4(opad.concat(md4(ipad.concat(utf8(msg))))));
    }
    const name = algo === 'SHA-1' ? 'SHA-1' : algo === 'SHA-384' ? 'SHA-384' : algo === 'SHA-512' ? 'SHA-512' : 'SHA-256';
    const kk = await crypto.subtle.importKey('raw', new Uint8Array(keyBytes), { name: 'HMAC', hash: name }, false, ['sign']);
    return hex([...new Uint8Array(await crypto.subtle.sign('HMAC', kk, new Uint8Array(utf8(msg))))]);
  }

  function identify(value) {
    const s = String(value || '').trim();
    if (!s) return '';
    if (/^\$2[aby]\$/.test(s)) return 'bcrypt';
    if (/^\$argon2/.test(s)) return 'Argon2';
    if (/^\$1\$/.test(s)) return 'MD5 crypt';
    if (/^\{SSHA\}/.test(s)) return 'LDAP SSHA';
    if (!/^[0-9a-fA-F]+$/.test(s)) return '';
    const map = { 8: 'CRC32', 32: 'MD4 / MD5 / NTLM', 40: 'SHA-1', 56: 'SHA-224', 64: 'SHA-256', 96: 'SHA-384', 128: 'SHA-512' };
    return map[s.length] || '';
  }

  async function digest(algo, text) {
    const bytes = utf8(text);
    switch (algo) {
      case 'MD4': return hex(md4(bytes));
      case 'MD5': return MD5Cipher.e(text);
      case 'SHA-1': return hex(await webHash('SHA-1', bytes));
      case 'SHA-256': return hex(await webHash('SHA-256', bytes));
      case 'SHA-384': return hex(await webHash('SHA-384', bytes));
      case 'SHA-512': return hex(await webHash('SHA-512', bytes));
      case 'SHA3-256': return hex(sha3(bytes, 256));
      case 'SHA3-512': return hex(sha3(bytes, 512));
      case 'RIPEMD-160': return typeof HashExtra !== 'undefined' ? hex(HashExtra.ripemd160(bytes)) : '';
      case 'SM3': return typeof HashExtra !== 'undefined' ? hex(HashExtra.sm3(bytes)) : '';
      case 'CRC32': return crc32(bytes).toString(16).padStart(8, '0');
      default: return '';
    }
  }

  async function process(text, algo, key, format) {
    try {
      const h = await digest(algo, text);
      const bytes = h.match(/.{2}/g).map(x => parseInt(x, 16));
      const out = [format === 'base64' ? `哈希(base64): ${base64(bytes)}` : `哈希: ${h}`];
      if (key) {
        const hm = await hmac(algo, key, text);
        if (hm) out.push(`HMAC: ${hm}`);
      }
      const id = identify(text);
      if (id) out.push(`识别: ${id}`);
      return out.join('\n');
    } catch (e) {
      return `Hash 错误: ${e.message}`;
    }
  }

  return { process, digest, identify, md4, sha3, crc32 };
})();
