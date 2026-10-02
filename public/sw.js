// Tempra service worker: the app opens without connection (gym basements) and shows reminder notifications.
// Pages: network first, cached copy when offline. Built assets (/_next/static, hashed): cache first. API calls: never cached.
const CACHE = 'tempra-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/favicon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return res; }).catch(() => caches.match('/').then(hit => hit || Response.error())));
  }
});

self.addEventListener('push', e => {
  const d = (() => { try { return e.data.json(); } catch { return { title: 'Tempra', body: e.data ? e.data.text() : '' }; } })();
  e.waitUntil(self.registration.showNotification(d.title || 'Tempra', { body: d.body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url || '/' }, tag: d.tag || 'tempra' }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data && e.notification.data.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => new URL(c.url).origin === location.origin);
    return open ? open.focus().then(c => c.navigate ? c.navigate(target) : c) : self.clients.openWindow(target);
  }));
});
