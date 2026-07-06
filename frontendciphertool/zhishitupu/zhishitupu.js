// 动态加载外部脚本的辅助函数
function loadScript(src, globalName) {
    if (globalName && typeof window[globalName] !== 'undefined') {
        return Promise.resolve();
    }
    window.__zstpScriptPromises = window.__zstpScriptPromises || new Map();
    return new Promise((resolve, reject) => {
        const scriptName = src.split('/').pop().split('@')[0];
        const cacheKey = globalName || scriptName;
        if (window.__zstpScriptPromises.has(cacheKey)) {
            window.__zstpScriptPromises.get(cacheKey).then(resolve, reject);
            return;
        }

        const existing = document.querySelector(`script[src*="${scriptName}"]`);
        if (existing && (!globalName || typeof window[globalName] !== 'undefined')) {
            resolve();
            return;
        }
        if (existing) {
            existing.remove();
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        const promise = new Promise((innerResolve, innerReject) => {
            script.onload = () => {
                if (globalName && typeof window[globalName] === 'undefined') {
                    script.remove();
                    window.__zstpScriptPromises.delete(cacheKey);
                    innerReject(new Error(`脚本已加载但未发现 ${globalName}: ${src}`));
                    return;
                }
                innerResolve();
            };
            script.onerror = () => {
                script.remove();
                window.__zstpScriptPromises.delete(cacheKey);
                innerReject(new Error(`加载脚本失败: ${src}`));
            };
        });
        window.__zstpScriptPromises.set(cacheKey, promise);
        promise.then(resolve, reject);
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
            await loadScript('https://unpkg.com/three@0.160.0/build/three.min.js', 'THREE');
        }
        if (typeof SpriteText === 'undefined') {
            await loadScript('https://unpkg.com/three-spritetext@1.8.1/dist/three-spritetext.min.js', 'SpriteText');
        }
        if (typeof ForceGraph3D === 'undefined') {
            await loadScript('https://unpkg.com/3d-force-graph@1.73.1/dist/3d-force-graph.min.js', 'ForceGraph3D');
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
    const gData = applyReadableGraphLayout(buildGraphData(getGraphTree(THEME), THEME));
    let graphNodeById = new Map(gData.nodes.map(node => [node.id, node]));

    function applyReadableGraphLayout(data) {
        const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
        const nodes = data?.nodes || [];
        const links = data?.links || [];
        const nodeById = new Map(nodes.map(node => [node.id, node]));
        const childrenById = new Map(nodes.map(node => [node.id, []]));
        const parentById = new Map();

        links.forEach(link => {
            const sourceId = getLinkEndpointId(link.source);
            const targetId = getLinkEndpointId(link.target);
            if (!sourceId || !targetId || !nodeById.has(sourceId) || !nodeById.has(targetId)) return;
            childrenById.get(sourceId).push(nodeById.get(targetId));
            parentById.set(targetId, sourceId);
        });

        const roots = nodes.filter(node => !parentById.has(node.id));
        const weightCache = new Map();
        const subtreeWeight = node => {
            if (weightCache.has(node.id)) return weightCache.get(node.id);
            const children = childrenById.get(node.id) || [];
            const weight = 1 + children.reduce((sum, child) => sum + subtreeWeight(child), 0);
            weightCache.set(node.id, weight);
            return weight;
        };

        const rootAnchors = calculateRootAnchors(roots.length);
        roots.forEach((root, index) => {
            const anchor = rootAnchors[index] || { x: 0, y: 0, z: 0, dir: { x: 0, y: 0, z: 1 } };
            const rootDirection = normalizeVector(anchor.dir || { x: anchor.x, y: anchor.y, z: anchor.z });
            setNodeLayout(root, anchor.x, anchor.y, anchor.z, 0, root.id, '', rootDirection, index);
            layoutChildren(root, root.id, rootDirection, 1);
        });

        roots.forEach(root => {
            root.__layoutGuideRadius = calculateClusterRadius(root);
        });

        return data;

        function layoutChildren(parent, rootId, parentDirection, depth) {
            const children = childrenById.get(parent.id) || [];
            if (!children.length) return;

            children.forEach((child, index) => {
                const radius = levelRadius(depth, children.length, subtreeWeight(child));
                const direction = depth <= 1
                    ? fibonacciSphereDirection(index, children.length, seededAngle(parent.id))
                    : sphericalCapDirection(parentDirection, index, children.length, capSpread(depth, children.length), seededAngle(parent.id));
                const x = parent.__layoutX + direction.x * radius;
                const y = parent.__layoutY + direction.y * radius;
                const z = parent.__layoutZ + direction.z * radius;

                setNodeLayout(child, x, y, z, depth, rootId, parent.id, direction, index);

                const grandChildren = childrenById.get(child.id) || [];
                if (grandChildren.length) {
                    layoutChildren(child, rootId, direction, depth + 1);
                }
            });
        }

        function getLinkEndpointId(endpoint) {
            return typeof endpoint === 'object' ? endpoint?.id : endpoint;
        }

        function setNodeLayout(node, x, y, z, depth, rootId, parentId, direction, orderIndex) {
            node.x = node.fx = node.__layoutX = Math.round(x * 100) / 100;
            node.y = node.fy = node.__layoutY = Math.round(y * 100) / 100;
            node.z = node.fz = node.__layoutZ = Math.round(z * 100) / 100;
            node.vx = node.vy = node.vz = 0;
            node.__layoutDepth = depth;
            node.__layoutRootId = rootId;
            node.__layoutParentId = parentId;
            node.__layoutDirection = direction;
            node.__layoutAngle = Math.atan2(direction.y, direction.x);
            node.__layoutOrder = orderIndex;
        }

        function calculateRootAnchors(count) {
            if (count <= 1) return [{ x: 0, y: 0, z: 0, dir: { x: 0, y: 0, z: 1 } }];
            const radius = count <= 3 ? 430 : 540;
            return Array.from({ length: count }, (_, index) => {
                const dir = fibonacciSphereDirection(index, count, -0.45);
                return {
                    x: dir.x * radius,
                    y: dir.y * radius,
                    z: dir.z * radius,
                    dir
                };
            });
        }

        function calculateClusterRadius(root) {
            let maxDistance = 0;
            const stack = [...(childrenById.get(root.id) || [])];
            while (stack.length) {
                const node = stack.pop();
                const distance = Math.hypot(
                    node.__layoutX - root.__layoutX,
                    node.__layoutY - root.__layoutY,
                    node.__layoutZ - root.__layoutZ
                );
                maxDistance = Math.max(maxDistance, distance);
                stack.push(...(childrenById.get(node.id) || []));
            }
            return clamp(maxDistance * 1.12, 220, 620);
        }

        function levelRadius(depth, siblingCount, weight) {
            const weightSize = Math.sqrt(weight);
            if (depth <= 1) return clamp(220 + siblingCount * 7 + weightSize * 8, 260, 430);
            if (depth === 2) return clamp(88 + siblingCount * 5 + weightSize * 5, 105, 210);
            if (depth === 3) return clamp(54 + siblingCount * 3 + weightSize * 4, 66, 145);
            return clamp(34 + siblingCount * 2 + weightSize * 3, 44, 100);
        }

        function capSpread(depth, siblingCount) {
            if (depth <= 2) return clamp(0.92 + siblingCount * 0.012, 0.92, 1.28);
            if (depth === 3) return clamp(0.74 + siblingCount * 0.01, 0.74, 1.04);
            return clamp(0.58 + siblingCount * 0.008, 0.58, 0.9);
        }

        function sphericalCapDirection(axis, index, count, spread, seed) {
            if (count <= 1) return normalizeVector(axis);
            const frame = buildFrame(axis);
            const radius = Math.sqrt((index + 0.5) / count) * spread;
            const angle = (index + 0.5) * GOLDEN_ANGLE + seed;
            return normalizeVector({
                x: frame.normal.x * Math.cos(radius) + (frame.tangent.x * Math.cos(angle) + frame.bitangent.x * Math.sin(angle)) * Math.sin(radius),
                y: frame.normal.y * Math.cos(radius) + (frame.tangent.y * Math.cos(angle) + frame.bitangent.y * Math.sin(angle)) * Math.sin(radius),
                z: frame.normal.z * Math.cos(radius) + (frame.tangent.z * Math.cos(angle) + frame.bitangent.z * Math.sin(angle)) * Math.sin(radius)
            });
        }

        function fibonacciSphereDirection(index, count, seed = 0) {
            if (count <= 1) {
                return normalizeVector({
                    x: Math.cos(seed) * 0.72,
                    y: Math.sin(seed) * 0.72,
                    z: 0.68
                });
            }
            const t = (index + 0.5) / count;
            const z = 1 - 2 * t;
            const radius = Math.sqrt(Math.max(0, 1 - z * z));
            const angle = (index + 0.5) * GOLDEN_ANGLE + seed;
            return {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z
            };
        }

        function buildFrame(axis) {
            const normal = normalizeVector(axis);
            const reference = Math.abs(normal.z) < 0.82 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
            const tangent = normalizeVector(cross(reference, normal));
            const bitangent = normalizeVector(cross(normal, tangent));
            return { normal, tangent, bitangent };
        }

        function normalizeVector(vector) {
            const length = Math.hypot(vector?.x || 0, vector?.y || 0, vector?.z || 0) || 1;
            return {
                x: (vector?.x || 0) / length,
                y: (vector?.y || 0) / length,
                z: (vector?.z || 0) / length
            };
        }

        function cross(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        }

        function seededAngle(value) {
            let hash = 0;
            const text = String(value || '');
            for (let i = 0; i < text.length; i++) {
                hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
            }
            return (hash % 6283) / 1000;
        }

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }
    }

    function getLinkNode(link, key) {
        const endpoint = link?.[key];
        return typeof endpoint === 'object' ? endpoint : graphNodeById.get(endpoint);
    }

    function colorToRgba(color, opacity) {
        const hex = Number(color || 0x00ffff);
        const r = (hex >> 16) & 255;
        const g = (hex >> 8) & 255;
        const b = hex & 255;
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

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
                const depth = Number.isFinite(node.__layoutDepth) ? node.__layoutDepth : 3;
                text.textHeight = node.group === 'root' ? 8 : (depth <= 1 ? 5.2 : (depth === 2 ? 3.8 : 2.8));
                text.position.y = size + 2; 
                text.material.transparent = true;
                text.material.opacity = node.group === 'root' ? 1 : (depth <= 2 ? 0.9 : 0.62);
                group.add(text);
            }

            stampGraphNodeObject(group, node);
            return group;
        })
        
        // --- 连线特效 ---
        .linkColor(link => {
            const target = getLinkNode(link, 'target');
            const depth = target?.__layoutDepth || 1;
            return colorToRgba(target?.color || 0x00ffff, depth <= 1 ? 0.28 : (depth === 2 ? 0.18 : 0.09));
        })
        .linkWidth(link => {
            const target = getLinkNode(link, 'target');
            const depth = target?.__layoutDepth || 1;
            return depth <= 1 ? 1.15 : (depth === 2 ? 0.7 : 0.35);
        })
        .linkDirectionalParticles(link => {
            const target = getLinkNode(link, 'target');
            const depth = target?.__layoutDepth || 1;
            return depth <= 1 ? 3 : (depth === 2 ? 2 : 1);
        })
        .linkDirectionalParticleWidth(link => {
            const target = getLinkNode(link, 'target');
            return (target?.__layoutDepth || 1) <= 2 ? 2 : 1.1;
        })
        .linkDirectionalParticleSpeed(0.005) // 粒子速度
        .linkDirectionalParticleColor(link => colorToRgba(getLinkNode(link, 'target')?.color || 0xffffff, 0.78))
        
        // --- 交互 ---
        .onNodeClick((node, event) => {
            runGraphNodeAction(node, event);
        });

    installGraphCanvasClickFallback();

    // 5. 场景增强 (星空背景)
    const scene = Graph.scene();
    scene.add(new THREE.AmbientLight(0xbbbbbb));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6));
    let layoutGuideGroup = null;

    function refreshLayoutGuides(data) {
        if (!scene || typeof THREE === 'undefined') return;
        if (layoutGuideGroup) {
            scene.remove(layoutGuideGroup);
            layoutGuideGroup.traverse?.(object => {
                object.geometry?.dispose?.();
                object.material?.dispose?.();
            });
        }

        layoutGuideGroup = new THREE.Group();
        layoutGuideGroup.name = 'zstp-layout-guides';
        (data.nodes || [])
            .filter(node => node.__layoutDepth === 0)
            .forEach(root => {
                const radius = root.__layoutGuideRadius || 260;
                const shellGeo = new THREE.SphereGeometry(radius, 28, 14);
                const shellWireGeo = new THREE.WireframeGeometry(shellGeo);
                shellGeo.dispose();
                const shellMat = new THREE.LineBasicMaterial({
                    color: root.color || 0x00ffff,
                    transparent: true,
                    opacity: 0.11,
                    depthWrite: false
                });
                const shell = new THREE.LineSegments(shellWireGeo, shellMat);
                shell.position.set(root.fx || 0, root.fy || 0, root.fz || 0);
                layoutGuideGroup.add(shell);
            });
        scene.add(layoutGuideGroup);
    }
    refreshLayoutGuides(gData);

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

    // 7. 图谱结构参数：节点坐标由分区布局固定，物理力只保留轻微缓动。
    Graph.d3Force('charge').strength(-18);
    Graph.d3Force('link')
        .distance(link => {
            const target = getLinkNode(link, 'target');
            const depth = target?.__layoutDepth || 1;
            return depth <= 1 ? 170 : (depth === 2 ? 92 : 56);
        })
        .strength(0.04);
    if (typeof Graph.cooldownTicks === 'function') Graph.cooldownTicks(1);

    function frameGraphOverview(duration = 1200, padding = 150) {
        if (typeof Graph.cameraPosition === 'function') {
            Graph.cameraPosition(
                { x: 760, y: -900, z: 660 },
                { x: 0, y: 0, z: 0 },
                0
            );
        }
        if (typeof Graph.zoomToFit === 'function') {
            setTimeout(() => Graph.zoomToFit(duration, padding), 80);
        }
    }
    setTimeout(() => frameGraphOverview(1200, 150), 350);

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
        if (!node) return;
        const context = getNodeGraphContext(node);
        const prompt = `这个节点「${node.name}」是什么？`;
        const options = {
            knowledgeGraphContext: {
                nodeId: node.id,
                nodeName: node.name,
                graphPath: (context.path || []).join(' > ')
            }
        };
        if (typeof window.openAgentMasterWithPrompt === 'function') {
            window.openAgentMasterWithPrompt(prompt, options);
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

    async function buildNodeKnowledgeBundle(node) {
        const graphContext = getNodeGraphContext(node);
        const profile = buildNodeKnowledgeProfile(node, graphContext);
        const localRecords = retrieveLocalNodeKnowledge(node, graphContext, profile);
        const externalRecords = await retrieveExternalNodeKnowledge(profile);
        return {
            profile,
            graphContext,
            localRecords,
            externalRecords,
            retrievalPolicy: buildRetrievalPolicy(profile),
        };
    }

    function getNodeGraphContext(node) {
        const data = Graph.graphData?.() || { nodes: [], links: [] };
        const nodes = data.nodes || [];
        const links = data.links || [];
        const nodeById = new Map(nodes.map(item => [item.id, item]));
        const parentById = new Map();
        const childrenById = new Map();

        links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            if (!sourceId || !targetId) return;
            parentById.set(targetId, sourceId);
            if (!childrenById.has(sourceId)) childrenById.set(sourceId, []);
            const child = nodeById.get(targetId);
            if (child) childrenById.get(sourceId).push(child);
        });

        const ancestors = [];
        let currentId = node.id;
        const seen = new Set();
        while (parentById.has(currentId) && !seen.has(currentId)) {
            seen.add(currentId);
            currentId = parentById.get(currentId);
            const parent = nodeById.get(currentId);
            if (parent) ancestors.unshift(parent);
        }

        const children = childrenById.get(node.id) || [];
        const parent = ancestors[ancestors.length - 1] || null;
        const siblings = parent ? (childrenById.get(parent.id) || []).filter(item => item.id !== node.id) : [];
        return {
            path: [...ancestors.map(item => item.name), node.name],
            ancestors,
            parent,
            children,
            siblings,
            root: ancestors[0] || node,
            nodeCount: nodes.length,
            linkCount: links.length,
        };
    }

    function buildNodeKnowledgeProfile(node, context) {
        const terms = extractNodeSearchTerms(node.name);
        const contextText = [
            node.name,
            node.description,
            node.source,
            node.scale,
            node.maturity,
            node.layer,
            ...(context.path || []),
            ...(context.children || []).map(item => item.name),
            ...(context.siblings || []).map(item => item.name),
        ].filter(Boolean).join(' ');
        const domain = selectNodeKnowledgeDomain(contextText);
        const primaryTerm = terms.english || terms.chinese || node.name;
        const broadQuery = [terms.english || terms.chinese, domain.queryBoost].filter(Boolean).join(' ');
        const graphPath = (context.path || []).join(' > ');

        return {
            id: node.id,
            name: node.name,
            terms,
            primaryTerm,
            broadQuery,
            graphPath,
            domain,
            source: node.source || context.root?.source || '',
            scale: node.scale || context.root?.scale || '',
            maturity: node.maturity || '',
            layer: node.layer || '',
        };
    }

    function extractNodeSearchTerms(name) {
        const raw = String(name || '').replace(/\s+/g, ' ').trim();
        const englishParts = raw.match(/[A-Za-z][A-Za-z0-9+\-./& ]*[A-Za-z0-9)]/g) || [];
        const english = englishParts
            .map(item => item.replace(/\s+/g, ' ').trim())
            .filter(item => item.length > 2)
            .sort((a, b) => b.length - a.length)[0] || '';
        const chinese = raw.replace(/[A-Za-z0-9+\-./&():]/g, ' ').replace(/\s+/g, '').trim();
        const compact = raw.replace(/[^\w\u4e00-\u9fa5]+/g, ' ').trim();
        return { raw, english, chinese, compact };
    }

    function selectNodeKnowledgeDomain(text) {
        const haystack = String(text || '').toLowerCase();
        const domains = [
            {
                id: 'agentic-ai',
                label: '智能体与基础模型',
                queryBoost: 'agentic AI foundation models',
                summary: '关注模型、工具、规划、评测、部署和人机协作的闭环。',
                patterns: ['agent', 'large language model', 'foundation model', 'multimodal', 'world model', 'coding agents', '具身智能', '大语言模型', '多智能体', '基础模型'],
                sources: ['OpenAlex', 'Semantic Scholar', 'arXiv', 'GitHub', 'Hugging Face', 'Hacker News'],
                questions: ['它解决什么认知或自动化问题？', '核心模型、数据和评测是什么？', '有哪些开源实现和社区实践？', '主要风险和治理抓手是什么？']
            },
            {
                id: 'knowledge-graph',
                label: '知识图谱与世界知识库',
                queryBoost: 'knowledge graph data commons schema.org entity search',
                summary: '关注实体、关系、统计变量、来源、语义标准和检索增强。',
                patterns: ['knowledge graph', 'data commons', 'schema.org', 'wikidata', 'rdf', 'sparql', 'ontology', 'graph neural', '知识图谱', '统计变量', '实体', '本体'],
                sources: ['Data Commons', 'Google Knowledge Graph', 'Wikidata', 'OpenAlex', 'GitHub'],
                questions: ['节点对应哪些实体类型？', '可连接哪些统计变量或外部ID？', '如何做实体消歧和来源追踪？', '能如何增强RAG和Agent记忆？']
            },
            {
                id: 'quantum',
                label: '量子与微观物质',
                queryBoost: 'quantum computing quantum networks advanced materials',
                summary: '关注微观物理、量子信息、材料和器件从实验到工程化的路径。',
                patterns: ['quantum', 'superconduct', 'topological', 'photonics', 'metamaterial', '量子', '超导', '拓扑', '光子', '纳米'],
                sources: ['OpenAlex', 'Semantic Scholar', 'arXiv', 'GitHub'],
                questions: ['底层物理机制是什么？', '目前实验指标和可扩展瓶颈是什么？', '近期工程化路径在哪里？', '对计算、通信或测量有什么影响？']
            },
            {
                id: 'bio-health',
                label: '生命科学与精准健康',
                queryBoost: 'AI biology gene editing therapeutics precision medicine',
                summary: '关注分子、细胞、临床转化、监管和真实世界证据。',
                patterns: ['protein', 'gene', 'crispr', 'cell', 'therapeutic', 'vaccine', 'neuroscience', 'microbiome', '蛋白', '基因', '细胞', '疗法', '医学', '脑机'],
                sources: ['OpenAlex', 'Semantic Scholar', 'PubMed', 'ClinicalTrials', 'GitHub'],
                questions: ['靶点、机制和实验体系是什么？', '临床转化处在哪个阶段？', '主要安全性和伦理问题是什么？', 'AI或自动化如何改变研发流程？']
            },
            {
                id: 'energy-climate',
                label: '能源、气候与地球系统',
                queryBoost: 'energy storage climate technology carbon capture earth systems',
                summary: '关注物理系统、资源约束、规模化部署和政策市场联动。',
                patterns: ['battery', 'energy', 'fusion', 'hydrogen', 'climate', 'carbon', 'geothermal', 'biodiversity', 'water', '电池', '能源', '气候', '碳', '生态', '水资源'],
                sources: ['OpenAlex', 'Data Commons', 'GitHub', 'Hacker News', 'IEA/WEF reference searches'],
                questions: ['关键性能和成本曲线是什么？', '部署规模和基础设施瓶颈是什么？', '有哪些可观测指标？', '对气候和产业系统的边际影响是什么？']
            },
            {
                id: 'semiconductor-robotics',
                label: '半导体、机器人与工程系统',
                queryBoost: 'semiconductors robotics advanced manufacturing compute infrastructure',
                summary: '关注硬件、制造、供应链、可靠性和规模化交付。',
                patterns: ['semiconductor', 'chiplet', 'robot', 'manufacturing', '6g', 'edge cloud', '半导体', '机器人', '制造', '通信', '算力'],
                sources: ['OpenAlex', 'GitHub', 'Hacker News', 'Hugging Face'],
                questions: ['系统架构和关键部件是什么？', '供应链或制造瓶颈在哪里？', '有哪些开源/产业实现？', '可靠性和安全标准是什么？']
            },
            {
                id: 'space',
                label: '宇宙科学与空间经济',
                queryBoost: 'cosmology exoplanets satellite space economy',
                summary: '关注基础天文观测、空间基础设施和商业航天生态。',
                patterns: ['cosmology', 'dark matter', 'exoplanet', 'satellite', 'lunar', 'space', '宇宙', '暗物质', '系外行星', '卫星', '月球', '空间'],
                sources: ['OpenAlex', 'arXiv', 'GitHub', 'Hacker News'],
                questions: ['观测证据链是什么？', '需要哪些仪器和任务？', '商业化或基础设施路径是什么？', '长期科学问题是什么？']
            },
            {
                id: 'society-governance',
                label: '社会、治理与文明韧性',
                queryBoost: 'computational social science AI governance digital public infrastructure',
                summary: '关注制度、行为、组织、政策和社会影响评估。',
                patterns: ['governance', 'society', 'education', 'work', 'policy', 'public infrastructure', '治理', '社会', '教育', '工作', '政策', '韧性'],
                sources: ['OpenAlex', 'Data Commons', 'Hacker News', 'GitHub'],
                questions: ['它改变哪些社会流程？', '可用什么指标衡量？', '主要外部性是什么？', '治理或制度化路径是什么？']
            },
        ];
        return domains.find(domain => domain.patterns.some(pattern => haystack.includes(pattern.toLowerCase()))) || {
            id: 'frontier-general',
            label: '世界前沿知识通用节点',
            queryBoost: 'frontier technology research knowledge graph',
            summary: '通用前沿节点，按概念、证据、实现、社区、风险和成熟度组织解释。',
            sources: ['OpenAlex', 'Semantic Scholar', 'GitHub', 'Hacker News'],
            questions: ['它是什么？', '为什么重要？', '有哪些证据和实现？', '下一步应该看什么？']
        };
    }

    function retrieveLocalNodeKnowledge(node, context, profile) {
        const children = (context.children || []).slice(0, 12).map(item => item.name);
        const siblings = (context.siblings || []).slice(0, 10).map(item => item.name);
        const ancestors = (context.ancestors || []).map(item => item.name);
        const records = [
            {
                type: 'node-card',
                title: '节点定位',
                content: [
                    `节点: ${node.name}`,
                    `图谱路径: ${profile.graphPath || node.name}`,
                    `领域: ${profile.domain.label}`,
                    `尺度: ${profile.scale || '未标注'}`,
                    `成熟度: ${profile.maturity || '由证据判断'}`,
                    `来源线索: ${profile.source || '默认世界前沿知识图谱'}`,
                ].join('\n'),
                score: 1
            },
            {
                type: 'domain-guide',
                title: `${profile.domain.label}解释框架`,
                content: [
                    profile.domain.summary,
                    `建议回答问题: ${profile.domain.questions.join('；')}`,
                    `推荐检索源: ${profile.domain.sources.join('、')}`,
                ].join('\n'),
                score: 0.95
            },
        ];

        if (children.length) {
            records.push({
                type: 'graph-children',
                title: '子节点知识库',
                content: `这个节点下直接连接的子主题: ${children.join('；')}`,
                score: 0.86
            });
        }

        if (siblings.length) {
            records.push({
                type: 'graph-neighborhood',
                title: '相邻节点',
                content: `同一父节点下的相关主题: ${siblings.join('；')}`,
                score: 0.78
            });
        }

        if (ancestors.length) {
            records.push({
                type: 'graph-ancestors',
                title: '上位知识结构',
                content: `上位结构: ${ancestors.join(' > ')}`,
                score: 0.74
            });
        }

        records.push({
            type: 'retrieval-query',
            title: '检索查询',
            content: [
                `精确查询: ${profile.primaryTerm}`,
                `扩展查询: ${profile.broadQuery}`,
                `中文查询: ${profile.terms.chinese || '无'}`,
                `英文查询: ${profile.terms.english || '无'}`,
            ].join('\n'),
            score: 0.7
        });
        return records;
    }

    async function retrieveExternalNodeKnowledge(profile) {
        const query = profile.broadQuery || profile.primaryTerm;
        const tasks = [
            queryOpenAlex(query),
            querySemanticScholar(query),
            queryGitHub(query),
            queryHackerNews(query),
            queryHuggingFace(query),
        ];
        const settled = await Promise.allSettled(tasks);
        const records = settled.flatMap(item => item.status === 'fulfilled' ? item.value : []);
        return [
            ...records,
            ...buildReferenceSearchRecords(profile),
        ];
    }

    function buildRetrievalPolicy(profile) {
        return [
            '先用本地图谱上下文限定节点含义，避免同名概念误解。',
            '学术证据优先：OpenAlex / Semantic Scholar / arXiv 用来找论文、综述和引用网络。',
            '工程证据其次：GitHub / Hugging Face / Papers with Code 用来找实现、模型、数据集和复现实践。',
            '社区信号辅助：Hacker News、技术博客、开源 issue、论坛讨论用来判断落地痛点和争议。',
            '统计节点补充 Data Commons、Wikidata、OpenStreetMap 等实体和指标图谱。',
            `本节点优先领域: ${profile.domain.label}；推荐源: ${profile.domain.sources.join('、')}。`,
        ];
    }

    async function queryOpenAlex(query) {
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=3&sort=cited_by_count:desc&select=id,display_name,publication_year,cited_by_count,doi,primary_location`;
        const data = await fetchJsonWithTimeout(url, 4500);
        return (data.results || []).map(item => ({
            type: 'scholarly',
            source: 'OpenAlex',
            title: item.display_name,
            url: item.doi || item.primary_location?.landing_page_url || item.id,
            meta: `${item.publication_year || 'n.d.'} · citations ${item.cited_by_count ?? 0}`,
            snippet: 'OpenAlex学术图谱结果，用于定位论文、作者、机构、主题和引用网络。'
        }));
    }

    async function querySemanticScholar(query) {
        const fields = 'title,year,citationCount,url,abstract,authors';
        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=3&fields=${encodeURIComponent(fields)}`;
        const data = await fetchJsonWithTimeout(url, 4500);
        return (data.data || []).map(item => ({
            type: 'scholarly',
            source: 'Semantic Scholar',
            title: item.title,
            url: item.url,
            meta: `${item.year || 'n.d.'} · citations ${item.citationCount ?? 0}`,
            snippet: compactText(item.abstract || `Authors: ${(item.authors || []).slice(0, 4).map(author => author.name).join(', ')}`, 360)
        }));
    }

    async function queryGitHub(query) {
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=3`;
        const data = await fetchJsonWithTimeout(url, 4500);
        return (data.items || []).map(item => ({
            type: 'implementation',
            source: 'GitHub',
            title: item.full_name,
            url: item.html_url,
            meta: `stars ${item.stargazers_count ?? 0} · ${item.language || 'mixed'}`,
            snippet: compactText(item.description || '开源实现或工程参考。', 300)
        }));
    }

    async function queryHackerNews(query) {
        const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=3`;
        const data = await fetchJsonWithTimeout(url, 4500);
        return (data.hits || []).map(item => ({
            type: 'community',
            source: 'Hacker News',
            title: item.title || item.story_title,
            url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
            meta: `points ${item.points ?? 0} · comments ${item.num_comments ?? 0}`,
            snippet: '技术社区讨论结果，用于观察落地痛点、争议和实践经验。'
        }));
    }

    async function queryHuggingFace(query) {
        const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=3&sort=downloads&direction=-1`;
        const data = await fetchJsonWithTimeout(url, 4500);
        return (Array.isArray(data) ? data : []).map(item => ({
            type: 'model-community',
            source: 'Hugging Face',
            title: item.modelId || item.id,
            url: `https://huggingface.co/${item.modelId || item.id}`,
            meta: `downloads ${item.downloads ?? 0} · likes ${item.likes ?? 0}`,
            snippet: compactText((item.tags || []).slice(0, 12).join(', ') || '模型社区相关资源。', 300)
        }));
    }

    async function fetchJsonWithTimeout(url, timeout = 4000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }

    function buildReferenceSearchRecords(profile) {
        const query = encodeURIComponent(profile.broadQuery || profile.primaryTerm);
        const records = [
            {
                type: 'reference-search',
                source: 'arXiv',
                title: 'arXiv advanced search',
                url: `https://arxiv.org/search/?query=${query}&searchtype=all`,
                meta: 'academic preprints',
                snippet: '前沿论文预印本检索入口，适合量子、AI、物理、天文、数学和计算机节点。'
            },
            {
                type: 'reference-search',
                source: 'GitHub',
                title: 'GitHub repository search',
                url: `https://github.com/search?q=${query}&type=repositories`,
                meta: 'open source',
                snippet: '开源实现检索入口，用来观察项目活跃度、工程路线和开发者采用情况。'
            },
            {
                type: 'reference-search',
                source: 'Hacker News',
                title: 'Hacker News community search',
                url: `https://hn.algolia.com/?q=${query}`,
                meta: 'technical community',
                snippet: '前沿技术社区讨论入口，用来观察落地痛点、质疑、替代方案和实践经验。'
            },
            {
                type: 'reference-search',
                source: 'Papers with Code',
                title: 'Papers with Code search',
                url: `https://paperswithcode.com/search?q=${query}`,
                meta: 'papers, code, datasets',
                snippet: '论文、代码、数据集和基准检索入口，适合AI、机器人、视觉、NLP和科学机器学习节点。'
            },
            {
                type: 'reference-search',
                source: 'Google Scholar',
                title: 'Google Scholar search',
                url: `https://scholar.google.com/scholar?q=${query}`,
                meta: 'scholarly search',
                snippet: '学术补充检索入口，用来查找综述、引用链和不同数据库未覆盖的论文。'
            },
        ];
        if (['knowledge-graph', 'energy-climate', 'society-governance'].includes(profile.domain.id)) {
            records.push({
                type: 'reference-search',
                source: 'Data Commons',
                title: 'Data Commons browser and API',
                url: `https://datacommons.org/browser/`,
                meta: 'entities, places, statistical variables',
                snippet: '世界统计图谱入口，适合查地点、实体、统计变量、时间序列和来源。'
            });
        }
        return records;
    }

    function compactText(value, max = 300) {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > max ? `${text.slice(0, max)}...` : text;
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
            const newData = applyReadableGraphLayout(buildGraphData([tree], THEME, '_imp'));
            graphNodeById = new Map(newData.nodes.map(node => [node.id, node]));

            Graph.graphData(newData);
            refreshLayoutGuides(newData);
            frameGraphOverview(900, 120);

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
        retrieveKnowledge: async ({ nodeName, query, topK } = {}) => {
            const targetNode = nodeName ? findGraphNode(nodeName) : null;
            const selected = targetNode || (query ? findGraphNode(query) : null);
            if (!selected) {
                return {
                    error: 'node_not_found',
                    query: query || nodeName || '',
                    message: '知识图谱中没有找到要检索的节点。'
                };
            }
            const knowledge = await buildNodeKnowledgeBundle(selected);
            const limit = Number.isFinite(topK) ? Math.max(1, Math.min(24, topK)) : 12;
            return {
                node: {
                    id: selected.id,
                    name: selected.name,
                    source: selected.source || '',
                    scale: selected.scale || '',
                    maturity: selected.maturity || '',
                    layer: selected.layer || ''
                },
                profile: knowledge.profile,
                graph: {
                    path: knowledge.graphContext.path,
                    parent: knowledge.graphContext.parent?.name || '',
                    children: knowledge.graphContext.children.slice(0, 16).map(item => item.name),
                    siblings: knowledge.graphContext.siblings.slice(0, 16).map(item => item.name),
                    nodeCount: knowledge.graphContext.nodeCount,
                    linkCount: knowledge.graphContext.linkCount,
                },
                localRecords: knowledge.localRecords.slice(0, Math.min(limit, 8)),
                externalRecords: knowledge.externalRecords.slice(0, limit),
                retrievalPolicy: knowledge.retrievalPolicy,
            };
        },
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
