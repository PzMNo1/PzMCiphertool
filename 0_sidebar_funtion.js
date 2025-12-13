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
    $('#cardSearch').addEventListener('keydown', e => {
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

        const isLogic = target.classList.contains('logic-btn')
        isLogic && ($('.submodule-nav [data-target="luojimiti"]').click(), target.closest('.submodule').classList.add('active'))
        target.classList.add(isLogic ? 'logic-highlight' : 'card-highlight')
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => target.classList.remove(isLogic ? 'logic-highlight' : 'card-highlight'), 5e3)
    })
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

// 移动端侧边栏高度优化：防止键盘弹出时挤压
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
