/**
 * PzMAgentool  PCB 引擎界面汉化
 *
 * RunFrame / PCB Viewer 的部分工具栏文案是英文硬编码（layer / errors / Rats Nest / Bounds / View）。
 * 这里用 MutationObserver 在引擎渲染完成后做 DOM 级替换，不修改 vendored 的 minified 引擎包，
 * 升级引擎时更加安全。
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

  function translateTextNode(node) {
    var raw = node.nodeValue;
    if (!raw) return false;
    var trimmed = raw.trim();
    if (!trimmed) return false;

    var mapped = null;
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

    if (mapped !== null && mapped !== raw) {
      var leading = raw.match(/^\s*/)[0];
      var trailing = raw.match(/\s*$/)[0];
      node.nodeValue = leading + mapped + trailing;
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

  function translateDom(root) {
    if (running) return;
    running = true;
    try {
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
    });
  }

  function init() {
    var root = document.getElementById('root');
    if (!root) {
      requestAnimationFrame(init);
      return;
    }
    var observer = new MutationObserver(scheduleTranslate);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    scheduleTranslate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();