
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

/* 这是侧边栏搜索定位功能 */
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('cardSearch');
    const cards = document.querySelectorAll('.card');
    searchInput.addEventListener('keydown', (event) => { 
        if (event.key === 'Enter') {
            event.preventDefault(); 
            const searchTerm = searchInput.value.toLowerCase();
            let foundCard = null;
            cards.forEach(card => {const badge = card.querySelector('.badge');
                if (badge) {const cardTitle = badge.textContent.toLowerCase();
                    if (cardTitle.includes(searchTerm)) {if (!foundCard) {foundCard = card;}}
                }});
            if (foundCard) {
                foundCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                foundCard.classList.add('card-highlight');
                setTimeout(() => {foundCard.classList.remove('card-highlight');}, 5000);
            }}});
        });

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





