/* =============================================================================
 * wordsearch_chinese.js — 中文查词引擎（词汇区「中文」模式）
 *
 * 数据来自 wordsearch/chinese-data/，由 tests/build-wordsearch-data.js 从
 * chinese-xinhua 的成语总表派生：
 *   index.js         元数据与分片清单
 *   hanzi.js         4866 个常用字 + 拼音
 *   idiom-<a-z>.js   约 3 万条成语，按首字声母分片，按需加载
 *   ciyu.js          约 8 千条常用词语
 *
 * 分片加载：能确定首字时只加载那一片（几十到一百多 KB），
 * 首字未知（? / * 开头，或按拼音/首字母查）才加载全部。
 *
 * 查询语法（中英文标点都接受）：
 *   定字      ? 代表一个字：中?   ?国   一??意
 *   通配      * 代表任意多个字：一*意
 *   拼音      py=zhongguo   可不带声调
 *   首字母    zm=ywdj
 *   类型      type=成语 / 词语 / 汉字
 *   排除      -不  表示结果里不要出现这个字
 * ========================================================================== */
(function () {
  'use strict';

  const DATA_DIR = './wordsearch/chinese-data/';

  /** 已加载的分片 */
  const loadedIdiom = new Map();   // key → 条目数组
  let hanziLoaded = null;          // [[字, 拼音], ...]
  let ciyuLoaded = null;           // [[词, 拼音], ...]
  let indexMeta = null;
  /** 字 → {pinyin, plain}，供分析区的逐字查询使用 */
  const hanziInfoMap = new Map();

  const TONE = {
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v',
    'ń': 'n', 'ň': 'n', 'ǹ': 'n', 'ḿ': 'm'
  };
  const stripTone = s => [...String(s || '')].map(c => TONE[c] || c).join('');
  /** 拼音串 → 无声调紧凑形式 */
  const plainOfPinyin = py => stripTone(py).replace(/\s+/g, '').toLowerCase();
  /** 拼音串 → 首字母缩写 */
  const initialsOfPinyin = py => String(py || '').trim().split(/\s+/).map(p => stripTone(p)[0] || '').join('');

  /* ---------------------------------------------------------------- 脚本加载 */

  const scriptCache = new Map();
  function loadScript(src) {
    if (scriptCache.has(src)) return scriptCache.get(src);
    const p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`加载失败: ${src}`));
      document.body.appendChild(s);
    });
    scriptCache.set(src, p);
    return p;
  }

  async function ensureIndex() {
    if (indexMeta) return indexMeta;
    await loadScript(`${DATA_DIR}index.js`);
    indexMeta = window.WORDSEARCH_DATA || { shards: [] };
    return indexMeta;
  }

  /**
   * 加载成语分片。
   *
   * 这里刻意一次性把全部分片都加载，而不做「按首字猜分片」的懒加载：
   *   - 总体量只有 1.2MB 左右（最大一片 150KB），一次性加载后查询是纯内存扫描，很快
   *   - 懒加载的判据不可靠：`一??意` 这样的定字模式首字虽是「一」，
   *     但 `py=zhongguo`、`zm=ywdj` 这类查询根本没有首字，还是得全加载
   *   - 分片保留的意义在于浏览器可以并行取、并按需缓存，而不是省总量
   * 所以预加载全部，查询时同步扫描。
   */
  async function ensureIdiom() {
    await ensureIndex();
    const all = (indexMeta.shards || []).map(s => s.key);
    await Promise.all(all.map(async key => {
      if (loadedIdiom.has(key)) return;
      loadedIdiom.set(key, []);          // 先占位，避免并发重复加载
      try {
        await loadScript(`${DATA_DIR}idiom-${key}.js`);
        loadedIdiom.set(key, window[`WORDS_IDIOM_${key.toUpperCase()}`] || []);
      } catch (e) {
        console.warn('[中文查词] 分片加载失败:', key, e.message);
      }
    }));
  }

  async function ensureHanzi() {
    if (hanziLoaded) return hanziLoaded;
    await loadScript(`${DATA_DIR}hanzi.js`);
    hanziLoaded = window.WORDS_HANZI || [];
    hanziLoaded.forEach(([ch, py]) => hanziInfoMap.set(ch, { pinyin: py, plain: stripTone(py) }));
    return hanziLoaded;
  }

  /**
   * 单字查拼音（同步）。
   *
   * 分析区的「汉字属性速查」「拼音工具箱」需要逐字拼音，走这个接口。
   * 字表是懒加载的，所以第一次调用时若还没加载会返回 null；
   * 页面初始化时会预热一次（见文件末尾），正常使用时都已经就绪。
   */
  function charInfo(ch) {
    return hanziInfoMap.get(ch) || null;
  }

  async function ensureCiyu() {
    if (ciyuLoaded) return ciyuLoaded;
    await loadScript(`${DATA_DIR}ciyu.js`);
    ciyuLoaded = window.WORDS_CIYU || [];
    return ciyuLoaded;
  }

  /* ---------------------------------------------------------------- 查询解析 */

  function tokenToRegex(token) {
    let out = '';
    for (const ch of token) {
      if (ch === '?') out += '[\\u4e00-\\u9fff]';
      else if (ch === '*') out += '[\\u4e00-\\u9fff]*';
      else out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp('^' + out + '$');
  }

  function parseQuery(raw) {
    const q = { pattern: null, patternText: '', pinyin: null, initials: null, type: null, excludes: [] };
    let text = String(raw || '').trim();
    if (!text) return q;

    text = text.replace(/(\S+?)\s*[=＝]\s*(\S*)/g, (m, key, value) => {
      const k = key.toLowerCase();
      if (k === 'py' || k === '拼音') { q.pinyin = plainOfPinyin(value); return ''; }
      if (k === 'zm' || k === '首字母') { q.initials = stripTone(value).toLowerCase(); return ''; }
      if (k === 'type' || k === '类型') { q.type = value; return ''; }
      return m;
    });

    text = text.replace(/(?:^|\s)-(\S+)/g, (m, value) => { q.excludes.push(...value); return ' '; });

    text = text.trim().replace(/\s+/g, '');
    if (text) { q.pattern = tokenToRegex(text); q.patternText = text; }
    return q;
  }

  /** 模式里首字确定时，只需要那一个分片；否则返回 null 表示要全部 */
  function shardKeysForQuery(q) {
    if (!q.patternText) return null;
    const first = q.patternText[0];
    if (first === '?' || first === '*') return null;
    const letter = stripTone(first).toLowerCase();
    return [/^[a-z]$/.test(letter) ? letter : 'other'];
  }

  /* ---------------------------------------------------------------- 匹配 */

  /**
   * 统一把条目归一成 { word, pinyin, plain, initials, kind } 再比对，
   * 避免成语/词语/汉字三条路径各写一套判断（之前就是这么写错的）。
   */
  function makeRecord(word, pinyin, kind, abbr) {
    return {
      word,
      pinyin,
      plain: plainOfPinyin(pinyin),
      initials: abbr || initialsOfPinyin(pinyin),
      kind
    };
  }

  function matchRecord(r, q) {
    if (q.type && q.type !== r.kind) return false;
    if (q.pattern && !q.pattern.test(r.word)) return false;
    if (q.pinyin && !r.plain.includes(q.pinyin)) return false;
    if (q.initials && !r.initials.includes(q.initials)) return false;
    if (q.excludes.length) {
      for (const ch of q.excludes) if (r.word.includes(ch)) return false;
    }
    return true;
  }

  /* ---------------------------------------------------------------- 主查询 */

  const KIND_ORDER = { 成语: 0, 词语: 1, 汉字: 2 };

  /**
   * 执行查询。
   * @returns {Promise<{total:number, hits:Array, note:string}>}
   */
  async function search(raw, limit = 300) {
    const q = parseQuery(raw);
    if (!q.pattern && !q.pinyin && !q.initials) {
      return { total: 0, hits: [], note: '请输入查询条件' };
    }

    const wantIdiom = !q.type || q.type === '成语';
    const wantCiyu = !q.type || q.type === '词语';
    const wantHanzi = !q.type || q.type === '汉字';

    const keys = null;   // 全部分片一起加载（见 ensureIdiom 的说明）
    const hits = [];
    const notes = [];

    if (wantIdiom) {
      await ensureIdiom();
      let scanned = 0;
      loadedIdiom.forEach(list => {
        scanned += list.length;
        list.forEach(e => {
          const r = makeRecord(e[0], e[1], '成语', e[2]);
          if (matchRecord(r, q)) hits.push(r);
        });
      });
      notes.push(`成语：扫描 ${scanned} 条`);
    }

    if (wantCiyu) {
      await ensureCiyu();
      ciyuLoaded.forEach(e => {
        const r = makeRecord(e[0], e[1], '词语');
        if (matchRecord(r, q)) hits.push(r);
      });
      notes.push(`词语：扫描 ${ciyuLoaded.length} 条`);
    }

    if (wantHanzi) {
      await ensureHanzi();
      hanziLoaded.forEach(([ch, py]) => {
        const r = makeRecord(ch, py, '汉字');
        if (matchRecord(r, q)) hits.push(r);
      });
      notes.push(`汉字：扫描 ${hanziLoaded.length} 个`);
    }

    hits.sort((a, b) => {
      const k = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
      if (k) return k;
      if (a.word.length !== b.word.length) return a.word.length - b.word.length;
      return a.word.localeCompare(b.word, 'zh');
    });

    return { total: hits.length, hits: hits.slice(0, limit), note: notes.join('　') };
  }

  /** 渲染成可读文本 */
  function render(result) {
    if (!result || !result.total) {
      return (result && result.note ? result.note + '\n\n' : '') +
        '没有匹配结果。\n\n可用条件：\n' +
        '  定字：  中?    ?国    一??意      （? 代表一个汉字）\n' +
        '  通配：  一*意   *心*             （* 代表任意多个汉字）\n' +
        '  拼音：  py=zhongguo   py=yixin\n' +
        '  首字母：zm=ywdj\n' +
        '  类型：  type=成语   type=词语   type=汉字\n' +
        '  排除：  -不  -心';
    }
    const byKind = { 成语: [], 词语: [], 汉字: [] };
    result.hits.forEach(h => (byKind[h.kind] || (byKind[h.kind] = [])).push(h));

    const lines = [`匹配 ${result.total} 条${result.total > result.hits.length ? `（只显示前 ${result.hits.length} 条）` : ''}`];
    if (result.note) lines.push(result.note);
    lines.push('');

    ['成语', '词语', '汉字'].forEach(kind => {
      const list = byKind[kind];
      if (!list || !list.length) return;
      lines.push(`【${kind}】${list.length} 条`);
      if (kind === '汉字') {
        for (let i = 0; i < list.length; i += 10) {
          lines.push('  ' + list.slice(i, i + 10).map(h => `${h.word}(${h.pinyin})`).join('  '));
        }
      } else {
        list.forEach(h => lines.push(`  ${h.word}   ${h.pinyin}   ${h.initials}`));
      }
      lines.push('');
    });
    lines.push('提示：拼音与首字母都做了去声调处理，输入 zhongguo 或 zg 都能查到。');
    return lines.join('\n');
  }

  /** 预热：字表（小、必须同步可用）+ 全部成语分片 + 词语表 */
  async function preload() {
    await ensureIndex();
    await ensureHanzi();
    await Promise.all([ensureIdiom(), ensureCiyu()]);
    return window.ZhongwenSearch.stats;
  }

  window.ZhongwenSearch = {
    search, render, parseQuery, stripTone, charInfo, ensureHanzi, preload,
    /** 字表总览：字 → 拼音，供「按声调找字」这类整表扫描用 */
    get hanziEntries() { return hanziLoaded || []; },
    get stats() {
      return indexMeta ? {
        idiom: indexMeta.totalIdiom,
        hanzi: indexMeta.totalHanzi,
        ciyu: indexMeta.totalCiyu,
        source: indexMeta.source,
        loaded: loadedIdiom.size
      } : null;
    }
  };

  // 预热：先加载字表（约 72KB，分析区的逐字查询需要同步取拼音），
  // 成语与词语表体积较大，等页面空闲时再加载，避免拖慢首屏。
  ensureIndex()
    .then(() => ensureHanzi())
    .then(() => new Promise(r => (typeof requestIdleCallback === 'function'
      ? requestIdleCallback(r, { timeout: 3000 })
      : setTimeout(r, 300))))
    .then(() => Promise.all([ensureIdiom(), ensureCiyu()]))
    .then(() => console.log('[中文查词] 词库已就绪:', JSON.stringify(window.ZhongwenSearch.stats)))
    .catch(e => console.warn('[中文查词] 预热失败:', e.message));
})();
