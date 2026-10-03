/* =============================================================================
 * 10_analyze_cards.js — 分析区全部卡片
 *
 * 一个文件装下分析区所有卡片，按五组排列：
 *   1. 提取与索引   批量索引器 / 提示词指纹库 / 枚举解析 / 信息审计
 *   2. 中文谜题     谜格机器 / 拼音工具箱 / 汉字属性速查
 *   3. 古典密码破译 XOR / 频数分析 / Kasiski / 维吉尼亚自动破解
 *   4. 万能自动解码 多层编码递归搜索 + 尝试树
 *   5. 图像处理     旋转翻转 / 通道 / 位平面 / LSB / 网格遮罩
 *
 * 卡片通过全局 registerCard() / param() / setResult() 工作，
 * 这三个函数和刷新调度都在 999_funtion.js 里（加密实验室的作用函数）。
 * 用到的数据表内联在对应区段，不单独开表文件。
 * ========================================================================== */
(function () {
  'use strict';

  /** 分析区所有卡片都挂在这个子模块下 */
  const SECTION = 'fenxiqu';

  /* ==========================================================================
   * 1. 提取与索引：批量索引器 / 提示词指纹库 / 枚举解析 / 信息审计
   * ======================================================================== */




    // 工具函数

    const splitLines = text => String(text || '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const splitItems = text => String(text || '')
      .split(/[\n,;\t]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const hasCJK = s => /[\u4e00-\u9fff]/.test(s);

    function hanziInfo(ch) {
      return (window.ZhongwenSearch && window.ZhongwenSearch.charInfo(ch)) || null;
    }

    /** 取第 n 个字符（oneBased 为 true 时从 1 开始；负数表示从末尾倒数） */
    function nthChar(str, n, oneBased = true) {
      const chars = [...String(str)];
      let idx = oneBased ? n - 1 : n;
      if (idx < 0) idx = chars.length + idx;
      if (!Number.isInteger(idx)) return { ch: '', ok: false, why: '索引不是整数' };
      if (idx < 0 || idx >= chars.length) return { ch: '', ok: false, why: `越界（长度 ${chars.length}）` };
      return { ch: chars[idx], ok: true, why: '' };
    }

    function letterSum(s) {
      return [...String(s).toUpperCase()].reduce((acc, c) => {
        const v = c.charCodeAt(0) - 64;
        return acc + (v >= 1 && v <= 26 ? v : 0);
      }, 0);
    }

    function pinyinKey(s) {
      return [...String(s)].map(c => {
        const info = hanziInfo(c);
        return info ? info.plain : c.toLowerCase();
      }).join('');
    }

    function makeComparator(key) {
      switch (key) {
        case 'alpha': return (a, b) => a.localeCompare(b, 'zh');
        case 'alphaDesc': return (a, b) => b.localeCompare(a, 'zh');
        case 'len': return (a, b) => a.length - b.length;
        case 'lenDesc': return (a, b) => b.length - a.length;
        case 'last': return (a, b) => ([...a].pop() || '').localeCompare([...b].pop() || '', 'zh');
        case 'sum': return (a, b) => letterSum(a) - letterSum(b);
        case 'pinyin': return (a, b) => pinyinKey(a).localeCompare(pinyinKey(b));
        default: return null;
      }
    }

    // 卡片 1：批量索引器 + 排序重排器

    const INDEXER_HTML = `
      <div class="grid-2">
        <input type="text" id="anIndices"
          placeholder="索引数字，如 2 3 1（留空则用取字规则）" autocomplete="off">
        <select id="anIndexBase">
          <option value="1">索引从 1 开始</option>
          <option value="0">索引从 0 开始</option>
        </select>
      </div>
      <div class="grid-2">
        <select id="anIndexMode">
          <option value="nth">按索引数字取字</option>
          <option value="first">取首字母</option>
          <option value="last">取末字母</option>
          <option value="middle">取中间字母</option>
          <option value="diagonal">对角化（1,2,3…）</option>
          <option value="all">列出每个条目的所有字母</option>
        </select>
        <select id="anSortKey">
          <option value="none">不排序（保持原顺序）</option>
          <option value="alpha">按字母序</option>
          <option value="alphaDesc">按字母倒序</option>
          <option value="len">按长度</option>
          <option value="lenDesc">按长度倒序</option>
          <option value="last">按末字母</option>
          <option value="sum">按字母序号之和</option>
          <option value="pinyin">按汉字拼音</option>
        </select>
      </div>
      <div class="result" id="anIndexerResult"></div>
    `;

    /**
     * 计算索引与重排结果。
     * @returns {{extracted:string, lines:string[], problems:string[]}|null}
     */
    function computeIndexer() {
      const items = splitLines(mainInput());
      if (!items.length) return null;

      const mode = param('anIndexMode', 'nth');
      const sortKey = param('anSortKey', 'none');
      const base = param('anIndexBase', '1') !== '0';
      // 逗号也是分隔符：'2,3,1' 必须能解析出三个索引
      const indices = (param('anIndices', '').match(/-?\d+/g) || []).map(Number);

      const comparator = makeComparator(sortKey);
      const ordered = comparator ? items.slice().sort(comparator) : items.slice();

      const lines = [];
      const problems = [];
      let extracted = '';

      if (sortKey !== 'none') {
        lines.push(`已按「${sortKey}」重排：`);
        ordered.forEach((w, i) => lines.push(`  ${String(i + 1).padStart(2, ' ')}. ${w}`));
        lines.push('');
      }

      if (mode === 'all') {
        ordered.forEach((w, i) => lines.push(`  ${String(i + 1).padStart(2, ' ')}. ${w}   →   ${[...w].join(' ')}`));
        return { extracted: '', lines, problems };
      }

      if (mode === 'nth') {
        if (!indices.length) {
          lines.push('请在「索引数字」框里填数字，例如 1 2 3。');
          return { extracted: '', lines, problems };
        }
        ordered.forEach((word, i) => {
          const n = indices[i % indices.length];
          const r = nthChar(word, n, base);
          if (r.ok) extracted += r.ch;
          else problems.push(`${word} 第 ${n} 位${r.why}`);
        });
      } else {
        ordered.forEach((word, i) => {
          const chars = [...word];
          let n;
          if (mode === 'first') n = base ? 1 : 0;
          else if (mode === 'last') n = base ? chars.length : chars.length - 1;
          else if (mode === 'middle') n = base ? Math.ceil(chars.length / 2) : Math.floor((chars.length - 1) / 2);
          else n = base ? i + 1 : i;
          const r = nthChar(word, n, base);
          if (r.ok) extracted += r.ch;
          else problems.push(`${word} 第 ${n} 位${r.why}`);
        });
      }

      lines.push(extracted || '(无)');
      problems.forEach(p => lines.push(p));

      return { extracted, lines, problems };
    }

    registerCard({
      id: 'analyzeIndexer',
      badge: '批量索引器 + 排序重排器',
      section: SECTION,
      needsMainInput: true,
      html: INDEXER_HTML,
      resultId: 'anIndexerResult',
      listens: ['anIndices', 'anIndexMode', 'anSortKey', 'anIndexBase'],
      compute() {
        const r = computeIndexer();
        setResult('anIndexerResult', r ? r.lines.join('\n') : '');
      }
    });

    // 卡片 2：提示词指纹库

    /** 提示词套路表：题面里出现这些说法，往往指向对应的提取手法 */
    const FLAVOR_HINTS = [
      { keys: ['both ways', 'two ways', 'either way', '两个方向', '正反', '来回'], tip: '倒序 / 回文：反过来读，或正反各读一遍。', tech: 'Reversal / Palindrome' },
      { keys: ['between the lines', 'read between', '字里行间', '行间'], tip: '读行间：取每行之间的内容，或隔行读。', tech: 'Reading between lines' },
      { keys: ['in the middle', 'the middle', 'center', 'centre', '中间', '当中', '中心'], tip: '中心取字：取每个词的中间字母，或取网格正中心。', tech: 'Centralization' },
      { keys: ['in the beginning', 'first', 'start', '开头', '首先', '最初'], tip: '取首字母（Initialization）。', tech: 'Initialization' },
      { keys: ['at the end', 'last', 'final', '末尾', '最后'], tip: '取末字母（Terminalization）。', tech: 'Terminalization' },
      { keys: ['count on', 'count', 'counting', 'how many', 'number of', '数一数', '计数', '多少'], tip: '计数提取：数字母数、笔画数、音节数当索引。', tech: 'Counting' },
      { keys: ['backwards', 'reverse', 'opposite', '倒着', '反着', '相反'], tip: '倒序读取。', tech: 'Reordering' },
      { keys: ['read aloud', 'say it', 'aloud', 'out loud', 'pronounce', '念出来', '读出来', '谐音'], tip: '谐音提取：读出来找同音/近音字。', tech: 'Homophone' },
      { keys: ['hidden', 'concealed', 'secret', 'invisible', '隐藏', '藏', '暗含'], tip: '藏头 / 藏尾 / 藏中。', tech: 'Acrostic' },
      { keys: ['sort', 'order', 'arrange', 'rearrange', '排序', '次序', '排列'], tip: '先重排再读：按长度 / 字母序 / 拼音排序后取字。', tech: 'Reordering' },
      { keys: ['alphabetical', 'alphabet', '字母顺序'], tip: '按字母序重排后读取。', tech: 'Alphabetical sort' },
      { keys: ['around', 'circle', 'ring', 'circular', '一圈', '环绕', '圆形'], tip: '环形读取：按圆周 / 时钟方向取字。', tech: 'Circular reading' },
      { keys: ['clock', 'time', 'hour', 'minute', '时钟', '时间', '小时', '分钟'], tip: '时钟方位：数字当钟点，两个一组读出字母。', tech: 'Clock positions' },
      { keys: ['every other', 'alternate', 'alternating', '隔一个', '交替', '相间'], tip: '隔位读取：奇偶位分开常出两条信息。', tech: 'Skip reading' },
      { keys: ['colour', 'color', 'shade', 'hue', '颜色', '色彩'], tip: '按颜色读取：同色字归组再取字。', tech: 'Read by colour' },
      { keys: ['twice', 'double', 'again', 'two times', '两次', '重复'], tip: '重复读取：同一段读两遍，第二遍可能换方向。', tech: 'Repetition' },
      { keys: ['odd one out', 'outlier', "doesn't belong", '与众不同', '异类', '格格不入'], tip: '找异类：不同的那个元素本身就是答案或索引。', tech: 'Odd one out' },
      { keys: ['unused', 'leftover', 'remaining', '剩下的', '剩余', '没用上'], tip: '剩余信息：划掉已用元素，剩下的就是提取对象。', tech: 'Extraneous letters' },
      { keys: ['once', 'exactly one', 'only one', '只出现一次', '唯一'], tip: '特征字母：只出现一次（或恰好 k 次）的字母。', tech: 'Eigenletters' },
      { keys: ['between', 'in between', '之间', '介于'], tip: '取两个已知元素之间的内容。', tech: 'Between' },
      { keys: ['inside', 'within', 'contains', '里面', '包含'], tip: '嵌套提取：外层与内层分开处理。', tech: 'Nested' },
      { keys: ['diagonal', 'diagonally', '斜', '对角'], tip: '对角读取，常见于方阵。', tech: 'Diagonalization' },
      { keys: ['spiral', 'spirally', '螺旋'], tip: '螺旋读取：从外向内或从内向外。', tech: 'Spiral reading' },
      { keys: ['mirror', 'reflection', 'reflect', '镜像', '反射', '对称'], tip: '镜像处理：左右 / 上下翻转后再读。', tech: 'Mirror' },
      { keys: ['upside down', 'inverted', 'flip', '倒过来', '颠倒'], tip: '旋转 180° 或上下翻转后读。', tech: 'Rotation' },
      { keys: ['one by one', 'in turn', 'in order', '依次', '逐个', '按顺序'], tip: '按给定顺序逐个处理，顺序本身就是密钥。', tech: 'Sequential' },
      { keys: ['key', 'keyword', 'cipher', '密钥', '关键词'], tip: '题面里那个「多余」的词往往是密钥。', tech: 'Keyword' },
      { keys: ['music', 'note', 'sound', 'tune', '音乐', '音符', '旋律'], tip: '音符读取：音名 A-G 直接就是字母。', tech: 'Music notes' },
      { keys: ['number', 'digit', '数字'], tip: '数字当索引：逐个取对应位置的字母。', tech: 'Indexing' },
      { keys: ['letter', 'character', '字母', '字符'], tip: '数清元素数量，再看是否与字母表对应。', tech: 'A1Z26' },
      { keys: ['draw', 'picture', 'image', 'figure', '画', '图', '图形'], tip: '把数据当坐标画出来，图形本身就是信息。', tech: 'Plotting' },
      { keys: ['grid', 'square', 'table', '网格', '方阵', '表格'], tip: '铺成方阵：行列 / 对角 / 螺旋读取都值得试。', tech: 'Grid reading' },
      { keys: ['missing', 'absent', 'gone', '缺少', '缺失', '不见了'], tip: '找缺失项：补全 1..n，缺的那个就是答案。', tech: 'Missing element' },
      { keys: ['pair', 'two by two', 'couple', '成对', '两两'], tip: '两两一组，每组取一个信息。', tech: 'Pairing' },
      { keys: ['above', 'below', 'top', 'bottom', '上面', '下面'], tip: '上下位置当索引。', tech: 'Position as index' },
      { keys: ['left', 'right', '左边', '右边'], tip: '左右位置当索引，或左右两部分分别读取。', tech: 'Position as index' }
    ];

    /** @returns {{hits:Array, lines:string[]}} */
    function computeFlavor() {
      const t = mainInput();
      if (!t || !t.trim()) return { hits: [], lines: [] };
      const lower = t.toLowerCase();
      const hits = FLAVOR_HINTS.filter(h => h.keys.some(k => lower.includes(k.toLowerCase())));
      const lines = [];
      if (!hits.length) return { hits, lines: ['没有匹配到已知的提示词套路。'] };
      hits.forEach(h => lines.push(h.tech));
      return { hits, lines };
    }

    registerCard({
      id: 'analyzeFlavor',
      badge: '提示词指纹库 flavourtext',
      section: SECTION,
      needsMainInput: true,
      html: `
        <div class="result" id="anFlavorResult"></div>
      `,
      resultId: 'anFlavorResult',
      listens: [],
      compute() {
        const r = computeFlavor();
        setResult('anFlavorResult', r ? r.lines.join('\n') : '');
      }
    });

    // 卡片 3：枚举解析 + 答案自检

    const ENUM_HTML = `
      <div class="grid-2">
        <input type="text" id="anEnumSpec" placeholder="枚举写法，例如 (3 6 2 4) 或 (5)" autocomplete="off">
        <input type="text" id="anEnumAnswer" placeholder="待校验的答案" autocomplete="off">
      </div>
      <div class="result" id="anEnumResult"></div>
    `;

    /** 解析枚举写法，容忍多种标点习惯 */
    function parseEnumeration(spec) {
      const s = String(spec || '').trim();
      if (!s) return null;
      const inner = s.replace(/^[（(]\s*/, '').replace(/\s*[）)]$/, '');
      const nums = (inner.match(/\d+/g) || []).map(Number);
      if (!nums.length) return null;
      return {
        parts: nums,
        total: nums.reduce((a, b) => a + b, 0),
        punctuation: (inner.match(/[^\d\s]+/g) || []),
        raw: s
      };
    }

    /** 规范化：去首尾空格、统一小写、去标点；keepSpaces 保留词间空格 */
    function normalize(s, keepSpaces) {
      let out = String(s || '').trim().toLowerCase();
      out = keepSpaces ? out.replace(/\s+/g, ' ') : out.replace(/\s+/g, '');
      return out.replace(/[^\w\u4e00-\u9fff\s]/g, '');
    }

    /**
     * 解析枚举并校验答案。
     * @returns {{parsed:Object, ok:boolean|null, lines:string[]}|null}
     */
    function computeEnum() {
      const parsed = parseEnumeration(param('anEnumSpec'));
      if (!parsed) return null;
      const answer = param('anEnumAnswer');
      const isCJK = hasCJK(answer);
      const unit = isCJK ? '汉字' : '字母';

      const lines = [];
      lines.push(`枚举：${parsed.raw}`);
      lines.push(`  ${parsed.parts.length} 段，长度 ${parsed.parts.join(' / ')}，合计 ${parsed.total} 个${unit}`);
      lines.push(parsed.parts.join(' '));

      if (!answer.trim()) return { parsed, ok: null, lines };

      const norm = normalize(answer, false);
      const words = normalize(answer, true).split(' ').filter(Boolean);
      const lenOk = norm.length === parsed.total;
      const partsOk = words.length === parsed.parts.length &&
        words.every((w, i) => [...w].length === parsed.parts[i]);
      const partialOk = isCJK && norm.length > 0 && parsed.total % norm.length === 0;

      let ok;
      if ((lenOk && parsed.parts.length === 1) || partsOk) {
        ok = true;
        lines.push('✅ 长度完全符合枚举');
      } else if (lenOk) {
        ok = false;
        lines.push('⚠ 逐词切分对不上');
      } else if (partialOk) {
        ok = null;
        lines.push('⚠ 长度是枚举总长的约数');
      } else {
        ok = false;
        lines.push(`❌ 长度不符：${norm.length} ≠ ${parsed.total}`);
      }

      return { parsed, ok, lines };
    }

    registerCard({
      id: 'analyzeEnum',
      badge: '枚举解析 + 答案自检',
      section: SECTION,
      needsMainInput: false,
      html: ENUM_HTML,
      resultId: 'anEnumResult',
      listens: ['anEnumSpec', 'anEnumAnswer'],
      compute() {
        const r = computeEnum();
        setResult('anEnumResult', r ? r.lines.join('\n') : '');
      }
    });

    // 卡片 4：信息审计

    const AUDIT_HTML = `
      <div class="grid-2">
        <input type="text" id="anAuditUsed" placeholder="已经用过的列号，例如 1,2" autocomplete="off">
      </div>
      <div class="result" id="anAuditResult"></div>
    `;

    /** @returns {{cols:Array, unused:number[], lines:string[]}|null} */
    function computeAudit() {
      const raw = mainInput();
      if (!raw.trim()) return null;
      const rows = splitLines(raw).map(line => line.split(/\s*[|,，\t]\s*/));
      if (!rows.length) return null;

      const colCount = Math.max(...rows.map(r => r.length));
      const used = new Set(splitItems(param('anAuditUsed')).map(Number).filter(Number.isFinite));
      const cols = [];
      const lines = [`${rows.length} 行 ${colCount} 列`];

      for (let c = 0; c < colCount; c++) {
        const vals = rows.map(r => (r[c] || '').trim()).filter(Boolean);
        const unique = new Set(vals);
        const numeric = vals.length > 0 && vals.every(v => /^-?\d+$/.test(v));
        const col = { index: c + 1, used: used.has(c + 1), values: vals, unique: unique.size, numeric };
        cols.push(col);
        lines.push(`列 ${c + 1} ${col.used ? '已用' : '未用'}  ${unique.size} 种 / ${vals.length} 个` +
          (numeric ? '  全为数字' : '') +
          (unique.size === vals.length ? '  取值互不相同' : ''));
        lines.push(vals.slice(0, 8).join(' ') + (vals.length > 8 ? ' …' : ''));
      }

      const unused = cols.filter(c => !c.used).map(c => c.index);
      if (unused.length) lines.push(`未用列：${unused.join(' ')}`);

      return { cols, unused, lines };
    }

    registerCard({
      id: 'analyzeAudit',
      badge: '信息审计 · 哪一列还没用上',
      section: SECTION,
      needsMainInput: true,
      html: AUDIT_HTML,
      resultId: 'anAuditResult',
      listens: ['anAuditUsed'],
      compute() {
        const r = computeAudit();
        setResult('anAuditResult', r ? r.lines.join('\n') : '');
      }
    });

    // 对外暴露计算函数，方便以后接回输出区或给别的模块调用

    window.AnalyzeTools = {
      computeIndexer,
      computeFlavor,
      computeEnum,
      computeAudit,
      parseEnumeration,
      nthChar,
      splitLines,
      splitItems
    };

  /* ==========================================================================
   * 2. 中文谜题：谜格机器 / 拼音工具箱 / 汉字属性速查
   * ======================================================================== */




    const CJK = /[\u4e00-\u9fff]/;
    const isCJK = ch => CJK.test(ch);



    /** 声调数字：1 阴平 2 阳平 3 上声 4 去声 0 轻声 */
    const TONE_MARKS = {
      'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
      'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
      'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
      'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
      'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
      'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4
    };

    function toneOf(py) {
      for (const ch of String(py || '')) if (TONE_MARKS[ch]) return TONE_MARKS[ch];
      return 0;
    }

    /**
     * 去声调。首选词汇区引擎的 stripTone（它加载得更早，字表也归它管）；
     * 兜底用 Unicode 分解：带调拼音拆成「基字母 + 组合记号」后只留基字母，
     * 不用再抄一张 25 行的映射表。
     * 注意 ǖǘǚǜ 分解出来是 u + 分音符 + 声调记号，丢记号会得到 u，
     * 而拼音里 ü 记作 v（lü → lv），所以这四个单独指定。
     */
    const U_UMLAUT = { 'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v' };
    const STRIP_FALLBACK = [...Object.keys(TONE_MARKS), 'ń', 'ň', 'ǹ', 'ḿ', 'ü']
      .reduce((map, mark) => Object.assign(map, {
        [mark]: U_UMLAUT[mark] || mark.normalize('NFD')[0] || mark
      }), {});

    const stripTone = py => (window.ZhongwenSearch && window.ZhongwenSearch.stripTone)
      ? window.ZhongwenSearch.stripTone(py)
      : [...String(py || '')].map(c => STRIP_FALLBACK[c] || c).join('');

    /** 声母表（按长度降序匹配，zh/ch/sh 必须先于 z/c/s） */
    const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
      'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];

    /** 把一个音节的无声调拼音切成声母 + 韵母 */
    function splitSyllable(plain) {
      const s = String(plain || '').toLowerCase().replace(/ü/g, 'v');
      for (const ini of INITIALS) {
        if (s.startsWith(ini)) return { initial: ini, final: s.slice(ini.length) };
      }
      return { initial: '', final: s };
    }

    // 卡片 1：谜格机器

    /**
     * 灯谜「谜格」：每一种格都是一条机械可逆的加工规则。
     * 这里实现的是流传最广、规则最明确的一批。
     * each: { id, name, desc, apply(answer) => string }
     */
    const MI_GE = [
      {
        id: 'qiuqian', name: '秋千格',
        desc: '谜底限两字，读时倒过来。如「日本」→「本日」',
        apply: a => [...a].length === 2 ? [...a].reverse().join('') : `（秋千格要求两字，当前 ${[...a].length} 字）`
      },
      {
        id: 'juanlian', name: '卷帘格',
        desc: '谜底三字以上，整体倒读。如「珍禽异兽」→「兽异禽珍」',
        apply: a => [...a].reverse().join('')
      },
      {
        id: 'lihua', name: '梨花格',
        desc: '谜底全用谐音字代替（同音不同字），需借助拼音还原',
        apply: a => harmonic(a)
      },
      {
        id: 'baitou', name: '白头格',
        desc: '谜底首字读谐音（白 = 头上第一个字变白/变音）',
        apply: a => swapAt(a, 0, harmonic)
      },
      {
        id: 'fendi', name: '粉底格',
        desc: '谜底末字读谐音（粉 = 底下最后一个字）',
        apply: a => swapAt(a, [...a].length - 1, harmonic)
      },
      {
        id: 'sujie', name: '素心格',
        desc: '谜底中间的字读谐音（也叫玉带格，谜底需为奇数个字）',
        apply: a => {
          const chars = [...a];
          if (chars.length % 2 === 0) return `（素心格要求奇数个字，当前 ${chars.length} 字）`;
          return swapAt(a, Math.floor(chars.length / 2), harmonic);
        }
      },
      {
        id: 'xufei', name: '徐妃格',
        desc: '谜底各字去掉相同偏旁部首后再读（徐妃半面妆）',
        apply: a => stripSameRadical(a)
      },
      {
        id: 'qiuhuang', name: '求凰格',
        desc: '谜面对称配字，谜底需与谜面成对偶（凤凰相求），常带「配、双、对、会」等字',
        apply: a => `配对提示：与谜面「${a}」构成对偶的词都可能是谜底\n  方向参考：天↔地 大↔小 上↔下 来↔去 有↔无 新↔旧 春↔秋 南↔北`
      },
      {
        id: 'yaodui', name: '遥对格',
        desc: '与求凰格类似，谜面谜底遥相对偶，谜底往往加一个衬字',
        apply: a => `对偶提示：给谜面「${a}」找工整的对仗词，再按需增删一个衬字\n  常见衬字：双、对、配、比、偶、会`
      },
      {
        id: 'lizhu', name: '骊珠格',
        desc: '谜底 = 谜目 + 谜底，即答案里要连类目一起读出（探骊得珠）',
        apply: a => `骊珠格：答案格式为「类目·正文」\n  例：谜面「吾」→「成语·一家之言」\n  请把答案拆成「类目 + 正文」两部分来念`
      },
      {
        id: 'zhiqiu', name: '只履格',
        desc: '谜底末字只取一半（足字旁去掉一只鞋）',
        apply: a => {
          const chars = [...a];
          if (!chars.length) return '';
          return chars.slice(0, -1).join('') + ` + 「${chars[chars.length - 1]}」的一半`;
        }
      },
      {
        id: 'tuoluo', name: '脱帽格',
        desc: '谜底首字去掉（脱帽），只读后面的字',
        apply: a => [...a].slice(1).join('')
      },
      {
        id: 'tuoxue', name: '脱靴格',
        desc: '谜底末字去掉（脱靴），只读前面的字',
        apply: a => [...a].slice(0, -1).join('')
      },
      {
        id: 'jieying', name: '解缨格',
        desc: '谜底去掉首尾各一字后读中间部分',
        apply: a => [...a].slice(1, -1).join('')
      },
      {
        id: 'shuangguo', name: '双钩格',
        desc: '谜底四字，前后两字分别对调（1↔2、3↔4）',
        apply: a => {
          const c = [...a];
          if (c.length !== 4) return `（双钩格要求四字，当前 ${c.length} 字）`;
          return c[1] + c[0] + c[3] + c[2];
        }
      },
      {
        id: 'chuihua', name: '垂花格',
        desc: '谜底前两字与后两字分别倒读',
        apply: a => {
          const c = [...a];
          if (c.length % 2) return `（垂花格要求偶数个字，当前 ${c.length} 字）`;
          let out = '';
          for (let i = 0; i < c.length; i += 2) out += c[i + 1] + c[i];
          return out;
        }
      },
      {
        id: 'yanshou', name: '延寿格',
        desc: '谜底末字重复一次（增寿）',
        apply: a => {
          const c = [...a];
          return c.length ? a + c[c.length - 1] : '';
        }
      },
      {
        id: 'shenguan', name: '升冠格',
        desc: '谜底首字重复一次（升冠）',
        apply: a => {
          const c = [...a];
          return c.length ? c[0] + a : '';
        }
      },
      {
        id: 'louding', name: '漏顶格',
        desc: '谜底首字漏掉一部分笔画，只取其残形（需人工判断）',
        apply: a => `漏顶格：把首字「${[...a][0] || ''}」去掉顶部笔画后取残形\n  常见做法：去掉「亠、宀、艹」等顶部部件`
      },
      {
        id: 'duanqiao', name: '断桥格',
        desc: '谜底中间断开成两段分别读（如 AB|CD → 读作两截）',
        apply: a => {
          const c = [...a];
          if (c.length < 2) return a;
          const mid = Math.ceil(c.length / 2);
          return c.slice(0, mid).join('') + ' ｜ ' + c.slice(mid).join('');
        }
      }
    ];

    /** 谐音提示：列出每个字去掉声调后的读音，提示可用同音字替换 */
    function harmonic(word) {
      const parts = [...String(word)].map(ch => {
        const info = hanziInfo(ch);
        if (!info) return `${ch}(?)`;
        return `${ch}(${info.plain})`;
      });
      return `谐音提示：${parts.join(' ')}\n  即把上面的读音换成同音字，例如「画眉」→「话梅」`;
    }

    /** 只对第 idx 个字套用某个变换 */
    function swapAt(word, idx, fn) {
      const chars = [...String(word)];
      if (idx < 0 || idx >= chars.length) return word;
      const target = chars[idx];
      const replacement = fn(target);
      chars[idx] = replacement;
      return chars.join('');
    }

    /** 去掉所有字共有的偏旁（字表里没有部首信息，给出读音供人工判断） */
    function stripSameRadical(word) {
      const chars = [...String(word)];
      const infos = chars.map(ch => hanziInfo(ch));
      if (infos.every(Boolean)) {
        return `徐妃格：去掉各字共有的偏旁后成新字\n  当前谜底：${chars.join(' ')}\n  逐字读音：${infos.map((i, n) => `${chars[n]}(${i.plain})`).join(' ')}`;
      }
      const unknown = chars.filter((ch, i) => !infos[i]);
      return `徐妃格：去掉各字共有的偏旁\n  当前谜底：${chars.join(' ')}\n  （字表未收录：${unknown.join(' ')}，请联系上下文人工判断）`;
    }

    const MIGE_HTML = `
      <div class="grid-2">
        <select id="migeSelect">
          ${MI_GE.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
        </select>
      </div>
      <div class="result" id="migeResult"></div>
    `;

    /** @returns {{grid:Object, raw:string, result:string, lines:string[]}|null} */
    function computeMige() {
      const raw = mainInput();
      if (!raw || !raw.trim()) return null;
      const id = param('migeSelect', 'qiugian');
      const grid = MI_GE.find(g => g.id === id) || MI_GE[0];
      const result = grid.apply(raw.trim());
      return {
        grid, raw, result,
        lines: [
          `谜格：${grid.name}`,
          `规则：${grid.desc}`,
          `谜底：${raw.trim()}`,
          '',
          `结果：${result}`
        ]
      };
    }

    registerCard({
      id: 'puzzleMige',
      badge: '谜格机器 灯谜',
      section: SECTION,
      needsMainInput: true,
      html: MIGE_HTML,
      resultId: 'migeResult',
      listens: ['migeSelect'],
      compute() {
        const r = computeMige();
        setResult('migeResult', r ? r.lines.join('\n') : '');
      }
    });

    // 卡片 2：拼音工具箱

    const PINYIN_HTML = `
      <div class="grid-2">
        <select id="pyMode">
          <option value="all">全拼（带声调）</option>
          <option value="plain">全拼（无声调）</option>
          <option value="initial">声母</option>
          <option value="final">韵母</option>
          <option value="tone">声调数字</option>
          <option value="abbr">首字母缩写</option>
          <option value="homophone">谐音候选（同声母韵母）</option>
          <option value="reverse">反查：按拼音找字</option>
        </select>
      </div>
      <div class="result" id="pyResult"></div>
    `;

    /** 读音拆分结果：每个字一条 */
    function analyzePinyin(text) {
      return [...String(text || '')].map(ch => {
        if (!isCJK(ch)) return { char: ch, cjk: false };
        const info = hanziInfo(ch);
        if (!info) return { char: ch, cjk: true, known: false };
        const { initial, final } = splitSyllable(info.plain);
        return {
          char: ch, cjk: true, known: true,
          pinyin: info.pinyin,
          plain: info.plain,
          initial, final,
          tone: toneOf(info.pinyin)
        };
      });
    }

    /**
     * 字表索引，懒建一次。字表是懒加载的，第一次进来可能还没就绪，
     * 所以建出来是空的话下次再建一遍，避免「第一次查询永远查不到」。
     * charMap：音节 → 同音字。字表是逐字表，一个字就一条音节。
     */
    let _hanziIndex = null;
    function hanziIndex() {
      if (_hanziIndex && _hanziIndex.size) return _hanziIndex;
      const list = (window.ZhongwenSearch && window.ZhongwenSearch.hanziEntries) || [];
      if (!list.length) return _hanziIndex || new Map();
      _hanziIndex = new Map();
      list.forEach(([ch, py]) => {
        const key = stripTone(py).toLowerCase();
        if (!_hanziIndex.has(key)) _hanziIndex.set(key, []);
        _hanziIndex.get(key).push(ch);
      });
      return _hanziIndex;
    }

    /**
     * 在字表里反查拼音，单音节加前缀（zhong → 中/众/重…）。
     * 字表只到「字」这一级，没有词级读音，所以 zhōngguó 这种多音节写法
     * 是拆成音节分别查的，查不到时由卡片提示改用词语/成语条件。
     */
    function lookupByPinyin(query) {
      const q = stripTone(String(query || '').toLowerCase()).replace(/\s+/g, '');
      if (!q) return [];
      const out = [];
      const seen = new Set();
      hanziIndex().forEach((chars, plain) => {
        if (plain !== q && !plain.startsWith(q)) return;
        chars.forEach(ch => { if (!seen.has(ch)) { seen.add(ch); out.push(ch); } });
      });
      return out;
    }

    /** 找同音字（字表范围内，按音节严格相同） */
    function homophonesOf(ch) {
      const info = hanziInfo(ch);
      if (!info) return [];
      const chars = hanziIndex().get(info.plain);
      return chars ? chars.filter(c => c !== ch) : [];
    }

    /** @returns {{lines:string[], abbr:string}|null} */
    function computePinyin() {
      const text = mainInput();
      if (!text || !text.trim()) return null;
      const mode = param('pyMode', 'all');
      const parts = analyzePinyin(text.trim());
      const lines = [];

      if (mode === 'reverse') {
        const hits = lookupByPinyin(text);
        lines.push(`按拼音「${text.trim()}」反查：${hits.length ? hits.join(' ') : '（字表内没有匹配）'}`);
        if (hits.length) {
          lines.push(hits.map(ch => `${ch}=${(hanziInfo(ch) || {}).pinyin}`).join('  '));
          if (hits.length > 120) lines.push(`（共 ${hits.length} 个，只列了前 120 个，把拼音写完整能收窄）`);
        } else {
          lines.push('');
          lines.push('字表只到「字」这一级：一个音节对应一批同音字，前缀也能查（如 zhong）。');
          lines.push('要按拼音找词或成语，去词汇区用 py=zhongguo。');
        }
        return { lines, abbr: '' };
      }

      if (mode === 'homophone') {
        lines.push('谐音候选（同音节同调）：');
        parts.forEach(p => {
          if (!p.cjk) return;
          if (!p.known) { lines.push(`  ${p.char}  (字表未收录)`); return; }
          const same = homophonesOf(p.char);
          lines.push(`  ${p.char}(${p.pinyin}) → ${same.length ? same.slice(0, 60).join(' ') + (same.length > 60 ? ' …' : '') : '（无同音字在表内）'}`);
        });
        return { lines, abbr: '' };
      }

      const values = parts.map(p => {
        if (!p.cjk) return p.char == null ? '' : p.char;
        if (!p.known) return '?';
        switch (mode) {
          case 'plain': return p.plain;
          case 'initial': return p.initial || '(零声母)';
          case 'final': return p.final;
          case 'tone': return String(p.tone);
          case 'abbr': return p.plain[0] || '';
          default: return p.pinyin;
        }
      });

      const abbr = parts.map(p => (p.known ? (p.plain[0] || '') : '')).join('');
      const joined = mode === 'tone' ? values.join('') : values.join(' ');

      lines.push(`输入：${text.trim()}`);
      lines.push(`结果：${joined}`);
      if (mode !== 'abbr') lines.push(`首字母缩写：${abbr}`);
      lines.push('');
      lines.push('逐字明细：');
      parts.forEach(p => {
        if (!p.cjk) { lines.push(`  ${p.char}  —`); return; }
        if (!p.known) { lines.push(`  ${p.char}  (字表未收录)`); return; }
        lines.push(`  ${p.char}  ${p.pinyin}  声母 ${p.initial || '∅'}  韵母 ${p.final}  ${p.tone}声`);
      });
      return { lines, abbr };
    }

    registerCard({
      id: 'puzzlePinyin',
      badge: '拼音工具箱 声韵调',
      section: SECTION,
      needsMainInput: true,
      html: PINYIN_HTML,
      resultId: 'pyResult',
      listens: ['pyMode'],
      compute() {
        const r = computePinyin();
        setResult('pyResult', r ? r.lines.join('\n') : '');
      }
    });

    // 卡片 3：汉字属性速查（读音 / 声调）

    const HANZI_ATTR_HTML = `
      <div class="grid-2">
        <select id="hzAttrMode">
          <option value="attrs">查字的读音与声调</option>
          <option value="tone">按声调找字</option>
        </select>
      </div>
      <div class="result" id="hzAttrResult"></div>
    `;

    /** @returns {{lines:string[]}|null} */
    function computeHanziAttr() {
      const value = mainInput();
      if (!value || !value.trim()) return null;
      const mode = param('hzAttrMode', 'attrs');
      const v = value.trim();
      const lines = [];
      const table = (window.ZhongwenSearch && window.ZhongwenSearch.hanziEntries) || [];
      if (!table.length) return { lines: ['字表还没加载完，稍等一下再试。'] };

      if (mode === 'attrs') {
        const known = [...v].filter(ch => isCJK(ch) && hanziInfo(ch));
        const total = [...v].filter(isCJK).length;
        lines.push(`字表共 ${table.length} 字，本次输入命中 ${known.length}/${total}`);
        lines.push('');
        [...v].forEach(ch => {
          if (!isCJK(ch)) { lines.push(`  ${ch}  —`); return; }
          const info = hanziInfo(ch);
          if (!info) { lines.push(`  ${ch}  (字表未收录)`); return; }
          const { initial, final } = splitSyllable(info.plain);
          lines.push(`  ${ch}  ${info.pinyin}  声母 ${initial || '∅'}  韵母 ${final}  ${toneOf(info.pinyin)}声`);
        });
        return { lines };
      }

      // tone
      const t = parseInt(v, 10);
      if (![1, 2, 3, 4, 0].includes(t)) { lines.push('声调请填 1 / 2 / 3 / 4（0 表示轻声）'); return { lines }; }
      const hits = [];
      table.forEach(([ch, py]) => { if (toneOf(py) === t) hits.push(ch); });
      lines.push(`${t} 声的字（字表内 ${hits.length} 个）：`);
      lines.push('  ' + (hits.slice(0, 120).join(' ') || '（无）') + (hits.length > 120 ? ' …' : ''));
      return { lines };
    }

    registerCard({
      id: 'puzzleHanziAttr',
      badge: '汉字属性速查 读音声调',
      section: SECTION,
      needsMainInput: true,
      html: HANZI_ATTR_HTML,
      resultId: 'hzAttrResult',
      listens: ['hzAttrMode'],
      compute() {
        const r = computeHanziAttr();
        setResult('hzAttrResult', r ? r.lines.join('\n') : '');
      }
    });

    // 对外暴露

    window.PuzzleTools = {
      MI_GE,
      computeMige,
      computePinyin,
      computeHanziAttr,
      analyzePinyin,
      lookupByPinyin,
      homophonesOf,
      splitSyllable,
      toneOf,
      stripTone
    };

  /* ==========================================================================
   * 3. 古典密码破译：XOR / 频数分析 / Kasiski / 维吉尼亚自动破解
   * ======================================================================== */




    /**
     * 破译工具配置。
     * verbose：是否在破解过程中往控制台打提示（例如密钥周期折叠）。
     *   分析区卡片不设输出区，控制台是使用者唯一能看到过程信息的地方，
     *   所以默认打开；批量调用或跑测试时可以关掉，避免刷屏。
     */
    const CryptoAttacksConfig = { verbose: true };

    // 通用工具

    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    /** 英文字母频率（百分比），用于打分与卡方检验 */
    const EN_FREQ = {
      A: 8.167, B: 1.492, C: 2.782, D: 4.253, E: 12.702, F: 2.228, G: 2.015,
      H: 6.094, I: 6.966, J: 0.153, K: 0.772, L: 4.025, M: 2.406, N: 6.749,
      O: 7.507, P: 1.929, Q: 0.095, R: 5.987, S: 6.327, T: 9.056, U: 2.758,
      V: 0.978, W: 2.360, X: 0.150, Y: 1.974, Z: 0.074
    };
    /** 英文常见双字母组，用于打分加权 */
    const EN_BIGRAMS = ['TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ON', 'AT', 'EN', 'ND',
      'TI', 'ES', 'OR', 'TE', 'OF', 'ED', 'IS', 'IT', 'AL', 'AR', 'ST', 'TO', 'NT', 'NG', 'SE', 'HA', 'AS', 'OU', 'IO', 'LE', 'VE', 'CO', 'ME', 'DE', 'HI', 'RI', 'RO', 'IC', 'NE', 'EA', 'RA', 'CE', 'LI', 'CH', 'LL', 'BE', 'MA', 'SI', 'OM', 'UR'];

    const lettersOnly = s => String(s || '').toUpperCase().replace(/[^A-Z]/g, '');
    const bytesFrom = s => [...String(s || '')].map(c => c.charCodeAt(0) & 0xff);

    /** 把输入解析成字节：支持 16 进制、十进制、原始文本 */
    function toBytes(input, mode) {
      const raw = String(input || '').trim();
      if (!raw) return [];
      if (mode === 'hex') {
        const hex = raw.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
        const out = [];
        for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
        return out;
      }
      if (mode === 'dec') {
        return (raw.match(/\d{1,3}/g) || []).map(Number).filter(n => n >= 0 && n <= 255);
      }
      return bytesFrom(raw);
    }

    const printableRatio = bytes => {
      if (!bytes.length) return 0;
      let ok = 0;
      for (const b of bytes) if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) ok++;
      return ok / bytes.length;
    };

    /**
     * 给一段字节打「像英文」的分。
     * 之前用「卡方 + 双字母组」打分，实测会把错误的密钥排在正确密钥前面 ——
     * 因为卡方只约束整体分布，短文本上区分度不够。
     * 现在改成对数似然：逐字符累加权重（字母频率 + 高频双字母组 + 空格 + 惩罚不可打印），
     * 这是单字节 XOR 破解的标准做法，也是能真正把明文顶到第一名的最小改动。
     */
    const GOOD_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?\'"-:;\n\r\t';

    function scoreEnglish(bytes) {
      if (!bytes.length) return -1e9;
      const text = bytes.map(b => String.fromCharCode(b)).join('');
      let score = 0;

      // 1) 逐字符
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const up = ch.toUpperCase();
        if (ch === ' ') score += 5;
        else if (/[a-zA-Z]/.test(ch)) score += (EN_FREQ[up] || 0.1) + 1;
        else if (/[0-9]/.test(ch)) score += 0.5;
        else if (GOOD_CHARS.includes(ch)) score += 0.3;
        else score -= 12;                 // 不可打印 / 控制字符：重罚
      }

      // 2) 高频双字母组：命中一次给一笔明显的奖励
      const up = text.toUpperCase();
      for (let i = 0; i + 1 < up.length; i++) {
        const bg = up.substr(i, 2);
        if (EN_BIGRAMS.includes(bg)) score += 8;
      }

      // 3) 常见三字母组
      for (const tg of EN_TRIGRAMS) {
        let idx = up.indexOf(tg);
        while (idx !== -1) { score += 12; idx = up.indexOf(tg, idx + 1); }
      }

      return score;
    }

    /** 英文最常见三字母组，权重比双字母更高，用来定案 */
    const EN_TRIGRAMS = ['THE', 'AND', 'ING', 'ION', 'TIO', 'ENT', 'ATI', 'FOR', 'HER',
      'TER', 'HAT', 'THA', 'ERE', 'ATE', 'HIS', 'CON', 'RES', 'VER', 'ALL', 'OUL',
      'ULD', 'OUN', 'IVE', 'STO', 'OUR', 'ITH', 'WIT', 'HIC', 'WHI', 'YOU'];

    /** 汉明距离（用于猜 XOR 密钥长度） */
    function hammingDistance(a, b) {
      let d = 0;
      const n = Math.min(a.length, b.length);
      for (let i = 0; i < n; i++) {
        let x = a[i] ^ b[i];
        while (x) { d += x & 1; x >>= 1; }
      }
      return d;
    }

    // 1. XOR 破解

    /** 单字节 XOR：枚举 256 个密钥，按分数排序 */
    function xorSingleByte(bytes, topN = 8) {
      if (!bytes.length) return [];
      const results = [];
      for (let k = 0; k < 256; k++) {
        const out = bytes.map(b => b ^ k);
        results.push({ key: k, score: scoreEnglish(out), text: out });
      }
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, topN);
    }

    /**
     * 用汉明距离猜多字节 XOR 的密钥长度。
     * 实测坑：只按「归一化汉明距离最小」排序，短文本上容易选出真实长度的倍数
     * （真实 4 会输给 8、12），因为密钥长度的倍数同样满足「同位置密钥相同」。
     * 所以这里补两条约束：
     *   1. 归一化距离按「每字节比特差」算，并用足够多的块取平均；
     *   2. 打分时对长度做轻微惩罚，越短越优先，避免倍数胜出。
     */
    function guessXorKeyLengths(bytes, maxLen = 32, topN = 5) {
      if (bytes.length < 16) return [];
      const candidates = [];
      for (let len = 1; len <= Math.min(maxLen, Math.floor(bytes.length / 4)); len++) {
        const blocks = Math.floor(bytes.length / len);
        if (blocks < 3) continue;
        let total = 0, pairs = 0;
        const useBlocks = Math.min(blocks, 12);
        for (let i = 0; i + 1 < useBlocks; i++) {
          const a = bytes.slice(i * len, (i + 1) * len);
          const b = bytes.slice((i + 1) * len, (i + 2) * len);
          if (a.length !== len || b.length !== len) break;
          total += hammingDistance(a, b) / len; // 每字节平均比特差
          pairs++;
        }
        if (!pairs) continue;
        const normalized = total / pairs;
        // 长度惩罚：同等距离下短长度优先（系数很小，只用于打破倍数歧义）
        candidates.push({ length: len, distance: normalized, adjusted: normalized * (1 + len / 400) });
      }
      candidates.sort((a, b) => a.adjusted - b.adjusted);
      return candidates.slice(0, topN);
    }

    /** 先定密钥长度，再逐列做单字节破解，拼出密钥与明文 */
    function xorMultiByte(bytes, keyLength, topKeysPerColumn = 1) {
      if (!bytes.length || !keyLength) return null;
      const key = [];
      for (let i = 0; i < keyLength; i++) {
        const column = [];
        for (let j = i; j < bytes.length; j += keyLength) column.push(bytes[j]);
        const best = xorSingleByte(column, topKeysPerColumn)[0];
        key.push(best ? best.key : 0);
      }
      const plain = bytes.map((b, i) => b ^ key[i % keyLength]);
      // 候选长度可能是真实长度的倍数（4 被猜成 8），解出的密钥会自我重复，这里折叠回最短周期
      const collapsed = collapseRepeatingKey(key);
      const effectiveKey = collapsed || key;
      const effectivePlain = collapsed
        ? bytes.map((b, i) => b ^ effectiveKey[i % effectiveKey.length])
        : plain;
      if (collapsed && CryptoAttacksConfig.verbose) {
        console.info(`[CryptoAttacks] 密钥存在 ${effectiveKey.length} 字节周期，已从 ${key.length} 折叠`);
      }
      return {
        key: effectiveKey,
        guessedLength: keyLength,
        period: effectiveKey.length,
        plain: effectivePlain,
        score: scoreEnglish(effectivePlain)
      };
    }

    /** 若密钥是某个更短序列的整数次重复，返回最短周期；否则返回 null */
    function collapseRepeatingKey(key) {
      const n = key.length;
      for (let p = 1; p < n; p++) {
        if (n % p !== 0) continue;
        let ok = true;
        for (let i = p; i < n; i++) {
          if (key[i] !== key[i % p]) { ok = false; break; }
        }
        if (ok) return key.slice(0, p);
      }
      return null;
    }

    /**
     * 自动 XOR：先试单字节，再对每个候选密钥长度真实解一遍，最后按明文得分排序。
     * 关键点：不能只按汉明距离挑长度。真实长度 4 的倍数（8、12、16）汉明距离
     * 完全相同 —— 因为它们同样满足「同位置密钥相同」。所以必须把候选长度都解出来，
     * 用明文质量定案，这也是 xortool 的做法。
     */
    function xorAttack(bytes, opts) {
      const options = opts || {};
      const maxLen = options.maxLen || 32;
      const topSingle = xorSingleByte(bytes, 5);

      const lengths = guessXorKeyLengths(bytes, maxLen, 8);
      const multi = lengths.map(l => {
        const r = xorMultiByte(bytes, l.length);
        return r ? { length: l.length, distance: l.distance, ...r } : null;
      }).filter(Boolean).sort((a, b) => b.score - a.score);

      // 单字节的结果也放进同一个排序里比较，避免「多字节假阳性」压过正确答案
      const single = topSingle.map(s => ({
        length: 1, distance: null, key: [s.key], plain: s.text, score: s.score
      }));
      const all = single.concat(multi).sort((a, b) => b.score - a.score);

      return { single: topSingle, lengths, multi, best: all.slice(0, 6) };
    }

    // 2. 频数分析

    /** 字母频次表（降序） */
    function frequencyTable(text) {
      const letters = lettersOnly(text);
      const counts = {};
      for (const c of A) counts[c] = 0;
      for (const c of letters) counts[c]++;
      const total = letters.length || 1;
      return A.split('').map(c => ({
        letter: c,
        count: counts[c],
        percent: (counts[c] * 100) / total,
        english: EN_FREQ[c]
      })).sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));
    }

    /** 重合指数 IC：英文约 0.066，随机约 0.038 */
    function indexOfCoincidence(text) {
      const letters = lettersOnly(text);
      const n = letters.length;
      if (n < 2) return 0;
      const counts = {};
      for (const c of letters) counts[c] = (counts[c] || 0) + 1;
      let sum = 0;
      for (const k in counts) sum += counts[k] * (counts[k] - 1);
      return sum / (n * (n - 1));
    }

    /** 把文本按每 step 个字符切片后分别算 IC —— 维吉尼亚密钥长度探测的核心 */
    function icByKeyLength(text, maxLen = 20) {
      const letters = lettersOnly(text);
      const out = [];
      for (let len = 1; len <= maxLen; len++) {
        const parts = [];
        for (let i = 0; i < len; i++) {
          let s = '';
          for (let j = i; j < letters.length; j += len) s += letters[j];
          parts.push(s);
        }
        const avg = parts.reduce((acc, p) => acc + indexOfCoincidence(p), 0) / parts.length;
        out.push({ length: len, ic: avg });
      }
      return out;
    }

    /** 卡方检验：与英文频率的偏离程度，越小越像英文 */
    function chiSquare(text) {
      const letters = lettersOnly(text);
      const n = letters.length;
      if (!n) return Infinity;
      const counts = {};
      for (const c of letters) counts[c] = (counts[c] || 0) + 1;
      let chi = 0;
      for (const c of A) {
        const expected = (EN_FREQ[c] / 100) * n;
        chi += ((counts[c] || 0) - expected) ** 2 / (expected || 0.5);
      }
      return chi;
    }

    /** 香农熵（比特/字符），自然英文约 4.0-4.5，随机 8.0 */
    function entropy(text) {
      const s = String(text || '');
      if (!s.length) return 0;
      const counts = {};
      for (const c of s) counts[c] = (counts[c] || 0) + 1;
      let h = 0;
      for (const k in counts) {
        const p = counts[k] / s.length;
        h -= p * Math.log2(p);
      }
      return h;
    }

    // 3. Kasiski 检验

    /** 找出重复出现（>=2 次）的长度为 minLen 以上的片段，并计算间距的因数 */
    function kasiski(text, minLen = 3, maxSeq = 60) {
      const letters = lettersOnly(text);
      // 长度不够就返回同样的对象形状：以前这里 return [] 而调用方读的是 r.rows，
      // 于是短输入下这张卡每帧都报 TypeError，结果区一直空着看不出原因。
      if (letters.length < minLen * 2) return { rows: [], factorRank: [], tooShort: true };
      const seen = new Map();
      for (let i = 0; i + minLen <= letters.length; i++) {
        const seq = letters.substr(i, minLen);
        if (!seen.has(seq)) seen.set(seq, []);
        seen.get(seq).push(i);
      }
      const rows = [];
      seen.forEach((positions, seq) => {
        if (positions.length < 2) return;
        const gaps = [];
        for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i - 1]);
        const gcdAll = gaps.reduce((a, b) => gcd(a, b));
        rows.push({ seq, positions, gaps, gcd: gcdAll });
      });
      rows.sort((a, b) => (b.gaps.length - a.gaps.length) || a.seq.localeCompare(b.seq));
      const trimmed = rows.slice(0, maxSeq);

      // 统计所有间距的因数出现次数
      const factorVotes = new Map();
      trimmed.forEach(r => {
        r.gaps.forEach(g => {
          for (let f = 2; f <= Math.min(40, g); f++) {
            if (g % f === 0) factorVotes.set(f, (factorVotes.get(f) || 0) + 1);
          }
        });
      });
      const factorRank = [...factorVotes.entries()]
        .map(([factor, votes]) => ({ factor, votes }))
        .sort((a, b) => b.votes - a.votes);

      return { rows: trimmed, factorRank };
    }

    function gcd(a, b) { return b ? gcd(b, a % b) : a; }

    // 4. 维吉尼亚自动破解

    /** 用卡方给某一列（同一个密钥字母加密的所有字符）挑最合适的位移 */
    function bestShiftForColumn(column) {
      const letters = lettersOnly(column);
      if (!letters.length) return { shift: 0, chi: Infinity };
      let best = { shift: 0, chi: Infinity };
      for (let s = 0; s < 26; s++) {
        // 把这一列按位移 s 解回来，再与英文频率比较
        const decoded = letters.split('').map(c => A[(A.indexOf(c) - s + 26) % 26]).join('');
        const chi = chiSquare(decoded);
        if (chi < best.chi) best = { shift: s, chi };
      }
      return best;
    }

    /** 给定密钥长度，逐列破解并返回密钥与明文 */
    function breakVigenereWithLength(text, keyLength) {
      const letters = lettersOnly(text);
      if (!letters.length || keyLength < 1) return null;
      const key = [];
      for (let i = 0; i < keyLength; i++) {
        let column = '';
        for (let j = i; j < letters.length; j += keyLength) column += letters[j];
        key.push(bestShiftForColumn(column).shift);
      }
      const keyText = key.map(s => A[s]).join('');
      const plain = letters.split('').map((c, i) =>
        A[(A.indexOf(c) - key[i % keyLength] + 26) % 26]).join('');
      return { key: keyText, keyShifts: key, plain, chi: chiSquare(plain), score: scoreEnglish(bytesFrom(plain)) };
    }

    /** 自动破解维吉尼亚：IC 与 Kasiski 各自给出候选长度，逐一试解后按分数排序 */
    function breakVigenere(text, maxLen = 20) {
      const letters = lettersOnly(text);
      if (letters.length < 20) return null;

      const ic = icByKeyLength(letters, maxLen);
      const kas = kasiski(letters, 3);
      const factors = kas && kas.factorRank ? kas.factorRank.slice(0, 10) : [];

      // 候选长度：IC 局部峰值 + Kasiski 高票因数
      const cand = new Set();
      for (let i = 1; i < ic.length - 1; i++) {
        if (ic[i].ic > ic[i - 1].ic && ic[i].ic >= ic[i + 1].ic && ic[i].ic > 0.05) cand.add(ic[i].length);
      }
      factors.forEach(f => { if (f.factor >= 2 && f.factor <= maxLen) cand.add(f.factor); });
      for (let l = 2; l <= Math.min(maxLen, 8); l++) cand.add(l);

      const attempts = [...cand]
        .map(len => breakVigenereWithLength(letters, len))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

      return {
        icTable: ic,
        kasiski: kas,
        factors,
        attempts: attempts.slice(0, 6),
        best: attempts[0] || null
      };
    }

    // 卡片 HTML

    const XOR_HTML = `
      <div class="grid-3">
        <select id="xorInputMode">
          <option value="text">输入是文本</option>
          <option value="hex">输入是十六进制</option>
          <option value="dec">输入是十进制字节</option>
        </select>
        <input type="number" id="xorMaxLen" placeholder="最大密钥长度" value="32" min="1" max="64">
        <input type="text" id="xorCrib" placeholder="已知明文片段，例如 flag{（可选）">
      </div>
      <div class="result" id="xorResult"></div>
    `;

    function computeXor() {
      const bytes = toBytes(mainInput(), param('xorInputMode', 'text'));
      if (!bytes.length) return null;
      const maxLen = Math.min(64, Math.max(1, parseInt(param('xorMaxLen', '32'), 10) || 32));
      const crib = param('xorCrib', '').trim();
      const result = xorAttack(bytes, { maxLen });

      // 有 crib 时，用已知明文直接反推密钥（比打分更可靠）
      let cribKey = null;
      if (crib) {
        const cribBytes = bytesFrom(crib);
        if (cribBytes.length && bytes.length >= cribBytes.length) {
          const bestLen = result.lengths[0] ? result.lengths[0].length : 1;
          const guessed = xorMultiByte(bytes, bestLen);
          if (guessed) {
            const plainStr = guessed.plain.map(b => String.fromCharCode(b)).join('');
            const at = plainStr.indexOf(crib);
            if (at !== -1) {
              cribKey = [];
              for (let i = 0; i < cribBytes.length; i++) cribKey.push(bytes[at + i] ^ cribBytes[i]);
            }
          }
        }
      }

      const lines = [`输入 ${bytes.length} 字节`];
      result.best.forEach((r, i) => {
        const text = r.plain.map(b => String.fromCharCode(b)).join('');
        lines.push(`#${i + 1}  密钥长度 ${r.key.length}  密钥 ${r.key.map(k => k.toString(16).padStart(2, '0')).join(' ')}`);
        lines.push(`     ${text.slice(0, 160)}${text.length > 160 ? ' …' : ''}`);
      });
      lines.push('');
      result.single.forEach(s => {
        const text = s.text.map(b => String.fromCharCode(b)).join('');
        lines.push(`  0x${s.key.toString(16).padStart(2, '0')}  ${text.slice(0, 80)}`);
      });
      if (result.lengths.length) {
        lines.push('');
        lines.push('  ' + result.lengths.map(l => `${l.length}(${l.distance.toFixed(2)})`).join('  '));
      }
      if (cribKey) {
        lines.push('');
        lines.push(`  ${cribKey.map(k => k.toString(16).padStart(2, '0')).join(' ')}`);
      }

      return { bytes, result, cribKey, lines };
    }

    registerCard({
      id: 'attackXor',
      badge: 'XOR 破解 单字节/多字节',
      section: SECTION,
      needsMainInput: true,
      html: XOR_HTML,
      resultId: 'xorResult',
      listens: ['xorInputMode', 'xorMaxLen', 'xorCrib'],
      compute() {
        const r = computeXor();
        setResult('xorResult', r ? r.lines.join('\n') : '');
      }
    });

    const STATS_HTML = `
      <select id="statsInputMode">
        <option value="text">按文本统计</option>
        <option value="hex">按十六进制字节统计</option>
      </select>
      <div class="result" id="statsResult"></div>
    `;

    function computeStats() {
      const raw = mainInput();
      if (!raw || !raw.trim()) return null;
      const mode = param('statsInputMode', 'text');
      const bytes = mode === 'hex' ? toBytes(raw, 'hex') : bytesFrom(raw);
      const text = bytes.map(b => String.fromCharCode(b)).join('');
      const letters = lettersOnly(text);
      const freq = frequencyTable(text);
      const ic = indexOfCoincidence(text);
      const chi = chiSquare(text);
      const ent = entropy(text);
      const icLen = icByKeyLength(text, 20);

      const lines = [
        `总长度 ${text.length} 字符，其中字母 ${letters.length} 个`,
        `重合指数 IC = ${ic.toFixed(4)}`,
        `卡方 = ${chi.toFixed(1)}`,
        `香农熵 = ${ent.toFixed(3)} 比特/字符`,
        `可打印率 = ${(printableRatio(bytes) * 100).toFixed(1)}%`,
        ''
      ];
      freq.filter(f => f.count > 0).forEach(f => {
        lines.push(`  ${f.letter}  ${String(f.count).padStart(4)}  ${f.percent.toFixed(2).padStart(6)}%  参考 ${String(f.english).padStart(6)}%`);
      });
      lines.push('');
      icLen.forEach(r => {
        lines.push(`  ${String(r.length).padStart(2)}  ${r.ic.toFixed(4)}`);
      });

      return { length: text.length, letterCount: letters.length, frequency: freq, ic, chi, entropy: ent,
        printable: printableRatio(bytes), icByLength: icLen, lines };
    }

    registerCard({
      id: 'attackStats',
      badge: '频数分析 频率/IC/卡方/熵',
      section: SECTION,
      needsMainInput: true,
      html: STATS_HTML,
      resultId: 'statsResult',
      listens: ['statsInputMode'],
      compute() {
        const r = computeStats();
        setResult('statsResult', r ? r.lines.join('\n') : '');
      }
    });

    const VIG_HTML = `
      <div class="grid-2">
        <select id="vigInputMode">
          <option value="text">输入是密文文本</option>
          <option value="letters">输入含空格标点，只取字母</option>
        </select>
        <input type="number" id="vigMaxLen" placeholder="最大密钥长度" value="20" min="2" max="40">
      </div>
      <div class="result" id="vigResult"></div>
    `;

    function computeVigenere() {
      const raw = mainInput();
      if (!raw || !raw.trim()) return null;
      const maxLen = Math.min(40, Math.max(2, parseInt(param('vigMaxLen', '20'), 10) || 20));
      const r = breakVigenere(raw, maxLen);
      if (!r) return null;

      const lines = [`密文字母数 ${lettersOnly(raw).length}`];
      r.attempts.forEach((a, i) => {
        lines.push(`#${i + 1}  密钥长度 ${a.key.length}  密钥 ${a.key}`);
        lines.push(`     ${a.plain.slice(0, 160)}${a.plain.length > 160 ? ' …' : ''}`);
      });
      if (r.best) {
        lines.push('');
        lines.push(`${r.best.key}`);
        lines.push(r.best.plain);
      }
      if (r.factors.length) {
        lines.push('');
        lines.push('  ' + r.factors.map(f => `${f.factor}(${f.votes})`).join('  '));
      }
      lines.push('');
      r.icTable.forEach(row => {
        lines.push(`  ${String(row.length).padStart(2)}  ${row.ic.toFixed(4)}`);
      });

      return { ...r, lines };
    }

    registerCard({
      id: 'attackVigenere',
      badge: '维吉尼亚自动破解 IC+Kasiski',
      section: SECTION,
      needsMainInput: true,
      html: VIG_HTML,
      resultId: 'vigResult',
      listens: ['vigInputMode', 'vigMaxLen'],
      compute() {
        const r = computeVigenere();
        setResult('vigResult', r ? r.lines.join('\n') : '');
      }
    });

    const KAS_HTML = `
      <div class="grid-2">
        <input type="number" id="kasMinLen" placeholder="重复片段最小长度" value="3" min="2" max="8">
        <input type="number" id="kasMaxSeq" placeholder="最多列出几条重复片段" value="20" min="5" max="60">
      </div>
      <div class="result" id="kasResult"></div>
    `;

    function computeKasiski() {
      const raw = mainInput();
      if (!raw || !raw.trim()) return null;
      const minLen = Math.min(8, Math.max(2, parseInt(param('kasMinLen', '3'), 10) || 3));
      const maxSeq = Math.min(60, Math.max(5, parseInt(param('kasMaxSeq', '20'), 10) || 20));
      const r = kasiski(raw, minLen, maxSeq);

      const lines = [`重复片段最小长度 ${minLen}，找到 ${r.rows.length} 条`];
      if (r.tooShort) {
        lines.push(`文本太短（${lettersOnly(raw).length} 个字母），至少要 ${minLen * 2} 个才做得了重复片段统计`);
        return { ...r, lines };
      }
      if (!r.rows.length) {
        lines.push('没有找到重复片段');
        return { ...r, lines };
      }
      r.rows.forEach(row => {
        lines.push(`  ${row.seq}  出现 ${row.positions.length} 次  位置 ${row.positions.join(',')}`);
        lines.push(`      间距 ${row.gaps.join(',')}   公因数 ${row.gcd}`);
      });
      lines.push('');
      r.factorRank.slice(0, 12).forEach(f => {
        lines.push(`  ${String(f.factor).padStart(2)}  ${String(f.votes).padStart(3)} 票`);
      });
      return { ...r, lines };
    }

    registerCard({
      id: 'attackKasiski',
      badge: 'Kasiski 检验 重复片段',
      section: SECTION,
      needsMainInput: true,
      html: KAS_HTML,
      resultId: 'kasResult',
      listens: ['kasMinLen', 'kasMaxSeq'],
      compute() {
        const r = computeKasiski();
        setResult('kasResult', r ? r.lines.join('\n') : '');
      }
    });

    // 对外暴露

    window.CryptoAttacks = {
      config: CryptoAttacksConfig,
      // XOR
      xorAttack, xorSingleByte, xorMultiByte, guessXorKeyLengths, collapseRepeatingKey,
      // 统计
      frequencyTable, indexOfCoincidence, icByKeyLength, chiSquare, entropy,
      // Kasiski / 维吉尼亚
      kasiski, breakVigenere, breakVigenereWithLength, bestShiftForColumn,
      // 工具
      toBytes, bytesFrom, scoreEnglish, hammingDistance, lettersOnly, printableRatio,
      EN_FREQ
    };

  /* ==========================================================================
   * 4. 万能自动解码：多层编码递归搜索 + 尝试树
   * ======================================================================== */




    // 打分

    /**
     * flag 识别分两档置信度，这是踩过坑之后的设计：
     * - strong：flag{} / ctf{} / 已知赛事前缀。命中就可以确信是答案。
     * - weak：泛化的 `word{...}`。它很有用（很多比赛用自定义前缀），但也会误判 ——
     *   实测 ROT13 后的 `synt{ybbc_thneq}` 就能命中泛化模式，
     *   如果把它当强信号，搜索会在第 0 层就宣布成功并停止，永远解不出明文。
     * 所以：只有 strong 才终止搜索；weak 只用来加分和提示。
     */
    const FLAG_PATTERNS = [
      /flag\{[^}]{2,80}\}/i,
      /ctf\{[^}]{2,80}\}/i,
      /key\{[^}]{2,80}\}/i,
      /(?:pctf|nssctf|dasctf|hgame|buuctf|moectf|n1ctf|zer0pts|actf|hitcon|seccon|asis|inctf|csaw|tjctf|uiuctf|idek|angstrom|buckeye|dice|corctf|grey|crew|umd|ictf|vsctf|sctf|gkctf|xnuca|qwb|starctf|wctf|rwctf|realworld)\{[^}]{2,80}\}/i
    ];
    /** 泛化模式：只做提示，不作为终止条件 */
    const WEAK_FLAG_PATTERN = /[a-z0-9_]{2,20}\{[^}]{4,80}\}/i;

    /** @returns {{flag:string, strong:boolean}|null} */
    function detectFlag(text) {
      const t = String(text || '');
      for (const re of FLAG_PATTERNS) {
        const m = t.match(re);
        if (m) return { flag: m[0], strong: true };
      }
      const w = t.match(WEAK_FLAG_PATTERN);
      if (w) return { flag: w[0], strong: false };
      return null;
    }

    /** 兼容旧用法：只取字符串 */
    function findFlag(text) {
      const d = detectFlag(text);
      return d ? d.flag : null;
    }


    const goodCharRatio = s => {
      const t = String(s || '');
      if (!t.length) return 0;
      let ok = 0;
      for (const ch of t) {
        const c = ch.codePointAt(0);
        // { } 必须算作「好字符」：flag{...} 是最常见的答案形态，
        // 漏掉它们会让含 flag 的文本可打印率偏低，反而被扣分。
        if (c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126)) ok++;
      }
      return ok / t.length;
    };

    const cjkRatio = s => {
      const t = String(s || '');
      if (!t.length) return 0;
      let n = 0;
      for (const ch of t) if (/[\u4e00-\u9fff]/.test(ch)) n++;
      return n / t.length;
    };

    /** 英文似然：字母频率匹配度 + 双字母组命中 */
    function englishScore(s) {
      const t = String(s || '');
      const letters = t.toUpperCase().replace(/[^A-Z]/g, '');
      if (letters.length < 3) return 0;
      const counts = {};
      for (const c of letters) counts[c] = (counts[c] || 0) + 1;
      // 用余弦相似度比较实际分布与英文参考分布，得到 0..1 的匹配度
      let dot = 0, na = 0, nb = 0;
      for (const c of Object.keys(EN_FREQ)) {
        const a = (counts[c] || 0) / letters.length;
        const b = EN_FREQ[c] / 100;
        dot += a * b; na += a * a; nb += b * b;
      }
      const cos = (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
      const up = t.toUpperCase();
      let bg = 0;
      for (const b of EN_BIGRAMS) {
        let i = up.indexOf(b);
        while (i !== -1) { bg++; i = up.indexOf(b, i + 1); }
      }
      const bgRate = Math.min(1, bg / Math.max(1, up.length / 4));

      // 余弦相似度对「均匀分布」不敏感：随机串的分布接近平坦，余弦仍会偏 0.6 左右。
      // 所以再算一次卡方，用「偏离程度」把平坦分布压下去（英文卡方很小，均匀分布很大）。
      let chi = 0;
      for (const c of Object.keys(EN_FREQ)) {
        const expected = (EN_FREQ[c] / 100) * letters.length;
        chi += ((counts[c] || 0) - expected) ** 2 / (expected || 0.5);
      }
      const chiScore = 1 / (1 + chi / (letters.length * 3));

      return cos * 0.45 + bgRate * 0.25 + chiScore * 0.30;
    }

    /**
     * 结构性信号：这段文本「像不像还需要继续解码」。
     * 为什么需要它：两层 Base64 的中间层是另一串 Base64，既不像英文也不像答案，
     * 单靠语言打分会在中途把正确分支剪掉 —— 这是自动解码类工具的经典难点。
     * 这里用「字符集 + 长度 + 解码后是否可打印」这类结构特征，
     * 把「看起来还能再解一层」的分支保住，不让它被语言打分淘汰。
     */
    function chainSignal(text) {
      const t = String(text || '').replace(/\s/g, '');
      if (t.length < 8) return 0;
      const pure = t.replace(/=+$/, '');
      const charsetOk = /^[A-Za-z0-9+/]+$/.test(pure);
      if (!charsetOk) return 0;
      let bonus = 0.25;
      if (t.length % 4 === 0) bonus += 0.15;            // Base64 长度通常是 4 的倍数
      if (/[A-Z]/.test(t) && /[a-z]/.test(t)) bonus += 0.1;  // 大小写混排
      if (pure.length >= 16) bonus += 0.1;
      return Math.min(0.6, bonus);
    }

    /**
     * 综合打分：0..1，越大越像「答案」。
     * 命中 flag 直接返回 1。
     */
    /**
     * 综合打分：0..1，越大越像「答案」。
     * 命中 flag 直接给高分。
     */
    function scoreText(text, opts) {
      const t = String(text || '');
      if (!t.length) return 0;

      const good = goodCharRatio(t);
      const cjk = cjkRatio(t);
      const letters = t.toUpperCase().replace(/[^A-Z]/g, '');

      // 「像不像词」的门槛：没有空格、元音又少的短串（例如 a8Fk2xQ9zLm3pR）
      // 不该拿英文分。它的字母分布接近均匀，余弦相似度会虚高。
      const vowels = (letters.match(/[AEIOU]/g) || []).length / Math.max(1, letters.length);
      const looksLikeWords = /\s/.test(t) || vowels >= 0.15 || letters.length >= 20;

      const en = looksLikeWords ? englishScore(t) : 0;
      // 中文谜题里汉字占比高也是强信号
      const score = good * 0.45 + en * 0.4 + Math.min(1, cjk * 3) * 0.15;

      // 明显是噪声的扣分
      const upperOnly = t.replace(/[^A-Z]/g, '').length / t.length;
      let s = score;
      if (upperOnly > 0.95 && t.length > 20) s *= 0.85;      // 全大写长串更像多层编码
      if (/(.)\1{8,}/.test(t)) s *= 0.6;                     // 长重复串
      const printableOnly = good > 0.999 ? 1 : good;
      s *= (0.5 + 0.5 * printableOnly);

      // 结构加分：让「还能再解一层」的分支活下来（用于层级剪枝，不影响答案判定）
      if (opts && opts.explore) s += chainSignal(t);

      // 命中 flag：加一笔很大的奖励，但不是直接返回 1。
      // 因为泛化模式会误判（例如 ROT13 后的 synt{...} 也长得像 flag），
      // 保留基础分的差异，才能让真正的明文排在前面。
      if (findFlag(t)) return Math.min(1, Math.max(s, 0.9) + 0.1);

      return Math.max(0, Math.min(1, s));
    }

    // 算子集合：每个算子把文本变成另一个文本 全部复用项目已有实现，避免重复造轮子

    /** 安全调用：任何算子抛错都返回 null，不影响整棵树 */
    function safe(fn) {
      try {
        const r = fn();
        if (r == null) return null;
        const s = String(r);
        return s.length && s.length < 200000 ? s : null;
      } catch (e) {
        return null;
      }
    }

    const OPS = [
      { id: 'base64', label: 'Base64 解码', group: '编码', run: t => safe(() => {
          if (!/^[A-Za-z0-9+/=\s]+$/.test(t) || t.replace(/\s/g, '').length < 4) return null;
          return typeof baseCipher !== 'undefined' ? baseCipher.d(t, 'base64') : null;
        }) },
      { id: 'base32', label: 'Base32 解码', group: '编码', run: t => safe(() => {
          if (!/^[A-Z2-7=\s]+$/i.test(t)) return null;
          return typeof baseCipher !== 'undefined' ? baseCipher.d(t, 'base32') : null;
        }) },
      { id: 'base58', label: 'Base58 解码', group: '编码', run: t => safe(() => {
          if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(t)) return null;
          return typeof baseCipher !== 'undefined' ? baseCipher.d(t, 'base58') : null;
        }) },
      { id: 'base16', label: 'Base16/Hex 解码', group: '编码', run: t => safe(() => {
          const hex = t.replace(/\s/g, '');
          if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2) return null;
          return typeof baseCipher !== 'undefined' ? baseCipher.d(t, 'base16') : null;
        }) },
      { id: 'base85', label: 'Base85 解码', group: '编码', run: t => safe(() => {
          if (!/^[!-u\s]+$/.test(t)) return null;
          return typeof baseCipher !== 'undefined' ? baseCipher.d(t, 'base85') : null;
        }) },
      { id: 'base91', label: 'Base91 解码', group: '编码', run: t => safe(() => {
          return typeof baseCipher !== 'undefined' ? baseCipher.d(t, 'base91') : null;
        }) },
      { id: 'base100', label: 'Base100（emoji）解码', group: '编码', run: t => safe(() => {
          if (!/[\u{1F600}-\u{1F64F}]/u.test(t)) return null;
          return typeof baseCipher !== 'undefined' ? baseCipher.d(t, 'base100') : null;
        }) },

      { id: 'rot13', label: 'ROT13', group: '旋转', run: t => safe(() =>
          typeof ROTCipher !== 'undefined' ? ROTCipher.e(t, 'rot13') : null) },
      { id: 'rot47', label: 'ROT47', group: '旋转', run: t => safe(() =>
          typeof ROTCipher !== 'undefined' ? ROTCipher.e(t, 'rot47') : null) },
      { id: 'rot5', label: 'ROT5（数字）', group: '旋转', run: t => safe(() =>
          /\d/.test(t) && typeof ROTCipher !== 'undefined' ? ROTCipher.e(t, 'rot5') : null) },
      { id: 'atbash', label: 'AtBash 反转字母表', group: '替换', run: t => safe(() =>
          /[a-z]/i.test(t) && typeof AtBash !== 'undefined' ? AtBash.e(t) : null) },
      { id: 'caesar1', label: '凯撒 -1', group: '替换', run: t => safe(() =>
          typeof Caesar !== 'undefined' ? Caesar.d(t, 1) : null) },
      { id: 'caesar13', label: '凯撒 -13', group: '替换', run: t => safe(() =>
          typeof Caesar !== 'undefined' ? Caesar.d(t, 13) : null) },

      { id: 'morse', label: '摩尔斯解码', group: '符号', run: t => safe(() =>
          /[.\-]{2,}/.test(t) && typeof MorseCode !== 'undefined' ? MorseCode.d(t) : null) },
      { id: 'bacon', label: '培根密码解码', group: '符号', run: t => safe(() => {
          if (!/^[abAB\s]+$/.test(t)) return null;
          return typeof BaconCipher !== 'undefined' ? BaconCipher.d(t) : null;
        }) },
      { id: 'tap', label: '敲击码解码', group: '符号', run: t => safe(() => {
          if (!/^[.\s]+$/.test(t)) return null;
          return typeof TapCode !== 'undefined' ? TapCode.d(t, '.', ' ', '  ') : null;
        }) },

      { id: 'a1z26', label: 'A1Z26 数字→字母', group: '数字', run: t => safe(() => {
          if (!/^[\d\s,.\-]+$/.test(t)) return null;
          return typeof A1Z26Cipher !== 'undefined' ? A1Z26Cipher.d(t, 'a1') : null;
        }) },
      { id: 'binary', label: '二进制→字符', group: '数字', run: t => safe(() => {
          const bits = t.replace(/\s/g, '');
          if (!/^[01]+$/.test(bits) || bits.length % 8) return null;
          let out = '';
          for (let i = 0; i < bits.length; i += 8) out += String.fromCharCode(parseInt(bits.substr(i, 8), 2));
          return out;
        }) },
      { id: 'dec', label: '十进制字节→字符', group: '数字', run: t => safe(() => {
          const nums = t.match(/\d{1,3}/g);
          if (!nums || nums.length < 2) return null;
          if (!nums.every(n => +n <= 255)) return null;
          return nums.map(n => String.fromCharCode(+n)).join('');
        }) },
      { id: 'octal', label: '八进制→字符', group: '数字', run: t => safe(() => {
          const nums = t.match(/\b[0-7]{2,3}\b/g);
          if (!nums || nums.length < 2) return null;
          return nums.map(n => String.fromCharCode(parseInt(n, 8))).join('');
        }) },

      { id: 'ccc', label: '中文电码→汉字', group: '中文', run: t => safe(() => {
          const nums = t.replace(/\s/g, '');
          if (!/^\d{4}(\d{4})*$/.test(nums)) return null;
          return typeof CCCHandler !== 'undefined' ? CCCHandler.convert(t) : null;
        }) },
      { id: 'quwei', label: '区位码→汉字', group: '中文', run: t => safe(() => {
          const nums = t.replace(/\s/g, '');
          if (!/^\d{4}(\d{4})*$/.test(nums)) return null;
          if (typeof TextDecoder === 'undefined') return null;
          const dec = new TextDecoder('gbk');
          const out = nums.match(/\d{4}/g).map(c => {
            const qu = +c.slice(0, 2), wei = +c.slice(2);
            if (qu < 1 || qu > 94 || wei < 1 || wei > 94) return '';
            try { return dec.decode(new Uint8Array([qu + 0xa0, wei + 0xa0])); } catch (e) { return ''; }
          }).join('');
          return /[\u4e00-\u9fff]/.test(out) ? out : null;
        }) },
      { id: 'fourccc', label: '四角号码→汉字', group: '中文', run: t => safe(() => {
          const nums = t.replace(/\s/g, '');
          if (!/^\d{4}(\d{4})*$/.test(nums)) return null;
          return typeof fourCCCHandler !== 'undefined' ? fourCCCHandler.convert(t) : null;
        }) },

      { id: 'reverse', label: '整体倒序', group: '通用', run: t => safe(() => [...t].reverse().join('')) },
      { id: 'url', label: 'URL 解码', group: '通用', run: t => safe(() => {
          if (!/%[0-9a-fA-F]{2}/.test(t)) return null;
          return decodeURIComponent(t);
        }) },
      { id: 'htmlent', label: 'HTML 实体解码', group: '通用', run: t => safe(() => {
          if (!/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(t)) return null;
          const el = document.createElement('textarea');
          el.innerHTML = t;
          return el.value;
        }) },
      { id: 'unicode', label: 'Unicode 转义解码', group: '通用', run: t => safe(() => {
          if (!/\\u[0-9a-fA-F]{4}/.test(t)) return null;
          return t.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
        }) },
      { id: 'space', label: '去空格连成一行', group: '通用', run: t => safe(() => {
          if (!/\s/.test(t)) return null;
          return t.replace(/\s+/g, '');
        }) }
    ];

    // 递归搜索

    /** 造一个树节点 */
    const mkNode = (text, op, score, flag, depth, parentPath) => ({
      text, op, score, flag, depth,
      path: op ? parentPath.concat(op.label) : parentPath.slice()
    });

    /**
     * 广度优先逐层扩展。
     * @param {string} input 起始文本
     * @param {Object} opts { maxDepth, beamWidth, minScore, avoidNoise }
     * @returns {{nodes:Array, best:Object|null, flag:String|null, tree:Array}}
     */
    function autoDecode(input, opts) {
      const o = Object.assign({ maxDepth: 3, beamWidth: 8, minScore: 0.02 }, opts || {});
      const rootText = String(input || '');
      if (!rootText.trim()) return { nodes: [], best: null, flag: null, tree: [] };

      const rootScore = scoreText(rootText);
      const root = mkNode(rootText, null, rootScore, findFlag(rootText), 0, []);
      const visited = new Set([rootText]);

      let frontier = [root];
      const allNodes = [root];
      let best = root;
      // 只有「强 flag」才终止搜索；weak flag 只加分，继续找更好的
      const rootDetect = detectFlag(rootText);
      let flagHit = (rootDetect && rootDetect.strong) ? { node: root, flag: rootDetect.flag } : null;
      let weakHit = (rootDetect && !rootDetect.strong) ? { node: root, flag: rootDetect.flag } : null;

      for (let depth = 1; depth <= o.maxDepth; depth++) {
        const next = [];
        for (const node of frontier) {
          if (flagHit) break;   // 已找到强 flag，停止扩展这一层
          for (const op of OPS) {
            const out = op.run(node.text);
            if (out == null) continue;
            const trimmed = out.trim();
            if (!trimmed || trimmed === node.text) continue;
            if (visited.has(trimmed)) continue;      // 防止回环（如 ROT13 两次还原）
            visited.add(trimmed);

            const score = scoreText(trimmed);
            const exploreScore = scoreText(trimmed, { explore: true });
            const det = detectFlag(trimmed);
            const child = mkNode(trimmed, op, score, det ? det.flag : null, depth, node.path);
            child.exploreScore = exploreScore;
            child.flagStrong = det ? det.strong : false;
            allNodes.push(child);
            next.push(child);

            if (det && det.strong) { flagHit = { node: child, flag: det.flag }; break; }
            if (det && !det.strong && (!weakHit || score > weakHit.node.score)) {
              weakHit = { node: child, flag: det.flag };
            }
            if (score > best.score) best = child;
          }
          if (flagHit) break;
        }
        if (flagHit) break;
        if (!next.length) break;

        // 凯撒/ROT 枚举：不加这一步，ROT13、凯撒类密文永远走不到明文。
        // 25 个位移如果全塞进 frontier 会挤掉其它算子，所以先打分，
        // 每个父节点只保留分数最高的 2 个位移继续扩展。
        if (!flagHit) {
          for (const node of frontier) {
            const candidates = [];
            for (let shift = 1; shift <= 25; shift++) {
              const out = safe(() => (typeof Caesar !== 'undefined' ? Caesar.d(node.text, shift) : null));
              if (out == null) continue;
              const trimmed = out.trim();
              if (!trimmed || trimmed === node.text || visited.has(trimmed)) continue;
              const score = scoreText(trimmed);
              const exploreScore = scoreText(trimmed, { explore: true });
              const det = detectFlag(trimmed);
              if (det && det.strong) {
                const op = { id: `caesar${shift}`, label: `凯撒 -${shift}`, group: '枚举' };
                const child = mkNode(trimmed, op, score, det.flag, depth, node.path);
                child.flagStrong = true;
                visited.add(trimmed);
                allNodes.push(child);
                flagHit = { node: child, flag: det.flag };
                break;
              }
              candidates.push({ shift, text: trimmed, score, exploreScore });
            }
            if (flagHit) break;
            // 每个父节点保留 3 个候选，稍后与「非凯撒」分支一起全局排序，
            // 避免某个父节点分数普遍偏低时它整族被挤掉
            candidates.sort((a, b) => b.exploreScore - a.exploreScore);
            candidates.slice(0, 3).forEach(c => {
              if (visited.has(c.text)) return;
              visited.add(c.text);
              const op = { id: `caesar${c.shift}`, label: `凯撒 -${c.shift}`, group: '枚举' };
              const child = mkNode(c.text, op, c.score, null, depth, node.path);
              child.exploreScore = c.exploreScore;
              allNodes.push(child);
              next.push(child);
              if (c.score > best.score) best = child;
            });
          }
        }
        if (flagHit) break;

        // 只保留最有希望继续扩展的分支。
        // 排序用 exploreScore（含结构加分），这样「中间层仍是编码」的正确链路
        // 不会被语言打分淘汰；最终答案的判定仍然只看得分 score。
        next.sort((a, b) => (b.exploreScore ?? b.score) - (a.exploreScore ?? a.score));
        frontier = next.slice(0, o.beamWidth);
      }

      if (flagHit && flagHit.node.score >= best.score) best = flagHit.node;

      return {
        nodes: allNodes,
        best,
        flag: flagHit ? flagHit.flag : null,
        weakFlag: (!flagHit && weakHit) ? weakHit.flag : null,
        tree: allNodes
      };
    }

    /** 把尝试树渲染成可读文本（带缩进的树形） */
    function renderTree(result, opts) {
      const o = Object.assign({ maxRows: 60, previewLen: 70 }, opts || {});
      const lines = [];
      if (!result.nodes.length) return '(无输入)';

      if (result.flag) lines.push(`${result.flag}`);

      const byDepth = new Map();
      result.nodes.forEach(n => {
        if (n.depth === 0) return;
        if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
        byDepth.get(n.depth).push(n);
      });

      let shown = 0;
      for (const depth of [...byDepth.keys()].sort((a, b) => a - b)) {
        const list = byDepth.get(depth).sort((a, b) => b.score - a.score);
        lines.push('');
        lines.push(`第 ${depth} 层 ${list.length} 个分支`);
        list.slice(0, 12).forEach(n => {
          if (shown >= o.maxRows) return;
          shown++;
          const preview = n.text.replace(/\s*\n\s*/g, ' ').slice(0, o.previewLen);
          lines.push(`${(n.score * 100).toFixed(0)}%  ${n.path.length ? n.path.join(' → ') : '(原文)'}`);
          lines.push(`${preview}${n.text.length > o.previewLen ? ' …' : ''}`);
        });
        if (shown >= o.maxRows) break;
      }

      if (result.best) {
        lines.push('');
        lines.push(`${(result.best.score * 100).toFixed(1)}%  ${result.best.path.length ? result.best.path.join(' → ') : '(未做任何解码)'}`);
        lines.push(result.best.text);
      }
      return lines.join('\n');
    }

    // 卡片

    const AUTO_HTML = `
      <div class="grid-3">
        <input type="number" id="autoDepth" placeholder="最大层数" value="3" min="1" max="5">
        <input type="number" id="autoBeam" placeholder="每层保留分支数" value="8" min="1" max="30">
        <input type="text" id="autoCustomFlag" placeholder="自定义 flag 正则，例如 \\w+\\{.*?\\}" autocomplete="off">
      </div>
      <div class="result" id="autoResult"></div>
    `;

    function computeAuto() {
      const raw = mainInput();
      if (!raw || !raw.trim()) return null;
      const maxDepth = Math.min(5, Math.max(1, parseInt(param('autoDepth', '3'), 10) || 3));
      const beamWidth = Math.min(30, Math.max(1, parseInt(param('autoBeam', '8'), 10) || 8));
      const customFlag = param('autoCustomFlag', '').trim();

      // 自定义 flag 正则：临时插到最前面，命中即视为成功
      if (customFlag) {
        try {
          const re = new RegExp(customFlag);
          FLAG_PATTERNS.unshift(re);
        } catch (e) {
          console.warn('[autoDecode] 自定义 flag 正则无效，已忽略:', e.message);
        }
      }

      const started = performance.now();
      const result = autoDecode(raw, { maxDepth, beamWidth });
      const elapsed = Math.round(performance.now() - started);
      const text = renderTree(result);
      return { ...result, elapsed, lines: [text, '', `共尝试 ${result.nodes.length} 个分支，耗时 ${elapsed} ms`] };
    }

    registerCard({
      id: 'autoDecode',
      badge: '万能自动解码 尝试树',
      section: SECTION,
      needsMainInput: true,
      html: AUTO_HTML,
      resultId: 'autoResult',
      listens: ['autoDepth', 'autoBeam', 'autoCustomFlag'],
      compute() {
        const r = computeAuto();
        setResult('autoResult', r ? r.lines.join('\n') : '');
      }
    });

    // 对外暴露

    window.AutoDecode = {
      autoDecode, renderTree, scoreText, findFlag,
      OPS, FLAG_PATTERNS,
      goodCharRatio, cjkRatio, englishScore
    };

  /* ==========================================================================
   * 5. 图像处理：旋转翻转 / 通道分离 / 位平面 / LSB / 网格遮罩
   * ======================================================================== */




    // 状态与工具

    /** 当前载入的图像信息，供各按钮复用，避免每次重新读文件 */
    const state = {
      img: null,          // HTMLImageElement 或 ImageBitmap
      name: '',
      width: 0,
      height: 0,
      sourceCanvas: null, // 原始像素的 canvas（未处理的基准）
      lastCanvas: null    // 最近一次处理的结果，便于链式操作
    };

    function makeCanvas(w, h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }

    function toCanvas(image) {
      const c = makeCanvas(image.width || image.naturalWidth, image.height || image.naturalHeight);
      const ctx = c.getContext('2d');
      ctx.drawImage(image, 0, 0);
      return c;
    }

    function getImageData(canvas) {
      return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    }

    /** 把处理结果画到输出画布上 */
    function present(canvas, note) {
      state.lastCanvas = canvas;
      const host = document.getElementById('imgOutput');
      if (!host) return;
      host.innerHTML = '';
      canvas.style.maxWidth = '100%';
      canvas.style.imageRendering = 'pixelated';
      host.appendChild(canvas);
      const info = document.getElementById('imgInfo');
      if (info) {
        info.textContent = `${canvas.width} × ${canvas.height} 像素` + (note ? `  ${note}` : '');
      }
      // 同时更新 LSB 文本输出
      if (note && /LSB|位平面/.test(note)) {
        const text = extractLsbText(canvas);
        setResult('imgResult', `LSB 提取（按行优先顺序，取每个像素的最低位）：\n${text || '(未能提取出可读内容)'}`);
      }
    }

    /** 从画布提取 LSB 文本：把低位当作比特流，按 8 位组成字节 */
    function extractLsbText(canvas, channel = 0, bit = 0) {
      const data = getImageData(canvas).data;
      const bytes = [];
      let cur = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i + channel];
        cur = (cur << 1) | ((v >> bit) & 1);
        n++;
        if (n === 8) { bytes.push(cur); cur = 0; n = 0; }
      }
      // 只保留可打印部分，遇到连续空字节就截断
      let out = '';
      for (const b of bytes) {
        if (b === 0) { if (out.length > 4) break; continue; }
        out += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
      }
      return out.replace(/\.{4,}/g, ' … ').trim();
    }

    // 图像变换实现

    /** 旋转（90 的整数倍） */
    function rotate(src, deg) {
      const d = ((deg % 360) + 360) % 360;
      if (d === 0) return src;
      const swap = d === 90 || d === 270;
      const out = makeCanvas(swap ? src.height : src.width, swap ? src.width : src.height);
      const ctx = out.getContext('2d');
      ctx.translate(out.width / 2, out.height / 2);
      ctx.rotate(d * Math.PI / 180);
      ctx.drawImage(src, -src.width / 2, -src.height / 2);
      return out;
    }

    /** 翻转：h 水平 / v 垂直 */
    function flip(src, dir) {
      const out = makeCanvas(src.width, src.height);
      const ctx = out.getContext('2d');
      ctx.translate(dir === 'h' ? src.width : 0, dir === 'v' ? src.height : 0);
      ctx.scale(dir === 'h' ? -1 : 1, dir === 'v' ? -1 : 1);
      ctx.drawImage(src, 0, 0);
      return out;
    }

    /** 逐像素变换：fn(r,g,b,a) → [r,g,b,a] */
    function mapPixels(src, fn) {
      const out = makeCanvas(src.width, src.height);
      const ctx = out.getContext('2d');
      const img = getImageData(src);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = fn(d[i], d[i + 1], d[i + 2], d[i + 3]);
        d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2]; d[i + 3] = r[3];
      }
      ctx.putImageData(img, 0, 0);
      return out;
    }

    const clamp255 = v => v < 0 ? 0 : v > 255 ? 255 : v | 0;

    /** 单通道提取：显示指定通道为灰度 */
    function channelImage(src, channel) {
      const idx = { r: 0, g: 1, b: 2, a: 3 }[channel];
      return mapPixels(src, (r, g, b, a) => {
        const v = [r, g, b, a][idx];
        return [v, v, v, 255];
      });
    }

    /** 两通道相减后放大，常用于找两图差异 */
    function channelDiff(src, c1, c2, gain) {
      const i1 = { r: 0, g: 1, b: 2, a: 3 }[c1];
      const i2 = { r: 0, g: 1, b: 2, a: 3 }[c2];
      return mapPixels(src, (r, g, b, a) => {
        const arr = [r, g, b, a];
        const v = clamp255(Math.abs(arr[i1] - arr[i2]) * gain);
        return [v, v, v, 255];
      });
    }

    /**
     * 位平面：把每个通道的第 bit 位（0 = 最低位）取出来显示成黑白。
     * 藏信息最常见的手段之一：低位噪声肉眼看不出，但单独取出来就是图案。
     */
    function bitPlane(src, bit, channel) {
      const idx = channel === 'all' ? null : { r: 0, g: 1, b: 2, a: 3 }[channel];
      return mapPixels(src, (r, g, b, a) => {
        let v;
        if (idx === null) {
          // 三通道低位混合
          v = (((r >> bit) & 1) | ((g >> bit) & 1) | ((b >> bit) & 1)) ? 255 : 0;
        } else {
          v = (([r, g, b, a][idx] >> bit) & 1) ? 255 : 0;
        }
        return [v, v, v, 255];
      });
    }

    // 遮罩（Cardan grille / 网格辅助）

    let overlay = null;   // { canvas, ctx, cols, rows, hidden:Set }

    function buildOverlay() {
      if (!state.sourceCanvas) return null;
      const cols = Math.max(1, parseInt(param('imgGridCols', '8'), 10) || 8);
      const rows = Math.max(1, parseInt(param('imgGridRows', '8'), 10) || 8);
      const w = state.sourceCanvas.width, h = state.sourceCanvas.height;
      const c = makeCanvas(w, h);
      const ctx = c.getContext('2d');
      ctx.drawImage(state.sourceCanvas, 0, 0);
      // 画网格
      ctx.strokeStyle = 'rgba(64,224,255,0.85)';
      ctx.lineWidth = 1;
      for (let i = 1; i < cols; i++) {
        const x = Math.round(w * i / cols) + 0.5;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let j = 1; j < rows; j++) {
        const y = Math.round(h * j / rows) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // 格子里写编号，便于按坐标描述
      ctx.fillStyle = 'rgba(46,204,113,0.9)';
      ctx.font = `${Math.max(9, Math.round(Math.min(w, h) / (Math.max(cols, rows) * 3)))}px monospace`;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = w * i / cols, y = h * j / rows;
          ctx.fillText(`${i + 1},${j + 1}`, x + 3, y + 12);
        }
      }
      overlay = { canvas: c, ctx, cols, rows, hidden: new Set() };
      return c;
    }

    // 卡片 HTML

    const IMG_HTML = `
      <div class="grid-2">
        <input type="file" id="imgFile" accept="image/*">
        <select id="imgOp">
          <option value="">— 选择处理方式 —</option>
          <option value="rot90">旋转 90°</option>
          <option value="rot180">旋转 180°</option>
          <option value="rot270">旋转 270°</option>
          <option value="fliph">水平翻转</option>
          <option value="flipv">垂直翻转</option>
          <option value="invert">反色</option>
          <option value="gray">灰度</option>
          <option value="bright">提亮</option>
          <option value="dark">压暗</option>
          <option value="boost">增强对比度</option>
          <option value="chR">只看 R 通道</option>
          <option value="chG">只看 G 通道</option>
          <option value="chB">只看 B 通道</option>
          <option value="chA">只看 A 通道（透明度）</option>
          <option value="diffRG">R−G 相减</option>
          <option value="diffRB">R−B 相减</option>
          <option value="diffGB">G−B 相减</option>
          <option value="bit0">位平面 0（最低位）</option>
          <option value="bit1">位平面 1</option>
          <option value="bit2">位平面 2</option>
          <option value="bit3">位平面 3</option>
          <option value="bit4">位平面 4</option>
          <option value="bit5">位平面 5</option>
          <option value="bit6">位平面 6</option>
          <option value="bit7">位平面 7（最高位）</option>
          <option value="grid">叠加网格 / 遮罩</option>
          <option value="reset">回到原图</option>
        </select>
      </div>
      <div class="grid-3">
        <input type="number" id="imgGridCols" placeholder="网格列数" value="8" min="1" max="64">
        <input type="number" id="imgGridRows" placeholder="网格行数" value="8" min="1" max="64">
        <input type="number" id="imgGain" placeholder="相减放大倍数" value="4" min="1" max="64">
      </div>
      <div class="grid-2">
        <select id="imgLsbChannel">
          <option value="0">LSB 取 R 通道</option>
          <option value="1">LSB 取 G 通道</option>
          <option value="2">LSB 取 B 通道</option>
          <option value="3">LSB 取 A 通道</option>
        </select>
        <input type="number" id="imgLsbBit" placeholder="取第几位（0=最低）" value="0" min="0" max="7">
      </div>
      <div id="imgInfo" style="opacity:.7;font-size:.75rem;margin-top:.3rem;">尚未载入图片</div>
      <div id="imgOutput" style="margin-top:.6rem;overflow:auto;max-height:70vh;"></div>
      <div class="result" id="imgResult"></div>
    `;

    // 交互

    function loadFile(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片解码失败')); };
        img.src = url;
      });
    }

    async function handleFile(file) {
      if (!file) return;
      try {
        const img = await loadFile(file);
        state.img = img;
        state.name = file.name;
        state.width = img.naturalWidth;
        state.height = img.naturalHeight;
        state.sourceCanvas = toCanvas(img);
        const info = document.getElementById('imgInfo');
        if (info) {
          info.textContent = `${file.name}  ${state.width} × ${state.height} 像素  ${(file.size / 1024).toFixed(1)} KB`;
        }
        present(state.sourceCanvas, '原图');
        setResult('imgResult', '');
        console.log(`[ImageTools] 已载入 ${file.name} (${state.width}×${state.height})`);
      } catch (e) {
        setResult('imgResult', `载入失败：${e.message}`);
      }
    }

    function applyOp(op) {
      if (!state.sourceCanvas) {
        setResult('imgResult', '请先载入一张图片。');
        return;
      }
      const src = state.lastCanvas || state.sourceCanvas;
      const gain = Math.min(64, Math.max(1, parseInt(param('imgGain', '4'), 10) || 4));
      let out = src, note = '';

      switch (op) {
        case 'rot90': out = rotate(src, 90); note = '旋转 90°'; break;
        case 'rot180': out = rotate(src, 180); note = '旋转 180°'; break;
        case 'rot270': out = rotate(src, 270); note = '旋转 270°'; break;
        case 'fliph': out = flip(src, 'h'); note = '水平翻转'; break;
        case 'flipv': out = flip(src, 'v'); note = '垂直翻转'; break;
        case 'invert': out = mapPixels(src, (r, g, b, a) => [255 - r, 255 - g, 255 - b, a]); note = '反色'; break;
        case 'gray': out = mapPixels(src, (r, g, b, a) => { const v = clamp255(0.299 * r + 0.587 * g + 0.114 * b); return [v, v, v, a]; }); note = '灰度'; break;
        case 'bright': out = mapPixels(src, (r, g, b, a) => [clamp255(r + 40), clamp255(g + 40), clamp255(b + 40), a]); note = '提亮 +40'; break;
        case 'dark': out = mapPixels(src, (r, g, b, a) => [clamp255(r - 40), clamp255(g - 40), clamp255(b - 40), a]); note = '压暗 -40'; break;
        case 'boost': out = mapPixels(src, (r, g, b, a) => { const f = v => clamp255((v - 128) * 2 + 128); return [f(r), f(g), f(b), a]; }); note = '对比度 ×2'; break;
        case 'chR': out = channelImage(src, 'r'); note = 'R 通道'; break;
        case 'chG': out = channelImage(src, 'g'); note = 'G 通道'; break;
        case 'chB': out = channelImage(src, 'b'); note = 'B 通道'; break;
        case 'chA': out = channelImage(src, 'a'); note = 'A 通道'; break;
        case 'diffRG': out = channelDiff(src, 'r', 'g', gain); note = `R−G ×${gain}`; break;
        case 'diffRB': out = channelDiff(src, 'r', 'b', gain); note = `R−B ×${gain}`; break;
        case 'diffGB': out = channelDiff(src, 'g', 'b', gain); note = `G−B ×${gain}`; break;
        case 'bit0': case 'bit1': case 'bit2': case 'bit3':
        case 'bit4': case 'bit5': case 'bit6': case 'bit7': {
          const bit = parseInt(op.slice(3), 10);
          out = bitPlane(src, bit, 'all');
          note = `位平面 ${bit}`;
          break;
        }
        case 'grid': {
          const c = buildOverlay();
          if (c) { out = c; note = `网格 ${overlay.cols}×${overlay.rows}`; }
          break;
        }
        case 'reset':
          out = state.sourceCanvas; note = '原图'; state.lastCanvas = null;
          break;
        default:
          return;
      }

      present(out, note);
    }

    // 注册卡片

    registerCard({
      id: 'imageTools',
      badge: '图像处理 通道/位平面/LSB',
      section: SECTION,
      needsMainInput: false,
      html: IMG_HTML,
      resultId: 'imgResult',
      listens: [],
      compute() {
        // 图像卡不做实时计算，全部由按钮/下拉框驱动。
        // 但如果 LSB 参数变了，就重新提取一次文本。
        const canvas = state.lastCanvas;
        if (!canvas) return;
        const ch = parseInt(param('imgLsbChannel', '0'), 10) || 0;
        const bit = Math.min(7, Math.max(0, parseInt(param('imgLsbBit', '0'), 10) || 0));
        const text = extractLsbText(canvas, ch, bit);
        setResult('imgResult',
          `LSB 提取：第 ${bit} 位，${['R', 'G', 'B', 'A'][ch]} 通道\n${text || '(未能提取出可读内容)'}`);
      }
    });

    document.addEventListener('change', event => {
      const t = event.target;
      if (!t || !t.id) return;
      if (t.id === 'imgFile') {
        handleFile(t.files && t.files[0]);
        return;
      }
      if (t.id === 'imgOp') {
        const op = t.value;
        if (op) applyOp(op);
        return;
      }
      if (t.id === 'imgGridCols' || t.id === 'imgGridRows') {
        if (overlay && state.lastCanvas === overlay.canvas) applyOp('grid');
        return;
      }
    });

    document.addEventListener('input', event => {
      const t = event.target;
      if (!t || !t.id) return;
      if (t.id === 'imgLsbChannel' || t.id === 'imgLsbBit') {
        scheduleUpdateAll();
      }
    });

    // 对外暴露（便于测试与扩展）

    window.ImageTools = {
      state,
      rotate, flip, mapPixels, channelImage, channelDiff, bitPlane, extractLsbText,
      applyOp, handleFile,
      makeCanvas, toCanvas
    };
})();
