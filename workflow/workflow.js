// workflow.js

function initWorkflowCoze() {
    // 密码算法映射配置
    const cipherMapCoze = {
        Caesar凯撒: { obj: Caesar, paramId: 'caesarShift', defaultParam: 3, paramType: 'number' },
        Vigenere维吉尼亚: { obj: Vigenere, paramId: 'vigenereKey', defaultParam: 'KEY', paramType: 'text' },
        RailFence栅栏: { obj: RailFence, paramId: 'railCount', defaultParam: 3, paramType: 'number' },
        Bifid双歧: { obj: Bifid, paramId: 'BifidCipherkey', defaultParam: 'abc123', paramType: 'text' },
        
        AtBash埃特巴什: { obj: { e: AtBash.e, d: AtBash.e }, paramId: '', defaultParam: '', paramType: 'none' },
        Morse摩尔斯: { obj: MorseCode, paramId: '', defaultParam: '', paramType: 'none' },
        PhoneKey手机九键: { obj: PhoneKeyCipher, paramId: '', defaultParam: '', paramType: 'none' },
        Beale比尔: { obj: BealeCipher, paramId: 'bealeKey', defaultParam: 'KEY', paramType: 'text' },
        Fanqie反切: { obj: FanqieCipher, paramId: '', defaultParam: '', paramType: 'none' },
        DNA_mRNA序列: { obj: DnaCipher, paramId: '', defaultParam: '', paramType: 'none' },
        VKeyboardV字键盘: { obj: VKeyboardCipher, paramId: '', defaultParam: '', paramType: 'none' },
        QWE键盘: { obj: QweCipher, paramId: '', defaultParam: '', paramType: 'none' },
        Bacon培根: { obj: BaconCipher, paramId: '', defaultParam: '', paramType: 'none' },
        ColumnarRail柱状栅栏: { obj: ColumnarRailCipher, paramId: 'colCount', defaultParam: 2, paramType: 'number' },
        WShapeRailW型栅栏: { obj: WShapeRailFenceCipher, paramId: 'wRailCount', defaultParam: 3, paramType: 'number' },
        Cipher01248: { obj: Cipher01248, paramId: '', defaultParam: '', paramType: 'none' },
        Vowel元音: { obj: VowelCipher, paramId: '', defaultParam: '', paramType: 'none' },
        ROT旋转: { obj: { e: ROTCipher.e, d: ROTCipher.e }, paramId: 'rotType', defaultParam: 'dec', paramType: 'text' },
        Base编码: { obj: baseCipher, paramId: 'baseType', defaultParam: 'base64', paramType: 'text' },
        CCC中文电码: { obj: CCCHandler, paramId: '', defaultParam: '', paramType: 'none' },
        FourCorner四角: { obj: fourCCCHandler, paramId: '', defaultParam: '', paramType: 'none' },

        MD5: { obj: { e: MD5Cipher.e, d: () => '不可解密' }, paramId: '', defaultParam: '', paramType: 'none' },
        'MD5-HMAC': { obj: { e: (t, k) => MD5Cipher.hmac(k, t), d: () => '不可解密' }, paramId: 'hmacKey', defaultParam: 'key', paramType: 'text' },
        SHA1: { obj: { e: (t, k) => k ? SHA1Cipher.hmac(k, t) : SHA1Cipher.e(t), d: () => '不可解密' }, paramId: 'shaKey', defaultParam: '', paramType: 'text' },
        SHA256: { obj: { e: (t, k) => k ? SHA256Cipher.hmac(k, t) : SHA256Cipher.e(t), d: () => '不可解密' }, paramId: 'shaKey', defaultParam: '', paramType: 'text' },
        SHA384: { obj: { e: (t, k) => k ? SHA384Cipher.hmac(k, t) : SHA384Cipher.e(t), d: () => '不可解密' }, paramId: 'shaKey', defaultParam: '', paramType: 'text' },
        SHA512: { obj: { e: (t, k) => k ? SHA512Cipher.hmac(k, t) : SHA512Cipher.e(t), d: () => '不可解密' }, paramId: 'shaKey', defaultParam: '', paramType: 'text' },
    };

    let workflowState = {};
    let nextWorkflowId = 1;
    let dragSrcInfo = null; 

    const workflowListEl = document.getElementById('workflow-list');
    const mainInputEl = document.getElementById('mainInputCoze');

    // --- 1. 修改：创建 UI 行 (替换 Select 为自定义结构) ---
    function createWorkflowRow(id) {
        const row = document.createElement('div');
        row.className = 'workflow-row';
        row.dataset.id = id;
        row.innerHTML = `
            <button class="copy-workflow-btn" data-action="copy-workflow" data-id="${id}">复制</button>
            <button class="delete-workflow-btn" data-action="delete-workflow" data-id="${id}">删除此组</button>
            
            <div class="workflow-config-area">
                <div class="badge">工作流 #${id}</div>
                <div class="workflow-steps-container" id="steps-container-${id}">
                    </div>
                
                <div class="add-step-area">
                    <div class="custom-select-container" id="select-container-${id}">
                        <input type="text" 
                               class="custom-select-input" 
                               id="type-input-${id}" 
                               placeholder="选择或搜索算法..." 
                               autocomplete="off"
                               data-id="${id}">
                        <div class="custom-select-options" id="options-list-${id}">
                            </div>
                    </div>
                    <select id="mode-select-${id}">
                        <option value="e">加密</option>
                        <option value="d">解密</option>
                    </select>
                    <input type="text" id="param-input-${id}" class="param-input" placeholder="参数">
                    <button class="cyber-button small" data-action="add-step" data-id="${id}">
                        <span class="cyber-button__tag">添加</span>
                    </button>
                </div>
            </div>

            <div class="workflow-result-area">
                <div class="workflow-result-title">处理结果</div>
                <div class="workflow-final-output" id="result-${id}"></div>
                <div class="intermediate-results" id="intermediate-${id}"></div>
            </div>
        `;
        return row;
    }

    // 初始化自定义下拉框逻辑
    function setupCustomDropdown(id) {
        const input = document.getElementById(`type-input-${id}`);
        const listContainer = document.getElementById(`options-list-${id}`);
        const paramInput = document.getElementById(`param-input-${id}`);
        const container = document.getElementById(`select-container-${id}`);
        
        const algorithmNames = Object.keys(cipherMapCoze);

        // 渲染列表函数
        function renderOptions(filterText = '') {
            listContainer.innerHTML = '';
            const lowerFilter = filterText.toLowerCase();
            
            // 过滤算法名称
            const filtered = algorithmNames.filter(name => 
                name.toLowerCase().includes(lowerFilter)
            );

            if (filtered.length === 0) {
                listContainer.innerHTML = '<div class="custom-option" style="color:#777;cursor:default;">无匹配算法</div>';
                return;
            }

            filtered.forEach(name => {
                const div = document.createElement('div');
                div.className = 'custom-option';
                div.textContent = name;
                
                // 点击选项事件
                div.addEventListener('click', (e) => {
                    e.stopPropagation(); // 防止触发 document 点击关闭
                    selectOption(name);
                });
                listContainer.appendChild(div);
            });
        }

        // 选中选项后的逻辑
        function selectOption(name) {
            input.value = name;
            listContainer.classList.remove('show');
            
            // 联动参数输入框逻辑
            if (cipherMapCoze[name] && cipherMapCoze[name].paramType !== 'none') {
                paramInput.style.display = 'block';
                paramInput.placeholder = `参数 (默认 ${cipherMapCoze[name].defaultParam})`;
                paramInput.value = cipherMapCoze[name].defaultParam;
            } else {
                paramInput.style.display = 'none';
            }
        }

        // 输入框事件：聚焦显示，输入过滤
        input.addEventListener('focus', () => {
            renderOptions(input.value);
            listContainer.classList.add('show');
        });

        input.addEventListener('input', (e) => {
            renderOptions(e.target.value);
            listContainer.classList.add('show');
        });

        // 点击外部关闭下拉框
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                listContainer.classList.remove('show');
            }
        });
    }

    // --- 渲染步骤  ---
    function renderSteps(id) {
        const container = document.getElementById(`steps-container-${id}`);
        const steps = workflowState[id];
        
        container.innerHTML = ''; 

        if (steps.length === 0) {
            container.innerHTML = `<div style="color:#bdc3c7; font-size:0.8rem; text-align:center; padding:1rem;">暂无步骤，请添加</div>`;
            updateResult(id);
            return;
        }

        steps.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'step-item';
            stepEl.setAttribute('draggable', 'true'); 
            stepEl.dataset.index = index;
            stepEl.dataset.workflowId = id;

            stepEl.innerHTML = `
                <div class="step-info" style="pointer-events: none;"> <div class="step-type">
                        <span style="cursor:move; margin-right:5px;">☰</span> ${index + 1}. ${step.type} (${step.mode === 'e' ? '加密' : '解密'})
                    </div>
                    <div class="step-param">参数: ${step.param}</div>
                </div>
                <div class="step-controls">
                    <button class="cyber-button small" style="min-width:30px; padding:2px;" data-action="move-up" data-id="${id}" data-index="${index}">↑</button>
                    <button class="cyber-button small" style="min-width:30px; padding:2px;" data-action="move-down" data-id="${id}" data-index="${index}">↓</button>
                    <button class="cyber-button small" style="min-width:40px; padding:2px; border-color:#e74c3c;" data-action="remove-step" data-id="${id}" data-index="${index}">×</button>
                </div>
            `;

            addDragEvents(stepEl, id, index);
            container.appendChild(stepEl);
        });
        
        updateResult(id);
    }

    // 拖拽事件处理函数 
    function addDragEvents(el, workflowId, index) {
        el.addEventListener('dragstart', (e) => {
            dragSrcInfo = { workflowId: workflowId, index: index };
            el.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
        });

        el.addEventListener('dragend', (e) => {
            el.classList.remove('dragging');
            document.querySelectorAll('.step-item').forEach(item => item.classList.remove('drag-over'));
            dragSrcInfo = null;
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            if (!dragSrcInfo || dragSrcInfo.workflowId !== workflowId) return;
            e.dataTransfer.dropEffect = 'move';
            el.classList.add('drag-over');
        });

        el.addEventListener('dragleave', (e) => {
            el.classList.remove('drag-over');
        });

        el.addEventListener('drop', (e) => {
            e.stopPropagation(); 
            e.preventDefault();
            if (!dragSrcInfo || dragSrcInfo.workflowId !== workflowId) return;
            const fromIndex = dragSrcInfo.index;
            const toIndex = index; 
            if (fromIndex !== toIndex) {
                const list = workflowState[workflowId];
                const [movedItem] = list.splice(fromIndex, 1); 
                list.splice(toIndex, 0, movedItem); 
                renderSteps(workflowId);
            }
            return false;
        });
    }

    // 计算结果
    async function updateResult(id) {
        const inputVal = mainInputEl.value;
        const resultEl = document.getElementById(`result-${id}`);
        const interEl = document.getElementById(`intermediate-${id}`);
        
        if (!inputVal) {
            resultEl.textContent = '等待输入...';
            interEl.textContent = '';
            return;
        }

        let current = inputVal;
        let log = [];
        const steps = workflowState[id];

        try {
            for (const [idx, step] of steps.entries()) {
                const cipher = cipherMapCoze[step.type].obj;
                let p = step.param;
                if(cipherMapCoze[step.type].paramType === 'number') {
                    p = parseInt(p) || cipherMapCoze[step.type].defaultParam;
                }
                // 支持异步算法(如SHA)
                current = await cipher[step.mode](current, p);
                log.push(`Step ${idx + 1}: ${current.substring(0, 20)}${current.length>20?'...':''}`);
            }
            
            resultEl.textContent = current;
            interEl.textContent = log.length > 0 ? '过程: ' + log.join(' -> ') : '';
        } catch (e) {
            resultEl.textContent = "错误: " + e.message;
        }
    }

    // --- 3. 添加新工作流 (调用 setupCustomDropdown) ---
    function addNewWorkflow() {
        const id = nextWorkflowId++;
        workflowState[id] = [];
        const row = createWorkflowRow(id);
        workflowListEl.appendChild(row);
        
        // 初始化自定义下拉框功能
        setupCustomDropdown(id);
        
        // 初始渲染空状态
        renderSteps(id);
    }

    // --- 事件监听 ---
    document.getElementById('addNewWorkflowBtn').addEventListener('click', addNewWorkflow);
    mainInputEl.addEventListener('input', () => {
        Object.keys(workflowState).forEach(id => updateResult(id));
    });

    workflowListEl.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const action = target.dataset.action;
        const id = target.dataset.id; 
        if (!action || !id) return;

        if (action === 'delete-workflow') {
            delete workflowState[id];
            const row = document.querySelector(`.workflow-row[data-id="${id}"]`);
            if (row) row.remove();
            return;
        }

        if (action === 'copy-workflow') {
            const originalSteps = workflowState[id];
            const newSteps = JSON.parse(JSON.stringify(originalSteps)); // 深拷贝
            
            const newId = nextWorkflowId++;
            workflowState[newId] = newSteps;
            
            const newRow = createWorkflowRow(newId);
            const currentRow = document.querySelector(`.workflow-row[data-id="${id}"]`);
            
            if (currentRow) {
                currentRow.insertAdjacentElement('afterend', newRow);
            } else {
                workflowListEl.appendChild(newRow);
            }
            
            setupCustomDropdown(newId);
            renderSteps(newId);
            return;
        }

        const index = parseInt(target.dataset.index); 
        const steps = workflowState[id];

        if (action === 'add-step') {
            const typeInput = document.getElementById(`type-input-${id}`);
            const modeSelect = document.getElementById(`mode-select-${id}`);
            const paramInput = document.getElementById(`param-input-${id}`);
            
            const type = typeInput.value;
            
            // 验证输入的算法是否有效
            if (!type || !cipherMapCoze[type]) {
                alert("请从列表中选择一个有效的算法");
                return; 
            }
            
            const mode = modeSelect.value;
            const param = paramInput.value || cipherMapCoze[type].defaultParam;
            workflowState[id].push({ type, mode, param });
            
            // 清空输入框并重置状态
            typeInput.value = '';      
            paramInput.value = '';            
            paramInput.style.display = 'none';
            
            renderSteps(id);
        } else if (action === 'remove-step') {
            steps.splice(index, 1);
            renderSteps(id);
        } else if (action === 'move-up') {
            if (index > 0) {
                [steps[index], steps[index-1]] = [steps[index-1], steps[index]];
                renderSteps(id);
            }
        } else if (action === 'move-down') {
            if (index < steps.length - 1) {
                [steps[index], steps[index+1]] = [steps[index+1], steps[index]];
                renderSteps(id);
            }
        }
    });

    // 初始化 2个默认工作流
    addNewWorkflow();
    addNewWorkflow();
}