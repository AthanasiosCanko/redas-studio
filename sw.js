/* ── R-EDA'S STUDIO — Service Worker ───────────────────── */
const CACHE = 'redas-v2';
const PRECACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/booking.css',
  '/booking.js',
  '/timepicker.js',
  '/assets/logo.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/manifest.json',
];

// ── Install: pre-cache static shell ──────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: smart caching strategy ────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; // never cache API

  // Navigation requests (page loads) — always network-first so iOS
  // PWA launches open the correct URL, not a cached one
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets — cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

// ── Push: show booking notification ──────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'New booking', body: 'A new booking was just made.' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:      data.body,
      icon:      '/assets/icon-192.png',
      badge:     '/assets/icon-192.png',
      tag:       'new-booking',
      renotify:  true,
      data:      { url: '/admin' },
    })
  );
});

// ── Notification click: open / focus admin ────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const adminTab = list.find(c => c.url.includes('/admin'));
      if (adminTab) return adminTab.focus();
      return clients.openWindow('/admin');
    })
  );
});
