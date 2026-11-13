// service-worker.js — Pénsum UGB
// Objetivo: (1) permitir que el navegador ofrezca "Instalar app" / "Agregar
// a inicio", y (2) dejar cargar la app (el cascarón, no los datos) aunque
// no haya internet en ese momento. Los datos reales siguen viniendo
// siempre de Firebase — este service worker NUNCA cachea eso, así que
// nunca vas a ver datos viejos por culpa de la caché.

const CACHE_NAME = 'pensum-ugb-v9'; // v9: notificaciones push (FCM) — eventos push/notificationclick. v6: Firebase en segundo plano, cerrar sesión real, duración de sesión, parser de notas por nombre. v5: se agregó calculos.js (funciones de cálculo puro separadas de app.js para poder probarlas con Node) + todas las mejoras de las Fases 0-7
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './calculos.js',
  './app.js',
  './extension-ugb.js',
  './firebase-bootstrap.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch((err) => console.warn('[SW] No se pudo precachear todo el cascarón:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Nunca tocar Firebase/Firestore/Google — eso siempre tiene que ir a la
  // red directa, nunca a la caché, para no mostrar datos desactualizados.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cascarón actualizado: lo guardamos para la próxima vez sin internet.
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});

// ═══════════════════════════════════════════════════════════
// NOTIFICACIONES PUSH (Firebase Cloud Messaging)
// El servidor (GitHub Actions, scripts/enviar-avisos.mjs) manda mensajes
// "solo datos": { title, body, tag, url }. Aquí los convertimos en una
// notificación del sistema aunque la app esté cerrada.
// ═══════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (e) { payload = { data: { body: event.data ? event.data.text() : '' } }; }
  // FCM entrega { data: {...}, from, fcmMessageId }; por si acaso se acepta también { notification: {...} }.
  const d = Object.assign({}, payload.notification || {}, payload.data || {});
  const title = d.title || 'Pénsum UGB';
  const options = {
    body: d.body || '',
    icon: './icon-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || './index.html' }
  };

  event.waitUntil((async () => {
    // Si la app está abierta y visible ya salen los avisos dentro de la app;
    // no duplicamos con una notificación del sistema.
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (ventanas.some((w) => w.visibilityState === 'visible')) return;
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || './index.html', self.registration.scope).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of ventanas) {
      if ('focus' in w) {
        await w.focus();
        w.postMessage({ tipo: 'ugb-notif-click', url: destino });
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});
