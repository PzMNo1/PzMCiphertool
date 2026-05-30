/**
 * ToolRegistry - 工具注册表模块
 * 负责注册、管理和执行可用工具
 */

class ToolRegistry {
    constructor() {
        this.tools = new Map();

        // 动态获取后端 API 基础路径
        this.getApiBase = () => {
            return `${this.getLocalBackendBase()}/api/crawler`;
        };

        this.getProjectApiBase = () => {
            return `${this.getLocalBackendBase()}/api/project`;
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
            description: '获取当前时间，包含日期和时间',
            parameters: {
                type: 'object',
                properties: {}
            },
            execute: () => {
                return new Date().toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
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
                    // 安全的数学计算（只允许数学相关操作）
                    const safeExpression = expression.replace(/[^0-9+\-*/().%\s]|(?<!Math)\./g, (match) => {
                        if (match === 'Math.') return match;
                        if (/[a-zA-Z]/.test(match)) return '';
                        return match;
                    });

                    // 使用 Function 构造器在受限环境执行
                    const result = new Function('Math', `return ${expression}`)(Math);
                    return String(result);
                } catch (e) {
                    return `计算错误: ${e.message}`;
                }
            }
        });

        // 凯撒密码加解密
        this.register({
            name: 'caesar_cipher',
            description: '使用凯撒密码进行加密或解密',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要加密或解密的文本'
                    },
                    shift: {
                        type: 'integer',
                        description: '偏移量，正数为加密，负数为解密'
                    }
                },
                required: ['text', 'shift']
            },
            execute: ({ text, shift }) => {
                return text.split('').map(char => {
                    if (char.match(/[a-z]/i)) {
                        const code = char.charCodeAt(0);
                        const base = code >= 65 && code <= 90 ? 65 : 97;
                        return String.fromCharCode(((code - base + shift + 26) % 26) + base);
                    }
                    return char;
                }).join('');
            }
        });

        // Base64 编解码
        this.register({
            name: 'base64_encode',
            description: 'Base64 编码',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要编码的文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => {
                try {
                    return btoa(unescape(encodeURIComponent(text)));
                } catch (e) {
                    return `编码错误: ${e.message}`;
                }
            }
        });

        this.register({
            name: 'base64_decode',
            description: 'Base64 解码',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要解码的 Base64 文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => {
                try {
                    return decodeURIComponent(escape(atob(text)));
                } catch (e) {
                    return `解码错误: ${e.message}`;
                }
            }
        });

        // 摩尔斯电码
        this.register({
            name: 'morse_encode',
            description: '将文本转换为摩尔斯电码',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要转换的文本（只支持字母和数字）'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => {
                const morseCode = {
                    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
                    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
                    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
                    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
                    'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
                    '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
                    '8': '---..', '9': '----.', ' ': '/'
                };
                return text.toUpperCase().split('').map(c => morseCode[c] || c).join(' ');
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

        // 摩尔斯电码解码
        this.register({
            name: 'morse_decode',
            description: '将摩尔斯电码转换为文本',
            parameters: {
                type: 'object',
                properties: {
                    morse: {
                        type: 'string',
                        description: '摩尔斯电码，用空格分隔字符，用/分隔单词'
                    }
                },
                required: ['morse']
            },
            execute: ({ morse }) => {
                const morseToChar = {
                    '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
                    '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
                    '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
                    '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
                    '-.--': 'Y', '--..': 'Z', '-----': '0', '.----': '1', '..---': '2',
                    '...--': '3', '....-': '4', '.....': '5', '-....': '6', '--...': '7',
                    '---..': '8', '----.': '9', '/': ' '
                };
                return morse.split(' ').map(code => morseToChar[code] || code).join('');
            }
        });

        // ROT13 加解密
        this.register({
            name: 'rot13',
            description: 'ROT13 加密/解密（字母偏移13位，加密和解密是同一操作）',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要处理的文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => {
                return text.replace(/[a-zA-Z]/g, char => {
                    const code = char.charCodeAt(0);
                    const base = code >= 65 && code <= 90 ? 65 : 97;
                    return String.fromCharCode(((code - base + 13) % 26) + base);
                });
            }
        });

        // 十六进制编码
        this.register({
            name: 'hex_encode',
            description: '将文本转换为十六进制编码',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要编码的文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => {
                return Array.from(text).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
            }
        });

        // 十六进制解码
        this.register({
            name: 'hex_decode',
            description: '将十六进制编码转换为文本',
            parameters: {
                type: 'object',
                properties: {
                    hex: {
                        type: 'string',
                        description: '十六进制字符串（可用空格分隔）'
                    }
                },
                required: ['hex']
            },
            execute: ({ hex }) => {
                try {
                    const clean = hex.replace(/\s/g, '');
                    let result = '';
                    for (let i = 0; i < clean.length; i += 2) {
                        result += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
                    }
                    return result;
                } catch (e) {
                    return `解码错误: ${e.message}`;
                }
            }
        });

        // URL 编码
        this.register({
            name: 'url_encode',
            description: 'URL 编码',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要编码的文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => encodeURIComponent(text)
        });

        // URL 解码
        this.register({
            name: 'url_decode',
            description: 'URL 解码',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要解码的URL编码文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => {
                try {
                    return decodeURIComponent(text);
                } catch (e) {
                    return `解码错误: ${e.message}`;
                }
            }
        });

        // 文本反转
        this.register({
            name: 'reverse_text',
            description: '反转文本字符顺序',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要反转的文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => [...text].reverse().join('')
        });

        // Atbash 密码
        this.register({
            name: 'atbash_cipher',
            description: 'Atbash 密码（字母表反转：A↔Z, B↔Y...）',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要加密/解密的文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => {
                return text.replace(/[a-zA-Z]/g, char => {
                    const code = char.charCodeAt(0);
                    if (code >= 65 && code <= 90) {
                        return String.fromCharCode(90 - (code - 65));
                    } else {
                        return String.fromCharCode(122 - (code - 97));
                    }
                });
            }
        });

        // 维吉尼亚密码
        this.register({
            name: 'vigenere_cipher',
            description: '维吉尼亚密码加密或解密',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要处理的文本'
                    },
                    key: {
                        type: 'string',
                        description: '密钥（只含字母）'
                    },
                    decrypt: {
                        type: 'boolean',
                        description: '是否解密（true=解密，false=加密）'
                    }
                },
                required: ['text', 'key']
            },
            execute: ({ text, key, decrypt = false }) => {
                const keyUpper = key.toUpperCase().replace(/[^A-Z]/g, '');
                if (!keyUpper) return '错误: 密钥必须包含字母';

                let keyIndex = 0;
                return text.replace(/[a-zA-Z]/g, char => {
                    const code = char.charCodeAt(0);
                    const base = code >= 65 && code <= 90 ? 65 : 97;
                    const shift = keyUpper.charCodeAt(keyIndex % keyUpper.length) - 65;
                    keyIndex++;
                    const newCode = decrypt
                        ? ((code - base - shift + 26) % 26) + base
                        : ((code - base + shift) % 26) + base;
                    return String.fromCharCode(newCode);
                });
            }
        });

        // 二进制转换
        this.register({
            name: 'binary_convert',
            description: '文本与二进制互转',
            parameters: {
                type: 'object',
                properties: {
                    input: {
                        type: 'string',
                        description: '要转换的内容'
                    },
                    to_binary: {
                        type: 'boolean',
                        description: 'true=文本转二进制, false=二进制转文本'
                    }
                },
                required: ['input', 'to_binary']
            },
            execute: ({ input, to_binary }) => {
                if (to_binary) {
                    return Array.from(input).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
                } else {
                    try {
                        return input.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join('');
                    } catch (e) {
                        return `转换错误: ${e.message}`;
                    }
                }
            }
        });

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

        // 简单哈希（非加密用途）
        this.register({
            name: 'hash_text',
            description: '计算文本的简单哈希值（用于校验，非加密安全）',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '要计算哈希的文本'
                    }
                },
                required: ['text']
            },
            execute: ({ text }) => {
                let hash = 0;
                for (let i = 0; i < text.length; i++) {
                    const char = text.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return `Hash: ${Math.abs(hash).toString(16).padStart(8, '0')}`;
            }
        });

        // 字母频率分析
        this.register({
            name: 'frequency_analysis',
            description: '分析文本中字母出现的频率',
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
                const freq = {};
                const letters = text.toUpperCase().match(/[A-Z]/g) || [];
                letters.forEach(c => freq[c] = (freq[c] || 0) + 1);

                const sorted = Object.entries(freq)
                    .sort((a, b) => b[1] - a[1])
                    .map(([char, count]) => `${char}: ${count} (${(count / letters.length * 100).toFixed(1)}%)`)
                    .join('\n');

                return sorted || '无字母字符';
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
            description: 'Grok/Gemini-style web research. Use depth="fast" only for a quick source map when the source landscape is unclear, and depth="deep" read_top=true for research-grade final evidence. For broad daily news briefings, use mode="news_brief", request max_results 28-32, and cover domestic, international, finance/markets, technology/science, and society/sports/culture. Never use Baidu. For academic/paper questions, prefer primary-source queries targeting arXiv, Nature, Science, Optica/OSA, IEEE, ACM, PubMed, official journals, and then read the best sources directly.',
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
                        description: 'Maximum deduplicated sources to return. Use 28-32 for broad research and evidence-heavy answers.'
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
                maxOutputChars: 60000,
                cachePolicy: 'per_run',
                retryPolicy: 'once',
                networkAccess: true,
                projectAccess: 'none',
                owner: 'backend',
                sourceKind: 'search_and_optional_read',
                tags: ['research', 'search', 'evidence']
            },
            execute: async ({ query, queries = [], mode = 'auto', depth = 'deep', max_results = 32, read_top, focus_keyword = '' }) => {
                try {
                    const normalizedDepth = depth === 'deep' ? 'deep' : 'fast';
                    const effectiveReadTop = typeof read_top === 'boolean' ? read_top : normalizedDepth === 'deep';
                    const parsedMaxResults = Number(max_results);
                    const requestedMaxResults = Number.isFinite(parsedMaxResults) ? Math.floor(parsedMaxResults) : 32;
                    const effectiveMaxResults = effectiveReadTop
                        ? Math.max(28, Math.min(requestedMaxResults, 32))
                        : Math.max(16, Math.min(requestedMaxResults, 32));
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
            description: '使用搜索引擎获取相关网页链接。用于补充 web_research 的第二轮精确查询，或执行 site:arxiv.org / site:nature.com / site:opg.optica.org 等权威源定向检索。',
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
                maxOutputChars: 32000,
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
            description: '深度抓取指定网页并返回结构化的 Markdown 格式全文。可直接打开已知权威源 URL，例如 arXiv、Nature、Science、Optica、IEEE、ACM、PubMed、官方文档或论文页面；长文章支持切片与语义过滤。',
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
                maxOutputChars: 24000,
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

        // 站内漫游与深度点击
        this.register({
            name: 'click_link',
            description: '点击并深度读取网页底部的相关文章或页面中的任何链接。用于顺藤摸瓜，实现多轮的信息溯源挖掘。',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: '要想深入挖掘的新网页链接'
                    }
                },
                required: ['url']
            },
            execute: async ({ url }) => {
                try {
                    const response = await this.fetchWithAbort(`${this.getApiBase()}/read_webpage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        // 复用 read_webpage 接口以获取全文 Markdown
                        body: JSON.stringify({ url, focus_keyword: '', chunk_index: 0 })
                    });
                    const result = await response.json();
                    return result.success ? result.data : `页面抓取失败: ${result.message}`;
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
            name: 'search_query',
            description: 'Search the web for current information and return result URLs, titles, and snippets.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query' }
                },
                required: ['query']
            },
            execute: async ({ query }) => {
                const response = await this.fetchWithAbort(`${this.getApiBase()}/search_urls`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                const result = await response.json();
                return result.success ? result.data : `Search failed: ${result.message}`;
            }
        });

        this.register({
            name: 'open_url',
            description: 'Open a URL and return readable page content as markdown-like text.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to open' },
                    focus_keyword: { type: 'string', description: 'Optional keyword to focus returned passages' },
                    chunk_index: { type: 'integer', description: 'Optional chunk index for long pages' }
                },
                required: ['url']
            },
            execute: async ({ url, focus_keyword = '', chunk_index = 0 }) => {
                const response = await this.fetchWithAbort(`${this.getApiBase()}/read_webpage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, focus_keyword, chunk_index })
                });
                const result = await response.json();
                return result.success ? result.data : `Open URL failed: ${result.message}`;
            }
        });

        this.register({
            name: 'find_in_page',
            description: 'Find passages in a URL that match a keyword or phrase.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to search within' },
                    pattern: { type: 'string', description: 'Keyword or phrase to find' }
                },
                required: ['url', 'pattern']
            },
            execute: async ({ url, pattern }) => {
                const response = await this.fetchWithAbort(`${this.getApiBase()}/read_webpage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, focus_keyword: pattern, chunk_index: 0 })
                });
                const result = await response.json();
                return result.success ? result.data : `Find failed: ${result.message}`;
            }
        });

        this.register({
            name: 'open',
            description: 'Codex-style alias for open_url. Open a URL and return readable content.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to open' },
                    focus_keyword: { type: 'string', description: 'Optional keyword to focus returned passages' },
                    chunk_index: { type: 'integer', description: 'Optional chunk index for long pages' }
                },
                required: ['url']
            },
            execute: async (args) => this.execute('open_url', args)
        });

        this.register({
            name: 'find',
            description: 'Codex-style alias for find_in_page. Find matching passages in a URL.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to search within' },
                    pattern: { type: 'string', description: 'Keyword or phrase to find' }
                },
                required: ['url', 'pattern']
            },
            execute: async (args) => this.execute('find_in_page', args)
        });

        this.register({
            name: 'get_time',
            description: 'Get the current time for a UTC offset such as +08:00 or -05:00.',
            parameters: {
                type: 'object',
                properties: {
                    utc_offset: { type: 'string', description: 'UTC offset, for example +08:00' }
                },
                required: ['utc_offset']
            },
            execute: ({ utc_offset }) => {
                const match = String(utc_offset || '').match(/^([+-])(\d{2}):?(\d{2})$/);
                if (!match) return 'Invalid utc_offset. Use +08:00 format.';
                const sign = match[1] === '+' ? 1 : -1;
                const minutes = sign * (Number(match[2]) * 60 + Number(match[3]));
                const date = new Date(Date.now() + minutes * 60 * 1000);
                return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ` UTC${utc_offset}`);
            }
        });

        this.register({
            name: 'time',
            description: 'Codex-style alias for get_time.',
            parameters: {
                type: 'object',
                properties: {
                    utc_offset: { type: 'string', description: 'UTC offset, for example +08:00' }
                },
                required: ['utc_offset']
            },
            execute: async (args) => this.execute('get_time', args)
        });

        this.register({
            name: 'weather',
            description: 'Codex-style alias for get_weather.',
            parameters: {
                type: 'object',
                properties: {
                    city: { type: 'string', description: 'City name' },
                    detailed: { type: 'boolean', description: 'Whether to return detailed forecast' }
                },
                required: ['city']
            },
            execute: async (args) => this.execute('get_weather', args)
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
            name: 'update_plan',
            description: 'Create or update a concise visible task plan for a multi-step agent run.',
            parameters: {
                type: 'object',
                properties: {
                    steps: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                step: { type: 'string' },
                                status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
                            },
                            required: ['step', 'status']
                        }
                    }
                },
                required: ['steps']
            },
            execute: ({ steps }) => {
                return JSON.stringify({ plan: steps }, null, 2);
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
            const timeoutMs = Number(tool.metadata?.timeoutMs) || 30000;
            const result = await this.withTimeout(Promise.resolve().then(() => tool.execute(args)), timeoutMs, name);
            return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (e) {
            throw new Error(`工具执行失败: ${e.message}`);
        }
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
            'click_link',
            'get_weather',
            'search_query',
            'open_url',
            'find_in_page',
            'open',
            'find',
            'weather',
            'news_query',
            'finance_query'
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
            cachePolicy: networkRead.has(tool.name) ? 'per_run' : 'none',
            retryPolicy: networkRead.has(tool.name) ? 'once' : 'none',
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
                cachePolicy: metadata.cachePolicy,
                retryPolicy: metadata.retryPolicy,
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
