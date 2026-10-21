/**
 * 电子实验室模块初始化脚本
 * - 电路模拟：内嵌 Falstad CircuitJS
 * - 电路板布局：内嵌 tscircuit PCB 设计 / 仿真引擎（electronic/PCBLayout）
 * - 右上角单个按钮在【电路模拟】/【电路板布局】之间切换
 */

var ELECTRONIC_LAB_CIRCUIT_SRC = './electronic/war/circuitjs.html';
var ELECTRONIC_LAB_PCB_VERSION = '20261021-3';
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
            if (frame) frame.src = ELECTRONIC_LAB_CIRCUIT_SRC + '?startCircuit=' + encodeURIComponent(circuitName);
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
}

/**
 * 设置当前子模块面板，并同步右上角单按钮的文案、状态和可访问性属性。
 * @param {'simulation'|'pcb'} panelName
 * @param {boolean} ensureLoaded 是否按需加载对应 iframe
 */
function electronicLabSetSubmodule(panelName, ensureLoaded) {
    var isPcb = panelName === 'pcb';
    var toggle = electronicLabGet('electronic-submodule-toggle');
    var label = electronicLabGet('electronic-submodule-toggle-label');
    var simPanel = electronicLabGet('electronic-submodule-simulation');
    var pcbPanel = electronicLabGet('electronic-submodule-pcb');

    if (simPanel) simPanel.classList.toggle('active', !isPcb);
    if (pcbPanel) pcbPanel.classList.toggle('active', isPcb);

    if (toggle) {
        toggle.dataset.activePanel = isPcb ? 'pcb' : 'simulation';
        toggle.dataset.mode = isPcb ? 'PCB' : 'SIM';
        toggle.classList.toggle('is-pcb', isPcb);
        toggle.classList.add('active');
        toggle.setAttribute('aria-pressed', isPcb ? 'true' : 'false');
        var nextLabel = isPcb ? '电路模拟' : '电路板布局';
        toggle.setAttribute('aria-label', '切换到' + nextLabel);
        toggle.setAttribute('title', '点击切换到' + nextLabel);
    }
    if (label) label.textContent = isPcb ? '电路板布局' : '电路模拟';

    if (ensureLoaded) {
        if (isPcb) electronicLabEnsurePcbFrameLoaded();
        else electronicLabEnsureCircuitFrameLoaded();
    }
}

function electronicLabInitSubmoduleToggle() {
    var toggle = electronicLabGet('electronic-submodule-toggle');
    var simPanel = electronicLabGet('electronic-submodule-simulation');
    var pcbPanel = electronicLabGet('electronic-submodule-pcb');
    var pcbFrame = electronicLabGet('pcb-frame');
    var pcbLoading = electronicLabGet('pcb-loading');

    if (!toggle || !simPanel || !pcbPanel || !pcbFrame || !pcbLoading) {
        console.warn('Electronic submodule toggle elements not found.');
        return;
    }

    if (toggle.dataset.bound !== 'true') {
        toggle.dataset.bound = 'true';

        toggle.addEventListener('click', function (event) {
            event.preventDefault();
            var current = toggle.dataset.activePanel === 'pcb' ? 'pcb' : 'simulation';
            electronicLabSetSubmodule(current === 'pcb' ? 'simulation' : 'pcb', true);
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

// modules.js 的懒加载初始化通过全局函数名调用。
window.initElectronicLab = initElectronicLab;
window.electronicLabActivate = electronicLabActivate;
