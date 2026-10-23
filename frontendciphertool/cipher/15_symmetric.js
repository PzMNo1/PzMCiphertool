// 对称密码补充：RC4 / DES / 3DES / ChaCha20
const SymmetricCipher = (() => {
  const IP = [58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8, 57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7];
  const FP = [40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29, 36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25];
  const E = [32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1];
  const P = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25];
  const PC1 = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4];
  const PC2 = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32];
  const SHIFT = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
  const S = [
    [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11]
  ];

  const toBits = bytes => bytes.flatMap(b => [7, 6, 5, 4, 3, 2, 1, 0].map(i => (b >> i) & 1));
  const fromBits = bits => {
    const out = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0);
      out.push(b);
    }
    return out;
  };
  const permute = (bits, table) => table.map(i => bits[i - 1]);
  const xorBits = (a, b) => a.map((x, i) => x ^ b[i]);
  const rotl = (bits, n) => bits.slice(n).concat(bits.slice(0, n));

  function desSubkeys(keyBytes) {
    const bits = toBits(keyBytes);
    const pc1 = permute(bits, PC1);
    let c = pc1.slice(0, 28), d = pc1.slice(28);
    const keys = [];
    for (let i = 0; i < 16; i++) {
      c = rotl(c, SHIFT[i]);
      d = rotl(d, SHIFT[i]);
      keys.push(permute(c.concat(d), PC2));
    }
    return keys;
  }

  function feistel(r, subkey) {
    const e = permute(r, E);
    const x = xorBits(e, subkey);
    const out = [];
    for (let i = 0; i < 8; i++) {
      const b = x.slice(i * 6, i * 6 + 6);
      const row = (b[0] << 1) | b[5];
      const col = (b[1] << 3) | (b[2] << 2) | (b[3] << 1) | b[4];
      const v = S[i][row * 16 + col];
      out.push((v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1);
    }
    return permute(out, P);
  }

  function desBlock(blockBytes, keyBytes, decrypt = false) {
    const bits = permute(toBits(blockBytes), IP);
    let l = bits.slice(0, 32), r = bits.slice(32);
    const keys = desSubkeys(keyBytes);
    for (let i = 0; i < 16; i++) {
      const k = keys[decrypt ? 15 - i : i];
      const t = xorBits(l, feistel(r, k));
      l = r;
      r = t;
    }
    return fromBits(permute(r.concat(l), FP));
  }

  function des3Block(block, key, decrypt = false) {
    const k1 = key.slice(0, 8);
    const k2 = key.length >= 16 ? key.slice(8, 16) : k1;
    const k3 = key.length >= 24 ? key.slice(16, 24) : k1;
    if (!decrypt) {
      return desBlock(desBlock(desBlock(block, k1, false), k2, true), k3, false);
    }
    return desBlock(desBlock(desBlock(block, k3, true), k2, false), k1, true);
  }

  const pad = bytes => {
    const n = 8 - (bytes.length % 8);
    return bytes.concat(new Array(n).fill(n));
  };
  const unpad = bytes => {
    const n = bytes[bytes.length - 1];
    return n && n <= 8 ? bytes.slice(0, bytes.length - n) : bytes;
  };
  const xorBytes = (a, b) => a.map((x, i) => x ^ b[i]);

  function desCrypt(bytes, key, mode, iv, decrypt, padding) {
    const blockFn = key.length === 8 ? desBlock : des3Block;
    const bs = 8;
    if (mode === 'CBC' && !decrypt) {
      const data = padding ? pad(bytes) : bytes;
      let prev = iv.slice(0, bs);
      const out = [];
      for (let i = 0; i < data.length; i += bs) {
        const enc = blockFn(xorBytes(data.slice(i, i + bs), prev), key, false);
        out.push(...enc);
        prev = enc;
      }
      return out;
    }
    if (mode === 'CBC') {
      let prev = iv.slice(0, bs);
      const out = [];
      for (let i = 0; i < bytes.length; i += bs) {
        const block = bytes.slice(i, i + bs);
        out.push(...xorBytes(blockFn(block, key, true), prev));
        prev = block;
      }
      return padding ? unpad(out) : out;
    }
    const data = !decrypt && padding ? pad(bytes) : bytes;
    const out = [];
    for (let i = 0; i < data.length; i += bs) out.push(...blockFn(data.slice(i, i + bs), key, decrypt));
    return decrypt && padding ? unpad(out) : out;
  }

  function rc4(bytes, key) {
    const s = Array.from({ length: 256 }, (_, i) => i);
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + key[i % key.length]) & 255;
      [s[i], s[j]] = [s[j], s[i]];
    }
    let i = 0; j = 0;
    return bytes.map(b => {
      i = (i + 1) & 255;
      j = (j + s[i]) & 255;
      [s[i], s[j]] = [s[j], s[i]];
      return b ^ s[(s[i] + s[j]) & 255];
    });
  }

  const rotl32 = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
  function chachaBlock(key, counter, nonce) {
    const c = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];
    const k = [];
    for (let i = 0; i < 8; i++) k.push(key[i * 4] | (key[i * 4 + 1] << 8) | (key[i * 4 + 2] << 16) | (key[i * 4 + 3] << 24));
    const n = [];
    for (let i = 0; i < 3; i++) n.push(nonce[i * 4] | (nonce[i * 4 + 1] << 8) | (nonce[i * 4 + 2] << 16) | (nonce[i * 4 + 3] << 24));
    const state = [...c, ...k, counter | 0, ...n];
    const x = state.slice();
    const qr = (a, b, cIdx, d) => {
      x[a] = (x[a] + x[b]) >>> 0; x[d] ^= x[a]; x[d] = rotl32(x[d], 16);
      x[cIdx] = (x[cIdx] + x[d]) >>> 0; x[b] ^= x[cIdx]; x[b] = rotl32(x[b], 12);
      x[a] = (x[a] + x[b]) >>> 0; x[d] ^= x[a]; x[d] = rotl32(x[d], 8);
      x[cIdx] = (x[cIdx] + x[d]) >>> 0; x[b] ^= x[cIdx]; x[b] = rotl32(x[b], 7);
    };
    for (let i = 0; i < 10; i++) {
      qr(0, 4, 8, 12); qr(1, 5, 9, 13); qr(2, 6, 10, 14); qr(3, 7, 11, 15);
      qr(0, 5, 10, 15); qr(1, 6, 11, 12); qr(2, 7, 8, 13); qr(3, 4, 9, 14);
    }
    const out = [];
    for (let i = 0; i < 16; i++) {
      const v = (x[i] + state[i]) >>> 0;
      out.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
    }
    return out;
  }

  function chacha20(bytes, key, nonce, counter = 1) {
    const out = [];
    for (let i = 0; i < bytes.length; i += 64) {
      const ks = chachaBlock(key, counter + Math.floor(i / 64), nonce);
      const chunk = bytes.slice(i, i + 64);
      out.push(...chunk.map((b, j) => b ^ ks[j]));
    }
    return out;
  }

  const hexToBytes = s => {
    const h = String(s || '').replace(/[^0-9a-fA-F]/g, '');
    const out = [];
    for (let i = 0; i + 2 <= h.length; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
    return out;
  };
  const bytesToHex = b => b.map(x => x.toString(16).padStart(2, '0')).join('');
  const textToBytes = s => [...new TextEncoder().encode(String(s || ''))];
  const bytesToText = b => new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(b));
  const base64ToBytes = s => [...Uint8Array.from(atob(String(s || '').trim()), c => c.charCodeAt(0))];
  const bytesToBase64 = b => btoa(String.fromCharCode(...b));
  const parseInput = (t, fmt) => fmt === 'hex' ? hexToBytes(t) : fmt === 'base64' ? base64ToBytes(t) : textToBytes(t);
  const formatOut = (b, fmt) => fmt === 'hex' ? bytesToHex(b) : fmt === 'base64' ? bytesToBase64(b) : bytesToText(b);

  function process(text, algo, mode, keyTxt, ivTxt, inputFmt, outputFmt, padding) {
    try {
      const data = parseInput(text, inputFmt);
      const key = /^[0-9a-fA-F\s]+$/.test(String(keyTxt || '')) ? hexToBytes(keyTxt) : textToBytes(keyTxt);
      if (algo === 'RC4') {
        if (!key.length) return 'RC4 需要 key hex';
        const enc = rc4(data, key);
        return `加密: ${formatOut(enc, outputFmt)}\n解密: ${formatOut(rc4(enc, key), outputFmt)}`;
      }
      if (algo === 'ChaCha20') {
        if (key.length !== 32) return 'ChaCha20 key 必须是 32 字节 hex';
        const nonce = hexToBytes(ivTxt);
        if (nonce.length !== 12) return 'ChaCha20 nonce 必须是 12 字节 hex';
        const enc = chacha20(data, key, nonce, 1);
        return `加密: ${formatOut(enc, outputFmt)}\n解密: ${formatOut(chacha20(enc, key, nonce, 1), outputFmt)}`;
      }
      if (![8, 16, 24].includes(key.length)) return 'DES key 8 字节，3DES key 16/24 字节（hex）';
      const iv = hexToBytes(ivTxt);
      if (mode === 'CBC' && iv.length < 8) return 'CBC 需要 8 字节 IV';
      const enc = desCrypt(data, key, mode, iv, false, padding !== 'none');
      let dec = '';
      try { dec = formatOut(desCrypt(data, key, mode, iv, true, padding !== 'none'), outputFmt); } catch { dec = '解密失败'; }
      return `加密: ${formatOut(enc, outputFmt)}\n解密: ${dec}`;
    } catch (e) {
      return `对称密码错误: ${e.message}`;
    }
  }

  return { process, desBlock, rc4, chacha20 };
})();
