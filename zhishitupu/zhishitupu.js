// 动态加载外部脚本的辅助函数
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const scriptName = src.split('/').pop().split('@')[0];
        if (document.querySelector(`script[src*="${scriptName}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`加载脚本失败: ${src}`));
        document.body.appendChild(script);
    });
}

// 知识图谱主入口
async function initKnowledgeGraph() {
    const container = document.getElementById('graph-wrapper');
    const loader = document.getElementById('zstp-loader');
    
    if (!container) return;
    // 防止重复初始化
    if (container.querySelector('canvas')) return;

    try {
        // 0. 加载科幻字体 (Orbitron)
        if (!document.getElementById('sci-fi-font')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'sci-fi-font';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
            // 尝试等待字体加载
            try { await document.fonts.load('1em Orbitron'); } catch(e) {}
        }

        // 1. 动态加载依赖库 (按顺序)
        if (typeof THREE === 'undefined') {
            // console.log('正在加载 Three.js...');
            await loadScript('https://unpkg.com/three@0.160.0/build/three.min.js');
        }
        if (typeof SpriteText === 'undefined') {
            // console.log('正在加载 SpriteText...');
            await loadScript('https://unpkg.com/three-spritetext@1.8.1/dist/three-spritetext.min.js');
        }
        if (typeof ForceGraph3D === 'undefined') {
            // console.log('正在加载 3D Force Graph...');
            await loadScript('https://unpkg.com/3d-force-graph@1.73.1/dist/3d-force-graph.min.js');
        }

        // 2. 库加载完毕，开始渲染图谱
        renderGraph(container);

        // 3. 隐藏 Loading 动画
        if(loader) {
            setTimeout(() => {
                loader.style.opacity = 0;
                setTimeout(() => loader.style.display = 'none', 500);
            }, 1000);
        }

    } catch (error) {
        console.error('知识图谱初始化失败:', error);
        if(loader) loader.innerText = "网络连接失败，无法加载 3D 组件";
    }
}

// --- 核心渲染逻辑 ---
function renderGraph(container) {
    // 1. 配色方案
    const THEME = {
        root: 0xFFD700,      // 红色核心
        category: 0x00ffff,  // 青色分类
        classic: 0x3498db,   // 蓝色经典
        modern: 0x9b59b6,    // 紫色现代
        logic: 0xf1c40f,     // 金色逻辑
        text: '#e0ffff',     // 科幻白 (LightCyan)，比纯白更具全息感
    };

    // 2. 创建发光贴图 (Glow Texture)
    function createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    const glowTexture = createGlowTexture();

    // 3. 数据结构 
    const gData = {
        nodes: [
            { id: 'root', name: '加密实验室', val: 80, color: THEME.root, group: 'root' },
            { id: 'cat_classic', name: '经典区', val: 40, color: THEME.category, group: 'category' },
            { id: 'cat_modern', name: '现代区', val: 40, color: THEME.category, group: 'category' },
            { id: 'cat_logic', name: '逻辑区', val: 40, color: THEME.category, group: 'category' },
            { id: 'cat_word', name: '词汇区', val: 20, color: THEME.category, group: 'category' },
            // 经典区
            { id: 'c_caesar', name: '凯撒 Caesar', group: 'classic' },
            { id: 'c_vigenere', name: '维吉尼亚 Vigenère', group: 'classic' },
            { id: 'c_rail', name: '栅栏 Rail Fence', group: 'classic' },
            { id: 'c_atbash', name: 'AtBash 埃特巴什', group: 'classic' },
            { id: 'c_base', name: '进制 Base Converter', group: 'classic' },
            { id: 'c_morse', name: '摩尔斯 Morse', group: 'classic' },
            { id: 'c_phone', name: '手机九键 Phone Keypad', group: 'classic' },
            { id: 'c_beale', name: '比尔密码 Beale Cipher', group: 'classic' },
            { id: 'c_fanqie', name: '反切码 Fanqie', group: 'classic' },
            { id: 'c_dna', name: 'mRNA序列 mRNA Sequence', group: 'classic' },
            { id: 'c_vkey', name: 'V字键盘 V-Keyboard', group: 'classic' },
            { id: 'c_qwe', name: 'QWE键盘 QWE Keyboard', group: 'classic' },
            { id: 'c_bacon', name: 'Bacon 培根', group: 'classic' },
            { id: 'c_colrail', name: '柱状栅栏 Columnar Rail Fence', group: 'classic' },
            { id: 'c_wrail', name: 'W型栅栏 W-Rail Fence', group: 'classic' },
            { id: 'c_01248', name: '01248密码 01248 Cipher', group: 'classic' },
            { id: 'c_vowel', name: '元音密码 Vowel', group: 'classic' },
            { id: 'c_ascii', name: 'ASCII码', group: 'classic' },
            { id: 'c_ctc', name: '中文电码 Chinese Telegraph Code', group: 'classic' },
            { id: 'c_fourcc', name: '四角号码 Four Corner Code', group: 'classic' },
            { id: 'c_rot', name: 'ROT 旋转加密', group: 'classic' },
            { id: 'c_polybius', name: 'Polybius Square 波利比乌斯方阵', group: 'classic' },
            { id: 'c_adfgx', name: 'ADFGX/ADFVGX 密码', group: 'classic' },
            { id: 'c_affine', name: '仿射 Affine', group: 'classic' },
            { id: 'c_tap', name: '敲击码 Tap Code', group: 'classic' },
            { id: 'c_bifid', name: 'BifidCipher 双密码', group: 'classic' },
            { id: 'c_sembra', name: '旗语-盲文 Semaphore-Braille', group: 'classic' },
            { id: 'c_basecode', name: 'Base 编码', group: 'classic' },
            // 现代区
            { id: 'm_md5', name: 'MD5', group: 'modern' ,val: 20},
            { id: 'm_sha1', name: 'SHA-1', group: 'modern' ,val: 15},
            { id: 'm_sha256', name: 'SHA-256', group: 'modern' ,val: 15},
            { id: 'm_sha384', name: 'SHA-384', group: 'modern' ,val: 15},
            { id: 'm_sha512', name: 'SHA-512', group: 'modern' ,val: 15},
            { id: 'm_enigma', name: 'Enigma', group: 'modern', val: 30 }, 
            // 逻辑区
            { id: 'l_sudoku', name: '数独', group: 'logic' },
            { id: 'l_akari', name: 'Akari', group: 'logic' },
            { id: 'l_aqre', name: 'Aqre', group: 'logic' },
            { id: 'l_aquapelago', name: 'Aquapelago', group: 'logic' },
            { id: 'l_aquarium', name: 'Aquarium', group: 'logic' },
            { id: 'l_balanceloop', name: 'Balance Loop', group: 'logic' },
            { id: 'l_battleship', name: 'Battleship', group: 'logic' },
            { id: 'l_binairo', name: 'Binairo', group: 'logic' },
            { id: 'l_castlewall', name: 'Castle Wall', group: 'logic' },
            { id: 'l_cave', name: 'Cave', group: 'logic' },
            { id: 'l_chocobanana', name: 'Chocobanana', group: 'logic' },
            { id: 'l_chocona', name: 'Chocona', group: 'logic' },
            { id: 'l_countryroad', name: 'Country Road', group: 'logic' },
            { id: 'l_doppelblock', name: 'Doppelblock', group: 'logic' },
            { id: 'l_easyas', name: 'Easy as ABC', group: 'logic' },
            { id: 'l_fillomino', name: 'Fillomino', group: 'logic' },
            { id: 'l_gokigen', name: 'Gokigen', group: 'logic' },
            { id: 'l_haisu', name: 'Haisu', group: 'logic' },
            { id: 'l_haisuslow', name: 'Haisu Slow', group: 'logic' },
            { id: 'l_hamle', name: 'Hamle', group: 'logic' },
            { id: 'l_hashi', name: 'Hashi', group: 'logic' },
            { id: 'l_heteromino', name: 'Heteromino', group: 'logic' },
            { id: 'l_heyawake', name: 'Heyawake', group: 'logic' },
            { id: 'l_hitori', name: 'Hitori', group: 'logic' },
            { id: 'l_hotaru', name: 'Hotaru', group: 'logic' },
            { id: 'l_kakuro', name: 'Kakuro', group: 'logic' },
            { id: 'l_kuromasu', name: 'Kuromasu', group: 'logic' },
            { id: 'l_kurotto', name: 'Kurotto', group: 'logic' },
            { id: 'l_lits', name: 'LITS', group: 'logic' },
            { id: 'l_magnets', name: 'Magnets', group: 'logic' },
            { id: 'l_masyu', name: 'Masyu', group: 'logic' },
            { id: 'l_minesweeper', name: 'Minesweeper', group: 'logic' },
            { id: 'l_moonsun', name: 'Moon-Sun', group: 'logic' },
            { id: 'l_nagare', name: 'Nagare', group: 'logic' },
            { id: 'l_nanro', name: 'Nanro', group: 'logic' },
            { id: 'l_ncells', name: 'N-Cells', group: 'logic' },
            { id: 'l_nonogram', name: 'Nonogram', group: 'logic' },
            { id: 'l_norinori', name: 'Norinori', group: 'logic' },
            { id: 'l_numberlink', name: 'Numberlink', group: 'logic' },
            { id: 'l_nuribou', name: 'Nuribou', group: 'logic' },
            { id: 'l_nurikabe', name: 'Nurikabe', group: 'logic' },
            { id: 'l_nurimisaki', name: 'Nurimisaki', group: 'logic' },
            { id: 'l_onsen', name: 'Onsen', group: 'logic' },
            { id: 'l_rippleeffect', name: 'Ripple Effect', group: 'logic' },
            { id: 'l_shakashaka', name: 'Shakashaka', group: 'logic' },
            { id: 'l_shikaku', name: 'Shikaku', group: 'logic' },
            { id: 'l_shimaguni', name: 'Shimaguni', group: 'logic' },
            { id: 'l_skyscrapers', name: 'Skyscrapers', group: 'logic' },
            { id: 'l_slitherlink', name: 'Slitherlink', group: 'logic' },
            { id: 'l_spiralgalaxies', name: 'Spiral Galaxies', group: 'logic' },
            { id: 'l_starbattle', name: 'Star Battle', group: 'logic' },
            { id: 'l_statuepark', name: 'Statue Park', group: 'logic' },
            { id: 'l_stostone', name: 'Stostone', group: 'logic' },
            { id: 'l_tapa', name: 'Tapa', group: 'logic' },
            { id: 'l_tatamibari', name: 'Tatamibari', group: 'logic' },
            { id: 'l_tents', name: 'Tents', group: 'logic' },
            { id: 'l_tll', name: 'TLL', group: 'logic' },
            { id: 'l_tren', name: 'Tren', group: 'logic' },
            { id: 'l_yajilin', name: 'Yajilin', group: 'logic' },
            { id: 'l_yajisankazusan', name: 'Yajisan-Kazusan', group: 'logic' },
            { id: 'l_yinyang', name: 'Yin-Yang', group: 'logic' },
            { id: 'w_burst', name: '爆破', group: 'word' }
        ],
        links: [
            { source: 'root', target: 'cat_classic' },
            { source: 'root', target: 'cat_modern' },
            { source: 'root', target: 'cat_logic' },
            { source: 'root', target: 'cat_word' },
            { source: 'cat_classic', target: 'c_caesar' },
            { source: 'cat_classic', target: 'c_vigenere' },
            { source: 'cat_classic', target: 'c_rail' },
            { source: 'cat_classic', target: 'c_atbash' },
            { source: 'cat_classic', target: 'c_base' },
            { source: 'cat_classic', target: 'c_morse' },
            { source: 'cat_classic', target: 'c_phone' },
            { source: 'cat_classic', target: 'c_beale' },
            { source: 'cat_classic', target: 'c_fanqie' },
            { source: 'cat_classic', target: 'c_dna' },
            { source: 'cat_classic', target: 'c_vkey' },
            { source: 'cat_classic', target: 'c_qwe' },
            { source: 'cat_classic', target: 'c_bacon' },
            { source: 'cat_classic', target: 'c_colrail' },
            { source: 'cat_classic', target: 'c_wrail' },
            { source: 'cat_classic', target: 'c_01248' },
            { source: 'cat_classic', target: 'c_vowel' },
            { source: 'cat_classic', target: 'c_ascii' },
            { source: 'cat_classic', target: 'c_ctc' },
            { source: 'cat_classic', target: 'c_fourcc' },
            { source: 'cat_classic', target: 'c_rot' },
            { source: 'cat_classic', target: 'c_polybius' },
            { source: 'cat_classic', target: 'c_adfgx' },
            { source: 'cat_classic', target: 'c_affine' },
            { source: 'cat_classic', target: 'c_tap' },
            { source: 'cat_classic', target: 'c_bifid' },
            { source: 'cat_classic', target: 'c_sembra' },
            { source: 'cat_classic', target: 'c_basecode' },
            { source: 'cat_modern', target: 'm_md5' },
            { source: 'cat_modern', target: 'm_sha1' },
            { source: 'cat_modern', target: 'm_sha256' },
            { source: 'cat_modern', target: 'm_sha384' },
            { source: 'cat_modern', target: 'm_sha512' },
            { source: 'cat_modern', target: 'm_enigma' },
            { source: 'cat_logic', target: 'l_sudoku' },
            { source: 'cat_logic', target: 'l_akari' },
            { source: 'cat_logic', target: 'l_aqre' },
            { source: 'cat_logic', target: 'l_aquapelago' },
            { source: 'cat_logic', target: 'l_aquarium' },
            { source: 'cat_logic', target: 'l_balanceloop' },
            { source: 'cat_logic', target: 'l_battleship' },
            { source: 'cat_logic', target: 'l_binairo' },
            { source: 'cat_logic', target: 'l_castlewall' },
            { source: 'cat_logic', target: 'l_cave' },
            { source: 'cat_logic', target: 'l_chocobanana' },
            { source: 'cat_logic', target: 'l_chocona' },
            { source: 'cat_logic', target: 'l_countryroad' },
            { source: 'cat_logic', target: 'l_doppelblock' },
            { source: 'cat_logic', target: 'l_easyas' },
            { source: 'cat_logic', target: 'l_fillomino' },
            { source: 'cat_logic', target: 'l_gokigen' },
            { source: 'cat_logic', target: 'l_haisu' },
            { source: 'cat_logic', target: 'l_haisuslow' },
            { source: 'cat_logic', target: 'l_hamle' },
            { source: 'cat_logic', target: 'l_hashi' },
            { source: 'cat_logic', target: 'l_heteromino' },
            { source: 'cat_logic', target: 'l_heyawake' },
            { source: 'cat_logic', target: 'l_hitori' },
            { source: 'cat_logic', target: 'l_hotaru' },
            { source: 'cat_logic', target: 'l_kakuro' },
            { source: 'cat_logic', target: 'l_kuromasu' },
            { source: 'cat_logic', target: 'l_kurotto' },
            { source: 'cat_logic', target: 'l_lits' },
            { source: 'cat_logic', target: 'l_magnets' },
            { source: 'cat_logic', target: 'l_masyu' },
            { source: 'cat_logic', target: 'l_minesweeper' },
            { source: 'cat_logic', target: 'l_moonsun' },
            { source: 'cat_logic', target: 'l_nagare' },
            { source: 'cat_logic', target: 'l_nanro' },
            { source: 'cat_logic', target: 'l_ncells' },
            { source: 'cat_logic', target: 'l_nonogram' },
            { source: 'cat_logic', target: 'l_norinori' },
            { source: 'cat_logic', target: 'l_numberlink' },
            { source: 'cat_logic', target: 'l_nuribou' },
            { source: 'cat_logic', target: 'l_nurikabe' },
            { source: 'cat_logic', target: 'l_nurimisaki' },
            { source: 'cat_logic', target: 'l_onsen' },
            { source: 'cat_logic', target: 'l_rippleeffect' },
            { source: 'cat_logic', target: 'l_shakashaka' },
            { source: 'cat_logic', target: 'l_shikaku' },
            { source: 'cat_logic', target: 'l_shimaguni' },
            { source: 'cat_logic', target: 'l_skyscrapers' },
            { source: 'cat_logic', target: 'l_slitherlink' },
            { source: 'cat_logic', target: 'l_spiralgalaxies' },
            { source: 'cat_logic', target: 'l_starbattle' },
            { source: 'cat_logic', target: 'l_statuepark' },
            { source: 'cat_logic', target: 'l_stostone' },
            { source: 'cat_logic', target: 'l_tapa' },
            { source: 'cat_logic', target: 'l_tatamibari' },
            { source: 'cat_logic', target: 'l_tents' },
            { source: 'cat_logic', target: 'l_tll' },
            { source: 'cat_logic', target: 'l_tren' },
            { source: 'cat_logic', target: 'l_yajilin' },
            { source: 'cat_logic', target: 'l_yajisankazusan' },
            { source: 'cat_logic', target: 'l_yinyang' },
            { source: 'cat_word', target: 'w_burst' }
        ]
    };

    // 4. 初始化图谱
    const Graph = ForceGraph3D()(container)
        .graphData(gData)
        .backgroundColor('#000005') // 深邃太空黑
        .showNavInfo(false)
        .width(container.clientWidth)
        .height(container.clientHeight)
        
        // --- 节点自定义渲染  ---
        .nodeThreeObject(node => {
            const group = new THREE.Group();

            // 4.1 核心几何体
            let geometry, material, mesh;
            const color = node.color || 0xffffff;
            const size = Math.sqrt(node.val || 1) * 1.5;

            if (node.group === 'root') {
                // 根节点：复杂的环绕球体
                geometry = new THREE.IcosahedronGeometry(size, 2);
                material = new THREE.MeshPhongMaterial({ 
                    color: color, 
                    wireframe: true,
                    emissive: color,
                    emissiveIntensity: 0.5 
                });
                mesh = new THREE.Mesh(geometry, material);
                
                // 添加行星环
                const ringGeo = new THREE.TorusGeometry(size * 1.5, 0.2, 8, 50);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2;
                group.add(ring);

                // 内部实体
                const coreGeo = new THREE.SphereGeometry(size * 0.6, 16, 16);
                const coreMat = new THREE.MeshBasicMaterial({ color: color });
                group.add(new THREE.Mesh(coreGeo, coreMat));

            } else if (node.group === 'category') {
                // 分类节点：正八面体
                geometry = new THREE.OctahedronGeometry(size);
                material = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
                mesh = new THREE.Mesh(geometry, material);
            } else {
                // 叶子节点：小方块或四面体
                geometry = node.group === 'classic' ? new THREE.BoxGeometry(size, size, size) : new THREE.TetrahedronGeometry(size);
                material = new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: 0.8 });
                mesh = new THREE.Mesh(geometry, material);
                
                // 叶子节点添加线框壳
                const wireframe = new THREE.LineSegments(
                    new THREE.WireframeGeometry(geometry),
                    new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.3 })
                );
                group.add(wireframe);
            }

            group.add(mesh);

            // 4.2 伪辉光 (Sprite Glow)
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: glowTexture, 
                color: color, 
                transparent: true, 
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(size * 4, size * 4, 1);
            group.add(sprite);

            // 4.3 文本标签
            if (typeof SpriteText !== 'undefined') {
                const text = new SpriteText(node.name);
                text.color = THEME.text;             // 使用新的科幻白
                text.fontFace = 'Orbitron, sans-serif'; // 确保使用科幻字体
                text.fontWeight = '700';             // 加粗
                text.strokeWidth = 0.3;              // 轻微描边增加清晰度
                text.strokeColor = '#000000';        // 黑色描边
                text.textHeight = node.group === 'root' ? 8 : 4;
                text.position.y = size + 2; 
                text.material.transparent = true;
                text.material.opacity = node.group === 'root' ? 1 : 0.9; // 稍微提高不透明度
                group.add(text);
            }

            return group;
        })
        
        // --- 连线特效 ---
        .linkColor(() => 'rgba(0, 255, 255, 0.1)') // 非常淡的青色线
        .linkWidth(0.5)
        .linkDirectionalParticles(3) // 粒子数量 (之前丢失)
        .linkDirectionalParticleWidth(node => 2) // 粒子大小
        .linkDirectionalParticleSpeed(0.005) // 粒子速度
        .linkDirectionalParticleColor(() => '#ffffff') // 粒子颜色
        
        // --- 交互 ---
        .onNodeClick(node => {
            const distance = 100;
            const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
            Graph.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                2000
            );
        });

    // 5. 场景增强 (星空背景)
    const scene = Graph.scene();
    scene.add(new THREE.AmbientLight(0xbbbbbb));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6));

    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000; // 恢复到 2000 个星星
    const posArray = new Float32Array(starCount * 3);
    for(let i = 0; i < starCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 2000; 
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({
        size: 1.5,
        color: 0x88ccff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);

    // 6. 动画循环 (星空旋转)
    let angle = 0;
    
    // 初始化全局状态标记
    window.isZSTPActive = true;

    const animateStars = () => {
        // 添加运行状态检查，如果未激活则停止循环
        if (!window.isZSTPActive) return;

        angle += 0.0003;
        starMesh.rotation.y = angle;
        starMesh.rotation.x = angle * 0.2;
        requestAnimationFrame(animateStars);
    };
    animateStars();

    // 7. 力导向参数
    Graph.d3Force('charge').strength(-150);
    Graph.d3Force('link').distance(80);

    // 8. 窗口自适应
    window.addEventListener('resize', () => {
        if(container && Graph) {
            Graph.width(container.clientWidth);
            Graph.height(container.clientHeight);
        }
    });

    // 在函数末尾暴露全局控制接口
    window.ZSTP = {
        pause: () => {
            if (!window.isZSTPActive) return;
            window.isZSTPActive = false;
            if (Graph) Graph.pauseAnimation(); // 暂停力导向图物理计算和渲染
            console.log('知识图谱已暂停');
        },
        resume: () => {
            if (window.isZSTPActive) return;
            window.isZSTPActive = true;
            if (Graph) Graph.resumeAnimation(); // 恢复物理计算
            animateStars(); // 重启星空动画循环
            console.log('知识图谱已恢复');
        }
    };
}