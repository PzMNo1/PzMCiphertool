// 世界知识图谱数据装配层。
// 内置图谱的节点、边和知识正文全部来自 worldKnowledge.js：
//   - 节点是 Wikipedia 三级重要条目页面上真实存在的条目
//   - 分类是同一页面上的原始章节
//   - 关系来自 Wikidata 声明与维基百科内链
//   - 知识库记录是带 revision / URL / CC BY-SA 4.0 署名的百科原文段落
// 本文件不再生成任何定义、机制、指标或“专家框架”文本。

const WORLD_SECTION_COLORS = {
    'People': 0xffd166,
    'History': 0xf59e0b,
    'Geography': 0x06b6d4,
    'Arts': 0xec4899,
    'Everyday life': 0x10b981,
    'Philosophy and religion': 0x8b5cf6,
    'Society and social sciences': 0xfb7185,
    'Health, medicine and disease': 0x22d3ee,
    'Science': 0x3b82f6,
    'Technology': 0xa3e635,
    'Mathematics': 0x6366f1,
    'default': 0x00e5ff
};

const WORLD_EDGE_LIMIT = 350;

function getWorldGraphStore() {
    if (typeof window !== 'undefined' && window.WORLD_KNOWLEDGE_GRAPH) return window.WORLD_KNOWLEDGE_GRAPH;
    return null;
}

function worldSectionColor(section) {
    return WORLD_SECTION_COLORS[section] || WORLD_SECTION_COLORS.default;
}

function worldNodeDisplayName(node) {
    return node.name;
}

function worldClaimSummary(entry) {
    return (entry?.claims || []).map(claim => {
        const values = (claim.values || []).slice(0, 6).map(value => {
            if (value.display) return value.display;
            if (value.kind === 'entity') return value.label ? `${value.label}${value.id ? ` (${value.id})` : ''}` : value.id;
            return value.value;
        }).filter(Boolean);
        const label = (claim.label && (claim.label.zh || claim.label.en)) || claim.property;
        return values.length ? `${label} (${claim.property}): ${values.join('；')}` : '';
    }).filter(Boolean);
}

function worldCitation(node, language, title) {
    const wiki = node.wiki?.[language] || {};
    return {
        source: 'Wikipedia',
        title: wiki.title || title || node.name,
        url: wiki.url || node.sourceUrl || '',
        revision: wiki.revision || '',
        license: 'CC BY-SA 4.0',
        retrievedAt: getWorldGraphStore()?.meta?.builtAt || ''
    };
}

function buildWorldEntityKnowledge(node, store) {
    const records = [];
    for (const claim of (node.claims || []).slice(0, 8)) {
        const values = (claim.values || []).slice(0, 12).map(value => value.label || value.id).filter(Boolean);
        if (!values.length) continue;
        records.push({
            id: `${node.id}:claim:${claim.property}`,
            title: claim.label,
            content: `${claim.label}：${values.join('；')}`,
            source: 'Wikidata',
            url: `https://www.wikidata.org/wiki/${node.qid}`,
            evidenceLevel: 'structured-claim',
            evidenceUsability: 'claim-supporting',
            citation: {
                source: 'Wikidata',
                title: `${node.name} (${node.qid})`,
                url: `https://www.wikidata.org/wiki/${node.qid}`,
                identifier: node.qid,
                retrievedAt: store?.meta?.builtAt || ''
            },
            keywords: [node.name, node.nameEn, claim.label].filter(Boolean)
        });
    }
    const documents = store?.documents?.[node.id] || {};
    let count = 0;
    for (const [language, docs] of Object.entries(documents)) {
        for (let index = 0; index < docs.length && count < 12; index += 1) {
            const doc = docs[index];
            if (!doc?.text) continue;
            const wiki = node.wiki?.[language] || {};
            records.push({
                id: `${node.id}:${language}:${index}`,
                title: `${wiki.title || node.name}${doc.heading ? ` · ${doc.heading}` : ' · 导言'}`,
                content: doc.text,
                snippet: doc.text,
                source: 'Wikipedia',
                url: wiki.url || '',
                evidenceLevel: 'encyclopedia-verbatim',
                evidenceUsability: 'claim-supporting',
                citation: worldCitation(node, language),
                keywords: [node.name, node.nameEn, doc.heading].filter(Boolean)
            });
            count += 1;
        }
    }
    return records;
}

function worldCategoryMemberNodes(category, store) {
    const categoryIds = new Set([category.id]);
    let changed = true;
    const categories = (store?.nodes || []).filter(node => node.kind === 'category');
    while (changed) {
        changed = false;
        for (const item of categories) {
            if (item.parentId && categoryIds.has(item.parentId) && !categoryIds.has(item.id)) {
                categoryIds.add(item.id);
                changed = true;
            }
        }
    }
    return (store?.nodes || []).filter(node => node.kind !== 'category' && categoryIds.has(node.sectionId));
}

function buildWorldCategoryKnowledge(node, members, store) {
    const allMembers = worldCategoryMemberNodes(node, store);
    const names = (allMembers.length ? allMembers : members).map(member => member.name).filter(Boolean);
    const label = node.name;
    return [{
        id: `${node.id}:members`,
        title: `${label} · 条目清单`,
        content: names.length
            ? `该章节共 ${names.length} 个条目：${names.slice(0, 120).join('；')}`
            : '该章节暂无已编译条目。',
        source: 'Wikipedia',
        url: node.sourceUrl || '',
        evidenceLevel: 'source-index',
        citation: {
            source: 'Wikipedia',
            title: `Vital articles / ${node.name}`,
            url: node.sourceUrl || '',
            retrievedAt: getWorldGraphStore()?.meta?.builtAt || ''
        },
        keywords: [node.name, node.nameZh].filter(Boolean)
    }];
}

function buildWorldTree(store) {
    if (!store || !Array.isArray(store.nodes) || !store.nodes.length) {
        return [{
            name: '世界知识图谱尚未编译',
            val: 40,
            group: 'root',
            description: '运行 node compileWorldGraph.js 从 Wikipedia 与 Wikidata 生成本地世界知识图谱。',
            source: 'PzMAgentool',
            knowledgeBase: [{
                id: 'world-graph-missing',
                title: '数据尚未生成',
                content: 'worldKnowledge.js 中没有 WORLD_KNOWLEDGE_GRAPH 数据。本节点不是知识内容，只是构建提示。',
                source: 'PzMAgentool'
            }]
        }];
    }
    const nodes = store.nodes;
    const byId = new Map(nodes.map(node => [node.id, node]));
    const categories = nodes.filter(node => node.kind === 'category');
    const entities = nodes.filter(node => node.kind !== 'category');
    const subcategoriesByParent = new Map();
    for (const category of categories) {
        if (!category.parentId) continue;
        if (!subcategoriesByParent.has(category.parentId)) subcategoriesByParent.set(category.parentId, []);
        subcategoriesByParent.get(category.parentId).push(category);
    }
    const entitiesBySection = new Map();
    for (const entity of entities) {
        const sectionId = entity.sectionId || '';
        if (!entitiesBySection.has(sectionId)) entitiesBySection.set(sectionId, []);
        entitiesBySection.get(sectionId).push(entity);
    }

    const toEntityRaw = entity => ({
        name: entity.name,
        val: 14,
        group: 'entity',
        kind: 'entity',
        color: worldSectionColor(entity.section),
        description: entity.description || '',
        source: 'Wikipedia · Wikidata',
        worldId: entity.id,
        qid: entity.qid || '',
        nameEn: entity.nameEn || '',
        aliases: entity.aliases || [],
        section: entity.section || '',
        subsection: entity.subsection || '',
        knowledgeBase: buildWorldEntityKnowledge(entity, store)
    });

    const buildCategory = category => {
        const subcategories = (subcategoriesByParent.get(category.id) || [])
            .map(buildCategory)
            .filter(Boolean);
        const members = entitiesBySection.get(category.id) || [];
        const children = [
            ...subcategories,
            ...members.map(toEntityRaw)
        ];
        if (!children.length) return null;
        return {
            name: worldNodeDisplayName(category),
            val: 30,
            group: 'category',
            kind: 'category',
            color: category.color || worldSectionColor(category.section),
            description: category.description || '',
            source: 'Wikipedia',
            worldId: category.id,
            qid: '',
            nameEn: category.nameEn || '',
            section: category.section || '',
            knowledgeBase: buildWorldCategoryKnowledge(category, members, store),
            children
        };
    };

    const roots = categories
        .filter(category => !category.parentId)
        .map(buildCategory)
        .filter(Boolean);
    if (!roots.length) {
        return entities.slice(0, 1).map(toEntityRaw);
    }
    return [{
        name: 'PzM知识图谱',
        val: 96,
        group: 'root',
        kind: 'root',
        center: true,
        color: 0xffd700,
        description: '知识大陆展示中心，连接六个方向的世界知识分支。',
        source: 'PzM',
        knowledgeBase: [],
        children: roots
    }];
}

function normalizeGraphKnowledgeBase(rawKnowledgeBase) {
    if (!rawKnowledgeBase) return [];
    const list = Array.isArray(rawKnowledgeBase) ? rawKnowledgeBase : [rawKnowledgeBase];
    return list
        .filter(Boolean)
        .map((item, index) => {
            if (typeof item === 'string') {
                return { id: `custom-${index + 1}`, title: '自定义知识库', content: item, keywords: [] };
            }
            return {
                id: item.id || `custom-${index + 1}`,
                title: item.title || '自定义知识库',
                content: item.content || item.summary || '',
                source: item.source || '',
                url: item.url || '',
                snippet: item.snippet || '',
                evidenceLevel: item.evidenceLevel || '',
                evidenceUsability: item.evidenceUsability || '',
                citation: item.citation || null,
                keywords: Array.isArray(item.keywords) ? item.keywords : []
            };
        })
        .filter(item => item.content || item.title);
}

function buildGraphData(roots, THEME, prefix) {
    const nodes = [], links = [];
    const pfx = prefix || '_n';
    const byWorldId = new Map();
    let autoId = 0;

    function walk(raw, parentId, inheritGroup, inheritColor, inheritMeta, depth) {
        const group = raw.group || inheritGroup || 'classic';
        const color = raw.color != null ? raw.color : (inheritColor != null ? inheritColor : (THEME[group] ?? 0xffffff));
        const graphPath = [...(inheritMeta?.graphPath || []), raw.name];
        const meta = {
            description: raw.description || inheritMeta?.description,
            source: raw.source || inheritMeta?.source,
            axis: raw.axis || inheritMeta?.axis,
            scale: raw.scale || inheritMeta?.scale,
            maturity: raw.maturity || inheritMeta?.maturity,
            layer: raw.layer || inheritMeta?.layer,
            graphPath
        };
        const rawChildren = raw.children || [];
        const id = pfx + autoId;
        autoId += 1;
        const node = {
            id,
            name: raw.name,
            val: raw.val,
            color,
            group,
            path: raw.path,
            kind: raw.kind,
            center: raw.center === true,
            ext: raw.ext,
            mime: raw.mime,
            description: meta.description,
            source: meta.source,
            axis: meta.axis,
            scale: meta.scale,
            maturity: meta.maturity,
            layer: meta.layer,
            worldId: raw.worldId || '',
            qid: raw.qid || '',
            nameEn: raw.nameEn || '',
            aliases: raw.aliases || [],
            section: raw.section || '',
            subsection: raw.subsection || '',
            knowledgeBase: normalizeGraphKnowledgeBase(raw.knowledgeBase)
        };
        nodes.push(node);
        if (raw.worldId && !byWorldId.has(raw.worldId)) byWorldId.set(raw.worldId, id);
        if (parentId) links.push({ source: parentId, target: id });
        const nextGroup = raw.childGroup || group;
        const nextColor = raw.childColor != null ? raw.childColor : color;
        rawChildren.forEach(child => walk(child, id, nextGroup, nextColor, meta, (depth || 0) + 1));
    }

    roots.forEach(root => walk(root, null, null, null, null, 0));

    const store = getWorldGraphStore();
    if (prefix === undefined && store && Array.isArray(store.edges)) {
        let added = 0;
        const sorted = [...store.edges].sort((left, right) => {
            const leftWeight = left.type === 'wiki_link' ? 1 : 0;
            const rightWeight = right.type === 'wiki_link' ? 1 : 0;
            return leftWeight - rightWeight;
        });
        for (const edge of sorted) {
            if (edge.type === 'section_contains') continue;
            const sourceId = byWorldId.get(edge.source);
            const targetId = byWorldId.get(edge.target);
            if (!sourceId || !targetId || sourceId === targetId) continue;
            links.push({
                source: sourceId,
                target: targetId,
                __hierarchy: false,
                relation: edge.type,
                label: edge.label || ''
            });
            added += 1;
            if (added >= WORLD_EDGE_LIMIT) break;
        }
    }
    return { nodes, links };
}

function getGraphTree(THEME) {
    return buildWorldTree(getWorldGraphStore());
}

function getGraphNodeWorldKnowledge(nodeName) {
    const store = getWorldGraphStore();
    if (!store || !Array.isArray(store.nodes) || !nodeName) return null;
    if (nodeName === 'PzM知识图谱') {
        const continents = store.nodes.filter(item => item.kind === 'category' && !item.parentId);
        return {
            status: 'article-confirmed',
            score: 1,
            article: {
                title: 'PzM知识图谱',
                url: '',
                description: '六个方向的知识大陆展示中心',
                extract: continents.length
                    ? `由内向外连接六个知识大陆：${continents.map(item => item.name).join('；')}。点击某一方向后，该方向保持高亮，其余方向自动变暗。`
                    : '世界知识展示中心。',
                revision: '',
                excerptFromSearch: false
            },
            claims: [],
            resolvedAt: store.meta?.builtAt || ''
        };
    }
    const node = store.nodes.find(item => item.name === nodeName && item.kind !== 'category');
    if (!node) {
        const category = store.nodes.find(item => item.kind === 'category' && (item.name === nodeName || worldNodeDisplayName(item) === nodeName));
        if (!category) return null;
        const members = worldCategoryMemberNodes(category, store);
        return {
            status: 'article-confirmed',
            score: 1,
            article: {
                title: category.name,
                url: category.sourceUrl || '',
                description: category.description || '',
                extract: members.length ? `该章节收录：${members.map(item => item.name).slice(0, 80).join('；')}` : '',
                revision: store.meta?.sourcePage?.revision || '',
                excerptFromSearch: false
            },
            claims: [],
            resolvedAt: store.meta?.builtAt || ''
        };
    }
    const wiki = node.wiki?.zh || node.wiki?.en || {};
    const documents = store.documents?.[node.id] || {};
    const firstLanguage = Object.keys(documents)[0];
    const lead = firstLanguage ? (documents[firstLanguage] || []).map(doc => doc.text).join('\n\n') : '';
    return {
        status: 'entity-confirmed',
        score: 1,
        resolvedAt: store.meta?.builtAt || '',
        matchMode: 'wikidata',
        matchedBy: { query: node.name, language: 'zh', matchType: 'sitelink' },
        entityDetail: {
            id: node.qid,
            uri: `https://www.wikidata.org/wiki/${node.qid}`,
            label: { zh: node.nameZh || node.name, en: node.nameEn },
            description: { zh: node.description, en: node.descriptionEn },
            aliases: node.aliases || [],
            wikipedia: {
                site: 'zh.wikipedia.org',
                language: firstLanguage || 'zh',
                title: wiki.title || node.name,
                url: wiki.url || '',
                extract: lead,
                revision: wiki.revision || ''
            }
        },
        claims: (node.claims || []).map(claim => ({
            property: claim.property,
            label: { zh: claim.label, en: claim.label },
            values: (claim.values || []).map(value => ({
                kind: 'entity',
                id: value.id,
                label: value.label,
                display: value.label ? `${value.label} (${value.id})` : value.id
            }))
        })),
        article: null
    };
}

function getWorldGraphStats() {
    const store = getWorldGraphStore();
    if (!store) return { ready: false };
    return {
        ready: true,
        ...store.meta,
        documents: Object.keys(store.documents || {}).length
    };
}
