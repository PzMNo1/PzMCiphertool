// 这是侧边栏选项的交互作用函数
function hideAllSections() {document.querySelectorAll('.content-section').forEach(section => {section.style.display = 'none';});}
function showSection(sectionId) {
    const section = document.getElementById(sectionId + '-content'); 
    if (section) {section.style.display = 'block'; }
}
document.querySelectorAll('.menu-item').forEach(menuItem => {
    menuItem.addEventListener('click', function(event) {
        event.preventDefault(); 
        hideAllSections(); 
        showSection(this.dataset.target); 
    });
});
hideAllSections();
showSection('jiamishiyanshi'); 

// 这是加密实验室里的子模块切换逻辑
document.querySelectorAll('.submodule-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.submodule-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.submodule').forEach(m => m.classList.remove('active'));
        document.getElementById(this.dataset.target).classList.add('active');
    });
});

// 这是意见反馈模块里的子模块切换逻辑
document.querySelectorAll('.contact-submodule-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.contact-submodule-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.lianxiwomen-submodule').forEach(m => m.classList.remove('active'));
        document.getElementById(this.dataset.target).classList.add('active');
    });
});





// 这是侧边栏搜索框定位功能
function initSearchFunction() {
    const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s)
    const cardSearch = $('#cardSearch');
    if (cardSearch) {
        cardSearch.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            let target
            $$('.card, .logic-btn').forEach(el => {
                const text = el.classList.contains('card') 
                    ? el.querySelector('.badge')?.textContent 
                    : el.textContent.replace(/[^\w\u4e00-\u9fa5]/g, '')
                if (text?.toLowerCase().includes(e.target.value.toLowerCase()
                    .trim())) target ??= el
            })
            if (target) highlightAndScroll(target);
        })
    }
    initQuickNav('mimaqu');
    initQuickNav('xiandaiqu');
}

function highlightAndScroll(target) {
    if (!target) return;
    const isLogic = target.classList.contains('logic-btn');
    if (isLogic) {
        document.querySelector('.submodule-nav [data-target="luojimiti"]')?.click();
        target.closest('.submodule')?.classList.add('active');
    } else {const submodule = target.closest('.submodule');
        if (submodule && !submodule.classList.contains('active')) {
            const id = submodule.id;
            document.querySelector(`.submodule-nav [data-target="${id}"]`)?.click();
        }
    }
    target.classList.add(isLogic ? 'logic-highlight' : 'card-highlight');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => target.classList.remove(isLogic ? 'logic-highlight' : 'card-highlight'), 5000);
}

function initQuickNav(regionId) {
    const inputId = `quick-nav-input-${regionId}`;
    const listId = `quick-nav-options-${regionId}`;
    const containerId = `quick-nav-container-${regionId}`;
    const input = document.getElementById(inputId);
    const listContainer = document.getElementById(listId);
    const container = document.getElementById(containerId);
    if (!input || !listContainer) return;
    function getCardOptions() {
        const cards = document.querySelectorAll(`#${regionId} .card:not(.main-input)`);
        const options = [];
        cards.forEach(card => {
            const badge = card.querySelector('.badge');
            if (badge) {
                options.push({
                    text: badge.textContent,
                    element: card
                });
            }
        });
        return options;
    }
    function renderOptions(filterText = '') {
        listContainer.innerHTML = '';
        const options = getCardOptions();
        const lowerFilter = filterText.toLowerCase();
        const filtered = options.filter(opt => 
            opt.text.toLowerCase().includes(lowerFilter)
        );

        if (filtered.length === 0) {
            listContainer.innerHTML = '<div class="quick-nav-option" style="color:#777;cursor:default;">无匹配结果</div>';
            return;
        }
        filtered.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'quick-nav-option';
            div.textContent = opt.text;
            
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                input.value = ''; 
                listContainer.classList.remove('show');
                highlightAndScroll(opt.element);
            });
            listContainer.appendChild(div);
        });
    }

    input.addEventListener('focus', () => {
        renderOptions(input.value);
        listContainer.classList.add('show');
    });

    input.addEventListener('input', (e) => {
        renderOptions(e.target.value);
        listContainer.classList.add('show');
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault(); 
            const filterText = input.value.toLowerCase().trim();
            if (!filterText) return;

            const options = getCardOptions();
            const matched = options.find(opt => opt.text.toLowerCase().includes(filterText));
            
            if (matched) {
                input.blur(); 
                listContainer.classList.remove('show');
                highlightAndScroll(matched.element);
            }
        }
    });
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            listContainer.classList.remove('show');
        }
    });
}

// 输入框置顶功能的交互逻辑
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.pin-toggle-btn'); 
    if (btn) {
        const card = btn.closest('.card');
        if (card) {
            card.classList.toggle('pinned');
            const isPinned = card.classList.contains('pinned');
            const tag = btn.querySelector('.cyber-button__tag');
            if (tag) {
                tag.textContent = isPinned ? '取消置顶' : '置顶';
            }
        }
    }
});

//侧边栏防止键盘弹出时被挤压
function initMobileHeight() {
    const setHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setHeight();
    
    // 监听 resize，但在键盘弹出（宽度不变但高度变小）时不更新
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        if (window.innerWidth !== lastWidth) {
            lastWidth = window.innerWidth;
            setHeight();
        }
    });
}
initMobileHeight();
