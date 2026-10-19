// 本地世界知识正文加载器：worldKnowledge.js 只保留节点/关系元数据，
// 完整 Wikipedia 正文压缩在 worldCorpus.bin，浏览器本地解压后参与 RAG。
(function () {
    'use strict';
    if (window.WORLD_CORPUS_READY) return;
    const graph = window.WORLD_KNOWLEDGE_GRAPH;
    const ready = (async () => {
        if (!graph || !Array.isArray(graph.nodes)) throw new Error('worldKnowledge.js 未加载');
        if (typeof DecompressionStream !== 'function') throw new Error('当前浏览器不支持本地 gzip 解压');
        const corpusPath = graph.meta?.corpus?.file || 'worldCorpus.bin';
        const version = encodeURIComponent(graph.meta?.builtAt || '');
        const url = new URL(`zhishitupu/${corpusPath}?v=${version}`, document.baseURI).href;
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`加载本地正文失败: HTTP ${response.status}`);
        const text = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();
        const corpus = JSON.parse(text);
        graph.documents = corpus.documents || {};
        if (graph.meta) graph.meta.corpusLoaded = true;
        return graph.documents;
    })();
    window.WORLD_CORPUS_READY = ready;
    ready.catch(error => {
        console.error('[知识图谱] 本地 Wikipedia 正文加载失败:', error);
    });
})();
