/* Compiles the built-in world knowledge graph from primary sources.
 *
 * Sources:
 *   - Wikipedia:Vital articles/Level 3 (the article list and its section tree)
 *   - Wikidata entity labels, descriptions, aliases, sitelinks and claims
 *   - Wikipedia article wikitext, converted to plain text with markup removed
 *
 * Nothing in the output is written by a language model. Every node is a real
 * Wikipedia/Wikidata entity, every edge is a real section, Wikidata claim or
 * article hyperlink, and every chunk is verbatim article prose with a revision
 * id, canonical URL and CC BY-SA 4.0 attribution.
 *
 * Usage:
 *   node compileWorldGraph.js --plan
 *   node compileWorldGraph.js --limit=60
 *   node compileWorldGraph.js
 *   node compileWorldGraph.js --refresh
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const source = require('./worldSource');
const TRADITIONAL_MAP = require('./traditionalChinese.js');

function simplifyChinese(value) {
    return String(value || '').replace(/[\u3400-\u9fff]/g, char => TRADITIONAL_MAP[char] || char);
}

const directory = __dirname;
const outputPath = path.join(directory, 'worldKnowledge.js');
const cacheDir = path.join(os.tmpdir(), 'pzm-world-graph-cache');
const planOnly = process.argv.includes('--plan');
const refresh = process.argv.includes('--refresh');
const pretty = process.argv.includes('--pretty');
const skipLinks = process.argv.includes('--no-links');
const nodeLimit = Math.max(0, Number((process.argv.find(item => item.startsWith('--limit=')) || '').split('=')[1]) || Number(process.env.WG_NODE_LIMIT) || 1000);
const maxCharsPerNode = Math.max(0, Number(process.env.WG_MAX_CHARS) || 0);
const bilingual = process.env.WG_BILINGUAL === '1';
const vitalPageTitle = 'Wikipedia:Vital articles/Level 3';
const startedAt = Date.now();

const STOP_SECTIONS = /^(?:current total|references|external links|see also|further reading|notes|bibliography|citations|sources)$/i;
const SECTION_LABELS = {
    'People': '人物',
    'History': '历史',
    'Geography': '地理',
    'Arts': '艺术',
    'Everyday life': '日常生活',
    'Philosophy and religion': '哲学与宗教',
    'Society and social sciences': '社会与社会科学',
    'Health, medicine and disease': '健康、医学与疾病',
    'Science': '科学',
    'Technology': '技术',
    'Mathematics': '数学'
};
const SUBSECTION_LABELS = {
    'Artists': '艺术家',
    'Leaders and politicians': '领袖与政治家',
    'Mathematicians': '数学家',
    'Musicians': '音乐家',
    'Philosophers and social scientists': '哲学家与社会科学学家',
    'Religious figures': '宗教人物',
    'Scientists and inventors': '科学家与发明家',
    'Writers': '作家',
    'Ancient history': '古代史',
    'History by region': '按地区划分的历史',
    'History by subject': '按主题划分的历史',
    'Modern history': '现代史',
    'Post-classical history': '后古典时代历史',
    'Continents and regions': '大洲与地区',
    'Human settlements': '人类聚居地',
    'Physical geography': '自然地理学',
    'Literature': '文学',
    'Music': '音乐',
    'Visual arts': '视觉艺术',
    'Food and drink': '饮食',
    'Recreation and entertainment': '休闲与娱乐',
    'Sexuality and gender': '性与性别',
    'Stages of life': '人生阶段',
    'Philosophy': '哲学',
    'Religion': '宗教',
    'Specific religions': '具体宗教',
    'Business and economics': '商业与经济',
    'Language': '语言',
    'Law': '法律',
    'Politics and government': '政治与政府',
    'Psychology': '心理学',
    'Social issues': '社会议题',
    'Society and social sciences: General': '社会与社会科学总论',
    'Health, fitness, and medicine': '健康、体能与医学',
    'Illness and injury': '疾病与伤害',
    'Astronomy': '天文学',
    'Biology': '生物学',
    'Chemistry': '化学',
    'Earth science': '地球科学',
    'Physics': '物理学',
    'Science: General': '科学总论',
    'Energy': '能源',
    'Food and health': '食品与健康',
    'Materials': '材料',
    'Media and communication': '媒体与通信',
    'Navigation and timekeeping': '导航与计时',
    'Optical': '光学',
    'Technology: General': '技术总论',
    'Tools and machinery': '工具与机械',
    'Transportation': '交通运输',
    'Algebra': '代数',
    'Analysis': '分析',
    'Counting and numbers': '计数与数',
    'Geometry and topology': '几何与拓扑',
    'Mathematics: General': '数学总论',
    'Filmmakers': '电影制作人',
    'History: General': '历史总论',
    'Prehistory': '史前史',
    'Artistic movements': '艺术运动',
    'Arts: General': '艺术总论',
    'Performing arts': '表演艺术',
    'Everyday life: General': '日常生活总论',
    'Family, kinship and friendship': '家庭、亲属与友谊',
    'Mythology': '神话',
    'Conflict': '冲突',
    'Education': '教育',
    'Media': '媒体',
    'Computing and information technology': '计算与信息技术',
    'Electronics': '电子学',
    'Space': '航天',
    'Structures': '建筑结构',
    'Weapons': '武器',
    'Arithmetic': '算术',
    'Probability and statistics': '概率与统计'
};
const SUBSUBSECTION_LABELS = {
    'Countries': '国家',
    'Terrestrial features': '陆地地貌',
    'Hydrological features': '水文地貌',
    'Philosophy: General': '哲学总论',
    'Philosophical branches and concepts': '哲学分支与概念',
    'Philosophy by region and period': '按地区与时期划分的哲学',
    'Abrahamic religions': '亚伯拉罕诸教',
    'East Asian religions': '东亚宗教',
    'Indian religions': '印度宗教',
    'Other religions': '其他宗教',
    'Specific languages': '具体语言',
    'Writing': '书写',
    'Specific organisms': '具体生物',
    'Anatomy': '解剖学',
    'Physiology': '生理学'
};
const CONTINENTS = [
    { id: 'natural-sciences', zh: '自然科学', en: 'Natural sciences', sections: ['Science', 'Mathematics'], color: 0x3b82f6 },
    { id: 'technology-engineering', zh: '技术工程', en: 'Technology and engineering', sections: ['Technology'], color: 0xa3e635 },
    { id: 'life-health', zh: '生命健康', en: 'Life and health', sections: ['Health, medicine and disease'], color: 0x22d3ee },
    { id: 'human-society', zh: '人类社会', en: 'Human society', sections: ['People', 'History', 'Society and social sciences', 'Everyday life'], color: 0xfb7185 },
    { id: 'humanities-arts', zh: '人文艺术', en: 'Humanities and arts', sections: ['Arts', 'Philosophy and religion'], color: 0x8b5cf6 },
    { id: 'earth-geography', zh: '地球地理', en: 'Earth and geography', sections: ['Geography'], color: 0x06b6d4 }
];
const CLAIM_PROPERTIES = {
    P31: '隶属于',
    P279: '上位类',
    P361: '属于',
    P527: '包含',
    P101: '研究领域',
    P106: '职业',
    P108: '雇主',
    P135: '运动',
    P737: '受其影响',
    P366: '用途',
    P2578: '研究主题',
    P3095: '实践者',
    P1343: '描述者',
    P921: '主要主题'
};

function log(message) {
    console.log(`[${((Date.now() - startedAt) / 1000).toFixed(1)}s] ${message}`);
}

function slug(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'section';
}

function escapeSparqlLiteral(value) {
    return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

function chunkArray(items, size) {
    const out = [];
    for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
    return out;
}

function cachePath(language, title) {
    const hash = crypto.createHash('sha1').update(`${language}:${title}`).digest('hex');
    return path.join(cacheDir, `${language}-${hash}.json`);
}

function readCache(language, title) {
    if (refresh) return null;
    try {
        return JSON.parse(fs.readFileSync(cachePath(language, title), 'utf8'));
    } catch {
        return null;
    }
}

function writeCache(language, title, data) {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachePath(language, title), JSON.stringify(data), 'utf8');
}

async function fetchPage(language, title) {
    const cached = readCache(language, title);
    if (cached) return cached;
    const page = await source.fetchWikipediaPage(language, title);
    const record = {
        language,
        requestedTitle: title,
        title: page.title,
        key: page.key || page.title,
        revision: page.latest?.id || '',
        timestamp: page.latest?.timestamp || '',
        source: page.source
    };
    writeCache(language, title, record);
    return record;
}

function articleUrl(language, key) {
    return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(key || '').replace(/ /g, '_'))}`;
}

/* ------------------------------------------------------------ source page */

async function readVitalPage() {
    const page = await fetchPage('en', vitalPageTitle);
    const lines = String(page.source || '').split('\n');
    const sections = [];
    let section = null;
    let subsection = null;
    let subsubsection = null;
    let started = false;
    for (const line of lines) {
        const heading = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
        if (heading) {
            const level = heading[1].length;
            const title = source.stripWikiMarkup(heading[2]).replace(/\s+/g, ' ').trim();
            if (level === 2) {
                started = true;
                section = { title, subsections: new Map(), links: [] };
                sections.push(section);
                subsection = null;
                subsubsection = null;
            } else if (level === 3 && section) {
                subsection = { title, links: [], subsubsections: new Map() };
                section.subsections.set(title, subsection);
                subsubsection = null;
            } else if (level === 4 && subsection) {
                subsubsection = { title, links: [] };
                subsection.subsubsections.set(title, subsubsection);
            }
            continue;
        }
        if (!started || !section || !/^\*/.test(line)) continue;
        const links = [...line.matchAll(/\[\[([^\[\]|#]+)(?:\|[^\[\]]*)?\]\]/g)]
            .map(match => source.normalizeWikiTitle(match[1]))
            .filter(source.isEncyclopedicTitle);
        if (!links.length) continue;
        const owner = subsubsection || subsection || section;
        for (const title of links) {
            owner.links.push(title);
        }
    }
    const sectionHasLinks = item =>
        item.links.length + [...item.subsections.values()].reduce((sum, sub) =>
            sum + sub.links.length + [...sub.subsubsections.values()].reduce((count, subsub) => count + subsub.links.length, 0), 0) > 0;
    return {
        page,
        sections: sections.filter(item => !STOP_SECTIONS.test(item.title) && sectionHasLinks(item))
    };
}

function chooseTitles(sections, limit) {
    const all = [];
    const seen = new Set();
    const perSection = sections.map(section => {
        const entries = [];
        const push = (title, sub, subsub) => {
            const key = title.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            entries.push({ title, subsection: sub, subsubsection: subsub || '' });
            all.push({ title, section: section.title, subsection: sub, subsubsection: subsub || '' });
        };
        for (const title of section.links) push(title, '', '');
        for (const [subTitle, sub] of section.subsections) {
            for (const title of sub.links) push(title, subTitle, '');
            for (const [subsubTitle, subsub] of sub.subsubsections) {
                for (const title of subsub.links) push(title, subTitle, subsubTitle);
            }
        }
        return { section, entries };
    });
    if (!limit || all.length <= limit) return all;
    const total = all.length;
    const selected = [];
    const quotas = perSection.map(item => Math.max(1, Math.round(limit * item.entries.length / total)));
    perSection.forEach((item, index) => {
        const quota = Math.min(item.entries.length, quotas[index]);
        if (!quota) return;
        const bySub = new Map();
        item.entries.forEach(entry => {
            const key = `${entry.subsection || ''}||${entry.subsubsection || ''}`;
            if (!bySub.has(key)) bySub.set(key, []);
            bySub.get(key).push(entry);
        });
        const groups = [...bySub.entries()];
        const totalEntries = groups.reduce((sum, entry) => sum + entry[1].length, 0);
        const targets = groups.map(([, entries]) => Math.max(1, Math.round(quota * entries.length / totalEntries)));
        let targetSum = targets.reduce((sum, value) => sum + value, 0);
        while (targetSum > quota) {
            let largest = 0;
            targets.forEach((value, targetIndex) => { if (value > targets[largest]) largest = targetIndex; });
            if (targets[largest] <= 1) break;
            targets[largest] -= 1;
            targetSum -= 1;
        }
        while (targetSum < quota) {
            let largest = 0;
            groups.forEach(([, entries], targetIndex) => {
                if (targets[targetIndex] < entries.length && targets[targetIndex] >= (targets[largest] || 0)) largest = targetIndex;
            });
            if (targets[largest] >= groups[largest][1].length) break;
            targets[largest] += 1;
            targetSum += 1;
        }
        groups.forEach(([subsection, entries], groupIndex) => {
            const target = Math.min(entries.length, targets[groupIndex]);
            if (!target) return;
            const picked = new Set();
            for (let pick = 0; pick < target; pick += 1) {
                let cursor = target === 1 ? 0 : Math.round(pick * (entries.length - 1) / (target - 1));
                while (picked.has(cursor) && cursor < entries.length - 1) cursor += 1;
                picked.add(cursor);
                const entry = entries[cursor];
                selected.push({ title: entry.title, section: item.section.title, subsection: entry.subsection, subsubsection: entry.subsubsection });
            }
        });
    });
    return selected.slice(0, limit);
}

// Core topics are a real-article coverage list, not generated knowledge.
// Every title is resolved through the same Wikipedia/Wikidata pipeline, so a
// typo or missing sitelink is dropped instead of becoming a fabricated node.
const CORE_TOPICS = [
    ['Quantum mechanics', 'Science'],
    ['Theory of relativity', 'Science'],
    ['Atom', 'Science'],
    ['Particle physics', 'Science'],
    ['DNA', 'Science'],
    ['Evolution', 'Science'],
    ['CRISPR', 'Science'],
    ['Gene', 'Science'],
    ['Protein', 'Science'],
    ['Cell (biology)', 'Science'],
    ['Photosynthesis', 'Science'],
    ['Neuron', 'Science'],
    ['Climate change', 'Science'],
    ['Plate tectonics', 'Science'],
    ['Black hole', 'Science'],
    ['Big Bang', 'Science'],
    ['Periodic table', 'Science'],
    ['Ecosystem', 'Science'],
    ['Biodiversity', 'Science'],
    ['Artificial intelligence', 'Technology'],
    ['Machine learning', 'Technology'],
    ['Quantum computing', 'Technology'],
    ['Semiconductor', 'Technology'],
    ['Lithium-ion battery', 'Technology'],
    ['Internet', 'Technology'],
    ['Computer', 'Technology'],
    ['Robot', 'Technology'],
    ['Nuclear power', 'Technology'],
    ['Solar energy', 'Technology'],
    ['Biotechnology', 'Technology'],
    ['Nanotechnology', 'Technology'],
    ['World War II', 'History'],
    ['World War I', 'History'],
    ['Cold War', 'History'],
    ['French Revolution', 'History'],
    ['Industrial Revolution', 'History'],
    ['Renaissance', 'History'],
    ['Roman Empire', 'History'],
    ['Silk Road', 'History'],
    ['Democracy', 'Society and social sciences'],
    ['Capitalism', 'Society and social sciences'],
    ['Globalization', 'Society and social sciences'],
    ['United Nations', 'Society and social sciences'],
    ['Human rights', 'Society and social sciences'],
    ['Economics', 'Society and social sciences'],
    ['Psychology', 'Society and social sciences'],
    ['Albert Einstein', 'People'],
    ['Isaac Newton', 'People'],
    ['Charles Darwin', 'People'],
    ['Ada Lovelace', 'People'],
    ['Alan Turing', 'People'],
    ['Marie Curie', 'People'],
    ['Earth', 'Geography'],
    ['Pacific Ocean', 'Geography'],
    ['Amazon rainforest', 'Geography'],
    ['Music', 'Arts'],
    ['Painting', 'Arts'],
    ['Film', 'Arts'],
    ['Vaccine', 'Health, medicine and disease'],
    ['Cancer', 'Health, medicine and disease'],
    ['Antibiotic', 'Health, medicine and disease'],
    ['Calculus', 'Mathematics'],
    ['Algebra', 'Mathematics'],
    ['Probability', 'Mathematics'],
    ['Statistics', 'Mathematics'],
    ['Geometry', 'Mathematics']
];

function addCoreTopics(selected) {
    const seen = new Set(selected.map(item => item.title.toLowerCase()));
    for (const [title, section] of CORE_TOPICS) {
        if (seen.has(title.toLowerCase())) continue;
        seen.add(title.toLowerCase());
        selected.push({ title, section, subsection: '', subsubsection: '' });
    }
    return selected;
}

/* ------------------------------------------------------- title resolution */

async function resolveTitles(titles) {
    const resolved = new Map();
    const batches = chunkArray([...new Set(titles)], 70);
    let index = 0;
    for (const batch of batches) {
        index += 1;
        const values = batch.map(title => `${escapeSparqlLiteral(title)}@en`).join(' ');
        const query = `SELECT ?title ?item WHERE {
  VALUES ?title { ${values} }
  ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
}`;
        try {
            const data = await source.sparql(query, { attempts: 3 });
            for (const row of source.sparqlRows(data)) {
                const title = row.title?.value || '';
                const qid = source.shortId(row.item?.value);
                if (!title || !qid) continue;
                const key = title.toLowerCase();
                if (!resolved.has(key)) resolved.set(key, qid);
            }
            log(`resolved titles ${index}/${batches.length} (${batch.length} titles)`);
        } catch (error) {
            log(`title batch ${index} failed: ${error.message}`);
        }
    }
    return resolved;
}

async function fetchEntities(qids) {
    const entities = {};
    for (const batch of chunkArray([...new Set(qids)], 45)) {
        try {
            Object.assign(entities, await source.fetchWikidataEntities(batch));
        } catch (error) {
            log(`entity batch failed (${batch.length}): ${error.message}`);
        }
    }
    return entities;
}

/* ------------------------------------------------------------- claims */

async function fetchClaims(qids) {
    const rows = [];
    for (const batch of chunkArray([...new Set(qids)], 120)) {
        const values = batch.map(qid => `wd:${qid}`).join(' ');
        const props = Object.keys(CLAIM_PROPERTIES).map(prop => `wdt:${prop}`).join(' ');
        const query = `SELECT ?item ?prop ?target ?targetLabel WHERE {
  VALUES ?item { ${values} }
  VALUES ?prop { ${props} }
  ?item ?prop ?target .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "zh-hans,zh,en". }
}`;
        try {
            const data = await source.sparql(query, { attempts: 3, timeoutMs: 70000 });
            rows.push(...source.sparqlRows(data));
            log(`claims batch ${batch.length} -> ${rows.length} rows`);
        } catch (error) {
            log(`claims batch failed (${batch.length}): ${error.message}`);
        }
    }
    return rows;
}

function buildClaims(rows) {
    const byNode = new Map();
    for (const row of rows) {
        const qid = source.shortId(row.item?.value);
        const target = source.shortId(row.target?.value);
        const prop = (row.prop?.value || '').split('/').pop();
        if (!qid || !target || !CLAIM_PROPERTIES[prop]) continue;
        if (!byNode.has(qid)) byNode.set(qid, new Map());
        const byProp = byNode.get(qid);
        if (!byProp.has(prop)) byProp.set(prop, new Map());
        const values = byProp.get(prop);
        if (!values.has(target)) {
            values.set(target, {
                id: target,
                label: row.targetLabel?.value || target
            });
        }
    }
    const out = new Map();
    for (const [qid, byProp] of byNode) {
        out.set(qid, [...byProp.entries()].map(([property, values]) => ({
            property,
            label: CLAIM_PROPERTIES[property],
            values: [...values.values()].slice(0, 24)
        })));
    }
    return out;
}

/* --------------------------------------------------------------- build */

function entityLabels(entity) {
    return {
        zh: entity?.labels?.zh?.value || '',
        zhHans: entity?.labels?.['zh-hans']?.value || '',
        en: entity?.labels?.en?.value || '',
        descriptionZh: entity?.descriptions?.zh?.value || '',
        descriptionZhHans: entity?.descriptions?.['zh-hans']?.value || '',
        descriptionEn: entity?.descriptions?.en?.value || '',
        zhTitle: entity?.sitelinks?.zhwiki?.title || '',
        enTitle: entity?.sitelinks?.enwiki?.title || ''
    };
}

function buildNode({ qid, title, section, subsection, subsubsection, entity, claims }) {
    const labels = entity
        ? entityLabels(entity)
        : { zh: '', zhHans: '', en: '', descriptionZh: '', descriptionZhHans: '', descriptionEn: '', zhTitle: '', enTitle: '' };
    const enTitle = labels.enTitle || title;
    const zhTitle = labels.zhTitle;
    const nameZh = simplifyChinese(labels.zhHans || labels.zh || zhTitle || '');
    const nameEn = labels.en || enTitle;
    const displayEn = nameEn ? `${nameEn.charAt(0).toUpperCase()}${nameEn.slice(1)}` : '';
    const displayName = [nameZh, displayEn].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).join(' ');
    const aliases = [...new Set([
        ...(entity?.aliases?.['zh-hans'] || []).map(item => simplifyChinese(item.value)),
        ...(entity?.aliases?.zh || []).map(item => simplifyChinese(item.value)),
        ...(entity?.aliases?.en || []).map(item => item.value),
        nameZh,
        simplifyChinese(labels.zh),
        labels.en
    ].filter(Boolean))].slice(0, 24);
    return {
        id: qid || `wiki:${slug(enTitle)}`,
        qid: qid || '',
        name: displayName || nameEn || nameZh,
        nameZh,
        nameEn,
        description: simplifyChinese(labels.descriptionZhHans || labels.descriptionZh || labels.descriptionEn || ''),
        descriptionEn: labels.descriptionEn || '',
        aliases,
        kind: 'entity',
        section,
        subsection: subsection || '',
        subsubsection: subsubsection || '',
        sectionId: subsubsection
            ? `section:${slug(section)}:${slug(subsection)}:${slug(subsubsection)}`
            : (subsection ? `section:${slug(section)}:${slug(subsection)}` : `section:${slug(section)}`),
        sourceTitles: { zh: zhTitle, en: enTitle },
        claims: claims || []
    };
}

function buildCategories(sections, nodes) {
    const categories = [];
    const bySection = new Map();
    for (const node of nodes) {
        if (!bySection.has(node.section)) bySection.set(node.section, []);
        bySection.get(node.section).push(node);
    }
    for (const section of sections) {
        const members = bySection.get(section.title) || [];
        if (!members.length) continue;
        const rootId = `section:${slug(section.title)}`;
        const rootZh = SECTION_LABELS[section.title] || section.title;
        categories.push({
            id: rootId,
            qid: '',
            name: `${rootZh} ${section.title}`.trim(),
            nameZh: rootZh,
            nameEn: section.title,
            description: `Wikipedia 三级重要条目 · ${section.title} 章节`,
            aliases: [],
            kind: 'category',
            section: section.title,
            subsection: '',
            subsubsection: '',
            sectionId: rootId,
            memberCount: members.length,
            sourceUrl: articleUrl('en', vitalPageTitle) + `#${encodeURIComponent(section.title.replace(/ /g, '_'))}`
        });

        const bySub = new Map();
        for (const member of members) {
            if (!member.subsection) {
                member.sectionId = rootId;
                continue;
            }
            if (!bySub.has(member.subsection)) bySub.set(member.subsection, []);
            bySub.get(member.subsection).push(member);
        }

        for (const [subTitle, subMembers] of bySub) {
            const bySubsub = new Map();
            for (const member of subMembers) {
                if (!member.subsubsection) continue;
                if (!bySubsub.has(member.subsubsection)) bySubsub.set(member.subsubsection, []);
                bySubsub.get(member.subsubsection).push(member);
            }
            const subZh = SUBSECTION_LABELS[subTitle] || subTitle;
            let subId = '';
            if (subMembers.length >= 2 || bySubsub.size) {
                subId = `${rootId}:${slug(subTitle)}`;
                categories.push({
                    id: subId,
                    qid: '',
                    name: `${subZh} ${subTitle}`.trim(),
                    nameZh: subZh,
                    nameEn: subTitle,
                    description: `Wikipedia 三级重要条目 · ${section.title} / ${subTitle}`,
                    aliases: [],
                    kind: 'category',
                    section: section.title,
                    subsection: subTitle,
                    subsubsection: '',
                    sectionId: rootId,
                    parentId: rootId,
                    memberCount: subMembers.length,
                    sourceUrl: articleUrl('en', vitalPageTitle) + `#${encodeURIComponent(subTitle.replace(/ /g, '_'))}`
                });
            }
            for (const [subsubTitle, subsubMembers] of bySubsub) {
                const subsubZh = SUBSUBSECTION_LABELS[subsubTitle] || subsubTitle;
                if (subId && subsubMembers.length >= 1) {
                    const subsubId = `${subId}:${slug(subsubTitle)}`;
                    categories.push({
                        id: subsubId,
                        qid: '',
                        name: `${subsubZh} ${subsubTitle}`.trim(),
                        nameZh: subsubZh,
                        nameEn: subsubTitle,
                        description: `Wikipedia 三级重要条目 · ${section.title} / ${subTitle} / ${subsubTitle}`,
                        aliases: [],
                        kind: 'category',
                        section: section.title,
                        subsection: subTitle,
                        subsubsection: subsubTitle,
                        sectionId: subId,
                        parentId: subId,
                        memberCount: subsubMembers.length,
                        sourceUrl: articleUrl('en', vitalPageTitle) + `#${encodeURIComponent(subsubTitle.replace(/ /g, '_'))}`
                    });
                    subsubMembers.forEach(member => { member.sectionId = subsubId; });
                } else {
                    subsubMembers.forEach(member => { member.sectionId = subId || rootId; });
                }
            }
            for (const member of subMembers) {
                if (member.subsubsection) continue;
                member.sectionId = subId || rootId;
            }
        }
    }

    const categoryById = new Map(categories.map(category => [category.id, category]));
    for (const continent of CONTINENTS) {
        const sectionCategories = continent.sections
            .map(section => categoryById.get(`section:${slug(section)}`))
            .filter(Boolean);
        if (!sectionCategories.length) continue;
        const continentId = `continent:${continent.id}`;
        categories.push({
            id: continentId,
            qid: '',
            name: `${continent.zh} ${continent.en}`,
            nameZh: continent.zh,
            nameEn: continent.en,
            description: `知识大陆 · ${continent.zh}`,
            aliases: [],
            kind: 'category',
            section: continent.en,
            subsection: '',
            subsubsection: '',
            sectionId: continentId,
            memberCount: sectionCategories.reduce((sum, category) => sum + (category.memberCount || 0), 0),
            color: continent.color
        });
        for (const sectionCategory of sectionCategories) {
            sectionCategory.parentId = continentId;
            sectionCategory.sectionId = continentId;
        }
    }
    return categories;
}

async function buildArticle(node) {
    const attempts = [];
    if (node.sourceTitles.zh) attempts.push(['zh', node.sourceTitles.zh]);
    if (node.sourceTitles.en) attempts.push(['en', node.sourceTitles.en]);
    if (!attempts.length) return null;
    const chunks = [];
    const wiki = {};
    for (const [language, title] of attempts) {
        if (language === 'en' && chunks.length && !bilingual) continue;
        let page;
        try {
            page = await fetchPage(language, title);
        } catch (error) {
            if (error.statusCode === 404) continue;
            throw error;
        }
        const sections = source.parseSections(page.source, { maxSections: 500, maxParagraphsPerSection: 500 });
        const languageChunks = source.chunkParagraphs(sections, { maxChars: 900, overlapChars: 120 });
        const selected = [];
        let chars = 0;
        const cap = maxCharsPerNode > 0 ? maxCharsPerNode : Infinity;
        for (const chunk of languageChunks) {
            if (chars >= cap) break;
            const remaining = cap - chars;
            if (chunk.text.length > remaining) {
                if (remaining < 220) break;
                const cut = chunk.text.slice(0, remaining);
                const boundary = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('！'), cut.lastIndexOf('？'), cut.lastIndexOf('. '));
                const text = (boundary > remaining * 0.7 ? cut.slice(0, boundary + 1) : cut).trim();
                if (text.length >= 80) {
                    selected.push({ heading: chunk.heading, text });
                    chars += text.length;
                }
                break;
            }
            selected.push({ heading: chunk.heading, text: chunk.text });
            chars += chunk.text.length;
        }
        if (!selected.length) continue;
        node._sources = node._sources || {};
        node._sources[language] = page.source;
        wiki[language] = {
            title: page.title,
            url: articleUrl(language, page.key || page.title),
            revision: page.revision,
            timestamp: page.timestamp,
            chars: selected.reduce((sum, item) => sum + item.text.length, 0)
        };
        selected.forEach((chunk, index) => {
            chunks.push({
                id: `${node.id}:${language}:${index}`,
                nodeId: node.id,
                lang: language,
                title: page.title,
                heading: chunk.heading,
                text: chunk.text,
                url: wiki[language].url,
                revision: page.revision,
                license: 'CC BY-SA 4.0'
            });
        });
        if (language === 'zh' && !bilingual) break;
    }
    if (!chunks.length) return null;
    node.wiki = wiki;
    node.chunks = chunks;
    return node;
}

function buildEdges(nodes, categories, claimsByNode, linkEdges) {
    const edges = [];
    const ids = new Set([...nodes.map(node => node.id), ...categories.map(node => node.id)]);
    const seen = new Set();
    const push = edge => {
        if (!edge.source || !edge.target || edge.source === edge.target) return;
        if (!ids.has(edge.source) || !ids.has(edge.target)) return;
        const key = `${edge.source}|${edge.target}|${edge.type}`;
        if (seen.has(key)) return;
        seen.add(key);
        edges.push(edge);
    };
    for (const category of categories) {
        if (category.parentId) {
            push({ source: category.parentId, target: category.id, type: 'section_contains', label: '章节包含', origin: 'wikipedia-section' });
        }
        for (const node of nodes) {
            if (node.sectionId !== category.id) continue;
            push({ source: category.id, target: node.id, type: 'section_contains', label: '章节包含', origin: 'wikipedia-section' });
        }
    }
    for (const node of nodes) {
        for (const claim of claimsByNode.get(node.id) || []) {
            for (const value of claim.values) {
                push({
                    source: node.id,
                    target: value.id,
                    type: `wikidata:${claim.property}`,
                    label: claim.label,
                    origin: 'wikidata-claim'
                });
            }
        }
    }
    for (const edge of linkEdges) push(edge);
    return edges;
}

async function main() {
    log('reading Wikipedia vital articles list');
    const { page, sections } = await readVitalPage();
    const baseSelection = chooseTitles(sections, nodeLimit);
    const selected = nodeLimit >= 100 ? addCoreTopics(baseSelection) : baseSelection;
    log(`source page ${page.title} revision ${page.revision}; selected ${selected.length} titles across ${sections.length} sections`);
    if (planOnly) {
        const counts = sections.map(section => {
            const count = selected.filter(item => item.section === section.title).length;
            return `${section.title}: ${count}`;
        });
        console.log(JSON.stringify({ total: selected.length, counts }, null, 2));
        return;
    }

    log('resolving titles through Wikidata sitelinks');
    const resolved = await resolveTitles([...selected.map(item => item.title), vitalPageTitle]);
    const unresolved = [];
    const resolvedRows = [];
    for (const item of selected) {
        const qid = resolved.get(item.title.toLowerCase());
        if (qid) resolvedRows.push({ ...item, qid });
        else unresolved.push(item);
    }
    log(`resolved ${resolvedRows.length}/${selected.length}; unresolved ${unresolved.length}`);

    // Redirects are not sitelinks. Resolve the canonical title for a bounded
    // number of misses, then retry the exact-title query once.
    if (unresolved.length) {
        const canonical = [];
        for (const item of unresolved.slice(0, 160)) {
            try {
                const fetched = await fetchPage('en', item.title);
                canonical.push({ ...item, title: fetched.title });
            } catch (error) {
                log(`unresolved page ${item.title}: ${error.message}`);
            }
        }
        const second = await resolveTitles(canonical.map(item => item.title));
        for (const item of canonical) {
            const qid = second.get(item.title.toLowerCase());
            if (qid) resolvedRows.push({ ...item, qid });
        }
        log(`redirect resolution recovered ${resolvedRows.length - (selected.length - unresolved.length)} nodes`);
    }

    const uniqueQids = [...new Set(resolvedRows.map(item => item.qid))];
    log(`fetching Wikidata labels/descriptions/aliases/sitelinks for ${uniqueQids.length} entities`);
    const entities = await fetchEntities(uniqueQids);

    const nodeMap = new Map();
    for (const item of resolvedRows) {
        if (nodeMap.has(item.qid)) continue;
        const node = buildNode({ ...item, entity: entities[item.qid] });
        nodeMap.set(item.qid, node);
    }
    let nodes = [...nodeMap.values()];
    log(`built ${nodes.length} entity nodes`);

    log('fetching Wikidata claims');
    const claimRows = await fetchClaims(nodes.map(node => node.qid).filter(Boolean));
    const claimsByNode = buildClaims(claimRows);
    for (const node of nodes) node.claims = claimsByNode.get(node.id) || [];

    log('fetching Wikipedia article text');
    const fetched = [];
    let index = 0;
    for (const node of nodes) {
        index += 1;
        try {
            const result = await buildArticle(node);
            if (result) fetched.push(result);
            else log(`no article text for ${node.name} (${node.qid})`);
        } catch (error) {
            log(`article failed for ${node.name}: ${error.message}`);
        }
        if (index % 10 === 0) log(`articles ${index}/${nodes.length}; kept ${fetched.length}; ${source.stats.requests} requests, ${source.stats.rateLimited} rate limits`);
    }

    nodes = fetched;
    const categories = buildCategories(sections, nodes);
    log(`kept ${nodes.length} entity nodes and ${categories.length} real section categories`);

    // Article hyperlinks are real relations between selected entities.
    const linkEdges = [];
    if (!skipLinks) {
        const titleToQid = new Map();
        for (const node of nodes) {
            if (node.sourceTitles.zh) titleToQid.set(`zh|${node.sourceTitles.zh.toLowerCase()}`, node.id);
            if (node.sourceTitles.en) titleToQid.set(`en|${node.sourceTitles.en.toLowerCase()}`, node.id);
            if (node.wiki?.zh?.title) titleToQid.set(`zh|${node.wiki.zh.title.toLowerCase()}`, node.id);
            if (node.wiki?.en?.title) titleToQid.set(`en|${node.wiki.en.title.toLowerCase()}`, node.id);
        }
        for (const node of nodes) {
            for (const [language, meta] of Object.entries(node.wiki || {})) {
                const raw = node._sources?.[language];
                if (!raw) continue;
                for (const title of source.parseWikiLinks(raw)) {
                    const target = titleToQid.get(`${language}|${title.toLowerCase()}`);
                    if (target && target !== node.id) {
                        linkEdges.push({
                            source: node.id,
                            target,
                            type: 'wiki_link',
                            label: '百科内链',
                            lang: language,
                            origin: 'wikipedia-hyperlink'
                        });
                    }
                }
            }
        }
        log(`resolved ${linkEdges.length} Wikipedia hyperlink relations`);
    }

    const edges = buildEdges(nodes, categories, new Map(nodes.map(node => [node.id, node.claims])), linkEdges);

    const documents = {};
    let chunkCount = 0;
    let charCount = 0;
    for (const node of nodes) {
        const byLanguage = {};
        for (const chunk of node.chunks || []) {
            if (!byLanguage[chunk.lang]) byLanguage[chunk.lang] = [];
            byLanguage[chunk.lang].push({ heading: chunk.heading, text: chunk.text });
            chunkCount += 1;
            charCount += chunk.text.length;
        }
        documents[node.id] = byLanguage;
        delete node.chunks;
        delete node._sources;
    }

    const outputNodes = [...categories, ...nodes].sort((left, right) => {
        const sectionOrder = sections.findIndex(section => section.title === left.section) - sections.findIndex(section => section.title === right.section);
        if (sectionOrder) return sectionOrder;
        if (left.kind !== right.kind) return left.kind === 'category' ? -1 : 1;
        if (left.subsection !== right.subsection) return String(left.subsection).localeCompare(String(right.subsection));
        return String(left.name).localeCompare(String(right.name));
    });

    const graph = {
        meta: {
            schemaVersion: 'world-graph-v2',
            builtAt: new Date().toISOString(),
            sourcePage: {
                title: page.title,
                url: articleUrl('en', page.key || page.title),
                revision: page.revision,
                timestamp: page.timestamp
            },
            sources: ['Wikipedia', 'Wikidata'],
            license: 'CC BY-SA 4.0',
            coreTopics: CORE_TOPICS.map(([title, section]) => ({ title, section })),
            nodeCount: nodes.length,
            categoryCount: categories.length,
            edgeCount: edges.length,
            chunkCount,
            charCount,
            corpus: {
                file: 'worldCorpus.bin',
                compression: 'gzip',
                documents: chunkCount,
                chars: charCount
            },
            languages: nodes.reduce((acc, node) => {
                for (const language of Object.keys(documents[node.id] || {})) acc[language] = (acc[language] || 0) + 1;
                return acc;
            }, {}),
            unresolvedTitles: unresolved.slice(0, 50).map(item => item.title),
            fetchStats: source.stats
        },
        nodes: outputNodes,
        edges,
        documents: {}
    };

    const corpus = {
        schemaVersion: 'world-corpus-v1',
        builtAt: graph.meta.builtAt,
        documents
    };
    const corpusPayload = zlib.gzipSync(Buffer.from(JSON.stringify(corpus), 'utf8'), { level: 9 });
    const corpusPath = path.join(directory, 'worldCorpus.bin');
    fs.writeFileSync(corpusPath, corpusPayload);
    graph.meta.corpus.bytes = corpusPayload.length;

    const header = '// Generated by compileWorldGraph.js from Wikipedia and Wikidata. Do not hand-edit.\n';
    const payload = pretty ? JSON.stringify(graph, null, 2) : JSON.stringify(graph);
    fs.writeFileSync(outputPath, `${header}window.WORLD_KNOWLEDGE_GRAPH = ${payload};\n`, 'utf8');
    const size = fs.statSync(outputPath).size;
    log(`wrote ${path.basename(outputPath)} (${(size / 1024 / 1024).toFixed(2)} MB) and ${path.basename(corpusPath)} (${(corpusPayload.length / 1024 / 1024).toFixed(2)} MB)`);
    log(JSON.stringify({
        nodes: graph.meta.nodeCount,
        categories: graph.meta.categoryCount,
        edges: graph.meta.edgeCount,
        chunks: graph.meta.chunkCount,
        chars: graph.meta.charCount,
        languages: graph.meta.languages,
        requests: source.stats.requests,
        rateLimited: source.stats.rateLimited,
        elapsedSec: Math.round((Date.now() - startedAt) / 1000)
    }, null, 2));
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exit(1);
});
