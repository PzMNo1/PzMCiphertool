/**
 * 电子实验室模块初始化脚本
 * - 电路模拟：内嵌 Falstad CircuitJS
 * - 电路板布局：内嵌 tscircuit PCB 设计 / 仿真引擎（electronic/PCBLayout）
 * - 右上角单个按钮在【电路模拟】/【电路板布局】之间切换
 */

var ELECTRONIC_LAB_CIRCUIT_VERSION = '20261030-31';
var ELECTRONIC_LAB_CIRCUIT_SRC = './electronic/war/circuitjs.html?v=' + ELECTRONIC_LAB_CIRCUIT_VERSION;
var ELECTRONIC_LAB_PCB_VERSION = '20261027-16';
var ELECTRONIC_LAB_PCB_SRC = './electronic/PCBLayout/index.html?v=' + ELECTRONIC_LAB_PCB_VERSION;

var electronicLabPcbReady = false;
var electronicLabPcbFallbackTimer = null;
var electronicLabPcbPrewarmTimer = null;

function electronicLabGet(id) {
    return document.getElementById(id);
}

function initElectronicLab() {
    console.log('Initializing Electronic Lab...');
    var frame = electronicLabGet('circuit-frame');
    var loading = electronicLabGet('circuit-loading');

    if (!frame || !loading) {
        console.warn('Circuit frame or loading element not found.');
        return;
    }

    // 避免重复初始化时重复绑定事件。
    if (frame.dataset.bound !== 'true') {
        frame.dataset.bound = 'true';

        var loadTimeout = setTimeout(function () {
            if (loading.classList.contains('active')) {
                console.warn('Iframe load timeout, forcing remove mask.');
                loading.classList.remove('active');
            }
        }, 5000);

        frame.onload = function () {
            clearTimeout(loadTimeout);
            loading.classList.remove('active');
            electronicLabUpdateCircuitScale();
            console.log('Falstad Engine Loaded');
        };

        try {
            if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
                console.log('Iframe already loaded, triggering handler manually.');
                frame.onload();
            }
        } catch (e) {
            // iframe 尚未完成加载或被浏览器策略限制时忽略。
        }

        window.loadCircuit = function (circuitName, btnElement) {
            document.querySelectorAll('.ctrl-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            if (btnElement) btnElement.classList.add('active');
            if (loading) loading.classList.add('active');
            if (frame) frame.src = ELECTRONIC_LAB_CIRCUIT_SRC + '&startCircuit=' + encodeURIComponent(circuitName);
        };

        window.resetFrame = function () {
            if (loading) loading.classList.add('active');
            if (frame) frame.src = frame.src;
        };
    }

    electronicLabInitSubmoduleToggle();
}

/**
 * 切换到电路模拟时，按需懒加载 CircuitJS iframe。
 */
function electronicLabEnsureCircuitFrameLoaded() {
    var frame = electronicLabGet('circuit-frame');
    var loading = electronicLabGet('circuit-loading');
    if (!frame) return;
    if (!frame.getAttribute('src')) {
        if (loading) loading.classList.add('active');
        frame.src = frame.getAttribute('data-src') || ELECTRONIC_LAB_CIRCUIT_SRC;
    }
}

/**
 * 切换到电路板布局时，按需懒加载 tscircuit PCBLayout iframe。
 */
function electronicLabEnsurePcbFrameLoaded() {
    var frame = electronicLabGet('pcb-frame');
    var loading = electronicLabGet('pcb-loading');
    if (!frame) return;
    var needsReload = !frame.getAttribute('src') || frame.dataset.failed === 'true';
    if (needsReload) {
        frame.dataset.failed = 'false';
        if (loading) loading.classList.add('active');
        var baseSrc = ELECTRONIC_LAB_PCB_SRC;
        frame.src = baseSrc + (baseSrc.indexOf('?') >= 0 ? '&' : '?') + 'retry=' + Date.now();
    } else if (!electronicLabPcbReady && loading) {
        loading.classList.add('active');
    }
}

/**
 * 进入电子实验室后，趁用户查看电路模拟时在后台预热 PCB 引擎。
 * 这样切到“电路板布局”时，13MB 引擎与自动布线通常已经完成。
 */
function electronicLabPrewarmPcb() {
    clearTimeout(electronicLabPcbPrewarmTimer);
    electronicLabPcbPrewarmTimer = setTimeout(function () {
        var frame = electronicLabGet('pcb-frame');
        if (!frame || frame.getAttribute('src') || frame.dataset.failed === 'true') return;
        frame.dataset.prewarmed = 'true';
        frame.src = ELECTRONIC_LAB_PCB_SRC + '&prewarm=1';
    }, 900);
}

function electronicLabActivate() {
    electronicLabEnsureCircuitFrameLoaded();
    electronicLabPrewarmPcb();
    electronicLabUpdateCircuitScale();
}

function electronicLabUpdateCircuitScale() {
    var frame = electronicLabGet('circuit-frame');
    if (!frame || !frame.parentElement) return;
    var width = frame.parentElement.clientWidth;
    if (!width) return;
    var scale = Math.min(1, width / 620);
    if (scale >= 0.999) {
        frame.style.width = '100%';
        frame.style.height = '100%';
        frame.style.transform = 'none';
        frame.style.transformOrigin = 'top left';
        return;
    }
    frame.style.width = (100 / scale) + '%';
    frame.style.height = (100 / scale) + '%';
    frame.style.transform = 'scale(' + scale + ')';
    frame.style.transformOrigin = 'top left';
}

/**
 * 设置当前子模块面板，并同步子模块按钮的选中状态和可访问性属性。
 * @param {'simulation'|'pcb'} panelName
 * @param {boolean} ensureLoaded 是否按需加载对应 iframe
 */
function electronicLabSetSubmodule(panelName, ensureLoaded) {
    var isPcb = panelName === 'pcb';
    var buttons = document.querySelectorAll('#electroniclab-content .electronic-submodule-btn[data-panel]');
    var simPanel = electronicLabGet('electronic-submodule-simulation');
    var pcbPanel = electronicLabGet('electronic-submodule-pcb');

    if (simPanel) simPanel.classList.toggle('active', !isPcb);
    if (pcbPanel) pcbPanel.classList.toggle('active', isPcb);

    Array.prototype.forEach.call(buttons, function (button) {
        var active = button.dataset.panel === (isPcb ? 'pcb' : 'simulation');
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (ensureLoaded) {
        if (isPcb) electronicLabEnsurePcbFrameLoaded();
        else electronicLabEnsureCircuitFrameLoaded();
    }
    if (!isPcb) electronicLabUpdateCircuitScale();
}

function electronicLabInitSubmoduleToggle() {
    var buttons = document.querySelectorAll('#electroniclab-content .electronic-submodule-btn[data-panel]');
    var simPanel = electronicLabGet('electronic-submodule-simulation');
    var pcbPanel = electronicLabGet('electronic-submodule-pcb');
    var pcbFrame = electronicLabGet('pcb-frame');
    var pcbLoading = electronicLabGet('pcb-loading');

    if (!buttons.length || !simPanel || !pcbPanel || !pcbFrame || !pcbLoading) {
        console.warn('Electronic submodule toggle elements not found.');
        return;
    }

    if (pcbFrame.dataset.bound !== 'true') {
        pcbFrame.dataset.bound = 'true';

        Array.prototype.forEach.call(buttons, function (button) {
            if (button.dataset.bound === 'true') return;
            button.dataset.bound = 'true';
            button.addEventListener('click', function (event) {
                event.preventDefault();
                electronicLabSetSubmodule(button.dataset.panel === 'pcb' ? 'pcb' : 'simulation', true);
            });
        });

        pcbFrame.addEventListener('load', function () {
            // PCBLayout 编辑器页面加载完成不代表 13MB 引擎资源已就绪；
            // 正常通过 postMessage 的 ready/error 事件控制遮罩，这里加一个兜底超时。
            clearTimeout(electronicLabPcbFallbackTimer);
            electronicLabPcbFallbackTimer = setTimeout(function () {
                if (pcbLoading && pcbLoading.classList.contains('active')) {
                    pcbLoading.classList.remove('active');
                    console.warn('[PCBLayout] 未收到引擎 ready 消息，已自动移除加载遮罩。');
                }
            }, 60000);
        });
    }

    if (!window.electronicLabScaleBound) {
        window.electronicLabScaleBound = true;
        var scaleTimer = null;
        window.addEventListener('resize', function () {
            clearTimeout(scaleTimer);
            scaleTimer = setTimeout(electronicLabUpdateCircuitScale, 150);
        });
    }

    // 同步初始状态（默认显示电路模拟；此处不触发 iframe 提前加载）。
    electronicLabSetSubmodule(simPanel.classList.contains('active') ? 'simulation' : 'pcb', false);
}

// 监听 PCBLayout 子页面（editor.js）转发上来的引擎状态。
window.addEventListener('message', function (event) {
    var data = event.data || {};
    if (data.source !== 'pzma-pcblayout') return;

    var pcbLoading = electronicLabGet('pcb-loading');
    clearTimeout(electronicLabPcbFallbackTimer);

    if (data.type === 'ready') {
        electronicLabPcbReady = true;
        var pcbFrameReady = electronicLabGet('pcb-frame');
        if (pcbFrameReady) pcbFrameReady.dataset.failed = 'false';
        if (pcbLoading) pcbLoading.classList.remove('active');
        console.log('[PCBLayout] tscircuit engine ready');
    } else if (data.type === 'error') {
        electronicLabPcbReady = false;
        var pcbFrameError = electronicLabGet('pcb-frame');
        // 标记失败，下次切换到电路板布局时自动重新加载 iframe。
        if (pcbFrameError) pcbFrameError.dataset.failed = 'true';
        // 隐藏实验室自己的遮罩，让用户看到 PCBLayout 内部的错误提示。
        if (pcbLoading) pcbLoading.classList.remove('active');
        console.warn('[PCBLayout] tscircuit engine error:', data.message || 'unknown error');
    }
});

// 暴露给外部（例如侧边栏搜索、Agent 工具）按名称切换到对应子模块。
window.electronicLabShowSubmodule = function (name) {
    electronicLabSetSubmodule(name === 'pcb' ? 'pcb' : 'simulation', true);
};

// ---- Agentmaster 控制左侧 TSX 面板的桥接 ----
function electronicLabOpenPcbEditor() {
    var item = document.querySelector('.menu-item[data-target="electroniclab"]');
    if (item && !item.classList.contains('active')) item.click();
    electronicLabSetSubmodule('pcb', true);
}

function electronicLabGetPcbEditorApi() {
    var frame = electronicLabGet('pcb-frame');
    if (!frame) return null;
    try {
        var win = frame.contentWindow;
        return win && win.PzmaPcbEditor ? win.PzmaPcbEditor : null;
    } catch (e) {
        return null;
    }
}

function electronicLabWaitPcbEditor(timeoutMs) {
    return new Promise(function (resolve) {
        var deadline = Date.now() + (timeoutMs || 25000);
        (function poll() {
            var api = electronicLabGetPcbEditorApi();
            if (api) { resolve(api); return; }
            if (Date.now() >= deadline) { resolve(null); return; }
            setTimeout(poll, 150);
        })();
    });
}

function electronicLabWaitPcbSettled(api, timeoutMs) {
    return new Promise(function (resolve) {
        var deadline = Date.now() + (timeoutMs || 60000);
        var readyAt = 0;
        var zeroSince = 0;
        var lastErrors = '';
        var stable = 0;
        (function poll() {
            var status = null;
            try { status = api.getStatus ? api.getStatus() : null; } catch (e) { status = null; }
            if (!status) { resolve({ ok: false, message: '无法读取 PCB 引擎状态' }); return; }
            var errorCount = typeof status.errorCount === 'number' ? status.errorCount : (status.errors || []).length;
            var errors = (status.errors || []).join('\n');
            if (status.engineReady) {
                if (!readyAt) readyAt = Date.now();
                if (errorCount === 0) {
                    if (!zeroSince) zeroSince = Date.now();
                    if (Date.now() - zeroSince > 3500 && Date.now() - readyAt > 4000) { resolve(status); return; }
                } else {
                    zeroSince = 0;
                    if (errors) {
                        if (errors === lastErrors) stable += 1;
                        else stable = 0;
                        lastErrors = errors;
                        if (stable >= 2) { resolve(status); return; }
                    }
                }
            }
            if (Date.now() >= deadline) { resolve(status); return; }
            setTimeout(poll, 500);
        })();
    });
}

window.electronicLabWritePcbCode = function (code, options) {
    options = options || {};
    var text = String(code == null ? '' : code);
    if (!text.trim()) return Promise.resolve({ ok: false, message: 'TSX 代码为空' });
    electronicLabOpenPcbEditor();
    return electronicLabWaitPcbEditor(options.timeoutMs).then(function (api) {
        if (!api) return { ok: false, message: '电路板布局编辑器尚未就绪（首次加载约 10–20 秒），请稍后重试' };
        var written = api.setCode(text, { run: options.run !== false, reason: options.reason || '' });
        if (!written || written.ok === false) return written;
        if (options.run === false || !api.getStatus) return written;
        return electronicLabWaitPcbSettled(api, options.settleMs || 60000).then(function (status) {
            var errors = (status && status.errors) || [];
            var errorCount = status && typeof status.errorCount === 'number' ? status.errorCount : errors.length;
            var suffix = errorCount
                ? '；PCB 引擎报告 ' + errorCount + ' 条错误'
                : (status.engineReady ? '；PCB 渲染检查通过' : '；PCB 引擎仍在加载，暂未完成渲染检查');
            return {
                ok: true,
                message: written.message + suffix,
                errors: errors,
                errorCount: errorCount,
                engineReady: !!(status && status.engineReady),
                status: status && status.status
            };
        });
    });
};

window.electronicLabReadPcbCode = function (options) {
    options = options || {};
    electronicLabOpenPcbEditor();
    return electronicLabWaitPcbEditor(options.timeoutMs).then(function (api) {
        if (!api) return { ok: false, message: '电路板布局编辑器尚未就绪，请稍后重试' };
        var status = null;
        try { status = api.getStatus ? api.getStatus() : null; } catch (e) { status = null; }
        return {
            ok: true,
            code: api.getCode(),
            engineReady: !!(status && status.engineReady),
            errorCount: status && typeof status.errorCount === 'number' ? status.errorCount : ((status && status.errors) || []).length,
            errors: (status && status.errors) || []
        };
    });
};

// ---- Agentmaster 控制电路模拟器的桥接 ----
var electronicLabCircuitTitle = '';

function electronicLabOpenCircuitSim() {
    var item = document.querySelector('.menu-item[data-target="electroniclab"]');
    if (item && !item.classList.contains('active')) item.click();
    electronicLabSetSubmodule('simulation', true);
}

function electronicLabGetCircuitApi() {
    var frame = electronicLabGet('circuit-frame');
    if (!frame) return null;
    try {
        var win = frame.contentWindow;
        var api = win && win.CircuitJS1;
        return api && typeof api.importCircuit === 'function' ? api : null;
    } catch (e) {
        return null;
    }
}

function electronicLabWaitCircuitApi(timeoutMs) {
    return new Promise(function (resolve) {
        var deadline = Date.now() + (timeoutMs || 25000);
        (function poll() {
            var api = electronicLabGetCircuitApi();
            if (api) { resolve(api); return; }
            if (Date.now() >= deadline) { resolve(null); return; }
            setTimeout(poll, 150);
        })();
    });
}

function electronicLabCircuitReadings(api, meta) {
    var elements = [];
    try { elements = api.getElements() || []; } catch (e) { elements = []; }
    var readings = [];
    (meta || []).forEach(function (item) {
        var el = elements[item.index];
        if (!el) return;
        var type = '';
        var info = [];
        try { type = el.getType(); } catch (e) { type = ''; }
        try { info = el.getInfo() || []; } catch (e) { info = []; }
        readings.push({ name: item.name, type: item.type || type, info: info.slice(0, 6) });
    });
    if (!readings.length) {
        elements.forEach(function (el, index) {
            var type = '';
            try { type = el.getType(); } catch (e) { type = ''; }
            if (!type || type === 'WireElm' || type === 'GroundElm') return;
            var info = [];
            try { info = el.getInfo() || []; } catch (e) { info = []; }
            readings.push({ name: type || ('E' + index), type: type, info: info.slice(0, 6) });
        });
    }
    return readings;
}

function electronicLabFitImportedCircuit(bounds) {
    if (!bounds) return;
    var frame = electronicLabGet('circuit-frame');
    if (!frame) return;
    var doc = null;
    try { doc = frame.contentDocument; } catch (e) { return; }
    if (!doc) return;
    var canvas = null;
    var bestArea = 0;
    var canvases = doc.querySelectorAll('canvas');
    for (var i = 0; i < canvases.length; i++) {
        var candidate = canvases[i];
        var area = (candidate.clientWidth || candidate.width || 0) * (candidate.clientHeight || candidate.height || 0);
        if (area > bestArea) { bestArea = area; canvas = candidate; }
    }
    var viewHeight = canvas ? (canvas.clientHeight || canvas.height || 0) : 0;
    var viewWidth = canvas ? (canvas.clientWidth || canvas.width || 0) : 0;
    if (!viewHeight) return;
    var reset = doc.querySelector('.cirjsicon-zoom-11');
    if (reset) reset.click();
    var neededWidth = (bounds.maxX || 640) + 48;
    var neededHeight = (bounds.maxY || 400) + 48;
    var scale = Math.min(
        viewWidth ? (viewWidth * 0.92) / neededWidth : 1,
        (viewHeight * 0.92) / neededHeight,
        1
    );
    if (scale >= 0.98) return;
    var clicks = Math.ceil(Math.log(scale) / Math.log(0.8));
    clicks = Math.max(1, Math.min(5, clicks));
    var zoomOut = doc.querySelector('.cirjsicon-zoom-out');
    for (var j = 0; j < clicks && zoomOut; j++) zoomOut.click();
}

function electronicLabImportCircuitText(text, options) {
    options = options || {};
    var netlist = String(text == null ? '' : text);
    if (!netlist.trim()) return Promise.resolve({ ok: false, message: 'CircuitJS 网表为空' });
    electronicLabOpenCircuitSim();
    return electronicLabWaitCircuitApi(options.timeoutMs).then(function (api) {
        if (!api) return { ok: false, message: '电路模拟器尚未就绪（首次加载约 5–15 秒），请稍后重试' };
        try {
            api.importCircuit(netlist, false);
            api.setSimRunning(options.run !== false);
        } catch (e) {
            return { ok: false, message: 'CircuitJS 载入失败：' + (e && e.message ? e.message : e) };
        }
        return new Promise(function (resolve) {
            var expected = netlist.split('\n').filter(function (line) { return line.trim(); }).length - 1;
            var started = Date.now();
            var timeout = options.settleMs || 9000;
            function finish() {
                electronicLabFitImportedCircuit(options.bounds);
                resolve({
                    ok: true,
                    netlist: netlist,
                    readings: electronicLabCircuitReadings(api, options.meta)
                });
            }
            function poll() {
                var count = 0;
                try { count = api.getElements().length; } catch (e) { count = 0; }
                if (count === expected || Date.now() - started >= timeout) {
                    setTimeout(finish, 1200);
                    return;
                }
                setTimeout(poll, 120);
            }
            poll();
        });
    });
}

window.electronicLabBuildCircuit = function (spec, options) {
    options = options || {};
    electronicLabOpenCircuitSim();
    if (options.format === 'circuitjs') {
        var raw = typeof spec === 'string' ? spec : String((spec && (spec.netlist || spec.code || spec.value)) || '');
        var rawTitle = spec && typeof spec === 'object' ? (spec.title || '') : '';
        electronicLabCircuitTitle = rawTitle || 'Agentmaster 电路';
        return electronicLabImportCircuitText(raw, {
            run: options.run !== false,
            timeoutMs: options.timeoutMs,
            settleMs: options.settleMs
        }).then(function (result) {
            if (result.ok) {
                result.title = electronicLabCircuitTitle;
                result.componentCount = (result.readings || []).length;
                result.netCount = 0;
                result.warnings = ['使用 CircuitJS 原生网表，未做结构化布局'];
            }
            return result;
        });
    }
    var builder = window.PzmaCircuitBuilder;
    if (!builder) return Promise.resolve({ ok: false, message: '电路生成器未加载，请刷新页面后重试' });
    var built;
    try {
        built = builder.build(spec, {});
    } catch (e) {
        return Promise.resolve({ ok: false, message: e && e.message ? e.message : String(e) });
    }
    electronicLabCircuitTitle = built.title;
    return electronicLabImportCircuitText(built.netlist, {
        run: options.run !== false,
        timeoutMs: options.timeoutMs,
        settleMs: options.settleMs,
        meta: built.components,
        bounds: built.bounds
    }).then(function (result) {
        if (!result.ok) return result;
        return {
            ok: true,
            title: built.title,
            netlist: built.netlist,
            readings: result.readings,
            componentCount: built.componentCount,
            netCount: built.netCount,
            warnings: built.warnings,
            components: built.components
        };
    });
};

window.electronicLabReadCircuit = function (options) {
    options = options || {};
    electronicLabOpenCircuitSim();
    return electronicLabWaitCircuitApi(options.timeoutMs).then(function (api) {
        if (!api) return { ok: false, message: '电路模拟器尚未就绪，请稍后重试' };
        var netlist = '';
        try { netlist = api.exportCircuit(); } catch (e) {
            return { ok: false, message: '读取 CircuitJS 网表失败：' + (e && e.message ? e.message : e) };
        }
        var running = false;
        try { running = api.isRunning(); } catch (e) { running = false; }
        return {
            ok: true,
            title: electronicLabCircuitTitle,
            netlist: netlist,
            running: running,
            readings: electronicLabCircuitReadings(api, null)
        };
    });
};

window.electronicLabSetCircuitRunning = function (running, options) {
    options = options || {};
    electronicLabOpenCircuitSim();
    return electronicLabWaitCircuitApi(options.timeoutMs).then(function (api) {
        if (!api) return { ok: false, message: '电路模拟器尚未就绪，请稍后重试' };
        try {
            api.setSimRunning(!!running);
        } catch (e) {
            return { ok: false, message: '切换仿真状态失败：' + (e && e.message ? e.message : e) };
        }
        return { ok: true, running: !!running, message: running ? '仿真已运行' : '仿真已暂停' };
    });
};

window.electronicLabRunCircuit = function (options) {
    return window.electronicLabSetCircuitRunning(true, options);
};

window.electronicLabStopCircuit = function (options) {
    return window.electronicLabSetCircuitRunning(false, options);
};

// modules.js 的懒加载初始化通过全局函数名调用。
window.initElectronicLab = initElectronicLab;
window.electronicLabActivate = electronicLabActivate;
