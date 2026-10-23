// ECC 本地计算器：点加、点乘、曲线/子群检查
const ECCCalc = (() => {
  const CURVES = {
    secp256k1: {
      p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
      a: 0n,
      b: 7n,
      gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
      gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
      n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
    },
    p256: {
      p: 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn,
      a: 0xffffffff00000001000000000000000000000000fffffffffffffffffffffffcn,
      b: 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn,
      gx: 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n,
      gy: 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n,
      n: 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n
    }
  };

  const mod = (x, p) => ((x % p) + p) % p;
  const inv = (a, p) => {
    a = mod(a, p);
    if (a === 0n) return null;
    let [oldR, r] = [a, p], [oldS, s] = [1n, 0n];
    while (r !== 0n) {
      const q = oldR / r;
      [oldR, r] = [r, oldR - q * r];
      [oldS, s] = [s, oldS - q * s];
    }
    return oldR === 1n ? mod(oldS, p) : null;
  };

  const onCurve = (P, p, a, b) => P && mod(P.y * P.y, p) === mod(P.x * P.x * P.x + a * P.x + b, p);

  function add(P, Q, p, a) {
    if (!P) return Q;
    if (!Q) return P;
    if (P.x === Q.x) {
      if (mod(P.y + Q.y, p) === 0n) return null;
      const s = mod((3n * P.x * P.x + a) * inv(2n * P.y, p), p);
      const x = mod(s * s - 2n * P.x, p);
      return { x, y: mod(s * (P.x - x) - P.y, p) };
    }
    const s = mod((Q.y - P.y) * inv(Q.x - P.x, p), p);
    const x = mod(s * s - P.x - Q.x, p);
    return { x, y: mod(s * (P.x - x) - P.y, p) };
  }

  function mul(k, P, p, a) {
    if (k < 0n) return mul(-k, P ? { x: P.x, y: mod(-P.y, p) } : null, p, a);
    let R = null, Q = P;
    while (k > 0n) {
      if (k & 1n) R = add(R, Q, p, a);
      Q = add(Q, Q, p, a);
      k >>= 1n;
    }
    return R;
  }

  const parse = (s, radix) => {
    s = String(s || '').trim().replace(/\s/g, '');
    if (!s) return null;
    try { return radix === 'hex' ? BigInt('0x' + s.replace(/^0x/i, '')) : BigInt(s); } catch { return null; }
  };
  const hex = n => n == null ? '' : n.toString(16);
  const pointText = P => P ? `(${hex(P.x)}, ${hex(P.y)})` : '∞';

  function process(curveName, mode, radix, pTxt, aTxt, bTxt, nTxt, pxTxt, pyTxt, qxTxt, qyTxt, kTxt) {
    try {
      const preset = CURVES[curveName];
      const p = preset ? preset.p : parse(pTxt, radix);
      const a = preset ? preset.a : parse(aTxt, radix);
      const b = preset ? preset.b : parse(bTxt, radix);
      const n = preset ? preset.n : parse(nTxt, radix);
      if (p == null || a == null || b == null) return '请填写 p / a / b，或选择预设曲线';
      const px = parse(pxTxt, radix), py = parse(pyTxt, radix);
      if (px == null || py == null) return '请填写点 P 的 x / y';
      const P = { x: mod(px, p), y: mod(py, p) };

      if (mode === 'check') {
        const ok = onCurve(P, p, a, b);
        const nP = n != null ? mul(n, P, p, a) : null;
        return [
          `P = ${pointText(P)}`,
          `在曲线上: ${ok ? '是' : '否'}`,
          n != null ? `n·P = ${pointText(nP)}` : '未提供 n',
          n != null ? (nP ? '子群检查: 不在 n 阶子群内' : '子群检查: 在 n 阶子群内') : ''
        ].filter(Boolean).join('\n');
      }

      if (mode === 'add') {
        const qx = parse(qxTxt, radix), qy = parse(qyTxt, radix);
        if (qx == null || qy == null) return '请填写点 Q 的 x / y';
        const Q = { x: mod(qx, p), y: mod(qy, p) };
        return [
          `P = ${pointText(P)}`,
          `Q = ${pointText(Q)}`,
          `P + Q = ${pointText(add(P, Q, p, a))}`
        ].join('\n');
      }

      if (mode === 'mul' || mode === 'double') {
        const k = mode === 'double' ? 2n : parse(kTxt, radix);
        if (k == null) return '请填写标量 k';
        const kk = n ? mod(k, n) : k;
        return [
          `k = ${kk}`,
          `P = ${pointText(P)}`,
          `k·P = ${pointText(mul(kk, P, p, a))}`
        ].join('\n');
      }

      if (mode === 'neg') {
        return `P = ${pointText(P)}\n-P = ${pointText({ x: P.x, y: mod(-P.y, p) })}`;
      }

      return '未知模式';
    } catch (e) {
      return `ECC 错误: ${e.message}`;
    }
  }

  return { process, CURVES, add, mul, onCurve };
})();
