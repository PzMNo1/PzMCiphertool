/* =============================================================================
 * 背景：加密实验室里很多算法其实是"藏"在卡片的下拉选项里的，例如
 *   - 维吉尼亚卡：Beaufort / Variant Beaufort / Autokey / Gronsfeld / Porta
 *   - 栅栏卡：Route / Scytale / AMSCO / Myszkowski
 *   - 摩尔斯卡：Fractionated Morse
 *   - 仿射、A1Z26、ROT、Base 编码等也都带多个子模式
 * 但侧边栏搜索和卡片内快速定位只认卡片标签，用户搜「Porta」是搜不到的。
 *
 * 本文件做两件事：
 *   1. 维护「算法 → 卡片」的别名索引，让搜索可以直接命中子算法
 *   2. 把别名渲染成卡片内置的「算法索引」入口，点击即选中对应下拉项
 * ========================================================================== */
(function () {
  'use strict';

  /**
   * 别名索引：cardId 是承载该算法的卡片 id（数据驱动卡片）或 null（表示经典区里的
   * 传统卡片，用 badge 文字定位）；selectId 是该算法所在的下拉框 id。
   *
   * 两种切换方式二选一：
   *   - 有下拉框：给 selectId，点击索引项即选中对应 option 并派发 change
   *   - 没有下拉框：给 apply(value)，由卡片自己切换模式（例如汉字编码卡组）
   */
  const ALIAS_INDEX = [
    {
      label: '维吉尼亚 / 多表替换家族',
      cardBadge: '维吉尼亚 Vigenère',
      selectId: 'vigenereVariant',
      items: [
        { name: 'Beaufort 博福特', value: 'beaufort', hint: '密钥减明文，自反' },
        { name: 'Variant Beaufort 变体博福特', value: 'variantBeaufort', hint: '明文减密钥' },
        { name: 'Autokey 自主密钥', value: 'autokey', hint: '明文续密钥，抗卡西斯基' },
        { name: 'Gronsfeld 格龙斯费尔德', value: 'gronsfeld', hint: '数字密钥逐位位移' },
        { name: 'Porta 波尔塔', value: 'porta', hint: '13 组密钥对，自反' }
      ]
    },
    {
      label: '换位密码家族',
      cardBadge: '栅栏 Rail Fence',
      selectId: 'railVariant',
      items: [
        { name: 'Route Transposition 路由换位', value: 'route', hint: '螺旋路径读出' },
        { name: 'Scytale 斯巴达棒', value: 'scytale', hint: '等价柱状换位' },
        { name: 'AMSCO', value: 'amsco', hint: '1/2 交替填充后按列序读' },
        { name: 'Myszkowski 米什科夫斯基', value: 'myszkowski', hint: '密钥重复字母整行一起读' }
      ]
    },
    {
      label: '摩尔斯家族',
      cardBadge: '摩尔斯 Morse',
      selectId: 'morseVariant',
      items: [{ name: 'Fractionated Morse 分数化摩尔斯', value: 'fractionated', hint: '摩尔斯转三分组后用密钥字母表还原' }]
    },
    {
      label: '符号密码家族',
      cardBadge: 'Pigpen / 跳舞的小人 符号密码',
      selectId: 'symbolCipherType',
      items: [
        { name: 'Pigpen 共济会密码 / 猪圈密码', value: 'pigpen', hint: '井字与 X 格 + 点' },
        { name: 'Dancing Men 跳舞的小人', value: 'dancingMen', hint: '柯南道尔原著小人，含旗子' }
      ]
    },
    {
      label: '旗语与盲文',
      cardBadge: '旗语-盲文 Semaphore-Braille',
      selectId: 'qiyuType',
      items: [
        { name: 'Semaphore 旗语', value: 'semaphore', hint: '双旗八方位' },
        { name: 'Braille 盲文', value: 'braille', hint: '六点凸字' }
      ]
    },
    {
      label: 'ROT 旋转家族',
      cardBadge: 'ROT 旋转加密',
      selectId: 'rotOutputType',
      items: [
        { name: 'ROT5 数字旋转', value: 'rot5', hint: '只转数字' },
        { name: 'ROT13 字母旋转', value: 'rot13', hint: '只转字母' },
        { name: 'ROT18 数字+字母', value: 'rot18', hint: 'ROT5 与 ROT13 复合' },
        { name: 'ROT47 可打印字符旋转', value: 'rot47', hint: '覆盖全部可见 ASCII' }
      ]
    },
    {
      label: 'A1Z26 字母序号',
      cardBadge: 'A1Z26 字母序号',
      selectId: 'a1z26Mode',
      items: [
        { name: 'A=1, Z=26', value: 'a1', hint: '标准编号' },
        { name: 'A=0, Z=25', value: 'a0', hint: '从 0 起编号，常见于编程题' }
      ]
    },
    {
      // 这张卡没有下拉框：查法清单和「当前查法」都是卡片自己的状态，
      // 所以条目直接取 CCCHandler.MODES，点击交给 CCCHandler.setMode() —— 
      // 这里只负责「连接到卡片」，不负责知道它怎么重算。
      // 注意 CCCHandler 是顶层 const（全局词法绑定，不是 window 属性），
      // 所以只能用 typeof 探测，写 window.CCCHandler 会永远取到 undefined。
      label: '汉字编码卡组',
      cardBadge: '汉字编码卡组 电码/区位/GBK/部首',
      apply: value => { CCCHandler.setMode(value); },
      items: (typeof CCCHandler !== 'undefined' && CCCHandler.MODES
        ? CCCHandler.MODES
        : []
      ).map(m => ({ name: m.label, value: m.id, hint: m.hint }))
    }
  ];

  /**
   * 扁平化的别名表：**所有**子算法入口的唯一数据源。
   *
   * 侧边栏搜索、卡片内算法索引按钮、gotoAlgorithm 跳转都从这里取，
   * 不再各自把「组 + 条目」拼成另一种形状 —— 以前是三处各拼一遍
   * （搜索表、索引按钮的 dataset、gotoAlgorithm 的字面量），
   * 加一个字段就得记得改三个地方。
   *
   * 每个别名自带所在组，所以拿到一个别名就能直接切换，不用回头找组。
   */
  const aliases = [];

  ALIAS_INDEX.forEach(group => {
    const items = Array.isArray(group.items) ? group.items : [];
    // 条目为空的组直接丢掉：卡片文件没加载成功时 MODES 会取不到，
    // 留一个空组只会渲染出一个点不动的「算法索引 0 个」块。
    if (!items.length) return;
    // 既没有下拉框也没给 apply 的组点了不会生效，属于配置漏写，明说出来
    if (!group.selectId && typeof group.apply !== 'function') {
      console.warn(`[CipherCardIndex] 别名组「${group.label}」既没有 selectId 也没有 apply，点它不会有反应`);
    }
    items.forEach((item, idx) => {
      aliases.push({
        text: item.name,
        hint: item.hint,
        value: item.value,
        badge: group.cardBadge,
        selectId: group.selectId,
        apply: group.apply,
        group,
        /** 该条目在自己组里的下标，卡片内索引按钮用它定位 */
        indexInGroup: idx
      });
    });
  });
  const ALIAS_GROUPS = ALIAS_INDEX.filter(g => Array.isArray(g.items) && g.items.length);

  /* ------------------------------------------------------------------ 跳转 */

  /** 滚动到某张卡片（按 badge 文字定位），并高亮 */
  function scrollToCard(badgeText) {
    let target = null;
    document.querySelectorAll('.card').forEach(card => {
      const badge = card.querySelector('.badge');
      if (badge && badge.textContent.trim().indexOf(badgeText.split(' ')[0]) === 0) target = target || card;
    });
    if (!target) {
      document.querySelectorAll('.card').forEach(card => {
        const badge = card.querySelector('.badge');
        if (!target && badge && badge.textContent.includes(badgeText.replace(/\s*\/.*/, '').trim())) target = card;
      });
    }
    if (!target) return null;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('card-highlight');
    setTimeout(() => target.classList.remove('card-highlight'), 2200);
    return target;
  }

  /** 归一化下拉项文字：忽略空白与常见标点，便于「ROT5 数字旋转」↔「ROT5」这类宽松匹配 */
  function normalizeLabel(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[\s·、,，:：/\\|()（）[\]【】-]+/g, '');
  }

  /**
   * 在 select 里找别名对应的选项：value 精确 → 文字精确 → 归一化前缀。
   * 找不到就返回 null（调用方会告警），避免「点了没反应」这种静默失效。
   */
  function resolveOption(select, alias) {
    const opts = Array.from(select.options);
    const byValue = opts.find(o => o.value === alias.value);
    if (byValue) return byValue;
    const name = String(alias.name || '').trim();
    const byText = opts.find(o => o.textContent.trim() === name);
    if (byText) return byText;
    const wanted = normalizeLabel(name);
    if (!wanted) return null;
    return opts.find(o => {
      const text = normalizeLabel(o.textContent);
      return Boolean(text) && (text.startsWith(wanted) || wanted.startsWith(text));
    }) || null;
  }

  /**
   * 搜索并跳转到某个子算法：选中下拉项（或交给卡片自己切换）+ 触发重算
   * @param {Object} alias
   * @param {Object} [opts]
   * @param {boolean} [opts.scroll=true] 是否滚动定位并高亮卡片。
   *        卡片内的「算法索引」按钮传 false —— 卡片本来就在眼前，不需要再跳一下。
   */
  function gotoAlgorithm(alias, opts) {
    if (!alias) return false;
    const wantScroll = !opts || opts.scroll !== false;
    const card = wantScroll ? scrollToCard(alias.badge) : findCard(alias.badge);
    const select = alias.selectId ? document.getElementById(alias.selectId) : null;
    let handledByCard = false;
    if (select) {
      const opt = resolveOption(select, alias);
      if (opt) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        console.warn(`[CipherCardIndex] #${alias.selectId} 里找不到「${alias.name}」对应的选项，切换未生效`);
      }
    } else if (typeof alias.apply === 'function') {
      // 卡片没有下拉框，由它自己切换模式并重算（它自己会写结果）
      alias.apply(alias.value, alias);
      handledByCard = true;
    }
    // 只有真改了下拉框才需要惊动全局重算：apply 路径下卡片自己已经算完，
    // 再刷新一次会连带触发传统卡片的 updateAll，把这张（不依赖主输入的）卡的结果清掉
    if (!handledByCard && typeof scheduleUpdateAll === 'function') scheduleUpdateAll();
    return Boolean(card);
  }

  /* ------------------------------------------------------------------ 卡片内的算法索引 */

  /** 取某个组在扁平别名表里的那一段（顺序与 group.items 一致） */
  function aliasesOfGroup(group) {
    return aliases.filter(a => a.group === group);
  }

  /** 给一张卡片挂上某个别名组的「算法索引」折叠块 */
  function mountAliasGroup(group) {
    const card = findCard(group.cardBadge);
    if (!card) return null;
    if (card.querySelector('.card-alias-index')) return null;

    const groupAliases = aliasesOfGroup(group);
    if (!groupAliases.length) return null;

    const details = document.createElement('details');
    details.className = 'card-usage card-alias-index';
    details.innerHTML =
      `<summary>算法索引 · ${groupAliases.length} 个可直接切换的子算法</summary>` +
      '<div class="card-usage__body"><div class="card-alias-list">' +
      groupAliases.map(a =>
        `<button type="button" class="card-alias-btn" data-alias-idx="${a.indexInGroup}">` +
        `<span class="card-alias-btn__name">${escapeHtml(a.text)}</span>` +
        `<span class="card-alias-btn__hint">${escapeHtml(a.hint || '')}</span>` +
        '</button>'
      ).join('') +
      '</div></div>';

    details.addEventListener('click', event => {
      const btn = event.target.closest('.card-alias-btn');
      if (!btn) return;
      // 直接查扁平表拿别名对象，不再现场拼一个 —— 拼出来的那份迟早和表里的不一致
      const alias = groupAliases[Number(btn.dataset.aliasIdx)];
      if (!alias) return;
      // scroll:false —— 卡片内的索引按钮只切换算法，不再把视口拽到卡片上
      gotoAlgorithm(alias, { scroll: false });
    });

    // 插到第一个 result 之后，保持既有卡片结构不变
    const firstResult = card.querySelector('.result');
    if (firstResult && firstResult.nextSibling) card.insertBefore(details, firstResult.nextSibling);
    else card.appendChild(details);
    return details;
  }

  /** 给每张带变体的卡片追加一个可折叠的「算法索引」 */
  function mountAliasIndex() {
    ALIAS_GROUPS.forEach(mountAliasGroup);
  }

  /**
   * 注册一个别名组（卡片自己声明自己的子算法）。
   * 注册后既会出现在卡片内的「算法索引」里，也会进侧边栏搜索的别名表 ——
   * 走的是同一张扁平表，所以两边不会各说各话。
   */
  function registerAliasGroup(group) {
    if (!group || !Array.isArray(group.items) || !group.items.length || !group.cardBadge) return null;
    const exists = ALIAS_INDEX.some(g => g.cardBadge === group.cardBadge && g.label === group.label);
    if (exists) return group;
    ALIAS_INDEX.push(group);
    group.items.forEach((item, idx) => aliases.push({
      text: item.name,
      hint: item.hint,
      value: item.value,
      badge: group.cardBadge,
      selectId: group.selectId,
      apply: group.apply,
      group,
      indexInGroup: idx
    }));
    mountAliasGroup(group);
    return group;
  }

  /**
   * 按 badge 文字找卡片。
   * 卡片徽章上常带后缀（「汉字编码卡组 电码/区位/GBK/部首」），
   * 所以先精确匹配，再退化成「徽章以该文字开头」，避免为了对齐后缀而重复维护字符串。
   */
  function findCard(badgeText) {
    const want = String(badgeText || '').replace(/\s+/g, ' ').trim();
    const cards = Array.from(document.querySelectorAll('.card'));
    const badgeOf = card => {
      const badge = card.querySelector('.badge');
      return badge ? badge.textContent.replace(/\s+/g, ' ').trim() : '';
    };
    return cards.find(c => badgeOf(c) === want) ||
      cards.find(c => badgeOf(c).startsWith(want)) ||
      null;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
  }

  /* ------------------------------------------------------------------ 搜索接入 */

  /** 在当前输入里搜索别名；返回第一条命中的别名 */
  function findAlias(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return null;
    return aliases.find(a =>
      a.text.toLowerCase().includes(q) ||
      String(a.value).toLowerCase() === q ||
      a.badge.toLowerCase().includes(q)
    ) || null;
  }

  /* ------------------------------------------------------------------ 初始化 */

  function initCipherCardIndex() {
    mountAliasIndex();
  }

  // 卡片挂载完成后初始化，保证经典区/现代区的传统卡片已在 DOM 中
  document.addEventListener('cipher-cards-mounted', initCipherCardIndex);
  // 兜底：若挂载事件早于本文件加载，DOM 就绪后再试一次
  if (document.readyState !== 'loading') setTimeout(initCipherCardIndex, 0);
  else document.addEventListener('DOMContentLoaded', () => setTimeout(initCipherCardIndex, 0));

  window.CipherCardIndex = {
    ALIAS_INDEX,
    ALIAS_GROUPS,
    /** 扁平别名表：侧边栏搜索与算法索引共用这一份 */
    aliases,
    findAlias,
    gotoAlgorithm,
    scrollToCard,
    findCard,
    registerAliasGroup,
    mountAliasIndex,
    init: initCipherCardIndex
  };
})();
