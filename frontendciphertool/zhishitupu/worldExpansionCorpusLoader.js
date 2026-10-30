// 本地扩展正文加载器：worldExpansion.js 只保留 DBpedia 概念元数据，
// 扩展节点的维基百科正文压缩在 worldExpansionCorpus.bin，浏览器本地解压后仅供节点面板展示。
(function () {
    'use strict';
    if (window.WORLD_EXPANSION_CORPUS_READY) return;
    const store = window.WORLD_KNOWLEDGE_EXPANSION;
    const ready = (async () => {
        if (!store) throw new Error('worldExpansion.js 未加载');
        if (typeof DecompressionStream !== 'function') throw new Error('当前浏览器不支持本地 gzip 解压');
        const corpusPath = store.meta?.corpus?.file || 'worldExpansionCorpus.bin';
        const version = encodeURIComponent(store.meta?.corpus?.builtAt || store.meta?.builtAt || '');
        const url = new URL(`zhishitupu/${corpusPath}?v=${version}`, document.baseURI).href;
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`加载扩展百科正文失败: HTTP ${response.status}`);
        const text = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();
        const corpus = JSON.parse(text);
        store.documents = corpus.documents || {};
        if (store.meta) store.meta.corpusLoaded = true;
        return store.documents;
    })();
    window.WORLD_EXPANSION_CORPUS_READY = ready;
    ready.catch(error => {
        console.error('[知识图谱] 扩展百科正文加载失败:', error);
    });
})();
