const CACHE_NAME = 'domino-romo-cache-v1';
const urlsToCache = [
    './index.html',
    './logo.png'
  // Puedes agregar aquí otras páginas HTML si las tienes separadas, ej: './admin.html'
];

// Instalación del Service Worker y guardado en caché
self.addEventListener('install', event => {
    event.waitUntil(
    caches.open(CACHE_NAME)
        .then(cache => {
        console.log('Archivos en caché guardados correctamente');
        return cache.addAll(urlsToCache);
        })
    );
});

// Interceptar las peticiones para servir el contenido sin internet
self.addEventListener('fetch', event => {
    event.respondWith(
    caches.match(event.request)
        .then(response => {
        // Si está en caché, lo devuelve; si no, intenta buscarlo en internet
        return response || fetch(event.request);
        })
    );
});