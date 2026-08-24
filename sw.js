const CACHE_NAME = 'club-domino-v2'; // <--- ¡IMPORTANTE! Sube este número (v3, v4...) cada vez que modifiques tu código.

const urlsToCache = [
    './',
    './index.html',
    './apunte.html',
    './mesa.html',
    './perfil.html',
    './galardones.html',
    './admin.html',
    './historial.html',
    './logo.png',
    './manifest.json'
];

// 1. Instalación: Guarda los archivos esenciales en la nueva caché
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Abriendo caché y guardando archivos...');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Fuerza a que el navegador instale el Service Worker nuevo de inmediato
    );
});

// 2. Activación: Elimina los cachés antiguos de versiones pasadas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Borrando caché antigua obsoleta:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Toma el control de la app abierta de inmediato
    );
});

// 3. Interceptar peticiones: Intenta buscar en red primero, si falla o no hay internet, usa la caché
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Si la red responde bien, clonamos la respuesta y la actualizamos en caché opcionalmente
                return response;
            })
            .catch(() => {
                // Si no hay internet, recurrimos a lo que tengamos guardado en caché
                return caches.match(event.request);
            })
    );
});