/*
 * 泡面的Agent工具箱 PWA service worker
 *
 * 策略：
 * - 只接管同源 GET 静态资源；/api/ 等后端请求完全不碰（避免缓存登录、聊天、余额等动态数据）。
 * - 页面导航：网络优先，断网时回退到缓存的 index.html。
 * - 静态资源：stale-while-revalidate，先返回缓存并后台更新。
 * - 安装时从 index.html 里提取带版本号的 js/css 一并预缓存，保证离线时页面壳可用。
 *
 * 修改 sw.js 内容会让浏览器在下次访问时安装新版本并清掉旧缓存。
 */
const CACHE_PREFIX = 'pzm-tool-';
const CACHE_VERSION = 'v1';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const SW_PATH = new URL(self.location.href).pathname;

const scopeUrl = new URL(self.registration.scope);
const INDEX_URL = new URL('index.html', scopeUrl).href;
const ROOT_URL = scopeUrl.href;
const OFFLINE_URL = new URL('offline.html', scopeUrl).href;
const MANIFEST_URL = new URL('manifest.json', scopeUrl).href;

const CORE_ASSETS = [
  ROOT_URL,
  INDEX_URL,
  MANIFEST_URL,
  OFFLINE_URL,
  new URL('favicon.svg', scopeUrl).href,
  new URL('icons/icon-192.png', scopeUrl).href,
  new URL('icons/icon-512.png', scopeUrl).href,
  new URL('icons/icon-512-maskable.png', scopeUrl).href,
  new URL('icons/apple-touch-icon-180.png', scopeUrl).href,
  new URL('pwa.js', scopeUrl).href
];

const MAX_RUNTIME_ENTRIES = 240;
const TRIM_TO = 180;

function isApiRequest(url) {
  return /^\/api(\/|$)/.test(url.pathname)
    || /^\/actuator(\/|$)/.test(url.pathname)
    || /^\/v1(\/|$)/.test(url.pathname);
}

function isCacheableAsset(url) {
  if (url.origin !== scopeUrl.origin) return false;
  if (isApiRequest(url)) return false;
  if (url.pathname === SW_PATH) return false;
  return /\.(?:css|js|mjs|cjs|json|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|wasm)$/i.test(url.pathname);
}

function extractIndexAssets(html) {
  const urls = new Set();
  const pattern = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const raw = match[1];
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('#')) continue;
    let resolved;
    try {
      resolved = new URL(raw, scopeUrl);
    } catch (e) {
      continue;
    }
    if (resolved.origin !== scopeUrl.origin) continue;
    if (resolved.pathname === SW_PATH) continue;
    if (resolved.pathname === '/manifest.json') continue;
    if (isCacheableAsset(resolved)) urls.add(resolved.href);
  }
  return [...urls];
}

async function precache() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(CORE_ASSETS.map(async (url) => {
    try {
      const response = await fetch(url, { cache: 'reload', credentials: 'same-origin' });
      if (response && response.ok) await cache.put(url, response.clone());
    } catch (e) {
      // 单个资源失败不影响 SW 安装。
    }
  }));

  let html = '';
  try {
    const indexResponse = await fetch(INDEX_URL, { cache: 'reload', credentials: 'same-origin' });
    if (indexResponse && indexResponse.ok) {
      html = await indexResponse.clone().text();
      await cache.put(INDEX_URL, indexResponse.clone());
      if (indexResponse.url) await cache.put(ROOT_URL, indexResponse.clone());
    }
  } catch (e) {
    // 离线时安装失败会由浏览器重试；这里保持已缓存的核心资源可用。
  }

  await Promise.all(extractIndexAssets(html).map(async (url) => {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (response && response.ok) await cache.put(url, response.clone());
    } catch (e) {
      // 忽略单个资源。
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await precache();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_RUNTIME_ENTRIES) return;
  const removeCount = keys.length - TRIM_TO;
  await Promise.all(keys.slice(0, removeCount).map((key) => cache.delete(key)));
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: false });
  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        if (Math.random() < 0.1) trimCache(cache).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const response = await network;
  if (response) return response;
  return Response.error();
}

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const url = new URL(request.url);
      const isShell = url.pathname === scopeUrl.pathname
        || url.pathname === new URL('index.html', scopeUrl).pathname;
      if (isShell && !url.search) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(INDEX_URL, response.clone());
          await cache.put(ROOT_URL, response.clone());
        } catch (e) {
          // 缓存失败不影响网络响应。
        }
      }
      return response;
    }
  } catch (e) {
    // 断网：走下方的缓存回退。
  }

  const cache = await caches.open(CACHE_NAME);
  const cachedIndex = await cache.match(INDEX_URL) || await cache.match(ROOT_URL);
  if (cachedIndex) return cachedIndex;
  return await cache.match(OFFLINE_URL) || new Response(
    '<!doctype html><meta charset="utf-8"><title>离线</title><body style="background:#0a0a12;color:#e6f1ff;font:16px/1.6 system-ui;padding:24px">当前处于离线状态，请联网后重试。</body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (url.origin !== scopeUrl.origin) return;
  if (isApiRequest(url)) return;
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
