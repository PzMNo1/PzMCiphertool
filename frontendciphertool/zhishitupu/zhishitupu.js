// 动态加载外部脚本的辅助函数
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const scriptName = src.split('/').pop().split('@')[0];
        if (document.querySelector(`script[src*="${scriptName}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`加载脚本失败: ${src}`));
        document.body.appendChild(script);
    });
}

// 知识图谱主入口
async function initKnowledgeGraph() {
    const container = document.getElementById('graph-wrapper');
    const loader = document.getElementById('zstp-loader');
    
    if (!container) return;
    if (container.querySelector('canvas')) {
        if (window.ZSTP && typeof window.ZSTP.resume === 'function') {
            window.ZSTP.resume();
        }
        window.dispatchEvent(new Event('resize'));
        return;
    }

    try {
        if (!document.getElementById('sci-fi-font')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'sci-fi-font';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
            try { await document.fonts.load('1em Orbitron'); } catch(e) {}
        }

        if (typeof THREE === 'undefined') {
            await loadScript('https://unpkg.com/three@0.160.0/build/three.min.js');
        }
        if (typeof SpriteText === 'undefined') {
            await loadScript('https://unpkg.com/three-spritetext@1.8.1/dist/three-spritetext.min.js');
        }
        if (typeof ForceGraph3D === 'undefined') {
            await loadScript('https://unpkg.com/3d-force-graph@1.73.1/dist/3d-force-graph.min.js');
        }

        renderGraph(container);

        if(loader) {
            setTimeout(() => {
                loader.style.opacity = 0;
                setTimeout(() => loader.style.display = 'none', 500);
            }, 1000);
        }

    } catch (error) {
        console.error('知识图谱初始化失败:', error);
        if(loader) loader.innerText = "网络连接失败，无法加载 3D 组件";
    }
}


function renderGraph(container) {
    const CODE_EXTS = new Set([
        'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'java', 'py', 'rb', 'go', 'rs', 'c', 'h', 'cpp', 'hpp',
        'cs', 'php', 'swift', 'kt', 'kts', 'sql', 'sh', 'bat', 'ps1', 'xml', 'yml', 'yaml', 'toml', 'ini', 'env'
    ]);
    const DOC_EXTS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'md', 'rtf', 'csv', 'log']);
    const importedFiles = new Map();
    let graphInspectMode = 'code';
    let activePreviewUrl = null;

    const THEME = {
        root: 0xFFD700,
        eleroot: 0x00ffff,
        category: 0x00ffff,  
        classic: 0x3498db,   
        modern: 0x9b59b6,    
        logic: 0xf1c40f,     
        text: '#e0ffff',     
    };

    function createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    const glowTexture = createGlowTexture();

    const inspector = ensureGraphInspector();

    // 数据结构（由 graphData.js 中的树形结构自动生成）
    const gData = buildGraphData(getGraphTree(THEME), THEME);

    // 4. 初始化图谱
    const Graph = ForceGraph3D()(container)
        .graphData(gData)
        .backgroundColor('#000005') 
        .showNavInfo(false)
        .width(container.clientWidth)
        .height(container.clientHeight)
        
        .nodeThreeObject(node => {
            const group = new THREE.Group();

            // 4.1 核心几何体
            let geometry, material, mesh;
            const color = node.color || 0xffffff;
            const size = Math.sqrt(node.val || 1) * 1.5;

            if (node.group === 'root') {
                // 根节点：复杂的环绕球体
                geometry = new THREE.IcosahedronGeometry(size, 2);
                material = new THREE.MeshPhongMaterial({ 
                    color: color, 
                    wireframe: true,
                    emissive: color,
                    emissiveIntensity: 0.5 
                });
                mesh = new THREE.Mesh(geometry, material);
                
                // 添加行星环
                const ringGeo = new THREE.TorusGeometry(size * 1.5, 0.2, 8, 50);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2;
                group.add(ring);

                // 内部实体
                const coreGeo = new THREE.SphereGeometry(size * 0.6, 16, 16);
                const coreMat = new THREE.MeshBasicMaterial({ color: color });
                group.add(new THREE.Mesh(coreGeo, coreMat));

            } else if (node.group === 'category') {
                // 分类节点：正八面体
                geometry = new THREE.OctahedronGeometry(size);
                material = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
                mesh = new THREE.Mesh(geometry, material);
            } else {
                // 叶子节点：小方块或四面体
                geometry = (node.group === 'classic' || node.group === 'eleroot') ? new THREE.BoxGeometry(size, size, size) : new THREE.TetrahedronGeometry(size);
                material = new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: 0.8 });
                mesh = new THREE.Mesh(geometry, material);
                
                // 叶子节点添加线框壳
                const wireframe = new THREE.LineSegments(
                    new THREE.WireframeGeometry(geometry),
                    new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.3 })
                );
                group.add(wireframe);
            }

            group.add(mesh);

            // 4.2 伪辉光 (Sprite Glow)
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: glowTexture, 
                color: color, 
                transparent: true, 
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(size * 4, size * 4, 1);
            group.add(sprite);

            // 4.3 文本标签
            if (typeof SpriteText !== 'undefined') {
                const text = new SpriteText(node.name);
                text.color = THEME.text;             // 使用新的科幻白
                text.fontFace = 'Orbitron, sans-serif'; // 确保使用科幻字体
                text.fontWeight = '700';             // 加粗
                text.strokeWidth = 0.3;              // 轻微描边增加清晰度
                text.strokeColor = '#000000';        // 黑色描边
                text.textHeight = node.group === 'root' ? 8 : 4;
                text.position.y = size + 2; 
                text.material.transparent = true;
                text.material.opacity = node.group === 'root' ? 1 : 0.9; // 稍微提高不透明度
                group.add(text);
            }

            stampGraphNodeObject(group, node);
            return group;
        })
        
        // --- 连线特效 ---
        .linkColor(() => 'rgba(0, 255, 255, 0.1)') // 非常淡的青色线
        .linkWidth(0.5)
        .linkDirectionalParticles(3) // 粒子数量 (之前丢失)
        .linkDirectionalParticleWidth(node => 2) // 粒子大小
        .linkDirectionalParticleSpeed(0.005) // 粒子速度
        .linkDirectionalParticleColor(() => '#ffffff') // 粒子颜色
        
        // --- 交互 ---
        .onNodeClick((node, event) => {
            runGraphNodeAction(node, event);
        });

    installGraphCanvasClickFallback();

    // 5. 场景增强 (星空背景)
    const scene = Graph.scene();
    scene.add(new THREE.AmbientLight(0xbbbbbb));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6));

    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000; // 恢复到 2000 个星星
    const posArray = new Float32Array(starCount * 3);
    for(let i = 0; i < starCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 2000; 
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({
        size: 1.5,
        color: 0x88ccff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);

    // 6. 动画循环 (星空旋转)
    let angle = 0;
    
    // 初始化全局状态标记
    window.isZSTPActive = true;

    let starsAnimating = false;
    const animateStars = () => {
        // 添加运行状态检查，如果未激活则停止循环
        if (!window.isZSTPActive) {
            starsAnimating = false;
            return;
        }

        starsAnimating = true;
        angle += 0.0003;
        starMesh.rotation.y = angle;
        starMesh.rotation.x = angle * 0.2;
        requestAnimationFrame(animateStars);
    };
    function ensureStarsAnimating() {
        if (!starsAnimating) animateStars();
    }
    ensureStarsAnimating();

    // 7. 力导向参数
    Graph.d3Force('charge').strength(-150);
    Graph.d3Force('link').distance(80);

    // 8. 窗口自适应
    function resizeGraph() {
        if(container && Graph) {
            Graph.width(container.clientWidth);
            Graph.height(container.clientHeight);
        }
    }

    window.addEventListener('resize', resizeGraph);

    // --- 面板控制逻辑 ---
    let panelTimeout;
    const hudPanel = document.getElementById('hud-panel');
    const hudCloseBtn = document.getElementById('hud-close-btn');

    function hidePanel() {
        if (hudPanel) {
            hudPanel.style.opacity = '0';
            setTimeout(() => {
                if (hudPanel.style.opacity === '0') {
                    hudPanel.style.display = 'none';
                }
            }, 500); // 等待淡出动画
        }
    }

    function resetPanel() {
        if (hudPanel) {
            hudPanel.style.display = 'block';
            // 强制重绘
            void hudPanel.offsetWidth;
            hudPanel.style.opacity = '1';
            
            if (panelTimeout) clearTimeout(panelTimeout);
            panelTimeout = setTimeout(hidePanel, 5000); // 5秒后自动关闭
        }
    }

    if (hudCloseBtn) {
        hudCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发其它点击事件
            hidePanel();
            if (panelTimeout) clearTimeout(panelTimeout);
        });
    }

    // 初始调用
    resetPanel();

    let lastGraphNodeAction = { node: null, time: 0 };

    function runGraphNodeAction(node, event) {
        if (!node) return false;
        const now = performance.now();
        if (lastGraphNodeAction.node === node && now - lastGraphNodeAction.time < 250) return true;
        lastGraphNodeAction = { node, time: now };
        focusGraphNode(node);
        handleGraphNodeClick(node);
        if (event?.preventDefault) event.preventDefault();
        return true;
    }

    function stampGraphNodeObject(root, node) {
        if (!root || !node) return;
        root.userData = root.userData || {};
        root.userData.graphNode = node;
        if (typeof root.traverse === 'function') {
            root.traverse(child => {
                child.userData = child.userData || {};
                child.userData.graphNode = node;
            });
        }
    }

    function installGraphCanvasClickFallback() {
        const renderer = typeof Graph.renderer === 'function' ? Graph.renderer() : null;
        const camera = typeof Graph.camera === 'function' ? Graph.camera() : null;
        const canvas = renderer?.domElement;
        if (!canvas || !camera || typeof THREE === 'undefined') return;

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let pointerDown = null;

        canvas.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            pointerDown = {
                x: event.clientX,
                y: event.clientY
            };
        }, { capture: true, passive: true });

        canvas.addEventListener('pointerup', event => {
            if (event.button !== 0) return;
            const start = pointerDown;
            pointerDown = null;
            if (!start) return;
            const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
            if (moved > 6) return;
            const node = pickGraphNodeFromCanvasEvent(event, raycaster, pointer, camera, canvas);
            if (node) runGraphNodeAction(node, event);
        }, { capture: true, passive: false });

        canvas.addEventListener('click', event => {
            const node = pickGraphNodeFromCanvasEvent(event, raycaster, pointer, camera, canvas);
            if (node) runGraphNodeAction(node, event);
        }, { capture: true, passive: false });
    }

    function pickGraphNodeFromCanvasEvent(event, raycaster, pointer, camera, canvas) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const nodeObjects = (Graph.graphData()?.nodes || [])
            .map(node => node.__threeObj)
            .filter(Boolean);
        if (!nodeObjects.length) return null;

        const hits = raycaster.intersectObjects(nodeObjects, true);
        for (const hit of hits) {
            const node = readGraphNodeFromObject(hit.object);
            if (node) return node;
        }
        return null;
    }

    function readGraphNodeFromObject(object) {
        let current = object;
        while (current) {
            if (current.userData?.graphNode) return current.userData.graphNode;
            if (current.__graphObjType === 'node' && current.__data) return current.__data;
            current = current.parent;
        }
        return null;
    }

    function focusGraphNode(node) {
        if (!node) return false;
        const x = Number.isFinite(node.x) ? node.x : 0;
        const y = Number.isFinite(node.y) ? node.y : 0;
        const z = Number.isFinite(node.z) ? node.z : 0;
        const distance = 100;
        const length = Math.hypot(x, y, z) || 1;
        const distRatio = 1 + distance / length;
        Graph.cameraPosition(
            { x: x * distRatio, y: y * distRatio, z: z * distRatio },
            node,
            2000
        );
        return true;
    }

    function normalizeGraphSearchText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fa5]+/g, '');
    }

    function findGraphNode(query) {
        const normalizedQuery = normalizeGraphSearchText(query);
        if (!normalizedQuery) return null;
        const nodes = (Graph.graphData()?.nodes || []);
        return nodes.find(node => normalizeGraphSearchText(node.name) === normalizedQuery)
            || nodes.find(node => normalizeGraphSearchText(node.name).includes(normalizedQuery))
            || nodes.find(node => normalizeGraphSearchText(node.path).includes(normalizedQuery));
    }

    function focusNodeByQuery(query) {
        const node = findGraphNode(query);
        if (!node) {
            showPreview('未找到节点', `搜索词: ${query}`, '<p>知识图谱里没有匹配的节点。可以尝试输入更短的中文名、英文名或文件名。</p>');
            return false;
        }
        focusGraphNode(node);
        handleGraphNodeClick(node);
        return true;
    }

    function ensureGraphInspector() {
        const root = document.getElementById('zhishitupu-content');
        const importLayer = document.getElementById('zstp-import-layer');

        if (importLayer && !document.getElementById('zstp-mode-switch')) {
            const switcher = document.createElement('div');
            switcher.id = 'zstp-mode-switch';
            switcher.className = 'zstp-mode-switch';
            switcher.dataset.mode = 'code';
            switcher.innerHTML = `
                <button class="zstp-mode-btn active" data-mode="code">阅览代码</button>
                <button class="zstp-mode-btn" data-mode="doc">阅览文档</button>
                <button class="zstp-mode-btn" data-mode="explain">模型解释</button>
            `;
            importLayer.prepend(switcher);
            switcher.querySelectorAll('.zstp-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    graphInspectMode = btn.dataset.mode;
                    switcher.dataset.mode = graphInspectMode;
                    switcher.querySelectorAll('.zstp-mode-btn').forEach(item => item.classList.toggle('active', item === btn));
                });
            });
        }

        let panel = document.getElementById('zstp-preview-panel');
        if (root && !panel) {
            panel = document.createElement('section');
            panel.id = 'zstp-preview-panel';
            panel.className = 'zstp-preview-panel';
            panel.innerHTML = `
                <div class="zstp-preview-header">
                    <div>
                        <div class="zstp-preview-kicker">GRAPH INSPECTOR</div>
                        <h3 id="zstp-preview-title">节点阅览</h3>
                    </div>
                    <button id="zstp-preview-close" class="zstp-preview-close">×</button>
                </div>
                <div id="zstp-preview-meta" class="zstp-preview-meta"></div>
                <div id="zstp-preview-body" class="zstp-preview-body"></div>
            `;
            root.appendChild(panel);
            panel.querySelector('#zstp-preview-close').addEventListener('click', () => {
                panel.classList.remove('active');
                revokeActivePreviewUrl();
            });
        }

        return panel;
    }

    function handleGraphNodeClick(node) {
        if (graphInspectMode === 'explain') {
            openNodeExplanation(node);
            return;
        }
        if (graphInspectMode === 'doc') {
            inspectDocumentNode(node);
            return;
        }
        inspectCodeNode(node);
    }

    function inspectCodeNode(node) {
        const file = getNodeFile(node);
        if (!file) {
            showPreview(node.name, node.path || '默认知识图谱节点', `<p>这个节点没有关联到导入文件。请先导入项目目录，再点击具体代码文件节点。</p>`);
            return;
        }
        if (!CODE_EXTS.has(node.ext)) {
            showPreview(node.name, node.path, `<p>当前文件不是常见代码类型。</p><p>扩展名: <code>${escapeHtml(node.ext || '无')}</code></p>`);
            return;
        }
        readFileText(file).then(text => {
            showPreview(node.name, formatFileMeta(file, node), `<pre><code>${escapeHtml(limitPreviewText(text))}</code></pre>`);
        }).catch(err => {
            showPreview(node.name, node.path, `<p>读取代码失败: ${escapeHtml(err.message)}</p>`);
        });
    }

    function inspectDocumentNode(node) {
        const file = getNodeFile(node);
        if (!file) {
            showPreview(node.name, node.path || '默认知识图谱节点', `<p>这个节点没有关联到导入文档。请先导入包含文档的目录，再点击文档文件节点。</p>`);
            return;
        }
        if (!DOC_EXTS.has(node.ext)) {
            showPreview(node.name, node.path, `<p>当前文件不是常见文档类型。</p><p>支持: pdf, word, ppt, txt, md, rtf, csv, log。</p>`);
            return;
        }

        if (['txt', 'md', 'rtf', 'csv', 'log'].includes(node.ext)) {
            readFileText(file).then(text => {
                showPreview(node.name, formatFileMeta(file, node), `<pre><code>${escapeHtml(limitPreviewText(text))}</code></pre>`);
            }).catch(err => {
                showPreview(node.name, node.path, `<p>读取文档失败: ${escapeHtml(err.message)}</p>`);
            });
            return;
        }

        revokeActivePreviewUrl();
        activePreviewUrl = URL.createObjectURL(file);
        if (node.ext === 'pdf') {
            showPreview(node.name, formatFileMeta(file, node), `<iframe class="zstp-doc-frame" src="${activePreviewUrl}"></iframe>`);
            return;
        }

        showPreview(
            node.name,
            formatFileMeta(file, node),
            `<p>浏览器通常不能直接内嵌预览 Word/PPT 文件。可以用下面的链接在新窗口打开或下载。</p>
             <a class="zstp-preview-link" href="${activePreviewUrl}" target="_blank" rel="noopener">打开文档</a>`
        );
    }

    function openNodeExplanation(node) {
        const prompt = `请解释知识图谱节点「${node.name}」是什么意思。${node.path ? `它来自文件路径：${node.path}。` : ''}请用中文说明它的用途、可能的上下文，以及我应该如何理解它。`;
        if (typeof window.openAgentMasterWithPrompt === 'function') {
            window.openAgentMasterWithPrompt(prompt);
        } else {
            const chatWindow = document.getElementById('agent-chat-window');
            const textarea = document.getElementById('agent-textarea');
            const submitBtn = document.getElementById('agent-submit-btn');
            if (chatWindow && textarea && submitBtn) {
                chatWindow.classList.add('active');
                textarea.value = prompt;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                submitBtn.click();
            }
        }
    }

    function getNodeFile(node) {
        if (!node || node.kind !== 'file' || !node.path) return null;
        return importedFiles.get(node.path) || null;
    }

    function readFileText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
            reader.readAsText(file);
        });
    }

    function showPreview(title, meta, bodyHTML) {
        const panel = ensureGraphInspector();
        if (!panel) return;
        const titleEl = panel.querySelector('#zstp-preview-title');
        const metaEl = panel.querySelector('#zstp-preview-meta');
        const bodyEl = panel.querySelector('#zstp-preview-body');
        if (titleEl) titleEl.textContent = title || '节点阅览';
        if (metaEl) metaEl.textContent = meta || '';
        if (bodyEl) bodyEl.innerHTML = bodyHTML || '';
        panel.classList.add('active');
    }

    function formatFileMeta(file, node) {
        return `${node.path || file.name} · ${formatFileSize(file.size)} · ${file.type || node.ext || 'unknown'}`;
    }

    function limitPreviewText(text) {
        const max = 120000;
        return text.length > max ? text.slice(0, max) + '\n\n... 内容过长，已截断预览 ...' : text;
    }

    function formatFileSize(size) {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / 1024 / 1024).toFixed(1)} MB`;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function revokeActivePreviewUrl() {
        if (activePreviewUrl) {
            URL.revokeObjectURL(activePreviewUrl);
            activePreviewUrl = null;
        }
    }

    // --- 项目导入功能 ---
    const importBtn = document.getElementById('zstp-import-btn');
    const folderInput = document.getElementById('zstp-folder-input');
    // 按深度分配的颜色梯度
    const DEPTH_COLORS = [
        0x00ff88,  // 根 - 绿
        0x00ccff,  // 1层 - 青
        0x6699ff,  // 2层 - 蓝
        0xaa66ff,  // 3层 - 紫
        0xff66aa,  // 4层 - 粉
        0xffaa33,  // 5层 - 橙
        0xffdd44,  // 6层+ - 黄
    ];
    if (importBtn && folderInput) {
        importBtn.addEventListener('click', () => folderInput.click());
        folderInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            importedFiles.clear();
            files.forEach(file => importedFiles.set(file.webkitRelativePath, file));
            const tree = buildFolderTree(files);

            assignDepthColors(tree, 0);
            _graphAutoId = 0;
            const newData = buildGraphData([tree], THEME, '_imp');

            Graph.graphData(newData);
            if (typeof Graph.zoomToFit === 'function') {
                setTimeout(() => Graph.zoomToFit(800, 80), 80);
            }

            importBtn.textContent = `已导入: ${tree.name || '项目目录'}`;
            folderInput.value = '';
        });
    }

    function assignDepthColors(node, depth) {
        const color = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
        node.color = color;
        node.group = depth === 0 ? 'root' : (node.children && node.children.length ? 'category' : 'classic');
        node.val = depth === 0 ? 50 : (node.children && node.children.length ? 20 : undefined);
        (node.children || []).forEach(c => assignDepthColors(c, depth + 1));
    }

    function buildFolderTree(files) {
        const SKIP = ['.git', 'node_modules', '.svn', '.hg', '__pycache__', '.DS_Store'];
        const root = { name: '', kind: 'directory', path: '', children: {} };
        files.forEach(f => {
            const parts = f.webkitRelativePath.split('/');
            if (!root.name) {
                root.name = parts[0];
                root.path = parts[0];
            }
            if (parts.some(p => SKIP.includes(p) || (p.startsWith('.') && p !== '.'))) return;
            let cur = root;
            for (let i = 1; i < parts.length; i++) {
                const p = parts[i];
                const path = parts.slice(0, i + 1).join('/');
                if (i === parts.length - 1) {
                    if (!cur.children[p]) {
                        const ext = getFileExtension(p);
                        cur.children[p] = { name: p, kind: 'file', path, ext, mime: f.type || '' };
                    }
                } else {
                    if (!cur.children[p]) cur.children[p] = { name: p, kind: 'directory', path, children: {} };
                    cur = cur.children[p];
                }
            }
        });
        function toArray(node) {
            if (!node.children || typeof node.children !== 'object') return node;
            node.children = Object.values(node.children).map(toArray);
            return node;
        }
        return toArray(root);
    }

    function getFileExtension(name) {
        const idx = String(name).lastIndexOf('.');
        return idx >= 0 ? String(name).slice(idx + 1).toLowerCase() : '';
    }



    window.ZSTP = {
        focusNode: focusNodeByQuery,
        pause: () => {
            window.isZSTPActive = false;
            if (Graph && typeof Graph.pauseAnimation === 'function') Graph.pauseAnimation(); // 暂停力导向图物理计算和渲染
            console.log('知识图谱已暂停');
        },
        resume: () => {
            window.isZSTPActive = true;
            if (Graph && typeof Graph.resumeAnimation === 'function') Graph.resumeAnimation(); // 恢复物理计算和交互
            resizeGraph();
            ensureStarsAnimating(); // 重启星空动画循环
            resetPanel(); // 重置面板显示和定时器
            console.log('知识图谱已恢复');
        }
    };
}
