// Service worker minimal : coquille de l'app en cache, catalogue toujours frais (réseau d'abord).
const CACHE = 'quentflix-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./']))); });
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then((r) => {
    const copie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); return r;
  }).catch(() => caches.match(e.request)));
});
