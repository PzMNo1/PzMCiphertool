/**
 * 电子实验室模块初始化脚本
 */
function initElectronicLab() {
    console.log("Initializing Electronic Lab...");
    const frame = document.getElementById('circuit-frame');
    const loading = document.getElementById('circuit-loading');
    const sourceSelect = document.getElementById('circuit-source-select');

    // 默认源 - 优先使用本地源
    let currentBaseUrl = "./electronic/war/circuitjs.html";

    if (!frame || !loading) {
        console.warn("Circuit frame or loading element not found.");
        return;
    }

    // 设置超时保护，防止一直显示 Loading
    // Set timeout protection to prevent loading stuck
    const loadTimeout = setTimeout(() => {
        if (loading.classList.contains('active')) {
            console.warn("Iframe load timeout, forcing remove mask.");
            loading.classList.remove('active');
        }
    }, 5000); 

    // 初始化源选择器事件
    if (sourceSelect) {
        // 恢复上次选择的线路（可选）
        const savedSource = localStorage.getItem('circuit_source');
        if (savedSource) {
            // 检查 savedSource 是否在当前选项中存在，如果不存在（比如是旧的 url），则忽略或添加
            let optionExists = false;
            for (let i = 0; i < sourceSelect.options.length; i++) {
                if (sourceSelect.options[i].value === savedSource) {
                    optionExists = true;
                    break;
                }
            }
            
            if (optionExists) {
                sourceSelect.value = savedSource;
                currentBaseUrl = savedSource;
                // 只有当保存的源与当前 iframe src 不同时才重新加载
                // 注意：frame.src 返回的是绝对路径，savedSource 可能是相对路径
                if (frame.src.indexOf(savedSource) === -1 && savedSource !== './electronic/war/circuitjs.html') {
                     frame.src = savedSource;
                }
            }
        }

        sourceSelect.addEventListener('change', function(e) {
            const newSource = e.target.value;
            currentBaseUrl = newSource;
            localStorage.setItem('circuit_source', newSource);
            
            // 切换线路时显示加载动画
            if (loading) loading.classList.add('active');
            
            // 保持当前的电路参数（如果有）
            const currentSrc = frame.src;
            const params = currentSrc.split('?')[1] || '';
            
            frame.src = newSource + (params ? '?' + params : '');
            console.log("Switched to source: " + newSource);
        });
    }

    // 监听 iframe 加载状态
    frame.onload = function() {
        clearTimeout(loadTimeout);
        // 隐藏加载遮罩
        loading.classList.remove('active');
        console.log("Falstad Engine Loaded");
    };

    // 【新增修复】如果 iframe 在监听前已经加载完毕（错过了onload事件），手动触发
    // Fix: If iframe is already loaded before listener is attached, trigger onload manually
    try {
        if (frame.contentWindow && frame.contentWindow.document.readyState === 'complete') {
            console.log("Iframe already loaded, triggering handler manually.");
            frame.onload();
        }
    } catch (e) {
        // 忽略跨域访问限制（如果切换到外部源）
    }

    // 暴露函数到全局作用域，以便HTML中的onclick调用
    window.loadCircuit = function(circuitName, btnElement) {
        // 1. UI 交互：切换按钮高亮
        document.querySelectorAll('.ctrl-btn').forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');

        // 2. 显示加载动画
        if (loading) loading.classList.add('active');

        // 3. 构建新的 URL
        // 使用当前选中的 BaseUrl
        if (frame) frame.src = `${currentBaseUrl}?startCircuit=${circuitName}`;
    };

    window.resetFrame = function() {
        if (loading) loading.classList.add('active');
        if (frame) frame.src = frame.src; // 刷新 iframe
    };

    window.openDocs = function() {
        window.open('https://www.falstad.com/circuit/doc/', '_blank');
    };

    // --- 性能优化：休眠/唤醒 ---
    window.pauseElectronicLab = function() {
        // console.log("Attempting to pause Electronic Lab...");
        const frame = document.getElementById('circuit-frame');
        if (!frame) return;

        // 大多数现代浏览器在 iframe display:none 时会自动节流 RAF
        // 这里尝试更深层的暂停（如果支持）
        try {
            // 尝试通过 postMessage 通知（如果 iframe 支持）
            // frame.contentWindow.postMessage('pause', '*');
            
            // 如果是同源，可以尝试直接访问内部对象 (circuitJS 可能会暴露 sim 对象)
            if (frame.contentWindow.sim && typeof frame.contentWindow.sim.stop === 'function') {
                frame.contentWindow.sim.stop();
            }
        } catch (e) {
            // 跨域忽略
        }
    };

    window.resumeElectronicLab = function() {
        // console.log("Attempting to resume Electronic Lab...");
        const frame = document.getElementById('circuit-frame');
        if (!frame) return;

        try {
            // frame.contentWindow.postMessage('resume', '*');
            if (frame.contentWindow.sim && typeof frame.contentWindow.sim.start === 'function') {
                frame.contentWindow.sim.start();
            }
        } catch (e) {
            // 跨域忽略
        }
    };
}
