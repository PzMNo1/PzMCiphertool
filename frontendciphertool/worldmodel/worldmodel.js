/**
 * 建模实验室 · 世界模型页签
 *
 * 数据流：本页 → /api/world/** (Spring Boot 代理) → api.worldlabs.ai/marble/v1
 * 生成是长任务（约 5 分钟），这里负责提交、轮询、落定后把资产铺到视口和导出按钮上。
 */
(function () {
    const POLL_FAST_MS = 6000;
    const POLL_SLOW_MS = 12000;
    const POLL_SWITCH_MS = 2 * 60 * 1000;
    const POLL_TIMEOUT_MS = 40 * 60 * 1000;

    const state = {
        initialized: false,
        mode: 'text',
        imageDataUrl: '',
        activeWorld: null,
        worlds: [],
        polling: null,
        pollStartedAt: 0,
        status: null
    };

    const $ = id => document.getElementById(id);

    function root() {
        // 本页整体就是一个 shell；兼容 #worldmodel-root（父页面注入场景）
        return document.getElementById('worldmodel-root')
            || document.getElementById('wm-shell')
            || document.querySelector('.wm-shell');
    }

    /* ================= 初始化 ================= */

    function initWorldModel() {
        const host = root();
        if (!host || state.initialized) return;
        if (!document.querySelector('.wm-shell')) {
            // 页面片段应由 worldmodel.html 提供；直接注入时给出明确提示。
            host.setAttribute('data-wm-status', 'no-shell');
            host.innerHTML = '<div class="wm-empty" style="padding:28px">世界模型页面未加载：'
                + '请确认 modelinglab 的 world 视图 iframe 指向 worldmodel/worldmodel.html。</div>';
            return;
        }
        state.initialized = true;
        bind();
        boot();
    }

    function bind() {
        document.querySelectorAll('.wm-mode').forEach(button => {
            button.addEventListener('click', () => setMode(button.getAttribute('data-mode')));
        });

        document.querySelectorAll('.wm-stage-tab').forEach(button => {
            button.addEventListener('click', () => setStageView(button.getAttribute('data-view')));
        });

        document.querySelectorAll('.wm-chip[data-prompt]').forEach(chip => {
            chip.addEventListener('click', () => {
                $('wm-prompt').value = chip.getAttribute('data-prompt');
                $('wm-prompt').focus();
            });
        });

        $('wm-generate').addEventListener('click', () => generate());
        $('wm-refresh').addEventListener('click', () => loadWorlds({ silent: false }));
        $('wm-notice-retry').addEventListener('click', () => boot({ force: true }));
        $('wm-cancel').addEventListener('click', () => stopPolling('已取消等待（生成仍会在上游继续，完成后可在作品库看到）'));

        bindImageInput();
        bindHostCommands();
    }

    /**
     * 宿主（建模实验室父页面）通过 postMessage 下指令。
     * 本页在 iframe 里运行，跨 frame 直接摸 DOM 很容易踩时序，统一走消息。
     */
    function bindHostCommands() {
        window.addEventListener('message', event => {
            const data = event && event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'worldmodel:fill' || data.type === 'worldmodel:run') {
                fillForm(data);
                if (data.type === 'worldmodel:run') {
                    generate({
                        prompt: data.prompt,
                        imageDataUrl: data.imageDataUrl,
                        displayName: data.displayName,
                        model: data.model
                    });
                } else {
                    const box = $('wm-prompt');
                    if (box) box.focus();
                }
                return;
            }

            if (data.type === 'worldmodel:status') {
                const target = event.source;
                if (target && typeof target.postMessage === 'function') {
                    target.postMessage({ type: 'worldmodel:summary', summary: summary() }, '*');
                }
                return;
            }

            if (data.type === 'worldmodel:refresh') {
                boot();
            }
        });
    }

    function fillForm(data) {
        const box = $('wm-prompt');
        if (box && typeof data.prompt === 'string' && data.prompt) box.value = data.prompt;
        if (typeof data.displayName === 'string' && data.displayName && $('wm-name')) {
            $('wm-name').value = data.displayName;
        }
        if (typeof data.model === 'string' && data.model && $('wm-model')) {
            $('wm-model').value = data.model;
        }
        if (data.imageDataUrl) {
            state.imageDataUrl = data.imageDataUrl;
            setMode('image');
            const preview = $('wm-image-preview');
            if (preview) {
                preview.src = data.imageDataUrl;
                preview.hidden = false;
            }
            if ($('wm-image-clear')) $('wm-image-clear').hidden = false;
        }
    }

    /* ================= 启动与接入状态 ================= */

    async function boot(options = {}) {
        const host = root();
        try {
            const status = await window.WorldModelClient.status();
            state.status = status;
            showNotice(status);
            // 在 DOM 上留一个可观测的状态标记，便于自检和排查（控制台看 data-wm-status 即可）
            if (host) host.dataset.wmStatus = status && status.configured ? 'configured' : 'unconfigured';
        } catch (error) {
            showNotice({
                configured: false,
                hint: '连不上后端世界模型接口：' + error.message
                    + '（请确认 backendcipher 已用最新代码启动，端口 8080）'
            });
            if (host) host.dataset.wmStatus = 'backend-unreachable';
        }
        loadWorlds({ silent: true });
    }

    function showNotice(status) {
        const box = $('wm-notice');
        const text = $('wm-notice-text');
        if (status && status.configured && !status.upstreamError) {
            box.hidden = true;
            return;
        }
        box.hidden = false;
        const parts = [];
        if (status && status.hint) parts.push(status.hint);
        if (status && status.upstreamError) parts.push('上游返回：' + status.upstreamError);
        text.textContent = parts.join(' ') || '世界模型暂不可用。';
    }

    /* ================= 输入方式 ================= */

    function setMode(mode) {
        state.mode = mode === 'image' ? 'image' : 'text';
        document.querySelectorAll('.wm-mode').forEach(button => {
            const on = button.getAttribute('data-mode') === state.mode;
            button.classList.toggle('on', on);
            button.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        // 图片模式下提示词变成「可选补充说明」，位置保持不动，避免布局跳动。
        $('wm-prompt-field').hidden = false;
        $('wm-image-field').hidden = state.mode !== 'image';
        $('wm-prompt').placeholder = state.mode === 'image'
            ? '（可选）补充描述，留空则由模型根据图片自动理解'
            : '例如：一间临海的老式木工房，午后阳光从高窗斜射进来，地上散落着刨花和工具，窗外能看到海浪';
    }

    function bindImageInput() {
        const drop = $('wm-drop');
        const input = $('wm-image');

        drop.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            if (input.files && input.files[0]) acceptImage(input.files[0]);
        });

        ['dragenter', 'dragover'].forEach(name => {
            drop.addEventListener(name, event => {
                event.preventDefault();
                drop.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(name => {
            drop.addEventListener(name, event => {
                event.preventDefault();
                drop.classList.remove('dragover');
            });
        });
        drop.addEventListener('drop', event => {
            const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
            if (file) acceptImage(file);
        });

        $('wm-image-clear').addEventListener('click', () => clearImage());
    }

    async function acceptImage(file) {
        try {
            state.imageDataUrl = await window.WorldModelClient.readImageAsDataUrl(file);
            const preview = $('wm-image-preview');
            preview.src = state.imageDataUrl;
            preview.hidden = false;
            $('wm-drop-text').textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
            $('wm-image-clear').hidden = false;
        } catch (error) {
            alert(error.message);
        }
    }

    function clearImage() {
        state.imageDataUrl = '';
        const preview = $('wm-image-preview');
        preview.removeAttribute('src');
        preview.hidden = true;
        $('wm-drop-text').textContent = '点击或拖入图片（png / jpg / webp，≤ 8MB）';
        $('wm-image-clear').hidden = true;
        $('wm-image').value = '';
    }

    /* ================= 生成与轮询 ================= */

    async function generate(overrides = {}) {
        const prompt = String(overrides.prompt !== undefined ? overrides.prompt : $('wm-prompt').value || '').trim();
        const imageDataUrl = overrides.imageDataUrl !== undefined ? overrides.imageDataUrl : state.imageDataUrl;
        const mode = overrides.mode || (imageDataUrl ? 'image' : state.mode);

        if (mode === 'image' && !imageDataUrl) {
            alert('图片生成模式需要先选择一张图片。');
            return;
        }
        if (mode === 'text' && !prompt) {
            alert('请先写一句场景描述。');
            return;
        }

        const payload = {
            mode,
            prompt,
            displayName: overrides.displayName || $('wm-name').value || '',
            model: overrides.model || $('wm-model').value,
            disableRecaption: !$('wm-recaption').checked,
            isPublic: $('wm-public').checked
        };
        if (mode === 'image') {
            payload.imageUrl = imageDataUrl;
            payload.imageExtension = window.WorldModelClient.extensionOf(imageDataUrl);
        }

        setGenerating(true);
        startProgress('正在提交生成任务…');

        try {
            const operation = await window.WorldModelClient.generate(payload);
            if (!operation.operationId) {
                throw new Error(operation.error || '上游没有返回 operation_id');
            }
            startPolling(operation.operationId);
        } catch (error) {
            failProgress(describeError(error));
        } finally {
            setGenerating(false);
        }
    }

    function setGenerating(on) {
        const button = $('wm-generate');
        button.disabled = on;
        button.textContent = on ? '提交中…' : '生成世界';
    }

    function startProgress(text) {
        $('wm-progress').hidden = false;
        $('wm-progress-text').textContent = text;
        $('wm-progress-time').textContent = '';
        $('wm-progress-hint').textContent = '世界生成通常需要 5 分钟左右，可以先去干别的。';
        $('wm-progress-fill').style.width = '4%';
        $('wm-cancel').hidden = false;
        $('wm-cancel').disabled = false;
    }

    function updateProgress(percent, text, hint) {
        if (percent !== null && percent !== undefined) {
            $('wm-progress-fill').style.width = Math.max(4, Math.min(100, percent)) + '%';
        }
        if (text) $('wm-progress-text').textContent = text;
        if (hint) $('wm-progress-hint').textContent = hint;
    }

    function failProgress(message) {
        $('wm-progress').hidden = false;
        $('wm-progress-fill').style.width = '100%';
        $('wm-progress-fill').style.background = 'linear-gradient(90deg,#ff5f6d,#ffc371)';
        $('wm-progress-text').textContent = '生成失败';
        $('wm-progress-hint').textContent = message;
        $('wm-cancel').hidden = true;
    }

    function startPolling(operationId) {
        stopPolling(null, true);
        state.pollStartedAt = Date.now();
        state.polling = { operationId, timer: null, cancelled: false };
        poll();
    }

    function stopPolling(message, silent) {
        if (state.polling) {
            state.polling.cancelled = true;
            if (state.polling.timer) clearTimeout(state.polling.timer);
            state.polling = null;
        }
        if (!silent) {
            $('wm-cancel').hidden = true;
            if (message) {
                $('wm-progress-fill').style.background = '';
                updateProgress(null, '已停止等待', message);
            }
        }
    }

    async function poll() {
        const session = state.polling;
        if (!session || session.cancelled) return;

        try {
            const operation = await window.WorldModelClient.operation(session.operationId);

            if (operation.error) {
                $('wm-progress-fill').style.background = 'linear-gradient(90deg,#ff5f6d,#ffc371)';
                failProgress('上游处理失败：' + operation.error);
                stopPolling(null, true);
                return;
            }

            if (operation.done) {
                const credits = operation.costCredits ? `，消耗 ${operation.costCredits} credits` : '';
                $('wm-progress-fill').style.background = '';
                updateProgress(100, '生成完成' + credits, '正在载入视口…');
                $('wm-cancel').hidden = true;
                stopPolling(null, true);
                await finishGeneration(operation.worldId);
                return;
            }

            const elapsed = Date.now() - state.pollStartedAt;
            if (elapsed > POLL_TIMEOUT_MS) {
                failProgress('等待超时。任务可能仍在上游继续，稍后点「刷新」看作品库。');
                stopPolling(null, true);
                return;
            }

            // 上游只给一个粗粒度进度，这里主要靠时间做心理预期管理。
            const percent = Math.min(92, 6 + (elapsed / (5 * 60 * 1000)) * 80);
            updateProgress(percent,
                '生成中…已等待 ' + formatDuration(elapsed),
                '世界模型正在构建三维场景，通常 5 分钟左右。');
            $('wm-progress-time').textContent = operation.worldId ? '已分配 ' + shortId(operation.worldId) : '';

            const interval = elapsed > POLL_SWITCH_MS ? POLL_SLOW_MS : POLL_FAST_MS;
            session.timer = setTimeout(poll, interval);
        } catch (error) {
            // 单次轮询失败不该终止整个等待，退避后重试。
            const session2 = state.polling;
            if (!session2 || session2.cancelled) return;
            $('wm-progress-hint').textContent = '查询进度失败（' + error.message + '），稍后自动重试…';
            session2.timer = setTimeout(poll, POLL_SLOW_MS);
        }
    }

    async function finishGeneration(worldId) {
        if (!worldId) {
            $('wm-progress-hint').textContent = '生成完成，但上游没有返回 world_id，请点「刷新」查看作品库。';
            return;
        }
        try {
            const info = await window.WorldModelClient.world(worldId);
            selectWorld(info, { autoLoad: true });
            await loadWorlds({ silent: true });
            $('wm-progress').hidden = true;
        } catch (error) {
            failProgress('作品已生成，但拉取资产失败：' + error.message);
        }
    }

    /* ================= 作品库 ================= */

    async function loadWorlds(options = {}) {
        const list = $('wm-list');

        // 没配 Key 时不必去打上游，直接给出可操作的引导。
        if (!state.status || !state.status.configured) {
            list.innerHTML = '<div class="wm-empty">配置 WORLD_LABS_API_KEY 并重启后端后，这里会列出你生成过的世界。</div>';
            return;
        }

        if (!options.silent) {
            list.innerHTML = '<div class="wm-empty">正在加载作品库…</div>';
        }
        try {
            const result = await window.WorldModelClient.list({ pageSize: 30, status: 'SUCCEEDED' });
            state.worlds = (result && result.worlds) || [];
            renderWorlds();
        } catch (error) {
            list.innerHTML = '<div class="wm-empty">作品库加载失败：' + escapeHtml(error.message) + '</div>';
        }
    }

    function renderWorlds() {
        const list = $('wm-list');
        if (!state.worlds.length) {
            list.innerHTML = '<div class="wm-empty">还没有作品。左边写一句场景描述，试试生成第一个世界。</div>';
            return;
        }
        list.innerHTML = '';
        state.worlds.forEach(world => {
            const item = document.createElement('div');
            item.className = 'wm-item' + (state.activeWorld && state.activeWorld.worldId === world.worldId ? ' on' : '');
            item.dataset.worldId = world.worldId;

            const thumb = world.thumbnailUrl || world.panoUrl || '';
            if (thumb) {
                const img = document.createElement('img');
                img.className = 'wm-item-thumb';
                img.loading = 'lazy';
                img.decoding = 'async';
                img.alt = world.displayName || '世界缩略图';
                img.src = thumb;
                img.onerror = () => { img.style.visibility = 'hidden'; };
                item.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'wm-item-thumb';
                item.appendChild(placeholder);
            }

            const main = document.createElement('div');
            main.className = 'wm-item-main';

            const name = document.createElement('div');
            name.className = 'wm-item-name';
            name.textContent = world.displayName || shortId(world.worldId);
            main.appendChild(name);

            const meta = document.createElement('div');
            meta.className = 'wm-item-meta';
            const bits = [];
            if (world.model) bits.push(world.model);
            if (world.createdAt) bits.push(String(world.createdAt).slice(0, 10));
            if (world.spzUrls) bits.push('SPZ');
            if (world.colliderMeshUrl) bits.push('GLB');
            meta.textContent = bits.join(' · ');
            main.appendChild(meta);

            if (world.tags && world.tags.length) {
                const tags = document.createElement('div');
                tags.className = 'wm-item-tags';
                world.tags.slice(0, 3).forEach(tag => {
                    const span = document.createElement('span');
                    span.className = 'wm-item-tag';
                    span.textContent = tag;
                    tags.appendChild(span);
                });
                main.appendChild(tags);
            }

            item.appendChild(main);
            item.addEventListener('click', () => selectWorld(world, { autoLoad: true }));
            list.appendChild(item);
        });
    }

    /* ================= 选中作品与视口 ================= */

    function selectWorld(world, options = {}) {
        state.activeWorld = world;
        renderWorlds();

        $('wm-stage-empty').hidden = true;
        $('wm-stage-title').textContent = (world.displayName || shortId(world.worldId))
            + (world.model ? ' · ' + world.model : '');

        renderStageActions(world);
        if (options.autoLoad !== false) {
            loadIntoViewport(world);
        }
    }

    /** 把世界资产推给高分辨率视口 iframe */
    function loadIntoViewport(world) {
        const frame = $('wm-splat-frame');
        if (!frame || !frame.contentWindow) return;

        const payload = {
            type: 'worldmodel:load',
            title: world.displayName || shortId(world.worldId),
            spzUrls: world.spzUrls || {},
            metricScaleFactor: world.metricScaleFactor,
            groundPlaneOffset: world.groundPlaneOffset
        };
        if (!world.spzUrls || !Object.keys(world.spzUrls).length) {
            setStageView('pano');
            showPano(world);
            return;
        }
        // 视口可能还没加载完，等到 load 事件再投递一次。
        const send = () => frame.contentWindow.postMessage(payload, '*');
        send();
        setTimeout(send, 900);
    }

    function setStageView(view) {
        document.querySelectorAll('.wm-stage-tab').forEach(button => {
            const on = button.getAttribute('data-view') === view;
            button.classList.toggle('on', on);
            button.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        const splat = view === 'splat';
        $('wm-splat-frame').hidden = !splat;
        $('wm-pano-wrap').hidden = splat;
        if (!splat && state.activeWorld) showPano(state.activeWorld);
    }

    function showPano(world) {
        const img = $('wm-pano');
        const empty = $('wm-pano-empty');
        if (world && world.panoUrl) {
            img.src = world.panoUrl;
            img.hidden = false;
            empty.hidden = true;
        } else {
            img.removeAttribute('src');
            img.hidden = true;
            empty.hidden = false;
        }
    }

    function renderStageActions(world) {
        const box = $('wm-stage-actions');
        box.innerHTML = '';

        if (world.spzUrls && Object.keys(world.spzUrls).length) {
            box.appendChild(button('splat 视口', () => {
                setStageView('splat');
                loadIntoViewport(world);
            }));
        }
        if (world.panoUrl) {
            box.appendChild(button('全景图', () => setStageView('pano')));
        }
        if (world.marbleUrl) {
            box.appendChild(button('Marble 官方查看', () => window.open(world.marbleUrl, '_blank', 'noopener')));
        }
        if (world.colliderMeshUrl) {
            box.appendChild(button('送格式转换台', () => sendMeshToConverter(world)));
            box.appendChild(button('下载碰撞网格 GLB', () => download(world.colliderMeshUrl, safeName(world) + '_collider.glb')));
        }
        if (world.hqMeshUrl) {
            box.appendChild(button('下载高质量网格 GLB', () => download(world.hqMeshUrl, safeName(world) + '_hq.glb')));
        }
        const splatUrl = pickSplat(world);
        if (splatUrl) {
            box.appendChild(button('下载 SPZ', () => download(splatUrl, safeName(world) + '.spz')));
        }
        box.appendChild(button('进入建模编辑器', () => openEditor()));
        box.appendChild(button('删除', () => removeWorld(world), true));
    }

    function button(label, onClick, danger) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'wm-btn ghost tiny';
        el.textContent = label;
        if (danger) el.style.borderColor = 'rgba(255,120,120,.35)';
        el.addEventListener('click', event => {
            event.stopPropagation();
            onClick();
        });
        return el;
    }

    function pickSplat(world) {
        const urls = world.spzUrls || {};
        return urls['500k'] || urls.full_res || urls['100k'] || Object.values(urls)[0] || '';
    }

    function safeName(world) {
        const base = world.displayName || world.worldId || 'world';
        return String(base).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 48);
    }

    /**
     * 把碰撞网格送到同源的「模型格式转换台」。
     *
     * 转换台自带 window.__FC__.importUrl，直接喂上游 CDN 地址会被跨域挡住读字节，
     * 所以先在本页把 GLB 抓成 blob，再让转换台读这个同源 blob URL。
     */
    async function sendMeshToConverter(world) {
        if (!world.colliderMeshUrl) return;
        const frame = findFrame('convert');
        if (!frame || !frame.contentWindow) {
            const url = world.colliderMeshUrl;
            window.open(url, '_blank', 'noopener');
            return;
        }
        try {
            const response = await fetch(world.colliderMeshUrl);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const api = frame.contentWindow.__FC__;
            if (!api || typeof api.importUrl !== 'function') {
                window.open(world.colliderMeshUrl, '_blank', 'noopener');
                return;
            }
            const result = await api.importUrl(objectUrl, safeName(world) + '_collider.glb', 120000);
            // 交给转换台自己管理这个 blob 的生命周期，这里延迟释放避免还在读。
            setTimeout(() => URL.revokeObjectURL(objectUrl), 600000);
            if (window.modelingLabShowView) window.modelingLabShowView('convert');
            if (result && result.ok === false) {
                alert('送进格式转换台失败：' + (result.error || '未知原因'));
            }
        } catch (error) {
            alert('抓取碰撞网格失败：' + error.message + '\n可在新窗口直接打开该 GLB。');
            window.open(world.colliderMeshUrl, '_blank', 'noopener');
        }
    }

    function findFrame(view) {
        const node = document.querySelector('[data-view-frame="' + view + '"]');
        return node && node.tagName === 'IFRAME' ? node : null;
    }

    function openEditor() {
        if (window.modelingLabShowView) {
            window.modelingLabShowView('editor');
        }
    }

    async function removeWorld(world) {
        const label = world.displayName || shortId(world.worldId);
        if (!confirm(`删除作品「${label}」？该操作会同时删除上游的资产，不可恢复。`)) return;
        try {
            await window.WorldModelClient.remove(world.worldId);
            if (state.activeWorld && state.activeWorld.worldId === world.worldId) {
                state.activeWorld = null;
                $('wm-stage-actions').innerHTML = '';
                $('wm-stage-title').textContent = '未选择作品';
                $('wm-stage-empty').hidden = false;
            }
            await loadWorlds({ silent: true });
        } catch (error) {
            alert('删除失败：' + error.message);
        }
    }

    function download(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /* ================= 工具 ================= */

    function describeError(error) {
        const status = error && error.status;
        if (status === 501) {
            return error.message;
        }
        if (status === 402) {
            return '上游额度不足，请到 platform.worldlabs.ai/billing 充值后重试。（API 额度与 Marble 网页版不通用）';
        }
        if (status === 429) {
            return '触发上游限流：默认约每分钟 3 次生成请求，等一会儿再试。';
        }
        return error && error.message ? error.message : '生成失败';
    }

    function formatDuration(ms) {
        const total = Math.floor(ms / 1000);
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return minutes ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
    }

    function shortId(id) {
        const text = String(id || '');
        return text.length > 10 ? text.slice(0, 8) + '…' : text;
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }

    /* ================= 对外接口 ================= */

    window.initWorldModel = initWorldModel;

    function summary() {
        const parts = [];
        parts.push('接入状态：' + (state.status && state.status.configured ? '已配置' : '未配置 API Key'));
        if (state.status && typeof state.status.remainingCredits === 'number') {
            parts.push(`剩余 ${state.status.remainingCredits} credits`);
        }
        parts.push(`作品库 ${state.worlds.length} 个`);
        if (state.activeWorld) {
            parts.push('当前选中：' + (state.activeWorld.displayName || state.activeWorld.worldId));
        }
        return parts.join('；');
    }

    /**
     * 页面内可直接调用的入口（同源父页面也能通过这个拿到控制权）。
     * 生成以外的操作都同步返回，生成本身是后台任务，进度看页面上的进度条。
     */
    window.__WM__ = {
        init: initWorldModel,
        boot,
        fill: fillForm,
        generate: options => generate(options || {}),
        refresh: () => loadWorlds({ silent: false }),
        summary,
        state
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWorldModel);
    } else {
        initWorldModel();
    }
})();
