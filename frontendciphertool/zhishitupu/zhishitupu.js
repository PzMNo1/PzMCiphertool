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
            await loadScript('./vendor/three/three.min.js', 'THREE');
        }
        if (typeof SpriteText === 'undefined') {
            await loadScript('./vendor/three-spritetext/three-spritetext.min.js', 'SpriteText');
        }
        if (typeof ForceGraph3D === 'undefined') {
            await loadScript('./vendor/3d-force-graph/3d-force-graph.min.js', 'ForceGraph3D');
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


// 纯布局函数：只依赖入参 data，无 DOM / three.js 依赖，可被 Node 侧 audit 直接调用。
function applyReadableGraphLayout(data) {
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
    const nodes = data?.nodes || [];
    const links = data?.links || [];
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const childrenById = new Map(nodes.map(node => [node.id, []]));
    const parentById = new Map();
    const layoutVisited = new Set();

    // 只有层级边参与径向布局骨架。__hierarchy === false 的边（如 Obsidian 双链）只作为
    // 视觉连线存在，不能当父子关系，否则会被当成孩子重复摆放并把父子关系搅乱。
    // 多父节点取第一个父节点（导入 vault 时层级边先入列，因此目录结构优先于双链）。
    // 这两处修复是为了兼容有环、多父的非树图：原来的写法会因 last-wins 覆盖父节点，
    // 并在有环时让 subtreeWeight 无限递归。
    links.forEach(link => {
        if (link.__hierarchy === false) return;
        const sourceId = getLinkEndpointId(link.source);
        const targetId = getLinkEndpointId(link.target);
        if (!sourceId || !targetId || !nodeById.has(sourceId) || !nodeById.has(targetId)) return;
        if (parentById.has(targetId) || sourceId === targetId) return;
        childrenById.get(sourceId).push(nodeById.get(targetId));
        parentById.set(targetId, sourceId);
    });

    let roots = nodes.filter(node => !parentById.has(node.id));
    if (!roots.length && nodes.length) roots = [nodes[0]];

    const weightCache = new Map();
    const weightVisiting = new Set();
    const subtreeWeight = node => {
        if (weightCache.has(node.id)) return weightCache.get(node.id);
        if (weightVisiting.has(node.id)) return 1;
        weightVisiting.add(node.id);
        const children = childrenById.get(node.id) || [];
        const weight = 1 + children.reduce((sum, child) => sum + subtreeWeight(child), 0);
        weightVisiting.delete(node.id);
        weightCache.set(node.id, weight);
        return weight;
    };

    const rootAnchors = calculateRootAnchors(roots.length);
    roots.forEach((root, index) => {
        const anchor = rootAnchors[index] || { x: 0, y: 0, z: 0, dir: { x: 0, y: 0, z: 1 } };
        const rootDirection = normalizeVector(anchor.dir || { x: anchor.x, y: anchor.y, z: anchor.z });
        setNodeLayout(root, anchor.x, anchor.y, anchor.z, 0, root.id, '', rootDirection, index);
        layoutVisited.add(root.id);
        layoutChildren(root, root.id, rootDirection, 1);
    });

    roots.forEach(root => {
        root.__layoutGuideRadius = calculateClusterRadius(root);
    });

    // 非树图兜底：层级边覆盖不到的节点（孤立的环、或只被双链指向的游离节点）拿不到坐标，
    // 会全部堆在原点。这里把它们铺到一圈外围球面上，保证可见、可点、可搜索。
    const strayNodes = nodes.filter(node => !Number.isFinite(node.__layoutX));
    if (strayNodes.length) {
        const origin = roots[0] || { __layoutX: 0, __layoutY: 0, __layoutZ: 0, id: '', __layoutGuideRadius: 420 };
        const strayRadius = Math.max(620, (origin.__layoutGuideRadius || 420) + 320);
        strayNodes.forEach((node, index) => {
            const direction = fibonacciSphereDirection(index, strayNodes.length, 0.31);
            setNodeLayout(
                node,
                origin.__layoutX + direction.x * strayRadius,
                origin.__layoutY + direction.y * strayRadius,
                origin.__layoutZ + direction.z * strayRadius,
                2,
                origin.id,
                '',
                direction,
                index
            );
        });
    }

    return data;

    function layoutChildren(parent, rootId, parentDirection, depth) {
        const children = childrenById.get(parent.id) || [];
        if (!children.length) return;

        children.forEach((child, index) => {
            if (layoutVisited.has(child.id)) return;
            layoutVisited.add(child.id);
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

// ---------- Obsidian vault 建图（纯逻辑：不碰 DOM / three.js，Node 侧可完整回归） ----------

// 按目录深度分配的配色
const DEPTH_COLORS = [
    0x00ff88,  // 根 - 绿
    0x00ccff,  // 1层 - 青
    0x6699ff,  // 2层 - 蓝
    0xaa66ff,  // 3层 - 紫
    0xff66aa,  // 4层 - 粉
    0xffaa33,  // 5层 - 橙
    0xffdd44,  // 6层+ - 黄
];

// Obsidian 笔记按首个标签哈希着色；没有标签时退回顶层目录名
const VAULT_TAG_COLORS = [0x00e5ff, 0x8b5cf6, 0x10b981, 0xf59e0b, 0xec4899, 0x6366f1, 0xffd166, 0x06b6d4];

function vaultTagColorIndex(key) {
    let hash = 0;
    const text = String(key || 'default');
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return hash % VAULT_TAG_COLORS.length;
}

function assignVaultNodeStyles(node, depth) {
    const children = node.children || [];
    if (node.isVaultNote) {
        // 反链越多越大越亮：枢纽笔记（被很多笔记引用）在图上自然凸显
        const backlinks = (node.vaultInLinks || []).length;
        node.group = backlinks >= 5 ? 'root' : (backlinks >= 1 ? 'category' : 'classic');
        node.color = VAULT_TAG_COLORS[vaultTagColorIndex((node.vaultTags || [])[0] || node.vaultFolder || node.name)];
    } else if (node.isVaultAttachment) {
        node.group = 'logic';
        node.color = 0xffdd44;
    } else if (node.kind === 'directory') {
        node.group = depth === 0 ? 'root' : 'category';
        node.color = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
        node.val = depth === 0 ? 50 : (12 + children.length * 0.6);
    }
    children.forEach(child => assignVaultNodeStyles(child, depth + 1));
}

// 双链作为非层级边（__hierarchy: false）追加：目录骨架决定空间位置，双链只表达关联。
// 必须放在 buildGraphData 之后入列，这样层级边先注册、first-parent-wins 时目录结构优先。
function appendVaultLinks(graph, vault) {
    const nodeByPath = new Map();
    graph.nodes.forEach(node => { if (node.path) nodeByPath.set(node.path, node); });
    const byVaultPath = new Map();
    [...vault.notes, ...vault.referencedAttachments].forEach(item => byVaultPath.set(item.vaultPath, item));

    let wikilinkEdges = 0;
    let attachmentEdges = 0;
    let skipped = 0;
    const edgeKeys = new Set();
    vault.links.forEach(link => {
        const from = byVaultPath.get(link.sourcePath);
        const to = byVaultPath.get(link.targetPath);
        if (!from || !to) { skipped += 1; return; }
        const sourceNode = nodeByPath.get(from.path);
        const targetNode = nodeByPath.get(to.path);
        if (!sourceNode || !targetNode || sourceNode === targetNode) { skipped += 1; return; }
        const edgeKey = `${sourceNode.id}->${targetNode.id}`;
        if (edgeKeys.has(edgeKey)) return;
        edgeKeys.add(edgeKey);
        graph.links.push({
            source: sourceNode.id,
            target: targetNode.id,
            __hierarchy: false,
            __wikilink: link.kind === 'wikilink',
            __embed: link.kind === 'embed',
            __attachment: link.kind === 'attachment',
            __anchor: link.anchor || '',
            __display: link.display || ''
        });
        if (link.kind === 'attachment') attachmentEdges += 1;
        else wikilinkEdges += 1;
    });

    return { wikilinkEdges, attachmentEdges, skippedEdges: skipped };
}

// vault -> graphData 的完整装配。前端 importVaultGraph 与 Node 侧 obsidianVault.audit.js 共用同一份逻辑。
function buildVaultGraphData(vault, options) {
    const opts = options || {};
    const api = opts.api || (typeof window !== 'undefined' ? window.OBSIDIAN_VAULT : null);
    if (!api) throw new Error('obsidianVault.js 未加载，无法把 vault 转成图谱');
    if (!vault || !Array.isArray(vault.notes)) throw new Error('vault 解析结果无效');

    const tree = api.buildVaultTree(vault, opts);
    assignVaultNodeStyles(tree, 0);
    _graphAutoId = 0;
    const graph = buildGraphData([tree], opts.theme || {}, opts.prefix || '_vault');
    const linkStats = appendVaultLinks(graph, vault);
    return { tree, graph, linkStats };
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
        // __hierarchy === false 的边是 Obsidian 双链/附件引用：它们不参与布局，用独立配色
        // 和更细的线区分开，否则用户分不清“目录归属”和“笔记关联”。
        .linkColor(link => {
            if (link.__hierarchy === false) {
                if (link.__attachment) return colorToRgba(0xffdd44, 0.3);
                return colorToRgba(link.__embed ? 0xff66aa : 0x7cf7ff, 0.5);
            }
            const target = getLinkNode(link, 'target');
            const depth = target?.__layoutDepth || 1;
            return colorToRgba(target?.color || 0x00ffff, depth <= 1 ? 0.28 : (depth === 2 ? 0.18 : 0.09));
        })
        .linkWidth(link => {
            if (link.__hierarchy === false) return link.__attachment ? 0.18 : 0.42;
            const target = getLinkNode(link, 'target');
            const depth = target?.__layoutDepth || 1;
            return depth <= 1 ? 1.15 : (depth === 2 ? 0.7 : 0.35);
        })
        .linkDirectionalParticles(link => {
            if (link.__hierarchy === false) return link.__attachment ? 0 : (link.__embed ? 3 : 1);
            const target = getLinkNode(link, 'target');
            const depth = target?.__layoutDepth || 1;
            return depth <= 1 ? 3 : (depth === 2 ? 2 : 1);
        })
        .linkDirectionalParticleWidth(link => {
            if (link.__hierarchy === false) return link.__embed ? 1.6 : 1;
            const target = getLinkNode(link, 'target');
            return (target?.__layoutDepth || 1) <= 2 ? 2 : 1.1;
        })
        .linkDirectionalParticleSpeed(link => (link.__hierarchy === false ? 0.0035 : 0.005)) // 粒子速度
        .linkDirectionalParticleColor(link => {
            if (link.__hierarchy === false) return colorToRgba(link.__embed ? 0xff66aa : 0x7cf7ff, 0.85);
            return colorToRgba(getLinkNode(link, 'target')?.color || 0xffffff, 0.78);
        })
        
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
        // Obsidian 笔记节点优先走笔记面板：显示正文、frontmatter、标签和双向链接，
        // 而不是退化成"当前文件不是常见代码类型"的提示。
        if (getVaultNote(node)) {
            inspectVaultNoteNode(node);
            return;
        }
        if (graphInspectMode === 'doc') {
            inspectDocumentNode(node);
            return;
        }
        inspectCodeNode(node);
    }

    function getVaultNote(node) {
        if (!node || !node.path || !vaultNotesByPath.size) return null;
        return vaultNotesByPath.get(node.path) || null;
    }

    function vaultLinkList(items, emptyText) {
        if (!items.length) return `<p class="zstp-vault-empty">${escapeHtml(emptyText)}</p>`;
        return `<div class="zstp-vault-links">${items.map(item =>
            `<button type="button" class="zstp-vault-link" data-graph-node-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`
        ).join('')}</div>`;
    }

    function inspectVaultNoteNode(node) {
        const note = getVaultNote(node);
        const context = getNodeGraphContext(node);
        const tags = (note.tags || []).map(tag => `<span class="zstp-vault-tag">#${escapeHtml(tag)}</span>`).join('');
        const frontmatterEntries = Object.entries(note.frontmatter || {});
        const frontmatterHtml = frontmatterEntries.length
            ? frontmatterEntries.map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(Array.isArray(value) ? value.join(', ') : String(value))}</td></tr>`).join('')
            : '<tr><td colspan="2">该笔记没有 frontmatter</td></tr>';

        showPreview(
            note.title || node.name,
            `${note.vaultPath} · ${note.wordCount} 字 · 出链 ${note.outLinks.length} · 反链 ${note.inLinks.length}`,
            `
                <div class="zstp-vault-note">
                    <div class="zstp-vault-tags">${tags || '<span class="zstp-vault-tag is-empty">无标签</span>'}</div>
                    ${note.kgNode ? `<p class="zstp-vault-kgnode">骨架节点映射: <code>${escapeHtml(note.kgNode)}</code></p>` : ''}
                    <p class="zstp-vault-excerpt">${escapeHtml(note.excerpt || '（空笔记）')}</p>
                    <section class="zstp-kb-record">
                        <h4>Frontmatter 属性</h4>
                        <table class="zstp-vault-table">${frontmatterHtml}</table>
                    </section>
                    <section class="zstp-kb-record">
                        <h4>标题大纲 (${note.headings.length})</h4>
                        ${note.headings.length ? `<p class="zstp-vault-headings">${escapeHtml(note.headings.slice(0, 16).join(' / '))}</p>` : '<p class="zstp-vault-empty">无标题行</p>'}
                    </section>
                    <section class="zstp-kb-record">
                        <h4>出链 (${note.outLinks.length})</h4>
                        ${vaultLinkList(context.outlinks || [], '这篇笔记没有指向其他笔记')}
                    </section>
                    <section class="zstp-kb-record">
                        <h4>反链 (${note.inLinks.length})</h4>
                        ${vaultLinkList(context.backlinks || [], '没有其他笔记指向它')}
                    </section>
                    <section class="zstp-kb-record">
                        <h4>原始 Markdown</h4>
                        <button type="button" id="zstp-vault-fulltext-btn" class="zstp-vault-link">读取完整正文</button>
                        <div id="zstp-vault-fulltext" class="zstp-vault-fulltext"></div>
                    </section>
                </div>
            `
        );

        const bodyEl = document.getElementById('zstp-preview-body');
        if (!bodyEl) return;
        bodyEl.querySelectorAll('[data-graph-node-id]').forEach(element => {
            element.addEventListener('click', () => {
                const target = graphNodeById.get(element.dataset.graphNodeId);
                if (target) runGraphNodeAction(target, null);
            });
        });
        const fullTextButton = bodyEl.querySelector('#zstp-vault-fulltext-btn');
        if (fullTextButton) {
            fullTextButton.addEventListener('click', async () => {
                const file = importedFiles.get(note.path);
                const container = bodyEl.querySelector('#zstp-vault-fulltext');
                if (!file) {
                    fullTextButton.textContent = '原始文件不在本次导入中';
                    return;
                }
                fullTextButton.disabled = true;
                fullTextButton.textContent = '读取中...';
                try {
                    const text = await readFileText(file);
                    if (container) container.innerHTML = `<pre><code>${escapeHtml(limitPreviewText(text))}</code></pre>`;
                    fullTextButton.remove();
                } catch (error) {
                    fullTextButton.disabled = false;
                    fullTextButton.textContent = `读取失败: ${error.message}`;
                }
            });
        }
    }

    function inspectCodeNode(node) {
        const file = getNodeFile(node);
        if (!file) {
            inspectKnowledgeGraphNode(node);
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
            inspectKnowledgeGraphNode(node);
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

    function worldStatusBadge(status, score) {
        const confirmed = /confirmed/.test(String(status || ''));
        const label = worldKnowledgeStatusLabel(status);
        const tone = status === 'no-authoritative-match' || status === 'source-error' ? 'is-empty'
            : (confirmed ? 'is-confirmed' : 'is-candidate');
        return `<span class="zstp-world-badge ${tone}">${escapeHtml(label)} · ${Number(score || 0).toFixed(2)}</span>`;
    }

    // 节点面板的“世界知识”区块，是节点的主视图：先给权威实体与百科正文，
    // 再给关系声明，模板化记录和论文证据退到后面。
    function renderWorldKnowledgeSection(node) {
        const entry = typeof getGraphNodeWorldKnowledge === 'function' ? getGraphNodeWorldKnowledge(node.name) : null;
        if (!entry) {
            return `
                <section class="zstp-world is-missing">
                    <header class="zstp-world-head">
                        <span class="zstp-world-kicker">WORLD KNOWLEDGE · 世界知识</span>
                        <span class="zstp-world-badge is-empty">尚未编译</span>
                    </header>
                    <p class="zstp-world-empty">这个节点还没有世界知识数据：批量层（SPARQL 精确标签匹配 + 批量实体搜索）没有命中它。
                    运行 <code>node compileWorldKnowledge.js</code> 会逐节点搜索补齐，然后重新加载页面。</p>
                </section>
            `;
        }

        const pieces = [`
            <header class="zstp-world-head">
                <span class="zstp-world-kicker">WORLD KNOWLEDGE · 世界知识</span>
                ${worldStatusBadge(entry.status, entry.score)}
            </header>
        `];

        const entity = entry.entityDetail;
        const article = entry.article;
        const claimLines = worldClaimSummary(entry);

        if (entity) {
            const label = entity.label.zh || entity.label.en || node.name;
            const secondary = entity.label.zh && entity.label.en && entity.label.zh !== entity.label.en ? ` / ${entity.label.en}` : '';
            const description = entity.description.zh || entity.description.en || '';
            pieces.push(`
                <div class="zstp-world-entity">
                    <div class="zstp-world-label">${escapeHtml(label)}${escapeHtml(secondary)}
                        <a class="zstp-world-qid" href="${escapeHtml(entity.uri)}" target="_blank" rel="noopener">${escapeHtml(entity.id)}</a>
                    </div>
                    ${description ? `<p class="zstp-world-desc">${escapeHtml(description)}</p>` : ''}
                    ${entity.aliases.length ? `<p class="zstp-world-aliases">别名: ${escapeHtml(entity.aliases.join('；'))}</p>` : ''}
                </div>
            `);
            if (claimLines.length) {
                const rows = claimLines.map(line => {
                    const match = line.match(/^(.*?)\s*\((P\d+)\):\s*([\s\S]*)$/);
                    return `<tr><th>${escapeHtml(match ? match[1] : '关系')}${match ? ` <code>${escapeHtml(match[2])}</code>` : ''}</th><td>${escapeHtml(match ? match[3] : line)}</td></tr>`;
                }).join('');
                pieces.push(`
                    <section class="zstp-kb-record">
                        <h4>权威关系声明 (${claimLines.length})</h4>
                        <table class="zstp-vault-table zstp-world-claims">${rows}</table>
                    </section>
                `);
            }
        }

        const prose = (entity && entity.wikipedia && entity.wikipedia.extract) || (article && article.extract) || '';
        const proseTitle = (entity && entity.wikipedia && entity.wikipedia.title) || (article && article.title) || '';
        const proseUrl = (entity && entity.wikipedia && entity.wikipedia.url) || (article && article.url) || '';
        if (prose) {
            pieces.push(`
                <section class="zstp-kb-record">
                    <h4>百科条目《${escapeHtml(proseTitle)}》</h4>
                    <p class="zstp-world-prose">${escapeHtml(prose)}</p>
                    ${article && article.excerptFromSearch ? '<p class="zstp-world-note">未取到完整导言，此处为百科检索摘要。</p>' : ''}
                    <p class="zstp-world-note">维基百科正文采用 CC BY-SA 4.0 许可。</p>
                </section>
            `);
        }

        const sourceLinks = [];
        if (entity) sourceLinks.push(`<a class="zstp-vault-link" href="${escapeHtml(entity.uri)}" target="_blank" rel="noopener">Wikidata 实体页</a>`);
        if (proseUrl) sourceLinks.push(`<a class="zstp-vault-link" href="${escapeHtml(proseUrl)}" target="_blank" rel="noopener">维基百科条目</a>`);
        if (sourceLinks.length) pieces.push(`<div class="zstp-world-sources">${sourceLinks.join('')}</div>`);

        if (entry.status === 'no-authoritative-match' || entry.status === 'source-error') {
            const runnerText = (entry.runnersUp || []).map(item => `${item.label} ${item.id} [${Number(item.score).toFixed(2)}]`).join('；');
            pieces.push(`
                <p class="zstp-world-note">
                    ${entry.status === 'source-error'
                        ? '本次解析遇到来源访问失败，重跑 compileWorldKnowledge.js 可补齐。'
                        : '这个节点在 Wikidata 与维基百科中都没有达到置信度阈值的对应实体，属于图谱自身的聚合 / 路线图概念，而不是可消歧的实体。'}
                    ${runnerText ? `被拒绝的候选：${escapeHtml(runnerText)}` : ''}
                </p>
            `);
        } else if (/candidate/.test(String(entry.status))) {
            pieces.push('<p class="zstp-world-note">该匹配为待确认状态：分数未达到“已确认”阈值，请以原始来源为准。</p>');
        }

        pieces.push(`<p class="zstp-world-provenance">检索式 中「${escapeHtml((entry.query && entry.query.zh) || '无')}」/ 英「${escapeHtml((entry.query && entry.query.en) || '无')}」；解析时间 ${escapeHtml(String(entry.resolvedAt || '').slice(0, 10))}</p>`);

        return `<section class="zstp-world" data-status="${escapeHtml(entry.status || '')}">${pieces.join('')}</section>`;
    }

    function inspectKnowledgeGraphNode(node) {
        const context = getNodeGraphContext(node);
        const allRecords = node.knowledgeBase || [];
        const worldRecords = allRecords.filter(record => String(record.id || '').startsWith('world-'));
        // 世界知识已经在 renderWorldKnowledgeSection 里单独渲染，这里不再重复列出
        const records = allRecords
            .filter(record => !String(record.id || '').startsWith('world-'))
            .slice(0, 8);
        const children = (context.children || []).slice(0, 12).map(item => item.name);
        const recordHtml = records.length
            ? records.map(item => `
                <section class="zstp-kb-record">
                    <h4>${escapeHtml(item.title || '节点知识库')}</h4>
                    <pre><code>${escapeHtml(item.content || '')}</code></pre>
                    ${item.keywords?.length ? `<p class="zstp-kb-keywords">${escapeHtml(item.keywords.slice(0, 12).join(' / '))}</p>` : ''}
                </section>
            `).join('')
            : '<p>这个节点暂未生成知识库记录。</p>';
        showPreview(
            node.name,
            `${(context.path || []).join(' > ')} · 世界知识 ${worldRecords.length} 条 · 其他记录 ${records.length} 条`,
            `
                ${renderWorldKnowledgeSection(node)}
                <div class="zstp-kb-summary">
                    <p>${escapeHtml(node.description || '默认知识图谱节点，可用于模型解释与检索增强。')}</p>
                    ${children.length ? `<p>直接子节点: ${escapeHtml(children.join('；'))}</p>` : ''}
                </div>
                ${recordHtml}
            `
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

    async function buildNodeKnowledgeBundle(node, userQuery = '', { liveExternal = false } = {}) {
        const graphContext = getNodeGraphContext(node);
        const profile = buildNodeKnowledgeProfile(node, graphContext);
        const retrievalQuery = userQuery || profile.primaryTerm;
        const localRecords = rankKnowledgeRecords(
            retrieveLocalNodeKnowledge(node, graphContext, profile), retrievalQuery, profile, 20
        );
        const externalRecords = liveExternal ? await retrieveExternalNodeKnowledgeFast(profile) : [];
        const rankedExternalRecords = rankKnowledgeRecords(externalRecords, retrievalQuery, profile, 24);
        const evidenceGraph = buildNodeEvidenceGraph(node, graphContext, localRecords, rankedExternalRecords, retrievalQuery);
        return {
            profile,
            graphContext,
            localRecords,
            externalRecords: rankedExternalRecords,
            evidenceGraph,
            retrievalPolicy: buildRetrievalPolicy(profile),
            diagnostics: buildRetrievalDiagnostics(node, localRecords, externalRecords, retrievalQuery),
        };
    }

    async function retrieveExternalNodeKnowledgeFast(profile) {
        const cached = readKnowledgeRetrievalCache(`zstp-rag-v2:${profile.domain.id}:${profile.primaryTerm}`);
        if (cached) return cached;
        const fastTimeoutMs = 1800;
        const task = profile.domain.id === 'bio-health'
            ? queryEuropePmc(profile.primaryTerm, fastTimeoutMs)
            : queryCrossref(profile.primaryTerm, fastTimeoutMs);
        try {
            return await Promise.race([
                task,
                new Promise(resolve => setTimeout(() => resolve([]), 2000))
            ]);
        } catch {
            return [];
        }
    }

    function stableKnowledgeId(prefix, value) {
        let hash = 2166136261;
        for (const char of String(value || '')) {
            hash ^= char.codePointAt(0);
            hash = Math.imul(hash, 16777619);
        }
        return `${prefix}:${(hash >>> 0).toString(36)}`;
    }

    function extractClaimCandidate(record) {
        if (classifyEvidenceUsability(record) !== 'claim-supporting') return null;
        const snippet = compactText(record.snippet || '', 900);
        if (!snippet || /摘要不可用|未收录摘要/.test(snippet)) return null;
        return {
            id: stableKnowledgeId('claim', `${record.source}:${record.title}:${snippet}`),
            statement: snippet,
            status: 'source-asserted',
            scope: record.queryIntent || 'retrieved evidence',
            qualifiers: ['仅代表来源摘要中的主张', '回答时须保留研究对象、条件与不确定性', '未读取全文时不得扩展为更强结论'],
            citation: record.citation || null
        };
    }

    function buildNodeEvidenceGraph(node, context, localRecords, externalRecords, query) {
        const nodes = [{ id: `topic:${node.id}`, type: 'topic', label: node.name, graphPath: context.path }];
        const edges = [];
        localRecords.filter(record => ['node-knowledge-base', 'compiled-evidence'].includes(record.type)).forEach(record => {
            if (record.type === 'compiled-evidence') {
                const evidenceId = stableKnowledgeId('evidence', record.url || `${record.source}:${record.title}`);
                nodes.push({
                    id: evidenceId, type: 'evidence', label: record.title, source: record.source,
                    snippet: record.content, citation: record.citation || null,
                    evidenceLevel: record.evidenceLevel, evidenceUsability: classifyEvidenceUsability(record),
                    retrievalScore: record.retrievalScore, provenance: record.provenance || null
                });
                edges.push({ source: evidenceId, target: `topic:${node.id}`, relation: 'compiled_for', query });
                const claim = extractClaimCandidate(record);
                if (claim) {
                    nodes.push({ ...claim, type: 'claim' });
                    edges.push({ source: evidenceId, target: claim.id, relation: 'asserts' });
                    edges.push({ source: claim.id, target: `topic:${node.id}`, relation: 'about' });
                }
                return;
            }
            const id = stableKnowledgeId('framework', `${node.id}:${record.title}`);
            nodes.push({ id, type: 'framework', label: record.title, content: record.content, evidenceUsability: 'analysis-framework' });
            edges.push({ source: `topic:${node.id}`, target: id, relation: 'analyzed_by' });
        });
        externalRecords.forEach(record => {
            const evidenceId = stableKnowledgeId('evidence', record.url || `${record.source}:${record.title}`);
            nodes.push({
                id: evidenceId, type: 'evidence', label: record.title, source: record.source,
                snippet: record.snippet || '', citation: record.citation || null,
                evidenceLevel: record.evidenceLevel || 'unclassified', evidenceUsability: classifyEvidenceUsability(record),
                retrievalScore: record.retrievalScore, queryIntent: record.queryIntent || '', retrievedAt: record.retrievedAt || null
            });
            edges.push({ source: evidenceId, target: `topic:${node.id}`, relation: 'retrieved_for', query });
            const claim = extractClaimCandidate(record);
            if (claim) {
                nodes.push({ ...claim, type: 'claim' });
                edges.push({ source: evidenceId, target: claim.id, relation: 'asserts' });
                edges.push({ source: claim.id, target: `topic:${node.id}`, relation: 'about' });
            }
        });
        const related = [context.parent, ...(context.children || []), ...(context.siblings || [])].filter(Boolean);
        related.slice(0, 24).forEach(relatedNode => {
            const id = `topic:${relatedNode.id}`;
            nodes.push({ id, type: 'related-topic', label: relatedNode.name });
            edges.push({ source: `topic:${node.id}`, target: id, relation: context.parent?.id === relatedNode.id ? 'subtopic_of' : 'graph_neighbor' });
        });
        return {
            schemaVersion: '1.0', query, rootTopicId: `topic:${node.id}`,
            nodes: [...new Map(nodes.map(item => [item.id, item])).values()], edges,
            stats: {
                claims: nodes.filter(item => item.type === 'claim').length,
                claimSupportingEvidence: nodes.filter(item => item.type === 'evidence' && item.evidenceUsability === 'claim-supporting').length,
                discoveryOnlyEvidence: nodes.filter(item => item.type === 'evidence' && item.evidenceUsability === 'discovery-only').length
            }
        };
    }

    function tokenizeKnowledgeText(value) {
        const normalized = String(value || '').toLowerCase().normalize('NFKC');
        const latin = normalized.match(/[a-z][a-z0-9.+#-]{1,}/g) || [];
        const chinese = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
        const bigrams = chinese.flatMap(term => Array.from({ length: Math.max(0, term.length - 1) }, (_, index) => term.slice(index, index + 2)));
        return [...new Set([...latin, ...chinese, ...bigrams])];
    }

    function knowledgeRecordText(record) {
        return [record.title, record.content, record.snippet, record.meta, record.source, ...(record.keywords || [])].filter(Boolean).join(' ');
    }

    function lexicalKnowledgeScore(record, query, profile) {
        const queryTokens = tokenizeKnowledgeText([query, profile.terms.english, profile.terms.chinese].filter(Boolean).join(' '));
        const recordTokens = new Set(tokenizeKnowledgeText(knowledgeRecordText(record)));
        if (!queryTokens.length) return 0;
        const overlap = queryTokens.reduce((sum, token) => sum + (recordTokens.has(token) ? 1 : 0), 0) / queryTokens.length;
        const phrase = knowledgeRecordText(record).toLowerCase().includes(String(query || '').toLowerCase()) ? 0.25 : 0;
        return overlap + phrase;
    }

    function evidenceQualityScore(record) {
        const authority = { 'Europe PMC': 0.98, 'Semantic Scholar': 0.95, OpenAlex: 0.92, Crossref: 0.91, Wikidata: 0.9, 'Data Commons': 0.9, 'Hugging Face': 0.76, GitHub: 0.72, 'Hacker News': 0.45 };
        const sourceScore = authority[record.source] ?? (record.type === 'node-knowledge-base' ? 0.88 : 0.62);
        const year = Number(String(record.meta || '').match(/\b(19|20)\d{2}\b/)?.[0]);
        const recency = year ? Math.max(0, 1 - (new Date().getFullYear() - year) / 15) : 0.45;
        const citations = Number(String(record.meta || '').match(/citations\s+(\d+)/i)?.[1] || 0);
        const evidenceBonus = record.evidenceLevel === 'abstract-supported' ? 0.08 : record.evidenceLevel === 'bibliographic-only' ? -0.08 : 0;
        return sourceScore * 0.65 + recency * 0.2 + Math.min(1, Math.log10(citations + 1) / 4) * 0.15 + evidenceBonus;
    }

    function jaccardKnowledgeSimilarity(left, right) {
        const a = new Set(tokenizeKnowledgeText(knowledgeRecordText(left)));
        const b = new Set(tokenizeKnowledgeText(knowledgeRecordText(right)));
        if (!a.size || !b.size) return 0;
        const intersection = [...a].filter(token => b.has(token)).length;
        return intersection / (a.size + b.size - intersection);
    }

    function rankKnowledgeRecords(records, query, profile, limit) {
        const deduplicated = [];
        const seen = new Set();
        records.filter(record => record && (record.content || record.snippet || record.title)).forEach(record => {
            const key = String(record.url || record.title || knowledgeRecordText(record).slice(0, 120)).toLowerCase().replace(/\W+/g, '');
            if (!key || seen.has(key)) return;
            seen.add(key);
            deduplicated.push({
                ...record,
                evidenceUsability: classifyEvidenceUsability(record),
                retrievalScore: lexicalKnowledgeScore(record, query, profile) * 0.5 + evidenceQualityScore(record) * 0.3 + Math.min(1.2, Number(record.score || 0)) * 0.08 + Math.min(1, Number(record.rrfScore || 0) * 20) * 0.12
            });
        });
        const selected = [];
        while (deduplicated.length && selected.length < limit) {
            let bestIndex = 0;
            let bestScore = -Infinity;
            deduplicated.forEach((record, index) => {
                const redundancy = selected.length ? Math.max(...selected.map(item => jaccardKnowledgeSimilarity(record, item))) : 0;
                const mmr = 0.78 * record.retrievalScore - 0.22 * redundancy;
                if (mmr > bestScore) { bestScore = mmr; bestIndex = index; }
            });
            const [record] = deduplicated.splice(bestIndex, 1);
            selected.push({ ...record, retrievalScore: Number(record.retrievalScore.toFixed(4)) });
        }
        return selected;
    }

    function classifyEvidenceUsability(record) {
        if (record.type === 'node-knowledge-base') return 'analysis-framework';
        if (['abstract-supported', 'curated-entity', 'review'].includes(record.evidenceLevel)) return 'claim-supporting';
        if (record.evidenceLevel === 'bibliographic-only' || /摘要不可用|未收录摘要/.test(record.snippet || '')) return 'discovery-only';
        if (['reference-search', 'community'].includes(record.type)) return 'discovery-only';
        return record.snippet ? 'contextual' : 'discovery-only';
    }

    function buildRetrievalDiagnostics(node, localRecords, externalRecords, query) {
        const facets = new Set((node.knowledgeBase || []).map(item => item.quality?.facet).filter(Boolean));
        return {
            query, strategy: 'graph-aware hybrid lexical + authority/recency/citation scoring + MMR',
            expertFacetCoverage: [...facets], localCandidates: localRecords.length, externalCandidates: externalRecords.length,
            queryPlan: profileQueryPlanForDiagnostics(node, query),
            evidenceSources: [...new Set(externalRecords.map(record => record.source).filter(Boolean))],
            abstractSupportedEvidence: externalRecords.filter(record => ['abstract-supported', 'review'].includes(record.evidenceLevel)).length,
            claimSupportingEvidence: externalRecords.filter(record => classifyEvidenceUsability(record) === 'claim-supporting').length,
            discoveryOnlyRecords: externalRecords.filter(record => classifyEvidenceUsability(record) === 'discovery-only').length,
            hasDefinitions: facets.has('definition'), hasMechanisms: facets.has('mechanism'), hasEvidenceProtocol: facets.has('evidence'), hasFrontierAnalysis: facets.has('frontier')
        };
    }

    function profileQueryPlanForDiagnostics(node, query) {
        const context = getNodeGraphContext(node);
        const profile = buildNodeKnowledgeProfile(node, context);
        return (profile.queryPlan || []).map(plan => ({ ...plan, userQuery: query }));
    }

    function getNodeGraphContext(node) {
        const data = Graph.graphData?.() || { nodes: [], links: [] };
        const nodes = data.nodes || [];
        const links = data.links || [];
        const nodeById = new Map(nodes.map(item => [item.id, item]));
        const parentById = new Map();
        const childrenById = new Map();
        const backlinks = [];
        const outlinks = [];

        // 层级边（目录/分类）决定 path、parent、children、siblings；非层级边（Obsidian 双链）
        // 只进入 backlinks / outlinks。两者混在一起会让节点的“路径”被双链改写。
        links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            if (!sourceId || !targetId) return;
            if (link.__hierarchy === false) {
                // 边方向是 来源笔记 -> 目标笔记：别人指向我就是反链，我指向别人就是出链。
                if (targetId === node.id && nodeById.has(sourceId)) backlinks.push(nodeById.get(sourceId));
                if (sourceId === node.id && nodeById.has(targetId)) outlinks.push(nodeById.get(targetId));
                return;
            }
            if (parentById.has(targetId) || sourceId === targetId) return;
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
            backlinks,
            outlinks,
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
        const domain = selectNodeKnowledgeDomain(node.name, contextText);
        const primaryTerm = terms.english || terms.chinese || node.name;
        const broadQuery = primaryTerm;
        const graphPath = (context.path || []).join(' > ');
        const queryPlan = buildExpertQueryPlan(primaryTerm, domain);

        return {
            id: node.id,
            name: node.name,
            terms,
            primaryTerm,
            broadQuery,
            queryPlan,
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

    function nodeDomainPatternMatches(text, pattern) {
        const haystack = String(text || '').toLowerCase();
        const needle = String(pattern || '').toLowerCase();
        if (/^[a-z0-9 -]+$/.test(needle)) {
            const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
            return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(haystack);
        }
        return haystack.includes(needle);
    }

    function selectNodeKnowledgeDomain(nodeName, contextText) {
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
        let best = null;
        domains.forEach(domain => domain.patterns.forEach(pattern => {
            const direct = nodeDomainPatternMatches(nodeName, pattern);
            const contextual = nodeDomainPatternMatches(contextText, pattern);
            if (!direct && !contextual) return;
            const score = (direct ? 10 : 1) + String(pattern).length / 100;
            if (!best || score > best.score) best = { domain, score };
        }));
        return best?.domain || {
            id: 'frontier-general',
            label: '世界前沿知识通用节点',
            queryBoost: 'frontier technology research knowledge graph',
            summary: '通用前沿节点，按概念、证据、实现、社区、风险和成熟度组织解释。',
            sources: ['OpenAlex', 'Semantic Scholar', 'GitHub', 'Hacker News'],
            questions: ['它是什么？', '为什么重要？', '有哪些证据和实现？', '下一步应该看什么？']
        };
    }

    function buildExpertQueryPlan(primaryTerm, domain) {
        const term = String(primaryTerm || '').trim();
        const plans = [
            { id: 'definition', query: `"${term}" review terminology taxonomy`, intent: '定义、分类与学科共识' },
            { id: 'mechanism', query: `"${term}" mechanism model experiment`, intent: '机制、形式化模型与实验验证' },
            { id: 'evidence', query: `"${term}" benchmark metrics dataset replication`, intent: '指标、基准、数据与复现' },
            { id: 'frontier', query: `"${term}" state of the art open challenges 2024 2025 2026`, intent: '前沿进展、瓶颈与开放问题' },
        ];
        if (domain.id === 'bio-health') plans.push({ id: 'clinical', query: `"${term}" clinical trial safety efficacy`, intent: '临床效力与安全性' });
        if (domain.id === 'energy-climate') plans.push({ id: 'deployment', query: `"${term}" techno-economic lifecycle cost deployment`, intent: '技术经济与生命周期' });
        if (domain.id === 'semiconductor-robotics') plans.push({ id: 'reliability', query: `"${term}" reliability standard manufacturing yield`, intent: '可靠性、标准与量产' });
        return plans;
    }

    function retrieveLocalNodeKnowledge(node, context, profile) {
        const children = (context.children || []).slice(0, 12).map(item => item.name);
        const siblings = (context.siblings || []).slice(0, 10).map(item => item.name);
        const ancestors = (context.ancestors || []).map(item => item.name);
        const records = [
            ...(node.knowledgeBase || []).map((item, index) => ({
                type: item.evidenceLevel ? 'compiled-evidence' : 'node-knowledge-base',
                id: item.id,
                title: item.title || `节点知识库 ${index + 1}`,
                content: [
                    item.content || '',
                    item.source ? `来源: ${item.source}` : '',
                    item.url ? `链接: ${item.url}` : '',
                    item.keywords?.length ? `关键词: ${item.keywords.join('；')}` : '',
                ].filter(Boolean).join('\n'),
                snippet: item.snippet || '',
                keywords: item.keywords || [],
                source: item.source || '',
                url: item.url || '',
                citation: item.citation || null,
                evidenceLevel: item.evidenceLevel || '',
                evidenceUsability: item.evidenceUsability || '',
                provenance: item.provenance || null,
                quality: item.quality || null,
                score: item.evidenceUsability === 'claim-supporting' ? 1.16 : 1.08 - index * 0.02
            })),
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

        const neighborNodes = [context.parent, ...(context.children || []), ...(context.siblings || [])].filter(Boolean);
        neighborNodes.slice(0, 24).forEach(neighbor => {
            (neighbor.knowledgeBase || [])
                .filter(item => ['definition', 'mechanism', 'evidence', 'frontier'].includes(item.quality?.facet))
                .forEach(item => records.push({
                    type: 'graph-neighbor-knowledge',
                    title: `${neighbor.name} / ${item.title}`,
                    content: item.content,
                    keywords: item.keywords || [],
                    sourceNode: { id: neighbor.id, name: neighbor.name },
                    graphRelation: context.parent?.id === neighbor.id ? 'parent' : context.children?.some(child => child.id === neighbor.id) ? 'child' : 'sibling',
                    quality: item.quality,
                    score: context.parent?.id === neighbor.id ? 0.84 : 0.76
                }));
        });

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
        const cacheKey = `zstp-rag-v2:${profile.domain.id}:${profile.primaryTerm}`;
        const cached = readKnowledgeRetrievalCache(cacheKey);
        if (cached) return cached;
        const exact = profile.primaryTerm;
        const plans = profile.queryPlan || buildExpertQueryPlan(exact, profile.domain);
        const academicPlans = plans.slice(0, 4);
        const tasks = academicPlans.flatMap(plan => [
            queryOpenAlex(plan.query, plan),
            querySemanticScholar(plan.query, plan),
        ]);
        tasks.push(queryCrossref(exact));
        if (profile.domain.id === 'bio-health') tasks.push(queryEuropePmc(exact));
        if (profile.domain.id === 'knowledge-graph') tasks.push(queryWikidata(exact));
        if (['agentic-ai', 'knowledge-graph', 'semiconductor-robotics', 'frontier-general'].includes(profile.domain.id)) {
            tasks.push(queryGitHub(exact));
        }
        if (['agentic-ai', 'semiconductor-robotics'].includes(profile.domain.id)) tasks.push(queryHuggingFace(exact));
        tasks.push(queryHackerNews(exact));
        const settled = await Promise.allSettled(tasks);
        const resultSets = settled
            .filter(item => item.status === 'fulfilled' && Array.isArray(item.value))
            .map(item => item.value);
        const records = reciprocalRankFuse(resultSets);
        const result = [
            ...records,
            ...buildReferenceSearchRecords(profile),
        ];
        writeKnowledgeRetrievalCache(cacheKey, result);
        return result;
    }

    function reciprocalRankFuse(resultSets, rankConstant = 60) {
        const fused = new Map();
        resultSets.forEach((records, setIndex) => records.forEach((record, rank) => {
            const key = String(record.url || `${record.source}:${record.title}`).toLowerCase();
            const current = fused.get(key) || { ...record, rrfScore: 0, retrievalChannels: [] };
            current.rrfScore += 1 / (rankConstant + rank + 1);
            current.retrievalChannels.push(record.queryIntent || `channel-${setIndex + 1}`);
            fused.set(key, current);
        }));
        return [...fused.values()]
            .map(record => ({ ...record, rrfScore: Number(record.rrfScore.toFixed(6)), retrievalChannels: [...new Set(record.retrievalChannels)] }))
            .sort((a, b) => b.rrfScore - a.rrfScore);
    }

    function buildCitation({ source, title, url, year, identifier, retrievedAt, evidenceLevel }) {
        return {
            source: source || '', title: title || '', url: url || '', year: year || null,
            identifier: identifier || '', retrievedAt: retrievedAt || new Date().toISOString(),
            evidenceLevel: evidenceLevel || 'unclassified'
        };
    }

    const KNOWLEDGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

    function readKnowledgeRetrievalCache(key) {
        try {
            const cached = JSON.parse(localStorage.getItem(key) || 'null');
            if (!cached || Date.now() - cached.savedAt > KNOWLEDGE_CACHE_TTL_MS || !Array.isArray(cached.records)) return null;
            return cached.records.map(record => ({ ...record, cacheHit: true }));
        } catch {
            return null;
        }
    }

    function writeKnowledgeRetrievalCache(key, records) {
        try {
            localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), records }));
        } catch {
            // Retrieval remains usable when storage is unavailable or full.
        }
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

    function decodeOpenAlexAbstract(invertedIndex) {
        if (!invertedIndex || typeof invertedIndex !== 'object') return '';
        const words = [];
        Object.entries(invertedIndex).forEach(([word, positions]) => (positions || []).forEach(position => { words[position] = word; }));
        return compactText(words.filter(Boolean).join(' '), 700);
    }

    async function queryOpenAlex(query, plan = {}) {
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=3&sort=relevance_score:desc&select=id,display_name,publication_year,cited_by_count,doi,primary_location,abstract_inverted_index,type`;
        const data = await fetchJsonWithTimeout(url, 4500);
        return (data.results || []).map(item => {
            const retrievedAt = new Date().toISOString();
            const evidenceLevel = item.abstract_inverted_index ? (item.type === 'review' ? 'review' : 'abstract-supported') : 'bibliographic-only';
            return ({
            type: 'scholarly',
            source: 'OpenAlex',
            title: item.display_name,
            url: item.doi || item.primary_location?.landing_page_url || item.id,
            meta: `${item.publication_year || 'n.d.'} · ${item.type || 'work'} · citations ${item.cited_by_count ?? 0}`,
            snippet: decodeOpenAlexAbstract(item.abstract_inverted_index) || 'OpenAlex未收录摘要；仅将该记录用于文献定位，不据此生成具体事实。',
            queryIntent: plan.intent || 'scholarly evidence',
            evidenceLevel, retrievedAt,
            citation: buildCitation({ source: 'OpenAlex', title: item.display_name, url: item.doi || item.primary_location?.landing_page_url || item.id, year: item.publication_year, identifier: item.doi || item.id, retrievedAt, evidenceLevel })
        }); });
    }

    async function querySemanticScholar(query, plan = {}) {
        const fields = 'paperId,title,year,citationCount,url,abstract,authors';
        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=3&fields=${encodeURIComponent(fields)}`;
        const data = await fetchJsonWithTimeout(url, 4500);
        return (data.data || []).map(item => {
            const retrievedAt = new Date().toISOString();
            const evidenceLevel = item.abstract ? 'abstract-supported' : 'bibliographic-only';
            return ({
            type: 'scholarly',
            source: 'Semantic Scholar',
            title: item.title,
            url: item.url,
            meta: `${item.year || 'n.d.'} · citations ${item.citationCount ?? 0}`,
            snippet: compactText(item.abstract || `摘要不可用；作者: ${(item.authors || []).slice(0, 4).map(author => author.name).join(', ')}`, 700),
            queryIntent: plan.intent || 'scholarly evidence',
            evidenceLevel, retrievedAt,
            citation: buildCitation({ source: 'Semantic Scholar', title: item.title, url: item.url, year: item.year, identifier: item.paperId, retrievedAt, evidenceLevel })
        }); });
    }

    function stripScholarlyMarkup(value) {
        return compactText(String(value || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' '), 800);
    }

    async function queryCrossref(query, timeout = 5000) {
        const select = 'DOI,title,abstract,published,issued,is-referenced-by-count,type,URL,container-title';
        const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(query)}&rows=4&select=${select}`;
        const data = await fetchJsonWithTimeout(url, timeout);
        const queryTokenSet = new Set(tokenizeKnowledgeText(query));
        return (data.message?.items || []).map(item => {
            const title = Array.isArray(item.title) ? item.title[0] : item.title;
            const year = item.published?.['date-parts']?.[0]?.[0] || item.issued?.['date-parts']?.[0]?.[0] || null;
            const itemUrl = item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : '');
            const snippet = stripScholarlyMarkup(item.abstract);
            const evidenceLevel = snippet ? 'abstract-supported' : 'bibliographic-only';
            const retrievedAt = new Date().toISOString();
            const titleTokens = new Set(tokenizeKnowledgeText(title));
            const overlap = queryTokenSet.size ? [...queryTokenSet].filter(token => titleTokens.has(token)).length / queryTokenSet.size : 0;
            const exact = String(title || '').toLowerCase().includes(String(query || '').toLowerCase()) ? 0.35 : 0;
            return {
                type: 'scholarly', source: 'Crossref', title, url: itemUrl,
                meta: `${year || 'n.d.'} · ${item.type || 'work'} · citations ${item['is-referenced-by-count'] || 0}`,
                snippet: snippet || 'Crossref未提供摘要；该记录仅用于DOI和出版元数据定位。',
                queryIntent: 'DOI、出版元数据与补充学术证据', evidenceLevel, retrievedAt,
                matchConfidence: Math.min(1, overlap * 0.65 + exact),
                citation: buildCitation({ source: 'Crossref', title, url: itemUrl, year, identifier: item.DOI || itemUrl, retrievedAt, evidenceLevel })
            };
        }).filter(record => record.matchConfidence >= 0.55);
    }

    async function queryEuropePmc(query, timeout = 5000) {
        const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(`TITLE_ABS:"${query}"`)}&format=json&pageSize=4&resultType=core`;
        const data = await fetchJsonWithTimeout(url, timeout);
        return (data.resultList?.result || []).map(item => {
            const retrievedAt = new Date().toISOString();
            const evidenceLevel = item.abstractText ? 'abstract-supported' : 'bibliographic-only';
            const itemUrl = item.doi ? `https://doi.org/${item.doi}` : `https://europepmc.org/article/${item.source}/${item.id}`;
            return ({
            type: 'biomedical', source: 'Europe PMC', title: item.title,
            url: itemUrl,
            meta: `${item.pubYear || 'n.d.'} · citations ${item.citedByCount ?? 0} · ${item.journalTitle || 'journal unavailable'}`,
            snippet: compactText(item.abstractText || '摘要不可用；该记录仅作为生物医学文献定位信息。', 800),
            queryIntent: '生物医学机制、临床效力与安全性', evidenceLevel, retrievedAt,
            citation: buildCitation({ source: 'Europe PMC', title: item.title, url: itemUrl, year: item.pubYear, identifier: item.doi || item.pmid || item.id, retrievedAt, evidenceLevel })
        }); });
    }

    async function queryWikidata(query) {
        const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&uselang=zh&limit=6&format=json&origin=*`;
        const data = await fetchJsonWithTimeout(url, 4500);
        return (data.search || []).map(item => {
            const retrievedAt = new Date().toISOString();
            return ({
            type: 'entity', source: 'Wikidata', title: `${item.label} (${item.id})`, url: item.concepturi,
            meta: `canonical entity · ${item.id}`, snippet: item.description || 'Wikidata规范实体；描述不可用。',
            queryIntent: '实体链接、规范标识符与消歧', evidenceLevel: 'curated-entity', retrievedAt,
            citation: buildCitation({ source: 'Wikidata', title: item.label, url: item.concepturi, identifier: item.id, retrievedAt, evidenceLevel: 'curated-entity' })
        }); });
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
    const restoreBtn = document.getElementById('zstp-restore-btn');
    const folderInput = document.getElementById('zstp-folder-input');
    // 笔记元数据 path -> note，点击节点时用来渲染笔记面板（正文按需再读文件，避免把整个库塞进内存）
    const vaultNotesByPath = new Map();
    let importedGraphMode = 'builtin';
    let lastVaultStats = null;

    if (restoreBtn) {
        restoreBtn.title = '放弃导入的图谱，回到内置的世界前沿知识图谱';
        restoreBtn.addEventListener('click', () => {
            const restored = restoreBuiltinGraph();
            restoreBtn.textContent = restored ? '已恢复默认' : '当前已是默认';
            setTimeout(() => { restoreBtn.textContent = '恢复默认'; }, 2200);
        });
        updateRestoreButton();
    }

    function updateRestoreButton() {
        if (!restoreBtn) return;
        const imported = importedGraphMode !== 'builtin';
        restoreBtn.disabled = !imported;
        restoreBtn.classList.toggle('is-idle', !imported);
    }

    if (importBtn && folderInput) {
        importBtn.addEventListener('click', () => folderInput.click());
        folderInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            importedFiles.clear();
            files.forEach(file => importedFiles.set(file.webkitRelativePath, file));

            const baseLabel = importBtn.dataset.baseLabel || importBtn.textContent;
            importBtn.dataset.baseLabel = baseLabel;
            const detection = window.OBSIDIAN_VAULT
                ? window.OBSIDIAN_VAULT.detectVault(files.map(file => ({ path: file.webkitRelativePath })))
                : { isVault: false, reason: 'parser-unavailable' };

            try {
                if (detection.isVault) {
                    await importVaultGraph(files, detection);
                } else {
                    importFolderTree(files);
                }
            } catch (error) {
                console.error('知识图谱导入失败:', error);
                importBtn.textContent = `导入失败: ${error.message}`;
                setTimeout(() => { importBtn.textContent = baseLabel; }, 5000);
            } finally {
                folderInput.value = '';
            }
        });
    }

    // 按目录树导入（代码工程等）：保持原有行为
    function importFolderTree(files) {
        const tree = buildFolderTree(files);
        assignDepthColors(tree, 0);
        _graphAutoId = 0;
        const newData = applyReadableGraphLayout(buildGraphData([tree], THEME, '_imp'));
        graphNodeById = new Map(newData.nodes.map(node => [node.id, node]));
        importedGraphMode = 'folder-tree';
        lastVaultStats = null;
        vaultNotesByPath.clear();

        Graph.graphData(newData);
        refreshLayoutGuides(newData);
        frameGraphOverview(900, 120);

        importBtn.textContent = `已导入: ${tree.name || '项目目录'}`;
        updateRestoreButton();
        console.log('[知识图谱] 目录树模式:', { files: files.length, nodes: newData.nodes.length, links: newData.links.length });
    }

    // 按 Obsidian vault 导入：解析 frontmatter / [[双链]] / 标签，并把双链作为额外连线叠加到目录骨架上
    async function importVaultGraph(files, detection) {
        const vaultApi = window.OBSIDIAN_VAULT;
        if (!vaultApi) throw new Error('obsidianVault.js 未加载');

        const noteFiles = files.filter(file => vaultApi.NOTE_EXTS.has(getFileExtension(file.webkitRelativePath || file.name)));
        const otherFiles = files.filter(file => !vaultApi.NOTE_EXTS.has(getFileExtension(file.webkitRelativePath || file.name)));

        const noteEntries = await readVaultNoteEntries(noteFiles, (done, total) => {
            importBtn.textContent = `解析双链 ${done}/${total} ...`;
        });
        const entries = [
            ...noteEntries,
            ...otherFiles.map(file => ({ path: file.webkitRelativePath, text: null, size: file.size }))
        ];

        const vault = vaultApi.parseVaultFiles(entries);

        vaultNotesByPath.clear();
        vault.notes.forEach(note => vaultNotesByPath.set(note.path, note));

        const { graph, linkStats: wikilinkStats } = buildVaultGraphData(vault, { api: vaultApi, theme: THEME, prefix: '_vault' });
        const newData = applyReadableGraphLayout(graph);
        graphNodeById = new Map(newData.nodes.map(node => [node.id, node]));
        importedGraphMode = 'obsidian-vault';
        lastVaultStats = { ...vault.stats, ...wikilinkStats, vaultName: vault.name };

        Graph.graphData(newData);
        refreshLayoutGuides(newData);
        frameGraphOverview(900, 120);

        importBtn.textContent = `已导入 vault: ${vault.name} · ${vaultApi.vaultSummary(vault)}`;
        updateRestoreButton();
        console.log('[知识图谱] Obsidian vault 模式:', {
            detection,
            vaultName: vault.name,
            nodes: newData.nodes.length,
            hierarchyLinks: newData.links.length - wikilinkStats.wikilinkEdges,
            wikilinkEdges: wikilinkStats.wikilinkEdges,
            unresolved: vault.stats.unresolvedCount,
            topTags: vault.stats.topTags,
            orphanRatio: Number(vault.stats.orphanRatio.toFixed(3))
        });
    }

    // 导入会整体替换图谱数据，这里提供回到内置图谱的入口，避免必须刷新页面
    function restoreBuiltinGraph() {
        if (importedGraphMode === 'builtin') return false;
        vaultNotesByPath.clear();
        lastVaultStats = null;
        importedGraphMode = 'builtin';
        _graphAutoId = 0;
        const newData = applyReadableGraphLayout(buildGraphData(getGraphTree(THEME), THEME));
        graphNodeById = new Map(newData.nodes.map(node => [node.id, node]));
        Graph.graphData(newData);
        refreshLayoutGuides(newData);
        frameGraphOverview(900, 120);
        if (importBtn) importBtn.textContent = importBtn.dataset.baseLabel || '项目导入';
        updateRestoreButton();
        console.log('[知识图谱] 已恢复内置图谱:', { nodes: newData.nodes.length, links: newData.links.length });
        return true;
    }

    function readVaultNoteEntries(noteFiles, onProgress) {
        const entries = [];
        const concurrency = Math.min(8, noteFiles.length) || 1;
        let cursor = 0;
        let done = 0;
        async function worker() {
            while (cursor < noteFiles.length) {
                const file = noteFiles[cursor];
                cursor += 1;
                let text = '';
                try {
                    text = await readFileText(file);
                } catch (error) {
                    console.warn('[知识图谱] 笔记读取失败:', file.webkitRelativePath, error);
                }
                entries.push({ path: file.webkitRelativePath, text, size: file.size });
                done += 1;
                if (typeof onProgress === 'function' && (done % 25 === 0 || done === noteFiles.length)) {
                    onProgress(done, noteFiles.length);
                }
            }
        }
        return Promise.all(Array.from({ length: concurrency }, () => worker())).then(() => entries);
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
        // 图谱导入状态与纯逻辑入口：控制台可直接调试，也便于外部审计脚本复用同一份建图逻辑
        graphMode: () => importedGraphMode,
        vaultStats: () => lastVaultStats,
        restoreBuiltinGraph,
        layoutGraph: applyReadableGraphLayout,
        buildVaultGraphData: (vault, options) => buildVaultGraphData(vault, { ...(options || {}), theme: THEME, prefix: '_vault' }),
        detectVault: files => (typeof window.OBSIDIAN_VAULT !== 'undefined' ? window.OBSIDIAN_VAULT.detectVault(files) : null),
        auditRuntime: () => {
            const data = Graph.graphData?.() || { nodes: [], links: [] };
            const realNodes = (data.nodes || []).filter(node => node.kind !== 'knowledge-detail');
            const requiredFacets = ['definition', 'mechanism', 'evidence', 'frontier', 'retrieval'];
            const invalidNodes = realNodes.filter(node => {
                const facets = new Set((node.knowledgeBase || []).map(record => record.quality?.facet).filter(Boolean));
                return requiredFacets.some(facet => !facets.has(facet));
            });
            // 500 节点的下限只针对内置图谱；导入 vault/目录后节点数是用户数据决定的
            const requiredNodeCount = importedGraphMode === 'builtin' ? 500 : 1;
            return {
                status: invalidNodes.length === 0 && realNodes.length >= requiredNodeCount ? 'pass' : 'fail',
                nodeCount: realNodes.length,
                linkCount: (data.links || []).length,
                invalidNodeCount: invalidNodes.length,
                invalidNodes: invalidNodes.slice(0, 20).map(node => node.name),
                requiredFacets,
                graphMode: importedGraphMode,
                requiredNodeCount,
                retrieverVersion: 'graph-rag-v3-evidence-graph'
            };
        },
        retrieveKnowledge: async ({ nodeName, query, topK, liveExternal = false } = {}) => {
            const targetNode = nodeName ? findGraphNode(nodeName) : null;
            const selected = targetNode || (query ? findGraphNode(query) : null);
            if (!selected) {
                return {
                    error: 'node_not_found',
                    query: query || nodeName || '',
                    message: '知识图谱中没有找到要检索的节点。'
                };
            }
            const knowledge = await buildNodeKnowledgeBundle(selected, query || nodeName || '', { liveExternal: liveExternal === true });
            const limit = Number.isFinite(topK) ? Math.max(1, Math.min(24, topK)) : 12;
            return {
                node: {
                    id: selected.id,
                    name: selected.name,
                    source: selected.source || '',
                    scale: selected.scale || '',
                    maturity: selected.maturity || '',
                    layer: selected.layer || '',
                    knowledgeBaseCount: Array.isArray(selected.knowledgeBase) ? selected.knowledgeBase.length : 0
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
                nodeKnowledgeBase: (selected.knowledgeBase || []).slice(0, Math.min(limit, 12)),
                localRecords: knowledge.localRecords.slice(0, Math.min(limit, 10)),
                externalRecords: knowledge.externalRecords.slice(0, limit),
                evidenceGraph: knowledge.evidenceGraph,
                retrievalPolicy: knowledge.retrievalPolicy,
                diagnostics: knowledge.diagnostics,
                mode: liveExternal === true ? 'local-plus-fast-live' : 'local-only',
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
