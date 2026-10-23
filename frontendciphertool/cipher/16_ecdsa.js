// ECDSA nonce reuse：同一 r、两组 (z,s) 恢复 k 和私钥 d
const ECDSATool = (() => {
  const CURVES = {
    secp256k1: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
    p256: 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n
  };
  const egcd = (a, b) => b === 0n ? [a, 1n, 0n] : (([g, x, y]) => [g, y, x - (a / b) * y])(egcd(b, a % b));
  const inv = (a, m) => {
    a = ((a % m) + m) % m;
    const [g, x] = egcd(a, m);
    return g === 1n ? ((x % m) + m) % m : null;
  };
  const parse = (s, radix) => {
    s = String(s || '').trim().replace(/\s+/g, '');
    if (!s) return null;
    try { return radix === 'hex' ? BigInt('0x' + s.replace(/^0x/i, '')) : BigInt(s); } catch { return null; }
  };

  function process(curve, rTxt, s1Txt, s2Txt, z1Txt, z2Txt, radix) {
    const n = CURVES[curve];
    if (!n) return '未知曲线';
    const r = parse(rTxt, radix), s1 = parse(s1Txt, radix), s2 = parse(s2Txt, radix);
    const z1 = parse(z1Txt, radix), z2 = parse(z2Txt, radix);
    if ([r, s1, s2, z1, z2].some(v => v == null)) return '请填写 r / s1 / s2 / z1 / z2';
    const ds = ((s1 - s2) % n + n) % n;
    const dz = ((z1 - z2) % n + n) % n;
    const dsInv = inv(ds, n);
    if (dsInv == null) return 's1 - s2 与 n 不互素';
    const k = (dz * dsInv) % n;
    const rInv = inv(r, n);
    if (rInv == null) return 'r 与 n 不互素';
    const d = (((s1 * k - z1) % n + n) % n * rInv) % n;
    return [
      `k = ${k}`,
      `k(hex) = ${k.toString(16)}`,
      `d = ${d}`,
      `d(hex) = ${d.toString(16)}`
    ].join('\n');
  }

  return { process, CURVES };
})();
