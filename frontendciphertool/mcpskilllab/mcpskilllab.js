(function () {
    const config = window.MCPSKILLLAB_CONFIG || {};
    const STYLE_ID = config.styleId || 'mcpskilllab-inline-style';
    const FAVORITES_KEY = config.favoritesKey || 'MCPSKILLLAB_FAVORITES';
    const BACKLOG_META_KEY = config.backlogMetaKey || 'MCPSKILLLAB_BACKLOG_META';
    const CUSTOM_RESOURCES_KEY = config.customResourcesKey || 'MCPSKILLLAB_CUSTOM_RESOURCES';
    const fallbackResources = config.fallbackResources || [];
    const templates = config.templates || [];
    const auditItems = config.auditItems || [];
    const backlogStatuses = config.backlogStatuses || [];
    const categoryTabs = config.categoryTabs || [];
    const sortOptions = config.sortOptions || [];
    const allowedResourceTypes = config.allowedResourceTypes || [];
    const allowedSources = config.allowedSources || [];
    const allowedRisks = config.allowedRisks || [];
    const allowedPermissions = config.allowedPermissions || [];
    const allowedInstallModes = config.allowedInstallModes || [];
    const allowedMaintenance = config.allowedMaintenance || [];
    const allowedAuth = config.allowedAuth || [];
    const MAX_IMPORT_BYTES = config.maxImportBytes || 200 * 1024;
    const MAX_CUSTOM_RESOURCES = config.maxCustomResources || 200;
    const MAX_FAVORITES = config.maxFavorites || 500;
    const wizardPlatforms = config.wizardPlatforms || [];
    const wizardModes = config.wizardModes || [];
    const displayText = config.displayText || {};

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

    function normalizeAuthRequired(value) {
        if (value === true) return 'true';
        if (value === false) return 'false';
        return normalizeChoice(String(value), allowedAuth, 'depends');
    }

    function clampScore(value) {
        const score = Number(value);
        if (!Number.isFinite(score)) return 60;
        return Math.max(0, Math.min(100, Math.round(score)));
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

    function normalizeTags(value, fallback) {
        return normalizeListValue(value, fallback, null, { maxItems: 16, maxLength: 32 })
            .map(tag => tag.toLowerCase().replace(/[<>"'`\\]/g, ''))
            .filter(Boolean);
    }

    function normalizeInstallTemplates(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
        const allowedPlatformIds = new Set(wizardPlatforms.map(platform => platform.id));
        const allowedModeIds = new Set([...wizardModes.map(mode => mode.id), 'default']);
        const entries = Object.entries(value)
            .filter(([key]) => allowedPlatformIds.has(key))
            .map(([key, body]) => {
                if (typeof body === 'string') return [key, { default: clipText(body, 5000) }];
                if (!body || typeof body !== 'object' || Array.isArray(body)) return [key, null];
                const modeEntries = Object.entries(body)
                    .filter(([modeKey]) => allowedModeIds.has(modeKey))
                    .map(([modeKey, modeBody]) => [modeKey, clipText(modeBody, 5000)])
                    .filter(([, modeBody]) => modeBody);
                return [key, modeEntries.length ? Object.fromEntries(modeEntries) : null];
            })
            .filter(([, body]) => body);
        return entries.length ? Object.fromEntries(entries) : undefined;
    }

    function normalizeResource(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const item = {
            platforms: ['Generic MCP'],
            permissions: ['network'],
            installModes: ['directory'],
            authRequired: 'depends',
            maintenance: source.source === 'Official' ? 'official' : 'community',
            trustScore: source.source === 'Official' ? 85 : 65,
            lastChecked: '2026-05-27',
            ...source
        };
        const name = clipText(item.name, 120);
        const url = sanitizeExternalUrl(item.url || item.docs);
        const docs = sanitizeExternalUrl(item.docs) || url;
        if (!name || !url) return null;

        const id = normalizeResourceId(item.id, name) || createCustomId(name);
        const type = normalizeChoice(item.type, allowedResourceTypes, 'MCP Directory');
        const sourceLabel = normalizeChoice(item.source, allowedSources, 'Community');
        const category = normalizeCategory(item.category);
        const categories = normalizeListValue(item.categories, [], categoryTabs.map(tab => tab.id), { maxItems: 6, maxLength: 24 });
        if (category && !categories.includes(category)) categories.unshift(category);

        return {
            id,
            name,
            type,
            category,
            categories,
            source: sourceLabel,
            risk: normalizeChoice(item.risk, allowedRisks, 'Medium'),
            recommend: clipText(item.recommend, 120, sourceLabel === 'Official' ? 'Official first' : '本地补充资源'),
            tags: normalizeTags(item.tags, ['custom']),
            scenario: clipText(item.scenario, 600, '本地手动添加的 Skill / MCP 候选资源。'),
            url,
            docs,
            template: clipText(item.template, 5000, '先打开文档确认接入方式，再补充 MCP JSON 或 Skill 文件结构。'),
            platforms: normalizeListValue(item.platforms, ['Generic MCP'], null, { maxItems: 12, maxLength: 40 }),
            permissions: normalizeListValue(item.permissions, ['network'], allowedPermissions, { maxItems: 12, maxLength: 40 }),
            installModes: normalizeListValue(item.installModes, ['directory'], allowedInstallModes, { maxItems: 12, maxLength: 40 }),
            authRequired: normalizeAuthRequired(item.authRequired),
            maintenance: normalizeChoice(item.maintenance, allowedMaintenance, sourceLabel === 'Official' ? 'official' : 'community'),
            trustScore: clampScore(item.trustScore),
            lastChecked: clipText(item.lastChecked, 32, 'unknown'),
            custom: Boolean(item.custom),
            installTemplates: normalizeInstallTemplates(item.installTemplates)
        };
    }

    function normalizeResources(list) {
        return (Array.isArray(list) ? list : []).map(normalizeResource).filter(Boolean);
    }

    const builtInResources = normalizeResources(window.MCPSKILLLAB_RESOURCES || fallbackResources);
    let resources;
    let activeCategory = 'mcp';
    let activeRisk = 'all';
    let activePermission = 'all';
    let activePlatform = 'all';
    let activeInstallMode = 'all';
    let sortMode = 'trust';
    let activeResourceId = 'official-mcp-registry';
    let activeDialog = '';
    let query = '';
    let wizardResourceId = '';
    let wizardPlatform = 'generic';
    let wizardMode = 'local';

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
  display: grid;
  grid-template-columns: minmax(240px, 1fr) repeat(5, minmax(132px, auto));
  gap: 1rem;
  align-items: center;
  margin: 1rem auto 0.8rem;
}

.mcpskilllab-toolbar select {
  min-width: 132px;
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

.mcpskilllab-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
  margin: 0.8rem 0 1.2rem;
}

.mcpskilllab-filter-row .back-btn {
  margin: 0;
  min-height: 34px;
  padding: 0.45rem 0.8rem;
  font-size: 0.82rem;
}

.mcpskilllab-filter-row .back-btn.active {
  border-color: rgba(255, 218, 89, 0.78);
  color: #ffda59;
  box-shadow: 0 0 16px rgba(255, 218, 89, 0.18);
}

.mcpskilllab-category-count {
  margin-left: 0.42rem;
  color: rgba(236, 240, 241, 0.68);
  font-size: 0.72rem;
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
  grid-template-columns: minmax(260px, 0.85fr) minmax(360px, 1.25fr) minmax(260px, 0.9fr);
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

.mcpskilllab-template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.mcpskilllab-section-title {
  margin: 1.5rem 0 0.8rem;
  color: rgba(236, 240, 241, 0.92);
  font-size: 1rem;
  font-weight: 900;
}

.mcpskilllab-template-card .result {
  min-height: 150px;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.78rem;
  overflow: auto;
}

.mcpskilllab-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: rgba(236, 240, 241, 0.74);
}

@media (max-width: 760px) {
  .mcpskilllab-toolbar {
    grid-template-columns: 1fr;
  }

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
    justify-content: stretch;
    flex-direction: column;
  }

  .mcpskilllab-lab-btn {
    width: 100%;
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

    function normalizeBacklogMeta(value) {
        const raw = value && typeof value === 'object' ? value : {};
        const status = backlogStatuses.some(item => item.id === raw.status) ? raw.status : 'review';
        return {
            status,
            note: String(raw.note || '').slice(0, 2000)
        };
    }

    function getBacklogMeta() {
        const saved = readJson(BACKLOG_META_KEY, {});
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
        return Object.fromEntries(Object.entries(saved)
            .map(([id, value]) => [normalizeResourceId(id), normalizeBacklogMeta(value)])
            .filter(([id]) => id));
    }

    function saveBacklogMeta(meta) {
        const source = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
        const cleaned = Object.fromEntries(Object.entries(source)
            .map(([id, value]) => [normalizeResourceId(id), normalizeBacklogMeta(value)])
            .filter(([id]) => id));
        writeJson(BACKLOG_META_KEY, cleaned);
    }

    function updateBacklogMeta(id, updates) {
        const normalizedId = normalizeResourceId(id);
        if (!normalizedId) return;
        const meta = getBacklogMeta();
        meta[normalizedId] = normalizeBacklogMeta({ ...(meta[normalizedId] || {}), ...(updates || {}) });
        saveBacklogMeta(meta);
    }

    function getBacklogStatusLabel(status) {
        const found = backlogStatuses.find(item => item.id === status);
        return found ? found.label : backlogStatuses[0].label;
    }

    function parseListValue(value, fallback) {
        return normalizeListValue(value, fallback, null, { maxItems: 16, maxLength: 80 });
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
        const docs = sanitizeExternalUrl(value.docs) || url;
        if (!name || !url) return null;
        return normalizeResources([{
            id: normalizeResourceId(value.id) || createCustomId(name),
            name,
            type: normalizeChoice(value.type, allowedResourceTypes, 'MCP Directory'),
            category: normalizeCategory(value.category) || '',
            categories: Array.isArray(value.categories) ? value.categories.map(normalizeCategory).filter(Boolean) : undefined,
            source: 'Community',
            risk: normalizeChoice(value.risk, allowedRisks, 'Medium'),
            recommend: clipText(value.recommend, 120, '本地补充资源'),
            tags: Array.from(new Set([...normalizeTags(value.tags, ['custom']), 'custom'])),
            scenario: clipText(value.scenario, 600, '本地手动添加的 Skill / MCP 候选资源。'),
            url,
            docs,
            template: clipText(value.template, 5000, '先打开文档确认接入方式，再补充 MCP JSON 或 Skill 文件结构。'),
            platforms: parseListValue(value.platforms, ['Generic MCP']),
            permissions: parseListValue(value.permissions, ['network']),
            installModes: parseListValue(value.installModes, ['directory']),
            authRequired: value.authRequired === undefined ? 'depends' : value.authRequired,
            maintenance: normalizeChoice(value.maintenance, allowedMaintenance, 'unknown'),
            trustScore: clampScore(value.trustScore || 50),
            lastChecked: clipText(value.lastChecked, 32, new Date().toISOString().slice(0, 10)),
            custom: true
        }])[0];
    }

    function getCustomResources() {
        const saved = readJson(CUSTOM_RESOURCES_KEY, []);
        if (!Array.isArray(saved)) return [];
        return saved.map(normalizeCustomResource).filter(Boolean);
    }

    function mergeCustomResourceLists(current, incoming) {
        const map = new Map();
        [...current, ...incoming].forEach(item => {
            const normalized = normalizeCustomResource(item);
            if (normalized) map.set(normalized.id, normalized);
        });
        return Array.from(map.values());
    }

    function saveCustomResources(list) {
        writeJson(CUSTOM_RESOURCES_KEY, (Array.isArray(list) ? list : [])
            .map(normalizeCustomResource)
            .filter(Boolean)
            .slice(0, MAX_CUSTOM_RESOURCES));
    }

    function mergeResources() {
        const map = new Map();
        [...builtInResources, ...getCustomResources()].forEach(item => {
            if (item && item.id) map.set(item.id, item);
        });
        return Array.from(map.values());
    }

    function createResourceFromForm(form) {
        const data = new FormData(form);
        return normalizeCustomResource({
            name: data.get('resourceName'),
            url: data.get('resourceUrl'),
            docs: data.get('resourceDocs'),
            type: data.get('resourceType'),
            category: data.get('resourceCategory'),
            risk: data.get('resourceRisk'),
            tags: parseListValue(data.get('resourceTags'), ['custom']),
            platforms: parseListValue(data.get('resourcePlatforms'), ['Generic MCP']),
            permissions: parseListValue(data.get('resourcePermissions'), ['network']),
            installModes: parseListValue(data.get('resourceInstallModes'), ['directory']),
            scenario: data.get('resourceScenario'),
            template: data.get('resourceTemplate'),
            authRequired: data.get('resourceAuth') || 'depends',
            maintenance: 'unknown',
            trustScore: 50,
            lastChecked: new Date().toISOString().slice(0, 10)
        });
    }

    function exportHubData() {
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            favorites: Array.from(getFavorites()),
            backlogMeta: getBacklogMeta(),
            customResources: getCustomResources()
        };
        downloadText(`mcpskilllab-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
    }

    function importHubData(text) {
        if (String(text || '').length > MAX_IMPORT_BYTES) {
            throw new Error('JSON 文件过大');
        }
        const payload = JSON.parse(text);
        if (!payload || typeof payload !== 'object') {
            throw new Error('JSON 格式不正确');
        }

        if (Array.isArray(payload.customResources)) {
            saveCustomResources(mergeCustomResourceLists(getCustomResources(), payload.customResources.slice(0, MAX_CUSTOM_RESOURCES)));
        }

        if (Array.isArray(payload.favorites)) {
            const favorites = getFavorites();
            payload.favorites
                .slice(0, MAX_FAVORITES)
                .map(id => normalizeResourceId(id))
                .filter(Boolean)
                .forEach(id => favorites.add(id));
            saveFavorites(favorites);
        }

        if (payload.backlogMeta && typeof payload.backlogMeta === 'object' && !Array.isArray(payload.backlogMeta)) {
            const meta = getBacklogMeta();
            Object.entries(payload.backlogMeta).forEach(([id, value]) => {
                const normalizedId = normalizeResourceId(id);
                if (normalizedId) meta[normalizedId] = normalizeBacklogMeta(value);
            });
            saveBacklogMeta(meta);
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
        const meta = getBacklogMeta();
        delete meta[normalizedId];
        saveBacklogMeta(meta);
    }

    function getWizardAvailableModes(resource) {
        const modes = resource.installModes || [];
        return wizardModes.filter(mode => {
            if (mode.id === 'local') return modes.some(m => ['local', 'cli', 'registry', 'directory', 'sourceReview', 'documentation', 'riskReview'].includes(m));
            if (mode.id === 'remote') return modes.some(m => ['remote', 'registry', 'marketplace'].includes(m));
            if (mode.id === 'docker') return modes.some(m => ['docker', 'local'].includes(m));
            return false;
        });
    }

    function getResourceInstallTemplate(resource, platformId, modeId) {
        const templates = resource.installTemplates || {};
        const platformTemplates = templates[platformId] || templates.generic;
        if (!platformTemplates || typeof platformTemplates !== 'object') return '';
        return platformTemplates[modeId] || platformTemplates.default || '';
    }

    function generateWizardConfig(resource, platformId, modeId) {
        const platform = wizardPlatforms.find(p => p.id === platformId) || wizardPlatforms[4];
        const mode = wizardModes.find(m => m.id === modeId) || wizardModes[0];
        const safeName = String(resource.name || 'tool').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'tool';
        const warnings = [];
        const steps = [];
        let config = '';

        // Permission warnings
        const perms = resource.permissions || [];
        if (perms.includes('shell')) warnings.push('⚠️ 此资源可能执行命令行指令，请确认来源可信');
        if (perms.includes('filesWrite')) warnings.push('⚠️ 此资源可能写入文件，请限制工作目录');
        if (perms.includes('browser')) warnings.push('⚠️ 此资源可能控制浏览器，请用测试账号');
        if (perms.includes('database')) warnings.push('⚠️ 此资源可能访问数据库，使用只读权限测试');
        if (perms.includes('docker')) warnings.push('ℹ️ Docker 运行时注意网络和卷挂载权限');
        if (resource.authRequired === 'true' || perms.includes('apiKey')) warnings.push('🔑 需要 API Key，放在环境变量中，不要写进代码');

        // ChatGPT special warning
        if (platformId === 'chatgpt' && modeId === 'local') {
            warnings.unshift('❌ ChatGPT 不支持本地 MCP Server。请改用“远程 MCP”模式，或用 ngrok/cloudflared 将本地 Server 暴露。');
        }

        // Generate config by platform + mode
        if (platform.format === 'folder') {
            // Codex skill folder structure
            config = `# Codex Skill 目录结构\n# 在项目根目录创建：\n\n${platform.configPath}${safeName}/\n  SKILL.md\n  scripts/\n  references/`;
            steps.push(`1. 在项目根目录创建 ${platform.configPath}${safeName}/ 文件夹`);
            steps.push('2. 编写 SKILL.md 描述何时使用、工作流、限制条件');
            steps.push('3. 将脚本和参考文件放入 scripts/ 和 references/');
            steps.push(`4. 访问 ${resource.url} 获取完整示例`);
        } else if (platformId === 'chatgpt') {
            // ChatGPT remote only
            config = `# ChatGPT Developer Mode MCP 配置\n# 进入 ChatGPT → Settings → Developer Mode\n# 添加 MCP App，填入远程服务 URL\n\n远程服务地址: https://your-mcp-server.example.com\n工具授权: 按需确认`;
            steps.push('1. 在 ChatGPT 中启用 Developer Mode');
            steps.push('2. 添加新 MCP App，输入远程服务地址');
            steps.push(`3. 访问 ${resource.url} 查看部署指南`);
            steps.push('4. 确认工具授权后开始使用');
        } else if (modeId === 'docker') {
            // Docker mode
            const dockerConfig = JSON.stringify({
                mcpServers: {
                    [safeName]: {
                        command: 'docker',
                        args: ['run', '--rm', '-i', `mcp/${safeName}:latest`],
                        env: { API_KEY: 'your-key-here' }
                    }
                }
            }, null, 2);
            config = `# ${platform.label} Docker MCP 配置\n# 配置文件: ${platform.configPath}\n\n${dockerConfig}`;
            steps.push(`1. 确认本机已安装 Docker`);
            steps.push(`2. 拉取镜像: docker pull mcp/${safeName}:latest`);
            steps.push(`3. 将以上 JSON 写入 ${platform.configPath}`);
            steps.push(`4. 访问 ${resource.url} 确认实际镜像名和参数`);
        } else if (modeId === 'remote') {
            // Remote MCP
            const remoteConfig = JSON.stringify({
                mcpServers: {
                    [safeName]: {
                        url: 'https://your-mcp-server.example.com',
                        transport: 'sse'
                    }
                }
            }, null, 2);
            config = `# ${platform.label} 远程 MCP 配置\n# 配置文件: ${platform.configPath}\n\n${remoteConfig}`;
            steps.push(`1. 获取远程 MCP Server 的 URL`);
            steps.push(`2. 将以上 JSON 写入 ${platform.configPath}`);
            steps.push('3. 将 url 替换为实际服务地址');
            steps.push(`4. 访问 ${resource.url} 查看远程部署方式`);
        } else {
            // Local install (default JSON format)
            const localConfig = JSON.stringify({
                mcpServers: {
                    [safeName]: {
                        command: 'npx',
                        args: ['-y', `@mcp/${safeName}`],
                        env: { API_KEY: 'your-key-here' }
                    }
                }
            }, null, 2);
            config = `# ${platform.label} 本地 MCP 配置\n# 配置文件: ${platform.configPath}\n\n${localConfig}`;
            steps.push(`1. 将以上 JSON 写入 ${platform.configPath}`);
            steps.push(`2. 将包名替换为实际的 npm 包`);
            steps.push('3. 将 API_KEY 设为真实值（如不需要可删除 env 字段）');
            steps.push(`4. 访问 ${resource.url} 确认安装命令`);
        }

        const specificTemplate = getResourceInstallTemplate(resource, platformId, modeId);
        if (specificTemplate) {
            config = specificTemplate;
            steps.unshift(`0. 当前配置使用 ${resource.name} 的资源专属模板`);
        }

        return { config, steps, warnings };
    }

    function renderWizardBody(resource) {
        const availableModes = getWizardAvailableModes(resource);
        const effectiveMode = availableModes.find(m => m.id === wizardMode) ? wizardMode : (availableModes[0] ? availableModes[0].id : 'local');
        wizardMode = effectiveMode;
        const result = generateWizardConfig(resource, wizardPlatform, wizardMode);
        const currentPlatform = wizardPlatforms.find(p => p.id === wizardPlatform) || wizardPlatforms[4];
        const currentMode = wizardModes.find(m => m.id === wizardMode) || wizardModes[0];

        return `
            <div class="mcpskilllab-wizard">
                <div class="mcpskilllab-wizard-resource">
                    <span class="mcpskilllab-chip ${resource.source === 'Official' ? 'official' : ''}">${escapeHtml(localize('source', resource.source))}</span>
                    <span class="mcpskilllab-chip ${resource.risk.toLowerCase()}">风险：${escapeHtml(localize('risk', resource.risk))}</span>
                </div>

                <div class="mcpskilllab-wizard-step">
                    <div class="mcpskilllab-wizard-step-label">STEP 1 — 选择平台</div>
                    <div class="mcpskilllab-wizard-options">
                        ${wizardPlatforms.map(p => `
                            <button class="mcpskilllab-wizard-opt ${wizardPlatform === p.id ? 'active' : ''}" type="button" data-wizard-platform="${escapeHtml(p.id)}">
                                <strong>${escapeHtml(p.label)}</strong>
                                <small>${escapeHtml(p.configPath)}</small>
                            </button>
                        `).join('')}
                    </div>
                    <div class="mcpskilllab-wizard-hint">${escapeHtml(currentPlatform.hint)}</div>
                </div>

                <div class="mcpskilllab-wizard-step">
                    <div class="mcpskilllab-wizard-step-label">STEP 2 — 选择运行模式</div>
                    <div class="mcpskilllab-wizard-options">
                        ${wizardModes.map(m => {
                            const available = availableModes.some(am => am.id === m.id);
                            return `
                                <button class="mcpskilllab-wizard-opt ${wizardMode === m.id ? 'active' : ''} ${!available ? 'disabled' : ''}" type="button" data-wizard-mode="${escapeHtml(m.id)}" ${!available ? 'disabled' : ''}>
                                    <strong>${escapeHtml(m.icon)} ${escapeHtml(m.label)}</strong>
                                    <small>${escapeHtml(m.hint)}</small>
                                </button>
                            `;
                        }).join('')}
                    </div>
                    <div class="mcpskilllab-wizard-hint">${escapeHtml(currentMode.hint)}</div>
                </div>

                <div class="mcpskilllab-wizard-step">
                    <div class="mcpskilllab-wizard-step-label">STEP 3 — 生成配置</div>
                    ${result.warnings.length ? `<div class="mcpskilllab-wizard-warnings">${result.warnings.map(w => `<div class="mcpskilllab-wizard-warning">${escapeHtml(w)}</div>`).join('')}</div>` : ''}
                    <div class="result mcpskilllab-wizard-config">${escapeHtml(result.config)}</div>
                    <div class="mcpskilllab-wizard-steps-list">
                        ${result.steps.map(s => `<div>${escapeHtml(s)}</div>`).join('')}
                    </div>
                    <div class="mcpskilllab-inline-actions">
                        <button class="cyber-button mcpskilllab-copy" type="button" data-copy="${escapeHtml(result.config)}"><span class="cyber-button__tag">复制配置</span></button>
                        <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(resource.url)}"><span class="cyber-button__tag">打开官网</span></button>
                        <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(resource.docs)}"><span class="cyber-button__tag">打开文档</span></button>
                    </div>
                </div>
            </div>
        `;
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
            mcp: 'mcp',
            mcptools: 'mcp',
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
            item.category,
            item.primaryCategory
        ];
        return Array.from(new Set(values.map(normalizeCategory).filter(Boolean)));
    }

    function getResourceCategory(item) {
        const explicit = getExplicitCategories(item);
        if (explicit.length) return explicit[0];

        const type = String(item.type || '').toLowerCase();
        const tags = (item.tags || []).map(tag => String(tag).toLowerCase());
        const text = [
            item.name,
            item.type,
            item.recommend,
            item.scenario,
            item.template,
            tags.join(' ')
        ].join(' ').toLowerCase();

        if (type.includes('mcp') || (tags.includes('mcp') && !type.includes('skill') && !type.includes('plugin'))) return 'mcp';
        if (type.includes('skill registry') || type.includes('skill standard')) return 'skill';
        if (tags.includes('prompt') || hasAnyKeyword(text, ['prompt', 'prompts', '提示词'])) return 'prompt';
        if (tags.includes('workflow') || hasAnyKeyword(text, ['workflow', 'workflows', '工作流', '编排'])) return 'workflow';
        if (hasAnyKeyword(text, ['security', 'safety', 'risk', 'audit', '权限', '风险', '安全', '审计'])) return 'security';
        if (hasAnyKeyword(text, ['automation', 'browser', 'office', '自动化', '浏览器'])) return 'automation';
        if (hasAnyKeyword(text, ['database', 'api', 'connector', 'data', '数据库', '数据源', '连接器'])) return 'dataApis';
        if (type.includes('skill') || type.includes('plugin') || tags.includes('skill')) return 'skill';
        if (hasAnyKeyword(text, ['github', 'vscode', 'cursor', 'cli', 'debug', 'developer', '开发', '调试'])) return 'devTools';
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

    function getTrustBreakdown(item) {
        const permissions = new Set(item.permissions || []);
        const installModes = new Set(item.installModes || []);

        const sourceScore = item.source === 'Official' ? 20 : 12;
        const sourceHint = item.source === 'Official' ? '官方来源，默认可信度较高。' : '社区来源，需要额外看仓库、维护和权限。';

        const maintenanceScore = item.maintenance === 'official' ? 15 : item.maintenance === 'community' ? 10 : 5;
        const maintenanceHint = {
            official: '官方维护。',
            community: '社区维护，需看活跃度。',
            unknown: '维护状态未知。'
        }[item.maintenance] || '维护状态未知。';

        const hasSeparateDocs = item.docs && item.docs !== item.url;
        const hasTemplate = String(item.template || '').length > 80;
        const docScore = Math.min(15, 7 + (hasSeparateDocs ? 4 : 0) + (hasTemplate ? 4 : 0));
        const docHint = hasSeparateDocs
            ? '有独立文档链接和配置片段。'
            : '文档入口与官网相同，接入前应再确认 README。';

        const permissionPenalties = {
            filesWrite: 8,
            shell: 8,
            database: 6,
            browser: 6,
            installScript: 5,
            docker: 4,
            apiKey: 3,
            remote: 3,
            filesRead: 2,
            scripts: 2,
            network: 1
        };
        const permissionPenalty = Array.from(permissions).reduce((sum, value) => sum + (permissionPenalties[value] || 0), 0);
        const permissionScore = Math.max(4, 25 - permissionPenalty);
        const highRiskPermissions = ['filesWrite', 'shell', 'database', 'browser', 'installScript']
            .filter(value => permissions.has(value))
            .map(value => localize('permission', value));
        const permissionHint = highRiskPermissions.length
            ? `高权限：${highRiskPermissions.join(' / ')}。`
            : '权限范围较轻，主要是只读或网络访问。';

        const installPenalties = {
            docker: 4,
            cli: 3,
            local: 2,
            remote: 2,
            marketplace: 2,
            registry: 1,
            sourceReview: 1,
            riskReview: 1,
            inspector: 1
        };
        const installPenalty = Array.from(installModes).reduce((sum, value) => sum + (installPenalties[value] || 0), 0);
        const installScore = Math.max(5, 15 - installPenalty);
        const installHint = installModes.has('sourceReview') || installModes.has('riskReview')
            ? '包含源码或风险审查路径。'
            : '接入方式越接近本地执行，越需要手工确认命令。';

        const authScore = item.authRequired === 'false' ? 10 : item.authRequired === 'true' ? 4 : 7;
        const authHint = item.authRequired === 'true'
            ? '需要密钥，必须使用环境变量或本地忽略文件。'
            : item.authRequired === 'false'
                ? '不强制密钥。'
                : '是否需要密钥取决于具体资源。';

        const components = [
            { id: 'source', label: '来源', score: sourceScore, max: 20, hint: sourceHint },
            { id: 'maintenance', label: '维护', score: maintenanceScore, max: 15, hint: maintenanceHint },
            { id: 'docs', label: '文档', score: docScore, max: 15, hint: docHint },
            { id: 'permissions', label: '权限', score: permissionScore, max: 25, hint: permissionHint },
            { id: 'install', label: '接入', score: installScore, max: 15, hint: installHint },
            { id: 'auth', label: '密钥', score: authScore, max: 10, hint: authHint }
        ];
        const baseTotal = Math.round(components.reduce((sum, item) => sum + item.score, 0));
        const total = Math.max(0, Math.min(100, baseTotal));
        const level = total >= 85 ? 'high' : total >= 70 ? 'medium' : 'low';
        return {
            total,
            baseTotal,
            level,
            components
        };
    }

    function getTrustScore(item) {
        return getTrustBreakdown(item).total;
    }

    function renderSortOptions() {
        return sortOptions
            .map(item => `<option value="${escapeHtml(item.id)}"${sortMode === item.id ? ' selected' : ''}>${escapeHtml(item.label)}</option>`)
            .join('');
    }

    function sortResources(list) {
        return [...list].sort((a, b) => {
            if (sortMode === 'name') {
                return String(a.name).localeCompare(String(b.name));
            }
            if (sortMode === 'recent') {
                return String(b.lastChecked || '').localeCompare(String(a.lastChecked || '')) || String(a.name).localeCompare(String(b.name));
            }
            return getTrustScore(b) - getTrustScore(a) || String(a.name).localeCompare(String(b.name));
        });
    }

    function getUniqueValues(field) {
        const scoped = getCategoryResources(activeCategory);
        const source = scoped.length ? scoped : resources;
        return Array.from(new Set(source.flatMap(item => item[field] || []))).sort((a, b) => String(a).localeCompare(String(b)));
    }

    function renderOptions(values, current, group, allLabel) {
        return [
            `<option value="all"${current === 'all' ? ' selected' : ''}>${allLabel}</option>`,
            ...values.map(value => `<option value="${escapeHtml(value)}"${current === value ? ' selected' : ''}>${escapeHtml(localize(group, value))}</option>`)
        ].join('');
    }

    function renderChipList(values, group) {
        return (values || []).map(value => `<span class="mcpskilllab-chip">${escapeHtml(localize(group, value))}</span>`).join('');
    }

    function renderStructuredInfo(item) {
        return `
            <div class="mcpskilllab-structured-row">
                <div>
                    <div class="mcpskilllab-structured-label">适配平台</div>
                    <div class="mcpskilllab-tags">${renderChipList(item.platforms, 'platform')}</div>
                </div>
                <div>
                    <div class="mcpskilllab-structured-label">权限范围</div>
                    <div class="mcpskilllab-tags">${renderChipList(item.permissions, 'permission')}</div>
                </div>
                <div>
                    <div class="mcpskilllab-structured-label">接入方式</div>
                    <div class="mcpskilllab-tags">${renderChipList(item.installModes, 'installMode')}</div>
                </div>
                <div class="mcpskilllab-meta">
                    <span class="mcpskilllab-chip">密钥：${escapeHtml(localize('auth', item.authRequired))}</span>
                    <span class="mcpskilllab-chip">${escapeHtml(localize('maintenance', item.maintenance))}</span>
                    <span class="mcpskilllab-chip">检查：${escapeHtml(item.lastChecked)}</span>
                </div>
            </div>
        `;
    }

    function getFilteredResources() {
        const normalizedQuery = query.trim().toLowerCase();
        return sortResources(resources.filter(item => {
            const categoryMatch = isResourceInCategory(item, activeCategory);
            const riskMatch = activeRisk === 'all' || item.risk.toLowerCase() === activeRisk;
            const permissionMatch = activePermission === 'all' || item.permissions.includes(activePermission);
            const platformMatch = activePlatform === 'all' || item.platforms.includes(activePlatform);
            const installModeMatch = activeInstallMode === 'all' || item.installModes.includes(activeInstallMode);
            const text = [
                item.name,
                item.type,
                item.source,
                item.risk,
                item.recommend,
                item.scenario,
                item.platforms.join(' '),
                item.permissions.join(' '),
                item.installModes.join(' '),
                item.maintenance,
                item.tags.join(' ')
            ].join(' ').toLowerCase();
            return categoryMatch && riskMatch && permissionMatch && platformMatch && installModeMatch && (!normalizedQuery || text.includes(normalizedQuery));
        }));
    }

    function getResourceById(id) {
        const normalizedId = normalizeResourceId(id);
        return resources.find(item => item.id === normalizedId) || null;
    }

    function renderIntro() {
        return `
            <div class="mcpskilllab-intro">
                <div class="card">
                    <div class="badge">这个页面做什么</div>
                    <div class="mcpskilllab-intro-title">Skill / MCP 实验室</div>
                    <div class="mcpskilllab-intro-text">
                        这里是 Agent 能力生态的索引台。你可以查找 MCP Server、Skill 仓库、插件市场和官方接入文档；
                        先收藏准备接入的资源，再查看配置模板和安全检查清单，最后再决定是否真正安装或接入。
                    </div>
                </div>
                <div class="card">
                    <div class="badge">建议流程</div>
                    <div class="mcpskilllab-flow">
                        <div>1. 先用搜索和分类找到候选资源</div>
                        <div>2. 点“详情”查看用途、风险和配置片段</div>
                        <div>3. 加入“待接入”，按安全清单逐项审查</div>
                        <div>4. 复制模板，后续再接入真实运行环境</div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTopActions() {
        return `
            <div class="mcpskilllab-top-actions">
                <button class="mcpskilllab-lab-btn mcpskilllab-modal-open" type="button" data-dialog="add">添加技能</button>
                <button class="mcpskilllab-lab-btn mcpskilllab-modal-open" type="button" data-dialog="templates">配置模板</button>
            </div>
        `;
    }

    function renderCategoryTabs() {
        const counts = getCategoryCounts();
        const visibleTabs = categoryTabs.filter(tab => (counts[tab.id] || 0) > 0 || activeCategory === tab.id);
        return visibleTabs.map(tab => `
            <button class="btn back-btn mcpskilllab-filter ${activeCategory === tab.id ? 'active' : ''}" type="button" data-category="${escapeHtml(tab.id)}">
                ${escapeHtml(tab.label)}<span class="mcpskilllab-category-count">${escapeHtml(counts[tab.id] || 0)}</span>
            </button>
        `).join('');
    }

    function renderCategoryContext(filtered) {
        const category = getCategoryMeta(activeCategory);
        const counts = getCategoryCounts();
        const hiddenEmptyCount = categoryTabs.filter(tab => !counts[tab.id] && activeCategory !== tab.id).length;
        return `
            <div class="mcpskilllab-category-context">
                <div>
                    <div class="mcpskilllab-category-title">${escapeHtml(category.label)}</div>
                    <div class="mcpskilllab-category-hint">${escapeHtml(category.hint)}</div>
                </div>
                <div class="mcpskilllab-meta">
                    <span class="mcpskilllab-chip">当前结果：${escapeHtml(filtered.length)}</span>
                    <span class="mcpskilllab-chip">分类资源：${escapeHtml(getCategoryResources(activeCategory).length)}</span>
                    ${hiddenEmptyCount ? `<span class="mcpskilllab-chip">已隐藏空分类：${escapeHtml(hiddenEmptyCount)}</span>` : ''}
                </div>
            </div>
        `;
    }

    function renderOverview(favorites, filtered) {
        const mcpCount = resources.filter(item => item.tags.includes('mcp')).length;
        const skillCount = resources.filter(item => item.tags.includes('skill')).length;
        const officialCount = resources.filter(item => item.source === 'Official').length;
        return `
            <div class="mcpskilllab-overview-grid">
                <div class="mcpskilllab-stat">
                    <div class="mcpskilllab-stat-value">${resources.length}</div>
                    <div class="mcpskilllab-stat-label">资源总数</div>
                </div>
                <div class="mcpskilllab-stat">
                    <div class="mcpskilllab-stat-value">${mcpCount}</div>
                    <div class="mcpskilllab-stat-label">MCP 入口</div>
                </div>
                <div class="mcpskilllab-stat">
                    <div class="mcpskilllab-stat-value">${skillCount}</div>
                    <div class="mcpskilllab-stat-label">Skill 入口</div>
                </div>
                <div class="mcpskilllab-stat">
                    <div class="mcpskilllab-stat-value">${officialCount}</div>
                    <div class="mcpskilllab-stat-label">官方来源</div>
                </div>
                <div class="mcpskilllab-stat">
                    <div class="mcpskilllab-stat-value">${filtered.length}</div>
                    <div class="mcpskilllab-stat-label">当前结果</div>
                </div>
                <div class="mcpskilllab-stat">
                    <div class="mcpskilllab-stat-value">${favorites.size}</div>
                    <div class="mcpskilllab-stat-label">待接入收藏</div>
                </div>
            </div>
        `;
    }

    function renderResourceDetail(item, isFavorite) {
        if (!item) {
            const category = getCategoryMeta(activeCategory);
            return `
                <div class="card mcpskilllab-detail-card">
                    <div class="badge">当前详情</div>
                    <div class="mcpskilllab-detail-title">${escapeHtml(category.label)}</div>
                    <div class="mcpskilllab-desc">这个分类下暂时没有匹配资源。可以切换筛选条件，或在“本地 Hub”里手动添加。</div>
                </div>
            `;
        }
        return `
            <div class="card mcpskilllab-detail-card">
                <div class="badge">当前详情</div>
                <div class="mcpskilllab-detail-title">${escapeHtml(item.name)}</div>
                <div class="mcpskilllab-meta">
                    <span class="mcpskilllab-chip ${item.source === 'Official' ? 'official' : ''}">${escapeHtml(localize('source', item.source))}</span>
                    <span class="mcpskilllab-chip ${item.risk.toLowerCase()}">风险：${escapeHtml(localize('risk', item.risk))}</span>
                    <span class="mcpskilllab-chip">${escapeHtml(localize('type', item.type))}</span>
                    <span class="mcpskilllab-chip">${escapeHtml(localize('recommend', item.recommend))}</span>
                </div>
                <div class="mcpskilllab-desc">${escapeHtml(localize('scenario', item.scenario))}</div>
                ${renderStructuredInfo(item)}
                <div class="result">${escapeHtml(item.template)}</div>
                <div class="mcpskilllab-actions">
                    <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(item.url)}"><span class="cyber-button__tag">官网</span></button>
                    <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(item.docs)}"><span class="cyber-button__tag">文档</span></button>
                    <button class="cyber-button mcpskilllab-copy" type="button" data-copy="${escapeHtml(item.template)}"><span class="cyber-button__tag">复制配置</span></button>
                    <button class="cyber-button mcpskilllab-favorite" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">${isFavorite ? '已收藏' : '加入待接入'}</span></button>
                    <button class="cyber-button mcpskilllab-wizard-open" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">安装向导</span></button>
                </div>
            </div>
        `;
    }

    function renderAuditPanel() {
        return `
            <div class="card mcpskilllab-audit-card">
                <div class="badge">安全审计</div>
                <div class="mcpskilllab-detail-title">接入前检查</div>
                <div class="mcpskilllab-audit-list">
                    ${auditItems.map(item => `<div>${escapeHtml(item)}</div>`).join('')}
                </div>
            </div>
        `;
    }

    function renderStatusOptions(current) {
        return backlogStatuses
            .map(item => `<option value="${escapeHtml(item.id)}"${current === item.id ? ' selected' : ''}>${escapeHtml(item.label)}</option>`)
            .join('');
    }

    function renderBacklog(favorites) {
        const favoriteItems = resources.filter(item => favorites.has(item.id));
        const backlogMeta = getBacklogMeta();
        return `
            <div class="card mcpskilllab-backlog-card">
                <div class="badge">待接入</div>
                <div class="mcpskilllab-detail-title">待接入收藏</div>
                <div class="mcpskilllab-backlog-list">
                    ${favoriteItems.length
                        ? favoriteItems.map(item => {
                            const meta = normalizeBacklogMeta(backlogMeta[item.id]);
                            return `
                            <div class="mcpskilllab-backlog-item">
                                <div class="mcpskilllab-backlog-main">
                                    <div class="mcpskilllab-backlog-title">${escapeHtml(item.name)}</div>
                                    <span class="mcpskilllab-chip status-${escapeHtml(meta.status)}">${escapeHtml(getBacklogStatusLabel(meta.status))}</span>
                                </div>
                                <select class="mcpskilllab-backlog-status" data-id="${escapeHtml(item.id)}">
                                    ${renderStatusOptions(meta.status)}
                                </select>
                                <textarea class="mcpskilllab-backlog-note" data-id="${escapeHtml(item.id)}" placeholder="备注：接入目的、权限风险、密钥来源、测试账号...">${escapeHtml(meta.note)}</textarea>
                                <div class="mcpskilllab-backlog-actions">
                                    <button class="cyber-button mcpskilllab-select" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">查看</span></button>
                                    <button class="cyber-button mcpskilllab-favorite" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">移出</span></button>
                                </div>
                            </div>
                        `;
                        }).join('')
                        : '<div class="mcpskilllab-desc">还没有收藏。可以把准备接入的资源加入待接入清单。</div>'}
                </div>
            </div>
        `;
    }

    function renderTypeOptions(current) {
        return allowedResourceTypes
            .map(value => `<option value="${escapeHtml(value)}"${current === value ? ' selected' : ''}>${escapeHtml(localize('type', value))}</option>`)
            .join('');
    }

    function renderCategoryOptions(current) {
        return categoryTabs
            .map(item => `<option value="${escapeHtml(item.id)}"${current === item.id ? ' selected' : ''}>${escapeHtml(item.label)}</option>`)
            .join('');
    }

    function renderCustomResources(customResources) {
        if (!customResources.length) {
            return '<div class="mcpskilllab-desc">还没有手动添加资源。可以把社区里暂时没有收录的入口先放到这里。</div>';
        }
        return customResources.map(item => `
            <div class="mcpskilllab-custom-item">
                <div>
                    <div class="mcpskilllab-custom-title">${escapeHtml(item.name)}</div>
                    <div class="mcpskilllab-meta">
                        <span class="mcpskilllab-chip">${escapeHtml(localize('type', item.type))}</span>
                        <span class="mcpskilllab-chip">${escapeHtml(getCategoryMeta(getResourceCategory(item)).label)}</span>
                    </div>
                </div>
                <div class="mcpskilllab-inline-actions">
                    <button class="cyber-button mcpskilllab-select" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">查看</span></button>
                    <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(item.url)}"><span class="cyber-button__tag">打开</span></button>
                    <button class="cyber-button mcpskilllab-delete-custom" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">删除</span></button>
                </div>
            </div>
        `).join('');
    }

    function renderHubPanel(favorites) {
        const customResources = getCustomResources();
        return `
            <div class="mcpskilllab-hub-grid">
                <div class="card mcpskilllab-hub-card">
                    <div class="badge">本地 Hub</div>
                    <div class="mcpskilllab-detail-title">当前阶段</div>
                    <div class="mcpskilllab-hub-desc">
                        现在已经从“资源索引”推进到“本地接入管理”：可以给收藏资源标状态、写备注、导入导出清单，并补充自己的 Skill / MCP 入口。数据只保存在浏览器本地。
                    </div>
                    <div class="mcpskilllab-roadmap-list">
                        <div class="mcpskilllab-roadmap-item">
                            <span class="mcpskilllab-chip status-connected">已完成</span>
                            <div class="mcpskilllab-hub-desc">目录检索、风险筛选、详情面板、审计清单、配置模板。</div>
                        </div>
                        <div class="mcpskilllab-roadmap-item">
                            <span class="mcpskilllab-chip status-ready">本阶段</span>
                            <div class="mcpskilllab-hub-desc">待接入状态、备注、自定义资源、JSON 导入导出。</div>
                        </div>
                        <div class="mcpskilllab-roadmap-item">
                            <span class="mcpskilllab-chip status-review">下一阶段</span>
                            <div class="mcpskilllab-hub-desc">更细的权限评分、来源检查、按场景推荐、接入测试记录。</div>
                        </div>
                    </div>
                    <div class="mcpskilllab-inline-actions">
                        <button class="cyber-button" id="mcpskilllab-export" type="button"><span class="cyber-button__tag">导出JSON</span></button>
                        <button class="cyber-button" id="mcpskilllab-import" type="button"><span class="cyber-button__tag">导入JSON</span></button>
                        <input id="mcpskilllab-import-file" type="file" accept="application/json,.json" hidden>
                    </div>
                    <div class="mcpskilllab-hub-desc">本地收藏 ${favorites.size} 个，自定义资源 ${customResources.length} 个。</div>
                </div>

                <div class="card mcpskilllab-hub-card">
                    <div class="badge">补充资源</div>
                    <div class="mcpskilllab-detail-title">手动添加 Skill / MCP</div>
                    <form id="mcpskilllab-custom-form" class="mcpskilllab-field-grid">
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-resource-name">名称</label>
                            <input id="mcpskilllab-resource-name" name="resourceName" type="text" placeholder="例如：My Company MCP" required>
                        </div>
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-resource-type">类型</label>
                            <select id="mcpskilllab-resource-type" name="resourceType">${renderTypeOptions('MCP Directory')}</select>
                        </div>
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-resource-category">所属子模块</label>
                            <select id="mcpskilllab-resource-category" name="resourceCategory">${renderCategoryOptions(activeCategory)}</select>
                        </div>
                        <div class="mcpskilllab-field wide">
                            <label for="mcpskilllab-resource-url">官网或仓库链接</label>
                            <input id="mcpskilllab-resource-url" name="resourceUrl" type="url" placeholder="https://..." required>
                        </div>
                        <div class="mcpskilllab-field wide">
                            <label for="mcpskilllab-resource-docs">文档链接</label>
                            <input id="mcpskilllab-resource-docs" name="resourceDocs" type="url" placeholder="不填则使用官网链接">
                        </div>
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-resource-risk">初始风险</label>
                            <select id="mcpskilllab-resource-risk" name="resourceRisk">
                                <option value="Medium">中风险</option>
                                <option value="Low">低风险</option>
                            </select>
                        </div>
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-resource-auth">密钥需求</label>
                            <select id="mcpskilllab-resource-auth" name="resourceAuth">
                                <option value="depends">视资源而定</option>
                                <option value="true">需要密钥</option>
                                <option value="false">不强制</option>
                            </select>
                        </div>
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-resource-tags">标签</label>
                            <input id="mcpskilllab-resource-tags" name="resourceTags" type="text" placeholder="mcp, database, custom">
                        </div>
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-resource-platforms">适配平台</label>
                            <input id="mcpskilllab-resource-platforms" name="resourcePlatforms" type="text" placeholder="Codex, Claude, Cursor">
                        </div>
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-resource-permissions">权限</label>
                            <input id="mcpskilllab-resource-permissions" name="resourcePermissions" type="text" placeholder="network, apiKey, filesRead">
                        </div>
                        <div class="mcpskilllab-field">
                            <label for="mcpskilllab-resource-install">接入方式</label>
                            <input id="mcpskilllab-resource-install" name="resourceInstallModes" type="text" placeholder="directory, remote, local">
                        </div>
                        <div class="mcpskilllab-field wide">
                            <label for="mcpskilllab-resource-scenario">用途说明</label>
                            <textarea id="mcpskilllab-resource-scenario" name="resourceScenario" placeholder="这个资源适合什么场景？"></textarea>
                        </div>
                        <div class="mcpskilllab-field wide">
                            <label for="mcpskilllab-resource-template">配置片段或备注</label>
                            <textarea id="mcpskilllab-resource-template" name="resourceTemplate" placeholder='例如：{"mcpServers":{...}}'></textarea>
                        </div>
                        <label class="mcpskilllab-checkbox-row wide">
                            <input name="favorite" type="checkbox" checked>
                            添加后同时加入待接入清单
                        </label>
                        <div class="mcpskilllab-inline-actions wide">
                            <button class="cyber-button" type="submit"><span class="cyber-button__tag">加入目录</span></button>
                        </div>
                    </form>
                </div>

                <div class="card mcpskilllab-hub-card">
                    <div class="badge">本地补充</div>
                    <div class="mcpskilllab-detail-title">自定义资源</div>
                    <div class="mcpskilllab-custom-list">
                        ${renderCustomResources(customResources)}
                    </div>
                </div>
            </div>
        `;
    }

    function renderResourceCard(item, favorites) {
        const isFavorite = favorites.has(item.id);
        return `
            <div class="card mcpskilllab-card ${activeResourceId === item.id ? 'selected' : ''}" data-resource-id="${escapeHtml(item.id)}">
                <div class="badge">${escapeHtml(localize('type', item.type))}</div>
                <h3>${escapeHtml(item.name)}</h3>
                <div class="mcpskilllab-meta">
                    <span class="mcpskilllab-chip ${item.source === 'Official' ? 'official' : ''}">${escapeHtml(localize('source', item.source))}</span>
                    <span class="mcpskilllab-chip ${item.risk.toLowerCase()}">风险：${escapeHtml(localize('risk', item.risk))}</span>
                    <span class="mcpskilllab-chip">${escapeHtml(localize('recommend', item.recommend))}</span>
                </div>
                <div class="mcpskilllab-desc">${escapeHtml(localize('scenario', item.scenario))}</div>
                <div class="mcpskilllab-meta">
                    <span class="mcpskilllab-chip">平台：${escapeHtml(item.platforms.slice(0, 2).join(' / '))}${item.platforms.length > 2 ? '...' : ''}</span>
                    <span class="mcpskilllab-chip">权限：${escapeHtml(item.permissions.map(value => localize('permission', value)).slice(0, 2).join(' / '))}${item.permissions.length > 2 ? '...' : ''}</span>
                </div>
                <div class="mcpskilllab-tags">
                    ${item.tags.map(tag => `<span class="mcpskilllab-chip">#${escapeHtml(tag)}</span>`).join('')}
                </div>
                <div class="mcpskilllab-actions">
                    <button class="cyber-button mcpskilllab-select" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">详情</span></button>
                    <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(item.url)}"><span class="cyber-button__tag">官网</span></button>
                    <button class="cyber-button mcpskilllab-open" type="button" data-url="${escapeHtml(item.docs)}"><span class="cyber-button__tag">文档</span></button>
                    <button class="cyber-button mcpskilllab-copy" type="button" data-copy="${escapeHtml(item.template)}"><span class="cyber-button__tag">复制配置</span></button>
                    <button class="cyber-button mcpskilllab-favorite" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">${isFavorite ? '已收藏' : '收藏'}</span></button>
                    <button class="cyber-button mcpskilllab-wizard-open" type="button" data-id="${escapeHtml(item.id)}"><span class="cyber-button__tag">向导</span></button>
                </div>
            </div>
        `;
    }

    function renderTemplates() {
        return templates.map(item => `
            <div class="card mcpskilllab-template-card">
                <div class="badge">${escapeHtml(item.title)}</div>
                <div class="result">${escapeHtml(item.body)}</div>
                <div class="mcpskilllab-actions">
                    <button class="cyber-button mcpskilllab-copy" type="button" data-copy="${escapeHtml(item.body)}"><span class="cyber-button__tag">复制模板</span></button>
                </div>
            </div>
        `).join('');
    }

    function renderDialog(selectedResource, favorites, filtered) {
        if (!activeDialog) return '';

        const dialogMap = {
            add: {
                title: '添加技能',
                body: renderHubPanel(favorites)
            },
            templates: {
                title: '配置模板',
                body: `<div class="mcpskilllab-template-grid">${renderTemplates()}</div>`
            },
            wizard: {
                title: '安装向导 — ' + (getResourceById(wizardResourceId) ? getResourceById(wizardResourceId).name : ''),
                body: getResourceById(wizardResourceId) ? renderWizardBody(getResourceById(wizardResourceId)) : '<div class="mcpskilllab-desc">请先选择一个资源</div>'
            }
        };
        const dialog = dialogMap[activeDialog];
        if (!dialog) return '';

        return `
            <div class="mcpskilllab-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(dialog.title)}">
                <div class="mcpskilllab-modal-box">
                    <div class="mcpskilllab-modal-head">
                        <div>
                            <div class="badge">Skill / MCP 实验室</div>
                            <div class="mcpskilllab-modal-title">${escapeHtml(dialog.title)}</div>
                        </div>
                        <button class="cyber-button mcpskilllab-modal-close" type="button"><span class="cyber-button__tag">关闭</span></button>
                    </div>
                    <div class="mcpskilllab-modal-body">
                        ${dialog.body}
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
        const filteredIds = new Set(filtered.map(item => item.id));
        let selectedResource = getResourceById(activeResourceId);
        if (!selectedResource || !isResourceInCategory(selectedResource, activeCategory) || !filteredIds.has(selectedResource.id)) {
            selectedResource = filtered[0] || null;
        }
        activeResourceId = selectedResource ? selectedResource.id : '';
        const category = getCategoryMeta(activeCategory);
        root.innerHTML = `
            <div class="mcpskilllab-shell">
                ${renderTopActions()}
                ${renderIntro()}

                <div class="mcpskilllab-toolbar">
                    <input id="mcpskilllab-search" type="text" value="${escapeHtml(query)}" placeholder="搜索 Skill / MCP / Registry / 插件 / 用途...">
                    <select id="mcpskilllab-risk">
                        <option value="all"${activeRisk === 'all' ? ' selected' : ''}>全部风险</option>
                        <option value="low"${activeRisk === 'low' ? ' selected' : ''}>低风险</option>
                        <option value="medium"${activeRisk === 'medium' ? ' selected' : ''}>中风险</option>
                    </select>
                    <select id="mcpskilllab-platform">
                        ${renderOptions(getUniqueValues('platforms'), activePlatform, 'platform', '全部平台')}
                    </select>
                    <select id="mcpskilllab-permission">
                        ${renderOptions(getUniqueValues('permissions'), activePermission, 'permission', '全部权限')}
                    </select>
                    <select id="mcpskilllab-install-mode">
                        ${renderOptions(getUniqueValues('installModes'), activeInstallMode, 'installMode', '全部接入')}
                    </select>
                    <select id="mcpskilllab-sort">
                        ${renderSortOptions()}
                    </select>
                </div>

                <div class="mcpskilllab-filter-row">
                    ${renderCategoryTabs()}
                </div>

                ${renderCategoryContext(filtered)}

                <div class="mcpskilllab-section-title">${escapeHtml(category.label)} 资源目录</div>
                <div class="mcpskilllab-grid" id="mcpskilllab-list">
                    ${filtered.length
                        ? filtered.map(item => renderResourceCard(item, favorites)).join('')
                        : '<div class="card mcpskilllab-empty">这个子模块下没有匹配资源。可以换筛选条件，或在本地 Hub 里添加。</div>'}
                </div>

                ${renderDialog(selectedResource, favorites, filtered)}
            </div>
        `;
        bindEvents(root);
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand('copy');
        area.remove();
        return Promise.resolve();
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
                render();
                const nextSearch = document.getElementById('mcpskilllab-search');
                if (nextSearch) {
                    nextSearch.focus();
                    nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
                }
            });
        }

        const risk = root.querySelector('#mcpskilllab-risk');
        if (risk) {
            risk.addEventListener('change', event => {
                activeRisk = event.target.value;
                render();
            });
        }

        const platform = root.querySelector('#mcpskilllab-platform');
        if (platform) {
            platform.addEventListener('change', event => {
                activePlatform = event.target.value;
                render();
            });
        }

        const permission = root.querySelector('#mcpskilllab-permission');
        if (permission) {
            permission.addEventListener('change', event => {
                activePermission = event.target.value;
                render();
            });
        }

        const installMode = root.querySelector('#mcpskilllab-install-mode');
        if (installMode) {
            installMode.addEventListener('change', event => {
                activeInstallMode = event.target.value;
                render();
            });
        }

        const sort = root.querySelector('#mcpskilllab-sort');
        if (sort) {
            sort.addEventListener('change', event => {
                sortMode = event.target.value;
                render();
            });
        }

        root.querySelectorAll('.mcpskilllab-modal-open').forEach(button => {
            button.addEventListener('click', () => {
                activeDialog = button.getAttribute('data-dialog') || '';
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

        root.querySelectorAll('.mcpskilllab-filter').forEach(button => {
            button.addEventListener('click', () => {
                activeCategory = normalizeCategory(button.getAttribute('data-category')) || 'mcp';
                activePermission = 'all';
                activePlatform = 'all';
                activeInstallMode = 'all';
                activeResourceId = '';
                render();
            });
        });

        root.querySelectorAll('.mcpskilllab-select').forEach(button => {
            button.addEventListener('click', () => {
                activeResourceId = button.getAttribute('data-id') || activeResourceId;
                render();
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
                copyText(value).then(() => {
                    const tag = button.querySelector('.cyber-button__tag');
                    if (!tag) return;
                    const oldText = tag.textContent;
                    tag.textContent = '已复制';
                    setTimeout(() => { tag.textContent = oldText; }, 900);
                });
            });
        });

        root.querySelectorAll('.mcpskilllab-backlog-status').forEach(select => {
            select.addEventListener('change', () => {
                updateBacklogMeta(select.getAttribute('data-id'), { status: select.value });
                render();
            });
        });

        root.querySelectorAll('.mcpskilllab-backlog-note').forEach(area => {
            area.addEventListener('change', () => {
                updateBacklogMeta(area.getAttribute('data-id'), { note: area.value });
            });
        });

        const exportButton = root.querySelector('#mcpskilllab-export');
        if (exportButton) {
            exportButton.addEventListener('click', exportHubData);
        }

        const importButton = root.querySelector('#mcpskilllab-import');
        const importFile = root.querySelector('#mcpskilllab-import-file');
        if (importButton && importFile) {
            importButton.addEventListener('click', () => {
                importFile.click();
            });
            importFile.addEventListener('change', event => {
                const file = event.target.files && event.target.files[0];
                if (!file) return;
                if (file.size > MAX_IMPORT_BYTES) {
                    window.alert('导入失败：JSON 文件过大');
                    importFile.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        importHubData(String(reader.result || ''));
                        render();
                    } catch (error) {
                        window.alert(`导入失败：${error.message || 'JSON 无法解析'}`);
                    }
                    importFile.value = '';
                };
                reader.readAsText(file, 'utf-8');
            });
        }

        const customForm = root.querySelector('#mcpskilllab-custom-form');
        if (customForm) {
            customForm.addEventListener('submit', event => {
                event.preventDefault();
                const resource = createResourceFromForm(customForm);
                if (!resource) {
                    window.alert('请至少填写资源名称和官网/仓库链接。');
                    return;
                }
                saveCustomResources(mergeCustomResourceLists(getCustomResources(), [resource]));
                if (new FormData(customForm).has('favorite')) {
                    const favorites = getFavorites();
                    favorites.add(resource.id);
                    saveFavorites(favorites);
                }
                activeResourceId = resource.id;
                activeCategory = getResourceCategory(resource);
                query = '';
                render();
            });
        }

        root.querySelectorAll('.mcpskilllab-delete-custom').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                if (!id) return;
                if (window.confirm && !window.confirm('确定删除这个本地自定义资源吗？')) return;
                deleteCustomResource(id);
                if (activeResourceId === id) activeResourceId = 'official-mcp-registry';
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

        root.querySelectorAll('.mcpskilllab-wizard-open').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                if (id) {
                    wizardResourceId = id;
                    wizardPlatform = 'generic';
                    wizardMode = 'local';
                    activeDialog = 'wizard';
                    render();
                }
            });
        });

        root.querySelectorAll('[data-wizard-platform]').forEach(button => {
            button.addEventListener('click', () => {
                const platform = button.getAttribute('data-wizard-platform');
                if (platform) {
                    wizardPlatform = platform;
                    // Auto-switch ChatGPT to remote mode
                    if (platform === 'chatgpt') wizardMode = 'remote';
                    render();
                }
            });
        });

        root.querySelectorAll('[data-wizard-mode]').forEach(button => {
            if (button.disabled) return;
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-wizard-mode');
                if (mode) {
                    wizardMode = mode;
                    render();
                }
            });
        });
    }

    window.initMcpSkillLab = function () {
        injectStyles();
        render();
    };
})();
