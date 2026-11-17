/**
 * PzMAgentool  PCB 引擎界面汉化
 *
 * RunFrame / PCB Viewer 的部分界面文案是英文硬编码（PCB 工具栏的 layer / errors / Rats Nest / Bounds / View，
 * 以及顶部「文件 / 视图」菜单与下拉项）。这里用 MutationObserver 在引擎渲染完成后做 DOM 级替换，
 * 不修改 vendored 的 minified 引擎包，升级引擎时更加安全。
 */
(function () {
  'use strict';

  var running = false;
  var scheduled = false;

  var LAYER_MAP = {
    top: '顶层',
    bottom: '底层',
    inner1: '内层1',
    inner2: '内层2',
    inner3: '内层3',
    inner4: '内层4',
    drill: '钻孔层',
    solder_mask: '阻焊层',
    silkscreen: '丝印层',
    courtyard: '庭院层'
  };

  // 引擎顶部菜单（文件 / 视图）及其下拉项、子菜单项；只做精确整段匹配，避免误伤其他文案。
  var MENU_TEXT_MAP = {
    'File': '文件',
    'Push': '推送',
    'Saving...': '保存中…',
    'Saving…': '保存中…',
    'Order': '下单',
    'Import': '导入',
    'AI Review': 'AI 审查',
    'Sign In': '登录',
    'Report Bug': '报告问题',
    'Report Entire Circuit': '报告整个电路',
    'Report Autorouter Bug': '报告自动布线问题',
    'Export': '导出',
    'Exporting...': '导出中…',
    'Exporting…': '导出中…',
    'Export Accessory...': '导出配件…',
    'Export Accessory…': '导出配件…',
    'Advanced': '高级',
    'CLI Admin Panel': 'CLI 管理面板',
    'Force Latest @tscircuit/eval': '强制使用最新 @tscircuit/eval',
    'Circuit JSON': '电路 JSON',
    'Simple Route JSON': '布线 JSON',
    'Fabrication Files': '制造文件（Gerber / BOM）',
    'KiCad Project': 'KiCad 工程',
    'Altium Project': 'Altium 工程',
    'KiCad Library': 'KiCad 库',
    'GLB (Binary GLTF)': 'GLB（二进制 GLTF）',
    'Pinout SVG': '引脚图 SVG',
    'Assembly STEP': '装配 STEP',
    'Schematic': '原理图',
    'Show Schematic Ports': '显示原理图端口',
    'Show Schematic Grid': '显示原理图网格',
    'Show All Trace Lengths': '显示所有走线长度',
    'Show Autorouting Animation': '显示自动布线动画',
    'Show DRC Errors': '显示 DRC 错误',
    'Show DRC Warnings': '显示 DRC 警告',
    'Show Copper Pours': '显示铺铜',
    'Show Courtyards': '显示庭院层',
    'Show Solder Mask': '显示阻焊层',
    'Show Silkscreen': '显示丝印层',
    'Show Fabrication Notes': '显示制造说明',
    'Show PCB Notes': '显示 PCB 标注',
    'Show Group Anchor Offsets': '显示分组锚点偏移',
    'Show PCB Groups': '显示 PCB 分组',
    'Show All Groups': '显示全部分组',
    'Show Named Groups': '显示命名分组',
    'Assembly': '装配图',
    'Pinout': '引脚图',
    'Analog Simulation': '模拟仿真',
    'Bom': 'BOM 清单',
    'Circuit Json': '电路 JSON',
    'Errors': '错误',
    'Render Log': '渲染日志',
    'Autorouting': '自动布线',
    'Solvers': '求解器'
  };

  function tagMenuTrigger(node, mapped) {
    if (mapped !== '文件' && mapped !== '视图') return;
    var parent = node.parentElement;
    if (parent) parent.setAttribute('data-pzma-menu-trigger', '');
  }

  function translateTextNode(node) {
    var raw = node.nodeValue;
    if (!raw) return false;
    var trimmed = raw.trim();
    if (!trimmed) return false;

    var mapped = Object.prototype.hasOwnProperty.call(MENU_TEXT_MAP, trimmed)
      ? MENU_TEXT_MAP[trimmed]
      : null;

    if (mapped === null) {
      if (trimmed === 'layer:') {
        mapped = '层:';
      } else if (trimmed === 'Rats Nest') {
        mapped = '鼠线';
      } else if (trimmed === 'Bounds') {
        mapped = '边界';
      } else if (/^View(\s*[\u25bc\u25be\u25bd]?)$/.test(trimmed)) {
        mapped = trimmed.replace(/^View/, '视图');
      } else if (/^(\d+)\s+errors?$/i.test(trimmed)) {
        mapped = trimmed.replace(/^(\d+)\s+errors?$/i, '$1 个错误');
      }
    }

    if (mapped !== null && mapped !== raw) {
      var leading = raw.match(/^\s*/)[0];
      var trailing = raw.match(/\s*$/)[0];
      node.nodeValue = leading + mapped + trailing;
      tagMenuTrigger(node, mapped);
      return true;
    }
    return false;
  }

  function translateLayerSpan(span) {
    var value = (span.textContent || '').trim().toLowerCase();
    var mapped = LAYER_MAP[value];
    if (mapped && span.textContent.trim() !== mapped) {
      span.textContent = mapped;
      return true;
    }
    return false;
  }

  function translateLayerButton(el) {
    var text = (el.textContent || '').trim();
    if (!/^layer:\s*\S+$/i.test(text) || el.children.length > 2) return false;
    var changed = false;

    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if (node.nodeType === 3 && /layer\s*:/i.test(node.nodeValue)) {
        var next = node.nodeValue.replace(/layer\s*:/i, '层:');
        if (next !== node.nodeValue) { node.nodeValue = next; changed = true; }
      }
    }

    var spans = el.querySelectorAll('span');
    for (var j = 0; j < spans.length; j++) {
      if (translateLayerSpan(spans[j])) changed = true;
    }
    return changed;
  }

  // PCB toolbar 里的 0 errors 有时会被拆成 0 +  errors 两个文本节点，
  // 因此按叶子元素整体匹配并替换，而不是只处理单个文本节点。
  function translateErrorsElement(el) {
    if (el.children.length > 0) return false;
    var text = (el.textContent || '').trim();
    var match = text.match(/^(\d+)\s+errors?$/i);
    if (!match) return false;
    var mapped = match[1] + ' 个错误';
    if (el.textContent !== mapped) {
      el.textContent = mapped;
      return true;
    }
    return false;
  }

  // 「更多视图」菜单底部的引擎版本行属于内部调试信息，直接隐藏，减少干扰。
  function hideEngineVersionRows(root) {
    var items = root.querySelectorAll('[role="menuitem"]');
    for (var i = 0; i < items.length; i++) {
      var text = (items[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (/^@tscircuit\/(?:runframe|eval)@/.test(text)) {
        items[i].style.display = 'none';
      }
    }
  }

  function translateDom(root) {
    if (running) return;
    running = true;
    try {
      hideEngineVersionRows(root);

      var all = root.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        translateLayerButton(all[i]);
        translateErrorsElement(all[i]);
      }

      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var node;
      while ((node = walker.nextNode())) {
        translateTextNode(node);
      }
    } finally {
      running = false;
    }
  }

  function scheduleTranslate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      var root = document.getElementById('root');
      if (root) translateDom(root);
      // Radix 下拉菜单通过 Portal 挂在 body 上，不在 #root 内，需要单独处理。
      var menus = document.querySelectorAll('[role="menu"]');
      for (var i = 0; i < menus.length; i++) {
        if (!root || !root.contains(menus[i])) translateDom(menus[i]);
      }
    });
  }

  function init() {
    var root = document.getElementById('root');
    if (!root) {
      requestAnimationFrame(init);
      return;
    }
    var observer = new MutationObserver(scheduleTranslate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    scheduleTranslate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();