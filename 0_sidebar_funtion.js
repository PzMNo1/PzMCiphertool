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





// 这是子模块滑动切换的交互作用函数
class CipherSwiper {
    constructor(containerSelector, slideSelector, btnSelector, contextId) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;
        this.wrapper = this.container.querySelector('.cipher-swiper-wrapper');
        this.slides = this.container.querySelectorAll(slideSelector);
        this.navBtns = document.querySelectorAll(btnSelector);
        this.contextId = contextId; 
        this.currentIndex = 0;
        this.startX = 0;
        this.startY = 0;
        this.currentTranslate = 0;
        this.prevTranslate = 0;
        this.isDragging = false;
        this.animationID = null;
        this.init();
    }

    init() {
        this.navBtns.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentIndex = index;
                this.setPositionByIndex();
            });
        });

        this.container.addEventListener('touchstart', this.touchStart.bind(this), { passive: false });
        this.container.addEventListener('touchmove', this.touchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.touchEnd.bind(this));
        this.container.addEventListener('mousedown', this.touchStart.bind(this));
        this.container.addEventListener('mousemove', this.touchMove.bind(this));
        this.container.addEventListener('mouseup', this.touchEnd.bind(this));
        this.container.addEventListener('mouseleave', () => {
            if (this.isDragging) this.touchEnd();
        });

        const resizeObserver = new ResizeObserver(() => {
            this.setPositionByIndex(false);
        });
        resizeObserver.observe(this.container);
        this.setPositionByIndex(false);
        if (!window.cipherSwipers) window.cipherSwipers = [];
        window.cipherSwipers.push(this);
    }

    updateNavButtons() {
        this.navBtns.forEach(btn => btn.classList.remove('active'));
        if(this.navBtns[this.currentIndex]) this.navBtns[this.currentIndex].classList.add('active');
    }

    setSliderPosition() {
        this.wrapper.style.transform = `translateX(${this.currentTranslate}px)`;
    }

    setPositionByIndex(enableTransition = true) {
        if (this.currentIndex < 0) this.currentIndex = 0;
        if (this.currentIndex >= this.slides.length) this.currentIndex = this.slides.length - 1;

        const width = this.container.offsetWidth;
        this.currentTranslate = this.currentIndex * -width;
        this.prevTranslate = this.currentTranslate;

        if (enableTransition) {
            this.wrapper.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        } else {this.wrapper.style.transition = 'none';}
        this.setSliderPosition();
        this.updateNavButtons();
        this.slides.forEach(s => s.classList.remove('active'));
        if (this.slides[this.currentIndex]) {
            this.slides[this.currentIndex].classList.add('active');
            // 动态调整容器高度以适应当前子模块
            requestAnimationFrame(() => {
                this.container.style.height = this.slides[this.currentIndex].scrollHeight + 'px';
            });
        }
    }

    touchStart(event) {
        if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
        this.isDragging = true;
        this.startX = this.getPositionX(event);
        this.startY = this.getPositionY(event);
        this.animationID = requestAnimationFrame(this.animation.bind(this));
        this.wrapper.style.transition = 'none';
    }

    touchMove(event) {
        if (this.isDragging) {
            const currentX = this.getPositionX(event);
            const currentY = this.getPositionY(event);
            const deltaX = currentX - this.startX;
            const deltaY = currentY - this.startY;
            if (Math.abs(deltaY) > Math.abs(deltaX)) return;
            if (event.cancelable) event.preventDefault();
            this.currentTranslate = this.prevTranslate + deltaX;
        }
    }

    touchEnd() {
        this.isDragging = false;
        cancelAnimationFrame(this.animationID);
        const movedBy = this.currentTranslate - this.prevTranslate;
        const width = this.container.offsetWidth;
        if (movedBy < -width / 4 && this.currentIndex < this.slides.length - 1) {
            this.currentIndex += 1;
        } else if (movedBy > width / 4 && this.currentIndex > 0) {
            this.currentIndex -= 1;
        }
        this.setPositionByIndex();
    }

    getPositionX(event) {return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;}
    getPositionY(event) {return event.type.includes('mouse') ? event.pageY : event.touches[0].clientY;}
    animation() {
        if (this.isDragging) {
            this.setSliderPosition();
            requestAnimationFrame(this.animation.bind(this));
        }
    }
    
    slideToIndex(index) {
        this.currentIndex = index;
        this.setPositionByIndex();
    }
}



// 这是加密实验室和意见反馈模块的子模块滑动切换的容器支持
const swiper1 = new CipherSwiper('#jiamishiyanshi-content .cipher-swiper-container', '.cipher-swiper-wrapper .submodule', '.submodule-btn', 'jiamishiyanshi-content');
const swiper2 = new CipherSwiper('#yijianfankui-content .cipher-swiper-container', '.cipher-swiper-wrapper .lianxiwomen-submodule', '.contact-submodule-btn', 'yijianfankui-content');




// 键盘切换子模块区域的交互作用函数 (通用)
document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const activeSection = document.querySelector('.content-section[style*="block"]');
    if (!activeSection) return;
    const activeSwiper = window.cipherSwipers?.find(swiper => swiper.contextId === activeSection.id);
    if (activeSwiper) {
        if (e.key === 'ArrowLeft') {
            if (activeSwiper.currentIndex > 0) {
                activeSwiper.currentIndex--;
                activeSwiper.setPositionByIndex();
            }
        } else if (e.key === 'ArrowRight') {
            if (activeSwiper.currentIndex < activeSwiper.slides.length - 1) {
                activeSwiper.currentIndex++;
                activeSwiper.setPositionByIndex();
            }
        }
    }
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



// 这是侧边栏搜索框搜索后卡片按钮定位高亮的交互作用函数
function highlightAndScroll(target) {
    if (!target) return;
    const isLogic = target.classList.contains('logic-btn');
    const submodule = target.closest('.submodule, .lianxiwomen-submodule');
    if (submodule && window.cipherSwipers) {
        const swiper = window.cipherSwipers.find(s => {
            return Array.from(s.slides).includes(submodule);
        });
        if (swiper) {
            const index = Array.from(swiper.slides).indexOf(submodule);
            if (index !== -1) {
                swiper.slideToIndex(index);
                swiper.container.scrollLeft = 0;
            }
            const section = swiper.container.closest('.content-section');
            if (section && section.style.display === 'none') {
                const menuId = section.id.replace('-content', '');
                const menuItem = document.querySelector(`.menu-item[data-target="${menuId}"]`);
                if (menuItem) menuItem.click();
            }
        }
    }
    target.classList.add(isLogic ? 'logic-highlight' : 'card-highlight');
    setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetTop = rect.top + scrollTop;
        const viewportHeight = window.innerHeight;
        const scrollToY = targetTop - viewportHeight / 2 + rect.height / 2;
        window.scrollTo({
            top: scrollToY,
            behavior: 'smooth'
        });
    }, 10);

    setTimeout(() => target.classList.remove(isLogic ? 'logic-highlight' : 'card-highlight'), 5000);
}




//这是经典区-现代区【搜索密码卡片】功能的交互作用函数
function initQuickNav(regionId) {
    const input = document.getElementById(`quick-nav-input-${regionId}`);
    const listContainer = document.getElementById(`quick-nav-options-${regionId}`);
    const container = document.getElementById(`quick-nav-container-${regionId}`);
    if (!input || !listContainer) return;
    function getCardOptions() {
        const cards = document.querySelectorAll(`#${regionId} .card:not(.main-input)`);
        const options = [];
        cards.forEach(card => {
            const badge = card.querySelector('.badge');
            if (badge) {options.push({text: badge.textContent, element: card});}});
        return options;}
    function renderOptions(filterText = '') {
        listContainer.innerHTML = '';
        const options = getCardOptions();
        const filtered = options.filter(opt => 
            opt.text.toLowerCase().includes(filterText.toLowerCase()));
        if (filtered.length === 0) {listContainer.innerHTML = '<div class="quick-nav-option" style="color:#777;cursor:default;">无匹配结果</div>';
            return;}
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

    input.addEventListener('focus', () => {renderOptions(input.value);listContainer.classList.add('show');});
    input.addEventListener('input', (e) => {renderOptions(e.target.value);listContainer.classList.add('show');});
    input.addEventListener('keydown', (e) => {if (e.key === 'Enter' || e.keyCode === 13) {e.preventDefault(); 
            const filterText = input.value.toLowerCase().trim(); if (!filterText) return;
            const options = getCardOptions();
            const matched = options.find(opt => opt.text.toLowerCase().includes(filterText));
            if (matched) {input.blur(); listContainer.classList.remove('show'); highlightAndScroll(matched.element);
            }
        }
    });
    document.addEventListener('click', (e) => {if (!container.contains(e.target)) {listContainer.classList.remove('show');
        }
    });
}





// 输入框置顶功能的交互逻辑
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.pin-toggle-btn'); 
    if (btn) {
        const card = btn.closest('.card');
        if (card) {
            e.preventDefault();
            const isPinned = card.classList.contains('pinned');
            const tag = btn.querySelector('.cyber-button__tag');
            if (!isPinned) {
                const placeholder = document.createElement('div');
                placeholder.className = 'card-placeholder'; 
                if (card.classList.contains('main-input')) {
                    placeholder.classList.add('main-input');
                }   placeholder.style.display = 'none';
                const pid = 'pin-placeholder-' + Date.now();
                placeholder.id = pid;
                card.dataset.placeholderId = pid;
                card.parentNode.insertBefore(placeholder, card);
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;
                document.body.appendChild(card);
                requestAnimationFrame(() => {
                    card.classList.add('pinned');
                    // 恢复滚动位置，防止因DOM变动导致页面跳动
                    window.scrollTo(scrollX, scrollY);
                });
                if (tag) tag.textContent = '取消置顶';
            } else {
                const pid = card.dataset.placeholderId;
                const placeholder = document.getElementById(pid);
                if (placeholder) {
                    card.classList.remove('pinned');
                    placeholder.parentNode.insertBefore(card, placeholder);
                    placeholder.remove();
                    delete card.dataset.placeholderId;
                } else {card.classList.remove('pinned');}
                if (tag) tag.textContent = '置顶';
            }
        }
    }
});





// 侧边栏防止键盘弹出时被挤压
function initMobileHeight() {
    const setHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };  setHeight();
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        if (window.innerWidth !== lastWidth) {
            lastWidth = window.innerWidth;
            setHeight();
        }
    });
}
initMobileHeight();
