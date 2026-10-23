// AES：128/192/256，ECB/CBC/CFB/OFB/CTR/GCM
const AESCipher = (() => {
  const SBOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
  ];
  const INV_SBOX = new Array(256);
  for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
  const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

  const xtime = a => ((a << 1) ^ ((a & 0x80) ? 0x1b : 0)) & 0xff;
  const mul = (a, b) => {
    let r = 0;
    while (b) {
      if (b & 1) r ^= a;
      a = xtime(a);
      b >>= 1;
    }
    return r;
  };

  function expandKey(key) {
    const nk = key.length / 4;
    const nr = nk + 6;
    const w = [];
    for (let i = 0; i < nk; i++) w.push(key.slice(i * 4, i * 4 + 4));
    for (let i = nk; i < 4 * (nr + 1); i++) {
      let temp = w[i - 1].slice();
      if (i % nk === 0) {
        temp = [temp[1], temp[2], temp[3], temp[0]].map(b => SBOX[b]);
        temp[0] ^= RCON[i / nk - 1];
      } else if (nk > 6 && i % nk === 4) {
        temp = temp.map(b => SBOX[b]);
      }
      w.push(w[i - nk].map((b, j) => b ^ temp[j]));
    }
    const roundKeys = [];
    for (let r = 0; r <= nr; r++) {
      const rk = [];
      for (let i = 0; i < 4; i++) rk.push(...w[r * 4 + i]);
      roundKeys.push(rk);
    }
    return { nr, roundKeys };
  }

  const addKey = (s, k) => s.map((b, i) => b ^ k[i]);
  const subBytes = s => s.map(b => SBOX[b]);
  const invSubBytes = s => s.map(b => INV_SBOX[b]);

  function shiftRows(s) {
    const o = s.slice();
    for (let r = 1; r < 4; r++) {
      for (let c = 0; c < 4; c++) o[r + 4 * c] = s[r + 4 * ((c + r) % 4)];
    }
    return o;
  }
  function invShiftRows(s) {
    const o = s.slice();
    for (let r = 1; r < 4; r++) {
      for (let c = 0; c < 4; c++) o[r + 4 * ((c + r) % 4)] = s[r + 4 * c];
    }
    return o;
  }
  function mixColumns(s) {
    const o = s.slice();
    for (let c = 0; c < 4; c++) {
      const a = s.slice(4 * c, 4 * c + 4);
      o[4 * c] = mul(a[0], 2) ^ mul(a[1], 3) ^ a[2] ^ a[3];
      o[4 * c + 1] = a[0] ^ mul(a[1], 2) ^ mul(a[2], 3) ^ a[3];
      o[4 * c + 2] = a[0] ^ a[1] ^ mul(a[2], 2) ^ mul(a[3], 3);
      o[4 * c + 3] = mul(a[0], 3) ^ a[1] ^ a[2] ^ mul(a[3], 2);
    }
    return o;
  }
  function invMixColumns(s) {
    const o = s.slice();
    for (let c = 0; c < 4; c++) {
      const a = s.slice(4 * c, 4 * c + 4);
      o[4 * c] = mul(a[0], 14) ^ mul(a[1], 11) ^ mul(a[2], 13) ^ mul(a[3], 9);
      o[4 * c + 1] = mul(a[0], 9) ^ mul(a[1], 14) ^ mul(a[2], 11) ^ mul(a[3], 13);
      o[4 * c + 2] = mul(a[0], 13) ^ mul(a[1], 9) ^ mul(a[2], 14) ^ mul(a[3], 11);
      o[4 * c + 3] = mul(a[0], 11) ^ mul(a[1], 13) ^ mul(a[2], 9) ^ mul(a[3], 14);
    }
    return o;
  }

  function encryptBlock(block, key) {
    const { nr, roundKeys } = expandKey(key);
    let s = addKey(block, roundKeys[0]);
    for (let r = 1; r < nr; r++) {
      s = addKey(mixColumns(shiftRows(subBytes(s))), roundKeys[r]);
    }
    return addKey(shiftRows(subBytes(s)), roundKeys[nr]);
  }

  function decryptBlock(block, key) {
    const { nr, roundKeys } = expandKey(key);
    let s = addKey(block, roundKeys[nr]);
    for (let r = nr - 1; r > 0; r--) {
      s = invMixColumns(addKey(invSubBytes(invShiftRows(s)), roundKeys[r]));
    }
    return addKey(invSubBytes(invShiftRows(s)), roundKeys[0]);
  }

  const pad = (bytes, size = 16) => {
    const n = size - (bytes.length % size);
    return bytes.concat(new Array(n).fill(n));
  };
  const unpad = bytes => {
    const n = bytes[bytes.length - 1];
    if (!n || n > 16 || n > bytes.length) return bytes;
    return bytes.slice(0, bytes.length - n);
  };
  const xor = (a, b) => a.map((x, i) => x ^ b[i]);
  const incCounter = ctr => {
    const o = ctr.slice();
    for (let i = o.length - 1; i >= 0; i--) {
      if (++o[i] <= 0xff) break;
      o[i] = 0;
    }
    return o;
  };

  function encryptBytes(bytes, key, mode, iv, padding = true) {
    const m = mode.toUpperCase();
    if (m === 'ECB') {
      const data = padding ? pad(bytes) : bytes;
      const out = [];
      for (let i = 0; i < data.length; i += 16) out.push(...encryptBlock(data.slice(i, i + 16), key));
      return out;
    }
    if (m === 'CBC') {
      const data = padding ? pad(bytes) : bytes;
      let prev = iv.slice(0, 16);
      const out = [];
      for (let i = 0; i < data.length; i += 16) {
        const block = xor(data.slice(i, i + 16), prev);
        const enc = encryptBlock(block, key);
        out.push(...enc);
        prev = enc;
      }
      return out;
    }
    if (m === 'CFB') {
      let prev = iv.slice(0, 16);
      const out = [];
      for (let i = 0; i < bytes.length; i += 16) {
        const ks = encryptBlock(prev, key);
        const block = bytes.slice(i, i + 16);
        const enc = xor(block, ks);
        out.push(...enc);
        prev = enc;
      }
      return out;
    }
    if (m === 'OFB') {
      let prev = iv.slice(0, 16);
      const out = [];
      for (let i = 0; i < bytes.length; i += 16) {
        prev = encryptBlock(prev, key);
        out.push(...xor(bytes.slice(i, i + 16), prev));
      }
      return out;
    }
    if (m === 'CTR') {
      let ctr = iv.slice(0, 16);
      const out = [];
      for (let i = 0; i < bytes.length; i += 16) {
        out.push(...xor(bytes.slice(i, i + 16), encryptBlock(ctr, key)));
        ctr = incCounter(ctr);
      }
      return out;
    }
    throw new Error('不支持的 AES 模式');
  }

  function decryptBytes(bytes, key, mode, iv, padding = true) {
    const m = mode.toUpperCase();
    if (m === 'ECB') {
      const out = [];
      for (let i = 0; i < bytes.length; i += 16) out.push(...decryptBlock(bytes.slice(i, i + 16), key));
      return padding ? unpad(out) : out;
    }
    if (m === 'CBC') {
      let prev = iv.slice(0, 16);
      const out = [];
      for (let i = 0; i < bytes.length; i += 16) {
        const block = bytes.slice(i, i + 16);
        out.push(...xor(decryptBlock(block, key), prev));
        prev = block;
      }
      return padding ? unpad(out) : out;
    }
    if (m === 'CFB') {
      let prev = iv.slice(0, 16);
      const out = [];
      for (let i = 0; i < bytes.length; i += 16) {
        const block = bytes.slice(i, i + 16);
        out.push(...xor(block, encryptBlock(prev, key)));
        prev = block;
      }
      return out;
    }
    if (m === 'OFB') {
      let prev = iv.slice(0, 16);
      const out = [];
      for (let i = 0; i < bytes.length; i += 16) {
        prev = encryptBlock(prev, key);
        out.push(...xor(bytes.slice(i, i + 16), prev));
      }
      return out;
    }
    if (m === 'CTR') {
      let ctr = iv.slice(0, 16);
      const out = [];
      for (let i = 0; i < bytes.length; i += 16) {
        out.push(...xor(bytes.slice(i, i + 16), encryptBlock(ctr, key)));
        ctr = incCounter(ctr);
      }
      return out;
    }
    throw new Error('不支持的 AES 模式');
  }

  const hexToBytes = s => {
    const h = String(s || '').replace(/[^0-9a-fA-F]/g, '');
    const out = [];
    for (let i = 0; i + 2 <= h.length; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
    return out;
  };
  const bytesToHex = b => b.map(x => x.toString(16).padStart(2, '0')).join('');
  const bytesToBase64 = b => btoa(String.fromCharCode(...b));
  const base64ToBytes = s => [...Uint8Array.from(atob(String(s || '').trim()), c => c.charCodeAt(0))];
  const textToBytes = s => [...new TextEncoder().encode(String(s || ''))];
  const bytesToText = b => new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(b));

  function parseInput(t, fmt) {
    if (fmt === 'hex') return hexToBytes(t);
    if (fmt === 'base64') return base64ToBytes(t);
    return textToBytes(t);
  }
  function formatOutput(b, fmt) {
    if (fmt === 'hex') return bytesToHex(b);
    if (fmt === 'base64') return bytesToBase64(b);
    return bytesToText(b);
  }

  async function gcmEncrypt(bytes, key, iv) {
    const k = await crypto.subtle.importKey('raw', new Uint8Array(key), { name: 'AES-GCM' }, false, ['encrypt']);
    return [...new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, k, new Uint8Array(bytes)))];
  }
  async function gcmDecrypt(bytes, key, iv) {
    const k = await crypto.subtle.importKey('raw', new Uint8Array(key), { name: 'AES-GCM' }, false, ['decrypt']);
    return [...new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, k, new Uint8Array(bytes)))];
  }

  async function process(text, mode, keyHex, ivHex, inputFmt, outputFmt, padding) {
    try {
      const key = hexToBytes(keyHex);
      if (![16, 24, 32].includes(key.length)) return '密钥必须是 16/24/32 字节 hex';
      const iv = hexToBytes(ivHex);
      const data = parseInput(text, inputFmt);
      if (mode.toUpperCase() === 'GCM') {
        if (iv.length !== 12) return 'GCM 的 IV 必须是 12 字节 hex';
        const enc = await gcmEncrypt(data, key, iv);
        let dec = '';
        try { dec = formatOutput(await gcmDecrypt(enc, key, iv), outputFmt); } catch { dec = '解密失败'; }
        return `加密: ${formatOutput(enc, outputFmt)}\n解密: ${dec}`;
      }
      const enc = encryptBytes(data, key, mode, iv, padding !== 'none');
      let dec = '';
      try { dec = formatOutput(decryptBytes(data, key, mode, iv, padding !== 'none'), outputFmt); } catch { dec = '解密失败'; }
      return `加密: ${formatOutput(enc, outputFmt)}\n解密: ${dec}`;
    } catch (e) {
      return `AES 错误: ${e.message}`;
    }
  }

  return { process, encryptBlock, decryptBlock, hexToBytes, bytesToHex, encryptBytes, decryptBytes };
})();
