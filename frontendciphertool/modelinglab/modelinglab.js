(function () {
    const products = [
        {
            id: 'f22',
            title: 'F-22 猛禽',
            subtitle: '隐身制空机',
            headline: 'F-22 猛禽',
            kicker: '隐身战术飞行器',
            system: '自适应结构',
            description: '低可探测机体、矢量控制面与高速任务包线的综合展示。',
            specs: {
                '比例': '制空构型',
                '位置': '外部几何',
                '视图': '主网格',
                '标注': '隐身外壳'
            },
            notes: [
                '折面与翼面轮廓优先强调隐身几何，而不是装饰性细节。',
                '展示流程先隔离产品主体，再通过标注与检视卡片展开系统信息。'
            ],
            shape: 'jet'
        },
        {
            id: 'f35',
            title: 'F-35 闪电',
            subtitle: '隐身多用途机',
            headline: 'F-35 闪电',
            kicker: '多用途飞行器',
            system: '传感器包线',
            description: '以传感器前置布局、紧凑机身与多任务半径为核心的构型研究。',
            specs: {
                '比例': '多任务构型',
                '位置': '传感器几何',
                '视图': '航电外壳',
                '标注': '融合模型'
            },
            notes: [
                '紧凑机身与较短翼展让它和 F-22 条目形成明显区分。',
                '检视模式可聚焦表面连续性、舱段比例或载荷对齐。'
            ],
            shape: 'jet'
        },
        {
            id: 'starship',
            title: '星舰',
            subtitle: '可复用运载器',
            headline: '星舰',
            kicker: '可复用运载器',
            system: '主承力结构',
            description: '覆盖整机外形、气动外壳与载荷路径的主结构模型。',
            specs: {
                '比例': '整机包线',
                '位置': '外部几何',
                '视图': '主模型',
                '标注': '结构标签'
            },
            notes: [
                '外壳结构决定阻力、热载荷、甲板兼容性以及内部机械包线。',
                '展示顺序优先突出剪影，再通过系统标注说明关键结构。'
            ],
            shape: 'rocket'
        },
        {
            id: 'overview',
            title: '星舰总览',
            subtitle: '整机构型总览',
            headline: '星舰总览',
            kicker: '整机构型架构',
            system: '架构堆栈',
            description: '展示级间边界、热防护外壳与任务环境的整机构型视图。',
            specs: {
                '比例': '堆叠整机',
                '位置': '架构视图',
                '视图': '分段总览',
                '标注': '级段系统'
            },
            notes: [
                '总览卡片适合解释外壳、贮箱、发动机与载荷空间之间的关系。',
                '布局保留参考工作台结构，同时使用本项目已有视觉语言。'
            ],
            shape: 'rocket'
        },
        {
            id: 'raptor',
            title: '猛禽发动机',
            subtitle: '甲烷发动机细节',
            headline: '猛禽发动机',
            kicker: '甲烷发动机细节',
            system: '涡轮机械核心',
            description: '燃烧室、涡轮泵轮廓与喷管延伸段的发动机细节视图。',
            specs: {
                '比例': '单台发动机',
                '位置': '推进舱',
                '视图': '喷管细节',
                '标注': '流道结构'
            },
            notes: [
                '发动机视图需要更强对比、轴向对称与紧凑的局部标注。',
                '下方检视条可在喷管、涡轮泵、歧管与安装环之间切换。'
            ],
            shape: 'engine'
        },
        {
            id: 'raptor-cluster',
            title: '猛禽发动机组',
            subtitle: '发动机集群细节',
            headline: '猛禽发动机组',
            kicker: '发动机集群细节',
            system: '集群装配',
            description: '多台推进单元、共享结构环与紧凑推力布局的集群模型。',
            specs: {
                '比例': '集群包线',
                '位置': '尾部结构',
                '视图': '集群模型',
                '标注': '推力组'
            },
            notes: [
                '集群视图保留参考构图：深色发动机主体配合高亮操作控件。',
                '共享安装环与重复喷管构成主要视觉节奏。'
            ],
            shape: 'cluster'
        }
    ];

    const productSearchAliases = {
        f22: 'F-22 Raptor stealth tactical aircraft airframe jet aircraft',
        f35: 'F-35 Lightning stealth multirole aircraft sensor jet aircraft',
        starship: 'Starship reusable launch vehicle rocket spacecraft',
        overview: 'Starship Overview vehicle architecture overview spacecraft',
        raptor: 'Raptor Engine methalox engine detail propulsion',
        'raptor-cluster': 'Raptor Engines engine cluster detail propulsion cluster'
    };

    let currentProduct = products[2];
    let threeState = null;
    let initialized = false;

    function initModelingLab() {
        const root = document.getElementById('modelinglab-root');
        if (!root || initialized) return;
        initialized = true;
        render(root);
        bind(root);
        initThree();
        updateProduct(currentProduct.id);
    }

    function render(root) {
        root.innerHTML = `
            <section class="modelinglab-shell">
                <header class="modelinglab-header module-header">
                    <h2 class="neon-title" data-text="ORBITAL HARDWARE STUDIO">ORBITAL HARDWARE STUDIO</h2>
                </header>

                <div class="modelinglab-layout">
                    <main class="modelinglab-stage">
                        <section class="modelinglab-viewport">
                            <aside class="modelinglab-left">
                                <section class="modelinglab-panel modelinglab-selector-panel">
                                    <div class="modelinglab-toolbar-search">
                                        <input id="modelinglab-product-search" type="text" placeholder="搜索模型...">
                                    </div>
                                    <div class="modelinglab-list">
                                        ${products.map((product, index) => renderProductButton(product, index)).join('')}
                                    </div>
                                </section>
                                <section class="modelinglab-panel modelinglab-compare">
                                    <div class="modelinglab-panel-head"><span>产品对比</span><span>2</span></div>
                                    <div class="modelinglab-compare-card">
                                        <div>
                                            <strong id="modelinglab-compare-a">星舰</strong>
                                            <small id="modelinglab-compare-a-subtitle">可复用运载器</small>
                                        </div>
                                        <div class="modelinglab-versus">VS</div>
                                        <div>
                                            <strong>猛禽发动机</strong>
                                            <small>甲烷发动机细节</small>
                                        </div>
                                    </div>
                                </section>
                            </aside>
                            <div class="modelinglab-canvas-wrap">
                                <canvas id="modelinglab-canvas" aria-label="3D hardware model viewport"></canvas>
                                <div class="modelinglab-fallback-model" id="modelinglab-fallback-model" aria-hidden="true"></div>
                            </div>
                            <div class="modelinglab-label primary" id="modelinglab-primary-label">主承力结构</div>
                            <div class="modelinglab-label inspect">3D 检视</div>
                            <section class="modelinglab-panel modelinglab-view-mode">
                                <div class="modelinglab-panel-head"><span>视图模式</span></div>
                                <div class="modelinglab-view-buttons">
                                    <button class="modelinglab-icon-btn active" type="button">外形</button>
                                    <button class="modelinglab-icon-btn" type="button">层级</button>
                                    <button class="modelinglab-icon-btn" type="button">轨道</button>
                                </div>
                                <div class="modelinglab-toggle-row"><span>剖切</span><span class="modelinglab-switch"></span></div>
                            </section>
                            <div class="modelinglab-actions">
                                <button class="cyber-button active" type="button" data-action="rotate"><span class="cyber-button__tag">旋转</span></button>
                                <button class="cyber-button active" type="button" data-action="isolate"><span class="cyber-button__tag">隔离</span></button>
                                <button class="cyber-button" type="button"><span class="cyber-button__tag">隐藏系统</span></button>
                                <button class="cyber-button" type="button" data-action="reset"><span class="cyber-button__tag">重置视图</span></button>
                                <button class="cyber-button" type="button"><span class="cyber-button__tag">3D 检视</span></button>
                                <button class="cyber-button" type="button"><span class="cyber-button__tag">截图</span></button>
                                <button class="cyber-button" type="button"><span class="cyber-button__tag">导出 GLB</span></button>
                            </div>
                        </section>

                    </main>
                </div>
            </section>
        `;
    }

    function renderProductButton(product, index) {
        const searchText = [
            product.id,
            product.title,
            product.subtitle,
            product.headline,
            product.kicker,
            product.system,
            product.shape,
            productSearchAliases[product.id] || ''
        ].join(' ');

        return `
            <button class="modelinglab-product" type="button" data-product="${escapeHtml(product.id)}" data-search="${escapeHtml(searchText)}" data-index="${String(index + 1).padStart(2, '0')}">
                <span class="modelinglab-product-icon" aria-hidden="true"></span>
                <span>
                    <span class="modelinglab-product-title">${escapeHtml(product.title)}</span>
                    <span class="modelinglab-product-subtitle">${escapeHtml(product.subtitle)}</span>
                </span>
                <span class="modelinglab-favorite">${product.id === 'starship' ? '&hearts;' : ''}</span>
            </button>
        `;
    }

    function bind(root) {
        root.querySelectorAll('.modelinglab-product').forEach(button => {
            button.addEventListener('click', () => updateProduct(button.dataset.product));
        });

        const search = root.querySelector('#modelinglab-product-search');
        const filterProducts = () => {
            const query = normalizeSearch(search.value);
            root.querySelectorAll('.modelinglab-product').forEach(button => {
                const text = normalizeSearch(`${button.dataset.search || ''} ${button.textContent || ''}`);
                const shouldHide = Boolean(query) && !text.includes(query);
                button.classList.toggle('is-filtered-out', shouldHide);
                button.style.display = shouldHide ? 'none' : '';
            });
        };
        if (search) {
            ['input', 'keyup', 'search', 'change'].forEach(eventName => {
                search.addEventListener(eventName, filterProducts);
            });
            filterProducts();
        }

        root.querySelectorAll('.modelinglab-icon-btn').forEach(button => {
            button.addEventListener('click', () => {
                root.querySelectorAll('.modelinglab-icon-btn').forEach(item => item.classList.remove('active'));
                button.classList.add('active');
            });
        });

        root.querySelector('[data-action="rotate"]')?.addEventListener('click', event => {
            const button = event.currentTarget;
            button.classList.toggle('active');
            if (threeState) threeState.autoRotate = button.classList.contains('active');
        });

        root.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
            if (!threeState?.group) return;
            threeState.group.rotation.set(0, 0, 0);
            frameThreeModel(currentProduct);
        });
    }

    function updateProduct(productId) {
        const product = products.find(item => item.id === productId) || products[2];
        currentProduct = product;
        const root = document.getElementById('modelinglab-root');
        if (!root) return;

        root.querySelectorAll('.modelinglab-product').forEach(button => {
            button.classList.toggle('active', button.dataset.product === product.id);
        });

        setText('modelinglab-primary-label', product.system);
        setText('modelinglab-compare-a', product.title);
        setText('modelinglab-compare-a-subtitle', product.subtitle);

        buildThreeModel(product);
    }

    async function initThree() {
        const canvas = document.getElementById('modelinglab-canvas');
        if (!canvas) return;

        try {
            await ensureThree();
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
            camera.position.set(0, 0, 8.4);
            camera.lookAt(0, 0, 0);
            scene.add(new THREE.AmbientLight(0xb8c7d8, 1.25));

            const key = new THREE.DirectionalLight(0xffffff, 1.8);
            key.position.set(2.8, 5, 4);
            scene.add(key);

            const rim = new THREE.DirectionalLight(0x67d7ff, 1.4);
            rim.position.set(-4, 2, -3);
            scene.add(rim);

            const group = new THREE.Group();
            scene.add(group);

            threeState = {
                renderer,
                scene,
                camera,
                group,
                autoRotate: true,
                pointerDown: false,
                lastX: 0,
                lastY: 0
            };

            canvas.addEventListener('pointerdown', event => {
                threeState.pointerDown = true;
                threeState.lastX = event.clientX;
                threeState.lastY = event.clientY;
                canvas.setPointerCapture?.(event.pointerId);
            });
            canvas.addEventListener('pointermove', event => {
                if (!threeState.pointerDown) return;
                const dx = event.clientX - threeState.lastX;
                const dy = event.clientY - threeState.lastY;
                threeState.group.rotation.y += dx * 0.01;
                threeState.group.rotation.x += dy * 0.006;
                threeState.lastX = event.clientX;
                threeState.lastY = event.clientY;
            });
            canvas.addEventListener('pointerup', () => {
                threeState.pointerDown = false;
            });
            canvas.addEventListener('pointerleave', () => {
                threeState.pointerDown = false;
            });

            window.addEventListener('resize', resizeThree);
            buildThreeModel(currentProduct);
            resizeThree();
            animate();
        } catch (error) {
            console.warn('Modeling Lab Three.js initialization failed:', error);
        }
    }

    function ensureThree() {
        if (typeof THREE !== 'undefined') return Promise.resolve();
        return new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-modelinglab-three]');
            if (existing) {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/three@0.160.0/build/three.min.js';
            script.async = true;
            script.dataset.modelinglabThree = 'true';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Unable to load Three.js'));
            document.head.appendChild(script);
        });
    }

    function resizeThree() {
        if (!threeState) return;
        const canvas = threeState.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        threeState.renderer.setSize(width, height, false);
        threeState.camera.aspect = width / height;
        threeState.camera.updateProjectionMatrix();
        positionThreeModelInViewport(currentProduct);
    }

    function animate() {
        if (!threeState) return;
        requestAnimationFrame(animate);
        if (threeState.autoRotate && !threeState.pointerDown) {
            threeState.group.rotation.y += 0.004;
        }
        threeState.renderer.render(threeState.scene, threeState.camera);
    }

    function buildThreeModel(product) {
        if (!threeState || typeof THREE === 'undefined') return;
        threeState.group.clear();
        threeState.group.position.set(0, 0, 0);
        threeState.group.rotation.set(0, 0, 0);
        threeState.group.scale.setScalar(1);

        if (product.shape === 'engine') {
            createEngineModel(threeState.group, false);
        } else if (product.shape === 'cluster') {
            createEngineModel(threeState.group, true);
        } else if (product.shape === 'jet') {
            createJetModel(threeState.group, product.id === 'f35');
        } else {
            createRocketModel(threeState.group, product.id === 'overview');
        }
        frameThreeModel(product);

        const fallback = document.getElementById('modelinglab-fallback-model');
        if (fallback) fallback.style.display = 'none';
    }

    function frameThreeModel(product) {
        if (!threeState?.group) return;
        const group = threeState.group;
        group.position.set(0, 0, 0);
        group.scale.setScalar(1);
        group.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(group);
        if (box.isEmpty()) return;

        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        const localCenter = group.worldToLocal(center.clone());
        group.children.forEach(child => {
            child.position.sub(localCenter);
        });
        group.updateMatrixWorld(true);

        const centeredBox = new THREE.Box3().setFromObject(group);
        centeredBox.getSize(size);
        const maxDimension = Math.max(size.x, size.y, size.z, 1);
        const targetSize = product.shape === 'rocket' ? 4.8 : product.shape === 'cluster' ? 3.8 : 4.2;
        const scale = targetSize / maxDimension;
        group.scale.setScalar(scale);
        group.position.set(0, 0, 0);

        const cameraDistance = product.shape === 'rocket' ? 8.2 : product.shape === 'engine' ? 6.4 : product.shape === 'cluster' ? 6.8 : 6.2;
        threeState.camera.position.set(0, 0.08, cameraDistance);
        threeState.camera.lookAt(0, 0, 0);
        threeState.camera.updateProjectionMatrix();
        positionThreeModelInViewport(product);
    }

    function positionThreeModelInViewport(product) {
        if (!threeState?.group || !threeState?.camera || typeof THREE === 'undefined') return;
        const viewport = document.querySelector('.modelinglab-viewport');
        const leftPanel = document.querySelector('.modelinglab-left');
        if (!viewport || !leftPanel) return;

        const viewportRect = viewport.getBoundingClientRect();
        const panelRect = leftPanel.getBoundingClientRect();
        const panelWidth = window.matchMedia('(max-width: 820px)').matches
            ? 0
            : Math.max(0, Math.min(panelRect.right, viewportRect.right) - viewportRect.left);
        const offsetPixels = panelWidth / 2;
        const cameraDistance = Math.abs(threeState.camera.position.z);
        const visibleHeight = 2 * cameraDistance * Math.tan(THREE.MathUtils.degToRad(threeState.camera.fov / 2));
        const visibleWidth = visibleHeight * threeState.camera.aspect;
        const offsetX = viewportRect.width > 0 ? (offsetPixels / viewportRect.width) * visibleWidth : 0;
        const offsetY = product.shape === 'jet' ? -0.32 : product.shape === 'cluster' ? -0.26 : product.shape === 'engine' ? -0.18 : 0;

        threeState.group.position.set(offsetX, offsetY, 0);
    }

    function material(color, options = {}) {
        return new THREE.MeshStandardMaterial({
            color,
            metalness: options.metalness ?? 0.62,
            roughness: options.roughness ?? 0.34,
            transparent: options.opacity !== undefined,
            opacity: options.opacity ?? 1
        });
    }

    function createRocketModel(group, overview) {
        const silver = material(0xd8e2ea, { metalness: 0.78, roughness: 0.22 });
        const dark = material(0x222a30, { metalness: 0.55, roughness: 0.36 });
        const blue = material(0x74d9ff, { metalness: 0.2, roughness: 0.2, opacity: 0.46 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.78, 4.8, 48), silver);
        body.position.y = 0.2;
        group.add(body);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.66, 1.18, 48), silver);
        nose.position.y = 3.2;
        group.add(nose);

        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.74, 0.48, 48), dark);
        skirt.position.y = -2.45;
        group.add(skirt);

        for (let i = 0; i < 4; i += 1) {
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, overview ? 1.12 : 0.86, 0.72), dark);
            fin.position.set(Math.sin(i * Math.PI / 2) * 0.75, -1.45, Math.cos(i * Math.PI / 2) * 0.75);
            fin.rotation.y = i * Math.PI / 2;
            fin.rotation.z = Math.sin(i * Math.PI / 2) * 0.22;
            group.add(fin);
        }

        for (let i = 0; i < 7; i += 1) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.01, 8, 80), blue);
            ring.position.y = -1.55 + i * 0.68;
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        }
    }

    function createEngineModel(group, cluster) {
        const dark = material(0x161b20, { metalness: 0.7, roughness: 0.28 });
        const silver = material(0xaab5bd, { metalness: 0.82, roughness: 0.24 });
        const accent = material(0x64d8ff, { metalness: 0.25, roughness: 0.2, opacity: 0.56 });

        const positions = cluster
            ? [[0, 0, 0], [0.72, 0, 0.28], [-0.72, 0, 0.28], [0.42, 0, -0.58], [-0.42, 0, -0.58]]
            : [[0, 0, 0]];

        positions.forEach(([x, y, z]) => {
            const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.7, 42, 1, true), dark);
            nozzle.position.set(x, y - 0.95, z);
            nozzle.rotation.x = Math.PI;
            group.add(nozzle);

            const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 32), silver);
            chamber.position.set(x, y + 0.1, z);
            group.add(chamber);

            const pump = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 10, 42), accent);
            pump.position.set(x, y + 0.62, z);
            pump.rotation.x = Math.PI / 2;
            group.add(pump);
        });

        if (cluster) {
            const mount = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.055, 12, 80), silver);
            mount.position.y = 0.72;
            mount.rotation.x = Math.PI / 2;
            group.add(mount);
        }
    }

    function createJetModel(group, compact) {
        const hull = material(0xb8c2ca, { metalness: 0.64, roughness: 0.3 });
        const dark = material(0x1b2229, { metalness: 0.52, roughness: 0.38 });
        const glass = material(0x75d6ff, { metalness: 0.1, roughness: 0.12, opacity: 0.42 });

        const body = new THREE.Mesh(new THREE.ConeGeometry(compact ? 0.34 : 0.42, compact ? 3.2 : 3.8, 4), hull);
        body.rotation.x = Math.PI / 2;
        body.scale.set(1, compact ? 0.68 : 0.78, 1);
        group.add(body);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.92, 24), hull);
        nose.rotation.x = -Math.PI / 2;
        nose.position.z = 2.15;
        group.add(nose);

        const wing = new THREE.Mesh(new THREE.BoxGeometry(compact ? 3.2 : 4.1, 0.06, compact ? 0.82 : 1.04), dark);
        wing.position.z = 0.16;
        group.add(wing);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.54), dark);
        tail.position.z = -1.5;
        tail.position.y = 0.1;
        group.add(tail);

        const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 12), glass);
        canopy.scale.set(0.74, 0.28, 1.15);
        canopy.position.set(0, 0.22, 0.82);
        group.add(canopy);

        group.rotation.x = -0.2;
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeSearch(value) {
        return String(value || '').trim().toLowerCase();
    }

    window.initModelingLab = initModelingLab;
})();
