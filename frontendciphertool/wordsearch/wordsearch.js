/* =============================================================================
 * 词汇区：中英文查词
 *
 * 左侧输入卡的左上角有一个滑动开关，用来在「英文」与「中文」两种查词模式之间切换。
 * 切换时会同时替换右侧的「语法说明」卡内容——因为两种模式的语法完全不同：
 *   英文：Nutrimatic 语法（C 辅音 / A 字母 / V 元音 / <> 变位词 / &_{n} 组合）
 *   中文：定字 ? / 通配 * / 拼音 py= / 首字母 zm= / 类型 type= / 排除 -
 * 这样用户不用记两套语法混在一起，也不会以为中文模式支持 Nutrimatic 的写法。
 *
 * 英文模式沿用原来的实现：经公共代理访问 nutrimatic.org。
 * 中文模式完全离线：引擎在同目录的 wordsearch_chinese.js，
 * 词库是 chinese-data/ 下的分片（由 tests/build-wordsearch-data.js 生成）。
 * ========================================================================== */

const WORDSEARCH_HTML = `
    <div id="cihuitoast"><i class="fas fa-check-circle"></i> 已复制到剪贴板</div>
    <div class="container">
        <div class="cihui-layout-wrapper">
            <div class="card main-input">
                <div class="cihui-mode-switch" id="cihuiModeSwitch" role="switch" aria-checked="false" tabindex="0"
                     aria-label="切换中英文查词模式" title="切换中英文查词模式">
                    <span class="cihui-mode-switch__label cihui-mode-switch__label--en">EN</span>
                    <span class="cihui-mode-switch__track"><span class="cihui-mode-switch__knob"></span></span>
                    <span class="cihui-mode-switch__label cihui-mode-switch__label--zh">中文</span>
                </div>

                <cihuih1 id="cihuiTitle"><i class="fas fa-search"></i> Wordsearch 2025</cihuih1>

                <div class="cihuiinput-group">
                    <input type="text" id="patternInput" placeholder="输入模式 (例如: C*aC*e, <anagram>, A...le)" autocomplete="off">
                </div>

                <button class="cihuibtn" id="cihuiSearchBtn">
                    Initialize Search Sequence <i class="fas fa-angle-double-right"></i>
                </button>

                <div class="cihuiresult-container">
                    <span class="cihuiresult-label" id="cihuiResultLabel">Output Stream //</span>
                    <div class="cihuitip-toast" id="cihuiCopyTip"><i class="fas fa-mouse-pointer"></i> 点击单词即可复制</div>

                    <div class="cihuiloader" id="loader"><span></span><span></span><span></span></div>

                    <div class="result" id="outputArea">等待输入指令...</div>

                    <!-- 分页控件（仅英文模式使用） -->
                    <div class="cihuipagination-controls" id="paginationControls" style="display:none;">
                        <button class="cihuipage-btn disabled" id="prevBtn"><i class="fas fa-chevron-left"></i> 上一页</button>
                        <span id="pageIndicator" style="color:var(--text); align-self:center; font-family:monospace;">P.1</span>
                        <button class="cihuipage-btn" id="nextBtn">下一页 <i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>

            <!-- 右侧语法说明卡：内容随模式切换 -->
            <div class="card">
                <div class="badge" id="cihuiSyntaxBadge">语法说明</div>
                <div class="cihui-tip-content" id="cihuiSyntaxBody"></div>
            </div>
        </div>
    </div>
`;

/* ---------------------------------------------------------------- 语法说明文本 */

const CIHUI_SYNTAX_EN = `说明：
这是一个英文词汇、短语、语句匹配工具，数据来自 nutrimatic.org。

语法提示：
“C”任何辅音[bcdfghjklmnpqrstvwxyz]
“A”任何字母[a-z]
“V”任何元音[aeiou]
组合起来像：【CAVCAV】→【people】

“.”或者“_”任意字符的补充
如：【peo...】→【people】

"-"可能带空格的任意字符
表示词语中间可能会包含不知道多少个空格
比如：【AAA-AA-AAA】
得到：as well as|football|the world

“<>”变位词
如：【< aaamnrg >】→【anagram】

“(&_{8})”包含前面给到的字母里有8个组合成单词
如：(c?h?a?r?m?&_{4})
得到：harm`;

const CIHUI_SYNTAX_ZH = `说明：
中文离线查词，数据内置在本工具里，不联网、不经过代理。
当前收录量见下方统计，可按条件组合筛选。

定字与通配：
“?”代表任意一个汉字
【中?】→ 中国、中间、中午 …
【?国】→ 中国、美国、王国 …
【一??意】→ 一心一意、一见钟情式四字词

“*”代表任意多个汉字
【一*意】→ 一心一意、一心二意 …

拼音与首字母：
“py=”按拼音查，可不带声调
【py=zhongguo】→ 中国
【py=yi xin】→ 一心…

“zm=”按首字母缩写查
【zm=ywdj】→ 一网打尽

类型：
“type=”限定类型，可选 成语 / 词语 / 汉字
【type=成语 一??意】

排除字：
“-”加在字前，表示结果里不要出现这个字
【一??意 -不】

多个条件可以叠加：
【一??意 type=成语】`;

/* ---------------------------------------------------------------- 模式状态 */

let cihuiMode = 'en'; // 'en' | 'zh'
let currentQuery = '';
let currentPageOffset = '';
let historyStack = [];

/* ---------------------------------------------------------------- 初始化 */

function initWordSearch() {
    const container = document.getElementById('cihuiqu');
    if (!container) return;
    // 幂等：重复初始化时不要重置用户已经输入的内容
    if (container.querySelector('#patternInput')) { bindWordSearchEvents(); return; }
    container.innerHTML = WORDSEARCH_HTML;
    bindWordSearchEvents();
    applyCihuiMode('en');
}

function bindWordSearchEvents() {
    const patternInput = document.getElementById('patternInput');
    if (patternInput && patternInput.dataset.bound !== '1') {
        patternInput.dataset.bound = '1';
        patternInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') cihuiSearch();
        });
    }
    const btn = document.getElementById('cihuiSearchBtn');
    if (btn && btn.dataset.bound !== '1') {
        btn.dataset.bound = '1';
        btn.addEventListener('click', cihuiSearch);
    }
    const sw = document.getElementById('cihuiModeSwitch');
    if (sw && sw.dataset.bound !== '1') {
        sw.dataset.bound = '1';
        const toggle = () => applyCihuiMode(cihuiMode === 'en' ? 'zh' : 'en');
        sw.addEventListener('click', toggle);
        sw.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
    }
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    if (prev && prev.dataset.bound !== '1') { prev.dataset.bound = '1'; prev.addEventListener('click', prevPage); }
    if (next && next.dataset.bound !== '1') { next.dataset.bound = '1'; next.addEventListener('click', nextWuPage); }
}

/** 切换中英文模式：同时替换标题、按钮文案、语法说明卡 */
function applyCihuiMode(mode) {
    cihuiMode = mode === 'zh' ? 'zh' : 'en';
    const sw = document.getElementById('cihuiModeSwitch');
    const title = document.getElementById('cihuiTitle');
    const btn = document.getElementById('cihuiSearchBtn');
    const input = document.getElementById('patternInput');
    const badge = document.getElementById('cihuiSyntaxBadge');
    const body = document.getElementById('cihuiSyntaxBody');
    const label = document.getElementById('cihuiResultLabel');
    const copyTip = document.getElementById('cihuiCopyTip');
    const pager = document.getElementById('paginationControls');
    const output = document.getElementById('outputArea');
    const stats = window.ZhongwenSearch ? window.ZhongwenSearch.stats : null;

    const zh = cihuiMode === 'zh';
    if (sw) {
        sw.classList.toggle('is-zh', zh);
        sw.setAttribute('aria-checked', zh ? 'true' : 'false');
    }
    if (title) {
        title.innerHTML = zh
            ? '<i class="fas fa-search"></i> 中文查词'
            : '<i class="fas fa-search"></i> Wordsearch 2025';
    }
    if (btn) {
        btn.innerHTML = zh
            ? '开始查询 <i class="fas fa-angle-double-right"></i>'
            : 'Initialize Search Sequence <i class="fas fa-angle-double-right"></i>';
    }
    if (input) {
        input.placeholder = zh
            ? '输入查询 (例如: 中?, 一??意, py=zhongguo, zm=ywdj, type=成语)'
            : '输入模式 (例如: C*aC*e, <anagram>, A...le)';
    }
    if (badge) badge.textContent = zh ? '中文查词语法' : '语法说明';
    if (label) label.textContent = zh ? '查询结果 //' : 'Output Stream //';
    if (copyTip) copyTip.style.display = zh ? 'none' : '';
    if (pager) pager.style.display = 'none';
    if (body) {
        if (!zh) body.textContent = CIHUI_SYNTAX_EN;
        else body.textContent = CIHUI_SYNTAX_ZH + (stats
            ? `\n\n当前收录：汉字 ${stats.hanzi} 个 ・ 成语 ${stats.idiom} 条 ・ 词语 ${stats.ciyu} 条` +
              `\n数据来源：${stats.source}`
            : '\n\n（词库元数据尚未加载，首次查询时会自动载入）');
    }
    if (output) {
        output.innerHTML = zh
            ? '等待输入查询条件…'
            : '等待输入指令...';
    }
    // 输入框清空，避免把英文语法带进中文模式
    if (input) input.value = '';
}

/* ---------------------------------------------------------------- 查询入口 */

function cihuiSearch() {
    return cihuiMode === 'zh' ? runZhongwenSearch() : runEnglishSearch();
}

/* ---------------------------------------------------------------- 中文查询 */

async function runZhongwenSearch() {
    const output = document.getElementById('outputArea');
    const input = document.getElementById('patternInput');
    const loader = document.getElementById('loader');
    const query = (input && input.value || '').trim();
    if (!query) { output.textContent = '请输入查询条件，例如：一??意 或 py=zhongguo'; return; }
    if (!window.ZhongwenSearch) { output.textContent = '中文词库未加载，请刷新页面重试。'; return; }

    if (loader) loader.style.display = 'block';
    try {
        // search() 是 async，render() 要的是它的结果对象；
        // 直接把查询串丢给 render 会永远渲染「没有匹配结果」那一支。
        const result = await window.ZhongwenSearch.search(query);
        currentQuery = query;
        const text = window.ZhongwenSearch.render(result);
        output.textContent = text;
        // 结果里的词条可点击复制：把第一个匹配词做成可点区域
        const first = (text.match(/\n\s{2}([\u4e00-\u9fff]{1,8})\s/g) || [])[1];
        output.title = first ? `双击复制「${first}」` : '';
        output.ondblclick = first ? () => copyText(first) : null;
    } catch (err) {
        output.textContent = `中文查询出错：${err && err.message ? err.message : err}`;
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

/* ---------------------------------------------------------------- 英文查询（原逻辑） */

function runEnglishSearch() {
    currentQuery = document.getElementById('patternInput').value.trim();
    if (!currentQuery) return;
    currentPageOffset = '';
    historyStack = [];
    const indicator = document.getElementById('pageIndicator');
    if (indicator) indicator.innerText = 'P.1';
    fetchData(currentQuery, '');
}

async function fetchData(query, startParam) {
    const output = document.getElementById('outputArea');
    const loader = document.getElementById('loader');
    const paginationControls = document.getElementById('paginationControls');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    output.innerHTML = '';
    loader.style.display = 'block';
    paginationControls.style.display = 'none';

    let nutrimaticUrl = `https://nutrimatic.org/2024/?q=${encodeURIComponent(query)}&go=Go`;
    if (startParam) nutrimaticUrl += `&start=${startParam}`;

    // 代理顺序：先试不依赖后端的公共代理（快），最后才落到本机后端。
    //
    // nutrimatic.org 不发 Access-Control-Allow-Origin，浏览器不能直连，必须过代理。
    // 本机后端那条路最稳（不依赖第三方），但后端没起或没重新编译时它会在
    // /api/crawler/raw 上耗掉一整轮超时，所以放到最后，并且单独给短超时。
    const apiBase = (window.CIPHERTOOL_API_BASE || 'http://localhost:8080').replace(/\/$/, '');
    const proxies = [
        {
            name: 'CodeTabs',
            getUrl: url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            timeout: 12000,
            fetch: async (url, signal) => {
                const res = await fetch(url, { signal });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return await res.text();
            }
        },
        {
            name: 'AllOrigins',
            getUrl: url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            timeout: 12000,
            fetch: async (url, signal) => {
                const res = await fetch(url, { signal });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                return data.contents;
            }
        },
        {
            name: '本机后端',
            getUrl: () => `${apiBase}/api/crawler/raw`,
            timeout: 20000,
            fetch: async (url, signal) => {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: nutrimaticUrl }),
                    signal
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                if (!data || data.success !== true) throw new Error((data && data.message) || '后端返回失败');
                return data.data;
            }
        },
        {
            name: 'CorsProxy',
            getUrl: url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            timeout: 12000,
            fetch: async (url, signal) => {
                const res = await fetch(url, { signal });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return await res.text();
            }
        }
    ];

    try {
        let htmlContent = '';
        let success = false;
        let lastError = null;
        for (const proxy of proxies) {
            try {
                console.log(`[WordSearch] 尝试代理: ${proxy.name}`);
                const targetUrl = proxy.getUrl(nutrimaticUrl);
                // 每个代理单独限时：一个卡住的代理不该把整次查询拖到底
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), proxy.timeout || 12000);
                try {
                    htmlContent = await proxy.fetch(targetUrl, controller.signal);
                } finally {
                    clearTimeout(timer);
                }
                if (htmlContent && htmlContent.length > 50) {
                    success = true;
                    console.log(`[WordSearch] 代理 ${proxy.name} 连接成功`);
                    break;
                }
                throw new Error('返回内容为空或无效');
            } catch (err) {
                const why = err && err.name === 'AbortError' ? `超时（${proxy.timeout || 12000}ms）` : (err && err.message);
                console.warn(`[WordSearch] 代理 ${proxy.name} 失败:`, why);
                lastError = new Error(why);
                continue;
            }
        }
        if (!success) throw new Error(`连接失败，请查看网络 (最后错误: ${lastError?.message})`);

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        let nextStart = null;
        doc.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('start=')) {
                const match = href.match(/start=(\d+)/);
                if (match) {
                    nextStart = match[1];
                    if (link.innerText.toLowerCase().includes('next')) return;
                }
            }
        });

        const bodyClone = doc.body.cloneNode(true);
        bodyClone.querySelectorAll('script, style, form, center, h1, a').forEach(el => el.remove());

        const lines = bodyClone.innerText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const ignoreList = ['nutrimatic', 'usage', 'contact', 'wikipedia', 'validate'];
        const filteredResults = lines.filter(line => {
            if (line.includes('{') || line.includes('}')) return false;
            if (ignoreList.some(keyword => line.toLowerCase().includes(keyword))) return false;
            return true;
        });

        if (filteredResults.length === 0) {
            output.innerHTML = '<span style="color:gray">未找到结果。</span>';
        } else {
            output.innerHTML = filteredResults.map(word =>
                `<span class="cihuiword-item" data-copy="${escapeHtml(word)}" title="点击复制">${escapeHtml(word)}</span>`
            ).join(' ');
            output.querySelectorAll('.cihuiword-item').forEach(el => {
                el.addEventListener('click', () => copyText(el.dataset.copy));
            });
        }

        paginationControls.style.display = 'flex';
        if (nextStart) {
            nextBtn.classList.remove('disabled');
            nextBtn.dataset.next = nextStart;
        } else {
            nextBtn.classList.add('disabled');
            delete nextBtn.dataset.next;
        }
        prevBtn.classList.toggle('disabled', historyStack.length === 0);
    } catch (error) {
        console.error(error);
        output.innerHTML = `<span style="color:var(--error)">连接出错，请重试。<br>建议直接访问: <a href="${nutrimaticUrl}" target="_blank" style="color:var(--secondary)">官网</a></span>`;
    } finally {
        loader.style.display = 'none';
    }
}

function nextWuPage() {
    const nextBtn = document.getElementById('nextBtn');
    const nextStart = nextBtn && nextBtn.dataset.next;
    if (!nextStart) return;
    historyStack.push(currentPageOffset);
    currentPageOffset = nextStart;
    updatePageIndicator();
    fetchData(currentQuery, currentPageOffset);
}

function prevPage() {
    if (historyStack.length === 0) return;
    currentPageOffset = historyStack.pop();
    updatePageIndicator();
    fetchData(currentQuery, currentPageOffset);
}

function updatePageIndicator() {
    const el = document.getElementById('pageIndicator');
    if (el) el.innerText = `P.${historyStack.length + 1}`;
}

/* ---------------------------------------------------------------- 工具 */

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

function copyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast(`已复制: ${text}`);
        const output = document.getElementById('outputArea');
        if (output) {
            output.style.borderColor = 'var(--primary)';
            setTimeout(() => { output.style.borderColor = 'rgba(64, 224, 255, 0.1)'; }, 300);
        }
    } catch (err) {
        console.error('无法复制', err);
        showToast('复制失败，请手动复制');
    }
    document.body.removeChild(textarea);
}

function showToast(message) {
    const toast = document.getElementById('cihuitoast');
    if (!toast) return;
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    toast.className = 'show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

// 兼容旧调用名（initSearch 曾作为全局函数被内联 onclick 使用）
function initSearch() { return cihuiSearch(); }
function initWordSearchMode(mode) { applyCihuiMode(mode); }
