// service-worker.js — Pénsum UGB
// Objetivo: (1) permitir que el navegador ofrezca "Instalar app" / "Agregar
// a inicio", y (2) dejar cargar la app (el cascarón, no los datos) aunque
// no haya internet en ese momento. Los datos reales siguen viniendo
// siempre de Firebase — este service worker NUNCA cachea eso, así que
// nunca vas a ver datos viejos por culpa de la caché.

const CACHE_NAME = 'pensum-ugb-v4'; // v4: asistencia atrasada, actividad DI -> bitácora, filtro/fechas de ciclos, botón "En Proceso", mantener sesión iniciada (24h)
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
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
