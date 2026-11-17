// RSA：加解密与常见攻击
const RSACipher = (() => {
  const ZERO = 0n, ONE = 1n;
  const gcd = (a, b) => { while (b) { [a, b] = [b, a % b]; } return a < 0n ? -a : a; };
  const egcd = (a, b) => {
    if (b === ZERO) return [a, ONE, ZERO];
    const [g, x, y] = egcd(b, a % b);
    return [g, y, x - (a / b) * y];
  };
  const modInv = (a, m) => {
    a = ((a % m) + m) % m;
    const [g, x] = egcd(a, m);
    return g === ONE ? ((x % m) + m) % m : null;
  };
  const modPow = (b, e, m) => {
    let r = ONE;
    b %= m;
    while (e > ZERO) {
      if (e & ONE) r = (r * b) % m;
      b = (b * b) % m;
      e >>= ONE;
    }
    return r;
  };
  const isqrt = n => {
    if (n < 0n) return -1n;
    if (n < 2n) return n;
    let x = n, y = (x + ONE) / 2n;
    while (y < x) { x = y; y = (x + n / x) / 2n; }
    return x;
  };
  const iroot = (n, k) => {
    if (n < 2n) return n;
    const kk = BigInt(k);
    let lo = 0n, hi = 1n;
    while (hi ** kk <= n) hi <<= 1n;
    while (lo + 1n < hi) {
      const mid = (lo + hi) / 2n;
      if (mid ** kk <= n) lo = mid; else hi = mid;
    }
    return lo;
  };
  const hex = n => n.toString(16);
  const parseBig = (s, radix) => {
    s = String(s || '').trim().replace(/\s+/g, '');
    if (!s) return null;
    try {
      return radix === 'hex' ? BigInt('0x' + s.replace(/^0x/i, '')) : BigInt(s);
    } catch { return null; }
  };
  const textToBig = (t, radix) => {
    if (radix === 'hex') return parseBig(t, 'hex');
    const bytes = new TextEncoder().encode(String(t || ''));
    if (!bytes.length) return 0n;
    return BigInt('0x' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''));
  };
  const bigToText = (n, radix) => {
    if (n == null) return '';
    if (radix === 'hex') return n.toString(16);
    let h = n.toString(16);
    if (h.length % 2) h = '0' + h;
    const bytes = [];
    for (let i = 0; i < h.length; i += 2) bytes.push(parseInt(h.slice(i, i + 2), 16));
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  };

  const smallPrimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

  function fermat(n) {
    if (n % 2n === ZERO) return [2n, n / 2n];
    let a = isqrt(n);
    if (a * a < n) a += ONE;
    for (let i = 0; i < 1000000; i++) {
      const b2 = a * a - n;
      const b = isqrt(b2);
      if (b * b === b2) return [a - b, a + b];
      a += ONE;
    }
    return null;
  }

  function pollardRho(n) {
    if (n % 2n === ZERO) return 2n;
    for (let c = 1n; c < 30n; c++) {
      let x = 2n, y = 2n, d = ONE;
      for (let i = 0; i < 200000 && d === ONE; i++) {
        x = (x * x + c) % n;
        y = (y * y + c) % n;
        y = (y * y + c) % n;
        d = gcd(x > y ? x - y : y - x, n);
      }
      if (d > ONE && d < n) return d;
    }
    return null;
  }

  function pollardP1(n, bound = 100000) {
    let a = 2n;
    for (let i = 2; i <= bound; i++) {
      a = modPow(a, BigInt(i), n);
      const d = gcd(a - ONE, n);
      if (d > ONE && d < n) return d;
    }
    return null;
  }

  function factor(n) {
    for (const p of smallPrimes) {
      if (n % BigInt(p) === ZERO) return [BigInt(p), n / BigInt(p)];
    }
    const f = fermat(n);
    if (f) return f;
    const p = pollardRho(n) || pollardP1(n);
    if (p) return [p, n / p];
    return null;
  }

  function wiener(n, e) {
    const cf = [];
    let a = e, b = n;
    while (b) { cf.push(a / b); [a, b] = [b, a % b]; }
    let h0 = 0n, h1 = ONE, k0 = ONE, k1 = ZERO;
    for (const q of cf) {
      const h2 = q * h1 + h0, k2 = q * k1 + k0;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (h1 === ZERO) continue;
      if ((e * k1 - ONE) % h1 !== ZERO) continue;
      const phi = (e * k1 - ONE) / h1;
      const s = n - phi + ONE;
      const disc = s * s - 4n * n;
      if (disc < ZERO) continue;
      const r = isqrt(disc);
      if (r * r !== disc) continue;
      const pp = (s + r) / 2n, qq = (s - r) / 2n;
      if (pp * qq === n) return { d: k1, p: pp, q: qq };
    }
    return null;
  }

  function parseBroadcast(text, radix) {
    return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      const m = line.match(/^([0-9a-fA-FxX]+)\s*[:,;\s]\s*([0-9a-fA-FxX]+)$/);
      if (!m) return null;
      const n = parseBig(m[1], radix), c = parseBig(m[2], radix);
      return n && c != null ? { n, c } : null;
    }).filter(Boolean);
  }

  function crt(items) {
    let N = ONE;
    for (const it of items) N *= it.n;
    let M = ZERO;
    for (const it of items) {
      const Ni = N / it.n;
      const inv = modInv(Ni % it.n, it.n);
      if (inv == null) return null;
      M = (M + (it.c % it.n) * Ni * inv) % N;
    }
    return { M, N };
  }

  function hastad(eTxt, broadcast, radix) {
    const e = parseBig(eTxt, radix);
    if (e == null || e < 2n || e > 32n) return 'e 需在 2..32';
    const items = parseBroadcast(broadcast, radix);
    if (items.length < Number(e)) return `至少需要 ${e} 组 n:c`;
    const r = crt(items);
    if (!r) return 'CRT 失败（模数不互素）';
    const m = iroot(r.M, Number(e));
    if (m ** e !== r.M) return 'CRT 结果不是完全 e 次方（可能数据不足或有填充）';
    return `m = ${m}\nhex = ${hex(m)}\ntext = ${bigToText(m, 'text')}`;
  }

  function dpLeak(nTxt, eTxt, dpTxt, cTxt, radix) {
    const n = parseBig(nTxt, radix), e = parseBig(eTxt, radix), dp = parseBig(dpTxt, radix);
    const c = parseBig(cTxt, radix);
    if (n == null || e == null || dp == null) return '请填写 n / e / dp';
    if (e > 1000000n) return 'e 太大，超出遍历范围';
    const t = e * dp - ONE;
    for (let k = ONE; k < e; k++) {
      if (t % k !== ZERO) continue;
      const p = t / k + ONE;
      if (p > ONE && n % p === ZERO) {
        const q = n / p;
        const phi = (p - ONE) * (q - ONE);
        const d = modInv(e, phi);
        let dec = '';
        if (c != null) dec = `\nm = ${bigToText(modPow(c, d, n), 'text')}`;
        return `p = ${p}\nq = ${q}\nd = ${d}${dec}`;
      }
    }
    return 'dp 泄露未恢复出因子';
  }

  function process(text, mode, nTxt, eTxt, dTxt, cTxt, e2Txt, c2Txt, radix, dpTxt, broadcast) {
    try {
      const n = parseBig(nTxt, radix);
      const e = parseBig(eTxt, radix);
      const d = parseBig(dTxt, radix);
      const c = parseBig(cTxt, radix);
      const msg = textToBig(text, radix);

      if (mode === 'encrypt') {
        if (n == null || e == null) return '请填写 n 和 e';
        const m = msg == null ? ZERO : msg;
        if (m >= n) return '明文必须小于 n';
        const enc = modPow(m, e, n);
        return `c = ${enc}\nhex = ${hex(enc)}`;
      }
      if (mode === 'decrypt') {
        if (n == null || d == null) return '请填写 n 和 d';
        const ct = c != null ? c : msg;
        if (ct == null || ct >= n) return '密文必须小于 n';
        const dec = modPow(ct, d, n);
        return `m = ${dec}\nhex = ${hex(dec)}\ntext = ${bigToText(dec, 'text')}`;
      }
      if (mode === 'smallE') {
        if (c == null || e == null) return '请填写 c 和 e';
        if (e > 64n) return 'e 太大';
        const m = iroot(c, Number(e));
        return `m = ${m}\nhex = ${hex(m)}\ntext = ${bigToText(m, 'text')}`;
      }
      if (mode === 'commonMod') {
        const e2 = parseBig(e2Txt, radix), c2 = parseBig(c2Txt, radix);
        if (n == null || e == null || c == null || e2 == null || c2 == null) return '请填写 n/e/c/e2/c2';
        const [g, a, b] = egcd(e, e2);
        if (g !== ONE) return `gcd(e1,e2)=${g}，无法直接求逆`;
        let m1 = modPow(c, a < ZERO ? -a : a, n);
        let m2 = modPow(c2, b < ZERO ? -b : b, n);
        if (a < ZERO) m1 = modInv(m1, n);
        if (b < ZERO) m2 = modInv(m2, n);
        if (m1 == null || m2 == null) return '求逆失败';
        const m = (m1 * m2) % n;
        return `m = ${m}\nhex = ${hex(m)}\ntext = ${bigToText(m, 'text')}`;
      }
      if (mode === 'wiener') {
        if (n == null || e == null) return '请填写 n 和 e';
        const r = wiener(n, e);
        if (!r) return 'Wiener 未找到小 d';
        return `d = ${r.d}\np = ${r.p}\nq = ${r.q}`;
      }
      if (mode === 'fermat') {
        if (n == null) return '请填写 n';
        const r = fermat(n);
        if (!r) return 'Fermat 未分解（p、q 距离太远）';
        return `p = ${r[0]}\nq = ${r[1]}\nd = ${modInv(e || 65537n, (r[0] - ONE) * (r[1] - ONE))}`;
      }
      if (mode === 'pollard') {
        if (n == null) return '请填写 n';
        const r = factor(n);
        if (!r) return 'Pollard 未分解';
        const phi = (r[0] - ONE) * (r[1] - ONE);
        return `p = ${r[0]}\nq = ${r[1]}\nphi = ${phi}\nd = ${modInv(e || 65537n, phi)}`;
      }
      if (mode === 'hastad') return hastad(eTxt, broadcast, radix);
      if (mode === 'dpLeak') return dpLeak(nTxt, eTxt, dpTxt, cTxt, radix);
      return '未知模式';
    } catch (err) {
      return `RSA 错误: ${err.message}`;
    }
  }

  return { process, modPow, modInv, gcd, isqrt, factor };
})();
