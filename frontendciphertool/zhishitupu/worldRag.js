/* Local retrieval over the world knowledge graph.
 *
 * The index is built in the browser from window.WORLD_KNOWLEDGE_GRAPH. It does
 * not call a model, an embedding API or a search API: every result is a
 * verbatim Wikipedia passage stored in the generated graph data.
 *
 * Retrieval stack:
 *   1. CJK bigram + Latin word tokenisation (no external segmenter)
 *   2. BM25F-style field weighting (title x3, heading x2, body x1)
 *   3. Wikidata label/alias entity linking
 *   4. One-hop graph query expansion over real Wikidata/hyperlink edges
 *   5. Pseudo-relevance feedback (Rocchio-style term expansion)
 *   6. MMR diversification and sentence-level citation snippets
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = { createWorldRag: factory };
    } else {
        root.WORLD_RAG = factory(root.WORLD_KNOWLEDGE_GRAPH || null);
    }
})(typeof window !== 'undefined' ? window : globalThis, function createWorldRag(graph) {
    'use strict';

    const VERSION = 'world-rag-v1';
    const BM25_K1 = 1.28;
    const BM25_B = 0.74;
    const MMR_LAMBDA = 0.82;
    const MAX_CANDIDATES = 48;

    const STOPWORDS = new Set([
        'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'were',
        'be', 'been', 'by', 'as', 'at', 'from', 'that', 'this', 'these', 'those', 'it', 'its', 'into',
        'about', 'which', 'who', 'what', 'when', 'where', 'how', 'why', 'can', 'could', 'would', 'should',
        '的', '了', '和', '与', '及', '在', '是', '有', '為', '为', '對', '对', '中', '上', '下', '個', '个',
        '這', '这', '那', '什麼', '什么', '如何', '為什麼', '为什么', '哪些', '以及', '一個', '一个'
    ]);

    const state = {
        graph: null,
        nodes: [],
        nodeById: new Map(),
        chunks: [],
        postings: new Map(),
        docLengths: null,
        avgdl: 1,
        ready: false,
        builtAt: 0,
        buildMs: 0,
        edgesByNode: new Map(),
        chunksByNode: new Map(),
        aliasIndex: []
    };

    function normalize(value) {
        return String(value || '').normalize('NFKC').toLowerCase();
    }

    function compact(value) {
        return normalize(value).replace(/[\s\u3000]+/g, '').replace(/[^\w\u4e00-\u9fff]+/g, '');
    }

    function hasCjk(value) {
        return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(String(value || ''));
    }

    function stemEnglish(word) {
        let value = word;
        if (value.length > 4 && value.endsWith('ies')) return `${value.slice(0, -3)}y`;
        if (value.length > 4 && value.endsWith('ses')) return value.slice(0, -2);
        if (value.length > 3 && value.endsWith('s') && !value.endsWith('ss')) return value.slice(0, -1);
        if (value.length > 5 && value.endsWith('ing')) return value.slice(0, -3);
        if (value.length > 4 && value.endsWith('ed')) return value.slice(0, -2);
        return value;
    }

    function tokenize(value) {
        const text = normalize(value);
        const tokens = [];
        const latin = text.match(/[a-z][a-z0-9][a-z0-9.+#_-]*/g) || [];
        for (const word of latin) {
            if (STOPWORDS.has(word)) continue;
            const stem = stemEnglish(word);
            if (stem.length >= 2 && !STOPWORDS.has(stem)) tokens.push(`w:${stem}`);
        }
        const runs = text.match(/[\u3400-\u4dbf\u4e00-\u9fff]+/g) || [];
        for (const run of runs) {
            if (run.length === 1) {
                if (!STOPWORDS.has(run)) tokens.push(`c:${run}`);
                continue;
            }
            for (let index = 0; index < run.length - 1; index += 1) {
                const bigram = run.slice(index, index + 2);
                if (STOPWORDS.has(bigram)) continue;
                tokens.push(`c:${bigram}`);
            }
        }
        return tokens;
    }

    function uniqueTokens(value) {
        return [...new Set(tokenize(value))];
    }

    function textTokens(value) {
        return new Set(tokenize(value));
    }

    function jaccard(left, right) {
        const a = typeof left === 'string' ? textTokens(left) : left;
        const b = typeof right === 'string' ? textTokens(right) : right;
        if (!a.size || !b.size) return 0;
        let intersection = 0;
        a.forEach(token => { if (b.has(token)) intersection += 1; });
        return intersection / (a.size + b.size - intersection);
    }

    function edgeTypeIsTopic(edge) {
        return edge.type !== 'section_contains';
    }

    function prepare() {
        if (state.ready) return state;
        if ((!graph || !Array.isArray(graph.nodes)) && typeof window !== 'undefined') {
            graph = window.WORLD_KNOWLEDGE_GRAPH || graph;
        }
        if (!graph || !Array.isArray(graph.nodes)) throw new Error('world knowledge graph data is not loaded');
        if (!graph.documents || !Object.keys(graph.documents).length) throw new Error('world knowledge corpus is not loaded');
        const startedAt = Date.now();
        state.graph = graph;
        state.nodes = graph.nodes || [];
        state.nodeById = new Map(state.nodes.map(node => [node.id, node]));
        state.edgesByNode = new Map();
        for (const edge of graph.edges || []) {
            if (!edge.source || !edge.target) continue;
            if (!state.edgesByNode.has(edge.source)) state.edgesByNode.set(edge.source, []);
            if (!state.edgesByNode.has(edge.target)) state.edgesByNode.set(edge.target, []);
            if (edgeTypeIsTopic(edge)) {
                state.edgesByNode.get(edge.source).push({ id: edge.target, type: edge.type, label: edge.label, direction: 'out' });
                state.edgesByNode.get(edge.target).push({ id: edge.source, type: edge.type, label: edge.label, direction: 'in' });
            }
        }

        const documents = graph.documents || {};
        for (const node of state.nodes) {
            if (node.kind === 'category' || node.kind === 'root') continue;
            const byLanguage = documents[node.id] || {};
            for (const [language, docs] of Object.entries(byLanguage)) {
                const wiki = node.wiki?.[language] || {};
                docs.forEach((doc, index) => {
                    state.chunks.push({
                        index: state.chunks.length,
                        id: `${node.id}:${language}:${index}`,
                        nodeId: node.id,
                        nodeName: node.name,
                        nodeNameEn: node.nameEn || '',
                        qid: node.qid || '',
                        lang: language,
                        title: wiki.title || node.name,
                        heading: doc.heading || '',
                        text: doc.text || '',
                        url: wiki.url || node.sourceUrl || '',
                        revision: wiki.revision || '',
                        license: 'CC BY-SA 4.0',
                        _compactText: compact(doc.text || ''),
                        _compactTitle: compact(wiki.title || node.name),
                        _compactHeading: compact(doc.heading || ''),
                        _tokenSet: textTokens(doc.text || '')
                    });
                });
            }
        }

        state.docLengths = new Int32Array(state.chunks.length);
        let totalLength = 0;
        state.chunks.forEach((chunk, chunkIndex) => {
            if (!state.chunksByNode.has(chunk.nodeId)) state.chunksByNode.set(chunk.nodeId, []);
            state.chunksByNode.get(chunk.nodeId).push(chunkIndex);
            const tokens = [];
            for (const token of tokenize(chunk.title)) { tokens.push(token, token, token); }
            for (const token of tokenize(chunk.heading)) { tokens.push(token, token); }
            tokens.push(...tokenize(chunk.text));
            state.docLengths[chunkIndex] = tokens.length;
            totalLength += tokens.length;
            const frequencies = new Map();
            for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
            for (const [token, frequency] of frequencies) {
                let postings = state.postings.get(token);
                if (!postings) { postings = []; state.postings.set(token, postings); }
                postings.push(chunkIndex, frequency);
            }
        });
        state.avgdl = state.chunks.length ? totalLength / state.chunks.length : 1;

        // Entity alias table for linking query words to graph nodes. Category
        // nodes are structural and deliberately excluded.
        for (const node of state.nodes) {
            if (node.kind === 'category' || node.kind === 'root') continue;
            const aliases = new Set([
                node.name, node.nameEn,
                ...(node.aliases || []),
                node.sourceTitles?.zh, node.sourceTitles?.en
            ].filter(Boolean));
            for (const alias of aliases) {
                const normalized = normalize(alias).trim();
                if (normalized.length < 1 || normalized.length > 80) continue;
                state.aliasIndex.push({ nodeId: node.id, alias: normalized, compact: compact(alias) });
            }
        }
        state.ready = true;
        state.builtAt = Date.now();
        state.buildMs = state.builtAt - startedAt;
        return state;
    }

    function findSeeds(query, limit = 6) {
        prepare();
        const queryNormalized = normalize(query);
        const queryCompact = compact(query);
        const queryTokens = new Set(tokenize(query));
        if (!queryCompact) return [];
        const scored = new Map();
        for (const entry of state.aliasIndex) {
            if (!entry.alias || entry.alias.length > queryNormalized.length + 8) continue;
            if (entry.compact.length === 1 && queryCompact !== entry.compact) continue;
            const latinAlias = /^[a-z0-9][a-z0-9 .+#_-]*$/i.test(entry.alias);
            let hit = false;
            let score = 0;
            if (latinAlias) {
                const escaped = entry.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(queryNormalized)) {
                    hit = true;
                    score += Math.min(6, entry.alias.length * 0.3);
                }
            } else if (entry.compact && queryCompact.includes(entry.compact)) {
                hit = true;
                score += Math.min(8, entry.compact.length * 0.22);
                if (queryCompact === entry.compact) score += 6;
            }
            if (!hit) {
                const aliasTokens = tokenize(entry.alias);
                if (aliasTokens.length >= 2) {
                    const overlap = aliasTokens.filter(token => queryTokens.has(token)).length / aliasTokens.length;
                    if (overlap >= 0.6) {
                        hit = true;
                        score += overlap * 3;
                    }
                }
            }
            if (!hit) continue;
            const previous = scored.get(entry.nodeId) || 0;
            if (score > previous) scored.set(entry.nodeId, score);
        }
        return [...scored.entries()]
            .sort((left, right) => right[1] - left[1])
            .slice(0, limit)
            .map(([nodeId, score]) => ({ node: state.nodeById.get(nodeId), score }));
    }

    function neighborTerms(seedIds, limit = 10) {
        const terms = new Map();
        outer: for (const seedId of seedIds) {
            for (const edge of state.edgesByNode.get(seedId) || []) {
                const neighbor = state.nodeById.get(edge.id);
                if (!neighbor || neighbor.kind === 'category') continue;
                const weight = edge.type === 'wiki_link' ? 0.42 : 0.55;
                for (const value of [neighbor.name, neighbor.nameEn, ...(neighbor.aliases || []).slice(0, 3)]) {
                    if (!value) continue;
                    for (const token of uniqueTokens(value)) {
                        terms.set(token, Math.max(terms.get(token) || 0, weight));
                    }
                }
                if (terms.size >= limit * 8) break outer;
            }
        }
        return terms;
    }

    function search(query, options = {}) {
        prepare();
        const startedAt = Date.now();
        const topK = Math.max(1, Math.min(24, Number(options.topK) || 8));
        const queryText = String(query || '').trim();
        if (!queryText) {
            return { query: '', matches: [], seeds: [], diagnostics: { error: 'empty-query' }, evidenceGraph: null };
        }
        const seeds = findSeeds(queryText);
        const seedIds = new Set(seeds.map(item => item.node.id));
        const queryTokenWeights = new Map();
        for (const token of tokenize(queryText)) queryTokenWeights.set(token, 1);

        // Entity labels and aliases are evidence-backed expansions: they come
        // from Wikidata, not from a generated synonym list.
        for (const seed of seeds) {
            for (const value of [seed.node.name, seed.node.nameEn, ...(seed.node.aliases || []).slice(0, 8)]) {
                if (!value) continue;
                for (const token of uniqueTokens(value)) {
                    queryTokenWeights.set(token, Math.max(queryTokenWeights.get(token) || 0, 0.72));
                }
            }
        }
        if (options.graphExpand !== false && seedIds.size) {
            const expanded = neighborTerms(seedIds);
            for (const [token, weight] of expanded) {
                queryTokenWeights.set(token, Math.max(queryTokenWeights.get(token) || 0, weight));
            }
        }

        const scorePass = (weights) => {
            const scores = new Float64Array(state.chunks.length);
            for (const [token, weight] of weights) {
                const postings = state.postings.get(token);
                if (!postings) continue;
                const df = postings.length / 2;
                const idf = Math.log(1 + (state.chunks.length - df + 0.5) / (df + 0.5));
                for (let index = 0; index < postings.length; index += 2) {
                    const chunkIndex = postings[index];
                    const frequency = postings[index + 1];
                    const length = state.docLengths[chunkIndex] || 1;
                    const denominator = frequency + BM25_K1 * (1 - BM25_B + BM25_B * length / state.avgdl);
                    scores[chunkIndex] += weight * idf * (frequency * (BM25_K1 + 1)) / denominator;
                }
            }
            return scores;
        };

        let scores = scorePass(queryTokenWeights);
        const queryNormalized = normalize(queryText);
        const queryCompact = compact(queryText);
        const applyBoosts = (values) => {
            state.chunks.forEach((chunk, index) => {
                if (!values[index]) return;
                if (queryCompact.length >= 2 && chunk._compactText.includes(queryCompact)) values[index] += 2.4;
                if (queryCompact.length >= 2 && chunk._compactTitle.includes(queryCompact)) values[index] += 1.2;
                if (queryCompact.length >= 2 && chunk._compactHeading.includes(queryCompact)) values[index] += 0.8;
                if (seedIds.has(chunk.nodeId)) values[index] += 1.5;
                else if (seedIds.size && [...seedIds].some(seedId => (state.edgesByNode.get(seedId) || []).some(edge => edge.id === chunk.nodeId))) values[index] += 0.45;
                if (hasCjk(queryText) && chunk.lang === 'zh') values[index] += 0.12;
                if (!hasCjk(queryText) && chunk.lang === 'en') values[index] += 0.28;
            });
        };
        applyBoosts(scores);

        // Pseudo-relevance feedback: mine discriminative terms from the first
        // pass, then run one more scoring pass. This is corpus-driven and
        // deterministic, not a model-generated query rewrite.
        let prfTerms = [];
        if (options.prf !== false && queryTokenWeights.size <= 40) {
            const firstPass = [...scores]
                .map((score, index) => ({ index, score }))
                .filter(item => item.score > 0)
                .sort((left, right) => right.score - left.score)
                .slice(0, 5);
            const counts = new Map();
            for (const item of firstPass) {
                for (const token of new Set(tokenize(state.chunks[item.index].text))) {
                    if (queryTokenWeights.has(token) || STOPWORDS.has(token)) continue;
                    counts.set(token, (counts.get(token) || 0) + item.score);
                }
            }
            prfTerms = [...counts.entries()]
                .sort((left, right) => right[1] - left[1])
                .slice(0, 8)
                .map(([token, weight]) => [token, Math.min(0.3, 0.08 + weight / 200)]);
            if (prfTerms.length) {
                const expanded = new Map(queryTokenWeights);
                for (const [token, weight] of prfTerms) expanded.set(token, Math.max(expanded.get(token) || 0, weight));
                scores = scorePass(expanded);
                applyBoosts(scores);
            }
        }

        // Entity-anchored floor: a query that resolves to a graph node must be
        // able to retrieve that node's own verbatim article even when the query
        // uses Traditional Chinese and the article uses Simplified Chinese (or
        // the reverse). This is graph evidence, not a generated answer.
        if (seedIds.size) {
            let maxScore = 0;
            for (const value of scores) if (value > maxScore) maxScore = value;
            const floor = Math.max(1, maxScore) * 1.05;
            seeds.forEach((seed, seedIndex) => {
                const seedFloor = floor * Math.max(0.82, 1 - seedIndex * 0.06);
                const indices = state.chunksByNode.get(seed.node.id) || [];
                indices.slice(0, 3).forEach(index => {
                    if (scores[index] < seedFloor) scores[index] = seedFloor;
                });
            });
        }

        const seenText = new Set();
        const candidates = [...scores]
            .map((score, index) => ({ index, score }))
            .filter(item => {
                if (item.score <= 0) return false;
                const key = state.chunks[item.index]._compactText;
                if (seenText.has(key)) return false;
                seenText.add(key);
                return true;
            })
            .sort((left, right) => right.score - left.score)
            .slice(0, MAX_CANDIDATES);

        const selected = [];
        const selectedTokens = [];
        while (candidates.length && selected.length < topK) {
            let bestIndex = 0;
            let bestScore = -Infinity;
            candidates.forEach((candidate, index) => {
                const tokens = state.chunks[candidate.index]._tokenSet;
                const redundancy = selectedTokens.length ? Math.max(...selectedTokens.map(item => jaccard(tokens, item))) : 0;
                const mmr = MMR_LAMBDA * candidate.score - (1 - MMR_LAMBDA) * redundancy;
                if (mmr > bestScore) { bestScore = mmr; bestIndex = index; }
            });
            const [candidate] = candidates.splice(bestIndex, 1);
            selectedTokens.push(state.chunks[candidate.index]._tokenSet);
            selected.push({ ...state.chunks[candidate.index], score: Number(candidate.score.toFixed(4)) });
        }

        const matches = selected.map(chunk => ({
            chunkId: chunk.id,
            id: chunk.id,
            nodeId: chunk.nodeId,
            nodeName: chunk.nodeName,
            qid: chunk.qid,
            lang: chunk.lang,
            title: chunk.title,
            heading: chunk.heading,
            text: chunk.text,
            snippet: bestSnippet(chunk.text, queryTokens(queryText), 360),
            score: chunk.score,
            source: '百科',
            url: chunk.url,
            citation: {
                source: '百科',
                title: chunk.title,
                url: chunk.url,
                revision: chunk.revision,
                license: chunk.license,
                retrievedAt: new Date().toISOString()
            }
        }));

        const nodeScores = new Map();
        for (const chunk of selected) {
            const current = nodeScores.get(chunk.nodeId) || { nodeId: chunk.nodeId, nodeName: chunk.nodeName, qid: chunk.qid, score: 0, chunks: 0 };
            current.score += chunk.score;
            current.chunks += 1;
            nodeScores.set(chunk.nodeId, current);
        }

        const originalTokens = new Set(tokenize(queryText));
        const topTokens = matches[0] ? textTokens(matches[0].text) : new Set();
        const covered = [...originalTokens].filter(token => topTokens.has(token)).length;
        const queryCoverage = originalTokens.size ? Number((covered / originalTokens.size).toFixed(3)) : 0;

        return {
            query: queryText,
            version: VERSION,
            seeds: seeds.map(item => ({ id: item.node.id, name: item.node.name, qid: item.node.qid, score: Number(item.score.toFixed(3)) })),
            matches,
            nodeScores: [...nodeScores.values()].sort((left, right) => right.score - left.score),
            evidenceGraph: buildEvidenceGraph(seeds, matches),
            diagnostics: {
                corpusChunks: state.chunks.length,
                indexTerms: state.postings.size,
                queryTokens: queryTokenWeights.size,
                originalQueryTokens: originalTokens.size,
                queryCoverage,
                topScore: matches[0]?.score || 0,
                seeds: seeds.length,
                prfTerms: prfTerms.map(item => item[0]).slice(0, 8),
                candidates: candidates.length,
                buildMs: state.buildMs,
                searchMs: Date.now() - startedAt,
                mode: 'local-corpus-bm25f-graph-prf-mmr'
            }
        };
    }

    function queryTokens(query) {
        return new Set(tokenize(query));
    }

    function bestSnippet(text, tokens, maxChars) {
        const source = String(text || '');
        if (source.length <= maxChars) return source;
        const sentences = source.split(/(?<=[。！？!?；;])\s*|(?<=\.)\s+(?=[A-Z0-9])/u).filter(Boolean);
        let best = { score: -1, start: 0, end: Math.min(maxChars, source.length) };
        for (let index = 0; index < sentences.length; index += 1) {
            let buffer = '';
            let score = 0;
            for (let cursor = index; cursor < sentences.length && buffer.length < maxChars; cursor += 1) {
                buffer += sentences[cursor];
                for (const token of tokens) if (buffer.includes(token.replace(/^[wc]:/, ''))) score += 1;
                if (buffer.length >= maxChars * 0.55) break;
            }
            if (score > best.score) {
                const start = source.indexOf(buffer);
                best = { score, start: start >= 0 ? start : 0, end: (start >= 0 ? start : 0) + buffer.length };
            }
        }
        const snippet = source.slice(best.start, Math.min(source.length, best.end)).trim();
        return snippet.length > maxChars ? `${snippet.slice(0, maxChars).trim()}…` : snippet;
    }

    function buildEvidenceGraph(seeds, matches) {
        const nodes = [];
        const edges = [];
        const seen = new Set();
        const add = node => {
            if (!node.id || seen.has(node.id)) return;
            seen.add(node.id);
            nodes.push(node);
        };
        for (const seed of seeds) {
            add({ id: `topic:${seed.node.id}`, type: 'topic', label: seed.node.name, qid: seed.node.qid, score: seed.score });
        }
        for (const match of matches) {
            const evidenceId = `evidence:${match.chunkId}`;
            add({
                id: evidenceId, type: 'evidence', label: `${match.title}${match.heading ? ` · ${match.heading}` : ''}`,
                text: match.snippet, citation: match.citation, nodeId: match.nodeId, score: match.score
            });
            edges.push({ source: `topic:${match.nodeId}`, target: evidenceId, relation: 'documented_by' });
            const node = state.nodeById.get(match.nodeId);
            for (const claim of (node?.claims || []).slice(0, 4)) {
                const value = claim.values?.[0];
                if (!value) continue;
                const claimId = `claim:${match.nodeId}:${claim.property}:${value.id}`;
                add({
                    id: claimId, type: 'claim', label: `${claim.label}: ${value.label}`,
                    statement: `${claim.label} (${claim.property}): ${claim.values.map(item => item.label).join('；')}`,
                    citation: { source: 'Wikidata', title: `${node.name} (${node.qid})`, url: `https://www.wikidata.org/wiki/${node.qid}`, identifier: node.qid }
                });
                edges.push({ source: `topic:${match.nodeId}`, target: claimId, relation: 'asserts' });
                edges.push({ source: claimId, target: evidenceId, relation: 'contextualizes' });
            }
        }
        return {
            nodes: [...new Map(nodes.map(node => [node.id, node])).values()],
            edges,
            stats: {
                topics: nodes.filter(node => node.type === 'topic').length,
                evidence: nodes.filter(node => node.type === 'evidence').length,
                claims: nodes.filter(node => node.type === 'claim').length
            }
        };
    }

    function getNode(value) {
        prepare();
        if (!value) return null;
        if (state.nodeById.has(value)) return state.nodeById.get(value);
        const needle = normalize(value);
        const compactNeedle = compact(value);
        const exact = state.nodes.find(node => normalize(node.name) === needle || normalize(node.nameEn) === needle);
        if (exact) return exact;
        return state.nodes.find(node => node.kind !== 'category' && (
            normalize(node.name).includes(needle) || needle.includes(normalize(node.name)) ||
            (compactNeedle && compact(node.name) === compactNeedle)
        )) || null;
    }

    function neighbors(nodeId, depth = 1) {
        prepare();
        const result = [];
        const visited = new Set([nodeId]);
        let frontier = [nodeId];
        for (let level = 0; level < depth; level += 1) {
            const next = [];
            for (const current of frontier) {
                for (const edge of state.edgesByNode.get(current) || []) {
                    if (visited.has(edge.id)) continue;
                    visited.add(edge.id);
                    const node = state.nodeById.get(edge.id);
                    if (!node) continue;
                    result.push({ ...node, edgeType: edge.type, edgeLabel: edge.label, direction: edge.direction, distance: level + 1 });
                    next.push(edge.id);
                }
            }
            frontier = next;
        }
        return result;
    }

    function stats() {
        if (!graph || !graph.documents || !Object.keys(graph.documents).length) {
            return {
                version: VERSION,
                ready: false,
                nodes: graph?.nodes?.length || 0,
                chunks: 0,
                terms: 0,
                source: graph?.meta?.sourcePage?.title || '',
                license: graph?.meta?.license || ''
            };
        }
        prepare();
        return {
            version: VERSION,
            ready: true,
            nodes: state.nodes.length,
            chunks: state.chunks.length,
            terms: state.postings.size,
            avgdl: Number(state.avgdl.toFixed(2)),
            buildMs: state.buildMs,
            source: state.graph?.meta?.sourcePage?.title || '',
            license: state.graph?.meta?.license || ''
        };
    }

    return {
        version: VERSION,
        prepare,
        search,
        getNode,
        neighbors,
        stats,
        tokenize
    };
});
