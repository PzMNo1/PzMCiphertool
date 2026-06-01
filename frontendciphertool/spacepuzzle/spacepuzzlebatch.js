// 空间类按需加载器
// 只预加载公共 UI；具体空间谜题脚本在用户点击对应工具时再加载。
(function () {
    const loadVersion = window.CIPHERTOOL_ASSET_VERSION || '20260531';
    const loadedScripts = new Set();
    const initializedModules = new Set();
    let standardCubeApi = null;

    const SPACE_PUZZLES = {
        'standard-cube': {
            label: '标准三维魔方',
            script: './spacepuzzle/rubikscube/nubikscube.js'
        },
        skewbmofang: {
            label: 'Skewb 魔方',
            script: './spacepuzzle/skewbmofang/skewbmofang.js'
        },
        jinzitamofang: {
            label: '金字塔魔方',
            script: './spacepuzzle/jinzitamofang/jinzitamofang.js'
        },
        rubiksclock: {
            label: "Rubik's Clock",
            script: './spacepuzzle/rubiksclock/rubiksclock.js'
        },
        squreonemofang: {
            label: 'Square-1 魔方',
            script: './spacepuzzle/squreonemofang/squreonemofang.js'
        },
        'number-huarong': {
            label: '数字华容道',
            script: './spacepuzzle/huarongdao/huarongdao.js'
        },
        qiqiaoban: {
            label: '七巧板',
            script: './spacepuzzle/qiqiaoban/qiqiaoban.js'
        },
        pentomino: {
            label: 'Pentomino 五连方',
            script: './spacepuzzle/Pentomino/Pentomino.js'
        }
    };

    function scriptUrl(src) {
        return `${src}?v=${loadVersion}`;
    }

    function isScriptLoaded(src) {
        return loadedScripts.has(src) || Boolean(document.querySelector(`script[data-loader-src="${src}"]`));
    }

    function loadScript(src) {
        if (isScriptLoaded(src)) return Promise.resolve();
        loadedScripts.add(src);
        return new Promise(resolve => {
            const script = document.createElement('script');
            script.src = scriptUrl(src);
            script.async = false;
            script.dataset.loaderSrc = src;
            script.onload = script.onerror = resolve;
            document.body.appendChild(script);
        });
    }

    function puzzleButtonsHTML() {
        return Object.entries(SPACE_PUZZLES)
            .map(([id, item]) => `<button class="logic-btn" type="button" data-target="${id}" onclick="window.loadSpacePuzzle('${id}')">${item.label}</button>`)
            .join('');
    }

    function ensureShell() {
        const root = document.getElementById('spacepuzzle');
        if (!root) return null;
        if (!document.getElementById('space-list-container') || !document.getElementById('space-workspace-container')) {
            root.innerHTML = `
                <div class="container" id="space-list-container">
                    ${puzzleButtonsHTML()}
                </div>
                <div id="space-workspace-container" class="space-workspace-container"></div>
            `;
        } else {
            refreshListButtons();
        }
        return root;
    }

    function refreshListButtons() {
        const list = document.getElementById('space-list-container');
        if (list) list.innerHTML = puzzleButtonsHTML();
    }

    function hideAllWorkspaces() {
        document.querySelectorAll('#space-workspace-container > div').forEach(el => {
            el.style.display = 'none';
        });
    }

    function showWorkspaceShell() {
        const list = document.getElementById('space-list-container');
        const workspaceContainer = document.getElementById('space-workspace-container');
        if (list) list.style.display = 'none';
        if (workspaceContainer) workspaceContainer.style.display = 'block';
        hideAllWorkspaces();
    }

    function getRegisteredModule(id) {
        return (window.spacePuzzleModules || []).find(module => module.id === id);
    }

    function appendModuleWorkspace(module) {
        if (!module || typeof module.getWorkspaceHTML !== 'function') return;
        const workspaceId = `${module.id}-workspace`;
        const workspaceContainer = document.getElementById('space-workspace-container');
        if (!workspaceContainer || document.getElementById(workspaceId)) return;
        workspaceContainer.insertAdjacentHTML('beforeend', module.getWorkspaceHTML());
    }

    async function openStandardCube() {
        await loadScript(SPACE_PUZZLES['standard-cube'].script);
        if (!standardCubeApi) {
            const baseInit = window.initSpacePuzzle;
            const baseOpen = window.openSpacePuzzle;
            if (baseInit !== initSpacePuzzle && baseOpen !== openSpacePuzzle) {
                standardCubeApi = { init: baseInit, open: baseOpen };
            }
        }
        if (standardCubeApi && typeof standardCubeApi.init === 'function' && typeof standardCubeApi.open === 'function') {
            standardCubeApi.init();
            refreshListButtons();
            window.initSpacePuzzle = initSpacePuzzle;
            window.openSpacePuzzle = openSpacePuzzle;
            window.loadSpacePuzzle = openSpacePuzzle;
            standardCubeApi.open('standard-cube');
            initializedModules.add('standard-cube');
        }
    }

    async function openRegisteredPuzzle(id) {
        const item = SPACE_PUZZLES[id];
        if (!item) return;
        await loadScript(item.script);
        ensureShell();
        const module = getRegisteredModule(id);
        if (!module) return;
        appendModuleWorkspace(module);
        showWorkspaceShell();
        if (!initializedModules.has(id) && typeof module.init === 'function') {
            module.init();
            initializedModules.add(id);
        }
        if (typeof module.open === 'function') {
            module.open();
        } else {
            const workspace = document.getElementById(`${id}-workspace`);
            if (workspace) workspace.style.display = 'flex';
        }
    }

    async function openSpacePuzzle(id) {
        ensureShell();
        if (id === 'standard-cube') {
            await openStandardCube();
            return;
        }
        await openRegisteredPuzzle(id);
    }

    function backSpacePuzzle() {
        const workspaceContainer = document.getElementById('space-workspace-container');
        const list = document.getElementById('space-list-container');
        if (workspaceContainer) {
            workspaceContainer.style.display = 'none';
            hideAllWorkspaces();
        }
        if (list) list.style.display = '';
    }

    function initSpacePuzzle() {
        ensureShell();
        window.openSpacePuzzle = openSpacePuzzle;
        window.loadSpacePuzzle = openSpacePuzzle;
        window.backSpacePuzzle = backSpacePuzzle;
    }

    window.initSpacePuzzle = initSpacePuzzle;
    window.openSpacePuzzle = openSpacePuzzle;
    window.loadSpacePuzzle = openSpacePuzzle;
    window.backSpacePuzzle = backSpacePuzzle;
    window.spacePuzzleBatchReady = loadScript('./spacepuzzle/spacepuzzle_ui.js').then(initSpacePuzzle);
})();
