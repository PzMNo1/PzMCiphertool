/**
 * PzMAgentool 电路生成器
 * 把 Agentmaster 下发的结构化电路描述转换为 CircuitJS(Falstad) 原生网表。
 * 纯函数，无 DOM 依赖，可在浏览器与 Node 中直接调用。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PzmaCircuitBuilder = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var ROW_Y = 224;
  var COMP_W = 64;
  var COMP_GAP = 112;
  var START_X = 96;
  var RAIL_GAP = 32;
  var RAIL_OFFSET = 48;
  var HEADER = '$ 1 5.0E-6 10.0 50 5.0 50';

  var TYPES = {
    dc_source: { tag: 'v', source: true, default: 5, kind: 'voltage' },
    ac_source: { tag: 'v', source: true, wave: 1, default: 5, kind: 'voltage' },
    square_source: { tag: 'v', source: true, wave: 2, default: 5, kind: 'voltage' },
    triangle_source: { tag: 'v', source: true, wave: 3, default: 5, kind: 'voltage' },
    sawtooth_source: { tag: 'v', source: true, wave: 4, default: 5, kind: 'voltage' },
    resistor: { tag: 'r', default: 1000, kind: 'resistance' },
    capacitor: { tag: 'c', default: 1e-6, kind: 'capacitance' },
    inductor: { tag: 'l', default: 1e-3, kind: 'inductance' },
    diode: { tag: 'd', polar: true, default: 0, kind: 'none' },
    led: { tag: '162', polar: true, default: 0, kind: 'none' },
    switch: { tag: '159', default: 0, kind: 'none' },
    current_source: { tag: 'i', default: 0.01, kind: 'current' },
    wire: { tag: 'w', default: 0, kind: 'none' },
    ground: { tag: 'g', ground: true, default: 0, kind: 'none' }
  };

  var TYPE_ALIASES = {
    dc: 'dc_source', v: 'dc_source', voltage: 'dc_source', battery: 'dc_source', vcc: 'dc_source',
    dc_voltage: 'dc_source', voltage_source: 'dc_source', dcsource: 'dc_source', vsource: 'dc_source',
    dcvoltagesource: 'dc_source', dc_source_2: 'dc_source',
    ac: 'ac_source', sine: 'ac_source', sine_source: 'ac_source', ac_voltage: 'ac_source', ac_source_2: 'ac_source',
    acsource: 'ac_source', acvoltagesource: 'ac_source', sinewave: 'ac_source', sine_wave: 'ac_source',
    square: 'square_source', squarewave: 'square_source', square_wave: 'square_source',
    triangle: 'triangle_source', triangle_wave: 'triangle_source', trianglewave: 'triangle_source', triwave: 'triangle_source',
    sawtooth: 'sawtooth_source', saw: 'sawtooth_source', sawtoothwave: 'sawtooth_source', saw_wave: 'sawtooth_source',
    r: 'resistor', res: 'resistor', resistance: 'resistor', resistors: 'resistor',
    c: 'capacitor', cap: 'capacitor', capacitors: 'capacitor',
    l: 'inductor', ind: 'inductor', coil: 'inductor', inductors: 'inductor',
    d: 'diode', diodes: 'diode',
    led: 'led', light_emitting_diode: 'led', lamp: 'led', leds: 'led',
    sw: 'switch', switch_spst: 'switch', breaker: 'switch', switches: 'switch',
    i: 'current_source', current: 'current_source', isource: 'current_source', csource: 'current_source', currentsource: 'current_source',
    g: 'ground', gnd: 'ground', earth: 'ground', vss: 'ground',
    w: 'wire', line: 'wire', jumper: 'wire'
  };

  var NET_KEYS = ['from', 'to', 'a', 'b', 'p', 'n', 'positive', 'negative', 'anode', 'cathode', 'net'];

  function pick(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] !== undefined && obj[keys[i]] !== null && obj[keys[i]] !== '') return obj[keys[i]];
    }
    return undefined;
  }

  function normalizeType(raw) {
    var type = String(raw == null ? '' : raw).trim().toLowerCase();
    if (!type) return '';
    if (TYPES[type]) return type;
    return TYPE_ALIASES[type] || type;
  }

  function parseValue(raw, fallback) {
    if (raw === undefined || raw === null || raw === '') return fallback;
    if (typeof raw === 'number') return isFinite(raw) ? raw : fallback;
    var text = String(raw).trim().replace(/\s+/g, '');
    if (!text) return fallback;
    var fraction = text.match(/^(\d+(?:\.\d+)?)\s*([kKmM])\s*(\d+)$/);
    if (fraction) {
      var base = parseFloat(fraction[1] + '.' + fraction[3]);
      var mult = fraction[2] === 'k' || fraction[2] === 'K' ? 1e3 : fraction[2] === 'm' ? 1e-3 : 1e6;
      return base * mult;
    }
    var match = text.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([a-zA-ZµμΩ]*)$/);
    if (!match) {
      match = text.match(/([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([a-zA-ZµμΩ]*)/);
    }
    if (!match) return fallback;
    var number = parseFloat(match[1]);
    if (!isFinite(number)) return fallback;
    var suffix = match[2] || '';
    if (!suffix) return number;
    if (/^(meg|mega)/i.test(suffix)) return number * 1e6;
    if (/^(mil)/i.test(suffix)) return number * 25.4e-6;
    var unit = suffix.charAt(0);
    var scale = {
      p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6,
      m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12
    };
    if (scale[unit] === undefined) return number;
    return number * scale[unit];
  }

  function parseFrequencyFromText(raw) {
    var match = String(raw == null ? '' : raw).match(/([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(k|K|M|m)?\s*Hz/i);
    if (!match) return null;
    var value = parseFloat(match[1]);
    if (!isFinite(value)) return null;
    var unit = match[2] || '';
    var scale = unit === 'k' || unit === 'K' ? 1e3 : unit === 'M' ? 1e6 : unit === 'm' ? 1e-3 : 1;
    return value * scale;
  }

  function numberText(value, fallback) {
    var n = typeof value === 'number' ? value : parseFloat(value);
    if (!isFinite(n)) n = fallback;
    if (n !== 0 && Math.abs(n) < 1e-12) return n.toExponential(6);
    if (n !== 0 && Math.abs(n) >= 1e12) return n.toExponential(6);
    return String(n);
  }

  function uniqueSorted(values) {
    var seen = Object.create(null);
    var result = [];
    values.slice().sort(function (a, b) { return a - b; }).forEach(function (value) {
      var key = String(value);
      if (seen[key]) return;
      seen[key] = true;
      result.push(value);
    });
    return result;
  }

  function componentName(comp, index, type) {
    var raw = comp && (comp.name || comp.id || comp.label);
    if (raw !== undefined && String(raw).trim()) return String(raw).trim();
    var prefix = {
      resistor: 'R', capacitor: 'C', inductor: 'L', dc_source: 'V', ac_source: 'V',
      square_source: 'V', triangle_source: 'V', sawtooth_source: 'V', diode: 'D',
      led: 'D', switch: 'SW', current_source: 'I', wire: 'W', ground: 'GND'
    }[type] || 'X';
    return prefix + (index + 1);
  }

  function normalizeSpec(spec) {
    if (!spec || typeof spec !== 'object') throw new Error('电路描述为空，请提供 {title, components}');
    var list = Array.isArray(spec) ? spec : (spec.components || spec.elements || spec.parts);
    if (!Array.isArray(list) || !list.length) throw new Error('电路至少需要 1 个元件（components）');
    return {
      title: String((Array.isArray(spec) ? '' : spec.title) || spec.name || 'Agentmaster 电路').trim().slice(0, 80),
      components: list
    };
  }

  function normalizeComponent(raw, index) {
    if (!raw || typeof raw !== 'object') throw new Error('第 ' + (index + 1) + ' 个元件格式无效');
    var type = normalizeType(pick(raw, ['type', 'kind', 'element', 'elm']));
    if (!type) throw new Error('第 ' + (index + 1) + ' 个元件缺少 type');
    var def = TYPES[type];
    if (!def) throw new Error('不支持的元件类型 "' + type + '"，可用类型：' + Object.keys(TYPES).join(', '));
    var name = componentName(raw, index, type);
    if (def.ground) {
      var net = pick(raw, ['from', 'net', 'to', 'a', 'b', 'name']);
      if (!net) throw new Error(name + '（ground）缺少 net/from');
      return { type: type, name: name, from: String(net).trim(), to: null, closed: true };
    }
    var from = pick(raw, ['from', 'positive', 'anode', 'a', 'p']);
    var to = pick(raw, ['to', 'negative', 'cathode', 'b', 'n']);
    if ((from === undefined || to === undefined) && Array.isArray(raw.nets)) {
      from = raw.nets[0]; to = raw.nets[1];
    }
    if (from === undefined || from === null || String(from).trim() === '') throw new Error(name + ' 缺少 from 网络');
    if (to === undefined || to === null || String(to).trim() === '') throw new Error(name + ' 缺少 to 网络');
    from = String(from).trim();
    to = String(to).trim();
    if (from === to) throw new Error(name + ' 的 from 与 to 是同一个网络 "' + from + '"，会短路');
    var valueRaw = pick(raw, ['value', 'resistance', 'ohms', 'capacitance', 'inductance', 'voltage', 'current', 'amps', 'amplitude']);
    var frequencyRaw = pick(raw, ['frequency', 'freq', 'hz']);
    var frequency = parseValue(frequencyRaw, null);
    if (frequency === null && def.wave !== undefined && valueRaw !== undefined) {
      frequency = parseFrequencyFromText(valueRaw);
    }
    if (frequency === null) frequency = 1000;
    var voltageRaw = valueRaw;
    if (def.wave !== undefined && typeof valueRaw === 'string') {
      var stripped = valueRaw.replace(/([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(k|K|M|m)?\s*Hz/i, '').trim();
      voltageRaw = stripped || def.default;
    }
    var value = parseValue(voltageRaw, def.default);
    if (valueRaw !== undefined && parseValue(voltageRaw, null) === null) {
      throw new Error(name + ' 的数值 "' + valueRaw + '" 无法解析（可用 1k / 4.7k / 100nF / 5V / 5V 1kHz）');
    }
    if (['resistor', 'capacitor', 'inductor'].indexOf(type) >= 0 && value <= 0) {
      throw new Error(name + ' 的数值必须大于 0');
    }
    var closed = raw.closed !== false && raw.state !== 'open';
    return {
      type: type, name: name, from: from, to: to, value: value,
      frequency: frequency, closed: closed, networkCount: 2
    };
  }

  function chooseGroundNet(nets, components, warnings) {
    var explicit = components.filter(function (c) { return c.type === 'ground'; })[0];
    if (explicit) return explicit.from;
    var named = nets.filter(function (n) { return /^(gnd|ground|vss|0|地|接地)$/i.test(n); })[0];
    if (named) { warnings.push('未声明接地元件，已自动将 "' + named + '" 接地'); return named; }
    var source = components.filter(function (c) { return TYPES[c.type].source; })[0];
    if (source && source.to) { warnings.push('未声明接地元件，已自动将电源负极 "' + source.to + '" 接地'); return source.to; }
    var counts = Object.create(null);
    components.forEach(function (c) {
      if (c.from) counts[c.from] = (counts[c.from] || 0) + 1;
      if (c.to) counts[c.to] = (counts[c.to] || 0) + 1;
    });
    var best = nets[0];
    nets.forEach(function (net) { if ((counts[net] || 0) > (counts[best] || 0)) best = net; });
    warnings.push('未声明接地元件，已自动将 "' + best + '" 接地');
    return best;
  }

  function componentParams(comp, warnings) {
    var def = TYPES[comp.type];
    if (def.source) {
      var wave = def.wave === undefined ? 0 : def.wave;
      return '0 ' + wave + ' ' + numberText(comp.frequency, 1000) + ' ' + numberText(comp.value, def.default) + ' 0';
    }
    if (comp.type === 'resistor') return '0 ' + numberText(comp.value, def.default);
    if (comp.type === 'capacitor') return '0 ' + numberText(comp.value, def.default) + ' 0';
    if (comp.type === 'inductor') return '0 ' + numberText(comp.value, def.default) + ' 0';
    if (comp.type === 'diode') return '0';
    if (comp.type === 'led') return '2 default 1 1 0 0';
    if (comp.type === 'switch') {
      if (!comp.closed) warnings.push(comp.name + ' 当前为断开状态');
      return (comp.closed ? '1' : '0') + ' 20 10000000000 2.5';
    }
    if (comp.type === 'current_source') return '0 ' + numberText(comp.value, def.default);
    return '0';
  }

  function branchLayout(components, groundNet, warnings) {
    var sources = components.filter(function (c) { return TYPES[c.type].source; });
    if (sources.length !== 1) return null;
    var source = sources[0];
    if (source.to !== groundNet) return null;
    var branches = components.filter(function (c) { return c !== source; });
    if (branches.length < 2) return null;
    var edges = Object.create(null);
    branches.forEach(function (comp) {
      if (!edges[comp.from]) edges[comp.from] = [];
      if (!edges[comp.to]) edges[comp.to] = [];
      edges[comp.from].push({ comp: comp, next: comp.to });
      edges[comp.to].push({ comp: comp, next: comp.from });
    });
    var paths = [];
    function dfs(net, visited, path) {
      if (paths.length >= 12) return;
      if (net === groundNet) { paths.push(path.slice()); return; }
      var list = edges[net] || [];
      for (var i = 0; i < list.length; i++) {
        var edge = list[i];
        var edgeId = branches.indexOf(edge.comp);
        if (visited[edgeId]) continue;
        visited[edgeId] = true;
        path.push({ comp: edge.comp, topNet: net, bottomNet: edge.next });
        dfs(edge.next, visited, path);
        path.pop();
        visited[edgeId] = false;
      }
    }
    dfs(source.from, Object.create(null), []);
    if (paths.length < 2) return null;
    var counts = Object.create(null);
    paths.forEach(function (path) {
      path.forEach(function (step) { counts[branches.indexOf(step.comp)] = (counts[branches.indexOf(step.comp)] || 0) + 1; });
    });
    for (var b = 0; b < branches.length; b++) {
      if (counts[b] !== 1) return null;
    }
    var maxLength = paths.reduce(function (max, path) { return Math.max(max, path.length); }, 0);
    if (maxLength > 5) return null;

    var TOP_RAIL = 80;
    var COL_GAP = 144;
    var COMP_H = 64;
    var STEP = 112;
    var bottomRailY = TOP_RAIL + maxLength * STEP + 80;
    var sourceX = 64;
    var body = [];
    var meta = [];
    var topTaps = [sourceX];
    var bottomTaps = [sourceX];

    var sourceTopY = TOP_RAIL + 48;
    var sourceBottomY = sourceTopY + COMP_H;
    body.push(TYPES[source.type].tag + ' ' + sourceX + ' ' + sourceTopY + ' ' + sourceX + ' ' + sourceBottomY + ' ' + componentParams(source, warnings));
    meta.push({ name: source.name, type: source.type, from: source.from, to: source.to, value: source.value, index: body.length - 1 });
    body.push('w ' + sourceX + ' ' + TOP_RAIL + ' ' + sourceX + ' ' + sourceTopY + ' 0');
    body.push('w ' + sourceX + ' ' + sourceBottomY + ' ' + sourceX + ' ' + bottomRailY + ' 0');

    paths.forEach(function (path, index) {
      var x = 160 + index * COL_GAP;
      var y = TOP_RAIL + 48;
      topTaps.push(x);
      bottomTaps.push(x);
      var prevY = TOP_RAIL;
      path.forEach(function (step) {
        var comp = step.comp;
        var def = TYPES[comp.type];
        var topY = y;
        var bottomY = y + COMP_H;
        var line;
        if (def.polar) {
          if (step.topNet === comp.from) {
            line = def.tag + ' ' + x + ' ' + bottomY + ' ' + x + ' ' + topY + ' ' + componentParams(comp, warnings);
          } else {
            line = def.tag + ' ' + x + ' ' + topY + ' ' + x + ' ' + bottomY + ' ' + componentParams(comp, warnings);
          }
        } else {
          line = def.tag + ' ' + x + ' ' + topY + ' ' + x + ' ' + bottomY + ' ' + componentParams(comp, warnings);
        }
        body.push(line);
        meta.push({ name: comp.name, type: comp.type, from: comp.from, to: comp.to, value: comp.value, index: body.length - 1 });
        body.push('w ' + x + ' ' + prevY + ' ' + x + ' ' + topY + ' 0');
        prevY = bottomY;
        y = bottomY + 48;
      });
      body.push('w ' + x + ' ' + prevY + ' ' + x + ' ' + bottomRailY + ' 0');
    });

    var groundX = 160 + paths.length * COL_GAP;
    bottomTaps.push(groundX);
    function railSegments(taps, y) {
      var values = uniqueSorted(taps);
      var points = [values[0] - 32].concat(values).concat([values[values.length - 1] + 32]);
      for (var i = 0; i < points.length - 1; i++) {
        body.push('w ' + points[i] + ' ' + y + ' ' + points[i + 1] + ' ' + y + ' 0');
      }
    }
    railSegments(topTaps, TOP_RAIL);
    railSegments(bottomTaps, bottomRailY);
    body.push('g ' + groundX + ' ' + bottomRailY + ' ' + groundX + ' ' + (bottomRailY + 32) + ' 0');

    return {
      body: body,
      meta: meta,
      bounds: { maxX: groundX + 48, maxY: bottomRailY + 48, busCount: null }
    };
  }

  function findUnpowered(components, groundNet) {
    var sources = components.filter(function (comp) { return TYPES[comp.type].source; });
    var others = components.filter(function (comp) { return !TYPES[comp.type].source; });
    if (!others.length) return [];
    var sourceNets = sources.map(function (comp) { return comp.from; });
    function reachable(adjacency, roots) {
      var seen = Object.create(null);
      var queue = roots.slice();
      while (queue.length) {
        var net = queue.shift();
        if (net === undefined || seen[net]) continue;
        seen[net] = true;
        (adjacency[net] || []).forEach(function (next) {
          if (!seen[next]) queue.push(next);
        });
      }
      return seen;
    }
    return others.filter(function (candidate) {
      var adjacency = Object.create(null);
      others.forEach(function (comp) {
        if (comp === candidate) return;
        if (!adjacency[comp.from]) adjacency[comp.from] = [];
        if (!adjacency[comp.to]) adjacency[comp.to] = [];
        adjacency[comp.from].push(comp.to);
        adjacency[comp.to].push(comp.from);
      });
      var fromSource = reachable(adjacency, sourceNets);
      var fromGround = reachable(adjacency, [groundNet]);
      var forward = fromSource[candidate.from] && fromGround[candidate.to];
      var backward = fromSource[candidate.to] && fromGround[candidate.from];
      return !forward && !backward;
    });
  }

  function build(spec, options) {
    options = options || {};
    var normalized = normalizeSpec(spec);
    var warnings = [];
    var components = normalized.components.map(normalizeComponent);
    var activeComponents = components.filter(function (c) { return c.type !== 'ground'; });
    if (!activeComponents.length) throw new Error('电路至少需要 1 个非接地元件');

    var nets = [];
    var netIndex = Object.create(null);
    function useNet(net) {
      if (net === null || net === undefined || net === '') return;
      if (netIndex[net] === undefined) {
        netIndex[net] = nets.length;
        nets.push(net);
      }
    }
    activeComponents.forEach(function (c) { useNet(c.from); useNet(c.to); });
    var groundNet = chooseGroundNet(nets, activeComponents, warnings);
    useNet(groundNet);

    var disconnected = findUnpowered(activeComponents, groundNet);
    if (disconnected.length) {
      warnings.push('以下元件未形成电源到地的通路，仿真中可能无电流：' + disconnected.map(function (c) { return c.name; }).join('、'));
    }

    var branched = branchLayout(activeComponents, groundNet, warnings);
    if (branched) {
      return {
        ok: true,
        title: normalized.title,
        netlist: [HEADER].concat(branched.body).join('\n') + '\n',
        componentCount: activeComponents.length,
        netCount: nets.length,
        nets: nets,
        groundNet: groundNet,
        components: branched.meta,
        warnings: warnings,
        bounds: Object.assign({ busCount: nets.length }, branched.bounds),
        raw: options.raw === true
      };
    }

    var otherNets = nets.filter(function (net) { return net !== groundNet; });
    var topNets = [];
    var bottomNets = [];
    otherNets.forEach(function (net, index) {
      if (index % 2 === 0 && topNets.length < 5) topNets.push(net);
      else bottomNets.push(net);
    });
    bottomNets.push(groundNet);

    var railY = Object.create(null);
    topNets.forEach(function (net, index) {
      railY[net] = ROW_Y - RAIL_OFFSET - index * RAIL_GAP;
    });
    bottomNets.forEach(function (net, index) {
      railY[net] = ROW_Y + RAIL_OFFSET + index * RAIL_GAP;
    });

    var taps = Object.create(null);
    nets.forEach(function (net) { taps[net] = []; });

    var body = [];
    var meta = [];
    var lastRightX = START_X;

    activeComponents.forEach(function (comp, index) {
      var def = TYPES[comp.type];
      var leftX = START_X + index * COMP_GAP;
      var rightX = leftX + COMP_W;
      lastRightX = Math.max(lastRightX, rightX);
      var leftNet = def.polar ? comp.to : comp.from;
      var rightNet = def.polar ? comp.from : comp.to;
      var params = componentParams(comp, warnings);
      body.push(def.tag + ' ' + leftX + ' ' + ROW_Y + ' ' + rightX + ' ' + ROW_Y + ' ' + params);
      meta.push({
        name: comp.name,
        type: comp.type,
        from: comp.from,
        to: comp.to,
        value: comp.value,
        index: body.length - 1
      });
      body.push('w ' + leftX + ' ' + ROW_Y + ' ' + leftX + ' ' + railY[leftNet] + ' 0');
      body.push('w ' + rightX + ' ' + ROW_Y + ' ' + rightX + ' ' + railY[rightNet] + ' 0');
      taps[leftNet].push(leftX);
      taps[rightNet].push(rightX);
    });

    var groundX = lastRightX + 32;
    taps[groundNet].push(groundX);
    nets.forEach(function (net) {
      var values = uniqueSorted(taps[net] || []);
      var y = railY[net];
      if (!values.length) return;
      var points = [values[0] - 32].concat(values).concat([values[values.length - 1] + 32]);
      for (var i = 0; i < points.length - 1; i++) {
        body.push('w ' + points[i] + ' ' + y + ' ' + points[i + 1] + ' ' + y + ' 0');
      }
    });

    var groundY = railY[groundNet];
    body.push('g ' + groundX + ' ' + groundY + ' ' + groundX + ' ' + (groundY + 32) + ' 0');

    return {
      ok: true,
      title: normalized.title,
      netlist: [HEADER].concat(body).join('\n') + '\n',
      componentCount: activeComponents.length,
      netCount: nets.length,
      nets: nets,
      groundNet: groundNet,
      components: meta,
      warnings: warnings,
      bounds: { maxX: groundX + 48, maxY: Math.max(groundY + 48, ROW_Y + 96), busCount: nets.length },
      raw: options.raw === true
    };
  }

  return {
    build: build,
    parseValue: parseValue,
    normalizeType: normalizeType,
    types: Object.keys(TYPES),
    aliases: TYPE_ALIASES
  };
});
