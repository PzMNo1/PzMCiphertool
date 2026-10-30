const getR = () => {
  const r = window.replicad;
  if (!r) throw new Error('几何内核尚未就绪');
  return r;
};

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const fmt = value => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const createCtx = () => {
  const steps = [];
  const notes = [];
  return {
    steps,
    notes,
    ok(label, detail = '') { steps.push({ label, detail, state: 'ok' }); },
    skip(label, detail = '') { steps.push({ label, detail, state: 'skip' }); },
    warn(label, detail = '') { steps.push({ label, detail, state: 'warn' }); },
    note(text) { notes.push(text); }
  };
};

const clampWithNote = (value, min, max, label, ctx) => {
  const result = clamp(value, min, max);
  if (Math.abs(result - value) > 1e-6) {
    ctx.note(`${label} 已收敛到 ${fmt(result)} mm`);
  }
  return result;
};

const makeCylinder = (radius, height, at = [0, 0, 0], dir = [0, 0, 1]) =>
  getR().makeCylinder(radius, height, at, dir);

const cutWith = (shape, tools) => {
  if (!tools.length) return shape;
  const R = getR();
  try {
    const cutter = tools.length === 1 ? tools[0] : tools.reduce((acc, tool) => acc.fuse(tool));
    return shape.cut(cutter);
  } catch (error) {
    return tools.reduce((acc, tool) => acc.cut(tool), shape);
  }
};

const edgeFilter = (plane, origin) => finder => finder.inPlane(plane, origin);

const tryFillet = (shape, radius, filter, label, ctx, detail) => {
  if (!(radius > 0)) {
    ctx.skip(label, '未启用');
    return shape;
  }
  try {
    const next = shape.fillet(radius, filter);
    ctx.ok(label, detail || `R${fmt(radius)}`);
    return next;
  } catch (error) {
    ctx.warn(label, '圆角失败，已保留直角');
    return shape;
  }
};

const tryChamfer = (shape, size, filter, label, ctx, detail) => {
  if (!(size > 0)) {
    ctx.skip(label, '未启用');
    return shape;
  }
  try {
    const next = shape.chamfer(size, filter);
    ctx.ok(label, detail || `C${fmt(size)}`);
    return next;
  } catch (error) {
    ctx.warn(label, '倒角失败，已保留锐边');
    return shape;
  }
};

const numberField = (key, label, value, min, max, step = 1, unit = 'mm') => ({
  type: 'number', key, label, value, min, max, step, unit
});

const selectField = (key, label, value, options) => ({
  type: 'select', key, label, value, options
});

const toggleField = (key, label, value) => ({
  type: 'toggle', key, label, value
});

function buildFlange(raw) {
  const ctx = createCtx();
  const OD = clampWithNote(num(raw.outerDia, 180), 40, 600, '外径', ctx);
  const T = clampWithNote(num(raw.thickness, 18), 6, 60, '厚度', ctx);
  const bore = clampWithNote(num(raw.boreDia, 80), 6, OD - 14, '中心孔径', ctx);
  const boltDia = clampWithNote(num(raw.boltDia, 18), 3, 40, '螺栓孔径', ctx);
  const boltCount = Math.round(clamp(num(raw.boltCount, 8), 3, 24));
  const hubOn = raw.hubOn !== false;
  let hubDia = clampWithNote(num(raw.hubDia, 110), bore + 6, OD, '轮毂外径', ctx);
  const hubHeight = clampWithNote(num(raw.hubHeight, 16), 0, 120, '轮毂高度', ctx);
  const edgeFillet = clamp(num(raw.edgeFillet, 3), 0, Math.min(12, T / 2 - 0.5));

  let shape = makeCylinder(OD / 2, T, [0, 0, 0], [0, 0, 1]);
  ctx.ok('基体毛坯', `Ø${fmt(OD)} × ${fmt(T)}`);

  shape = tryFillet(shape, edgeFillet, edgeFilter('XY', T), '外缘上圆角', ctx);
  shape = tryFillet(shape, edgeFillet, edgeFilter('XY', 0), '外缘下圆角', ctx);

  if (hubOn && hubHeight > 0.5 && hubDia > bore + 4) {
    const hub = makeCylinder(hubDia / 2, hubHeight, [0, 0, T], [0, 0, 1]);
    shape = shape.fuse(hub);
    ctx.ok('轮毂凸台', `Ø${fmt(hubDia)} × ${fmt(hubHeight)}`);
  } else {
    ctx.skip('轮毂凸台', hubOn ? '高度或直径不足' : '未启用');
  }

  shape = shape.cut(makeCylinder(bore / 2, T + hubHeight + 4, [0, 0, -2], [0, 0, 1]));
  ctx.ok('中心通孔', `Ø${fmt(bore)}`);

  const boltMin = Math.max(bore + boltDia + 4, hubOn ? hubDia + boltDia + 4 : 0);
  const boltMax = OD - boltDia - 4;
  let pcd = num(raw.boltCircle, 140);
  if (boltMin <= boltMax) {
    const constrained = clampWithNote(pcd, boltMin, boltMax, '螺栓孔分布圆', ctx);
    pcd = constrained;
    const holes = [];
    for (let i = 0; i < boltCount; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / boltCount;
      holes.push(makeCylinder(
        boltDia / 2,
        T + hubHeight + 4,
        [Math.cos(angle) * pcd / 2, Math.sin(angle) * pcd / 2, -2],
        [0, 0, 1]
      ));
    }
    shape = cutWith(shape, holes);
    ctx.ok('螺栓孔', `${boltCount} × Ø${fmt(boltDia)} · PCD ${fmt(pcd)}`);
  } else {
    ctx.skip('螺栓孔', '盘面空间不足');
    ctx.note('中心孔与轮毂过大，已跳过螺栓孔');
  }

  const used = {
    outerDia: OD,
    thickness: T,
    boreDia: bore,
    boltDia,
    boltCount,
    hubOn,
    hubDia,
    hubHeight,
    edgeFillet,
    boltCircle: boltMin <= boltMax ? pcd : num(raw.boltCircle, 140)
  };

  return { shape, steps: ctx.steps, notes: ctx.notes, used };
}

function buildBracket(raw) {
  const R = getR();
  const ctx = createCtx();
  const L = clampWithNote(num(raw.length, 180), 60, 500, '底板长度', ctx);
  const W = clampWithNote(num(raw.width, 120), 50, 400, '底板宽度', ctx);
  const T = clampWithNote(num(raw.plateThickness, 10), 4, 40, '底板厚度', ctx);
  const H = clampWithNote(num(raw.uprightHeight, 160), T + 30, 500, '立板高度', ctx);
  const Tu = clampWithNote(num(raw.uprightThickness, 12), 4, Math.min(40, W / 2), '立板厚度', ctx);
  const holeDia = clampWithNote(num(raw.holeDia, 11), 3, 30, '安装孔径', ctx);
  const margin = clamp(num(raw.holeMargin, 20), holeDia / 2 + 2, Math.max(holeDia / 2 + 2, Math.min(L, W - Tu) / 2 - holeDia));
  const edgeFillet = clamp(num(raw.edgeFillet, 2), 0, Math.min(8, T / 2 - 0.5));
  const gussetOn = raw.gussetOn !== false;
  const gussetSize = clamp(num(raw.gussetSize, 40), 10, 140);
  const gussetThickness = clamp(num(raw.gussetThickness, 8), 3, 20);
  const leg = clamp(gussetSize, 10, Math.max(10, Math.min(H - T - 6, W - Tu - 8)));
  const thickness = clamp(gussetThickness, 3, Math.max(3, Math.min(20, L / 3)));

  let base = R.makeBox([0, 0, 0], [L, W, T]);
  ctx.ok('底板毛坯', `${fmt(L)} × ${fmt(W)} × ${fmt(T)}`);
  base = tryFillet(base, edgeFillet, edgeFilter('XY', T), '底板圆角', ctx);

  const upright = R.makeBox([0, W - Tu, 0], [L, W, H]);
  let shape = base.fuse(upright);
  ctx.ok('立板', `${fmt(H)} 高 × ${fmt(Tu)} 厚`);

  if (gussetOn) {
    if (leg >= 12 && thickness >= 3) {
      let gussets = 0;
      for (const x0 of [0, L - thickness]) {
        try {
          const triangle = R.draw([W - Tu, T])
            .lineTo([W - Tu - leg, T])
            .lineTo([W - Tu, T + leg])
            .close();
          const gusset = triangle.sketchOnPlane('YZ', [x0, 0, 0]).extrude(thickness);
          shape = shape.fuse(gusset);
          gussets += 1;
        } catch (error) {
          ctx.note('加强筋生成失败，已跳过');
        }
      }
      if (gussets === 2) ctx.ok('加强筋', `2 × ${fmt(leg)} × ${fmt(thickness)}`);
      else if (gussets === 0) ctx.skip('加强筋', '生成失败');
    } else {
      ctx.skip('加强筋', '尺寸不足');
    }
  } else {
    ctx.skip('加强筋', '未启用');
  }

  const frontDepth = W - Tu;
  const xs = L > margin * 2 + holeDia ? [margin, L - margin] : [L / 2];
  const ys = frontDepth > margin * 2 + holeDia ? [margin, frontDepth - margin] : [frontDepth / 2];
  const baseHoles = [];
  for (const x of xs) {
    for (const y of ys) {
      if (x > holeDia / 2 && x < L - holeDia / 2 && y > holeDia / 2 && y < frontDepth - holeDia / 2) {
        baseHoles.push(makeCylinder(holeDia / 2, T + 4, [x, y, -2], [0, 0, 1]));
      }
    }
  }
  if (baseHoles.length) {
    shape = cutWith(shape, baseHoles);
    ctx.ok('底板安装孔', `${baseHoles.length} × Ø${fmt(holeDia)}`);
  } else {
    ctx.skip('底板安装孔', '空间不足');
  }

  const wallHoleZ = Math.max(T + holeDia, H * 0.62);
  const wallHoles = [];
  if (wallHoleZ + holeDia / 2 < H - 4) {
    for (const x of [L / 2 - L / 4, L / 2 + L / 4]) {
      wallHoles.push(makeCylinder(holeDia / 2, Tu + 4, [x, W - Tu - 2, wallHoleZ], [0, 1, 0]));
    }
  }
  if (wallHoles.length) {
    shape = cutWith(shape, wallHoles);
    ctx.ok('立板通孔', `2 × Ø${fmt(holeDia)}`);
  } else {
    ctx.skip('立板通孔', '立板高度不足');
  }

  const used = {
    length: L,
    width: W,
    plateThickness: T,
    uprightHeight: H,
    uprightThickness: Tu,
    holeDia,
    holeMargin: margin,
    edgeFillet,
    gussetOn,
    gussetSize: leg,
    gussetThickness: thickness
  };

  return { shape, steps: ctx.steps, notes: ctx.notes, used };
}

function buildShaft(raw) {
  const R = getR();
  const ctx = createCtx();
  const segments = [
    {
      d: clampWithNote(num(raw.d1, 60), 10, 300, 'Ø1', ctx),
      l: clampWithNote(num(raw.l1, 50), 5, 400, 'L1', ctx)
    },
    {
      d: clampWithNote(num(raw.d2, 80), 10, 300, 'Ø2', ctx),
      l: clampWithNote(num(raw.l2, 90), 5, 400, 'L2', ctx)
    },
    {
      d: clampWithNote(num(raw.d3, 50), 10, 300, 'Ø3', ctx),
      l: clampWithNote(num(raw.l3, 60), 5, 400, 'L3', ctx)
    }
  ];
  const chamfer = clamp(num(raw.chamfer, 2), 0, 10);
  const shoulderFillet = clamp(num(raw.shoulderFillet, 2), 0, 10);
  const keywayOn = raw.keywayOn !== false;
  const centerHoleOn = raw.centerHoleOn !== false;

  let z = 0;
  let shape = null;
  for (const segment of segments) {
    const cylinder = makeCylinder(segment.d / 2, segment.l, [0, 0, z], [0, 0, 1]);
    shape = shape ? shape.fuse(cylinder) : cylinder;
    z += segment.l;
  }
  const total = z;
  ctx.ok('阶梯轴毛坯', `3 段 · 总长 ${fmt(total)}`);

  shape = tryChamfer(shape, chamfer, edgeFilter('XY', 0), '端部倒角', ctx, '起端');
  shape = tryChamfer(shape, chamfer, edgeFilter('XY', total), '端部倒角', ctx, '末端');

  if (shoulderFillet > 0) {
    for (const [idx, zPos] of [[1, segments[0].l], [2, segments[0].l + segments[1].l]]) {
      shape = tryFillet(shape, shoulderFillet, edgeFilter('XY', zPos), `肩部圆角 ${idx}`, ctx);
    }
  } else {
    ctx.skip('肩部圆角', '未启用');
  }

  const midStart = segments[0].l;
  const midLen = segments[1].l;
  const midDia = segments[1].d;
  const kw = clamp(num(raw.keywayWidth, 12), 2, Math.max(2, midDia / 2));
  const kd = clamp(num(raw.keywayDepth, 5), 1, Math.max(1, midDia / 2 - 2));
  const kl = clamp(num(raw.keywayLength, 50), 5, Math.max(5, midLen - 8));
  const chDia = clamp(num(raw.centerHoleDia, 8), 2, Math.max(2, Math.min(segments[0].d, segments[2].d) / 2 - 2));

  if (keywayOn) {
    if (kl >= 6 && kw > 1) {
      const z0 = midStart + (midLen - kl) / 2;
      const z1 = midStart + (midLen + kl) / 2;
      const cutter = R.makeBox([midDia / 2 - kd, -kw / 2, z0], [midDia / 2 + 2, kw / 2, z1]);
      shape = shape.cut(cutter);
      ctx.ok('键槽', `${fmt(kw)} × ${fmt(kd)} × ${fmt(kl)}`);
    } else {
      ctx.skip('键槽', '中间轴段过短');
    }
  } else {
    ctx.skip('键槽', '未启用');
  }

  if (centerHoleOn) {
    const depth = Math.min(14, segments[0].l - 2, segments[2].l - 2);
    if (depth > 1) {
      const holes = [
        makeCylinder(chDia / 2, depth + 1, [0, 0, -1], [0, 0, 1]),
        makeCylinder(chDia / 2, depth + 1, [0, 0, total - depth], [0, 0, 1])
      ];
      shape = cutWith(shape, holes);
      ctx.ok('中心孔', `2 × Ø${fmt(chDia)} × ${fmt(depth)}`);
    } else {
      ctx.skip('中心孔', '轴段过短');
    }
  } else {
    ctx.skip('中心孔', '未启用');
  }

  const used = {
    d1: segments[0].d,
    l1: segments[0].l,
    d2: segments[1].d,
    l2: segments[1].l,
    d3: segments[2].d,
    l3: segments[2].l,
    chamfer,
    shoulderFillet,
    keywayOn,
    keywayWidth: kw,
    keywayDepth: kd,
    keywayLength: kl,
    centerHoleOn,
    centerHoleDia: chDia
  };

  return { shape, steps: ctx.steps, notes: ctx.notes, used };
}

function buildTee(raw) {
  const ctx = createCtx();
  const OD = clampWithNote(num(raw.outerDia, 114), 20, 500, '外径', ctx);
  const wall = clampWithNote(num(raw.wall, 6), 1, Math.max(1, OD / 2 - 3), '壁厚', ctx);
  const runLength = clampWithNote(num(raw.runLength, 240), 60, 800, '主管长度', ctx);
  const branchLength = clampWithNote(num(raw.branchLength, 140), 30, 500, '支管长度', ctx);
  const collarOn = raw.collarOn !== false;
  const collarHeight = clamp(num(raw.collarHeight, 10), 2, 60);
  const outerRadius = OD / 2;
  const innerRadius = outerRadius - wall;

  const run = makeCylinder(outerRadius, runLength, [-runLength / 2, 0, 0], [1, 0, 0]);
  ctx.ok('主管毛坯', `Ø${fmt(OD)} × ${fmt(runLength)}`);
  const branch = makeCylinder(outerRadius, branchLength, [0, 0, 0], [0, 0, 1]);
  ctx.ok('支管毛坯', `Ø${fmt(OD)} × ${fmt(branchLength)}`);

  let shape = run.fuse(branch);
  if (collarOn && collarHeight > 2) {
    const collar = makeCylinder(outerRadius * 1.16, collarHeight, [0, 0, -collarHeight / 2], [0, 0, 1]);
    shape = shape.fuse(collar);
    ctx.ok('加强环', `Ø${fmt(OD * 1.16)} × ${fmt(collarHeight)}`);
  } else {
    ctx.skip('加强环', '未启用');
  }

  const runBore = makeCylinder(innerRadius, runLength + 2, [-runLength / 2 - 1, 0, 0], [1, 0, 0]);
  shape = shape.cut(runBore);
  ctx.ok('主管内腔', `Ø${fmt(innerRadius * 2)}`);

  const branchBore = makeCylinder(innerRadius, branchLength + 1, [0, 0, 0], [0, 0, 1]);
  shape = shape.cut(branchBore);
  ctx.ok('支管内腔', `Ø${fmt(innerRadius * 2)}`);

  const used = {
    outerDia: OD,
    wall,
    runLength,
    branchLength,
    collarOn,
    collarHeight
  };

  return { shape, steps: ctx.steps, notes: ctx.notes, used };
}

const BOLT_OPTIONS = [4, 6, 8, 10, 12, 16, 20];

export const TEMPLATES = [
  {
    id: 'flange',
    name: '法兰盘',
    en: 'FLANGE',
    tagline: '管道连接件 · 回转体',
    icon: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="7"/><circle cx="24" cy="10.5" r="2.3"/><circle cx="35.7" cy="17.2" r="2.3"/><circle cx="35.7" cy="30.8" r="2.3"/><circle cx="24" cy="37.5" r="2.3"/><circle cx="12.3" cy="30.8" r="2.3"/><circle cx="12.3" cy="17.2" r="2.3"/></svg>`,
    groups: [
      {
        title: '主体尺寸',
        fields: [
          numberField('outerDia', '外径 OD', 180, 40, 600, 1),
          numberField('thickness', '盘厚 T', 18, 6, 60, 0.5),
          numberField('boreDia', '中心孔 Ø', 80, 6, 380, 1)
        ]
      },
      {
        title: '螺栓孔系',
        fields: [
          numberField('boltCircle', '分布圆 PCD', 140, 20, 580, 1),
          numberField('boltDia', '孔径 Ø', 18, 3, 40, 0.5),
          selectField('boltCount', '孔数', 8, BOLT_OPTIONS)
        ]
      },
      {
        title: '轮毂与工艺',
        fields: [
          toggleField('hubOn', '轮毂凸台', true),
          numberField('hubDia', '轮毂外径', 110, 20, 600, 1),
          numberField('hubHeight', '轮毂高度', 16, 0, 120, 1),
          numberField('edgeFillet', '外缘圆角 R', 3, 0, 12, 0.5)
        ]
      }
    ],
    build: buildFlange
  },
  {
    id: 'bracket',
    name: 'L 形支座',
    en: 'L-BRACKET',
    tagline: '焊接支架 · 安装座',
    icon: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 40V12h11v22h17v6z"/><circle cx="16" cy="36" r="1.8"/><circle cx="31" cy="36" r="1.8"/><circle cx="31" cy="20" r="1.8"/><path d="M24 40 24 26 33 40"/></svg>`,
    groups: [
      {
        title: '底板',
        fields: [
          numberField('length', '长度 L', 180, 60, 500, 1),
          numberField('width', '宽度 W', 120, 50, 400, 1),
          numberField('plateThickness', '厚度 T', 10, 4, 40, 0.5)
        ]
      },
      {
        title: '立板',
        fields: [
          numberField('uprightHeight', '高度 H', 160, 40, 500, 1),
          numberField('uprightThickness', '厚度 Tu', 12, 4, 40, 0.5)
        ]
      },
      {
        title: '孔系',
        fields: [
          numberField('holeDia', '孔径 Ø', 11, 3, 30, 0.5),
          numberField('holeMargin', '边距', 20, 5, 80, 1)
        ]
      },
      {
        title: '加强筋与工艺',
        fields: [
          toggleField('gussetOn', '三角加强筋', true),
          numberField('gussetSize', '筋腿长', 40, 10, 140, 1),
          numberField('gussetThickness', '筋厚', 8, 3, 20, 0.5),
          numberField('edgeFillet', '底板圆角 R', 2, 0, 8, 0.5)
        ]
      }
    ],
    build: buildBracket
  },
  {
    id: 'shaft',
    name: '阶梯轴',
    en: 'STEPPED SHAFT',
    tagline: '传动件 · 轴类零件',
    icon: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 19h9v10H5zM14 15h12v18H14zM26 20h17v8H26z"/><path d="M20 10h4v3h-4zM9 33h4v3H9z"/><circle cx="20" cy="14" r="1.4"/></svg>`,
    groups: [
      {
        title: '轴段尺寸',
        fields: [
          numberField('d1', '起端直径 Ø1', 60, 10, 300, 1),
          numberField('l1', '起端长度 L1', 50, 5, 400, 1),
          numberField('d2', '中段直径 Ø2', 80, 10, 300, 1),
          numberField('l2', '中段长度 L2', 90, 5, 400, 1),
          numberField('d3', '末端直径 Ø3', 50, 10, 300, 1),
          numberField('l3', '末端长度 L3', 60, 5, 400, 1)
        ]
      },
      {
        title: '特征与工艺',
        fields: [
          numberField('chamfer', '端部倒角 C', 2, 0, 10, 0.5),
          numberField('shoulderFillet', '肩部圆角 R', 2, 0, 10, 0.5),
          toggleField('keywayOn', '中段键槽', true),
          numberField('keywayWidth', '键槽宽', 12, 2, 60, 1),
          numberField('keywayDepth', '键槽深', 5, 1, 30, 0.5),
          numberField('keywayLength', '键槽长', 50, 5, 300, 1),
          toggleField('centerHoleOn', '两端中心孔', true),
          numberField('centerHoleDia', '中心孔 Ø', 8, 2, 40, 0.5)
        ]
      }
    ],
    build: buildShaft
  },
  {
    id: 'tee',
    name: '等径三通',
    en: 'PIPE TEE',
    tagline: '管路管件 · 承压壳体',
    icon: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 19h38v10H5zM19 10h10v28H19z"/><path d="M9 24h8M31 24h8M24 14v6M24 28v6"/><path d="M16 19v10M32 19v10"/></svg>`,
    groups: [
      {
        title: '管件尺寸',
        fields: [
          numberField('outerDia', '外径 Ø', 114, 20, 500, 1),
          numberField('wall', '壁厚', 6, 1, 40, 0.5),
          numberField('runLength', '主管长度', 240, 60, 800, 5),
          numberField('branchLength', '支管长度', 140, 30, 500, 5)
        ]
      },
      {
        title: '结构与工艺',
        fields: [
          toggleField('collarOn', '支管加强环', true),
          numberField('collarHeight', '加强环高', 10, 2, 60, 1)
        ]
      }
    ],
    build: buildTee
  }
];

export const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map(template => [template.id, template]));

export function defaultParams(templateId) {
  const template = TEMPLATE_MAP[templateId];
  if (!template) return {};
  const params = {};
  for (const group of template.groups) {
    for (const field of group.fields) params[field.key] = field.value;
  }
  return params;
}

export function buildPart(templateId, params) {
  const template = TEMPLATE_MAP[templateId];
  if (!template) throw new Error('未知零件模板');
  const merged = { ...defaultParams(templateId), ...(params || {}) };
  const result = template.build(merged);
  if (!result.shape) throw new Error('几何内核未返回实体');
  return {
    ...result,
    template,
    params: merged,
    used: result.used || merged
  };
}
