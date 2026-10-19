(function () {
    const config = window.MCPSKILLLAB_CONFIG || {};
    const STYLE_ID = config.styleId || 'mcpskilllab-inline-style';
    const FAVORITES_KEY = config.favoritesKey || 'MCPSKILLLAB_FAVORITES';
    const CUSTOM_RESOURCES_KEY = config.customResourcesKey || 'MCPSKILLLAB_CUSTOM_RESOURCES';
    const fallbackResources = config.fallbackResources || [];
    const templates = config.templates || [];
    const categoryTabs = config.categoryTabs || [];
    const allowedResourceTypes = config.allowedResourceTypes || [];
    const allowedSources = config.allowedSources || [];
    const MAX_IMPORT_BYTES = config.maxImportBytes || 200 * 1024;
    const MAX_BUNDLE_IMPORT_BYTES = config.maxBundleImportBytes || 2 * 1024 * 1024;
    const MAX_CUSTOM_RESOURCES = config.maxCustomResources || 200;
    const MAX_FAVORITES = config.maxFavorites || 500;
    const pageSize = Math.min(120, Math.max(6, Number(config.pageSize) || 24));
    const displayText = config.displayText || {};
    const API_BASE = String(config.localApiBase || window.CIPHERTOOL_API_BASE || 'http://localhost:8080').replace(/\/$/, '');

    function clipText(value, maxLength, fallback = '') {
        const text = String(value === undefined || value === null ? fallback : value).trim();
        return text.slice(0, maxLength);
    }

    function normalizeResourceId(value, fallback = '') {
        const source = clipText(value || fallback, 120);
        return source
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80);
    }

    function normalizeChoice(value, allowed, fallback) {
        const text = clipText(value, 80);
        return allowed.includes(text) ? text : fallback;
    }

    function sanitizeExternalUrl(value) {
        const text = clipText(value, 2048);
        if (!text) return '';
        try {
            const url = new URL(text);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
        } catch (error) {
            return '';
        }
    }

    function normalizeListValue(value, fallback, allowed, options = {}) {
        const source = Array.isArray(value)
            ? value
            : String(value || '').split(/[,，、\n/]+/);
        const maxItems = options.maxItems || 12;
        const maxLength = options.maxLength || 40;
        const list = source
            .map(item => clipText(item, maxLength))
            .filter(Boolean)
            .filter(item => !allowed || allowed.includes(item))
            .slice(0, maxItems);
        return list.length ? Array.from(new Set(list)) : fallback;
    }

    function normalizeTags(value) {
        return normalizeListValue(value, [], null, { maxItems: 8, maxLength: 24 })
            .map(tag => tag.toLowerCase().replace(/[<>"'`\\]/g, ''))
            .filter(Boolean);
    }

    function normalizeSteps(value) {
        if (!Array.isArray(value)) return [];
        return value.slice(0, 5).map(step => {
            if (typeof step === 'string') return { title: '', text: clipText(step, 900), code: '' };
            const source = step && typeof step === 'object' ? step : {};
            return {
                title: clipText(source.title, 60),
                text: clipText(source.text, 900),
                code: clipText(source.code, 2000)
            };
        }).filter(step => step.title || step.text || step.code);
    }

    function normalizeResource(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const name = clipText(source.name, 120);
        const url = sanitizeExternalUrl(source.url || source.docs);
        const docs = sanitizeExternalUrl(source.docs) || url;
        if (!name || !url) return null;

        const id = normalizeResourceId(source.id, name) || createCustomId(name);
        const type = normalizeChoice(source.type, allowedResourceTypes, 'MCP Server');
        const tags = normalizeTags(source.tags);
        const categories = normalizeListValue(source.categories, [], categoryTabs.map(tab => tab.id), { maxItems: 6, maxLength: 24 });
        const category = normalizeCategory(source.category) || getResourceCategory({ ...source, type, tags, categories }) || 'other';
        if (!categories.includes(category)) categories.unshift(category);

        return {
            id,
            name,
            type,
            category,
            categories,
            source: normalizeChoice(source.source, allowedSources, 'Community'),
            tags,
            use: clipText(source.use || source.scenario, 400, ''),
            what: clipText(source.what, 1600, ''),
            steps: normalizeSteps(source.steps),
            notes: normalizeListValue(source.notes, [], null, { maxItems: 6, maxLength: 300 }),
            pkg: clipText(source.pkg, 160, ''),
            version: clipText(source.version, 32, ''),
            url,
            docs,
            template: clipText(source.template, 5000, ''),
            custom: Boolean(source.custom),
            origin: clipText(source.origin, 32, ''),
            submittedBy: clipText(source.submittedBy, 320, '')
        };
    }

    function normalizeResources(list) {
        return (Array.isArray(list) ? list : []).map(normalizeResource).filter(Boolean);
    }

    const builtInResources = normalizeResources(window.MCPSKILLLAB_RESOURCES || fallbackResources);
    const builtInIdSet = new Set(builtInResources.map(item => item.id));
    let serverResources = [];
    let searchCandidates = [];
    let searchStatus = '';
    let searchQuery = '';
    let searchCategory = 'dsh';
    let isSearchLoading = false;
    let skillBundleStatus = '';
    let isBundleImporting = false;
    let isBundleExporting = false;
    let resources;
    let activeCategory = 'dsh';
    let guideResourceId = '';
    let currentPage = 1;
    let listFade = false;
    let activeDialog = '';
    let query = '';

    function injectStyles() {
        if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#mcpskilllab-content .container {
  padding-top: 2rem;
}

.mcpskilllab-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem 8rem;
}

.mcpskilllab-toolbar {
  display: block;
  max-width: 720px;
  margin: 1rem auto 0.8rem;
}

.mcpskilllab-toolbar select {
  min-width: 0;
  width: 100%;
  padding-left: 1rem;
  padding-right: 1.5rem;
}

.mcpskilllab-intro {
  margin: 1rem 0 1rem;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.8fr);
  gap: 1rem;
  align-items: stretch;
}

.mcpskilllab-intro .card {
  min-height: 0;
}

.mcpskilllab-intro-title {
  margin-top: 0.55rem;
  margin-bottom: 0.65rem;
  color: rgba(236, 240, 241, 0.96);
  font-size: 1.12rem;
  font-weight: 900;
}

.mcpskilllab-intro-text {
  color: rgba(236, 240, 241, 0.8);
  font-size: 0.92rem;
  line-height: 1.65;
}

.mcpskilllab-flow {
  display: grid;
  gap: 0.55rem;
  color: rgba(236, 240, 241, 0.78);
  font-size: 0.86rem;
}

.mcpskilllab-flow div {
  padding: 0.52rem 0.7rem;
  border: 1px solid rgba(64, 224, 255, 0.14);
  border-radius: 6px;
  background: rgba(0, 20, 40, 0.2);
}

.mcpskilllab-top-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.85rem;
  margin: 0.4rem 0 1rem;
  counter-reset: logic-counter;
}

.mcpskilllab-lab-btn {
  position: relative;
  background: linear-gradient(135deg, rgba(64, 224, 255, 0.06) 0%, rgba(120, 200, 255, 0.04) 50%, rgba(180, 140, 255, 0.06) 100%);
  border: 1px solid rgba(64, 224, 255, 0.15);
  padding: 1rem;
  height: 60px;
  min-width: 132px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  backdrop-filter: blur(4px);
  clip-path: polygon(15px 0, 100% 0,
      100% calc(100% - 15px), calc(100% - 15px) 100%,
      0 100%, 0 15px);
  box-shadow: inset 0 0 20px rgba(64, 224, 255, 0.1);
  cursor: pointer;
  overflow: hidden;
}

.mcpskilllab-lab-btn::after {
  counter-increment: logic-counter;
  content: "NO." counter(logic-counter, decimal-leading-zero);
  position: absolute;
  bottom: 6px;
  right: 20px;
  font-size: 0.6rem;
  color: rgba(64, 224, 255, 0.3);
  font-family: monospace;
  letter-spacing: 1px;
  transition: all 0.3s ease;
}

.mcpskilllab-lab-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 15px;
  height: 15px;
  border-top: 2px solid rgba(64, 224, 255, 0.5);
  border-left: 2px solid rgba(64, 224, 255, 0.5);
  transition: all 0.4s ease;
  opacity: 0.6;
}

.mcpskilllab-lab-btn:hover {
  transform: translateY(-5px) scale(1.02);
  background: rgba(64, 224, 255, 0.1);
  border-color: rgba(64, 224, 255, 0.6);
  color: #fff;
  text-shadow: 0 0 15px rgba(64, 224, 255, 0.8);
  box-shadow:
    0 10px 30px -10px rgba(0, 243, 255, 0.2),
    inset 0 0 20px rgba(64, 224, 255, 0.15);
}

.mcpskilllab-lab-btn:hover::before {
  width: 100%;
  height: 95%;
  border-color: #fff;
  opacity: 1;
  box-shadow: -2px -2px 10px rgba(64, 224, 255, 0.5);
}

.mcpskilllab-lab-btn:active {
  transform: scale(0.98);
  border-color: var(--primary);
}

.mcpskilllab-batch-panel {
  display: grid;
  gap: 0.75rem;
  margin: 0.2rem 0 1.1rem;
  padding: 0.85rem;
  border: 1px solid rgba(64, 224, 255, 0.16);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.2);
}

.mcpskilllab-batch-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.mcpskilllab-batch-title {
  color: rgba(236, 240, 241, 0.94);
  font-weight: 900;
}

.mcpskilllab-batch-hint,
.mcpskilllab-batch-status {
  color: rgba(236, 240, 241, 0.66);
  font-size: 0.78rem;
  line-height: 1.45;
}

.mcpskilllab-batch-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.mcpskilllab-batch-panel .cyber-button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.mcpskilllab-health-card {
  display: grid;
  gap: 0.45rem;
  padding: 0.62rem 0.72rem;
  border: 1px solid rgba(64, 224, 255, 0.13);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.2);
}

.mcpskilllab-health-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  justify-content: space-between;
}

.mcpskilllab-health-note {
  color: rgba(236, 240, 241, 0.62);
  font-size: 0.74rem;
  line-height: 1.45;
}

.mcpskilllab-batch-progress {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(236, 240, 241, 0.1);
}

.mcpskilllab-batch-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(64, 224, 255, 0.78), rgba(255, 218, 89, 0.82));
  transition: width 0.2s ease;
}

.mcpskilllab-review-panel {
  display: grid;
  gap: 0.85rem;
  margin: 0.2rem 0 1.2rem;
  padding: 0.9rem;
  border: 1px solid rgba(255, 218, 89, 0.16);
  border-radius: 8px;
  background: rgba(18, 24, 36, 0.32);
}

.mcpskilllab-review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.mcpskilllab-review-title {
  color: rgba(236, 240, 241, 0.94);
  font-weight: 900;
}

.mcpskilllab-review-hint {
  margin-top: 0.2rem;
  color: rgba(236, 240, 241, 0.66);
  font-size: 0.78rem;
  line-height: 1.45;
}

.mcpskilllab-review-list {
  display: grid;
  gap: 0.65rem;
}

.mcpskilllab-review-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  padding: 0.72rem 0.78rem;
  border: 1px solid rgba(64, 224, 255, 0.14);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.24);
}

.mcpskilllab-review-resource {
  color: rgba(236, 240, 241, 0.92);
  font-weight: 850;
  line-height: 1.35;
}

.mcpskilllab-review-issues {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.mcpskilllab-review-issue {
  color: rgba(236, 240, 241, 0.72);
  font-size: 0.76rem;
  line-height: 1.45;
}

.mcpskilllab-review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-content: flex-start;
  justify-content: flex-end;
}

.mcpskilllab-category-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0.2rem 0 1rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid rgba(64, 224, 255, 0.14);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.2);
}

.mcpskilllab-category-title {
  color: rgba(236, 240, 241, 0.94);
  font-weight: 900;
}

.mcpskilllab-category-hint {
  margin-top: 0.25rem;
  color: rgba(236, 240, 241, 0.72);
  font-size: 0.84rem;
  line-height: 1.45;
}

.mcpskilllab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.2rem;
}

.mcpskilllab-section-count {
  margin-left: 0.6rem;
  color: rgba(236, 240, 241, 0.55);
  font-size: 0.78rem;
  font-weight: 600;
}

.mcpskilllab-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin: 0.75rem 0 0.35rem;
}

.mcpskilllab-pager-nums {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.mcpskilllab-pager-btn {
  min-width: 38px;
  height: 36px;
  padding: 0 0.65rem;
  border: 1px solid rgba(64, 224, 255, 0.22);
  border-radius: 6px;
  background: rgba(0, 20, 40, 0.34);
  color: rgba(236, 240, 241, 0.82);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.mcpskilllab-pager-btn:hover:not(:disabled) {
  border-color: rgba(64, 224, 255, 0.5);
  background: rgba(64, 224, 255, 0.08);
  color: #fff;
}

.mcpskilllab-pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mcpskilllab-pager-num.active {
  border-color: rgba(255, 218, 89, 0.6);
  background: rgba(255, 218, 89, 0.08);
  color: #ffda59;
  box-shadow: 0 0 14px rgba(255, 218, 89, 0.12);
}

.mcpskilllab-pager-gap {
  padding: 0 0.15rem;
  color: rgba(236, 240, 241, 0.45);
  font-size: 0.8rem;
}

.mcpskilllab-pager-info {
  margin-left: auto;
  color: rgba(236, 240, 241, 0.6);
  font-size: 0.78rem;
}

.mcpskilllab-pager-top {
  height: 36px;
  padding: 0 0.5rem;
  border: 0;
  background: transparent;
  color: rgba(64, 224, 255, 0.78);
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.mcpskilllab-pager-top:hover {
  color: #fff;
  text-decoration: underline;
}

.mcpskilllab-grid-fade {
  animation: mcpskilllab-grid-fade 0.22s ease-out;
}

@keyframes mcpskilllab-grid-fade {
  from {
    opacity: 0.35;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mcpskilllab-grid-fade {
    animation: none;
  }
}

@media (max-width: 560px) {
  .mcpskilllab-pager-nums {
    display: none;
  }

  .mcpskilllab-pager-info {
    margin-left: 0;
  }
}

.mcpskilllab-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.9rem;
  margin: 1rem 0 1.2rem;
}

.mcpskilllab-stat {
  min-height: 82px;
  padding: 0.85rem;
  border: 1px solid rgba(64, 224, 255, 0.16);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(64, 224, 255, 0.075), rgba(255, 218, 89, 0.035)),
    rgba(0, 0, 0, 0.24);
}

.mcpskilllab-stat-value {
  color: #ffda59;
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
}

.mcpskilllab-stat-label {
  margin-top: 0.35rem;
  color: rgba(236, 240, 241, 0.72);
  font-size: 0.78rem;
}

.mcpskilllab-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
  gap: 1rem;
  margin: 1.2rem 0;
}

.mcpskilllab-side-stack {
  display: grid;
  gap: 1rem;
}

.mcpskilllab-detail-card,
.mcpskilllab-audit-card,
.mcpskilllab-backlog-card {
  min-height: 0;
}

.mcpskilllab-backlog-card {
  margin-top: 0;
}

.mcpskilllab-card.selected {
  border-color: rgba(255, 218, 89, 0.55);
  box-shadow: 0 0 22px rgba(255, 218, 89, 0.12), 5px 0 15px rgba(12, 153, 134, 0.719);
}

.mcpskilllab-card {
  min-height: 290px;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.mcpskilllab-card h3 {
  margin-top: 0.7rem;
  margin-bottom: 0;
  font-size: 1.02rem;
  line-height: 1.35;
}

.mcpskilllab-meta,
.mcpskilllab-tags,
.mcpskilllab-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.mcpskilllab-structured-row {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.2rem;
}

.mcpskilllab-structured-label {
  color: rgba(236, 240, 241, 0.64);
  font-size: 0.76rem;
}

.mcpskilllab-score {
  color: #ffda59;
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-weight: 900;
}

.mcpskilllab-trust-panel {
  display: grid;
  gap: 0.75rem;
  margin: 0.85rem 0;
  padding: 0.85rem;
  border: 1px solid rgba(64, 224, 255, 0.16);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.2);
}

.mcpskilllab-trust-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
}

.mcpskilllab-trust-kicker {
  color: rgba(236, 240, 241, 0.62);
  font-size: 0.72rem;
}

.mcpskilllab-trust-title {
  margin-top: 0.15rem;
  color: rgba(236, 240, 241, 0.92);
  font-weight: 800;
}

.mcpskilllab-trust-total {
  color: #ffda59;
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 1.7rem;
  font-weight: 900;
  line-height: 1;
}

.mcpskilllab-trust-grid {
  display: grid;
  gap: 0.58rem;
}

.mcpskilllab-trust-row {
  display: grid;
  grid-template-columns: minmax(72px, 0.24fr) minmax(120px, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
}

.mcpskilllab-trust-label {
  color: rgba(236, 240, 241, 0.8);
  font-size: 0.76rem;
}

.mcpskilllab-trust-bar {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(236, 240, 241, 0.1);
}

.mcpskilllab-trust-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(64, 224, 255, 0.78), rgba(255, 218, 89, 0.82));
}

.mcpskilllab-trust-value {
  color: rgba(236, 240, 241, 0.76);
  font-size: 0.72rem;
}

.mcpskilllab-trust-hint,
.mcpskilllab-trust-note {
  color: rgba(236, 240, 241, 0.62);
  font-size: 0.74rem;
  line-height: 1.45;
}

.mcpskilllab-check-panel {
  display: grid;
  gap: 0.7rem;
  margin: 0.85rem 0;
  padding: 0.85rem;
  border: 1px solid rgba(64, 224, 255, 0.16);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.18);
}

.mcpskilllab-check-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.mcpskilllab-check-title {
  color: rgba(236, 240, 241, 0.92);
  font-weight: 800;
}

.mcpskilllab-check-grid {
  display: grid;
  gap: 0.55rem;
}

.mcpskilllab-check-row {
  display: grid;
  grid-template-columns: minmax(68px, 0.24fr) minmax(90px, 0.18fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
  color: rgba(236, 240, 241, 0.74);
  font-size: 0.76rem;
}

.mcpskilllab-check-url {
  overflow-wrap: anywhere;
}

.mcpskilllab-check-warnings {
  display: grid;
  gap: 0.4rem;
}

.mcpskilllab-check-warning {
  padding-left: 0.65rem;
  border-left: 2px solid rgba(255, 218, 89, 0.45);
  color: rgba(255, 218, 89, 0.9);
  font-size: 0.76rem;
  line-height: 1.45;
}

.mcpskilllab-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0.18rem 0.5rem;
  border: 1px solid rgba(64, 224, 255, 0.18);
  border-radius: 999px;
  color: rgba(236, 240, 241, 0.84);
  background: rgba(64, 224, 255, 0.055);
  font-size: 0.72rem;
}

.mcpskilllab-chip.official {
  border-color: rgba(46, 204, 113, 0.38);
  color: #2ecc71;
}

.mcpskilllab-chip.low {
  border-color: rgba(46, 204, 113, 0.32);
}

.mcpskilllab-chip.medium {
  border-color: rgba(255, 218, 89, 0.36);
  color: #ffda59;
}

.mcpskilllab-chip.high {
  border-color: rgba(255, 143, 163, 0.42);
  color: rgba(255, 179, 193, 0.96);
}

.mcpskilllab-desc {
  color: rgba(236, 240, 241, 0.82);
  font-size: 0.9rem;
  line-height: 1.55;
}

.mcpskilllab-detail-title {
  margin-top: 0.5rem;
  margin-bottom: 0.7rem;
  color: rgba(236, 240, 241, 0.94);
  font-size: 1.05rem;
  font-weight: 800;
}

.mcpskilllab-audit-list {
  display: grid;
  gap: 0.65rem;
  color: rgba(236, 240, 241, 0.78);
  font-size: 0.86rem;
  line-height: 1.45;
}

.mcpskilllab-audit-list div {
  padding-left: 0.8rem;
  border-left: 2px solid rgba(64, 224, 255, 0.28);
}

.mcpskilllab-hub-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.mcpskilllab-hub-card {
  min-height: 0;
}

.mcpskilllab-hub-desc {
  color: rgba(236, 240, 241, 0.76);
  font-size: 0.86rem;
  line-height: 1.55;
}

.mcpskilllab-service-status {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.75rem;
  padding: 0.7rem 0.78rem;
  border: 1px solid rgba(64, 224, 255, 0.16);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.24);
}

.mcpskilllab-service-status.ready {
  border-color: rgba(46, 204, 113, 0.28);
}

.mcpskilllab-service-status.error {
  border-color: rgba(255, 143, 163, 0.32);
}

.mcpskilllab-search-results {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.85rem;
}

.mcpskilllab-search-candidate {
  display: grid;
  gap: 0.55rem;
  padding: 0.68rem 0.72rem;
  border: 1px solid rgba(64, 224, 255, 0.14);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.24);
}

.mcpskilllab-search-url {
  color: rgba(64, 224, 255, 0.76);
  font-size: 0.74rem;
  line-height: 1.35;
  word-break: break-all;
}

.mcpskilllab-roadmap-list,
.mcpskilllab-custom-list {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.8rem;
}

.mcpskilllab-roadmap-item,
.mcpskilllab-custom-item {
  padding: 0.62rem 0.7rem;
  border: 1px solid rgba(64, 224, 255, 0.14);
  border-radius: 6px;
  background: rgba(0, 20, 40, 0.24);
}

.mcpskilllab-custom-item {
  display: grid;
  gap: 0.55rem;
}

.mcpskilllab-custom-title {
  color: rgba(236, 240, 241, 0.9);
  font-weight: 800;
  line-height: 1.35;
}

.mcpskilllab-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.mcpskilllab-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.mcpskilllab-field {
  display: grid;
  gap: 0.34rem;
}

.mcpskilllab-field.wide,
.mcpskilllab-checkbox-row.wide,
.mcpskilllab-inline-actions.wide {
  grid-column: 1 / -1;
}

.mcpskilllab-field label,
.mcpskilllab-checkbox-row {
  color: rgba(236, 240, 241, 0.72);
  font-size: 0.76rem;
  font-weight: 800;
}

.mcpskilllab-field input,
.mcpskilllab-field select,
.mcpskilllab-field textarea,
.mcpskilllab-backlog-status,
.mcpskilllab-backlog-note {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(64, 224, 255, 0.22);
  border-radius: 6px;
  background: rgba(0, 10, 25, 0.58);
  color: rgba(236, 240, 241, 0.9);
  font-size: 0.82rem;
  line-height: 1.45;
  outline: none;
}

.mcpskilllab-field input,
.mcpskilllab-field select,
.mcpskilllab-backlog-status {
  min-height: 36px;
  padding: 0 0.65rem;
}

.mcpskilllab-field textarea,
.mcpskilllab-backlog-note {
  min-height: 74px;
  padding: 0.55rem 0.65rem;
  resize: vertical;
}

.mcpskilllab-checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.35rem;
}

.mcpskilllab-backlog-list {
  display: grid;
  gap: 0.6rem;
}

.mcpskilllab-backlog-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(118px, 0.42fr);
  gap: 0.7rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(64, 224, 255, 0.14);
  border-radius: 6px;
  background: rgba(0, 20, 40, 0.24);
  color: rgba(236, 240, 241, 0.82);
  font-size: 0.84rem;
}

.mcpskilllab-backlog-main {
  display: grid;
  gap: 0.38rem;
  min-width: 0;
}

.mcpskilllab-backlog-title {
  color: rgba(236, 240, 241, 0.92);
  font-weight: 800;
  overflow-wrap: anywhere;
}

.mcpskilllab-backlog-note,
.mcpskilllab-backlog-actions {
  grid-column: 1 / -1;
}

.mcpskilllab-backlog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mcpskilllab-chip.status-review {
  border-color: rgba(64, 224, 255, 0.26);
}

.mcpskilllab-chip.status-ready {
  border-color: rgba(255, 218, 89, 0.42);
  color: #ffda59;
}

.mcpskilllab-chip.status-connected {
  border-color: rgba(46, 204, 113, 0.38);
  color: #2ecc71;
}

.mcpskilllab-chip.status-paused {
  border-color: rgba(231, 76, 60, 0.34);
  color: #ff8a80;
}

.mcpskilllab-backlog-item .cyber-button {
  min-width: 64px;
  width: auto;
  min-height: 30px;
  padding: 0 0.55rem;
}

.mcpskilllab-backlog-item .cyber-button__tag {
  position: static;
  font-size: 0.7rem;
  transform: none;
  white-space: nowrap;
}

.mcpskilllab-actions {
  margin-top: auto;
}

.mcpskilllab-actions .cyber-button {
  min-width: 0;
  width: auto;
  min-height: 34px;
  padding: 0 0.7rem;
}

.mcpskilllab-actions .cyber-button__tag {
  position: static;
  font-size: 0.72rem;
  transform: none;
  white-space: nowrap;
}

.mcpskilllab-panel {
  margin-top: 1.2rem;
}

.mcpskilllab-modal {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4vh 3vw;
  background: rgba(0, 8, 18, 0.78);
  backdrop-filter: blur(10px);
}

.mcpskilllab-modal-box {
  width: min(1180px, 96vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 218, 89, 0.4);
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(64, 224, 255, 0.08), rgba(255, 218, 89, 0.035)),
    rgba(2, 12, 31, 0.96);
  box-shadow: 0 0 35px rgba(64, 224, 255, 0.18), 0 0 28px rgba(255, 218, 89, 0.1);
  overflow: hidden;
}

.mcpskilllab-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid rgba(64, 224, 255, 0.16);
}

.mcpskilllab-modal-title {
  color: rgba(236, 240, 241, 0.96);
  font-size: 1.05rem;
  font-weight: 900;
}

.mcpskilllab-modal-body {
  min-height: 0;
  padding: 1rem;
  overflow: auto;
}

.mcpskilllab-modal-close {
  min-width: 72px;
}

.mcpskilllab-section-title {
  margin: 1.5rem 0 0.8rem;
  color: rgba(236, 240, 241, 0.92);
  font-size: 1rem;
  font-weight: 900;
}

.mcpskilllab-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: rgba(236, 240, 241, 0.74);
}

/* Skill/MCP 实验室：手机端筛选下拉改为两列，搜索与排序保留整行 */
@media (max-width: 1100px) {
  .mcpskilllab-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
    margin: 0.8rem auto 0.6rem;
  }

  .mcpskilllab-toolbar > #mcpskilllab-search,
  .mcpskilllab-toolbar > #mcpskilllab-sort {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .mcpskilllab-intro,
  .mcpskilllab-workbench,
  .mcpskilllab-hub-grid,
  .mcpskilllab-field-grid,
  .mcpskilllab-backlog-item,
  .mcpskilllab-category-context {
    grid-template-columns: 1fr;
  }

  .mcpskilllab-category-context {
    display: grid;
  }

  .mcpskilllab-batch-top {
    align-items: stretch;
    display: grid;
  }

  .mcpskilllab-batch-controls {
    justify-content: stretch;
  }

  .mcpskilllab-batch-controls .cyber-button {
    flex: 1 1 auto;
  }

  .mcpskilllab-review-head,
  .mcpskilllab-review-item {
    display: grid;
  }

  .mcpskilllab-review-actions {
    justify-content: stretch;
  }

  .mcpskilllab-review-actions .cyber-button {
    flex: 1 1 auto;
  }

  .mcpskilllab-top-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    margin: 0.3rem 0 0.7rem;
  }

  .mcpskilllab-lab-btn {
    width: 100%;
    min-width: 0;
    height: 52px;
    padding: 0.4rem 0.35rem;
    font-size: 0.8rem;
    letter-spacing: 1px;
  }

  .mcpskilllab-lab-btn::after {
    right: 8px;
    bottom: 3px;
    font-size: 0.52rem;
  }

  .mcpskilllab-actions .cyber-button {
    flex: 1 1 auto;
  }
}

.mcpskilllab-wizard {
  display: grid;
  gap: 1.4rem;
}

.mcpskilllab-wizard-resource {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.mcpskilllab-wizard-step {
  display: grid;
  gap: 0.65rem;
}

.mcpskilllab-wizard-step-label {
  color: rgba(255, 218, 89, 0.92);
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.mcpskilllab-wizard-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.65rem;
}

.mcpskilllab-wizard-opt {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-height: 60px;
  padding: 0.7rem 0.85rem;
  border: 1px solid rgba(64, 224, 255, 0.18);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.34);
  color: rgba(236, 240, 241, 0.82);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.mcpskilllab-wizard-opt strong {
  font-weight: 800;
  font-size: 0.9rem;
}

.mcpskilllab-wizard-opt small {
  color: rgba(203, 213, 225, 0.62);
  font-size: 0.72rem;
}

.mcpskilllab-wizard-opt:hover:not(.disabled) {
  border-color: rgba(64, 224, 255, 0.42);
  background: rgba(64, 224, 255, 0.06);
}

.mcpskilllab-wizard-opt.active {
  border-color: rgba(255, 218, 89, 0.62);
  background: rgba(255, 218, 89, 0.08);
  color: #fff;
  box-shadow: 0 0 18px rgba(255, 218, 89, 0.12);
}

.mcpskilllab-wizard-opt.disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.mcpskilllab-wizard-hint {
  color: rgba(203, 213, 225, 0.72);
  font-size: 0.8rem;
  line-height: 1.45;
}

.mcpskilllab-wizard-warnings {
  display: grid;
  gap: 0.45rem;
}

.mcpskilllab-wizard-warning {
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(255, 143, 163, 0.32);
  border-radius: 6px;
  background: rgba(255, 143, 163, 0.06);
  color: rgba(255, 179, 193, 0.92);
  font-size: 0.82rem;
}

.mcpskilllab-wizard-config {
  min-height: 140px;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.78rem;
  white-space: pre-wrap;
  overflow: auto;
}

.mcpskilllab-wizard-steps-list {
  display: grid;
  gap: 0.4rem;
  color: rgba(236, 240, 241, 0.78);
  font-size: 0.84rem;
  line-height: 1.5;
}

.mcpskilllab-wizard-steps-list div {
  padding-left: 0.65rem;
  border-left: 2px solid rgba(64, 224, 255, 0.24);
}

.mcpskilllab-use {
  margin: 0;
  color: rgba(236, 240, 241, 0.88);
  font-size: 0.9rem;
  line-height: 1.65;
}

.mcpskilllab-card .mcpskilllab-actions {
  margin-top: auto;
}

.mcpskilllab-actions .mcpskilllab-guide-open {
  --primary-clr: #ffda59;
  --secondary-clr: #ffda59;
  --glow-clr: rgba(255, 218, 89, 0.42);
}

.mcpskilllab-guide {
  display: grid;
  gap: 1.05rem;
}

.mcpskilllab-guide-use {
  padding: 0.8rem 0.95rem;
  border-left: 3px solid rgba(64, 224, 255, 0.55);
  border-radius: 6px;
  background: rgba(64, 224, 255, 0.07);
  color: rgba(236, 240, 241, 0.95);
  font-size: 0.95rem;
  line-height: 1.65;
}

.mcpskilllab-guide-what {
  color: rgba(203, 213, 225, 0.84);
  font-size: 0.9rem;
  line-height: 1.7;
}

.mcpskilllab-guide-steps {
  display: grid;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mcpskilllab-guide-step {
  display: grid;
  gap: 0.45rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(64, 224, 255, 0.16);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.26);
}

.mcpskilllab-guide-step-title {
  color: #ffda59;
  font-size: 0.92rem;
  font-weight: 800;
}

.mcpskilllab-guide-step-text {
  color: rgba(236, 240, 241, 0.84);
  font-size: 0.9rem;
  line-height: 1.65;
}

.mcpskilllab-guide-code {
  position: relative;
}

.mcpskilllab-guide-code pre {
  margin: 0;
  padding: 0.85rem 4.6rem 0.85rem 0.9rem;
  overflow: auto;
  border: 1px solid rgba(64, 224, 255, 0.18);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  color: #d7f7ff;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.8rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
}

.mcpskilllab-guide-copy {
  position: absolute;
  top: 0.55rem;
  right: 0.6rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid rgba(64, 224, 255, 0.35);
  border-radius: 4px;
  background: rgba(0, 20, 40, 0.92);
  color: #40e0ff;
  font-family: inherit;
  font-size: 0.74rem;
  cursor: pointer;
}

.mcpskilllab-guide-copy:hover {
  border-color: #40e0ff;
  color: #fff;
}

.mcpskilllab-guide-notes {
  display: grid;
  gap: 0.3rem;
  padding: 0.75rem 0.9rem;
  border: 1px dashed rgba(255, 143, 163, 0.32);
  border-radius: 8px;
  color: rgba(255, 190, 200, 0.9);
  font-size: 0.84rem;
  line-height: 1.6;
}

.mcpskilllab-guide-notes-title {
  color: rgba(255, 143, 163, 0.96);
  font-weight: 800;
}

.mcpskilllab-guide-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(64, 224, 255, 0.12);
}
`;
        document.head.appendChild(style);
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            // localStorage may be disabled in some embedded browsers.
        }
    }

    function getFavorites() {
        const saved = readJson(FAVORITES_KEY, []);
        return new Set(Array.isArray(saved)
            ? saved.map(id => normalizeResourceId(id)).filter(Boolean).slice(0, MAX_FAVORITES)
            : []);
    }

    function saveFavorites(favorites) {
        writeJson(FAVORITES_KEY, Array.from(favorites)
            .map(id => normalizeResourceId(id))
            .filter(Boolean)
            .slice(0, MAX_FAVORITES));
    }

    function createCustomId(name) {
        const prefix = String(name || 'resource')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 28) || 'resource';
        return `custom-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    }

    function normalizeCustomResource(raw) {
        const value = raw && typeof raw === 'object' ? raw : {};
        const name = clipText(value.name, 120);
        const url = sanitizeExternalUrl(value.url || value.docs);
        if (!name || !url) return null;
        return normalizeResource({
            ...value,
            id: normalizeResourceId(value.id) || createCustomId(name),
            name,
            url,
            docs: sanitizeExternalUrl(value.docs) || url,
            type: normalizeChoice(value.type, allowedResourceTypes, 'MCP Server'),
            source: 'Community',
            category: normalizeCategory(value.category) || '',
            tags: Array.from(new Set([...normalizeTags(value.tags), 'custom'])),
            use: clipText(value.use || value.scenario, 400, '手动添加的资源。'),
            custom: true
        });
    }

    function getCustomResources() {
        const saved = readJson(CUSTOM_RESOURCES_KEY, []);
        if (!Array.isArray(saved)) return [];
        return saved.map(normalizeCustomResource).filter(Boolean);
    }

    function saveCustomResources(list) {
        writeJson(CUSTOM_RESOURCES_KEY, (Array.isArray(list) ? list : [])
            .map(normalizeCustomResource)
            .filter(Boolean)
            .slice(0, MAX_CUSTOM_RESOURCES));
    }

    function mergeResourceRecord(base, incoming) {
        return {
            ...base,
            ...incoming,
            use: incoming.use || base.use,
            what: incoming.what || base.what,
            steps: incoming.steps.length ? incoming.steps : base.steps,
            notes: incoming.notes.length ? incoming.notes : base.notes,
            pkg: incoming.pkg || base.pkg,
            template: incoming.template || base.template
        };
    }

    function mergeResources() {
        const map = new Map();
        const add = item => {
            if (!item || !item.id) return;
            const previous = map.get(item.id);
            map.set(item.id, previous ? mergeResourceRecord(previous, item) : item);
        };
        builtInResources.forEach(add);
        serverResources.forEach(item => {
            if (item.origin === 'seed' && !builtInIdSet.has(item.id)) return;
            add(item);
        });
        getCustomResources().forEach(add);
        return Array.from(map.values());
    }

    function apiEndpoint(path) {
        return `${API_BASE}${path}`;
    }

    async function apiRequest(path, options = {}) {
        const response = await fetch(apiEndpoint(path), {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
            throw new Error(payload.message || `请求失败：HTTP ${response.status}`);
        }
        return payload.data;
    }

    async function loadServerResources(force = false) {
        currentPage = 1;
        render();
        try {
            const data = await apiRequest('/api/mcp-lab/resources?limit=1000', { method: 'GET' });
            serverResources = normalizeResources(data);
        } catch (error) {
            serverResources = [];
        }
        render();
    }

    function resourceToServerPayload(resource, overrides = {}) {
        return {
            id: resource.id,
            name: resource.name,
            type: resource.type,
            category: getResourceCategory(resource),
            categories: getExplicitCategories(resource),
            source: resource.source,
            recommend: resource.type,
            tags: resource.tags,
            scenario: clipText(resource.use || resource.what, 600, resource.name),
            url: resource.url,
            docs: resource.docs,
            template: resource.template || resource.use || '',
            submittedBy: 'web-ui',
            lastChecked: new Date().toISOString().slice(0, 10),
            ...overrides
        };
    }

    function createResourceBundlePayload(resourceList = mergeResources(), extra = {}) {
        const today = new Date().toISOString().slice(0, 10);
        const normalized = normalizeResources(resourceList)
            .map(item => resourceToServerPayload(item, {
                submittedBy: extra.submittedBy || 'web-ui-bundle',
                lastChecked: today
            }));
        return {
            schemaVersion: '1.0',
            kind: 'pzm-mcp-skill-resource-bundle',
            exportedAt: new Date().toISOString(),
            source: 'PzMCipherTool Skill/MCP Lab',
            submittedBy: extra.submittedBy || 'web-ui',
            compatibility: ['Codex', 'Claude Code', 'OpenClaw', 'Hermes', 'Cursor', 'Generic MCP'],
            resources: normalized
        };
    }

    function normalizeBundlePayload(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('JSON 格式不正确');
        }
        const sourceList = Array.isArray(payload.resources)
            ? payload.resources
            : Array.isArray(payload.skills)
                ? payload.skills
                : Array.isArray(payload.customResources)
                    ? payload.customResources
                    : Array.isArray(payload)
                        ? payload
                        : [];
        if (!sourceList.length) {
            throw new Error('没有找到可导入的 resources / skills 数组');
        }
        const resources = normalizeResources(sourceList).map(item => resourceToServerPayload(item, {
            source: item.source || 'Community',
            submittedBy: payload.submittedBy || item.submittedBy || 'bundle-import'
        }));
        if (!resources.length) {
            throw new Error('资源缺少名称或 http/https 链接');
        }
        return {
            schemaVersion: String(payload.schemaVersion || '1.0'),
            kind: String(payload.kind || 'pzm-mcp-skill-resource-bundle'),
            exportedAt: String(payload.exportedAt || ''),
            source: String(payload.source || 'Uploaded Skill Bundle'),
            submittedBy: String(payload.submittedBy || 'web-ui-bundle'),
            compatibility: normalizeListValue(payload.compatibility, ['Generic MCP'], null, { maxItems: 12, maxLength: 40 }),
            resources
        };
    }

    async function submitResourceToServer(resource) {
        const saved = normalizeResource(await apiRequest('/api/mcp-lab/resources', {
            method: 'POST',
            body: JSON.stringify(resourceToServerPayload(resource))
        }));
        if (!saved) throw new Error('后端返回资源格式不正确');
        const map = new Map(serverResources.map(item => [item.id, item]));
        map.set(saved.id, saved);
        serverResources = Array.from(map.values());
        return saved;
    }

    async function importBundleToServer(text) {
        if (String(text || '').length > MAX_BUNDLE_IMPORT_BYTES) {
            throw new Error('技能包文件过大');
        }
        const bundle = normalizeBundlePayload(JSON.parse(text));
        const result = await apiRequest('/api/mcp-lab/resources/import', {
            method: 'POST',
            body: JSON.stringify(bundle)
        });
        const savedResources = normalizeResources(result.resources || []);
        if (savedResources.length) {
            const map = new Map(serverResources.map(item => [item.id, item]));
            savedResources.forEach(item => map.set(item.id, item));
            serverResources = Array.from(map.values());
        }
        const rejected = Number(result.rejected || 0);
        const suffix = rejected ? `，${rejected} 个被拒绝` : '';
        skillBundleStatus = `已上传 ${result.accepted || savedResources.length} 个资源到共享目录${suffix}。`;
        if (Array.isArray(result.errors) && result.errors.length) {
            skillBundleStatus += ` 首个错误：${result.errors[0]}`;
        }
        return result;
    }

    async function exportServerBundle() {
        isBundleExporting = true;
        skillBundleStatus = '正在从后端生成通用技能包...';
        render();
        try {
            const bundle = await apiRequest('/api/mcp-lab/resources/export?limit=1000', { method: 'GET' });
            const resources = (Array.isArray(bundle.resources) ? bundle.resources : [])
                .filter(item => !(item.origin === 'seed' && !builtInIdSet.has(normalizeResourceId(item.id))));
            bundle.resources = resources;
            downloadText(`pzm-skill-bundle-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2));
            skillBundleStatus = `已下载共享技能包：${resources.length} 个资源。`;
        } catch (error) {
            const bundle = createResourceBundlePayload(mergeResources());
            downloadText(`pzm-skill-bundle-local-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2));
            skillBundleStatus = `后端导出失败，已下载前端可见资源包：${error.message || '后端不可用'}`;
        } finally {
            isBundleExporting = false;
            render();
        }
    }

    async function searchServerResourcesFromForm(form) {
        const data = new FormData(form);
        searchQuery = clipText(data.get('serverSearchQuery'), 160);
        searchCategory = normalizeCategory(data.get('serverSearchCategory')) || activeCategory || 'mcp';
        if (!searchQuery) {
            searchStatus = '请输入搜索关键词。';
            render();
            return;
        }
        isSearchLoading = true;
        searchStatus = '正在联网搜索候选资源...';
        render();
        try {
            const data = await apiRequest('/api/mcp-lab/resources/search', {
                method: 'POST',
                body: JSON.stringify({
                    query: searchQuery,
                    category: searchCategory,
                    limit: 8
                })
            });
            searchCandidates = normalizeResources(data);
            searchStatus = searchCandidates.length
                ? `找到 ${searchCandidates.length} 个候选。先打开来源检查，再加入共享目录。`
                : '没有找到可用候选，可以换关键词或手动添加。';
        } catch (error) {
            searchCandidates = [];
            searchStatus = `联网搜索失败：${error.message || '后端不可用'}`;
        } finally {
            isSearchLoading = false;
            render();
        }
    }

    function downloadText(fileName, content) {
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function deleteCustomResource(id) {
        const normalizedId = normalizeResourceId(id);
        if (!normalizedId) return;
        saveCustomResources(getCustomResources().filter(item => item.id !== normalizedId));
        const favorites = getFavorites();
        favorites.delete(normalizedId);
        saveFavorites(favorites);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function localize(group, value) {
        return displayText[group] && displayText[group][value] ? displayText[group][value] : value;
    }

    function normalizeCategory(value) {
        const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
        const aliases = {
            dsh: 'dsh',
            cap: 'dsh',
            capability: 'dsh',
            mcp: 'mcp',
            mcptools: 'mcp',
            plugins: 'plugins',
            plugin: 'plugins',
            skill: 'skill',
            skills: 'skill',
            prompt: 'prompt',
            prompts: 'prompt',
            workflow: 'workflow',
            workflows: 'workflow',
            devtools: 'devTools',
            developer: 'devTools',
            dataapis: 'dataApis',
            dataapi: 'dataApis',
            data: 'dataApis',
            apis: 'dataApis',
            security: 'security',
            automation: 'automation',
            other: 'other'
        };
        return aliases[normalized] || '';
    }

    function getCategoryMeta(category) {
        return categoryTabs.find(item => item.id === category) || categoryTabs[0];
    }

    function hasAnyKeyword(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }

    function getExplicitCategories(item) {
        const values = [
            ...(Array.isArray(item.categories) ? item.categories : []),
            item.category
        ];
        return Array.from(new Set(values.map(normalizeCategory).filter(Boolean)));
    }

    function getResourceCategory(item) {
        const explicit = getExplicitCategories(item);
        if (explicit.length) return explicit[0];

        const type = String(item.type || '').toLowerCase();
        const tags = (item.tags || []).map(tag => String(tag).toLowerCase());
        const text = [item.name, item.type, item.use, item.what, tags.join(' ')].join(' ').toLowerCase();

        if (type.includes('mcp')) return 'mcp';
        if (type.includes('skill') || type.includes('plugin') || tags.includes('skill')) return 'skill';
        if (hasAnyKeyword(text, ['workflow', '工作流', '编排'])) return 'workflow';
        if (hasAnyKeyword(text, ['security', '安全', '权限'])) return 'security';
        if (hasAnyKeyword(text, ['数据库', 'database'])) return 'dataApis';
        return 'other';
    }

    function isResourceInCategory(item, category) {
        const explicit = getExplicitCategories(item);
        return explicit.length ? explicit.includes(category) : getResourceCategory(item) === category;
    }

    function getCategoryResources(category) {
        return resources.filter(item => isResourceInCategory(item, category));
    }

    function getCategoryCounts() {
        return Object.fromEntries(categoryTabs.map(tab => [tab.id, getCategoryResources(tab.id).length]));
    }

    function getFilteredResources() {
        const normalizedQuery = query.trim().toLowerCase();
        const source = normalizedQuery ? resources : getCategoryResources(activeCategory);
        if (!normalizedQuery) return source;
        return source.filter(item => {
            const text = [
                item.name,
                item.type,
                item.source,
                item.use,
                item.what,
                item.pkg,
                item.tags.join(' ')
            ].join(' ').toLowerCase();
            return text.includes(normalizedQuery);
        });
    }

    function getResourceById(id) {
        const normalizedId = normalizeResourceId(id);
        return resources.find(item => item.id === normalizedId) || null;
    }

    function getGuide(item) {
        if (!item) return { what: '', steps: [], notes: [] };
        if (item.steps.length) {
            return { what: item.what, steps: item.steps, notes: item.notes };
        }
        if (item.pkg) {
            const shortId = item.pkg.split('/').pop();
            return {
                what: item.what || `${item.name} 是 DeepSeek Harness 的插件包，随 Harness 发布，不需要单独安装。`,
                steps: [
                    {
                        title: '确认已经在运行',
                        text: '打开 DSH 设置 → 插件 → 插件列表，搜索这个插件名；状态正常、没有红色失败标记就说明已生效。'
                    },
                    {
                        title: '在自定义 profile 里引用',
                        text: '如果你在搭自己的 profile，在 cordis 配置里加一条 loader 条目，然后重启 DSH：',
                        code: `- id: ${shortId}\n  name: '${item.pkg}'`
                    },
                    {
                        title: '验证',
                        text: `重启后回到插件列表，还能看到「${item.name}」这一条，就说明配置生效。`
                    }
                ],
                notes: ['插件包随 Harness 一起发布，普通使用不需要手动安装。', '需要写配置时，先备份 profile 里的 cordis.patch.yml。']
            };
        }
        return {
            what: item.what,
            steps: [
                {
                    title: '打开来源确认接入方式',
                    text: '这个条目来自共享目录，还没有整理好步骤；先点下方「打开官网」或「打开文档」，按上游说明配置。'
                }
            ],
            notes: item.notes
        };
    }

    function renderIntro() {
        return `
            <div class="mcpskilllab-intro">
                <div class="card">
                    <div class="badge">这个页面做什么</div>
                    <div class="mcpskilllab-intro-title">Skill / MCP 实验室</div>
                    <div class="mcpskilllab-intro-text">
                        这里收录三类东西：DeepSeek Harness 已经内置的能力、可以接进来的 MCP 服务、以及 Harness 的插件包。
                        每张卡都写清楚它具体能做什么、要准备什么、怎么验证，不再用「适合资源发现」这种说了等于没说的话。
                    </div>
                </div>
                <div class="card">
                    <div class="badge">建议怎么看</div>
                    <div class="mcpskilllab-flow">
                        <div>1. 先看「DSH 能力」：知道 Agent 能做什么，直接开口用</div>
                        <div>2. 要外部工具就去「MCP 服务」：按三步接上再验证</div>
                        <div>3. 想查某个插件负责什么，去「DSH 插件」搜名字</div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTopActions() {
        return `
            <div class="mcpskilllab-top-actions">
                <button class="mcpskilllab-lab-btn" id="mcpskilllab-refresh-server" type="button">刷新目录</button>
                <button class="mcpskilllab-lab-btn mcpskilllab-panel-toggle" type="button" data-panel="add" aria-expanded="${activeDialog === 'add'}">共享目录</button>
                <button class="mcpskilllab-lab-btn mcpskilllab-panel-toggle" type="button" data-panel="templates" aria-expanded="${activeDialog === 'templates'}">配置模板</button>
            </div>
        `;
    }

    function getCategoryDialStyle(index, total) {
        if (!total || total < 2) return '--dial-y: 0px; --dial-r: 0deg;';
        const ratio = (index - (total - 1) / 2) / ((total - 1) / 2);
        const dialY = Math.round(-4 + Math.abs(ratio) * 18);
        const dialR = Math.round(ratio * 15);
        return `--dial-y: ${dialY}px; --dial-r: ${dialR}deg;`;
    }

    function renderCategoryTabs() {
        const counts = getCategoryCounts();
        const visibleTabs = categoryTabs.filter(tab => (counts[tab.id] || 0) > 0 || activeCategory === tab.id);
        return visibleTabs.map((tab, index) => {
            const count = counts[tab.id] || 0;
            const active = activeCategory === tab.id;
            const label = escapeHtml(tab.label);
            return `
            <button type="button" class="submodule-btn mcpskilllab-filter${active ? ' active' : ''}"
                data-target="${escapeHtml(tab.id)}" data-category="${escapeHtml(tab.id)}"
                data-count="${escapeHtml(count)}" title="${label} ${escapeHtml(count)} 个条目"
                style="${getCategoryDialStyle(index, visibleTabs.length)}">${label}</button>
        `;
        }).join('');
    }

    function renderCategoryContext(filtered) {
        const category = getCategoryMeta(activeCategory);
        const searching = Boolean(query.trim());
        return `
            <div class="mcpskilllab-category-context">
                <div>
                    <div class="mcpskilllab-category-title">${escapeHtml(searching ? '搜索结果' : category.label)}</div>
                    <div class="mcpskilllab-category-hint">${escapeHtml(searching
                        ? `在全部 ${resources.length} 个条目里匹配「${query.trim()}」，点左侧分类可以退出搜索。`
                        : category.hint)}</div>
                </div>
                <div class="mcpskilllab-meta">
                    <span class="mcpskilllab-chip">当前结果：${escapeHtml(filtered.length)}</span>
                    ${searching ? '' : `<span class="mcpskilllab-chip">分类条目：${escapeHtml(getCategoryResources(activeCategory).length)}</span>`}
                </div>
            </div>
        `;
    }

    function getPageWindow(totalPages, current) {
        const pages = [1, current - 1, current, current + 1, totalPages]
            .filter(page => page >= 1 && page <= totalPages)
            .filter((page, index, list) => list.indexOf(page) === index)
            .sort((a, b) => a - b);
        const items = [];
        let previous = 0;
        pages.forEach(page => {
            if (previous && page - previous > 1) items.push('gap');
            items.push(page);
            previous = page;
        });
        return items;
    }

    function renderPagination(totalPages, total, withTopLink) {
        if (totalPages <= 1) return '';
        const numbers = getPageWindow(totalPages, currentPage).map(item => item === 'gap'
            ? '<span class="mcpskilllab-pager-gap">...</span>'
            : `<button type="button" class="mcpskilllab-pager-btn mcpskilllab-pager-num${item === currentPage ? ' active' : ''}" data-page="${item}"${item === currentPage ? ' aria-current="page"' : ''}>${item}</button>`
        ).join('');
        return `
            <nav class="mcpskilllab-pager" aria-label="资源分页">
                <button type="button" class="mcpskilllab-pager-btn" data-page="${currentPage - 1}"${currentPage <= 1 ? ' disabled' : ''}>上一页</button>
                <span class="mcpskilllab-pager-nums">${numbers}</span>
                <button type="button" class="mcpskilllab-pager-btn" data-page="${currentPage + 1}"${currentPage >= totalPages ? ' disabled' : ''}>下一页</button>
                <span class="mcpskilllab-pager-info">第 ${currentPage} / ${totalPages} 页 (共 ${total} 条)</span>
                ${withTopLink ? '<button type="button" class="mcpskilllab-pager-top">回到顶部</button>' : ''}
            </nav>
        `;
    }

    function scrollToList() {
        const list = document.getElementById('mcpskilllab-list');
        if (!list || typeof window.scrollTo !== 'function') return;
        const top = list.getBoundingClientRect().top + (window.pageYOffset || 0) - 32;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    function keepPagerAnchored(index, offsetBefore) {
        const pager = document.querySelectorAll('.mcpskilllab-pager')[index];
        if (!pager || typeof window.scrollBy !== 'function') return;
        const delta = pager.getBoundingClientRect().top - offsetBefore;
        if (Math.abs(delta) > 1) window.scrollBy(0, delta);
    }

    function renderResourceCard(item, favorites) {
        const isFavorite = favorites.has(item.id);
        const tags = item.type === 'DSH Plugin' ? item.tags.filter(tag => tag !== 'dsh') : item.tags;
        const chips = [
            ...tags.map(tag => `<span class="mcpskilllab-chip">#${escapeHtml(tag)}</span>`),
            ...(item.version ? [`<span class="mcpskilllab-chip">v${escapeHtml(item.version)}</span>`] : [])
        ];
        return `
            <article class="card mcpskilllab-card" data-resource-id="${escapeHtml(item.id)}">
                <div class="badge">${escapeHtml(localize('type', item.type))}</div>
                <h3>${escapeHtml(item.name)}</h3>
                <p class="mcpskilllab-use">${escapeHtml(item.use || item.what || '暂无说明')}</p>
                ${chips.length ? `<div class="mcpskilllab-tags">${chips.join('')}</div>` : ''}
                <div class="mcpskilllab-actions">
                    <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(item.url)}"><span class="cyber-button__tag">官网</span></button>
                    <button class="cyber-button mcpskilllab-favorite" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">${isFavorite ? '已收藏' : '收藏'}</span></button>
                    <button class="cyber-button mcpskilllab-guide-open" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">怎么用</span></button>
                    ${item.custom ? `<button class="cyber-button mcpskilllab-delete-custom" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">删除</span></button>` : ''}
                </div>
            </article>
        `;
    }

    function renderTemplates() {
        return templates.map(item => `
            <div class="card mcpskilllab-card">
                <div class="badge">${escapeHtml(item.title)}</div>
                <div class="result">${escapeHtml(item.body)}</div>
                <div class="mcpskilllab-actions">
                    <button class="cyber-button mcpskilllab-copy" type="button" data-copy="${escapeHtml(item.body)}"><span class="cyber-button__tag">复制模板</span></button>
                </div>
            </div>
        `).join('');
    }

    function renderCategoryOptions(current) {
        return categoryTabs
            .filter(item => item.id === 'dsh' || item.id === 'mcp' || item.id === 'plugins' || item.id === current)
            .map(item => `<option value="${escapeHtml(item.id)}"${current === item.id ? ' selected' : ''}>${escapeHtml(item.label)}</option>`)
            .join('');
    }

    function renderSearchCandidates() {
        if (!searchCandidates.length) {
            return searchStatus
                ? `<div class="mcpskilllab-desc">${escapeHtml(searchStatus)}</div>`
                : '<div class="mcpskilllab-desc">输入关键词后，后端会通过联网搜索返回候选资源。候选不会自动入库，需要手动确认。</div>';
        }
        return `
            <div class="mcpskilllab-search-results">
                ${searchCandidates.map(item => `
                    <div class="mcpskilllab-search-candidate">
                        <div>
                            <div class="mcpskilllab-custom-title">${escapeHtml(item.name)}</div>
                            <div class="mcpskilllab-search-url">${escapeHtml(item.url)}</div>
                        </div>
                        <div class="mcpskilllab-meta">
                            <span class="mcpskilllab-chip">${escapeHtml(localize('type', item.type))}</span>
                            <span class="mcpskilllab-chip">${escapeHtml(getCategoryMeta(getResourceCategory(item)).label)}</span>
                            <span class="mcpskilllab-chip">${escapeHtml(localize('source', item.source))}</span>
                        </div>
                        ${renderResourceExplanation(item)}
                        <div class="mcpskilllab-inline-actions">
                            <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(item.url)}"><span class="cyber-button__tag">打开来源</span></button>
                            <button class="cyber-button mcpskilllab-add-candidate" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">加入共享目录</span></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderResourceExplanation(item, className = 'mcpskilllab-desc') {
        const use = item.use || item.what || '';
        if (!use) return '';
        return `<div class="${escapeHtml(className)}">${escapeHtml(use)}</div>`;
    }

    function renderHubPanel() {
        return `
            <div class="mcpskilllab-hub-grid">
                <div class="card mcpskilllab-hub-card">
                    <div class="badge">通用接口</div>
                    <div class="mcpskilllab-detail-title">上传 / 下载技能包</div>
                    <div class="mcpskilllab-hub-desc">
                        技能包是通用 JSON，面向 Codex、Claude Code、OpenClaw、Hermes、Cursor 和 Generic MCP。上传会批量写入后端共享目录，下载可交给不同 Agent 或团队工具继续处理。
                    </div>
                    <div class="mcpskilllab-meta">
                        <span class="mcpskilllab-chip">kind: pzm-mcp-skill-resource-bundle</span>
                        <span class="mcpskilllab-chip">resources[]</span>
                        <span class="mcpskilllab-chip">只登记，不执行安装</span>
                    </div>
                    <div class="mcpskilllab-inline-actions">
                        <button class="cyber-button" id="mcpskilllab-bundle-export" type="button" ${isBundleExporting ? 'disabled' : ''}><span class="cyber-button__tag">${isBundleExporting ? '下载中' : '下载技能包'}</span></button>
                        <button class="cyber-button" id="mcpskilllab-bundle-import" type="button" ${isBundleImporting ? 'disabled' : ''}><span class="cyber-button__tag">${isBundleImporting ? '上传中' : '上传技能包'}</span></button>
                        <input id="mcpskilllab-bundle-import-file" type="file" accept="application/json,.json" hidden>
                    </div>
                    ${skillBundleStatus ? `<div class="mcpskilllab-hub-desc">${escapeHtml(skillBundleStatus)}</div>` : ''}
                    <div class="result">{
  "kind": "pzm-mcp-skill-resource-bundle",
  "compatibility": ["Codex", "Claude Code", "OpenClaw", "Hermes"],
  "resources": [{ "name": "...", "url": "https://...", "category": "mcp" }]
}</div>
                </div>

                <div class="card mcpskilllab-hub-card">
                    <div class="badge">联网搜索</div>
                    <div class="mcpskilllab-detail-title">搜索并加入共享目录</div>
                    <form id="mcpskilllab-server-search-form" class="mcpskilllab-field-grid">
                        <div class="mcpskilllab-field wide">
                            <label for="mcpskilllab-server-search-query">关键词</label>
                            <input id="mcpskilllab-server-search-query" name="serverSearchQuery" type="text" value="${escapeHtml(searchQuery)}" placeholder="例如：Notion MCP / browser automation / 数据库">
                        </div>
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-server-search-category">分类</label>
                            <select id="mcpskilllab-server-search-category" name="serverSearchCategory">${renderCategoryOptions(searchCategory || activeCategory)}</select>
                        </div>
                        <div class="mcpskilllab-inline-actions">
                            <button class="cyber-button" type="submit" ${isSearchLoading ? 'disabled' : ''}><span class="cyber-button__tag">${isSearchLoading ? '搜索中' : '联网搜索'}</span></button>
                        </div>
                    </form>
                    ${searchStatus ? `<div class="mcpskilllab-hub-desc">${escapeHtml(searchStatus)}</div>` : ''}
                    ${renderSearchCandidates()}
                </div>
            </div>
        `;
    }

    function renderInlinePanel() {
        if (activeDialog === 'add') {
            return `
                <div class="mcpskilllab-panel" id="mcpskilllab-action-panel">
                    <div class="card mcpskilllab-hub-card">
                        <div class="badge">共享目录</div>
                        <div class="mcpskilllab-detail-title">批量交换 Skill / MCP 资源</div>
                        <div class="mcpskilllab-hub-desc">把整理好的资源包同步到团队共享目录，或从共享目录下载一份。</div>
                        <div class="mcpskilllab-inline-actions">
                            <button class="cyber-button mcpskilllab-panel-close" type="button"><span class="cyber-button__tag">收起</span></button>
                        </div>
                    </div>
                    ${renderHubPanel()}
                </div>
            `;
        }

        if (activeDialog === 'templates') {
            return `
                <div class="mcpskilllab-panel" id="mcpskilllab-action-panel">
                    <div class="card mcpskilllab-hub-card">
                        <div class="badge">配置模板</div>
                        <div class="mcpskilllab-detail-title">常用接入模板</div>
                        <div class="mcpskilllab-hub-desc">复制模板后再按上游文档替换真实命令、URL 和环境变量。</div>
                        <div class="mcpskilllab-inline-actions">
                            <button class="cyber-button mcpskilllab-panel-close" type="button"><span class="cyber-button__tag">收起</span></button>
                        </div>
                    </div>
                    <div class="mcpskilllab-grid">
                        ${renderTemplates()}
                    </div>
                </div>
            `;
        }

        return '';
    }

    function renderGuideBody(item) {
        const guide = getGuide(item);
        const steps = guide.steps.map((step, index) => `
            <li class="mcpskilllab-guide-step">
                <div class="mcpskilllab-guide-step-title">第 ${index + 1} 步 · ${escapeHtml(step.title || '操作')}</div>
                ${step.text ? `<div class="mcpskilllab-guide-step-text">${escapeHtml(step.text)}</div>` : ''}
                ${step.code ? `
                    <div class="mcpskilllab-guide-code">
                        <pre>${escapeHtml(step.code)}</pre>
                        <button class="mcpskilllab-copy mcpskilllab-guide-copy" type="button" data-copy="${escapeHtml(step.code)}">复制</button>
                    </div>
                ` : ''}
            </li>
        `).join('');

        return `
            <div class="mcpskilllab-guide">
                <div class="mcpskilllab-guide-use">用途：${escapeHtml(item.use || '暂无说明')}</div>
                ${guide.what ? `<div class="mcpskilllab-guide-what">${escapeHtml(guide.what)}</div>` : ''}
                ${steps ? `<ol class="mcpskilllab-guide-steps">${steps}</ol>` : ''}
                ${guide.notes.length ? `
                    <div class="mcpskilllab-guide-notes">
                        <div class="mcpskilllab-guide-notes-title">注意</div>
                        ${guide.notes.map(note => `<div>· ${escapeHtml(note)}</div>`).join('')}
                    </div>
                ` : ''}
                <div class="mcpskilllab-guide-foot">
                    <span class="mcpskilllab-chip">${escapeHtml(localize('type', item.type))}</span>
                    ${item.pkg ? `<span class="mcpskilllab-chip">${escapeHtml(item.pkg)}</span>` : ''}
                    ${item.version ? `<span class="mcpskilllab-chip">v${escapeHtml(item.version)}</span>` : ''}
                    <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(item.url)}"><span class="cyber-button__tag">打开官网</span></button>
                    ${item.docs && item.docs !== item.url ? `<button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(item.docs)}"><span class="cyber-button__tag">打开文档</span></button>` : ''}
                </div>
            </div>
        `;
    }

    function renderDialog() {
        if (activeDialog !== 'guide') return '';
        const item = getResourceById(guideResourceId);
        if (!item) return '';
        const title = `怎么用 · ${item.name}`;

        return `
            <div class="mcpskilllab-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
                <div class="mcpskilllab-modal-box">
                    <div class="mcpskilllab-modal-head">
                        <div>
                            <div class="badge">${escapeHtml(localize('type', item.type))}</div>
                            <div class="mcpskilllab-modal-title">${escapeHtml(title)}</div>
                        </div>
                        <button class="cyber-button mcpskilllab-modal-close" type="button"><span class="cyber-button__tag">关闭</span></button>
                    </div>
                    <div class="mcpskilllab-modal-body">
                        ${renderGuideBody(item)}
                    </div>
                </div>
            </div>
        `;
    }

    function render() {
        const root = document.getElementById('mcpskilllab-root');
        if (!root) return;

        resources = mergeResources();
        const favorites = getFavorites();
        const filtered = getFilteredResources();
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        const pageStart = (currentPage - 1) * pageSize;
        const pageItems = filtered.slice(pageStart, pageStart + pageSize);
        const category = getCategoryMeta(activeCategory);
        const searching = Boolean(query.trim());

        root.innerHTML = `
            <div class="mcpskilllab-shell">
                <div class="apizz-console-layout cipher-lab-console-layout">
                    <aside class="apizz-console-nav cipher-lab-console-nav mcpskilllab-console-nav" aria-label="Skill / MCP 实验室导航">
                        ${renderCategoryTabs()}
                    </aside>

                    <main class="apizz-console-main cipher-lab-console-main">
                        <div class="cipher-lab-panel-stack">
                            ${renderTopActions()}
                            ${renderIntro()}
                            ${renderInlinePanel()}

                            <div class="mcpskilllab-toolbar">
                                <input id="mcpskilllab-search" type="text" value="${escapeHtml(query)}" placeholder="搜索能力、MCP 服务或插件…">
                            </div>
                            ${renderCategoryContext(filtered)}

                            <div class="mcpskilllab-section-title">
                                ${escapeHtml(searching ? '全部条目' : category.label)}
                                <span class="mcpskilllab-section-count">共 ${escapeHtml(filtered.length)} 条</span>
                            </div>
                            ${renderPagination(totalPages, filtered.length)}

                            <div class="mcpskilllab-grid${listFade ? ' mcpskilllab-grid-fade' : ''}" id="mcpskilllab-list">
                                ${pageItems.length
                                    ? pageItems.map(item => renderResourceCard(item, favorites)).join('')
                                    : '<div class="card mcpskilllab-empty">没有匹配的条目。换个关键词，或点左侧分类浏览全部内容。</div>'}
                            </div>

                            ${renderPagination(totalPages, filtered.length, true)}

                            ${renderDialog()}
                        </div>
                    </main>
                </div>
            </div>
        `;
        listFade = false;
        bindEvents(root);
        syncNavToActiveCategory(root);
    }

    function syncNavToActiveCategory(root) {
        const nav = root.querySelector('.mcpskilllab-console-nav');
        if (!nav || !nav.clientWidth) return;
        const activeButton = nav.querySelector('.mcpskilllab-filter.active');
        const maxScroll = nav.scrollWidth - nav.clientWidth;
        if (!activeButton || maxScroll <= 4) return;
        const target = activeButton.offsetLeft - (nav.clientWidth - activeButton.offsetWidth) / 2;
        nav.scrollLeft = Math.max(0, Math.min(target, maxScroll));
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
        }
        return fallbackCopyText(text);
    }

    function fallbackCopyText(text) {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.focus();
        area.select();
        try {
            document.execCommand('copy');
        } catch (error) {
            // Ignore: the caller still shows a hint so the user can copy manually.
        }
        area.remove();
        return Promise.resolve();
    }

    function flashCopyLabel(button) {
        const tag = button.querySelector('.cyber-button__tag') || button;
        if (tag.dataset.copyBusy) return;
        const oldText = tag.textContent;
        tag.dataset.copyBusy = '1';
        tag.textContent = '已复制';
        setTimeout(() => {
            tag.textContent = oldText;
            delete tag.dataset.copyBusy;
        }, 900);
    }

    function safeOpenUrl(value) {
        const url = sanitizeExternalUrl(value);
        if (!url) {
            window.alert('链接格式不安全或不可用。只支持 http/https。');
            return;
        }
        window.open(url, '_blank', 'noopener');
    }

    function bindEvents(root) {
        const search = root.querySelector('#mcpskilllab-search');
        if (search) {
            search.addEventListener('input', event => {
                query = event.target.value;
                currentPage = 1;
                render();
                const nextSearch = document.getElementById('mcpskilllab-search');
                if (nextSearch) {
                    nextSearch.focus();
                    nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
                }
            });
        }

        root.querySelectorAll('.mcpskilllab-panel-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const panel = button.getAttribute('data-panel') || '';
                activeDialog = activeDialog === panel ? '' : panel;
                render();
            });
        });

        root.querySelectorAll('.mcpskilllab-panel-close').forEach(button => {
            button.addEventListener('click', () => {
                activeDialog = '';
                render();
            });
        });

        root.querySelectorAll('.mcpskilllab-modal-close').forEach(button => {
            button.addEventListener('click', () => {
                activeDialog = '';
                render();
            });
        });

        root.querySelectorAll('.mcpskilllab-modal').forEach(modal => {
            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    activeDialog = '';
                    render();
                }
            });
        });

        const refreshButton = root.querySelector('#mcpskilllab-refresh-server');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                loadServerResources(true);
            });
        }

        const serverSearchForm = root.querySelector('#mcpskilllab-server-search-form');
        if (serverSearchForm) {
            serverSearchForm.addEventListener('submit', event => {
                event.preventDefault();
                searchServerResourcesFromForm(serverSearchForm);
            });
        }

        root.querySelectorAll('.mcpskilllab-add-candidate').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.getAttribute('data-id');
                const candidate = searchCandidates.find(item => item.id === id);
                if (!candidate) return;
                const tag = button.querySelector('.cyber-button__tag');
                const oldText = tag ? tag.textContent : '';
                if (tag) tag.textContent = '提交中';
                try {
                    const saved = await submitResourceToServer(candidate);
                    activeCategory = getResourceCategory(saved);
                    searchStatus = `已加入共享目录：${saved.name}`;
                    render();
                } catch (error) {
                    searchStatus = `加入共享目录失败：${error.message || '后端不可用'}`;
                    render();
                } finally {
                    if (tag) tag.textContent = oldText;
                }
            });
        });

        root.querySelectorAll('.mcpskilllab-filter').forEach(button => {
            button.addEventListener('click', () => {
                activeCategory = normalizeCategory(button.getAttribute('data-category')) || 'dsh';
                query = '';
                currentPage = 1;
                render();
            });
        });

        root.querySelectorAll('.mcpskilllab-pager-btn').forEach(button => {
            button.addEventListener('click', () => {
                if (button.disabled) return;
                const target = Number(button.getAttribute('data-page'));
                if (!Number.isFinite(target)) return;
                const pager = button.closest('.mcpskilllab-pager');
                const nextPage = Math.max(1, Math.round(target));
                if (nextPage === currentPage) return;
                const pagerIndex = pager ? Array.prototype.slice.call(document.querySelectorAll('.mcpskilllab-pager')).indexOf(pager) : -1;
                const offsetBefore = pager ? pager.getBoundingClientRect().top : 0;
                currentPage = nextPage;
                listFade = true;
                render();
                if (pagerIndex >= 0) keepPagerAnchored(pagerIndex, offsetBefore);
            });
        });

        root.querySelectorAll('.mcpskilllab-pager-top').forEach(button => {
            button.addEventListener('click', () => {
                scrollToList();
            });
        });

        root.querySelectorAll('.mcpskilllab-open').forEach(button => {
            button.addEventListener('click', () => {
                const url = button.getAttribute('data-url');
                if (url) safeOpenUrl(url);
            });
        });

        root.querySelectorAll('.mcpskilllab-copy').forEach(button => {
            button.addEventListener('click', () => {
                const value = button.getAttribute('data-copy') || '';
                copyText(value);
                flashCopyLabel(button);
            });
        });

        const bundleExportButton = root.querySelector('#mcpskilllab-bundle-export');
        if (bundleExportButton) {
            bundleExportButton.addEventListener('click', exportServerBundle);
        }

        const bundleImportButton = root.querySelector('#mcpskilllab-bundle-import');
        const bundleImportFile = root.querySelector('#mcpskilllab-bundle-import-file');
        if (bundleImportButton && bundleImportFile) {
            bundleImportButton.addEventListener('click', () => {
                bundleImportFile.click();
            });
            bundleImportFile.addEventListener('change', event => {
                const file = event.target.files && event.target.files[0];
                if (!file) return;
                if (file.size > MAX_BUNDLE_IMPORT_BYTES) {
                    window.alert('上传失败：技能包文件过大');
                    bundleImportFile.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = async () => {
                    isBundleImporting = true;
                    skillBundleStatus = '正在上传技能包到共享目录...';
                    render();
                    try {
                        await importBundleToServer(String(reader.result || ''));
                        render();
                    } catch (error) {
                        skillBundleStatus = `上传失败：${error.message || 'JSON 无法解析'}`;
                        render();
                    } finally {
                        isBundleImporting = false;
                        bundleImportFile.value = '';
                        render();
                    }
                };
                reader.readAsText(file, 'utf-8');
            });
        }

        root.querySelectorAll('.mcpskilllab-delete-custom').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                if (!id) return;
                if (window.confirm && !window.confirm('确定删除这个本地自定义资源吗？')) return;
                deleteCustomResource(id);
                render();
            });
        });

        root.querySelectorAll('.mcpskilllab-favorite').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                const favorites = getFavorites();
                if (favorites.has(id)) {
                    favorites.delete(id);
                } else {
                    favorites.add(id);
                }
                saveFavorites(favorites);
                render();
            });
        });

        root.querySelectorAll('.mcpskilllab-guide-open').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                if (!id) return;
                guideResourceId = id;
                activeDialog = 'guide';
                render();
            });
        });
    }

    window.initMcpSkillLab = function () {
        injectStyles();
        render();
        loadServerResources();
    };
})();
