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
        if (window.WORLD_CORPUS_READY) {
            if (loader) loader.innerText = '正在加载本地 Wikipedia 正文...';
            await window.WORLD_CORPUS_READY;
            if (loader) loader.innerText = '正在装配世界知识图谱...';
        }
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
        if(loader) loader.innerText = `知识图谱加载失败：${error.message || '未知错误'}`;
    }
}


// 与 WebGL 渲染解耦的本地世界知识检索入口。
// Agentmaster 在用户没有打开知识图谱页面时也能直接调用；索引只读本地数据。
function getStaticWorldStore() {
    return typeof window !== 'undefined' ? window.WORLD_KNOWLEDGE_GRAPH || null : null;
}

function staticFindWorldNode(value) {
    const store = getStaticWorldStore();
    if (!store || !value) return null;
    const raw = String(value).trim();
    const needle = raw.toLowerCase();
    const nodes = store.nodes || [];
    return nodes.find(node => node.id === raw) ||
        nodes.find(node => String(node.name).toLowerCase() === needle || String(node.nameEn || '').toLowerCase() === needle) ||
        nodes.find(node => (node.aliases || []).some(alias => String(alias).toLowerCase() === needle)) ||
        nodes.find(node => node.kind !== 'category' && (String(node.name).includes(raw) || raw.includes(String(node.name)))) ||
        null;
}

function staticWorldGraphContext(node) {
    const store = getStaticWorldStore();
    if (!store || !node) return { path: [], parent: null, children: [], siblings: [], nodeCount: 0, linkCount: 0 };
    const nodes = store.nodes || [];
    const edges = store.edges || [];
    const byId = new Map(nodes.map(item => [item.id, item]));
    const displayName = item => item.kind === 'category' ? (item.nameZh && item.nameEn ? item.name : (item.nameZh || item.name)) : item.name;
    const parentEdge = edges.find(edge => edge.type === 'section_contains' && edge.target === node.id);
    const parent = parentEdge ? byId.get(parentEdge.source) || null : null;
    const children = edges
        .filter(edge => edge.type === 'section_contains' && edge.source === node.id)
        .map(edge => byId.get(edge.target))
        .filter(Boolean);
    const siblings = parent
        ? edges
            .filter(edge => edge.type === 'section_contains' && edge.source === parent.id && edge.target !== node.id)
            .map(edge => byId.get(edge.target))
            .filter(Boolean)
        : [];
    const path = [];
    let cursor = node;
    const seen = new Set();
    while (cursor && !seen.has(cursor.id)) {
        seen.add(cursor.id);
        path.unshift(displayName(cursor));
        const edge = edges.find(item => item.type === 'section_contains' && item.target === cursor.id);
        cursor = edge ? byId.get(edge.source) : null;
    }
    return { path, parent, children, siblings, nodeCount: nodes.length, linkCount: edges.length };
}

function staticWorldRecord(match) {
    return {
        type: 'world-corpus-chunk',
        id: match.chunkId,
        title: `${match.title}${match.heading ? ` · ${match.heading}` : ' · 导言'}`,
        content: match.text,
        snippet: match.snippet,
        source: 'Wikipedia',
        url: match.url,
        citation: match.citation,
        evidenceLevel: 'encyclopedia-verbatim',
        evidenceUsability: 'claim-supporting',
        nodeId: match.nodeId,
        nodeName: match.nodeName,
        qid: match.qid,
        heading: match.heading,
        lang: match.lang,
        retrievalScore: match.score,
        score: match.score
    };
}

async function staticRetrieveKnowledge({ nodeName, query, topK } = {}) {
    if (typeof window !== 'undefined' && window.WORLD_CORPUS_READY) {
        await window.WORLD_CORPUS_READY;
    }
    const rag = typeof window !== 'undefined' ? window.WORLD_RAG : null;
    if (!rag || typeof rag.search !== 'function') {
        return { error: 'world_rag_unavailable', query: query || nodeName || '', message: '本地世界知识检索器未加载。' };
    }
    const limit = Number.isFinite(topK) ? Math.max(1, Math.min(24, topK)) : 8;
    const target = staticFindWorldNode(nodeName) || staticFindWorldNode(query);
    const searchQuery = [target?.name, query].filter(Boolean).join(' ').trim() || query || nodeName || '';
    const result = rag.search(searchQuery, { topK: limit, graphExpand: true });
    const context = staticWorldGraphContext(target);
    return {
        node: target ? {
            id: target.id, name: target.name, qid: target.qid || '', source: 'Wikipedia · Wikidata',
            section: target.section || '', knowledgeBaseCount: 0
        } : {
            id: '', name: result.seeds[0]?.name || '世界知识库', qid: result.seeds[0]?.qid || '',
            source: 'Wikipedia · Wikidata', section: '', knowledgeBaseCount: 0
        },
        profile: {
            query: searchQuery,
            primaryTerm: target?.nameEn || target?.name || searchQuery,
            graphPath: context.path.join(' > ')
        },
        graph: {
            path: context.path,
            parent: context.parent ? (context.parent.kind === 'category' ? (context.parent.nameZh && context.parent.nameEn ? context.parent.name : (context.parent.nameZh || context.parent.name)) : context.parent.name) : '',
            children: context.children.slice(0, 16).map(item => item.kind === 'category' ? (item.nameZh && item.nameEn ? item.name : (item.nameZh || item.name)) : item.name),
            siblings: context.siblings.slice(0, 16).map(item => item.kind === 'category' ? (item.nameZh && item.nameEn ? item.name : (item.nameZh || item.name)) : item.name),
            nodeCount: context.nodeCount,
            linkCount: context.linkCount
        },
        seeds: result.seeds,
        localRecords: result.matches.map(staticWorldRecord).slice(0, limit),
        externalRecords: [],
        evidenceGraph: result.evidenceGraph,
        retrievalPolicy: [
            '只检索本地 Wikipedia 原文语料。',
            '每条记录带标题、URL、revision 与 CC BY-SA 4.0 许可。',
            'Wikidata 声明仅用于实体关系和消歧。'
        ],
        diagnostics: result.diagnostics,
        mode: 'local-corpus'
    };
}

async function staticSearchWorldKnowledge(query, options = {}) {
    if (typeof window !== 'undefined' && window.WORLD_CORPUS_READY) {
        await window.WORLD_CORPUS_READY;
    }
    const rag = typeof window !== 'undefined' ? window.WORLD_RAG : null;
    if (!rag || typeof rag.search !== 'function') {
        return {
            query: String(query || ''),
            matches: [],
            localRecords: [],
            seeds: [],
            evidenceGraph: { nodes: [], edges: [], stats: { topics: 0, evidence: 0, claims: 0 } },
            diagnostics: { error: 'world-rag-unavailable' }
        };
    }
    const result = rag.search(query, {
        topK: Math.max(1, Math.min(24, Number(options.topK) || 8)),
        graphExpand: options.graphExpand !== false
    });
    return { ...result, localRecords: result.matches.map(staticWorldRecord) };
}

if (typeof window !== 'undefined') {
    window.ZSTP = window.ZSTP || {};
    Object.assign(window.ZSTP, {
        retrieveKnowledge: staticRetrieveKnowledge,
        searchWorldKnowledge: staticSearchWorldKnowledge,
        ragStats: () => window.WORLD_RAG?.stats() || null,
        worldGraphStats: () => window.WORLD_KNOWLEDGE_GRAPH?.meta || { ready: false }
    });
}


// 纯布局函数：只依赖入参 data，无 DOM / three.js 依赖，可被 Node 侧 audit 直接调用。
const SIX_AXES = [
    { key: '+x', d: { x: 1, y: 0, z: 0 }, u: { x: 0, y: 0, z: 1 }, v: { x: 0, y: 1, z: 0 } },
    { key: '-x', d: { x: -1, y: 0, z: 0 }, u: { x: 0, y: 0, z: -1 }, v: { x: 0, y: 1, z: 0 } },
    { key: '+y', d: { x: 0, y: 1, z: 0 }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 0, z: 1 } },
    { key: '-y', d: { x: 0, y: -1, z: 0 }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 0, z: -1 } },
    { key: '+z', d: { x: 0, y: 0, z: 1 }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 1, z: 0 } },
    { key: '-z', d: { x: 0, y: 0, z: -1 }, u: { x: -1, y: 0, z: 0 }, v: { x: 0, y: 1, z: 0 } }
];
const SIX_AXIS_BY_ROOT = {
    '自然科学 Natural sciences': '+x',
    '技术工程 Technology and engineering': '-x',
    '生命健康 Life and health': '+y',
    '人类社会 Human society': '-y',
    '人文艺术 Humanities and arts': '+z',
    '地球地理 Earth and geography': '-z'
};

function applySixDirectionLayout(data) {
    const nodes = data?.nodes || [];
    const links = data?.links || [];
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const childrenById = new Map(nodes.map(node => [node.id, []]));
    const parentById = new Map();
    links.forEach(link => {
        if (link.__hierarchy === false) return;
        const sourceId = typeof link.source === 'object' ? link.source?.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target?.id : link.target;
        if (!sourceId || !targetId || !nodeById.has(sourceId) || !nodeById.has(targetId)) return;
        if (parentById.has(targetId) || sourceId === targetId) return;
        parentById.set(targetId, sourceId);
        childrenById.get(sourceId).push(nodeById.get(targetId));
    });
    const center = nodes.find(node => node.center) || nodes.find(node => !parentById.has(node.id));
    if (!center) return data;
    const axisRoots = childrenById.get(center.id) || [];
    const weightCache = new Map();
    const weight = node => {
        if (weightCache.has(node.id)) return weightCache.get(node.id);
        const children = childrenById.get(node.id) || [];
        const value = children.length ? children.reduce((sum, child) => sum + weight(child), 0) : 1;
        weightCache.set(node.id, value);
        return value;
    };
    const rootDistance = 320;
    const depthGap = 160;
    const halfTile = 360;
    let maxRadius = 0;

    setNode(center, 0, 0, 0, 0, center.id, '', SIX_AXES[0], 0, '');

    const usedAxes = new Set();
    axisRoots.forEach((root, index) => {
        const wanted = SIX_AXIS_BY_ROOT[root.name];
        let axis = SIX_AXES.find(item => item.key === wanted && !usedAxes.has(item.key));
        if (!axis) axis = SIX_AXES.find(item => !usedAxes.has(item.key)) || SIX_AXES[index % SIX_AXES.length];
        usedAxes.add(axis.key);
        root.__layoutAxis = axis.key;
        root.__layoutContinentId = root.id;
        setNode(root, axis.d.x * rootDistance, axis.d.y * rootDistance, axis.d.z * rootDistance, 1, root.id, center.id, axis, index, root.id);
        const children = childrenById.get(root.id) || [];
        if (!children.length) return;
        const rects = partitionRect(
            { u0: -halfTile, u1: halfTile, v0: -halfTile, v1: halfTile },
            children.map(child => weight(child))
        );
        children.forEach((child, childIndex) => {
            placeFaceNode(child, rects[childIndex], axis, 2, root.id, root.id, childIndex);
        });
    });

    const strayNodes = nodes.filter(node => !Number.isFinite(node.__layoutX));
    strayNodes.forEach((node, index) => {
        const axis = SIX_AXES[index % SIX_AXES.length];
        const distance = rootDistance + depthGap * 4;
        setNode(node, axis.d.x * distance, axis.d.y * distance, axis.d.z * distance, 2, center.id, center.id, axis, index, center.id);
    });

    data.__layoutRadius = Math.round(maxRadius);
    data.__layoutMode = 'six-direction';
    return data;

    function placeFaceNode(node, rect, axis, depth, rootId, continentId, orderIndex) {
        const along = rootDistance + (depth - 1) * depthGap;
        const u = (rect.u0 + rect.u1) / 2;
        const v = (rect.v0 + rect.v1) / 2;
        const x = axis.d.x * along + axis.u.x * u + axis.v.x * v;
        const y = axis.d.y * along + axis.u.y * u + axis.v.y * v;
        const z = axis.d.z * along + axis.u.z * u + axis.v.z * v;
        node.__layoutAxis = axis.key;
        node.__layoutContinentId = continentId;
        setNode(node, x, y, z, depth, rootId, parentById.get(node.id) || '', axis, orderIndex, continentId);
        const children = childrenById.get(node.id) || [];
        if (!children.length) return;
        const rects = partitionRect(rect, children.map(child => weight(child)));
        children.forEach((child, childIndex) => {
            placeFaceNode(child, rects[childIndex], axis, depth + 1, rootId, continentId, childIndex);
        });
    }

    function setNode(node, x, y, z, depth, rootId, parentId, axis, orderIndex, continentId) {
        node.x = node.fx = node.__layoutX = Math.round(x * 100) / 100;
        node.y = node.fy = node.__layoutY = Math.round(y * 100) / 100;
        node.z = node.fz = node.__layoutZ = Math.round(z * 100) / 100;
        node.vx = node.vy = node.vz = 0;
        node.__layoutDepth = depth;
        node.__layoutRootId = rootId;
        node.__layoutParentId = parentId;
        node.__layoutDirection = axis?.d || { x: 0, y: 0, z: 1 };
        node.__layoutAngle = Math.atan2(axis?.v?.y || 0, axis?.u?.x || 1);
        node.__layoutOrder = orderIndex;
        node.__layoutContinentId = continentId || node.__layoutContinentId || '';
        maxRadius = Math.max(maxRadius, Math.hypot(x, y, z));
    }
}

function partitionRect(rect, weights) {
    if (weights.length <= 1) return [rect];
    const total = weights.reduce((sum, value) => sum + value, 0) || weights.length;
    let split = 1;
    let leftWeight = weights[0];
    while (split < weights.length - 1 && leftWeight + weights[split] <= total / 2) {
        leftWeight += weights[split];
        split += 1;
    }
    const rightWeight = total - leftWeight;
    const fraction = Math.min(0.92, Math.max(0.08, leftWeight / total));
    const first = weights.slice(0, split);
    const second = weights.slice(split);
    if ((rect.u1 - rect.u0) >= (rect.v1 - rect.v0)) {
        const cut = rect.u0 + (rect.u1 - rect.u0) * fraction;
        return [
            ...partitionRect({ ...rect, u1: cut }, first),
            ...partitionRect({ ...rect, u0: cut }, second)
        ];
    }
    const cut = rect.v0 + (rect.v1 - rect.v0) * fraction;
    return [
        ...partitionRect({ ...rect, v1: cut }, first),
        ...partitionRect({ ...rect, v0: cut }, second)
    ];
}

function applyReadableGraphLayout(data) {
    if (data?.nodes?.some(node => node.center)) return applySixDirectionLayout(data);
    const nodes = data?.nodes || [];
    const links = data?.links || [];
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const childrenById = new Map(nodes.map(node => [node.id, []]));
    const parentById = new Map();
    const layoutVisited = new Set();

    // 只让层级边决定父子关系；双链/关联边只作为弦线，不参与径向布局。
    links.forEach(link => {
        if (link.__hierarchy === false) return;
        const sourceId = getLinkEndpointId(link.source);
        const targetId = getLinkEndpointId(link.target);
        if (!sourceId || !targetId || !nodeById.has(sourceId) || !nodeById.has(targetId)) return;
        if (parentById.has(targetId) || sourceId === targetId) return;
        parentById.set(targetId, sourceId);
        childrenById.get(sourceId).push(nodeById.get(targetId));
    });

    let roots = nodes.filter(node => !parentById.has(node.id));
    if (!roots.length && nodes.length) roots = [nodes[0]];
    roots.sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'zh-Hans-CN'));

    const weightCache = new Map();
    const weightVisiting = new Set();
    const subtreeWeight = node => {
        if (weightCache.has(node.id)) return weightCache.get(node.id);
        if (weightVisiting.has(node.id)) return 1;
        weightVisiting.add(node.id);
        const children = childrenById.get(node.id) || [];
        const weight = children.length
            ? children.reduce((sum, child) => sum + subtreeWeight(child), 0)
            : 1;
        weightVisiting.delete(node.id);
        weightCache.set(node.id, weight);
        return weight;
    };

    const totalWeight = roots.reduce((sum, root) => sum + subtreeWeight(root), 0) || 1;
    const multipleRoots = roots.length > 1;
    const rootRadius = multipleRoots ? 140 : 0;
    const depthGap = 250;
    let maxRadius = 0;

    function place(node, depth, startAngle, endAngle, rootId, parentId, siblingIndex) {
        if (layoutVisited.has(node.id)) return;
        layoutVisited.add(node.id);

        const angle = (startAngle + endAngle) / 2;
        const stagger = depth === 0 ? 0 : (siblingIndex % 3) * depthGap * 0.16;
        const radius = rootRadius + depth * depthGap + stagger;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = (depth % 2 === 0 ? 1 : -1) * 6 + (siblingIndex % 2) * 4;
        const direction = { x: Math.cos(angle), y: Math.sin(angle), z: 0 };
        setNodeLayout(node, x, y, z, depth, rootId, parentId || '', direction, siblingIndex);
        node.__layoutAngle = angle;
        maxRadius = Math.max(maxRadius, radius);

        const children = childrenById.get(node.id) || [];
        if (!children.length) return;

        const childWeight = children.reduce((sum, child) => sum + subtreeWeight(child), 0) || 1;
        const span = Math.max(0.001, endAngle - startAngle);
        const gap = Math.min(0.02, span * 0.03);
        const usable = Math.max(0.001, span - gap * (children.length - 1));
        let cursor = startAngle;
        children.forEach((child, index) => {
            const childSpan = usable * subtreeWeight(child) / childWeight;
            place(child, depth + 1, cursor, cursor + childSpan, rootId, node.id, index);
            cursor += childSpan + gap;
        });
    }

    let angleCursor = -Math.PI / 2;
    roots.forEach((root, index) => {
        const sector = Math.PI * 2 * subtreeWeight(root) / totalWeight;
        place(root, 0, angleCursor, angleCursor + sector, root.id, null, index);
        angleCursor += sector;
    });

    const strayNodes = nodes.filter(node => !Number.isFinite(node.__layoutX));
    if (strayNodes.length) {
        const radius = maxRadius + depthGap;
        strayNodes.forEach((node, index) => {
            const angle = -Math.PI / 2 + (index + 0.5) * Math.PI * 2 / strayNodes.length;
            const direction = { x: Math.cos(angle), y: Math.sin(angle), z: 0 };
            setNodeLayout(node, Math.cos(angle) * radius, Math.sin(angle) * radius, 0, 2, roots[0]?.id || '', '', direction, index);
            node.__layoutAngle = angle;
            maxRadius = Math.max(maxRadius, radius);
        });
    }

    data.__layoutRadius = Math.round(maxRadius);
    return data;

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
    let graphLayerMode = 'structure';

    function getBuiltinGraphTree() {
        const tree = getGraphTree(THEME);
        if (graphLayerMode === 'all') return tree;
        const strip = nodes => nodes.map(node => {
            if (node.kind === 'entity') return null;
            const children = strip(node.children || []);
            return { ...node, children: children.length ? children : undefined };
        }).filter(Boolean);
        return strip(tree);
    }

    // 数据结构（由 graphData.js 中的树形结构自动生成）
    const gData = applyReadableGraphLayout(buildGraphData(getBuiltinGraphTree(), THEME));
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

    function focusOpacityFactor(dim, normal = 1) {
        if (dim === 2) return 0.05;
        if (dim === 1) return 0.55;
        return normal;
    }

    function linkColorFor(link) {
        const dim = Number(link.__focusDim) || 0;
        const factor = focusOpacityFactor(dim);
        if (link.__hierarchy === false) {
            if (link.__attachment) return colorToRgba(0xffdd44, 0.3 * factor);
            const opacity = (link.relation ? 0.06 : 0.5) * factor;
            return colorToRgba(link.__embed ? 0xff66aa : 0x7cf7ff, opacity);
        }
        const target = getLinkNode(link, 'target');
        const depth = target?.__layoutDepth || 1;
        return colorToRgba(target?.color || 0x00ffff, (depth <= 1 ? 0.82 : (depth === 2 ? 0.56 : 0.34)) * factor);
    }

    function linkWidthFor(link) {
        const dim = Number(link.__focusDim) || 0;
        const factor = dim === 2 ? 0.15 : (dim === 1 ? 0.7 : 1);
        if (link.__hierarchy === false) return (link.__attachment ? 0.18 : (link.relation ? 0.1 : 0.42)) * factor;
        const target = getLinkNode(link, 'target');
        const depth = target?.__layoutDepth || 1;
        return (depth <= 1 ? 1.8 : (depth === 2 ? 1.25 : 0.75)) * factor;
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
            const size = Math.sqrt(node.val || 1) * 1.7;

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
                const dense = graphNodeById.size > 400;
                text.textHeight = dense
                    ? (node.group === 'root' ? 12 : (depth <= 1 ? 8 : (depth === 2 ? 5 : 3.5)))
                    : (node.group === 'root' ? 22 : (depth <= 1 ? 15 : (depth === 2 ? 10 : 7)));
                text.position.y = size + 2; 
                text.material.transparent = true;
                text.material.opacity = node.group === 'root' ? 1 : (depth <= 1 ? 0.95 : (depth === 2 ? (dense ? 0.65 : 0.85) : 0.45));
                group.add(text);
            }

            stampGraphNodeObject(group, node);
            node.__visualGroup = group;
            group.traverse(object => {
                if (!object.material) return;
                object.material.__baseOpacity = object.material.opacity ?? 1;
            });
            applyNodeFocusVisual(node);
            return group;
        })
        
        // --- 连线特效 ---
        // __hierarchy === false 的边是 Obsidian 双链/附件引用：它们不参与布局，用独立配色
        // 和更细的线区分开，否则用户分不清“目录归属”和“笔记关联”。
        .linkColor(linkColorFor)
        .linkWidth(linkWidthFor)
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

    function refreshLayoutGuides() {
        if (!scene || !layoutGuideGroup) return;
        scene.remove(layoutGuideGroup);
        layoutGuideGroup.traverse?.(object => {
            object.geometry?.dispose?.();
            object.material?.dispose?.();
        });
        layoutGuideGroup = null;
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
        if (typeof Graph.cameraPosition !== 'function') return;
        const data = Graph.graphData() || {};
        const nodes = data.nodes || [];
        const radius = Math.max(620, ...nodes.map(node => Math.hypot(node.x || 0, node.y || 0, node.z || 0)));
        const position = data.__layoutMode === 'six-direction'
            ? { x: radius * 1.02, y: radius * 0.82, z: radius * 1.18 }
            : { x: 0, y: 0, z: radius * 1.8 };
        Graph.cameraPosition(position, { x: 0, y: 0, z: 0 }, 0);
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
    let focusedGraphNodeId = null;

    function applyNodeFocusVisual(node) {
        if (!node?.__visualGroup) return;
        const dim = Number(node.__focusDim) || 0;
        const factor = dim === 2 ? 0.06 : (dim === 1 ? 0.55 : 1);
        node.__visualGroup.traverse(object => {
            if (!object.material) return;
            const base = object.material.__baseOpacity ?? object.material.opacity ?? 1;
            object.material.__baseOpacity = base;
            object.material.transparent = true;
            object.material.opacity = base * factor;
        });
    }

    function graphHierarchyMaps() {
        const data = Graph.graphData?.() || { nodes: [], links: [] };
        const nodes = data.nodes || [];
        const byId = new Map(nodes.map(node => [node.id, node]));
        const children = new Map();
        const parents = new Map();
        (data.links || []).forEach(link => {
            if (link.__hierarchy === false) return;
            const sourceId = typeof link.source === 'object' ? link.source?.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target?.id : link.target;
            if (!sourceId || !targetId || !byId.has(sourceId) || !byId.has(targetId)) return;
            if (parents.has(targetId)) return;
            parents.set(targetId, sourceId);
            if (!children.has(sourceId)) children.set(sourceId, []);
            children.get(sourceId).push(targetId);
        });
        return { nodes, links: data.links || [], byId, children, parents };
    }

    function clearGraphFocus() {
        focusedGraphNodeId = null;
        const data = Graph.graphData?.() || { nodes: [], links: [] };
        (data.nodes || []).forEach(node => {
            node.__focusDim = 0;
            applyNodeFocusVisual(node);
        });
        (data.links || []).forEach(link => { link.__focusDim = 0; });
        if (typeof Graph.linkColor === 'function') Graph.linkColor(linkColorFor);
        if (typeof Graph.linkWidth === 'function') Graph.linkWidth(linkWidthFor);
    }

    function applyGraphFocus(selected) {
        if (!selected || selected.center) {
            clearGraphFocus();
            return;
        }
        const { nodes, links, byId, children, parents } = graphHierarchyMaps();
        if (!byId.has(selected.id)) return;
        const chain = new Set([selected.id]);
        let cursor = selected.id;
        const seen = new Set();
        while (parents.has(cursor) && !seen.has(cursor)) {
            seen.add(cursor);
            cursor = parents.get(cursor);
            chain.add(cursor);
        }
        const stack = [...(children.get(selected.id) || [])];
        const visited = new Set();
        while (stack.length) {
            const id = stack.pop();
            if (visited.has(id)) continue;
            visited.add(id);
            chain.add(id);
            stack.push(...(children.get(id) || []));
        }
        const continentId = selected.__layoutContinentId || '';
        nodes.forEach(node => {
            node.__focusDim = chain.has(node.id)
                ? 0
                : (continentId && node.__layoutContinentId === continentId ? 1 : 2);
            applyNodeFocusVisual(node);
        });
        links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source?.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target?.id : link.target;
            const sourceNode = byId.get(sourceId);
            const targetNode = byId.get(targetId);
            if (chain.has(sourceId) && chain.has(targetId)) link.__focusDim = 0;
            else if (continentId && sourceNode?.__layoutContinentId === continentId && targetNode?.__layoutContinentId === continentId) link.__focusDim = 1;
            else link.__focusDim = 2;
        });
        focusedGraphNodeId = selected.id;
        if (typeof Graph.linkColor === 'function') Graph.linkColor(linkColorFor);
        if (typeof Graph.linkWidth === 'function') Graph.linkWidth(linkWidthFor);
    }

    function runGraphNodeAction(node, event) {
        if (!node) return false;
        const now = performance.now();
        if (lastGraphNodeAction.node === node && now - lastGraphNodeAction.time < 250) return true;
        lastGraphNodeAction = { node, time: now };
        applyGraphFocus(node);
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
        if (node.center) {
            frameGraphOverview(900, 120);
            return true;
        }
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
            || nodes.find(node => normalizeGraphSearchText(node.nameEn) === normalizedQuery)
            || nodes.find(node => (node.aliases || []).some(alias => normalizeGraphSearchText(alias) === normalizedQuery))
            || nodes.find(node => node.qid && node.qid.toLowerCase() === String(query).trim().toLowerCase())
            || nodes.find(node => normalizeGraphSearchText(node.name).includes(normalizedQuery))
            || nodes.find(node => normalizeGraphSearchText(node.path).includes(normalizedQuery));
    }

    function focusNodeByQuery(query) {
        let node = findGraphNode(query);
        if (!node && graphLayerMode !== 'all') {
            graphLayerMode = 'all';
            if (layerToggleBtn) layerToggleBtn.textContent = '只看知识结构';
            rebuildBuiltinGraph();
            node = findGraphNode(query);
        }
        if (!node) {
            showPreview('未找到节点', `搜索词: ${query}`, '<p>知识图谱里没有匹配的节点。可以尝试输入更短的中文名、英文名或文件名。</p>');
            return false;
        }
        return runGraphNodeAction(node);
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

    // 节点面板的“世界知识”区块，是节点的主视图：先给实体与正文，再给关系声明。
    function renderWorldKnowledgeSection(node) {
        const entry = typeof getGraphNodeWorldKnowledge === 'function' ? getGraphNodeWorldKnowledge(node.name) : null;
        if (!entry) {
            return `
                <section class="zstp-world is-missing">
                    <header class="zstp-world-head">
                        <span class="zstp-world-kicker">WORLD KNOWLEDGE · 世界知识</span>
                        <span class="zstp-world-badge is-empty">尚未编译</span>
                    </header>
                    <p class="zstp-world-empty">这个节点没有对应的 Wikipedia/Wikidata 实体记录。
                    运行 <code>node compileWorldGraph.js</code> 会从 Wikipedia 三级重要条目与 Wikidata 重新生成，然后重新加载页面。</p>
                </section>
            `;
        }

        const pieces = [];
        const entity = entry.entityDetail;
        const article = entry.article;

        if (entity) {
            const description = entity.description.zh || entity.description.en || '';
            pieces.push(`
                <div class="zstp-world-entity">
                    <div class="zstp-world-label">${escapeHtml(node.name)}</div>
                    ${description ? `<p class="zstp-world-desc">${escapeHtml(description)}</p>` : ''}
                    ${entity.aliases.length ? `<p class="zstp-world-aliases">别名: ${escapeHtml(entity.aliases.join('；'))}</p>` : ''}
                </div>
            `);
            const claimLines = worldClaimSummary(entry);
            if (claimLines.length) {
                const rows = claimLines.map(line => {
                    const match = line.match(/^(.*?)\s*\((P\d+)\):\s*([\s\S]*)$/);
                    return `<tr><th>${escapeHtml(match ? match[1] : '关系')}${match ? ` <code>${escapeHtml(match[2])}</code>` : ''}</th><td>${escapeHtml(match ? match[3] : line)}</td></tr>`;
                }).join('');
                pieces.push(`
                    <section class="zstp-kb-record">
                        <h4>关系声明 (${claimLines.length})</h4>
                        <table class="zstp-vault-table zstp-world-claims">${rows}</table>
                    </section>
                `);
            }
        }

        const prose = (entity && entity.wikipedia && entity.wikipedia.extract) || (article && article.extract) || '';
        const proseTitle = (entity && entity.wikipedia && entity.wikipedia.title) || (article && article.title) || '';
        if (prose) {
            const paragraphs = String(prose).split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
            const proseHtml = (paragraphs.length ? paragraphs : [String(prose)])
                .map(part => `<p class="zstp-world-prose">${escapeHtml(part)}</p>`)
                .join('');
            pieces.push(`
                <section class="zstp-kb-record">
                    <h4>百科条目《${escapeHtml(proseTitle)}》</h4>
                    ${proseHtml}
                </section>
            `);
        }

        return `<section class="zstp-world">${pieces.join('')}</section>`;
    }

    function inspectKnowledgeGraphNode(node) {
        const context = getNodeGraphContext(node);
        const allRecords = node.knowledgeBase || [];
        const worldRecords = allRecords.filter(record => record.evidenceLevel === 'encyclopedia-verbatim');
        const records = allRecords
            .filter(record => !['encyclopedia-verbatim', 'structured-claim'].includes(record.evidenceLevel))
            .slice(0, 10);
        const children = (context.children || []).slice(0, 12).map(item => item.name);
        const recordHtml = records.length
            ? records.map(item => `
                <section class="zstp-kb-record">
                    <h4>${escapeHtml(item.title || '节点知识库')}</h4>
                    <pre><code>${escapeHtml(item.content || '')}</code></pre>
                </section>
            `).join('')
            : '';
        showPreview(
            node.name,
            `${(context.path || []).join(' > ')} · 百科正文 ${worldRecords.length} 段`,
            `
                ${renderWorldKnowledgeSection(node)}
                <div class="zstp-kb-summary">
                    <p>${escapeHtml(node.description || '暂无描述。')}</p>
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

    function getWorldRag() {
        if (typeof window === 'undefined') return null;
        if (window.WORLD_RAG && typeof window.WORLD_RAG.search === 'function') return window.WORLD_RAG;
        return null;
    }

    function buildNodeKnowledgeProfile(node, context) {
        const worldNode = getWorldRag()?.getNode(node.name);
        return {
            id: node.id,
            name: node.name,
            primaryTerm: node.nameEn || node.name,
            broadQuery: node.name,
            graphPath: (context.path || []).join(' > '),
            section: node.section || '',
            qid: node.qid || worldNode?.qid || '',
            worldId: node.worldId || worldNode?.id || '',
            terms: {
                raw: node.name,
                english: node.nameEn || '',
                chinese: node.name || ''
            },
            domain: {
                id: 'world-knowledge',
                label: node.section || '世界知识',
                summary: 'Wikipedia 与 Wikidata 的原文和结构化声明。',
                sources: ['Wikipedia', 'Wikidata'],
                questions: []
            },
            source: node.source || 'Wikipedia · Wikidata'
        };
    }

    function toWorldRetrievalRecord(match) {
        return {
            type: 'world-corpus-chunk',
            id: match.chunkId,
            title: `${match.title}${match.heading ? ` · ${match.heading}` : ' · 导言'}`,
            content: match.text,
            snippet: match.snippet,
            source: 'Wikipedia',
            url: match.url,
            citation: match.citation,
            evidenceLevel: 'encyclopedia-verbatim',
            evidenceUsability: 'claim-supporting',
            nodeId: match.nodeId,
            nodeName: match.nodeName,
            qid: match.qid,
            heading: match.heading,
            lang: match.lang,
            retrievalScore: match.score,
            score: match.score
        };
    }

    function buildNodeKnowledgeBundle(node, userQuery = '', { liveExternal = false } = {}) {
        const graphContext = getNodeGraphContext(node);
        const profile = buildNodeKnowledgeProfile(node, graphContext);
        const rag = getWorldRag();
        if (!rag) {
            return {
                profile,
                graphContext,
                localRecords: [],
                externalRecords: [],
                evidenceGraph: { nodes: [], edges: [], stats: { topics: 0, evidence: 0, claims: 0 } },
                retrievalPolicy: ['本地世界知识检索器尚未加载。'],
                diagnostics: { error: 'world-rag-unavailable', liveExternal: false }
            };
        }
        const query = [node.name, userQuery].filter(Boolean).join(' ').trim();
        const result = rag.search(query, { topK: 20, graphExpand: true });
        return {
            profile,
            graphContext,
            localRecords: result.matches.map(toWorldRetrievalRecord),
            externalRecords: [],
            evidenceGraph: result.evidenceGraph,
            retrievalPolicy: [
                '只检索本地 worldKnowledge.js 中带 revision 与 URL 的 Wikipedia 原文段落。',
                'Wikidata 声明只作为结构化关系，不替代原文段落。',
                '所有回答必须能够回指到检索记录的 citation。'
            ],
            diagnostics: {
                ...result.diagnostics,
                seeds: result.seeds,
                mode: 'local-corpus',
                liveExternal: false
            }
        };
    }

    async function searchWorldKnowledge(query, options = {}) {
        if (typeof window !== 'undefined' && window.WORLD_CORPUS_READY) {
            await window.WORLD_CORPUS_READY;
        }
        const rag = getWorldRag();
        if (!rag) {
            return {
                query: String(query || ''),
                matches: [],
                localRecords: [],
                seeds: [],
                evidenceGraph: { nodes: [], edges: [], stats: { topics: 0, evidence: 0, claims: 0 } },
                diagnostics: { error: 'world-rag-unavailable' }
            };
        }
        const result = rag.search(query, {
            topK: Math.max(1, Math.min(24, Number(options.topK) || 8)),
            graphExpand: options.graphExpand !== false
        });
        return {
            ...result,
            localRecords: result.matches.map(toWorldRetrievalRecord)
        };
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
    const layerToggleBtn = document.getElementById('zstp-layer-toggle');
    const folderInput = document.getElementById('zstp-folder-input');
    // 笔记元数据 path -> note，点击节点时用来渲染笔记面板（正文按需再读文件，避免把整个库塞进内存）
    const vaultNotesByPath = new Map();
    let importedGraphMode = 'builtin';
    let lastVaultStats = null;

    if (layerToggleBtn) {
        layerToggleBtn.addEventListener('click', () => {
            graphLayerMode = graphLayerMode === 'all' ? 'structure' : 'all';
            layerToggleBtn.textContent = graphLayerMode === 'all' ? '只看知识结构' : '显示全部实体';
            if (importedGraphMode === 'builtin') rebuildBuiltinGraph();
            else restoreBuiltinGraph();
        });
    }

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
    function rebuildBuiltinGraph() {
        _graphAutoId = 0;
        focusedGraphNodeId = null;
        lastGraphNodeAction = { node: null, time: 0 };
        const newData = applyReadableGraphLayout(buildGraphData(getBuiltinGraphTree(), THEME));
        graphNodeById = new Map(newData.nodes.map(node => [node.id, node]));
        Graph.graphData(newData);
        refreshLayoutGuides(newData);
        frameGraphOverview(900, 120);
        console.log('[知识图谱] 已重建内置图谱:', { mode: graphLayerMode, nodes: newData.nodes.length, links: newData.links.length });
        return newData;
    }

    function restoreBuiltinGraph() {
        if (importedGraphMode === 'builtin') return false;
        vaultNotesByPath.clear();
        lastVaultStats = null;
        importedGraphMode = 'builtin';
        rebuildBuiltinGraph();
        if (importBtn) importBtn.textContent = importBtn.dataset.baseLabel || '项目导入';
        updateRestoreButton();
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
            const data = (typeof Graph !== 'undefined' && Graph.graphData?.()) || { nodes: [], links: [] };
            const realNodes = (data.nodes || []).filter(node => node.kind !== 'knowledge-detail');
            const entityNodes = realNodes.filter(node => node.kind !== 'category' && node.kind !== 'root');
            const invalidNodes = entityNodes.filter(node => {
                const hasSource = (node.knowledgeBase || []).some(record =>
                    record.evidenceLevel === 'encyclopedia-verbatim' &&
                    record.citation?.revision &&
                    record.citation?.url
                );
                return !node.qid || !hasSource;
            });
            const requiredNodeCount = importedGraphMode === 'builtin'
                ? (graphLayerMode === 'all' ? 100 : 1)
                : 1;
            return {
                status: invalidNodes.length === 0 && realNodes.length >= requiredNodeCount ? 'pass' : 'fail',
                nodeCount: realNodes.length,
                entityCount: entityNodes.length,
                categoryCount: realNodes.length - entityNodes.length,
                fullEntityCount: window.WORLD_KNOWLEDGE_GRAPH?.meta?.nodeCount || 0,
                layerMode: graphLayerMode,
                linkCount: (data.links || []).length,
                invalidNodeCount: invalidNodes.length,
                invalidNodes: invalidNodes.slice(0, 20).map(node => node.name),
                graphMode: importedGraphMode,
                requiredNodeCount,
                retrieverVersion: getWorldRag()?.version || 'unavailable',
                corpus: getWorldRag()?.stats() || null,
                source: getWorldGraphStats()
            };
        },
        retrieveKnowledge: async ({ nodeName, query, topK } = {}) => {
            if (window.WORLD_CORPUS_READY) await window.WORLD_CORPUS_READY;
            const rag = getWorldRag();
            if (!rag) {
                return {
                    error: 'world_rag_unavailable',
                    query: query || nodeName || '',
                    message: '本地世界知识检索器未加载。'
                };
            }
            const limit = Number.isFinite(topK) ? Math.max(1, Math.min(24, topK)) : 8;
            const targetNode = nodeName ? findGraphNode(nodeName) : (query ? findGraphNode(query) : null);
            const searchQuery = [targetNode?.name, query].filter(Boolean).join(' ').trim() || query || nodeName || '';
            const result = rag.search(searchQuery, { topK: limit, graphExpand: true });
            const graphContext = targetNode ? getNodeGraphContext(targetNode) : null;
            return {
                node: targetNode ? {
                    id: targetNode.id,
                    name: targetNode.name,
                    qid: targetNode.qid || '',
                    source: targetNode.source || '',
                    section: targetNode.section || '',
                    knowledgeBaseCount: Array.isArray(targetNode.knowledgeBase) ? targetNode.knowledgeBase.length : 0
                } : {
                    id: '',
                    name: result.seeds[0]?.name || '世界知识库',
                    qid: result.seeds[0]?.qid || '',
                    source: 'Wikipedia · Wikidata',
                    section: '',
                    knowledgeBaseCount: 0
                },
                profile: {
                    query: searchQuery,
                    primaryTerm: targetNode?.nameEn || targetNode?.name || searchQuery,
                    graphPath: (graphContext?.path || []).join(' > ')
                },
                graph: {
                    path: graphContext?.path || [],
                    parent: graphContext?.parent?.name || '',
                    children: (graphContext?.children || []).slice(0, 16).map(item => item.name),
                    siblings: (graphContext?.siblings || []).slice(0, 16).map(item => item.name),
                    nodeCount: graphContext?.nodeCount || 0,
                    linkCount: graphContext?.linkCount || 0
                },
                seeds: result.seeds,
                localRecords: result.matches.map(toWorldRetrievalRecord).slice(0, limit),
                externalRecords: [],
                evidenceGraph: result.evidenceGraph,
                retrievalPolicy: [
                    '只检索本地 Wikipedia 原文语料。',
                    '每条记录带标题、URL、revision 与 CC BY-SA 4.0 许可。',
                    'Wikidata 声明仅用于实体关系和消歧。'
                ],
                diagnostics: result.diagnostics,
                mode: 'local-corpus'
            };
        },
        searchWorldKnowledge: (query, options = {}) => searchWorldKnowledge(query, options),
        worldGraphStats: () => getWorldGraphStats(),
        ragStats: () => getWorldRag()?.stats() || null,
        resetRag: () => {
            window.WORLD_RAG = null;
            return 'reload-page-to-rebuild-index';
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
