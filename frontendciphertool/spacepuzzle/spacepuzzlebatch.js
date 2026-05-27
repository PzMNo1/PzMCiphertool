// 空间类分层加载器
// 由 modules.js 加载此文件，负责空间类所有模块脚本的集中加载。
(function () {
    const loadVersion = new Date().getTime();

    function loadBatch(list) {
        if (window.SpacePuzzleUI && typeof window.SpacePuzzleUI.loadScripts === 'function') {
            return window.SpacePuzzleUI.loadScripts(list, loadVersion);
        }
        return Promise.all(list.map(src => new Promise(resolve => {
            const s = document.createElement('script');
            s.src = src + '?v=' + loadVersion;
            s.async = false;
            s.onload = s.onerror = resolve;
            document.body.appendChild(s);
        })));
    }

    const uiScripts = [
        './spacepuzzle/spacepuzzle_ui.js',
    ];

    const spacePuzzleScripts = [
        './spacepuzzle/rubikscube/nubikscube.js',
        './spacepuzzle/huarongdao/huarongdao.js',
        './spacepuzzle/qiqiaoban/qiqiaoban.js',
        './spacepuzzle/jinzitamofang/jinzitamofang.js',
        './spacepuzzle/rubiksclock/rubiksclock.js',
        './spacepuzzle/skewbmofang/skewbmofang.js',
        './spacepuzzle/squreonemofang/squreonemofang.js',
        './spacepuzzle/Pentomino/Pentomino.js',
    ];

    window.spacePuzzleBatchReady = loadBatch(uiScripts).then(() => loadBatch(spacePuzzleScripts));
})();
