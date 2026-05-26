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

    // === DOM refs ===
    const canvas = document.getElementById('wf-canvas');
    const nodesLayer = document.getElementById('wf-nodes-layer');
    const svg = document.getElementById('wf-svg');
    const tempLine = document.getElementById('wf-temp-line');
    const searchInput = document.getElementById('wf-search');
    const ctxMenu = document.getElementById('wf-context-menu');
    if (!canvas) return;

    // Hidden input for sync with cipher/999_funtion.js
    const hiddenInput = document.getElementById('mainInputCoze');

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
        svg.querySelectorAll('.wf-connection').forEach(p => p.remove());
        connections.forEach(c => {
            const p1 = getPortPos(c.from, 'out', c.fromPort || 'result');
            const p2 = getPortPos(c.to, 'in');
            const dx = Math.abs(p2.x - p1.x) * 0.5;
            const d = `M${p1.x},${p1.y} C${p1.x + dx},${p1.y} ${p2.x - dx},${p2.y} ${p2.x},${p2.y}`;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('class', 'wf-connection' + (selectedConn === c.id ? ' selected' : ''));
            path.setAttribute('data-id', c.id);
            path.style.pointerEvents = 'stroke';
            path.addEventListener('click', e => {
                e.stopPropagation();
                selectedConn = c.id;
                selectedNode = null;
                deselectAll();
                renderConnections();
            });
            svg.appendChild(path);
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
                    if (resEl) { resEl.textContent = n.value; resEl.className = 'result'; }
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
        el.className = 'wf-node';
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
            const paramHTML = cfg.pType && cfg.pType !== 'none'
                ? `<div class="wf-node-field"><label>${cfg.enigma ? '转子参数' : '参数'}</label><input type="${cfg.pType === 'number' ? 'number' : 'text'}" value="${escapeHTML(n.param ?? cfg.def ?? '')}" class="wf-cipher-param" placeholder="${cfg.enigma ? '反射器|转子|位置|环|插板' : '参数'}"></div>`
                : '';
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

        const paramInput = el.querySelector('.wf-cipher-param');
        if (paramInput) paramInput.addEventListener('input', () => { n.param = paramInput.value; propagate(); });

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
        renderConnections();
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
                    n.w = Math.max(170, Math.min(520, resizeStart.w + dx));
                    el.style.width = n.w + 'px';
                    el.querySelectorAll('.wf-node-input').forEach(input => {
                        input.style.height = 'auto';
                        input.style.height = Math.max(input.scrollHeight, 30) + 'px';
                    });
                }
                if (resizeStart.dir.includes('s')) {
                    n.h = Math.max(140, Math.min(620, resizeStart.h + dy));
                    el.style.height = n.h + 'px';
                }
                renderConnections();
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
            renderConnections();
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

    // Right-click context menu
    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        const cp = screenToCanvas(e.clientX, e.clientY);
        showContextMenu(e.clientX, e.clientY, cp.x, cp.y);
    });

    function showContextMenu(sx, sy, cx, cy) {
        ctxMenu.innerHTML = '';
        const items = [];
        // Top 8 ciphers for quick add
        const quickCiphers = Object.keys(cipherMap).slice(0, 8);
        quickCiphers.forEach(name => {
            items.push({ label: '🔐 ' + name, action: () => addNode('cipher', cx, cy, name) });
        });
        items.push({ sep: true });
        items.push({ label: '🗑 清空画布', action: clearCanvas, cls: 'danger' });

        items.forEach(it => {
            if (it.sep) {
                const sep = document.createElement('div');
                sep.className = 'wf-context-menu-separator';
                ctxMenu.appendChild(sep);
            } else {
                const div = document.createElement('div');
                div.className = 'wf-context-menu-item' + (it.cls ? ' ' + it.cls : '');
                div.textContent = it.label;
                div.addEventListener('click', () => { it.action(); hideContextMenu(); });
                ctxMenu.appendChild(div);
            }
        });
        ctxMenu.style.left = sx + 'px';
        ctxMenu.style.top = sy + 'px';
        ctxMenu.classList.add('active');
    }

    function hideContextMenu() { ctxMenu.classList.remove('active'); }
    document.addEventListener('click', hideContextMenu);

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
                const name = el.dataset.algo || el.dataset.type || '';
                el.classList.toggle('hidden', q && !name.toLowerCase().includes(q));
            });
        });
    }

    // === 工具栏拖拽到画布添加 ===
    let toolbarDrag = null; // { el, ghost, type, algo }

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
            // 检查是否在画布区域内释放
            const cr = canvas.getBoundingClientRect();
            if (e.clientX >= cr.left && e.clientX <= cr.right &&
                e.clientY >= cr.top && e.clientY <= cr.bottom) {
                const cp = screenToCanvas(e.clientX, e.clientY);
                if (toolbarDrag.type === 'cipher') {
                    addNode('cipher', cp.x - 100, cp.y - 40, toolbarDrag.algo);
                }
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
        const step = 30 * zoom;
        const ox = pan.x % step;
        const oy = pan.y % step;
        ctx.strokeStyle = 'rgba(64, 224, 255, 0.06)';
        ctx.lineWidth = 1;
        for (let x = ox; x < w; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = oy; y < h; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    }

    // Redraw grid on transform
    const origApply = applyTransform;
    const applyWithGrid = () => { origApply(); drawGrid(); };
    // Replace
    canvas.addEventListener('mousemove', drawGrid);
    window.addEventListener('resize', () => { drawGrid(); renderConnections(); });

    // Clear button
    document.getElementById('wf-clear-btn')?.addEventListener('click', clearCanvas);

    // === 初始化默认示例 ===
    addNode('cipher', 160, 150, 'Caesar凯撒');
    drawGrid();
    applyTransform();
}
