(function () {
  const GUIDE_SETS = {
    mimaqu: {
      label: '经典区使用说明',
      steps: [
        {
          selector: '#mimaqu #mainInput',
          title: '先输入待处理文本',
          body: '在这里输入明文或密文。经典区和现代区的主输入框会同步，输入后下方所有相关卡片会自动计算。'
        },
        {
          selector: '#quick-nav-container-mimaqu',
          title: '用搜索框快速定位卡片',
          body: '输入“凯撒”“摩尔斯”“栅栏”等关键词，可以直接跳到对应密码卡片，适合卡片较多时快速找工具。'
        },
        {
          selector: '#caesarShift',
          title: '调整卡片参数',
          body: '部分密码卡片有独立参数，例如凯撒偏移量、栅栏层数、维吉尼亚密钥。参数变化后结果会立即刷新。'
        },
        {
          selector: '#caesarResult',
          title: '查看加密和解密结果',
          body: '结果区域通常会同时显示加密和解密。你可以直接选中复制，也可以继续改输入或参数进行比对。'
        },
        {
          selector: '#mimaqu .pin-toggle-btn',
          title: '必要时置顶输入框',
          body: '点击“置顶”可以把主输入框固定在页面上方，方便你在长页面里一边滚动一边调整文本。'
        }
      ]
    },
    xiandaiqu: {
      label: '现代区使用说明',
      steps: [
        {
          selector: '#xiandaiqu #mainInput',
          title: '现代区同样从主输入开始',
          body: '这里主要处理哈希、HMAC 和 Enigma 等现代或复杂工具。输入框会和经典区保持同步。'
        },
        {
          selector: '#MD5Key',
          title: 'HMAC 需要填写密钥',
          body: 'MD5、SHA 系列卡片的密钥输入框用于生成 HMAC。只想看普通哈希时，关注结果里的哈希值即可。'
        },
        {
          selector: '#enigmaModel',
          title: 'Enigma 先选择机型',
          body: '选择机型后，转子、反射器、环位和插板配置会参与计算。修改任一配置都会重新生成结果。'
        },
        {
          selector: '#quick-nav-container-xiandaiqu',
          title: '现代区也支持快速搜索',
          body: '如果页面较长，直接搜索“SHA”或“Enigma”就能定位对应卡片。'
        }
      ]
    },
    zhishitupu: {
      label: '知识图谱使用说明',
      steps: [
        {
          selector: '#hud-panel',
          title: '先看右下角操作面板',
          body: '这里列出知识图谱的基础手势：左键拖拽旋转，右键拖拽平移，滚轮缩放，点击节点聚焦。'
        },
        {
          selector: '#graph-wrapper',
          title: '在图谱画布中浏览节点',
          body: '拖动和缩放可以观察整体关系。点击任意节点会让镜头聚焦到该节点，并根据当前阅览模式打开对应内容。'
        },
        {
          selector: '#zstp-import-btn',
          title: '导入项目生成图谱',
          body: '点击“项目导入”后选择本地项目文件夹，图谱会替换为该项目的目录和文件关系。文件只在浏览器本地读取。'
        },
        {
          selector: '#zstp-mode-switch',
          title: '切换节点点击后的阅览方式',
          body: '阅览代码会预览代码文件，阅览文档会预览文档文件，模型解释会把节点交给右下角 Agent 进行说明。'
        },
        {
          selector: '#cardSearch',
          title: '也可以用侧边栏搜索节点',
          body: '在左侧搜索框输入节点名、文件名或路径关键词并回车，知识图谱会尝试聚焦匹配节点。'
        }
      ]
    }
  };

  let guideEl;
  let spotlightEl;
  let panelEl;
  let activeSet;
  let activeIndex = 0;
  let activeTarget;

  function ensureGuideDom() {
    if (guideEl) return;

    guideEl = document.createElement('div');
    guideEl.id = 'cipherUsageGuide';
    guideEl.className = 'cipher-guide';
    guideEl.setAttribute('aria-hidden', 'true');
    guideEl.innerHTML = `
      <div class="cipher-guide-shade"></div>
      <div class="cipher-guide-spotlight"></div>
      <section class="cipher-guide-panel" role="dialog" aria-modal="true" aria-labelledby="cipherGuideTitle">
        <button type="button" class="cipher-guide-close" aria-label="关闭使用说明">×</button>
        <p class="cipher-guide-kicker"></p>
        <h3 class="cipher-guide-title" id="cipherGuideTitle"></h3>
        <p class="cipher-guide-body"></p>
        <div class="cipher-guide-actions">
          <button type="button" class="cipher-guide-btn cipher-guide-prev">上一步</button>
          <span class="cipher-guide-spacer"></span>
          <button type="button" class="cipher-guide-btn cipher-guide-skip">跳过</button>
          <button type="button" class="cipher-guide-btn primary cipher-guide-next">下一步</button>
        </div>
      </section>
    `;
    document.body.appendChild(guideEl);

    spotlightEl = guideEl.querySelector('.cipher-guide-spotlight');
    panelEl = guideEl.querySelector('.cipher-guide-panel');
    guideEl.querySelector('.cipher-guide-close').addEventListener('click', closeGuide);
    guideEl.querySelector('.cipher-guide-skip').addEventListener('click', closeGuide);
    guideEl.querySelector('.cipher-guide-prev').addEventListener('click', () => moveStep(-1));
    guideEl.querySelector('.cipher-guide-next').addEventListener('click', () => moveStep(1));
  }

  function getGuideIdFromButton(button) {
    if (button.dataset.guideId) return button.dataset.guideId;
    if (button.closest('#xiandaiqu')) return 'xiandaiqu';
    if (button.closest('#zhishitupu-content')) return 'zhishitupu';
    return 'mimaqu';
  }

  function openGuide(guideId) {
    const guideSet = GUIDE_SETS[guideId] || GUIDE_SETS.mimaqu;
    ensureGuideDom();
    activeSet = guideSet;
    activeIndex = 0;
    guideEl.classList.add('active');
    guideEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cipher-guide-open');
    renderStep(true);
  }

  function closeGuide() {
    if (!guideEl) return;
    guideEl.classList.remove('active');
    guideEl.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cipher-guide-open');
    clearActiveTarget();
  }

  function moveStep(offset) {
    if (!activeSet) return;
    const nextIndex = activeIndex + offset;
    if (nextIndex < 0) return;
    if (nextIndex >= activeSet.steps.length) {
      closeGuide();
      return;
    }
    activeIndex = nextIndex;
    renderStep(true);
  }

  function clearActiveTarget() {
    if (activeTarget) {
      activeTarget.classList.remove('cipher-guide-active-target');
      activeTarget = null;
    }
  }

  function findTarget(selector) {
    const target = document.querySelector(selector);
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return target;
  }

  function renderStep(shouldScroll) {
    if (!activeSet || !guideEl) return;
    const step = activeSet.steps[activeIndex];
    const target = findTarget(step.selector);

    clearActiveTarget();
    activeTarget = target;
    if (activeTarget) activeTarget.classList.add('cipher-guide-active-target');

    panelEl.querySelector('.cipher-guide-kicker').textContent = `${activeSet.label} · ${activeIndex + 1}/${activeSet.steps.length}`;
    panelEl.querySelector('.cipher-guide-title').textContent = step.title;
    panelEl.querySelector('.cipher-guide-body').textContent = step.body;
    panelEl.querySelector('.cipher-guide-prev').disabled = activeIndex === 0;
    panelEl.querySelector('.cipher-guide-next').textContent = activeIndex === activeSet.steps.length - 1 ? '完成' : '下一步';

    if (target && shouldScroll) {
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      window.setTimeout(positionGuide, 260);
    } else {
      positionGuide();
    }
  }

  function positionGuide() {
    if (!guideEl || !activeSet) return;
    const step = activeSet.steps[activeIndex];
    const target = findTarget(step.selector);
    const pad = 16;
    const fallbackRect = {
      top: window.innerHeight / 2 - 40,
      left: window.innerWidth / 2 - 80,
      right: window.innerWidth / 2 + 80,
      bottom: window.innerHeight / 2 + 40,
      width: 160,
      height: 80
    };
    const rect = target ? target.getBoundingClientRect() : fallbackRect;
    const highlightPad = target ? 8 : 0;

    spotlightEl.style.top = `${Math.max(pad, rect.top - highlightPad)}px`;
    spotlightEl.style.left = `${Math.max(pad, rect.left - highlightPad)}px`;
    spotlightEl.style.width = `${Math.min(window.innerWidth - pad * 2, rect.width + highlightPad * 2)}px`;
    spotlightEl.style.height = `${Math.min(window.innerHeight - pad * 2, rect.height + highlightPad * 2)}px`;

    const panelWidth = Math.min(360, window.innerWidth - pad * 2);
    panelEl.style.width = `${panelWidth}px`;
    const panelHeight = panelEl.offsetHeight || 220;
    let top = rect.bottom + 18;
    if (top + panelHeight > window.innerHeight - pad) {
      top = rect.top - panelHeight - 18;
    }
    if (top < pad) top = pad;

    let left = rect.left + rect.width / 2 - panelWidth / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - panelWidth - pad));

    panelEl.style.top = `${top}px`;
    panelEl.style.left = `${left}px`;
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('.usage-guide-btn, [data-guide-id]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openGuide(getGuideIdFromButton(button));
  });

  document.addEventListener('keydown', function (event) {
    if (!guideEl || !guideEl.classList.contains('active')) return;
    if (!['Escape', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') closeGuide();
    if (event.key === 'ArrowRight') moveStep(1);
    if (event.key === 'ArrowLeft') moveStep(-1);
  }, true);

  window.addEventListener('resize', positionGuide);
  window.addEventListener('scroll', positionGuide, true);
})();
