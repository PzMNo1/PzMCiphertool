/**
 * ToolRegistry - 工具注册表模块
 * 负责注册、管理和执行可用工具
 */

class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.dynamicAvailability = new Map();
        this.agentEarthStatusCheckedAt = 0;

        // 动态获取后端 API 基础路径
        this.getApiBase = () => {
            return `${this.getLocalBackendBase()}/api/crawler`;
        };

        this.getProjectApiBase = () => {
            return `${this.getLocalBackendBase()}/api/project`;
        };

        this.getAgentEarthApiBase = () => {
            return `${this.getLocalBackendBase()}/api/agent-earth`;
        };

        this.registerBuiltinTools();
    }

    getLocalBackendBase() {
        try {
            const override = window.CIPHERTOOL_API_BASE || localStorage.getItem('CIPHERTOOL_API_BASE') || '';
            if (/^https?:\/\//i.test(override)) {
                return override.replace(/\/+$/, '');
            }
        } catch (error) {
            // Fall through to the local default.
        }
        return 'http://localhost:8080';
    }

    isToolAvailable(name) {
        if (!this.has(name)) return false;
        return true;
    }

    async refreshAgentEarthAvailability(options = {}) {
        const timeoutMs = Number(options.timeoutMs) || 1200;
        const ttlMs = Number(options.ttlMs) || 60000;
        const now = Date.now();
        if (!options.force && now - this.agentEarthStatusCheckedAt < ttlMs) {
            return this.dynamicAvailability.get('agent_earth_run') === true;
        }

        this.agentEarthStatusCheckedAt = now;
        try {
            const { response, result } = await this.fetchJson(`${this.getAgentEarthApiBase()}/status`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }, timeoutMs);
            const data = result?.data || result || {};
            const available = Boolean(response.ok && result?.success !== false && data.available === true);
            this.dynamicAvailability.set('agent_earth_run', available);
            return available;
        } catch (error) {
            // Keep the tool routable. The run endpoint returns the actionable
            // configuration/network error, and availability probes are often
            // shorter than real AgentEarth calls.
            this.dynamicAvailability.set('agent_earth_run', true);
            return true;
        }
    }

    async fetchJson(url, options = {}, timeoutMs = 30000) {
        const controller = new AbortController();
        const timer = Number.isFinite(timeoutMs) && timeoutMs > 0
            ? setTimeout(() => controller.abort(), timeoutMs)
            : null;
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            const text = await response.text();
            let result = null;
            try {
                result = text ? JSON.parse(text) : null;
            } catch (parseError) {
                parseError.response = response;
                parseError.responseText = text;
                throw parseError;
            }
            return { response, result, text };
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw new Error(`request timed out after ${Math.round(timeoutMs / 1000)}s`);
            }
            throw error;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    async fetchWithAbort(url, options = {}, timeoutMs = null) {
        const effectiveTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
            ? timeoutMs
            : this.inferFetchTimeoutMs(url);
        const controller = new AbortController();
        const timer = effectiveTimeout > 0
            ? setTimeout(() => controller.abort(), effectiveTimeout)
            : null;
        try {
            return await fetch(url, {
                ...options,
                signal: controller.signal
            });
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw new Error(`request timed out after ${Math.round(effectiveTimeout / 1000)}s`);
            }
            throw error;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    inferFetchTimeoutMs(url) {
        const value = String(url || '');
        if (value.includes('/research')) return 120000;
        if (value.includes('/run_command')) return 90000;
        if (value.includes('/propose_patch')) return 60000;
        if (value.includes('/read_webpage')) return 45000;
        if (value.includes('/community_snapshot')) return 45000;
        if (value.includes('/search_urls')) return 45000;
        return 30000;
    }

    /**
     * 注册内置工具
     */
    registerBuiltinTools() {
        // 获取当前日期
        this.register({
            name: 'get_current_date',
            description: '获取当前日期，格式为 YYYY-MM-DD',
            parameters: {
                type: 'object',
                properties: {}
            },
            execute: () => {
                const now = new Date();
                return now.toISOString().split('T')[0];
            }
        });

        // 获取当前时间
        this.register({
            name: 'get_current_time',
            description: '获取当前时间，包含日期和时间。可指定 timezone（IANA 时区名）或 utc_offset（如 +08:00）。',
            parameters: {
                type: 'object',
                properties: {
                    timezone: { type: 'string', description: '可选 IANA 时区，如 Asia/Shanghai、UTC' },
                    utc_offset: { type: 'string', description: '可选 UTC 偏移，如 +08:00（与 timezone 二选一）' }
                }
            },
            execute: ({ timezone = '', utc_offset = '' }) => {
                const offset = String(utc_offset || '').trim();
                if (offset) {
                    const match = offset.match(/^([+-])(\d{2}):?(\d{2})$/);
                    if (!match) return 'Invalid utc_offset. Use +08:00 format.';
                    const sign = match[1] === '+' ? 1 : -1;
                    const minutes = sign * (Number(match[2]) * 60 + Number(match[3]));
                    const date = new Date(Date.now() + minutes * 60 * 1000);
                    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ` UTC${offset}`);
                }
                const tz = String(timezone || '').trim();
                const opts = {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                };
                if (tz) opts.timeZone = tz;
                return new Date().toLocaleString('zh-CN', opts);
            }
        });

        // 数学计算
        this.register({
            name: 'calculate',
            description: '执行数学表达式计算，支持基本运算和数学函数',
            parameters: {
                type: 'object',
                properties: {
                    expression: {
                        type: 'string',
                        description: '数学表达式，例如: 2+3*4, Math.sqrt(16), Math.pow(2,10)'
                    }
                },
                required: ['expression']
            },
            execute: ({ expression }) => {
                try {
                    const mathNames = [
                        'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp',
                        'floor', 'log', 'max', 'min', 'pow', 'round', 'sin', 'sqrt',
                        'tan', 'PI', 'E'
                    ];
                    const safeExpression = String(expression || '').replace(/\bMath\./g, '');
                    if (!/^[0-9+\-*/().,%\sA-Za-z_]+$/.test(safeExpression)) {
                        throw new Error('unsupported characters in expression');
                    }
                    const identifiers = safeExpression.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
                    const allowed = new Set(mathNames);
                    identifiers.forEach(name => {
                        if (!allowed.has(name)) {
                            throw new Error(`unsupported identifier: ${name}`);
                        }
                    });

                    const result = new Function(...mathNames, `"use strict"; return (${safeExpression});`)(
                        ...mathNames.map(name => Math[name])
                    );
                    return String(result);
                } catch (e) {
                    return `计算错误: ${e.message}`;
                }
            }
        });





        // 随机数生成
        this.register({
            name: 'random_number',
            description: '生成指定范围内的随机整数',
            parameters: {
                type: 'object',
                properties: {
                    min: {
                        type: 'integer',
                        description: '最小值（包含）'
                    },
                    max: {
                        type: 'integer',
                        description: '最大值（包含）'
                    }
                },
                required: ['min', 'max']
            },
            execute: ({ min, max }) => {
                return String(Math.floor(Math.random() * (max - min + 1)) + min);
            }
        });

        // 字符统计
        this.register({
            name: 'text_analysis',
            description: '分析文本的字符统计信息',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要分析的文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => {
                const chars = text.length;
                const words = text.trim().split(/\s+/).filter(w => w).length;
                const lines = text.split('\n').length;
                const letters = (text.match(/[a-zA-Z]/g) || []).length;
                const digits = (text.match(/\d/g) || []).length;
                const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

                return JSON.stringify({
                    总字符数: chars,
                    单词数: words,
                    行数: lines,
                    字母数: letters,
                    数字数: digits,
                    中文字符数: chinese
                }, null, 2);
            }
        });

        // ========== 新增工具 ==========











        // UUID 生成
        this.register({
            name: 'uuid_generate',
            description: '生成一个随机 UUID',
            parameters: {
                type: 'object',
                properties: {}
            },
            execute: () => {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
        });



        // 单位换算
        this.register({
            name: 'unit_convert',
            description: '常用单位换算（长度、重量、温度等）',
            parameters: {
                type: 'object',
                properties: {
                    value: {
                        type: 'number',
                        description: '要转换的数值'
                    },
                    from_unit: {
                        type: 'string',
                        description: '原单位 (m/km/mi/ft/kg/lb/g/oz/c/f/k)'
                    },
                    to_unit: {
                        type: 'string',
                        description: '目标单位'
                    }
                },
                required: ['value', 'from_unit', 'to_unit']
            },
            execute: ({ value, from_unit, to_unit }) => {
                const conversions = {
                    // 长度 (转为米)
                    'm': 1, 'km': 1000, 'mi': 1609.344, 'ft': 0.3048, 'in': 0.0254, 'cm': 0.01,
                    // 重量 (转为克)
                    'g': 1, 'kg': 1000, 'lb': 453.592, 'oz': 28.3495,
                };

                const fromLower = from_unit.toLowerCase();
                const toLower = to_unit.toLowerCase();

                // 温度特殊处理
                if (['c', 'f', 'k'].includes(fromLower) && ['c', 'f', 'k'].includes(toLower)) {
                    let celsius;
                    if (fromLower === 'c') celsius = value;
                    else if (fromLower === 'f') celsius = (value - 32) * 5 / 9;
                    else celsius = value - 273.15;

                    let result;
                    if (toLower === 'c') result = celsius;
                    else if (toLower === 'f') result = celsius * 9 / 5 + 32;
                    else result = celsius + 273.15;

                    return `${value} ${from_unit} = ${result.toFixed(2)} ${to_unit}`;
                }

                // 其他单位
                if (conversions[fromLower] && conversions[toLower]) {
                    const baseValue = value * conversions[fromLower];
                    const result = baseValue / conversions[toLower];
                    return `${value} ${from_unit} = ${result.toFixed(4)} ${to_unit}`;
                }

                return '不支持的单位转换';
            }
        });

        // ========== 网络爬虫与深度研究工具 ==========

        this.register({
            name: 'community_snapshot',
            description: 'Dedicated community dashboard fetcher for Hacker News, GitHub Trending, V2EX, Reddit r/programming, Lobsters, and Product Hunt. Use this FIRST for broad community scans because it avoids GitHub JS-rendering issues and common Reddit/WAF failures better than generic read_webpage/open_url.',
            parameters: {
                type: 'object',
                properties: {
                    sources: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional sources: hackernews, github, v2ex, reddit, lobsters, producthunt. Omit for all.'
                    },
                    limit: {
                        type: 'integer',
                        description: 'Items per source, usually 15-20 for research-grade community scans.'
                    }
                }
            },
            metadata: {
                package: 'community_tools',
                risk: 'network_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 45000,
                maxOutputChars: 32000,
                cachePolicy: 'per_run',
                retryPolicy: 'once',
                networkAccess: true,
                projectAccess: 'none',
                owner: 'backend',
                sourceKind: 'community_snapshot',
                tags: ['community', 'snapshot', 'current']
            },
            execute: async ({ sources = [], limit = 20 }) => {
                try {
                    const response = await this.fetchWithAbort(`${this.getApiBase()}/community_snapshot`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sources, limit })
                    });
                    const text = await response.text();
                    let result;
                    try {
                        result = JSON.parse(text);
                    } catch (parseError) {
                        return `社区快照失败: HTTP ${response.status} ${response.statusText} - ${text.slice(0, 300)}`;
                    }
                    if (!response.ok) {
                        return `社区快照失败: HTTP ${response.status} ${response.statusText} - ${result.message || text.slice(0, 300)}`;
                    }
                    return result.success ? result.data : `社区快照失败: ${result.message || '后端未返回错误详情'}`;
                } catch (e) {
                    return `社区快照请求失败: ${e.message}`;
                }
            }
        });

        this.register({
            name: 'web_research',
            description: 'Grok/Gemini-style web research with first-hand source expansion. Search query variants run in bounded parallel batches; each query fans out to search engines in parallel, then top pages are deep-read in parallel. Use depth="fast" only for a quick source map, and depth="deep" read_top=true for research-grade final evidence. For any current information, market, policy, report, or news question, prefer first_hand_news, official_policy, institution_report, academic_primary, and community_original evidence over section_fallback pages. Never use Baidu. Treat HTTP 451/403/429 as source access-blocked, not as absence of evidence; when blocked, continue with site: search snippets, alternate first-hand reports, official sources, or community originals before finalizing.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Main user question or search intent'
                    },
                    queries: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional 2-6 query variants covering official docs, news, community discussions, academic/paper sources, region-specific terms, or site-targeted primary-source searches'
                    },
                    mode: {
                        type: 'string',
                        enum: ['auto', 'news', 'news_brief', 'technical', 'academic', 'community', 'market'],
                        description: 'Research mode. Use news_brief for broad daily news briefings; otherwise use auto unless a narrower mode clearly fits.'
                    },
                    depth: {
                        type: 'string',
                        enum: ['fast', 'deep'],
                        description: 'fast returns deduplicated source candidates only; deep also reads top sources in parallel for evidence passages. Use fast for maps, deep for evidence.'
                    },
                    max_results: {
                        type: 'integer',
                        description: 'Maximum deduplicated sources to return. Use 32-40 for broad research and evidence-heavy answers.'
                    },
                    read_top: {
                        type: 'boolean',
                        description: 'Whether to deep-read the top sources and return evidence passages. Default true.'
                    },
                    focus_keyword: {
                        type: 'string',
                        description: 'Keywords to focus deep reading on. Use important entities, dates, product names, or claims.'
                    }
                },
                required: ['query']
            },
            metadata: {
                package: 'research_tools',
                risk: 'network_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 120000,
                maxOutputChars: 80000,
                cachePolicy: 'per_run',
                retryPolicy: 'once',
                networkAccess: true,
                projectAccess: 'none',
                owner: 'backend',
                sourceKind: 'search_and_optional_read',
                tags: ['research', 'search', 'evidence']
            },
            execute: async ({ query, queries = [], mode = 'auto', depth = 'deep', max_results = 40, read_top, focus_keyword = '' }) => {
                try {
                    const normalizedDepth = depth === 'deep' ? 'deep' : 'fast';
                    const effectiveReadTop = typeof read_top === 'boolean' ? read_top : normalizedDepth === 'deep';
                    const parsedMaxResults = Number(max_results);
                    const requestedMaxResults = Number.isFinite(parsedMaxResults) ? Math.floor(parsedMaxResults) : 40;
                    const effectiveMaxResults = effectiveReadTop
                        ? Math.max(32, Math.min(requestedMaxResults, 40))
                        : Math.max(16, Math.min(requestedMaxResults, 40));
                    const endpoint = effectiveReadTop ? '/research/deep' : '/research/fast';
                    const response = await this.fetchWithAbort(`${this.getApiBase()}${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query,
                            queries,
                            mode,
                            max_results: effectiveMaxResults,
                            read_top: effectiveReadTop,
                            depth: effectiveReadTop ? 'deep' : 'fast',
                            focus_keyword: focus_keyword || query
                        })
                    });
                    const result = await response.json();
                    return result.success ? result.data : `聚合检索失败: ${result.message}`;
                } catch (e) {
                    return `聚合检索请求失败: ${e.message}`;
                }
            }
        });

        // 搜索引擎搜索 (多步搜索第一步)
        this.register({
            name: 'search_urls',
            description: '使用搜索引擎获取相关网页链接。用于补充 web_research 的第二轮精确查询，尤其适合 site:reuters.com、site:bloomberg.com、site:cnbc.com、site:cls.cn、site:sec.gov、site:pbc.gov.cn、site:coinshares.com、site:glassnode.com、site:reddit.com 等一手源/政策/研报/社区定向检索。',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: '搜索关键词'
                    }
                },
                required: ['query']
            },
            metadata: {
                package: 'research_tools',
                risk: 'network_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 45000,
                maxOutputChars: 40000,
                cachePolicy: 'per_run',
                retryPolicy: 'once',
                networkAccess: true,
                projectAccess: 'none',
                owner: 'backend',
                sourceKind: 'search_candidates',
                tags: ['search', 'urls']
            },
            execute: async ({ query }) => {
                try {
                    const response = await this.fetchWithAbort(`${this.getApiBase()}/search_urls`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query })
                    });
                    const result = await response.json();
                    return result.success ? result.data : `搜索失败: ${result.message}`;
                } catch (e) {
                    return `搜索请求失败: ${e.message}`;
                }
            }
        });

        // 深度读取网页全文 (多步搜索第二步)
        this.register({
            name: 'read_webpage',
            description: '深度抓取指定网页并返回结构化正文与读取状态。可直接打开 Reuters/AP/CNBC/Bloomberg/财联社/政策页/研报/论文/社区原帖等权威 URL；返回 read_method、source_tier、article_like、section_fallback、blocked、http_status 等字段。HTTP 451/403/429 表示访问受限，需要继续用搜索结果、官方公告、替代一手源或社区原帖交叉验证。',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: '要获取全文的网页URL'
                    },
                    focus_keyword: {
                        type: 'string',
                        description: '(可选) 关注的关键词。如果提供，将只返回网页中包含此关键词的相关段落，避免长文本丢失核心信息。'
                    },
                    chunk_index: {
                        type: 'integer',
                        description: '(可选) 分页读取时的文本块索引，默认 0。文章太长被截断时，可以递增此值继续读取下一段。'
                    }
                },
                required: ['url']
            },
            metadata: {
                package: 'research_tools',
                risk: 'network_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 45000,
                maxOutputChars: 32000,
                cachePolicy: 'per_run',
                retryPolicy: 'once',
                networkAccess: true,
                projectAccess: 'none',
                owner: 'backend',
                sourceKind: 'opened_page',
                tags: ['read', 'webpage', 'evidence']
            },
            execute: async ({ url, focus_keyword = '', chunk_index = 0 }) => {
                try {
                    const response = await this.fetchWithAbort(`${this.getApiBase()}/read_webpage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, focus_keyword, chunk_index })
                    });
                    const result = await response.json();
                    return result.success ? result.data : `获取网页失败: ${result.message}`;
                } catch (e) {
                    return `请求失败: ${e.message}`;
                }
            }
        });

        // 获取天气
        this.register({
            name: 'get_weather',
            description: '获取指定城市的实时天气和预报信息',
            parameters: {
                type: 'object',
                properties: {
                    city: {
                        type: 'string',
                        description: '城市名称（支持中文）'
                    },
                    detailed: {
                        type: 'boolean',
                        description: '是否获取详细预报（默认为false）'
                    }
                },
                required: ['city']
            },
            execute: async ({ city, detailed = false }) => {
                try {
                    const response = await this.fetchWithAbort(`${this.getApiBase()}/weather`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ city, detailed })
                    });
                    const result = await response.json();
                    return result.success ? result.data : `获取天气失败: ${result.message}`;
                } catch (e) {
                    return `请求失败: ${e.message}`;
                }
            }
        });

        this.register({
            name: 'list_files',
            description: 'List files and directories inside the project workspace.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Project-relative directory path' },
                    depth: { type: 'integer', description: 'Directory depth, max 6' }
                }
            },
            metadata: {
                package: 'project_read_tools',
                risk: 'project_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 15000,
                maxOutputChars: 16000,
                cachePolicy: 'none',
                retryPolicy: 'none',
                networkAccess: false,
                projectAccess: 'read',
                owner: 'backend',
                tags: ['project', 'filesystem', 'list']
            },
            execute: async ({ path = '.', depth = 2 }) => {
                const response = await this.fetchWithAbort(`${this.getProjectApiBase()}/list_files`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, depth })
                });
                const result = await response.json();
                return result.success ? result.data : `List files failed: ${result.message}`;
            }
        });

        this.register({
            name: 'read_file',
            description: 'Read a UTF-8 text file from the project workspace.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Project-relative file path' }
                },
                required: ['path']
            },
            metadata: {
                package: 'project_read_tools',
                risk: 'project_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 15000,
                maxOutputChars: 24000,
                cachePolicy: 'none',
                retryPolicy: 'none',
                networkAccess: false,
                projectAccess: 'read',
                owner: 'backend',
                tags: ['project', 'filesystem', 'read']
            },
            execute: async ({ path }) => {
                const response = await this.fetchWithAbort(`${this.getProjectApiBase()}/read_file`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path })
                });
                const result = await response.json();
                return result.success ? result.data : `Read file failed: ${result.message}`;
            }
        });

        this.register({
            name: 'search_files',
            description: 'Search project text files for a keyword and return matching file paths and line numbers.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Text to search for' },
                    path: { type: 'string', description: 'Project-relative directory path' }
                },
                required: ['query']
            },
            metadata: {
                package: 'project_read_tools',
                risk: 'project_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 20000,
                maxOutputChars: 16000,
                cachePolicy: 'none',
                retryPolicy: 'none',
                networkAccess: false,
                projectAccess: 'read',
                owner: 'backend',
                tags: ['project', 'filesystem', 'search']
            },
            execute: async ({ query, path = '.' }) => {
                const response = await this.fetchWithAbort(`${this.getProjectApiBase()}/search_files`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, path })
                });
                const result = await response.json();
                return result.success ? result.data : `Search files failed: ${result.message}`;
            }
        });

        this.register({
            name: 'file_info',
            description: 'Get metadata for a project file or directory.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Project-relative path' }
                },
                required: ['path']
            },
            metadata: {
                package: 'project_read_tools',
                risk: 'project_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 10000,
                maxOutputChars: 8000,
                cachePolicy: 'none',
                retryPolicy: 'none',
                networkAccess: false,
                projectAccess: 'read',
                owner: 'backend',
                tags: ['project', 'filesystem', 'metadata']
            },
            execute: async ({ path }) => {
                const response = await this.fetchWithAbort(`${this.getProjectApiBase()}/file_info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path })
                });
                const result = await response.json();
                return result.success ? result.data : `File info failed: ${result.message}`;
            }
        });

        this.register({
            name: 'news_query',
            description: 'Search recent news by keyword and optional category.',
            parameters: {
                type: 'object',
                properties: {
                    keyword: { type: 'string', description: 'News keyword' },
                    category: { type: 'string', description: 'Optional category such as tech, finance, politics' }
                }
            },
            execute: async ({ keyword = '', category = '' }) => {
                const response = await this.fetchWithAbort(`${this.getApiBase()}/news`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keyword, category })
                });
                const result = await response.json();
                return result.success ? result.data : `News query failed: ${result.message}`;
            }
        });

        this.register({
            name: 'finance_query',
            description: 'Get a current market quote for a symbol. US stocks may be provided as AAPL or aapl.us.',
            parameters: {
                type: 'object',
                properties: {
                    symbol: { type: 'string', description: 'Ticker symbol' }
                },
                required: ['symbol']
            },
            execute: async ({ symbol }) => {
                const response = await this.fetchWithAbort(`${this.getApiBase()}/finance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol })
                });
                const result = await response.json();
                return result.success ? result.data : `Finance query failed: ${result.message}`;
            }
        });

        this.register({
            name: 'agent_earth_run',
            description: [
                'Run AgentEarth as a professional external tool aggregator inside the same AgentRun.',
                'Use it together with local/web/market tools for live external data, local services, travel, multimedia creation, social/news intelligence, business intelligence, and broad specialist-tool tasks.',
                'For international news/search failures or blocked sources, use AgentEarth as the fallback aggregator and let it choose tools for X/Twitter, Reuters, Bloomberg, Google News, BrightData/news extraction, Facebook, YouTube, Reddit, finance data, and other available platforms.',
                'The backend handles AgentEarth recommend -> execute ordering and returns the selected professional tool result.'
            ].join(' '),
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Natural-language task for AgentEarth. Keep it specific and include user constraints.'
                    },
                    task_context: {
                        type: 'string',
                        description: 'Optional compact context from attachments or prior AgentRun state. Omit unless relevant.'
                    },
                    preferred_tool_name: {
                        type: 'string',
                        description: 'Optional preferred recommended tool name when the task clearly calls for one.'
                    },
                    arguments: {
                        type: 'object',
                        description: 'Optional params to pass to the selected AgentEarth tool when obvious from the user request.'
                    },
                    max_attempts: {
                        type: 'integer',
                        description: 'How many recommended AgentEarth candidates to try. Use 0 or omit for all recommended candidates.'
                    }
                },
                required: ['query']
            },
            metadata: {
                package: 'agent_earth_tools',
                risk: 'network_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 70000,
                maxOutputChars: 24000,
                cachePolicy: 'per_run',
                retryPolicy: 'none',
                networkAccess: true,
                projectAccess: 'none',
                owner: 'backend',
                sourceKind: 'external_tool_result',
                tags: ['agentearth', 'external', 'specialist-tools']
            },
            execute: async ({ query, task_context = '', preferred_tool_name = '', arguments: args = {}, max_attempts = 0 }) => {
                const response = await this.fetchWithAbort(`${this.getAgentEarthApiBase()}/run`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query,
                        task_context,
                        preferred_tool_name,
                        arguments: args,
                        max_attempts
                    })
                }, 70000);
                const result = await response.json();
                return result.success ? result.data : `AgentEarth run failed: ${result.message}`;
            }
        });

        this.register({
            name: 'run_tests',
            description: 'Run the backend Maven test command from a fixed whitelist.',
            parameters: { type: 'object', properties: {} },
            metadata: {
                package: 'project_exec_tools',
                risk: 'project_exec',
                sideEffect: true,
                requiresApproval: true,
                approvalMode: 'interactive_gate_v1',
                impact: 'Runs backend Maven tests through the fixed backend_test whitelist command.',
                timeoutMs: 90000,
                maxOutputChars: 16000,
                cachePolicy: 'none',
                retryPolicy: 'none',
                networkAccess: false,
                projectAccess: 'exec',
                owner: 'backend',
                enabledByDefault: false,
                tags: ['project', 'exec', 'test', 'maven']
            },
            execute: async () => {
                const response = await this.fetchWithAbort(`${this.getProjectApiBase()}/run_command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: 'backend_test' })
                });
                const result = await response.json();
                return result.success ? result.data : `Run tests failed: ${result.message}`;
            }
        });

        this.register({
            name: 'run_build',
            description: 'Run the backend Maven package command from a fixed whitelist.',
            parameters: { type: 'object', properties: {} },
            metadata: {
                package: 'project_exec_tools',
                risk: 'project_exec',
                sideEffect: true,
                requiresApproval: true,
                approvalMode: 'interactive_gate_v1',
                impact: 'Runs backend Maven package with -DskipTests through the fixed backend_build whitelist command.',
                timeoutMs: 90000,
                maxOutputChars: 16000,
                cachePolicy: 'none',
                retryPolicy: 'none',
                networkAccess: false,
                projectAccess: 'exec',
                owner: 'backend',
                enabledByDefault: false,
                tags: ['project', 'exec', 'build', 'maven']
            },
            execute: async () => {
                const response = await this.fetchWithAbort(`${this.getProjectApiBase()}/run_command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: 'backend_build' })
                });
                const result = await response.json();
                return result.success ? result.data : `Run build failed: ${result.message}`;
            }
        });

        this.register({
            name: 'propose_patch',
            description: 'Return a patch proposal for review. This tool does not modify files.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Target project-relative path' },
                    summary: { type: 'string', description: 'Change summary' },
                    patch: { type: 'string', description: 'Unified diff or clear edit proposal' }
                },
                required: ['path', 'patch']
            },
            metadata: {
                package: 'patch_proposal_tools',
                risk: 'project_read',
                sideEffect: false,
                requiresApproval: false,
                timeoutMs: 15000,
                maxOutputChars: 16000,
                cachePolicy: 'none',
                retryPolicy: 'none',
                networkAccess: false,
                projectAccess: 'read',
                owner: 'backend',
                impact: 'Returns a patch proposal only; it does not modify files.',
                tags: ['project', 'patch', 'proposal']
            },
            execute: async ({ path, summary = '', patch }) => {
                const response = await this.fetchWithAbort(`${this.getProjectApiBase()}/propose_patch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, summary, patch })
                });
                const result = await response.json();
                return result.success ? result.data : `Patch proposal failed: ${result.message}`;
            }
        });
    }

    /**
     * 注册工具
     * @param {Object} tool - { name, description, parameters, execute, metadata? }
     */
    register(tool) {
        const normalized = window.AgentContract?.normalizeToolContract
            ? window.AgentContract.normalizeToolContract(tool)
            : this.normalizeToolContractFallback(tool);
        this.tools.set(normalized.name, normalized);
    }

    /**
     * 获取工具定义列表（用于 API 调用）
     * @returns {Array}
     */
    getToolDefinitions(selectedNames = null) {
        const selected = Array.isArray(selectedNames) ? new Set(selectedNames) : null;
        const definitions = [];
        this.tools.forEach((tool, name) => {
            if (selected && !selected.has(name)) return;
            definitions.push({
                type: 'function',
                function: {
                    name: name,
                    description: tool.description,
                    parameters: tool.parameters
                }
            });
        });
        return definitions;
    }

    /**
     * 获取工具契约列表（用于 Agent 运行记录和后续治理，不影响 API tools schema）
     * @param {Array<string>|null} selectedNames
     * @returns {Array}
     */
    getToolContracts(selectedNames = null) {
        const selected = Array.isArray(selectedNames) ? new Set(selectedNames) : null;
        const contracts = [];
        this.tools.forEach((tool, name) => {
            if (selected && !selected.has(name)) return;
            contracts.push(tool.contract || {
                name,
                package: tool.metadata?.package || 'core_tools',
                description: tool.description || '',
                inputSchema: tool.parameters || { type: 'object', properties: {} },
                risk: tool.metadata?.risk || 'safe_read',
                sideEffect: Boolean(tool.metadata?.sideEffect),
                requiresApproval: Boolean(tool.metadata?.requiresApproval)
            });
        });
        return contracts;
    }

    /**
     * 获取单个工具的元数据
     * @param {string} name
     * @returns {Object|null}
     */
    getToolMetadata(name) {
        const tool = this.tools.get(name);
        return tool?.metadata || null;
    }

    /**
     * 执行工具
     * @param {string} name - 工具名称
     * @param {Object} args - 工具参数
     * @returns {Promise<string>}
     */
    async execute(name, args) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`未知工具: ${name}`);
        }

        try {
            this.validateToolArgs(tool, args || {});
            const timeoutMs = Number(tool.metadata?.timeoutMs) || 30000;
            const result = await this.withTimeout(Promise.resolve().then(() => tool.execute(args)), timeoutMs, name);
            return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (e) {
            throw new Error(`工具执行失败: ${e.message}`);
        }
    }

    validateToolArgs(tool, args = {}) {
        const required = Array.isArray(tool?.parameters?.required) ? tool.parameters.required : [];
        required.forEach(key => {
            const value = args?.[key];
            if (value === undefined || value === null || value === '') {
                throw new Error(`${key} is required`);
            }
        });
    }

    withTimeout(promise, timeoutMs, name) {
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
        let timer = null;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => {
                reject(new Error(`${name} timed out after ${Math.round(timeoutMs / 1000)}s`));
            }, timeoutMs);
        });
        return Promise.race([promise, timeout]).finally(() => {
            if (timer) clearTimeout(timer);
        });
    }

    /**
     * 检查工具是否存在
     * @param {string} name
     * @returns {boolean}
     */
    has(name) {
        return this.tools.has(name);
    }

    /**
     * 获取所有工具名称
     * @returns {Array<string>}
     */
    getToolNames() {
        return Array.from(this.tools.keys());
    }

    normalizeToolContractFallback(tool) {
        const projectExec = new Set(['run_tests', 'run_build']);
        const projectRead = new Set(['list_files', 'read_file', 'search_files', 'file_info', 'propose_patch']);
        const networkRead = new Set([
            'community_snapshot',
            'web_research',
            'search_urls',
            'read_webpage',
            'get_weather',
            'news_query',
            'finance_query',
            'agent_earth_run'
        ]);
        const metadata = {
            package: projectExec.has(tool.name)
                ? 'project_exec_tools'
                : projectRead.has(tool.name)
                    ? tool.name === 'propose_patch' ? 'patch_proposal_tools' : 'project_read_tools'
                    : networkRead.has(tool.name)
                        ? tool.name === 'community_snapshot' ? 'community_tools' : tool.name === 'finance_query' ? 'market_tools' : 'research_tools'
                        : 'core_tools',
            risk: projectExec.has(tool.name)
                ? 'project_exec'
                : projectRead.has(tool.name)
                    ? 'project_read'
                    : networkRead.has(tool.name)
                        ? 'network_read'
                        : 'safe_read',
            sideEffect: projectExec.has(tool.name),
            requiresApproval: projectExec.has(tool.name),
            approvalMode: projectExec.has(tool.name) ? 'interactive_gate_v1' : 'none',
            timeoutMs: projectExec.has(tool.name) ? 90000 : networkRead.has(tool.name) ? 45000 : 5000,
            maxInputChars: 6000,
            maxOutputChars: projectExec.has(tool.name) || projectRead.has(tool.name) ? 16000 : 12000,
            networkAccess: networkRead.has(tool.name),
            projectAccess: projectExec.has(tool.name) ? 'exec' : projectRead.has(tool.name) ? 'read' : 'none',
            owner: projectExec.has(tool.name) || projectRead.has(tool.name) || networkRead.has(tool.name) ? 'backend' : 'frontend',
            enabledByDefault: !projectExec.has(tool.name),
            ...(tool.metadata || {})
        };
        return {
            ...tool,
            metadata,
            contract: {
                name: tool.name,
                package: metadata.package,
                description: tool.description || '',
                inputSchema: tool.parameters || { type: 'object', properties: {} },
                outputSchema: tool.outputSchema || null,
                risk: metadata.risk,
                sideEffect: metadata.sideEffect,
                requiresApproval: metadata.requiresApproval,
                timeoutMs: metadata.timeoutMs,
                maxInputChars: metadata.maxInputChars,
                maxOutputChars: metadata.maxOutputChars,
                networkAccess: metadata.networkAccess,
                projectAccess: metadata.projectAccess,
                owner: metadata.owner,
                enabledByDefault: metadata.enabledByDefault
            }
        };
    }
}

// 导出单例
window.toolRegistry = new ToolRegistry();