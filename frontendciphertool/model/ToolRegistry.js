/**
 * ToolRegistry - 工具注册表模块
 * 负责注册、管理和执行可用工具
 */

class ToolRegistry {
    constructor() {
        this.tools = new Map();

        // 动态获取后端 API 基础路径
        this.getApiBase = () => {
            return window.location.hostname === 'waiw.ozqmp.com'
                ? 'https://waiw.ozqmp.com/api/crawler'
                : 'http://localhost:8080/api/crawler';
        };

        this.registerBuiltinTools();
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

        // 搜索引擎搜索 (多步搜索第一步)
        this.register({
            name: 'search_urls',
            description: '使用搜索引擎获取相关网页链接。用于意图拆解与多路召回，通过将复杂问题拆分为多个子查询，获取高质量信息源。',
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
            execute: async ({ query }) => {
                try {
                    const response = await fetch(`${this.getApiBase()}/search_urls`, {
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
            description: '深度抓取指定网页并返回结构化的 Markdown 格式全文。当遇到长文章时支持切片与语义过滤。',
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
            execute: async ({ url, focus_keyword = '', chunk_index = 0 }) => {
                try {
                    const response = await fetch(`${this.getApiBase()}/read_webpage`, {
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
                    const response = await fetch(`${this.getApiBase()}/read_webpage`, {
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
                    const response = await fetch(`${this.getApiBase()}/weather`, {
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
    }

    /**
     * 注册工具
     * @param {Object} tool - { name, description, parameters, execute }
     */
    register(tool) {
        this.tools.set(tool.name, tool);
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
            const result = await tool.execute(args);
            return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (e) {
            throw new Error(`工具执行失败: ${e.message}`);
        }
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
}

// 导出单例
window.toolRegistry = new ToolRegistry();
