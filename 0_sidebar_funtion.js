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

// 全局变量锁，防止快速切换导致动画错乱
let isSwitchingSubmodule = false;

// 通用子模块切换函数 
function switchSubmodule(targetId, direction) {
    if (isSwitchingSubmodule) return;
    const current = document.querySelector('.submodule.active');
    const next = document.getElementById(targetId);
    if (!next || current === next) return;
    document.querySelectorAll('.submodule-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.target === targetId);
    });

    if (!current) {
        next.classList.add('active');
        return;
    }

    // 开启锁
    isSwitchingSubmodule = true;

    // 确定动画方向
    let outClass = 'slideOutToLeft';
    let inClass = 'slideInFromRight';
    
    if (direction === 'left') { 
         outClass = 'slideOutToRight'; 
         inClass = 'slideInFromLeft';  
    } else if (direction === 'right') { 
         outClass = 'slideOutToLeft';  
         inClass = 'slideInFromRight'; 
    } else {
         outClass = 'slideOutToLeft'; 
         inClass = 'slideInFromRight';
    }

    current.style.animation = `${outClass} 0.3s forwards ease-in`;
    current.classList.add('animating'); 
    setTimeout(() => {
        current.classList.remove('active', 'animating');
        current.style.animation = '';
        next.classList.add('active', 'animating');
        next.style.animation = `${inClass} 0.3s forwards ease-out`;
        
        setTimeout(() => {
            next.classList.remove('animating');
            next.style.animation = '';
            isSwitchingSubmodule = false;
        }, 150);
        
    }, 150);
}

// 这是加密实验室里的子模块切换逻辑 (更新为使用 switchSubmodule)
document.querySelectorAll('.submodule-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        switchSubmodule(this.dataset.target, 'default');
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


// Navigation logic for Encryption Lab
function initModuleNavigation() {
    const moduleContainer = document.getElementById('jiamishiyanshi-container');
    const sidebar = document.querySelector('.sidebar');

    function navigateSubmodule(direction) {
        // Ensure we are in the encryption lab
        if (!moduleContainer || moduleContainer.style.display === 'none') return;

        const buttons = Array.from(document.querySelectorAll('#jiamishiyanshi-content .submodule-btn'));
        const activeIndex = buttons.findIndex(btn => btn.classList.contains('active'));
        
        if (activeIndex === -1) return;

        const nextIndex = activeIndex + direction;

        if (nextIndex >= 0 && nextIndex < buttons.length) {
            // Use switchSubmodule with direction instead of clicking button
            const targetId = buttons[nextIndex].dataset.target;
            const dirStr = direction > 0 ? 'right' : 'left';
            switchSubmodule(targetId, dirStr);
        } else {
            // Boundary reached
            if (sidebar) {
                sidebar.classList.add('expanded');
                
                // Click outside to close
                const closeSidebar = (e) => {
                    // Check if click is outside sidebar
                    if (!sidebar.contains(e.target)) {
                        sidebar.classList.remove('expanded');
                        document.removeEventListener('click', closeSidebar);
                    }
                };
                
                // Remove any existing listeners to prevent duplicates (though locally defined)
                // Use setTimeout to avoid immediate trigger if this was caused by a click
                setTimeout(() => document.addEventListener('click', closeSidebar), 0);
            }
        }
    }

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        // Check if encryption lab is visible
        if (!moduleContainer || moduleContainer.style.display === 'none') return;
        
        // Ignore if user is typing in an input
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.key === 'ArrowLeft') {
            navigateSubmodule(-1); // Go previous (Left)
        } else if (e.key === 'ArrowRight') {
            navigateSubmodule(1);  // Go next (Right)
        }
    });

    // Mouse Swipe Navigation
    let startX = 0;
    let isDragging = false;
    // Using container1 as the touch area
    const touchArea = document.querySelector('.container1');
    
    if (touchArea) {
        touchArea.addEventListener('mousedown', (e) => {
            // Only start drag if we're not on an input
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            
            startX = e.clientX;
            isDragging = true;
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            // If encryption lab is not visible, do nothing
            if (!moduleContainer || moduleContainer.style.display === 'none') return;

            const diff = e.clientX - startX;
            const threshold = 100; // Minimum distance for swipe

            if (Math.abs(diff) > threshold) {
                if (diff > 0) {
                    // Drag Right -> Go Left (Previous)
                    navigateSubmodule(-1);
                } else {
                    // Drag Left -> Go Right (Next)
                    navigateSubmodule(1);
                }
            }
        });
    }
}

// Call initModuleNavigation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModuleNavigation);
} else {
    initModuleNavigation();
}
