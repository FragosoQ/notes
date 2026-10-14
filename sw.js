/* Ma · Notas — service worker
   · A app (index.html) abre sempre, mesmo sem internet.
   · Com internet, vai buscar a versão mais recente (rede primeiro, 3,5 s) e guarda-a.
   · Tipos de letra e módulos Firebase ficam guardados depois da 1.ª utilização.
   · Nunca interceta pedidos às IAs nem ao Firestore/Auth (esses são sempre em direto). */
const V = 'ma-v4';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const same = u.origin === location.origin;
  const ext = u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com' ||
              (u.host === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'));
  if (!same && !ext) return;

  const isPage = r.mode === 'navigate' || (same && /\.(html|webmanifest)$/.test(u.pathname));
  if (isPage) {
    const key = r.mode === 'navigate' ? 'index.html' : r;
    e.respondWith(
      Promise.race([fetch(r), new Promise((_, j) => setTimeout(j, 3500))])
        .then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(key, cp)); } return res; })
        .catch(() => caches.match(key, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then(m => {
      const net = fetch(r).then(res => {
        if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => m);
      return m || net;
    })
  );
});
