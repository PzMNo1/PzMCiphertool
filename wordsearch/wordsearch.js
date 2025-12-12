/*这个是词汇区的检索算法*/

const WORDSEARCH_HTML = `
    <div id="cihuitoast"><i class="fas fa-check-circle"></i> 已复制到剪贴板</div>
    <div class="container">
        <div class="cihui-layout-wrapper">
            <div class="card main-input">
                <cihuih1><i class="fas fa-search"></i> Wordsearch 2025</cihuih1>

                <div class="cihuiinput-group">
                    <input type="text" id="patternInput" placeholder="输入模式 (例如: C*aC*e, <anagram>, A...le)" autocomplete="off">
                </div>

                <button class="cihuibtn" onclick="initSearch()">
                    Initialize Search Sequence <i class="fas fa-angle-double-right"></i>
                </button>

                <div class="cihuiresult-container">
                    <span class="cihuiresult-label">Output Stream //</span>
                    <div class="cihuitip-toast"><i class="fas fa-mouse-pointer"></i> 点击单词即可复制</div>

                    <div class="cihuiloader" id="loader"><span></span><span></span><span></span></div>

                    <div class="result" id="outputArea">等待输入指令...</div>

                    <!-- 分页控件 -->
                    <div class="cihuipagination-controls" id="paginationControls" style="display:none;">
                        <button class="cihuipage-btn disabled" id="prevBtn" onclick="prevPage()"><i class="fas fa-chevron-left"></i> 上一页</button>
                        <span id="pageIndicator" style="color:var(--text); align-self:center; font-family:monospace;">P.1</span>
                        <button class="cihuipage-btn" id="nextBtn" onclick="nextPage()">下一页 <i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="badge">语法说明</div>
                <div class="cihui-tip-content">
说明：
这是一个词汇、短语、语句匹配工具

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
得到：harm</div>
            </div>
        </div>
    </div>
`;

function initWordSearch() {
    const container = document.getElementById('cihuiqu');
    if (container) {
        container.innerHTML = WORDSEARCH_HTML;
        
        // 绑定事件
        const patternInput = document.getElementById('patternInput');
        if (patternInput) {
            patternInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') initSearch();
            });
        }
    }
}

let currentQuery = "";
let currentPageOffset = ""; 
let historyStack = []; 

function initSearch() {
    currentQuery = document.getElementById('patternInput').value.trim();
    if (!currentQuery) return;
    
    currentPageOffset = ""; 
    historyStack = []; 
    document.getElementById('pageIndicator').innerText = "P.1";
    
    fetchData(currentQuery, "");
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
    if (startParam) {
        nutrimaticUrl += `&start=${startParam}`;
    }
    
    const proxies = [
        {
            name: "CodeTabs", 
            getUrl: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            fetch: async (url) => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return await res.text();
            }
        },
        {
            name: "AllOrigins", 
            getUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            fetch: async (url) => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                return data.contents;
            }
        },
        {
            name: "CorsProxy", 
            getUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            fetch: async (url) => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return await res.text();
            }
        }
    ];

    

    try {
        let htmlContent = "";
        let success = false;
        let lastError = null;
        for (const proxy of proxies) {
            try {
                console.log(`[WordSearch] 尝试代理: ${proxy.name}`);
                const targetUrl = proxy.getUrl(nutrimaticUrl);
                htmlContent = await proxy.fetch(targetUrl);
                if (htmlContent && htmlContent.length > 50) {
                    success = true;
                    console.log(`[WordSearch] 代理 ${proxy.name} 连接成功`);
                    break;
                } else {
                    throw new Error("返回内容为空或无效");
                }
            } catch (err) {
                console.warn(`[WordSearch] 代理 ${proxy.name} 失败:`, err);
                lastError = err;
                continue;
            }
        }

        if (!success) {
            throw new Error(`连接失败，请查看网络 (最后错误: ${lastError?.message})`);
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        let nextStart = null;
        const links = doc.querySelectorAll('a');
        for (const link of links) {
            const href = link.getAttribute('href');
            if (href && href.includes('start=')) {
                const match = href.match(/start=(\d+)/);
                if (match) {nextStart = match[1];
                    if (link.innerText.toLowerCase().includes('next')) {break;}
                }
            }
        }

        const bodyClone = doc.body.cloneNode(true);
        const scripts = bodyClone.querySelectorAll('script, style, form, center, h1, a'); 
        scripts.forEach(el => el.remove());

        const rawText = bodyClone.innerText;
        const lines = rawText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const ignoreList = ["nutrimatic", "usage", "contact", "wikipedia", "validate"];
        const filteredResults = lines.filter(line => {
            if (line.includes('{') || line.includes('}')) return false;
            if (ignoreList.some(keyword => line.toLowerCase().includes(keyword))) return false;
            return true;
        });

        if (filteredResults.length === 0) {
            output.innerHTML = '<span style="color:gray">未找到结果。</span>';
        } else {
            output.innerHTML = filteredResults.map(word => 
                `<span class="cihuiword-item" onclick="copyText('${word.replace(/'/g, "\\'")}')" title="点击复制">${word}</span>`
            ).join(' ');
        }

        paginationControls.style.display = 'flex';
        
        if (nextStart) {
            nextBtn.classList.remove('disabled');
            nextBtn.onclick = () => nextPage(nextStart);
        } else {
            nextBtn.classList.add('disabled');
            nextBtn.onclick = null;
        }

        if (historyStack.length > 0) {
            prevBtn.classList.remove('disabled');
        } else {
            prevBtn.classList.add('disabled');
        }

    } catch (error) {
        console.error(error);
        output.innerHTML = `<span style="color:var(--error)">连接出错，请重试。<br>建议直接访问: <a href="${nutrimaticUrl}" target="_blank" style="color:var(--secondary)">官网</a></span>`;
    } finally {
        loader.style.display = 'none';
    }
}

function nextPage(nextStartParam) {
    historyStack.push(currentPageOffset);
    currentPageOffset = nextStartParam;
    updatePageIndicator();
    fetchData(currentQuery, currentPageOffset);
}

function prevPage() {
    if (historyStack.length === 0) return;
    const prevStart = historyStack.pop();
    currentPageOffset = prevStart;
    updatePageIndicator();
    fetchData(currentQuery, currentPageOffset);
}

function updatePageIndicator() {
    const pageNum = historyStack.length + 1;
    document.getElementById('pageIndicator').innerText = `P.${pageNum}`;
}

function copyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";  
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast(`已复制: ${text}`);
        const output = document.getElementById('outputArea');
        output.style.borderColor = 'var(--primary)';
        setTimeout(() => {
            output.style.borderColor = 'rgba(64, 224, 255, 0.1)';
        }, 300);
    } catch (err) {
        console.error('无法复制', err);
        showToast("复制失败，请手动复制");
    }
    
    document.body.removeChild(textarea);
}

function showToast(message) {
    const toast = document.getElementById("cihuitoast");
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    toast.className = "show";
    setTimeout(function(){ toast.className = toast.className.replace("show", ""); }, 3000);
}
