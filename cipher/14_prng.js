// PRNG：MT19937 状态恢复 / LCG 预测
const PRNGTool = (() => {
  const unshiftRight = (y, shift) => {
    let x = 0;
    for (let i = 31; i >= 0; i--) {
      const yi = (y >>> i) & 1;
      const xi = yi ^ (i + shift < 32 ? (x >>> (i + shift)) & 1 : 0);
      x |= xi << i;
    }
    return x >>> 0;
  };
  const unshiftLeftMasked = (y, shift, mask) => {
    let x = 0;
    for (let i = 0; i < 32; i++) {
      const yi = (y >>> i) & 1;
      const mi = (mask >>> i) & 1;
      const xi = yi ^ (i >= shift && mi ? (x >>> (i - shift)) & 1 : 0);
      x |= xi << i;
    }
    return x >>> 0;
  };
  const untemper = y => {
    y = unshiftRight(y, 18);
    y = unshiftLeftMasked(y, 15, 0xefc60000);
    y = unshiftLeftMasked(y, 7, 0x9d2c5680);
    y = unshiftRight(y, 11);
    return y >>> 0;
  };

  function mtPredict(outputs, count) {
    if (outputs.length < 624) return `需要 624 个 32 位输出，当前 ${outputs.length} 个`;
    const mt = outputs.slice(0, 624).map(untemper);
    let idx = 624;
    const twist = () => {
      for (let i = 0; i < 624; i++) {
        const y = (mt[i] & 0x80000000) + (mt[(i + 1) % 624] & 0x7fffffff);
        mt[i] = mt[(i + 397) % 624] ^ (y >>> 1);
        if (y % 2 !== 0) mt[i] ^= 0x9908b0df;
      }
      idx = 0;
    };
    const next = () => {
      if (idx >= 624) twist();
      let y = mt[idx++];
      y ^= y >>> 11;
      y ^= (y << 7) & 0x9d2c5680;
      y ^= (y << 15) & 0xefc60000;
      y ^= y >>> 18;
      return y >>> 0;
    };
    const out = [];
    for (let i = 0; i < count; i++) out.push(next());
    return out.join(' ');
  }

  function lcgPredict(outputs, m, a, c, count) {
    if (outputs.length < 2) return '至少需要 2 个 LCG 输出';
    m = BigInt(m); a = BigInt(a); c = BigInt(c);
    let x = BigInt(outputs[outputs.length - 1]);
    const out = [];
    for (let i = 0; i < count; i++) {
      x = (a * x + c) % m;
      out.push(x.toString());
    }
    return out.join(' ');
  }

  function parseNums(text) {
    return String(text || '').split(/[\s,;]+/).filter(Boolean).map(x => {
      const n = Number(x);
      return Number.isFinite(n) ? (n >>> 0) : 0;
    });
  }

  function process(text, mode, count, m, a, c) {
    try {
      const nums = parseNums(text);
      const n = Math.max(1, Math.min(64, parseInt(count, 10) || 5));
      if (mode === 'lcg') {
        if (!m || !a || !c) return 'LCG 需要 modulus / a / c';
        return `后续 ${n} 个: ${lcgPredict(nums, m, a, c, n)}`;
      }
      return `后续 ${n} 个: ${mtPredict(nums, n)}`;
    } catch (e) {
      return `PRNG 错误: ${e.message}`;
    }
  }

  return { process, untemper };
})();
