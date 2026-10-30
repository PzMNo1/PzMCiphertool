import { TEMPLATES, TEMPLATE_MAP, defaultParams, buildPart } from './industrial-parts.js?v=20261030-28';

const OC_VERSION = '1.1.0';
const OC_WASM_BYTES = 22980267;
const OC_BASES = [
  `https://cdn.jsdelivr.net/npm/replicad-opencascadejs@${OC_VERSION}/dist/`,
  `https://unpkg.com/replicad-opencascadejs@${OC_VERSION}/dist/`
];

const MATERIALS = {
  steel: { name: '碳钢', density: 7.85 },
  stainless: { name: '不锈钢', density: 7.93 },
  aluminium: { name: '铝合金', density: 2.7 },
  brass: { name: '黄铜', density: 8.5 },
  titanium: { name: '钛合金', density: 4.51 },
  abs: { name: 'ABS', density: 1.05 }
};

const state = {
  templateId: 'flange',
  params: Object.fromEntries(TEMPLATES.map(template => [template.id, defaultParams(template.id)])),
  material: 'steel',
  imported: null,
  engineReady: false,
  viewer: null,
  shape: null,
  meta: null,
  mesh: null,
  steps: [],
  lastBuild: null,
  lastMs: 0,
  needsFit: true
};

const dom = {};
let rebuildTimer = 0;
const dirtyKeys = new Set();

const $ = id => document.getElementById(id);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value, digits = 1) => Number(value).toLocaleString('zh-CN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: digits
});

function cacheDom() {
  dom.shell = $('ind-shell');
  dom.viewport = $('viewport');
  dom.stage = $('stage');
  dom.engineChip = $('engine-chip');
  dom.engineText = $('engine-text');
  dom.partChip = $('part-chip');
  dom.templateGrid = $('template-grid');
  dom.paramTitle = $('param-title');
  dom.paramGroups = $('param-groups');
  dom.featureTree = $('feature-tree');
  dom.treeCount = $('tree-count');
  dom.paramNotes = $('param-notes');
  dom.stageName = $('stage-name');
  dom.stageEn = $('stage-en');
  dom.loading = $('engine-loading');
  dom.loaderText = $('loader-text');
  dom.loaderFill = $('loader-fill');
  dom.loaderRetry = $('loader-retry');
  dom.toasts = $('toasts');
  dom.stats = $('stats');
  dom.statVolume = $('stat-volume');
  dom.statMass = $('stat-mass');
  dom.statMassUnit = $('stat-mass-unit');
  dom.statBbox = $('stat-bbox');
  dom.statMesh = $('stat-mesh');
  dom.statFeatures = $('stat-features');
  dom.statsAlert = $('stats-alert');
  dom.statTime = $('stat-time');
  dom.materialSelect = $('material-select');
  dom.importClear = $('import-clear');
  dom.stepFile = $('step-file');
  dom.exportStep = $('export-step-btn');
  dom.exportStl = $('export-stl-btn');
  dom.importStep = $('import-step-btn');
  dom.sidePanel = $('side-panel');
  dom.sideBackdrop = $('side-backdrop');
  dom.sideOpen = $('side-open');
  dom.sideClose = $('side-close');
}

function setEngineChip(status, text) {
  dom.engineChip.dataset.state = status;
  dom.engineText.textContent = text;
  dom.shell.dataset.engine = status;
}

function toast(message, type = 'info', duration = 3200) {
  const node = document.createElement('div');
  node.className = 'ind-toast';
  if (type === 'error') node.classList.add('is-error');
  if (type === 'success') node.classList.add('is-success');
  node.textContent = message;
  dom.toasts.appendChild(node);
  while (dom.toasts.children.length > 4) dom.toasts.firstElementChild.remove();
  window.setTimeout(() => {
    node.classList.add('is-leaving');
    window.setTimeout(() => node.remove(), 280);
  }, duration);
}

function currentTemplate() {
  return TEMPLATE_MAP[state.templateId];
}

function renderTemplates() {
  dom.templateGrid.innerHTML = TEMPLATES.map(template => `
    <button type="button" class="ind-template" data-template="${template.id}" role="tab"
      title="${escapeHtml(template.tagline)}" aria-selected="${template.id === state.templateId}">
      <span aria-hidden="true">${template.icon}</span>
      <strong>${escapeHtml(template.name)}</strong>
      <small>${escapeHtml(template.en)}</small>
    </button>
  `).join('');
  refreshTemplateSelection();
}

function refreshTemplateSelection() {
  dom.templateGrid.querySelectorAll('[data-template]').forEach(button => {
    const active = button.dataset.template === state.templateId;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function fieldMap() {
  const map = new Map();
  for (const group of currentTemplate().groups) {
    for (const field of group.fields) map.set(field.key, field);
  }
  return map;
}

function renderParams() {
  const template = currentTemplate();
  const params = state.params[template.id];
  dirtyKeys.clear();
  dom.paramTitle.textContent = `${template.name}参数`;
  dom.paramGroups.innerHTML = template.groups.map(group => `
    <div class="ind-group">
      <h4>${escapeHtml(group.title)}</h4>
      ${group.fields.map(field => renderField(field, params[field.key])).join('')}
    </div>
  `).join('');
}

function renderField(field, value) {
  if (field.type === 'toggle') {
    return `
      <label class="ind-toggle">
        <span>${escapeHtml(field.label)}</span>
        <span class="ind-switch">
          <input type="checkbox" data-key="${field.key}" ${value ? 'checked' : ''} />
          <i aria-hidden="true"></i>
        </span>
      </label>`;
  }
  if (field.type === 'select') {
    return `
      <label class="ind-field">
        <span>${escapeHtml(field.label)}</span>
        <span class="ind-input-wrap">
          <select data-key="${field.key}">
            ${field.options.map(option => `<option value="${option}" ${Number(value) === option ? 'selected' : ''}>${option}</option>`).join('')}
          </select>
        </span>
      </label>`;
  }
  return `
    <label class="ind-field">
      <span>${escapeHtml(field.label)}</span>
      <span class="ind-input-wrap">
        <input type="number" data-key="${field.key}" value="${value}" min="${field.min}" max="${field.max}"
          step="${field.step}" inputmode="decimal" />
        <em>${field.unit}</em>
      </span>
    </label>`;
}

function updateHeadings() {
  const template = currentTemplate();
  if (state.imported) {
    dom.stageName.textContent = '导入零件';
    dom.stageEn.textContent = 'STEP MODEL';
    dom.partChip.textContent = `STEP · ${state.imported.name}`;
    return;
  }
  dom.stageName.textContent = template.name;
  dom.stageEn.textContent = template.en;
  dom.partChip.textContent = `${template.name} · ${template.en}`;
}

function switchTemplate(templateId, { fit = true } = {}) {
  if (!TEMPLATE_MAP[templateId] || templateId === state.templateId) return;
  exitImport({ silent: true });
  state.templateId = templateId;
  state.needsFit = fit;
  refreshTemplateSelection();
  renderParams();
  updateHeadings();
  closeSideOnNarrow();
  rebuild({ fit });
}

function resetParams() {
  exitImport({ silent: true });
  state.params[state.templateId] = defaultParams(state.templateId);
  renderParams();
  rebuild({ fit: true });
  toast('已恢复当前零件的默认参数');
}

function updateParamFromElement(element, { commit }) {
  const key = element.dataset.key;
  const field = fieldMap().get(key);
  if (!field) return false;
  const template = currentTemplate();
  const params = state.params[template.id];
  if (field.type === 'toggle') {
    params[key] = element.checked;
    return true;
  }
  if (field.type === 'select') {
    params[key] = Number(element.value);
    return true;
  }
  const raw = Number(element.value);
  if (!Number.isFinite(raw)) {
    if (commit) element.value = params[key];
    return false;
  }
  const next = commit ? Math.min(field.max, Math.max(field.min, raw)) : raw;
  params[key] = next;
  if (commit && String(next) !== element.value) element.value = next;
  return true;
}

function scheduleRebuild(delay = 220) {
  window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(() => rebuild(), delay);
}

function setBusy() {
  dom.stats.dataset.state = 'busy';
  dom.statTime.textContent = '计算中…';
}

function idleStats() {
  dom.stats.dataset.state = 'idle';
}

function describeShape(shape) {
  const R = window.replicad;
  let volume = null;
  try {
    volume = R.measureVolume(shape);
  } catch (error) {
    volume = null;
  }
  const raw = shape.boundingBox.bounds;
  const bounds = raw.map(point => point.map(value => Math.abs(value) < 1e-6 ? 0 : value));
  const size = [
    bounds[1][0] - bounds[0][0],
    bounds[1][1] - bounds[0][1],
    bounds[1][2] - bounds[0][2]
  ];
  return { volume, bounds, size, maxDim: Math.max(size[0], size[1], size[2], 1) };
}

function renderTree(steps, notes) {
  dom.featureTree.innerHTML = steps.map(step => `
    <li data-state="${step.state}">
      <strong>${escapeHtml(step.label)}</strong>
      ${step.detail ? `<span>${escapeHtml(step.detail)}</span>` : ''}
    </li>
  `).join('');
  const ok = steps.filter(step => step.state === 'ok').length;
  dom.treeCount.textContent = `${ok}/${steps.length} 成功`;
  dom.paramNotes.innerHTML = notes.map(note => `<p>${escapeHtml(note)}</p>`).join('');
  dom.paramNotes.hidden = notes.length === 0;

  const alerts = [
    ...notes,
    ...steps.filter(step => step.state === 'warn').map(step => `${step.label}：${step.detail || '未完成'}`)
  ];
  dom.statsAlert.hidden = alerts.length === 0;
  dom.statsAlert.textContent = alerts.length
    ? `⚠ ${alerts[0]}${alerts.length > 1 ? `（另 ${alerts.length - 1} 项）` : ''}`
    : '';
  dom.statsAlert.title = alerts.join('\n');
}

function applyUsedParams(templateId, used) {
  if (!used || templateId !== state.templateId) return;
  const params = state.params[templateId];
  for (const [key, value] of Object.entries(used)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    if (dirtyKeys.has(key)) continue;
    params[key] = value;
    const input = dom.paramGroups.querySelector(`[data-key="${key}"]`);
    if (input && input.type === 'number') input.value = value;
  }
}

function updateStats(meta, mesh, milliseconds) {
  const material = MATERIALS[state.material] || MATERIALS.steel;
  if (meta.volume == null) {
    dom.statVolume.textContent = '—';
    dom.statMass.textContent = '—';
    dom.statMassUnit.textContent = '—';
  } else {
    const volumeCm3 = meta.volume / 1000;
    const grams = volumeCm3 * material.density;
    dom.statVolume.textContent = formatNumber(volumeCm3, 1);
    if (grams >= 1000) {
      dom.statMass.textContent = formatNumber(grams / 1000, 2);
      dom.statMassUnit.textContent = 'kg';
    } else {
      dom.statMass.textContent = formatNumber(grams, 1);
      dom.statMassUnit.textContent = 'g';
    }
  }
  dom.statBbox.textContent = meta.size.map(value => round(value, 1)).join(' × ');
  dom.statMesh.textContent = formatNumber(Math.floor((mesh?.triangles?.length || 0) / 3), 0);
  const ok = state.steps.filter(step => step.state === 'ok').length;
  dom.statFeatures.textContent = `${ok}/${state.steps.length}`;
  dom.statTime.textContent = `${milliseconds} ms`;
  dom.statTime.title = `建模 ${milliseconds} ms`;
  idleStats();
}

async function rebuild({ fit = false } = {}) {
  if (!state.engineReady) return;
  window.clearTimeout(rebuildTimer);
  const template = currentTemplate();
  const started = performance.now();
  setBusy();
  await new Promise(resolve => requestAnimationFrame(() => resolve()));

  try {
    let shape;
    let steps;
    let notes;
    let used = null;
    if (state.imported) {
      shape = state.imported.shape;
      steps = [{ label: 'STEP 导入', detail: state.imported.name, state: 'ok' }];
      notes = [];
    } else {
      const result = buildPart(template.id, state.params[template.id]);
      shape = result.shape;
      steps = result.steps;
      notes = result.notes;
      used = result.used;
    }

    const meta = describeShape(shape);
    const tolerance = Math.max(0.04, Math.min(0.5, meta.maxDim / 800));
    const mesh = shape.mesh({ tolerance, angularTolerance: 0.3 });
    const edges = shape.meshEdges({ tolerance: tolerance * 1.4, angularTolerance: 0.4 });
    applyUsedParams(template.id, used);

    const previous = state.shape;
    state.shape = shape;
    state.meta = meta;
    state.mesh = mesh;
    state.lastMs = Math.round(performance.now() - started);
    state.steps = steps;
    state.lastBuild = {
      template: template.id,
      imported: Boolean(state.imported),
      volume: meta.volume,
      triangles: Math.floor(mesh.triangles.length / 3),
      ms: Math.round(performance.now() - started)
    };
    state.viewer?.setPart(mesh, edges, meta.bounds, { fit: fit || state.needsFit });
    state.needsFit = false;
    if (previous && previous !== shape) {
      try { previous.delete(); } catch (error) { /* 旧实体已释放 */ }
    }
    renderTree(steps, notes);
    updateStats(meta, mesh, Math.round(performance.now() - started));
    dom.exportStep.disabled = false;
    dom.exportStl.disabled = false;
    if (state.imported) dom.importClear.hidden = false;
  } catch (error) {
    dom.stats.dataset.state = 'error';
    dom.statTime.textContent = '失败';
    dom.featureTree.innerHTML = `<li data-state="warn"><strong>建模失败</strong><span>${escapeHtml(error.message)}</span></li>`;
    dom.treeCount.textContent = '0/1 成功';
    dom.paramNotes.hidden = true;
    toast(`几何生成失败：${error.message}`, 'error', 6000);
  }
}

async function loadEngine() {
  setEngineChip('loading', '内核装载中');
  dom.loading.hidden = false;
  dom.loading.classList.remove('is-error');
  dom.loaderRetry.hidden = true;
  dom.loaderFill.style.width = '0%';
  dom.loaderText.textContent = 'OpenCascade OCCT · WebAssembly';
  dom.importStep.disabled = true;
  dom.exportStep.disabled = true;
  dom.exportStl.disabled = true;

  try {
    if (!window.replicad) throw new Error('replicad 运行时未加载');
    const oc = await initOc();
    window.replicad.setOC(oc);
    warmUp();
    state.engineReady = true;
    setEngineChip('ready', '内核就绪');
    dom.loaderFill.style.width = '100%';
    dom.loaderText.textContent = '内核就绪，正在生成首个零件…';
    dom.importStep.disabled = false;
    await rebuild({ fit: true });
    dom.loading.hidden = true;
  } catch (error) {
    state.engineReady = false;
    setEngineChip('error', '装载失败');
    dom.loading.hidden = false;
    dom.loading.classList.add('is-error');
    dom.loaderText.textContent = `装载失败：${error.message || '网络异常'}`;
    dom.loaderRetry.hidden = false;
    dom.importStep.disabled = true;
  }
}

async function initOc() {
  let lastError = null;
  for (const base of OC_BASES) {
    try {
      const host = new URL(base).host;
      dom.loaderText.textContent = `OpenCascade OCCT · ${host}`;
      const wasmBinary = await fetchWithProgress(`${base}replicad_single.wasm`);
      dom.loaderText.textContent = '正在编译几何内核…';
      const module = await import(`${base}replicad_single.js`);
      const oc = await module.default({ wasmBinary });
      if (!oc || typeof oc !== 'object') throw new Error('内核实例无效');
      return oc;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('内核下载失败');
}

async function fetchWithProgress(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`内核下载 HTTP ${response.status}`);
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body || !response.body.getReader) {
    const buffer = await response.arrayBuffer();
    updateProgress(buffer.byteLength, total);
    return new Uint8Array(buffer);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    updateProgress(loaded, total);
  }
  const result = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function updateProgress(loaded, total) {
  const expected = Math.max(total || 0, OC_WASM_BYTES);
  const mb = (loaded / 1e6).toFixed(1);
  const totalMb = (expected / 1e6).toFixed(1);
  dom.loaderText.textContent = `OpenCascade OCCT · ${mb} / ${totalMb} MB`;
  dom.loaderFill.style.width = `${Math.min(100, (loaded / expected) * 100)}%`;
}

function warmUp() {
  try {
    const box = window.replicad.makeBox([0, 0, 0], [1, 1, 1]);
    box.mesh({ tolerance: 0.5, angularTolerance: 0.5 });
    box.delete();
  } catch (error) {
    /* 预热失败不影响后续建模 */
  }
}

function exportBaseName() {
  if (state.imported) {
    return (state.imported.name || 'imported-part').replace(/\.(step|stp)$/i, '').replace(/[^\w.-]+/g, '-') || 'imported-part';
  }
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('');
  return `industrial-${state.templateId}-${stamp}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportStep() {
  if (!state.engineReady || !state.shape) return;
  try {
    const name = state.imported ? 'IMPORTED' : currentTemplate().en;
    const blob = window.replicad.exportSTEP([{ shape: state.shape, name }], { unit: 'mm' });
    downloadBlob(blob, `${exportBaseName()}.step`);
    toast('STEP 已导出（AP242 · 单位 mm）', 'success');
  } catch (error) {
    toast(`STEP 导出失败：${error.message}`, 'error', 6000);
  }
}

function exportStl() {
  if (!state.engineReady || !state.shape || !state.meta) return;
  try {
    const tolerance = Math.max(0.02, Math.min(0.4, state.meta.maxDim / 1500));
    const mesh = state.shape.mesh({ tolerance, angularTolerance: 0.2 });
    const blob = meshToBinaryStl(mesh);
    downloadBlob(blob, `${exportBaseName()}.stl`);
    toast('STL 已导出（二进制 · 单位 mm）', 'success');
  } catch (error) {
    toast(`STL 导出失败：${error.message}`, 'error', 6000);
  }
}

function meshToBinaryStl(mesh) {
  const positions = mesh.vertices;
  const indices = mesh.triangles;
  const triangleCount = Math.floor(indices.length / 3);
  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  const view = new DataView(buffer);
  const header = 'Industrial CAD Workbench / OpenCascade tessellation';
  for (let index = 0; index < Math.min(header.length, 79); index += 1) {
    view.setUint8(index, header.charCodeAt(index));
  }
  view.setUint32(80, triangleCount, true);
  let offset = 84;
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] * 3;
    const b = indices[index + 1] * 3;
    const c = indices[index + 2] * 3;
    const ax = positions[a];
    const ay = positions[a + 1];
    const az = positions[a + 2];
    const abx = positions[b] - ax;
    const aby = positions[b + 1] - ay;
    const abz = positions[b + 2] - az;
    const acx = positions[c] - ax;
    const acy = positions[c + 1] - ay;
    const acz = positions[c + 2] - az;
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 0) {
      nx /= length;
      ny /= length;
      nz /= length;
    } else {
      nx = 0; ny = 0; nz = 1;
    }
    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);
    view.setFloat32(offset + 12, ax, true);
    view.setFloat32(offset + 16, ay, true);
    view.setFloat32(offset + 20, az, true);
    view.setFloat32(offset + 24, positions[b], true);
    view.setFloat32(offset + 28, positions[b + 1], true);
    view.setFloat32(offset + 32, positions[b + 2], true);
    view.setFloat32(offset + 36, positions[c], true);
    view.setFloat32(offset + 40, positions[c + 1], true);
    view.setFloat32(offset + 44, positions[c + 2], true);
    view.setUint16(offset + 48, 0, true);
    offset += 50;
  }
  return new Blob([buffer], { type: 'model/stl' });
}

async function importStepFile(file) {
  if (!state.engineReady || !file) return;
  setBusy();
  try {
    const shape = await window.replicad.importSTEP(file);
    state.imported = { shape, name: file.name };
    state.needsFit = true;
    updateHeadings();
    dom.importClear.hidden = false;
    await rebuild({ fit: true });
    toast(`已导入 ${file.name}`, 'success');
  } catch (error) {
    dom.stats.dataset.state = 'error';
    dom.statTime.textContent = '失败';
    toast(`STEP 导入失败：${error.message}`, 'error', 7000);
  }
}

function exitImport({ silent = false } = {}) {
  if (!state.imported) return false;
  state.imported = null;
  dom.importClear.hidden = true;
  updateHeadings();
  if (!silent) toast('已退出 STEP 导入，按参数重新生成');
  return true;
}

function closeSideOnNarrow() {
  if (window.innerWidth <= 820) {
    dom.shell.classList.remove('side-open');
    dom.sideBackdrop.hidden = true;
  }
}

function openSide() {
  dom.shell.classList.add('side-open');
  dom.sideBackdrop.hidden = false;
}

function closeSide() {
  dom.shell.classList.remove('side-open');
  dom.sideBackdrop.hidden = true;
}

function bindEvents() {
  dom.templateGrid.addEventListener('click', event => {
    const button = event.target.closest('[data-template]');
    if (!button) return;
    switchTemplate(button.dataset.template);
  });

  dom.paramGroups.addEventListener('input', event => {
    const element = event.target.closest('[data-key]');
    if (!element) return;
    dirtyKeys.add(element.dataset.key);
    exitImport();
    if (!updateParamFromElement(element, { commit: false })) return;
    scheduleRebuild();
  });

  dom.paramGroups.addEventListener('change', event => {
    const element = event.target.closest('[data-key]');
    if (!element) return;
    dirtyKeys.delete(element.dataset.key);
    exitImport();
    if (!updateParamFromElement(element, { commit: true })) return;
    scheduleRebuild(0);
  });

  dom.paramGroups.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.matches('input[type="number"]')) {
      event.target.blur();
    }
  });

  $('reset-params').addEventListener('click', resetParams);
  dom.materialSelect.addEventListener('change', () => {
    state.material = dom.materialSelect.value;
    if (state.meta && state.mesh) updateStats(state.meta, state.mesh, state.lastMs);
  });

  dom.exportStep.addEventListener('click', exportStep);
  dom.exportStl.addEventListener('click', exportStl);
  dom.importStep.addEventListener('click', () => dom.stepFile.click());
  dom.stepFile.addEventListener('change', async () => {
    const file = dom.stepFile.files?.[0];
    dom.stepFile.value = '';
    if (file) await importStepFile(file);
  });
  dom.importClear.addEventListener('click', () => {
    exitImport({ silent: true });
    rebuild({ fit: true });
  });

  dom.loaderRetry.addEventListener('click', loadEngine);

  dom.stage.addEventListener('dblclick', () => state.viewer?.fitView());

  dom.stage.querySelectorAll('[data-tool]').forEach(button => {
    button.addEventListener('click', () => {
      const tool = button.dataset.tool;
      if (tool === 'fit') {
        state.viewer?.fitView();
        return;
      }
      if (tool === 'spin') {
        const active = !button.classList.contains('is-on');
        button.classList.toggle('is-on', active);
        state.viewer?.setAutoRotate(active);
        return;
      }
      const active = !button.classList.contains('is-on');
      button.classList.toggle('is-on', active);
      state.viewer?.setOption(tool, active);
    });
  });

  dom.sideOpen.addEventListener('click', openSide);
  dom.sideClose.addEventListener('click', closeSide);
  dom.sideBackdrop.addEventListener('click', closeSide);
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeSide();
  });
}

async function ensureViewer() {
  try {
    const { createIndustrialViewer } = await import('./industrial-viewer.js?v=20261030-28');
    state.viewer = createIndustrialViewer(dom.viewport);
  } catch (error) {
    dom.loading.classList.add('is-error');
    dom.loaderText.textContent = '三维视口初始化失败，请检查网络或 WebGL 支持';
    toast(`三维视口初始化失败：${error.message}`, 'error', 8000);
  }
}

async function boot() {
  cacheDom();
  renderTemplates();
  renderParams();
  updateHeadings();
  dom.materialSelect.value = state.material;
  bindEvents();
  await ensureViewer();
  await loadEngine();
}

window.__IND__ = {
  state,
  get status() {
    if (!state.engineReady) return 'loading';
    return state.shape ? 'ready' : 'engine-ready';
  },
  get lastBuild() {
    return state.lastBuild;
  },
  rebuild,
  switchTemplate,
  exportStep,
  exportStl
};

boot().catch(error => {
  dom.loading?.classList.add('is-error');
  if (dom.loaderText) dom.loaderText.textContent = `初始化失败：${error.message}`;
  toast(`初始化失败：${error.message}`, 'error', 8000);
});
