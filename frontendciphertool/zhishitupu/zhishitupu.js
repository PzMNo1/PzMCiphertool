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
    if (container.querySelector('canvas')) return;

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
        .onNodeClick(node => {
            const distance = 100;
            const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
            Graph.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                2000
            );
        });

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

    const animateStars = () => {
        // 添加运行状态检查，如果未激活则停止循环
        if (!window.isZSTPActive) return;

        angle += 0.0003;
        starMesh.rotation.y = angle;
        starMesh.rotation.x = angle * 0.2;
        requestAnimationFrame(animateStars);
    };
    animateStars();

    // 7. 力导向参数
    Graph.d3Force('charge').strength(-150);
    Graph.d3Force('link').distance(80);

    // 8. 窗口自适应
    window.addEventListener('resize', () => {
        if(container && Graph) {
            Graph.width(container.clientWidth);
            Graph.height(container.clientHeight);
        }
    });

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
    // 保存原始图谱快照（用于清除旧导入）
    const originalData = JSON.parse(JSON.stringify(gData));

    if (importBtn && folderInput) {
        importBtn.addEventListener('click', () => folderInput.click());
        folderInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            const tree = buildFolderTree(files);
            // 给树节点按深度上色
            assignDepthColors(tree, 0);
            const newData = buildGraphData([tree], THEME, '_imp');
            // 先恢复到原始数据（清除旧导入），再追加新导入
            const base = JSON.parse(JSON.stringify(originalData));
            const rootId = base.nodes[0]?.id;
            const importRootId = newData.nodes[0]?.id;
            if (rootId && importRootId) {
                newData.links.push({ source: rootId, target: importRootId });
            }
            // 重置导入 ID 计数器
            _graphAutoId = base.nodes.length;
            Graph.graphData({
                nodes: [...base.nodes, ...newData.nodes],
                links: [...base.links, ...newData.links]
            });
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
        const root = { name: '', children: {} };
        files.forEach(f => {
            const parts = f.webkitRelativePath.split('/');
            if (!root.name) root.name = parts[0];
            if (parts.some(p => SKIP.includes(p) || (p.startsWith('.') && p !== '.'))) return;
            let cur = root;
            for (let i = 1; i < parts.length; i++) {
                const p = parts[i];
                if (i === parts.length - 1) {
                    if (!cur.children[p]) cur.children[p] = { name: p };
                } else {
                    if (!cur.children[p]) cur.children[p] = { name: p, children: {} };
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



    window.ZSTP = {
        pause: () => {
            if (!window.isZSTPActive) return;
            window.isZSTPActive = false;
            if (Graph) Graph.pauseAnimation(); // 暂停力导向图物理计算和渲染
            console.log('知识图谱已暂停');
        },
        resume: () => {
            if (window.isZSTPActive) return;
            window.isZSTPActive = true;
            if (Graph) Graph.resumeAnimation(); // 恢复物理计算
            animateStars(); // 重启星空动画循环
            resetPanel(); // 重置面板显示和定时器
            console.log('知识图谱已恢复');
        }
    };
}
