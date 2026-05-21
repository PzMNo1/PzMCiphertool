// 逻辑谜题区管理器 (Logic Puzzle Manager) - Integrated from 333.html
function initLogicPuzzles() {
    // 防止重复初始化
    if (window.logicPuzzlesInitialized) return;
    window.logicPuzzlesInitialized = true;

    // --- 1. 数据源 (Data) ---
    const RAW_PUZZLES = [
        { id: 1, name: "数独", en: "Sudoku", file: "./logic/1_sudoku.html" },
        { id: 2, name: "Akari", en: "Light Up", file: "./logic/2_Akari.html" },
        { id: 3, name: "Aqre", en: "Aqre", file: "./logic/3_Aqre.html" },
        { id: 4, name: "Aquapelago", en: "Aquapelago", file: "./logic/4_aquapelago.html" },
        { id: 5, name: "Aquarium", en: "Aquarium", file: "./logic/5_aquarium.html" },
        { id: 6, name: "Balanceloop", en: "Balanceloop", file: "./logic/6_balanceloop.html" },
        { id: 7, name: "Battleship", en: "Battleship", file: "./logic/7_battleship.html" },
        { id: 8, name: "Binairo", en: "Binairo", file: "./logic/8_binairo.html" },
        { id: 9, name: "Castlewall", en: "Castlewall", file: "./logic/9_castlewall.html" },
        { id: 10, name: "Cave", en: "Cave", file: "./logic/10_cave.html" },
        { id: 11, name: "Chocobanana", en: "Chocobanana", file: "./logic/11_chocobanana.html" },
        { id: 12, name: "Chocona", en: "Chocona", file: "./logic/12_chocona.html" },
        { id: 15, name: "Countryroad", en: "Countryroad", file: "./logic/15_countryroad.html" },
        { id: 16, name: "Doppelblock", en: "Doppelblock", file: "./logic/16_doppelblock.html" },
        { id: 17, name: "Easyas", en: "Easyas", file: "./logic/17_easyas.html" },
        { id: 18, name: "Fillomino", en: "Fillomino", file: "./logic/18_fillomino.html" },
        { id: 19, name: "Gokigen", en: "Gokigen", file: "./logic/19_gokigen.html" },
        { id: 20, name: "Haisu", en: "Haisu", file: "./logic/20_haisu.html" },
        { id: 21, name: "Haisuslow", en: "Haisuslow", file: "./logic/21_haisuslow.html" },
        { id: 22, name: "Hamle", en: "Hamle", file: "./logic/22_hamle.html" },
        { id: 23, name: "Hashi", en: "Hashi", file: "./logic/23_hashi.html" },
        { id: 24, name: "Heteromino", en: "Heteromino", file: "./logic/24_heteromino.html" },
        { id: 25, name: "Heyawake", en: "Heyawake", file: "./logic/25_heyawake.html" },
        { id: 26, name: "Hitori", en: "Hitori", file: "./logic/26_hitori.html" },
        { id: 27, name: "Hotaru", en: "Hotaru", file: "./logic/27_hotaru.html" },
        { id: 28, name: "Kakuro", en: "Kakuro", file: "./logic/28_kakuro.html" },
        { id: 29, name: "Kuromasu", en: "Kuromasu", file: "./logic/29_kuromasu.html" },
        { id: 30, name: "Kurotto", en: "Kurotto", file: "./logic/30_kurotto.html" },
        { id: 31, name: "Lits", en: "Lits", file: "./logic/31_lits.html" },
        { id: 32, name: "Magnets", en: "Magnets", file: "./logic/32_magnets.html" },
        { id: 33, name: "Masyu", en: "Masyu", file: "./logic/33_masyu.html" },
        { id: 34, name: "Minesweeper", en: "Minesweeper", file: "./logic/34_minesweeper.html" },
        { id: 35, name: "Moonsun", en: "Moonsun", file: "./logic/35_moonsun.html" },
        { id: 36, name: "Nagare", en: "Nagare", file: "./logic/36_nagare.html" },
        { id: 37, name: "Nanro", en: "Nanro", file: "./logic/37_nanro.html" },
        { id: 38, name: "Ncells", en: "Ncells", file: "./logic/38_ncells.html" },
        { id: 39, name: "Nonogram", en: "Nonogram", file: "./logic/39_nonogram.html" },
        { id: 40, name: "Norinori", en: "Norinori", file: "./logic/40_norinori.html" },
        { id: 41, name: "Numberlink", en: "Numberlink", file: "./logic/41_numberlink.html" },
        { id: 42, name: "Nuribou", en: "Nuribou", file: "./logic/42_nuribou.html" },
        { id: 43, name: "Nurikabe", en: "Nurikabe", file: "./logic/43_nurikabe.html" },
        { id: 44, name: "Nurimisaki", en: "Nurimisaki", file: "./logic/44_nurimisaki.html" },
        { id: 45, name: "Onsen", en: "Onsen", file: "./logic/45_onsen.html" },
        { id: 46, name: "Ripple Effect", en: "Ripple Effect", file: "./logic/46_rippleeffect.html" },
        { id: 47, name: "Shakashaka", en: "Shakashaka", file: "./logic/47_shakashaka.html" },
        { id: 48, name: "Shikaku", en: "Shikaku", file: "./logic/48_shikaku.html" },
        { id: 49, name: "Shimaguni", en: "Shimaguni", file: "./logic/49_shimaguni.html" },
        { id: 50, name: "Skyscrapers", en: "Skyscrapers", file: "./logic/50_skyscrapers.html" },
        { id: 51, name: "Slitherlink", en: "Slitherlink", file: "./logic/51_slitherlink.html" },
        { id: 52, name: "Spiral Galaxies", en: "Spiral Galaxies", file: "./logic/52_spiralgalaxies.html" },
        { id: 53, name: "Starbattle", en: "Starbattle", file: "./logic/53_starbattle.html" },
        { id: 54, name: "Statuepark", en: "Statuepark", file: "./logic/54_statuepark.html" },
        { id: 55, name: "Stostone", en: "Stostone", file: "./logic/55_stostone.html" },
        { id: 56, name: "Tapa", en: "Tapa", file: "./logic/56_tapa.html" },
        { id: 57, name: "Tatamibari", en: "Tatamibari", file: "./logic/57_tatamibari.html" },
        { id: 58, name: "Tents", en: "Tents", file: "./logic/58_tents.html" },
        { id: 59, name: "Tll", en: "Tll", file: "./logic/59_tll.html" },
        { id: 60, name: "Tren", en: "Tren", file: "./logic/60_tren.html" },
        { id: 61, name: "Yajilin", en: "Yajilin", file: "./logic/61_yajilin.html" },
        { id: 62, name: "Yajisan", en: "Yajisan Kazusan", file: "./logic/62_yajisankazusan.html" },
        { id: 63, name: "YinYang", en: "Yin Yang", file: "./logic/63_yinyang.html" },
    ];

    // --- 2. 逻辑 (Logic) ---
    
    // 缓存 DOM 元素 (使用独立ID防止冲突)
    const gridEl = document.getElementById('logic-puzzle-grid');
    const searchEl = document.getElementById('logic-puzzle-search');
    const countEl = document.getElementById('logic-module-count');
    const overlayEl = document.getElementById('logic-boot-overlay');

    if (!gridEl) return; // 元素不存在则退出

    // 图标 SVG
    const gridIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
    
    // 渲染函数
    function renderPuzzles(puzzles) {
        if (puzzles.length === 0) {
            gridEl.innerHTML = `
                <div class="no-results">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    <h3>NO DATA FOUND</h3>
                    <p style="font-family: var(--font-mono); font-size: 0.8rem; color: #555;">QUERY RETURNED ZERO RESULTS.</p>
                </div>
            `;
            if(countEl) countEl.innerHTML = countEl.innerHTML.replace(/MODULES: \d+/, `MODULES: 0`);
            return;
        }

        const html = puzzles.map(p => `
            <a href="${p.file}" class="card-link tech-border logic-btn">
                <div class="puzzle-card">
                    <div class="card-id">
                        <span>NO.${String(p.id).padStart(3, '0')}</span>
                        ${gridIconSvg}
                    </div>
                    <div style="z-index: 10; position: relative;">
                        <h3 class="card-title">${p.name}</h3>
                        ${p.en !== p.name ? `<div class="card-subtitle">${p.en}</div>` : ''}
                    </div>
                    <div class="card-deco-corner"></div>
                </div>
            </a>
        `).join('');

        gridEl.innerHTML = html;
        // 更新计数
        if(countEl) countEl.innerHTML = countEl.innerHTML.replace(/MODULES: \d+/, `MODULES: ${puzzles.length}`);
    }

    // 初始化
    function init() {
        renderPuzzles(RAW_PUZZLES);

        if(searchEl) {
            searchEl.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = RAW_PUZZLES.filter(p => 
                    p.name.toLowerCase().includes(term) || 
                    p.en.toLowerCase().includes(term) ||
                    p.id.toString() === term
                );
                renderPuzzles(filtered);
            });
        }

        initMatrixBackground();

        if(overlayEl) {
            overlayEl.classList.remove('hidden');
            setTimeout(() => {
                overlayEl.classList.add('hidden');
            }, 1500);
        }
    }

    // --- 3. Canvas 动画 ---
    function initMatrixBackground() {
        const canvas = document.getElementById('logic-bg-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];

        function resize() {
            // 适配到父容器而不是全屏，避免覆盖其他Tab
            const parent = canvas.parentElement; 
            if(parent && parent.clientWidth > 0) {
                 width = canvas.width = parent.clientWidth;
                 height = canvas.height = parent.clientHeight;
            } else {
                 width = canvas.width = window.innerWidth;
                 height = canvas.height = window.innerHeight;
            }
        }

        function createParticles() {
            particles = [];
            const count = 50;
            for(let i=0; i<count; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 1
                });
            }
        }

        function animate() {
            if (!document.getElementById('luojimiti').classList.contains('active')) {
                requestAnimationFrame(animate); // 即使不显示也保持循环，或者可以优化暂停
                return; 
            }
            
            ctx.fillStyle = 'rgba(5, 5, 5, 0.1)';
            ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
            ctx.lineWidth = 0.5;

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.fillStyle = '#00f3ff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                particles.forEach(p2 => {
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                });
            });

            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        // 延时执行resize以确保容器已渲染
        setTimeout(() => {
            resize();
            createParticles();
            animate();
        }, 100);
    }

    init();
}
