/**
 * PzMAgentool  PCB 设计 / 仿真工作台前端控制
 *
 * - 左侧 main.tsx 代码编辑；右侧嵌入本地 tscircuit RunFrame 引擎。
 * - 代码保存到 localStorage：pzma-pcb-code。
 * - 运行/重新载入：给 viewer.html 加时间戳重新加载，viewer 读取最新代码并重新渲染。
 * - 引擎 ready/error 消息会转发给父页面（电子实验室），用于控制 iframe 加载遮罩。
 */
(function () {
  'use strict';

  var CODE_STORAGE_KEY = 'pzma-pcb-code';
  var TEMPLATE_STORAGE_KEY = 'pzma-pcb-template';
  var BOARD_VERSION_KEY = 'pzma-pcb-board-version';
  var BOARD_VERSION = '2026-dfx-v1';
  var ACTIVE_CODE_KEY = 'pzma-pcb-active-code';
  var ASSET_VERSION = '20261023-18';

  var TEMPLATES = {
    'main': { label: 'DFX 参考板 (双 LED)', url: './circuits/main.tsx' },
    'routed-board': { label: '已自动布线 LED 板', url: './circuits/routed-board.tsx' },
    'rc-filter': { label: 'RC 低通滤波仿真', url: './circuits/rc-filter.tsx' }
  };

  var FALLBACK_CODE = [
    'export default () => (',
    '  <board routingDisabled>',
    '    <voltagesource name="V1" voltage="5V" />',
    '    <resistor name="R1" resistance="1k" footprint="0603" />',
    '    <led name="D1" footprint="0603" color="red" />',
    '    <trace from=".V1 > .pin1" to=".R1 > .pin1" />',
    '    <trace from=".R1 > .pin2" to=".D1 > .pin1" />',
    '    <trace from=".D1 > .pin2" to=".V1 > .pin2" />',
    '    <voltageprobe name="VP_LED" connectsTo=".D1 > .pin1" />',
    '    <analogsimulation duration="10ms" timePerStep="0.1ms" spiceEngine="spicey" />',
    '  </board>',
    ')',
    ''
  ].join('\n');

  var editor = document.getElementById('pcb-code-editor');
  var editorStatus = document.getElementById('pcb-editor-status');
  var runBtn = document.getElementById('pcb-run-btn');
  var resetBtn = document.getElementById('pcb-reset-btn');
  var exportBtn = document.getElementById('pcb-export-btn');
  var importInput = document.getElementById('pcb-import-input');
  var templateSelect = document.getElementById('pcb-template-select');
  var viewerFrame = document.getElementById('pcb-viewer-frame');
  var viewerLoading = document.getElementById('pcb-viewer-loading');
  var viewerLoadingText = document.getElementById('pcb-viewer-loading-text');
  var viewerLoadingSub = document.getElementById('pcb-viewer-loading-sub');
  var editorPane = document.getElementById('pcb-editor-pane');
  var sidebarToggle = document.getElementById('pcb-sidebar-toggle');
  var sidebarToggleIcon = document.getElementById('pcb-sidebar-toggle-icon');
  var SIDEBAR_STORAGE_KEY = 'pzma-pcb-sidebar-collapsed';

  if (!editor || !viewerFrame) {
    console.warn('[PCBLayout] required DOM elements not found');
    return;
  }

  var templateCache = Object.create(null);
  var saveTimer = null;
  var viewerBootTimer = null;

  function setEditorStatus(text, isError) {
    if (!editorStatus) return;
    editorStatus.textContent = text;
    editorStatus.classList.toggle('error', !!isError);
  }

  function setViewerLoading(active, text, subText, isError) {
    if (!viewerLoading) return;
    viewerLoading.classList.toggle('active', !!active);
    viewerLoading.classList.toggle('error', !!isError);
    if (text) viewerLoadingText.textContent = text;
    if (subText) viewerLoadingSub.textContent = subText;
  }

  function setSidebarCollapsed(collapsed, persist) {
    if (!editorPane || !sidebarToggle) return;
    editorPane.classList.toggle('collapsed', !!collapsed);
    var studio = document.querySelector('.pcb-studio');
    if (studio) studio.classList.toggle('side-collapsed', !!collapsed);

    sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
    sidebarToggle.setAttribute('aria-label', collapsed ? '展开代码侧边栏' : '收起代码侧边栏');
    sidebarToggle.setAttribute('title', collapsed ? '展开代码侧边栏' : '收起代码侧边栏');
    if (sidebarToggleIcon) {
      sidebarToggleIcon.textContent = String.fromCharCode(collapsed ? 8250 : 8249);
    }

    if (persist) {
      try { localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
    }
  }

  function postToLab(type, payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(Object.assign({ source: 'pzma-pcblayout', type: type }, payload || {}), '*');
      }
    } catch (e) { /* ignore */ }
  }

  function saveCode(code) {
    try { localStorage.setItem(CODE_STORAGE_KEY, code); } catch (e) { /* ignore */ }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveCode(editor.value);
      setEditorStatus('已自动保存');
    }, 350);
  }

  async function fetchTemplateText(templateId) {
    var tpl = TEMPLATES[templateId] || TEMPLATES.main;
    if (templateCache[tpl.url]) return templateCache[tpl.url];
    try {
      var response = await fetch(tpl.url + '?v=' + ASSET_VERSION, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var text = await response.text();
      templateCache[tpl.url] = text;
      return text;
    } catch (err) {
      console.warn('[PCBLayout] 无法加载模板 ' + tpl.url + '，使用内置示例。', err);
      return FALLBACK_CODE;
    }
  }

  function setEditorCode(code) {
    editor.value = code || FALLBACK_CODE;
    editor.scrollTop = 0;
    editor.scrollLeft = 0;
    saveCode(editor.value);
  }

  async function loadTemplate(templateId, silent) {
    if (templateSelect && TEMPLATES[templateId]) {
      templateSelect.value = templateId;
    }
    var code = await fetchTemplateText(templateId);
    setEditorCode(code);
    try { localStorage.setItem(TEMPLATE_STORAGE_KEY, templateId); } catch (e) { /* ignore */ }
    if (!silent) setEditorStatus('已载入示例：' + ((TEMPLATES[templateId] && TEMPLATES[templateId].label) || templateId));
    return code;
  }

  function startViewer() {
    clearTimeout(viewerBootTimer);
    setViewerLoading(true, '正在启动 tscircuit 引擎', '首次加载约 10–20 秒；进入电子实验室后已开始后台预热');
    // 把编辑器当前的代码快照交给 viewer，避免 viewer 读到旧的 localStorage 内容。
    var codeRev = Date.now().toString(36) + '-' + Math.random().toString(16).slice(2, 8);
    try {
      sessionStorage.setItem(ACTIVE_CODE_KEY, JSON.stringify({ rev: codeRev, code: editor.value }));
    } catch (e) { /* ignore */ }
    // 给 iframe 设置带时间戳的 src，避免浏览器缓存旧 viewer.html 状态。
    viewerFrame.src = './viewer.html?t=' + Date.now() + '&codeRev=' + encodeURIComponent(codeRev);
    // 兜底：若 90 秒后仍未收到 ready/error，给出提示（不强制隐藏，避免误判）。
    viewerBootTimer = setTimeout(function () {
      if (viewerLoading && viewerLoading.classList.contains('active')) {
        setViewerLoading(true, '引擎仍在加载', '如果长时间无响应，请确认通过本地 HTTP 服务访问，并检查浏览器控制台。');
      }
    }, 90000);
  }

  function runCode() {
    var code = editor.value.trim();
    if (!code) {
      setEditorStatus('代码为空，无法运行', true);
      editor.focus();
      return;
    }
    saveCode(editor.value);
    setEditorStatus('正在重新载入引擎...');
    startViewer();
  }

  async function boot() {
    // 1. 读取上次保存的代码；没有则载入默认模板。
    var storedCode = null;
    var storedTemplate = 'main';
    var storedBoardVersion = '';
    try {
      storedCode = localStorage.getItem(CODE_STORAGE_KEY);
      storedTemplate = localStorage.getItem(TEMPLATE_STORAGE_KEY) || 'main';
      storedBoardVersion = localStorage.getItem(BOARD_VERSION_KEY) || '';
    } catch (e) { /* ignore */ }

    // 模板下拉只保留 DFX 参考板，旧版本保存的其他模板统一回落到 main。
    if (!TEMPLATES[storedTemplate]) storedTemplate = 'main';

    // 旧版工业板示例（PZM-ECU-01）布线/原理图过于杂乱，升级后一次性换成 DFX 参考板；
    // 迁移完成后记录新版本号，之后不再覆盖用户自己修改过的内容。
    if (storedBoardVersion !== BOARD_VERSION && /PZM-ECU-01/.test(storedCode || '')) {
      storedCode = null;
      storedTemplate = 'main';
    }

    if (storedTemplate && TEMPLATES[storedTemplate] && templateSelect) {
      templateSelect.value = storedTemplate;
    }

    if (storedCode && storedCode.trim()) {
      editor.value = storedCode;
      setEditorStatus('已恢复上次的代码');
    } else {
      await loadTemplate(storedTemplate || 'main', true);
      setEditorStatus('已载入默认示例');
    }

    try {
      localStorage.setItem(BOARD_VERSION_KEY, BOARD_VERSION);
    } catch (e) { /* ignore */ }

    // 代码侧边栏：恢复上次的收起状态，并绑定切换把手。
    var sidebarCollapsed = false;
    try { sidebarCollapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'; } catch (e) { /* ignore */ }
    setSidebarCollapsed(sidebarCollapsed, false);
    if (sidebarToggle && editorPane) {
      sidebarToggle.addEventListener('click', function (event) {
        event.preventDefault();
        setSidebarCollapsed(!editorPane.classList.contains('collapsed'), true);
      });
    }

    // 2. 事件绑定
    runBtn.addEventListener('click', function (event) {
      event.preventDefault();
      runCode();
    });

    resetBtn.addEventListener('click', async function (event) {
      event.preventDefault();
      var id = (templateSelect && templateSelect.value) || 'main';
      await loadTemplate(id);
      runCode();
    });

    templateSelect.addEventListener('change', async function () {
      var id = templateSelect.value;
      setEditorStatus('正在载入示例...');
      await loadTemplate(id);
      runCode();
    });

    editor.addEventListener('input', scheduleSave);
    editor.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        runCode();
      }
    });

    exportBtn.addEventListener('click', function (event) {
      event.preventDefault();
      try {
        var blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'main.tsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        setEditorStatus('已导出 main.tsx');
      } catch (err) {
        setEditorStatus('导出失败：' + err.message, true);
      }
    });

    importInput.addEventListener('change', function () {
      var file = importInput.files && importInput.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        setEditorStatus('文件过大（建议 < 2MB）', true);
        importInput.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        setEditorCode(String(reader.result || ''));
        setEditorStatus('已导入：' + file.name);
        runCode();
      };
      reader.onerror = function () {
        setEditorStatus('文件读取失败', true);
      };
      reader.readAsText(file, 'utf-8');
      importInput.value = '';
    });

    // 3. 监听 viewer 引擎事件
    window.addEventListener('message', function (event) {
      var data = event.data || {};
      if (data.source !== 'pzma-pcb-engine') return;
      if (data.type === 'ready') {
        clearTimeout(viewerBootTimer);
        setViewerLoading(false);
        setEditorStatus('引擎已就绪');
        postToLab('ready');
      } else if (data.type === 'error') {
        clearTimeout(viewerBootTimer);
        setViewerLoading(true, '引擎启动失败', data.message || '未知错误', true);
        setEditorStatus('引擎启动失败', true);
        postToLab('error', { message: data.message || '未知错误' });
      }
    });

    // 4. 首屏启动引擎。先把编辑器中的代码写入 localStorage，保证 viewer 与编辑器一致。
    saveCode(editor.value);
    startViewer();

    // Agentmaster / 电子实验室宿主页调用：控制左侧 main.tsx 面板。
    window.PzmaPcbEditor = {
      getCode: function () {
        return editor.value;
      },
      setCode: function (code, options) {
        options = options || {};
        var next = String(code == null ? '' : code);
        if (!next.trim()) return { ok: false, message: 'TSX 代码为空' };
        setEditorCode(next);
        setSidebarCollapsed(false, true);
        if (options.run !== false) runCode();
        setEditorStatus(options.reason || 'Agentmaster 已写入 main.tsx');
        try { editor.focus(); } catch (e) { /* ignore */ }
        return { ok: true, message: '已写入 main.tsx（' + next.length + ' 字符）' };
      },
      run: function () {
        runCode();
        return { ok: true, message: '已重新运行 main.tsx' };
      },
      openSidebar: function () {
        setSidebarCollapsed(false, true);
        return { ok: true, message: '已展开代码侧栏' };
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
