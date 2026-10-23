// workflow.js — 可视化卡片连线工作流引擎
function initWorkflowCoze() {
    const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));

    const splitParam = (param, defaults = [], separator = '|') => {
        const parts = String(param ?? '').split(separator).map(p => p.trim());
        return defaults.map((def, i) => parts[i] !== undefined && parts[i] !== '' ? parts[i] : def);
    };

    const normalizeCipherInput = value => String(value ?? '').replace(/\r\n?/g, '\n').replace(/\n/g, ' ');

    const irreversible = () => '不可逆';

    const hashResult = async (cipher, input, node) => {
        if (node.useHmac) {
            const key = node.hmacKey || '';
            return cipher.hmac ? await cipher.hmac(key, input) : '不支持HMAC';
        }
        return await cipher.e(input);
    };

    const BaseConverterWorkflow = {
        e: (t, p) => {
            const [fromBase, toBase] = splitParam(p, ['36', '10'], ',');
            return BaseConverter.convert(t, parseInt(fromBase, 10) || 36, parseInt(toBase, 10) || 10);
        },
        d: (t, p) => {
            const [fromBase, toBase] = splitParam(p, ['36', '10'], ',');
            return BaseConverter.convert(t, parseInt(toBase, 10) || 10, parseInt(fromBase, 10) || 36);
        }
    };

    const ASCIIWorkflow = {
        e: (t, p) => {
            const [inputType, outputType] = splitParam(p, ['char', 'dec'], ',');
            return ASCIIHandler.convert(t, inputType, outputType);
        },
        d: (t, p) => {
            const [inputType, outputType] = splitParam(p, ['char', 'dec'], ',');
            return ASCIIHandler.convert(t, outputType, inputType);
        }
    };

    const PolybiusWorkflow = {
        e: (t, p) => {
            const [alpha, rows, columns] = splitParam(p, ['abcdefghiklmnopqrstuvwxyz', '12345', '12345']);
            return PolybiusCipher.e(t, alpha, rows, columns);
        },
        d: (t, p) => {
            const [alpha, rows, columns] = splitParam(p, ['abcdefghiklmnopqrstuvwxyz', '12345', '12345']);
            return PolybiusCipher.d(t, alpha, rows, columns);
        }
    };

    const ADFGXWorkflow = {
        e: (t, p) => {
            const [alpha, keyword, type] = splitParam(p, ['abcdefghiklmnopqrstuvwxyz', 'password', 'ADFGX']);
            return ADFGXCipher.ect(t, alpha, keyword, type);
        },
        d: (t, p) => {
            const [alpha, keyword, type] = splitParam(p, ['abcdefghiklmnopqrstuvwxyz', 'password', 'ADFGX']);
            return ADFGXCipher.dpt(t, alpha, keyword, type);
        }
    };

    const AffineWorkflow = {
        e: (t, p) => {
            const [alpha, a, b] = splitParam(p, ['abcdefghijklmnopqrstuvwxyz', '5', '8']);
            return Affine.e(t, alpha, parseInt(a, 10) || 5, parseInt(b, 10) || 8);
        },
        d: (t, p) => {
            const [alpha, a, b] = splitParam(p, ['abcdefghijklmnopqrstuvwxyz', '5', '8']);
            return Affine.d(t, alpha, parseInt(a, 10) || 5, parseInt(b, 10) || 8);
        }
    };

    const TapCodeWorkflow = {
        e: (t, p) => {
            const [tapMark, groupMark, letterMark] = splitParam(p, ['.', 'a', 'b']);
            return TapCode.e(t, tapMark, groupMark, letterMark);
        },
        d: (t, p) => {
            const [tapMark, groupMark, letterMark] = splitParam(p, ['.', 'a', 'b']);
            return TapCode.d(t, tapMark, groupMark, letterMark);
        }
    };

    const QiyuWorkflow = {
        e: (t, p) => {
            const type = String(p || 'semaphore').toLowerCase();
            const table = type === 'braille' ? charToBraille : charToSemaphore;
            return [...String(t).toUpperCase()].map(c => table[c] ?? `?${c}`).join(' ');
        },
        d: (t, p) => {
            const type = String(p || 'semaphore').toLowerCase();
            const table = type === 'braille' ? brailleMap : semaphoreMap;
            return String(t).trim().split(/\s+/).map(code => table[parseInt(code, 10)] || '').join('');
        }
    };

    const VigenereBeaufortWorkflow = {
        e: (t, p) => Vigenere.beaufort(t, p),
        d: (t, p) => Vigenere.beaufort(t, p)
    };

    const VigenereVariantBeaufortWorkflow = {
        e: (t, p) => Vigenere.variantBeaufortE(t, p),
        d: (t, p) => Vigenere.variantBeaufortD(t, p)
    };

    const VigenereAutokeyWorkflow = {
        e: (t, p) => Vigenere.autokeyE(t, p),
        d: (t, p) => Vigenere.autokeyD(t, p)
    };

    const GronsfeldWorkflow = {
        e: (t, p) => Vigenere.gronsfeldE(t, p),
        d: (t, p) => Vigenere.gronsfeldD(t, p)
    };

    const PortaWorkflow = {
        e: (t, p) => Vigenere.porta(t, p),
        d: (t, p) => Vigenere.porta(t, p)
    };

    const RouteTranspositionWorkflow = {
        e: (t, p) => TranspositionVariants.routeE(t, p),
        d: (t, p) => TranspositionVariants.routeD(t, p)
    };

    const ScytaleWorkflow = {
        e: (t, p) => TranspositionVariants.scytaleE(t, p),
        d: (t, p) => TranspositionVariants.scytaleD(t, p)
    };

    const AMSCOWorkflow = {
        e: (t, p) => {
            const [key, cols] = splitParam(p, ['3142', '3']);
            return TranspositionVariants.amscoE(t, key, parseInt(cols, 10) || 3);
        },
        d: (t, p) => {
            const [key, cols] = splitParam(p, ['3142', '3']);
            return TranspositionVariants.amscoD(t, key, parseInt(cols, 10) || 3);
        }
    };

    const MyszkowskiWorkflow = {
        e: (t, p) => TranspositionVariants.myszkowskiE(t, p),
        d: (t, p) => TranspositionVariants.myszkowskiD(t, p)
    };

    const SubstitutionWorkflow = {
        run: (t, p) => {
            const [plainAlphabet, cipherAlphabet, manual, cribCipher, cribPlain] = splitParam(
                p,
                ['abcdefghijklmnopqrstuvwxyz', 'qwertyuiopasdfghjklzxcvbnm', '', '', '']
            );
            return SubstitutionTools.analyze(t, plainAlphabet, cipherAlphabet, manual, cribCipher, cribPlain);
        }
    };

    const HillWorkflow = {
        e: (t, p) => {
            const [key, size] = splitParam(p, ['3 3 2 5', '2']);
            return HillCipher.run(t, key, size, false);
        },
        d: (t, p) => {
            const [key, size] = splitParam(p, ['3 3 2 5', '2']);
            return HillCipher.run(t, key, size, true);
        }
    };

    const EnigmaWorkflow = {
        e: (t, p) => EnigmaWorkflow.run(t, p),
        d: (t, p) => EnigmaWorkflow.run(t, p),
        run(t, p) {
            const [modelName, reflector, rotors, positions, rings, plugboard] = splitParam(
                p,
                ['M3', 'UKW-B', 'I,II,III', '1,1,1', '1,1,1', 'bq cr di ej kw mt os']
            );
            const model = EnigmaEncoder.getModel(modelName) || EnigmaEncoder.getModel('M3');
            const enigma = new EnigmaEncoder();
            enigma.setSettingValue('model', model.name);
            enigma.applyModel(model.name);
            const reflectorName = EnigmaEncoder.getRotor(reflector) ? reflector : `UKW-${reflector}`;
            if (reflector && EnigmaEncoder.getRotor(reflectorName)) enigma.setSettingValue('reflector', reflectorName);
            rotors.split(',').map(s => s.trim()).forEach((rotor, i) => {
                if (rotor) enigma.setSettingValue(`rotor${i + 1}`, rotor);
            });
            positions.split(',').map(s => parseInt(s, 10) || 1).forEach((position, i) => {
                enigma.setSettingValue(`position${i + 1}`, position);
            });
            rings.split(',').map(s => parseInt(s, 10) || 1).forEach((ring, i) => {
                enigma.setSettingValue(`ring${i + 1}`, ring);
            });
            if (model.plugboard) enigma.setSettingValue('plugboard', plugboard);
            enigma.setSettingValue('includeForeignChars', true);
            return enigma.encode(new StringContent(String(t).toLowerCase())).getString();
        }
    };

    const nodeField = (node, key, fallback = '') => {
        const value = node && node.params ? node.params[key] : undefined;
        return value === undefined || value === null || value === '' ? fallback : value;
    };

    const ChineseCodeWorkflow = tab => ({
        e: text => CCCHandler.encodeText(tab, text),
        d: text => CCCHandler.decodeText(tab, text)
    });

    const inputFormatOptions = [['text', '输入文本'], ['hex', '输入 Hex'], ['base64', '输入 Base64']];
    const outputFormatOptions = [['hex', '输出 Hex'], ['base64', '输出 Base64'], ['text', '输出文本']];

    const cipherMap = {
        'Caesar凯撒': { obj: Caesar, paramId: 'shift', def: 3, pType: 'number' },
        'Vigenere维吉尼亚': { obj: Vigenere, paramId: 'key', def: 'KEY', pType: 'text' },
        'RailFence栅栏': { obj: RailFence, paramId: 'rails', def: 3, pType: 'number' },
        'Bifid双歧': { obj: Bifid, paramId: 'key', def: 'abc', pType: 'text' },
        'AtBash埃特巴什': { obj: { e: AtBash.e, d: AtBash.e }, pType: 'none' },
        'BaseConverter进制': { obj: BaseConverterWorkflow, paramId: 'fromTo', def: '36,10', pType: 'text' },
        'Morse摩尔斯': { obj: MorseCode, pType: 'none' },
        'PhoneKey九键': { obj: PhoneKeyCipher, pType: 'none' },
        'Beale比尔': { obj: { e: () => '暂不支持加密', d: BealeCipher.e }, paramId: 'key', def: '', pType: 'text' },
        'Fanqie反切': { obj: FanqieCipher, pType: 'none' },
        'Bacon培根': { obj: BaconCipher, pType: 'none' },
        'QWE键盘': { obj: QweCipher, pType: 'none' },
        'DNA_mRNA': { obj: DnaCipher, pType: 'none' },
        'VKeyboard': { obj: VKeyboardCipher, pType: 'none' },
        'Cipher01248': { obj: Cipher01248, pType: 'none' },
        'Vowel元音': { obj: VowelCipher, pType: 'none' },
        'ASCII': { obj: ASCIIWorkflow, paramId: 'inputOutput', def: 'char,dec', pType: 'text' },
        'Base编码': { obj: baseCipher, paramId: 'type', def: 'base64', pType: 'text' },
        'ROT旋转': { obj: { e: ROTCipher.e, d: ROTCipher.e }, paramId: 'type', def: 'dec', pType: 'text' },
        'CCC中文电码': { obj: { e: CCCHandler.e.bind(CCCHandler), d: CCCHandler.d.bind(CCCHandler) }, pType: 'none' },
        'FourCCC四角号码': { obj: { e: fourCCCHandler.e.bind(fourCCCHandler), d: fourCCCHandler.d.bind(fourCCCHandler) }, pType: 'none' },
        'Polybius方阵': { obj: PolybiusWorkflow, paramId: 'alphaRowsColumns', def: 'abcdefghiklmnopqrstuvwxyz|12345|12345', pType: 'text' },
        'ADFGX/ADFVGX': { obj: ADFGXWorkflow, paramId: 'alphaKeywordType', def: 'abcdefghiklmnopqrstuvwxyz|password|ADFGX', pType: 'text' },
        'Affine仿射': { obj: AffineWorkflow, paramId: 'alphaAB', def: 'abcdefghijklmnopqrstuvwxyz|5|8', pType: 'text' },
        'TapCode敲击码': { obj: TapCodeWorkflow, paramId: 'marks', def: '.|a|b', pType: 'text' },
        'SemaphoreBraille旗语盲文': { obj: QiyuWorkflow, paramId: 'type', def: 'semaphore', pType: 'text' },
        'A1Z26': { obj: A1Z26Cipher, paramId: 'mode', def: 'a1', pType: 'text' },
        'Beaufort': { obj: VigenereBeaufortWorkflow, paramId: 'key', def: 'KEY', pType: 'text' },
        'Variant Beaufort': { obj: VigenereVariantBeaufortWorkflow, paramId: 'key', def: 'KEY', pType: 'text' },
        'Autokey Vigenere': { obj: VigenereAutokeyWorkflow, paramId: 'key', def: 'KEY', pType: 'text' },
        'Gronsfeld': { obj: GronsfeldWorkflow, paramId: 'digits', def: '31415', pType: 'text' },
        'Porta': { obj: PortaWorkflow, paramId: 'key', def: 'KEY', pType: 'text' },
        'Route Transposition': { obj: RouteTranspositionWorkflow, paramId: 'cols', def: 3, pType: 'number' },
        'Scytale': { obj: ScytaleWorkflow, paramId: 'cols', def: 3, pType: 'number' },
        'AMSCO': { obj: AMSCOWorkflow, paramId: 'keyCols', def: '3142|3', pType: 'text' },
        'Myszkowski': { obj: MyszkowskiWorkflow, paramId: 'key', def: 'BALLOON', pType: 'text' },
        'Playfair': { obj: PlayfairCipher, paramId: 'key', def: 'keyword', pType: 'text' },
        'Substitution Analysis': { run: (input, node) => SubstitutionWorkflow.run(input, node.param), pType: 'text', def: 'abcdefghijklmnopqrstuvwxyz|qwertyuiopasdfghjklzxcvbnm|||', noMode: true },
        'Hill Cipher': { obj: HillWorkflow, paramId: 'keySize', def: '3 3 2 5|2', pType: 'text' },
        'MD5': { run: (input, node) => hashResult(MD5Cipher, input, node), obj: { e: MD5Cipher.e, d: irreversible }, pType: 'none', hmac: true, hmacDef: '12 3a bc' },
        'SHA-1': { run: (input, node) => hashResult(SHA1Cipher, input, node), obj: { e: SHA1Cipher.e, d: irreversible }, pType: 'none', hmac: true, hmacDef: '12 3a bc' },
        'SHA-256': { run: (input, node) => hashResult(SHA256Cipher, input, node), obj: { e: SHA256Cipher.e, d: irreversible }, pType: 'none', hmac: true, hmacDef: '12 3a bc' },
        'SHA-384': { run: (input, node) => hashResult(SHA384Cipher, input, node), obj: { e: SHA384Cipher.e, d: irreversible }, pType: 'none', hmac: true, hmacDef: '12 3a bc' },
        'SHA-512': { run: (input, node) => hashResult(SHA512Cipher, input, node), obj: { e: SHA512Cipher.e, d: irreversible }, pType: 'none', hmac: true, hmacDef: '12 3a bc' },
        'Enigma恩尼格玛': { obj: EnigmaWorkflow, paramId: 'settings', def: 'UKW-B|I,II,III|1,1,1|1,1,1|bq cr di ej kw mt os', pType: 'text', enigma: true, modelDef: 'M3' },
        'ColRail柱栅栏': { obj: ColumnarRailCipher, paramId: 'cols', def: 2, pType: 'number' },
        'WRail-W栅栏': { obj: WShapeRailFenceCipher, paramId: 'rails', def: 3, pType: 'number' },
        '键盘布局': {
            run: (t, n) => KeyboardLayout.process(t, nodeField(n, 'layout', 'dvorak')),
            fields: [{ key: 'layout', type: 'select', def: 'dvorak', label: '布局', options: [['dvorak', 'Dvorak'], ['azerty', 'AZERTY'], ['colemak', 'Colemak']] }],
            noMode: true
        },
        '符号密码': {
            run: (t, n) => {
                const cipher = nodeField(n, 'symbolType', 'pigpen') === 'dancingMen' ? DancingMenCipher : PigpenCipher;
                return cipher[n.mode](t);
            },
            fields: [{ key: 'symbolType', type: 'select', def: 'pigpen', label: '符号类型', options: [['pigpen', 'Pigpen 共济会'], ['dancingMen', '跳舞的小人']] }],
            html: true
        },
        '区位码': { obj: ChineseCodeWorkflow('quwei'), pType: 'none' },
        'GB2312': { obj: ChineseCodeWorkflow('gb2312'), pType: 'none' },
        'GBK': { obj: ChineseCodeWorkflow('gbk'), pType: 'none' },
        'GB18030': { obj: ChineseCodeWorkflow('gb18030'), pType: 'none' },
        '康熙部首': { run: t => CCCHandler.renderRadicalTable(t), pType: 'none', noMode: true },
        'Quagmire': {
            run: (t, n) => Quagmire.run(
                t,
                nodeField(n, 'variant', 'quagmire3'),
                nodeField(n, 'keyA', 'CIPHER'),
                nodeField(n, 'keyB', 'KEYWORD'),
                nodeField(n, 'indicator', 'KEY'),
                n.mode === 'd'
            ),
            fields: [
                { key: 'variant', type: 'select', def: 'quagmire3', label: '变体', options: [['quagmire1', 'Quagmire I'], ['quagmire2', 'Quagmire II'], ['quagmire3', 'Quagmire III'], ['quagmire4', 'Quagmire IV']] },
                { key: 'keyA', def: 'CIPHER', placeholder: '字母表密钥 A' },
                { key: 'keyB', def: 'KEYWORD', placeholder: '字母表密钥 B（仅 IV）' },
                { key: 'indicator', def: 'KEY', placeholder: '指示密钥' }
            ]
        },
        'Web编码': {
            run: (t, n) => WebEncodingCipher.process(t, nodeField(n, 'encoding', 'url')),
            fields: [{ key: 'encoding', type: 'select', def: 'url', label: '编码', options: [['url', 'URL'], ['html', 'HTML Entity'], ['unicode', 'Unicode Escape'], ['uu', 'UUencode'], ['xx', 'XXencode'], ['qp', 'Quoted-Printable']] }],
            noMode: true
        },
        '通用码表': {
            run: (t, n) => CodeTables.process(t, nodeField(n, 'table', 'nato')),
            fields: [{ key: 'table', type: 'select', def: 'nato', label: '码表', options: [['nato', 'NATO 音标'], ['roman', '罗马数字'], ['seven', '七段数码管'], ['element', '元素周期表'], ['music', '音乐唱名'], ['scrabble', 'Scrabble 分值']] }],
            noMode: true
        },
        '书码': {
            run: (t, n) => BookCipher.process(
                t,
                t,
                nodeField(n, 'book', ''),
                nodeField(n, 'bookMode', 'lineWordLetter'),
                String(nodeField(n, 'base', '1')) === '0' ? 0 : 1
            ),
            fields: [
                { key: 'bookMode', type: 'select', def: 'lineWordLetter', label: '索引模式', options: [['lineWordLetter', '行-词-字'], ['wordLetter', '词-字'], ['absolute', '绝对字符位置']] },
                { key: 'base', type: 'select', def: '1', label: '计数基', options: [['1', '1 基'], ['0', '0 基']] },
                { key: 'book', type: 'textarea', def: '', placeholder: '粘贴书文（编码/解码都从这里取索引）' }
            ],
            noMode: true
        },
        'Chaocipher': {
            run: (t, n) => Chaocipher.process(
                t,
                nodeField(n, 'left', 'CHAOBDEFGIJKLMNPQRSTUVWXYZ'),
                nodeField(n, 'right', 'CIPHERABDFGJKLMNOQSTUVWXYZ')
            ),
            fields: [
                { key: 'left', def: 'CHAOBDEFGIJKLMNPQRSTUVWXYZ', placeholder: '左盘字母表（密文）' },
                { key: 'right', def: 'CIPHERABDFGJKLMNOQSTUVWXYZ', placeholder: '右盘字母表（明文）' }
            ],
            noMode: true
        },
        'Morbit': {
            run: (t, n) => MorbitCipher.process(t, nodeField(n, 'key', 'MORSECODE')),
            fields: [{ key: 'key', def: 'MORSECODE', placeholder: '9 字母密钥' }],
            noMode: true
        },
        'Pollux': {
            run: (t, n) => PolluxCipher.process(
                t,
                nodeField(n, 'dot', '047'),
                nodeField(n, 'dash', '158'),
                nodeField(n, 'space', '2369')
            ),
            fields: [
                { key: 'dot', def: '047', placeholder: '点替换字符' },
                { key: 'dash', def: '158', placeholder: '划替换字符' },
                { key: 'space', def: '2369', placeholder: '空格替换字符' }
            ],
            noMode: true
        },
        'Solitaire': {
            run: (t, n) => Solitaire.process(t, nodeField(n, 'key', '')),
            fields: [{ key: 'key', def: '', placeholder: '密钥（留空为初始牌序）' }],
            noMode: true
        },
        'Double Transposition': {
            run: (t, n) => DoubleTransposition.process(t, nodeField(n, 'key1', 'KEY'), nodeField(n, 'key2', 'WORD')),
            fields: [
                { key: 'key1', def: 'KEY', placeholder: '第一层密钥' },
                { key: 'key2', def: 'WORD', placeholder: '第二层密钥' }
            ],
            noMode: true
        },
        'AES': {
            run: (t, n) => AESCipher.process(
                t,
                nodeField(n, 'aesMode', 'CBC'),
                nodeField(n, 'key', '000102030405060708090a0b0c0d0e0f'),
                nodeField(n, 'iv', '000102030405060708090a0b0c0d0e0f'),
                nodeField(n, 'inputFmt', 'text'),
                nodeField(n, 'outputFmt', 'hex'),
                nodeField(n, 'padding', 'pkcs7')
            ),
            fields: [
                { key: 'aesMode', type: 'select', def: 'CBC', label: '模式', options: [['CBC', 'CBC'], ['ECB', 'ECB'], ['CFB', 'CFB'], ['OFB', 'OFB'], ['CTR', 'CTR'], ['GCM', 'GCM']] },
                { key: 'padding', type: 'select', def: 'pkcs7', label: '填充', options: [['pkcs7', 'PKCS7'], ['none', '无填充']] },
                { key: 'inputFmt', type: 'select', def: 'text', label: '输入格式', options: inputFormatOptions },
                { key: 'outputFmt', type: 'select', def: 'hex', label: '输出格式', options: outputFormatOptions },
                { key: 'key', def: '000102030405060708090a0b0c0d0e0f', placeholder: '密钥 hex（16/24/32 字节）' },
                { key: 'iv', def: '000102030405060708090a0b0c0d0e0f', placeholder: 'IV/nonce hex（GCM 12 字节）' }
            ],
            noMode: true
        },
        'RSA': {
            run: (t, n) => RSACipher.process(
                t,
                nodeField(n, 'rsaMode', 'decrypt'),
                nodeField(n, 'n', ''),
                nodeField(n, 'e', '65537'),
                nodeField(n, 'd', ''),
                nodeField(n, 'c', ''),
                nodeField(n, 'e2', ''),
                nodeField(n, 'c2', ''),
                nodeField(n, 'radix', 'dec'),
                nodeField(n, 'dp', ''),
                nodeField(n, 'broadcast', '')
            ),
            fields: [
                { key: 'rsaMode', type: 'select', def: 'decrypt', label: '模式', options: [['decrypt', '解密 / 求明文'], ['encrypt', '加密'], ['smallE', '小 e 开方'], ['commonMod', '共模攻击'], ['wiener', 'Wiener 小 d'], ['fermat', 'Fermat 分解'], ['pollard', 'Pollard 分解'], ['hastad', 'Hastad 广播'], ['dpLeak', 'dp 泄露']] },
                { key: 'radix', type: 'select', def: 'dec', label: '进制', options: [['dec', '十进制'], ['hex', 'Hex']] },
                { key: 'n', def: '', placeholder: 'n' },
                { key: 'e', def: '65537', placeholder: 'e' },
                { key: 'd', def: '', placeholder: 'd' },
                { key: 'c', def: '', placeholder: 'c（解密/攻击用；留空时取主输入）' },
                { key: 'e2', def: '', placeholder: 'e2（共模攻击）' },
                { key: 'c2', def: '', placeholder: 'c2（共模攻击）' },
                { key: 'dp', def: '', placeholder: 'dp（dp 泄露攻击）' },
                { key: 'broadcast', type: 'textarea', def: '', placeholder: 'Hastad：每行 n:c（十进制或 Hex）' }
            ],
            noMode: true
        },
        'MD4': { run: t => HashToolbox.digest('MD4', t), pType: 'none', noMode: true },
        'SHA3-256': { run: t => HashToolbox.digest('SHA3-256', t), pType: 'none', noMode: true },
        'SHA3-512': { run: t => HashToolbox.digest('SHA3-512', t), pType: 'none', noMode: true },
        'RIPEMD-160': { run: t => HashToolbox.digest('RIPEMD-160', t), pType: 'none', noMode: true },
        'SM3': { run: t => HashToolbox.digest('SM3', t), pType: 'none', noMode: true },
        'CRC32': { run: t => HashToolbox.digest('CRC32', t), pType: 'none', noMode: true },
        'JWT': {
            run: (t, n) => JWTTool.process(t, nodeField(n, 'secret', '')),
            fields: [{ key: 'secret', def: '', placeholder: 'HS256/384/512 密钥' }],
            noMode: true
        },
        'PRNG': {
            run: (t, n) => PRNGTool.process(
                t,
                nodeField(n, 'prngMode', 'mt'),
                nodeField(n, 'count', '5'),
                nodeField(n, 'mod', ''),
                nodeField(n, 'a', ''),
                nodeField(n, 'c', '')
            ),
            fields: [
                { key: 'prngMode', type: 'select', def: 'mt', label: '模式', options: [['mt', 'MT19937'], ['lcg', 'LCG']] },
                { key: 'count', type: 'number', def: '5', label: '预测个数' },
                { key: 'mod', def: '', placeholder: 'LCG modulus' },
                { key: 'a', def: '', placeholder: 'LCG a' },
                { key: 'c', def: '', placeholder: 'LCG c' }
            ],
            noMode: true
        },
        'RC4': {
            run: (t, n) => SymmetricCipher.process(
                t, 'RC4', 'ECB',
                nodeField(n, 'key', 'Key'), '',
                nodeField(n, 'inputFmt', 'text'),
                nodeField(n, 'outputFmt', 'hex'),
                'none'
            ),
            fields: [
                { key: 'inputFmt', type: 'select', def: 'text', label: '输入格式', options: inputFormatOptions },
                { key: 'outputFmt', type: 'select', def: 'hex', label: '输出格式', options: outputFormatOptions },
                { key: 'key', def: 'Key', placeholder: 'key（文本或 Hex）' }
            ],
            noMode: true
        },
        'DES': {
            run: (t, n) => SymmetricCipher.process(
                t, 'DES',
                nodeField(n, 'desMode', 'ECB'),
                nodeField(n, 'key', '133457799bbcdff1'),
                nodeField(n, 'iv', '0001020304050607'),
                nodeField(n, 'inputFmt', 'text'),
                nodeField(n, 'outputFmt', 'hex'),
                nodeField(n, 'padding', 'pkcs7')
            ),
            fields: [
                { key: 'desMode', type: 'select', def: 'ECB', label: '模式', options: [['ECB', 'ECB'], ['CBC', 'CBC']] },
                { key: 'inputFmt', type: 'select', def: 'text', label: '输入格式', options: inputFormatOptions },
                { key: 'outputFmt', type: 'select', def: 'hex', label: '输出格式', options: outputFormatOptions },
                { key: 'padding', type: 'select', def: 'pkcs7', label: '填充', options: [['pkcs7', 'PKCS7'], ['none', '无填充']] },
                { key: 'key', def: '133457799bbcdff1', placeholder: 'key（8 字节 Hex）' },
                { key: 'iv', def: '0001020304050607', placeholder: 'IV（8 字节 Hex）' }
            ],
            noMode: true
        },
        '3DES': {
            run: (t, n) => SymmetricCipher.process(
                t, '3DES',
                nodeField(n, 'desMode', 'ECB'),
                nodeField(n, 'key', '0123456789abcdeffedcba9876543210'),
                nodeField(n, 'iv', '0001020304050607'),
                nodeField(n, 'inputFmt', 'text'),
                nodeField(n, 'outputFmt', 'hex'),
                nodeField(n, 'padding', 'pkcs7')
            ),
            fields: [
                { key: 'desMode', type: 'select', def: 'ECB', label: '模式', options: [['ECB', 'ECB'], ['CBC', 'CBC']] },
                { key: 'inputFmt', type: 'select', def: 'text', label: '输入格式', options: inputFormatOptions },
                { key: 'outputFmt', type: 'select', def: 'hex', label: '输出格式', options: outputFormatOptions },
                { key: 'padding', type: 'select', def: 'pkcs7', label: '填充', options: [['pkcs7', 'PKCS7'], ['none', '无填充']] },
                { key: 'key', def: '0123456789abcdeffedcba9876543210', placeholder: 'key（16/24 字节 Hex）' },
                { key: 'iv', def: '0001020304050607', placeholder: 'IV（8 字节 Hex）' }
            ],
            noMode: true
        },
        'ChaCha20': {
            run: (t, n) => SymmetricCipher.process(
                t, 'ChaCha20', 'ECB',
                nodeField(n, 'key', '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'),
                nodeField(n, 'nonce', '000000090000004a00000000'),
                nodeField(n, 'inputFmt', 'text'),
                nodeField(n, 'outputFmt', 'hex'),
                'none'
            ),
            fields: [
                { key: 'inputFmt', type: 'select', def: 'text', label: '输入格式', options: inputFormatOptions },
                { key: 'outputFmt', type: 'select', def: 'hex', label: '输出格式', options: outputFormatOptions },
                { key: 'key', def: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', placeholder: 'key（32 字节 Hex）' },
                { key: 'nonce', def: '000000090000004a00000000', placeholder: 'nonce（12 字节 Hex）' }
            ],
            noMode: true
        },
        'ECDSA': {
            run: (t, n) => ECDSATool.process(
                nodeField(n, 'curve', 'secp256k1'),
                nodeField(n, 'r', ''),
                nodeField(n, 's1', ''),
                nodeField(n, 's2', ''),
                nodeField(n, 'z1', ''),
                nodeField(n, 'z2', ''),
                nodeField(n, 'radix', 'dec')
            ),
            fields: [
                { key: 'curve', type: 'select', def: 'secp256k1', label: '曲线', options: [['secp256k1', 'secp256k1'], ['p256', 'P-256']] },
                { key: 'radix', type: 'select', def: 'dec', label: '进制', options: [['dec', '十进制'], ['hex', 'Hex']] },
                { key: 'r', def: '', placeholder: 'r（两次签名相同）' },
                { key: 's1', def: '', placeholder: 's1' },
                { key: 's2', def: '', placeholder: 's2' },
                { key: 'z1', def: '', placeholder: 'z1（消息哈希）' },
                { key: 'z2', def: '', placeholder: 'z2（消息哈希）' }
            ],
            noMode: true
        },
        'ECC 计算器': {
            run: (t, n) => ECCCalc.process(
                nodeField(n, 'curve', 'secp256k1'),
                nodeField(n, 'eccMode', 'check'),
                nodeField(n, 'radix', 'hex'),
                nodeField(n, 'p', ''),
                nodeField(n, 'a', ''),
                nodeField(n, 'b', ''),
                nodeField(n, 'n', ''),
                nodeField(n, 'px', '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
                nodeField(n, 'py', '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8'),
                nodeField(n, 'qx', ''),
                nodeField(n, 'qy', ''),
                nodeField(n, 'k', '2')
            ),
            fields: [
                { key: 'curve', type: 'select', def: 'secp256k1', label: '曲线', options: [['secp256k1', 'secp256k1'], ['p256', 'P-256'], ['custom', '自定义曲线']] },
                { key: 'eccMode', type: 'select', def: 'check', label: '运算', options: [['check', '曲线/子群检查'], ['mul', '点乘 k·P'], ['add', '点加 P+Q'], ['double', '倍点 2P'], ['neg', '取负 -P']] },
                { key: 'radix', type: 'select', def: 'hex', label: '进制', options: [['hex', 'Hex'], ['dec', '十进制']] },
                { key: 'p', def: '', placeholder: 'p（自定义曲线）' },
                { key: 'a', def: '', placeholder: 'a（自定义曲线）' },
                { key: 'b', def: '', placeholder: 'b（自定义曲线）' },
                { key: 'n', def: '', placeholder: 'n（子群阶，自定义曲线）' },
                { key: 'px', def: '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', placeholder: 'P.x' },
                { key: 'py', def: '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8', placeholder: 'P.y' },
                { key: 'qx', def: '', placeholder: 'Q.x（点加用）' },
                { key: 'qy', def: '', placeholder: 'Q.y（点加用）' },
                { key: 'k', def: '2', placeholder: 'k（点乘用）' }
            ],
            noMode: true
        },
        'XOR 工具': {
            run: (t, n) => AnalyzeTools.xorTool(
                t,
                nodeField(n, 'xorMode', 'single'),
                nodeField(n, 'key', ''),
                nodeField(n, 'maxLen', '32'),
                nodeField(n, 'crib', ''),
                nodeField(n, 'inputMode', 'text')
            ),
            fields: [
                { key: 'xorMode', type: 'select', def: 'single', label: '模式', options: [['single', '单字节枚举'], ['repeat', '重复密钥解密'], ['keylen', '密钥长度（汉明距离）'], ['crib', 'crib drag'], ['many', '多密文两两异或']] },
                { key: 'inputMode', type: 'select', def: 'text', label: '输入格式', options: [['text', '文本'], ['hex', 'Hex'], ['base64', 'Base64']] },
                { key: 'key', def: '', placeholder: '重复密钥（hex 或文本）' },
                { key: 'maxLen', type: 'number', def: '32', label: '最大密钥长度' },
                { key: 'crib', def: '', placeholder: 'crib（已知明文片段）' }
            ],
            noMode: true
        },
        '频率分析': { run: t => AnalyzeTools.frequency(t), pType: 'none', noMode: true },
        'Vigenère 分析': {
            run: (t, n) => AnalyzeTools.vigenereAnalyze(t, nodeField(n, 'maxLen', '20'), nodeField(n, 'key', '')),
            fields: [
                { key: 'maxLen', type: 'number', def: '20', label: '最大密钥长度' },
                { key: 'key', def: '', placeholder: '已知密钥（可选）' }
            ],
            noMode: true
        },
        '换位爆破': {
            run: (t, n) => AnalyzeTools.transpositionBrute(t, nodeField(n, 'max', '10')),
            fields: [{ key: 'max', type: 'number', def: '10', label: '最大层数/列数' }],
            noMode: true
        },
        '索引提取': {
            run: (t, n) => AnalyzeTools.indexExtract(t, nodeField(n, 'indexMode', 'first'), nodeField(n, 'indexN', '1')),
            fields: [
                { key: 'indexMode', type: 'select', def: 'first', label: '读取方式', options: [['first', '每行首字母'], ['last', '每行尾字母'], ['nth', '每行第 n 字'], ['diagonal', '主对角线'], ['antiDiagonal', '副对角线'], ['snake', '蛇形读取'], ['spiral', '螺旋读取'], ['wordLength', '词长'], ['sort', '按行排序'], ['dedup', '去重'], ['reverse', '整体反转']] },
                { key: 'indexN', type: 'number', def: '1', label: 'n' }
            ],
            noMode: true
        },
        '自动解码链': { run: t => AnalyzeTools.autoDecode(t), pType: 'none', noMode: true },
        '谜格': { run: t => AnalyzeTools.mige(t), pType: 'none', noMode: true }
    };

    // === 状态 ===
    let nodes = {};
    let connections = [];
    let nextId = 1;
    let nextConnId = 1;
    let pan = { x: 0, y: 0 };
    let zoom = 1;
    let draggingNode = null;
    let dragOffset = { x: 0, y: 0 };
    let resizingNode = null;
    let resizeStart = null;
    let connecting = null; // { nodeId, port, reverse }
    let selectedNode = null;
    let selectedConn = null;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let connectionsFrame = null;
    let gridFrame = null;

    // === DOM refs ===
    const canvas = document.getElementById('wf-canvas');
    const nodesLayer = document.getElementById('wf-nodes-layer');
    const svg = document.getElementById('wf-svg');
    const tempLine = document.getElementById('wf-temp-line');
    const searchInput = document.getElementById('wf-search');
    if (!canvas) return;

    // Hidden input for sync with cipher/999_funtion.js
    const hiddenInput = document.getElementById('mainInputCoze');

    // === 移动端算法库抽屉 ===
    const toolbar = document.getElementById('wf-toolbar');
    const toolbarToggle = document.getElementById('wf-toolbar-toggle');
    const toolbarClose = document.getElementById('wf-toolbar-close');
    const toolbarBackdrop = document.getElementById('wf-toolbar-backdrop');
    const isMobileWorkflow = () => window.matchMedia('(max-width: 768px)').matches;

    function setToolbarOpen(open) {
        if (!toolbar) return;
        const next = Boolean(open);
        toolbar.classList.toggle('open', next);
        document.body.classList.toggle('wf-drawer-open', next);
        if (toolbarBackdrop) toolbarBackdrop.classList.toggle('active', next);
        if (toolbarToggle) toolbarToggle.setAttribute('aria-expanded', String(next));
    }

    if (toolbarToggle) {
        toolbarToggle.addEventListener('click', event => {
            event.preventDefault();
            setToolbarOpen(!toolbar.classList.contains('open'));
        });
    }
    if (toolbarClose) {
        toolbarClose.addEventListener('click', event => {
            event.preventDefault();
            setToolbarOpen(false);
        });
    }
    if (toolbarBackdrop) {
        toolbarBackdrop.addEventListener('click', () => setToolbarOpen(false));
    }
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') setToolbarOpen(false);
    });

    function requestRenderConnections() {
        if (connectionsFrame) return;
        connectionsFrame = requestAnimationFrame(() => {
            connectionsFrame = null;
            renderConnections();
        });
    }

    function requestDrawGrid() {
        if (gridFrame) return;
        gridFrame = requestAnimationFrame(() => {
            gridFrame = null;
            drawGrid();
        });
    }

    function getNodeNaturalHeight(el) {
        const previousHeight = el.style.height;
        el.style.height = 'auto';
        const height = Math.ceil(el.getBoundingClientRect().height);
        el.style.height = previousHeight;
        return height;
    }

    // === 坐标转换 ===
    function screenToCanvas(sx, sy) {
        const r = canvas.getBoundingClientRect();
        return { x: (sx - r.left - pan.x) / zoom, y: (sy - r.top - pan.y) / zoom };
    }

    // === 获取端口在画布坐标系中的位置 ===
    function getPortPos(nodeId, dir, portName = 'result') {
        const n = nodes[nodeId];
        if (!n) return { x: 0, y: 0 };
        const el = document.getElementById('node-' + nodeId);
        if (!el) return { x: n.x, y: n.y };
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const port = el.querySelector(`.wf-port[data-dir="${dir}"][data-port="${portName}"]`)
            || el.querySelector(dir === 'out' ? '.port-out' : '.port-in');
        if (!port) return { x: n.x + (dir === 'out' ? w : 0), y: n.y + h / 2 };
        // port position relative to the node element
        const px = port.offsetLeft + port.offsetWidth / 2;
        const py = port.offsetTop + port.offsetHeight / 2;
        return { x: n.x + px, y: n.y + py };
    }

    // === 渲染所有连线 ===
    function renderConnections() {
        const existing = new Map(
            Array.from(svg.querySelectorAll('.wf-conn-group')).map(group => [Number(group.dataset.id), group])
        );
        const active = new Set();

        connections.forEach(c => {
            const p1 = getPortPos(c.from, 'out', c.fromPort || 'result');
            const p2 = getPortPos(c.to, 'in');
            const dx = Math.abs(p2.x - p1.x) * 0.5;
            const d = `M${p1.x},${p1.y} C${p1.x + dx},${p1.y} ${p2.x - dx},${p2.y} ${p2.x},${p2.y}`;

            let group = existing.get(c.id);
            if (!group) {
                group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.dataset.id = c.id;
                group.setAttribute('class', 'wf-conn-group');
                ['wf-conn-aura', 'wf-connection', 'wf-conn-core', 'wf-conn-flow'].forEach(className => {
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('class', className);
                    group.appendChild(path);
                });
                group.addEventListener('click', e => {
                    e.stopPropagation();
                    selectedConn = Number(group.dataset.id);
                    selectedNode = null;
                    deselectAll();
                    renderConnections();
                });
                svg.appendChild(group);
            }

            group.querySelectorAll('path').forEach(path => path.setAttribute('d', d));
            group.classList.toggle('selected', selectedConn === c.id);
            active.add(c.id);
        });

        existing.forEach((group, id) => {
            if (!active.has(id)) group.remove();
        });
    }

    // === 计算节点数据 (拓扑) ===
    async function propagate() {
        // Build adjacency
        const inMap = {}; // nodeId -> [{ from, fromPort }]
        connections.forEach(c => {
            if (!inMap[c.to]) inMap[c.to] = [];
            inMap[c.to].push(c);
        });

        // Topo sort
        const visited = new Set();
        const order = [];
        function visit(id) {
            if (visited.has(id)) return;
            visited.add(id);
            (inMap[id] || []).forEach(c => visit(c.from));
            order.push(id);
        }
        Object.keys(nodes).forEach(visit);

        const getNodeOutput = (node, port = 'result') => {
            if (!node) return undefined;
            if (node.outputs && Object.prototype.hasOwnProperty.call(node.outputs, port)) return node.outputs[port];
            return node.value;
        };

        // Process
        for (const id of order) {
            const n = nodes[id];
            if (!n) continue;
            const resEl = document.querySelector(`#node-${id} .wf-node-result .result`);
            const localInputEl = document.querySelector(`#node-${id} .wf-node-input`);
            const localInput = localInputEl ? localInputEl.value : '';

            if (n.type === 'input') {
                n.localInput = localInput;
                n.value = localInput;
                n.outputs = { input: localInput, result: localInput };
                if (resEl) { resEl.textContent = n.value || '等待输入...'; resEl.className = 'result' + (n.value ? '' : ' waiting'); }
                // sync hidden input
                if (hiddenInput) hiddenInput.value = localInput;
            } else if (n.type === 'cipher') {
                const sources = (inMap[id] || []).map(c => getNodeOutput(nodes[c.from], c.fromPort)).filter(v => v !== undefined);
                n.localInput = localInput;
                const rawInput = localInput || sources.join('');
                const input = normalizeCipherInput(rawInput);
                n.inputValue = rawInput;
                if (!rawInput) {
                    n.value = '';
                    n.outputs = { input: '', result: '' };
                    if (resEl) { resEl.textContent = '等待输入...'; resEl.className = 'result waiting'; }
                    continue;
                }
                try {
                    const cfg = cipherMap[n.algorithm];
                    if (!cfg) { n.value = input; if (resEl) { resEl.textContent = input; resEl.className = 'result'; } continue; }
                    let p = n.param || cfg.def || '';
                    if (cfg.enigma) p = `${n.model || cfg.modelDef || 'M3'}|${p}`;
                    if (cfg.pType === 'number') p = parseInt(p) || cfg.def;
                    n.value = cfg.run ? await cfg.run(input, n) : await cfg.obj[n.mode](input, p);
                    n.outputs = { input: rawInput, result: n.value };
                    if (resEl) {
                        if (cfg.html) resEl.innerHTML = n.value;
                        else resEl.textContent = n.value;
                        resEl.className = 'result';
                    }
                } catch (e) {
                    n.value = '';
                    n.outputs = { input, result: '' };
                    if (resEl) { resEl.textContent = '错误: ' + e.message; resEl.className = 'result error'; }
                }
            } else if (n.type === 'output') {
                const sources = (inMap[id] || []).map(c => getNodeOutput(nodes[c.from], c.fromPort)).filter(v => v !== undefined);
                n.localInput = localInput;
                n.value = localInput || sources.join('\n---\n');
                n.outputs = { input: n.value, result: n.value };
                if (resEl) { resEl.textContent = n.value || '等待输入...'; resEl.className = 'result' + (n.value ? '' : ' waiting'); }
            }
        }
    }

    // === 创建节点 DOM ===
    function createNodeEl(n) {
        const el = document.createElement('div');
        el.className = 'wf-node card';
        el.id = 'node-' + n.id;
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
        el.style.width = (n.w || 190) + 'px';
        if (n.h) el.style.height = n.h + 'px';

        const dotClass = n.type === 'input' ? 'input' : n.type === 'output' ? 'output' : 'cipher';
        const titleMap = { input: '📝 输入', output: '📤 输出', cipher: '🔐 ' + (n.algorithm || '') };
        const inputHTML = `<div class="wf-node-field wf-node-input-field"><textarea class="wf-node-input" placeholder="输入文本..." rows="1">${escapeHTML(n.localInput || '')}</textarea></div>`;

        let bodyHTML = '';
        if (n.type === 'input') {
            bodyHTML = `<div class="wf-node-body">${inputHTML}</div>`;
        } else if (n.type === 'cipher') {
            const cfg = cipherMap[n.algorithm] || {};
            const enigmaModelHTML = cfg.enigma
                ? `<div class="wf-node-field"><label>型号</label><select class="wf-enigma-model">${
                    Enigmamodels.map(model => `<option value="${escapeHTML(model.name)}"${(n.model || cfg.modelDef) === model.name ? ' selected' : ''}>${escapeHTML(model.label)}</option>`).join('')
                }</select></div>`
                : '';
            const fieldHTML = (cfg.fields || []).map(field => {
                const value = n.params && n.params[field.key] !== undefined ? n.params[field.key] : (field.def ?? '');
                const title = escapeHTML(field.label || field.placeholder || '参数');
                const key = escapeHTML(field.key);
                if (field.type === 'select') {
                    const options = (field.options || []).map(option => Array.isArray(option) ? option : [option, option]);
                    return `<select class="wf-cipher-param" data-field="${key}" title="${title}">${
                        options.map(([optionValue, optionLabel]) =>
                            `<option value="${escapeHTML(optionValue)}"${String(value) === String(optionValue) ? ' selected' : ''}>${escapeHTML(optionLabel)}</option>`
                        ).join('')
                    }</select>`;
                }
                if (field.type === 'textarea') {
                    return `<textarea class="wf-cipher-param" data-field="${key}" rows="3" title="${title}" placeholder="${escapeHTML(field.placeholder || '')}">${escapeHTML(value)}</textarea>`;
                }
                return `<input type="${field.type === 'number' ? 'number' : 'text'}" class="wf-cipher-param" data-field="${key}" value="${escapeHTML(value)}" title="${title}" placeholder="${escapeHTML(field.placeholder || '参数')}">`;
            }).join('');
            const paramHTML = cfg.fields
                ? fieldHTML
                : (cfg.pType && cfg.pType !== 'none'
                    ? `<div class="wf-node-field"><input type="${cfg.pType === 'number' ? 'number' : 'text'}" value="${escapeHTML(n.param ?? cfg.def ?? '')}" class="wf-cipher-param" placeholder="${cfg.enigma ? '反射器|转子|位置|环|插板' : '参数'}"></div>`
                    : '');
            const hmacHTML = cfg.hmac
                ? `<div class="wf-hmac-panel">
                    <label class="wf-check-row"><input type="checkbox" class="wf-hmac-toggle"${n.useHmac ? ' checked' : ''}> HMAC</label>
                    <input type="text" value="${escapeHTML(n.hmacKey ?? cfg.hmacDef ?? '')}" class="wf-hmac-key" placeholder="HMAC密钥">
                </div>`
                : '';
            const modeHTML = cfg.hmac || cfg.noMode
                ? ''
                : `<div class="wf-node-row"><select class="wf-cipher-mode"><option value="e"${n.mode === 'e' ? ' selected' : ''}>加密</option><option value="d"${n.mode === 'd' ? ' selected' : ''}>解密</option></select></div>`;
            bodyHTML = `<div class="wf-node-body">
                ${inputHTML}
                ${modeHTML}
                ${enigmaModelHTML}
                ${paramHTML}
                ${hmacHTML}
            </div>`;
        } else if (n.type === 'output') {
            bodyHTML = `<div class="wf-node-body">${inputHTML}</div>`;
        }

        const hasIn = n.type === 'cipher' || n.type === 'output';
        const hasOut = n.type === 'cipher' || n.type === 'input';
        const portHTML = n.type === 'cipher'
            ? `
                <div class="wf-port port-in" data-node="${n.id}" data-dir="in" data-port="input" title="输入"></div>
                <div class="wf-port port-out port-out-input" data-node="${n.id}" data-dir="out" data-port="input" title="输出输入文本"></div>
                <div class="wf-port port-out port-out-result" data-node="${n.id}" data-dir="out" data-port="result" title="输出转换结果"></div>
            `
            : `
                ${hasIn ? '<div class="wf-port port-in" data-node="' + n.id + '" data-dir="in" data-port="input"></div>' : ''}
                ${hasOut ? '<div class="wf-port port-out" data-node="' + n.id + '" data-dir="out" data-port="result"></div>' : ''}
            `;

        el.innerHTML = `
            ${portHTML}
            <div class="wf-node-header">
                <span class="wf-node-title"><span class="wf-node-type-dot ${dotClass}"></span>${titleMap[n.type]}</span>
                <button class="wf-node-delete" data-node="${n.id}">✕</button>
            </div>
            ${bodyHTML}
            <div class="wf-node-result"><div class="result waiting">等待...</div></div>
            <div class="wf-resize-handle wf-resize-right" data-dir="e"></div>
            <div class="wf-resize-handle wf-resize-bottom" data-dir="s"></div>
            <div class="wf-resize-handle wf-resize-corner" data-dir="se"></div>
        `;

        // Node drag
        el.addEventListener('mousedown', e => {
            if (e.target.closest('.wf-port') || e.target.closest('.wf-resize-handle') || e.target.closest('textarea') || e.target.closest('input') || e.target.closest('select') || e.target.closest('.wf-node-delete') || e.target.closest('.wf-node-result .result')) return;
            e.stopPropagation();
            draggingNode = n.id;
            const cp = screenToCanvas(e.clientX, e.clientY);
            dragOffset = { x: cp.x - n.x, y: cp.y - n.y };
            el.classList.add('dragging');
            selectNode(n.id);
        });

        el.addEventListener('focusin', e => {
            if (e.target.closest('.wf-node-delete')) return;
            selectNode(n.id);
        });

        el.querySelectorAll('textarea, input, select, .wf-node-result .result').forEach(control => {
            control.addEventListener('mousedown', e => {
                e.stopPropagation();
                selectNode(n.id);
            });
        });

        // Delete
        el.querySelector('.wf-node-delete').addEventListener('click', e => {
            e.stopPropagation();
            deleteNode(n.id);
        });

        // Port: start connection
        el.querySelectorAll('.wf-port').forEach(port => {
            port.addEventListener('mousedown', e => {
                e.stopPropagation();
                e.preventDefault();
                const dir = port.dataset.dir;
                if (dir === 'out') {
                    connecting = { nodeId: n.id, port: port.dataset.port || 'result' };
                    canvas.classList.add('connecting');
                } else if (dir === 'in') {
                    // Allow dragging from input port too — reverse
                    connecting = { nodeId: n.id, reverse: true };
                    canvas.classList.add('connecting');
                }
            });
            port.addEventListener('mouseup', e => {
                e.stopPropagation();
                if (!connecting) return;
                const dir = port.dataset.dir;
                if (connecting.reverse && dir === 'out') {
                    addConnection(n.id, connecting.nodeId, port.dataset.port || 'result');
                } else if (!connecting.reverse && dir === 'in') {
                    addConnection(connecting.nodeId, n.id, connecting.port || 'result');
                }
                connecting = null;
                canvas.classList.remove('connecting');
                tempLine.setAttribute('d', '');
            });
        });

        el.querySelectorAll('.wf-resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
                resizingNode = n.id;
                resizeStart = {
                    dir: handle.dataset.dir,
                    x: e.clientX,
                    y: e.clientY,
                    w: el.offsetWidth,
                    h: el.offsetHeight
                };
                selectNode(n.id);
                el.classList.add('resizing');
            });
        });

        // Input changes
        const ta = el.querySelector('.wf-node-input');
        if (ta) {
            const resizeInput = () => {
                ta.style.height = 'auto';
                ta.style.height = Math.max(ta.scrollHeight, 30) + 'px';
            };
            ta.addEventListener('input', () => {
                resizeInput();
                n.localInput = ta.value;
                propagate();
            });
            resizeInput();
        }

        const modeSelect = el.querySelector('.wf-cipher-mode');
        if (modeSelect) modeSelect.addEventListener('change', () => { n.mode = modeSelect.value; propagate(); });

        const enigmaModelSelect = el.querySelector('.wf-enigma-model');
        if (enigmaModelSelect) enigmaModelSelect.addEventListener('change', () => { n.model = enigmaModelSelect.value; propagate(); });

        const paramInput = el.querySelector('.wf-cipher-param:not([data-field])');
        if (paramInput) paramInput.addEventListener('input', () => { n.param = paramInput.value; propagate(); });

        el.querySelectorAll('.wf-cipher-param[data-field]').forEach(control => {
            const eventName = control.tagName === 'SELECT' ? 'change' : 'input';
            control.addEventListener(eventName, () => {
                n.params = n.params || {};
                n.params[control.dataset.field] = control.value;
                propagate();
            });
        });

        const hmacToggle = el.querySelector('.wf-hmac-toggle');
        if (hmacToggle) hmacToggle.addEventListener('change', () => { n.useHmac = hmacToggle.checked; propagate(); });

        const hmacKey = el.querySelector('.wf-hmac-key');
        if (hmacKey) hmacKey.addEventListener('input', () => { n.hmacKey = hmacKey.value; propagate(); });

        return el;
    }

    // === 添加节点 ===
    function addNode(type, x, y, algorithm) {
        const id = nextId++;
        const n = { id, type, x, y, w: 190, value: '', localInput: '', algorithm: algorithm || '', mode: 'e', param: '' };
        if (type === 'cipher' && algorithm && cipherMap[algorithm]) {
            const cfg = cipherMap[algorithm];
            n.param = cfg.def ?? '';
            if (cfg.fields) {
                n.params = {};
                cfg.fields.forEach(field => { n.params[field.key] = field.def ?? ''; });
            }
            if (cfg.enigma) n.model = cfg.modelDef || 'M3';
            if (cfg.hmac) {
                n.useHmac = false;
                n.hmacKey = cfg.hmacDef ?? '';
            }
        }
        nodes[id] = n;
        const el = createNodeEl(n);
        nodesLayer.appendChild(el);
        propagate();
        renderConnections();
        return id;
    }

    // === 删除节点 ===
    function deleteNode(id) {
        connections = connections.filter(c => c.from !== id && c.to !== id);
        delete nodes[id];
        const el = document.getElementById('node-' + id);
        if (el) el.remove();
        if (selectedNode === id) selectedNode = null;
        renderConnections();
        propagate();
    }

    // === 添加连线 ===
    function addConnection(fromId, toId, fromPort = 'result') {
        if (fromId === toId) return;
        if (connections.some(c => c.from === fromId && c.to === toId && (c.fromPort || 'result') === fromPort)) return;
        if (nodes[fromId]?.type === 'output' || nodes[toId]?.type === 'input') return;
        const id = nextConnId++;
        connections.push({ id, from: fromId, to: toId, fromPort });
        renderConnections();
        updatePortStyles();
        propagate();
    }

    // === 删除连线 ===
    function deleteConnection(id) {
        connections = connections.filter(c => c.id !== id);
        selectedConn = null;
        renderConnections();
        updatePortStyles();
        propagate();
    }

    // === 选择 ===
    function selectNode(id) {
        selectedNode = id;
        selectedConn = null;
        deselectAll();
        const el = document.getElementById('node-' + id);
        if (el) el.classList.add('selected');
    }

    function deselectAll() {
        document.querySelectorAll('.wf-node.selected').forEach(e => e.classList.remove('selected'));
    }

    // === 端口连接状态 ===
    function updatePortStyles() {
        document.querySelectorAll('.wf-port').forEach(p => p.classList.remove('connected'));
        connections.forEach(c => {
            const fromP = document.querySelector(`#node-${c.from} .wf-port[data-dir="out"][data-port="${c.fromPort || 'result'}"]`);
            const toP = document.querySelector(`#node-${c.to} .port-in`);
            if (fromP) fromP.classList.add('connected');
            if (toP) toP.classList.add('connected');
        });
    }

    // === 变换更新 ===
    function applyTransform() {
        nodesLayer.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
        svg.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
        requestDrawGrid();
    }

    // === 画布事件 ===
    canvas.addEventListener('mousedown', e => {
        if (e.target === canvas || e.target.classList.contains('wf-grid')) {
            isPanning = true;
            panStart = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            deselectAll();
            selectedNode = null;
            selectedConn = null;
            renderConnections();
        }
    });

    canvas.addEventListener('mousemove', e => {
        if (isPanning) {
            pan.x = e.clientX - panStart.x;
            pan.y = e.clientY - panStart.y;
            applyTransform();
        }
        if (resizingNode && resizeStart) {
            const n = nodes[resizingNode];
            const el = document.getElementById('node-' + resizingNode);
            if (n && el) {
                const dx = (e.clientX - resizeStart.x) / zoom;
                const dy = (e.clientY - resizeStart.y) / zoom;
                if (resizeStart.dir.includes('e')) {
                    n.w = Math.max(190, Math.min(520, resizeStart.w + dx));
                    el.style.width = n.w + 'px';
                    el.querySelectorAll('.wf-node-input').forEach(input => {
                        input.style.height = 'auto';
                        input.style.height = Math.max(input.scrollHeight, 30) + 'px';
                    });
                }
                if (resizeStart.dir.includes('s')) {
                    const minHeight = getNodeNaturalHeight(el);
                    n.h = Math.max(minHeight, Math.min(620, resizeStart.h + dy));
                    el.style.height = n.h + 'px';
                }
                requestRenderConnections();
            }
        }
        if (draggingNode) {
            const cp = screenToCanvas(e.clientX, e.clientY);
            const n = nodes[draggingNode];
            n.x = cp.x - dragOffset.x;
            n.y = cp.y - dragOffset.y;
            const el = document.getElementById('node-' + draggingNode);
            el.style.left = n.x + 'px';
            el.style.top = n.y + 'px';
            requestRenderConnections();
        }
        if (connecting) {
            const mp = screenToCanvas(e.clientX, e.clientY);
            const portDir = connecting.reverse ? 'in' : 'out';
            const pp = getPortPos(connecting.nodeId, portDir, connecting.port || 'result');
            const x1 = connecting.reverse ? mp.x : pp.x;
            const y1 = connecting.reverse ? mp.y : pp.y;
            const x2 = connecting.reverse ? pp.x : mp.x;
            const y2 = connecting.reverse ? pp.y : mp.y;
            const dx = Math.abs(x2 - x1) * 0.4;
            tempLine.setAttribute('d', `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
        }
    });

    canvas.addEventListener('mouseup', e => {
        if (draggingNode) {
            const el = document.getElementById('node-' + draggingNode);
            if (el) el.classList.remove('dragging');
            draggingNode = null;
        }
        if (resizingNode) {
            const el = document.getElementById('node-' + resizingNode);
            if (el) el.classList.remove('resizing');
            resizingNode = null;
            resizeStart = null;
        }
        isPanning = false;
        if (connecting) {
            connecting = null;
            canvas.classList.remove('connecting');
            tempLine.setAttribute('d', '');
        }
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const oldZ = zoom;
        zoom *= e.deltaY < 0 ? 1.1 : 0.9;
        zoom = Math.max(0.3, Math.min(3, zoom));
        const cr = canvas.getBoundingClientRect();
        const mx = e.clientX - cr.left;
        const my = e.clientY - cr.top;
        pan.x = mx - (mx - pan.x) * (zoom / oldZ);
        pan.y = my - (my - pan.y) * (zoom / oldZ);
        applyTransform();
    }, { passive: false });

    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (selectedConn) deleteConnection(selectedConn);
            else if (selectedNode) deleteNode(selectedNode);
        }
    });

    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
    });

    function clearCanvas() {
        Object.keys(nodes).forEach(id => {
            const el = document.getElementById('node-' + id);
            if (el) el.remove();
        });
        nodes = {};
        connections = [];
        selectedNode = null;
        selectedConn = null;
        renderConnections();
    }

    // === 搜索过滤工具栏 ===
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            document.querySelectorAll('.wf-toolbar-item').forEach(el => {
                const name = `${el.dataset.algo || el.dataset.type || ''} ${el.textContent}`;
                el.classList.toggle('hidden', q && !name.toLowerCase().includes(q));
            });
        });
    }

    // === 工具栏拖拽到画布添加 ===
    let toolbarDrag = null; // { el, ghost, type, algo }
    let toolbarDropGuard = false;

    document.querySelectorAll('.wf-toolbar-item').forEach(el => {
        el.addEventListener('mousedown', e => {
            e.preventDefault();
            const type = el.dataset.type || 'cipher';
            const algo = el.dataset.algo || '';
            // 创建拖拽幽灵
            const ghost = document.createElement('div');
            ghost.className = 'wf-drag-ghost';
            ghost.textContent = el.textContent.trim();
            ghost.style.left = e.clientX + 'px';
            ghost.style.top = e.clientY + 'px';
            document.body.appendChild(ghost);
            toolbarDrag = { el, ghost, type, algo };
        });

        el.addEventListener('click', () => {
            if (!isMobileWorkflow() || toolbarDropGuard) return;
            if (!toolbar.classList.contains('open')) return;
            const cp = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
            addNode('cipher', cp.x - 100, cp.y - 40, el.dataset.algo || '');
            setToolbarOpen(false);
        });
    });

    document.addEventListener('mousemove', e => {
        if (toolbarDrag) {
            toolbarDrag.ghost.style.left = e.clientX + 'px';
            toolbarDrag.ghost.style.top = e.clientY + 'px';
        }
    });

    document.addEventListener('mouseup', e => {
        if (toolbarDrag) {
            toolbarDrag.ghost.remove();
            // 检查是否在画布区域内释放（在算法库抽屉内松手不算落点）
            const cr = canvas.getBoundingClientRect();
            const releasedInToolbar = Boolean(e.target?.closest?.('#wf-toolbar'));
            if (!releasedInToolbar &&
                e.clientX >= cr.left && e.clientX <= cr.right &&
                e.clientY >= cr.top && e.clientY <= cr.bottom) {
                const cp = screenToCanvas(e.clientX, e.clientY);
                if (toolbarDrag.type === 'cipher') {
                    const minNodeX = isMobileWorkflow() ? 0 : (toolbar?.offsetWidth || 0) / zoom + 12;
                    addNode('cipher', Math.max(cp.x - 100, minNodeX), cp.y - 40, toolbarDrag.algo);
                }
                toolbarDropGuard = true;
                setTimeout(() => { toolbarDropGuard = false; }, 320);
            }
            toolbarDrag = null;
        }
    });

    // === 绘制网格 ===
    function drawGrid() {
        const gridCanvas = document.getElementById('wf-grid-canvas');
        if (!gridCanvas) return;
        const ctx = gridCanvas.getContext('2d');
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        gridCanvas.width = w;
        gridCanvas.height = h;
        ctx.clearRect(0, 0, w, h);
        const step = Math.max(14, 32 * zoom);
        const ox = pan.x % step;
        const oy = pan.y % step;
        ctx.strokeStyle = 'rgba(99, 235, 255, 0.085)';
        ctx.lineWidth = 1;
        for (let x = ox; x < w; x += step) {
            const crispX = Math.round(x) + 0.5;
            ctx.beginPath(); ctx.moveTo(crispX, 0); ctx.lineTo(crispX, h); ctx.stroke();
        }
        for (let y = oy; y < h; y += step) {
            const crispY = Math.round(y) + 0.5;
            ctx.beginPath(); ctx.moveTo(0, crispY); ctx.lineTo(w, crispY); ctx.stroke();
        }
    }

    window.addEventListener('resize', () => {
        requestDrawGrid();
        requestRenderConnections();
    });

    // Clear button
    document.getElementById('wf-clear-btn')?.addEventListener('click', clearCanvas);

    // === 初始化默认示例 ===
    addNode('cipher', isMobileWorkflow() ? 40 : 280, 150, 'Caesar凯撒');
    drawGrid();
    applyTransform();
}
