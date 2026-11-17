// 键盘布局转换：QWERTY / Dvorak / AZERTY / Colemak
const KeyboardLayout = (() => {
  const base = ['qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'];
  const layouts = {
    dvorak: ["',.pyfgcrl/=", 'aoeuidhtns-', ';qjkxbmwvz'],
    azerty: ['azertyuiop^$', 'qsdfghjklmù*', 'wxcvbn,;:!'],
    colemak: ['qwfpgjluy;[]', "arstdhneio'", 'zxcvbkm,./']
  };
  const maps = {};
  for (const [name, rows] of Object.entries(layouts)) {
    const to = {}, from = {};
    base.forEach((row, r) => {
      [...row].forEach((q, i) => {
        const c = [...rows[r]][i];
        if (c != null) { to[q] = c; from[c] = q; }
      });
    });
    maps[name] = { to, from };
  }
  const convert = (text, map) => [...String(text || '').toLowerCase()].map(c => map[c] || c).join('');
  return {
    process: (text, layout) => {
      const m = maps[layout] || maps.dvorak;
      return `QWERTY → ${layout}: ${convert(text, m.to)}\n${layout} → QWERTY: ${convert(text, m.from)}`;
    }
  };
})();
