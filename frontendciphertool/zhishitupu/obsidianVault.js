// ========== Obsidian Vault 解析器 ==========
// 把 Obsidian 知识库（一堆 Markdown + [[双链]] + frontmatter）解析成知识图谱可用的节点/连线。
//
// 设计约束：
// 1. 纯函数，不碰 DOM、不碰 three.js，方便在 Node 里跑回归测试（见 obsidianVault.audit.js）。
// 2. 不做 YAML 全量解析（浏览器里没有 yaml 库）：支持标量、内联数组、缩进列表，嵌套对象按原文保留。
// 3. Obsidian 的文件名解析规则：先按完整路径匹配，再按文件名匹配；同名时优先同目录。
//
// 两种宿主环境共用：浏览器挂到 window.OBSIDIAN_VAULT，Node 走 module.exports。

(function (global) {
    'use strict';

    const NOTE_EXTS = new Set(['md', 'markdown']);
    const SKIP_DIRS = new Set(['.obsidian', '.git', '.trash', '.smart-env', '.stfolder', 'node_modules', '.svn', '.hg', '__pycache__']);
    const MAX_EXCERPT = 420;
    const MAX_RECORD_CONTENT = 2400;

    const MIME_BY_EXT = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
        svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif',
        pdf: 'application/pdf', canvas: 'application/json', base: 'text/plain',
        mp3: 'audio/mpeg', wav: 'audio/wav', mp4: 'video/mp4', webm: 'video/webm',
        csv: 'text/csv', json: 'application/json', txt: 'text/plain'
    };

    function normalizePath(value) {
        return String(value || '')
            .replace(/\\/g, '/')
            .replace(/\/{2,}/g, '/')
            .replace(/^\.\//, '')
            .replace(/\/$/, '')
            .trim();
    }

    function getExtension(name) {
        const base = String(name || '').split('/').pop() || '';
        const index = base.lastIndexOf('.');
        return index > 0 ? base.slice(index + 1).toLowerCase() : '';
    }

    function stripExtension(path) {
        const value = String(path || '');
        const index = value.lastIndexOf('.');
        const slash = value.lastIndexOf('/');
        return index > slash ? value.slice(0, index) : value;
    }

    function basename(path) {
        return String(path || '').split('/').pop() || '';
    }

    function dirname(path) {
        const parts = String(path || '').split('/');
        parts.pop();
        return parts.join('/');
    }

    function isHidden(part) {
        return part.startsWith('.') && part !== '.' && part !== '..';
    }

    function createEmptyIndex() {
        return { byPath: new Map(), byKey: new Map(), tags: new Map(), folders: new Set() };
    }

    // ---------- frontmatter ----------

    function coerceScalar(raw) {
        const value = String(raw == null ? '' : raw).trim();
        if (!value) return '';
        if ((value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
            (value.startsWith("'") && value.endsWith("'") && value.length > 1)) {
            return value.slice(1, -1);
        }
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null' || value === '~') return '';
        return value;
    }

    function splitInlineList(raw) {
        const inner = String(raw || '').trim().replace(/^\[/, '').replace(/\]$/, '');
        if (!inner) return [];
        const items = [];
        let buffer = '';
        let quote = '';
        for (const char of inner) {
            if (quote) {
                if (char === quote) quote = '';
                buffer += char;
                continue;
            }
            if (char === '"' || char === "'") {
                quote = char;
                buffer += char;
                continue;
            }
            if (char === ',') {
                items.push(buffer);
                buffer = '';
                continue;
            }
            buffer += char;
        }
        items.push(buffer);
        return items.map(item => coerceScalar(item)).filter(item => item !== '');
    }

    function parseFrontmatterBlock(lines) {
        const data = {};
        let currentKey = null;

        lines.forEach(line => {
            if (!line.trim()) return;
            const listMatch = line.match(/^\s*-\s+(.*)$/);
            if (listMatch && currentKey) {
                if (!Array.isArray(data[currentKey])) data[currentKey] = data[currentKey] ? [data[currentKey]] : [];
                data[currentKey].push(coerceScalar(listMatch[1]));
                return;
            }
            const pairMatch = line.match(/^([A-Za-z0-9_\-. ]+?)\s*:\s*(.*)$/);
            if (!pairMatch) return;
            const key = pairMatch[1].trim();
            const rest = pairMatch[2].trim();
            currentKey = key;
            if (!rest) {
                data[key] = '';
                return;
            }
            if (rest.startsWith('[')) {
                data[key] = splitInlineList(rest);
                return;
            }
            if (rest === '|' || rest === '>') {
                data[key] = '';
                return;
            }
            data[key] = coerceScalar(rest);
        });

        return data;
    }

    function splitFrontmatter(text) {
        const source = String(text == null ? '' : text).replace(/^\uFEFF/, '');
        const match = source.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
        if (!match) return { frontmatter: {}, body: source, hasFrontmatter: false };
        return {
            frontmatter: parseFrontmatterBlock(match[1].split(/\r?\n/)),
            body: source.slice(match[0].length),
            hasFrontmatter: true
        };
    }

    function frontmatterValues(frontmatter, keys) {
        const out = [];
        keys.forEach(key => {
            Object.keys(frontmatter).forEach(candidate => {
                if (candidate.toLowerCase() !== key) return;
                const value = frontmatter[candidate];
                if (Array.isArray(value)) out.push(...value.map(item => String(item)));
                else if (value) out.push(String(value));
            });
        });
        return out.map(item => item.trim()).filter(Boolean);
    }

    // ---------- 正文提取 ----------

    function stripCodeBlocks(body) {
        return String(body || '')
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/~~~[\s\S]*?~~~/g, ' ');
    }

    function stripInlineCode(body) {
        return String(body || '').replace(/`[^`\n]*`/g, ' ');
    }

    function extractWikilinks(body) {
        const results = [];
        const source = stripInlineCode(stripCodeBlocks(body));
        const pattern = /(!?)\[\[([^\[\]\n]+?)\]\]/g;
        let match;
        while ((match = pattern.exec(source))) {
            const embed = match[1] === '!';
            const inner = match[2].trim();
            if (!inner) continue;
            const pipeIndex = inner.indexOf('|');
            const beforeAlias = pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner;
            const alias = pipeIndex >= 0 ? inner.slice(pipeIndex + 1).trim() : '';
            const hashIndex = beforeAlias.indexOf('#');
            const target = (hashIndex >= 0 ? beforeAlias.slice(0, hashIndex) : beforeAlias).trim();
            const anchor = hashIndex >= 0 ? beforeAlias.slice(hashIndex + 1).trim() : '';
            if (!target && !anchor) continue;
            results.push({
                raw: match[0],
                target: target || '',
                anchor,
                alias,
                embed,
                display: alias || target || anchor
            });
        }
        return results;
    }

    function extractMarkdownLinks(body) {
        const results = [];
        const source = stripInlineCode(stripCodeBlocks(body));
        const pattern = /\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
        let match;
        while ((match = pattern.exec(source))) {
            const href = match[2].trim();
            if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) continue;
            if (href.startsWith('//')) continue;
            results.push({
                raw: match[0],
                target: decodeURIComponent(href.split('#')[0]),
                anchor: href.includes('#') ? href.split('#').slice(1).join('#') : '',
                alias: match[1].trim(),
                embed: false,
                display: match[1].trim()
            });
        }
        return results;
    }

    function extractTags(body, frontmatter) {
        const tags = new Set();
        frontmatterValues(frontmatter, ['tags', 'tag', 'keywords'])
            .flatMap(value => String(value).split(/[,;]/))
            .map(value => value.trim().replace(/^#/, ''))
            .filter(Boolean)
            .forEach(value => tags.add(value));

        const source = stripInlineCode(stripCodeBlocks(body)).replace(/```[\s\S]*?```/g, ' ');
        const pattern = /(^|[\s([{（，。；：、])#([A-Za-z0-9_\-/\u4e00-\u9fff][A-Za-z0-9_\-/\u4e00-\u9fff]*)/gm;
        let match;
        while ((match = pattern.exec(source))) {
            const tag = match[2].replace(/[.,;:]+$/, '');
            if (!tag || /^\d+$/.test(tag)) continue;
            tags.add(tag);
        }
        return [...tags];
    }

    function toExcerpt(body) {
        const cleaned = stripInlineCode(stripCodeBlocks(body))
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/!\[\[([^\[\]]+?)\]\]/g, '')
            .replace(/\[\[([^\[\]|]+?)\|([^\[\]]+?)\]\]/g, '$2')
            .replace(/\[\[([^\[\]]+?)\]\]/g, '$1')
            .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/^\s*>\s?\[![^\]]*\][-+]?\s*/gm, '')
            .replace(/^\s*>\s?/gm, '')
            .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
            .replace(/\|/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return cleaned.length > MAX_EXCERPT ? `${cleaned.slice(0, MAX_EXCERPT)}...` : cleaned;
    }

    function countWords(body) {
        const cleaned = stripInlineCode(stripCodeBlocks(body)).replace(/\s+/g, '');
        return cleaned.length;
    }

    // ---------- 检测 ----------

    function detectVault(files, options) {
        const opts = options || {};
        const list = (files || [])
            .map(file => normalizePath(file && (file.path || file.webkitRelativePath)))
            .filter(Boolean);
        const noteFiles = list.filter(path => NOTE_EXTS.has(getExtension(path)));
        const hasObsidianDir = list.some(path => path.split('/').includes('.obsidian'));
        const ratio = list.length ? noteFiles.length / list.length : 0;
        const minNotes = Number.isFinite(opts.minNotes) ? opts.minNotes : 8;
        const minRatio = Number.isFinite(opts.minRatio) ? opts.minRatio : 0.5;
        const isVault = hasObsidianDir || (noteFiles.length >= minNotes && ratio >= minRatio);
        return {
            isVault,
            reason: hasObsidianDir ? 'obsidian-config-detected'
                : (noteFiles.length >= minNotes && ratio >= minRatio) ? 'markdown-dominant'
                    : 'folder-tree',
            noteCount: noteFiles.length,
            fileCount: list.length,
            noteRatio: ratio
        };
    }

    // ---------- 解析 ----------

    function parseVaultFiles(entries, options) {
        const opts = options || {};
        const records = [];
        let skippedFiles = 0;

        (entries || []).forEach(entry => {
            const path = normalizePath(entry && (entry.path || entry.webkitRelativePath));
            if (!path) return;
            const parts = path.split('/').filter(Boolean);
            if (parts.some(part => SKIP_DIRS.has(part)) || parts.some(isHidden)) {
                skippedFiles += 1;
                return;
            }
            records.push({
                path,
                parts,
                ext: getExtension(path),
                text: typeof (entry && entry.text) === 'string' ? entry.text : null,
                size: Number(entry && entry.size) || 0
            });
        });

        const rootNames = new Map();
        records.forEach(record => {
            const root = record.parts[0] || '';
            rootNames.set(root, (rootNames.get(root) || 0) + 1);
        });
        let rootName = opts.vaultName || '';
        if (!rootName && rootNames.size) {
            rootName = [...rootNames.entries()].sort((a, b) => b[1] - a[1])[0][0];
        }

        // 浏览器 FileList 的顺序没有保证，而同名笔记消歧依赖索引顺序，所以这里按路径排序保证确定性
        records.sort((a, b) => (a.path < b.path ? -1 : (a.path > b.path ? 1 : 0)));

        const notes = [];
        const attachments = [];
        const byPath = new Map();
        const byKey = new Map();
        const byTitle = new Map();

        records.forEach(record => {
            const vaultPath = record.parts.length > 1 && record.parts[0] === rootName
                ? record.parts.slice(1).join('/')
                : record.parts.join('/');
            const folder = dirname(vaultPath);
            if (NOTE_EXTS.has(record.ext)) {
                const parsed = splitFrontmatter(record.text || '');
                const title = String(parsed.frontmatter.title || '').trim() || stripExtension(basename(vaultPath));
                const aliases = frontmatterValues(parsed.frontmatter, ['aliases', 'alias']);
                const wikilinks = extractWikilinks(parsed.body);
                const markdownLinks = extractMarkdownLinks(parsed.body);
                const note = {
                    path: record.path,
                    vaultPath,
                    folder,
                    ext: record.ext,
                    title,
                    aliases,
                    tags: extractTags(parsed.body, parsed.frontmatter),
                    frontmatter: parsed.frontmatter,
                    hasFrontmatter: parsed.hasFrontmatter,
                    kgNode: frontmatterValues(parsed.frontmatter, ['kg_node', 'kgnode', 'kg-node'])[0] || '',
                    headings: (parsed.body.match(/^#{1,6}\s+(.+)$/gm) || [])
                        .map(line => line.replace(/^#{1,6}\s+/, '').trim()).filter(Boolean).slice(0, 24),
                    excerpt: toExcerpt(parsed.body),
                    wordCount: countWords(parsed.body),
                    size: record.size,
                    outRefs: [...wikilinks, ...markdownLinks],
                    outLinks: [],
                    inLinks: [],
                    embedCount: wikilinks.filter(item => item.embed).length,
                    hasText: typeof record.text === 'string'
                };
                notes.push(note);
                byPath.set(stripExtension(vaultPath).toLowerCase(), note);
                const keys = [stripExtension(basename(vaultPath)).toLowerCase(), ...aliases.map(alias => alias.toLowerCase())];
                keys.forEach(key => {
                    if (!key) return;
                    if (!byKey.has(key)) byKey.set(key, []);
                    /* eslint-disable-next-line no-unused-expressions */
                    byKey.get(key).push(note);
                });
                // frontmatter title 单独作为兜底索引：Obsidian 本身只按文件名/别名解析，
                // 但机器生成的 vault（如维基数据导出）文件名未必等于标题，留一层兜底更实用。
                const titleKey = title.toLowerCase();
                if (titleKey && titleKey !== stripExtension(basename(vaultPath)).toLowerCase()) {
                    if (!byTitle.has(titleKey)) byTitle.set(titleKey, []);
                    byTitle.get(titleKey).push(note);
                }
            } else {
                attachments.push({
                    path: record.path,
                    vaultPath,
                    folder,
                    ext: record.ext,
                    name: basename(vaultPath),
                    mime: MIME_BY_EXT[record.ext] || '',
                    size: record.size,
                    inLinks: [],
                    referenced: false
                });
            }
        });

        const attachmentByPath = new Map(attachments.map(item => [stripExtension(item.vaultPath).toLowerCase(), item]));
        const attachmentByKey = new Map();
        attachments.forEach(item => {
            const key = stripExtension(basename(item.vaultPath)).toLowerCase();
            if (!attachmentByKey.has(key)) attachmentByKey.set(key, []);
            attachmentByKey.get(key).push(item);
        });

        const hintFor = note => note.folder.split('/').pop() || '';

        function resolveRef(ref, note) {
            const raw = stripExtension(normalizePath(ref.target).replace(/^\.\//, '')).toLowerCase();
            const key = raw.split('/').pop();
            const inSameFolder = list => list.find(item => (item.folder || '') === note.folder) || list[0];

            if (byPath.has(raw)) return { note: byPath.get(raw), ambiguous: false };
            if (attachmentByPath.has(raw)) return { attachment: attachmentByPath.get(raw), ambiguous: false };
            if (raw.includes('/')) {
                const byFolderPath = [...byPath.values()].find(item => item.vaultPath.toLowerCase() === raw
                    || item.vaultPath.toLowerCase().endsWith(`/${raw}`));
                if (byFolderPath) return { note: byFolderPath, ambiguous: false };
                const byFolderAttachment = [...attachmentByPath.values()].find(item => item.vaultPath.toLowerCase() === raw
                    || item.vaultPath.toLowerCase().endsWith(`/${raw}`));
                if (byFolderAttachment) return { attachment: byFolderAttachment, ambiguous: false };
            }
            if (byKey.has(key)) {
                const list = byKey.get(key);
                const picked = inSameFolder(list);
                return { note: picked, ambiguous: list.length > 1 };
            }
            if (byTitle.has(key)) {
                const list = byTitle.get(key);
                const picked = inSameFolder(list);
                return { note: picked, ambiguous: list.length > 1 };
            }
            if (attachmentByKey.has(key)) {
                const list = attachmentByKey.get(key);
                return { attachment: inSameFolder(list), ambiguous: list.length > 1 };
            }
            return { hint: hintFor(note) };
        }

        const links = [];
        const unresolved = [];
        let ambiguousLinks = 0;
        let selfLinkCount = 0;
        const seenEdge = new Set();

        notes.forEach(note => {
            note.outRefs.forEach(ref => {
                const resolved = resolveRef(ref, note);
                if (resolved.note) {
                    // 指向自己的引用既不是出链也不是反链，也不该在图上画自环
                    if (resolved.note.vaultPath === note.vaultPath) {
                        selfLinkCount += 1;
                        return;
                    }
                    note.outLinks.push(resolved.note.vaultPath);
                    resolved.note.inLinks.push(note.vaultPath);
                    const edgeKey = `${note.vaultPath}->${resolved.note.vaultPath}`;
                    if (!seenEdge.has(edgeKey)) {
                        seenEdge.add(edgeKey);
                        links.push({
                            sourcePath: note.vaultPath,
                            targetPath: resolved.note.vaultPath,
                            kind: ref.embed ? 'embed' : 'wikilink',
                            anchor: ref.anchor || '',
                            display: ref.display || resolved.note.title,
                            raw: ref.raw
                        });
                    }
                    if (resolved.ambiguous) ambiguousLinks += 1;
                    return;
                }
                if (resolved.attachment) {
                    resolved.attachment.referenced = true;
                    resolved.attachment.inLinks.push(note.vaultPath);
                    const edgeKey = `${note.vaultPath}=>${resolved.attachment.vaultPath}`;
                    if (!seenEdge.has(edgeKey)) {
                        seenEdge.add(edgeKey);
                        links.push({
                            sourcePath: note.vaultPath,
                            targetPath: resolved.attachment.vaultPath,
                            kind: 'attachment',
                            anchor: ref.anchor || '',
                            display: ref.display || resolved.attachment.name,
                            raw: ref.raw
                        });
                    }
                    return;
                }
                unresolved.push({
                    from: note.vaultPath,
                    target: ref.target || ref.anchor || '',
                    raw: ref.raw,
                    embed: Boolean(ref.embed)
                });
            });
        });

        notes.forEach(note => {
            note.outLinks = [...new Set(note.outLinks)];
            note.inLinks = [...new Set(note.inLinks)];
        });

        const folders = new Set();
        notes.forEach(note => {
            if (!note.folder) return;
            const parts = note.folder.split('/');
            parts.forEach((_, index) => folders.add(parts.slice(0, index + 1).join('/')));
        });

        const tagCounts = new Map();
        notes.forEach(note => note.tags.forEach(tag => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));

        const referencedAttachments = attachments.filter(item => item.referenced);
        const index = createEmptyIndex();
        byPath.forEach((value, key) => index.byPath.set(key, value));
        byKey.forEach((value, key) => index.byKey.set(key, value));
        tagCounts.forEach((value, key) => index.tags.set(key, value));
        folders.forEach(value => index.folders.add(value));

        return {
            name: rootName || 'Obsidian Vault',
            notes,
            attachments,
            referencedAttachments,
            links,
            unresolved,
            index,
            stats: {
                fileCount: (entries || []).length,
                skippedFiles,
                noteCount: notes.length,
                attachmentCount: referencedAttachments.length,
                ignoredAttachmentCount: attachments.length - referencedAttachments.length,
                folderCount: folders.size,
                linkCount: links.length,
                embedLinkCount: links.filter(item => item.kind === 'embed').length,
                attachmentLinkCount: links.filter(item => item.kind === 'attachment').length,
                ambiguousLinks,
                unresolvedCount: unresolved.length,
                selfLinkCount,
                orphanCount: notes.filter(note => !note.inLinks.length && !note.outLinks.length).length,
                tagCount: tagCounts.size,
                missingTextCount: notes.filter(note => !note.hasText).length,
                topTags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag, count]) => ({ tag, count })),
                orphanRatio: notes.length ? notes.filter(note => !note.inLinks.length && !note.outLinks.length).length / notes.length : 0,
                avgInLinks: notes.length ? notes.reduce((sum, note) => sum + note.inLinks.length, 0) / notes.length : 0
            }
        };
    }

    // ---------- 转成 graphData 可消费的树 ----------

    function buildNoteRecords(note) {
        const records = [{
            id: 'vault-note',
            title: '笔记正文',
            content: note.excerpt || '（空笔记）',
            keywords: [note.title, ...note.aliases].filter(Boolean),
            source: 'Obsidian Vault',
            url: '',
            quality: { level: 'vault', facet: 'definition', evidenceRequired: false }
        }, {
            id: 'vault-outline',
            title: '结构、属性与标签',
            content: [
                `Vault 路径: ${note.vaultPath}`,
                `标题: ${note.title}`,
                note.aliases.length ? `别名: ${note.aliases.join('；')}` : '别名: 无',
                note.tags.length ? `标签: ${note.tags.map(tag => `#${tag}`).join(' ')}` : '标签: 无',
                note.headings.length ? `标题大纲: ${note.headings.slice(0, 12).join(' / ')}` : '标题大纲: 无',
                note.kgNode ? `骨架节点映射 (kg_node): ${note.kgNode}` : '',
                Object.keys(note.frontmatter).length
                    ? `Frontmatter: ${Object.entries(note.frontmatter).map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : value}`).join(' | ')}`
                    : 'Frontmatter: 无',
                `字数约: ${note.wordCount}`
            ].filter(Boolean).join('\n').slice(0, MAX_RECORD_CONTENT),
            keywords: [...note.tags, ...note.aliases].slice(0, 16),
            source: 'Obsidian Vault',
            url: '',
            quality: { level: 'vault', facet: 'definition', evidenceRequired: false }
        }, {
            id: 'vault-links',
            title: '双向链接（出链 / 反链）',
            content: [
                `出链 ${note.outLinks.length} 条: ${note.outLinks.slice(0, 24).join('；') || '无'}`,
                `反链 ${note.inLinks.length} 条: ${note.inLinks.slice(0, 24).join('；') || '无'}`,
                note.embedCount ? `嵌入引用: ${note.embedCount} 处` : '',
                '说明: 本记录来自 Obsidian 库内的 [[双链]] 解析，反映的是笔记作者建立的关联，不等同于权威事实证据。'
            ].filter(Boolean).join('\n').slice(0, MAX_RECORD_CONTENT),
            keywords: ['wikilink', 'backlink', 'obsidian'].concat(note.tags.slice(0, 8)),
            source: 'Obsidian Vault',
            url: '',
            quality: { level: 'vault', facet: 'definition', evidenceRequired: false }
        }];
        return records;
    }

    function buildVaultTree(vault, options) {
        const opts = options || {};
        const includeAttachments = opts.includeAttachments !== false;
        const wanted = new Set(vault.notes.map(note => note.path));
        if (includeAttachments) vault.referencedAttachments.forEach(item => wanted.add(item.path));

        const root = {
            name: vault.name,
            kind: 'directory',
            path: vault.name,
            childGroup: 'category',
            children: {}
        };

        function folderNode(path) {
            if (!path) return root;
            const parts = path.split('/');
            let cursor = root;
            let walked = '';
            parts.forEach(part => {
                walked = walked ? `${walked}/${part}` : part;
                const key = `dir:${part}`;
                if (!cursor.children[key]) {
                    cursor.children[key] = {
                        name: part,
                        kind: 'directory',
                        path: `${vault.name}/${walked}`,
                        childGroup: 'category',
                        children: {}
                    };
                }
                cursor = cursor.children[key];
            });
            return cursor;
        }

        vault.notes.forEach(note => {
            const parent = folderNode(note.folder);
            const degree = note.inLinks.length + note.outLinks.length;
            parent.children[`note:${note.vaultPath}`] = {
                name: note.title,
                kind: 'file',
                path: note.path,
                ext: note.ext,
                mime: 'text/markdown',
                val: Math.max(4, Math.min(42, 4 + degree * 1.8)),
                description: note.excerpt.slice(0, 200),
                source: 'Obsidian',
                childGroup: 'classic',
                knowledgeBase: buildNoteRecords(note),
                vaultPath: note.vaultPath,
                vaultTags: note.tags,
                vaultAliases: note.aliases,
                vaultOutLinks: note.outLinks,
                vaultInLinks: note.inLinks,
                vaultDegree: degree,
                vaultKgNode: note.kgNode,
                vaultFolder: note.folder,
                isVaultNote: true
            };
        });

        if (includeAttachments) {
            vault.referencedAttachments.forEach(item => {
                const parent = folderNode(item.folder);
                parent.children[`file:${item.vaultPath}`] = {
                    name: item.name,
                    kind: 'file',
                    path: item.path,
                    ext: item.ext,
                    mime: item.mime,
                    val: 3,
                    description: `被 ${item.inLinks.length} 篇笔记引用的附件。`,
                    source: 'Obsidian',
                    childGroup: 'logic',
                    vaultPath: item.vaultPath,
                    vaultInLinks: item.inLinks,
                    isVaultAttachment: true
                };
            });
        }

        function toArray(node) {
            if (!node.children || typeof node.children !== 'object') return node;
            const children = Object.values(node.children)
                .map(toArray)
                .sort((a, b) => {
                    const aDir = a.children ? 0 : 1;
                    const bDir = b.children ? 0 : 1;
                    if (aDir !== bDir) return aDir - bDir;
                    return String(a.name).localeCompare(String(b.name), 'zh-CN');
                });
            node.children = children;
            return node;
        }

        const tree = toArray(root);
        tree.__wanted = wanted;
        return tree;
    }

    const api = {
        NOTE_EXTS,
        SKIP_DIRS,
        normalizePath,
        getExtension,
        splitFrontmatter,
        parseFrontmatterBlock,
        extractWikilinks,
        extractMarkdownLinks,
        extractTags,
        toExcerpt,
        detectVault,
        parseVaultFiles,
        buildVaultTree,
        buildNoteRecords,
        vaultSummary: vault => {
            const stats = vault.stats || {};
            return [
                `笔记 ${stats.noteCount || 0}`,
                `双链 ${stats.linkCount || 0}`,
                `附件 ${stats.attachmentCount || 0}`,
                `孤立笔记 ${stats.orphanCount || 0}`,
                `未解析链接 ${stats.unresolvedCount || 0}`
            ].join(' · ');
        }
    };

    global.OBSIDIAN_VAULT = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
