// 文件名: cipher_bridge_auto.js

// 1. 【配置清单】
const CIPHER_MANIFEST = {
    "Caesar": {
        desc: "凯撒密码 (Caesar Cipher)",
        args: [{ name: "shift", type: "integer", desc: "偏移量 (整数)" }]
    },
    "Vigenere": {
        desc: "维吉尼亚密码 (Vigenere Cipher)",
        args: [{ name: "key", type: "string", desc: "密钥单词 (如 key)" }]
    },
    "RailFence": {
        desc: "栅栏密码 (Rail Fence Cipher)",
        args: [{ name: "rails", type: "integer", desc: "栏数/层数 (整数)" }]
    },
    "AtBash": {
        desc: "埃特巴什码 (AtBash Cipher)",
        args: [] 
    },
    "MorseCode": {
        desc: "摩尔斯电码 (Morse Code)",
        args: []
    },
    "PhoneKeyCipher": {
        desc: "手机九键密码 (Phone Keypad)",
        args: []
    },
    "QweCipher": {
        desc: "QWE键盘密码",
        args: []
    },
    "VowelCipher": {
        desc: "元音密码 (Vowel Cipher)",
        args: []
    },
    "BaconCipher": {
        desc: "培根密码 (Bacon Cipher)",
        args: []
    },
    "RotCipher": { 
        targetObj: "ROTCipher", 
        desc: "ROT旋转密码 (ROT5/13/18/47)",
        args: [{ name: "type", type: "string", enum: ["char","dec","hex","oct"], desc: "ROT类型 (char=ROT5, dec=ROT13)" }]
    }
};

// 全局容器
window.Generated_Local_Tools = {};
window.Generated_Tools_Schema = [];

// 【核心修复】获取全局变量的辅助函数
// 因为 const 定义的变量不在 window 上，我们需要从全局作用域直接抓取
function getGlobalVar(name) {
    if (window[name]) return window[name];
    try {
        // 尝试直接访问全局作用域中的变量
        return eval(name); 
    } catch (e) {
        return undefined;
    }
}

// 2. 【自动化工厂】
function initAutoBridge() {
    console.log("🛠️ [System] 正在初始化数字军火库...");
    
    // 清空旧数据，防止重复加载
    window.Generated_Local_Tools = {};
    window.Generated_Tools_Schema = [];

    Object.entries(CIPHER_MANIFEST).forEach(([name, config]) => {
        const realObjName = config.targetObj || name;
        
        // 使用修复后的函数获取对象
        const cipherObj = getGlobalVar(realObjName);

        if (!cipherObj) {
            console.warn(`⚠️ [Skip] 无法找到全局对象: ${realObjName}。请检查 1_cipherlab.js 是否正确加载。`);
            return;
        }

        const toolName = `${name.toLowerCase()}_tool`;

        // --- A. 构造执行逻辑 ---
        window.Generated_Local_Tools[toolName] = function(params) {
            const { text, mode, ...extras } = params;
            
            let mainArg = undefined;
            if (config.args && config.args.length > 0) {
                const argDef = config.args[0];
                mainArg = extras[argDef.name];
                if (argDef.type === 'integer') mainArg = parseInt(mainArg, 10);
            }

            try {
                if (mode === 'encrypt') {
                    return mainArg !== undefined ? cipherObj.e(text, mainArg) : cipherObj.e(text);
                } else {
                    return mainArg !== undefined ? cipherObj.d(text, mainArg) : cipherObj.d(text);
                }
            } catch (err) {
                return `❌ 执行错误: ${err.message}`;
            }
        };

        // --- B. 构造 Schema (说明书) ---
        const schema = {
            type: "function",
            function: {
                name: toolName,
                description: `【本地工具】使用 ${config.desc} 对文本进行处理。`,
                parameters: {
                    type: "object",
                    properties: {
                        text: { type: "string", description: "需要处理的文本内容" },
                        mode: { type: "string", enum: ["encrypt", "decrypt"], description: "模式：加密(encrypt) 或 解密(decrypt)" }
                    },
                    required: ["text", "mode"]
                }
            }
        };

        config.args.forEach(arg => {
            schema.function.parameters.properties[arg.name] = {
                type: arg.type === 'integer' ? 'integer' : 'string',
                description: arg.desc
            };
            if (arg.enum) schema.function.parameters.properties[arg.name].enum = arg.enum;
            schema.function.parameters.required.push(arg.name);
        });

        window.Generated_Tools_Schema.push(schema);
        console.log(`✅ [Loaded] ${config.desc} -> ${toolName}`);
    });

    // --- C. 特殊处理 BaseConverter ---
    const baseObj = getGlobalVar('BaseConverter');
    if (baseObj) {
        const toolName = "base_converter_tool";
        window.Generated_Local_Tools[toolName] = ({ input, fromBase, toBase }) => {
            return baseObj.convert(input, parseInt(fromBase), parseInt(toBase));
        };
        window.Generated_Tools_Schema.push({
            type: "function",
            function: {
                name: toolName,
                description: "【本地工具】任意进制转换 (Base Converter)。",
                parameters: {
                    type: "object",
                    properties: {
                        input: { type: "string", description: "输入的数字字符串" },
                        fromBase: { type: "integer", description: "源进制 (如 10, 16, 2)" },
                        toBase: { type: "integer", description: "目标进制 (如 2, 8, 36)" }
                    },
                    required: ["input", "fromBase", "toBase"]
                }
            }
        });
        console.log(`✅ [Loaded] 进制转换 -> ${toolName}`);
    }

    console.log(`🚀 初始化完成，共装载 ${window.Generated_Tools_Schema.length} 个智能工具。`);
}

// 确保在 DOM 加载后执行
document.addEventListener('DOMContentLoaded', () => {
    // 延时执行，确保 1_cipherlab.js 已经完全解析
    setTimeout(initAutoBridge, 800); 
});