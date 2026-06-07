/**
 * 电子实验室模块初始化脚本
 */
function initElectronicLab() {
    console.log("Initializing Electronic Lab...");
    const frame = document.getElementById('circuit-frame');
    const loading = document.getElementById('circuit-loading');
    const sourceSelect = document.getElementById('circuit-source-select');
    let currentBaseUrl = "./electronic/war/circuitjs.html";

    if (!frame || !loading) {
        console.warn("Circuit frame or loading element not found.");
        return;
    }

    const loadTimeout = setTimeout(() => {
        if (loading.classList.contains('active')) {
            console.warn("Iframe load timeout, forcing remove mask.");
            loading.classList.remove('active');
        }
    }, 5000); 

    if (sourceSelect) {
        sourceSelect.value = currentBaseUrl;
    }

    // 监听 iframe 加载状态
    frame.onload = function() {
        clearTimeout(loadTimeout);
        loading.classList.remove('active');
        console.log("Falstad Engine Loaded");
    };

    try {
        if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
            console.log("Iframe already loaded, triggering handler manually.");
            frame.onload();
        }
    } catch (e) {

    }

    window.loadCircuit = function(circuitName, btnElement) {
        document.querySelectorAll('.ctrl-btn').forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        if (loading) loading.classList.add('active');
        if (frame) frame.src = `${currentBaseUrl}?startCircuit=${circuitName}`;
    };

    window.resetFrame = function() {
        if (loading) loading.classList.add('active');
        if (frame) frame.src = frame.src; 
    };
}
