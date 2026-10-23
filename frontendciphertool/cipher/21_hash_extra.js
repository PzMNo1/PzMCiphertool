// Hash 扩展：RIPEMD-160 / SM3
const HashExtra = (() => {
  const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
  const R1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
  const R2 = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11];
  const S1 = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
  const S2 = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];
  const K1 = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e];
  const K2 = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];
  const f = (j, x, y, z) => j < 16 ? (x ^ y ^ z) : j < 32 ? ((x & y) | (~x & z)) : j < 48 ? ((x | ~y) ^ z) : j < 64 ? ((x & z) | (y & ~z)) : (x ^ (y | ~z));

  function ripemd160(input) {
    const bytes = input.slice();
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 0; i < 8; i++) bytes.push((bitLen / Math.pow(2, 8 * i)) & 0xff);
    const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
    for (let off = 0; off < bytes.length; off += 64) {
      const X = [];
      for (let i = 0; i < 16; i++) X.push(bytes[off + i * 4] | (bytes[off + i * 4 + 1] << 8) | (bytes[off + i * 4 + 2] << 16) | (bytes[off + i * 4 + 3] << 24));
      let al = h[0], bl = h[1], cl = h[2], dl = h[3], el = h[4];
      let ar = h[0], br = h[1], cr = h[2], dr = h[3], er = h[4];
      for (let j = 0; j < 80; j++) {
        let t = (rotl((al + f(j, bl, cl, dl) + X[R1[j]] + K1[Math.floor(j / 16)]) >>> 0, S1[j]) + el) >>> 0;
        al = el; el = dl; dl = rotl(cl, 10); cl = bl; bl = t;
        t = (rotl((ar + f(79 - j, br, cr, dr) + X[R2[j]] + K2[Math.floor(j / 16)]) >>> 0, S2[j]) + er) >>> 0;
        ar = er; er = dr; dr = rotl(cr, 10); cr = br; br = t;
      }
      const t = (h[1] + cl + dr) >>> 0;
      h[1] = (h[2] + dl + er) >>> 0;
      h[2] = (h[3] + el + ar) >>> 0;
      h[3] = (h[4] + al + br) >>> 0;
      h[4] = (h[0] + bl + cr) >>> 0;
      h[0] = t;
    }
    const out = [];
    for (const v of h) for (let i = 0; i < 4; i++) out.push((v >>> (8 * i)) & 0xff);
    return out;
  }

  const P0 = x => (x ^ rotl(x, 9) ^ rotl(x, 17)) >>> 0;
  const P1 = x => (x ^ rotl(x, 15) ^ rotl(x, 23)) >>> 0;
  function sm3(input) {
    const bytes = input.slice();
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, 8 * i)) & 0xff);
    let V = [0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600, 0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e];
    for (let off = 0; off < bytes.length; off += 64) {
      const W = new Array(68), W1 = new Array(64);
      for (let i = 0; i < 16; i++) W[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      for (let j = 16; j < 68; j++) W[j] = (P1((W[j - 16] ^ W[j - 9] ^ rotl(W[j - 3], 15)) >>> 0) ^ rotl(W[j - 13], 7) ^ W[j - 6]) >>> 0;
      for (let j = 0; j < 64; j++) W1[j] = (W[j] ^ W[j + 4]) >>> 0;
      let [A, B, C, D, E, F, G, H] = V;
      for (let j = 0; j < 64; j++) {
        const T = j < 16 ? 0x79cc4519 : 0x7a879d8a;
        const SS1 = rotl((rotl(A, 12) + E + rotl(T, j % 32)) >>> 0, 7);
        const SS2 = (SS1 ^ rotl(A, 12)) >>> 0;
        const FF = j < 16 ? (A ^ B ^ C) : ((A & B) | (A & C) | (B & C));
        const GG = j < 16 ? (E ^ F ^ G) : ((E & F) | (~E & G));
        const TT1 = (FF + D + SS2 + W1[j]) >>> 0;
        const TT2 = (GG + H + SS1 + W[j]) >>> 0;
        D = C; C = rotl(B, 9); B = A; A = TT1;
        H = G; G = rotl(F, 19); F = E; E = P0(TT2);
      }
      V = [V[0] ^ A, V[1] ^ B, V[2] ^ C, V[3] ^ D, V[4] ^ E, V[5] ^ F, V[6] ^ G, V[7] ^ H].map(x => x >>> 0);
    }
    const out = [];
    for (const v of V) for (let i = 3; i >= 0; i--) out.push((v >>> (8 * i)) & 0xff);
    return out;
  }

  return { ripemd160, sm3 };
})();
