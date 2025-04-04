// 这是侧边栏选项的交互作用函数
const contentSections = document.querySelectorAll('.content-section');
const menuItems = document.querySelectorAll('.menu-item');
function hideAllSections() {contentSections.forEach(section => {section.style.display = 'none';});}
function showSection(sectionId) {
    const section = document.getElementById(sectionId + '-content'); 
    if (section) {section.style.display = 'block'; }
}
menuItems.forEach(menuItem => {
    menuItem.addEventListener('click', function(event) {
        event.preventDefault(); 
        const targetSectionId = this.dataset.target; 
        hideAllSections(); 
        showSection(targetSectionId); 
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

        if (!target) return $('#searchToast')?.remove() || ($('body').insertAdjacentHTML('beforeend', 
            '<div id=searchToast class=search-toast>🔍 未找到相关谜题</div>') && setTimeout(() => $('#searchToast')?.remove(), 2e3))
        const isLogic = target.classList.contains('logic-btn')
        isLogic && ($('.submodule-nav [data-target="luojimiti"]').click(), target.closest('.submodule').classList.add('active'))
        target.classList.add(isLogic ? 'logic-highlight' : 'card-highlight')
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => target.classList.remove(isLogic ? 'logic-highlight' : 'card-highlight'), 5e3)
    })
}





